import NotFound from '@/pages/NotFound';
import { AdminRoutes } from '@/routes/AdminRoutes';
import { PublicRoutes } from '@/routes/PublicRoutes';
import { Navigate, type RouteObject } from 'react-router-dom';

export const rootRoutes: RouteObject[] = [
    ...PublicRoutes,
    ...AdminRoutes,
    { path: '**', element: <Navigate to='/404' replace /> },
    { path: '404', element: <NotFound /> },
];
