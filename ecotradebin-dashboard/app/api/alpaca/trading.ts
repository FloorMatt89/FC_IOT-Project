const { loadEnvConfig } = require('@next/env');
const projectDir = require('path').join(__dirname, '../../..');
loadEnvConfig(projectDir);

const Alpaca = require("@alpacahq/alpaca-trade-api");
const alpaca = new Alpaca(); // Environment Variables
const WS = require('ws');
const { AzureOpenAI } = require("openai");

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


const wss = new WS("wss://stream.data.alpaca.markets/v1beta1/news");

wss.on('open', function(){
    console.log("Websocket connected!");

    // Log in to data source
    const authMsg = {
        action: 'auth',
        key: process.env.APCA_API_KEY_ID,
        secret: process.env.APCA_API_SECRET_KEY
    };
    wss.send(JSON.stringify(authMsg)); //Send auth data to ws

    // Subscribe to all news feeds in the world
    const subscribeMsg = {
        action: 'subscribe',
        news:['*'] // Need to change to only sustainable stocks in the future Example: ["GOOG"]

    };
    wss.send(JSON.stringify(subscribeMsg)); // Connecting to live news
});

wss.on('message', async function(message){
    console.log("Message is " + message);
    const currentEvent = JSON.parse(message)[0];

    if(currentEvent.T === "n"){ // Check if it is a news event
        let companyImpact = 0;

        // Ask Azure OpenAI (GPT-5 mini) its thoughts on the headline
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
            return; // Skip trading if AI call fails
        }

        // Make trades based on the output (of the impact saved in companyImpact)
        const tickerSymbol = currentEvent.symbols[0];

        // Score from 1-100, 1 being most negative, 100 being the most positive impact on a company
        if(companyImpact >= 70) { // if score >= 70: BUY STOCK
            var amt = 100 - companyImpact;
            // Buy stock
            try {
                let order = await alpaca.createOrder({
                    symbol: tickerSymbol,
                    qty: amt,
                    side: 'buy',
                    type: 'market',
                    time_in_force: 'day'
                });
                console.log("Buy order placed:", order);
            } catch (error) {
                console.error("Error placing buy order:", error);
            }
        } else if (companyImpact <= 30 && alpaca.getPosition(tickerSymbol)) { // else if impact <= 30: SELL ALL OF STOCK
            // Sell stock
            try {
                let closedPosition = await alpaca.closePosition(tickerSymbol);
                console.log("Position closed:", closedPosition);
            } catch (error) {
                console.error("Error closing position:", error);
            }
        }
    }
})