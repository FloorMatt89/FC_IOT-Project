'use client';

import { useEffect, useState } from 'react';
import styles from './PortfolioDisplay.module.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface AccountData {
  equity: number;
  cash: number;
  buyingPower: number;
  portfolioValue: number;
  dayTradeCount: number;
  status: string;
}

interface Position {
  symbol: string;
  qty: number;
  marketValue: number;
  costBasis: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  currentPrice: number;
  avgEntryPrice: number;
}

interface Order {
  id: string;
  symbol: string;
  qty: number;
  side: string;
  type: string;
  status: string;
  filledQty: number;
  filledAvgPrice: number | null;
  createdAt: string;
  filledAt: string | null;
}

interface PortfolioData {
  account: AccountData;
  positions: Position[];
  recentOrders: Order[];
}

interface HistoryDataPoint {
  timestamp: number;
  date: string;
  value: number;
  profitLoss: number;
  profitLossPercent: number;
}

interface PortfolioHistory {
  data: HistoryDataPoint[];
  baseValue: number;
  timeframe: string;
}

export default function PortfolioDisplay() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('1M');

  const fetchPortfolio = async () => {
    try {
      const response = await fetch('/api/portfolio');
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio');
      }
      const data = await response.json();
      setPortfolio(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolioHistory = async (period: string) => {
    try {
      setHistoryLoading(true);
      const response = await fetch(`/api/portfolio-history?period=${period}&timeframe=1D`);
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio history');
      }
      const data = await response.json();
      setPortfolioHistory(data);
    } catch (err: any) {
      console.error('Error fetching portfolio history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    fetchPortfolioHistory(selectedPeriod);
    // Refresh every 30 seconds
    const interval = setInterval(fetchPortfolio, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchPortfolioHistory(selectedPeriod);
  }, [selectedPeriod]);

  if (loading) {
    return <div className={styles.loading}>Loading portfolio...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  if (!portfolio) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className={styles.container}>
      {/* Portfolio Value Chart */}
      <div className={styles.section}>
        <div className={styles.chartHeader}>
          <h2 className={styles.sectionTitle}>Portfolio Value Over Time</h2>
          <div className={styles.periodSelector}>
            {['1D', '1W', '1M', '3M', '1A'].map((period) => (
              <button
                key={period}
                className={`${styles.periodButton} ${selectedPeriod === period ? styles.activePeriod : ''}`}
                onClick={() => setSelectedPeriod(period)}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
        {historyLoading ? (
          <div className={styles.chartLoading}>Loading chart...</div>
        ) : portfolioHistory && portfolioHistory.data.length > 0 ? (
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={portfolioHistory.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Portfolio Value']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                  name="Portfolio Value"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className={styles.emptyState}>No portfolio history available</div>
        )}
      </div>

      {/* Account Summary */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Portfolio Summary</h2>
        <div className={styles.accountGrid}>
          <div className={styles.accountCard}>
            <div className={styles.accountLabel}>Portfolio Value</div>
            <div className={styles.accountValue}>{formatCurrency(portfolio.account.portfolioValue)}</div>
          </div>
          <div className={styles.accountCard}>
            <div className={styles.accountLabel}>Cash</div>
            <div className={styles.accountValue}>{formatCurrency(portfolio.account.cash)}</div>
          </div>
          <div className={styles.accountCard}>
            <div className={styles.accountLabel}>Buying Power</div>
            <div className={styles.accountValue}>{formatCurrency(portfolio.account.buyingPower)}</div>
          </div>
          <div className={styles.accountCard}>
            <div className={styles.accountLabel}>Equity</div>
            <div className={styles.accountValue}>{formatCurrency(portfolio.account.equity)}</div>
          </div>
        </div>
      </div>

      {/* Positions */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Current Positions ({portfolio.positions.length})</h2>
        {portfolio.positions.length === 0 ? (
          <div className={styles.emptyState}>No positions yet</div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Qty</th>
                  <th>Avg Price</th>
                  <th>Current Price</th>
                  <th>Market Value</th>
                  <th>P&L</th>
                  <th>P&L %</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.positions.map((pos) => (
                  <tr key={pos.symbol}>
                    <td className={styles.symbol}>{pos.symbol}</td>
                    <td>{pos.qty}</td>
                    <td>{formatCurrency(pos.avgEntryPrice)}</td>
                    <td>{formatCurrency(pos.currentPrice)}</td>
                    <td>{formatCurrency(pos.marketValue)}</td>
                    <td className={pos.unrealizedPL >= 0 ? styles.positive : styles.negative}>
                      {formatCurrency(pos.unrealizedPL)}
                    </td>
                    <td className={pos.unrealizedPLPercent >= 0 ? styles.positive : styles.negative}>
                      {formatPercent(pos.unrealizedPLPercent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent Orders</h2>
        {portfolio.recentOrders.length === 0 ? (
          <div className={styles.emptyState}>No orders yet</div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Side</th>
                  <th>Qty</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Filled Price</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className={styles.symbol}>{order.symbol}</td>
                    <td>
                      <span className={order.side === 'buy' ? styles.buy : styles.sell}>
                        {order.side.toUpperCase()}
                      </span>
                    </td>
                    <td>{order.qty}</td>
                    <td>{order.type.toUpperCase()}</td>
                    <td>
                      <span className={styles[`status-${order.status}`]}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      {order.filledAvgPrice ? formatCurrency(order.filledAvgPrice) : '-'}
                    </td>
                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
