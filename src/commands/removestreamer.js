const StreamerStorage = require('../utils/streamerStorage');

module.exports = {
  name: 'removestreamer',
  description: 'Remove a Twitch streamer from monitoring',
  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('Please provide a Twitch username. Usage: `!removestreamer <username>`');
    }

    const username = args[0].toLowerCase();
    const storage = new StreamerStorage();

    const removed = storage.removeStreamer(username);

    if (removed) {
      return message.reply(`✅ Removed **${username}** from the monitoring list.`);
    } else {
      return message.reply(`⚠️  **${username}** was not found in the monitoring list.`);
    }
  },
};
