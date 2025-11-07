'use client';

import styles from './page.module.css';
import { FaWifi, FaRecycle } from "react-icons/fa";

export default function Dashboard() {
  // Placeholder values 
  // Replace with real data later
  const binId = "123456";
  const binStatus = "Not Connected";
  const currentStreak = 0;
  const itemsThisWeek = 0;
  const recyclingRate = 0;
  const binFillLevel = 20;
  const reminderText = "No input";

  return (
    <main className={styles.container}>
      <div className={styles.dashboard}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.title}> EcoTradeBin Dashboard</h1>
          <p className={styles.subtitle}>Track your recycling progress</p>
        </header>

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

        {/* Recent Activity */}
        <div className={styles.activitySection}>
          <h2 className={styles.activityTitle}>Recent Activity</h2>
          
          <div className={styles.activityList}>
            <div className={styles.activityItem}>
              <div className={styles.activityIcon}>
                <FaRecycle size={20} />
              </div>
              <div className={styles.activityContent}>
                <div className={styles.activityName}>No input</div>
                <div className={styles.activityTime}>No input</div>
              </div>
              <div className={styles.activityBadge}>No input</div>
            </div>

            <div className={styles.activityItem}>
              <div className={styles.activityIcon}>
                <FaRecycle size={20} />
              </div>
              <div className={styles.activityContent}>
                <div className={styles.activityName}>No input</div>
                <div className={styles.activityTime}>No input</div>
              </div>
              <div className={styles.activityBadge}>No input</div>
            </div>

            <div className={styles.activityItem}>
              <div className={styles.activityIcon}>
                <FaRecycle size={20} />
              </div>
              <div className={styles.activityContent}>
                <div className={styles.activityName}>No input</div>
                <div className={styles.activityTime}>No input</div>
              </div>
              <div className={styles.activityBadge}>No input</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}