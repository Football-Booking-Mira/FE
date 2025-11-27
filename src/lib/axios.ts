import axios from "axios";

const instance = axios.create({
  baseURL: "http://localhost:3000",
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
