'use client';

import { useEffect, useState } from 'react';

const MIN_FILL_LEVEL_REQUIRED = 50; // Minimum bin fill level (50%) to enable trading

export default function TradingBotStarter() {
  const [status, setStatus] = useState<'idle' | 'starting' | 'online' | 'stopped' | 'error' | 'checking'>('checking');
  const [binFillLevel, setBinFillLevel] = useState<number>(0);
  const [loadingFillLevel, setLoadingFillLevel] = useState<boolean>(true);

  // Check status on mount
  useEffect(() => {
    checkStatus();
    fetchBinFillLevel();

    // Check status every 30 seconds
    const statusInterval = setInterval(checkStatus, 30000);
    // Check fill level every 30 seconds
    const fillLevelInterval = setInterval(fetchBinFillLevel, 30000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(fillLevelInterval);
    };
  }, []);

  const fetchBinFillLevel = async () => {
    try {
      const response = await fetch('/api/recycling');
      const data = await response.json();

      if (response.ok && data.binFillLevel !== undefined) {
        setBinFillLevel(data.binFillLevel);
      } else {
        setBinFillLevel(0);
      }
    } catch (error) {
      console.warn('Error fetching bin fill level:', error);
      setBinFillLevel(0);
    } finally {
      setLoadingFillLevel(false);
    }
  };

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
    // Check if fill level meets minimum requirement (frontend check)
    if (binFillLevel < MIN_FILL_LEVEL_REQUIRED) {
      alert(`Cannot start trading bot.\n\nBin fill level must be at least ${MIN_FILL_LEVEL_REQUIRED}%.\nCurrent fill level: ${binFillLevel}%\n\nPlease recycle more items to reach ${MIN_FILL_LEVEL_REQUIRED}% capacity.`);
      return;
    }

    try {
      setStatus('starting');

      const response = await fetch('/api/trading/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();

      // Handle backend validation failure (403 = locked due to fill level)
      if (response.status === 403 && data.status === 'locked') {
        setStatus('stopped');
        // Update local fill level state from backend response
        if (data.binFillLevel !== undefined) {
          setBinFillLevel(data.binFillLevel);
        }
        alert(`Trading bot is locked.\n\n${data.message}\n\nPlease recycle more items to unlock trading.`);
        return;
      }

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

  const isFillLevelSufficient = binFillLevel >= MIN_FILL_LEVEL_REQUIRED;
  const isDisabled = status === 'starting' || status === 'checking' || (status === 'stopped' && !isFillLevelSufficient);

  const getBackgroundColor = () => {
    // If stopped and fill level is insufficient, show warning color
    if (status === 'stopped' && !isFillLevelSufficient && !loadingFillLevel) {
      return '#f59e0b'; // Orange/amber for insufficient fill level
    }

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
    // If stopped and fill level is insufficient, show custom message
    if (status === 'stopped' && !isFillLevelSufficient && !loadingFillLevel) {
      return `Locked (Fill Level: ${binFillLevel}%)`;
    }

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

  const getTooltipText = () => {
    if (status === 'stopped' && !isFillLevelSufficient && !loadingFillLevel) {
      return `Bin must be at least ${MIN_FILL_LEVEL_REQUIRED}% full to enable trading. Current: ${binFillLevel}%`;
    }
    return '';
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
      {/* Tooltip message when locked */}
      {status === 'stopped' && !isFillLevelSufficient && !loadingFillLevel && (
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            right: '0',
            backgroundColor: '#1F2937',
            border: '2px solid #f59e0b',
            borderRadius: '8px',
            padding: '12px 16px',
            minWidth: '250px',
            maxWidth: '300px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
            color: 'white',
            fontSize: '13px',
            lineHeight: '1.5',
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: '6px', color: '#fbbf24' }}>
            🔒 Trading Locked
          </div>
          <div style={{ color: '#d1d5db' }}>
            Bin must be at least <strong>{MIN_FILL_LEVEL_REQUIRED}%</strong> full to enable trading.
          </div>
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #374151' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Current Fill Level:</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#fbbf24' }}>
              {binFillLevel}%
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>
            Keep recycling to unlock trading! 🌱
          </div>
        </div>
      )}

      <button
        onClick={handleToggle}
        disabled={isDisabled}
        title={getTooltipText()}
        style={{
          padding: '10px 15px',
          borderRadius: '8px',
          backgroundColor: getBackgroundColor(),
          color: 'white',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          border: status === 'stopped' && !isFillLevelSufficient && !loadingFillLevel ? '2px solid #fbbf24' : 'none',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled && status !== 'stopped' ? 0.7 : 1,
          transition: 'all 0.2s',
        }}
      >
        Trading Bot: {getStatusText()}
      </button>
    </div>
  );
}
