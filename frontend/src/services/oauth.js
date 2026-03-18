import api from './api';

export const oauth = {
  // 1. We ask the backend for the URL (Protected by Token)
  initiate: (platform) => {
    return api.get(`/accounts/auth/${platform}`); 
  },
  
  // 2. We send the code back to the backend
  connect: (platform, code) => {
    return api.post(`/accounts/callback/${platform}`, { code });
  }
};
