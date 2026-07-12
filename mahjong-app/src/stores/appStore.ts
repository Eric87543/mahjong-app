import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as sheetsService from '@/services/sheetsService'
import type { Session, HandRecord } from '@/types'

const LS_SPREADSHEET_ID = 'mj_spreadsheet_id'
const LS_PLAYERS = 'mj_players'

const DEFAULT_PLAYERS = [
  'Eric', 'Harry', 'Lucy', 'DC', 'Poan', 'Teddy', 'Fred', 'Eagle',
  'Tina', 'Roger', 'Jasmine', 'Zhong', 'Nick', 'Evans', 'Ted',
  'steven', 'chris', 'winston', '小宇', '丸子', '雅馨', '大哥', 'Gary',
]

function loadPlayers(): string[] {
  try {
    const raw = localStorage.getItem(LS_PLAYERS)
    if (raw) return JSON.parse(raw) as string[]
  } catch { /* ignore */ }
  return [...DEFAULT_PLAYERS]
}

export const useAppStore = defineStore('app', () => {
  // 優先使用環境變數中固定的 Spreadsheet ID，其次才讀 localStorage
  const ENV_SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID as string | undefined
  const spreadsheetId = ref<string>(
    ENV_SPREADSHEET_ID || localStorage.getItem(LS_SPREADSHEET_ID) || ''
  )
  const players = ref<string[]>(loadPlayers())
  const sheetNames = ref<string[]>([])

  // ── 季度總結 cache：key = sheetName（例如 '2026Q1'）
  const sessionCache = ref<Record<string, { players: string[]; sessions: Session[]; headerOrder: string[] }>>({})

  // ── 細項 cache：key = detail sheetName（例如 '2026Q1_detail'）
  const handCache = ref<Record<string, HandRecord[]>>({})

  // ─── loadSheetNames ──────────────────────────────────────────────────────

  async function loadSheetNames(): Promise<void> {
    if (!spreadsheetId.value) return
    sheetNames.value = await sheetsService.getSheetNames(spreadsheetId.value)
  }

  // ─── loadSessions ─────────────────────────────────────────────────────────
  // 載入季度總結 sheet（有快取則跳過）

  async function loadSessions(sheetName: string): Promise<void> {
    if (!spreadsheetId.value) return
    if (sessionCache.value[sheetName]) return
    const result = await sheetsService.getSessionList(spreadsheetId.value, sheetName)
    sessionCache.value[sheetName] = result
  }

  // ─── loadHands ────────────────────────────────────────────────────────────
  // 載入細項 sheet（有快取則跳過；sheet 不存在時回傳空陣列）

  async function loadHands(sheetName: string): Promise<void> {
    if (!spreadsheetId.value) return
    const detailName = sheetsService.toDetailSheetName(sheetName)
    if (handCache.value[detailName]) return
    const hands = await sheetsService.getHandRecords(spreadsheetId.value, detailName)
    handCache.value[detailName] = hands
  }

  // ─── addSession ───────────────────────────────────────────────────────────
  // 直接新增場次總結（總結模式）

  async function addSession(sheetName: string, session: Session): Promise<void> {
    if (!spreadsheetId.value) return
    // 確保 cache 存在且含有 headerOrder；若舊快取沒有則強制重新載入
    if (!sessionCache.value[sheetName] || !sessionCache.value[sheetName].headerOrder?.length) {
      await sheetsService.getSessionList(spreadsheetId.value, sheetName).then(result => {
        sessionCache.value[sheetName] = result
      }).catch(() => { /* sheet 可能尚不存在，忽略 */ })
    }
    const cached = sessionCache.value[sheetName]
    const playerOrder = cached?.players ?? players.value
    // 使用 sheet 實際的 header 順序，避免欄位錯位
    const headerOrder = cached?.headerOrder
    await sheetsService.appendSession(spreadsheetId.value, sheetName, session, playerOrder, headerOrder)
    // 更新本地 cache
    if (cached) {
      cached.sessions.push({ ...session, rowIndex: cached.sessions.length + 2 })
    }
  }

  // ─── addHand ──────────────────────────────────────────────────────────────
  // 新增一手牌細項（逐手模式）
  // 同時更新（或新增）對應的 Session 總分

  async function addHand(sheetName: string, hand: HandRecord): Promise<void> {
    if (!spreadsheetId.value) return

    const detailName = sheetsService.toDetailSheetName(sheetName)
    // 確保 session cache 存在（讀取 header 順序用）
    if (!sessionCache.value[sheetName]) {
      await sheetsService.getSessionList(spreadsheetId.value, sheetName).then(result => {
        sessionCache.value[sheetName] = result
      }).catch(() => { /* sheet 可能尚不存在，忽略 */ })
    }
    const cached = sessionCache.value[sheetName]
    const playerOrder = cached?.players ?? players.value
    // 使用 sheet 實際的 header 順序，避免欄位錯位
    const headerOrder = cached?.headerOrder

    // 寫入細項 sheet
    await sheetsService.appendHand(spreadsheetId.value, detailName, hand, playerOrder)

    // 更新細項 cache
    if (!handCache.value[detailName]) handCache.value[detailName] = []
    handCache.value[detailName].push({ ...hand, rowIndex: handCache.value[detailName].length + 2 })

    // 重新計算此 session 的總分（從 cache 中所有手牌加總）
    const allHandsForSession = handCache.value[detailName].filter(h => h.sessionId === hand.sessionId)
    const newScores: Record<string, number> = {}
    for (const h of allHandsForSession) {
      for (const [p, s] of Object.entries(h.scores)) {
        newScores[p] = (newScores[p] ?? 0) + s
      }
    }

    // 找現有 session 或建立新的
    if (cached) {
      const existing = cached.sessions.find(s => s.sessionId === hand.sessionId)
      if (existing) {
        // 更新現有 session 總分
        existing.scores = newScores
        await sheetsService.updateSession(
          spreadsheetId.value, sheetName, existing.rowIndex, existing, playerOrder, headerOrder,
        )
      } else {
        // 建立新 session
        const newSession: Session = {
          rowIndex: -1,
          sessionId: hand.sessionId,
          date: hand.sessionId.slice(0, 4) + '-' + hand.sessionId.slice(4, 6) + '-' + hand.sessionId.slice(6, 8),
          table: hand.table,
          scores: newScores,
        }
        await sheetsService.appendSession(spreadsheetId.value, sheetName, newSession, playerOrder, headerOrder)
        newSession.rowIndex = cached.sessions.length + 2
        cached.sessions.push(newSession)
      }
    }
  }

  // ─── invalidateCache ──────────────────────────────────────────────────────
  // 清除某季度的快取，下次讀取時重新從 API 取

  function invalidateCache(sheetName: string): void {
    delete sessionCache.value[sheetName]
    delete handCache.value[sheetsService.toDetailSheetName(sheetName)]
  }

  // ─── setSpreadsheetId ─────────────────────────────────────────────────────

  function setSpreadsheetId(id: string): void {
    spreadsheetId.value = id
    localStorage.setItem(LS_SPREADSHEET_ID, id)
    // 清除舊快取
    sessionCache.value = {}
    handCache.value = {}
    sheetNames.value = []
  }

  function setPlayers(newPlayers: string[]): void {
    players.value = newPlayers
    localStorage.setItem(LS_PLAYERS, JSON.stringify(newPlayers))
  }

  return {
    spreadsheetId,
    players,
    sheetNames,
    sessionCache,
    handCache,
    loadSheetNames,
    loadSessions,
    loadHands,
    addSession,
    addHand,
    invalidateCache,
    setSpreadsheetId,
    setPlayers,
  }
})
