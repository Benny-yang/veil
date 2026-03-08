package media

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"cloud.google.com/go/storage"
	"github.com/benny-yang/veil-api/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler 支援本地檔案系統與 GCS 雲端儲存兩種模式
type Handler struct {
	uploadDir string          // 本地上傳目錄
	baseURL   string          // 本地模式的 base URL
	gcsBucket string          // GCS bucket name（空字串 = 本地模式）
	gcsClient *storage.Client // GCS client（nil = 本地模式）
}

// NewHandler 建立 media handler
// 若 gcsBucket 不為空，則使用 GCS 雲端儲存；否則使用本地檔案系統
func NewHandler(uploadDir, baseURL, gcsBucket string) *Handler {
	h := &Handler{
		uploadDir: uploadDir,
		baseURL:   baseURL,
		gcsBucket: gcsBucket,
	}

	if gcsBucket != "" {
		client, err := storage.NewClient(context.Background())
		if err != nil {
			log.Printf("⚠️ GCS client 建立失敗，將使用本地儲存: %v", err)
			h.gcsBucket = ""
		} else {
			h.gcsClient = client
			log.Printf("✅ GCS 儲存已啟用 [bucket: %s]", gcsBucket)
		}
	} else {
		os.MkdirAll(uploadDir, 0755)
		log.Printf("📁 使用本地儲存 [%s]", uploadDir)
	}

	return h
}

var allowedMIME = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
	"image/gif":  ".gif",
}

// Upload 處理圖片上傳
// POST /media/upload
// Content-Type: multipart/form-data, field: "file"
func (h *Handler) Upload(c *gin.Context) {
	if err := c.Request.ParseMultipartForm(10 << 20); err != nil {
		response.BadRequest(c, "FILE_TOO_LARGE", "圖片大小不能超過 10 MB")
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		response.BadRequest(c, "FILE_REQUIRED", "請選擇要上傳的圖片（field: file）")
		return
	}
	defer file.Close()

	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	mimeType := http.DetectContentType(buf[:n])

	ext, ok := allowedMIME[mimeType]
	if !ok {
		response.BadRequest(c, "INVALID_FILE_TYPE", "僅支援 jpeg / png / webp / gif 格式")
		return
	}

	dateDir := time.Now().Format("2006/01/02")
	filename := uuid.New().String() + ext

	var urlPath string

	if h.isGCSEnabled() {
		urlPath, err = h.uploadToGCS(buf[:n], file, dateDir, filename, mimeType)
	} else {
		urlPath, err = h.uploadToLocal(buf[:n], file, dateDir, filename)
	}

	if err != nil {
		log.Printf("圖片上傳失敗: %v", err)
		response.InternalError(c)
		return
	}

	response.OK(c, gin.H{
		"url":      urlPath,
		"filename": filename,
		"size":     header.Size,
		"type":     mimeType,
	})
}

// isGCSEnabled 檢查是否使用 GCS 模式
func (h *Handler) isGCSEnabled() bool {
	return h.gcsBucket != "" && h.gcsClient != nil
}

// uploadToGCS 上傳檔案到 GCS
func (h *Handler) uploadToGCS(headBytes []byte, remaining io.Reader, dateDir, filename, mimeType string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	objectName := fmt.Sprintf("uploads/%s/%s", dateDir, filename)
	writer := h.gcsClient.Bucket(h.gcsBucket).Object(objectName).NewWriter(ctx)
	writer.ContentType = mimeType
	writer.CacheControl = "public, max-age=31536000"

	if _, err := writer.Write(headBytes); err != nil {
		writer.Close()
		return "", fmt.Errorf("GCS 寫入 header 失敗: %w", err)
	}
	if _, err := io.Copy(writer, remaining); err != nil {
		writer.Close()
		return "", fmt.Errorf("GCS 寫入內容失敗: %w", err)
	}
	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("GCS 關閉 writer 失敗: %w", err)
	}

	publicURL := fmt.Sprintf("https://storage.googleapis.com/%s/%s", h.gcsBucket, objectName)
	return publicURL, nil
}

// uploadToLocal 上傳檔案到本地檔案系統
func (h *Handler) uploadToLocal(headBytes []byte, remaining io.Reader, dateDir, filename string) (string, error) {
	dir := filepath.Join(h.uploadDir, dateDir)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("建立目錄失敗: %w", err)
	}

	destPath := filepath.Join(dir, filename)
	dst, err := os.Create(destPath)
	if err != nil {
		return "", fmt.Errorf("建立檔案失敗: %w", err)
	}
	defer dst.Close()

	if _, err := dst.Write(headBytes); err != nil {
		return "", fmt.Errorf("寫入 header 失敗: %w", err)
	}
	if _, err := io.Copy(dst, remaining); err != nil {
		return "", fmt.Errorf("寫入內容失敗: %w", err)
	}

	urlPath := fmt.Sprintf("%s/uploads/%s/%s", h.baseURL, dateDir, filename)
	return urlPath, nil
}
