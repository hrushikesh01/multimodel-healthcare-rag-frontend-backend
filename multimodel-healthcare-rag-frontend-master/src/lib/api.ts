import axios from 'axios';

// Get base URL from env and strip literal regular/double quotes if they were passed literally
const rawUrl = (import.meta.env.VITE_API_URL || '').replace(/^"(.*)"$/, '$1').replace(/\/$/, '');

const api = axios.create({
  // No automatic /api here, all components will explicitly use /api/ paths
  baseURL: rawUrl || '',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('healthcare_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
