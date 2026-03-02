import axios from 'axios';

const API_URL = import.meta.env.PROD
    ? (import.meta.env.VITE_API_URL || 'https://your-backend.onrender.com/api')
    : '/api';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const session = localStorage.getItem('jumuia_resort_session');
    if (session) {
        try {
            const { token } = JSON.parse(session);
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (e) {
            // ignore parse errors
        }
    }
    return config;
});

// Handle 401 responses
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('jumuia_resort_session');
            sessionStorage.removeItem('jumuia_auth');
            if (!window.location.pathname.includes('/admin/login')) {
                window.location.href = '/admin/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
