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

        return message.reply(`✅ Updates channel set to <#${channelId}>!\n\n📊 **Stream Summaries** will be posted here when monitored streamers go offline (after 5 minutes to confirm).\n\n*This is designed for mod-only channels to track stream analytics.*`);
    },
};
