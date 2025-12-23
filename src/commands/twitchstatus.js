const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'twitchstatus',
    description: 'View Twitch chat link status',
    async execute(message, args) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Admins only.');
        }

        const configPath = path.join(__dirname, '../../data/twitchLinks.json');

        let config = {};
        try {
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
        } catch (e) { }

        const link = config[message.guild.id];

        if (!link) {
            return message.reply('📺 **Twitch Status:** Not linked\n\n' +
                'Use `!linktwitchchat` to connect your Twitch channel.');
        }

        // Check if actually connected
        const twitchChat = message.client.twitchChat;
        const isConnected = twitchChat && twitchChat.clients.has(message.guild.id);

        const linkedDate = new Date(link.linkedAt).toLocaleDateString();
        const linkedBy = link.linkedBy ? '<@' + link.linkedBy + '>' : 'Unknown';

        return message.reply('📺 **Twitch Status**\n\n' +
            '**Channel:** `' + link.channel + '`\n' +
            '**Status:** ' + (isConnected ? '🟢 Connected' : '🔴 Disconnected') + '\n' +
            '**Linked by:** ' + linkedBy + '\n' +
            '**Linked on:** ' + linkedDate + '\n\n' +
            '**Viewer Commands:**\n' +
            '`!lbsr [URL]` • `!lbqueue` • `!lbnp`\n\n' +
            '*Use `!unlinktwitch` to disconnect.*');
    }
};
