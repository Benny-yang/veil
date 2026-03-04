package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BeforeCreate 自動設定 UUID
func newUUID() string {
	return uuid.New().String()
}

// ─── admin_users（管理者帳號）────────────────────────────────────────────────

type AdminUser struct {
	ID           string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Username     string    `gorm:"uniqueIndex;size:50;not null" json:"username"`
	PasswordHash string    `gorm:"size:255;not null" json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

func (a *AdminUser) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = newUUID()
	}
	return nil
}

// ─── users（認證帳號）─────────────────────────────────────────────────────────

type User struct {
	ID                   string       `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Email                string       `gorm:"uniqueIndex;size:255;not null" json:"email"`
	PasswordHash         string       `gorm:"size:255;not null" json:"-"`
	OnboardingCompleted  bool         `gorm:"default:false" json:"onboarding_completed"`
	EmailVerified        bool         `gorm:"default:false" json:"email_verified"`
	EmailVerifyToken     *string      `gorm:"size:64;index" json:"-"`
	EmailVerifyExpiresAt *time.Time   `json:"-"`
	CreatedAt            time.Time    `json:"created_at"`
	UpdatedAt            time.Time    `json:"updated_at"`
	Profile              *UserProfile `gorm:"foreignKey:UserID" json:"profile,omitempty"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = newUUID()
	}
	return nil
}

// ─── user_profiles（個人資料）────────────────────────────────────────────────

type UserProfile struct {
	UserID         string    `gorm:"primaryKey;type:varchar(36)" json:"user_id"`
	Username       string    `gorm:"uniqueIndex;size:50;not null" json:"username"`
	DisplayName    string    `gorm:"size:100" json:"display_name"`
	Bio            string    `gorm:"type:text" json:"bio"`
	AvatarURL      *string   `gorm:"size:512" json:"avatar_url"`
	AvatarColor    string    `gorm:"size:7;default:'#E8DDD0'" json:"avatar_color"`
	Phone          *string   `gorm:"size:20" json:"phone,omitempty"`
	CreditScore    int       `gorm:"default:50" json:"credit_score"`
	FollowerCount  int       `gorm:"default:0" json:"follower_count"`
	FollowingCount int       `gorm:"default:0" json:"following_count"`
	DealCount      int       `gorm:"default:0" json:"deal_count"`
	Rating         float32   `gorm:"type:decimal(2,1);default:0" json:"rating"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// ─── user_verification（驗證資料）────────────────────────────────────────────

type VerificationType string
type VerificationStatus string

const (
	VerificationTypeRealPerson VerificationType   = "real_person"
	VerificationTypeSMS        VerificationType   = "sms"
	VerificationNone           VerificationStatus = "none"
	VerificationPending        VerificationStatus = "pending"
	VerificationVerified       VerificationStatus = "verified"
	VerificationFailed         VerificationStatus = "failed"
)

type UserVerification struct {
	ID            string             `gorm:"primaryKey;type:varchar(36)" json:"id"`
	UserID        string             `gorm:"type:varchar(36);not null;index" json:"user_id"`
	Type          VerificationType   `gorm:"type:enum('real_person','sms');not null" json:"type"`
	Status        VerificationStatus `gorm:"type:enum('none','pending','verified','failed');default:'none'" json:"status"`
	Platform      *string            `gorm:"size:100" json:"platform,omitempty"`
	ProfileURL    *string            `gorm:"size:512" json:"profile_url,omitempty"`
	PhotoURL      *string            `gorm:"size:512" json:"photo_url,omitempty"`
	FailureReason *string            `gorm:"type:text" json:"failure_reason,omitempty"`
	ReviewedBy    *string            `gorm:"type:varchar(36)" json:"reviewed_by,omitempty"`
	SubmittedAt   *time.Time         `json:"submitted_at,omitempty"`
	ReviewedAt    *time.Time         `json:"reviewed_at,omitempty"`
}

func (u *UserVerification) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = newUUID()
	}
	return nil
}

// ─── follows（追蹤關係）─────────────────────────────────────────────────────

type Follow struct {
	FollowerID  string    `gorm:"primaryKey;type:varchar(36)" json:"follower_id"`
	FollowingID string    `gorm:"primaryKey;type:varchar(36)" json:"following_id"`
	CreatedAt   time.Time `json:"created_at"`
}

// ─── tags（共用標籤）────────────────────────────────────────────────────────

type Tag struct {
	ID         string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Name       string    `gorm:"uniqueIndex;size:50;not null" json:"name"`
	UsageCount int       `gorm:"default:0" json:"usage_count"`
	CreatedAt  time.Time `json:"created_at"`
}

func (t *Tag) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = newUUID()
	}
	return nil
}

// ─── works（作品）───────────────────────────────────────────────────────────

type Work struct {
	ID           string       `gorm:"primaryKey;type:varchar(36)" json:"id"`
	UserID       string       `gorm:"type:varchar(36);not null;index" json:"user_id"`
	Description  string       `gorm:"type:text" json:"description"`
	CoverURL     *string      `gorm:"size:512" json:"cover_url"`
	LikeCount    int          `gorm:"default:0" json:"like_count"`
	CommentCount int          `gorm:"default:0" json:"comment_count"`
	CreatedAt    time.Time    `json:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at"`
	Photos       []WorkPhoto  `gorm:"foreignKey:WorkID" json:"photos,omitempty"`
	Tags         []Tag        `gorm:"many2many:work_tags;" json:"tags,omitempty"`
	Author       *UserProfile `gorm:"-" json:"author,omitempty"`
}

func (w *Work) BeforeCreate(tx *gorm.DB) error {
	if w.ID == "" {
		w.ID = newUUID()
	}
	return nil
}

type WorkPhoto struct {
	ID        string `gorm:"primaryKey;type:varchar(36)" json:"id"`
	WorkID    string `gorm:"type:varchar(36);not null;index" json:"work_id"`
	URL       string `gorm:"size:512;not null" json:"url"`
	SortOrder int    `gorm:"default:0" json:"sort_order"`
	IsCover   bool   `gorm:"default:false" json:"is_cover"`
}

func (w *WorkPhoto) BeforeCreate(tx *gorm.DB) error {
	if w.ID == "" {
		w.ID = newUUID()
	}
	return nil
}

type WorkLike struct {
	UserID    string    `gorm:"primaryKey;type:varchar(36)" json:"user_id"`
	WorkID    string    `gorm:"primaryKey;type:varchar(36)" json:"work_id"`
	CreatedAt time.Time `json:"created_at"`
}

type WorkComment struct {
	ID        string       `gorm:"primaryKey;type:varchar(36)" json:"id"`
	WorkID    string       `gorm:"type:varchar(36);not null;index" json:"work_id"`
	UserID    string       `gorm:"type:varchar(36);not null;index" json:"user_id"`
	Content   string       `gorm:"type:text;not null" json:"content"`
	CreatedAt time.Time    `json:"created_at"`
	Author    *UserProfile `gorm:"-" json:"author,omitempty"`
}

func (w *WorkComment) BeforeCreate(tx *gorm.DB) error {
	if w.ID == "" {
		w.ID = newUUID()
	}
	return nil
}

// ─── zones（私藏空間）────────────────────────────────────────────────────────

type ZoneStatus string

const (
	ZoneStatusActive ZoneStatus = "active"
	ZoneStatusEnded  ZoneStatus = "ended"
)

// ─── zone_categories ─────────────────────────────────────────────────────────

type ZoneCategory string

const (
	ZoneCategoryTop      ZoneCategory = "top"      // 上衣
	ZoneCategoryBottom   ZoneCategory = "bottom"   // 下著
	ZoneCategoryIntimate ZoneCategory = "intimate" // 內衣
	ZoneCategorySock     ZoneCategory = "sock"     // 襪子
	ZoneCategoryShoe     ZoneCategory = "shoe"     // 鞋子
	ZoneCategoryOther    ZoneCategory = "other"    // 其他
)

type Zone struct {
	ID             string       `gorm:"primaryKey;type:varchar(36)" json:"id"`
	SellerID       string       `gorm:"type:varchar(36);not null;index" json:"seller_id"`
	Title          string       `gorm:"size:100;not null" json:"title"`
	Description    string       `gorm:"type:text" json:"description"`
	Category       ZoneCategory `gorm:"type:varchar(20);default:'other'" json:"category"`
	TotalSlots     int          `gorm:"not null" json:"total_slots"`
	AcceptedCount  int          `gorm:"default:0" json:"accepted_count"`
	MinCreditScore int          `gorm:"default:0" json:"min_credit_score"`
	EndsAt         *time.Time   `json:"ends_at,omitempty"`
	Status         ZoneStatus   `gorm:"type:enum('active','ended');default:'active'" json:"status"`
	CreatedAt      time.Time    `json:"created_at"`
	UpdatedAt      time.Time    `json:"updated_at"`
	Photos         []ZonePhoto  `gorm:"foreignKey:ZoneID" json:"photos,omitempty"`
	Tags           []Tag        `gorm:"many2many:zone_tags;" json:"tags,omitempty"`
	Seller         *UserProfile `gorm:"-" json:"seller,omitempty"`
}

func (z *Zone) BeforeCreate(tx *gorm.DB) error {
	if z.ID == "" {
		z.ID = newUUID()
	}
	return nil
}

type ZonePhoto struct {
	ID        string `gorm:"primaryKey;type:varchar(36)" json:"id"`
	ZoneID    string `gorm:"type:varchar(36);not null;index" json:"zone_id"`
	URL       string `gorm:"size:512;not null" json:"url"`
	SortOrder int    `gorm:"default:0" json:"sort_order"`
	IsCover   bool   `gorm:"default:false" json:"is_cover"`
}

func (z *ZonePhoto) BeforeCreate(tx *gorm.DB) error {
	if z.ID == "" {
		z.ID = newUUID()
	}
	return nil
}

// ─── zone_applications（申請）────────────────────────────────────────────────

type ApplicationStatus string

const (
	ApplicationPending  ApplicationStatus = "pending"
	ApplicationApproved ApplicationStatus = "approved"
	ApplicationRejected ApplicationStatus = "rejected"
)

type ZoneApplication struct {
	ID          string            `gorm:"primaryKey;type:varchar(36)" json:"id"`
	ZoneID      string            `gorm:"type:varchar(36);not null;index" json:"zone_id"`
	ApplicantID string            `gorm:"type:varchar(36);not null;index" json:"applicant_id"`
	Intro       string            `gorm:"type:text" json:"intro"`
	Status      ApplicationStatus `gorm:"type:enum('pending','approved','rejected');default:'pending'" json:"status"`
	AppliedAt   time.Time         `json:"applied_at"`
	ReviewedAt  *time.Time        `json:"reviewed_at,omitempty"`
	Applicant   *UserProfile      `gorm:"-" json:"applicant,omitempty"`
	Zone        *Zone             `gorm:"-" json:"zone,omitempty"`
}

func (z *ZoneApplication) BeforeCreate(tx *gorm.DB) error {
	if z.ID == "" {
		z.ID = newUUID()
	}
	return nil
}

// ─── transactions（交易）────────────────────────────────────────────────────

type TransactionStatus string

const (
	TxPending   TransactionStatus = "pending"
	TxShipping  TransactionStatus = "shipping"
	TxReceived  TransactionStatus = "received"
	TxCompleted TransactionStatus = "completed"
	TxCancelled TransactionStatus = "cancelled"
)

type Transaction struct {
	ID              string            `gorm:"primaryKey;type:varchar(36)" json:"id"`
	ApplicationID   string            `gorm:"type:varchar(36);not null;uniqueIndex" json:"application_id"`
	BuyerID         string            `gorm:"type:varchar(36);not null;index" json:"buyer_id"`
	SellerID        string            `gorm:"type:varchar(36);not null;index" json:"seller_id"`
	Status          TransactionStatus `gorm:"type:enum('pending','shipping','received','completed','cancelled');default:'pending'" json:"status"`
	StatusUpdatedAt time.Time         `json:"status_updated_at"`
	BuyerReviewed   bool              `gorm:"default:false" json:"buyer_reviewed"`
	SellerReviewed  bool              `gorm:"default:false" json:"seller_reviewed"`
	CreatedAt       time.Time         `json:"created_at"`
}

func (t *Transaction) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = newUUID()
	}
	if t.StatusUpdatedAt.IsZero() {
		t.StatusUpdatedAt = time.Now()
	}
	return nil
}

// ─── reviews（評價）─────────────────────────────────────────────────────────

type ReviewerRole string

const (
	ReviewerBuyer  ReviewerRole = "buyer"
	ReviewerSeller ReviewerRole = "seller"
)

type Review struct {
	ID            string       `gorm:"primaryKey;type:varchar(36)" json:"id"`
	TransactionID string       `gorm:"type:varchar(36);not null;index" json:"transaction_id"`
	ReviewerID    string       `gorm:"type:varchar(36);not null;index" json:"reviewer_id"`
	RevieweeID    string       `gorm:"type:varchar(36);not null;index" json:"reviewee_id"`
	Stars         int8         `gorm:"not null" json:"stars"`
	Content       string       `gorm:"type:text" json:"content"`
	ReviewerRole  ReviewerRole `gorm:"type:enum('buyer','seller');not null" json:"reviewer_role"`
	CreatedAt     time.Time    `json:"created_at"`
	Reviewer      *UserProfile `gorm:"-" json:"reviewer,omitempty"`
}

func (r *Review) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = newUUID()
	}
	return nil
}

// ─── chats（聊天室）─────────────────────────────────────────────────────────

type ChatType string

const (
	ChatTypeZone ChatType = "zone"
	ChatTypeDM   ChatType = "dm"
)

type Chat struct {
	ID            string            `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Type          ChatType          `gorm:"type:enum('zone','dm');not null" json:"type"`
	ZoneID        *string           `gorm:"type:varchar(36);index" json:"zone_id,omitempty"`
	ApplicationID *string           `gorm:"type:varchar(36);index" json:"application_id,omitempty"`
	CreatedAt     time.Time         `json:"created_at"`
	Participants  []ChatParticipant `gorm:"foreignKey:ChatID" json:"participants,omitempty"`
}

func (c *Chat) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = newUUID()
	}
	return nil
}

type ChatParticipant struct {
	ChatID     string       `gorm:"primaryKey;type:varchar(36)" json:"chat_id"`
	UserID     string       `gorm:"primaryKey;type:varchar(36)" json:"user_id"`
	LastReadAt *time.Time   `json:"last_read_at,omitempty"`
	Profile    *UserProfile `gorm:"-" json:"profile,omitempty"`
}

type MessageType string

const (
	MessageTypeText  MessageType = "text"
	MessageTypeImage MessageType = "image"
)

type ChatMessage struct {
	ID        string       `gorm:"primaryKey;type:varchar(36)" json:"id"`
	ChatID    string       `gorm:"type:varchar(36);not null;index" json:"chat_id"`
	SenderID  string       `gorm:"type:varchar(36);not null;index" json:"sender_id"`
	Type      MessageType  `gorm:"type:enum('text','image');default:'text'" json:"type"`
	Content   string       `gorm:"type:text" json:"content"`
	MediaURL  *string      `gorm:"size:512" json:"media_url,omitempty"`
	CreatedAt time.Time    `json:"created_at"`
	Sender    *UserProfile `gorm:"-" json:"sender,omitempty"`
}

func (c *ChatMessage) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = newUUID()
	}
	return nil
}

// ─── credit_score_logs（信用分數異動）───────────────────────────────────────

type CreditScoreLog struct {
	ID          string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	UserID      string    `gorm:"type:varchar(36);not null;index" json:"user_id"`
	Delta       int       `gorm:"not null" json:"delta"`
	Reason      string    `gorm:"size:100;not null" json:"reason"`
	ReferenceID *string   `gorm:"type:varchar(36)" json:"reference_id,omitempty"`
	ScoreAfter  int       `gorm:"not null" json:"score_after"`
	CreatedAt   time.Time `json:"created_at"`
}

func (c *CreditScoreLog) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = newUUID()
	}
	return nil
}

// ─── system_configs（系統參數）───────────────────────────────────────────────

type SystemConfig struct {
	Key         string    `gorm:"primaryKey;size:100" json:"key"`
	Value       string    `gorm:"type:text;not null" json:"value"`
	Description string    `gorm:"type:text" json:"description"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ─── password_reset_tokens（密碼重設 Token）─────────────────────────────────

type PasswordResetToken struct {
	ID        string     `gorm:"primaryKey;type:varchar(36)" json:"id"`
	UserID    string     `gorm:"type:varchar(36);not null;index" json:"user_id"`
	Token     string     `gorm:"uniqueIndex;size:64;not null" json:"token"`
	ExpiresAt time.Time  `gorm:"not null" json:"expires_at"`
	UsedAt    *time.Time `json:"used_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

func (p *PasswordResetToken) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = newUUID()
	}
	return nil
}

func (p *PasswordResetToken) IsValid() bool {
	return p.UsedAt == nil && time.Now().Before(p.ExpiresAt)
}

// ─── notifications（通知）────────────────────────────────────────────────────

type NotificationType string

const (
	NotifLike        NotificationType = "like"
	NotifComment     NotificationType = "comment"
	NotifFollow      NotificationType = "follow"
	NotifZoneApply   NotificationType = "zone_apply"
	NotifZoneApprove NotificationType = "zone_approved"
	NotifZoneReject  NotificationType = "zone_rejected"
	NotifTxUpdate    NotificationType = "tx_update"
)

type Notification struct {
	ID         string           `gorm:"primaryKey;type:varchar(36)" json:"id"`
	UserID     string           `gorm:"type:varchar(36);not null;index" json:"user_id"`
	ActorID    *string          `gorm:"type:varchar(36)" json:"actor_id,omitempty"`
	Type       NotificationType `gorm:"type:varchar(30);not null" json:"type"`
	TargetID   *string          `gorm:"type:varchar(36)" json:"target_id,omitempty"`
	TargetType *string          `gorm:"type:varchar(30)" json:"target_type,omitempty"`
	Message    string           `gorm:"size:200;not null" json:"message"`
	Read       bool             `gorm:"default:false" json:"read"`
	CreatedAt  time.Time        `json:"created_at"`
	Actor      *UserProfile     `gorm:"-" json:"actor,omitempty"`
}

func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == "" {
		n.ID = newUUID()
	}
	return nil
}
