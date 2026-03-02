import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminMessages() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);

    useEffect(() => { api.get('/messages').then(r => { setMessages(r.data); setLoading(false); }).catch(() => setLoading(false)); }, []);

    return (
        <div>
            <div className="admin-page-header"><h1>Messages</h1><p>View and respond to guest messages</p></div>
            <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '20px' }}>
                <div className="admin-card">
                    {loading ? <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div> : messages.length === 0 ? <p style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>No messages</p> : (
                        <div>{messages.map(m => (
                            <div key={m._id} onClick={() => setSelected(m)} style={{ padding: '15px', borderBottom: '1px solid var(--gray-border)', cursor: 'pointer', background: selected?._id === m._id ? 'var(--light-green)' : 'transparent', transition: 'background 0.2s' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><strong>{m.name}</strong><small style={{ color: 'var(--text-light)' }}>{new Date(m.createdAt).toLocaleDateString()}</small></div>
                                <div style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '3px' }}>{m.subject}</div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message}</p>
                            </div>
                        ))}</div>
                    )}
                </div>
                {selected && (
                    <div className="admin-card">
                        <h3>{selected.subject}</h3>
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                            <span><i className="fas fa-user"></i> {selected.name}</span>
                            <span><i className="fas fa-envelope"></i> {selected.email}</span>
                        </div>
                        <p style={{ lineHeight: '1.7', marginBottom: '20px' }}>{selected.message}</p>
                        <button className="btn btn-primary" onClick={() => window.open(`mailto:${selected.email}?subject=Re: ${selected.subject}`)}>Reply via Email</button>
                    </div>
                )}
            </div>
        </div>
    );
}
