import { Layout, Menu, Button, Dropdown, Avatar, Space, Drawer } from "antd";
import { MenuOutlined, UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/common/contexts";
import { AuthModals } from "@/components/AuthModals";
import type { MenuProps } from "antd";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, userName, userRole, logout } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Menu chính (dùng path làm key cho khớp selectedKeys)
  const menuItems: MenuProps["items"] = [
    {
      key: "/",
      label: (
        <Link
          to="/"
          style={{ color: "inherit", textDecoration: "none" }}
          className="text-gray-800 hover:text-green-600 font-semibold text-[25px] tracking-wide transition-colors duration-300"
        >
          Trang chủ
        </Link>
      ),
    },
    {
      key: "/my-bookings",
      label: (
        <Link
          to="/my-bookings"
          style={{ color: "inherit", textDecoration: "none" }}
          className="text-gray-800 hover:text-green-600 font-semibold text-[25px] tracking-wide transition-colors duration-300"
        >
          Đặt sân
        </Link>
      ),
    },
    {
      key: "/lich-thi-dau",
      label: (
        <Link
          to="/lich-thi-dau"
          style={{ color: "inherit", textDecoration: "none" }}
          className="text-gray-800 hover:text-green-600 font-semibold text-[25px] tracking-wide transition-colors duration-300"
        >
          Lịch thi đấu
        </Link>
      ),
    },
    {
      key: "/bang-gia",
      label: (
        <Link
          to="/bang-gia"
          style={{ color: "inherit", textDecoration: "none" }}
          className="text-gray-800 hover:text-green-600 font-semibold text-[25px] tracking-wide transition-colors duration-300"
        >
          Bảng giá
        </Link>
      ),
    },
    {
      key: "/contact",
      label: (
        <Link
          to="/contact"
          style={{ color: "inherit", textDecoration: "none" }}
          className="text-gray-800 hover:text-green-600 font-semibold text-[25px] tracking-wide transition-colors duration-300"
        >
          Liên hệ
        </Link>
      ),
    },
  ];

  // Thêm item Admin nếu là admin (key khác, không bị trùng)
  if (userRole === "admin") {
    menuItems.push({
      key: "/admin",
      label: (
        <Link
          to="/admin"
          style={{ color: "inherit", textDecoration: "none" }}
          className="text-gray-800 hover:text-green-600 font-semibold text-[25px] tracking-wide transition-colors duration-300"
        >
          Quản lý
        </Link>
      ),
    });
  }

  // key đang được chọn (nếu không match thì để '/')
  const selectedKey = menuItems.some(
    (item) => item && item.key === location.pathname
  )
    ? location.pathname
    : "/";

  const userMenuItems: MenuProps["items"] = [
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
    { type: "divider" },
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
        padding: "0 60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "90px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontSize: 20,
          fontWeight: "bold",
          color: "#22c55e",
          minWidth: "100px",
        }}
      >
        <Link to="/" style={{ color: "#22c55e", textDecoration: "none" }}>
          MIRA
        </Link>
      </div>

      {/* Desktop Menu - Centered */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <Menu
          mode="horizontal"
          items={menuItems}
          style={{
            border: "none",
            background: "transparent",
            display: "flex",
            gap: "32px",
          }}
          selectedKeys={[selectedKey]}
        />
      </div>

      {/* Spacer bên phải cho cân layout */}
      <div style={{ flex: 1 }} />

      {/* Auth + Avatar + Drawer button */}
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

      {/* Drawer cho mobile */}
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
          selectedKeys={[selectedKey]}
          onClick={() => setIsDrawerOpen(false)}
        />
      </Drawer>
    </Layout.Header>
  );
};

export default Header;
