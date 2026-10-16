
const {
  Client,
  GatewayIntentBits,
  ChannelType
} = require("discord.js");

const {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  entersState
} = require("@discordjs/voice");

const express = require("express");

// ========================================
// EXPRESS SERVER
// ========================================

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.status(200).send("Discord Voice Bot is running!");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

// ========================================
// DISCORD CLIENT
// ========================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.VOICE_CHANNEL_ID;

const RETRY_DELAY = 5000;

let connection = null;
let isConnecting = false;
let checkRunning = false;

// ========================================
// JOIN VOICE CHANNEL
// ========================================

async function joinRoom() {
  if (isConnecting || !client.isReady()) return;

  isConnecting = true;

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      console.log("❌ Voice channel not found or invalid ID");
      return;
    }

    const guild = channel.guild;

    const member = await guild.members.fetch(client.user.id);

    const existingConnection = getVoiceConnection(guild.id);

    if (
      member.voice.channelId === CHANNEL_ID &&
      existingConnection &&
      existingConnection.state.status === VoiceConnectionStatus.Ready
    ) {
      connection = existingConnection;
      return;
    }

    console.log(`🔄 Connecting to: ${channel.name}`);

    if (existingConnection) {
      existingConnection.destroy();
    }

    connection = null;

    const newConnection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: true
    });

    connection = newConnection;

    // Voice connection errors
    newConnection.on("error", (error) => {
      console.error(`⚠️ Voice error: ${error.message}`);
    });

    newConnection.on(VoiceConnectionStatus.Disconnected, () => {
      console.log("⚠️ Voice connection disconnected");
    });

    try {
      await entersState(
        newConnection,
        VoiceConnectionStatus.Ready,
        15000
      );

      console.log(`✅ Successfully joined: ${channel.name}`);

    } catch (error) {
      console.error(`❌ Voice connection failed: ${error.message}`);

      if (newConnection.state.status !== VoiceConnectionStatus.Destroyed) {
        newConnection.destroy();
      }

      if (connection === newConnection) {
        connection = null;
      }
    }

  } catch (error) {
    console.error(`❌ Join room error: ${error.message}`);

  } finally {
    isConnecting = false;
  }
}

// ========================================
// CHECK VOICE CHANNEL EVERY 5 SECONDS
// ========================================

async function checkVoice() {
  if (checkRunning || isConnecting || !client.isReady()) return;

  checkRunning = true;

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      console.log("❌ Invalid voice channel");
      return;
    }

    const member = await channel.guild.members.fetch(client.user.id);

    const currentConnection = getVoiceConnection(channel.guild.id);

    const isInChannel = member.voice.channelId === CHANNEL_ID;

    const isVoiceReady =
      currentConnection &&
      currentConnection.state.status === VoiceConnectionStatus.Ready;

    if (!isInChannel || !isVoiceReady) {
      console.log("⚠️ Bot disconnected. Attempting to reconnect...");
      await joinRoom();
    }

  } catch (error) {
    console.error(`⚠️ Voice check error: ${error.message}`);

  } finally {
    checkRunning = false;
  }
}

// ========================================
// BOT READY
// ========================================

client.once("clientReady", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  await joinRoom();

  setInterval(checkVoice, RETRY_DELAY);
});

// ========================================
// ERROR HANDLING
// ========================================

client.on("error", (error) => {
  console.error(`⚠️ Discord client error: ${error.message}`);
});

process.on("unhandledRejection", (error) => {
  console.error("⚠️ Unhandled rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("⚠️ Uncaught exception:", error);
});

// ========================================
// START BOT
// ========================================

if (!TOKEN || !CHANNEL_ID) {
  console.error("❌ Missing DISCORD_TOKEN or VOICE_CHANNEL_ID");
  process.exit(1);
}
console.log("🔄 Attempting Discord login...");

client.on("debug", (message) => {
  console.log("🔍 Discord:", message);
});
client.login(TOKEN).catch((error) => {
  console.error(`❌ Discord login failed: ${error.message}`);
  process.exit(1);
});
