import type { RouteObject } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import HomePage from "@/pages/client/home/HomePage";
import { VerifyPage } from "@/pages/auth/VerifyPage";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmailPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import Checkout from "@/pages/client/home/Checkout";
import PitchDetail from "@/pages/client/home/PitchDetail";
import MyBookings from "@/pages/client/home/MyBookings";
import PaymentSuccessPage from "@/pages/client/home/PaymentSuccessPage";
import CreateMatchSchedule from "@/pages/client/home/CreateMatchSchedule";
import ContactPages from "@/pages/client/home/ContactPages";

export const PublicRoutes: RouteObject[] = [
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "pitch/:id", element: <PitchDetail /> },
      { path: "checkout", element: <Checkout /> },
      { path: "my-bookings", element: <MyBookings /> },
      { path: "verify", element: <VerifyPage /> },
      { path: "verify-email", element: <VerifyEmailPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> },
      { path: "payment-return", element: <PaymentSuccessPage /> },
      { path: "contact", element: <ContactPages /> },
      { path: "lich-thi-dau", element: <CreateMatchSchedule /> },
    ],
  },
];
