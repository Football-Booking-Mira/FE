import MainLayout from "@/layouts/MainLayout";
import HomePage from "@/pages/client/home/HomePage";
import PitchDetail from "@/pages/client/home/PitchDetail";
import type { RouteObject } from "react-router";

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
        path: "pitch/:id",
        element: <PitchDetail />,
      },
    ],
  },
];
