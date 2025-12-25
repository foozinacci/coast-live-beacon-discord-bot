module.exports = {
    name: 'lbstop',
    description: 'Stop music and disconnect',
    async execute(message, args) {
        const isMod = message.member.permissions.has('ManageMessages') ||
            message.member.permissions.has('Administrator');

        if (!isMod) {
            return message.reply('❌ Only moderators can stop music.');
        }

        const musicPlayer = message.client.musicPlayer;

        if (!musicPlayer) {
            return message.reply('❌ Music system not active.');
        }

        musicPlayer.stop(message.guild.id);
        return message.reply('⏹️ Music stopped and disconnected.');
    },
};
