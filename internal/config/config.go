package config

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config 儲存所有環境設定
type Config struct {
	AppEnv     string
	AppPort    string
	AppBaseURL string

	// 資料庫
	DBHost         string
	DBPort         string
	DBUser         string
	DBPassword     string
	DBName         string
	DBMaxOpenConns int
	DBMaxIdleConns int

	// JWT
	JWTSecret            string
	JWTExpiryHours       int
	JWTRefreshExpiryDays int

	// Email (Resend)
	ResendAPIKey string
	EmailFrom    string

	// GCP Storage
	GCSBucketName string
	GCSProjectID  string

	// CORS
	CORSAllowedOrigins string

	// 信用分數
	CreditScoreInit int
	CreditScoreMax  int

	// 交易超時天數
	TxTimeoutDays map[string]int
}

// Load 讀取指定環境的 .env 檔案
func Load() (*Config, error) {
	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "development"
	}

	envFile := fmt.Sprintf(".env.%s", env)
	if err := godotenv.Load(envFile); err != nil {
		// 若找不到指定環境檔，嘗試讀取 .env
		_ = godotenv.Load(".env")
	}

	// NOTE: 對應 chat/review handler 中的分鐘制（測試模式 = 5 分鐘）
	txTimeoutDays := map[string]int{
		"pending":  5,
		"shipping": 5,
		"received": 5,
	}
	if raw := os.Getenv("TX_TIMEOUT_DAYS"); raw != "" {
		_ = json.Unmarshal([]byte(raw), &txTimeoutDays)
	}

	cfg := &Config{
		AppEnv:               getEnv("APP_ENV", "development"),
		AppPort:              getEnv("APP_PORT", "8080"),
		AppBaseURL:           getEnv("APP_BASE_URL", "http://localhost:8080"),
		DBHost:               getEnv("DB_HOST", "127.0.0.1"),
		DBPort:               getEnv("DB_PORT", "3306"),
		DBUser:               getEnv("DB_USER", "root"),
		DBPassword:           getEnv("DB_PASSWORD", ""),
		DBName:               getEnv("DB_NAME", "veil_dev"),
		DBMaxOpenConns:       getEnvInt("DB_MAX_OPEN_CONNS", 10),
		DBMaxIdleConns:       getEnvInt("DB_MAX_IDLE_CONNS", 5),
		JWTSecret:            getEnv("JWT_SECRET", ""),
		JWTExpiryHours:       getEnvInt("JWT_EXPIRY_HOURS", 24),
		JWTRefreshExpiryDays: getEnvInt("JWT_REFRESH_EXPIRY_DAYS", 30),
		ResendAPIKey:         getEnv("RESEND_API_KEY", ""),
		EmailFrom:            getEnv("EMAIL_FROM", "noreply@veil.tw"),
		GCSBucketName:        getEnv("GCS_BUCKET_NAME", ""),
		GCSProjectID:         getEnv("GCS_PROJECT_ID", ""),
		CORSAllowedOrigins:   getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173"),
		CreditScoreInit:      getEnvInt("CREDIT_SCORE_INIT", 60),
		CreditScoreMax:       getEnvInt("CREDIT_SCORE_MAX", 100),
		TxTimeoutDays:        txTimeoutDays,
	}

	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET 未設定，請檢查 .env.%s", env)
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}
