import { RoleRoute } from '@/common/middlewares/RoleRoute';
import { Outlet } from 'react-router';

const AdminLayout = () => {
    return (
        <>
            {/* <RoleRoute requiredRoles={["admin"]} redirectTo="/login"> */}
            <Outlet />
            {/* </RoleRoute> */}
        </>
    );
};

export default AdminLayout;
