'use client';

import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Activity,
  Bell,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Crosshair,
  Database,
  Grid3X3,
  LineChart,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import KLinePanel from '@/components/KLinePanel';

// ── 型別定義 ──────────────────────────────────────────
type BattleReport = {
  ticker: string;
  name: string;
  price: string;
  action: 'BUY' | 'WAIT' | 'SELL';
  confidence: number;
  target: string;
  stopLoss: string;
  strategyType: string;
  momentum: string;
  verdictTitle: string;
  todayView: string;
  reason: string;
  date: string;
  signalTime?: string;
  maAlignment?: string;
  bbUpper?: string;
  bbLower?: string;
  ma60?: string;
  targetBasis?: string;
  stopBasis?: string;
};

type SniperCandidate = {
  ticker: string;
  name: string;
  triggerPrice: string;
  stopPrice: string;
  currentPrice?: string;
  status: string;
  confidence: string;
  source: string;
  date: string;
};

type WarRoomData = {
  focusTags: string;
  avoidTags: string;
  bullScore: number;
  mentionedStocks: string[];
  summary: string;
  date: string;
};

type AnalysisResult = {
  ticker: string;
  name?: string;
  price?: string;
  action?: string;
  confidence?: number;
  target?: string;
  stopLoss?: string;
  strategyType?: string;
  momentum?: string;
  verdictTitle?: string;
  todayView?: string;
  reason?: string;
  message?: string;
  status?: string;
  error?: string;
};

// ── 側邊欄選單 ────────────────────────────────────────
const navItems = [
  { id: 'overview', label: '今日戰報', icon: Grid3X3 },
  { id: 'analyze', label: 'AI 查詢', icon: BrainCircuit },
  { id: 'sniper', label: '狙擊清單', icon: Crosshair },
  { id: 'warroom', label: '大盤情報', icon: Activity },
  { id: 'strategy', label: '策略設定', icon: ShieldCheck },
];

// ── 主頁面 ────────────────────────────────────────────
export default function ReviewPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [now, setNow] = useState('');
  const [lastRefresh, setLastRefresh] = useState('--:--:--');

  // 支援 URL 參數 ?tab=xxx 直接切換 Tab
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && navItems.some(n => n.id === tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  // 今日戰報
  const [reports, setReports] = useState<BattleReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // 狙擊清單
  const [snipers, setSnipers] = useState<SniperCandidate[]>([]);
  const [snipersLoading, setSnipersLoading] = useState(false);

  // 大盤情報
  const [warRoom, setWarRoom] = useState<WarRoomData | null>(null);
  const [warRoomLoading, setWarRoomLoading] = useState(false);

  // AI 查詢
  const [queryTicker, setQueryTicker] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<AnalysisResult | null>(null);
  const [queryHistory, setQueryHistory] = useState<AnalysisResult[]>([]);

  // K 線圖面板
  const [klineTicker, setKlineTicker] = useState<string | null>(null);

  // 時鐘
  useEffect(() => {
    const tick = () => {
      setNow(new Date().toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // 讀取今日戰報
  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await fetch('/api/skynet/warroom?type=battle_reports');
      const data = await res.json();
      if (data.reports) setReports(data.reports);
    } catch (e) {
      console.error('Failed to fetch reports', e);
    } finally {
      setReportsLoading(false);
      setLastRefresh(new Date().toLocaleTimeString('zh-TW', { hour12: false }));
    }
  }, []);

  // 讀取狙擊清單
  const fetchSnipers = useCallback(async () => {
    setSnipersLoading(true);
    try {
      const res = await fetch('/api/skynet/warroom?type=snipers');
      const data = await res.json();
      if (data.snipers) setSnipers(data.snipers);
    } catch (e) {
      console.error('Failed to fetch snipers', e);
    } finally {
      setSnipersLoading(false);
    }
  }, []);

  // 讀取大盤情報
  const fetchWarRoom = useCallback(async () => {
    setWarRoomLoading(true);
    try {
      const res = await fetch('/api/skynet/warroom?type=alpha');
      const data = await res.json();
      if (data.warRoom) setWarRoom(data.warRoom);
    } catch (e) {
      console.error('Failed to fetch war room', e);
    } finally {
      setWarRoomLoading(false);
    }
  }, []);

  // 切換 tab 時載入對應資料
  useEffect(() => {
    if (activeTab === 'overview') fetchReports();
    if (activeTab === 'sniper') fetchSnipers();
    if (activeTab === 'warroom') fetchWarRoom();
  }, [activeTab, fetchReports, fetchSnipers, fetchWarRoom]);

  // AI 查詢
  const handleAnalyze = async () => {
    const ticker = queryTicker.trim();
    if (!ticker || queryLoading) return;
    if (!/^\d{4,6}$/.test(ticker)) {
      setQueryResult({ ticker, error: '請輸入有效的台股代號（4-6位數字）' });
      return;
    }

    setQueryLoading(true);
    setQueryResult(null);

    try {
      const res = await fetch('/api/skynet/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      });
      const data = await res.json();
      const result: AnalysisResult = { ticker, ...data };
      setQueryResult(result);
      setQueryHistory(prev => [result, ...prev.slice(0, 4)]);
    } catch {
      setQueryResult({ ticker, error: '分析服務暫時無法連線，請稍後再試。' });
    } finally {
      setQueryLoading(false);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'overview') fetchReports();
    if (activeTab === 'sniper') fetchSnipers();
    if (activeTab === 'warroom') fetchWarRoom();
  };

  // K 線圖面板控制
  const openKLine = useCallback((ticker: string) => {
    if (!/^\d{4,6}$/.test(ticker)) return;
    setKlineTicker(ticker);
  }, []);

  const closeKLine = useCallback(() => {
    setKlineTicker(null);
  }, []);

  return (
    <main className="quant-shell">
      {/* ── 側邊欄 ── */}
      <aside className="quant-sidebar">
        <div className="brand-row">
          <div className="brand-mark"><Activity size={18} /></div>
          <div>
            <p className="brand-title">SKYNET</p>
            <p className="brand-sub">TAIPEI QUANT</p>
          </div>
        </div>

        <p className="sidebar-label">功能模組</p>
        <div className="side-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`side-link ${activeTab === item.id ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* 快速查詢歷史 */}
        {queryHistory.length > 0 && (
          <>
            <p className="sidebar-label" style={{ marginTop: '1.5rem' }}>最近查詢</p>
            <div className="side-nav">
              {queryHistory.map((h, i) => (
                <button
                  key={i}
                  onClick={() => { setQueryTicker(h.ticker); setActiveTab('analyze'); setQueryResult(h); }}
                  className="side-link"
                >
                  <Search size={14} />
                  <span>{h.ticker} {h.name || ''}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </aside>

      {/* ── 主區域 ── */}
      <section className="quant-main">
        {/* 頂部狀態列 */}
        <header className="quant-topbar">
          <div className="status-cluster">
            <span className="pill good"><CheckCircle2 size={15} /> API 已連接</span>
            <span className="pill good"><Activity size={15} /> 引擎運行中</span>
            <span className="pill muted"><Clock3 size={15} /> 台北 {now}</span>
          </div>
          <div className="operator-zone">
            <button className="icon-button" onClick={handleRefresh} aria-label="刷新">
              <RefreshCw size={17} />
            </button>
            <Bell size={17} className="text-slate-400" />
            <span className="operator">最後刷新 {lastRefresh}</span>
          </div>
        </header>

        {/* K 線圖面板 */}
        <AnimatePresence>
          {klineTicker && (
            <KLinePanel ticker={klineTicker} onClose={closeKLine} />
          )}
        </AnimatePresence>

        {/* ── 今日戰報 ── */}
        {activeTab === 'overview' && (          <div className="board-content">
            <div className="board-heading">
              <div className="heading-icon"><Grid3X3 size={24} /></div>
              <div>
                <h1>今日 AI 戰報</h1>
                <p>Omni 今日分析結果，含 4 位專家觀點與操作節奏。</p>
              </div>
            </div>

            {reportsLoading ? (
              <LoadingState text="載入今日戰報中..." />
            ) : reports.length === 0 ? (
              <EmptyState
                icon={<Database size={32} />}
                title="今日尚無戰報"
                desc="Beta 晨間選股完成後，Omni 分析結果會顯示在這裡。"
              />
            ) : (
              <div className="candidate-grid">
                {reports.map((r, i) => (
                  <BattleCard key={i} report={r} onAnalyze={(t) => { setQueryTicker(t); setActiveTab('analyze'); }} onKLine={openKLine} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── AI 查詢視窗 ── */}
        {activeTab === 'analyze' && (
          <div className="board-content">
            <div className="board-heading">
              <div className="heading-icon"><BrainCircuit size={24} /></div>
              <div>
                <h1>AI 深度查詢</h1>
                <p>輸入台股代號，天網 Omni 引擎即時分析，4 位專家觀點一次呈現。</p>
              </div>
            </div>

            {/* 查詢輸入 */}
            <div className="analyze-input-row">
              <div className="analyze-input-wrap">
                <Search size={18} className="analyze-icon" />
                <input
                  type="text"
                  value={queryTicker}
                  onChange={(e) => setQueryTicker(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  placeholder="輸入代號，例如 2330"
                  className="analyze-input"
                  maxLength={6}
                />
              </div>
              <button
                onClick={handleAnalyze}
                disabled={queryLoading || !queryTicker}
                className="analyze-btn"
              >
                {queryLoading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                {queryLoading ? '分析中...' : '立即分析'}
              </button>
            </div>

            {/* 快速標的 */}
            <div className="quick-tickers">
              {['2330', '2317', '2454', '2382', '3008', '2308'].map(t => (
                <button key={t} onClick={() => { setQueryTicker(t); }} className="quick-ticker-btn">
                  {t}
                </button>
              ))}
            </div>

            {/* 分析結果 */}
            {queryLoading && <LoadingState text={`正在呼叫天網 Omni 分析 ${queryTicker}...`} />}

            {queryResult && !queryLoading && (
              <AnalysisCard result={queryResult} />
            )}

            {!queryResult && !queryLoading && (
              <div className="analyze-placeholder">
                <BrainCircuit size={48} className="placeholder-icon" />
                <p>輸入台股代號，天網 AI 將整合技術指標與 4 位專家知識庫，產出完整戰報。</p>
                <p className="placeholder-sub">分析結果同步傳送至 Telegram，並記錄至互動查詢紀錄。</p>
              </div>
            )}
          </div>
        )}

        {/* ── 狙擊清單 ── */}
        {activeTab === 'sniper' && (
          <div className="board-content">
            <div className="board-heading">
              <div className="heading-icon"><Crosshair size={24} /></div>
              <div>
                <h1>狙擊候選清單</h1>
                <p>透過 /watch 加入的標的，天網-04 每 15 分鐘巡邏，突破時自動通知。</p>
              </div>
            </div>

            {snipersLoading ? (
              <LoadingState text="載入狙擊清單中..." />
            ) : snipers.length === 0 ? (
              <EmptyState
                icon={<Crosshair size={32} />}
                title="狙擊清單為空"
                desc={'在 Telegram 發送 /watch 2330 或 /watch 2330 600 加入標的。'}
              />
            ) : (
              <div className="sniper-table-wrap">
                <table className="sniper-table">
                  <thead>
                    <tr>
                      <th>代號</th>
                      <th>名稱</th>
                      <th>觸發價</th>
                      <th>防守價</th>
                      <th>現價</th>
                      <th>距觸發</th>
                      <th>狀態</th>
                      <th>來源</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snipers.map((s, i) => {
                      const current = parseFloat(s.currentPrice || '0');
                      const trigger = parseFloat(s.triggerPrice || '0');
                      const distPct = trigger > 0 && current > 0
                        ? (((trigger - current) / current) * 100).toFixed(1)
                        : '--';
                      const isTriggered = s.status === '已觸發';
                      const isRetreated = s.status === '已撤退';
                      return (
                        <tr key={i} className={isTriggered ? 'row-triggered' : isRetreated ? 'row-retreated' : ''}>
                          <td className="ticker-cell">
                            <button
                              onClick={() => openKLine(s.ticker)}
                              className="ticker-cell-btn"
                              title={`查看 ${s.ticker} K 線圖`}
                            >
                              {s.ticker}
                            </button>
                          </td>
                          <td>{s.name}</td>
                          <td className="price-cell">{s.triggerPrice || '--'}</td>
                          <td className="price-cell stop">{s.stopPrice || '--'}</td>
                          <td className="price-cell current">{s.currentPrice || '--'}</td>
                          <td className={`dist-cell ${parseFloat(distPct) < 1 ? 'near' : ''}`}>
                            {distPct !== '--' ? `${distPct}%` : '--'}
                          </td>
                          <td>
                            <span className={`status-badge ${isTriggered ? 'triggered' : isRetreated ? 'retreated' : 'waiting'}`}>
                              {s.status || '待觸發'}
                            </span>
                          </td>
                          <td className="source-cell">{s.source || '--'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── 大盤情報 ── */}
        {activeTab === 'warroom' && (
          <div className="board-content">
            <div className="board-heading">
              <div className="heading-icon"><Activity size={24} /></div>
              <div>
                <h1>大盤情報</h1>
                <p>Alpha 每日 06:00 情報收集結果，含市場情緒與今日關注族群。</p>
              </div>
            </div>

            {warRoomLoading ? (
              <LoadingState text="載入大盤情報中..." />
            ) : !warRoom ? (
              <EmptyState
                icon={<Activity size={32} />}
                title="今日情報尚未更新"
                desc="Alpha 工作流每日 06:00 自動執行，情報更新後顯示於此。"
              />
            ) : (
              <div className="warroom-grid">
                <div className="warroom-card bull-score">
                  <p className="wc-label">市場多空分數</p>
                  <div className="bull-bar-wrap">
                    <div className="bull-bar" style={{ width: `${warRoom.bullScore}%` }} />
                  </div>
                  <p className="bull-value">{warRoom.bullScore} / 100</p>
                </div>

                <div className="warroom-card">
                  <p className="wc-label">今日關注族群</p>
                  <div className="tag-cloud">
                    {(warRoom.focusTags || '').split(/[,，、]/).filter(Boolean).map((t, i) => (
                      <span key={i} className="focus-tag">{t.trim()}</span>
                    ))}
                  </div>
                </div>

                <div className="warroom-card">
                  <p className="wc-label">避開族群</p>
                  <div className="tag-cloud">
                    {(warRoom.avoidTags || '').split(/[,，、]/).filter(Boolean).map((t, i) => (
                      <span key={i} className="avoid-tag">{t.trim()}</span>
                    ))}
                  </div>
                </div>

                <div className="warroom-card mentioned">
                  <p className="wc-label">達人點名標的</p>
                  <div className="mentioned-list">
                    {(warRoom.mentionedStocks || []).map((s, i) => (
                      <button
                        key={i}
                        onClick={() => { setQueryTicker(s); setActiveTab('analyze'); }}
                        className="mentioned-ticker"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="warroom-card summary">
                  <p className="wc-label">今日市場摘要</p>
                  <p className="wc-text">{warRoom.summary}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 策略設定（嵌入 iframe 或連結） ── */}
        {activeTab === 'strategy' && (
          <div className="board-content">
            <div className="board-heading">
              <div className="heading-icon"><ShieldCheck size={24} /></div>
              <div>
                <h1>策略設定</h1>
                <p>調整選股門檻、分倉參數與風控條件，同步至天網雲端核心。</p>
              </div>
            </div>
            <div className="strategy-redirect">
              <Sparkles size={32} className="text-cyan" />
              <p>策略設定功能請前往獨立頁面操作</p>
              <a href="/strategy" className="strategy-link-btn">前往策略設定 →</a>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

// ── 子元件 ────────────────────────────────────────────

function LoadingState({ text }: { text: string }) {
  return (
    <div className="loading-state">
      <Loader2 size={28} className="animate-spin text-cyan" />
      <p>{text}</p>
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <p className="empty-title">{title}</p>
      <p className="empty-desc">{desc}</p>
    </div>
  );
}

function BattleCard({ report, onAnalyze, onKLine }: { report: BattleReport; onAnalyze: (t: string) => void; onKLine: (t: string) => void }) {
  const actionColor = report.action === 'BUY' ? 'buy' : report.action === 'SELL' ? 'sell' : 'wait';
  return (
    <article className="candidate-card">
      <div className="card-head">
        <div>
          <p className="stock-code">{report.ticker}</p>
          <h3>{report.name}</h3>
        </div>
        <span className={`action-badge ${actionColor}`}>{report.action}</span>
      </div>
      <div className="price-line">
        <span>現價</span>
        <strong>{report.price}</strong>
        <em>信心 {report.confidence}%</em>
      </div>
      <p className="verdict">{report.verdictTitle}</p>
      <div className="price-targets">
        <span>🎯 {report.target}{report.targetBasis ? ` (${report.targetBasis})` : ''}</span>
        <span>🛡 {report.stopLoss}{report.stopBasis ? ` (${report.stopBasis})` : ''}</span>
        <span>{report.strategyType}</span>
        {report.maAlignment && <span>📊 {report.maAlignment}</span>}
      </div>
      <p className="plan">{report.todayView?.substring(0, 80)}...</p>
      <div className="card-actions">
        <button onClick={() => onAnalyze(report.ticker)}>重新分析</button>
        <button onClick={() => onKLine(report.ticker)} className="kline-btn">查看 K 線</button>
        <span>{report.date}</span>
      </div>
    </article>
  );
}

function AnalysisCard({ result }: { result: AnalysisResult }) {
  if (result.error) {
    return (
      <div className="analysis-error">
        <AlertTriangle size={20} />
        <p>{result.error}</p>
      </div>
    );
  }

  if (result.status === 'processing' || result.message) {
    return (
      <div className="analysis-processing">
        <Loader2 size={20} className="animate-spin text-cyan" />
        <div>
          <p className="ap-title">{result.ticker} — 分析進行中</p>
          <p className="ap-desc">{result.message}</p>
          <p className="ap-hint">完整戰報已同步傳送至 Telegram，請查看 TG 回報。</p>
        </div>
      </div>
    );
  }

  const actionColor = result.action === 'BUY' ? 'buy' : result.action === 'SELL' ? 'sell' : 'wait';

  return (
    <div className="analysis-card">
      {/* 標頭 */}
      <div className="ac-header">
        <div>
          <span className="ac-ticker">{result.ticker}</span>
          <span className="ac-name">{result.name}</span>
        </div>
        <div className="ac-right">
          <span className={`action-badge large ${actionColor}`}>{result.action || 'WAIT'}</span>
          <span className="ac-price">NT$ {result.price}</span>
        </div>
      </div>

      {/* 核心數據 */}
      <div className="ac-metrics">
        <div className="ac-metric">
          <span>目標價</span>
          <strong className="buy-color">{result.target || '--'}</strong>
        </div>
        <div className="ac-metric">
          <span>防守價</span>
          <strong className="sell-color">{result.stopLoss || '--'}</strong>
        </div>
        <div className="ac-metric">
          <span>信心</span>
          <strong>{result.confidence || '--'}%</strong>
        </div>
        <div className="ac-metric">
          <span>動能</span>
          <strong>{result.momentum || '--'}</strong>
        </div>
        <div className="ac-metric">
          <span>策略</span>
          <strong>{result.strategyType || '--'}</strong>
        </div>
      </div>

      {/* 今日評定 */}
      {result.verdictTitle && (
        <div className="ac-verdict">
          <p className="ac-section-label">📌 今日評定</p>
          <p>{result.verdictTitle}</p>
        </div>
      )}

      {/* 今日表現 */}
      {result.todayView && (
        <div className="ac-section">
          <p className="ac-section-label">今日表現</p>
          <p className="ac-text">{result.todayView}</p>
        </div>
      )}

      {/* 專家分析 */}
      {result.reason && (
        <div className="ac-section expert">
          <p className="ac-section-label">🧠 專家分析</p>
          <p className="ac-text expert-text">{result.reason}</p>
        </div>
      )}

      <p className="ac-disclaimer">人工判斷執行，天網只提供訊號與風險節奏。</p>
    </div>
  );
}
