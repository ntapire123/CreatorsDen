import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 5000,
});

// Request interceptor to add the token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors and other errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location = '/login';
    }

    const errorMessage = error.response?.data?.message || error.message;
    return Promise.reject(new Error(errorMessage));
  }
);

export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, role) => api.post('/auth/register', { email, password, role }),
};

export const creator = {
  getAccounts: () => api.get('/creator/accounts'),
  deleteAccount: (accountId) => api.delete(`/creator/accounts/${accountId}`),
  getMetricsAggregated: () => api.get('/creator/metrics-aggregated'),
  getPlatformStats: () => api.get('/creator/platform-stats'),
};

export const admin = {
  getAllCreators: () => api.get('/admin/all-creators'),
  getTopPerformers: () => api.get('/admin/top-performers'),
  getCreatorDetails: (creatorId) => api.get(`/admin/creator/${creatorId}`),
  createCreator: ({ email, name, password }) => api.post('/admin/create-creator', { email, name, password }),
};

export { oauth } from './oauth';

export default api;
