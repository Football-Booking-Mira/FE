import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button, Tag, Spin, Empty } from 'antd';
import { ToastContainer, toast } from 'react-toastify';
import api from '@/common/utils/api';
import 'react-toastify/dist/ReactToastify.css';

// Mapping status hiển thị
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
    const [bookings, setBookings] = useState<any[]>([]);
    const [filtered, setFiltered] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeStatus, setActiveStatus] = useState<string>('all');
    const socketRef = useRef<Socket | null>(null);
    const handleCancel = async (bookingId: string) => {
        try {
            await api.patch(`/bookings/${bookingId}/cancel`);
            toast.success('Hủy đặt sân thành công!', {
                autoClose: 1500,
                style: { backgroundColor: '#dc2626', color: '#fff' },
            });
            fetchBookings();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Không thể hủy đặt sân!');
        }
    };

    // Fetch danh sách đặt sân
    const fetchBookings = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            const userId = user?._id;
            if (!userId) return;

            const res = await api.get(`/bookings/user/${userId}`);
            const data = res.data;

            if (data?.success) {
                const sorted = [...data.data].sort(
                    (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
                );
                setBookings(sorted);
                setFiltered(sorted);
            } else {
                toast.error(data?.message || 'Không lấy được danh sách đặt sân');
            }
        } catch {
            toast.error('Lỗi tải danh sách đặt sân');
        } finally {
            setLoading(false);
        }
    };

    // Kết nối socket + lắng nghe booking_updated
    useEffect(() => {
        fetchBookings(); // gọi 1 lần khi mở trang

        const socket = io('http://localhost:3000', {
            transports: ['websocket'],
            withCredentials: true,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log(' Socket connected:', socket.id);
        });

        socket.on('booking_updated', (data) => {
            console.log(' Nhận sự kiện cập nhật:', data);
            fetchBookings();
            toast.info('Lịch đặt sân của bạn vừa được cập nhật', {
                autoClose: 1500,
                style: { backgroundColor: '#22c55e', color: '#fff' },
            });
        });

        return () => {
            socket.off('booking_updated');
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    // Sau khi có bookings → join tất cả phòng sân tương ứng
    useEffect(() => {
        if (bookings.length && socketRef.current) {
            bookings.forEach((b) => {
                if (b.courtId?._id) {
                    socketRef.current?.emit('join:court', b.courtId._id);
                    console.log(' Joined room:', b.courtId._id);
                }
            });
        }
    }, [bookings]);

    // Lọc theo trạng thái
    const handleFilter = (status: string) => {
        setActiveStatus(status);
        if (status === 'all') setFiltered(bookings);
        else setFiltered(bookings.filter((b) => b.status === status));
    };

    // Loading state
    if (loading)
        return (
            <div className='flex justify-center items-center h-screen'>
                <Spin size='large' tip='Đang tải dữ liệu...' />
            </div>
        );

    // Render giao diện
    return (
        <div className='min-h-screen bg-gray-50 py-12'>
            <ToastContainer position='top-right' autoClose={2500} theme='colored' />
            <div className='max-w-6xl mx-auto px-6'>
                <h1 className='text-3xl font-bold text-gray-800 mb-10 text-center'>
                    Danh sách đặt sân
                </h1>

                {/* Bộ lọc trạng thái */}
                <div className='flex flex-wrap justify-center gap-3 mb-10'>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => handleFilter(key)}
                            className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
                                activeStatus === key
                                    ? 'bg-green-600 text-white border-green-600 shadow'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-green-50'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Danh sách booking */}
                {filtered.length === 0 ? (
                    <Empty description='Không có đặt sân nào' />
                ) : (
                    <div className='space-y-6'>
                        {filtered.map((booking) => (
                            <div
                                key={booking._id}
                                className='bg-white rounded-2xl shadow-sm border p-6 flex flex-col md:flex-row justify-between md:items-center transition'
                            >
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
                                    <Tag
                                        color={STATUS_COLORS[booking.status] || 'default'}
                                        className='text-sm font-medium rounded-full'
                                    >
                                        {STATUS_LABELS[booking.status]}
                                    </Tag>
                                </div>

                                <div className='text-right'>
                                    <p className='text-green-700 font-extrabold text-xl mb-3'>
                                        {booking.total.toLocaleString('vi-VN')} ₫
                                    </p>
                                    {booking.status === 'pending' && (
                                        <Button
                                            danger
                                            type='primary'
                                            size='middle'
                                            onClick={() => handleCancel(booking._id)}
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
