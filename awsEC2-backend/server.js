require('dotenv').config();
const Alpaca = require("@alpacahq/alpaca-trade-api");
const NewsSentimentStrategy = require('./strategies/news-sentiment');
const HistoricalDataStrategy = require('./strategies/historical-data');

/**
 * EcoTradeBin Trading Service
 *
 * Supports multiple trading strategies:
 * - news-sentiment: AI-driven news sentiment analysis (default)
 * - historical-data: Technical analysis using historical price data
 *
 * Set TRADING_STRATEGY environment variable to choose strategy
 */

// Parse command line arguments
const args = process.argv.slice(2);
let tradingStrategy = process.env.TRADING_STRATEGY || 'news-sentiment';

// Check for --mode flag from command line
const modeIndex = args.indexOf('--mode');
if (modeIndex !== -1 && args[modeIndex + 1]) {
    tradingStrategy = args[modeIndex + 1];
}

// Initialize Alpaca client (shared by all strategies)
const alpaca = new Alpaca({
    keyId: process.env.APCA_API_KEY_ID,
    secretKey: process.env.APCA_API_SECRET_KEY,
    paper: true // Set to false for live trading
});

// Configuration for strategies
const strategyConfig = {
    'news-sentiment': {
        symbols: process.env.NEWS_SYMBOLS ? process.env.NEWS_SYMBOLS.split(',') : ['*'],
        buyThreshold: parseInt(process.env.NEWS_BUY_THRESHOLD) || 85,
        sellThreshold: parseInt(process.env.NEWS_SELL_THRESHOLD) || 50
    },
    'historical-data': {
        symbols: process.env.HISTORICAL_SYMBOLS ? process.env.HISTORICAL_SYMBOLS.split(',') : ['SPY', 'AAPL', 'TSLA', 'NVDA', 'MSFT'],
        smaPeriod: parseInt(process.env.HISTORICAL_SMA_PERIOD) || 50,
        rsiPeriod: parseInt(process.env.HISTORICAL_RSI_PERIOD) || 14,
        rsiBuyThreshold: parseInt(process.env.HISTORICAL_RSI_BUY) || 30,
        rsiSellThreshold: parseInt(process.env.HISTORICAL_RSI_SELL) || 70,
        checkInterval: parseInt(process.env.HISTORICAL_CHECK_INTERVAL) || 60000,
        lookbackDays: parseInt(process.env.HISTORICAL_LOOKBACK_DAYS) || 100,
        maxPositionSize: parseInt(process.env.HISTORICAL_MAX_POSITION) || 10
    }
};

// Initialize and start the selected strategy
let activeStrategy = null;

async function startTradingService() {
    console.log('\n═══════════════════════════════════════════════');
    console.log('  🤖 EcoTradeBin Trading Service');
    console.log('═══════════════════════════════════════════════\n');

    console.log(`📋 Selected Strategy: ${tradingStrategy}`);
    console.log(`📊 Paper Trading: ${alpaca.configuration.paper ? 'ENABLED' : 'DISABLED'}`);
    console.log('\n───────────────────────────────────────────────\n');

    try {
        switch (tradingStrategy) {
            case 'news-sentiment':
                activeStrategy = new NewsSentimentStrategy(alpaca, strategyConfig['news-sentiment']);
                break;

            case 'historical-data':
                activeStrategy = new HistoricalDataStrategy(alpaca, strategyConfig['historical-data']);
                break;

            default:
                console.error(`❌ Unknown strategy: ${tradingStrategy}`);
                console.log('Available strategies: news-sentiment, historical-data');
                process.exit(1);
        }

        await activeStrategy.start();
    } catch (error) {
        console.error('❌ Error starting trading service:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down trading service...');
    if (activeStrategy && activeStrategy.stop) {
        activeStrategy.stop();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n🛑 Shutting down trading service...');
    if (activeStrategy && activeStrategy.stop) {
        activeStrategy.stop();
    }
    process.exit(0);
});

// Start the service
startTradingService();
