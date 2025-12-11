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
          value: '`!liststreamer` - View monitored streamers\n`!help` - Show this help message\n\n**To get added:** Link Twitch in Discord (Settings → Connections), then ask a moderator!',
          inline: false
        },
        {
          name: '🛡️ For Moderators Only',
          value: '`!addstreamer <any_username>` - Add anyone to monitoring\n`!removestreamer <username>` - Remove a streamer\n`!stats <username>` - View detailed streamer analytics\n`!leaderboard [metric]` - View streamer rankings\n  Metrics: `peakviewers`, `avgviewers`, `streams`, `duration`',
          inline: false
        },
        {
          name: '⚙️ For Admins Only',
          value: '`!setchannel` - Set notification channel (run in desired channel)\n`!setrole @Role` - Set role to mention\n`!config` - Show current configuration',
          inline: false
        }
      )
      .setFooter({ text: isModerator ? 'LIVE BEACON by COAST | You have moderator access' : 'LIVE BEACON by COAST | Ask a mod to get added!' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
