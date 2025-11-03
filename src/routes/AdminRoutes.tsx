import AdminLayout from '@/layouts/AdminLayout';
import DashBoard from '@/pages/admin/dashboard/DashBoard';
import type { RouteObject } from 'react-router';
import CourtManagement from '../pages/admin/courts/CourtManagement.tsx';
import Users from '../pages/admin/users/users.tsx';

import CourtUpdate from '../pages/admin/courts/CourtUpdate.tsx';
import CourtDetail from '../pages/admin/dashboard/CourtDetail.tsx';

export const AdminRoutes: RouteObject[] = [
    {
        path: '/admin',
        element: <AdminLayout />,
        children: [
            {
                index: true,
                element: <DashBoard />,
            },
            {
                path: 'courts',
                element: <CourtManagement />,
            },
            {
                path: '/admin/courts/update/:id',
                element: <CourtUpdate />,
            },
            {
                path: '/admin/courts/:id',
                element: <CourtDetail />,
            },

            {
                path: 'customers',
                element: <Users />,
            },
        ],
    },
];
