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

            // Remove legacy raw token storage
            localStorage.removeItem('token');

            // Store non-sensitive user UI preferences in localStorage (without embedding token)
            const safeUserUI = {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                status: user.status,
                avatar: user.avatar || '',
            };
            localStorage.setItem('user', JSON.stringify(safeUserUI));

            // Update Auth Context
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
