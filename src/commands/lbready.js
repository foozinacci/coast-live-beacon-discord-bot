/**
 * !lbready - Ready up for the game
 */
module.exports = {
    name: 'lbready',
    description: 'Ready up to start the Wildcard game',
    async execute(message, args) {
        const WildcardGame = require('../services/wildcardGame');

        if (!message.client.wildcardGame) {
            return message.reply('❌ No game lobby! Join first with `!lbjoin`');
        }

        const game = message.client.wildcardGame;
        const result = game.ready(message.guild.id, message.author.id);

        if (!result.success) {
            return message.reply(`❌ ${result.error}`);
        }

        let response = `✅ **${message.author.username}** is ready! (${result.readyCount}/${result.totalPlayers})`;

        if (result.canStart) {
            response += '\n\n🚀 **All players ready! Starting game...**';

            // Auto-start the game
            const startResult = game.startGame(message.guild.id);
            if (startResult.success) {
                response += '\n\n🃏 **Teams Formed!**\n';
                startResult.teams.forEach(team => {
                    response += `\n**Team ${team.id}:** ${team.players.join(', ')}`;
                });
                response += '\n\n📋 Pick your character with `!lbpick <name>`';
                response += '\n\n**Characters:** Shadow, Titan, Striker, Medic, Scout, Pyro';
            }
        }

        return message.reply(response);
    }
};
