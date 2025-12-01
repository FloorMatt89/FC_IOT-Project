import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const ec2Url = process.env.EC2_CONTROL_API_URL;
    const apiKey = process.env.EC2_CONTROL_API_KEY;

    if (!ec2Url || !apiKey) {
      return NextResponse.json(
        { error: 'EC2 configuration missing' },
        { status: 500 }
      );
    }

    // Parse request body to get strategy
    const body = await request.json().catch(() => ({}));
    const strategy = body.strategy || 'news-sentiment';

    const response = await fetch(`${ec2Url}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ strategy }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error starting trading bot:', error);
    return NextResponse.json(
      { error: 'Failed to start trading bot', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const ec2Url = process.env.EC2_CONTROL_API_URL;
    const apiKey = process.env.EC2_CONTROL_API_KEY;

    if (!ec2Url || !apiKey) {
      return NextResponse.json(
        { error: 'EC2 configuration missing', status: 'unknown' },
        { status: 500 }
      );
    }

    const response = await fetch(`${ec2Url}/status`, {
      headers: {
        'x-api-key': apiKey,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error getting trading bot status:', error);
    return NextResponse.json(
      { error: 'Failed to get status', status: 'unknown', details: error.message },
      { status: 500 }
    );
  }
}
