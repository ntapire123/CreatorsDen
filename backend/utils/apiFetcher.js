const axios = require('axios');
const instagramEngagementCache = new Map();
const tiktokEngagementCache = new Map();

function parseNumeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function collectMediaItems(payload) {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (Array.isArray(payload.medias)) {
    return payload.medias;
  }

  if (Array.isArray(payload.posts)) {
    return payload.posts;
  }

  if (Array.isArray(payload.reels)) {
    return payload.reels;
  }

  if (Array.isArray(payload.feed_items)) {
    return payload.feed_items;
  }

  if (payload.data && Array.isArray(payload.data.items)) {
    return payload.data.items;
  }

  return [];
}

function sumInstagramMetrics(items) {
  return items.reduce(
    (acc, item) => {
      const node = item?.node || item;
      const media = node?.media || node;
      const likes =
        parseNumeric(media?.like_count) ||
        parseNumeric(media?.likes) ||
        parseNumeric(media?.edge_media_preview_like?.count) ||
        parseNumeric(media?.edge_liked_by?.count);

      const views =
        parseNumeric(media?.view_count) ||
        parseNumeric(media?.play_count) ||
        parseNumeric(media?.video_view_count) ||
        parseNumeric(media?.video_play_count);

      return {
        likes: acc.likes + likes,
        views: acc.views + views
      };
    },
    { likes: 0, views: 0 }
  );
}

function extractTikTokUser(payload) {
  return (
    payload?.userInfo?.user ||
    payload?.data?.user ||
    payload?.user ||
    payload?.data?.userInfo?.user ||
    null
  );
}

function extractTikTokStats(payload) {
  return (
    payload?.userInfo?.stats ||
    payload?.data?.stats ||
    payload?.stats ||
    payload?.data?.userInfo?.stats ||
    null
  );
}

function collectTikTokPostItems(payload) {
  if (!payload || typeof payload !== 'object') return [];
  return (
    payload?.itemList ||
    payload?.data?.itemList ||
    payload?.items ||
    payload?.data?.items ||
    payload?.aweme_list ||
    []
  );
}

function sumTikTokPostMetrics(items) {
  return items.reduce(
    (acc, item) => {
      const stats = item?.stats || item?.statistics || item;
      return {
        views: acc.views + parseNumeric(stats?.playCount || stats?.play_count || stats?.viewCount || stats?.view_count),
        likes: acc.likes + parseNumeric(stats?.diggCount || stats?.digg_count || stats?.likeCount || stats?.like_count)
      };
    },
    { views: 0, likes: 0 }
  );
}

async function fetchTikTokEngagementAggregate(secUid, apiKey, tiktokHost) {
  const cacheKey = String(secUid || '').toLowerCase();
  const cacheTtlMs = parseNumeric(process.env.TIKTOK_ENGAGEMENT_CACHE_MS) || 5 * 60 * 1000;
  const cached = tiktokEngagementCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < cacheTtlMs) {
    return cached.value;
  }

  const count = String(parseNumeric(process.env.RAPIDAPI_TIKTOK_POSTS_COUNT) || 35);
  const maxPages = parseNumeric(process.env.RAPIDAPI_TIKTOK_MAX_PAGES) || 6;
  const headers = {
    'X-RapidAPI-Key': apiKey,
    'X-RapidAPI-Host': tiktokHost
  };
  let items = [];
  let cursor = 0;
  const seenIds = new Set();

  for (let page = 0; page < maxPages; page++) {
    const postsResponse = await axios.get(
      `https://${tiktokHost}/api/user/posts?secUid=${encodeURIComponent(secUid)}&count=${count}&cursor=${encodeURIComponent(cursor)}`,
      { headers }
    );
    const responseItems = collectTikTokPostItems(postsResponse.data);
    for (const item of responseItems) {
      const itemId = item?.id || item?.aweme_id || item?.awemeId;
      if (itemId && seenIds.has(String(itemId))) {
        continue;
      }
      if (itemId) {
        seenIds.add(String(itemId));
      }
      items.push(item);
    }

    const nextCursor = postsResponse.data?.data?.cursor;
    const hasMore = Boolean(postsResponse.data?.data?.hasMore);
    if (!hasMore || !nextCursor || Number(nextCursor) === Number(cursor)) {
      break;
    }
    cursor = nextCursor;
  }

  const aggregate = sumTikTokPostMetrics(items);
  tiktokEngagementCache.set(cacheKey, { ts: Date.now(), value: aggregate });
  return aggregate;
}

async function fetchInstagramEngagementAggregate(usernameOrUrl, apiKey, instaHost) {
  const cacheKey = String(usernameOrUrl || '').toLowerCase();
  const cacheTtlMs = parseNumeric(process.env.INSTAGRAM_ENGAGEMENT_CACHE_MS) || 5 * 60 * 1000;
  const cached = instagramEngagementCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < cacheTtlMs) {
    return cached.value;
  }

  const postsAmount = String(parseNumeric(process.env.RAPIDAPI_INSTA_POSTS_AMOUNT) || 12);
  const reelsAmount = String(parseNumeric(process.env.RAPIDAPI_INSTA_REELS_AMOUNT) || 20);
  const baseHeaders = {
    'X-RapidAPI-Key': apiKey,
    'X-RapidAPI-Host': instaHost,
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  const requestBodies = {
    posts: new URLSearchParams({
      username_or_url: usernameOrUrl,
      pagination_token: '',
      amount: postsAmount
    }).toString(),
    reels: new URLSearchParams({
      username_or_url: usernameOrUrl,
      pagination_token: '',
      amount: reelsAmount
    }).toString()
  };

  const [postsResponse, reelsResponse] = await Promise.allSettled([
    axios.post(`https://${instaHost}/get_ig_user_posts.php`, requestBodies.posts, { headers: baseHeaders }),
    axios.post(`https://${instaHost}/get_ig_user_reels.php`, requestBodies.reels, { headers: baseHeaders })
  ]);

  const errors = [];
  const postsItems =
    postsResponse.status === 'fulfilled'
      ? collectMediaItems(postsResponse.value?.data)
      : (errors.push(postsResponse.reason), []);
  const reelsItems =
    reelsResponse.status === 'fulfilled'
      ? collectMediaItems(reelsResponse.value?.data)
      : (errors.push(reelsResponse.reason), []);

  if (postsItems.length === 0 && reelsItems.length === 0 && errors.length > 0) {
    throw errors[0];
  }

  const totalsFromPosts = sumInstagramMetrics(postsItems);
  const totalsFromReels = sumInstagramMetrics(reelsItems);
  const aggregate = {
    views: totalsFromPosts.views + totalsFromReels.views,
    likes: totalsFromPosts.likes + totalsFromReels.likes
  };

  instagramEngagementCache.set(cacheKey, {
    ts: Date.now(),
    value: aggregate
  });

  return aggregate;
}

/**
 * Fetches public stats from social media platforms using RapidAPI
 * @param {string} platform - Platform name (YouTube, TikTok, Instagram)
 * @param {string} username - Username to fetch stats for
 * @returns {Object} - { followers, views, likes, avatar }
 */
async function fetchAccountStats(platform, username, options = {}) {
  try {
    switch (platform) {
      case 'YouTube':
        return await fetchYouTubeStats(username);
      case 'TikTok':
        const rapidApiKey = process.env.RAPIDAPI_KEY;
        if (!rapidApiKey) {
          throw new Error('RAPIDAPI_KEY environment variable is not set');
        }
        return await fetchTikTokStats(username, rapidApiKey, options);
      case 'Instagram':
        const rapidApiKeyInsta = process.env.RAPIDAPI_KEY;
        if (!rapidApiKeyInsta) {
          throw new Error('RAPIDAPI_KEY environment variable is not set');
        }
        return await fetchInstagramStats(username, rapidApiKeyInsta, options);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (error) {
    console.error(`Error fetching ${platform} stats for ${username}:`, error.message);
    throw error;
  }
}

/**
 * Fetch YouTube channel statistics using Google YouTube API
 */
async function fetchYouTubeStats(username) {
  try {
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    
    if (!youtubeApiKey) {
      throw new Error('YOUTUBE_API_KEY environment variable is not set');
    }

    console.log('YouTube API - Searching for username:', username);

    // First try to get channel by username
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/channels`, {
      params: {
        part: 'snippet,statistics',
        forUsername: username,
        key: youtubeApiKey
      }
    });

    console.log('YouTube API Response (username):', response.data);

    // If no results, try by custom URL (handle)
    if (!response.data.items || response.data.items.length === 0) {
      console.log('YouTube API - No results for username, trying handle...');
      const customUrlResponse = await axios.get(`https://www.googleapis.com/youtube/v3/channels`, {
        params: {
          part: 'snippet,statistics',
          forHandle: username, // YouTube API expects handle without @
          key: youtubeApiKey
        }
      });
      
      console.log('YouTube API Response (handle):', customUrlResponse.data);
      
      // If still no results, try search approach for handles
      if (!customUrlResponse.data.items || customUrlResponse.data.items.length === 0) {
        console.log('YouTube API - No results for handle, trying search...');
        
        // Remove @ if present for search
        const searchQuery = username.startsWith('@') ? username.substring(1) : username;
        
        const searchResponse = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
          params: {
            part: 'snippet',
            q: searchQuery,
            type: 'channel',
            maxResults: 5,
            key: youtubeApiKey
          }
        });
        
        console.log('YouTube API Search Response:', searchResponse.data);
        
        if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
          throw new Error('YouTube channel not found');
        }
        
        // Get the first search result's channel ID
        const searchResult = searchResponse.data.items[0];
        const channelId = searchResult.snippet?.channelId;
        
        if (!channelId) {
          throw new Error('YouTube channel ID not found in search results');
        }
        
        console.log('YouTube API - Found Channel ID:', channelId);
        
        // Now get the full channel details using the channel ID
        const channelResponse = await axios.get(`https://www.googleapis.com/youtube/v3/channels`, {
          params: {
            part: 'snippet,statistics',
            id: channelId,
            key: youtubeApiKey
          }
        });
        
        console.log('YouTube API Channel Response:', channelResponse.data);
        
        if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
          throw new Error('YouTube channel details not found');
        }
        
        const channel = channelResponse.data.items[0];
        console.log('YouTube API - Final Channel data:', channel);
        console.log('YouTube API - Final Statistics:', channel.statistics);
        
        const followers = parseInt(channel.statistics?.subscriberCount || 0);
        const views = parseInt(channel.statistics?.viewCount || 0);
        
        console.log('YouTube API - Final Parsed stats:', { followers, views });
        
        return {
          followers: followers,
          views: views,
          avatar: channel.snippet?.thumbnails?.default?.url || null
        };
      }
      
      const channel = customUrlResponse.data.items[0];
      console.log('YouTube API - Channel data:', channel);
      console.log('YouTube API - Statistics:', channel.statistics);
      
      const followers = parseInt(channel.statistics?.subscriberCount || 0);
      const views = parseInt(channel.statistics?.viewCount || 0);
      
      console.log('YouTube API - Parsed stats:', { followers, views });
      
      return {
        followers: followers,
        views: views,
        avatar: channel.snippet?.thumbnails?.default?.url || null
      };
    }

    const channel = response.data.items[0];
    console.log('YouTube API - Channel data (username):', channel);
    console.log('YouTube API - Statistics (username):', channel.statistics);
    
    const followers = parseInt(channel.statistics?.subscriberCount || 0);
    const views = parseInt(channel.statistics?.viewCount || 0);
    
    console.log('YouTube API - Parsed stats (username):', { followers, views });
    
    return {
      followers: followers,
      views: views,
      avatar: channel.snippet?.thumbnails?.default?.url || null
    };
  } catch (error) {
    console.error('YouTube API error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });

    if (error.response?.status === 404 || error.response?.status === 403) {
      throw new Error('YouTube channel not found or API key invalid');
    }
    throw new Error(`Failed to fetch YouTube stats: ${error.message}`);
  }
}

/**
 * Extract YouTube video ID from supported URL formats.
 * @param {string} url
 * @returns {string|null}
 */
function extractYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;

  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/i,
    /youtu\.be\/([^?&/]+)/i,
    /youtube\.com\/shorts\/([^?&/]+)/i,
    /youtube\.com\/embed\/([^?&/]+)/i
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Fetch YouTube video viewCount by video ID.
 * @param {string} videoId
 * @returns {number}
 */
async function fetchYouTubeVideoViewCount(videoId) {
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  if (!youtubeApiKey) {
    throw new Error('YOUTUBE_API_KEY environment variable is not set');
  }

  const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: {
      part: 'statistics',
      id: videoId,
      key: youtubeApiKey
    }
  });

  const video = response.data?.items?.[0];
  if (!video) {
    throw new Error('YouTube video not found');
  }

  return parseInt(video.statistics?.viewCount || 0, 10);
}

/**
 * Fetch TikTok user statistics using RapidAPI
 */
async function fetchTikTokStats(username, apiKey, options = {}) {
  try {
    const tiktokHost = process.env.RAPIDAPI_TIKTOK_HOST;
    const tiktokEndpoint = process.env.RAPIDAPI_TIKTOK_ENDPOINT || '/api/user/info-with-region';
    const normalizedUsername = String(username || '').replace(/^@/, '');
    
    if (!tiktokHost) {
      throw new Error('RAPIDAPI_TIKTOK_HOST environment variable is not set');
    }

    console.log('RAPIDAPI FETCH TRIGGERED FOR:', normalizedUsername);
    const response = await axios.get(
      `https://${tiktokHost}${tiktokEndpoint}?uniqueId=${encodeURIComponent(normalizedUsername)}`,
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': tiktokHost
        }
      }
    );

    const user = extractTikTokUser(response.data);
    const stats = extractTikTokStats(response.data);
    if (!user && !stats) {
      throw new Error('TikTok user not found');
    }

    let aggregated = { views: 0, likes: 0 };
    if (options.includeEngagementAggregation) {
      const secUid = user?.secUid || user?.sec_uid || response.data?.userInfo?.user?.secUid;
      if (secUid) {
        try {
          aggregated = await fetchTikTokEngagementAggregate(secUid, apiKey, tiktokHost);
        } catch (aggregateError) {
          console.warn(`TikTok engagement aggregate fallback for ${normalizedUsername}:`, aggregateError.message);
        }
      }
    }

    const profileLikes = parseNumeric(
      stats?.heartCount || stats?.heart_count || stats?.diggCount || stats?.digg_count
    );

    return {
      followers: parseInt(stats?.followerCount || stats?.follower_count || 0),
      // Never use videoCount as "views"; it is the number of uploaded videos.
      views: parseInt(aggregated.views || stats?.playCount || stats?.play_count || 0),
      likes: parseInt(Math.max(aggregated.likes || 0, profileLikes)),
      avatar: user?.avatarLarger || user?.avatarMedium || user?.avatarThumb || null
    };
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('TikTok user not found');
    }
    throw new Error(`Failed to fetch TikTok stats: ${error.message}`);
  }
}

/**
 * Fetch Instagram user statistics using RapidAPI
 */
async function fetchInstagramStats(username, apiKey, options = {}) {
  try {
    const instaHost = process.env.RAPIDAPI_INSTA_HOST;
    const configuredEndpoint = process.env.RAPIDAPI_INSTA_ENDPOINT || '/ig_get_fb_profile_v3.php';
    const normalizedUsername = String(username || '').replace(/^@/, '');
    
    if (!instaHost) {
      throw new Error('RAPIDAPI_INSTA_HOST environment variable is not set');
    }

    console.log('RAPIDAPI FETCH TRIGGERED FOR:', normalizedUsername, `(endpoint=${configuredEndpoint}, method=POST)`);
    const response = await axios.post(
      `https://${instaHost}${configuredEndpoint}`,
      new URLSearchParams({ username_or_url: normalizedUsername }).toString(),
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': instaHost,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // Some RapidAPI proxies return plain text like "429 - undefined" with 200 status.
    if (typeof response.data === 'string') {
      if (response.data.includes('429')) {
        throw new Error('Instagram API rate limit exceeded. Please try again later.');
      }
      if (response.data.includes('403')) {
        throw new Error('Instagram API access forbidden (403). Check API plan/permissions.');
      }
      throw new Error(`Unexpected Instagram API response: ${response.data.slice(0, 120)}`);
    }

    const user = response.data?.user || response.data?.data || response.data;
    if (!user) {
      throw new Error('Instagram user not found');
    }

    const followersRaw =
      user.follower_count ||
      user.followers ||
      user.edge_followed_by?.count ||
      user.user?.follower_count ||
      user.user?.followers ||
      user.user?.edge_followed_by?.count ||
      0;

    const avatarRaw =
      user.profile_pic_url ||
      user.profile_pic_url_hd ||
      user.hd_profile_pic_url_info?.url ||
      user.user?.profile_pic_url ||
      user.user?.profile_pic_url_hd ||
      user.user?.hd_profile_pic_url_info?.url ||
      null;
    let aggregated = { views: 0, likes: 0 };
    const includeEngagementAggregation = Boolean(options.includeEngagementAggregation);
    if (includeEngagementAggregation) {
      try {
        aggregated = await fetchInstagramEngagementAggregate(normalizedUsername, apiKey, instaHost);
      } catch (aggregateError) {
        console.warn(`Instagram engagement aggregate fallback for ${normalizedUsername}:`, aggregateError.message);
      }
    }

    const viewsRaw =
      aggregated.views ||
      user.total_video_views ||
      user.total_views ||
      user.video_view_count ||
      user.user?.total_video_views ||
      user.user?.total_views ||
      user.user?.video_view_count ||
      0;
    const likesRaw =
      aggregated.likes ||
      user.total_likes ||
      user.like_count ||
      user.likes ||
      user.user?.total_likes ||
      user.user?.like_count ||
      user.user?.likes ||
      0;

    return {
      followers: parseInt(followersRaw || 0),
      views: parseInt(viewsRaw || 0),
      likes: parseInt(likesRaw || 0),
      avatar: avatarRaw
    };
  } catch (error) {
    console.error('Instagram API Error Details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.status === 404) {
      throw new Error('Instagram user not found');
    } else if (error.response?.status === 403) {
      throw new Error(
        `Instagram API access forbidden (403). Check RapidAPI subscription/key/host/endpoint. Details: ${error.response?.data?.message || error.message}`
      );
    } else if (error.response?.status === 429) {
      throw new Error('Instagram API rate limit exceeded. Please try again later.');
    }
    throw new Error(`Failed to fetch Instagram stats: ${error.message}`);
  }
}

/**
 * Parse social media URL to extract platform and username
 * @param {string} url - Social media profile URL
 * @returns {Object} - { platform, username }
 */
function parseSocialUrl(url) {
  // Brute force platform detection as fallback
  let platform;
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    platform = 'YouTube';
  } else if (url.includes('tiktok.com')) {
    platform = 'TikTok';
  } else if (url.includes('instagram.com')) {
    platform = 'Instagram';
  } else {
    throw new Error("Could not detect platform from URL");
  }

  const urlPatterns = {
    youtube: [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/@?([^\/\?]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/c\/([^\/\?]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/user\/([^\/\?]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/channel\/([^\/\?]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^\/\?]+)/
    ],
    tiktok: [
      /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([^\/\?]+)/,
      /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/t\/([^\/\?]+)/
    ],
    instagram: [
      /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^\/\?]+)/
    ]
  };

  for (const [platformKey, patterns] of Object.entries(urlPatterns)) {
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        // Ensure proper platform capitalization
        let normalizedPlatform = platformKey.charAt(0).toUpperCase() + platformKey.slice(1);
        if (normalizedPlatform === 'Youtube') {
          normalizedPlatform = 'YouTube'; // Fix capitalization
        }
        return {
          platform: normalizedPlatform,
          username: match[1]
        };
      }
    }
  }

  // If regex parsing fails, return the brute force detected platform
  // and try to extract username with a simple approach
  let username = '';
  if (platform === 'YouTube') {
    const match = url.match(/(?:youtube\.com\/@|youtube\.com\/c\/|youtube\.com\/user\/|youtu\.be\/)([^\/\?]+)/);
    username = match ? match[1] : 'unknown';
  } else if (platform === 'TikTok') {
    const match = url.match(/tiktok\.com\/@([^\/\?]+)/);
    username = match ? match[1] : 'unknown';
  } else if (platform === 'Instagram') {
    const match = url.match(/instagram\.com\/([^\/\?]+)/);
    username = match ? match[1] : 'unknown';
  }

  return {
    platform: platform,
    username: username
  };
}

module.exports = {
  fetchAccountStats,
  parseSocialUrl,
  extractYouTubeVideoId,
  fetchYouTubeVideoViewCount
};
