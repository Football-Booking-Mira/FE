import axios from "axios";

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

export default instance;
