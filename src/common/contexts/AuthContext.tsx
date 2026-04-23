import React, { createContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { socket } from "@/common/socket";
import { message } from "antd";

interface AuthContextType {
  isAuthenticated: boolean;
  userName: string;
  userRole: string;
  userAvatar: string;
  setIsAuthenticated: (value: boolean) => void;
  setUserName: (value: string) => void;
  setUserRole: (value: string) => void;
  setUserAvatar: (value: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export { AuthContext };

// Đọc user từ localStorage (token nằm trong user)
const storedUser =
  typeof window !== "undefined"
    ? (() => {
        try {
          const data = localStorage.getItem("user");
          return data ? JSON.parse(data) : null;
        } catch (e) {
          return null;
        }
      })()
    : null;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => !!storedUser?.token
  );
  const [userName, setUserName] = useState<string>(
    () => storedUser?.name || "User"
  );
  const [userRole, setUserRole] = useState<string>(
    () => storedUser?.role || ""
  );
  const [userAvatar, setUserAvatar] = useState<string>(
    () => storedUser?.avatar || ""
  );

  useEffect(() => {
    // Đồng bộ khi localStorage thay đổi (nếu user đăng nhập ở tab khác)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "user") {
        const newUser = JSON.parse(localStorage.getItem("user") || "null");
        setIsAuthenticated(!!newUser?.token);
        setUserName(newUser?.name ?? "User");
        setUserRole(newUser?.role ?? "");
        setUserAvatar(newUser?.avatar ?? "");
      }
    };
    window.addEventListener("storage", onStorage);

    // Lắng nghe realtime event bắt buộc logout (Khóa tài khoản / Xóa tài khoản)
    const handleForceLogout = (payload: { userId: string; message?: string }) => {
      const currentUserStr = localStorage.getItem("user");
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        if (currentUser._id === payload.userId) {
          setIsAuthenticated(false);
          setUserName("User");
          setUserRole("");
          setUserAvatar("");
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          
          message.error(payload.message || "Tài khoản của bạn đã bị khóa hoặc có thay đổi!");
          setTimeout(() => {
             window.location.href = "/signin";
          }, 1000);
        }
      }
    };
    socket.on("user:force_logout", handleForceLogout);

    return () => {
        window.removeEventListener("storage", onStorage);
        socket.off("user:force_logout", handleForceLogout);
    };
  }, []);

  const logout = () => {
    setIsAuthenticated(false);
    setUserName("User");
    setUserRole("");
    setUserAvatar("");
    localStorage.removeItem("user"); // chỉ cần xóa user
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userName,
        userRole,
        userAvatar,
        setIsAuthenticated,
        setUserName,
        setUserRole,
        setUserAvatar,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
