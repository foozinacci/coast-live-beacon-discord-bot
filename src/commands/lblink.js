/**
 * !lb link - Link Discord and Twitch accounts
 * Usage: !lb link [twitch_username] OR !lb link status OR !lb link unlink
 */
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lblink',
    description: 'Link your Discord and Twitch accounts',
    aliases: ['lbaccount'],
    async execute(message, args) {
        const linker = message.client.accountLinker;
        if (!linker) {
            return message.reply('❌ Account linking is not available.');
        }

        const subcommand = (args[0] || '').toLowerCase();

        // Status check
        if (subcommand === 'status' || subcommand === 'info' || subcommand === 'stats' || !subcommand) {
            const info = linker.getLinkedInfo(message.author.id);
            const computed = linker.getComputedStats(message.author.id);

            if (!info) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#FF6B00')
                        .setTitle('🔗 Account Link Status')
                        .setDescription('Your Discord is **not linked** to any Twitch account.')
                        .addFields({ name: 'To Link', value: '`!lblink YourTwitchName`' })
                    ]
                });
            }

            const embed = new EmbedBuilder()
                .setColor(info.linked ? '#00FF00' : '#FF6B00')
                .setTitle('🔗 Account Status')
                .addFields(
                    { name: 'Discord', value: message.author.username, inline: true },
                    { name: 'Twitch', value: info.twitchUsername || '*Not linked*', inline: true },
                    { name: 'Link Status', value: info.linked ? '✅ Linked' : '❌ Not linked', inline: true }
                );

            if (computed && computed.totalGames > 0) {
                // Core stats
                embed.addFields(
                    { name: '📊 Games', value: `${computed.totalGames}`, inline: true },
                    { name: '🏆 W/L', value: `${computed.wins}/${computed.losses}`, inline: true },
                    { name: '📈 Win Rate', value: computed.winRate, inline: true },
                    { name: '⚔️ Kills', value: `${computed.kills}`, inline: true },
                    { name: '💀 Deaths', value: `${computed.deaths}`, inline: true },
                    { name: '📉 KDR', value: computed.kdr, inline: true }
                );

                // Class stats
                if (computed.bestClass) {
                    embed.addFields({ name: '🏅 Best Class', value: `${computed.bestClass.name} (${computed.bestClass.winRate})`, inline: true });
                }
                if (computed.worstClass && computed.worstClass.name !== computed.bestClass?.name) {
                    embed.addFields({ name: '📉 Worst Class', value: `${computed.worstClass.name} (${computed.worstClass.winRate})`, inline: true });
                }

                // Rivalry stats
                if (computed.nemesis) {
                    embed.addFields({ name: '😈 Nemesis', value: `${computed.nemesis.name} (killed you ${computed.nemesis.deaths}x)`, inline: true });
                }
                if (computed.favoriteVictim) {
                    embed.addFields({ name: '🎯 Favorite Victim', value: `${computed.favoriteVictim.name} (${computed.favoriteVictim.kills} kills)`, inline: true });
                }
            } else {
                embed.addFields({ name: '📊 Stats', value: 'No games played yet!' });
            }

            return message.reply({ embeds: [embed] });
        }

        // Unlink
        if (subcommand === 'unlink' || subcommand === 'remove') {
            const result = linker.unlinkTwitch(message.author.id);

            if (!result.success) {
                return message.reply(`❌ ${result.error}`);
            }

            return message.reply(`✅ ${result.message}`);
        }

        // Link to a Twitch username
        const twitchUsername = subcommand;

        if (twitchUsername.length < 2 || twitchUsername.length > 25 || /\s/.test(twitchUsername)) {
            return message.reply('❌ Invalid Twitch username. Usage: `!lblink YourTwitchName`');
        }

        const result = linker.linkTwitch(message.author.id, twitchUsername);

        if (!result.success) {
            return message.reply(`❌ ${result.error}`);
        }

        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Accounts Linked!')
                .setDescription(`Your Discord and Twitch are now connected.`)
                .addFields(
                    { name: 'Discord', value: message.author.username, inline: true },
                    { name: 'Twitch', value: twitchUsername, inline: true }
                )
                .setFooter({ text: 'Your stats will now sync across both platforms!' })
            ]
        });
    }
};
