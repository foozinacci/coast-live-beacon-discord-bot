const { EmbedBuilder } = require('discord.js');
const UserProfileStorage = require('../utils/userProfileStorage');

module.exports = {
    name: 'myprofile',
    description: 'View your profile and social links',
    async execute(message, args) {
        const storage = new UserProfileStorage();
        const profile = storage.getProfile(message.guild.id, message.author.id);

        if (!profile || (!profile.twitch && !profile.youtube && !profile.twitter && !profile.tiktok && !profile.other)) {
            return message.reply('📋 No profile links set!\n\n' +
                'Use `!setprofile [platform] [link]` to add your socials.\n' +
                'Platforms: `twitch`, `youtube`, `twitter`, `tiktok`, `other`');
        }

        const embed = new EmbedBuilder()
            .setColor('#9146FF')
            .setTitle('📋 ' + message.author.username + '\'s Profile')
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

        let links = '';
        if (profile.twitch) links += '📺 **Twitch:** ' + profile.twitch + '\n';
        if (profile.youtube) links += '▶️ **YouTube:** ' + profile.youtube + '\n';
        if (profile.twitter) links += '🐦 **Twitter/X:** ' + profile.twitter + '\n';
        if (profile.tiktok) links += '🎵 **TikTok:** ' + profile.tiktok + '\n';
        if (profile.other) links += '🔗 **Link:** ' + profile.other + '\n';

        embed.setDescription(links);
        embed.setFooter({ text: 'Use !setprofile to update • !clearprofile to reset' });
        embed.setTimestamp();

        return message.reply({ embeds: [embed] });
    },
};
