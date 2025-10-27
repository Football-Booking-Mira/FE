import { Outlet, NavLink } from 'react-router-dom';
import { Home, Calendar, Users, Settings, LogOut } from 'lucide-react';

const AdminLayout = () => {
    return (
        <div className='flex min-h-screen bg-gray-50 text-gray-900'>
            {/* Sidebar */}
            <aside className='w-64 bg-white border-r flex flex-col justify-between'>
                <div>
                    <div className='p-4 text-2xl font-bold text-primary'>Trang quản lý</div>
                    <nav className='mt-6 flex flex-col space-y-1'>
                        <NavLink
                            to='/admin'
                            end
                            className={({ isActive }) =>
                                `flex items-center px-5 py-2 text-sm font-medium ${
                                    isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-gray-700 hover:bg-gray-100'
                                }`
                            }
                        >
                            <Home className='w-4 h-4 mr-2' /> Tổng quan
                        </NavLink>
                        <NavLink
                            to='/admin/court'
                            className={({ isActive }) =>
                                `flex items-center px-5 py-2 text-sm font-medium ${
                                    isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-gray-700 hover:bg-gray-100'
                                }`
                            }
                        >
                            <Calendar className='w-4 h-4 mr-2' /> Quản lý sân
                        </NavLink>
                        <NavLink
                            to='/admin/customers'
                            className='flex items-center px-5 py-2 text-sm text-gray-700 hover:bg-gray-100'
                        >
                            <Users className='w-4 h-4 mr-2' /> Khách hàng
                        </NavLink>
                    </nav>
                </div>

                <button className='flex items-center px-5 py-3 text-sm text-gray-600 hover:bg-gray-100 border-t'>
                    <LogOut className='w-4 h-4 mr-2' /> Đăng xuất
                </button>
            </aside>

            {/* Main Content */}
            <main className='flex-1'>
                <header className='p-4 border-b bg-white flex justify-between items-center'>
                    <h1 className='font-semibold text-lg'>FOOBALL BOOKING</h1>
                    <Settings className='w-5 h-5 text-gray-600' />
                </header>
                <div className='p-6'>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
