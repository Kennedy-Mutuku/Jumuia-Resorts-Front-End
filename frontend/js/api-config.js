// API Configuration for Jumuia Resorts
const CONFIG = {
    API_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000/api'
        : 'https://your-production-api.com/api',
    ENDPOINTS: {
        BOOKINGS: '/bookings',
        OFFERS: '/offers',
        FEEDBACK: '/feedback'
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.API_CONFIG = CONFIG;
}
