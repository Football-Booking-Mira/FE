import AdminLayout from "@/layouts/AdminLayout";
import DashBoard from "@/pages/admin/dashboard/DashBoard";
import type { RouteObject } from "react-router";

export const AdminRoutes: RouteObject[] = [
  {
    path: "admin",
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <DashBoard />,
      },
    ],
  },
];
