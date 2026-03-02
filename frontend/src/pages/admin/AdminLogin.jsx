import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import '../../components/admin/AdminLayout.css';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!email || !password) { setError('Please enter email and password'); return; }

        setLoading(true);
        try {
            await login(email, password);
            setSuccess('Login successful!');
            setTimeout(() => navigate('/admin/dashboard'), 800);
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            if (msg.includes('401') || msg.includes('Invalid')) {
                setError('Wrong password');
            } else {
                setError(msg);
            }
            setLoading(false);
        }
    };

    const handleClear = () => {
        setEmail(''); setPassword(''); setError('');
    };

    return (
        <div className="login-page" style={{ marginTop: 0 }}>
            <div className="login-box">
                <div className="login-header-logo">
                    <Logo className="logo-img" style={{ width: '60px' }} />
                    <h3>Jumuia Resorts</h3>
                </div>

                <div className="login-title">
                    <h2>Log in</h2>
                </div>

                <form className="smart-login-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <label htmlFor="email">e-mail</label>
                        <input type="email" id="email" placeholder="admin@jumuiaresorts.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>

                    <div className="form-row">
                        <label htmlFor="password">Password</label>
                        <div className="password-wrapper">
                            <input type={showPassword ? 'text' : 'password'} id="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                            <button type="button" className="password-eye" onClick={() => setShowPassword(!showPassword)}>
                                <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                            </button>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-clear" onClick={handleClear}>Clear</button>
                        <button type="submit" className="btn-next" disabled={loading}>
                            {loading ? <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', display: 'inline-block' }}></span> : 'Next'}
                        </button>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}
                    {success && <div className="alert alert-success">{success}</div>}

                    <div className="form-links">
                        <a href="#">Forgot password</a>
                        <Link to="/">Home</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
