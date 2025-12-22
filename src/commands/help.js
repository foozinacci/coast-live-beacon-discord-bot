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
      .setTitle('🗼 LIVE BEACON - Command Guide')
      .setDescription('Your all-in-one Twitch monitoring & community engagement bot!')
      .addFields(
        {
          name: '📺 Stream Commands',
          value: [
            '`!liststreamer` - View monitored streamers',
            '`!stats <username>` - Streamer analytics *(mod)*',
            '`!leaderboard` - Top streamers *(mod)*'
          ].join('\n'),
          inline: true
        },
        {
          name: '🎂 Birthday Commands',
          value: [
            '`!listbirthdays` - Upcoming birthdays',
            '`!addbirthday @User MM/DD/YYYY` *(mod)*',
            '`!removebirthday @User` *(mod)*'
          ].join('\n'),
          inline: true
        },
        {
          name: '📢 Promo Commands',
          value: [
            '`!listads` - View promo links *(mod)*',
            '`!addad <name> <url>` *(admin)*'
          ].join('\n'),
          inline: true
        },
        {
          name: '⚙️ Setup Commands *(Admin Only)*',
          value: [
            '`!setchannel` - Set go-live notifications (run in channel)',
            '`!setupupdates` - Set mod channel for stream summaries',
            '`!setupannouncements` - Set channel for birthdays & promos',
            '`!setrole @Role` - Set role to ping on go-live'
          ].join('\n'),
          inline: false
        },
        {
          name: '🔧 Streamer Management *(Mod Only)*',
          value: '`!addstreamer <username>` - Add a Twitch streamer\n`!removestreamer <username>` - Remove a streamer',
          inline: false
        },
        {
          name: '📋 Info',
          value: '`!config` - View server configuration\n`!help` - This help message',
          inline: false
        }
      )
      .setFooter({
        text: isModerator
          ? '✅ You have moderator access | LIVE BEACON by COAST'
          : '💡 Ask a mod to add streamers/birthdays | LIVE BEACON by COAST'
      })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
