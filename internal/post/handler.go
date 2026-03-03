package post

import (
	"errors"

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

// GET /feed
func (h *Handler) GetFeed(c *gin.Context) {
	var posts []model.Post
	database.DB.Preload("Images").Preload("Tags").Order("created_at DESC").Limit(30).Find(&posts)

	// 批次撈作者資料（避免 N+1）
	userIDs := make([]string, len(posts))
	for i, p := range posts {
		userIDs[i] = p.UserID
	}
	var profiles []model.UserProfile
	if len(userIDs) > 0 {
		database.DB.Where("user_id IN ?", userIDs).Find(&profiles)
	}
	profileMap := make(map[string]*model.UserProfile, len(profiles))
	for i := range profiles {
		profileMap[profiles[i].UserID] = &profiles[i]
	}
	for i := range posts {
		if p, ok := profileMap[posts[i].UserID]; ok {
			posts[i].Author = p
		}
	}
	response.OK(c, posts)
}

type CreatePostRequest struct {
	Description string   `json:"description" binding:"required"`
	ImageURLs   []string `json:"image_urls" binding:"required,min=1"`
}

// POST /posts
func (h *Handler) CreatePost(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	var req CreatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	post := model.Post{UserID: userID, Description: req.Description}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&post).Error; err != nil {
			return err
		}
		for i, url := range req.ImageURLs {
			img := model.PostImage{PostID: post.ID, URL: url, SortOrder: i}
			if err := tx.Create(&img).Error; err != nil {
				return err
			}
		}
		tags := tagging.ExtractTags(req.Description)
		return tagging.UpsertTags(tx, "post_tags", "post_id", post.ID, tags)
	}); err != nil {
		response.InternalError(c)
		return
	}

	database.DB.Preload("Images").Preload("Tags").First(&post, "id = ?", post.ID)
	response.Created(c, post)
}

// GET /posts/:postId
func (h *Handler) GetPost(c *gin.Context) {
	postID := c.Param("postId")
	var post model.Post
	if err := database.DB.Preload("Images").Preload("Tags").First(&post, "id = ?", postID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.NotFound(c, "貼文不存在")
			return
		}
		response.InternalError(c)
		return
	}
	var profile model.UserProfile
	database.DB.Where("user_id = ?", post.UserID).First(&profile)
	post.Author = &profile
	response.OK(c, post)
}

// DELETE /posts/:postId
func (h *Handler) DeletePost(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	postID := c.Param("postId")

	var post model.Post
	if err := database.DB.First(&post, "id = ?", postID).Error; err != nil {
		response.NotFound(c, "貼文不存在")
		return
	}
	if post.UserID != userID {
		response.Forbidden(c, "FORBIDDEN", "無法刪除他人貼文")
		return
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		tx.Exec("DELETE FROM post_tags WHERE post_id = ?", postID)
		tx.Delete(&model.PostImage{}, "post_id = ?", postID)
		tx.Delete(&model.PostLike{}, "post_id = ?", postID)
		tx.Delete(&model.PostComment{}, "post_id = ?", postID)
		return tx.Delete(&post).Error
	}); err != nil {
		response.InternalError(c)
		return
	}
	response.NoContent(c)
}

// POST /posts/:postId/like
func (h *Handler) LikePost(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	postID := c.Param("postId")

	like := model.PostLike{UserID: userID, PostID: postID}
	if err := database.DB.Create(&like).Error; err != nil {
		response.Conflict(c, "ALREADY_LIKED", "已按讚")
		return
	}
	database.DB.Model(&model.Post{}).Where("id = ?", postID).UpdateColumn("like_count", gorm.Expr("like_count + 1"))
	response.NoContent(c)
}

// DELETE /posts/:postId/like
func (h *Handler) UnlikePost(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	postID := c.Param("postId")

	result := database.DB.Delete(&model.PostLike{}, "user_id = ? AND post_id = ?", userID, postID)
	if result.RowsAffected == 0 {
		response.NotFound(c, "尚未按讚")
		return
	}
	database.DB.Model(&model.Post{}).Where("id = ?", postID).UpdateColumn("like_count", gorm.Expr("like_count - 1"))
	response.NoContent(c)
}

// GET /posts/:postId/comments
func (h *Handler) GetComments(c *gin.Context) {
	postID := c.Param("postId")
	var comments []model.PostComment
	database.DB.Where("post_id = ?", postID).Order("created_at ASC").Find(&comments)

	// 批次撈作者資料（避免 N+1）
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

// POST /posts/:postId/comments
func (h *Handler) CreateComment(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	postID := c.Param("postId")
	var req CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	// 確認 post 存在
	if err := database.DB.First(&model.Post{}, "id = ?", postID).Error; err != nil {
		response.NotFound(c, "貼文不存在")
		return
	}

	comment := model.PostComment{PostID: postID, UserID: userID, Content: req.Content}
	if err := database.DB.Create(&comment).Error; err != nil {
		response.InternalError(c)
		return
	}
	database.DB.Model(&model.Post{}).Where("id = ?", postID).UpdateColumn("comment_count", gorm.Expr("comment_count + 1"))

	var profile model.UserProfile
	database.DB.Where("user_id = ?", userID).First(&profile)
	comment.Author = &profile
	response.Created(c, comment)
}

// DELETE /posts/:postId/comments/:commentId
func (h *Handler) DeleteComment(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	postID := c.Param("postId")
	commentID := c.Param("commentId")

	var comment model.PostComment
	if err := database.DB.First(&comment, "id = ? AND post_id = ?", commentID, postID).Error; err != nil {
		response.NotFound(c, "留言不存在")
		return
	}
	if comment.UserID != userID {
		response.Forbidden(c, "FORBIDDEN", "無法刪除他人留言")
		return
	}

	database.DB.Delete(&comment)
	database.DB.Model(&model.Post{}).Where("id = ?", postID).UpdateColumn("comment_count", gorm.Expr("comment_count - 1"))
	response.NoContent(c)
}
