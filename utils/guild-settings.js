/**
 * Guild Settings Module
 * Manages per-server configuration for verification messages
 * Supports multiple servers with independent settings
 * @module guild-settings
 */

import fs from "fs/promises"
import path from "path"
import { log } from "./logger.js"

const DATA_DIR = path.resolve(process.cwd(), "data")
const SETTINGS_FILE = path.join(DATA_DIR, "guild-settings.json")

/**
 * Default messages for new guilds
 */
const DEFAULT_MESSAGES = {
    roleId: null, // Added roleId to default settings
    embedTitle: "Welcome to {servername}!",
    embedDescription:
        "Before you can start chatting in **{servername}**, you need to verify yourself.\n\nClick the **Verify** button below to get started.",
    embedColor: "#5865F2",
    dmTitle: "Verify Your Account",
    dmDescription:
        "Hi {username}, click the link below to verify yourself in **{servername}**.\n\nThis verification link is secure and will expire in 5 minutes.",
    dmColor: "#5865F2",
}

/**
 * Guild Settings Store
 * Manages verification message customization per server
 */
class GuildSettings {
    constructor() {
        this.settings = new Map()
        this.initialized = false
    }

    /**
     * Initialize guild settings store
     * Loads existing settings from file
     */
    async init() {
        if (this.initialized) {
            return
        }

        try {
            await fs.mkdir(DATA_DIR, { recursive: true, mode: 0o755 })

            try {
                const data = await fs.readFile(SETTINGS_FILE, "utf-8")
                const parsed = JSON.parse(data)
                this.settings = new Map(Object.entries(parsed))
                log.info(`Loaded settings for ${this.settings.size} server(s) from storage`)
            } catch (error) {
                log.info("No existing guild settings found, using defaults")
            }

            this.initialized = true
        } catch (error) {
            log.error("Failed to initialize guild settings", error)
        }
    }

    /**
     * Get settings for a specific guild
     * Returns default settings if guild has no custom settings
     * @param {string} guildId - Discord guild ID
     * @returns {Object} Guild settings
     */
    getSettings(guildId) {
        if (!this.settings.has(guildId)) {
            return { ...DEFAULT_MESSAGES }
        }
        return this.settings.get(guildId)
    }

    /**
     * Update settings for a guild
     * @param {string} guildId - Discord guild ID
     * @param {Object} newSettings - New settings object
     */
    async updateSettings(guildId, newSettings) {
        const currentSettings = this.getSettings(guildId)
        const updatedSettings = { ...currentSettings, ...newSettings }
        this.settings.set(guildId, updatedSettings)
        await this.persist()
        log.info(`Updated and persisted settings for guild ${guildId}`)
    }

    /**
     * Persist settings to file
     */
    async persist() {
        try {
            const data = Object.fromEntries(this.settings)
            await fs.writeFile(SETTINGS_FILE, JSON.stringify(data, null, 2))
            log.info("Guild settings persisted to storage")
        } catch (error) {
            log.error("Failed to persist guild settings", error)
        }
    }

    /**
     * Replace placeholders in message templates
     * @param {string} text - Text with placeholders
     * @param {Object} data - Replacement data
     * @returns {string} Processed text
     */
    replacePlaceholders(text, data) {
        return text.replace(/{servername}/g, data.serverName || "Server").replace(/{username}/g, data.username || "User")
    }
}

export default new GuildSettings()
