import { useState, useEffect } from 'react';
import { Avatar, Dropdown, Layout, Drawer, Button } from "antd";
import { 
    MenuOutlined, UserOutlined, LogoutOutlined, 
    MoonOutlined, SunOutlined, CloseOutlined,
    HomeOutlined, CalendarOutlined, StarOutlined,
    AppstoreOutlined, PhoneOutlined 
} from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/common/contexts';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, userName, userRole, userAvatar, logout } = useAuth();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    // Đóng menu hồ sơ (profile) khi cuộn trang
    useEffect(() => {
        const handleScroll = () => {
            if (isProfileMenuOpen) {
                setIsProfileMenuOpen(false);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isProfileMenuOpen]);

    // Trạng thái chế độ Sáng/Tối
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

    const getLinkClass = () => `
        group relative flex items-center h-full px-1 transition-all duration-300
    `;

    const getLinkInnerClass = (path: string) => `
        px-4 py-2.5 text-[15px] font-semibold rounded-xl transition-all duration-300
        ${location.pathname === path 
            ? 'bg-emerald-50 dark:bg-green-900/40 text-emerald-600 dark:text-green-400 shadow-[0_2px_10px_-4px_rgba(16,185,129,0.3)]' 
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/80 hover:text-emerald-600 dark:hover:text-green-400'
        }
    `;

    const getMobileLinkClass = (path: string) => `
        block w-full text-[15px] font-semibold py-4 px-5 rounded-2xl transition-all duration-300 flex items-center gap-4
        ${location.pathname === path 
            ? 'bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20 text-green-600 dark:text-green-400 shadow-sm border border-green-100 dark:border-green-800/50' 
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent'
        }
    `;

    const menuItems = [
        { path: '/', label: 'Trang chủ', icon: <HomeOutlined /> },
        { path: '/my-bookings', label: 'Đặt sân', icon: <CalendarOutlined /> },
        { path: '/equipments', label: 'Dịch vụ', icon: <AppstoreOutlined /> },
        { path: '/contact', label: 'Liên hệ', icon: <PhoneOutlined /> },
    ];

    const userMenuItems = [
        {
            key: 'profile',
            label: (
                <div className="flex items-center gap-3.5 px-1.5 py-2 rounded-xl transition-all duration-300 group">
                    <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-all duration-300">
                        <UserOutlined className="text-[17px]" />
                    </div>
                    <span className="font-semibold text-gray-700 dark:text-gray-200 text-[15px]">Hồ sơ cá nhân</span>
                </div>
            ),
            onClick: () => {
                setIsProfileMenuOpen(false);
                navigate('/profile');
            },
        },
        ...(userRole === 'admin' ? [{
            key: 'admin',
            label: (
                <div className="flex items-center gap-3.5 px-1.5 py-2 rounded-xl transition-all duration-300 group">
                    <div className="w-9 h-9 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0 group-hover:scale-110 group-hover:bg-green-100 dark:group-hover:bg-green-900/40 transition-all duration-300">
                        <MenuOutlined className="text-[17px]" />
                    </div>
                    <span className="font-semibold text-green-700 dark:text-green-400 text-[15px]">Quản lý hệ thống</span>
                </div>
            ),
            onClick: () => {
                setIsProfileMenuOpen(false);
                navigate('/admin');
            },
        }] : []),
        {
            key: 'divider',
            type: 'divider' as const,
        },
        {
            key: 'logout',
            label: (
                <div className="flex items-center gap-3.5 px-1.5 py-2 rounded-xl transition-all duration-300 group">
                    <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0 group-hover:scale-110 group-hover:bg-red-100 dark:group-hover:bg-red-900/40 transition-all duration-300">
                        <LogoutOutlined className="text-[17px]" />
                    </div>
                    <span className="font-semibold text-red-600 dark:text-red-400 text-[15px]">Đăng xuất</span>
                </div>
            ),
            onClick: () => {
                setIsProfileMenuOpen(false);
                logout();
            },
        },
    ];

    return (
        <Layout.Header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl px-4 md:px-8 lg:px-12 flex items-center h-20 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] border-b border-gray-100/80 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-300 w-full" style={{ lineHeight: 'normal' }}>
            {/* 1. Logo Section (Left) */}
            <div className="flex-1 flex items-center h-full pl-2 sm:pl-4 md:pl-10 lg:pl-16">
                <Link to='/' className="flex items-center gap-3 group">
                    <img
                        src='/lg-mira.png'
                        alt='Logo Sân'
                        className="h-12 md:h-14 object-contain group-hover:scale-105 transition-transform"
                    />
                    <div className="flex-col justify-center hidden sm:flex">
                        <span className="text-lg font-extrabold text-emerald-600 font-sans leading-none tracking-tight mb-1">
                            Sân bóng MIRA
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-sans leading-none">
                            Bóng đá hiện đại.
                        </span>
                    </div>
                </Link>
            </div>

            {/* 2. Desktop Menu - Centered */}
            <nav className="hidden lg:flex items-center justify-center gap-1 shrink-0 h-full">
                {menuItems.map(item => (
                    <Link key={item.path} to={item.path} className={getLinkClass()}>
                        <div className={getLinkInnerClass(item.path)}>
                            {item.label}
                        </div>
                        {location.pathname === item.path && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-linear-to-r from-emerald-500 to-teal-400 rounded-t-full" />
                        )}
                    </Link>
                ))}
            </nav>

            {/* 3. Action Buttons Section (Right) */}
            <div className="flex-1 flex items-center justify-end gap-2 md:gap-4 h-full pr-2 sm:pr-4 md:pr-10 lg:pr-16">
                
                {/* Theme Toggle Desktop */}
                <button 
                    onClick={toggleDarkMode}
                    className="w-10 h-10 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors hidden sm:flex items-center justify-center mr-1"
                    title={isDarkMode ? "Chuyển sang nền sáng" : "Chuyển sang nền tối"}
                >
                    {isDarkMode ? <SunOutlined className="text-xl" /> : <MoonOutlined className="text-xl" />}
                </button>

                {isAuthenticated ? (
                    <Dropdown 
                        menu={{ 
                            items: userMenuItems,
                            className: "!p-3 !bg-transparent !border-0 !shadow-none min-w-[280px]"
                        }} 
                        trigger={['click']} 
                        placement="bottomRight"
                        open={isProfileMenuOpen}
                        onOpenChange={setIsProfileMenuOpen}
                        dropdownRender={(menu) => (
                            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)] border border-gray-100/50 dark:border-gray-700/50 overflow-hidden mt-2 p-1 relative">
                                {/* Ambient Glow */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/10 dark:bg-green-400/5 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10"></div>
                                {/* Profile Header Card in Dropdown */}
                                <div className="px-6 py-5 m-1 rounded-2xl bg-linear-to-br from-green-50/80 to-emerald-100/50 dark:from-green-900/30 dark:to-emerald-900/10 flex items-center gap-4 relative overflow-hidden border border-green-100/30 dark:border-green-800/20">
                                    <Avatar
                                        size={52}
                                        src={userAvatar}
                                        icon={!userAvatar && <UserOutlined />}
                                        className="bg-green-500 text-white shadow-lg shrink-0 border-[3px] border-white/80 dark:border-gray-700/50 object-cover"
                                    />
                                    <div className="min-w-0 flex-1 relative z-10">
                                        <p className="text-[17px] font-bold text-gray-900 dark:text-gray-100 truncate leading-tight mb-1">{userName}</p>
                                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm text-[11px] font-bold text-green-700 dark:text-green-400 uppercase tracking-widest shadow-sm">
                                            {userRole === 'admin' ? 'Quản trị' : 'Thành viên'}
                                        </div>
                                    </div>
                                </div>
                                {/* Original AnTD Menu Container */}
                                <div className="mt-1">
                                    {menu}
                                </div>
                            </div>
                        )}
                    >
                        <div 
                            className="cursor-pointer select-none flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700" 
                            draggable={false}
                        >
                            <Avatar
                                size='default'
                                src={userAvatar}
                                icon={!userAvatar && <UserOutlined />}
                                className="bg-green-500 text-white shadow-sm object-cover transition-transform hover:scale-105"
                            />
                            <span className="hidden md:inline font-sans text-sm font-semibold text-gray-700 dark:text-gray-200">
                                {userName}
                            </span>
                        </div>
                    </Dropdown>
                ) : (
                    <div className="hidden sm:flex items-center gap-2">
                        <Link to="/signin">
                            <Button
                                style={{
                                    background: "#22c55e",
                                    borderColor: "#22c55e",
                                    color: "white",
                                }}
                                type="primary"
                            >
                                Đăng nhập
                            </Button>
                        </Link>
                        <Link to="/signup">
                            <Button
                                className="hover:border-[#22c55e] dark:hover:border-[#22c55e] transition-colors"
                                style={{
                                    color: "#22c55e",
                                    borderColor: "#22c55e",
                                    background: "transparent",
                                }}
                                type="default"
                            >
                                Đăng ký
                            </Button>
                        </Link>
                    </div>
                )}

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="lg:hidden w-10 h-10 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
                >
                   <MenuOutlined className="text-xl" />
                </button>
            </div>

            {/* Premium Mobile Drawer */}
            <Drawer
                title={null}
                closeIcon={null}
                onClose={() => setIsDrawerOpen(false)}
                open={isDrawerOpen}
                placement='right'
                width="85%"
                styles={{
                     body: { padding: 0, backgroundColor: isDarkMode ? '#111827' : '#ffffff', transition: 'background-color 300ms' },
                     header: { padding: 0, border: 'none' }
                }}
            >
                <div className="flex flex-col min-h-full bg-white dark:bg-gray-900 transition-colors duration-300 relative">
                    {/* Floating Header Actions in Drawer */}
                    <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
                        <button 
                            onClick={toggleDarkMode}
                            className="w-10 h-10 rounded-full bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-md text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center shadow-sm"
                        >
                            {isDarkMode ? <SunOutlined className="text-xl" /> : <MoonOutlined className="text-xl" />}
                        </button>
                        <button 
                            onClick={() => setIsDrawerOpen(false)}
                            className="w-10 h-10 rounded-full bg-red-50/80 dark:bg-red-500/10 backdrop-blur-md text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors flex items-center justify-center shadow-sm border border-red-100 dark:border-red-900/30"
                        >
                            <CloseOutlined className="text-lg" />
                        </button>
                    </div>

                    <div className="px-6 pt-20 pb-8 flex-1 flex flex-col">
                        {!isAuthenticated && (
                            <div className="mb-10 flex flex-col justify-center gap-4 sm:hidden w-full mt-4">
                            <Link to="/signin" className="w-full" onClick={() => setIsDrawerOpen(false)}>
                                <Button
                                    block
                                    size="large"
                                    style={{
                                        background: "#22c55e",
                                        borderColor: "#22c55e",
                                        color: "white"
                                    }}
                                    type="primary"
                                >
                                    Đăng nhập
                                </Button>
                            </Link>
                            <Link to="/signup" className="w-full" onClick={() => setIsDrawerOpen(false)}>
                                <Button
                                    block
                                    size="large"
                                    className="hover:border-[#22c55e] transition-colors"
                                    style={{
                                        color: "#22c55e",
                                        borderColor: "#22c55e",
                                        background: "transparent"
                                    }}
                                    type="default"
                                >
                                    Đăng ký
                                </Button>
                            </Link>
                        </div>
                    )}
                    
                    <nav className="flex flex-col gap-3 mb-8">
                        {menuItems.map(item => (
                            <Link 
                                key={item.path} 
                                to={item.path} 
                                className={getMobileLinkClass(item.path)}
                                onClick={() => setIsDrawerOpen(false)}
                            >
                                <span className="text-xl opacity-80 shrink-0 flex items-center justify-center w-6 h-6">{item.icon}</span>
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </nav>

                    {isAuthenticated && (
                        <div className="mt-2 pt-8 border-t border-gray-100 dark:border-gray-800/60 pb-10">
                            {/* Mobile User Header */}
                            <div className="flex items-center gap-4 mb-6 p-5 bg-linear-to-br from-green-50/80 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/10 rounded-3xl border border-green-100/50 dark:border-green-800/30 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                                <Avatar size={56} src={userAvatar} icon={!userAvatar && <UserOutlined />} className="bg-green-500 text-white shadow-md object-cover border-[3px] border-white dark:border-gray-700/50 relative z-10" />
                                <div className="flex flex-col min-w-0 flex-1 relative z-10">
                                    <span className="font-bold text-gray-900 dark:text-gray-100 truncate text-[19px] tracking-tight mb-1">{userName}</span>
                                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm text-[10px] font-bold text-green-700 dark:text-green-400 w-fit uppercase tracking-widest shadow-xs">
                                        {userRole === 'admin' ? 'Quản trị' : 'Thành viên'}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Mobile Actions */}
                            <div className="flex flex-col gap-3">
                                <Link to="/profile" onClick={() => setIsDrawerOpen(false)} className="flex items-center gap-4 px-5 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-2xl font-semibold transition-all active:scale-[0.98] border border-gray-100 dark:border-gray-700 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:border-blue-200 dark:hover:border-blue-800 hover:text-blue-600 dark:hover:text-blue-400 group">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                        <UserOutlined className="text-lg" />
                                    </div>
                                    <span className="text-[16px]">Hồ sơ cá nhân</span>
                                </Link>
                                
                                {userRole === 'admin' && (
                                    <Link to="/admin" onClick={() => setIsDrawerOpen(false)} className="flex items-center gap-4 px-5 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-2xl font-semibold transition-all active:scale-[0.98] border border-gray-100 dark:border-gray-700 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:border-green-200 dark:hover:border-green-800 hover:text-green-600 dark:hover:text-green-400 group">
                                        <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                                            <MenuOutlined className="text-lg" />
                                        </div>
                                        <span className="text-[16px]">Quản lý hệ thống</span>
                                    </Link>
                                )}

                                <button onClick={() => { setIsDrawerOpen(false); logout(); }} className="flex items-center gap-4 px-5 py-4 mt-4 bg-red-50/50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl font-semibold transition-all active:scale-[0.98] w-full text-left border border-red-100/50 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 group">
                                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                                        <LogoutOutlined className="text-lg" />
                                    </div>
                                    <span className="text-[16px]">Đăng xuất</span>
                                </button>
                            </div>
                        </div>
                    )}
                    </div>
                </div>
            </Drawer>
        </Layout.Header>
    );
};

export default Header;
