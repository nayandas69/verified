/**
 * Bot Configuration
 * All configurable settings for the Discord verification bot
 * @module config
 */

export default {
  // Color scheme for embeds and UI elements
  colors: {
    primary: "#00FF00",
    success: "#00FF00",
    error: "#FF0000",
    warning: "#FFA500",
  },

  // User-facing messages and embed configurations
  messages: {
    verifyButton: "Verify",
    verifyEmbed: {
      title: "Server Verification",
      description: "Click the button below to verify your account and gain access to the server.",
      color: "#00FF00",
    },
    verifyInstructions: {
      title: "Verification Required",
      description: "Click the link below to complete verification through Discord OAuth2.",
      color: "#00FF00",
    },
  },

  // Verification system settings
  verification: {
    // Time before verification link expires (5 minutes)
    expirationTime: 300000,
    // Interval to clean up expired verifications (1 minute)
    cleanupInterval: 60000,
  },
}
