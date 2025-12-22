const { EmbedBuilder } = require('discord.js');
const AnnouncementStorage = require('../utils/announcementStorage');

module.exports = {
    name: 'addad',
    description: 'Add a promotional ad/link to the announcements rotation',
    async execute(message, args) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ You need Administrator permissions to manage ads.');
        }

        if (args.length < 2) {
            return message.reply(`❌ Usage: \`!addad <name> <url> [description]\`

**Examples:**
• \`!addad "COAST Website" https://coast.gg Check out the COAST community hub!\`
• \`!addad "Discord Invite" https://discord.gg/coast Join our Discord!\`

💡 **Tip:** Put names with spaces in quotes.`);
        }

        // Parse arguments - name could be in quotes
        let name, url, description;

        if (args[0].startsWith('"')) {
            // Find the closing quote
            const fullArgs = args.join(' ');
            const match = fullArgs.match(/^"([^"]+)"\s+(\S+)\s*(.*)?$/);

            if (match) {
                name = match[1];
                url = match[2];
                description = match[3] || '';
            } else {
                return message.reply('❌ Invalid format. Make sure to close your quotes.');
            }
        } else {
            name = args[0];
            url = args[1];
            description = args.slice(2).join(' ') || '';
        }

        // Validate URL
        try {
            new URL(url);
        } catch (error) {
            return message.reply('❌ Invalid URL. Please provide a valid URL starting with http:// or https://');
        }

        const storage = new AnnouncementStorage();
        storage.addGuildAd(message.guild.id, name, url, description);

        const currentAds = storage.getGuildAds(message.guild.id);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Promotional Ad Added')
            .addFields(
                { name: '📛 Name', value: name, inline: true },
                { name: '🔗 URL', value: url, inline: true },
                { name: '📝 Description', value: description || '*No description*', inline: false }
            )
            .setFooter({ text: `Total ads: ${currentAds.length}` })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },
};
