import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
    return (
        <footer className="site-footer">
            <div className="container">
                <div className="footer-container">
                    <div className="footer-column">
                        <h3>Quick Links</h3>
                        <ul className="footer-links">
                            <li><Link to="/">Home</Link></li>
                            <li><Link to="/about">About Us</Link></li>
                            <li><Link to="/resorts">Our Resorts</Link></li>
                            <li><Link to="/services">Services</Link></li>
                            <li><Link to="/offers">Offers</Link></li>
                            <li><Link to="/contact">Contact</Link></li>
                        </ul>
                    </div>

                    <div className="footer-column">
                        <h3>Our Resorts</h3>
                        <ul className="footer-links">
                            <li><Link to="/resorts/limuru">Jumuia Limuru</Link></li>
                            <li><Link to="/resorts/kanamai">Jumuia Kanamai</Link></li>
                            <li><Link to="/resorts/kisumu">Jumuia Kisumu</Link></li>
                        </ul>
                    </div>

                    <div className="footer-column">
                        <h3>Contact Us</h3>
                        <div className="contact-info">
                            <div className="contact-item">
                                <i className="fas fa-phone"></i>
                                <span>+254 759 423589</span>
                            </div>
                            <div className="contact-item">
                                <i className="fas fa-envelope"></i>
                                <span>jumuiaresortslimited@gmail.com</span>
                            </div>
                            <div className="contact-item">
                                <i className="fas fa-map-marker-alt"></i>
                                <span>Nairobi, Kenya</span>
                            </div>
                        </div>
                        <div className="social-links">
                            <a href="#"><i className="fab fa-facebook-f"></i></a>
                            <a href="#"><i className="fab fa-twitter"></i></a>
                            <a href="#"><i className="fab fa-instagram"></i></a>
                            <a href="#"><i className="fab fa-youtube"></i></a>
                        </div>
                    </div>
                </div>

                <div className="copyright">
                    <p>&copy; {new Date().getFullYear()} Jumuia Resorts. All Rights Reserved.</p>
                </div>
            </div>
        </footer>
    );
}
