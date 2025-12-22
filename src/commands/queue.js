const { EmbedBuilder } = require('discord.js');
const QueueStorage = require('../utils/queueStorage');

module.exports = {
    name: 'queue',
    description: 'View the full music queue',
    async execute(message, args) {
        const queueStorage = new QueueStorage();
        const queue = queueStorage.getGuildQueue(message.guild.id);

        if (queue.tracks.length === 0) {
            return message.reply('🎵 Queue is empty!\n\nAdd tracks with `!addtrack [URL]`');
        }

        const formatDuration = (seconds) => {
            const m = Math.floor(seconds / 60);
            const s = String(seconds % 60).padStart(2, '0');
            return m + ':' + s;
        };

        // Show first 10 tracks
        const trackList = queue.tracks.slice(0, 10).map((t, i) => {
            const badge = t.isBirthday ? ' 🎂' : '';
            return '**' + (i + 1) + '.** ' + t.title.substring(0, 40) + badge + '\n   ' +
                t.username + ' • ' + formatDuration(t.duration);
        }).join('\n\n');

        // Calculate total duration
        const totalSeconds = queue.tracks.reduce((sum, t) => sum + t.duration, 0);
        const totalMinutes = Math.floor(totalSeconds / 60);
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        const totalDuration = totalHours > 0
            ? totalHours + 'h ' + remainingMinutes + 'm'
            : totalMinutes + ' min';

        // Count unique submitters
        const uniqueUsers = new Set(queue.tracks.map(t => t.userId)).size;

        const embed = new EmbedBuilder()
            .setColor('#00D4AA')
            .setTitle('🎵 Music Queue')
            .setDescription(trackList)
            .addFields(
                { name: '📊 Total Tracks', value: String(queue.tracks.length), inline: true },
                { name: '👥 Submitters', value: String(uniqueUsers), inline: true },
                { name: '⏱️ Total Duration', value: totalDuration, inline: true }
            )
            .setFooter({ text: '✅ Ready to play! Use !play to start' })
            .setTimestamp();

        if (queue.tracks.length > 10) {
            embed.setDescription(trackList + '\n\n*...and ' + (queue.tracks.length - 10) + ' more*');
        }

        return message.reply({ embeds: [embed] });
    },
};
