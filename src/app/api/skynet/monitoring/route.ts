import { NextResponse } from 'next/server';

const N8N_ENDPOINT = 'https://primary-production-22702.up.railway.app/webhook/skynet-dashboard';

export async function GET() {
  try {
    const response = await fetch(N8N_ENDPOINT, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`n8n responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Monitoring API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(N8N_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`n8n responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Action API Error:', error);
    return NextResponse.json({ success: false, error: 'Command failed', details: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
}

