import axios from 'axios';

const isDev = import.meta.env.DEV;
const baseURL = import.meta.env.VITE_API_URL || (isDev ? 'http://localhost:5050' : '');

const api = axios.create({
  baseURL,
});


// Interceptor to inject JWT from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
