// services/review.service.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const getNeedReview = () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?._id || user?.id;
    return axios.get(`${API_URL}/review/need-review/${userId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};

export const getReviewDetail = (reviewId: string) => {
    const token = localStorage.getItem('token');
    return axios.get(`${API_URL}/review/${reviewId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};
