const StreamerStorage = require('../utils/streamerStorage');
const TwitchClient = require('../api/twitchClient');

module.exports = {
  name: 'addme',
  description: 'Add yourself to stream monitoring (requires linked Twitch account)',
  async execute(message, args) {
    const storage = new StreamerStorage();
    const twitchClient = new TwitchClient();
    const guildId = message.guild.id;

    try {
      // Fetch the full user object with force to get fresh data
      const user = await message.client.users.fetch(message.author.id, { force: true });

      // Try to get connected accounts - this may not work with standard bot tokens
      // Users need to have their Twitch account linked in Discord (Settings → Connections)

      // Since bots can't directly access connections, we'll ask the user to provide their username
      // and trust them, with moderator oversight

      if (args.length === 0) {
        return message.reply(
          `**Add yourself to stream monitoring:**\n\n` +
          `**Step 1:** Make sure your Twitch account is linked in Discord:\n` +
          `• Go to User Settings → Connections\n` +
          `• Click the Twitch icon and link your account\n\n` +
          `**Step 2:** Run this command with your Twitch username:\n` +
          `\`!addme <your_twitch_username>\`\n\n` +
          `Example: \`!addme shroud\`\n\n` +
          `⚠️ Your Twitch username must match your linked account! Moderators can verify and remove fraudulent entries.`
        );
      }

      const twitchUsername = args[0].toLowerCase();

      // Verify the Twitch account exists
      const userInfo = await twitchClient.getUserInfo(twitchUsername);

      if (!userInfo) {
        return message.reply(`❌ Twitch user "${twitchUsername}" not found. Please check the username and try again.`);
      }

      // Check if already added
      const existingStreamers = storage.getStreamers(guildId);
      if (existingStreamers.includes(userInfo.login.toLowerCase())) {
        return message.reply(`⚠️ **${userInfo.display_name}** is already being monitored on this server!`);
      }

      // Add the streamer
      const added = storage.addStreamer(guildId, userInfo.login);

      if (added) {
        return message.reply(
          `✅ Added **${userInfo.display_name}** (${userInfo.login}) to the monitoring list!\n\n` +
          `**Important:** Make sure this is YOUR Twitch account linked in Discord (User Settings → Connections → Twitch).\n` +
          `Moderators can verify and remove fraudulent entries.`
        );
      } else {
        return message.reply(`❌ Failed to add streamer. Please try again or contact a moderator.`);
      }

    } catch (error) {
      console.error('Error in addme command:', error);
      return message.reply(`❌ An error occurred. Please try again or contact a moderator for help.`);
    }
  },
};
