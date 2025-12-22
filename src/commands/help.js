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
          name: '📺 Live Streams',
          value: '`!whoslive` - See who\'s streaming now\n' +
            '`!liststreamer` - View all monitored streamers',
          inline: false
        },
        {
          name: '🎂 Birthdays',
          value: '`!addmybirthday MM/DD/YYYY` - Add your birthday\n' +
            '`!removemybirthday` - Remove your birthday\n' +
            '`!listbirthdays` - See upcoming birthdays',
          inline: false
        },
        {
          name: '📢 Your Ads (max 2)',
          value: '`!addad HH:MM https://link.com` - Schedule daily ad\n' +
            '`!myads` - View your scheduled ads\n' +
            '`!removemyad 1|2` - Remove your ad\n' +
            '*Time is 24hr format (14:30 = 2:30 PM)*',
          inline: false
        }
      )
      .setFooter({ text: 'LIVE BEACON by COAST • Mods: use !modhelp' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
