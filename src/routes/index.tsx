import { Navigate, type RouteObject } from 'react-router-dom';
import { PublicRoutes } from '@/routes/PublicRoutes';
import { AdminRoutes } from '@/routes/AdminRoutes';
import NotFound from '@/pages/NotFound';

export const rootRoutes: RouteObject[] = [
    ...PublicRoutes,
    ...AdminRoutes,

    { path: '/404', element: <NotFound /> },
    { path: '*', element: <Navigate to='/404' replace /> },
];
