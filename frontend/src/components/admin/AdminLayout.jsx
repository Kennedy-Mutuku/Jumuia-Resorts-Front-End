import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from './AdminSidebar';
import './AdminLayout.css';

export default function AdminLayout() {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="admin-loading"><div className="spinner"></div></div>;
    }

    if (!user) {
        return <Navigate to="/admin/login" replace />;
    }

    return (
        <div className="admin-wrapper">
            <AdminSidebar />
            <div className="admin-main">
                <Outlet />
            </div>
        </div>
    );
}
