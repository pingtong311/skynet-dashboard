'use client';

import { TrendingDown, WifiOff, Star } from 'lucide-react';

export interface MarginData {
  ticker: string;
  name: string;
  marginBalance: number;
  marginChange: number;
  shortBalance: number;
  shortChange: number;
  isClean: boolean;
}

interface MarginPanelProps {
  margins: MarginData[];
  loading: boolean;
  error: string | null;
}

export default function MarginPanel({ margins, loading, error }: MarginPanelProps) {
  return (
    <div className="warroom-panel">
      <div className="warroom-panel-header">
        <TrendingDown size={16} className="text-orange-400" />
        <span className="warroom-panel-title">融資融券餘額</span>
      </div>

      {loading && <div className="warroom-panel-loading">載入融資融券中...</div>}

      {error && !loading && (
        <div className="warroom-panel-error">
          <WifiOff size={14} />
          <span>融資融券資料源異常，請稍後重試</span>
        </div>
      )}

      {!loading && !error && margins.length === 0 && (
        <div className="warroom-panel-empty">目前尚無融資融券資料</div>
      )}

      {!loading && !error && margins.length > 0 && (
        <div className="margin-table-wrap">
          <table className="margin-table">
            <thead>
              <tr>
                <th>代號</th>
                <th>名稱</th>
                <th>融資餘額</th>
                <th>融資增減</th>
                <th>融券餘額</th>
                <th>融券增減</th>
              </tr>
            </thead>
            <tbody>
              {margins.map((m) => (
                <tr key={m.ticker} className={m.isClean ? 'row-clean' : ''}>
                  <td className="font-mono text-sm">
                    {m.ticker}
                    {m.isClean && <Star size={10} className="inline ml-1 text-yellow-400" />}
                  </td>
                  <td className="text-gray-300 text-sm">{m.name}</td>
                  <td className="text-right text-sm">{m.marginBalance.toLocaleString()}</td>
                  <td className={`text-right text-sm ${m.marginChange > 0 ? 'text-red-400' : m.marginChange < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                    {m.marginChange > 0 ? '+' : ''}{m.marginChange.toLocaleString()}
                  </td>
                  <td className="text-right text-sm">{m.shortBalance.toLocaleString()}</td>
                  <td className={`text-right text-sm ${m.shortChange > 0 ? 'text-red-400' : m.shortChange < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                    {m.shortChange > 0 ? '+' : ''}{m.shortChange.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-gray-600 text-xs mt-1">⭐ = 融資減少且股價上漲（籌碼乾淨）</p>
        </div>
      )}
    </div>
  );
}
