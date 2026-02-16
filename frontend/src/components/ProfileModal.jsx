"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import styles from "./ProfileModal.module.css"

export default function ProfileModal({ initialName = "", initialEmail = "", initialAvatar = null, onClose, onSave }) {
  const [avatarPreview, setAvatarPreview] = useState(initialAvatar ?? "http://localhost:3000/uploads/profile-images/noProfileImage.png")
  const [selectedFile, setSelectedFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fileError, setFileError] = useState("")
  const fileRef = useRef(null)
  const lastBlobRef = useRef(null)

  useEffect(() => {
    setAvatarPreview(initialAvatar || "http://localhost:3000/uploads/profile-images/noProfileImage.png")
    setSelectedFile(null)
    if (lastBlobRef.current) {
      URL.revokeObjectURL(lastBlobRef.current)
      lastBlobRef.current = null
    }
  }, [initialAvatar])

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (lastBlobRef.current) {
        URL.revokeObjectURL(lastBlobRef.current)
        lastBlobRef.current = null
      }
    }
  }, [])

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setFileError('Please select a valid image file (JPEG, PNG, GIF, or WebP)')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setFileError('Image size must be less than 5MB')
      return
    }

    setFileError('')

    // revoke previous blob url if any
    if (lastBlobRef.current) {
      URL.revokeObjectURL(lastBlobRef.current)
      lastBlobRef.current = null
    }

    const blobUrl = URL.createObjectURL(file)
    lastBlobRef.current = blobUrl

    setAvatarPreview(blobUrl)
    setSelectedFile(file)
  }, [])

  const handleSave = useCallback(async () => {
    setIsLoading(true)
    try {
      // Only send avatar file if a new one was selected
      const payload = selectedFile ? { avatarFile: selectedFile } : {}
      await onSave(payload)
    } finally {
      setIsLoading(false)
    }
  }, [selectedFile, onSave])

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
      >
        <div className={styles.header}>
          <h3 className={styles.title}>Profile</h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.avatarContainer}>
            <img
              src={avatarPreview}
              alt="Profile"
              className={styles.avatarPreview}
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = "http://localhost:3000/uploads/profile-images/noProfileImage.png"
              }}
            />
            {selectedFile && <div className={styles.avatarBadge}>New</div>}
            
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              style={{ display: "none" }}
              disabled={isLoading}
            />

            <button
              type="button"
              className={styles.editBtn}
              onClick={() => fileRef.current?.click()}
              disabled={isLoading}
              aria-label="Change profile picture"
              title="Change profile picture"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
              </svg>
            </button>
          </div>

          {fileError && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠️</span>
              {fileError}
            </div>
          )}

          <div className={styles.infoSection}>
            <div className={styles.infoField}>
              <label className={styles.label}>Name</label>
              <div className={styles.infoValue}>{initialName || "Not provided"}</div>
            </div>

            <div className={styles.infoField}>
              <label className={styles.label}>Email</label>
              <div className={styles.infoValue}>{initialEmail || "Not provided"}</div>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            aria-label="Cancel"
            disabled={isLoading}
          >
            Cancel
          </button>

          <button
            type="button"
            className={`${styles.saveBtn} ${isLoading ? styles.loading : ''}`}
            onClick={handleSave}
            aria-label="Save profile"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner}></span>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
