/**
 * OAuth2 Web Server
 * Express server handling Discord OAuth2 verification flow
 * @module web
 */

import express from "express"
import axios from "axios"
import dotenv from "dotenv"
import { log } from "./utils/logger.js"
import { verificationStore } from "./utils/verification-store.js"
import { assignVerifiedRole } from "./bot.js"
import path from "path"
import { fileURLToPath } from "url"

// ES Module dirname workaround
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))

/**
 * Health Check Endpoint
 * Used by UptimeRobot and other monitoring services
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

/**
 * Root Endpoint
 * Simple landing page
 */
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Discord Verification Bot</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          padding: 20px;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          text-align: center;
          max-width: 500px;
        }
        h1 {
          color: #5865F2;
          margin-bottom: 20px;
        }
        p {
          color: #4f545c;
          line-height: 1.6;
        }
        .status {
          display: inline-block;
          background: #3ba55d;
          color: white;
          padding: 8px 20px;
          border-radius: 20px;
          margin-top: 20px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Discord Verification Bot</h1>
        <p>The verification system is running and ready to process verifications.</p>
        <div class="status">Online</div>
      </div>
    </body>
    </html>
  `)
})

/**
 * Verification Page Endpoint
 * Displays OAuth2 login page to user
 */
app.get("/verify", async (req, res) => {
  const { user, guild, state } = req.query

  if (!user || !state || !guild) {
    log.warn("Verification page accessed without required parameters")
    return res.status(400).send("Invalid verification link")
  }

  log.info(`Verification page accessed for user ${user} in guild ${guild}`)

  const { client } = await import("./bot.js")
  const guildObj = client.guilds.cache.get(guild)
  const serverName = guildObj ? guildObj.name : "Server"

  const discordAuthUrl = new URL("https://discord.com/api/oauth2/authorize")
  discordAuthUrl.searchParams.append("client_id", process.env.CLIENT_ID)
  discordAuthUrl.searchParams.append("redirect_uri", process.env.REDIRECT_URI)
  discordAuthUrl.searchParams.append("response_type", "code")
  discordAuthUrl.searchParams.append("scope", "identify guilds.members.read")
  discordAuthUrl.searchParams.append("state", `${user}:${guild}:${state}`)

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Discord Verification</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          padding: 50px 40px;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          text-align: center;
          max-width: 500px;
          width: 100%;
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        h1 {
          color: #5865F2;
          margin-bottom: 15px;
          font-size: 28px;
        }
        .server-name {
          color: #5865F2;
          font-weight: bold;
        }
        p {
          color: #4f545c;
          line-height: 1.6;
          margin-bottom: 30px;
        }
        .discord-btn {
          display: inline-block;
          background: #5865F2;
          color: white;
          padding: 15px 40px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          font-size: 16px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(88,101,242,0.4);
        }
        .discord-btn:hover {
          background: #4752c4;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(88,101,242,0.6);
        }
        .discord-btn:active {
          transform: translateY(0);
        }
        .info {
          margin-top: 30px;
          padding: 15px;
          background: #f0f4ff;
          border-radius: 8px;
          font-size: 14px;
          color: #4f545c;
        }
        .security-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 15px;
          color: #3ba55d;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">[LOCK]</div>
        <h1>Verify for <span class="server-name">${serverName}</span></h1>
        <p>
          Before you can start chatting in <strong>${serverName}</strong>, you need to verify yourself.
          Click the button below to authenticate with Discord.
        </p>
        <a href="${discordAuthUrl.toString()}" class="discord-btn">
          Verify with Discord
        </a>
        <div class="info">
          <strong>Why do we need this?</strong><br>
          We use Discord's official OAuth2 system to securely verify your identity. 
          We'll only access your basic profile information.
        </div>
        <div class="security-badge">
          <span>[SECURE]</span>
          <span>Secured by Discord OAuth2</span>
        </div>
      </div>
    </body>
    </html>
  `)
})

/**
 * OAuth2 Callback Endpoint
 * Handles the OAuth2 callback from Discord
 * Exchanges code for access token and verifies user
 */
app.get("/callback", async (req, res) => {
  const { code, state } = req.query

  if (!code || !state) {
    log.warn("Callback received without code or state")
    return res.status(400).send("Invalid callback parameters")
  }

  try {
    const [userId, guildId, stateToken] = state.split(":")

    log.info(`Processing OAuth2 callback for user ${userId} in guild ${guildId}`)

    const verificationData = await verificationStore.verify(userId, stateToken)

    if (!verificationData) {
      log.warn(`Invalid or expired verification for user ${userId}`)
      return res.send(generateErrorPage("Verification link expired or invalid. Please try again."))
    }

    const tokenResponse = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: process.env.REDIRECT_URI,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    )

    const { access_token } = tokenResponse.data

    const userResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    const discordUser = userResponse.data

    if (discordUser.id !== userId) {
      log.error(`User ID mismatch: expected ${userId}, got ${discordUser.id}`)
      return res.send(generateErrorPage("User verification failed. Please try again."))
    }

    log.info(`User ${discordUser.username} authenticated successfully`)

    const roleAssigned = await assignVerifiedRole(userId, guildId)

    if (roleAssigned) {
      log.success(`User ${userId} successfully verified and role assigned`)
      res.send(generateSuccessPage(discordUser.username))
    } else {
      log.error(`Failed to assign role to user ${userId}`)
      res.send(
        generateErrorPage("Verification succeeded, but role assignment failed. Please contact an administrator."),
      )
    }
  } catch (error) {
    log.error("OAuth2 callback error", error)

    if (error.response) {
      log.error("Discord API Error:", error.response.data)
    }

    res.send(generateErrorPage("An error occurred during verification. Please try again."))
  }
})

/**
 * Generate Success Page HTML
 * @param {string} username - Discord username
 * @returns {string} HTML content
 */
function generateSuccessPage(username) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verification Successful</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          margin: 0;
        }
        .container {
          background: white;
          padding: 50px 40px;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          text-align: center;
          max-width: 500px;
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .icon {
          font-size: 72px;
          margin-bottom: 20px;
          animation: bounce 0.6s ease-out;
          color: #3ba55d;
          font-weight: bold;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        h1 {
          color: #3ba55d;
          margin-bottom: 15px;
          font-size: 32px;
        }
        p {
          color: #4f545c;
          line-height: 1.6;
          margin-bottom: 20px;
          font-size: 16px;
        }
        .username {
          color: #5865F2;
          font-weight: bold;
        }
        .close-btn {
          margin-top: 30px;
          padding: 12px 30px;
          background: #5865F2;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .close-btn:hover {
          background: #4752c4;
          transform: translateY(-2px);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">[SUCCESS]</div>
        <h1>Verification Successful!</h1>
        <p>
          Welcome, <span class="username">${username}</span>!<br>
          You have been successfully verified and granted access to the server.
        </p>
        <p style="font-size: 14px; color: #72767d;">
          You can now close this window and return to Discord.
        </p>
        <button class="close-btn" onclick="window.close()">Close Window</button>
      </div>
    </body>
    </html>
  `
}

/**
 * Generate Error Page HTML
 * @param {string} message - Error message
 * @returns {string} HTML content
 */
function generateErrorPage(message) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verification Failed</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          margin: 0;
        }
        .container {
          background: white;
          padding: 50px 40px;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          text-align: center;
          max-width: 500px;
        }
        .icon {
          font-size: 72px;
          margin-bottom: 20px;
          color: #ed4245;
          font-weight: bold;
        }
        h1 {
          color: #ed4245;
          margin-bottom: 15px;
          font-size: 28px;
        }
        p {
          color: #4f545c;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .close-btn {
          margin-top: 20px;
          padding: 12px 30px;
          background: #ed4245;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .close-btn:hover {
          background: #c13538;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">[ERROR]</div>
        <h1>Verification Failed</h1>
        <p>${message}</p>
        <button class="close-btn" onclick="window.close()">Close Window</button>
      </div>
    </body>
    </html>
  `
}

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).send("Not Found")
})

/**
 * Error Handler
 */
app.use((err, req, res, next) => {
  log.error("Express error", err)
  res.status(500).send("Internal Server Error")
})

/**
 * Start Web Server
 */
app.listen(PORT, () => {
  log.start(`Web server running on port ${PORT}`)
  log.info(`Redirect URI: ${process.env.REDIRECT_URI}`)
  log.info(`Base URL: ${process.env.BASE_URL}`)
})

export default app
