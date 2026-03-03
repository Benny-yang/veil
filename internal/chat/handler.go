package chat

import (
	"encoding/json"
	"time"

	"github.com/benny-yang/veil-api/internal/middleware"
	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/pkg/database"
	"github.com/benny-yang/veil-api/pkg/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	txTimeoutDays map[string]int
}

func NewHandler(txTimeoutDays map[string]int) *Handler {
	return &Handler{txTimeoutDays: txTimeoutDays}
}

// GET /chats/zones
func (h *Handler) GetZoneChats(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	var participants []model.ChatParticipant
	database.DB.Where("user_id = ?", userID).Find(&participants)

	chatIDs := make([]string, len(participants))
	for i, p := range participants {
		chatIDs[i] = p.ChatID
	}

	var chats []model.Chat
	if len(chatIDs) > 0 {
		database.DB.Preload("Participants").Where("id IN ? AND type = ?", chatIDs, model.ChatTypeZone).Find(&chats)
	}
	response.OK(c, chats)
}

// GET /chats/dm
func (h *Handler) GetDMChats(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	var participants []model.ChatParticipant
	database.DB.Where("user_id = ?", userID).Find(&participants)

	chatIDs := make([]string, len(participants))
	for i, p := range participants {
		chatIDs[i] = p.ChatID
	}

	var chats []model.Chat
	if len(chatIDs) > 0 {
		database.DB.Preload("Participants").Where("id IN ? AND type = ?", chatIDs, model.ChatTypeDM).Find(&chats)
	}
	response.OK(c, chats)
}

// GET /chats/:chatId/messages
func (h *Handler) GetMessages(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	chatID := c.Param("chatId")

	if !h.isParticipant(userID, chatID) {
		response.Forbidden(c, "FORBIDDEN", "無此聊天室的存取權限")
		return
	}

	var messages []model.ChatMessage
	database.DB.Where("chat_id = ?", chatID).Order("created_at ASC").Limit(100).Find(&messages)

	for i := range messages {
		var profile model.UserProfile
		database.DB.Where("user_id = ?", messages[i].SenderID).First(&profile)
		messages[i].Sender = &profile
	}
	response.OK(c, messages)
}

type SendMessageRequest struct {
	Type     string  `json:"type" binding:"required,oneof=text image"`
	Content  string  `json:"content"`
	MediaURL *string `json:"media_url"`
}

// POST /chats/:chatId/messages
func (h *Handler) SendMessage(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	chatID := c.Param("chatId")

	if !h.isParticipant(userID, chatID) {
		response.Forbidden(c, "FORBIDDEN", "無此聊天室的存取權限")
		return
	}

	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	msg := model.ChatMessage{
		ChatID:   chatID,
		SenderID: userID,
		Type:     model.MessageType(req.Type),
		Content:  req.Content,
		MediaURL: req.MediaURL,
	}
	database.DB.Create(&msg)

	var profile model.UserProfile
	database.DB.Where("user_id = ?", userID).First(&profile)
	msg.Sender = &profile
	response.Created(c, msg)
}

// PATCH /chats/:chatId/read
func (h *Handler) MarkRead(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	chatID := c.Param("chatId")
	now := time.Now()
	database.DB.Model(&model.ChatParticipant{}).
		Where("chat_id = ? AND user_id = ?", chatID, userID).
		Update("last_read_at", now)
	response.NoContent(c)
}

// GET /chats/:chatId/transaction
func (h *Handler) GetTransaction(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	chatID := c.Param("chatId")

	if !h.isParticipant(userID, chatID) {
		response.Forbidden(c, "FORBIDDEN", "無此聊天室的存取權限")
		return
	}

	var chat model.Chat
	database.DB.First(&chat, "id = ?", chatID)

	var tx model.Transaction
	if err := database.DB.Where("application_id = ?", chat.ApplicationID).First(&tx).Error; err != nil {
		response.NotFound(c, "此聊天室無關聯交易")
		return
	}

	canReview := tx.Status == model.TxCompleted || h.isTimedOut(&tx)
	response.OK(c, gin.H{
		"transaction": tx,
		"can_review":  canReview,
	})
}

type UpdateTransactionRequest struct {
	Status string `json:"status" binding:"required,oneof=shipping received completed cancelled"`
}

// PATCH /chats/:chatId/transaction
func (h *Handler) UpdateTransaction(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	chatID := c.Param("chatId")

	if !h.isParticipant(userID, chatID) {
		response.Forbidden(c, "FORBIDDEN", "無此聊天室的存取權限")
		return
	}

	var req UpdateTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	var chat model.Chat
	database.DB.First(&chat, "id = ?", chatID)

	var tx model.Transaction
	database.DB.Where("application_id = ?", chat.ApplicationID).First(&tx)

	database.DB.Model(&tx).Updates(map[string]interface{}{
		"status":            req.Status,
		"status_updated_at": gorm.Expr("NOW()"),
	})
	response.NoContent(c)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func (h *Handler) isParticipant(userID, chatID string) bool {
	var count int64
	database.DB.Model(&model.ChatParticipant{}).
		Where("chat_id = ? AND user_id = ?", chatID, userID).Count(&count)
	return count > 0
}

func (h *Handler) isTimedOut(tx *model.Transaction) bool {
	days, ok := h.txTimeoutDays[string(tx.Status)]
	if !ok {
		return false
	}
	elapsed := time.Since(tx.StatusUpdatedAt).Hours() / 24
	return elapsed >= float64(days)
}

// GetTxTimeoutDays 從 system_configs 讀取超時設定
func GetTxTimeoutDays(defaultMap map[string]int) map[string]int {
	var cfg model.SystemConfig
	if err := database.DB.Where("`key` = ?", "tx_timeout_days").First(&cfg).Error; err != nil {
		return defaultMap
	}
	result := make(map[string]int)
	if err := json.Unmarshal([]byte(cfg.Value), &result); err != nil {
		return defaultMap
	}
	return result
}
