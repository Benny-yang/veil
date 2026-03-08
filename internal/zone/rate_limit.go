package zone

import (
	"time"

	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/pkg/database"
)

const (
	defaultMonthlyCreateLimit = 5
	defaultMonthlyApplyLimit  = 10
)

// MonthlyLimitConfig 月度操作限制設定
type MonthlyLimitConfig struct {
	CreateLimit int
	ApplyLimit  int
}

// isRealPersonVerified 檢查使用者是否已通過真人驗證
func isRealPersonVerified(userID string) bool {
	var count int64
	database.DB.Model(&model.UserVerification{}).
		Where("user_id = ? AND type = ? AND status = ?",
			userID,
			model.VerificationTypeRealPerson,
			model.VerificationVerified,
		).Count(&count)
	return count > 0
}

// beginOfMonth 取得本自然月的起始時間（每月 1 日 00:00 Local）
func beginOfMonth() time.Time {
	now := time.Now()
	return time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
}

// countMonthlyZoneCreations 計算本自然月內該使用者建立的 Zone 數量
func countMonthlyZoneCreations(userID string) int64 {
	var count int64
	database.DB.Model(&model.Zone{}).
		Where("seller_id = ? AND created_at >= ?", userID, beginOfMonth()).
		Count(&count)
	return count
}

// countMonthlyZoneApplications 計算本自然月內該使用者的申請數量
func countMonthlyZoneApplications(userID string) int64 {
	var count int64
	database.DB.Model(&model.ZoneApplication{}).
		Where("applicant_id = ? AND applied_at >= ?", userID, beginOfMonth()).
		Count(&count)
	return count
}

// CheckCreateLimit 檢查建立私藏的月度限制
// 回傳 true 表示已達上限
func (cfg *MonthlyLimitConfig) CheckCreateLimit(userID string) bool {
	if isRealPersonVerified(userID) {
		return false
	}
	limit := cfg.CreateLimit
	if limit <= 0 {
		limit = defaultMonthlyCreateLimit
	}
	return countMonthlyZoneCreations(userID) >= int64(limit)
}

// CheckApplyLimit 檢查申請加入的月度限制（以申請次數計算）
// 回傳 true 表示已達上限
func (cfg *MonthlyLimitConfig) CheckApplyLimit(userID string) bool {
	if isRealPersonVerified(userID) {
		return false
	}
	limit := cfg.ApplyLimit
	if limit <= 0 {
		limit = defaultMonthlyApplyLimit
	}
	return countMonthlyZoneApplications(userID) >= int64(limit)
}
