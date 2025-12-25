/**
 * !lbleave - Leave a Wildcard game (V2)
 */
module.exports = {
    name: 'lbleave',
    description: 'Leave the Wildcard game lobby',
    async execute(message, args) {
        if (!message.client.wildcardGame) {
            return message.reply('❌ No game in progress!');
        }

        const game = message.client.wildcardGame;
        const result = game.leave(message.guild.id, message.author.id);

        if (!result.success) {
            return message.reply(`❌ ${result.error}`);
        }

        return message.reply(`👋 ${result.message}`);
    }
};
