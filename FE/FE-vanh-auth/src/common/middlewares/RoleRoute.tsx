import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { decodeToken, isTokenExpired } from "@/common/utils/auth";

interface RoleRouteProps {
  children: ReactNode;
  requiredRoles: string[];
  redirectTo?: string;
}

export function RoleRoute({
  children,
  requiredRoles,
  redirectTo = "/",
}: RoleRouteProps) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to={redirectTo} replace />;
  }

  if (isTokenExpired()) {
    localStorage.removeItem("token");
    return <Navigate to={redirectTo} replace />;
  }

  try {
    const decoded = decodeToken();

    if (!decoded) {
      localStorage.removeItem("token");
      return <Navigate to={redirectTo} replace />;
    }

    if (!requiredRoles.includes(decoded.role)) {
      return <Navigate to="/404" replace />;
    }

    return <>{children}</>;
  } catch {
    localStorage.removeItem("token");
    return <Navigate to={redirectTo} replace />;
  }
}
