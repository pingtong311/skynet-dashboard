'use client';

import { Wallet, WifiOff, Clock, TrendingUp } from 'lucide-react';
import { calcPnL, calcReturnRate } from '@/lib/pnlCalculator';
import { getTwseColorClass } from '@/lib/colorUtils';

export interface Position {
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number | null;
  pnl: number | null;
  returnRate: number | null;
  targetPrice?: number;
  stopPrice?: number;
  type: 'ETF' | '個股';
}

function safeFixed(value: unknown, digits: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--';
}

interface PositionCardProps {
  positions: Position[];
  loading: boolean;
  error: string | null;
  isTrading: boolean;
  lastUpdated: string | null;
  onTickerClick: (ticker: string) => void;
}

export default function PositionCard({
  positions, loading, error, isTrading, lastUpdated, onTickerClick
}: PositionCardProps) {
  const totalPnl = positions.reduce((sum, p) => {
    const pnl = p.currentPrice != null
      ? calcPnL(p.currentPrice, p.avgCost, p.shares)
      : (p.pnl ?? 0);
    return sum + pnl;
  }, 0);

  return (
    <div className="warroom-panel">
      <div className="warroom-panel-header">
        <Wallet size={16} className="text-yellow-400" />
        <span className="warroom-panel-title">持倉損益</span>
        {!isTrading && (
          <span className="pill muted ml-2 text-xs"><Clock size={12} /> 非交易時段</span>
        )}
        {lastUpdated && (
          <span className="text-gray-600 text-xs ml-auto">{lastUpdated}</span>
        )}
      </div>

      {loading && <div className="warroom-panel-loading">載入持倉中...</div>}

      {error && !loading && (
        <div className="warroom-panel-error">
          <WifiOff size={14} />
          <span>持倉或報價資料源異常，請稍後重試</span>
        </div>
      )}

      {!loading && !error && positions.length === 0 && (
        <div className="warroom-panel-empty">目前無持倉資料</div>
      )}

      {!loading && !error && positions.length > 0 && (
        <>
          <div className="position-table-wrap">
            <table className="position-table">
              <thead>
                <tr>
                  <th>代號</th>
                  <th>名稱</th>
                  <th>股數</th>
                  <th>成本</th>
                  <th>現價</th>
                  <th>損益(元)</th>
                  <th>報酬率</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  const price = p.currentPrice;
                  const pnl = price != null ? calcPnL(price, p.avgCost, p.shares) : p.pnl;
                  const rate = price != null ? calcReturnRate(price, p.avgCost) : p.returnRate;
                  const colorClass = pnl != null ? getTwseColorClass(pnl) : 'text-gray-400';

                  return (
                    <tr key={p.ticker}>
                      <td>
                        <button
                          onClick={() => onTickerClick(p.ticker)}
                          className="ticker-cell-btn"
                          title={`查看 ${p.ticker} K 線圖`}
                        >
                          {p.ticker}
                        </button>
                      </td>
                      <td>{p.name}</td>
                      <td>{p.shares.toLocaleString()}</td>
                      <td>{safeFixed(p.avgCost, 2)}</td>
                      <td className={price != null ? getTwseColorClass(price - p.avgCost) : 'text-gray-400'}>
                        {price != null ? safeFixed(price, 2) : '--'}
                      </td>
                      <td className={colorClass}>
                        {pnl != null ? `${pnl >= 0 ? '+' : ''}${Math.round(pnl).toLocaleString()}` : '--'}
                      </td>
                      <td className={colorClass}>
                        {rate != null ? `${rate >= 0 ? '+' : ''}${safeFixed(rate, 2)}%` : '--'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 總損益 */}
          <div className={`position-total ${getTwseColorClass(totalPnl)}`}>
            <TrendingUp size={14} />
            <span>總浮動損益：</span>
            <strong>{totalPnl >= 0 ? '+' : ''}{Math.round(totalPnl).toLocaleString()} 元</strong>
          </div>
        </>
      )}
    </div>
  );
}
