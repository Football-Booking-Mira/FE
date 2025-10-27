import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

interface PrivateRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function PrivateRoute({
  children,
  redirectTo = "/",
}: PrivateRouteProps) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
