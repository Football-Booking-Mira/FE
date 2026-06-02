import axios, { AxiosError } from "axios";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Thêm token vào header
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // hoặc cookie

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const translateError = (error: AxiosError<any>): string => {
  const data = error.response?.data as any;
  if (data && typeof data === 'object' && data.message) {
    const msg = data.message;
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
