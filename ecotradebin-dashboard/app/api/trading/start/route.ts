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


    // Add timeout to fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(`${ec2Url}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ strategy }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(data, { status: response.status });
      }

      return NextResponse.json(data);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      // Handle network errors gracefully
      if (fetchError.name === 'AbortError') {
        console.warn('Request to EC2 timed out');
        return NextResponse.json(
          { error: 'Connection timeout', status: 'unavailable' },
          { status: 504 }
        );
      }

      // Connection refused or network error
      console.warn('EC2 service unavailable:', fetchError.message);
      return NextResponse.json(
        { error: 'Service unavailable', status: 'unavailable' },
        { status: 503 }
      );
    }
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
        { error: 'EC2 configuration missing', status: 'unavailable' },
        { status: 200 } // Return 200 so frontend doesn't treat as error
      );
    }

    // Add timeout to fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(`${ec2Url}/status`, {
        headers: {
          'x-api-key': apiKey,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(data, { status: response.status });
      }

      return NextResponse.json(data);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      // Handle network errors gracefully - return a valid response instead of throwing
      if (fetchError.name === 'AbortError') {
        console.warn('Status check timed out');
        return NextResponse.json(
          { status: 'unavailable', error: 'Connection timeout' },
          { status: 200 } // Return 200 so app doesn't crash
        );
      }

      // Connection refused or network error - return gracefully
      console.warn('EC2 service unavailable:', fetchError.message);
      return NextResponse.json(
        { status: 'unavailable', error: 'Service unavailable' },
        { status: 200 } // Return 200 so app doesn't crash
      );
    }
  } catch (error: any) {
    console.error('Error getting trading bot status:', error);
    return NextResponse.json(
      { status: 'unavailable', error: 'Failed to get status' },
      { status: 200 } // Return 200 so app doesn't crash
    );
  }
}
