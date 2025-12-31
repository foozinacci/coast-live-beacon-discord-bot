/**
 * BEACON GAME ENGINE
 * 
 * The "brain" of the game. Processes inputs, runs simulation, maintains state.
 * 
 * This module:
 * - Owns the authoritative game state
 * - Processes commands from Discord/Twitch
 * - Runs the game loop (tick)
 * - Emits state updates via callback
 */

const {
    CLASSES,
    CLASS_KEYS,
    CONSTANTS,
    BOT_NAMES,
    createInitialState,
    createPlayer,
    createBouncePadState,
    createLogEntry,
    getBouncePadFormation
} = require('./state');

class BeaconEngine {
    constructor(onStateUpdate) {
        this.state = createInitialState();
        this.onStateUpdate = onStateUpdate || (() => { });
        this.tickInterval = null;
        this.lastTickTime = Date.now();
        this.nextPlayerId = 0;
        this.nextProjectileId = 0;

        // Class assignment tracking
        this.globalClassCounts = {};
        CLASS_KEYS.forEach(k => this.globalClassCounts[k] = 0);
    }

    // === LIFECYCLE ===

    start() {
        if (this.tickInterval) return;

        this.lastTickTime = Date.now();
        this.tickInterval = setInterval(() => this.tick(), 1000 / 60); // 60 FPS
        console.log('🎮 Beacon Engine started');
    }

    stop() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
        console.log('🎮 Beacon Engine stopped');
    }

    reset() {
        this.state = createInitialState();
        this.nextPlayerId = 0;
        this.nextProjectileId = 0;
        CLASS_KEYS.forEach(k => this.globalClassCounts[k] = 0);
        this.emitState();
    }

    // === MAIN GAME LOOP ===

    tick() {
        const now = Date.now();
        const dt = (now - this.lastTickTime) / 1000; // Delta time in seconds
        this.lastTickTime = now;

        switch (this.state.phase) {
            case 'idle':
                // Nothing to do
                break;

            case 'lobby':
                this.tickLobby(dt);
                break;

            case 'prep':
                this.tickPrep(dt);
                break;

            case 'playing':
                this.tickPlaying(dt);
                break;

            case 'victory':
                this.tickVictory(dt);
                break;
        }

        this.emitState();
    }

    tickLobby(dt) {
        // Countdown when we have minimum players
        if (this.state.players.length >= CONSTANTS.PLAYERS_PER_TEAM * 2) {
            this.state.countdown -= dt;

            if (this.state.countdown <= 0) {
                this.startPrepPhase();
            }
        }
    }

    tickPrep(dt) {
        this.state.prepPhaseTimer -= dt;

        // Animate players from lobby positions to combat positions
        // (The renderer handles visual interpolation)

        if (this.state.prepPhaseTimer <= 0) {
            this.startCombat();
        }
    }

    tickPlaying(dt) {
        // Update ring shrink
        this.updateRing(dt);

        // Update dome
        this.updateDome(dt);

        // Update all players
        this.updatePlayers(dt);

        // Update projectiles
        this.updateProjectiles(dt);

        // Update abilities (recon marks, trails, etc.)
        this.updateAbilities(dt);

        // Check win condition
        this.checkWinCondition();
    }

    tickVictory(dt) {
        // Victory screen countdown handled by state.countdown
        this.state.countdown -= dt;

        if (this.state.countdown <= 0) {
            this.startNewGame();
        }
    }

    // === PHASE TRANSITIONS ===

    startLobby(targetTeams) {
        this.state.phase = 'lobby';
        this.state.targetTeams = targetTeams;
        this.state.targetPlayers = targetTeams * CONSTANTS.PLAYERS_PER_TEAM;
        this.state.countdown = CONSTANTS.COUNTDOWN_TIME;
        this.state.round++;

        // Initialize team class pools
        for (let t = 1; t <= targetTeams; t++) {
            this.state.teamClassPools[t] = [];
        }

        // Create bounce pads in formation
        this.createBouncePads(targetTeams);

        this.addLog(`🎮 Lobby open for ${targetTeams} teams!`, 'system');
        this.emitState();
    }

    startPrepPhase() {
        this.state.phase = 'prep';
        this.state.prepPhaseTimer = CONSTANTS.PREP_PHASE_DURATION;
        this.state.startingPlayerCount = this.state.players.length;
        this.state.startingTeamCount = this.state.targetTeams;

        // Assign combat positions
        this.assignCombatPositions();

        this.addLog(`⚔️ Prepare for combat!`, 'system');
    }

    startCombat() {
        this.state.phase = 'playing';
        this.state.ringTimer = 0;
        this.state.dome.active = true;

        // Give all players spawn protection
        this.state.players.forEach(p => {
            p.spawnProtection = 4;
        });

        this.addLog(`🔥 FIGHT!`, 'system');
    }

    startNewGame() {
        // Reset for next game
        this.state.phase = 'idle';
        this.state.players = [];
        this.state.projectiles = [];
        this.state.soulOrbs = [];
        this.state.reconMarks = [];
        this.state.skirmisherTrails = [];
        this.state.decoys = [];
        this.state.bouncePads = [];
        this.state.eliminationCount = 0;
        this.state.ring.currentRadius = CONSTANTS.RING_START_RADIUS;
        this.state.ring.timer = 0;
        this.state.dome.active = true;
        this.state.dome.popTriggered = false;
        this.state.logEntries = [];

        this.nextPlayerId = 0;
        CLASS_KEYS.forEach(k => this.globalClassCounts[k] = 0);

        this.addLog(`🔄 New game ready`, 'system');
    }

    // === PLAYER MANAGEMENT ===

    addPlayer(username, platform, requestedClass = null, metadata = {}) {
        if (this.state.phase !== 'lobby' && this.state.phase !== 'idle') {
            return { success: false, reason: 'Game in progress' };
        }

        if (this.state.players.length >= CONSTANTS.MAX_PLAYERS) {
            return { success: false, reason: 'Lobby full' };
        }

        // Check if already joined
        if (this.state.players.find(p => p.username.toLowerCase() === username.toLowerCase())) {
            return { success: false, reason: 'Already joined' };
        }

        // If idle, start lobby
        if (this.state.phase === 'idle') {
            // Default to 5 teams if not specified
            this.startLobby(5);
        }

        // Assign team (FIFO)
        const team = this.assignTeam();
        if (!team) {
            return { success: false, reason: 'No team slot available' };
        }

        // Assign class
        const classKey = this.assignClass(team, requestedClass);

        // Create player
        const player = createPlayer(
            this.nextPlayerId++,
            username,
            platform,
            team,
            classKey,
            platform === 'bot'
        );

        // Add metadata/flair
        player.isBirthday = metadata.isBirthday || false;
        player.isAdmin = metadata.isAdmin || false;
        player.badges = metadata.badges || [];

        // Set lobby position
        const lobbyPos = this.calculateLobbyPosition(team, this.state.teamClassPools[team].length);
        player.x = lobbyPos.x;
        player.y = lobbyPos.y;
        player.lobbyPosition = { ...lobbyPos };

        this.state.players.push(player);
        this.state.teamClassPools[team].push(classKey);
        this.globalClassCounts[classKey]++;

        // Update bounce pad color when team is complete
        if (this.state.teamClassPools[team].length === CONSTANTS.PLAYERS_PER_TEAM) {
            this.updateBouncePadColor(team);
        }

        const flairEmojis = [];
        if (player.isBirthday) flairEmojis.push('🎂');
        if (player.isAdmin) flairEmojis.push('👑');
        const flairStr = flairEmojis.length > 0 ? ` ${flairEmojis.join('')}` : '';

        this.addLog(`👋 ${username}${flairStr} joined Team ${team} as ${CLASSES[classKey].name}`, 'info');

        return { success: true, player };
    }

    addBots(count) {
        const added = [];
        const maxToAdd = Math.min(count, CONSTANTS.MAX_PLAYERS - this.state.players.length);

        for (let i = 0; i < maxToAdd; i++) {
            const botName = BOT_NAMES[this.state.players.length % BOT_NAMES.length];
            const result = this.addPlayer(botName, 'bot');
            if (result.success) {
                added.push(result.player);
            }
        }

        return {
            requested: count,
            added: added.length,
            players: added
        };
    }

    removePlayer(username) {
        const index = this.state.players.findIndex(
            p => p.username.toLowerCase() === username.toLowerCase()
        );

        if (index === -1) {
            return { success: false, reason: 'Player not found' };
        }

        const player = this.state.players[index];

        // Remove from class tracking
        const classIndex = this.state.teamClassPools[player.team]?.indexOf(player.classKey);
        if (classIndex !== -1) {
            this.state.teamClassPools[player.team].splice(classIndex, 1);
            this.globalClassCounts[player.classKey]--;
        }

        this.state.players.splice(index, 1);
        this.addLog(`👋 ${username} left`, 'info');

        return { success: true };
    }

    assignTeam() {
        // FIFO: Fill teams evenly
        for (let t = 1; t <= this.state.targetTeams; t++) {
            const teamSize = (this.state.teamClassPools[t] || []).length;
            if (teamSize < CONSTANTS.PLAYERS_PER_TEAM) {
                return t;
            }
        }
        return null;
    }

    assignClass(team, requested = null) {
        const usedOnTeam = this.state.teamClassPools[team] || [];
        const maxPerClass = Math.ceil(CONSTANTS.MAX_PLAYERS / CLASS_KEYS.length);

        // If requested class is available, use it
        if (requested && !usedOnTeam.includes(requested) && this.globalClassCounts[requested] < maxPerClass) {
            return requested;
        }

        // Find available classes
        let available = CLASS_KEYS.filter(c =>
            !usedOnTeam.includes(c) && this.globalClassCounts[c] < maxPerClass
        );

        if (available.length === 0) {
            available = CLASS_KEYS.filter(c => !usedOnTeam.includes(c));
        }

        if (available.length === 0) {
            available = [...CLASS_KEYS];
        }

        // Random from available
        return available[Math.floor(Math.random() * available.length)];
    }

    calculateLobbyPosition(team, slotInTeam) {
        const col = team - 1;
        const row = slotInTeam;
        return {
            x: -(col - 2) * 100,
            y: -100 - row * 80
        };
    }

    assignCombatPositions() {
        // Spread players around the arena
        const playersPerTeam = {};
        this.state.players.forEach(p => {
            if (!playersPerTeam[p.team]) playersPerTeam[p.team] = [];
            playersPerTeam[p.team].push(p);
        });

        const teamCount = Object.keys(playersPerTeam).length;
        let teamIndex = 0;

        for (const [team, teamPlayers] of Object.entries(playersPerTeam)) {
            const baseAngle = (teamIndex / teamCount) * Math.PI * 2 - Math.PI / 2;
            const radius = CONSTANTS.RING_START_RADIUS * 0.6;

            teamPlayers.forEach((p, i) => {
                const angleOffset = (i - 1) * 0.2;
                const angle = baseAngle + angleOffset;
                p.homeX = Math.cos(angle) * radius;
                p.homeY = Math.sin(angle) * radius;
                p.targetX = p.homeX;
                p.targetY = p.homeY;
            });

            teamIndex++;
        }
    }

    // === BOUNCE PADS ===

    createBouncePads(teamCount) {
        this.state.bouncePads = [];
        const formations = getBouncePadFormation(teamCount);

        formations.forEach(f => {
            this.state.bouncePads.push(createBouncePadState(
                f.x,
                f.y,
                f.team,
                0x444444  // Gray until team fills
            ));
        });
    }

    updateBouncePadColor(team) {
        const teamClasses = this.state.teamClassPools[team] || [];
        if (teamClasses.length === 0) return;

        // Blend class colors
        const colors = teamClasses.map(c => CLASSES[c].colorHex);
        const blended = this.blendColors(colors);

        // Update all pads for this team
        this.state.bouncePads
            .filter(p => p.team === team)
            .forEach(p => p.color = blended);
    }

    blendColors(hexColors) {
        if (hexColors.length === 0) return 0x888888;
        if (hexColors.length === 1) return hexColors[0];

        let r = 0, g = 0, b = 0;
        for (const hex of hexColors) {
            r += (hex >> 16) & 0xff;
            g += (hex >> 8) & 0xff;
            b += hex & 0xff;
        }
        r = Math.round(r / hexColors.length);
        g = Math.round(g / hexColors.length);
        b = Math.round(b / hexColors.length);

        return (r << 16) | (g << 8) | b;
    }

    // === GAME UPDATES ===

    updateRing(dt) {
        if (this.state.ring.timer >= CONSTANTS.RING_SHRINK_DURATION) return;

        this.state.ring.timer += dt;
        const progress = Math.min(this.state.ring.timer / CONSTANTS.RING_SHRINK_DURATION, 1);
        const range = CONSTANTS.RING_START_RADIUS - CONSTANTS.RING_MIN_RADIUS;
        this.state.ring.currentRadius = CONSTANTS.RING_START_RADIUS - range * progress;

        // Dome pops at 50% shrink
        if (progress >= 0.5 && !this.state.dome.popTriggered) {
            this.state.dome.popTriggered = true;
            this.state.dome.active = false;
            this.addLog('💥 Dome popped!', 'system');
        }
    }

    updateDome(dt) {
        if (this.state.dome.popTriggered && this.state.dome.popTimer < 0.5) {
            this.state.dome.popTimer += dt;
        }

        // Scale matches ring
        this.state.dome.scale = this.state.ring.currentRadius / CONSTANTS.RING_START_RADIUS;
    }

    updatePlayers(dt) {
        // This is where AI movement, combat, etc. would go
        // For now, just update timers
        this.state.players.forEach(p => {
            if (p.spawnProtection > 0) p.spawnProtection -= dt;
            if (p.attackCooldown > 0) p.attackCooldown -= dt;
            if (p.bleedTimer > 0) p.bleedTimer -= dt;
            // ... other timers
        });
    }

    updateProjectiles(dt) {
        // Move projectiles, check collisions
        this.state.projectiles.forEach(proj => {
            proj.x += proj.vx * dt;
            proj.y += proj.vy * dt;
            proj.z += proj.vz * dt;
            proj.age += dt;
        });

        // Remove old projectiles
        this.state.projectiles = this.state.projectiles.filter(p => p.age < 5);
    }

    updateAbilities(dt) {
        // Update recon marks, trails, etc.
        this.state.reconMarks.forEach(m => {
            if (m.triggered) m.triggerTimer += dt;
        });

        this.state.skirmisherTrails.forEach(t => t.age += dt);
        this.state.skirmisherTrails = this.state.skirmisherTrails.filter(t => t.age < CONSTANTS.TRAIL_LIFETIME);
    }

    checkWinCondition() {
        const aliveTeams = new Set(
            this.state.players.filter(p => p.alive).map(p => p.team)
        );

        if (aliveTeams.size === 1) {
            const winningTeam = [...aliveTeams][0];
            this.state.phase = 'victory';
            this.state.countdown = 8; // Victory screen duration
            this.addLog(`🏆 Team ${winningTeam} wins!`, 'system');
        } else if (aliveTeams.size === 0) {
            // Draw
            this.state.phase = 'victory';
            this.state.countdown = 8;
            this.addLog(`🤝 Draw!`, 'system');
        }
    }

    // === UTILITIES ===

    addLog(text, type = 'info') {
        this.state.logEntries.push(createLogEntry(text, type));

        // Keep log size reasonable
        if (this.state.logEntries.length > 50) {
            this.state.logEntries.shift();
        }
    }

    emitState() {
        // Clone state to prevent external mutation
        const stateCopy = JSON.parse(JSON.stringify(this.state));
        this.onStateUpdate(stateCopy);
    }

    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }
}

module.exports = BeaconEngine;
