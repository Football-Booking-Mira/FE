import { USER_ROLES } from "@/common/constants/role";

interface DecodedToken {
  role: string;
  id: string;
  email: string;
  iat: number;
  exp: number;
}

function decodeJwt(token: string): DecodedToken | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch {
    return null;
  }
}


export function getUserRole(): string | null {
  const token = localStorage.getItem("token");
  if (!token) return null;

  const decoded = decodeJwt(token);
  return decoded?.role || null;
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


export function decodeToken(): DecodedToken | null {
  const token = localStorage.getItem("token");
  if (!token) return null;

  return decodeJwt(token);
}


export function isTokenExpired(): boolean {
  const decoded = decodeToken();
  if (!decoded) return true;

  const currentTime = Math.floor(new Date().getTime() / 1000);
  return decoded.exp < currentTime;
}

export interface UserAuth {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: 'admin' | 'user';
    status: string;
    token: string;
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

export const getAccessToken = (): string | null => {
    const user = getCurrentUser();
    return user?.token || null;
};

export const isAuthenticated = (): boolean => {
    return !!getAccessToken();
};
