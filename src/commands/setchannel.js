const StreamerStorage = require('../utils/streamerStorage');

module.exports = {
  name: 'setchannel',
  description: 'Set the notification channel for stream alerts',
  async execute(message, args) {
    // Ensure command is used in a guild
    if (!message.guild) {
      return message.reply('❌ This command can only be used in a server.');
    }

    // Ensure member data is available
    if (!message.member) {
      return message.reply('❌ Unable to verify your permissions. Please try again.');
    }

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
