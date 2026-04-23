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
import Profile from "@/pages/client/home/Profile";
import BookingPolicyPage from "@/pages/client/home/BookingPolicyPage.tsx";
import Equipment from "@/pages/client/home/Equipment";
import Reviews from "@/pages/client/home/Reviews";
import SigninPage from "@/pages/auth/SigninPage";
import SignupPage from "@/pages/auth/SignupPage";

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
      { path: "signin", element: <SigninPage /> },
      { path: "signup", element: <SignupPage /> },
      { path: "payment-return", element: <PaymentSuccessPage /> },
      { path: "contact", element: <ContactPages /> },
      { path: "lich-thi-dau", element: <CreateMatchSchedule /> },
      { path: "profile", element: <Profile /> },
      { path: "booking-policy", element: <BookingPolicyPage /> },
      { path: "equipments", element: <Equipment /> },
      { path: "my-reviews", element: <Reviews /> },
    ],
  },
];
