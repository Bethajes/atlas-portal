import axios from 'axios';

function apiBaseUrl() {
  const raw = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
  if (!raw) return 'http://localhost:5000/api';
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

const BASE_URL = apiBaseUrl();

function getAccessToken() {
  return sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
}

function getRefreshTokenInfo() {
  const sessionToken = sessionStorage.getItem('refreshToken');
  if (sessionToken) return { refreshToken: sessionToken, storage: sessionStorage };
  const localToken = localStorage.getItem('refreshToken');
  if (localToken) return { refreshToken: localToken, storage: localStorage };
  return { refreshToken: null, storage: null };
}

function clearAuthStorage() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('user');
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - ONLY handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Only attempt refresh for 401 errors and if we haven't tried already
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const { refreshToken, storage } = getRefreshTokenInfo();
      
      // If no refresh token, just fail
      if (!refreshToken) {
        console.log('No refresh token available');
        clearAuthStorage();
        return Promise.reject(error);
      }
      
      try {
        // Try to refresh the token
        const response = await axios.post(`${BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });
        
        const { accessToken } = response.data;
        (storage || localStorage).setItem('accessToken', accessToken);
        
        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        // Refresh failed - clear everything
        console.log('Token refresh failed');
        clearAuthStorage();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
