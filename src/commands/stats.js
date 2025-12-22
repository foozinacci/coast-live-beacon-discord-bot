const { EmbedBuilder } = require('discord.js');
const AnalyticsStorage = require('../utils/analyticsStorage');
const ChartGenerator = require('../utils/chartGenerator');

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
      return message.reply('Please provide a Twitch username. Usage: `!stats USER`');
    }

    const username = args[0].toLowerCase();
    const analytics = new AnalyticsStorage();
    const stats = analytics.getStreamerStats(username);

    if (!stats) {
      return message.reply('❌ No analytics data found for **' + username + '**. They may not have streamed while being monitored.');
    }

    const formatDuration = (ms) => {
      const hours = Math.floor(ms / 1000 / 60 / 60);
      const minutes = Math.floor((ms / 1000 / 60) % 60);
      return hours > 0 ? hours + 'h ' + minutes + 'm' : minutes + 'm';
    };

    const topGames = stats.topGames.map((g, i) => (i + 1) + '. ' + g.game + ' (' + g.count + ' streams)').join('\n') || 'None';

    const peakHourText = stats.peakHour
      ? stats.peakHour.hour + ':00 (avg ' + stats.peakHour.avgViewers.toFixed(0) + ' viewers)'
      : 'Not enough data';

    // Generate weekly data for chart
    const weeklyData = analytics.getWeeklyStats(username);

    let chartUrl = null;
    if (weeklyData && weeklyData.labels.length > 1) {
      const chartGen = new ChartGenerator();
      chartUrl = chartGen.createCombinedChartUrl(username, weeklyData);
    }

    const embed = new EmbedBuilder()
      .setColor('#9146FF')
      .setTitle('📊 Analytics: ' + username)
      .setDescription('Streaming statistics for **' + username + '**')
      .addFields(
        {
          name: '📈 Overview',
          value: 'Total Streams: **' + stats.totalSessions + '**\n' +
            'Streams This Week: **' + stats.streamsThisWeek + '**\n' +
            'Total Time Live: **' + formatDuration(stats.totalDuration) + '**\n' +
            'Avg Stream Length: **' + formatDuration(stats.avgDuration) + '**',
          inline: true
        },
        {
          name: '👥 Viewership',
          value: 'Peak Viewers: **' + stats.peakViewers + '**\n' +
            'Avg Peak: **' + Math.round(stats.avgPeakViewers) + '**',
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
      .setFooter({ text: 'Last stream: ' + (stats.lastStream ? new Date(stats.lastStream.startTime).toLocaleString() : 'Unknown') })
      .setTimestamp();

    // Add chart if we have enough data
    if (chartUrl) {
      embed.setImage(chartUrl);
    }

    return message.reply({ embeds: [embed] });
  },
};
