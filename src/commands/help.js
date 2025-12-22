const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Show public commands',
  async execute(message, args) {
    const embed = new EmbedBuilder()
      .setColor('#00D4AA')
      .setTitle('🗼 LIVE BEACON - Commands')
      .setDescription('Your community stream companion!')
      .addFields(
        {
          name: '📺 Streams',
          value: '`!whoslive` - Who\'s live now\n' +
            '`!liststreamer` - Monitored streamers',
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
            '`!removetrack [#]` - Remove\n' +
            '`!myqueue` - Your tracks\n' +
            '`!queue` - Full queue',
          inline: true
        },
        {
          name: '🎵 Playback',
          value: '`!play` - Start playing\n' +
            '`!nowplaying` - Current track\n' +
            '`!skip` - Vote to skip',
          inline: true
        },
        {
          name: '📺 Twitch Chat',
          value: '`!lbsr [URL]` - Request song\n' +
            '`!lbqueue` - View queue\n' +
            '`!lbnp` - Now playing',
          inline: true
        }
      )
      .setFooter({ text: 'LIVE BEACON by COAST • Mods: !modhelp' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
