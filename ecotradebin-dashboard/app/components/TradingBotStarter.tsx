'use client';

import { useEffect, useState } from 'react';

type TradingStrategy = 'news-sentiment' | 'historical-data';

export default function TradingBotStarter() {
  const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'stopped' | 'error'>('idle');
  const [strategy, setStrategy] = useState<TradingStrategy>('news-sentiment');
  const [currentStrategy, setCurrentStrategy] = useState<TradingStrategy>('news-sentiment');
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    // Fetch current status instead of auto-starting
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/trading/start');
        const data = await response.json();

        if (response.ok && data.status === 'online') {
          setStatus('running');
          setStrategy(data.strategy || 'news-sentiment');
          setCurrentStrategy(data.strategy || 'news-sentiment');
        } else {
          setStatus('stopped');
        }
      } catch (error) {
        setStatus('stopped');
        console.error('Error fetching status:', error);
      }
    };

    fetchStatus();
  }, []);

  const handleStart = async (selectedStrategy: TradingStrategy) => {
    try {
      setStatus('starting');
      setShowMenu(false);
      const response = await fetch('/api/trading/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: selectedStrategy }),
      });
      const data = await response.json();

      if (response.ok) {
        setStatus('running');
        setCurrentStrategy(selectedStrategy);
        console.log('Trading bot started:', data.message);
      } else {
        setStatus('error');
        console.error('Failed to start trading bot:', data.error);
      }
    } catch (error) {
      setStatus('error');
      console.error('Error starting trading bot:', error);
    }
  };

  const handleStop = async () => {
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
  };

  const handleToggle = () => {
    if (status === 'running') {
      handleStop();
    } else {
      setShowMenu(!showMenu);
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

  const getStrategyLabel = (strat: TradingStrategy) => {
    switch (strat) {
      case 'news-sentiment':
        return '📰 News Sentiment AI';
      case 'historical-data':
        return '📊 Historical Data';
      default:
        return strat;
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
      {/* Strategy Selection Menu */}
      {showMenu && status !== 'running' && (
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            right: '0',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            padding: '8px',
            minWidth: '220px',
            border: '1px solid #e5e7eb'
          }}
        >
          <div style={{ padding: '8px', fontSize: '12px', fontWeight: '600', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
            Select Trading Strategy
          </div>
          <button
            onClick={() => handleStart('news-sentiment')}
            style={{
              width: '100%',
              padding: '10px 12px',
              textAlign: 'left',
              backgroundColor: strategy === 'news-sentiment' ? '#eff6ff' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#1f2937',
              marginTop: '4px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              if (strategy !== 'news-sentiment') {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }
            }}
            onMouseLeave={(e) => {
              if (strategy !== 'news-sentiment') {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <div style={{ fontWeight: '500' }}>{getStrategyLabel('news-sentiment')}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              AI-driven sentiment analysis
            </div>
          </button>
          <button
            onClick={() => handleStart('historical-data')}
            style={{
              width: '100%',
              padding: '10px 12px',
              textAlign: 'left',
              backgroundColor: strategy === 'historical-data' ? '#eff6ff' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#1f2937',
              marginTop: '4px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              if (strategy !== 'historical-data') {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }
            }}
            onMouseLeave={(e) => {
              if (strategy !== 'historical-data') {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <div style={{ fontWeight: '500' }}>{getStrategyLabel('historical-data')}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              Technical indicators (SMA, RSI)
            </div>
          </button>
        </div>
      )}

      {/* Main Control Button */}
      <button
        onClick={handleToggle}
        disabled={status === 'starting'}
        style={{
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: getBackgroundColor(),
          color: 'white',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          border: 'none',
          cursor: status === 'starting' ? 'not-allowed' : 'pointer',
          opacity: status === 'starting' ? 0.7 : 1,
          transition: 'all 0.2s',
          minWidth: '200px'
        }}
      >
        <div>Trading Bot: {getStatusText()}</div>
        {status === 'running' && (
          <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>
            {getStrategyLabel(currentStrategy)}
          </div>
        )}
      </button>
    </div>
  );
}
