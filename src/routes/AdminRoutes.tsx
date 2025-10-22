import AdminLayout from "@/layouts/AdminLayout";
import DashBoard from "@/pages/admin/dashboard/DashBoard";
import type { RouteObject } from "react-router";

import AdminPitchDetail from "@/pages/admin/dashboard/CourtDetail";

export const AdminRoutes: RouteObject[] = [
  {
    path: "admin",
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <DashBoard />,
      },
      {
        path: "pitch/:id",
        element: <AdminPitchDetail />, // Hết lỗi gạch đỏ
      },
    ],
  },
];
