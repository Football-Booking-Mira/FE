import { Modal, Rate, Descriptions, Image } from "antd";

interface Props {
    open: boolean;
    onClose: () => void;
    review: any;
}

const ReviewDetailModal = ({ open, onClose, review }: Props) => {
    if (!review) return null;

    const { courtId, bookingId, userId, rating, comment, createdAt } = review;

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            title="Chi tiết đánh giá"
            width={700}
        >

            <Descriptions bordered column={1}>
                <Descriptions.Item label="Sân">
                    {courtId.name} ({courtId.type})
                </Descriptions.Item>

                <Descriptions.Item label="Địa điểm">
                    {courtId.location}
                </Descriptions.Item>

                <Descriptions.Item label="Thời gian">
                    {bookingId.startTime} - {bookingId.endTime} |{" "}
                    {new Date(bookingId.date).toLocaleDateString()}
                </Descriptions.Item>

                <Descriptions.Item label="Người đánh giá">
                    {userId.name} – {userId.email}
                </Descriptions.Item>

                {/* <Descriptions.Item label="Số sao">
                    <Rate disabled value={rating} />
                </Descriptions.Item> */}

                <Descriptions.Item label="Nhận xét">
                    {comment}
                </Descriptions.Item>

                <Descriptions.Item label="Ngày đánh giá">
                    {new Date(createdAt).toLocaleString()}
                </Descriptions.Item>
            </Descriptions>
        </Modal>
    );
};

export default ReviewDetailModal;
