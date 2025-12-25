const StreamerStorage = require('../utils/streamerStorage');
const AnalyticsStorage = require('../utils/analyticsStorage');
const BackupManager = require('../utils/backupManager');
const TwitchClient = require('../api/twitchClient');

module.exports = {
  name: 'lbaddstreamer',
  description: 'Add a Twitch streamer to monitor',
  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('Please provide a Twitch username. Usage: `!addstreamer USER1`');
    }

    const username = args[0].toLowerCase();
    const storage = new StreamerStorage();
    const analyticsStorage = new AnalyticsStorage();
    const twitchClient = new TwitchClient();
    const guildId = message.guild.id;

    const isModerator = message.member.permissions.has('ManageMessages') ||
      message.member.permissions.has('ModerateMembers') ||
      message.member.permissions.has('Administrator');

    if (!isModerator) {
      return message.reply('❌ Only moderators can use this command.');
    }

    const userInfo = await twitchClient.getUserInfo(username);

    if (!userInfo) {
      return message.reply('❌ Twitch user "' + username + '" not found. Check the username and try again.');
    }

    const added = storage.addStreamer(guildId, userInfo.login);

    if (!added) {
      return message.reply('⚠️ **' + userInfo.display_name + '** is already being monitored.');
    }

    // Check if they're currently live
    const streams = await twitchClient.getStreams([userInfo.login]);
    const isLive = streams && streams.length > 0;

    let statusMessage = '';

    if (isLive) {
      // Pre-seed them as "already live" so they don't trigger a notification
      const stream = streams[0];
      analyticsStorage.startSession(userInfo.login, {
        title: stream.title,
        gameName: stream.game_name,
        viewerCount: stream.viewer_count,
        startedAt: stream.started_at
      });
      statusMessage = '\n🔴 Currently live - *will not spam notification*';
    }

    // Auto-backup after adding
    const backupManager = new BackupManager();
    backupManager.createBackup('add-streamer');

    return message.reply('✅ Added **' + userInfo.display_name + '** (' + userInfo.login + ')' + statusMessage);
  },
};
