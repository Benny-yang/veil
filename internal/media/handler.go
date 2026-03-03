package media

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/benny-yang/veil-api/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	uploadDir string
	baseURL   string
}

func NewHandler(uploadDir, baseURL string) *Handler {
	os.MkdirAll(uploadDir, 0755)
	return &Handler{uploadDir: uploadDir, baseURL: baseURL}
}

var allowedMIME = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
	"image/gif":  ".gif",
}

// POST /media/upload
// Content-Type: multipart/form-data, field: "file"
func (h *Handler) Upload(c *gin.Context) {
	// 限制解析大小 10 MB
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

	// 讀取前 512 bytes 偵測 MIME
	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	mimeType := http.DetectContentType(buf[:n])

	ext, ok := allowedMIME[mimeType]
	if !ok {
		response.BadRequest(c, "INVALID_FILE_TYPE", "僅支援 jpeg / png / webp / gif 格式")
		return
	}

	// 按日期建立目錄
	dateDir := time.Now().Format("2006/01/02")
	dir := filepath.Join(h.uploadDir, dateDir)
	if err := os.MkdirAll(dir, 0755); err != nil {
		response.InternalError(c)
		return
	}

	filename := uuid.New().String() + ext
	destPath := filepath.Join(dir, filename)

	dst, err := os.Create(destPath)
	if err != nil {
		response.InternalError(c)
		return
	}
	defer dst.Close()

	// 先把已讀的 512 bytes 寫入，再複製剩餘內容
	if _, err := dst.Write(buf[:n]); err != nil {
		response.InternalError(c)
		return
	}
	if _, err := io.Copy(dst, file); err != nil {
		response.InternalError(c)
		return
	}

	urlPath := fmt.Sprintf("%s/uploads/%s/%s", h.baseURL, dateDir, filename)
	response.OK(c, gin.H{
		"url":      urlPath,
		"filename": filename,
		"size":     header.Size,
		"type":     mimeType,
	})
}
