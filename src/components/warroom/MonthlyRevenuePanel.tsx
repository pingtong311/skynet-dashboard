'use client';

import { BarChart2, WifiOff } from 'lucide-react';
import { getTwseColorClass } from '@/lib/colorUtils';

export interface MonthlyRevenue {
  ticker: string;
  name: string;
  revenue: number;
  momChange: number;
  yoyChange: number;
  period: string;
}

function safeFixed(value: unknown, digits: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--';
}

interface MonthlyRevenuePanelProps {
  revenues: MonthlyRevenue[];
  loading: boolean;
  error: string | null;
}

export default function MonthlyRevenuePanel({ revenues, loading, error }: MonthlyRevenuePanelProps) {
  return (
    <div className="warroom-panel">
      <div className="warroom-panel-header">
        <BarChart2 size={16} className="text-teal-400" />
        <span className="warroom-panel-title">月營收</span>
      </div>

      {loading && <div className="warroom-panel-loading">載入月營收中...</div>}

      {error && !loading && (
        <div className="warroom-panel-error">
          <WifiOff size={14} />
          <span>月營收資料源異常，請稍後重試</span>
        </div>
      )}

      {!loading && !error && revenues.length === 0 && (
        <div className="warroom-panel-empty">目前尚無月營收資料</div>
      )}

      {!loading && !error && revenues.length > 0 && (
        <div className="revenue-table-wrap">
          <table className="revenue-table">
            <thead>
              <tr>
                <th>代號</th>
                <th>名稱</th>
                <th>期間</th>
                <th>營收(百萬)</th>
                <th>月增率</th>
                <th>年增率</th>
              </tr>
            </thead>
            <tbody>
              {revenues.map((r) => (
                <tr key={r.ticker}>
                  <td className="font-mono text-sm">{r.ticker}</td>
                  <td className="text-gray-300 text-sm">{r.name}</td>
                  <td className="text-gray-500 text-xs">{r.period}</td>
                  <td className="text-right text-sm">{r.revenue.toLocaleString()}</td>
                  <td className={`text-right text-sm ${getTwseColorClass(r.momChange)}`}>
                    {r.momChange >= 0 ? '+' : ''}{safeFixed(r.momChange, 1)}%
                  </td>
                  <td className={`text-right text-sm font-semibold ${getTwseColorClass(r.yoyChange)}`}>
                    {r.yoyChange >= 0 ? '+' : ''}{safeFixed(r.yoyChange, 1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
