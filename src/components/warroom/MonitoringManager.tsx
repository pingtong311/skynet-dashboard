'use client';

import { useState, useCallback } from 'react';
import { Settings, Save, Plus, WifiOff, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { validatePrice } from '@/lib/priceValidator';

export interface MonitoringEntry {
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  targetPrice: number | null;
  stopPrice: number | null;
  type: 'ETF' | '個股';
}

function safeFixed(value: unknown, digits: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--';
}

interface EditState {
  targetPrice: string;
  stopPrice: string;
  error: string | null;
  saving: boolean;
  saved: boolean;
}

interface MonitoringManagerProps {
  entries: MonitoringEntry[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export default function MonitoringManager({ entries, loading, error, onRefresh }: MonitoringManagerProps) {
  const [editStates, setEditStates] = useState<Record<string, EditState>>({});
  const [addForm, setAddForm] = useState({ ticker: '', name: '', shares: '', avgCost: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [addMessage, setAddMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getEditState = (ticker: string, entry: MonitoringEntry): EditState => {
    return editStates[ticker] ?? {
      targetPrice: entry.targetPrice != null ? String(entry.targetPrice) : '',
      stopPrice: entry.stopPrice != null ? String(entry.stopPrice) : '',
      error: null,
      saving: false,
      saved: false,
    };
  };

  const updateEditState = (ticker: string, patch: Partial<EditState>) => {
    const base = entries.find(e => e.ticker === ticker);
    if (!base) return;
    setEditStates(prev => ({
      ...prev,
      [ticker]: { ...getEditState(ticker, base), ...patch },
    }));
  };

  const handleSave = useCallback(async (entry: MonitoringEntry) => {
    const state = getEditState(entry.ticker, entry);
    const targetStr = state.targetPrice.trim();
    const stopStr = state.stopPrice.trim();

    // 驗證：有填才驗證
    if (targetStr && !validatePrice(targetStr)) {
      updateEditState(entry.ticker, { error: '目標價必須為正數' });
      return;
    }
    if (stopStr && !validatePrice(stopStr)) {
      updateEditState(entry.ticker, { error: '停損價必須為正數' });
      return;
    }

    updateEditState(entry.ticker, { saving: true, error: null });

    try {
      const res = await fetch('/api/skynet/n8n-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'update_monitoring',
          ticker: entry.ticker,
          name: entry.name,
          shares: entry.shares,
          avgCost: entry.avgCost,
          stockType: entry.type,
          targetPrice: targetStr ? parseFloat(targetStr) : null,
          stopPrice: stopStr ? parseFloat(stopStr) : null,
        }),
      });

      if (res.ok) {
        updateEditState(entry.ticker, { saving: false, saved: true, error: null });
        setTimeout(() => {
          updateEditState(entry.ticker, { saved: false });
          onRefresh();
        }, 3000);
      } else {
        updateEditState(entry.ticker, { saving: false, error: '更新失敗，請稍後再試' });
      }
    } catch {
      updateEditState(entry.ticker, { saving: false, error: '網路錯誤，請稍後再試' });
    }
    // Keep the save handler tied to the current row edit state.
  }, [entries, editStates, onRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ticker = addForm.ticker.trim();
    if (!ticker || !/^\d{4,6}[A-Z]?$/.test(ticker)) {
      setAddMessage({ type: 'error', text: '代號格式錯誤（4-6位數字，可含A後綴）' });
      return;
    }
    const shares = parseInt(addForm.shares, 10);
    const avgCost = parseFloat(addForm.avgCost);
    if (isNaN(shares) || shares <= 0) {
      setAddMessage({ type: 'error', text: '持有股數必須為正整數' });
      return;
    }
    if (isNaN(avgCost) || avgCost <= 0) {
      setAddMessage({ type: 'error', text: '平均成本必須為正數' });
      return;
    }

    setAddLoading(true);
    setAddMessage(null);
    try {
      const res = await fetch('/api/skynet/n8n-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'add_monitoring',
          ticker,
          name: addForm.name.trim() || ticker,
          shares,
          avgCost,
        }),
      });
      if (res.ok) {
        setAddMessage({ type: 'success', text: `✅ ${ticker} 已新增` });
        setAddForm({ ticker: '', name: '', shares: '', avgCost: '' });
        setTimeout(() => { setAddMessage(null); onRefresh(); }, 3000);
      } else {
        setAddMessage({ type: 'error', text: '新增失敗，請稍後再試' });
      }
    } catch {
      setAddMessage({ type: 'error', text: '網路錯誤' });
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="warroom-panel">
      <div className="warroom-panel-header">
        <Settings size={16} className="text-gray-400" />
        <span className="warroom-panel-title">自選監控管理</span>
      </div>

      {loading && <div className="warroom-panel-loading">載入監控清單中...</div>}

      {error && !loading && (
        <div className="warroom-panel-error">
          <WifiOff size={14} />
          <span>監控清單資料源異常，請稍後重試</span>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* 持倉編輯表格 */}
          {entries.length > 0 && (
            <div className="monitoring-table-wrap">
              <table className="monitoring-table">
                <thead>
                  <tr>
                    <th>代號</th>
                    <th>名稱</th>
                    <th>股數</th>
                    <th>成本</th>
                    <th>目標價</th>
                    <th>停損價</th>
                    <th>類型</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const state = getEditState(entry.ticker, entry);
                    return (
                      <tr key={entry.ticker}>
                        <td className="font-mono text-sm">{entry.ticker}</td>
                        <td className="text-gray-300 text-sm">{entry.name}</td>
                        <td className="text-right text-sm">{entry.shares.toLocaleString()}</td>
                        <td className="text-right text-sm">{safeFixed(entry.avgCost, 2)}</td>
                        <td>
                          <input
                            type="text"
                            value={state.targetPrice}
                            onChange={e => updateEditState(entry.ticker, { targetPrice: e.target.value, error: null, saved: false })}
                            placeholder="空白=不監控"
                            className="monitoring-input"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={state.stopPrice}
                            onChange={e => updateEditState(entry.ticker, { stopPrice: e.target.value, error: null, saved: false })}
                            placeholder="空白=不監控"
                            className="monitoring-input"
                          />
                        </td>
                        <td className="text-xs text-gray-500">{entry.type}</td>
                        <td>
                          {state.error && (
                            <span className="text-red-400 text-xs mr-1"><AlertTriangle size={11} className="inline" /> {state.error}</span>
                          )}
                          {state.saved ? (
                            <span className="text-green-400 text-xs">✅ 已更新</span>
                          ) : (
                            <button
                              onClick={() => handleSave(entry)}
                              disabled={state.saving}
                              className="monitoring-save-btn"
                            >
                              {state.saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 新增持倉表單 */}
          <form onSubmit={handleAddSubmit} className="monitoring-add-form">
            <p className="text-gray-500 text-xs mb-2">新增持倉</p>
            <div className="monitoring-add-row">
              <input
                type="text"
                value={addForm.ticker}
                onChange={e => setAddForm(p => ({ ...p, ticker: e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 6) }))}
                placeholder="代號"
                className="monitoring-input w-20"
                maxLength={6}
              />
              <input
                type="text"
                value={addForm.name}
                onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                placeholder="名稱（選填）"
                className="monitoring-input flex-1"
              />
              <input
                type="text"
                value={addForm.shares}
                onChange={e => setAddForm(p => ({ ...p, shares: e.target.value.replace(/\D/g, '') }))}
                placeholder="股數"
                className="monitoring-input w-20"
              />
              <input
                type="text"
                value={addForm.avgCost}
                onChange={e => setAddForm(p => ({ ...p, avgCost: e.target.value.replace(/[^\d.]/g, '') }))}
                placeholder="成本"
                className="monitoring-input w-20"
              />
              <button type="submit" disabled={addLoading} className="monitoring-add-btn">
                {addLoading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                新增
              </button>
            </div>
            {addMessage && (
              <div className={`monitoring-message ${addMessage.type}`}>
                {addMessage.type === 'error' ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                <span>{addMessage.text}</span>
              </div>
            )}
          </form>
        </>
      )}
    </div>
  );
}
