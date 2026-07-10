<template>
  <div class="history-view">
    <!-- 季度 tabs（只顯示總結 sheet，過濾掉 _detail / _Cumulative） -->
    <div class="season-tabs-wrap">
      <div class="season-tabs">
        <button
          v-for="name in seasonSheetNames"
          :key="name"
          class="tab-btn"
          :class="{ active: selectedSeason === name }"
          @click="switchSeason(name)"
        >{{ name }}</button>
      </div>
    </div>

    <!-- 載入中 -->
    <div v-if="loading" class="spinner-wrap">
      <span class="spinner"></span>
      <span class="spinner-text">載入中…</span>
    </div>

    <!-- 無資料 -->
    <div v-else-if="!selectedSeason" class="empty-hint">
      尚未設定 Spreadsheet，請至設定頁完成設定。
    </div>

    <div v-else class="content">
      <!-- 季度總計 -->
      <div v-if="seasonTotals.length" class="summary-card">
        <div class="summary-title">{{ selectedSeason }} 季度累計</div>
        <div class="score-chips">
          <span v-for="p in seasonTotals" :key="p.name" class="chip">
            <span class="chip-name">{{ p.name }}</span>
            <span class="chip-score" :class="scoreClass(p.total)">
              {{ p.total > 0 ? '+' : '' }}{{ p.total }}
            </span>
            <span class="chip-games">({{ p.games }}場)</span>
          </span>
        </div>
      </div>

      <!-- 依 sessionId 分組（每場一張卡片） -->
      <div
        v-for="group in groupedSessions"
        :key="group.sessionId"
        class="session-group"
      >
        <!-- 場次標頭 -->
        <button class="session-header" @click="toggleSession(group.sessionId)">
          <div class="session-header-left">
            <span class="session-id-label">{{ group.sessionId }}</span>
            <span class="session-date">{{ group.date }}</span>
            <span class="session-table">台費 {{ group.table }}</span>
          </div>
          <div class="session-scores-inline">
            <span
              v-for="(score, player) in group.scores"
              :key="player"
              class="inline-chip"
              :class="scoreClass(score)"
            >{{ player }} {{ score > 0 ? '+' : '' }}{{ score }}</span>
          </div>
          <span class="toggle-icon">{{ expandedSessions.has(group.sessionId) ? '▲' : '▼' }}</span>
        </button>

        <!-- 展開：逐手細項（若有） -->
        <div v-if="expandedSessions.has(group.sessionId)" class="detail-wrap">
          <div v-if="handsForSession(group.sessionId).length === 0" class="no-detail">
            此場次無逐手細項記錄。
          </div>
          <div v-else class="detail-scroll">
            <table class="detail-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>結果</th>
                  <th>贏家</th>
                  <th>放槍</th>
                  <th v-for="p in group.activePlayers" :key="p">{{ p }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="hand in handsForSession(group.sessionId)" :key="hand.handIndex">
                  <td>{{ hand.handIndex }}</td>
                  <td>
                    <span class="badge" :class="`badge--${hand.result}`">
                      {{ resultLabel(hand.result) }}
                    </span>
                  </td>
                  <td class="td-name">{{ hand.winner ?? '—' }}</td>
                  <td class="td-name">{{ hand.dianPaoPlayer ?? '—' }}</td>
                  <td
                    v-for="p in group.activePlayers"
                    :key="p"
                    :class="scoreClass(hand.scores[p])"
                  >
                    <span v-if="p in hand.scores">
                      {{ hand.scores[p] > 0 ? '+' : '' }}{{ hand.scores[p] }}
                    </span>
                    <span v-else class="absent">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-if="!groupedSessions.length" class="empty-hint">本季暫無記錄。</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAppStore } from '@/stores/appStore'
import type { ResultType } from '@/types'

const appStore = useAppStore()
const loading = ref(false)
const expandedSessions = ref(new Set<string>())

// 只顯示總結 sheet（過濾 _detail / _Cumulative）
const seasonSheetNames = computed(() =>
  appStore.sheetNames.filter(n =>
    !n.includes('_detail') &&
    !n.toLowerCase().includes('cumulative')
  )
)

const selectedSeason = ref('')

// 當前季度的 sessions
const currentSessions = computed(() =>
  appStore.sessionCache[selectedSeason.value]?.sessions ?? []
)

// 當前季度的 hands（從 detail cache）
const currentHands = computed(() => {
  const detailName = `${selectedSeason.value}_detail`
  return appStore.handCache[detailName] ?? []
})

// 以 sessionId 分組
interface SessionGroup {
  sessionId: string
  date: string
  table: number
  scores: Record<string, number>
  activePlayers: string[]
}

const groupedSessions = computed<SessionGroup[]>(() =>
  currentSessions.value.map(s => {
    const activePlayers = Object.keys(s.scores)
    return {
      sessionId: s.sessionId,
      date: s.date,
      table: s.table,
      scores: s.scores,
      activePlayers,
    }
  })
)

// 某場次的所有 HandRecord
function handsForSession(sessionId: string) {
  return currentHands.value
    .filter(h => h.sessionId === sessionId)
    .sort((a, b) => a.handIndex - b.handIndex)
}

// 季度總計
const seasonTotals = computed(() => {
  const totals: Record<string, { total: number; games: number }> = {}
  for (const s of currentSessions.value) {
    for (const [p, score] of Object.entries(s.scores)) {
      if (!totals[p]) totals[p] = { total: 0, games: 0 }
      totals[p].total += score
      totals[p].games++
    }
  }
  return Object.entries(totals)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
})

// 工具函式
function scoreClass(score: number | undefined) {
  if (score === undefined || score === 0) return 'zero'
  return score > 0 ? 'positive' : 'negative'
}

function resultLabel(result: ResultType): string {
  const map: Record<string, string> = { ziMo: '自摸', dianPao: '點炮', liuju: '流局' }
  return result ? (map[result] ?? result) : '—'
}

function toggleSession(sessionId: string) {
  if (expandedSessions.value.has(sessionId)) {
    expandedSessions.value.delete(sessionId)
  } else {
    expandedSessions.value.add(sessionId)
  }
}

async function switchSeason(name: string) {
  if (selectedSeason.value === name) return
  selectedSeason.value = name
  expandedSessions.value.clear()
  await loadCurrentSeason()
}

async function loadCurrentSeason() {
  if (!selectedSeason.value) return
  loading.value = true
  try {
    await Promise.all([
      appStore.loadSessions(selectedSeason.value),
      appStore.loadHands(selectedSeason.value),
    ])
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!appStore.sheetNames.length && appStore.spreadsheetId) {
    await appStore.loadSheetNames()
  }
  if (seasonSheetNames.value.length) {
    selectedSeason.value = seasonSheetNames.value[seasonSheetNames.value.length - 1]
    await loadCurrentSeason()
  }
})

watch(seasonSheetNames, async (names) => {
  if (!selectedSeason.value && names.length) {
    selectedSeason.value = names[names.length - 1]
    await loadCurrentSeason()
  }
})
</script>

<style scoped>
.history-view {
  display: flex; flex-direction: column;
  min-height: 100vh; padding-bottom: 64px;
  background: #f7f8fa;
}

/* ── Season tabs ── */
.season-tabs-wrap {
  position: sticky; top: 0; z-index: 10;
  background: #fff; border-bottom: 1px solid #e5e7eb;
  overflow-x: auto; -webkit-overflow-scrolling: touch;
}
.season-tabs { display: flex; gap: 0; min-width: max-content; }
.tab-btn {
  padding: 0.75rem 1.25rem; font-size: 0.9rem; font-weight: 500;
  color: #57606a; background: none; border: none;
  border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap;
}
.tab-btn:hover { color: #1f2328; }
.tab-btn.active { color: #3b82d4; border-bottom-color: #3b82d4; }

/* ── Spinner ── */
.spinner-wrap {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 3rem; gap: 0.75rem;
}
.spinner {
  width: 32px; height: 32px;
  border: 3px solid #e5e7eb; border-top-color: #3b82d4;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.spinner-text { font-size: 0.9rem; color: #57606a; }

/* ── Content ── */
.content { display: flex; flex-direction: column; gap: 0.75rem; padding: 0.75rem; }
.empty-hint { text-align: center; color: #57606a; padding: 3rem 1rem; font-size: 0.95rem; }

/* ── Summary card ── */
.summary-card {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 0.875rem 1rem;
}
.summary-title {
  font-size: 0.78rem; font-weight: 600; color: #57606a;
  text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.6rem;
}
.score-chips { display: flex; flex-wrap: wrap; gap: 0.4rem 0.75rem; }
.chip { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; }
.chip-name { font-weight: 600; color: #1f2328; }
.chip-score { font-weight: 700; }
.chip-games { font-size: 0.75rem; color: #57606a; }

/* ── Session group ── */
.session-group {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;
}
.session-header {
  display: flex; align-items: center; gap: 0.5rem;
  width: 100%; padding: 0.75rem 1rem;
  background: none; border: none; cursor: pointer; text-align: left;
}
.session-header:hover { background: #f7f8fa; }
.session-header-left {
  display: flex; flex-direction: column; gap: 0.1rem; flex-shrink: 0; min-width: 100px;
}
.session-id-label { font-size: 0.75rem; font-weight: 700; color: #3b82d4; }
.session-date { font-size: 0.82rem; font-weight: 600; color: #1f2328; }
.session-table { font-size: 0.75rem; color: #57606a; }
.session-scores-inline {
  display: flex; flex-wrap: wrap; gap: 0.2rem 0.5rem; flex: 1; min-width: 0;
}
.inline-chip { font-size: 0.78rem; font-weight: 600; }
.toggle-icon { font-size: 0.7rem; color: #57606a; flex-shrink: 0; }

/* ── Detail table ── */
.detail-wrap { border-top: 1px solid #e5e7eb; }
.no-detail { padding: 0.75rem 1rem; font-size: 0.82rem; color: #57606a; }
.detail-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.detail-table {
  width: 100%; border-collapse: collapse; font-size: 0.82rem;
}
.detail-table th, .detail-table td {
  padding: 0.4rem 0.6rem; white-space: nowrap; text-align: center;
}
.detail-table th {
  background: #f7f8fa; color: #57606a; font-weight: 600;
  border-bottom: 1px solid #e5e7eb;
}
.detail-table tbody tr:not(:last-child) td { border-bottom: 1px solid #f0f2f5; }
.td-name { text-align: left !important; }

/* ── Badge ── */
.badge { display: inline-block; font-size: 0.72rem; font-weight: 600; padding: 0.15rem 0.4rem; border-radius: 4px; }
.badge--ziMo { background: #dcfce7; color: #166534; }
.badge--dianPao { background: #fee2e2; color: #991b1b; }
.badge--liuju { background: #fef9c3; color: #854d0e; }

/* ── Score colours ── */
.positive { color: #16a34a; font-weight: 600; }
.negative { color: #dc2626; font-weight: 600; }
.zero { color: #57606a; }
.absent { color: #cbd5e1; }
</style>
