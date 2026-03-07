package scheduler

import (
	"log"
	"time"

	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/pkg/database"
)

// TODO: 正式環境請改回 7*24*time.Hour / 6*24*time.Hour / 1*time.Minute
const (
	autoCompleteThreshold = 1 * time.Minute  // 正式: 7 * 24 * time.Hour
	reminderThreshold     = 30 * time.Second // 正式: 6 * 24 * time.Hour
	scanInterval          = 15 * time.Second // 正式: 1 * time.Minute
)

// Start 啟動背景排程，定期掃描逾時交易
func Start() {
	ticker := time.NewTicker(scanInterval)
	go func() {
		log.Println("[排程] 背景排程已啟動，掃描間隔:", scanInterval)
		for range ticker.C {
			autoCompleteExpiredTransactions()
			sendExpirationReminders()
		}
	}()
}

// autoCompleteExpiredTransactions 自動完成 received 超過 7 天的交易
func autoCompleteExpiredTransactions() {
	cutoff := time.Now().Add(-autoCompleteThreshold)

	var transactions []model.Transaction
	result := database.DB.
		Where("status = ? AND status_updated_at < ?", model.TxReceived, cutoff).
		Find(&transactions)

	if result.Error != nil {
		log.Printf("[排程] 查詢逾時交易失敗: %v", result.Error)
		return
	}

	for _, tx := range transactions {
		completeTransaction(tx)
	}
}

// completeTransaction 自動完成單筆交易並發送通知
func completeTransaction(tx model.Transaction) {
	err := database.DB.Model(&tx).Updates(map[string]interface{}{
		"status":            model.TxCompleted,
		"status_updated_at": time.Now(),
	}).Error
	if err != nil {
		log.Printf("[排程] 自動完成交易 %s 失敗: %v", tx.ID, err)
		return
	}

	log.Printf("[排程] 交易 %s 已自動完成（超過 %v 未確認收貨）", tx.ID, autoCompleteThreshold)

	// 通知買家
	database.DB.Create(&model.Notification{
		UserID:  tx.BuyerID,
		Type:    model.NotifTxUpdate,
		Message: "交易已自動完成（超過 7 天未確認收貨）。如有問題請聯繫客服。",
	})

	// 通知賣家
	database.DB.Create(&model.Notification{
		UserID:  tx.SellerID,
		Type:    model.NotifTxUpdate,
		Message: "交易已自動完成，感謝您的參與！",
	})

	// 發送聊天室系統訊息
	sendSystemChatMessage(tx, "🎉 交易已自動完成（買家超過 7 天未確認收貨）")
}

// sendExpirationReminders 發送即將自動完成的提醒（received 超過 6 天但未超過 7 天）
func sendExpirationReminders() {
	reminderCutoff := time.Now().Add(-reminderThreshold)
	autoCompleteCutoff := time.Now().Add(-autoCompleteThreshold)

	var transactions []model.Transaction
	result := database.DB.
		Where("status = ? AND status_updated_at < ? AND status_updated_at >= ?",
			model.TxReceived, reminderCutoff, autoCompleteCutoff).
		Find(&transactions)

	if result.Error != nil {
		log.Printf("[排程] 查詢提醒交易失敗: %v", result.Error)
		return
	}

	for _, tx := range transactions {
		// 檢查是否已發送過提醒（避免重複）
		var count int64
		database.DB.Model(&model.Notification{}).
			Where("user_id = ? AND type = ? AND message LIKE ? AND created_at > ?",
				tx.BuyerID, model.NotifTxUpdate, "%即將自動完成%",
				reminderCutoff).
			Count(&count)

		if count > 0 {
			continue // 已發送過提醒
		}

		database.DB.Create(&model.Notification{
			UserID:  tx.BuyerID,
			Type:    model.NotifTxUpdate,
			Message: "您有一筆交易即將自動完成，請盡快確認收貨或回報問題。",
		})
		log.Printf("[排程] 已發送提醒通知給買家 %s（交易 %s）", tx.BuyerID, tx.ID)
	}
}

// sendSystemChatMessage 在交易關聯的聊天室發送系統訊息
func sendSystemChatMessage(tx model.Transaction, content string) {
	// 透過 application_id 找到關聯的 chat
	var chat model.Chat
	if err := database.DB.Where("application_id = ?", tx.ApplicationID).First(&chat).Error; err != nil {
		log.Printf("[排程] 找不到交易 %s 的聊天室: %v", tx.ID, err)
		return
	}

	database.DB.Create(&model.ChatMessage{
		ChatID:   chat.ID,
		SenderID: "system",
		Type:     "system",
		Content:  content,
	})
}
