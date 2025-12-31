/**
 * BEACON GAME STATE SCHEMA v1.0
 * 
 * This is the single source of truth for game state.
 * The Game Engine produces this state.
 * The Renderer consumes this state.
 * 
 * State flows ONE direction: Engine → WebSocket → Renderer
 */

// === CLASS DEFINITIONS (Constants) ===
const CLASSES = {
    support: {
        hp: 4500,
        dmg: [120, 150],
        acc: 0.93,
        eva: 0.05,
        exec: 0.00,
        momentum: 10,
        hitbox: 1.00,
        range: 0.30,
        color: '#ffffff',
        colorHex: 0xffffff,
        emoji: '⚪',
        name: 'Support',
        perks: ['secondChance', 'teamAura'],
        teamBonus: { type: 'damageResist', value: 0.05 },
        baseAggression: 0.5,
        role: 'backline',
        damageReduction: 0,
        fireRate: 2.4,
        projectileSpeed: 500,
        weight: 1.2
    },
    recon: {
        hp: 4000,
        dmg: [180, 250],
        acc: 0.91,
        eva: 0.04,
        exec: 0.16,
        momentum: 5,
        hitbox: 1.02,
        range: 1.00,
        color: '#3498db',
        colorHex: 0x3498db,
        emoji: '🔵',
        name: 'Recon',
        perks: ['disrupt', 'precision'],
        teamBonus: { type: 'accuracy', value: 0.05 },
        baseAggression: 0.65,
        role: 'flank',
        damageReduction: 0,
        fireRate: 5.0,
        projectileSpeed: 800,
        weight: 0.8
    },
    controller: {
        hp: 5500,
        dmg: [100, 130],
        acc: 0.80,
        eva: 0.00,
        exec: 0.05,
        momentum: 0,
        hitbox: 1.05,
        range: 0.50,
        color: '#9b59b6',
        colorHex: 0x9b59b6,
        emoji: '🟣',
        name: 'Controller',
        perks: ['suppress', 'anchor', 'parry'],
        teamBonus: { type: 'cooldownReduction', value: 0.05 },
        baseAggression: 0.35,
        role: 'anchor',
        damageReduction: 0.15,
        parryChance: 0.75,
        parryReflect: 0.50,
        fireRate: 3.0,
        projectileSpeed: 450,
        weight: 1.5
    },
    assault: {
        hp: 5000,
        dmg: [140, 180],
        acc: 0.95,
        eva: 0.08,
        exec: 0.22,
        momentum: 30,
        hitbox: 1.08,
        range: 0.50,
        color: '#e74c3c',
        colorHex: 0xe74c3c,
        emoji: '🔴',
        name: 'Assault',
        perks: ['rampage', 'execution'],
        teamBonus: { type: 'damage', value: 0.05 },
        baseAggression: 0.95,
        role: 'frontline',
        damageReduction: 0,
        fireRate: 1.6,
        projectileSpeed: 550,
        weight: 1.0
    },
    skirmisher: {
        hp: 4200,
        dmg: [90, 120],
        acc: 0.87,
        eva: 0.08,
        exec: 0.05,
        momentum: 40,
        hitbox: 1.03,
        range: 0.35,
        color: '#2ecc71',
        colorHex: 0x2ecc71,
        emoji: '🟢',
        name: 'Skirmisher',
        perks: ['bleed', 'counter', 'secondLife'],
        teamBonus: { type: 'momentum', value: 10 },
        baseAggression: 0.75,
        role: 'roam',
        damageReduction: 0,
        fireRate: 1.0,
        projectileSpeed: 600,
        secondLifeHp: 0.30,
        weight: 0.7
    }
};

const CLASS_KEYS = Object.keys(CLASSES);

// === GAME CONSTANTS ===
const CONSTANTS = {
    MAX_PLAYERS: 15,
    PLAYERS_PER_TEAM: 3,
    COUNTDOWN_TIME: 30,
    PREP_PHASE_DURATION: 10,

    // Ring
    RING_START_RADIUS: 400,
    RING_MIN_RADIUS: 80,
    RING_SHRINK_DURATION: 180,

    // Platform
    PLATFORM_HEIGHT: 50,

    // Bounce Pads
    BOUNCE_PAD_RADIUS: 40,
    BOUNCE_PAD_FORCE: 800,
    BOUNCE_PAD_DISTANCE: 180,  // Distance from center

    // Combat
    HP_REGEN_RATE: 50,
    BASE_RESPAWN_TIME: 8,
    RESPAWN_BOOST_PER_ORB: 1,

    // Soul Orbs
    SOUL_ORB_RADIUS: 15,
    SOUL_ORB_SLOW_DURATION: 3,
    SOUL_ORB_SLOW_AMOUNT: 0.5,

    // Skirmisher Trails
    TRAIL_LIFETIME: 3.0,
    TRAIL_WIDTH: 25,
    TRAIL_BOOST: 0.30,

    // Recon Marks
    RECON_MARK_COOLDOWN: 20,
    RECON_MARK_RADIUS: 50,
    RECON_MARK_TRIGGER_DURATION: 4,
    RECON_MARK_BASE_DPS: 80,
    RECON_MARK_DOME_BONUS: 1.3,

    // Decoys
    DECOY_HP: 20,
    FALSE_POSITIVE_COOLDOWN: 15
};

// === BOT NAMES POOL (by class) ===
const BOT_NAMES_BY_CLASS = {
    support: ['inaja', 'egarim', 'nimrak'],
    recon: ['nessy', 'sinacra', 'egatnav'],
    controller: ['citsuac', 'pippy', 'anailil'],
    assault: ['nosyrb', 'eiggam', 'irihan'],
    skirmisher: ['kurrag', 'enatco', 'briebrie']
};

// Flat list for backward compatibility (all bot names)
const BOT_NAMES = Object.values(BOT_NAMES_BY_CLASS).flat();

// === INITIAL STATE FACTORY ===
function createInitialState() {
    return {
        // Phase
        phase: 'idle',  // 'idle' | 'lobby' | 'prep' | 'playing' | 'victory'

        // Timing
        round: 0,
        countdown: CONSTANTS.COUNTDOWN_TIME,
        prepPhaseTimer: CONSTANTS.PREP_PHASE_DURATION,
        ringTimer: 0,

        // Teams
        targetTeams: 0,
        targetPlayers: 0,
        teamClassPools: {},  // { 1: ['assault', 'recon', 'support'], ... }

        // Players
        players: [],

        // Arena
        ring: {
            currentRadius: CONSTANTS.RING_START_RADIUS,
            startRadius: CONSTANTS.RING_START_RADIUS,
            minRadius: CONSTANTS.RING_MIN_RADIUS,
            shrinkDuration: CONSTANTS.RING_SHRINK_DURATION,
            timer: 0
        },
        dome: {
            active: true,
            popTriggered: false,
            popTimer: 0,
            scale: 1.0
        },
        bouncePads: [],

        // Combat
        projectiles: [],
        soulOrbs: [],
        reconMarks: [],
        skirmisherTrails: [],
        decoys: [],

        // Progression
        eliminationCount: 0,
        startingPlayerCount: 0,
        startingTeamCount: 0,
        usedPerks: [],
        currentPerkA: null,
        currentPerkB: null,

        // Log
        logEntries: []
    };
}

// === PLAYER FACTORY ===
function createPlayer(id, username, platform, team, classKey, isBot = false) {
    const config = CLASSES[classKey];

    return {
        id,
        username,
        platform,  // 'discord' | 'twitch' | 'bot'
        team,
        classKey,
        isBot,

        // Position & Movement
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        targetX: 0,
        targetY: 0,
        homeX: 0,
        homeY: 0,
        jumpHeight: 0,
        jumpVelocity: 0,

        // Combat Stats
        hp: config.hp,
        maxHp: config.hp,
        alive: true,
        spawnProtection: 4,
        attackCooldown: 0,

        // Status Effects
        bleedTimer: 0,
        precisionTimer: 0,
        disruptedTimer: 0,
        stunnedTimer: 0,
        suppressedTimer: 0,
        slowTimer: 0,
        slowAmount: 0,

        // Abilities
        hasSecondChance: config.perks.includes('secondChance'),
        hasSecondLife: config.perks.includes('secondLife'),
        secondLifeUsed: false,
        parryTargets: {},
        reconMarkTimer: classKey === 'recon' ? CONSTANTS.RECON_MARK_COOLDOWN : 0,
        falsePositiveCooldown: 0,

        // Respawn
        respawnTimer: 0,
        respawnOrbsCollected: 0,

        // AI Behavior
        cautiousMode: false,
        currentTarget: null,
        anchorPoint: null,

        // Bonuses (from perks)
        accBonus: 0,
        evaBonus: 0,
        dmgBonus: 0,

        // Lobby Position
        lobbyPosition: { x: 0, y: 0 }
    };
}

// === BOUNCE PAD FACTORY ===
function createBouncePadState(x, y, team, color) {
    return {
        x,
        y,
        team,
        color,
        cooldown: 0,
        eliminated: false
    };
}

// === PROJECTILE FACTORY ===
function createProjectileState(id, ownerPlayerId, classKey, x, y, z, vx, vy, vz, damage, target) {
    return {
        id,
        ownerPlayerId,
        classKey,
        x, y, z,
        vx, vy, vz,
        damage,
        target,
        age: 0
    };
}

// === LOG ENTRY FACTORY ===
function createLogEntry(text, type = 'info') {
    return {
        text,
        type,  // 'damage' | 'kill' | 'heal' | 'info' | 'system'
        timestamp: Date.now()
    };
}

// === FORMATION HELPERS ===
function getBouncePadFormation(teamCount) {
    const padRadius = CONSTANTS.BOUNCE_PAD_DISTANCE;
    const formations = [];

    if (teamCount === 2) {
        // Square: 4 pads, alternating teams diagonally
        const positions = [
            { angle: -Math.PI / 4, team: 1 },      // Top-right
            { angle: Math.PI / 4, team: 2 },       // Top-left
            { angle: 3 * Math.PI / 4, team: 1 },   // Bottom-left
            { angle: -3 * Math.PI / 4, team: 2 }   // Bottom-right
        ];
        positions.forEach(pos => {
            formations.push({
                x: Math.cos(pos.angle) * padRadius,
                y: Math.sin(pos.angle) * padRadius,
                team: pos.team
            });
        });
    } else if (teamCount === 3) {
        // Triangle: 3 pads
        for (let i = 0; i < 3; i++) {
            const angle = -Math.PI / 2 + (i / 3) * Math.PI * 2;
            formations.push({
                x: Math.cos(angle) * padRadius,
                y: Math.sin(angle) * padRadius,
                team: i + 1
            });
        }
    } else if (teamCount === 4) {
        // Square: 4 pads, one per team
        for (let i = 0; i < 4; i++) {
            const angle = -Math.PI / 2 + Math.PI / 4 + (i / 4) * Math.PI * 2;
            formations.push({
                x: Math.cos(angle) * padRadius,
                y: Math.sin(angle) * padRadius,
                team: i + 1
            });
        }
    } else if (teamCount === 5) {
        // Pentagram: 5 pads
        for (let i = 0; i < 5; i++) {
            const angle = -Math.PI / 2 + (i / 5) * Math.PI * 2;
            formations.push({
                x: Math.cos(angle) * padRadius,
                y: Math.sin(angle) * padRadius,
                team: i + 1
            });
        }
    }

    return formations;
}

// === EXPORTS ===
module.exports = {
    CLASSES,
    CLASS_KEYS,
    CONSTANTS,
    BOT_NAMES,
    BOT_NAMES_BY_CLASS,
    createInitialState,
    createPlayer,
    createBouncePadState,
    createProjectileState,
    createLogEntry,
    getBouncePadFormation
};
