import './PageStyles.css';

export default function AboutPage() {
    return (
        <>
            <section className="page-hero" style={{ backgroundImage: "url('/images/resorts/limuru/limuru-front.jpeg')" }}>
                <div className="container"><h1>About Us</h1><p>Learn more about Jumuia Resorts and our commitment to Christian hospitality</p></div>
            </section>

            <section className="container" style={{ padding: '80px 0' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <div className="section-header">
                        <h2>Who We Are</h2>
                    </div>
                    <p style={{ color: 'var(--text-light)', lineHeight: '1.8', marginBottom: '30px', fontSize: '1.05rem' }}>
                        Jumuia Resorts is a chain of Christian conference centers and hospitality facilities owned and operated by
                        the National Council of Churches of Kenya (NCCK). With three strategic locations across Kenya — Limuru,
                        Kanamai, and Kisumu — we offer a unique blend of Christian hospitality, modern conferencing facilities,
                        and leisure amenities.
                    </p>
                    <p style={{ color: 'var(--text-light)', lineHeight: '1.8', marginBottom: '30px', fontSize: '1.05rem' }}>
                        Our properties cater to a wide range of needs including corporate conferences, church retreats,
                        family getaways, youth camps, and individual leisure stays. We are committed to providing quality
                        service that reflects our core values of stewardship, integrity, professionalism, partnership,
                        and servanthood.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px', marginTop: '50px' }}>
                        {[
                            { icon: 'fas fa-church', title: 'Christian Heritage', desc: 'Founded on Christian values and operated by NCCK, providing hospitality with a spiritual foundation.' },
                            { icon: 'fas fa-map-marked-alt', title: '3 Prime Locations', desc: 'Strategically located in Limuru, Kanamai coast, and Kisumu city to serve all regions of Kenya.' },
                            { icon: 'fas fa-award', title: 'Quality Service', desc: 'Committed to excellence in every aspect of hospitality, from accommodation to conferencing.' },
                            { icon: 'fas fa-handshake', title: 'Community Impact', desc: 'Contributing to community development through employment and social programs.' }
                        ].map((item, i) => (
                            <div key={i} style={{ background: 'white', padding: '30px', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', textAlign: 'center' }}>
                                <div style={{ width: '60px', height: '60px', background: 'var(--primary-orange)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                                    <i className={item.icon} style={{ fontSize: '1.5rem', color: 'white' }}></i>
                                </div>
                                <h3 style={{ marginBottom: '10px' }}>{item.title}</h3>
                                <p style={{ color: 'var(--text-light)' }}>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}
