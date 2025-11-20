import axios, { AxiosError } from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL?.trim() || 'http://localhost:3000/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        let accessToken = localStorage.getItem('token');

        // Nếu không có thì thử lấy trong localStorage.user
        if (!accessToken) {
            const user = localStorage.getItem('user');
            if (user) {
                const parsed = JSON.parse(user);
                accessToken = parsed?.token || '';
            }
        }

        // Chặn luôn các giá trị rác
        if (accessToken === 'undefined' || accessToken === 'null') {
            accessToken = '';
        }

        if (accessToken && config.headers) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError<any>) => {
        console.error('API Error:', error.response?.data || error.message);

        const message =
            (error.response?.data as any)?.message ||
            error.message ||
            'Lỗi không xác định từ server.';

        return Promise.reject(new Error(message));
    }
);

export default api;
