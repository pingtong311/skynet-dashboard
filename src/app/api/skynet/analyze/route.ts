import { NextResponse } from 'next/server';

export const runtime = 'edge';

const N8N_BASE = process.env.SKYNET_N8N_BASE_URL || 'https://skynet-cmd.duckdns.org';
const TERMINAL_WEBHOOK = `${N8N_BASE}/webhook/skynet-terminal-sync-v1`;
const TIMEOUT_MS = 60000;

export async function POST(request: Request) {
  try {
    const { ticker } = await request.json();

    if (!ticker || !/^\d{4,6}$/.test(ticker.trim())) {
      return NextResponse.json({ error: 'invalid_ticker' }, { status: 400 });
    }

    const cleanTicker = ticker.trim();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(TERMINAL_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: cleanTicker,
          chatId: 6375207034,
          Source: 'Terminal',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
      }

      const text = await response.text();

      if (!text || text.trim() === '') {
        return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
      }

      try {
        const data = JSON.parse(text);
        return NextResponse.json(data);
      } catch {
        return NextResponse.json({ ticker: cleanTicker, message: text });
      }

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'analysis_timeout', message: '分析逾時，請稍後再試' },
          { status: 504 }
        );
      }
      throw fetchError;
    }

  } catch (error) {
    console.error('Analyze API Error:', error);
    return NextResponse.json(
      { error: 'internal_error' },
      { status: 500 }
    );
  }
}
