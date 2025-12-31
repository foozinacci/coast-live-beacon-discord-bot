# Wildcard Game Integration - Implementation Plan

## Current State

### What Exists (Disconnected)
- `arena3d.html` - Self-contained 3D battle simulation with fake players
- `wildcardGameV2.js` - Discord/Twitch game service with lobby system
- Individual command files (`lbjoin.js`, etc.) - Redundant, replaced by `lbg.js`

### What's Missing
- WebSocket bridge between bot and arena
- Real player data flowing to arena
- Game results flowing back to Discord/Twitch
- Account linking (Discord ↔ Twitch)
- Priority queue for next game

---

## Phase 1: Cleanup Redundant Files

### Files to DELETE (replaced by `lbg.js`)
```
src/commands/lbjoin.js
src/commands/lbleave.js
src/commands/lbstartgame.js
src/commands/lbreset.js
src/commands/lbready.js
src/commands/lbpick.js
src/commands/lbperk1.js
src/commands/lbperk2.js
src/commands/lbgame.js
src/commands/lbgamehelp.js
src/commands/lbcharacters.js
src/commands/lbassault.js
src/commands/lbrecon.js
src/commands/lbsupport.js
src/commands/lbcontroller.js
src/commands/lbskirmisher.js
src/commands/lbperks.js
src/commands/lbsetgame.js
src/commands/lbgamestats.js
```

---

## Phase 2: WebSocket Bridge

### Server (Bot) Side
```javascript
// src/services/wildcardBridge.js
const WebSocket = require('ws');

class WildcardBridge {
    constructor(server, gameService) {
        this.wss = new WebSocket.Server({ server, path: '/wildcard' });
        this.game = gameService;
        this.arenaConnection = null;
        
        this.wss.on('connection', (ws) => {
            this.arenaConnection = ws;
            ws.on('message', this.handleArenaMessage.bind(this));
        });
    }
    
    // Send player data to arena
    sendPlayers(guildId) {
        if (!this.arenaConnection) return;
        const gameState = this.game.getGame(guildId);
        this.arenaConnection.send(JSON.stringify({
            type: 'PLAYERS',
            players: Array.from(gameState.players.values())
        }));
    }
    
    // Receive results from arena
    handleArenaMessage(data) {
        const msg = JSON.parse(data);
        if (msg.type === 'TEAM_ELIMINATED') {
            this.game.handleTeamElimination(msg.team, msg.stats);
        }
        if (msg.type === 'GAME_OVER') {
            this.game.handleGameOver(msg.winner, msg.stats);
        }
    }
}
```

### Arena Side
```javascript
// In arena3d.html
const ws = new WebSocket('ws://localhost:3000/wildcard');

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'PLAYERS') {
        loadRealPlayers(msg.players);
    }
};

function reportElimination(team, stats) {
    ws.send(JSON.stringify({ type: 'TEAM_ELIMINATED', team, stats }));
}
```

---

## Phase 3: Account Linking

### Database Schema
```javascript
// Linked accounts storage
{
    discordId: "123456789",
    twitchUsername: "coolstreamer",
    profile: {
        totalGames: 42,
        wins: 12,
        kills: 156,
        // etc
    }
}
```

### Flow
1. User joins via Discord → Bot DMs asking for Twitch link
2. User replies with Twitch username
3. Bot stores link in database
4. When same Twitch user joins, profile is unified

---

## Phase 4: Elimination Reports

### Report Format
```
📊 TEAM 3 ELIMINATED (4th Place)
━━━━━━━━━━━━━━━━━━━━━━
🔴 Player1 (Assault)
   • Damage: 1,247
   • Kills: 2
   • Respawns: 1
   • Final: Ring-out by Player5

⚪ Player2 (Support)
   • Damage: 523
   • Kills: 0
   • Respawns: 0
   • Final: Executed by Player7

🔵 Player3 (Recon)
   • Damage: 892
   • Kills: 1
   • Respawns: 2
   • Final: Melee by Player4
```

---

## Phase 5: Priority Queue

### `!lbg ready` Logic
```javascript
// After game ends
const priorityQueue = [];
const winningTeam = [...]; // 3 players
const eliminatedPlayers = [...]; // In order of elimination

// First 6 eliminated get priority
const eligibleForReady = eliminatedPlayers.slice(0, 6);

// !lbg ready command
if (eligibleForReady.includes(player)) {
    priorityQueue.push(player);
    // Reserve their spot
}

// 3 spots always reserved for winners
// Winners can use !lbg ready to claim OR skip

// When next lobby forms:
// 1. Priority queue fills first
// 2. Winner spots fill if claimed
// 3. New players can join remaining spots
// 4. Winners cannot be on same team again
```

---

## Execution Order

1. ✅ Delete redundant command files
2. Add WebSocket server to bot
3. Modify arena3d to receive real players
4. Add account linking to database
5. Add elimination tracking to arena
6. Add report generation
7. Add priority queue system

---

## Estimated Scope

| Phase | Complexity | Time |
|-------|------------|------|
| 1. Cleanup | Low | 5 min |
| 2. WebSocket | Medium | 30 min |
| 3. Account Link | Medium | 30 min |
| 4. Reports | Medium | 20 min |
| 5. Priority Queue | High | 45 min |

**Total: ~2-3 hours of focused work**
