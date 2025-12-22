const fs = require('fs');
const path = require('path');

class StreamerStorage {
  constructor() {
    this.filePath = path.join(__dirname, '../../data/guilds.json');
    this.ensureDataFile();
  }

  ensureDataFile() {
    const dataDir = path.dirname(this.filePath);

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({ guilds: {} }, null, 2));
    }
  }

  getData() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(data);
      return parsed.guilds || {};
    } catch (error) {
      console.error('Error reading guilds file:', error);
      return {};
    }
  }

  saveData(guilds) {
    try {
      fs.writeFileSync(
        this.filePath,
        JSON.stringify({ guilds }, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Error saving guilds file:', error);
      throw error;
    }
  }

  getGuildConfig(guildId) {
    const guilds = this.getData();
    if (!guilds[guildId]) {
      guilds[guildId] = {
        streamers: [],
        notificationChannelId: null,
        roleId: null
      };
      this.saveData(guilds);
    }
    return guilds[guildId];
  }

  getStreamers(guildId) {
    const config = this.getGuildConfig(guildId);
    return config.streamers || [];
  }

  getAllStreamers() {
    const guilds = this.getData();
    const allStreamers = new Set();

    Object.values(guilds).forEach(config => {
      if (config.streamers) {
        config.streamers.forEach(s => allStreamers.add(s.toLowerCase()));
      }
    });

    return Array.from(allStreamers);
  }

  addStreamer(guildId, username) {
    const guilds = this.getData();
    const config = this.getGuildConfig(guildId);
    const lowerUsername = username.toLowerCase();

    if (config.streamers.includes(lowerUsername)) {
      return false;
    }

    config.streamers.push(lowerUsername);
    guilds[guildId] = config;
    this.saveData(guilds);
    return true;
  }

  removeStreamer(guildId, username) {
    const guilds = this.getData();
    const config = this.getGuildConfig(guildId);
    const lowerUsername = username.toLowerCase();
    const index = config.streamers.indexOf(lowerUsername);

    if (index === -1) {
      return false;
    }

    config.streamers.splice(index, 1);
    guilds[guildId] = config;
    this.saveData(guilds);
    return true;
  }

  setNotificationChannel(guildId, channelId) {
    const guilds = this.getData();
    const config = this.getGuildConfig(guildId);
    config.notificationChannelId = channelId;
    guilds[guildId] = config;
    this.saveData(guilds);
  }

  setRole(guildId, roleId) {
    const guilds = this.getData();
    const config = this.getGuildConfig(guildId);
    config.roleId = roleId;
    guilds[guildId] = config;
    this.saveData(guilds);
  }

  getNotificationChannel(guildId) {
    const config = this.getGuildConfig(guildId);
    return config.notificationChannelId;
  }

  getRole(guildId) {
    const config = this.getGuildConfig(guildId);
    return config.roleId;
  }

  setUpdatesChannel(guildId, channelId) {
    const guilds = this.getData();
    const config = this.getGuildConfig(guildId);
    config.updatesChannelId = channelId;
    guilds[guildId] = config;
    this.saveData(guilds);
  }

  getUpdatesChannel(guildId) {
    const config = this.getGuildConfig(guildId);
    return config.updatesChannelId;
  }

  getAllGuilds() {
    return this.getData();
  }
}

module.exports = StreamerStorage;
