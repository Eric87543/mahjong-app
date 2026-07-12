# Fix: 送出按鈕被遮住 & 登入頁 emoji 版面問題

## Top-Level Overview

修正兩個 UI 問題：
1. **RecordView 的「送出記錄」按鈕被底部導覽列遮住**，導致使用者看不到也點不到按鈕。
2. **LoginView 的 🀄 emoji 與「竹北麻將盃」文字重疊**，原因是某些裝置（iOS/macOS Safari）對麻將牌 emoji 的渲染高度異常，加上 `margin-bottom` 不足以撐開間距。

修改範圍：僅限 CSS，不涉及邏輯變更。

---

## Sub-Tasks

### Sub-Task 1：修正 RecordView 按鈕被底部導覽列遮住

- **Intent**：讓「送出記錄」按鈕在畫面最底部時，不被固定的底部導覽列（約 56px 高）覆蓋。
- **Expected Outcomes**：
  - 頁面滾到底部後，「送出記錄」按鈕完整可見、可點擊，不被導覽列蓋住。
- **Todo List**：
  1. 在 `RecordView.vue` 的 `.form-wrap` 加上 `padding-bottom: 80px`（與 `.record-root` 一致，確保內容不被遮）。
- **Relevant Context**：
  - 檔案：`mahjong-app/src/views/RecordView.vue`
  - 問題位置：`.form-wrap` 樣式（第 282–289 行）
  - 底部導覽列在 `App.vue` 中定義，高度約 56px（padding + item 高度）
- **Status**：[ ] pending

---

### Sub-Task 2：修正 LoginView emoji 與標題文字重疊

- **Intent**：讓 🀄 emoji 與「竹北麻將盃」標題之間保持足夠的視覺間距，避免在 iOS/macOS Safari 上重疊。
- **Expected Outcomes**：
  - 🀄 emoji 和「竹北麻將盃」文字在所有裝置上清楚分開，不重疊。
- **Todo List**：
  1. 在 `LoginView.vue` 的 `.logo` 增加 `line-height: 1` 和加大 `margin-bottom`（建議 `1rem`）。
  2. 確保 `.logo` 的 `display: block`，避免 inline 造成的行高影響。
- **Relevant Context**：
  - 檔案：`mahjong-app/src/views/LoginView.vue`
  - 問題位置：`.logo` 樣式（第 50–53 行）
- **Status**：[ ] pending
