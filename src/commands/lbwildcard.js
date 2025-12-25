/**
 * !lbwildcard <1|2> - Legacy perk pick command (redirects to new system)
 */
module.exports = {
    name: 'lbwildcard',
    description: 'Pick a Wildcard perk (use !lbperk1 or !lbperk2)',
    async execute(message, args) {
        if (!message.client.wildcardGame) {
            return message.reply('❌ No game in progress!');
        }

        if (args.length === 0) {
            return message.reply(
                '🃏 **Perk Selection:**\n\n' +
                '• `!lbperk1` - Game Changer (stat boosts, Second Life)\n' +
                '• `!lbperk2` - Rewards (XP bonuses, ALL IN bets)\n\n' +
                '*Use `!lbperks` for full perk list!*'
            );
        }

        const game = message.client.wildcardGame;
        const result = game.pickPerk(
            message.guild.id,
            message.author.id,
            args[0]
        );

        if (!result.success) {
            return message.reply(`❌ ${result.error}`);
        }

        return message.reply(`🃏 **${result.message}**`);
    }
};
