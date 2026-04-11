import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { question } = await request.json();
    
    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // Default Flowise URL from the Skynet architecture
    const FLOWISE_URL = process.env.NEXT_PUBLIC_FLOWISE_URL || "https://flowise-production-4535.up.railway.app/api/v1/prediction/f2359e96-97bb-49a1-908f-35dfbff67273";

    console.log('Asking Flowise:', question);
    
    const response = await fetch(FLOWISE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Flowise Error:', errorText);
        throw new Error(`Flowise returned status: ${response.status}`);
    }

    const data = await response.json();
    // Flowise typically returns JSON with a 'text' property
    return NextResponse.json({ text: data.text || data.output || JSON.stringify(data) });
    
  } catch (error) {
    console.error('API Flowise Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to communicate with Flowise AI Engine' },
      { status: 500 }
    );
  }
}
