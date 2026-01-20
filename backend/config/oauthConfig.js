const { google } = require("googleapis");
const axios = require("axios");

const YouTube = {
  client: new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI,
  ),

  scopes: ["https://www.googleapis.com/auth/youtube.readonly"],

  getAuthUrl: (userId) => {
    return YouTube.client.generateAuthUrl({
      access_type: "offline",
      scope: YouTube.scopes,
      state: userId,
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

  getAuthUrl: (userId) => {
    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID,
      redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
      scope: "user_profile,user_media",
      response_type: "code",
      state: userId,
    });
    return `https://api.instagram.com/oauth/authorize?${params}`;
  },

  getTokens: async (code) => {
    const response = await axios.post(
      "https://api.instagram.com/oauth/access_token",
      {
        client_id: process.env.INSTAGRAM_CLIENT_ID,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
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

  getAuthUrl: (userId) => {
    const params = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      redirect_uri: process.env.TIKTOK_REDIRECT_URI,
      response_type: "code",
      scope: "research.data.basic",
      state: userId,
    });
    return `https://www.tiktok.com/auth/authorize?${params}`;
  },

  getTokens: async (code) => {
    const response = await axios.post(
      "https://open-api.tiktok.com/research/token/",
      {
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
      },
    );

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
  YouTube,
  Instagram,
  TikTok,
  getYouTubeClient,
  getInstagramAPI,
  getTikTokAPI,
};
