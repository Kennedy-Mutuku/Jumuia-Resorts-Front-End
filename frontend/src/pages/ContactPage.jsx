import { useState } from 'react';
import api from '../services/api';
import './PageStyles.css';

export default function ContactPage() {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/messages', formData);
            setStatus({ type: 'success', text: 'Message sent successfully! We will get back to you soon.' });
            setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
        } catch (err) {
            setStatus({ type: 'error', text: err.response?.data?.message || 'Failed to send message.' });
        }
        setLoading(false);
    };

    return (
        <>
            <section className="page-hero" style={{ backgroundImage: "url('/images/resorts/kanamai/front kanamai.jpg')" }}>
                <div className="container"><h1>Contact Us</h1><p>We'd love to hear from you. Get in touch with our team.</p></div>
            </section>

            <section className="container" style={{ padding: '80px 0' }}>
                <div className="contact-grid">
                    <div className="contact-form-wrapper">
                        <h2 style={{ marginBottom: '20px' }}>Send Us a Message</h2>
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gap: '15px' }}>
                                <input name="name" className="form-control" placeholder="Your Name *" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                <input name="email" type="email" className="form-control" placeholder="Email Address *" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                                <input name="phone" className="form-control" placeholder="Phone Number" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                <input name="subject" className="form-control" placeholder="Subject *" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} required />
                                <textarea name="message" className="form-control" placeholder="Your Message *" rows="5" value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} required></textarea>
                                {status && <div className={`alert alert-${status.type}`}>{status.text}</div>}
                                <button type="submit" className="btn btn-primary" style={{ padding: '12px', fontSize: '1rem' }} disabled={loading}>
                                    {loading ? 'Sending...' : 'Send Message'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="contact-info-wrapper">
                        <div className="info-card"><i className="fas fa-phone"></i><div><strong>Phone</strong><p>+254 759 423589</p></div></div>
                        <div className="info-card"><i className="fas fa-envelope"></i><div><strong>Email</strong><p>jumuiaresortslimited@gmail.com</p></div></div>
                        <div className="info-card"><i className="fas fa-map-marker-alt"></i><div><strong>Head Office</strong><p>Jumuia Place, Lenana Road, Nairobi</p></div></div>
                        <div className="info-card"><i className="fas fa-clock"></i><div><strong>Working Hours</strong><p>Mon - Fri: 8:00 AM - 5:00 PM</p></div></div>
                    </div>
                </div>
            </section>
        </>
    );
}
