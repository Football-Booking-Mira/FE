import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

api.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem("token");

        console.log(accessToken)
        if (config && config.headers && accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);
api.interceptors.response.use(
    (response) => response,
    (error) => {
        return Promise.reject(error.response?.data || error.message || "Đã có lỗi xảy ra");
    }
);


export default api;
