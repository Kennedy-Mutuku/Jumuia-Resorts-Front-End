import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            // Only show regular guests/staff — exclude managers and general managers
            setUsers(res.data.filter(u => u.role !== 'manager' && u.role !== 'general-manager'));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const deleteUser = async (id) => {
        if (!window.confirm('Delete this user?')) return;
        try {
            await api.delete(`/users/${id}`);
            await fetchUsers();
        } catch (err) {
            alert(err.response?.data?.message || 'Error deleting user.');
        }
    };

    return (
        <div>
            <div className="admin-page-header" style={{ marginBottom: '24px' }}>
                <h1 style={{ marginBottom: '4px', fontSize: '1.8rem', color: 'var(--primary-green)' }}>Users</h1>
                <p style={{ color: 'var(--text-light)' }}>
                    Registered guest and staff accounts.
                    To manage branch managers, visit <strong>Branch Managers</strong> in the sidebar.
                </p>
            </div>

            <div className="admin-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ color: 'var(--primary-green)' }}>
                        <i className="fas fa-users" style={{ marginRight: '8px' }}></i>
                        All Users ({users.length})
                    </h3>
                </div>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px' }}>
                        <div className="spinner" style={{ margin: '0 auto' }}></div>
                    </div>
                ) : users.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-light)' }}>
                        <i className="fas fa-users" style={{ fontSize: '3rem', opacity: 0.3, display: 'block', marginBottom: '16px' }}></i>
                        <p>No users registered yet.</p>
                    </div>
                ) : (
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Joined</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u._id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '34px', height: '34px', borderRadius: '50%',
                                                    background: '#f0f4ff', display: 'flex', alignItems: 'center',
                                                    justifyContent: 'center', fontWeight: '700', color: '#4a6fa5'
                                                }}>
                                                    {u.name?.charAt(0).toUpperCase() || '?'}
                                                </div>
                                                {u.name || '—'}
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--text-light)' }}>{u.email}</td>
                                        <td>
                                            <span className="status-badge pending" style={{ textTransform: 'capitalize' }}>
                                                {u.role || 'user'}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>
                                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-secondary"
                                                style={{ fontSize: '0.8rem', padding: '5px 10px', color: '#e74c3c', borderColor: '#e74c3c' }}
                                                onClick={() => deleteUser(u._id)}
                                            >
                                                <i className="fas fa-trash" style={{ marginRight: '5px' }}></i>
                                                Delete
                                            </button>
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
