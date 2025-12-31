/**
 * WILDCARD SPECTATOR API
 * HTTP/WebSocket server for visual game display
 */

const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

// Import Beacon game engine
const { createBeaconGame } = require('../game');

class WildcardAPI {
    constructor(wildcardGame, port = 3000) {
        this.wildcardGame = wildcardGame;
        this.port = port;
        this.app = express();
        this.server = http.createServer(this.app);
        this.gameCodes = new Map(); // code -> guildId

        // WebSocket for real-time lobby updates
        this.wss = new WebSocket.Server({ server: this.server });
        this.lobbyClients = new Map(); // roomCode -> Set of WebSocket clients
        this.lobbyPlayers = new Map(); // roomCode -> Array of players

        // === BEACON GAME ENGINE ===
        this.beaconClients = new Set(); // WebSocket clients connected to beacon
        this.beaconGame = createBeaconGame((state) => {
            // Broadcast state to all beacon clients
            this.broadcastToBeacon({
                type: 'state_update',
                state: state
            });
        });

        this.setupWebSocket();
        this.setupRoutes();
    }

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            console.log('🔌 WebSocket client connected');

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleWSMessage(ws, data);
                } catch (e) {
                    console.error('WebSocket message error:', e);
                }
            });

            ws.on('close', () => {
                // Remove from all rooms
                for (const [code, clients] of this.lobbyClients) {
                    clients.delete(ws);
                }
                // Remove from beacon clients
                this.beaconClients.delete(ws);
            });
        });
    }

    handleWSMessage(ws, data) {
        const { type, roomCode, payload } = data;

        switch (type) {
            case 'join_room':
                // Client (beacon.html) joining a room
                if (!this.lobbyClients.has(roomCode)) {
                    this.lobbyClients.set(roomCode, new Set());
                    this.lobbyPlayers.set(roomCode, []);
                }
                this.lobbyClients.get(roomCode).add(ws);
                ws.roomCode = roomCode;

                // Send current players
                ws.send(JSON.stringify({
                    type: 'players_update',
                    players: this.lobbyPlayers.get(roomCode) || []
                }));
                break;

            case 'join_beacon':
                // Client (beacon.html) connecting to game engine
                console.log('🎮 Beacon client connected');
                this.beaconClients.add(ws);
                ws.isBeaconClient = true;

                // Send current state immediately
                ws.send(JSON.stringify({
                    type: 'full_state',
                    state: this.beaconGame.getState()
                }));
                break;
        }
    }

    // Called from Discord/Twitch command handlers
    addPlayerToLobby(roomCode, username, platform) {
        if (!this.lobbyPlayers.has(roomCode)) {
            this.lobbyPlayers.set(roomCode, []);
        }

        const players = this.lobbyPlayers.get(roomCode);
        if (players.find(p => p.username === username)) return false; // Already joined
        if (players.length >= 9) return false; // Full

        const team = Math.floor(players.length / 3) + 1;
        const classes = ['support', 'controller', 'assault', 'recon', 'skirmisher'];
        const classKey = classes[players.length % 5];

        players.push({ username, platform, team, classKey });

        // Broadcast to all clients in room
        this.broadcastToRoom(roomCode, {
            type: 'player_joined',
            player: { username, platform, team, classKey },
            players: players
        });

        return true;
    }

    startLobbyGame(roomCode) {
        const players = this.lobbyPlayers.get(roomCode);
        if (!players || players.length < 3) return false;

        // Broadcast game start
        this.broadcastToRoom(roomCode, {
            type: 'game_start',
            players: players
        });

        return true;
    }

    broadcastToRoom(roomCode, message) {
        const clients = this.lobbyClients.get(roomCode);
        if (!clients) return;

        const msg = JSON.stringify(message);
        clients.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(msg);
            }
        });
    }

    broadcastToBeacon(message) {
        if (this.beaconClients.size === 0) return;

        const msg = JSON.stringify(message);
        this.beaconClients.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(msg);
            }
        });
    }

    generateGameCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'WC-';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    registerGame(guildId) {
        // Check if guild already has a code
        for (const [code, existingGuildId] of this.gameCodes) {
            if (existingGuildId === guildId) {
                return code;
            }
        }

        // Generate new code
        let code;
        do {
            code = this.generateGameCode();
        } while (this.gameCodes.has(code));

        this.gameCodes.set(code, guildId);
        console.log(`🎮 Spectator code generated: ${code}`);
        return code;
    }

    unregisterGame(guildId) {
        for (const [code, existingGuildId] of this.gameCodes) {
            if (existingGuildId === guildId) {
                this.gameCodes.delete(code);
                console.log(`🎮 Spectator code expired: ${code}`);
                break;
            }
        }
    }

    getGameState(code) {
        const guildId = this.gameCodes.get(code);
        if (!guildId) return null;

        const game = this.wildcardGame.getGame(guildId);
        if (!game) return null;

        // Build spectator-friendly state
        const teams = game.teams.map(team => ({
            id: team.id,
            name: team.name,
            alive: team.alive,
            players: team.players.map(playerId => {
                const player = game.players.get(playerId);
                if (!player) return null;

                const classInfo = this.wildcardGame.getClassInfo(player.classKey);
                return {
                    id: playerId,
                    username: player.username,
                    platform: player.platform,
                    classKey: player.classKey,
                    className: classInfo?.name || 'Unknown',
                    classEmoji: classInfo?.emoji || '❓',
                    hp: player.hp,
                    maxHp: player.maxHp,
                    alive: player.alive,
                    kills: player.kills || 0,
                    damage: player.damage || 0
                };
            }).filter(Boolean)
        }));

        return {
            code,
            state: game.state,
            round: game.round,
            teams,
            totalPlayers: game.players.size,
            perkSelectionActive: game.perkSelectionActive,
            currentPerks: game.currentPerkOptions,
            timestamp: Date.now()
        };
    }

    setupRoutes() {
        // Enable CORS
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });

        // Serve static files from public folder
        this.app.use(express.static(path.join(__dirname, '../public')));

        // API: Get game state by code
        this.app.get('/api/game/:code', (req, res) => {
            const code = req.params.code.toUpperCase();
            const state = this.getGameState(code);

            if (!state) {
                return res.status(404).json({ error: 'Game not found or expired' });
            }

            res.json(state);
        });

        // API: List active game codes (admin only - could add auth)
        this.app.get('/api/games', (req, res) => {
            const games = [];
            for (const [code, guildId] of this.gameCodes) {
                const state = this.getGameState(code);
                if (state) {
                    games.push({
                        code,
                        state: state.state,
                        players: state.totalPlayers,
                        round: state.round
                    });
                }
            }
            res.json(games);
        });

        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({ status: 'ok', uptime: process.uptime() });
        });

        // Serve spectator page (two routes instead of optional param)
        this.app.get('/spectate', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/spectator.html'));
        });

        this.app.get('/spectate/:code', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/spectator.html'));
        });

        // OBS Browser Source - stable URL by Twitch channel name
        // Usage: http://localhost:3005/obs/gsq_zeus
        this.app.get('/obs/:channel', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/obs.html'));
        });

        // Arena view - animated battle visualization
        // Usage: http://localhost:3005/arena or /arena/gsq_zeus
        this.app.get('/arena', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/beacon.html'));
        });

        this.app.get('/arena/:channel', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/beacon.html'));
        });

        // === BEACON (New Architecture) ===
        // Pure renderer that connects to state engine via WebSocket
        // Usage: http://localhost:3005/beacon
        this.app.get('/beacon', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/beacon.html'));
        });

        // API: Get active game code for a Twitch channel
        this.app.get('/api/channel/:channel', (req, res) => {
            const channel = req.params.channel.toLowerCase();

            // Find guild ID linked to this Twitch channel
            const twitchChat = this.wildcardGame?.client?.twitchChat;
            if (!twitchChat) {
                return res.status(503).json({ error: 'Twitch service not available' });
            }

            let guildId = null;
            for (const [ch, gId] of twitchChat.linkedChannels || []) {
                if (ch.toLowerCase().replace('#', '') === channel) {
                    guildId = gId;
                    break;
                }
            }

            if (!guildId) {
                return res.status(404).json({ error: 'Channel not linked to any server' });
            }

            // Find active game code for this guild
            for (const [code, codeGuildId] of this.gameCodes) {
                if (codeGuildId === guildId) {
                    const state = this.getGameState(code);
                    return res.json({
                        code,
                        channel,
                        guildId,
                        hasActiveGame: state?.state === 'in_progress' || state?.state === 'perk_selection',
                        state: state
                    });
                }
            }

            // No active game
            return res.json({
                code: null,
                channel,
                guildId,
                hasActiveGame: false,
                message: 'No active game for this channel'
            });
        });

        // Root redirects to spectator
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/spectator.html'));
        });
    }

    start() {
        const host = '0.0.0.0'; // Required for Railway/cloud hosting
        this.server.listen(this.port, host, () => {
            console.log(`🌐 Wildcard Spectator API running on http://${host}:${this.port}`);
            console.log(`🌐 PORT env: ${process.env.PORT || 'not set (using default)'}`);
        });
    }

    stop() {
        this.server.close();
    }
}

module.exports = WildcardAPI;
