import api from '@/common/utils/api';
import { useMutation } from '@tanstack/react-query';
import { message } from 'antd';
import type { ApiError } from '@/common/utils/formApiErr';

export type IRegisterPayload = {
    name: string;
    email: string;
    password: string;
    phone: string;
    avatar?: string;
};

export type IRegisterResponseAny = any;

export const useRegister = (handleErrMessage: (errors: ApiError[]) => string) => {
    return useMutation({
        mutationFn: async (values: IRegisterPayload) => {
            const response = await api.post('/auth/register', values);
            return response.data as IRegisterResponseAny;
        },
        onSuccess(res) {
            const envelope: any = res || {};
            message.success(
                envelope.message ||
                    'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.'
            );
        },
        onError(error: any) {
            const errData = error.response?.data || error;
            if (errData?.errors) {
                const errMsg = handleErrMessage(errData.errors as ApiError[]);
                message.error(errMsg);
                return;
            }
            const errorMsg = errData?.message || error.message || 'Đăng ký không thành công!';
            message.error(errorMsg);
        },
    });
};
