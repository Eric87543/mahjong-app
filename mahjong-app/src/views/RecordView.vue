<template>
  <div class="record-root">
    <header class="page-header">
      <h1>記錄新局 🀄</h1>
    </header>

    <div class="form-wrap">

      <!-- 無編輯權限提示 -->
      <div v-if="!authStore.isEditor" class="notice notice-lock">
        🔒 你目前沒有新增紀錄的權限，請聯絡管理員。
      </div>

      <!-- 未設定提示 -->
      <div v-else-if="!appStore.spreadsheetId" class="notice">
        ⚠️ 請先至「設定」頁填入 Spreadsheet ID
      </div>

      <!-- ── 步驟 1：基本資訊 ────────────────────────────── -->
      <div class="step-card">
        <div class="step-title">① 基本設定</div>

        <!-- 季度 -->
        <div class="field">
          <label class="field-label">季度</label>
          <div v-if="seasonOptions.length === 0" class="hint-text">載入中…</div>
          <select v-else v-model="season" class="select-input">
            <option v-for="s in seasonOptions" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>

        <!-- 日期 -->
        <div class="field">
          <label class="field-label">日期</label>
          <input v-model="date" type="date" class="text-input" />
        </div>

        <!-- 台費 -->
        <div class="field">
          <label class="field-label">台費</label>
          <input v-model.number="table" type="number" class="text-input" min="0" placeholder="預設 100" />
        </div>
      </div>

      <!-- ── 步驟 2：選4位出賽玩家 ───────────────────────── -->
      <div class="step-card">
        <div class="step-title">
          ② 選出賽玩家
          <span class="step-count" :class="{ ready: selectedPlayers.length === 4 }">
            {{ selectedPlayers.length }} / 4
          </span>
        </div>

        <div class="player-grid">
          <button
            v-for="p in sortedPlayers"
            :key="p.name"
            class="player-chip"
            :class="{
              selected: selectedPlayers.includes(p.name),
              disabled: selectedPlayers.length >= 4 && !selectedPlayers.includes(p.name)
            }"
            @click="togglePlayer(p.name)"
          >
            <span class="chip-name">{{ p.name }}</span>
            <span v-if="p.games > 0" class="chip-games">{{ p.games }}場</span>
          </button>
        </div>

        <!-- 新增玩家 -->
        <div v-if="!addingPlayer" class="add-player-row">
          <button class="btn-add-player" @click="addingPlayer = true" type="button">
            ＋ 新增玩家
          </button>
        </div>
        <div v-else class="add-player-input-row">
          <input
            v-model="newPlayerName"
            class="add-player-input"
            type="text"
            placeholder="輸入名稱"
            maxlength="10"
            @keyup.enter="confirmAddPlayer"
            @keyup.esc="addingPlayer = false"
            ref="newPlayerInputRef"
          />
          <button class="btn-confirm" @click="confirmAddPlayer" type="button">確認</button>
          <button class="btn-cancel" @click="addingPlayer = false" type="button">✕</button>
        </div>
      </div>

      <!-- ── 步驟 3：輸入各人得分（需先選好4人）──────────── -->
      <div class="step-card" :class="{ inactive: selectedPlayers.length < 4 }">
        <div class="step-title">③ 輸入得分</div>

        <div v-if="selectedPlayers.length < 4" class="hint-text">
          請先選好4位出賽玩家
        </div>
        <div v-else class="score-list">
          <div v-for="p in selectedPlayers" :key="p" class="score-row">
            <span class="player-name">{{ p }}</span>
            <button
              class="sign-btn"
              :class="{ negative: scores[p] !== undefined && scores[p]! < 0 }"
              @click="toggleSign(p)"
              type="button"
            >{{ scores[p] !== undefined && scores[p]! < 0 ? '−' : '+' }}</button>
            <input
              :value="scores[p] !== undefined ? Math.abs(scores[p]!) : ''"
              @input="onAbsInput(p, ($event.target as HTMLInputElement).value)"
              type="text"
              inputmode="numeric"
              class="score-input"
              placeholder="0"
            />
          </div>
        </div>

        <!-- 總和提示 -->
        <div v-if="participantCount >= 1" class="balance-row" :class="{ error: !balanceOk }">
          得分總和：<strong>{{ balance > 0 ? '+' : '' }}{{ balance }}</strong>
          <span v-if="!balanceOk"> ⚠️ 四人加台費應為 0（目前 {{ balance + table }}）</span>
          <span v-else> ✓</span>
        </div>
      </div>

      <!-- 錯誤訊息 -->
      <div v-if="submitError" class="msg-error">
        <template v-if="isPermissionError">
          🔒 你沒有編輯此 Sheet 的權限，請聯絡管理員將你的 Google 帳號加為編輯者。
        </template>
        <template v-else>❌ {{ submitError }}</template>
      </div>

      <!-- 送出 -->
      <button
        class="btn-submit"
        :disabled="!canSubmit || submitting"
        @click="submit"
      >
        {{ submitting ? '寫入中…' : '✅ 送出記錄' }}
      </button>

    </div>

    <!-- Toast -->
    <div v-if="showToast" class="toast">✅ 已記錄！</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch, nextTick } from 'vue'
import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from '@/stores/authStore'
import { generateSessionId } from '@/services/sheetsService'
import type { Session } from '@/types'

const appStore = useAppStore()
const authStore = useAuthStore()

// ── 新增玩家 ─────────────────────────────────────────────
const addingPlayer = ref(false)
const newPlayerName = ref('')
const newPlayerInputRef = ref<HTMLInputElement | null>(null)

async function confirmAddPlayer() {
  const name = newPlayerName.value.trim()
  if (!name) return
  if (!appStore.players.includes(name)) {
    appStore.setPlayers([...appStore.players, name])
  }
  newPlayerName.value = ''
  addingPlayer.value = false
}

watch(addingPlayer, async (val) => {
  if (val) {
    await nextTick()
    newPlayerInputRef.value?.focus()
  }
})

// ── 基本欄位 ─────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10)
const season = ref('')
const date = ref(today)
const table = ref(100)

// ── 季度清單 ──────────────────────────────────────────────
const seasonOptions = computed(() =>
  appStore.sheetNames.filter(n =>
    !n.includes('_detail') && !n.toLowerCase().includes('cumulative')
  )
)

// ── 玩家清單（依歷史場數排序）────────────────────────────
// 從 sessionCache 統計所有玩家的出場次數
const playerGameCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  for (const sheetData of Object.values(appStore.sessionCache)) {
    for (const s of sheetData.sessions) {
      for (const p of Object.keys(s.scores)) {
        counts[p] = (counts[p] ?? 0) + 1
      }
    }
  }
  return counts
})

const sortedPlayers = computed<{ name: string; games: number }[]>(() => {
  return appStore.players
    .map(name => ({ name, games: playerGameCounts.value[name] ?? 0 }))
    .sort((a, b) => b.games - a.games)
})

// ── 選4人 ─────────────────────────────────────────────────
const selectedPlayers = ref<string[]>([])

function togglePlayer(name: string) {
  const idx = selectedPlayers.value.indexOf(name)
  if (idx !== -1) {
    selectedPlayers.value.splice(idx, 1)
    delete (scores as Record<string, unknown>)[name]
    delete (signOverride as Record<string, unknown>)[name]
  } else if (selectedPlayers.value.length < 4) {
    selectedPlayers.value.push(name)
  }
}

// ── 各玩家得分 ────────────────────────────────────────────
const scores = reactive<Record<string, number | undefined>>({})

// 記住每位玩家的預設符號（即便尚未輸入分數也可以先切換）
const signOverride = reactive<Record<string, -1 | 1>>({})

function isNegative(player: string): boolean {
  if (scores[player] !== undefined) return scores[player]! < 0
  return signOverride[player] === -1
}

// 輸入絕對值（配合 +/- 按鈕使用）
function onAbsInput(player: string, val: string) {
  if (val === '' || val === '0') {
    delete scores[player]
    return
  }
  const n = Number(val)
  if (!isNaN(n) && n > 0) {
    const sign = isNegative(player) ? -1 : 1
    scores[player] = sign * n
  }
}

// 切換正負號（未填分數時也可切換，記入 signOverride）
function toggleSign(player: string) {
  if (scores[player] !== undefined) {
    scores[player] = -(scores[player] as number)
  } else {
    signOverride[player] = signOverride[player] === -1 ? 1 : -1
  }
}

const participantCount = computed(() =>
  selectedPlayers.value.filter(p => scores[p] !== undefined).length
)

const balance = computed(() =>
  selectedPlayers.value.reduce((acc: number, p) => acc + (scores[p] ?? 0), 0)
)

// 四人得分 + 台費 總和應為 0
const balanceOk = computed(() => balance.value + table.value === 0)

const canSubmit = computed(() =>
  !!season.value &&
  !!date.value &&
  selectedPlayers.value.length === 4 &&
  participantCount.value >= 1 &&
  balanceOk.value
)

// ── 送出 ─────────────────────────────────────────────────
const submitting = ref(false)
const submitError = ref('')
const showToast = ref(false)

const isPermissionError = computed(() =>
  submitError.value.includes('403')
)

async function submit() {
  submitting.value = true
  submitError.value = ''
  try {
    if (!appStore.sessionCache[season.value]) {
      await appStore.loadSessions(season.value)
    }
    const cached = appStore.sessionCache[season.value]
    const sessionId = generateSessionId(date.value, cached?.sessions ?? [])

    const finalScores: Record<string, number> = {}
    for (const p of selectedPlayers.value) {
      if (scores[p] !== undefined) finalScores[p] = scores[p] as number
    }

    const session: Session = {
      rowIndex: -1,
      sessionId,
      date: date.value,
      table: table.value,
      scores: finalScores,
    }

    await appStore.addSession(season.value, session)

    showToast.value = true
    setTimeout(() => { showToast.value = false }, 2000)

    // 清空得分與選人，保留日期/季度/台費
    selectedPlayers.value = []
    for (const k in scores) delete (scores as Record<string, unknown>)[k]
    submitError.value = ''
  } catch (e: unknown) {
    submitError.value = e instanceof Error ? e.message : '送出失敗，請重試。'
  } finally {
    submitting.value = false
  }
}

// ── 掛載 ──────────────────────────────────────────────────
onMounted(async () => {
  if (appStore.spreadsheetId && appStore.sheetNames.length === 0) {
    try { await appStore.loadSheetNames() } catch { /* ignore */ }
  }
  if (!season.value && seasonOptions.value.length > 0) {
    season.value = seasonOptions.value.at(-1) ?? ''
  }
  // 預載最新季度 session，用來計算玩家場數排序
  if (season.value && !appStore.sessionCache[season.value]) {
    try { await appStore.loadSessions(season.value) } catch { /* ignore */ }
  }
})

watch(seasonOptions, async (opts) => {
  if (!season.value && opts.length > 0) {
    season.value = opts.at(-1) ?? ''
  }
})

// 切換季度時重新載入 session（供玩家排序用）
watch(season, async (s) => {
  if (s && !appStore.sessionCache[s]) {
    try { await appStore.loadSessions(s) } catch { /* ignore */ }
  }
})
</script>

<style scoped>
.record-root {
  min-height: 100vh;
  padding-bottom: 80px;
  background: #f0f2f5;
}

.page-header {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  padding: 0.85rem 1rem;
}
.page-header h1 { font-size: 1.1rem; font-weight: 600; color: #1f2328; margin: 0; }

.form-wrap {
  max-width: 520px;
  margin: 0 auto;
  padding: 1rem 1rem 90px;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.notice-lock {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #991b1b;
}

.notice {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  padding: 0.65rem 0.875rem;
  font-size: 0.875rem;
  color: #9a3412;
}

/* ── Step cards ── */
.step-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.875rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: opacity 0.2s;
}
.step-card.inactive {
  opacity: 0.5;
  pointer-events: none;
}

.step-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: #57606a;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.step-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  color: #57606a;
  font-size: 0.8rem;
  font-weight: 700;
  border-radius: 99px;
  padding: 0.1rem 0.55rem;
  min-width: 2.8rem;
  transition: background 0.2s, color 0.2s;
}
.step-count.ready {
  background: #dcfce7;
  color: #166534;
}

/* ── Fields ── */
.field { display: flex; flex-direction: column; gap: 0.3rem; }
.field-label { font-size: 0.82rem; font-weight: 500; color: #57606a; }
.hint-text { font-size: 0.82rem; color: #9ca3af; padding: 0.25rem 0; }

.text-input, .select-input {
  width: 100%; padding: 0.55rem 0.7rem;
  border: 1px solid #d1d5db; border-radius: 8px;
  font-size: 0.95rem; color: #1f2328; background: #fff;
  min-height: 42px; outline: none; box-sizing: border-box;
}
.text-input:focus, .select-input:focus { border-color: #3b82d4; }

/* ── Player grid ── */
.player-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
}

.player-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
  padding: 0.5rem 0.25rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  min-height: 52px;
}
.player-chip:active { background: #f3f4f6; }
.player-chip.selected {
  border-color: #3b82d4;
  background: #eff6ff;
}
.player-chip.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.chip-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: #1f2328;
  line-height: 1.2;
  text-align: center;
  word-break: break-all;
}
.chip-games {
  font-size: 0.68rem;
  color: #9ca3af;
  line-height: 1;
}
.player-chip.selected .chip-name { color: #1d4ed8; }
.player-chip.selected .chip-games { color: #93c5fd; }

/* ── 新增玩家 ── */
.add-player-row {
  display: flex;
}
.btn-add-player {
  flex: 1;
  padding: 0.4rem 0.5rem;
  border: 1.5px dashed #d1d5db;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
}
.btn-add-player:active { background: #f3f4f6; }

.add-player-input-row {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}
.add-player-input {
  flex: 1;
  padding: 0.35rem 0.6rem;
  border: 1.5px solid #3b82d4;
  border-radius: 7px;
  font-size: 0.9rem;
  min-height: 36px;
  outline: none;
  background: #fff;
  color: #1f2328;
}
.btn-confirm {
  padding: 0.35rem 0.65rem;
  background: #3b82d4;
  color: #fff;
  border: none;
  border-radius: 7px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 36px;
  white-space: nowrap;
}
.btn-confirm:active { background: #2563ae; }
.btn-cancel {
  padding: 0.35rem 0.5rem;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  font-size: 0.85rem;
  cursor: pointer;
  min-height: 36px;
}
.btn-cancel:active { background: #e5e7eb; }

/* ── Score list ── */
.score-list {
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}
.score-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  border-bottom: 1px solid #f3f4f6;
}
.score-row:last-child { border-bottom: none; }
.player-name {
  flex: 1;
  font-size: 0.88rem;
  font-weight: 600;
  color: #1f2328;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── 正負號按鈕 ── */
.sign-btn {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  border: 2px solid #d1d5db;
  background: #f9fafb;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, background 0.15s;
}
.sign-btn:active { opacity: 0.75; }
.sign-btn.negative {
  border-color: #fca5a5;
  background: #fef2f2;
}
.sign-symbol {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1;
  color: #374151;
  user-select: none;
}
.sign-btn.negative .sign-symbol {
  color: #dc2626;
}

.score-input {
  width: 80px;
  flex-shrink: 0;
  padding: 0.3rem 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  font-size: 1rem;
  font-weight: 600;
  min-height: 38px;
  outline: none;
  text-align: right;
  background: #f9fafb;
  color: #1f2328;
  scroll-margin-top: 120px;
}
.score-input:focus { border-color: #3b82d4; background: #fff; }

/* ── Balance row ── */
.balance-row {
  font-size: 0.85rem;
  color: #166534;
  padding: 0.45rem 0.75rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
}
.balance-row.error {
  background: #fff7ed;
  border-color: #fed7aa;
  color: #9a3412;
}

/* ── 送出按鈕 ── */
.btn-submit {
  width: 100%;
  min-height: 52px;
  background: #3b82d4;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-submit:not(:disabled):active { background: #2563ae; }
.btn-submit:disabled { opacity: 0.45; cursor: not-allowed; }

.msg-error {
  font-size: 0.875rem;
  background: #fef2f2;
  color: #991b1b;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
}

/* ── Toast ── */
.toast {
  position: fixed;
  bottom: 90px; left: 50%;
  transform: translateX(-50%);
  background: #166534; color: #fff;
  padding: 0.6rem 1.5rem;
  border-radius: 24px;
  font-size: 0.95rem; font-weight: 500;
  z-index: 200; pointer-events: none;
}
</style>
