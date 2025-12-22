module.exports = {
    name: 'forceskip',
    description: 'Force skip current track (Mod only)',
    async execute(message, args) {
        const isMod = message.member.permissions.has('ManageMessages') ||
            message.member.permissions.has('Administrator');

        if (!isMod) {
            return message.reply('❌ Only moderators can force skip.');
        }

        const musicPlayer = message.client.musicPlayer;

        if (!musicPlayer || !musicPlayer.isPlaying(message.guild.id)) {
            return message.reply('🎵 Nothing playing.');
        }

        musicPlayer.skip(message.guild.id);
        return message.reply('⏭️ Force skipped!');
    },
};
