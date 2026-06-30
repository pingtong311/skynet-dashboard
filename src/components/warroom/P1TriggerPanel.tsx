'use client';

import { ShieldCheck, WifiOff } from 'lucide-react';

export interface P1Trigger {
  ticker: string;
  name: string;
  triggerType: '止盈' | '止損';
  triggerPrice: number;
  triggeredAt: string;
}

interface P1TriggerPanelProps {
  triggers: P1Trigger[];
  loading: boolean;
  error: string | null;
}

export default function P1TriggerPanel({ triggers, loading, error }: P1TriggerPanelProps) {
  return (
    <div className="warroom-panel">
      <div className="warroom-panel-header">
        <ShieldCheck size={16} className="text-emerald-400" />
        <span className="warroom-panel-title">止盈止損觸發紀錄</span>
      </div>

      {loading && <div className="warroom-panel-loading">載入觸發紀錄中...</div>}

      {error && !loading && (
        <div className="warroom-panel-error">
          <WifiOff size={14} />
          <span>觸發紀錄資料源異常，請稍後重試</span>
        </div>
      )}

      {!loading && !error && triggers.length === 0 && (
        <div className="warroom-panel-empty">今日尚無觸發紀錄</div>
      )}

      {!loading && !error && triggers.length > 0 && (
        <div className="p1-trigger-list">
          {triggers.map((t, i) => (
            <div key={i} className={`p1-trigger-item ${t.triggerType === '止盈' ? 'take-profit' : 'stop-loss'}`}>
              <span className="p1-trigger-icon">
                {t.triggerType === '止盈' ? '🎯' : '⚠️'}
              </span>
              <div className="p1-trigger-info">
                <span className="p1-trigger-ticker">{t.ticker}</span>
                <span className="p1-trigger-name text-gray-400 text-xs">{t.name}</span>
              </div>
              <div className="p1-trigger-detail">
                <span className={t.triggerType === '止盈' ? 'text-red-400' : 'text-green-400'}>
                  {t.triggerType}
                </span>
                <span className="text-gray-300 text-sm">@ {t.triggerPrice}</span>
              </div>
              <span className="p1-trigger-time text-gray-500 text-xs">{t.triggeredAt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
