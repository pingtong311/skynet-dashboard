# Requirements Document

## Introduction

本功能將 SkyNet Dashboard 的戰情室（War Room）從單一「今日 AI 戰報」區塊，升級為類似 MOPS 公開資訊觀測站的專業交易指揮中心。升級分四個 Phase 進行：Phase A 修復現有斷線問題並新增核心即時數據面板；Phase B 整合 MOPS 重大訊息、三大法人、融資融券等資訊；Phase C 新增個股 K 線圖、個人績效儀表板與自選監控管理介面。

系統部署於 Cloudflare Pages（靜態匯出），前端使用 Next.js 14 App Router + TypeScript + Tailwind CSS + Recharts，所有 API routes 必須使用 `export const runtime = 'edge'`，不得使用 Node.js runtime。

---

## Glossary

- **War_Room**: 戰情室頁面，SkyNet Dashboard 的主要交易指揮中心介面（`/review` 路由）
- **Health_Checker**: 健康檢查模組，負責探測 n8n 與 Google Sheets 連線狀態
- **n8n**: SkyNet 後端自動化工作流引擎，部署於 Oracle Cloud（`https://skynet-cmd.duckdns.org`）
- **Sheets_API**: 透過 n8n webhook 代理存取的 Google Sheets 資料服務
- **TWSE_MIS**: 台灣證券交易所即時報價 API（`https://mis.twse.com.tw/stock/api/getStockInfo.asp`）
- **TWSE_Opendata**: 台灣證券交易所收盤數據 API（`https://opendata.twse.com.tw`）
- **Position_Card**: 持倉即時損益卡片元件，顯示【自選監控】Sheet 中持有股數 > 0 的持倉
- **Sniper_Panel**: 狙擊候選狀態面板，顯示【狙擊候選】Sheet 中的標的及其觸發狀態
- **Index_Panel**: 大盤指數即時顯示面板，顯示加權指數與 0050 即時報價
- **P1_Output**: 天網-04 止盈止損觸發紀錄，來源為【AI 戰報紀錄】或 n8n webhook
- **P2_Output**: Beta P2 收盤選股結果，來源為【狙擊候選】Sheet（`source=POST_MARKET_SCAN`）
- **MOPS**: 公開資訊觀測站，提供上市櫃公司重大訊息公告
- **Institutional_Panel**: 三大法人（外資、投信、自營商）買賣超面板
- **Margin_Panel**: 融資融券餘額顯示面板
- **TradingView_Chart**: TradingView Lightweight Charts 免費版個股 K 線圖元件
- **Performance_Dashboard**: 個人績效儀表板，視覺化回測實驗室數據
- **Monitoring_Manager**: 自選監控管理介面，允許在 Dashboard 直接編輯目標價與停損價
- **Trading_Session**: 交易時段，分為開盤前（09:00 前）、盤中（09:00–13:30）、收盤後（13:30 後）
- **ETF**: 指數股票型基金，代號通常為 5 碼含字母（如 00878、00919）
- **Cloudflare_Pages**: 靜態網站部署平台，限制使用 Edge Runtime，不支援 Node.js Server Components

---

## Requirements

### Requirement 1：修復健康檢查斷線問題

**User Story:** As a 交易員, I want 戰情室頂部的 n8n 與 Sheets 連線狀態指示燈正確反映實際連線狀況, so that 我能即時知道後端服務是否正常運作，不會被誤報的「斷線」訊息干擾判斷。

#### Acceptance Criteria

1. WHEN Health_Checker 探測 n8n 連線時，THE Health_Checker SHALL 使用 `GET /healthz` 端點，並將 HTTP 200–499 的回應視為連線正常（`ok`），HTTP 500+ 視為錯誤（`error`），逾時 5 秒視為逾時（`timeout`）
2. WHEN Health_Checker 探測 Sheets 連線時，THE Health_Checker SHALL 使用 `GET /webhook/skynet-dashboard?type=health_ping` 端點，並將 HTTP 200–499 的回應視為連線正常（`ok`），HTTP 500+ 視為錯誤（`error`），逾時 6 秒視為逾時（`timeout`）
3. WHEN Health_Checker 完成探測後，THE Health_Checker SHALL 在回應中包含 `n8n`、`sheets`、`checkedAt` 三個欄位
4. WHEN War_Room 頁面載入時，THE War_Room SHALL 立即觸發一次健康檢查，並每 60 秒自動重新探測
5. IF Health_Checker 探測過程中發生網路例外（包含無法建立連線、DNS 解析失敗等無法取得 HTTP 回應的情況），THEN THE Health_Checker SHALL 將對應服務狀態設為 `error`，不得拋出未捕獲例外
6. THE War_Room SHALL 在頂部狀態列以顏色區分顯示健康狀態：`ok` 顯示綠色、`error` 顯示紅色、`timeout` 顯示黃色、`loading` 顯示灰色

---

### Requirement 2：持倉即時損益卡片（Phase A）

**User Story:** As a 交易員, I want 在戰情室盤中時段看到我的持倉即時損益, so that 我能快速掌握目前持倉的浮動盈虧，不需要另開 Google Sheets 查詢。

#### Acceptance Criteria

1. WHEN War_Room 頁面載入時，THE Position_Card SHALL 從 n8n webhook（`?type=positions`）讀取【自選監控】Sheet 中持有股數 > 0 的持倉清單
2. WHEN Position_Card 取得持倉清單後，THE Position_Card SHALL 呼叫 TWSE_MIS API 取得每支持倉股票的即時現價
3. WHEN Position_Card 取得即時現價後，THE Position_Card SHALL 計算每支持倉的浮動損益：`浮動損益 = (現價 - 平均成本) × 持有股數`
4. WHEN Position_Card 計算浮動損益後，THE Position_Card SHALL 計算報酬率：`報酬率 = (現價 - 平均成本) / 平均成本 × 100%`
5. WHEN Position_Card 顯示損益數據時，THE Position_Card SHALL 以紅色顯示正報酬（獲利），以綠色顯示負報酬（虧損），符合台股慣例
6. IF TWSE_MIS API 回應失敗或逾時，THEN THE Position_Card SHALL 顯示「報價暫時無法取得」提示，並保留上次成功取得的數據（若有）
7. WHILE 盤中時段（09:00–13:30，週一至週五），THE Position_Card SHALL 每 30 秒自動刷新即時報價
8. WHILE 非盤中時段，THE Position_Card SHALL 顯示前一交易日收盤價，並標示「非交易時段」
9. THE Position_Card SHALL 顯示每支持倉的：代號、名稱、持有股數、平均成本、現價、浮動損益（元）、報酬率（%）
10. THE Position_Card SHALL 在卡片底部顯示所有持倉的總浮動損益加總

---

### Requirement 3：狙擊候選狀態面板（Phase A）

**User Story:** As a 交易員, I want 在戰情室看到狙擊候選的即時觸發狀態, so that 我能在盤中快速判斷哪些標的已接近或突破觸發價，不需要等待 Telegram 通知。

#### Acceptance Criteria

1. WHEN War_Room 頁面載入時，THE Sniper_Panel SHALL 從 n8n webhook（`?type=snipers`）讀取【狙擊候選】Sheet 中狀態為「待觸發」的標的清單
2. WHEN Sniper_Panel 取得候選清單後，THE Sniper_Panel SHALL 呼叫 TWSE_MIS API 取得每支標的的即時現價
3. WHEN Sniper_Panel 計算距觸發距離時，THE Sniper_Panel SHALL 使用公式：`距觸發% = (觸發價 - 現價) / 現價 × 100`
4. WHEN 距觸發百分比小於 1% 時，THE Sniper_Panel SHALL 以警示色（橘色）標示該標的
5. WHEN 距觸發百分比小於 0% 時（已突破），THE Sniper_Panel SHALL 以觸發色（紅色）標示該標的
6. WHILE 盤中時段（09:00–13:30，週一至週五），THE Sniper_Panel SHALL 每 60 秒自動刷新即時報價
7. THE Sniper_Panel SHALL 顯示每支標的的：代號、名稱、觸發價、防守價、現價、距觸發%、狀態、來源（/watch 或 POST_MARKET_SCAN）
8. IF 狙擊候選清單為空，THEN THE Sniper_Panel SHALL 顯示「目前無待觸發標的」的空狀態提示

---

### Requirement 4：大盤指數即時顯示（Phase A）

**User Story:** As a 交易員, I want 在戰情室看到加權指數與 0050 的即時報價, so that 我能快速判斷大盤方向，作為個股操作的參考依據。

#### Acceptance Criteria

1. WHEN War_Room 頁面載入時，THE Index_Panel SHALL 呼叫 TWSE_MIS API 取得加權指數（代號 `t99`）與 0050（代號 `0050`）的即時報價
2. WHEN Index_Panel 取得報價後，THE Index_Panel SHALL 顯示：指數名稱、現值、漲跌點數、漲跌幅（%）
3. WHEN 漲跌幅為正時，THE Index_Panel SHALL 以紅色顯示；WHEN 漲跌幅為負時，THE Index_Panel SHALL 以綠色顯示，符合台股慣例
4. WHILE 盤中時段（09:00–13:30，週一至週五），THE Index_Panel SHALL 每 30 秒自動刷新報價
5. WHILE 非盤中時段，THE Index_Panel SHALL 顯示前一交易日收盤數據，並標示「非交易時段」
6. IF TWSE_MIS API 回應失敗，THEN THE Index_Panel SHALL 隱藏指數數值欄位並顯示「指數資料暫時無法取得」錯誤訊息，不得顯示空白或崩潰

---

### Requirement 5：P1/P2 輸出整合到戰情室（Phase A）

**User Story:** As a 交易員, I want 在戰情室看到止盈止損觸發紀錄與收盤選股結果, so that 我能在收盤後快速回顧當日的觸發事件與隔日候選標的，不需要查看 Telegram 歷史訊息。

#### Acceptance Criteria

1. WHEN War_Room 頁面載入時，THE War_Room SHALL 從 n8n webhook（`?type=p1_triggers`）讀取當日止盈止損觸發紀錄
2. WHEN War_Room 顯示止盈止損紀錄時，THE War_Room SHALL 顯示每筆紀錄的：代號、名稱、觸發類型（止盈/止損）、觸發價、觸發時間
3. WHEN War_Room 頁面載入時，THE War_Room SHALL 從 n8n webhook（`?type=snipers`）讀取來源為 `POST_MARKET_SCAN` 的收盤選股結果
4. WHEN War_Room 顯示收盤選股結果時，THE War_Room SHALL 顯示每筆結果的：代號、名稱、信心分數、觸發價、來源標記
5. WHEN 收盤選股結果為空時，THE War_Room SHALL 顯示「今日尚無收盤選股結果」的空狀態提示
6. WHEN 止盈止損紀錄為空時，THE War_Room SHALL 顯示「今日尚無觸發紀錄」的空狀態提示

---

### Requirement 6：三時段自適應佈局（Phase A）

**User Story:** As a 交易員, I want 戰情室根據當前時段自動調整顯示重點, so that 開盤前看到晨間報告、盤中看到即時數據、收盤後看到選股結果，不需要手動切換。

#### Acceptance Criteria

1. WHEN 當前時間為開盤前（09:00 前，週一至週五），THE War_Room SHALL 優先顯示：晨間報告摘要（Alpha 輸出）、今日關注族群、收盤選股結果（前一日 P2 輸出）
2. WHEN 當前時間為盤中（09:00–13:30，週一至週五），THE War_Room SHALL 優先顯示：Index_Panel（大盤指數）、Position_Card（持倉損益）、Sniper_Panel（狙擊候選）
3. WHEN 當前時間為收盤後（13:30 後，週一至週五），THE War_Room SHALL 優先顯示：P1_Output（止盈止損觸發紀錄）、P2_Output（今日收盤選股結果）、今日 AI 戰報
4. WHEN 當前時間為週末或非交易日，THE War_Room SHALL 顯示最近一個交易日的收盤後資訊
5. THE War_Room SHALL 在頁面頂部顯示當前時段標籤（「開盤前」、「盤中」、「收盤後」、「非交易日」）
6. THE War_Room SHALL 允許使用者手動切換時段檢視，不受自動時段限制

---

### Requirement 7：MOPS 重大訊息整合（Phase B）

**User Story:** As a 交易員, I want 在戰情室看到我持倉股票的重大公告, so that 我能即時掌握持倉公司的重要事件，避免因資訊不對稱造成損失。

#### Acceptance Criteria

1. WHEN War_Room 頁面載入時，THE War_Room SHALL 從 MOPS 公開 API 或 n8n 代理取得持倉股票的最新重大訊息公告
2. WHEN War_Room 顯示重大訊息時，THE War_Room SHALL 只顯示持倉股票（【自選監控】Sheet 中持有股數 > 0）的相關公告
3. WHEN War_Room 顯示重大訊息時，THE War_Room SHALL 顯示每則公告的：股票代號、公司名稱、公告標題、公告時間
4. WHEN 重大訊息公告超過 10 則時，THE War_Room SHALL 只顯示最新 10 則，並提供「查看更多」連結至 MOPS 原始頁面
5. IF MOPS API 無法存取，THEN THE War_Room SHALL 顯示「重大訊息暫時無法取得」，不得影響其他面板的正常顯示

---

### Requirement 8：月營收數據（Phase B）

**User Story:** As a 交易員, I want 在戰情室看到持倉股票的最新月營收數據, so that 我能評估基本面趨勢，輔助技術面判斷。

#### Acceptance Criteria

1. WHEN War_Room 頁面載入時，THE War_Room SHALL 從 TWSE_Opendata 取得持倉股票的最新月營收數據
2. WHEN War_Room 顯示月營收時，THE War_Room SHALL 顯示：當月營收（百萬元）、月增率（%）、年增率（%）
3. WHEN 年增率為正時，THE War_Room SHALL 以紅色顯示；WHEN 年增率為負時，THE War_Room SHALL 以綠色顯示，符合台股慣例
4. IF TWSE_Opendata API 無法存取，THEN THE War_Room SHALL 顯示「月營收資料暫時無法取得」，不得影響其他面板

---

### Requirement 9：三大法人即時買賣超面板（Phase B）

**User Story:** As a 交易員, I want 在戰情室看到三大法人的買賣超數據, so that 我能判斷主力資金流向，作為進出場的重要參考。

#### Acceptance Criteria

1. WHEN War_Room 頁面載入時，THE Institutional_Panel SHALL 從 TWSE_Opendata 取得當日三大法人（外資、投信、自營商）的整體買賣超數據
2. WHEN Institutional_Panel 顯示數據時，THE Institutional_Panel SHALL 顯示外資、投信、自營商各自的買超金額（億元）與賣超金額（億元）
3. WHEN 買超金額大於賣超金額時，THE Institutional_Panel SHALL 以紅色顯示淨買超；WHEN 賣超金額大於買超金額時，THE Institutional_Panel SHALL 以綠色顯示淨賣超
4. WHILE 盤中時段，THE Institutional_Panel SHALL 每 5 分鐘自動刷新數據
5. IF TWSE_Opendata API 無法存取，THEN THE Institutional_Panel SHALL 顯示「法人數據暫時無法取得」

---

### Requirement 10：融資融券餘額顯示（Phase B）

**User Story:** As a 交易員, I want 在戰情室看到持倉股票的融資融券餘額, so that 我能判斷籌碼結構，識別融資減少但股價上漲的乾淨籌碼標的。

#### Acceptance Criteria

1. WHEN War_Room 頁面載入時，THE Margin_Panel SHALL 從 TWSE_Opendata 取得持倉股票的融資融券餘額數據
2. WHEN Margin_Panel 顯示數據時，THE Margin_Panel SHALL 顯示每支持倉股票的：融資餘額（張）、融資增減（張）、融券餘額（張）、融券增減（張）
3. WHEN 融資餘額減少且股價上漲時，THE Margin_Panel SHALL 以特殊標記（⭐）標示該標的為「籌碼乾淨」
4. IF TWSE_Opendata API 無法存取，THEN THE Margin_Panel SHALL 顯示「融資融券資料暫時無法取得」

---

### Requirement 11：個股 K 線圖（Phase C）

**User Story:** As a 交易員, I want 在戰情室直接查看個股 K 線圖, so that 我能在不離開戰情室的情況下進行技術分析，提升操作效率。

#### Acceptance Criteria

1. WHEN 使用者點擊任何股票代號時，THE War_Room SHALL 開啟 TradingView_Chart 面板顯示該股票的 K 線圖
2. WHEN TradingView_Chart 面板開啟時，THE TradingView_Chart SHALL 使用 TradingView Lightweight Charts 免費版函式庫渲染 K 線圖
3. WHEN TradingView_Chart 顯示 K 線圖時，THE TradingView_Chart SHALL 預設顯示最近 3 個月的日線數據
4. THE TradingView_Chart SHALL 支援切換時間週期：1 週、1 個月、3 個月、6 個月
5. THE TradingView_Chart SHALL 在 K 線圖上疊加顯示：MA5、MA10、MA20、MA60 均線
6. WHEN TradingView_Chart 顯示持倉股票時，THE TradingView_Chart SHALL 在圖上標示目標價（綠色水平線）與停損價（紅色水平線）
7. IF K 線數據無法取得，THEN THE TradingView_Chart SHALL 顯示「K 線數據暫時無法取得」，不得崩潰

---

### Requirement 12：個人績效儀表板（Phase C）

**User Story:** As a 交易員, I want 在戰情室看到我的個人交易績效視覺化, so that 我能客觀評估自己的交易表現，持續改善策略。

#### Acceptance Criteria

1. WHEN War_Room 頁面載入時，THE Performance_Dashboard SHALL 從 n8n webhook（`?type=personal_performance`）讀取【自選監控】歷史紀錄的績效數據
2. WHEN Performance_Dashboard 顯示數據時，THE Performance_Dashboard SHALL 顯示：總交易次數、勝率（%）、平均報酬率（%）、最大回撤（%）
3. WHEN Performance_Dashboard 顯示已賣出持倉時，THE Performance_Dashboard SHALL 顯示每筆交易的：代號、名稱、買入成本、賣出價格、實際損益（元）、報酬率（%）
4. THE Performance_Dashboard SHALL 使用 Recharts 繪製累積報酬率折線圖，X 軸為日期，Y 軸為累積報酬率（%）
5. IF 績效數據為空，THEN THE Performance_Dashboard SHALL 顯示「尚無交易紀錄」的空狀態提示

---

### Requirement 13：自選監控管理介面（Phase C）

**User Story:** As a 交易員, I want 在 Dashboard 直接編輯持倉的目標價與停損價, so that 我不需要開啟 Google Sheets 就能更新監控參數，提升操作便利性。

#### Acceptance Criteria

1. WHEN 使用者在 Monitoring_Manager 中編輯目標價或停損價時，THE Monitoring_Manager SHALL 驗證輸入值為正數浮點數，非法輸入應顯示錯誤提示
2. WHEN 使用者確認儲存時，THE Monitoring_Manager SHALL 透過 n8n webhook（`POST /webhook/skynet-dashboard`，`type=update_monitoring`）將更新寫回【自選監控】Sheet
3. WHEN 寫入成功時，THE Monitoring_Manager SHALL 顯示「✅ 已更新」確認訊息，並在 3 秒後自動刷新持倉清單
4. IF 寫入失敗，THEN THE Monitoring_Manager SHALL 顯示「更新失敗，請稍後再試」錯誤訊息，並保留使用者輸入的數值
5. THE Monitoring_Manager SHALL 顯示每支持倉的：代號、名稱、持有股數、平均成本、目標價（可編輯）、停損價（可編輯）、類型（ETF/個股）
6. THE Monitoring_Manager SHALL 支援新增持倉：輸入代號、名稱、持有股數、平均成本後，透過 n8n webhook 寫入【自選監控】Sheet

---

### Requirement 14：Cloudflare Pages 靜態部署相容性

**User Story:** As a 開發者, I want 所有新功能都能在 Cloudflare Pages 靜態部署環境正常運作, so that 升級後的戰情室能持續部署到 `https://skynet-dashboard-cf.pages.dev`，不需要更換部署平台。

#### Acceptance Criteria

1. THE War_Room SHALL 所有 API routes 使用 `export const runtime = 'edge'`，不得使用 Node.js runtime
2. THE War_Room SHALL 所有外部 API 呼叫（TWSE_MIS、TWSE_Opendata、MOPS）透過 Next.js API routes 代理，不得在前端直接呼叫跨域 API
3. THE War_Room SHALL 不使用任何需要 Node.js Server Components runtime 的功能（如 `fs`、`path`、`crypto` 等 Node.js 內建模組）
4. WHEN 建置（`npm run build:cf`）時，THE War_Room SHALL 成功產生靜態匯出，不得有建置錯誤
5. THE War_Room SHALL 所有客戶端狀態管理使用 React hooks（`useState`、`useEffect`、`useCallback`），不得使用需要 SSR 的狀態管理方案

---

### Requirement 15：錯誤處理與降級策略

**User Story:** As a 交易員, I want 當任何數據來源失敗時戰情室仍能正常顯示其他資訊, so that 單一 API 故障不會導致整個戰情室無法使用。

#### Acceptance Criteria

1. WHEN 任何單一 API 呼叫失敗時，THE War_Room SHALL 只影響對應的面板，其他面板繼續正常顯示
2. WHEN API 呼叫失敗時，THE War_Room SHALL 在對應面板顯示具體的錯誤原因（如「n8n 服務無法連線」、「TWSE API 逾時」），不得顯示技術性錯誤訊息
3. WHEN API 呼叫逾時時，THE War_Room SHALL 在 10 秒後自動重試一次，重試失敗後顯示錯誤狀態
4. THE War_Room SHALL 在每個面板顯示最後成功更新的時間戳記
5. IF 所有 API 均失敗，THEN THE War_Room SHALL 顯示全域離線提示，並提供手動重試按鈕
