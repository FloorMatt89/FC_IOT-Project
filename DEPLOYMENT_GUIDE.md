# EcoTradeBin Deployment Guide

## Architecture

```
┌─────────────────────┐
│  Vercel (Frontend)  │
│  - Next.js Dashboard│
│  - Trading Controls │
└──────────┬──────────┘
           │
           ↓ HTTP (Port 3001)
┌─────────────────────┐
│  AWS EC2 (Backend)  │
│  - Control API      │ (Port 3001)
│  - Trading Service  │ (WebSocket)
└─────────────────────┘
           │
           ↓
     Alpaca Markets API
```

## Part 1: Deploy Control API on AWS EC2

### 1. Push code to GitHub

```bash
git add .
git commit -m "Add trading bot control API"
git push origin main
```

### 2. SSH into your EC2 instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 3. Pull latest code

```bash
cd ~/FC_IOT-Project
git pull origin main
cd trading-service
```

### 4. Install Express dependency

```bash
npm install
```

### 5. Generate a secure API key

```bash
# Generate a random API key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output - this is your `CONTROL_API_KEY`

### 6. Update .env file

```bash
nano .env
```

Add these new lines:

```
CONTROL_API_KEY=paste_the_key_you_generated_above
VERCEL_URL=https://your-app-name.vercel.app
```

Save with `Ctrl+X`, `Y`, `Enter`

### 7. Configure EC2 Security Group

1. Go to AWS Console → EC2 → Security Groups
2. Find your instance's security group
3. Add Inbound Rule:
   - **Type**: Custom TCP
   - **Port**: 3001
   - **Source**: Anywhere IPv4 (0.0.0.0/0)
   - **Description**: Control API
4. Save rules

### 8. Start the Control API with PM2

```bash
# Start the control API
pm2 start control-api.js --name control-api

# Save PM2 process list
pm2 save

# View status
pm2 status

# You should see both:
# - trading-service (online)
# - control-api (online)
```

### 9. Test the Control API

```bash
# Get your EC2 public IP
curl -4 icanhazip.com

# Test health endpoint (should work without auth)
curl http://YOUR_EC2_IP:3001/health

# Test with API key (replace with your actual key)
curl -X GET http://YOUR_EC2_IP:3001/status \
  -H "x-api-key: YOUR_CONTROL_API_KEY"
```

You should get a response with the trading service status!

## Part 2: Deploy Frontend to Vercel

### 1. Add Environment Variables in Vercel

Go to Vercel → Your Project → Settings → Environment Variables

Add these variables for **Production**, **Preview**, and **Development**:

```
EC2_CONTROL_API_URL=http://YOUR_EC2_PUBLIC_IP:3001
EC2_CONTROL_API_KEY=your_control_api_key_from_above
APCA_API_KEY_ID=your_alpaca_key
APCA_API_SECRET_KEY=your_alpaca_secret
```

**Important**: Replace `YOUR_EC2_PUBLIC_IP` with your actual EC2 public IP address!

### 2. Deploy to Vercel

```bash
git add .
git commit -m "Add trading bot control integration"
git push origin main
```

Vercel will automatically deploy!

### 3. Test Your Dashboard

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. You should see a button in the bottom-right: **"Trading Bot: Active"**
3. Click it to stop the bot
4. Click again to restart it

## Troubleshooting

### Trading Bot Button Shows "Error"

**Check EC2 Control API logs:**

```bash
pm2 logs control-api
```

**Check EC2 Security Group:**
- Make sure port 3001 is open
- Test: `curl http://YOUR_EC2_IP:3001/health`

**Check Vercel Environment Variables:**
- Verify `EC2_CONTROL_API_URL` is set correctly
- Verify `EC2_CONTROL_API_KEY` matches your EC2 .env file

### Control API Returns "Unauthorized"

The API key doesn't match. Check:

```bash
# On EC2
cat ~/FC_IOT-Project/trading-service/.env | grep CONTROL_API_KEY

# On Vercel
# Settings → Environment Variables → EC2_CONTROL_API_KEY
```

They must match exactly!

### Can't Connect to EC2

**Check Security Group:**
- Port 3001 must be open
- Source: 0.0.0.0/0 (or restrict to Vercel IPs)

**Check Control API is running:**

```bash
pm2 status
# control-api should show "online"
```

## Production Hardening (Optional)

### Use HTTPS with Cloudflare Tunnel

For production, consider using Cloudflare Tunnel instead of exposing port 3001:

1. Install Cloudflare Tunnel on EC2
2. Create a tunnel to your Control API
3. Update `EC2_CONTROL_API_URL` to use the tunnel URL

This provides:
- ✅ Free HTTPS
- ✅ No exposed ports
- ✅ DDoS protection
- ✅ Better security

### Restrict API Access

Update `control-api.js` CORS to only allow your Vercel domain:

```javascript
const allowedOrigins = [
  process.env.VERCEL_URL,
  // Remove 'http://localhost:3000' in production
];
```

## Summary

After completing these steps, you'll have:

- ✅ Next.js dashboard on Vercel
- ✅ Trading bot on AWS EC2
- ✅ Control API on AWS EC2
- ✅ Start/Stop button working in your dashboard
- ✅ Secure API key authentication
- ✅ Real-time control of your trading bot

Your architecture is now complete! 🎉
