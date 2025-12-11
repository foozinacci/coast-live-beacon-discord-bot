const StreamerStorage = require('../utils/streamerStorage');

module.exports = {
  name: 'setchannel',
  description: 'Set the notification channel for stream alerts',
  async execute(message, args) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply('❌ You need Administrator permissions to use this command.');
    }

    const storage = new StreamerStorage();
    const guildId = message.guild.id;

    const channelId = message.channel.id;

    storage.setNotificationChannel(guildId, channelId);

    return message.reply(`✅ Notification channel set to <#${channelId}>! Stream alerts will be posted here.`);
  },
};
