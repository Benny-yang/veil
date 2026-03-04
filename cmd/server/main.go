package main

import (
	"log"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/benny-yang/veil-api/internal/admin"
	"github.com/benny-yang/veil-api/internal/auth"
	chathandler "github.com/benny-yang/veil-api/internal/chat"
	"github.com/benny-yang/veil-api/internal/config"
	"github.com/benny-yang/veil-api/internal/credit"
	"github.com/benny-yang/veil-api/internal/email"
	"github.com/benny-yang/veil-api/internal/media"
	"github.com/benny-yang/veil-api/internal/middleware"
	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/internal/notification"
	"github.com/benny-yang/veil-api/internal/review"
	userhandler "github.com/benny-yang/veil-api/internal/user"
	"github.com/benny-yang/veil-api/internal/work"
	"github.com/benny-yang/veil-api/internal/zone"
	"github.com/benny-yang/veil-api/pkg/database"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("設定載入失敗: %v", err)
	}

	if err := database.Init(cfg); err != nil {
		log.Fatalf("資料庫初始化失敗: %v", err)
	}

	// AutoMigrate：自動建立 / 更新資料表
	if err := database.DB.AutoMigrate(
		&model.AdminUser{},
		&model.User{},
		&model.UserProfile{},
		&model.UserVerification{},
		&model.Follow{},
		&model.Tag{},
		&model.Work{},
		&model.WorkPhoto{},
		&model.WorkLike{},
		&model.WorkComment{},
		&model.Zone{},
		&model.ZonePhoto{},
		&model.ZoneApplication{},
		&model.Transaction{},
		&model.Review{},
		&model.Chat{},
		&model.ChatParticipant{},
		&model.ChatMessage{},
		&model.CreditScoreLog{},
		&model.SystemConfig{},
		&model.PasswordResetToken{},
		&model.Notification{},
	); err != nil {
		log.Fatalf("AutoMigrate 失敗: %v", err)
	}
	log.Println("✅ 資料表 AutoMigrate 完成")

	// 初始化 system_configs 預設值
	initSystemConfigs(cfg)

	// Seed 管理者帳號
	seedAdminUser(cfg)

	// 取得超時天數設定
	txTimeoutDays := chathandler.GetTxTimeoutDays(cfg.TxTimeoutDays)

	// Email + Media
	uploadDir := filepath.Join(".", "uploads")
	baseURL := cfg.AppBaseURL
	emailSvc := email.NewService(cfg.ResendAPIKey, cfg.EmailFrom, cfg.AppEnv)
	mediaH := media.NewHandler(uploadDir, baseURL)

	// ── Gin 路由設定 ─────────────────────────────────────────────────────────
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     strings.Split(cfg.CORSAllowedOrigins, ","),
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Handlers
	authH := auth.NewHandler(cfg.JWTSecret, cfg.JWTExpiryHours, cfg.JWTRefreshExpiryDays, emailSvc, baseURL)
	userH := userhandler.NewHandler()
	workH := work.NewHandler()
	zoneH := zone.NewHandler()
	chatH := chathandler.NewHandler(txTimeoutDays)
	reviewH := review.NewHandler(txTimeoutDays)
	creditH := credit.NewHandler()
	adminH := admin.NewHandler(cfg.AdminJWTSecret)
	notifH := notification.NewHandler()

	authMW := middleware.Auth(cfg.JWTSecret)
	adminMW := admin.Auth(cfg.AdminJWTSecret)

	// ── Public Routes ────────────────────────────────────────────────────────
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "env": cfg.AppEnv})
	})

	api := r.Group("/api/v1")
	{
		// Auth
		authGroup := api.Group("/auth")
		{
			authGroup.POST("/register", authH.Register)
			authGroup.POST("/login", authH.Login)
			authGroup.POST("/refresh", authH.Refresh)
			authGroup.POST("/logout", authMW, authH.Logout)
			authGroup.GET("/me", authMW, authH.Me)
			authGroup.POST("/password/reset-request", authH.PasswordResetRequest)
			authGroup.POST("/password/reset", authH.PasswordReset)
			authGroup.POST("/verify-email", authH.VerifyEmail)
			authGroup.POST("/resend-verification", authH.ResendVerification)

		}

		// Users（公開）
		api.GET("/users/:username", userH.GetProfile)
		api.GET("/users/:username/followers", userH.GetFollowers)
		api.GET("/users/:username/following", userH.GetFollowing)
		api.GET("/users/:username/works", workH.GetWorks)
		api.GET("/users/:username/reviews", reviewH.GetReviews)
		api.GET("/users/:username/credit", creditH.GetCredit)

		// Zones（公開）
		api.GET("/zones", zoneH.ListZones)
		api.GET("/zones/:zoneId", zoneH.GetZone)

		// Feed & Works（公開）
		api.GET("/feed", workH.GetFeed)
		api.GET("/works/:workId", workH.GetWork)
		api.GET("/works/:workId/comments", workH.GetWorkComments)

		// ── 需要登入 ────────────────────────────────────────────────────────
		auth := api.Group("/", authMW)
		{
			// 自己的資料
			auth.GET("/users/me", userH.GetMe)
			auth.PATCH("/users/me", userH.UpdateMe)
			auth.PUT("/users/me/avatar", userH.UpdateAvatar)
			auth.PATCH("/users/me/password", userH.ChangePassword)
			auth.POST("/users/me/onboarding", userH.CompleteOnboarding)

			// 驗證
			auth.GET("/users/me/verification/real-person", userH.GetVerification)
			auth.POST("/users/me/verification/real-person", userH.SubmitRealPersonVerification)

			// 追蹤
			auth.POST("/users/:username/follow", userH.Follow)
			auth.DELETE("/users/:username/follow", userH.Unfollow)

			// Works
			auth.POST("/users/me/works", workH.CreateWork)
			auth.PATCH("/works/:workId", workH.UpdateWork)
			auth.DELETE("/works/:workId", workH.DeleteWork)
			auth.POST("/works/:workId/like", workH.LikeWork)
			auth.DELETE("/works/:workId/like", workH.UnlikeWork)
			auth.POST("/works/:workId/comments", workH.AddComment)
			auth.DELETE("/works/:workId/comments/:commentId", workH.DeleteComment)

			// Zones（需登入）
			auth.GET("/users/me/zones", zoneH.GetMyZones)
			auth.POST("/zones", zoneH.CreateZone)
			auth.PATCH("/zones/:zoneId", zoneH.UpdateZone)
			auth.DELETE("/zones/:zoneId", zoneH.DeleteZone)

			// Applications
			auth.GET("/users/me/applications", zoneH.GetMyApplications)
			auth.POST("/zones/:zoneId/apply", zoneH.Apply)
			auth.DELETE("/zones/:zoneId/apply", zoneH.CancelApply)
			auth.GET("/zones/:zoneId/applications", zoneH.GetApplications)
			auth.PATCH("/zones/:zoneId/applications/:appId", zoneH.ReviewApplication)
			auth.POST("/zones/:zoneId/set-collector", zoneH.SetCollector)

			// Chats
			auth.GET("/chats/zones", chatH.GetZoneChats)
			auth.GET("/chats/dm", chatH.GetDMChats)
			auth.POST("/chats/dm", chatH.CreateDM)
			auth.GET("/chats/:chatId/messages", chatH.GetMessages)
			auth.POST("/chats/:chatId/messages", chatH.SendMessage)
			auth.PATCH("/chats/:chatId/read", chatH.MarkRead)
			auth.GET("/chats/:chatId/transaction", chatH.GetTransaction)
			auth.PATCH("/chats/:chatId/transaction", chatH.UpdateTransaction)

			// Notifications
			auth.GET("/notifications", notifH.List)
			auth.PATCH("/notifications/read-all", notifH.MarkReadAll)
			auth.PATCH("/notifications/:id/read", notifH.MarkRead)

			// Reviews
			auth.POST("/transactions/:txId/review", reviewH.CreateReview)

			// Media
			auth.POST("/media/upload", mediaH.Upload)
		}
	}

	// Admin 路由（獨立群組，使用 admin JWT）
	adminGroup := r.Group("/admin")
	{
		adminGroup.POST("/auth/login", adminH.Login)
		adminProtected := adminGroup.Group("/", adminMW)
		{
			adminProtected.GET("/stats", adminH.GetStats)
			adminProtected.GET("/zones", adminH.ListZones)
			adminProtected.GET("/zones/:zoneId/applications", adminH.GetZoneApplications)
			adminProtected.GET("/verifications", adminH.ListVerifications)
			adminProtected.PATCH("/verifications/:id", adminH.ReviewVerification)
		}
	}

	// Admin UI 靜態檔案服務（路徑由 ADMIN_UI_PATH 環境變數控制）
	adminUIPath := cfg.AdminUIPath
	adminDistDir := "./admin-dist"
	r.StaticFS(adminUIPath, http.Dir(adminDistDir))
	// SPA fallback：未知子路徑導回 index.html
	r.NoRoute(func(c *gin.Context) {
		p := c.Request.URL.Path
		if strings.HasPrefix(p, adminUIPath) {
			c.File(adminDistDir + "/index.html")
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
	})

	// 靜態檔案服務（上傳的圖片）
	r.StaticFS("/uploads", http.Dir(uploadDir))

	addr := ":" + cfg.AppPort
	log.Printf("🚀 Veil API [%s] 啟動於 %s", cfg.AppEnv, addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("伺服器啟動失敗: %v", err)
	}
}

func initSystemConfigs(cfg *config.Config) {
	defaultConfigs := []model.SystemConfig{
		{
			Key:         "tx_timeout_days",
			Value:       `{"pending":5,"shipping":5,"received":5}`,
			Description: "各交易狀態的超時分鐘數（測試模式 = 5 分鐘，正式環境請改為天數）",
		},
		{
			Key:         "credit_score_init",
			Value:       "50",
			Description: "新用戶初始信用分數",
		},
		{
			Key:         "credit_score_max",
			Value:       "100",
			Description: "信用分數上限",
		},
	}

	for _, c := range defaultConfigs {
		database.DB.Where(model.SystemConfig{Key: c.Key}).FirstOrCreate(&c)
	}
}

func seedAdminUser(cfg *config.Config) {
	var existing model.AdminUser
	err := database.DB.Where("username = ?", cfg.AdminUsername).First(&existing).Error
	if err == nil {
		return // 已存在，跳過
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(cfg.AdminPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("⚠️  管理者帳號建立失敗（bcrypt）: %v", err)
		return
	}
	admin := model.AdminUser{
		Username:     cfg.AdminUsername,
		PasswordHash: string(hash),
	}
	if err := database.DB.Create(&admin).Error; err != nil {
		log.Printf("⚠️  管理者帳號建立失敗（DB）: %v", err)
		return
	}
	log.Printf("✅ 管理者帳號已建立：%s", cfg.AdminUsername)
}
