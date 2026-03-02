import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = () => {
        try {
            const sessionStr = localStorage.getItem('jumuia_resort_session');
            if (sessionStr) {
                const session = JSON.parse(sessionStr);
                if (session.expiryTime && new Date(session.expiryTime) > new Date()) {
                    setUser(session);
                } else {
                    localStorage.removeItem('jumuia_resort_session');
                    sessionStorage.removeItem('jumuia_auth');
                }
            }
        } catch (e) {
            // ignore
        }
        setLoading(false);
    };

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const data = response.data;

        let assignedProperty = 'all';
        if (data.role !== 'general-manager' && data.properties?.length > 0) {
            assignedProperty = data.properties[0];
        }

        const sessionData = {
            uid: data._id,
            email: data.email,
            name: data.name,
            role: data.role,
            properties: data.properties || [],
            assignedProperty,
            token: data.token,
            loginTime: new Date().toISOString(),
            expiryTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
        };

        localStorage.setItem('jumuia_resort_session', JSON.stringify(sessionData));
        sessionStorage.setItem('jumuia_auth', 'authenticated');
        setUser(sessionData);
        return sessionData;
    };

    const logout = () => {
        localStorage.removeItem('jumuia_resort_session');
        sessionStorage.removeItem('jumuia_auth');
        document.cookie = 'jumuia_session=; path=/; max-age=0';
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
