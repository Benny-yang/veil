# Veil API 規劃文件

> 版本：v0.1｜建立日期：2026-03-02  
> 本文件依照現有前端功能模組整理所需後端 API，尚未實作。

---

## 通用規範

| 項目 | 說明 |
|------|------|
| Base URL | `https://api.veil.tw/v1` |
| 驗證方式 | `Authorization: Bearer <JWT>` |
| 回應格式 | `{ "data": {}, "error": null }` |
| 分頁格式 | `{ "items": [], "total": 100, "page": 1, "pageSize": 20 }` |

---

## 一、認證 Auth

| 方法 | 路徑 | 說明 |
|------|------|------|
| `POST` | `/auth/register` | 電子郵件 + 密碼 註冊 |
| `POST` | `/auth/login` | 電子郵件 + 密碼 登入，回傳 JWT |
| `POST` | `/auth/logout` | 登出（伺服器端讓 token 失效） |
| `POST` | `/auth/refresh` | 刷新 access token |
| `POST` | `/auth/password/reset-request` | 寄送重設密碼信 |
| `POST` | `/auth/password/reset` | 用 token 重設密碼 |

---

## 二、使用者 / 個人設定

### 2-1 個人資料

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/users/:username` | 取得指定用戶公開資料（顯示名稱、bio、追蹤數、評分） |
| `GET` | `/users/me` | 取得自己的完整資料（含私密欄位） |
| `PATCH` | `/users/me` | 更新個人資料（displayName、bio） |
| `PUT` | `/users/me/avatar` | 上傳大頭貼（multipart/form-data） |

### 2-2 帳號管理

| 方法 | 路徑 | 說明 |
|------|------|------|
| `PATCH` | `/users/me/password` | 修改登入密碼（需帶 currentPassword + newPassword） |

### 2-3 真人驗證

| 方法 | 路徑 | 說明 |
|------|------|------|
| `POST` | `/users/me/verification/real-person` | 提交驗證資料（platform、profileUrl、photo multipart） |
| `GET` | `/users/me/verification/real-person` | 查詢當前驗證狀態（none / pending / verified / failed + failureReason） |

### 2-4 簡訊驗證

| 方法 | 路徑 | 說明 |
|------|------|------|
| `POST` | `/users/me/verification/sms/send` | 發送驗證碼至手機 |
| `POST` | `/users/me/verification/sms/verify` | 驗證驗證碼，綁定手機號碼 |

### 2-5 追蹤

| 方法 | 路徑 | 說明 |
|------|------|------|
| `POST` | `/users/:username/follow` | 追蹤用戶 |
| `DELETE` | `/users/:username/follow` | 取消追蹤 |
| `GET` | `/users/:username/followers` | 取得粉絲清單（分頁） |
| `GET` | `/users/:username/following` | 取得追蹤中清單（分頁） |

---

## 三、作品 Works（個人頁作品牆）

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/users/:username/works` | 取得用戶作品列表（分頁） |
| `POST` | `/users/me/works` | 新增作品（商品名稱、描述、標籤、照片） |
| `PATCH` | `/works/:workId` | 編輯作品資訊 |
| `DELETE` | `/works/:workId` | 刪除作品 |

---

## 四、貼文 Posts（首頁 Feed）

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/feed` | 取得關注者貼文 Feed（分頁） |
| `POST` | `/posts` | 建立新貼文（圖片、描述、標籤） |
| `GET` | `/posts/:postId` | 取得貼文詳情（含留言） |
| `DELETE` | `/posts/:postId` | 刪除貼文（本人） |
| `POST` | `/posts/:postId/like` | 按讚 |
| `DELETE` | `/posts/:postId/like` | 取消按讚 |
| `GET` | `/posts/:postId/comments` | 取得貼文留言（分頁） |
| `POST` | `/posts/:postId/comments` | 新增留言 |
| `DELETE` | `/posts/:postId/comments/:commentId` | 刪除留言（本人或貼文主） |

---

## 五、私藏空間 Zones

### 5-1 探索（Explore）

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/zones` | 取得公開 Zone 列表（支援 filter: all / expiring / available / trusted、分頁） |
| `GET` | `/zones/:zoneId` | 取得 Zone 詳情 |

### 5-2 我的 Zone（PrivateCollection - 我開的）

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/users/me/zones` | 取得自己開的 Zone 列表（active / ended） |
| `POST` | `/zones` | 建立新 Zone（標題、描述、名額、截止日、最低信用門檻、私藏照片） |
| `PATCH` | `/zones/:zoneId` | 編輯 Zone 資訊 |
| `DELETE` | `/zones/:zoneId` | 刪除 Zone（未開始時可刪） |

### 5-3 申請 Zone（PrivateCollection - 我申請的）

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/users/me/applications` | 取得自己提出的申請列表（分頁、含申請狀態） |
| `POST` | `/zones/:zoneId/apply` | 申請加入 Zone（帶自我介紹文字） |
| `DELETE` | `/zones/:zoneId/apply` | 撤銷自己的申請 |

### 5-4 審核申請（ReviewApplications）

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/zones/:zoneId/applications` | 取得某 Zone 的申請者列表（含信用分數） |
| `PATCH` | `/zones/:zoneId/applications/:appId` | 通過 / 拒絕某申請（status: approved / rejected） |

---

## 六、聊天 Chat

### 6-1 對話列表

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/chats/zones` | 取得 Zone 相關對話列表（依 Zone 分組） |
| `GET` | `/chats/dm` | 取得私訊列表（DM） |

### 6-2 訊息

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/chats/:chatId/messages` | 取得聊天室訊息（分頁） |
| `POST` | `/chats/:chatId/messages` | 傳送訊息（text / image） |
| `PATCH` | `/chats/:chatId/read` | 標記訊息為已讀 |

> **即時推送**：訊息功能建議搭配 WebSocket（`wss://api.veil.tw/v1/ws`）以達成即時通知。

### 6-3 交易狀態（Transaction）

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/chats/:chatId/transaction` | 取得該聊天室的交易狀態 |
| `PATCH` | `/chats/:chatId/transaction` | 推進交易狀態（pending→shipping→received→completed / cancelled） |

---

## 七、評價 Reviews

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/users/:username/reviews` | 取得用戶評價列表（type: buyer / seller、分頁） |
| `POST` | `/transactions/:txId/review` | 提交評價（stars 1-5、text） |

### 評價解鎖條件（後端驗證）

評價提交需符合以下**任一條件**：
1. `transaction.status === 'completed'`（正常完成）
2. `now - transaction.statusUpdatedAt >= TIMEOUT_DAYS[transaction.status]`（當前狀態停滯超時）

**各狀態超時設定（建議值，可由後台調整）：**

| 狀態 | 說明 | 超時天數 |
|------|------|---------|
| `pending` | 等待賣家確認/付款 | 3 天 |
| `shipping` | 商品寄送中 | 10 天 |
| `received` | 等待買家確認收貨 | 5 天 |
| `completed` | 已完成，直接開放評價 | — |
| `cancelled` | 已取消，不開放評價 | — |

> 建議將此 Map 設為**後台可設定的系統參數**，方便日後調整而不需改程式碼。


### 交易記錄必要欄位

```
Transaction {
  id
  status           // pending | shipping | received | completed | cancelled
  statusUpdatedAt  // 每次狀態變更時更新（用於超時判斷）
  createdAt
  buyerReviewed    // boolean
  sellerReviewed   // boolean
}
```

> `statusUpdatedAt` 在每次 `PATCH /chats/:chatId/transaction` 更新 status 時，後端應自動刷新此欄位，前端無需傳入。


---

## 八、信用分數 Credit Score

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/users/:username/credit` | 取得信用分數與分數明細（唯讀，系統由後端計算） |

---

## 九、媒體上傳

| 方法 | 路徑 | 說明 |
|------|------|------|
| `POST` | `/media/upload` | 通用媒體上傳（回傳 CDN URL），供頭貼、作品、Zone 私藏照片、驗證照等使用 |

---

## 十、Onboarding

| 方法 | 路徑 | 說明 |
|------|------|------|
| `POST` | `/users/me/onboarding` | 完成 Onboarding 流程（設定顯示名稱、bio、大頭貼、驗證狀態），標記 `onboardingCompleted = true` |

---

## 附錄：狀態碼說明

| 狀態碼 | 說明 |
|--------|------|
| `200` | 成功 |
| `201` | 建立成功 |
| `400` | 請求格式錯誤 |
| `401` | 未登入 / Token 過期 |
| `403` | 無操作權限 |
| `404` | 資源不存在 |
| `409` | 衝突（如重複申請、帳號已存在） |
| `422` | 資料驗證失敗 |
| `500` | 伺服器內部錯誤 |
