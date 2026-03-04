package work_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"github.com/benny-yang/veil-api/internal/auth"
	"github.com/benny-yang/veil-api/internal/middleware"
	"github.com/benny-yang/veil-api/internal/work"
	"github.com/benny-yang/veil-api/testutil"
	"github.com/gin-gonic/gin"
)

func TestMain(m *testing.M) {
	testutil.Setup(m)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func newWorkRouter(t *testing.T) http.Handler {
	t.Helper()
	cfg := testutil.Config()
	gin.SetMode(gin.TestMode)
	r := gin.New()

	authH := auth.NewHandler(cfg.JWTSecret, cfg.JWTExpiryHours, cfg.JWTRefreshExpiryDays, nil, cfg.AppBaseURL)
	workH := work.NewHandler()
	authMW := middleware.Auth(cfg.JWTSecret)

	r.POST("/auth/register", authH.Register)

	r.GET("/users/:username/works", workH.GetWorks)

	authed := r.Group("/", authMW)
	authed.POST("/users/me/works", workH.CreateWork)
	authed.PATCH("/works/:workId", workH.UpdateWork)
	authed.DELETE("/works/:workId", workH.DeleteWork)

	return r
}

func registerUser(t *testing.T, r http.Handler, email, username string) string {
	t.Helper()
	body := map[string]string{
		"email":        email,
		"password":     "password123",
		"username":     username,
		"display_name": username,
	}
	w := testutil.DoRequest(r, http.MethodPost, "/auth/register", body, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("registerUser 失敗：%s", w.Body.String())
	}
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	return resp["data"].(map[string]interface{})["access_token"].(string)
}

func createWork(t *testing.T, r http.Handler, token string) string {
	t.Helper()
	body := map[string]interface{}{
		"description": "測試作品 #tag1",
		"photos": []map[string]interface{}{
			{"url": "https://example.com/photo.jpg", "sort_order": 0, "is_cover": true},
		},
	}
	w := testutil.DoRequest(r, http.MethodPost, "/users/me/works", body, testutil.BearerHeader(token))
	if w.Code != http.StatusCreated {
		t.Fatalf("createWork 失敗：%s", w.Body.String())
	}
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	return resp["data"].(map[string]interface{})["id"].(string)
}

// ── CreateWork ────────────────────────────────────────────────────────────────

func TestCreateWork_Success(t *testing.T) {
	testutil.TruncateAll(t)
	r := newWorkRouter(t)
	token := registerUser(t, r, "work1@example.com", "work1user")

	body := map[string]interface{}{
		"description": "我的第一個作品 #handmade",
		"photos": []map[string]interface{}{
			{"url": "https://example.com/photo1.jpg", "sort_order": 0, "is_cover": true},
			{"url": "https://example.com/photo2.jpg", "sort_order": 1, "is_cover": false},
		},
	}
	w := testutil.DoRequest(r, http.MethodPost, "/users/me/works", body, testutil.BearerHeader(token))
	if w.Code != http.StatusCreated {
		t.Fatalf("期望 201，得到 %d：%s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	data := resp["data"].(map[string]interface{})
	if data["id"] == "" {
		t.Error("work id 不應為空")
	}
	photos := data["photos"].([]interface{})
	if len(photos) != 2 {
		t.Errorf("期望 2 張照片，得到 %d", len(photos))
	}
}

func TestCreateWork_MissingPhotos(t *testing.T) {
	testutil.TruncateAll(t)
	r := newWorkRouter(t)
	token := registerUser(t, r, "work2@example.com", "work2user")

	body := map[string]interface{}{
		"description": "沒有照片的作品",
		"photos":      []map[string]interface{}{}, // 空陣列
	}
	w := testutil.DoRequest(r, http.MethodPost, "/users/me/works", body, testutil.BearerHeader(token))
	if w.Code != http.StatusBadRequest {
		t.Fatalf("期望 400，得到 %d：%s", w.Code, w.Body.String())
	}
}

// ── GetWorks ──────────────────────────────────────────────────────────────────

func TestGetWorks(t *testing.T) {
	testutil.TruncateAll(t)
	r := newWorkRouter(t)
	token := registerUser(t, r, "work3@example.com", "work3user")

	createWork(t, r, token)
	createWork(t, r, token)

	w := testutil.DoRequest(r, http.MethodGet, "/users/work3user/works", nil, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("期望 200，得到 %d：%s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	works := resp["data"].([]interface{})
	if len(works) != 2 {
		t.Errorf("期望 2 個作品，得到 %d", len(works))
	}
}

// ── UpdateWork ────────────────────────────────────────────────────────────────

func TestUpdateWork_Success(t *testing.T) {
	testutil.TruncateAll(t)
	r := newWorkRouter(t)
	token := registerUser(t, r, "work4@example.com", "work4user")
	workID := createWork(t, r, token)

	body := map[string]interface{}{"description": "更新後的描述 #newtag"}
	w := testutil.DoRequest(r, http.MethodPatch, fmt.Sprintf("/works/%s", workID), body, testutil.BearerHeader(token))
	if w.Code != http.StatusOK {
		t.Fatalf("期望 200，得到 %d：%s", w.Code, w.Body.String())
	}
}

func TestUpdateWork_Forbidden(t *testing.T) {
	testutil.TruncateAll(t)
	r := newWorkRouter(t)
	ownerToken := registerUser(t, r, "work5a@example.com", "work5a")
	otherToken := registerUser(t, r, "work5b@example.com", "work5b")
	workID := createWork(t, r, ownerToken)

	body := map[string]interface{}{"description": "試圖修改他人作品"}
	w := testutil.DoRequest(r, http.MethodPatch, fmt.Sprintf("/works/%s", workID), body, testutil.BearerHeader(otherToken))
	if w.Code != http.StatusForbidden {
		t.Fatalf("期望 403，得到 %d：%s", w.Code, w.Body.String())
	}
}

// ── DeleteWork ────────────────────────────────────────────────────────────────

func TestDeleteWork_Success(t *testing.T) {
	testutil.TruncateAll(t)
	r := newWorkRouter(t)
	token := registerUser(t, r, "work6@example.com", "work6user")
	workID := createWork(t, r, token)

	w := testutil.DoRequest(r, http.MethodDelete, fmt.Sprintf("/works/%s", workID), nil, testutil.BearerHeader(token))
	if w.Code != http.StatusNoContent {
		t.Fatalf("期望 204，得到 %d：%s", w.Code, w.Body.String())
	}
}

func TestDeleteWork_Forbidden(t *testing.T) {
	testutil.TruncateAll(t)
	r := newWorkRouter(t)
	ownerToken := registerUser(t, r, "work7a@example.com", "work7a")
	otherToken := registerUser(t, r, "work7b@example.com", "work7b")
	workID := createWork(t, r, ownerToken)

	w := testutil.DoRequest(r, http.MethodDelete, fmt.Sprintf("/works/%s", workID), nil, testutil.BearerHeader(otherToken))
	if w.Code != http.StatusForbidden {
		t.Fatalf("期望 403，得到 %d：%s", w.Code, w.Body.String())
	}
}

func TestDeleteWork_NotFound(t *testing.T) {
	testutil.TruncateAll(t)
	r := newWorkRouter(t)
	token := registerUser(t, r, "work8@example.com", "work8user")

	w := testutil.DoRequest(r, http.MethodDelete, "/works/nonexistent-id", nil, testutil.BearerHeader(token))
	if w.Code != http.StatusNotFound {
		t.Fatalf("期望 404，得到 %d：%s", w.Code, w.Body.String())
	}
}
