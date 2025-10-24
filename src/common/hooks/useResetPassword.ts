import { useMutation } from "@tanstack/react-query";
import api from "@/common/utils/api";

interface ResetPasswordPayload {
  resetToken: string;
  newPassword: string;
}

interface ResetPasswordResponse {
  status: string;
  message: string;
  data: string;
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (payload: ResetPasswordPayload) => {
      const response = await api.post<ResetPasswordResponse>(
        "/auth/reset-password",
        payload
      );
      return response.data;
    },
  });
}
