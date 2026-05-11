# 實作計畫：天網 K 線圖查看器（skynet-kline-viewer）

## 概覽

本計畫將天網 K 線圖查看器功能拆解為一系列漸進式編碼任務。實作順序為：工具函式與型別定義 → API 代理路由 → 前端元件 → 整合至 review 頁面。所有程式碼以 TypeScript 撰寫，圖表使用已安裝的 recharts，動畫使用 framer-motion，測試框架使用 Jest + fast-check。

---

## 任務

- [ ] 1. 安裝測試依賴並建立型別定義
  - 執行 `npm install --save-dev fast-check @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom ts-jest` 安裝測試依賴
  - 建立 `src/types/kline.ts`，定義所有共用型別：`Candle`、`ChartCandle`、`QuoteResponse`、`CandlesResponse`、`ErrorResponse`、`KlinePanelState`、`CacheEntry`
  - 建立 `jest.config.ts`（或 `jest.config.js`）設定 jsdom 環境與 TypeScript 支援
  - _Requirements: 2.2, 2.3, 2.4_

- [ ] 2. 實作 K 線工具函式庫
  - [ ] 2.1 建立 `src/lib/klineUtils.ts`，實作以下純函式：
    - `getCandleDirection(open, close)` → `'up' | 'down' | 'flat'`
    - `getCandleColor(direction)` → 顏色字串（上漲 `#ef4444`、下跌 `#22c55e`、平盤 `#f97316`）
    - `formatDateLabel(dateStr)` → `MM/DD` 格式字串
    - `isInTradingHours(hour, minute)` → boolean（台北時間 09:00–13:30）
    - `clampZoom(value)` → 限制在 `[20, 120]` 範圍內的整數
    - `isCacheValid(timestamp, now)` → boolean（TTL 5 分鐘）
    - `filterCompletedCandles(candles, now)` → 過濾掉當前分鐘及之後的 K 棒
    - `getChangeColor(changePercent)` → 顏色字串（正紅負綠零灰）
    - `sliceCandles(candles, maxCount)` → 取最後 maxCount 筆資料
    - _Requirements: 3.2, 3.5, 4.2, 4.5, 5.2, 7.2, 8.1_

  - [ ]* 2.2 為 `klineUtils.ts` 撰寫屬性測試（`src/lib/klineUtils.test.ts`）
    - **Property 9: 蠟燭方向判斷正確性** — 使用 `fc.float({ noNaN: true })` × 2 驗證 `getCandleDirection`
    - **Property 11: 日期格式化正確性** — 使用 `fc.date()` 驗證 `formatDateLabel` 輸出符合 `MM/DD` 格式
    - **Property 12: 盤中 K 棒過濾完整性** — 驗證 `filterCompletedCandles` 結果不含當前分鐘及之後的 K 棒
    - **Property 13: 交易時段判斷正確性** — 使用 `fc.integer({min:0,max:23})` × `fc.integer({min:0,max:59})` 驗證 `isInTradingHours`
    - **Property 15: 漲跌幅顏色邏輯正確性** — 使用 `fc.float({ noNaN: true })` 驗證 `getChangeColor`
    - **Property 17: 縮放範圍限制** — 使用 `fc.float({ noNaN: true })` 驗證 `clampZoom` 結果在 `[20, 120]`
    - **Property 18: 快取 TTL 有效性** — 使用 `fc.integer()` × `fc.integer()` 驗證 `isCacheValid`
    - **Validates: Requirements 3.2, 3.5, 4.2, 4.5, 5.2, 7.2, 8.1, 8.2**

- [ ] 3. 實作 SMA 計算函式
  - [ ] 3.1 建立 `src/lib/sma.ts`，實作 `calculateSMA(data: number[], period: number): (number | null)[]`
    - 前 `period - 1` 個元素回傳 `null`
    - 索引 `i >= period - 1` 的元素回傳 `data[i - period + 1]` 到 `data[i]` 的算術平均值
    - _Requirements: 3.3_

  - [ ]* 3.2 為 `sma.ts` 撰寫屬性測試（`src/lib/sma.test.ts`）
    - **Property 10: SMA 計算正確性** — 使用 `fc.array(fc.float({ noNaN: true, min: 0, max: 10000 }), { minLength: 1, maxLength: 200 })` 與 `fc.constantFrom(5, 10, 20, 60)` 驗證每個非 null 值等於對應區間的算術平均值，且前 `period - 1` 個元素為 null
    - **Validates: Requirements 3.3**

- [ ] 4. 實作 Fugle API 代理路由
  - [ ] 4.1 建立 `src/app/api/skynet/kline/route.ts`，實作 GET handler：
    - 讀取 `FUGLE_API_KEY` 環境變數，若未設定回傳 HTTP 503 + `{"error": "api_key_not_configured"}`
    - 驗證 `ticker` 參數格式（`/^\d{4,6}$/`），不符回傳 HTTP 400 + `{"error": "invalid_ticker"}`
    - 驗證 `type` 參數值（`daily | intraday | quote`），不符回傳 HTTP 400 + `{"error": "invalid_type"}`
    - 依 `type` 選擇對應 Fugle 端點，設定 10 秒 `AbortController` timeout
    - 每次請求加入 `X-API-KEY` header（值來自 `FUGLE_API_KEY`）
    - Fugle 回傳 429 → 回傳 HTTP 429 + `{"error": "rate_limit_exceeded"}`
    - Fugle 回傳其他 4xx/5xx → 回傳原始狀態碼 + `{"error": "upstream_error"}`（不暴露原始訊息）
    - Fugle 超時 → 回傳 HTTP 504 + `{"error": "upstream_timeout"}`
    - 成功時標準化回應：`daily/intraday` → `{ candles: [...] }`；`quote` → `{ price, change, changePercent, name }`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 6.1, 6.2, 6.4_

  - [ ]* 4.2 為 `route.ts` 撰寫屬性測試（`src/app/api/skynet/kline/route.test.ts`）
    - **Property 4: API 輸入驗證回傳 400** — 使用 `fc.string()` 過濾非 4-6 位數字的 ticker，以及非法 type 字串，驗證回傳 HTTP 400 且不呼叫 Fugle API
    - **Property 5: API 回應結構完整性** — mock Fugle API 成功回應，使用 `fc.string().filter(isValidTicker)` 驗證回應結構完整
    - **Property 6: Upstream 錯誤不暴露原始訊息** — 使用 `fc.integer({ min: 400, max: 599 })` mock Fugle 錯誤，驗證回應不含原始訊息與 API Key
    - **Property 7: 每次請求攜帶 API Key Header** — 驗證每個有效請求都帶有正確的 `X-API-KEY` header
    - **Validates: Requirements 2.5, 2.6, 2.7, 2.10, 6.4**

  - [ ]* 4.3 為 `route.ts` 撰寫單元測試（example-based）
    - 測試 `FUGLE_API_KEY` 未設定 → 回傳 503
    - 測試 Fugle 回傳 429 → 回傳 429 + `rate_limit_exceeded`
    - 測試 Fugle 超時（mock 延遲 > 10s）→ 回傳 504 + `upstream_timeout`
    - _Requirements: 2.8, 2.9, 6.2_

- [ ] 5. 實作 CandlestickChart 元件
  - [ ] 5.1 建立 `src/components/CandlestickChart.tsx`：
    - 接受 `candles: ChartCandle[]` 和 `timeframe: 'daily' | 'intraday'` props
    - 使用 recharts `ComposedChart` 實作主圖（80% 高度）：自訂 `CandleShape` 繪製蠟燭實體與上下影線、SMA5（黃）/SMA10（橘）/SMA20（紫）/SMA60（藍）四條 `Line`
    - 使用第二個 `ComposedChart` 實作成交量子圖（20% 高度）：`Bar` 依漲跌著色
    - X 軸顯示 `MM/DD`（日K）或 `HH:MM`（分K）格式標籤
    - 實作 `KlineTooltip` 自訂 tooltip，顯示日期/時間、開高低收、成交量
    - 支援滑鼠滾輪縮放（`clampZoom` 限制 20–120 根）與拖曳平移（不超出資料邊界）
    - 支援觸控雙指縮放與單指拖曳
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4_

  - [ ]* 5.2 為 `KlineTooltip` 撰寫屬性測試（`src/components/KlineTooltip.test.tsx`）
    - **Property 16: Tooltip 渲染完整性** — 使用 `fc.record({ open: fc.float({ noNaN: true }), high: fc.float({ noNaN: true }), low: fc.float({ noNaN: true }), close: fc.float({ noNaN: true }), volume: fc.nat() })` 驗證 tooltip 包含所有必要欄位且無 NaN/undefined
    - **Validates: Requirements 7.1**

- [ ] 6. 實作 QuoteBar 元件
  - [ ] 6.1 在 `src/components/KLinePanel.tsx` 中實作 `QuoteBar` 子元件（或獨立檔案）：
    - 接受 `ticker: string`、`quote: QuoteResponse | null`、`loading: boolean` props
    - 顯示 Ticker 代號、股票名稱、現價（兩位小數）、漲跌金額（含正負號）、漲跌幅（`+X.XX%` 或 `-X.XX%`）
    - 使用 `getChangeColor` 套用台股紅漲綠跌顏色
    - quote 為 null 或 loading 時，數值欄位顯示 `--`，Ticker 與名稱仍正常顯示
    - _Requirements: 5.1, 5.2, 5.4_

  - [ ]* 6.2 為 `QuoteBar` 撰寫屬性測試（`src/components/QuoteBar.test.tsx`）
    - **Property 14: QuoteBar 渲染完整性** — 使用 `fc.record({ price: fc.float({ noNaN: true, min: 0 }), change: fc.float({ noNaN: true }), changePercent: fc.float({ noNaN: true }), name: fc.string() })` 驗證渲染輸出包含所有必要欄位
    - **Property 15: 漲跌幅顏色邏輯正確性**（整合驗證）— 驗證 QuoteBar 渲染時顏色符合台股慣例
    - **Validates: Requirements 5.1, 5.2**

- [ ] 7. 實作 KLinePanel 主元件
  - [ ] 7.1 完成 `src/components/KLinePanel.tsx` 主元件：
    - 接受 `ticker: string` 和 `onClose: () => void` props
    - 使用 `useRef` Map 實作 Daily K 記憶體快取（TTL 5 分鐘，`isCacheValid` 判斷）
    - 使用 `useRef` 管理 `AbortController`，切換 ticker 時取消前一個請求
    - 面板展開時同時發出 `type=daily` 和 `type=quote` 請求
    - 切換至分K時發出 `type=intraday` 請求，並過濾當前分鐘 K 棒（`filterCompletedCandles`）
    - 使用 `framer-motion` `AnimatePresence` + `motion.div` 實作 slide-down 展開/收起動畫
    - 載入中顯示 spinner 動畫，不顯示空白圖表
    - 依錯誤類型顯示對應的 `ERROR_MESSAGES` 訊息（含 `api_key_not_configured` 引導說明）
    - 非交易時段時在分K圖上方顯示提示文字（`isInTradingHours` 判斷）
    - 包含 `TimeframeToggle`（日K / 分K 切換按鈕）和關閉按鈕
    - 傳入 `CandlestickChart` 前，使用 `sliceCandles` 截取最後 120 筆日K資料，並注入 SMA5/10/20/60
    - _Requirements: 3.1, 3.6, 3.7, 3.8, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.3, 5.4, 6.3, 8.1, 8.2, 8.3, 8.4_

  - [ ]* 7.2 為 `KLinePanel` 撰寫屬性測試（`src/components/KLinePanel.test.tsx`）
    - **Property 1: 無效 Ticker 不展開面板** — 使用 `fc.string()` 過濾非 4-6 位數字，驗證 `openKLine` 後 `klineTicker` 保持 null
    - **Property 2: 開啟面板不改變 Tab 狀態** — 使用 `fc.constantFrom('overview', 'analyze', 'sniper', 'warroom', 'strategy')` 驗證 `openKLine` 後 `activeTab` 不變
    - **Property 3: 切換 Ticker 面板保持展開** — 使用兩個 `fc.string().filter(isValidTicker)` 驗證切換後 `klineTicker` 不為 null
    - **Property 8: 日 K 資料截取上限** — 使用 `fc.array(fc.record({...}), { minLength: 0, maxLength: 200 })` 驗證傳入 `CandlestickChart` 的資料長度為 `min(N, 120)`
    - **Validates: Requirements 1.3, 1.4, 1.6, 3.1, 3.8**

  - [ ]* 7.3 為 `KLinePanel` 撰寫單元測試（example-based）
    - 測試載入中顯示 spinner，不顯示圖表
    - 測試 `error='upstream_error'` 顯示含 ticker 的錯誤文字
    - 測試切換 timeframe 按鈕更新 state
    - 測試快速切換 ticker 時前一個 fetch 被 abort（AbortController）
    - _Requirements: 3.6, 4.1, 8.4_

- [ ] 8. 整合至 review/page.tsx
  - [ ] 8.1 修改 `src/app/review/page.tsx`，整合 `KLinePanel`：
    - 新增 `klineTicker: string | null` state（初始值 `null`）
    - 實作 `openKLine(ticker: string)` callback（含格式驗證 `/^\d{4,6}$/`，不符時不更新 state）
    - 實作 `closeKLine()` callback（設定 `klineTicker` 為 `null`）
    - 在 `<header>` 之後、各 Tab 內容之前插入 `<AnimatePresence>` + `KLinePanel`
    - 修改 `BattleCard` 元件：新增 `onKLine` prop，在卡片底部加入「查看 K 線」按鈕，點擊呼叫 `onKLine(report.ticker)`
    - 修改狙擊清單 `ticker-cell`：改為可點擊的 `<button>`，點擊呼叫 `openKLine(s.ticker)`
    - 確保面板展開/關閉時 `activeTab` 狀態不變、捲動位置不重置
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 9. 最終檢查點 — 確保所有測試通過
  - 執行 `npx jest --testPathPattern="src/(lib|components|app/api)" --passWithNoTests` 確認所有測試通過
  - 執行 `npx next build` 確認 TypeScript 編譯無錯誤
  - 確認 `.env.local` 包含 `FUGLE_API_KEY` 設定說明（可為空值，由 503 錯誤引導）
  - 如有問題，請向使用者確認後再繼續。

---

## 備註

- 標記 `*` 的子任務為選填，可跳過以加速 MVP 開發
- 每個任務均對應具體需求條款，確保可追溯性
- 屬性測試（PBT）使用 fast-check，每個屬性最少 100 次迭代
- 快取僅適用於 Daily K 資料，Intraday 與 Quote 每次重新請求
- 所有顏色遵循台股慣例：上漲紅（`#ef4444`）、下跌綠（`#22c55e`）、平盤橘（`#f97316`）

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 4, "tasks": ["5.2", "6.1"] },
    { "id": 5, "tasks": ["6.2", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3"] },
    { "id": 7, "tasks": ["8.1"] },
    { "id": 8, "tasks": ["9"] }
  ]
}
```
