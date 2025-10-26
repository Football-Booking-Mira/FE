import { RoleRoute } from "@/common/middlewares/RoleRoute";
import { Outlet } from "react-router";

const AdminLayout = () => {
  return (
    <>
      {/* If user is not authenticated, redirect to home (public) instead of a non-existent /login route */}
      <RoleRoute requiredRoles={["admin"]}>
        <Outlet />
      </RoleRoute>
    </>
  );
};

export default AdminLayout;
