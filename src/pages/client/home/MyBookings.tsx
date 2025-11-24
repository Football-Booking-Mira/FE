import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button, Tag, Spin, Empty, Modal, Input } from 'antd';
import { ToastContainer, toast } from 'react-toastify';
import api from '@/common/utils/api';
import 'react-toastify/dist/ReactToastify.css';
import dayjs from 'dayjs';
import { printInvoiceMira } from '@/common/utils/printInvoice';

dayjs.locale('vi');

const STATUS_LABELS: Record<string, string> = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    in_use: 'Đang sử dụng',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
};
const handleViewInvoice = async (bookingId: string) => {
    try {
        const res = await api.get(`/invoices/by-booking/${bookingId}`);
        // BE nên trả { success, invoice, items }
        const detail = res.data;
        if (!detail?.invoice) {
            toast.error('Không tìm thấy hóa đơn cho đơn này!');
            return;
        }
        // bật popup in giống admin
        printInvoiceMira(detail);
    } catch (err: any) {
        const msg = err?.response?.data?.message || 'Không thể tải hóa đơn, vui lòng thử lại!';
        toast.error(msg);
    }
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

const MyBookings: React.FC = () => {
    const [bookings, setBookings] = useState<any[]>([]);
    const [filtered, setFiltered] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>('all');
    const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
    const socketRef = useRef<Socket | null>(null);

    // tránh toast 2 lần vì 2 event socket
    const lastSocketUpdateRef = useRef<number>(0);

    //  STATE POPUP HỦY ĐƠN
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

    //  STATE POPUP HOÀN TIỀN
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [refundBookingId, setRefundBookingId] = useState<string | null>(null);
    const [refundForm, setRefundForm] = useState({
        accountNumber: '',
        accountName: '',
        bankName: '',
        note: '',
    });

    //  FILTER THEO TAB
    const applyFilter = (tabKey: string, source: any[] = bookings) => {
        let result = source;

        switch (tabKey) {
            case 'waiting_payment':
                result = source.filter(
                    (b) => b.paymentStatus === 'unpaid' || b.paymentStatus === 'partial'
                );
                break;
            case 'pending':
            case 'confirmed':
            case 'in_use':
            case 'completed':
            case 'cancelled':
                result = source.filter((b) => b.status === tabKey);
                break;
            case 'refunded':
                // 🔧 Lọc theo trạng thái hoàn tiền
                result = source.filter((b) => (b.refundStatus || 'none') === 'refunded');
                break;
            case 'all':
            default:
                result = source;
        }

        setFiltered(result);
    };

    const fetchBookings = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            const userId = user?._id;
            if (!userId) return;

            const res = await api.get(`/bookings/user/${userId}`);
            const data = res.data;

            if (data?.success) {
                const sorted = [...data.data].sort((a: any, b: any) => {
                    const at = new Date(a.createdAt || a.date).getTime();
                    const bt = new Date(b.createdAt || b.date).getTime();
                    return bt - at;
                });

                setBookings(sorted);

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
                    // 🔧 Tab "Hoàn tiền" đếm theo refundStatus
                    refunded: sorted.filter((b) => (b.refundStatus || 'none') === 'refunded')
                        .length,
                };
                setTabCounts(counts);

                // QUAN TRỌNG: luôn filter lại theo tab hiện tại
                applyFilter(activeTab, sorted);
            } else {
                toast.error(data?.message || 'Không lấy được danh sách đặt sân');
            }
        } catch {
            toast.error('Lỗi tải danh sách đặt sân');
        } finally {
            setLoading(false);
        }
    };

    //  SOCKET
    useEffect(() => {
        fetchBookings();

        const socket = io('http://localhost:3000', {
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });
        socketRef.current = socket;

        const handleBookingUpdated = () => {
            fetchBookings();

            const now = Date.now();
            if (now - lastSocketUpdateRef.current < 400) {
                lastSocketUpdateRef.current = now;
                return;
            }
            lastSocketUpdateRef.current = now;

            toast.info('Lịch đặt sân của bạn vừa được cập nhật', {
                autoClose: 1500,
                style: { backgroundColor: '#22c55e', color: '#fff' },
            });
        };

        socket.on('connect', () => {
            // console.log('MyBookings socket connected: ', socket.id);
        });

        socket.on('connect_error', (err) => {
            // console.error('MyBookings socket connect_error: ', err.message);
        });

        socket.on('booking_updated', handleBookingUpdated);
        socket.on('booking_global_updated', handleBookingUpdated);

        return () => {
            socket.off('booking_updated', handleBookingUpdated);
            socket.off('booking_global_updated', handleBookingUpdated);
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    // join room theo court để nhận event realtime theo sân
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

    //  POPUP HỦY ĐƠN
    const openCancelModal = (bookingId: string) => {
        setSelectedBookingId(bookingId);
        setCancelReason('');
        setIsCancelModalOpen(true);
    };

    const closeCancelModal = () => {
        setIsCancelModalOpen(false);
        setCancelReason('');
        setSelectedBookingId(null);
    };

    const handleConfirmCancel = async () => {
        if (!selectedBookingId) return;

        if (!cancelReason.trim()) {
            toast.error('Vui lòng nhập lý do hủy đơn!');
            return;
        }

        try {
            await api.patch(`/bookings/${selectedBookingId}/cancel`, {
                reason: cancelReason.trim(),
            });

            toast.success('Hủy đặt sân thành công!', {
                autoClose: 1500,
                style: { backgroundColor: '#dc2626', color: '#fff' },
            });

            closeCancelModal();
            fetchBookings();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Không thể hủy đặt sân!');
        }
    };

    // POPUP HOÀN TIỀN
    const openRefundModal = (booking: any) => {
        setRefundBookingId(booking._id);
        setRefundForm({
            accountNumber: booking.refundAccountNumber || '',
            accountName: booking.refundAccountName || '',
            bankName: booking.refundBankName || '',
            note: booking.refundNote || '',
        });
        setIsRefundModalOpen(true);
    };

    const closeRefundModal = () => {
        setIsRefundModalOpen(false);
        setRefundBookingId(null);
        setRefundForm({
            accountNumber: '',
            accountName: '',
            bankName: '',
            note: '',
        });
    };

    const handleSubmitRefund = async () => {
        if (!refundBookingId) return;

        if (
            !refundForm.accountNumber.trim() ||
            !refundForm.accountName.trim() ||
            !refundForm.bankName.trim()
        ) {
            toast.error('Vui lòng nhập đầy đủ thông tin tài khoản nhận hoàn tiền!');
            return;
        }

        try {
            await api.post(`/bookings/${refundBookingId}/refund-request`, {
                accountNumber: refundForm.accountNumber.trim(),
                accountName: refundForm.accountName.trim(),
                bankName: refundForm.bankName.trim(),
                note: refundForm.note.trim(),
            });

            toast.success('Đã gửi yêu cầu hoàn tiền, vui lòng chờ admin xử lý!', {
                autoClose: 2000,
                style: { backgroundColor: '#15803d', color: '#fff' },
            });

            closeRefundModal();
            fetchBookings();
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || err.message || 'Không thể gửi yêu cầu hoàn tiền!'
            );
        }
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
                    {filtered.length === 0 ? (
                        <div className='py-16 flex justify-center'>
                            <Empty description='Không có đơn đặt sân nào' />
                        </div>
                    ) : (
                        <div className='divide-y divide-gray-100'>
                            {filtered.map((booking) => {
                                const imageUrl =
                                    booking.courtId?.images?.[0] || booking.courtId?.image || '';

                                const refundStatus =
                                    booking.refundStatus ||
                                    (booking.paymentStatus === 'refunded' ? 'refunded' : 'none');

                                // ✅ Chỉ cho phép YÊU CẦU HOÀN TIỀN khi:
                                // - Đơn đã hủy
                                // - Đã thanh toán / đã cọc (paid | partial)
                                // - Chưa gửi yêu cầu hoàn (refundStatus === 'none')
                                const canRequestRefund =
                                    booking.status === 'cancelled' &&
                                    (booking.paymentStatus === 'paid' ||
                                        booking.paymentStatus === 'partial') &&
                                    refundStatus === 'none';

                                return (
                                    <div
                                        key={booking._id}
                                        className='py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4'
                                    >
                                        {/* LEFT */}
                                        <div className='flex-1 flex gap-4'>
                                            {imageUrl && (
                                                <img
                                                    src={imageUrl}
                                                    alt={booking.courtId?.name || 'Sân bóng'}
                                                    className='w-24 h-24 md:w-28 md:h-28 rounded-xl object-cover border border-gray-200'
                                                />
                                            )}

                                            <div className='flex-1'>
                                                <div className='text-sm text-gray-500 mb-1'>
                                                    Mã đơn:{' '}
                                                    <span className='font-semibold'>
                                                        {booking.code}
                                                    </span>
                                                </div>
                                                <h2 className='text-lg font-semibold text-gray-900'>
                                                    {booking.courtId?.name || 'Sân bóng'}
                                                </h2>
                                                <p className='text-sm text-gray-600 mt-1'>
                                                    {format(new Date(booking.date), 'dd/MM/yyyy', {
                                                        locale: vi,
                                                    })}{' '}
                                                    • {booking.startTime} - {booking.endTime}
                                                </p>

                                                <div className='flex flex-col gap-2 mt-3 text-sm'>
                                                    {/* TRẠNG THÁI ĐƠN */}
                                                    <div className='flex flex-wrap items-center gap-2'>
                                                        <span className='text-gray-500'>
                                                            Trạng thái đơn:
                                                        </span>
                                                        <Tag
                                                            color={
                                                                STATUS_COLORS[booking.status] ||
                                                                'default'
                                                            }
                                                            className='rounded-full px-3 py-1 text-xs md:text-sm'
                                                        >
                                                            {STATUS_LABELS[booking.status] ||
                                                                booking.status}
                                                        </Tag>
                                                    </div>

                                                    {/* TRẠNG THÁI THANH TOÁN */}
                                                    <div className='flex flex-wrap items-center gap-2'>
                                                        <span className='text-gray-500'>
                                                            Thanh toán:
                                                        </span>
                                                        <Tag
                                                            color={
                                                                PAYMENT_COLORS[
                                                                    booking.paymentStatus
                                                                ] || 'default'
                                                            }
                                                            className='rounded-full px-3 py-1 text-xs md:text-sm'
                                                        >
                                                            {PAYMENT_LABELS[
                                                                booking.paymentStatus
                                                            ] || 'Không rõ'}
                                                        </Tag>
                                                    </div>

                                                    {/* LÝ DO HỦY (NẾU CÓ) */}
                                                    {booking.status === 'cancelled' &&
                                                        booking.cancelReason && (
                                                            <p className='text-xs text-red-500'>
                                                                Lý do hủy:{' '}
                                                                <span className='font-medium'>
                                                                    {booking.cancelReason}
                                                                </span>
                                                            </p>
                                                        )}

                                                    {/* TRẠNG THÁI HOÀN TIỀN */}
                                                    {refundStatus !== 'none' && (
                                                        <div className='flex flex-wrap items-center gap-2'>
                                                            <span className='text-gray-500'>
                                                                Hoàn tiền:
                                                            </span>
                                                            <Tag
                                                                color={
                                                                    REFUND_STATUS_COLORS[
                                                                        refundStatus
                                                                    ] || 'default'
                                                                }
                                                                className='rounded-full px-3 py-1 text-xs md:text-sm'
                                                            >
                                                                {REFUND_STATUS_LABELS[
                                                                    refundStatus
                                                                ] || 'Hoàn tiền'}
                                                            </Tag>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {/* RIGHT */}
                                        <div className='text-right min-w-[200px]'>
                                            <p className='text-green-700 font-extrabold text-xl'>
                                                {booking.total.toLocaleString('vi-VN')} ₫
                                            </p>

                                            {/* ✅ NÚT XEM HÓA ĐƠN CHO USER
        - Chỉ hiện khi đơn đã hoàn thành
        - Và đã thanh toán hoặc đã hoàn tiền
    */}
                                            {booking.status === 'completed' &&
                                                (booking.paymentStatus === 'paid' ||
                                                    booking.paymentStatus === 'refunded') && (
                                                    <button
                                                        className='mt-3 inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-medium text-emerald-600 border-emerald-500 hover:bg-emerald-50'
                                                        onClick={() =>
                                                            handleViewInvoice(booking._id)
                                                        }
                                                    >
                                                        📄 Xem hóa đơn
                                                    </button>
                                                )}

                                            {booking.status === 'pending' && (
                                                <Button
                                                    danger
                                                    type='primary'
                                                    size='middle'
                                                    className='mt-3'
                                                    onClick={() => openCancelModal(booking._id)}
                                                >
                                                    Hủy đặt sân
                                                </Button>
                                            )}

                                            {canRequestRefund && (
                                                <Button
                                                    type='default'
                                                    size='middle'
                                                    className='mt-3'
                                                    onClick={() => openRefundModal(booking)}
                                                >
                                                    Yêu cầu hoàn tiền
                                                </Button>
                                            )}

                                            {booking.status === 'cancelled' &&
                                                ['pending', 'processing'].includes(
                                                    refundStatus
                                                ) && (
                                                    <p className='mt-2 text-xs text-blue-500 italic'>
                                                        Đã gửi yêu cầu hoàn tiền, vui lòng chờ admin
                                                        xử lý.
                                                    </p>
                                                )}

                                            {booking.status === 'cancelled' &&
                                                refundStatus === 'refunded' && (
                                                    <p className='mt-2 text-xs text-green-600 font-semibold'>
                                                        Đã hoàn tiền cho bạn.
                                                    </p>
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
                                // Chỉ giữ lại số
                                const value = e.target.value.replace(/\D/g, '');
                                setRefundForm((prev) => ({
                                    ...prev,
                                    accountNumber: value,
                                }));
                            }}
                            placeholder='VD: 0123456789'
                        />
                    </div>
                    <div>
                        <span className='block text-sm mb-1'>Tên chủ tài khoản *</span>
                        <Input
                            value={refundForm.accountName}
                            onChange={(e) => {
                                // Không cho nhập số, chỉ chữ + khoảng trắng
                                const value = e.target.value.replace(/[0-9]/g, '');
                                setRefundForm((prev) => ({
                                    ...prev,
                                    accountName: value,
                                }));
                            }}
                            placeholder='VD: NGUYEN VAN A'
                        />
                    </div>
                    <div>
                        <span className='block text-sm mb-1'>Ngân hàng *</span>
                        <Input
                            value={refundForm.bankName}
                            onChange={(e) => {
                                // CHỈ CHẶN KÝ TỰ ĐẶC BIỆT, VẪN CHO CHỮ + SỐ + KHOẢNG TRẮNG
                                const value = e.target.value
                                    .replace(/[^A-Za-zÀ-ỹà-ỹ\s]/g, '')
                                    .toUpperCase();
                                setRefundForm((prev) => ({
                                    ...prev,
                                    bankName: value,
                                }));
                            }}
                            placeholder='VD: MB BANK, TPBANK '
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
