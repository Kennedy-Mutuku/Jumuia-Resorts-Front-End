import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [resortFilter, setResortFilter] = useState('all');

    useEffect(() => { loadBookings(); }, []);

    const loadBookings = async () => {
        try {
            const res = await api.get('/bookings');
            setBookings(res.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const updateStatus = async (id, status) => {
        try {
            await api.put(`/bookings/${id}`, { status });
            loadBookings();
        } catch (err) { console.error(err); }
    };

    const filtered = bookings.filter(b => {
        const matchSearch = b.guestName?.toLowerCase().includes(search.toLowerCase()) || b.email?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || b.status === statusFilter;
        const matchResort = resortFilter === 'all' || b.resort === resortFilter;
        return matchSearch && matchStatus && matchResort;
    });

    return (
        <div>
            <div className="admin-page-header"><h1>Bookings Management</h1><p>View and manage all resort bookings</p></div>
            <div className="admin-toolbar">
                <div className="search-box"><i className="fas fa-search" style={{ color: 'var(--text-light)' }}></i><input placeholder="Search bookings..." value={search} onChange={e => setSearch(e.target.value)} /></div>
                <div className="filter-group">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">All Status</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option><option value="completed">Completed</option></select>
                    <select value={resortFilter} onChange={e => setResortFilter(e.target.value)}><option value="all">All Resorts</option><option value="limuru">Limuru</option><option value="kanamai">Kanamai</option><option value="kisumu">Kisumu</option></select>
                </div>
            </div>
            <div className="admin-card">
                {loading ? <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div> : (
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead><tr><th>Guest</th><th>Resort</th><th>Check-in</th><th>Check-out</th><th>Room</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {filtered.length === 0 ? <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>No bookings found</td></tr> :
                                    filtered.map(b => (
                                        <tr key={b._id}>
                                            <td><strong>{b.guestName}</strong><br /><small style={{ color: 'var(--text-light)' }}>{b.email}</small></td>
                                            <td style={{ textTransform: 'capitalize' }}>{b.resort}</td>
                                            <td>{new Date(b.checkIn).toLocaleDateString()}</td>
                                            <td>{new Date(b.checkOut).toLocaleDateString()}</td>
                                            <td>{b.roomType?.replace(/-/g, ' ')}</td>
                                            <td>KES {(b.totalAmount || 0).toLocaleString()}</td>
                                            <td><span className={`status-badge ${b.status}`}>{b.status}</span></td>
                                            <td>
                                                <select value={b.status} onChange={(e) => updateStatus(b._id, e.target.value)} style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--gray-border)', fontSize: '0.8rem' }}>
                                                    <option value="pending">Pending</option>
                                                    <option value="confirmed">Confirmed</option>
                                                    <option value="completed">Completed</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
