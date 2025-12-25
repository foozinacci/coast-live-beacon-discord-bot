const { EmbedBuilder } = require('discord.js');
const StreamerStorage = require('../utils/streamerStorage');
const TwitchClient = require('../api/twitchClient');

module.exports = {
  name: 'lbsetchannel',
  description: 'Set the notification channel for stream alerts',
  async execute(message, args) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply('❌ You need Administrator permissions to use this command.');
    }

    const storage = new StreamerStorage();
    const guildId = message.guild.id;
    const channelId = message.channel.id;

    storage.setNotificationChannel(guildId, channelId);

    // Get current streamers for this guild
    const config = storage.getGuildConfig(guildId);
    const streamers = config.streamers || [];

    if (streamers.length === 0) {
      return message.reply('✅ Go-live notification channel set to <#' + channelId + '>!\n\n' +
        '📺 **What will be posted here:**\n' +
        '• Live notifications when streamers go online\n' +
        '• `!whoslive` command results\n\n' +
        '**Next Steps:**\n' +
        '• `!addstreamer USER` - Add a Twitch streamer to monitor\n' +
        '• `!addstreamers USER, USER, USER.` - Add multiple at once\n' +
        '• `!setrole @ROLE` - Set role to ping on go-live');
    }

    // Check who's currently live as proof
    await message.reply(`✅ Notification channel set to <#${channelId}>!\n\n🔍 Checking who's live right now...`);

    try {
      const twitchClient = new TwitchClient();
      const liveStreams = await twitchClient.getStreams(streamers);

      if (liveStreams.length === 0) {
        return message.channel.send(`📴 None of your ${streamers.length} monitored streamers are currently live.\n\n🔔 You'll get notified here when they go live!`);
      }

      // Build condensed summary
      const streamList = liveStreams.map(stream => {
        const gameText = stream.game_name ? ` playing **${stream.game_name}**` : '';
        return `• [**${stream.user_name}**](https://twitch.tv/${stream.user_login})${gameText} - ${stream.viewer_count} viewers`;
      }).join('\n');

      const totalViewers = liveStreams.reduce((sum, s) => sum + s.viewer_count, 0);
      const avgViewers = Math.round(totalViewers / liveStreams.length);

      const embed = new EmbedBuilder()
        .setColor('#9146FF')
        .setTitle(`📺 Currently Live (${liveStreams.length} of ${streamers.length} streamers)`)
        .setDescription(`Here's who's streaming right now:\n\n${streamList}`)
        .addFields(
          { name: '👥 Avg Viewers', value: avgViewers.toLocaleString(), inline: true },
          { name: '📊 Monitored', value: `${streamers.length} streamers`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Channel configured! • Notifications will appear here' });

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error checking live streams:', error);
      await message.channel.send(`⚠️ Couldn't check live status, but the channel is set! Monitoring ${streamers.length} streamers.`);
    }
  },
};

