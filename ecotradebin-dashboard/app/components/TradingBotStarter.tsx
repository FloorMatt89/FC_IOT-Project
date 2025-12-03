'use client';

import { useEffect, useState } from 'react';

export default function TradingBotStarter() {
  const [status, setStatus] = useState<'idle' | 'starting' | 'online' | 'stopped' | 'error' | 'checking'>('checking');

  // Check status on mount
  useEffect(() => {
    checkStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/trading/start', {
        method: 'GET',
      });
      const data = await response.json();

      if (response.ok && data.status) {
        // Map pm2 status to our status
        if (data.status === 'online') {
          setStatus('online');
        } else if (data.status === 'stopped') {
          setStatus('stopped');
        } else if (data.status === 'unavailable') {
          // Service is not available, but don't crash - show as stopped
          setStatus('stopped');
        } else {
          setStatus('stopped');
        }
      } else {
        setStatus('stopped');
      }
    } catch (error) {
      console.warn('Error checking status:', error);
      // Don't set error status for connection issues - just show as stopped
      setStatus('stopped');
    }
  };

  const handleStart = async () => {
    try {
      setStatus('starting');

      const response = await fetch('/api/trading/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();

      if (response.ok && data.status !== 'unavailable') {
        setStatus('online');
        console.log('Trading bot started:', data.message);
      } else {
        setStatus('stopped');
        if (data.error) {
          console.warn('Service unavailable:', data.error);
        } else {
          console.error('Failed to start trading bot:', data.error);
        }
      }
    } catch (error) {
      setStatus('stopped');
      console.warn('Error starting trading bot:', error);
    }
  };

  const handleStop = async () => {
    try {
      setStatus('starting'); // Use 'starting' as temporary state
      const response = await fetch('/api/trading/stop', {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok) {
        setStatus('stopped');
        console.log('Trading bot stopped:', data.message);
      } else {
        setStatus('stopped');
        console.warn('Could not stop trading bot:', data.error);
      }
    } catch (error) {
      setStatus('stopped');
      console.warn('Error stopping trading bot:', error);
    }
  };

  const handleToggle = () => {
    if (status === 'online') {
      handleStop();
    } else if (status === 'stopped' || status === 'error') {
      handleStart();
    }
  };

  const getBackgroundColor = () => {
    switch (status) {
      case 'online':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'stopped':
        return '#6b7280';
      case 'starting':
        return '#f59e0b';
      case 'checking':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'Active';
      case 'error':
        return 'Error (Click to Restart)';
      case 'stopped':
        return 'Stopped (Click to Start)';
      case 'starting':
        return 'Starting...';
      case 'checking':
        return 'Checking...';
      default:
        return 'Idle';
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
      <button
        onClick={handleToggle}
        disabled={status === 'starting' || status === 'checking'}
        style={{
          padding: '10px 15px',
          borderRadius: '8px',
          backgroundColor: getBackgroundColor(),
          color: 'white',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          border: 'none',
          cursor: status === 'starting' || status === 'checking' ? 'not-allowed' : 'pointer',
          opacity: status === 'starting' || status === 'checking' ? 0.7 : 1,
          transition: 'all 0.2s',
        }}
      >
        Trading Bot: {getStatusText()}
      </button>
    </div>
  );
}
