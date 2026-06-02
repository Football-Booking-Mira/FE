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

const translateError = (error: AxiosError<any>): string => {
  const data = error.response?.data as any;
  
  // 1. Dịch tin nhắn lỗi từ server nếu có
  if (data && typeof data === 'object' && data.message) {
    const msg = data.message;
    if (msg.includes("Request failed") || msg.includes("status code")) {
      const status = msg.match(/\d+/)?.[0] || error.response?.status || "500";
      return `Máy chủ gặp sự cố (Mã lỗi: ${status}). Vui lòng thử lại sau!`;
    }
    // Dịch các lỗi server phổ biến bằng tiếng Anh
    if (msg.toLowerCase().includes("internal server error")) {
      return "Lỗi máy chủ nội bộ. Vui lòng liên hệ quản trị viên hoặc thử lại sau.";
    }
    return msg;
  }
  
  // 2. Dịch lỗi kết nối/mạng từ Axios
  const errMessage = error.message || "";
  if (errMessage.includes("Network Error")) {
    return "Lỗi kết nối mạng! Vui lòng kiểm tra lại đường truyền internet.";
  }
  if (errMessage.toLowerCase().includes("timeout")) {
    return "Yêu cầu phản hồi quá hạn (timeout). Vui lòng thử lại.";
  }
  if (errMessage.includes("status code")) {
    const status = errMessage.match(/\d+/)?.[0] || error.response?.status || "500";
    return `Máy chủ gặp sự cố (Mã lỗi: ${status}). Vui lòng thử lại sau!`;
  }
  
  return errMessage || "Đã xảy ra lỗi không xác định.";
};

api.interceptors.response.use(
  (response) => response,

  (error: AxiosError<any>) => {
    // Log lỗi raw để debug
    console.error(" API RAW ERROR:", error);

    const status = error.response?.status;
    const data = error.response?.data;

    console.error(" API RESPONSE STATUS:", status);
    console.error(" API RESPONSE DATA:", data);

    // Dịch thông báo lỗi sang tiếng Việt
    const friendlyMessage = translateError(error);
    error.message = friendlyMessage;
    if (error.response?.data && typeof error.response.data === 'object') {
      (error.response.data as any).message = friendlyMessage;
    }

    // Nếu không có quyền, xóa xác thực cục bộ và chuyển hướng đến trang đăng nhập
    if (status === 401) {
      try {
        const msg = data?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        toast.error(msg);
      } catch (e) {
        // toast có thể không khả dụng trong môi trường ngoài trình duyệt
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (typeof window !== 'undefined' && window.location.pathname !== '/signin') {
        setTimeout(() => {
          window.location.href = '/signin';
        }, 700);
      }
    }

    // Trả về lỗi đã được dịch
    return Promise.reject(error);
  }
);

export default api;
