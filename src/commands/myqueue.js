const { EmbedBuilder } = require('discord.js');
const QueueStorage = require('../utils/queueStorage');

module.exports = {
    name: 'myqueue',
    description: 'View your tracks in the queue',
    async execute(message, args) {
        const queueStorage = new QueueStorage();
        const userTracks = queueStorage.getUserTracks(message.guild.id, message.author.id);

        if (userTracks.length === 0) {
            return message.reply('🎵 You have no tracks in the queue.\n\nUse `!addtrack [URL]` to add one!');
        }

        const formatDuration = (seconds) => {
            const m = Math.floor(seconds / 60);
            const s = String(seconds % 60).padStart(2, '0');
            return m + ':' + s;
        };

        const trackList = userTracks.map((t, i) => {
            const badge = t.isBirthday ? ' 🎂' : '';
            return '**' + (i + 1) + '.** ' + t.title + badge + '\n   ' +
                t.artist + ' • ' + formatDuration(t.duration) + ' • 🔄 ' + t.playCount;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor('#00D4AA')
            .setTitle('🎵 Your Queue (' + userTracks.length + '/3)')
            .setDescription(trackList)
            .setFooter({ text: 'Remove: !removetrack [#]' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },
};
