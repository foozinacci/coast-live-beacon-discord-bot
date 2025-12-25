/**
 * !lbgame - View game status (V2)
 */
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lbgame',
    description: 'View current Wildcard game status',
    aliases: ['lbstatus'],
    async execute(message, args) {
        const WildcardGame = require('../services/wildcardGameV2');

        if (!message.client.wildcardGame) {
            message.client.wildcardGame = new WildcardGame(message.client);
        }

        const game = message.client.wildcardGame;
        const gameState = game.getGame(message.guild.id);

        const embed = new EmbedBuilder()
            .setColor('#FF6B00')
            .setTitle('🃏 WILDCARD - Game Status')
            .setTimestamp();

        if (gameState.state === 'idle') {
            embed.setDescription('No game in progress. Start one with `!lbjoin`!');
        } else if (gameState.state === 'lobby') {
            const playerList = Array.from(gameState.players.values())
                .map(p => `• ${p.username}`)
                .join('\n') || 'No players yet';

            embed.setDescription(`**Lobby Open!** (${gameState.players.size}/${gameState.maxPlayers})\n\n${playerList}`);
            embed.addFields({ name: 'Join', value: '`!lbjoin` to enter!', inline: true });

            if (gameState.lobbyCountdownActive) {
                embed.addFields({
                    name: '⏱️ Timer',
                    value: `${Math.ceil(gameState.lobbyTimeRemaining / 1000)}s`,
                    inline: true
                });
            }
        } else if (gameState.state === 'in_progress') {
            const teamStatus = gameState.teams.map(t => {
                const teamPlayers = t.players.map(id => {
                    const p = gameState.players.get(id);
                    const cls = p.classKey ? game.getClassInfo(p.classKey) : null;
                    const emoji = cls?.emoji || '';
                    const status = p.alive ? `❤️${p.hp}` : '💀';
                    return `${emoji}${p.username} ${status}`;
                }).join('\n');
                return { name: `Team ${t.id} ${t.alive ? '✅' : '❌'}`, value: teamPlayers || 'Empty', inline: true };
            });

            embed.setDescription(`**Round ${gameState.round}** in progress!`);
            embed.addFields(teamStatus);

            if (gameState.perkSelectionActive) {
                embed.addFields({ name: '🃏 Perk Selection', value: '`!lbperk1` or `!lbperk2` NOW!' });
            }
        }

        embed.setFooter({ text: 'Use !lbgamehelp for full rules & commands' });

        return message.reply({ embeds: [embed] });
    }
};
