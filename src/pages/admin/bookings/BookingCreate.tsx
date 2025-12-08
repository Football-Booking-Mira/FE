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
import BookingTimeSelector, { type SelectedSlot } from '@/components/BookingTimeSelector';

const { TextArea } = Input;
const { Title, Text } = Typography;

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
    isBooked?: boolean;
}

const COURT_TYPE_LABELS: Record<string, string> = {
    indoor: 'Trong nhà',
    outdoor: 'Ngoài trời',
    vip: 'Sân VIP',
};

// FE tự sinh code cho vui, BE vẫn có code riêng
const generateBookingCode = (dateStr: string) => {
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const cleanDate = dateStr.replace(/-/g, '');
    return `BK-${cleanDate}-${random}`;
};

const BookingCreate: React.FC = () => {
    const navigate = useNavigate();

    // KHÁCH HÀNG
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerList, setCustomerList] = useState<Customer[]>([]);
    const [customerLoading, setCustomerLoading] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isCustomerListModalOpen, setCustomerListModalOpen] = useState(false);
    const [isCustomerCreateModalOpen, setCustomerCreateModalOpen] = useState(false);
    const [createCustomerForm] = Form.useForm();

    // SÂN
    const [courts, setCourts] = useState<Court[]>([]);
    const [courtLoading, setCourtLoading] = useState(false);
    const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);

    // THỜI GIAN
    const [date, setDate] = useState<Dayjs | null>(null);
    const [startTime, setStartTime] = useState<string | undefined>();
    const [endTime, setEndTime] = useState<string | undefined>();
    const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);

    // GHI CHÚ + GIÁ
    const [note, setNote] = useState('');
    const [fieldPrice, setFieldPrice] = useState(0);

    // CỌC
    const depositAmount = Math.round(fieldPrice * 0.5);
    const [isDepositPaid, setIsDepositPaid] = useState(false);

    /* ================== LOAD COURTS ================== */
    useEffect(() => {
        const fetchCourts = async () => {
            try {
                setCourtLoading(true);
                const res = await api.get('/courts', { params: { status: 'active' } });
                const data = res.data?.data || res.data;
                setCourts(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error(err);
                toast.error('Không tải được danh sách sân');
            } finally {
                setCourtLoading(false);
            }
        };
        fetchCourts();
    }, []);

    /* ================== SEARCH CUSTOMER ================== */
    const handleSearchCustomer = async () => {
        try {
            setCustomerLoading(true);
            const res = await api.get('/users', {
                params: { search: customerSearch.trim() },
            });
            const data = res.data?.data || res.data;
            setCustomerList(Array.isArray(data) ? data : []);
            setCustomerListModalOpen(true);
        } catch (err) {
            console.error(err);
            toast.error('Không tìm được khách hàng');
        } finally {
            setCustomerLoading(false);
        }
    };

    /* ================== CHỌN SLOT ================== */
    const handleSlotSelected = useCallback((slots: SelectedSlot[]) => {
        if (!slots.length) {
            setSelectedSlots([]);
            setDate(null);
            setStartTime(undefined);
            setEndTime(undefined);
            setFieldPrice(0);
            setIsDepositPaid(false);
            return;
        }

        const sorted = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));

        setSelectedSlots(sorted);
        setDate(dayjs(sorted[0].date));
        setStartTime(sorted[0].startTime);
        setEndTime(sorted[sorted.length - 1].endTime);

        const total = sorted.reduce((sum, s) => sum + (s.price || 0), 0);
        setFieldPrice(total);
        setIsDepositPaid(false);
    }, []);

    // Reset khi đổi sân
    useEffect(() => {
        if (!selectedCourt) {
            setSelectedSlots([]);
            setFieldPrice(0);
            setDate(null);
            setStartTime(undefined);
            setEndTime(undefined);
            setIsDepositPaid(false);
        }
    }, [selectedCourt]);

    /* ================== TẠO KHÁCH HÀNG ================== */
    const handleCreateCustomer = async () => {
        try {
            const values = await createCustomerForm.validateFields();

            const payload = {
                name: values.name,
                phone: values.phone,
                email: values.email || '',
            };

            const token = localStorage.getItem('token');

            const res = await fetch('http://localhost:3000/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}) as any);

            if (res.status !== 200 && res.status !== 201) {
                toast.error(data.message || 'Không thể thêm khách hàng');
                return;
            }

            const newCustomer = data.user || data.data || data;
            setSelectedCustomer(newCustomer);
            toast.success('✔ Thêm khách hàng thành công!');
            setCustomerCreateModalOpen(false);
            createCustomerForm.resetFields();
        } catch (err) {
            console.error('🔥 Lỗi tạo khách hàng:', err);
            toast.error('Có lỗi xảy ra khi tạo khách hàng');
        }
    };

    /* ================== SUBMIT BOOKING ================== */
    const handleSubmitBooking = async () => {
        if (!selectedCourt) return toast.error('Vui lòng chọn sân');
        if (!date || !startTime || !endTime) return toast.error('Vui lòng chọn ngày giờ');
        if (!selectedCustomer) return toast.error('Vui lòng chọn hoặc thêm khách hàng');
        if (!selectedSlots.length) return toast.error('Vui lòng chọn ít nhất một ca giờ');

        const dateStr = date.format('YYYY-MM-DD');

        // Tính future match giống BE
        const now = dayjs();
        const bookingDay = date.startOf('day');
        const bookingStart = dayjs(`${dateStr} ${startTime}`);

        const isFutureDay = bookingDay.isAfter(now, 'day');
        const isSameDay = bookingDay.isSame(now, 'day');
        const isFutureSameDay = isSameDay && bookingStart.isAfter(now);
        const isFutureMatch = isFutureDay || isFutureSameDay;

        // 🔒 Chỉ BẮT BUỘC cọc 50% nếu là trận đá sau
        if (isFutureMatch && !isDepositPaid) {
            return toast.error(
                'Khách đặt sân đá sau (khác ngày hoặc khác giờ) bắt buộc phải cọc 50% trước!'
            );
        }

        const bookingCode = generateBookingCode(dateStr);

        // Gửi list slot cho BE để:
        // - tính tiền theo từng ca
        // - check trùng giờ chính xác (không coi là 1 block dài)
        const slotsPayload = selectedSlots.map((s) => ({
            startTime: s.startTime,
            endTime: s.endTime,
        }));

        const payload = {
            courtId: selectedCourt._id,
            customerId: selectedCustomer._id,
            date: dateStr,
            startTime,
            endTime,
            slots: slotsPayload, // ✅ QUAN TRỌNG
            totalFieldAmount: fieldPrice, // FE gửi để BE so sánh log, BE vẫn tự tính lại
            note: note || '',
            isOffline: true,
            paymentMethod: PAYMENT_METHOD?.CASH || 'cash',
            paidAtCreation: isDepositPaid,
            isDepositPaid,
            depositAmount,
            customerInfo: {
                name: selectedCustomer.name,
                phone: selectedCustomer.phone,
                email: selectedCustomer.email || '',
            },
            bookingCode,
        };

        try {
            const res = await api.post('/bookings', payload);
            const booking = res.data?.data || res.data;
            toast.success(`Đặt sân thành công — Mã: ${booking?.code || bookingCode}`);

            setCourts((prev) =>
                prev.map((c) => (c._id === selectedCourt._id ? { ...c, isBooked: true } : c))
            );

            navigate('/admin/bookings');
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Tạo đơn thất bại';
            toast.error(msg);
            console.error('Create booking error:', err?.response?.data || err);
        }
    };

    /* ================== RENDER ================== */
    return (
        <>
            <Title level={3}>Đặt sân nhanh</Title>
            <Text type='secondary'>Tạo đơn đặt sân tại quầy cho khách</Text>

            <Row gutter={24} style={{ marginTop: 24 }}>
                <Col span={16}>
                    {/* 1. KHÁCH HÀNG */}
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

                    {/* 2. SÂN */}
                    <Card title='2. Chọn sân' style={{ marginBottom: 16 }} loading={courtLoading}>
                        <Row gutter={[16, 16]}>
                            {courts.map((court) => {
                                const isActive = selectedCourt?._id === court._id;
                                const imageUrl = court.images?.[0] || '';
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
                                                }}
                                            >
                                                {imageUrl && (
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
                                                )}

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

                                                    <div style={{ marginTop: 8 }}>
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
                                                        {court.isBooked && (
                                                            <Tag
                                                                color='red'
                                                                style={{ marginTop: 8 }}
                                                            >
                                                                Đã đặt
                                                            </Tag>
                                                        )}
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

                    {/* 3. THỜI GIAN */}
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

                {/* TÓM TẮT */}
                <Col span={8}>
                    <Card title='Tóm tắt đặt sân'>
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
                                {selectedSlots.length ? (
                                    <Text strong>
                                        {selectedSlots
                                            .map((s) => `${s.startTime} - ${s.endTime}`)
                                            .join(', ')}
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
                                <Text type='secondary'>Tiền cọc (50%)</Text>
                                <br />
                                <Text strong>{depositAmount.toLocaleString('vi-VN')} đ</Text>
                            </div>

                            <div>
                                <Text type='secondary'>Khách đã đặt cọc?</Text>
                                <br />
                                <Button
                                    type={isDepositPaid ? 'primary' : 'default'}
                                    onClick={() => setIsDepositPaid((v) => !v)}
                                    block
                                >
                                    {isDepositPaid ? 'Đã cọc' : 'Chưa cọc (ấn để xác nhận)'}
                                </Button>
                            </div>

                            <Button
                                type='primary'
                                size='large'
                                block
                                onClick={handleSubmitBooking}
                                disabled={!selectedCustomer || !selectedCourt}
                            >
                                Xác nhận đặt sân
                            </Button>

                            <Text type='secondary' style={{ fontSize: 12 }}>
                                * Đơn đặt sẽ được tự động xác nhận.
                                <br />* Khách thanh toán trực tiếp tại quầy / cọc theo chính sách.
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

            {/* MODAL THÊM KHÁCH HÀNG */}
            <Modal
                title='Thêm khách hàng mới'
                open={isCustomerCreateModalOpen}
                onCancel={() => {
                    setCustomerCreateModalOpen(false);
                    createCustomerForm.resetFields();
                }}
                onOk={handleCreateCustomer}
                okText='Lưu'
                cancelText='Hủy'
                destroyOnClose
            >
                <Form form={createCustomerForm} layout='vertical'>
                    <Form.Item
                        label='Họ tên'
                        name='name'
                        rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                    >
                        <Input placeholder='Nhập họ tên khách hàng' />
                    </Form.Item>

                    <Form.Item
                        label='Số điện thoại'
                        name='phone'
                        rules={[
                            { required: true, message: 'Vui lòng nhập số điện thoại' },
                            {
                                pattern: /^[0-9]{8,15}$/,
                                message: 'Số điện thoại không hợp lệ',
                            },
                        ]}
                    >
                        <Input placeholder='Nhập số điện thoại' />
                    </Form.Item>

                    <Form.Item
                        label='Email'
                        name='email'
                        rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
                    >
                        <Input placeholder='Nhập email (tùy chọn)' />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default BookingCreate;
