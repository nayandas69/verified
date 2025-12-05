/**
 * Console Colors Utility
 * Provides colored console output for better readability in production
 * Uses ANSI escape codes for terminal colors
 * @module logger
 */

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",

  // Foreground colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  // Background colors
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
}

/**
 * Colored console logging functions for production monitoring
 * Each function provides contextual logging with proper formatting
 */
export const log = {
  /**
   * Log success messages (green)
   * @param {string} message - Success message to log
   */
  success: (message) => {
    const timestamp = new Date().toISOString()
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${colors.dim}${timestamp}${colors.reset} ${message}`)
  },

  /**
   * Log error messages (red) with optional stack trace
   * @param {string} message - Error message to log
   * @param {Error|null} error - Optional error object for stack trace
   */
  error: (message, error = null) => {
    const timestamp = new Date().toISOString()
    console.error(`${colors.red}[ERROR]${colors.reset} ${colors.dim}${timestamp}${colors.reset} ${message}`)
    if (error) {
      console.error(`${colors.dim}${error.stack || error}${colors.reset}`)
    }
  },

  /**
   * Log warning messages (yellow)
   * @param {string} message - Warning message to log
   */
  warn: (message) => {
    const timestamp = new Date().toISOString()
    console.warn(`${colors.yellow}[WARN]${colors.reset} ${colors.dim}${timestamp}${colors.reset} ${message}`)
  },

  /**
   * Log info messages (cyan)
   * @param {string} message - Info message to log
   */
  info: (message) => {
    const timestamp = new Date().toISOString()
    console.log(`${colors.cyan}[INFO]${colors.reset} ${colors.dim}${timestamp}${colors.reset} ${message}`)
  },

  /**
   * Log system messages (blue)
   * @param {string} message - System message to log
   */
  system: (message) => {
    const timestamp = new Date().toISOString()
    console.log(`${colors.blue}[SYSTEM]${colors.reset} ${colors.dim}${timestamp}${colors.reset} ${message}`)
  },

  /**
   * Log command execution (magenta)
   * @param {string} message - Command message to log
   */
  command: (message) => {
    const timestamp = new Date().toISOString()
    console.log(`${colors.magenta}[COMMAND]${colors.reset} ${colors.dim}${timestamp}${colors.reset} ${message}`)
  },

  /**
   * Log event messages (white)
   * @param {string} message - Event message to log
   */
  event: (message) => {
    const timestamp = new Date().toISOString()
    console.log(`${colors.white}[EVENT]${colors.reset} ${colors.dim}${timestamp}${colors.reset} ${message}`)
  },

  /**
   * Log start/restart messages (bright green)
   * @param {string} message - Start message to log
   */
  start: (message) => {
    const timestamp = new Date().toISOString()
    console.log(
      `${colors.bright}${colors.green}[START]${colors.reset} ${colors.dim}${timestamp}${colors.reset} ${message}`,
    )
  },

  /**
   * Log failed operations (bright red)
   * @param {string} message - Failure message to log
   */
  failed: (message) => {
    const timestamp = new Date().toISOString()
    console.error(
      `${colors.bright}${colors.red}[FAILED]${colors.reset} ${colors.dim}${timestamp}${colors.reset} ${message}`,
    )
  },
}

export default log
