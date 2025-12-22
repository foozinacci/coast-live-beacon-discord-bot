const StreamerStorage = require('../utils/streamerStorage');

module.exports = {
    name: 'setupupdates',
    description: 'Set the channel for stream summaries (mod-only updates)',
    async execute(message, args) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ You need Administrator permissions to use this command.');
        }

        const storage = new StreamerStorage();
        const guildId = message.guild.id;
        const channelId = message.channel.id;

        storage.setUpdatesChannel(guildId, channelId);

        return message.reply('✅ Stream updates channel set to <#' + channelId + '>!\n\n' +
            '📊 **What will be posted here:**\n' +
            '• Stream-end summaries when streamers go offline\n' +
            '• Duration, peak viewers, avg viewers, games played\n\n' +
            '**Example Summary:**\n' +
            '```\n' +
            '📊 Stream Ended: ashlizzlle\n' +
            '⏱️ Duration: 3h 45m\n' +
            '👥 Peak: 1,247 | Avg: 892\n' +
            '🎮 Game: Fortnite\n' +
            '```\n\n' +
            '*Summaries post ~5 min after offline to confirm stream ended.*\n' +
            '*Designed for mod-only channels to track analytics.*');
    },
};
