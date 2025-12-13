// pages/Reviews.tsx
import { getNeedReview, getReviewDetail } from "@/common/services/review.service";
import ReviewDetailModal from "@/components/ReviewDetailModal";
import {
    Card,
    Tabs,
    Row,
    Col,
    Button,
    Rate,
    Tag,
    Spin,
    Empty,
    Modal, Form, Input,
    message
} from "antd";
import axios from "axios";
import { useEffect, useState } from "react";

const { TabPane } = Tabs;

const Reviews = ({ }: any) => {
    const [loading, setLoading] = useState(false);
    const [reviewed, setReviewed] = useState<any[]>([]);
    const [unreviewed, setUnreviewed] = useState<any[]>([]);
    const [unreviewedTotal, setUnreviewedTotal] = useState(0);

    const [detailOpen, setDetailOpen] = useState(false);
    const [reviewDetail, setReviewDetail] = useState<any>(null);
    const [openReviewModal, setOpenReviewModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

    const token = localStorage.getItem('token');


    const [form] = Form.useForm();
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await getNeedReview();
            setReviewed(res.data.reviewedCourts || []);
            setUnreviewed(res.data.unreviewedCourts?.items || []);
            setUnreviewedTotal(res.data.unreviewedCourts?.total || 0);
        } catch (err) {
            message.error("Không tải được dữ liệu");
        } finally {
            setLoading(false);
        }
    };

    const handleViewReview = async (reviewId: string) => {
        try {
            const res = await getReviewDetail(reviewId);
            setReviewDetail(res.data.data);
            setDetailOpen(true);
        } catch (err) {
            message.error("Không tải được chi tiết đánh giá");
        }
    };

    const COURT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
        indoor: { label: "Trong nhà", color: "green" },
        outdoor: { label: "Ngoài trời", color: "blue" },
        vip: { label: "VIP", color: "gold" },
    };

    const handleWriteReview = (bookingId: string) => {
        setSelectedBookingId(bookingId);
        setOpenReviewModal(true);
        form.resetFields();
    };
    const handleSubmitReview = async () => {
        try {
            const values = await form.validateFields();

            setSubmitting(true);

            await axios.post(
                "http://localhost:3000/api/review",
                {
                    bookingId: selectedBookingId,
                    rating: 5,
                    comment: values.comment,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            message.success("Đánh giá thành công!");

            setOpenReviewModal(false);
            fetchData(); // reload danh sách

        } catch (err: any) {
            message.error(
                err?.response?.data?.message || "Gửi đánh giá thất bại"
            );
        } finally {
            setSubmitting(false);
        }
    };

    const renderCourtCard = (item: any, isReviewed = false) => {
        const typeConfig = COURT_TYPE_CONFIG[item.courtId.type] || {
            label: item.courtId.type,
            color: "default",
        };

        return (
            <Col xs={24} md={12} lg={8} key={item._id}>
                <Card
                    hoverable
                    cover={
                        <img
                            src="https://oct.vn/wp-content/uploads/2019/07/kich-thuoc-san-bong-da-696x372.jpg"
                            style={{ height: 180, objectFit: "cover" }}
                        />
                    }
                >
                    <div className="flex gap-8 items-center justify-between mb-3"><h3>{item.courtId.name}</h3>

                        <Tag color={typeConfig.color}>{typeConfig.label}</Tag>
                    </div>

                    <div className="flex gap-8 items-center justify-between">
                        <p>🕒 {item.startTime} - {item.endTime}</p>
                        <p>💰 {item.total.toLocaleString()}đ</p>
                    </div>


                    {isReviewed ? (
                        <Button
                            block
                            style={{ marginTop: 12 }}
                            onClick={() => handleViewReview(item.reviewId)}
                        >
                            Xem đánh giá
                        </Button>
                    ) : (
                        <Button
                            type="primary"
                            block
                            style={{ marginTop: 12 }}
                            onClick={() => handleWriteReview(item._id)} // bookingId
                        >
                            Viết đánh giá
                        </Button>

                    )}
                </Card>
            </Col>
        );
    };


    if (loading) {
        return (
            <div style={{ textAlign: "center", marginTop: 100 }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
    <>
        <div
            style={{
                padding: "24px 16px",
                display: "flex",
                justifyContent: "center",
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: 1100, // 👈 thu nhỏ khung nội dung
                }}
            >
                <Tabs defaultActiveKey="unreviewed">
                    <TabPane
                        tab={`Chưa đánh giá (${unreviewedTotal})`}
                        key="unreviewed"
                    >
                        {unreviewed.length ? (
                            <Row gutter={[16, 16]} justify="start">
                                {unreviewed.map(item =>
                                    renderCourtCard(item, false)
                                )}
                            </Row>
                        ) : (
                            <Empty />
                        )}
                    </TabPane>

                    <TabPane
                        tab={`Đã đánh giá (${reviewed.length})`}
                        key="reviewed"
                    >
                        {reviewed.length ? (
                            <Row gutter={[16, 16]} justify="start">
                                {reviewed.map(item =>
                                    renderCourtCard(item, true)
                                )}
                            </Row>
                        ) : (
                            <Empty />
                        )}
                    </TabPane>
                </Tabs>
            </div>
        </div>

        <ReviewDetailModal
            open={detailOpen}
            onClose={() => setDetailOpen(false)}
            review={reviewDetail}
        />

        <Modal
            title="Đánh giá sân"
            open={openReviewModal}
            onCancel={() => setOpenReviewModal(false)}
            onOk={handleSubmitReview}
            okText="Gửi đánh giá"
            confirmLoading={submitting}
            destroyOnClose
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    label="Nhận xét"
                    name="comment"
                    rules={[
                        { required: true, message: "Vui lòng nhập nhận xét" },
                        { min: 5, message: "Nhận xét tối thiểu 5 ký tự" },
                    ]}
                >
                    <Input.TextArea
                        rows={4}
                        placeholder="Chia sẻ trải nghiệm của bạn..."
                    />
                </Form.Item>
            </Form>
        </Modal>
    </>
);



};

export default Reviews;
