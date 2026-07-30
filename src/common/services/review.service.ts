import api from "@/common/utils/api";

export const getNeedReview = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?._id || user?.id;
    return api.get(`/review/need-review/${userId}`);
};

export const getReviewDetail = (reviewId: string) => {
    return api.get(`/review/${reviewId}`);
};
