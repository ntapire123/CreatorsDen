import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 15000, // Increased from 5000ms to 15000ms
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
  (response) => response,
  (error) => {
    // Handle timeout errors specifically
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      showToast('error', 'Request timed out. The server is taking longer than expected to respond. Please try again.');
      return Promise.reject(error);
    }
    
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Show user-friendly message
      const errorMessage = error.response.data?.message || 'Your session has expired. Please log in again.';
      
      // Create toast notification
      showToast('error', errorMessage);
      
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      
      return Promise.reject(error);
    }
    
    // Handle 500 Server errors
    if (error.response?.status === 500) {
      const errorMessage = error.response.data?.message || 'Server error. Please try again later.';
      showToast('error', errorMessage);
      return Promise.reject(error);
    }
    
    // Handle 403 Forbidden errors
    if (error.response?.status === 403) {
      const errorMessage = error.response.data?.message || 'Access denied. You do not have permission to perform this action.';
      showToast('error', errorMessage);
      return Promise.reject(error);
    }
    
    // Handle network errors
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      showToast('error', 'Network error. Please check your internet connection.');
      return Promise.reject(error);
    }
    
    // Handle connection refused errors
    if (error.code === 'ECONNREFUSED') {
      showToast('error', 'Cannot connect to the server. Please make sure the backend is running.');
      return Promise.reject(error);
    }
    
    // Handle other errors
    const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred.';
    showToast('error', errorMessage);
    
    return Promise.reject(error);
  }
);

// Toast notification function
function showToast(type, message) {
  // Create toast element if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.style.cssText = `
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    min-width: 300px;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideIn 0.3s ease-out;
    background-color: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3'};
  `;
  toast.textContent = message;
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  if (!document.head.querySelector('style[data-toast-animations]')) {
    style.setAttribute('data-toast-animations', 'true');
    document.head.appendChild(style);
  }
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Remove after 5 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 5000);
}

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
