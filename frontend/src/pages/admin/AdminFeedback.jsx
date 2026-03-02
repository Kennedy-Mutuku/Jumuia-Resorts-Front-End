import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminFeedback() {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => { api.get('/feedback').then(r => { setFeedbacks(r.data); setLoading(false); }).catch(() => setLoading(false)); }, []);

    const filtered = filter === 'all' ? feedbacks : feedbacks.filter(f => f.resort === filter);

    return (
        <div>
            <div className="admin-page-header"><h1>Feedback Management</h1><p>View guest feedback and ratings</p></div>
            <div className="admin-toolbar">
                <div className="filter-group">
                    <select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All Resorts</option><option value="limuru">Limuru</option><option value="kanamai">Kanamai</option><option value="kisumu">Kisumu</option></select>
                </div>
            </div>
            <div className="admin-card">
                {loading ? <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div> : filtered.length === 0 ? <p style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>No feedback found</p> : (
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead><tr><th>Guest</th><th>Resort</th><th>Rating</th><th>Message</th><th>Date</th></tr></thead>
                            <tbody>{filtered.map(f => (
                                <tr key={f._id}><td>{f.name}</td><td style={{ textTransform: 'capitalize' }}>{f.resort}</td>
                                    <td style={{ color: 'var(--primary-orange)' }}>{'★'.repeat(f.rating || 0)}{'☆'.repeat(5 - (f.rating || 0))}</td>
                                    <td style={{ maxWidth: '300px' }}>{f.message}</td>
                                    <td>{new Date(f.createdAt).toLocaleDateString()}</td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
