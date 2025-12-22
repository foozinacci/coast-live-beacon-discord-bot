module.exports = {
    name: 'pausemusic',
    description: 'Pause music (Mod only)',
    async execute(message, args) {
        const isMod = message.member.permissions.has('ManageMessages') ||
            message.member.permissions.has('Administrator');

        if (!isMod) {
            return message.reply('❌ Only moderators can pause music.');
        }

        const musicPlayer = message.client.musicPlayer;

        if (!musicPlayer) {
            return message.reply('🎵 Music system not initialized.');
        }

        if (musicPlayer.pause(message.guild.id)) {
            return message.reply('⏸️ Music paused.');
        } else {
            return message.reply('ℹ️ Nothing playing or already paused.');
        }
    },
};
