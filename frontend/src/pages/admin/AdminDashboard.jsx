import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function AdminDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [currentProperty, setCurrentProperty] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, [currentProperty]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const res = await api.get('/stats', { params: { resort: currentProperty } });
            setStats(res.data);
        } catch (err) {
            console.error('Failed to load stats:', err);
        }
        setLoading(false);
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const properties = user?.role === 'general-manager'
        ? ['all', 'limuru', 'kanamai', 'kisumu']
        : user?.properties || ['all'];

    return (
        <div>
            <div className="admin-page-header">
                <h1>{getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'}</h1>
                <p style={{ color: 'var(--text-light)' }}>
                    {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {/* Property Filter */}
            {properties.length > 1 && (
                <div className="property-selector">
                    {properties.map(prop => (
                        <button key={prop} className={`property-btn ${currentProperty === prop ? 'active' : ''}`}
                            onClick={() => setCurrentProperty(prop)}>
                            {prop === 'all' ? 'All Properties' : prop.charAt(0).toUpperCase() + prop.slice(1)}
                        </button>
                    ))}
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon green"><i className="fas fa-dollar-sign"></i></div>
                            <div className="stat-info">
                                <h3>KES {(stats?.global?.totalRevenue || 0).toLocaleString()}</h3>
                                <p>Total Revenue</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon orange"><i className="fas fa-calendar-check"></i></div>
                            <div className="stat-info">
                                <h3>{stats?.global?.totalBookings || 0}</h3>
                                <p>Total Bookings</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon blue"><i className="fas fa-bed"></i></div>
                            <div className="stat-info">
                                <h3>{stats?.global?.totalOccupancy || 0}%</h3>
                                <p>Occupancy Rate</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: '#9c27b0' }}><i className="fas fa-star"></i></div>
                            <div className="stat-info">
                                <h3>{stats?.global?.avgRating || 0}</h3>
                                <p>Average Rating</p>
                            </div>
                        </div>
                    </div>

                    {/* Property Performance */}
                    <div className="admin-card">
                        <h3>Property Performance</h3>
                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Property</th>
                                        <th>Revenue</th>
                                        <th>Bookings</th>
                                        <th>Occupancy</th>
                                        <th>Rating</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {['limuru', 'kanamai', 'kisumu'].map(prop => {
                                        const propStats = stats?.properties?.[prop] || {};
                                        return (
                                            <tr key={prop}>
                                                <td style={{ fontWeight: '600', textTransform: 'capitalize' }}>{prop}</td>
                                                <td>KES {(propStats.revenue || 0).toLocaleString()}</td>
                                                <td>{propStats.bookings || 0}</td>
                                                <td>{propStats.occupancy || 0}%</td>
                                                <td>
                                                    <span style={{ color: 'var(--primary-orange)' }}>{'★'.repeat(Math.round(propStats.rating || 0))}</span>
                                                    {' '}{propStats.rating || 0}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
