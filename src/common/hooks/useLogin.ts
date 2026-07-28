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

            // Extract token from response (needed for Bearer header on cross-origin)
            const accessToken =
                inner.accessToken ||
                envelope.token ||
                inner.token ||
                '';

            if (!user) {
                message.error('Đăng nhập thất bại! Không nhận được dữ liệu người dùng.');
                return;
            }

            // Store token for Authorization header (cross-origin cookie may be blocked)
            if (accessToken) {
                localStorage.setItem('token', accessToken);
            }

            // Store user info (without embedding the raw token in the user object)
            const userWithToken = { ...user, token: accessToken };
            localStorage.setItem('user', JSON.stringify(userWithToken));

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
