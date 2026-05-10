import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://ipl-dcc6.onrender.com';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add JWT interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ipl_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ipl_token');
      localStorage.removeItem('ipl_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE };
