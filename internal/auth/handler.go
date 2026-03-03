package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/http"
	"regexp"
	"time"

	"github.com/benny-yang/veil-api/internal/email"
	"github.com/benny-yang/veil-api/internal/middleware"
	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/pkg/database"
	"github.com/benny-yang/veil-api/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// ── Request / Response DTOs ──────────────────────────────────────────────────

type RegisterRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=8"`
	Username    string `json:"username" binding:"required,min=3,max=50"`
	DisplayName string `json:"display_name" binding:"required,min=1,max=100"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type TokenResponse struct {
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	User         UserSummary `json:"user"`
}

type UserSummary struct {
	ID          string  `json:"id"`
	Email       string  `json:"email"`
	Username    string  `json:"username"`
	DisplayName string  `json:"display_name"`
	AvatarURL   *string `json:"avatar_url"`
	AvatarColor string  `json:"avatar_color"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// ── Avatar 預設色盤 ────────────────────────────────────────────────────────────

var avatarColors = []string{"#E8DDD0", "#C4A882", "#8C8479", "#D4C5B0", "#A89282"}

func pickAvatarColor(username string) string {
	idx := 0
	for _, c := range username {
		idx += int(c)
	}
	return avatarColors[idx%len(avatarColors)]
}

// ── Handler ──────────────────────────────────────────────────────────────────

type Handler struct {
	jwtSecret            string
	jwtExpiryHours       int
	jwtRefreshExpiryDays int
	emailSvc             *email.Service
	baseURL              string
}

func NewHandler(jwtSecret string, expiryHours, refreshDays int, emailSvc *email.Service, baseURL string) *Handler {
	return &Handler{
		jwtSecret:            jwtSecret,
		jwtExpiryHours:       expiryHours,
		jwtRefreshExpiryDays: refreshDays,
		emailSvc:             emailSvc,
		baseURL:              baseURL,
	}
}

var usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)

// POST /auth/register
func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	if !usernameRegex.MatchString(req.Username) {
		response.BadRequest(c, "INVALID_USERNAME", "帳號只能包含英文、數字與底線")
		return
	}

	db := database.DB

	// 檢查 email 唯一
	var existing model.User
	if err := db.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		response.Conflict(c, "EMAIL_TAKEN", "此信箱已被使用")
		return
	}

	// 檢查 username 唯一
	var existingProfile model.UserProfile
	if err := db.Where("username = ?", req.Username).First(&existingProfile).Error; err == nil {
		response.Conflict(c, "USERNAME_TAKEN", "此帳號名稱已被使用")
		return
	}

	// 雜湊密碼
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		response.InternalError(c)
		return
	}

	// 產生 email 驗證 token
	tokenBytes := make([]byte, 32)
	rand.Read(tokenBytes)
	verifyToken := hex.EncodeToString(tokenBytes)
	verifyExpiry := time.Now().Add(24 * time.Hour)

	// 建立 User + UserProfile（transaction）
	var user model.User
	err = db.Transaction(func(tx *gorm.DB) error {
		user = model.User{
			Email:                req.Email,
			PasswordHash:         string(hash),
			EmailVerifyToken:     &verifyToken,
			EmailVerifyExpiresAt: &verifyExpiry,
		}
		if err := tx.Create(&user).Error; err != nil {
			return err
		}

		profile := model.UserProfile{
			UserID:      user.ID,
			Username:    req.Username,
			DisplayName: req.DisplayName,
			AvatarColor: pickAvatarColor(req.Username),
		}
		return tx.Create(&profile).Error
	})

	if err != nil {
		response.InternalError(c)
		return
	}

	// 寄驗證信（非同步）
	if h.emailSvc != nil {
		go h.emailSvc.SendEmailVerification(user.Email, verifyToken, h.baseURL)
	}

	c.JSON(http.StatusAccepted, response.Response{
		Success: true,
		Data:    gin.H{"message": "帳號建立成功，請至信箱收取驗證信完成驗證後即可登入"},
	})
}

// POST /auth/login
func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	db := database.DB

	var user model.User
	if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.Unauthorized(c, "信箱或密碼錯誤")
		} else {
			response.InternalError(c)
		}
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		response.Unauthorized(c, "信箱或密碼錯誤")
		return
	}

	// 封鎖未驗證信箱
	if !user.EmailVerified {
		response.Forbidden(c, "EMAIL_NOT_VERIFIED", "請先至信箱完成驗證後再登入")
		return
	}

	tokens, err := h.issueTokens(user.ID)
	if err != nil {
		response.InternalError(c)
		return
	}

	var profile model.UserProfile
	database.DB.Where("user_id = ?", user.ID).First(&profile)

	response.OK(c, TokenResponse{
		AccessToken:  tokens[0],
		RefreshToken: tokens[1],
		User:         toUserSummary(&user, &profile),
	})
}

// POST /auth/refresh
func (h *Handler) Refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	token, err := jwt.Parse(req.RefreshToken, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(h.jwtSecret), nil
	})
	if err != nil || !token.Valid {
		response.Unauthorized(c, "Refresh Token 無效或已過期")
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["type"] != "refresh" {
		response.Unauthorized(c, "非 Refresh Token")
		return
	}

	userID, _ := claims["sub"].(string)
	var user model.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		response.Unauthorized(c, "使用者不存在")
		return
	}

	var profile model.UserProfile
	database.DB.Where("user_id = ?", user.ID).First(&profile)

	tokens, err := h.issueTokens(userID)
	if err != nil {
		response.InternalError(c)
		return
	}

	response.OK(c, TokenResponse{
		AccessToken:  tokens[0],
		RefreshToken: tokens[1],
		User:         toUserSummary(&user, &profile),
	})
}

// POST /auth/logout（Client 端清除 Token 即可，此為確認端點）
func (h *Handler) Logout(c *gin.Context) {
	response.NoContent(c)
}

// GET /auth/me（確認 Token 有效）
func (h *Handler) Me(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	var user model.User
	var profile model.UserProfile
	database.DB.First(&user, "id = ?", userID)
	database.DB.Where("user_id = ?", userID).First(&profile)
	response.OK(c, toUserSummary(&user, &profile))
}

// ── Email 驗證 ────────────────────────────────────────────────────────────────

type VerifyEmailRequest struct {
	Token string `json:"token" binding:"required"`
}

// POST /auth/verify-email
func (h *Handler) VerifyEmail(c *gin.Context) {
	var req VerifyEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	var user model.User
	if err := database.DB.Where("email_verify_token = ?", req.Token).First(&user).Error; err != nil {
		response.BadRequest(c, "INVALID_TOKEN", "驗證連結無效或已使用")
		return
	}

	if user.EmailVerified {
		response.BadRequest(c, "ALREADY_VERIFIED", "此信箱已完成驗證")
		return
	}

	if user.EmailVerifyExpiresAt != nil && time.Now().After(*user.EmailVerifyExpiresAt) {
		response.BadRequest(c, "TOKEN_EXPIRED", "驗證連結已過期，請重新申請")
		return
	}

	// 標記驗證完成，清除 token
	database.DB.Model(&user).Updates(map[string]interface{}{
		"email_verified":          true,
		"email_verify_token":      nil,
		"email_verify_expires_at": nil,
	})

	// 非同步寄歡迎信
	var profile model.UserProfile
	database.DB.Where("user_id = ?", user.ID).First(&profile)
	if h.emailSvc != nil {
		go h.emailSvc.SendWelcome(user.Email, profile.DisplayName)
	}

	// 回傳 token，方便前端驗證完直接登入
	tokens, err := h.issueTokens(user.ID)
	if err != nil {
		response.InternalError(c)
		return
	}

	response.OK(c, TokenResponse{
		AccessToken:  tokens[0],
		RefreshToken: tokens[1],
		User:         toUserSummary(&user, &profile),
	})
}

// POST /auth/resend-verification
func (h *Handler) ResendVerification(c *gin.Context) {
	type req struct {
		Email string `json:"email" binding:"required,email"`
	}
	var r req
	if err := c.ShouldBindJSON(&r); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	var user model.User
	if err := database.DB.Where("email = ?", r.Email).First(&user).Error; err != nil {
		// 不洩漏是否存在，一律回 204
		response.NoContent(c)
		return
	}

	if user.EmailVerified {
		response.BadRequest(c, "ALREADY_VERIFIED", "此信箱已完成驗證")
		return
	}

	// 產生新 token
	tokenBytes := make([]byte, 32)
	rand.Read(tokenBytes)
	verifyToken := hex.EncodeToString(tokenBytes)
	verifyExpiry := time.Now().Add(24 * time.Hour)

	database.DB.Model(&user).Updates(map[string]interface{}{
		"email_verify_token":      verifyToken,
		"email_verify_expires_at": verifyExpiry,
	})

	if h.emailSvc != nil {
		go h.emailSvc.SendEmailVerification(user.Email, verifyToken, h.baseURL)
	}

	response.NoContent(c)
}

type PasswordResetRequestReq struct {
	Email string `json:"email" binding:"required,email"`
}

// POST /auth/password/reset-request
func (h *Handler) PasswordResetRequest(c *gin.Context) {
	var req PasswordResetRequestReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	var user model.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// 不洩漏是否存在，一律回 204
		response.NoContent(c)
		return
	}

	// 產生 token
	tokenBytes := make([]byte, 32)
	rand.Read(tokenBytes)
	tokenStr := hex.EncodeToString(tokenBytes)

	// 作廢舊 token
	database.DB.Where("user_id = ?", user.ID).Delete(&model.PasswordResetToken{})

	prt := model.PasswordResetToken{
		UserID:    user.ID,
		Token:     tokenStr,
		ExpiresAt: time.Now().Add(1 * time.Hour),
	}
	database.DB.Create(&prt)

	// 發送 Email（非同步，不影響 response）
	if h.emailSvc != nil {
		go h.emailSvc.SendPasswordReset(user.Email, tokenStr, h.baseURL)
	}

	response.NoContent(c)
}

type PasswordResetReq struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

// POST /auth/password/reset
func (h *Handler) PasswordReset(c *gin.Context) {
	var req PasswordResetReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	var prt model.PasswordResetToken
	if err := database.DB.Where("token = ?", req.Token).First(&prt).Error; err != nil {
		response.BadRequest(c, "INVALID_TOKEN", "Token 無效或已使用")
		return
	}

	if !prt.IsValid() {
		response.BadRequest(c, "TOKEN_EXPIRED", "Token 已失效，請重新申請")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		response.InternalError(c)
		return
	}

	database.DB.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		tx.Model(&prt).Update("used_at", now)
		return tx.Model(&model.User{}).Where("id = ?", prt.UserID).Update("password_hash", string(hash)).Error
	})

	response.NoContent(c)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func (h *Handler) issueTokens(userID string) ([]string, error) {
	access, err := h.signToken(userID, "access", time.Duration(h.jwtExpiryHours)*time.Hour)
	if err != nil {
		return nil, err
	}
	refresh, err := h.signToken(userID, "refresh", time.Duration(h.jwtRefreshExpiryDays)*24*time.Hour)
	if err != nil {
		return nil, err
	}
	return []string{access, refresh}, nil
}

func (h *Handler) signToken(userID, tokenType string, expiry time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"sub":  userID,
		"type": tokenType,
		"exp":  time.Now().Add(expiry).Unix(),
		"iat":  time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.jwtSecret))
}

func toUserSummary(u *model.User, p *model.UserProfile) UserSummary {
	return UserSummary{
		ID:          u.ID,
		Email:       u.Email,
		Username:    p.Username,
		DisplayName: p.DisplayName,
		AvatarURL:   p.AvatarURL,
		AvatarColor: p.AvatarColor,
	}
}
