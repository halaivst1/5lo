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

// --- سيرفر Express لمنع البوت من النوم على Render ---
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Voice Bot is active and running 24/7!');
});

app.listen(PORT, () => {
  console.log(`Web server is running on port ${PORT}`);
});
// ----------------------------------------------------

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

    if (member.voice.channelId === CHANNEL_ID) {
      console.log(`✅ البوت داخل الروم: ${channel.name}`);
      return;
    }

    console.log(`🔄 محاولة الدخول إلى: ${channel.name}`);

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

  await joinRoom();

  setInterval(async () => {
    try {
      const channel = await client.channels.fetch(CHANNEL_ID);

      if (!channel || channel.type !== ChannelType.GuildVoice) {
        return;
      }

      const member = await channel.guild.members.fetch(
        client.user.id
      );

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
// أضف هذا السطر لكي يتجاهل البوت أخطاء الاتصال المؤقتة ولا يتوقف عن العمل
if (connection) {
  connection.on('error', (error) => {
    console.log(`⚠️ خطأ في الاتصال الصوتي وتم تجاوزه: ${error.message}`);
  });
}
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const express = require('express');

// إعداد السيرفر للحفاظ على البوت شغالاً 24/7
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('Voice Bot is active and running 24/7!');
});

app.listen(PORT, () => {
    console.log(`Web server is running on port ${PORT}`);
});

// إعداد عميل دسكورد والصلاحيات
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages
    ]
});

client.once('ready', () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
    
    // الدخول للروم الصوتي تلقائياً
    const channelId = process.env.VOICE_CHANNEL_ID;
    if (!channelId) {
        console.log('❌ خطأ: VOICE_CHANNEL_ID غير مسجل في متغيرات البيئة');
        return;
    }

    const channel = client.channels.cache.get(channelId);
    if (channel) {
        joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
        console.log(`🔊 تم الانضمام إلى الروم الصوتي بنجاح!`);
    } else {
        console.log('⚠️ لم يتم العثور على الروم الصوتي، تأكد من الآي دي.');
    }
});

// السطر الأساسي لتسجيل الدخول (تأكد من وجوده في نهاية الملف)
client.login(process.env.DISCORD_TOKEN);
