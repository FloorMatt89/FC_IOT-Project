'use client';

import { useEffect, useState } from 'react';

export default function TradingBotStarter() {
  const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'stopped' | 'error'>('idle');

  useEffect(() => {
    const startTradingBot = async () => {
      try {
        setStatus('starting');
        const response = await fetch('/api/trading/start', {
          method: 'POST',
        });
        const data = await response.json();

        if (response.ok) {
          setStatus('running');
          console.log('Trading bot:', data.message);
        } else {
          setStatus('error');
          console.error('Failed to start trading bot:', data.error);
        }
      } catch (error) {
        setStatus('error');
        console.error('Error starting trading bot:', error);
      }
    };

    startTradingBot();
  }, []);

  const handleToggle = async () => {
    if (status === 'running') {
      // Stop the bot
      try {
        setStatus('idle');
        const response = await fetch('/api/trading/stop', {
          method: 'POST',
        });
        const data = await response.json();

        if (response.ok) {
          setStatus('stopped');
          console.log('Trading bot stopped:', data.message);
        } else {
          setStatus('error');
          console.error('Failed to stop trading bot:', data.error);
        }
      } catch (error) {
        setStatus('error');
        console.error('Error stopping trading bot:', error);
      }
    } else if (status === 'stopped' || status === 'error') {
      // Restart the bot
      try {
        setStatus('starting');
        const response = await fetch('/api/trading/start', {
          method: 'POST',
        });
        const data = await response.json();

        if (response.ok) {
          setStatus('running');
          console.log('Trading bot restarted:', data.message);
        } else {
          setStatus('error');
          console.error('Failed to restart trading bot:', data.error);
        }
      } catch (error) {
        setStatus('error');
        console.error('Error restarting trading bot:', error);
      }
    }
  };

  const getBackgroundColor = () => {
    switch (status) {
      case 'running':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'stopped':
        return '#6b7280';
      case 'starting':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'running':
        return 'Active (Click to Stop)';
      case 'error':
        return 'Error (Click to Restart)';
      case 'stopped':
        return 'Stopped (Click to Start)';
      case 'starting':
        return 'Starting...';
      default:
        return 'Idle';
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={status === 'starting'}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '10px 15px',
        borderRadius: '8px',
        backgroundColor: getBackgroundColor(),
        color: 'white',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        border: 'none',
        cursor: status === 'starting' ? 'not-allowed' : 'pointer',
        opacity: status === 'starting' ? 0.7 : 1,
        transition: 'all 0.2s'
      }}
    >
      Trading Bot: {getStatusText()}
    </button>
  );
}
