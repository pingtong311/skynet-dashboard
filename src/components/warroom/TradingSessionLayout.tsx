'use client';

import { type TradingSession } from '@/lib/tradingSessionUtils';
import SessionTabBar from './SessionTabBar';

interface TradingSessionLayoutProps {
  session: TradingSession;
  manualSession: TradingSession | null;
  onManualSelect: (session: TradingSession | null) => void;
  preMarketContent: React.ReactNode;
  tradingContent: React.ReactNode;
  postMarketContent: React.ReactNode;
  weekendContent: React.ReactNode;
}

export default function TradingSessionLayout({
  session,
  manualSession,
  onManualSelect,
  preMarketContent,
  tradingContent,
  postMarketContent,
  weekendContent,
}: TradingSessionLayoutProps) {
  const activeSession = manualSession ?? session;

  const contentMap: Record<TradingSession, React.ReactNode> = {
    'pre-market': preMarketContent,
    'trading': tradingContent,
    'post-market': postMarketContent,
    'weekend': weekendContent,
  };

  return (
    <div className="trading-session-layout">
      <SessionTabBar
        currentSession={session}
        manualSession={manualSession}
        onManualSelect={onManualSelect}
      />
      <div className="session-content">
        {contentMap[activeSession]}
      </div>
    </div>
  );
}
