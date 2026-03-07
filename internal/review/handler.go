package review

import (
	"log"
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

	// 批次撈 reviewer profile（避免 N+1）
	reviewerIDs := make([]string, len(reviews))
	for i, r := range reviews {
		reviewerIDs[i] = r.ReviewerID
	}
	profileMap := make(map[string]*model.UserProfile)
	if len(reviewerIDs) > 0 {
		var profiles []model.UserProfile
		database.DB.Where("user_id IN ?", reviewerIDs).Find(&profiles)
		for i := range profiles {
			profileMap[profiles[i].UserID] = &profiles[i]
		}
	}
	for i := range reviews {
		reviews[i].Reviewer = profileMap[reviews[i].ReviewerID]
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

	// 檢查是否已有評價（支援修改評價）
	var existingReview model.Review
	hasExisting := false
	if isBuyer && tx.BuyerReviewed {
		if err := database.DB.Where("transaction_id = ? AND reviewer_id = ?", txID, userID).First(&existingReview).Error; err == nil {
			hasExisting = true
		}
	}
	if isSeller && tx.SellerReviewed {
		if err := database.DB.Where("transaction_id = ? AND reviewer_id = ?", txID, userID).First(&existingReview).Error; err == nil {
			hasExisting = true
		}
	}

	// 確認可評價條件：completed、cancelled 或超時
	if !hasExisting && !h.canReview(&tx) {
		response.UnprocessableEntity(c, "REVIEW_NOT_ALLOWED", "交易未完成且尚未超時，無法評價")
		return
	}

	var req CreateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	// 超時或取消的交易，評價上限 2 星（修改評價時若交易已完成則允許 5 星）
	isTerminal := tx.Status == model.TxCompleted
	if !isTerminal && req.Stars > 2 {
		response.BadRequest(c, "STARS_EXCEEDED", "逾時或取消的交易，評價最高 2 星")
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

	// ── 停權判斷（新增與修改評價皆須執行，且防重複） ──────────────
	if isSeller && shouldSuspendBuyer(tx, h.txTimeoutDays) {
		reason := "交易待付款超時未處理"
		if !hasSuspensionLog(tx.BuyerID, txID, reason) {
			log.Printf("[停權判斷] → 停權買家 %s", tx.BuyerID)
			suspendBuyer(tx.BuyerID, txID)
		}
	}
	if isBuyer && shouldSuspendSeller(tx, h.txTimeoutDays) {
		reason := "交易出貨超時未處理"
		if tx.CancelReason == "not_received" {
			reason = "買家反應未收到貨品"
		}
		if !hasSuspensionLog(tx.SellerID, txID, reason) {
			log.Printf("[停權判斷] → 停權賣家 %s", tx.SellerID)
			suspendSeller(tx.SellerID, txID, tx.CancelReason)
		}
	}

	if hasExisting {
		// 修改既有評價
		database.DB.Model(&existingReview).Updates(map[string]interface{}{
			"stars":   req.Stars,
			"content": req.Content,
		})
		updateRating(revieweeID)
		response.OK(c, existingReview)
		return
	}

	// 建立新評價
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

	// 信用分數調整（依 PRD 規則）
	isForced := tx.Status != model.TxCompleted
	applyCreditScoreChange(revieweeID, req.Stars, isForced)

	response.Created(c, review)
}

// shouldSuspendBuyer 判斷是否應該停權買家
// 條件：賣家評價 + (pending 超時中 或 pending 超時後取消)
func shouldSuspendBuyer(tx model.Transaction, timeoutDays map[string]int) bool {
	if tx.Status == model.TxPending {
		pendingLimit := timeoutDays["pending"]
		return time.Since(tx.StatusUpdatedAt).Minutes() >= float64(pendingLimit)
	}
	if tx.Status == model.TxCancelled {
		pendingLimit := timeoutDays["pending"]
		elapsed := tx.StatusUpdatedAt.Sub(tx.CreatedAt).Minutes()
		return elapsed >= float64(pendingLimit)
	}
	return false
}

// shouldSuspendSeller 判斷是否應該停權賣家
// 條件：買家評價 + (shipping 超時後取消 或 買家反應未收到貨品)
func shouldSuspendSeller(tx model.Transaction, timeoutDays map[string]int) bool {
	if tx.Status != model.TxCancelled {
		return false
	}
	// 買家反應未收到貨品 → 直接停權
	if tx.CancelReason == "not_received" {
		return true
	}
	// shipping 超時後取消 → 停權
	shippingLimit := timeoutDays["shipping"]
	elapsed := tx.StatusUpdatedAt.Sub(tx.CreatedAt).Minutes()
	return elapsed >= float64(shippingLimit)
}

// isTimedOut 判斷交易是否超時（與 canReview 使用相同超時設定）
func (h *Handler) isTimedOut(tx *model.Transaction) bool {
	minutes, ok := h.txTimeoutDays[string(tx.Status)]
	if !ok {
		return false
	}
	return time.Since(tx.StatusUpdatedAt).Minutes() >= float64(minutes)
}

// suspendBuyer 停權待付款超時未處理的買家（僅設定停權，信用分由評價邏輯處理）
func suspendBuyer(buyerID string, transactionID string) {
	const suspensionDays = 5
	const suspensionReason = "交易待付款超時未處理"

	now := time.Now()
	suspendUntil := now.AddDate(0, 0, suspensionDays)

	database.DB.Model(&model.User{}).Where("id = ?", buyerID).Updates(map[string]interface{}{
		"suspended_until": suspendUntil,
		"suspend_reason":  suspensionReason,
	})

	database.DB.Create(&model.SuspensionLog{
		UserID:         buyerID,
		Reason:         suspensionReason,
		Days:           suspensionDays,
		SuspendedAt:    now,
		SuspendedUntil: suspendUntil,
		TransactionID:  &transactionID,
	})
}

// suspendSeller 停權賣家（設定停權 + 3 天申訴期）
func suspendSeller(sellerID string, transactionID string, cancelReason string) {
	suspensionReason := "交易出貨超時未處理"
	if cancelReason == "not_received" {
		suspensionReason = "買家反應未收到貨品"
	}
	const appealDays = 3

	now := time.Now()
	// 先停權到申訴截止日（3 天），若未申訴或被駁回則 middleware 會設為永久停權
	appealDeadline := now.AddDate(0, 0, appealDays)
	// 暫時停到很遠的未來，由申訴流程決定是否解除
	permanentDate := time.Date(2099, 12, 31, 23, 59, 59, 0, time.UTC)

	database.DB.Model(&model.User{}).Where("id = ?", sellerID).Updates(map[string]interface{}{
		"suspended_until": permanentDate,
		"suspend_reason":  suspensionReason,
	})

	database.DB.Create(&model.SuspensionLog{
		UserID:         sellerID,
		Reason:         suspensionReason,
		Days:           -1, // -1 代表需要申訴，非固定天數
		SuspendedAt:    now,
		SuspendedUntil: permanentDate,
		TransactionID:  &transactionID,
		AppealDeadline: &appealDeadline,
	})
}

// hasSuspensionLog 檢查是否已為某個交易存在相同原因的停權紀錄
func hasSuspensionLog(userID string, txID string, reason string) bool {
	var count int64
	database.DB.Model(&model.SuspensionLog{}).
		Where("user_id = ? AND transaction_id = ? AND reason = ?", userID, txID, reason).
		Count(&count)
	return count > 0
}

// applyCreditScoreChange 依據 PRD 信用分規則計算加減分
//
// 正常完成：5★=+2, 4★=+1, 3★=0, 2★=-1, 1★=-2
// 強制評分：2★=-3, 1★=-5（3★以上不計分）
func applyCreditScoreChange(userID string, stars int8, isForced bool) {
	var delta int
	var reason string

	if isForced {
		switch {
		case stars == 1:
			delta = -5
			reason = "強制評價 1★"
		case stars == 2:
			delta = -3
			reason = "強制評價 2★"
		default:
			return // 3★ 以上不計分
		}
	} else {
		switch stars {
		case 5:
			delta = 2
			reason = "交易評價 5★"
		case 4:
			delta = 1
			reason = "交易評價 4★"
		case 3:
			return // 0 分，不記錄
		case 2:
			delta = -1
			reason = "交易評價 2★"
		case 1:
			delta = -2
			reason = "交易評價 1★"
		default:
			return
		}
	}

	var profile model.UserProfile
	if err := database.DB.Where("user_id = ?", userID).First(&profile).Error; err != nil {
		return
	}

	newScore := profile.CreditScore + delta
	if newScore < 0 {
		newScore = 0
	}
	if newScore > 100 {
		newScore = 100
	}

	database.DB.Model(&profile).Update("credit_score", newScore)
	database.DB.Create(&model.CreditScoreLog{
		UserID:     userID,
		Delta:      delta,
		Reason:     reason,
		ScoreAfter: newScore,
	})
}

// canReview：map 的值單位為分鐘（測試模式 = 5 分鐘）
func (h *Handler) canReview(tx *model.Transaction) bool {
	if tx.Status == model.TxCompleted || tx.Status == model.TxCancelled {
		return true
	}
	minutes, ok := h.txTimeoutDays[string(tx.Status)]
	if !ok {
		return false
	}
	return time.Since(tx.StatusUpdatedAt).Minutes() >= float64(minutes)
}

func updateRating(userID string) {
	var result struct {
		Avg float32
	}
	database.DB.Raw("SELECT AVG(stars) as avg FROM reviews WHERE reviewee_id = ?", userID).Scan(&result)
	database.DB.Model(&model.UserProfile{}).Where("user_id = ?", userID).Update("rating", result.Avg)
}
