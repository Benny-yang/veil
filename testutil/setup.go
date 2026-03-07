// Package testutil 提供整合測試的共用基礎設施。
// 使用真實 MySQL（veil_test 資料庫），不使用任何 mock。
package testutil

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"testing"
	"time"

	"github.com/benny-yang/veil-api/internal/config"
	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/pkg/database"
	"github.com/golang-jwt/jwt/v5"
)

var (
	once   sync.Once
	testDB *config.Config
)

// Setup 初始化測試資料庫，每個測試套件呼叫一次即可（TestMain）。
// 執行 AutoMigrate 確保 schema 最新。
func Setup(m *testing.M) int {
	once.Do(func() {
		// 找到 veil-api 根目錄（testutil/ 的上一層）
		_, filename, _, _ := runtime.Caller(0)
		root := filepath.Join(filepath.Dir(filename), "..")

		// 設定 APP_ENV=test，讓 config.Load() 讀取 .env.test
		os.Setenv("APP_ENV", "test")

		// 切換到根目錄，讓 godotenv 能找到 .env.test
		if err := os.Chdir(root); err != nil {
			log.Fatalf("testutil: 無法切換工作目錄: %v", err)
		}

		cfg, err := config.Load()
		if err != nil {
			log.Fatalf("testutil: config.Load 失敗: %v", err)
		}
		testDB = cfg

		if err := database.Init(cfg); err != nil {
			log.Fatalf("testutil: 資料庫初始化失敗: %v", err)
		}

		if err := database.DB.AutoMigrate(
			&model.User{},
			&model.UserProfile{},
			&model.UserVerification{},
			&model.Follow{},
			&model.Tag{},
			&model.Work{},
			&model.WorkPhoto{},
			&model.Zone{},
			&model.ZonePhoto{},
			&model.ZoneApplication{},
			&model.Transaction{},
			&model.Review{},
			&model.Chat{},
			&model.ChatParticipant{},
			&model.ChatMessage{},
			&model.CreditScoreLog{},
			&model.SuspensionLog{},
			&model.SystemConfig{},
			&model.PasswordResetToken{},
			&model.Notification{},
		); err != nil {
			log.Fatalf("testutil: AutoMigrate 失敗: %v", err)
		}

		log.Printf("✅ 測試資料庫 [%s] 初始化完成", cfg.DBName)
	})

	return m.Run()
}

// Config 回傳已載入的測試設定。
func Config() *config.Config {
	if testDB == nil {
		panic("testutil: 必須先呼叫 Setup()")
	}
	return testDB
}

// TruncateAll 清空所有業務資料表（保留 schema），讓每個測試互不影響。
// 需在每個測試開始前呼叫。
func TruncateAll(t *testing.T) {
	t.Helper()
	db := database.DB

	tables := []string{
		"notifications",
		"password_reset_tokens",
		"suspension_logs",
		"credit_score_logs",
		"chat_messages",
		"chat_participants",
		"chats",
		"reviews",
		"transactions",
		"zone_applications",
		"zone_photos",
		"zones",
		"work_tags",
		"work_photos",
		"works",
		"follows",
		"tags",
		"user_verifications",
		"user_profiles",
		"users",
	}

	db.Exec("SET FOREIGN_KEY_CHECKS = 0")
	for _, table := range tables {
		if err := db.Exec(fmt.Sprintf("TRUNCATE TABLE `%s`", table)).Error; err != nil {
			// 若資料表不存在則略過
			t.Logf("testutil: 略過 TRUNCATE %s: %v", table, err)
		}
	}
	db.Exec("SET FOREIGN_KEY_CHECKS = 1")
}

// DoRequest 執行一個 HTTP 請求到指定的 http.Handler，並回傳 ResponseRecorder。
func DoRequest(handler http.Handler, method, path string, body interface{}, headers map[string]string) *httptest.ResponseRecorder {
	var req *http.Request
	if body != nil {
		b, _ := json.Marshal(body)
		req = httptest.NewRequest(method, path, bytes.NewReader(b))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, path, nil)
	}

	for k, v := range headers {
		req.Header.Set(k, v)
	}

	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	return w
}

// BearerHeader 產生帶 JWT 的 Authorization header。
func BearerHeader(token string) map[string]string {
	return map[string]string{
		"Authorization": "Bearer " + token,
	}
}

// GenerateTestToken 產生測試用的 JWT access token。
func GenerateTestToken(userID string) string {
	cfg := Config()
	claims := jwt.MapClaims{
		"sub":  userID,
		"type": "access",
		"exp":  time.Now().Add(time.Duration(cfg.JWTExpiryHours) * time.Hour).Unix(),
		"iat":  time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(cfg.JWTSecret))
	if err != nil {
		panic("testutil: 無法產生測試 token: " + err.Error())
	}
	return signed
}
