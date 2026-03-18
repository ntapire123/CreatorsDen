const { google } = require("googleapis");
const axios = require("axios");

/**
 * High-level OAuth configuration for all supported platforms.
 * This is intentionally a simple, serializable object so it can be
 * used anywhere in the app without pulling in SDK clients.
 */
const oauthConfig = {
  TikTok: {
    clientKey: process.env.TIKTOK_CLIENT_KEY,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET,
    redirectUri: process.env.TIKTOK_REDIRECT_URI,
    scope: "user.info.basic",
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    userInfoUrl: "https://open.tiktokapis.com/v2/user/info/",
    
    // Validate configuration
    validate() {
      if (!this.clientKey || !this.clientSecret || !this.redirectUri) {
        throw new Error("TikTok OAuth configuration missing. Please set TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, and TIKTOK_REDIRECT_URI");
      }
    },
    
    // Get authorization URL
    getAuthUrl(state) {
      this.validate();
      const params = new URLSearchParams({
        client_key: this.clientKey,
        response_type: "code",
        scope: this.scope,
        redirect_uri: this.redirectUri,
        state: state,
      });
      return `${this.authUrl}?${params.toString()}`;
    },
    
    // Exchange code for tokens
    async getTokens(code) {
      this.validate();
      try {
        const response = await axios.post(this.tokenUrl, {
          client_key: this.clientKey,
          client_secret: this.clientSecret,
          code: code,
          grant_type: "authorization_code",
          redirect_uri: this.redirectUri,
        }, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        });
        
        return response.data;
      } catch (error) {
        throw new Error(`TikTok token exchange failed: ${error.response?.data?.error_description || error.message}`);
      }
    },
    
    // Get user info
    async getUserInfo(accessToken, openId) {
      this.validate();
      try {
        const response = await axios.get(`${this.userInfoUrl}?fields=open_id,union_id,avatar_url,display_name`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        });
        
        return response.data;
      } catch (error) {
        throw new Error(`TikTok user info fetch failed: ${error.response?.data?.error_description || error.message}`);
      }
    }
  },
  
  YouTube: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI,
    scope: "https://www.googleapis.com/auth/youtube.readonly",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    
    validate() {
      if (!this.clientId || !this.clientSecret || !this.redirectUri) {
        throw new Error("YouTube OAuth configuration missing. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and REDIRECT_URI");
      }
    },
    
    getAuthUrl(state) {
      this.validate();
      const params = new URLSearchParams({
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        response_type: "code",
        scope: this.scope,
        access_type: "offline",
        state: state,
        prompt: "consent",
      });
      return `${this.authUrl}?${params.toString()}`;
    },
    
    async getTokens(code) {
      this.validate();
      try {
        const response = await axios.post(this.tokenUrl, {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          grant_type: "authorization_code",
          redirect_uri: this.redirectUri,
        });
        
        return response.data;
      } catch (error) {
        throw new Error(`YouTube token exchange failed: ${error.response?.data?.error_description || error.message}`);
      }
    }
  },
  
  Instagram: {
    clientId: process.env.INSTAGRAM_CLIENT_ID,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    redirectUri: process.env.INSTAGRAM_REDIRECT_URI,
    scope: "instagram_basic,user_media",
    authUrl: "https://api.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    userInfoUrl: "https://graph.instagram.com/me",
    
    validate() {
      if (!this.clientId || !this.clientSecret || !this.redirectUri) {
        throw new Error("Instagram OAuth configuration missing. Please set INSTAGRAM_CLIENT_ID, INSTAGRAM_CLIENT_SECRET, and INSTAGRAM_REDIRECT_URI");
      }
    },
    
    getAuthUrl(state) {
      this.validate();
      const params = new URLSearchParams({
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        response_type: "code",
        scope: this.scope,
        state: state,
      });
      return `${this.authUrl}?${params.toString()}`;
    },
    
    async getTokens(code) {
      this.validate();
      try {
        const response = await axios.post(this.tokenUrl, {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          grant_type: "authorization_code",
          redirect_uri: this.redirectUri,
        });
        
        return response.data;
      } catch (error) {
        throw new Error(`Instagram token exchange failed: ${error.response?.data?.error_description || error.message}`);
      }
    },
    
    async getUserInfo(accessToken) {
      this.validate();
      try {
        const response = await axios.get(`${this.userInfoUrl}?fields=id,username,account_type,media_count`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        });
        
        return response.data;
      } catch (error) {
        throw new Error(`Instagram user info fetch failed: ${error.response?.data?.error_description || error.message}`);
      }
    }
  }
};

/**
 * Backwards-compatible helpers that wrap SDK clients.
 * These are used by the existing accountsController flows.
 */
const YouTube = {
  client: new google.auth.OAuth2(
    oauthConfig.YouTube.clientId,
    oauthConfig.YouTube.clientSecret,
    oauthConfig.YouTube.redirectUri,
  ),

  scopes: [oauthConfig.YouTube.scope],

  getAuthUrl: (state) => {
    return YouTube.client.generateAuthUrl({
      access_type: "offline",
      scope: YouTube.scopes,
      state,
    });
  },

  getTokens: async (code) => {
    const { tokens } = await YouTube.client.getToken(code);
    YouTube.client.setCredentials(tokens);

    const youtube = google.youtube({ version: "v3", auth: YouTube.client });
    const response = await youtube.channels.list({ part: "id", mine: true });

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      username: response.data.items[0].id,
    };
  },
};

const Instagram = {
  baseUrl: "https://graph.instagram.com",

  getAuthUrl: (state) => {
    const params = new URLSearchParams({
      client_id: oauthConfig.Instagram.clientId,
      redirect_uri: oauthConfig.Instagram.redirectUri,
      // For legacy flows we keep using basic scopes; new flows should
      // prefer oauthConfig.Instagram.scope.
      scope: "user_profile,user_media",
      response_type: "code",
      state,
    });
    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  },

  getTokens: async (code) => {
    const response = await axios.post(
      "https://api.instagram.com/oauth/access_token",
      {
        client_id: oauthConfig.Instagram.clientId,
        client_secret: oauthConfig.Instagram.clientSecret,
        grant_type: "authorization_code",
        redirect_uri: oauthConfig.Instagram.redirectUri,
        code,
      },
    );

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      username: response.data.user_id,
    };
  },
};

const TikTok = {
  baseUrl: "https://open-api.tiktok.com",

  getAuthUrl: (state) => {
    const params = new URLSearchParams({
      client_key: oauthConfig.TikTok.clientKey,
      redirect_uri: oauthConfig.TikTok.redirectUri,
      response_type: "code",
      scope: oauthConfig.TikTok.scope,
      state,
    });
    return `${oauthConfig.TikTok.authUrl}?${params.toString()}`;
  },

  getTokens: async (code) => {
    const response = await axios.post(oauthConfig.TikTok.tokenUrl, {
      client_key: oauthConfig.TikTok.clientKey,
      client_secret: oauthConfig.TikTok.clientSecret,
      grant_type: "authorization_code",
      code,
    });

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      username: response.data.open_id,
    };
  },
};

const getYouTubeClient = () => YouTube.client;
const getInstagramAPI = () => Instagram;
const getTikTokAPI = () => TikTok;

module.exports = {
  oauthConfig,
  YouTube,
  Instagram,
  TikTok,
  getYouTubeClient,
  getInstagramAPI,
  getTikTokAPI,
};
