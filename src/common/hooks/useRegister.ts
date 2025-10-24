import { useMutation } from "@tanstack/react-query";
import api from "@/common/utils/api";
import { message } from "antd";

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone: string;
}

interface RegisterResponse {
  status: string;
  message: string;
  data: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

export function useRegister() {
  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const response = await api.post<RegisterPayload, {data: RegisterResponse}>(
        "/auth/register",
        payload
      );
      return response.data;
    },
    onSuccess(data) {
      message.success(data.message);
    },
    onError(res) {
      message.error(res.message || "Đăng ký không thành công!");
    }
  });
}
