package review

import (
	"time"

	"github.com/benny-yang/veil-api/internal/middleware"
	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/pkg/database"
	"github.com/benny-yang/veil-api/pkg/response"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	txTimeoutDays map[string]int
}

func NewHandler(txTimeoutDays map[string]int) *Handler {
	return &Handler{txTimeoutDays: txTimeoutDays}
}

// GET /users/:username/reviews
func (h *Handler) GetReviews(c *gin.Context) {
	username := c.Param("username")
	var profile model.UserProfile
	if err := database.DB.Where("username = ?", username).First(&profile).Error; err != nil {
		response.NotFound(c, "找不到此用戶")
		return
	}

	var reviews []model.Review
	database.DB.Where("reviewee_id = ?", profile.UserID).Order("created_at DESC").Find(&reviews)
	for i := range reviews {
		var reviewer model.UserProfile
		database.DB.Where("user_id = ?", reviews[i].ReviewerID).First(&reviewer)
		reviews[i].Reviewer = &reviewer
	}
	response.OK(c, reviews)
}

type CreateReviewRequest struct {
	Stars   int8   `json:"stars" binding:"required,min=1,max=5"`
	Content string `json:"content" binding:"required"`
}

// POST /transactions/:txId/review
func (h *Handler) CreateReview(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	txID := c.Param("txId")

	var tx model.Transaction
	if err := database.DB.First(&tx, "id = ?", txID).Error; err != nil {
		response.NotFound(c, "交易不存在")
		return
	}

	// 確認是交易當事人
	isBuyer := tx.BuyerID == userID
	isSeller := tx.SellerID == userID
	if !isBuyer && !isSeller {
		response.Forbidden(c, "FORBIDDEN", "非此交易當事人")
		return
	}

	// 確認未重複評價
	if isBuyer && tx.BuyerReviewed {
		response.Conflict(c, "ALREADY_REVIEWED", "已評價")
		return
	}
	if isSeller && tx.SellerReviewed {
		response.Conflict(c, "ALREADY_REVIEWED", "已評價")
		return
	}

	// 確認可評價條件：completed 或超時
	if !h.canReview(&tx) {
		response.UnprocessableEntity(c, "REVIEW_NOT_ALLOWED", "交易未完成且尚未超時，無法評價")
		return
	}

	// 取消：不能評價已取消的交易
	if tx.Status == model.TxCancelled {
		response.UnprocessableEntity(c, "TX_CANCELLED", "已取消的交易不可評價")
		return
	}

	var req CreateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	var revieweeID string
	var role model.ReviewerRole
	if isBuyer {
		revieweeID = tx.SellerID
		role = model.ReviewerBuyer
	} else {
		revieweeID = tx.BuyerID
		role = model.ReviewerSeller
	}

	review := model.Review{
		TransactionID: txID,
		ReviewerID:    userID,
		RevieweeID:    revieweeID,
		Stars:         req.Stars,
		Content:       req.Content,
		ReviewerRole:  role,
	}
	database.DB.Create(&review)

	// 更新已評價旗標
	if isBuyer {
		database.DB.Model(&tx).Update("buyer_reviewed", true)
	} else {
		database.DB.Model(&tx).Update("seller_reviewed", true)
	}

	// 更新被評價者的平均評分
	updateRating(revieweeID)

	response.Created(c, review)
}

func (h *Handler) canReview(tx *model.Transaction) bool {
	if tx.Status == model.TxCompleted {
		return true
	}
	days, ok := h.txTimeoutDays[string(tx.Status)]
	if !ok {
		return false
	}
	return time.Since(tx.StatusUpdatedAt).Hours()/24 >= float64(days)
}

func updateRating(userID string) {
	var result struct {
		Avg float32
	}
	database.DB.Raw("SELECT AVG(stars) as avg FROM reviews WHERE reviewee_id = ?", userID).Scan(&result)
	database.DB.Model(&model.UserProfile{}).Where("user_id = ?", userID).Update("rating", result.Avg)
}
