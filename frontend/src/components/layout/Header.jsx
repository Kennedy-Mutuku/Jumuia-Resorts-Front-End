import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../common/Logo';
import './Header.css';

export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <header className="site-header">
            <div className="header-top">
                <div className="container header-top-content">
                    <div className="slogan">Hospitality With A Christian Touch</div>
                    <div className="header-top-actions">
                        <a href="tel:+254759423589" className="header-top-link">
                            <i className="fas fa-phone"></i>
                            <span>+254 759 423589</span>
                        </a>
                        <a href="mailto:jumuiaresortslimited@gmail.com" className="header-top-link">
                            <i className="fas fa-envelope"></i>
                            <span>jumuiaresortslimited@gmail.com</span>
                        </a>
                    </div>
                </div>
            </div>

            <div className="container header-container">
                <Link to="/" className="logo">
                    <Logo className="logo-img" />
                    <div className="logo-text">
                        <h1>Jumuia Resorts</h1>
                        <p>Christian Hospitality & Conference Centres</p>
                    </div>
                </Link>

                <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
                    <i className={menuOpen ? 'fas fa-times' : 'fas fa-bars'}></i>
                </button>

                <nav className={`main-nav ${menuOpen ? 'active' : ''}`}>
                    <NavLink to="/" end onClick={() => setMenuOpen(false)}>Home</NavLink>
                    <NavLink to="/about" onClick={() => setMenuOpen(false)}>About Us</NavLink>
                    <NavLink to="/resorts" onClick={() => setMenuOpen(false)}>Our Resorts</NavLink>
                    <NavLink to="/services" onClick={() => setMenuOpen(false)}>Services</NavLink>
                    <NavLink to="/offers" onClick={() => setMenuOpen(false)}>Offers</NavLink>
                    <NavLink to="/feedback" onClick={() => setMenuOpen(false)}>Feedback</NavLink>
                    <NavLink to="/contact" onClick={() => setMenuOpen(false)}>Contact</NavLink>
                    {user ? (
                        <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
                    ) : (
                        <NavLink to="/admin/login" className="btn-secondary" onClick={() => setMenuOpen(false)}>Log In</NavLink>
                    )}
                </nav>

                <div className="header-actions">
                    <Link to="/#quick-book" className="btn btn-primary">Book Now</Link>
                </div>
            </div>
        </header>
    );
}
