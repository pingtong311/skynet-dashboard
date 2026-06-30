'use client';

import { Users, WifiOff } from 'lucide-react';
import { getTwseColorClass } from '@/lib/colorUtils';

interface InstitutionalLeg {
  buy: number;
  sell: number;
  net: number;
}

function safeFixed(value: unknown, digits: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--';
}

export interface InstitutionalData {
  foreign: InstitutionalLeg;
  trust: InstitutionalLeg;
  dealer: InstitutionalLeg;
  date: string;
}

interface InstitutionalPanelProps {
  data: InstitutionalData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

function LegRow({ label, leg }: { label: string; leg: InstitutionalLeg }) {
  const netBil = safeFixed(leg.net / 1e8, 2);
  const colorClass = getTwseColorClass(leg.net);
  return (
    <div className="institutional-row">
      <span className="inst-label">{label}</span>
      <span className="inst-buy text-red-400">{safeFixed(leg.buy / 1e8, 1)} 億</span>
      <span className="inst-sell text-green-400">{safeFixed(leg.sell / 1e8, 1)} 億</span>
      <span className={`inst-net font-semibold ${colorClass}`}>
        {leg.net >= 0 ? '+' : ''}{netBil} 億
      </span>
    </div>
  );
}

export default function InstitutionalPanel({ data, loading, error, lastUpdated }: InstitutionalPanelProps) {
  return (
    <div className="warroom-panel">
      <div className="warroom-panel-header">
        <Users size={16} className="text-blue-400" />
        <span className="warroom-panel-title">三大法人買賣超</span>
        {data?.date && <span className="text-gray-500 text-xs ml-1">{data.date}</span>}
        {lastUpdated && <span className="text-gray-600 text-xs ml-auto">{lastUpdated}</span>}
      </div>

      {loading && <div className="warroom-panel-loading">載入法人數據中...</div>}

      {error && !loading && (
        <div className="warroom-panel-error">
          <WifiOff size={14} />
          <span>法人數據資料源異常，請稍後重試</span>
        </div>
      )}

      {!loading && !error && !data && (
        <div className="warroom-panel-empty">今日法人數據尚未更新</div>
      )}

      {!loading && !error && data && (
        <div className="institutional-table">
          <div className="institutional-header">
            <span></span>
            <span className="text-xs text-gray-500">買超</span>
            <span className="text-xs text-gray-500">賣超</span>
            <span className="text-xs text-gray-500">淨買賣超</span>
          </div>
          <LegRow label="外資" leg={data.foreign} />
          <LegRow label="投信" leg={data.trust} />
          <LegRow label="自營商" leg={data.dealer} />
          <div className="institutional-total">
            <span className="inst-label font-semibold">合計</span>
            <span></span>
            <span></span>
            <span className={`inst-net font-bold ${getTwseColorClass(data.foreign.net + data.trust.net + data.dealer.net)}`}>
              {safeFixed((data.foreign.net + data.trust.net + data.dealer.net) / 1e8, 2)} 億
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
