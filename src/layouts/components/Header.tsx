import { Layout, Menu, Button, Dropdown, Avatar, Space, Drawer } from "antd";
import { MenuOutlined, UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/common/contexts";
import { AuthModals } from "@/components/AuthModals";

const Header = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userName, userRole, logout } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const menuItems = [
    {
      key: "1",
      label: (
        <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>
          Trang chủ
        </Link>
      ),
    },
  ];

  if (userRole === "admin") {
    menuItems.push({
      key: "2",
      label: (
        <Link to="/admin" style={{ color: "inherit", textDecoration: "none" }}>
          Quản lý
        </Link>
      ),
    });
  }

  const userMenuItems = [
    {
      key: "profile",
      label: (
        <span>
          <UserOutlined style={{ marginRight: 8 }} />
          Hồ sơ cá nhân
        </span>
      ),
      onClick: () => navigate("/profile"),
    },
    {
      key: "divider",
      type: "divider" as const,
    },
    {
      key: "logout",
      label: (
        <span style={{ color: "#ff4d4f" }}>
          <LogoutOutlined style={{ marginRight: 8 }} />
          Đăng xuất
        </span>
      ),
      onClick: logout,
    },
  ];

  return (
    <Layout.Header
      style={{
        background: "#fff",
        padding: "0 24px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        height: "64px",
      }}
    >
      <div
        style={{
          fontSize: 20,
          fontWeight: "bold",
          color: "#22c55e",
          minWidth: "100px",
        }}
      >
        <Link to="/" style={{ color: "#22c55e", textDecoration: "none" }}>
          FPOLY
        </Link>
      </div>

      {/* Desktop Menu - Centered */}
      <div style={{ flex: 1, display: "none" }} className="desktop-menu">
        <Menu
          mode="horizontal"
          items={menuItems}
          style={{
            border: "none",
            background: "transparent",
            justifyContent: "center",
          }}
          selectedKeys={[window.location.pathname === "/" ? "1" : "2"]}
        />
      </div>

      <div style={{ flex: 1 }}></div>

      <Space size="large" style={{ display: "flex", alignItems: "center" }}>
        {isAuthenticated ? (
          <Dropdown menu={{ items: userMenuItems }} trigger={["click"]}>
            <Space style={{ cursor: "pointer" }}>
              <Avatar
                size="large"
                icon={<UserOutlined />}
                style={{ background: "#22c55e" }}
              />
              <span style={{ display: "none" }} className="desktop-only">
                {userName}
              </span>
            </Space>
          </Dropdown>
        ) : (
          <AuthModals />
        )}

        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={() => setIsDrawerOpen(true)}
          className="mobile-menu-btn"
          style={{ display: "none" }}
        />
      </Space>

      <Drawer
        title="Menu"
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        placement="right"
      >
        <Menu
          mode="vertical"
          items={menuItems}
          style={{ border: "none" }}
          onClick={() => setIsDrawerOpen(false)}
        />
      </Drawer>
    </Layout.Header>
  );
};

export default Header;
