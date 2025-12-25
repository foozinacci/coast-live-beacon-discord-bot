/**
 * !lbstartgame - Force start a Wildcard game (Admin only) (V2)
 */
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lbstartgame',
    description: 'Force start a Wildcard game (Admin only)',
    async execute(message, args) {
        // Admin only
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Only administrators can force start games.');
        }

        const WildcardGame = require('../services/wildcardGameV2');

        if (!message.client.wildcardGame) {
            message.client.wildcardGame = new WildcardGame(message.client);
        }

        const game = message.client.wildcardGame;
        const guildId = message.guild.id;
        const gameState = game.getGame(guildId);

        // Check if there are enough players
        if (gameState.players.size < 3) {
            return message.reply('❌ Need at least 3 players! Have players `!lbjoin` first.');
        }

        if (gameState.state === 'in_progress') {
            return message.reply('❌ A game is already in progress! Use `!lbreset` first.');
        }

        if (gameState.state === 'idle') {
            return message.reply('❌ No lobby exists! Players need to `!lbjoin` first.');
        }

        // Set the Discord channel for game updates
        game.setDiscordChannel(guildId, message.channel.id);

        // Cancel any existing lobby countdown (admin bypass)
        game.cancelLobbyTimer(guildId);

        // Start the game (auto-assigns characters)
        const result = game.startGame(guildId);

        if (!result.success) {
            return message.reply('❌ ' + result.error);
        }

        // Build team fields
        const teamFields = result.teams.map(team => ({
            name: `⚔️ Team ${team.id}`,
            value: team.players.join('\n'),
            inline: true
        }));

        // Add spectator code field if available
        let spectatorInfo = '';
        if (result.spectatorCode) {
            teamFields.push({
                name: '📺 SPECTATOR MODE',
                value: `**Code:** \`${result.spectatorCode}\`\n[Watch Live](http://localhost:3005/spectate/${result.spectatorCode})`,
                inline: false
            });
            spectatorInfo = ` | Spectate: ${result.spectatorCode}`;
        }

        const embed = new EmbedBuilder()
            .setColor('#FF6B00')
            .setTitle('🎮 WILDCARD GAME STARTED!')
            .setDescription('Classes auto-assigned! Perk selection in 2 seconds...\n\n**Get ready to pick `!lbperk1` or `!lbperk2`!**')
            .addFields(teamFields)
            .setFooter({ text: 'Type !lbperk1 (Game Changer) or !lbperk2 (Rewards) - 30 sec timer!' })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });

        // Broadcast to Twitch with spectator code
        game.broadcastToTwitch(guildId, `🎮 WILDCARD STARTED! ${gameState.players.size} players${spectatorInfo} | Perk selection in 2s - !lbperk1 or !lbperk2`);
    }
};
