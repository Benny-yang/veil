package main

import (
	"log"
	"net/http"
	"path/filepath"

	"github.com/benny-yang/veil-api/internal/auth"
	chathandler "github.com/benny-yang/veil-api/internal/chat"
	"github.com/benny-yang/veil-api/internal/config"
	"github.com/benny-yang/veil-api/internal/credit"
	"github.com/benny-yang/veil-api/internal/email"
	"github.com/benny-yang/veil-api/internal/media"
	"github.com/benny-yang/veil-api/internal/middleware"
	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/internal/post"
	"github.com/benny-yang/veil-api/internal/review"
	userhandler "github.com/benny-yang/veil-api/internal/user"
	"github.com/benny-yang/veil-api/internal/work"
	"github.com/benny-yang/veil-api/internal/zone"
	"github.com/benny-yang/veil-api/pkg/database"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
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
		&model.User{},
		&model.UserProfile{},
		&model.UserVerification{},
		&model.Follow{},
		&model.Tag{},
		&model.Work{},
		&model.WorkPhoto{},
		&model.Post{},
		&model.PostImage{},
		&model.PostLike{},
		&model.PostComment{},
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
	); err != nil {
		log.Fatalf("AutoMigrate 失敗: %v", err)
	}
	log.Println("✅ 資料表 AutoMigrate 完成")

	// 初始化 system_configs 預設值
	initSystemConfigs(cfg)

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
		AllowOrigins:     []string{cfg.CORSAllowedOrigins},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Handlers
	authH := auth.NewHandler(cfg.JWTSecret, cfg.JWTExpiryHours, cfg.JWTRefreshExpiryDays, emailSvc, baseURL)
	userH := userhandler.NewHandler()
	workH := work.NewHandler()
	postH := post.NewHandler()
	zoneH := zone.NewHandler()
	chatH := chathandler.NewHandler(txTimeoutDays)
	reviewH := review.NewHandler(txTimeoutDays)
	creditH := credit.NewHandler()

	authMW := middleware.Auth(cfg.JWTSecret)

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

		// Posts（公開）
		api.GET("/feed", postH.GetFeed)
		api.GET("/posts/:postId", postH.GetPost)
		api.GET("/posts/:postId/comments", postH.GetComments)

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

			// Posts
			auth.POST("/posts", postH.CreatePost)
			auth.DELETE("/posts/:postId", postH.DeletePost)
			auth.POST("/posts/:postId/like", postH.LikePost)
			auth.DELETE("/posts/:postId/like", postH.UnlikePost)
			auth.POST("/posts/:postId/comments", postH.CreateComment)
			auth.DELETE("/posts/:postId/comments/:commentId", postH.DeleteComment)

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

			// Chats
			auth.GET("/chats/zones", chatH.GetZoneChats)
			auth.GET("/chats/dm", chatH.GetDMChats)
			auth.GET("/chats/:chatId/messages", chatH.GetMessages)
			auth.POST("/chats/:chatId/messages", chatH.SendMessage)
			auth.PATCH("/chats/:chatId/read", chatH.MarkRead)
			auth.GET("/chats/:chatId/transaction", chatH.GetTransaction)
			auth.PATCH("/chats/:chatId/transaction", chatH.UpdateTransaction)

			// Reviews
			auth.POST("/transactions/:txId/review", reviewH.CreateReview)

			// Media
			auth.POST("/media/upload", mediaH.Upload)
		}
	}

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
			Value:       `{"pending":3,"shipping":10,"received":5}`,
			Description: "各交易狀態的超時天數（超時後可評價）",
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
