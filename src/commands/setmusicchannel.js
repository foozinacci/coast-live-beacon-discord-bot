const QueueStorage = require('../utils/queueStorage');

module.exports = {
    name: 'setmusicchannel',
    description: 'Set the music text channel (Admin only)',
    async execute(message, args) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Only administrators can set the music channel.');
        }

        const queueStorage = new QueueStorage();
        const channelId = message.channel.id;

        queueStorage.setMusicChannel(message.guild.id, channelId);

        return message.reply('✅ Music channel set to <#' + channelId + '>!\n\n' +
            '🎵 **Now Playing updates will appear here.**\n\n' +
            '*Users can add tracks with `!addtrack [URL]`*');
    },
};
