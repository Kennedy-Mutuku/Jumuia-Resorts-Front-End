import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminOffers() {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '', resort: '', price: '', discount: '', image: '' });

    useEffect(() => { loadOffers(); }, []);
    const loadOffers = () => { api.get('/offers').then(r => { setOffers(r.data); setLoading(false); }).catch(() => setLoading(false)); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try { await api.post('/offers', { ...formData, price: Number(formData.price), discount: Number(formData.discount) }); setShowForm(false); setFormData({ title: '', description: '', resort: '', price: '', discount: '', image: '' }); loadOffers(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    const deleteOffer = async (id) => { if (window.confirm('Delete this offer?')) { await api.delete(`/offers/${id}`); loadOffers(); } };

    return (
        <div>
            <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><h1>Offers Management</h1><p>Create and manage special offers</p></div><button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><i className="fas fa-plus"></i> New Offer</button></div>
            {showForm && (
                <div className="admin-card">
                    <h3>Create New Offer</h3>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <input className="form-control" placeholder="Title *" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                        <select className="form-control" value={formData.resort} onChange={e => setFormData({ ...formData, resort: e.target.value })} required><option value="">Select Resort</option><option value="limuru">Limuru</option><option value="kanamai">Kanamai</option><option value="kisumu">Kisumu</option></select>
                        <textarea className="form-control" placeholder="Description *" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required style={{ gridColumn: 'span 2' }}></textarea>
                        <input type="number" className="form-control" placeholder="Price (KES)" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                        <input type="number" className="form-control" placeholder="Discount %" value={formData.discount} onChange={e => setFormData({ ...formData, discount: e.target.value })} />
                        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}><button type="submit" className="btn btn-primary">Save Offer</button><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button></div>
                    </form>
                </div>
            )}
            <div className="admin-card">
                {loading ? <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div> : offers.length === 0 ? <p style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>No offers yet</p> : (
                    <div className="admin-table-wrapper"><table className="admin-table"><thead><tr><th>Title</th><th>Resort</th><th>Price</th><th>Discount</th><th>Actions</th></tr></thead><tbody>{offers.map(o => (
                        <tr key={o._id}><td>{o.title}</td><td style={{ textTransform: 'capitalize' }}>{o.resort}</td><td>KES {(o.price || 0).toLocaleString()}</td><td>{o.discount || 0}%</td><td><button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '4px 10px' }} onClick={() => deleteOffer(o._id)}>Delete</button></td></tr>
                    ))}</tbody></table></div>
                )}
            </div>
        </div>
    );
}
