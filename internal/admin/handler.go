package admin

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/pkg/database"
	"github.com/benny-yang/veil-api/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Handler 管理者 API handler
type Handler struct {
	jwtSecret string
}

func NewHandler(jwtSecret string) *Handler {
	return &Handler{jwtSecret: jwtSecret}
}

// ── Admin Stats ───────────────────────────────────────────────────────────────

type StatsResponse struct {
	TotalMembers         int64 `json:"total_members"`
	TotalWorks           int64 `json:"total_works"`
	TotalZones           int64 `json:"total_zones"`
	ActiveZones          int64 `json:"active_zones"`
	EndedZones           int64 `json:"ended_zones"`
	TotalApplications    int64 `json:"total_applications"`
	PendingApplications  int64 `json:"pending_applications"`
	ApprovedApplications int64 `json:"approved_applications"`
}

// GET /admin/stats
func (h *Handler) GetStats(c *gin.Context) {
	var stats StatsResponse

	database.DB.Model(&model.User{}).Count(&stats.TotalMembers)
	database.DB.Model(&model.Work{}).Count(&stats.TotalWorks)
	database.DB.Model(&model.Zone{}).Count(&stats.TotalZones)
	database.DB.Model(&model.Zone{}).Where("status = ?", "active").Count(&stats.ActiveZones)
	database.DB.Model(&model.Zone{}).Where("status = ?", "ended").Count(&stats.EndedZones)
	database.DB.Model(&model.ZoneApplication{}).Count(&stats.TotalApplications)
	database.DB.Model(&model.ZoneApplication{}).Where("status = ?", model.ApplicationPending).Count(&stats.PendingApplications)
	database.DB.Model(&model.ZoneApplication{}).Where("status = ?", model.ApplicationApproved).Count(&stats.ApprovedApplications)

	response.OK(c, stats)
}

// ── Admin Zones ───────────────────────────────────────────────────────────────

type ZoneWithSeller struct {
	model.Zone
	SellerUsername    string `json:"seller_username"`
	SellerDisplayName string `json:"seller_display_name"`
	ApplicationCount  int64  `json:"application_count"`
}

type ApplicationWithApplicant struct {
	model.ZoneApplication
	ApplicantUsername    string `json:"applicant_username"`
	ApplicantDisplayName string `json:"applicant_display_name"`
}

// GET /admin/zones?status=active|ended|all
func (h *Handler) ListZones(c *gin.Context) {
	status := c.DefaultQuery("status", "all")

	var zones []model.Zone
	q := database.DB.Order("created_at DESC")
	if status != "all" {
		q = q.Where("status = ?", status)
	}
	q.Find(&zones)

	result := make([]ZoneWithSeller, 0, len(zones))
	for _, z := range zones {
		var profile model.UserProfile
		database.DB.Select("username, display_name").Where("user_id = ?", z.SellerID).First(&profile)
		var count int64
		database.DB.Model(&model.ZoneApplication{}).Where("zone_id = ?", z.ID).Count(&count)
		result = append(result, ZoneWithSeller{
			Zone:              z,
			SellerUsername:    profile.Username,
			SellerDisplayName: profile.DisplayName,
			ApplicationCount:  count,
		})
	}
	response.OK(c, result)
}

// GET /admin/zones/:zoneId/applications
func (h *Handler) GetZoneApplications(c *gin.Context) {
	zoneID := c.Param("zoneId")

	var apps []model.ZoneApplication
	database.DB.Where("zone_id = ?", zoneID).Order("applied_at ASC").Find(&apps)

	result := make([]ApplicationWithApplicant, 0, len(apps))
	for _, a := range apps {
		var profile model.UserProfile
		database.DB.Select("username, display_name").Where("user_id = ?", a.ApplicantID).First(&profile)
		result = append(result, ApplicationWithApplicant{
			ZoneApplication:      a,
			ApplicantUsername:    profile.Username,
			ApplicantDisplayName: profile.DisplayName,
		})
	}
	response.OK(c, result)
}

// ── Admin Auth ────────────────────────────────────────────────────────────────

type loginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// POST /admin/auth/login
func (h *Handler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", "請提供帳號與密碼")
		return
	}

	var admin model.AdminUser
	if err := database.DB.Where("username = ?", req.Username).First(&admin).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.Unauthorized(c, "帳號或密碼錯誤")
			return
		}
		response.InternalError(c)
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(req.Password)) != nil {
		response.Unauthorized(c, "帳號或密碼錯誤")
		return
	}

	token, err := h.issueAdminToken(admin.ID, admin.Username)
	if err != nil {
		response.InternalError(c)
		return
	}

	response.OK(c, gin.H{
		"token":    token,
		"username": admin.Username,
	})
}

func (h *Handler) issueAdminToken(id, username string) (string, error) {
	claims := jwt.MapClaims{
		"sub":      id,
		"username": username,
		"type":     "admin",
		"exp":      time.Now().Add(8 * time.Hour).Unix(),
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString([]byte(h.jwtSecret))
}

// ── Admin Verifications ───────────────────────────────────────────────────────

// VerificationWithUser 串聯 UserProfile 的驗證資料
type VerificationWithUser struct {
	model.UserVerification
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
}

// GET /admin/verifications?status=pending
func (h *Handler) ListVerifications(c *gin.Context) {
	status := c.DefaultQuery("status", "pending")

	var verifications []model.UserVerification
	query := database.DB.Where("type = ?", model.VerificationTypeRealPerson)
	if status != "all" {
		query = query.Where("status = ?", status)
	}
	query.Order("submitted_at ASC").Find(&verifications)

	// 取得對應的 UserProfile 資訊
	result := make([]VerificationWithUser, 0, len(verifications))
	for _, v := range verifications {
		var profile model.UserProfile
		database.DB.Select("username, display_name").Where("user_id = ?", v.UserID).First(&profile)
		result = append(result, VerificationWithUser{
			UserVerification: v,
			Username:         profile.Username,
			DisplayName:      profile.DisplayName,
		})
	}

	response.OK(c, result)
}

type reviewRequest struct {
	Action        string  `json:"action" binding:"required,oneof=approve reject"`
	FailureReason *string `json:"failure_reason"`
}

// PATCH /admin/verifications/:id
func (h *Handler) ReviewVerification(c *gin.Context) {
	id := c.Param("id")
	adminUsername, _ := c.Get("admin_username")

	var req reviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", "action 必須為 approve 或 reject")
		return
	}

	var v model.UserVerification
	if err := database.DB.First(&v, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.NotFound(c, "找不到此驗證記錄")
			return
		}
		response.InternalError(c)
		return
	}

	now := time.Now()
	usernameStr := adminUsername.(string)
	updates := map[string]interface{}{
		"reviewed_by": usernameStr,
		"reviewed_at": now,
	}

	if req.Action == "approve" {
		updates["status"] = model.VerificationVerified
		updates["failure_reason"] = nil
	} else {
		if req.FailureReason == nil || strings.TrimSpace(*req.FailureReason) == "" {
			response.BadRequest(c, "VALIDATION_ERROR", "拒絕時請填寫原因")
			return
		}
		updates["status"] = model.VerificationFailed
		updates["failure_reason"] = req.FailureReason
	}

	if err := database.DB.Model(&v).Updates(updates).Error; err != nil {
		response.InternalError(c)
		return
	}

	// suppress unused import warning
	_ = http.StatusOK

	response.OK(c, gin.H{"id": id, "status": updates["status"]})
}
