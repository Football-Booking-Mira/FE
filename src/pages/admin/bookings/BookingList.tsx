import { useEffect, useState, useRef, useMemo } from 'react';
import api from '@/common/utils/api';
import { printInvoiceMira } from '@/common/utils/printInvoice';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { io } from 'socket.io-client';

// Lucid Icons
import {
    Calendar as CalendarIcon,
    Clock,
    CreditCard,
    DollarSign,
    Edit3,
    Eye,
    FileText,
    Filter,
    Hash,
    Layers,
    MapPin,
    Plus,
    RefreshCw,
    Search,
    ShoppingBag,
    User as UserIcon,
    CheckCircle2,
    XCircle,
    PlayCircle,
    StopCircle,
    Check,
    AlertTriangle,
    X,
    Info,
    MoreVertical,
    ChevronDown,
    ArrowUpRight,
    Landmark,
    CalendarDays
} from 'lucide-react';

// Shadcn UI Imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// Custom Modal Components
import BookingEditModal from './BookingEditModal';
import BookingCheckinModal from './components/BookingCheckinModal';
import BookingPaymentModal from './components/BookingPaymentModal';
import BookingInvoiceModal from './components/BookingInvoiceModal';
import BookingRefundModal from './components/BookingRefundModal';
import BookingCancelCashModal from './components/BookingCancelCashModal';
import BookingDetailModal from './components/BookingDetailModal';
import BookingRejectModal from './components/BookingRejectModal';
import BookingBillUploadModal from './components/BookingBillUploadModal';

dayjs.locale('vi');

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
    discountTotal?: number;
    voucherId?: string;
    voucherCode?: string;
    voucherDiscount?: number;
    voucher?: { code?: string };
    depositAmount?: number;
    depositStatus?: 'pending' | 'paid' | 'refunded' | 'forfeited';
    depositMethod?: string;
    refundAmount?: number;
    hasInvoice?: boolean;
    invoiceId?: string | null;
    isGroup?: boolean;
    groupedItems?: Booking[];
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

const formatVND = (v: number = 0) =>
    v.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

const STATUS_LABELS: Record<string, string> = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    in_use: 'Đang sử dụng',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
    multiple: 'Nhiều trạng thái',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
    unpaid: 'Chưa thanh toán',
    partial: 'Đã cọc',
    paid: 'Đã thanh toán',
    refunded: 'Đã hoàn cọc',
    multiple: 'Khác nhau',
};

const REFUND_LABELS: Record<string, string> = {
    none: 'Không hoàn tiền',
    pending: 'Chờ xử lý',
    processing: 'Đang hoàn tiền',
    refunded: 'Hoàn tiền xong',
    rejected: 'Từ chối',
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

    // Filters
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        date: '',
    });
    const [refundFilter, setRefundFilter] = useState<'all' | 'pending' | 'processing' | 'refunded' | 'rejected'>('all');

    // Modals Control
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

    const [checkinOpen, setCheckinOpen] = useState(false);
    const [checkinBooking, setCheckinBooking] = useState<Booking | null>(null);
    const [checkinMode, setCheckinMode] = useState<'checkin' | 'add_equipment'>('checkin');

    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);

    const [invoiceOpen, setInvoiceOpen] = useState(false);
    const [invoiceDetail, setInvoiceDetail] = useState<any | null>(null);
    const [invoiceLoading, setInvoiceLoading] = useState(false);

    const [refundOpen, setRefundOpen] = useState(false);
    const [refundBooking, setRefundBooking] = useState<Booking | null>(null);
    const [refundMode, setRefundMode] = useState<'account' | 'admin'>('account');

    const [cancelCashOpen, setCancelCashOpen] = useState(false);
    const [cancelCashBooking, setCancelCashBooking] = useState<Booking | null>(null);

    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);

    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectBooking, setRejectBooking] = useState<Booking | null>(null);

    const [billUploadOpen, setBillUploadOpen] = useState(false);
    const [billUploadBooking, setBillUploadBooking] = useState<Booking | null>(null);

    // Cancel Reason display Modal
    const [cancelReasonOpen, setCancelReasonOpen] = useState(false);
    const [cancelReasonBooking, setCancelReasonBooking] = useState<Booking | null>(null);

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
                if (hasDepositPaid && (paymentStatus === 'unpaid' || paymentStatus === 'partial')) {
                    paymentStatus = 'partial';
                }
                return { ...b, paymentStatus };
            });

            const sorted = [...list].sort((a, b) => {
                const at = new Date(a.createdAt || a.date).getTime();
                const bt = new Date(b.createdAt || b.date).getTime();
                if (at !== bt) return bt - at;

                const aDate = dayjs(a.date);
                const bDate = dayjs(b.date);
                if (aDate.isValid() && bDate.isValid() && !aDate.isSame(bDate, 'day')) {
                    return aDate.valueOf() - bDate.valueOf();
                }

                const getStart = (x: Booking) => {
                    if (Array.isArray(x.slots) && x.slots.length > 0) {
                        return x.slots[0]?.startTime || '';
                    }
                    return x.startTime || '';
                };
                return getStart(a).localeCompare(getStart(b));
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

    const handleAction = async (id: string, action: 'confirm' | 'cancel' | 'checkout' | 'paid') => {
        try {
            if (action === 'confirm') {
                await api.patch(`/bookings/${id}/confirm`);
                toast.success('Đã xác nhận đặt sân!');
            } else if (action === 'cancel') {
                await api.patch(`/bookings/${id}/cancel`, { reason: 'Admin hủy đơn' });
                toast.success('❌ Đã hủy đặt sân!');
            } else if (action === 'paid') {
                await api.patch(`/bookings/${id}`, { paymentStatus: 'paid' });
                toast.success('💵 Đã đánh dấu thanh toán!');
            } else if (action === 'checkout') {
                await api.patch(`/bookings/${id}/checkout`);
                toast.success('🏁 Check-out thành công!');
            }
            fetchBookings();
            fetchStats();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Lỗi thao tác!');
        }
    };

    const openInvoice = async (b: Booking) => {
        if (!b?.hasInvoice) {
            toast.error('Đơn này chưa có hóa đơn. Vui lòng bấm "Thanh toán" để tạo trước!');
            return;
        }
        try {
            setInvoiceOpen(true);
            setInvoiceLoading(true);
            const res = await api.get(`/invoices/by-booking/${b._id}`);
            setInvoiceDetail(res.data);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể tải thông tin hóa đơn!');
            setInvoiceOpen(false);
        } finally {
            setInvoiceLoading(false);
        }
    };

    const handleRefundStatusChange = async (id: string, status: string) => {
        const booking = bookings.find((b) => b._id === id);
        if (!booking) return;

        if (status === 'rejected') {
            setRejectBooking(booking);
            setRejectOpen(true);
            return;
        }
        if (status === 'refunded') {
            setBillUploadBooking(booking);
            setBillUploadOpen(true);
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
            toast.error(err?.response?.data?.message || 'Lỗi cập nhật trạng thái hoàn tiền!');
        }
    };

    const filteredBookings = bookings.filter((b) => {
        const search = filters.search.toLowerCase();
        const fullName = (b.customerId?.name || b.customerId?.username || b.customerInfo?.name || '').toLowerCase();
        const code = b.code.toLowerCase();

        const matchesSearch = code.includes(search) || fullName.includes(search);
        const matchesStatus = filters.status !== 'all' ? b.status === filters.status : true;
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

                // Determine group paymentStatus cleanly
                const hasUnpaid = g.groupedItems.some((c: any) => c.paymentStatus === 'unpaid');
                const hasPartial = g.groupedItems.some((c: any) => c.paymentStatus === 'partial');
                const hasPaid = g.groupedItems.some((c: any) => c.paymentStatus === 'paid');
                const hasRefunded = g.groupedItems.some((c: any) => c.paymentStatus === 'refunded');

                if (hasPaid && !hasPartial && !hasUnpaid && !hasRefunded) {
                    g.paymentStatus = 'paid';
                } else if (hasRefunded && !hasPaid && !hasPartial && !hasUnpaid) {
                    g.paymentStatus = 'refunded';
                } else if (hasUnpaid && !hasPaid && !hasPartial && !hasRefunded) {
                    g.paymentStatus = 'unpaid';
                } else {
                    // Mix of statuses, or any partial -> partial (Đã cọc)
                    g.paymentStatus = 'partial';
                }

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
        const fullName = (b.customerId?.name || b.customerId?.username || b.customerInfo?.name || '').toLowerCase();
        const code = b.code.toLowerCase();

        const matchesSearch = code.includes(search) || fullName.includes(search);
        const matchesDate = filters.date ? dayjs(b.date).isSame(filters.date, 'day') : true;

        const rs = b.refundStatus || 'none';
        const matchesRefundFilter = refundFilter === 'all' ? true : rs === refundFilter;

        return matchesSearch && matchesDate && matchesRefundFilter;
    });

    const getStatusStyle = (st: string) => {
        switch (st) {
            case 'confirmed':
                return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
            case 'pending':
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse';
            case 'in_use':
                return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20';
            case 'completed':
                return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
            case 'cancelled':
                return 'bg-muted text-muted-foreground border';
            case 'multiple':
                return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
            default:
                return 'bg-muted text-muted-foreground border';
        }
    };

    const getPaymentStyle = (status: string) => {
        switch (status) {
            case 'unpaid':
                return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
            case 'partial':
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
            case 'paid':
                return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
            case 'refunded':
                return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
            case 'multiple':
                return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
            default:
                return 'bg-muted text-muted-foreground border';
        }
    };

    const renderActionButtons = (child: Booking, isSubRow = false) => {
        const btnBase = "p-2 rounded-md transition-colors flex items-center justify-center text-muted-foreground hover:bg-muted";
        
        return (
            <div className="flex items-center gap-1.5 flex-wrap">
                {child.status === 'in_use' && (
                    <button
                        onClick={() => { setSelectedDetailId(child._id); setDetailOpen(true); }}
                        className={`${btnBase} hover:text-foreground`}
                        title="Xem chi tiết"
                    >
                        <Eye size={15} />
                    </button>
                )}
                {child.status === 'pending' && (
                    <>
                        <button 
                            onClick={() => handleAction(child._id, 'confirm')} 
                            className={`${btnBase} hover:text-emerald-600`} 
                            title="Xác nhận đặt"
                        >
                            <Check size={15} />
                        </button>
                        <button 
                            onClick={() => { setEditingBooking(child); setEditModalOpen(true); }} 
                            className={`${btnBase} hover:text-foreground`} 
                            title="Sửa giờ / sân"
                        >
                            <Edit3 size={15} />
                        </button>
                        <button 
                            onClick={() => child.paymentMethod === 'cash' ? (setCancelCashBooking(child), setCancelCashOpen(true)) : handleAction(child._id, 'cancel')} 
                            className={`${btnBase} hover:text-rose-600`} 
                            title="Hủy đặt sân"
                        >
                            <XCircle size={15} />
                        </button>
                    </>
                )}
                {child.status === 'confirmed' && (
                    <>
                        <button 
                            onClick={() => { setCheckinBooking(child); setCheckinMode('checkin'); setCheckinOpen(true); }} 
                            className={`${btnBase} hover:text-indigo-600`} 
                            title="Check-in sân"
                        >
                            <PlayCircle size={15} />
                        </button>
                        <button 
                            onClick={() => { setEditingBooking(child); setEditModalOpen(true); }} 
                            className={`${btnBase} hover:text-foreground`} 
                            title="Sửa giờ / sân"
                        >
                            <Edit3 size={15} />
                        </button>
                        <button 
                            onClick={() => child.paymentMethod === 'cash' ? (setCancelCashBooking(child), setCancelCashOpen(true)) : handleAction(child._id, 'cancel')} 
                            className={`${btnBase} hover:text-rose-600`} 
                            title="Hủy đặt sân"
                        >
                            <XCircle size={15} />
                        </button>
                    </>
                )}
                {child.status === 'in_use' && (
                    <>
                        <button 
                            onClick={() => { setCheckinBooking(child); setCheckinMode('add_equipment'); setCheckinOpen(true); }} 
                            className={`${btnBase} hover:text-foreground`} 
                            title="Thêm dịch vụ"
                        >
                            <Plus size={15} />
                        </button>
                        <button 
                            onClick={() => handleAction(child._id, 'checkout')} 
                            className={`${btnBase} hover:text-emerald-600`} 
                            title="Check-out sân"
                        >
                            <StopCircle size={15} />
                        </button>
                    </>
                )}
                {child.status === 'completed' && !isSubRow && (
                    child.hasInvoice ? (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openInvoice(child)} 
                            className="h-8 text-xs font-semibold px-2.5 gap-1 border-border"
                        >
                            <FileText size={12} /> Hóa đơn
                        </Button>
                    ) : (
                        <Button 
                            size="sm" 
                            onClick={() => { setPaymentBooking(child); setPaymentOpen(true); }} 
                            className="h-8 text-xs font-semibold px-2.5 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <DollarSign size={12} /> Thanh toán
                        </Button>
                    )
                )}
                {child.status === 'cancelled' && child.cancelReason && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setCancelReasonBooking(child); setCancelReasonOpen(true); }}
                        className="h-8 text-xs text-muted-foreground hover:text-foreground font-semibold px-2.5 gap-1"
                    >
                        <Info size={12} /> Lý do hủy
                    </Button>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header Title */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Quản lý đặt sân</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Trang quản lý đơn hàng chuyên nghiệp &amp; tối ưu cho hệ thống
                </p>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Tổng đơn', val: stats.total, icon: <FileText size={15} className="text-muted-foreground" /> },
                    { label: 'Chờ xác nhận', val: stats.pending, icon: <Clock size={15} className="text-amber-500" />, border: 'border-amber-500/20' },
                    { label: 'Đã xác nhận', val: stats.confirmed, icon: <CheckCircle2 size={15} className="text-blue-500" />, border: 'border-blue-500/20' },
                    { label: 'Đang sử dụng', val: stats.inUse, icon: <PlayCircle size={15} className="text-violet-500" />, border: 'border-violet-500/20' },
                    { label: 'Hoàn thành', val: stats.completed, icon: <CheckCircle2 size={15} className="text-emerald-500" />, border: 'border-emerald-500/20' },
                    { label: 'Đã hủy', val: stats.cancelled, icon: <XCircle size={15} className="text-rose-500" />, border: 'border-rose-500/20' },
                ].map((stat) => (
                    <Card key={stat.label} className={`border border-border/80 rounded-xl shadow-xs overflow-hidden ${stat.border || ""}`}>
                        <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between space-y-0">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                            {stat.icon}
                        </CardHeader>
                        <CardContent className="p-3 pt-1">
                            <div className="text-xl font-bold text-foreground">{stat.val}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border border-border/80 rounded-xl overflow-hidden shadow-xs">
                <Tabs defaultValue="bookings" className="w-full">
                    <div className="border-b border-border/60 bg-muted/20 px-6 py-2">
                        <TabsList className="bg-transparent border-none p-0 h-fit gap-6">
                            <TabsTrigger value="bookings" className="data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-emerald-600 rounded-none px-0 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground data-[state=active]:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none focus:outline-none focus:ring-0 shadow-none border-t-0 border-x-0">
                                Đặt sân
                            </TabsTrigger>
                            <TabsTrigger value="refunds" className="data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-emerald-600 rounded-none px-0 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground data-[state=active]:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none focus:outline-none focus:ring-0 shadow-none border-t-0 border-x-0">
                                Hoàn tiền
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* TABS 1: BOOKINGS LIST */}
                    <TabsContent value="bookings" className="p-0 outline-none">
                        {/* Filters list */}
                        <div className="px-6 py-4 bg-muted/10 border-b border-border/60 flex flex-col md:flex-row items-center gap-3">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-2.5 text-muted-foreground/60" size={14} />
                                <Input
                                    placeholder="Tìm mã hoặc tên khách..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    className="pl-9 h-9 text-xs border-border bg-card"
                                />
                            </div>

                            {/* Horizontally scrollable filter pills on mobile */}
                            <div className="w-full md:w-auto overflow-x-auto whitespace-nowrap scrollbar-none py-1 flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mr-1 hidden md:inline">Trạng thái:</span>
                                {[
                                    { value: 'all', label: 'Tất cả' },
                                    ...Object.entries(STATUS_LABELS)
                                        .filter(([value]) => value !== 'multiple')
                                        .map(([value, label]) => ({ value, label }))
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setFilters({ ...filters, status: opt.value })}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                                            filters.status === opt.value
                                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                                : 'bg-card border-border text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            <div className="w-full md:w-auto flex items-center gap-2">
                                <input
                                    type="date"
                                    value={filters.date}
                                    onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                                    className="h-9 px-3 text-xs text-foreground bg-card border border-border rounded-lg focus:outline-none focus:border-indigo-500 w-full md:w-36"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                        fetchBookings();
                                        fetchStats();
                                    }}
                                    className="h-9 w-9 shrink-0 border-border"
                                    title="Tải lại dữ liệu"
                                    disabled={loading}
                                >
                                    <RefreshCw size={13} className={loading ? "animate-spin text-emerald-600" : ""} />
                                </Button>
                            </div>
                        </div>

                        {/* LIST RENDER: MOBILE CARDS vs DESKTOP TABLE */}
                        <div className="p-6">
                            {loading && bookings.length === 0 ? (
                                <div className="py-20 text-center text-muted-foreground text-xs font-semibold">
                                    Đang tải danh sách đặt sân...
                                </div>
                            ) : groupedBookings.length === 0 ? (
                                <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center border border-dashed rounded-2xl">
                                    <CalendarDays size={32} className="opacity-20 mb-2" />
                                    <p className="text-sm font-semibold">Không tìm thấy đơn đặt sân nào</p>
                                    <p className="text-[11px] opacity-75 mt-0.5">Vui lòng thử đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                                </div>
                            ) : (
                                <>
                                    {/* 1. Mobile card stacks layout (<md) */}
                                    <div className="block md:hidden space-y-4">
                                        {groupedBookings.map((b) => {
                                            const name = b.customerInfo?.name || b.customerId?.name || b.customerId?.username || 'Ẩn danh';
                                            const phone = b.customerInfo?.phone || b.customerId?.phone;
                                            const email = b.customerInfo?.email || b.customerId?.email;
                                            const hasMultiSlots = !b.isGroup && Array.isArray(b.slots) && b.slots.length > 1;

                                            return (
                                                <Card key={b.key || b._id} className="border border-border/80 shadow-xs rounded-xl overflow-hidden p-4 space-y-3.5">
                                                    {/* Row 1: Code & Status */}
                                                    <div className="flex justify-between items-center pb-2 border-b border-border/40">
                                                        <div className="flex items-center gap-1.5 font-bold text-foreground text-sm font-mono">
                                                            {b.isGroup || hasMultiSlots ? <Layers size={13} className="text-muted-foreground" /> : <FileText size={13} className="text-muted-foreground" />}
                                                            #{b.code}
                                                        </div>
                                                        <div className="flex items-center gap-1 flex-wrap justify-end max-w-[185px]">
                                                            {b.isGroup ? (
                                                                Array.from(new Set(b.groupedItems.map((item: any) => item.status)))
                                                                    .map((status: any) => (
                                                                        <span key={status} className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase border ${getStatusStyle(status)}`}>
                                                                            {STATUS_LABELS[status] || status}
                                                                        </span>
                                                                    ))
                                                            ) : (
                                                                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase border ${getStatusStyle(b.status)}`}>
                                                                    {STATUS_LABELS[b.status] || b.status}
                                                                </span>
                                                            )}
                                                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase border ${getPaymentStyle(b.paymentStatus)}`}>
                                                                {PAYMENT_STATUS_LABELS[b.paymentStatus] || b.paymentStatus}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Row 2: Customer info details */}
                                                    <div className="text-xs space-y-1">
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-semibold text-foreground">{name}</span>
                                                            {phone && <span className="text-muted-foreground">({phone})</span>}
                                                        </div>
                                                        <div className="text-muted-foreground font-semibold flex items-center gap-1.5">
                                                            <MapPin size={10} />
                                                            <span>Sân: {b.courtId?.name || "—"}</span>
                                                            <span className="text-border">|</span>
                                                            <span>{dayjs(b.date).format('DD/MM/YYYY')}</span>
                                                        </div>
                                                        
                                                        {/* Hour slots details */}
                                                        <div className="pt-1.5 space-y-1">
                                                            {b.isGroup ? (
                                                                b.groupedItems.map((child: any, idx: number) => (
                                                                    <div key={idx} className="flex items-center gap-1.5 text-[10px] text-foreground bg-muted/65 p-1 rounded border border-border/40">
                                                                        <span className="font-bold shrink-0">Ca {idx+1}:</span>
                                                                        <span>{child.startTime} - {child.endTime}</span>
                                                                    </div>
                                                                ))
                                                            ) : hasMultiSlots ? (
                                                                b.slots.map((s: any, idx: number) => (
                                                                    <div key={idx} className="flex items-center gap-1.5 text-[10px] text-foreground bg-muted/65 p-1 rounded border border-border/40">
                                                                        <span className="font-bold shrink-0">Ca {idx+1}:</span>
                                                                        <span>{s.startTime} - {s.endTime}</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="flex items-center gap-1.5 text-[10px] text-foreground bg-muted/65 p-1 rounded border border-border/40 w-max">
                                                                    <Clock size={10} />
                                                                    <span>{b.startTime} - {b.endTime}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Row 3: Totals & Action Operations toolbar */}
                                                    <div className="flex flex-row items-center justify-between pt-2 border-t border-border/40">
                                                        <div>
                                                            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Tổng tiền</span>
                                                            <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">{formatVND(b.total)}</div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {b.isGroup ? (
                                                                (() => {
                                                                    const activeGroupItems = b.groupedItems.filter((item: any) => item.status !== 'cancelled');
                                                                    const allCompleted = activeGroupItems.length > 0 && activeGroupItems.every((item: any) => item.status === 'completed');
                                                                    const groupHasInvoice = activeGroupItems.some((item: any) => item.hasInvoice);
                                                                    
                                                                    return groupHasInvoice ? (
                                                                        <Button 
                                                                            variant="outline" 
                                                                            size="sm" 
                                                                            onClick={() => {
                                                                                const invBooking = b.groupedItems.find((item: any) => item.hasInvoice) || b.groupedItems[0];
                                                                                openInvoice(invBooking);
                                                                            }} 
                                                                            className="h-8 text-xs font-semibold px-2.5 gap-1 border-border"
                                                                        >
                                                                            <FileText size={11} /> Hóa đơn
                                                                        </Button>
                                                                    ) : allCompleted ? (
                                                                        <Button 
                                                                            size="sm" 
                                                                            onClick={() => { setPaymentBooking(b); setPaymentOpen(true); }} 
                                                                            className="h-8 text-xs font-semibold px-2.5 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                        >
                                                                            <DollarSign size={11} /> Thanh toán
                                                                        </Button>
                                                                    ) : (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => { setSelectedDetailId(b.groupedItems[0]?._id); setDetailOpen(true); }}
                                                                            className="h-8 text-xs text-muted-foreground font-semibold px-2.5"
                                                                        >
                                                                            Chi tiết
                                                                        </Button>
                                                                    );
                                                                })()
                                                            ) : (
                                                                renderActionButtons(b)
                                                            )}
                                                        </div>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>

                                    {/* 2. Desktop table layout (>=md) */}
                                    <div className="hidden md:block overflow-x-auto border border-border/60 rounded-xl shadow-xs">
                                        <Table>
                                            <TableHeader className="bg-muted/30">
                                                <TableRow>
                                                    <TableHead className="w-[140px] text-[10px] font-bold uppercase tracking-wider">Mã đặt</TableHead>
                                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Khách hàng</TableHead>
                                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Sân</TableHead>
                                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Ngày đặt</TableHead>
                                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Giờ chơi</TableHead>
                                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Tổng tiền</TableHead>
                                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Trạng thái đơn</TableHead>
                                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Trạng thái thanh toán</TableHead>
                                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Thao tác</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {groupedBookings.map((b) => {
                                                    const name = b.customerInfo?.name || b.customerId?.name || b.customerId?.username || 'Ẩn danh';
                                                    const phone = b.customerInfo?.phone || b.customerId?.phone;
                                                    const email = b.customerInfo?.email || b.customerId?.email;
                                                    const hasMultiSlots = !b.isGroup && Array.isArray(b.slots) && b.slots.length > 1;

                                                    return (
                                                        <TableRow key={b.key || b._id} className="hover:bg-muted/10">
                                                            <TableCell className="font-medium font-mono text-xs">
                                                                <div className="flex items-center gap-1.5">
                                                                    {b.isGroup || hasMultiSlots ? <Layers size={13} className="text-muted-foreground/60" /> : <FileText size={13} className="text-muted-foreground/60" />}
                                                                    #{b.code}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex flex-col text-xs">
                                                                    <span className="font-bold text-foreground">{name}</span>
                                                                    {phone && <span className="text-[10px] text-muted-foreground mt-0.5">{phone}</span>}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-xs font-semibold text-foreground/80">{b.courtId?.name || "—"}</TableCell>
                                                            <TableCell className="text-xs text-muted-foreground font-semibold">{dayjs(b.date).format('DD/MM/YYYY')}</TableCell>
                                                            <TableCell>
                                                                {b.isGroup ? (
                                                                    <div className="flex flex-col gap-1">
                                                                        {b.groupedItems.map((child: any, idx: number) => (
                                                                            <span key={idx} className="text-[10px] bg-muted px-1.5 py-0.5 rounded leading-none border border-border/50 text-muted-foreground w-max font-semibold">
                                                                                Ca {idx+1}: {child.startTime} - {child.endTime}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : hasMultiSlots ? (
                                                                    <div className="flex flex-col gap-1">
                                                                        {b.slots.map((s: any, idx: number) => (
                                                                            <span key={idx} className="text-[10px] bg-muted px-1.5 py-0.5 rounded leading-none border border-border/50 text-muted-foreground w-max font-semibold">
                                                                                Ca {idx+1}: {s.startTime} - {s.endTime}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded leading-none border border-border/50 text-muted-foreground font-semibold">
                                                                        {b.startTime} - {b.endTime}
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="font-bold text-foreground font-mono text-xs">{formatVND(b.total)}</TableCell>
                                                            <TableCell>
                                                                <div className="flex flex-col gap-1 w-max">
                                                                    {b.isGroup ? (
                                                                        Array.from(new Set(b.groupedItems.map((item: any) => item.status)))
                                                                            .filter(status => status !== 'multiple')
                                                                            .map((status: any) => (
                                                                                <Badge key={status} variant="secondary" className={`text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider ${getStatusStyle(status)}`}>
                                                                                    {STATUS_LABELS[status] || status}
                                                                                </Badge>
                                                                            ))
                                                                    ) : (
                                                                        <Badge variant="secondary" className={`text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider ${getStatusStyle(b.status)}`}>
                                                                            {STATUS_LABELS[b.status] || b.status}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="secondary" className={`text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider ${getPaymentStyle(b.paymentStatus)}`}>
                                                                    {PAYMENT_STATUS_LABELS[b.paymentStatus] || b.paymentStatus}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                {b.isGroup ? (
                                                                    (() => {
                                                                        const activeGroupItems = b.groupedItems.filter((item: any) => item.status !== 'cancelled');
                                                                        const allCompleted = activeGroupItems.length > 0 && activeGroupItems.every((item: any) => item.status === 'completed');
                                                                        const groupHasInvoice = activeGroupItems.some((item: any) => item.hasInvoice);
                                                                        
                                                                        return (
                                                                            <div className="flex flex-col gap-1">
                                                                                {groupHasInvoice ? (
                                                                                    <Button 
                                                                                        variant="outline" 
                                                                                        size="sm" 
                                                                                        onClick={() => {
                                                                                            const invBooking = b.groupedItems.find((item: any) => item.hasInvoice) || b.groupedItems[0];
                                                                                            openInvoice(invBooking);
                                                                                        }} 
                                                                                        className="h-8 text-xs font-semibold px-2.5 gap-1 border-border w-max"
                                                                                    >
                                                                                        <FileText size={11} /> Hóa đơn cả đơn
                                                                                    </Button>
                                                                                ) : allCompleted ? (
                                                                                    <Button 
                                                                                        size="sm" 
                                                                                        onClick={() => { setPaymentBooking(b); setPaymentOpen(true); }} 
                                                                                        className="h-8 text-xs font-semibold px-2.5 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white w-max"
                                                                                    >
                                                                                        <DollarSign size={11} /> Thanh toán cả đơn
                                                                                    </Button>
                                                                                ) : (
                                                                                    <div className="flex flex-col gap-1.5">
                                                                                        {b.groupedItems.map((child: any, idx: number) => (
                                                                                            <div key={idx} className="flex items-center gap-2 pb-1 last:pb-0 border-b border-dashed last:border-none">
                                                                                                <span className="text-[9px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">Ca {idx+1}</span>
                                                                                                {renderActionButtons(child, true)}
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()
                                                                ) : (
                                                                    renderActionButtons(b)
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </>
                            )}
                        </div>
                    </TabsContent>

                    {/* TABS 2: REFUNDS LIST */}
                    <TabsContent value="refunds" className="p-0 outline-none">
                        {/* Filters list */}
                        <div className="px-6 py-4 bg-muted/10 border-b border-border/60 flex flex-col md:flex-row items-center gap-3">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-2.5 text-muted-foreground/60" size={14} />
                                <Input
                                    placeholder="Tìm mã hoặc tên khách..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    className="pl-9 h-9 text-xs border-border bg-card"
                                />
                            </div>

                            {/* Horizontal scroll pills on mobile */}
                            <div className="w-full md:w-auto overflow-x-auto whitespace-nowrap scrollbar-none py-1 flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mr-1 hidden md:inline">Trạng thái hoàn:</span>
                                {[
                                    { value: 'all', label: 'Tất cả' },
                                    { value: 'pending', label: 'Chờ xử lý' },
                                    { value: 'processing', label: 'Đang hoàn' },
                                    { value: 'refunded', label: 'Hoàn thành' },
                                    { value: 'rejected', label: 'Từ chối' },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setRefundFilter(opt.value as any)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                                            refundFilter === opt.value
                                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                                : 'bg-card border-border text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            <div className="w-full md:w-auto flex items-center gap-2">
                                <input
                                    type="date"
                                    value={filters.date}
                                    onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                                    className="h-9 px-3 text-xs text-foreground bg-card border border-border rounded-lg focus:outline-none focus:border-indigo-500 w-full md:w-36"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                        fetchBookings();
                                        fetchStats();
                                    }}
                                    className="h-9 w-9 shrink-0 border-border"
                                    title="Tải lại dữ liệu"
                                    disabled={loading}
                                >
                                    <RefreshCw size={13} className={loading ? "animate-spin text-emerald-600" : ""} />
                                </Button>
                            </div>
                        </div>

                        {/* REFUND LIST CARDS/TABLE */}
                        <div className="p-6">
                            {loading && bookings.length === 0 ? (
                                <div className="py-20 text-center text-muted-foreground text-xs font-semibold">
                                    Đang tải danh sách hoàn tiền...
                                </div>
                            ) : filteredRefundBookings.length === 0 ? (
                                <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center border border-dashed rounded-2xl">
                                    <Landmark size={32} className="opacity-20 mb-2" />
                                    <p className="text-sm font-semibold">Không tìm thấy yêu cầu hoàn tiền nào</p>
                                    <p className="text-[11px] opacity-75 mt-0.5">Vui lòng thử đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                                </div>
                            ) : (
                                <>
                                    {/* 1. Mobile card stacks layout for refunds (<md) */}
                                    <div className="block md:hidden space-y-4">
                                        {filteredRefundBookings.map((b) => {
                                            const name = b.customerInfo?.name || b.customerId?.name || b.customerId?.username || 'Ẩn danh';
                                            const phone = b.customerInfo?.phone || b.customerId?.phone;
                                            
                                            return (
                                                <Card key={b._id} className="border border-border/80 shadow-xs rounded-xl overflow-hidden p-4 space-y-3.5">
                                                    {/* Header row */}
                                                    <div className="flex justify-between items-center pb-2 border-b border-border/40">
                                                        <span className="font-bold text-foreground text-xs font-mono">#{b.code}</span>
                                                        <Badge variant="secondary" className={`text-[9px] uppercase font-bold px-2 py-0.5 ${
                                                            b.refundStatus === 'pending'
                                                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                                                : b.refundStatus === 'processing'
                                                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                                                    : b.refundStatus === 'refunded'
                                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                                        }`}>
                                                            {REFUND_LABELS[b.refundStatus || ''] || b.refundStatus}
                                                        </Badge>
                                                    </div>

                                                    {/* Customer & Court info details */}
                                                    <div className="text-xs space-y-1">
                                                        <div className="font-semibold text-foreground">{name}</div>
                                                        {phone && <div className="text-muted-foreground font-mono">{phone}</div>}
                                                        <div className="text-muted-foreground font-semibold">
                                                            Sân: {b.courtId?.name || "—"} · {dayjs(b.date).format('DD/MM/YYYY')}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground mt-1">
                                                            Thuê lúc: {b.startTime} - {b.endTime}
                                                        </div>
                                                    </div>

                                                    {/* Totals & actions */}
                                                    <div className="flex flex-row items-center justify-between pt-2 border-t border-border/40">
                                                        <div>
                                                            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Tiền đặt cọc</span>
                                                            <div className="font-bold text-rose-600 dark:text-rose-400 font-mono text-sm">{formatVND(b.depositAmount)}</div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 text-xs font-semibold border-border px-2.5"
                                                                onClick={() => { setRefundBooking(b); setRefundMode('account'); setRefundOpen(true); }}
                                                            >
                                                                Chi tiết TK
                                                            </Button>

                                                            {/* Quick action buttons for processing */}
                                                            {b.refundStatus === 'pending' && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleRefundStatusChange(b._id, 'processing')}
                                                                    className="h-8 text-xs font-semibold px-2.5 bg-blue-600 hover:bg-blue-700 text-white"
                                                                >
                                                                    Xử lý
                                                                </Button>
                                                            )}
                                                            {b.refundStatus === 'processing' && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleRefundStatusChange(b._id, 'refunded')}
                                                                    className="h-8 text-xs font-semibold px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                >
                                                                    Hoàn tất
                                                                </Button>
                                                            )}
                                                            {(b.refundStatus === 'pending' || b.refundStatus === 'processing') && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleRefundStatusChange(b._id, 'rejected')}
                                                                    className="h-8 text-xs font-semibold px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                                >
                                                                    Từ chối
                                                                </Button>
                                                            )}
                                                            {(b.refundStatus === 'refunded' || b.refundStatus === 'rejected') && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => { setRefundBooking(b); setRefundMode('admin'); setRefundOpen(true); }}
                                                                    className="h-8 text-xs font-semibold px-2.5 text-muted-foreground hover:text-foreground"
                                                                >
                                                                    Lịch sử xử lý
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>

                                    {/* 2. Desktop table layout for refunds (>=md) */}
                                    <div className="hidden md:block overflow-x-auto border border-border/60 rounded-xl shadow-xs">
                                        <Table>
                                            <TableHeader className="bg-muted/30">
                                                <TableRow>
                                                    <TableHead className="w-[120px] text-[10px] font-bold uppercase tracking-wider">Mã đơn</TableHead>
                                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Khách hàng</TableHead>
                                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Sân</TableHead>
                                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Ngày / Giờ đặt</TableHead>
                                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Tiền cọc</TableHead>
                                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Trạng thái</TableHead>
                                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Thao tác</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredRefundBookings.map((b) => {
                                                    const name = b.customerInfo?.name || b.customerId?.name || b.customerId?.username || 'Ẩn danh';
                                                    const phone = b.customerInfo?.phone || b.customerId?.phone;

                                                    return (
                                                        <TableRow key={b._id} className="hover:bg-muted/10">
                                                            <TableCell className="font-semibold text-xs">#{b.code}</TableCell>
                                                            <TableCell>
                                                                <div className="flex flex-col text-xs">
                                                                    <span className="font-bold text-foreground">{name}</span>
                                                                    {phone && <span className="text-[10px] text-muted-foreground mt-0.5">{phone}</span>}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-xs font-semibold text-foreground/80">{b.courtId?.name || "—"}</TableCell>
                                                            <TableCell>
                                                                <div className="text-xs font-semibold text-muted-foreground">
                                                                    <p>{dayjs(b.date).format('DD/MM/YYYY')}</p>
                                                                    <p className="text-[10px] text-muted-foreground/75 mt-0.5">{b.startTime} - {b.endTime}</p>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="font-bold text-rose-600 dark:text-rose-400 font-mono text-xs">{formatVND(b.depositAmount)}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="secondary" className={`text-[10px] font-bold px-2 py-0.5 ${
                                                                    b.refundStatus === 'pending'
                                                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                                                        : b.refundStatus === 'processing'
                                                                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                                                            : b.refundStatus === 'refunded'
                                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                                                }`}>
                                                                    {REFUND_LABELS[b.refundStatus || ''] || b.refundStatus}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-1.5">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-8 text-xs font-semibold border-border px-2.5"
                                                                        onClick={() => { setRefundBooking(b); setRefundMode('account'); setRefundOpen(true); }}
                                                                    >
                                                                        Chi tiết TK
                                                                    </Button>

                                                                    {/* Quick action buttons for processing */}
                                                                    {b.refundStatus === 'pending' && (
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => handleRefundStatusChange(b._id, 'processing')}
                                                                            className="h-8 text-xs font-semibold px-2.5 bg-blue-600 hover:bg-blue-700 text-white"
                                                                        >
                                                                            Xử lý
                                                                        </Button>
                                                                    )}
                                                                    {b.refundStatus === 'processing' && (
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => handleRefundStatusChange(b._id, 'refunded')}
                                                                            className="h-8 text-xs font-semibold px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                        >
                                                                            Hoàn tất
                                                                        </Button>
                                                                    )}
                                                                    {(b.refundStatus === 'pending' || b.refundStatus === 'processing') && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleRefundStatusChange(b._id, 'rejected')}
                                                                            className="h-8 text-xs font-semibold px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                                        >
                                                                            Từ chối
                                                                        </Button>
                                                                    )}
                                                                    {(b.refundStatus === 'refunded' || b.refundStatus === 'rejected') && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => { setRefundBooking(b); setRefundMode('admin'); setRefundOpen(true); }}
                                                                            className="h-8 text-xs font-semibold px-2.5 text-muted-foreground hover:text-foreground"
                                                                        >
                                                                            Lịch sử xử lý
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </Card>

            {/* Modal EDIT hours / courts */}
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

            {/* Modal Checkin & Services */}
            <BookingCheckinModal
                open={checkinOpen}
                booking={checkinBooking}
                mode={checkinMode}
                onClose={() => { setCheckinOpen(false); setCheckinBooking(null); }}
                onSuccess={() => {
                    setCheckinOpen(false);
                    setCheckinBooking(null);
                    fetchBookings();
                    fetchStats();
                }}
            />

            {/* Modal Booking Payments */}
            <BookingPaymentModal
                open={paymentOpen}
                booking={paymentBooking}
                onClose={() => { setPaymentOpen(false); setPaymentBooking(null); }}
                onSuccess={() => {
                    setPaymentOpen(false);
                    setPaymentBooking(null);
                    fetchBookings();
                    fetchStats();
                }}
            />

            {/* Modal Invoice print viewer */}
            <BookingInvoiceModal
                open={invoiceOpen}
                invoiceDetail={invoiceDetail}
                loading={invoiceLoading}
                onClose={() => { setInvoiceOpen(false); setInvoiceDetail(null); }}
            />

            {/* Modal Refund destination banking account logs */}
            <BookingRefundModal
                open={refundOpen}
                booking={refundBooking}
                mode={refundMode}
                onClose={() => { setRefundOpen(false); setRefundBooking(null); }}
            />

            {/* Modal Cancel Cash payments */}
            <BookingCancelCashModal
                open={cancelCashOpen}
                booking={cancelCashBooking}
                onClose={() => { setCancelCashOpen(false); setCancelCashBooking(null); }}
                onSuccess={() => {
                    setCancelCashOpen(false);
                    setCancelCashBooking(null);
                    fetchBookings();
                    fetchStats();
                }}
            />

            {/* Modal Active session logs detail */}
            <BookingDetailModal
                open={detailOpen}
                bookingId={selectedDetailId}
                onClose={() => { setDetailOpen(false); setSelectedDetailId(null); }}
            />

            {/* Modal Reject refund request logs */}
            <BookingRejectModal
                open={rejectOpen}
                booking={rejectBooking}
                onClose={() => { setRejectOpen(false); setRejectBooking(null); }}
                onSuccess={() => {
                    setRejectOpen(false);
                    setRejectBooking(null);
                    fetchBookings();
                    fetchStats();
                }}
            />

            {/* Modal Upload image receipts for refunds completed */}
            <BookingBillUploadModal
                open={billUploadOpen}
                booking={billUploadBooking}
                onClose={() => { setBillUploadOpen(false); setBillUploadBooking(null); }}
                onSuccess={() => {
                    setBillUploadOpen(false);
                    setBillUploadBooking(null);
                    fetchBookings();
                    fetchStats();
                }}
            />

            {/* Dialog displaying Cancel Reason logs (Replaces standard antd Modal.info trigger) */}
            <Dialog open={cancelReasonOpen} onOpenChange={(v) => !v && setCancelReasonOpen(false)}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 border border-border/80 rounded-2xl shadow-xl bg-card">
                    <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20">
                        <div className="flex items-center gap-2.5">
                            <Info className="text-rose-500" size={18} />
                            <div>
                                <DialogTitle className="text-base font-bold text-foreground">Lý do hủy đơn đặt</DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    Đơn đặt: #{cancelReasonBooking?.code || "—"}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="p-6 space-y-4 text-xs">
                        <div className="p-3.5 rounded-xl bg-muted/10 border border-border/60">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Thông tin khách hàng</span>
                            <p className="font-bold text-foreground mt-1">
                                {cancelReasonBooking?.customerInfo?.name || cancelReasonBooking?.customerId?.name || "Khách lẻ"}
                                {cancelReasonBooking?.customerInfo?.phone && ` (${cancelReasonBooking.customerInfo.phone})`}
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-700 dark:text-rose-400 italic font-semibold">
                            "{cancelReasonBooking?.cancelReason || "Không có lý do cụ thể."}"
                        </div>
                        <div className="flex items-center justify-end pt-2 border-t border-border/40">
                            <Button variant="ghost" className="text-xs font-semibold h-10 px-4" onClick={() => setCancelReasonOpen(false)}>
                                Đóng
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
