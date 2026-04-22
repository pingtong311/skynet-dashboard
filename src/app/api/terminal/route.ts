import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Get the n8n webhook URL from environment variable
    // Priority: .env > fallback
    const n8nUrl = process.env.NEXT_PUBLIC_SKYNET_WEBHOOK_URL || 'https://primary-production-22702.up.railway.app/webhook/skynet-terminal-gateway';
    
    console.log('Terminal Proxy: Sending command to n8n:', data.command);
    
    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n response error:', response.status, errorText);
      return NextResponse.json(
        { error: `n8n server returned ${response.status}` },
        { status: response.status }
      );
    }

    const responseText = await response.text();
    
    if (!responseText || responseText.trim() === '') {
      return NextResponse.json({ 
        message: '指令已送達，後台處理完成。', 
        success: true, 
        result: null 
      });
    }

    try {
      const responseData = JSON.parse(responseText);
      return NextResponse.json(responseData);
    } catch (e) {
      console.error('Failed to parse n8n response:', responseText);
      return NextResponse.json({ 
        message: responseText, 
        success: true, 
        result: null 
      });
    }
    
  } catch (error) {
    console.error('Terminal Proxy Error:', error);
    return NextResponse.json(
      { error: '伺服器連線失敗 (Proxy Error)' },
      { status: 500 }
    );
  }
}
