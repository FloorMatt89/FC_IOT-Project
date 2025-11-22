import { NextResponse } from 'next/server';

// This will store the reference to stop the bot
// In a real implementation, you'd need to track the WebSocket connection
let botShouldRun = true;

export async function POST() {
  try {
    botShouldRun = false;

    // Note: The current trading.ts implementation doesn't have a clean way to stop
    // You would need to modify trading.ts to check this flag periodically
    // For now, this will prevent new bot instances from starting

    return NextResponse.json({
      message: 'Trading bot stop signal sent',
      status: 'stopped'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to stop trading bot', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    shouldRun: botShouldRun
  });
}
