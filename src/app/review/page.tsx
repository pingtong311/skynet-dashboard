'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Activity,
  Building2,
  Bot,
  BrainCircuit,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  Clock3,
  Crosshair,
  Gauge,
  History,
  LineChart,
  Newspaper,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
  AlertTriangle,
  Loader2,
  LogOut,
  BarChart2,
  X,
  Settings,
} from 'lucide-react';
import KLinePanel from '@/components/KLinePanel';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useNotification } from '@/hooks/useNotification';
import IndexPanel, { type IndexQuote } from '@/components/warroom/IndexPanel';
import PositionCard, { type Position } from '@/components/warroom/PositionCard';
import SniperPanel, { type SniperItem } from '@/components/warroom/SniperPanel';
import P1TriggerPanel, { type P1Trigger } from '@/components/warroom/P1TriggerPanel';
import P2ScanPanel, { type P2Candidate } from '@/components/warroom/P2ScanPanel';
import TradingSessionLayout from '@/components/warroom/TradingSessionLayout';
import { getTradingDayStatus, getTradingSession, type TradingSession, type TradingDayStatus } from '@/lib/tradingSessionUtils';
import MOPSPanel, { type MOPSAnnouncement } from '@/components/warroom/MOPSPanel';
import MonthlyRevenuePanel, { type MonthlyRevenue } from '@/components/warroom/MonthlyRevenuePanel';
import InstitutionalPanel, { type InstitutionalData } from '@/components/warroom/InstitutionalPanel';
import MarginPanel, { type MarginData } from '@/components/warroom/MarginPanel';
import PerformanceDashboard, { type PerformanceSummary, type PersonalTrade } from '@/components/warroom/PerformanceDashboard';
import MonitoringManager, { type MonitoringEntry } from '@/components/warroom/MonitoringManager';
import FusionRadarPanel from '@/components/warroom/FusionRadarPanel';
import SignalReviewPanel, { type SignalReviewRow } from '@/components/warroom/SignalReviewPanel';
import { type NotificationDispatchResult } from '@/hooks/useNotification';

// ── 型別定義 ──────────────────────────────────────────

type ServiceStatus = 'ok' | 'error' | 'timeout' | 'loading' | 'unknown';

type HealthState = {
  n8n: ServiceStatus;
  sheets: ServiceStatus;
};

type DailyPerformance = {
  date: string;
  totalSignals: number;
  buySignals: number;
  triggered: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  avgReturn: number;
  bestTicker: string;
  bestReturn: number;
  worstTicker: string;
  worstReturn: number;
  summary: string;
  predictionCalibration?: PredictionCalibration;
};

type PredictionCalibration = {
  sampleSize: number;
  avgPredictedUpProbability: number;
  actualWinRate: number;
  calibrationGap: number;
  avgExpectedMovePct: number;
  avgActualReturn: number;
  overconfident: boolean;
  underconfident: boolean;
};

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

const SIGNAL_REVIEW_STORAGE_KEY = 'skynet_signal_review_history_v1';

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
  market?: MarketPreset;
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
  queriedAt?: string;
  analysisMeta?: {
    source: string;
    market?: MarketPreset;
    responseKind: 'json' | 'text';
    receivedAt: string;
    rawPreview?: string;
    rawBody?: string;
  };
};

type DecisionMode = 'BUY' | 'WATCH' | 'DEFEND';

type DecisionReport = {
  mode: DecisionMode;
  title: string;
  summary: string;
  highlights: string[];
  checkpoints: Array<{ label: string; value: string }>;
  playback: AnalysisResult[];
  generatedAt: string;
};

type TickerHistoryGroup = {
  ticker: string;
  name?: string;
  latest: AnalysisResult;
  versions: AnalysisResult[];
  count: number;
};

type VersionDiffRow = {
  label: string;
  current: string;
  previous: string;
  tone: 'positive' | 'negative' | 'neutral';
};

type VersionTimelineItem = {
  version: string;
  stamp: string;
  trend: string;
  tone: 'positive' | 'negative' | 'neutral';
};

type UpgradeBlueprintRow = {
  feature: string;
  repoSignal: string;
  currentState: string;
  upgradePath: string;
  status: 'ready' | 'borrow' | 'build';
};

type MarketPreset = 'TW' | 'HK' | 'US';

type ThemeMode = 'light' | 'dark' | 'auto';

type WorkspaceStage = {
  label: string;
  detail: string;
  tone: 'positive' | 'negative' | 'neutral';
};

type WorkspaceCoverage = {
  feature: string;
  state: string;
  detail: string;
  status: 'ready' | 'borrow' | 'build';
};

type PerformanceCycleReport = {
  title: string;
  summary: string;
  checkpoints: Array<{ label: string; value: string }>;
  bullets: string[];
  actionItems: string[];
  markdown: string;
};

type NotificationReceipt = NotificationDispatchResult & {
  id: string;
  ts: string;
  source: 'reports' | 'sniper';
  tag: string;
  detail?: string;
};

type StrategyChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  stamp: string;
  tone?: 'neutral' | 'buy' | 'sell' | 'watch';
};

function formatReviewStamp(input?: string) {
  if (!input) return '--';
  const date = new Date(input);
  return Number.isNaN(date.getTime())
    ? '--'
    : date.toLocaleString('zh-TW', { hour12: false });
}

function formatAnalysisValue(value: string | number | undefined) {
  if (value == null || value === '') return '--';
  return typeof value === 'number' ? String(value) : value;
}

function formatFreshnessLabel(iso?: string | null) {
  if (!iso) return '--';
  const stamp = new Date(iso);
  if (Number.isNaN(stamp.getTime())) return '--';
  const ageMs = Math.max(0, Date.now() - stamp.getTime());
  const ageMin = Math.floor(ageMs / 60_000);
  if (ageMin < 1) return '剛剛';
  if (ageMin < 60) return `${ageMin}m`;
  const ageHour = Math.floor(ageMin / 60);
  if (ageHour < 24) return `${ageHour}h`;
  return `${Math.floor(ageHour / 24)}d`;
}

type FreshnessState = 'live' | 'stale' | 'fallback';

function getFreshnessState(iso?: string | null): FreshnessState {
  if (!iso) return 'fallback';
  const stamp = new Date(iso);
  if (Number.isNaN(stamp.getTime())) return 'fallback';
  const ageMs = Math.max(0, Date.now() - stamp.getTime());
  if (ageMs <= 2 * 60_000) return 'live';
  if (ageMs <= 15 * 60_000) return 'stale';
  return 'fallback';
}

function getFreshnessStatusLabel(state: FreshnessState) {
  if (state === 'live') return '即時';
  if (state === 'stale') return '延遲';
  return '備援';
}

function getFreshnessPriority(state: FreshnessState) {
  if (state === 'live') return 0;
  if (state === 'stale') return 1;
  return 2;
}

function formatDataError(source: string, error?: string | null) {
  if (!error) return null;
  if (error === 'n8n_timeout') return `${source} 逾時`;
  if (error === 'network_error') return `${source} 網路異常`;
  if (error === 'fetch_error') return `${source} 回應格式異常`;
  if (error === 'upstream_error') return `${source} 上游異常`;
  return `${source} ${error}`;
}

function _isServiceHealthy(status: ServiceStatus) {
  return status === 'ok';
}

function toSafeNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toSafeString(value: unknown, fallback = '--') {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

function safeFixed(value: unknown, digits: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--';
}

function normalizeSignalDate(value: unknown) {
  const raw = toSafeString(value, new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' }));
  const match = raw.match(/\d{4}[/-]\d{1,2}[/-]\d{1,2}/);
  return (match?.[0] || raw.slice(0, 10)).replaceAll('/', '-');
}

function trimSignalReviewRows(rows: SignalReviewRow[]) {
  const dates = Array.from(new Set(rows.map((row) => row.date))).sort().reverse().slice(0, 5);
  const allowed = new Set(dates);
  return rows
    .filter((row) => allowed.has(row.date))
    .sort((a, b) => `${b.date}-${b.updatedAt}`.localeCompare(`${a.date}-${a.updatedAt}`));
}

function _normalizePerformanceSummary(input: unknown): PerformanceSummary | null {
  if (!input || typeof input !== 'object') return null;
  const data = input as Record<string, unknown>;
  const trades = Array.isArray(data.trades)
    ? data.trades.map((trade) => {
        const row = trade as Record<string, unknown>;
        return {
          ticker: toSafeString(row.ticker),
          name: toSafeString(row.name),
          buyCost: toSafeNumber(row.buyCost),
          sellPrice: row.sellPrice != null ? toSafeNumber(row.sellPrice) : null,
          pnl: row.pnl != null ? toSafeNumber(row.pnl) : null,
          returnRate: row.returnRate != null ? toSafeNumber(row.returnRate) : null,
          date: toSafeString(row.date, ''),
        };
      })
    : [];

  return {
    totalTrades: toSafeNumber(data.totalTrades),
    winRate: toSafeNumber(data.winRate),
    avgReturn: toSafeNumber(data.avgReturn),
    maxDrawdown: toSafeNumber(data.maxDrawdown),
    trades,
    cumulativeReturns: Array.isArray(data.cumulativeReturns)
      ? data.cumulativeReturns.map((point) => {
          const row = point as Record<string, unknown>;
          return {
            date: toSafeString(row.date, ''),
            value: toSafeNumber(row.value),
          };
        })
      : undefined,
    equityCurve: Array.isArray(data.equityCurve)
      ? data.equityCurve.map((point) => {
          const row = point as Record<string, unknown>;
          return {
            date: toSafeString(row.date, ''),
            cumReturn: toSafeNumber(row.cumReturn),
          };
        })
      : undefined,
  };
}

function normalizeDailyPerformance(input: unknown): DailyPerformance | null {
  if (!input || typeof input !== 'object') return null;
  const data = input as Record<string, unknown>;
  const rawCalibration = data.predictionCalibration && typeof data.predictionCalibration === 'object'
    ? data.predictionCalibration as Record<string, unknown>
    : null;
  return {
    date: String(data.date ?? data.Date ?? '--'),
    totalSignals: toSafeNumber(data.totalSignals ?? data.totalSignalsCount ?? data.total ?? 0),
    buySignals: toSafeNumber(data.buySignals ?? data.buy ?? 0),
    triggered: toSafeNumber(data.triggered ?? data.triggerCount ?? 0),
    winCount: toSafeNumber(data.winCount ?? data.wins ?? 0),
    lossCount: toSafeNumber(data.lossCount ?? data.losses ?? 0),
    winRate: toSafeNumber(data.winRate ?? data.winrate ?? 0),
    avgReturn: toSafeNumber(data.avgReturn ?? data.averageReturn ?? 0),
    bestTicker: String(data.bestTicker ?? data.best ?? '--'),
    bestReturn: toSafeNumber(data.bestReturn ?? 0),
    worstTicker: String(data.worstTicker ?? data.worst ?? '--'),
    worstReturn: toSafeNumber(data.worstReturn ?? 0),
    summary: String(data.summary ?? data.message ?? ''),
    predictionCalibration: rawCalibration
      ? {
          sampleSize: toSafeNumber(rawCalibration.sampleSize),
          avgPredictedUpProbability: toSafeNumber(rawCalibration.avgPredictedUpProbability),
          actualWinRate: toSafeNumber(rawCalibration.actualWinRate),
          calibrationGap: toSafeNumber(rawCalibration.calibrationGap),
          avgExpectedMovePct: toSafeNumber(rawCalibration.avgExpectedMovePct),
          avgActualReturn: toSafeNumber(rawCalibration.avgActualReturn),
          overconfident: rawCalibration.overconfident === true,
          underconfident: rawCalibration.underconfident === true,
        }
      : undefined,
  };
}

function detectMarketPreset(ticker: string): MarketPreset {
  if (/^[A-Z0-9.\-]{1,8}$/.test(ticker) && /[A-Z]/.test(ticker)) return 'US';
  if (/^\d{5}$/.test(ticker)) return 'HK';
  return 'TW';
}

function parseTickerBatch(input: string, market: MarketPreset) {
  const chunks = input
    .split(/[\s,，;；/|]+/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  const uniq = Array.from(new Set(chunks));

  return uniq.filter((ticker) => {
    if (market === 'TW') return /^\d{4,6}$/.test(ticker);
    if (market === 'HK') return /^\d{5}$/.test(ticker);
    return /^[A-Z0-9.\-]{1,8}$/.test(ticker);
  });
}

function buildWorkspaceStages(input: {
  reports: BattleReport[];
  snipers: SniperCandidate[];
  queryHistory: AnalysisResult[];
  performance: DailyPerformance | null;
}) {
  const { reports, snipers, queryHistory, performance } = input;

  const stages: WorkspaceStage[] = [
    {
      label: '即時脈搏',
      detail: `戰報 ${reports.length} · 狙擊 ${snipers.length} · 回放 ${queryHistory.length}`,
      tone: reports.length > 0 || snipers.length > 0 ? 'positive' : 'neutral',
    },
    {
      label: '候選雷達',
      detail: `${reports.length} 份戰報 · ${snipers.length} 筆狙擊 · ${queryHistory.length} 次查驗`,
      tone: reports.length > 0 || snipers.length > 0 ? 'positive' : 'neutral',
    },
    {
      label: '績效閉環',
      detail: performance ? `勝率 ${safeFixed(performance.winRate, 1)}% · 平均報酬 ${safeFixed(performance.avgReturn, 2)}%` : '等待收盤績效',
      tone: performance ? 'positive' : 'neutral',
    },
  ];

  return stages;
}

function buildWorkspaceCoverage(rows: WorkspaceCoverage[]): WorkspaceCoverage[] {
  return rows;
}

function _buildWorkspaceMarkdown(input: {
  report: DecisionReport;
  recentQueries: AnalysisResult[];
  positions: Position[];
  snipers: SniperCandidate[];
  performance: DailyPerformance | null;
  market: MarketPreset;
}) {
  const { report, recentQueries, positions, snipers, performance, market } = input;

  const lines: string[] = [
    `# SkyNet Review Workspace`,
    ``,
    `- 模式: ${market}`,
    `- 決策: ${report.mode} / ${report.title}`,
    `- 摘要: ${report.summary}`,
    ``,
    `## 決策重點`,
    ...report.highlights.map((item) => `- ${item}`),
    ``,
    `## 最近查驗`,
    ...recentQueries.slice(0, 5).map((item) => `- ${item.ticker} ${item.name || ''} ${item.action || 'QUERY'} ${item.confidence != null ? `${item.confidence}%` : ''}`.trim()),
    ``,
    `## 監控資產`,
    ...positions.slice(0, 5).map((item) => `- ${item.ticker} ${item.name || ''} / ${item.type || '個股'}`),
    ``,
    `## 狙擊節奏`,
    ...snipers.slice(0, 5).map((item) => `- ${item.ticker} ${item.name} / ${item.status}`),
  ];

  if (performance) {
    lines.push(
      ``,
      `## 收盤績效`,
      `- 勝率: ${safeFixed(performance.winRate, 1)}%`,
      `- 平均報酬: ${safeFixed(performance.avgReturn, 2)}%`,
      `- 最佳標的: ${performance.bestTicker} +${safeFixed(performance.bestReturn, 2)}%`,
    );
  }

  return lines.join('\n');
}

function buildPerformanceCycleReport(input: {
  performance: DailyPerformance | null;
  reports: BattleReport[];
  queryHistory: AnalysisResult[];
  snipers: SniperCandidate[];
  positions: Position[];
  market: MarketPreset;
}) {
  const { performance, reports, queryHistory, snipers, positions, market } = input;
  const resolvedPerformance = performance ?? null;
  const buyReports = reports.filter((item) => item.action === 'BUY');
  const sellReports = reports.filter((item) => item.action === 'SELL');
  const activeSnipers = snipers.filter((item) => item.status !== '已撤退');
  const topQuery = queryHistory[0] ?? null;

  const summary = resolvedPerformance
    ? `本輪 ${market} 週期已產生 ${resolvedPerformance.buySignals} 個 BUY 訊號，其中 ${resolvedPerformance.triggered} 個已觸發，勝率 ${safeFixed(resolvedPerformance.winRate, 1)}%，平均報酬 ${resolvedPerformance.avgReturn >= 0 ? '+' : ''}${safeFixed(resolvedPerformance.avgReturn, 2)}%。`
    : `目前還沒有收盤績效資料，先用查詢歷史與候選清單建立回放底稿。`;

  const checkpoints = [
    { label: 'BUY 訊號', value: `${buyReports.length} 筆` },
    { label: 'SELL 訊號', value: `${sellReports.length} 筆` },
    { label: '查詢版本', value: `${queryHistory.length} 版` },
    { label: '持倉 / 狙擊', value: `${positions.length} / ${activeSnipers.length}` },
  ];

  const bullets = [
    topQuery ? `最近查驗焦點：${topQuery.ticker} ${topQuery.action || 'QUERY'} ${topQuery.confidence != null ? `${topQuery.confidence}%` : ''}`.trim() : '最近查驗焦點：尚無查詢記錄',
    buyReports[0] ? `今日主線：${buyReports[0].ticker} ${buyReports[0].verdictTitle}` : '今日主線：等待戰報',
    activeSnipers[0] ? `風險追蹤：${activeSnipers[0].ticker} ${activeSnipers[0].status}` : '風險追蹤：尚無活躍狙擊',
    resolvedPerformance ? `最佳標的：${resolvedPerformance.bestTicker} +${safeFixed(resolvedPerformance.bestReturn, 2)}%` : '最佳標的：等待收盤績效',
  ];

  const actionItems = resolvedPerformance
    ? [
        '收盤後先檢查 BUY 觸發後的隔日表現，確認訊號是否過熱。',
        '把勝率、平均報酬與最大逆風當成下一輪策略篩選條件。',
        '持續追蹤已撤退與未觸發候選，避免把空轉名單誤判成有效訊號。',
      ]
    : [
        '先補收盤績效來源，讓週期報告有正式的結果欄位。',
        '把查詢歷史當作回放樣本，等待第一批完整績效資料。',
        '先建立「可回放、可重播、可對照」的閉環底稿。',
      ];

  const markdown = [
    `# SkyNet Performance Cycle`,
    ``,
    `- 市場: ${market}`,
    `- 狀態: ${resolvedPerformance ? '已結算' : '等待結算'}`,
    `- 摘要: ${summary}`,
    ``,
    `## 里程碑`,
    ...checkpoints.map((item) => `- ${item.label}: ${item.value}`),
    ``,
    `## 關鍵觀察`,
    ...bullets.map((item) => `- ${item}`),
    ``,
    `## 行動建議`,
    ...actionItems.map((item) => `- ${item}`),
  ].join('\n');

  return {
    title: resolvedPerformance ? `${resolvedPerformance.date} 週期報告` : '等待收盤的週期報告',
    summary,
    checkpoints,
    bullets,
    actionItems,
    markdown,
  } satisfies PerformanceCycleReport;
}

function buildVersionDiffRows(current: AnalysisResult, previous?: AnalysisResult | null): VersionDiffRow[] {
  if (!previous) {
    return [
      { label: '版本狀態', current: '首版', previous: '--', tone: 'neutral' },
    ];
  }

  const confidenceDelta =
    current.confidence != null && previous.confidence != null
      ? current.confidence - previous.confidence
      : null;

  const rows: Array<[string, string | number | undefined, string | number | undefined, VersionDiffRow['tone']]> = [
    ['動能', current.momentum, previous.momentum, current.momentum === previous.momentum ? 'neutral' : 'positive'],
    ['策略', current.strategyType, previous.strategyType, current.strategyType === previous.strategyType ? 'neutral' : 'positive'],
    ['信心', current.confidence != null ? `${current.confidence}%` : '--', previous.confidence != null ? `${previous.confidence}%` : '--', confidenceDelta == null ? 'neutral' : confidenceDelta >= 0 ? 'positive' : 'negative'],
    ['目標價', current.target, previous.target, current.target === previous.target ? 'neutral' : 'positive'],
    ['防守價', current.stopLoss, previous.stopLoss, current.stopLoss === previous.stopLoss ? 'neutral' : 'negative'],
    ['評定', current.verdictTitle, previous.verdictTitle, current.verdictTitle === previous.verdictTitle ? 'neutral' : 'positive'],
  ];

  return rows.map(([label, cur, prev, tone]) => ({
    label,
    current: formatAnalysisValue(cur),
    previous: formatAnalysisValue(prev),
    tone,
  }));
}

function summarizeVersionTrend(current: AnalysisResult, previous?: AnalysisResult | null) {
  if (!previous) {
    return { tone: 'neutral' as const, label: '首版' };
  }

  const delta =
    current.confidence != null && previous.confidence != null
      ? current.confidence - previous.confidence
      : null;

  if (delta == null) {
    return { tone: 'neutral' as const, label: '持平' };
  }

  if (delta > 0) {
    return { tone: 'positive' as const, label: `+${safeFixed(delta, 1)}%` };
  }

  if (delta < 0) {
    return { tone: 'negative' as const, label: `${safeFixed(delta, 1)}%` };
  }

  return { tone: 'neutral' as const, label: '持平' };
}

function buildVersionTimeline(history: AnalysisResult[]): VersionTimelineItem[] {
  return history.map((item, index) => {
    const previous = history[index + 1] ?? null;
    const trend = summarizeVersionTrend(item, previous);

    return {
      version: `v${history.length - index}`,
      stamp: formatReviewStamp(item.queriedAt || item.analysisMeta?.receivedAt),
      trend: trend.label,
      tone: trend.tone,
    };
  });
}

function groupAnalysisHistory(history: AnalysisResult[]): TickerHistoryGroup[] {
  const groups = new Map<string, TickerHistoryGroup>();

  for (const item of history) {
    if (!groups.has(item.ticker)) {
      groups.set(item.ticker, {
        ticker: item.ticker,
        name: item.name,
        latest: item,
        versions: [item],
        count: 1,
      });
      continue;
    }

    const group = groups.get(item.ticker)!;
    group.versions.push(item);
    group.count += 1;
    if (!group.name && item.name) {
      group.name = item.name;
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      versions: group.versions.slice(0, 5),
    }))
    .sort((a, b) => {
      const left = new Date(a.latest.queriedAt || 0).getTime();
      const right = new Date(b.latest.queriedAt || 0).getTime();
      return right - left;
    })
    .slice(0, 6);
}

function splitTags(value?: string | null): string[] {
  return String(value || '')
    .split(/[,，、｜|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildDecisionReport({
  health,
  tradingSession,
  reports,
  snipers,
  warRoom,
  performance,
  positions,
  queryHistory,
}: {
  health: HealthState;
  tradingSession: TradingSession;
  reports: BattleReport[];
  snipers: SniperCandidate[];
  warRoom: WarRoomData | null;
  performance: DailyPerformance | null;
  positions: Position[];
  queryHistory: AnalysisResult[];
}): DecisionReport {
  const buyReports = reports.filter((report) => report.action === 'BUY');
  const sellReports = reports.filter((report) => report.action === 'SELL');
  const leadingReport = buyReports[0] || reports[0] || null;
  const activeSnipers = snipers.filter((sniper) => sniper.status !== '已撤退');
  const focusStock = warRoom?.mentionedStocks?.[0] || leadingReport?.ticker || queryHistory[0]?.ticker || activeSnipers[0]?.ticker || '—';
  const healthReady = health.n8n === 'ok' && health.sheets === 'ok';
  const sessionLabel: Record<TradingSession, string> = {
    'pre-market': '開盤前',
    'trading': '盤中',
    'post-market': '收盤後',
    'weekend': '非交易日',
  };

  let mode: DecisionMode = 'WATCH';
  if (!healthReady || sellReports.length > buyReports.length + 1) {
    mode = 'DEFEND';
  } else if (buyReports.length > 0) {
    mode = 'BUY';
  }

  const performanceText = performance
    ? `勝率 ${safeFixed(performance.winRate, 1)}%，平均報酬 ${performance.avgReturn >= 0 ? '+' : ''}${safeFixed(performance.avgReturn, 2)}%`
    : '收盤後更新績效摘要';

  const highlights = [
    `${sessionLabel[tradingSession]} / 今日戰情更新`,
    warRoom?.focusTags ? `關注族群：${warRoom.focusTags}` : '關注族群：等待大盤情報更新',
    leadingReport ? `主線標的：${leadingReport.ticker} ${leadingReport.action}` : '主線標的：等待戰報',
    activeSnipers.length > 0 ? `待追蹤狙擊：${activeSnipers.length} 檔` : '待追蹤狙擊：目前空白',
    performanceText,
  ];

  const checkpoints = [
    { label: '戰報', value: `${reports.length} 筆` },
    { label: '查詢', value: `${queryHistory.length} 筆` },
    { label: '持倉', value: `${positions.length} 檔` },
    { label: '狙擊', value: `${snipers.length} 檔` },
  ];

  const headline =
    mode === 'BUY'
      ? `偏多節奏已出現，優先追蹤 ${focusStock}`
      : mode === 'DEFEND'
        ? '防守優先，先確認來源健康與風險訊號'
        : `中性觀察中，先鎖定 ${focusStock} 與回放版本差異`;

  const summary =
    leadingReport?.todayView ||
    warRoom?.summary ||
    '目前工作區尚未收到完整戰報，先以歷史回放與盤中監控為主。';

  return {
    mode,
    title: headline,
    summary,
    highlights,
    checkpoints,
    playback: queryHistory.slice(0, 5),
    generatedAt: '即時生成',
  };
}

function buildUpgradeBlueprint({
  reports,
  queryHistory,
  performance,
}: {
  reports: BattleReport[];
  queryHistory: AnalysisResult[];
  performance: DailyPerformance | null;
}): { headline: string; rows: UpgradeBlueprintRow[]; priorities: string[] } {
  const hasPerformance = Boolean(performance);
  const hasReplay = queryHistory.length > 0;
  const hasDecisionHistory = reports.length > 0;

  return {
    headline: hasPerformance
      ? '戰情中心已具備決策層，下一步是補齊回測、策略對話與投遞閉環。'
      : '戰情中心目前已有決策與回放底座，接下來最值得補的是回測、推送回執與版本治理。',
    rows: [
      {
        feature: '每日決策儀表盤',
        repoSignal: '決策總覽 / score / trend / entry-exit / risk alerts',
        currentState: '已具備今日戰報與決策報告',
        upgradePath: '把來源、信心變化、版本差異與模型回饋一起收進同一屏',
        status: 'ready',
      },
      {
        feature: '歷史回放與版本追蹤',
        repoSignal: 'history / full Markdown reports / local workspace',
        currentState: hasReplay ? '已可回放查詢歷史與單檔版本' : '仍需先累積查詢紀錄',
        upgradePath: '加入時間軸、對比指標、註記與一鍵導出，變成審核軌跡',
        status: hasReplay ? 'ready' : 'build',
      },
      {
        feature: '多市場資料層',
        repoSignal: 'A/H/US + ETF + 多資料源適配',
        currentState: '目前偏台股與內部戰情資料',
        upgradePath: '加市場切換與 adapter，讓同一介面可看台股、港股、美股',
        status: 'build',
      },
      {
        feature: 'Fusion Core / 廖兄融合',
        repoSignal: 'fusionCore / 廖兄 21 點 / 機構資金 / Omni decision',
        currentState: hasDecisionHistory ? '已接上融合雷達與完整工作台' : '尚未把融合引擎露出到主戰情中心',
        upgradePath: '把融合候選、來源健康、盤中序列與完整台卡接回主頁',
        status: hasDecisionHistory ? 'borrow' : 'build',
      },
      {
        feature: '自動推送與通知',
        repoSignal: 'Telegram / Discord / Slack / Email / WeChat Work / Feishu',
        currentState: '已有人機交互與通知許可提示',
        upgradePath: '補推送回執、失敗重試、閱讀確認與告警分級',
        status: 'borrow',
      },
      {
        feature: '回測與績效閉環',
        repoSignal: 'backtesting / portfolio / market review',
        currentState: hasPerformance ? '已有績效摘要與持倉視角' : '仍缺少完整績效閉環',
        upgradePath: '把日內、收盤、隔日表現串成可追溯的週期報告',
        status: hasPerformance ? 'ready' : 'build',
      },
      {
        feature: '策略聊天與快選',
        repoSignal: '15 built-in strategies / multi-turn Q&A',
        currentState: hasDecisionHistory ? '已有快速查詢與歷史回放' : '尚未形成策略對話層',
        upgradePath: '讓使用者可用策略模板追問：偏多、避險、突破、波段',
        status: hasDecisionHistory ? 'borrow' : 'build',
      },
    ],
    priorities: [
      '先補「推送回執」與「失敗重試」，讓通知不是只送出而是可驗證。',
      '把版本差異延伸成「模型來源 / 來源日期 / 風險變化」的審核軌跡。',
      '建立市場切換層，讓戰情中心從台股工作台升級成多市場觀測台。',
    ],
  };
}

function buildStrategyReply(
  prompt: string,
  context: {
    decision: DecisionReport;
    recentQueries: AnalysisResult[];
    market: MarketPreset;
    focusTicker: string;
  }
): { tone: 'neutral' | 'buy' | 'sell' | 'watch'; content: string } {
  const text = prompt.trim().toLowerCase();
  const topQuery = context.recentQueries[0];
  const topBuy = context.recentQueries.find((item) => item.action === 'BUY');
  const focus = topQuery?.ticker || context.focusTicker || '—';
  const marketLabel: Record<MarketPreset, string> = { TW: '台股', HK: '港股', US: '美股' };

  if (!text) {
    return {
      tone: 'neutral',
      content: `可以，我會以 ${marketLabel[context.market]} 的節奏來幫你追問。你可以直接問我「偏多、避險、突破、波段、今天該看誰」這幾種。`,
    };
  }

  if (text.includes('避險') || text.includes('防守') || text.includes('風險')) {
    return {
      tone: 'sell',
      content: `目前先以風控優先。${context.decision.summary}。若要保守操作，我會先盯防守價與已撤退/轉弱訊號，焦點是 ${focus}，避免追高。`,
    };
  }

  if (text.includes('突破') || text.includes('追價') || text.includes('進攻')) {
    const candidate = context.recentQueries.find((item) => (item.confidence ?? 0) >= 70) || topBuy || topQuery;
    return {
      tone: 'buy',
      content: `如果你要走突破路線，先看 ${candidate?.ticker || focus}。我會優先檢查信心、目標/防守是否同步，並要求成交量或盤中趨勢續強後再進場。`,
    };
  }

  if (text.includes('波段') || text.includes('中線') || text.includes('持有')) {
    return {
      tone: 'watch',
      content: `波段角度建議看版本穩定性與歷史回放。當前 ${context.decision.title}，我會偏向挑選版本差異小、信心維持或上升的標的，像 ${focus} 這類最近有訊號的名字。`,
    };
  }

  if (text.includes('誰') || text.includes('標的') || text.includes('焦點')) {
    return {
      tone: 'watch',
      content: `目前焦點可先看 ${focus}。最近回放裡最新一筆是 ${topQuery?.ticker || '—'}，如果你要我，我也可以把它直接帶去 AI 查詢頁做深入分析。`,
    };
  }

  return {
    tone: 'neutral',
    content: `我先用 ${marketLabel[context.market]} 的工作節奏讀你這個提問。${context.decision.summary}。你可以再補一句「偏多 / 避險 / 突破 / 波段 / 追蹤誰」，我會直接給你下一步。`,
  };
}

// ── Win 投資式主導覽：保留股票下拉，將右側功能改成 SkyNet 核心模組 ──
const navItems = [
  { id: 'realtime', label: '戰情中心', icon: Activity, desc: '總覽、戰報、雷達' },
  { id: 'warroom', label: '大盤情報', icon: Gauge, desc: 'Alpha / Fusion 情緒' },
  { id: 'analyze', label: '個股作戰室', icon: BrainCircuit, desc: 'AI 查詢與 K 線' },
  { id: 'sniper', label: '狙擊清單', icon: Crosshair, desc: '觸發與撤退' },
  { id: 'history', label: '戰報回放', icon: History, desc: '版本追蹤' },
  { id: 'performance', label: '績效閉環', icon: BarChart2, desc: '勝率與回測' },
];

const stockDropdownItems = [
  { label: '智能選股', tab: 'stock-smart', detail: '策略候選與高信心名單' },
  { label: '大盤', tab: 'stock-market', detail: '市場多空與指數節奏' },
  { label: '類股', tab: 'stock-sector', detail: '關注 / 避開族群' },
  { label: '個股', tab: 'analyze', detail: 'AI 深度查詢與 K 線' },
  { label: '除權息預告', tab: 'stock-dividend', detail: '除權息與事件提醒' },
  { label: '排行榜', tab: 'stock-ranking', detail: '戰報與候選排名' },
  { label: '市場新聞', tab: 'stock-news', detail: 'Alpha 新聞摘要' },
  { label: '股市行事曆', tab: 'stock-calendar', detail: '休市與重要日期' },
] satisfies Array<{ label: string; tab: string; detail: string }>;

const stockFeatureTabIds = stockDropdownItems.map((item) => item.tab);
const validTabIds = ['home', ...navItems.map((item) => item.id), ...stockFeatureTabIds];

const MARKET_PRESETS: Record<MarketPreset, {
  label: string;
  desc: string;
  placeholder: string;
  hint: string;
  quickTickers: string[];
}> = {
  TW: {
    label: '台股',
    desc: '台灣上市櫃分析，保留數字代號快速查詢。',
    placeholder: '輸入代號，例如 2330',
    hint: '支援 4-6 位數字代號，對應天網現有台股分析路徑。',
    quickTickers: ['2330', '2317', '2454', '2382', '3008', '2308'],
  },
  HK: {
    label: '港股',
    desc: '港股工作台，適合用 5 碼代號快速切換。',
    placeholder: '輸入代號，例如 00700',
    hint: '可先用港股常見數字碼進行查詢，後續可接 Longbridge / yfinance 類資料源。',
    quickTickers: ['00700', '00981', '09988', '01810', '03690', '02015'],
  },
  US: {
    label: '美股',
    desc: '美股分析入口，適合字母代號與大型科技股。',
    placeholder: '輸入代號，例如 AAPL',
    hint: '可輸入英文字母代號，後續可接 yfinance / 多市場資料層。',
    quickTickers: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META'],
  },
};

function SkyNetMarketHeader({
  activeTab,
  queryTicker,
  marketPreset,
  onNavigate,
  onQueryChange,
  onMarketChange,
  onSubmitSearch,
  onOpenSettings,
}: {
  activeTab: string;
  queryTicker: string;
  marketPreset: MarketPreset;
  onNavigate: (tab: string) => void;
  onQueryChange: (value: string) => void;
  onMarketChange: (market: MarketPreset) => void;
  onSubmitSearch: () => void;
  onOpenSettings: () => void;
}) {
  const [stockMenuOpen, setStockMenuOpen] = useState(false);
  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStockMenuOpen(false);
    onSubmitSearch();
  };

  const navigate = (tab: string) => {
    setStockMenuOpen(false);
    onNavigate(tab);
  };

  return (
    <header className="market-clone-header">
      <div className="market-brandbar">
        <button type="button" className="market-brand" onClick={() => navigate('home')} aria-label="回到首頁">
          <span className="market-brand-mark">
            <LineChart size={30} />
          </span>
          <span>
            <strong>SkyNet 投資</strong>
            <em>TAIPEI INTELLIGENCE DESK</em>
          </span>
        </button>

        <form className="market-search" onSubmit={submitSearch}>
          <select
            value={marketPreset}
            onChange={(event) => onMarketChange(event.target.value as MarketPreset)}
            aria-label="選擇市場"
          >
            <option value="TW">台股</option>
            <option value="HK">港股</option>
            <option value="US">美股</option>
          </select>
          <input
            value={queryTicker}
            onChange={(event) => onQueryChange(event.target.value.toUpperCase())}
            placeholder="輸入股票代碼 / 名稱 / 關鍵字"
          />
          <button type="submit" aria-label="搜尋股票">
            <Search size={20} />
          </button>
        </form>
      </div>

      <nav className="market-nav" aria-label="SkyNet 功能分類">
        <div className={`market-nav-dropdown ${stockMenuOpen ? 'open' : ''}`}>
          <button
            type="button"
            className={`market-nav-item ${activeTab === 'home' || stockFeatureTabIds.includes(activeTab) ? 'active' : ''}`}
            aria-expanded={stockMenuOpen}
            onClick={() => setStockMenuOpen((value) => !value)}
          >
            <Building2 size={19} />
            <span>股票</span>
            <ChevronDown size={16} />
          </button>
          <div className="market-dropdown-panel">
            {stockDropdownItems.map((item) => (
              <button key={item.label} type="button" onClick={() => navigate(item.tab)}>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`market-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
              title={item.desc}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          className="market-nav-item"
          onClick={() => {
            setStockMenuOpen(false);
            onOpenSettings();
          }}
          title="通知、主題與完成度"
        >
          <ShieldCheck size={19} />
          <span>系統監控</span>
        </button>

        <button type="button" className="market-nav-item market-nav-muted" onClick={() => navigate('stock-news')} title="市場新聞">
          <Newspaper size={19} />
          <span>新聞</span>
        </button>

        <button type="button" className="market-nav-item market-nav-muted" onClick={() => navigate('stock-calendar')} title="休市與市場事件">
          <CalendarDays size={19} />
          <span>行事曆</span>
        </button>
      </nav>
    </header>
  );
}

// ── 主頁面 ────────────────────────────────────────────
export default function ReviewPage() {
  const [activeTab, setActiveTab] = useState('home');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [now, setNow] = useState('');
  const [lastRefresh, setLastRefresh] = useState('--:--:--');
  const [marketPreset, setMarketPreset] = useState<MarketPreset>('TW');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [smartImportDraft, setSmartImportDraft] = useState('');
  const coreBootstrappedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem('skynet_review_theme_mode');
    if (raw === 'light' || raw === 'dark' || raw === 'auto') {
      setThemeMode(raw);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('skynet_review_theme_mode', themeMode);
    document.body.dataset.reviewTheme = themeMode;
    document.body.classList.toggle('review-theme-dark', themeMode === 'dark');
  }, [themeMode]);

  // 支援 URL 參數 ?tab=xxx 直接切換 Tab
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && validTabIds.includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  // API 健康狀態（#5）
  const [health, setHealth] = useState<HealthState>({ n8n: 'loading', sheets: 'loading' });
  const healthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/skynet/health', { cache: 'no-store' });
      if (!res.ok) {
        setHealth({ n8n: 'error', sheets: 'error' });
        return;
      }
      const data = await res.json();
      setHealth({ n8n: data.n8n ?? 'unknown', sheets: data.sheets ?? 'unknown' });
    } catch {
      setHealth({ n8n: 'error', sheets: 'error' });
    }
  }, []);

  // 啟動時 + 每 60 秒輪詢健康狀態
  useEffect(() => {
    const initialTimer = setTimeout(fetchHealth, 45_000);
    healthTimerRef.current = setInterval(fetchHealth, 120_000);
    return () => {
      clearTimeout(initialTimer);
      if (healthTimerRef.current) clearInterval(healthTimerRef.current);
    };
  }, [fetchHealth]);

  // ── 即時監控狀態 ─────────────────────────────────────
  const [tradingSession, setTradingSession] = useState<TradingSession>('pre-market');
  const [tradingDayStatus, setTradingDayStatus] = useState<TradingDayStatus>(() => getTradingDayStatus(new Date()));
  const [manualSession, setManualSession] = useState<TradingSession | null>(null);

  // 大盤指數
  const [indexQuotes, setIndexQuotes] = useState<IndexQuote[]>([]);
  const [indexLoading, setIndexLoading] = useState(false);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [indexLastUpdated, setIndexLastUpdated] = useState<string | null>(null);
  const [indexLastUpdatedIso, setIndexLastUpdatedIso] = useState<string | null>(null);

  // 持倉損益
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const [positionsLastUpdated, setPositionsLastUpdated] = useState<string | null>(null);
  const [positionsLastUpdatedIso, setPositionsLastUpdatedIso] = useState<string | null>(null);

  // P1 觸發紀錄
  const [p1Triggers, setP1Triggers] = useState<P1Trigger[]>([]);
  const [p1Loading, setP1Loading] = useState(false);
  const [p1Error, setP1Error] = useState<string | null>(null);

  // P2 收盤選股
  const [p2Candidates, setP2Candidates] = useState<P2Candidate[]>([]);
  const [p2Loading, setP2Loading] = useState(false);
  const [p2Error, setP2Error] = useState<string | null>(null);

  // 即時監控狙擊清單（獨立於 sniper tab）
  const [realtimeSnipers, setRealtimeSnipers] = useState<SniperItem[]>([]);
  const [realtimeSnipersLoading, setRealtimeSnipersLoading] = useState(false);
  const [realtimeSnipersError, setRealtimeSnipersError] = useState<string | null>(null);

  // 更新交易時段
  useEffect(() => {
    const updateSession = () => {
      const now = new Date();
      setTradingSession(getTradingSession(now));
      setTradingDayStatus(getTradingDayStatus(now));
    };
    updateSession();
    const t = setInterval(updateSession, 60_000);
    return () => clearInterval(t);
  }, []);

  // 抓取大盤指數
  const fetchIndexQuotes = useCallback(async () => {
    setIndexLoading(true);
    setIndexError(null);
    try {
      const res = await fetch('/api/skynet/twse?tickers=t99,0050', { cache: 'no-store' });
      const data = await res.json();
      if (data.items) {
        const session = getTradingSession(new Date());
        setIndexQuotes(data.items.map((item: { symbol: string; name: string; price: number; change: number; changePercent: number }) => ({
          symbol: String(item.symbol ?? ''),
          name: String(item.name ?? ''),
          price: toSafeNumber(item.price),
          change: toSafeNumber(item.change),
          changePercent: toSafeNumber(item.changePercent),
          isTrading: session === 'trading',
        })));
        setIndexLastUpdated(new Date().toLocaleTimeString('zh-TW', { hour12: false }));
        setIndexLastUpdatedIso(new Date().toISOString());
      } else {
        setIndexError(data.error || 'fetch_error');
      }
    } catch {
      setIndexError('network_error');
    } finally {
      setIndexLoading(false);
    }
  }, []);

  // 抓取持倉損益
  const fetchPositions = useCallback(async () => {
    setPositionsLoading(true);
    setPositionsError(null);
    try {
      const posRes = await fetch('/api/skynet/n8n-proxy?type=positions', { cache: 'no-store' });
      const posData = await posRes.json();

      if (Array.isArray(posData.positions)) {
        const positionRows = posData.positions as Position[];
        const tickers = Array.from(new Set(positionRows.map((p) => String(p.ticker ?? '').trim()).filter(Boolean)));
        const priceMap: Record<string, number> = {};

        try {
          const priceQuery = tickers.length > 0 ? tickers.slice(0, 40).join(',') : '00878,00919,2330,2646,00990';
          const priceRes = await fetch(`/api/skynet/twse?tickers=${encodeURIComponent(priceQuery)}`, { cache: 'no-store' });
          const priceData = await priceRes.json();

          if (Array.isArray(priceData.items)) {
            for (const item of priceData.items) {
              priceMap[item.symbol] = toSafeNumber(item.price);
            }
          }
        } catch (error) {
          console.warn('positions_price_partial_error', error);
        }

        setPositions(positionRows.map((p: Position) => ({
          ticker: String(p.ticker ?? ''),
          name: String(p.name ?? ''),
          shares: toSafeNumber(p.shares),
          avgCost: toSafeNumber(p.avgCost),
          currentPrice: priceMap[p.ticker] ?? null,
          pnl: p.pnl != null ? toSafeNumber(p.pnl) : null,
          returnRate: p.returnRate != null ? toSafeNumber(p.returnRate) : null,
          targetPrice: p.targetPrice != null ? toSafeNumber(p.targetPrice) : undefined,
          stopPrice: p.stopPrice != null ? toSafeNumber(p.stopPrice) : undefined,
          type: p.type === 'ETF' ? 'ETF' : '個股',
        })));
        setPositionsLastUpdated(new Date().toLocaleTimeString('zh-TW', { hour12: false }));
        setPositionsLastUpdatedIso(new Date().toISOString());
      } else {
        setPositionsError(posData.error || 'fetch_error');
      }
    } catch {
      setPositionsError('network_error');
    } finally {
      setPositionsLoading(false);
    }
  }, []);

  // 抓取 P1 觸發紀錄
  const fetchP1Triggers = useCallback(async () => {
    setP1Loading(true);
    setP1Error(null);
    try {
      const res = await fetch('/api/skynet/n8n-proxy?type=p1_triggers', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data.triggers)) {
        setP1Triggers(data.triggers);
      } else if (!res.ok || data.error) {
        setP1Error(data.error || 'fetch_error');
      } else {
        setP1Triggers([]);
      }
    } catch {
      setP1Triggers([]);
    } finally {
      setP1Loading(false);
    }
  }, []);

  // 抓取 P2 收盤選股：優先使用 Fusion BUY 戰報，snipers 僅作舊資料備援。
  const fetchP2Candidates = useCallback(async () => {
    setP2Loading(true);
    setP2Error(null);
    try {
      const fusionRes = await fetch('/api/skynet/fusion', { cache: 'no-store' });
      if (fusionRes.ok) {
        const fusionData = await fusionRes.json();
        const reportsFromFusion = Array.isArray(fusionData.reports) ? fusionData.reports : [];
        const p2FromReports = reportsFromFusion
          .filter((report: BattleReport) => report.action === 'BUY')
          .map((report: BattleReport) => ({
            ticker: report.ticker,
            name: report.name,
            confidence: Number(report.confidence || 0),
            triggerPrice: Number(report.price || report.target || 0),
            source: 'POST_MARKET_SCAN' as const,
          }));

        if (p2FromReports.length > 0) {
          setP2Candidates(p2FromReports);
          return;
        }
      }

      const res = await fetch('/api/skynet/n8n-proxy?type=snipers', { cache: 'no-store' });
      const data = await res.json();
      if (data.snipers) {
        const p2 = data.snipers
          .filter((s: { source?: string }) => s.source === 'POST_MARKET_SCAN')
          .map((s: { ticker: string; name: string; confidence?: string; triggerPrice?: string }) => ({
            ticker: s.ticker,
            name: s.name,
            confidence: parseFloat(s.confidence || '70'),
            triggerPrice: parseFloat(s.triggerPrice || '0'),
            source: 'POST_MARKET_SCAN' as const,
          }));
        setP2Candidates(p2);
      } else {
        setP2Error(data.error || 'fetch_error');
      }
    } catch {
      setP2Error('network_error');
    } finally {
      setP2Loading(false);
    }
  }, []);

  // 抓取即時監控狙擊清單
  const fetchRealtimeSnipers = useCallback(async () => {
    setRealtimeSnipersLoading(true);
    setRealtimeSnipersError(null);
    try {
      const res = await fetch('/api/skynet/n8n-proxy?type=snipers', { cache: 'no-store' });
      const data = await res.json();
      if (data.snipers) {
        setRealtimeSnipers(data.snipers.map((s: {
          ticker: string; name: string;
          triggerPrice?: string; stopPrice?: string;
          currentPrice?: string; status?: string;
          source?: string; date?: string;
        }) => ({
          ticker: s.ticker,
          name: s.name,
          triggerPrice: parseFloat(s.triggerPrice || '0'),
          stopPrice: parseFloat(s.stopPrice || '0'),
          currentPrice: s.currentPrice ? parseFloat(s.currentPrice) : null,
          distPct: null,
          status: (s.status || '待觸發') as '待觸發' | '已觸發' | '已撤退',
          source: s.source || '/watch',
          date: s.date || '',
        })));
      } else {
        setRealtimeSnipersError(data.error || 'fetch_error');
      }
    } catch {
      setRealtimeSnipersError('network_error');
    } finally {
      setRealtimeSnipersLoading(false);
    }
  }, []);

  // 切換到即時監控 Tab 時載入資料
  useEffect(() => {
    if (activeTab === 'realtime') {
      fetchIndexQuotes();
      fetchP1Triggers();
      fetchP2Candidates();
      fetchRealtimeSnipers();
    }
  }, [activeTab, fetchIndexQuotes, fetchP1Triggers, fetchP2Candidates, fetchRealtimeSnipers]);

  // 盤中自動輪詢（30 秒）
  useEffect(() => {
    if (activeTab !== 'realtime') return;
    const session = getTradingSession(new Date());
    if (session !== 'trading') return;
    const t = setInterval(() => {
      fetchIndexQuotes();
      fetchRealtimeSnipers();
    }, 30_000);
    return () => clearInterval(t);
  }, [activeTab, fetchIndexQuotes, fetchRealtimeSnipers]);

  // ── Phase B 狀態 ──────────────────────────────────────
  const [mopsAnnouncements, setMopsAnnouncements] = useState<MOPSAnnouncement[]>([]);
  const [mopsLoading, setMopsLoading] = useState(false);
  const [mopsError, setMopsError] = useState<string | null>(null);

  const [monthlyRevenues, setMonthlyRevenues] = useState<MonthlyRevenue[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueError, setRevenueError] = useState<string | null>(null);

  const [institutional, setInstitutional] = useState<InstitutionalData | null>(null);
  const [instLoading, setInstLoading] = useState(false);
  const [instError, setInstError] = useState<string | null>(null);
  const [instLastUpdated, setInstLastUpdated] = useState<string | null>(null);

  const [margins, setMargins] = useState<MarginData[]>([]);
  const [marginLoading, setMarginLoading] = useState(false);
  const [marginError, setMarginError] = useState<string | null>(null);

  // 持倉代號列表（供 Phase B API 使用）
  const positionTickers = positions.map(p => p.ticker).join(',');

  const fetchMOPS = useCallback(async (tickers: string) => {
    if (!tickers) return;
    setMopsLoading(true);
    setMopsError(null);
    try {
      const res = await fetch(`/api/skynet/mops?tickers=${tickers}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.announcements) {
        setMopsAnnouncements(data.announcements);
      } else {
        setMopsError(data.error || 'fetch_error');
      }
    } catch {
      setMopsError('network_error');
    } finally {
      setMopsLoading(false);
    }
  }, []);

  const fetchRevenue = useCallback(async (tickers: string) => {
    if (!tickers) return;
    setRevenueLoading(true);
    setRevenueError(null);
    try {
      const res = await fetch(`/api/skynet/opendata?type=revenue&tickers=${tickers}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.revenues) {
        // 標準化 TWSE opendata 欄位
        const mapped: MonthlyRevenue[] = data.revenues.map((r: Record<string, string>) => ({
          ticker: r['公司代號'] || r['Code'] || '',
          name: r['公司名稱'] || r['Name'] || '',
          revenue: parseFloat(r['當月營收'] || r['Revenue'] || '0') / 1000,
          momChange: parseFloat(r['上月比較增減(%)'] || r['MoM'] || '0'),
          yoyChange: parseFloat(r['去年同月增減(%)'] || r['YoY'] || '0'),
          period: r['出表日期'] || r['Date'] || '',
        }));
        setMonthlyRevenues(mapped);
      } else {
        setRevenueError(data.error || 'fetch_error');
      }
    } catch {
      setRevenueError('network_error');
    } finally {
      setRevenueLoading(false);
    }
  }, []);

  const fetchInstitutional = useCallback(async () => {
    setInstLoading(true);
    setInstError(null);
    try {
      const res = await fetch('/api/skynet/opendata?type=institutional', { cache: 'no-store' });
      const data = await res.json();
      if (data.institutional) {
        const raw = data.institutional;
        // 標準化三大法人欄位（TWSE opendata 格式）
        const parseNum = (v: string) => parseInt((v || '0').replace(/,/g, ''), 10) || 0;
        setInstitutional({
          foreign: {
            buy: parseNum(raw['外陸資買進股數(不含外資自營商)'] || raw['ForeignBuy'] || '0'),
            sell: parseNum(raw['外陸資賣出股數(不含外資自營商)'] || raw['ForeignSell'] || '0'),
            net: parseNum(raw['外陸資買賣超股數(不含外資自營商)'] || raw['ForeignNet'] || '0'),
          },
          trust: {
            buy: parseNum(raw['投信買進股數'] || raw['TrustBuy'] || '0'),
            sell: parseNum(raw['投信賣出股數'] || raw['TrustSell'] || '0'),
            net: parseNum(raw['投信買賣超股數'] || raw['TrustNet'] || '0'),
          },
          dealer: {
            buy: parseNum(raw['自營商買進股數(自行買賣)'] || raw['DealerBuy'] || '0'),
            sell: parseNum(raw['自營商賣出股數(自行買賣)'] || raw['DealerSell'] || '0'),
            net: parseNum(raw['自營商買賣超股數(自行買賣)'] || raw['DealerNet'] || '0'),
          },
          date: raw['日期'] || raw['Date'] || '',
        });
        setInstLastUpdated(new Date().toLocaleTimeString('zh-TW', { hour12: false }));
      } else {
        setInstError(data.error || 'fetch_error');
      }
    } catch {
      setInstError('network_error');
    } finally {
      setInstLoading(false);
    }
  }, []);

  const fetchMargin = useCallback(async (tickers: string) => {
    if (!tickers) return;
    setMarginLoading(true);
    setMarginError(null);
    try {
      const res = await fetch(`/api/skynet/opendata?type=margin&tickers=${tickers}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.margins) {
        const mapped: MarginData[] = data.margins.map((m: Record<string, string>) => {
          const marginBal = parseInt((m['融資餘額'] || '0').replace(/,/g, ''), 10) || 0;
          const marginChg = parseInt((m['融資增減'] || '0').replace(/,/g, ''), 10) || 0;
          const shortBal = parseInt((m['融券餘額'] || '0').replace(/,/g, ''), 10) || 0;
          const shortChg = parseInt((m['融券增減'] || '0').replace(/,/g, ''), 10) || 0;
          return {
            ticker: m['股票代號'] || m['Code'] || '',
            name: m['股票名稱'] || m['Name'] || '',
            marginBalance: marginBal,
            marginChange: marginChg,
            shortBalance: shortBal,
            shortChange: shortChg,
            isClean: marginChg < 0, // 融資減少視為籌碼乾淨（簡化判斷）
          };
        });
        setMargins(mapped);
      } else {
        setMarginError(data.error || 'fetch_error');
      }
    } catch {
      setMarginError('network_error');
    } finally {
      setMarginLoading(false);
    }
  }, []);

  // Phase B 資料在持倉載入後觸發
  useEffect(() => {
    if (activeTab === 'realtime' && positionTickers) {
      fetchMOPS(positionTickers);
      fetchRevenue(positionTickers);
      fetchMargin(positionTickers);
    }
    if (activeTab === 'realtime') {
      fetchInstitutional();
    }
  }, [activeTab, positionTickers, fetchMOPS, fetchRevenue, fetchMargin, fetchInstitutional]);

  // 盤中三大法人每 5 分鐘輪詢
  useEffect(() => {
    if (activeTab !== 'realtime') return;
    const session = getTradingSession(new Date());
    if (session !== 'trading') return;
    const t = setInterval(fetchInstitutional, 5 * 60_000);
    return () => clearInterval(t);
  }, [activeTab, fetchInstitutional]);

  // ── Phase C 狀態 ──────────────────────────────────────
  const [perfSummary, setPerfSummary] = useState<PerformanceSummary | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfError, setPerfError] = useState<string | null>(null);
  const [perfSummaryLastUpdated, setPerfSummaryLastUpdated] = useState<string | null>(null);

  const [monitoringEntries, setMonitoringEntries] = useState<MonitoringEntry[]>([]);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [monitoringError, setMonitoringError] = useState<string | null>(null);
  const [monitoringLastUpdated, setMonitoringLastUpdated] = useState<string | null>(null);

  // K 線圖目標價/停損價（從持倉或狙擊清單取得）
  const [klineTarget, setKlineTarget] = useState<number | undefined>(undefined);
  const [klineStopLoss, setKlineStopLoss] = useState<number | undefined>(undefined);

  const fetchPerformanceSummary = useCallback(async () => {
    setPerfLoading(true);
    setPerfError(null);
    try {
      const res = await fetch('/api/skynet/n8n-proxy?type=personal_performance', { cache: 'no-store' });
      const data = await res.json();
      if (data.summary) {
        const summary = data.summary as Record<string, unknown>;
        const rows = Array.isArray(data.rows) ? data.rows : [];
        setPerfSummary({
          totalTrades: toSafeNumber(summary.closedTrades ?? summary.totalSignals ?? rows.length),
          winRate: toSafeNumber(summary.winRate),
          avgReturn: toSafeNumber(summary.avgReturn),
          maxDrawdown: toSafeNumber(summary.maxDrawdown ?? 0),
          trades: rows.slice(0, 12).map((row: Record<string, unknown>) => ({
            ticker: toSafeString(row['代號'] ?? row.ticker, ''),
            name: toSafeString(row['名稱'] ?? row.name, ''),
            buyCost: toSafeNumber(row['平均成本'] ?? row.buyCost),
            sellPrice: null,
            pnl: null,
            returnRate: null,
            date: toSafeString(summary.date, ''),
          })).filter((row: PersonalTrade) => row.ticker),
        });
        setPerfSummaryLastUpdated(new Date().toISOString());
      } else if (data.error) {
        setPerfError(data.error);
      } else {
        setPerfSummary(null);
      }
    } catch {
      setPerfError('network_error');
    } finally {
      setPerfLoading(false);
    }
  }, []);

  const fetchMonitoringEntries = useCallback(async () => {
    setMonitoringLoading(true);
    setMonitoringError(null);
    try {
      const res = await fetch('/api/skynet/n8n-proxy?type=positions', { cache: 'no-store' });
      const data = await res.json();
      if (data.positions) {
        setMonitoringEntries(data.positions.map((p: MonitoringEntry) => ({
          ticker: String(p.ticker ?? ''),
          name: String(p.name ?? ''),
          shares: toSafeNumber(p.shares),
          avgCost: toSafeNumber(p.avgCost),
          targetPrice: p.targetPrice ?? null,
          stopPrice: p.stopPrice ?? null,
          type: p.type === 'ETF' ? 'ETF' : '個股',
        })));
        setMonitoringLastUpdated(new Date().toISOString());
      } else {
        setMonitoringError(data.error || 'fetch_error');
      }
    } catch {
      setMonitoringError('network_error');
    } finally {
      setMonitoringLoading(false);
    }
  }, []);

  // Phase C 資料載入
  useEffect(() => {
    if (activeTab === 'realtime') {
      fetchPerformanceSummary();
      fetchMonitoringEntries();
    }
  }, [activeTab, fetchPerformanceSummary, fetchMonitoringEntries]);

  // 每日績效（#10）
  const [performance, setPerformance] = useState<DailyPerformance | null>(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState<string | null>(null);
  const [performanceLastUpdated, setPerformanceLastUpdated] = useState<string | null>(null);

  const fetchPerformance = useCallback(async () => {
    setPerformanceLoading(true);
    setPerformanceError(null);
    try {
      const res = await fetch('/api/skynet/performance', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || data.error) {
        setPerformanceError(data.error || 'upstream_error');
      } else {
        const rawSummary = data.summary && typeof data.summary === 'object' ? data.summary : data;
        const summary = rawSummary as Record<string, unknown>;
        setPerformance(normalizeDailyPerformance({
          ...summary,
          buySignals: summary.buySignals ?? summary.totalSignals,
          triggered: summary.triggered ?? summary.activeTracking,
          winCount: summary.winCount ?? summary.wins,
          lossCount: summary.lossCount ?? summary.losses,
          bestTicker: summary.bestTicker ?? '--',
          worstTicker: summary.worstTicker ?? '--',
          summary: summary.summary ?? `來源：${summary.source || '候選追蹤'}；目前追蹤 ${summary.activeTracking ?? 0} 檔，已結算 ${summary.closedTrades ?? 0} 筆。`,
        }));
        setPerformanceLastUpdated(new Date().toISOString());
      }
    } catch {
      setPerformanceError('network_error');
    } finally {
      setPerformanceLoading(false);
    }
  }, []);

  // 今日戰報
  const [reports, setReports] = useState<BattleReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [reportsLastUpdated, setReportsLastUpdated] = useState<string | null>(null);
  const [signalReviews, setSignalReviews] = useState<SignalReviewRow[]>([]);
  const prevReportsCountRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(SIGNAL_REVIEW_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSignalReviews(trimSignalReviewRows(parsed as SignalReviewRow[]));
      }
    } catch {
      window.localStorage.removeItem(SIGNAL_REVIEW_STORAGE_KEY);
    }
  }, []);

  const recordSignalReviews = useCallback((incomingReports: BattleReport[]) => {
    if (typeof window === 'undefined' || incomingReports.length === 0) return;
    const nowIso = new Date().toISOString();

    setSignalReviews((previousRows) => {
      const byKey = new Map<string, SignalReviewRow>();
      for (const row of previousRows) byKey.set(row.key, row);

      for (const report of incomingReports) {
        if (!['BUY', 'SELL'].includes(report.action)) continue;
        const ticker = toSafeString(report.ticker, '').trim();
        if (!ticker) continue;
        const observedPrice = toSafeNumber(report.price);
        if (observedPrice <= 0) continue;

        const date = normalizeSignalDate(report.signalTime || report.date);
        const key = `${date}:${ticker}:${report.action}`;
        const existing = byKey.get(key);
        const targetPrice = toSafeNumber(report.target, 0) || null;
        const stopPrice = toSafeNumber(report.stopLoss, 0) || null;

        byKey.set(key, {
          key,
          date,
          ticker,
          name: toSafeString(report.name, ticker),
          action: report.action,
          entryPrice: existing?.entryPrice || observedPrice,
          targetPrice: targetPrice ?? existing?.targetPrice ?? null,
          stopPrice: stopPrice ?? existing?.stopPrice ?? null,
          latestPrice: observedPrice,
          maxPrice: Math.max(existing?.maxPrice ?? observedPrice, observedPrice),
          minPrice: Math.min(existing?.minPrice ?? observedPrice, observedPrice),
          confidence: toSafeNumber(report.confidence),
          observations: (existing?.observations ?? 0) + 1,
          updatedAt: nowIso,
        });
      }

      const nextRows = trimSignalReviewRows(Array.from(byKey.values()));
      window.localStorage.setItem(SIGNAL_REVIEW_STORAGE_KEY, JSON.stringify(nextRows));
      return nextRows;
    });
  }, []);

  // 訊號篩選（#7）
  type SignalFilter = 'ALL' | 'BUY' | 'SELL' | 'WAIT' | 'DROP' | 'ERROR';
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('ALL');

  // 狙擊清單
  const [snipers, setSnipers] = useState<SniperCandidate[]>([]);
  const [snipersLoading, setSnipersLoading] = useState(false);
  const [snipersError, setSnipersError] = useState<string | null>(null);
  const [snipersLastUpdated, setSnipersLastUpdated] = useState<string | null>(null);
  const prevSnipersRef = useRef<SniperCandidate[]>([]);

  // 大盤情報
  const [warRoom, setWarRoom] = useState<WarRoomData | null>(null);
  const [warRoomLoading, setWarRoomLoading] = useState(false);
  const [warRoomError, setWarRoomError] = useState<string | null>(null);
  const [warRoomLastUpdated, setWarRoomLastUpdated] = useState<string | null>(null);

  // AI 查詢
  const [queryTicker, setQueryTicker] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<AnalysisResult | null>(null);
  const [queryHistory, setQueryHistory] = useState<AnalysisResult[]>([]);
  const [rawViewerResult, setRawViewerResult] = useState<AnalysisResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<AnalysisResult | null>(null);
  const marketConfig = MARKET_PRESETS[marketPreset];
  const [notificationReceipts, setNotificationReceipts] = useState<NotificationReceipt[]>([]);
  const [strategyMessages, setStrategyMessages] = useState<StrategyChatMessage[]>(() => ([
    {
      id: 'strategy-welcome',
      role: 'assistant',
      content: '已進入策略對話模式。你可以直接問我偏多、避險、突破、波段，或把目前焦點帶入查驗。',
      stamp: '',
      tone: 'neutral',
    },
  ]));
  const [strategyDraft, setStrategyDraft] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('skynet_review_query_history');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setQueryHistory(parsed.slice(0, 8));
      }
    } catch {
      // Ignore storage corruption and keep live history only.
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('skynet_review_query_history', JSON.stringify(queryHistory.slice(0, 8)));
  }, [queryHistory]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('skynet_review_notification_receipts');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setNotificationReceipts(parsed.slice(0, 10));
      }
    } catch {
      // Ignore storage corruption and keep live receipts only.
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('skynet_review_notification_receipts', JSON.stringify(notificationReceipts.slice(0, 10)));
  }, [notificationReceipts]);

  // K 線圖面板
  const [klineTicker, setKlineTicker] = useState<string | null>(null);
  const [klineMarket, setKlineMarket] = useState<MarketPreset>('TW');

  // 新增狙擊表單
  const [watchTicker, setWatchTicker] = useState('');
  const [watchPrice, setWatchPrice] = useState('');
  const [watchLoading, setWatchLoading] = useState(false);
  const [watchMessage, setWatchMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // useNotification
  const { permission, requestPermission, notifySniper, notifyNewReports } = useNotification();
  const appendNotificationReceipt = useCallback((source: 'reports' | 'sniper', tag: string, result: NotificationDispatchResult) => {
    const receipt: NotificationReceipt = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: new Date().toISOString(),
      source,
      tag,
      ...result,
    };
    setNotificationReceipts((prev) => [receipt, ...prev].slice(0, 10));
    return receipt;
  }, []);
  const relayNotification = useCallback(async (payload: {
    source: 'reports' | 'sniper';
    tag: string;
    title: string;
    body: string;
    reason?: string;
  }) => {
    const title = payload.title;
    const body = payload.body;
    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'review_notification',
          source: payload.source,
          tag: payload.tag,
          title,
          body,
          reason: payload.reason || null,
          sentAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        return { ok: false, channel: 'relay' as const, title, body, reason: 'exception' as const };
      }

      return { ok: true, channel: 'relay' as const, title, body };
    } catch {
      return { ok: false, channel: 'relay' as const, title, body, reason: 'exception' as const };
    }
  }, []);
  const sendReportNotification = useCallback((count: number) => {
    const result = notifyNewReports(count);
    appendNotificationReceipt('reports', `戰報 +${count}`, result);
    if (!result.ok && (result.reason === 'unsupported' || result.reason === 'denied')) {
      void relayNotification({
        source: 'reports',
        tag: `戰報 +${count}`,
        title: result.title,
        body: result.body,
        reason: result.reason,
      }).then((relayResult) => {
        appendNotificationReceipt('reports', `戰報 +${count} (relay)`, relayResult);
      });
    }
    return result;
  }, [appendNotificationReceipt, notifyNewReports, relayNotification]);
  const sendSniperNotification = useCallback((ticker: string, name: string, triggerPrice: string) => {
    const result = notifySniper(ticker, name, triggerPrice);
    appendNotificationReceipt('sniper', `${ticker} ${name}`.trim(), result);
    if (!result.ok && (result.reason === 'unsupported' || result.reason === 'denied')) {
      void relayNotification({
        source: 'sniper',
        tag: `${ticker} ${name}`.trim(),
        title: result.title,
        body: result.body,
        reason: result.reason,
      }).then((relayResult) => {
        appendNotificationReceipt('sniper', `${ticker} ${name}`.trim() + ' (relay)', relayResult);
      });
    }
    return result;
  }, [appendNotificationReceipt, notifySniper, relayNotification]);
  const retryNotificationReceipt = useCallback(async (receipt: NotificationReceipt) => {
    const relayResult = await relayNotification({
      source: receipt.source,
      tag: receipt.tag,
      title: receipt.title,
      body: receipt.body,
      reason: receipt.reason,
    });
    appendNotificationReceipt(receipt.source, `${receipt.tag} (retry)`, relayResult);
  }, [appendNotificationReceipt, relayNotification]);

  // 首次載入時請求通知授權
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

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
    setReportsError(null);
    try {
      const res = await fetch('/api/skynet/fusion', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data.reports)) {
        const newReports: BattleReport[] = data.reports;
        if (Array.isArray(data.positions)) {
          setPositions(data.positions.map((p: Position) => ({
            ticker: String(p.ticker ?? ''),
            name: String(p.name ?? ''),
            shares: toSafeNumber(p.shares),
            avgCost: toSafeNumber(p.avgCost),
            currentPrice: p.currentPrice != null ? toSafeNumber(p.currentPrice) : null,
            pnl: p.pnl != null ? toSafeNumber(p.pnl) : null,
            returnRate: p.returnRate != null ? toSafeNumber(p.returnRate) : null,
            targetPrice: p.targetPrice != null ? toSafeNumber(p.targetPrice) : undefined,
            stopPrice: p.stopPrice != null ? toSafeNumber(p.stopPrice) : undefined,
            type: p.type === 'ETF' ? 'ETF' : '個股',
          })));
          setPositionsLastUpdated(new Date().toLocaleTimeString('zh-TW', { hour12: false }));
          setPositionsLastUpdatedIso(new Date().toISOString());
          setPositionsError(null);
        }
        if (Array.isArray(data.snipers)) {
          setSnipers(data.snipers);
          setSnipersLastUpdated(new Date().toISOString());
          setSnipersError(null);
          setRealtimeSnipersError(null);
        }
        const prevCount = prevReportsCountRef.current;
        const newCount = newReports.length;
        if (prevCount > 0 && newCount > prevCount) {
          sendReportNotification(newCount - prevCount);
        }
        prevReportsCountRef.current = newCount;
        setReports(newReports);
        recordSignalReviews(newReports);
        setReportsLastUpdated(new Date().toISOString());
        return;
      }

      const fallbackRes = await fetch('/api/skynet/n8n-proxy?type=battle_reports', { cache: 'no-store' });
      const fallbackData = await fallbackRes.json();
      if (Array.isArray(fallbackData.reports)) {
        const newReports: BattleReport[] = fallbackData.reports;
        const prevCount = prevReportsCountRef.current;
        const newCount = newReports.length;
        if (prevCount > 0 && newCount > prevCount) {
          sendReportNotification(newCount - prevCount);
        }
        prevReportsCountRef.current = newCount;
        setReports(newReports);
        recordSignalReviews(newReports);
        setReportsLastUpdated(new Date().toISOString());
      } else {
        setReportsError(fallbackData.error || data.error || 'fetch_error');
      }
    } catch (e) {
      console.error('Failed to fetch reports', e);
      setReportsError('network_error');
    } finally {
      setReportsLoading(false);
      setLastRefresh(new Date().toLocaleTimeString('zh-TW', { hour12: false }));
    }
  }, [recordSignalReviews, sendReportNotification]);

  // 讀取狙擊清單
  const fetchSnipers = useCallback(async () => {
    setSnipersLoading(true);
    setSnipersError(null);
    try {
      const res = await fetch('/api/skynet/n8n-proxy?type=snipers', { cache: 'no-store' });
      const data = await res.json();
      if (data.snipers) {
        const newSnipers: SniperCandidate[] = data.snipers;
        const prevSnipers = prevSnipersRef.current;
        // 比對狀態變化：待觸發 → 已觸發
        if (prevSnipers.length > 0) {
          for (const newSniper of newSnipers) {
            const prev = prevSnipers.find(p => p.ticker === newSniper.ticker);
            if (prev && prev.status !== '已觸發' && newSniper.status === '已觸發') {
              sendSniperNotification(newSniper.ticker, newSniper.name, newSniper.triggerPrice);
            }
          }
        }
        prevSnipersRef.current = newSnipers;
        setSnipers(newSnipers);
        setSnipersLastUpdated(new Date().toISOString());
      } else {
        setSnipersError(data.error || 'fetch_error');
      }
    } catch (e) {
      console.error('Failed to fetch snipers', e);
      setSnipersError('network_error');
    } finally {
      setSnipersLoading(false);
    }
  }, [sendSniperNotification]);

  // 讀取大盤情報
  const fetchWarRoom = useCallback(async () => {
    setWarRoomLoading(true);
    setWarRoomError(null);
    try {
      const [alphaResult, fusionResult] = await Promise.allSettled([
        fetch('/api/skynet/warroom?type=alpha', { cache: 'no-store' }).then((res) => res.json()),
        fetch('/api/skynet/fusion', { cache: 'no-store' }).then((res) => res.json()),
      ]);

      if (alphaResult.status === 'fulfilled' && alphaResult.value?.warRoom) {
        setWarRoom((prev) => ({
          ...(prev || {}),
          ...alphaResult.value.warRoom,
          summary: alphaResult.value.warRoom.summary || prev?.summary || '',
          focusTags: alphaResult.value.warRoom.focusTags || prev?.focusTags || '',
          avoidTags: alphaResult.value.warRoom.avoidTags || prev?.avoidTags || '',
          bullScore: alphaResult.value.warRoom.bullScore ?? prev?.bullScore ?? 50,
          mentionedStocks: (alphaResult.value.warRoom.mentionedStocks || prev?.mentionedStocks || []),
          date: alphaResult.value.warRoom.date || prev?.date || '',
        }));
        setWarRoomLastUpdated(new Date().toISOString());
      } else {
        setWarRoomError('alpha_fetch_error');
      }

      if (fusionResult.status === 'fulfilled' && Array.isArray(fusionResult.value?.reports)) {
        const newReports: BattleReport[] = fusionResult.value.reports;
        if (Array.isArray(fusionResult.value?.positions)) {
          setPositions(fusionResult.value.positions.map((p: Position) => ({
            ticker: String(p.ticker ?? ''),
            name: String(p.name ?? ''),
            shares: toSafeNumber(p.shares),
            avgCost: toSafeNumber(p.avgCost),
            currentPrice: p.currentPrice != null ? toSafeNumber(p.currentPrice) : null,
            pnl: p.pnl != null ? toSafeNumber(p.pnl) : null,
            returnRate: p.returnRate != null ? toSafeNumber(p.returnRate) : null,
            targetPrice: p.targetPrice != null ? toSafeNumber(p.targetPrice) : undefined,
            stopPrice: p.stopPrice != null ? toSafeNumber(p.stopPrice) : undefined,
            type: p.type === 'ETF' ? 'ETF' : '個股',
          })));
          setPositionsLastUpdated(new Date().toLocaleTimeString('zh-TW', { hour12: false }));
          setPositionsLastUpdatedIso(new Date().toISOString());
          setPositionsError(null);
        }
        if (Array.isArray(fusionResult.value?.snipers)) {
          setSnipers(fusionResult.value.snipers);
          setSnipersLastUpdated(new Date().toISOString());
          setSnipersError(null);
          setRealtimeSnipersError(null);
        }
        prevReportsCountRef.current = newReports.length;
        setReports(newReports);
        recordSignalReviews(newReports);
        setReportsLastUpdated(new Date().toISOString());
      }
    } catch (e) {
      console.error('Failed to fetch war room', e);
      setWarRoomError('network_error');
    } finally {
      setWarRoomLoading(false);
    }
  }, [recordSignalReviews]);

  // useAutoRefresh：今日戰報（5 分鐘）
  const {
    countdown: overviewCountdown,
    refresh: _overviewRefresh,
    isRefreshing: _overviewRefreshing,
  } = useAutoRefresh({
    intervalMs: 5 * 60 * 1000,
    onRefresh: fetchReports,
    enabled: activeTab === 'realtime',
  });

  // useAutoRefresh：狙擊清單（2 分鐘）
  const {
    countdown: sniperCountdown,
    refresh: sniperRefresh,
    isRefreshing: _sniperRefreshing,
  } = useAutoRefresh({
    intervalMs: 2 * 60 * 1000,
    onRefresh: fetchSnipers,
    enabled: activeTab === 'realtime',
  });

  // 切換 tab 時載入對應資料
  useEffect(() => {
    if (activeTab === 'realtime') {
      void (async () => {
        await Promise.allSettled([
          fetchIndexQuotes(),
          fetchReports(),
          fetchSnipers(),
        ]);
        await new Promise((resolve) => setTimeout(resolve, 8000));
        await Promise.allSettled([
          fetchWarRoom(),
          fetchPerformance(),
        ]);
        await new Promise((resolve) => setTimeout(resolve, 8000));
        await Promise.allSettled([
          fetchP1Triggers(),
          fetchP2Candidates(),
        ]);
        await Promise.allSettled([
          fetchInstitutional(),
          fetchMOPS(positionTickers),
          fetchRevenue(positionTickers),
          fetchMargin(positionTickers),
          fetchPerformanceSummary(),
          fetchMonitoringEntries(),
        ]);
      })();
    }
    if (activeTab === 'sniper' || activeTab === 'stock-smart' || activeTab === 'stock-ranking') fetchSnipers();
    if (['warroom', 'stock-smart', 'stock-market', 'stock-sector', 'stock-ranking', 'stock-news', 'stock-calendar'].includes(activeTab)) {
      fetchWarRoom();
      fetchReports();
      fetchP2Candidates();
      fetchPerformance();
    }
    if (activeTab === 'performance') {
      fetchPerformance();
      fetchPerformanceSummary();
    }
  }, [
    activeTab,
    fetchReports,
    fetchSnipers,
    fetchWarRoom,
    fetchPerformance,
    fetchIndexQuotes,
    fetchPositions,
    fetchP1Triggers,
    fetchP2Candidates,
    fetchInstitutional,
    fetchMOPS,
    fetchRevenue,
    fetchMargin,
    fetchPerformanceSummary,
    fetchMonitoringEntries,
    positionTickers,
  ]);

  // 首次載入先補核心資料，避免刷新後摘要短暫停在 0。
  useEffect(() => {
    if (coreBootstrappedRef.current) return;
    coreBootstrappedRef.current = true;
    if (activeTab === 'realtime') return;
    void Promise.allSettled([
      fetchReports(),
      fetchSnipers(),
      fetchWarRoom(),
      fetchPerformance(),
      fetchIndexQuotes(),
      fetchP1Triggers(),
      fetchP2Candidates(),
      fetchPerformanceSummary(),
      fetchMonitoringEntries(),
    ]);
  }, [
    fetchReports,
    fetchSnipers,
    fetchWarRoom,
    fetchPerformance,
    fetchIndexQuotes,
    fetchPositions,
    fetchP1Triggers,
    fetchP2Candidates,
    fetchPerformanceSummary,
    fetchMonitoringEntries,
    activeTab,
  ]);

  // AI 查詢
  const handleAnalyze = async () => {
    const ticker = queryTicker.trim();
    if (!ticker || queryLoading) return;
    if (marketPreset === 'TW' && !/^\d{4,6}$/.test(ticker)) {
      setQueryResult({ ticker, error: '請輸入有效的台股代號（4-6位數字）' });
      return;
    }
    if (marketPreset === 'HK' && !/^\d{5}$/.test(ticker)) {
      setQueryResult({ ticker, error: '請輸入有效的港股代號（5位數字）' });
      return;
    }
    if (marketPreset === 'US' && !/^[A-Z0-9.\-]{1,8}$/.test(ticker.toUpperCase())) {
      setQueryResult({ ticker, error: '請輸入有效的美股代號（英文字母或混合代號）' });
      return;
    }

    setQueryLoading(true);
    setQueryResult(null);

    try {
      const res = await fetch('/api/skynet/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, market: marketPreset }),
      });
      const data = await res.json();
      const previousResult = queryHistory[0] ?? null;
      const result: AnalysisResult = { ticker, market: marketPreset, queriedAt: new Date().toISOString(), ...data };
      setQueryResult(result);
      setQueryHistory(prev => [result, ...prev.slice(0, 7)]);
      setComparisonResult(previousResult);
    } catch {
      setQueryResult({ ticker, error: '分析服務暫時無法連線，請稍後再試。' });
    } finally {
      setQueryLoading(false);
    }
  };

  // 手動刷新（呼叫 refresh() 重置計時器）
  const handleRefresh = async () => {
    setLastRefresh('刷新中...');
    await Promise.allSettled([
      fetchWarRoom(),
      fetchReports(),
      fetchSnipers(),
      fetchPerformance(),
      fetchIndexQuotes(),
      fetchPositions(),
      fetchP1Triggers(),
      fetchP2Candidates(),
      fetchPerformanceSummary(),
      fetchMonitoringEntries(),
    ]);

    if (activeTab === 'realtime') {
      await Promise.allSettled([
        fetchInstitutional(),
        fetchMOPS(positionTickers),
        fetchRevenue(positionTickers),
        fetchMargin(positionTickers),
      ]);
    }
    if (activeTab === 'sniper') sniperRefresh();
    setLastRefresh(new Date().toLocaleTimeString('zh-TW', { hour12: false }));
  };

  // 新增狙擊提交
  const handleAddWatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const ticker = watchTicker.trim();
    if (!ticker || watchLoading) return;
    if (!/^\d{4,6}$/.test(ticker)) {
      setWatchMessage({ type: 'error', text: '股票代號格式錯誤，請輸入 4-6 位數字' });
      return;
    }
    const priceStr = watchPrice.trim();
    let triggerPrice: number | undefined;
    if (priceStr !== '') {
      const parsed = parseFloat(priceStr);
      if (isNaN(parsed) || parsed <= 0) {
        setWatchMessage({ type: 'error', text: '觸發價必須為正數' });
        return;
      }
      triggerPrice = parsed;
    }

    setWatchLoading(true);
    setWatchMessage(null);
    try {
      const res = await fetch('/api/skynet/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, triggerPrice, source: 'Dashboard' }),
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        setWatchMessage({ type: 'success', text: `✅ ${ticker} 已加入狙擊清單` });
        setWatchTicker('');
        setWatchPrice('');
        // 3 秒後自動刷新狙擊清單
        setTimeout(() => {
          fetchSnipers();
          setWatchMessage(null);
        }, 3000);
      } else {
        const errMap: Record<string, string> = {
          invalid_ticker: '股票代號格式錯誤',
          invalid_trigger_price: '觸發價格式錯誤',
          upstream_error: '資料服務暫時無法連線',
          watch_timeout: '請求逾時，請稍後再試',
        };
        setWatchMessage({ type: 'error', text: errMap[data.error] || data.error || '新增失敗，請稍後再試' });
      }
    } catch {
      setWatchMessage({ type: 'error', text: '網路錯誤，請稍後再試' });
    } finally {
      setWatchLoading(false);
    }
  };

  // 撤退狙擊
  const handleRetreat = async (ticker: string) => {
    try {
      const res = await fetch('/api/skynet/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, triggerPrice: 0, source: 'Dashboard_Retreat' }),
      });
      if (res.ok) {
        // 立即在前端標記為已撤退
        setSnipers(prev =>
          prev.map(s => s.ticker === ticker ? { ...s, status: '已撤退' } : s)
        );
        // 3 秒後刷新清單
        setTimeout(() => fetchSnipers(), 3000);
      }
    } catch (e) {
      console.error('Failed to retreat sniper', e);
    }
  };

  // K 線圖面板控制
  const openKLine = useCallback((ticker: string) => {
    const marketTicker = ticker.trim().toUpperCase();
    if (marketPreset === 'TW' && !/^\d{4,6}$/.test(marketTicker)) return;
    if (marketPreset === 'HK' && !/^\d{5}$/.test(marketTicker)) return;
    if (marketPreset === 'US' && !/^[A-Z0-9.\-]{1,8}$/.test(marketTicker)) return;
    setKlineMarket(marketPreset);
    setKlineTicker(ticker);
  }, [marketPreset]);

  // 點擊代號時帶入目標價/停損價（必須在 openKLine 之後宣告）
  const openKLineWithPrices = useCallback((ticker: string) => {
    const pos = positions.find(p => p.ticker === ticker);
    setKlineTarget(pos?.targetPrice ?? undefined);
    setKlineStopLoss(pos?.stopPrice ?? undefined);
    openKLine(ticker);
  }, [positions, openKLine]);

  const closeKLine = useCallback(() => {
    setKlineTicker(null);
  }, []);

  const recentQueries = queryHistory.slice(0, 5);
  const analysisGroups = groupAnalysisHistory(queryHistory);
  const currentTickerHistory = queryResult ? queryHistory.filter((item) => item.ticker === queryResult.ticker) : [];
  const decisionReport = buildDecisionReport({
    health,
    tradingSession,
    reports,
    snipers,
    warRoom,
    performance,
    positions,
    queryHistory,
  });
  const strategyFocusTicker = queryResult?.ticker || recentQueries[0]?.ticker || decisionReport.playback[0]?.ticker || '—';
  const _upgradeBlueprint = buildUpgradeBlueprint({
    reports,
    queryHistory,
    performance,
  });
  const workspaceStages = buildWorkspaceStages({
    reports,
    snipers,
    queryHistory,
    performance,
  });
  const workspaceCoverage = buildWorkspaceCoverage([
    {
      feature: 'AI 決策報告',
      state: '已上線',
      detail: '今日戰報、版本追蹤、原始 JSON 與比較面板都可直接回放。',
      status: 'ready',
    },
    {
      feature: '多市場查驗',
      state: '已上線',
      detail: 'TW / HK / US 三市場路徑已接上輸入驗證與 K 線切換。',
      status: 'ready',
    },
    {
      feature: 'Fusion Core / 廖兄融合',
      state: '已上線',
      detail: '把廖兄戰法、Omni 戰報、持倉與狙擊聚合成一個可查驗雷達。',
      status: 'ready',
    },
    {
      feature: '通知閉環',
      state: '已上線',
      detail: '戰報與狙擊都會留下回執，方便追查送達與失敗原因。',
      status: 'ready',
    },
    {
      feature: 'Markdown 報告',
      state: '可閱讀',
      detail: '工作台可生成可複製的工作摘要，方便貼到筆記或群組。',
      status: 'borrow',
    },
    {
      feature: '策略聊天 / 快選',
      state: '已整合',
      detail: '偏多、避險、突破、波段追問已收進戰情中心主頁。',
      status: 'ready',
    },
    {
      feature: '智慧導入 / Autocomplete',
      state: '半成品',
      detail: '可把近期查詢、持倉與點名標的轉成查詢候選。',
      status: 'build',
    },
    {
      feature: 'Backtest / Portfolio',
      state: '半成品',
      detail: '可先用績效摘要與持倉快照當作決策回放，後續再接正式回測。',
      status: 'borrow',
    },
    {
      feature: '工作區設定',
      state: '已上線',
      detail: '可切換亮色 / 深色 / 自動，並記住上次使用的偏好。',
      status: 'borrow',
    },
  ]);
  const smartImportSuggestions = Array.from(new Set([
    ...recentQueries.map((item) => item.ticker),
    ...positions.map((item) => item.ticker),
    ...snipers.map((item) => item.ticker),
    ...(warRoom?.mentionedStocks || []),
  ])).slice(0, 12);
  const smartImportTokens = parseTickerBatch(smartImportDraft, marketPreset);
  const performanceCycleReport = buildPerformanceCycleReport({
    performance,
    reports,
    queryHistory,
    snipers,
    positions,
    market: marketPreset,
  });
  const buyReportsForWarRoom = reports.filter((report) => report.action === 'BUY');
  const warRoomFocusTags = splitTags(warRoom?.focusTags);
  const warRoomAvoidTags = splitTags(warRoom?.avoidTags);
  const warRoomMentionedStocks = (warRoom?.mentionedStocks || []).length > 0
    ? warRoom?.mentionedStocks || []
    : buyReportsForWarRoom.slice(0, 8).map((report) => `${report.ticker} ${report.name}`.trim());
  const fusionWarRoomSummary = buyReportsForWarRoom.length > 0
    ? `收盤後 Fusion 彙整：今日 BUY 戰報 ${buyReportsForWarRoom.length} 檔，前段候選為 ${buyReportsForWarRoom.slice(0, 5).map((report) => `${report.ticker} ${report.name}`).join('、')}。目前應優先複核目標價、停損位、量價延續與隔日開盤強弱。`
    : '';
  const alphaTagSummary = warRoomFocusTags.length > 0 || warRoomAvoidTags.length > 0
    ? `Alpha 已更新：關注族群 ${warRoomFocusTags.join('、') || '待確認'}；避開族群 ${warRoomAvoidTags.join('、') || '待確認'}。`
    : '';
  const warRoomSummary = [
    warRoom?.summary ? `Alpha 摘要：${warRoom.summary}` : '',
    fusionWarRoomSummary,
    alphaTagSummary,
  ].filter(Boolean).join('\n\n') || (warRoomLoading || reportsLoading
    ? '大盤情報與 Fusion 戰報載入中...'
    : '目前尚未取得 Alpha 摘要與 Fusion BUY 戰報，請稍後刷新。');
  const rankedBuyReports = [...reports]
    .filter((report) => report.action === 'BUY')
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  const rankedWatchReports = [...reports]
    .filter((report) => report.action !== 'BUY')
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  const rankedSnipers = [...snipers].sort((a, b) => {
    const left = Number(String(a.confidence || '').replace(/[^\d.]/g, '')) || 0;
    const right = Number(String(b.confidence || '').replace(/[^\d.]/g, '')) || 0;
    return right - left;
  });
  const stockMarketSummary = [
    `多空分數 ${warRoom?.bullScore ?? 50}/100`,
    warRoomFocusTags.length > 0 ? `資金焦點：${warRoomFocusTags.join('、')}` : '',
    warRoomAvoidTags.length > 0 ? `降風險：${warRoomAvoidTags.join('、')}` : '',
  ].filter(Boolean).join('｜');
  const workspacePulseLabel = reports.length > 0 || snipers.length > 0
    ? tradingSession === 'trading'
      ? '盤中監看'
      : tradingSession === 'pre-market'
        ? '盤前觀測'
        : tradingSession === 'post-market'
          ? '收盤回放'
          : '市場掃描'
    : '等待盤面資料';

  const submitStrategyPrompt = useCallback((prompt: string) => {
    const value = prompt.trim();
    if (!value) return;

    const userMessage: StrategyChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'user',
      content: value,
      stamp: new Date().toISOString(),
    };
    const reply = buildStrategyReply(value, {
      decision: decisionReport,
      recentQueries,
      market: marketPreset,
      focusTicker: strategyFocusTicker,
    });
    const assistantMessage: StrategyChatMessage = {
      id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'assistant',
      content: reply.content,
      stamp: new Date().toISOString(),
      tone: reply.tone,
    };
    setStrategyMessages((prev) => [...prev, userMessage, assistantMessage].slice(-12));
    setStrategyDraft('');
  }, [decisionReport, marketPreset, recentQueries, strategyFocusTicker]);

  // 計算當前 countdown 顯示
  const currentCountdown = activeTab === 'realtime'
    ? Math.min(overviewCountdown, sniperCountdown)
    : activeTab === 'sniper'
      ? sniperCountdown
      : null;
  const sourceHealthItems = [
    { label: '戰報', value: reports.length },
    { label: '狙擊', value: snipers.length },
    { label: '查驗', value: queryHistory.length },
    { label: '持倉', value: positions.length },
  ];
  const freshnessItems = [
    { label: '指數', value: formatFreshnessLabel(indexLastUpdatedIso) },
    { label: '持倉', value: formatFreshnessLabel(positionsLastUpdatedIso) },
    { label: '戰報', value: formatFreshnessLabel(reportsLastUpdated) },
    { label: '狙擊', value: formatFreshnessLabel(snipersLastUpdated) },
    { label: '大盤', value: formatFreshnessLabel(warRoomLastUpdated) },
    { label: '績效', value: formatFreshnessLabel(performanceLastUpdated || perfSummaryLastUpdated || monitoringLastUpdated) },
  ];
  const freshnessSummary = freshnessItems.map((item) => `${item.label} ${item.value}`).join(' · ');
  const _dataPriorityItems = [
    {
      label: '指數',
      note: '先看市場方向',
      state: getFreshnessState(indexLastUpdatedIso),
      emphasis: '主導盤勢',
    },
    {
      label: '持倉',
      note: '再看曝險位置',
      state: getFreshnessState(positionsLastUpdatedIso),
      emphasis: '風控核心',
    },
    {
      label: '戰報',
      note: '觀察訊號密度',
      state: getFreshnessState(reportsLastUpdated),
      emphasis: '訊號來源',
    },
    {
      label: '狙擊',
      note: '追蹤觸發機會',
      state: getFreshnessState(snipersLastUpdated),
      emphasis: '動作清單',
    },
    {
      label: '大盤',
      note: '看整體環境',
      state: getFreshnessState(warRoomLastUpdated),
      emphasis: '情勢總覽',
    },
    {
      label: '績效',
      note: '檢查回饋閉環',
      state: getFreshnessState(performanceLastUpdated || perfSummaryLastUpdated || monitoringLastUpdated),
      emphasis: '驗證依據',
    },
  ].sort((a, b) => getFreshnessPriority(a.state) - getFreshnessPriority(b.state));
  const criticalFreshnessStates = [
    getFreshnessState(indexLastUpdatedIso),
    getFreshnessState(positionsLastUpdatedIso),
    getFreshnessState(reportsLastUpdated),
    getFreshnessState(snipersLastUpdated),
    getFreshnessState(warRoomLastUpdated),
  ];
  const overallFreshness = criticalFreshnessStates.every((state) => state === 'live')
    ? 'live'
    : criticalFreshnessStates.some((state) => state === 'live' || state === 'stale')
      ? 'stale'
      : 'fallback';
  const sourceErrors = [
    formatDataError('指數', indexError),
    formatDataError('持倉', positionsError),
    formatDataError('戰報', reportsError),
    formatDataError('狙擊', snipersError || realtimeSnipersError),
    formatDataError('止盈止損', p1Error),
    formatDataError('收盤選股', p2Error),
    formatDataError('大盤', warRoomError),
  ].filter((item): item is string => Boolean(item));
  const _railStatusLabel = sourceErrors.length > 0
    ? `資料異常 ${sourceErrors.length} 項`
    : overallFreshness === 'fallback'
      ? '等待資料更新'
      : '資料已同步';
  const railStatusDetail = sourceErrors.length > 0
    ? sourceErrors.slice(0, 3).join(' · ')
    : freshnessSummary;
  const marketTapeQuotes = indexQuotes.slice(0, 2);
  const sessionLabel: Record<TradingSession, string> = {
    'pre-market': '開盤前',
    'trading': '盤中',
    'post-market': '收盤後',
    'weekend': '非交易日',
  };
  const calendarRows = [
    { label: '今日交易狀態', value: tradingDayStatus.isTradingDay ? '台股交易日' : '非交易日 / 休市' },
    { label: '目前盤勢時段', value: sessionLabel[tradingSession] },
    { label: '系統判定原因', value: tradingDayStatus.reason || '依台北時間與交易時段自動判定' },
    { label: '大盤資料新鮮度', value: formatFreshnessLabel(warRoomLastUpdated) },
    { label: '戰報資料新鮮度', value: formatFreshnessLabel(reportsLastUpdated) },
  ];
  const openAnalysisResult = useCallback((result: AnalysisResult) => {
    setQueryTicker(result.ticker);
    if (result.market) {
      setMarketPreset(result.market);
    }
    setActiveTab('analyze');
    setQueryResult(result);
    const idx = queryHistory.findIndex((h) => h.queriedAt === result.queriedAt && h.ticker === result.ticker);
    const previous = idx >= 0 ? queryHistory[idx + 1] ?? null : queryHistory[1] ?? null;
    setComparisonResult(previous);
  }, [queryHistory]);

  const openRawViewer = useCallback((result: AnalysisResult) => {
    setRawViewerResult(result);
  }, []);

  const navigateTab = useCallback((tab: string) => {
    setSettingsOpen(false);
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }, []);

  const openBattleReport = useCallback((report: BattleReport) => {
    setQueryTicker(report.ticker);
    setMarketPreset('TW');
    setQueryResult({
      ticker: report.ticker,
      name: report.name,
      market: 'TW',
      price: String(report.price ?? ''),
      action: report.action,
      confidence: Number(report.confidence || 0),
      target: String(report.target ?? ''),
      stopLoss: String(report.stopLoss ?? ''),
      strategyType: report.strategyType,
      momentum: report.momentum,
      verdictTitle: report.verdictTitle,
      todayView: report.todayView,
      reason: report.reason,
      queriedAt: new Date().toISOString(),
      analysisMeta: {
        source: 'fusion_battle_report',
        market: 'TW',
        responseKind: 'json',
        receivedAt: new Date().toISOString(),
        rawPreview: JSON.stringify(report, null, 2).slice(0, 1200),
        rawBody: JSON.stringify(report, null, 2),
      },
    });
    setActiveTab('analyze');
  }, []);

  const closeRawViewer = useCallback(() => {
    setRawViewerResult(null);
  }, []);

  const handleCopyRawBody = useCallback(async () => {
    const rawBody = queryResult?.analysisMeta?.rawBody;
    if (!rawBody) return;
    try {
      await navigator.clipboard.writeText(rawBody);
    } catch {
      // Browser clipboard restrictions are acceptable here.
    }
  }, [queryResult]);

  useEffect(() => {
    if (!rawViewerResult) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRawViewer();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [rawViewerResult, closeRawViewer]);

  return (
    <main className="quant-shell review-shell">
      <SkyNetMarketHeader
        activeTab={activeTab}
        queryTicker={queryTicker}
        marketPreset={marketPreset}
        onNavigate={navigateTab}
        onQueryChange={(value) => {
          if (marketPreset === 'TW') {
            setQueryTicker(value.replace(/\D/g, '').slice(0, 6));
            return;
          }
          if (marketPreset === 'HK') {
            setQueryTicker(value.replace(/\D/g, '').slice(0, 5));
            return;
          }
          setQueryTicker(value.replace(/[^A-Z0-9.\-]/g, '').slice(0, 8));
        }}
        onMarketChange={(market) => {
          setMarketPreset(market);
          setQueryTicker('');
        }}
        onSubmitSearch={() => {
          if (!queryTicker.trim()) {
            setActiveTab('analyze');
            return;
          }
          setActiveTab('analyze');
          void handleAnalyze();
        }}
        onOpenSettings={() => {
          setSettingsOpen(true);
          setActiveTab('realtime');
        }}
      />

      {/* ── 主區域 ── */}
      <section className="quant-main">
        {activeTab === 'home' && (
          <>
            <header className="quant-topbar">
              <div className="status-cluster">
                <span className="pill muted"><Clock3 size={15} /> 台北 {now}</span>
                <span className="pill good"><Sparkles size={15} /> {workspacePulseLabel}</span>
              </div>
              <div className="operator-zone">
                {currentCountdown !== null && (
                  <span className="pill muted"><Clock3 size={14} /> 下次刷新 {currentCountdown}s</span>
                )}
                <button
                  className={`icon-button ${settingsOpen ? 'active' : ''}`}
                  onClick={() => setSettingsOpen((value) => !value)}
                  aria-label="工作區設定"
                  title="工作區設定"
                >
                  <Settings size={17} />
                </button>
                <button className="icon-button" onClick={handleRefresh} aria-label="刷新">
                  <RefreshCw size={17} />
                </button>
                <span className="operator">最後刷新 {lastRefresh}</span>
              </div>
            </header>

            <section className="market-tape" aria-label="市場帶">
              <div className="market-tape-card market-tape-session">
                <span>市場時段</span>
                <strong>{sessionLabel[tradingSession]}</strong>
                <p>{tradingDayStatus.reason || (manualSession ? '手動鎖定' : '自動切換')}</p>
              </div>
              <div className="market-tape-card">
                <span>工作台節奏</span>
                <strong>{workspacePulseLabel}</strong>
                <p>{sourceHealthItems.map((item) => `${item.label} ${item.value}`).join(' · ')}</p>
              </div>
              {marketTapeQuotes.length === 0 ? (
                <div className="market-tape-card market-tape-placeholder">
                  <span>大盤指標</span>
                  <strong>等待指數資料</strong>
                  <p>載入後會顯示台股關鍵指標與價格變化。</p>
                </div>
              ) : (
                marketTapeQuotes.map((quote) => (
                  <div key={quote.symbol} className="market-tape-card">
                    <span>{quote.symbol}</span>
                    <strong>{quote.price > 0 ? quote.price.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}</strong>
                    <p className={quote.changePercent > 0 ? 'up' : quote.changePercent < 0 ? 'down' : ''}>
                      {quote.change > 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercent > 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%)
                    </p>
                  </div>
                ))
              )}
              <div className="market-tape-card">
                <span>資料新鮮度</span>
                <strong className={`freshness-${overallFreshness}`}>{getFreshnessStatusLabel(overallFreshness)}</strong>
                <p>{railStatusDetail}</p>
              </div>
            </section>

            <div className="home-module-grid">
              <button type="button" onClick={() => setActiveTab('realtime')} className="home-module-card">
                <Activity size={22} />
                <span>戰情中心</span>
                <strong>戰報、候選、策略對話</strong>
              </button>
              <button type="button" onClick={() => setActiveTab('warroom')} className="home-module-card">
                <Gauge size={22} />
                <span>大盤情報</span>
                <strong>Alpha 摘要與族群雷達</strong>
              </button>
              <button type="button" onClick={() => setActiveTab('analyze')} className="home-module-card">
                <BrainCircuit size={22} />
                <span>個股作戰室</span>
                <strong>AI 查詢、K 線、目標/防守</strong>
              </button>
              <button type="button" onClick={() => setActiveTab('performance')} className="home-module-card">
                <BarChart2 size={22} />
                <span>績效閉環</span>
                <strong>勝率、追蹤、回放</strong>
              </button>
            </div>

            <aside className="workspace-rail home-rail">
              <section className="rail-card rail-sticky">
                <div className="rail-card-head">
                  <div>
                    <p className="rail-eyebrow">市場脈搏</p>
                    <h2>{workspacePulseLabel}</h2>
                  </div>
                  <span className={`rail-pill ${overallFreshness === 'live' ? 'good' : overallFreshness === 'stale' ? 'warn' : 'muted'}`}>{getFreshnessStatusLabel(overallFreshness)}</span>
                </div>
                <div className="rail-stats">
                  <div><span>戰報</span><strong>{reports.length}</strong></div>
                  <div><span>狙擊</span><strong>{snipers.length}</strong></div>
                  <div><span>查詢</span><strong>{queryHistory.length}</strong></div>
                  <div><span>持倉</span><strong>{positions.length}</strong></div>
                </div>
              </section>
            </aside>
          </>
        )}

        {/* K 線圖面板 */}
        <AnimatePresence>
          {klineTicker && (
            <KLinePanel ticker={klineTicker} market={klineMarket} onClose={closeKLine} target={klineTarget} stopLoss={klineStopLoss} />
          )}
        </AnimatePresence>

        {/* ── 股票下拉：智能選股 ── */}
        {activeTab === 'stock-smart' && (
          <div className="board-content">
            <div className="board-heading">
              <div className="heading-icon"><Sparkles size={24} /></div>
              <div>
                <h1>智能選股</h1>
                <p>彙整 Fusion BUY、收盤候選與狙擊信號，先看高信心且具備目標/防守價的標的。</p>
              </div>
            </div>

            <div className="stock-feature-grid">
              <section className="stock-feature-card wide">
                <p className="wc-label">高信心 BUY 清單</p>
                {reportsLoading ? (
                  <LoadingState text="載入智能選股中..." />
                ) : rankedBuyReports.length === 0 ? (
                  <EmptyState
                    icon={<Sparkles size={32} />}
                    title="目前沒有正式 BUY 名單"
                    desc="若候選欄位不足，系統會先降為觀察，不在智能選股頁做強攻展示。"
                  />
                ) : (
                  <div className="battle-report-list compact">
                    {rankedBuyReports.slice(0, 8).map((report) => (
                      <BattleCard
                        key={`smart-${report.ticker}-${report.signalTime || report.date}`}
                        report={report}
                        onAnalyze={() => openBattleReport(report)}
                        onKLine={openKLine}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="stock-feature-card">
                <p className="wc-label">候選備援</p>
                <div className="stock-mini-list">
                  {p2Candidates.slice(0, 8).map((item, index) => (
                    <button key={`${item.ticker}-${index}`} type="button" onClick={() => openKLine(item.ticker)}>
                      <strong>{item.ticker} {item.name}</strong>
                      <span>信心 {item.confidence}% · 觸發 {item.triggerPrice || '--'}</span>
                    </button>
                  ))}
                  {p2Candidates.length === 0 && <p className="stock-muted">尚未取得收盤候選，請稍後刷新。</p>}
                </div>
              </section>

              <section className="stock-feature-card">
                <p className="wc-label">狙擊信號</p>
                <div className="stock-mini-list">
                  {rankedSnipers.slice(0, 6).map((item, index) => (
                    <button key={`${item.ticker}-${index}`} type="button" onClick={() => openKLine(item.ticker)}>
                      <strong>{item.ticker} {item.name}</strong>
                      <span>信心 {item.confidence || '--'} · 觸發 {item.triggerPrice || '--'}</span>
                    </button>
                  ))}
                  {rankedSnipers.length === 0 && <p className="stock-muted">目前沒有狙擊信號。</p>}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ── 股票下拉：大盤 ── */}
        {activeTab === 'stock-market' && (
          <div className="board-content">
            <div className="board-heading">
              <div className="heading-icon"><Gauge size={24} /></div>
              <div>
                <h1>大盤</h1>
                <p>聚焦市場多空分數、指數節奏與盤勢摘要，和類股頁分開呈現。</p>
              </div>
            </div>

            <div className="stock-feature-grid">
              <section className="stock-feature-card">
                <p className="wc-label">市場多空分數</p>
                <div className="bull-bar-wrap">
                  <div className="bull-bar" style={{ width: `${warRoom?.bullScore ?? 50}%` }} />
                </div>
                <p className="bull-value">{warRoom?.bullScore ?? 50} / 100</p>
                <p className="wc-text">{stockMarketSummary || '等待 Alpha / Fusion 更新市場判讀。'}</p>
              </section>
              <section className="stock-feature-card wide">
                <IndexPanel
                  quotes={indexQuotes}
                  loading={indexLoading}
                  error={indexError}
                  lastUpdated={indexLastUpdated}
                  isTrading={tradingSession === 'trading'}
                />
              </section>
              <section className="stock-feature-card wide">
                <p className="wc-label">今日市場摘要</p>
                <p className="wc-text">{warRoomSummary}</p>
              </section>
            </div>
          </div>
        )}

        {/* ── 股票下拉：類股 ── */}
        {activeTab === 'stock-sector' && (
          <div className="board-content">
            <div className="board-heading">
              <div className="heading-icon"><Activity size={24} /></div>
              <div>
                <h1>類股</h1>
                <p>只看族群輪動、關注主線與避開方向，不和大盤指數判讀混在一起。</p>
              </div>
            </div>

            <div className="stock-feature-grid">
              <section className="stock-feature-card">
                <p className="wc-label">今日關注族群</p>
                <div className="tag-cloud">
                  {(warRoomFocusTags.length > 0 ? warRoomFocusTags : ['等待 Alpha 更新']).map((tag, index) => (
                    <span key={`${tag}-${index}`} className="focus-tag">{tag}</span>
                  ))}
                </div>
              </section>
              <section className="stock-feature-card">
                <p className="wc-label">避開 / 降風險族群</p>
                <div className="tag-cloud">
                  {(warRoomAvoidTags.length > 0 ? warRoomAvoidTags : ['等待風控更新']).map((tag, index) => (
                    <span key={`${tag}-${index}`} className="avoid-tag">{tag}</span>
                  ))}
                </div>
              </section>
              <section className="stock-feature-card wide">
                <p className="wc-label">族群主線標的</p>
                <div className="mentioned-list">
                  {warRoomMentionedStocks.map((stock, index) => (
                    <button
                      key={`${stock}-${index}`}
                      type="button"
                      className="mentioned-ticker"
                      onClick={() => { setQueryTicker(String(stock).match(/\d{4,6}[A-Za-z]?/)?.[0] || stock); setActiveTab('analyze'); }}
                    >
                      {stock}
                    </button>
                  ))}
                  {warRoomMentionedStocks.length === 0 && <p className="stock-muted">尚無點名標的。</p>}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ── 股票下拉：除權息預告 ── */}
        {activeTab === 'stock-dividend' && (
          <div className="board-content">
            <div className="board-heading">
              <div className="heading-icon"><CalendarDays size={24} /></div>
              <div>
                <h1>除權息預告</h1>
                <p>預留給台股除權息資料源，後續可接公開資訊觀測站或證交所事件資料。</p>
              </div>
            </div>
            <EmptyState
              icon={<CalendarDays size={32} />}
              title="除權息資料源尚未接入"
              desc="此頁已獨立，不再回首頁；下一階段可接除權息日、停止過戶日、現金股利與殖利率提醒。"
            />
          </div>
        )}

        {/* ── 股票下拉：排行榜 ── */}
        {activeTab === 'stock-ranking' && (
          <div className="board-content">
            <div className="board-heading">
              <div className="heading-icon"><BarChart2 size={24} /></div>
              <div>
                <h1>排行榜</h1>
                <p>依信心分數、BUY 戰報與狙擊信號排序，快速找出今天最需要查驗的標的。</p>
              </div>
            </div>

            <div className="stock-feature-grid">
              <section className="stock-feature-card wide">
                <p className="wc-label">BUY 排名</p>
                <div className="stock-ranking-list">
                  {rankedBuyReports.slice(0, 10).map((report, index) => (
                    <button key={`rank-buy-${report.ticker}-${index}`} type="button" onClick={() => openBattleReport(report)}>
                      <span>#{index + 1}</span>
                      <strong>{report.ticker} {report.name}</strong>
                      <em>信心 {report.confidence}% · 目標 {report.target || '--'}</em>
                    </button>
                  ))}
                  {rankedBuyReports.length === 0 && <p className="stock-muted">目前沒有 BUY 排名。</p>}
                </div>
              </section>
              <section className="stock-feature-card">
                <p className="wc-label">觀察排名</p>
                <div className="stock-mini-list">
                  {rankedWatchReports.slice(0, 8).map((report, index) => (
                    <button key={`rank-watch-${report.ticker}-${index}`} type="button" onClick={() => openBattleReport(report)}>
                      <strong>{report.ticker} {report.name}</strong>
                      <span>{report.action} · 信心 {report.confidence}%</span>
                    </button>
                  ))}
                  {rankedWatchReports.length === 0 && <p className="stock-muted">目前沒有觀察排名。</p>}
                </div>
              </section>
              <section className="stock-feature-card">
                <p className="wc-label">狙擊排名</p>
                <div className="stock-mini-list">
                  {rankedSnipers.slice(0, 8).map((item, index) => (
                    <button key={`rank-sniper-${item.ticker}-${index}`} type="button" onClick={() => openKLine(item.ticker)}>
                      <strong>{item.ticker} {item.name}</strong>
                      <span>信心 {item.confidence || '--'} · 防守 {item.stopPrice || '--'}</span>
                    </button>
                  ))}
                  {rankedSnipers.length === 0 && <p className="stock-muted">目前沒有狙擊排名。</p>}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ── 股票下拉：市場新聞 ── */}
        {activeTab === 'stock-news' && (
          <div className="board-content">
            <div className="board-heading">
              <div className="heading-icon"><Newspaper size={24} /></div>
              <div>
                <h1>市場新聞</h1>
                <p>先以 Alpha 摘要承接盤前新聞、總經與題材脈絡，後續可再拆新聞來源列表。</p>
              </div>
            </div>

            <section className="stock-feature-card wide">
              <p className="wc-label">Alpha 新聞摘要</p>
              <p className="wc-text">{warRoom?.summary || warRoomSummary}</p>
            </section>
          </div>
        )}

        {/* ── 股票下拉：股市行事曆 ── */}
        {activeTab === 'stock-calendar' && (
          <div className="board-content">
            <div className="board-heading">
              <div className="heading-icon"><CalendarDays size={24} /></div>
              <div>
                <h1>股市行事曆</h1>
                <p>顯示交易日、盤中時段與資料更新節奏，作為之後接入法說會 / 財報 / 除權息事件的入口。</p>
              </div>
            </div>

            <section className="stock-feature-card wide">
              <p className="wc-label">今日市場行事狀態</p>
              <div className="calendar-status-list">
                {calendarRows.map((row) => (
                  <div key={row.label}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ── 即時監控 ── */}
        {activeTab === 'realtime' && (
          <div className="board-content">
            <div className="board-heading">
              <div className="heading-icon"><Activity size={24} /></div>
              <div>
                <h1>即時監控</h1>
                <p>持倉損益、狙擊候選、大盤指數，依交易時段自動切換顯示重點。</p>
              </div>
            </div>

            <div className="battlework-grid">
              <DecisionReportPanel
                report={decisionReport}
                recentQueries={recentQueries}
                onOpenQuery={openAnalysisResult}
                onFocusTicker={(ticker) => {
                  setQueryTicker(ticker);
                  setActiveTab('analyze');
                }}
              />

              <section className="workspace-card battlework-card">
                <div className="panel-subhead">
                  <div>
                    <p>智慧導入</p>
                    <h3>貼上標的，自動整理成查驗清單</h3>
                  </div>
                  <span>{smartImportTokens.length}</span>
                </div>
                <div className="smart-import">
                  <textarea
                    value={smartImportDraft}
                    onChange={(e) => setSmartImportDraft(e.target.value)}
                    placeholder="可貼上 2330, 2317, AAPL，或用換行分隔"
                    rows={4}
                  />
                  <div className="smart-import-actions">
                    <span>市場 {marketPreset}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!smartImportTokens.length) return;
                        const nextTicker = smartImportTokens[0];
                        setMarketPreset(detectMarketPreset(nextTicker));
                        setQueryTicker(nextTicker);
                        setActiveTab('analyze');
                      }}
                    >
                      帶入第一檔
                    </button>
                  </div>
                  <div className="smart-import-tags">
                    {smartImportTokens.length === 0 ? (
                      <span className="panel-empty">貼上代號後，這裡會自動拆出可查驗的候選。</span>
                    ) : (
                      smartImportTokens.map((ticker) => (
                        <button
                          key={ticker}
                          type="button"
                          onClick={() => {
                            setMarketPreset(detectMarketPreset(ticker));
                            setQueryTicker(ticker);
                            setActiveTab('analyze');
                          }}
                          className="smart-import-tag"
                        >
                          {ticker}
                        </button>
                      ))
                    )}
                  </div>
                  <div className="smart-import-suggestions">
                    {smartImportSuggestions.map((ticker) => (
                      <button
                        key={ticker}
                        type="button"
                        onClick={() => {
                          setMarketPreset(detectMarketPreset(ticker));
                          setQueryTicker(ticker);
                          setActiveTab('analyze');
                        }}
                      >
                        {ticker}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <FusionRadarPanel ticker={strategyFocusTicker} marketLabel={marketConfig.label} />

              <StrategyChatPanel
                market={marketPreset}
                focusTicker={strategyFocusTicker}
                messages={strategyMessages}
                draft={strategyDraft}
                onDraftChange={setStrategyDraft}
                onSubmit={submitStrategyPrompt}
                onPickPrompt={(prompt) => {
                  setStrategyDraft(prompt);
                  submitStrategyPrompt(prompt);
                }}
                onFocusTicker={(ticker) => {
                  setQueryTicker(ticker);
                  setActiveTab('analyze');
                }}
              />

              <section className="workspace-card battlework-card battle-report-card">
                <div className="panel-subhead">
                  <div>
                    <p>戰情摘要</p>
                    <h3>今天先看什麼</h3>
                  </div>
                  <span>{workspaceStages.length}</span>
                </div>
                <div className="workspace-stage-list">
                  {workspaceStages.map((stage) => (
                    <article key={stage.label} className={`workspace-stage ${stage.tone}`}>
                      <strong>{stage.label}</strong>
                      <p>{stage.detail}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="workspace-card battlework-card">
                <div className="panel-subhead">
                  <div>
                    <p>今日戰報</p>
                    <h3>可點擊查閱的 Fusion 訊號</h3>
                  </div>
                  <span>{reports.length}</span>
                </div>
                <div className="signal-filter-row" role="tablist" aria-label="戰報篩選">
                  {(['ALL', 'BUY', 'WAIT', 'SELL'] as SignalFilter[]).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      className={signalFilter === filter ? 'active' : ''}
                      onClick={() => setSignalFilter(filter)}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                {reportsLoading ? (
                  <div className="warroom-panel-loading">載入今日戰報中...</div>
                ) : reports.length === 0 ? (
                  <div className="warroom-panel-empty">今日尚無 Fusion 戰報</div>
                ) : (
                  <div className="battle-report-list">
                    {reports
                      .filter((report) => signalFilter === 'ALL' || report.action === signalFilter)
                      .slice(0, 12)
                      .map((report) => (
                        <BattleCard
                          key={`${report.ticker}-${report.signalTime || report.date}`}
                          report={report}
                          onAnalyze={() => openBattleReport(report)}
                          onKLine={openKLine}
                        />
                      ))}
                  </div>
                )}
              </section>
            </div>

            <TradingSessionLayout
              session={tradingSession}
              manualSession={manualSession}
              onManualSelect={setManualSession}
              preMarketContent={
                <div className="realtime-section">
                  <P2ScanPanel
                    candidates={p2Candidates}
                    loading={p2Loading}
                    error={p2Error}
                    onTickerClick={openKLine}
                  />
                  <P1TriggerPanel
                    triggers={p1Triggers}
                    loading={p1Loading}
                    error={p1Error}
                  />
                </div>
              }
              tradingContent={
                <div className="realtime-section">
                  <IndexPanel
                    quotes={indexQuotes}
                    loading={indexLoading}
                    error={indexError}
                    lastUpdated={indexLastUpdated}
                    isTrading={tradingSession === 'trading'}
                  />
                  <PositionCard
                    positions={positions}
                    loading={positionsLoading}
                    error={positionsError}
                    isTrading={tradingSession === 'trading'}
                    lastUpdated={positionsLastUpdated}
                    onTickerClick={openKLineWithPrices}
                  />
                  <SniperPanel
                    snipers={realtimeSnipers}
                    loading={realtimeSnipersLoading}
                    error={realtimeSnipersError}
                    isTrading={tradingSession === 'trading'}
                    onTickerClick={openKLineWithPrices}
                    onRetreat={handleRetreat}
                  />
                </div>
              }
              postMarketContent={
                <div className="realtime-section">
                  <P1TriggerPanel
                    triggers={p1Triggers}
                    loading={p1Loading}
                    error={p1Error}
                  />
                  <P2ScanPanel
                    candidates={p2Candidates}
                    loading={p2Loading}
                    error={p2Error}
                    onTickerClick={openKLine}
                  />
                </div>
              }
              weekendContent={
                <div className="realtime-section">
                  <P2ScanPanel
                    candidates={p2Candidates}
                    loading={p2Loading}
                    error={p2Error}
                    onTickerClick={openKLine}
                  />
                  <P1TriggerPanel
                    triggers={p1Triggers}
                    loading={p1Loading}
                    error={p1Error}
                  />
                </div>
              }
            />

            {/* ── Phase B：法人籌碼數據 ── */}
            <div className="phase-b-section">
              <div className="phase-b-grid">
                <InstitutionalPanel
                  data={institutional}
                  loading={instLoading}
                  error={instError}
                  lastUpdated={instLastUpdated}
                />
                <MOPSPanel
                  announcements={mopsAnnouncements}
                  loading={mopsLoading}
                  error={mopsError}
                  tickers={positions.map(p => p.ticker)}
                />
              </div>
              <div className="phase-b-grid">
                <MonthlyRevenuePanel
                  revenues={monthlyRevenues}
                  loading={revenueLoading}
                  error={revenueError}
                />
                <MarginPanel
                  margins={margins}
                  loading={marginLoading}
                  error={marginError}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── AI 查詢視窗 ── */}
        {activeTab === 'analyze' && (
          <div className="board-content">
            <div className="board-heading">
              <div className="heading-icon"><BrainCircuit size={24} /></div>
              <div>
                <h1>AI 深度查詢</h1>
                <p>先選市場，再輸入代號，讓天網 Omni 直接切到對應的查驗節奏與資料源視角。</p>
              </div>
            </div>

            <div className="market-panel">
              <div className="market-panel-head">
                <div>
                  <p className="market-eyebrow">市場切換</p>
                  <h3>{marketConfig.label} 查驗模式</h3>
                </div>
                <span>{marketConfig.quickTickers.length} 個快選</span>
              </div>
              <div className="market-tabs">
                {(Object.keys(MARKET_PRESETS) as MarketPreset[]).map((key) => {
                  const preset = MARKET_PRESETS[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setMarketPreset(key);
                        setQueryTicker('');
                      }}
                      className={`market-tab ${marketPreset === key ? 'active' : ''}`}
                    >
                      <strong>{preset.label}</strong>
                      <span>{preset.desc}</span>
                    </button>
                  );
                })}
              </div>
              <div className="market-hint">
                <span>{marketConfig.hint}</span>
                <span>這裡是多市場入口，之後可再接港股 / 美股資料 adapter。</span>
              </div>
            </div>

            {/* 查詢輸入 */}
            <div className="analyze-input-row">
              <div className="analyze-input-wrap">
                <Search size={18} className="analyze-icon" />
                <input
                  type="text"
                  value={queryTicker}
                  onChange={(e) => {
                    const raw = e.target.value.toUpperCase();
                    if (marketPreset === 'TW') {
                      setQueryTicker(raw.replace(/\D/g, '').slice(0, 6));
                      return;
                    }
                    if (marketPreset === 'HK') {
                      setQueryTicker(raw.replace(/\D/g, '').slice(0, 5));
                      return;
                    }
                    setQueryTicker(raw.replace(/[^A-Z0-9.\-]/g, '').slice(0, 8));
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  placeholder={marketConfig.placeholder}
                  className="analyze-input"
                  maxLength={marketPreset === 'US' ? 8 : marketPreset === 'HK' ? 5 : 6}
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
              {marketConfig.quickTickers.map(t => (
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

            {queryResult && comparisonResult && !queryLoading && (
              <ComparisonPanel current={queryResult} previous={comparisonResult} />
            )}

            {queryResult && !queryLoading && (
              <AnalysisVersionPanel
                current={queryResult}
                history={currentTickerHistory}
                onOpenVersion={openAnalysisResult}
                onOpenRaw={openRawViewer}
              />
            )}

            {queryResult?.analysisMeta?.rawBody && !queryLoading && (
              <div className="analyze-actions">
                <button onClick={() => openRawViewer(queryResult)} className="raw-view-btn">
                  查看完整原始 JSON
                </button>
                <button onClick={handleCopyRawBody} className="raw-copy-btn">
                  複製原始內容
                </button>
              </div>
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

        {rawViewerResult?.analysisMeta?.rawBody && (
          <div className="raw-modal-backdrop" onClick={closeRawViewer} role="presentation">
            <div className="raw-modal raw-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="完整原始 JSON">
              <div className="raw-modal-header">
                <div>
                  <p className="raw-modal-eyebrow">完整原始 JSON</p>
                  <h2>{rawViewerResult.ticker} {rawViewerResult.name || ''}</h2>
                </div>
                <button className="raw-modal-close" onClick={closeRawViewer} aria-label="關閉原始 JSON">
                  <X size={16} />
                </button>
              </div>
              <div className="raw-modal-meta">
                <span>來源 {rawViewerResult.analysisMeta.source}</span>
                {rawViewerResult.analysisMeta.market && <span>市場 {rawViewerResult.analysisMeta.market}</span>}
                <span>回應 {rawViewerResult.analysisMeta.responseKind.toUpperCase()}</span>
                <span>收到 {new Date(rawViewerResult.analysisMeta.receivedAt).toLocaleString('zh-TW', { hour12: false })}</span>
              </div>
              <pre className="raw-modal-body">{rawViewerResult.analysisMeta.rawBody}</pre>
            </div>
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

            {/* 新增狙擊表單 */}
            <form onSubmit={handleAddWatch} className="watch-form">
              <div className="watch-form-row">
                <div className="watch-input-wrap">
                  <Crosshair size={16} className="watch-input-icon" />
                  <input
                    type="text"
                    value={watchTicker}
                    onChange={(e) => setWatchTicker(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="股票代號（4-6位）"
                    className="watch-input"
                    maxLength={6}
                    disabled={watchLoading}
                  />
                </div>
                <div className="watch-input-wrap">
                  <Target size={16} className="watch-input-icon" />
                  <input
                    type="text"
                    value={watchPrice}
                    onChange={(e) => setWatchPrice(e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="觸發價（選填）"
                    className="watch-input"
                    disabled={watchLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={watchLoading || !watchTicker}
                  className="watch-submit-btn"
                >
                  {watchLoading
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Plus size={15} />}
                  {watchLoading ? '新增中...' : '新增狙擊'}
                </button>
              </div>
              {watchMessage && (
                <div className={`watch-message ${watchMessage.type}`}>
                  {watchMessage.type === 'error' && <AlertTriangle size={14} />}
                  {watchMessage.type === 'success' && <CheckCircle2 size={14} />}
                  <span>{watchMessage.text}</span>
                </div>
              )}
            </form>

            {snipersLoading ? (
              <LoadingState text="載入狙擊清單中..." />
            ) : snipers.length === 0 ? (
              <EmptyState
                icon={<Crosshair size={32} />}
                title="狙擊清單為空"
                desc={'在上方表單或 Telegram 發送 /watch 2330 加入標的。'}
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
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snipers.map((s, i) => {
                      const current = parseFloat(s.currentPrice || '0');
                      const trigger = parseFloat(s.triggerPrice || '0');
                      const distPct = trigger > 0 && current > 0
                        ? safeFixed(((trigger - current) / current) * 100, 1)
                        : '--';
                      const isTriggered = s.status === '已觸發';
                      const isRetreated = s.status === '已撤退';
                      const isNear = distPct !== '--' && Math.abs(parseFloat(distPct)) < 1;
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
                          <td className={`dist-cell ${isNear ? 'near' : ''}`}>
                            {distPct !== '--' ? `${distPct}%` : '--'}
                          </td>
                          <td>
                            <span className={`status-badge ${isTriggered ? 'triggered' : isRetreated ? 'retreated' : 'waiting'}`}>
                              {s.status || '待觸發'}
                            </span>
                          </td>
                          <td className="source-cell">{s.source || '--'}</td>
                          <td>
                            {!isRetreated && (
                              <button
                                onClick={() => handleRetreat(s.ticker)}
                                className="retreat-btn"
                                title={`撤退 ${s.ticker}`}
                              >
                                <LogOut size={13} />
                                撤退
                              </button>
                            )}
                          </td>
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
                <p>Alpha 情報與 Fusion 收盤戰報合併顯示，含市場情緒、關注族群與今日主線。</p>
              </div>
            </div>

            {warRoomLoading && !warRoom && reports.length === 0 ? (
              <LoadingState text="載入大盤情報中..." />
            ) : !warRoom && reports.length === 0 ? (
              <EmptyState
                icon={<Activity size={32} />}
                title="今日情報尚未更新"
                desc="Alpha 與 Fusion 尚未回傳可顯示資料。"
              />
            ) : (
              <div className="warroom-grid">
                <div className="warroom-card bull-score">
                  <p className="wc-label">市場多空分數</p>
                  <div className="bull-bar-wrap">
                    <div className="bull-bar" style={{ width: `${warRoom?.bullScore ?? 50}%` }} />
                  </div>
                  <p className="bull-value">{warRoom?.bullScore ?? 50} / 100</p>
                  <p className="wc-text">最後更新：{warRoom?.date || warRoomLastUpdated ? formatReviewStamp(warRoom?.date || warRoomLastUpdated || '') : '--'}</p>
                </div>

                <div className="warroom-card">
                  <p className="wc-label">今日關注族群</p>
                  <div className="tag-cloud">
                    {(warRoomFocusTags.length > 0 ? warRoomFocusTags : ['半導體', 'AI', '電子代工', '金融', '營建資產']).map((t, i) => (
                      <span key={i} className="focus-tag">{t.trim()}</span>
                    ))}
                  </div>
                </div>

                <div className="warroom-card">
                  <p className="wc-label">避開族群</p>
                  <div className="tag-cloud">
                    {(warRoomAvoidTags.length > 0 ? warRoomAvoidTags : ['弱勢景氣循環股', '高檔過熱股']).map((t, i) => (
                      <span key={i} className="avoid-tag">{t.trim()}</span>
                    ))}
                  </div>
                </div>

                <div className="warroom-card mentioned">
                  <p className="wc-label">點名 / Fusion 主線標的</p>
                  <div className="mentioned-list">
                    {warRoomMentionedStocks.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setQueryTicker(String(s).match(/\d{4,6}[A-Za-z]?/)?.[0] || s); setActiveTab('analyze'); }}
                        className="mentioned-ticker"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="warroom-card summary">
                  <p className="wc-label">今日市場摘要</p>
                  <p className="wc-text">{warRoomSummary}</p>
                  {buyReportsForWarRoom.length > 0 && (
                    <div className="warroom-mini-list">
                      {buyReportsForWarRoom.slice(0, 5).map((report) => (
                        <button
                          key={`${report.ticker}-${report.signalTime || report.date}`}
                          type="button"
                          onClick={() => openBattleReport(report)}
                        >
                          <strong>{report.ticker} {report.name}</strong>
                          <span>BUY {report.confidence}% · 目標 {report.target || '--'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 查詢歷史（#8） ── */}
        {activeTab === 'history' && (
          <div className="board-content">
            <div className="board-heading">
              <div className="heading-icon"><History size={24} /></div>
              <div>
                <h1>查詢歷史</h1>
                <p>本 Session 內手動查詢的標的紀錄，含分析結果摘要。</p>
              </div>
            </div>

            {analysisGroups.length > 0 && (
              <HistoryArchivePanel
                groups={analysisGroups}
                onOpenVersion={openAnalysisResult}
                onOpenRaw={openRawViewer}
              />
            )}

            {queryHistory.length === 0 ? (
              <EmptyState
                icon={<History size={32} />}
                title="尚無查詢紀錄"
                desc="在「AI 查詢」Tab 輸入股票代號後，紀錄會顯示在這裡。"
              />
            ) : (
              <div className="history-list">
                {queryHistory.map((h, i) => {
                  const actionColor = h.action === 'BUY' ? 'buy' : h.action === 'SELL' ? 'sell' : 'wait';
                  return (
                    <div key={i} className="history-item">
                      <div className="history-item-left">
                        <span className="history-ticker">{h.ticker}</span>
                        {h.name && <span className="history-name">{h.name}</span>}
                        {h.price && <span className="history-price">NT$ {h.price}</span>}
                        {h.queriedAt && <span className="history-time">{new Date(h.queriedAt).toLocaleString('zh-TW', { hour12: false })}</span>}
                      </div>
                      <div className="history-item-right">
                        {h.action && (
                          <span className={`action-badge ${actionColor}`}>{h.action}</span>
                        )}
                        {h.confidence != null && (
                          <span className="history-conf">信心 {h.confidence}%</span>
                        )}
                        {h.error && (
                          <span className="history-error"><AlertTriangle size={12} /> {h.error}</span>
                        )}
                        <button onClick={() => openAnalysisResult(h)} className="history-requery-btn">
                          重新查詢
                        </button>
                        {h.analysisMeta?.rawBody && (
                          <button onClick={() => openRawViewer(h)} className="history-raw-btn">
                            原始 JSON
                          </button>
                        )}
                      </div>
                      {h.analysisMeta && (
                        <div className="history-trace">
                          <span>{h.analysisMeta.source}</span>
                          <span>{h.analysisMeta.responseKind.toUpperCase()}</span>
                          <span>{new Date(h.analysisMeta.receivedAt).toLocaleTimeString('zh-TW', { hour12: false })}</span>
                        </div>
                      )}
                      {h.analysisMeta?.rawPreview && (
                        <details className="history-trace-details">
                          <summary>查看原始摘要</summary>
                          <pre>{h.analysisMeta.rawPreview}</pre>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 每日績效摘要（#10） ── */}
        {activeTab === 'performance' && (
          <div className="board-content">
            <div className="board-heading">
              <div className="heading-icon"><BarChart2 size={24} /></div>
              <div>
                <h1>每日績效摘要</h1>
                <p>收盤後自動計算當日 BUY 訊號的實際表現，由天網-API 提供。</p>
              </div>
            </div>

            {performanceLoading ? (
              <LoadingState text="載入績效資料中..." />
            ) : performanceError ? (
              <EmptyState
                icon={<BarChart2 size={32} />}
                title="績效資料尚未更新"
                desc="收盤後系統會自動計算，請於收盤後再查看。若持續無資料，表示績效來源尚未回傳。"
              />
            ) : performance ? (
              <div className="perf-grid">
                <div className="perf-card perf-date">
                  <span className="perf-label">統計日期</span>
                  <strong className="perf-value">{performance.date}</strong>
                </div>
                <div className="perf-card">
                  <span className="perf-label">BUY 訊號數</span>
                  <strong className="perf-value">{performance.buySignals}</strong>
                </div>
                <div className="perf-card">
                  <span className="perf-label">已觸發</span>
                  <strong className="perf-value">{performance.triggered}</strong>
                </div>
                <div className="perf-card">
                  <span className="perf-label">勝率</span>
                  <strong className={`perf-value ${performance.winRate >= 50 ? 'perf-win' : 'perf-loss'}`}>
                    {safeFixed(performance.winRate, 1)}%
                  </strong>
                </div>
                <div className="perf-card">
                  <span className="perf-label">平均報酬</span>
                  <strong className={`perf-value ${performance.avgReturn >= 0 ? 'perf-win' : 'perf-loss'}`}>
                    {performance.avgReturn >= 0 ? '+' : ''}{safeFixed(performance.avgReturn, 2)}%
                  </strong>
                </div>
                <div className="perf-card perf-best">
                  <span className="perf-label">最佳標的</span>
                  <strong className="perf-value perf-win">
                    {performance.bestTicker} +{safeFixed(performance.bestReturn, 2)}%
                  </strong>
                </div>
                <div className="perf-card perf-worst">
                  <span className="perf-label">最差標的</span>
                  <strong className="perf-value perf-loss">
                    {performance.worstTicker} {safeFixed(performance.worstReturn, 2)}%
                  </strong>
                </div>
                <div className="perf-card perf-calibration">
                  <span className="perf-label">模型校準樣本</span>
                  <strong className="perf-value">{performance.predictionCalibration?.sampleSize ?? 0}</strong>
                </div>
                <div className="perf-card perf-calibration">
                  <span className="perf-label">平均預測上漲</span>
                  <strong className="perf-value">
                    {performance.predictionCalibration?.sampleSize
                      ? `${safeFixed(performance.predictionCalibration.avgPredictedUpProbability, 1)}%`
                      : '等待新預測'}
                  </strong>
                </div>
                <div className="perf-card perf-calibration">
                  <span className="perf-label">實際勝率</span>
                  <strong className={`perf-value ${
                    (performance.predictionCalibration?.actualWinRate ?? 0) >= 50 ? 'perf-win' : 'perf-loss'
                  }`}>
                    {performance.predictionCalibration?.sampleSize
                      ? `${safeFixed(performance.predictionCalibration.actualWinRate, 1)}%`
                      : '--'}
                  </strong>
                </div>
                <div className="perf-card perf-calibration">
                  <span className="perf-label">校準落差</span>
                  <strong className={`perf-value ${
                    Math.abs(performance.predictionCalibration?.calibrationGap ?? 0) <= 8 ? 'perf-win' : 'perf-loss'
                  }`}>
                    {performance.predictionCalibration?.sampleSize
                      ? `${performance.predictionCalibration.calibrationGap >= 0 ? '+' : ''}${safeFixed(performance.predictionCalibration.calibrationGap, 1)}%`
                      : '--'}
                  </strong>
                </div>
                <div className="perf-card perf-summary">
                  <span className="perf-label">AI 績效摘要</span>
                  <p className="perf-summary-text">{performance.summary}</p>
                  {performance.predictionCalibration?.sampleSize ? (
                    <p className="perf-summary-text">
                      模型校準：預測 {safeFixed(performance.predictionCalibration.avgPredictedUpProbability, 1)}%，
                      實際 {safeFixed(performance.predictionCalibration.actualWinRate, 1)}%，
                      落差 {performance.predictionCalibration.calibrationGap >= 0 ? '+' : ''}
                      {safeFixed(performance.predictionCalibration.calibrationGap, 1)}%。
                    </p>
                  ) : (
                    <p className="perf-summary-text">模型校準：等待含 PREDv1 的新候選累積樣本。</p>
                  )}
                </div>
              </div>
            ) : null}

            <details className="performance-cycle-panel">
              <summary>
                <div className="panel-subhead">
                  <div>
                    <p>績效閉環</p>
                    <h3>{performanceCycleReport.title}</h3>
                  </div>
                  <button
                    type="button"
                    className="workspace-copy-btn"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        await navigator.clipboard.writeText(performanceCycleReport.markdown);
                      } catch {
                        // Clipboard may be blocked; the report remains visible below.
                      }
                    }}
                  >
                    Copy
                  </button>
                </div>
              </summary>
              <div className="performance-cycle-panel-body">
                <p className="workspace-cycle-summary">{performanceCycleReport.summary}</p>
                <div className="workspace-cycle-checkpoints">
                  {performanceCycleReport.checkpoints.map((item) => (
                    <div key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
                <div className="workspace-cycle-list">
                  {performanceCycleReport.bullets.map((item) => (
                    <div key={item}>{item}</div>
                  ))}
                </div>
                <ol className="workspace-cycle-actions">
                  {performanceCycleReport.actionItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>
            </details>

            <div className="phase-c-section">
              <div className="phase-b-grid">
                <PerformanceDashboard
                  data={perfSummary}
                  loading={perfLoading}
                  error={perfError}
                />
                <SignalReviewPanel rows={signalReviews} />
                <MonitoringManager
                  entries={monitoringEntries}
                  loading={monitoringLoading}
                  error={monitoringError}
                  onRefresh={fetchMonitoringEntries}
                />
              </div>
            </div>
          </div>
        )}

        {settingsOpen && (
          <div className="settings-backdrop" role="presentation" onClick={() => setSettingsOpen(false)}>
            <div className="settings-modal" role="dialog" aria-modal="true" aria-label="工作區設定" onClick={(e) => e.stopPropagation()}>
              <div className="raw-modal-header">
                <div>
                  <p className="raw-modal-eyebrow">WORKSPACE CONTROLS</p>
                  <h2>工作區設定</h2>
                </div>
                <button className="raw-modal-close" onClick={() => setSettingsOpen(false)} aria-label="關閉工作區設定">
                  <X size={16} />
                </button>
              </div>

              <div className="settings-grid">
                <section className="settings-card">
                  <div className="panel-subhead">
                    <div>
                      <p>主題偏好</p>
                      <h3>亮色 / 深色 / 自動</h3>
                    </div>
                    <span>{themeMode}</span>
                  </div>
                  <div className="theme-switch">
                    {(['light', 'dark', 'auto'] as ThemeMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setThemeMode(mode)}
                        className={`theme-btn ${themeMode === mode ? 'active' : ''}`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <p className="settings-note">目前會保留上次選擇，預設仍是偏亮的工作台。</p>
                </section>

                <section className="settings-card">
                  <div className="panel-subhead">
                    <div>
                      <p>自動化</p>
                      <h3>通知與送達</h3>
                    </div>
                    <span>{notificationReceipts.length}</span>
                  </div>
                  <div className="settings-stats">
                    <div>
                      <strong>{permission === 'granted' ? '已授權' : permission === 'denied' ? '已拒絕' : '待確認'}</strong>
                      <span>通知權限</span>
                    </div>
                    <div>
                      <strong>{notificationReceipts.filter((item) => item.ok).length}</strong>
                      <span>成功回執</span>
                    </div>
                    <div>
                      <strong>{notificationReceipts.filter((item) => !item.ok).length}</strong>
                      <span>失敗回執</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="settings-retry-btn"
                    onClick={() => {
                      const failed = notificationReceipts.filter((item) => !item.ok).slice(0, 3);
                      failed.forEach((item) => {
                        void retryNotificationReceipt(item);
                      });
                    }}
                    disabled={notificationReceipts.filter((item) => !item.ok).length === 0}
                  >
                    重送失敗項目
                  </button>
                  <p className="settings-note">這裡只保留有用的送達資訊，不再顯示底層管線名稱。</p>
                </section>

                <details className="settings-card settings-wide">
                  <summary className="panel-subhead">
                    <div>
                      <p>功能完成度</p>
                      <h3>完整版本還剩哪些可再深挖</h3>
                    </div>
                    <span>Roadmap</span>
                  </summary>
                  <div className="settings-roadmap">
                    {workspaceCoverage.map((item) => (
                      <article key={item.feature} className={`roadmap-item ${item.status}`}>
                        <strong>{item.feature}</strong>
                        <span>{item.state}</span>
                      </article>
                    ))}
                  </div>
                </details>
              </div>
            </div>
          </div>
        )}

        {/* 策略對話已整合至工作台與戰情模組 */}
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
      <div className="report-metrics">
        <div>
          <span>策略</span>
          <strong>{report.strategyType || 'N/A'}</strong>
        </div>
        <div>
          <span>動能</span>
          <strong>{report.momentum || 'N/A'}</strong>
        </div>
        <div>
          <span>時間</span>
          <strong>{report.signalTime || report.date}</strong>
        </div>
      </div>
      <p className="verdict">{report.verdictTitle}</p>
      <div className="price-targets">
        <span>🎯 {report.target}{report.targetBasis ? ` (${report.targetBasis})` : ''}</span>
        <span>🛡 {report.stopLoss}{report.stopBasis ? ` (${report.stopBasis})` : ''}</span>
        {report.maAlignment && <span>📊 {report.maAlignment}</span>}
      </div>
      <p className="plan">{report.todayView?.substring(0, 80)}...</p>
      <p className="plan plan-secondary">{report.reason?.substring(0, 110)}</p>
      <div className="card-actions">
        <button onClick={() => onAnalyze(report.ticker)}>重新分析</button>
        <button onClick={() => onKLine(report.ticker)} className="kline-btn">查看 K 線</button>
        <span>{report.date}</span>
      </div>
    </article>
  );
}

function AnalysisCard({ result }: { result: AnalysisResult }) {
  if (result.error === 'analysis_timeout') {
    return (
      <div className="analysis-error">
        <AlertTriangle size={20} />
        <div>
          <p>分析逾時，請稍後再試</p>
          <p className="ap-hint">天網 Omni 引擎處理時間較長，請稍候片刻後重新查詢。</p>
        </div>
      </div>
    );
  }

  if (result.error === 'upstream_error') {
    return (
      <div className="analysis-error">
        <AlertTriangle size={20} />
        <p>資料服務暫時無法連線</p>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="analysis-error">
        <AlertTriangle size={20} />
        <p>{result.error}</p>
      </div>
    );
  }

  // 非結構化回應：有 message 但沒有 action 欄位
  if (result.message && !result.action) {
    return (
      <div className="analysis-processing">
        <Bot size={20} className="text-cyan" />
        <div>
          <p className="ap-title">{result.ticker} — 分析回應</p>
          <p className="ap-desc">{result.message}</p>
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

      {result.analysisMeta && (
        <div className="ac-meta-strip">
          <span>來源 {result.analysisMeta.source}</span>
          {result.analysisMeta.market && <span>市場 {result.analysisMeta.market}</span>}
          <span>回應 {result.analysisMeta.responseKind.toUpperCase()}</span>
          <span>收到 {new Date(result.analysisMeta.receivedAt).toLocaleTimeString('zh-TW', { hour12: false })}</span>
        </div>
      )}

      {/* 資料追溯 */}
      {result.analysisMeta && (
        <details className="ac-trace">
          <summary>
            <span>資料追溯</span>
            <em>{result.analysisMeta.responseKind.toUpperCase()}</em>
          </summary>
          <div className="ac-trace-grid">
            <div>
              <span>來源</span>
              <strong>{result.analysisMeta.source}</strong>
            </div>
            <div>
              <span>收到時間</span>
              <strong>{new Date(result.analysisMeta.receivedAt).toLocaleString('zh-TW', { hour12: false })}</strong>
            </div>
            <div>
              <span>查詢時間</span>
              <strong>{result.queriedAt ? new Date(result.queriedAt).toLocaleString('zh-TW', { hour12: false }) : '--'}</strong>
            </div>
          </div>
          {result.analysisMeta.rawPreview && (
            <pre className="ac-trace-raw">{result.analysisMeta.rawPreview}</pre>
          )}
        </details>
      )}

  <p className="ac-disclaimer">人工判斷執行，天網只提供訊號與風險節奏。</p>
    </div>
  );
}

function DecisionReportPanel({
  report,
  recentQueries,
  onOpenQuery,
  onFocusTicker,
}: {
  report: DecisionReport;
  recentQueries: AnalysisResult[];
  onOpenQuery: (result: AnalysisResult) => void;
  onFocusTicker: (ticker: string) => void;
}) {
  return (
    <section className={`decision-panel mode-${report.mode.toLowerCase()}`}>
      <div className="decision-head">
        <div>
          <p className="decision-eyebrow">今日決策報告</p>
          <h2>{report.title}</h2>
          <p className="decision-summary">{report.summary}</p>
        </div>
        <div className="decision-pill-wrap">
          <span className={`decision-pill ${report.mode.toLowerCase()}`}>{report.mode}</span>
          <span className="decision-generated">
            {report.generatedAt}
          </span>
        </div>
      </div>

      <div className="decision-grid">
        <div className="decision-main">
          <div className="decision-checkpoints">
            {report.checkpoints.map((item) => (
              <div key={item.label} className="decision-checkpoint">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="decision-highlights">
            {report.highlights.map((item, index) => (
              <div key={`${item}-${index}`} className="decision-highlight">
                <Sparkles size={13} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="decision-playback">
          <div className="panel-subhead">
            <div>
              <p>最近回放</p>
              <h3>最新查詢軌跡</h3>
            </div>
            <span>{recentQueries.length}</span>
          </div>
          {recentQueries.length === 0 ? (
            <p className="panel-empty">尚無查詢紀錄，先輸入代號開始建立版本軌跡。</p>
          ) : (
            <div className="decision-playback-list">
              {recentQueries.map((item) => (
                <article key={`${item.ticker}-${item.queriedAt || item.analysisMeta?.receivedAt || item.name || ''}`} className="decision-playback-item">
                  <button type="button" className="decision-playback-ticker" onClick={() => onFocusTicker(item.ticker)}>
                    {item.ticker}
                  </button>
                  <div className="decision-playback-copy">
                    <strong>{item.name || '未命名'}</strong>
                    <span>{item.action || 'QUERY'} · {item.confidence != null ? `${item.confidence}%` : '--'}</span>
                    <em>{formatReviewStamp(item.queriedAt || item.analysisMeta?.receivedAt)}</em>
                  </div>
                  <div className="decision-playback-actions">
                    <button type="button" onClick={() => onOpenQuery(item)}>重播</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function _UpgradeBlueprintPanel({
  blueprint,
}: {
  blueprint: { headline: string; rows: UpgradeBlueprintRow[]; priorities: string[] };
}) {
  return (
    <section className="upgrade-panel">
      <div className="panel-subhead">
        <div>
          <p>可借鏡能力</p>
          <h3>daily_stock_analysis 可直接升級的能力</h3>
        </div>
        <span>{blueprint.rows.length} 項</span>
      </div>

      <p className="upgrade-summary">{blueprint.headline}</p>

      <div className="upgrade-grid">
        {blueprint.rows.map((row) => (
          <article key={row.feature} className={`upgrade-card ${row.status}`}>
            <div className="upgrade-card-head">
              <strong>{row.feature}</strong>
              <span>{row.status === 'ready' ? '已具備' : row.status === 'borrow' ? '可借鏡' : '待建置'}</span>
            </div>
            <p className="upgrade-signal">{row.repoSignal}</p>
            <div className="upgrade-copy">
              <div>
                <span>戰情中心現況</span>
                <strong>{row.currentState}</strong>
              </div>
              <div>
                <span>升級方向</span>
                <strong>{row.upgradePath}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="upgrade-priority">
        <div className="upgrade-priority-head">
          <p>優先級建議</p>
          <span>先做這三項，最有感</span>
        </div>
        <ol>
          {blueprint.priorities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function _NotificationReceiptPanel({
  receipts,
  onRetry,
}: {
  receipts: NotificationReceipt[];
  onRetry: (receipt: NotificationReceipt) => void;
}) {
  return (
    <section className="receipt-panel">
      <div className="panel-subhead">
        <div>
          <p>通知回執</p>
          <h3>最近推送結果</h3>
        </div>
        <span>{receipts.length}</span>
      </div>
      {receipts.length === 0 ? (
        <p className="panel-empty">還沒有通知回執，等戰報或狙擊觸發後會顯示在這裡。</p>
      ) : (
        <div className="receipt-list">
          {receipts.map((item) => (
            <article key={item.id} className={`receipt-item ${item.ok ? 'ok' : 'fail'}`}>
              <div className="receipt-item-head">
                <strong>{item.tag}</strong>
                <span>{item.ok ? '送達' : item.reason === 'denied' ? '被拒絕' : item.reason === 'unsupported' ? '不支援' : '失敗'}</span>
              </div>
              <p className="receipt-title">{item.title}</p>
              <p className="receipt-body">{item.body}</p>
              <div className="receipt-meta">
                <span>{item.source}</span>
                <span>{formatReviewStamp(item.ts)}</span>
                <span>{item.channel}</span>
                {item.detail && <span>{item.detail}</span>}
              </div>
              {!item.ok && (
                <button type="button" className="receipt-retry-btn" onClick={() => onRetry(item)}>
                  重新送出
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function StrategyChatPanel({
  market,
  focusTicker,
  messages,
  draft,
  onDraftChange,
  onSubmit,
  onPickPrompt,
  onFocusTicker,
}: {
  market: MarketPreset;
  focusTicker: string;
  messages: StrategyChatMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: (prompt: string) => void;
  onPickPrompt: (prompt: string) => void;
  onFocusTicker: (ticker: string) => void;
}) {
  const templates = [
    { label: '偏多', prompt: '現在偏多嗎？請給我進場與風控重點。' },
    { label: '避險', prompt: '現在要避險嗎？請直接告訴我防守策略。' },
    { label: '突破', prompt: '目前有哪些突破候選？' },
    { label: '波段', prompt: '適合波段持有的標的是誰？' },
    { label: '焦點', prompt: `請幫我追蹤 ${focusTicker}。` },
  ];

  return (
    <section className="strategy-panel">
      <div className="panel-subhead">
        <div>
          <p>策略對話</p>
          <h3>{market} 模式的追問中心</h3>
        </div>
        <span>{messages.length}</span>
      </div>

      <div className="strategy-shell">
        <div className="strategy-chat">
          <div className="strategy-chat-list">
            {messages.map((message) => (
              <article key={message.id} className={`strategy-bubble ${message.role} ${message.tone || 'neutral'}`}>
                <div className="strategy-bubble-head">
                  <strong>{message.role === 'assistant' ? 'SkyNet Assistant' : 'You'}</strong>
                  <span>{formatReviewStamp(message.stamp)}</span>
                </div>
                <p>{message.content}</p>
              </article>
            ))}
          </div>

          <form
            className="strategy-compose"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit(draft);
            }}
          >
            <textarea
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder="輸入你的策略問題，例如：現在適合偏多嗎？"
              rows={3}
            />
            <div className="strategy-compose-actions">
              <span>焦點 {focusTicker}</span>
              <button type="submit">送出追問</button>
            </div>
          </form>
        </div>

        <div className="strategy-side">
          <div className="strategy-quick">
            <p>快速模板</p>
            <div className="strategy-tags">
              {templates.map((item) => (
                <button key={item.label} type="button" onClick={() => onPickPrompt(item.prompt)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="strategy-actions">
            <p>快速操作</p>
            <button type="button" onClick={() => onFocusTicker(focusTicker)}>帶入焦點到 AI 查詢</button>
            <button type="button" onClick={() => onPickPrompt('請直接幫我整理今日策略重點。')}>整理策略重點</button>
            <button type="button" onClick={() => onPickPrompt('請給我今天最該防守的風險。')}>今天防守</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function AnalysisVersionPanel({
  current,
  history,
  onOpenVersion,
  onOpenRaw,
}: {
  current: AnalysisResult;
  history: AnalysisResult[];
  onOpenVersion: (result: AnalysisResult) => void;
  onOpenRaw: (result: AnalysisResult) => void;
}) {
  const timeline = buildVersionTimeline(history);

  return (
    <section className="version-panel">
      <div className="panel-subhead">
        <div>
          <p>版本追蹤</p>
          <h3>{current.ticker} 單檔分析卡</h3>
        </div>
        <span>{history.length} 版</span>
      </div>
      <div className="version-timeline">
        {timeline.map((item) => (
          <div key={`${item.version}-${item.stamp}`} className={`version-timeline-item ${item.tone}`}>
            <strong>{item.version}</strong>
            <span>{item.stamp}</span>
            <em>{item.trend}</em>
          </div>
        ))}
      </div>
      {history.length === 0 ? (
        <p className="panel-empty">這檔股票還沒有任何歷史版本，這次會是第一版。</p>
      ) : (
        <div className="version-list">
          {history.map((item, index) => (
            <article key={`${item.ticker}-${item.queriedAt || index}`} className={`version-item ${index === 0 ? 'active' : ''}`}>
              <div className="version-item-head">
                <div>
                  <span className="version-tag">v{history.length - index}</span>
                  <strong>{item.action || 'QUERY'}</strong>
                </div>
                <em>{formatReviewStamp(item.queriedAt || item.analysisMeta?.receivedAt)}</em>
              </div>
              <div className="version-item-grid">
                <div>
                  <span>信心</span>
                  <strong>{item.confidence != null ? `${item.confidence}%` : '--'}</strong>
                </div>
                <div>
                  <span>目標 / 防守</span>
                  <strong>{item.target || '--'} / {item.stopLoss || '--'}</strong>
                </div>
                <div>
                  <span>版本來源</span>
                  <strong>{item.analysisMeta?.source || 'live'}</strong>
                </div>
              </div>
              <p className="version-item-text">{item.reason || item.todayView || item.message || '尚無摘要'}</p>
              <details className="version-diff">
                <summary>
                  <span>版本差異</span>
                  <em>{index === history.length - 1 ? '首版' : `對比 v${history.length - index + 1}`}</em>
                </summary>
                <div className="version-diff-list">
                  {buildVersionDiffRows(item, history[index + 1] ?? null).map((row) => (
                    <div key={row.label} className={`version-diff-row ${row.tone}`}>
                      <span>{row.label}</span>
                      <strong>{row.current}</strong>
                      <em>{row.previous}</em>
                    </div>
                  ))}
                </div>
              </details>
              <div className="version-item-actions">
                <button type="button" onClick={() => onOpenVersion(item)}>切換版本</button>
                {item.analysisMeta?.rawBody && (
                  <button type="button" onClick={() => onOpenRaw(item)}>原始 JSON</button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function HistoryArchivePanel({
  groups,
  onOpenVersion,
  onOpenRaw,
}: {
  groups: TickerHistoryGroup[];
  onOpenVersion: (result: AnalysisResult) => void;
  onOpenRaw: (result: AnalysisResult) => void;
}) {
  return (
    <section className="archive-panel">
      <div className="panel-subhead">
        <div>
          <p>歷史回放</p>
          <h3>依標的歸檔</h3>
        </div>
        <span>{groups.length}</span>
      </div>
      <div className="archive-grid">
        {groups.map((group) => (
          <article key={group.ticker} className="archive-card">
            <div className="archive-card-head">
              <div>
                <strong>{group.ticker}</strong>
                <span>{group.name || '未命名'}</span>
              </div>
              <em>
                {group.count} 版 · {summarizeVersionTrend(group.latest, group.versions[1] ?? null).label}
              </em>
            </div>
            <div className="archive-card-meta">
              <span>{group.latest.action || 'QUERY'}</span>
              <span>{group.latest.confidence != null ? `${group.latest.confidence}%` : '--'}</span>
              <span>{formatReviewStamp(group.latest.queriedAt || group.latest.analysisMeta?.receivedAt)}</span>
            </div>
            <p className="archive-card-text">{group.latest.reason || group.latest.todayView || group.latest.message || '尚無摘要'}</p>
            <div className="archive-version-strip">
              {group.versions.map((item, index) => (
                <button key={`${group.ticker}-${item.queriedAt || index}`} type="button" onClick={() => onOpenVersion(item)}>
                  v{group.count - index}
                </button>
              ))}
            </div>
            <div className="archive-card-actions">
              <button type="button" onClick={() => onOpenVersion(group.latest)}>打開最新</button>
              {group.latest.analysisMeta?.rawBody && (
                <button type="button" onClick={() => onOpenRaw(group.latest)}>原始 JSON</button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ComparisonPanel({ current, previous }: { current: AnalysisResult; previous: AnalysisResult }) {
  const rows = [
    { label: '動能', current: current.momentum || '--', previous: previous.momentum || '--' },
    { label: '策略', current: current.strategyType || '--', previous: previous.strategyType || '--' },
    { label: '信心', current: current.confidence != null ? `${current.confidence}%` : '--', previous: previous.confidence != null ? `${previous.confidence}%` : '--' },
    { label: '目標價', current: current.target || '--', previous: previous.target || '--' },
    { label: '防守價', current: current.stopLoss || '--', previous: previous.stopLoss || '--' },
    { label: '評定', current: current.verdictTitle || '--', previous: previous.verdictTitle || '--' },
  ];

  return (
    <section className="compare-panel">
      <div className="compare-head">
        <div>
          <p className="compare-eyebrow">結果比對</p>
          <h2>本次 vs 上次</h2>
        </div>
        <span className="compare-badge">COMPARE</span>
      </div>
      <div className="compare-grid">
        <div className="compare-column current">
          <span>本次查詢</span>
          <strong>{current.ticker} {current.name || ''}</strong>
          <em>{current.queriedAt ? new Date(current.queriedAt).toLocaleString('zh-TW', { hour12: false }) : '--'}</em>
        </div>
        <div className="compare-column previous">
          <span>上次比對</span>
          <strong>{previous.ticker} {previous.name || ''}</strong>
          <em>{previous.queriedAt ? new Date(previous.queriedAt).toLocaleString('zh-TW', { hour12: false }) : '--'}</em>
        </div>
      </div>
      <div className="compare-table">
        {rows.map((row) => (
          <div key={row.label} className="compare-row">
            <span>{row.label}</span>
            <strong>{row.current}</strong>
            <em>{row.previous}</em>
          </div>
        ))}
      </div>
    </section>
  );
}
