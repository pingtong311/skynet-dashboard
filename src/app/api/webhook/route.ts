import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Get the webhook URL from environment variable or use the known working one
    const webhookUrl = 'https://primary-production-22702.up.railway.app/webhook/skynet-terminal-sync-v1';
    
    if (!webhookUrl) {
      console.error('Webhook URL is not defined in environment variables');
      return NextResponse.json(
        { error: 'Webhook URL is not configured' },
        { status: 500 }
      );
    }

    console.log('Sending data to n8n Webhook:', data);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const n8nData = await response.json();
    return NextResponse.json(n8nData);
    
  } catch (error) {
    console.error('API Webhook Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to deploy to n8n webhook' },
      { status: 500 }
    );
  }
}
