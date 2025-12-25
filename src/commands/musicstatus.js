module.exports = {
    name: 'lbmusicstatus',
    description: 'View music system status (Admin only)',
    async execute(message, args) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Only administrators can view music status.');
        }

        const musicPlayer = message.client.musicPlayer;

        if (!musicPlayer) {
            return message.reply('🎵 Music system not initialized.');
        }

        const isPlaying = musicPlayer.isPlaying(message.guild.id);
        const current = musicPlayer.getCurrent(message.guild.id);
        const playerData = musicPlayer.getPlayer(message.guild.id);

        let status = '**Status:** ' + (isPlaying ? '▶️ Playing' : '⏹️ Stopped') + '\n';

        if (current) {
            status += '**Current:** ' + current.title + '\n';
            status += '**Added by:** ' + current.username + '\n';
        }

        if (playerData.connection) {
            status += '**Connected:** Yes\n';
        } else {
            status += '**Connected:** No\n';
        }

        return message.reply('🎵 **Music Status**\n\n' + status);
    },
};
