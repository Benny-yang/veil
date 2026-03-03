# Veil 資料庫 Schema 規劃

> 版本：v0.1｜建立日期：2026-03-02  
> 資料庫：PostgreSQL｜ORM：依後端技術選型  
> 命名慣例：`snake_case`，主鍵一律 `UUID`

---

## 關聯圖（ER 概覽）

```
users ──< user_profiles
users ──< works ──< work_photos
               ──< work_tags ──> tags
users ──< posts ──< post_images
                ──< post_likes
                ──< post_comments
                ──< post_tags ──> tags
users ──< zones ──< zone_photos
               ──< zone_tags ──> tags
               ──< zone_applications ──< transactions ──< reviews
users ──< chats ──< chat_messages
users ──< follows
users ──< user_verification
users ──< credit_score_logs
system_configs
```

---

## 一、users（認證帳號）

> 僅存放登入相關欄位，不含任何公開顯示資料。

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID PK | 主鍵 |
| `email` | VARCHAR(255) UNIQUE | 登入信箱 |
| `password_hash` | VARCHAR | bcrypt 雜湊 |
| `onboarding_completed` | BOOLEAN DEFAULT false | 是否完成 Onboarding |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## 一-B、user_profiles（個人資料）

> 與 `users` 1:1 對應，儲存所有公開與顯示資料。

| 欄位 | 類型 | 說明 |
|------|------|------|
| `user_id` | UUID PK FK → users | 主鍵兼外鍵 |
| `username` | VARCHAR(50) UNIQUE | 帳號名稱（唯讀） |
| `display_name` | VARCHAR(100) | 顯示名稱 |
| `bio` | TEXT | 自我介紹（200 字以內） |
| `avatar_url` | VARCHAR | CDN 頭貼連結（nullable） |
| `avatar_color` | VARCHAR(7) DEFAULT '#E8DDD0' | 無頭貼時的預設色塊顏色（hex） |
| `phone` | VARCHAR(20) | 綁定手機（SMS 驗證後寫入） |
| `credit_score` | INTEGER DEFAULT 60 | 信用分數（冗餘，加速查詢） |
| `follower_count` | INTEGER DEFAULT 0 | 粉絲數（冗餘） |
| `following_count` | INTEGER DEFAULT 0 | 追蹤數（冗餘） |
| `deal_count` | INTEGER DEFAULT 0 | 完成交易數（冗餘） |
| `rating` | DECIMAL(2,1) | 平均評分（冗餘） |
| `updated_at` | TIMESTAMPTZ | |

> **設計說明：** `users` 負責認證，未來可直接新增 `user_auth_providers` 表支援 Google / Apple OAuth，不需改動 `user_profiles`。


---

## 二、user_verification（驗證資料）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `type` | ENUM(`real_person`, `sms`) | 驗證類型 |
| `status` | ENUM(`none`, `pending`, `verified`, `failed`) | 當前狀態 |
| `platform` | VARCHAR | 真人驗證：社群平台名稱 |
| `profile_url` | VARCHAR | 真人驗證：個人頁連結 |
| `photo_url` | VARCHAR | 真人驗證：自拍照 CDN 連結 |
| `failure_reason` | TEXT | 審核未通過原因 |
| `reviewed_by` | UUID FK → users (nullable) | 審核管理員（後台） |
| `submitted_at` | TIMESTAMPTZ | 最後提交時間 |
| `reviewed_at` | TIMESTAMPTZ | 審核時間 |

---

## 三、follows（追蹤關係）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `follower_id` | UUID FK → users | 追蹤者 |
| `following_id` | UUID FK → users | 被追蹤者 |
| `created_at` | TIMESTAMPTZ | |

> 主鍵：`(follower_id, following_id)` 複合主鍵

---

## 四、works（作品）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | 作品所有人 |
| `description` | TEXT | 描述（含 #tag） |
| `cover_url` | VARCHAR | 封面照 CDN 連結 |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### work_photos（作品多圖）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID PK | |
| `work_id` | UUID FK → works | |
| `url` | VARCHAR | CDN 連結 |
| `sort_order` | INTEGER | 排序 |
| `is_cover` | BOOLEAN DEFAULT false | 是否為封面 |

---

## 五、posts（首頁貼文）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | 發文者 |
| `description` | TEXT | 貼文描述 |
| `like_count` | INTEGER DEFAULT 0 | 按讚數（冗餘） |
| `comment_count` | INTEGER DEFAULT 0 | 留言數（冗餘） |
| `created_at` | TIMESTAMPTZ | |

### post_images（貼文圖片）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID PK | |
| `post_id` | UUID FK → posts | |
| `url` | VARCHAR | CDN 連結 |
| `sort_order` | INTEGER | 圖片排序 |

### post_likes（按讚）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `user_id` | UUID FK → users | |
| `post_id` | UUID FK → posts | |
| `created_at` | TIMESTAMPTZ | |

> 主鍵：`(user_id, post_id)`

### post_comments（留言）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID PK | |
| `post_id` | UUID FK → posts | |
| `user_id` | UUID FK → users | |
| `content` | TEXT | 留言內容 |
| `created_at` | TIMESTAMPTZ | |

---

## 六、zones（私藏空間）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID PK | |
| `seller_id` | UUID FK → users | 開團賣家 |
| `title` | VARCHAR(100) | Zone 標題 |
| `description` | TEXT | 描述 |
| `total_slots` | INTEGER | 總名額 |
| `accepted_count` | INTEGER DEFAULT 0 | 已通過申請數（冗餘） |
| `min_credit_score` | INTEGER | 最低信用分數門檻（0 = 無限制） |
| `ends_at` | TIMESTAMPTZ | 截止時間 |
| `status` | ENUM(`active`, `ended`) | Zone 狀態 |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### zone_photos（Zone 私藏照片）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID PK | |
| `zone_id` | UUID FK → zones | |
| `url` | VARCHAR | CDN 連結 |
| `sort_order` | INTEGER | 排序 |
| `is_cover` | BOOLEAN DEFAULT false | 是否為 Zone 封面 |

---

## 六-B、tags + 關聯表

### tags（標籤）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID PK | |
| `name` | VARCHAR(50) UNIQUE | 標籤名稱（小寫，不含 #） |
| `usage_count` | INTEGER DEFAULT 0 | 使用次數（冗餘，用於熱門排行） |
| `created_at` | TIMESTAMPTZ | |

### post_tags（貼文標籤）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `post_id` | UUID FK → posts | |
| `tag_id` | UUID FK → tags | |

> 主鍵：`(post_id, tag_id)`

### work_tags（作品標籤）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `work_id` | UUID FK → works | |
| `tag_id` | UUID FK → tags | |

> 主鍵：`(work_id, tag_id)`

### zone_tags（Zone 標籤）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `zone_id` | UUID FK → zones | |
| `tag_id` | UUID FK → tags | |

> 主鍵：`(zone_id, tag_id)`

> **設計說明：**
> - 寫入時解析描述/標題中的 `#xxx`，正規化後 upsert 進 `tags`，再寫中間表
> - 刪除貼文/作品/Zone 時，刪除中間表記錄並 `usage_count - 1`
> - 搜尋時 `SELECT posts.* FROM posts JOIN post_tags pt ON ... JOIN tags t ON t.name = 'vintage'`

---

## 七、zone_applications（Zone 申請）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID PK | |
| `zone_id` | UUID FK → zones | |
| `applicant_id` | UUID FK → users | 申請者 |
| `intro` | TEXT | 申請理由/自我介紹 |
| `status` | ENUM(`pending`, `approved`, `rejected`) | 審核狀態 |
| `applied_at` | TIMESTAMPTZ | 申請時間 |
| `reviewed_at` | TIMESTAMPTZ | 審核時間 |

---

## 八、transactions（交易）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID PK | |
| `application_id` | UUID FK → zone_applications | 來源申請 |
| `buyer_id` | UUID FK → users | 買家 |
| `seller_id` | UUID FK → users | 賣家 |
| `status` | ENUM(`pending`, `shipping`, `received`, `completed`, `cancelled`) | 交易狀態 |
| `status_updated_at` | TIMESTAMPTZ | **狀態最後更新時間（超時計算用）** |
| `buyer_reviewed` | BOOLEAN DEFAULT false | 買家是否已評價 |
| `seller_reviewed` | BOOLEAN DEFAULT false | 賣家是否已評價 |
| `created_at` | TIMESTAMPTZ | |

---

## 九、reviews（評價）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID PK | |
| `transaction_id` | UUID FK → transactions | |
| `reviewer_id` | UUID FK → users | 評價者 |
| `reviewee_id` | UUID FK → users | 被評價者 |
| `stars` | SMALLINT (1-5) | 星數 |
| `content` | TEXT | 評價內容 |
| `reviewer_role` | ENUM(`buyer`, `seller`) | 評價者角色 |
| `created_at` | TIMESTAMPTZ | |

---

## 十、chats（聊天室）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID PK | |
| `type` | ENUM(`zone`, `dm`) | Zone 對話 or 私訊 |
| `zone_id` | UUID FK → zones (nullable) | Zone 對話時關聯 |
| `application_id` | UUID FK → zone_applications (nullable) | Zone 對話關聯申請 |
| `created_at` | TIMESTAMPTZ | |

### chat_participants（聊天室成員）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `chat_id` | UUID FK → chats | |
| `user_id` | UUID FK → users | |
| `last_read_at` | TIMESTAMPTZ | 最後已讀時間（用於未讀數計算） |

> 主鍵：`(chat_id, user_id)`

### chat_messages（訊息）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID PK | |
| `chat_id` | UUID FK → chats | |
| `sender_id` | UUID FK → users | |
| `type` | ENUM(`text`, `image`) | 訊息類型 |
| `content` | TEXT | 文字內容（type=text） |
| `media_url` | VARCHAR | 圖片連結（type=image） |
| `created_at` | TIMESTAMPTZ | |

---

## 十一、credit_score_logs（信用分數異動紀錄）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `delta` | INTEGER | 分數變化（正/負） |
| `reason` | VARCHAR | 異動原因（如：`transaction_completed`、`review_received_5_stars`） |
| `reference_id` | UUID | 來源 ID（可為 transaction_id、review_id 等） |
| `score_after` | INTEGER | 異動後分數 |
| `created_at` | TIMESTAMPTZ | |

---

## 十二、system_configs（系統參數）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `key` | VARCHAR PRIMARY KEY | 參數鍵 |
| `value` | TEXT | 參數值（JSON 字串） |
| `description` | TEXT | 描述 |
| `updated_at` | TIMESTAMPTZ | |

**預設參數範例：**

| key | value | 說明 |
|-----|-------|------|
| `tx_timeout_days` | `{"pending":3,"shipping":10,"received":5}` | 各狀態超時天數 |
| `credit_score_init` | `60` | 新用戶初始信用分數 |
| `credit_score_max` | `100` | 信用分數上限 |
