/**
 * 價格輸入驗證工具函式
 * 用於目標價/停損價的使用者輸入驗證
 */

/**
 * 驗證價格字串是否為合法的正數浮點數
 *
 * 通過條件：
 *   - 能解析為有限浮點數
 *   - 數值嚴格大於零
 *
 * 拒絕條件：
 *   - 空字串
 *   - 零
 *   - 負數
 *   - 非數字字串（包含純空白）
 *   - Infinity / -Infinity / NaN
 *
 * 此函式不會拋出例外。
 *
 * @param input - 使用者輸入的字串
 * @returns true 表示合法正數，false 表示不合法
 */
export function validatePrice(input: string): boolean {
  try {
    if (input === null || input === undefined) return false;
    const trimmed = input.trim();
    if (trimmed === '') return false;

    const num = Number(trimmed);

    // 排除 NaN、Infinity、-Infinity、零、負數
    if (!isFinite(num)) return false;
    if (isNaN(num)) return false;
    if (num <= 0) return false;

    return true;
  } catch {
    return false;
  }
}
