const fs = require('fs');
const path = require('path');

class QueueStorage {
    constructor() {
        this.filePath = path.join(__dirname, '../../data/queue.json');
        this.ensureDataFile();
    }

    ensureDataFile() {
        const dataDir = path.dirname(this.filePath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify({ guilds: {}, blacklist: {} }, null, 2));
        }
    }

    getData() {
        try {
            return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        } catch (error) {
            return { guilds: {}, blacklist: {} };
        }
    }

    saveData(data) {
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    }

    getGuildQueue(guildId) {
        const data = this.getData();
        if (!data.guilds[guildId]) {
            data.guilds[guildId] = {
                tracks: [],
                currentIndex: 0,
                isPlaying: false,
                isPaused: false,
                voiceChannelId: null,
                musicChannelId: null,
                nowPlayingMessageId: null,
                lastPlayedAt: null
            };
            this.saveData(data);
        }
        return data.guilds[guildId];
    }

    addTrack(guildId, userId, username, trackInfo) {
        const data = this.getData();
        const queue = this.getGuildQueue(guildId);

        // Check user track limit
        const userTracks = queue.tracks.filter(t => t.userId === userId);
        const limit = trackInfo.isBirthday ? 4 : 3;

        if (userTracks.length >= limit) {
            return { success: false, error: 'You have ' + userTracks.length + '/' + limit + ' tracks. Remove one first.' };
        }

        // Check for duplicates
        const isDuplicate = queue.tracks.some(t => t.url === trackInfo.url);
        if (isDuplicate) {
            return { success: false, error: 'Track already in queue.' };
        }

        // Check blacklist
        if (this.isBlacklisted(guildId, trackInfo.url)) {
            return { success: false, error: 'This source is blacklisted.' };
        }

        // Check duration (7 min default, 15 min for birthday extended)
        const maxDuration = trackInfo.isExtended ? 900 : 420; // 7 or 15 min in seconds
        if (trackInfo.duration > maxDuration) {
            const maxMin = Math.floor(maxDuration / 60);
            return { success: false, error: 'Track exceeds ' + maxMin + ' min limit.' };
        }

        const track = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            userId,
            username,
            url: trackInfo.url,
            title: trackInfo.title,
            artist: trackInfo.artist || 'Unknown',
            duration: trackInfo.duration,
            platform: trackInfo.platform,
            addedAt: Date.now(),
            lastPlayedAt: null,
            playCount: 0,
            isBirthday: trackInfo.isBirthday || false,
            isExtended: trackInfo.isExtended || false
        };

        queue.tracks.push(track);
        data.guilds[guildId] = queue;
        this.saveData(data);

        return { success: true, track, position: queue.tracks.length };
    }

    removeTrack(guildId, userId, index, isMod = false) {
        const data = this.getData();
        const queue = this.getGuildQueue(guildId);

        const userTracks = queue.tracks.filter(t => t.userId === userId);

        if (index < 1 || index > userTracks.length) {
            return { success: false, error: 'Invalid track number.' };
        }

        const trackToRemove = userTracks[index - 1];

        if (!isMod && trackToRemove.userId !== userId) {
            return { success: false, error: 'You can only remove your own tracks.' };
        }

        const globalIndex = queue.tracks.findIndex(t => t.id === trackToRemove.id);
        queue.tracks.splice(globalIndex, 1);

        data.guilds[guildId] = queue;
        this.saveData(data);

        return { success: true, removed: trackToRemove };
    }

    getUserTracks(guildId, userId) {
        const queue = this.getGuildQueue(guildId);
        return queue.tracks.filter(t => t.userId === userId);
    }

    getNextTrack(guildId) {
        const data = this.getData();
        const queue = this.getGuildQueue(guildId);

        if (queue.tracks.length === 0) return null;

        // Simple rotation: use currentIndex and increment
        let index = queue.currentIndex || 0;

        // Wrap around if at end
        if (index >= queue.tracks.length) {
            index = 0;
        }

        const track = queue.tracks[index];

        // Update index for next time
        queue.currentIndex = (index + 1) % queue.tracks.length;
        data.guilds[guildId] = queue;
        this.saveData(data);

        return track;
    }

    markPlayed(guildId, trackId) {
        const data = this.getData();
        const queue = this.getGuildQueue(guildId);

        const track = queue.tracks.find(t => t.id === trackId);
        if (track) {
            track.lastPlayedAt = Date.now();
            track.playCount++;
            this.saveData(data);
        }
    }

    clearQueue(guildId) {
        const data = this.getData();
        if (data.guilds[guildId]) {
            data.guilds[guildId].tracks = [];
            data.guilds[guildId].currentIndex = 0;
            this.saveData(data);
        }
    }

    isBlacklisted(guildId, url) {
        const data = this.getData();
        const blacklist = data.blacklist[guildId] || [];
        return blacklist.some(b => url.includes(b));
    }

    addBlacklist(guildId, pattern) {
        const data = this.getData();
        if (!data.blacklist[guildId]) data.blacklist[guildId] = [];
        if (!data.blacklist[guildId].includes(pattern)) {
            data.blacklist[guildId].push(pattern);
            this.saveData(data);
            return true;
        }
        return false;
    }

    removeBlacklist(guildId, pattern) {
        const data = this.getData();
        if (!data.blacklist[guildId]) return false;
        const index = data.blacklist[guildId].indexOf(pattern);
        if (index > -1) {
            data.blacklist[guildId].splice(index, 1);
            this.saveData(data);
            return true;
        }
        return false;
    }

    setMusicChannel(guildId, channelId) {
        const data = this.getData();
        const queue = this.getGuildQueue(guildId);
        queue.musicChannelId = channelId;
        data.guilds[guildId] = queue;
        this.saveData(data);
    }

    setVoiceChannel(guildId, channelId) {
        const data = this.getData();
        const queue = this.getGuildQueue(guildId);
        queue.voiceChannelId = channelId;
        data.guilds[guildId] = queue;
        this.saveData(data);
    }
}

module.exports = QueueStorage;
