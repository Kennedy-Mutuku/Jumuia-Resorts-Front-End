import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../common/Logo';

const NAV_ITEMS = [
    {
        section: 'Main', items: [
            { to: '/admin/dashboard', icon: 'fas fa-tachometer-alt', label: 'Dashboard' },
            { to: '/admin/bookings', icon: 'fas fa-calendar-check', label: 'Bookings' },
            { to: '/admin/calendar', icon: 'fas fa-calendar-alt', label: 'Calendar' },
        ]
    },
    {
        section: 'Management', items: [
            { to: '/admin/offers', icon: 'fas fa-tags', label: 'Offers' },
            { to: '/admin/content', icon: 'fas fa-edit', label: 'Content' },
            { to: '/admin/feedback', icon: 'fas fa-star', label: 'Feedback' },
            { to: '/admin/messages', icon: 'fas fa-envelope', label: 'Messages' },
        ]
    },
    {
        section: 'Admin', items: [
            { to: '/admin/users', icon: 'fas fa-users', label: 'Users' },
            { to: '/admin/branch-managers', icon: 'fas fa-user-tie', label: 'Branch Managers' },
            { to: '/admin/reports', icon: 'fas fa-chart-bar', label: 'Reports' },
            { to: '/admin/settings', icon: 'fas fa-cog', label: 'Settings' },
        ]
    },
];

export default function AdminSidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    const getAccessibleItems = () => {
        if (!user) return [];
        if (user.role === 'general-manager') return NAV_ITEMS;
        if (user.role === 'manager') {
            return NAV_ITEMS.map(section => ({
                ...section,
                items: section.items.filter(item =>
                    !['Users', 'Branch Managers', 'Settings'].includes(item.label)
                )
            })).filter(section => section.items.length > 0);
        }
        // staff
        return NAV_ITEMS.map(section => ({
            ...section,
            items: section.items.filter(item =>
                ['Dashboard', 'Bookings', 'Feedback', 'Messages'].includes(item.label)
            )
        })).filter(section => section.items.length > 0);
    };

    return (
        <aside className="admin-sidebar">
            <div className="sidebar-header">
                <Logo className="logo-img" />
                <h2>Jumuia Resorts</h2>
                <p>Admin Panel</p>
            </div>

            <div className="sidebar-user">
                <div className="user-name">{user?.name || 'Admin'}</div>
                <div className="user-role">{user?.role?.replace('-', ' ') || 'User'}</div>
            </div>

            <nav className="sidebar-nav">
                {getAccessibleItems().map((section) => (
                    <div key={section.section}>
                        <div className="nav-section-title">{section.section}</div>
                        {section.items.map((item) => (
                            <NavLink key={item.to} to={item.to}>
                                <i className={item.icon}></i>
                                {item.label}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt"></i>
                    Logout
                </button>
            </div>
        </aside>
    );
}
