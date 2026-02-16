"use client"

import { useState } from "react"
import InterviewFlow from "./InterviewFlow"
import styles from "./InterviewSetup.module.css"

const ROLES = ["Software Developer", "Frontend Developer", "Backend Developer", "Data Analyst", "Full Stack Developer", "DevOps Engineer"]
const MODES = ["Technical", "HR"]
const DIFFICULTIES = ["Easy", "Medium", "Hard"]

export default function InterviewSetup({ onBack }) {
  const [role, setRole] = useState("")
  const [mode, setMode] = useState("")
  const [difficulty, setDifficulty] = useState("")
  const [startInterview, setStartInterview] = useState(false)
  const [fullscreenError, setFullscreenError] = useState("")

  const handleStart = async () => {
    if (role && mode && difficulty) {
      try {
        // Request fullscreen
        const elem = document.documentElement
        if (elem.requestFullscreen) {
          await elem.requestFullscreen()
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen()
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen()
        }
        setStartInterview(true)
      } catch (error) {
        setFullscreenError("Please allow fullscreen mode to start the interview")
      }
    }
  }

  if (startInterview) {
    return <InterviewFlow role={role} mode={mode} difficulty={difficulty} onBack={onBack} />
  }

  return (
    <div className={styles.container}>

      <div className={styles.card}>
        <button onClick={onBack} className={styles.backBtn}> <i className="fa-solid fa-arrow-left"></i> </button>

        <h2>Configure Your Interview</h2>

        <div className={styles.section}>
          <label className={styles.sectionLabel}>Select Role</label>
          <div className={styles.options}>
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`${styles.option} ${role === r ? styles.selected : ""}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.sectionLabel}>Select Mode</label>
          <div className={styles.options}>
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`${styles.option} ${mode === m ? styles.selected : ""}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.sectionLabel}>Select Difficulty</label>
          <div className={styles.options}>
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`${styles.option} ${difficulty === d ? styles.selected : ""}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {fullscreenError && (
          <div className={styles.errorMessage}>
            {fullscreenError}
          </div>
        )}

        <button onClick={handleStart} disabled={!role || !mode || !difficulty} className={styles.startBtn}>
          Start Interview
        </button>
      </div>
    </div>
  )
}
