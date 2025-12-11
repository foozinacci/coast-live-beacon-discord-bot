const StreamerStorage = require('../utils/streamerStorage');
const TwitchClient = require('../api/twitchClient');

module.exports = {
  name: 'addstreamer',
  description: 'Add a Twitch streamer to monitor',
  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('Please provide a Twitch username. Usage: `!addstreamer <username>`');
    }

    const username = args[0].toLowerCase();
    const storage = new StreamerStorage();
    const twitchClient = new TwitchClient();
    const guildId = message.guild.id;

    const userInfo = await twitchClient.getUserInfo(username);

    if (!userInfo) {
      return message.reply(`❌ Twitch user "${username}" not found. Please check the username and try again.`);
    }

    const added = storage.addStreamer(guildId, userInfo.login);

    if (added) {
      return message.reply(`✅ Added **${userInfo.display_name}** (${userInfo.login}) to this server's monitoring list!`);
    } else {
      return message.reply(`⚠️  **${userInfo.display_name}** is already being monitored on this server.`);
    }
  },
};
