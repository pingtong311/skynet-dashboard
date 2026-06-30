/**
 * Property 10：狙擊狀態變化觸發通知
 *
 * 對任意前後兩次狙擊清單，若任一標的狀態從「待觸發」變更為「已觸發」，
 * 通知函式必須被呼叫，且通知標題為「🎯 狙擊突破」。
 *
 * Validates: Requirements 4.4
 */

import * as fc from 'fast-check';

// ── 型別定義（與 review/page.tsx 一致）────────────────────────────────────────
interface SniperCandidate {
  ticker: string;
  name: string;
  triggerPrice: string;
  stopPrice: string;
  currentPrice?: string;
  status: string;
  confidence: string;
  source: string;
  date: string;
}

// ── 純邏輯萃取 ────────────────────────────────────────────────────────────────
// 從 review/page.tsx 的 fetchSnipers 萃取出可測試的純邏輯：
// 比對前後兩次狙擊清單，找出狀態從非「已觸發」→「已觸發」的標的，
// 並呼叫通知函式。

interface NotificationCall {
  title: string;
  ticker: string;
  name: string;
  triggerPrice: string;
}

/**
 * 模擬 fetchSnipers 中的通知觸發邏輯：
 * 比對 prevSnipers 與 newSnipers，對每個狀態從非「已觸發」→「已觸發」的標的，
 * 記錄一次通知呼叫（標題固定為「🎯 狙擊突破」）。
 *
 * @param prevSnipers - 前次狙擊清單
 * @param newSnipers  - 新狙擊清單
 * @returns 所有被觸發的通知呼叫記錄
 */
function checkSniperTriggers(
  prevSnipers: SniperCandidate[],
  newSnipers: SniperCandidate[]
): NotificationCall[] {
  const calls: NotificationCall[] = [];

  // 只有前次清單非空時才比對（與 review/page.tsx 邏輯一致）
  if (prevSnipers.length === 0) return calls;

  for (const newSniper of newSnipers) {
    const prev = prevSnipers.find((p) => p.ticker === newSniper.ticker);
    if (prev && prev.status !== '已觸發' && newSniper.status === '已觸發') {
      calls.push({
        title: '🎯 狙擊突破',
        ticker: newSniper.ticker,
        name: newSniper.name,
        triggerPrice: newSniper.triggerPrice,
      });
    }
  }

  return calls;
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const tickerArb = fc.stringMatching(/^\d{4,6}$/);

const nonTriggeredStatusArb = fc.constantFrom(
  '待觸發',
  '監控中',
  '已撤退',
  '暫停',
  'pending',
  'watching'
);

const sniperBaseArb = fc.record({
  ticker: tickerArb,
  name: fc.string({ minLength: 1, maxLength: 10 }),
  triggerPrice: fc.float({ min: 1, max: 9999, noNaN: true }).map((v) => v.toFixed(2)),
  stopPrice: fc.float({ min: 1, max: 9999, noNaN: true }).map((v) => v.toFixed(2)),
  confidence: fc.constantFrom('高', '中', '低'),
  source: fc.constantFrom('Dashboard', 'Telegram'),
  date: fc.constant('2025-01-01'),
});

// ── Property Tests ────────────────────────────────────────────────────────────

describe('Property 10：狙擊狀態變化觸發通知', () => {
  /**
   * Property 10a：狀態從非「已觸發」→「已觸發」時，通知必須被呼叫
   *
   * 對任意前後兩次狙擊清單，若任一標的狀態從非「已觸發」變更為「已觸發」，
   * 通知函式必須被呼叫。
   */
  it('Property 10a：狀態從非「已觸發」→「已觸發」時，通知必須被呼叫', () => {
    fc.assert(
      fc.property(
        // 生成一個「待觸發」→「已觸發」的標的
        fc.record({
          base: sniperBaseArb,
          prevStatus: nonTriggeredStatusArb,
        }),
        // 生成額外的背景標的（不觸發）
        fc.array(
          fc.record({
            base: sniperBaseArb,
            status: nonTriggeredStatusArb,
          }),
          { minLength: 0, maxLength: 5 }
        ),
        ({ base, prevStatus }, others) => {
          const triggeredTicker = base.ticker;

          // 確保背景標的的 ticker 不與觸發標的重複
          const uniqueOthers = others.filter((o) => o.base.ticker !== triggeredTicker);

          const prevSnipers: SniperCandidate[] = [
            { ...base, status: prevStatus },
            ...uniqueOthers.map((o) => ({ ...o.base, status: o.status })),
          ];

          const newSnipers: SniperCandidate[] = [
            { ...base, status: '已觸發' },
            ...uniqueOthers.map((o) => ({ ...o.base, status: o.status })),
          ];

          const calls = checkSniperTriggers(prevSnipers, newSnipers);

          // 必須有至少一次通知呼叫
          return calls.length >= 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10b：通知標題必須為「🎯 狙擊突破」
   *
   * 對任意觸發通知的情境，所有通知呼叫的標題必須為「🎯 狙擊突破」。
   */
  it('Property 10b：通知標題必須為「🎯 狙擊突破」', () => {
    fc.assert(
      fc.property(
        fc.record({
          base: sniperBaseArb,
          prevStatus: nonTriggeredStatusArb,
        }),
        ({ base, prevStatus }) => {
          const prevSnipers: SniperCandidate[] = [{ ...base, status: prevStatus }];
          const newSnipers: SniperCandidate[] = [{ ...base, status: '已觸發' }];

          const calls = checkSniperTriggers(prevSnipers, newSnipers);

          return calls.every((c) => c.title === '🎯 狙擊突破');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10c：狀態維持「已觸發」不重複通知
   *
   * 若前次狀態已為「已觸發」，新狀態仍為「已觸發」，不應再次觸發通知。
   */
  it('Property 10c：狀態維持「已觸發」不重複通知', () => {
    fc.assert(
      fc.property(
        sniperBaseArb,
        (base) => {
          const prevSnipers: SniperCandidate[] = [{ ...base, status: '已觸發' }];
          const newSnipers: SniperCandidate[] = [{ ...base, status: '已觸發' }];

          const calls = checkSniperTriggers(prevSnipers, newSnipers);

          // 已觸發 → 已觸發，不應再次通知
          return calls.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10d：前次清單為空時，不觸發任何通知
   *
   * 若 prevSnipers 為空（首次載入），不應觸發通知。
   */
  it('Property 10d：前次清單為空時，不觸發任何通知', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            base: sniperBaseArb,
            status: fc.constantFrom('待觸發', '已觸發', '監控中'),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (newItems) => {
          const prevSnipers: SniperCandidate[] = [];
          const newSnipers: SniperCandidate[] = newItems.map((item) => ({
            ...item.base,
            status: item.status,
          }));

          const calls = checkSniperTriggers(prevSnipers, newSnipers);

          return calls.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10e：狀態未變化時，不觸發通知
   *
   * 對任意非「已觸發」狀態，若前後狀態相同，不應觸發通知。
   */
  it('Property 10e：狀態未變化時，不觸發通知', () => {
    fc.assert(
      fc.property(
        sniperBaseArb,
        nonTriggeredStatusArb,
        (base, status) => {
          const prevSnipers: SniperCandidate[] = [{ ...base, status }];
          const newSnipers: SniperCandidate[] = [{ ...base, status }];

          const calls = checkSniperTriggers(prevSnipers, newSnipers);

          return calls.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10f：多個標的同時觸發時，每個都產生通知
   *
   * 若多個標的同時從非「已觸發」→「已觸發」，每個都應產生一次通知。
   */
  it('Property 10f：多個標的同時觸發時，每個都產生通知', () => {
    fc.assert(
      fc.property(
        // 生成 2-5 個不同 ticker 的標的
        fc.uniqueArray(tickerArb, { minLength: 2, maxLength: 5 }).chain((tickers) =>
          fc.tuple(
            ...tickers.map((ticker) =>
              fc.record({
                base: sniperBaseArb.map((b) => ({ ...b, ticker })),
                prevStatus: nonTriggeredStatusArb,
              })
            )
          )
        ),
        (items) => {
          const prevSnipers: SniperCandidate[] = items.map((item) => ({
            ...item.base,
            status: item.prevStatus,
          }));
          const newSnipers: SniperCandidate[] = items.map((item) => ({
            ...item.base,
            status: '已觸發',
          }));

          const calls = checkSniperTriggers(prevSnipers, newSnipers);

          // 每個標的都應產生一次通知
          return calls.length === items.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});
