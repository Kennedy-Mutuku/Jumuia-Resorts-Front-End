import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const PROPERTY_NAMES = {
    limuru: 'Jumuia Limuru Country Home',
    kanamai: 'Jumuia Kanamai Beach Resort',
    kisumu: 'Jumuia Hotel Kisumu',
    all: 'All Properties',
};

export default function AdminDashboard() {
    const { user } = useAuth();
    const isManager = user?.role === 'manager';
    const assignedBranch = isManager ? (user?.properties?.[0] || 'all') : 'all';

    const [stats, setStats] = useState(null);
    const [currentProperty, setCurrentProperty] = useState(assignedBranch);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadStats(); }, [currentProperty]);

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
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    // GM sees all properties; manager sees only their single branch
    const properties = isManager
        ? [assignedBranch]
        : ['all', 'limuru', 'kanamai', 'kisumu'];

    // For the performance table, show only the manager's branch or all 3 for GM
    const performanceProperties = isManager
        ? [assignedBranch]
        : ['limuru', 'kanamai', 'kisumu'];

    return (
        <div>
            {/* Header */}
            <div className="admin-page-header">
                <div>
                    <h1>{getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'}</h1>
                    <p style={{ color: 'var(--text-light)', marginBottom: '4px' }}>
                        {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    {isManager && (
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            background: 'var(--light-green)', borderRadius: '20px',
                            padding: '5px 14px', marginTop: '6px'
                        }}>
                            <i className="fas fa-building" style={{ color: 'var(--primary-green)', fontSize: '0.85rem' }}></i>
                            <span style={{ color: 'var(--primary-green)', fontWeight: '600', fontSize: '0.9rem' }}>
                                {PROPERTY_NAMES[assignedBranch]} — Branch Admin Portal
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Property Filter — only for General Manager */}
            {!isManager && (
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

                    {/* Performance Table */}
                    <div className="admin-card">
                        <h3 style={{ marginBottom: '16px', color: 'var(--primary-green)' }}>
                            {isManager
                                ? `${PROPERTY_NAMES[assignedBranch]} — Performance Overview`
                                : 'Property Performance Comparison'}
                        </h3>
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
                                    {performanceProperties.map(prop => {
                                        const ps = stats?.properties?.[prop] || {};
                                        return (
                                            <tr key={prop}>
                                                <td style={{ fontWeight: '600' }}>
                                                    <i className="fas fa-map-marker-alt" style={{ marginRight: '8px', color: 'var(--primary-green)', fontSize: '0.8rem' }}></i>
                                                    {PROPERTY_NAMES[prop]}
                                                </td>
                                                <td>KES {(ps.revenue || 0).toLocaleString()}</td>
                                                <td>{ps.bookings || 0}</td>
                                                <td>{ps.occupancy || 0}%</td>
                                                <td>
                                                    <span style={{ color: 'var(--primary-orange)' }}>{'★'.repeat(Math.round(ps.rating || 0))}</span>
                                                    {' '}{ps.rating || 0}
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
