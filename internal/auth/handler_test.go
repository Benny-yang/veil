package auth_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/benny-yang/veil-api/internal/auth"
	"github.com/benny-yang/veil-api/internal/middleware"
	"github.com/benny-yang/veil-api/testutil"
	"github.com/gin-gonic/gin"
)

// ── 測試用 Router ─────────────────────────────────────────────────────────────

func newAuthRouter(t *testing.T) http.Handler {
	t.Helper()
	cfg := testutil.Config()
	gin.SetMode(gin.TestMode)
	r := gin.New()

	h := auth.NewHandler(
		cfg.JWTSecret,
		cfg.JWTExpiryHours,
		cfg.JWTRefreshExpiryDays,
		nil, // emailSvc: 測試環境不發信
		cfg.AppBaseURL,
	)

	authMW := middleware.Auth(cfg.JWTSecret)

	g := r.Group("/auth")
	g.POST("/register", h.Register)
	g.POST("/login", h.Login)
	g.POST("/refresh", h.Refresh)
	g.GET("/me", authMW, h.Me)

	return r
}

// ── TestMain：初始化測試 DB ───────────────────────────────────────────────────

func TestMain(m *testing.M) {
	testutil.Setup(m)
}

// ── Register ──────────────────────────────────────────────────────────────────

func TestRegister_Success(t *testing.T) {
	testutil.TruncateAll(t)
	r := newAuthRouter(t)

	body := map[string]string{
		"email":        "alice@example.com",
		"password":     "password123",
		"username":     "alice",
		"display_name": "Alice",
	}
	w := testutil.DoRequest(r, http.MethodPost, "/auth/register", body, nil)

	if w.Code != http.StatusOK {
		t.Fatalf("期望 200，得到 %d：%s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	data, ok := resp["data"].(map[string]interface{})
	if !ok {
		t.Fatal("回應中缺少 data 欄位")
	}
	if data["access_token"] == "" {
		t.Error("access_token 不應為空")
	}
	if data["refresh_token"] == "" {
		t.Error("refresh_token 不應為空")
	}
}

func TestRegister_DuplicateEmail(t *testing.T) {
	testutil.TruncateAll(t)
	r := newAuthRouter(t)

	body := map[string]string{
		"email":        "dup@example.com",
		"password":     "password123",
		"username":     "dup_user",
		"display_name": "Dup",
	}
	// 第一次：成功
	testutil.DoRequest(r, http.MethodPost, "/auth/register", body, nil)

	// 第二次：相同 email，換不同 username
	body["username"] = "dup_user2"
	w := testutil.DoRequest(r, http.MethodPost, "/auth/register", body, nil)

	if w.Code != http.StatusConflict {
		t.Fatalf("期望 409，得到 %d：%s", w.Code, w.Body.String())
	}
}

func TestRegister_DuplicateUsername(t *testing.T) {
	testutil.TruncateAll(t)
	r := newAuthRouter(t)

	body := map[string]string{
		"email":        "user1@example.com",
		"password":     "password123",
		"username":     "common_name",
		"display_name": "User1",
	}
	// 第一次：成功
	testutil.DoRequest(r, http.MethodPost, "/auth/register", body, nil)

	// 第二次：相同 username，換不同 email
	body["email"] = "user2@example.com"
	w := testutil.DoRequest(r, http.MethodPost, "/auth/register", body, nil)

	if w.Code != http.StatusConflict {
		t.Fatalf("期望 409，得到 %d：%s", w.Code, w.Body.String())
	}
}

func TestRegister_PasswordTooShort(t *testing.T) {
	testutil.TruncateAll(t)
	r := newAuthRouter(t)

	body := map[string]string{
		"email":        "short@example.com",
		"password":     "1234567", // 只有 7 位
		"username":     "shortpw",
		"display_name": "Short",
	}
	w := testutil.DoRequest(r, http.MethodPost, "/auth/register", body, nil)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("期望 400，得到 %d：%s", w.Code, w.Body.String())
	}
}

func TestRegister_InvalidUsername(t *testing.T) {
	testutil.TruncateAll(t)
	r := newAuthRouter(t)

	body := map[string]string{
		"email":        "invalid@example.com",
		"password":     "password123",
		"username":     "invalid user!", // 含空格與特殊符號
		"display_name": "Invalid",
	}
	w := testutil.DoRequest(r, http.MethodPost, "/auth/register", body, nil)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("期望 400，得到 %d：%s", w.Code, w.Body.String())
	}
}

// ── Login ─────────────────────────────────────────────────────────────────────

func TestLogin_Success(t *testing.T) {
	testutil.TruncateAll(t)
	r := newAuthRouter(t)

	// 先建立帳號
	registerBody := map[string]string{
		"email":        "login@example.com",
		"password":     "password123",
		"username":     "loginuser",
		"display_name": "Login User",
	}
	testutil.DoRequest(r, http.MethodPost, "/auth/register", registerBody, nil)

	// 登入
	loginBody := map[string]string{
		"email":    "login@example.com",
		"password": "password123",
	}
	w := testutil.DoRequest(r, http.MethodPost, "/auth/login", loginBody, nil)

	if w.Code != http.StatusOK {
		t.Fatalf("期望 200，得到 %d：%s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	data := resp["data"].(map[string]interface{})
	if data["access_token"] == "" {
		t.Error("access_token 不應為空")
	}
}

func TestLogin_WrongPassword(t *testing.T) {
	testutil.TruncateAll(t)
	r := newAuthRouter(t)

	registerBody := map[string]string{
		"email":        "wrongpw@example.com",
		"password":     "correctpassword",
		"username":     "wrongpwuser",
		"display_name": "WrongPW",
	}
	testutil.DoRequest(r, http.MethodPost, "/auth/register", registerBody, nil)

	loginBody := map[string]string{
		"email":    "wrongpw@example.com",
		"password": "wrongpassword",
	}
	w := testutil.DoRequest(r, http.MethodPost, "/auth/login", loginBody, nil)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("期望 401，得到 %d：%s", w.Code, w.Body.String())
	}
}

func TestLogin_EmailNotFound(t *testing.T) {
	testutil.TruncateAll(t)
	r := newAuthRouter(t)

	loginBody := map[string]string{
		"email":    "notexist@example.com",
		"password": "password123",
	}
	w := testutil.DoRequest(r, http.MethodPost, "/auth/login", loginBody, nil)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("期望 401，得到 %d：%s", w.Code, w.Body.String())
	}
}

// ── Refresh ───────────────────────────────────────────────────────────────────

func TestRefresh_Success(t *testing.T) {
	testutil.TruncateAll(t)
	r := newAuthRouter(t)

	// 取得初始 tokens
	registerBody := map[string]string{
		"email":        "refresh@example.com",
		"password":     "password123",
		"username":     "refreshuser",
		"display_name": "Refresh",
	}
	w := testutil.DoRequest(r, http.MethodPost, "/auth/register", registerBody, nil)

	var regResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &regResp)
	data := regResp["data"].(map[string]interface{})
	refreshToken := data["refresh_token"].(string)

	// 換新 token
	refreshBody := map[string]string{"refresh_token": refreshToken}
	w2 := testutil.DoRequest(r, http.MethodPost, "/auth/refresh", refreshBody, nil)

	if w2.Code != http.StatusOK {
		t.Fatalf("期望 200，得到 %d：%s", w2.Code, w2.Body.String())
	}
}

func TestRefresh_WithAccessToken(t *testing.T) {
	testutil.TruncateAll(t)
	r := newAuthRouter(t)

	// 取得 access token
	registerBody := map[string]string{
		"email":        "refbad@example.com",
		"password":     "password123",
		"username":     "refbaduser",
		"display_name": "RefBad",
	}
	w := testutil.DoRequest(r, http.MethodPost, "/auth/register", registerBody, nil)

	var regResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &regResp)
	data := regResp["data"].(map[string]interface{})
	accessToken := data["access_token"].(string) // 用 access token 去換，應失敗

	refreshBody := map[string]string{"refresh_token": accessToken}
	w2 := testutil.DoRequest(r, http.MethodPost, "/auth/refresh", refreshBody, nil)

	if w2.Code != http.StatusUnauthorized {
		t.Fatalf("期望 401，得到 %d：%s", w2.Code, w2.Body.String())
	}
}

// ── Me ────────────────────────────────────────────────────────────────────────

func TestMe_Authorized(t *testing.T) {
	testutil.TruncateAll(t)
	r := newAuthRouter(t)

	registerBody := map[string]string{
		"email":        "me@example.com",
		"password":     "password123",
		"username":     "meuser",
		"display_name": "Me User",
	}
	w := testutil.DoRequest(r, http.MethodPost, "/auth/register", registerBody, nil)

	var regResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &regResp)
	accessToken := regResp["data"].(map[string]interface{})["access_token"].(string)

	w2 := testutil.DoRequest(r, http.MethodGet, "/auth/me", nil, testutil.BearerHeader(accessToken))

	if w2.Code != http.StatusOK {
		t.Fatalf("期望 200，得到 %d：%s", w2.Code, w2.Body.String())
	}
}

func TestMe_Unauthorized(t *testing.T) {
	testutil.TruncateAll(t)
	r := newAuthRouter(t)

	w := testutil.DoRequest(r, http.MethodGet, "/auth/me", nil, nil)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("期望 401，得到 %d：%s", w.Code, w.Body.String())
	}
}
