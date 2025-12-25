/**
 * !lbperk1 - Pick Game Changer perk (Category A)
 */
module.exports = {
    name: 'lbperk1',
    description: 'Pick the Game Changer perk during round',
    async execute(message, args) {
        if (!message.client.wildcardGame) {
            return message.reply('❌ No game in progress!');
        }

        const game = message.client.wildcardGame;
        const result = game.pickPerk(
            message.guild.id,
            message.author.id,
            '1'
        );

        if (!result.success) {
            return message.reply(`❌ ${result.error}`);
        }

        return message.reply(`⚡ **${result.message}**`);
    }
};
