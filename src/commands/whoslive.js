const { EmbedBuilder } = require('discord.js');
const StreamerStorage = require('../utils/streamerStorage');
const TwitchClient = require('../api/twitchClient');

// Cooldown tracking per channel
const cooldowns = new Map();
const COOLDOWN_MS = 10000; // 10 seconds

module.exports = {
    name: 'lblive',
    description: 'Check who is currently streaming (only works in notification channel)',
    async execute(message, args) {
        const storage = new StreamerStorage();
        const guildId = message.guild.id;
        const config = storage.getGuildConfig(guildId);

        // Check if this is the notification channel
        if (!config.notificationChannelId) {
            return message.reply('❌ No notification channel set! An admin needs to run `!setchannel` first.');
        }

        if (message.channel.id !== config.notificationChannelId) {
            return message.reply(`❌ This command only works in <#${config.notificationChannelId}>`);
        }

        // Check cooldown
        const cooldownKey = `${guildId}-${message.channel.id}`;
        const lastUsed = cooldowns.get(cooldownKey);
        const now = Date.now();

        if (lastUsed && (now - lastUsed) < COOLDOWN_MS) {
            const remaining = Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 1000);
            return message.reply(`⏳ Please wait ${remaining}s before using this command again.`);
        }

        // Set cooldown
        cooldowns.set(cooldownKey, now);

        const streamers = config.streamers || [];

        if (streamers.length === 0) {
            return message.reply('📺 No streamers being monitored. Mods can use `!addstreamer <username>` to add some!');
        }

        await message.channel.send('🔍 Checking who\'s live...');

        try {
            const twitchClient = new TwitchClient();
            const liveStreams = await twitchClient.getStreams(streamers);

            if (liveStreams.length === 0) {
                return message.channel.send(`📴 None of the ${streamers.length} monitored streamers are currently live.`);
            }

            // Sort by viewer count
            liveStreams.sort((a, b) => b.viewer_count - a.viewer_count);

            // Build list
            const streamList = liveStreams.map((stream, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•';
                const gameText = stream.game_name ? ` | ${stream.game_name}` : '';
                return `${medal} [**${stream.user_name}**](https://twitch.tv/${stream.user_login}) - ${stream.viewer_count.toLocaleString()} viewers${gameText}`;
            }).join('\n');

            const totalViewers = liveStreams.reduce((sum, s) => sum + s.viewer_count, 0);
            const avgViewers = Math.round(totalViewers / liveStreams.length);

            const embed = new EmbedBuilder()
                .setColor('#9146FF')
                .setTitle(`🔴 Currently Live (${liveStreams.length}/${streamers.length})`)
                .setDescription(streamList)
                .addFields(
                    { name: '👥 Total Viewers', value: totalViewers.toLocaleString(), inline: true },
                    { name: '📊 Avg Viewers', value: avgViewers.toLocaleString(), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Click names to watch • Updates every 60s' });

            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error in whoslive:', error);
            await message.channel.send('❌ Error checking Twitch. Please try again later.');
        }
    },
};
