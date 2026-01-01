"use client"

import { TrendingUp, Award, Clock } from "lucide-react"
import styles from "./Dashboard.module.css"

export default function Dashboard() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Dashboard</h2>
          <p>Track your interview performance and progress</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.iconContainer}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>Recent Score</h3>
            <p className={styles.statValue}>75%</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.iconContainer}>
            <Award size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>Interviews Taken</h3>
            <p className={styles.statValue}>12</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.iconContainer}>
            <Clock size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>Avg. Response Time</h3>
            <p className={styles.statValue}>45s</p>
          </div>
        </div>
      </div>

      <div className={styles.progressCard}>
        <h3>Overall Progress</h3>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: "68%" }}></div>
        </div>
        <p className={styles.progressText}>68% Complete - Keep practicing to improve!</p>
      </div>
    </div>
  )
}
