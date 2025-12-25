const QueueStorage = require('../utils/queueStorage');

module.exports = {
    name: 'lbremovetrack',
    description: 'Remove a track from your queue',
    async execute(message, args) {
        if (args.length === 0) {
            return message.reply('Usage: `!removetrack [#]`\n\nView your tracks: `!myqueue`');
        }

        // Check for mod removing another user's track
        let targetUserId = message.author.id;
        let isMod = false;
        let trackNumber;

        if (args[0].startsWith('<@')) {
            isMod = message.member.permissions.has('ManageMessages') ||
                message.member.permissions.has('Administrator');
            if (!isMod) {
                return message.reply('❌ Only mods can remove other users\' tracks.');
            }
            const match = args[0].match(/<@!?(\d+)>/);
            if (match) {
                targetUserId = match[1];
                trackNumber = parseInt(args[1]);
            }
        } else {
            trackNumber = parseInt(args[0]);
        }

        if (isNaN(trackNumber) || trackNumber < 1) {
            return message.reply('❌ Invalid track number.');
        }

        const queueStorage = new QueueStorage();
        const result = queueStorage.removeTrack(message.guild.id, targetUserId, trackNumber, isMod);

        if (!result.success) {
            return message.reply('❌ ' + result.error);
        }

        return message.reply('✅ Removed: **' + result.removed.title + '**');
    },
};
