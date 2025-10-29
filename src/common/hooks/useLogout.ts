import { useNavigate } from "react-router-dom";
import { message } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/common/contexts";

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout: clearAuthState } = useAuth();

  const logout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      clearAuthState();

      queryClient.clear();

      message.success("Đăng xuất thành công!");

      navigate("/", { replace: true });
    } catch (error) {
      message.error("Lỗi khi đăng xuất!");
      console.error("Logout error:", error);
    }
  };

  return { logout };
}
