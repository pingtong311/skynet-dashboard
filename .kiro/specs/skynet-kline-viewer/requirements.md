# 需求文件：天網 K 線圖查看器（skynet-kline-viewer）

## 簡介

在天網系統的網頁戰情中心（`/review` 頁面）加入內嵌 K 線圖查看功能。使用者在「今日戰報」或「狙擊清單」中點擊任何股票代號，可直接展開一個 K 線圖面板，顯示該股票的日 K 線圖、多條均線（SMA5/10/20/60）以及成交量柱狀圖，無需跳轉至外部網站。資料來源為 Fugle MarketData API（富果台股即時行情 API）。

---

## 詞彙表

- **K_Line_Panel**：在 `/review` 頁面內嵌展開的 K 線圖面板元件，不跳頁。
- **Kline_API_Route**：Next.js 後端 API 路由（`/api/skynet/kline`），負責代理 Fugle MarketData API 請求，保護 API Key 不暴露於前端。
- **Fugle_API**：富果 MarketData API（`api.fugle.tw`），提供台股歷史日 K、盤中分 K 及現價報價。
- **Candlestick_Chart**：K 線圖，每根蠟燭顯示開盤（Open）、最高（High）、最低（Low）、收盤（Close）四個價格。
- **SMA**：簡單移動平均線（Simple Moving Average），本功能需支援 SMA5、SMA10、SMA20、SMA60。
- **Volume_Bar**：成交量柱狀圖，顯示每日或每分鐘的成交量，上漲日為紅色，下跌日為綠色（台股慣例）。
- **Daily_K**：日 K 線，每根蠟燭代表一個交易日，可查詢任意歷史區間。
- **Intraday_K**：盤中分 K 線，每根蠟燭代表一分鐘，僅提供近 30 日資料。
- **Quote_Bar**：K 線圖右上角的現價資訊列，顯示現價與漲跌幅。
- **Review_Page**：天網戰情中心頁面（`/review`），現有今日戰報、AI 查詢、狙擊清單、大盤情報四個 Tab。
- **Battle_Report_Tab**：Review_Page 中的「今日戰報」Tab，顯示 AI 分析的股票清單。
- **Sniper_Tab**：Review_Page 中的「狙擊清單」Tab，顯示使用者加入監控的股票清單。
- **Ticker**：台股股票代號，4 至 6 位數字，例如 `2330`。

---

## 需求

### 需求 1：K 線圖觸發入口

**使用者故事：** 身為天網使用者，我希望在今日戰報和狙擊清單中點擊股票代號，就能直接查看 K 線圖，這樣我就不需要離開戰情中心去外部網站確認走勢。

#### 驗收標準

1. WHEN 使用者在 Battle_Report_Tab 的股票卡片上點擊「查看 K 線」按鈕，THE K_Line_Panel SHALL 在當前頁面展開並顯示該 Ticker 的 K 線圖。
2. WHEN 使用者在 Sniper_Tab 的股票列表中點擊任一 Ticker 文字，THE K_Line_Panel SHALL 在當前頁面展開並顯示該 Ticker 的 K 線圖。
3. WHILE K_Line_Panel 展開中，THE Review_Page SHALL 保持當前 Tab 選取狀態不變，不進行頁面跳轉，且捲動位置不重置。
4. WHILE K_Line_Panel 已展開，WHEN 使用者點擊另一個 Ticker，THE K_Line_Panel SHALL 更新顯示新 Ticker 的 K 線圖，不關閉面板，且切換完成時間不超過 500ms（不含網路請求時間）。
5. WHEN 使用者點擊 K_Line_Panel 的關閉按鈕，THE K_Line_Panel SHALL 收起，且 Tab 狀態、捲動位置均回到面板展開前的狀態。
6. IF 使用者觸發 K 線圖入口時 Ticker 為空字串或格式不符（非 4–6 位數字），THEN THE K_Line_Panel SHALL 不展開，且顯示「無效的股票代號」提示訊息。

---

### 需求 2：K 線圖後端 API 代理

**使用者故事：** 身為天網系統，我需要一個後端 API 路由來代理 Fugle MarketData API 請求，這樣 API Key 就不會暴露在前端程式碼或瀏覽器中。

#### 驗收標準

1. THE Kline_API_Route SHALL 從伺服器端環境變數讀取 Fugle API Key，不得將 API Key 傳送至前端。
2. WHEN 前端請求 `/api/skynet/kline?ticker={Ticker}&type=daily`，THE Kline_API_Route SHALL 向 Fugle_API 請求該 Ticker 的 Daily_K 歷史資料，並回傳包含 `{ candles: [{ date, open, high, low, close, volume }] }` 結構的標準化 JSON。
3. WHEN 前端請求 `/api/skynet/kline?ticker={Ticker}&type=intraday`，THE Kline_API_Route SHALL 向 Fugle_API 請求該 Ticker 的 Intraday_K 資料，並回傳包含 `{ candles: [{ time, open, high, low, close, volume }] }` 結構的標準化 JSON。
4. WHEN 前端請求 `/api/skynet/kline?ticker={Ticker}&type=quote`，THE Kline_API_Route SHALL 向 Fugle_API 請求該 Ticker 的現價報價，並回傳包含 `{ price, change, changePercent, name }` 結構的標準化 JSON。
5. IF 請求中的 `ticker` 參數為空或格式不符（非 4–6 位數字），THEN THE Kline_API_Route SHALL 回傳 HTTP 400 狀態碼及 `{"error": "invalid_ticker"}` 訊息，不向 Fugle_API 發出請求。
6. IF 請求中的 `type` 參數不屬於 `daily`、`intraday`、`quote` 之一，THEN THE Kline_API_Route SHALL 回傳 HTTP 400 狀態碼及 `{"error": "invalid_type"}` 訊息。
7. IF Fugle_API 回傳 HTTP 4xx 或 5xx 錯誤，THEN THE Kline_API_Route SHALL 回傳包含 `{"error": "upstream_error"}` 的 JSON 及 Fugle_API 原始 HTTP 狀態碼，不得將 Fugle_API 的原始錯誤訊息直接暴露。
8. IF Fugle_API 回傳 HTTP 429，THEN THE Kline_API_Route SHALL 回傳 HTTP 429 狀態碼及 `{"error": "rate_limit_exceeded"}` 訊息。
9. IF Fugle_API 在 10 秒內未回應，THEN THE Kline_API_Route SHALL 中止請求並回傳 HTTP 504 狀態碼及 `{"error": "upstream_timeout"}` 訊息。
10. THE Kline_API_Route SHALL 在每次請求中加入 `X-API-KEY` header，其值來自環境變數 `FUGLE_API_KEY`。

---

### 需求 3：日 K 線圖顯示

**使用者故事：** 身為天網使用者，我希望看到股票的日 K 線圖，包含開高低收蠟燭圖、均線和成交量，這樣我就能快速判斷股票的中長期走勢。

#### 驗收標準

1. WHEN K_Line_Panel 以 Daily_K 模式展開，THE Candlestick_Chart SHALL 顯示最近 120 個交易日的日 K 蠟燭圖。
2. WHILE Daily_K 模式顯示中，THE Candlestick_Chart SHALL 以紅色顯示收盤價高於開盤價的蠟燭（上漲），以綠色顯示收盤價低於開盤價的蠟燭（下跌），以橘色顯示收盤價等於開盤價的蠟燭（平盤），符合台股慣例。
3. WHILE Daily_K 模式顯示中，THE Candlestick_Chart SHALL 同時顯示 SMA5（黃色）、SMA10（橘色）、SMA20（紫色）、SMA60（藍色）四條均線。
4. WHILE Daily_K 模式顯示中，THE Volume_Bar SHALL 顯示在 K_Line_Panel 總高度的下方 20% 區域，上漲日為紅色，下跌日為綠色。
5. WHILE Daily_K 模式顯示中，THE Candlestick_Chart SHALL 在 X 軸顯示 MM/DD 格式的日期標籤，在 Y 軸顯示價格刻度。
6. WHILE Daily_K 資料載入中，THE K_Line_Panel SHALL 顯示載入動畫，不顯示空白圖表。
7. IF Daily_K 資料為空或無法取得，THEN THE K_Line_Panel SHALL 顯示「無法取得 {Ticker} 的日 K 資料」錯誤訊息。
8. IF 可取得的歷史資料少於 120 個交易日，THEN THE Candlestick_Chart SHALL 顯示所有可取得的資料，不補空白蠟燭。

---

### 需求 4：盤中分 K 線圖顯示

**使用者故事：** 身為天網使用者，我希望在盤中能切換到分 K 圖查看即時走勢，這樣我就能掌握當日的進出場時機。

#### 驗收標準

1. WHEN 使用者在 K_Line_Panel 中點擊「分K（盤中）」切換按鈕，THE K_Line_Panel SHALL 在 500ms 內（不含網路請求時間）切換顯示 Intraday_K 蠟燭圖。
2. WHEN Intraday_K 資料載入完成，THE Intraday_K 蠟燭圖 SHALL 顯示當日所有時間戳記早於當前分鐘起始點的已完成分鐘 K 線資料，不顯示進行中的當前分鐘 K 棒。
3. WHEN Intraday_K 蠟燭圖顯示中，THE Volume_Bar SHALL 顯示在 K_Line_Panel 總高度的下方 20% 區域。
4. WHEN 使用者在 K_Line_Panel 中點擊「日K」切換按鈕，THE K_Line_Panel SHALL 在 500ms 內（不含網路請求時間）切換回 Daily_K 蠟燭圖。
5. IF 當前台北時間早於 09:00 或晚於 13:30，THEN THE K_Line_Panel SHALL 在分 K 圖上方顯示「目前非交易時段，顯示最近一個交易日資料」提示文字。
6. IF Intraday_K 資料在 10 秒內無法取得，THEN THE K_Line_Panel SHALL 顯示「無法取得 {Ticker} 的盤中資料」錯誤訊息。

---

### 需求 5：現價資訊列（Quote Bar）

**使用者故事：** 身為天網使用者，我希望在 K 線圖面板中直接看到現價和漲跌幅，這樣我就不需要另外查詢報價。

#### 驗收標準

1. WHEN K_Line_Panel 展開，THE Quote_Bar SHALL 顯示在面板右上角，包含：Ticker 代號、股票名稱、現價（元，保留小數點後兩位）、漲跌金額（含正負號，保留小數點後兩位）、漲跌幅（含正負號，保留小數點後兩位，格式為 `+X.XX%` 或 `-X.XX%`）。
2. IF 漲跌幅大於 0，THEN THE Quote_Bar SHALL 以紅色顯示漲跌幅；IF 漲跌幅小於 0，THEN THE Quote_Bar SHALL 以綠色顯示漲跌幅；IF 漲跌幅等於 0，THEN THE Quote_Bar SHALL 以灰色顯示漲跌幅，符合台股慣例。
3. WHEN K_Line_Panel 展開時，THE K_Line_Panel SHALL 自動向 Kline_API_Route 發出一次 `type=quote` 請求以填充 Quote_Bar。
4. IF 現價報價資料在 10 秒內無法取得，THEN THE Quote_Bar 的現價、漲跌金額、漲跌幅欄位 SHALL 顯示「--」，Ticker 代號與股票名稱欄位仍正常顯示，不得顯示錯誤訊息干擾圖表。

---

### 需求 6：API Key 設定

**使用者故事：** 身為天網系統管理員，我需要能夠設定 Fugle API Key，這樣系統才能存取 Fugle MarketData API。

#### 驗收標準

1. THE Kline_API_Route SHALL 從環境變數 `FUGLE_API_KEY` 讀取 Fugle API Key。
2. IF 環境變數 `FUGLE_API_KEY` 未設定或為空字串，THEN THE Kline_API_Route SHALL 回傳 HTTP 503 狀態碼及 `{"error": "api_key_not_configured"}` 訊息。
3. IF THE K_Line_Panel 收到 `api_key_not_configured` 錯誤，THEN THE K_Line_Panel SHALL 顯示引導使用者前往富果官網申請 API Key 並設定至 `.env.local` 的說明訊息。
4. THE Kline_API_Route SHALL 不得在任何 HTTP 回應、日誌輸出或前端可見的欄位中包含 `FUGLE_API_KEY` 的實際值。

---

### 需求 7：圖表互動操作

**使用者故事：** 身為天網使用者，我希望能在 K 線圖上進行基本的互動操作，這樣我就能更仔細地檢視特定時間段的走勢。

#### 驗收標準

1. WHEN 使用者將滑鼠游標移至 Candlestick_Chart 上的任一蠟燭，THE Candlestick_Chart SHALL 顯示 tooltip，包含該蠟燭的日期（或時間）、開盤、最高、最低、收盤價格及成交量，且 tooltip 在游標離開蠟燭後自動消失。
2. WHEN 使用者透過滑鼠滾輪或觸控板對 Candlestick_Chart 執行縮放操作，THE Candlestick_Chart SHALL 調整時間軸顯示範圍，最小顯示 20 根蠟燭，最大顯示 120 根蠟燭。
3. WHEN 使用者在 Candlestick_Chart 上按住滑鼠左鍵並拖曳，THE Candlestick_Chart SHALL 平移時間軸，不超出資料的起始與結束邊界。
4. WHERE 使用者裝置為觸控優先裝置（touch-primary device），THE K_Line_Panel SHALL 支援雙指縮放調整時間軸範圍，以及單指拖曳平移時間軸。

---

### 需求 8：效能與速率限制保護

**使用者故事：** 身為天網系統，我需要保護 Fugle API 的免費方案速率限制，這樣才不會因為超量請求而導致服務中斷。

#### 驗收標準

1. THE K_Line_Panel SHALL 對相同 Ticker 的 Daily_K 資料實施記憶體快取，快取有效期為 5 分鐘，快取範圍不包含 Intraday_K 及 Quote 資料。
2. WHEN 使用者在 5 分鐘內重複開啟相同 Ticker 的 K_Line_Panel，THE K_Line_Panel SHALL 使用快取資料顯示圖表，不向 Kline_API_Route 發出新的 Daily_K 請求。
3. THE K_Line_Panel SHALL 在同一時間只允許一個 Ticker 的 K 線圖展開，不支援同時展開多個面板。
4. IF 使用者在前一個 API 請求尚未完成時切換 Ticker，THEN THE K_Line_Panel SHALL 取消前一個請求（透過 AbortController）並立即發出新 Ticker 的請求，同時顯示新 Ticker 的載入動畫。
