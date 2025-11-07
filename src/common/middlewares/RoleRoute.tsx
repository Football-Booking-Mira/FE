import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/common/contexts/useAuth";

interface Props {
  children: React.ReactNode;
  requiredRoles?: string[];
  redirectTo?: string;
}

const RoleRoute: React.FC<Props> = ({
  children,
  requiredRoles = [],
  redirectTo = "/login",
}) => {
  const { isAuthenticated, userRole } = useAuth();

  if (!isAuthenticated) return <Navigate to={redirectTo} replace />;

  if (requiredRoles.length === 0) return <>{children}</>;

  const actual = String(userRole ?? "").toLowerCase();
  const allowed = requiredRoles
    .map((r) => String(r).toLowerCase())
    .includes(actual);

  if (!allowed) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default RoleRoute;
