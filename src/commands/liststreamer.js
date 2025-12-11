const { EmbedBuilder } = require('discord.js');
const StreamerStorage = require('../utils/streamerStorage');

module.exports = {
  name: 'liststreamer',
  description: 'List all monitored Twitch streamers',
  async execute(message, args) {
    const storage = new StreamerStorage();
    const streamers = storage.getStreamers();

    if (streamers.length === 0) {
      return message.reply('No streamers are currently being monitored. Use `!addstreamer <username>` to add one.');
    }

    const embed = new EmbedBuilder()
      .setColor('#9146FF')
      .setTitle('📺 Monitored Twitch Streamers')
      .setDescription(streamers.map((s, i) => `${i + 1}. ${s}`).join('\n'))
      .setFooter({ text: `Total: ${streamers.length} streamer${streamers.length !== 1 ? 's' : ''}` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
