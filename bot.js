/**
 * Discord Verification Bot
 * Production-grade Discord bot for member verification via OAuth2
 * @module bot
 */

import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
} from "discord.js"
import dotenv from "dotenv"
import { log } from "./utils/logger.js"
import { verificationStore } from "./utils/verification-store.js"
import config from "./config.js"
import guildSettings from "./utils/guild-settings.js"

// Load environment variables
dotenv.config()

/**
 * Discord Client Configuration
 * Intents specify what events the bot can receive
 */
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
})

/**
 * Generate a random state string for OAuth2 security
 * Prevents CSRF attacks by ensuring the callback matches the original request
 * @returns {string} Random state string
 */
function generateState() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

/**
 * Bot Ready Event
 * Triggered when the bot successfully connects to Discord
 */
client.once("ready", async () => {
  log.start(`Bot logged in as ${client.user.tag}`)
  log.info(`Bot is active in ${client.guilds.cache.size} server(s)`)

  await guildSettings.init()
  await verificationStore.init()

  // Register slash commands
  await registerCommands()

  // Set bot status
  client.user.setActivity("Verifying Members", { type: "WATCHING" })

  // Start periodic cleanup of expired verifications
  setInterval(() => {
    verificationStore.cleanup()
  }, config.verification.cleanupInterval)

  log.success("Bot is ready and online!")
})

/**
 * Register Slash Commands
 * Registers the /verifysetup command with Discord API
 */
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("verifysetup")
      .setDescription("Setup verification message with customizable text")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addRoleOption((option) =>
        option.setName("role").setDescription("The role to give after verification").setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("title")
          .setDescription("Title of the verification embed (use {servername} for server name)")
          .setRequired(false),
      )
      .addStringOption((option) =>
        option
          .setName("description")
          .setDescription("Description text (use {servername} and {username} as placeholders)")
          .setRequired(false),
      )
      .addStringOption((option) =>
        option.setName("color").setDescription("Embed color in hex format (e.g., #5865F2)").setRequired(false),
      )
      .toJSON(),
  ]

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN)

  try {
    log.info("Started refreshing application (/) commands")

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands })
    log.success("Successfully registered global commands")
  } catch (error) {
    log.error("Failed to register commands", error)
  }
}

/**
 * Slash Command Interaction Handler
 * Handles the /verifysetup command execution
 */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  if (interaction.commandName === "verifysetup") {
    const guildId = interaction.guild.id
    const serverName = interaction.guild.name

    log.command(`/verifysetup executed by ${interaction.user.tag} in ${serverName}`)

    try {
      const role = interaction.options.getRole("role")

      if (!role) {
        await interaction.reply({
          content: "Please specify a valid role for verification.",
          ephemeral: true,
        })
        return
      }

      const currentSettings = guildSettings.getSettings(guildId)

      const title = interaction.options.getString("title")
      const description = interaction.options.getString("description")
      const color = interaction.options.getString("color")

      const newSettings = { roleId: role.id }
      if (title) newSettings.embedTitle = title
      if (description) newSettings.embedDescription = description
      if (color) newSettings.embedColor = color

      await guildSettings.updateSettings(guildId, newSettings)
      log.info(`Updated settings for guild ${guildId} with role ${role.name}`)

      const settings = guildSettings.getSettings(guildId)

      const embedTitle = guildSettings.replacePlaceholders(settings.embedTitle, { serverName })
      const embedDescription = guildSettings.replacePlaceholders(settings.embedDescription, { serverName })

      const embed = new EmbedBuilder()
        .setTitle(embedTitle)
        .setDescription(embedDescription)
        .setColor(settings.embedColor)
        .setTimestamp()

      const button = new ButtonBuilder().setCustomId("verify_button").setLabel("Verify").setStyle(ButtonStyle.Success)

      const row = new ActionRowBuilder().addComponents(button)

      await interaction.reply({
        embeds: [embed],
        components: [row],
      })

      log.success(`Verification message sent in ${serverName} with role ${role.name}`)
    } catch (error) {
      log.error("Failed to send verification message", error)
      await interaction.reply({
        content: "Failed to send verification message. Please try again.",
        ephemeral: true,
      })
    }
  }
})

/**
 * Button Interaction Handler
 * Handles verification button clicks
 */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return

  if (interaction.customId === "verify_button") {
    const userId = interaction.user.id
    const guildId = interaction.guild.id
    const serverName = interaction.guild.name
    const username = interaction.user.username

    log.event(`Verify button clicked by ${interaction.user.tag} in ${serverName}`)

    try {
      const settings = guildSettings.getSettings(guildId)

      if (!settings.roleId) {
        await interaction.reply({
          content: "Verification is not configured for this server. Please contact an administrator.",
          ephemeral: true,
        })
        log.error(`No role configured for guild ${guildId}`)
        return
      }

      const member = await interaction.guild.members.fetch(userId)
      const verifiedRole = interaction.guild.roles.cache.get(settings.roleId)

      if (!verifiedRole) {
        await interaction.reply({
          content: "The verification role was deleted. Please contact an administrator.",
          ephemeral: true,
        })
        log.error(`Verified role ${settings.roleId} not found in guild ${guildId}`)
        return
      }

      if (member.roles.cache.has(verifiedRole.id)) {
        await interaction.reply({
          content: "You are already verified!",
          ephemeral: true,
        })
        log.info(`User ${interaction.user.tag} is already verified`)
        return
      }

      const state = generateState()

      await verificationStore.addPending(userId, guildId, state)

      const verifyUrl = `${process.env.BASE_URL}/verify?user=${userId}&guild=${guildId}&state=${state}`

      const dmTitle = guildSettings.replacePlaceholders(settings.dmTitle, { serverName, username })
      const dmDescription = guildSettings.replacePlaceholders(settings.dmDescription, { serverName, username })

      const embed = new EmbedBuilder()
        .setTitle(dmTitle)
        .setDescription(
          `${dmDescription}\n\n**[Click here to verify](${verifyUrl})**\n\n*This link will expire in 5 minutes*`,
        )
        .setColor(settings.dmColor)
        .setTimestamp()

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      })

      log.info(`Verification link sent to ${interaction.user.tag}`)
    } catch (error) {
      log.error("Failed to process verify button", error)
      await interaction.reply({
        content: "An error occurred. Please try again later.",
        ephemeral: true,
      })
    }
  }
})

/**
 * Assign Verified Role
 * Called from web server after successful OAuth2 verification
 * @param {string} userId - Discord user ID
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<boolean>} Success status
 */
export async function assignVerifiedRole(userId, guildId) {
  try {
    const guild = client.guilds.cache.get(guildId)

    if (!guild) {
      log.error(`Guild ${guildId} not found`)
      return false
    }

    const settings = guildSettings.getSettings(guildId)

    if (!settings.roleId) {
      log.error(`No role configured for guild ${guild.name}`)
      return false
    }

    const member = await guild.members.fetch(userId)
    const role = guild.roles.cache.get(settings.roleId)

    if (!role) {
      log.error(`Verified role ${settings.roleId} not found in guild ${guild.name}`)
      return false
    }

    if (member.roles.cache.has(role.id)) {
      log.info(`User ${userId} already has verified role`)
      return true
    }

    await member.roles.add(role)
    log.success(`Assigned verified role to ${member.user.tag} in ${guild.name}`)

    try {
      const serverName = guild.name
      const username = member.user.username

      const successMessage = `Hello ${username}!\n\nYou are now a verified member of **${serverName}**.\n\nYou can now access all channels and start chatting. Welcome to the community!`

      await member.send(successMessage)
      log.success(`Sent verification success DM to ${member.user.tag}`)
    } catch (dmError) {
      // User has DMs disabled, log but don't fail verification
      log.warn(`Could not send DM to ${member.user.tag}: ${dmError.message}`)
    }

    return true
  } catch (error) {
    log.error(`Failed to assign verified role to ${userId}`, error)
    return false
  }
}

/**
 * Error Handler
 * Catches and logs unhandled errors to prevent bot crashes
 */
client.on("error", (error) => {
  log.error("Discord client error", error)
})

process.on("unhandledRejection", (error) => {
  log.error("Unhandled promise rejection", error)
})

/**
 * Graceful Shutdown Handler
 * Ensures clean shutdown on process termination
 */
process.on("SIGINT", async () => {
  log.warn("Received SIGINT, shutting down gracefully...")
  await verificationStore.persist()
  client.destroy()
  process.exit(0)
})

process.on("SIGTERM", async () => {
  log.warn("Received SIGTERM, shutting down gracefully...")
  await verificationStore.persist()
  client.destroy()
  process.exit(0)
})

export { client }

if (process.env.DISCORD_TOKEN) {
  client.login(process.env.DISCORD_TOKEN).catch((error) => {
    log.failed("Failed to login to Discord")
    log.error("Login error", error)
    process.exit(1)
  })
} else {
  log.failed("DISCORD_TOKEN not found in environment variables")
  process.exit(1)
}
