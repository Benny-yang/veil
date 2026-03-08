package zone

import (
	"errors"
	"time"

	"github.com/benny-yang/veil-api/internal/middleware"
	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/pkg/database"
	"github.com/benny-yang/veil-api/pkg/notifier"
	"github.com/benny-yang/veil-api/pkg/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func strPtr(s string) *string { return &s }

type Handler struct {
	monthlyLimit *MonthlyLimitConfig
}

func NewHandler(createLimit, applyLimit int) *Handler {
	return &Handler{
		monthlyLimit: &MonthlyLimitConfig{
			CreateLimit: createLimit,
			ApplyLimit:  applyLimit,
		},
	}
}

// GET /zones
func (h *Handler) ListZones(c *gin.Context) {
	var zones []model.Zone
	q := database.DB.Preload("Photos").Preload("Tags").Where("status = ?", model.ZoneStatusActive)
	if tag := c.Query("tag"); tag != "" {
		q = q.Joins("JOIN zone_tags zt ON zt.zone_id = zones.id JOIN tags t ON t.id = zt.tag_id AND t.name = ?", tag)
	}
	if category := c.Query("category"); category != "" {
		q = q.Where("category = ?", category)
	}
	q.Order("created_at DESC").Find(&zones)

	// 批次撈 seller profile（避免 N+1）
	sellerIDs := make([]string, len(zones))
	for i, z := range zones {
		sellerIDs[i] = z.SellerID
	}
	profileMap := batchLoadProfiles(sellerIDs)
	for i := range zones {
		if p, ok := profileMap[zones[i].SellerID]; ok {
			zones[i].Seller = p
		}
	}
	response.OK(c, zones)
}

// GET /zones/:zoneId
func (h *Handler) GetZone(c *gin.Context) {
	zoneID := c.Param("zoneId")
	var zone model.Zone
	if err := database.DB.Preload("Photos").Preload("Tags").First(&zone, "id = ?", zoneID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.NotFound(c, "Zone 不存在")
			return
		}
		response.InternalError(c)
		return
	}
	var profile model.UserProfile
	database.DB.Where("user_id = ?", zone.SellerID).First(&profile)
	zone.Seller = &profile
	response.OK(c, zone)
}

// GET /users/me/zones
func (h *Handler) GetMyZones(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	var zones []model.Zone
	database.DB.Preload("Photos").Preload("Tags").Where("seller_id = ?", userID).Order("created_at DESC").Find(&zones)
	response.OK(c, zones)
}

type CreateZoneRequest struct {
	Title          string             `json:"title" binding:"required,min=1,max=100"`
	Description    string             `json:"description"`
	Category       model.ZoneCategory `json:"category"`
	TotalSlots     int                `json:"total_slots" binding:"required,min=1"`
	MinCreditScore int                `json:"min_credit_score"`
	EndsAt         *string            `json:"ends_at"` // ISO 8601
	Photos         []ZonePhotoInput   `json:"photos"`
}

type ZonePhotoInput struct {
	URL       string `json:"url" binding:"required,url"`
	SortOrder int    `json:"sort_order"`
	IsCover   bool   `json:"is_cover"`
}

// POST /zones
func (h *Handler) CreateZone(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	var req CreateZoneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	// 月度建立限制檢查
	if h.monthlyLimit.CheckCreateLimit(userID) {
		response.TooManyRequests(c, "MONTHLY_LIMIT_EXCEEDED", "本月建立私藏次數已達上限，請完成真人驗證以解除限制")
		return
	}

	category := req.Category
	if category == "" {
		category = model.ZoneCategoryOther
	}
	zone := model.Zone{
		SellerID:       userID,
		Title:          req.Title,
		Description:    req.Description,
		Category:       category,
		TotalSlots:     req.TotalSlots,
		MinCreditScore: req.MinCreditScore,
	}

	if req.EndsAt != nil && *req.EndsAt != "" {
		parsed, err := time.Parse(time.RFC3339, *req.EndsAt)
		if err != nil {
			response.BadRequest(c, "INVALID_DATE", "ends_at 格式錯誤，請使用 ISO 8601")
			return
		}
		zone.EndsAt = &parsed
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&zone).Error; err != nil {
			return err
		}
		for _, p := range req.Photos {
			photo := model.ZonePhoto{ZoneID: zone.ID, URL: p.URL, SortOrder: p.SortOrder, IsCover: p.IsCover}
			if err := tx.Create(&photo).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		response.InternalError(c)
		return
	}

	database.DB.Preload("Photos").First(&zone, "id = ?", zone.ID)
	response.Created(c, zone)
}

type UpdateZoneRequest struct {
	Title          *string             `json:"title"`
	Description    *string             `json:"description"`
	Category       *model.ZoneCategory `json:"category"`
	MinCreditScore *int                `json:"min_credit_score"`
	EndsAt         *string             `json:"ends_at"`
}

// PATCH /zones/:zoneId
func (h *Handler) UpdateZone(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	zoneID := c.Param("zoneId")

	var zone model.Zone
	if err := database.DB.First(&zone, "id = ?", zoneID).Error; err != nil {
		response.NotFound(c, "Zone 不存在")
		return
	}
	if zone.SellerID != userID {
		response.Forbidden(c, "FORBIDDEN", "無法修改他人 Zone")
		return
	}

	var req UpdateZoneRequest
	c.ShouldBindJSON(&req)
	updates := map[string]interface{}{}
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Category != nil {
		updates["category"] = *req.Category
	}
	if req.MinCreditScore != nil {
		updates["min_credit_score"] = *req.MinCreditScore
	}
	if req.EndsAt != nil {
		if *req.EndsAt == "" {
			updates["ends_at"] = nil
		} else {
			parsed, err := time.Parse(time.RFC3339, *req.EndsAt)
			if err != nil {
				response.BadRequest(c, "INVALID_DATE", "ends_at 格式錯誤，請使用 ISO 8601")
				return
			}
			updates["ends_at"] = parsed
		}
	}
	if len(updates) > 0 {
		database.DB.Model(&zone).Updates(updates)
	}

	database.DB.Preload("Photos").First(&zone, "id = ?", zone.ID)
	response.OK(c, zone)
}

// DELETE /zones/:zoneId（軟關閉：status → ended）
func (h *Handler) DeleteZone(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	zoneID := c.Param("zoneId")

	var zone model.Zone
	if err := database.DB.First(&zone, "id = ?", zoneID).Error; err != nil {
		response.NotFound(c, "Zone 不存在")
		return
	}
	if zone.SellerID != userID {
		response.Forbidden(c, "FORBIDDEN", "無法關閉他人 Zone")
		return
	}
	if zone.Status == model.ZoneStatusEnded {
		response.UnprocessableEntity(c, "ALREADY_CLOSED", "此 Zone 已關閉")
		return
	}

	database.DB.Model(&zone).Update("status", model.ZoneStatusEnded)
	response.NoContent(c)
}

// ── Applications ─────────────────────────────────────────────────────────────

// GET /users/me/applications
func (h *Handler) GetMyApplications(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	var apps []model.ZoneApplication
	database.DB.Where("applicant_id = ?", userID).Order("applied_at DESC").Find(&apps)

	// 批次撈 Zone（避免 N+1）
	zoneIDs := make([]string, len(apps))
	for i, a := range apps {
		zoneIDs[i] = a.ZoneID
	}
	if len(zoneIDs) > 0 {
		var zones []model.Zone
		database.DB.Preload("Photos").Where("id IN ?", zoneIDs).Find(&zones)
		zoneMap := make(map[string]*model.Zone, len(zones))
		for i := range zones {
			zoneMap[zones[i].ID] = &zones[i]
		}
		for i := range apps {
			apps[i].Zone = zoneMap[apps[i].ZoneID]
		}
	}
	response.OK(c, apps)
}

type ApplyRequest struct {
	Intro string `json:"intro" binding:"required,min=1"`
}

// POST /zones/:zoneId/apply
func (h *Handler) Apply(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	zoneID := c.Param("zoneId")

	var zone model.Zone
	if err := database.DB.First(&zone, "id = ?", zoneID).Error; err != nil {
		response.NotFound(c, "Zone 不存在")
		return
	}
	if zone.SellerID == userID {
		response.BadRequest(c, "SELF_APPLY", "不能申請自己的 Zone")
		return
	}
	if zone.AcceptedCount >= zone.TotalSlots {
		response.UnprocessableEntity(c, "ZONE_FULL", "Zone 名額已滿")
		return
	}

	// 信用分數門檻
	if zone.MinCreditScore > 0 {
		var profile model.UserProfile
		database.DB.Where("user_id = ?", userID).First(&profile)
		if profile.CreditScore < zone.MinCreditScore {
			response.UnprocessableEntity(c, "CREDIT_TOO_LOW", "信用分數不足")
			return
		}
	}

	// 月度申請限制檢查
	if h.monthlyLimit.CheckApplyLimit(userID) {
		response.TooManyRequests(c, "MONTHLY_LIMIT_EXCEEDED", "本月申請次數已達上限，請完成真人驗證以解除限制")
		return
	}

	var req ApplyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	// 重複申請檢查
	var existingCount int64
	database.DB.Model(&model.ZoneApplication{}).Where("zone_id = ? AND applicant_id = ?", zoneID, userID).Count(&existingCount)
	if existingCount > 0 {
		response.Conflict(c, "ALREADY_APPLIED", "已申請過此 Zone")
		return
	}

	app := model.ZoneApplication{ZoneID: zoneID, ApplicantID: userID, Intro: req.Intro}
	if err := database.DB.Create(&app).Error; err != nil {
		response.InternalError(c)
		return
	}

	// 通知賣家有新的申請
	notifier.Emit(database.DB, zone.SellerID, &userID, model.NotifZoneApply, &zoneID, strPtr("zone"), "申請加入你的私藏")

	response.Created(c, app)
}

// DELETE /zones/:zoneId/apply（取消申請）
func (h *Handler) CancelApply(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	zoneID := c.Param("zoneId")

	result := database.DB.Delete(&model.ZoneApplication{}, "zone_id = ? AND applicant_id = ? AND status = ?", zoneID, userID, model.ApplicationPending)
	if result.RowsAffected == 0 {
		response.NotFound(c, "找不到可取消的申請")
		return
	}
	response.NoContent(c)
}

// GET /zones/:zoneId/applications
func (h *Handler) GetApplications(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	zoneID := c.Param("zoneId")

	var zone model.Zone
	if err := database.DB.First(&zone, "id = ?", zoneID).Error; err != nil {
		response.NotFound(c, "Zone 不存在")
		return
	}
	if zone.SellerID != userID {
		response.Forbidden(c, "FORBIDDEN", "僅賣家可查看申請列表")
		return
	}

	var apps []model.ZoneApplication
	database.DB.Where("zone_id = ?", zoneID).Order("applied_at DESC").Find(&apps)

	// 批次撈 applicant profile（避免 N+1）
	applicantIDs := make([]string, len(apps))
	for i, a := range apps {
		applicantIDs[i] = a.ApplicantID
	}
	profileMap := batchLoadProfiles(applicantIDs)
	for i := range apps {
		if p, ok := profileMap[apps[i].ApplicantID]; ok {
			apps[i].Applicant = p
		}
	}
	response.OK(c, apps)
}

type ReviewApplicationRequest struct {
	Action string `json:"action" binding:"required,oneof=approve reject"`
}

// PATCH /zones/:zoneId/applications/:appId
func (h *Handler) ReviewApplication(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	zoneID := c.Param("zoneId")
	appID := c.Param("appId")

	var zone model.Zone
	if err := database.DB.First(&zone, "id = ?", zoneID).Error; err != nil {
		response.NotFound(c, "Zone 不存在")
		return
	}
	if zone.SellerID != userID {
		response.Forbidden(c, "FORBIDDEN", "僅賣家可審核申請")
		return
	}

	var app model.ZoneApplication
	if err := database.DB.First(&app, "id = ? AND zone_id = ?", appID, zoneID).Error; err != nil {
		response.NotFound(c, "申請不存在")
		return
	}
	if app.Status != model.ApplicationPending {
		response.UnprocessableEntity(c, "ALREADY_REVIEWED", "此申請已審核")
		return
	}

	var req ReviewApplicationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	now := time.Now()
	if req.Action == "approve" {
		// 原子操作：更新申請狀態 + 建立 Chat
		// Transaction 和 accepted_count 在賣家點擊「設為私藏家」時才處理
		if err := database.DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.Model(&app).Updates(map[string]interface{}{
				"status": model.ApplicationApproved, "reviewed_at": now,
			}).Error; err != nil {
				return err
			}
			chat := model.Chat{Type: model.ChatTypeZone, ZoneID: &zoneID, ApplicationID: &app.ID}
			if err := tx.Create(&chat).Error; err != nil {
				return err
			}
			if err := tx.Create(&model.ChatParticipant{ChatID: chat.ID, UserID: zone.SellerID}).Error; err != nil {
				return err
			}
			return tx.Create(&model.ChatParticipant{ChatID: chat.ID, UserID: app.ApplicantID}).Error
		}); err != nil {
			response.InternalError(c)
			return
		}
		// 通知買家申請已通過
		notifier.Emit(database.DB, app.ApplicantID, &userID, model.NotifZoneApprove, &zoneID, strPtr("zone"), "你的私藏申請已通過")
	} else {
		database.DB.Model(&app).Updates(map[string]interface{}{
			"status": model.ApplicationRejected, "reviewed_at": now,
		})
		// 通知買家申請未通過
		notifier.Emit(database.DB, app.ApplicantID, &userID, model.NotifZoneReject, &zoneID, strPtr("zone"), "你的私藏申請未通過")
	}

	response.NoContent(c)
}

// ── Set Collector ────────────────────────────────────────────────────────────

type SetCollectorRequest struct {
	ApplicationID string `json:"application_id" binding:"required"`
}

// POST /zones/:zoneId/set-collector
func (h *Handler) SetCollector(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	zoneID := c.Param("zoneId")

	var zone model.Zone
	if err := database.DB.First(&zone, "id = ?", zoneID).Error; err != nil {
		response.NotFound(c, "Zone 不存在")
		return
	}
	if zone.SellerID != userID {
		response.Forbidden(c, "FORBIDDEN", "僅賣家可設定私藏家")
		return
	}
	if zone.Status == model.ZoneStatusEnded {
		response.UnprocessableEntity(c, "ZONE_CLOSED", "此 Zone 已關閉")
		return
	}
	if zone.AcceptedCount >= zone.TotalSlots {
		response.UnprocessableEntity(c, "ZONE_FULL", "私藏家名額已滿")
		return
	}

	var req SetCollectorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	var app model.ZoneApplication
	if err := database.DB.First(&app, "id = ? AND zone_id = ?", req.ApplicationID, zoneID).Error; err != nil {
		response.NotFound(c, "申請不存在")
		return
	}
	if app.Status != model.ApplicationApproved {
		response.UnprocessableEntity(c, "NOT_APPROVED", "此申請尚未通過審核")
		return
	}
	if app.IsCollector {
		response.UnprocessableEntity(c, "ALREADY_COLLECTOR", "此買家已是私藏家")
		return
	}

	// 原子操作：標記私藏家 + 名額 +1 + 建立 Transaction
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&app).Update("is_collector", true).Error; err != nil {
			return err
		}
		if err := tx.Model(&zone).UpdateColumn("accepted_count", gorm.Expr("accepted_count + 1")).Error; err != nil {
			return err
		}
		return tx.Create(&model.Transaction{
			ApplicationID: app.ID,
			BuyerID:       app.ApplicantID,
			SellerID:      zone.SellerID,
		}).Error
	}); err != nil {
		response.InternalError(c)
		return
	}

	// 若名額已滿，自動關閉 Zone
	zoneClosed := (zone.AcceptedCount + 1) >= zone.TotalSlots
	if zoneClosed {
		database.DB.Model(&zone).Update("status", model.ZoneStatusEnded)
	}

	// 通知買家已成為私藏家
	notifier.Emit(database.DB, app.ApplicantID, &userID, model.NotifZoneApprove, &zoneID, strPtr("zone"), "你已成為私藏家")

	response.OK(c, gin.H{
		"is_collector":   true,
		"zone_closed":    zoneClosed,
		"accepted_count": zone.AcceptedCount + 1,
	})
}

// batchLoadProfiles 批次載入 UserProfile，回傳 userID → *UserProfile 的 map
func batchLoadProfiles(userIDs []string) map[string]*model.UserProfile {
	profileMap := make(map[string]*model.UserProfile)
	if len(userIDs) == 0 {
		return profileMap
	}
	var profiles []model.UserProfile
	database.DB.Where("user_id IN ?", userIDs).Find(&profiles)
	for i := range profiles {
		profileMap[profiles[i].UserID] = &profiles[i]
	}
	return profileMap
}
