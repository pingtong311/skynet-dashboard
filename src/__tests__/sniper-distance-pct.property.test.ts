/**
 * Property 9：狙擊距觸發百分比計算正確性
 *
 * **Validates: Requirements 3.9**
 *
 * 對任意正數 triggerPrice 與 currentPrice，
 * 計算結果必須等於 ((triggerPrice - currentPrice) / currentPrice) * 100，
 * 精確到小數點後一位。
 */

import * as fc from 'fast-check';

// ── 從 review/page.tsx 提取的純計算函式 ──────────────────────────────────
// 對應 src/app/review/page.tsx 中的計算邏輯：
// const distPct = trigger > 0 && current > 0
//   ? (((trigger - current) / current) * 100).toFixed(1)
//   : '--';

/**
 * 計算狙擊距觸發百分比
 * 對應 review/page.tsx 中的 distPct 計算邏輯
 *
 * @param triggerPrice 觸發價（正數）
 * @param currentPrice 現價（正數）
 * @returns 距觸發百分比字串（精確到小數點後一位），或 '--' 若任一價格無效
 */
export function calcDistancePct(triggerPrice: number, currentPrice: number): string {
  if (triggerPrice > 0 && currentPrice > 0) {
    return (((triggerPrice - currentPrice) / currentPrice) * 100).toFixed(1);
  }
  return '--';
}

// ── Property Tests ────────────────────────────────────────────────────────

describe('Property 9：狙擊距觸發百分比計算正確性', () => {
  /**
   * 正數浮點數 arbitrary（排除 0、NaN、Infinity）
   * 使用合理的台股價格範圍：0.01 ~ 10000
   * 使用 double 而非 float 以避免 32-bit 限制問題
   */
  const positivePriceArb = fc.double({
    min: 0.01,
    max: 10000,
    noNaN: true,
    noDefaultInfinity: true,
  }).filter(n => n > 0 && isFinite(n));

  // ── Property 9.1：計算結果符合公式 ────────────────────────────────────
  it('對任意正數 triggerPrice 與 currentPrice，計算結果必須符合公式', () => {
    fc.assert(
      fc.property(positivePriceArb, positivePriceArb, (triggerPrice, currentPrice) => {
        const result = calcDistancePct(triggerPrice, currentPrice);
        // 期望值：直接按照 Requirements 3.9 的公式計算
        const expected = (((triggerPrice - currentPrice) / currentPrice) * 100).toFixed(1);
        return result === expected;
      }),
      { numRuns: 100 }
    );
  });

  // ── Property 9.2：結果精確到小數點後一位 ──────────────────────────────
  it('計算結果必須精確到小數點後一位（toFixed(1) 格式）', () => {
    fc.assert(
      fc.property(positivePriceArb, positivePriceArb, (triggerPrice, currentPrice) => {
        const result = calcDistancePct(triggerPrice, currentPrice);
        // 驗證格式：數字（可含負號）+ 小數點 + 一位小數
        return /^-?\d+\.\d$/.test(result);
      }),
      { numRuns: 100 }
    );
  });

  // ── Property 9.3：triggerPrice === currentPrice 時結果為 0.0 ──────────
  it('當 triggerPrice 等於 currentPrice 時，距觸發百分比應為 0.0', () => {
    fc.assert(
      fc.property(positivePriceArb, (price) => {
        const result = calcDistancePct(price, price);
        return result === '0.0';
      }),
      { numRuns: 100 }
    );
  });

  // ── Property 9.4：triggerPrice 明顯大於 currentPrice 時結果為正數 ──────
  it('當 triggerPrice 明顯大於 currentPrice 時，距觸發百分比應為正數', () => {
    // 使用整數價格避免浮點精度問題，確保差距足夠大（至少 1%）
    const intPriceArb = fc.integer({ min: 10, max: 9999 });
    fc.assert(
      fc.property(
        intPriceArb,
        intPriceArb,
        (a, b) => {
          // 確保 triggerPrice 至少比 currentPrice 大 1%（避免 toFixed(1) 四捨五入為 0.0）
          const currentPrice = Math.min(a, b);
          const triggerPrice = Math.max(a, b);
          if (triggerPrice <= currentPrice) return true; // 排除相等
          // 計算實際差距百分比，若差距太小（< 0.05%）則跳過
          const rawPct = ((triggerPrice - currentPrice) / currentPrice) * 100;
          if (rawPct < 0.05) return true; // toFixed(1) 可能四捨五入為 0.0
          const result = calcDistancePct(triggerPrice, currentPrice);
          return parseFloat(result) > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  // ── Property 9.5：triggerPrice 明顯小於 currentPrice 時結果為負數 ──────
  it('當 triggerPrice 明顯小於 currentPrice 時，距觸發百分比應為負數', () => {
    // 使用整數價格避免浮點精度問題
    const intPriceArb = fc.integer({ min: 10, max: 9999 });
    fc.assert(
      fc.property(
        intPriceArb,
        intPriceArb,
        (a, b) => {
          const triggerPrice = Math.min(a, b);
          const currentPrice = Math.max(a, b);
          if (triggerPrice >= currentPrice) return true; // 排除相等
          // 計算實際差距百分比，若差距太小（< 0.05%）則跳過
          const rawPct = Math.abs(((triggerPrice - currentPrice) / currentPrice) * 100);
          if (rawPct < 0.05) return true; // toFixed(1) 可能四捨五入為 0.0
          const result = calcDistancePct(triggerPrice, currentPrice);
          return parseFloat(result) < 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  // ── Property 9.6：距觸發 0.5% 以內的警示邏輯正確性 ──────────────────
  it('距觸發 0.5% 以內時 Math.abs(distPct) < 1 應為 true', () => {
    // 生成距觸發在 0.5% 以內的價格對（確保 toFixed(1) 後仍 < 1）
    const nearTriggerArb = fc.integer({ min: 100, max: 9999 }).chain(currentPrice => {
      // delta 在 ±0.005 範圍內（即 ±0.5%），確保 toFixed(1) 後 < 1
      return fc.double({ min: -0.005, max: 0.005, noNaN: true, noDefaultInfinity: true })
        .map(d => ({
          currentPrice,
          triggerPrice: Math.round(currentPrice * (1 + d) * 100) / 100,
        }));
    }).filter(({ triggerPrice }) => triggerPrice > 0);

    fc.assert(
      fc.property(nearTriggerArb, ({ triggerPrice, currentPrice }) => {
        const result = calcDistancePct(triggerPrice, currentPrice);
        if (result === '--') return true;
        return Math.abs(parseFloat(result)) < 1;
      }),
      { numRuns: 100 }
    );
  });

  // ── 邊界條件：無效輸入應回傳 '--' ─────────────────────────────────────
  it('triggerPrice 或 currentPrice 為 0 時應回傳 "--"', () => {
    expect(calcDistancePct(0, 100)).toBe('--');
    expect(calcDistancePct(100, 0)).toBe('--');
    expect(calcDistancePct(0, 0)).toBe('--');
  });

  it('triggerPrice 或 currentPrice 為負數時應回傳 "--"', () => {
    expect(calcDistancePct(-10, 100)).toBe('--');
    expect(calcDistancePct(100, -10)).toBe('--');
  });
});
