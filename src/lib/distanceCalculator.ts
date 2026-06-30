/**
 * 距觸發百分比計算工具函式
 * 用於狙擊候選清單，計算現價距觸發價的距離
 */

/**
 * 計算距觸發百分比
 *
 * @param triggerPrice - 觸發價（正數）
 * @param currentPrice - 現價（正數，不得為零）
 * @returns distPct = (triggerPrice - currentPrice) / currentPrice * 100
 *   正數：現價低於觸發價（尚未觸發）
 *   負數：現價已超過觸發價（已突破）
 *   零：現價等於觸發價
 */
export function calcDistancePct(triggerPrice: number, currentPrice: number): number {
  if (currentPrice === 0) return 0;
  return ((triggerPrice - currentPrice) / currentPrice) * 100;
}

/**
 * 根據距觸發百分比回傳對應的 Tailwind CSS 顏色 class
 *
 * @param distPct - 距觸發百分比
 * @returns
 *   distPct < 0  → 'text-red-400'（已突破觸發價）
 *   0 ≤ distPct < 1 → 'text-orange-400'（接近觸發，警示）
 *   distPct ≥ 1  → 'text-gray-300'（正常距離）
 */
export function getDistanceColorClass(distPct: number): string {
  if (distPct < 0) return 'text-red-400';
  if (distPct < 1) return 'text-orange-400';
  return 'text-gray-300';
}
