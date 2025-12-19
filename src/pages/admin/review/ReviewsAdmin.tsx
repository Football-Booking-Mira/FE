import React, { useEffect, useState } from "react";
import { Table, Tag, Rate, Button, Space, Typography } from "antd";
import axios from "axios";
import ReviewDetailModal from "@/components/ReviewDetailModal";
import ReviewAdminDetailModal from "./components/ReviewAdminDetailModal";

const { Text, Paragraph } = Typography;

const ReviewsAdmin = () => {
    const [loading, setLoading] = useState(false);
    const [reviews, setReviews] = useState<any[]>([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
    });

    const token = localStorage.getItem("token");
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

    useEffect(() => {
        fetchReviews(1);
    }, []);

    const fetchReviews = async (page: number) => {
        try {
            setLoading(true);
            const res = await axios.get(
                `http://localhost:3000/api/review/admin/list?page=${page}&limit=${pagination.limit}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = res.data.data;

            setReviews(data.reviews || []);
            setPagination(prev => ({
                ...prev,
                page: data.pagination.page,
                total: data.pagination.total,
            }));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        await axios.patch(
            `http://localhost:3000/api/review/${id}/status`,
            { status },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        fetchReviews(pagination.page);
    };


    const columns = [
        {
            title: "Booking",
            key: "booking",
            render: (_: any, record: any) => (
                <div>
                    <Text strong>{record.bookingId.code}</Text>
                    <div>
                        {record.bookingId.startTime} – {record.bookingId.endTime}
                    </div>
                    <Text type="secondary">
                        Tổng tiền: {record.bookingId.total.toLocaleString()}đ
                    </Text>
                </div>
            ),
        },
        {
            title: "Khách hàng",
            key: "user",
            render: (_: any, record: any) => (
                <div>
                    <Text strong>{record.userId.name}</Text>
                    <div>{record.userId.phone}</div>
                    <Text type="secondary">{record.userId.email}</Text>
                </div>
            ),
        },
        {
            title: "Nhận xét",
            dataIndex: "comment",
            key: "comment",
            width: 320,
            render: (_: any, record: any) => (
                <div>
                    <Paragraph
                        ellipsis={{ rows: 2, expandable: false }}
                        style={{ marginBottom: 4 }}
                    >
                        {record.comment}
                    </Paragraph>

                    <Rate
                        disabled
                        value={record.rating}
                        style={{ fontSize: 14 }}
                    />
                </div>
            ),
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            render: (status: string) => (
                <Tag color={status === "active" ? "green" : "red"}>
                    {status === "active" ? "Hiện" : "Ẩn"}
                </Tag>
            ),
        },
        {
            title: "Hành động",
            key: "action",
            render: (_: any, record: any) => (
                <Space>
                    <Button
                        size="small"
                        onClick={() => {
                            setSelectedReviewId(record._id);
                            setDetailOpen(true);
                        }}
                    >
                        Xem chi tiết
                    </Button>
                    <Button
                        size="small"
                        danger={record.status === "active"}
                        onClick={() =>
                            updateStatus(
                                record._id,
                                record.status === "active" ? "inactive" : "active"
                            )
                        }
                    >
                        {record.status === "active" ? "Ẩn" : "Hiện"}
                    </Button>

                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <h2>Danh sách đánh giá</h2>

            <Table
                rowKey="_id"
                columns={columns}
                dataSource={reviews}
                loading={loading}
                pagination={{
                    current: pagination.page,
                    pageSize: pagination.limit,
                    total: pagination.total,
                    onChange: (page) => fetchReviews(page),
                }}
            />

            <ReviewAdminDetailModal
                open={detailOpen}
                reviewId={selectedReviewId}
                onClose={() => setDetailOpen(false)}
            />
        </div>
    );
};

export default ReviewsAdmin;
