import React, { useState } from 'react';
import { Layout, Menu, theme, Avatar, Dropdown } from 'antd';
import {
    DashboardOutlined,
    AppstoreOutlined,
    ShoppingOutlined,
    UserOutlined,
    FileTextOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    BarChartOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const AdminLayout: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const {
        token: { colorBgContainer },
    } = theme.useToken();

    const location = useLocation();
    const selectedKey = location.pathname.split('/admin/')[1] || 'dashboard';

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
                        background: '#004d1a', // nền xanh đậm
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
                    items={[
                        {
                            key: 'dashboard',
                            icon: <DashboardOutlined />,
                            label: <Link to='/admin'>Tổng quan</Link>,
                        },
                        {
                            key: 'courts',
                            icon: <AppstoreOutlined />,
                            label: <Link to='/admin/courts'>Quản lý sân</Link>,
                        },
                        {
                            key: '/bookings',
                            icon: <AppstoreOutlined />,
                            label: <Link to='/admin/bookings'>Đặt sân</Link>,
                        },
                        {
                            key: 'customers',
                            icon: <UserOutlined />,
                            label: <Link to='/admin/customers'>Khách hàng</Link>,
                        },
                        {
                            key: 'equipments',
                            icon: <ShoppingOutlined />,
                            label: <Link to='/admin/equipments'>Thiết bị</Link>,
                        },
                        {
                            key: 'reports',
                            icon: <BarChartOutlined />,
                            label: <Link to='/admin/reports'>Báo cáo</Link>,
                        },
                        {
                            key: 'invoices',
                            icon: <FileTextOutlined />,
                            label: <Link to='/admin/invoices'>Hóa đơn</Link>,
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
                            <span>Administrator</span>
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
