'use client';

/**
 * =============================================================================
 * ECOTRADE BIN DASHBOARD - MAIN PAGE COMPONENT
 * =============================================================================
 *
 * This is the main dashboard page for the EcoTradeBin application.
 * It displays recycling statistics, IoT device status, and trading portfolio.
 *
 * Features:
 * - Tab-based navigation between Recycling and Trading views
 * - Real-time data fetching from IoT API and DynamoDB
 * - Auto-refresh functionality for live updates
 * - Responsive statistics cards
 * - Recent activity feed
 * - Bin fill level monitoring
 * - Current recycling streak tracking
 *
 * Data Sources:
 * 1. IoT API (/api/iot/devices) - Device status and basic metrics
 * 2. Recycling API (/api/recycling) - DynamoDB classification data
 */

import styles from './page.module.css';
import { FaWifi, FaRecycle } from "react-icons/fa";
import PortfolioDisplay from './components/PortfolioDisplay';
import { useState, useEffect } from 'react';

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

/**
 * Auto-refresh interval for IoT device data (in milliseconds)
 * Default: 10 seconds
 */
const IOT_DATA_REFRESH_INTERVAL_MS = 10000;

/**
 * Auto-refresh interval for recycling data from DynamoDB (in milliseconds)
 * Default: 30 seconds
 */
const RECYCLING_DATA_REFRESH_INTERVAL_MS = 30000;

/**
 * Bin fill level threshold for showing "full" warning
 * If fill level exceeds this percentage, display warning message
 */
const BIN_FULL_THRESHOLD_PERCENT = 80;

/**
 * Default text values for when data is unavailable
 */
const DEFAULT_BIN_ID = "Unknown";
const DEFAULT_STATUS_TEXT = "Not Connected";
const DEFAULT_LOADING_TEXT = "Loading...";
const DEFAULT_KEEP_RECYCLING_TEXT = "Keep recycling!";
const DEFAULT_BIN_FULL_WARNING = "Bins are getting full!";
const DEFAULT_NO_DATA_TEXT = "No classifications yet";
const DEFAULT_WAITING_TEXT = "Waiting for data...";
const DEFAULT_BADGE_EMPTY = "-";

/**
 * Tab identifier constants
 */
const TAB_RECYCLING = 'recycling';
const TAB_TRADING = 'trading';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Represents a single IoT device in the system
 */
interface IoTDevice {
  id: string;
  name: string;
  status: string;
  fillLevel: number;
  itemsThisWeek: number;
  lastUpdate: string | null;
}

/**
 * Summary statistics for all IoT devices
 */
interface IoTSummary {
  totalItemsThisWeek: number;
  averageFillLevel: number;
  currentStreak: number;
  recyclingRate: number;
  connectedDevices: number;
}

/**
 * Complete IoT data structure from the API
 */
interface IoTData {
  devices: IoTDevice[];
  summary: IoTSummary;
}

/**
 * A single recycling item from DynamoDB
 */
interface RecyclingItem {
  id: string;
  name: string;
  type: string;
  time: string;
  class: number;
}

/**
 * Complete recycling data structure from the API
 */
interface RecyclingData {
  items: RecyclingItem[];
  totalItems: number;
  recyclingRate: number;
}

/**
 * Valid tab types for the dashboard
 */
type TabType = 'recycling' | 'trading';

// =============================================================================
// MAIN DASHBOARD COMPONENT
// =============================================================================

/**
 * Main Dashboard Component
 *
 * Manages the state and rendering of the entire dashboard interface.
 * Handles data fetching, tab switching, and conditional rendering.
 *
 * @returns {JSX.Element} The rendered dashboard component
 */
export default function Dashboard() {
  // ===========================================================================
  // STATE MANAGEMENT
  // ===========================================================================

  /**
   * Currently active tab ('recycling' or 'trading')
   */
  const [activeTab, setActiveTab] = useState<TabType>(TAB_RECYCLING);

  /**
   * IoT device data from the API
   * Null until first fetch completes
   */
  const [iotData, setIotData] = useState<IoTData | null>(null);

  /**
   * Recycling classification data from DynamoDB
   * Null until first fetch completes
   */
  const [recyclingData, setRecyclingData] = useState<RecyclingData | null>(null);

  /**
   * Loading state for initial data fetch
   * True until IoT data is loaded for the first time
   */
  const [loading, setLoading] = useState<boolean>(true);

  // ===========================================================================
  // DATA FETCHING - IOT DEVICES
  // ===========================================================================

  /**
   * Effect hook for fetching and auto-refreshing IoT device data
   *
   * Behavior:
   * - Fetches immediately on component mount
   * - Sets up interval to refresh every 10 seconds
   * - Cleans up interval on component unmount
   * - Updates loading state after first fetch
   */
  useEffect(() => {
    console.log('[Dashboard] Setting up IoT data fetching');

    /**
     * Fetches IoT device data from the API endpoint
     */
    const fetchIoTData = async () => {
      console.log('[IoT Fetch] Starting fetch from /api/iot/devices');

      try {
        // Make HTTP request to IoT API endpoint
        const response = await fetch('/api/iot/devices');

        console.log(`[IoT Fetch] Response status: ${response.status}`);

        // Parse JSON response
        const data: IoTData = await response.json();

        console.log('[IoT Fetch] Data received successfully');
        console.log(`[IoT Fetch] Devices found: ${data.devices?.length || 0}`);
        console.log(`[IoT Fetch] Connected devices: ${data.summary?.connectedDevices || 0}`);

        // Update state with fetched data
        setIotData(data);

      } catch (error) {
        console.error('[IoT Fetch] Error fetching IoT data:', error);

        // Log specific error details if available
        if (error instanceof Error) {
          console.error(`[IoT Fetch] Error message: ${error.message}`);
        }

      } finally {
        // Always set loading to false after first attempt
        console.log('[IoT Fetch] Setting loading state to false');
        setLoading(false);
      }
    };

    // Fetch immediately on mount
    console.log('[Dashboard] Performing initial IoT data fetch');
    fetchIoTData();

    // Set up auto-refresh interval
    console.log(`[Dashboard] Setting up IoT refresh interval: ${IOT_DATA_REFRESH_INTERVAL_MS}ms`);
    const interval = setInterval(fetchIoTData, IOT_DATA_REFRESH_INTERVAL_MS);

    // Cleanup function - runs on component unmount
    return () => {
      console.log('[Dashboard] Cleaning up IoT refresh interval');
      clearInterval(interval);
    };
  }, []); // Empty dependency array - run once on mount

  // ===========================================================================
  // DATA FETCHING - RECYCLING DATA
  // ===========================================================================

  /**
   * Effect hook for fetching and auto-refreshing recycling data from DynamoDB
   *
   * Behavior:
   * - Fetches immediately on component mount
   * - Sets up interval to refresh every 30 seconds
   * - Cleans up interval on component unmount
   */
  useEffect(() => {
    console.log('[Dashboard] Setting up recycling data fetching');

    /**
     * Fetches recycling classification data from DynamoDB via API
     */
    const fetchRecyclingData = async () => {
      console.log('[Recycling Fetch] Starting fetch from /api/recycling');

      try {
        // Make HTTP request to recycling API endpoint
        const response = await fetch('/api/recycling');

        console.log(`[Recycling Fetch] Response status: ${response.status}`);

        // Parse JSON response
        const data: RecyclingData = await response.json();

        console.log('[Recycling Fetch] Data received successfully');
        console.log(`[Recycling Fetch] Items found: ${data.items?.length || 0}`);
        console.log(`[Recycling Fetch] Total items: ${data.totalItems || 0}`);
        console.log(`[Recycling Fetch] Recycling rate: ${data.recyclingRate || 0}%`);

        // Update state with fetched data
        setRecyclingData(data);

      } catch (error) {
        console.error('[Recycling Fetch] Error fetching recycling data:', error);

        // Log specific error details if available
        if (error instanceof Error) {
          console.error(`[Recycling Fetch] Error message: ${error.message}`);
        }
      }
    };

    // Fetch immediately on mount
    console.log('[Dashboard] Performing initial recycling data fetch');
    fetchRecyclingData();

    // Set up auto-refresh interval
    console.log(`[Dashboard] Setting up recycling refresh interval: ${RECYCLING_DATA_REFRESH_INTERVAL_MS}ms`);
    const interval = setInterval(fetchRecyclingData, RECYCLING_DATA_REFRESH_INTERVAL_MS);

    // Cleanup function - runs on component unmount
    return () => {
      console.log('[Dashboard] Cleaning up recycling refresh interval');
      clearInterval(interval);
    };
  }, []); // Empty dependency array - run once on mount

  // ===========================================================================
  // COMPUTED VALUES - DATA EXTRACTION
  // ===========================================================================

  /**
   * Extracts bin ID from IoT data with fallback to default
   * Uses the first device's ID if available
   */
  const binId: string = (() => {
    const firstDevice = iotData?.devices[0];
    const deviceId = firstDevice?.id || DEFAULT_BIN_ID;
    console.log(`[Computed] Bin ID: ${deviceId}`);
    return deviceId;
  })();

  /**
   * Formats bin connection status string
   * Shows number of connected devices or "Not Connected"
   */
  const binStatus: string = (() => {
    const connectedCount = iotData?.summary.connectedDevices;

    if (connectedCount && connectedCount > 0) {
      const statusText = `${connectedCount} Connected`;
      console.log(`[Computed] Bin status: ${statusText}`);
      return statusText;
    }

    console.log(`[Computed] Bin status: ${DEFAULT_STATUS_TEXT}`);
    return DEFAULT_STATUS_TEXT;
  })();

  /**
   * Extracts current recycling streak in days
   * Falls back to 0 if no data available
   */
  const currentStreak: number = (() => {
    const streak = iotData?.summary.currentStreak || 0;
    console.log(`[Computed] Current streak: ${streak} days`);
    return streak;
  })();

  /**
   * Determines total items count for the week
   * Prefers DynamoDB data over IoT data
   * Falls back to 0 if neither available
   */
  const itemsThisWeek: number = (() => {
    // Try DynamoDB data first (more accurate)
    const dynamoCount = recyclingData?.totalItems;
    if (dynamoCount !== undefined && dynamoCount !== null) {
      console.log(`[Computed] Items this week (from DynamoDB): ${dynamoCount}`);
      return dynamoCount;
    }

    // Fall back to IoT data
    const iotCount = iotData?.summary.totalItemsThisWeek;
    if (iotCount !== undefined && iotCount !== null) {
      console.log(`[Computed] Items this week (from IoT): ${iotCount}`);
      return iotCount;
    }

    // Default to 0
    console.log('[Computed] Items this week: 0 (no data)');
    return 0;
  })();

  /**
   * Calculates recycling rate percentage
   * Prefers DynamoDB calculation over IoT data
   * Falls back to 0 if neither available
   */
  const recyclingRate: number = (() => {
    // Try DynamoDB data first (more accurate)
    const dynamoRate = recyclingData?.recyclingRate;
    if (dynamoRate !== undefined && dynamoRate !== null) {
      console.log(`[Computed] Recycling rate (from DynamoDB): ${dynamoRate}%`);
      return dynamoRate;
    }

    // Fall back to IoT data
    const iotRate = iotData?.summary.recyclingRate;
    if (iotRate !== undefined && iotRate !== null) {
      const roundedRate = Math.round(iotRate);
      console.log(`[Computed] Recycling rate (from IoT): ${roundedRate}%`);
      return roundedRate;
    }

    // Default to 0
    console.log('[Computed] Recycling rate: 0% (no data)');
    return 0;
  })();

  /**
   * Calculates average bin fill level as percentage
   * Falls back to 0 if no data available
   */
  const binFillLevel: number = (() => {
    const fillLevel = iotData?.summary.averageFillLevel;

    if (fillLevel !== undefined && fillLevel !== null) {
      const roundedLevel = Math.round(fillLevel);
      console.log(`[Computed] Bin fill level: ${roundedLevel}%`);
      return roundedLevel;
    }

    console.log('[Computed] Bin fill level: 0% (no data)');
    return 0;
  })();

  /**
   * Generates appropriate reminder text based on fill level
   * Shows warning if bins are getting full, otherwise encouragement
   */
  const reminderText: string = (() => {
    // Show loading state
    if (loading) {
      console.log(`[Computed] Reminder text: ${DEFAULT_LOADING_TEXT}`);
      return DEFAULT_LOADING_TEXT;
    }

    // Check if bins are getting full
    if (binFillLevel > BIN_FULL_THRESHOLD_PERCENT) {
      console.log(`[Computed] Reminder text: ${DEFAULT_BIN_FULL_WARNING} (fill level: ${binFillLevel}%)`);
      return DEFAULT_BIN_FULL_WARNING;
    }

    // Default encouragement message
    console.log(`[Computed] Reminder text: ${DEFAULT_KEEP_RECYCLING_TEXT}`);
    return DEFAULT_KEEP_RECYCLING_TEXT;
  })();

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  /**
   * Handles tab click to switch between recycling and trading views
   * @param {TabType} tabName - The tab to switch to
   */
  const handleTabClick = (tabName: TabType): void => {
    console.log(`[Tab Switch] Switching to tab: ${tabName}`);
    setActiveTab(tabName);
  };

  // ===========================================================================
  // RENDER HELPER FUNCTIONS
  // ===========================================================================

  /**
   * Renders the dashboard header section
   * @returns {JSX.Element} Header component
   */
  const renderHeader = (): JSX.Element => {
    return (
      <header className={styles.header}>
        <h1 className={styles.title}> EcoTradeBin Dashboard</h1>
        <p className={styles.subtitle}>Track your recycling progress and trading portfolio</p>
      </header>
    );
  };

  /**
   * Renders the tab navigation buttons
   * @returns {JSX.Element} Tab navigation component
   */
  const renderTabNavigation = (): JSX.Element => {
    const isRecyclingActive = activeTab === TAB_RECYCLING;
    const isTradingActive = activeTab === TAB_TRADING;

    return (
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tab} ${isRecyclingActive ? styles.activeTab : ''}`}
          onClick={() => handleTabClick(TAB_RECYCLING)}
          aria-selected={isRecyclingActive}
          role="tab"
        >
          Recycling
        </button>
        <button
          className={`${styles.tab} ${isTradingActive ? styles.activeTab : ''}`}
          onClick={() => handleTabClick(TAB_TRADING)}
          aria-selected={isTradingActive}
          role="tab"
        >
          Trading Portfolio
        </button>
      </div>
    );
  };

  /**
   * Renders the bin connection status card
   * Shows WiFi icon, bin ID, and connection status
   * @returns {JSX.Element} Status card component
   */
  const renderBinStatusCard = (): JSX.Element => {
    return (
      <div className={styles.statusCard}>
        <div className={styles.statusIcon}>
          <FaWifi aria-label="WiFi connection status" />
        </div>
        <div className={styles.statusText}>
          <div className={styles.statusTitle}>Bin Connected</div>
          <div className={styles.statusSubtitle}>
            Bin #{binId} • {binStatus}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Renders a single statistic item within the streak card
   * @param {string} label - The stat label
   * @param {string | number} value - The stat value
   * @returns {JSX.Element} Stat item component
   */
  const renderStatItem = (label: string, value: string | number): JSX.Element => {
    return (
      <div className={styles.statItem}>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statValue}>{value}</div>
      </div>
    );
  };

  /**
   * Renders the current streak card with recycling statistics
   * @returns {JSX.Element} Streak card component
   */
  const renderStreakCard = (): JSX.Element => {
    return (
      <div className={styles.streakCard}>
        <div className={styles.streakHeader}>
          <span className={styles.streakLabel}>Current Streak</span>
          <div className={styles.recycleIcon}>
            <FaRecycle size={32} aria-label="Recycle icon" />
          </div>
        </div>
        <div className={styles.streakValue}>{currentStreak} Days</div>
        <div className={styles.streakEncouragement}>Keep it up!</div>
        <div className={styles.streakStats}>
          {renderStatItem('This Week', `${itemsThisWeek} items`)}
          <div className={styles.statDivider}></div>
          {renderStatItem('Recycling Rate', `${recyclingRate}%`)}
        </div>
      </div>
    );
  };

  /**
   * Renders the bin fill level card with progress bar
   * @returns {JSX.Element} Fill level card component
   */
  const renderFillLevelCard = (): JSX.Element => {
    return (
      <div className={styles.fillCard}>
        <div className={styles.fillHeader}>
          <span className={styles.fillTitle}>Bin Fill Level</span>
          <span className={styles.fillPercentage}>{binFillLevel}%</span>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${binFillLevel}%` }}
            role="progressbar"
            aria-valuenow={binFillLevel}
            aria-valuemin={0}
            aria-valuemax={100}
          ></div>
        </div>
        <div className={styles.fillReminder}>{reminderText}</div>
      </div>
    );
  };

  /**
   * Renders a single activity item from recycling data
   * @param {RecyclingItem} item - The recycling item to render
   * @returns {JSX.Element} Activity item component
   */
  const renderActivityItem = (item: RecyclingItem): JSX.Element => {
    return (
      <div key={item.id} className={styles.activityItem}>
        <div className={styles.activityIcon}>
          <FaRecycle size={20} aria-label="Activity icon" />
        </div>
        <div className={styles.activityContent}>
          <div className={styles.activityName}>{item.name}</div>
          <div className={styles.activityTime}>{item.time}</div>
        </div>
        <div className={styles.activityBadge}>{item.type}</div>
      </div>
    );
  };

  /**
   * Renders the empty state when no recycling data is available
   * @returns {JSX.Element} Empty activity item component
   */
  const renderEmptyActivityItem = (): JSX.Element => {
    return (
      <div className={styles.activityItem}>
        <div className={styles.activityIcon}>
          <FaRecycle size={20} aria-label="Activity icon" />
        </div>
        <div className={styles.activityContent}>
          <div className={styles.activityName}>{DEFAULT_NO_DATA_TEXT}</div>
          <div className={styles.activityTime}>{DEFAULT_WAITING_TEXT}</div>
        </div>
        <div className={styles.activityBadge}>{DEFAULT_BADGE_EMPTY}</div>
      </div>
    );
  };

  /**
   * Determines if we have valid recycling items to display
   * @returns {boolean} True if items exist and array is not empty
   */
  const hasRecyclingItems = (): boolean => {
    const items = recyclingData?.items;
    const hasItems = items && items.length > 0;
    console.log(`[Render Check] Has recycling items: ${hasItems}`);
    return !!hasItems;
  };

  /**
   * Renders the recent activity section with classification data
   * @returns {JSX.Element} Activity section component
   */
  const renderRecentActivity = (): JSX.Element => {
    return (
      <div className={styles.activitySection}>
        <h2 className={styles.activityTitle}>Recent Activity</h2>
        <div className={styles.activityList}>
          {hasRecyclingItems()
            ? recyclingData!.items.map((item) => renderActivityItem(item))
            : renderEmptyActivityItem()
          }
        </div>
      </div>
    );
  };

  /**
   * Renders all content for the recycling tab
   * @returns {JSX.Element} Recycling tab content
   */
  const renderRecyclingTabContent = (): JSX.Element => {
    console.log('[Render] Rendering recycling tab content');

    return (
      <>
        {renderBinStatusCard()}
        {renderStreakCard()}
        {renderFillLevelCard()}
        {renderRecentActivity()}
      </>
    );
  };

  /**
   * Renders the trading portfolio tab content
   * @returns {JSX.Element} Trading tab content
   */
  const renderTradingTabContent = (): JSX.Element => {
    console.log('[Render] Rendering trading tab content');
    return <PortfolioDisplay />;
  };

  /**
   * Conditionally renders content based on active tab
   * @returns {JSX.Element} Active tab content
   */
  const renderActiveTabContent = (): JSX.Element => {
    const isRecyclingTab = activeTab === TAB_RECYCLING;

    if (isRecyclingTab) {
      return renderRecyclingTabContent();
    } else {
      return renderTradingTabContent();
    }
  };

  // ===========================================================================
  // MAIN RENDER
  // ===========================================================================

  console.log('[Render] Dashboard component rendering');
  console.log(`[Render] Active tab: ${activeTab}`);
  console.log(`[Render] Loading: ${loading}`);
  console.log(`[Render] IoT data available: ${!!iotData}`);
  console.log(`[Render] Recycling data available: ${!!recyclingData}`);

  return (
    <main className={styles.container}>
      <div className={styles.dashboard}>
        {renderHeader()}
        {renderTabNavigation()}
        {renderActiveTabContent()}
      </div>
    </main>
  );
}
