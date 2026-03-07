package appeal

import (
	"time"

	"github.com/benny-yang/veil-api/internal/middleware"
	"github.com/benny-yang/veil-api/internal/model"
	"github.com/benny-yang/veil-api/pkg/database"
	"github.com/benny-yang/veil-api/pkg/response"
	"github.com/gin-gonic/gin"
)

type Handler struct{}

func NewHandler() *Handler { return &Handler{} }

// ── 使用者 API ──────────────────────────────────────────────────────────────

type CreateAppealRequest struct {
	Reason      string `json:"reason" binding:"required,min=10,max=500"`
	EvidenceURL string `json:"evidence_url" binding:"required,url"`
}

// POST /appeals — 使用者提交申訴
func (h *Handler) CreateAppeal(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	// 找到最近一筆有申訴期限的停權紀錄
	var suspLog model.SuspensionLog
	if err := database.DB.
		Where("user_id = ? AND appeal_deadline IS NOT NULL", userID).
		Order("created_at DESC").
		First(&suspLog).Error; err != nil {
		response.NotFound(c, "找不到可申訴的停權紀錄")
		return
	}

	// 檢查申訴期限
	if suspLog.AppealDeadline == nil || time.Now().After(*suspLog.AppealDeadline) {
		response.UnprocessableEntity(c, "APPEAL_EXPIRED", "申訴期限已過")
		return
	}

	// 檢查是否已經申訴過
	var existingCount int64
	database.DB.Model(&model.Appeal{}).
		Where("suspension_log_id = ?", suspLog.ID).
		Count(&existingCount)
	if existingCount > 0 {
		response.Conflict(c, "ALREADY_APPEALED", "此停權紀錄已提交過申訴")
		return
	}

	var req CreateAppealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	appeal := model.Appeal{
		UserID:          userID,
		SuspensionLogID: suspLog.ID,
		Reason:          req.Reason,
		EvidenceURL:     req.EvidenceURL,
		Status:          model.AppealPending,
		Deadline:        *suspLog.AppealDeadline,
	}

	if err := database.DB.Create(&appeal).Error; err != nil {
		response.InternalError(c)
		return
	}

	response.Created(c, appeal)
}

// GET /appeals/me — 使用者查看自己的最新申訴
func (h *Handler) GetMyAppeal(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	var appeal model.Appeal
	if err := database.DB.
		Preload("SuspensionLog").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		First(&appeal).Error; err != nil {
		response.NotFound(c, "尚未提交申訴")
		return
	}

	response.OK(c, appeal)
}

// ── 管理員 API ──────────────────────────────────────────────────────────────

// GET /admin/appeals — 列出所有待審申訴
func (h *Handler) ListAppeals(c *gin.Context) {
	status := c.DefaultQuery("status", "pending")

	var appeals []model.Appeal
	q := database.DB.Preload("SuspensionLog")
	if status != "all" {
		q = q.Where("status = ?", status)
	}
	q.Order("created_at ASC").Find(&appeals)

	response.OK(c, appeals)
}

type ReviewAppealRequest struct {
	Action    string `json:"action" binding:"required,oneof=approve reject"`
	AdminNote string `json:"admin_note"`
}

// PATCH /admin/appeals/:id — 管理員審核申訴
func (h *Handler) ReviewAppeal(c *gin.Context) {
	appealID := c.Param("id")

	var appeal model.Appeal
	if err := database.DB.First(&appeal, "id = ?", appealID).Error; err != nil {
		response.NotFound(c, "申訴不存在")
		return
	}

	if appeal.Status != model.AppealPending {
		response.UnprocessableEntity(c, "ALREADY_REVIEWED", "此申訴已審核")
		return
	}

	var req ReviewAppealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	now := time.Now()

	if req.Action == "approve" {
		// 通過申訴 → 解除停權
		database.DB.Model(&appeal).Updates(map[string]interface{}{
			"status":      model.AppealApproved,
			"admin_note":  req.AdminNote,
			"reviewed_at": now,
		})
		database.DB.Model(&model.User{}).Where("id = ?", appeal.UserID).Updates(map[string]interface{}{
			"suspended_until": nil,
			"suspend_reason":  "",
		})

		// 恢復交易狀態：依 cancel_reason 判斷恢復到哪個階段
		var suspLog model.SuspensionLog
		if err := database.DB.First(&suspLog, "id = ?", appeal.SuspensionLogID).Error; err == nil && suspLog.TransactionID != nil && *suspLog.TransactionID != "" {
			// 先查出交易的 cancel_reason 來決定恢復狀態
			var tx model.Transaction
			database.DB.First(&tx, "id = ?", *suspLog.TransactionID)

			restoreStatus := model.TxShipping // 預設恢復為 shipping（出貨超時）
			statusLabel := "待出貨"
			if tx.CancelReason == "not_received" {
				restoreStatus = model.TxReceived // 未收到商品 → 恢復為 received（待收貨）
				statusLabel = "待收貨"
			}

			// 保留評價旗標不重置（一筆交易只評價一次，後續可修改）
			database.DB.Model(&model.Transaction{}).Where("id = ?", *suspLog.TransactionID).Updates(map[string]interface{}{
				"status":            restoreStatus,
				"status_updated_at": now,
				"cancel_reason":     "",
			})

			// 通知買家
			noteContent := "賣家的申訴已通過審核，交易已恢復為" + statusLabel + "狀態。"
			if req.AdminNote != "" {
				noteContent += "\n管理員備註：" + req.AdminNote
			}
			database.DB.Create(&model.Notification{
				UserID:  tx.BuyerID,
				Type:    model.NotifTxUpdate,
				Message: noteContent,
			})
		}
	} else {
		// 駁回申訴 → 維持永久停權
		database.DB.Model(&appeal).Updates(map[string]interface{}{
			"status":      model.AppealRejected,
			"admin_note":  req.AdminNote,
			"reviewed_at": now,
		})
		database.DB.Model(&model.User{}).Where("id = ?", appeal.UserID).Updates(map[string]interface{}{
			"suspend_reason": "申訴未通過，帳號已永久停權",
		})
	}

	response.NoContent(c)
}
