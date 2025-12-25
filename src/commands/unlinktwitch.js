const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'lbunlinktwitch',
    description: 'Remove Twitch channel connection',
    async execute(message, args) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Only server administrators can unlink Twitch.');
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
            return message.reply('❌ No Twitch channel linked to this server.\n\nUse `!lblinktwitch` to set one up.');
        }

        const channelName = link.channel;

        // Disconnect from Twitch
        const twitchChat = message.client.twitchChat;
        if (twitchChat) {
            twitchChat.disconnect(message.guild.id);
        }

        // Remove from config
        delete config[message.guild.id];
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        return message.reply(
            '✅ **Twitch Unlinked**\n\n' +
            '📺 Disconnected from `' + channelName + '`\n\n' +
            '*Use `!lblinktwitch` to link a new channel.*'
        );
    }
};

