/**
 * Main Entry Point
 * Starts both Discord bot and Express web server
 * @module index
 */

import "./bot.js"
import "./web.js"
import { log } from "./utils/logger.js"

log.start("=".repeat(50))
log.start("Discord Verification Bot - Production Mode")
log.start("=".repeat(50))
log.info("Environment: " + (process.env.NODE_ENV || "development"))
log.info("Starting bot and web server...")
