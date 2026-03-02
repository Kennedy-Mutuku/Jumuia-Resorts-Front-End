import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'staff', properties: [] });

    useEffect(() => { api.get('/users').then(r => { setUsers(r.data); setLoading(false); }).catch(() => setLoading(false)); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try { await api.post('/users', formData); setShowForm(false); setFormData({ name: '', email: '', password: '', role: 'staff', properties: [] }); const r = await api.get('/users'); setUsers(r.data); } catch (err) { alert(err.response?.data?.message || 'Error creating user'); }
    };

    const deleteUser = async (id) => { if (window.confirm('Delete this user?')) { try { await api.delete(`/users/${id}`); const r = await api.get('/users'); setUsers(r.data); } catch (err) { alert('Error'); } } };

    return (
        <div>
            <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><h1>User Management</h1><p>Manage admin users and roles</p></div><button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><i className="fas fa-plus"></i> New User</button></div>
            {showForm && (
                <div className="admin-card"><h3>Create User</h3>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <input className="form-control" placeholder="Name *" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        <input type="email" className="form-control" placeholder="Email *" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                        <input type="password" className="form-control" placeholder="Password *" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                        <select className="form-control" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}><option value="staff">Staff</option><option value="manager">Manager</option><option value="general-manager">General Manager</option></select>
                        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}><button type="submit" className="btn btn-primary">Create</button><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button></div>
                    </form>
                </div>
            )}
            <div className="admin-card">
                {loading ? <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div> : (
                    <div className="admin-table-wrapper"><table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Properties</th><th>Actions</th></tr></thead><tbody>{users.map(u => (
                        <tr key={u._id}><td>{u.name}</td><td>{u.email}</td><td><span className="status-badge confirmed" style={{ textTransform: 'capitalize' }}>{u.role?.replace('-', ' ')}</span></td><td>{(u.properties || []).join(', ')}</td><td><button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '4px 10px' }} onClick={() => deleteUser(u._id)}>Delete</button></td></tr>
                    ))}</tbody></table></div>
                )}
            </div>
        </div>
    );
}
