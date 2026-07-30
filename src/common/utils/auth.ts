import { USER_ROLES } from "@/common/constants/role";

export interface UserAuth {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: 'admin' | 'user';
    status: string;
    avatar?: string;
}

const USER_KEY = 'user';

export const getCurrentUser = (): UserAuth | null => {
    try {
        const raw = localStorage.getItem(USER_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as UserAuth;
    } catch {
        return null;
    }
};

export function getUserRole(): string | null {
    const user = getCurrentUser();
    return user?.role || null;
}

export function hasRole(requiredRole: string): boolean {
    const userRole = getUserRole();
    return userRole === requiredRole;
}

export function isAdmin(): boolean {
    return hasRole(USER_ROLES.ADMIN);
}

export function isUser(): boolean {
    return hasRole(USER_ROLES.USER);
}

export const isAuthenticated = (): boolean => {
    return !!getCurrentUser();
};
