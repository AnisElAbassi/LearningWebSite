import axios from 'axios';

// One-time migration from old token keys
if (localStorage.getItem('nexus_token') && !localStorage.getItem('pg_token')) {
  localStorage.setItem('pg_token', localStorage.getItem('nexus_token'));
  localStorage.setItem('pg_user', localStorage.getItem('nexus_user'));
  localStorage.removeItem('nexus_token');
  localStorage.removeItem('nexus_user');
}

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pg_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pg_token');
      localStorage.removeItem('pg_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
