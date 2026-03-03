package work

import (
	"errors"
	"regexp"

	"github.com/benny-yang/veil-api/internal/middleware"
	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/pkg/database"
	"github.com/benny-yang/veil-api/pkg/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct{}

func NewHandler() *Handler { return &Handler{} }

var hashtagRegex = regexp.MustCompile(`#([\w\x{4e00}-\x{9fa5}]+)`)

// GET /users/:username/works
func (h *Handler) GetWorks(c *gin.Context) {
	username := c.Param("username")
	var profile model.UserProfile
	if err := database.DB.Where("username = ?", username).First(&profile).Error; err != nil {
		response.NotFound(c, "找不到此用戶")
		return
	}
	var works []model.Work
	database.DB.Preload("Photos").Preload("Tags").Where("user_id = ?", profile.UserID).Order("created_at DESC").Find(&works)
	response.OK(c, works)
}

type CreateWorkRequest struct {
	Description string       `json:"description" binding:"required"`
	Photos      []PhotoInput `json:"photos" binding:"required,min=1"`
}

type PhotoInput struct {
	URL       string `json:"url" binding:"required,url"`
	SortOrder int    `json:"sort_order"`
	IsCover   bool   `json:"is_cover"`
}

// POST /users/me/works
func (h *Handler) CreateWork(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	var req CreateWorkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	var coverURL *string
	for _, p := range req.Photos {
		if p.IsCover {
			u := p.URL
			coverURL = &u
			break
		}
	}
	if coverURL == nil && len(req.Photos) > 0 {
		u := req.Photos[0].URL
		coverURL = &u
	}

	work := model.Work{
		UserID:      userID,
		Description: req.Description,
		CoverURL:    coverURL,
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&work).Error; err != nil {
			return err
		}
		for _, p := range req.Photos {
			photo := model.WorkPhoto{
				WorkID:    work.ID,
				URL:       p.URL,
				SortOrder: p.SortOrder,
				IsCover:   p.IsCover,
			}
			if err := tx.Create(&photo).Error; err != nil {
				return err
			}
		}
		return upsertTags(tx, req.Description, func(tagID string) error {
			return tx.Exec("INSERT IGNORE INTO work_tags (work_id, tag_id) VALUES (?, ?)", work.ID, tagID).Error
		})
	})

	if err != nil {
		response.InternalError(c)
		return
	}

	database.DB.Preload("Photos").Preload("Tags").First(&work, "id = ?", work.ID)
	response.Created(c, work)
}

type UpdateWorkRequest struct {
	Description *string      `json:"description"`
	Photos      []PhotoInput `json:"photos"`
}

// PATCH /works/:workId
func (h *Handler) UpdateWork(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	workID := c.Param("workId")

	var work model.Work
	if err := database.DB.First(&work, "id = ?", workID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.NotFound(c, "作品不存在")
			return
		}
		response.InternalError(c)
		return
	}

	if work.UserID != userID {
		response.Forbidden(c, "FORBIDDEN", "無法修改他人作品")
		return
	}

	var req UpdateWorkRequest
	c.ShouldBindJSON(&req)

	database.DB.Transaction(func(tx *gorm.DB) error {
		if req.Description != nil {
			tx.Model(&work).Update("description", *req.Description)
			// 重建 tags
			tx.Exec("DELETE FROM work_tags WHERE work_id = ?", work.ID)
			upsertTags(tx, *req.Description, func(tagID string) error {
				return tx.Exec("INSERT IGNORE INTO work_tags (work_id, tag_id) VALUES (?, ?)", work.ID, tagID).Error
			})
		}
		return nil
	})

	database.DB.Preload("Photos").Preload("Tags").First(&work, "id = ?", work.ID)
	response.OK(c, work)
}

// DELETE /works/:workId
func (h *Handler) DeleteWork(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	workID := c.Param("workId")

	var work model.Work
	if err := database.DB.First(&work, "id = ?", workID).Error; err != nil {
		response.NotFound(c, "作品不存在")
		return
	}
	if work.UserID != userID {
		response.Forbidden(c, "FORBIDDEN", "無法刪除他人作品")
		return
	}

	database.DB.Transaction(func(tx *gorm.DB) error {
		tx.Exec("DELETE FROM work_tags WHERE work_id = ?", workID)
		tx.Delete(&model.WorkPhoto{}, "work_id = ?", workID)
		return tx.Delete(&work).Error
	})

	response.NoContent(c)
}

// ── 共用 tag upsert ────────────────────────────────────────────────────────────

func upsertTags(tx *gorm.DB, text string, insertPivot func(tagID string) error) error {
	matches := hashtagRegex.FindAllStringSubmatch(text, -1)
	for _, m := range matches {
		name := m[1]
		var tag model.Tag
		if err := tx.Where(model.Tag{Name: name}).FirstOrCreate(&tag).Error; err != nil {
			return err
		}
		tx.Model(&tag).UpdateColumn("usage_count", gorm.Expr("usage_count + 1"))
		if err := insertPivot(tag.ID); err != nil {
			return err
		}
	}
	return nil
}
