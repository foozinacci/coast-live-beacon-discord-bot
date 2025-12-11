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
}

module.exports = TwitchClient;
