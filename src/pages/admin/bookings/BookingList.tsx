import { useEffect, useState } from 'react';
import api from '@/common/utils/api';
import {
    Button,
    Tag,
    Table,
    Card,
    Space,
    Input,
    Select,
    DatePicker,
    Statistic,
    Row,
    Col,
} from 'antd';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import {
    CheckOutlined,
    DollarOutlined,
    PlayCircleOutlined,
    StopOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    PlaySquareOutlined,
    CloseCircleOutlined,
    FileTextOutlined,
} from '@ant-design/icons';
import { io } from 'socket.io-client';

dayjs.locale('vi');

interface Booking {
    _id: string;
    code: string;
    customerId?: { _id?: string; name?: string; phone?: string };
    courtId?: { name: string };
    date: string;
    startTime: string;
    endTime: string;
    total: number;
    createdBy: 'admin' | 'user';
    status: string;
    paymentStatus: string;
}

interface DashboardStats {
    total: number;
    pending: number;
    confirmed: number;
    inUse: number;
    completed: number;
    cancelled: number;
}

const STATUS_LABELS: Record<string, string> = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    in_use: 'Đang sử dụng',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
};

const PAYMENT_LABELS: Record<string, string> = {
    unpaid: 'Chưa thanh toán',
    partial: 'Thanh toán một phần',
    paid: 'Đã thanh toán',
    refunded: 'Đã hoàn tiền',
};

export default function BookingList() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        total: 0,
        pending: 0,
        confirmed: 0,
        inUse: 0,
        completed: 0,
        cancelled: 0,
    });
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        date: null as any,
    });

    // Lấy thống kê tổng quan
    const fetchStats = async () => {
        try {
            const res = await api.get('/bookings/admin/dashboard');
            setStats(res.data.data || {});
        } catch {
            toast.error('Không thể tải thống kê!');
        }
    };

    // Lấy danh sách booking
    const fetchBookings = async () => {
        setLoading(true);
        try {
            const res = await api.get('/bookings');
            console.log('BOOKINGS RESPONSE:', res.data);
            setBookings(res.data.data || []);
        } catch {
            toast.error('Không thể tải danh sách đặt sân!');
        } finally {
            setLoading(false);
        }
    };

    // Gắn socket realtime cập nhật admin dashboard
    useEffect(() => {
        fetchBookings();
        fetchStats();

        const socketInstance = io('http://localhost:3000', {
            transports: ['websocket'],
            withCredentials: true,
        });

        // Lắng nghe sự kiện global từ BE (phát ra khi có thay đổi)
        socketInstance.on('booking_global_updated', () => {
            fetchBookings();
            fetchStats(); // cập nhật luôn thống kê dashboard
            toast.info('⚡ Hệ thống đặt sân vừa có cập nhật mới!', {
                duration: 1500,
                style: { backgroundColor: '#22c55e', color: '#fff' },
            });
        });

        return () => {
            socketInstance.off('booking_global_updated');
            socketInstance.disconnect();
        };
    }, []);

    // Các thao tác admin
    const handleAction = async (
        id: string,
        action: 'confirm' | 'cancel' | 'checkin' | 'checkout' | 'paid'
    ) => {
        try {
            if (action === 'confirm') {
                await api.patch(`/bookings/${id}/confirm`);
                toast.success('✅ Đã xác nhận đặt sân!');
            } else if (action === 'cancel') {
                await api.patch(`/bookings/${id}/cancel`);
                toast.success('❌ Đã hủy đặt sân!');
            } else if (action === 'paid') {
                await api.patch(`/bookings/${id}`, { paymentStatus: 'paid' });
                toast.success('💵 Thanh toán thành công!');
            } else if (action === 'checkin') {
                await api.patch(`/bookings/${id}/checkin`);
                toast.success('📍 Check-in thành công!');
            } else if (action === 'checkout') {
                await api.patch(`/bookings/${id}/checkout`);
                toast.success('🏁 Check-out thành công!');
            }

            fetchBookings();
            fetchStats();
        } catch {
            toast.error('Lỗi thao tác!');
        }
    };

    // Lọc theo trạng thái / tên khách hàng / mã booking
    const filteredBookings = bookings.filter((b) => {
        const matchesSearch =
            b.code.toLowerCase().includes(filters.search.toLowerCase()) ||
            b.customerId?.name?.toLowerCase().includes(filters.search.toLowerCase() || '');
        const matchesStatus = filters.status ? b.status === filters.status : true;
        const matchesDate = filters.date ? dayjs(b.date).isSame(filters.date, 'day') : true;
        return matchesSearch && matchesStatus && matchesDate;
    });

    // 🧱 Cấu hình bảng
    const columns = [
        {
            title: 'Mã đặt',
            dataIndex: 'code',
            key: 'code',
            width: 130,
            render: (v: string) => <b>{v}</b>,
        },
        {
            title: 'Khách hàng',
            key: 'customer',
            render: (b: Booking) => (
                <div>
                    <b>{b.customerId?.name || 'Ẩn danh'}</b>
                    {b.customerId?.phone && (
                        <>
                            <br />
                            <span className='text-xs text-gray-500'>{b.customerId.phone}</span>
                        </>
                    )}
                </div>
            ),
        },
        {
            title: 'Sân',
            key: 'court',
            render: (b: Booking) => b.courtId?.name,
        },
        {
            title: 'Ngày đặt',
            key: 'date',
            render: (b: Booking) => dayjs(b.date).format('DD/MM/YYYY'),
        },
        {
            title: 'Giờ',
            key: 'time',
            render: (b: Booking) => `${b.startTime} - ${b.endTime}`,
        },
        {
            title: 'Tổng tiền',
            dataIndex: 'total',
            render: (t: number) =>
                t ? t.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) : '-',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (s: string) => {
                const color =
                    s === 'confirmed'
                        ? 'blue'
                        : s === 'pending'
                        ? 'orange'
                        : s === 'in_use'
                        ? 'purple'
                        : s === 'completed'
                        ? 'green'
                        : 'gray';
                return <Tag color={color}>{STATUS_LABELS[s] || s}</Tag>;
            },
        },
        {
            title: 'Thanh toán',
            dataIndex: 'paymentStatus',
            render: (s: string) => (
                <Tag color={s === 'paid' ? 'green' : 'red'}>{PAYMENT_LABELS[s] || s}</Tag>
            ),
        },
        {
            title: 'Thao tác',
            key: 'actions',
            render: (b: Booking) => {
                if (b.status === 'cancelled') return <Tag color='default'>Đã hủy</Tag>;
                if (b.status === 'completed')
                    return (
                        <Tag color='green'>
                            <CheckCircleOutlined /> Hoàn thành
                        </Tag>
                    );

                return (
                    <Space wrap>
                        {b.status === 'pending' && (
                            <>
                                <Button
                                    size='small'
                                    type='primary'
                                    onClick={() => handleAction(b._id, 'confirm')}
                                >
                                    <CheckOutlined /> Xác nhận
                                </Button>
                                <Button
                                    size='small'
                                    danger
                                    onClick={() => handleAction(b._id, 'cancel')}
                                >
                                    <CloseCircleOutlined /> Hủy
                                </Button>
                            </>
                        )}
                        {b.status === 'confirmed' && (
                            <>
                                <Button
                                    size='small'
                                    icon={<PlayCircleOutlined />}
                                    onClick={() => handleAction(b._id, 'checkin')}
                                >
                                    Check-in
                                </Button>
                                <Button
                                    size='small'
                                    icon={<DollarOutlined />}
                                    onClick={() => handleAction(b._id, 'paid')}
                                >
                                    Thanh toán
                                </Button>
                                <Button
                                    size='small'
                                    danger
                                    onClick={() => handleAction(b._id, 'cancel')}
                                >
                                    Hủy
                                </Button>
                            </>
                        )}
                        {b.status === 'in_use' && (
                            <Button
                                size='small'
                                icon={<StopOutlined />}
                                onClick={() => handleAction(b._id, 'checkout')}
                            >
                                Check-out
                            </Button>
                        )}
                    </Space>
                );
            },
        },
    ];

    return (
        <div className='space-y-6'>
            <Card title='📊 Thống kê đặt sân' bordered={false}>
                <Row gutter={16}>
                    <Col span={4}>
                        <Statistic
                            title='Tổng đơn'
                            value={stats.total}
                            prefix={<FileTextOutlined />}
                        />
                    </Col>
                    <Col span={4}>
                        <Statistic
                            title='Chờ xác nhận'
                            value={stats.pending}
                            prefix={<ClockCircleOutlined />}
                        />
                    </Col>
                    <Col span={4}>
                        <Statistic
                            title='Đã xác nhận'
                            value={stats.confirmed}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Col>
                    <Col span={4}>
                        <Statistic
                            title='Đang sử dụng'
                            value={stats.inUse}
                            prefix={<PlaySquareOutlined />}
                        />
                    </Col>
                    <Col span={4}>
                        <Statistic
                            title='Hoàn thành'
                            value={stats.completed}
                            prefix={<CheckOutlined />}
                        />
                    </Col>
                    <Col span={4}>
                        <Statistic
                            title='Đã hủy'
                            value={stats.cancelled}
                            prefix={<CloseCircleOutlined />}
                        />
                    </Col>
                </Row>
            </Card>

            <Card title='📋 Danh sách đặt sân' bordered={false}>
                <div className='flex flex-wrap gap-4 mb-4'>
                    <Input.Search
                        placeholder='Tìm mã hoặc tên khách hàng...'
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        style={{ width: 220 }}
                    />
                    <Select
                        placeholder='Trạng thái'
                        allowClear
                        onChange={(v) => setFilters({ ...filters, status: v })}
                        style={{ width: 180 }}
                        options={Object.entries(STATUS_LABELS).map(([value, label]) => ({
                            value,
                            label,
                        }))}
                    />
                    <DatePicker
                        placeholder='Ngày đặt'
                        onChange={(v) => setFilters({ ...filters, date: v })}
                    />
                    <Button
                        onClick={() => {
                            fetchBookings();
                            fetchStats();
                        }}
                    >
                        🔄 Làm mới
                    </Button>
                </div>

                <Table
                    rowKey='_id'
                    columns={columns}
                    dataSource={filteredBookings}
                    loading={loading}
                    pagination={{ pageSize: 6 }}
                />
            </Card>
        </div>
    );
}
