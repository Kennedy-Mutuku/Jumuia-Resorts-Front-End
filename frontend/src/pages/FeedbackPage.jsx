import { useState } from 'react';
import api from '../services/api';
import './PageStyles.css';

export default function FeedbackPage() {
    const [formData, setFormData] = useState({ name: '', email: '', resort: '', rating: 5, message: '' });
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/feedback', formData);
            setStatus({ type: 'success', text: 'Thank you for your feedback!' });
            setFormData({ name: '', email: '', resort: '', rating: 5, message: '' });
        } catch (err) {
            setStatus({ type: 'error', text: err.response?.data?.message || 'Failed to submit feedback.' });
        }
        setLoading(false);
    };

    return (
        <>
            <section className="page-hero" style={{ backgroundImage: "url('/images/resorts/kisumu/resort1.jpg')" }}>
                <div className="container"><h1>Feedback</h1><p>Share your experience with us</p></div>
            </section>

            <section className="container" style={{ padding: '80px 0', maxWidth: '700px' }}>
                <div className="section-header"><h2>We Value Your Opinion</h2><p>Help us improve by sharing your experience</p></div>
                <div style={{ background: 'white', padding: '30px', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gap: '15px' }}>
                            <input className="form-control" placeholder="Your Name *" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            <input type="email" className="form-control" placeholder="Email Address *" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                            <select className="form-control" value={formData.resort} onChange={e => setFormData({ ...formData, resort: e.target.value })} required>
                                <option value="">Select Resort *</option>
                                <option value="limuru">Jumuia Limuru</option>
                                <option value="kanamai">Jumuia Kanamai</option>
                                <option value="kisumu">Jumuia Kisumu</option>
                            </select>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Rating</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <i key={star}
                                            className={`fas fa-star`}
                                            style={{ fontSize: '1.5rem', cursor: 'pointer', color: star <= formData.rating ? 'var(--primary-orange)' : '#ddd' }}
                                            onClick={() => setFormData({ ...formData, rating: star })}
                                        />
                                    ))}
                                </div>
                            </div>
                            <textarea className="form-control" placeholder="Your Feedback *" rows="5" value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} required></textarea>
                            {status && <div className={`alert alert-${status.type}`}>{status.text}</div>}
                            <button type="submit" className="btn btn-primary" style={{ padding: '12px', fontSize: '1rem' }} disabled={loading}>
                                {loading ? 'Submitting...' : 'Submit Feedback'}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </>
    );
}
