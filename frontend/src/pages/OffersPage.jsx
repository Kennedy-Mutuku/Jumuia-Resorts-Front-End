import { useState, useEffect } from 'react';
import api from '../services/api';
import './PageStyles.css';

export default function OffersPage() {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/offers').then(res => { setOffers(res.data); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    return (
        <>
            <section className="page-hero" style={{ backgroundImage: "url('/images/resorts/kanamai/front kanamai.jpg')" }}>
                <div className="container"><h1>Special Offers</h1><p>Discover our latest deals and packages</p></div>
            </section>

            <section className="container" style={{ padding: '80px 0' }}>
                <div className="section-header"><h2>Current Offers</h2><p>Take advantage of our special promotions across all properties</p></div>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
                ) : offers.length > 0 ? (
                    <div className="offers-grid">
                        {offers.map((offer) => (
                            <div className="offer-card" key={offer._id}>
                                <div className="offer-image" style={{ backgroundImage: `url(${offer.image || '/images/resorts/limuru/limuru-front.jpeg'})` }}>
                                    {offer.discount && <span className="offer-badge">{offer.discount}% OFF</span>}
                                </div>
                                <div className="offer-content">
                                    <h3>{offer.title}</h3>
                                    <p>{offer.description}</p>
                                    {offer.price && <div className="offer-price">KES {offer.price.toLocaleString()}</div>}
                                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                                        <a href="/#quick-book" className="btn btn-primary">Book Now</a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-light)' }}>
                        <i className="fas fa-tags" style={{ fontSize: '3rem', marginBottom: '20px', display: 'block', opacity: 0.3 }}></i>
                        <p>No offers available at the moment. Check back soon!</p>
                    </div>
                )}
            </section>
        </>
    );
}
