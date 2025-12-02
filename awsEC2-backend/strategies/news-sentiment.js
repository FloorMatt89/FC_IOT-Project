require('dotenv').config();
const Alpaca = require("@alpacahq/alpaca-trade-api");
const WS = require('ws');
const { AzureOpenAI } = require("openai");

/**
 * News Sentiment Trading Strategy
 *
 * Uses Azure OpenAI to analyze real-time news sentiment and
 * execute trades based on sentiment scores.
 *
 * Strategy:
 * - BUY: When sentiment score >= 85 (highly positive news)
 * - SELL: When sentiment score <= 50 (negative news)
 */

class NewsSentimentStrategy {
    constructor(alpacaClient, config = {}) {
        this.alpaca = alpacaClient;

        // Configuration with defaults
        this.config = {
            symbols: config.symbols || ['*'], // ['*'] = all stocks, or specify: ['TSLA', 'AAPL']
            buyThreshold: config.buyThreshold || 85,
            sellThreshold: config.sellThreshold || 50,
            ...config
        };

        // Initialize Azure OpenAI client
        this.azureClient = new AzureOpenAI({
            endpoint: "https://wyatt3.cognitiveservices.azure.com/",
            apiKey: process.env.AZURE_OPENAI_API_KEY,
            deployment: "gpt-5-nano",
            apiVersion: "2024-04-01-preview"
        });

        this.wss = null;
    }

    /**
     * Start the news sentiment trading strategy
     */
    async start() {
        console.log('🚀 News Sentiment Trading Strategy started');
        console.log(`📰 Monitoring news for: ${this.config.symbols.join(', ')}`);
        console.log(`📈 Buy threshold: ${this.config.buyThreshold}`);
        console.log(`📉 Sell threshold: ${this.config.sellThreshold}\n`);

        // Connect to Alpaca news WebSocket
        this.wss = new WS("wss://stream.data.alpaca.markets/v1beta1/news");

        this.wss.on('open', () => {
            console.log("✅ WebSocket connected!");

            // Authenticate
            const authMsg = {
                action: 'auth',
                key: process.env.APCA_API_KEY_ID,
                secret: process.env.APCA_API_SECRET_KEY
            };
            this.wss.send(JSON.stringify(authMsg));

            // Subscribe to news feeds
            const subscribeMsg = {
                action: 'subscribe',
                news: this.config.symbols
            };
            this.wss.send(JSON.stringify(subscribeMsg));
        });

        this.wss.on('message', async (message) => {
            await this.handleNewsEvent(message);
        });

        this.wss.on('error', (error) => {
            console.error('❌ WebSocket error:', error);
        });

        this.wss.on('close', () => {
            console.log('🔌 WebSocket connection closed');
        });
    }

    /**
     * Stop the strategy
     */
    stop() {
        if (this.wss) {
            this.wss.close();
            this.wss = null;
            console.log('🛑 News Sentiment Trading Strategy stopped');
        }
    }

    /**
     * Handle incoming news events
     */
    async handleNewsEvent(message) {
        console.log("📨 Message received: " + message);

        try {
            const currentEvent = JSON.parse(message)[0];

            if (currentEvent.T === "n") { // Check if it's a news event
                const timestamp = new Date().toISOString();
                console.log(`\n[${timestamp}] Processing news event...`);
                console.log(`Headline: ${currentEvent.headline}`);

                // Analyze sentiment using Azure OpenAI
                const sentimentScore = await this.analyzeSentiment(currentEvent.headline);

                if (sentimentScore === null) {
                    console.log('⚠️  Skipping trade due to sentiment analysis error');
                    return;
                }

                console.log(`Sentiment Score: ${sentimentScore}/100`);

                // Execute trade based on sentiment
                const tickerSymbol = currentEvent.symbols[0];
                await this.executeTradeLogic(tickerSymbol, sentimentScore);
            }
        } catch (error) {
            console.error('❌ Error handling news event:', error.message);
        }
    }

    /**
     * Analyze news headline sentiment using Azure OpenAI
     */
    async analyzeSentiment(headline) {
        try {
            const response = await this.azureClient.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "Only respond with a number from 1-100 detailing the impact of the headline. The lower the value, the more negatively impactful the headline is. The higher the value, the more positively impactful the headline is."
                    },
                    {
                        role: "user",
                        content: `Given the headline '${headline}', show me a number from 1-100 detailing the impact of this headline.`
                    }
                ],
                max_completion_tokens: 16384,
                model: "gpt-5-nano"
            });

            const sentimentScore = parseInt(response.choices[0].message.content);
            console.log(`Azure OpenAI Response: ${response.choices[0].message.content}`);

            return sentimentScore;
        } catch (error) {
            console.error("❌ Error calling Azure OpenAI:", error.message);
            return null;
        }
    }

    /**
     * Execute trading logic based on sentiment score
     */
    async executeTradeLogic(symbol, sentimentScore) {
        // BUY SIGNAL: Highly positive sentiment
        if (sentimentScore >= this.config.buyThreshold) {
            const qty = 100 - sentimentScore; // The higher the sentiment, the fewer shares (more confidence)
            console.log(`🟢 BUY SIGNAL: Sentiment ${sentimentScore} >= ${this.config.buyThreshold}`);
            await this.executeBuy(symbol, qty);
        }

        // SELL SIGNAL: Negative sentiment
        else if (sentimentScore <= this.config.sellThreshold) {
            console.log(`🔴 SELL SIGNAL: Sentiment ${sentimentScore} <= ${this.config.sellThreshold}`);
            await this.executeSell(symbol);
        }

        else {
            console.log(`⚪ No signal: Sentiment ${sentimentScore} is neutral`);
        }
    }

    /**
     * Execute buy order
     */
    async executeBuy(symbol, qty) {
        try {
            const order = await this.alpaca.createOrder({
                symbol: symbol,
                qty: qty,
                side: 'buy',
                type: 'market',
                time_in_force: 'day'
            });
            console.log("✅ Buy order placed:", {
                symbol: order.symbol,
                qty: order.qty,
                side: order.side,
                type: order.type
            });
        } catch (error) {
            console.error("❌ Error placing buy order:", error.message);
        }
    }

    /**
     * Execute sell order (close position)
     */
    async executeSell(symbol) {
        try {
            // Check if position exists before closing
            const positions = await this.alpaca.getPositions();
            const hasPosition = positions.some(pos => pos.symbol === symbol);

            if (hasPosition) {
                const closedPosition = await this.alpaca.closePosition(symbol);
                console.log("✅ Position closed:", {
                    symbol: closedPosition.symbol,
                    qty: closedPosition.qty
                });
            } else {
                console.log(`ℹ️  No position for ${symbol} to close`);
            }
        } catch (error) {
            console.error("❌ Error closing position:", error.message);
        }
    }
}

module.exports = NewsSentimentStrategy;
