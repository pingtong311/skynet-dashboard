/**
 * Property 8：Watch_API ticker 格式驗證
 *
 * **Validates: Requirements 3.6**
 *
 * 對任意不符合 4-6 位數字格式的字串（空字串、含字母、超過 6 位、少於 4 位），
 * Watch_API 應回傳 HTTP 400 並附帶 { error: "invalid_ticker" }。
 */

import * as fc from 'fast-check';

// ── 從 route handler 提取驗證邏輯 ──────────────────────────────────────────
// Watch_API 的 ticker 驗證邏輯：/^\d{4,6}$/
// 對應 src/app/api/skynet/watch/route.ts 中的驗證邏輯

/**
 * 模擬 Watch_API 的 ticker 驗證邏輯
 * 對應 src/app/api/skynet/watch/route.ts 中的驗證邏輯：
 *   if (!ticker || !/^\d{4,6}$/.test(String(ticker).trim())) {
 *     return NextResponse.json({ error: 'invalid_ticker' }, { status: 400 });
 *   }
 */
function validateTicker(ticker: unknown): { status: number; body: { error: string } } | { status: number; body: { success: boolean } } {
  if (!ticker || !/^\d{4,6}$/.test(String(ticker).trim())) {
    return { status: 400, body: { error: 'invalid_ticker' } };
  }
  return { status: 200, body: { success: true } };
}

// ── Property Tests ────────────────────────────────────────────────────────

describe('Property 8：Watch_API ticker 格式驗證', () => {

  // ── Property 8.1：少於 4 位數字應回傳 400 ──────────────────────────────
  it('少於 4 位數字的 ticker 應回傳 HTTP 400', () => {
    // 0-3 位純數字字串
    const shortNumericArb = fc.integer({ min: 0, max: 3 }).chain(len =>
      fc.array(fc.integer({ min: 0, max: 9 }), { minLength: len, maxLength: len })
        .map(digits => digits.join(''))
    );

    fc.assert(
      fc.property(shortNumericArb, (invalidTicker) => {
        const result = validateTicker(invalidTicker);
        return result.status === 400 && (result.body as { error: string }).error === 'invalid_ticker';
      }),
      { numRuns: 100 }
    );
  });

  // ── Property 8.2：超過 6 位數字應回傳 400 ──────────────────────────────
  it('超過 6 位數字的 ticker 應回傳 HTTP 400', () => {
    // 7-15 位純數字字串
    const longNumericArb = fc.integer({ min: 7, max: 15 }).chain(len =>
      fc.array(fc.integer({ min: 0, max: 9 }), { minLength: len, maxLength: len })
        .map(digits => digits.join(''))
    );

    fc.assert(
      fc.property(longNumericArb, (invalidTicker) => {
        const result = validateTicker(invalidTicker);
        return result.status === 400 && (result.body as { error: string }).error === 'invalid_ticker';
      }),
      { numRuns: 100 }
    );
  });

  // ── Property 8.3：含字母的字串應回傳 400 ──────────────────────────────
  it('含有字母的 ticker 應回傳 HTTP 400', () => {
    // 含至少一個字母的字串
    const alphaContainingArb = fc.string({ minLength: 1, maxLength: 10 })
      .filter(s => /[a-zA-Z]/.test(s));

    fc.assert(
      fc.property(alphaContainingArb, (invalidTicker) => {
        const result = validateTicker(invalidTicker);
        return result.status === 400 && (result.body as { error: string }).error === 'invalid_ticker';
      }),
      { numRuns: 100 }
    );
  });

  // ── Property 8.4：含特殊字元的字串應回傳 400 ──────────────────────────
  it('含有非數字字元的 ticker 應回傳 HTTP 400', () => {
    // 含至少一個非數字字元的字串
    const nonDigitArb = fc.string({ minLength: 1, maxLength: 10 })
      .filter(s => /[^0-9]/.test(s));

    fc.assert(
      fc.property(nonDigitArb, (invalidTicker) => {
        const result = validateTicker(invalidTicker);
        return result.status === 400 && (result.body as { error: string }).error === 'invalid_ticker';
      }),
      { numRuns: 100 }
    );
  });

  // ── Property 8.5：空字串應回傳 400 ────────────────────────────────────
  it('空字串 ticker 應回傳 HTTP 400', () => {
    const result = validateTicker('');
    expect(result.status).toBe(400);
    expect((result.body as { error: string }).error).toBe('invalid_ticker');
  });

  // ── Property 8.6：任意不符合格式的字串應回傳 400（綜合測試）──────────
  it('任意不符合 4-6 位數字格式的字串應回傳 HTTP 400（綜合）', () => {
    // 生成任意字串，過濾掉符合格式的
    const invalidTickerArb = fc.string({ minLength: 0, maxLength: 15 })
      .filter(s => !/^\d{4,6}$/.test(s));

    fc.assert(
      fc.property(invalidTickerArb, (invalidTicker) => {
        const result = validateTicker(invalidTicker);
        return result.status === 400 && (result.body as { error: string }).error === 'invalid_ticker';
      }),
      { numRuns: 100 }
    );
  });

  // ── 反向驗證：有效 ticker 不應回傳 400 ────────────────────────────────
  it('有效的 4-6 位數字 ticker 不應回傳 HTTP 400', () => {
    // 4-6 位純數字字串
    const validTickerArb = fc.integer({ min: 4, max: 6 }).chain(len =>
      fc.array(fc.integer({ min: 0, max: 9 }), { minLength: len, maxLength: len })
        .map(digits => digits.join(''))
    ).filter(s => /^\d{4,6}$/.test(s));

    fc.assert(
      fc.property(validTickerArb, (validTicker) => {
        const result = validateTicker(validTicker);
        return result.status !== 400;
      }),
      { numRuns: 100 }
    );
  });
});
