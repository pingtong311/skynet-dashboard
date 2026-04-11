import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Get the webhook URL from environment variable
    const webhookUrl = process.env.NEXT_PUBLIC_SKYNET_WEBHOOK_URL;
    
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

    if (!response.ok) {
      throw new Error(`n8n requested failed with status: ${response.status}`);
    }

    return NextResponse.json({ success: true, message: 'Settings successfully deployed to Skynet n8n.' });
    
  } catch (error) {
    console.error('API Webhook Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to deploy to n8n webhook' },
      { status: 500 }
    );
  }
}
