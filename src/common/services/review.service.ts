// services/review.service.ts
import axios from "axios";

const API_URL = "http://localhost:3000/api";
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');
const userId = user?._id;
export const getNeedReview = () => {
    return axios.get(`${API_URL}/review/need-review/${userId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};

export const getReviewDetail = (reviewId: string) => {
    return axios.get(`${API_URL}/review/${reviewId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};
