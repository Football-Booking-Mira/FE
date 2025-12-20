import React, { useEffect, useState } from 'react';
import { Table, Tag, Rate, Button, Space, Typography } from 'antd';
import axios from 'axios';
import ReviewAdminDetailModal from './components/ReviewAdminDetailModal';

const { Text, Paragraph } = Typography;

const ReviewsAdmin = () => {
    const [loading, setLoading] = useState(false);
    const [reviews, setReviews] = useState<any[]>([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
    });

    const token = localStorage.getItem('token');
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

    useEffect(() => {
        fetchReviews(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

            // lọc review mồ côi (bookingId null)
            const cleaned = (data.reviews || []).filter((r: any) => r?.bookingId);

            setReviews(cleaned);

            // total nên lấy theo server đã lọc
            setPagination((prev) => ({
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

    const updateStatus = async (id: string, status: 'active' | 'hidden') => {
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
            title: 'Booking',
            key: 'booking',
            render: (_: any, record: any) => {
                const b = record?.bookingId;

                if (!b) {
                    return (
                        <div>
                            <Text strong type='danger'>
                                Booking đã bị xoá / không tồn tại
                            </Text>
                            <div style={{ color: '#999' }}>ReviewId: {record?._id}</div>
                        </div>
                    );
                }

                return (
                    <div>
                        <Text strong>{b.code ?? '(no code)'}</Text>
                        <div>
                            {b.startTime ?? '--:--'} – {b.endTime ?? '--:--'}
                        </div>
                        <Text type='secondary'>
                            Tổng tiền: {Number(b.total ?? 0).toLocaleString()}đ
                        </Text>
                    </div>
                );
            },
        },
        {
            title: 'Khách hàng',
            key: 'user',
            render: (_: any, record: any) => {
                const u = record?.userId;
                if (!u) return <Text type='danger'>User không tồn tại</Text>;

                return (
                    <div>
                        <Text strong>{u.name ?? '(no name)'}</Text>
                        <div>{u.phone ?? ''}</div>
                        <Text type='secondary'>{u.email ?? ''}</Text>
                    </div>
                );
            },
        },
        {
            title: 'Nhận xét',
            dataIndex: 'comment',
            key: 'comment',
            width: 320,
            render: (_: any, record: any) => (
                <div>
                    <Paragraph
                        ellipsis={{ rows: 2, expandable: false }}
                        style={{ marginBottom: 4 }}
                    >
                        {record.comment}
                    </Paragraph>

                    <Rate disabled value={record.rating} style={{ fontSize: 14 }} />
                </div>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={status === 'active' ? 'green' : 'red'}>
                    {status === 'active' ? 'Hiện' : 'Ẩn'}
                </Tag>
            ),
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_: any, record: any) => (
                <Space>
                    <Button
                        size='small'
                        onClick={() => {
                            setSelectedReviewId(record._id);
                            setDetailOpen(true);
                        }}
                    >
                        Xem chi tiết
                    </Button>
                    <Button
                        size='small'
                        danger={record.status === 'active'}
                        onClick={() =>
                            updateStatus(
                                record._id,
                                record.status === 'active' ? 'hidden' : 'active'
                            )
                        }
                    >
                        {record.status === 'active' ? 'Ẩn' : 'Hiện'}
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <h2>Danh sách đánh giá</h2>

            <Table
                rowKey='_id'
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
