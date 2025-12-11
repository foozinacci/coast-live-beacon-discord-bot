const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Show available commands',
  async execute(message, args) {
    const isModerator = message.member.permissions.has('ManageMessages') ||
                        message.member.permissions.has('ModerateMembers') ||
                        message.member.permissions.has('Administrator');

    const embed = new EmbedBuilder()
      .setColor('#9146FF')
      .setTitle('🤖 LIVE BEACON - Help')
      .setDescription('Monitor Twitch streamers and get notifications when they go live!')
      .addFields(
        {
          name: '📺 For Everyone',
          value: '`!liststreamer` - View monitored streamers\n`!config` - Show current configuration\n`!help` - Show this help message',
          inline: false
        },
        {
          name: '🛡️ For Moderators Only',
          value: '`!addstreamer <username>` - Add streamer to monitoring\n`!removestreamer <username>` - Remove a streamer\n`!stats <username>` - View detailed streamer analytics\n`!leaderboard [metric]` - View streamer rankings\n  Metrics: `peakviewers`, `avgviewers`, `streams`, `duration`',
          inline: false
        },
        {
          name: '⚙️ For Admins Only',
          value: '`!setchannel` - Set notification channel (run in desired channel)\n`!setrole @Role` - Set role to mention',
          inline: false
        }
      )
      .setFooter({ text: isModerator ? 'LIVE BEACON by COAST | You have moderator access' : 'LIVE BEACON by COAST | Ask a moderator to add you!' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
