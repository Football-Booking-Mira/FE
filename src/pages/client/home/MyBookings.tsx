import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button, Tag, Spin, Empty, Modal, Input, Image } from 'antd';
import { ToastContainer, toast } from 'react-toastify';
import api from '@/common/utils/api';
import 'react-toastify/dist/ReactToastify.css';
import dayjs from 'dayjs';
import { printInvoiceMira } from '@/common/utils/printInvoice';
import { useNavigate } from 'react-router';

dayjs.locale('vi');
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

const STATUS_LABELS: Record<string, string> = {
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

const PAYMENT_LABELS: Record<string, string> = {
    unpaid: 'Chưa thanh toán',
    partial: 'Thanh toán một phần',
    paid: 'Đã thanh toán',
    refunded: 'Hoàn tiền xong',
};

const PAYMENT_COLORS: Record<string, string> = {
    unpaid: 'red',
    partial: 'orange',
    paid: 'green',
    refunded: 'volcano',
};

const REFUND_STATUS_LABELS: Record<string, string> = {
    none: 'Không có hoàn tiền',
    pending: 'Đã gửi yêu cầu hoàn tiền',
    processing: 'Đang xử lý hoàn tiền',
    refunded: 'Đã hoàn tiền',
    rejected: 'Từ chối hoàn tiền',
};

const REFUND_STATUS_COLORS: Record<string, string> = {
    none: 'default',
    pending: 'orange',
    processing: 'blue',
    refunded: 'green',
    rejected: 'red',
};

const TABS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'waiting_payment', label: 'Chờ thanh toán' },
    { key: 'pending', label: 'Chờ xác nhận' },
    { key: 'confirmed', label: 'Đã xác nhận' },
    { key: 'in_use', label: 'Đang sử dụng' },
    { key: 'completed', label: 'Hoàn thành' },
    { key: 'cancelled', label: 'Đã hủy' },
    { key: 'refunded', label: 'Hoàn tiền' },
];

const handleViewInvoice = async (bookingId: string) => {
    try {
        const res = await api.get(`/invoices/by-booking/${bookingId}`);
        const detail = res.data?.data || res.data;

        if (!detail?.invoice) {
            toast.error('Không tìm thấy hóa đơn cho đơn này!');
            return;
        }

        printInvoiceMira(detail);
    } catch (err: any) {
        const msg = err?.response?.data?.message || 'Không thể tải hóa đơn, vui lòng thử lại!';
        toast.error(msg);
    }
};

// helper: đổi "HH:mm" -> phút
const timeToMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};

const MyBookings: React.FC = () => {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState<any[]>([]);
    const [bookingGroups, setBookingGroups] = useState<any[]>([]);
    const [filteredGroups, setFilteredGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>('all');
    const [tabCounts, setTabCounts] = useState<Record<string, number>>({});

    const socketRef = useRef<Socket | null>(null);
    const lastSocketUpdateRef = useRef<number>(0);

    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);

    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [refundBookingIds, setRefundBookingIds] = useState<string[]>([]);
    const [refundForm, setRefundForm] = useState({
        accountNumber: '',
        accountName: '',
        bankName: '',
        note: '',
    });

    const [payingBookingId, setPayingBookingId] = useState<string | null>(null);

    //  THANH TOÁN LẠI (1 booking đầu mối, backend tự gom order)
    const handlePayAgain = async (booking: any) => {
        try {
            setPayingBookingId(booking._id);

            const retryRes = await api.get(`/bookings/${booking._id}/retry-payment-info`);
            const info = retryRes.data?.data;

            if (!info || !info.amountToPay || info.amountToPay <= 0) {
                toast.error(
                    'Không có số tiền cần thanh toán thêm cho đơn/nhóm đơn này. Vui lòng kiểm tra lại!'
                );
                setPayingBookingId(null);
                return;
            }

            // gửi bookingId / bookingIds cho API
            const body =
                info.type === 'order'
                    ? {
                          bookingIds: info.bookingIds, // mảng các ca trong đơn gộp
                          isRetryPayment: true,
                          amount: info.amountToPay,
                      }
                    : {
                          bookingId: info.bookingId, // đơn lẻ
                          isRetryPayment: true,
                          amount: info.amountToPay,
                      };

            const payRes = await api.post('/payment/vnpay/create', body);
            const paymentUrl =
                payRes.data?.paymentUrl || payRes.data?.data?.paymentUrl || payRes.data?.data?.url;

            if (!paymentUrl) {
                toast.error('Không lấy được link thanh toán VNPay!');
                setPayingBookingId(null);
                return;
            }

            toast.success('Đang chuyển tới trang thanh toán VNPay...');
            window.location.href = paymentUrl;
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message ||
                    'Không thể thanh toán lại đơn này, vui lòng thử lại!'
            );
            setPayingBookingId(null);
        }
    };

    // Thanh toán lại cho cả group (chọn 1 booking phù hợp trong group)
    const handlePayAgainGroup = (group: any) => {
        // ưu tiên booking VNPAY, PENDING
        const candidate =
            group.bookings.find(
                (b: any) =>
                    b.paymentMethod === 'vnpay' &&
                    b.status === 'pending' &&
                    (b.paymentStatus === 'unpaid' || b.paymentStatus === 'partial')
            ) || group.bookings[0];

        if (!candidate) return;
        handlePayAgain(candidate);
    };

    const applyFilter = (tabKey: string, groupsSource: any[] = bookingGroups) => {
        if (tabKey === 'all') {
            setFilteredGroups(groupsSource);
            return;
        }

        const matchBooking = (b: any) => {
            switch (tabKey) {
                case 'waiting_payment':
                    return b.paymentStatus === 'unpaid' || b.paymentStatus === 'partial';
                case 'pending':
                case 'confirmed':
                case 'in_use':
                case 'completed':
                case 'cancelled':
                    return b.status === tabKey;
                case 'refunded':
                    return (b.refundStatus || 'none') === 'refunded';
                default:
                    return true;
            }
        };

        const result = groupsSource
            .map((g) => (g.bookings.some(matchBooking) ? g : null))
            .filter(Boolean) as any[];

        setFilteredGroups(result);
    };

    // LOAD BOOKING
    const fetchBookings = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            const userId = user?._id;
            if (!userId) return;

            const res = await api.get(`/bookings/user/${userId}`);
            const data = res.data;

            if (data?.success) {
                const mapped = data.data.map((b: any) => {
                    const hasDepositPaid = (b.depositAmount || 0) > 0 && b.depositStatus === 'paid';
                    const deposit = Number(b.depositAmount || 0);
                    const total = Number(b.total || 0);
                    let paymentStatus: string = b.paymentStatus || 'unpaid';

                    if (
                        (paymentStatus === 'unpaid' || paymentStatus === 'partial') &&
                        hasDepositPaid
                    ) {
                        if (total > 0 && deposit >= total) {
                            paymentStatus = 'paid';
                        } else {
                            paymentStatus = 'partial';
                        }
                    }

                    return { ...b, paymentStatus };
                });

                const sorted = [...mapped].sort((a: any, b: any) => {
                    const at = new Date(a.createdAt || a.date).getTime();
                    const bt = new Date(b.createdAt || b.date).getTime();
                    return bt - at;
                });

                setBookings(sorted);

                const groupMap = new Map<string, any>();
                for (const b of sorted) {
                    const key = b.orderId ? String(b.orderId) : String(b._id);
                    if (!groupMap.has(key)) {
                        groupMap.set(key, {
                            _id: key,
                            courtId: b.courtId,
                            customerId: b.customerId,
                            date: b.date,
                            bookings: [] as any[],
                        });
                    }
                    groupMap.get(key).bookings.push(b);
                }

                const groups = Array.from(groupMap.values()).map((g: any) => {
                    g.bookings.sort((a: any, b: any) =>
                        String(a.startTime || '').localeCompare(String(b.startTime || ''))
                    );
                    g.total = g.bookings.reduce(
                        (sum: number, b: any) => sum + Number(b.total || 0),
                        0
                    );
                    return g;
                });

                setBookingGroups(groups);

                const counts: Record<string, number> = {
                    all: sorted.length,
                    waiting_payment: sorted.filter(
                        (b) => b.paymentStatus === 'unpaid' || b.paymentStatus === 'partial'
                    ).length,
                    pending: sorted.filter((b) => b.status === 'pending').length,
                    confirmed: sorted.filter((b) => b.status === 'confirmed').length,
                    in_use: sorted.filter((b) => b.status === 'in_use').length,
                    completed: sorted.filter((b) => b.status === 'completed').length,
                    cancelled: sorted.filter((b) => b.status === 'cancelled').length,
                    refunded: sorted.filter((b) => (b.refundStatus || 'none') === 'refunded')
                        .length,
                };
                setTabCounts(counts);

                applyFilter(activeTab, groups);
            } else {
                toast.error(data?.message || 'Không lấy được danh sách đặt sân');
            }
        } catch {
            toast.error('Lỗi tải danh sách đặt sân');
        } finally {
            setLoading(false);
        }
    };

    // SOCKET
    useEffect(() => {
        fetchBookings();

        const socket = io(SOCKET_URL, {
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });
        socketRef.current = socket;

        const handleBookingUpdated = () => {
            const now = Date.now();
            if (now - lastSocketUpdateRef.current < 400) return;
            lastSocketUpdateRef.current = now;

            fetchBookings();

            toast.info('Lịch đặt sân của bạn vừa được cập nhật', {
                autoClose: 1500,
                style: { backgroundColor: '#22c55e', color: '#fff' },
            });
        };

        socket.on('booking_updated', handleBookingUpdated);
        socket.on('booking_global_updated', handleBookingUpdated);

        return () => {
            socket.off('booking_updated', handleBookingUpdated);
            socket.off('booking_global_updated', handleBookingUpdated);
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (bookings.length && socketRef.current) {
            bookings.forEach((b) => {
                if (b.courtId?._id) {
                    socketRef.current?.emit('join:court', b.courtId._id);
                }
            });
        }
    }, [bookings]);

    const handleTabChange = (key: string) => {
        setActiveTab(key);
        applyFilter(key);
    };

    // ----------- HỦY ĐƠN (NHIỀU CA) -----------
    const openCancelModal = (bookingIds: string[]) => {
        setSelectedBookingIds(bookingIds);
        setCancelReason('');
        setIsCancelModalOpen(true);
    };

    const closeCancelModal = () => {
        setIsCancelModalOpen(false);
        setCancelReason('');
        setSelectedBookingIds([]);
    };

    const handleConfirmCancel = async () => {
        if (!selectedBookingIds.length) return;

        if (!cancelReason.trim()) {
            toast.error('Vui lòng nhập lý do hủy đơn!');
            return;
        }

        try {
            await Promise.all(
                selectedBookingIds.map((id) =>
                    api.patch(`/bookings/${id}/cancel`, { reason: cancelReason.trim() })
                )
            );

            toast.success('Hủy các ca trong đơn thành công!', {
                autoClose: 1500,
                style: { backgroundColor: '#dc2626', color: '#fff' },
            });

            closeCancelModal();
            fetchBookings();
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message ||
                    err.message ||
                    'Không thể hủy toàn bộ các ca, vui lòng kiểm tra lại!'
            );
        }
    };

    // ----------- HOÀN TIỀN (NHIỀU CA) -----------
    const openRefundModal = (bookings: any[]) => {
        const first = bookings[0] || {};

        setRefundBookingIds(bookings.map((b) => b._id));

        setRefundForm({
            accountNumber: first.refundAccountNumber || '',
            accountName: first.refundAccountName || '',
            bankName: first.refundBankName || '',
            note: first.refundNote || '',
        });

        setIsRefundModalOpen(true);
    };

    const closeRefundModal = () => {
        setIsRefundModalOpen(false);
        setRefundBookingIds([]);
        setRefundForm({
            accountNumber: '',
            accountName: '',
            bankName: '',
            note: '',
        });
    };

    const handleSubmitRefund = async () => {
        if (!refundBookingIds.length) return;

        if (
            !refundForm.accountNumber.trim() ||
            !refundForm.accountName.trim() ||
            !refundForm.bankName.trim()
        ) {
            toast.error('Vui lòng nhập đầy đủ thông tin tài khoản nhận hoàn tiền!');
            return;
        }

        try {
            await Promise.all(
                refundBookingIds.map((id) =>
                    api.post(`/bookings/${id}/refund-request`, {
                        accountNumber: refundForm.accountNumber.trim(),
                        accountName: refundForm.accountName.trim(),
                        bankName: refundForm.bankName.trim(),
                        note: refundForm.note.trim(),
                    })
                )
            );

            toast.success('Đã gửi yêu cầu hoàn tiền cho toàn bộ các ca trong đơn!', {
                autoClose: 2000,
                style: { backgroundColor: '#15803d', color: '#fff' },
            });

            closeRefundModal();
            fetchBookings();
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message ||
                    err.message ||
                    'Không thể gửi yêu cầu hoàn tiền cho toàn bộ ca, vui lòng thử lại!'
            );
        }
    };

    //  LOADING
    if (loading) {
        return (
            <div className='flex justify-center items-center h-screen'>
                <Spin size='large' tip='Đang tải dữ liệu...' />
            </div>
        );
    }

    //  RENDER
    return (
        <div className='min-h-screen bg-gray-50 py-12'>
            <ToastContainer position='top-right' autoClose={2500} theme='colored' />
            <div className='max-w-6xl mx-auto px-4 md:px-6'>
                <h1 className='text-3xl font-bold text-gray-900 mb-8 text-center'>
                    Đơn đặt sân của tôi
                </h1>

                {/* TABS */}
                <div className='bg-white rounded-t-2xl border border-b-0 px-4 md:px-6'>
                    <div className='flex flex-wrap gap-4 border-b border-gray-200'>
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => handleTabChange(tab.key)}
                                className={`relative py-3 text-sm md:text-base whitespace-nowrap transition-all
                                    ${
                                        activeTab === tab.key
                                            ? 'text-green-600 border-b-2 border-green-600 font-semibold'
                                            : 'text-gray-500 border-b-2 border-transparent hover:text-green-600 hover:border-green-200'
                                    }`}
                            >
                                {tab.label}{' '}
                                <span className='text-xs text-gray-400'>
                                    ({tabCounts[tab.key] || 0})
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* LIST */}
                <div className='bg-white rounded-b-2xl border border-t-0 px-4 md:px-6 pb-6'>
                    {filteredGroups.length === 0 ? (
                        <div className='py-16 flex justify-center'>
                            <Empty description='Không có đơn đặt sân nào' />
                        </div>
                    ) : (
                        <div className='divide-y divide-gray-100'>
                            {filteredGroups.map((group) => {
                                const first = group.bookings[0];
                                const imageUrl =
                                    first.courtId?.images?.[0] || first.courtId?.image || '';

                                const groupTotal = Number(group.total || 0);

                                // tổng số ca = tổng số slot của tất cả booking (nếu không có slots => 1 ca)
                                const slotCount: number = group.bookings.reduce(
                                    (sum: number, b: any) => {
                                        if (Array.isArray(b.slots) && b.slots.length > 0) {
                                            return sum + b.slots.length;
                                        }
                                        return sum + 1;
                                    },
                                    0
                                );

                                //  ĐIỀU KIỆN YÊU CẦU HOÀN TIỀN
                                const refundableBookings = group.bookings.filter((b: any) => {
                                    const rawRefundStatus =
                                        b.refundStatus ||
                                        (b.paymentStatus === 'refunded' ? 'refunded' : 'none');

                                    const canRefundStatus =
                                        rawRefundStatus === 'none' ||
                                        rawRefundStatus === 'rejected';

                                    const isPaidOrPartial =
                                        b.paymentStatus === 'paid' || b.paymentStatus === 'partial';

                                    const allowStatus = b.status === 'cancelled';

                                    return allowStatus && isPaidOrPartial && canRefundStatus;
                                });

                                const canRequestRefundGroup =
                                    refundableBookings.length > 0 &&
                                    refundableBookings.length === group.bookings.length;

                                const canCancelGroup = group.bookings.every((b: any) => {
                                    const isPending = b.status === 'pending';
                                    const isPaidOrPartial =
                                        b.paymentStatus === 'paid' || b.paymentStatus === 'partial';

                                    return isPending && isPaidOrPartial;
                                });

                                const canPayAgainGroup = group.bookings.some(
                                    (b: any) =>
                                        b.status === 'pending' &&
                                        b.paymentMethod === 'vnpay' &&
                                        (b.paymentStatus === 'unpaid' ||
                                            b.paymentStatus === 'partial')
                                );

                                return (
                                    <div
                                        key={group._id}
                                        className='py-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4'
                                    >
                                        {/* LEFT */}
                                        <div className='flex-1 flex gap-4'>
                                            {imageUrl && (
                                                <img
                                                    src={imageUrl}
                                                    alt={first.courtId?.name || 'Sân bóng'}
                                                    className='w-24 h-24 md:w-28 md:h-28 rounded-xl object-cover border border-gray-200'
                                                />
                                            )}

                                            <div className='flex-1'>
                                                <div className='text-sm text-gray-500 mb-1'>
                                                    Mã đơn:{' '}
                                                    <span className='font-semibold'>
                                                        {first.code}
                                                    </span>
                                                    {slotCount > 1 && (
                                                        <span className='ml-1 text-xs text-gray-400'>
                                                            • {slotCount} ca
                                                        </span>
                                                    )}
                                                </div>
                                                <h2 className='text-lg font-semibold text-gray-900'>
                                                    {first.courtId?.name || 'Sân bóng'}
                                                </h2>
                                                <p className='text-sm text-gray-600 mt-1'>
                                                    {format(new Date(first.date), 'dd/MM/yyyy', {
                                                        locale: vi,
                                                    })}
                                                </p>

                                                {/* DANH SÁCH TỪNG CA TRONG ĐƠN */}
                                                <div className='mt-3 space-y-3'>
                                                    {group.bookings.map(
                                                        (booking: any, idx: number) => {
                                                            const refundStatus =
                                                                booking.refundStatus ||
                                                                (booking.paymentStatus ===
                                                                'refunded'
                                                                    ? 'refunded'
                                                                    : 'none');

                                                            const refundBillImage =
                                                                booking.refundBillImage ||
                                                                booking.refund?.billImage ||
                                                                booking.refund?.bill?.image;

                                                            const refundAdminReason =
                                                                booking.refundAdminReason ||
                                                                booking.refund?.adminReason ||
                                                                booking.refund?.reason ||
                                                                '';

                                                            const bookingTotal = Number(
                                                                booking.total || 0
                                                            );
                                                            const refundAmount = Number(
                                                                booking.refundAmount ??
                                                                    booking.refund?.amount ??
                                                                    bookingTotal
                                                            );
                                                            const isCustomerPaid =
                                                                booking.status !== 'cancelled' &&
                                                                (booking.paymentStatus === 'paid' ||
                                                                    booking.paymentStatus ===
                                                                        'refunded' ||
                                                                    booking.paymentStatus ===
                                                                        'partial');

                                                            const isRefunded =
                                                                refundStatus === 'refunded';

                                                            return (
                                                                <div
                                                                    key={booking._id}
                                                                    className='border border-gray-100 rounded-lg p-3 bg-gray-50'
                                                                >
                                                                    <div className='flex flex-wrap justify-between gap-2'>
                                                                        <div className='space-y-2'>
                                                                            {/* HIỂN THỊ TỪNG CA THEO booking.slots */}
                                                                            {Array.isArray(
                                                                                booking.slots
                                                                            ) &&
                                                                            booking.slots.length >
                                                                                0 ? (
                                                                                [...booking.slots]
                                                                                    .sort(
                                                                                        (
                                                                                            a: any,
                                                                                            b: any
                                                                                        ) =>
                                                                                            timeToMin(
                                                                                                a.startTime
                                                                                            ) -
                                                                                            timeToMin(
                                                                                                b.startTime
                                                                                            )
                                                                                    )
                                                                                    .map(
                                                                                        (
                                                                                            slot: any,
                                                                                            slotIdx: number
                                                                                        ) => (
                                                                                            <p
                                                                                                key={
                                                                                                    slotIdx
                                                                                                }
                                                                                                className='text-sm font-medium text-gray-900'
                                                                                            >
                                                                                                Ca{' '}
                                                                                                {slotIdx +
                                                                                                    1}
                                                                                                :{' '}
                                                                                                {
                                                                                                    slot.startTime
                                                                                                }{' '}
                                                                                                -{' '}
                                                                                                {
                                                                                                    slot.endTime
                                                                                                }
                                                                                            </p>
                                                                                        )
                                                                                    )
                                                                            ) : (
                                                                                <p className='text-sm font-medium text-gray-900'>
                                                                                    Ca {idx + 1}:{' '}
                                                                                    {
                                                                                        booking.startTime
                                                                                    }{' '}
                                                                                    -{' '}
                                                                                    {
                                                                                        booking.endTime
                                                                                    }
                                                                                </p>
                                                                            )}

                                                                            {/* TRẠNG THÁI ĐƠN */}
                                                                            <div className='flex flex-wrap items-center gap-2 text-xs md:text-sm'>
                                                                                <span className='text-gray-500'>
                                                                                    Trạng thái đơn:
                                                                                </span>
                                                                                <Tag
                                                                                    color={
                                                                                        STATUS_COLORS[
                                                                                            booking
                                                                                                .status
                                                                                        ] ||
                                                                                        'default'
                                                                                    }
                                                                                    className='rounded-full px-3 py-1'
                                                                                >
                                                                                    {
                                                                                        STATUS_LABELS[
                                                                                            booking
                                                                                                .status
                                                                                        ]
                                                                                    }
                                                                                </Tag>
                                                                            </div>

                                                                            {/* TRẠNG THÁI THANH TOÁN */}
                                                                            <div className='flex flex-wrap items-center gap-2 text-xs md:text-sm'>
                                                                                <span className='text-gray-500'>
                                                                                    Thanh toán:
                                                                                </span>
                                                                                {(() => {
                                                                                    const s =
                                                                                        booking.paymentStatus;
                                                                                    const deposit =
                                                                                        Number(
                                                                                            booking.depositAmount ||
                                                                                                0
                                                                                        );
                                                                                    const fieldAmount =
                                                                                        Number(
                                                                                            booking.fieldAmount ||
                                                                                                0
                                                                                        );
                                                                                    const hasDepositPaid =
                                                                                        booking.depositStatus ===
                                                                                            'paid' &&
                                                                                        deposit > 0;

                                                                                    let color: string =
                                                                                        PAYMENT_COLORS[
                                                                                            s
                                                                                        ] ||
                                                                                        'default';
                                                                                    let label: string =
                                                                                        PAYMENT_LABELS[
                                                                                            s
                                                                                        ] ||
                                                                                        'Không rõ';

                                                                                    if (
                                                                                        hasDepositPaid &&
                                                                                        s !== 'paid'
                                                                                    ) {
                                                                                        if (
                                                                                            fieldAmount >
                                                                                                0 &&
                                                                                            deposit >=
                                                                                                fieldAmount
                                                                                        ) {
                                                                                            color =
                                                                                                'green';
                                                                                            label =
                                                                                                'Đã thanh toán tiền sân';
                                                                                        } else if (
                                                                                            fieldAmount >
                                                                                            0
                                                                                        ) {
                                                                                            const percent =
                                                                                                Math.round(
                                                                                                    (deposit /
                                                                                                        fieldAmount) *
                                                                                                        100
                                                                                                );
                                                                                            color =
                                                                                                'orange';
                                                                                            label = `Đã đặt cọc ${percent}% tiền sân`;
                                                                                        }
                                                                                    }

                                                                                    return (
                                                                                        <Tag
                                                                                            color={
                                                                                                color
                                                                                            }
                                                                                            className='rounded-full px-3 py-1'
                                                                                        >
                                                                                            {label}
                                                                                        </Tag>
                                                                                    );
                                                                                })()}
                                                                            </div>

                                                                            {/* LÝ DO HỦY (NẾU CÓ) */}
                                                                            {booking.status ===
                                                                                'cancelled' &&
                                                                                booking.cancelReason && (
                                                                                    <p className='text-xs text-red-500'>
                                                                                        Lý do hủy:{' '}
                                                                                        <span className='font-medium'>
                                                                                            {
                                                                                                booking.cancelReason
                                                                                            }
                                                                                        </span>
                                                                                    </p>
                                                                                )}

                                                                            {/* HOÀN TIỀN (NẾU CÓ) */}
                                                                            {refundStatus !==
                                                                                'none' && (
                                                                                <div className='flex flex-col gap-1 mt-1'>
                                                                                    <div className='flex flex-wrap items-center gap-2'>
                                                                                        <span className='text-gray-500 text-xs'>
                                                                                            Hoàn
                                                                                            tiền:
                                                                                        </span>
                                                                                        <Tag
                                                                                            color={
                                                                                                REFUND_STATUS_COLORS[
                                                                                                    refundStatus
                                                                                                ] ||
                                                                                                'default'
                                                                                            }
                                                                                            className='rounded-full px-3 py-1 text-xs'
                                                                                        >
                                                                                            {
                                                                                                REFUND_STATUS_LABELS[
                                                                                                    refundStatus
                                                                                                ]
                                                                                            }
                                                                                        </Tag>
                                                                                    </div>

                                                                                    {refundBillImage && (
                                                                                        <div className='mt-2 space-y-1'>
                                                                                            <span className='text-xs text-gray-500'>
                                                                                                Ảnh
                                                                                                bill
                                                                                                chuyển
                                                                                                khoản:
                                                                                            </span>
                                                                                            <a
                                                                                                href={
                                                                                                    refundBillImage
                                                                                                }
                                                                                                target='_blank'
                                                                                                rel='noreferrer'
                                                                                                className='text-xs text-emerald-600 underline hover:text-emerald-700'
                                                                                            >
                                                                                                Mở
                                                                                                ảnh
                                                                                                bill
                                                                                                trong
                                                                                                tab
                                                                                                mới
                                                                                            </a>
                                                                                            <div className='mt-1'>
                                                                                                <Image
                                                                                                    src={
                                                                                                        refundBillImage
                                                                                                    }
                                                                                                    alt='Bill hoàn tiền'
                                                                                                    className='max-h-64 rounded-md border cursor-pointer'
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    )}

                                                                                    {refundStatus ===
                                                                                        'rejected' &&
                                                                                        refundAdminReason && (
                                                                                            <p className='mt-1 text-xs text-red-500'>
                                                                                                Lý
                                                                                                do
                                                                                                admin
                                                                                                từ
                                                                                                chối
                                                                                                hoàn
                                                                                                tiền:{' '}
                                                                                                <span className='font-medium'>
                                                                                                    {
                                                                                                        refundAdminReason
                                                                                                    }
                                                                                                </span>
                                                                                            </p>
                                                                                        )}
                                                                                </div>
                                                                            )}

                                                                            {isCustomerPaid &&
                                                                                bookingTotal >
                                                                                    0 && (
                                                                                    <p className='mt-1 text-xs text-green-700 font-semibold'>
                                                                                        Khách đã
                                                                                        trả:{' '}
                                                                                        {bookingTotal.toLocaleString(
                                                                                            'vi-VN'
                                                                                        )}{' '}
                                                                                        ₫
                                                                                    </p>
                                                                                )}

                                                                            {isRefunded &&
                                                                                refundAmount >
                                                                                    0 && (
                                                                                    <p className='mt-1 text-xs text-emerald-600 font-semibold'>
                                                                                        Đã hoàn trả:{' '}
                                                                                        {refundAmount.toLocaleString(
                                                                                            'vi-VN'
                                                                                        )}{' '}
                                                                                        ₫
                                                                                    </p>
                                                                                )}
                                                                        </div>

                                                                        {/* ACTION cho từng ca – CHỈ ĐỂ XEM HÓA ĐƠN, không cho thanh toán lại riêng lẻ */}
                                                                        <div className='text-right space-y-2 min-w-[140px]'>
                                                                            {booking.status ===
                                                                                'completed' &&
                                                                                (booking.paymentStatus ===
                                                                                    'paid' ||
                                                                                    booking.paymentStatus ===
                                                                                        'refunded') && (
                                                                                    <button
                                                                                        className='inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-medium text-emerald-600 border-emerald-500 hover:bg-emerald-50'
                                                                                        onClick={() =>
                                                                                            handleViewInvoice(
                                                                                                booking._id
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        📄 Xem hóa
                                                                                        đơn
                                                                                    </button>
                                                                                )}

                                                                            {booking.status ===
                                                                                'cancelled' &&
                                                                                [
                                                                                    'pending',
                                                                                    'processing',
                                                                                ].includes(
                                                                                    refundStatus
                                                                                ) && (
                                                                                    <p className='text-xs text-blue-500 italic'>
                                                                                        Đã gửi yêu
                                                                                        cầu hoàn
                                                                                        tiền, vui
                                                                                        lòng chờ
                                                                                        admin xử lý.
                                                                                    </p>
                                                                                )}
                                                                            {booking.status ===
                                                                                'cancelled' &&
                                                                                refundStatus ===
                                                                                    'refunded' && (
                                                                                    <p className='text-xs text-green-600 font-semibold'>
                                                                                        Đã hoàn tiền
                                                                                        cho bạn.
                                                                                    </p>
                                                                                )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* RIGHT – tổng tiền + action cấp đơn */}
                                        <div className='text-right min-w-[220px] space-y-2'>
                                            <p className='text-sm text-gray-600'>Tổng tiền đơn:</p>
                                            <p className='text-lg font-semibold text-gray-900'>
                                                {groupTotal.toLocaleString('vi-VN')} ₫
                                            </p>

                                            {canPayAgainGroup && (
                                                <Button
                                                    type='primary'
                                                    size='middle'
                                                    className='mt-2 w-full md:w-auto'
                                                    loading={
                                                        !!payingBookingId &&
                                                        group.bookings.some(
                                                            (b: any) => b._id === payingBookingId
                                                        )
                                                    }
                                                    onClick={() => handlePayAgainGroup(group)}
                                                >
                                                    {payingBookingId &&
                                                    group.bookings.some(
                                                        (b: any) => b._id === payingBookingId
                                                    )
                                                        ? 'Đang chuyển tới VNPay...'
                                                        : 'Thanh toán lại'}
                                                </Button>
                                            )}

                                            {canCancelGroup && (
                                                <Button
                                                    danger
                                                    type='primary'
                                                    size='middle'
                                                    className='mt-2 w-full md:w-auto'
                                                    onClick={() =>
                                                        openCancelModal(
                                                            group.bookings.map((b: any) => b._id)
                                                        )
                                                    }
                                                >
                                                    Hủy đặt sân
                                                </Button>
                                            )}

                                            {canRequestRefundGroup && (
                                                <Button
                                                    size='middle'
                                                    className='mt-2 border-amber-500 text-amber-600 hover:bg-amber-50 w-full md:w-auto'
                                                    onClick={() => openRefundModal(group.bookings)}
                                                >
                                                    Yêu cầu hoàn tiền
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL HỦY ĐƠN */}
            <Modal
                centered
                open={isCancelModalOpen}
                onCancel={closeCancelModal}
                onOk={handleConfirmCancel}
                okText='Xác nhận'
                cancelText='Đóng'
                title='Xác nhận hủy đơn đặt sân'
            >
                <p className='mb-2'>Vui lòng nhập lý do hủy đơn đặt sân này:</p>

                <div className='mb-8'>
                    <Input.TextArea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder='Ví dụ: Đổi kế hoạch, đặt nhầm giờ...'
                        showCount
                        maxLength={500}
                        rows={4}
                    />
                </div>
            </Modal>

            {/* MODAL YÊU CẦU HOÀN TIỀN */}
            <Modal
                centered
                title='Yêu cầu hoàn tiền'
                open={isRefundModalOpen}
                onOk={handleSubmitRefund}
                onCancel={closeRefundModal}
                okText='Gửi yêu cầu'
                cancelText='Đóng'
                destroyOnClose
            >
                <p className='mb-3 text-sm text-gray-600'>
                    Vui lòng nhập thông tin tài khoản ngân hàng để nhận tiền hoàn:
                </p>
                <div className='space-y-3'>
                    <div>
                        <span className='block text-sm mb-1'>Số tài khoản *</span>
                        <Input
                            value={refundForm.accountNumber}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                setRefundForm((prev) => ({ ...prev, accountNumber: value }));
                            }}
                            placeholder='VD: 0123456789'
                        />
                    </div>
                    <div>
                        <span className='block text-sm mb-1'>Tên chủ tài khoản *</span>
                        <Input
                            value={refundForm.accountName}
                            onChange={(e) => {
                                const value = e.target.value.replace(/[0-9]/g, '');
                                setRefundForm((prev) => ({ ...prev, accountName: value }));
                            }}
                            placeholder='VD: NGUYEN VAN A'
                        />
                    </div>
                    <div>
                        <span className='block text-sm mb-1'>Ngân hàng *</span>
                        <Input
                            value={refundForm.bankName}
                            onChange={(e) => {
                                const value = e.target.value
                                    .replace(/[^A-Za-zÀ-ỹà-ỹ\s]/g, '')
                                    .toUpperCase();
                                setRefundForm((prev) => ({ ...prev, bankName: value }));
                            }}
                            placeholder='VD: MB BANK, TPBANK'
                        />
                    </div>
                    <div className='mb-6'>
                        <span className='block text-sm mb-1'>Ghi chú thêm (không bắt buộc)</span>
                        <Input.TextArea
                            rows={3}
                            maxLength={300}
                            showCount
                            value={refundForm.note}
                            onChange={(e) =>
                                setRefundForm((prev) => ({ ...prev, note: e.target.value }))
                            }
                            placeholder='VD: Chuyển giúp em trong giờ hành chính...'
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MyBookings;
