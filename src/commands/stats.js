const { EmbedBuilder } = require('discord.js');
const AnalyticsStorage = require('../utils/analyticsStorage');
const ChartGenerator = require('../utils/chartGenerator');

module.exports = {
  name: 'stats',
  description: 'Show detailed analytics for a streamer (Moderator only)',
  async execute(message, args) {
    try {
      const isModerator = message.member.permissions.has('ManageMessages') ||
        message.member.permissions.has('ModerateMembers') ||
        message.member.permissions.has('Administrator');

      if (!isModerator) {
        return message.reply('❌ Only moderators can view streamer statistics.');
      }

      if (args.length === 0) {
        return message.reply('Usage: `!stats USER`');
      }

      const username = args[0].toLowerCase();
      const analytics = new AnalyticsStorage();
      const stats = analytics.getStreamerStats(username);

      if (!stats) {
        return message.reply('❌ No data for **' + username + '**. They may not have streamed while monitored.');
      }

      const formatDuration = (ms) => {
        if (!ms || ms <= 0) return '0m';
        const hours = Math.floor(ms / 1000 / 60 / 60);
        const minutes = Math.floor((ms / 1000 / 60) % 60);
        return hours > 0 ? hours + 'h ' + minutes + 'm' : minutes + 'm';
      };

      // Safe access with defaults
      const topGamesArr = stats.topGames || [];
      const topGames = topGamesArr.length > 0
        ? topGamesArr.map((g, i) => (i + 1) + '. ' + (g.game || 'Unknown') + ' (' + (g.count || 0) + ')').join('\n')
        : 'No games recorded';

      const peakHourText = stats.peakHour
        ? stats.peakHour.hour + ':00 (' + Math.round(stats.peakHour.avgViewers || 0) + ' avg viewers)'
        : 'Not enough data';

      const embed = new EmbedBuilder()
        .setColor('#9146FF')
        .setTitle('📊 ' + username)
        .addFields(
          {
            name: '📈 Overview',
            value: 'Streams: **' + (stats.totalSessions || 0) + '**\n' +
              'This Week: **' + (stats.streamsThisWeek || 0) + '**\n' +
              'Total Time: **' + formatDuration(stats.totalDuration) + '**',
            inline: true
          },
          {
            name: '👥 Viewers',
            value: 'Peak: **' + (stats.peakViewers || 0) + '**\n' +
              'Avg Peak: **' + Math.round(stats.avgPeakViewers || 0) + '**',
            inline: true
          },
          {
            name: '🎮 Top Games',
            value: topGames,
            inline: false
          },
          {
            name: '⏰ Best Hour',
            value: peakHourText,
            inline: false
          }
        )
        .setTimestamp();

      // Try to add chart, but don't fail if it errors
      try {
        const weeklyData = analytics.getWeeklyStats(username);
        if (weeklyData && weeklyData.labels && weeklyData.labels.length > 1) {
          const chartGen = new ChartGenerator();
          const chartUrl = chartGen.createCombinedChartUrl(username, weeklyData);
          embed.setImage(chartUrl);
        }
      } catch (chartError) {
        console.error('Chart generation failed:', chartError.message);
        // Continue without chart
      }

      const lastStreamDate = stats.lastStream?.startTime
        ? new Date(stats.lastStream.startTime).toLocaleDateString()
        : 'Unknown';
      embed.setFooter({ text: 'Last stream: ' + lastStreamDate });

      return message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Stats command error:', error);
      return message.reply('❌ Error loading stats. The streamer may have no recorded sessions.');
    }
  },
};
