import { useAuthStore } from '@/stores/authStore'
import type { Session, HandRecord } from '@/types'

const BASE = 'https://sheets.googleapis.com'

// 季度總結 sheet 的 meta 欄位名稱（非玩家欄）
// 兼容舊格式的欄位名稱（'Sum | Who' / '日期' / 'Sum/Who'）
const SESSION_META = new Set([
  'sessionId', 'date', 'table',
  '日期', 'Sum | Who', 'Sum/Who', 'sum | who', 'sum/who',
])

// 細項 sheet 的 meta 欄位名稱（非玩家欄）
const HAND_META = new Set(['sessionId', 'handIndex', 'result', 'winner', 'dianPaoPlayer', 'table'])

function authHeader(): Record<string, string> {
  const auth = useAuthStore()
  return { Authorization: `Bearer ${auth.token}` }
}

async function apiFetch(url: string, options?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...authHeader(),
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })
  if (!res.ok) {
    // token 過期（401）：清除本地 token，讓路由守衛踢回登入頁重新授權
    if (res.status === 401) {
      useAuthStore().clearToken()
    }
    const text = await res.text()
    throw new Error(`Sheets API error ${res.status}: ${text}`)
  }
  return res.json()
}

// ─── getSheetNames ───────────────────────────────────────────────────────────

export async function getSheetNames(spreadsheetId: string): Promise<string[]> {
  const url = `${BASE}/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`
  const data = (await apiFetch(url)) as {
    sheets: Array<{ properties: { title: string } }>
  }
  return data.sheets.map((s) => s.properties.title)
}

// ─── Helper：detail sheet 名稱 ──────────────────────────────────────────────

export function toDetailSheetName(sheetName: string): string {
  return `${sheetName}_detail`
}

// ─── Helper：產生 sessionId ──────────────────────────────────────────────────
// 格式：YYYYMMDDNN（日期8碼 + 2碼序號，從01開始）
export function generateSessionId(date: string, existingSessions: Session[]): string {
  const compact = date.replace(/-/g, '')  // 'YYYY-MM-DD' → 'YYYYMMDD'
  // 找出當天現有的最大序號，下一筆從最大值 +1 開始（避免中間有缺號時衝突）
  const sameDay = existingSessions.filter(s => s.sessionId.startsWith(compact))
  const maxSeq = sameDay.reduce((max, s) => {
    const seq = parseInt(s.sessionId.slice(compact.length), 10)
    return isNaN(seq) ? max : Math.max(max, seq)
  }, 0)
  return `${compact}${String(maxSeq + 1).padStart(2, '0')}`
}

// ─── getSessionList ──────────────────────────────────────────────────────────
// 讀取季度總結 sheet，回傳 players 清單與 sessions 陣列
// Header 格式：sessionId | date | table | [玩家...] 或舊格式（兼容）

export async function getSessionList(
  spreadsheetId: string,
  sheetName: string,
): Promise<{ players: string[]; sessions: Session[]; headerOrder: string[] }> {
  const range = encodeURIComponent(`${sheetName}!A:AZ`)
  const url = `${BASE}/v4/spreadsheets/${spreadsheetId}/values/${range}`
  const data = (await apiFetch(url)) as { values?: string[][] }
  const rows: string[][] = data.values ?? []

  if (rows.length < 2) return { players: [], sessions: [], headerOrder: [] }

  const header = rows[0]
  const sessionIdIdx = header.indexOf('sessionId')
  // 兼容舊格式（'日期'）與新格式（'date'）
  const dateIdx = header.indexOf('date') !== -1
    ? header.indexOf('date')
    : header.indexOf('日期')
  const tableIdx = header.indexOf('table')

  // 玩家欄：不在 SESSION_META 的欄位
  const playerCols = header
    .map((h, i) => ({ name: h.trim(), idx: i }))
    .filter(({ name }) => name !== '' && !SESSION_META.has(name))

  const players = playerCols.map((p) => p.name)
  const sessions: Session[] = []
  let lastDate = ''

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.every((c) => (c ?? '').trim() === '')) continue

    // 日期（carry-forward 兼容舊格式，統一轉為 YYYY-MM-DD）
    const rawDate = (row[dateIdx] ?? '').trim()
    if (rawDate !== '') lastDate = rawDate
    // 兼容 '2026/01/10' 和 '2026-01-10' 兩種格式，統一轉為 YYYY-MM-DD
    const date = lastDate.slice(0, 10).replace(/\//g, '-')

    // sessionId：新格式有值；舊格式沒有此欄則用日期+序號生成
    let sessionId = sessionIdIdx !== -1 ? (row[sessionIdIdx]?.trim() ?? '') : ''
    if (!sessionId) {
      // 兼容舊資料：用日期 + 行次生成暫時 sessionId
      const compact = date.replace(/[-/]/g, '')
      sessionId = `${compact}${String(sessions.filter(s => s.sessionId.startsWith(compact)).length + 1).padStart(2, '0')}`
    }

    const table = Number(row[tableIdx] ?? 0) || 0

    const scores: Record<string, number> = {}
    for (const { name, idx } of playerCols) {
      const cell = (row[idx] ?? '').trim()
      if (cell !== '') scores[name] = Number(cell) || 0
    }

    sessions.push({ rowIndex: i + 1, sessionId, date, table, scores })
  }

  // 回傳 sheet 實際的 header 欄位順序，供 appendSession/updateSession 對齊欄位用
  const headerOrder = header.map(h => h.trim()).filter(h => h !== '')
  return { players, sessions, headerOrder }
}

// ─── sessionToRow ─────────────────────────────────────────────────────────────
// 依照 headerOrder 決定欄位順序，與 sheet 的實際 header 保持一致

function sessionToRow(session: Session, playerOrder: string[], headerOrder?: string[]): string[] {
  if (headerOrder && headerOrder.length > 0) {
    // 依 header 順序輸出，讓欄位對齊
    return headerOrder.map((col) => {
      if (col === 'sessionId') return session.sessionId
      if (col === 'date') return session.date
      if (col === 'table') return String(session.table)
      // 玩家欄
      return session.scores[col] !== undefined ? String(session.scores[col]) : ''
    })
  }
  // 沒有 header 資訊時的 fallback（新 sheet append 第一筆）
  const scoreValues = playerOrder.map((p) =>
    session.scores[p] !== undefined ? String(session.scores[p]) : '',
  )
  return [
    session.sessionId,
    session.date,
    String(session.table),
    ...scoreValues,
  ]
}

// ─── appendSession ────────────────────────────────────────────────────────────

export async function appendSession(
  spreadsheetId: string,
  sheetName: string,
  session: Session,
  playerOrder: string[],
  headerOrder?: string[],
): Promise<void> {
  const range = encodeURIComponent(`${sheetName}!A:AZ`)
  const url =
    `${BASE}/v4/spreadsheets/${spreadsheetId}/values/${range}:append` +
    `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
  await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify({ values: [sessionToRow(session, playerOrder, headerOrder)] }),
  })
}

// ─── updateSession ────────────────────────────────────────────────────────────

export async function updateSession(
  spreadsheetId: string,
  sheetName: string,
  rowIndex: number,
  session: Session,
  playerOrder: string[],
  headerOrder?: string[],
): Promise<void> {
  const range = encodeURIComponent(`${sheetName}!A${rowIndex}:AZ${rowIndex}`)
  const url =
    `${BASE}/v4/spreadsheets/${spreadsheetId}/values/${range}` +
    `?valueInputOption=USER_ENTERED`
  await apiFetch(url, {
    method: 'PUT',
    body: JSON.stringify({ values: [sessionToRow(session, playerOrder, headerOrder)] }),
  })
}

// ─── getHandRecords ───────────────────────────────────────────────────────────
// 讀取細項 sheet（例如 2026Q1_detail）
// Header：sessionId | handIndex | result | winner | dianPaoPlayer | table | [玩家...]

export async function getHandRecords(
  spreadsheetId: string,
  detailSheetName: string,
): Promise<HandRecord[]> {
  const range = encodeURIComponent(`${detailSheetName}!A:AZ`)
  const url = `${BASE}/v4/spreadsheets/${spreadsheetId}/values/${range}`

  let data: { values?: string[][] }
  try {
    data = (await apiFetch(url)) as { values?: string[][] }
  } catch (e: unknown) {
    // 若 detail sheet 不存在（404），回傳空陣列
    if (e instanceof Error && e.message.includes('400')) return []
    throw e
  }

  const rows: string[][] = data.values ?? []
  if (rows.length < 2) return []

  const header = rows[0]
  const sessionIdIdx = header.indexOf('sessionId')
  const handIndexIdx = header.indexOf('handIndex')
  const resultIdx = header.indexOf('result')
  const winnerIdx = header.indexOf('winner')
  const dianPaoIdx = header.indexOf('dianPaoPlayer')
  const tableIdx = header.indexOf('table')

  const playerCols = header
    .map((h, i) => ({ name: h.trim(), idx: i }))
    .filter(({ name }) => name !== '' && !HAND_META.has(name))

  const records: HandRecord[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.every((c) => (c ?? '').trim() === '')) continue

    const sessionId = (row[sessionIdIdx] ?? '').trim()
    const handIndex = Number(row[handIndexIdx] ?? 0) || 0
    const rv = (row[resultIdx] ?? '').trim()
    const result = (rv === 'ziMo' || rv === 'dianPao' || rv === 'liuju') ? rv : 'liuju'
    const winner = winnerIdx !== -1 ? (row[winnerIdx]?.trim() || null) : null
    const dianPaoPlayer = dianPaoIdx !== -1 ? (row[dianPaoIdx]?.trim() || null) : null
    const table = Number(row[tableIdx] ?? 0) || 0

    const scores: Record<string, number> = {}
    for (const { name, idx } of playerCols) {
      const cell = (row[idx] ?? '').trim()
      if (cell !== '') scores[name] = Number(cell) || 0
    }

    records.push({ rowIndex: i + 1, sessionId, handIndex, result, winner, dianPaoPlayer, table, scores })
  }

  return records
}

// ─── handToRow ────────────────────────────────────────────────────────────────

function handToRow(hand: HandRecord, playerOrder: string[]): string[] {
  const scoreValues = playerOrder.map((p) =>
    hand.scores[p] !== undefined ? String(hand.scores[p]) : '',
  )
  return [
    hand.sessionId,
    String(hand.handIndex),
    hand.result,
    hand.winner ?? '',
    hand.dianPaoPlayer ?? '',
    String(hand.table),
    ...scoreValues,
  ]
}

// ─── appendHand ───────────────────────────────────────────────────────────────

export async function appendHand(
  spreadsheetId: string,
  detailSheetName: string,
  hand: HandRecord,
  playerOrder: string[],
): Promise<void> {
  const range = encodeURIComponent(`${detailSheetName}!A:AZ`)
  const url =
    `${BASE}/v4/spreadsheets/${spreadsheetId}/values/${range}:append` +
    `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
  await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify({ values: [handToRow(hand, playerOrder)] }),
  })
}
