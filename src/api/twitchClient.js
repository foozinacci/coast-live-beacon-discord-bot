const axios = require('axios');

class TwitchClient {
  constructor() {
    this.clientId = process.env.TWITCH_CLIENT_ID;
    this.clientSecret = process.env.TWITCH_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiresAt = null;
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
        },
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000) - 60000;

      console.log('✅ Twitch access token obtained');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Failed to get Twitch access token:', error.response?.data || error.message);
      throw error;
    }
  }

  async getStreams(userLogins) {
    if (!userLogins || userLogins.length === 0) {
      return [];
    }

    try {
      const token = await this.getAccessToken();
      const params = new URLSearchParams();

      userLogins.forEach(login => {
        params.append('user_login', login.toLowerCase());
      });

      const response = await axios.get('https://api.twitch.tv/helix/streams', {
        params,
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.data.data;
    } catch (error) {
      console.error('❌ Failed to fetch streams:', error.response?.data || error.message);
      return [];
    }
  }

  async getUserInfo(userLogin) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get('https://api.twitch.tv/helix/users', {
        params: { login: userLogin.toLowerCase() },
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.data.data[0] || null;
    } catch (error) {
      console.error('❌ Failed to fetch user info:', error.response?.data || error.message);
      return null;
    }
  }

  async getFollowerCount(broadcasterId) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get('https://api.twitch.tv/helix/channels/followers', {
        params: {
          broadcaster_id: broadcasterId,
          first: 1 // We only need the total count
        },
        headers: {
          'Client-ID': this.clientId,
          'Authorization': 'Bearer ' + token,
        },
      });

      return response.data.total || 0;
    } catch (error) {
      console.error('❌ Failed to fetch follower count:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Follow a channel using the bot's user token
   * Requires TWITCH_BOT_TOKEN with user:edit:follows scope
   */
  async followChannel(targetUserId) {
    try {
      const botToken = process.env.TWITCH_BOT_TOKEN;
      const botUsername = process.env.TWITCH_BOT_USERNAME;

      if (!botToken || !botUsername) {
        console.log('⚠️ No bot token configured for following');
        return false;
      }

      // First get the bot's user ID
      const botInfo = await this.getUserInfo(botUsername);
      if (!botInfo) {
        console.error('❌ Could not get bot user info');
        return false;
      }

      // Use the user token (remove oauth: prefix if present)
      const cleanToken = botToken.replace('oauth:', '');

      const response = await axios.post(
        'https://api.twitch.tv/helix/channels/followed',
        {
          user_id: botInfo.id,
          broadcaster_id: targetUserId
        },
        {
          headers: {
            'Client-ID': this.clientId,
            'Authorization': `Bearer ${cleanToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Bot now following user ID: ${targetUserId}`);
      return true;
    } catch (error) {
      // 204 = success (no content), 409 = already following
      if (error.response?.status === 204 || error.response?.status === 409) {
        console.log(`✅ Bot is already following user ID: ${targetUserId}`);
        return true;
      }
      console.error('❌ Failed to follow channel:', error.response?.data || error.message);
      return false;
    }
  }
}

module.exports = TwitchClient;
