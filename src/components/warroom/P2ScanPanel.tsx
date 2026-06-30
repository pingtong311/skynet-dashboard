'use client';

import { Sparkles, WifiOff } from 'lucide-react';

export interface P2Candidate {
  ticker: string;
  name: string;
  confidence: number;
  triggerPrice: number;
  source: 'POST_MARKET_SCAN';
}

function safeFixed(value: unknown, digits: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--';
}

interface P2ScanPanelProps {
  candidates: P2Candidate[];
  loading: boolean;
  error: string | null;
  onTickerClick: (ticker: string) => void;
}

export default function P2ScanPanel({ candidates, loading, error, onTickerClick }: P2ScanPanelProps) {
  return (
    <div className="warroom-panel">
      <div className="warroom-panel-header">
        <Sparkles size={16} className="text-purple-400" />
        <span className="warroom-panel-title">收盤選股結果</span>
        <span className="text-gray-500 text-xs ml-1">POST_MARKET_SCAN</span>
      </div>

      {loading && <div className="warroom-panel-loading">載入收盤選股中...</div>}

      {error && !loading && (
        <div className="warroom-panel-error">
          <WifiOff size={14} />
          <span>收盤選股資料源異常，請稍後重試</span>
        </div>
      )}

      {!loading && !error && candidates.length === 0 && (
        <div className="warroom-panel-empty">今日尚無收盤選股結果</div>
      )}

      {!loading && !error && candidates.length > 0 && (
        <div className="p2-candidate-list">
          {candidates.map((c, i) => (
            <div key={c.ticker} className="p2-candidate-item">
              <span className="p2-rank text-gray-500 text-xs w-5">#{i + 1}</span>
              <button
                onClick={() => onTickerClick(c.ticker)}
                className="ticker-cell-btn font-mono"
              >
                {c.ticker}
              </button>
              <span className="p2-name text-gray-300 text-sm flex-1">{c.name}</span>
              <span className="p2-price text-gray-400 text-sm">
                觸發 {c.triggerPrice > 0 ? safeFixed(c.triggerPrice, 2) : '--'}
              </span>
              <span className={`p2-confidence text-xs px-2 py-0.5 rounded ${
                c.confidence >= 80 ? 'bg-red-900 text-red-300' :
                c.confidence >= 60 ? 'bg-yellow-900 text-yellow-300' :
                'bg-gray-800 text-gray-400'
              }`}>
                {c.confidence}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
