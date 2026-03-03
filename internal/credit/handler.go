package credit

import (
	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/pkg/database"
	"github.com/benny-yang/veil-api/pkg/response"
	"github.com/gin-gonic/gin"
)

type Handler struct{}

func NewHandler() *Handler { return &Handler{} }

// GET /users/:username/credit
func (h *Handler) GetCredit(c *gin.Context) {
	username := c.Param("username")
	var profile model.UserProfile
	if err := database.DB.Where("username = ?", username).First(&profile).Error; err != nil {
		response.NotFound(c, "找不到此用戶")
		return
	}

	var logs []model.CreditScoreLog
	database.DB.Where("user_id = ?", profile.UserID).Order("created_at DESC").Limit(50).Find(&logs)

	response.OK(c, gin.H{
		"credit_score": profile.CreditScore,
		"logs":         logs,
	})
}
