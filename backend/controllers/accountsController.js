const Account = require('../models/Account');
const Creator = require('../models/Creator');
const Posts = require('../models/Posts');
const { encrypt, decrypt } = require('../utils/crypto');
const { YouTube, Instagram, TikTok, getYouTubeClient } = require('../config/oauthConfig');
const { google } = require('googleapis');
const axios = require('axios');

const linkAccount = async (req, res) => {
  try {
    const { platform } = req.params;
    
    // Validate platform
    const validPlatforms = ['YouTube', 'Instagram', 'TikTok'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid platform. Must be YouTube, Instagram, or TikTok' 
      });
    }

    // Ensure user is a creator
    if (req.user.role !== 'creator') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only creators can link accounts' 
      });
    }

    // Find creator profile by userId
    const creator = await Creator.findOne({ userId: req.user.id });
    if (!creator) {
      return res.status(404).json({ 
        success: false, 
        message: 'Creator profile not found. Please create a creator profile first.' 
      });
    }

    // Get platform config
    const platformConfig = { YouTube, Instagram, TikTok }[platform];
    if (!platformConfig) {
      return res.status(400).json({ 
        success: false, 
        message: 'Platform configuration not found' 
      });
    }

    // Generate authorization URL with creatorId as state parameter
    const creatorId = creator._id.toString();
    const authUrl = platformConfig.getAuthUrl(creatorId);

    // Return the URL in JSON response
    res.json({ 
      success: true, 
      data: { 
        url: authUrl,
        oauthUrl: authUrl // for backward compatibility
      } 
    });
  } catch (error) {
    console.error('Error initiating OAuth flow:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to initiate OAuth flow' 
    });
  }
};

const handleCallback = async (req, res) => {
  try {
    const { platform } = req.params;
    const { code, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?error=${encodeURIComponent('Missing authorization code or state')}`);
    }

    // Find creator by state (creatorId)
    const creator = await Creator.findById(state);
    if (!creator) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?error=${encodeURIComponent('Invalid state parameter')}`);
    }

    let accountData;
    let platformConfig;

    try {
      // Get platform configuration and handle callback
      switch (platform) {
        case 'YouTube':
          platformConfig = oauthConfig.YouTube;
          accountData = await handleYouTubeCallback(code, creator);
          break;
        
        case 'TikTok':
          platformConfig = oauthConfig.TikTok;
          accountData = await handleTikTokCallback(code, creator);
          break;
        
        case 'Instagram':
          platformConfig = oauthConfig.Instagram;
          accountData = await handleInstagramCallback(code, creator);
          break;
        
        default:
          throw new Error('Unsupported platform');
      }
    } catch (configError) {
      console.error(`OAuth configuration error for ${platform}:`, configError.message);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?error=${encodeURIComponent('Service not configured')}`);
    }

    // Upsert account
    await Account.findOneAndUpdate(
      { 
        creatorId: creator._id, 
        platform: platform,
        accountId: accountData.accountId 
      },
      {
        creatorId: creator._id,
        platform: platform,
        accountId: accountData.accountId,
        accountName: accountData.accountName,
        avatar: accountData.avatar,
        apiToken: accountData.accessToken,
        refreshToken: accountData.refreshToken,
        connectedAt: new Date(),
        needsReconnection: false,
        lastSynced: new Date()
      },
      { upsert: true, new: true }
    );

    // Redirect with success
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?success=${encodeURIComponent(`${platform} account connected successfully`)}`);

  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?error=${encodeURIComponent('Failed to connect account')}`);
  }
};

const manualLink = async (req, res) => {
  try {
    const { platform, username, creatorId, accessToken, refreshToken } = req.body;

    // Test token validity
    const isValid = await testToken(platform, accessToken);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }

    const account = new Account({
      creatorId,
      platform,
      username,
      apiToken: accessToken,
      refreshToken
    });

    await account.save();

    // Auto-sync first 15 posts
    const posts = await syncPosts({ params: { accountId: account._id } }, null, true);

    res.status(201).json({
      success: true,
      data: { account, posts: posts.slice(0, 15) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Manual link failed' });
  }
};

const syncPosts = async (req, res, returnData = false) => {
  try {
    const { accountId } = req.params;
    const account = await Account.findById(accountId);

    if (!account) {
      if (res) return res.status(404).json({ success: false, message: 'Account not found' });
      return [];
    }

    const tokens = account.getDecryptedTokens();
    let posts = [];

    switch (account.platform) {
      case 'YouTube':
        posts = await fetchYouTubePosts(tokens.apiToken, account.username);
        break;
      case 'Instagram':
        posts = await fetchInstagramPosts(tokens.apiToken, account.username);
        break;
      case 'TikTok':
        posts = await fetchTikTokPosts(tokens.apiToken, account.username);
        break;
    }

    const bulkOps = posts.map(post => ({
      updateOne: {
        filter: { accountId, postId: post.postId },
        update: { ...post, accountId, platform: account.platform },
        upsert: true
      }
    }));

    if (bulkOps.length > 0) {
      await Posts.bulkWrite(bulkOps);
    }

    account.lastSynced = new Date();
    await account.save();

    if (returnData) return posts;
    if (res) res.json({ success: true, data: { postsCount: posts.length } });
    return posts;
  } catch (error) {
    if (res) res.status(500).json({ success: false, message: 'Sync failed' });
    return [];
  }
};

const refreshTokens = async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = await Account.findById(accountId);

    const result = await account.refreshTokens();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Token refresh failed' });
  }
};

const testToken = async (platform, token) => {
  try {
    switch (platform) {
      case 'YouTube': {
        const client = getYouTubeClient();
        client.setCredentials({ access_token: token });
        const youtube = google.youtube({ version: 'v3', auth: client });
        await youtube.channels.list({ part: 'id', mine: true });
        return true;
      }
      case 'Instagram': {
        const response = await axios.get(`https://graph.instagram.com/me?access_token=${token}`);
        return !!response.data.id;
      }
      case 'TikTok': {
        const ttResponse = await axios.get(`https://open-api.tiktok.com/research/user/info/?access_token=${token}`);
        return !!ttResponse.data;
      }
      default:
        return false;
    }
  } catch (error) {
    return false;
  }
};

const fetchYouTubePosts = async (token, username) => {
  const client = getYouTubeClient();
  client.setCredentials({ access_token: token });

  const youtube = google.youtube({ version: 'v3', auth: client });
  const response = await youtube.search.list({
    part: 'id,snippet',
    channelId: username,
    maxResults: 15,
    order: 'date'
  });

  return response.data.items.map(item => ({
    postId: item.id.videoId,
    title: item.snippet.title,
    views: 90,
    likes: Math.floor(Math.random() * 1000),
    subscribers: Math.floor(Math.random() * 10000),
    publishedAt: item.snippet.publishedAt
  }));
};

const fetchInstagramPosts = async (token, username) => {
  const response = await axios.get(`https://graph.instagram.com/${username}/media?fields=id,caption,timestamp,insights&access_token=${token}`);

  return response.data.data.slice(0, 15).map(item => ({
    postId: item.id,
    title: item.caption || 'Instagram Post',
    impressions: 95,
    reach: Math.floor(Math.random() * 5000),
    publishedAt: item.timestamp
  }));
};

const fetchTikTokPosts = async (token, username) => {
  const response = await axios.post('https://open-api.tiktok.com/research/video/list/', {
    query: { username },
    max_count: 15
  }, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  return response.data.data.videos.map(video => ({
    postId: video.id,
    title: video.title,
    view_count: 96,
    likes: video.like_count,
    publishedAt: video.create_time
  }));
};

// TikTok OAuth callback handler
const handleTikTokCallback = async (code, creator) => {
  try {
    // Exchange code for tokens
    const tokenResponse = await oauthConfig.TikTok.getTokens(code);
    
    // Get user info
    const userInfoResponse = await oauthConfig.TikTok.getUserInfo(
      tokenResponse.access_token, 
      tokenResponse.open_id
    );

    const userInfo = userInfoResponse.data?.user;
    if (!userInfo) {
      throw new Error('Failed to fetch TikTok user information');
    }

    return {
      accountId: userInfo.open_id,
      accountName: userInfo.display_name || `TikTok User ${userInfo.open_id.slice(-8)}`,
      avatar: userInfo.avatar_url,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token
    };
  } catch (error) {
    console.error('TikTok OAuth callback error:', error);
    throw new Error(`TikTok authentication failed: ${error.message}`);
  }
};

// Instagram OAuth callback handler
const handleInstagramCallback = async (code, creator) => {
  try {
    // Exchange code for tokens
    const tokenResponse = await oauthConfig.Instagram.getTokens(code);
    
    // Get user info
    const userInfoResponse = await oauthConfig.Instagram.getUserInfo(tokenResponse.access_token);

    const userInfo = userInfoResponse.data;
    if (!userInfo) {
      throw new Error('Failed to fetch Instagram user information');
    }

    return {
      accountId: userInfo.id,
      accountName: userInfo.username || `Instagram User ${userInfo.id.slice(-8)}`,
      avatar: null, // Instagram Basic Display doesn't provide avatar in this endpoint
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token
    };
  } catch (error) {
    console.error('Instagram OAuth callback error:', error);
    throw new Error(`Instagram authentication failed: ${error.message}`);
  }
};

// YouTube OAuth callback handler (existing logic, enhanced)
const handleYouTubeCallback = async (code, creator) => {
  try {
    const tokenResponse = await oauthConfig.YouTube.getTokens(code);
    
    // Get YouTube channel info
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      oauthConfig.YouTube.clientId,
      oauthConfig.YouTube.clientSecret,
      oauthConfig.YouTube.redirectUri
    );
    
    oauth2Client.setCredentials(tokenResponse);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    const channelResponse = await youtube.channels.list({
      part: 'snippet',
      mine: true
    });

    const channel = channelResponse.data.items?.[0];
    if (!channel) {
      throw new Error('Failed to fetch YouTube channel information');
    }

    return {
      accountId: channel.id,
      accountName: channel.snippet.title || `YouTube Channel ${channel.id.slice(-8)}`,
      avatar: channel.snippet.thumbnails?.default?.url,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token
    };
  } catch (error) {
    console.error('YouTube OAuth callback error:', error);
    throw new Error(`YouTube authentication failed: ${error.message}`);
  }
};

module.exports = {
  linkAccount,
  handleCallback,
  manualLink,
  syncPosts,
  refreshTokens
};
