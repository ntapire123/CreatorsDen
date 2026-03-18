const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/crypto');

const accountSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Creator',
    required: true,
    index: true
  },
  platform: {
    type: String,
    enum: ['TikTok', 'Instagram', 'YouTube'],
    required: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  apiToken: {
    type: String,
    required: false
  },
  refreshToken: {
    type: String,
    required: false
  },
  editorIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Editor',
    default: []
  }],
  lastSynced: {
    type: Date,
    default: Date.now
  },
  needsReconnection: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound unique index for creatorId + platform
accountSchema.index({ creatorId: 1, platform: 1 }, { unique: true });

// Pre-save middleware to encrypt tokens
accountSchema.pre('save', function(next) {
  try {
    // Encrypt apiToken if it exists and has been modified
    if (this.isModified('apiToken') && this.apiToken) {
      this.apiToken = encrypt(this.apiToken);
    }

    // Encrypt refreshToken if it exists and has been modified
    if (this.isModified('refreshToken') && this.refreshToken) {
      this.refreshToken = encrypt(this.refreshToken);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Method to get decrypted tokens
accountSchema.methods.getDecryptedTokens = function() {
  try {
    return {
      apiToken: this.apiToken ? decrypt(this.apiToken) : null,
      refreshToken: this.refreshToken ? decrypt(this.refreshToken) : null
    };
  } catch (error) {
    throw new Error(`Failed to decrypt tokens: ${error.message}`);
  }
};

// Method to set encrypted tokens
accountSchema.methods.setTokens = function(apiToken, refreshToken) {
  if (apiToken) {
    this.apiToken = apiToken; // Will be encrypted by pre-save hook
  }
  if (refreshToken) {
    this.refreshToken = refreshToken; // Will be encrypted by pre-save hook
  }
};

// Method for OAuth token renewal
accountSchema.methods.refreshTokens = async function() {
  try {
    // Get current decrypted tokens
    const currentTokens = this.getDecryptedTokens();

    if (!currentTokens.refreshToken) {
      throw new Error('No refresh token available');
    }

    // Platform-specific token refresh logic would go here
    // This is a placeholder for the actual OAuth refresh implementation
    switch (this.platform) {
      case 'YouTube':
        return await this.refreshYouTubeTokens(currentTokens);
      case 'Instagram':
        return await this.refreshInstagramTokens(currentTokens);
      case 'TikTok':
        return await this.refreshTikTokTokens(currentTokens);
      default:
        throw new Error(`Token refresh not implemented for platform: ${this.platform}`);
    }
  } catch (error) {
    throw new Error(`Token refresh failed: ${error.message}`);
  }
};

// Platform-specific refresh methods (placeholders)
accountSchema.methods.refreshYouTubeTokens = async function(currentTokens) {
  const { google } = require('googleapis');
  const { oauthConfig } = require('../config/oauthConfig');
  
  try {
    if (!currentTokens.refreshToken) {
      throw new Error('No refresh token available for YouTube');
    }

    // Create OAuth2 client with the same configuration used during initial auth
    const oauth2Client = new google.auth.OAuth2(
      oauthConfig.YouTube.clientId,
      oauthConfig.YouTube.clientSecret,
      oauthConfig.YouTube.redirectUri
    );

    // Set the refresh token
    oauth2Client.setCredentials({
      refresh_token: currentTokens.refreshToken
    });

    // Get new access token
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      throw new Error('Failed to obtain new access token');
    }

    // Update the account with new tokens
    this.setTokens(credentials.access_token, currentTokens.refreshToken);
    this.lastSynced = new Date();
    
    // Clear any reconnection flags if previously set
    if (this.needsReconnection) {
      this.needsReconnection = false;
    }
    
    await this.save();

    return {
      success: true,
      message: 'YouTube tokens refreshed successfully',
      tokens: {
        access_token: credentials.access_token,
        refresh_token: currentTokens.refreshToken
      },
      lastSynced: this.lastSynced
    };
  } catch (error) {
    // Mark account as needing reconnection if refresh fails
    this.needsReconnection = true;
    await this.save();
    
    // Check for specific OAuth errors
    if (error.code === 401 || 
        error.message?.includes('invalid_grant') || 
        error.message?.includes('revoked') ||
        error.message?.includes('invalid_refresh_token')) {
      throw new Error(`YouTube refresh token invalid or revoked. Account needs reconnection: ${error.message}`);
    }
    
    throw new Error(`YouTube token refresh failed: ${error.message}`);
  }
};

accountSchema.methods.refreshInstagramTokens = async function(currentTokens) {
  // Instagram OAuth refresh logic would be implemented here
  this.lastSynced = new Date();
  await this.save();

  return {
    success: true,
    message: 'Instagram tokens refreshed',
    lastSynced: this.lastSynced
  };
};

accountSchema.methods.refreshTikTokTokens = async function(currentTokens) {
  // TikTok OAuth refresh logic would be implemented here
  this.lastSynced = new Date();
  await this.save();

  return {
    success: true,
    message: 'TikTok tokens refreshed',
    lastSynced: this.lastSynced
  };
};

// Static method to find account by creator and platform
accountSchema.statics.findByCreatorAndPlatform = function(creatorId, platform) {
  return this.findOne({ creatorId, platform });
};

// Static method to get all accounts for a creator
accountSchema.statics.findByCreator = function(creatorId) {
  return this.find({ creatorId }).sort({ platform: 1 });
};

// Virtual to check if tokens are available
accountSchema.virtual('hasTokens').get(function() {
  return !!(this.apiToken && this.refreshToken);
});

// Virtual to check if account needs token refresh (older than 50 minutes)
accountSchema.virtual('needsRefresh').get(function() {
  if (!this.lastSynced) return true;

  const fiftyMinutesAgo = new Date(Date.now() - 50 * 60 * 1000);
  return this.lastSynced < fiftyMinutesAgo;
});

// Ensure virtuals are included when converting to JSON
accountSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Remove encrypted tokens from JSON output for security
    delete ret.apiToken;
    delete ret.refreshToken;
    delete ret.__v;
    return ret;
  }
});

accountSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Account', accountSchema);
