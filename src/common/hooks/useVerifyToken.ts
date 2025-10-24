import { useMutation } from "@tanstack/react-query";
import api from "@/common/utils/api";

interface VerifyTokenPayload {
  resetToken: string;
}

interface VerifyTokenResponse {
  status: string;
  message: string;
  data: string;
}

export function useVerifyToken() {
  return useMutation({
    mutationFn: async (payload: VerifyTokenPayload) => {
      const response = await api.post<VerifyTokenResponse>(
        "/auth/verify",
        payload
      );
      return response.data;
    },
  });
}
