# 竹北麻將盃 Web App

以 Vue 3 + TypeScript + Vite 建立，使用 Google Sheets API v4 作為資料來源，部署於 GitHub Pages。

## 功能特色

| 功能 | 說明 |
|------|------|
| 🔐 Google 登入 | OAuth 2.0，無須另立帳號 |
| 📝 記錄新局 | 選擇玩家、輸入台費與得分、記錄勝負結果 |
| 📋 歷史查詢 | 依季度瀏覽所有對局記錄 |
| 📊 統計分析 | 個人勝率、放槍率、自摸率、平均得分 |
| 🏠 主頁摘要 | 今日得分一覽 + 當季累計排名 |
| ⚙️ 設定 | 綁定自己的 Google Sheets，管理玩家名單 |

> 資料存放在**使用者自己的 Google Drive**，App 不保留任何伺服器端資料。

---

## 快速截圖（佔位）

> _功能截圖待補充。部署後可截圖主頁、記錄頁、統計頁各一張放在 `docs/screenshots/` 目錄，並更新此處連結。_

---

## 歷史資料匯入

若你有舊版 Excel 記錄（`竹北麻將盃.xlsx`），請參閱：

👉 [IMPORT_GUIDE.md](./IMPORT_GUIDE.md)

---

## 線上使用

部署於 GitHub Pages，URL 格式如下：

```
https://<your-github-username>.github.io/mahjong-app/
```

例如：`https://ericleejuly19.github.io/mahjong-app/`

---

## 技術架構

| 項目 | 選擇 |
|------|------|
| 前端框架 | Vue 3 + TypeScript + Vite |
| 狀態管理 | Pinia |
| 路由 | Vue Router（Hash Mode） |
| 資料存儲 | Google Sheets（使用者自己的 Google Drive）|
| 身份驗證 | Google OAuth 2.0（Google Identity Services）|
| 部署 | GitHub Pages |

---

## 環境設定

### 1. 建立 Google Cloud OAuth Client ID

1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 建立或選擇一個專案
3. 前往「APIs & Services → Credentials」
4. 點擊「Create Credentials → OAuth 2.0 Client IDs」
5. 類型選擇 **Web application**
6. 設定以下「Authorized JavaScript origins」（根據環境）：
   - 本地開發：`http://localhost:5173`
   - GitHub Pages：`https://<your-username>.github.io`
7. 複製產生的 Client ID

### 2. 啟用 Google Sheets API

1. 在同一個 Google Cloud 專案中，前往「APIs & Services → Library」
2. 搜尋並啟用「**Google Sheets API**」

### 3. 設定環境變數

```bash
# 複製範本
cp .env.example .env.local

# 編輯 .env.local，填入你的 Client ID
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

> ⚠️ `.env.local` 已加入 `.gitignore`，不會被推送至 GitHub。

---

## 本地開發

```bash
npm install
npm run dev
```

瀏覽器開啟 `http://localhost:5173/mahjong-app/`

---

## 建置與部署

```bash
# 建置
npm run build

# 部署至 GitHub Pages（需先安裝 gh-pages）
npm run deploy
```

> 確保 `vite.config.ts` 中 `base` 設為 `/mahjong-app/`，與 GitHub repository 名稱一致。

---

## 目錄結構

```
src/
├── assets/
├── composables/
│   └── useGoogleAuth.ts   # Google OAuth 2.0 composable
├── router/
│   └── index.ts           # Vue Router（含路由守衛）
├── services/
│   └── sheetsService.ts   # Google Sheets API 讀寫
├── stores/
│   ├── authStore.ts       # Pinia store（管理 access token）
│   └── appStore.ts        # Pinia store（季度資料、玩家設定）
├── types/
│   └── index.ts           # GameRecord、PlayerStats 型別定義
├── views/
│   ├── LoginView.vue      # 登入頁
│   ├── HomeView.vue       # 主頁（今日統計 + 快捷入口 + 季度摘要）
│   ├── RecordView.vue     # 記錄新局
│   ├── HistoryView.vue    # 歷史查詢
│   ├── StatsView.vue      # 統計分析
│   └── SettingsView.vue   # 設定
├── App.vue                # 根元件（含底部導覽列）
└── main.ts
```
