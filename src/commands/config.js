const { EmbedBuilder } = require('discord.js');
const StreamerStorage = require('../utils/streamerStorage');

module.exports = {
  name: 'config',
  description: 'Show current server configuration',
  async execute(message, args) {
    const storage = new StreamerStorage();
    const guildId = message.guild.id;
    const config = storage.getGuildConfig(guildId);

    const channelText = config.notificationChannelId
      ? `<#${config.notificationChannelId}>`
      : '❌ Not set (use `!setchannel`)';

    const roleText = config.roleId
      ? `<@&${config.roleId}>`
      : '❌ Not set (use `!setrole @RoleName`)';

    const streamersText = config.streamers.length > 0
      ? config.streamers.join(', ')
      : 'None (use `!addstreamer <username>`)';

    const embed = new EmbedBuilder()
      .setColor('#9146FF')
      .setTitle('⚙️ Server Configuration')
      .addFields(
        { name: '📺 Notification Channel', value: channelText, inline: false },
        { name: '👥 Mention Role', value: roleText, inline: false },
        { name: '🎮 Monitored Streamers', value: streamersText, inline: false }
      )
      .setFooter({ text: `Server ID: ${guildId}` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
