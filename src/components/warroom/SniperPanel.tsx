'use client';

import { Crosshair, WifiOff, LogOut } from 'lucide-react';
import { calcDistancePct, getDistanceColorClass } from '@/lib/distanceCalculator';

export interface SniperItem {
  ticker: string;
  name: string;
  triggerPrice: number;
  stopPrice: number;
  currentPrice: number | null;
  distPct: number | null;
  status: '待觸發' | '已觸發' | '已撤退';
  source: '/watch' | 'POST_MARKET_SCAN' | string;
  date: string;
}

function safeFixed(value: unknown, digits: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--';
}

interface SniperPanelProps {
  snipers: SniperItem[];
  loading: boolean;
  error: string | null;
  isTrading: boolean;
  onTickerClick: (ticker: string) => void;
  onRetreat: (ticker: string) => void;
}

export default function SniperPanel({
  snipers, loading, error, onTickerClick, onRetreat
}: SniperPanelProps) {
  const pending = snipers.filter(s => s.status === '待觸發');

  return (
    <div className="warroom-panel">
      <div className="warroom-panel-header">
        <Crosshair size={16} className="text-red-400" />
        <span className="warroom-panel-title">狙擊候選</span>
        <span className="text-gray-500 text-xs ml-1">({pending.length} 待觸發)</span>
      </div>

      {loading && <div className="warroom-panel-loading">載入狙擊清單中...</div>}

      {error && !loading && (
        <div className="warroom-panel-error">
          <WifiOff size={14} />
          <span>狙擊清單資料源異常，請稍後重試</span>
        </div>
      )}

      {!loading && !error && pending.length === 0 && (
        <div className="warroom-panel-empty">目前無待觸發標的</div>
      )}

      {!loading && !error && pending.length > 0 && (
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
                <th>來源</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((s) => {
                const dist = s.currentPrice != null && s.triggerPrice > 0
                  ? calcDistancePct(s.triggerPrice, s.currentPrice)
                  : s.distPct;
                const distColor = dist != null ? getDistanceColorClass(dist) : 'text-gray-400';

                return (
                  <tr key={s.ticker}>
                    <td>
                      <button
                        onClick={() => onTickerClick(s.ticker)}
                        className="ticker-cell-btn"
                      >
                        {s.ticker}
                      </button>
                    </td>
                    <td>{s.name}</td>
                    <td className="price-cell">{s.triggerPrice || '--'}</td>
                    <td className="price-cell stop">{s.stopPrice || '--'}</td>
                    <td className="price-cell current">
                      {s.currentPrice != null ? safeFixed(s.currentPrice, 2) : '--'}
                    </td>
                    <td className={`dist-cell ${distColor}`}>
                      {dist != null ? `${safeFixed(dist, 1)}%` : '--'}
                    </td>
                    <td className="source-cell text-xs text-gray-500">
                      {s.source === 'POST_MARKET_SCAN' ? '收盤選股' : '/watch'}
                    </td>
                    <td>
                      <button
                        onClick={() => onRetreat(s.ticker)}
                        className="retreat-btn"
                        title={`撤退 ${s.ticker}`}
                      >
                        <LogOut size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
