require('dotenv').config();
const express = require('express');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());

// API Key authentication middleware
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.CONTROL_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

// CORS middleware (only allow your Vercel domain)
app.use((req, res, next) => {
  const allowedOrigins = [
    process.env.VERCEL_URL,
    'http://localhost:3000'
  ].filter(Boolean);

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Control API is running' });
});

// Get trading service status
app.get('/status', authenticate, async (req, res) => {
  try {
    const { stdout } = await execPromise('pm2 jlist');
    const processes = JSON.parse(stdout);
    const tradingService = processes.find(p => p.name === 'trading-service');

    if (!tradingService) {
      return res.json({ status: 'stopped', message: 'Trading service not found' });
    }

    res.json({
      status: tradingService.pm2_env.status,
      uptime: tradingService.pm2_env.pm_uptime,
      restarts: tradingService.pm2_env.restart_time
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: 'Failed to get status', details: error.message });
  }
});

// Start trading service
app.post('/start', authenticate, async (req, res) => {
  try {
    // Check if already running
    const { stdout: listOutput } = await execPromise('pm2 jlist');
    const processes = JSON.parse(listOutput);
    const tradingService = processes.find(p => p.name === 'trading-service');

    if (tradingService && tradingService.pm2_env.status === 'online') {
      return res.json({
        message: 'Trading service is already running',
        status: 'running'
      });
    }

    // Start the service
    const { stdout } = await execPromise('cd ~/FC_IOT-Project/trading-service && pm2 start server.js --name trading-service');
    console.log('Start output:', stdout);

    res.json({
      message: 'Trading service started successfully',
      status: 'running'
    });
  } catch (error) {
    console.error('Error starting service:', error);
    res.status(500).json({ error: 'Failed to start service', details: error.message });
  }
});

// Stop trading service
app.post('/stop', authenticate, async (req, res) => {
  try {
    const { stdout } = await execPromise('pm2 stop trading-service');
    console.log('Stop output:', stdout);

    res.json({
      message: 'Trading service stopped successfully',
      status: 'stopped'
    });
  } catch (error) {
    console.error('Error stopping service:', error);
    res.status(500).json({ error: 'Failed to stop service', details: error.message });
  }
});

// Restart trading service
app.post('/restart', authenticate, async (req, res) => {
  try {
    const { stdout } = await execPromise('pm2 restart trading-service');
    console.log('Restart output:', stdout);

    res.json({
      message: 'Trading service restarted successfully',
      status: 'running'
    });
  } catch (error) {
    console.error('Error restarting service:', error);
    res.status(500).json({ error: 'Failed to restart service', details: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 Control API running on port ${PORT}`);
  console.log(`🔐 API Key authentication enabled`);
});
