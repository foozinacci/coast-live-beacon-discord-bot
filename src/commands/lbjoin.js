/**
 * !lbjoin - Join a Wildcard game (V2)
 */
module.exports = {
    name: 'lbjoin',
    description: 'Join a Wildcard game lobby',
    async execute(message, args) {
        const WildcardGame = require('../services/wildcardGameV2');

        // Initialize game if needed
        if (!message.client.wildcardGame) {
            message.client.wildcardGame = new WildcardGame(message.client);
        }

        const game = message.client.wildcardGame;

        // Set Discord channel for rich updates (first join sets it)
        game.setDiscordChannel(message.guild.id, message.channel.id);

        const result = game.join(
            message.guild.id,
            message.author.id,
            message.author.username,
            'discord'
        );

        if (!result.success) {
            return message.reply(`❌ ${result.error}`);
        }

        // Announce on Twitch too
        game.broadcastToTwitch(message.guild.id, `🎮 ${result.message}`);

        // Use the unified message from the game engine
        let response = `🃏 **${result.message}**`;

        if (result.needed > 0) {
            response += `\n📺 *Twitch viewers can join with \`!lbjoin\` in chat!*`;
        }

        return message.reply(response);
    }
};
