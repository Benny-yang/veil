package notifier

import (
	"log"

	"github.com/benny-yang/veil-api/internal/model"
	"gorm.io/gorm"
)

// Emit 建立一則通知並寫入資料庫。
// actorID 可為 nil（系統通知）。
// 若 actor 與接收者相同則不發送（避免自我通知）。
func Emit(db *gorm.DB, userID string, actorID *string, notifType model.NotificationType, targetID *string, targetType *string, message string) {
	if actorID != nil && *actorID == userID {
		return
	}
	notif := model.Notification{
		UserID:     userID,
		ActorID:    actorID,
		Type:       notifType,
		TargetID:   targetID,
		TargetType: targetType,
		Message:    message,
	}
	if err := db.Create(&notif).Error; err != nil {
		log.Printf("[notifier] Emit 失敗（type=%s, user=%s）: %v", notifType, userID, err)
	}
}
