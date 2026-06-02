import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Card,
  Col,
  Empty,
  Input,
  Popconfirm,
  Row,
  Select,
  Spin,
  Statistic,
  Table,
  Tabs,
  message,
} from "antd";
import {
  BarChartOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import {
  Plus,
  Edit3,
  Trash2,
  Ticket,
  Search,
  Tag,
  Percent,
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Gift,
  Clock,
  CheckCircle2,
  PauseCircle,
  BarChart3,
} from "lucide-react";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import api from "@/common/utils/api";
import { DISCOUNT_TYPES, VOUCHER_STATUS } from "@/common/constants/enums";
import type {
  VoucherStatsBooking,
  VoucherStatsPayload,
  VoucherStatsUser,
  VoucherSummary,
} from "@/types/voucher";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

const { Option } = Select;

interface Voucher {
  _id: string;
  code: string;
  description?: string;
  discountType: string;
  discountValue: number;
  maxDiscountValue?: number;
  minOrderValue?: number;
  totalIssued: number;
  remainingQuantity: number;
  perUserLimit: number;
  startDate: string;
  endDate: string;
  status: string;
  usageCount: number;
  createdAt: string;
}

const formatCurrency = (value?: number) =>
  typeof value === "number" ? `${value.toLocaleString("vi-VN")} đ` : "0 đ";

const VoucherManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("list");

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");

  const [voucherList, setVoucherList] = useState<VoucherSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>();
  const [stats, setStats] = useState<VoucherStatsPayload | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchVouchers = useCallback(async (keyword?: string) => {
    try {
      setLoading(true);
      const res = await api.get("/vouchers", {
        params: keyword ? { q: keyword } : undefined,
      });
      const data = res.data?.data || res.data || [];
      setVouchers(data);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể tải danh sách voucher";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    fetchVouchers(value);
  };

  const handleDelete = async (voucherId: string, code: string) => {
    try {
      await api.delete(`/vouchers/${voucherId}`);
      toast.success(`Đã xóa voucher "${code}" thành công!`);
      message.success("Xóa voucher thành công!");
      fetchVouchers(searchKeyword);
      fetchVouchersForStats();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể xóa voucher";
      toast.error(errorMessage);
      message.error(errorMessage);
    }
  };

  const fetchVouchersForStats = useCallback(
    async (keyword?: string) => {
      try {
        setListLoading(true);
        const res = await api.get("/vouchers", {
          params: keyword ? { q: keyword } : undefined,
        });
        const data = res.data?.data || res.data || [];
        setVoucherList(data);
        if (!selectedVoucherId && data.length) {
          setSelectedVoucherId(data[0]._id);
        }
      } catch (error: any) {
        toast.error(error?.message || "Không tải được danh sách voucher");
      } finally {
        setListLoading(false);
      }
    },
    [selectedVoucherId]
  );

  const fetchStats = useCallback(async (voucherId: string) => {
    if (!voucherId) return;
    try {
      setStatsLoading(true);
      const res = await api.get(`/vouchers/${voucherId}/stats`);
      const data = res.data?.data || res.data;
      setStats(data);
    } catch (error: any) {
      toast.error(error?.message || "Không tải được thống kê voucher");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const handleStatsSearch = (value: string) => {
    fetchVouchersForStats(value);
  };

  useEffect(() => {
    if (activeTab === "list") {
      fetchVouchers();
    } else if (activeTab === "stats") {
      fetchVouchersForStats();
    }
  }, [activeTab, fetchVouchers, fetchVouchersForStats]);

  useEffect(() => {
    if (activeTab === "stats" && selectedVoucherId) {
      fetchStats(selectedVoucherId);
    }
  }, [selectedVoucherId, activeTab, fetchStats]);

  // Socket: tự động refresh khi có booking mới (voucher có thể đã được dùng)
  const socketRef = useRef<Socket | null>(null);
  const lastSocketUpdateRef = useRef<number>(0);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    const handleBookingUpdated = () => {
      const now = Date.now();
      if (now - lastSocketUpdateRef.current < 1000) return; // debounce 1s
      lastSocketUpdateRef.current = now;

      // Refresh voucher data
      if (activeTab === "list") {
        fetchVouchers(searchKeyword || undefined);
      } else if (activeTab === "stats") {
        fetchVouchersForStats();
        if (selectedVoucherId) fetchStats(selectedVoucherId);
      }
    };

    socket.on("booking_updated", handleBookingUpdated);
    socket.on("booking_global_updated", handleBookingUpdated);

    return () => {
      socket.off("booking_updated", handleBookingUpdated);
      socket.off("booking_global_updated", handleBookingUpdated);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeTab, searchKeyword, selectedVoucherId]);

  // ==================== CỘT DANH SÁCH ====================
  const listColumns = [
    {
      title: "Voucher",
      key: "voucher_info",
      render: (_: any, record: Voucher) => {
        const isPercent = record.discountType === DISCOUNT_TYPES.PERCENT;
        return (
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${isPercent ? 'bg-linear-to-br from-violet-500 to-purple-600 shadow-violet-500/20' : 'bg-linear-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20'}`}>
              {isPercent ? <Percent size={22} className="text-white" /> : <DollarSign size={22} className="text-white" />}
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-black text-[15px] text-slate-800 dark:text-white leading-none tracking-tight">{record.code}</span>
              <span className="text-xs font-bold text-slate-400">
                {isPercent ?
                  `Giảm ${record.discountValue}%${record.maxDiscountValue ? ` (tối đa ${formatCurrency(record.maxDiscountValue)})` : ''}` :
                  `Giảm ${formatCurrency(record.discountValue)}`
                }
              </span>
            </div>
          </div>
        );
      },
    },
    {
      title: "Số lượng",
      key: "quantity",
      width: 180,
      render: (_: any, record: Voucher) => {
        const used = record.totalIssued - record.remainingQuantity;
        const pct = record.totalIssued > 0 ? Math.round((used / record.totalIssued) * 100) : 0;
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400">Đã dùng <span className="text-slate-700 dark:text-white">{used}</span> / {record.totalIssued}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-linear-to-r from-emerald-400 to-emerald-600 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
            </div>
            <span className="text-[10px] font-bold text-emerald-500">Còn {record.remainingQuantity} lượt</span>
          </div>
        );
      },
    },
    {
      title: "Thời hạn",
      key: "timeRange",
      width: 220,
      render: (_: any, record: Voucher) => {
        const start = record.startDate ? dayjs(record.startDate) : null;
        const end = record.endDate ? dayjs(record.endDate) : null;
        const isExpired = end && end.isBefore(dayjs());
        return (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Calendar size={12} className="text-blue-400 shrink-0" />
              <span className="font-semibold">{start ? start.format("DD/MM/YYYY HH:mm") : "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Clock size={12} className={`shrink-0 ${isExpired ? 'text-rose-400' : 'text-amber-400'}`} />
              <span className={`font-semibold ${isExpired ? 'text-rose-400' : ''}`}>{end ? end.format("DD/MM/YYYY HH:mm") : "—"}</span>
            </div>
          </div>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: string) => (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase w-fit ${
          status === VOUCHER_STATUS.ACTIVE
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
        }`}>
          {status === VOUCHER_STATUS.ACTIVE ? <CheckCircle2 size={12} /> : <PauseCircle size={12} />}
          {status === VOUCHER_STATUS.ACTIVE ? "Hoạt động" : "Tạm dừng"}
        </div>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      align: 'right' as const,
      render: (_: any, record: Voucher) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => navigate(`/admin/vouchers/edit/${record._id}`)}
            className="p-2.5 bg-slate-50 dark:bg-white/5 text-slate-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/20 dark:text-slate-300 dark:hover:text-blue-400 rounded-xl transition-all active:scale-90 border border-transparent hover:border-blue-100 dark:border-white/5 dark:hover:border-blue-500/30 shadow-sm"
            title="Chỉnh sửa"
          >
            <Edit3 size={16} />
          </button>
          <Popconfirm
            title="Xóa voucher"
            description={`Bạn có chắc chắn muốn xóa voucher "${record.code}"?`}
            onConfirm={() => handleDelete(record._id, record.code)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <button
              className="p-2.5 bg-slate-50 dark:bg-white/5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/20 dark:text-slate-300 dark:hover:text-rose-400 rounded-xl transition-all active:scale-90 border border-transparent hover:border-rose-100 dark:border-white/5 dark:hover:border-rose-500/30 shadow-sm"
              title="Xóa"
            >
              <Trash2 size={16} />
            </button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  // ==================== THỐNG KÊ (MEMO) ====================
  const selectedVoucher = useMemo(
    () => voucherList.find((v) => v._id === selectedVoucherId),
    [voucherList, selectedVoucherId]
  );

  const statsCards = useMemo(() => {
    if (!stats) return null;
    const items = [
      { title: "Tổng phát hành", value: stats.totals.issued, icon: <Gift size={20} />, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
      { title: "Đã sử dụng", value: stats.totals.used, icon: <CheckCircle2 size={20} />, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
      { title: "Đã hoàn lượt", value: stats.totals.restored, icon: <TrendingUp size={20} />, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
      { title: "Còn lại", value: stats.totals.remaining, icon: <Ticket size={20} />, gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20' },
    ];

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item.title} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 bg-linear-to-br ${item.gradient} rounded-xl text-white shadow-lg ${item.shadow}`}>
                {item.icon}
              </div>
            </div>
            <div className="text-3xl font-black text-slate-800 dark:text-white">{item.value}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase mt-1">{item.title}</div>
          </div>
        ))}
        <div className="col-span-2 lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 p-6 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase mb-1">Tổng giảm giá bởi voucher</div>
          <div className="text-2xl font-black text-rose-500">{formatCurrency(stats.totals.discountGiven)}</div>
        </div>
      </div>
    );
  }, [stats]);

  const userColumns = [
    {
      title: "Khách hàng",
      dataIndex: "user",
      key: "user",
      render: (user: VoucherStatsUser["user"]) =>
        user ? (
          <div className="flex flex-col">
            <span className="font-bold text-sm text-slate-800 dark:text-white">{user.name || "—"}</span>
            <span className="text-xs text-slate-400">{user.email || "—"}</span>
          </div>
        ) : "—",
    },
    { title: "Số lượt dùng", dataIndex: "count", key: "count", width: 140 },
    { title: "Tổng tiền giảm", dataIndex: "totalDiscount", key: "totalDiscount", width: 180, render: (value: number) => <span className="font-bold text-emerald-500">{formatCurrency(value)}</span> },
  ];

  const bookingColumns = [
    { title: "Mã đơn", dataIndex: ["bookingId", "code"], key: "bookingCode", render: (_: string, record: VoucherStatsBooking) => <span className="font-bold">{record.bookingId?.code || "—"}</span>, width: 140 },
    {
      title: "Khách hàng", dataIndex: ["userId", "name"], key: "user",
      render: (_: string, record: VoucherStatsBooking) => (
        <div className="flex flex-col">
          <span className="font-bold text-sm text-slate-800 dark:text-white">{record.userId?.name || "—"}</span>
          <span className="text-xs text-slate-400">{record.userId?.phone || "—"}</span>
        </div>
      ),
    },
    { title: "Tổng đơn", dataIndex: "orderTotal", key: "orderTotal", width: 160, render: (value: number) => formatCurrency(value) },
    { title: "Voucher giảm", dataIndex: "discountAmount", key: "discountAmount", width: 160, render: (value: number) => <span className="font-bold text-emerald-500">{formatCurrency(value)}</span> },
    {
      title: "Trạng thái", dataIndex: "status", key: "voucherStatus", width: 180,
      render: (value: "applied" | "restored", record: VoucherStatsBooking) =>
        value === "restored" ? (
          <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-lg uppercase">Hoàn lượt • {record.restoredAt ? dayjs(record.restoredAt).format("DD/MM HH:mm") : ""}</span>
        ) : (
          <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-lg uppercase">Đã sử dụng</span>
        ),
    },
  ];

  return (
    <div className="px-4 pb-12 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-6">
        <div className="relative">
          <div className="absolute -left-4 -top-4 w-24 h-24 bg-violet-500/10 rounded-full blur-3xl" />
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-4 italic">
            <div className="p-3.5 bg-linear-to-br from-violet-600 to-purple-700 rounded-[20px] shadow-2xl shadow-violet-500/40 rotate-6 flex items-center justify-center border border-white/20">
              <Ticket size={28} className="text-white" />
            </div>
            <span className="relative">
              QUẢN LÝ VOUCHER
              <div className="absolute -bottom-2 left-0 w-1/2 h-1.5 bg-violet-500/30 rounded-full" />
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-6 font-semibold flex items-center gap-2 text-sm">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500"></span>
            </span>
            Quản lý mã khuyến mãi và theo dõi hiệu suất sử dụng
          </p>
        </div>

        <button
          onClick={() => navigate("/admin/vouchers/create")}
          className="flex items-center gap-2 px-6 py-3.5 bg-linear-to-r from-violet-600 to-purple-700 text-white rounded-[18px] font-bold text-sm shadow-xl shadow-violet-500/30 dark:shadow-violet-500/20 border border-white/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Plus size={20} /> TẠO VOUCHER MỚI
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/50 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-100 dark:border-white/10 w-fit backdrop-blur-sm">
        <button
          onClick={() => setActiveTab("list")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "list" ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"}`}
        >
          <Tag size={16} /> Danh sách
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "stats" ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"}`}
        >
          <BarChart3 size={16} /> Thống kê
        </button>
      </div>

      {activeTab === "list" && (
        <div className="space-y-6">
          {/* Search */}
          <div className="flex items-center gap-3 max-w-md">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Tìm kiếm mã voucher..."
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  if (!e.target.value) fetchVouchers();
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchKeyword)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-white/10 rounded-2xl font-semibold text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:border-violet-400 dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all"
              />
            </div>
            <button
              onClick={() => handleSearch(searchKeyword)}
              className="p-3 bg-violet-500 text-white rounded-2xl hover:bg-violet-600 transition-all active:scale-95 shadow-lg shadow-violet-500/30"
            >
              <Search size={20} />
            </button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-card rounded-4xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden p-6 transition-colors">
            <Table
              rowKey="_id"
              columns={listColumns as any}
              dataSource={vouchers}
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                showTotal: undefined,
                itemRender: (_page, type, originalElement) => {
                  if (type === 'prev') return <button className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors text-slate-400"><ChevronLeft size={16} /></button>;
                  if (type === 'next') return <button className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors text-slate-400"><ChevronRight size={16} /></button>;
                  return originalElement;
                }
              }}
              className="voucher-table"
            />
          </div>
        </div>
      )}

      {activeTab === "stats" && (
        <div className="space-y-8">
          {/* Stats Search */}
          <div className="bg-white dark:bg-slate-900 rounded-4xl border border-slate-100 dark:border-white/5 p-6 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input.Search
                placeholder="Tìm mã voucher"
                allowClear
                onSearch={handleStatsSearch}
                loading={listLoading}
                className="voucher-search"
              />
            </div>
            <div className="flex-1">
              <Select
                showSearch
                style={{ width: "100%" }}
                placeholder="Chọn voucher để xem thống kê"
                loading={listLoading}
                value={selectedVoucherId}
                onChange={setSelectedVoucherId}
                filterOption={false}
                className="voucher-select"
                notFoundContent={listLoading ? <Spin size="small" /> : <Empty />}
              >
                {voucherList.map((voucher) => (
                  <Option key={voucher._id} value={voucher._id}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{voucher.code}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase ${voucher.status === VOUCHER_STATUS.ACTIVE ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
                        {voucher.status === VOUCHER_STATUS.ACTIVE ? "Active" : "Paused"}
                      </span>
                    </div>
                  </Option>
                ))}
              </Select>
            </div>
          </div>

          {statsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spin size="large" />
            </div>
          ) : !stats ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <BarChart3 size={48} className="mb-4 opacity-30" />
              <p className="font-bold">Chọn voucher để xem thống kê</p>
            </div>
          ) : (
            <div className="space-y-8">
              {selectedVoucher && (
                <div className="bg-linear-to-r from-violet-500 to-purple-600 rounded-4xl p-6 text-white relative overflow-hidden shadow-xl shadow-violet-500/20">
                  <div className="absolute top-0 right-0 p-6 opacity-10"><Ticket size={120} /></div>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <div className="text-[10px] font-black uppercase opacity-60 mb-1">Voucher đang xem</div>
                      <div className="text-2xl font-black">{selectedVoucher.code}</div>
                      <div className="text-sm opacity-80 mt-1">
                        {selectedVoucher.discountType === DISCOUNT_TYPES.PERCENT ? `Giảm ${selectedVoucher.discountValue}%` : `Giảm ${formatCurrency(selectedVoucher.discountValue)}`}
                        {" • "}
                        {selectedVoucher.startDate ? dayjs(selectedVoucher.startDate).format("DD/MM/YYYY") : "—"} → {selectedVoucher.endDate ? dayjs(selectedVoucher.endDate).format("DD/MM/YYYY") : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {statsCards}

              <div className="bg-white dark:bg-card rounded-4xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden transition-colors">
                <div className="p-6 border-b border-slate-100 dark:border-white/5">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase flex items-center gap-3">
                    <div className="w-1.5 h-7 bg-blue-500 rounded-full"></div>
                    <Users size={16} /> Khách hàng sử dụng nhiều nhất
                  </h3>
                </div>
                <div className="p-6">
                  <Table
                    rowKey={(row: VoucherStatsUser) => row._id}
                    dataSource={stats.users}
                    columns={userColumns}
                    pagination={false}
                    locale={{ emptyText: "Chưa có lượt sử dụng" }}
                    className="voucher-table"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-card rounded-4xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden transition-colors">
                <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center gap-4">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase flex items-center gap-3">
                    <div className="w-1.5 h-7 bg-amber-500 rounded-full"></div>
                    Đơn hàng đã áp dụng
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400 bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-xl">
                    ℹ️ Đơn bị hủy trước khi sử dụng sẽ được hoàn lượt voucher
                  </p>
                </div>
                <div className="p-6">
                  <Table
                    rowKey={(row: VoucherStatsBooking) => row._id}
                    dataSource={stats.bookings}
                    columns={bookingColumns}
                    scroll={{ x: 900 }}
                    className="voucher-table"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .voucher-table .ant-table { background: transparent !important; }
        .voucher-table .ant-table-thead > tr > th {
          background: transparent !important; color: #64748b !important;
          font-size: 11px !important; font-weight: 800 !important;
          text-transform: uppercase !important; letter-spacing: 0.05em !important;
          border-bottom: 2px solid #f1f5f9 !important; padding: 12px 20px 16px !important;
        }
        .dark .voucher-table .ant-table-thead > tr > th {
          color: #64748b !important; border-bottom: 1px dashed rgba(255,255,255,0.1) !important;
        }
        .voucher-table .ant-table-tbody > tr > td {
          padding: 16px 20px !important; border-bottom: 1px dotted #e2e8f0 !important;
          transition: all 0.3s; color: inherit; background: transparent !important;
        }
        .dark .voucher-table .ant-table-tbody > tr > td { border-bottom: 1px dashed rgba(255,255,255,0.05) !important; }
        .voucher-table .ant-table-tbody > tr { transition: all 0.3s !important; }
        .voucher-table .ant-table-tbody > tr:hover > td { background: #faf5ff !important; }
        .dark .voucher-table .ant-table-tbody > tr:hover > td { background: rgba(139,92,246,0.03) !important; }
        .voucher-table .ant-table-tbody > tr:hover > td:first-child {
          border-top-left-radius: 16px !important; border-bottom-left-radius: 16px !important;
          box-shadow: inset 3px 0 0 0 #8b5cf6 !important;
        }
        .voucher-table .ant-table-tbody > tr:hover > td:last-child {
          border-top-right-radius: 16px !important; border-bottom-right-radius: 16px !important;
        }
        .ant-table-placeholder { background: transparent !important; }
        
        .voucher-search .ant-input-group-addon button,
        .voucher-search .ant-btn { border-radius: 12px !important; }
        .voucher-select .ant-select-selector { border-radius: 12px !important; height: 40px !important; align-items: center !important; }
      `}</style>
    </div>
  );
};

export default VoucherManagement;
