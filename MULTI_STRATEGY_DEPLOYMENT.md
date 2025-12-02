# Multi-Strategy Trading Bot Deployment Guide

This guide walks you through deploying the enhanced EcoTradeBin trading system with multiple strategy support (News Sentiment AI + Historical Data Analysis).

## 📋 Table of Contents

1. [What's New](#whats-new)
2. [Architecture Overview](#architecture-overview)
3. [Prerequisites](#prerequisites)
4. [Local Testing](#local-testing)
5. [AWS EC2 Deployment](#aws-ec2-deployment)
6. [Vercel Dashboard Deployment](#vercel-dashboard-deployment)
7. [Testing the Strategies](#testing-the-strategies)
8. [Troubleshooting](#troubleshooting)

---

## What's New

### Two Trading Strategies

**1. News Sentiment AI (Original)**
- Real-time news monitoring via Alpaca WebSocket
- Azure OpenAI sentiment analysis (GPT-5-nano)
- Buy on positive sentiment (score ≥ 85)
- Sell on negative sentiment (score ≤ 50)

**2. Historical Data Analysis (New)**
- Technical analysis using historical price data
- Indicators: SMA (Simple Moving Average), RSI (Relative Strength Index)
- Buy signals: Price above SMA + RSI < 30 (oversold)
- Sell signals: Price below SMA OR RSI > 70 (overbought)
- Configurable check intervals (default: 1 minute)

### Enhanced Dashboard
- Strategy selector dropdown
- Visual indicators showing active strategy
- Real-time strategy switching
- Status monitoring with strategy information

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│  Vercel Dashboard (Next.js)         │
│  - Strategy Selection UI            │
│  - Portfolio Visualization          │
│  - Bot Control Panel                │
└──────────────┬──────────────────────┘
               │ HTTPS
               ↓
┌─────────────────────────────────────┐
│  AWS EC2 (Ubuntu)                   │
│  ┌───────────────────────────────┐  │
│  │ Control API (Port 3001)       │  │
│  │ - Start/Stop/Status endpoints │  │
│  │ - Strategy parameter handling │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ Trading Service (PM2)         │  │
│  │ ┌───────────────────────────┐ │  │
│  │ │ News Sentiment Strategy   │ │  │
│  │ │ - WebSocket → Alpaca News │ │  │
│  │ │ - Azure OpenAI Analysis   │ │  │
│  │ └───────────────────────────┘ │  │
│  │ ┌───────────────────────────┐ │  │
│  │ │ Historical Data Strategy  │ │  │
│  │ │ - Fetch Historical Bars   │ │  │
│  │ │ - Calculate SMA & RSI     │ │  │
│  │ │ - Execute Trades          │ │  │
│  │ └───────────────────────────┘ │  │
│  └───────────────────────────────┘  │
└──────────────┬──────────────────────┘
               │ HTTPS
               ↓
         Alpaca Markets API
```

---

## Prerequisites

### Required API Keys

1. **Alpaca Trading API**
   - Sign up at https://alpaca.markets
   - Get API Key ID and Secret Key
   - Enable paper trading for testing

2. **Azure OpenAI** (only for News Sentiment strategy)
   - Required if using news-sentiment strategy
   - Not required for historical-data strategy

3. **AWS EC2 Instance**
   - Ubuntu Server 20.04 or later
   - t2.micro or larger
   - Security group with port 3001 open

### Software Requirements on EC2

- Node.js 18+ and npm
- PM2 process manager
- Git

---

## Local Testing

Before deploying to AWS, test the strategies locally:

### Step 1: Clone and Setup

```bash
cd ~/FC_IOT-Project/trading-service
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
nano .env
```

Update with your credentials:

```env
# Required for both strategies
APCA_API_KEY_ID=your_alpaca_key_here
APCA_API_SECRET_KEY=your_alpaca_secret_here

# Required only for news-sentiment
AZURE_OPENAI_API_KEY=your_azure_key_here

# Strategy selection
TRADING_STRATEGY=historical-data

# Historical Data Configuration
HISTORICAL_SYMBOLS=SPY,AAPL
HISTORICAL_SMA_PERIOD=50
HISTORICAL_RSI_PERIOD=14
HISTORICAL_CHECK_INTERVAL=60000
```

### Step 3: Test News Sentiment Strategy

```bash
# Run directly
TRADING_STRATEGY=news-sentiment node server.js

# Or with command line flag
node server.js --mode news-sentiment
```

Expected output:
```
═══════════════════════════════════════════════
  🤖 EcoTradeBin Trading Service
═══════════════════════════════════════════════

📋 Selected Strategy: news-sentiment
📊 Paper Trading: ENABLED

───────────────────────────────────────────────

🚀 News Sentiment Trading Strategy started
📰 Monitoring news for: *
📈 Buy threshold: 85
📉 Sell threshold: 50

✅ WebSocket connected!
```

### Step 4: Test Historical Data Strategy

```bash
# Run directly
TRADING_STRATEGY=historical-data node server.js

# Or with command line flag
node server.js --mode historical-data
```

Expected output:
```
═══════════════════════════════════════════════
  🤖 EcoTradeBin Trading Service
═══════════════════════════════════════════════

📋 Selected Strategy: historical-data
📊 Paper Trading: ENABLED

───────────────────────────────────────────────

🚀 Historical Data Trading Strategy started
📊 Monitoring symbols: SPY, AAPL
📈 SMA Period: 50 days
📉 RSI Period: 14 days
⏱️  Check interval: 60 seconds

[2025-11-30T...] Running analysis...

SPY:
  Current Price: $456.78
  SMA(50): $452.30
  RSI(14): 58.23
  ⚪ No signal
```

---

## AWS EC2 Deployment

### Step 1: Push Code to GitHub

```bash
cd ~/FC_IOT-Project

# Check current branch
git branch

# Add and commit changes
git add .
git commit -m "Add multi-strategy trading support"
git push origin historical-algo
```

### Step 2: SSH into EC2

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### Step 3: Pull Latest Code

```bash
cd ~/FC_IOT-Project
git pull origin historical-algo

cd trading-service
npm install
```

### Step 4: Update Environment Variables

```bash
nano .env
```

Add/update these variables:

```env
# Alpaca API (Required)
APCA_API_KEY_ID=your_alpaca_key_id
APCA_API_SECRET_KEY=your_alpaca_secret_key

# Azure OpenAI (Required for news-sentiment only)
AZURE_OPENAI_API_KEY=your_azure_openai_key

# Control API
CONTROL_API_KEY=your_secure_random_key_here
VERCEL_URL=https://your-app.vercel.app

# Strategy Configuration (Optional - can be set via dashboard)
TRADING_STRATEGY=news-sentiment

# Historical Data Settings (adjust as needed)
HISTORICAL_SYMBOLS=SPY,AAPL,TSLA,NVDA,MSFT
HISTORICAL_SMA_PERIOD=50
HISTORICAL_RSI_PERIOD=14
HISTORICAL_RSI_BUY=30
HISTORICAL_RSI_SELL=70
HISTORICAL_CHECK_INTERVAL=60000
HISTORICAL_LOOKBACK_DAYS=100
HISTORICAL_MAX_POSITION=10

# News Sentiment Settings
NEWS_SYMBOLS=*
NEWS_BUY_THRESHOLD=85
NEWS_SELL_THRESHOLD=50
```

Save with `Ctrl+X`, `Y`, `Enter`

### Step 5: Restart Services with PM2

```bash
# Stop existing services
pm2 stop all

# Delete old processes
pm2 delete all

# Start Control API
pm2 start control-api.js --name control-api

# Start Trading Service (will use dashboard to select strategy)
# Or manually start with a specific strategy:
pm2 start server.js --name trading-service -- --mode historical-data

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs

# Check status
pm2 status
```

### Step 6: Verify Services

```bash
# Check Control API
curl http://localhost:3001/health

# Check with API key
curl -H "x-api-key: YOUR_CONTROL_API_KEY" http://localhost:3001/status

# View logs
pm2 logs trading-service
pm2 logs control-api
```

### Step 7: Ensure Security Group is Configured

1. Go to AWS Console → EC2 → Security Groups
2. Find your instance's security group
3. Verify Inbound Rule exists:
   - **Type**: Custom TCP
   - **Port**: 3001
   - **Source**: 0.0.0.0/0 (or restrict to Vercel IPs)

---

## Vercel Dashboard Deployment

### Step 1: Update Vercel Environment Variables

Go to Vercel → Your Project → Settings → Environment Variables

Ensure these are set for **Production**, **Preview**, and **Development**:

```
EC2_CONTROL_API_URL=http://YOUR_EC2_PUBLIC_IP:3001
EC2_CONTROL_API_KEY=your_control_api_key_from_ec2
APCA_API_KEY_ID=your_alpaca_key
APCA_API_SECRET_KEY=your_alpaca_secret
```

### Step 2: Push Dashboard Changes

```bash
cd ~/FC_IOT-Project

git add .
git commit -m "Add multi-strategy dashboard UI"
git push origin historical-algo
```

### Step 3: Deploy to Vercel

If auto-deploy is enabled, Vercel will deploy automatically. Otherwise:

1. Go to Vercel dashboard
2. Select your project
3. Click "Deploy" on the `historical-algo` branch

### Step 4: Test the Dashboard

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. You should see the updated Trading Bot button
3. Click the button when stopped to see strategy options:
   - 📰 News Sentiment AI
   - 📊 Historical Data
4. Select a strategy to start the bot
5. When running, the button shows the active strategy

---

## Testing the Strategies

### Test 1: Start with News Sentiment

1. Open your dashboard
2. Click the Trading Bot button (if stopped)
3. Select "📰 News Sentiment AI"
4. Verify on EC2:

```bash
pm2 logs trading-service --lines 50
```

You should see:
```
📋 Selected Strategy: news-sentiment
🚀 News Sentiment Trading Strategy started
✅ WebSocket connected!
```

### Test 2: Switch to Historical Data

1. In dashboard, click the bot button to stop
2. Click again and select "📊 Historical Data"
3. Verify on EC2:

```bash
pm2 logs trading-service --lines 50
```

You should see:
```
📋 Selected Strategy: historical-data
🚀 Historical Data Trading Strategy started
📊 Monitoring symbols: SPY, AAPL, TSLA, NVDA, MSFT

[timestamp] Running analysis...
SPY:
  Current Price: $456.78
  SMA(50): $452.30
  RSI(14): 58.23
  ⚪ No signal
```

### Test 3: Verify Strategy Persistence

1. Check current status via API:

```bash
curl -H "x-api-key: YOUR_KEY" http://YOUR_EC2_IP:3001/status
```

Response should include:
```json
{
  "status": "online",
  "strategy": "historical-data"
}
```

2. Refresh dashboard - it should show the correct active strategy

---

## Troubleshooting

### Issue: Dashboard shows "Error"

**Check Control API logs:**
```bash
pm2 logs control-api
```

**Verify EC2 connectivity:**
```bash
curl http://YOUR_EC2_IP:3001/health
```

**Check Vercel environment variables:**
- Make sure `EC2_CONTROL_API_URL` is correct
- Verify `EC2_CONTROL_API_KEY` matches EC2 `.env`

### Issue: Historical strategy not fetching data

**Error: "Insufficient data"**

Solution: The market might be closed, or you need more historical data.

```bash
# Check if market is open
curl https://paper-api.alpaca.markets/v2/clock \
  -H "APCA-API-KEY-ID: YOUR_KEY" \
  -H "APCA-API-SECRET-KEY: YOUR_SECRET"

# Increase lookback days in .env
HISTORICAL_LOOKBACK_DAYS=200
```

### Issue: News sentiment not triggering trades

**Possible causes:**
1. No news for subscribed symbols
2. Sentiment scores not meeting thresholds

**Solution:**
- Monitor specific high-activity stocks:
  ```env
  NEWS_SYMBOLS=TSLA,AAPL,NVDA
  ```
- Lower thresholds for testing:
  ```env
  NEWS_BUY_THRESHOLD=70
  NEWS_SELL_THRESHOLD=60
  ```

### Issue: PM2 process keeps restarting

**Check logs:**
```bash
pm2 logs trading-service --err
```

**Common issues:**
- Missing Azure OpenAI key (for news-sentiment)
- Invalid Alpaca credentials
- Network connectivity issues

**Solution:**
```bash
# Test Alpaca connection
node -e "
const Alpaca = require('@alpacahq/alpaca-trade-api');
const alpaca = new Alpaca({
  keyId: 'YOUR_KEY',
  secretKey: 'YOUR_SECRET',
  paper: true
});
alpaca.getAccount().then(console.log).catch(console.error);
"
```

### Issue: Strategy not switching

**Check Control API:**
```bash
pm2 logs control-api
```

Look for: `Switching strategy from X to Y`

**Manual switch:**
```bash
cd ~/FC_IOT-Project/trading-service
pm2 delete trading-service
pm2 start server.js --name trading-service -- --mode historical-data
pm2 save
```

### Issue: "Unauthorized" from Control API

**API keys don't match:**

```bash
# On EC2, check the key
cat ~/FC_IOT-Project/trading-service/.env | grep CONTROL_API_KEY

# Compare with Vercel environment variable
# They must match EXACTLY
```

---

## Performance Tuning

### Historical Data Strategy

**For faster execution:**
```env
HISTORICAL_CHECK_INTERVAL=300000  # 5 minutes instead of 1
HISTORICAL_SYMBOLS=SPY,AAPL       # Monitor fewer symbols
```

**For more accurate signals:**
```env
HISTORICAL_SMA_PERIOD=200         # Longer moving average
HISTORICAL_LOOKBACK_DAYS=365      # More historical context
```

### News Sentiment Strategy

**For specific stocks:**
```env
NEWS_SYMBOLS=TSLA,AAPL,NVDA,MSFT
```

**For all stocks (high volume):**
```env
NEWS_SYMBOLS=*
```

---

## Production Hardening

### 1. Use HTTPS for EC2

Consider using Cloudflare Tunnel instead of exposing port 3001:

```bash
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Create tunnel
cloudflared tunnel create trading-bot

# Route to local service
cloudflared tunnel route dns trading-bot trading.yourdomain.com

# Run tunnel
cloudflared tunnel run trading-bot --url http://localhost:3001
```

Update Vercel env var:
```
EC2_CONTROL_API_URL=https://trading.yourdomain.com
```

### 2. Enable Live Trading

⚠️ **Only after thorough testing in paper mode!**

In `server.js`, change:
```javascript
paper: false  // Enable live trading
```

### 3. Set up Monitoring

```bash
# Install monitoring tools
pm2 install pm2-logrotate

# Configure alerts
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 4. Backup Configuration

```bash
# Backup your .env file
cp ~/FC_IOT-Project/trading-service/.env ~/trading-backup.env

# Save PM2 ecosystem
pm2 save
```

---

## Summary

After completing these steps, you have:

- ✅ Two trading strategies: News Sentiment AI + Historical Data
- ✅ User-selectable strategy in dashboard
- ✅ Real-time strategy switching
- ✅ Configurable parameters for each strategy
- ✅ Deployed to AWS EC2 with PM2 management
- ✅ Integrated with Vercel dashboard
- ✅ Secure API key authentication

**Next Steps:**
1. Monitor both strategies in paper trading mode
2. Compare performance metrics
3. Optimize configuration based on results
4. Consider enabling live trading when confident

---

## Support & Resources

- **Alpaca API Docs**: https://alpaca.markets/docs/
- **Technical Indicators**: https://www.investopedia.com/
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/usage/quick-start/

Happy Trading! 🚀📈
