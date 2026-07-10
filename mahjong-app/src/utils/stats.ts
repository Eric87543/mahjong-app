import type { Session, HandRecord, PlayerStats } from '@/types'

// ─── calcPlayerStats ──────────────────────────────────────────────────────────
// 勝率定義：得分 > 0 的場次算「獲勝」

export function calcPlayerStats(
  sessions: Session[],
  hands: HandRecord[],
  playerName: string,
): PlayerStats {
  let totalScore = 0
  let games = 0
  let wins = 0

  for (const s of sessions) {
    if (!(playerName in s.scores)) continue
    games++
    totalScore += s.scores[playerName]
    if (s.scores[playerName] > 0) wins++
  }

  // handGames 僅保留供顯示，不再計算放槍/自摸
  let handGames = 0
  for (const h of hands) {
    if (playerName in h.scores) handGames++
  }

  const avgScore = games > 0 ? totalScore / games : 0
  const winRate = games > 0 ? (wins / games) * 100 : 0

  return {
    name: playerName,
    totalScore,
    games,
    wins,
    winRate,
    avgScore,
    handGames,
  }
}

// ─── calcLeaderboard ──────────────────────────────────────────────────────────

export function calcLeaderboard(
  sessions: Session[],
  hands: HandRecord[],
  players: string[],
): PlayerStats[] {
  return players
    .map(name => calcPlayerStats(sessions, hands, name))
    .filter(s => s.games > 0)
    .sort((a, b) => b.totalScore - a.totalScore)
}

// ─── calcCumulativeTimeline ───────────────────────────────────────────────────
// 以 Session 為單位計算累計走勢（X 軸 = 場次）

export function calcCumulativeTimeline(
  sessions: Session[],
  playerName: string,
): Array<{ label: string; cumulative: number }> {
  const result: Array<{ label: string; cumulative: number }> = []
  let cumulative = 0
  const dateCount: Record<string, number> = {}

  for (const s of sessions) {
    if (!(playerName in s.scores)) continue
    const date = s.date.slice(0, 10)
    dateCount[date] = (dateCount[date] ?? 0) + 1
    const seq = dateCount[date]
    cumulative += s.scores[playerName]
    result.push({ label: `${date} #${seq}`, cumulative })
  }

  return result
}
