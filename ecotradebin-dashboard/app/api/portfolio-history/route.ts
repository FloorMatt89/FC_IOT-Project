import { NextResponse } from 'next/server';

const { loadEnvConfig } = require('@next/env');
const projectDir = require('path').join(__dirname, '../../../..');
loadEnvConfig(projectDir);

const Alpaca = require("@alpacahq/alpaca-trade-api");

export async function GET(request: Request) {
  try {
    const alpaca = new Alpaca();
    const { searchParams } = new URL(request.url);

    // Get timeframe from query params, default to '1M' (1 month)
    const period = searchParams.get('period') || '1M';
    const timeframe = searchParams.get('timeframe') || '1D';

    // Fetch portfolio history
    const portfolioHistory = await alpaca.getPortfolioHistory({
      period: period,
      timeframe: timeframe,
      extended_hours: false
    });

    // Transform the data into a format suitable for charting
    const chartData = portfolioHistory.timestamp.map((timestamp: number, index: number) => ({
      timestamp: timestamp * 1000, // Convert to milliseconds
      date: new Date(timestamp * 1000).toLocaleDateString(),
      value: portfolioHistory.equity[index],
      profitLoss: portfolioHistory.profit_loss[index],
      profitLossPercent: portfolioHistory.profit_loss_pct[index] * 100
    }));

    return NextResponse.json({
      data: chartData,
      baseValue: portfolioHistory.base_value,
      timeframe: portfolioHistory.timeframe
    });
  } catch (error: any) {
    console.error('Error fetching portfolio history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio history', details: error.message },
      { status: 500 }
    );
  }
}
