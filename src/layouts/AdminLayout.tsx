import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Drawer } from 'antd';
import {
    DashboardOutlined,
    AppstoreOutlined,
    UserOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    CalendarOutlined,
    UnorderedListOutlined,
    PlusCircleOutlined,
    TeamOutlined,
    ToolOutlined,
    GiftOutlined,
    FundViewOutlined,
    MailOutlined,
    HomeOutlined,
    SunOutlined,
    MoonOutlined,
    CommentOutlined
} from '@ant-design/icons';
import { ShieldCheck } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/common/contexts';

const { Header, Sider, Content } = Layout;

const AdminLayout: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [openKeys, setOpenKeys] = useState<string[]>([]);
    const [isMobile, setIsMobile] = useState(false);
    const navigate = useNavigate();

    // Trạng thái giao diện (Theme)
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark') || 
                   localStorage.getItem('theme') === 'dark';
        }
        return false;
    });

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const toggleDarkMode = () => setIsDarkMode(prev => !prev);
    
    // Khởi tạo Auth Context
    const { userName, userAvatar, userRole, logout } = useAuth();

    const location = useLocation();
    const pathname = location.pathname;

    const getSelectedKey = (path: string) => {
        if (path.startsWith('/admin/bookings/create')) return 'bookings-create';
        if (path.startsWith('/admin/bookings')) return 'bookings-list';
        if (path.startsWith('/admin/courts')) return 'courts';
        if (path.startsWith('/admin/customers')) return 'customers';
        if (path.startsWith('/admin/equipments')) return 'equipments';
        if (path.startsWith('/admin/reports')) return 'reports';
        if (path.startsWith('/admin/invoices')) return 'invoices';
        if (path.startsWith('/admin/vouchers')) return 'vouchers';
        if (path.startsWith('/admin/reviews')) return 'reviews';
        if (path.startsWith('/admin/contacts')) return 'contacts';
        return 'dashboard';
    };

    const selectedKey = getSelectedKey(pathname);

    useEffect(() => {
        if (pathname.startsWith('/admin/bookings')) {
            setOpenKeys(['bookings']);
            return;
        }
        setOpenKeys([]);
    }, [pathname]);

    // Xử lý hiển thị trên giao diện thiết bị di động
    useEffect(() => {
        // Xử lý hiển thị trên giao diện thiết bị di động
        const handleResize = () => {
            const width = window.innerWidth;
            if (width < 1024) {
                setIsMobile(true);
                setCollapsed(true);
            } else {
                setIsMobile(false);
                setCollapsed(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        
        // Sử dụng interval để kiểm tra định kỳ localStorage cho thay đổi avatar/tên
        const interval = setInterval(() => {
            // Component này sử dụng các giá trị AuthContext được cập nhật bởi Provider
            // thông qua các sự kiện 'storage'. 
            // Trong trường hợp tab không nhận được sự kiện, chúng ta có thể kích hoạt thủ công nếu cần.
        }, 2000);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearInterval(interval);
        };
    }, []);

    // Đóng thanh bên (sidebar) khi chuyển trang trên thiết bị di động
    useEffect(() => {
        if (isMobile) {
            setCollapsed(true);
        }
    }, [pathname, isMobile]);

    // Hàm hỗ trợ định dạng đường dẫn avatar
    const getAvatarUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
        return `${baseUrl}/${url.startsWith('/') ? url.slice(1) : url}`;
    };

    const avatarSrc = getAvatarUrl(userAvatar);

    const userMenu = {
        items: [
            {
                key: 'profile-header',
                label: (
                    <div className="flex flex-col min-w-[280px] p-2 font-sans bg-linear-to-br from-indigo-500/10 to-violet-500/5 rounded-2xl border border-indigo-500/10 mb-2">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Avatar
                                    src={avatarSrc}
                                    icon={!avatarSrc ? <UserOutlined /> : undefined}
                                    size={56}
                                    className="border-2 border-indigo-500 shadow-xl object-cover bg-linear-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/40 dark:to-violet-900/40"
                                />
                                <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full animate-pulse shadow-lg"></div>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-black text-slate-800 dark:text-white text-base leading-tight tracking-tight">{userName || 'Administrator'}</span>
                                <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500 text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                                    <ShieldCheck size={10} className="stroke-3" />
                                    {userRole === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                                </div>
                            </div>
                        </div>
                    </div>
                ),
                style: { cursor: 'default', background: 'transparent' },
            },
            {
                key: 'profile',
                label: (
                    <div className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all hover:bg-indigo-50 dark:hover:bg-indigo-500/10 group">
                        <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                            <UserOutlined className="text-lg" />
                        </div>
                        <span className="font-bold text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">Hồ sơ cá nhân</span>
                    </div>
                ),
                onClick: () => navigate('/profile'),
            },
            {
                key: 'client',
                label: (
                    <div className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all hover:bg-emerald-50 dark:hover:bg-emerald-500/10 group">
                        <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                            <HomeOutlined className="text-lg" />
                        </div>
                        <span className="font-bold text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 transition-colors">Trang người dùng</span>
                    </div>
                ),
                onClick: () => navigate('/'),
            },
            { type: 'divider' as const },
            {
                key: 'logout',
                label: (
                    <div className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all hover:bg-rose-50 dark:hover:bg-rose-500/10 group">
                        <div className="w-9 h-9 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white transition-all duration-300">
                            <LogoutOutlined className="text-lg" />
                        </div>
                        <span className="font-bold text-rose-600">Đăng xuất hệ thống</span>
                    </div>
                ),
                onClick: () => {
                    logout();
                    navigate('/signin');
                },
            },
        ],
    };

    // Nội dung thanh bên dùng chung (Sử dụng cho cả Desktop và Mobile)
    const renderSidebarContent = (isDrawer = false) => (
        <div className="flex flex-col h-full bg-linear-to-b from-[#0f172a] via-[#1e1b4b] to-[#0f172a]">
            {/* Logo Area */}
            <div className={`flex items-center border-b border-white/10 bg-white/5 backdrop-blur-md relative overflow-hidden shrink-0 ${isDrawer ? 'h-16 px-6' : 'h-20 justify-center'}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <Link to="/admin" className={`flex items-center gap-3 relative z-10 w-full ${isDrawer ? 'justify-start' : 'justify-center px-4'}`}>
                    <img
                        src='/lg-mira.png'
                        alt='MIRA'
                        className={`transition-all duration-300 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)] ${(!isDrawer && collapsed) ? 'h-9' : 'h-11'}`}
                    />
                    {(!collapsed || isDrawer) && (
                        <div className="flex flex-col">
                            <span className="text-[20px] font-extrabold bg-linear-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent tracking-wide leading-tight">
                                MIRA
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
                                Workspace
                            </span>
                        </div>
                    )}
                </Link>
            </div>

            {/* Navigation Menu */}
            <div className="flex-1 overflow-y-auto no-scrollbar py-6">
                <Menu
                    mode='inline'
                    selectedKeys={[selectedKey]}
                    openKeys={openKeys}
                    onOpenChange={(keys) => setOpenKeys(keys as string[])}
                    theme='dark'
                    className="bg-transparent border-none px-3 sidebar-menu"
                    items={[
                        {
                            key: 'reports',
                            icon: <DashboardOutlined className="text-lg" />,
                            label: <Link to='/admin'>Tổng quan</Link>,
                        },
                        {
                            key: 'courts',
                            icon: <FundViewOutlined className="text-lg" />,
                            label: <Link to='/admin/courts'>Quản lý sân</Link>,
                        },
                        {
                            key: 'reviews',
                            icon: <CommentOutlined className="text-lg" />,
                            label: <Link to='/admin/reviews'>Bình luận & Đánh giá</Link>,
                        },
                        {
                            key: 'bookings',
                            icon: <CalendarOutlined className="text-lg" />,
                            label: 'Đặt sân',
                            children: [
                                {
                                    key: 'bookings-list',
                                    icon: <UnorderedListOutlined />,
                                    label: <Link to='/admin/bookings'>Danh sách</Link>,
                                },
                                {
                                    key: 'bookings-create',
                                    icon: <PlusCircleOutlined />,
                                    label: <Link to='/admin/bookings/create'>Tạo đơn mới</Link>,
                                },
                            ],
                        },
                        {
                            key: 'customers',
                            icon: <TeamOutlined className="text-lg" />,
                            label: <Link to='/admin/customers'>Khách hàng</Link>,
                        },
                        {
                            key: 'equipments',
                            icon: <ToolOutlined className="text-lg" />,
                            label: <Link to='/admin/equipments'>Thiết bị</Link>,
                        },
                        {
                            key: 'vouchers',
                            icon: <GiftOutlined className="text-lg" />,
                            label: <Link to='/admin/vouchers'>Khuyến mãi</Link>,
                        },
                        {
                            key: 'contacts',
                            icon: <MailOutlined className="text-lg" />,
                            label: <Link to='/admin/contacts'>Hỗ trợ</Link>,
                        },
                    ]}
                />
            </div>

            {/* Sidebar Footer (Go to Client) */}
            {(!collapsed || isDrawer) && (
                <div className="p-4 border-t border-white/10 bg-black/20 shrink-0">
                    <Link 
                        to="/"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all duration-300 group"
                    >
                        <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
                            <HomeOutlined />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-indigo-100 text-[13px] font-semibold">Trang người dùng</span>
                            <span className="text-indigo-400/70 text-[10px]">Quay lại giao diện khách</span>
                        </div>
                    </Link>
                </div>
            )}
        </div>
    );

    const siderWidth = 280;
    const collapsedWidth = 80;

    return (
        <Layout hasSider className="min-h-screen bg-slate-50 dark:bg-slate-950 relative selection:bg-emerald-500/30 transition-colors duration-300">
            {/* ====== DESKTOP SIDEBAR ====== */}
            {!isMobile && (
                <Sider
                    trigger={null}
                    collapsible
                    collapsed={collapsed}
                    width={siderWidth}
                    collapsedWidth={collapsedWidth}
                    className="fixed! left-0 top-0 bottom-0 border-r border-[#ffffff10] shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
                    style={{ background: '#0f172a', zIndex: 100 }}
                >
                    {renderSidebarContent(false)}
                </Sider>
            )}

            {/* ====== MOBILE DRAWER ====== */}
            <Drawer
                placement="left"
                closable={false}
                onClose={() => setCollapsed(true)}
                open={isMobile && !collapsed}
                width={siderWidth}
                styles={{ 
                    body: { padding: 0 },
                    wrapper: { background: isDarkMode ? 'var(--sidebar)' : '#fff' }
                }}
            >
                {renderSidebarContent(true)}
            </Drawer>

            {/* ====== MAIN AREA ====== */}
            <Layout 
                className="bg-background min-w-0 transition-all duration-300 ease-in-out"
                style={{ 
                    // Tính toán khoảng cách (margin) để tránh bị đè bởi thanh bên cố định
                    marginLeft: isMobile ? 0 : (collapsed ? collapsedWidth : siderWidth) 
                }}
            >
                {/* ====== HEADER ====== */}
                <Header
                    className="h-16 lg:h-20 px-4 sm:px-6 lg:px-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 shadow-sm flex items-center justify-between sticky top-0 w-full transition-all duration-300"
                    style={{ zIndex: 90 }}
                >
                    {/* Left Header Controls */}
                    <div className="flex items-center gap-4 lg:gap-6 w-full lg:w-auto">
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-secondary hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-center transition-all duration-300 shadow-sm border border-slate-200/50 dark:border-white/5 hover:border-emerald-200 shrink-0"
                        >
                            {collapsed ? <MenuUnfoldOutlined className="text-lg" /> : <MenuFoldOutlined className="text-lg" />}
                        </button>

                        {/* Mobile Title Replacement */}
                        {isMobile && (
                            <div className="flex-1 lg:hidden text-center truncate pr-10">
                                <span className="font-bold text-lg bg-linear-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Trang Quản Trị</span>
                            </div>
                        )}
                    </div>

                    {/* Right Header Profile/Tools */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                        {/* Theme Toggle Admin */}
                        <button 
                            onClick={toggleDarkMode}
                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-secondary text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-center transition-all duration-300 border border-slate-200/50 dark:border-white/5 shadow-sm"
                            title={isDarkMode ? "Chuyển sang nền sáng" : "Chuyển sang nền tối"}
                        >
                            {isDarkMode ? <SunOutlined className="text-lg" /> : <MoonOutlined className="text-lg" />}
                        </button>

                        <Dropdown 
                            menu={userMenu} 
                            placement='bottomRight' 
                            trigger={['click']}
                            dropdownRender={(menu) => (
                                <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[28px] shadow-[0_20px_40px_-5px_rgba(0,0,0,0.15)] border border-slate-200/50 dark:border-white/10 overflow-hidden mt-2 min-w-[300px] p-2 animate-in slide-in-from-top-2 duration-300 relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                    {menu}
                                </div>
                            )}
                        >
                            <div className="flex items-center gap-3 cursor-pointer p-1 lg:p-1.5 lg:pr-4 rounded-full bg-white dark:bg-secondary border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300 group">
                                <Avatar
                                    src={avatarSrc}
                                    icon={!avatarSrc ? <UserOutlined /> : undefined}
                                    size={{ xs: 32, sm: 36 }}
                                    className="bg-linear-to-br from-emerald-400 to-teal-500 object-cover shadow-sm group-hover:scale-105 transition-transform"
                                />
                                <div className="hidden lg:flex flex-col leading-tight">
                                    <span className="text-[13px] font-bold text-slate-800 dark:text-white">{userName || 'Admin'}</span>
                                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 rounded w-max mt-0.5">Quản trị</span>
                                </div>
                            </div>
                        </Dropdown>
                    </div>
                </Header>

                {/* ====== CONTENT ====== */}
                <Content className="p-3 sm:p-6 lg:p-8 w-full max-w-full overflow-x-hidden">
                    <div className="mx-auto w-full max-w-[1600px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/60 dark:border-white/5 p-4 sm:p-8 min-h-[calc(100vh-140px)] transition-colors duration-300">
                        <Outlet />
                    </div>
                </Content>
            </Layout>

            {/* Custom Styles */}
            <style>{`
                /* Ensure body allows smooth scrolling & backgrounds */
                body {
                    background-color: var(--background, #f8fafc) !important;
                }

                /* Responsive Tables for all admin pages */
                .ant-table-wrapper {
                    overflow-x: auto;
                    width: 100%;
                }
                .ant-table-content {
                    overflow-x: auto;
                }
                .ant-table {
                    min-width: 800px; /* Minimum width to prevent columns from squishing, triggers scroll */
                }

                /* Glowing Submenu / Sidebar Items */
                .sidebar-menu.ant-menu {
                    background: transparent !important;
                }
                .sidebar-menu a, .sidebar-menu a:hover {
                    text-decoration: none !important;
                }
                .sidebar-menu .ant-menu-item {
                    margin: 8px 16px;
                    border-radius: 12px;
                    height: 44px;
                    line-height: 44px;
                    font-weight: 500;
                    color: rgba(255, 255, 255, 0.65);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                }
                .sidebar-menu .ant-menu-item:hover {
                    background: rgba(255, 255, 255, 0.08) !important;
                    color: #fff;
                    transform: translateX(4px);
                }
                .sidebar-menu .ant-menu-item-selected {
                    background: linear-gradient(90deg, rgba(16, 185, 129, 0.15) 0%, rgba(20, 184, 166, 0.05) 100%) !important;
                    color: #34d399 !important;
                    font-weight: 600;
                    box-shadow: inset 3px 0 0 #34d399;
                }
                .sidebar-menu .ant-menu-item-selected .anticon {
                    color: #34d399 !important;
                    filter: drop-shadow(0 0 8px rgba(52, 211, 153, 0.4));
                }
                
                .sidebar-menu .ant-menu-submenu-title {
                    margin: 8px 16px;
                    border-radius: 12px;
                    height: 44px;
                    line-height: 44px;
                    font-weight: 500;
                    color: rgba(255, 255, 255, 0.65) !important;
                    transition: all 0.3s ease;
                }
                .sidebar-menu .ant-menu-submenu-title:hover {
                    background: rgba(255, 255, 255, 0.08) !important;
                    color: #fff !important;
                    transform: translateX(4px);
                }
                .sidebar-menu .ant-menu-submenu-open .ant-menu-submenu-title,
                .sidebar-menu .ant-menu-submenu-active .ant-menu-submenu-title {
                    color: #fff !important;
                }
                
                .sidebar-menu .ant-menu-sub {
                    background: rgba(0, 0, 0, 0.25) !important;
                    border-radius: 12px;
                    margin: 4px 16px;
                    position: relative;
                }
                .sidebar-menu .ant-menu-sub::before {
                    content: '';
                    position: absolute;
                    left: 22px;
                    top: 10px;
                    bottom: 10px;
                    width: 1px;
                    background: rgba(255, 255, 255, 0.1);
                }
                .sidebar-menu .ant-menu-sub .ant-menu-item {
                    margin: 4px 8px;
                    height: 38px;
                    line-height: 38px;
                    padding-left: 40px !important;
                    font-size: 13px;
                }
                .sidebar-menu .ant-menu-sub .ant-menu-item-selected {
                    background: rgba(52, 211, 153, 0.1) !important;
                    box-shadow: none;
                }
                .sidebar-menu .ant-menu-sub .ant-menu-item-selected::before {
                    content: '';
                    position: absolute;
                    left: 20px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    background: #34d399;
                    box-shadow: 0 0 10px #34d399;
                }

                /* Scrollbar for layout */
                .no-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .no-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .no-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.15);
                    border-radius: 10px;
                }
                .no-scrollbar:hover::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.3);
                }
            `}</style>
        </Layout>
    );
};

export default AdminLayout;

