import { useEffect, useState, useRef, useMemo } from 'react';
import api from '@/common/utils/api';
import { printInvoiceMira } from '@/common/utils/printInvoice';
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
    Modal,
    Tabs,
    Form,
    Spin,
    Upload,
    Tooltip,
    Checkbox,
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
    EyeOutlined,
    EditOutlined,
    UploadOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import { io } from 'socket.io-client';

dayjs.locale('vi');

const { TextArea } = Input;

// helper format tiền
const formatVND = (v: number = 0) =>
    v.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

interface Booking {
    _id: string;
    code: string;
    customerId?: {
        _id?: string;
        username?: string;
        name?: string;
        phone?: string;
        email?: string;
    };
    customerInfo?: {
        name?: string;
        phone?: string;
        email?: string;
    };
    courtId?: { _id: string; name: string };
    date: string;
    startTime: string;
    endTime: string;
    total: number;
    createdBy: 'admin' | 'user';
    status: string;
    paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded';
    paymentMethod?: string;
    createdAt?: string;

    cancelReason?: string;
    refundStatus?: 'none' | 'pending' | 'processing' | 'refunded' | 'rejected';
    refundAccountNumber?: string;
    refundAccountName?: string;
    refundBankName?: string;
    refundNote?: string;

    fieldAmount?: number;
    equipmentTotal?: number;

    // thông tin cọc / đã thanh toán trước
    depositAmount?: number;
    depositStatus?: 'pending' | 'paid' | 'refunded' | 'forfeited';
    depositMethod?: string;

    // thông tin hoàn tiền từ admin (optional)
    refund?: {
        adminReason?: string;
        billImage?: string;
    };
    refundAdminReason?: string;
    refundBillImage?: string;
}

interface DashboardStats {
    total: number;
    pending: number;
    confirmed: number;
    inUse: number;
    completed: number;
    cancelled: number;
}

interface CourtOption {
    _id: string;
    name: string;
}

//  CẤU HÌNH KHUNG GIỜ
const START_HOUR = 6;
const SLOT_DURATION = 60;
const BREAK_DURATION = 15;
const END_HOUR = 22;

const minToTime = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const timeToMin = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const generateTimeSlots = () => {
    const slots: { start: string; end: string }[] = [];
    let current = START_HOUR * 60;
    const endDay = END_HOUR * 60;

    while (current + SLOT_DURATION <= endDay) {
        const start = minToTime(current);
        const end = minToTime(current + SLOT_DURATION);
        slots.push({ start, end });
        current += SLOT_DURATION + BREAK_DURATION;
    }
    return slots;
};

const TIME_SLOTS = generateTimeSlots();

const countSlotsInRange = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startMin = timeToMin(start);
    const endMin = timeToMin(end);

    return TIME_SLOTS.filter((slot) => {
        const s = timeToMin(slot.start);
        const e = timeToMin(slot.end);
        return s >= startMin && e <= endMin;
    }).length;
};

const getBreakMinutes = (start: string, end: string) => {
    const slotCount = countSlotsInRange(start, end);
    if (slotCount <= 1) return 0;
    return (slotCount - 1) * BREAK_DURATION;
};

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

// text hiển thị phương thức thanh toán cho hóa đơn
const PAYMENT_METHOD_TEXT: Record<string, string> = {
    cash: 'Tiền mặt',
    transfer: 'Chuyển khoản',
    momo: 'Momo',
    vnpay: 'VNPAY',
    qr: 'Quẹt thẻ / QR',
};

const REFUND_LABELS: Record<string, string> = {
    none: 'Không có hoàn tiền',
    pending: 'Đang chờ xử lý hoàn tiền',
    processing: 'Đang hoàn tiền',
    refunded: 'Hoàn tiền xong',
    rejected: 'Từ chối hoàn tiền',
};

const REFUND_COLORS: Record<string, string> = {
    none: 'default',
    pending: 'orange',
    processing: 'blue',
    refunded: 'green',
    rejected: 'red',
};

type RefundFilter = 'all' | 'pending' | 'processing' | 'refunded' | 'rejected';

const REFUND_OPTIONS: { value: Exclude<RefundFilter, 'all'>; label: string }[] = [
    { value: 'pending', label: 'Đang chờ xử lý hoàn tiền' },
    { value: 'processing', label: 'Đang hoàn tiền' },
    { value: 'refunded', label: 'Hoàn tiền xong' },
    { value: 'rejected', label: 'Từ chối hoàn tiền' },
];

const getRefundActionOptions = (current: Booking['refundStatus'] | undefined) => {
    const cur: Exclude<RefundFilter, 'all'> = (current as any) || 'pending';

    return REFUND_OPTIONS.map((opt) => {
        let disabled = false;

        if (cur === 'processing' && opt.value === 'pending') disabled = true;
        if (cur === 'refunded' && opt.value !== 'refunded') disabled = true;
        if (cur === 'rejected' && opt.value !== 'rejected') disabled = true;

        return { ...opt, disabled };
    });
};

//  THIẾT BỊ KHI CHECK-IN
interface EquipmentItem {
    key: string;
    equipmentId: string;
    name: string;
    mode: 'rent' | 'sell';
    price: number;
    stock: number;
    unit?: string;
}

// số tiền còn phải thu (total - cọc đã trả)
const getOutstandingAmount = (b: Booking | null) => {
    if (!b) return 0;
    const total = Number(b.total || 0);
    const deposit = Number(b.depositAmount || 0);
    return Math.max(0, total - deposit);
};
// xác định thiết bị thuê hay bán
const getModeText = (mode?: string | null) => {
    if (mode === 'rent') return 'Thuê';
    if (mode === 'sell') return 'Bán';
    return '';
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
    const [courts, setCourts] = useState<CourtOption[]>([]);
    const [loading, setLoading] = useState(false);

    const [filters, setFilters] = useState({
        search: '',
        status: '',
        date: null as any,
    });

    const [refundFilter, setRefundFilter] = useState<RefundFilter>('all');

    // modal hoàn tiền (xem info ngân hàng / chi tiết admin)
    const [refundModalOpen, setRefundModalOpen] = useState(false);
    const [refundModalMode, setRefundModalMode] = useState<'account' | 'admin'>('account');
    const [selectedRefundBooking, setSelectedRefundBooking] = useState<Booking | null>(null);

    // modal sửa giờ/sân
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
    const [editValues, setEditValues] = useState<{
        courtId?: string;
        date: any;
        startTime: string;
        endTime: string;
        priceInfo?: {
            fieldAmount: number;
            equipmentTotal: number;
            discountTotal: number;
            total: number;
            totalHours: number;
            normalHours: number;
            peakHours: number;
        };
    }>({
        courtId: undefined,
        date: null,
        startTime: '',
        endTime: '',
        priceInfo: undefined,
    });

    // modal checkin / thêm thiết bị
    const [checkinModalOpen, setCheckinModalOpen] = useState(false);
    const [checkinBooking, setCheckinBooking] = useState<Booking | null>(null);
    const [checkinMode, setCheckinMode] = useState<'checkin' | 'add_equipment'>('checkin');
    const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
    const [equipmentQty, setEquipmentQty] = useState<Record<string, number>>({});
    const [equipmentBaseQty, setEquipmentBaseQty] = useState<Record<string, number>>({});

    // modal thanh toán
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentForm] = Form.useForm();
    const [paymentDiscount, setPaymentDiscount] = useState<number>(0);
    // modal sate ỦY ĐƠN TIỀN MẶT (admin)
    const [cancelRefundDeposit, setCancelRefundDeposit] = useState(false);
    const [cancelAdminReason, setCancelAdminReason] = useState('');

    // modal hóa đơn
    const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const [invoiceDetail, setInvoiceDetail] = useState<any | null>(null);
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const invoicePrintRef = useRef<HTMLDivElement | null>(null);

    // modal chi tiết đơn đang sử dụng (thiết bị)
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailData, setDetailData] = useState<{
        booking: Booking;
        items: {
            _id: string;
            name: string;
            mode: 'rent' | 'sell';
            qty: number;
            price: number;
            subtotal: number;
            unit?: string;
        }[];
    } | null>(null);

    // modal từ chối hoàn tiền
    const [rejectModal, setRejectModal] = useState<{
        open: boolean;
        booking: Booking | null;
    }>({ open: false, booking: null });
    const [rejectReason, setRejectReason] = useState('');

    // modal upload bill hoàn tiền
    const [billModal, setBillModal] = useState<{
        open: boolean;
        booking: Booking | null;
    }>({ open: false, booking: null });
    const [billFileList, setBillFileList] = useState<any[]>([]);
    const [billUploading, setBillUploading] = useState(false);

    // Gộp các thiết bị trong detail (xem chi tiết đơn in_use)
    const mergedDetailItems = useMemo(() => {
        if (!detailData?.items) return [];

        const map: Record<string, (typeof detailData.items)[number]> = {};

        detailData.items.forEach((it) => {
            const key = `${it.name}_${it.mode}_${it.price}_${it.unit || ''}`;
            if (map[key]) {
                map[key] = {
                    ...map[key],
                    qty: map[key].qty + it.qty,
                    subtotal: map[key].subtotal + it.subtotal,
                };
            } else {
                map[key] = { ...it };
            }
        });

        return Object.values(map);
    }, [detailData]);

    const getEditDateStr = () => {
        if (!editValues.date) return null;
        return dayjs(editValues.date).format('YYYY-MM-DD');
    };

    const isSlotPast = (slotStart: string) => {
        const dateStr = getEditDateStr();
        if (!dateStr) return false;

        const todayStr = dayjs().format('YYYY-MM-DD');
        if (dateStr > todayStr) return false;
        if (dateStr < todayStr) return true;

        const [h, m] = slotStart.split(':').map(Number);
        const now = new Date();
        const slotTime = new Date();
        slotTime.setHours(h, m, 0, 0);
        return slotTime < now;
    };

    const getBookedSlotsForCurrentEdit = () => {
        if (!editValues.courtId || !editValues.date) return [];
        const dateStr = getEditDateStr();
        if (!dateStr) return [];

        return bookings
            .filter((b) => {
                if (!b.courtId || b.courtId._id !== editValues.courtId) return false;
                if (editingBooking && b._id === editingBooking._id) return false;
                if (b.status === 'cancelled') return false;
                const bDateStr = dayjs(b.date).format('YYYY-MM-DD');
                return bDateStr === dateStr;
            })
            .map((b) => ({
                startTime: b.startTime,
                endTime: b.endTime,
            }));
    };

    const isSlotBooked = (s: string, e: string) => {
        const sMin = timeToMin(s);
        const eMin = timeToMin(e);
        const booked = getBookedSlotsForCurrentEdit();
        return booked.some((b) => {
            const bS = timeToMin(b.startTime);
            const bE = timeToMin(b.endTime);
            return sMin < bE && eMin > bS;
        });
    };

    const checkConflictRange = (start: string, end: string) => {
        const startMin = timeToMin(start);
        const endMin = timeToMin(end);
        const slotsInRange = TIME_SLOTS.filter((slot) => {
            const slotS = timeToMin(slot.start);
            const slotE = timeToMin(slot.end);
            return slotS >= startMin && slotE <= endMin;
        });
        return slotsInRange.some((slot) => isSlotBooked(slot.start, slot.end));
    };

    const isSlotSelected = (s: string, e: string) => {
        if (!editValues.startTime || !editValues.endTime) return false;

        const sMin = timeToMin(s);
        const eMin = timeToMin(e);
        const rStart = timeToMin(editValues.startTime);
        const rEnd = timeToMin(editValues.endTime);

        return sMin >= rStart && eMin <= rEnd;
    };

    const handleSlotClickEdit = (s: string, e: string) => {
        if (!editValues.courtId || !editValues.date) {
            toast.error('Vui lòng chọn sân và ngày trước khi chọn giờ!');
            return;
        }

        if (isSlotPast(s) || isSlotBooked(s, e)) return;

        setEditValues((prev) => {
            let next = { ...prev };

            if (!next.startTime) {
                if (checkConflictRange(s, e)) {
                    toast.error('Khoảng chọn bị vướng lịch đã đặt!');
                    return prev;
                }
                next.startTime = s;
                next.endTime = e;
            } else {
                const sMin = timeToMin(s);
                const rStart = timeToMin(next.startTime);
                const isSingle =
                    TIME_SLOTS.find((t) => t.start === next.startTime)?.end === next.endTime;

                if (s === next.startTime && e === next.endTime) {
                    next.startTime = '';
                    next.endTime = '';
                } else if (isSingle) {
                    if (sMin > rStart) {
                        if (checkConflictRange(next.startTime, e)) {
                            toast.error('Khoảng chọn bị vướng lịch đã đặt!');
                            return prev;
                        }
                        next.endTime = e;
                    } else if (sMin < rStart) {
                        if (checkConflictRange(s, next.endTime)) {
                            toast.error('Khoảng chọn bị vướng lịch đã đặt!');
                            return prev;
                        }
                        next.startTime = s;
                    } else {
                        if (checkConflictRange(s, e)) {
                            toast.error('Khoảng chọn bị vướng lịch đã đặt!');
                            return prev;
                        }
                        next.startTime = s;
                        next.endTime = e;
                    }
                } else {
                    if (checkConflictRange(s, e)) {
                        toast.error('Khoảng chọn bị vướng lịch đã đặt!');
                        return prev;
                    }
                    next.startTime = s;
                    next.endTime = e;
                }
            }

            if (next.courtId && next.startTime && next.endTime) {
                calculateEditPrice({
                    courtId: next.courtId,
                    startTime: next.startTime,
                    endTime: next.endTime,
                });
            } else {
                next.priceInfo = undefined;
            }

            return next;
        });
    };

    // load danh sách thiết bị + số lượng đã thuê trước đó
    const loadCheckinEquipments = async (bookingId?: string) => {
        try {
            const equipRes = await api.get('/equipments');
            const rawEquipments = equipRes.data?.data || equipRes.data || [];

            // nếu có bookingId -> lấy BookingItem hiện tại
            let baseQty: Record<string, number> = {};
            if (bookingId) {
                try {
                    const itemsRes = await api.get(`/bookings/${bookingId}/equipments-detail`);
                    const items = itemsRes.data?.data || [];

                    items.forEach((it: any) => {
                        const mode: 'rent' | 'sell' = it.mode === 'sell' ? 'sell' : 'rent';
                        const eqId =
                            typeof it.equipmentId === 'string'
                                ? it.equipmentId
                                : it.equipmentId?._id || it.equipmentId?.id;

                        if (!eqId) return;
                        const key = `${eqId}_${mode}`;
                        baseQty[key] = (baseQty[key] || 0) + (it.qty || 0);
                    });
                } catch (err) {
                    console.error('Không lấy được thiết bị đã thuê:', err);
                }
            }

            const equipments: EquipmentItem[] = [];

            rawEquipments.forEach((e: any) => {
                const unit = e.unit || 'cái';
                const stock = e.availableQuantity ?? e.stockLeft ?? e.stock ?? e.totalQuantity ?? 0;

                if (e.mode === 'rent' || e.mode === 'both') {
                    if (e.rentPrice && e.rentPrice > 0) {
                        equipments.push({
                            key: `${e._id}_rent`,
                            equipmentId: e._id,
                            name: e.name,
                            mode: 'rent',
                            price: e.rentPrice,
                            stock,
                            unit,
                        });
                    }
                }

                if (e.mode === 'sell' || e.mode === 'both') {
                    if (e.salePrice && e.salePrice > 0) {
                        equipments.push({
                            key: `${e._id}_sell`,
                            equipmentId: e._id,
                            name: e.name,
                            mode: 'sell',
                            price: e.salePrice,
                            stock,
                            unit,
                        });
                    }
                }
            });

            setEquipmentList(equipments);
            setEquipmentBaseQty(baseQty);
            setEquipmentQty(baseQty);
        } catch (err) {
            console.error(err);
            toast.error('Không thể tải danh sách thiết bị!');
            setEquipmentList([]);
            setEquipmentQty({});
            setEquipmentBaseQty({});
        }
    };

    const openCheckinModal = async (b: Booking, mode: 'checkin' | 'add_equipment' = 'checkin') => {
        setCheckinBooking(b);
        setCheckinMode(mode);
        setCheckinModalOpen(true);
        setEquipmentQty({});
        await loadCheckinEquipments(b._id);
    };

    const changeEquipmentQty = (key: string, delta: number, maxStock: number) => {
        setEquipmentQty((prev) => {
            const current = prev[key] ?? 0;
            const base = equipmentBaseQty[key] || 0;
            let next = current + delta;

            if (next < base) next = base;
            const maxTotal = base + maxStock;
            if (next > maxTotal) next = maxTotal;

            return { ...prev, [key]: next };
        });
    };

    // tính tiền thiết bị mới thêm lần này
    const addedEquipmentTotal = equipmentList.reduce((sum, item) => {
        const totalQty = equipmentQty[item.key] || 0;
        const base = equipmentBaseQty[item.key] || 0;
        const addQty = Math.max(0, totalQty - base);
        return sum + addQty * item.price;
    }, 0);

    const oldEquipmentTotal = checkinBooking?.equipmentTotal || 0;
    const newEquipmentTotal = oldEquipmentTotal + addedEquipmentTotal;

    const handleConfirmCheckin = async () => {
        if (!checkinBooking) return;

        const items = equipmentList
            .map((item) => {
                const totalQty = equipmentQty[item.key] || 0;
                const base = equipmentBaseQty[item.key] || 0;
                const qty = Math.max(0, totalQty - base); // chỉ phần thêm mới

                if (qty <= 0) return null;

                return {
                    equipmentId: item.equipmentId,
                    mode: item.mode,
                    qty,
                    price: item.price,
                };
            })
            .filter(
                (
                    i
                ): i is {
                    equipmentId: string;
                    mode: 'rent' | 'sell';
                    qty: number;
                    price: number;
                } => Boolean(i)
            );

        try {
            const url =
                checkinMode === 'checkin'
                    ? `/bookings/${checkinBooking._id}/checkin`
                    : `/bookings/${checkinBooking._id}/equipments`;

            await api.patch(url, {
                items,
                equipmentTotal: addedEquipmentTotal,
            });

            toast.success(
                checkinMode === 'checkin'
                    ? '📦 Check-in thành công, đã cộng tiền thiết bị và trừ tồn kho!'
                    : '📦 Đã thêm thiết bị cho đơn đang sử dụng!'
            );

            setCheckinModalOpen(false);
            setCheckinBooking(null);
            setEquipmentQty({});
            fetchBookings();
            fetchStats();
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Lỗi check-in / cập nhật thiết bị!';
            toast.error(msg);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/bookings/admin/dashboard');
            setStats(res.data.data || {});
        } catch {
            toast.error('Không thể tải thống kê!');
        }
    };

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const res = await api.get('/bookings');
            const rawList: Booking[] = res.data.data || [];

            const list = rawList.map((b) => {
                const hasDepositPaid = (b.depositAmount || 0) > 0 && b.depositStatus === 'paid';
                const deposit = Number(b.depositAmount || 0);
                const total = Number(b.total || 0);

                let paymentStatus: Booking['paymentStatus'] = (b.paymentStatus as any) || 'unpaid';

                if (paymentStatus === 'unpaid' || paymentStatus === 'partial') {
                    if (hasDepositPaid) {
                        if (total > 0 && deposit >= total) {
                            paymentStatus = 'paid';
                        } else {
                            paymentStatus = 'partial';
                        }
                    }
                }

                return {
                    ...b,
                    paymentStatus,
                };
            });

            const sorted = [...list].sort((a, b) => {
                const at = new Date(a.createdAt || a.date).getTime();
                const bt = new Date(b.createdAt || b.date).getTime();
                return bt - at;
            });

            setBookings(sorted);
        } catch {
            toast.error('Không thể tải danh sách đặt sân!');
        } finally {
            setLoading(false);
        }
    };

    const fetchCourts = async () => {
        try {
            const res = await api.get('/courts');
            const list: CourtOption[] =
                res.data?.data?.map((c: any) => ({ _id: c._id, name: c.name })) || [];
            setCourts(list);
        } catch {
            toast.error('Không thể tải danh sách sân!');
        }
    };

    useEffect(() => {
        fetchBookings();
        fetchStats();
        fetchCourts();

        const socketInstance = io('http://localhost:3000', {
            transports: ['websocket'],
            withCredentials: true,
        });

        socketInstance.on('booking_global_updated', () => {
            fetchBookings();
            fetchStats();
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

    const showCancelReason = (b: Booking) => {
        Modal.info({
            centered: true,
            title: `Lý do hủy đơn ${b.code}`,
            okText: 'Đóng',
            content: (
                <div>
                    <p>
                        <b>Khách hàng:</b> {b.customerInfo?.name || b.customerId?.name || 'Ẩn danh'}
                    </p>
                    {b.cancelReason ? (
                        <p className='mt-2'>{b.cancelReason}</p>
                    ) : (
                        <p className='mt-2 text-gray-500'>Không có lý do hủy.</p>
                    )}
                </div>
            ),
        });
    };

    const openBookingDetailModal = async (bookingId: string) => {
        setDetailModalOpen(true);
        setDetailLoading(true);
        setDetailData(null);

        try {
            const res = await api.get(`/bookings/${bookingId}/admin-detail`);
            const data = res.data?.data || res.data;
            setDetailData(data);
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Không thể tải chi tiết đơn đặt sân!';
            toast.error(msg);
            setDetailModalOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const calculateEditPrice = async (values: {
        courtId?: string;
        startTime: string;
        endTime: string;
    }) => {
        if (!values.courtId || !values.startTime || !values.endTime) return;

        try {
            const res = await api.get('/bookings/calculate', {
                params: {
                    courtId: values.courtId,
                    startTime: values.startTime,
                    endTime: values.endTime,
                },
            });
            const data = res.data?.data;
            if (!data) return;

            setEditValues((prev) => ({
                ...prev,
                priceInfo: {
                    fieldAmount: data.fieldAmount,
                    equipmentTotal: data.equipmentTotal,
                    discountTotal: data.discountTotal,
                    total: data.total,
                    totalHours: data.totalHours,
                    normalHours: data.normalHours,
                    peakHours: data.peakHours,
                },
            }));
        } catch (err: any) {
            const msg =
                err?.response?.data?.message || 'Không tính được tiền sân, vui lòng kiểm tra giờ!';
            toast.error(msg);
            setEditValues((prev) => ({ ...prev, priceInfo: undefined }));
        }
    };

    const openEditModal = (b: Booking) => {
        const initial = {
            courtId: b.courtId?._id,
            date: dayjs(b.date),
            startTime: b.startTime,
            endTime: b.endTime,
            priceInfo: undefined as any,
        };
        setEditingBooking(b);
        setEditValues(initial);
        calculateEditPrice(initial);
        setEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingBooking) return;

        const { courtId, date, startTime, endTime } = editValues;

        if (!courtId || !date || !startTime || !endTime) {
            toast.error('Vui lòng chọn sân, ngày và khung giờ hợp lệ!');
            return;
        }

        try {
            await api.patch(`/bookings/${editingBooking._id}/time`, {
                courtId,
                date: dayjs(date).format('YYYY-MM-DD'),
                startTime,
                endTime,
            });

            toast.success('✅ Đã cập nhật giờ / sân!');
            setEditModalOpen(false);
            setEditingBooking(null);
            setEditValues({
                courtId: undefined,
                date: null,
                startTime: '',
                endTime: '',
                priceInfo: undefined,
            });
            fetchBookings();
            fetchStats();
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Lỗi cập nhật giờ / sân!';
            toast.error(msg);
        }
    };
    const handleAdminCancelCash = (record: Booking) => {
        // reset mỗi lần mở modal
        setCancelRefundDeposit(false);
        setCancelAdminReason('');

        Modal.confirm({
            centered: true,
            title: 'Hủy đơn tiền mặt',
            okText: 'Xác nhận hủy',
            cancelText: 'Đóng',
            content: (
                <>
                    <p>
                        Mã đơn: <b>{record.code}</b>
                    </p>
                    <p>
                        Thời gian:{' '}
                        <b>
                            {dayjs(record.date).format('DD/MM/YYYY')} {record.startTime} -{' '}
                            {record.endTime}
                        </b>
                    </p>
                    <p>
                        Tiền cọc: <b>{formatVND(record.depositAmount || 0)}</b>
                    </p>

                    <Checkbox
                        className='mt-2'
                        checked={cancelRefundDeposit}
                        onChange={(e) => setCancelRefundDeposit(e.target.checked)}
                    >
                        Đã hoàn lại tiền (cọc / toàn bộ) cho khách
                    </Checkbox>

                    <TextArea
                        className='mt-2'
                        rows={3}
                        value={cancelAdminReason}
                        onChange={(e) => setCancelAdminReason(e.target.value)}
                        placeholder='Ghi chú lý do hủy / hoàn tiền (tùy chọn)'
                    />
                </>
            ),
            onOk: async () => {
                try {
                    await api.post(`/bookings/${record._id}/admin-cancel-cash`, {
                        refundDeposit: cancelRefundDeposit,
                        adminReason: cancelAdminReason,
                    });

                    toast.success('Đã hủy đơn tiền mặt và cập nhật trạng thái tiền');
                    setCancelRefundDeposit(false);
                    setCancelAdminReason('');

                    fetchBookings();
                    fetchStats();
                } catch (err: any) {
                    const msg = err?.response?.data?.message || 'Lỗi khi hủy đơn tiền mặt!';
                    toast.error(msg);
                    // không cần throw cũng được, modal sẽ tự đóng
                }
            },
        });
    };

    const handleAction = async (
        id: string,
        action: 'confirm' | 'cancel' | 'checkin' | 'checkout' | 'paid'
    ) => {
        try {
            if (action === 'confirm') {
                await api.patch(`/bookings/${id}/confirm`);
                toast.success('✅ Đã xác nhận đặt sân!');
            } else if (action === 'cancel') {
                await api.patch(`/bookings/${id}/cancel`, {
                    reason: 'Admin hủy đơn',
                });
                toast.success('❌ Đã hủy đặt sân!');
            } else if (action === 'paid') {
                await api.patch(`/bookings/${id}`, { paymentStatus: 'paid' });
                toast.success('💵 Đã đánh dấu thanh toán!');
            } else if (action === 'checkin') {
                const booking = bookings.find((b) => b._id === id);
                if (booking) {
                    openCheckinModal(booking, 'checkin');
                }
                return;
            } else if (action === 'checkout') {
                const res = await api.patch(`/bookings/${id}/checkout`);
                toast.success('🏁 Check-out thành công!');
                const update: Booking = res.data?.data || bookings.find((b) => b._id === id)!;
                openPaymentModal(update);
            }

            fetchBookings();
            fetchStats();
        } catch {
            toast.error('Lỗi thao tác!');
        }
    };

    const openPaymentModal = (b: Booking) => {
        setPaymentBooking(b);
        setPaymentDiscount(0);

        paymentForm.setFieldsValue({
            discount: 0,
            discountReason: '',
            method: 'cash',
            note: '',
        });

        setPaymentModalOpen(true);
    };

    const openInvoiceModal = async (b: Booking) => {
        try {
            setInvoiceModalOpen(true);
            setInvoiceLoading(true);
            setInvoiceDetail(null);

            const res = await api.get(`/invoices/by-booking/${b._id}`);
            setInvoiceDetail(res.data);
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Không thể tải thông tin hóa đơn!';
            toast.error(msg);
            setInvoiceModalOpen(false);
        } finally {
            setInvoiceLoading(false);
        }
    };

    const handleConfirmPayment = async () => {
        if (!paymentBooking) return;

        try {
            const values = await paymentForm.validateFields();
            const discount = Number(values.discount || 0) || 0;

            setPaymentLoading(true);

            try {
                await api.post('/invoices', {
                    bookingId: paymentBooking._id,
                    discount,
                    method: values.method,
                    note: values.note || values.discountReason || '',
                });

                toast.success('💰 Đã tạo hóa đơn thanh toán!');
                setPaymentModalOpen(false);
                setPaymentBooking(null);
                paymentForm.resetFields();
                fetchBookings();
                fetchStats();
            } catch (err: any) {
                const msg =
                    err?.response?.data?.message || 'Lỗi tạo hóa đơn / cập nhật thanh toán!';
                toast.error(msg);
            } finally {
                setPaymentLoading(false);
            }
        } catch {
            // lỗi validate form
        }
    };

    const handleRefundStatusChange = async (id: string, status: RefundFilter | 'none') => {
        if (status === 'all' || status === 'none') return;
        const booking = bookings.find((b) => b._id === id);
        if (!booking) return;

        if (status === 'rejected') {
            setRejectReason('');
            setRejectModal({ open: true, booking });
            return;
        }

        if (status === 'refunded') {
            setBillFileList([]);
            setBillModal({ open: true, booking });
            return;
        }

        try {
            await api.patch(`/bookings/${id}/refund-status`, {
                status,
                markPaymentRefunded: false,
            });

            toast.success('Cập nhật trạng thái hoàn tiền thành công!');
            fetchBookings();
            fetchStats();
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Lỗi cập nhật trạng thái hoàn tiền!';
            toast.error(msg);
        }
    };

    const submitRejectRefund = async () => {
        if (!rejectModal.booking) return;
        if (!rejectReason.trim()) {
            toast.error('Vui lòng nhập lý do từ chối hoàn tiền');
            return;
        }

        try {
            await api.post(`/bookings/${rejectModal.booking._id}/refund/reject`, {
                reason: rejectReason.trim(),
            });

            toast.success('Đã từ chối yêu cầu hoàn tiền');
            setRejectModal({ open: false, booking: null });
            setRejectReason('');
            fetchBookings();
            fetchStats();
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Lỗi khi từ chối hoàn tiền!';
            toast.error(msg);
        }
    };

    const submitCompleteRefund = async () => {
        if (!billModal.booking) return;

        try {
            setBillUploading(true);

            if (!billFileList.length) {
                toast.error('Vui lòng chọn ảnh hoá đơn/bill hoàn tiền');
                setBillUploading(false);
                return;
            }

            const file = billFileList[0].originFileObj as File;
            if (!file) {
                toast.error('File ảnh không hợp lệ, vui lòng chọn lại!');
                setBillUploading(false);
                return;
            }

            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await api.post('/upload/single', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const imageUrl =
                uploadRes.data?.url ||
                uploadRes.data?.data?.url ||
                uploadRes.data?.secure_url ||
                '';

            if (!imageUrl) {
                toast.error('Upload ảnh bill thất bại, vui lòng thử lại!');
                setBillUploading(false);
                return;
            }

            await api.post(`/bookings/${billModal.booking._id}/refund/complete`, {
                billImage: imageUrl,
            });

            toast.success('Đã cập nhật hoàn tiền thành công');
            setBillModal({ open: false, booking: null });
            setBillFileList([]);
            fetchBookings();
            fetchStats();
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Lỗi khi cập nhật hoàn tiền!';
            toast.error(msg);
        } finally {
            setBillUploading(false);
        }
    };

    const filteredBookings = bookings.filter((b) => {
        const search = filters.search.toLowerCase();
        const fullName = (b.customerId?.name ||
            b.customerId?.username ||
            b.customerInfo?.name ||
            '') as string;

        const matchesSearch =
            b.code.toLowerCase().includes(search) || fullName.toLowerCase().includes(search);

        const matchesStatus = filters.status ? b.status === filters.status : true;
        const matchesDate = filters.date ? dayjs(b.date).isSame(filters.date, 'day') : true;
        return matchesSearch && matchesStatus && matchesDate;
    });

    const refundBase = bookings.filter((b) => b.refundStatus && b.refundStatus !== 'none');

    const filteredRefundBookings = refundBase.filter((b) => {
        const search = filters.search.toLowerCase();
        const fullName = (b.customerId?.name ||
            b.customerId?.username ||
            b.customerInfo?.name ||
            '') as string;

        const matchesSearch =
            b.code.toLowerCase().includes(search) || fullName.toLowerCase().includes(search);

        const matchesDate = filters.date ? dayjs(b.date).isSame(filters.date, 'day') : true;

        const rs = b.refundStatus || 'none';
        const matchesRefundFilter = refundFilter === 'all' ? true : rs === refundFilter;

        return matchesSearch && matchesDate && matchesRefundFilter;
    });

    const bookingColumns = [
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
            render: (b: Booking) => {
                const name =
                    b.customerInfo?.name ||
                    b.customerId?.name ||
                    b.customerId?.username ||
                    'Ẩn danh';

                const phone = b.customerInfo?.phone || b.customerId?.phone;
                const email = b.customerInfo?.email || b.customerId?.email;

                return (
                    <div>
                        <b>{name}</b>
                        {phone && (
                            <>
                                <br />
                                <span className='text-xs text-gray-500'>{phone}</span>
                            </>
                        )}
                        {email && (
                            <>
                                <br />
                                <span className='text-xs text-gray-400'>{email}</span>
                            </>
                        )}
                    </div>
                );
            },
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
            render: (t: number) => (t ? formatVND(t) : '-'),
        },
        {
            title: 'Thanh toán',
            dataIndex: 'paymentStatus',
            render: (_: any, record: Booking) => {
                const s = record.paymentStatus;
                const deposit = Number(record.depositAmount || 0);
                const fieldAmount = Number(record.fieldAmount || 0);
                const hasDepositPaid = record.depositStatus === 'paid' && deposit > 0;

                let color: string = 'red';
                if (s === 'paid' || s === 'refunded') color = 'green';
                else if (s === 'partial') color = 'orange';

                //  Đơn đã đặt cọc (PARTIAL + depositStatus = paid)
                if (s === 'partial' && hasDepositPaid) {
                    const percent =
                        fieldAmount > 0 ? Math.round((deposit / fieldAmount) * 100) : 50;

                    return <Tag color={color}>Đã đặt cọc {percent}% tiền sân</Tag>;
                }

                return <Tag color={color}>{PAYMENT_LABELS[s] || s}</Tag>;
            },
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
            title: 'Thao tác',
            key: 'actions',
            render: (b: Booking) => {
                const isFutureBooking = dayjs(b.date).isAfter(dayjs(), 'day');

                if (b.status === 'cancelled') {
                    return (
                        <Tag color='default'>
                            <CloseCircleOutlined /> Đã hủy
                        </Tag>
                    );
                }

                if (b.status === 'completed') {
                    const canPay = b.paymentStatus === 'unpaid' || b.paymentStatus === 'partial';

                    if (canPay) {
                        return (
                            <Button
                                size='small'
                                icon={<DollarOutlined />}
                                onClick={() => openPaymentModal(b)}
                            >
                                Thanh toán
                            </Button>
                        );
                    }

                    return (
                        <Button
                            size='small'
                            icon={<FileTextOutlined />}
                            onClick={() => openInvoiceModal(b)}
                        >
                            Xem hóa đơn
                        </Button>
                    );
                }

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
                                    icon={<EditOutlined />}
                                    onClick={() => openEditModal(b)}
                                >
                                    Sửa
                                </Button>
                                <Button
                                    size='small'
                                    danger
                                    onClick={() => {
                                        if (b.paymentMethod === 'cash') {
                                            // Đơn tiền mặt / COD: dùng luồng admin hủy + hoàn/giữ cọc
                                            handleAdminCancelCash(b);
                                        } else {
                                            //  Đơn online (VNPAY/Momo...): dùng API cancelBooking cũ
                                            handleAction(b._id, 'cancel');
                                        }
                                    }}
                                >
                                    <CloseCircleOutlined /> Hủy
                                </Button>
                            </>
                        )}

                        {b.status === 'confirmed' && (
                            <>
                                <Tooltip
                                    title={
                                        isFutureBooking
                                            ? 'Chỉ được check-in từ 00:00 đúng ngày đá'
                                            : undefined
                                    }
                                >
                                    <span>
                                        <Button
                                            size='small'
                                            icon={<PlayCircleOutlined />}
                                            onClick={() => handleAction(b._id, 'checkin')}
                                            disabled={isFutureBooking}
                                        >
                                            Check-in
                                        </Button>
                                    </span>
                                </Tooltip>

                                <Button
                                    size='small'
                                    icon={<EditOutlined />}
                                    onClick={() => openEditModal(b)}
                                >
                                    Sửa
                                </Button>
                                <Button
                                    size='small'
                                    danger
                                    onClick={() => {
                                        if (b.paymentMethod === 'cash') {
                                            handleAdminCancelCash(b); // đơn tiền mặt / cọc tại sân
                                        } else {
                                            handleAction(b._id, 'cancel'); // online (VNPAY/Momo...) dùng API hủy cũ
                                        }
                                    }}
                                >
                                    Hủy
                                </Button>
                            </>
                        )}

                        {b.status === 'in_use' && (
                            <Space>
                                <Button
                                    size='small'
                                    icon={<EyeOutlined />}
                                    onClick={() => openBookingDetailModal(b._id)}
                                >
                                    Xem chi tiết
                                </Button>
                                <Button
                                    size='small'
                                    icon={<PlusOutlined />}
                                    onClick={() => openCheckinModal(b, 'add_equipment')}
                                >
                                    Thêm thiết bị
                                </Button>
                                <Button
                                    size='small'
                                    icon={<StopOutlined />}
                                    onClick={() => handleAction(b._id, 'checkout')}
                                >
                                    Check-out
                                </Button>
                            </Space>
                        )}
                    </Space>
                );
            },
        },
    ];

    const refundColumns = [
        {
            title: 'Mã đơn',
            dataIndex: 'code',
            key: 'code',
            width: 130,
            render: (v: string) => <b>{v}</b>,
        },
        {
            title: 'Khách hàng',
            key: 'customer',
            render: (b: Booking) => {
                const name =
                    b.customerInfo?.name ||
                    b.customerId?.name ||
                    b.customerId?.username ||
                    'Ẩn danh';

                const phone = b.customerInfo?.phone || b.customerId?.phone;
                const email = b.customerInfo?.email || b.customerId?.email;

                return (
                    <div>
                        <b>{name}</b>
                        {phone && (
                            <>
                                <br />
                                <span className='text-xs text-gray-500'>{phone}</span>
                            </>
                        )}
                        {email && (
                            <>
                                <br />
                                <span className='text-xs text-gray-400'>{email}</span>
                            </>
                        )}
                    </div>
                );
            },
        },

        {
            title: 'Sân',
            key: 'court',
            render: (b: Booking) => b.courtId?.name,
        },
        {
            title: 'Ngày / Giờ',
            key: 'date',
            render: (b: Booking) => (
                <div>
                    <div>{dayjs(b.date).format('DD/MM/YYYY')}</div>
                    <div className='text-xs text-gray-500'>
                        {b.startTime} - {b.endTime}
                    </div>
                </div>
            ),
        },
        {
            title: 'Tổng tiền',
            dataIndex: 'total',
            render: (t: number) => (t ? formatVND(t) : '-'),
        },
        {
            title: 'Thanh toán',
            dataIndex: 'paymentStatus',
            render: (_: any, record: Booking) => {
                const s = record.paymentStatus;
                const deposit = Number(record.depositAmount || 0);
                const fieldAmount = Number(record.fieldAmount || 0);
                const hasDepositPaid = record.depositStatus === 'paid' && deposit > 0;

                let color: string = 'red';
                if (s === 'paid' || s === 'refunded') color = 'green';
                else if (s === 'partial') color = 'orange';

                if (s === 'partial' && hasDepositPaid) {
                    const percent =
                        fieldAmount > 0 ? Math.round((deposit / fieldAmount) * 100) : 50;

                    return <Tag color={color}>Đã đặt cọc {percent}% tiền sân</Tag>;
                }

                return <Tag color={color}>{PAYMENT_LABELS[s] || s}</Tag>;
            },
        },

        {
            title: 'Trạng thái hoàn tiền',
            dataIndex: 'refundStatus',
            key: 'refundStatus',
            render: (rs: Booking['refundStatus']) => {
                const value = rs || 'none';
                return (
                    <Tag color={REFUND_COLORS[value] || 'default'}>
                        {REFUND_LABELS[value] || 'Không có hoàn tiền'}
                    </Tag>
                );
            },
        },
        {
            title: 'Thao tác hoàn tiền',
            key: 'refundActions',
            render: (b: Booking) => {
                const currentStatus: Exclude<RefundFilter, 'all'> =
                    (b.refundStatus as any) || 'pending';

                const options = getRefundActionOptions(b.refundStatus);

                return (
                    <Select
                        size='small'
                        style={{ minWidth: 190 }}
                        value={currentStatus}
                        onChange={(v: RefundFilter) => handleRefundStatusChange(b._id, v)}
                        options={options}
                    />
                );
            },
        },
        {
            title: 'Chi tiết hoàn tiền',
            key: 'refundDetail',
            render: (b: Booking) => {
                const hasAdminDetail = Boolean(
                    b.refund?.adminReason ||
                        b.refund?.billImage ||
                        b.refundAdminReason ||
                        b.refundBillImage
                );

                return (
                    <Button
                        size='small'
                        onClick={() => openRefundModal(b, 'admin')}
                        disabled={!hasAdminDetail}
                    >
                        Xem chi tiết
                    </Button>
                );
            },
        },
        {
            title: 'Thông tin hoàn tiền',
            key: 'refundInfo',
            render: (b: Booking) =>
                b.refundAccountNumber || b.refundAccountName || b.refundBankName || b.refundNote ? (
                    <Button size='small' onClick={() => openRefundModal(b, 'account')}>
                        Xem chi tiết
                    </Button>
                ) : (
                    <span className='text-xs text-gray-400'>-</span>
                ),
        },
        {
            title: 'Lý do hủy',
            key: 'cancelReason',
            render: (b: Booking) =>
                b.cancelReason ? (
                    <Button size='small' icon={<EyeOutlined />} onClick={() => showCancelReason(b)}>
                        Xem
                    </Button>
                ) : (
                    <span className='text-xs text-gray-400'>-</span>
                ),
        },
    ];

    const selectedSlotsCount =
        editValues.startTime && editValues.endTime
            ? countSlotsInRange(editValues.startTime, editValues.endTime)
            : 0;
    const selectedBreakMinutes =
        editValues.startTime && editValues.endTime
            ? getBreakMinutes(editValues.startTime, editValues.endTime)
            : 0;

    // tổng gốc của booking
    const originalTotal = paymentBooking?.total || 0;

    // số tiền đã thanh toán trước (vnpay / đặt cọc)
    const depositPaid =
        paymentBooking && paymentBooking.depositAmount ? paymentBooking.depositAmount : 0;

    // còn phải thu trước khi giảm giá hóa đơn
    const paymentBaseTotal = getOutstandingAmount(paymentBooking);

    // sau khi trừ giảm giá trên hóa đơn
    const paymentFinalTotal = Math.max(0, paymentBaseTotal - (Number(paymentDiscount || 0) || 0));

    // In hóa đơn
    const handlePrintInvoice = () => {
        if (!invoiceDetail) return;
        printInvoiceMira(invoiceDetail);
    };

    const refundCustomerName =
        selectedRefundBooking?.customerInfo?.name ||
        selectedRefundBooking?.customerId?.name ||
        selectedRefundBooking?.customerId?.username ||
        'Ẩn danh';

    const refundCustomerPhone =
        selectedRefundBooking?.customerInfo?.phone ||
        selectedRefundBooking?.customerId?.phone ||
        '';

    const refundCustomerEmail =
        selectedRefundBooking?.customerInfo?.email ||
        selectedRefundBooking?.customerId?.email ||
        '';

    const adminReason =
        selectedRefundBooking?.refund?.adminReason ||
        selectedRefundBooking?.refundAdminReason ||
        '';

    const billImage =
        selectedRefundBooking?.refund?.billImage || selectedRefundBooking?.refundBillImage || '';

    const isAccountMode = refundModalMode === 'account';
    const isAdminMode = refundModalMode === 'admin';

    const openRefundModal = (b: Booking, mode: 'account' | 'admin') => {
        setSelectedRefundBooking(b);
        setRefundModalMode(mode);
        setRefundModalOpen(true);
    };

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

            <Card bordered={false}>
                <Tabs
                    defaultActiveKey='bookings'
                    items={[
                        {
                            key: 'bookings',
                            label: 'Đặt sân',
                            children: (
                                <>
                                    <div className='flex flex-wrap gap-4 mb-4'>
                                        <Input.Search
                                            placeholder='Tìm mã hoặc tên khách hàng...'
                                            onChange={(e) =>
                                                setFilters({
                                                    ...filters,
                                                    search: e.target.value,
                                                })
                                            }
                                            style={{ width: 220 }}
                                        />
                                        <Select
                                            placeholder='Trạng thái đơn'
                                            allowClear
                                            onChange={(v) =>
                                                setFilters({ ...filters, status: v || '' })
                                            }
                                            style={{ width: 180 }}
                                            options={Object.entries(STATUS_LABELS).map(
                                                ([value, label]) => ({
                                                    value,
                                                    label,
                                                })
                                            )}
                                        />
                                        <DatePicker
                                            placeholder='Ngày đặt'
                                            onChange={(v) =>
                                                setFilters({ ...filters, date: v || null })
                                            }
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
                                        columns={bookingColumns}
                                        dataSource={filteredBookings}
                                        loading={loading}
                                        pagination={{ pageSize: 6 }}
                                    />
                                </>
                            ),
                        },
                        {
                            key: 'refunds',
                            label: 'Hoàn tiền',
                            children: (
                                <>
                                    <div className='flex flex-wrap gap-4 mb-4'>
                                        <Input.Search
                                            placeholder='Tìm mã hoặc tên khách hàng...'
                                            onChange={(e) =>
                                                setFilters({
                                                    ...filters,
                                                    search: e.target.value,
                                                })
                                            }
                                            style={{ width: 220 }}
                                        />
                                        <Select
                                            placeholder='Trạng thái hoàn tiền'
                                            allowClear
                                            value={
                                                refundFilter === 'all' ? undefined : refundFilter
                                            }
                                            onChange={(v) =>
                                                setRefundFilter((v as RefundFilter) || 'all')
                                            }
                                            style={{ width: 220 }}
                                            options={[
                                                {
                                                    value: 'pending',
                                                    label: 'Đang chờ xử lý hoàn tiền',
                                                },
                                                { value: 'processing', label: 'Đang hoàn tiền' },
                                                {
                                                    value: 'refunded',
                                                    label: 'Hoàn tiền xong',
                                                },
                                                { value: 'rejected', label: 'Từ chối hoàn tiền' },
                                            ]}
                                        />

                                        <DatePicker
                                            format='DD/MM/YYYY'
                                            placeholder='Ngày hoàn đơn'
                                            allowClear
                                            value={filters.date}
                                            onChange={(v) =>
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    date: v || null,
                                                }))
                                            }
                                            style={{ width: 180 }}
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
                                        columns={refundColumns}
                                        dataSource={filteredRefundBookings}
                                        loading={loading}
                                        pagination={{ pageSize: 6 }}
                                    />
                                </>
                            ),
                        },
                    ]}
                />
            </Card>

            {/* Modal SỬA giờ / sân */}
            <Modal
                open={editModalOpen}
                onCancel={() => setEditModalOpen(false)}
                onOk={handleSaveEdit}
                okText='Lưu thay đổi'
                cancelText='Hủy'
                width={900}
                centered
                title={
                    editingBooking
                        ? `Chỉnh sửa đặt sân - ${editingBooking.code}`
                        : 'Chỉnh sửa đặt sân'
                }
            >
                {editingBooking && (
                    <div className='space-y-4'>
                        {/* chọn sân + ngày */}
                        <Row gutter={12}>
                            <Col span={12}>
                                <div className='text-xs font-semibold text-gray-600 mb-1'>
                                    Chọn sân
                                </div>
                                <Select
                                    style={{ width: '100%' }}
                                    placeholder='Chọn sân'
                                    value={editValues.courtId}
                                    options={courts.map((c) => ({
                                        value: c._id,
                                        label: c.name,
                                    }))}
                                    onChange={(value) =>
                                        setEditValues((prev) => ({
                                            ...prev,
                                            courtId: value,
                                            // đổi sân thì reset khoảng giờ
                                            startTime: '',
                                            endTime: '',
                                            priceInfo: undefined,
                                        }))
                                    }
                                />
                            </Col>
                            <Col span={12}>
                                <div className='text-xs font-semibold text-gray-600 mb-1'>
                                    Chọn ngày đá
                                </div>
                                <DatePicker
                                    style={{ width: '100%' }}
                                    format='DD/MM/YYYY'
                                    value={editValues.date}
                                    onChange={(value) =>
                                        setEditValues((prev) => ({
                                            ...prev,
                                            date: value,
                                            // đổi ngày cũng reset giờ
                                            startTime: '',
                                            endTime: '',
                                            priceInfo: undefined,
                                        }))
                                    }
                                />
                            </Col>
                        </Row>

                        {/* info số ca + phút nghỉ */}
                        <div className='text-sm text-gray-700'>
                            Đã chọn <b>{selectedSlotsCount}</b> ca, nghỉ{' '}
                            <b>{selectedBreakMinutes}</b> phút.
                        </div>

                        {/* GRID chọn ca giờ giống BookingTimeSelector */}
                        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2'>
                            {TIME_SLOTS.map((slot, idx) => {
                                const past = isSlotPast(slot.start);
                                const booked = isSlotBooked(slot.start, slot.end);
                                const selected = isSlotSelected(slot.start, slot.end);

                                let btnClass =
                                    'border rounded-lg p-2 flex flex-col items-center justify-center min-h-[70px] text-sm transition-all ';

                                if (past) {
                                    btnClass +=
                                        'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-60';
                                } else if (booked) {
                                    btnClass +=
                                        'bg-red-500 border-red-600 text-white cursor-not-allowed';
                                } else if (selected) {
                                    btnClass +=
                                        'bg-green-600 border-green-600 text-white shadow-md scale-[1.02]';
                                } else {
                                    btnClass +=
                                        'bg-white border-gray-200 hover:border-green-500 hover:bg-green-50 cursor-pointer';
                                }

                                return (
                                    <button
                                        key={idx}
                                        type='button'
                                        disabled={past || booked}
                                        className={btnClass}
                                        onClick={() => handleSlotClickEdit(slot.start, slot.end)}
                                    >
                                        <span className='font-semibold'>
                                            {slot.start} - {slot.end}
                                        </span>
                                        {booked && (
                                            <span className='mt-1 text-[11px] font-bold uppercase'>
                                                ĐÃ ĐẶT
                                            </span>
                                        )}
                                        {past && !booked && (
                                            <span className='mt-1 text-[11px] text-gray-400'>
                                                QUÁ HẠN
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* hiển thị tiền sân sau khi BE tính */}
                        {editValues.priceInfo && (
                            <Card size='small' className='mt-2'>
                                <div className='text-sm font-semibold mb-1'>
                                    Tiền sân sau khi chỉnh sửa
                                </div>
                                <div className='text-sm space-y-1'>
                                    <div className='flex justify-between'>
                                        <span>Tiền sân</span>
                                        <span>{formatVND(editValues.priceInfo.fieldAmount)}</span>
                                    </div>
                                    <div className='flex justify-between'>
                                        <span>Tiền thiết bị</span>
                                        <span>
                                            {formatVND(editValues.priceInfo.equipmentTotal)}
                                        </span>
                                    </div>
                                    <div className='flex justify-between'>
                                        <span>Giảm giá</span>
                                        <span>
                                            -{formatVND(editValues.priceInfo.discountTotal)}
                                        </span>
                                    </div>
                                    <div className='border-t mt-1 pt-1 flex justify-between font-semibold'>
                                        <span>Tổng sau chỉnh sửa</span>
                                        <span>{formatVND(editValues.priceInfo.total)}</span>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>
                )}
            </Modal>

            {/* Modal chọn thiết bị khi Check-in / Thêm thiết bị */}
            <Modal
                open={checkinModalOpen}
                onCancel={() => setCheckinModalOpen(false)}
                footer={[
                    <Button key='cancel' onClick={() => setCheckinModalOpen(false)}>
                        Hủy
                    </Button>,
                    <Button key='ok' type='primary' onClick={handleConfirmCheckin}>
                        {checkinMode === 'checkin' ? 'Xác nhận Check-in' : 'Xác nhận thêm thiết bị'}
                    </Button>,
                ]}
                title={
                    checkinBooking
                        ? checkinMode === 'checkin'
                            ? `Check-in và chọn thiết bị - ${checkinBooking.code}`
                            : `Thêm thiết bị - ${checkinBooking.code}`
                        : 'Check-in và chọn thiết bị'
                }
            >
                {checkinBooking && (
                    <div className='space-y-4'>
                        <Card size='small' style={{ borderRadius: 8 }}>
                            <div className='text-sm'>
                                <div>
                                    <span className='text-gray-500'>Khách hàng: </span>
                                    <b>
                                        {checkinBooking.customerInfo?.name ||
                                            checkinBooking.customerId?.name ||
                                            checkinBooking.customerId?.username ||
                                            'Ẩn danh'}
                                    </b>
                                </div>
                                <div>
                                    <span className='text-gray-500'>Sân: </span>
                                    <b>{checkinBooking.courtId?.name || '-'}</b>
                                </div>
                                <div>
                                    <span className='text-gray-500'>Thời gian: </span>
                                    <b>
                                        {dayjs(checkinBooking.date).format('DD/MM/YYYY')} |{' '}
                                        {checkinBooking.startTime} - {checkinBooking.endTime}
                                    </b>
                                </div>
                            </div>
                        </Card>

                        {equipmentList.length === 0 ? (
                            <div className='text-center text-sm text-gray-500'>
                                Không có thiết bị nào để cho thuê / bán.
                            </div>
                        ) : (
                            <div className='space-y-2 max-h-72 overflow-y-auto pr-1'>
                                {equipmentList.map((item) => {
                                    const qty = equipmentQty[item.key] || 0;
                                    const lineTotal = qty * item.price;
                                    const base = equipmentBaseQty[item.key] || 0;
                                    const maxTotal = base + item.stock;

                                    return (
                                        <Card
                                            key={item.key}
                                            size='small'
                                            style={{ borderRadius: 8 }}
                                            bodyStyle={{ padding: 8 }}
                                        >
                                            <div className='flex justify-between items-center'>
                                                <div>
                                                    <div className='font-medium text-sm'>
                                                        {item.name}{' '}
                                                        <Tag
                                                            color={
                                                                item.mode === 'rent'
                                                                    ? 'blue'
                                                                    : 'green'
                                                            }
                                                            style={{ marginLeft: 4 }}
                                                        >
                                                            {item.mode === 'rent' ? 'Thuê' : 'Bán'}
                                                        </Tag>
                                                    </div>
                                                    <div className='text-xs text-gray-500'>
                                                        Giá: {formatVND(item.price)} /{' '}
                                                        {item.unit || 'cái'}
                                                    </div>
                                                    <div className='text-xs text-gray-500'>
                                                        Tồn kho: {item.stock} {item.unit || 'cái'}
                                                    </div>
                                                    {qty > 0 && (
                                                        <div className='text-xs text-gray-600 mt-1'>
                                                            Thành tiền:{' '}
                                                            <b>{formatVND(lineTotal)}</b>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className='flex items-center gap-2'>
                                                    <Button
                                                        size='small'
                                                        onClick={() =>
                                                            changeEquipmentQty(
                                                                item.key,
                                                                -1,
                                                                item.stock
                                                            )
                                                        }
                                                        disabled={qty <= base}
                                                    >
                                                        -
                                                    </Button>
                                                    <div className='min-w-[32px] text-center text-sm'>
                                                        {qty}
                                                    </div>
                                                    <Button
                                                        size='small'
                                                        onClick={() =>
                                                            changeEquipmentQty(
                                                                item.key,
                                                                1,
                                                                item.stock
                                                            )
                                                        }
                                                        disabled={qty >= maxTotal}
                                                    >
                                                        +
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}

                        <div className='flex justify-between items-center pt-2 border-t text-sm'>
                            <span className='text-gray-600'>
                                {checkinMode === 'checkin'
                                    ? 'Tổng tiền thiết bị:'
                                    : 'Tiền thiết bị thêm lần này:'}
                            </span>
                            <span className='font-semibold text-blue-600'>
                                {formatVND(addedEquipmentTotal)}
                            </span>
                        </div>
                        {checkinMode === 'add_equipment' && (
                            <div className='flex justify-between items-center text-xs text-gray-500'>
                                <span>Tổng tiền thiết bị sau khi thêm:</span>
                                <span className='font-semibold'>
                                    {formatVND(newEquipmentTotal)}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Modal hiển thị thông tin hoàn tiền / chi tiết admin */}
            <Modal
                centered
                open={refundModalOpen}
                onCancel={() => {
                    setRefundModalOpen(false);
                    setSelectedRefundBooking(null);
                }}
                footer={null}
                maskStyle={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
                title={
                    selectedRefundBooking
                        ? isAdminMode
                            ? `Chi tiết hoàn tiền - ${selectedRefundBooking.code}`
                            : `Thông tin hoàn tiền - ${selectedRefundBooking.code}`
                        : 'Thông tin hoàn tiền'
                }
            >
                {selectedRefundBooking ? (
                    <div className='space-y-4'>
                        <div className='p-3 rounded-md bg-gray-50 border text-sm'>
                            <div>
                                <span className='font-semibold'>Khách hàng: </span>
                                {refundCustomerName}
                            </div>
                            {refundCustomerPhone && (
                                <div className='mt-1'>
                                    <span className='text-gray-600'>Số điện thoại: </span>
                                    {refundCustomerPhone}
                                </div>
                            )}
                            {refundCustomerEmail && (
                                <div className='mt-1'>
                                    <span className='text-gray-600'>Email: </span>
                                    {refundCustomerEmail}
                                </div>
                            )}
                        </div>

                        {isAccountMode && (
                            <div className='space-y-3'>
                                <div>
                                    <div className='text-xs font-semibold mb-1'>Số tài khoản *</div>
                                    <Input
                                        readOnly
                                        value={selectedRefundBooking.refundAccountNumber || ''}
                                        placeholder='VD: 0123456789'
                                    />
                                </div>

                                <div>
                                    <div className='text-xs font-semibold mb-1'>
                                        Tên chủ tài khoản *
                                    </div>
                                    <Input
                                        readOnly
                                        value={selectedRefundBooking.refundAccountName || ''}
                                        placeholder='VD: Nguyen Van A'
                                    />
                                </div>

                                <div>
                                    <div className='text-xs font-semibold mb-1'>Ngân hàng *</div>
                                    <Input
                                        readOnly
                                        value={selectedRefundBooking.refundBankName || ''}
                                        placeholder='VD: MB BANK'
                                    />
                                </div>

                                <div>
                                    <div className='text-xs font-semibold mb-1'>
                                        Ghi chú thêm (không bắt buộc)
                                    </div>
                                    <TextArea
                                        readOnly
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        value={selectedRefundBooking.refundNote || ''}
                                        placeholder='VD: Hoàn tiền qua tài khoản vợ, chuyển lúc 20h30...'
                                    />
                                </div>
                            </div>
                        )}

                        {isAdminMode && (adminReason || billImage) && (
                            <div className='border-t pt-3 space-y-3'>
                                <div className='text-sm font-semibold'>
                                    Thông tin xử lý hoàn tiền (phía admin)
                                </div>

                                {adminReason && (
                                    <div>
                                        <div className='text-xs font-semibold mb-1'>
                                            Ghi chú / lý do từ admin
                                        </div>
                                        <TextArea
                                            readOnly
                                            autoSize={{ minRows: 2, maxRows: 5 }}
                                            value={adminReason}
                                        />
                                    </div>
                                )}

                                {billImage && (
                                    <div>
                                        <div className='text-xs font-semibold mb-1'>
                                            Ảnh bill / chứng từ hoàn tiền
                                        </div>
                                        <a
                                            href={billImage}
                                            target='_blank'
                                            rel='noreferrer'
                                            className='text-xs text-blue-600 underline'
                                        >
                                            Mở ảnh bill trong tab mới
                                        </a>
                                        <div className='mt-2'>
                                            <img
                                                src={billImage}
                                                alt='Bill hoàn tiền'
                                                className='max-h-60 rounded-md border object-contain'
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : null}
            </Modal>

            {/* Modal TẠO HÓA ĐƠN THANH TOÁN */}
            <Modal
                open={paymentModalOpen}
                onCancel={() => setPaymentModalOpen(false)}
                title={
                    paymentBooking
                        ? `Tạo hóa đơn thanh toán cho đơn ${paymentBooking.code}`
                        : 'Tạo hóa đơn thanh toán'
                }
                okText='Xác nhận thanh toán'
                cancelText='Hủy'
                onOk={handleConfirmPayment}
                okButtonProps={{ loading: paymentLoading }}
                width={720}
                centered
                bodyStyle={{ padding: 24 }}
            >
                {paymentBooking && (
                    <Form
                        form={paymentForm}
                        layout='vertical'
                        onValuesChange={(_, all) =>
                            setPaymentDiscount(Number(all.discount || 0) || 0)
                        }
                    >
                        <Card
                            size='small'
                            style={{ marginBottom: 16, borderRadius: 10 }}
                            bodyStyle={{ padding: 16 }}
                        >
                            <div className='flex justify-between gap-4'>
                                <div className='flex-1'>
                                    <div className='text-xs text-gray-500 mb-1'>Khách hàng</div>
                                    <div className='font-semibold text-base'>
                                        {paymentBooking.customerInfo?.name ||
                                            paymentBooking.customerId?.name ||
                                            paymentBooking.customerId?.username ||
                                            'Khách lẻ'}
                                    </div>
                                    {(paymentBooking.customerInfo?.phone ||
                                        paymentBooking.customerId?.phone) && (
                                        <div className='text-xs text-gray-500'>
                                            SĐT:{' '}
                                            {paymentBooking.customerInfo?.phone ||
                                                paymentBooking.customerId?.phone}
                                        </div>
                                    )}
                                    {(paymentBooking.customerInfo?.email ||
                                        paymentBooking.customerId?.email) && (
                                        <div className='text-xs text-gray-500'>
                                            Email:{' '}
                                            {paymentBooking.customerInfo?.email ||
                                                paymentBooking.customerId?.email}
                                        </div>
                                    )}
                                </div>

                                <div className='w-px bg-gray-200 mx-2' />

                                <div className='flex-1 text-right text-xs'>
                                    <div className='text-gray-500 mb-1'>
                                        Mã đặt sân:{' '}
                                        <span className='font-semibold text-black'>
                                            {paymentBooking.code}
                                        </span>
                                    </div>
                                    <div>
                                        <span className='text-gray-500'>Sân: </span>
                                        <span className='font-medium'>
                                            {paymentBooking.courtId?.name || '—'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className='text-gray-500'>Ngày chơi: </span>
                                        <span className='font-medium'>
                                            {dayjs(paymentBooking.date).format('DD/MM/YYYY')}
                                        </span>
                                    </div>
                                    <div>
                                        <span className='text-gray-500'>Khung giờ: </span>
                                        <span className='font-medium'>
                                            {paymentBooking.startTime} - {paymentBooking.endTime}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card
                            size='small'
                            style={{ marginBottom: 16, borderRadius: 10, background: '#fafafa' }}
                            bodyStyle={{ padding: 16 }}
                        >
                            <div className='flex justify-between items-center mb-2'>
                                <div className='font-semibold text-sm'>Chi tiết thanh toán</div>
                                <div className='text-xs text-gray-400'>
                                    Số liệu tính theo thời điểm thanh toán
                                </div>
                            </div>

                            <div className='flex justify-between text-sm mb-1'>
                                <span>Tiền sân</span>
                                <span className='font-medium'>
                                    {formatVND(
                                        paymentBooking.fieldAmount ?? paymentBooking.total ?? 0
                                    )}
                                </span>
                            </div>

                            <div className='flex justify-between text-sm mb-1'>
                                <span>Tiền thiết bị</span>
                                <span className='font-medium'>
                                    {formatVND(paymentBooking.equipmentTotal ?? 0)}
                                </span>
                            </div>

                            <div className='border-t border-dashed border-gray-300 mt-3 pt-2 flex justify-between text-sm'>
                                <span>Tổng cộng</span>
                                <span className='font-semibold'>{formatVND(originalTotal)}</span>
                            </div>

                            {depositPaid > 0 && (
                                <div className='flex justify-between text-xs mt-1 text-gray-500'>
                                    <span>
                                        Đã thanh toán trước (
                                        {(paymentBooking.depositMethod || 'vnpay').toUpperCase()} )
                                    </span>
                                    <span>- {formatVND(depositPaid)}</span>
                                </div>
                            )}

                            <div className='flex justify-between text-sm font-semibold mt-1'>
                                <span>Còn phải thu (trước giảm giá)</span>
                                <span className='text-blue-600'>{formatVND(paymentBaseTotal)}</span>
                            </div>
                        </Card>

                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item
                                    name='discount'
                                    label='Giảm giá (VND)'
                                    rules={[
                                        {
                                            type: 'number',
                                            transform: (v) => Number(v),
                                            min: 0,
                                            message: 'Giảm giá phải ≥ 0',
                                        },
                                    ]}
                                >
                                    <Input
                                        type='number'
                                        min={0}
                                        placeholder='0'
                                        onFocus={(e) => e.target.select()}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={16}>
                                <Form.Item name='discountReason' label='Lý do giảm giá'>
                                    <Input placeholder='VD: Khách VIP, khuyến mãi...' />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name='method'
                                    label='Phương thức thanh toán'
                                    rules={[
                                        { required: true, message: 'Vui lòng chọn phương thức!' },
                                    ]}
                                >
                                    <Select
                                        placeholder='Chọn phương thức'
                                        options={[
                                            { value: 'cash', label: 'Tiền mặt' },
                                            { value: 'transfer', label: 'Chuyển khoản' },
                                            { value: 'momo', label: 'Momo' },
                                            { value: 'vnpay', label: 'VNPAY' },
                                            { value: 'qr', label: 'Quẹt thẻ / QR' },
                                        ]}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name='receivedAmount' label='Tiền khách đưa (VND)'>
                                    <Input type='number' min={0} placeholder='VD: 250000' />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item name='note' label='Ghi chú thêm'>
                            <Input.TextArea
                                rows={2}
                                placeholder='Ghi chú hiển thị trên hóa đơn (nếu có)...'
                            />
                        </Form.Item>

                        <Card
                            size='small'
                            style={{ marginTop: 8, borderRadius: 10 }}
                            bodyStyle={{ padding: 16 }}
                        >
                            <div className='flex justify-between items-center'>
                                <div>
                                    <div className='text-xs text-gray-500'>Tổng thanh toán</div>
                                    <div className='text-[22px] font-bold text-blue-600 leading-tight'>
                                        {formatVND(paymentFinalTotal)}
                                    </div>
                                </div>
                                <div className='text-xs text-gray-500 text-right'>
                                    Số tiền sau khi trừ giảm giá trên hóa đơn (nếu có)
                                </div>
                            </div>
                        </Card>
                    </Form>
                )}
            </Modal>

            {/* Modal XEM HÓA ĐƠN */}
            <Modal
                open={invoiceModalOpen}
                onCancel={() => {
                    setInvoiceModalOpen(false);
                    setInvoiceDetail(null);
                }}
                width={720}
                centered
                title={
                    invoiceDetail?.invoice
                        ? `Hóa đơn - ${invoiceDetail.invoice.code}`
                        : 'Chi tiết hóa đơn'
                }
                bodyStyle={{ padding: 24, maxHeight: '70vh', overflowY: 'auto' }}
                footer={[
                    <Button
                        key='close'
                        onClick={() => {
                            setInvoiceModalOpen(false);
                            setInvoiceDetail(null);
                        }}
                    >
                        Đóng
                    </Button>,
                    <Button key='print' type='primary' onClick={handlePrintInvoice}>
                        In hóa đơn
                    </Button>,
                ]}
            >
                {invoiceLoading ? (
                    <div className='flex justify-center py-10'>
                        <Spin />
                    </div>
                ) : invoiceDetail?.invoice ? (
                    (() => {
                        const inv = invoiceDetail.invoice;
                        const items = invoiceDetail.items || [];
                        const booking = inv.bookingId || {};
                        const customer =
                            inv.customerId || booking.customerId || booking.customerInfo || {};
                        const methodLabel = PAYMENT_METHOD_TEXT[inv.method] || inv.method || '—';

                        // gộp item trùng nhau (name + mode + price + unit)
                        const map: Record<string, any> = {};
                        items.forEach((it: any) => {
                            const key = `${it.name || ''}_${it.mode || ''}_${it.price || 0}_${
                                it.unit || ''
                            }`;
                            if (map[key]) {
                                map[key].qty += it.qty || 0;
                                map[key].subtotal += it.subtotal || (it.qty || 0) * (it.price || 0);
                            } else {
                                map[key] = {
                                    ...it,
                                    qty: it.qty || 0,
                                    subtotal: it.subtotal || (it.qty || 0) * (it.price || 0),
                                };
                            }
                        });
                        const mergedItems = Object.values(map);

                        const fieldAmount = booking.fieldAmount ?? booking.total ?? 0;
                        const equipmentTotal = booking.equipmentTotal ?? 0;
                        const bookingTotal = booking.total ?? fieldAmount + equipmentTotal;
                        const depositPaidInv = booking.depositAmount ?? 0;
                        const alreadyPaidTotal =
                            Number(inv.total || 0) + Number(depositPaidInv || 0);

                        return (
                            <div ref={invoicePrintRef} className='space-y-4'>
                                <Card
                                    size='small'
                                    bodyStyle={{ padding: 16 }}
                                    style={{
                                        borderRadius: 10,
                                        borderColor: '#22c55e',
                                        marginBottom: 4,
                                    }}
                                >
                                    <div className='flex justify-between items-center'>
                                        <div>
                                            <div className='text-sm font-semibold text-green-600'>
                                                Hóa đơn - {inv.code}
                                            </div>
                                            {booking.code && (
                                                <div className='text-xs text-gray-500 mt-1'>
                                                    Đơn đặt sân: {booking.code}
                                                </div>
                                            )}
                                        </div>
                                        <Tag color='green'>Đã thanh toán</Tag>
                                    </div>
                                </Card>

                                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                    <Card
                                        size='small'
                                        bodyStyle={{ padding: 16 }}
                                        style={{ borderRadius: 10, borderColor: '#bbf7d0' }}
                                    >
                                        <div className='text-sm font-semibold mb-2'>
                                            Thông tin khách hàng
                                        </div>
                                        <div className='text-xs space-y-1'>
                                            <div className='flex justify-between'>
                                                <span className='text-gray-500'>Họ tên:</span>
                                                <span className='font-medium'>
                                                    {customer.name ||
                                                        customer.username ||
                                                        'Khách lẻ'}
                                                </span>
                                            </div>
                                            {customer.phone && (
                                                <div className='flex justify-between'>
                                                    <span className='text-gray-500'>
                                                        Số điện thoại:
                                                    </span>
                                                    <span>{customer.phone}</span>
                                                </div>
                                            )}
                                            {customer.email && (
                                                <div className='flex justify-between'>
                                                    <span className='text-gray-500'>Email:</span>
                                                    <span>{customer.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </Card>

                                    <Card
                                        size='small'
                                        bodyStyle={{ padding: 16 }}
                                        style={{ borderRadius: 10, borderColor: '#bbf7d0' }}
                                    >
                                        <div className='text-sm font-semibold mb-2'>
                                            Thông tin hóa đơn
                                        </div>
                                        <div className='text-xs space-y-1'>
                                            <div className='flex justify-between'>
                                                <span className='text-gray-500'>Mã hóa đơn:</span>
                                                <span className='font-medium'>{inv.code}</span>
                                            </div>
                                            <div className='flex justify-between'>
                                                <span className='text-gray-500'>Ngày lập:</span>
                                                <span>
                                                    {dayjs(inv.createdAt || inv.paidAt).format(
                                                        'DD/MM/YYYY HH:mm'
                                                    )}
                                                </span>
                                            </div>
                                            <div className='flex justify-between'>
                                                <span className='text-gray-500'>
                                                    Phương thức thanh toán:
                                                </span>
                                                <span>{methodLabel}</span>
                                            </div>
                                        </div>
                                    </Card>
                                </div>

                                <Card
                                    size='small'
                                    bodyStyle={{ padding: 16 }}
                                    style={{ borderRadius: 10 }}
                                >
                                    <div className='text-sm font-semibold mb-2'>
                                        Chi tiết đặt sân
                                    </div>
                                    <div className='grid grid-cols-1 md:grid-cols-2 gap-2 text-xs'>
                                        <div className='space-y-1'>
                                            <div className='flex justify-between'>
                                                <span className='text-gray-500'>Sân:</span>
                                                <span className='font-medium'>
                                                    {booking.courtId?.name || '—'}
                                                </span>
                                            </div>
                                            <div className='flex justify-between'>
                                                <span className='text-gray-500'>Ngày:</span>
                                                <span>
                                                    {booking.date
                                                        ? dayjs(booking.date).format('DD/MM/YYYY')
                                                        : '—'}
                                                </span>
                                            </div>
                                            <div className='flex justify-between'>
                                                <span className='text-gray-500'>Giờ:</span>
                                                <span>
                                                    {booking.startTime} - {booking.endTime}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {mergedItems.length > 0 && (
                                    <Card
                                        size='small'
                                        bodyStyle={{ padding: 16 }}
                                        style={{ borderRadius: 10 }}
                                    >
                                        <div className='text-sm font-semibold mb-2'>
                                            Thiết bị / hạng mục
                                        </div>
                                        <div className='space-y-1 text-xs'>
                                            {mergedItems.map((it: any, idx: number) => {
                                                const modeText = getModeText(it.mode);

                                                return (
                                                    <div
                                                        key={`${
                                                            it._id || it.name || 'item'
                                                        }_${idx}`}
                                                        className='flex justify-between'
                                                    >
                                                        <div>
                                                            <div className='font-medium flex items-center gap-2'>
                                                                <span>{it.name || 'Hạng mục'}</span>
                                                                {modeText && (
                                                                    <Tag
                                                                        color={
                                                                            it.mode === 'sell'
                                                                                ? 'green'
                                                                                : 'blue'
                                                                        }
                                                                        style={{ marginLeft: 2 }}
                                                                    >
                                                                        {modeText}
                                                                    </Tag>
                                                                )}
                                                            </div>
                                                            <div className='text-gray-500'>
                                                                {modeText && (
                                                                    <span>{modeText} • </span>
                                                                )}
                                                                {formatVND(it.price)} x {it.qty}{' '}
                                                                {it.unit || ''}
                                                            </div>
                                                        </div>
                                                        <div className='font-semibold'>
                                                            {formatVND(
                                                                it.subtotal ||
                                                                    (it.qty || 0) * (it.price || 0)
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </Card>
                                )}

                                <Card
                                    size='small'
                                    bodyStyle={{ padding: 16 }}
                                    style={{ borderRadius: 10, background: '#fafafa' }}
                                >
                                    <div className='text-sm font-semibold mb-2'>
                                        Chi phí thanh toán
                                    </div>
                                    <div className='space-y-1 text-sm'>
                                        <div className='flex justify-between'>
                                            <span>Tiền sân</span>
                                            <span className='font-medium'>
                                                {formatVND(fieldAmount)}
                                            </span>
                                        </div>
                                        <div className='flex justify-between'>
                                            <span>Tiền thiết bị</span>
                                            <span className='font-medium'>
                                                {formatVND(equipmentTotal)}
                                            </span>
                                        </div>

                                        <div className='border-t border-dashed mt-2 pt-2 flex justify-between'>
                                            <span>Tổng cộng</span>
                                            <span className='font-semibold'>
                                                {formatVND(bookingTotal)}
                                            </span>
                                        </div>

                                        {depositPaidInv > 0 && (
                                            <div className='flex justify-between text-xs text-gray-500'>
                                                <span>Đã thanh toán trước</span>
                                                <span>- {formatVND(depositPaidInv)}</span>
                                            </div>
                                        )}

                                        {inv.discount > 0 && (
                                            <div className='flex justify-between text-xs text-gray-500'>
                                                <span>Giảm giá trên hóa đơn</span>
                                                <span>- {formatVND(inv.discount)}</span>
                                            </div>
                                        )}

                                        <div className='flex justify-between mt-1 text-sm font-semibold'>
                                            <span>Khách thanh toán hóa đơn này</span>
                                            <span className='text-blue-600'>
                                                {formatVND(inv.total)}
                                            </span>
                                        </div>

                                        <div className='mt-3 rounded-lg bg-green-50 px-3 py-2 flex justify-between items-center text-sm'>
                                            <span className='font-medium text-green-700'>
                                                Đã thanh toán
                                            </span>
                                            <span className='font-bold text-green-700'>
                                                {formatVND(alreadyPaidTotal)}
                                            </span>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        );
                    })()
                ) : (
                    <div className='text-center text-sm text-gray-500'>
                        Không có dữ liệu hóa đơn.
                    </div>
                )}
            </Modal>

            {/* Modal NHẬP LÝ DO TỪ CHỐI HOÀN TIỀN */}
            <Modal
                centered
                open={rejectModal.open}
                onCancel={() => setRejectModal({ open: false, booking: null })}
                onOk={submitRejectRefund}
                okText='Xác nhận từ chối'
                cancelText='Hủy'
                title={
                    rejectModal.booking
                        ? `Từ chối hoàn tiền - ${rejectModal.booking.code}`
                        : 'Từ chối hoàn tiền'
                }
            >
                <p className='mb-2 text-sm text-gray-600'>
                    Lý do này sẽ được hiển thị cho khách hàng ở trang &quot;Đơn của tôi&quot;.
                </p>
                <TextArea
                    rows={4}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder='VD: Đơn đã quá hạn hoàn tiền, khách sử dụng dịch vụ đầy đủ...'
                />
            </Modal>

            {/* Modal UPLOAD ẢNH BILL HOÀN TIỀN */}
            <Modal
                centered
                open={billModal.open}
                onCancel={() => {
                    setBillModal({ open: false, booking: null });
                    setBillFileList([]);
                }}
                onOk={submitCompleteRefund}
                okText='Xác nhận đã hoàn tiền'
                cancelText='Hủy'
                okButtonProps={{ loading: billUploading }}
                title={
                    billModal.booking
                        ? `Xác nhận hoàn tiền - ${billModal.booking.code}`
                        : 'Xác nhận hoàn tiền'
                }
            >
                <p className='mb-2 text-sm text-gray-600'>
                    Chọn ảnh hoá đơn / bill hoàn tiền (sau khi chuyển khoản cho khách). Ảnh này sẽ
                    hiển thị cho khách hàng khi xem chi tiết đơn hoàn tiền.
                </p>
                <Upload
                    listType='picture'
                    maxCount={1}
                    fileList={billFileList}
                    beforeUpload={() => false}
                    onChange={({ fileList }) => setBillFileList(fileList)}
                    accept='image/*'
                >
                    <Button icon={<UploadOutlined />}>Chọn ảnh bill</Button>
                </Upload>
                {billFileList.length > 0 && (
                    <p className='mt-2 text-xs text-gray-500'>Đã chọn: {billFileList[0].name}</p>
                )}
            </Modal>

            {/* Modal CHI TIẾT ĐƠN đang sử dụng (thiết bị) */}
            <Modal
                centered
                open={detailModalOpen}
                onCancel={() => {
                    setDetailModalOpen(false);
                    setDetailData(null);
                }}
                footer={null}
                width={700}
                title={
                    detailData?.booking
                        ? `Chi tiết đơn ${detailData.booking.code}`
                        : 'Chi tiết đơn đặt sân'
                }
            >
                {detailLoading ? (
                    <div className='flex justify-center py-8'>
                        <Spin />
                    </div>
                ) : detailData?.booking ? (
                    <div className='space-y-4'>
                        <Card size='small' bodyStyle={{ padding: 12 }}>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-2 text-sm'>
                                <div>
                                    <div>
                                        <span className='text-gray-500'>Khách hàng: </span>
                                        <b>
                                            {detailData.booking.customerInfo?.name ||
                                                detailData.booking.customerId?.name ||
                                                detailData.booking.customerId?.username ||
                                                'Khách lẻ'}
                                        </b>
                                    </div>
                                    {detailData.booking.customerInfo?.phone ||
                                    detailData.booking.customerId?.phone ? (
                                        <div>
                                            <span className='text-gray-500'>SĐT: </span>
                                            {detailData.booking.customerInfo?.phone ||
                                                detailData.booking.customerId?.phone}
                                        </div>
                                    ) : null}
                                </div>
                                <div>
                                    <div>
                                        <span className='text-gray-500'>Sân: </span>
                                        <b>{detailData.booking.courtId?.name || '-'}</b>
                                    </div>
                                    <div>
                                        <span className='text-gray-500'>Ngày: </span>
                                        {dayjs(detailData.booking.date).format('DD/MM/YYYY')}
                                    </div>
                                    <div>
                                        <span className='text-gray-500'>Giờ: </span>
                                        {detailData.booking.startTime} -{' '}
                                        {detailData.booking.endTime}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card size='small' title='Thiết bị đã thêm' bodyStyle={{ padding: 12 }}>
                            {detailData.items && detailData.items.length > 0 ? (
                                <Table
                                    size='small'
                                    rowKey={(record) => `${record.name}_${record.mode}`}
                                    pagination={false}
                                    dataSource={mergedDetailItems}
                                    columns={[
                                        {
                                            title: 'Thiết bị',
                                            dataIndex: 'name',
                                            key: 'name',
                                        },
                                        {
                                            title: 'Loại',
                                            dataIndex: 'mode',
                                            key: 'mode',
                                            render: (m: 'rent' | 'sell') =>
                                                m === 'rent' ? 'Thuê' : 'Bán',
                                        },
                                        {
                                            title: 'SL',
                                            dataIndex: 'qty',
                                            key: 'qty',
                                            width: 70,
                                        },
                                        {
                                            title: 'Đơn giá',
                                            dataIndex: 'price',
                                            key: 'price',
                                            render: (v: number) => formatVND(v),
                                        },
                                        {
                                            title: 'Thành tiền',
                                            dataIndex: 'subtotal',
                                            key: 'subtotal',
                                            render: (v: number) => formatVND(v),
                                        },
                                    ]}
                                />
                            ) : (
                                <div className='text-sm text-gray-500'>
                                    Đơn này chưa có thiết bị nào.
                                </div>
                            )}
                        </Card>

                        <div className='flex justify-end'>
                            <div className='text-right text-sm'>
                                <div className='text-gray-500'>Tổng tiền đơn</div>
                                <div className='text-lg font-semibold text-blue-600'>
                                    {formatVND(detailData.booking.total || 0)}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className='text-center text-sm text-gray-500'>
                        Không có dữ liệu chi tiết.
                    </div>
                )}
            </Modal>
        </div>
    );
}
