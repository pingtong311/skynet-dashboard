'use client';

import { Target, TrendingDown, TrendingUp } from 'lucide-react';
import { getTwseColorClass } from '@/lib/colorUtils';

export interface SignalReviewRow {
  key: string;
  date: string;
  ticker: string;
  name: string;
  action: 'BUY' | 'SELL' | 'WAIT';
  entryPrice: number;
  targetPrice: number | null;
  stopPrice: number | null;
  latestPrice: number;
  maxPrice: number;
  minPrice: number;
  confidence: number;
  observations: number;
  updatedAt: string;
}

interface SignalReviewPanelProps {
  rows: SignalReviewRow[];
}

function safeFixed(value: unknown, digits: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--';
}

function pct(from: number, to: number) {
  if (!Number.isFinite(from) || from <= 0 || !Number.isFinite(to)) return null;
  return ((to - from) / from) * 100;
}

function statusOf(row: SignalReviewRow) {
  if (row.action !== 'BUY') return '觀察';
  if (row.targetPrice != null && row.maxPrice >= row.targetPrice) return '達標';
  if (row.stopPrice != null && row.minPrice <= row.stopPrice) return '觸停損';
  return '追蹤中';
}

export default function SignalReviewPanel({ rows }: SignalReviewPanelProps) {
  const visibleRows = rows.slice(0, 30);

  return (
    <div className="warroom-panel signal-review-panel">
      <div className="warroom-panel-header">
        <Target size={16} className="text-emerald-400" />
        <span className="warroom-panel-title">戰報命中復盤</span>
        <span className="text-gray-500 text-xs ml-1">近 5 交易日觀測</span>
      </div>

      {visibleRows.length === 0 ? (
        <div className="warroom-panel-empty">尚無可復盤戰報，取得 BUY/SELL 戰報後會自動累積。</div>
      ) : (
        <>
          <div className="signal-review-summary">
            <div>
              <span>追蹤訊號</span>
              <strong>{visibleRows.length}</strong>
            </div>
            <div>
              <span>達標</span>
              <strong>{visibleRows.filter((row) => statusOf(row) === '達標').length}</strong>
            </div>
            <div>
              <span>觸停損</span>
              <strong>{visibleRows.filter((row) => statusOf(row) === '觸停損').length}</strong>
            </div>
          </div>

          <div className="position-table-wrap">
            <table className="position-table signal-review-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>代號</th>
                  <th>訊號</th>
                  <th>進場觀測</th>
                  <th>目標/停損</th>
                  <th>MFE</th>
                  <th>MAE</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const mfe = pct(row.entryPrice, row.maxPrice);
                  const mae = pct(row.entryPrice, row.minPrice);
                  const latest = pct(row.entryPrice, row.latestPrice);
                  const status = statusOf(row);
                  return (
                    <tr key={row.key}>
                      <td className="text-gray-500 text-xs">{row.date}</td>
                      <td>
                        <span className="font-mono text-yellow-300">{row.ticker}</span>
                        <span className="signal-review-name">{row.name}</span>
                      </td>
                      <td>{row.action} {row.confidence ? `${row.confidence}%` : ''}</td>
                      <td>
                        <span>{safeFixed(row.entryPrice, 2)}</span>
                        <span className={`signal-review-sub ${latest != null ? getTwseColorClass(latest) : 'text-gray-500'}`}>
                          現 {safeFixed(row.latestPrice, 2)}
                        </span>
                      </td>
                      <td>
                        <span className="text-red-400">{row.targetPrice != null ? safeFixed(row.targetPrice, 2) : '--'}</span>
                        <span className="signal-review-sub text-green-500">{row.stopPrice != null ? safeFixed(row.stopPrice, 2) : '--'}</span>
                      </td>
                      <td className={mfe != null ? getTwseColorClass(mfe) : 'text-gray-400'}>
                        <TrendingUp size={12} className="inline mr-1" />
                        {mfe != null ? `${mfe >= 0 ? '+' : ''}${safeFixed(mfe, 2)}%` : '--'}
                      </td>
                      <td className={mae != null ? getTwseColorClass(mae) : 'text-gray-400'}>
                        <TrendingDown size={12} className="inline mr-1" />
                        {mae != null ? `${mae >= 0 ? '+' : ''}${safeFixed(mae, 2)}%` : '--'}
                      </td>
                      <td>
                        <span className={`signal-review-status ${status === '達標' ? 'hit' : status === '觸停損' ? 'stop' : ''}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="signal-review-note">
            MFE/MAE 由戰情中心刷新時的觀測價累積，供短期復盤使用；正式勝率仍需以已結算交易與完整日內高低價校正。
          </p>
        </>
      )}
    </div>
  );
}
