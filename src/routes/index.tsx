import NotFound from "@/pages/NotFound";
import { AdminRoutes } from "@/routes/AdminRoutes";
import { PublicRoutes } from "@/routes/PublicRoutes";
import { type RouteObject } from "react-router";

export const rootRoutes: RouteObject[] = [
  ...PublicRoutes,
  ...AdminRoutes,
  { path: "*", element: <NotFound /> },
];
