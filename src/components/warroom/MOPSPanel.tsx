'use client';

import { FileText, WifiOff, ExternalLink } from 'lucide-react';

export interface MOPSAnnouncement {
  ticker: string;
  companyName: string;
  title: string;
  announcedAt: string;
  url: string;
}

interface MOPSPanelProps {
  announcements: MOPSAnnouncement[];
  loading: boolean;
  error: string | null;
  tickers: string[];
}

export default function MOPSPanel({ announcements, loading, error, tickers }: MOPSPanelProps) {
  return (
    <div className="warroom-panel">
      <div className="warroom-panel-header">
        <FileText size={16} className="text-indigo-400" />
        <span className="warroom-panel-title">重大訊息公告</span>
        {tickers.length > 0 && (
          <span className="text-gray-500 text-xs ml-1">({tickers.join(', ')})</span>
        )}
        <a
          href="https://mops.twse.com.tw"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-gray-500 hover:text-gray-300 text-xs flex items-center gap-1"
        >
          MOPS <ExternalLink size={10} />
        </a>
      </div>

      {loading && <div className="warroom-panel-loading">載入重大訊息中...</div>}

      {error && !loading && (
        <div className="warroom-panel-error">
          <WifiOff size={14} />
          <span>重大訊息資料源異常，請稍後重試</span>
        </div>
      )}

      {!loading && !error && announcements.length === 0 && (
        <div className="warroom-panel-empty">近期無重大訊息公告</div>
      )}

      {!loading && !error && announcements.length > 0 && (
        <div className="mops-list">
          {announcements.map((a, i) => (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mops-item"
            >
              <div className="mops-item-left">
                <span className="mops-ticker font-mono text-xs text-cyan-400">{a.ticker}</span>
                <span className="mops-title text-sm text-gray-200">{a.title}</span>
              </div>
              <span className="mops-date text-xs text-gray-500 whitespace-nowrap">{a.announcedAt}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
