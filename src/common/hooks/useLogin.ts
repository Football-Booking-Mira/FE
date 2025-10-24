import api from '@/common/utils/api';
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd';
import { useAuth } from '@/common/contexts';

export type ILoginPayload = {
    email: string, password: string
}

export type ILoginResponse = {
    message: string
    data: {
        user: {
            _id: string
            name: string
            phone: string
            email: string
            password: string
            role: string
            status: string
            avatar: string
        }
        accessToken: string
    }
}

export const useLogin = (setStateOnSuccess: ()=>void) => {
    const queryClient =  useQueryClient()
    const { setIsAuthenticated, setUserName, setUserRole } = useAuth();

    return useMutation({
    mutationFn: async (values: ILoginPayload) => {
            const response = await api.post<ILoginPayload, {data: ILoginResponse}>('/auth/login', values);
            return response.data;
        },
    onSuccess(data) {
        localStorage.setItem("token", data.data.accessToken)
        localStorage.setItem("user", JSON.stringify(data.data.user));

        setIsAuthenticated(true);
        setUserName(data.data.user.name);
        setUserRole(data.data.user.role);

        message.success(data.message);
        queryClient.resetQueries()
        setStateOnSuccess();
    },
    onError(res) {
        message.error(res.message || "Đăng nhập không thành công!");
        }
    })
}
