/**
 * !lbg - Unified Wildcard game commands
 * Usage: !lbg [join|leave|start|reset|ready|pick|perk1|perk2|status|help]
 */
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lbg',
    description: 'Wildcard game commands',
    aliases: ['lbgame'],
    async execute(message, args) {
        const WildcardGame = require('../services/wildcardGameV2');

        // Initialize game if needed
        if (!message.client.wildcardGame) {
            message.client.wildcardGame = new WildcardGame(message.client);
        }

        const game = message.client.wildcardGame;
        const subcommand = (args[0] || 'help').toLowerCase();
        const subArgs = args.slice(1);

        switch (subcommand) {
            // === BEACON GAME (New Architecture) ===
            case 'live':
                return handleBeaconLive(message);
            case 'close':
                return handleBeaconClose(message);

            // === JOIN ===
            case 'join':
            case 'j':
                // Route to Beacon if live, otherwise legacy
                if (isBeaconLive(message)) {
                    return handleBeaconJoin(message);
                }
                return handleJoin(message, game);

            // === LEAVE ===
            case 'leave':
            case 'quit':
            case 'q':
                if (isBeaconLive(message)) {
                    return handleBeaconLeave(message);
                }
                return handleLeave(message, game);

            // === START ===
            case 'start':
            case 's':
                if (isBeaconLive(message)) {
                    return handleBeaconStart(message);
                }
                return handleStart(message, game);

            // === START WITH BOT FILL (Admin) ===
            case 'startfill':
            case 'botfill':
                return handleStartFill(message, game);

            // === BEACON FILL (New) ===
            case 'fill':
            case 'fill1': case 'fill2': case 'fill3': case 'fill4': case 'fill5':
            case 'fill6': case 'fill7': case 'fill8': case 'fill9': case 'fill10':
            case 'fill11': case 'fill12': case 'fill13': case 'fill14': case 'fill15':
                return handleBeaconFill(message, subcommand);

            // === RESET ===
            case 'reset':
                return handleReset(message, game);

            // === READY ===
            case 'ready':
            case 'r':
                return handleReady(message, game);

            // === PICK CLASS ===
            case 'pick':
            case 'p':
                return handlePick(message, game, subArgs[0]);

            // === PERKS ===
            case 'perk':
            case 'perk1':
                return handlePerk(message, game, 1);
            case 'perk2':
                return handlePerk(message, game, 2);

            // === STATUS ===
            case 'status':
            case 'game':
                return handleStatus(message, game);

            // === CHARACTERS ===
            case 'chars':
            case 'characters':
            case 'classes':
                return handleCharacters(message);

            // === SET FAVORITE CLASS ===
            case 'setfav':
            case 'fav':
            case 'prefer':
                return handleSetFav(message, subArgs[0]);

            // === CLASS INFO (Direct class names) ===
            case 'support':
            case 'recon':
            case 'controller':
            case 'assault':
            case 'skirmisher':
                return handleClassInfo(message, subCommand);

            // === HELP ===
            case 'help':
            case '?':
            default:
                return handleHelp(message);
        }
    }
};

// === HANDLERS ===

async function handleJoin(message, game) {
    game.setDiscordChannel(message.guild.id, message.channel.id);

    const result = await game.join(
        message.guild.id,
        message.author.id,
        message.author.username,
        'discord'
    );

    if (!result.success) {
        return message.reply(`❌ ${result.error}`);
    }

    game.broadcastToTwitch(message.guild.id, `🎮 ${result.message}`);

    // Also push to arena via API
    if (message.client.wildcardAPI) {
        const code = message.client.wildcardAPI.registerGame(message.guild.id);
        const gameState = game.getGame(message.guild.id);
        const player = gameState.players.get(message.author.id);
        if (player) {
            message.client.wildcardAPI.addPlayerToLobby(code, player.username, 'discord');
        }
    }

    // Prompt to link Twitch (once per 24h, only if not linked)
    if (message.client.accountLinker) {
        message.client.accountLinker.promptLink(message.author);
    }

    let response = `🃏 **${result.message}**`;
    if (result.needed > 0) {
        response += `\n📺 *Twitch viewers can join with \`!lbg join\` in chat!*`;
    }
    return message.reply(response);
}

async function handleLeave(message, game) {
    const result = game.leave(message.guild.id, message.author.id);

    if (!result.success) {
        return message.reply(`❌ ${result.error}`);
    }

    return message.reply(`👋 **${result.message}**`);
}

async function handleStart(message, game) {
    // Check for mod/admin permissions
    if (!message.member.permissions.has('ManageMessages')) {
        return message.reply('❌ Only moderators can force-start the game.');
    }

    const result = game.forceStart(message.guild.id);

    if (!result.success) {
        return message.reply(`❌ ${result.error}`);
    }

    // Trigger game start on arena via API
    if (message.client.wildcardAPI) {
        const code = message.client.wildcardAPI.registerGame(message.guild.id);
        message.client.wildcardAPI.startLobbyGame(code);
    }

    return message.reply(`🚀 **Game starting!**`);
}

async function handleStartFill(message, game) {
    // Check for admin permissions
    if (!message.member.permissions.has('Administrator')) {
        return message.reply('❌ Only administrators can use startfill.');
    }

    const gameState = game.getGame(message.guild.id);
    const currentPlayers = gameState.players.size;

    const result = game.startFill(message.guild.id);

    if (!result.success) {
        return message.reply(`❌ ${result.error}`);
    }

    // Trigger game start on arena via API
    if (message.client.wildcardAPI) {
        const code = message.client.wildcardAPI.registerGame(message.guild.id);
        message.client.wildcardAPI.startLobbyGame(code);
    }

    const botsMsg = result.botsAdded > 0
        ? `🤖 Added ${result.botsAdded} bots: ${result.botNames.join(', ')}\n`
        : '';

    return message.reply(`${botsMsg}🚀 **Game starting with ${result.totalPlayers} players!**`);
}

async function handleReset(message, game) {
    // Check for mod/admin permissions
    if (!message.member.permissions.has('ManageMessages')) {
        return message.reply('❌ Only moderators can reset the game.');
    }

    game.reset(message.guild.id);
    return message.reply('🔄 **Game reset!** Lobby is now empty.');
}

async function handleReady(message, game) {
    const gameState = game.getGame(message.guild.id);

    if (gameState.state !== 'lobby') {
        return message.reply('❌ No lobby to ready up in!');
    }

    const player = gameState.players.get(message.author.id);
    if (!player) {
        return message.reply('❌ You need to join first! Use `!lbg join`');
    }

    player.ready = !player.ready;
    return message.reply(player.ready ? '✅ **Ready!**' : '⏸️ **Unreadied**');
}

async function handlePick(message, game, className) {
    if (!className) {
        return message.reply('❌ Usage: `!lbg pick [assault|support|recon|controller|skirmisher]`');
    }

    const result = game.pickClass(message.guild.id, message.author.id, className.toLowerCase());

    if (!result.success) {
        return message.reply(`❌ ${result.error}`);
    }

    return message.reply(`🎯 **${result.message}**`);
}

async function handlePerk(message, game, perkSlot) {
    const result = game.selectPerk(message.guild.id, message.author.id, perkSlot);

    if (!result.success) {
        return message.reply(`❌ ${result.error}`);
    }

    return message.reply(`🃏 **${result.message}**`);
}

async function handleStatus(message, game) {
    const gameState = game.getGame(message.guild.id);

    const embed = new EmbedBuilder()
        .setColor('#FF6B00')
        .setTitle('🃏 WILDCARD - Game Status')
        .setTimestamp();

    if (gameState.state === 'idle') {
        embed.setDescription('No game in progress. Start one with `!lbg join`!');
    } else if (gameState.state === 'lobby') {
        const playerList = Array.from(gameState.players.values())
            .map(p => `• ${p.username}${p.ready ? ' ✅' : ''}`)
            .join('\n') || 'No players yet';

        embed.setDescription(`**Lobby Open!** (${gameState.players.size}/${gameState.maxPlayers})\n\n${playerList}`);
        embed.addFields({ name: 'Join', value: '`!lbg join` to enter!', inline: true });
    } else if (gameState.state === 'in_progress') {
        embed.setDescription(`**Battle in progress!**`);
    }

    embed.setFooter({ text: 'Use !lbg help for commands' });
    return message.reply({ embeds: [embed] });
}

async function handleCharacters(message) {
    const embed = new EmbedBuilder()
        .setColor('#FF6B00')
        .setTitle('🃏 WILDCARD - Characters')
        .setDescription('Each class has unique abilities!')
        .addFields(
            { name: '🔴 Assault', value: 'Tank frontliner with high damage', inline: true },
            { name: '⚪ Support', value: 'Healer with False Positive decoy', inline: true },
            { name: '🔵 Recon', value: 'Sniper with precision shots', inline: true },
            { name: '🟣 Controller', value: 'Anchor with parry shield', inline: true },
            { name: '🟠 Skirmisher', value: 'Speedy flanker with trails', inline: true }
        )
        .setFooter({ text: 'Pick with: !lbg pick [class]' });

    return message.reply({ embeds: [embed] });
}

async function handleSetFav(message, classKey) {
    const linker = message.client.accountLinker;
    if (!linker) {
        return message.reply('❌ Account system not available.');
    }

    if (!classKey) {
        // Show current fav
        const current = linker.getPreferredClass(message.author.id);
        if (current) {
            const CLASS_EMOJIS = { support: '⚪', recon: '🔵', controller: '🟣', assault: '🔴', skirmisher: '🟢' };
            return message.reply(`🎯 Your preferred class: ${CLASS_EMOJIS[current] || ''} **${current.charAt(0).toUpperCase() + current.slice(1)}**\n\n*Change with \`!lbg setfav [class]\`*`);
        }
        return message.reply('🎯 No preferred class set.\n\nUse `!lbg setfav [support|recon|controller|assault|skirmisher]`');
    }

    const result = linker.setPreferredClass(message.author.id, classKey);

    if (!result.success) {
        return message.reply(`❌ ${result.error}`);
    }

    const CLASS_EMOJIS = { support: '⚪', recon: '🔵', controller: '🟣', assault: '🔴', skirmisher: '🟢' };
    const emoji = CLASS_EMOJIS[result.classKey] || '❓';
    const name = result.classKey.charAt(0).toUpperCase() + result.classKey.slice(1);

    return message.reply(`✅ Preferred class set to: ${emoji} **${name}**\n\n*You'll be assigned this class when available on your team!*`);
}

async function handleClassInfo(message, classKey) {
    // Get class data from game service
    const game = message.client.wildcardGame;
    if (!game) {
        return message.reply('❌ Game service not available.');
    }

    // Import CLASSES from the game file (we'll access via game state for now)
    const CLASS_DATA = {
        support: {
            name: 'Support', emoji: '⚪', color: '#ffffff',
            hp: 4500, dmg: '120-150', accuracy: '93%', evasion: '5%', execute: '0%',
            fireRate: 2.4, range: 'Short', role: 'Backline', weight: 1.2,
            description: 'Team sustain specialist with Second Chance respawn',
            perk1: 'Second Chance - Respawn once at 50% HP',
            perk2: 'False Positive - Deploy a decoy that attracts fire',
            teamBonus: '+5% Damage Resist for team',
            counters: 'Controller, Recon', counteredBy: 'Skirmisher, Assault'
        },
        recon: {
            name: 'Recon', emoji: '🔵', color: '#3498db',
            hp: 4000, dmg: '180-250', accuracy: '91%', evasion: '4%', execute: '16%',
            fireRate: 5.0, range: 'Long', role: 'Flank', weight: 0.8,
            description: 'Long-range sniper with high burst damage',
            perk1: 'Disrupt - Stun low-execute targets',
            perk2: 'Precision - +4% evasion when attacking',
            teamBonus: '+5% Accuracy for team',
            counters: 'Controller, Skirmisher', counteredBy: 'Support, Assault'
        },
        controller: {
            name: 'Controller', emoji: '🟣', color: '#9b59b6',
            hp: 5500, dmg: '100-130', accuracy: '80%', evasion: '0%', execute: '5%',
            fireRate: 3.0, range: 'Medium', role: 'Anchor', weight: 1.5,
            special: 'Parry: 75% block + 50% reflect',
            description: 'Tanky anchor with parry shield and damage reflect',
            perk1: 'Parry Shield - 75% chance to block, reflect 50%',
            perk2: 'Suppress - Enemies suffer momentum penalty',
            teamBonus: '+5% Cooldown Reduction for team',
            counters: 'Assault, Skirmisher', counteredBy: 'Support, Recon'
        },
        assault: {
            name: 'Assault', emoji: '🔴', color: '#e74c3c',
            hp: 5000, dmg: '140-180', accuracy: '95%', evasion: '8%', execute: '22%',
            fireRate: 1.6, range: 'Medium', role: 'Frontline', weight: 1.0,
            description: 'Aggressive bruiser with high execute chance',
            perk1: 'Rampage - +30% damage with momentum',
            perk2: 'Execution - 22% instant-kill on low HP',
            teamBonus: '+5% Damage for team',
            counters: 'Support, Recon', counteredBy: 'Controller, Skirmisher'
        },
        skirmisher: {
            name: 'Skirmisher', emoji: '🟢', color: '#2ecc71',
            hp: 4200, dmg: '90-120', accuracy: '87%', evasion: '8%', execute: '5%',
            fireRate: 1.0, range: 'Short', role: 'Roam', weight: 0.7,
            special: 'Blooming Flower: 30% HP respawn',
            description: 'Speed demon with rapid attacks and mobility',
            perk1: 'Bleed - Attacks reduce enemy healing 50%',
            perk2: 'Blooming Flower - 30% HP respawn',
            teamBonus: '+10 Momentum for team',
            counters: 'Support, Assault', counteredBy: 'Controller, Recon'
        }
    };

    const cls = CLASS_DATA[classKey];
    if (!cls) return message.reply('❌ Class not found.');

    // Get community stats
    const linker = message.client.accountLinker;
    const communityStats = linker?.getClassCommunityStats(classKey);

    const embed = new EmbedBuilder()
        .setColor(cls.color)
        .setTitle(`${cls.emoji} ${cls.name}`)
        .setDescription(`*"${cls.description}"*`)
        .addFields(
            {
                name: '📊 Stats',
                value: `❤️ HP: **${cls.hp.toLocaleString()}**\n⚔️ Damage: **${cls.dmg}**\n🎯 Accuracy: **${cls.accuracy}**\n💨 Evasion: **${cls.evasion}**\n⚡ Execute: **${cls.execute}**`,
                inline: true
            },
            {
                name: '🎮 Combat',
                value: `🔫 Fire Rate: **${cls.fireRate}**/s\n📍 Range: **${cls.range}**\n🏃 Role: **${cls.role}**\n⚖️ Weight: **${cls.weight}**${cls.special ? `\n✨ ${cls.special}` : ''}`,
                inline: true
            },
            {
                name: '🃏 Perks',
                value: `1️⃣ ${cls.perk1}\n2️⃣ ${cls.perk2}\n\n🤝 **Team Bonus:** ${cls.teamBonus}`,
                inline: false
            },
            {
                name: '⚔️ Matchups',
                value: `✅ **Counters:** ${cls.counters}\n❌ **Countered by:** ${cls.counteredBy}`,
                inline: false
            }
        );

    // Add community stats if available
    if (communityStats && communityStats.totalGames > 0) {
        let communityText = `📈 **Win Rate:** ${communityStats.winRate}\n`;
        communityText += `🎮 **Pick Rate:** ${communityStats.pickRate}\n`;
        communityText += `⚔️ **Avg Kills/Game:** ${communityStats.avgKillsPerGame}\n`;
        communityText += `👥 **Total Players:** ${communityStats.totalPlayers}`;

        embed.addFields({ name: '🌐 Community Stats', value: communityText, inline: true });

        // Top players
        if (communityStats.topPlayers.length > 0) {
            const topText = communityStats.topPlayers
                .map((p, i) => `${['🥇', '🥈', '🥉'][i]} <@${p.discordId}> (${p.winRate.toFixed(0)}% WR)`)
                .join('\n');
            embed.addFields({ name: '🏆 Top Players', value: topText, inline: true });
        }
    } else {
        embed.addFields({ name: '🌐 Community Stats', value: '*No games played yet!*', inline: false });
    }

    embed.setFooter({ text: `Set as favorite: !lbg setfav ${classKey}` });

    return message.reply({ embeds: [embed] });
}

async function handleHelp(message) {
    const embed = new EmbedBuilder()
        .setColor('#FF6B00')
        .setTitle('🃏 WILDCARD - Game Commands')
        .setDescription('All game commands use `!lbg [subcommand]`')
        .addFields(
            { name: '🎮 Joining', value: '`!lbg join` - Join lobby\n`!lbg leave` - Leave lobby\n`!lbg ready` - Toggle ready', inline: false },
            { name: '🎯 Class Selection', value: '`!lbg setfav [class]` - Set preferred class\n`!lbg chars` - View all classes', inline: false },
            { name: '🃏 Perks', value: '`!lbg perk1` - Select perk option 1\n`!lbg perk2` - Select perk option 2', inline: false },
            { name: '📊 Info', value: '`!lbg status` - View game status\n`!lbg help` - This message', inline: false },
            { name: '🔧 Mod Only', value: '`!lbg start` - Force start game\n`!lbg reset` - Reset game', inline: false },
            { name: '👑 Admin Only', value: '`!lbg live` - Open BEACON game\n`!lbg close` - Close BEACON\n`!lbg fill[1-14]` - Add bots', inline: false }
        )
        .setFooter({ text: 'Twitch viewers can use the same commands!' });

    return message.reply({ embeds: [embed] });
}

// === BEACON GAME HANDLERS (New Architecture) ===

function isBeaconLive(message) {
    const api = message.client.wildcardAPI;
    return api?.beaconGame?.isLive() || false;
}

async function handleBeaconLive(message) {
    // Check for admin permissions
    if (!message.member.permissions.has('Administrator')) {
        return message.reply('❌ Only administrators can use `!lbg live`');
    }

    const api = message.client.wildcardAPI;
    if (!api || !api.beaconGame) {
        return message.reply('❌ Beacon game not available');
    }

    const result = api.beaconGame.processCommand(
        '!lbg live',
        message.author.username,
        'discord',
        true,
        message.guild.id
    );

    if (result.handled && result.response) {
        // Send the response plus OBS setup instructions
        const embed = new EmbedBuilder()
            .setColor('#00FF88')
            .setTitle('🎮 BEACON is now LIVE!')
            .setDescription('The game is open for players!')
            .addFields(
                { name: '📺 OBS Setup', value: 'Add a **Browser Source** with:\n`http://localhost:3005/beacon`', inline: false },
                { name: '🎮 Commands', value: '`!lbg join` - Join the game\n`!lbg fill[1-14]` - Add bots\n`!lbg close` - End session', inline: false }
            )
            .setFooter({ text: 'Twitch chat can also use these commands!' });

        return message.reply({ embeds: [embed] });
    }

    return message.reply(result.response || '❌ Failed to start game');
}

async function handleBeaconClose(message) {
    if (!message.member.permissions.has('Administrator')) {
        return message.reply('❌ Only administrators can use `!lbg close`');
    }

    const api = message.client.wildcardAPI;
    if (!api || !api.beaconGame) {
        return message.reply('❌ Beacon game not available');
    }

    const result = api.beaconGame.processCommand(
        '!lbg close',
        message.author.username,
        'discord',
        true,
        message.guild.id
    );

    return message.reply(result.response || '🛑 Game closed');
}

async function handleBeaconJoin(message) {
    const api = message.client.wildcardAPI;
    if (!api || !api.beaconGame) {
        return message.reply('❌ Beacon game not available');
    }

    // === DAILY LIMIT CHECK ===
    const UserProfileStorage = require('../utils/userProfileStorage');
    const profileStorage = new UserProfileStorage();

    // Check if today is their birthday
    const AnnouncementStorage = require('../utils/announcementStorage');
    const announcementStorage = new AnnouncementStorage();
    const today = new Date();
    const todayBirthdays = announcementStorage.getBirthdaysForDate(message.guild.id, today.getMonth() + 1, today.getDate());
    const isBirthday = todayBirthdays.some(b => b.userId === message.author.id);

    // Check if user is admin
    const isAdmin = message.member.permissions.has('Administrator');

    // Check daily limit
    const dailyCheck = profileStorage.canPlayBeacon(message.guild.id, message.author.id, isBirthday);

    if (!dailyCheck.allowed) {
        const emoji = isBirthday ? '🎂' : '⏰';
        return message.reply(`${emoji} You've used all ${dailyCheck.max} Beacon games for today! Come back tomorrow.`);
    }

    // Build metadata for flair
    const metadata = {
        isBirthday,
        isAdmin,
        badges: []
    };

    // Process the join WITH metadata
    const result = api.beaconGame.processCommand(
        '!lbg join',
        message.author.username,
        'discord',
        false,
        message.guild.id,
        metadata  // Pass flair data
    );

    // If join was successful, record the usage
    if (result.response && !result.response.includes('❌')) {
        profileStorage.recordBeaconGame(message.guild.id, message.author.id, message.author.username);
        const birthdayBonus = isBirthday ? ' 🎂' : '';
        return message.reply(`${result.response} (${dailyCheck.used + 1}/${dailyCheck.max} games today${birthdayBonus})`);
    }

    return message.reply(result.response || '❌ Failed to join');
}

async function handleBeaconLeave(message) {
    const api = message.client.wildcardAPI;
    if (!api || !api.beaconGame) {
        return message.reply('❌ Beacon game not available');
    }

    const result = api.beaconGame.processCommand(
        '!lbg leave',
        message.author.username,
        'discord',
        false,
        message.guild.id
    );

    return message.reply(result.response || '❌ Failed to leave');
}

async function handleBeaconFill(message, subcommand) {
    if (!message.member.permissions.has('Administrator')) {
        return message.reply('❌ Only administrators can use `!lbg fill`');
    }

    const api = message.client.wildcardAPI;
    if (!api || !api.beaconGame) {
        return message.reply('❌ Beacon game not available');
    }

    // Check if beacon is live
    if (!api.beaconGame.isLive()) {
        return message.reply('❌ No game is live. Use `!lbg live` first.');
    }

    const result = api.beaconGame.processCommand(
        '!lbg ' + subcommand,
        message.author.username,
        'discord',
        true,
        message.guild.id
    );

    return message.reply(result.response || '❌ Failed to add bots');
}

async function handleBeaconStart(message) {
    if (!message.member.permissions.has('Administrator')) {
        return message.reply('❌ Only administrators can use `!lbg start`');
    }

    const api = message.client.wildcardAPI;
    if (!api || !api.beaconGame) {
        return message.reply('❌ Beacon game not available');
    }

    const result = api.beaconGame.processCommand(
        '!lbg start',
        message.author.username,
        'discord',
        true,
        message.guild.id
    );

    return message.reply(result.response || '❌ Failed to start game');
}
