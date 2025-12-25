/**
 * Wildcard Combat Simulation - Balance Testing
 * Run: node src/test/wildcardSimulation.js
 */

// Class definitions
// hitbox: 1.0 = normal, >1.0 = easier to hit, <1.0 = harder to hit
const CLASSES = {
    support: { name: 'Support', emoji: '⚪', hp: 88, accuracy: 0.93, evasion: 0.05, execute: 0.00, momentum: 10, hitbox: 1.00 },
    controller: { name: 'Controller', emoji: '🟣', hp: 67, accuracy: 0.80, evasion: 0.00, execute: 0.05, momentum: 0, hitbox: 1.05 },
    assault: { name: 'Assault', emoji: '🔴', hp: 89, accuracy: 0.95, evasion: 0.08, execute: 0.22, momentum: 30, hitbox: 1.08 },
    recon: { name: 'Recon', emoji: '🔵', hp: 87, accuracy: 0.91, evasion: 0.04, execute: 0.16, momentum: 5, hitbox: 1.02 },
    skirmisher: { name: 'Skirmisher', emoji: '🟢', hp: 83, accuracy: 0.87, evasion: 0.08, execute: 0.05, momentum: 40, hitbox: 1.03 }
};

const BASE_DAMAGE = 35;
const CLASS_KEYS = Object.keys(CLASSES);

// Pentagon relationships: each class counters 2 allies and is countered by 2 enemies
// Support > Controller > Assault > Recon > Skirmisher > Support (and skip-one relationships)
const PENTAGON = {
    support: { allies: ['controller', 'recon'], enemies: ['skirmisher', 'assault'] },
    controller: { allies: ['assault', 'skirmisher'], enemies: ['support', 'recon'] },
    assault: { allies: ['recon', 'support'], enemies: ['controller', 'skirmisher'] },
    recon: { allies: ['skirmisher', 'controller'], enemies: ['assault', 'support'] },
    skirmisher: { allies: ['support', 'assault'], enemies: ['recon', 'controller'] }
};

// Calculate team-up bonus based on teammates
// Anchored (50%): computed from initial team composition at match start
// Live (50%): computed from currently living teammates
// Each ally gives bonus damage, each enemy gives bonus defense
function calculateTeamUpBonus(player, players) {
    const pentagon = PENTAGON[player.classKey];

    // Anchored: all teammates (alive or dead)
    const anchoredTeammates = players.filter(p => p.teamId === player.teamId && p.id !== player.id);
    let anchoredAllyCount = 0;
    let anchoredEnemyCount = 0;
    anchoredTeammates.forEach(teammate => {
        if (pentagon.allies.includes(teammate.classKey)) anchoredAllyCount++;
        if (pentagon.enemies.includes(teammate.classKey)) anchoredEnemyCount++;
    });

    // Live: only living teammates
    const liveTeammates = anchoredTeammates.filter(p => p.alive);
    let liveAllyCount = 0;
    let liveEnemyCount = 0;
    liveTeammates.forEach(teammate => {
        if (pentagon.allies.includes(teammate.classKey)) liveAllyCount++;
        if (pentagon.enemies.includes(teammate.classKey)) liveEnemyCount++;
    });

    // Each ally gives +7% damage, each enemy gives +7% defense
    // Split 50% anchored + 50% live
    const anchoredDamage = anchoredAllyCount * 0.07 * 0.5;
    const anchoredDefense = anchoredEnemyCount * 0.07 * 0.5;
    const liveDamage = liveAllyCount * 0.07 * 0.5;
    const liveDefense = liveEnemyCount * 0.07 * 0.5;

    return {
        damageBonus: anchoredDamage + liveDamage,      // 0-12% damage (6% max anchored + 6% max live)
        defenseBonus: anchoredDefense + liveDefense    // 0-12% defense
    };
}

// Global matchup tracker: kills[attacker][victim] = count
const matchupKills = {};
CLASS_KEYS.forEach(a => {
    matchupKills[a] = {};
    CLASS_KEYS.forEach(v => matchupKills[a][v] = 0);
});

// Second Chance tracking
const secondChanceStats = {
    clutchWins: 0,      // Respawn used, team won
    usedButLost: 0,     // Respawn used, team lost
    notUsed: 0,         // Respawn not triggered (Support died first or not needed)
    totalGamesWithSupport: 0
};

// Health scaling based on living players
function getHealthScale(livingPlayers, maxPlayers, isSkirmisher = false) {
    // Skirmisher scales less (0.20 instead of 0.40) to hit berserker faster
    const scaleFactor = isSkirmisher ? 0.20 : 0.40;
    return 1.00 + scaleFactor * (livingPlayers - 1) / (maxPlayers - 1);
}

// Generate team compositions with RANDOM class assignments
// Constraints:
// - Max 1 of each class per team (3 unique classes per team)
// - Max 3 of the same class across all teams in the lobby
// - 3-team mode: Support and Skirmisher cannot be on the same team (too strong together)
function generateRandomCompositions(numTeams) {
    const allClasses = CLASS_KEYS;

    // Track global class counts (max 3 across all teams)
    const globalClassCount = {};
    allClasses.forEach(c => globalClassCount[c] = 0);

    // Build compositions per team
    const compositions = Array.from({ length: numTeams }, () => []);

    for (let teamIndex = 0; teamIndex < numTeams; teamIndex++) {
        // Track which classes are used on this team (max 1 each)
        const usedOnTeam = new Set();

        for (let slot = 0; slot < 3; slot++) {
            // Find available classes for this slot
            let available = allClasses.filter(c =>
                !usedOnTeam.has(c) &&      // Not already on this team
                globalClassCount[c] < 3    // Max 3 globally
            );

            // 3-team mode: prevent Support+Skirmisher combo
            if (numTeams === 3) {
                if (usedOnTeam.has('support')) {
                    available = available.filter(c => c !== 'skirmisher');
                }
                if (usedOnTeam.has('skirmisher')) {
                    available = available.filter(c => c !== 'support');
                }
            }

            if (available.length === 0) {
                // Fallback: allow any class not on team if constraints too tight
                let fallback = allClasses.filter(c => !usedOnTeam.has(c));
                // Still enforce Support+Skirmisher ban in 3-team
                if (numTeams === 3) {
                    if (usedOnTeam.has('support')) fallback = fallback.filter(c => c !== 'skirmisher');
                    if (usedOnTeam.has('skirmisher')) fallback = fallback.filter(c => c !== 'support');
                }
                const classKey = fallback[Math.floor(Math.random() * fallback.length)] || allClasses[Math.floor(Math.random() * allClasses.length)];
                compositions[teamIndex].push(classKey);
                usedOnTeam.add(classKey);
                globalClassCount[classKey]++;
            } else {
                const classKey = available[Math.floor(Math.random() * available.length)];
                compositions[teamIndex].push(classKey);
                usedOnTeam.add(classKey);
                globalClassCount[classKey]++;
            }
        }
    }

    return compositions;
}

// Legacy fixed composition generator (kept for reference)
function generateFixedCompositions(numTeams) {
    let numPlayers, positionToTeam, fixedClasses;

    if (numTeams === 3) {
        numPlayers = 9;
        positionToTeam = [0, 1, 2, 0, 1, 2, 0, 1, 2]; // 123123123
        fixedClasses = {
            2: 'skirmisher', // Team 2
            4: 'controller', // Team 1
            5: 'support',    // Team 2
            8: 'controller'  // Team 2
        };
    } else if (numTeams === 4) {
        numPlayers = 12;
        positionToTeam = [0, 1, 2, 0, 1, 2, 0, 1, 2, 3, 3, 3]; // 123123123444
        fixedClasses = {
            2: 'skirmisher', // Team 2
            4: 'controller', // Team 1
            5: 'support',    // Team 2
            8: 'controller', // Team 2
            10: 'support'    // Team 4
        };
    } else {
        numPlayers = 15;
        positionToTeam = [0, 1, 2, 0, 1, 2, 0, 1, 2, 3, 4, 3, 4, 3, 4]; // 123123123454545
        fixedClasses = {
            2: 'skirmisher',  // Team 2
            4: 'controller',  // Team 1
            5: 'support',     // Team 2
            8: 'controller',  // Team 2
            10: 'support',    // Team 4
            11: 'assault',    // Team 5
            13: 'controller', // Team 5
            15: 'support'     // Team 5
        };
    }

    // Count fixed classes
    const classCount = { controller: 0, support: 0, assault: 0, recon: 0, skirmisher: 0 };
    Object.values(fixedClasses).forEach(c => classCount[c]++);

    // Random pool for remaining positions
    const randomPool = {
        assault: 3,
        recon: 3,
        skirmisher: 3
    };
    // Adjust if we have extra slots (for 3/4 team games with fewer fixed)
    const randomClasses = ['assault', 'recon', 'skirmisher'];

    // Build compositions per team
    const compositions = Array.from({ length: numTeams }, () => []);

    for (let pos = 1; pos <= numPlayers; pos++) {
        const teamIndex = positionToTeam[pos - 1];
        let classKey;

        if (fixedClasses[pos]) {
            classKey = fixedClasses[pos];
        } else {
            // Pick random available class
            const available = randomClasses.filter(c => randomPool[c] > 0);
            if (available.length > 0) {
                classKey = available[Math.floor(Math.random() * available.length)];
                randomPool[classKey]--;
            } else {
                // Fallback if pool exhausted
                classKey = randomClasses[Math.floor(Math.random() * randomClasses.length)];
            }
        }

        compositions[teamIndex].push(classKey);
    }

    return compositions;
}


// Create a player
function createPlayer(classKey, teamId, playerId) {
    const cls = CLASSES[classKey];
    return {
        id: playerId,
        teamId: teamId,
        classKey: classKey,
        className: cls.name,
        baseHp: cls.hp,
        hp: cls.hp,
        maxHp: cls.hp,
        accuracy: cls.accuracy,
        evasion: cls.evasion,
        execute: cls.execute,
        momentum: cls.momentum,
        hitbox: cls.hitbox,
        alive: true,
        parryUsed: new Set(), // tracks which enemies have been parried
        respawnUsed: false,
        berserkerUsed: false,
        grievousWounds: false, // regen halved
        bleedRounds: 0, // Skirmisher Bleed: 50% healing reduction
        disruptedRounds: 0, // Recon Disruption: no damage bonuses
        reviveResistRounds: 0, // temporary resistance from Second Chance
        wildcards: [] // accumulated wildcards
    };
}

// Create teams with specific compositions
function createTeams(compositions) {
    const teams = [];
    const players = [];
    let playerId = 0;

    compositions.forEach((comp, teamIndex) => {
        const team = {
            id: teamIndex + 1,
            players: [],
            alive: true
        };

        comp.forEach(classKey => {
            const player = createPlayer(classKey, team.id, playerId++);
            team.players.push(player);
            players.push(player);
        });

        teams.push(team);
    });

    return { teams, players };
}

// Apply health scaling
function applyHealthScaling(players, maxPlayers) {
    const living = players.filter(p => p.alive).length;

    players.forEach(p => {
        if (p.alive) {
            const oldMax = p.maxHp;
            const isSkirmisher = p.classKey === 'skirmisher';
            const scale = getHealthScale(living, maxPlayers, isSkirmisher);
            p.maxHp = Math.round(p.baseHp * scale);
            // Preserve HP percentage
            const hpPct = p.hp / oldMax;
            p.hp = Math.round(hpPct * p.maxHp);
        }
    });
}

// Check if team has a class
function teamHasClass(players, teamId, classKey) {
    return players.some(p => p.teamId === teamId && p.classKey === classKey && p.alive);
}

// Calculate hit chance
function calculateHitChance(attacker, defender, players) {
    let accuracy = attacker.accuracy;
    let attackerEvasion = attacker.evasion;
    let defenderEvasion = defender.evasion;

    // Recon team bonus: +5% accuracy
    if (teamHasClass(players, attacker.teamId, 'recon')) {
        accuracy += 0.05;
    }

    // Skirmisher team bonus: +5% evasion to all teammates
    if (teamHasClass(players, attacker.teamId, 'skirmisher')) {
        attackerEvasion += 0.05;
    }
    if (teamHasClass(players, defender.teamId, 'skirmisher')) {
        defenderEvasion += 0.05;
    }

    // Apply attacker wildcards
    attacker.wildcards.forEach(wc => {
        if (wc === 'accuracy') accuracy += 0.05;
        if (wc === 'evasion') attackerEvasion += 0.05;
    });

    // Apply defender wildcards
    defender.wildcards.forEach(wc => {
        if (wc === 'evasion') defenderEvasion += 0.05;
        if (wc === 'enemyAccuracy') accuracy *= 0.95;
    });

    // Recon ignores evasion AND gets bonus accuracy vs high-momentum targets
    if (attacker.classKey === 'recon') {
        // Bonus accuracy = 0.5% per momentum point difference
        const momentumDiff = defender.momentum - attacker.momentum;
        const momentumBonus = Math.max(0, momentumDiff) * 0.005;
        // Hitbox affects how easy the target is to hit
        const hitboxAccuracy = accuracy * defender.hitbox;
        return Math.min(1, Math.max(0, hitboxAccuracy + momentumBonus)); // No evasion penalty
    }

    // Hitbox affects how easy the target is to hit
    const hitChance = accuracy * defender.hitbox * (1 - attackerEvasion) * (1 - defenderEvasion);
    return Math.min(1, Math.max(0, hitChance));
}

// Calculate damage
function calculateDamage(attacker, defender, players, hitChance) {
    let damage = BASE_DAMAGE * hitChance;
    let lifelinkHealing = 0;

    // Support Lifelink: heal when attacking higher HP targets
    // Grievous Wounds blocks lifelink
    if (attacker.classKey === 'support' && defender.hp > attacker.hp && !attacker.grievousWounds) {
        lifelinkHealing = Math.round(damage * 0.50); // Heal 50% of damage dealt
    }

    // Disrupted attackers (hit by Recon) lose damage bonuses - primarily affects Skirmisher
    const isDisrupted = attacker.disruptedRounds > 0;

    // Assault bonus: 40% base + momentum scaling (NOT affected by Disruption - Assault powers through)
    // Bonus increases when attacking lower momentum targets
    if (attacker.classKey === 'assault') {
        const momentumDiff = attacker.momentum - defender.momentum;
        const momentumBonus = momentumDiff > 0 ? (momentumDiff * 0.005) : 0; // +0.5% per point diff
        damage *= (1.50 + momentumBonus);
    }

    // Skirmisher berserker: scales with HP% AND matches 3× the HP scaling (blocked by Disruption)
    // Compensates for enemy HP scaling at full lobby
    if (attacker.classKey === 'skirmisher' && !isDisrupted) {
        const living = players.filter(p => p.alive).length;
        const maxPlayers = players.length;
        // 3× the HP scaling formula: 3 × 0.40 × (L-1)/(max-1)
        const maxBonus = 3 * 0.40 * (living - 1) / (maxPlayers - 1);
        const hpPct = attacker.hp / attacker.maxHp;
        damage *= (1 + (1 - hpPct) * maxBonus);

        // Skirmisher counter: +30% damage vs high-accuracy targets (Assault 0.95)
        if (defender.accuracy >= 0.95) {
            damage *= 1.30;
        }

    }

    // Recon converts defender evasion to bonus damage
    if (attacker.classKey === 'recon') {
        damage *= (1 + defender.evasion);

        // Recon counter: +15% damage vs 0-evasion targets (Controller)
        if (defender.evasion === 0) {
            damage *= 1.15;
        }

        // Sniper Execute: +25% damage vs targets at ≤50% HP
        if (defender.hp <= defender.maxHp * 0.5) {
            damage *= 1.25;
        }
    }

    // Apply attacker wildcards
    attacker.wildcards.forEach(wc => {
        if (wc === 'damage') damage *= 1.05;
    });

    // Controller momentum advantage: high-momentum attackers do less damage
    // Controller is "planted" so aggressive rushers lose effectiveness
    if (defender.classKey === 'controller') {
        const momentumPenalty = attacker.momentum * 0.002; // 0.2% reduction per momentum
        damage *= (1 - momentumPenalty);
    }

    // Controller team resistance: -5% damage taken (Assault/Skirmisher ignore this)
    if (teamHasClass(players, defender.teamId, 'controller')) {
        if (attacker.classKey !== 'assault' && attacker.classKey !== 'skirmisher') {
            damage *= 0.95;
        }
    }

    // Revive resistance from Second Chance (1 round of 15% resist)
    if (defender.reviveResistRounds > 0) {
        damage *= 0.85;
    }

    // Apply Pentagon team-up bonuses
    // Attacker: allies give damage bonus, Defender: enemies give defense bonus
    const attackerTeamUp = calculateTeamUpBonus(attacker, players);
    const defenderTeamUp = calculateTeamUpBonus(defender, players);

    damage *= (1 + attackerTeamUp.damageBonus);  // Attacker's ally bonus
    damage *= (1 - defenderTeamUp.defenseBonus); // Defender's enemy bonus (damage reduction)

    return { damage: Math.round(damage), lifelinkHealing };
}

// Process attack
function processAttack(attacker, defender, players) {
    const hitChance = calculateHitChance(attacker, defender, players);
    const damageResult = calculateDamage(attacker, defender, players, hitChance);
    const damage = damageResult.damage;
    const lifelinkHealing = damageResult.lifelinkHealing;

    // Check for parry (Controller only, first hit per attacker)
    if (defender.classKey === 'controller' &&
        !defender.parryUsed.has(attacker.id) &&
        attacker.classKey !== 'recon') { // Recon pierces parry

        defender.parryUsed.add(attacker.id);

        // Parry: take 30%, reflect 20%, block 50%
        const parryDamage = Math.round(damage * 0.30);
        const reflectDamage = Math.round(damage * 0.20);

        defender.hp -= parryDamage;
        attacker.hp -= reflectDamage;

        // Apply lifelink healing even on parry (Support still dealt damage)
        if (lifelinkHealing > 0) {
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + Math.round(lifelinkHealing * 0.30));
        }

        return { parried: true, damageTaken: parryDamage, reflected: reflectDamage };
    }

    defender.hp -= damage;

    // Apply lifelink healing
    if (lifelinkHealing > 0) {
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + lifelinkHealing);
    }

    // Assault applies grievous wounds
    if (attacker.classKey === 'assault') {
        defender.grievousWounds = true;
    }

    // Skirmisher applies Bleed: 50% healing reduction for 1 round (refreshes, doesn't stack)
    if (attacker.classKey === 'skirmisher' && defender.bleedRounds === 0) {
        defender.bleedRounds = 2; // Will decrement to 1 at end of round, then 0
    }

    // Recon applies Disruption: target loses damage bonuses for 1 round (refreshes on hit)
    // Execute >= 0.15 classes are immune (Recon 0.18, Assault 0.22 - too lethal to disrupt)
    if (attacker.classKey === 'recon' && defender.hp > 0 && defender.execute < 0.15) {
        defender.disruptedRounds = 2; // Will decrement to 1 at end of round, then 0
    }

    // Assault Biteback: when attacked and survives, immediately counter-attacks
    if (defender.classKey === 'assault' && defender.hp > 0 && defender.alive) {
        const bitebackDamage = Math.round(BASE_DAMAGE * 0.25); // 25% of base damage
        attacker.hp -= bitebackDamage;
        defender.lastAttacker = attacker.classKey; // Track for matchup
        return { parried: false, damageTaken: damage, biteback: bitebackDamage };
    }

    return { parried: false, damageTaken: damage };
}

// End of round regen
function applyRegen(players) {
    players.forEach(p => {
        if (p.alive && teamHasClass(players, p.teamId, 'support')) {
            let regenAmount = Math.round(p.maxHp * 0.08); // Boosted from 5% to 8%

            // Grievous wounds halves regen
            if (p.grievousWounds) {
                regenAmount = Math.round(regenAmount * 0.5);
            }

            // Skirmisher Bleed: 50% healing reduction (stacks multiplicatively with Grievous)
            if (p.bleedRounds > 0) {
                regenAmount = Math.round(regenAmount * 0.5);
            }

            p.hp = Math.min(p.maxHp, p.hp + regenAmount);
        }

        // Clear grievous wounds at end of round
        p.grievousWounds = false;

        // Decrement bleed rounds
        if (p.bleedRounds > 0) {
            p.bleedRounds--;
        }

        // Decrement disruption rounds
        if (p.disruptedRounds > 0) {
            p.disruptedRounds--;
        }

        // Decrement revive resistance rounds
        if (p.reviveResistRounds > 0) {
            p.reviveResistRounds--;
        }
    });
}

// Check for deaths and respawns
function checkDeaths(players, teams) {
    const deaths = [];

    players.forEach(p => {
        if (p.alive && p.hp <= 0) {
            // Get attacker's execute chance
            const attacker = p.lastAttacker ? players.find(a => a.classKey === p.lastAttacker) : null;
            let executeChance = attacker ? attacker.execute : 0;

            // Assault team bonus: +10% execute
            if (attacker && teamHasClass(players, attacker.teamId, 'assault')) {
                executeChance += 0.10;
            }

            const executed = Math.random() < executeChance;

            // First check for Skirmisher self-respawn (Berserker mode)
            // Skirmisher execute (5%) does NOT work on other skirmishers - only Assault/Recon can stop berserker
            if (p.classKey === 'skirmisher' && !p.berserkerUsed) {
                const canStopBerserker = executed && attacker && attacker.classKey !== 'skirmisher';
                if (!canStopBerserker) {
                    p.berserkerUsed = true;
                    p.hp = Math.round(p.maxHp * 0.30); // Respawn at 30%
                    deaths.push({ player: p, respawned: true, berserker: true });
                    return; // Skip further death processing for this player
                }
                // If executed, fall through to death
            }

            // Check for Support respawn (Second Chance)
            // All execute types work against Support second chance
            const supportAlive = players.find(s =>
                s.teamId === p.teamId &&
                s.classKey === 'support' &&
                s.alive &&
                !s.respawnUsed &&
                s.id !== p.id
            );

            if (supportAlive && !executed) {
                // Respawn at 65% HP with 1 round of 15% resistance (not on self)
                supportAlive.respawnUsed = true;
                p.hp = Math.round(p.maxHp * 0.65);
                if (p.classKey !== 'support') { // Not on self
                    p.reviveResistRounds = 1;
                }
                deaths.push({ player: p, respawned: true });
            } else {
                p.alive = false;
                // Track matchup kill
                if (p.lastAttacker) {
                    matchupKills[p.lastAttacker][p.classKey]++;
                }
                deaths.push({ player: p, respawned: false, executed: executed });
            }
        }
    });

    // Update team alive status
    teams.forEach(team => {
        team.alive = team.players.some(pid => {
            const player = players.find(p => p.id === pid.id);
            return player && player.alive;
        });
    });

    return deaths;
}

// Assign random wildcards (simplified - just pick one)
function assignWildcard(player) {
    const wildcards = ['accuracy', 'evasion', 'damage', 'regen', 'enemyAccuracy'];
    const available = wildcards.filter(wc => !player.wildcards.includes(wc));
    if (available.length > 0) {
        const picked = available[Math.floor(Math.random() * available.length)];
        player.wildcards.push(picked);
    }
}

// Simulate one round
function simulateRound(players, teams, roundNum) {
    const alivePlayers = players.filter(p => p.alive);
    const aliveTeams = teams.filter(t => t.alive);

    if (aliveTeams.length <= 1) {
        return { finished: true, winner: aliveTeams[0] };
    }

    // Assign wildcards
    alivePlayers.forEach(p => assignWildcard(p));

    // Each alive player attacks random enemy
    alivePlayers.forEach(attacker => {
        if (!attacker.alive) return;
        const enemies = alivePlayers.filter(p => p.teamId !== attacker.teamId && p.alive);
        if (enemies.length > 0) {
            const defender = enemies[Math.floor(Math.random() * enemies.length)];
            const result = processAttack(attacker, defender, players);
            // Track last attacker for kill attribution
            if (defender.hp <= 0) {
                defender.lastAttacker = attacker.classKey;
            }
        }
    });

    // Check deaths and attribute kills
    checkDeaths(players, teams);

    // Apply regen
    applyRegen(players);

    // Update health scaling
    applyHealthScaling(players, players.length);

    // Check for winner
    const remaining = teams.filter(t => t.alive);
    if (remaining.length <= 1) {
        return { finished: true, winner: remaining[0] };
    }

    return { finished: false };
}

// Simulate full game
function simulateGame(compositions) {
    const { teams, players } = createTeams(compositions);
    const maxPlayers = players.length;

    // Initial health scaling
    applyHealthScaling(players, maxPlayers);

    const maxRounds = 10; // Safety limit
    for (let round = 1; round <= maxRounds; round++) {
        const result = simulateRound(players, teams, round);
        if (result.finished) {
            // Track second chance usage per team
            const teamRespawnData = {};
            teams.forEach(t => {
                const support = players.find(p => p.teamId === t.id && p.classKey === 'support');
                teamRespawnData[t.id] = {
                    hasSupport: !!support,
                    respawnUsed: support ? support.respawnUsed : false
                };
            });

            return {
                winner: result.winner,
                rounds: round,
                compositions: compositions,
                teamRespawnData: teamRespawnData
            };
        }
    }

    // Tie - return team with most HP
    const aliveTeams = teams.filter(t => t.alive);
    const teamHPs = aliveTeams.map(t => ({
        team: t,
        totalHP: t.players.reduce((sum, p) => sum + (p.alive ? p.hp : 0), 0)
    }));
    teamHPs.sort((a, b) => b.totalHP - a.totalHP);

    return {
        winner: teamHPs[0]?.team,
        rounds: maxRounds,
        compositions: compositions,
        tie: true
    };
}

// Run simulation batch
function runSimulation(numTeams, numGames) {
    const results = {
        wins: {},
        classWins: {},
        compWins: {},
        teamWins: {}, // Track wins by team number
        totalGames: 0,
        avgRounds: 0
    };

    // Initialize counters
    CLASS_KEYS.forEach(c => results.classWins[c] = 0);
    for (let t = 1; t <= numTeams; t++) results.teamWins[t] = 0;

    let totalRounds = 0;

    for (let game = 0; game < numGames; game++) {
        // Generate random compositions with class constraints
        const compositions = generateRandomCompositions(numTeams);

        const result = simulateGame(compositions);
        results.totalGames++;
        totalRounds += result.rounds;

        if (result.winner) {
            const winnerId = result.winner.id;
            results.teamWins[winnerId] = (results.teamWins[winnerId] || 0) + 1;

            const winnerComp = compositions[winnerId - 1];
            const compKey = winnerComp.sort().join('+');

            results.compWins[compKey] = (results.compWins[compKey] || 0) + 1;

            winnerComp.forEach(c => {
                results.classWins[c]++;
            });

            // Track Second Chance stats for winning team
            if (result.teamRespawnData) {
                const winnerData = result.teamRespawnData[winnerId];
                if (winnerData && winnerData.hasSupport) {
                    secondChanceStats.totalGamesWithSupport++;
                    if (winnerData.respawnUsed) {
                        secondChanceStats.clutchWins++;
                    } else {
                        secondChanceStats.notUsed++;
                    }
                }

                // Track respawns used by losing teams
                Object.entries(result.teamRespawnData).forEach(([teamId, data]) => {
                    if (parseInt(teamId) !== winnerId && data.hasSupport && data.respawnUsed) {
                        secondChanceStats.usedButLost++;
                    }
                });
            }
        }
    }

    results.avgRounds = (totalRounds / numGames).toFixed(2);

    return results;
}

// Print results
function printResults(numTeams, results) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`${numTeams} TEAMS (${numTeams * 3} players) - ${results.totalGames} games`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Average rounds: ${results.avgRounds}`);

    console.log('\nCLASS WIN RATES:');
    const classStats = CLASS_KEYS.map(c => ({
        class: c,
        wins: results.classWins[c],
        rate: ((results.classWins[c] / (results.totalGames * 3)) * 100).toFixed(1)
    }));
    classStats.sort((a, b) => b.wins - a.wins);
    classStats.forEach(s => {
        console.log(`  ${CLASSES[s.class].emoji} ${s.class.padEnd(12)} ${s.wins} wins (${s.rate}% of winning teams)`);
    });

    console.log('\nTEAM WIN RATES:');
    Object.entries(results.teamWins)
        .sort((a, b) => b[1] - a[1])
        .forEach(([teamId, wins]) => {
            const rate = ((wins / results.totalGames) * 100).toFixed(1);
            console.log(`  Team ${teamId}: ${wins} wins (${rate}%)`);
        });

    console.log('\nTOP 5 COMPOSITIONS:');
    const compStats = Object.entries(results.compWins)
        .map(([comp, wins]) => ({ comp, wins, rate: ((wins / results.totalGames) * 100).toFixed(1) }))
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 5);
    compStats.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.comp} - ${s.wins} wins (${s.rate}%)`);
    });
}

// Main
console.log('🎮 WILDCARD COMBAT SIMULATION');
console.log('Testing balance across different team configurations...\n');

const configs = [
    { teams: 3, games: 3000 },
    { teams: 4, games: 3000 },
    { teams: 5, games: 3000 }
];

configs.forEach(config => {
    const results = runSimulation(config.teams, config.games);
    printResults(config.teams, results);
});

// Print matchup matrix
console.log('\n' + '='.repeat(60));
console.log('MATCHUP MATRIX (Kills: Attacker → Victim)');
console.log('='.repeat(60));

// Header
let header = '           ';
CLASS_KEYS.forEach(v => header += CLASSES[v].emoji.padStart(6));
console.log(header + '  | Total');

// Rows
CLASS_KEYS.forEach(attacker => {
    let row = CLASSES[attacker].emoji + ' ' + attacker.padEnd(10);
    let total = 0;
    CLASS_KEYS.forEach(victim => {
        const kills = matchupKills[attacker][victim];
        total += kills;
        row += kills.toString().padStart(6);
    });
    row += '  | ' + total;
    console.log(row);
});

// Top 3 and Bottom 3 matchups
console.log('\nTOP 3 MATCHUPS (Most dominant):');
const matchups = [];
CLASS_KEYS.forEach(a => {
    CLASS_KEYS.forEach(v => {
        if (a !== v) {
            const kills = matchupKills[a][v];
            const reverse = matchupKills[v][a];
            matchups.push({ attacker: a, victim: v, kills, reverse, diff: kills - reverse });
        }
    });
});
matchups.sort((a, b) => b.diff - a.diff);
matchups.slice(0, 5).forEach((m, i) => {
    console.log(`  ${i + 1}. ${CLASSES[m.attacker].emoji}${m.attacker} > ${CLASSES[m.victim].emoji}${m.victim}: ${m.kills} vs ${m.reverse} (${m.diff > 0 ? '+' : ''}${m.diff})`);
});

console.log('\nBOTTOM 5 MATCHUPS (Most lopsided losses):');
matchups.slice(-5).reverse().forEach((m, i) => {
    console.log(`  ${i + 1}. ${CLASSES[m.attacker].emoji}${m.attacker} < ${CLASSES[m.victim].emoji}${m.victim}: ${m.kills} vs ${m.reverse} (${m.diff})`);
});

// Second Chance stats
console.log('\n' + '='.repeat(50));
console.log('⚪ SECOND CHANCE ANALYSIS');
console.log('='.repeat(50));
const total = secondChanceStats.clutchWins + secondChanceStats.usedButLost + secondChanceStats.notUsed;
console.log(`Clutch Wins (respawn used, team won): ${secondChanceStats.clutchWins} (${(secondChanceStats.clutchWins / total * 100).toFixed(1)}%)`);
console.log(`Used But Lost (respawn used, team lost): ${secondChanceStats.usedButLost}`);
console.log(`Not Used (respawn never triggered): ${secondChanceStats.notUsed} (${(secondChanceStats.notUsed / secondChanceStats.totalGamesWithSupport * 100).toFixed(1)}% of Support wins)`);
console.log(`Total games with Support winner: ${secondChanceStats.totalGamesWithSupport}`);

console.log('\n' + '='.repeat(50));
console.log('SIMULATION COMPLETE');
console.log('='.repeat(50));
