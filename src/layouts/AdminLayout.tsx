import React, { useState } from 'react';
import { Layout, Menu, theme, Avatar, Dropdown } from 'antd';
import {
    DashboardOutlined,
    AppstoreOutlined,
    UserOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    BarChartOutlined,
    CalendarOutlined,
    UnorderedListOutlined,
    PlusCircleOutlined,
    TeamOutlined,
    ToolOutlined,
    FileDoneOutlined,
    GiftOutlined,
    FundViewOutlined,
    MailOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const AdminLayout: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [openKeys, setOpenKeys] = useState<string[]>([]);
    const infoAdmin = localStorage.getItem('user');
    const name = infoAdmin ? JSON.parse(infoAdmin)?.name : undefined;
    //console.log(name);
    const {
        token: { colorBgContainer },
    } = theme.useToken();

    const location = useLocation();
    const pathname = location.pathname;

    // Map path -> key để bôi xanh đúng menu
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

    // Tự mở submenu Đặt sân nếu đang ở /admin/bookings...
    React.useEffect(() => {
        if (pathname.startsWith('/admin/bookings')) {
            setOpenKeys(['bookings']);
            return;
        }
        setOpenKeys([]);
    }, [pathname]);

    const userMenu = {
        items: [
            { key: '1', label: <span>Hồ sơ cá nhân</span> },
            {
                key: '2',
                label: (
                    <span style={{ color: 'red' }}>
                        <LogoutOutlined /> Đăng xuất
                    </span>
                ),
            },
        ],
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* SIDEBAR */}
            <Sider trigger={null} collapsible collapsed={collapsed} theme='dark'>
                <div
                    style={{
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#004d1a',
                    }}
                >
                    <img
                        src='/lg-mira.png'
                        alt='Football Booking Mira'
                        style={{
                            height: collapsed ? 40 : 50,
                            width: 'auto',
                            objectFit: 'contain',
                            transition: 'all 0.3s ease',
                        }}
                    />
                </div>

                <Menu
                    theme='dark'
                    mode='inline'
                    selectedKeys={[selectedKey]}
                    openKeys={openKeys}
                    onOpenChange={(keys) => setOpenKeys(keys as string[])}
                    items={[
                        {
                            key: 'dashboard',
                            icon: <DashboardOutlined />,
                            label: <Link to='/admin'>Tổng quan</Link>,
                        },
                        {
                            key: 'courts',
                            icon: <FundViewOutlined  />,
                            label: <Link to='/admin/courts'>Quản lý sân</Link>,
                        },
                        {
                            key: 'reviews',
                            icon: <AppstoreOutlined />,
                            label: <Link to='/admin/reviews'>Đánh giá sân</Link>,
                        },
                        {
                            key: 'bookings',
                            icon: <CalendarOutlined />,
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
                            icon: <TeamOutlined />,
                            label: <Link to='/admin/customers'>Khách hàng</Link>,
                        },
                        {
                            key: 'equipments',
                            icon: <ToolOutlined />,
                            label: <Link to='/admin/equipments'>Thiết bị</Link>,
                        },
                        {
                            key: 'vouchers',
                            icon: <GiftOutlined />,
                            label: <Link to='/admin/vouchers'>Voucher</Link>,
                        },
                        {
                            key: 'reports',
                            icon: <BarChartOutlined />,
                            label: <Link to='/admin/reports'>Báo cáo</Link>,
                        },
                       
                        {
  key: 'contacts',
  icon: <MailOutlined    />,
  label: <Link to="/admin/contacts">Liên hệ</Link>,
},
                    ]}
                />
            </Sider>

            {/* MAIN */}
            <Layout>
                {/* HEADER */}
                <Header
                    style={{
                        padding: '0 24px',
                        background: colorBgContainer,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span
                            onClick={() => setCollapsed(!collapsed)}
                            style={{ cursor: 'pointer', fontSize: 18 }}
                        >
                            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        </span>
                        <h2 style={{ margin: 0, fontWeight: 500 }}>Trang quản lý</h2>
                    </div>

                    <Dropdown menu={userMenu} placement='bottomRight' arrow>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                cursor: 'pointer',
                            }}
                        >
                            <Avatar icon={<UserOutlined />} />
                            <span>{name}</span>
                        </div>
                    </Dropdown>
                </Header>

                {/* CONTENT */}
                <Content style={{ margin: '24px', padding: 24, background: colorBgContainer }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default AdminLayout;
