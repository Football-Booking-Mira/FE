import type { RouteObject } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import DashBoard from "@/pages/admin/dashboard/DashBoard";
import CourtManagement from "@/pages/admin/courts/CourtManagement";
import BookingCreate from "@/pages/admin/bookings/BookingCreate";
import EquipmentList from "@/pages/admin/equipments/EquipmentList.tsx";
import BookingList from "@/pages/admin/bookings/BookingList.tsx";
import RoleRoute from "@/common/middlewares/RoleRoute";
import BookingPolicyPage from "@/pages/client/home/BookingPolicyPage";
import CourtUpdate from "../pages/admin/courts/CourtUpdate";
import CourtDetail from "../pages/admin/dashboard/CourtDetail";
import VoucherCreate from "../pages/admin/vouchers/VoucherCreate";
import VoucherManagement from "../pages/admin/vouchers/VoucherManagement";
import VoucherEdit from "../pages/admin/vouchers/VoucherEdit";

import Users from "@/pages/admin/users/users.tsx";
import BookingReportPage from "@/pages/admin/reports/BookingReportPage";

import Reviews from "@/pages/client/home/Reviews";
import ReviewsAdmin from "@/pages/admin/review/ReviewsAdmin";
import ContactsPage from "@/pages/admin/contacts/ContactsPage";

export const AdminRoutes: RouteObject[] = [
  {
    path: "/admin",
    element: (
      <RoleRoute requiredRoles={["admin"]} redirectTo="/login">
        <AdminLayout />
      </RoleRoute>
    ),
    children: [
      { index: true, element: <BookingReportPage /> },
      { path: "courts", element: <CourtManagement /> },
      { path: "reviews", element: <ReviewsAdmin /> },
      { path: "courts/update/:id", element: <CourtUpdate /> },
      { path: "courts/:id", element: <CourtDetail /> },
      { path: "bookings", element: <BookingList /> },
      { path: "bookings/create", element: <BookingCreate /> },
      { path: "customers", element: <Users /> },
      { path: "equipments", element: <EquipmentList /> }, // Thiết bị

      { path: "vouchers", element: <VoucherManagement /> },
      { path: "vouchers/create", element: <VoucherCreate /> },
      { path: "vouchers/edit/:id", element: <VoucherEdit /> },
      { path: "booking-policy", element: <BookingPolicyPage /> },
      // { path: "admin", element: <BookingReportPage /> },
      { path: "contacts", element: <ContactsPage /> },
    ],
  },
];
