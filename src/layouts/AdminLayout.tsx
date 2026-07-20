import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Drawer } from 'antd';
import {
    DashboardOutlined,
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
import { ShieldCheck, Sparkles, ChevronDown } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/common/contexts';

const { Header, Sider, Content } = Layout;

const AdminLayout: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [openKeys, setOpenKeys] = useState<string[]>([]);
    const [isMobile, setIsMobile] = useState(false);
    const navigate = useNavigate();

    // Theme state
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
    
    // Auth Context
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

    // Responsive viewport detection
    useEffect(() => {
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

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Close sidebar drawer on route change on mobile
    useEffect(() => {
        if (isMobile) {
            setCollapsed(true);
        }
    }, [pathname, isMobile]);

    // Helper for avatar URL
    const getAvatarUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
        return `${baseUrl}/${url.startsWith('/') ? url.slice(1) : url}`;
    };

    const avatarSrc = getAvatarUrl(userAvatar);

    // Admin Dropdown Menu
    const userMenu = {
        items: [
            {
                key: 'profile-header',
                label: (
                    <div className="flex flex-col min-w-[280px] p-3 font-sans bg-linear-to-br from-indigo-500/10 via-purple-500/5 to-emerald-500/10 rounded-2xl border border-indigo-500/20 mb-2">
                        <div className="flex items-center gap-3.5">
                            <div className="relative">
                                <Avatar
                                    src={avatarSrc}
                                    icon={!avatarSrc ? <UserOutlined /> : undefined}
                                    size={52}
                                    className="border-2 border-emerald-500 shadow-md object-cover bg-linear-to-br from-emerald-400 to-teal-500"
                                />
                                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-md"></div>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="font-extrabold text-foreground text-sm leading-snug truncate">{userName || 'Administrator'}</span>
                                <div className="mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-600 text-[9px] font-black text-white uppercase tracking-widest shadow-xs w-max">
                                    <ShieldCheck size={10} className="shrink-0" />
                                    {userRole === 'admin' ? 'Quản trị viên MIRA Football' : 'Thành viên'}
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
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-indigo-500/10 group">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <UserOutlined className="text-sm" />
                        </div>
                        <span className="font-semibold text-xs text-foreground group-hover:text-indigo-600 transition-colors">Hồ sơ cá nhân</span>
                    </div>
                ),
                onClick: () => navigate('/profile'),
            },
            {
                key: 'client',
                label: (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-emerald-500/10 group">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                            <HomeOutlined className="text-sm" />
                        </div>
                        <span className="font-semibold text-xs text-foreground group-hover:text-emerald-600 transition-colors">Trang người dùng</span>
                    </div>
                ),
                onClick: () => navigate('/'),
            },
            { type: 'divider' as const },
            {
                key: 'logout',
                label: (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-rose-500/10 group">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-all">
                            <LogoutOutlined className="text-sm" />
                        </div>
                        <span className="font-bold text-xs text-rose-600">Đăng xuất hệ thống</span>
                    </div>
                ),
                onClick: () => {
                    logout();
                    navigate('/signin');
                },
            },
        ],
    };

    // Sidebar Content (Desktop & Mobile Drawer)
    const renderSidebarContent = (isDrawer = false) => (
        <div className="flex flex-col h-full bg-linear-to-b from-slate-950 via-slate-900 to-indigo-950 text-white">
            {/* Logo Area */}
            <div className={`flex items-center border-b border-white/10 bg-white/5 backdrop-blur-md relative overflow-hidden shrink-0 ${isDrawer ? 'h-16 px-6' : 'h-20 justify-center'}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <Link to="/admin" className={`flex items-center gap-3 relative z-10 w-full ${isDrawer ? 'justify-start' : 'justify-center px-4'}`}>
                    <img
                        src='/lg-mira.png'
                        alt='MIRA Football'
                        className={`transition-all duration-300 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)] ${(!isDrawer && collapsed) ? 'h-9' : 'h-11'}`}
                    />
                    {(!collapsed || isDrawer) && (
                        <div className="flex flex-col">
                            <span className="text-[20px] font-black bg-linear-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent tracking-wide leading-none">
                                MIRA
                            </span>
                            <span className="text-[10px] text-emerald-400 font-extrabold tracking-widest uppercase mt-0.5">
                                Football
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
                                    label: <Link to='/admin/bookings'>Danh sách đặt sân</Link>,
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
                            label: <Link to='/admin/equipments'>Thiết bị sân</Link>,
                        },
                        {
                            key: 'vouchers',
                            icon: <GiftOutlined className="text-lg" />,
                            label: <Link to='/admin/vouchers'>Khuyến mãi</Link>,
                        },
                        {
                            key: 'contacts',
                            icon: <MailOutlined className="text-lg" />,
                            label: <Link to='/admin/contacts'>Hỗ trợ & Liên hệ</Link>,
                        },
                    ]}
                />
            </div>

            {/* Sidebar Footer */}
            {(!collapsed || isDrawer) && (
                <div className="p-4 border-t border-white/10 bg-black/20 shrink-0">
                    <Link 
                        to="/"
                        className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all group"
                    >
                        <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                            <HomeOutlined />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-emerald-100 text-[12px] font-bold">Trang người dùng</span>
                            <span className="text-emerald-400/80 text-[10px]">Quay lại giao diện khách</span>
                        </div>
                    </Link>
                </div>
            )}
        </div>
    );

    const siderWidth = 270;
    const collapsedWidth = 80;

    return (
        <Layout hasSider className="min-h-screen bg-slate-50 dark:bg-slate-950 relative transition-colors duration-300">
            {/* ====== DESKTOP SIDEBAR ====== */}
            {!isMobile && (
                <Sider
                    trigger={null}
                    collapsible
                    collapsed={collapsed}
                    width={siderWidth}
                    collapsedWidth={collapsedWidth}
                    className="fixed! left-0 top-0 bottom-0 border-r border-[#ffffff10] shadow-xl"
                    style={{ background: '#090d16', zIndex: 100 }}
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
                    marginLeft: isMobile ? 0 : (collapsed ? collapsedWidth : siderWidth) 
                }}
            >
                {/* ====== HEADER NAVBAR ====== */}
                <Header
                    className="h-16 lg:h-20 px-4 sm:px-6 lg:px-8 bg-card/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-border/80 shadow-xs flex items-center justify-between sticky top-0 w-full transition-all duration-300"
                    style={{ zIndex: 40 }}
                >
                    {/* Left Header Controls */}
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="w-10 h-10 rounded-xl bg-muted/60 hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 flex items-center justify-center transition-all border border-border/60 hover:border-emerald-500/30 shrink-0"
                            title={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
                        >
                            {collapsed ? <MenuUnfoldOutlined className="text-base" /> : <MenuFoldOutlined className="text-base" />}
                        </button>

                        {/* Mobile Title Replacement */}
                        {isMobile && (
                            <div className="flex-1 lg:hidden text-center truncate pr-10">
                                <span className="font-extrabold text-base bg-linear-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                                    MIRA Football Admin
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right Header Profile & Tools */}
                    <div className="flex items-center gap-3 shrink-0">
                        {/* Theme Toggle Button */}
                        <button 
                            onClick={toggleDarkMode}
                            className="w-10 h-10 rounded-xl bg-muted/60 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 flex items-center justify-center transition-all border border-border/60 shadow-xs"
                            title={isDarkMode ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
                        >
                            {isDarkMode ? <SunOutlined className="text-base" /> : <MoonOutlined className="text-base" />}
                        </button>

                        {/* Admin Dropdown */}
                        <Dropdown 
                            menu={userMenu} 
                            placement='bottomRight' 
                            trigger={['click']}
                            dropdownRender={(menu) => (
                                <div className="bg-card border border-border/80 rounded-2xl shadow-xl overflow-hidden mt-2 min-w-[290px] p-2">
                                    {menu}
                                </div>
                            )}
                        >
                            <div className="flex items-center gap-2.5 cursor-pointer p-1 lg:p-1.5 lg:pr-3 rounded-xl bg-muted/40 border border-border/60 shadow-xs hover:border-emerald-500/40 hover:bg-muted/80 transition-all group">
                                <Avatar
                                    src={avatarSrc}
                                    icon={!avatarSrc ? <UserOutlined /> : undefined}
                                    size={{ xs: 32, sm: 36 }}
                                    className="bg-linear-to-br from-emerald-400 to-teal-500 object-cover shadow-xs group-hover:scale-105 transition-transform"
                                />
                                <div className="hidden lg:flex flex-col leading-tight text-left">
                                    <span className="text-xs font-bold text-foreground truncate max-w-[120px]">{userName || 'Admin'}</span>
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded w-max mt-0.5">
                                        Quản trị MIRA Football
                                    </span>
                                </div>
                                <ChevronDown size={14} className="text-muted-foreground/60 hidden lg:block group-hover:text-foreground transition-colors" />
                            </div>
                        </Dropdown>
                    </div>
                </Header>

                {/* ====== CONTENT ====== */}
                <Content className="p-3 sm:p-6 lg:p-8 w-full max-w-full overflow-x-hidden">
                    <div className="mx-auto w-full max-w-[1600px] bg-card rounded-2xl shadow-sm border border-border/80 p-4 sm:p-8 min-h-[calc(100vh-140px)] transition-colors duration-300">
                        <Outlet />
                    </div>
                </Content>
            </Layout>

            {/* Custom Styles */}
            <style>{`
                body {
                    background-color: var(--background, #f8fafc) !important;
                }

                .sidebar-menu.ant-menu {
                    background: transparent !important;
                }
                .sidebar-menu a, .sidebar-menu a:hover {
                    text-decoration: none !important;
                }
                .sidebar-menu .ant-menu-item {
                    margin: 6px 12px;
                    border-radius: 10px;
                    height: 42px;
                    line-height: 42px;
                    font-weight: 600;
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.7);
                    transition: all 0.2s ease;
                }
                .sidebar-menu .ant-menu-item:hover {
                    background: rgba(255, 255, 255, 0.08) !important;
                    color: #fff;
                    transform: translateX(3px);
                }
                .sidebar-menu .ant-menu-item-selected {
                    background: linear-gradient(90deg, rgba(16, 185, 129, 0.2) 0%, rgba(20, 184, 166, 0.05) 100%) !important;
                    color: #34d399 !important;
                    font-weight: 700;
                    box-shadow: inset 3px 0 0 #34d399;
                }
                .sidebar-menu .ant-menu-item-selected .anticon {
                    color: #34d399 !important;
                    filter: drop-shadow(0 0 8px rgba(52, 211, 153, 0.4));
                }
                
                .sidebar-menu .ant-menu-submenu-title {
                    margin: 6px 12px;
                    border-radius: 10px;
                    height: 42px;
                    line-height: 42px;
                    font-weight: 600;
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.7) !important;
                    transition: all 0.2s ease;
                }
                .sidebar-menu .ant-menu-submenu-title:hover {
                    background: rgba(255, 255, 255, 0.08) !important;
                    color: #fff !important;
                    transform: translateX(3px);
                }
                .sidebar-menu .ant-menu-submenu-open .ant-menu-submenu-title,
                .sidebar-menu .ant-menu-submenu-active .ant-menu-submenu-title {
                    color: #fff !important;
                }
                
                .sidebar-menu .ant-menu-sub {
                    background: rgba(0, 0, 0, 0.2) !important;
                    border-radius: 10px;
                    margin: 4px 12px;
                    position: relative;
                }
                .sidebar-menu .ant-menu-sub .ant-menu-item {
                    margin: 4px 6px;
                    height: 36px;
                    line-height: 36px;
                    padding-left: 38px !important;
                    font-size: 12px;
                }
                .sidebar-menu .ant-menu-sub .ant-menu-item-selected {
                    background: rgba(52, 211, 153, 0.12) !important;
                    box-shadow: none;
                }

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
            `}</style>
        </Layout>
    );
};

export default AdminLayout;
