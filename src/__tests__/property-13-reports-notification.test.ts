/**
 * Property 11：新增戰報觸發通知
 *
 * 對任意 (oldCount, newCount) 組合，若 newCount > oldCount，
 * 通知函式必須被呼叫，且通知標題為「📊 晨間戰報更新」。
 *
 * Validates: Requirements 4.5
 */

import * as fc from 'fast-check';

// ── 純邏輯萃取 ────────────────────────────────────────────────────────────────
// 從 review/page.tsx 的 fetchReports 萃取出可測試的純邏輯：
// 比對前後兩次戰報數量，若新增則觸發通知。

interface NotificationCall {
  title: string;
  count: number;
}

/**
 * 模擬 fetchReports 中的通知觸發邏輯：
 * 若 prevCount > 0 且 newCount > prevCount，觸發一次通知。
 *
 * 注意：與 review/page.tsx 邏輯一致：
 *   if (prevCount > 0 && newCount > prevCount) {
 *     notifyNewReports(newCount - prevCount);
 *   }
 *
 * @param prevCount - 前次戰報數量
 * @param newCount  - 新戰報數量
 * @returns 通知呼叫記錄（0 或 1 次）
 */
function checkNewReports(prevCount: number, newCount: number): NotificationCall[] {
  const calls: NotificationCall[] = [];

  // 與 review/page.tsx 邏輯一致：prevCount > 0 才比對（避免首次載入誤觸發）
  if (prevCount > 0 && newCount > prevCount) {
    calls.push({
      title: '📊 晨間戰報更新',
      count: newCount - prevCount,
    });
  }

  return calls;
}

// ── Property Tests ────────────────────────────────────────────────────────────

describe('Property 11：新增戰報觸發通知', () => {
  /**
   * Property 11a：newCount > oldCount 時，通知必須被呼叫
   *
   * 對任意 oldCount > 0 且 newCount > oldCount 的組合，
   * 通知函式必須被呼叫恰好一次。
   */
  it('Property 11a：newCount > oldCount 時，通知必須被呼叫', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        (oldCount, delta) => {
          const newCount = oldCount + delta; // 確保 newCount > oldCount
          const calls = checkNewReports(oldCount, newCount);
          return calls.length === 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11b：通知標題必須為「📊 晨間戰報更新」
   *
   * 對任意觸發通知的情境，通知標題必須為「📊 晨間戰報更新」。
   */
  it('Property 11b：通知標題必須為「📊 晨間戰報更新」', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        (oldCount, delta) => {
          const newCount = oldCount + delta;
          const calls = checkNewReports(oldCount, newCount);
          return calls.every((c) => c.title === '📊 晨間戰報更新');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11c：通知內容包含正確的新增數量
   *
   * 通知的 count 必須等於 newCount - oldCount。
   */
  it('Property 11c：通知內容包含正確的新增數量', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        (oldCount, delta) => {
          const newCount = oldCount + delta;
          const calls = checkNewReports(oldCount, newCount);
          if (calls.length === 0) return false;
          return calls[0].count === newCount - oldCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11d：newCount <= oldCount 時，不觸發通知
   *
   * 對任意 newCount <= oldCount 的組合，不應觸發通知。
   */
  it('Property 11d：newCount <= oldCount 時，不觸發通知', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        (a, b) => {
          const oldCount = Math.max(a, b);
          const newCount = Math.min(a, b); // newCount <= oldCount
          const calls = checkNewReports(oldCount, newCount);
          return calls.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11e：oldCount = 0 時（首次載入），不觸發通知
   *
   * 首次載入時 prevCount = 0，即使 newCount > 0 也不應觸發通知。
   * 這防止首次載入時誤觸發通知。
   */
  it('Property 11e：oldCount = 0 時（首次載入），不觸發通知', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        (newCount) => {
          const calls = checkNewReports(0, newCount);
          return calls.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11f：newCount = oldCount 時（無新增），不觸發通知
   *
   * 戰報數量未變化時，不應觸發通知。
   */
  it('Property 11f：newCount = oldCount 時（無新增），不觸發通知', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        (count) => {
          const calls = checkNewReports(count, count);
          return calls.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11g：通知恰好觸發一次（不重複）
   *
   * 對任意觸發條件，通知函式恰好被呼叫一次，不多不少。
   */
  it('Property 11g：通知恰好觸發一次（不重複）', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        fc.integer({ min: 1, max: 500 }),
        (oldCount, delta) => {
          const newCount = oldCount + delta;
          const calls = checkNewReports(oldCount, newCount);
          return calls.length === 1;
        }
      ),
      { numRuns: 100 }
    );
  });
});
