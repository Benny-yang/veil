package user_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/benny-yang/veil-api/internal/auth"
	"github.com/benny-yang/veil-api/internal/middleware"
	userhandler "github.com/benny-yang/veil-api/internal/user"
	"github.com/benny-yang/veil-api/testutil"
	"github.com/gin-gonic/gin"
)

func TestMain(m *testing.M) {
	testutil.Setup(m)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func newUserRouter(t *testing.T) http.Handler {
	t.Helper()
	cfg := testutil.Config()
	gin.SetMode(gin.TestMode)
	r := gin.New()

	authH := auth.NewHandler(cfg.JWTSecret, cfg.JWTExpiryHours, cfg.JWTRefreshExpiryDays, nil, cfg.AppBaseURL)
	userH := userhandler.NewHandler()
	authMW := middleware.Auth(cfg.JWTSecret)

	// Auth（用於建立測試帳號）
	r.POST("/auth/register", authH.Register)
	r.POST("/auth/login", authH.Login)

	// User（公開）
	r.GET("/users/:username", userH.GetProfile)
	r.GET("/users/:username/followers", userH.GetFollowers)
	r.GET("/users/:username/following", userH.GetFollowing)

	// User（需登入）
	authed := r.Group("/", authMW)
	authed.GET("/users/me", userH.GetMe)
	authed.PATCH("/users/me", userH.UpdateMe)
	authed.POST("/users/:username/follow", userH.Follow)
	authed.DELETE("/users/:username/follow", userH.Unfollow)

	return r
}

// registerUser 建立測試帳號並回傳 access token
func registerUser(t *testing.T, r http.Handler, email, username, displayName string) string {
	t.Helper()
	body := map[string]string{
		"email":        email,
		"password":     "password123",
		"username":     username,
		"display_name": displayName,
	}
	w := testutil.DoRequest(r, http.MethodPost, "/auth/register", body, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("registerUser 失敗：%s", w.Body.String())
	}
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	return resp["data"].(map[string]interface{})["access_token"].(string)
}

// ── GetProfile ────────────────────────────────────────────────────────────────

func TestGetProfile_Found(t *testing.T) {
	testutil.TruncateAll(t)
	r := newUserRouter(t)
	registerUser(t, r, "profile@example.com", "profileuser", "Profile User")

	w := testutil.DoRequest(r, http.MethodGet, "/users/profileuser", nil, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("期望 200，得到 %d：%s", w.Code, w.Body.String())
	}
}

func TestGetProfile_NotFound(t *testing.T) {
	testutil.TruncateAll(t)
	r := newUserRouter(t)

	w := testutil.DoRequest(r, http.MethodGet, "/users/nonexistent", nil, nil)
	if w.Code != http.StatusNotFound {
		t.Fatalf("期望 404，得到 %d：%s", w.Code, w.Body.String())
	}
}

// ── GetMe ─────────────────────────────────────────────────────────────────────

func TestGetMe_Authorized(t *testing.T) {
	testutil.TruncateAll(t)
	r := newUserRouter(t)
	token := registerUser(t, r, "getme@example.com", "getmeuser", "GetMe")

	w := testutil.DoRequest(r, http.MethodGet, "/users/me", nil, testutil.BearerHeader(token))
	if w.Code != http.StatusOK {
		t.Fatalf("期望 200，得到 %d：%s", w.Code, w.Body.String())
	}
}

// ── UpdateMe ──────────────────────────────────────────────────────────────────

func TestUpdateMe_DisplayName(t *testing.T) {
	testutil.TruncateAll(t)
	r := newUserRouter(t)
	token := registerUser(t, r, "update@example.com", "updateuser", "Old Name")

	body := map[string]string{"display_name": "New Name"}
	w := testutil.DoRequest(r, http.MethodPatch, "/users/me", body, testutil.BearerHeader(token))
	if w.Code != http.StatusOK {
		t.Fatalf("期望 200，得到 %d：%s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	data := resp["data"].(map[string]interface{})
	if data["display_name"] != "New Name" {
		t.Errorf("display_name 未更新：%v", data["display_name"])
	}
}

func TestUpdateMe_NoChanges(t *testing.T) {
	testutil.TruncateAll(t)
	r := newUserRouter(t)
	token := registerUser(t, r, "nochange@example.com", "nochangeuser", "No Change")

	body := map[string]string{} // 空 body，無可更新欄位
	w := testutil.DoRequest(r, http.MethodPatch, "/users/me", body, testutil.BearerHeader(token))
	if w.Code != http.StatusBadRequest {
		t.Fatalf("期望 400，得到 %d：%s", w.Code, w.Body.String())
	}
}

// ── Follow / Unfollow ─────────────────────────────────────────────────────────

func TestFollow_Success(t *testing.T) {
	testutil.TruncateAll(t)
	r := newUserRouter(t)
	aliceToken := registerUser(t, r, "alice@example.com", "alice", "Alice")
	registerUser(t, r, "bob@example.com", "bob", "Bob")

	w := testutil.DoRequest(r, http.MethodPost, "/users/bob/follow", nil, testutil.BearerHeader(aliceToken))
	if w.Code != http.StatusNoContent {
		t.Fatalf("期望 204，得到 %d：%s", w.Code, w.Body.String())
	}
}

func TestFollow_SelfFollow(t *testing.T) {
	testutil.TruncateAll(t)
	r := newUserRouter(t)
	aliceToken := registerUser(t, r, "alice2@example.com", "alice2", "Alice2")

	w := testutil.DoRequest(r, http.MethodPost, "/users/alice2/follow", nil, testutil.BearerHeader(aliceToken))
	if w.Code != http.StatusBadRequest {
		t.Fatalf("期望 400，得到 %d：%s", w.Code, w.Body.String())
	}
}

func TestFollow_Duplicate(t *testing.T) {
	testutil.TruncateAll(t)
	r := newUserRouter(t)
	aliceToken := registerUser(t, r, "alice3@example.com", "alice3", "Alice3")
	registerUser(t, r, "bob3@example.com", "bob3", "Bob3")

	testutil.DoRequest(r, http.MethodPost, "/users/bob3/follow", nil, testutil.BearerHeader(aliceToken))
	w := testutil.DoRequest(r, http.MethodPost, "/users/bob3/follow", nil, testutil.BearerHeader(aliceToken))
	if w.Code != http.StatusConflict {
		t.Fatalf("期望 409，得到 %d：%s", w.Code, w.Body.String())
	}
}

func TestUnfollow_Success(t *testing.T) {
	testutil.TruncateAll(t)
	r := newUserRouter(t)
	aliceToken := registerUser(t, r, "alice4@example.com", "alice4", "Alice4")
	registerUser(t, r, "bob4@example.com", "bob4", "Bob4")

	testutil.DoRequest(r, http.MethodPost, "/users/bob4/follow", nil, testutil.BearerHeader(aliceToken))
	w := testutil.DoRequest(r, http.MethodDelete, "/users/bob4/follow", nil, testutil.BearerHeader(aliceToken))
	if w.Code != http.StatusNoContent {
		t.Fatalf("期望 204，得到 %d：%s", w.Code, w.Body.String())
	}
}

func TestUnfollow_NotFollowing(t *testing.T) {
	testutil.TruncateAll(t)
	r := newUserRouter(t)
	aliceToken := registerUser(t, r, "alice5@example.com", "alice5", "Alice5")
	registerUser(t, r, "bob5@example.com", "bob5", "Bob5")

	// 未追蹤直接取消
	w := testutil.DoRequest(r, http.MethodDelete, "/users/bob5/follow", nil, testutil.BearerHeader(aliceToken))
	if w.Code != http.StatusNotFound {
		t.Fatalf("期望 404，得到 %d：%s", w.Code, w.Body.String())
	}
}

// ── GetFollowers / GetFollowing ───────────────────────────────────────────────

func TestGetFollowers(t *testing.T) {
	testutil.TruncateAll(t)
	r := newUserRouter(t)
	aliceToken := registerUser(t, r, "alice6@example.com", "alice6", "Alice6")
	registerUser(t, r, "bob6@example.com", "bob6", "Bob6")

	// Alice 追蹤 Bob
	testutil.DoRequest(r, http.MethodPost, "/users/bob6/follow", nil, testutil.BearerHeader(aliceToken))

	// Bob 的 followers 應含 Alice
	w := testutil.DoRequest(r, http.MethodGet, "/users/bob6/followers", nil, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("期望 200，得到 %d：%s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	followers := resp["data"].([]interface{})
	if len(followers) != 1 {
		t.Errorf("期望 1 個 follower，得到 %d", len(followers))
	}
}
