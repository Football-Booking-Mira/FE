import React, { createContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  userName: string;
  userRole: string;
  setIsAuthenticated: (value: boolean) => void;
  setUserName: (value: string) => void;
  setUserRole: (value: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState("User");
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
      const user = localStorage.getItem("user");
      if (user) {
        const userData = JSON.parse(user);
        setUserName(userData.name || "User");
        setUserRole(userData.role || "");
      }
    }
  }, []);

  const logout = () => {
    setIsAuthenticated(false);
    setUserName("User");
    setUserRole("");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userName,
        userRole,
        setIsAuthenticated,
        setUserName,
        setUserRole,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
