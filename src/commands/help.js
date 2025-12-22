const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Show public commands',
  async execute(message, args) {
    const embed = new EmbedBuilder()
      .setColor('#9146FF')
      .setTitle('🗼 LIVE BEACON - Commands')
      .setDescription('Here\'s what you can do!')
      .addFields(
        {
          name: '📺 Streams',
          value: '`!whoslive` - See who\'s streaming\n' +
            '`!liststreamer` - View monitored streamers',
          inline: true
        },
        {
          name: '📋 Profile',
          value: '`!setprofile [platform] [link]`\n' +
            '`!myprofile` - View your links\n' +
            '`!clearprofile` - Reset links',
          inline: true
        },
        {
          name: '🎂 Birthdays',
          value: '`!addmybirthday MM/DD/YYYY`\n' +
            '`!removemybirthday`\n' +
            '`!listbirthdays`',
          inline: true
        },
        {
          name: '📢 Your Ads (2 max)',
          value: '`!addad HH:MM https://...`\n' +
            '`!myads` - View your ads\n' +
            '`!removemyad 1|2`',
          inline: true
        },
        {
          name: '🔥 Engagement',
          value: '`!streak` - Your streaks\n' +
            '`!streaks` - Leaderboard\n' +
            '`!level` - Your XP & level\n' +
            '`!levels` - XP leaderboard',
          inline: true
        },
        {
          name: '🎵 Music Queue',
          value: '`!addtrack [URL]` - Add track\n' +
            '`!play` - Start playing\n' +
            '`!myqueue` · `!queue`\n' +
            '`!nowplaying` · `!skip`',
          inline: true
        }
      )
      .setFooter({ text: 'LIVE BEACON by COAST • Mods: !modhelp' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
