import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import InterviewFlow from "../components/InterviewFlow";
import styles from "./GuestInterviewAccess.module.css";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:3000";

export default function GuestInterviewAccess() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [scheduleDetails, setScheduleDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [schedule, setSchedule] = useState(null);

  useEffect(() => {
    const fetchScheduleDetails = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/guest-access/${token}`);
        setScheduleDetails(response.data.schedule);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load interview details");
      } finally {
        setLoadingDetails(false);
      }
    };

    if (token) {
      fetchScheduleDetails();
    }
  }, [token]);

  const handleStart = async (event) => {
    event.preventDefault();
    setError("");

    if (!scheduleDetails) {
      setError("Interview details not loaded.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE}/api/guest-access/${token}`,
        {
          name: scheduleDetails.candidateName,
          email: scheduleDetails.candidateEmail,
        },
        { withCredentials: true }
      );

      const scheduleData = response.data?.schedule;
      if (!scheduleData) {
        throw new Error("Interview configuration not found.");
      }

      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      }

      setSchedule(scheduleData);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Could not start interview");
    } finally {
      setLoading(false);
    }
  };

  if (schedule) {
    return (
      <InterviewFlow
        role={schedule.role}
        mode={schedule.mode}
        difficulty={schedule.difficulty}
        resumeContext=""
        onBack={() => navigate("/")}
        isGuestMode={true}
      />
    );
  }

  if (loadingDetails) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.loader}>
            <div className={styles.spinner}></div>
            <p>Loading interview details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !scheduleDetails) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.errorBox}>
            <svg className={styles.errorIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2>Unable to Load Interview</h2>
            <p>{error}</p>
            <button onClick={() => navigate("/")} className={styles.backButton}>
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const scheduledTime = scheduleDetails?.scheduledAt 
    ? new Date(scheduleDetails.scheduledAt).toLocaleString("en-US", {
        dateStyle: "full",
        timeStyle: "short",
      })
    : "";

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className={styles.title}>Your Scheduled Interview</h2>
          <p className={styles.subtitle}>
            Please verify your details below and start your interview when ready.
          </p>
        </div>

        <form onSubmit={handleStart} className={styles.form}>
          {/* Candidate Information */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <svg className={styles.sectionIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Candidate Information
            </h3>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Full Name</label>
                <input
                  className={styles.inputReadonly}
                  value={scheduleDetails?.candidateName || ""}
                  readOnly
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Email Address</label>
                <input
                  className={styles.inputReadonly}
                  value={scheduleDetails?.candidateEmail || ""}
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Interview Details */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <svg className={styles.sectionIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Interview Details
            </h3>
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Role</span>
                <span className={styles.detailValue}>{scheduleDetails?.role}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Mode</span>
                <span className={styles.detailValue}>
                  <span className={styles.badge}>{scheduleDetails?.mode}</span>
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Difficulty</span>
                <span className={styles.detailValue}>
                  <span className={`${styles.badge} ${styles[scheduleDetails?.difficulty?.toLowerCase()]}`}>
                    {scheduleDetails?.difficulty}
                  </span>
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Scheduled Time</span>
                <span className={styles.detailValue}>{scheduledTime}</span>
              </div>
            </div>

            {scheduleDetails?.notes && (
              <div className={styles.notesBox}>
                <label className={styles.notesLabel}>
                  <svg className={styles.notesIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Additional Notes
                </label>
                <p className={styles.notesText}>{scheduleDetails.notes}</p>
              </div>
            )}
          </div>

          {/* Important Notice */}
          <div className={styles.notice}>
            <svg className={styles.noticeIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className={styles.noticeTitle}>Important</p>
              <p className={styles.noticeText}>
                The interview will enter fullscreen mode. Please ensure you're in a quiet environment 
                with good lighting and a stable internet connection.
              </p>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? (
              <>
                <div className={styles.buttonSpinner}></div>
                Starting...
              </>
            ) : (
              <>
                <svg className={styles.buttonIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Interview
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
