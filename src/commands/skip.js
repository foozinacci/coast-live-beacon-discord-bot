module.exports = {
    name: 'lbskip',
    description: 'Vote to skip current track',
    async execute(message, args) {
        const member = message.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return message.reply('❌ You must be in a voice channel to vote skip.');
        }

        const musicPlayer = message.client.musicPlayer;

        if (!musicPlayer || !musicPlayer.isPlaying(message.guild.id)) {
            return message.reply('🎵 Nothing playing right now.');
        }

        const current = musicPlayer.getCurrent(message.guild.id);

        // Birthday tracks are immune
        if (current && current.isBirthday) {
            return message.reply('🎂 Birthday tracks have skip immunity!');
        }

        // Get voice channel members (excluding bots)
        const members = voiceChannel.members.filter(m => !m.user.bot).size;
        const needed = Math.max(3, Math.ceil(members * 0.3)); // 30% or at least 3

        // Simple skip tracking (would need proper vote tracking)
        if (!message.client.skipVotes) message.client.skipVotes = new Map();

        const key = message.guild.id;
        if (!message.client.skipVotes.has(key)) {
            message.client.skipVotes.set(key, new Set());

            // Clear votes after 30 seconds
            setTimeout(() => {
                message.client.skipVotes.delete(key);
            }, 30000);
        }

        const votes = message.client.skipVotes.get(key);
        votes.add(message.author.id);

        if (votes.size >= needed) {
            musicPlayer.skip(message.guild.id);
            message.client.skipVotes.delete(key);
            return message.reply('⏭️ Skipped! (' + votes.size + '/' + needed + ' votes)');
        }

        return message.reply('⏭️ Skip vote: ' + votes.size + '/' + needed + ' (30s to vote)');
    },
};
