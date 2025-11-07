import { NextResponse } from 'next/server';

let tradingBotRunning = false;

export async function POST() {
  if (tradingBotRunning) {
    return NextResponse.json({
      message: 'Trading bot is already running',
      status: 'running'
    });
  }

  try {
    // Import and start the trading bot
    tradingBotRunning = true;

    // Start the trading bot in the background
    import('../../alpaca/trading').then(() => {
      console.log('Trading bot started successfully');
    }).catch((error) => {
      console.error('Error starting trading bot:', error);
      tradingBotRunning = false;
    });

    return NextResponse.json({
      message: 'Trading bot started successfully',
      status: 'running'
    });
  } catch (error: any) {
    tradingBotRunning = false;
    return NextResponse.json(
      { error: 'Failed to start trading bot', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: tradingBotRunning ? 'running' : 'stopped'
  });
}
