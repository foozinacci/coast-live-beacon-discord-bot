/**
 * !lbreset - Reset the current game (Admin only)
 */
module.exports = {
    name: 'lbreset',
    description: 'Reset the current Wildcard game (Admin only)',
    async execute(message, args) {
        // Admin or Mod check
        const isMod = message.member.permissions.has('ManageMessages') ||
            message.member.permissions.has('Administrator');

        if (!isMod) {
            return message.reply('❌ Only moderators can reset the game!');
        }

        if (!message.client.wildcardGame) {
            return message.reply('❌ No game to reset!');
        }

        const game = message.client.wildcardGame;
        const result = game.reset(message.guild.id);

        return message.reply('🔄 **Game has been reset!** Start a new one with `!lbjoin`');
    }
};
