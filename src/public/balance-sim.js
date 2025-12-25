/**
 * WILDCARD Balance Simulation
 * Headless game simulation for balance testing
 * Run with: node balance-sim.js [teams] [simulations]
 * Example: node balance-sim.js 5 1000
 */

// === CONFIGURATION ===
const TEAM_COUNT = parseInt(process.argv[2]) || 5;
const SIM_COUNT = parseInt(process.argv[3]) || 1000;
const PLAYERS_PER_TEAM = 3;
const R = 900;
const DT = 0.05; // Simulation timestep (50ms)
const MAX_TICKS = 2000; // Max ~100 seconds per game

// === PENTAGRAM COUNTER SYSTEM ===
const COUNTERS = {
    support: { counters: ['controller', 'recon'], counteredBy: ['skirmisher', 'assault'] },
    recon: { counters: ['controller', 'skirmisher'], counteredBy: ['support', 'assault'] },
    controller: { counters: ['assault', 'skirmisher'], counteredBy: ['support', 'recon'] },
    assault: { counters: ['support', 'recon'], counteredBy: ['controller', 'skirmisher'] },
    skirmisher: { counters: ['support', 'assault'], counteredBy: ['controller', 'recon'] }
};

// === CLASS STATS (v2.0 BALANCED) ===
const CLASSES = {
    support: {
        // BUFFED: +3% evasion (5→8%) to survive being target #1
        hp: 88, dmg: [35, 38], acc: 0.93, eva: 0.08, exec: 0.00, momentum: 10,
        hitbox: 1.00, range: 0.30, name: 'Support', perks: ['secondChance', 'teamAura'],
        baseAggression: 0.5, // CHANGED: More cautious, avoids frontline
        damageReduction: 0
    },
    recon: {
        // NERFED: Accuracy 91→87%, Range 1.0→0.80
        hp: 87, dmg: [35, 38], acc: 0.87, eva: 0.04, exec: 0.16, momentum: 5,
        hitbox: 1.02, range: 0.80, name: 'Recon', perks: ['disrupt', 'precision'],
        baseAggression: 0.65, // CHANGED: More flanking, less camping
        damageReduction: 0
    },
    controller: {
        // BUFFED: HP 67→85, Range 0.38→0.50, +15% damage reduction
        hp: 85, dmg: [35, 37], acc: 0.80, eva: 0.00, exec: 0.05, momentum: 0,
        hitbox: 1.05, range: 0.50, name: 'Controller', perks: ['suppress', 'anchor'],
        baseAggression: 0.35, // CHANGED: Area dominance over seek-kill
        damageReduction: 0.15 // NEW: 15% damage reduction (teamwide durability role)
    },
    assault: {
        hp: 89, dmg: [35, 40], acc: 0.95, eva: 0.08, exec: 0.22, momentum: 30,
        hitbox: 1.08, range: 0.50, name: 'Assault', perks: ['rampage', 'execution'],
        baseAggression: 0.95,
        damageReduction: 0
    },
    skirmisher: {
        // BUFFED: Range 0.22→0.35, Damage floor raised (35→40, ceiling 50→48)
        hp: 83, dmg: [40, 48], acc: 0.87, eva: 0.08, exec: 0.05, momentum: 40,
        hitbox: 1.03, range: 0.35, name: 'Skirmisher', perks: ['bleed', 'counter'],
        baseAggression: 0.75, // CHANGED: More kiting, less blind chase
        damageReduction: 0
    }
};
const classKeys = Object.keys(CLASSES);

// === STATISTICS TRACKING ===
const stats = {
    teamWins: {},           // Team position -> wins
    classKills: {},         // Class -> total kills
    classDeaths: {},        // Class -> total deaths
    classSurvivalRate: {},  // Class -> games survived / games played
    classGamesPlayed: {},   // Class -> times played
    classDamageDealt: {},   // Class -> total damage
    classDamageTaken: {},   // Class -> total damage taken
    secondChanceProcs: 0,   // Times Second Chance triggered
    executionProcs: 0,      // Times Execution triggered
    disruptStuns: 0,        // Times Disrupt stunned
    counterBonusDmg: 0,     // Bonus damage from Counter perk
    matchupWins: {},        // "attacker_vs_defender" -> wins for attacker
    gameDurations: [],      // Ticks per game
    draws: 0,               // Games that timed out
};

// Initialize stats
for (const cls of classKeys) {
    stats.classKills[cls] = 0;
    stats.classDeaths[cls] = 0;
    stats.classSurvivalRate[cls] = 0;
    stats.classGamesPlayed[cls] = 0;
    stats.classDamageDealt[cls] = 0;
    stats.classDamageTaken[cls] = 0;
}
for (let t = 1; t <= TEAM_COUNT; t++) {
    stats.teamWins[t] = 0;
}

// === UTILITY ===
function dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
function rand(min, max) { return min + Math.random() * (max - min); }

// === SIMULATION CORE ===
function createPlayers(teamCount) {
    const players = [];

    // FIXED: Random spawn rotation to eliminate position advantage
    const randomRotation = Math.random() * Math.PI * 2;

    // Shuffle helper
    const shuffleArray = (arr) => {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    // CLASS DISTRIBUTION RULES:
    // 1. No class appears twice on same team (3 unique per team)
    // 2. No class appears more than 3 times across all teams

    // For 5 teams (15 players): each class appears exactly 3 times
    // For 4 teams (12 players): some classes appear 2x, some 3x
    // For 3 teams (9 players): some classes appear 1x, some 2x

    // Create global class pool (each class can be picked max 3 times)
    const globalClassPool = {};
    classKeys.forEach(c => globalClassPool[c] = 0);
    const maxPerClass = 3;

    // Generate team compositions ensuring unique per team
    const teamCompositions = [];

    for (let t = 0; t < teamCount; t++) {
        // Get available classes (not at max) shuffled
        const available = shuffleArray(classKeys.filter(c => globalClassPool[c] < maxPerClass));

        // Pick 3 unique classes for this team (or fill with random if not enough)
        const teamClasses = [];
        const usedThisTeam = new Set();

        for (let i = 0; i < PLAYERS_PER_TEAM; i++) {
            // Try to get from available pool first
            const pick = available.find(c => !usedThisTeam.has(c));
            if (pick) {
                teamClasses.push(pick);
                usedThisTeam.add(pick);
                globalClassPool[pick]++;
            } else {
                // Fallback: pick any class not already on this team
                const fallback = shuffleArray(classKeys).find(c => !usedThisTeam.has(c)) || classKeys[0];
                teamClasses.push(fallback);
                usedThisTeam.add(fallback);
            }
        }

        teamCompositions.push(teamClasses);
    }

    for (let t = 0; t < teamCount; t++) {
        // Apply random rotation to spawn angle
        const angle = randomRotation + (t / teamCount) * Math.PI * 2;
        const baseX = Math.cos(angle) * 400;
        const baseY = Math.sin(angle) * 400;

        const teamClasses = teamCompositions[t];

        for (let p = 0; p < PLAYERS_PER_TEAM; p++) {
            const classKey = teamClasses[p] || classKeys[p % classKeys.length];
            const config = CLASSES[classKey];
            players.push({
                id: players.length,
                team: t + 1,
                classKey,
                config,
                hp: config.hp,
                maxHp: config.hp,
                x: baseX + (Math.random() - 0.5) * 60,
                y: baseY + (Math.random() - 0.5) * 60,
                vx: 0, vy: 0,
                targetX: baseX, targetY: baseY,
                alive: true,
                attackCooldown: 0,
                spawnProtection: 2,
                hasSecondChance: config.perks.includes('secondChance'),
                bleedTimer: 0,
                precisionTimer: 0,
                stunnedTimer: 0,
                suppressedTimer: 0,
                kills: 0,
                damageDealt: 0,
                damageTaken: 0
            });
        }
    }
    return players;
}

function selectTarget(p, enemies) {
    if (enemies.length === 0) return null;
    const counters = COUNTERS[p.classKey].counters;

    // Prioritize low HP enemies
    const lowHp = enemies.filter(e => e.hp / e.maxHp < 0.35);
    if (lowHp.length > 0) {
        const counterLow = lowHp.filter(e => counters.includes(e.classKey));
        if (counterLow.length > 0) return counterLow[0];
        return lowHp[0];
    }

    // Prioritize counter targets
    const counterTargets = enemies.filter(e => counters.includes(e.classKey));
    if (counterTargets.length > 0) return counterTargets[0];

    // Nearest enemy
    return enemies.sort((a, b) => dist(p, a) - dist(p, b))[0];
}

function simulateTick(players, projectiles) {
    const dt = DT;

    // AI Update
    players.filter(p => p.alive).forEach(p => {
        if (p.stunnedTimer > 0) return;

        const enemies = players.filter(e => e.alive && e.team !== p.team);
        if (enemies.length === 0) return;

        const target = selectTarget(p, enemies);
        if (!target) return;

        // Movement - class-based approach
        const angleToTarget = Math.atan2(target.y - p.y, target.x - p.x);
        const distToTarget = dist(p, target);
        const maxRange = R * p.config.range;

        let idealDist = maxRange * 0.6;
        if (p.classKey === 'assault') idealDist = 50;
        if (p.classKey === 'controller') idealDist = maxRange * 0.8;

        if (distToTarget > idealDist) {
            p.targetX = target.x;
            p.targetY = target.y;
        } else {
            p.targetX = p.x + Math.cos(Date.now() * 0.001 + p.id) * 30;
            p.targetY = p.y + Math.sin(Date.now() * 0.001 + p.id) * 30;
        }

        // Attack
        if (p.attackCooldown <= 0 && distToTarget < maxRange && p.spawnProtection <= 0) {
            // Create projectile (instant hit for simplicity)
            const acc = p.config.acc;
            if (Math.random() < acc) {
                // Evasion check
                let eva = target.config.eva;
                if (target.precisionTimer > 0) eva += 0.04;

                if (Math.random() >= eva) {
                    // Damage calculation
                    let dmg = rand(p.config.dmg[0], p.config.dmg[1]);

                    // Range falloff
                    const falloffStart = maxRange * 0.7;
                    if (distToTarget > falloffStart) {
                        dmg *= 1.0 - 0.5 * ((distToTarget - falloffStart) / (maxRange - falloffStart));
                    }

                    // Rampage (Assault)
                    if (p.classKey === 'assault') {
                        dmg *= 1 + 0.30 * (p.config.momentum / 40);
                    }

                    // Execution (Assault)
                    if (p.classKey === 'assault' && target.hp / target.maxHp < 0.20 && Math.random() < 0.22) {
                        dmg = target.hp + 1;
                        stats.executionProcs++;
                    }

                    // Counter (Skirmisher vs high acc)
                    if (p.classKey === 'skirmisher' && target.config.acc >= 0.90) {
                        const bonus = dmg * 0.30;
                        dmg += bonus;
                        stats.counterBonusDmg += bonus;
                    }

                    // Suppress (Controller)
                    if (target.classKey === 'controller') {
                        p.suppressedTimer = 3;
                    }

                    // Disrupt (Recon stun)
                    if (p.classKey === 'recon' && target.config.exec < 0.10 && target.classKey !== 'controller') {
                        if (Math.random() < 0.25) {
                            target.stunnedTimer = 0.5;
                            stats.disruptStuns++;
                        }
                    }

                    // Bleed (Skirmisher)
                    if (p.classKey === 'skirmisher') {
                        target.bleedTimer = 5;
                    }

                    // Precision (Recon)
                    if (p.classKey === 'recon') {
                        p.precisionTimer = 2;
                    }

                    // Apply damage reduction (Controller has 15%)
                    dmg *= (1 - (target.config.damageReduction || 0));

                    // Apply damage
                    target.hp -= dmg;
                    target.damageTaken += dmg;
                    p.damageDealt += dmg;

                    // Track matchup
                    const matchupKey = `${p.classKey}_vs_${target.classKey}`;
                    if (!stats.matchupWins[matchupKey]) stats.matchupWins[matchupKey] = { hits: 0, kills: 0 };
                    stats.matchupWins[matchupKey].hits++;

                    // Death check
                    if (target.hp <= 0) {
                        // Second Chance
                        if (target.hasSecondChance && target.classKey === 'support') {
                            if (Math.random() >= p.config.exec) {
                                target.hp = target.maxHp * 0.5;
                                target.hasSecondChance = false;
                                target.spawnProtection = 2;
                                stats.secondChanceProcs++;
                            } else {
                                target.alive = false;
                                p.kills++;
                                stats.matchupWins[matchupKey].kills++;
                            }
                        } else {
                            target.alive = false;
                            p.kills++;
                            stats.matchupWins[matchupKey].kills++;
                        }
                    }
                }
            }
            p.attackCooldown = 0.4;
        }
    });

    // Physics
    players.filter(p => p.alive).forEach(p => {
        const dx = p.targetX - p.x, dy = p.targetY - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);

        const speedMult = { assault: 1.4, skirmisher: 1.35, recon: 1.2, support: 1.1, controller: 0.6 }[p.classKey] || 1.0;
        const suppressMult = p.suppressedTimer > 0 ? 0.5 : 1.0;

        if (d > 2) {
            const speed = 800 * speedMult * suppressMult;
            p.vx += (dx / d) * speed * dt;
            p.vy += (dy / d) * speed * dt;
        }

        p.vx *= 0.95;
        p.vy *= 0.95;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Bounds
        const bound = 560;
        if (Math.abs(p.x) > bound) { p.x = Math.sign(p.x) * bound; p.vx *= -0.5; }
        if (Math.abs(p.y) > bound) { p.y = Math.sign(p.y) * bound; p.vy *= -0.5; }

        // Timers
        if (p.attackCooldown > 0) p.attackCooldown -= dt;
        if (p.spawnProtection > 0) p.spawnProtection -= dt;
        if (p.bleedTimer > 0) p.bleedTimer -= dt;
        if (p.precisionTimer > 0) p.precisionTimer -= dt;
        if (p.stunnedTimer > 0) p.stunnedTimer -= dt;
        if (p.suppressedTimer > 0) p.suppressedTimer -= dt;
    });
}

function runGame(teamCount) {
    const players = createPlayers(teamCount);
    let ticks = 0;

    // Track class participation
    for (const p of players) {
        stats.classGamesPlayed[p.classKey]++;
    }

    while (ticks < MAX_TICKS) {
        simulateTick(players, []);
        ticks++;

        const aliveTeams = [...new Set(players.filter(p => p.alive).map(p => p.team))];
        if (aliveTeams.length <= 1) {
            break;
        }
    }

    const aliveTeams = [...new Set(players.filter(p => p.alive).map(p => p.team))];

    // Record results
    stats.gameDurations.push(ticks);

    if (aliveTeams.length === 1) {
        stats.teamWins[aliveTeams[0]]++;
    } else {
        stats.draws++;
    }

    // Class stats
    for (const p of players) {
        stats.classKills[p.classKey] += p.kills;
        stats.classDamageDealt[p.classKey] += p.damageDealt;
        stats.classDamageTaken[p.classKey] += p.damageTaken;
        if (!p.alive) {
            stats.classDeaths[p.classKey]++;
        } else {
            stats.classSurvivalRate[p.classKey]++;
        }
    }

    return aliveTeams.length === 1 ? aliveTeams[0] : 0;
}

// === RUN SIMULATIONS ===
console.log(`\n🎮 WILDCARD BALANCE SIMULATION`);
console.log(`================================`);
console.log(`Teams: ${TEAM_COUNT} | Players per team: ${PLAYERS_PER_TEAM} | Total: ${TEAM_COUNT * PLAYERS_PER_TEAM}`);
console.log(`Simulations: ${SIM_COUNT.toLocaleString()}`);
console.log(`Running...\n`);

const startTime = Date.now();

for (let i = 0; i < SIM_COUNT; i++) {
    runGame(TEAM_COUNT);
    if (i % 100 === 0) process.stdout.write(`\rProgress: ${Math.floor(i / SIM_COUNT * 100)}%`);
}

process.stdout.write(`\rProgress: 100%\n`);
const elapsed = (Date.now() - startTime) / 1000;

// === PRINT RESULTS ===
console.log(`\n⏱️  Completed in ${elapsed.toFixed(2)}s (${(SIM_COUNT / elapsed).toFixed(0)} games/sec)\n`);

console.log(`📊 TEAM WIN RATES (by spawn position)`);
console.log(`─────────────────────────────────────`);
for (let t = 1; t <= TEAM_COUNT; t++) {
    const winRate = (stats.teamWins[t] / SIM_COUNT * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(winRate / 2));
    console.log(`  Team ${t}: ${winRate}% ${bar}`);
}
console.log(`  Draws: ${(stats.draws / SIM_COUNT * 100).toFixed(1)}%\n`);

console.log(`⚔️  CLASS PERFORMANCE`);
console.log(`─────────────────────────────────────`);
console.log(`  Class       | K/D Ratio | Survive | Dmg Dealt | Dmg Taken`);
console.log(`  ------------|-----------|---------|-----------|----------`);
for (const cls of classKeys) {
    const kd = stats.classDeaths[cls] > 0
        ? (stats.classKills[cls] / stats.classDeaths[cls]).toFixed(2)
        : stats.classKills[cls].toFixed(0);
    const survRate = (stats.classSurvivalRate[cls] / stats.classGamesPlayed[cls] * 100).toFixed(1);
    const avgDmgDealt = (stats.classDamageDealt[cls] / stats.classGamesPlayed[cls]).toFixed(0);
    const avgDmgTaken = (stats.classDamageTaken[cls] / stats.classGamesPlayed[cls]).toFixed(0);
    console.log(`  ${cls.padEnd(11)} | ${kd.padStart(9)} | ${survRate.padStart(6)}% | ${avgDmgDealt.padStart(9)} | ${avgDmgTaken.padStart(9)}`);
}

console.log(`\n🎯 PERK PROCS (per ${SIM_COUNT} games)`);
console.log(`─────────────────────────────────────`);
console.log(`  Second Chance: ${stats.secondChanceProcs} (${(stats.secondChanceProcs / SIM_COUNT).toFixed(2)}/game)`);
console.log(`  Execution:     ${stats.executionProcs} (${(stats.executionProcs / SIM_COUNT).toFixed(2)}/game)`);
console.log(`  Disrupt Stun:  ${stats.disruptStuns} (${(stats.disruptStuns / SIM_COUNT).toFixed(2)}/game)`);
console.log(`  Counter Bonus: ${Math.round(stats.counterBonusDmg)} total dmg`);

console.log(`\n🔄 COUNTER MATCHUP VALIDATION`);
console.log(`─────────────────────────────────────`);
console.log(`  Expected: Each class should deal more damage to countered targets`);
console.log(`  Matchup (Attacker → Defender) | Hits | Kills | Kill Rate`);
console.log(`  -----------------------------|------|-------|----------`);

// Sort matchups by kill rate
const matchupEntries = Object.entries(stats.matchupWins)
    .filter(([k, v]) => v.hits > 100)
    .sort((a, b) => b[1].kills / b[1].hits - a[1].kills / a[1].hits);

for (const [matchup, data] of matchupEntries.slice(0, 15)) {
    const [attacker, defender] = matchup.split('_vs_');
    const isCounter = COUNTERS[attacker]?.counters.includes(defender);
    const killRate = (data.kills / data.hits * 100).toFixed(1);
    const marker = isCounter ? '✓' : ' ';
    console.log(`  ${marker} ${attacker.padEnd(10)} → ${defender.padEnd(10)} | ${data.hits.toString().padStart(4)} | ${data.kills.toString().padStart(5)} | ${killRate.padStart(6)}%`);
}

console.log(`\n⏰ GAME DURATION`);
console.log(`─────────────────────────────────────`);
const avgDuration = stats.gameDurations.reduce((a, b) => a + b, 0) / stats.gameDurations.length;
const durationSec = avgDuration * DT;
console.log(`  Average: ${durationSec.toFixed(1)}s (${Math.round(avgDuration)} ticks)`);
console.log(`  Shortest: ${(Math.min(...stats.gameDurations) * DT).toFixed(1)}s`);
console.log(`  Longest: ${(Math.max(...stats.gameDurations) * DT).toFixed(1)}s`);

console.log(`\n✅ BALANCE HEALTH CHECKS`);
console.log(`─────────────────────────────────────`);

// Check 1: Team position fairness (should be ~20% each for 5 teams)
const expectedWinRate = 100 / TEAM_COUNT;
const maxDeviation = Math.max(...Object.values(stats.teamWins).map(w => Math.abs(w / SIM_COUNT * 100 - expectedWinRate)));
const positionFair = maxDeviation < 5;
console.log(`  Team Position Balance: ${positionFair ? '✅ PASS' : '⚠️  WARNING'} (max deviation: ${maxDeviation.toFixed(1)}%)`);

// Check 2: K/D ratios should be somewhat balanced
const kdRatios = classKeys.map(cls => stats.classDeaths[cls] > 0 ? stats.classKills[cls] / stats.classDeaths[cls] : 1);
const kdSpread = Math.max(...kdRatios) - Math.min(...kdRatios);
const kdBalanced = kdSpread < 0.8;
console.log(`  Class K/D Balance: ${kdBalanced ? '✅ PASS' : '⚠️  WARNING'} (spread: ${kdSpread.toFixed(2)})`);

// Check 3: Counter system working
let counterSystemWorking = true;
for (const cls of classKeys) {
    for (const countered of COUNTERS[cls].counters) {
        const key = `${cls}_vs_${countered}`;
        const reverseKey = `${countered}_vs_${cls}`;
        if (stats.matchupWins[key] && stats.matchupWins[reverseKey]) {
            const ourKillRate = stats.matchupWins[key].kills / stats.matchupWins[key].hits;
            const theirKillRate = stats.matchupWins[reverseKey].kills / stats.matchupWins[reverseKey].hits;
            if (ourKillRate < theirKillRate) {
                counterSystemWorking = false;
            }
        }
    }
}
console.log(`  Counter System: ${counterSystemWorking ? '✅ PASS' : '⚠️  WARNING'}`);

// Check 4: No class dominance
const maxSurvival = Math.max(...classKeys.map(cls => stats.classSurvivalRate[cls] / stats.classGamesPlayed[cls]));
const minSurvival = Math.min(...classKeys.map(cls => stats.classSurvivalRate[cls] / stats.classGamesPlayed[cls]));
const survivalSpread = maxSurvival - minSurvival;
const noDominance = survivalSpread < 0.3;
console.log(`  No Class Dominance: ${noDominance ? '✅ PASS' : '⚠️  WARNING'} (survival spread: ${(survivalSpread * 100).toFixed(1)}%)`);

console.log(`\n`);
