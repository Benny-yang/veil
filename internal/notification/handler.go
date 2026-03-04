package notification

import (
	"github.com/benny-yang/veil-api/internal/middleware"
	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/pkg/database"
	"github.com/benny-yang/veil-api/pkg/response"
	"github.com/gin-gonic/gin"
)

type Handler struct{}

func NewHandler() *Handler { return &Handler{} }

// GET /notifications
// 取得目前登入者最新 50 筆通知，並附上 actor 的 profile。
func (h *Handler) List(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	var notifs []model.Notification
	if err := database.DB.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(50).
		Find(&notifs).Error; err != nil {
		// DB 錯誤仍回傳空陣列，讓前端優雅降級
		response.OK(c, []model.Notification{})
		return
	}

	// 批次載入 actor 的 profile
	actorIDs := make([]string, 0, len(notifs))
	seen := map[string]bool{}
	for _, n := range notifs {
		if n.ActorID != nil && !seen[*n.ActorID] {
			actorIDs = append(actorIDs, *n.ActorID)
			seen[*n.ActorID] = true
		}
	}

	profileMap := map[string]*model.UserProfile{}
	if len(actorIDs) > 0 {
		var profiles []model.UserProfile
		database.DB.Where("user_id IN ?", actorIDs).Find(&profiles)
		for i := range profiles {
			profileMap[profiles[i].UserID] = &profiles[i]
		}
	}

	for i := range notifs {
		if notifs[i].ActorID != nil {
			notifs[i].Actor = profileMap[*notifs[i].ActorID]
		}
	}

	response.OK(c, notifs)
}

// PATCH /notifications/:id/read — 標記單筆已讀
func (h *Handler) MarkRead(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	id := c.Param("id")

	database.DB.Model(&model.Notification{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("read", true)

	response.NoContent(c)
}

// PATCH /notifications/read-all — 全部已讀
func (h *Handler) MarkReadAll(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	database.DB.Model(&model.Notification{}).
		Where("user_id = ? AND read = false", userID).
		Update("read", true)

	response.NoContent(c)
}
