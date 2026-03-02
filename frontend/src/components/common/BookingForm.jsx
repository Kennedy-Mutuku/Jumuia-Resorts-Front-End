import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getRoomTypes, calculateRate, saveBooking, getResortName } from '../../services/booking';

export default function BookingForm() {
    const location = useLocation();
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', phone: '', nationality: 'kenyan',
        resort: location.state?.resort || '',
        checkIn: '', checkOut: '', adults: '2', children: '0',
        roomType: location.state?.roomType || '',
        packageType: 'bnb', paymentMethod: 'mpesa', specialRequests: ''
    });
    const [roomTypes, setRoomTypes] = useState([]);
    const [totalAmount, setTotalAmount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);

    // Track initialization to avoid clearing roomType passed from state
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (formData.resort) {
            setRoomTypes(getRoomTypes(formData.resort));

            if (isInitialized) {
                // If user manually changes resort, clear the roomType
                setFormData(prev => ({ ...prev, roomType: '' }));
            }
            setIsInitialized(true);
        }
    }, [formData.resort]);

    useEffect(() => {
        if (location.state?.autoScroll) {
            setTimeout(() => {
                const element = document.getElementById('quick-book');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        }
    }, [location.state]);

    useEffect(() => {
        if (formData.resort && formData.roomType && formData.checkIn && formData.checkOut) {
            const nights = Math.ceil((new Date(formData.checkOut) - new Date(formData.checkIn)) / (1000 * 60 * 60 * 24));
            if (nights > 0) {
                const amount = calculateRate(
                    formData.resort, formData.roomType, formData.packageType,
                    nights, parseInt(formData.adults), parseInt(formData.children)
                );
                setTotalAmount(amount);
            }
        }
    }, [formData.resort, formData.roomType, formData.packageType, formData.checkIn, formData.checkOut, formData.adults, formData.children]);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const nights = Math.ceil((new Date(formData.checkOut) - new Date(formData.checkIn)) / (1000 * 60 * 60 * 24));
            const resortNames = {
                'limuru': 'Jumuia Limuru Country Home',
                'kanamai': 'Jumuia Kanamai Beach Resort',
                'kisumu': 'Jumuia Hotel Kisumu'
            };

            const bookingData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                fullName: `${formData.firstName} ${formData.lastName}`,
                guestName: `${formData.firstName} ${formData.lastName}`,
                email: formData.email,
                phone: formData.phone,
                nationality: formData.nationality,
                resort: formData.resort,
                resortName: resortNames[formData.resort] || 'Jumuia Resort',
                checkIn: formData.checkIn,
                checkOut: formData.checkOut,
                nights,
                adults: parseInt(formData.adults),
                children: parseInt(formData.children),
                roomType: formData.roomType,
                packageType: formData.packageType,
                paymentMethod: formData.paymentMethod === 'bank' ? 'card' : formData.paymentMethod,
                specialRequests: formData.specialRequests,
                totalAmount,
                status: 'pending'
            };
            await saveBooking(bookingData);
            setSuccess('Booking submitted successfully! We will contact you soon.');
            setFormData({
                firstName: '', lastName: '', email: '', phone: '', nationality: 'kenyan',
                resort: '', checkIn: '', checkOut: '', adults: '2', children: '0',
                roomType: '', packageType: 'bnb', paymentMethod: 'mpesa', specialRequests: ''
            });
            setTotalAmount(0);
        } catch (err) {
            setError(err.response?.data?.message || 'Booking failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '12px', boxShadow: '0 5px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '40px' }}>
                <form onSubmit={handleSubmit}>
                    {/* Guest Details */}
                    <div style={{ marginBottom: '25px', borderBottom: '1px solid var(--gray-border)', paddingBottom: '20px' }}>
                        <h3 style={{ marginBottom: '15px', fontSize: '1.3rem', color: 'var(--primary-green)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className="fas fa-user"></i> Guest Details
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <input type="text" name="firstName" className="form-control" placeholder="First Name *" value={formData.firstName} onChange={handleChange} required />
                            <input type="text" name="lastName" className="form-control" placeholder="Last Name *" value={formData.lastName} onChange={handleChange} required />
                            <input type="email" name="email" className="form-control" placeholder="Email Address *" value={formData.email} onChange={handleChange} required style={{ gridColumn: 'span 2' }} />
                            <input type="tel" name="phone" className="form-control" placeholder="Phone Number *" value={formData.phone} onChange={handleChange} required />
                            <select name="nationality" className="form-control" value={formData.nationality} onChange={handleChange}>
                                <option value="kenyan">Kenyan Resident</option>
                                <option value="ea">EA Resident</option>
                                <option value="intl">International</option>
                            </select>
                        </div>
                    </div>

                    {/* Stay Details */}
                    <div style={{ marginBottom: '25px', borderBottom: '1px solid var(--gray-border)', paddingBottom: '20px' }}>
                        <h3 style={{ marginBottom: '15px', fontSize: '1.3rem', color: 'var(--primary-green)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className="fas fa-calendar-alt"></i> Stay Details
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <select name="resort" className="form-control" value={formData.resort} onChange={handleChange} required style={{ gridColumn: 'span 2' }}>
                                <option value="">Select Resort *</option>
                                <option value="limuru">Jumuia Limuru Country Home</option>
                                <option value="kanamai">Jumuia Kanamai Beach Resort</option>
                                <option value="kisumu">Jumuia Hotel Kisumu</option>
                            </select>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Check-in Date</label>
                                <input type="date" name="checkIn" className="form-control" min={today} value={formData.checkIn} onChange={handleChange} required />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Check-out Date</label>
                                <input type="date" name="checkOut" className="form-control" min={formData.checkIn || today} value={formData.checkOut} onChange={handleChange} required />
                            </div>
                            <select name="adults" className="form-control" value={formData.adults} onChange={handleChange}>
                                <option value="1">1 Adult</option>
                                <option value="2">2 Adults</option>
                                <option value="3">3 Adults</option>
                                <option value="4">4 Adults</option>
                            </select>
                            <select name="children" className="form-control" value={formData.children} onChange={handleChange}>
                                <option value="0">No Children</option>
                                <option value="1">1 Child</option>
                                <option value="2">2 Children</option>
                            </select>
                        </div>
                    </div>

                    {/* Room Type & Package */}
                    <div style={{ marginBottom: '25px' }}>
                        <h3 style={{ marginBottom: '15px', fontSize: '1.3rem', color: 'var(--primary-green)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className="fas fa-bed"></i> Room Type & Package
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <select name="roomType" className="form-control" value={formData.roomType} onChange={handleChange} required>
                                <option value="">{formData.resort ? 'Select Room Type *' : 'Select Resort First'}</option>
                                {roomTypes.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                            </select>
                            <select name="packageType" className="form-control" value={formData.packageType} onChange={handleChange}>
                                <option value="bnb">Bed & Breakfast</option>
                                <option value="hb">Half Board</option>
                                <option value="fb">Full Board</option>
                                <option value="conference">Conference</option>
                            </select>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div style={{ marginBottom: '25px' }}>
                        <h3 style={{ marginBottom: '15px', fontSize: '1.3rem', color: 'var(--primary-green)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className="fas fa-credit-card"></i> Payment Method
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            {['mpesa', 'bank'].map(method => (
                                <div
                                    key={method}
                                    className={`payment-method ${formData.paymentMethod === method ? 'active' : ''}`}
                                    onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method }))}
                                    style={{ border: `2px solid ${formData.paymentMethod === method ? 'var(--primary-green)' : 'var(--gray-border)'}`, borderRadius: 'var(--radius)', padding: '15px', textAlign: 'center', cursor: 'pointer', background: formData.paymentMethod === method ? 'var(--light-green)' : 'white' }}
                                >
                                    <i className={method === 'mpesa' ? 'fas fa-mobile-alt' : 'fas fa-university'} style={{ fontSize: '1.5rem', color: 'var(--primary-green)', marginBottom: '8px', display: 'block' }}></i>
                                    <strong>{method === 'mpesa' ? 'M-Pesa' : 'Bank Transfer'}</strong>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Special Requests */}
                    <div style={{ marginBottom: '25px' }}>
                        <textarea name="specialRequests" className="form-control" placeholder="Special Requests (optional)" rows="3" value={formData.specialRequests} onChange={handleChange}></textarea>
                    </div>

                    {/* Total & Submit */}
                    {totalAmount > 0 && (
                        <div style={{ background: 'var(--light-green)', padding: '20px', borderRadius: 'var(--radius)', marginBottom: '20px', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-light)', marginBottom: '5px' }}>Estimated Total</p>
                            <p style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--primary-green)' }}>KES {totalAmount.toLocaleString()}</p>
                        </div>
                    )}

                    {error && <div className="alert alert-error" style={{ marginBottom: '15px' }}>{error}</div>}
                    {success && <div className="alert alert-success" style={{ marginBottom: '15px' }}>{success}</div>}

                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '15px', fontSize: '1.1rem' }}>
                        {loading ? 'Submitting...' : 'Complete Booking'}
                    </button>
                </form>
            </div>
        </div>
    );
}
