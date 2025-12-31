/**
 * BEACON COMMAND HANDLER
 * 
 * Parses !lbg commands from Discord and Twitch.
 * Translates user input into game engine calls.
 */

class BeaconCommands {
    constructor(engine) {
        this.engine = engine;
        this.prefix = '!lbg';
        this.adminUsers = new Set(); // Track admin usernames
        this.isLive = false;         // Game only active when admin runs !lbg live
        this.liveChannel = null;     // Which channel/server is live
    }

    /**
     * Process a command message
     * @param {string} message - The full message text
     * @param {string} username - The sender's username
     * @param {string} platform - 'discord' or 'twitch'
     * @param {boolean} isAdmin - Whether the user has admin permissions
     * @param {string} channelId - The channel/server identifier
     * @param {object} metadata - Optional player metadata (isBirthday, isAdmin badge, etc.)
     * @returns {object} - { handled: boolean, response: string|null }
     */
    process(message, username, platform, isAdmin = false, channelId = null, metadata = {}) {
        const trimmed = message.trim().toLowerCase();

        // Must start with prefix
        if (!trimmed.startsWith(this.prefix)) {
            return { handled: false, response: null };
        }

        // Parse command and args
        const parts = trimmed.slice(this.prefix.length).trim().split(/\s+/);
        const command = parts[0] || '';
        const args = parts.slice(1);

        // Route to handler
        switch (command) {
            case 'live':
                return this.handleLive(username, platform, isAdmin, channelId);

            case 'close':
                return this.handleClose(username, isAdmin);

            case 'join':
                return this.handleJoin(username, platform, args, metadata);

            case 'leave':
                return this.handleLeave(username);

            case 'class':
                return this.handleClass(username, platform, args);

            case 'start':
                return this.handleStart(username, isAdmin);

            case 'stop':
                return this.handleStop(username, isAdmin);

            case 'reset':
                return this.handleReset(username, isAdmin);

            default:
                // Check for fill[X] pattern
                if (command.startsWith('fill')) {
                    return this.handleFill(username, command, isAdmin);
                }

                return { handled: false, response: null };
        }
    }

    // === COMMAND HANDLERS ===

    handleLive(username, platform, isAdmin, channelId) {
        if (!isAdmin) {
            return {
                handled: true,
                response: `❌ Admin only command`
            };
        }

        if (this.isLive) {
            return {
                handled: true,
                response: `⚠️ Game already live! Use !lbg close first.`
            };
        }

        this.isLive = true;
        this.liveChannel = channelId;
        this.engine.reset();
        this.engine.start();

        // Auto-start lobby with 5 teams (adjustable)
        this.engine.startLobby(5);

        return {
            handled: true,
            response: `🎮 BEACON is now LIVE! Type !lbg join to play!`
        };
    }

    handleClose(username, isAdmin) {
        if (!isAdmin) {
            return {
                handled: true,
                response: `❌ Admin only command`
            };
        }

        if (!this.isLive) {
            return {
                handled: true,
                response: `❌ No game is live`
            };
        }

        this.isLive = false;
        this.liveChannel = null;
        this.engine.stop();
        this.engine.reset();

        return {
            handled: true,
            response: `🛑 BEACON closed. Thanks for playing!`
        };
    }

    handleJoin(username, platform, args, metadata = {}) {
        // Must be live to join
        if (!this.isLive) {
            return {
                handled: true,
                response: `❌ No game is active. Ask an admin to run !lbg live`
            };
        }

        // Optional class request: !lbg join assault
        const requestedClass = args[0] || null;

        const result = this.engine.addPlayer(username, platform, requestedClass, metadata);

        if (result.success) {
            const p = result.player;
            const flairIcons = [];
            if (p.isBirthday) flairIcons.push('🎂');
            if (p.isAdmin) flairIcons.push('👑');
            const flairStr = flairIcons.length > 0 ? ` ${flairIcons.join('')}` : '';

            return {
                handled: true,
                response: `✅ ${username}${flairStr} joined Team ${p.team} as ${p.classKey.charAt(0).toUpperCase() + p.classKey.slice(1)}!`
            };
        } else {
            return {
                handled: true,
                response: `❌ ${result.reason}`
            };
        }
    }

    handleLeave(username) {
        const result = this.engine.removePlayer(username);

        if (result.success) {
            return {
                handled: true,
                response: `👋 ${username} left the game`
            };
        } else {
            return {
                handled: true,
                response: `❌ ${result.reason}`
            };
        }
    }

    handleClass(username, platform, args) {
        const requestedClass = args[0]?.toLowerCase();

        if (!requestedClass) {
            return {
                handled: true,
                response: `❓ Usage: !lbg class [assault|recon|controller|support|skirmisher]`
            };
        }

        const validClasses = ['assault', 'recon', 'controller', 'support', 'skirmisher'];
        if (!validClasses.includes(requestedClass)) {
            return {
                handled: true,
                response: `❌ Invalid class. Choose: ${validClasses.join(', ')}`
            };
        }

        // Check if player is already in game
        const existing = this.engine.state.players.find(
            p => p.username.toLowerCase() === username.toLowerCase()
        );

        if (existing) {
            return {
                handled: true,
                response: `❌ Already in game as ${existing.classKey}. Leave and rejoin to change.`
            };
        }

        // Join with requested class
        const result = this.engine.addPlayer(username, platform, requestedClass);

        if (result.success) {
            const p = result.player;
            const gotRequested = p.classKey === requestedClass;
            return {
                handled: true,
                response: gotRequested
                    ? `✅ ${username} joined as ${p.classKey}!`
                    : `⚠️ ${requestedClass} unavailable. ${username} joined as ${p.classKey}`
            };
        } else {
            return {
                handled: true,
                response: `❌ ${result.reason}`
            };
        }
    }

    handleFill(username, command, isAdmin) {
        if (!isAdmin) {
            return {
                handled: true,
                response: `❌ Admin only command`
            };
        }

        // Must be live
        if (!this.isLive) {
            return {
                handled: true,
                response: `❌ No game is live. Use !lbg live first.`
            };
        }

        // Parse number from "fill9", "fill12", etc.
        const numStr = command.slice(4);
        const count = parseInt(numStr, 10);

        if (isNaN(count) || count < 1 || count > 15) {
            return {
                handled: true,
                response: `❌ Usage: !lbg fill[1-15] (e.g., !lbg fill9)`
            };
        }

        const result = this.engine.addBots(count);

        if (result.added === 0) {
            return {
                handled: true,
                response: `❌ Lobby is full (${this.engine.state.players.length}/15)`
            };
        } else if (result.added < result.requested) {
            return {
                handled: true,
                response: `⚠️ Added ${result.added} bots (lobby capped at 15)`
            };
        } else {
            return {
                handled: true,
                response: `✅ Added ${result.added} bots (${this.engine.state.players.length}/15)`
            };
        }
    }

    handleStart(username, isAdmin) {
        if (!isAdmin) {
            return {
                handled: true,
                response: `❌ Admin only command`
            };
        }

        if (this.engine.state.phase !== 'lobby') {
            return {
                handled: true,
                response: `❌ No lobby to start`
            };
        }

        if (this.engine.state.players.length < 6) {
            return {
                handled: true,
                response: `❌ Need at least 6 players (2 full teams)`
            };
        }

        // Force start
        this.engine.state.countdown = 0;

        return {
            handled: true,
            response: `🚀 Game starting!`
        };
    }

    handleStop(username, isAdmin) {
        if (!isAdmin) {
            return {
                handled: true,
                response: `❌ Admin only command`
            };
        }

        if (this.engine.state.phase === 'idle') {
            return {
                handled: true,
                response: `❌ No game in progress`
            };
        }

        this.engine.startNewGame();

        return {
            handled: true,
            response: `🛑 Game stopped`
        };
    }

    handleReset(username, isAdmin) {
        if (!isAdmin) {
            return {
                handled: true,
                response: `❌ Admin only command`
            };
        }

        this.engine.reset();

        return {
            handled: true,
            response: `🔄 Game reset`
        };
    }
}

module.exports = BeaconCommands;
