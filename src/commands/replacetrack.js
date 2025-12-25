const QueueStorage = require('../utils/queueStorage');

module.exports = {
    name: 'lbreplacetrack',
    description: 'Replace one of your tracks with a new one',
    async execute(message, args) {
        if (args.length < 2) {
            return message.reply('**Replace a Track**\n\n' +
                '`!replacetrack [#] [new URL]`\n\n' +
                '*View your tracks: `!myqueue`*');
        }

        const trackNumber = parseInt(args[0]);
        const newUrl = args[1];

        if (isNaN(trackNumber) || trackNumber < 1) {
            return message.reply('❌ Invalid track number.');
        }

        // First remove the old track
        const queueStorage = new QueueStorage();
        const removeResult = queueStorage.removeTrack(message.guild.id, message.author.id, trackNumber);

        if (!removeResult.success) {
            return message.reply('❌ ' + removeResult.error);
        }

        // Signal that we need to add a new one - they should use !addtrack
        return message.reply('✅ Removed **' + removeResult.removed.title + '**\n\n' +
            'Now run: `!addtrack ' + newUrl + '`');
    },
};
