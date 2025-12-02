require('dotenv').config();
const Alpaca = require("@alpacahq/alpaca-trade-api");
const WS = require('ws');
const { AzureOpenAI } = require("openai");

// Initialize Alpaca
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

// WebSocket connection to Alpaca
const wss = new WS("wss://stream.data.alpaca.markets/v1beta1/news");

wss.on('open', function(){
    console.log("WebSocket connected!");

    // Authenticate
    const authMsg = {
        action: 'auth',
        key: process.env.APCA_API_KEY_ID,
        secret: process.env.APCA_API_SECRET_KEY
    };
    wss.send(JSON.stringify(authMsg));

    // Subscribe to news feeds
    const subscribeMsg = {
        action: 'subscribe',
        news: ['*'] // Change to specific stocks: ["TSLA", "AAPL"]
    };
    wss.send(JSON.stringify(subscribeMsg));
});

wss.on('message', async function(message){
    console.log("Message received: " + message);
    const currentEvent = JSON.parse(message)[0];

    if(currentEvent.T === "n"){ // Check if it's a news event
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
                        content: "Given the headline '" + currentEvent.headline + "', show me a number from 1-100 detailing the impact of this headline."
                    }
                ],
                max_completion_tokens: 16384,
                model: modelName
            });

            console.log("Azure OpenAI Response:", response.choices[0].message);
            companyImpact = parseInt(response.choices[0].message.content);
        } catch (error) {
            console.error("Error calling Azure OpenAI:", error);
            return;
        }

        // Execute trades based on sentiment
        const tickerSymbol = currentEvent.symbols[0];

        if(companyImpact >= 85) {
            const amt = 100 - companyImpact;
            try {
                let order = await alpaca.createOrder({
                    symbol: tickerSymbol,
                    qty: amt,
                    side: 'buy',
                    type: 'market',
                    time_in_force: 'day'
                });
                console.log("✅ Buy order placed:", order);
            } catch (error) {
                console.error("❌ Error placing buy order:", error.message);
            }
        } else if (companyImpact <= 50) {
            try {
                // Check if position exists before closing
                const positions = await alpaca.getPositions();
                const hasPosition = positions.some(pos => pos.symbol === tickerSymbol);

                if (hasPosition) {
                    let closedPosition = await alpaca.closePosition(tickerSymbol);
                    console.log("✅ Position closed:", closedPosition);
                } else {
                    console.log(`ℹ️  No position for ${tickerSymbol} to close`);
                }
            } catch (error) {
                console.error("❌ Error closing position:", error.message);
            }
        }
    }
});

wss.on('error', function(error) {
    console.error('WebSocket error:', error);
});

wss.on('close', function() {
    console.log('WebSocket connection closed');
});

// Keep the process running
console.log('🚀 Trading service started...');
console.log('📊 Listening for market news...');
