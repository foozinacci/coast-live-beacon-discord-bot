const { EmbedBuilder } = require('discord.js');
const AnalyticsStorage = require('../utils/analyticsStorage');

module.exports = {
  name: 'leaderboard',
  description: 'Show streamer leaderboards (Moderator only)',
  async execute(message, args) {
    const isModerator = message.member.permissions.has('ManageMessages') ||
      message.member.permissions.has('ModerateMembers') ||
      message.member.permissions.has('Administrator');

    if (!isModerator) {
      return message.reply('❌ Only moderators can view the leaderboard.');
    }

    const analytics = new AnalyticsStorage();

    const metric = args[0]?.toLowerCase() || 'peakviewers';

    let leaderboard;
    let title;
    let description;

    switch (metric) {
      case 'peak':
      case 'peakviewers':
        leaderboard = analytics.getLeaderboard('peakViewers', 10);
        title = '🏆 Top Streamers by Peak Viewers';
        description = 'Streamers with the highest peak viewer count';
        break;

      case 'avg':
      case 'avgviewers':
        leaderboard = analytics.getLeaderboard('avgPeakViewers', 10);
        title = '🏆 Top Streamers by Average Viewers';
        description = 'Streamers ranked by their average viewer count';
        break;

      case 'streams':
      case 'totalstreams':
        leaderboard = analytics.getLeaderboard('totalSessions', 10);
        title = '🏆 Most Active Streamers';
        description = 'Streamers with the most streaming sessions';
        break;

      case 'time':
      case 'duration':
        leaderboard = analytics.getLeaderboard('totalDuration', 10);
        title = '🏆 Longest Streaming Time';
        description = 'Streamers with the most total hours streamed';
        break;

      default:
        return message.reply('❌ Invalid metric. Use: `peakviewers`, `avgviewers`, `streams`, or `duration`\nExample: `!leaderboard peakviewers`');
    }

    if (!leaderboard || leaderboard.length === 0) {
      return message.reply('❌ Not enough data to generate a leaderboard yet. Keep monitoring streamers!');
    }

    const formatValue = (metric, value) => {
      if (metric === 'peakViewers' || metric === 'avgPeakViewers') {
        return `${Math.round(value)} viewers`;
      } else if (metric === 'totalSessions') {
        return `${value} streams`;
      } else if (metric === 'totalDuration') {
        const hours = Math.floor(value / 1000 / 60 / 60);
        return `${hours}h`;
      }
      return value.toString();
    };

    const leaderboardText = leaderboard
      .map((entry, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        return `${medal} **${entry.streamer}** - ${formatValue(metric === 'peak' || metric === 'peakviewers' ? 'peakViewers' : metric === 'avg' || metric === 'avgviewers' ? 'avgPeakViewers' : metric === 'streams' || metric === 'totalstreams' ? 'totalSessions' : 'totalDuration', entry.value)}`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(title)
      .setDescription(description)
      .addFields({ name: 'Rankings', value: leaderboardText || 'No data yet', inline: false })
      .setFooter({ text: 'LIVE BEACON Analytics' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
