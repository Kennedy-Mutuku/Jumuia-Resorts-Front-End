import { useState, useEffect } from 'react';
import api from '../../services/api';

const PROPERTY_LABELS = {
    limuru: 'Jumuia Limuru Country Home',
    kanamai: 'Jumuia Kanamai Beach Resort',
    kisumu: 'Jumuia Hotel Kisumu',
};

const DOMAIN = '@jumuiaresorts.com';

function CopyField({ label, value }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div style={{ marginBottom: '14px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: '600' }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <p style={{
                    flex: 1, fontWeight: '700', margin: 0,
                    color: label === 'Password' ? 'var(--primary-orange)' : 'var(--primary-green)',
                    fontFamily: label === 'Password' ? 'monospace' : 'inherit',
                    fontSize: label === 'Password' ? '1.15rem' : '1rem',
                    wordBreak: 'break-all'
                }}>{value}</p>
                <button
                    onClick={handleCopy}
                    title="Copy to clipboard"
                    style={{
                        border: 'none', background: copied ? 'var(--primary-green)' : 'white',
                        color: copied ? 'white' : 'var(--primary-green)',
                        borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
                        fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.15)', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', gap: '5px'
                    }}
                >
                    <i className={copied ? 'fas fa-check' : 'fas fa-copy'}></i>
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
        </div>
    );
}

export default function AdminBranchManagers() {
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [credentials, setCredentials] = useState(null); // shown after create OR reset
    const [emailPrefix, setEmailPrefix] = useState(''); // the part before @jumuiaresorts.com
    const [formData, setFormData] = useState({ name: '', password: '', assignedProperty: '' });
    const [formError, setFormError] = useState('');

    const fetchManagers = async () => {
        try {
            const res = await api.get('/users');
            setManagers(res.data.filter(u => u.role === 'manager'));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchManagers(); }, []);

    const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!formData.assignedProperty) { setFormError('Please select an assigned property.'); return; }
        if (!emailPrefix.trim()) { setFormError('Please enter an email username.'); return; }

        const fullEmail = `${emailPrefix.trim().toLowerCase()}${DOMAIN}`;
        setSubmitting(true);
        try {
            await api.post('/users', { ...formData, email: fullEmail });
            setCredentials({ title: 'Manager Created!', name: formData.name, email: fullEmail, password: formData.password });
            setShowForm(false);
            setFormData({ name: '', password: '', assignedProperty: '' });
            setEmailPrefix('');
            await fetchManagers();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to create manager. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete branch manager "${name}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/users/${id}`);
            await fetchManagers();
        } catch (err) {
            alert(err.response?.data?.message || 'Error deleting manager.');
        }
    };

    const handleResetPassword = async (id, name, email) => {
        if (!window.confirm(`Reset password for "${name}"? A new password will be generated.`)) return;
        try {
            const res = await api.put(`/users/${id}/reset-password`);
            setCredentials({ title: 'Password Reset', name, email, password: res.data.password });
        } catch (err) {
            alert(err.response?.data?.message || 'Error resetting password.');
        }
    };

    return (
        <div>
            {/* Page Header */}
            <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ marginBottom: '4px', fontSize: '1.8rem', color: 'var(--primary-green)' }}>Branch Managers</h1>
                    <p style={{ color: 'var(--text-light)' }}>Create and manage branch manager accounts for each resort</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setFormError(''); }}>
                    <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
                    {showForm ? 'Cancel' : 'New Manager'}
                </button>
            </div>

            {/* Credentials Modal — shown after create or reset */}
            {credentials && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: 'white', borderRadius: '14px', padding: '36px', maxWidth: '460px', width: '92%', boxShadow: '0 24px 70px rgba(0,0,0,0.3)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{
                                width: '60px', height: '60px', borderRadius: '50%', background: 'var(--light-green)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px'
                            }}>
                                <i className="fas fa-key" style={{ fontSize: '1.8rem', color: 'var(--primary-green)' }}></i>
                            </div>
                            <h3 style={{ color: 'var(--primary-green)', marginBottom: '4px' }}>{credentials.title}</h3>
                            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                                Copy the credentials below and share them securely with <strong>{credentials.name}</strong>.
                            </p>
                        </div>

                        <div style={{ background: '#f8faf8', borderRadius: '10px', padding: '18px 20px', marginBottom: '22px', border: '1px solid #e0ede0' }}>
                            <CopyField label="Email" value={credentials.email} />
                            <CopyField label="Password" value={credentials.password} />
                        </div>

                        {/* Copy Both button */}
                        <CopyBothButton email={credentials.email} password={credentials.password} />

                        <button
                            className="btn btn-secondary"
                            style={{ width: '100%', marginTop: '10px' }}
                            onClick={() => setCredentials(null)}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* Create Form */}
            {showForm && (
                <div className="admin-card" style={{ marginBottom: '24px', border: '2px solid var(--primary-green)', borderRadius: '12px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ color: 'var(--primary-green)', marginBottom: '4px' }}>
                            <i className="fas fa-user-plus" style={{ marginRight: '8px' }}></i>
                            Create Branch Manager
                        </h3>
                        <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                            The manager will use these credentials to access their branch dashboard only.
                        </p>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '0.9rem' }}>Full Name *</label>
                                <input
                                    name="name"
                                    className="form-control"
                                    placeholder="e.g. Jane Wanjiku"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '0.9rem' }}>Email Address *</label>
                                {/* Split email input: prefix + fixed domain */}
                                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--gray-border)', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'white' }}>
                                    <input
                                        name="emailPrefix"
                                        type="text"
                                        style={{ flex: 1, border: 'none', outline: 'none', padding: '10px 12px', fontSize: '0.95rem', background: 'transparent' }}
                                        placeholder="jane.wanjiku"
                                        value={emailPrefix}
                                        onChange={e => setEmailPrefix(e.target.value.replace(/\s/g, '').toLowerCase())}
                                        required
                                    />
                                    <span style={{
                                        padding: '10px 12px', background: '#f4f8f4', color: 'var(--primary-green)',
                                        fontWeight: '600', fontSize: '0.9rem', borderLeft: '1px solid var(--gray-border)',
                                        whiteSpace: 'nowrap'
                                    }}>{DOMAIN}</span>
                                </div>
                                {emailPrefix && (
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: '4px' }}>
                                        Full email: <strong>{emailPrefix}{DOMAIN}</strong>
                                    </p>
                                )}
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '0.9rem' }}>Password *</label>
                                <input
                                    name="password"
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. Limuru2024!"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '0.9rem' }}>Assigned Resort *</label>
                                <select
                                    name="assignedProperty"
                                    className="form-control"
                                    value={formData.assignedProperty}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">— Select a resort —</option>
                                    <option value="limuru">Jumuia Limuru Country Home</option>
                                    <option value="kanamai">Jumuia Kanamai Beach Resort</option>
                                    <option value="kisumu">Jumuia Hotel Kisumu</option>
                                </select>
                            </div>
                        </div>
                        {formError && (
                            <div className="alert alert-error" style={{ marginTop: '15px' }}>
                                <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
                                {formError}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ minWidth: '160px' }}>
                                {submitting
                                    ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>Creating...</>
                                    : <><i className="fas fa-user-plus" style={{ marginRight: '8px' }}></i>Create Manager</>}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setFormError(''); setEmailPrefix(''); }}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Managers Table */}
            <div className="admin-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ color: 'var(--primary-green)' }}>
                        <i className="fas fa-user-tie" style={{ marginRight: '8px' }}></i>
                        Active Branch Managers ({managers.length})
                    </h3>
                </div>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px' }}>
                        <div className="spinner" style={{ margin: '0 auto' }}></div>
                        <p style={{ marginTop: '12px', color: 'var(--text-light)' }}>Loading managers...</p>
                    </div>
                ) : managers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-light)' }}>
                        <i className="fas fa-user-tie" style={{ fontSize: '3rem', opacity: 0.3, display: 'block', marginBottom: '16px' }}></i>
                        <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No branch managers yet</p>
                        <p style={{ fontSize: '0.9rem' }}>Click <strong>+ New Manager</strong> above to create the first one.</p>
                    </div>
                ) : (
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Assigned Resort</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {managers.map(m => (
                                    <tr key={m._id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '36px', height: '36px', borderRadius: '50%',
                                                    background: 'var(--light-green)', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center',
                                                    color: 'var(--primary-green)', fontWeight: '700', fontSize: '0.9rem'
                                                }}>
                                                    {m.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <strong>{m.name}</strong>
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--text-light)' }}>{m.email}</td>
                                        <td>
                                            {(m.properties || []).map(p => (
                                                <span key={p} className="status-badge confirmed" style={{ textTransform: 'capitalize' }}>
                                                    <i className="fas fa-map-marker-alt" style={{ marginRight: '5px', fontSize: '0.75rem' }}></i>
                                                    {PROPERTY_LABELS[p] || p}
                                                </span>
                                            ))}
                                        </td>
                                        <td>
                                            <span className="status-badge confirmed">
                                                <i className="fas fa-check-circle" style={{ marginRight: '5px' }}></i>
                                                Active Manager
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                                                    onClick={() => handleResetPassword(m._id, m.name, m.email)}
                                                    title="Reset Password"
                                                >
                                                    <i className="fas fa-key"></i>
                                                </button>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: '0.8rem', padding: '5px 10px', color: '#e74c3c', borderColor: '#e74c3c' }}
                                                    onClick={() => handleDelete(m._id, m.name)}
                                                    title="Delete Manager"
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>
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

// Helper component for "Copy Both" button
function CopyBothButton({ email, password }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        const text = `Email: ${email}\nPassword: ${password}`;
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    };
    return (
        <button
            onClick={handleCopy}
            className="btn btn-primary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
            <i className={copied ? 'fas fa-check' : 'fas fa-copy'}></i>
            {copied ? 'Credentials Copied!' : 'Copy Both Email & Password'}
        </button>
    );
}
