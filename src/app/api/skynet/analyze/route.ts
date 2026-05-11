import { NextResponse } from 'next/server';

export const runtime = 'edge';

const N8N_BASE = process.env.SKYNET_N8N_BASE_URL || 'https://skynet-cmd.duckdns.org';
const TERMINAL_WEBHOOK = `${N8N_BASE}/webhook/skynet-terminal-sync-v1`;
const TIMEOUT_MS = 8000;

export async function POST(request: Request) {
  try {
    const { ticker } = await request.json();

    if (!ticker || !/^\d{4,6}$/.test(ticker.trim())) {
      return NextResponse.json({ error: '請輸入有效的台股代號（4-6位數字）' }, { status: 400 });
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
        throw new Error(`n8n returned ${response.status}`);
      }

      const text = await response.text();

      if (!text || text.trim() === '') {
        return NextResponse.json({
          ticker: cleanTicker,
          status: 'processing',
          message: `${cleanTicker} 分析中，完整戰報將推送至 Telegram（約 20-30 秒）。`,
        });
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
        return NextResponse.json({
          ticker: cleanTicker,
          status: 'processing',
          message: `${cleanTicker} 分析中，完整戰報將推送至 Telegram（約 20-30 秒）。`,
        });
      }
      throw fetchError;
    }

  } catch (error) {
    console.error('Analyze API Error:', error);
    return NextResponse.json(
      { error: '分析服務暫時無法連線，請稍後再試。' },
      { status: 500 }
    );
  }
}
