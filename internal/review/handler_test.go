package review_test

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/benny-yang/veil-api/internal/middleware"
	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/internal/review"
	"github.com/benny-yang/veil-api/pkg/database"
	"github.com/benny-yang/veil-api/testutil"
	"github.com/gin-gonic/gin"
)

func TestMain(m *testing.M) {
	testutil.Setup(m)
}

// ── Helper ──────────────────────────────────────────────────────────────────

func newReviewRouter(t *testing.T) http.Handler {
	t.Helper()
	cfg := testutil.Config()
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// 超時設定：0 分鐘（立即超時，方便測試）
	txTimeoutDays := map[string]int{"pending": 0, "shipping": 0, "received": 0}
	h := review.NewHandler(txTimeoutDays)

	authMW := middleware.Auth(cfg.JWTSecret)
	r.POST("/transactions/:txId/review", authMW, h.CreateReview)

	return r
}

// createTestUsers 建立買家和賣家帳號，回傳 (buyerID, sellerID)
func createTestUsers(t *testing.T) (string, string) {
	t.Helper()

	buyer := model.User{Email: "buyer@test.com", PasswordHash: "hash"}
	database.DB.Create(&buyer)
	database.DB.Create(&model.UserProfile{
		UserID: buyer.ID, Username: "buyer_test", DisplayName: "Buyer",
		CreditScore: 50,
	})

	seller := model.User{Email: "seller@test.com", PasswordHash: "hash"}
	database.DB.Create(&seller)
	database.DB.Create(&model.UserProfile{
		UserID: seller.ID, Username: "seller_test", DisplayName: "Seller",
		CreditScore: 50,
	})

	return buyer.ID, seller.ID
}

// ── Tests ───────────────────────────────────────────────────────────────────

func TestCreateReview_SellerReviewsPendingTimeout_BuyerSuspended(t *testing.T) {
	testutil.TruncateAll(t)
	r := newReviewRouter(t)
	buyerID, sellerID := createTestUsers(t)

	// 建立超時的 pending 交易（status_updated_at 設為 10 分鐘前）
	tx := model.Transaction{
		ApplicationID:   "app-001",
		BuyerID:         buyerID,
		SellerID:        sellerID,
		Status:          model.TxPending,
		StatusUpdatedAt: time.Now().Add(-10 * time.Minute),
	}
	database.DB.Create(&tx)

	// 賣家評價
	token := testutil.GenerateTestToken(sellerID)
	body := map[string]interface{}{
		"stars":   2,
		"content": "買家未付款",
	}
	w := testutil.DoRequest(r, http.MethodPost, "/transactions/"+tx.ID+"/review", body, testutil.BearerHeader(token))

	if w.Code != http.StatusCreated {
		t.Fatalf("期望 201，得到 %d：%s", w.Code, w.Body.String())
	}

	// 驗證買家已被停權
	var buyer model.User
	database.DB.First(&buyer, "id = ?", buyerID)

	if buyer.SuspendedUntil == nil {
		t.Fatal("買家應該被停權但 suspended_until 為 nil")
	}
	if buyer.SuspendReason != "交易待付款超時未處理" {
		t.Errorf("停權原因不符，得到: %s", buyer.SuspendReason)
	}

	// 驗證停權時間約為 5 天後
	expectedUntil := time.Now().AddDate(0, 0, 5)
	diff := buyer.SuspendedUntil.Sub(expectedUntil)
	if diff > time.Minute || diff < -time.Minute {
		t.Errorf("停權時間偏差過大: %v", diff)
	}

	// 驗證信用分數已扣除（強制評價 2★ = -3 分）
	var profile model.UserProfile
	database.DB.Where("user_id = ?", buyerID).First(&profile)
	if profile.CreditScore != 47 {
		t.Errorf("期望信用分 47（強制 2★ = -3），得到 %d", profile.CreditScore)
	}

	// 驗證信用分數異動記錄
	var log model.CreditScoreLog
	database.DB.Where("user_id = ?", buyerID).First(&log)
	if log.Delta != -3 {
		t.Errorf("期望 delta -3，得到 %d", log.Delta)
	}

	// 驗證停權紀錄
	var suspLog model.SuspensionLog
	database.DB.Where("user_id = ?", buyerID).First(&suspLog)
	if suspLog.Days != 5 {
		t.Errorf("期望停權天數 5，得到 %d", suspLog.Days)
	}
	if suspLog.TransactionID == nil || *suspLog.TransactionID != tx.ID {
		t.Error("停權紀錄應關聯交易 ID")
	}
}

func TestCreateReview_BuyerReview_NoSuspension(t *testing.T) {
	testutil.TruncateAll(t)
	r := newReviewRouter(t)
	buyerID, sellerID := createTestUsers(t)

	// 建立超時的 pending 交易
	tx := model.Transaction{
		ApplicationID:   "app-002",
		BuyerID:         buyerID,
		SellerID:        sellerID,
		Status:          model.TxPending,
		StatusUpdatedAt: time.Now().Add(-10 * time.Minute),
	}
	database.DB.Create(&tx)

	// 買家評價（不應觸發停權）
	token := testutil.GenerateTestToken(buyerID)
	body := map[string]interface{}{
		"stars":   1,
		"content": "取消測試",
	}
	w := testutil.DoRequest(r, http.MethodPost, "/transactions/"+tx.ID+"/review", body, testutil.BearerHeader(token))

	if w.Code != http.StatusCreated {
		t.Fatalf("期望 201，得到 %d：%s", w.Code, w.Body.String())
	}

	// 驗證賣家沒有被停權
	var seller model.User
	database.DB.First(&seller, "id = ?", sellerID)
	if seller.SuspendedUntil != nil {
		t.Error("賣家不應被停權")
	}

	// 驗證買家也沒有被停權（買家自己評價不會停權自己）
	var buyer model.User
	database.DB.First(&buyer, "id = ?", buyerID)
	if buyer.SuspendedUntil != nil {
		t.Error("買家自己評價不應觸發停權")
	}
}

func TestCreateReview_ShippingTimeout_NoSuspension(t *testing.T) {
	testutil.TruncateAll(t)
	r := newReviewRouter(t)
	buyerID, sellerID := createTestUsers(t)

	// 建立超時的 shipping 交易（不是 pending，不應觸發停權）
	tx := model.Transaction{
		ApplicationID:   "app-003",
		BuyerID:         buyerID,
		SellerID:        sellerID,
		Status:          model.TxShipping,
		StatusUpdatedAt: time.Now().Add(-10 * time.Minute),
	}
	database.DB.Create(&tx)

	// 賣家評價
	token := testutil.GenerateTestToken(sellerID)
	body := map[string]interface{}{
		"stars":   2,
		"content": "出貨超時",
	}
	w := testutil.DoRequest(r, http.MethodPost, "/transactions/"+tx.ID+"/review", body, testutil.BearerHeader(token))

	if w.Code != http.StatusCreated {
		t.Fatalf("期望 201，得到 %d：%s", w.Code, w.Body.String())
	}

	// 驗證買家沒有被停權（非 pending 超時）
	var buyer model.User
	database.DB.First(&buyer, "id = ?", buyerID)
	if buyer.SuspendedUntil != nil {
		t.Error("shipping 超時不應觸發買家停權")
	}
}

func TestSuspensionMiddleware_BlocksSuspendedUser(t *testing.T) {
	testutil.TruncateAll(t)
	cfg := testutil.Config()
	gin.SetMode(gin.TestMode)
	r := gin.New()

	authMW := middleware.Auth(cfg.JWTSecret)
	suspMW := middleware.CheckSuspension()

	r.GET("/protected", authMW, suspMW, func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// 建立被停權的用戶
	suspendUntil := time.Now().Add(24 * time.Hour)
	user := model.User{
		Email:          "suspended@test.com",
		PasswordHash:   "hash",
		SuspendedUntil: &suspendUntil,
		SuspendReason:  "交易待付款超時未處理",
	}
	database.DB.Create(&user)
	database.DB.Create(&model.UserProfile{
		UserID: user.ID, Username: "suspended_user", DisplayName: "Suspended",
	})

	token := testutil.GenerateTestToken(user.ID)
	w := testutil.DoRequest(r, http.MethodGet, "/protected", nil, testutil.BearerHeader(token))

	if w.Code != http.StatusForbidden {
		t.Fatalf("期望 403，得到 %d：%s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	errBody := resp["error"].(map[string]interface{})
	if errBody["code"] != "ACCOUNT_SUSPENDED" {
		t.Errorf("期望 ACCOUNT_SUSPENDED，得到 %v", errBody["code"])
	}
}

func TestSuspensionMiddleware_ExpiredSuspension_AutoClears(t *testing.T) {
	testutil.TruncateAll(t)
	cfg := testutil.Config()
	gin.SetMode(gin.TestMode)
	r := gin.New()

	authMW := middleware.Auth(cfg.JWTSecret)
	suspMW := middleware.CheckSuspension()

	r.GET("/protected", authMW, suspMW, func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// 建立停權已到期的用戶
	expiredTime := time.Now().Add(-1 * time.Hour)
	user := model.User{
		Email:          "expired@test.com",
		PasswordHash:   "hash",
		SuspendedUntil: &expiredTime,
		SuspendReason:  "交易待付款超時未處理",
	}
	database.DB.Create(&user)
	database.DB.Create(&model.UserProfile{
		UserID: user.ID, Username: "expired_user", DisplayName: "Expired",
	})

	token := testutil.GenerateTestToken(user.ID)
	w := testutil.DoRequest(r, http.MethodGet, "/protected", nil, testutil.BearerHeader(token))

	if w.Code != http.StatusOK {
		t.Fatalf("期望 200（停權已到期），得到 %d：%s", w.Code, w.Body.String())
	}

	// 驗證停權已自動清除
	var updated model.User
	database.DB.First(&updated, "id = ?", user.ID)
	if updated.SuspendedUntil != nil {
		t.Error("停權到期後應自動清除 suspended_until")
	}
	if updated.SuspendReason != "" {
		t.Errorf("停權到期後 suspend_reason 應清空，得到: %s", updated.SuspendReason)
	}
}

func TestCreateReview_TimeoutStarsExceeded_Rejected(t *testing.T) {
	testutil.TruncateAll(t)
	r := newReviewRouter(t)
	buyerID, sellerID := createTestUsers(t)

	// 建立超時的 pending 交易
	tx := model.Transaction{
		ApplicationID:   "app-004",
		BuyerID:         buyerID,
		SellerID:        sellerID,
		Status:          model.TxPending,
		StatusUpdatedAt: time.Now().Add(-10 * time.Minute),
	}
	database.DB.Create(&tx)

	// 賣家嘗試給 3 星（超過上限 2 星）
	token := testutil.GenerateTestToken(sellerID)
	body := map[string]interface{}{
		"stars":   3,
		"content": "想給 3 星",
	}
	w := testutil.DoRequest(r, http.MethodPost, "/transactions/"+tx.ID+"/review", body, testutil.BearerHeader(token))

	if w.Code != http.StatusBadRequest {
		t.Fatalf("期望 400，得到 %d：%s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	errBody := resp["error"].(map[string]interface{})
	if errBody["code"] != "STARS_EXCEEDED" {
		t.Errorf("期望 STARS_EXCEEDED，得到 %v", errBody["code"])
	}
}
