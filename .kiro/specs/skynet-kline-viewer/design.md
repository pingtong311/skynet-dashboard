# 技術設計文件：天網 K 線圖查看器（skynet-kline-viewer）

## 概覽（Overview）

本功能在天網戰情中心（`/review` 頁面）內嵌一個 K 線圖查看面板（`KLinePanel`），讓使用者無需離開頁面即可查看台股 K 線圖、均線（SMA5/10/20/60）、成交量柱狀圖及現價報價。

### 核心設計決策

| 決策 | 選擇 | 理由 |
|------|------|------|
| 圖表庫 | recharts `ComposedChart` | 已安裝，用 `Bar` + `Line` 組合模擬 K 線 |
| 狀態管理 | React `useState` / `useCallback` / `useRef` | 無需引入額外狀態庫，符合限制 |
| API 代理 | Next.js Route Handler | 保護 `FUGLE_API_KEY` 不暴露前端 |
| SMA 計算 | 前端純函式計算 | Fugle 免費方案不提供技術指標 API |
| 快取策略 | 前端記憶體快取（`useRef` Map） | Daily K 快取 5 分鐘，降低 API 呼叫次數 |
| 面板展示 | 頁面內嵌 slide-down 面板 | 不跳頁，保持 Tab 狀態與捲動位置 |

### 使用者流程

```
使用者點擊「查看 K 線」按鈕（戰報卡片 / 狙擊清單）
  → KLinePanel 展開（slide-down 動畫）
  → 同時發出 3 個請求：daily candles + quote
  → 顯示 QuoteBar（現價資訊）
  → 顯示 CandlestickChart（日 K + SMA + Volume）
  → 使用者可切換「日K / 分K」
  → 點擊關閉按鈕 → 面板收起
```

---

## 架構（Architecture）

### 元件層次結構

```
review/page.tsx
├── KLinePanel (src/components/KLinePanel.tsx)
│   ├── QuoteBar          ← 現價資訊列
│   ├── TimeframeToggle   ← 日K / 分K 切換按鈕
│   └── CandlestickChart (src/components/CandlestickChart.tsx)
│       ├── recharts ComposedChart
│       │   ├── Bar (蠟燭實體，上漲/下跌/平盤)
│       │   ├── Bar (蠟燭影線，用 ErrorBar 模擬)
│       │   ├── Line (SMA5 黃色)
│       │   ├── Line (SMA10 橘色)
│       │   ├── Line (SMA20 紫色)
│       │   └── Line (SMA60 藍色)
│       └── recharts ComposedChart (Volume 子圖)
│           └── Bar (成交量，上漲紅/下跌綠)
└── /api/skynet/kline/route.ts  ← Fugle API 代理
```

### 資料流

```
前端 KLinePanel
  │
  ├─ fetch('/api/skynet/kline?ticker=2330&type=daily')
  │     │
  │     └─ route.ts → Fugle API (historical/candles)
  │                 → 標準化 → { candles: [...] }
  │
  ├─ fetch('/api/skynet/kline?ticker=2330&type=quote')
  │     │
  │     └─ route.ts → Fugle API (intraday/quote)
  │                 → 標準化 → { price, change, changePercent, name }
  │
  └─ fetch('/api/skynet/kline?ticker=2330&type=intraday')  ← 僅切換分K時
        │
        └─ route.ts → Fugle API (intraday/candles)
                    → 標準化 → { candles: [...] }
```

### Mermaid 架構圖

```mermaid
graph TD
    A[review/page.tsx] -->|klineTicker state| B[KLinePanel]
    B --> C[QuoteBar]
    B --> D[TimeframeToggle]
    B --> E[CandlestickChart]
    B -->|HTTP GET| F[/api/skynet/kline]
    F -->|X-API-KEY header| G[Fugle MarketData API]
    G -->|historical/candles| F
    G -->|intraday/candles| F
    G -->|intraday/quote| F
    F -->|標準化 JSON| B
    E -->|ComposedChart| H[recharts]
    B -->|SMA 計算| I[calculateSMA 純函式]
```

---

## 元件與介面（Components and Interfaces）

### 1. `/api/skynet/kline/route.ts`

**職責**：代理 Fugle MarketData API，保護 API Key，標準化回應格式。

```typescript
// 請求參數
interface KlineQueryParams {
  ticker: string;   // 4-6 位數字台股代號
  type: 'daily' | 'intraday' | 'quote';
}

// 回應格式 - Daily / Intraday
interface CandlesResponse {
  candles: Candle[];
}

interface Candle {
  date?: string;    // Daily K: 'YYYY-MM-DD'
  time?: string;    // Intraday K: 'HH:MM'
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 回應格式 - Quote
interface QuoteResponse {
  price: number;
  change: number;
  changePercent: number;
  name: string;
}

// 錯誤回應
interface ErrorResponse {
  error: 'invalid_ticker' | 'invalid_type' | 'upstream_error' 
       | 'rate_limit_exceeded' | 'upstream_timeout' | 'api_key_not_configured';
}
```

**路由邏輯**：

```
GET /api/skynet/kline?ticker={ticker}&type={type}

驗證流程：
1. 檢查 FUGLE_API_KEY 環境變數 → 若空，回傳 503
2. 驗證 ticker 格式（/^\d{4,6}$/）→ 若不符，回傳 400
3. 驗證 type 值 → 若不符，回傳 400
4. 依 type 選擇 Fugle 端點，設定 10 秒 AbortController timeout
5. 呼叫 Fugle API，加入 X-API-KEY header
6. 若 Fugle 回傳 429 → 回傳 429 rate_limit_exceeded
7. 若 Fugle 回傳其他 4xx/5xx → 回傳 upstream_error（不暴露原始訊息）
8. 標準化資料結構後回傳
```

**Fugle API 端點對應**：

| type | Fugle 端點 |
|------|-----------|
| `daily` | `GET https://api.fugle.tw/marketdata/v1.0/stock/historical/candles/{symbol}?timeframe=D` |
| `intraday` | `GET https://api.fugle.tw/marketdata/v1.0/stock/intraday/candles/{symbol}?timeframe=1` |
| `quote` | `GET https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/{symbol}` |

---

### 2. `KLinePanel` (`src/components/KLinePanel.tsx`)

**職責**：主面板容器，管理資料獲取、快取、載入狀態、錯誤處理。

```typescript
interface KLinePanelProps {
  ticker: string;          // 要顯示的股票代號
  onClose: () => void;     // 關閉面板的回呼
}

// 內部狀態
interface KLinePanelState {
  timeframe: 'daily' | 'intraday';
  dailyCandles: Candle[] | null;
  intradayCandles: Candle[] | null;
  quote: QuoteResponse | null;
  loading: boolean;
  error: string | null;
}
```

**快取機制**：

```typescript
// 使用 useRef 持有 Map，避免觸發 re-render
const dailyCache = useRef<Map<string, { data: Candle[]; timestamp: number }>>(new Map());
const CACHE_TTL = 5 * 60 * 1000; // 5 分鐘

function getCached(ticker: string): Candle[] | null {
  const entry = dailyCache.current.get(ticker);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    dailyCache.current.delete(ticker);
    return null;
  }
  return entry.data;
}
```

**AbortController 管理**：

```typescript
// 切換 ticker 時取消前一個請求
const abortRef = useRef<AbortController | null>(null);

function fetchData(ticker: string) {
  abortRef.current?.abort();
  abortRef.current = new AbortController();
  // 使用 abortRef.current.signal 傳入 fetch
}
```

**面板動畫**：使用 `framer-motion` 的 `AnimatePresence` + `motion.div`：

```typescript
// slide-down 展開動畫
const panelVariants = {
  hidden: { opacity: 0, y: -20, height: 0 },
  visible: { opacity: 1, y: 0, height: 'auto', transition: { duration: 0.25 } },
  exit:   { opacity: 0, y: -10, height: 0, transition: { duration: 0.2 } },
};
```

---

### 3. `CandlestickChart` (`src/components/CandlestickChart.tsx`)

**職責**：使用 recharts `ComposedChart` 渲染 K 線圖、SMA 均線、成交量子圖。

```typescript
interface CandlestickChartProps {
  candles: Candle[];
  timeframe: 'daily' | 'intraday';
}
```

**recharts K 線實作策略**：

recharts 沒有原生 Candlestick 元件，採用以下組合：

```
ComposedChart（主圖，80% 高度）
├── Bar（蠟燭實體）
│   - dataKey: 實體高度 = |close - open|
│   - y 起點: min(open, close)
│   - fill: 上漲=紅(#ef4444), 下跌=綠(#22c55e), 平盤=橘(#f97316)
│   - 使用 CustomBar shape 元件繪製完整蠟燭（含上下影線）
├── Line (SMA5,  stroke: #eab308, dot: false)
├── Line (SMA10, stroke: #f97316, dot: false)
├── Line (SMA20, stroke: #a855f7, dot: false)
└── Line (SMA60, stroke: #3b82f6, dot: false)

ComposedChart（成交量子圖，20% 高度）
└── Bar（成交量）
    - fill: 上漲日=#ef444466, 下跌日=#22c55e66
```

**CustomBar Shape**：

```typescript
// 自訂 recharts Bar shape，繪製完整蠟燭（實體 + 上下影線）
function CandleShape(props: CandleShapeProps) {
  const { x, y, width, height, open, high, low, close } = props;
  const isUp = close >= open;
  const color = close > open ? '#ef4444' : close < open ? '#22c55e' : '#f97316';
  const centerX = x + width / 2;
  
  return (
    <g>
      {/* 上影線 */}
      <line x1={centerX} y1={y} x2={centerX} y2={/* high 對應 y */} stroke={color} strokeWidth={1} />
      {/* 實體 */}
      <rect x={x} y={y} width={width} height={height} fill={color} />
      {/* 下影線 */}
      <line x1={centerX} y1={y + height} x2={centerX} y2={/* low 對應 y */} stroke={color} strokeWidth={1} />
    </g>
  );
}
```

**Tooltip 格式**：

```typescript
function KlineTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="kline-tooltip">
      <p>{d.date || d.time}</p>
      <p>開 {d.open} 高 {d.high} 低 {d.low} 收 {d.close}</p>
      <p>量 {d.volume.toLocaleString()}</p>
    </div>
  );
}
```

---

### 4. `QuoteBar` (內嵌於 `KLinePanel.tsx`)

**職責**：顯示現價、漲跌金額、漲跌幅，符合台股紅漲綠跌慣例。

```typescript
interface QuoteBarProps {
  ticker: string;
  quote: QuoteResponse | null;
  loading: boolean;
}
```

**顏色邏輯**：

```typescript
function getChangeColor(changePercent: number): string {
  if (changePercent > 0) return '#ef4444';  // 紅色（上漲）
  if (changePercent < 0) return '#22c55e';  // 綠色（下跌）
  return '#94a3b8';                          // 灰色（平盤）
}
```

---

### 5. `review/page.tsx` 修改

**新增狀態**：

```typescript
// K 線圖面板狀態
const [klineTicker, setKlineTicker] = useState<string | null>(null);
```

**新增觸發函式**：

```typescript
const openKLine = useCallback((ticker: string) => {
  if (!/^\d{4,6}$/.test(ticker)) return; // 格式驗證
  setKlineTicker(ticker);
}, []);

const closeKLine = useCallback(() => {
  setKlineTicker(null);
}, []);
```

**面板插入位置**：在 `<section className="quant-main">` 的 `<header>` 之後，各 Tab 內容之前：

```tsx
{/* K 線圖面板 */}
<AnimatePresence>
  {klineTicker && (
    <KLinePanel ticker={klineTicker} onClose={closeKLine} />
  )}
</AnimatePresence>
```

**BattleCard 修改**：新增「查看 K 線」按鈕，呼叫 `onKLine` prop。

**SniperTab 修改**：`ticker-cell` 改為可點擊按鈕，呼叫 `openKLine`。

---

### 6. SMA 計算工具函式 (`src/lib/sma.ts`)

```typescript
/**
 * 計算簡單移動平均線
 * @param data  收盤價陣列（時間順序，最舊在前）
 * @param period  週期（5, 10, 20, 60）
 * @returns  SMA 陣列，前 period-1 個元素為 null
 */
export function calculateSMA(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    return slice.reduce((sum, v) => sum + v, 0) / period;
  });
}
```

---

## 資料模型（Data Models）

### Fugle API 原始回應格式

**Historical Candles（日K）**：

```typescript
// Fugle API 原始回應
interface FugleHistoricalResponse {
  symbol: string;
  type: string;
  exchange: string;
  market: string;
  timeframe: string;
  candles: Array<{
    date: string;    // 'YYYY-MM-DD'
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}
```

**Intraday Candles（分K）**：

```typescript
interface FugleIntradayCandles {
  symbol: string;
  candles: Array<{
    date: string;    // 'YYYY-MM-DDTHH:MM:SS+08:00'
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}
```

**Intraday Quote（現價）**：

```typescript
interface FugleQuote {
  symbol: string;
  name: string;
  referencePrice: number;
  previousClose: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;       // 現價
  change: number;           // 漲跌金額
  changePercent: number;    // 漲跌幅（百分比，例如 2.5 代表 +2.5%）
  // ... 其他欄位
}
```

### 前端標準化資料模型

```typescript
// 標準化後的 K 線資料（前端使用）
interface ChartCandle {
  // 時間軸
  date?: string;    // Daily: 'MM/DD'（顯示用）
  time?: string;    // Intraday: 'HH:MM'（顯示用）
  dateRaw: string;  // 原始日期字串（排序用）
  
  // OHLCV
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  
  // 計算欄位（CandlestickChart 使用）
  bodyLow: number;    // min(open, close)
  bodyHigh: number;   // max(open, close)
  bodyHeight: number; // |close - open|
  direction: 'up' | 'down' | 'flat';
  
  // SMA（由 KLinePanel 計算後注入）
  sma5?: number | null;
  sma10?: number | null;
  sma20?: number | null;
  sma60?: number | null;
}

// 快取條目
interface CacheEntry {
  data: ChartCandle[];
  timestamp: number;  // Date.now()
}

// KLinePanel 內部狀態
interface KLinePanelState {
  timeframe: 'daily' | 'intraday';
  dailyCandles: ChartCandle[] | null;
  intradayCandles: ChartCandle[] | null;
  quote: QuoteResponse | null;
  loading: boolean;
  quoteLoading: boolean;
  error: string | null;
  quoteError: boolean;
}
```

### 環境變數

| 變數名稱 | 說明 | 必填 |
|---------|------|------|
| `FUGLE_API_KEY` | 富果 MarketData API Key | 是 |

---

## 正確性屬性（Correctness Properties）


*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1：無效 Ticker 不展開面板

*For any* 字串輸入，若該字串不符合 `/^\d{4,6}$/` 格式（包含空字串、含字母的字串、少於 4 位或多於 6 位的數字），呼叫 `openKLine(input)` 後，`klineTicker` 狀態應保持為 `null`（或原有值），面板不展開。

**Validates: Requirements 1.6**

---

### Property 2：開啟面板不改變 Tab 狀態

*For any* `activeTab` 狀態值（`'overview'`、`'analyze'`、`'sniper'`、`'warroom'`、`'strategy'`），呼叫 `openKLine(validTicker)` 後，`activeTab` 狀態應保持不變。

**Validates: Requirements 1.3**

---

### Property 3：切換 Ticker 面板保持展開

*For any* 兩個不同的有效 ticker（符合 `/^\d{4,6}$/`），當面板已展開（`klineTicker !== null`）時，呼叫 `openKLine(newTicker)` 後，`klineTicker` 應更新為 `newTicker`，且不為 `null`（面板不關閉）。

**Validates: Requirements 1.4**

---

### Property 4：API 輸入驗證回傳 400

*For any* 不符合 `/^\d{4,6}$/` 格式的字串作為 `ticker` 參數，或任意不屬於 `['daily', 'intraday', 'quote']` 的字串作為 `type` 參數，`/api/skynet/kline` 路由應回傳 HTTP 400 狀態碼，且回應 JSON 包含 `error` 欄位（值為 `'invalid_ticker'` 或 `'invalid_type'`），不向 Fugle API 發出任何請求。

**Validates: Requirements 2.5, 2.6**

---

### Property 5：API 回應結構完整性

*For any* 有效的 ticker 和 type 組合，`/api/skynet/kline` 路由的成功回應應包含完整的標準化結構：
- `type=daily`：回應包含 `candles` 陣列，每個元素包含 `date`、`open`、`high`、`low`、`close`、`volume` 欄位，且所有數值欄位為 `number` 型別。
- `type=intraday`：回應包含 `candles` 陣列，每個元素包含 `time`、`open`、`high`、`low`、`close`、`volume` 欄位。
- `type=quote`：回應包含 `price`、`change`、`changePercent`、`name` 欄位。

**Validates: Requirements 2.2, 2.3, 2.4**

---

### Property 6：Upstream 錯誤不暴露原始訊息

*For any* Fugle API mock 回傳 4xx 或 5xx 狀態碼的情境，`/api/skynet/kline` 路由的回應 JSON 字串中不應包含 Fugle API 的原始錯誤訊息內容，且回應中不應包含 `FUGLE_API_KEY` 的實際值。

**Validates: Requirements 2.7, 6.4**

---

### Property 7：每次請求攜帶 API Key Header

*For any* 有效的 ticker 和 type 組合，`/api/skynet/kline` 路由向 Fugle API 發出的每個請求都應包含 `X-API-KEY` header，其值等於環境變數 `FUGLE_API_KEY` 的值。

**Validates: Requirements 2.10**

---

### Property 8：日 K 資料截取上限

*For any* 長度為 N 的 candles 陣列（N 可為任意正整數），`KLinePanel` 傳入 `CandlestickChart` 的資料長度應為 `min(N, 120)`，且取最近的 120 筆（陣列末尾）。

**Validates: Requirements 3.1, 3.8**

---

### Property 9：蠟燭方向判斷正確性

*For any* `open` 和 `close` 數值，`getCandleDirection(open, close)` 函式應回傳：
- `'up'`（且顏色為 `#ef4444`）當 `close > open`
- `'down'`（且顏色為 `#22c55e`）當 `close < open`
- `'flat'`（且顏色為 `#f97316`）當 `close === open`

**Validates: Requirements 3.2**

---

### Property 10：SMA 計算正確性

*For any* 收盤價陣列 `data` 和週期 `period`，`calculateSMA(data, period)` 的每個非 `null` 值（索引 `i >= period - 1`）應等於 `data[i - period + 1]` 到 `data[i]` 的算術平均值，且前 `period - 1` 個元素應為 `null`。

**Validates: Requirements 3.3**

---

### Property 11：日期格式化正確性

*For any* 符合 `YYYY-MM-DD` 格式的有效日期字串，`formatDateLabel(dateStr)` 函式應回傳符合 `MM/DD` 格式的字串（月份和日期各兩位，以 `/` 分隔）。

**Validates: Requirements 3.5**

---

### Property 12：盤中 K 棒過濾完整性

*For any* intraday candles 陣列和當前時間 `now`，`filterCompletedCandles(candles, now)` 的結果中不應包含任何時間戳記 >= 當前分鐘起始點（`floor(now / 60000) * 60000`）的 K 棒，且結果中的所有 K 棒時間戳記均應早於當前分鐘起始點。

**Validates: Requirements 4.2**

---

### Property 13：交易時段判斷正確性

*For any* 台北時間的小時（0–23）和分鐘（0–59），`isInTradingHours(hour, minute)` 函式應回傳 `true` 當且僅當時間在 09:00（含）至 13:30（含）之間，否則回傳 `false`。

**Validates: Requirements 4.5**

---

### Property 14：QuoteBar 渲染完整性

*For any* 有效的 `QuoteResponse`（包含 `price`、`change`、`changePercent`、`name`）和 `ticker` 字串，`QuoteBar` 元件的渲染輸出應包含 ticker 代號、股票名稱、現價（保留兩位小數）、漲跌金額（含正負號）、漲跌幅（含正負號，格式為 `+X.XX%` 或 `-X.XX%`）的文字內容。

**Validates: Requirements 5.1**

---

### Property 15：漲跌幅顏色邏輯正確性

*For any* `changePercent` 數值，`getChangeColor(changePercent)` 函式應回傳：
- `'#ef4444'`（紅色）當 `changePercent > 0`
- `'#22c55e'`（綠色）當 `changePercent < 0`
- `'#94a3b8'`（灰色）當 `changePercent === 0`

**Validates: Requirements 5.2**

---

### Property 16：Tooltip 渲染完整性

*For any* 有效的 `ChartCandle` 資料，`KlineTooltip` 元件的渲染輸出應包含日期或時間、開盤價、最高價、最低價、收盤價、成交量的文字內容，且所有數值應為有效數字（非 NaN、非 undefined）。

**Validates: Requirements 7.1**

---

### Property 17：縮放範圍限制

*For any* 縮放輸入值（正整數或浮點數），`clampZoom(value)` 函式的回傳值應在 `[20, 120]` 範圍內（含邊界），即 `20 <= clampZoom(value) <= 120`。

**Validates: Requirements 7.2**

---

### Property 18：快取 TTL 有效性

*For any* ticker 字串和快取條目的 `timestamp`，`isCacheValid(timestamp, now)` 函式應回傳 `true` 當且僅當 `now - timestamp < 5 * 60 * 1000`（5 分鐘），否則回傳 `false`。

**Validates: Requirements 8.1, 8.2**

---

## 錯誤處理（Error Handling）

### API 路由錯誤處理矩陣

| 情境 | HTTP 狀態碼 | 回應 JSON | 備註 |
|------|------------|-----------|------|
| `FUGLE_API_KEY` 未設定 | 503 | `{"error": "api_key_not_configured"}` | 不發出 Fugle 請求 |
| ticker 格式不符 | 400 | `{"error": "invalid_ticker"}` | 不發出 Fugle 請求 |
| type 值不合法 | 400 | `{"error": "invalid_type"}` | 不發出 Fugle 請求 |
| Fugle API 429 | 429 | `{"error": "rate_limit_exceeded"}` | 速率限制 |
| Fugle API 其他 4xx/5xx | 原始狀態碼 | `{"error": "upstream_error"}` | 不暴露原始訊息 |
| Fugle API 10 秒未回應 | 504 | `{"error": "upstream_timeout"}` | AbortController |
| 成功 | 200 | 標準化資料結構 | |

### 前端錯誤處理

```typescript
// KLinePanel 錯誤狀態對應顯示訊息
const ERROR_MESSAGES: Record<string, string> = {
  'api_key_not_configured': '尚未設定 Fugle API Key。請至富果官網申請後，設定至 .env.local 的 FUGLE_API_KEY 欄位。',
  'rate_limit_exceeded': 'API 請求已達速率上限（60次/分鐘），請稍後再試。',
  'upstream_timeout': '富果 API 回應逾時，請稍後再試。',
  'upstream_error': '無法取得 {ticker} 的資料，請確認股票代號是否正確。',
  'invalid_ticker': '無效的股票代號。',
  'network_error': '網路連線異常，請檢查網路後再試。',
};
```

### Quote 資料失敗處理

Quote 資料失敗時，`QuoteBar` 顯示 `--` 佔位符，不影響 K 線圖顯示：

```typescript
// QuoteBar 顯示邏輯
const displayPrice = quote?.price?.toFixed(2) ?? '--';
const displayChange = quote ? (quote.change >= 0 ? '+' : '') + quote.change.toFixed(2) : '--';
const displayChangePercent = quote ? (quote.changePercent >= 0 ? '+' : '') + quote.changePercent.toFixed(2) + '%' : '--';
```

---

## 測試策略（Testing Strategy）

### 測試層次

本功能採用雙層測試策略：

1. **單元測試（Unit Tests）**：驗證純函式的具體行為、邊界條件、錯誤情境
2. **屬性測試（Property-Based Tests）**：驗證跨所有輸入的通用屬性

### 屬性測試框架

使用 **fast-check**（TypeScript/JavaScript 的 PBT 框架）：

```bash
npm install --save-dev fast-check
```

每個屬性測試配置最少 **100 次迭代**（fast-check 預設值）。

### 屬性測試實作規範

每個屬性測試必須以 tag 標記對應的設計屬性：

```typescript
// Tag 格式：Feature: skynet-kline-viewer, Property {N}: {property_text}
it('Property 9: 蠟燭方向判斷正確性', () => {
  // Feature: skynet-kline-viewer, Property 9: getCandleDirection 對任意 open/close 回傳正確方向
  fc.assert(
    fc.property(
      fc.float({ noNaN: true }),
      fc.float({ noNaN: true }),
      (open, close) => {
        const direction = getCandleDirection(open, close);
        if (close > open) return direction === 'up';
        if (close < open) return direction === 'down';
        return direction === 'flat';
      }
    ),
    { numRuns: 100 }
  );
});
```

### 測試檔案結構

```
src/
├── lib/
│   ├── sma.ts                    ← SMA 計算
│   ├── sma.test.ts               ← Property 10
│   ├── klineUtils.ts             ← getCandleDirection, formatDateLabel,
│   │                                isInTradingHours, clampZoom, isCacheValid,
│   │                                filterCompletedCandles
│   └── klineUtils.test.ts        ← Properties 9, 11, 12, 13, 15, 17, 18
├── components/
│   ├── KLinePanel.tsx
│   ├── KLinePanel.test.tsx       ← Properties 1, 2, 3, 8; Examples 4.1, 8.4
│   ├── CandlestickChart.tsx
│   ├── QuoteBar.test.tsx         ← Properties 14, 15
│   └── KlineTooltip.test.tsx     ← Property 16
└── app/
    └── api/
        └── skynet/
            └── kline/
                ├── route.ts
                └── route.test.ts ← Properties 4, 5, 6, 7; Edge cases 2.8, 2.9, 6.2
```

### 屬性測試對應表

| Property | 測試檔案 | 測試函式 | fast-check 生成器 |
|----------|---------|---------|-----------------|
| P1 無效 Ticker 不展開 | KLinePanel.test.tsx | `openKLine` | `fc.string()` 過濾非 4-6 位數字 |
| P2 開啟不改變 Tab | KLinePanel.test.tsx | `openKLine` | `fc.constantFrom('overview', 'analyze', ...)` |
| P3 切換 Ticker 保持展開 | KLinePanel.test.tsx | `openKLine` | `fc.string().filter(isValidTicker)` |
| P4 API 輸入驗證 | route.test.ts | `GET /api/skynet/kline` | `fc.string()` + `fc.string()` |
| P5 API 回應結構 | route.test.ts | `GET /api/skynet/kline` | `fc.string().filter(isValidTicker)` |
| P6 不暴露原始訊息 | route.test.ts | mock Fugle 4xx/5xx | `fc.integer({ min: 400, max: 599 })` |
| P7 攜帶 API Key | route.test.ts | mock Fugle | `fc.string().filter(isValidTicker)` |
| P8 日 K 截取上限 | KLinePanel.test.tsx | `sliceCandles` | `fc.array(fc.record({...}))` |
| P9 蠟燭方向判斷 | klineUtils.test.ts | `getCandleDirection` | `fc.float({ noNaN: true })` × 2 |
| P10 SMA 計算 | sma.test.ts | `calculateSMA` | `fc.array(fc.float({ noNaN: true }))` |
| P11 日期格式化 | klineUtils.test.ts | `formatDateLabel` | `fc.date()` |
| P12 盤中 K 棒過濾 | klineUtils.test.ts | `filterCompletedCandles` | `fc.array(fc.record({...}))` |
| P13 交易時段判斷 | klineUtils.test.ts | `isInTradingHours` | `fc.integer({min:0,max:23})` × `fc.integer({min:0,max:59})` |
| P14 QuoteBar 渲染 | QuoteBar.test.tsx | `render(<QuoteBar />)` | `fc.record({ price: fc.float(), ... })` |
| P15 漲跌幅顏色 | klineUtils.test.ts | `getChangeColor` | `fc.float({ noNaN: true })` |
| P16 Tooltip 渲染 | KlineTooltip.test.tsx | `render(<KlineTooltip />)` | `fc.record({ open: fc.float(), ... })` |
| P17 縮放範圍限制 | klineUtils.test.ts | `clampZoom` | `fc.float({ noNaN: true })` |
| P18 快取 TTL | klineUtils.test.ts | `isCacheValid` | `fc.integer()` × `fc.integer()` |

### 單元測試（Example-Based）

以下情境使用具體範例測試：

- **API Key 未設定**：`FUGLE_API_KEY=''` → 回傳 503
- **Fugle 429 處理**：mock 429 → 回傳 429 + `rate_limit_exceeded`
- **Fugle 超時**：mock 延遲 > 10s → 回傳 504 + `upstream_timeout`
- **載入動畫**：`loading=true` → DOM 包含 spinner，不包含圖表
- **錯誤訊息**：`error='upstream_error'` → 顯示含 ticker 的錯誤文字
- **切換 timeframe**：點擊「分K」按鈕 → `timeframe` state 更新為 `'intraday'`
- **AbortController**：快速切換 ticker → 前一個 fetch 被 abort

### 整合測試

以下情境需要整合測試（不適合 PBT）：

- **完整 API 流程**：使用真實 Fugle API（或 staging）驗證端對端資料流
- **面板展開/關閉動畫**：使用 Playwright/Cypress 驗證 framer-motion 動畫
- **觸控縮放/拖曳**：使用 Playwright 模擬觸控事件

### 測試執行

```bash
# 單元測試 + 屬性測試（單次執行）
npx jest --testPathPattern="src/(lib|components|app/api)"

# 或使用 vitest（若專案採用）
npx vitest run
```
