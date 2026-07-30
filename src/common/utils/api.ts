import axios, { AxiosError } from "axios";
import { toast } from 'react-toastify';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL?.trim() || "http://localhost:3000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

/* ========================
   REQUEST INTERCEPTOR (CSRF & Cookies)
========================= */
api.interceptors.request.use(
  (config) => {
    // Attach CSRF Token for state-changing requests (POST, PUT, PATCH, DELETE)
    const csrfToken = getCookie('csrf_token');
    const method = (config.method || '').toUpperCase();
    
    if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ========================
   RESPONSE INTERCEPTOR
========================= */
const translateError = (error: AxiosError<any>): string => {
  const data = error.response?.data as any;
  
  if (data && typeof data === 'object' && data.message) {
    const msg = String(data.message);
    
    if (msg.toLowerCase().includes("invalid signature")) {
      return "Thông tin cấu hình tải ảnh (Cloudinary) của máy chủ không hợp lệ hoặc bị sai lệch. Vui lòng kiểm tra lại cấu hình.";
    }
    if (msg.toLowerCase().includes("must supply")) {
      return "Máy chủ chưa cấu hình đầy đủ thông tin xác thực tải ảnh (Cloudinary).";
    }
    if (msg.toLowerCase().includes("file too large") || msg.toLowerCase().includes("limit file size")) {
      return "Kích thước ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 5MB.";
    }
    if (msg.toLowerCase().includes("format") || msg.toLowerCase().includes("extension")) {
      return "Định dạng tệp không được hỗ trợ! Vui lòng chọn ảnh JPG, PNG, WEBP.";
    }
    if (msg.includes("Request failed") || msg.includes("status code")) {
      const status = msg.match(/\d+/)?.[0] || error.response?.status || "500";
      return `Máy chủ gặp sự cố (Mã lỗi: ${status}). Vui lòng thử lại sau!`;
    }
    if (msg.toLowerCase().includes("internal server error")) {
      return "Lỗi máy chủ nội bộ. Vui lòng liên hệ quản trị viên hoặc thử lại sau.";
    }
    return msg;
  }
  
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
    console.error(" API RAW ERROR:", error);

    const status = error.response?.status;
    const data = error.response?.data;

    const friendlyMessage = translateError(error);
    error.message = friendlyMessage;
    if (error.response?.data && typeof error.response.data === 'object') {
      (error.response.data as any).message = friendlyMessage;
    }

    if (status === 401) {
      try {
        const msg = data?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        toast.error(msg);
      } catch (e) {
        // toast fallback
      }
      localStorage.removeItem('user');
      localStorage.removeItem('token');

      if (typeof window !== 'undefined' && window.location.pathname !== '/signin') {
        setTimeout(() => {
          window.location.href = '/signin';
        }, 700);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
