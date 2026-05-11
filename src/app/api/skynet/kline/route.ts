/**
 * 天網 K 線圖查看器 — Fugle MarketData API 代理路由
 *
 * GET /api/skynet/kline?ticker={ticker}&type={daily|intraday|quote}
 *
 * 職責：
 * - 保護 FUGLE_API_KEY 不暴露於前端
 * - 驗證輸入參數
 * - 代理 Fugle API 請求並標準化回應格式
 * - 統一錯誤處理
 */

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

// ── Fugle API 端點 ─────────────────────────────────────

const FUGLE_BASE = 'https://api.fugle.tw/marketdata/v1.0/stock';

function getFugleUrl(ticker: string, type: string): string {
  switch (type) {
    case 'daily':
      return `${FUGLE_BASE}/historical/candles/${ticker}?timeframe=D`;
    case 'intraday':
      return `${FUGLE_BASE}/intraday/candles/${ticker}?timeframe=1`;
    case 'quote':
      return `${FUGLE_BASE}/intraday/quote/${ticker}`;
    default:
      throw new Error('invalid_type');
  }
}

// ── 型別定義 ───────────────────────────────────────────

interface FugleHistoricalCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface FugleIntradayCandle {
  date: string;  // ISO 8601 格式
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface FugleHistoricalResponse {
  candles: FugleHistoricalCandle[];
}

interface FugleIntradayResponse {
  candles: FugleIntradayCandle[];
}

interface FugleQuoteResponse {
  symbol: string;
  name: string;
  referencePrice?: number;
  previousClose?: number;
  closePrice?: number;
  change?: number;
  changePercent?: number;
  // 備用欄位
  lastPrice?: number;
  lastChange?: number;
  lastChangePercent?: number;
}

// ── 標準化函式 ─────────────────────────────────────────

function normalizeDaily(raw: FugleHistoricalResponse) {
  const candles = (raw.candles || []).map((c) => ({
    date: c.date,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));
  return { candles };
}

function normalizeIntraday(raw: FugleIntradayResponse) {
  const candles = (raw.candles || []).map((c) => {
    // 從 ISO 8601 字串提取 HH:MM
    const timePart = c.date.includes('T')
      ? c.date.split('T')[1].substring(0, 5)
      : c.date;
    return {
      time: timePart,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    };
  });
  return { candles };
}

function normalizeQuote(raw: FugleQuoteResponse) {
  return {
    price: raw.closePrice ?? raw.lastPrice ?? 0,
    change: raw.change ?? raw.lastChange ?? 0,
    changePercent: raw.changePercent ?? raw.lastChangePercent ?? 0,
    name: raw.name ?? '',
  };
}

// ── GET Handler ────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker') ?? '';
  const type = searchParams.get('type') ?? '';

  // 1. 檢查 API Key
  const apiKey = process.env.FUGLE_API_KEY ?? '';
  if (!apiKey) {
    return NextResponse.json(
      { error: 'api_key_not_configured' },
      { status: 503 }
    );
  }

  // 2. 驗證 ticker 格式（4–6 位數字）
  if (!/^\d{4,6}$/.test(ticker)) {
    return NextResponse.json(
      { error: 'invalid_ticker' },
      { status: 400 }
    );
  }

  // 3. 驗證 type 值
  if (!['daily', 'intraday', 'quote'].includes(type)) {
    return NextResponse.json(
      { error: 'invalid_type' },
      { status: 400 }
    );
  }

  // 4. 建立 AbortController（10 秒 timeout）
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const url = getFugleUrl(ticker, type);

    const fugleRes = await fetch(url, {
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 5. 處理 Fugle 錯誤回應
    if (!fugleRes.ok) {
      if (fugleRes.status === 429) {
        return NextResponse.json(
          { error: 'rate_limit_exceeded' },
          { status: 429 }
        );
      }
      // 其他 4xx/5xx — 不暴露原始訊息
      return NextResponse.json(
        { error: 'upstream_error' },
        { status: fugleRes.status }
      );
    }

    // 6. 解析並標準化回應
    const rawData = await fugleRes.json();

    let normalized;
    if (type === 'daily') {
      normalized = normalizeDaily(rawData as FugleHistoricalResponse);
    } else if (type === 'intraday') {
      normalized = normalizeIntraday(rawData as FugleIntradayResponse);
    } else {
      normalized = normalizeQuote(rawData as FugleQuoteResponse);
    }

    return NextResponse.json(normalized, { status: 200 });

  } catch (err) {
    clearTimeout(timeoutId);

    // AbortController 觸發（超時）
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json(
        { error: 'upstream_timeout' },
        { status: 504 }
      );
    }

    // 其他網路錯誤
    return NextResponse.json(
      { error: 'upstream_error' },
      { status: 502 }
    );
  }
}
