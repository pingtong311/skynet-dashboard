/**
 * 台股顏色慣例工具函式
 * 台股：漲 → 紅色，跌 → 綠色（與歐美相反）
 */

/**
 * 根據數值回傳對應的 Tailwind CSS 顏色 class
 *
 * @param value - 任意數值（漲跌幅、損益等）
 * @returns
 *   正數 → 'text-red-400'（台股漲紅）
 *   負數 → 'text-green-400'（台股跌綠）
 *   零   → 'text-gray-400'（持平）
 */
export function getTwseColorClass(value: number): string {
  if (value > 0) return 'text-red-400';
  if (value < 0) return 'text-green-400';
  return 'text-gray-400';
}
