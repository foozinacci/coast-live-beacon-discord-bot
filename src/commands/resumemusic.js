module.exports = {
    name: 'resumemusic',
    description: 'Resume music (Mod only)',
    async execute(message, args) {
        const isMod = message.member.permissions.has('ManageMessages') ||
            message.member.permissions.has('Administrator');

        if (!isMod) {
            return message.reply('❌ Only moderators can resume music.');
        }

        const musicPlayer = message.client.musicPlayer;

        if (!musicPlayer) {
            return message.reply('🎵 Music system not initialized.');
        }

        if (musicPlayer.resume(message.guild.id)) {
            return message.reply('▶️ Music resumed.');
        } else {
            return message.reply('ℹ️ Nothing paused to resume.');
        }
    },
};
