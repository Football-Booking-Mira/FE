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
    const { setIsAuthenticated, setUserName, setUserRole, setUserAvatar } = useAuth();

    return useMutation({
        mutationFn: async (values: ILoginPayload) => {
            const response = await api.post('/auth/signin', values);
            // response.data chính là body BE trả về (createResponse)
            return response.data as ILoginResponseAny;
        },
        onSuccess(res) {
            console.log('🔍 Login raw response:', res);

            // res = { success, status, message, data: {...}, token? }
            const envelope: any = res || {};
            const inner: any = envelope.data || {};

            // Lấy user từ data
            const user =
                inner.user ||
                envelope.user || // phòng khi BE trả user ở ngoài
                null;

            // Lấy token thử theo nhiều khả năng
            const accessToken =
                inner.accessToken || // TH: data: { user, accessToken }
                envelope.token || // TH: token nằm ngoài: { data: { user }, token }
                inner.token || // phòng khi token nằm trong data.token
                '';

            console.log('🔑 Login accessToken:', accessToken);

            if (!user || !accessToken) {
                message.error('Không nhận được token từ server!');
                return;
            }

            // Lưu token riêng
            localStorage.setItem('token', accessToken);

            // Gộp token vào user để FE dùng cho tiện
            const userWithToken = {
                ...user,
                token: accessToken,
            };
            localStorage.setItem('user', JSON.stringify(userWithToken));

            // Cập nhật context
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
