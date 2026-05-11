# Implementation Plan: Dashboard Web Upgrade

## Overview

分四個 Phase 實作天網 Dashboard 升級：B1 同步 Analyze_API、B2 K 線技術指標、B3 指揮中心升級、B4 自動刷新與瀏覽器通知。所有程式碼使用 TypeScript，API routes 保持 `export const runtime = 'edge'`，圖表使用 recharts，動畫使用 framer-motion。

## Tasks

---

### Phase B1：Analyze_API 同步回傳

- [ ] 1. 修改 Analyze_API 為同步等待模式
  - [x] 1.1 修改 `src/app/api/skynet/analyze/route.ts`：將 `TIMEOUT_MS` 從 `8000` 改為 `60000`，移除 `AbortError` 時回傳 `status: 'processing'` 的邏輯，改為回傳 HTTP 504 `{ error: "analysis_timeout", message: "分析逾時，請稍後再試" }`
    - 移除空回應時回傳 `processing` 狀態的分支，改為 HTTP 502 `{ error: "upstream_error" }`
    - n8n 非 200 回應改為 HTTP 502 `{ error: "upstream_error" }`
    - 其他未知錯誤保持 HTTP 500 `{ error: "internal_error" }`
    - 保持 `export const runtime = 'edge'`
    - _Requirements: 1.1, 1.4, 1.5, 1.7_

  - [ ]* 1.2 寫 property test：Analyze_API 不回傳 processing 狀態
    - **Property 1：Analyze_API 不回傳 processing 狀態**
    - 使用 fast-check，對任意有效 ticker（4-6 位數字），當 n8n 回傳完整 JSON 時，回應不得含 `status: 'processing'`
    - **Validates: Requirements 1.1**

  - [ ]* 1.3 寫 property test：完整戰報包含所有必要欄位
    - **Property 2：完整戰報包含所有必要欄位**
    - 對任意合法 n8n 回應 JSON，輸出必須包含 `ticker`、`name`、`price`、`action`、`confidence`、`target`、`stopLoss`、`strategyType`、`momentum`、`verdictTitle`、`todayView`、`reason`
    - **Validates: Requirements 1.2**

- [x] 2. 修改 AnalysisCard 元件移除 processing 中間狀態
  - [x] 2.1 修改 `src/app/review/page.tsx` 中的 `AnalysisCard` 子元件：移除 `status === 'processing'` 的渲染分支，改為直接渲染完整戰報或錯誤訊息
    - HTTP 504 → 顯示「分析逾時，請稍後再試」並附帶 AlertTriangle 圖示與手動重試提示
    - HTTP 502 → 顯示「n8n 服務暫時無法連線」
    - 完整戰報 → 直接渲染 `AnalysisCard` 完整版（含 4 位專家分析、Target/StopLoss、技術快照）
    - _Requirements: 1.3, 1.4, 1.5_

- [~] 3. Checkpoint B1 — 確認同步回傳正常運作
  - 確保所有測試通過，確認 `analyze/route.ts` 不含 `processing` 回傳邏輯，詢問使用者是否有問題。

---

### Phase B2：K 線圖技術指標

- [x] 4. 新增指標計算函式庫
  - [x] 4.1 新增 `src/lib/indicators.ts`：實作 `calculateEMA`（含 SMA 種子值 warm-up）
    - `calculateEMA(data: number[], period: number): (number | null)[]`
    - 前 `period - 1` 個位置回傳 `null`，第 `period` 個位置用前 `period` 個值的 SMA 作為種子
    - 之後使用遞推公式 `EMA(t) = close(t) × k + EMA(t-1) × (1-k)`，`k = 2 / (period + 1)`
    - _Requirements: 2.6_

  - [x] 4.2 在 `src/lib/indicators.ts` 新增 `calculateMACD`
    - `calculateMACD(closes, fastPeriod=12, slowPeriod=26, signalPeriod=9): MACDResult`
    - `dif = EMA(12) - EMA(26)`，`signal = EMA(dif, 9)`，`hist = dif - signal`
    - 輸入不足時對應位置回傳 `null`，不拋出例外
    - _Requirements: 2.1, 2.6, 2.7_

  - [ ]* 4.3 寫 property test：MACD 輸出陣列長度與輸入相同
    - **Property 3：MACD 輸出陣列長度一致性**
    - 對任意長度 ≥ 1 的 closes 陣列，`calculateMACD` 回傳的 `dif`、`signal`、`hist` 陣列長度必須與輸入相同
    - **Validates: Requirements 2.1, 2.7**

  - [x] 4.4 在 `src/lib/indicators.ts` 新增 `calculateKD`
    - `calculateKD(highs, lows, closes, period=9, kSmooth=3, dSmooth=3): KDResult`
    - RSV = `(close - lowest_low(9)) / (highest_high(9) - lowest_low(9)) × 100`
    - `highest_high === lowest_low` 時 RSV 設為 50（避免除以零）
    - K/D 初始值為 50，使用平滑係數遞推
    - _Requirements: 2.2, 2.6, 2.7_

  - [ ]* 4.5 寫 property test：KD 值域限制
    - **Property 4：KD 值域限制**
    - 對任意有效 OHLCV 資料（high ≥ low，close 在 [low, high] 範圍內），所有非 null K 值與 D 值必須在 [0, 100] 範圍內
    - **Validates: Requirements 2.2, 2.7**

  - [x] 4.6 在 `src/lib/indicators.ts` 新增 `calculateBollingerBands`
    - `calculateBollingerBands(closes, period=20, multiplier=2): BollingerResult`
    - `middle = SMA(20)`，`stdDev = √(Σ(close - middle)² / 20)`，`upper = middle + 2×stdDev`，`lower = middle - 2×stdDev`
    - 前 `period - 1` 個位置回傳 `null`
    - _Requirements: 2.4, 2.6, 2.7_

  - [ ]* 4.7 寫 property test：Bollinger Bands 上軌 ≥ 中軌 ≥ 下軌
    - **Property 5：Bollinger Bands 上中下軌順序**
    - 對任意長度 ≥ 20 的 closes 陣列，所有非 null 值必須滿足 `upper ≥ middle ≥ lower`
    - **Validates: Requirements 2.4**

  - [ ]* 4.8 寫 property test：資料不足時指標回傳 null 而非拋出錯誤
    - **Property 7：資料不足時指標回傳 null**
    - 對任意長度小於指標最小週期的輸入，`calculateMACD`、`calculateKD`、`calculateBollingerBands` 應回傳全為 null 的陣列，不得拋出例外
    - **Validates: Requirements 2.7**

- [x] 5. 擴充 ChartCandle 型別與 KLinePanel Props
  - [x] 5.1 修改 `src/types/kline.ts`：在 `ChartCandle` 介面新增 MACD、KD、Bollinger Bands 欄位
    - 新增 `dif?: number | null`、`signal?: number | null`、`hist?: number | null`
    - 新增 `k?: number | null`、`d?: number | null`
    - 新增 `bbUpper?: number | null`、`bbMiddle?: number | null`、`bbLower?: number | null`
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 5.2 修改 `src/components/KLinePanel.tsx`：新增 `target?: number` 與 `stopLoss?: number` props，並在 `injectSMA` 後新增 `injectIndicators` 函式注入 MACD/KD/Bollinger Bands
    - `injectIndicators(candles: ChartCandle[]): ChartCandle[]` 呼叫 `calculateMACD`、`calculateKD`、`calculateBollingerBands` 並將結果注入每根 K 線
    - 將 `target` 與 `stopLoss` 傳遞給 `CandlestickChart`
    - _Requirements: 2.6, 2.9_

- [x] 6. 升級 CandlestickChart 新增三個子圖與水平線
  - [x] 6.1 修改 `src/components/CandlestickChart.tsx` Props：新增 `target?: number`、`stopLoss?: number`，調整主圖高度為 68%，成交量子圖 12%，新增 MACD 子圖 10%，新增 KD 子圖 10%
    - 主圖新增 Bollinger Bands：`bbUpper`（藍色半透明線）、`bbMiddle`（灰色線）、`bbLower`（藍色半透明線），上下軌之間填充半透明區域（使用 recharts `Area` 或兩條 `Line` + `ReferenceArea`）
    - 主圖新增 Target 水平線（綠色虛線，`strokeDasharray="4 2"`）與 StopLoss 水平線（紅色虛線），使用 recharts `ReferenceLine`，附帶價格標籤
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 6.2 在 `CandlestickChart` 新增 MACD 子圖
    - DIF 線（`#00f0ff` 青色）、SIGNAL 線（`#f97316` 橘色）、HIST 柱狀圖（正值 `rgba(239,68,68,0.7)` 紅色、負值 `rgba(34,197,94,0.7)` 綠色）
    - Y 軸自動適應 DIF/SIGNAL/HIST 的值域範圍
    - _Requirements: 2.1_

  - [x] 6.3 在 `CandlestickChart` 新增 KD 子圖
    - K 線（`#eab308` 黃色）、D 線（`#f97316` 橘色）
    - Y 軸固定範圍 [0, 100]
    - _Requirements: 2.2_

  - [x] 6.4 更新 `CandlestickChart` 圖例區域，新增所有指標的顏色說明
    - 現有：SMA5/10/20/60
    - 新增：MACD DIF / SIGNAL、KD K / D、BB Upper / Lower
    - _Requirements: 2.8_

- [~] 7. Checkpoint B2 — 確認 K 線圖指標正常顯示
  - 確保所有測試通過，確認四個子圖（主圖/成交量/MACD/KD）正常渲染，詢問使用者是否有問題。

---

### Phase B3：指揮中心升級

- [x] 8. 新增 Watch_API Edge Route
  - [x] 8.1 新增 `src/app/api/skynet/watch/route.ts`
    - `export const runtime = 'edge'`
    - POST handler：解析 `{ ticker, triggerPrice?, source? }`
    - 驗證 `ticker` 格式 `/^\d{4,6}$/`，不符回傳 HTTP 400 `{ error: "invalid_ticker" }`
    - 驗證 `triggerPrice >= 0`（選填，預設 0），負數回傳 HTTP 400 `{ error: "invalid_trigger_price" }`
    - 轉發至 n8n：`{ command: "/watch {ticker} {triggerPrice}", chatId: 6375207034, Source: "Dashboard" }`
    - 超時 10 秒 → HTTP 504 `{ error: "watch_timeout" }`
    - n8n 非 200 → HTTP 502 `{ error: "upstream_error" }`
    - _Requirements: 3.3, 3.6, 3.7_

  - [ ]* 8.2 寫 property test：Watch_API ticker 格式驗證
    - **Property 8：Watch_API ticker 格式驗證**
    - 對任意不符合 4-6 位數字格式的字串（空字串、含字母、超過 6 位、少於 4 位），Watch_API 應回傳 HTTP 400
    - **Validates: Requirements 3.6**

- [x] 9. 升級狙擊清單頁面：新增狙擊表單與撤退功能
  - [x] 9.1 修改 `src/app/review/page.tsx` 狙擊清單 Tab：新增「新增狙擊」表單
    - 股票代號輸入欄（4-6 位數字驗證）與觸發價輸入欄（選填，正數浮點數）
    - 提交時呼叫 `POST /api/skynet/watch`，成功後顯示成功訊息並在 3 秒內自動刷新狙擊清單
    - 失敗時顯示錯誤訊息（含失敗原因）
    - _Requirements: 3.2, 3.4, 3.5_

  - [x] 9.2 在狙擊清單表格新增「撤退」按鈕
    - 點擊後呼叫對應 API 更新狀態為「已撤退」並刷新清單
    - 確認「距觸發百分比」計算公式正確：`((triggerPrice - currentPrice) / currentPrice) * 100`，距觸發 1% 以內以警示色標示
    - _Requirements: 3.8, 3.9_

  - [ ]* 9.3 寫 property test：狙擊距觸發百分比計算正確性
    - **Property 9：距觸發百分比計算正確性**
    - 對任意正數 `triggerPrice` 與 `currentPrice`，計算結果必須等於 `((triggerPrice - currentPrice) / currentPrice) * 100`，精確到小數點後一位
    - **Validates: Requirements 3.9**

- [x] 10. 升級指揮中心快速指令直接執行
  - [x] 10.1 修改 `src/app/terminal/page.tsx` 快速指令按鈕：將 `cmd` 類型的按鈕改為直接呼叫 API 並顯示結果，不再只是填入輸入框
    - 點擊快速指令按鈕時，直接觸發 `handleSubmit` 邏輯（帶入對應指令）
    - 結果顯示在 Terminal 訊息串流中
    - _Requirements: 3.1_

- [~] 11. Checkpoint B3 — 確認指揮中心功能正常
  - 確保所有測試通過，確認 Watch_API 驗證邏輯、狙擊表單提交、快速指令直接執行均正常，詢問使用者是否有問題。

---

### Phase B4：自動刷新 + 瀏覽器通知

- [x] 12. 新增 useAutoRefresh Hook
  - [x] 12.1 新增 `src/hooks/useAutoRefresh.ts`
    - 介面：`UseAutoRefreshOptions { intervalMs, onRefresh, enabled? }` → `UseAutoRefreshReturn { countdown, refresh, isRefreshing }`
    - 使用 `useRef` 儲存 interval ID，避免 closure 問題
    - 監聽 `document.visibilitychange`：`hidden` 時 `clearInterval`，`visible` 時立即呼叫 `onRefresh` 並重啟計時器
    - `countdown` 使用獨立的 1 秒 interval 每秒更新
    - 手動 `refresh()` 重置計時器並立即執行
    - 元件 unmount 時清除所有 interval
    - Page Visibility API 不支援時降級為持續計時
    - _Requirements: 4.1, 4.2, 4.7, 4.8, 4.9_

  - [ ]* 12.2 寫 property test：Page Visibility 暫停/恢復行為
    - **Property 12：Page Visibility 暫停/恢復行為**
    - 對任意 visibility 狀態變化序列，hook 在 `hidden` 狀態時不得觸發刷新，在 `visible` 狀態時必須立即觸發一次刷新
    - **Validates: Requirements 4.7**

- [x] 13. 新增 useNotification Hook
  - [x] 13.1 新增 `src/hooks/useNotification.ts`
    - 介面：`UseNotificationReturn { permission, requestPermission, notifySniper, notifyNewReports }`
    - 初始化時檢查 `'Notification' in window`，不支援則設 `permission: 'unsupported'`
    - `requestPermission()` 靜默處理拒絕（不拋出錯誤）
    - 通知前檢查 `permission === 'granted'`，否則靜默跳過
    - `notifySniper(ticker, name, triggerPrice)`：通知標題「🎯 狙擊突破」，內容含代號、名稱、觸發價
    - `notifyNewReports(count)`：通知標題「📊 晨間戰報更新」，內容含新增數量
    - _Requirements: 4.3, 4.4, 4.5, 4.6_

  - [ ]* 13.2 寫 property test：狙擊狀態變化觸發通知
    - **Property 10：狙擊狀態變化觸發通知**
    - 對任意前後兩次狙擊清單，若任一標的狀態從「待觸發」變更為「已觸發」，通知函式必須被呼叫，且通知標題為「🎯 狙擊突破」
    - **Validates: Requirements 4.4**

  - [ ]* 13.3 寫 property test：新增戰報觸發通知
    - **Property 11：新增戰報觸發通知**
    - 對任意 `(oldCount, newCount)` 組合，若 `newCount > oldCount`，通知函式必須被呼叫，且通知標題為「📊 晨間戰報更新」
    - **Validates: Requirements 4.5**

- [x] 14. 整合 useAutoRefresh 與 useNotification 至 review/page.tsx
  - [x] 14.1 在 `src/app/review/page.tsx` 整合 `useAutoRefresh`：今日戰報 Tab 使用 5 分鐘間隔，狙擊清單 Tab 使用 2 分鐘間隔
    - 頂部狀態列新增「下次刷新倒數秒數」顯示（每秒更新）
    - 手動刷新按鈕觸發 `refresh()` 重置計時器
    - _Requirements: 4.1, 4.2, 4.8, 4.9_

  - [x] 14.2 在 `src/app/review/page.tsx` 整合 `useNotification`：首次載入時呼叫 `requestPermission()`，狙擊清單刷新後呼叫 `checkSniperTriggers` 比對狀態變化，戰報刷新後比對數量變化
    - 頂部狀態列在 `permission === 'granted'` 時顯示「🔔 通知已啟用」標籤
    - _Requirements: 4.3, 4.4, 4.5, 4.10_

- [~] 15. Final Checkpoint — 確認所有功能正常運作
  - 確保所有測試通過，確認四個 Phase 功能完整，詢問使用者是否有問題。

---

## Notes

- 標記 `*` 的子任務為選填，可跳過以加速 MVP 交付
- 所有 API routes 必須保持 `export const runtime = 'edge'`（Cloudflare Pages 限制）
- Property tests 使用 **fast-check** 函式庫，每個 property 最少執行 100 次迭代
- Unit tests 使用 **Vitest**（與 Next.js 15 相容）
- `src/hooks/` 目錄需新建（目前不存在）
- Phase B2 的 `injectIndicators` 在 `KLinePanel` 中呼叫，確保指標計算在前端完成，不依賴 API
- Phase B4 的 `useAutoRefresh` 需處理 SSR 環境（`typeof window !== 'undefined'` 檢查）

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "4.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "4.2", "5.1"] },
    { "id": 2, "tasks": ["2.1", "4.3", "4.4"] },
    { "id": 3, "tasks": ["4.5", "4.6", "5.2"] },
    { "id": 4, "tasks": ["4.7", "4.8", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "8.1"] },
    { "id": 6, "tasks": ["6.4", "8.2", "9.1", "12.1"] },
    { "id": 7, "tasks": ["9.2", "10.1", "12.2", "13.1"] },
    { "id": 8, "tasks": ["9.3", "13.2", "13.3", "14.1"] },
    { "id": 9, "tasks": ["14.2"] }
  ]
}
```
