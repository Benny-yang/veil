package work

import (
	"errors"
	"time"

	"github.com/benny-yang/veil-api/internal/middleware"
	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/pkg/database"
	"github.com/benny-yang/veil-api/pkg/response"
	"github.com/benny-yang/veil-api/pkg/tagging"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct{}

func NewHandler() *Handler { return &Handler{} }

// WorkFeedItem 用於 Feed 回傳格式，將 Work.Photos 以 json:"images" 輸出
// 讓前端 normalizePost 讀取 images[].url 繼續有效
type WorkFeedItem struct {
	ID           string             `json:"id"`
	UserID       string             `json:"user_id"`
	Description  string             `json:"description"`
	LikeCount    int                `json:"like_count"`
	CommentCount int                `json:"comment_count"`
	CreatedAt    time.Time          `json:"created_at"`
	Images       []model.WorkPhoto  `json:"images"`
	Tags         []model.Tag        `json:"tags,omitempty"`
	Author       *model.UserProfile `json:"author,omitempty"`
}

// GET /feed — 隨機取全站作品，每次刷新順序不同
func (h *Handler) GetFeed(c *gin.Context) {
	var works []model.Work
	database.DB.Preload("Photos").Preload("Tags").Order("RAND()").Limit(60).Find(&works)

	userIDs := make([]string, len(works))
	for i, w := range works {
		userIDs[i] = w.UserID
	}
	var profiles []model.UserProfile
	if len(userIDs) > 0 {
		database.DB.Where("user_id IN ?", userIDs).Find(&profiles)
	}
	profileMap := make(map[string]*model.UserProfile, len(profiles))
	for i := range profiles {
		profileMap[profiles[i].UserID] = &profiles[i]
	}

	items := make([]WorkFeedItem, len(works))
	for i, w := range works {
		item := WorkFeedItem{
			ID:           w.ID,
			UserID:       w.UserID,
			Description:  w.Description,
			LikeCount:    w.LikeCount,
			CommentCount: w.CommentCount,
			CreatedAt:    w.CreatedAt,
			Images:       w.Photos,
			Tags:         w.Tags,
		}
		if p, ok := profileMap[w.UserID]; ok {
			item.Author = p
		}
		items[i] = item
	}
	response.OK(c, items)
}

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

// GET /works/:workId
func (h *Handler) GetWork(c *gin.Context) {
	workID := c.Param("workId")
	var work model.Work
	if err := database.DB.Preload("Photos").Preload("Tags").First(&work, "id = ?", workID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.NotFound(c, "作品不存在")
			return
		}
		response.InternalError(c)
		return
	}
	var profile model.UserProfile
	database.DB.Where("user_id = ?", work.UserID).First(&profile)
	work.Author = &profile
	response.OK(c, work)
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
		tags := tagging.ExtractTags(req.Description)
		return tagging.UpsertTags(tx, "work_tags", "work_id", work.ID, tags)
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
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if req.Description != nil {
			if err := tx.Model(&work).Update("description", *req.Description).Error; err != nil {
				return err
			}
			tags := tagging.ExtractTags(*req.Description)
			if err := tagging.UpsertTags(tx, "work_tags", "work_id", work.ID, tags); err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		response.InternalError(c)
		return
	}

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

// GET /works/:workId/comments
func (h *Handler) GetWorkComments(c *gin.Context) {
	workID := c.Param("workId")
	var comments []model.WorkComment
	database.DB.Where("work_id = ?", workID).Order("created_at ASC").Find(&comments)

	// 批次撈作者（避免 N+1）
	userIDs := make([]string, len(comments))
	for i, cmt := range comments {
		userIDs[i] = cmt.UserID
	}
	var profiles []model.UserProfile
	if len(userIDs) > 0 {
		database.DB.Where("user_id IN ?", userIDs).Find(&profiles)
	}
	profileMap := make(map[string]*model.UserProfile, len(profiles))
	for i := range profiles {
		profileMap[profiles[i].UserID] = &profiles[i]
	}
	for i := range comments {
		if p, ok := profileMap[comments[i].UserID]; ok {
			comments[i].Author = p
		}
	}
	response.OK(c, comments)
}

type CreateCommentRequest struct {
	Content string `json:"content" binding:"required,min=1"`
}

// POST /works/:workId/comments
func (h *Handler) AddComment(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	workID := c.Param("workId")

	var req CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	// 確認 work 存在
	if err := database.DB.First(&model.Work{}, "id = ?", workID).Error; err != nil {
		response.NotFound(c, "作品不存在")
		return
	}

	// 原子操作：建立留言 + 更新計數
	comment := model.WorkComment{WorkID: workID, UserID: userID, Content: req.Content}
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&comment).Error; err != nil {
			return err
		}
		return tx.Model(&model.Work{}).Where("id = ?", workID).UpdateColumn("comment_count", gorm.Expr("comment_count + 1")).Error
	}); err != nil {
		response.InternalError(c)
		return
	}

	var profile model.UserProfile
	database.DB.Where("user_id = ?", userID).First(&profile)
	comment.Author = &profile
	response.Created(c, comment)
}

// DELETE /works/:workId/comments/:commentId
func (h *Handler) DeleteComment(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	workID := c.Param("workId")
	commentID := c.Param("commentId")

	var comment model.WorkComment
	if err := database.DB.First(&comment, "id = ? AND work_id = ?", commentID, workID).Error; err != nil {
		response.NotFound(c, "留言不存在")
		return
	}
	if comment.UserID != userID {
		response.Forbidden(c, "FORBIDDEN", "無法刪除他人留言")
		return
	}
	// 原子操作：刪除留言 + 更新計數
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&comment).Error; err != nil {
			return err
		}
		return tx.Model(&model.Work{}).Where("id = ?", workID).UpdateColumn("comment_count", gorm.Expr("comment_count - 1")).Error
	}); err != nil {
		response.InternalError(c)
		return
	}
	response.NoContent(c)
}

// POST /works/:workId/like
func (h *Handler) LikeWork(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	workID := c.Param("workId")

	// 原子操作：按讚 + 更新計數
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		like := model.WorkLike{UserID: userID, WorkID: workID}
		if err := tx.Create(&like).Error; err != nil {
			return err
		}
		return tx.Model(&model.Work{}).Where("id = ?", workID).UpdateColumn("like_count", gorm.Expr("like_count + 1")).Error
	}); err != nil {
		response.Conflict(c, "ALREADY_LIKED", "已按讚")
		return
	}
	response.NoContent(c)
}

// DELETE /works/:workId/like
func (h *Handler) UnlikeWork(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	workID := c.Param("workId")

	// 原子操作：取消按讚 + 更新計數
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		result := tx.Delete(&model.WorkLike{}, "user_id = ? AND work_id = ?", userID, workID)
		if result.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}
		return tx.Model(&model.Work{}).Where("id = ?", workID).UpdateColumn("like_count", gorm.Expr("like_count - 1")).Error
	}); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.NotFound(c, "尚未按讚")
			return
		}
		response.InternalError(c)
		return
	}
	response.NoContent(c)
}
