import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/common/contexts";

interface PrivateRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function PrivateRoute({
  children,
  redirectTo = "/signin",
}: PrivateRouteProps) {
  const { isAuthenticated } = useAuth();
  const hasUser = typeof window !== "undefined" && !!localStorage.getItem("user");

  if (!isAuthenticated && !hasUser) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
