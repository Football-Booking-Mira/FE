import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    Card,
    Row,
    Col,
    Input,
    Button,
    List,
    Avatar,
    Modal,
    Form,
    Typography,
    Space,
    Tag,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { SearchOutlined, UserOutlined, PlusOutlined } from '@ant-design/icons';
import api from '@/common/utils/api';
import { PAYMENT_METHOD } from '@/common/constants/enums.ts';
import { toast } from 'react-toastify';

// import component tái sử dụng
import BookingTimeSelector from '@/components/BookingTimeSelector';

const { TextArea } = Input;
const { Title, Text } = Typography;

/* ========= TYPES ========= */

interface Customer {
    _id: string;
    name: string;
    phone: string;
    email?: string;
}

interface Court {
    _id: string;
    name: string;
    type: string;
    basePrice: number;
    peakPrice: number;
    address?: string;
    images?: string[];
}

const COURT_TYPE_LABELS: Record<string, string> = {
    indoor: 'Trong nhà',
    outdoor: 'Ngoài trời',
    vip: 'Sân VIP',
};

/* ========= PAGE COMPONENT ========= */

const BookingCreate: React.FC = () => {
    const navigate = useNavigate();

    // --- B1. KHÁCH HÀNG ---
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerList, setCustomerList] = useState<Customer[]>([]);
    const [customerLoading, setCustomerLoading] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const [isCustomerListModalOpen, setCustomerListModalOpen] = useState(false);
    const [isCustomerCreateModalOpen, setCustomerCreateModalOpen] = useState(false);

    const [createCustomerForm] = Form.useForm();

    // --- B2. SÂN + THỜI GIAN ---
    const [courts, setCourts] = useState<Court[]>([]);
    const [courtLoading, setCourtLoading] = useState(false);
    const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);

    const [date, setDate] = useState<Dayjs | null>(null);
    const [startTime, setStartTime] = useState<string | undefined>();
    const [endTime, setEndTime] = useState<string | undefined>();

    // --- GHI CHÚ ---
    const [note, setNote] = useState('');

    // --- GIÁ TIỀN (tạm tính) ---
    const [fieldPrice, setFieldPrice] = useState(0);
    const totalAmount = fieldPrice; // không còn tiền thiết bị

    /* ========== CALL API ========== */

    // 1. Lấy danh sách sân active
    useEffect(() => {
        const fetchCourts = async () => {
            try {
                setCourtLoading(true);
                const res = await api.get('/courts', {
                    params: { status: 'active' },
                });
                const data = res.data?.data || res.data;
                setCourts(data || []);
            } catch (err) {
                console.error(err);
                toast.error('Không tải được danh sách sân');
            } finally {
                setCourtLoading(false);
            }
        };
        fetchCourts();
    }, []);

    // 2. Search khách hàng theo phone / name
    const handleSearchCustomer = async () => {
        try {
            setCustomerLoading(true);
            const res = await api.get('/users', {
                params: { search: customerSearch.trim() },
            });
            const data = res.data?.data || res.data;
            setCustomerList(data || []);
            setCustomerListModalOpen(true);
        } catch (err) {
            console.error(err);
            toast.error('Không tìm được khách hàng');
        } finally {
            setCustomerLoading(false);
        }
    };

    // 3. khi chọn slot từ BookingTimeSelector – dùng luôn slot.price
    const handleSlotSelected = useCallback(
        (slot: {
            date: string;
            startTime: string;
            endTime: string;
            price: number;
            duration: number;
        }) => {
            setDate(dayjs(slot.date));
            setStartTime(slot.startTime);
            setEndTime(slot.endTime);

            // dùng giá đã tính ở BookingTimeSelector
            setFieldPrice(slot.price || 0);
        },
        []
    );

    // Reset field price khi đổi sân
    useEffect(() => {
        if (!selectedCourt) {
            setFieldPrice(0);
            setDate(null);
            setStartTime(undefined);
            setEndTime(undefined);
        }
    }, [selectedCourt]);

    /* ========== TẠO KHÁCH HÀNG MỚI ========== */

    const handleCreateCustomer = async () => {
        try {
            const values = await createCustomerForm.validateFields();
            const res = await api.post('/users', values);
            const newCustomer: Customer = res.data?.data || res.data;
            setSelectedCustomer(newCustomer);
            toast.success('Thêm khách hàng mới thành công');
            setCustomerCreateModalOpen(false);
            createCustomerForm.resetFields();
        } catch (err) {
            console.error(err);
        }
    };

    /* ========== SUBMIT ĐẶT SÂN ========== */

    const handleSubmitBooking = async () => {
        if (!selectedCourt) {
            toast.error('Vui lòng chọn sân');
            return;
        }
        if (!date || !startTime || !endTime) {
            toast.error('Vui lòng chọn ngày và giờ');
            return;
        }

        const customerInfo = selectedCustomer
            ? {
                  name: selectedCustomer.name,
                  phone: selectedCustomer.phone,
                  email: selectedCustomer.email || '',
              }
            : { name: '', phone: '', email: '' };

        try {
            const payload = {
                courtId: selectedCourt._id,
                customerId: selectedCustomer?._id || null,
                date: date.startOf('day').toISOString(),
                startTime,
                endTime,
                note: note || '',
                isOffline: true,
                paymentMethod: PAYMENT_METHOD?.CASH || 'cash',
                paidAtCreation: true,
                customerInfo,
            };

            const res = await api.post('/bookings', payload);
            const booking = res.data?.data || res.data;
            toast.success('Tạo đơn đặt sân thành công');
            console.log('NEW BOOKING', booking);

            // điều hướng về danh sách đặt sân
            navigate('/admin/bookings');

            // Reset form (dù đã navigate, cho chắc)
            setSelectedCustomer(null);
            setSelectedCourt(null);
            setDate(null);
            setStartTime(undefined);
            setEndTime(undefined);
            setNote('');
            setFieldPrice(0);
        } catch (err: any) {
            console.error(err);
            const msg = err?.response?.data?.message || 'Tạo đơn thất bại';
            toast.error(msg);
        }
    };

    /* ========== RENDER ========== */

    return (
        <>
            <Title level={3} style={{ marginBottom: 16 }}>
                Đặt sân nhanh
            </Title>
            <Text type='secondary'>Tạo đơn đặt sân tại quầy cho khách hàng</Text>

            <Row gutter={24} style={{ marginTop: 24 }}>
                {/* CỘT TRÁI: CÁC BƯỚC */}
                <Col span={16}>
                    {/* B1. CHỌN KHÁCH HÀNG */}
                    <Card title='1. Chọn khách hàng' style={{ marginBottom: 16 }}>
                        <Row gutter={8} align='middle'>
                            <Col flex='auto'>
                                <Input
                                    placeholder='Nhập SĐT hoặc tên khách hàng...'
                                    prefix={<SearchOutlined />}
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                    onPressEnter={handleSearchCustomer}
                                />
                            </Col>
                            <Col>
                                <Button loading={customerLoading} onClick={handleSearchCustomer}>
                                    Danh sách
                                </Button>
                            </Col>
                            <Col>
                                <Button
                                    type='primary'
                                    icon={<PlusOutlined />}
                                    onClick={() => setCustomerCreateModalOpen(true)}
                                >
                                    Thêm mới
                                </Button>
                            </Col>
                        </Row>

                        {selectedCustomer && (
                            <Card
                                size='small'
                                style={{
                                    marginTop: 16,
                                    background: '#f6ffed',
                                    borderColor: '#b7eb8f',
                                }}
                            >
                                <Space>
                                    <Avatar icon={<UserOutlined />} />
                                    <div>
                                        <Text strong>{selectedCustomer.name}</Text>
                                        <br />
                                        <Text type='secondary'>
                                            {selectedCustomer.phone} · {selectedCustomer.email}
                                        </Text>
                                    </div>
                                    <Tag color='green'>Đã chọn</Tag>
                                    <Button type='link' onClick={() => setSelectedCustomer(null)}>
                                        Đổi
                                    </Button>
                                </Space>
                            </Card>
                        )}
                    </Card>

                    {/* B2. CHỌN SÂN */}
                    <Card title='2. Chọn sân' style={{ marginBottom: 16 }} loading={courtLoading}>
                        <Row gutter={[16, 16]}>
                            {courts.map((court) => {
                                const isActive = selectedCourt?._id === court._id;
                                const imageUrl =
                                    court.images && court.images.length > 0 ? court.images[0] : '';

                                return (
                                    <Col span={12} key={court._id}>
                                        <Card
                                            hoverable
                                            onClick={() => setSelectedCourt(court)}
                                            style={{
                                                borderColor: isActive ? '#1677ff' : undefined,
                                                borderWidth: isActive ? 2 : 1,
                                            }}
                                            bodyStyle={{ padding: 12 }}
                                        >
                                            <div
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '1fr 1fr',
                                                    gap: 12,
                                                    alignItems: 'stretch',
                                                }}
                                            >
                                                {/* ẢNH SÂN (1:1) */}
                                                {imageUrl && (
                                                    <div>
                                                        <img
                                                            src={imageUrl}
                                                            alt={court.name}
                                                            style={{
                                                                width: '100%',
                                                                aspectRatio: '1 / 1',
                                                                objectFit: 'cover',
                                                                borderRadius: 8,
                                                            }}
                                                        />
                                                    </div>
                                                )}

                                                {/* THÔNG TIN SÂN */}
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'space-between',
                                                    }}
                                                >
                                                    <div>
                                                        <Title
                                                            level={5}
                                                            style={{ marginBottom: 4 }}
                                                        >
                                                            {court.name}
                                                        </Title>
                                                        <Text type='secondary'>
                                                            {COURT_TYPE_LABELS[court.type] ||
                                                                court.type}
                                                        </Text>
                                                    </div>

                                                    <div style={{ marginTop: 8, fontSize: 13 }}>
                                                        <div>
                                                            Giờ thường:{' '}
                                                            <Text strong>
                                                                {court.basePrice.toLocaleString(
                                                                    'vi-VN'
                                                                )}{' '}
                                                                đ
                                                            </Text>
                                                        </div>
                                                        <div>
                                                            Giờ cao điểm:{' '}
                                                            <Text strong>
                                                                {court.peakPrice.toLocaleString(
                                                                    'vi-VN'
                                                                )}{' '}
                                                                đ
                                                            </Text>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    </Col>
                                );
                            })}

                            {!courts.length && !courtLoading && (
                                <Col span={24}>
                                    <Text type='secondary'>Chưa có sân nào.</Text>
                                </Col>
                            )}
                        </Row>
                    </Card>

                    {/* B3. CHỌN THỜI GIAN – dùng BookingTimeSelector */}
                    <Card title='3. Chọn thời gian' style={{ marginBottom: 16 }}>
                        {selectedCourt ? (
                            <BookingTimeSelector
                                courtId={selectedCourt._id}
                                basePrice={selectedCourt.basePrice}
                                peakPrice={selectedCourt.peakPrice}
                                onSlotSelected={handleSlotSelected}
                            />
                        ) : (
                            <Text type='secondary'>
                                Vui lòng chọn sân trước khi chọn khung giờ.
                            </Text>
                        )}
                    </Card>

                    {/* GHI CHÚ */}
                    <Card title='Ghi chú'>
                        <TextArea
                            rows={3}
                            placeholder='Thêm ghi chú cho đơn đặt sân...'
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </Card>
                </Col>

                {/* CỘT PHẢI: TÓM TẮT */}
                <Col span={8}>
                    <Card title='Tóm tắt đặt sân' extra={<span />}>
                        <Space direction='vertical' style={{ width: '100%' }} size='middle'>
                            <div>
                                <Text type='secondary'>Khách hàng</Text>
                                <br />
                                {selectedCustomer ? (
                                    <Text strong>{selectedCustomer.name}</Text>
                                ) : (
                                    <Text>Chưa chọn</Text>
                                )}
                            </div>
                            <div>
                                <Text type='secondary'>Sân</Text>
                                <br />
                                {selectedCourt ? (
                                    <Text strong>{selectedCourt.name}</Text>
                                ) : (
                                    <Text>Chưa chọn</Text>
                                )}
                            </div>
                            <div>
                                <Text type='secondary'>Ngày đặt</Text>
                                <br />
                                {date ? (
                                    <Text strong>{date.format('DD/MM/YYYY')}</Text>
                                ) : (
                                    <Text>Chưa chọn</Text>
                                )}
                            </div>
                            <div>
                                <Text type='secondary'>Giờ</Text>
                                <br />
                                {startTime && endTime ? (
                                    <Text strong>
                                        {startTime} - {endTime}
                                    </Text>
                                ) : (
                                    <Text>Chưa chọn</Text>
                                )}
                            </div>

                            <div>
                                <Text type='secondary'>Tiền sân</Text>
                                <br />
                                <Text strong>{fieldPrice.toLocaleString('vi-VN')} đ</Text>
                            </div>

                            <div>
                                <Text type='secondary'>Tổng tiền</Text>
                                <Title level={4} style={{ marginTop: 4, marginBottom: 0 }}>
                                    {totalAmount.toLocaleString('vi-VN')} đ
                                </Title>
                            </div>

                            <Button type='primary' size='large' block onClick={handleSubmitBooking}>
                                Xác nhận đặt sân
                            </Button>

                            <Text type='secondary' style={{ fontSize: 12 }}>
                                * Đơn đặt sẽ được tự động xác nhận. <br />* Khách thanh toán trực
                                tiếp tại quầy.
                            </Text>
                        </Space>
                    </Card>
                </Col>
            </Row>

            {/* MODAL DANH SÁCH KHÁCH HÀNG */}
            <Modal
                title='Danh sách khách hàng'
                open={isCustomerListModalOpen}
                onCancel={() => setCustomerListModalOpen(false)}
                footer={null}
                width={700}
            >
                <List
                    dataSource={customerList}
                    renderItem={(item) => (
                        <List.Item
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                                setSelectedCustomer(item);
                                setCustomerListModalOpen(false);
                            }}
                        >
                            <List.Item.Meta
                                avatar={<Avatar icon={<UserOutlined />} />}
                                title={item.name}
                                description={
                                    <>
                                        {item.phone}
                                        {item.email && ` · ${item.email}`}
                                    </>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Modal>

            {/* MODAL THÊM KHÁCH HÀNG MỚI */}
            <Modal
                title='Thêm khách hàng mới'
                open={isCustomerCreateModalOpen}
                onCancel={() => setCustomerCreateModalOpen(false)}
                onOk={handleCreateCustomer}
                okText='Lưu'
                cancelText='Hủy'
            >
                <Form form={createCustomerForm} layout='vertical'>
                    <Form.Item
                        label='Họ tên'
                        name='name'
                        rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label='Số điện thoại'
                        name='phone'
                        rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item label='Email' name='email'>
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default BookingCreate;
