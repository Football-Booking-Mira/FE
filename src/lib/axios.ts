import axios, { AxiosError } from "axios";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// Request interceptor for CSRF token
instance.interceptors.request.use((config) => {
  const csrfToken = getCookie('csrf_token');
  const method = (config.method || '').toUpperCase();
  
  if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }

  return config;
});

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

instance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    const friendlyMessage = translateError(error);
    error.message = friendlyMessage;
    if (error.response?.data && typeof error.response.data === 'object') {
      (error.response.data as any).message = friendlyMessage;
    }
    return Promise.reject(error);
  }
);

export default instance;
