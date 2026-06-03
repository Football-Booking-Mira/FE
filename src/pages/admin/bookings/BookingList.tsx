import { useEffect, useState, useRef, useMemo } from 'react';
import api from '@/common/utils/api';
import { printInvoiceMira } from '@/common/utils/printInvoice';
import BookingEditModal from './BookingEditModal';
import {
    Button,
    Tag,
    Table,
    Card,
    Input,
    Select,
    DatePicker,
    Row,
    Col,
    Modal,
    Tabs,
    Form,
    Spin,
    Upload,
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
    SearchOutlined,
    ReloadOutlined,
    EnvironmentOutlined,
    ToolOutlined,
    UserOutlined,
    CalendarOutlined,
    CloseOutlined,
} from '@ant-design/icons';
import { 
    PackageCheck, 
    User, 
    MapPin, 
    Clock, 
    Minus, 
    Plus, 
    Info, 
    ShoppingBag, 
    CreditCard,
    ChevronRight,
    X,
    Layers
} from 'lucide-react';
import { io } from 'socket.io-client';

dayjs.locale('vi');

const { TextArea } = Input;

// helper format tiền
const formatVND = (v: number = 0) =>
    v.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
interface BookingSlot {
    startTime: string;
    endTime: string;
}

interface Booking {
    _id: string;
    code: string;
    orderId?: any;
    customerId?: {
        _id?: string;
        username?: string;
        name?: string;
        phone?: string;
        email?: string;
        avatar?: string;
    };
    customerInfo?: {
        name?: string;
        phone?: string;
        email?: string;
        avatar?: string;
    };
    courtId?: { _id: string; name: string };
    date: string;
    startTime: string;
    endTime: string;
    total: number;
    slots?: BookingSlot[];
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
    discountTotal?: number; // Tổng tiền giảm (voucher)

    // thông tin voucher
    voucherId?: string;
    voucherCode?: string;
    voucherDiscount?: number;
    voucher?: { code?: string };
    voucherSnapshot?: {
        discountType?: 'percent' | 'amount';
        discountValue?: number;
        maxDiscountValue?: number;
        minOrderValue?: number;
        code?: string;
    };

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
    refundAmount?: number;
    hasInvoice?: boolean;
    invoiceId?: string | null;
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

const STATUS_LABELS: Record<string, string> = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    in_use: 'Đang sử dụng',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
};

const PAYMENT_LABELS: Record<string, string> = {
    unpaid: 'Chưa thanh toán',
    partial: 'Đã thanh toán',
    paid: 'Đã thanh toán',
    refunded: 'Đã hoàn tiền',
};

// text hiển thị phương thức thanh toán cho hóa đơn
const PAYMENT_METHOD_TEXT: Record<string, string> = {
    cash: 'Tiền mặt',
    transfer: 'Chuyển khoản',
};

const REFUND_LABELS: Record<string, string> = {
    none: 'Không có hoàn tiền',
    pending: 'Đang chờ xử lý hoàn tiền',
    processing: 'Đang hoàn tiền',
    refunded: 'Hoàn tiền xong',
    rejected: 'Từ chối hoàn tiền',
};



type RefundFilter = 'all' | 'pending' | 'processing' | 'refunded' | 'rejected';

const REFUND_OPTIONS: { value: Exclude<RefundFilter, 'all'>; label: string }[] = [
    { value: 'pending', label: 'Đang chờ xử lý hoàn tiền' },
    { value: 'processing', label: 'Đang hoàn tiền' },
    { value: 'refunded', label: 'Hoàn tiền xong' },
    { value: 'rejected', label: 'Từ chối hoàn tiền' },
];

const getRefundActionOptions = (current: Booking['refundStatus'] | undefined) => {
    // trạng thái hiện tại của booking
    const cur: Exclude<RefundFilter, 'all'> = (current as any) || 'pending';

    // Flow chuyển trạng thái:

    const FLOW: Record<Exclude<RefundFilter, 'all'>, Exclude<RefundFilter, 'all'>[]> = {
        pending: ['pending', 'processing'], // ❗ không có 'refunded' ở đây
        processing: ['processing', 'refunded', 'rejected'],
        refunded: ['refunded'],
        rejected: ['rejected'],
    };

    const allowed = FLOW[cur] || ['pending'];

    return REFUND_OPTIONS.map((opt) => ({
        ...opt,
        disabled: !allowed.includes(opt.value),
    }));
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
interface QrData {
    image: string;
    amount: number;
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
    // modal sate HỦY ĐƠN TIỀN MẶT (admin)
    const [cancelCashModalOpen, setCancelCashModalOpen] = useState(false);
    const [cancelCashBooking, setCancelCashBooking] = useState<Booking | null>(null);
    const [cancelCashLoading, setCancelCashLoading] = useState(false);
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

    // dark mode detection cho detail modal
    const [isDarkMode, setIsDarkMode] = useState(() =>
        document.documentElement.classList.contains('dark')
    );
    useEffect(() => {
        const obs = new MutationObserver(() =>
            setIsDarkMode(document.documentElement.classList.contains('dark'))
        );
        obs.observe(document.documentElement, { attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

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

    // load danh sách thiết bị + số lượng đã thuê trước đó
    const loadCheckinEquipments = async (bookingId?: string) => {
        try {
            const equipRes = await api.get('/equipments');
            const rawEquipments = equipRes.data?.data || equipRes.data || [];

            // nếu có bookingId -> lấy BookingItem hiện tại
            const baseQty: Record<string, number> = {};
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
                const qty = Math.max(0, totalQty - base);

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
            const res = await api.get(`/bookings/admin/dashboard?t=${Date.now()}`);
            setStats(res.data.data || {});
        } catch {
            toast.error('Không thể tải thống kê!');
        }
    };

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/bookings?t=${Date.now()}`);
            const rawList: Booking[] = res.data.data || [];

            const list = rawList.map((b) => {
                const hasDepositPaid = (b.depositAmount || 0) > 0 && b.depositStatus === 'paid';

                let paymentStatus: Booking['paymentStatus'] = (b.paymentStatus as any) || 'unpaid';

                // có cọc đã thanh toán thì mặc định coi là partial,
                // còn "paid" chỉ khi BE set sau khi tạo hóa đơn
                if (hasDepositPaid && (paymentStatus === 'unpaid' || paymentStatus === 'partial')) {
                    paymentStatus = 'partial';
                }

                return {
                    ...b,
                    paymentStatus,
                };
            });

            // SẮP XẾP: đơn mới tạo trước (createdAt mới nhất lên đầu)
            const sorted = [...list].sort((a, b) => {
                const at = new Date(a.createdAt || a.date).getTime();
                const bt = new Date(b.createdAt || b.date).getTime();

                // createdAt mới hơn lên trước
                if (at !== bt) return bt - at;

                // fallback: nếu cùng thời điểm thì sắp theo ngày đá + giờ
                const aDate = dayjs(a.date);
                const bDate = dayjs(b.date);

                if (aDate.isValid() && bDate.isValid() && !aDate.isSame(bDate, 'day')) {
                    return aDate.valueOf() - bDate.valueOf(); // ngày sớm trước
                }

                const getStart = (x: Booking) => {
                    if (Array.isArray(x.slots) && x.slots.length > 0) {
                        return x.slots[0]?.startTime || '';
                    }
                    return x.startTime || '';
                };

                const aStart = getStart(a);
                const bStart = getStart(b);
                return aStart.localeCompare(bStart);
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

        const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
        const socketInstance = io(SOCKET_URL, {
            transports: ['websocket'],
            withCredentials: true,
        });

        const handleUpdate = () => {
            fetchBookings();
            fetchStats();
        };

        socketInstance.on('booking_global_updated', handleUpdate);
        socketInstance.on('booking_updated', handleUpdate);

        return () => {
            socketInstance.off('booking_global_updated', handleUpdate);
            socketInstance.off('booking_updated', handleUpdate);
            socketInstance.disconnect();
        };
    }, []);

    const showCancelReason = (b: Booking) => {
        const customerName = b.customerInfo?.name || b.customerId?.name || b.customerId?.username || 'Ẩn danh';
        const phone = b.customerInfo?.phone || b.customerId?.phone || '';

        Modal.info({
            centered: true,
            width: 450,
            icon: null,
            title: (
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-rose-500 text-xl">ℹ️</span>
                    <span className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-base">Lý do hủy đơn</span>
                    <span className="text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-0.5 rounded-full text-xs font-bold ml-auto border border-rose-100 dark:border-rose-500/20">{b.code}</span>
                </div>
            ),
            okText: 'Đóng',
            okButtonProps: {
                className: "bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:hover:bg-white text-white dark:text-slate-900 border-none rounded-lg px-6 font-bold shadow-md active:scale-95 transition-all mt-2"
            },
            content: (
                <div className="mt-5 space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Thông tin khách hàng</div>
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-[13px]">{customerName}</span>
                            {phone && <span className="text-slate-500 dark:text-slate-400 text-xs font-mono font-medium">{phone}</span>}
                        </div>
                    </div>

                    <div className="bg-linear-to-br from-rose-50/80 to-rose-100/50 dark:from-rose-900/10 dark:to-rose-800/10 p-4 rounded-xl border border-rose-200/60 dark:border-rose-800/30 shadow-xs relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-4 -mt-4 text-6xl text-rose-500/5 dark:text-rose-400/5 font-serif">&quot;</div>
                        <div className="text-[10px] font-bold text-rose-400 dark:text-rose-500/80 uppercase tracking-widest mb-2 relative z-10">Chi tiết lý do</div>
                        {b.cancelReason ? (
                            <p className="text-[13px] text-rose-900 dark:text-rose-200/90 leading-relaxed m-0 italic font-medium relative z-10">
                                &quot;{b.cancelReason}&quot;
                            </p>
                        ) : (
                            <p className="text-[13px] text-slate-400 m-0 italic relative z-10">
                                Không có lý do cụ thể.
                            </p>
                        )}
                    </div>
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
            console.log('data: ', data);

            setDetailData(data);
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Không thể tải chi tiết đơn đặt sân!';
            toast.error(msg);
            setDetailModalOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const openEditModal = (b: Booking) => {
        setEditingBooking(b);
        setEditModalOpen(true);
    };

    const handleAdminCancelCash = (record: Booking) => {
        setCancelCashBooking(record);
        setCancelRefundDeposit(false);
        setCancelAdminReason('');
        setCancelCashModalOpen(true);
    };

    const confirmCancelCash = async () => {
        if (!cancelCashBooking) return;
        setCancelCashLoading(true);
        try {
            await api.post(`/bookings/${cancelCashBooking._id}/admin-cancel-cash`, {
                refundDeposit: cancelRefundDeposit,
                adminReason: cancelAdminReason,
            });

            toast.success('Đã hủy đơn tiền mặt và cập nhật trạng thái tiền');
            setCancelCashModalOpen(false);
            setCancelCashBooking(null);
            fetchBookings();
            fetchStats();
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Lỗi khi hủy đơn tiền mặt!';
            toast.error(msg);
        } finally {
            setCancelCashLoading(false);
        }
    };

    const handleAction = async (
        id: string,
        action: 'confirm' | 'cancel' | 'checkin' | 'checkout' | 'paid'
    ) => {
        try {
            if (action === 'confirm') {
                await api.patch(`/bookings/${id}/confirm`);
                toast.success('Đã xác nhận đặt sân!');
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
                console.log('res check out: ', res.data);

                toast.success('🏁 Check-out thành công!');
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
        });

        setPaymentModalOpen(true);
    };

    const openInvoiceModal = async (b: Booking) => {
        if (!b?.hasInvoice) {
            toast.error('Đơn này chưa có hóa đơn. Vui lòng bấm "Thanh toán" để tạo hóa đơn trước!');
            return;
        }

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

    const [showQrModal, setShowQrModal] = useState(false);
    const [qrData, setQrData] = useState<QrData | null>(null);

    const token = localStorage.getItem('token');

    const handleMethodChange = async (value: string) => {
        // nếu không phải chuyển khoản thì tắt QR
        if (value !== 'transfer') {
            setShowQrModal(false);
            return;
        }

        // đảm bảo có booking
        if (!paymentBooking) {
            toast.error('Không có thông tin đơn thanh toán!');
            return;
        }

        // Dùng paymentFinalTotal, nếu = 0 thì dùng paymentBaseTotal (còn phải thu)
        const amountToSend = paymentFinalTotal > 0 ? paymentFinalTotal : paymentBaseTotal;

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
            const res = await fetch(`${API_URL}/bookings/payment/vietqr`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    bookingId: paymentBooking._id,
                    amount: amountToSend,
                    customer: {
                        name:
                            paymentBooking.customerInfo?.name ||
                            paymentBooking.customerId?.name ||
                            'Khách hàng',
                        phone:
                            paymentBooking.customerInfo?.phone ||
                            paymentBooking.customerId?.phone ||
                            '',
                        email:
                            paymentBooking.customerInfo?.email ||
                            paymentBooking.customerId?.email ||
                            '',
                    },
                }),
            });

            const result = await res.json();

            if (!res.ok || !result?.success) {
                toast.error(result?.message || 'Không tạo được mã QR! Kiểm tra cấu hình ngân hàng trên server.');
                return;
            }

            const qr = result?.data?.qrImageBase64 as string | undefined;
            const amount = result?.data?.amount as number | undefined;

            if (qr && typeof amount === 'number') {
                setQrData({ image: qr, amount });
                setShowQrModal(true);
            } else {
                toast.error('Server không trả về mã QR. Vui lòng thử lại!');
            }
        } catch (err) {
            console.error(err);
            toast.error('Lỗi kết nối khi tạo mã QR!');
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
        } catch {}
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

    const groupedBookings = useMemo(() => {
        const map = new Map<string, any>();
        filteredBookings.forEach((b) => {
            let key = String(b._id);
            if (b.orderId) {
                key = typeof b.orderId === 'object' ? String(b.orderId._id) : String(b.orderId);
            }

            if (!map.has(key)) {
                map.set(key, {
                    ...b,
                    _id: key,
                    key,
                    isGroup: true,
                    groupedItems: [],
                });
            }
            map.get(key).groupedItems.push(b);
        });

        const result: any[] = [];
        map.forEach((g) => {
            if (g.groupedItems.length === 1) {
                const child = g.groupedItems[0];
                result.push({ ...child, key: child._id });
            } else {
                g.groupedItems.sort((a: any, b: any) =>
                    String(a.startTime).localeCompare(String(b.startTime))
                );

                g.total = g.groupedItems.reduce((sum: number, c: any) => {
                    if (c.status === 'cancelled') return sum;
                    return sum + (Number(c.total) || 0);
                }, 0);

                const firstStatus = g.groupedItems[0].status;
                const allSameStatus = g.groupedItems.every((c: any) => c.status === firstStatus);
                g.status = allSameStatus ? firstStatus : 'multiple';

                const firstPayStatus = g.groupedItems[0].paymentStatus;
                const allSamePayStatus = g.groupedItems.every((c: any) => c.paymentStatus === firstPayStatus);
                g.paymentStatus = allSamePayStatus ? firstPayStatus : 'multiple';

                if (g.orderId) {
                    g.code = typeof g.orderId === 'object' ? g.orderId.code : g.code;
                }
                result.push(g);
            }
        });

        result.sort((a, b) => {
            const at = new Date(a.createdAt || a.date).getTime();
            const bt = new Date(b.createdAt || b.date).getTime();
            if (at !== bt) return bt - at;

            const aDate = dayjs(a.date);
            const bDate = dayjs(b.date);
            if (aDate.isValid() && bDate.isValid() && !aDate.isSame(bDate, 'day')) {
                return aDate.valueOf() - bDate.valueOf();
            }

            const getStart = (x: any) => {
                if (Array.isArray(x.groupedItems) && x.groupedItems.length > 0) {
                    return x.groupedItems[0]?.startTime || '';
                }
                return x.startTime || '';
            };
            return getStart(a).localeCompare(getStart(b));
        });

        return result;
    }, [filteredBookings]);

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

    const bookingColumns: any = [
        {
            title: 'Mã đặt',
            dataIndex: 'code',
            key: 'code',
            width: 150,
            render: (v: string, b: any) => {
                const hasMultiSlots = !b.isGroup && Array.isArray(b.slots) && b.slots.length > 1;
                return (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            {b.isGroup ? (
                                <div className="flex items-center justify-center w-6 h-6 rounded bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                                    <Layers size={14} />
                                </div>
                            ) : hasMultiSlots ? (
                                <div className="flex items-center justify-center w-6 h-6 rounded bg-violet-50 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400">
                                    <Layers size={14} />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center w-6 h-6 rounded bg-slate-50 dark:bg-slate-800 text-slate-500">
                                    <FileTextOutlined style={{ fontSize: 12 }} />
                                </div>
                            )}
                            <span className="font-black text-slate-900 dark:text-slate-100 tracking-tight text-sm">
                                {v}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-1">
                            {/* slot count hidden */}
                        </div>
                    </div>
                );
            },

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
                    <div className="flex flex-col">
                        <span className="font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{name}</span>
                        {phone && <span className='text-xs text-gray-500 dark:text-gray-400 mt-px'>{phone}</span>}
                        {email && <span className='text-[11px] text-gray-400 dark:text-gray-500 truncate max-w-[140px]'>{email}</span>}
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
            title: 'Giờ chơi',
            key: 'time',
            render: (b: any) => {
                if (b.isGroup) {
                    const flatSlots: any[] = [];
                    b.groupedItems.forEach((booking: any) => {
                        const slots = Array.isArray(booking.slots) && booking.slots.length > 0
                            ? booking.slots
                            : [{ startTime: booking.startTime, endTime: booking.endTime }];
                        slots.forEach((slot: any) => {
                            flatSlots.push({
                                slot,
                                booking,
                            });
                        });
                    });

                    flatSlots.sort((x: any, y: any) =>
                        String(x.slot.startTime).localeCompare(String(y.slot.startTime))
                    );

                    return (
                        <div className="flex flex-col gap-1.5 py-1">
                            {flatSlots.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="shrink-0 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded leading-none border border-indigo-100 dark:border-indigo-500/20">
                                        Ca {idx+1}
                                    </span>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 rounded border border-slate-100 dark:border-slate-700/50 text-[11px] font-bold">
                                        <Clock size={10} className="opacity-70" />
                                        {item.slot.startTime} - {item.slot.endTime}
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                }

                // Booking đơn nhưng có nhiều slots (multi-slot trong 1 booking)
                if (Array.isArray(b.slots) && b.slots.length > 1) {
                    return (
                        <div className="flex flex-col gap-1.5 py-1">
                            {b.slots.map((s: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="shrink-0 text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-1.5 py-0.5 rounded leading-none border border-violet-100 dark:border-violet-500/20">
                                        Ca {idx+1}
                                    </span>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 rounded border border-slate-100 dark:border-slate-700/50 text-[11px] font-bold">
                                        <Clock size={10} className="opacity-70" />
                                        {s.startTime} - {s.endTime}
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                }

                return (
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-100 dark:border-slate-700 text-[12px] font-bold">
                        <Clock size={12} className="opacity-70" />
                        {b.startTime} - {b.endTime}
                    </div>
                );

            },
        },

        {
            title: 'Tổng tiền',
            dataIndex: 'total',
            render: (t: number) => (t ? formatVND(t) : '-'),
        },

        {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (s: string, b: any) => {
                const getStatusStyle = (st: string) => {
                    const config: Record<string, { bg: string; text: string; bgDark: string; textDark: string; border: string }> = {
                        confirmed: { bg: 'bg-blue-100/60', text: 'text-blue-700', bgDark: 'dark:bg-blue-500/10', textDark: 'dark:text-blue-300', border: 'border-blue-200 dark:border-blue-500/30' },
                        pending: { bg: 'bg-orange-100/60', text: 'text-orange-700', bgDark: 'dark:bg-orange-500/10', textDark: 'dark:text-orange-300', border: 'border-orange-200 dark:border-orange-500/30' },
                        in_use: { bg: 'bg-purple-100/60', text: 'text-purple-700', bgDark: 'dark:bg-purple-500/10', textDark: 'dark:text-purple-300', border: 'border-purple-200 dark:border-purple-500/30' },
                        completed: { bg: 'bg-emerald-100/60', text: 'text-emerald-700', bgDark: 'dark:bg-emerald-500/10', textDark: 'dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-500/30' },
                        cancelled: { bg: 'bg-rose-100/60', text: 'text-rose-700', bgDark: 'dark:bg-rose-500/10', textDark: 'dark:text-rose-300', border: 'border-rose-200 dark:border-rose-500/30' },
                    };
                    return config[st] || { bg: 'bg-gray-50', text: 'text-gray-700', bgDark: 'dark:bg-gray-800/50', textDark: 'dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' };
                };

                if (s === 'multiple') {
                    const flatSlots: any[] = [];
                    b.groupedItems.forEach((booking: any) => {
                        const slots = Array.isArray(booking.slots) && booking.slots.length > 0
                            ? booking.slots
                            : [{ startTime: booking.startTime, endTime: booking.endTime }];
                        slots.forEach((slot: any) => {
                            flatSlots.push({
                                slot,
                                booking,
                            });
                        });
                    });

                    flatSlots.sort((x: any, y: any) =>
                        String(x.slot.startTime).localeCompare(String(y.slot.startTime))
                    );

                    return (
                        <div className="flex flex-col gap-1.5 py-1">
                            {flatSlots.map((item: any, idx: number) => {
                                const childStatus = item.booking.status;
                                const style = getStatusStyle(childStatus);
                                return (
                                    <span key={idx} className={`px-2 py-0.5 text-[11px] font-medium rounded-full border truncate max-w-fit ${style.bg} ${style.text} ${style.bgDark} ${style.textDark} ${style.border}`}>
                                        {STATUS_LABELS[childStatus] || childStatus}
                                    </span>
                                );
                            })}
                        </div>
                    );
                }

                const style = getStatusStyle(s);
                return (
                    <span className={`px-2.5 py-1 text-[13px] font-medium rounded-full border ${style.bg} ${style.text} ${style.bgDark} ${style.textDark} ${style.border}`}>
                        {STATUS_LABELS[s] || s}
                    </span>
                );
            },
        },
        {
            title: 'Thao tác',
            key: 'actions',
            render: (b: any) => {
                 const renderRowActions = (child: Booking) => {
                     const btnBase = "p-2 rounded-lg transition-all active:scale-90 flex items-center justify-center border shadow-xs";
                     
                     return (
                         <div className="flex items-center gap-2 flex-wrap">
                             {child.status === 'in_use' && (
                                 <button
                                     onClick={() => openBookingDetailModal(child._id)}
                                     className={`${btnBase} bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60`}
                                     title="Xem chi tiết"
                                 >
                                     <EyeOutlined style={{ fontSize: 16 }} />
                                 </button>
                             )}
                             {child.status === 'pending' && (
                                 <>
                                     <button 
                                         onClick={() => handleAction(child._id, 'confirm')} 
                                         className={`${btnBase} bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20`} 
                                         title="Xác nhận"
                                     >
                                         <CheckOutlined style={{ fontSize: 16 }} />
                                     </button>
                                     <button 
                                         onClick={() => openEditModal(child)} 
                                         className={`${btnBase} bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20`} 
                                         title="Sửa"
                                     >
                                         <EditOutlined style={{ fontSize: 16 }} />
                                     </button>
                                     <button 
                                         onClick={() => child.paymentMethod === 'cash' ? handleAdminCancelCash(child) : handleAction(child._id, 'cancel')} 
                                         className={`${btnBase} bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20`} 
                                         title="Hủy"
                                     >
                                         <CloseCircleOutlined style={{ fontSize: 16 }} />
                                     </button>
                                 </>
                             )}
                             {child.status === 'confirmed' && (
                                 <>
                                     <button 
                                         onClick={() => handleAction(child._id, 'checkin')} 
                                         className={`${btnBase} bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20`} 
                                         title="Check-in"
                                     >
                                         <PlayCircleOutlined style={{ fontSize: 16 }} />
                                     </button>
                                     <button 
                                         onClick={() => openEditModal(child)} 
                                         className={`${btnBase} bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60`} 
                                         title="Sửa"
                                     >
                                         <EditOutlined style={{ fontSize: 16 }} />
                                     </button>
                                     <button 
                                         onClick={() => child.paymentMethod === 'cash' ? handleAdminCancelCash(child) : handleAction(child._id, 'cancel')} 
                                         className={`${btnBase} bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20`} 
                                         title="Hủy"
                                     >
                                         <CloseCircleOutlined style={{ fontSize: 16 }} />
                                     </button>
                                 </>
                             )}
                             {child.status === 'in_use' && (
                                 <>
                                     <button 
                                         onClick={() => openCheckinModal(child, 'add_equipment')} 
                                         className={`${btnBase} bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20`} 
                                         title="Thêm thiết bị"
                                     >
                                         <PlusOutlined style={{ fontSize: 16 }} />
                                     </button>
                                     <button 
                                         onClick={() => handleAction(child._id, 'checkout')} 
                                         className={`${btnBase} bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20`} 
                                         title="Check-out"
                                     >
                                         <StopOutlined style={{ fontSize: 16 }} />
                                     </button>
                                 </>
                             )}
                             {child.status === 'completed' && (
                                 child.hasInvoice ? (
                                     <button onClick={() => openInvoiceModal(child)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-[11px] flex gap-1.5 items-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-300 dark:border-slate-600 shadow-xs">
                                         <FileTextOutlined style={{ fontSize: 14 }} /> HÓA ĐƠN
                                     </button>
                                 ) : (
                                     <button onClick={() => openPaymentModal(child)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-[11px] flex gap-1.5 items-center hover:bg-emerald-700 transition-all border border-emerald-500">
                                         <DollarOutlined style={{ fontSize: 14 }} /> THANH TOÁN
                                     </button>
                                 )
                             )}
                         </div>
                     );
                 };

                if (b.isGroup) {
                    const flatSlots: any[] = [];
                    b.groupedItems.forEach((booking: any) => {
                        const slots = Array.isArray(booking.slots) && booking.slots.length > 0
                            ? booking.slots
                            : [{ startTime: booking.startTime, endTime: booking.endTime }];
                        slots.forEach((slot: any) => {
                            flatSlots.push({
                                slot,
                                booking,
                            });
                        });
                    });

                    flatSlots.sort((x: any, y: any) =>
                        String(x.slot.startTime).localeCompare(String(y.slot.startTime))
                    );

                    return (
                        <div className="flex flex-col gap-1.5">
                            {flatSlots.map((item: any, idx: number) => (
                                 <div key={idx} className="flex items-center gap-2 border-b border-dashed border-slate-100 dark:border-white/5 pb-2.5 last:border-0 last:pb-0">
                                     <span className="shrink-0 text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-white/5 px-1.5 py-0.5 rounded leading-none w-max">
                                         Ca {idx+1}
                                     </span>
                                     {renderRowActions(item.booking)}
                                 </div>
                            ))}
                        </div>
                    );
                }

                return renderRowActions(b);
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
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 shrink-0 rounded-full bg-linear-to-br from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40 flex items-center justify-center text-orange-700 dark:text-orange-400 font-bold border border-orange-200 dark:border-orange-800 shadow-sm">
                            {(name || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{name}</span>
                            {phone && <span className='text-xs text-gray-500 dark:text-gray-400 mt-px'>{phone}</span>}
                            {email && <span className='text-[11px] text-gray-400 dark:text-gray-500 truncate max-w-[140px]'>{email}</span>}
                        </div>
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
            title: 'Tiền hoàn lại',
            key: 'refundAmount',
            render: (b: Booking) => {
                const amt = typeof b.refundAmount === 'number' && b.refundAmount > 0 ? b.refundAmount : b.total;
                return amt ? formatVND(amt) : '-';
            },
        },
        {
            title: 'Thanh toán',
            dataIndex: 'paymentStatus',
            render: (_: any, record: Booking) => {
                const s = record.paymentStatus;

                let style = { bg: 'bg-rose-50', text: 'text-rose-700', bgDark: 'dark:bg-rose-900/40', textDark: 'dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' };
                if (s === 'paid' || s === 'partial' || s === 'refunded') {
                    style = { bg: 'bg-emerald-50', text: 'text-emerald-700', bgDark: 'dark:bg-emerald-900/40', textDark: 'dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' };
                }

                return (
                    <span className={`px-2.5 py-1 text-[13px] font-medium rounded-full border ${style.bg} ${style.text} ${style.bgDark} ${style.textDark} ${style.border}`}>
                        {PAYMENT_LABELS[s] || s}
                    </span>
                );
            },
        },

        {
            title: 'Trạng thái hoàn tiền',
            dataIndex: 'refundStatus',
            key: 'refundStatus',
            render: (rs: Booking['refundStatus']) => {
                const value = rs || 'none';
                const config: Record<string, { bg: string; text: string; bgDark: string; textDark: string; border: string }> = {
                    none: { bg: 'bg-gray-50', text: 'text-gray-600', bgDark: 'dark:bg-gray-800/40', textDark: 'dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
                    pending: { bg: 'bg-orange-50', text: 'text-orange-700', bgDark: 'dark:bg-orange-900/40', textDark: 'dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
                    processing: { bg: 'bg-blue-50', text: 'text-blue-700', bgDark: 'dark:bg-blue-900/40', textDark: 'dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
                    refunded: { bg: 'bg-emerald-50', text: 'text-emerald-700', bgDark: 'dark:bg-emerald-900/40', textDark: 'dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
                    rejected: { bg: 'bg-rose-50', text: 'text-rose-700', bgDark: 'dark:bg-rose-900/40', textDark: 'dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' },
                };
                
                const style = config[value] || config.none;

                return (
                    <span className={`px-2.5 py-1 text-[13px] font-medium rounded-full border ${style.bg} ${style.text} ${style.bgDark} ${style.textDark} ${style.border}`}>
                        {REFUND_LABELS[value] || 'Không có hoàn tiền'}
                    </span>
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
            render: (b: Booking) => {
                const hasRefundInfo = Boolean(
                    b.refundAccountNumber || b.refundAccountName || b.refundBankName || b.refundNote
                );

                return (
                    <Button
                        size='small'
                        onClick={() => openRefundModal(b, 'account')}
                        disabled={!hasRefundInfo}
                    >
                        Xem chi tiết
                    </Button>
                );
            },
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

    // tổng gốc của booking
    const originalTotal = paymentBooking?.total || 0;

    // voucher (nếu có)
    const voucherDiscount = Number(
        paymentBooking?.voucherDiscount ||
            paymentBooking?.discountTotal ||
            paymentBooking?.voucherSnapshot?.discountValue ||
            0
    );
    const voucherCode =
        paymentBooking?.voucherCode ||
        paymentBooking?.voucher?.code ||
        paymentBooking?.voucherSnapshot?.code ||
        '';

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
        <div className='px-4 pb-12 space-y-8'>
            {/* Premium Header section */}
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pt-6'>
                <div className='relative'>
                    <div className='absolute -left-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl' />
                    <h1 className='text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-4 italic'>
                        <div className="p-3.5 bg-linear-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-2xl shadow-blue-500/40 rotate-6 flex items-center justify-center border border-white/20">
                            <FileTextOutlined className="text-white text-3xl" />
                        </div>
                        <span className="relative">
                            QUẢN LÝ ĐẶT SÂN
                            <div className="absolute -bottom-2 left-0 w-1/2 h-1.5 bg-blue-500/30 rounded-full" />
                        </span>
                    </h1>
                    <p className='text-slate-500 dark:text-slate-400 mt-6 font-semibold flex items-center gap-2 text-sm md:text-base'>
                        <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                        </span>
                        Trang quản lý đơn hàng chuyên nghiệp & tối ưu cho hệ thống
                    </p>
                </div>
            </div>

            {/* Premium Dashboard Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {/* Tổng đơn */}
                <div className="group bg-white dark:bg-slate-800/40 p-5 rounded-3xl border border-blue-100 dark:border-blue-500/20 shadow-xl shadow-blue-500/5 flex flex-col justify-between transition-all hover:translate-y-[-4px] hover:shadow-blue-500/10 cursor-pointer overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-blue-500/10 transition-all" />
                    <div className="flex items-center justify-between text-blue-500 dark:text-blue-400 mb-4">
                        <span className="font-bold text-xs uppercase tracking-wider">Tổng đơn</span>
                        <div className="p-2 bg-blue-50 dark:bg-blue-500/20 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-all">
                            <FileTextOutlined className="text-lg" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-800 dark:text-white group-hover:scale-110 origin-left transition-all">{stats.total}</div>
                </div>

                {/* Chờ xác nhận */}
                <div className="group bg-white dark:bg-slate-800/40 p-5 rounded-3xl border border-orange-100 dark:border-orange-500/20 shadow-xl shadow-orange-500/5 flex flex-col justify-between transition-all hover:translate-y-[-4px] hover:shadow-orange-500/10 cursor-pointer overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-orange-500/10 transition-all" />
                    <div className="flex items-center justify-between text-orange-600 dark:text-orange-400 mb-4">
                        <span className="font-bold text-xs uppercase tracking-wider">Chờ xác nhận</span>
                        <div className="p-2 bg-orange-50 dark:bg-orange-500/20 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-all">
                            <ClockCircleOutlined className="text-lg" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-800 dark:text-white group-hover:scale-110 origin-left transition-all">{stats.pending}</div>
                </div>

                {/* Đã xác nhận */}
                <div className="group bg-white dark:bg-slate-800/40 p-5 rounded-3xl border border-teal-100 dark:border-teal-500/20 shadow-xl shadow-teal-500/5 flex flex-col justify-between transition-all hover:translate-y-[-4px] hover:shadow-teal-500/10 cursor-pointer overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-teal-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-teal-500/10 transition-all" />
                    <div className="flex items-center justify-between text-teal-600 dark:text-teal-400 mb-4">
                        <span className="font-bold text-xs uppercase tracking-wider">Đã xác nhận</span>
                        <div className="p-2 bg-teal-50 dark:bg-teal-500/20 rounded-xl group-hover:bg-teal-500 group-hover:text-white transition-all">
                            <CheckCircleOutlined className="text-lg" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-800 dark:text-white group-hover:scale-110 origin-left transition-all">{stats.confirmed}</div>
                </div>

                {/* Đang sử dụng */}
                <div className="group bg-white dark:bg-slate-800/40 p-5 rounded-3xl border border-purple-100 dark:border-purple-500/20 shadow-xl shadow-purple-500/5 flex flex-col justify-between transition-all hover:translate-y-[-4px] hover:shadow-purple-500/10 cursor-pointer overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-purple-500/10 transition-all" />
                    <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-4">
                        <span className="font-bold text-xs uppercase tracking-wider">Đang sử dụng</span>
                        <div className="p-2 bg-purple-50 dark:bg-purple-500/20 rounded-xl group-hover:bg-purple-500 group-hover:text-white transition-all">
                            <PlaySquareOutlined className="text-lg" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-800 dark:text-white group-hover:scale-110 origin-left transition-all">{stats.inUse}</div>
                </div>

                {/* Hoàn thành */}
                <div className="group bg-white dark:bg-slate-800/40 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-500/20 shadow-xl shadow-emerald-500/5 flex flex-col justify-between transition-all hover:translate-y-[-4px] hover:shadow-emerald-500/10 cursor-pointer overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-emerald-500/10 transition-all" />
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-4">
                        <span className="font-bold text-xs uppercase tracking-wider">Hoàn thành</span>
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-500/20 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all">
                            <CheckOutlined className="text-lg" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-800 dark:text-white group-hover:scale-110 origin-left transition-all">{stats.completed}</div>
                </div>

                {/* Đã hủy */}
                <div className="group bg-white dark:bg-slate-800/40 p-5 rounded-3xl border border-rose-100 dark:border-rose-500/20 shadow-xl shadow-rose-500/5 flex flex-col justify-between transition-all hover:translate-y-[-4px] hover:shadow-rose-500/10 cursor-pointer overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-rose-500/10 transition-all" />
                    <div className="flex items-center justify-between text-rose-500 dark:text-rose-400 mb-4">
                        <span className="font-bold text-xs uppercase tracking-wider">Đã hủy</span>
                        <div className="p-2 bg-rose-50 dark:bg-rose-500/20 rounded-xl group-hover:bg-rose-500 group-hover:text-white transition-all">
                            <CloseCircleOutlined className="text-lg" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-800 dark:text-white group-hover:scale-110 origin-left transition-all">{stats.cancelled}</div>
                </div>
            </div>

            <div className="bg-white dark:bg-card rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden p-6 transition-all">
                <Tabs
                    defaultActiveKey='bookings'
                    className="premium-tabs"
                    items={[
                        {
                            key: 'bookings',
                            label: (
                                <div className="flex items-center gap-2 px-4 py-1">
                                    <FileTextOutlined /> <span>ĐẶT SÂN</span>
                                </div>
                            ),
                            children: (
                                <>
                                    <div className='flex flex-wrap items-center gap-4 mb-6 p-4 bg-slate-50/50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5'>
                                        <Input
                                            placeholder='Tìm mã hoặc tên khách hàng...'
                                            prefix={<SearchOutlined className="text-slate-400" />}
                                            onChange={(e) =>
                                                setFilters({
                                                    ...filters,
                                                    search: e.target.value,
                                                })
                                            }
                                            className='premium-input w-full md:w-64'
                                            allowClear
                                        />
                                        <Select
                                            placeholder='Trạng thái đơn'
                                            allowClear
                                            onChange={(v) =>
                                                setFilters({ ...filters, status: v || '' })
                                            }
                                            className='premium-select w-full md:w-48'
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
                                            className='premium-input w-full md:w-44'
                                        />
                                        <button
                                            onClick={() => {
                                                fetchBookings();
                                                fetchStats();
                                            }}
                                            className='flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95'
                                        >
                                            <ReloadOutlined size={14} /> LÀM MỚI
                                        </button>
                                    </div>

                                    <Table
                                        rowKey='_id'
                                        columns={bookingColumns}
                                        dataSource={groupedBookings}
                                        loading={loading}
                                        pagination={{ pageSize: 6 }}
                                        scroll={{ x: 'max-content' }}
                                        className="premium-table"
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
                                        scroll={{ x: 'max-content' }}
                                        className="premium-table"
                                    />
                                </>
                            ),
                        },
                    ]}
                />
            </div>
            {/* Modal SỬA giờ / sân */}
            <BookingEditModal
                open={editModalOpen}
                booking={editingBooking}
                bookings={bookings}
                courts={courts}
                onClose={() => setEditModalOpen(false)}
                onUpdated={() => {
                    fetchBookings();
                    fetchStats();
                }}
            />

            {/* Modal chọn thiết bị khi Check-in / Thêm thiết bị */}
            <Modal
                open={checkinModalOpen}
                onCancel={() => setCheckinModalOpen(false)}
                footer={null}
                width={700}
                centered
                className="premium-modal-v2"
                closeIcon={<div className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-all mt-1 mr-1"><X size={18} className="text-slate-400" /></div>}
                title={
                    <div className="flex items-center gap-4 py-4 px-2">
                        <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 rotate-3">
                            <PackageCheck size={24} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-none uppercase italic">
                                {checkinMode === 'checkin' ? 'Check-in & Dịch vụ' : 'Thêm thiết bị / Phụ trợ'}
                            </span>
                            <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 tracking-widest uppercase mt-1">
                                Đơn hàng: #{checkinBooking?.code}
                            </span>
                        </div>
                    </div>
                }
            >
                {checkinBooking && (
                    <div className="p-1 space-y-6">
                        {/* Booking Context Card */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-white/5 p-5 rounded-3xl border border-slate-100 dark:border-white/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                            
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm"><User size={16} className="text-indigo-500" /></div>
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Khách hàng</div>
                                    <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                                        {checkinBooking.customerInfo?.name || checkinBooking.customerId?.name || 'Khách vãng lai'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm"><MapPin size={16} className="text-emerald-500" /></div>
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Sân bóng</div>
                                    <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">{checkinBooking.courtId?.name || '-'}</div>
                                </div>
                            </div>

                            <div className="md:col-span-2 flex items-start gap-3 border-t border-slate-200/50 dark:border-white/5 pt-3 mt-1">
                                <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm"><Clock size={16} className="text-amber-500" /></div>
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Thời gian đặt</div>
                                    <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                                        <span className="text-indigo-500">{dayjs(checkinBooking.date).format('DD/MM/YYYY')}</span>
                                        <span className="mx-2 text-slate-300">|</span>
                                        {Array.isArray(checkinBooking.slots) && checkinBooking.slots.length > 0
                                            ? checkinBooking.slots.map((s) => `${s.startTime}-${s.endTime}`).join(', ')
                                            : `${checkinBooking.startTime}-${checkinBooking.endTime}`}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Equipment Section Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2 ml-1">
                            <div className="flex items-center gap-2">
                                <ShoppingBag size={18} className="text-indigo-500" />
                                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase">Danh sách thiết bị & Dịch vụ</h3>
                            </div>
                        </div>

                        {/* Equipment List */}
                        {equipmentList.length === 0 ? (
                            <div className="py-10 flex flex-col items-center justify-center text-slate-400">
                                <Info size={40} className="mb-2 opacity-20" />
                                <p className="text-xs font-bold uppercase tracking-widest">Không có thiết bị khả dụng</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar pr-2 -mr-2">
                                {equipmentList.map((item) => {
                                    const qty = equipmentQty[item.key] || 0;
                                    const base = equipmentBaseQty[item.key] || 0;
                                    const maxTotal = base + item.stock;
                                    const isRent = item.mode === 'rent';

                                    return (
                                        <div 
                                            key={item.key} 
                                            className={`group p-4 bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-300 ${qty > 0 ? 'border-indigo-400 shadow-md shadow-indigo-500/5' : 'border-slate-100 dark:border-white/5 shadow-sm'}`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="font-black text-slate-800 dark:text-white text-sm truncate uppercase tracking-tight">{item.name}</span>
                                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${isRent ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20'}`}>
                                                            {isRent ? 'Cho thuê' : 'Bán'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                                            Giá: <span className="text-slate-600 dark:text-slate-200">{formatVND(item.price)}/{item.unit || 'cái'}</span>
                                                        </div>
                                                        <div className={`text-[11px] font-bold ${item.stock <= 5 ? 'text-rose-500' : 'text-slate-400'}`}>
                                                            Kho: {item.stock} {item.unit || 'cái'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center bg-slate-50 dark:bg-white/5 p-1 rounded-xl border border-slate-100 dark:border-white/5 scale-95 md:scale-100">
                                                    <button
                                                        onClick={() => changeEquipmentQty(item.key, -1, item.stock)}
                                                        disabled={qty <= base}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-white/10 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <div className="min-w-[40px] text-center font-black text-sm text-slate-700 dark:text-white">
                                                        {qty}
                                                    </div>
                                                    <button
                                                        onClick={() => changeEquipmentQty(item.key, 1, item.stock)}
                                                        disabled={qty >= maxTotal}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-white/10 hover:bg-indigo-50 hover:text-indigo-500 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Summary Footer Dashboard */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch pt-4">
                            <div className="md:col-span-7 flex flex-col justify-center">
                                <div className="p-4 bg-amber-50 dark:bg-amber-500/5 rounded-2xl border border-amber-200 dark:border-amber-500/20 flex gap-3 items-start">
                                    <div className="p-1.5 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg shrink-0"><Info size={16} /></div>
                                    <p className="text-[11px] text-amber-700 dark:text-amber-400/70 font-semibold leading-relaxed">
                                        {checkinMode === 'checkin' 
                                            ? 'Tổng tiền thiết bị sẽ được cộng vào hóa đơn cuối cùng khi khách trả sân.' 
                                            : 'Thiết bị thêm mới sẽ được cập nhật trực tiếp vào đơn đặt sân hiện tại.'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="md:col-span-5 bg-slate-900 dark:bg-indigo-950/40 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-12 -mt-12"></div>
                                <div>
                                    <div className="flex items-center gap-2 mb-2 text-slate-400">
                                        <CreditCard size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            {checkinMode === 'checkin' ? 'Phí dịch vụ' : 'Phí thêm lần này'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-2xl font-black font-mono tracking-tighter">{formatVND(addedEquipmentTotal)}</div>
                                        <ChevronRight size={20} className="text-indigo-500 animate-pulse mb-1" />
                                    </div>
                                </div>

                                {checkinMode === 'add_equipment' && (
                                    <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tổng sau khi thêm</span>
                                        <span className="text-xs font-bold text-emerald-400 font-mono">{formatVND(newEquipmentTotal)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-4">
                            <button
                                onClick={() => setCheckinModalOpen(false)}
                                className="px-6 py-2.5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-rose-500 dark:hover:text-rose-400 transition-all active:scale-95"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleConfirmCheckin}
                                className="flex items-center gap-2 px-8 py-3 bg-linear-to-r from-indigo-600 to-violet-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                {checkinMode === 'checkin' ? 'Xác nhận Check-in' : 'Cập nhật dịch vụ'} <ChevronRight size={14} />
                            </button>
                        </div>
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
                    <div className='space-y-5'>
                        {/* Thông tin khách hàng */}
                        <div className='p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 shadow-xs'>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Thông tin khách hàng</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-[13px]">
                                <div className="flex flex-col">
                                    <span className='text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold mb-0.5'>Họ tên</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{refundCustomerName}</span>
                                </div>
                                {refundCustomerPhone && (
                                    <div className="flex flex-col">
                                        <span className='text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold mb-0.5'>Số điện thoại</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">{refundCustomerPhone}</span>
                                    </div>
                                )}
                                {refundCustomerEmail && (
                                    <div className="flex flex-col mt-1 md:mt-0 md:col-span-2">
                                        <span className='text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold mb-0.5'>Email</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{refundCustomerEmail}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Thông tin nhận tiền hoàn */}
                        {isAccountMode && (
                            <div className='p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 shadow-xs'>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Thông tin nhận tiền hoàn</h4>
                                <div className='space-y-4'>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <div className='text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-1.5'>Ngân hàng</div>
                                            <Input
                                                readOnly
                                                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:border-indigo-400 focus:border-indigo-500 transition-colors cursor-default"
                                                value={selectedRefundBooking.refundBankName || ''}
                                            />
                                        </div>
                                        <div>
                                            <div className='text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-1.5'>Số tài khoản</div>
                                            <Input
                                                readOnly
                                                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono rounded-lg hover:border-indigo-400 focus:border-indigo-500 transition-colors cursor-default"
                                                value={selectedRefundBooking.refundAccountNumber || ''}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className='text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-1.5'>
                                            Tên chủ tài khoản
                                        </div>
                                        <Input
                                            readOnly
                                            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold uppercase rounded-lg hover:border-indigo-400 focus:border-indigo-500 transition-colors cursor-default"
                                            value={selectedRefundBooking.refundAccountName || ''}
                                        />
                                    </div>

                                    <div>
                                        <div className='text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-1.5'>
                                            Ghi chú thêm từ khách
                                        </div>
                                        <TextArea
                                            readOnly
                                            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-300 rounded-lg hover:border-indigo-400 focus:border-indigo-500 transition-colors cursor-default"
                                            autoSize={{ minRows: 2, maxRows: 4 }}
                                            value={selectedRefundBooking.refundNote || 'Không có ghi chú'}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {isAdminMode && (adminReason || billImage) && (
                            <div className='p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-4'>
                                <div className='text-xs font-bold text-slate-400 uppercase tracking-widest'>
                                    Thông tin xử lý (Admin)
                                </div>

                                {adminReason && (
                                    <div>
                                        <div className='text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-1.5'>
                                            Ghi chú / Lý do
                                        </div>
                                        <TextArea
                                            readOnly
                                            className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-300 rounded-lg cursor-default"
                                            autoSize={{ minRows: 2, maxRows: 5 }}
                                            value={adminReason}
                                        />
                                    </div>
                                )}

                                {billImage && (
                                    <div>
                                        <div className='text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-1.5 flex justify-between items-center'>
                                            <span>Ảnh bill / Chứng từ</span>
                                            <a
                                                href={billImage}
                                                target='_blank'
                                                rel='noreferrer'
                                                className='text-[10px] text-indigo-500 hover:text-indigo-400 underline lowercase tracking-normal'
                                            >
                                                Mở tab mới
                                            </a>
                                        </div>
                                        <div className='mt-2 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-black/5 dark:bg-white/5'>
                                            <img
                                                src={billImage}
                                                alt='Bill hoàn tiền'
                                                className='max-h-60 w-full object-contain'
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
                footer={null}
                closable={false}
                width={680}
                centered
                styles={{
                    content: { padding: 0, borderRadius: 20, overflow: 'hidden' },
                    body: { padding: 0 },
                }}
            >
                {paymentBooking && (
                    <div>
                        {/* ── HEADER ── */}
                        <div style={{
                            background: isDarkMode
                                ? 'linear-gradient(135deg, #0f172a 0%, #1a2e4a 60%, #0a3328 100%)'
                                : 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 55%, #065f46 100%)',
                            padding: '24px 24px 64px',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                <div>
                                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>
                                        Tạo hóa đơn thanh toán
                                    </div>
                                    <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
                                        {paymentBooking.code}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setPaymentModalOpen(false)}
                                    style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}
                                >
                                    <CloseOutlined style={{ fontSize: 13 }} />
                                </button>
                            </div>
                            {/* Info pills */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <UserOutlined style={{ color: '#34d399', fontSize: 15 }} />
                                    </div>
                                    <div>
                                        <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
                                            {paymentBooking.customerInfo?.name || paymentBooking.customerId?.name || paymentBooking.customerId?.username || 'Khách lẻ'}
                                        </div>
                                        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
                                            {paymentBooking.customerInfo?.phone || paymentBooking.customerId?.phone || paymentBooking.customerInfo?.email || paymentBooking.customerId?.email || ''}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(96,165,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CalendarOutlined style={{ color: '#60a5fa', fontSize: 15 }} />
                                    </div>
                                    <div>
                                        <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{dayjs(paymentBooking.date).format('DD/MM/YYYY')}</div>
                                        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{paymentBooking.startTime} – {paymentBooking.endTime}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <EnvironmentOutlined style={{ color: '#a78bfa', fontSize: 15 }} />
                                    </div>
                                    <div>
                                        <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{paymentBooking.courtId?.name || '—'}</div>
                                        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>Sân bóng</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── BODY ── */}
                        <div style={{ background: isDarkMode ? '#111827' : '#f8fafc', marginTop: -40, borderRadius: '20px 20px 0 0', padding: '20px 20px 16px' }}>
                            <Form
                                form={paymentForm}
                                layout='vertical'
                                onValuesChange={(_, all) => setPaymentDiscount(Number(all.discount || 0) || 0)}
                            >
                                {/* Cost breakdown */}
                                <div style={{ border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
                                    {/* Header row */}
                                    <div style={{ background: isDarkMode ? '#0f172a' : '#1e293b', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Chi tiết thanh toán</span>
                                        <span style={{ color: '#64748b', fontSize: 10 }}>Tính theo thời điểm thanh toán</span>
                                    </div>
                                    {/* Rows */}
                                    {[
                                        { label: 'Tiền sân', value: formatVND(paymentBooking.fieldAmount ?? paymentBooking.total ?? 0), accent: false },
                                        { label: 'Tiền thiết bị', value: formatVND(paymentBooking.equipmentTotal ?? 0), accent: false },
                                        ...(voucherDiscount > 0 ? [{ label: `Voucher${voucherCode ? ` (${voucherCode})` : ''}`, value: `- ${formatVND(voucherDiscount)}`, accent: true, color: '#34d399' }] : []),
                                    ].map((row, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: isDarkMode ? (i % 2 === 0 ? '#1e293b' : '#263344') : (i % 2 === 0 ? '#fff' : '#f8fafc'), borderBottom: `1px solid ${isDarkMode ? '#334155' : '#f1f5f9'}` }}>
                                            <span style={{ color: row.accent ? (row.color || '#34d399') : (isDarkMode ? '#cbd5e1' : '#475569'), fontSize: 13 }}>{row.label}</span>
                                            <span style={{ fontWeight: 600, color: row.accent ? (row.color || '#34d399') : (isDarkMode ? '#f1f5f9' : '#1e293b'), fontSize: 13 }}>{row.value}</span>
                                        </div>
                                    ))}
                                    {/* Subtotal */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', background: isDarkMode ? '#1a2535' : '#f0f9ff', borderBottom: `1px solid ${isDarkMode ? '#334155' : '#bae6fd'}` }}>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>Tổng cộng</span>
                                        <span style={{ fontWeight: 800, fontSize: 14, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>{formatVND(originalTotal)}</span>
                                    </div>
                                    {/* Deposit paid */}
                                    {depositPaid > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: isDarkMode ? '#1e293b' : '#fff', borderBottom: `1px solid ${isDarkMode ? '#334155' : '#f1f5f9'}` }}>
                                            <span style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12 }}>
                                                Đã thanh toán trước ({(paymentBooking.depositMethod || 'vnpay').toUpperCase()})
                                            </span>
                                            <span style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12 }}>- {formatVND(depositPaid)}</span>
                                        </div>
                                    )}
                                    {/* Remaining */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: isDarkMode ? '#1e3a5f' : '#eff6ff' }}>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: isDarkMode ? '#93c5fd' : '#1d4ed8' }}>Còn phải thu</span>
                                        <span style={{ fontWeight: 800, fontSize: 15, color: isDarkMode ? '#60a5fa' : '#2563eb' }}>{formatVND(paymentBaseTotal)}</span>
                                    </div>
                                </div>

                                {/* Form fields */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
                                    <Form.Item
                                        name='discount'
                                        label={<span style={{ fontSize: 12, fontWeight: 600, color: isDarkMode ? '#94a3b8' : '#475569' }}>Giảm giá (VND)</span>}
                                        rules={[{ type: 'number', transform: (v) => Number(v), min: 0, message: 'Giảm giá phải ≥ 0' }]}
                                        style={{ marginBottom: 0 }}
                                    >
                                        <Input type='number' min={0} placeholder='0' onFocus={(e) => e.target.select()} />
                                    </Form.Item>
                                    <Form.Item
                                        name='discountReason'
                                        label={<span style={{ fontSize: 12, fontWeight: 600, color: isDarkMode ? '#94a3b8' : '#475569' }}>Lý do giảm giá</span>}
                                        style={{ marginBottom: 0 }}
                                    >
                                        <Input placeholder='VD: Khách VIP, khuyến mãi...' />
                                    </Form.Item>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                                    <Form.Item
                                        name='method'
                                        label={<span style={{ fontSize: 12, fontWeight: 600, color: isDarkMode ? '#94a3b8' : '#475569' }}>Phương thức thanh toán <span style={{ color: '#ef4444' }}>*</span></span>}
                                        rules={[{ required: true, message: 'Vui lòng chọn phương thức!' }]}
                                        style={{ marginBottom: 0 }}
                                    >
                                        <Select
                                            placeholder='Chọn phương thức'
                                            options={[
                                                { value: 'cash', label: '💵 Tiền mặt' },
                                                { value: 'transfer', label: '🏦 Chuyển khoản' },
                                            ]}
                                            onChange={handleMethodChange}
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        name='receivedAmount'
                                        label={<span style={{ fontSize: 12, fontWeight: 600, color: isDarkMode ? '#94a3b8' : '#475569' }}>Tiền khách đưa (VND)</span>}
                                        style={{ marginBottom: 0 }}
                                    >
                                        <Input type='number' min={0} placeholder='VD: 250000' />
                                    </Form.Item>
                                </div>

                                {/* Total footer + actions */}
                                <div style={{ background: isDarkMode ? 'linear-gradient(135deg, #0f172a, #1a3a5c)' : 'linear-gradient(135deg, #1e40af, #065f46)', borderRadius: 14, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Tổng thanh toán</div>
                                        <div style={{ color: '#6ee7b7', fontSize: 24, fontWeight: 900, fontFamily: 'monospace', marginTop: 2 }}>{formatVND(paymentFinalTotal)}</div>
                                        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2 }}>Sau khi trừ giảm giá (nếu có)</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button
                                            type='button'
                                            onClick={() => setPaymentModalOpen(false)}
                                            style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            type='button'
                                            onClick={handleConfirmPayment}
                                            disabled={paymentLoading}
                                            style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.35)', opacity: paymentLoading ? 0.7 : 1 }}
                                        >
                                            {paymentLoading ? '⏳ Đang xử lý...' : '✓ Xác nhận thanh toán'}
                                        </button>
                                    </div>
                                </div>
                            </Form>
                        </div>
                    </div>
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
                closable={false}
                footer={null}
                styles={{
                    content: { padding: 0, borderRadius: 20, overflow: 'hidden', background: isDarkMode ? '#111827' : '#ffffff' },
                    body: { padding: 0 },
                }}
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
                        const voucherDiscount =
                            booking.voucherDiscount ?? booking.discountTotal ?? 0;
                        const subtotalBeforeDiscount = fieldAmount + equipmentTotal;
                        const bookingTotal =
                            booking.total ?? subtotalBeforeDiscount - voucherDiscount;
                        const depositPaidInv = Number(booking.depositAmount ?? 0);
                        // tính số đã thanh toán trước HOÀN TOÀN TRƯỚC HÓA ĐƠN này
                        const depositPaidBefore = Math.max(
                            0,
                            depositPaidInv - Number(inv.total || 0)
                        );
                        const alreadyPaidTotal = Number(inv.total || 0) + depositPaidBefore;

                        return (
                            <div ref={invoicePrintRef} style={{ overflow: 'hidden', position: 'relative' }}>
                                {/* ── HEADER ── */}
                                <div style={{
                                    background: isDarkMode
                                        ? 'linear-gradient(135deg, #0f172a 0%, #1a2e4a 60%, #0a3328 100%)'
                                        : 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 55%, #065f46 100%)',
                                    padding: '24px 24px 64px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                        <div>
                                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>Hóa đơn thanh toán</div>
                                            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{inv.code}</div>
                                            {booking.code && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Đơn đặt sân: #{booking.code}</div>}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ background: 'rgba(52,211,153,0.2)', color: '#6ee7b7', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(52,211,153,0.3)' }}>Đã thanh toán</span>
                                            <button onClick={() => { setInvoiceModalOpen(false); setInvoiceDetail(null); }} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>
                                                <CloseOutlined style={{ fontSize: 13 }} />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Info pills */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                                        {[
                                            { icon: <UserOutlined style={{ color: '#34d399', fontSize: 15 }} />, iconBg: 'rgba(52,211,153,0.15)', primary: customer.name || customer.username || 'Khách lẻ', secondary: customer.phone || customer.email || '' },
                                            { icon: <CalendarOutlined style={{ color: '#60a5fa', fontSize: 15 }} />, iconBg: 'rgba(96,165,250,0.15)', primary: dayjs(inv.createdAt || inv.paidAt).format('DD/MM/YYYY HH:mm'), secondary: methodLabel },
                                            { icon: <EnvironmentOutlined style={{ color: '#a78bfa', fontSize: 15 }} />, iconBg: 'rgba(167,139,250,0.15)', primary: booking.courtId?.name || '—', secondary: booking.date ? `${dayjs(booking.date).format('DD/MM/YYYY')} · ${Array.isArray(booking.slots) && booking.slots.length > 0 ? booking.slots.map((s: any) => `${s.startTime}-${s.endTime}`).join(', ') : `${booking.startTime}-${booking.endTime}`}` : '' },
                                        ].map((info, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                                <div style={{ width: 34, height: 34, borderRadius: '50%', background: info.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{info.icon}</div>
                                                <div>
                                                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{info.primary}</div>
                                                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{info.secondary}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ── BODY ── */}
                                <div style={{ background: isDarkMode ? '#111827' : '#f8fafc', marginTop: -40, borderRadius: '20px 20px 0 0', padding: '20px 20px 16px' }}>

                                    {/* Items Table */}
                                    <div style={{ border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
                                        <div style={{ background: isDarkMode ? '#0f172a' : '#1e293b', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Hạng mục / Thiết bị</span>
                                            <span style={{ color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Thành tiền</span>
                                        </div>
                                        <div style={{ padding: '12px 16px' }}>
                                            {mergedItems.length > 0 ? (
                                                mergedItems.map((it: any, idx: number) => {
                                                    const modeText = getModeText(it.mode);
                                                    return (
                                                        <div key={`${it._id || it.name || 'item'}_${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: idx < mergedItems.length - 1 ? `1px solid ${isDarkMode ? '#334155' : '#f1f5f9'}` : 'none' }}>
                                                            <div>
                                                                <div style={{ fontWeight: 600, color: isDarkMode ? '#f1f5f9' : '#1e293b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <span>{it.name || 'Hạng mục'}</span>
                                                                    {modeText && (
                                                                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: it.mode === 'sell' ? (isDarkMode ? '#2d1b4e' : '#f5f3ff') : (isDarkMode ? '#1e3a5f' : '#eff6ff'), color: it.mode === 'sell' ? (isDarkMode ? '#c084fc' : '#7c3aed') : (isDarkMode ? '#60a5fa' : '#2563eb') }}>
                                                                            {modeText}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div style={{ fontSize: 12, color: isDarkMode ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                                                                    {formatVND(it.price)} x {it.qty} {it.unit || ''}
                                                                </div>
                                                            </div>
                                                            <div style={{ fontWeight: 700, color: isDarkMode ? '#f1f5f9' : '#1e293b', fontSize: 13 }}>
                                                                {formatVND(it.subtotal || (it.qty || 0) * (it.price || 0))}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div style={{ textAlign: 'center', fontSize: 12, color: isDarkMode ? '#64748b' : '#94a3b8', padding: '8px 0' }}>Không sử dụng thiết bị thêm</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Cost breakdown rows */}
                                    <div style={{ border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
                                        {[
                                            { label: 'Tiền sân', value: formatVND(fieldAmount) },
                                            { label: 'Tiền thiết bị', value: formatVND(equipmentTotal) },
                                        ].map((row, i) => (
                                            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: isDarkMode ? (i % 2 === 0 ? '#1e293b' : '#263344') : (i % 2 === 0 ? '#fff' : '#f8fafc'), borderBottom: `1px solid ${isDarkMode ? '#334155' : '#f1f5f9'}` }}>
                                                <span style={{ color: isDarkMode ? '#cbd5e1' : '#475569', fontSize: 13 }}>{row.label}</span>
                                                <span style={{ fontWeight: 600, color: isDarkMode ? '#f1f5f9' : '#1e293b', fontSize: 13 }}>{row.value}</span>
                                            </div>
                                        ))}
                                        {/* Subtotal */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', background: isDarkMode ? '#1a2535' : '#f0f9ff', borderBottom: `1px solid ${isDarkMode ? '#334155' : '#bae6fd'}` }}>
                                            <span style={{ fontWeight: 700, fontSize: 13, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>Tổng cộng</span>
                                            <span style={{ fontWeight: 800, fontSize: 14, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>{formatVND(subtotalBeforeDiscount)}</span>
                                        </div>
                                        {voucherDiscount > 0 && booking.voucherCode && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: isDarkMode ? '#0a3328' : '#ecfdf5' }}>
                                                <span style={{ color: '#34d399', fontSize: 13 }}>Mã giảm giá ({booking.voucherCode})</span>
                                                <span style={{ fontWeight: 600, color: '#34d399', fontSize: 13 }}>- {formatVND(voucherDiscount)}</span>
                                            </div>
                                        )}
                                        {depositPaidBefore > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: isDarkMode ? '#1e3a5f' : '#eff6ff' }}>
                                                <span style={{ color: isDarkMode ? '#93c5fd' : '#3b82f6', fontSize: 13 }}>Đã thanh toán trước (Cọc)</span>
                                                <span style={{ fontWeight: 600, color: isDarkMode ? '#93c5fd' : '#3b82f6', fontSize: 13 }}>- {formatVND(depositPaidBefore)}</span>
                                            </div>
                                        )}
                                        {inv.discount > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: isDarkMode ? '#3b1323' : '#fff1f2' }}>
                                                <span style={{ color: isDarkMode ? '#fda4af' : '#e11d48', fontSize: 13 }}>Giảm giá thêm (Admin)</span>
                                                <span style={{ fontWeight: 600, color: isDarkMode ? '#fda4af' : '#e11d48', fontSize: 13 }}>- {formatVND(inv.discount)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Total footer */}
                                    <div style={{ background: isDarkMode ? 'linear-gradient(135deg, #0f172a, #1a3a5c)' : 'linear-gradient(135deg, #1e40af, #065f46)', borderRadius: 14, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.08 }}>
                                            <FileTextOutlined style={{ fontSize: 80, color: '#fff' }} />
                                        </div>
                                        <div style={{ position: 'relative', zIndex: 1 }}>
                                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Khách thanh toán</div>
                                            <div style={{ color: '#6ee7b7', fontSize: 24, fontWeight: 900, fontFamily: 'monospace', marginTop: 2 }}>{formatVND(inv.total)}</div>
                                            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2 }}>TỔNG ĐÃ THU: {formatVND(alreadyPaidTotal)}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 10, position: 'relative', zIndex: 1 }}>
                                            <button type='button' onClick={() => { setInvoiceModalOpen(false); setInvoiceDetail(null); }} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                                                Đóng
                                            </button>
                                            <button type='button' onClick={handlePrintInvoice} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}>
                                                🖨️ In hóa đơn
                                            </button>
                                        </div>
                                    </div>
                                </div>
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
                closable={false}
                width={680}
                styles={{
                    content: { padding: 0, borderRadius: 20, overflow: 'hidden' },
                    body: { padding: 0 },
                }}
            >
                {detailLoading ? (
                    <div className='flex justify-center items-center py-20'>
                        <Spin size='large' />
                    </div>
                ) : detailData?.booking ? (() => {
                    const bk = detailData.booking;
                    const customerName = bk.customerInfo?.name || bk.customerId?.name || bk.customerId?.username || 'Khách lẻ';
                    const customerPhone = bk.customerInfo?.phone || bk.customerId?.phone || null;
                    const customerEmail = bk.customerInfo?.email || bk.customerId?.email || null;
                    const courtName = bk.courtId?.name || '—';
                    const bookingDate = dayjs(bk.date).format('DD/MM/YYYY');
                    const timeRange = `${bk.startTime} – ${bk.endTime}`;
                    const totalAmount = bk.total || 0;
                    const equipTotal = bk.equipmentTotal || 0;
                    const fieldTotal = bk.fieldAmount ?? (totalAmount - equipTotal);

                    // ── Theme tokens ──
                    const T = isDarkMode ? {
                        headerBg: 'linear-gradient(135deg, #0f172a 0%, #1a2e4a 60%, #0a3328 100%)',
                        bodyBg: '#111827',
                        cardBg: '#1e293b',
                        cardBorder: '#334155',
                        tableHeaderBg: '#0f172a',
                        tableRowBg: '#1e293b',
                        tableRowAlt: '#263344',
                        tableRowBorder: '#334155',
                        textPrimary: '#f1f5f9',
                        textMuted: '#94a3b8',
                        footerBg: 'linear-gradient(135deg, #0f172a, #1a3a5c)',
                        sumCards: [
                            { label: 'Tiền sân',     color: '#60a5fa', bg: '#1e3a5f', border: '#2563eb44' },
                            { label: 'Tiền thiết bị',color: '#c084fc', bg: '#2d1b4e', border: '#7c3aed44' },
                            { label: 'Tổng cộng',    color: '#34d399', bg: '#0a3328', border: '#05966944', bold: true },
                        ],
                        badgeRent: { bg: '#1e3a5f', color: '#60a5fa' },
                        badgeSell: { bg: '#2d1b4e', color: '#c084fc' },
                        emptyBg: '#1e293b',
                    } : {
                        headerBg: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 50%, #065f46 100%)',
                        bodyBg: '#f8fafc',
                        cardBg: '#ffffff',
                        cardBorder: '#e2e8f0',
                        tableHeaderBg: '#f1f5f9',
                        tableRowBg: '#ffffff',
                        tableRowAlt: '#f8fafc',
                        tableRowBorder: '#f1f5f9',
                        textPrimary: '#1e293b',
                        textMuted: '#64748b',
                        footerBg: 'linear-gradient(135deg, #1e40af, #065f46)',
                        sumCards: [
                            { label: 'Tiền sân',     color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                            { label: 'Tiền thiết bị',color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
                            { label: 'Tổng cộng',    color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', bold: true },
                        ],
                        badgeRent: { bg: '#eff6ff', color: '#2563eb' },
                        badgeSell: { bg: '#f5f3ff', color: '#7c3aed' },
                        emptyBg: '#f8fafc',
                    };

                    const sumValues = [formatVND(fieldTotal), formatVND(equipTotal), formatVND(totalAmount)];

                    return (
                        <div>
                            {/* ── HEADER ── */}
                            <div style={{ background: T.headerBg, padding: '28px 28px 72px' }}>
                                <div className='flex justify-between items-start mb-6'>
                                    <div>
                                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>Mã đặt sân</div>
                                        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', fontFamily: 'monospace', letterSpacing: '-0.03em' }}>{bk.code}</div>
                                    </div>
                                    <button
                                        onClick={() => { setDetailModalOpen(false); setDetailData(null); }}
                                        style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)' }}
                                    >
                                        <CloseOutlined style={{ fontSize: 13 }} />
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                                    {[
                                        { icon: <UserOutlined style={{ color: '#34d399', fontSize: 16 }} />, iconBg: 'rgba(52,211,153,0.15)', primary: customerName, secondary: customerPhone || customerEmail || '' },
                                        { icon: <CalendarOutlined style={{ color: '#60a5fa', fontSize: 16 }} />, iconBg: 'rgba(96,165,250,0.15)', primary: bookingDate, secondary: timeRange },
                                        { icon: <EnvironmentOutlined style={{ color: '#a78bfa', fontSize: 16 }} />, iconBg: 'rgba(167,139,250,0.15)', primary: courtName, secondary: 'Sân bóng' },
                                    ].map((info, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 38, height: 38, borderRadius: '50%', background: info.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                {info.icon}
                                            </div>
                                            <div>
                                                <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{info.primary}</div>
                                                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{info.secondary}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── BODY ── */}
                            <div style={{ background: T.bodyBg, marginTop: -44, borderRadius: '20px 20px 0 0', padding: '22px 22px 18px' }}>

                                {/* Summary cards */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                                    {T.sumCards.map((card, i) => (
                                        <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 12, padding: '12px 14px' }}>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: card.color, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.75, marginBottom: 4 }}>{card.label}</div>
                                            <div style={{ fontSize: (card as any).bold ? 16 : 14, fontWeight: 800, color: card.color, fontFamily: 'monospace' }}>{sumValues[i]}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Equipment table */}
                                <div style={{ border: `1px solid ${T.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
                                    {/* Table header bar */}
                                    <div style={{ background: T.tableHeaderBg, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <ToolOutlined style={{ color: '#94a3b8', fontSize: 12 }} />
                                        <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Thiết bị đã sử dụng</span>
                                        {mergedDetailItems.length > 0 && (
                                            <span style={{ marginLeft: 'auto', background: isDarkMode ? '#334155' : '#e2e8f0', color: '#94a3b8', fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 20 }}>
                                                {mergedDetailItems.length} loại
                                            </span>
                                        )}
                                    </div>
                                    {/* Column headers */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 76px 52px 100px 100px', padding: '8px 16px', background: isDarkMode ? '#1a2535' : '#f8fafc', borderBottom: `1px solid ${T.cardBorder}` }}>
                                        {['Thiết bị', 'Loại', 'SL', 'Đơn giá', 'Thành tiền'].map(h => (
                                            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
                                        ))}
                                    </div>
                                    {/* Rows */}
                                    {mergedDetailItems.length > 0 ? mergedDetailItems.map((item: any, idx: number) => (
                                        <div
                                            key={`${item.name}_${item.mode}_${idx}`}
                                            style={{
                                                display: 'grid', gridTemplateColumns: '1fr 76px 52px 100px 100px',
                                                padding: '11px 16px',
                                                background: idx % 2 === 0 ? T.tableRowBg : T.tableRowAlt,
                                                borderBottom: idx < mergedDetailItems.length - 1 ? `1px solid ${T.tableRowBorder}` : 'none',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <div style={{ fontWeight: 600, color: T.textPrimary, fontSize: 13 }}>{item.name || 'Thiết bị'}</div>
                                            <div>
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: item.mode === 'rent' ? T.badgeRent.bg : T.badgeSell.bg, color: item.mode === 'rent' ? T.badgeRent.color : T.badgeSell.color }}>
                                                    {item.mode === 'rent' ? 'Thuê' : 'Bán'}
                                                </span>
                                            </div>
                                            <div style={{ fontWeight: 700, color: T.textPrimary, fontSize: 13 }}>{item.qty}</div>
                                            <div style={{ color: T.textMuted, fontSize: 12 }}>{formatVND(item.price)}</div>
                                            <div style={{ fontWeight: 700, color: T.textPrimary, fontSize: 13 }}>{formatVND(item.subtotal || (item.qty || 0) * (item.price || 0))}</div>
                                        </div>
                                    )) : (
                                        <div style={{ background: T.emptyBg, padding: '28px 16px', textAlign: 'center' }}>
                                            <div style={{ fontSize: 26, marginBottom: 6 }}>📭</div>
                                            <div style={{ color: T.textMuted, fontSize: 13 }}>Đơn này chưa có thiết bị nào</div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer total */}
                                <div style={{ marginTop: 14, background: T.footerBg, borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Tổng tiền đơn</div>
                                        <div style={{ color: '#6ee7b7', fontSize: 22, fontWeight: 900, fontFamily: 'monospace', marginTop: 2 }}>{formatVND(totalAmount)}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Sân + thiết bị</div>
                                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2 }}>{bookingDate} · {timeRange}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })() : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 13 }}>
                        Không có dữ liệu chi tiết.
                    </div>
                )}
            </Modal>

            <Modal
                centered
                width={440}
                open={cancelCashModalOpen}
                onCancel={() => setCancelCashModalOpen(false)}
                footer={[
                    <Button 
                        key="back" 
                        onClick={() => setCancelCashModalOpen(false)}
                        className="h-10 rounded-xl font-bold px-6 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    >
                        Đóng
                    </Button>,
                    <Button 
                        key="submit" 
                        loading={cancelCashLoading}
                        onClick={confirmCancelCash}
                        className="bg-rose-600 hover:bg-rose-700 border-none h-10 rounded-xl font-bold px-6 shadow-lg shadow-rose-500/30 text-white"
                    >
                        Xác nhận hủy
                    </Button>,
                ]}
                title={
                    <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 font-black italic text-xl">
                        <StopOutlined className="text-2xl" />
                        HỦY ĐƠN TIỀN MẶT
                    </div>
                }
            >
                {cancelCashBooking && (
                    <div className="py-4 space-y-4">
                        {/* Booking summary card */}
                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chi tiết đơn</span>
                                <span className="text-xs font-black text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full">{cancelCashBooking.code}</span>
                            </div>
                            
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
                                    <MapPin size={14} className="text-blue-500" />
                                    <span className="text-sm font-semibold">{cancelCashBooking.courtId?.name || 'Sân bãi'}</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
                                    <Clock size={14} className="text-amber-500" />
                                    <span className="text-sm font-bold">
                                        {dayjs(cancelCashBooking.date).format('DD/MM/YYYY')} 
                                        <span className="mx-2 text-slate-400">|</span>
                                        {cancelCashBooking.startTime} - {cancelCashBooking.endTime}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-white/5">
                                    <span className="text-xs text-slate-500">Tiền cọc cần xử lý</span>
                                    <span className="text-base font-black text-blue-600 dark:text-blue-400 italic">
                                        {formatVND(cancelCashBooking.depositAmount || 0)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Checkbox
                                className="premium-checkbox text-slate-700 dark:text-slate-300 font-semibold text-xs"
                                checked={cancelRefundDeposit}
                                onChange={(e) => setCancelRefundDeposit(e.target.checked)}
                            >
                                Đã hoàn tiền (cọc / toàn bộ) cho khách
                            </Checkbox>

                            <div className="relative">
                                <TextArea
                                    className="premium-input !rounded-2xl !bg-white dark:!bg-slate-900 !border-slate-200 dark:!border-white/10 text-xs italic"
                                    rows={3}
                                    value={cancelAdminReason}
                                    onChange={(e) => setCancelAdminReason(e.target.value)}
                                    placeholder="Ghi chú lý do hủy hoặc thông tin hoàn tiền..."
                                />
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {showQrModal && qrData && (
                <div
                    className='fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4'
                    style={{ zIndex: 2500 }}
                >
                    <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl relative w-full max-w-[400px] animate-in fade-in zoom-in duration-300">
                        {/* Header */}
                        <div className="bg-linear-to-br from-emerald-500 to-teal-600 p-6 text-center text-white relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
                            <h2 className="text-xl font-black uppercase tracking-widest relative z-10 drop-shadow-md">Thanh Toán Chuyển Khoản</h2>
                            <p className="text-emerald-50 text-sm mt-1.5 font-semibold relative z-10 opacity-90">Mã đơn: #{paymentBooking?.code}</p>
                        </div>

                        <div className="p-7 bg-white relative">
                            {/* Amount Section */}
                            <div className="text-center mb-6">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest block mb-2">Số tiền khách cần thanh toán</span>
                                <div className="text-4xl font-black text-slate-800 font-mono tracking-tighter flex items-center justify-center gap-1">
                                    {qrData.amount.toLocaleString('vi-VN')} <span className="text-2xl text-emerald-600">₫</span>
                                </div>
                            </div>

                            {/* Ticket dashed divider */}
                            <div className="flex items-center my-6 relative outline-hidden">
                                <div className="absolute left-[-40px] w-8 h-8 bg-slate-900/60 rounded-full"></div>
                                <div className="flex-1 border-t-2 border-dashed border-slate-200"></div>
                                <div className="absolute right-[-40px] w-8 h-8 bg-slate-900/60 rounded-full"></div>
                            </div>

                            {/* QR Code Section */}
                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 flex flex-col items-center justify-center shadow-inner relative overflow-hidden group">
                                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
                                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 relative z-10 w-56 h-56 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={qrData.image}
                                        alt='VietQR'
                                        className='w-full h-full object-contain mix-blend-multiply scale-[1.02]'
                                    />
                                </div>
                                
                                <div className="mt-5 flex items-center justify-center gap-2">
                                    <span className="flex h-2.5 w-2.5 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                                        Mở App Ngân hàng quét để thanh toán
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 bg-white border-t border-slate-100 flex flex-col gap-3">
                            <button
                                onClick={() => setShowQrModal(false)}
                                className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-rose-200 active:scale-95 flex items-center justify-center gap-2"
                            >
                                ❌ Đóng mã QR & Bỏ qua
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
