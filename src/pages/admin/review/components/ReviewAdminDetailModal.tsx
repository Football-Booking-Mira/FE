import React, { useEffect, useState } from "react";
import { Modal, Descriptions, Spin, Tag, Rate } from "antd";
import axios from "axios";

interface Props {
    open: boolean;
    reviewId: string | null;
    onClose: () => void;
}

const ReviewAdminDetailModal: React.FC<Props> = ({ open, reviewId, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [review, setReview] = useState<any>(null);

    useEffect(() => {
        if (open && reviewId) {
            fetchDetail();
        }
    }, [open, reviewId]);

    const fetchDetail = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");

            const res = await axios.get(
                `http://localhost:3000/api/review/${reviewId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setReview(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <Modal
            open={open}
            title="Chi tiết đánh giá"
            onCancel={onClose}
            footer={null}
            width={800}
            destroyOnClose
        >
            {loading || !review ? (
                <Spin />
            ) : (
                <Descriptions bordered column={1} size="small">

                    {/* ===== KHÁCH HÀNG ===== */}
                    <Descriptions.Item label="Khách hàng">
                        {review.userId.name}
                    </Descriptions.Item>

                    <Descriptions.Item label="Số điện thoại">
                        {review.userId.phone}
                    </Descriptions.Item>

                    <Descriptions.Item label="Email">
                        {review.userId.email}
                    </Descriptions.Item>

                    {/* ===== BOOKING ===== */}
                    <Descriptions.Item label="Mã booking">
                        {review.bookingId.code}
                    </Descriptions.Item>

                    <Descriptions.Item label="Ngày đá">
                        {new Date(review.bookingId.date).toLocaleDateString()}
                    </Descriptions.Item>

                    <Descriptions.Item label="Thời gian">
                        {review.bookingId.startTime} - {review.bookingId.endTime}
                    </Descriptions.Item>

                    <Descriptions.Item label="Tổng tiền">
                        {review.bookingId.total.toLocaleString()}đ
                    </Descriptions.Item>



                    {/* ===== SÂN ===== */}
                    <Descriptions.Item label="Sân">
                        {review.courtId.name}
                    </Descriptions.Item>

                    <Descriptions.Item label="Loại sân">
                        <Tag color="blue">
                            {review.courtId.type === "indoor"
                                ? "Trong nhà"
                                : review.courtId.type === "outdoor"
                                    ? "Ngoài trời"
                                    : "VIP"}
                        </Tag>
                    </Descriptions.Item>

                    <Descriptions.Item label="Địa điểm">
                        {review.courtId.location}
                    </Descriptions.Item>

                    {/* ===== REVIEW ===== */}
                    <Descriptions.Item label="Nhận xét">
                        <div
                            style={{
                                background: "rgba(255, 253, 244, 1)",
                                border: "1px solid #ffe180ff",
                                padding: "12px",
                                borderRadius: 6,
                                whiteSpace: "pre-wrap",
                                fontStyle: "italic",
                            }}
                        >
                            {review.comment}
                        </div>
                    </Descriptions.Item>
                    <Descriptions.Item label="Đánh giá">
                        <div className="flex items-center gap-2">
                            <Rate disabled value={review.rating} />
                            <span className="text-gray-500 text-sm">
                                ({review.rating}/5)
                            </span>
                        </div>
                    </Descriptions.Item>



                    <Descriptions.Item label="Trạng thái đánh giá">
                        <Tag color={review.status === "active" ? "green" : "red"}>
                            {review.status === "active" ? "Hoạt động" : "Ẩn"}
                        </Tag>
                    </Descriptions.Item>

                    <Descriptions.Item label="Ngày tạo">
                        {new Date(review.createdAt).toLocaleString()}
                    </Descriptions.Item>

                    <Descriptions.Item label="Cập nhật lần cuối">
                        {new Date(review.updatedAt).toLocaleString()}
                    </Descriptions.Item>
                </Descriptions>
            )}
        </Modal>
    );
};

export default ReviewAdminDetailModal;
