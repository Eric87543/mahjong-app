<template>
  <div class="stats-view">
    <!-- Tab 切換 -->
    <div class="view-tabs">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'leaderboard' }"
        @click="activeTab = 'leaderboard'"
      >排行榜</button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'chart' }"
        @click="activeTab = 'chart'"
      >走勢圖</button>
    </div>

    <!-- 載入中 -->
    <div v-if="loading" class="spinner-wrap">
      <span class="spinner"></span>
      <span class="spinner-text">載入中…</span>
    </div>

    <div v-else class="content">
      <!-- ═══════════════ 排行榜 Tab ═══════════════ -->
      <section v-if="activeTab === 'leaderboard'">
        <!-- 季度多選 -->
        <div class="filter-card">
          <div class="filter-label">選擇季度</div>
          <div class="checkbox-group">
            <label
              v-for="name in seasonSheetNames"
              :key="name"
              class="check-label"
            >
              <input
                type="checkbox"
                :value="name"
                v-model="selectedSeasons"
                @change="reloadSelectedSeasons"
              />
              {{ name }}
            </label>
          </div>
        </div>

        <!-- 排行榜表格 -->
        <div class="table-wrap">
          <table class="lb-table">
            <thead>
              <tr>
                <th class="col-rank">#</th>
                <th class="col-name" @click="sortBy('name')">
                  姓名 {{ sortIcon('name') }}
                </th>
                <th @click="sortBy('totalScore')">
                  累計得分 {{ sortIcon('totalScore') }}
                </th>
                <th @click="sortBy('games')">
                  場次 {{ sortIcon('games') }}
                </th>
                <th @click="sortBy('avgScore')">
                  場均 {{ sortIcon('avgScore') }}
                </th>
                <th @click="sortBy('winRate')">
                  勝率 {{ sortIcon('winRate') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!leaderboard.length">
                <td colspan="6" class="empty-td">尚無資料，請選擇季度。</td>
              </tr>
              <tr
                v-for="(p, idx) in sortedLeaderboard"
                :key="p.name"
              >
                <td class="col-rank">{{ idx + 1 }}</td>
                <td class="col-name">{{ p.name }}</td>
                <td :class="scoreClass(p.totalScore)">
                  {{ p.totalScore > 0 ? '+' : '' }}{{ p.totalScore }}
                </td>
                <td>{{ p.games }}</td>
                <td :class="scoreClass(p.avgScore)">
                  {{ p.avgScore.toFixed(1) }}
                </td>
                <td>{{ p.games > 0 ? p.winRate.toFixed(1) + '%' : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ═══════════════ 走勢圖 Tab ═══════════════ -->
      <section v-if="activeTab === 'chart'">
        <!-- 季度選擇 -->
        <div class="filter-card">
          <div class="filter-label">選擇季度</div>
          <div class="checkbox-group">
            <label
              v-for="name in seasonSheetNames"
              :key="name"
              class="check-label"
            >
              <input
                type="checkbox"
                :value="name"
                v-model="chartSeasons"
                @change="reloadChartSeasons"
              />
              {{ name }}
            </label>
          </div>
        </div>

        <!-- 玩家選擇 -->
        <div class="filter-card">
          <div class="filter-label">選擇玩家（最多 6 人）</div>
          <div class="checkbox-group">
            <label
              v-for="name in chartAvailablePlayers"
              :key="name"
              class="check-label"
            >
              <input
                type="checkbox"
                :value="name"
                v-model="chartSelectedPlayers"
                :disabled="
                  !chartSelectedPlayers.includes(name) &&
                  chartSelectedPlayers.length >= 6
                "
              />
              <span
                class="player-dot"
                :style="{ background: playerColor(name) }"
              ></span>
              {{ name }}
            </label>
          </div>
        </div>

        <!-- SVG 折線圖 -->
        <div class="chart-card">
          <div v-if="!chartSelectedPlayers.length" class="chart-empty">
            請選擇玩家以顯示走勢圖。
          </div>
          <div v-else class="chart-scroll">
            <svg
              :width="svgWidth"
              :height="SVG_H"
              :viewBox="`0 0 ${svgWidth} ${SVG_H}`"
              class="line-chart"
            >
              <!-- Y 軸格線與標籤 -->
              <g class="y-axis">
                <line
                  v-for="tick in yTicks"
                  :key="tick.value"
                  :x1="MARGIN.left"
                  :y1="tick.y"
                  :x2="svgWidth - MARGIN.right"
                  :y2="tick.y"
                  stroke="#e5e7eb"
                  stroke-width="1"
                />
                <text
                  v-for="tick in yTicks"
                  :key="`lbl-${tick.value}`"
                  :x="MARGIN.left - 6"
                  :y="tick.y + 4"
                  text-anchor="end"
                  font-size="11"
                  fill="#57606a"
                >{{ tick.value }}</text>
              </g>

              <!-- 零線 -->
              <line
                v-if="zeroY !== null"
                :x1="MARGIN.left"
                :y1="zeroY"
                :x2="svgWidth - MARGIN.right"
                :y2="zeroY"
                stroke="#94a3b8"
                stroke-width="1"
                stroke-dasharray="4 3"
              />

              <!-- 折線 -->
              <g v-for="pName in chartSelectedPlayers" :key="pName">
                <polyline
                  :points="polylinePoints(pName)"
                  :stroke="playerColor(pName)"
                  stroke-width="2"
                  fill="none"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
                <!-- 資料點 -->
                <circle
                  v-for="(pt, i) in chartDataFor(pName)"
                  :key="i"
                  :cx="ptX(i, chartDataFor(pName).length)"
                  :cy="ptY(pt.cumulative)"
                  r="3"
                  :fill="playerColor(pName)"
                />
              </g>

              <!-- X 軸標籤（每隔數局顯示一個） -->
              <g class="x-axis">
                <text
                  v-for="tick in xTicks"
                  :key="tick.idx"
                  :x="tick.x"
                  :y="SVG_H - MARGIN.bottom + 14"
                  text-anchor="middle"
                  font-size="10"
                  fill="#57606a"
                >{{ tick.label }}</text>
              </g>

              <!-- 右側最終數值 -->
              <g v-for="pName in chartSelectedPlayers" :key="`end-${pName}`">
                <text
                  v-if="chartDataFor(pName).length"
                  :x="svgWidth - MARGIN.right + 5"
                  :y="ptY(lastValue(pName)) + 4"
                  font-size="11"
                  font-weight="600"
                  :fill="playerColor(pName)"
                >{{ lastValue(pName) }}</text>
              </g>
            </svg>
          </div>

          <!-- 圖例 -->
          <div v-if="chartSelectedPlayers.length" class="legend">
            <span
              v-for="pName in chartSelectedPlayers"
              :key="pName"
              class="legend-item"
            >
              <span class="legend-dot" :style="{ background: playerColor(pName) }"></span>
              {{ pName }}
            </span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAppStore } from '@/stores/appStore'
import type { PlayerStats } from '@/types'
import { calcLeaderboard, calcCumulativeTimeline } from '@/utils/stats'

// ── Constants ─────────────────────────────────────────────────────────────
const COLORS = ['#3b82d4', '#f97316', '#22c55e', '#ef4444', '#7c5cd8', '#a16207']
const SVG_H = 400
const MARGIN = { top: 20, right: 60, bottom: 28, left: 54 }
const MIN_CHART_WIDTH = 480

// ── Store / State ──────────────────────────────────────────────────────────
const appStore = useAppStore()
const loading = ref(false)
const activeTab = ref<'leaderboard' | 'chart'>('leaderboard')

// 過濾掉 _detail / _Cumulative sheets
const seasonSheetNames = computed(() =>
  appStore.sheetNames.filter(n =>
    !n.includes('_detail') &&
    !n.toLowerCase().includes('cumulative')
  )
)

// ── Leaderboard ────────────────────────────────────────────────────────────
const selectedSeasons = ref<string[]>([])
const sortKey = ref<keyof PlayerStats>('totalScore')
const sortAsc = ref(false)

// 合併多季 sessions + hands
const mergedSessions = computed(() => {
  return selectedSeasons.value.flatMap(s => appStore.sessionCache[s]?.sessions ?? [])
})

const mergedHands = computed(() => {
  return selectedSeasons.value.flatMap(s => {
    const detailName = `${s}_detail`
    return appStore.handCache[detailName] ?? []
  })
})

// 所有出現過的玩家
const allPlayers = computed(() => {
  const set = new Set<string>()
  for (const s of mergedSessions.value) Object.keys(s.scores).forEach(p => set.add(p))
  return Array.from(set)
})

const leaderboard = computed<PlayerStats[]>(() =>
  calcLeaderboard(mergedSessions.value, mergedHands.value, allPlayers.value)
)

const sortedLeaderboard = computed(() => {
  return [...leaderboard.value].sort((a, b) => {
    const av = a[sortKey.value] as number | string
    const bv = b[sortKey.value] as number | string
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortAsc.value ? cmp : -cmp
  })
})

function sortBy(key: keyof PlayerStats) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = key === 'name'
  }
}

function sortIcon(key: keyof PlayerStats) {
  if (sortKey.value !== key) return '⇅'
  return sortAsc.value ? '▲' : '▼'
}

function scoreClass(v: number) {
  if (v > 0) return 'positive'
  if (v < 0) return 'negative'
  return 'zero'
}

async function reloadSelectedSeasons() {
  loading.value = true
  try {
    await Promise.all(
      selectedSeasons.value.flatMap(s => [
        appStore.sessionCache[s] ? null : appStore.loadSessions(s),
        appStore.handCache[`${s}_detail`] ? null : appStore.loadHands(s),
      ].filter(Boolean))
    )
  } finally {
    loading.value = false
  }
}

// ── Chart ──────────────────────────────────────────────────────────────────
const chartSeasons = ref<string[]>([])
const chartSelectedPlayers = ref<string[]>([])

const chartSessions = computed(() => {
  return chartSeasons.value.flatMap(s => appStore.sessionCache[s]?.sessions ?? [])
})

const chartAvailablePlayers = computed(() => {
  const set = new Set<string>()
  for (const s of chartSessions.value) Object.keys(s.scores).forEach(p => set.add(p))
  return Array.from(set).sort()
})

// 移除已不在可選玩家列表中的選擇
watch(chartAvailablePlayers, (available) => {
  chartSelectedPlayers.value = chartSelectedPlayers.value.filter(p => available.includes(p))
})

function chartDataFor(playerName: string) {
  return calcCumulativeTimeline(chartSessions.value, playerName)
}

async function reloadChartSeasons() {
  loading.value = true
  try {
    await Promise.all(
      chartSeasons.value
        .filter(s => !appStore.sessionCache[s])
        .map(s => appStore.loadSessions(s))
    )
  } finally {
    loading.value = false
  }
}

// ── SVG Chart helpers ──────────────────────────────────────────────────────
const maxDataLen = computed(() => {
  if (!chartSelectedPlayers.value.length) return 0
  return Math.max(...chartSelectedPlayers.value.map(p => chartDataFor(p).length), 0)
})

const svgWidth = computed(() => {
  const pts = maxDataLen.value
  const plotW = Math.max(pts * 16, MIN_CHART_WIDTH)
  return plotW + MARGIN.left + MARGIN.right
})

const plotWidth = computed(() => svgWidth.value - MARGIN.left - MARGIN.right)
const plotHeight = computed(() => SVG_H - MARGIN.top - MARGIN.bottom)

// 所有玩家所有 cumulative 值
const allValues = computed(() => {
  const vals: number[] = []
  for (const p of chartSelectedPlayers.value) {
    chartDataFor(p).forEach(d => vals.push(d.cumulative))
  }
  return vals
})

const yMin = computed(() => {
  if (!allValues.value.length) return -100
  const min = Math.min(...allValues.value)
  return Math.floor(min * 1.1)
})

const yMax = computed(() => {
  if (!allValues.value.length) return 100
  const max = Math.max(...allValues.value)
  return Math.ceil(max * 1.1)
})

const yRange = computed(() => yMax.value - yMin.value || 1)

function ptX(idx: number, total: number): number {
  if (total <= 1) return MARGIN.left + plotWidth.value / 2
  return MARGIN.left + (idx / (total - 1)) * plotWidth.value
}

function ptY(value: number): number {
  return MARGIN.top + plotHeight.value - ((value - yMin.value) / yRange.value) * plotHeight.value
}

function polylinePoints(playerName: string): string {
  const data = chartDataFor(playerName)
  return data
    .map((d, i) => `${ptX(i, data.length)},${ptY(d.cumulative)}`)
    .join(' ')
}

function lastValue(playerName: string): number {
  const data = chartDataFor(playerName)
  return data.length ? data[data.length - 1].cumulative : 0
}

function playerColor(playerName: string): string {
  const idx = chartSelectedPlayers.value.indexOf(playerName)
  return COLORS[idx % COLORS.length] ?? '#888'
}

// Y 軸刻度（~5 個）
const yTicks = computed(() => {
  const step = niceStep(yRange.value / 5)
  const start = Math.ceil(yMin.value / step) * step
  const ticks: Array<{ value: number; y: number }> = []
  for (let v = start; v <= yMax.value; v += step) {
    ticks.push({ value: v, y: ptY(v) })
  }
  return ticks
})

const zeroY = computed(() =>
  (yMin.value <= 0 && yMax.value >= 0) ? ptY(0) : null
)

function niceStep(rough: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const f = rough / pow
  if (f < 2) return pow
  if (f < 5) return 2 * pow
  return 5 * pow
}

// X 軸刻度（只顯示前 / 後 / 中間幾個，避免擠滿）
const xTicks = computed(() => {
  const len = maxDataLen.value
  if (!len) return []
  const step = Math.max(1, Math.ceil(len / 10))
  const ticks: Array<{ idx: number; x: number; label: string }> = []
  for (let i = 0; i < len; i += step) {
    // 用第一個有資料的玩家的 label
    const p = chartSelectedPlayers.value[0]
    const data = p ? chartDataFor(p) : []
    const label = data[i]?.label.slice(0, 10) ?? String(i + 1)
    ticks.push({ idx: i, x: ptX(i, len), label })
  }
  return ticks
})

// ── Mount ──────────────────────────────────────────────────────────────────
onMounted(async () => {
  if (!appStore.sheetNames.length && appStore.spreadsheetId) {
    await appStore.loadSheetNames()
  }
  // 預設選最後一個季度
  if (seasonSheetNames.value.length) {
    const last = seasonSheetNames.value[seasonSheetNames.value.length - 1]
    selectedSeasons.value = [last]
    chartSeasons.value = [last]
    await reloadSelectedSeasons()
  }
})

watch(seasonSheetNames, async (names) => {
  if (!selectedSeasons.value.length && names.length) {
    const last = names[names.length - 1]
    selectedSeasons.value = [last]
    chartSeasons.value = [last]
    await reloadSelectedSeasons()
  }
})
</script>

<style scoped>
.stats-view {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding-bottom: 120px;
  background: #f7f8fa;
}

/* ── View tabs ── */
.view-tabs {
  display: flex;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.tab-btn {
  flex: 1;
  padding: 0.875rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: #57606a;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.tab-btn:hover { color: #1f2328; }
.tab-btn.active { color: #3b82d4; border-bottom-color: #3b82d4; }

/* ── Spinner ── */
.spinner-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 0.75rem;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82d4;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.spinner-text { font-size: 0.9rem; color: #57606a; }

/* ── Content ── */
.content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
}

/* ── Filter card ── */
.filter-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.875rem 1rem;
}

.filter-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #57606a;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
}

.check-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.875rem;
  cursor: pointer;
  user-select: none;
}

.check-label input { cursor: pointer; }

.player-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* ── Leaderboard table ── */
.table-wrap {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.lb-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.lb-table th,
.lb-table td {
  padding: 0.5rem 0.75rem;
  white-space: nowrap;
  text-align: right;
}

.lb-table th {
  background: #f7f8fa;
  color: #57606a;
  font-weight: 600;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  user-select: none;
}

.lb-table th:hover { background: #eef1f5; }

.lb-table tbody tr:not(:last-child) td {
  border-bottom: 1px solid #f0f2f5;
}

.col-rank { text-align: center !important; width: 36px; }
.col-name { text-align: left !important; font-weight: 600; }

.empty-td {
  text-align: center !important;
  color: #57606a;
  padding: 2rem !important;
}

.positive { color: #16a34a; font-weight: 600; }
.negative { color: #dc2626; font-weight: 600; }
.zero { color: #57606a; }

.old-data-note {
  font-size: 0.78rem;
  color: #57606a;
  padding: 0.4rem 0.25rem;
}

/* ── Chart ── */
.chart-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.875rem 1rem;
}

.chart-empty {
  text-align: center;
  color: #57606a;
  padding: 3rem 1rem;
  font-size: 0.95rem;
}

.chart-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.line-chart {
  display: block;
}

/* ── Legend ── */
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
  margin-top: 0.875rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 500;
}

.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
</style>
