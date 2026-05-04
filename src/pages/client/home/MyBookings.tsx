import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button, Tag, Spin, Empty, Modal, Input, Image, Checkbox, Rate, Form } from 'antd';
import { ToastContainer, toast } from 'react-toastify';
import api from '@/common/utils/api';
import 'react-toastify/dist/ReactToastify.css';
import dayjs from 'dayjs';
import { printInvoiceMira } from '@/common/utils/printInvoice';
import { useNavigate } from 'react-router';
import { ExclamationCircleFilled } from '@ant-design/icons';
import { Layers } from 'lucide-react';

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
    partial: 'Đã thanh toán', //  ép label
    paid: 'Đã thanh toán',
    refunded: 'Hoàn tiền xong',
};

const PAYMENT_COLORS: Record<string, string> = {
    unpaid: 'red',
    partial: 'green', // ép màu xanh giống paid
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

const QUICK_CANCEL_REASONS = [
    'Đổi kế hoạch',
    'Đặt nhầm giờ',
    'Không đủ người',
    'Thời tiết xấu',
    'Tìm được sân khác',
    'Sự cố cá nhân',
];

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

// đổi "HH:mm" -> phút
const timeToMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};
// HELP BUILD LÝ DO
const buildCancelReason = (tags: string[], note: string) => {
    const parts = [...tags];
    const clean = (note || '').trim();
    if (clean) parts.push(clean);
    return parts.join(' | ');
};

// lấy mảng thiết bị từ mọi kiểu response
const extractEquipmentItems = (raw: any): any[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.equipments)) return raw.equipments;
    if (Array.isArray(raw.bookingEquipments)) return raw.bookingEquipments;
    if (Array.isArray(raw.data)) return raw.data;
    return [];
};

const getItemPaidFlag = (it: any): boolean | undefined => {
    if (typeof it.isPaid === 'boolean') return it.isPaid;
    if (typeof it.paid === 'boolean') return it.paid;
    if (typeof it.paymentStatus === 'string') return it.paymentStatus === 'paid';
    if (typeof it.payStatus === 'string') return it.payStatus === 'paid';
    return undefined;
};

const isExtraAfterPaid = (it: any): boolean => {
    return (
        it.addedFrom === 'checkin' ||
        it.fromCheckin === true ||
        it.isExtra === true ||
        it.addedByRole === 'admin' ||
        it.addedBy === 'admin'
    );
};

// defaultPaymentStatus dùng để suy ra “các item không có flag”
// - paid/refunded: mặc định thiết bị đã trả (vì đi cùng VNPay)
// - partial/unpaid: mặc định thiết bị chưa trả (cọc tính cho sân)
const mergeEquipments = (items: any[] = [], defaultPaymentStatus: string = 'unpaid') => {
    const map: Record<string, any> = {};

    items.forEach((it) => {
        const eq = it.equipmentId || {};
        const name = eq.name || it.name || 'Thiết bị';
        const unit = eq.unit || it.unit || '';
        const mode: 'rent' | 'sell' = it.mode === 'sell' ? 'sell' : 'rent';
        const price = Number(it.price || (mode === 'rent' ? eq.rentPrice : eq.salePrice) || 0);
        const qty = Number(it.qty || 0);
        if (qty <= 0) return;

        const subtotal = price * qty;

        // quyết định paidFlag
        let paidFlag = getItemPaidFlag(it);

        if (paidFlag === undefined) {
            if (isExtraAfterPaid(it))
                paidFlag = false; // thêm lúc checkin => chưa trả
            else paidFlag = defaultPaymentStatus === 'paid' || defaultPaymentStatus === 'refunded';
        }

        const key = `${name}_${mode}_${price}_${unit}`;
        if (!map[key]) {
            map[key] = {
                name,
                mode,
                unit,
                price,
                qty,
                subtotal,
                paidSubtotal: 0,
                unpaidSubtotal: 0,
            };
        } else {
            map[key].qty += qty;
            map[key].subtotal += subtotal;
        }

        if (paidFlag) map[key].paidSubtotal += subtotal;
        else map[key].unpaidSubtotal += subtotal;
    });

    return Object.values(map);
};

// eligible để “Thanh toán lại”
const canRetryPay = (b: any) =>
    b.status === 'pending' &&
    ['vnpay', 'zalopay'].includes(b.paymentMethod) &&
    (b.paymentStatus === 'unpaid' || b.paymentStatus === 'partial');

// tính tiền cần trả cho từng ca (unpaid: full total, partial: total - deposit)
const calcNeedPay = (b: any) => {
    const total = Number(b.total ?? 0);
    const depositPaid = b.depositStatus === 'paid' ? Number(b.depositAmount ?? 0) : 0;

    const fallbackTotal =
        total > 0 ? total : Number(b.fieldAmount ?? 0) + Number(b.equipmentTotal ?? 0);

    if (b.paymentStatus === 'partial') return Math.max(0, fallbackTotal - depositPaid);
    if (b.paymentStatus === 'unpaid') return Math.max(0, fallbackTotal);
    return 0;
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
    const [cancelReasonTags, setCancelReasonTags] = useState<string[]>([]);
    const [cancelNote, setCancelNote] = useState('');

    // thêm state meta để show đẹp trong modal (ở trên component)
    const [cancelWarnMeta, setCancelWarnMeta] = useState({ totalCount: 0, discount: 0 });

    //  MODAL CẢNH BÁO VOUCHER (step 1)
    const [isCancelWarnOpen, setIsCancelWarnOpen] = useState(false);
    const [cancelAgree, setCancelAgree] = useState(false);
    const [pendingCancelIds, setPendingCancelIds] = useState<string[]>([]);

    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [refundBookingIds, setRefundBookingIds] = useState<string[]>([]);
    const [refundForm, setRefundForm] = useState({
        accountNumber: '',
        accountName: '',
        bankName: '',
        note: '',
    });

    const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
    const [printingInvoiceId, setPrintingInvoiceId] = useState<string | null>(null);

    // === ĐÁNH GIÁ SÂN ===
    const [reviewForm] = Form.useForm();
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [reviewingBooking, setReviewingBooking] = useState<any>(null);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [isViewOnlyReview, setIsViewOnlyReview] = useState(false);
    // map bookingId -> reviewData (để hiển thị sao đã đánh giá)
    const [reviewMap, setReviewMap] = useState<Record<string, any>>({});

    const fetchMyReviews = async () => {
        try {
            const res = await api.get('/review/my');
            const list: any[] = res.data?.data || [];
            const map: Record<string, any> = {};
            list.forEach((r: any) => {
                if (r.bookingId?._id) map[r.bookingId._id] = r;
                else if (r.bookingId) map[String(r.bookingId)] = r;
            });
            setReviewMap(map);
        } catch { /* bỏ qua */ }
    };

    const openReviewModal = (booking: any, viewOnly = false) => {
        setReviewingBooking(booking);
        setIsViewOnlyReview(viewOnly);
        if (viewOnly) {
            const existing = reviewMap[booking._id];
            reviewForm.setFieldsValue({
                rating: existing?.rating || 5,
                comment: existing?.comment || '',
            });
        } else {
            reviewForm.resetFields();
        }
        setReviewModalOpen(true);
    };

    const handleSubmitReview = async () => {
        try {
            const values = await reviewForm.validateFields();
            setSubmittingReview(true);
            const existingReview = reviewMap[reviewingBooking._id];
            
            if (existingReview?._id) {
                // UPDATE
                await api.put(`/review/${existingReview._id}`, {
                    rating: values.rating,
                    comment: values.comment,
                });
                toast.success('Cập nhật đánh giá thành công! ✨');
            } else {
                // CREATE NEW
                await api.post('/review', {
                    bookingId: reviewingBooking._id,
                    rating: values.rating,
                    comment: values.comment,
                });
                toast.success('Đánh giá sân thành công! Cảm ơn bạn ⭐');
            }
            setReviewModalOpen(false);
            reviewForm.resetFields();
            fetchMyReviews(); // cập nhật map
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Gửi đánh giá thất bại';
            toast.error(msg);
        } finally {
            setSubmittingReview(false);
        }
    };

    // Modal chọn Payment method khi Retry payment
    const [isRetryMethodModalOpen, setIsRetryMethodModalOpen] = useState(false);
    const [retryAmount, setRetryAmount] = useState(0);
    const [retryMethod, setRetryMethod] = useState<'vnpay' | 'zalopay'>('vnpay');
    const [retryBody, setRetryBody] = useState<any>(null);

    // --- QR THỦ CÔNG ---
    const [showQrModal, setShowQrModal] = useState(false);
    const [qrData, setQrData] = useState<{image: string, amount: number, accountNo?: string, accountName?: string, bankName?: string, addInfo?: string} | null>(null);

    // groupId -> list bookingId được chọn để thanh toán lại
    const [selectedPayByGroup, setSelectedPayByGroup] = useState<Record<string, string[]>>({});
    // groupId -> list bookingId được chọn để HOÀN TIỀN
    const [selectedRefundByGroup, setSelectedRefundByGroup] = useState<Record<string, string[]>>(
        {}
    );

    // groupId -> list bookingId được chọn để HỦY
    const [selectedCancelByGroup, setSelectedCancelByGroup] = useState<Record<string, string[]>>(
        {}
    );
    const toggleSelectRefund = (groupId: string, bookingId: string, checked: boolean) => {
        setSelectedRefundByGroup((prev) => {
            const cur = new Set(prev[groupId] || []);
            if (checked) cur.add(bookingId);
            else cur.delete(bookingId);
            return { ...prev, [groupId]: Array.from(cur) };
        });
    };


    const toggleSelectPay = (groupId: string, bookingId: string, checked: boolean) => {
        setSelectedPayByGroup((prev) => {
            const cur = new Set(prev[groupId] || []);
            if (checked) cur.add(bookingId);
            else cur.delete(bookingId);
            return { ...prev, [groupId]: Array.from(cur) };
        });
    };

    const toggleSelectAllPay = (groupId: string, eligibleIds: string[], checked: boolean) => {
        setSelectedPayByGroup((prev) => ({
            ...prev,
            [groupId]: checked ? eligibleIds : [],
        }));
    };

    const toggleSelectCancel = (groupId: string, bookingId: string, checked: boolean) => {
        setSelectedCancelByGroup((prev) => {
            const cur = new Set(prev[groupId] || []);
            if (checked) cur.add(bookingId);
            else cur.delete(bookingId);
            return { ...prev, [groupId]: Array.from(cur) };
        });
    };

    const toggleSelectAllCancel = (groupId: string, eligibleIds: string[], checked: boolean) => {
        setSelectedCancelByGroup((prev) => ({
            ...prev,
            [groupId]: checked ? eligibleIds : [],
        }));
    };

    // Thanh toán lại theo list ca đã chọn
    const handlePayAgainSelected = async (selectedBookings: any[]) => {
        try {
            if (!selectedBookings.length) return;

            setPayingBookingId(selectedBookings[0]._id);

            const bookingIds = selectedBookings.map((b) => b._id);
            const amountToPay = selectedBookings.reduce((sum, b) => sum + calcNeedPay(b), 0);

            if (!amountToPay || amountToPay <= 0) {
                toast.error('Không có số tiền cần thanh toán thêm cho các ca đã chọn!');
                setPayingBookingId(null);
                return;
            }

            setRetryAmount(amountToPay);
            setRetryBody({
                bookingIds,
                isRetryPayment: true,
                amount: amountToPay,
            });
            setIsRetryMethodModalOpen(true);
        } catch (err: any) {
            toast.error('Có lỗi xảy ra khi lấy thông tin thanh toán.');
            setPayingBookingId(null);
        }
    };

    const confirmRetryPayment = async () => {
        try {
            setIsRetryMethodModalOpen(false);
            
            if (retryMethod === 'zalopay') {
                try {
                    const ids = retryBody.bookingIds || [retryBody.bookingId];
                    const res = await api.post('/payment/zalopay/create', {
                        amount: retryBody.amount,
                        bookingIds: ids,
                    });
                    
                    if (res.data?.paymentUrl) {
                        toast.success('Đang chuyển tới trang thanh toán ZaloPay...');
                        window.location.href = res.data.paymentUrl;
                    } else {
                        toast.error('Không tạo được liên kết thanh toán ZaloPay!');
                    }
                } catch(err) {
                    toast.error('Lỗi khi tạo mã thanh toán!');
                }
                setPayingBookingId(null);
                return;
            }

            const endpoint = '/payment/vnpay/create';
            const payRes = await api.post(endpoint, retryBody);

            const paymentUrl =
                payRes.data?.paymentUrl || payRes.data?.data?.paymentUrl || payRes.data?.data?.url;

            if (!paymentUrl) {
                toast.error(`Không lấy được link thanh toán ${retryMethod.toUpperCase()}!`);
                setPayingBookingId(null);
                return;
            }

            toast.success(`Đang chuyển tới trang thanh toán ${retryMethod.toUpperCase()}...`);
            window.location.href = paymentUrl;
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || 'Không thể thanh toán lại, vui lòng thử lại!'
            );
            setPayingBookingId(null);
        }
    };

    const handlePayAgain = async (booking: any) => {
        try {
            setPayingBookingId(booking._id);

            const retryRes = await api.get(`/bookings/${booking._id}/retry-payment-info`);
            const info = retryRes.data?.data;

            if (!info || !info.amountToPay || info.amountToPay <= 0) {
                toast.error('Không có số tiền cần thanh toán thêm cho đơn/nhóm đơn này.');
                setPayingBookingId(null);
                return;
            }

            const body =
                info.type === 'order'
                    ? { bookingIds: info.bookingIds, isRetryPayment: true, amount: info.amountToPay }
                    : { bookingId: info.bookingId, isRetryPayment: true, amount: info.amountToPay };

            setRetryAmount(info.amountToPay);
            setRetryBody(body);
            setIsRetryMethodModalOpen(true);
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || 'Không thể thanh toán lại, vui lòng thử lại!'
            );
            setPayingBookingId(null);
        }
    };

    const handlePayAgainGroup = (group: any) => {
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

    const handleViewInvoice = async (booking: any) => {
        try {
            setPrintingInvoiceId(booking._id);

            if (!booking?.hasInvoice) {
                toast.error(
                    'Đơn này chưa có hóa đơn. Vui lòng bấm "Thanh toán" để tạo hóa đơn trước!'
                );
                setPrintingInvoiceId(null);
                return;
            }

            const res = await api.get(`/invoices/by-booking/${booking._id}`);

            if (!res?.data?.invoice) {
                toast.error('Không tìm thấy hóa đơn!');
                setPrintingInvoiceId(null);
                return;
            }

            printInvoiceMira(res.data);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể tải thông tin hóa đơn!');
        } finally {
            setPrintingInvoiceId(null);
        }
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
                    return ['pending', 'processing', 'refunded', 'rejected'].includes(
                        b.refundStatus || 'none'
                    );

                default:
                    return true;
            }
        };

        const result =
            tabKey === 'refunded'
                ? groupsSource.filter((g: any) => !!g.hasRefund)
                : (groupsSource
                      .map((g) => (g.bookings?.some(matchBooking) ? g : null))
                      .filter(Boolean) as any[]);

        setFilteredGroups(result);
    };

    const fetchBookings = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            const userId = user?._id;
            if (!userId) {
                setLoading(false);
                toast.info('Vui lòng đăng nhập để xem đơn đặt sân');
                navigate('/signin');
                return;
            }

            const res = await api.get(`/bookings/user/${userId}?t=${Date.now()}`);
            const data = res.data;
            // console.log('sample booking:', data?.data?.[0]);

            if (data?.success) {
                const normalizeRefundStatus = (b: any) => {
                    const raw = String(b.refundStatus || b.refund?.status || '').toLowerCase();
                    if (['none', 'pending', 'processing', 'refunded', 'rejected'].includes(raw))
                        return raw;

                    // suy ra từ dữ liệu hiện có
                    if (b.paymentStatus === 'refunded' || b.refundProcessedAt) return 'refunded';

                    // đã gửi yêu cầu hoàn tiền
                    if (b.refundRequestedAt) return 'pending';

                    // không có gì
                    return 'none';
                };

                const mapped = data.data.map((b: any) => ({
                    ...b,
                    status: String(b.status || '').toLowerCase(),
                    paymentStatus: String(b.paymentStatus || 'unpaid').toLowerCase(),
                    refundStatus: normalizeRefundStatus(b), // <<< QUAN TRỌNG
                }));

                const sorted = [...mapped].sort((a: any, b: any) => {
                    const at = new Date(a.createdAt || a.date).getTime();
                    const bt = new Date(b.createdAt || b.date).getTime();
                    return bt - at;
                });

                const sortedWithEquipments = sorted.map((b: any) => {
                    const items = extractEquipmentItems(
                        b.equipmentItems || b.equipments || b.bookingEquipments || b.items || b.data
                    );
                    const equipments = mergeEquipments(items, b.paymentStatus || 'unpaid');
                    return { ...b, equipments };
                });

                setBookings(sortedWithEquipments);

                const groupMap = new Map<string, any>();
                for (const b of sortedWithEquipments) {
                    let key = String(b._id);
                    let orderCode = null;
                    if (b.orderId) {
                        if (typeof b.orderId === 'object') {
                            key = String(b.orderId._id);
                            orderCode = b.orderId.code;
                        } else {
                            key = String(b.orderId);
                        }
                    }

                    if (!groupMap.has(key)) {
                        groupMap.set(key, {
                            _id: key,
                            code: orderCode || b.code,
                            isGroup: !!b.orderId,
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

                    // Hoàn tiền theo nhóm
                    g.refundBookings = (g.bookings || []).filter((b: any) => {
                        const rs = String(b.refundStatus || 'none').toLowerCase();
                        return (
                            b.status === 'cancelled' &&
                            ['pending', 'processing', 'refunded', 'rejected'].includes(rs)
                        );
                    });
                    g.hasRefund = g.refundBookings.length > 0;

                    g.subtotal = g.bookings.reduce((sum: number, b: any) => {
                        if (b.status === 'cancelled') return sum;
                        const base = Number(b.fieldAmount || 0) + Number(b.equipmentTotal || 0);
                        return sum + Math.max(0, base);
                    }, 0);

                    g.voucherDiscount = g.bookings.reduce((sum: number, b: any) => {
                        if (b.status === 'cancelled') return sum;
                        const d = Number(b.discountTotal || 0);
                        return sum + Math.max(0, d);
                    }, 0);

                    g.total = Math.max(0, g.subtotal - g.voucherDiscount);

                    return g;
                });

                setBookingGroups(groups);
                applyFilter(activeTab, groups);

                // reset selection mỗi lần load lại list
                setSelectedPayByGroup({});
                setSelectedCancelByGroup({});
                setSelectedRefundByGroup({});

                const matchBooking = (tabKey: string, b: any) => {
                    switch (tabKey) {
                        case 'all':
                            return true;

                        case 'waiting_payment':
                            return b.paymentStatus === 'unpaid' || b.paymentStatus === 'partial';

                        case 'pending':
                        case 'confirmed':
                        case 'in_use':
                        case 'completed':
                        case 'cancelled':
                            return b.status === tabKey;

                        case 'refunded':
                            return ['pending', 'processing', 'refunded', 'rejected'].includes(
                                b.refundStatus || 'none'
                            );

                        // default:
                        //     return true;
                    }
                };

                const countGroups = (tabKey: string) =>
                    groups.filter((g: any) => g.bookings?.some((b: any) => matchBooking(tabKey, b)))
                        .length;

                const counts: Record<string, number> = {
                    all: countGroups('all'),
                    waiting_payment: countGroups('waiting_payment'),
                    pending: countGroups('pending'),
                    confirmed: countGroups('confirmed'),
                    in_use: countGroups('in_use'),
                    completed: countGroups('completed'),
                    cancelled: countGroups('cancelled'),
                    refunded: groups.filter((g: any) => !!g.hasRefund).length,
                };

                setTabCounts(counts);

                // const counts: Record<string, number> = {
                //     all: sortedWithEquipments.length,
                //     waiting_payment: sortedWithEquipments.filter(
                //         (b) => b.paymentStatus === 'unpaid' || b.paymentStatus === 'partial'
                //     ).length,
                //     pending: sortedWithEquipments.filter((b) => b.status === 'pending').length,
                //     confirmed: sortedWithEquipments.filter((b) => b.status === 'confirmed').length,
                //     in_use: sortedWithEquipments.filter((b) => b.status === 'in_use').length,
                //     completed: sortedWithEquipments.filter((b) => b.status === 'completed').length,
                //     cancelled: sortedWithEquipments.filter((b) => b.status === 'cancelled').length,
                //     refunded: sortedWithEquipments.filter((b) => {
                //         const rs =
                //             b.refundStatus ||
                //             (b.paymentStatus === 'refunded' ? 'refunded' : 'none');
                //         return ['pending', 'processing', 'refunded'].includes(rs);
                //     }).length,
                // };
                // setTabCounts(counts);
            } else {
                toast.error(data?.message || 'Không lấy được danh sách đặt sân');
            }
        } catch {
            // Auto retry khi server chưa sẵn sàng
            if (bookingRetryRef.current < 15) {
                bookingRetryRef.current += 1;
                console.log(`[MyBookings] Đang thử kết nối lại... (lần ${bookingRetryRef.current})`);
                bookingRetryTimerRef.current = setTimeout(() => {
                    fetchBookings();
                }, 3000);
                return; // Không tắt loading
            } else {
                toast.error('Không thể kết nối tới máy chủ. Vui lòng tải lại trang!');
            }
        } finally {
            setLoading(false);
        }
    };

    const bookingRetryRef = useRef(0);
    const bookingRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Invoice view removed per user request

    // KẾT NỐI SOCKET
    useEffect(() => {
        fetchBookings();
        fetchMyReviews();

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
            if (bookingRetryTimerRef.current) clearTimeout(bookingRetryTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (bookings.length && socketRef.current) {
            bookings.forEach((b) => {
                if (b.courtId?._id) socketRef.current?.emit('join:court', b.courtId._id);
            });
        }
    }, [bookings]);

    const handleTabChange = (key: string) => {
        setActiveTab(key);
    };
    useEffect(() => {
        applyFilter(activeTab, bookingGroups);
    }, [activeTab, bookingGroups]);
    //console.log('bookingGroups', bookingGroups.length);

    //console.log('filteredGroups', filteredGroups.length);

    // HỦY ĐƠN (NHIỀU CA) - 2 bước: cảnh báo voucher -> nhập lý do
    const openCancelModal = (bookingIds: string[], group?: any) => {
        const ids = bookingIds || [];
        if (!ids.length) return;

        const groupVoucherDiscount = Number(group?.voucherDiscount || 0);
        const hasVoucher =
            groupVoucherDiscount > 0 ||
            (Array.isArray(group?.bookings) &&
                group.bookings.some(
                    (b: any) => Number(b?.voucherDiscount || b?.discountTotal || 0) > 0
                ));

        //  tổng số ca trong đơn (theo group)
        const groupCount = Array.isArray(group?.bookings) ? group.bookings.length : ids.length;

        //  chỉ cảnh báo khi hủy 1 phần (ids < tổng ca)
        const isPartialCancel = groupCount > 0 && ids.length < groupCount;

        if (hasVoucher && isPartialCancel) {
            setPendingCancelIds(ids);
            setCancelAgree(false);

            //  meta để modal show đẹp
            setCancelWarnMeta({ totalCount: groupCount, discount: groupVoucherDiscount });

            setIsCancelWarnOpen(true);
            return;
        }
        setCancelReasonTags([]);
        setCancelNote('');
        setCancelReason(''); // giữ đồng bộ

        // không có voucher HOẶC hủy hết => vào thẳng modal nhập lý do
        setSelectedBookingIds(ids);
        setCancelReason('');
        setIsCancelModalOpen(true);
    };

    const closeCancelModal = () => {
        setIsCancelModalOpen(false);
        setCancelReason('');
        setSelectedBookingIds([]);

        setCancelReasonTags([]);
        setCancelNote('');
    };

    const closeCancelWarn = () => {
        setIsCancelWarnOpen(false);
        setCancelAgree(false);
        setPendingCancelIds([]);
    };

    const handleAcceptCancelWarn = () => {
        if (!cancelAgree) return;

        // step 2: mở modal nhập lý do
        setIsCancelWarnOpen(false);

        setSelectedBookingIds(pendingCancelIds);
        setCancelReason('');
        setIsCancelModalOpen(true);
    };

    const handleConfirmCancel = async () => {
        const finalReason = buildCancelReason(cancelReasonTags, cancelNote);

        if (!finalReason.trim()) {
            toast.error('Vui lòng nhập lý do hủy đơn!');
            return;
        }

        try {
            await Promise.all(
                selectedBookingIds.map((id) =>
                    api.patch(`/bookings/${id}/cancel`, { reason: finalReason.trim() })
                )
            );

            toast.success('Hủy các ca trong đơn thành công!', {
                autoClose: 1500,
                style: { backgroundColor: '#dc2626', color: '#fff' },
            });

            closeCancelModal();
            setCancelReasonTags([]);
            setCancelNote('');

            fetchBookings();
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message ||
                    err.message ||
                    'Không thể hủy, vui lòng kiểm tra lại!'
            );
        }
    };

    // HOÀN TIỀN
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

            toast.success('Đã gửi yêu cầu hoàn tiền!', {
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
                <Spin size='large' tip='Đang tải dữ liệu...'>
                    <div />
                </Spin>
            </div>
        );
    }

    return (
        <div className='bg-gray-50 dark:bg-gray-900 py-12 transition-colors duration-300'>
            <ToastContainer position='top-right' autoClose={2500} theme='colored' />
            <div className='max-w-[1440px] w-full mx-auto px-4 md:px-6 lg:px-8'>
                <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8 text-center transition-colors'>
                    Đơn đặt sân của tôi
                </h1>

                {/* TABS */}
                <div className='bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-2 mt-4 md:mt-0 mb-6 shadow-sm transition-colors backdrop-blur-xl bg-opacity-80'>
                    <div className='flex flex-wrap items-center justify-center lg:justify-start gap-2'>
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => handleTabChange(tab.key)}
                                className={`relative py-2.5 px-4 md:px-5 rounded-xl text-sm md:text-[15px] font-semibold whitespace-nowrap transition-all duration-300 snap-start active:scale-[0.98] outline-none flex items-center gap-2
                                    ${
                                        activeTab === tab.key
                                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100 dark:border-emerald-800/50'
                                            : 'bg-transparent text-gray-500 dark:text-gray-400 border border-transparent hover:bg-gray-50 dark:hover:bg-gray-750 hover:text-gray-800 dark:hover:text-gray-200'
                                    }`}
                            >
                                <span>{tab.label}</span>
                                {tabCounts[tab.key] > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                        activeTab === tab.key 
                                            ? 'bg-emerald-200/50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' 
                                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                    }`}>
                                        {tabCounts[tab.key]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* LIST */}
                <div className='transition-colors'>
                    {filteredGroups.length === 0 ? (
                        <div className='bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm py-20 flex justify-center'>
                            <Empty description='Không có đơn đặt sân nào' className='dark:opacity-80' />
                        </div>
                    ) : (
                        <div className='flex flex-col gap-6'>
                            {filteredGroups.map((group) => {
                                const first = group.bookings[0];
                                const imageUrl =
                                    first.courtId?.images?.[0] || first.courtId?.image || '';
                                const subtotal = Number(group.subtotal || 0);
                                const discount = Number(group.voucherDiscount || 0);
                                const groupTotal = Math.max(0, subtotal - discount);

                                const slotCount: number = group.bookings.reduce(
                                    (sum: number, b: any) => {
                                        if (Array.isArray(b.slots) && b.slots.length > 0)
                                            return sum + b.slots.length;
                                        return sum + 1;
                                    },
                                    0
                                );

                                // có thể thanh toán
                                const eligiblePayBookings = group.bookings.filter((b: any) =>
                                    canRetryPay(b)
                                );
                                const eligiblePayIds = eligiblePayBookings.map((b: any) => b._id);

                                // có thể hủy: cả pending lẫn confirmed (đã xác nhận) nếu đã thanh toán hoặc thanh toán 1 phần
                                const eligibleCancelBookings = group.bookings.filter((b: any) => {
                                    const s = String(b.status || '').toLowerCase().trim();
                                    const ps = String(b.paymentStatus || '').toLowerCase().trim();
                                    return (
                                        (s === 'pending' || s === 'confirmed') &&
                                        (ps === 'paid' || ps === 'partial')
                                    );
                                });
                                const eligibleCancelIds = eligibleCancelBookings.map(
                                    (b: any) => b._id
                                );

                                // đã chọn hủy (chỉ áp dụng đơn hợp lệ)
                                const rawSelectedCancelIds = selectedCancelByGroup[group._id] || [];
                                const selectedCancelIds = rawSelectedCancelIds.filter((id) =>
                                    eligibleCancelIds.includes(id)
                                );

                                // đã chọn thanh toán (chỉ áp dụng đơn hợp lệ)
                                const rawSelectedIds = selectedPayByGroup[group._id] || [];
                                const selectedIds = rawSelectedIds.filter((id) =>
                                    eligiblePayIds.includes(id)
                                );

                                const selectedPayBookings = eligiblePayBookings.filter((b: any) =>
                                    selectedIds.includes(b._id)
                                );
                                const selectedPayAmount: number = selectedPayBookings.reduce(
                                    (sum: number, b: any) => sum + calcNeedPay(b),
                                    0
                                );

                                // hiển thị chọn tất cả (thanh toán) nếu >=2
                                const showSelectAll = eligiblePayIds.length > 1;
                                const eligibleCount = eligiblePayIds.length;
                                const selectedCount = selectedIds.length;

                                const allChecked =
                                    showSelectAll &&
                                    eligibleCount > 0 &&
                                    selectedCount === eligibleCount;
                                const indeterminate =
                                    showSelectAll &&
                                    selectedCount > 0 &&
                                    selectedCount < eligibleCount;

                                // hiển thị chọn tất cả (hủy) nếu >=2
                                const showSelectAllCancel = eligibleCancelIds.length > 1;
                                const cancelAllChecked =
                                    showSelectAllCancel &&
                                    eligibleCancelIds.length > 0 &&
                                    selectedCancelIds.length === eligibleCancelIds.length;

                                const cancelIndeterminate =
                                    showSelectAllCancel &&
                                    selectedCancelIds.length > 0 &&
                                    selectedCancelIds.length < eligibleCancelIds.length;

                                // Hoàn tiền theo nhóm
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
                                    const isCancelledByAdmin = b.cancelBy === 'admin';
                                    // Các ca có thể hoàn tiền
                                    return allowStatus && isPaidOrPartial && canRefundStatus && !isCancelledByAdmin;
                                });

                                const canRequestRefundGroup =
                                    refundableBookings.length > 0 &&
                                    refundableBookings.length === group.bookings.length;

                                // Các ca đã chọn hoàn tiền (hợp lệ)

                                const canPayAgainGroup = group.bookings.some((b: any) =>
                                    canRetryPay(b)
                                );

                                return (
                                    <div
                                        key={group._id}
                                        className='bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-750 shadow-sm hover:shadow-md transition-shadow p-5 md:p-6 flex flex-col md:flex-row md:items-start md:justify-between gap-6'
                                    >
                                        {/* LEFT */}
                                        <div className='flex-1 flex gap-4'>
                                            {imageUrl && (
                                                <img
                                                    src={imageUrl}
                                                    alt={first.courtId?.name || 'Sân bóng'}
                                                    className='w-24 h-24 md:w-28 md:h-28 rounded-xl object-cover border border-gray-200 dark:border-gray-700'
                                                />
                                            )}

                                            <div className='flex-1 min-w-0'>
                                                <div className='flex items-center gap-2 mb-2'>
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-linear-to-r from-gray-100 to-gray-50 dark:from-gray-700/50 dark:to-gray-800/50 border border-gray-200 dark:border-gray-600/50 shadow-xs">
                                                        <span className='text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest'>Mã đơn</span>
                                                        <div className='w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600'></div>
                                                        <span className='text-xs font-black text-gray-800 dark:text-gray-100 tracking-tight uppercase'>
                                                            {group.code || first.code}
                                                        </span>
                                                    </div>
                                                    {slotCount > 1 && (
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-linear-to-r from-indigo-50 to-blue-50 dark:from-indigo-500/10 dark:to-blue-500/10 border border-indigo-100 dark:border-indigo-500/20 shadow-xs">
                                                            <Layers size={11} className="text-indigo-600 dark:text-indigo-400" />
                                                            <span className='text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide'>
                                                                {slotCount} CA
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                                                    {first.courtId?.name || 'Sân bóng'}
                                                </h2>
                                                <p className='text-sm text-gray-600 dark:text-gray-300 mt-1'>
                                                    {format(new Date(first.date), 'dd/MM/yyyy', {
                                                        locale: vi,
                                                    })}
                                                </p>

                                                {/* DANH SÁCH TỪNG CA */}
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

                                                            const fieldAmount = Number(
                                                                booking.fieldAmount || 0
                                                            );

                                                            // ---- tách tiền thiết bị ----
                                                            const rentTotal = Array.isArray(
                                                                booking.equipments
                                                            )
                                                                ? booking.equipments
                                                                      .filter(
                                                                          (it: any) =>
                                                                              it.mode !== 'sell'
                                                                      )
                                                                      .reduce(
                                                                          (sum: number, it: any) =>
                                                                              sum +
                                                                              Number(
                                                                                  it.subtotal ||
                                                                                      it.price *
                                                                                          it.qty ||
                                                                                      0
                                                                              ),
                                                                          0
                                                                      )
                                                                : 0;

                                                            const sellTotal = Array.isArray(
                                                                booking.equipments
                                                            )
                                                                ? booking.equipments
                                                                      .filter(
                                                                          (it: any) =>
                                                                              it.mode === 'sell'
                                                                      )
                                                                      .reduce(
                                                                          (sum: number, it: any) =>
                                                                              sum +
                                                                              Number(
                                                                                  it.subtotal ||
                                                                                      it.price *
                                                                                          it.qty ||
                                                                                      0
                                                                              ),
                                                                          0
                                                                      )
                                                                : 0;

                                                            const equipmentTotalDB = Number(
                                                                booking.equipmentTotal || 0
                                                            );

                                                            // rent/sell chỉ để hiển thị chi tiết nếu có items
                                                            const equipmentTotalView =
                                                                rentTotal + sellTotal;

                                                            // tiền chuẩn để tính tổng: ưu tiên DB
                                                            const equipmentTotalForCalc =
                                                                equipmentTotalDB > 0
                                                                    ? equipmentTotalDB
                                                                    : equipmentTotalView;

                                                            const totalAll = Math.max(
                                                                0,
                                                                fieldAmount + equipmentTotalForCalc
                                                            );

                                                            const refundAmount = Number(
                                                                booking.refundAmount ??
                                                                    booking.refund?.amount ??
                                                                    totalAll
                                                            );



                                                            const equipUnpaid =
                                                                Number(
                                                                    booking.equipmentUnpaid ?? 0
                                                                ) ||
                                                                (Array.isArray(booking.equipments)
                                                                    ? booking.equipments.reduce(
                                                                          (s: number, it: any) =>
                                                                              s +
                                                                              Number(
                                                                                  it.unpaidSubtotal ||
                                                                                      0
                                                                              ),
                                                                          0
                                                                      )
                                                                    : 0);

                                                            const isRefunded =
                                                                refundStatus === 'refunded';

                                                            const s = String(booking.status || '').toLowerCase().trim();
                                                            const ps = String(booking.paymentStatus || '').toLowerCase().trim();

                                                            const canCancelThis =
                                                                (s === 'pending' || s === 'confirmed') &&
                                                                (ps === 'paid' || ps === 'partial');

                                                            const canRefundThis =
                                                                booking.status === 'cancelled' &&
                                                                (booking.paymentStatus === 'paid' ||
                                                                    booking.paymentStatus ===
                                                                        'partial') &&
                                                                (refundStatus === 'none' ||
                                                                    refundStatus === 'rejected');

                                                            const canRetryThis =
                                                                canRetryPay(booking);
                                                            const hasAnyCheckbox =
                                                                canRetryThis ||
                                                                canCancelThis ||
                                                                canRefundThis;

                                                            return (
                                                                <div
                                                                    key={booking._id}
                                                                    className='border border-gray-100 dark:border-gray-700/60 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-800/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-colors w-full relative'
                                                                >
                                                                    {/* CHECKBOX góc trái: Pay + Hủy + Hoàn */}
                                                                    {(canRetryThis ||
                                                                        canCancelThis ||
                                                                        canRefundThis) && (
                                                                        <div className='absolute top-4 left-4 z-10 flex flex-col gap-2'>
                                                                            {canRetryThis && (
                                                                                <Checkbox
                                                                                    checked={(
                                                                                        selectedPayByGroup[
                                                                                            group
                                                                                                ._id
                                                                                        ] || []
                                                                                    ).includes(
                                                                                        booking._id
                                                                                    )}
                                                                                    onChange={(e) =>
                                                                                        toggleSelectPay(
                                                                                            group._id,
                                                                                            booking._id,
                                                                                            e.target
                                                                                                .checked
                                                                                        )
                                                                                    }
                                                                                />
                                                                            )}

                                                                            {canCancelThis && (
                                                                                <Checkbox
                                                                                    checked={(
                                                                                        selectedCancelByGroup[
                                                                                            group
                                                                                                ._id
                                                                                        ] || []
                                                                                    ).includes(
                                                                                        booking._id
                                                                                    )}
                                                                                    onChange={(e) =>
                                                                                        toggleSelectCancel(
                                                                                            group._id,
                                                                                            booking._id,
                                                                                            e.target
                                                                                                .checked
                                                                                        )
                                                                                    }
                                                                                />
                                                                            )}

                                                                            {canRefundThis && (
                                                                                <Checkbox
                                                                                    checked={(
                                                                                        selectedRefundByGroup[
                                                                                            group
                                                                                                ._id
                                                                                        ] || []
                                                                                    ).includes(
                                                                                        booking._id
                                                                                    )}
                                                                                    onChange={(e) =>
                                                                                        toggleSelectRefund(
                                                                                            group._id,
                                                                                            booking._id,
                                                                                            e.target
                                                                                                .checked
                                                                                        )
                                                                                    }
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    <div className='flex flex-col md:flex-row md:items-start md:justify-between gap-3'>
                                                                        {/* LEFT INFO */}
                                                                        <div
                                                                            className={`min-w-0 flex-1 space-y-2 ${
                                                                                hasAnyCheckbox
                                                                                    ? 'pl-14'
                                                                                    : ''
                                                                            }`}
                                                                        >
                                                                            {/* SLOT TIME */}
                                                                            {Array.isArray(
                                                                                booking.slots
                                                                            ) &&
                                                                            booking.slots.length >
                                                                                0 ? (
                                                                                booking.slots
                                                                                    .length ===
                                                                                1 ? (
                                                                                    <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                                                                                        Ca {idx + 1}
                                                                                        :{' '}
                                                                                        {
                                                                                            booking
                                                                                                .slots[0]
                                                                                                .startTime
                                                                                        }{' '}
                                                                                        -{' '}
                                                                                        {
                                                                                            booking
                                                                                                .slots[0]
                                                                                                .endTime
                                                                                        }
                                                                                    </p>
                                                                                ) : (
                                                                                    [
                                                                                        ...booking.slots,
                                                                                    ]
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
                                                                                                    className='text-sm font-medium text-gray-900 dark:text-gray-100'
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
                                                                                )
                                                                            ) : (
                                                                                <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
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
                                                                                <span className='text-gray-500 dark:text-gray-300'>
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
                                                                            <div className='flex flex-wrap items-start gap-2 text-xs md:text-sm'>
                                                                                <span className='text-gray-500 dark:text-gray-300'>
                                                                                    Thanh toán:
                                                                                </span>

                                                                                <Tag
                                                                                    color={
                                                                                        PAYMENT_COLORS[
                                                                                            booking
                                                                                                .paymentStatus
                                                                                        ] ||
                                                                                        'default'
                                                                                    }
                                                                                    className='rounded-full px-3 py-1'
                                                                                >
                                                                                    {PAYMENT_LABELS[
                                                                                        booking
                                                                                            .paymentStatus
                                                                                    ] || 'Không rõ'}
                                                                                </Tag>

                                                                                <div className='w-full mt-2 text-xs text-gray-700 dark:text-gray-300 space-y-1'>
                                                                                    <div className='flex justify-between'>
                                                                                        <span>
                                                                                            Tiền sân
                                                                                        </span>
                                                                                        <span className='font-medium'>
                                                                                            {fieldAmount.toLocaleString(
                                                                                                'vi-VN'
                                                                                            )}{' '}
                                                                                            VNĐ
                                                                                        </span>
                                                                                    </div>
                                                                                    {sellTotal >
                                                                                        0 && (
                                                                                        <div className='flex justify-between'>
                                                                                            <span>
                                                                                                Thiết
                                                                                                bị
                                                                                                mua
                                                                                            </span>
                                                                                            <span className='font-medium'>
                                                                                                {sellTotal.toLocaleString(
                                                                                                    'vi-VN'
                                                                                                )}{' '}
                                                                                                VNĐ
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                    {rentTotal >
                                                                                        0 && (
                                                                                        <div className='flex justify-between'>
                                                                                            <span>
                                                                                                Thiết
                                                                                                bị
                                                                                                thuê
                                                                                            </span>
                                                                                            <span className='font-medium'>
                                                                                                {rentTotal.toLocaleString(
                                                                                                    'vi-VN'
                                                                                                )}{' '}
                                                                                                VNĐ
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                    {/* CHÈN Ở ĐÂY */}{' '}
                                                                                    {/* nếu items rỗng nhưng DB có tiền thiết bị => show 1 dòng tổng thiết bị */}
                                                                                    {equipmentTotalDB >
                                                                                        0 &&
                                                                                        equipmentTotalView ===
                                                                                            0 && (
                                                                                            <div className='flex justify-between'>
                                                                                                <span>
                                                                                                    Thiết
                                                                                                    bị
                                                                                                </span>
                                                                                                <span className='font-medium'>
                                                                                                    {equipmentTotalDB.toLocaleString(
                                                                                                        'vi-VN'
                                                                                                    )}{' '}
                                                                                                    VNĐ
                                                                                                </span>
                                                                                            </div>
                                                                                        )}
                                                                                    <div className='flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700'>
                                                                                        <span className='font-semibold'>
                                                                                            Tổng
                                                                                        </span>
                                                                                        <span className='font-semibold'>
                                                                                            {totalAll.toLocaleString(
                                                                                                'vi-VN'
                                                                                            )}{' '}
                                                                                            VNĐ
                                                                                        </span>
                                                                                    </div>
                                                                                    {/* nếu có thiết bị thêm lúc check-in => sẽ hiện chưa trả đúng */}
                                                                                    {equipUnpaid >
                                                                                        0 && (
                                                                                        <div className='flex justify-between'>
                                                                                            <span className='text-red-600 font-semibold'>
                                                                                                Thiết
                                                                                                bị
                                                                                                chưa
                                                                                                thanh
                                                                                                toán
                                                                                            </span>
                                                                                            <span className='text-red-600 font-semibold'>
                                                                                                {equipUnpaid.toLocaleString(
                                                                                                    'vi-VN'
                                                                                                )}{' '}
                                                                                                VNĐ
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            {/* THIẾT BỊ */}
                                                                            {Array.isArray(
                                                                                booking.equipments
                                                                            ) &&
                                                                                booking.equipments
                                                                                    .length > 0 && (
                                                                                    <div className='mt-2 space-y-1 text-xs text-gray-700 dark:text-gray-300'>
                                                                                        <div className='font-semibold'>
                                                                                            {booking.status ===
                                                                                            'in_use'
                                                                                                ? 'Thiết bị đang sử dụng:'
                                                                                                : 'Thiết bị đã thuê / mua:'}
                                                                                        </div>
                                                                                        {booking.equipments.map(
                                                                                            (
                                                                                                it: any,
                                                                                                i: number
                                                                                            ) => (
                                                                                                <div
                                                                                                    key={
                                                                                                        i
                                                                                                    }
                                                                                                    className='flex justify-between'
                                                                                                >
                                                                                                    <span className='min-w-0 pr-2'>
                                                                                                        {
                                                                                                            it.name
                                                                                                        }{' '}
                                                                                                        <span className='text-gray-500 dark:text-gray-300'>
                                                                                                            (
                                                                                                            {it.mode ===
                                                                                                            'sell'
                                                                                                                ? 'mua'
                                                                                                                : 'thuê'}{' '}
                                                                                                            x{' '}
                                                                                                            {
                                                                                                                it.qty
                                                                                                            }{' '}
                                                                                                            {it.unit ||
                                                                                                                ''}

                                                                                                            )
                                                                                                        </span>
                                                                                                    </span>
                                                                                                </div>
                                                                                            )
                                                                                        )}
                                                                                    </div>
                                                                                )}

                                                                            {/* LÝ DO HỦY */}
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
                                                                                
                                                                            {/* VOUCHER REVOKED WARNING */}
                                                                            {booking.status === 'cancelled' && group.voucherStatus === 'revoked' && (
                                                                                <div className='mt-3 p-3 bg-linear-to-r from-orange-50 to-amber-50 border border-orange-200/60 rounded-xl flex items-start gap-2.5 dark:from-orange-900/20 dark:to-amber-900/10 dark:border-orange-800/40 shadow-sm'>
                                                                                    <span className='text-orange-500 dark:text-orange-400 text-sm mt-0.5'>⚠️</span>
                                                                                    <div>
                                                                                        <span className='font-bold text-orange-800 dark:text-orange-300 text-xs block mb-0.5'>Lưu ý hoàn tiền</span>
                                                                                        <span className='text-[11px] text-orange-700/90 dark:text-orange-200/80 leading-relaxed block'>
                                                                                            Do đơn hàng bị hủy một phần, voucher giảm giá đã mất hiệu lực. Số tiền hoàn thực tế sẽ được cấn trừ đi giá trị voucher đã sử dụng.
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* HOÀN TIỀN STATUS */}
                                                                            {refundStatus !==
                                                                                'none' && (
                                                                                <div className='flex flex-col gap-1 mt-1'>
                                                                                    <div className='flex flex-wrap items-center gap-2'>
                                                                                        <span className='text-gray-500 dark:text-gray-300 text-xs'>
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
                                                                                            <span className='text-xs text-gray-500 dark:text-gray-300'>
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

                                                                            {/* 2 dòng thiết bị đã trả / chưa trả */}

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

                                                                        {/* RIGHT ACTIONS */}
                                                                        <div className='shrink-0 flex flex-row md:flex-col md:items-end gap-2'>
                                                                            {canRefundThis &&
                                                                                !canRequestRefundGroup && (
                                                                                    <Button
                                                                                        size='middle'
                                                                                        className='border-amber-500 text-amber-600 hover:bg-amber-50'
                                                                                        onClick={() =>
                                                                                            openRefundModal(
                                                                                                [
                                                                                                    booking,
                                                                                                ]
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        Yêu cầu hoàn
                                                                                        tiền
                                                                                    </Button>
                                                                                )}

                                                                            {booking.status ===
                                                                                'completed' &&
                                                                                booking.hasInvoice && (
                                                                                    <Button
                                                                                        size='middle'
                                                                                        className='border-emerald-500 text-emerald-600 hover:bg-emerald-50'
                                                                                        loading={
                                                                                            printingInvoiceId ===
                                                                                            booking._id
                                                                                        }
                                                                                        onClick={() =>
                                                                                            handleViewInvoice(
                                                                                                booking
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        Xem hóa đơn
                                                                                    </Button>
                                                                                )}

                                                                            {/* NÚT ĐÁNH GIÁ / HIỆN SAO */}
                                                                            {booking.status === 'completed' && booking.paymentStatus === 'paid' && (
                                                                                reviewMap[booking._id] ? (
                                                                                    <div className='flex flex-col items-end gap-1.5'>
                                                                                        <div className='flex items-center gap-2'>
                                                                                            <span className='text-[10px] text-gray-400 font-semibold uppercase tracking-wide'>Đã đánh giá</span>
                                                                                            <Rate disabled value={reviewMap[booking._id].rating} className='text-sm' style={{ fontSize: 12 }} />
                                                                                        </div>
                                                                                        <Button 
                                                                                            size='small' 
                                                                                            type="link" 
                                                                                            className='p-0 h-auto text-xs font-bold text-amber-600 hover:text-amber-700'
                                                                                            onClick={() => openReviewModal(booking, true)}
                                                                                        >
                                                                                            Xem đánh giá của bạn
                                                                                        </Button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <Button
                                                                                        size='middle'
                                                                                        style={{
                                                                                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                                                            borderColor: '#d97706',
                                                                                            color: '#fff',
                                                                                            fontWeight: 700,
                                                                                            borderRadius: 10,
                                                                                        }}
                                                                                        onClick={() => openReviewModal(booking)}
                                                                                    >
                                                                                        ⭐ Đánh giá sân
                                                                                    </Button>
                                                                                )
                                                                            )}

                                                                            {booking.status ===
                                                                                'cancelled' &&
                                                                                [
                                                                                    'pending',
                                                                                    'processing',
                                                                                ].includes(
                                                                                    refundStatus
                                                                                ) && (
                                                                                    <p className='text-xs text-blue-500 italic text-right'>
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
                                                                                    <p className='text-xs text-green-600 font-semibold text-right'>
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
                                        <div className='w-full md:w-[320px] shrink-0'>
                                            <div className='md:sticky md:top-24 bg-white dark:bg-gray-800 border-2 border-emerald-50 dark:border-gray-700 rounded-2xl shadow-md overflow-hidden'>
                                                {/* Header */}
                                                <div className='px-4 py-3 bg-linear-to-r from-emerald-50 to-emerald-100/50 dark:from-gray-800 dark:to-gray-850 border-b border-gray-200 dark:border-gray-700'>
                                                    <div className='flex items-center justify-between'>
                                                        <div>
                                                            <p className='text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-0.5'>
                                                                Tổng thanh toán
                                                            </p>
                                                            <p className='text-[22px] font-black text-emerald-600 dark:text-emerald-400'>
                                                                {groupTotal.toLocaleString('vi-VN')}
                                                                <span className='text-sm font-semibold ml-1'>VNĐ</span>
                                                            </p>
                                                        </div>

                                                        {discount > 0 && (
                                                            <div className='flex flex-col items-end'>
                                                                <span className='text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5'>TIẾT KIỆM</span>
                                                                <span className='text-xs font-bold text-white bg-emerald-500 shadow-sm shadow-emerald-500/20 px-2 py-1 rounded-md'>
                                                                    {discount.toLocaleString('vi-VN')} đ
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Body */}
                                                <div className='p-4'>
                                                    <div className='space-y-2 text-sm'>
                                                        <div className='flex items-center justify-between'>
                                                            <span className='text-gray-600 dark:text-gray-300'>
                                                                Tạm tính
                                                            </span>
                                                            <span className='font-semibold text-gray-900 dark:text-gray-100'>
                                                                {subtotal.toLocaleString('vi-VN')}{' '}
                                                                VNĐ
                                                            </span>
                                                        </div>

                                                        {discount > 0 && (
                                                            <div className='flex items-center justify-between'>
                                                                <span className='text-gray-600 dark:text-gray-300'>
                                                                    Giảm voucher
                                                                </span>
                                                                <span className='font-bold text-red-600'>
                                                                    -
                                                                    {discount.toLocaleString(
                                                                        'vi-VN'
                                                                    )}{' '}
                                                                    VNĐ
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div className='border-t border-gray-200 dark:border-gray-700 pt-3 flex items-center justify-between'>
                                                            <span className='text-gray-700 dark:text-gray-300 font-semibold'>
                                                                Tổng tiền đơn
                                                            </span>
                                                            <span className='text-base font-extrabold text-gray-900 dark:text-gray-100'>
                                                                {groupTotal.toLocaleString('vi-VN')}{' '}
                                                                VNĐ
                                                            </span>
                                                        </div>

                                                        {/* Sẽ thanh toán */}
                                                        {eligiblePayIds.length > 0 &&
                                                            selectedCount > 0 && (
                                                                <div className='mt-3 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 flex items-center justify-between'>
                                                                    <span className='text-emerald-700 text-xs font-semibold'>
                                                                        Sẽ thanh toán
                                                                    </span>
                                                                    <span className='text-emerald-700 font-extrabold'>
                                                                        {selectedPayAmount.toLocaleString(
                                                                            'vi-VN'
                                                                        )}{' '}
                                                                        VNĐ
                                                                    </span>
                                                                </div>
                                                            )}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className='mt-4 space-y-3'>
                                                        {/* CHỌN TẤT CẢ (THANH TOÁN LẠI) */}
                                                        {showSelectAll && (
                                                            <div className='flex justify-end'>
                                                                <Checkbox
                                                                    indeterminate={indeterminate}
                                                                    checked={allChecked}
                                                                    onChange={(e) =>
                                                                        toggleSelectAllPay(
                                                                            group._id,
                                                                            eligiblePayIds,
                                                                            e.target.checked
                                                                        )
                                                                    }
                                                                >
                                                                    Chọn tất cả
                                                                </Checkbox>
                                                            </div>
                                                        )}

                                                        {/* THANH TOÁN LẠI THEO CA ĐÃ CHỌN */}
                                                        {eligiblePayIds.length > 0 && (
                                                            <Button
                                                                type='primary'
                                                                size='middle'
                                                                className='w-full rounded-xl font-bold text-base transition-all duration-200 hover:-translate-y-0.5'
                                                                style={{
                                                                    background: selectedPayBookings.length === 0
                                                                        ? '#374151'
                                                                        : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                                                    borderColor: selectedPayBookings.length === 0 ? '#4b5563' : '#16a34a',
                                                                    color: selectedPayBookings.length === 0 ? '#9ca3af' : '#fff',
                                                                    boxShadow: selectedPayBookings.length === 0
                                                                        ? 'none'
                                                                        : '0 4px 15px rgba(34, 197, 94, 0.4)',
                                                                    height: 44,
                                                                }}
                                                                disabled={
                                                                    selectedPayBookings.length === 0
                                                                }
                                                                loading={
                                                                    !!payingBookingId &&
                                                                    selectedPayBookings.some(
                                                                        (b: any) =>
                                                                            b._id ===
                                                                            payingBookingId
                                                                    )
                                                                }
                                                                onClick={() =>
                                                                    handlePayAgainSelected(
                                                                        selectedPayBookings
                                                                    )
                                                                }
                                                            >
                                                                💳{' '}
                                                                {selectedPayBookings.length > 0
                                                                    ? `Thanh toán lại (${selectedPayBookings.length}) • ${selectedPayAmount.toLocaleString(
                                                                          'vi-VN'
                                                                      )} VNĐ`
                                                                    : 'Thanh toán lại'}
                                                            </Button>
                                                        )}

                                                        {/* (GIỮ) NÚT PAY AGAIN GROUP nếu group không dùng checkbox */}
                                                        {canPayAgainGroup &&
                                                            eligiblePayIds.length === 0 && (
                                                                <Button
                                                                    type='primary'
                                                                    size='middle'
                                                                    className='w-full rounded-xl font-bold text-base transition-all duration-200 hover:-translate-y-0.5'
                                                                    style={{
                                                                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                                                        borderColor: '#16a34a',
                                                                        color: '#fff',
                                                                        boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)',
                                                                        height: 44,
                                                                    }}
                                                                    loading={
                                                                        !!payingBookingId &&
                                                                        group.bookings.some(
                                                                            (b: any) =>
                                                                                b._id ===
                                                                                payingBookingId
                                                                        )
                                                                    }
                                                                    onClick={() =>
                                                                        handlePayAgainGroup(group)
                                                                    }
                                                                >
                                                                    💳{' '}
                                                                    {payingBookingId &&
                                                                    group.bookings.some(
                                                                        (b: any) =>
                                                                            b._id ===
                                                                            payingBookingId
                                                                    )
                                                                        ? 'Đang chuyển tới VNPay...'
                                                                        : 'Thanh toán lại'}
                                                                </Button>
                                                            )}

                                                        {/* CHỌN TẤT CẢ (HỦY) */}
                                                        {showSelectAllCancel && (
                                                            <div className='flex justify-end'>
                                                                <Checkbox
                                                                    indeterminate={
                                                                        cancelIndeterminate
                                                                    }
                                                                    checked={cancelAllChecked}
                                                                    onChange={(e) =>
                                                                        toggleSelectAllCancel(
                                                                            group._id,
                                                                            eligibleCancelIds,
                                                                            e.target.checked
                                                                        )
                                                                    }
                                                                >
                                                                    Chọn tất cả để hủy
                                                                </Checkbox>
                                                            </div>
                                                        )}

                                                        {/* HỦY THEO CA ĐÃ CHỌN */}
                                                        {eligibleCancelIds.length > 0 && (
                                                            <Button
                                                                danger
                                                                type='primary'
                                                                size='middle'
                                                                className='w-full rounded-xl font-bold transition-all duration-200 hover:-translate-y-0.5'
                                                                style={{
                                                                    background: selectedCancelIds.length === 0
                                                                        ? '#374151'
                                                                        : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                                    borderColor: selectedCancelIds.length === 0 ? '#4b5563' : '#dc2626',
                                                                    color: selectedCancelIds.length === 0 ? '#9ca3af' : '#fff',
                                                                    boxShadow: selectedCancelIds.length === 0
                                                                        ? 'none'
                                                                        : '0 4px 15px rgba(239, 68, 68, 0.3)',
                                                                    height: 42,
                                                                }}
                                                                disabled={
                                                                    selectedCancelIds.length === 0
                                                                }
                                                                onClick={() =>
                                                                    openCancelModal(
                                                                        selectedCancelIds,
                                                                        group
                                                                    )
                                                                }
                                                            >
                                                                ❌{' '}
                                                                {selectedCancelIds.length > 0
                                                                    ? `Hủy (${selectedCancelIds.length}) ca đã chọn`
                                                                    : 'Hủy đã chọn'}
                                                            </Button>
                                                        )}

                                                        {/* HOÀN THEO GROUP */}
                                                        {canRequestRefundGroup && (
                                                            <Button
                                                                size='middle'
                                                                className='w-full rounded-xl font-bold transition-all duration-200 hover:-translate-y-0.5'
                                                                style={{
                                                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                                    borderColor: '#d97706',
                                                                    color: '#fff',
                                                                    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
                                                                    height: 42,
                                                                }}
                                                                onClick={() =>
                                                                    openRefundModal(group.bookings)
                                                                }
                                                            >
                                                                💰 Yêu cầu hoàn tiền
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ========== MODAL ĐÁNH GIÁ SÂN ========== */}
            <Modal
                open={reviewModalOpen}
                onCancel={() => setReviewModalOpen(false)}
                footer={null}
                centered
                title={null}
                width={480}
                destroyOnHidden
            >
                <div className='text-center mb-6'>
                    <div className='w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-3 text-3xl'>⭐</div>
                    <h3 className='text-xl font-black text-gray-900 dark:text-white'>
                        {isViewOnlyReview ? 'Đánh giá của bạn' : 'Đánh giá sân bóng'}
                    </h3>
                    {reviewingBooking && (
                        <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
                            {reviewingBooking.courtId?.name} &bull; {reviewingBooking.startTime} – {reviewingBooking.endTime}
                        </p>
                    )}
                </div>

                <Form form={reviewForm} layout='vertical'>
                    <Form.Item
                        label={<span className='text-xs font-black text-gray-500 uppercase tracking-wider'>Số sao chất lượng sân</span>}
                        name='rating'
                        rules={[{ required: true, message: 'Vui lòng chọn số sao!' }]}
                    >
                        <Rate disabled={isViewOnlyReview} allowClear={false} style={{ fontSize: 32, color: '#fadb14' }} />
                    </Form.Item>

                    <Form.Item
                        label={<span className='text-xs font-black text-gray-500 uppercase tracking-wider'>Nhận xét của bạn</span>}
                        name='comment'
                        rules={[
                            { required: true, message: 'Vui lòng nhập nhận xét!' },
                            { min: 5, message: 'Tối thiểu 5 ký tự' },
                        ]}
                    >
                        <Input.TextArea
                            rows={4}
                            disabled={isViewOnlyReview}
                            placeholder='Chia sẻ trải nghiệm của bạn về sân bóng này...'
                            showCount={!isViewOnlyReview}
                            maxLength={300}
                            className='rounded-xl'
                        />
                    </Form.Item>
                </Form>

                {/* THÔNG TIN SÂN BÊN DƯỚI BÌNH LUẬN */}
                {reviewingBooking?.courtId && (
                    <div className='mt-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex items-center gap-4 border border-gray-100 dark:border-gray-700/50'>
                        <div className='w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white dark:border-gray-700 shadow-sm'>
                            <img 
                                src={reviewingBooking.courtId?.images?.[0] || reviewingBooking.courtId?.avatar || reviewingBooking.courtId?.image || '/placeholder-pitch.jpg'} 
                                alt={reviewingBooking.courtId?.name} 
                                className='w-full h-full object-cover'
                            />
                        </div>
                        <div className='min-w-0'>
                            <p className='text-xs font-black text-gray-500 uppercase tracking-widest leading-none mb-1.5'>Đánh giá cho sân</p>
                            <h4 className='text-sm font-bold text-gray-900 dark:text-gray-100 truncate'>{reviewingBooking.courtId?.name}</h4>
                            <p className='text-[10px] text-gray-400 font-medium mt-0.5'>{reviewingBooking.courtId?.location || 'Địa chỉ sân bóng'}</p>
                        </div>
                    </div>
                )}

                <div className='flex gap-3 mt-6'>
                    <button
                        onClick={() => setReviewModalOpen(false)}
                        className='flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'
                    >
                        {isViewOnlyReview ? 'Đóng' : 'Hủy bỏ'}
                    </button>
                    {isViewOnlyReview ? (
                        <button
                            onClick={() => setIsViewOnlyReview(false)}
                            className='flex-1 py-3 rounded-xl font-black text-white transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-emerald-200 dark:shadow-none'
                            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                        >
                            ✍️ Sửa đánh giá
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmitReview}
                            disabled={submittingReview}
                            className='flex-1 py-3 rounded-xl font-black text-white transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 shadow-md shadow-amber-200 dark:shadow-none'
                            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                        >
                            {submittingReview ? 'Đang gửi...' : '⭐ Gửi đánh giá'}
                        </button>
                    )}
                </div>
            </Modal>

            {/* MODAL HỦY (ĐẸP) */}
            <Modal
                centered
                open={isCancelModalOpen}
                onCancel={closeCancelModal}
                footer={null}
                title={null}
            >
                <div className='space-y-4'>
                    {/* Header */}
                    <div className='flex items-start gap-3'>
                        <div className='w-10 h-10 rounded-full bg-red-50 flex items-center justify-center border border-red-200'>
                            <ExclamationCircleFilled className='text-red-500 text-xl' />
                        </div>

                        <div className='flex-1'>
                            <div className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                                Xác nhận hủy đơn đặt sân
                            </div>
                            <div className='text-sm text-gray-600 dark:text-gray-300 mt-1'>
                                Bạn đang hủy <b>{selectedBookingIds.length}</b> ca. Vui lòng nhập lý
                                do để chúng tôi hỗ trợ tốt hơn.
                            </div>
                        </div>
                    </div>

                    {/* Box note */}
                    <div className='rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 text-sm text-gray-700 dark:text-gray-300'>
                        <ul className='list-disc pl-5 space-y-1'>
                            <li>Lý do sẽ được gửi cho quản lý sân để xác nhận.</li>
                            <li>Hãy mô tả ngắn gọn và rõ ràng.</li>
                        </ul>
                    </div>

                    {/* danh sách ca đang hủy (xịn) */}
                    {selectedBookingIds.length > 0 && (
                        <div className='rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-xs text-gray-700 dark:text-gray-300'>
                            <div className='font-semibold mb-2'>Các ca sẽ hủy:</div>
                            <div className='space-y-1 max-h-24 overflow-auto pr-1'>
                                {bookings
                                    .filter((b) => selectedBookingIds.includes(b._id))
                                    .map((b) => {
                                        const times =
                                            Array.isArray(b.slots) && b.slots.length > 0
                                                ? b.slots
                                                      .map(
                                                          (s: any) => `${s.startTime}-${s.endTime}`
                                                      )
                                                      .join(', ')
                                                : `${b.startTime}-${b.endTime}`;
                                        return (
                                            <div key={b._id} className='flex justify-between'>
                                                <span className='truncate pr-2'>
                                                    {b.courtId?.name || 'Sân'}
                                                </span>
                                                <span className='font-medium'>{times}</span>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {/* Textarea note */}
                    <div>
                        <div className='flex items-center justify-between mb-2'>
                            <span className='text-sm font-medium text-gray-800 dark:text-gray-200'>Lý do hủy *</span>
                            <span
                                className={`text-xs ${
                                    buildCancelReason(cancelReasonTags, cancelNote).trim()
                                        ? 'text-emerald-600'
                                        : 'text-gray-400 dark:text-gray-500'
                                }`}
                            >
                                {buildCancelReason(cancelReasonTags, cancelNote).trim()
                                    ? 'Hợp lệ'
                                    : 'Bắt buộc'}
                            </span>
                        </div>

                        <Input.TextArea
                            value={cancelNote}
                            onChange={(e) => {
                                const v = e.target.value;
                                setCancelNote(v);
                                setCancelReason(buildCancelReason(cancelReasonTags, v)); // giữ cancelReason
                            }}
                            placeholder='Ghi chú thêm (không bắt buộc)...'
                            showCount
                            maxLength={500}
                            rows={4}
                            className='rounded-xl'
                        />

                        {/* chips multi-select */}
                        <div className='mt-7 flex flex-wrap gap-2'>
                            {QUICK_CANCEL_REASONS.map((t) => {
                                const active = cancelReasonTags.includes(t);
                                return (
                                    <button
                                        key={t}
                                        type='button'
                                        onClick={() => {
                                            setCancelReasonTags((prev) => {
                                                const next = prev.includes(t)
                                                    ? prev.filter((x) => x !== t)
                                                    : [...prev, t];
                                                setCancelReason(
                                                    buildCancelReason(next, cancelNote)
                                                ); // giữ cancelReason
                                                return next;
                                            });
                                        }}
                                        className={`text-xs px-3 py-1 rounded-full border transition
            ${
                active
                    ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/50 dark:bg-red-500/20 dark:text-red-300'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }
          `}
                                    >
                                        {t}
                                    </button>
                                );
                            })}
                        </div>

                        {/* preview reason gửi đi */}
                        <div className='mt-2 text-xs text-gray-500 dark:text-gray-300'>
                            <span className='font-semibold'>Lý do gửi đi:</span>{' '}
                            <span className='text-gray-700 dark:text-gray-300'>
                                {buildCancelReason(cancelReasonTags, cancelNote) || '—'}
                            </span>
                        </div>

                        {buildCancelReason(cancelReasonTags, cancelNote).trim().length === 0 && (
                            <div className='mt-2 text-xs text-red-500'>
                                Vui lòng chọn lý do hoặc nhập ghi chú trước khi xác nhận.
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className='flex justify-end gap-2 pt-2'>
                        <Button onClick={closeCancelModal}>Đóng</Button>
                        <Button
                            type='primary'
                            danger
                            disabled={!cancelReason.trim()}
                            onClick={handleConfirmCancel}
                        >
                            Xác nhận hủy
                        </Button>
                    </div>
                </div>
            </Modal>

            {/*  MODAL CẢNH BÁO VOUCHER (STEP 1) */}
            <Modal
                centered
                open={isCancelWarnOpen}
                onCancel={closeCancelWarn}
                footer={null}
                title={null}
            >
                <div className='space-y-4'>
                    {/* Header */}
                    <div className='flex items-start gap-3'>
                        <div className='w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center border border-amber-200'>
                            <ExclamationCircleFilled className='text-amber-500 text-xl' />
                        </div>

                        <div className='flex-1'>
                            <div className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                                Voucher sẽ mất hiệu lực khi hủy một phần
                            </div>

                            <div className='text-sm text-gray-600 dark:text-gray-300 mt-1'>
                                Bạn đang hủy <b>{pendingCancelIds.length}</b> /{' '}
                                <b>{cancelWarnMeta.totalCount}</b> ca trong đơn. Voucher đã áp dụng
                                cho đơn này sẽ <b>không được hoàn lại</b>.
                            </div>
                        </div>
                    </div>

                    {/* Detail box */}
                    <div className='rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100'>
                        <ul className='list-disc pl-5 space-y-1'>
                            <li>Bạn chỉ nên hủy một phần nếu thật sự cần thiết.</li>
                            {cancelWarnMeta.discount > 0 && (
                                <li>
                                    Voucher đang giảm:{' '}
                                    <b className='text-amber-700 dark:text-amber-400'>
                                        {cancelWarnMeta.discount.toLocaleString('vi-VN')} VNĐ
                                    </b>
                                </li>
                            )}
                            <li>Nếu bạn muốn hủy toàn bộ, hệ thống sẽ bỏ qua cảnh báo này.</li>
                        </ul>
                    </div>

                    {/* Agree */}
                    <Checkbox
                        checked={cancelAgree}
                        onChange={(e) => setCancelAgree(e.target.checked)}
                    >
                        Tôi đã hiểu và đồng ý tiếp tục
                    </Checkbox>

                    {/* Actions */}
                    <div className='flex justify-end gap-2 pt-2'>
                        <Button onClick={closeCancelWarn}>Đóng</Button>
                        <Button
                            type='primary'
                            danger
                            disabled={!cancelAgree}
                            onClick={handleAcceptCancelWarn}
                        >
                            Tiếp tục
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* MODAL HOÀN TIỀN */}
            <Modal
                centered
                open={isRefundModalOpen}
                onCancel={closeRefundModal}
                footer={null}
                title={null}
                width={480}
                className='p-0! overflow-hidden rounded-2xl'
                styles={{
                    body: { padding: 0 },
                    content: { padding: 0, borderRadius: '16px', overflow: 'hidden' },
                }}
                closeIcon={
                    <div className='w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 transition-colors z-100'>
                        <span className='text-gray-600 dark:text-gray-300 font-bold'>✕</span>
                    </div>
                }
                destroyOnHidden
            >
                {/* Header Section */}
                <div className='bg-linear-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/20 pt-10 pb-6 px-6 relative overflow-hidden text-center'>
                    {/* Top colored border */}
                    <div className='absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-indigo-400 via-blue-500 to-indigo-400'></div>
                    
                    {/* Header Decorative Elements */}
                    <div className='absolute -top-10 -right-10 w-32 h-32 bg-indigo-200/40 dark:bg-indigo-700/20 rounded-full blur-2xl'></div>
                    <div className='absolute -bottom-10 -left-10 w-32 h-32 bg-blue-200/40 dark:bg-blue-700/20 rounded-full blur-2xl'></div>
                    
                    <div className='relative z-10 flex flex-col items-center'>
                        <div className='w-16 h-16 bg-white dark:bg-gray-800 rounded-full shadow-md mx-auto flex items-center justify-center mb-4 border-2 border-indigo-100 dark:border-indigo-800/50 transform transition hover:scale-105'>
                            <span className='text-3xl filter drop-shadow-sm'>🏦</span>
                        </div>
                        <h3 className='text-2xl font-black text-gray-900 dark:text-gray-100 mb-1.5'>
                            Yêu cầu hoàn tiền
                        </h3>
                        <p className='text-gray-500 dark:text-gray-400 text-sm'>
                            Vui lòng nhập thông tin tài khoản ngân hàng để nhận tiền
                        </p>
                    </div>
                </div>

                {/* Content Section */}
                <div className='px-6 pt-5 pb-7 bg-white dark:bg-gray-800'>
                    <div className='space-y-4'>
                        <div>
                            <span className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5'>Số tài khoản <span className="text-red-500">*</span></span>
                            <Input
                                size="large"
                                className="rounded-xl bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 hover:border-indigo-300 focus:border-indigo-500"
                                value={refundForm.accountNumber}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '');
                                    setRefundForm((prev) => ({ ...prev, accountNumber: value }));
                                }}
                                placeholder='VD: 0123456789'
                            />
                        </div>

                        <div>
                            <span className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5'>Tên chủ tài khoản <span className="text-red-500">*</span></span>
                            <Input
                                size="large"
                                className="rounded-xl bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 hover:border-indigo-300 focus:border-indigo-500"
                                value={refundForm.accountName}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[0-9]/g, '');
                                    setRefundForm((prev) => ({ ...prev, accountName: value }));
                                }}
                                placeholder='VD: NGUYEN VAN A'
                            />
                        </div>

                        <div>
                            <span className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5'>Ngân hàng <span className="text-red-500">*</span></span>
                            <Input
                                size="large"
                                className="rounded-xl bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 hover:border-indigo-300 focus:border-indigo-500"
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
                            <span className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5'>Ghi chú thêm (không bắt buộc)</span>
                            <Input.TextArea
                                className="rounded-xl bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 hover:border-indigo-300 focus:border-indigo-500"
                                rows={3}
                                maxLength={300}
                                showCount
                                value={refundForm.note}
                                onChange={(e) =>
                                    setRefundForm((prev) => ({ ...prev, note: e.target.value }))
                                }
                                placeholder='VD: Chuyển giúp em trong giờ hành chính...'
                            />
                            <div className="mt-8"></div> {/* Spacer for absolute counter */}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className='flex gap-3 mt-2'>
                        <Button 
                            className='w-1/3 h-12 rounded-xl text-gray-600 font-semibold border-gray-200 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-600 dark:bg-transparent outline-none shadow-none transition-all duration-200 flex items-center justify-center'
                            onClick={closeRefundModal}
                        >
                            Hủy bỏ
                        </Button>
                        <Button 
                            className='flex-1 h-12 rounded-xl font-bold bg-linear-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transform hover:-translate-y-0.5 text-white border-none transition-all duration-200 outline-none flex items-center justify-center gap-1.5'
                            onClick={handleSubmitRefund}
                        >
                            <span>Gửi yêu cầu hoàn tiền</span>
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* MODAL CHỌN PHƯƠNG THỨC THANH TOÁN KHI RETRY */}
            <Modal
                centered
                open={isRetryMethodModalOpen}
                onCancel={() => {
                    setIsRetryMethodModalOpen(false);
                    setPayingBookingId(null);
                }}
                footer={null}
                title={null}
                width={480}
                className='p-0! overflow-hidden rounded-2xl'
                styles={{
                    body: { padding: 0 },
                    content: { padding: 0, borderRadius: '16px', overflow: 'hidden' },
                }}
                closeIcon={
                    <div className='w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 transition-colors z-100'>
                        <span className='text-gray-600 dark:text-gray-300 font-bold'>✕</span>
                    </div>
                }
            >
                {/* Header Section */}
                <div className='bg-linear-to-br from-emerald-50 to-green-100 dark:from-emerald-900/30 dark:to-green-900/20 pt-10 pb-6 px-6 relative overflow-hidden text-center'>
                    {/* Top colored border */}
                    <div className='absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-emerald-400 via-green-500 to-emerald-400'></div>
                    
                    {/* Header Decorative Elements */}
                    <div className='absolute -top-10 -right-10 w-32 h-32 bg-emerald-200/40 dark:bg-emerald-700/20 rounded-full blur-2xl'></div>
                    <div className='absolute -bottom-10 -left-10 w-32 h-32 bg-green-200/40 dark:bg-green-700/20 rounded-full blur-2xl'></div>
                    
                    <div className='relative z-10 flex flex-col items-center'>
                        <div className='w-16 h-16 bg-white dark:bg-gray-800 rounded-full shadow-md mx-auto flex items-center justify-center mb-4 border-2 border-emerald-100 dark:border-emerald-800/50 transform transition hover:scale-105'>
                            <span className='text-3xl filter drop-shadow-sm'>💳</span>
                        </div>
                        <h3 className='text-2xl font-black text-gray-900 dark:text-gray-100 mb-1.5'>
                            Thanh toán đơn hàng
                        </h3>
                        <p className='text-gray-500 dark:text-gray-400 text-sm'>
                            Vui lòng chọn phương thức thanh toán để tiếp tục
                        </p>
                    </div>
                </div>

                {/* Content Section */}
                <div className='px-6 pt-5 pb-7 bg-white dark:bg-gray-800'>
                    {/* Amount info */}
                    <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl mb-6 border border-gray-100 dark:border-gray-700/50'>
                        <span className='text-gray-600 dark:text-gray-400 font-medium'>Số tiền cần thanh toán</span>
                        <span className='text-xl font-black text-emerald-600 dark:text-emerald-400'>
                            {retryAmount.toLocaleString('vi-VN')} VNĐ
                        </span>
                    </div>

                    <div className='space-y-3 mb-8'>
                        {[
                            { value: 'vnpay', label: 'Thanh toán qua VNPay', desc: 'Thẻ nội địa, thẻ quốc tế, quét mã QR', iconImage: 'https://vnpay.vn/s1/statics.vnpay.vn/2023/6/0oxhzjmxbksr1686814746087.png' },
                            { value: 'zalopay', label: 'Thanh toán qua ZaloPay', desc: 'Ví ZaloPay, thẻ ATM, thẻ quốc tế', iconImage: 'https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-ZaloPay-Square.png' },
                        ].map((method) => (
                            <label
                                key={method.value}
                                className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                                    retryMethod === method.value
                                        ? 'border-emerald-500 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-900/20 shadow-sm shadow-emerald-500/10'
                                        : 'border-gray-100 dark:border-gray-700 hover:border-emerald-200 hover:bg-emerald-50/30 dark:hover:border-emerald-800'
                                }`}
                            >
                                <div className='pt-1'>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                        retryMethod === method.value ? 'border-emerald-500' : 'border-gray-300 dark:border-gray-600'
                                    }`}>
                                        <div className={`w-2.5 h-2.5 rounded-full transition-transform duration-200 ${
                                            retryMethod === method.value ? 'bg-emerald-500 scale-100' : 'bg-transparent scale-0'
                                        }`}></div>
                                    </div>
                                    <input
                                        type='radio'
                                        value={method.value}
                                        checked={retryMethod === method.value}
                                        onChange={() => setRetryMethod(method.value as 'vnpay' | 'zalopay')}
                                        className='hidden'
                                        name='retryMethod'
                                    />
                                </div>
                                <div className='flex items-center gap-4 flex-1'>
                                    <div className='w-12 h-12 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden shadow-xs flex items-center justify-center p-2 shrink-0'>
                                        <img src={method.iconImage} alt={method.label} className='w-full h-full object-contain' />
                                    </div>
                                    <div>
                                        <h4 className={`font-bold transition-colors ${
                                            retryMethod === method.value ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'
                                        }`}>{method.label}</h4>
                                        <p className='text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed'>{method.desc}</p>
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className='flex gap-3'>
                        <Button 
                            className='w-1/3 h-12 rounded-xl text-gray-600 font-semibold border-gray-200 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-600 dark:bg-transparent outline-none shadow-none transition-all duration-200 flex items-center justify-center'
                            onClick={() => {
                                setIsRetryMethodModalOpen(false);
                                setPayingBookingId(null);
                            }}
                        >
                            Hủy bỏ
                        </Button>
                        <Button 
                            className='flex-1 h-12 rounded-xl font-bold bg-linear-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transform hover:-translate-y-0.5 text-white border-none transition-all duration-200 outline-none flex items-center justify-center gap-1.5'
                            onClick={confirmRetryPayment}
                        >
                            <span>Thanh toán</span>
                            <span className='w-1 h-1 bg-white/70 rounded-full mx-0.5'></span>
                            <span>{retryMethod === 'vnpay' ? 'VNPay' : 'ZaloPay'}</span>
                        </Button>
                    </div>
                </div>
            </Modal>
            {/* MODAL QR THANH TOÁN THỦ CÔNG */}
            <Modal
                title={
                    <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-400 font-black text-lg">
                        <span>📲 Quét mã bằng ứng dụng ZaloPay / Ngân hàng</span>
                    </div>
                }
                open={showQrModal}
                onCancel={() => setShowQrModal(false)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setShowQrModal(false)} className="bg-blue-600 hover:bg-blue-500 font-bold px-8">
                        Đã thanh toán xong
                    </Button>
                ]}
                centered
                width={400}
            >
                <div className="flex flex-col items-center justify-center p-2">
                    {qrData ? (
                        <>
                            <div className="bg-white p-2 rounded-xl shadow-md border border-gray-100">
                                <img src={qrData.image} alt="QR Code" className="w-60 h-60 object-contain" />
                            </div>
                            
                            <div className="mt-4 w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-500 dark:text-slate-400">Ngân hàng:</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{qrData.bankName}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-500 dark:text-slate-400">Chủ tài khoản:</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{qrData.accountName}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-500 dark:text-slate-400">Số tài khoản:</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-blue-600 dark:text-blue-400 tracking-wider">{qrData.accountNo}</span>
                                            <Button 
                                                type="text" 
                                                size="small" 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(qrData.accountNo || '');
                                                    toast.success('Đã copy số tài khoản!');
                                                }}
                                                className="text-blue-600 hover:bg-blue-50"
                                            >
                                                Copy
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-500 dark:text-slate-400">Nội dung:</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-medium text-slate-800 dark:text-slate-200 text-xs max-w-[150px] truncate">{qrData.addInfo}</span>
                                            <Button 
                                                type="text" 
                                                size="small" 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(qrData.addInfo || '');
                                                    toast.success('Đã copy nội dung!');
                                                }}
                                                className="text-blue-600 hover:bg-blue-50"
                                            >
                                                Copy
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Số tiền:</span>
                                        <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                                            {qrData.amount.toLocaleString('vi-VN')} đ
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <Spin />
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default MyBookings;
