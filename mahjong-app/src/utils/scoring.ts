// 預設台費（可在記錄頁調整）
export const DEFAULT_TABLE_FEE = 20

/**
 * 自摸：贏家「放台費」給其他每人
 * 贏家扣 tableFee * (activePlayers.length - 1)，其他每人各得 tableFee
 */
export function calcZiMo(
  winner: string,
  tableFee: number,
  activePlayers: string[],
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const p of activePlayers) {
    result[p] = p === winner
      ? -tableFee * (activePlayers.length - 1)  // 贏家放錢
      : tableFee                                  // 其他人各得台費
  }
  return result
}

/**
 * 點炮：放槍者付給贏家，其他人不動（得 0）
 */
export function calcDianPao(
  winner: string,
  dianPaoPlayer: string,
  amount: number,
  activePlayers: string[],
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const p of activePlayers) {
    if (p === winner) result[p] = amount
    else if (p === dianPaoPlayer) result[p] = -amount
    else result[p] = 0
  }
  return result
}

/**
 * 流局：所有人 0
 */
export function calcLiuju(activePlayers: string[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const p of activePlayers) result[p] = 0
  return result
}
