package user

import (
	"errors"
	"time"

	"github.com/benny-yang/veil-api/internal/middleware"
	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/pkg/database"
	"github.com/benny-yang/veil-api/pkg/response"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Handler struct{}

func NewHandler() *Handler { return &Handler{} }

// ── Profile ───────────────────────────────────────────────────────────────────

// GET /users/:username
func (h *Handler) GetProfile(c *gin.Context) {
	username := c.Param("username")
	var profile model.UserProfile
	if err := database.DB.Where("username = ?", username).First(&profile).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.NotFound(c, "找不到此用戶")
		} else {
			response.InternalError(c)
		}
		return
	}
	response.OK(c, profile)
}

// GET /users/me
func (h *Handler) GetMe(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	var user model.User
	var profile model.UserProfile
	database.DB.First(&user, "id = ?", userID)
	database.DB.Where("user_id = ?", userID).First(&profile)

	result := gin.H{
		"id":                   user.ID,
		"email":                user.Email,
		"onboarding_completed": user.OnboardingCompleted,
		"suspended_until":      user.SuspendedUntil,
		"suspend_reason":       user.SuspendReason,
		"profile":              profile,
	}

	// 若停權中，附加申訴相關資訊
	if user.SuspendedUntil != nil {
		var suspLog model.SuspensionLog
		if err := database.DB.
			Where("user_id = ? AND appeal_deadline IS NOT NULL", userID).
			Order("created_at DESC").
			First(&suspLog).Error; err == nil {
			result["appeal_deadline"] = suspLog.AppealDeadline

			// 查詢是否已申訴
			var appeal model.Appeal
			if err := database.DB.
				Where("suspension_log_id = ?", suspLog.ID).
				First(&appeal).Error; err == nil {
				result["appeal_status"] = appeal.Status
				result["appeal_id"] = appeal.ID
			}
		}
	}

	response.OK(c, result)
}

type UpdateProfileRequest struct {
	DisplayName *string `json:"display_name"`
	Bio         *string `json:"bio"`
}

// PATCH /users/me
func (h *Handler) UpdateMe(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	updates := map[string]interface{}{}
	if req.DisplayName != nil {
		updates["display_name"] = *req.DisplayName
	}
	if req.Bio != nil {
		updates["bio"] = *req.Bio
	}

	if len(updates) == 0 {
		response.BadRequest(c, "NO_CHANGES", "沒有可更新的欄位")
		return
	}

	if err := database.DB.Model(&model.UserProfile{}).
		Where("user_id = ?", userID).
		Updates(updates).Error; err != nil {
		response.InternalError(c)
		return
	}

	var profile model.UserProfile
	database.DB.Where("user_id = ?", userID).First(&profile)
	response.OK(c, profile)
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

// PATCH /users/me/password
func (h *Handler) ChangePassword(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	var user model.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		response.InternalError(c)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		response.BadRequest(c, "WRONG_PASSWORD", "目前密碼不正確")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		response.InternalError(c)
		return
	}
	database.DB.Model(&user).Update("password_hash", string(hash))
	response.NoContent(c)
}

// POST /users/me/onboarding
func (h *Handler) CompleteOnboarding(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	database.DB.Model(&model.User{}).Where("id = ?", userID).Update("onboarding_completed", true)
	response.NoContent(c)
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

type UpdateAvatarRequest struct {
	AvatarURL string `json:"avatar_url" binding:"required,url"`
}

// PUT /users/me/avatar
func (h *Handler) UpdateAvatar(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	var req UpdateAvatarRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}
	database.DB.Model(&model.UserProfile{}).Where("user_id = ?", userID).Update("avatar_url", req.AvatarURL)
	response.NoContent(c)
}

// ── Follow ────────────────────────────────────────────────────────────────────

// POST /users/:username/follow
func (h *Handler) Follow(c *gin.Context) {
	callerID, _ := middleware.GetUserID(c)
	username := c.Param("username")

	var target model.UserProfile
	if err := database.DB.Where("username = ?", username).First(&target).Error; err != nil {
		response.NotFound(c, "找不到此用戶")
		return
	}

	if callerID == target.UserID {
		response.BadRequest(c, "SELF_FOLLOW", "不能追蹤自己")
		return
	}

	// 先查是否已追蹤
	var existingFollow model.Follow
	if err := database.DB.Where("follower_id = ? AND following_id = ?", callerID, target.UserID).First(&existingFollow).Error; err == nil {
		response.Conflict(c, "ALREADY_FOLLOWING", "已追蹤此用戶")
		return
	}

	// 原子操作：建立 follow + 更新計數
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		follow := model.Follow{FollowerID: callerID, FollowingID: target.UserID}
		if err := tx.Create(&follow).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.UserProfile{}).Where("user_id = ?", callerID).UpdateColumn("following_count", gorm.Expr("following_count + 1")).Error; err != nil {
			return err
		}
		return tx.Model(&model.UserProfile{}).Where("user_id = ?", target.UserID).UpdateColumn("follower_count", gorm.Expr("follower_count + 1")).Error
	}); err != nil {
		response.InternalError(c)
		return
	}

	response.NoContent(c)
}

// DELETE /users/:username/follow
func (h *Handler) Unfollow(c *gin.Context) {
	callerID, _ := middleware.GetUserID(c)
	username := c.Param("username")

	var target model.UserProfile
	if err := database.DB.Where("username = ?", username).First(&target).Error; err != nil {
		response.NotFound(c, "找不到此用戶")
		return
	}

	// 原子操作：刪除 follow + 更新計數
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		result := tx.Delete(&model.Follow{}, "follower_id = ? AND following_id = ?", callerID, target.UserID)
		if result.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}
		if err := tx.Model(&model.UserProfile{}).Where("user_id = ?", callerID).UpdateColumn("following_count", gorm.Expr("following_count - 1")).Error; err != nil {
			return err
		}
		return tx.Model(&model.UserProfile{}).Where("user_id = ?", target.UserID).UpdateColumn("follower_count", gorm.Expr("follower_count - 1")).Error
	}); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.NotFound(c, "尚未追蹤此用戶")
			return
		}
		response.InternalError(c)
		return
	}

	response.NoContent(c)
}

// GET /users/:username/followers
func (h *Handler) GetFollowers(c *gin.Context) {
	username := c.Param("username")
	var target model.UserProfile
	if err := database.DB.Where("username = ?", username).First(&target).Error; err != nil {
		response.NotFound(c, "找不到此用戶")
		return
	}

	var follows []model.Follow
	database.DB.Where("following_id = ?", target.UserID).Find(&follows)

	followerIDs := make([]string, len(follows))
	for i, f := range follows {
		followerIDs[i] = f.FollowerID
	}

	var profiles []model.UserProfile
	if len(followerIDs) > 0 {
		database.DB.Where("user_id IN ?", followerIDs).Find(&profiles)
	}
	response.OK(c, profiles)
}

// GET /users/:username/following
func (h *Handler) GetFollowing(c *gin.Context) {
	username := c.Param("username")
	var target model.UserProfile
	if err := database.DB.Where("username = ?", username).First(&target).Error; err != nil {
		response.NotFound(c, "找不到此用戶")
		return
	}

	var follows []model.Follow
	database.DB.Where("follower_id = ?", target.UserID).Find(&follows)

	followingIDs := make([]string, len(follows))
	for i, f := range follows {
		followingIDs[i] = f.FollowingID
	}

	var profiles []model.UserProfile
	if len(followingIDs) > 0 {
		database.DB.Where("user_id IN ?", followingIDs).Find(&profiles)
	}
	response.OK(c, profiles)
}

// ── Real Person Verification ─────────────────────────────────────────────────

type RealPersonVerifyRequest struct {
	Platform   string `json:"platform" binding:"required"`
	ProfileURL string `json:"profile_url" binding:"required,url"`
	PhotoURL   string `json:"photo_url" binding:"required,url"`
}

// GET /users/me/verification/real-person
func (h *Handler) GetVerification(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	var v model.UserVerification
	err := database.DB.Where("user_id = ? AND type = ?", userID, model.VerificationTypeRealPerson).First(&v).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		response.OK(c, gin.H{"status": "none"})
		return
	}
	response.OK(c, v)
}

// POST /users/me/verification/real-person
func (h *Handler) SubmitRealPersonVerification(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	var req RealPersonVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	now := time.Now()
	v := model.UserVerification{
		UserID:      userID,
		Type:        model.VerificationTypeRealPerson,
		Status:      model.VerificationPending,
		Platform:    &req.Platform,
		ProfileURL:  &req.ProfileURL,
		PhotoURL:    &req.PhotoURL,
		SubmittedAt: &now,
	}

	// Upsert：若已有則更新
	var existing model.UserVerification
	err := database.DB.Where("user_id = ? AND type = ?", userID, model.VerificationTypeRealPerson).First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		database.DB.Create(&v)
	} else {
		database.DB.Model(&existing).Updates(map[string]interface{}{
			"status":         model.VerificationPending,
			"platform":       req.Platform,
			"profile_url":    req.ProfileURL,
			"photo_url":      req.PhotoURL,
			"submitted_at":   now,
			"failure_reason": nil,
		})
	}

	response.NoContent(c)
}
