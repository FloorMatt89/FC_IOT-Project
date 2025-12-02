require('dotenv').config();
const Alpaca = require("@alpacahq/alpaca-trade-api");

/**
 * Historical Data Trading Strategy
 *
 * Uses technical indicators (SMA, RSI) based on historical price data
 * to generate buy/sell signals.
 *
 * Strategy:
 * - BUY: When price crosses above 50-day SMA AND RSI < 30 (oversold)
 * - SELL: When price crosses below 50-day SMA OR RSI > 70 (overbought)
 */

class HistoricalDataStrategy {
    constructor(alpacaClient, config = {}) {
        this.alpaca = alpacaClient;

        // Configuration with defaults
        this.config = {
            symbols: config.symbols || ['SPY', 'AAPL', 'TSLA', 'NVDA', 'MSFT'],
            smaPeriod: config.smaPeriod || 50,
            rsiPeriod: config.rsiPeriod || 14,
            rsiBuyThreshold: config.rsiBuyThreshold || 30,
            rsiSellThreshold: config.rsiSellThreshold || 70,
            checkInterval: config.checkInterval || 60000, // 1 minute
            lookbackDays: config.lookbackDays || 100,
            maxPositionSize: config.maxPositionSize || 10,
            ...config
        };

        this.intervalId = null;
        this.previousSMA = new Map(); // Track previous SMA for crossover detection
    }

    /**
     * Start the historical data trading strategy
     */
    async start() {
        console.log('🚀 Historical Data Trading Strategy started');
        console.log(`📊 Monitoring symbols: ${this.config.symbols.join(', ')}`);
        console.log(`📈 SMA Period: ${this.config.smaPeriod} days`);
        console.log(`📉 RSI Period: ${this.config.rsiPeriod} days`);
        console.log(`⏱️  Check interval: ${this.config.checkInterval / 1000} seconds\n`);

        // Initial check
        await this.analyzeAndTrade();

        // Set up periodic checks
        this.intervalId = setInterval(async () => {
            await this.analyzeAndTrade();
        }, this.config.checkInterval);
    }

    /**
     * Stop the strategy
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('🛑 Historical Data Trading Strategy stopped');
        }
    }

    /**
     * Main analysis and trading logic
     */
    async analyzeAndTrade() {
        const timestamp = new Date().toISOString();
        console.log(`\n[${timestamp}] Running analysis...`);

        for (const symbol of this.config.symbols) {
            try {
                // Check if market is open
                const clock = await this.alpaca.getClock();
                if (!clock.is_open) {
                    console.log('⏸️  Market is closed. Waiting...');
                    return;
                }

                // Fetch historical data
                const bars = await this.getHistoricalBars(symbol);
                if (!bars || bars.length < this.config.smaPeriod) {
                    console.log(`⚠️  Insufficient data for ${symbol}`);
                    continue;
                }

                // Calculate technical indicators
                const currentPrice = parseFloat(bars[bars.length - 1].c);
                const sma = this.calculateSMA(bars, this.config.smaPeriod);
                const rsi = this.calculateRSI(bars, this.config.rsiPeriod);

                console.log(`\n${symbol}:`);
                console.log(`  Current Price: $${currentPrice.toFixed(2)}`);
                console.log(`  SMA(${this.config.smaPeriod}): $${sma.toFixed(2)}`);
                console.log(`  RSI(${this.config.rsiPeriod}): ${rsi.toFixed(2)}`);

                // Check for trading signals
                await this.executeTradeLogic(symbol, currentPrice, sma, rsi);

                // Store current SMA for next iteration
                this.previousSMA.set(symbol, sma);

            } catch (error) {
                console.error(`❌ Error analyzing ${symbol}:`, error.message);
            }
        }
    }

    /**
     * Fetch historical bars from Alpaca
     */
    async getHistoricalBars(symbol) {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - this.config.lookbackDays);

        const bars = await this.alpaca.getBarsV2(symbol, {
            start: start.toISOString(),
            end: end.toISOString(),
            timeframe: '1Day',
            limit: this.config.lookbackDays
        });

        const barArray = [];
        for await (let bar of bars) {
            barArray.push(bar);
        }

        return barArray;
    }

    /**
     * Calculate Simple Moving Average (SMA)
     */
    calculateSMA(bars, period) {
        const closePrices = bars.slice(-period).map(bar => parseFloat(bar.c));
        const sum = closePrices.reduce((acc, price) => acc + price, 0);
        return sum / period;
    }

    /**
     * Calculate Relative Strength Index (RSI)
     */
    calculateRSI(bars, period) {
        const closePrices = bars.slice(-period - 1).map(bar => parseFloat(bar.c));

        let gains = 0;
        let losses = 0;

        for (let i = 1; i < closePrices.length; i++) {
            const change = closePrices[i] - closePrices[i - 1];
            if (change > 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
        }

        const avgGain = gains / period;
        const avgLoss = losses / period;

        if (avgLoss === 0) return 100;

        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));

        return rsi;
    }

    /**
     * Execute trading logic based on indicators
     */
    async executeTradeLogic(symbol, currentPrice, sma, rsi) {
        const prevSMA = this.previousSMA.get(symbol);

        // Detect SMA crossover
        const crossedAboveSMA = prevSMA && currentPrice > sma && prevSMA < currentPrice;
        const crossedBelowSMA = prevSMA && currentPrice < sma && prevSMA > currentPrice;

        // Check current position
        const positions = await this.alpaca.getPositions();
        const hasPosition = positions.some(pos => pos.symbol === symbol);

        // BUY SIGNAL: Price above SMA AND RSI oversold
        if ((currentPrice > sma || crossedAboveSMA) && rsi < this.config.rsiBuyThreshold && !hasPosition) {
            console.log(`  🟢 BUY SIGNAL detected!`);
            await this.executeBuy(symbol);
        }

        // SELL SIGNAL: Price below SMA OR RSI overbought
        else if ((currentPrice < sma || crossedBelowSMA || rsi > this.config.rsiSellThreshold) && hasPosition) {
            console.log(`  🔴 SELL SIGNAL detected!`);
            await this.executeSell(symbol);
        }

        else {
            console.log(`  ⚪ No signal`);
        }
    }

    /**
     * Execute buy order
     */
    async executeBuy(symbol) {
        try {
            const order = await this.alpaca.createOrder({
                symbol: symbol,
                qty: this.config.maxPositionSize,
                side: 'buy',
                type: 'market',
                time_in_force: 'day'
            });
            console.log(`  ✅ Buy order placed:`, {
                symbol: order.symbol,
                qty: order.qty,
                side: order.side,
                type: order.type
            });
        } catch (error) {
            console.error(`  ❌ Error placing buy order:`, error.message);
        }
    }

    /**
     * Execute sell order (close position)
     */
    async executeSell(symbol) {
        try {
            const closedPosition = await this.alpaca.closePosition(symbol);
            console.log(`  ✅ Position closed:`, {
                symbol: closedPosition.symbol,
                qty: closedPosition.qty
            });
        } catch (error) {
            console.error(`  ❌ Error closing position:`, error.message);
        }
    }
}

module.exports = HistoricalDataStrategy;
