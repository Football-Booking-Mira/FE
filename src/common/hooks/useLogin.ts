import api from '@/common/utils/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useAuth } from '@/common/contexts';
import type { ApiError } from '@/common/utils/formApiErr';

export type ILoginPayload = {
    email: string;
    password: string;
};

export type ILoginResponseAny = any;

export const useLogin = (
    setStateOnSuccess: () => void,
    handleErrMessage: (errors: ApiError[]) => string
) => {
    const queryClient = useQueryClient();
    const { setIsAuthenticated, setUserName, setUserRole, setUserAvatar } = useAuth();

    return useMutation({
        mutationFn: async (values: ILoginPayload) => {
            const response = await api.post('/auth/login', values);
            return response.data as ILoginResponseAny;
        },
        onSuccess(res) {
            const envelope: any = res || {};
            const inner: any = envelope.data || {};

            const user =
                inner.user ||
                envelope.user ||
                null;

            if (!user) {
                message.error('Đăng nhập thất bại! Không nhận được dữ liệu người dùng.');
                return;
            }

            // Save display user info without sensitive tokens in localStorage
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.removeItem('token'); // Remove legacy localStorage token

            // Update context
            setIsAuthenticated(true);
            setUserName(user.name);
            setUserRole(user.role);
            setUserAvatar(user.avatar || '');

            message.success('Đăng nhập thành công!');

            queryClient.resetQueries();
            setStateOnSuccess();
        },
        onError(error: any) {
            const errData = error.response?.data || error;
            if (errData?.errors) {
                const errMsg = handleErrMessage(errData.errors as ApiError[]);
                message.error(errMsg);
                return;
            }
            const errorMsg = errData?.message || error.message || 'Đăng nhập không thành công!';
            message.error(errorMsg);
        },
    });
};
