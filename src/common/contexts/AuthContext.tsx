import React, { createContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { socket } from "@/common/socket";
import { message } from "antd";
import api from "@/common/utils/api";
import { migrateLegacyRememberMe } from "@/common/utils/rememberMe";

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
    () => !!storedUser?._id || !!storedUser?.name
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
    // Run legacy rememberMe migration on app mount
    migrateLegacyRememberMe();

    // Verify authentication status with server on load using HttpOnly cookies
    api.get("/auth/me")
      .then((res) => {
        const user = res.data?.data;
        if (user) {
          setIsAuthenticated(true);
          setUserName(user.name);
          setUserRole(user.role);
          setUserAvatar(user.avatar || "");
          const safeUserUI = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            status: user.status,
            avatar: user.avatar || "",
          };
          localStorage.setItem("user", JSON.stringify(safeUserUI));
        }
      })
      .catch(() => {
        // If 401/403 or unauthenticated, clear local UI state
        setIsAuthenticated(false);
        setUserName("User");
        setUserRole("");
        setUserAvatar("");
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      });

    // Synchronize state across browser tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === "user") {
        const newUser = JSON.parse(localStorage.getItem("user") || "null");
        setIsAuthenticated(!!newUser?._id);
        setUserName(newUser?.name ?? "User");
        setUserRole(newUser?.role ?? "");
        setUserAvatar(newUser?.avatar ?? "");
      }
    };
    window.addEventListener("storage", onStorage);

    // Handle force logout events from Socket.IO
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
    api.post("/auth/logout").catch(() => {});
    setIsAuthenticated(false);
    setUserName("User");
    setUserRole("");
    setUserAvatar("");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
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
