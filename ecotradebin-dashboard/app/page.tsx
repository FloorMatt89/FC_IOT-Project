'use client';

import styles from './page.module.css';
import { FaWifi, FaRecycle } from "react-icons/fa";
import PortfolioDisplay from './components/PortfolioDisplay';
import { useState, useEffect } from 'react';

interface IoTData {
  devices: Array<{
    id: string;
    name: string;
    status: string;
    fillLevel: number;
    itemsThisWeek: number;
    lastUpdate: string | null;
  }>;
  summary: {
    totalItemsThisWeek: number;
    averageFillLevel: number;
    currentStreak: number;
    recyclingRate: number;
    connectedDevices: number;
  };
}

interface RecyclingData {
  items: Array<{
    id: string;
    name: string;
    type: string;
    time: string;
    class: number;
  }>;
  totalItems: number;
  recyclingRate: number;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'recycling' | 'trading'>('recycling');
  const [iotData, setIotData] = useState<IoTData | null>(null);
  const [recyclingData, setRecyclingData] = useState<RecyclingData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch IoT device data
  useEffect(() => {
    const fetchIoTData = async () => {
      try {
        const response = await fetch('/api/iot/devices');
        const data = await response.json();
        setIotData(data);
      } catch (error) {
        console.error('Error fetching IoT data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIoTData();
    // Refresh every 10 seconds
    const interval = setInterval(fetchIoTData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch DynamoDB recycling data
  useEffect(() => {
    const fetchRecyclingData = async () => {
      try {
        const response = await fetch('/api/recycling');
        const data = await response.json();
        setRecyclingData(data);
      } catch (error) {
        console.error('Error fetching recycling data:', error);
      }
    };

    fetchRecyclingData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRecyclingData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Use IoT data or fallback to defaults
  const binId = iotData?.devices[0]?.id || "Unknown";
  const binStatus = iotData?.summary.connectedDevices
    ? `${iotData.summary.connectedDevices} Connected`
    : "Not Connected";
  const currentStreak = iotData?.summary.currentStreak || 1;
  const itemsThisWeek = recyclingData?.totalItems || iotData?.summary.totalItemsThisWeek || 0;
  const recyclingRate = recyclingData?.recyclingRate || Math.round(iotData?.summary.recyclingRate || 0);
  const binFillLevel = Math.round(iotData?.summary.averageFillLevel || 0);
  const reminderText = loading
    ? "Loading..."
    : binFillLevel > 80
      ? "Bins are getting full!"
      : "Keep recycling!";

  return (
    <main className={styles.container}>
      <div className={styles.dashboard}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.title}> EcoTradeBin Dashboard</h1>
          <p className={styles.subtitle}>Track your recycling progress and trading portfolio</p>
        </header>

        {/* Tab Navigation */}
        <div className={styles.tabContainer}>
          <button
            className={`${styles.tab} ${activeTab === 'recycling' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('recycling')}
          >
            Recycling
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'trading' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('trading')}
          >
            Trading Portfolio
          </button>
        </div>

        {/* Conditional Content Based on Active Tab */}
        {activeTab === 'recycling' ? (
          <>
            {/* Bin Connected Status */}
            <div className={styles.statusCard}>
              <div className={styles.statusIcon}>
                <FaWifi />
              </div>
              <div className={styles.statusText}>
                <div className={styles.statusTitle}>Bin Connected</div>
                <div className={styles.statusSubtitle}>Bin #{binId} • {binStatus}</div>
              </div>
            </div>

        {/* Current Streak Card */}
        <div className={styles.streakCard}>
          <div className={styles.streakHeader}>
            <span className={styles.streakLabel}>Current Streak</span>
            <div className={styles.recycleIcon}>
              <FaRecycle size={32} />
            </div>
          </div>
          <div className={styles.streakValue}>{currentStreak} Days</div>
          <div className={styles.streakEncouragement}>Keep it up!</div>
          <div className={styles.streakStats}>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>This Week</div>
              <div className={styles.statValue}>{itemsThisWeek} items</div>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>Recycling Rate</div>
              <div className={styles.statValue}>{recyclingRate}%</div>
            </div>
          </div>
        </div>

        {/* Bin Fill Level */}
        <div className={styles.fillCard}>
          <div className={styles.fillHeader}>
            <span className={styles.fillTitle}>Bin Fill Level</span>
            <span className={styles.fillPercentage}>{binFillLevel}%</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${binFillLevel}%` }}></div>
          </div>
          <div className={styles.fillReminder}>{reminderText}</div>
        </div>

            {/* Recent Activity - DynamoDB Data */}
            <div className={styles.activitySection}>
              <h2 className={styles.activityTitle}>Recent Activity</h2>

              <div className={styles.activityList}>
                {recyclingData && recyclingData.items.length > 0 ? (
                  recyclingData.items.map((item) => (
                    <div key={item.id} className={styles.activityItem}>
                      <div className={styles.activityIcon}>
                        <FaRecycle size={20} />
                      </div>
                      <div className={styles.activityContent}>
                        <div className={styles.activityName}>{item.name}</div>
                        <div className={styles.activityTime}>{item.time}</div>
                      </div>
                      <div className={styles.activityBadge}>{item.type}</div>
                    </div>
                  ))
                ) : (
                  <div className={styles.activityItem}>
                    <div className={styles.activityIcon}>
                      <FaRecycle size={20} />
                    </div>
                    <div className={styles.activityContent}>
                      <div className={styles.activityName}>No classifications yet</div>
                      <div className={styles.activityTime}>Waiting for data...</div>
                    </div>
                    <div className={styles.activityBadge}>-</div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <PortfolioDisplay />
        )}
      </div>
    </main>
  );
}
