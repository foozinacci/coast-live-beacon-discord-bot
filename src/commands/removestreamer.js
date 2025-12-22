const StreamerStorage = require('../utils/streamerStorage');
const BackupManager = require('../utils/backupManager');

module.exports = {
  name: 'removestreamer',
  description: 'Remove a Twitch streamer from monitoring',
  async execute(message, args) {
    const isModerator = message.member.permissions.has('ManageMessages') ||
      message.member.permissions.has('ModerateMembers') ||
      message.member.permissions.has('Administrator');

    if (!isModerator) {
      return message.reply('❌ Only moderators can remove streamers from the monitoring list.');
    }

    if (args.length === 0) {
      return message.reply('Please provide a Twitch username. Usage: `!removestreamer <username>`');
    }

    const username = args[0].toLowerCase();
    const storage = new StreamerStorage();
    const guildId = message.guild.id;

    const removed = storage.removeStreamer(guildId, username);

    if (removed) {
      // Auto-backup after removing
      const backupManager = new BackupManager();
      backupManager.createBackup('remove-streamer');

      return message.reply(`✅ Removed **${username}** from this server's monitoring list.`);
    } else {
      return message.reply(`⚠️  **${username}** was not found in this server's monitoring list.`);
    }
  },
};

