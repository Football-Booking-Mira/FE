import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import dayjs, { Dayjs } from "dayjs";
import { toast } from "sonner";
import {
    Search,
    UserPlus,
    Users,
    Shield,
    Clock,
    CalendarPlus,
    Zap,
    CheckCircle2,
    User as UserIcon,
    Mail,
    Phone,
    ChevronRight,
    Wallet,
    X,
    Loader2
} from "lucide-react";

import api from "@/common/utils/api";
import { PAYMENT_METHOD } from "@/common/constants/enums.ts";
import BookingTimeSelector, {
    type SelectedSlot,
} from "@/components/BookingTimeSelector";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const formatVND = (v: number = 0) =>
    `${v.toLocaleString('vi-VN')}đ`;

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
    indoor: "Trong nhà",
    outdoor: "Ngoài trời",
    vip: "Sân VIP",
};

const COURT_TYPE_CONFIG: Record<string, { bg: string; border: string; text: string }> = {
    indoor: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' },
    outdoor: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-600 dark:text-blue-400' },
    vip: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-600 dark:text-amber-400' },
};

const generateBookingCode = (dateStr: string) => {
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const cleanDate = dateStr.replace(/-/g, "");
    return `BK-${cleanDate}-${random}`;
};

const BookingCreate: React.FC = () => {
    const navigate = useNavigate();

    const [customerSearch, setCustomerSearch] = useState("");
    const [customerList, setCustomerList] = useState<Customer[]>([]);
    const [customerLoading, setCustomerLoading] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isCustomerListModalOpen, setCustomerListModalOpen] = useState(false);
    
    // Add customer form state
    const [isCustomerCreateModalOpen, setCustomerCreateModalOpen] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerPhone, setNewCustomerPhone] = useState("");
    const [newCustomerEmail, setNewCustomerEmail] = useState("");
    const [formErrors, setFormErrors] = useState<{name?: string, phone?: string}>({});
    const [customerSaving, setCustomerSaving] = useState(false);

    const [courts, setCourts] = useState<Court[]>([]);
    const [courtLoading, setCourtLoading] = useState(false);
    const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);

    const [date, setDate] = useState<Dayjs | null>(null);
    const [startTime, setStartTime] = useState<string | undefined>();
    const [endTime, setEndTime] = useState<string | undefined>();
    const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);

    const [fieldPrice, setFieldPrice] = useState(0);
    const depositAmount = Math.round(fieldPrice * 0.5);
    const [isDepositPaid, setIsDepositPaid] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchCourts = async () => {
            try {
                setCourtLoading(true);
                const res = await api.get("/courts", { params: { status: "active" } });
                const data = res.data?.data || res.data;
                setCourts(Array.isArray(data) ? data : []);
            } catch { 
                toast.error("Không tải được danh sách sân"); 
            } finally { 
                setCourtLoading(false); 
            }
        };
        fetchCourts();
    }, []);

    const handleSearchCustomer = async () => {
        if (!customerSearch.trim()) {
            toast.error("Vui lòng nhập tên hoặc số điện thoại");
            return;
        }
        try {
            setCustomerLoading(true);
            const res = await api.get("/users", { params: { search: customerSearch.trim() } });
            const data = res.data?.data || res.data;
            const list = Array.isArray(data) ? data : [];
            setCustomerList(list);
            if (list.length === 0) {
                toast.error("Không tìm thấy khách hàng");
            } else {
                setCustomerListModalOpen(true);
            }
        } catch { 
            toast.error("Không tìm được khách hàng"); 
        } finally { 
            setCustomerLoading(false); 
        }
    };

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
        setFieldPrice(sorted.reduce((sum, s) => sum + (s.price || 0), 0));
        setIsDepositPaid(false);
    }, []);

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

    const handleCreateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: {name?: string, phone?: string} = {};
        if (!newCustomerName.trim()) errors.name = "Vui lòng nhập họ tên";
        else if (newCustomerName.trim().length < 2) errors.name = "Họ tên phải có ít nhất 2 ký tự";
        
        if (!newCustomerPhone.trim()) errors.phone = "Vui lòng nhập số điện thoại";
        else if (!/^0[0-9]{9}$/.test(newCustomerPhone.trim())) {
            errors.phone = "Số điện thoại phải đúng 10 chữ số và bắt đầu bằng số 0";
        }
        
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }
        setFormErrors({});

        try {
            setCustomerSaving(true);
            const token = localStorage.getItem("token");
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
            const res = await fetch(`${API_URL}/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
                body: JSON.stringify({ name: newCustomerName, phone: newCustomerPhone, email: newCustomerEmail || "" }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.status !== 200 && res.status !== 201) return toast.error(data.message || "Không thể thêm khách hàng");
            setSelectedCustomer(data.user || data.data || data);
            toast.success("Thêm khách hàng thành công!");
            setCustomerCreateModalOpen(false);
            
            // Clear form fields
            setNewCustomerName("");
            setNewCustomerPhone("");
            setNewCustomerEmail("");
        } catch (err: any) {
            toast.error("Có lỗi xảy ra khi tạo khách hàng");
        } finally {
            setCustomerSaving(false);
        }
    };

    const handleSubmitBooking = async () => {
        if (!selectedCourt) return toast.error("Vui lòng chọn sân");
        if (!date || !startTime || !endTime) return toast.error("Vui lòng chọn ngày giờ");
        if (!selectedCustomer) return toast.error("Vui lòng chọn hoặc thêm khách hàng");
        if (!selectedSlots.length) return toast.error("Vui lòng chọn ít nhất một ca giờ");

        const dateStr = date.format("YYYY-MM-DD");

        setSubmitting(true);
        try {
            const bookingCode = generateBookingCode(dateStr);
            const slotsPayload = selectedSlots.map((s) => ({ startTime: s.startTime, endTime: s.endTime }));
            const res = await api.post("/bookings", {
                courtId: selectedCourt._id, 
                customerId: selectedCustomer._id, 
                date: dateStr,
                startTime, 
                endTime, 
                slots: slotsPayload, 
                totalFieldAmount: fieldPrice, 
                note: "",
                isOffline: true, 
                paymentMethod: PAYMENT_METHOD?.CASH || "cash",
                paidAtCreation: isDepositPaid, 
                isDepositPaid, 
                depositAmount,
                customerInfo: { name: selectedCustomer.name, phone: selectedCustomer.phone, email: selectedCustomer.email || "" },
                bookingCode,
            });
            const bookingData = res.data?.data || res.data;
            const displayCode = Array.isArray(bookingData) ? bookingData[0]?.code : bookingData?.code;
            toast.success(`Đặt sân thành công — Mã: ${displayCode || bookingCode}`);
            navigate("/admin/bookings");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Tạo đơn thất bại");
        } finally { 
            setSubmitting(false); 
        }
    };

    const SummaryRow = ({ label, value, icon, accent }: { label: string; value: React.ReactNode; icon?: React.ReactNode; accent?: boolean }) => (
        <div className="flex items-center justify-between py-2.5 text-xs border-b border-border/40 last:border-0">
            <span className="text-muted-foreground flex items-center gap-2">{icon}{label}</span>
            <span className={`font-semibold text-right max-w-[180px] truncate ${accent ? 'text-emerald-600' : 'text-foreground'}`}>
                {value || <span className="text-muted-foreground/45 text-[10px] font-normal italic">Chưa chọn</span>}
            </span>
        </div>
    );

    return (
        <div className="px-4 pb-16 pt-6 space-y-6 max-w-7xl mx-auto">
            {/* Header Title */}
            <div className="text-left">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Đặt sân nhanh</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Tạo đơn đặt sân tại quầy trực tiếp cho khách</p>
            </div>

            {/* Split Screen Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column (8 cols): Step Wizard */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* Step 1: Select Customer */}
                    <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-xs text-left">
                        <h2 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2.5 mb-4">
                            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-600 text-xs font-black shrink-0">1</span>
                            Chọn khách hàng
                        </h2>

                        {selectedCustomer ? (
                            <div className="flex items-center gap-3 p-3.5 bg-muted/20 border border-border rounded-xl">
                                <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                                    <UserIcon size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-foreground text-sm leading-snug">{selectedCustomer.name}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                                        {selectedCustomer.phone} {selectedCustomer.email && `· ${selectedCustomer.email}`}
                                    </div>
                                </div>
                                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20 uppercase shrink-0">Đã chọn</span>
                                <button onClick={() => setSelectedCustomer(null)} className="p-1.5 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 rounded-lg transition-colors shrink-0">
                                    <X size={15} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <div className="flex-1 relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                                    <input
                                        type="text" 
                                        placeholder="Nhập số điện thoại hoặc tên khách..."
                                        value={customerSearch}
                                        onChange={(e) => setCustomerSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchCustomer()}
                                        className="w-full h-10 pl-9 pr-4 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-indigo-400"
                                    />
                                </div>
                                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                    <Button onClick={handleSearchCustomer} className="flex-1 sm:flex-none h-10 px-4 bg-muted hover:bg-muted/80 text-foreground border border-border font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-none">
                                        {customerLoading ? <Loader2 size={13} className="animate-spin text-indigo-500" /> : <><Users size={13} />Tìm</>}
                                    </Button>
                                    <Button onClick={() => setCustomerCreateModalOpen(true)} className="flex-1 sm:flex-none h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10">
                                        <UserPlus size={13} /> Thêm khách mới
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Select Pitch */}
                    <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-xs text-left">
                        <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2.5 mb-5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-600 text-xs font-black shrink-0">2</span>
                            Chọn sân
                        </h3>

                        {courtLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                                <Loader2 size={24} className="animate-spin text-indigo-500" />
                                <span className="text-xs font-semibold">Đang tải danh sách sân...</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {courts.map((court) => {
                                    const isActive = selectedCourt?._id === court._id;
                                    const imageUrl = court.images?.[0] || "";
                                    const typeConf = COURT_TYPE_CONFIG[court.type] || { bg: 'bg-muted', border: 'border-border', text: 'text-muted-foreground' };
                                    
                                    return (
                                        <button 
                                            key={court._id} 
                                            onClick={() => setSelectedCourt(court)}
                                            className={`group text-left rounded-xl border-2 overflow-hidden transition-all duration-200 ${
                                                isActive
                                                    ? 'border-indigo-600 bg-indigo-500/[0.03] ring-1 ring-indigo-500/35 scale-[1.01]'
                                                    : 'border-border/80 hover:border-indigo-400 hover:bg-muted/10'
                                            }`}
                                        >
                                            <div className="flex gap-2">
                                                {imageUrl && (
                                                    <div className="w-24 h-24 shrink-0 overflow-hidden relative border-r border-border/40">
                                                        <img src={imageUrl} alt={court.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                    </div>
                                                )}
                                                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                                                    <div>
                                                        <div className="flex items-center justify-between gap-1 mb-1.5">
                                                            <span className="font-bold text-foreground text-xs leading-none truncate">{court.name}</span>
                                                            {isActive && <CheckCircle2 size={13} className="text-indigo-600 shrink-0" />}
                                                        </div>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${typeConf.bg} ${typeConf.border} ${typeConf.text} border text-[8px] font-extrabold rounded-md uppercase tracking-wider`}>
                                                            {COURT_TYPE_LABELS[court.type] || court.type}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-2 text-[10px] font-semibold font-mono">
                                                        <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">{court.basePrice.toLocaleString('vi-VN')}đ</span>
                                                        <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold"><Zap size={10} className="text-amber-500 shrink-0" />{court.peakPrice.toLocaleString('vi-VN')}đ</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {court.isBooked && (
                                                <div className="px-4 py-1 bg-rose-500/10 text-rose-600 text-[8px] font-black text-center uppercase tracking-wider rounded-b-xl border-t border-rose-500/10">
                                                    Đang có người đặt
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Step 3: Time Slot Selector */}
                    <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-xs text-left">
                        <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2.5 mb-5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-600 text-xs font-black shrink-0">3</span>
                            Chọn thời gian
                        </h3>
                        {selectedCourt ? (
                            <BookingTimeSelector
                                courtId={selectedCourt._id}
                                basePrice={selectedCourt.basePrice}
                                peakPrice={selectedCourt.peakPrice}
                                onSlotSelected={handleSlotSelected}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                                <Clock size={36} className="opacity-25" />
                                <p className="font-semibold text-xs">Vui lòng chọn sân trước</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column (4 cols): Sticky Checkout Receipt */}
                <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-4">
                    <div className="bg-card rounded-2xl border border-border/85 shadow-md overflow-hidden text-left">
                        
                        {/* Summary Header */}
                        <div className="p-5 border-b border-border/60 bg-muted/20">
                            <div className="text-[10px] font-black uppercase text-muted-foreground tracking-wider leading-none">Tóm tắt đơn</div>
                            <div className="text-base font-extrabold text-foreground mt-1.5 flex items-center gap-2">
                                <Shield size={16} className="text-indigo-500" />
                                Đơn đặt sân mới
                            </div>
                        </div>

                        {/* Order breakdown */}
                        <div className="p-5 space-y-0.5">
                            <SummaryRow label="Khách hàng" value={selectedCustomer?.name} icon={<UserIcon size={12} />} />
                            <SummaryRow label="Sân thi đấu" value={selectedCourt?.name} icon={<Shield size={12} />} />
                            <SummaryRow label="Ngày đặt" value={date?.format('DD/MM/YYYY')} icon={<CalendarPlus size={12} />} />
                            <SummaryRow 
                                label="Khung giờ" 
                                value={selectedSlots.length ? selectedSlots.map((s) => `${s.startTime}-${s.endTime}`).join(', ') : undefined} 
                                icon={<Clock size={12} />} 
                            />
                        </div>

                        {/* Pricing section */}
                        <div className="px-5 py-4 bg-muted/10 border-y border-border/50 space-y-2 text-xs">
                            <div className="flex items-center justify-between font-semibold">
                                <span className="text-muted-foreground">Tiền sân</span>
                                <span className="font-mono text-foreground">{formatVND(fieldPrice)}</span>
                            </div>
                            <div className="flex items-center justify-between font-semibold">
                                <span className="text-muted-foreground">Tiền cọc 50%</span>
                                <span className="font-mono text-amber-600 dark:text-amber-400">{formatVND(depositAmount)}</span>
                            </div>
                        </div>

                        {/* Deposit toggle flag check */}
                        <div className="p-5">
                            <button
                                type="button"
                                onClick={() => setIsDepositPaid((v) => !v)}
                                className={`w-full flex items-center justify-center gap-2 h-10 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border-2 ${
                                    isDepositPaid
                                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/10 hover:bg-emerald-700'
                                        : 'bg-transparent text-muted-foreground border-border/80 hover:border-indigo-500 hover:text-indigo-600'
                                }`}
                            >
                                <Wallet size={14} />
                                {isDepositPaid ? 'Đã thu tiền cọc' : 'Chưa cọc (ấn để xác nhận)'}
                            </button>
                        </div>

                        {/* Submit Button */}
                        <div className="px-5 pb-5">
                            <Button
                                onClick={handleSubmitBooking}
                                disabled={!selectedCustomer || !selectedCourt || submitting}
                                className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1.5"
                            >
                                {submitting ? <Loader2 size={14} className="animate-spin text-white" /> : <><CheckCircle2 size={14} /> XÁC NHẬN ĐẶT SÂN</>}
                            </Button>
                        </div>

                        {/* Policies footer detail */}
                        <div className="px-5 py-4 bg-muted/20 border-t border-border/40 text-[10px] font-semibold text-muted-foreground leading-relaxed space-y-1">
                            <p className="flex items-center gap-1">• Đơn đặt sân offline sẽ được tự động xác nhận.</p>
                            <p className="flex items-center gap-1">• Khách thanh toán số tiền còn lại tại quầy khi đá xong.</p>
                        </div>
                    </div>
                </div>

            </div>

            {/* Modal Customers Search List (Radix Dialog style) */}
            <Dialog open={isCustomerListModalOpen} onOpenChange={(v) => !v && setCustomerListModalOpen(false)}>
                <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto p-0 border border-border/80 rounded-2xl shadow-xl bg-card">
                    <DialogHeader className="px-5 py-4 border-b border-border bg-muted/20">
                        <DialogTitle className="text-sm font-extrabold text-foreground uppercase tracking-wider text-left">Kết quả tìm kiếm</DialogTitle>
                        <DialogDescription className="text-[10px] text-muted-foreground mt-0.5 text-left">Chọn một khách hàng bên dưới</DialogDescription>
                    </DialogHeader>
                    <div className="p-4 divide-y divide-border/50 max-h-[50vh] overflow-y-auto no-scrollbar">
                        {customerList.map((item) => (
                            <button
                                key={item._id}
                                onClick={() => { setSelectedCustomer(item); setCustomerListModalOpen(false); }}
                                className="w-full text-left p-3 flex items-center justify-between hover:bg-muted/40 rounded-xl transition-all duration-150"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                                        <UserIcon size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-foreground leading-snug truncate">{item.name}</div>
                                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{item.phone}</div>
                                    </div>
                                </div>
                                <ChevronRight size={14} className="text-muted-foreground/60 shrink-0" />
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal Create Customer Form (Radix Dialog style) */}
            <Dialog open={isCustomerCreateModalOpen} onOpenChange={(v) => !v && setCustomerCreateModalOpen(false)}>
                <DialogContent className="sm:max-w-md p-0 border border-border/80 rounded-2xl shadow-xl bg-card">
                    <DialogHeader className="px-5 py-4 border-b border-border bg-muted/20">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-indigo-500/15 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                                <UserPlus size={16} />
                            </div>
                            <div className="text-left">
                                <DialogTitle className="text-sm font-extrabold text-foreground uppercase tracking-wider">
                                    Thêm khách hàng mới
                                </DialogTitle>
                                <DialogDescription className="text-[10px] text-muted-foreground mt-0.5">
                                    Nhập thông tin chi tiết khách hàng bên dưới
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleCreateCustomer} className="p-5 space-y-4 text-left">
                        {/* Name Input */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider pl-0.5">Họ tên <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                                <input
                                    type="text"
                                    placeholder="Nhập họ tên khách hàng"
                                    value={newCustomerName}
                                    onChange={(e) => setNewCustomerName(e.target.value)}
                                    className={`w-full h-10 pl-9 pr-4 bg-card border ${formErrors.name ? 'border-rose-500' : 'border-border'} rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
                                />
                            </div>
                            {formErrors.name && <p className="text-[10px] text-rose-500 font-semibold pl-0.5">{formErrors.name}</p>}
                        </div>

                        {/* Phone Input */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider pl-0.5">Số điện thoại <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                                <input
                                    type="text"
                                    placeholder="Nhập số điện thoại (ví dụ: 0944444402)"
                                    value={newCustomerPhone}
                                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                                    className={`w-full h-10 pl-9 pr-4 bg-card border ${formErrors.phone ? 'border-rose-500' : 'border-border'} rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
                                />
                            </div>
                            {formErrors.phone && <p className="text-[10px] text-rose-500 font-semibold pl-0.5">{formErrors.phone}</p>}
                        </div>

                        {/* Email Input */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider pl-0.5">Email (tùy chọn)</label>
                            <div className="relative">
                                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                                <input
                                    type="text"
                                    placeholder="Nhập email khách hàng"
                                    value={newCustomerEmail}
                                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                                    className="w-full h-10 pl-9 pr-4 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-3.5 pt-4 border-t border-border/60 mt-5">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => { setCustomerCreateModalOpen(false); setFormErrors({}); }}
                                className="text-xs font-semibold h-10 px-4 rounded-xl text-muted-foreground hover:bg-muted"
                            >
                                Hủy bỏ
                            </Button>
                            <Button
                                type="submit"
                                disabled={customerSaving}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-5 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10 disabled:opacity-50"
                            >
                                {customerSaving ? <Loader2 size={13} className="animate-spin text-white" /> : null}
                                Lưu khách hàng
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BookingCreate;
