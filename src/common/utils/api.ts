/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError } from 'axios';

//Tạo instance
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL?.trim() || 'http://localhost:3000/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Log kiểm tra khi chạy
console.log('🌐 API BaseURL:', import.meta.env.VITE_API_URL);

api.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem('token');
        if (accessToken && config.headers) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// (error) => {
//         return Promise.reject(error.response?.data || error.message || "Đã có lỗi xảy ra");

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError<any>) => {
        console.error('API Error:', error.response?.data || error.message);

        if(error.response?.data.errors) {
            return Promise.reject(error.response?.data);
        }
        const message =
            (error.response?.data as any)?.message ||
            error.message ||
            'Lỗi không xác định từ server.';

        return Promise.reject(new Error(message));
    }
);

export default api;
