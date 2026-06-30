/**
 * 持倉損益計算工具函式
 */

/**
 * 計算浮動損益（元）
 *
 * @param currentPrice - 現價（正數）
 * @param avgCost - 平均成本（正數）
 * @param shares - 持有股數（正整數）
 * @returns pnl = (currentPrice - avgCost) * shares
 */
export function calcPnL(currentPrice: number, avgCost: number, shares: number): number {
  return (currentPrice - avgCost) * shares;
}

/**
 * 計算報酬率（%）
 *
 * @param currentPrice - 現價（正數）
 * @param avgCost - 平均成本（正數，不得為零）
 * @returns returnRate = (currentPrice - avgCost) / avgCost * 100
 */
export function calcReturnRate(currentPrice: number, avgCost: number): number {
  if (avgCost === 0) return 0;
  return ((currentPrice - avgCost) / avgCost) * 100;
}
