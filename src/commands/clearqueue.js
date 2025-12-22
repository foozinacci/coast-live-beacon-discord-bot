const QueueStorage = require('../utils/queueStorage');

module.exports = {
    name: 'clearqueue',
    description: 'Clear the entire music queue (Mod only)',
    async execute(message, args) {
        const isMod = message.member.permissions.has('ManageMessages') ||
            message.member.permissions.has('Administrator');

        if (!isMod) {
            return message.reply('❌ Only moderators can clear the queue.');
        }

        const confirm = args[0]?.toLowerCase();

        if (confirm !== 'confirm') {
            return message.reply('⚠️ This will clear ALL tracks.\n\nConfirm: `!clearqueue confirm`');
        }

        const queueStorage = new QueueStorage();
        const queue = queueStorage.getGuildQueue(message.guild.id);
        const count = queue.tracks.length;

        queueStorage.clearQueue(message.guild.id);

        // Stop music if playing
        const musicPlayer = message.client.musicPlayer;
        if (musicPlayer) {
            musicPlayer.stop(message.guild.id);
        }

        return message.reply('✅ Cleared **' + count + '** tracks from the queue.');
    },
};
