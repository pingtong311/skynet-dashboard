'use client';

/**
 * 天網 K 線圖查看器 — KLinePanel 主元件
 *
 * 包含：
 * - QuoteBar 子元件（現價資訊列）
 * - TimeframeToggle（日K / 分K 切換）
 * - CandlestickChart（K 線圖）
 * - 記憶體快取（Daily K，TTL 5 分鐘）
 * - AbortController（切換 ticker 時取消前一個請求）
 * - framer-motion slide-down 動畫
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import CandlestickChart from './CandlestickChart';
import { calculateSMA } from '@/lib/sma';
import {
  isCacheValid,
  sliceCandles,
  filterCompletedCandles,
  isInTradingHours,
  formatDateLabel,
  getCandleDirection,
  getChangeColor,
} from '@/lib/klineUtils';
import type {
  ChartCandle,
  QuoteResponse,
  CacheEntry,
  CandlesResponse,
} from '@/types/kline';

// ── 常數 ───────────────────────────────────────────────

const MAX_DAILY_CANDLES = 120;

const ERROR_MESSAGES: Record<string, string> = {
  api_key_not_configured:
    '尚未設定 Fugle API Key。請至富果官網（fugle.tw）申請後，設定至 .env.local 的 FUGLE_API_KEY 欄位。',
  rate_limit_exceeded: 'API 請求已達速率上限（60次/分鐘），請稍後再試。',
  upstream_timeout: '富果 API 回應逾時，請稍後再試。',
  upstream_error: '無法取得 {ticker} 的資料，請確認股票代號是否正確。',
  invalid_ticker: '無效的股票代號。',
  network_error: '網路連線異常，請檢查網路後再試。',
};

function getErrorMessage(errorCode: string, ticker: string): string {
  const msg = ERROR_MESSAGES[errorCode] ?? `發生未知錯誤（${errorCode}）`;
  return msg.replace('{ticker}', ticker);
}

// ── 資料轉換：API Candle → ChartCandle ────────────────

function toChartCandle(
  raw: { date?: string; time?: string; open: number; high: number; low: number; close: number; volume: number },
  isIntraday = false
): ChartCandle {
  const dateRaw = raw.date ?? raw.time ?? '';
  const direction = getCandleDirection(raw.open, raw.close);

  return {
    date: !isIntraday && raw.date ? formatDateLabel(raw.date) : undefined,
    time: isIntraday ? (raw.time ?? raw.date?.split('T')[1]?.substring(0, 5)) : undefined,
    dateRaw,
    open: raw.open,
    high: raw.high,
    low: raw.low,
    close: raw.close,
    volume: raw.volume,
    bodyLow: Math.min(raw.open, raw.close),
    bodyHigh: Math.max(raw.open, raw.close),
    bodyHeight: Math.abs(raw.close - raw.open),
    direction,
  };
}

function injectSMA(candles: ChartCandle[]): ChartCandle[] {
  const closes = candles.map((c) => c.close);
  const sma5 = calculateSMA(closes, 5);
  const sma10 = calculateSMA(closes, 10);
  const sma20 = calculateSMA(closes, 20);
  const sma60 = calculateSMA(closes, 60);

  return candles.map((c, i) => ({
    ...c,
    sma5: sma5[i],
    sma10: sma10[i],
    sma20: sma20[i],
    sma60: sma60[i],
  }));
}

// ── QuoteBar 子元件 ────────────────────────────────────

interface QuoteBarProps {
  ticker: string;
  quote: QuoteResponse | null;
  loading: boolean;
}

export function QuoteBar({ ticker, quote, loading }: QuoteBarProps) {
  const displayPrice = quote?.price != null ? quote.price.toFixed(2) : '--';
  const displayChange = quote
    ? (quote.change >= 0 ? '+' : '') + quote.change.toFixed(2)
    : '--';
  const displayChangePercent = quote
    ? (quote.changePercent >= 0 ? '+' : '') + quote.changePercent.toFixed(2) + '%'
    : '--';
  const changeColor = quote ? getChangeColor(quote.changePercent) : '#94a3b8';

  return (
    <div className="kline-quote-bar">
      <div className="kline-quote-left">
        <span className="kline-quote-ticker">{ticker}</span>
        {quote?.name && (
          <span className="kline-quote-name">{quote.name}</span>
        )}
      </div>
      <div className="kline-quote-right">
        {loading ? (
          <Loader2 size={14} className="animate-spin" style={{ color: '#64748b' }} />
        ) : (
          <>
            <span className="kline-quote-price" style={{ color: changeColor }}>
              {displayPrice}
            </span>
            <span className="kline-quote-change" style={{ color: changeColor }}>
              {displayChange}
            </span>
            <span className="kline-quote-pct" style={{ color: changeColor }}>
              {displayChangePercent}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ── KLinePanel 主元件 ──────────────────────────────────

interface KLinePanelProps {
  ticker: string;
  onClose: () => void;
}

export default function KLinePanel({ ticker, onClose }: KLinePanelProps) {
  const [timeframe, setTimeframe] = useState<'daily' | 'intraday'>('daily');
  const [dailyCandles, setDailyCandles] = useState<ChartCandle[] | null>(null);
  const [intradayCandles, setIntradayCandles] = useState<ChartCandle[] | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState(false);

  // 快取（Daily K，TTL 5 分鐘）
  const dailyCache = useRef<Map<string, CacheEntry>>(new Map());

  // AbortController（切換 ticker 時取消前一個請求）
  const abortRef = useRef<AbortController | null>(null);

  // 判斷是否在交易時段
  const now = new Date();
  const taipeiHour = parseInt(
    new Intl.DateTimeFormat('zh-TW', { hour: 'numeric', hour12: false, timeZone: 'Asia/Taipei' }).format(now)
  );
  const taipeiMinute = now.getMinutes();
  const inTradingHours = isInTradingHours(taipeiHour, taipeiMinute);

  // ── 取得 Daily K 資料 ────────────────────────────────

  const fetchDaily = useCallback(async (t: string, signal: AbortSignal) => {
    // 檢查快取
    const cached = dailyCache.current.get(t);
    if (cached && isCacheValid(cached.timestamp, Date.now())) {
      setDailyCandles(cached.data);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/skynet/kline?ticker=${t}&type=daily`, { signal });
      if (signal.aborted) return;

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'upstream_error' }));
        setError(getErrorMessage(errData.error ?? 'upstream_error', t));
        return;
      }

      const data: CandlesResponse = await res.json();
      if (signal.aborted) return;

      const chartCandles = (data.candles ?? []).map((c) => toChartCandle(c, false));
      const sliced = sliceCandles(chartCandles, MAX_DAILY_CANDLES);
      const withSMA = injectSMA(sliced);

      // 存入快取
      dailyCache.current.set(t, { data: withSMA, timestamp: Date.now() });
      setDailyCandles(withSMA);
    } catch (err) {
      if (signal.aborted) return;
      setError(getErrorMessage('network_error', t));
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  // ── 取得 Intraday K 資料 ─────────────────────────────

  const fetchIntraday = useCallback(async (t: string, signal: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/skynet/kline?ticker=${t}&type=intraday`, { signal });
      if (signal.aborted) return;

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'upstream_error' }));
        setError(getErrorMessage(errData.error ?? 'upstream_error', t));
        return;
      }

      const data: CandlesResponse = await res.json();
      if (signal.aborted) return;

      const chartCandles = (data.candles ?? []).map((c) => toChartCandle(c, true));
      const filtered = filterCompletedCandles(chartCandles, Date.now());
      setIntradayCandles(filtered);
    } catch (err) {
      if (signal.aborted) return;
      setError(getErrorMessage('network_error', t));
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  // ── 取得 Quote 資料 ──────────────────────────────────

  const fetchQuote = useCallback(async (t: string, signal: AbortSignal) => {
    setQuoteLoading(true);
    setQuoteError(false);

    try {
      const res = await fetch(`/api/skynet/kline?ticker=${t}&type=quote`, { signal });
      if (signal.aborted) return;

      if (!res.ok) {
        setQuoteError(true);
        return;
      }

      const data: QuoteResponse = await res.json();
      if (signal.aborted) return;
      setQuote(data);
    } catch {
      if (signal.aborted) return;
      setQuoteError(true);
    } finally {
      if (!signal.aborted) setQuoteLoading(false);
    }
  }, []);

  // ── 主要資料載入 Effect ──────────────────────────────

  useEffect(() => {
    // 取消前一個請求
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // 重置狀態
    setDailyCandles(null);
    setIntradayCandles(null);
    setQuote(null);
    setError(null);
    setTimeframe('daily');

    // 同時發出 daily + quote 請求
    fetchDaily(ticker, controller.signal);
    fetchQuote(ticker, controller.signal);

    return () => {
      controller.abort();
    };
  }, [ticker, fetchDaily, fetchQuote]);

  // ── 切換 Timeframe ───────────────────────────────────

  const handleTimeframeChange = useCallback((tf: 'daily' | 'intraday') => {
    if (tf === timeframe) return;
    setTimeframe(tf);
    setError(null);

    if (tf === 'intraday' && !intradayCandles) {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetchIntraday(ticker, controller.signal);
    }
  }, [timeframe, intradayCandles, ticker, fetchIntraday]);

  // ── 決定顯示的資料 ───────────────────────────────────

  const displayCandles = timeframe === 'daily' ? dailyCandles : intradayCandles;

  // ── 渲染 ─────────────────────────────────────────────

  return (
    <motion.div
      className="kline-panel"
      initial={{ opacity: 0, y: -20, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* 面板標題列 */}
      <div className="kline-panel-header">
        <div className="kline-panel-title">
          <TrendingUp size={18} style={{ color: '#00f0ff' }} />
          <span>K 線圖</span>
        </div>

        {/* QuoteBar */}
        <QuoteBar ticker={ticker} quote={quote} loading={quoteLoading} />

        {/* Timeframe 切換 */}
        <div className="kline-timeframe-toggle">
          <button
            className={`kline-tf-btn ${timeframe === 'daily' ? 'active' : ''}`}
            onClick={() => handleTimeframeChange('daily')}
          >
            日K
          </button>
          <button
            className={`kline-tf-btn ${timeframe === 'intraday' ? 'active' : ''}`}
            onClick={() => handleTimeframeChange('intraday')}
          >
            分K（盤中）
          </button>
        </div>

        {/* 關閉按鈕 */}
        <button className="kline-close-btn" onClick={onClose} aria-label="關閉 K 線圖">
          <X size={18} />
        </button>
      </div>

      {/* 非交易時段提示 */}
      {timeframe === 'intraday' && !inTradingHours && (
        <div className="kline-offhours-notice">
          <Clock size={14} />
          <span>目前非交易時段，顯示最近一個交易日資料</span>
        </div>
      )}

      {/* 主要內容區 */}
      <div className="kline-panel-body">
        {/* 載入中 */}
        {loading && (
          <div className="kline-loading">
            <Loader2 size={28} className="animate-spin" style={{ color: '#00f0ff' }} />
            <p>載入 {ticker} {timeframe === 'daily' ? '日K' : '分K'} 資料中...</p>
          </div>
        )}

        {/* 錯誤訊息 */}
        {!loading && error && (
          <div className="kline-error">
            <AlertTriangle size={20} />
            <p>{error}</p>
          </div>
        )}

        {/* K 線圖 */}
        {!loading && !error && displayCandles && displayCandles.length > 0 && (
          <CandlestickChart candles={displayCandles} timeframe={timeframe} />
        )}

        {/* 無資料 */}
        {!loading && !error && displayCandles && displayCandles.length === 0 && (
          <div className="kline-empty">
            <p>無法取得 {ticker} 的{timeframe === 'daily' ? '日K' : '盤中'}資料</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
