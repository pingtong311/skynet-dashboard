import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log('[Day Trading Webhook] Received:', payload);
    
    // In a real application, you might broadcast this to the frontend via WebSockets or save it
    // For now, we simulate receiving the high-frequency tick data
    
    return NextResponse.json({ success: true, message: 'Signal received successfully' });
  } catch (error) {
    console.error('[Day Trading Webhook] Error:', error);
    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  }
}
