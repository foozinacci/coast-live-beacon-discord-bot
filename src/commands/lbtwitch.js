/**
 * !lbtwitch - Show Twitch chat commands
 */
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lbtwitch',
    description: 'Show commands available in Twitch chat',
    async execute(message, args) {
        const embed = new EmbedBuilder()
            .setColor('#9146FF') // Twitch purple
            .setTitle('📺 Twitch Chat Commands')
            .setDescription('These commands work in linked Twitch channels!')
            .addFields(
                {
                    name: '🎵 Music',
                    value: '`!lbsr [URL]` - Request a song\n' +
                        '`!lbqueue` - View queue\n' +
                        '`!lbnp` - Now playing',
                    inline: true
                },
                {
                    name: '🃏 Wildcard Game',
                    value: '`!lbjoin` - Join lobby\n' +
                        '`!lbready` - Ready up\n' +
                        '`!lbpick <name>` - Pick character\n' +
                        '`!lbwildcard 1|2` - Pick perk\n' +
                        '`!lbgame` - Game status',
                    inline: true
                },
                {
                    name: '🎭 Characters',
                    value: 'Shadow • Titan • Striker • Medic • Scout • Pyro',
                    inline: false
                }
            )
            .setFooter({ text: 'Admins: Use !lblinktwitch to connect a Twitch channel' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
