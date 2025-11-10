import AdminLayout from '@/layouts/AdminLayout';
import DashBoard from '@/pages/admin/dashboard/DashBoard';
import type { RouteObject } from 'react-router';
import CourtManagement from '../pages/admin/courts/CourtManagement.tsx';
import Users from '../pages/admin/users/users.tsx';
import RoleRoute from '@/common/middlewares/RoleRoute';
import CourtUpdate from '../pages/admin/courts/CourtUpdate.tsx';
import CourtDetail from '../pages/admin/dashboard/CourtDetail.tsx';
import BookingList from '../pages/admin/bookings/BookingList.tsx';

export const AdminRoutes: RouteObject[] = [
    {
        path: '/admin',
        element: (
            <RoleRoute requiredRoles={['admin']} redirectTo='/login'>
                <AdminLayout />
            </RoleRoute>
        ),
        children: [
            { index: true, element: <DashBoard /> },
            { path: 'courts', element: <CourtManagement /> },
            { path: 'courts/update/:id', element: <CourtUpdate /> },
            { path: 'courts/:id', element: <CourtDetail /> },
            { path: 'bookings', element: <BookingList /> },
            { path: 'customers', element: <Users /> },
        ],
    },
];
