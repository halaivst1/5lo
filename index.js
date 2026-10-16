
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

client.login(process.env.DISCORD_TOKEN);
