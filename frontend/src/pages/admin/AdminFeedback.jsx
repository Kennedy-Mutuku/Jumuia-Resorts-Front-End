import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const PROPERTY_NAMES = {
    limuru: 'Jumuia Limuru Country Home',
    kanamai: 'Jumuia Kanamai Beach Resort',
    kisumu: 'Jumuia Hotel Kisumu',
};

export default function AdminFeedback() {
    const { user } = useAuth();
    const isManager = user?.role === 'manager';
    const assignedBranch = isManager ? (user?.properties?.[0] || null) : null;

    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState(assignedBranch || 'all');

    useEffect(() => {
        api.get('/feedback')
            .then(r => { setFeedbacks(r.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    // Managers are always locked to their branch
    const effectiveFilter = isManager ? assignedBranch : filter;
    const filtered = !effectiveFilter || effectiveFilter === 'all'
        ? feedbacks
        : feedbacks.filter(f => f.resort === effectiveFilter);

    return (
        <div>
            <div className="admin-page-header">
                <h1>Feedback</h1>
                <p style={{ color: 'var(--text-light)', marginBottom: isManager ? '6px' : '0' }}>
                    {isManager
                        ? <>Showing guest feedback for <strong style={{ color: 'var(--primary-green)' }}>{PROPERTY_NAMES[assignedBranch]}</strong></>
                        : 'View guest feedback and ratings across all resorts'
                    }
                </p>
            </div>

            {/* Resort filter only for General Manager */}
            {!isManager && (
                <div className="admin-toolbar">
                    <div className="filter-group">
                        <select value={filter} onChange={e => setFilter(e.target.value)}>
                            <option value="all">All Resorts</option>
                            <option value="limuru">Limuru</option>
                            <option value="kanamai">Kanamai</option>
                            <option value="kisumu">Kisumu</option>
                        </select>
                    </div>
                </div>
            )}

            <div className="admin-card">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
                ) : filtered.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
                        <i className="fas fa-star" style={{ fontSize: '2rem', opacity: 0.3, display: 'block', marginBottom: '12px' }}></i>
                        No feedback found{isManager ? ` for ${PROPERTY_NAMES[assignedBranch]}` : ''} yet.
                    </p>
                ) : (
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Guest</th>
                                    {!isManager && <th>Resort</th>}
                                    <th>Rating</th>
                                    <th>Feedback</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(f => (
                                    <tr key={f._id}>
                                        <td>
                                            <strong>{f.name}</strong>
                                            <br /><small style={{ color: 'var(--text-light)' }}>{f.email}</small>
                                        </td>
                                        {!isManager && (
                                            <td style={{ textTransform: 'capitalize' }}>
                                                <span className="status-badge confirmed">{f.resort}</span>
                                            </td>
                                        )}
                                        <td>
                                            <span style={{ color: 'var(--primary-orange)', fontSize: '1rem' }}>
                                                {'★'.repeat(f.rating || 0)}{'☆'.repeat(5 - (f.rating || 0))}
                                            </span>
                                            <span style={{ marginLeft: '6px', fontWeight: '600', fontSize: '0.85rem' }}>{f.rating}/5</span>
                                        </td>
                                        <td style={{ maxWidth: '300px', lineHeight: '1.5' }}>{f.comment || f.message}</td>
                                        <td style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>
                                            {new Date(f.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
