'use client';

import { type TradingSession } from '@/lib/tradingSessionUtils';
import { Sun, Activity, Moon, RotateCcw } from 'lucide-react';

interface SessionTabBarProps {
  currentSession: TradingSession;
  manualSession: TradingSession | null;
  onManualSelect: (session: TradingSession | null) => void;
}

const SESSION_TABS: { id: TradingSession; label: string; icon: React.ElementType }[] = [
  { id: 'pre-market', label: '開盤前', icon: Sun },
  { id: 'trading', label: '盤中', icon: Activity },
  { id: 'post-market', label: '收盤後', icon: Moon },
];

const SESSION_LABEL: Record<TradingSession, string> = {
  'pre-market': '開盤前',
  'trading': '盤中',
  'post-market': '收盤後',
  'weekend': '非交易日',
};

export default function SessionTabBar({ currentSession, manualSession, onManualSelect }: SessionTabBarProps) {
  const activeSession = manualSession ?? currentSession;

  return (
    <div className="session-tabbar session-tabbar-light">
      <div className="session-auto-label">
        <span>時段：{SESSION_LABEL[currentSession]}</span>
      </div>
      <div className="session-tabs">
        {SESSION_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onManualSelect(id === manualSession ? null : id)}
            className={`session-tab ${activeSession === id ? 'active' : ''} ${manualSession === id ? 'manual' : ''}`}
          >
            <Icon size={13} />
            <span>{label}</span>
          </button>
        ))}

        {manualSession !== null && (
          <button
            onClick={() => onManualSelect(null)}
            className="session-tab-reset"
            title="重置"
          >
            <RotateCcw size={13} />
            <span>自動</span>
          </button>
        )}
      </div>
    </div>
  );
}
