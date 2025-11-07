import MainLayout from "@/layouts/MainLayout";
import HomePage from "@/pages/client/home/HomePage";
import PitchDetail from "@/pages/client/home/PitchDetail";
import { VerifyPage } from "@/pages/auth/VerifyPage";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmailPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import type { RouteObject } from "react-router";
import Booking from "@/pages/client/home/Booking";

import { Contact } from "lucide-react";
import Checkout from "@/pages/client/home/Checkout";

export const PublicRoutes: RouteObject[] = [
  {
    path: "",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "booking/:id",
        element: <Booking />,
      },
      {
        path: "checkout",
        element: <Checkout />,
      },

      {
        path: "contact",
        element: <Contact />,
      },
      {
        path: "pitch/:id",
        element: <PitchDetail />,
      },
      {
        path: "verify",
        element: <VerifyPage />,
      },
      {
        path: "reset-password",
        element: <ResetPasswordPage />,
      },
      {
        path: "verify-email",
        element: <VerifyEmailPage />,
      },
    ],
  },
];
