package middleware

import (
	"time"

	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/pkg/database"
	"github.com/gin-gonic/gin"
)

// CheckSuspension 檢查用戶是否處於停權狀態。
// 若停權已到期則自動清除；若仍在停權期間則回傳 403。
func CheckSuspension() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := GetUserID(c)
		if !ok {
			c.Next()
			return
		}

		var user model.User
		if err := database.DB.Select("id, suspended_until, suspend_reason").
			First(&user, "id = ?", userID).Error; err != nil {
			c.Next()
			return
		}

		if user.SuspendedUntil == nil {
			c.Next()
			return
		}

		// 停權已到期 → 自動清除
		if time.Now().After(*user.SuspendedUntil) {
			database.DB.Model(&user).Updates(map[string]interface{}{
				"suspended_until": nil,
				"suspend_reason":  "",
			})
			c.Next()
			return
		}

		// 仍在停權期間 → 攔截
		c.JSON(403, gin.H{
			"success": false,
			"error": gin.H{
				"code":            "ACCOUNT_SUSPENDED",
				"message":         "帳號已暫時停權",
				"suspended_until": user.SuspendedUntil,
				"suspend_reason":  user.SuspendReason,
			},
		})
		c.Abort()
	}
}
