# Implementation Plan: Dashboard War Room Upgrade

## Overview

分三個 Phase 實作天網戰情室升級：Phase A 修復健康檢查、新增核心即時數據面板與三時段自適應佈局；Phase B 整合 MOPS 重大訊息、月營收、三大法人、融資融券；Phase C 擴充 K 線圖、個人績效儀表板與自選監控管理介面。所有程式碼使用 TypeScript，API routes 保持 `export const runtime = 'edge'`，圖表使用 Recharts，部署至 Cloudflare Pages。

## Tasks

---

### Phase A：核心即時數據

- [x] 1. 修復健康檢查前端輪詢邏輯
  - [x] 1.1 修改 `src/app/warroom/page.tsx`（或現有戰情室頁面）的健康檢查呼叫邏輯：頁面載入時立即觸發一次健康檢查，並使用 `setInterval` 每 60 秒自動重新探測
    - 使用 `useEffect` + `useCallback` 管理輪詢生命週期，元件 unmount 時清除 interval
    - 健康狀態以顏色區分：`ok` → 綠色、`error` → 紅色、`timeout` → 黃色、`loading` → 灰色
    - _Requirements: 1.4, 1.6_

  - [ ]* 1.2 寫 property test：HTTP status code 分類正確性
    - **Property 1：HTTP Status Code 分類正確性**
    - 對任意 HTTP status code，`checkWithTimeout` 的分類結果應滿足：200–499 → `'ok'`，500+ → `'error'`，AbortError → `'timeout'`，其他例外 → `'error'`
    - **Validates: Requirements 1.1, 1.2, 1.5**

  - [ ]* 1.3 寫 property test：健康檢查回應結構完整性
    - **Property 2：健康檢查回應結構完整性**
    - 對任意 n8n 和 sheets 的狀態組合（`'ok' | 'error' | 'timeout'` 的任意排列），健康檢查 API 回應必定包含 `n8n`、`sheets`、`checkedAt` 三個欄位，且 `checkedAt` 為合法 ISO 8601 時間字串
    - **Validates: Requirements 1.3**

- [x] 2. 新增 TWSE MIS Edge API Route
  - [x] 2.1 新增 `src/app/api/skynet/twse/route.ts`
    - `export const runtime = 'edge'`
    - GET handler：解析 `?tickers=t99,0050,2330`（逗號分隔）
    - 組合外部 URL：`https://mis.twse.com.tw/stock/api/getStockInfo.asp?ex_ch=tse_t99.tw|tse_0050.tw|...`
    - 解析 TWSE MIS 原始欄位：`z`（現價）、`y`（昨收）、`o`（開盤）、`h`（最高）、`l`（最低）、`v`（成交量）、`t`（時間）、`n`（名稱）、`c`（代號）
    - 回傳標準化 `TWSEMISResponse`，逾時 5 秒，`Cache-Control: public, max-age=25`
    - _Requirements: 4.1, 14.1, 14.2_

- [x] 3. 新增 n8n-proxy Edge API Route
  - [x] 3.1 新增 `src/app/api/skynet/n8n-proxy/route.ts`
    - `export const runtime = 'edge'`
    - GET handler：解析 `?type=positions|p1_triggers|snipers|personal_performance`，代理至 `https://skynet-cmd.duckdns.org/webhook/skynet-dashboard?type={type}`，逾時 8 秒
    - POST handler：轉發 body（`type=update_monitoring`）至 n8n webhook，逾時 10 秒
    - 統一錯誤處理：逾時 → HTTP 504，n8n 非 200 → HTTP 502，其他 → HTTP 500
    - _Requirements: 2.1, 3.1, 5.1, 5.3, 13.2, 14.1, 14.2_

- [x] 4. 新增工具函式庫
  - [x] 4.1 新增 `src/lib/tradingSessionUtils.ts`：實作 `getTradingSession(date: Date): 'pre-market' | 'trading' | 'post-market' | 'weekend'`
    - 週六（6）和週日（0）回傳 `'weekend'`
    - 週一至週五 09:00–13:30 回傳 `'trading'`
    - 週一至週五 09:00 前回傳 `'pre-market'`
    - 週一至週五 13:30 後回傳 `'post-market'`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 4.2 寫 property test：交易時段分類正確性
    - **Property 7：交易時段分類正確性**
    - 對任意合法台北時間（小時 0–23、分鐘 0–59、星期 0–6），時段分類函式應回傳且只回傳四種值之一；週六（6）和週日（0）必定回傳 `'weekend'`，週一至週五 09:00–13:30 必定回傳 `'trading'`
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

  - [x] 4.3 新增 `src/lib/pnlCalculator.ts`：實作 `calcPnL(currentPrice, avgCost, shares)` 與 `calcReturnRate(currentPrice, avgCost)`
    - `pnl = (currentPrice - avgCost) × shares`
    - `returnRate = (currentPrice - avgCost) / avgCost × 100`
    - _Requirements: 2.3, 2.4_

  - [ ]* 4.4 寫 property test：持倉損益與報酬率計算正確性
    - **Property 3：持倉損益與報酬率計算正確性**
    - 對任意正數現價、正數平均成本、正整數持有股數，浮動損益應等於 `(現價 - 平均成本) × 持有股數`，報酬率應等於 `(現價 - 平均成本) / 平均成本 × 100`，且兩者符號一致
    - **Validates: Requirements 2.3, 2.4**

  - [x] 4.5 新增 `src/lib/colorUtils.ts`：實作 `getTwseColorClass(value: number): string`
    - 正數 → 紅色 CSS class（`text-red-400`）
    - 負數 → 綠色 CSS class（`text-green-400`）
    - 零 → 中性 CSS class（`text-gray-400`）
    - _Requirements: 1.6, 2.5, 3.3, 4.3, 8.3, 9.3_

  - [ ]* 4.6 寫 property test：台股顏色慣例映射正確性
    - **Property 5：台股顏色慣例映射正確性**
    - 對任意有限浮點數，顏色映射函式應滿足：正數 → 紅色 CSS class，負數 → 綠色 CSS class，零 → 中性 CSS class；映射結果只有三種可能值，不得拋出例外
    - **Validates: Requirements 1.6, 2.5, 3.3, 4.3, 8.3, 9.3**

  - [x] 4.7 新增 `src/lib/distanceCalculator.ts`：實作 `calcDistancePct(triggerPrice, currentPrice)` 與 `getDistanceColorClass(distPct)`
    - `distPct = (triggerPrice - currentPrice) / currentPrice × 100`
    - `distPct < 0` → 觸發色（`text-red-400`）
    - `0 ≤ distPct < 1` → 警示色（`text-orange-400`）
    - `distPct ≥ 1` → 正常色（`text-gray-300`）
    - _Requirements: 3.3, 3.4, 3.5_

  - [ ]* 4.8 寫 property test：距觸發百分比計算與閾值分類
    - **Property 6：距觸發百分比計算與閾值分類**
    - 對任意正數觸發價和正數現價，距觸發百分比應等於 `(觸發價 - 現價) / 現價 × 100`；對任意計算結果，閾值分類應滿足：`< 0%` → 觸發色，`0% ≤ x < 1%` → 警示色，`≥ 1%` → 正常色
    - **Validates: Requirements 3.3, 3.4, 3.5**

  - [x] 4.9 新增 `src/lib/priceValidator.ts`：實作 `validatePrice(input: string): boolean`
    - 能解析為正數浮點數的字串 → `true`
    - 空字串、零、負數、非數字字串、Infinity → `false`
    - 不得拋出例外
    - _Requirements: 13.1_

  - [ ]* 4.10 寫 property test：目標價/停損價輸入驗證正確性
    - **Property 8：目標價/停損價輸入驗證正確性**
    - 對任意字串輸入，驗證函式應滿足：能解析為正數浮點數的字串 → 通過，空字串/零/負數/非數字字串/Infinity → 拒絕；驗證結果只有兩種，不得拋出例外
    - **Validates: Requirements 13.1**

- [x] 5. Checkpoint A1 — 確認工具函式與 API Routes 正常
  - 確保所有測試通過，確認 TWSE MIS route 與 n8n-proxy route 建置無誤，詢問使用者是否有問題。

- [x] 6. 新增 IndexPanel 元件
  - [x] 6.1 新增 `src/components/warroom/IndexPanel.tsx`
    - Props：`IndexPanelProps`（`quotes: IndexQuote[]`、`loading`、`error`、`lastUpdated`）
    - 顯示加權指數（`t99`）與 0050 的：名稱、現值、漲跌點數、漲跌幅（%）
    - 使用 `getTwseColorClass` 套用台股顏色慣例
    - 非盤中時段顯示「非交易時段」標示
    - API 失敗時顯示「指數資料暫時無法取得」，不崩潰
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_

- [x] 7. 新增 PositionCard 元件
  - [x] 7.1 新增 `src/components/warroom/PositionCard.tsx`
    - Props：`PositionCardProps`（`positions: Position[]`、`loading`、`error`、`isTrading`、`lastUpdated`、`onTickerClick`）
    - 顯示每支持倉：代號、名稱、持有股數、平均成本、現價、浮動損益（元）、報酬率（%）
    - 使用 `calcPnL`、`calcReturnRate`、`getTwseColorClass` 計算並套用顏色
    - 卡片底部顯示所有持倉總浮動損益加總
    - 非盤中時段顯示「非交易時段」標示；API 失敗時顯示「報價暫時無法取得」並保留上次數據
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 2.9, 2.10_

  - [ ]* 7.2 寫 property test：持倉總損益加總正確性
    - **Property 4：持倉總損益加總正確性**
    - 對任意非空持倉清單，卡片底部顯示的總浮動損益應等於所有持倉浮動損益的算術總和，且加法具有交換律（清單順序不影響總和）
    - **Validates: Requirements 2.10**

- [x] 8. 新增/擴充 SniperPanel 元件
  - [x] 8.1 新增 `src/components/warroom/SniperPanel.tsx`
    - Props：`SniperPanelProps`（`snipers: SniperItem[]`、`loading`、`error`、`isTrading`、`onTickerClick`、`onRetreat`）
    - 顯示每支標的：代號、名稱、觸發價、防守價、現價、距觸發%、狀態、來源
    - 使用 `calcDistancePct` 與 `getDistanceColorClass` 計算距觸發並套用顏色
    - 清單為空時顯示「目前無待觸發標的」
    - 盤中時段每 60 秒自動刷新
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 9. 新增 P1TriggerPanel 元件
  - [x] 9.1 新增 `src/components/warroom/P1TriggerPanel.tsx`
    - Props：`P1TriggerPanelProps`（`triggers: P1Trigger[]`、`loading`、`error`）
    - 顯示每筆觸發紀錄：代號、名稱、觸發類型（止盈/止損）、觸發價、觸發時間
    - 清單為空時顯示「今日尚無觸發紀錄」
    - _Requirements: 5.1, 5.2, 5.6_

- [x] 10. 新增 P2ScanPanel 元件
  - [x] 10.1 新增 `src/components/warroom/P2ScanPanel.tsx`
    - Props：`P2ScanPanelProps`（`candidates: P2Candidate[]`、`loading`、`error`、`onTickerClick`）
    - 顯示每筆收盤選股結果：代號、名稱、信心分數、觸發價、來源標記（`POST_MARKET_SCAN`）
    - 清單為空時顯示「今日尚無收盤選股結果」
    - _Requirements: 5.3, 5.4, 5.5_

- [ ] 11. 新增 TradingSessionLayout 元件
  - [x] 11.1 新增 `src/components/warroom/TradingSessionLayout.tsx`
    - 使用 `getTradingSession` 判斷當前時段，自動選擇顯示內容
    - 開盤前：顯示晨間報告摘要（Alpha 輸出）、今日關注族群、前一日 P2 輸出
    - 盤中：顯示 IndexPanel、PositionCard、SniperPanel
    - 收盤後：顯示 P1TriggerPanel、P2ScanPanel、今日 AI 戰報
    - 週末/非交易日：顯示最近一個交易日的收盤後資訊
    - 頁面頂部顯示當前時段標籤（「開盤前」、「盤中」、「收盤後」、「非交易日」）
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 11.2 新增 `src/components/warroom/SessionTabBar.tsx`：允許使用者手動切換時段，不受自動時段限制
    - 三個 Tab：「開盤前」、「盤中」、「收盤後」
    - 手動選擇後覆蓋自動時段判斷，顯示對應面板
    - _Requirements: 6.6_

- [ ] 12. 整合所有 Phase A 元件到 warroom/page.tsx
  - [x] 12.1 新增 `src/app/warroom/page.tsx`（或修改現有戰情室頁面路由）
    - `'use client'` 指令，使用 `useState`/`useEffect`/`useCallback` 管理所有狀態
    - 整合 `HealthStatusBar`（頂部連線狀態列，60 秒輪詢）
    - 整合 `TradingSessionLayout`（含 `SessionTabBar`）
    - 整合 `IndexPanel`（盤中 30 秒輪詢）
    - 整合 `PositionCard`（盤中 30 秒輪詢，呼叫 `/api/skynet/n8n-proxy?type=positions` + `/api/skynet/twse`）
    - 整合 `SniperPanel`（盤中 60 秒輪詢，呼叫 `/api/skynet/n8n-proxy?type=snipers` + `/api/skynet/twse`）
    - 整合 `P1TriggerPanel`（呼叫 `/api/skynet/n8n-proxy?type=p1_triggers`）
    - 整合 `P2ScanPanel`（從 snipers 資料中篩選 `source=POST_MARKET_SCAN`）
    - 每個面板獨立管理 loading/error 狀態，單一 API 失敗不影響其他面板
    - 每個面板顯示 `lastUpdated` 時間戳記
    - _Requirements: 2.7, 3.6, 4.4, 6.1, 6.2, 6.3, 14.3, 14.5, 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 13. Checkpoint A2 — Phase A 建置驗證 + Cloudflare 部署
  - 執行 `npm run build:cf` 確認靜態匯出成功，確保所有 Phase A 測試通過，詢問使用者是否有問題。

---

### Phase B：法人籌碼數據

- [x] 14. 新增 TWSE Opendata Edge API Route
  - [x] 14.1 新增 `src/app/api/skynet/opendata/route.ts`
    - `export const runtime = 'edge'`
    - GET handler：解析 `?type=institutional|margin|revenue&tickers=2330,00878`
    - `type=institutional`：代理至 `https://opendata.twse.com.tw/v1/exchangeReport/BWIBBU_d`
    - `type=margin`：代理至 `https://opendata.twse.com.tw/v1/exchangeReport/MI_MARGN`，篩選指定 tickers
    - `type=revenue`：代理至 `https://opendata.twse.com.tw/v1/financialStatements/MONTHLY_REVENUE`，篩選指定 tickers
    - 逾時 8 秒，`Cache-Control: public, max-age=300`
    - _Requirements: 8.1, 9.1, 10.1, 14.1, 14.2_

- [x] 15. 新增 MOPS Edge API Route
  - [x] 15.1 新增 `src/app/api/skynet/mops/route.ts`
    - `export const runtime = 'edge'`
    - GET handler：解析 `?tickers=2330,00878`
    - 對每支 ticker 發出 POST 至 `https://mops.twse.com.tw/mops/web/ajax_t05st01`，合併結果取最新 10 則
    - 逾時 10 秒，`Cache-Control: public, max-age=600`
    - MOPS 無法存取時回傳 `{ announcements: [], error: 'mops_unavailable' }`
    - _Requirements: 7.1, 7.5, 14.1, 14.2_

- [x] 16. 新增 MOPSPanel 元件
  - [x] 16.1 新增 `src/components/warroom/MOPSPanel.tsx`
    - 顯示持倉股票的最新重大訊息公告（最多 10 則）
    - 每則公告顯示：股票代號、公司名稱、公告標題、公告時間
    - 超過 10 則時提供「查看更多」連結至 MOPS 原始頁面
    - API 失敗時顯示「重大訊息暫時無法取得」，不影響其他面板
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 17. 新增 MonthlyRevenuePanel 元件
  - [x] 17.1 新增 `src/components/warroom/MonthlyRevenuePanel.tsx`
    - 顯示持倉股票的最新月營收：當月營收（百萬元）、月增率（%）、年增率（%）
    - 使用 `getTwseColorClass` 套用台股顏色慣例（年增率正 → 紅色，負 → 綠色）
    - API 失敗時顯示「月營收資料暫時無法取得」
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 18. 新增 InstitutionalPanel 元件
  - [x] 18.1 新增 `src/components/warroom/InstitutionalPanel.tsx`
    - 顯示外資、投信、自營商各自的買超金額（億元）與賣超金額（億元）
    - 淨買超 → 紅色，淨賣超 → 綠色（台股慣例）
    - 盤中時段每 5 分鐘自動刷新
    - API 失敗時顯示「法人數據暫時無法取得」
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 19. 新增 MarginPanel 元件
  - [x] 19.1 新增 `src/components/warroom/MarginPanel.tsx`
    - 顯示每支持倉股票：融資餘額（張）、融資增減（張）、融券餘額（張）、融券增減（張）
    - 融資減少且股價上漲時以 ⭐ 標示「籌碼乾淨」
    - API 失敗時顯示「融資融券資料暫時無法取得」
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 20. 整合 Phase B 元件到 warroom/page.tsx
  - [x] 20.1 修改 `src/app/warroom/page.tsx`：新增 Phase B 區塊
    - 整合 `MOPSPanel`（呼叫 `/api/skynet/mops?tickers={持倉代號}`）
    - 整合 `MonthlyRevenuePanel`（呼叫 `/api/skynet/opendata?type=revenue&tickers={持倉代號}`）
    - 整合 `InstitutionalPanel`（呼叫 `/api/skynet/opendata?type=institutional`，盤中 5 分鐘輪詢）
    - 整合 `MarginPanel`（呼叫 `/api/skynet/opendata?type=margin&tickers={持倉代號}`）
    - 各面板獨立 loading/error 狀態，顯示 `lastUpdated` 時間戳記
    - _Requirements: 7.1, 8.1, 9.1, 9.4, 10.1, 15.1, 15.4_

- [x] 21. Checkpoint B — Phase B 建置驗證 + Cloudflare 部署
  - 執行 `npm run build:cf` 確認靜態匯出成功，確保所有 Phase B 元件正常渲染，詢問使用者是否有問題。

---

### Phase C：進階分析工具

- [x] 22. 擴充 KLinePanel（目標價/停損價水平線）
  - [x] 22.1 修改現有 `src/components/KLinePanel.tsx`（或 `CandlestickChart.tsx`）：新增 `target?: number` 與 `stopLoss?: number` props
    - 在 K 線圖上使用 Recharts `ReferenceLine` 疊加顯示目標價（綠色虛線，`strokeDasharray="4 2"`）與停損價（紅色虛線）
    - 附帶價格標籤
    - 持倉股票點擊時傳入對應的 `targetPrice` 與 `stopPrice`
    - _Requirements: 11.1, 11.6_

- [x] 23. 新增 PerformanceDashboard 元件
  - [x] 23.1 新增 `src/components/warroom/PerformanceDashboard.tsx`
    - 顯示績效摘要：總交易次數、勝率（%）、平均報酬率（%）、最大回撤（%）
    - 顯示每筆已賣出交易：代號、名稱、買入成本、賣出價格、實際損益（元）、報酬率（%）
    - 使用 Recharts `LineChart` 繪製累積報酬率折線圖（X 軸日期，Y 軸累積報酬率%）
    - 績效數據為空時顯示「尚無交易紀錄」
    - API 失敗時顯示「績效資料暫時無法取得」
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 24. 新增 MonitoringManager 元件
  - [x] 24.1 新增 `src/components/warroom/MonitoringManager.tsx`
    - 顯示每支持倉：代號、名稱、持有股數、平均成本、目標價（可編輯）、停損價（可編輯）、類型（ETF/個股）
    - 使用 `validatePrice` 驗證輸入值，非法輸入顯示錯誤提示
    - 確認儲存時呼叫 `POST /api/skynet/n8n-proxy`（`type=update_monitoring`）寫回 Google Sheets
    - 寫入成功顯示「✅ 已更新」，3 秒後自動刷新持倉清單
    - 寫入失敗顯示「更新失敗，請稍後再試」，保留使用者輸入值
    - 支援新增持倉：輸入代號、名稱、持有股數、平均成本後透過 n8n webhook 寫入
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

- [x] 25. 整合 Phase C 元件到 warroom/page.tsx
  - [x] 25.1 修改 `src/app/warroom/page.tsx`：新增 Phase C 區塊
    - 整合擴充後的 `KLinePanel`（點擊任何股票代號時開啟，傳入 `target` 與 `stopLoss`）
    - 整合 `PerformanceDashboard`（呼叫 `/api/skynet/n8n-proxy?type=personal_performance`）
    - 整合 `MonitoringManager`（呼叫 `/api/skynet/n8n-proxy?type=positions`，POST 更新）
    - _Requirements: 11.1, 12.1, 13.2, 15.1, 15.4_

- [x] 26. Final Checkpoint — Phase C 建置驗證 + Cloudflare 部署
  - 執行 `npm run build:cf` 確認靜態匯出成功，確保所有三個 Phase 功能完整，詢問使用者是否有問題。

---

## Notes

- 標記 `*` 的子任務為選填，可跳過以加速 MVP 交付
- 所有 API routes 必須保持 `export const runtime = 'edge'`（Cloudflare Pages 限制）
- Property tests 使用 **fast-check**（已在 `devDependencies`），每個 property 最少執行 100 次迭代
- Unit tests 使用 **Jest + ts-jest**（已在 `devDependencies`）
- `src/components/warroom/` 目錄需新建
- `src/lib/` 目錄中的工具函式（`tradingSessionUtils`、`pnlCalculator`、`colorUtils`、`distanceCalculator`、`priceValidator`）為純函式，適合 property-based testing
- Phase A 的 `PositionCard` 與 `SniperPanel` 需同時呼叫 n8n-proxy（取持倉/狙擊清單）與 TWSE MIS（取即時報價），兩個 API 呼叫應並行執行
- 所有面板的 loading/error 狀態獨立管理，確保單一 API 失敗不影響其他面板（Requirements 15.1）
- `warroom/page.tsx` 若現有路由為 `/review`，需確認路由對應關係後再決定是修改現有頁面或新增路由

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1", "4.1", "4.3", "4.5", "4.7", "4.9"] },
    { "id": 1, "tasks": ["1.2", "1.3", "4.2", "4.4", "4.6", "4.8", "4.10", "6.1"] },
    { "id": 2, "tasks": ["7.1", "8.1", "9.1", "10.1", "11.1", "11.2"] },
    { "id": 3, "tasks": ["7.2", "12.1"] },
    { "id": 4, "tasks": ["14.1", "15.1"] },
    { "id": 5, "tasks": ["16.1", "17.1", "18.1", "19.1"] },
    { "id": 6, "tasks": ["20.1"] },
    { "id": 7, "tasks": ["22.1", "23.1", "24.1"] },
    { "id": 8, "tasks": ["25.1"] }
  ]
}
```
