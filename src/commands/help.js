const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Show available commands',
  async execute(message, args) {
    const embed = new EmbedBuilder()
      .setColor('#9146FF')
      .setTitle('🤖 LIVE BEACON - Help')
      .setDescription('Monitor Twitch streamers and get notifications when they go live!')
      .addFields(
        { name: '📺 Streamer Management', value: '`!addstreamer <username>` - Add a Twitch streamer\n`!removestreamer <username>` - Remove a streamer\n`!liststreamer` - List all monitored streamers', inline: false },
        { name: '⚙️ Server Configuration (Admin Only)', value: '`!setchannel` - Set notification channel (run in desired channel)\n`!setrole @Role` - Set role to mention\n`!config` - Show current configuration', inline: false },
        { name: 'ℹ️ Other', value: '`!help` - Show this help message', inline: false }
      )
      .setFooter({ text: 'LIVE BEACON by COAST' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
