import { useMutation } from "@tanstack/react-query";
import api from "@/common/utils/api";
import { message } from "antd";

export interface VerifyEmailPayload {
  verificationToken: string;
}

export interface VerifyEmailResponse {
  status: string;
  message: string;
  data: {
    user: {
    _id: string,
    email: string,
    name: string,
    status:string
    role: string;
},
accessToken: string,
  }
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: async (payload: VerifyEmailPayload) => {
      const response = await api.post<
        VerifyEmailPayload,
        { data: VerifyEmailResponse }
      >("/auth/verify-email", payload);
      return response.data;
    },
    onSuccess(data) {
      message.success(data.message);
    },
    onError(error: Error) {
      const errorMessage = error instanceof Error ? error.message : "Xác thực email không thành công!";
      message.error(errorMessage);
    },
  });
}
