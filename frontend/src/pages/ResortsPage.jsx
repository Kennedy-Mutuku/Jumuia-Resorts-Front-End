import { Link } from 'react-router-dom';
import './PageStyles.css';

export default function ResortsPage() {
    const resorts = [
        {
            name: 'Jumuia Conference & Country Home',
            location: 'Limuru, Kenya',
            slug: 'limuru',
            image: '/images/resorts/limuru/limuru-front.jpeg',
            description: 'Nestled in the serene Limuru highlands, our conference and country home offers breathtaking views, tranquil surroundings, and comprehensive conferencing facilities. Perfect for retreats, church events, and family getaways.',
            features: ['Conference Facilities', 'Hostel Accommodation', 'Chapel', 'Nature Walks', 'Campfire Area', 'Dining Hall']
        },
        {
            name: 'Jumuia Conference & Beach Resort',
            location: 'Kanamai Coast, Kenya',
            slug: 'kanamai',
            image: '/images/resorts/kanamai/front kanamai.jpg',
            description: 'A breathtaking beachfront resort along the Kenyan coast. Enjoy modern conference facilities, swimming pools, and coastal adventure activities. Ideal for both corporate events and leisure vacations.',
            features: ['Beach Access', 'Swimming Pool', 'Conference Rooms', 'Water Sports', 'Restaurant', 'Cottages']
        },
        {
            name: 'Jumuia Hotel Kisumu',
            location: 'Kisumu, Kenya',
            slug: 'kisumu',
            image: '/images/resorts/kisumu/resort1.jpg',
            description: 'Located in the heart of Kisumu city, our hotel offers urban comfort with modern amenities. Perfect for business travelers, conference attendees, and city explorers looking for quality accommodation.',
            features: ['City Center', 'Swimming Pool', 'Conference Hall', 'Restaurant', 'Hostel Wing', 'Ample Parking']
        }
    ];

    return (
        <>
            <section className="page-hero" style={{ backgroundImage: "url('/images/resorts/kanamai/front kanamai.jpg')" }}>
                <div className="container"><h1>Our Resorts</h1><p>Discover unique experiences across our three properties</p></div>
            </section>

            <section className="container" style={{ padding: '80px 0' }}>
                {resorts.map((resort, i) => (
                    <div key={resort.slug} style={{
                        display: 'grid', gridTemplateColumns: i % 2 === 0 ? '1fr 1fr' : '1fr 1fr',
                        gap: '40px', alignItems: 'center', marginBottom: '80px', direction: i % 2 !== 0 ? 'rtl' : 'ltr'
                    }}>
                        <div style={{ direction: 'ltr' }}>
                            <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                                <img src={resort.image} alt={resort.name} style={{ width: '100%', height: '350px', objectFit: 'cover' }} />
                            </div>
                        </div>
                        <div style={{ direction: 'ltr' }}>
                            <h2 style={{ marginBottom: '10px' }}>{resort.name}</h2>
                            <p style={{ color: 'var(--primary-orange)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fas fa-map-marker-alt"></i> {resort.location}
                            </p>
                            <p style={{ color: 'var(--text-light)', lineHeight: '1.7', marginBottom: '20px' }}>{resort.description}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '25px' }}>
                                {resort.features.map((f, j) => <span key={j} className="feature-tag">{f}</span>)}
                            </div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <Link to={`/resorts/${resort.slug}`} className="btn btn-primary">Explore Resort</Link>
                                <Link to="/#quick-book" className="btn btn-secondary">Book Now</Link>
                            </div>
                        </div>
                    </div>
                ))}
            </section>
        </>
    );
}
