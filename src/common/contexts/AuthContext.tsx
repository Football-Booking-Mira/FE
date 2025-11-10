import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AuthContextType {
    isAuthenticated: boolean;
    userName: string;
    userRole: string;
    setIsAuthenticated: (value: boolean) => void;
    setUserName: (value: string) => void;
    setUserRole: (value: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export { AuthContext };

// Đọc user từ localStorage (token nằm trong user)
const storedUser =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!storedUser?.token);
    const [userName, setUserName] = useState<string>(() => storedUser?.name || 'User');
    const [userRole, setUserRole] = useState<string>(() => storedUser?.role || '');

    useEffect(() => {
        // Đồng bộ khi localStorage thay đổi (nếu user đăng nhập ở tab khác)
        const onStorage = (e: StorageEvent) => {
            if (e.key === 'user') {
                const newUser = JSON.parse(localStorage.getItem('user') || 'null');
                setIsAuthenticated(!!newUser?.token);
                setUserName(newUser?.name ?? 'User');
                setUserRole(newUser?.role ?? '');
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const logout = () => {
        setIsAuthenticated(false);
        setUserName('User');
        setUserRole('');
        localStorage.removeItem('user'); // chỉ cần xóa user
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                userName,
                userRole,
                setIsAuthenticated,
                setUserName,
                setUserRole,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
