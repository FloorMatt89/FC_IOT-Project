import { NextResponse } from 'next/server';

const { loadEnvConfig } = require('@next/env');
const projectDir = require('path').join(__dirname, '../../../..');
loadEnvConfig(projectDir);

const Alpaca = require("@alpacahq/alpaca-trade-api");

export async function GET() {
  try {
    const alpaca = new Alpaca();

    // Fetch account information
    const account = await alpaca.getAccount();

    // Fetch all positions
    const positions = await alpaca.getPositions();

    // Fetch recent orders (last 10)
    const orders = await alpaca.getOrders({
      status: 'all',
      limit: 10,
      direction: 'desc'
    });

    return NextResponse.json({
      account: {
        equity: parseFloat(account.equity),
        cash: parseFloat(account.cash),
        buyingPower: parseFloat(account.buying_power),
        portfolioValue: parseFloat(account.portfolio_value),
        dayTradeCount: account.daytrade_count,
        status: account.status
      },
      positions: positions.map((pos: any) => ({
        symbol: pos.symbol,
        qty: parseFloat(pos.qty),
        marketValue: parseFloat(pos.market_value),
        costBasis: parseFloat(pos.cost_basis),
        unrealizedPL: parseFloat(pos.unrealized_pl),
        unrealizedPLPercent: parseFloat(pos.unrealized_plpc) * 100,
        currentPrice: parseFloat(pos.current_price),
        avgEntryPrice: parseFloat(pos.avg_entry_price)
      })),
      recentOrders: orders.map((order: any) => ({
        id: order.id,
        symbol: order.symbol,
        qty: parseFloat(order.qty),
        side: order.side,
        type: order.type,
        status: order.status,
        filledQty: parseFloat(order.filled_qty || 0),
        filledAvgPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null,
        createdAt: order.created_at,
        filledAt: order.filled_at
      }))
    });
  } catch (error: any) {
    console.error('Error fetching portfolio data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio data', details: error.message },
      { status: 500 }
    );
  }
}
