// ── 結果類型 ────────────────────────────────────────────────────────────────
export type ResultType = 'ziMo' | 'dianPao' | 'liuju'

// ── Session（場次總結）──────────────────────────────────────────────────────
// 對應 Google Sheets 的季度總結 sheet（例如 2026Q1）
// 每場聚會一筆，不論用哪種記錄方式最終結果都寫在這裡
export interface Session {
  rowIndex: number                   // sheet 列號（1-based），用於 update
  sessionId: string                  // 'YYYYMMDDNN'，例如 2026071001
  date: string                       // 'YYYY-MM-DD'
  table: number                      // 台費
  scores: Record<string, number>     // 各玩家淨得分，未參與者不含此 key
}

// ── HandRecord（每手牌細項）────────────────────────────────────────────────
// 對應 Google Sheets 的細項 sheet（例如 2026Q1_detail）
// 每手牌一筆，透過 sessionId 對應場次總結
export interface HandRecord {
  rowIndex: number                   // sheet 列號（1-based）
  sessionId: string                  // 對應 Session.sessionId
  handIndex: number                  // 此場第幾手（1, 2, 3...）
  result: ResultType                 // 自摸 / 點炮 / 流局
  winner: string | null              // 贏家（流局時為 null）
  dianPaoPlayer: string | null       // 放槍者（僅點炮時有值）
  table: number                      // 台費（通常與 Session 相同）
  scores: Record<string, number>     // 本手牌各玩家得分
}

// ── PlayerStats（統計資料）─────────────────────────────────────────────────
export interface PlayerStats {
  name: string
  totalScore: number
  games: number                      // 出場場次數（Session 計）
  wins: number                       // 得分 > 0 的場次數（贏錢算獲勝）
  winRate: number                    // wins / games * 100
  avgScore: number                   // totalScore / games
  handGames: number                  // 出場手數（保留供未來擴充）
}
