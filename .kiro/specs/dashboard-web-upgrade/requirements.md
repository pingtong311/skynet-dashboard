# Requirements Document

## Introduction

天網系統（SkyNet）Dashboard 升級計畫，目標是讓網頁戰情中心（部署於 Cloudflare Pages）能完整接替 Telegram 的輸入與通知功能。本次升級分為四個 Phase：B1（AI 分析結果直接顯示在網頁）、B2（K 線圖強化：MACD、KD、布林通道、Target/StopLoss 標記）、B3（指揮中心升級：快速指令直接執行、網頁版 /watch 功能）、B4（自動刷新 + 瀏覽器推播通知）。技術限制：前端 Next.js 15.5.2 / React 19 / Cloudflare Pages（Edge runtime）、圖表使用 recharts、動畫使用 framer-motion、所有 API routes 必須保持 `export const runtime = 'edge'`。

## Requirements

### Requirement 1: AI 分析結果同步回傳至網頁（Phase B1）

**User Story:** 作為交易員，我希望在網頁輸入股票代號後，AI 分析結果直接顯示在網頁上，不需要切換到 Telegram 查看，以便在同一個介面完成查詢與決策。

#### Acceptance Criteria

1. WHEN 使用者在 Dashboard AI 查詢頁面送出股票代號，THE Analyze_API SHALL 以同步模式等待 Omni 完整分析結果後再回傳（不得回傳 `status: processing` 的中間狀態）。
2. WHEN Omni 分析完成，THE Analyze_API SHALL 在 60 秒內回傳包含以下欄位的完整戰報 JSON：`ticker`、`name`、`price`、`action`（BUY/SELL/WAIT）、`confidence`、`target`、`stopLoss`、`strategyType`、`momentum`、`verdictTitle`、`todayView`、`reason`（4 位專家分析文字）。
3. WHEN Analyze_API 回傳完整戰報，THE Dashboard SHALL 在 AI 查詢頁面直接渲染完整戰報卡片，包含 4 位專家分析、Target/StopLoss 數值、技術快照摘要。
4. IF Analyze_API 在 60 秒內未收到 Omni 回應，THEN THE Analyze_API SHALL 回傳 HTTP 504 並附帶錯誤訊息 `{ "error": "analysis_timeout", "message": "分析逾時，請稍後再試" }`。
5. IF n8n 天網-03 webhook 回傳非 200 狀態碼，THEN THE Analyze_API SHALL 回傳 HTTP 502 並附帶錯誤訊息 `{ "error": "upstream_error" }`。
6. WHILE TG 雙軌並行期間，THE 天網-03 SHALL 同時推播分析結果至 Telegram，不影響網頁同步回傳。
7. THE Analyze_API SHALL 保持 `export const runtime = 'edge'`，並將 timeout 上限設為 60000ms。
8. WHEN n8n 天網-03 的 Dashboard Webhook Gateway 節點 responseMode 設定為 `lastNode`，THE 天網-03 SHALL 等待 Omni 完整執行後才回應 HTTP 請求。

### Requirement 2: K 線圖技術指標強化（Phase B2）

**User Story:** 作為技術分析交易員，我希望 K 線圖能顯示 MACD、KD、布林通道與 Target/StopLoss 水平線，以便在同一個圖表介面完成技術分析判斷。

#### Acceptance Criteria

1. THE CandlestickChart SHALL 在主圖下方新增 MACD 子圖，包含 DIF 線（快線）、SIGNAL 線（慢線）、HIST 柱狀圖（正值紅色、負值綠色）。
2. THE CandlestickChart SHALL 在 MACD 子圖下方新增 KD 子圖，包含 K 線（黃色）與 D 線（橘色）。
3. WHEN KLinePanel 收到含有 `target` 與 `stopLoss` 數值的 props，THE CandlestickChart SHALL 在主圖 Y 軸對應位置繪製 Target 水平線（綠色虛線）與 StopLoss 水平線（紅色虛線），並附帶價格標籤。
4. THE CandlestickChart SHALL 在主圖疊加 Bollinger_Bands 上軌（Upper，藍色半透明線）、中軌（Middle，灰色線）、下軌（Lower，藍色半透明線），並在上下軌之間填充半透明區域。
5. THE CandlestickChart 成交量子圖 SHALL 依據當根 K 線漲跌方向著色：上漲為紅色（`rgba(239,68,68,0.6)`）、下跌為綠色（`rgba(34,197,94,0.6)`）。
6. THE KLinePanel SHALL 在前端計算 MACD（EMA12、EMA26、DIF、SIGNAL 9 日 EMA、HIST）、KD（RSV 9 日、K 值、D 值）、Bollinger_Bands（SMA20、標準差 ×2）。
7. WHEN 可見 K 線數量少於某指標計算所需的最小週期，THE CandlestickChart SHALL 僅隱藏該指標（依各指標自身的資料需求個別判斷），不影響其他已有足夠資料的指標顯示，且不得顯示錯誤訊息。
8. THE CandlestickChart 圖例區域 SHALL 顯示所有啟用指標的顏色說明，包含 SMA5/10/20/60、MACD DIF/SIGNAL、KD K/D、Bollinger_Bands Upper/Lower。
9. WHERE 使用者開啟 K 線圖時傳入 `target` 與 `stopLoss` props，THE KLinePanel SHALL 將這兩個數值傳遞給 CandlestickChart 用於繪製水平線。

### Requirement 3: 指揮中心升級（Phase B3）

**User Story:** 作為交易員，我希望在網頁指揮中心能直接執行快速指令並看到結果，以及直接從網頁新增和管理狙擊候選，不需要透過 Telegram。

#### Acceptance Criteria

1. WHEN 使用者在 Dashboard 點擊快速指令按鈕，THE Dashboard SHALL 直接呼叫對應 API 並在頁面顯示執行結果，不得只是將指令填入輸入框。
2. THE Dashboard 狙擊清單頁面 SHALL 提供「新增狙擊」表單，包含股票代號輸入欄（4-6 位數字）與觸發價輸入欄（選填，正數浮點數）。
3. WHEN 使用者在網頁提交新增狙擊表單，THE Watch_API SHALL 以 POST 方式呼叫 n8n 天網-03 的 `/watch` 路由，傳入 `ticker`、`triggerPrice`（可為 0）、`source: 'Dashboard'`。
4. WHEN Watch_API 成功呼叫 n8n，THE Dashboard SHALL 在狙擊清單頁面顯示成功訊息，並在 3 秒內自動刷新狙擊清單。
5. IF Watch_API 呼叫 n8n 失敗，THEN THE Dashboard SHALL 顯示錯誤訊息，說明新增失敗原因。
6. THE Watch_API SHALL 驗證 `ticker` 格式為 4-6 位數字，IF 格式不符，THEN THE Watch_API SHALL 回傳 HTTP 400 並附帶 `{ "error": "invalid_ticker" }`。
7. THE Watch_API SHALL 保持 `export const runtime = 'edge'`。
8. WHEN 使用者在 Dashboard 狙擊清單頁面點擊「撤退」按鈕，THE Dashboard SHALL 呼叫對應 API 更新該標的狀態為「已撤退」，並刷新清單。
9. THE Dashboard 狙擊清單頁面 SHALL 顯示每個標的的「距觸發百分比」，計算公式為 `((triggerPrice - currentPrice) / currentPrice) * 100`，距觸發 1% 以內時以警示色標示。

### Requirement 4: 自動刷新與瀏覽器推播通知（Phase B4）

**User Story:** 作為交易員，我希望網頁能自動刷新最新資料，並在狙擊突破或晨間戰報完成時直接推播桌面通知，不需要依賴 Telegram。

#### Acceptance Criteria

1. WHILE Dashboard 今日戰報頁面處於開啟狀態，THE Auto_Refresh SHALL 每 5 分鐘自動呼叫 `/api/skynet/warroom?type=battle_reports` 刷新戰報資料。
2. WHILE Dashboard 狙擊清單頁面處於開啟狀態，THE Auto_Refresh SHALL 每 2 分鐘自動呼叫 `/api/skynet/warroom?type=snipers` 刷新狙擊清單資料。
3. WHEN 使用者首次開啟 Dashboard，THE Dashboard SHALL 請求瀏覽器 Notification_API 授權，IF 使用者拒絕，THEN THE Dashboard SHALL 靜默降級（不顯示錯誤，不再重複請求）。
4. WHEN 狙擊清單刷新後發現某標的狀態從「待觸發」變更為「已觸發」，THE Notification_API SHALL 發送桌面推播通知，通知標題為「🎯 狙擊突破」，通知內容包含股票代號、名稱與觸發價。
5. WHEN 今日戰報刷新後發現新增戰報數量大於前次刷新數量，THE Notification_API SHALL 發送桌面推播通知，通知標題為「📊 晨間戰報更新」，通知內容包含新增戰報數量。
6. IF 瀏覽器不支援 Notification_API，THEN THE Dashboard SHALL 靜默降級，不顯示錯誤訊息。
7. WHEN 使用者切換至其他瀏覽器分頁（頁面進入 hidden 狀態），THE Auto_Refresh SHALL 暫停自動刷新計時器，WHEN 使用者切回 Dashboard 分頁，THE Auto_Refresh SHALL 立即執行一次刷新並重啟計時器。
8. THE Dashboard 頂部狀態列 SHALL 顯示「下次刷新倒數秒數」，每秒更新一次。
9. WHEN 使用者點擊手動刷新按鈕，THE Auto_Refresh SHALL 重置計時器並立即執行刷新。
10. WHERE 瀏覽器已授予 Notification_API 權限，THE Dashboard SHALL 在頂部狀態列顯示「🔔 通知已啟用」狀態標籤。

---

## Glossary

- **Dashboard**：部署於 Cloudflare Pages 的天網網頁戰情中心（https://skynet-dashboard-cf.pages.dev）
- **Omni**：天網 AI 分析引擎（[天網-Omni] 全能極速量化引擎），整合 Pinecone + OpenAI gpt-4o-mini，產出 4 位專家分析戰報
- **天網-03**：n8n 工作流「全能副官」，作為 Dashboard Webhook Gateway，路徑為 `skynet-terminal-sync-v1`
- **Analyze_API**：Next.js Edge API route `/api/skynet/analyze`，負責代理 AI 分析請求至 n8n 天網-03
- **Watch_API**：Next.js Edge API route `/api/skynet/watch`，負責代理 /watch 狙擊加入請求至 n8n
- **Warroom_API**：Next.js Edge API route `/api/skynet/warroom`，負責從 n8n 取得戰報、狙擊清單、大盤情報
- **KLinePanel**：K 線圖面板元件，包含主圖（K 線 + SMA）與成交量子圖
- **CandlestickChart**：K 線圖渲染元件，使用 recharts ComposedChart
- **BattleReport**：Omni 產出的完整戰報，包含 4 位專家分析、Target/StopLoss、技術快照
- **SniperCandidate**：狙擊候選標的，含代號、觸發價、防守價、狀態
- **Notification_API**：瀏覽器 Web Notification API，用於桌面推播通知
- **Auto_Refresh**：前端定時自動刷新機制
- **MACD**：指數平滑異同移動平均線，包含 DIF（快線）、SIGNAL（慢線）、HIST（柱狀圖）
- **KD**：隨機指標，包含 K 線與 D 線
- **Bollinger_Bands**：布林通道，包含上軌（Upper）、中軌（Middle）、下軌（Lower）
- **TG**：Telegram，目前的輸入介面與推播通知管道（升級後保留雙軌並行）
