const {
  Client,
  GatewayIntentBits,
  ChannelType
} = require("discord.js");

const {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState
} = require("@discordjs/voice");

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

async function joinRoom() {
  if (isConnecting) return;

  isConnecting = true;

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      console.log("❌ الروم غير موجود أو الـID خطأ.");
      return;
    }

    const guild = channel.guild;
    const member = await guild.members.fetch(client.user.id);

    // إذا البوت موجود بالفعل في الروم، لا نسوي أي شيء
    if (member.voice.channelId === CHANNEL_ID) {
      console.log(`✅ البوت داخل الروم: ${channel.name}`);
      return;
    }

    console.log(`🔄 محاولة الدخول إلى: ${channel.name}`);

    // تنظيف الاتصال القديم
    if (connection) {
      try {
        connection.destroy();
      } catch {}
      connection = null;
    }

    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: true
    });

    try {
      await entersState(
        connection,
        VoiceConnectionStatus.Ready,
        10000
      );

      console.log(`✅ دخل الروم بنجاح: ${channel.name}`);

    } catch (error) {
      console.log(`❌ الاتصال الصوتي فشل: ${error.message}`);

      try {
        connection.destroy();
      } catch {}

      connection = null;
    }

  } catch (error) {
    console.log(`❌ خطأ: ${error.message}`);

    if (connection) {
      try {
        connection.destroy();
      } catch {}

      connection = null;
    }

  } finally {
    isConnecting = false;
  }
}

client.once("ready", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  // أول محاولة
  await joinRoom();

  // محاولة كل 5 ثواني فقط
  setInterval(async () => {
    try {
      const channel = await client.channels.fetch(CHANNEL_ID);

      if (!channel || channel.type !== ChannelType.GuildVoice) {
        return;
      }

      const member = await channel.guild.members.fetch(
        client.user.id
      );

      // إذا خرج من الروم
      if (member.voice.channelId !== CHANNEL_ID) {
        console.log("⚠️ البوت خارج الروم — محاولة جديدة بعد 5 ثواني...");
        await joinRoom();
      }

    } catch (error) {
      console.log(`⚠️ فحص الروم: ${error.message}`);
    }

  }, RETRY_DELAY);
});

client.login(TOKEN);