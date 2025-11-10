import api from '@/common/utils/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useAuth } from '@/common/contexts';
import type { ApiError } from '@/common/utils/formApiErr';

export type ILoginPayload = {
    email: string;
    password: string;
};

export type ILoginResponse = {
    message: string;
    data: {
        user: {
            _id: string;
            name: string;
            phone: string;
            email: string;
            password: string;
            role: string;
            status: string;
            avatar: string;
        };
        accessToken: string;
    };
};

export const useLogin = (
    setStateOnSuccess: () => void,
    handleErrMessage: (errors: ApiError[]) => string
) => {
    const queryClient = useQueryClient();
    const { setIsAuthenticated, setUserName, setUserRole } = useAuth();

    return useMutation({
        mutationFn: async (values: ILoginPayload) => {
            const response = await api.post<ILoginPayload, { data: ILoginResponse }>(
                '/auth/login',
                values
            );
            return response.data;
        },
        // onSuccess(data) {
        //     const userWithToken = {
        //         ...data.data.user,
        //         token: data.data.accessToken,
        //     };
        //     setIsAuthenticated(true);
        //     setUserName(data.data.user.name);
        //     setUserRole(data.data.user.role);

        //     message.success(data.message);
        //     queryClient.resetQueries();
        //     setStateOnSuccess();
        // },
        onSuccess(data) {
            // Gộp token vào object user để tiện sử dụng
            const userWithToken = {
                ...data.data.user,
                token: data.data.accessToken,
            };

            localStorage.setItem('user', JSON.stringify(userWithToken));

            setIsAuthenticated(true);
            setUserName(data.data.user.name);
            setUserRole(data.data.user.role);

            message.success(data.message);
            queryClient.resetQueries();
            setStateOnSuccess();
        },

        onError(res) {
            if ((res as any).errors) {
                const errMsg = handleErrMessage((res as any).errors as ApiError[]);
                message.error(errMsg);
                return;
            }
            message.error(res.message || 'Đăng nhập không thành công!');
        },
    });
};
