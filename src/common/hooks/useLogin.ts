import api from '@/common/utils/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useAuth } from '@/common/contexts';
import type { ApiError } from '@/common/utils/formApiErr';

export type ILoginPayload = {
    email: string;
    password: string;
};

// Không quá gò type, vì BE đang đổi shape
export type ILoginResponseAny = any;

export const useLogin = (
    setStateOnSuccess: () => void,
    handleErrMessage: (errors: ApiError[]) => string
) => {
    const queryClient = useQueryClient();
    const { setIsAuthenticated, setUserName, setUserRole } = useAuth();

    return useMutation({
        mutationFn: async (values: ILoginPayload) => {
            const response = await api.post('/auth/login', values);
            // response.data chính là body BE trả về (createResponse)
            return response.data as ILoginResponseAny;
        },
      
        onError(res: any) {
            if (res?.errors) {
                const errMsg = handleErrMessage(res.errors as ApiError[]);
                message.error(errMsg);
                return;
            }
            message.error(res.message || 'Đăng nhập không thành công!');
        },
    });
};
