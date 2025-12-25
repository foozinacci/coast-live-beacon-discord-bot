module.exports = {
    name: 'lbplay',
    description: 'Start music playback',
    async execute(message, args) {
        const member = message.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return message.reply('❌ Join a voice channel first, then run `!play`');
        }

        const musicPlayer = message.client.musicPlayer;

        if (!musicPlayer) {
            return message.reply('❌ Music system not ready. Try again in a moment.');
        }

        const result = await musicPlayer.play(message.guild.id, voiceChannel);

        if (!result.success) {
            return message.reply('❌ ' + result.error);
        }

        return message.reply('▶️ **Music started!**\n\n' +
            'Now playing from the queue.\n' +
            '*Add tracks: `!addtrack [URL]`*');
    },
};
