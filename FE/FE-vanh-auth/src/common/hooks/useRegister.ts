import { useMutation } from "@tanstack/react-query";
import api from "@/common/utils/api";
import { message } from "antd";
import type { ApiError } from "@/common/utils/formApiErr";

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

export function useRegister(handleErrMessage: (errors: ApiError[]) => string) {
  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const response = await api.post<RegisterPayload, {data: RegisterResponse}>(
        "/auth/register",
        payload
      );
      return response;
    },
    onSuccess(data) {
      message.success(data.data.message);
    },
    onError(res) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((res as any).errors) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errMsg = handleErrMessage((res as any).errors as ApiError[]);
        message.error(errMsg);
        return;
      }
      message.error(res.message || "Đăng ký không thành công!");
    }
  });
}
