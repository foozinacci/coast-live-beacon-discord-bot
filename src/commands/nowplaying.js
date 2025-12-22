const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'nowplaying',
    description: 'Show current track',
    async execute(message, args) {
        // Get music player from client
        const musicPlayer = message.client.musicPlayer;

        if (!musicPlayer) {
            return message.reply('🎵 Music system not initialized.');
        }

        const current = musicPlayer.getCurrent(message.guild.id);

        if (!current) {
            return message.reply('🎵 Nothing playing right now.');
        }

        const minutes = Math.floor(current.duration / 60);
        const seconds = String(current.duration % 60).padStart(2, '0');
        const badge = current.isBirthday ? ' 🎂' : '';

        const embed = new EmbedBuilder()
            .setColor('#00D4AA')
            .setTitle('🎵 Now Playing')
            .setDescription('**' + current.title + '**\n' + current.artist)
            .addFields(
                { name: '⏱️ Duration', value: minutes + ':' + seconds, inline: true },
                { name: '📤 Added by', value: current.username + badge, inline: true },
                { name: '🔗 Platform', value: current.platform, inline: true },
                { name: '🔄 Plays', value: String(current.playCount), inline: true }
            )
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },
};
