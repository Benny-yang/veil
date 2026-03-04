# Veil API

Veil 平台後端服務，使用 Go + Gin + GORM + MySQL 構建。

## 技術棧

- **語言**：Go 1.25
- **框架**：Gin
- **ORM**：GORM + MySQL 8
- **認證**：JWT（access + refresh token）
- **Email**：Resend

## 專案結構

```
veil-api/
├── cmd/server/main.go       # 進入點、路由設定
├── internal/
│   ├── auth/                # 認證（register, login, refresh, password reset）
│   ├── user/                # 用戶資料、追蹤
│   ├── post/                # 社群貼文
│   ├── work/                # 作品集
│   ├── zone/                # 私藏空間
│   ├── chat/                # 聊天 & 交易
│   ├── review/              # 評價
│   ├── credit/              # 信用分數
│   ├── media/               # 媒體上傳
│   ├── model/               # GORM 資料模型
│   ├── middleware/          # JWT 驗證 middleware
│   ├── config/              # 環境設定讀取
│   └── email/               # Email 寄送
├── pkg/
│   ├── database/            # DB 初始化
│   ├── response/            # 統一回應格式
│   └── tagging/             # Hashtag 抽取
├── testutil/                # 整合測試共用工具
├── .env.development         # 開發環境設定
├── .env.test                # 測試環境設定（指向 veil_test DB）
└── .env.production          # 正式環境設定
```

## 環境設定

複製對應環境的 `.env.example`：

```bash
cp .env.example .env.development
```

## 啟動方式

```bash
APP_ENV=development go run ./cmd/server/main.go
```

## 管理者後台

管理者後台整合在同一個 server 中，以靜態 SPA 方式提供。

### 環境變數

| 變數 | 說明 | 預設值 |
|---|---|---|
| `ADMIN_USERNAME` | 管理者帳號（啟動時 auto seed） | `admin` |
| `ADMIN_PASSWORD` | 管理者密碼 | `admin1234` |
| `ADMIN_UI_PATH` | 後台前端入口路徑 **（生產環境請改為不易猜測的字串）** | `/manage-panel` |

### 本機開發

```bash
cd ../veil-admin && npm run dev   # http://localhost:5175
```

### GCP 部署（與 veil-api 同一個 Cloud Run）

Dockerfile 中需先 build admin 前端，路徑需與 `ADMIN_UI_PATH` 一致：

```dockerfile
# ── 1. Build veil-admin ────────────────────────────────
FROM node:20-alpine AS admin-builder
WORKDIR /admin
COPY veil-admin/package*.json ./
RUN npm ci
COPY veil-admin .
# VITE_BASE_PATH 必須和 ADMIN_UI_PATH 相同
ARG ADMIN_UI_PATH=/m-x8k2qp9v
ENV VITE_BASE_PATH=$ADMIN_UI_PATH
RUN npm run build

# ── 2. Go build ───────────────────────────────────────
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o server ./cmd/server

# ── 3. Final image ────────────────────────────────────
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/server .
COPY --from=admin-builder /admin/dist ./admin-dist
CMD ["./server"]
```

Cloud Run 環境變數需設定：
```
ADMIN_UI_PATH=/m-x8k2qp9v   # 與 ARG ADMIN_UI_PATH 相同
ADMIN_USERNAME=<your-admin>
ADMIN_PASSWORD=<strong-password>
```



### 前置需求

在本機 MySQL 建立測試專用資料庫（只需執行一次）：

```sql
CREATE DATABASE IF NOT EXISTS veil_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 執行全部整合測試

```bash
APP_ENV=test go test ./internal/... -v -count=1 -timeout=120s
```

### 執行單一模組測試

```bash
# Auth 模組（12 個案例）
APP_ENV=test go test ./internal/auth/... -v -count=1

# User 模組（11 個案例）
APP_ENV=test go test ./internal/user/... -v -count=1

# Work 模組（8 個案例）
APP_ENV=test go test ./internal/work/... -v -count=1

# Post 模組（14 個案例）
APP_ENV=test go test ./internal/post/... -v -count=1
```

### 測試策略

- 使用 **真實 MySQL**（`veil_test` DB），涵蓋實際 GORM 行為
- 每個測試前呼叫 `TruncateAll` 清空資料，互不污染
- 使用 `httptest.NewRecorder`，不需啟動真實 server
- 測試涵蓋：正常流程、邊界條件、錯誤路徑（Forbidden、Conflict、NotFound）

### 測試覆蓋範圍（共 45 個案例）

| 模組 | 覆蓋功能 |
|---|---|
| **auth** | register（5）、login（3）、refresh（2）、me（2） |
| **user** | GetProfile（2）、GetMe（1）、UpdateMe（2）、Follow（3）、Unfollow（2）、GetFollowers（1） |
| **work** | CreateWork（2）、GetWorks（1）、UpdateWork（2）、DeleteWork（3） |
| **post** | GetFeed（1）、CreatePost（2）、GetPost（2）、DeletePost（2）、Like（3）、Comments（4） |

## API 文件

API 採統一回應格式：

```json
{
  "success": true,
  "data": { ... }
}
```

錯誤格式：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "..."
  }
}
```

### 主要端點

| Method | Path | 描述 |
|---|---|---|
| POST | `/api/v1/auth/register` | 註冊 |
| POST | `/api/v1/auth/login` | 登入 |
| POST | `/api/v1/auth/refresh` | 更新 Token |
| GET | `/api/v1/users/:username` | 查看用戶 |
| POST | `/api/v1/users/me/works` | 建立作品 |
| GET | `/api/v1/feed` | 取得社群 Feed |
| POST | `/api/v1/zones` | 建立私藏空間 |
| POST | `/api/v1/zones/:zoneId/apply` | 申請進入 Zone |
| GET | `/api/v1/chats/zones` | 我的 Zone 聊天室 |
