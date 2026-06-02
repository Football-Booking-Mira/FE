import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Modal,
  Form,
  Input,
  List,
  Avatar,
  Spin,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import {
  Search,
  UserPlus,
  Users,
  Shield,
  Clock,
  CalendarPlus,
  Zap,
  DollarSign,
  CheckCircle2,
  User,
  Mail,
  Phone,
  ChevronRight,
  Wallet,
  CreditCard,
  X,
} from "lucide-react";
import { UserOutlined } from "@ant-design/icons";
import api from "@/common/utils/api";
import { PAYMENT_METHOD } from "@/common/constants/enums.ts";
import { toast } from "react-toastify";
import BookingTimeSelector, {
  type SelectedSlot,
} from "@/components/BookingTimeSelector";

const { TextArea } = Input;

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

const COURT_TYPE_CONFIG: Record<string, { gradient: string; shadow: string }> = {
  indoor: { gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
  outdoor: { gradient: 'from-blue-500 to-cyan-600', shadow: 'shadow-blue-500/20' },
  vip: { gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
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
  const [isCustomerCreateModalOpen, setCustomerCreateModalOpen] = useState(false);
  const [createCustomerForm] = Form.useForm();

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
      } catch { toast.error("Không tải được danh sách sân"); }
      finally { setCourtLoading(false); }
    };
    fetchCourts();
  }, []);

  const handleSearchCustomer = async () => {
    try {
      setCustomerLoading(true);
      const res = await api.get("/users", { params: { search: customerSearch.trim() } });
      const data = res.data?.data || res.data;
      setCustomerList(Array.isArray(data) ? data : []);
      setCustomerListModalOpen(true);
    } catch { toast.error("Không tìm được khách hàng"); }
    finally { setCustomerLoading(false); }
  };

  const handleSlotSelected = useCallback((slots: SelectedSlot[]) => {
    if (!slots.length) {
      setSelectedSlots([]); setDate(null); setStartTime(undefined); setEndTime(undefined);
      setFieldPrice(0); setIsDepositPaid(false);
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
      setSelectedSlots([]); setFieldPrice(0); setDate(null);
      setStartTime(undefined); setEndTime(undefined); setIsDepositPaid(false);
    }
  }, [selectedCourt]);

  const handleCreateCustomer = async () => {
    try {
      const values = await createCustomerForm.validateFields();
      const token = localStorage.getItem("token");
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const res = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ name: values.name, phone: values.phone, email: values.email || "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status !== 200 && res.status !== 201) return toast.error(data.message || "Không thể thêm khách hàng");
      setSelectedCustomer(data.user || data.data || data);
      toast.success("Thêm khách hàng thành công!");
      setCustomerCreateModalOpen(false);
      createCustomerForm.resetFields();
    } catch { toast.error("Có lỗi xảy ra khi tạo khách hàng"); }
  };

  const handleSubmitBooking = async () => {
    if (!selectedCourt) return toast.error("Vui lòng chọn sân");
    if (!date || !startTime || !endTime) return toast.error("Vui lòng chọn ngày giờ");
    if (!selectedCustomer) return toast.error("Vui lòng chọn hoặc thêm khách hàng");
    if (!selectedSlots.length) return toast.error("Vui lòng chọn ít nhất một ca giờ");

    const dateStr = date.format("YYYY-MM-DD");
    const now = dayjs();
    const bookingDay = date.startOf("day");
    const bookingStart = dayjs(`${dateStr} ${startTime}`);
    const isFutureMatch = bookingDay.isAfter(now, "day") || (bookingDay.isSame(now, "day") && bookingStart.isAfter(now));



    setSubmitting(true);
    try {
      const bookingCode = generateBookingCode(dateStr);
      const slotsPayload = selectedSlots.map((s) => ({ startTime: s.startTime, endTime: s.endTime }));
      const res = await api.post("/bookings", {
        courtId: selectedCourt._id, customerId: selectedCustomer._id, date: dateStr,
        startTime, endTime, slots: slotsPayload, totalFieldAmount: fieldPrice, note: "",
        isOffline: true, paymentMethod: PAYMENT_METHOD?.CASH || "cash",
        paidAtCreation: isDepositPaid, isDepositPaid, depositAmount,
        customerInfo: { name: selectedCustomer.name, phone: selectedCustomer.phone, email: selectedCustomer.email || "" },
        bookingCode,
      });
      const bookingData = res.data?.data || res.data;
      const displayCode = Array.isArray(bookingData) ? bookingData[0]?.code : bookingData?.code;
      toast.success(`Đặt sân thành công — Mã: ${displayCode || bookingCode}`);
      navigate("/admin/bookings");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Tạo đơn thất bại");
    } finally { setSubmitting(false); }
  };

  const SummaryRow = ({ label, value, icon, accent }: { label: string; value: React.ReactNode; icon?: React.ReactNode; accent?: boolean }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-white/5 last:border-0">
      <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">{icon}{label}</span>
      <span className={`text-sm font-bold ${accent ? 'text-emerald-500' : 'text-slate-700 dark:text-white'}`}>{value || <span className="text-slate-300 dark:text-slate-600 font-semibold normal-case text-xs">Chưa chọn</span>}</span>
    </div>
  );

  return (
    <div className="px-4 pb-16 pt-6 space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute -left-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl" />
        <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-4 italic">
          <div className="p-3.5 bg-linear-to-br from-blue-600 to-indigo-700 rounded-[20px] shadow-2xl shadow-blue-500/40 -rotate-3 flex items-center justify-center border border-white/20">
            <CalendarPlus size={28} className="text-white" />
          </div>
          <span className="relative">
            ĐẶT SÂN NHANH
            <div className="absolute -bottom-2 left-0 w-1/2 h-1.5 bg-blue-500/30 rounded-full" />
          </span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-6 font-semibold text-sm">
          Tạo đơn đặt sân tại quầy cho khách • Nhanh gọn, chính xác
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Step 1: Customer */}
          <div className="bg-white dark:bg-slate-900 rounded-4xl border border-slate-100 dark:border-white/5 p-7 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-lg shadow-blue-500/30">1</div>
              Chọn khách hàng
            </h3>

            {selectedCustomer ? (
              <div className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/20 rounded-2xl">
                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                  <User size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-black text-slate-800 dark:text-white">{selectedCustomer.name}</div>
                  <div className="text-xs text-slate-400 font-medium">{selectedCustomer.phone} {selectedCustomer.email && `• ${selectedCustomer.email}`}</div>
                </div>
                <span className="px-3 py-1 bg-emerald-500 text-white text-[9px] font-black rounded-xl uppercase shadow">Đã chọn</span>
                <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all text-slate-400 hover:text-red-500">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  <input
                    type="text" placeholder="Nhập SĐT hoặc tên khách hàng..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchCustomer()}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-white/5 border-2 border-slate-100 dark:border-white/10 rounded-2xl font-semibold text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  />
                </div>
                <button onClick={handleSearchCustomer} className="px-5 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/10">
                  {customerLoading ? <Spin size="small" /> : <><Users size={16} className="inline mr-1.5" />Tìm</>}
                </button>
                <button onClick={() => setCustomerCreateModalOpen(true)} className="px-5 py-3 bg-blue-500 text-white rounded-2xl font-bold text-sm hover:bg-blue-600 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-1.5">
                  <UserPlus size={16} /> Thêm
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Court */}
          <div className="bg-white dark:bg-slate-900 rounded-4xl border border-slate-100 dark:border-white/5 p-7 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-lg shadow-emerald-500/30">2</div>
              Chọn sân
            </h3>

            {courtLoading ? (
              <div className="flex items-center justify-center py-12"><Spin size="large" /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courts.map((court) => {
                  const isActive = selectedCourt?._id === court._id;
                  const imageUrl = court.images?.[0] || "";
                  const cfg = COURT_TYPE_CONFIG[court.type] || COURT_TYPE_CONFIG.indoor;
                  return (
                    <button key={court._id} onClick={() => setSelectedCourt(court)}
                      className={`group text-left rounded-3xl border-2 overflow-hidden transition-all duration-300 ${
                        isActive
                          ? 'border-blue-500 shadow-xl shadow-blue-500/10 dark:shadow-blue-500/5 ring-4 ring-blue-500/10'
                          : 'border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 hover:shadow-lg'
                      }`}
                    >
                      <div className="flex gap-0">
                        {imageUrl && (
                          <div className="w-28 h-28 shrink-0 overflow-hidden">
                            <img src={imageUrl} alt={court.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          </div>
                        )}
                        <div className="flex-1 p-4 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-black text-sm text-slate-800 dark:text-white">{court.name}</span>
                              {isActive && <CheckCircle2 size={14} className="text-blue-500" />}
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 bg-linear-to-r ${cfg.gradient} text-white text-[9px] font-black rounded-lg uppercase`}>
                              <Shield size={9} /> {COURT_TYPE_LABELS[court.type] || court.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 font-bold">
                            <span className="flex items-center gap-1"><DollarSign size={10} className="text-emerald-400" />{court.basePrice.toLocaleString("vi-VN")}đ</span>
                            <span className="flex items-center gap-1"><Zap size={10} className="text-amber-400" />{court.peakPrice.toLocaleString("vi-VN")}đ</span>
                          </div>
                        </div>
                      </div>
                      {court.isBooked && (
                        <div className="px-4 py-1.5 bg-rose-500/10 text-rose-500 text-[10px] font-black text-center uppercase">Đã đặt</div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 3: Time */}
          <div className="bg-white dark:bg-slate-900 rounded-4xl border border-slate-100 dark:border-white/5 p-7 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-violet-500 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-lg shadow-violet-500/30">3</div>
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
              <div className="flex flex-col items-center justify-center py-12 text-slate-300 dark:text-slate-600">
                <Clock size={40} className="mb-3 opacity-40" />
                <p className="font-bold text-sm">Vui lòng chọn sân trước</p>
              </div>
            )}
          </div>


        </div>

        {/* Right Column: Summary */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-4xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden sticky top-6">
            <div className="p-6 bg-linear-to-br from-blue-600 to-indigo-700 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><CreditCard size={80} /></div>
              <div className="relative z-10">
                <div className="text-[10px] font-black uppercase opacity-60 mb-1">Tóm tắt đơn</div>
                <div className="text-xl font-black">Đặt sân</div>
              </div>
            </div>

            <div className="p-6 space-y-0">
              <SummaryRow label="Khách hàng" value={selectedCustomer?.name} icon={<User size={12} />} />
              <SummaryRow label="Sân" value={selectedCourt?.name} icon={<Shield size={12} />} />
              <SummaryRow label="Ngày đặt" value={date?.format("DD/MM/YYYY")} icon={<CalendarPlus size={12} />} />
              <SummaryRow label="Khung giờ" value={selectedSlots.length ? selectedSlots.map((s) => `${s.startTime}–${s.endTime}`).join(", ") : undefined} icon={<Clock size={12} />} />
            </div>

            <div className="px-6 pb-4">
              <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400">Tiền sân</span>
                  <span className="text-lg font-black text-slate-800 dark:text-white">{fieldPrice.toLocaleString("vi-VN")} đ</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Cọc 50%</span>
                  <span className="text-sm font-black text-amber-500">{depositAmount.toLocaleString("vi-VN")} đ</span>
                </div>
              </div>
            </div>

            <div className="px-6 pb-4">
              <button
                onClick={() => setIsDepositPaid((v) => !v)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition-all border-2 ${
                  isDepositPaid
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30'
                    : 'bg-transparent text-slate-400 border-slate-200 dark:border-white/10 hover:border-emerald-400 hover:text-emerald-500'
                }`}
              >
                <Wallet size={16} />
                {isDepositPaid ? "Đã cọc" : "Chưa cọc (ấn để xác nhận)"}
              </button>
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={handleSubmitBooking}
                disabled={!selectedCustomer || !selectedCourt || submitting}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-linear-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-black text-sm hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-40 border border-white/20"
              >
                {submitting ? <Spin size="small" /> : <><CheckCircle2 size={20} /> XÁC NHẬN ĐẶT SÂN</>}
              </button>
            </div>

            <div className="px-6 pb-6 text-[11px] font-medium text-slate-400 space-y-1">
              <p>* Đơn đặt sẽ được tự động xác nhận.</p>
              <p>* Khách thanh toán tại quầy / cọc theo chính sách.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Danh sách khách hàng */}
      <Modal title="Danh sách khách hàng" open={isCustomerListModalOpen} onCancel={() => setCustomerListModalOpen(false)} footer={null} width={700}>
        <List
          dataSource={customerList}
          renderItem={(item) => (
            <List.Item style={{ cursor: "pointer" }} onClick={() => { setSelectedCustomer(item); setCustomerListModalOpen(false); }}>
              <List.Item.Meta avatar={<Avatar icon={<UserOutlined />} />} title={item.name} description={<>{item.phone}{item.email && ` · ${item.email}`}</>} />
            </List.Item>
          )}
        />
      </Modal>

      {/* Modal Thêm khách hàng */}
      <Modal title="Thêm khách hàng mới" open={isCustomerCreateModalOpen} onCancel={() => { setCustomerCreateModalOpen(false); createCustomerForm.resetFields(); }} onOk={handleCreateCustomer} okText="Lưu" cancelText="Hủy" destroyOnHidden>
        <Form form={createCustomerForm} layout="vertical">
          <Form.Item label="Họ tên" name="name" rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}>
            <Input placeholder="Nhập họ tên khách hàng" />
          </Form.Item>
          <Form.Item label="Số điện thoại" name="phone" rules={[{ required: true, message: "Vui lòng nhập số điện thoại" }, { pattern: /^[0-9]{8,15}$/, message: "Số điện thoại không hợp lệ" }]}>
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ type: "email", message: "Email không hợp lệ" }]}>
            <Input placeholder="Nhập email (tùy chọn)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BookingCreate;
