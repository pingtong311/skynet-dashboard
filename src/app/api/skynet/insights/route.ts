import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiUrl = 'https://primary-production-22702.up.railway.app/webhook/skynet-dashboard';
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 30 } // Cache for 30 seconds
    });

    if (!response.ok) {
      throw new Error(`n8n API failed with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Map the signals to the format expected by the Insight Matrix
    const logs = (data.signals || []).map((s: any) => ({
      time: new Date().toLocaleTimeString('zh-TW', { hour12: false }), // In real life, use the actual signal time
      type: s.action === 'BUY' ? 'ALERT' : s.action === 'SELL' ? 'SCAN' : 'THOUGHT',
      msg: `[${s.ticker} ${s.name}] ${s.strategy}: ${s.reasoning}`,
      isAlert: s.action === 'BUY'
    }));

    // Add a system status log
    logs.unshift({
      time: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
      type: 'INIT',
      msg: `同步成功：已從雲端擷取 ${data.totalAnalyzed} 筆即時分析信號。`,
      isAlert: false
    });

    return NextResponse.json(logs);
    
  } catch (error) {
    console.error('Insights API Error:', error);
    return NextResponse.json(
      [{ time: '--:--:--', type: 'ERROR', msg: '無法連線至雲端情報服務', isAlert: true }],
      { status: 500 }
    );
  }
}
