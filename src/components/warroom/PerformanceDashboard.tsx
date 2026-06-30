'use client';

import { BarChart2, WifiOff, TrendingUp, TrendingDown, Award } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getTwseColorClass } from '@/lib/colorUtils';

// ── 型別定義 ──────────────────────────────────────────

export interface PersonalTrade {
  ticker: string;
  name: string;
  buyCost: number;
  sellPrice: number | null;
  pnl: number | null;
  returnRate: number | null;
  date: string;
}

export interface PerformanceSummary {
  totalTrades: number;
  winRate: number;
  avgReturn: number;
  maxDrawdown: number;
  trades: PersonalTrade[];
  cumulativeReturns?: { date: string; value: number }[];
  /** 舊欄位相容 */
  equityCurve?: { date: string; cumReturn: number }[];
}

interface PerformanceDashboardProps {
  data: PerformanceSummary | null;
  loading: boolean;
  error: string | null;
}

function safeFixed(value: unknown, digits: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--';
}

// ── 子元件：摘要卡片 ──────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string;
  colorClass?: string;
  icon?: React.ReactNode;
}

function SummaryCard({ label, value, colorClass = 'text-gray-200', icon }: SummaryCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 flex flex-col gap-1 min-w-0">
      <div className="flex items-center gap-1 text-gray-400 text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <span className={`text-lg font-bold ${colorClass}`}>{value}</span>
    </div>
  );
}

// ── 主元件 ────────────────────────────────────────────

export default function PerformanceDashboard({
  data,
  loading,
  error,
}: PerformanceDashboardProps) {
  // 統一 cumulativeReturns 欄位（相容舊版 equityCurve）
  const chartData: { date: string; value: number }[] = (() => {
    if (!data) return [];
    if (data.cumulativeReturns && data.cumulativeReturns.length > 0) {
      return data.cumulativeReturns;
    }
    if (data.equityCurve && data.equityCurve.length > 0) {
      return data.equityCurve.map((p) => ({ date: p.date, value: p.cumReturn }));
    }
    return [];
  })();

  return (
    <div className="warroom-panel">
      {/* 標題列 */}
      <div className="warroom-panel-header">
        <BarChart2 size={16} className="text-purple-400" />
        <span className="warroom-panel-title">個人績效儀表板</span>
      </div>

      {/* 載入中 */}
      {loading && (
        <div className="warroom-panel-loading">載入績效資料中...</div>
      )}

      {/* API 失敗 */}
      {error && !loading && (
        <div className="warroom-panel-error">
          <WifiOff size={14} />
          <span>績效資料源異常，請稍後重試</span>
        </div>
      )}

      {/* 無資料 */}
      {!loading && !error && !data && (
        <div className="warroom-panel-empty">尚無已結算交易績效</div>
      )}

      {/* 有資料 */}
      {!loading && !error && data && (
        <>
          {/* 績效摘要 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <SummaryCard
              label="總交易次數"
              value={`${data.totalTrades} 筆`}
              icon={<Award size={12} />}
            />
            <SummaryCard
              label="勝率"
              value={`${safeFixed(data.winRate, 1)}%`}
              colorClass={getTwseColorClass(data.winRate - 50)}
              icon={<TrendingUp size={12} />}
            />
            <SummaryCard
              label="平均報酬率"
              value={`${data.avgReturn >= 0 ? '+' : ''}${safeFixed(data.avgReturn, 2)}%`}
              colorClass={getTwseColorClass(data.avgReturn)}
              icon={<TrendingUp size={12} />}
            />
            <SummaryCard
              label="最大回撤"
              value={`${safeFixed(data.maxDrawdown, 2)}%`}
              colorClass={getTwseColorClass(data.maxDrawdown)}
              icon={<TrendingDown size={12} />}
            />
          </div>

          {/* 累積報酬率折線圖 */}
          {chartData.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-400 text-xs mb-2">累積報酬率（%）</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart
                  data={chartData}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: '#374151' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: '#374151' }}
                    tickFormatter={(v: number) => `${safeFixed(v, 1)}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#e5e7eb',
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any) => {
                      const num = typeof value === 'number' ? value : parseFloat(String(value));
                      return [`${Number.isNaN(num) ? '0.00' : safeFixed(num, 2)}%`, '累積報酬率'] as [string, string];
                    }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#a78bfa' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 已賣出交易明細 */}
          {data.trades.length === 0 ? (
            <div className="warroom-panel-empty">尚無已結算交易績效</div>
          ) : (
            <div className="position-table-wrap">
              <table className="position-table">
                <thead>
                  <tr>
                    <th>代號</th>
                    <th>名稱</th>
                    <th>買入成本</th>
                    <th>賣出價格</th>
                    <th>損益(元)</th>
                    <th>報酬率</th>
                    <th>日期</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trades.map((trade, idx) => {
                    const colorClass =
                      trade.returnRate != null
                        ? getTwseColorClass(trade.returnRate)
                        : 'text-gray-400';
                    return (
                      <tr key={`${trade.ticker}-${idx}`}>
                        <td className="font-mono text-yellow-300">{trade.ticker}</td>
                        <td>{trade.name}</td>
                        <td>{safeFixed(trade.buyCost, 2)}</td>
                        <td>
                          {trade.sellPrice != null
                            ? safeFixed(trade.sellPrice, 2)
                            : '--'}
                        </td>
                        <td className={colorClass}>
                          {trade.pnl != null
                            ? `${trade.pnl >= 0 ? '+' : ''}${Math.round(trade.pnl).toLocaleString()}`
                            : '--'}
                        </td>
                        <td className={colorClass}>
                          {trade.returnRate != null
                            ? `${trade.returnRate >= 0 ? '+' : ''}${safeFixed(trade.returnRate, 2)}%`
                            : '--'}
                        </td>
                        <td className="text-gray-500 text-xs">{trade.date}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
