// Package notifier_test 整合測試：使用真實 DB 驗證 Emit 行為。
package notifier_test

import (
	"testing"

	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/pkg/database"
	"github.com/benny-yang/veil-api/pkg/notifier"
	"github.com/benny-yang/veil-api/testutil"
)

func TestMain(m *testing.M) {
	testutil.Setup(m)
}

// TestEmit_Success 驗證以 actor != receiver 發送通知，DB 能查到一筆記錄。
func TestEmit_Success(t *testing.T) {
	testutil.TruncateAll(t)

	userID := "user-recv-001"
	actorID := "user-actor-001"
	targetID := "post-001"
	targetType := "post"

	// 預先建立最低限度的 User 記錄（Notification 有 user_id 欄位，但無外鍵約束）
	// 直接插入 Notification 即可

	notifier.Emit(
		database.DB,
		userID,
		&actorID,
		model.NotifLike,
		&targetID,
		&targetType,
		"對你的作品按讚",
	)

	var count int64
	database.DB.Model(&model.Notification{}).
		Where("user_id = ? AND type = ? AND actor_id = ?", userID, model.NotifLike, actorID).
		Count(&count)

	if count != 1 {
		t.Errorf("期望 1 筆通知，實際 %d 筆", count)
	}
}

// TestEmit_SkipSelf 當 actorID == userID，Emit 不應寫入通知。
func TestEmit_SkipSelf(t *testing.T) {
	testutil.TruncateAll(t)

	userID := "user-self-001"

	notifier.Emit(
		database.DB,
		userID,
		&userID, // actor = receiver → 應跳過
		model.NotifFollow,
		nil,
		nil,
		"追蹤了你",
	)

	var count int64
	database.DB.Model(&model.Notification{}).
		Where("user_id = ?", userID).
		Count(&count)

	if count != 0 {
		t.Errorf("自我通知應跳過，實際寫入 %d 筆", count)
	}
}

// TestEmit_SystemNotification 驗證系統通知（actorID = nil）可成功寫入。
func TestEmit_SystemNotification(t *testing.T) {
	testutil.TruncateAll(t)

	userID := "user-sys-001"

	notifier.Emit(
		database.DB,
		userID,
		nil, // 系統通知無 actor
		model.NotifZoneApprove,
		nil,
		nil,
		"你申請的私藏已通過審核",
	)

	var count int64
	database.DB.Model(&model.Notification{}).
		Where("user_id = ? AND type = ? AND actor_id IS NULL", userID, model.NotifZoneApprove).
		Count(&count)

	if count != 1 {
		t.Errorf("期望 1 筆系統通知，實際 %d 筆", count)
	}
}
