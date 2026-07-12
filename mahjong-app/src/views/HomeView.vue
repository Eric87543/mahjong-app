<template>
  <div class="home-view">
    <!-- 頂部 Header -->
    <header class="page-header">
      <h2 class="page-title">竹北麻將盃 🀄</h2>
      <button class="logout-btn" @click="handleLogout">登出</button>
    </header>

    <div class="content">
      <!-- 未設定 Spreadsheet ID 提示 -->
      <div v-if="!appStore.spreadsheetId" class="notice-card">
        <p>⚠️ 請先至設定頁綁定 Google Sheets</p>
        <button class="btn-primary" @click="router.push('/settings')">前往設定</button>
      </div>

      <!-- 載入中 -->
      <div v-else-if="loading" class="loading-text">載入中…</div>

      <template v-else>
        <!-- 今日統計卡片 -->
        <section v-if="todaySessions.length > 0" class="card today-card">
          <div class="card-title">📅 今日統計（{{ todayLabel }}）</div>
          <div class="stat-row">
            <span class="stat-label">今日場次</span>
            <span class="stat-value">{{ todaySessions.length }} 場</span>
          </div>
          <div class="divider"></div>
          <div class="score-list">
            <div
              v-for="[player, score] in todayPlayerScores"
              :key="player"
              class="score-row"
            >
              <span class="player-name">{{ player }}</span>
              <span :class="['score-val', score > 0 ? 'positive' : score < 0 ? 'negative' : 'zero']">
                {{ score > 0 ? '+' : '' }}{{ score }}
              </span>
            </div>
          </div>
        </section>

        <!-- 快捷入口 -->
        <section class="card shortcuts-card">
          <div class="card-title">快捷入口</div>
          <div class="shortcuts-grid">
            <button v-if="authStore.isEditor" class="shortcut-btn" @click="router.push('/record')">
              <span class="shortcut-icon">📝</span>
              <span class="shortcut-label">記錄新局</span>
            </button>
            <button class="shortcut-btn" @click="router.push('/history')">
              <span class="shortcut-icon">📋</span>
              <span class="shortcut-label">歷史查詢</span>
            </button>
            <button class="shortcut-btn" @click="router.push('/stats')">
              <span class="shortcut-icon">📊</span>
              <span class="shortcut-label">統計分析</span>
            </button>
            <button class="shortcut-btn" @click="router.push('/settings')">
              <span class="shortcut-icon">⚙️</span>
              <span class="shortcut-label">設定</span>
            </button>
          </div>
        </section>

        <!-- 最近一季摘要 -->
        <section v-if="latestSeason && seasonTopScores.length > 0" class="card season-card">
          <div class="card-title">🏆 {{ latestSeason }} 累計得分</div>
          <div class="season-list">
            <div
              v-for="(item, idx) in seasonTopScores"
              :key="item.player"
              class="season-row"
            >
              <span class="rank">{{ rankLabel(idx) }}</span>
              <span class="player-name">{{ item.player }}</span>
              <span :class="['score-val', item.score > 0 ? 'positive' : item.score < 0 ? 'negative' : 'zero']">
                {{ item.score > 0 ? '+' : '' }}{{ item.score }}
              </span>
            </div>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGoogleAuth } from '../composables/useGoogleAuth'
import { useAppStore } from '../stores/appStore'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const { logout } = useGoogleAuth()
const appStore = useAppStore()
const authStore = useAuthStore()

const loading = ref(false)

// ─── 今日日期 ──────────────────────────────────────────────────────────────
const todayStr = new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'
const todayLabel = computed(() => {
  const d = new Date(todayStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
})

// ─── 最新季度 ──────────────────────────────────────────────────────────────
const latestSeason = computed(() => {
  const names = appStore.sheetNames.filter(n =>
    !n.includes('_detail') && !n.toLowerCase().includes('cumulative')
  )
  return names.length > 0 ? names[names.length - 1] : ''
})

const latestSessions = computed(() => {
  if (!latestSeason.value) return []
  return appStore.sessionCache[latestSeason.value]?.sessions ?? []
})

// ─── 今日記錄 ──────────────────────────────────────────────────────────────
const todaySessions = computed(() =>
  latestSessions.value.filter(s => s.date === todayStr)
)

const todayPlayerScores = computed<[string, number][]>(() => {
  const totals: Record<string, number> = {}
  for (const s of todaySessions.value) {
    for (const [p, score] of Object.entries(s.scores)) {
      totals[p] = (totals[p] ?? 0) + score
    }
  }
  return Object.entries(totals).sort((a, b) => b[1] - a[1])
})

// ─── 季度排名（全季累計前五）────────────────────────────────────────────────
const seasonTopScores = computed<{ player: string; score: number }[]>(() => {
  const totals: Record<string, number> = {}
  for (const s of latestSessions.value) {
    for (const [p, score] of Object.entries(s.scores)) {
      totals[p] = (totals[p] ?? 0) + score
    }
  }
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([player, score]) => ({ player, score }))
    .slice(0, 5)
})

function rankLabel(idx: number): string {
  return idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`
}

// ─── 初始化：載入 sheetNames + 最新季度 ───────────────────────────────────
onMounted(async () => {
  if (!appStore.spreadsheetId) return
  loading.value = true
  try {
    if (appStore.sheetNames.length === 0) {
      await appStore.loadSheetNames()
    }
    const season = latestSeason.value
    if (season && !appStore.sessionCache[season]) {
      await appStore.loadSessions(season)
    }
  } finally {
    loading.value = false
  }
})

// ─── 登出 ──────────────────────────────────────────────────────────────────
function handleLogout() {
  logout()
  router.push('/login')
}
</script>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding-bottom: 120px;
  background: #f0f2f5;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 10;
}

.page-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1f2328;
}

.logout-btn {
  font-size: 0.85rem;
  color: #57606a;
  background: none;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.3rem 0.75rem;
  cursor: pointer;
}

.logout-btn:hover {
  background: #f7f8fa;
}

.content {
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

/* ─── 通用卡片 ─────────────────────────────────────────── */
.card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  padding: 1rem 1.125rem;
}

.card-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1f2328;
  margin-bottom: 0.75rem;
}

/* ─── 提示框 ───────────────────────────────────────────── */
.notice-card {
  background: #fff;
  border: 1px solid #f59e0b;
  border-radius: 10px;
  padding: 1rem 1.125rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  color: #92400e;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.btn-primary {
  align-self: flex-start;
  background: #3b82d4;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.4rem 1rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.btn-primary:hover {
  background: #2563eb;
}

/* ─── 載入文字 ─────────────────────────────────────────── */
.loading-text {
  text-align: center;
  color: #57606a;
  margin-top: 2rem;
  font-size: 0.95rem;
}

/* ─── 今日統計 ─────────────────────────────────────────── */
.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  padding: 0.2rem 0;
}

.stat-label {
  color: #57606a;
}

.stat-value {
  font-weight: 600;
}

.divider {
  height: 1px;
  background: #e5e7eb;
  margin: 0.6rem 0;
}

.score-list,
.season-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.score-row,
.season-row {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  gap: 0.5rem;
}

.rank {
  width: 1.6rem;
  text-align: center;
  font-size: 0.95rem;
}

.player-name {
  flex: 1;
  color: #1f2328;
}

.score-val {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.positive { color: #16a34a; }
.negative { color: #dc2626; }
.zero     { color: #57606a; }

/* ─── 快捷入口 ─────────────────────────────────────────── */
.shortcuts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.625rem;
}

.shortcut-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  background: #f7f8fa;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem 0.5rem;
  cursor: pointer;
  transition: background 0.15s;
}

.shortcut-btn:hover {
  background: #eef0f3;
}

.shortcut-icon {
  font-size: 1.6rem;
  line-height: 1;
}

.shortcut-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #1f2328;
}
</style>
