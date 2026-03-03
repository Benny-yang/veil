package zone

import (
	"errors"
	"time"

	"github.com/benny-yang/veil-api/internal/middleware"
	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/pkg/database"
	"github.com/benny-yang/veil-api/pkg/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct{}

func NewHandler() *Handler { return &Handler{} }

// GET /zones
func (h *Handler) ListZones(c *gin.Context) {
	var zones []model.Zone
	q := database.DB.Preload("Photos").Preload("Tags").Where("status = ?", model.ZoneStatusActive)
	if tag := c.Query("tag"); tag != "" {
		q = q.Joins("JOIN zone_tags zt ON zt.zone_id = zones.id JOIN tags t ON t.id = zt.tag_id AND t.name = ?", tag)
	}
	q.Order("created_at DESC").Find(&zones)

	for i := range zones {
		var profile model.UserProfile
		database.DB.Where("user_id = ?", zones[i].SellerID).First(&profile)
		zones[i].Seller = &profile
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
	Title          string           `json:"title" binding:"required,min=1,max=100"`
	Description    string           `json:"description"`
	TotalSlots     int              `json:"total_slots" binding:"required,min=1"`
	MinCreditScore int              `json:"min_credit_score"`
	EndsAt         *string          `json:"ends_at"` // ISO 8601
	Photos         []ZonePhotoInput `json:"photos"`
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

	zone := model.Zone{
		SellerID:       userID,
		Title:          req.Title,
		Description:    req.Description,
		TotalSlots:     req.TotalSlots,
		MinCreditScore: req.MinCreditScore,
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
	Title          *string `json:"title"`
	Description    *string `json:"description"`
	MinCreditScore *int    `json:"min_credit_score"`
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
	if req.MinCreditScore != nil {
		updates["min_credit_score"] = *req.MinCreditScore
	}
	if len(updates) > 0 {
		database.DB.Model(&zone).Updates(updates)
	}

	database.DB.Preload("Photos").First(&zone, "id = ?", zone.ID)
	response.OK(c, zone)
}

// DELETE /zones/:zoneId
func (h *Handler) DeleteZone(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	zoneID := c.Param("zoneId")

	var zone model.Zone
	if err := database.DB.First(&zone, "id = ?", zoneID).Error; err != nil {
		response.NotFound(c, "Zone 不存在")
		return
	}
	if zone.SellerID != userID {
		response.Forbidden(c, "FORBIDDEN", "無法刪除他人 Zone")
		return
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		tx.Exec("DELETE FROM zone_tags WHERE zone_id = ?", zoneID)
		tx.Delete(&model.ZonePhoto{}, "zone_id = ?", zoneID)
		return tx.Delete(&zone).Error
	}); err != nil {
		response.InternalError(c)
		return
	}
	response.NoContent(c)
}

// ── Applications ─────────────────────────────────────────────────────────────

// GET /users/me/applications
func (h *Handler) GetMyApplications(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	var apps []model.ZoneApplication
	database.DB.Where("applicant_id = ?", userID).Order("applied_at DESC").Find(&apps)

	for i := range apps {
		var zone model.Zone
		database.DB.First(&zone, "id = ?", apps[i].ZoneID)
		apps[i].Zone = &zone
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

	var req ApplyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	app := model.ZoneApplication{ZoneID: zoneID, ApplicantID: userID, Intro: req.Intro}
	if err := database.DB.Create(&app).Error; err != nil {
		response.Conflict(c, "ALREADY_APPLIED", "已申請過此 Zone")
		return
	}
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
	for i := range apps {
		var profile model.UserProfile
		database.DB.Where("user_id = ?", apps[i].ApplicantID).First(&profile)
		apps[i].Applicant = &profile
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
		if zone.AcceptedCount >= zone.TotalSlots {
			response.UnprocessableEntity(c, "ZONE_FULL", "Zone 名額已滿")
			return
		}
		database.DB.Model(&app).Updates(map[string]interface{}{
			"status": model.ApplicationApproved, "reviewed_at": now,
		})
		database.DB.Model(&zone).UpdateColumn("accepted_count", gorm.Expr("accepted_count + 1"))

		// 建立 Chat + Transaction
		if err := database.DB.Transaction(func(tx *gorm.DB) error {
			chat := model.Chat{Type: model.ChatTypeZone, ZoneID: &zoneID, ApplicationID: &app.ID}
			if err := tx.Create(&chat).Error; err != nil {
				return err
			}
			if err := tx.Create(&model.ChatParticipant{ChatID: chat.ID, UserID: zone.SellerID}).Error; err != nil {
				return err
			}
			if err := tx.Create(&model.ChatParticipant{ChatID: chat.ID, UserID: app.ApplicantID}).Error; err != nil {
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
	} else {
		database.DB.Model(&app).Updates(map[string]interface{}{
			"status": model.ApplicationRejected, "reviewed_at": now,
		})
	}

	response.NoContent(c)
}
