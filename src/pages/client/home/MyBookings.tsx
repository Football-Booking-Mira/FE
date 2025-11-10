import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import vi from 'date-fns/locale/vi';
import { Modal, Button, Tag, Spin, Empty } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '@/common/utils/api'; // axios instance đã gắn Authorization

interface Booking {
    _id: string;
    courtId: { name: string; type?: string };
    date: string;
    startTime: string;
    endTime: string;
    total: number;
    hours: number;
    status: 'pending' | 'confirmed' | 'in_use' | 'completed' | 'cancelled';
    paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded';
}

const STATUS_LABELS: Record<string, string> = {
    all: 'Tất cả',
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    in_use: 'Đang sử dụng',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
};

const STATUS_COLORS: Record<string, string> = {
    pending: 'gold',
    confirmed: 'blue',
    in_use: 'purple',
    completed: 'green',
    cancelled: 'red',
};

const MyBookings: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [filtered, setFiltered] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeStatus, setActiveStatus] = useState<string>('all');

    // Lấy danh sách đặt sân
    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user') || 'null');
                const userId = user?._id;
                if (!userId) return;

                // api instance đã tự đính kèm Bearer token
                const res = await api.get(`/bookings/user/${userId}`);
                const data = res.data;

                if (data?.success) {
                    const sorted = [...data.data].sort(
                        (a: Booking, b: Booking) =>
                            new Date(b.date).getTime() - new Date(a.date).getTime()
                    );
                    setBookings(sorted);
                    setFiltered(sorted);
                } else {
                    toast.error(data?.message || 'Không lấy được danh sách đặt sân');
                }
            } catch (err) {
                console.error(err);
                toast.error('Lỗi tải danh sách đặt sân');
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, []);

    // Lọc theo trạng thái
    const handleFilter = (status: string) => {
        setActiveStatus(status);
        if (status === 'all') setFiltered(bookings);
        else setFiltered(bookings.filter((b) => b.status === status));
    };

    // Hủy đặt sân
    const handleCancel = (id: string, status: Booking['status']) => {
        if (status !== 'pending') {
            toast.warning('Chỉ hủy được các đơn đang chờ xác nhận!');
            return;
        }
        Modal.confirm({
            title: 'Xác nhận hủy đặt sân',
            icon: <ExclamationCircleOutlined />,
            content: 'Bạn có chắc chắn muốn hủy đặt sân này không?',
            okText: 'Xác nhận',
            cancelText: 'Hủy',
            okButtonProps: { danger: true },
            centered: true,
            async onOk() {
                try {
                    const res = await api.patch(`/bookings/${id}/cancel`);
                    const data = res.data;
                    if (data?.success) {
                        toast.success('🎉 Hủy đặt sân thành công!');
                        // cập nhật local state
                        setBookings((prev) =>
                            prev.map((b) => (b._id === id ? { ...b, status: 'cancelled' } : b))
                        );
                        setFiltered((prev) =>
                            prev.map((b) => (b._id === id ? { ...b, status: 'cancelled' } : b))
                        );
                    } else {
                        toast.error(data?.message || 'Hủy thất bại!');
                    }
                } catch (err: any) {
                    toast.error(err?.message || 'Có lỗi xảy ra khi hủy đặt sân!');
                }
            },
        });
    };

    if (loading) {
        return (
            <div className='flex justify-center items-center h-screen'>
                <Spin size='large' tip='Đang tải dữ liệu...' />
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-gray-50 py-12'>
            <ToastContainer
                position='top-right'
                autoClose={2500}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnHover
                draggable
                theme='colored'
                style={{ marginTop: '70px' }} // tránh đè navbar nếu có
            />
            <div className='max-w-6xl mx-auto px-6'>
                <h1 className='text-3xl font-bold text-gray-800 mb-10 text-center'>
                    Danh sách đặt sân
                </h1>

                {/* FILTER BUTTONS */}
                <div className='flex flex-wrap justify-center gap-3 mb-10'>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => handleFilter(key)}
                            className={`px-4 py-2 text-sm font-medium rounded-full border transition-all duration-150 ${
                                activeStatus === key
                                    ? 'bg-green-600 text-white border-green-600 shadow'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-green-50'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* LIST */}
                {filtered.length === 0 ? (
                    <Empty
                        description='Không có đặt sân nào'
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        className='mt-10'
                    />
                ) : (
                    <div className='space-y-6'>
                        {filtered.map((booking) => (
                            <div
                                key={booking._id}
                                className='bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 p-6 flex flex-col md:flex-row justify-between md:items-center transition'
                            >
                                {/* LEFT */}
                                <div className='space-y-2 mb-4 md:mb-0'>
                                    <h2 className='text-xl font-semibold text-green-700'>
                                        {booking.courtId?.name || 'Sân bóng'}
                                    </h2>

                                    <p className='text-gray-600 text-sm'>
                                        {format(new Date(booking.date), 'dd/MM/yyyy', {
                                            locale: vi,
                                        })}{' '}
                                        • {booking.startTime} - {booking.endTime}
                                    </p>

                                    <p className='text-gray-500 text-sm'>
                                        {booking.hours} giờ •{' '}
                                        {booking.paymentStatus === 'paid' ? (
                                            <span className='text-green-600 font-medium'>
                                                Đã thanh toán
                                            </span>
                                        ) : (
                                            <span className='text-amber-500 font-medium'>
                                                Chưa thanh toán
                                            </span>
                                        )}
                                    </p>

                                    <Tag
                                        color={STATUS_COLORS[booking.status] || 'default'}
                                        className='text-sm font-medium rounded-full'
                                    >
                                        {STATUS_LABELS[booking.status] || 'Không xác định'}
                                    </Tag>
                                </div>

                                {/* RIGHT */}
                                <div className='text-right'>
                                    <p className='text-green-700 font-extrabold text-xl mb-3'>
                                        {booking.total.toLocaleString('vi-VN')} ₫
                                    </p>

                                    {booking.status === 'pending' && (
                                        <Button
                                            danger
                                            type='primary'
                                            size='middle'
                                            onClick={() =>
                                                handleCancel(booking._id, booking.status)
                                            }
                                        >
                                            Hủy đặt sân
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyBookings;
