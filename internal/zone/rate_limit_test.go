package zone_test

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/benny-yang/veil-api/internal/middleware"
	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/internal/zone"
	"github.com/benny-yang/veil-api/pkg/database"
	"github.com/benny-yang/veil-api/testutil"
	"github.com/gin-gonic/gin"
)

func TestMain(m *testing.M) {
	testutil.Setup(m)
}

// ── Helpers ─────────────────────────────────────────────────────────────────

func newZoneRouter(t *testing.T) http.Handler {
	t.Helper()
	cfg := testutil.Config()
	gin.SetMode(gin.TestMode)
	r := gin.New()

	h := zone.NewHandler(5, 10) // 建立上限 5、申請上限 10

	authMW := middleware.Auth(cfg.JWTSecret)
	r.POST("/zones", authMW, h.CreateZone)
	r.POST("/zones/:zoneId/apply", authMW, h.Apply)

	return r
}

func createUser(t *testing.T, email, username string) string {
	t.Helper()
	user := model.User{Email: email, PasswordHash: "hash"}
	database.DB.Create(&user)
	database.DB.Create(&model.UserProfile{
		UserID: user.ID, Username: username, DisplayName: username,
		CreditScore: 50,
	})
	return user.ID
}

func verifyUser(t *testing.T, userID string) {
	t.Helper()
	database.DB.Create(&model.UserVerification{
		UserID:   userID,
		Type:     model.VerificationTypeRealPerson,
		Status:   model.VerificationVerified,
		Platform: strPtr("test"),
	})
}

func strPtr(s string) *string { return &s }

func createZoneForUser(t *testing.T, userID string) string {
	t.Helper()
	z := model.Zone{
		SellerID:   userID,
		Title:      "測試私藏",
		TotalSlots: 3,
		Category:   model.ZoneCategoryOther,
	}
	database.DB.Create(&z)
	return z.ID
}

func createApplicationForUser(t *testing.T, userID, zoneID string) {
	t.Helper()
	database.DB.Create(&model.ZoneApplication{
		ZoneID:      zoneID,
		ApplicantID: userID,
		Intro:       "想加入",
		AppliedAt:   time.Now(),
	})
}

func assertResponseCode(t *testing.T, label string, got, want int, body string) {
	t.Helper()
	if got != want {
		t.Fatalf("[%s] 期望 %d，得到 %d：%s", label, want, got, body)
	}
}

func assertErrorCode(t *testing.T, label string, body []byte, wantCode string) {
	t.Helper()
	var resp map[string]interface{}
	json.Unmarshal(body, &resp)
	errBody, ok := resp["error"].(map[string]interface{})
	if !ok {
		t.Fatalf("[%s] 回應中沒有 error 物件", label)
	}
	if errBody["code"] != wantCode {
		t.Errorf("[%s] 期望 error code %q，得到 %v", label, wantCode, errBody["code"])
	}
}

// ── Tests: 建立私藏限制（月度 5 次）─────────────────────────────────────────

func TestMonthlyLimit_UnverifiedCreateZone_ExceedsLimit(t *testing.T) {
	testutil.TruncateAll(t)
	r := newZoneRouter(t)
	userID := createUser(t, "unverified@test.com", "unverified_user")

	for i := 0; i < 5; i++ {
		createZoneForUser(t, userID)
	}

	token := testutil.GenerateTestToken(userID)
	body := map[string]interface{}{"title": "第六個私藏", "total_slots": 1}
	w := testutil.DoRequest(r, http.MethodPost, "/zones", body, testutil.BearerHeader(token))

	assertResponseCode(t, "未驗證用戶第6次建立", w.Code, http.StatusTooManyRequests, w.Body.String())
	assertErrorCode(t, "未驗證用戶第6次建立", w.Body.Bytes(), "MONTHLY_LIMIT_EXCEEDED")
}

func TestMonthlyLimit_VerifiedCreateZone_NoLimit(t *testing.T) {
	testutil.TruncateAll(t)
	r := newZoneRouter(t)
	userID := createUser(t, "verified@test.com", "verified_user")
	verifyUser(t, userID)

	for i := 0; i < 5; i++ {
		createZoneForUser(t, userID)
	}

	token := testutil.GenerateTestToken(userID)
	body := map[string]interface{}{"title": "第六個私藏", "total_slots": 1}
	w := testutil.DoRequest(r, http.MethodPost, "/zones", body, testutil.BearerHeader(token))

	assertResponseCode(t, "已驗證用戶第6次建立", w.Code, http.StatusCreated, w.Body.String())
}

func TestMonthlyLimit_CrossMonth_Resets(t *testing.T) {
	testutil.TruncateAll(t)
	r := newZoneRouter(t)
	userID := createUser(t, "crossmonth@test.com", "crossmonth_user")

	lastMonth := time.Now().AddDate(0, -1, 0)
	for i := 0; i < 5; i++ {
		zoneID := createZoneForUser(t, userID)
		database.DB.Model(&model.Zone{}).Where("id = ?", zoneID).Update("created_at", lastMonth)
	}

	token := testutil.GenerateTestToken(userID)
	body := map[string]interface{}{"title": "本月第一個", "total_slots": 1}
	w := testutil.DoRequest(r, http.MethodPost, "/zones", body, testutil.BearerHeader(token))

	assertResponseCode(t, "跨月重置後建立", w.Code, http.StatusCreated, w.Body.String())
}

// ── Tests: 申請限制（月度申請 10 次）────────────────────────────────────────

func TestMonthlyLimit_UnverifiedApply_ExceedsLimit(t *testing.T) {
	testutil.TruncateAll(t)
	r := newZoneRouter(t)

	sellerID := createUser(t, "seller@test.com", "seller_user")
	buyerID := createUser(t, "buyer@test.com", "buyer_user")

	targetZone := model.Zone{
		SellerID: sellerID, Title: "目標私藏", TotalSlots: 20,
		Category: model.ZoneCategoryOther,
	}
	database.DB.Create(&targetZone)

	// 預先建立 10 筆申請（達到上限）
	for i := 0; i < 10; i++ {
		dummyZone := model.Zone{
			SellerID: sellerID, Title: "dummy", TotalSlots: 1,
			Category: model.ZoneCategoryOther,
		}
		database.DB.Create(&dummyZone)
		createApplicationForUser(t, buyerID, dummyZone.ID)
	}

	// 第 11 次申請 → 429
	token := testutil.GenerateTestToken(buyerID)
	body := map[string]interface{}{"intro": "想加入"}
	w := testutil.DoRequest(r, http.MethodPost, "/zones/"+targetZone.ID+"/apply", body, testutil.BearerHeader(token))

	assertResponseCode(t, "未驗證用戶第11次申請", w.Code, http.StatusTooManyRequests, w.Body.String())
	assertErrorCode(t, "未驗證用戶第11次申請", w.Body.Bytes(), "MONTHLY_LIMIT_EXCEEDED")
}

func TestMonthlyLimit_UnverifiedApply_UnderLimit_OK(t *testing.T) {
	testutil.TruncateAll(t)
	r := newZoneRouter(t)

	sellerID := createUser(t, "seller3@test.com", "seller_user3")
	buyerID := createUser(t, "buyer3@test.com", "buyer_user3")

	targetZone := model.Zone{
		SellerID: sellerID, Title: "目標私藏", TotalSlots: 10,
		Category: model.ZoneCategoryOther,
	}
	database.DB.Create(&targetZone)

	// 只有 5 筆申請（未達 10 次上限）
	for i := 0; i < 5; i++ {
		dummyZone := model.Zone{
			SellerID: sellerID, Title: "dummy", TotalSlots: 1,
			Category: model.ZoneCategoryOther,
		}
		database.DB.Create(&dummyZone)
		createApplicationForUser(t, buyerID, dummyZone.ID)
	}

	token := testutil.GenerateTestToken(buyerID)
	body := map[string]interface{}{"intro": "想加入"}
	w := testutil.DoRequest(r, http.MethodPost, "/zones/"+targetZone.ID+"/apply", body, testutil.BearerHeader(token))

	assertResponseCode(t, "未驗證用戶+5筆申請可繼續", w.Code, http.StatusCreated, w.Body.String())
}

func TestMonthlyLimit_VerifiedApply_NoLimit(t *testing.T) {
	testutil.TruncateAll(t)
	r := newZoneRouter(t)

	sellerID := createUser(t, "seller2@test.com", "seller_user2")
	buyerID := createUser(t, "buyer2@test.com", "buyer_user2")
	verifyUser(t, buyerID)

	targetZone := model.Zone{
		SellerID: sellerID, Title: "目標私藏", TotalSlots: 20,
		Category: model.ZoneCategoryOther,
	}
	database.DB.Create(&targetZone)

	for i := 0; i < 10; i++ {
		dummyZone := model.Zone{
			SellerID: sellerID, Title: "dummy", TotalSlots: 1,
			Category: model.ZoneCategoryOther,
		}
		database.DB.Create(&dummyZone)
		createApplicationForUser(t, buyerID, dummyZone.ID)
	}

	token := testutil.GenerateTestToken(buyerID)
	body := map[string]interface{}{"intro": "想加入"}
	w := testutil.DoRequest(r, http.MethodPost, "/zones/"+targetZone.ID+"/apply", body, testutil.BearerHeader(token))

	assertResponseCode(t, "已驗證用戶+10筆申請可繼續", w.Code, http.StatusCreated, w.Body.String())
}
