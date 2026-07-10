# 歷史資料匯入指南

## 步驟 1：上傳現有 Excel 到 Google Drive

1. 前往 Google Drive（drive.google.com）
2. 點擊「新增」→「檔案上傳」，上傳 `竹北麻將盃.xlsx`
3. 上傳完成後，右鍵點擊檔案 → 選擇「使用 Google 試算表開啟」
4. Google 會自動轉換成 Google Sheets 格式

## 步驟 2：確認現有 Sheet 格式

現有每個季度 Sheet 的 header 格式為：

```
日期 | Sum | Who | table | Eric | Harry | Lucy | DC | Poan | ...
```

App 能**直接讀取此格式**，無需修改欄位！

- `日期`：日期欄（App 自動辨識）
- `Sum | Who`：此欄會被忽略（非玩家欄）
- `table`：台費欄
- 其餘欄位：玩家姓名（自動識別為玩家欄）

> **注意**：舊格式沒有 `sessionId` 欄，App 會自動用「日期 + 行序號」產生暫時 sessionId，不影響正常功能。

## 步驟 3（可選）：升級為新格式

若你想要讓未來新增的資料支援完整的 sessionId 功能，可在 **新的季度 sheet** 使用新 header 格式：

```
date | sessionId | table | Eric | Harry | Lucy | DC | Poan | ...
```

舊季度 sheet 保持原格式也完全沒問題，App 會自動兼容。

## 步驟 4：取得 Spreadsheet ID

從瀏覽器網址列複製 ID：

```
https://docs.google.com/spreadsheets/d/【這段就是 Spreadsheet ID】/edit
```

## 步驟 5：設定 API 權限

必須在同一個 Google 帳號中，給予 App 的 OAuth Client 讀寫此試算表的權限。
（第一次登入 App 時會自動請求 `https://www.googleapis.com/auth/spreadsheets` 權限）

## 步驟 6：在 App 中設定

方法 A — 使用環境變數（推薦，適合固定綁定）：

1. 編輯 `mahjong-app/.env.local`
2. 填入 `VITE_SPREADSHEET_ID=你的-spreadsheet-id`
3. 重新 `npm run build && npm run deploy`

方法 B — App 設定頁（不需 rebuild）：

1. 開啟 App，登入 Google
2. 點擊底部「設定」tab
3. 將 Spreadsheet ID 貼入輸入框，點擊「驗證」
4. 成功後即可使用所有功能

## 支援的 Sheet 名稱規則

App 會自動過濾：
- `_detail` 結尾的 sheet（逐手細項，非必要）
- 含 `cumulative`（不區分大小寫）的 sheet

其餘 sheet 均視為「季度總結 sheet」，顯示於記錄/歷史/統計頁的季度選單中。
