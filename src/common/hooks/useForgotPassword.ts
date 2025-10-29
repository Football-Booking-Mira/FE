import { useMutation } from "@tanstack/react-query";
import api from "@/common/utils/api";

interface ForgotPasswordPayload {
  email: string;
}

interface ForgotPasswordResponse {
  status: string;
  message: string;
  data: string;
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (payload: ForgotPasswordPayload) => {
      const response = await api.post<ForgotPasswordResponse>(
        "/auth/forgot-password",
        payload
      );
      return response.data;
    },
  });
}
