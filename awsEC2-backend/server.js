require('dotenv').config();
const Alpaca = require("@alpacahq/alpaca-trade-api");
const WS = require('ws');
const { AzureOpenAI } = require("openai");

/**
 * EcoTradeBin Trading Service
 * News Sentiment Analysis Strategy
 */

// Initialize Alpaca client
const alpaca = new Alpaca({
    keyId: process.env.APCA_API_KEY_ID,
    secretKey: process.env.APCA_API_SECRET_KEY,
    paper: true // Set to false for live trading
});

// Initialize Azure OpenAI client
const endpoint = "https://wyatt3.cognitiveservices.azure.com/";
const apiVersion = "2024-04-01-preview";
const modelName = "gpt-5-nano";
const deployment = "gpt-5-nano";

const azureClient = new AzureOpenAI({
    endpoint,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    deployment,
    apiVersion
});

// Trading thresholds (can be configured via environment variables)
const BUY_THRESHOLD = parseInt(process.env.NEWS_BUY_THRESHOLD) || 85;
const SELL_THRESHOLD = parseInt(process.env.NEWS_SELL_THRESHOLD) || 50;

console.log('\n═══════════════════════════════════════════════');
console.log('  🤖 EcoTradeBin Trading Service');
console.log('  📊 News Sentiment Analysis');
console.log('═══════════════════════════════════════════════\n');
console.log(`📈 Buy Threshold: ${BUY_THRESHOLD}`);
console.log(`📉 Sell Threshold: ${SELL_THRESHOLD}`);
console.log(`📊 Paper Trading: ${alpaca.configuration.paper ? 'ENABLED' : 'DISABLED'}`);
console.log('\n───────────────────────────────────────────────\n');

// Connect to Alpaca news WebSocket
const wss = new WS("wss://stream.data.alpaca.markets/v1beta1/news");

wss.on('open', function(){
    console.log("✅ WebSocket connected!");

    // Log in to data source
    const authMsg = {
        action: 'auth',
        key: process.env.APCA_API_KEY_ID,
        secret: process.env.APCA_API_SECRET_KEY
    };
    wss.send(JSON.stringify(authMsg));

    // Subscribe to all news feeds
    const subscribeMsg = {
        action: 'subscribe',
        news: ['*'] // Subscribe to all news (can be restricted to specific symbols)
    };
    wss.send(JSON.stringify(subscribeMsg));
    console.log("📡 Subscribed to news feed...\n");
});

wss.on('message', async function(message){
    const currentEvent = JSON.parse(message)[0];

    if(currentEvent.T === "n"){ // Check if it is a news event
        const headline = currentEvent.headline;
        const symbols = currentEvent.symbols;

        if (!symbols || symbols.length === 0) {
            return; // Skip if no symbols
        }

        const tickerSymbol = symbols[0];
        console.log(`\n📰 News: ${headline}`);
        console.log(`🏢 Symbol: ${tickerSymbol}`);

        let companyImpact = 0;

        // Ask Azure OpenAI for sentiment analysis
        try {
            const response = await azureClient.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "Only respond with a number from 1-100 detailing the impact of the headline. The lower the value, the more negatively impactful the headline is. The higher the value, the more positively impactful the headline is."
                    },
                    {
                        role: "user",
                        content: "Given the headline '" + headline + "', show me a number from 1-100 detailing the impact of this headline."
                    }
                ],
                max_completion_tokens: 16384,
                model: modelName
            });

            companyImpact = parseInt(response.choices[0].message.content);
            console.log(`🤖 AI Sentiment Score: ${companyImpact}/100`);
        } catch (error) {
            console.error("❌ Error calling Azure OpenAI:", error.message);
            return; // Skip trading if AI call fails
        }

        // Make trades based on sentiment score
        if(companyImpact >= BUY_THRESHOLD) {
            // Buy stock
            const qty = 100 - companyImpact; // Higher impact = smaller position
            try {
                let order = await alpaca.createOrder({
                    symbol: tickerSymbol,
                    qty: qty,
                    side: 'buy',
                    type: 'market',
                    time_in_force: 'day'
                });
                console.log(`✅ BUY order placed: ${qty} shares of ${tickerSymbol}`);
            } catch (error) {
                console.error(`❌ Error placing buy order: ${error.message}`);
            }
        } else if (companyImpact <= SELL_THRESHOLD) {
            // Check if we have a position to sell
            try {
                const position = await alpaca.getPosition(tickerSymbol);
                if (position) {
                    let closedPosition = await alpaca.closePosition(tickerSymbol);
                    console.log(`✅ SELL: Closed position for ${tickerSymbol}`);
                }
            } catch (error) {
                // Position doesn't exist or error closing it
                if (error.message && !error.message.includes('position does not exist')) {
                    console.error(`❌ Error closing position: ${error.message}`);
                }
            }
        } else {
            console.log(`⏸️  HOLD: Score ${companyImpact} is between thresholds`);
        }
    }
});

wss.on('error', function(error) {
    console.error('❌ WebSocket error:', error);
});

wss.on('close', function() {
    console.log('🔌 WebSocket connection closed');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down trading service...');
    wss.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n🛑 Shutting down trading service...');
    wss.close();
    process.exit(0);
});
