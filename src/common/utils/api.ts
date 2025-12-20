// import axios, { AxiosError } from 'axios';

// const api = axios.create({
//     baseURL: import.meta.env.VITE_API_URL?.trim() || 'http://localhost:3000/api',
//     withCredentials: true,
//     headers: {
//         'Content-Type': 'application/json',
//     },
// });

// api.interceptors.request.use(
//     (config) => {
//         let accessToken = localStorage.getItem('token');

//         // Nếu không có thì thử lấy trong localStorage.user
//         if (!accessToken) {
//             const user = localStorage.getItem('user');
//             if (user) {
//                 const parsed = JSON.parse(user);
//                 accessToken = parsed?.token || '';
//             }
//         }

//         // Chặn luôn các giá trị rác
//         if (accessToken === 'undefined' || accessToken === 'null') {
//             accessToken = '';
//         }

//         if (accessToken && config.headers) {
//             config.headers.Authorization = `Bearer ${accessToken}`;
//         }

//         return config;
//     },
//     (error) => Promise.reject(error)
// );

// api.interceptors.response.use(
//     (response) => response,
//     (error: AxiosError<any>) => {
//         console.error('API Error:', error.response?.data || error.message);

//         const message =
//             (error.response?.data as any)?.message ||
//             error.message ||
//             'Lỗi không xác định từ server.';

//         return Promise.reject(new Error(message));
//     }
// );

// export default api;

import axios, { AxiosError } from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL?.trim() || "http://localhost:3000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/* ========================
   REQUEST INTERCEPTOR
========================= */
api.interceptors.request.use(
  (config) => {
    let accessToken = localStorage.getItem("token");

    // Nếu không có token thì thử lấy từ user trong localStorage
    if (!accessToken) {
      const user = localStorage.getItem("user");
      if (user) {
        const parsed = JSON.parse(user);
        accessToken = parsed?.token || "";
      }
    }

    // Chặn giá trị token lỗi (undefined/null dạng string)
    if (accessToken === "undefined" || accessToken === "null") {
      accessToken = "";
    }

    // Gắn Authorization header nếu có token
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ========================
   RESPONSE INTERCEPTOR
========================= */
import { toast } from 'react-toastify';

api.interceptors.response.use(
  (response) => response,

  (error: AxiosError<any>) => {
    // Log lỗi raw để debug
    console.error(" API RAW ERROR:", error);

    const status = error.response?.status;
    const data = error.response?.data;

    console.error(" API RESPONSE STATUS:", status);
    console.error(" API RESPONSE DATA:", data);

    // If unauthorized, clear local auth and redirect to login
    if (status === 401) {
      try {
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } catch (e) {
        // toast may not be available in non-browser envs, ignore
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        setTimeout(() => {
          window.location.href = '/login';
        }, 700);
      }
    }

    // GIỮ NGUYÊN lỗi, không tạo Error mới
    // để client có thể đọc error.response đầy đủ
    return Promise.reject(error);
  }
);

export default api;
