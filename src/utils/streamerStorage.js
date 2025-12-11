const fs = require('fs');
const path = require('path');

class StreamerStorage {
  constructor() {
    this.filePath = path.join(__dirname, '../../data/streamers.json');
    this.ensureDataFile();
  }

  ensureDataFile() {
    const dataDir = path.dirname(this.filePath);

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({ streamers: [] }, null, 2));
    }
  }

  getStreamers() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(data);
      return parsed.streamers || [];
    } catch (error) {
      console.error('Error reading streamers file:', error);
      return [];
    }
  }

  addStreamer(username) {
    const streamers = this.getStreamers();
    const lowerUsername = username.toLowerCase();

    if (streamers.includes(lowerUsername)) {
      return false;
    }

    streamers.push(lowerUsername);
    this.saveStreamers(streamers);
    return true;
  }

  removeStreamer(username) {
    const streamers = this.getStreamers();
    const lowerUsername = username.toLowerCase();
    const index = streamers.indexOf(lowerUsername);

    if (index === -1) {
      return false;
    }

    streamers.splice(index, 1);
    this.saveStreamers(streamers);
    return true;
  }

  saveStreamers(streamers) {
    try {
      fs.writeFileSync(
        this.filePath,
        JSON.stringify({ streamers }, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Error saving streamers file:', error);
      throw error;
    }
  }
}

module.exports = StreamerStorage;
