import './PageStyles.css';

export default function ServicesPage() {
    const services = [
        { icon: 'fas fa-building', title: 'Conference Facilities', desc: 'State-of-the-art conference rooms equipped with modern AV technology, seating from 20 to 500 delegates. Our professional team ensures seamless event management for corporate meetings, workshops, and seminars.' },
        { icon: 'fas fa-bed', title: 'Accommodation', desc: 'Comfortable rooms across all categories — from budget-friendly hostel beds to premium suites. All rooms feature quality bedding, en-suite facilities, and serene views.' },
        { icon: 'fas fa-utensils', title: 'Dining & Catering', desc: 'Experience exquisite cuisine prepared by our skilled chefs. We offer buffet and à la carte options, special dietary accommodations, and outdoor catering services for events.' },
        { icon: 'fas fa-swimming-pool', title: 'Recreation & Leisure', desc: 'Swimming pools, nature walks, beach activities, team building courses, and sporting facilities. Our properties offer diverse recreational activities for all ages and preferences.' },
        { icon: 'fas fa-church', title: 'Religious & Spiritual Events', desc: 'Dedicated chapels, prayer gardens, and specialized facilities for retreats, church conferences, weddings, and other spiritual events. Our Christian heritage ensures a welcoming atmosphere.' },
        { icon: 'fas fa-users', title: 'Youth Centres & Camps', desc: 'Purpose-built youth centres with programs for team building, leadership development, and character formation. Ideal for school trips, church youth groups, and camping adventures.' },
        { icon: 'fas fa-glass-cheers', title: 'Events & Functions', desc: 'From intimate gatherings to grand celebrations — weddings, anniversaries, corporate dinners, and team building events. Our events team handles every detail with care.' },
        { icon: 'fas fa-shuttle-van', title: 'Transport & Excursions', desc: 'Airport transfers, local excursions, and guided tours to nearby attractions. We help you explore the best of each location with our reliable transport services.' }
    ];

    return (
        <>
            <section className="page-hero" style={{ backgroundImage: "url('/images/resorts/limuru/limuru-front.jpeg')" }}>
                <div className="container"><h1>Our Services</h1><p>Comprehensive hospitality solutions tailored to your needs</p></div>
            </section>

            <section className="container" style={{ padding: '80px 0' }}>
                <div className="section-header"><h2>What We Offer</h2><p>From conferencing to leisure — discover our full range of services</p></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
                    {services.map((s, i) => (
                        <div key={i} style={{ background: 'white', borderRadius: 'var(--radius)', padding: '30px', boxShadow: 'var(--shadow)', transition: 'transform 0.3s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                                <div style={{ width: '50px', height: '50px', background: 'var(--primary-orange)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <i className={s.icon} style={{ fontSize: '1.3rem', color: 'white' }}></i>
                                </div>
                                <h3 style={{ fontSize: '1.2rem' }}>{s.title}</h3>
                            </div>
                            <p style={{ color: 'var(--text-light)', lineHeight: '1.7' }}>{s.desc}</p>
                        </div>
                    ))}
                </div>
            </section>
        </>
    );
}
