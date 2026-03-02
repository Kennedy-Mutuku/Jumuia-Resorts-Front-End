import { useParams, Link, NavLink, Outlet } from 'react-router-dom';
import '../pages/PageStyles.css';

const RESORT_DATA = {
    limuru: {
        name: 'Jumuia Conference & Country Home',
        location: 'Limuru, Kenya',
        image: '/images/resorts/limuru/limuru-front.jpeg',
        tagline: 'Serenity in the Highlands',
        description: 'Nestled in the cool Limuru highlands, our conference and country home offers breathtaking views, tranquil surroundings, and comprehensive conferencing facilities. Perfect for retreats, church events, and family getaways.',
        subPages: ['rooms', 'conference', 'gallery', 'excursions', 'offers', 'feedback']
    },
    kanamai: {
        name: 'Jumuia Conference & Beach Resort',
        location: 'Kanamai Coast, Kenya',
        image: '/images/resorts/kanamai/front kanamai.jpg',
        tagline: 'Where the Ocean Meets Hospitality',
        description: 'A breathtaking beachfront resort along the Kenyan coast. Enjoy modern conference facilities, swimming pools, and coastal adventure activities.',
        subPages: ['rooms', 'conference', 'gallery', 'excursions', 'offers', 'feedback']
    },
    kisumu: {
        name: 'Jumuia Hotel Kisumu',
        location: 'Kisumu, Kenya',
        image: '/images/resorts/kisumu/resort1.jpg',
        tagline: 'Urban Comfort, Christian Hospitality',
        description: 'Located in the heart of Kisumu city, our hotel offers urban comfort with modern amenities. Perfect for business travelers and event organizers.',
        subPages: ['rooms', 'conference', 'gallery', 'excursions', 'offers', 'feedback']
    }
};

export default function ResortDetail() {
    const { resort } = useParams();
    const data = RESORT_DATA[resort];

    if (!data) return <div className="container" style={{ padding: '200px 0', textAlign: 'center' }}><h2>Resort not found</h2><Link to="/resorts">Back to Resorts</Link></div>;

    return (
        <>
            <section className="page-hero" style={{ backgroundImage: `url('${data.image}')` }}>
                <div className="container">
                    <h1>{data.name}</h1>
                    <p>{data.tagline}</p>
                </div>
            </section>

            {/* Sub-navigation */}
            <nav style={{ background: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', position: 'sticky', top: '125px', zIndex: 50 }}>
                <div className="container" style={{ display: 'flex', gap: '5px', overflowX: 'auto', padding: '0' }}>
                    <NavLink to={`/resorts/${resort}`} end style={({ isActive }) => ({ padding: '15px 20px', fontWeight: '500', borderBottom: isActive ? '3px solid var(--primary-orange)' : '3px solid transparent', color: isActive ? 'var(--primary-green)' : 'var(--text-light)', whiteSpace: 'nowrap' })}>Overview</NavLink>
                    {data.subPages.map(page => (
                        <NavLink key={page} to={`/resorts/${resort}/${page}`} style={({ isActive }) => ({ padding: '15px 20px', fontWeight: '500', borderBottom: isActive ? '3px solid var(--primary-orange)' : '3px solid transparent', color: isActive ? 'var(--primary-green)' : 'var(--text-light)', whiteSpace: 'nowrap', textTransform: 'capitalize' })}>{page}</NavLink>
                    ))}
                </div>
            </nav>

            <Outlet context={{ resort, data }} />
        </>
    );
}

export function ResortOverview() {
    const { resort } = useParams();
    const data = RESORT_DATA[resort];
    if (!data) return null;

    return (
        <section className="container" style={{ padding: '60px 0' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h2 style={{ marginBottom: '20px' }}>Welcome to {data.name}</h2>
                <p style={{ color: 'var(--text-light)', lineHeight: '1.8', fontSize: '1.05rem', marginBottom: '30px' }}>
                    {data.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-orange)', marginBottom: '30px' }}>
                    <i className="fas fa-map-marker-alt"></i>
                    <span>{data.location}</span>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <Link to={`/resorts/${resort}/rooms`} className="btn btn-primary" style={{ padding: '12px 30px' }}>View Rooms</Link>
                    <Link to="/#quick-book" state={{ resort, autoScroll: true }} className="btn btn-secondary" style={{ padding: '12px 30px' }}>Book Now</Link>
                </div>
            </div>
        </section>
    );
}

export function ResortRooms() {
    const { resort } = useParams();
    const rooms = {
        limuru: [
            { type: 'Standard Room', price: 'KES 6,500', desc: 'Comfortable rooms with en-suite bathroom, TV, and garden views.' },
            { type: 'Deluxe Room', price: 'KES 8,500', desc: 'Spacious rooms with premium bedding, workspace, and panoramic highland views.' },
            { type: 'Family Room', price: 'KES 12,000', desc: 'Large rooms ideal for families, with extra beds and sitting area.' },
            { type: 'Hostel Bed', price: 'KES 2,500', desc: 'Budget-friendly hostel-style accommodation in shared dormitories.' }
        ],
        kanamai: [
            { type: 'Standard Room', price: 'KES 7,500', desc: 'Comfortable rooms near the beach with en-suite facilities.' },
            { type: 'Deluxe Room', price: 'KES 10,000', desc: 'Sea-view rooms with premium amenities and private balcony.' },
            { type: 'Cottage', price: 'KES 15,000', desc: 'Private beachfront cottages with living area and kitchen.' },
            { type: 'Hostel Bed', price: 'KES 2,500', desc: 'Affordable shared accommodation perfect for groups and youth camps.' }
        ],
        kisumu: [
            { type: 'Standard Room', price: 'KES 7,000', desc: 'Modern city rooms with AC, TV, and complimentary Wi-Fi.' },
            { type: 'Deluxe Room', price: 'KES 9,500', desc: 'Premium rooms with city views, minibar, and executive amenities.' },
            { type: 'Suite', price: 'KES 14,000', desc: 'Luxury suites with separate living area, premium décor, and VIP services.' },
            { type: 'Hostel Bed', price: 'KES 2,000', desc: 'Budget accommodation in clean, secure dormitory rooms.' }
        ]
    };

    return (
        <section className="container" style={{ padding: '60px 0' }}>
            <div className="section-header"><h2>Rooms & Accommodation</h2><p>Choose the perfect room for your stay</p></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
                {(rooms[resort] || []).map((room, i) => (
                    <div key={i} style={{ background: 'white', borderRadius: 'var(--radius)', padding: '25px', boxShadow: 'var(--shadow)' }}>
                        <h3 style={{ marginBottom: '10px' }}>{room.type}</h3>
                        <p style={{ color: 'var(--primary-orange)', fontSize: '1.3rem', fontWeight: '700', marginBottom: '10px' }}>{room.price}<span style={{ fontSize: '0.85rem', fontWeight: '400', color: 'var(--text-light)' }}> / night (B&B)</span></p>
                        <p style={{ color: 'var(--text-light)', marginBottom: '15px' }}>{room.desc}</p>
                        <Link to="/#quick-book" state={{ resort, roomType: room.type, autoScroll: true }} className="btn btn-primary" style={{ width: '100%', padding: '10px' }}>Book This Room</Link>
                    </div>
                ))}
            </div>
        </section>
    );
}

export function ResortConference() {
    return (
        <section className="container" style={{ padding: '60px 0' }}>
            <div className="section-header"><h2>Conference Facilities</h2><p>Modern meeting spaces for every occasion</p></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
                {['Board Room (20 pax)', 'Conference Hall (100 pax)', 'Main Auditorium (500 pax)', 'Breakout Rooms (30 pax each)'].map((room, i) => (
                    <div key={i} style={{ background: 'white', borderRadius: 'var(--radius)', padding: '25px', boxShadow: 'var(--shadow)' }}>
                        <i className="fas fa-users" style={{ fontSize: '2rem', color: 'var(--primary-orange)', marginBottom: '15px', display: 'block' }}></i>
                        <h3 style={{ marginBottom: '10px' }}>{room}</h3>
                        <p style={{ color: 'var(--text-light)' }}>Fully equipped with modern AV technology, Wi-Fi, and catering options.</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

export function ResortGallery() {
    return (
        <section className="container" style={{ padding: '60px 0' }}>
            <div className="section-header"><h2>Photo Gallery</h2><p>Take a visual tour of our property</p></div>
            <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>Gallery images coming soon.</p>
        </section>
    );
}

export function ResortExcursions() {
    return (
        <section className="container" style={{ padding: '60px 0' }}>
            <div className="section-header"><h2>Excursions & Activities</h2><p>Explore the best of the area</p></div>
            <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>Excursion details coming soon.</p>
        </section>
    );
}

export function ResortOffers() {
    return (
        <section className="container" style={{ padding: '60px 0' }}>
            <div className="section-header"><h2>Special Offers</h2><p>Current promotions at this resort</p></div>
            <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>Check our main <Link to="/offers" style={{ color: 'var(--primary-orange)' }}>Offers page</Link> for current promotions.</p>
        </section>
    );
}

export function ResortFeedback() {
    return (
        <section className="container" style={{ padding: '60px 0' }}>
            <div className="section-header"><h2>Guest Reviews</h2><p>What our guests say</p></div>
            <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>Share your experience on our <Link to="/feedback" style={{ color: 'var(--primary-orange)' }}>Feedback page</Link>.</p>
        </section>
    );
}
