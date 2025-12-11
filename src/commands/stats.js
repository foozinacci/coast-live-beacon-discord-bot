const { EmbedBuilder } = require('discord.js');
const AnalyticsStorage = require('../utils/analyticsStorage');

module.exports = {
  name: 'stats',
  description: 'Show detailed analytics for a streamer (Moderator only)',
  async execute(message, args) {
    const isModerator = message.member.permissions.has('ManageMessages') ||
                        message.member.permissions.has('ModerateMembers') ||
                        message.member.permissions.has('Administrator');

    if (!isModerator) {
      return message.reply('❌ Only moderators can view streamer statistics.');
    }

    if (args.length === 0) {
      return message.reply('Please provide a Twitch username. Usage: `!stats <username>`');
    }

    const username = args[0].toLowerCase();
    const analytics = new AnalyticsStorage();
    const stats = analytics.getStreamerStats(username);

    if (!stats) {
      return message.reply(`❌ No analytics data found for **${username}**. They may not have streamed while being monitored.`);
    }

    const formatDuration = (ms) => {
      const hours = Math.floor(ms / 1000 / 60 / 60);
      const minutes = Math.floor((ms / 1000 / 60) % 60);
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    const topGames = stats.topGames.map((g, i) => `${i + 1}. ${g.game} (${g.count} streams)`).join('\n') || 'None';

    const peakHourText = stats.peakHour
      ? `${stats.peakHour.hour}:00 (avg ${stats.peakHour.avgViewers.toFixed(0)} viewers, ${stats.peakHour.streams} streams)`
      : 'Not enough data';

    const embed = new EmbedBuilder()
      .setColor('#9146FF')
      .setTitle(`📊 Analytics: ${username}`)
      .setDescription(`Comprehensive streaming statistics for **${username}**`)
      .addFields(
        {
          name: '📈 Overview',
          value: `Total Streams: **${stats.totalSessions}**\nStreams This Week: **${stats.streamsThisWeek}**\nTotal Time Live: **${formatDuration(stats.totalDuration)}**\nAvg Stream Length: **${formatDuration(stats.avgDuration)}**`,
          inline: true
        },
        {
          name: '👥 Viewership',
          value: `Peak Viewers: **${stats.peakViewers}**\nAvg Peak: **${Math.round(stats.avgPeakViewers)}**`,
          inline: true
        },
        {
          name: '🎮 Top Games',
          value: topGames,
          inline: false
        },
        {
          name: '⏰ Peak Hour',
          value: peakHourText,
          inline: false
        }
      )
      .setFooter({ text: `Last stream: ${stats.lastStream ? new Date(stats.lastStream.startTime).toLocaleString() : 'Unknown'}` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
