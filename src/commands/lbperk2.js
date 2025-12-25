/**
 * !lbperk2 - Pick Rewards perk (Category B)
 */
module.exports = {
    name: 'lbperk2',
    description: 'Pick the Rewards perk during round',
    async execute(message, args) {
        if (!message.client.wildcardGame) {
            return message.reply('❌ No game in progress!');
        }

        const game = message.client.wildcardGame;
        const result = game.pickPerk(
            message.guild.id,
            message.author.id,
            '2'
        );

        if (!result.success) {
            return message.reply(`❌ ${result.error}`);
        }

        return message.reply(`💰 **${result.message}**`);
    }
};
