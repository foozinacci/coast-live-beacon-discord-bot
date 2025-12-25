/**
 * !lbsetgame - Set the channel for Wildcard game updates
 */
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'lbsetgame',
    description: 'Set the channel for Wildcard game updates (Admin)',
    async execute(message, args) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Only administrators can set the game channel.');
        }

        const configPath = path.join(__dirname, '../../data/serverConfig.json');

        // Load config
        let config = {};
        try {
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
        } catch (e) { }

        if (!config[message.guild.id]) {
            config[message.guild.id] = {};
        }

        // Set current channel as game channel
        config[message.guild.id].gameChannelId = message.channel.id;

        // Save config
        const dataDir = path.dirname(configPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        // Also update the game engine if it's loaded
        if (message.client.wildcardGame) {
            message.client.wildcardGame.setDiscordChannel(message.guild.id, message.channel.id);
        }

        return message.reply(
            '🃏 **Game Channel Set!**\n\n' +
            `Wildcard game updates will be posted here in <#${message.channel.id}>\n\n` +
            '*Players can use `!lbjoin` to start a game!*'
        );
    }
};
