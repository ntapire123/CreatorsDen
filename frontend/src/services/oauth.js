import api from './api';

export const oauth = {
  getUrl: (platform, userId) => {
    const url = `/oauth/${platform}${userId ? `?userId=${userId}` : ''}`;
    return api.get(url);
  },
  connect: (platform, code) => api.post(`/oauth/${platform}/connect`, { code }),
};
