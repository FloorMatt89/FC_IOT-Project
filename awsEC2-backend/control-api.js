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

    // Extract strategy from process args if available
    const args = tradingService.pm2_env.args || [];
    const modeIndex = args.indexOf('--mode');
    const strategy = modeIndex !== -1 && args[modeIndex + 1]
      ? args[modeIndex + 1]
      : 'news-sentiment';

    res.json({
      status: tradingService.pm2_env.status,
      uptime: tradingService.pm2_env.pm_uptime,
      restarts: tradingService.pm2_env.restart_time,
      strategy: strategy
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: 'Failed to get status', details: error.message });
  }
});

// Start trading service
app.post('/start', authenticate, async (req, res) => {
  try {
    // Get strategy from request body (default to news-sentiment)
    const { strategy = 'news-sentiment' } = req.body;

    // Validate strategy
    const validStrategies = ['news-sentiment', 'historical-data'];
    if (!validStrategies.includes(strategy)) {
      return res.status(400).json({
        error: 'Invalid strategy',
        message: `Strategy must be one of: ${validStrategies.join(', ')}`
      });
    }

    // Check if already running
    const { stdout: listOutput } = await execPromise('pm2 jlist');
    const processes = JSON.parse(listOutput);
    const tradingService = processes.find(p => p.name === 'trading-service');

    if (tradingService && tradingService.pm2_env.status === 'online') {
      // Get current strategy
      const args = tradingService.pm2_env.args || [];
      const modeIndex = args.indexOf('--mode');
      const currentStrategy = modeIndex !== -1 && args[modeIndex + 1]
        ? args[modeIndex + 1]
        : 'news-sentiment';

      // If strategy is different, restart with new strategy
      if (currentStrategy !== strategy) {
        console.log(`Switching strategy from ${currentStrategy} to ${strategy}`);
        await execPromise('pm2 delete trading-service');
      } else {
        return res.json({
          message: 'Trading service is already running with this strategy',
          status: 'running',
          strategy: currentStrategy
        });
      }
    }

    // Start the service with specified strategy
    const command = `cd ~/FC_IOT-Project/trading-service && pm2 start server.js --name trading-service -- --mode ${strategy}`;
    const { stdout } = await execPromise(command);
    console.log('Start output:', stdout);

    res.json({
      message: `Trading service started successfully with ${strategy} strategy`,
      status: 'running',
      strategy: strategy
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
