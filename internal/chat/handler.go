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

		// 補填每位參與者的 Profile（gorm:"-" 需手動查詢）
		for i := range chats {
			for j := range chats[i].Participants {
				var profile model.UserProfile
				if err := database.DB.Where("user_id = ?", chats[i].Participants[j].UserID).First(&profile).Error; err == nil {
					chats[i].Participants[j].Profile = &profile
				}
			}
		}
	}
	response.OK(c, chats)
}

type CreateDMRequest struct {
	Username string `json:"username" binding:"required"`
}

// POST /chats/dm
func (h *Handler) CreateDM(c *gin.Context) {
	myID, _ := middleware.GetUserID(c)

	var req CreateDMRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	// 查詢對方 user_id
	var profile model.UserProfile
	if err := database.DB.Where("username = ?", req.Username).First(&profile).Error; err != nil {
		response.NotFound(c, "找不到此用戶")
		return
	}
	peerID := profile.UserID
	if peerID == myID {
		response.BadRequest(c, "INVALID", "不能與自己建立私訊")
		return
	}

	// 查看是否已有 DM
	var myParticipants []model.ChatParticipant
	database.DB.Where("user_id = ?", myID).Find(&myParticipants)
	myIDs := make([]string, len(myParticipants))
	for i, p := range myParticipants {
		myIDs[i] = p.ChatID
	}

	if len(myIDs) > 0 {
		var existingParticipant model.ChatParticipant
		if err := database.DB.
			Joins("JOIN chats ON chats.id = chat_participants.chat_id").
			Where("chat_participants.user_id = ? AND chat_participants.chat_id IN ? AND chats.type = ?", peerID, myIDs, model.ChatTypeDM).
			First(&existingParticipant).Error; err == nil {
			var chat model.Chat
			database.DB.Preload("Participants").First(&chat, "id = ?", existingParticipant.ChatID)
			response.OK(c, chat)
			return
		}
	}

	// 建立新 DM（放入 Transaction 確保原子性）
	var newChat model.Chat
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		newChat = model.Chat{Type: model.ChatTypeDM}
		if err := tx.Create(&newChat).Error; err != nil {
			return err
		}
		if err := tx.Create(&model.ChatParticipant{ChatID: newChat.ID, UserID: myID}).Error; err != nil {
			return err
		}
		return tx.Create(&model.ChatParticipant{ChatID: newChat.ID, UserID: peerID}).Error
	})
	if err != nil {
		response.InternalError(c)
		return
	}

	database.DB.Preload("Participants").First(&newChat, "id = ?", newChat.ID)
	response.Created(c, newChat)
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

	// 批次撈 sender profile（避免 N+1）
	senderIDs := make([]string, 0, len(messages))
	seen := map[string]bool{}
	for _, m := range messages {
		if !seen[m.SenderID] {
			senderIDs = append(senderIDs, m.SenderID)
			seen[m.SenderID] = true
		}
	}
	profileMap := make(map[string]*model.UserProfile)
	if len(senderIDs) > 0 {
		var profiles []model.UserProfile
		database.DB.Where("user_id IN ?", senderIDs).Find(&profiles)
		for i := range profiles {
			profileMap[profiles[i].UserID] = &profiles[i]
		}
	}
	for i := range messages {
		messages[i].Sender = profileMap[messages[i].SenderID]
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
	if err := database.DB.Where("application_id = ?", chat.ApplicationID).First(&tx).Error; err != nil {
		response.NotFound(c, "此聊天室無關聯交易")
		return
	}

	newStatus := model.TransactionStatus(req.Status)
	isBuyer := tx.BuyerID == userID
	isSeller := tx.SellerID == userID

	// 狀態機：驗證轉移合法性與角色權限
	if !isValidTransition(tx.Status, newStatus, isBuyer, isSeller) {
		response.UnprocessableEntity(c, "INVALID_TRANSITION",
			"不允許的狀態轉移："+string(tx.Status)+" → "+string(newStatus))
		return
	}

	database.DB.Model(&tx).Updates(map[string]interface{}{
		"status":            newStatus,
		"status_updated_at": gorm.Expr("NOW()"),
	})
	response.NoContent(c)
}

// isValidTransition 驗證交易狀態轉移是否合法
// pending  → shipping   (僅 seller)
// shipping → received   (僅 buyer)
// received → completed  (buyer 或 seller)
// pending/shipping/received → cancelled (buyer 或 seller)
func isValidTransition(from, to model.TransactionStatus, isBuyer, isSeller bool) bool {
	switch {
	case from == model.TxPending && to == model.TxShipping:
		return isSeller
	case from == model.TxShipping && to == model.TxReceived:
		return isBuyer
	case from == model.TxReceived && to == model.TxCompleted:
		return isBuyer || isSeller
	case to == model.TxCancelled && (from == model.TxPending || from == model.TxShipping || from == model.TxReceived):
		return isBuyer || isSeller
	default:
		return false
	}
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func (h *Handler) isParticipant(userID, chatID string) bool {
	var count int64
	database.DB.Model(&model.ChatParticipant{}).
		Where("chat_id = ? AND user_id = ?", chatID, userID).Count(&count)
	return count > 0
}

// isTimedOut：map 的值單位為分鐘（測試模式 = 5 分鐘）
func (h *Handler) isTimedOut(tx *model.Transaction) bool {
	minutes, ok := h.txTimeoutDays[string(tx.Status)]
	if !ok {
		return false
	}
	elapsed := time.Since(tx.StatusUpdatedAt).Minutes()
	return elapsed >= float64(minutes)
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
