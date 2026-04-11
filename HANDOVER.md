# SKYNET 戰情室專案接手說明書 (Handover Guide)

> [!IMPORTANT]
> 本文件旨在確保專案在更換使用者或系統重啟後能無縫銜接。

## 1. 專案目標
打造「天網系統 (Skynet)」專屬網頁版總部，取代 XQ 贏家平台。透過 Next.js 前端與 n8n 後端 Webhook 結合，實現即時監控、策略參數動態調整及 AI 洞察呈現。

## 2. 當前環境資訊
- **專案路徑**: `/Users/sheng-feng/Antigravity-Rule/skynet/skynet-dashboard`
- **技術棧**: Next.js 14+, TailwindCSS, TypeScript, n8n (Backend)
- **本地預覽**: `http://localhost:3000`

## 3. 已完成工作 (Status)
- [x] **Phase 1: 基礎架構**: 已初始化 Next.js 專案並套用「深色玻璃擬物化 (Glassmorphism)」科技感介面。
- [x] **多頁面路由**: 建立 `Navigation` 組件，支援三個主要頁籤：
  - `Overview (/)`: 總覽面板與系統狀態。
  - `Strategy (/strategy)`: 策略控制台（價格門檻、策略選擇表單）。
  - `AI Insights (/ai)`: Flowise AI 報告展示區。
- [x] **樣式系統**: `globals.css` 已設定好天網專屬色彩代碼與微動畫。

## 4. 如何恢復開發 (Quick Start)
若系統重啟，請執行以下命令以啟動開發環境：
```bash
cd /Users/sheng-feng/Antigravity-Rule/skynet/skynet-dashboard
export DISABLE_AUTO_UPDATE="true"; source ~/.zshrc 2>/dev/null; npm run dev
```

## 5. 接下來要做的 (Next Steps)
1. **Webhook 串接 (Phase 2)**: 
   - 實作前端 `fetch` 調用 n8n Webhook。
   - 在 n8n 端建立接收節點，將網頁傳送的 `price` 或 `strategy` 變數帶入 `[天網-05]` 流程。
2. **資料實時化 (Phase 3)**:
   - 串接 Google Sheets API 或資料庫，將「標的監控矩陣」中的佔位符換成真實選股數據。
   - 引入 `Recharts` 進行視覺化圖表渲染。

## 6. 相關文件路徑
- **實作計畫**: `/.gemini/antigravity/brain/4d5518ca-12da-4ef8-82c1-6d26801b3630/implementation_plan.md`
- **任務清單**: `/.gemini/antigravity/brain/4d5518ca-12da-4ef8-82c1-6d26801b3630/task.md`
- **天網白皮書**: `/Users/sheng-feng/Antigravity-Rule/skynet/環境重啟與部署規範_白皮書.txt`
