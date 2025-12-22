const fs = require('fs');
const path = require('path');

class AnalyticsStorage {
  constructor() {
    this.filePath = path.join(__dirname, '../../data/analytics.json');
    this.ensureDataFile();
  }

  ensureDataFile() {
    const dataDir = path.dirname(this.filePath);

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({
        sessions: {},
        activeStreams: {}
      }, null, 2));
    }
  }

  getData() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading analytics file:', error);
      return { sessions: {}, activeStreams: {} };
    }
  }

  saveData(data) {
    try {
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(data, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Error saving analytics file:', error);
      throw error;
    }
  }

  startSession(streamerLogin, streamData) {
    const data = this.getData();
    const now = Date.now();

    if (!data.sessions[streamerLogin]) {
      data.sessions[streamerLogin] = [];
    }

    const session = {
      sessionId: `${streamerLogin}_${now}`,
      startTime: now,
      endTime: null,
      game: streamData.game_name || 'Unknown',
      title: streamData.title || 'No title',
      startViewers: streamData.viewer_count || 0,
      peakViewers: streamData.viewer_count || 0,
      viewerSnapshots: [{ time: now, count: streamData.viewer_count || 0 }],
      duration: null
    };

    data.activeStreams[streamerLogin] = session;
    this.saveData(data);

    return session.sessionId;
  }

  updateSession(streamerLogin, viewerCount) {
    const data = this.getData();
    const session = data.activeStreams[streamerLogin];

    if (!session) return;

    const now = Date.now();

    session.viewerSnapshots.push({ time: now, count: viewerCount });

    if (viewerCount > session.peakViewers) {
      session.peakViewers = viewerCount;
    }

    this.saveData(data);
  }

  endSession(streamerLogin) {
    const data = this.getData();
    const session = data.activeStreams[streamerLogin];

    if (!session) return null;

    const now = Date.now();
    session.endTime = now;
    session.duration = now - session.startTime;

    if (!data.sessions[streamerLogin]) {
      data.sessions[streamerLogin] = [];
    }

    data.sessions[streamerLogin].push(session);

    delete data.activeStreams[streamerLogin];

    this.saveData(data);

    return session;
  }

  getStreamerStats(streamerLogin) {
    const data = this.getData();
    const sessions = data.sessions[streamerLogin] || [];

    if (sessions.length === 0) {
      return null;
    }

    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgDuration = totalDuration / totalSessions;

    const peakViewers = Math.max(...sessions.map(s => s.peakViewers));
    const avgPeakViewers = sessions.reduce((sum, s) => sum + s.peakViewers, 0) / totalSessions;

    const games = {};
    sessions.forEach(s => {
      games[s.game] = (games[s.game] || 0) + 1;
    });

    const topGames = Object.entries(games)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([game, count]) => ({ game, count }));

    const last7Days = sessions.filter(s => s.startTime > Date.now() - 7 * 24 * 60 * 60 * 1000);
    const streamsThisWeek = last7Days.length;

    const hourlyStats = {};
    sessions.forEach(s => {
      const hour = new Date(s.startTime).getHours();
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = { count: 0, totalViewers: 0 };
      }
      hourlyStats[hour].count++;
      hourlyStats[hour].totalViewers += s.peakViewers;
    });

    const peakHour = Object.entries(hourlyStats)
      .map(([hour, stats]) => ({ hour: parseInt(hour), avgViewers: stats.totalViewers / stats.count, streams: stats.count }))
      .sort((a, b) => b.avgViewers - a.avgViewers)[0];

    const recentSessions = sessions.slice(-10).reverse();

    return {
      streamerLogin,
      totalSessions,
      totalDuration,
      avgDuration,
      peakViewers,
      avgPeakViewers,
      topGames,
      streamsThisWeek,
      peakHour,
      recentSessions,
      lastStream: sessions[sessions.length - 1]
    };
  }

  getLeaderboard(metric = 'peakViewers', limit = 10) {
    const data = this.getData();
    const streamers = Object.keys(data.sessions);

    const leaderboard = streamers
      .map(streamer => {
        const stats = this.getStreamerStats(streamer);
        return stats ? { streamer, value: stats[metric] || 0 } : null;
      })
      .filter(entry => entry !== null)
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

    return leaderboard;
  }

  getActiveSession(streamerLogin) {
    const data = this.getData();
    return data.activeStreams[streamerLogin] || null;
  }

  getAllActiveSessions() {
    const data = this.getData();
    return data.activeStreams;
  }

  /**
   * Get weekly aggregated stats for charts
   * Returns last 8 weeks of data
   */
  getWeeklyStats(streamerLogin) {
    const data = this.getData();
    const sessions = data.sessions[streamerLogin];

    if (!sessions || sessions.length === 0) {
      return null;
    }

    // Group sessions by week
    const weeklyData = {};
    const now = new Date();

    sessions.forEach(session => {
      const startDate = new Date(session.startTime);
      // Get week number (weeks ago from now)
      const diffTime = now - startDate;
      const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));

      if (diffWeeks >= 8) return; // Only last 8 weeks

      const weekKey = 'W' + (8 - diffWeeks);

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          peakViewers: 0,
          totalViewers: 0,
          viewerSamples: 0,
          streamCount: 0,
          totalDuration: 0
        };
      }

      weeklyData[weekKey].streamCount++;
      weeklyData[weekKey].totalDuration += session.duration || 0;

      if (session.peakViewers > weeklyData[weekKey].peakViewers) {
        weeklyData[weekKey].peakViewers = session.peakViewers;
      }

      // For average, track totals
      if (session.viewerCounts && session.viewerCounts.length > 0) {
        const sessionAvg = session.viewerCounts.reduce((a, b) => a + b, 0) / session.viewerCounts.length;
        weeklyData[weekKey].totalViewers += sessionAvg;
        weeklyData[weekKey].viewerSamples++;
      }
    });

    // Convert to arrays for chart
    const labels = [];
    const peakViewers = [];
    const avgViewers = [];
    const streamCount = [];
    const totalHours = [];

    // Sort weeks and fill data
    for (let i = 1; i <= 8; i++) {
      const weekKey = 'W' + i;
      labels.push(weekKey);

      if (weeklyData[weekKey]) {
        const week = weeklyData[weekKey];
        peakViewers.push(week.peakViewers);
        avgViewers.push(week.viewerSamples > 0 ? Math.round(week.totalViewers / week.viewerSamples) : 0);
        streamCount.push(week.streamCount);
        totalHours.push(Math.round(week.totalDuration / (1000 * 60 * 60) * 10) / 10); // Hours with 1 decimal
      } else {
        peakViewers.push(0);
        avgViewers.push(0);
        streamCount.push(0);
        totalHours.push(0);
      }
    }

    return { labels, peakViewers, avgViewers, streamCount, totalHours };
  }
}

module.exports = AnalyticsStorage;
