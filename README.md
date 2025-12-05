# Discord Verification Bot - Setup Guide

A professional Discord verification bot with OAuth2 integration that supports multiple servers independently.

## Features

- OAuth2 verification system
- Admin-only /verifysetup command with customizable messages
- Per-server role configuration
- Interactive button-based verification
- Multi-server support with independent settings
- Persistent data storage that survives restarts
- Automatic role assignment after verification
- Colored console logging

## Prerequisites

- Node.js 18 or higher installed
- A Discord account

## Discord Bot Setup

### Step 1: Create Discord Application

1. Go to Discord Developer Portal: https://discord.com/developers/applications
2. Click "New Application" button
3. Enter a name for your bot (e.g., "Verification Bot")
4. Click "Create"

### Step 2: Create Bot User

1. In your application, go to the "Bot" tab on the left sidebar
2. Click "Add Bot" button
3. Click "Yes, do it!" to confirm
4. Under the bot's username, click "Reset Token"
5. Click "Yes, do it!" and copy the token
6. Save this token securely - you'll need it for DISCORD_TOKEN in .env
7. Scroll down to "Privileged Gateway Intents"
8. Enable "SERVER MEMBERS INTENT" (required for role management)
9. Click "Save Changes"

### Step 3: Get Application Credentials

1. Go to the "OAuth2" tab on the left sidebar
2. Under "Client information":
   - Copy the "CLIENT ID" - save this for your .env file
3. Click "Reset Secret" under CLIENT SECRET
4. Copy the secret - save this for your .env file

### Step 4: Configure OAuth2 Redirects

1. Still in the "OAuth2" tab, scroll to "Redirects"
2. Click "Add Redirect"
3. For local testing, add: `http://localhost:3000/callback`
4. For production, add your domain: `https://your-domain.com/callback`
5. Click "Save Changes"

Important: The redirect URI must match exactly what you set in your .env file

### Step 5: Invite Bot to Your Server

1. Go to "OAuth2" -> "URL Generator" tab
2. Under "SCOPES", select:
   - bot
   - applications.commands
3. Under "BOT PERMISSIONS", select:
   - Manage Roles
   - Send Messages
   - Use Slash Commands
4. Copy the generated URL at the bottom
5. Paste the URL in your browser
6. Select your server from the dropdown
7. Click "Authorize"
8. Complete the captcha

Important: Make sure your bot's role in server settings is positioned above the role you want to assign to verified users.

## Bot Installation

### Step 1: Download and Install

```bash
# Clone or download the project
cd verified

# Install dependencies
npm install
```

### Step 2: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Open .env in a text editor and fill in your credentials:
```env
# Bot token from Step 2
DISCORD_TOKEN=your_bot_token_here

# Client ID from Step 3
CLIENT_ID=your_client_id_here

# Client secret from Step 3
CLIENT_SECRET=your_client_secret_here

# Port for the web server
PORT=3000

# Your callback URL (must match Discord OAuth2 settings)
# For local testing:
REDIRECT_URI=http://localhost:3000/callback
BASE_URL=http://localhost:3000

# For production:
# REDIRECT_URI=https://your-domain.com/callback
# BASE_URL=https://your-domain.com

# Environment
NODE_ENV=production
```

### Step 3: Start the Bot

```bash
npm start
```

You should see colored log messages indicating the bot is online and the web server is running.

## Using the Bot

### Initial Setup (Server Admin)

1. In your Discord server, use the command:
```
/verifysetup role:@YourRoleName
```

Replace @YourRoleName with the role you want to assign to verified members.

2. Optional: Customize the verification messages:
```
/verifysetup role:@Verified title:"Welcome to {servername}!" description:"Hi {username}, verify yourself by clicking the button below!" color:#5865F2
```

Available placeholders:
- {servername} - Automatically replaced with your server name
- {username} - Automatically replaced with the member's name

3. The bot will post a verification message with a "Verify" button

### User Verification Flow

1. New member clicks the "Verify" button in the channel
2. Bot sends them a direct message with a verification link
3. Member clicks the link
4. Discord OAuth2 page opens asking for authorization
5. Member clicks "Authorize"
6. Bot automatically assigns the configured role
7. Member can now access the server

### Multi-Server Support

The bot works independently across multiple servers:
- Each server configures its own verification role with /verifysetup
- Each server can have different custom messages
- All settings are saved automatically and persist through restarts
- Server data never mixes or conflicts

## Important Role Permission Setup

In Discord server settings:
1. Go to Server Settings -> Roles
2. Make sure your bot's role is positioned ABOVE the verified role
3. If the bot's role is below, it won't be able to assign roles

## Troubleshooting

### "Invalid OAuth2 redirect_uri" error
- Check that REDIRECT_URI in .env exactly matches what you added in Discord Developer Portal OAuth2 settings
- Make sure you included http:// or https://
- Verify you clicked "Save Changes" in the Discord portal

### Bot doesn't respond to /verifysetup
- Wait up to 1 hour for global commands to register
- Make sure you invited the bot with the applications.commands scope
- Verify the bot is online and showing as online in your server

### Bot can't assign roles
- Check that the bot's role is positioned above the verified role in server settings
- Make sure the bot has "Manage Roles" permission
- Verify you ran /verifysetup to configure a role

### Only admins can see /verifysetup command
- This is correct and intentional
- Regular members cannot see or use /verifysetup
- Members only interact with the Verify button

### Data lost after restart
- Check that the data/ folder exists in your project directory
- Verify the bot has permission to write files
- Look at the console logs for any error messages

## Data Storage

The bot stores data in the `data/` folder:
- `guild-settings.json` - Stores each server's configuration (role, messages, colors)
- `verified.json` - Temporary storage for active verifications (usually empty)

Both files are created automatically and update instantly when changes occur. Your data persists through restarts, crashes, and updates.

## Environment Variables Explained

| Variable | Where to Get It | Example |
|----------|----------------|---------|
| DISCORD_TOKEN | Bot tab -> Reset Token | MTAx... |
| CLIENT_ID | OAuth2 tab -> Client Information | 1234567890 |
| CLIENT_SECRET | OAuth2 tab -> Reset Secret | abc123xyz... |
| PORT | Choose any available port | 3000 |
| REDIRECT_URI | Your callback URL | http://localhost:3000/callback |
| BASE_URL | Your base domain | http://localhost:3000 |
| NODE_ENV | Set to production | production |

## Security Notes

- Verification links expire after 5 minutes
- Each server's data is completely isolated
- CSRF protection is built-in

## Support

If you need help:
1. Double-check all steps in this guide
2. Review the troubleshooting section
3. Check console logs for error messages
4. Verify all credentials are correct in .env

---

Built with discord.js v14, Express, and Node.js
