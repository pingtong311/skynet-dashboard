# SkyNet Fusion Data Core 2026-06-01

## 目標

建立第三套融合式資料核心，讓 `SkyNet 量價戰情中心` 不再依賴本機另開一套廖兄 FastAPI 後端。

新架構把廖兄系統拆成「量價演算法資產」與「資料欄位規格」，併入 SkyNet 自己的 API：

```text
n8n / Google Sheets / SkyNet 工作流
        +
內建廖兄 21點、差值、極大量、戰法候選核心
        ↓
/api/skynet/fusion
        ↓
SkyNet 量價戰情中心
```

## 目前已完成

- 新增 `src/lib/fusionCore.ts`
  - 內建台股核心觀察池。
  - 產生 21 點、差值、量比、成交金額、主力估算、停損線、極大量資料。
  - 融合 Omni 戰報、狙擊名單、持倉、內建 21 點候選。

- 新增 `src/app/api/skynet/fusion/route.ts`
  - 前台只需呼叫單一 API。
  - n8n 可用時載入戰報、持倉、狙擊。
  - n8n 某一支失敗時不讓整個頁面掛掉。
  - NovaCore 後端不再是必要依賴。

- 更新 `src/app/liangjia-warroom/page.tsx`
  - 改讀 `/api/skynet/fusion`。
  - 狀態顯示改為 `Fusion Core Online`。
  - 廖兄候選與極大值由 SkyNet 內建核心提供。

- 第二階段補強
  - 前台不再自行重算融合排序，改由 Fusion Core 輸出 `fusionStocks` 作為唯一排序真相。
  - Fusion Core 回傳 `sourceHealth`，包含 n8n 戰報、持倉、狙擊、內建21點、極大量核心的 rows 與 latency。
  - 融合候選新增 `signalTags`、`dataQuality`、`volumeRatio`、`changePct`、`chiefNet`，方便後續建立更嚴謹的勝率追蹤與回測欄位。
  - 前台新增 `Fusion Core 來源健康` 面板。

- 第三階段補強
  - `/api/skynet/fusion` 改為 Node runtime，支援本機與 Oracle 伺服器磁碟快取。
  - 成功生成的 Fusion payload 會寫入 `.skynet-cache/fusion-latest.json`。
  - 若 n8n 戰報、持倉、狙擊同時失敗且當下無資料，API 會回放最近一次成功快照，並將 `core.cache.mode` 標記為 `stale-replay`。
  - 前台新增 `快取狀態` 指標：`LIVE` 代表即時回應，秒數代表正在使用舊快照回放。
  - 本機可用 `?replayTest=1` 模擬 n8n 全斷，確認快取回放是否生效；正式環境需設定 `SKYNET_FUSION_REPLAY_TEST=1` 才允許測試。

- 第四階段補強
  - 新增 `.skynet-cache/fusion-candidate-state.json`，保存候選追蹤狀態。
  - 每檔融合候選新增 `tracking`：
    - `firstSeenAt`
    - `lastSeenAt`
    - `seenCount`
    - `observationCount`
    - `streakDays`
    - `scoreDelta`
    - `rankDelta`
    - `previousScore`
    - `previousRank`
    - `rank`
    - `phase`
    - `phaseLabel`
  - 前台候選矩陣新增「追蹤」欄位，決策資料卡新增「追蹤狀態」與「分數變化」。
  - 目的：修正每次分析都像第一次分析的問題，讓候選池能跨日與跨輪次累積狀態。
  - 候選階段分類：
    - `new`：新進雷達
    - `warming`：分數明顯升溫
    - `persistent`：連續追蹤且分數穩定
    - `cooling`：分數小幅降溫
    - `fading`：分數明顯轉弱
  - 同日盤中觀測採 10 分鐘節流，避免手動刷新把觀測輪次灌水；正式 15 分鐘輪詢會自然形成盤中序列。

- 第七階段補強
  - Fusion Core 新增單一標的即時報價 adapter。
  - 優先使用 `FUGLE_API_KEY` 查 Fugle；若未設定或失敗，使用 Yahoo chart API 備援。
  - 僅查目前輸入的 `ticker`，不掃全候選池，避免 Oracle 免費版負載增加。
  - 回應新增 `quote`，並在 `sourceHealth` 新增 `單一即時報價`。
  - 若報價成功，對應候選會加入 `即時報價` 來源、報價 signal tag，並提高 `dataQuality`。
  - 前台決策資料卡新增 `即時報價` 與 `報價來源`。

- 第八階段補強
  - Fusion Core 新增單一標的歷史 K 線 adapter。
  - 優先使用 Fugle historical candles，失敗時使用 Yahoo 6 個月日 K 備援。
  - 僅查目前輸入的 `ticker`，不掃全候選池。
  - 查詢標的若取到真實 K 線，會用真實資料重算：
    - MA21 差值
    - 21 點
    - 量比
    - 成交金額
    - 主力估算
    - 停損線
    - 30/60/120 日極大量
  - `sourceHealth` 新增 `單一歷史K線`。
  - 真實 K 線成功時，`內建21點核心` 會在來源健康顯示為 `真實K線21點`。

- 第九階段補強
  - Fusion Core 新增 SQLite 持久化資料庫：`.skynet-cache/fusion.db`。
  - 每次 `/api/skynet/fusion` 成功生成 payload 後，會寫入：
    - `fusion_snapshots`：完整快照與健康分數。
    - `fusion_candidates`：候選排行、分數、資料品質、追蹤階段。
    - `source_health`：各資料源 rows、latency、online/degraded 狀態。
    - `market_quotes`：單一標的即時報價。
    - `kline_metrics`：21 點、MA21 差值、量比、漲跌幅、主力估算、停損線。
  - API 回應新增 `core.database` 與 `Fusion SQLite` 來源健康狀態。
  - SQLite 寫入失敗時只會標記 `degraded`，不會阻斷戰情中心回應。
  - 目前採用系統 `sqlite3` CLI，避免新增 native npm dependency；Oracle 伺服器需安裝 `sqlite3`。
  - 寫入使用 WAL 與 5 秒 busy timeout，降低盤中輪詢與人工查詢同時發生時的短暫鎖定風險。
  - Cloudflare Pages 屬於較偏 stateless 的部署環境，正式長期歷史庫仍建議放在 Oracle persistent disk 或後續改 D1/Postgres。

- 第十階段補強
  - Fusion Core 會從 SQLite 讀回當日同一標的的盤中快照序列。
  - 回應新增 `intradaySeries`，目前針對使用者查詢中的單一 `ticker` 回傳最近盤中序列。
  - 每檔融合候選新增 `intradayTrend`：
    - `observations`：當日序列輪數。
    - `scoreSlope`：融合分數由第一輪到最新輪的推進幅度。
    - `rankSlope`：排行推進幅度，正值代表排名改善。
    - `ma21Slope`：MA21 差值推進幅度。
    - `volumeSlope`：量比推進幅度。
    - `latestScore` / `latestRank`：最新分數與排行。
  - 前台決策資料卡新增「盤中序列」面板，顯示分數、排行、MA21、量比推進，以及最近 5 輪快照。
  - 目的：把選股判斷從單次分析升級成盤中追蹤，避免每 15 分鐘都像第一次分析。

## 現階段定位

這是第一階段融合核心，不是最終交易模型。

目前內建 21 點核心用來解決「本機廖兄後端沒開，戰情中心就沒有資料」的架構問題；後續要把資料來源逐步替換為：

1. n8n 每日選股結果。
2. Fugle / 永豐 API 即時行情。
3. 歷史 K 線資料庫。
4. MOPS、籌碼、新聞與法人資料。
5. Omni 複核與狙擊狀態追蹤。

## 後續部署方向

Oracle 免費版階段：

- 保留單一 Next 服務作為 Web + Fusion API。
- 保留 n8n 作為排程、通知、工作流中心。
- 控制 API 計算量，不在開盤時大量掃 2000 檔即時 K 線。

Oracle 4 CPU 後：

- 將 Fusion Core 拆成資料擷取 Worker、資料庫、分析 API、前台 Web。
- 建立候選池歷史表，讓 15 分鐘後的分析延續前一次狀態，而不是每次都當第一次分析。
- 將永豐 API 作為即時行情補強，但不接自動下單。
