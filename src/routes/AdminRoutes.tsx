import AdminLayout from '@/layouts/AdminLayout';
import CourtDetail from '@/pages/admin/dashboard/CourtDetail';
import DashBoard from '@/pages/admin/dashboard/DashBoard';
import type { RouteObject } from 'react-router';
import CourtList from '../pages/admin/courts/CourtList.tsx';

export const AdminRoutes: RouteObject[] = [
    {
        path: 'admin',
        element: <AdminLayout />,
        children: [
            {
                index: true,
                element: <DashBoard />,
            },
            { path: 'court', element: <CourtList /> },
            {
                path: 'court/:id',
                element: <CourtDetail />,
            },
        ],
    },
];
