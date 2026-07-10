<template>
  <div class="settings-root">
    <header class="page-header">
      <h1>設定</h1>
    </header>

    <main class="settings-main">
      <!-- ── Spreadsheet ID 區塊 ── -->
      <section class="card">
        <h2 class="section-title">Google Spreadsheet</h2>
        <p class="section-desc">
          請輸入 Google Sheets 的 Spreadsheet ID（網址 <code>/d/</code> 之後的那段）。
        </p>
        <div class="input-row">
          <input
            v-model="sheetIdInput"
            class="text-input"
            type="text"
            placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
            spellcheck="false"
            autocomplete="off"
          />
        </div>
        <button
          class="btn btn-primary"
          :disabled="verifying || !sheetIdInput.trim()"
          @click="verifySheet"
        >
          {{ verifying ? '驗證中…' : '驗證並連結' }}
        </button>

        <p v-if="verifySuccess" class="msg msg-success">
          ✅ 已連結：找到 {{ sheetCount }} 個季度
        </p>
        <p v-if="verifyError" class="msg msg-error">
          ❌ {{ verifyError }}
        </p>
      </section>

      <!-- ── 玩家管理區塊 ── -->
      <section class="card">
        <h2 class="section-title">玩家管理</h2>
        <p class="section-desc">記錄局數時可快速選取的玩家名單。</p>

        <div class="player-list" v-if="appStore.players.length">
          <span
            v-for="(player, idx) in appStore.players"
            :key="player"
            class="player-badge"
          >
            {{ player }}
            <button class="badge-del" @click="removePlayer(idx)" aria-label="刪除">✕</button>
          </span>
        </div>
        <p v-else class="empty-hint">尚無玩家，請新增。</p>

        <div class="input-row add-row">
          <input
            v-model="newPlayerName"
            class="text-input"
            type="text"
            placeholder="輸入玩家名稱"
            maxlength="20"
            @keyup.enter="addPlayer"
          />
          <button
            class="btn btn-secondary"
            :disabled="!newPlayerName.trim()"
            @click="addPlayer"
          >
            新增
          </button>
        </div>

        <div class="actions-row">
          <button class="btn btn-ghost" @click="resetToDefaults">恢復預設名單</button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/stores/appStore'

const appStore = useAppStore()

// ── Spreadsheet 驗證 ──────────────────────────────────────
const sheetIdInput = ref(appStore.spreadsheetId)
const verifying = ref(false)
const verifySuccess = ref(false)
const verifyError = ref('')
const sheetCount = ref(0)

async function verifySheet() {
  const id = sheetIdInput.value.trim()
  if (!id) return
  verifying.value = true
  verifySuccess.value = false
  verifyError.value = ''
  try {
    appStore.setSpreadsheetId(id)
    await appStore.loadSheetNames()
    sheetCount.value = appStore.sheetNames.length
    verifySuccess.value = true
  } catch (e: unknown) {
    appStore.setSpreadsheetId('')
    verifyError.value = e instanceof Error ? e.message : '無法存取，請確認 ID 及授權。'
  } finally {
    verifying.value = false
  }
}

// ── 玩家管理 ────────────────────────────────────────────────
const newPlayerName = ref('')
const DEFAULT_PLAYERS = [
  'Eric', 'Harry', 'Lucy', 'DC', 'Poan', 'Teddy', 'Fred', 'Eagle',
  'Tina', 'Roger', 'Jasmine', 'Zhong', 'Nick', 'Evans', 'Ted',
  'steven', 'chris', 'winston', '小宇', '丸子', '雅馨', '大哥', 'Gary',
]

function addPlayer() {
  const name = newPlayerName.value.trim()
  if (!name) return
  if (appStore.players.includes(name)) return
  appStore.setPlayers([...appStore.players, name])
  newPlayerName.value = ''
}

function removePlayer(idx: number) {
  const updated = [...appStore.players]
  updated.splice(idx, 1)
  appStore.setPlayers(updated)
}

function resetToDefaults() {
  appStore.setPlayers([...DEFAULT_PLAYERS])
}

// 若 spreadsheetId 已存在但 sheetNames 未載入，自動載入
onMounted(async () => {
  if (appStore.spreadsheetId && appStore.sheetNames.length === 0) {
    try {
      await appStore.loadSheetNames()
      sheetCount.value = appStore.sheetNames.length
      verifySuccess.value = true
    } catch {
      // ignore silently on mount
    }
  } else if (appStore.sheetNames.length > 0) {
    sheetCount.value = appStore.sheetNames.length
    verifySuccess.value = true
  }
})
</script>

<style scoped>
.settings-root {
  min-height: 100vh;
  padding-bottom: 80px; /* 底部導覽列高度 */
  background: #f0f2f5;
}

.page-header {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 1rem 0.75rem;
}

.page-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2328;
}

.settings-main {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 600px;
  margin: 0 auto;
}

.card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2328;
}

.section-desc {
  font-size: 0.85rem;
  color: #57606a;
  line-height: 1.5;
}

.section-desc code {
  font-family: monospace;
  background: #f7f8fa;
  padding: 0.1em 0.3em;
  border-radius: 4px;
  font-size: 0.8em;
}

.input-row {
  display: flex;
  gap: 0.5rem;
}

.text-input {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #1f2328;
  background: #fff;
  min-height: 44px;
  outline: none;
}

.text-input:focus {
  border-color: #3b82d4;
}

.btn {
  min-height: 44px;
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82d4;
  color: #fff;
  width: 100%;
}

.btn-primary:not(:disabled):active {
  background: #2563ae;
}

.btn-secondary {
  background: #3b82d4;
  color: #fff;
  white-space: nowrap;
}

.btn-secondary:not(:disabled):active {
  background: #2563ae;
}

.btn-ghost {
  background: transparent;
  color: #57606a;
  border: 1px solid #d1d5db;
  font-size: 0.85rem;
  padding: 0.4rem 1rem;
  min-height: 40px;
}

.msg {
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
}

.msg-success {
  background: #ecfdf5;
  color: #166534;
}

.msg-error {
  background: #fef2f2;
  color: #991b1b;
}

.player-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.player-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
  border-radius: 20px;
  padding: 0.25rem 0.6rem 0.25rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.badge-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  font-size: 0.75rem;
  padding: 0;
  line-height: 1;
  border-radius: 50%;
  width: 18px;
  height: 18px;
}

.badge-del:hover {
  background: #dbeafe;
  color: #1d4ed8;
}

.empty-hint {
  font-size: 0.875rem;
  color: #9ca3af;
  text-align: center;
  padding: 0.5rem 0;
}

.add-row {
  align-items: stretch;
}

.actions-row {
  display: flex;
  justify-content: flex-end;
}
</style>
