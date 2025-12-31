/**
 * WildcardBridge - WebSocket connection between Discord bot and Arena3D
 * Enables real-time player data sync and game result reporting
 */
const WebSocket = require('ws');

class WildcardBridge {
    constructor(server, gameService) {
        this.wss = new WebSocket.Server({ server, path: '/wildcard' });
        this.game = gameService;
        this.arenaConnections = new Map(); // guildId -> WebSocket
        this.pendingResults = new Map(); // guildId -> results awaiting processing

        this.wss.on('connection', (ws, req) => {
            console.log('[WildcardBridge] Arena connected');

            ws.on('message', (data) => this.handleArenaMessage(ws, data));
            ws.on('close', () => this.handleDisconnect(ws));
            ws.on('error', (err) => console.error('[WildcardBridge] Error:', err));

            // Send initial state
            ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Bridge ready' }));
        });

        console.log('[WildcardBridge] WebSocket server initialized on /wildcard');
    }

    /**
     * Register an arena connection for a specific guild
     */
    registerArena(guildId, ws) {
        this.arenaConnections.set(guildId, ws);
        console.log(`[WildcardBridge] Arena registered for guild ${guildId}`);
    }

    /**
     * Send player roster to arena when game starts
     */
    sendPlayers(guildId, players) {
        const ws = this.arenaConnections.get(guildId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn(`[WildcardBridge] No arena connection for guild ${guildId}`);
            return false;
        }

        const payload = {
            type: 'PLAYERS',
            guildId,
            players: players.map(p => ({
                id: p.odiscordId || p.twitchUsername || p.id,
                odiscordId: p.discordId,
                twitchUsername: p.twitchUsername,
                username: p.username,
                platform: p.platform, // 'discord' or 'twitch'
                classKey: p.classKey,
                team: p.team,
                perks: p.perks || []
            }))
        };

        ws.send(JSON.stringify(payload));
        console.log(`[WildcardBridge] Sent ${players.length} players to arena`);
        return true;
    }

    /**
     * Signal arena to start the game
     */
    startGame(guildId) {
        const ws = this.arenaConnections.get(guildId);
        if (!ws || ws.readyState !== WebSocket.OPEN) return false;

        ws.send(JSON.stringify({ type: 'START_GAME', guildId }));
        console.log(`[WildcardBridge] Start game signal sent for guild ${guildId}`);
        return true;
    }

    /**
     * Handle messages from arena
     */
    handleArenaMessage(ws, data) {
        try {
            const msg = JSON.parse(data.toString());
            console.log(`[WildcardBridge] Received: ${msg.type}`);

            switch (msg.type) {
                case 'REGISTER':
                    // Arena registering for a guild
                    this.registerArena(msg.guildId, ws);
                    break;

                case 'TEAM_ELIMINATED':
                    // A team was knocked out
                    this.handleTeamEliminated(msg);
                    break;

                case 'GAME_OVER':
                    // Game finished - winner declared
                    this.handleGameOver(msg);
                    break;

                case 'PLAYER_STATS_UPDATE':
                    // Real-time stat updates (optional)
                    this.handleStatsUpdate(msg);
                    break;

                default:
                    console.log(`[WildcardBridge] Unknown message type: ${msg.type}`);
            }
        } catch (err) {
            console.error('[WildcardBridge] Failed to parse message:', err);
        }
    }

    /**
     * Handle team elimination
     */
    handleTeamEliminated(msg) {
        const { guildId, teamId, placement, players } = msg;

        // Format stats for each player
        const playerStats = players.map(p => ({
            username: p.username,
            odiscordId: p.discordId,
            twitchUsername: p.twitchUsername,
            classKey: p.classKey,
            damage: p.damageDealt || 0,
            kills: p.kills || 0,
            respawns: p.respawns || 0,
            finalBlow: p.finalBlow || 'Ring-out',
            killedBy: p.killedBy || 'Unknown'
        }));

        // Emit event for Discord/Twitch to pick up
        if (this.game && this.game.client) {
            this.game.client.emit('wildcardTeamEliminated', {
                guildId,
                teamId,
                placement,
                players: playerStats
            });
        }

        console.log(`[WildcardBridge] Team ${teamId} eliminated (${placement} place)`);
    }

    /**
     * Handle game over
     */
    handleGameOver(msg) {
        const { guildId, winningTeam, allStats } = msg;

        // Emit event for Discord/Twitch
        if (this.game && this.game.client) {
            this.game.client.emit('wildcardGameOver', {
                guildId,
                winningTeam,
                allStats
            });
        }

        console.log(`[WildcardBridge] Game over - Team ${winningTeam} wins!`);
    }

    /**
     * Handle real-time stats update (optional feature)
     */
    handleStatsUpdate(msg) {
        // Could be used for live HUD updates
        // Not critical for MVP
    }

    /**
     * Handle arena disconnect
     */
    handleDisconnect(ws) {
        // Find and remove this connection
        for (const [guildId, conn] of this.arenaConnections) {
            if (conn === ws) {
                this.arenaConnections.delete(guildId);
                console.log(`[WildcardBridge] Arena disconnected for guild ${guildId}`);
                break;
            }
        }
    }

    /**
     * Broadcast to all connected arenas
     */
    broadcast(message) {
        const payload = JSON.stringify(message);
        for (const [guildId, ws] of this.arenaConnections) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(payload);
            }
        }
    }
}

module.exports = WildcardBridge;
