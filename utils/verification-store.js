/**
 * Verification Store Module
 * Manages temporary verification states and pending verifications
 * Uses in-memory storage with file persistence as fallback
 * @module verification-store
 */

import fs from "fs/promises"
import path from "path"
import { log } from "./logger.js"

const DATA_DIR = path.resolve(process.cwd(), "data")
const VERIFICATION_FILE = path.join(DATA_DIR, "verified.json")

/**
 * In-memory verification store
 * Structure: { userId: { guildId, timestamp, state } }
 */
class VerificationStore {
  constructor() {
    this.store = new Map()
    this.initialized = false
  }

  /**
   * Initialize the verification store
   * Loads existing data from file if available
   */
  async init() {
    if (this.initialized) {
      return
    }

    try {
      await fs.mkdir(DATA_DIR, { recursive: true, mode: 0o755 })

      // Try to load existing data
      try {
        const data = await fs.readFile(VERIFICATION_FILE, "utf-8")
        const parsed = JSON.parse(data)
        this.store = new Map(Object.entries(parsed))
        log.info(`Loaded ${this.store.size} pending verifications from storage`)
      } catch (error) {
        // File doesn't exist yet, that's okay
        log.info("No existing verification data found, starting fresh")
      }

      this.initialized = true
    } catch (error) {
      log.error("Failed to initialize verification store", error)
    }
  }

  /**
   * Add a pending verification
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {string} state - OAuth2 state parameter for security
   */
  async addPending(userId, guildId, state) {
    this.store.set(userId, {
      guildId,
      state,
      timestamp: Date.now(),
    })
    await this.persist()
    log.info(`Added and persisted pending verification for user ${userId} in guild ${guildId}`)
  }

  /**
   * Verify a user and retrieve their data
   * @param {string} userId - Discord user ID
   * @param {string} state - OAuth2 state parameter to verify
   * @returns {Object|null} Verification data or null if invalid
   */
  async verify(userId, state) {
    const data = this.store.get(userId)

    if (!data) {
      log.warn(`No pending verification found for user ${userId}`)
      return null
    }

    // Verify state matches for security (prevents CSRF attacks)
    if (data.state !== state) {
      log.warn(`State mismatch for user ${userId} - possible CSRF attempt`)
      return null
    }

    // Check if verification expired (5 minutes timeout)
    const expirationTime = 5 * 60 * 1000 // 5 minutes
    if (Date.now() - data.timestamp > expirationTime) {
      log.warn(`Verification expired for user ${userId}`)
      this.store.delete(userId)
      await this.persist()
      return null
    }

    // Remove from store after successful verification
    this.store.delete(userId)
    await this.persist()

    log.success(`Verified user ${userId} in guild ${data.guildId}`)
    return data
  }

  /**
   * Clean up expired verifications
   * Called periodically to prevent memory leaks
   */
  async cleanup() {
    const expirationTime = 5 * 60 * 1000 // 5 minutes
    const now = Date.now()
    let cleaned = 0

    for (const [userId, data] of this.store.entries()) {
      if (now - data.timestamp > expirationTime) {
        this.store.delete(userId)
        cleaned++
      }
    }

    if (cleaned > 0) {
      await this.persist()
      log.info(`Cleaned up ${cleaned} expired verification(s)`)
    }
  }

  /**
   * Persist verification data to file
   * Ensures data survives bot restarts
   */
  async persist() {
    try {
      const data = Object.fromEntries(this.store)
      await fs.writeFile(VERIFICATION_FILE, JSON.stringify(data, null, 2))
    } catch (error) {
      log.error("Failed to persist verification data", error)
    }
  }
}

// Export singleton instance
export const verificationStore = new VerificationStore()
