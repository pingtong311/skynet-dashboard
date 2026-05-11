# Design Document: Dashboard Web Upgrade

## Overview

天網 Dashboard 升級計畫（dashboard-web-upgrade）分四個 Phase 強化網頁戰情中心，使其能完整接替 Telegram 的輸入與通知功能。

- **Phase B1**：Analyze_API 同步等待 n8n Omni 完整分析結果，前端 AnalysisCard 直接渲染完整戰報
- **Phase B2**：前端計算 MACD / KD / Bollinger Bands，CandlestickChart 新增三個子圖與水平線標記
- **Phase B3**：新增 Watch_API Edge route，Terminal 快速指令直接執行，狙擊清單支援網頁新增/撤退
- **Phase B4**：useAutoRefresh hook + Page Visibility API + 瀏覽器 Notification API 整合

技術限制：Next.js 15.5.2 / React 19 / Cloudflare Pages（Edge runtime）、recharts、framer-motion，所有 API routes 必須保持 `export const runtime = 'edge'`。

---

## Architecture

### 整體資料流

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages (Edge)                       │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ review/page  │    │terminal/page │    │  API Routes      │   │
│  │  (戰情室)    │    │  (指揮中心)  │    │  (Edge runtime)  │   │
│  └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘   │
│         │                   │                     │             │
│  ┌──────▼───────────────────▼─────────────────────▼──────────┐  │
│  │              前端狀態管理 (React 19 hooks)                  │  │
│  │  useAutoRefresh │ useNotification │ useKLineIndicators     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  n8n Oracle Cloud   │
                    │  天網-03 (Omni)     │
                    │  responseMode:      │
                    │  lastNode           │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Telegram (雙軌)    │
                    └────────────────────┘
```

### Phase B1：Analyze_API 同步架構

```
前端 handleAnalyze()
  │
  ▼
POST /api/skynet/analyze  (timeout: 60000ms)
  │
  ▼
fetch n8n /webhook/skynet-terminal-sync-v1
  │  (n8n responseMode: lastNode — 等待 Omni 完整執行)
  │
  ├─ 成功 (< 60s) → 解析 JSON → 回傳完整戰報
  ├─ 超時 (>= 60s) → HTTP 504 { error: "analysis_timeout" }
  └─ n8n 非 200   → HTTP 502 { error: "upstream_error" }
```

### Phase B2：前端指標計算架構

```
KLinePanel (fetchDaily / fetchIntraday)
  │
  ▼
injectIndicators(candles)
  ├─ injectSMA(candles)          → sma5/10/20/60
  ├─ calculateMACD(closes)       → dif, signal, hist
  ├─ calculateKD(highs,lows,closes) → k, d
  └─ calculateBollingerBands(closes) → bbUpper, bbMiddle, bbLower
  │
  ▼
CandlestickChart
  ├─ 主圖 (68%)：K線 + SMA + Bollinger Bands + 水平線
  ├─ 成交量子圖 (12%)
  ├─ MACD 子圖 (10%)
  └─ KD 子圖 (10%)
```

### Phase B3：Watch_API 架構

```
前端 handleAddWatch()
  │
  ▼
POST /api/skynet/watch
  │  驗證 ticker (4-6位數字)
  │  驗證 triggerPrice (正數浮點數或 0)
  ▼
POST n8n /webhook/skynet-terminal-sync-v1
  body: { command: "/watch {ticker} {triggerPrice}", source: "Dashboard" }
  │
  ├─ 成功 → 回傳 { success: true }
  └─ 失敗 → 回傳對應錯誤碼
```

### Phase B4：自動刷新架構

```
useAutoRefresh(fetchFn, intervalMs)
  │
  ├─ setInterval → 定時呼叫 fetchFn
  ├─ Page Visibility API → hidden 時暫停，visible 時立即刷新並重啟
  ├─ 手動刷新 → 重置計時器並立即執行
  └─ countdown state → 每秒更新倒數顯示

useNotification()
  ├─ requestPermission() → 首次載入時請求授權
  ├─ checkSniperTriggers(prev, next) → 比對狀態變化
  └─ checkNewReports(prevCount, nextCount) → 比對戰報數量
```

---

## Components and Interfaces

### Phase B1：修改 Analyze_API

**檔案**：`src/app/api/skynet/analyze/route.ts`

```typescript
export const runtime = 'edge';

// 修改點：
// 1. TIMEOUT_MS: 8000 → 60000
// 2. 移除 AbortError 時回傳 processing 的邏輯
// 3. AbortError → HTTP 504 { error: "analysis_timeout", message: "..." }
// 4. n8n 非 200 → HTTP 502 { error: "upstream_error" }
// 5. 空回應 → HTTP 502（不再回傳 processing 狀態）

interface AnalyzeResponse {
  ticker: string;
  name?: string;
  price?: string;
  action?: 'BUY' | 'SELL' | 'WAIT';
  confidence?: number;
  target?: string;
  stopLoss?: string;
  strategyType?: string;
  momentum?: string;
  verdictTitle?: string;
  todayView?: string;
  reason?: string;
}
```

### Phase B1：修改 AnalysisCard

**檔案**：`src/app/review/page.tsx`（AnalysisCard 子元件）

移除 `status === 'processing'` 的中間狀態渲染分支，改為直接渲染完整戰報或錯誤訊息。

### Phase B2：新增指標計算函式

**檔案**：`src/lib/indicators.ts`（新增）

```typescript
// EMA 計算（MACD 基礎）
export function calculateEMA(data: number[], period: number): (number | null)[]

// MACD 計算
export interface MACDResult {
  dif: (number | null)[];    // EMA12 - EMA26
  signal: (number | null)[]; // DIF 的 9 日 EMA
  hist: (number | null)[];   // DIF - SIGNAL
}
export function calculateMACD(
  closes: number[],
  fastPeriod?: number,   // 預設 12
  slowPeriod?: number,   // 預設 26
  signalPeriod?: number  // 預設 9
): MACDResult

// KD 計算（隨機指標）
export interface KDResult {
  k: (number | null)[];
  d: (number | null)[];
}
export function calculateKD(
  highs: number[],
  lows: number[],
  closes: number[],
  period?: number,  // RSV 週期，預設 9
  kSmooth?: number, // K 平滑係數，預設 3
  dSmooth?: number  // D 平滑係數，預設 3
): KDResult

// Bollinger Bands 計算
export interface BollingerResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}
export function calculateBollingerBands(
  closes: number[],
  period?: number,    // 預設 20
  multiplier?: number // 標準差倍數，預設 2
): BollingerResult
```

### Phase B2：修改 ChartCandle 型別

**檔案**：`src/types/kline.ts`

```typescript
export interface ChartCandle {
  // ... 現有欄位 ...

  // MACD（由 KLinePanel 計算後注入）
  dif?: number | null;
  signal?: number | null;
  hist?: number | null;

  // KD（由 KLinePanel 計算後注入）
  k?: number | null;
  d?: number | null;

  // Bollinger Bands（由 KLinePanel 計算後注入）
  bbUpper?: number | null;
  bbMiddle?: number | null;
  bbLower?: number | null;
}
```

### Phase B2：修改 KLinePanel Props

**檔案**：`src/components/KLinePanel.tsx`

```typescript
interface KLinePanelProps {
  ticker: string;
  onClose: () => void;
  target?: number;    // 新增：目標價（來自 AnalysisCard）
  stopLoss?: number;  // 新增：防守價（來自 AnalysisCard）
}
```

### Phase B2：修改 CandlestickChart Props

**檔案**：`src/components/CandlestickChart.tsx`

```typescript
interface CandlestickChartProps {
  candles: ChartCandle[];
  timeframe: 'daily' | 'intraday';
  target?: number;    // 新增：目標價水平線
  stopLoss?: number;  // 新增：防守價水平線
}
```

子圖佈局（高度比例）：
- 主圖（K線 + SMA + Bollinger Bands + 水平線）：**68%**
- 成交量子圖：**12%**
- MACD 子圖：**10%**
- KD 子圖：**10%**

水平線繪製方式：使用 recharts `ReferenceLine` 元件，`stroke` 設定顏色，`strokeDasharray="4 2"` 設定虛線，`label` 顯示價格。

### Phase B3：新增 Watch_API

**檔案**：`src/app/api/skynet/watch/route.ts`（新增）

```typescript
export const runtime = 'edge';

// POST /api/skynet/watch
// Body: { ticker: string, triggerPrice?: number, source?: string }
// 驗證 ticker: /^\d{4,6}$/
// 驗證 triggerPrice: >= 0 的數字（選填，預設 0）
// 轉發至 n8n: { command: "/watch {ticker} {triggerPrice}", source: "Dashboard" }

interface WatchRequest {
  ticker: string;
  triggerPrice?: number;
  source?: string;
}

interface WatchResponse {
  success: boolean;
  ticker?: string;
  message?: string;
}
```

### Phase B4：useAutoRefresh Hook

**檔案**：`src/hooks/useAutoRefresh.ts`（新增）

```typescript
interface UseAutoRefreshOptions {
  intervalMs: number;       // 刷新間隔（毫秒）
  onRefresh: () => Promise<void> | void;
  enabled?: boolean;        // 是否啟用（預設 true）
}

interface UseAutoRefreshReturn {
  countdown: number;        // 距下次刷新的秒數
  refresh: () => void;      // 手動觸發刷新並重置計時器
  isRefreshing: boolean;    // 是否正在刷新中
}

export function useAutoRefresh(options: UseAutoRefreshOptions): UseAutoRefreshReturn
```

實作要點：
- 使用 `useRef` 儲存 interval ID，避免 closure 問題
- 監聽 `document.visibilitychange` 事件，hidden 時 `clearInterval`，visible 時立即刷新並重啟
- countdown 使用獨立的 1 秒 interval 更新
- 元件 unmount 時清除所有 interval

### Phase B4：useNotification Hook

**檔案**：`src/hooks/useNotification.ts`（新增）

```typescript
interface UseNotificationReturn {
  permission: NotificationPermission | 'unsupported';
  requestPermission: () => Promise<void>;
  notifySniper: (ticker: string, name: string, triggerPrice: string) => void;
  notifyNewReports: (count: number) => void;
}

export function useNotification(): UseNotificationReturn
```

實作要點：
- 初始化時檢查 `'Notification' in window`，不支援則設 `permission: 'unsupported'`
- `requestPermission` 靜默處理拒絕（不拋出錯誤）
- 通知前檢查 `permission === 'granted'`，否則靜默跳過

---

## Data Models

### BattleReport（完整戰報，Phase B1）

```typescript
interface BattleReport {
  ticker: string;
  name: string;
  price: string;
  action: 'BUY' | 'SELL' | 'WAIT';
  confidence: number;
  target: string;
  stopLoss: string;
  strategyType: string;
  momentum: string;
  verdictTitle: string;
  todayView: string;
  reason: string;        // 4 位專家分析文字
  date: string;
  signalTime?: string;
  maAlignment?: string;
  bbUpper?: string;
  bbLower?: string;
  ma60?: string;
  targetBasis?: string;
  stopBasis?: string;
}
```

### MACD 計算演算法（Phase B2）

```
EMA(t) = close(t) × k + EMA(t-1) × (1 - k)
  其中 k = 2 / (period + 1)

DIF = EMA(12) - EMA(26)
SIGNAL = EMA(DIF, 9)
HIST = DIF - SIGNAL
```

初始 EMA 值使用前 period 個收盤價的 SMA 作為種子值（warm-up）。

### KD 計算演算法（Phase B2）

```
RSV(t) = (close(t) - lowest_low(9)) / (highest_high(9) - lowest_low(9)) × 100

K(t) = K(t-1) × (2/3) + RSV(t) × (1/3)
D(t) = D(t-1) × (2/3) + K(t) × (1/3)

初始值：K(0) = D(0) = 50
```

### Bollinger Bands 計算演算法（Phase B2）

```
Middle(t) = SMA(close, 20)
StdDev(t) = √( Σ(close(i) - Middle(t))² / 20 )
Upper(t) = Middle(t) + 2 × StdDev(t)
Lower(t) = Middle(t) - 2 × StdDev(t)
```

### WatchRequest / WatchResponse（Phase B3）

```typescript
// POST /api/skynet/watch 請求體
interface WatchRequest {
  ticker: string;       // 4-6 位數字
  triggerPrice?: number; // 選填，>= 0，預設 0
  source?: string;      // 預設 'Dashboard'
}

// n8n 轉發格式
interface N8nWatchPayload {
  command: string;      // "/watch {ticker} {triggerPrice}"
  chatId: number;       // 6375207034
  Source: string;       // 'Dashboard'
}
```

### AutoRefresh 狀態（Phase B4）

```typescript
interface AutoRefreshState {
  countdown: number;    // 0 ~ intervalMs/1000
  isRefreshing: boolean;
  lastRefreshTime: number; // Date.now()
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

本功能涉及純函式計算（指標演算法、驗證邏輯、通知觸發邏輯），適合使用 property-based testing。使用 **fast-check**（TypeScript PBT 函式庫）進行測試，每個 property 最少執行 100 次迭代。

### Property 1：Analyze_API 不回傳 processing 狀態

*For any* 有效的 ticker 字串（4-6 位數字），當 n8n 回傳完整 JSON 回應時，Analyze_API 的回應物件不得包含 `status: 'processing'` 欄位。

**Validates: Requirements 1.1**

### Property 2：完整戰報包含所有必要欄位

*For any* n8n 回傳的完整分析 JSON，Analyze_API 的輸出必須包含以下所有欄位：`ticker`、`name`、`price`、`action`、`confidence`、`target`、`stopLoss`、
本功能涉及純函式計算（指標演算法、驗證邏輯、通知觸發邏輯），適合使用 property-based testing。使用 **fast-check**（TypeScript PBT 函式庫）進行測試，每個 property 最少執行 100 次迭代。

### Property 1：Analyz回傳 HTTP 502 並附帶 `{
### Property 1：Analyze_API 不回傳 processing 狀態

*For any* 有效的 ticker 字串（4-6 位數字），當 n8n 回傳完整 JSON 回應時，Analyze_API 的回應物?D` 回傳的 `dif`、`signal`、`hist` 陣列長度必須與輸入陣列長度相同。

**Validates: Requirements 2.1, 
**Validates: Require：KD 值域限制

*For any* 有效的 OHLCV 資料陣列（high ≥ low，close 在 [low, high] 範圍內），`calculateKD` 回傳的所有非 null K 值與 D 值必須在 [0, 100] 範圍內。

**Validates: Requirements 2.2, 2.7**本功能涉及純函式計算（指標演算法、?≥ 下軌

*For any* 長度 ≥ 20 的收盤價陣列，`calculateBollingerBands` 回傳的所有非 null 值必須滿足 `u
### Property 1：Analyz???

**Validates: Requirements 2.4**

### Property 7：資料不足時指標回傳 null 而非拋出錯誤

*For any* 長度小於指標所需最小週期的輸入陣列，所有指標計算函式（`calculateMACD`、`calculateKD`、`calculateBollingerBands`）應回傳全為 null 的陣列，不得拋出例外。

**Valida
es: Requirements 2.7**

### Property 8：Watch_API ticker 格式驗證

*For any* 不符合 4-6 位數字格式的字串（包含空字串、含字母、超過 6 位、少於 4 位），Watch_API 應回傳 HTTP 400 並附帶 `{ error: "invalid_ticker" }`。

**Validates: Requirem
**Val.6**

### Property 9：狙擊距觸發百分比計算正確性

*For any* 正數的 `triggerPrice` 與 `currentPrice`，距觸發百分比計算結果必須等於 `((triggerPrice - currentPrice) / currentPrice) * 100`，精確到小數點後一位。

**Validates: Requirements 3.9**

### Property 10：狙擊狀態變化觸發通知

*For any* 前後兩次狙擊清單，若其中任一標的的狀態從「待觸發」變更為「已觸發」，通知函式必須被呼叫，且通知標題為「🎯 狙擊突破」?**Valida
es: Requirements 2.7**

### Property 8：Watch_API ticker 格式驗證

*For any* # Property 11：新增戰報觸發通知

*For any* 前後兩次戰報數量 `(oldCount, newCount)`，若 `newCount > oldCount`，通知函式必須被呼叫，且通知標題為「📊 晨間戰報
**Validates: Requirem
**Val.6**

### Property 9：狙擊距?nts 4.5**

### Property 12：Page Visibility 暫停/恢復行為

*For any* visibility 狀態變化序列，useAutoRefresh hook 在 `hidden` 狀態時不得觸發刷新，在 `visible` 狀態時必須立即觸發一
**Validates: Requirements 3.9**

### Property 10：狙擊狀態變化觸發or Handling

### Phase B1：Analyze_API 錯誤處理

| 情境 | HTTP 狀態碼 | 回應體 |
|------|------------|--------|
| ticker 格式不符 | 400 | `{ "error": "invalid_ticker" }` |
| n8n 非 200 回應 | 502 | `{ "error": "upstream_error" }` |
| 60 秒超時 | 504 | `{ "error": "analysis_timeout", "message": "分析逾時，請稍後再試" }` |
| 其他未知錯誤 | 500 | `{ "error": "internal_error" }` |

前端 AnalysisCard 對應處理：
- `error` 欄位存在 → 顯示錯誤訊息（AlertTriangle 圖示）
- HTTP 504 → 顯示「分析逾時，請稍後再試」並提示可手動重試
- HTTP 502 → 顯示「n8n 服務暫時無法連線」

### Phase B2：指標計算錯誤處理

- 輸入資料不足（少於最小週期）→ 對應位置回傳 `null`，不拋出例外**Validates: Requirements 3Infinity` → 該位置回傳 `null`，繼續計算後續值
- `highest_high === lowest_low`（KD 計算）→ RSV 設為 50，避免除以零

### Phase B3：Watch_API 錯誤處理

| 情境 | HTTP 狀態碼 | 回應體 |
|------|------------|--------|
| ticker 格式不符 | 400 | `{ "error": "invalid_ticker" }` |
| triggerPrice 為負數 | 400 | `{ "error": "invalid_trigger_price" }` |
| n8n 非 200 回應 | 502 | `{ "error": "upstream_error" }` |
| 超時（10 秒） | 504 | `{ "error": "watch_timeout" }` |

### Phase B4：通知與刷新錯誤處理

- 瀏覽器不支援 Notification API → `permission: 'unsupported'`，靜默跳過所有通知呼叫
- 使用者拒絕通知授權 → `permission: 'denied'`，靜默跳過，不再重複請求
- 刷新 API 呼叫失敗 → 記錄 console.error，不中斷計時器，下次仍正常刷新
- Page Visibility API 不支援 → 降級為持續? `highest_high === lowest_low`（ing Strategy

### 單元測試（Unit Tests）

使用 **Vitest** 作為測試框架（與 Next.js 15 相容）。

**指標計算函式**（`src
### Phascators.ts`）：
- `calculateEMA`：驗證初始 SMA 種子值、遞推公
| 情境 | HTTP 狀態碼 | 回應???|------|------------|--------|
| ticke? ticker 格式不符 | 400 |??| triggerPrice 為負數 | 400 | `{ "error": "invalid_trigger_ol| n8n 非 200 回應 | 502 | `{ "error": "upstream_error" }` |
| 超時?| 超時（10 秒） | 504 | `{ "error": "watch_timeout" }` |
-
### Phase B4：通知與刷新錯誤處理

- 瀏覽器不漯*
- 瀏覽器不支援 Notification API ↼?? 使用者拒絕通知授權 → `permission: 'denied'`，靜默跳過，不再重複請求
- 刷新??- 刷新 API 呼叫失敗 → 記錄 console.error，不中斷計時器，下次仍正常刻?- Page Visibility API 不支援 → 降級為持續? `highest_high === lowest_low`（ing Straer
### 單元測試（Unit Tests）

使用 **Vitest** 作為測試框架（與 Next.js 15 相容?ze
使用 **Vitest** 作為測試?
f
**指標計算函式**（`src
### Phascators.ts`）：
- `calculync### Phascators.ts`）：
- `ve- `calculateEMA`：驗?s| 情境 | HTTP 狀態碼 | 回應???|------|----------em| ticke? ticker 格式不符 | 400 |??| triggerPrice 為負數 | , | 超時?| 超時（10 秒） | 504 | `{ "error": "watch_timeout" }` |
-
### Phase B4：通知與刷新錯誤處理

- 瀏覽器不漯*
- 瀏覽器不支援 Notifi> -
### Phase B4：通知與刷新錯誤處理

- 瀏覽器不漯*
- 瀏? ==
- 瀏覽器不漯*
- 瀏覽器不支援 al.- 瀏覽器不支.l- 刷新??- 刷新 API 呼叫失敗 → 記錄 console.error，不中斷計時器，下次仍正常刻?- Page Visibility API 不支援``### 單元測試（Unit Tests）

使用 **Vitest** 作為測試框架（與 Next.js 15 相容?ze
使用 **Vitest** 作為測試?
f
**指標計算函式**（`src
### Phascators.ts`）：
- `calcul =
使用 **Vitest** 作為測試s);使用 **Vitest** 作為測試?
f
**指標計算函式**（`src
& f
**指標計算函式**（`sr.d.f### Phascators.ts`）：
- `(v- `calculync### Phascat;
- `ve- `calculateEMA`：驗?s| 情op-
### Phase B4：通知與刷新錯誤處理

- 瀏覽器不漯*
- 瀏覽器不支援 Notifi> -
### Phase B4：通知與刷新錯誤處理

- 瀏覽器不漯*
- 瀏? ==
- 瀏覽器不漯*
- 瀏覽器不? { minLength: 20, maxLengt
- 瀏覽器不漯*
- ? {
    const result = calculateBollinge### Phase ses);
    return result.upper.every((u, i) =>
      u === null || (u >= result.middle[i]! && result.middle[i]! >= 
使用 **Vitest** 作為測試框?Runs: 100 });
```

**Property 8**（Requirements 3.6）：
```typescript
// Feature: dashboard-web-upgrade, Property 8: Watch_API ticker 格式驗證
fc.assert(fc.asyncProperty(
  fc.string().filter(s => !/^\d{4,6}$/.test(s)),
  async (invalidTicker) => {
    const res = await watchApiHandler({ ticker: invalidTicker });
    return res.status === 400;
  }
), { numRuns: 100 });
```

### 整合測試（Integration Tests）

- n8n 天網-03 responseMode 設定驗證（手動確認）
- Telegram 雙軌並行驗證（手動確認）
- Cloudflare Pages Edge runtime 部署驗證

### 煙霧測試（Smoke Tests）

- 驗證所有 API routes 包含 `export const runtime = 'edge'`
- 驗證 Cloudflare Pages 部署後 API 端點可正常回應
