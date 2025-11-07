const { loadEnvConfig } = require('@next/env');
const projectDir = require('path').join(__dirname, '../../..');
loadEnvConfig(projectDir);

const Alpaca = require("@alpacahq/alpaca-trade-api");
const alpaca = new Alpaca(); // Environment Variables
const WS = require('ws');


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
    console.log("Message is" + message);
    const currentEvent = JSON.parse(message)[0];
    if(currentEvent.T === "n"){ // Check if it is a news event
        //Ask Azure on its thoughts of the headline

        //Make trades based on output

        //Score from 1- 100, 1 being most negative, 100 being the most positive impact on a company
        // If score >=70 : Buy the Stock

        // Else if score <= 30: Sell all stock
    }
})