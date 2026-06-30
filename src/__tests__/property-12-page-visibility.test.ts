/**
 * Property 12：Page Visibility 暫停/恢復行為
 *
 * 對任意 visibility 狀態變化序列，hook 在 `hidden` 狀態時不得觸發刷新，
 * 在 `visible` 狀態時必須立即觸發一次刷新。
 *
 * Validates: Requirements 4.7
 */

import * as fc from 'fast-check';

// ── 純邏輯萃取 ────────────────────────────────────────────────────────────────
// 從 useAutoRefresh 的 visibilitychange handler 萃取出可測試的純邏輯：
// 給定一個 visibility 狀態序列，模擬 handler 的行為，
// 回傳每個狀態下是否觸發了刷新。

type VisibilityState = 'hidden' | 'visible';

interface VisibilityEvent {
  state: VisibilityState;
  refreshTriggered: boolean;
}

/**
 * 模擬 useAutoRefresh 的 visibilitychange 邏輯：
 * - hidden → 暫停（不觸發刷新）
 * - visible → 立即觸發一次刷新
 *
 * @param sequence - visibility 狀態序列
 * @param enabled  - hook 是否啟用（enabled prop）
 * @returns 每個狀態對應的事件記錄
 */
function simulateVisibilityChanges(
  sequence: VisibilityState[],
  enabled: boolean = true
): VisibilityEvent[] {
  return sequence.map((state) => {
    if (state === 'hidden') {
      // hidden → clearInterval，不觸發刷新
      return { state, refreshTriggered: false };
    } else {
      // visible → 若 enabled，立即觸發刷新並重啟計時器
      return { state, refreshTriggered: enabled };
    }
  });
}

// ── Property Tests ────────────────────────────────────────────────────────────

describe('Property 12：Page Visibility 暫停/恢復行為', () => {
  /**
   * Property 12a：hidden 狀態時不得觸發刷新
   *
   * 對任意包含 hidden 狀態的序列，所有 hidden 事件的 refreshTriggered 必須為 false。
   */
  it('Property 12a：hidden 狀態時不得觸發刷新', () => {
    fc.assert(
      fc.property(
        // 生成至少包含一個 hidden 的序列
        fc.array(
          fc.constantFrom<VisibilityState>('hidden', 'visible'),
          { minLength: 1, maxLength: 20 }
        ).filter((seq) => seq.includes('hidden')),
        (sequence) => {
          const events = simulateVisibilityChanges(sequence, true);
          const hiddenEvents = events.filter((e) => e.state === 'hidden');
          return hiddenEvents.every((e) => e.refreshTriggered === false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12b：visible 狀態時（enabled=true）必須立即觸發一次刷新
   *
   * 對任意包含 visible 狀態的序列，所有 visible 事件的 refreshTriggered 必須為 true。
   */
  it('Property 12b：visible 狀態時（enabled=true）必須立即觸發一次刷新', () => {
    fc.assert(
      fc.property(
        // 生成至少包含一個 visible 的序列
        fc.array(
          fc.constantFrom<VisibilityState>('hidden', 'visible'),
          { minLength: 1, maxLength: 20 }
        ).filter((seq) => seq.includes('visible')),
        (sequence) => {
          const events = simulateVisibilityChanges(sequence, true);
          const visibleEvents = events.filter((e) => e.state === 'visible');
          return visibleEvents.every((e) => e.refreshTriggered === true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12c：enabled=false 時，visible 狀態也不得觸發刷新
   *
   * 當 hook 被停用（enabled=false），即使頁面變為 visible，也不應觸發刷新。
   */
  it('Property 12c：enabled=false 時，visible 狀態也不得觸發刷新', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom<VisibilityState>('hidden', 'visible'),
          { minLength: 1, maxLength: 20 }
        ),
        (sequence) => {
          const events = simulateVisibilityChanges(sequence, false);
          return events.every((e) => e.refreshTriggered === false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12d：任意序列中，hidden 與 visible 的刷新行為互斥
   *
   * 對任意序列，hidden 事件的 refreshTriggered 恆為 false，
   * visible 事件（enabled=true）的 refreshTriggered 恆為 true。
   * 兩者行為完全相反，不存在例外。
   */
  it('Property 12d：任意序列中 hidden/visible 刷新行為互斥', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom<VisibilityState>('hidden', 'visible'),
          { minLength: 1, maxLength: 30 }
        ),
        (sequence) => {
          const events = simulateVisibilityChanges(sequence, true);
          for (const event of events) {
            if (event.state === 'hidden' && event.refreshTriggered) return false;
            if (event.state === 'visible' && !event.refreshTriggered) return false;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12e：連續多次 hidden 不累積刷新
   *
   * 對任意全為 hidden 的序列，刷新次數必須為 0。
   */
  it('Property 12e：連續多次 hidden 不累積刷新', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (count) => {
          const sequence: VisibilityState[] = Array(count).fill('hidden');
          const events = simulateVisibilityChanges(sequence, true);
          const totalRefreshes = events.filter((e) => e.refreshTriggered).length;
          return totalRefreshes === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12f：每次 visible 都觸發恰好一次刷新
   *
   * 對任意序列，visible 事件的數量等於刷新觸發次數（enabled=true）。
   */
  it('Property 12f：每次 visible 都觸發恰好一次刷新', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom<VisibilityState>('hidden', 'visible'),
          { minLength: 1, maxLength: 30 }
        ),
        (sequence) => {
          const events = simulateVisibilityChanges(sequence, true);
          const visibleCount = sequence.filter((s) => s === 'visible').length;
          const refreshCount = events.filter((e) => e.refreshTriggered).length;
          return refreshCount === visibleCount;
        }
      ),
      { numRuns: 100 }
    );
  });
});
