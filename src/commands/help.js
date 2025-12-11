const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Show available commands',
  async execute(message, args) {
    const embed = new EmbedBuilder()
      .setColor('#9146FF')
      .setTitle('🤖 Coast Discord Bot - Help')
      .setDescription('Monitor Twitch streamers and get notifications when they go live!')
      .addFields(
        { name: '!addstreamer <username>', value: 'Add a Twitch streamer to monitor', inline: false },
        { name: '!removestreamer <username>', value: 'Remove a streamer from monitoring', inline: false },
        { name: '!liststreamer', value: 'List all monitored streamers', inline: false },
        { name: '!help', value: 'Show this help message', inline: false }
      )
      .setFooter({ text: 'Coast Discord Bot' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
