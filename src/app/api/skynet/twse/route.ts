/**
 * TWSE MIS 即時報價代理
 * GET /api/skynet/twse?tickers=t99,0050,2330
 *
 * 代理 TWSE MIS API，標準化回應格式
 * t99 = 加權指數（特殊代號）
 * 上市股票：tse_{代號}.tw
 * 上櫃股票：otc_{代號}.tw
 */

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

const TWSE_MIS_BASE = 'https://mis.twse.com.tw/stock/api/getStockInfo.asp';
const TWSE_OPENAPI_BASE = 'https://openapi.twse.com.tw/v1/exchangeReport';

export interface TWSEMISItem {
  symbol: string;       // 代號（去除 tse_/otc_ 前綴）
  name: string;
  price: number;        // 現價（z 欄位）
  change: number;       // 漲跌（z - y）
  changePercent: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;    // y 欄位
  volume: number;       // v 欄位（張）
  timestamp: string;    // t 欄位
}

export interface TWSEMISResponse {
  items: TWSEMISItem[];
  fetchedAt: string;
}

/**
 * 將 ticker 代號轉換為 TWSE MIS 格式
 * t99 → tse_t99.tw（加權指數）
 * 0050 → tse_0050.tw（上市）
 * 上櫃股票需在 ticker 前加 otc: 前綴，例如 otc:6488
 */
function toExCh(ticker: string): string {
  if (ticker.startsWith('otc:')) {
    return `otc_${ticker.slice(4)}.tw`;
  }
  return `tse_${ticker}.tw`;
}

function parseNumber(val: string | undefined): number {
  if (!val || val === '-' || val === '') return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function formatTwseOpenDate(value: string | undefined): string {
  if (!value || !/^\d{7}$/.test(value)) return '';
  const year = Number(value.slice(0, 3)) + 1911;
  return `${year}-${value.slice(3, 5)}-${value.slice(5, 7)}`;
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs: number): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function fetchOpenApiFallback(tickers: string[]): Promise<TWSEMISResponse | null> {
  const cleanTickers = Array.from(new Set(tickers.map((ticker) => ticker.trim()).filter(Boolean)));
  if (cleanTickers.length === 0) return null;

  const needsIndex = cleanTickers.includes('t99');
  const stockTickers = cleanTickers.filter((ticker) => ticker !== 't99' && !ticker.startsWith('otc:'));
  const [indexRows, stockRows] = await Promise.all([
    needsIndex
      ? fetchJsonWithTimeout<Array<Record<string, string>>>(`${TWSE_OPENAPI_BASE}/MI_INDEX`, 8_000)
      : Promise.resolve(null),
    stockTickers.length > 0
      ? fetchJsonWithTimeout<Array<Record<string, string>>>(`${TWSE_OPENAPI_BASE}/STOCK_DAY_AVG_ALL`, 8_000)
      : Promise.resolve(null),
  ]);

  const items: TWSEMISItem[] = [];
  if (needsIndex && Array.isArray(indexRows)) {
    const row = indexRows.find((item) => item['指數'] === '發行量加權股價指數');
    if (row) {
      const price = parseNumber(row['收盤指數']);
      const signedChange = parseNumber(row['漲跌點數']) * (row['漲跌'] === '-' ? -1 : 1);
      const prevClose = price - signedChange;
      items.push({
        symbol: 't99',
        name: row['指數'] || '加權指數',
        price,
        change: signedChange,
        changePercent: parseNumber(row['漲跌百分比']) * (row['漲跌'] === '-' ? -1 : 1),
        open: 0,
        high: 0,
        low: 0,
        prevClose,
        volume: 0,
        timestamp: formatTwseOpenDate(row['日期']),
      });
    }
  }

  if (Array.isArray(stockRows)) {
    const byCode = new Map(stockRows.map((row) => [row.Code, row]));
    for (const ticker of stockTickers) {
      const row = byCode.get(ticker);
      if (!row) continue;
      const price = parseNumber(row.ClosingPrice);
      items.push({
        symbol: ticker,
        name: row.Name || ticker,
        price,
        change: 0,
        changePercent: 0,
        open: 0,
        high: 0,
        low: 0,
        prevClose: price,
        volume: 0,
        timestamp: formatTwseOpenDate(row.Date),
      });
    }
  }

  if (items.length === 0) return null;
  return {
    items,
    fetchedAt: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tickersParam = searchParams.get('tickers');

  if (!tickersParam) {
    return NextResponse.json({ error: 'missing_tickers' }, { status: 400 });
  }

  const tickers = tickersParam.split(',').map(t => t.trim()).filter(Boolean);
  if (tickers.length === 0) {
    return NextResponse.json({ error: 'empty_tickers' }, { status: 400 });
  }

  const exCh = tickers.map(toExCh).join('|');
  const url = `${TWSE_MIS_BASE}?ex_ch=${encodeURIComponent(exCh)}&json=1&delay=0`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Referer': 'https://mis.twse.com.tw/',
      },
      
    });
    clearTimeout(timer);

    if (!res.ok) {
      const fallback = await fetchOpenApiFallback(tickers);
      if (fallback) {
        return NextResponse.json(fallback, {
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=120',
            'X-Skynet-Data-Source': 'twse-openapi-fallback',
            'X-Skynet-Upstream-Status': String(res.status),
          },
        });
      }
      return NextResponse.json({ error: 'twse_upstream_error', status: res.status }, { status: 502 });
    }

    const raw = await res.json();
    // TWSE MIS 回應格式：{ msgArray: [...], queryTime: {...} }
    const msgArray: Record<string, string>[] = raw?.msgArray ?? [];

    const items: TWSEMISItem[] = msgArray.map((item) => {
      const symbol = (item.c || '').replace(/^(tse_|otc_)/, '').replace(/\.tw$/, '');
      const prevClose = parseNumber(item.y);
      const price = parseNumber(item.z);
      const change = prevClose > 0 && price > 0 ? price - prevClose : 0;
      const changePercent = prevClose > 0 && price > 0 ? (change / prevClose) * 100 : 0;

      return {
        symbol,
        name: item.n || symbol,
        price,
        change,
        changePercent,
        open: parseNumber(item.o),
        high: parseNumber(item.h),
        low: parseNumber(item.l),
        prevClose,
        volume: parseNumber(item.v),
        timestamp: item.t || '',
      };
    });

    const response: TWSEMISResponse = {
      items,
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=25, stale-while-revalidate=10',
      },
    });
  } catch (err) {
    clearTimeout(timer);
    const fallback = await fetchOpenApiFallback(tickers);
    if (fallback) {
      return NextResponse.json(fallback, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=120',
          'X-Skynet-Data-Source': 'twse-openapi-fallback',
        },
      });
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'twse_timeout' }, { status: 504 });
    }
    return NextResponse.json({ error: 'twse_fetch_error' }, { status: 500 });
  }
}
