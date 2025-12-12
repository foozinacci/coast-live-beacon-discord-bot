const StreamerStorage = require('../utils/streamerStorage');
const TwitchClient = require('../api/twitchClient');

module.exports = {
  name: 'addstreamer',
  description: 'Add a Twitch streamer to monitor',
  async execute(message, args) {
    // Ensure command is used in a guild
    if (!message.guild) {
      return message.reply('❌ This command can only be used in a server.');
    }

    // Ensure member data is available
    if (!message.member) {
      return message.reply('❌ Unable to verify your permissions. Please try again.');
    }

    if (args.length === 0) {
      return message.reply('Please provide a Twitch username. Usage: `!addstreamer <username>`');
    }

    const username = args[0].toLowerCase();
    const storage = new StreamerStorage();
    const twitchClient = new TwitchClient();
    const guildId = message.guild.id;

    const isModerator = message.member.permissions.has('ManageMessages') ||
                        message.member.permissions.has('ModerateMembers') ||
                        message.member.permissions.has('Administrator');

    const userInfo = await twitchClient.getUserInfo(username);

    if (!userInfo) {
      return message.reply(`❌ Twitch user "${username}" not found. Please check the username and try again.`);
    }

    if (!isModerator) {
      return message.reply(`❌ Only moderators can use this command.\n\nUse \`!addme <your_twitch_username>\` to add yourself!`);
    }

    const added = storage.addStreamer(guildId, userInfo.login);

    if (added) {
      const addedBy = isModerator ? ' by a moderator' : '';
      return message.reply(`✅ Added **${userInfo.display_name}** (${userInfo.login}) to this server's monitoring list${addedBy}!`);
    } else {
      return message.reply(`⚠️  **${userInfo.display_name}** is already being monitored on this server.`);
    }
  },
};
