import { NextResponse } from 'next/server';

export const runtime = 'edge';

// 讀取 Google Sheets 的天網數據
// 透過 n8n 天網-API 工作流取得資料（已有 webhook 端點）
const N8N_BASE = process.env.SKYNET_N8N_BASE_URL || 'https://skynet-cmd.duckdns.org';
const DASHBOARD_API = `${N8N_BASE}/webhook/skynet-dashboard`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'warroom';

  try {
    const response = await fetch(`${DASHBOARD_API}?type=${type}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Dashboard API failed: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('WarRoom API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch war room data' }, { status: 500 });
  }
}
