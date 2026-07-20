import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  Ticket,
  Search,
  Tag,
  Percent,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  Gift,
  Clock,
  CheckCircle2,
  PauseCircle,
  BarChart3,
  Loader2,
  TrendingUp,
  Inbox,
  X,
} from "lucide-react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import api from "@/common/utils/api";
import { DISCOUNT_TYPES, VOUCHER_STATUS } from "@/common/constants/enums";
import type {
  VoucherStatsPayload,
  VoucherSummary,
} from "@/types/voucher";
import { toast } from "sonner";

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

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
  typeof value === "number" ? `${value.toLocaleString("vi-VN")}đ` : "0đ";

const VoucherManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"list" | "stats">("list");

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");

  const [voucherList, setVoucherList] = useState<VoucherSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>("");
  const [stats, setStats] = useState<VoucherStatsPayload | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsSearch, setStatsSearch] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Voucher | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // ─── FETCH VOUCHERS ──────────────────────────────────────
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

  const handleSearch = () => {
    setCurrentPage(1);
    fetchVouchers(searchKeyword);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/vouchers/${deleteTarget._id}`);
      toast.success(`Đã xóa voucher "${deleteTarget.code}" thành công!`);
      setDeleteTarget(null);
      fetchVouchers(searchKeyword);
      fetchVouchersForStats();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể xóa voucher";
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
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
        if (data.length > 0 && !selectedVoucherId) {
          setSelectedVoucherId(data[0]._id);
        }
      } catch (error: any) {
        toast.error(error?.message || "Không tải được danh sách thống kê");
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

  // Socket setup
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
      if (now - lastSocketUpdateRef.current < 1000) return;
      lastSocketUpdateRef.current = now;

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
  }, [activeTab, searchKeyword, selectedVoucherId, fetchVouchers, fetchVouchersForStats, fetchStats]);

  // Stats computation
  const selectedVoucher = useMemo(
    () => voucherList.find((v) => v._id === selectedVoucherId),
    [voucherList, selectedVoucherId]
  );

  const filteredStatsVoucherList = useMemo(() => {
    return voucherList.filter(
      (v) => !statsSearch || v.code.toLowerCase().includes(statsSearch.toLowerCase())
    );
  }, [voucherList, statsSearch]);

  const totalItems = vouchers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedVouchers = vouchers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <TooltipProvider>
      <div className="relative min-h-screen px-4 pb-16 md:px-6 lg:px-8 max-w-7xl mx-auto text-left space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Quản lý voucher
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quản lý các mã khuyến mãi và theo dõi hiệu suất sử dụng của từng mã
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate("/admin/vouchers/create")}
              className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Tạo voucher mới
            </Button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex gap-1.5 bg-muted/50 p-1 rounded-xl w-fit border border-border/60">
          <button
            onClick={() => setActiveTab("list")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "list"
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            Danh sách voucher
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "stats"
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Thống kê hiệu suất
          </button>
        </div>

        {/* ─── TAB LIST ─── */}
        {activeTab === "list" && (
          <div className="space-y-4">
            {/* Search Box */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
              <Input
                placeholder="Tìm kiếm mã voucher..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9 h-10 w-full bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-indigo-400"
              />
              {searchKeyword && (
                <button
                  onClick={() => {
                    setSearchKeyword("");
                    fetchVouchers("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* List Content: Mobile Cards vs Desktop Table */}
            <Card className="border border-border/80 shadow-xs rounded-xl overflow-hidden p-0 bg-card">
              
              {/* 1. Mobile card view (<md) */}
              <div className="block md:hidden divide-y divide-border/60">
                {loading && vouchers.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground text-xs font-semibold flex flex-col items-center justify-center gap-2">
                    <Loader2 className="animate-spin text-indigo-500" size={24} />
                    <span>Đang tải dữ liệu voucher...</span>
                  </div>
                ) : paginatedVouchers.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <Inbox size={32} className="opacity-20" />
                    <p className="text-xs font-semibold">
                      {searchKeyword ? "Không tìm thấy voucher nào" : "Chưa có voucher khuyến mãi nào"}
                    </p>
                  </div>
                ) : (
                  paginatedVouchers.map((voucher) => {
                    const isPercent = voucher.discountType === DISCOUNT_TYPES.PERCENT;
                    const used = voucher.totalIssued - voucher.remainingQuantity;
                    const percent = voucher.totalIssued > 0 ? Math.round((used / voucher.totalIssued) * 100) : 0;
                    const start = voucher.startDate ? dayjs(voucher.startDate) : null;
                    const end = voucher.endDate ? dayjs(voucher.endDate) : null;
                    const isExpired = end && end.isBefore(dayjs());

                    return (
                      <div key={voucher._id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-xs ${
                                isPercent ? "bg-violet-600" : "bg-emerald-600"
                              }`}
                            >
                              {isPercent ? <Percent className="h-4 w-4" /> : <Ticket className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="font-mono font-bold text-foreground text-sm leading-tight">{voucher.code}</p>
                              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                {isPercent
                                  ? `Giảm ${voucher.discountValue}%${
                                      voucher.maxDiscountValue
                                        ? ` (tối đa ${formatCurrency(voucher.maxDiscountValue)})`
                                        : ""
                                    }`
                                  : `Giảm ${formatCurrency(voucher.discountValue)}`}
                              </p>
                            </div>
                          </div>

                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-bold gap-1 shrink-0 ${
                              voucher.status === VOUCHER_STATUS.ACTIVE
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                            }`}
                          >
                            {voucher.status === VOUCHER_STATUS.ACTIVE ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <PauseCircle className="h-3 w-3" />
                            )}
                            {voucher.status === VOUCHER_STATUS.ACTIVE ? "Hoạt động" : "Tạm dừng"}
                          </Badge>
                        </div>

                        {/* Progress */}
                        <div className="bg-muted/20 p-2.5 rounded-lg border border-border/40 space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Lượt sử dụng</span>
                            <span className="font-mono text-xs">
                              <strong className="text-foreground font-bold">{used}</strong>/{voucher.totalIssued} ({percent}%)
                            </span>
                          </div>
                          <Progress value={percent} className="h-1.5 w-full [&>[data-slot=progress-indicator]]:bg-emerald-500" />
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold text-right">
                            Còn {voucher.remainingQuantity} lượt khả dụng
                          </div>
                        </div>

                        {/* Validity Dates */}
                        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground pt-1 border-t border-border/40">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            {start ? start.format("DD/MM/YYYY") : "—"}
                          </span>
                          <span className={`flex items-center gap-1 text-[11px] ${isExpired ? "text-rose-500 font-bold" : ""}`}>
                            <Clock className={`h-3.5 w-3.5 shrink-0 ${isExpired ? "text-rose-500" : "text-amber-500"}`} />
                            {end ? end.format("DD/MM/YYYY") : "—"}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/admin/vouchers/edit/${voucher._id}`)}
                            className="h-8 px-3 text-xs font-semibold gap-1 rounded-lg"
                          >
                            <Edit3 size={13} /> Chỉnh sửa
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(voucher)}
                            className="h-8 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 hover:text-rose-600 gap-1 rounded-lg"
                          >
                            <Trash2 size={13} /> Xóa
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* 2. Desktop table view (>=md) */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30 border-b border-border/60">
                    <TableRow>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Voucher</TableHead>
                      <TableHead className="w-[200px] text-[10px] font-bold uppercase tracking-wider">Số lượng</TableHead>
                      <TableHead className="w-[220px] text-[10px] font-bold uppercase tracking-wider">Thời hạn</TableHead>
                      <TableHead className="text-center w-[130px] text-[10px] font-bold uppercase tracking-wider">Trạng thái</TableHead>
                      <TableHead className="text-center w-[100px] text-[10px] font-bold uppercase tracking-wider pr-6">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && vouchers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                            <span className="text-xs text-muted-foreground font-semibold">Đang tải dữ liệu voucher...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : vouchers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Inbox className="h-8 w-8 text-muted-foreground/30" />
                            <p className="text-xs font-semibold text-muted-foreground">
                              {searchKeyword ? "Không tìm thấy voucher nào" : "Chưa có voucher khuyến mãi nào"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedVouchers.map((voucher) => {
                        const isPercent = voucher.discountType === DISCOUNT_TYPES.PERCENT;
                        const used = voucher.totalIssued - voucher.remainingQuantity;
                        const percent = voucher.totalIssued > 0 ? Math.round((used / voucher.totalIssued) * 100) : 0;
                        const start = voucher.startDate ? dayjs(voucher.startDate) : null;
                        const end = voucher.endDate ? dayjs(voucher.endDate) : null;
                        const isExpired = end && end.isBefore(dayjs());

                        return (
                          <TableRow key={voucher._id} className="hover:bg-muted/10">
                            {/* Icon & Code Info */}
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-xs ${
                                    isPercent ? "bg-violet-600" : "bg-emerald-600"
                                  }`}
                                >
                                  {isPercent ? <Percent className="h-4 w-4" /> : <Ticket className="h-4 w-4" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-mono font-bold text-xs text-foreground tracking-tight">{voucher.code}</p>
                                  <p className="text-[11px] text-muted-foreground font-medium">
                                    {isPercent
                                      ? `Giảm ${voucher.discountValue}%${
                                          voucher.maxDiscountValue
                                            ? ` (tối đa ${formatCurrency(voucher.maxDiscountValue)})`
                                            : ""
                                        }`
                                      : `Giảm ${formatCurrency(voucher.discountValue)}`}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            {/* Quantities & Progress */}
                            <TableCell>
                              <div className="flex flex-col gap-1 min-w-[150px]">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-muted-foreground text-[10px]">
                                    Đã dùng: <strong className="text-foreground">{used}</strong>/{voucher.totalIssued}
                                  </span>
                                  <span className="text-muted-foreground font-mono font-bold text-[10px]">{percent}%</span>
                                </div>
                                <Progress value={percent} className="h-1.5 w-full [&>[data-slot=progress-indicator]]:bg-emerald-500" />
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                  Còn {voucher.remainingQuantity} lượt
                                </span>
                              </div>
                            </TableCell>

                            {/* Expire / Validity */}
                            <TableCell>
                              <div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                <span className="flex items-center gap-1.5 text-[11px]">
                                  <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                  {start ? start.format("DD/MM/YYYY HH:mm") : "—"}
                                </span>
                                <span className={`flex items-center gap-1.5 text-[11px] ${isExpired ? "text-rose-500 font-bold" : ""}`}>
                                  <Clock className={`h-3.5 w-3.5 shrink-0 ${isExpired ? "text-rose-500" : "text-amber-500"}`} />
                                  {end ? end.format("DD/MM/YYYY HH:mm") : "—"}
                                </span>
                              </div>
                            </TableCell>

                            {/* Status */}
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={`text-[10px] uppercase font-bold gap-1 ${
                                  voucher.status === VOUCHER_STATUS.ACTIVE
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                                }`}
                              >
                                {voucher.status === VOUCHER_STATUS.ACTIVE ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                  <PauseCircle className="h-3 w-3" />
                                )}
                                {voucher.status === VOUCHER_STATUS.ACTIVE ? "Hoạt động" : "Tạm dừng"}
                              </Badge>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-center pr-6">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => navigate(`/admin/vouchers/edit/${voucher._id}`)}
                                  className="h-8 w-8 text-muted-foreground hover:bg-muted"
                                  title="Chỉnh sửa"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteTarget(voucher)}
                                  className="h-8 w-8 text-rose-600 hover:bg-rose-500/5"
                                  title="Xóa"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10 text-[11px] font-semibold text-muted-foreground">
                <span>
                  Hiển thị {Math.min(totalItems, (currentPage - 1) * pageSize + 1)}-{Math.min(totalItems, currentPage * pageSize)} trong {totalItems} voucher
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0 rounded-lg border-border"
                  >
                    <ChevronLeft size={14} />
                  </Button>
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-8 w-8 p-0 rounded-lg text-[10px] font-bold ${
                          currentPage === pageNum
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-sm"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0 rounded-lg border-border"
                  >
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>

            </Card>
          </div>
        )}

        {/* ─── TAB STATS ─── */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            {/* Filter selectors */}
            <Card className="border border-border/80 shadow-xs rounded-xl p-4 bg-card">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
                  <Input
                    placeholder="Tìm mã voucher cần thống kê..."
                    value={statsSearch}
                    onChange={(e) => setStatsSearch(e.target.value)}
                    className="pl-9 h-10 w-full bg-card border border-border rounded-xl text-xs"
                  />
                  {statsSearch && (
                    <button
                      onClick={() => setStatsSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="w-full">
                  <Select value={selectedVoucherId} onValueChange={setSelectedVoucherId}>
                    <SelectTrigger className="h-10 w-full rounded-xl text-xs font-semibold">
                      <SelectValue placeholder="Chọn voucher xem chi tiết" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border bg-card">
                      {listLoading ? (
                        <div className="p-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang tải...
                        </div>
                      ) : filteredStatsVoucherList.length === 0 ? (
                        <div className="p-2 text-center text-xs text-muted-foreground">
                          Không tìm thấy mã nào
                        </div>
                      ) : (
                        filteredStatsVoucherList.map((item) => (
                          <SelectItem key={item._id} value={item._id} className="text-xs font-semibold">
                            <span className="font-mono font-bold">{item.code}</span>
                            <span
                              className={`text-[9px] uppercase font-bold px-1.5 py-0.2 ml-2 rounded-md ${
                                item.status === VOUCHER_STATUS.ACTIVE
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : "bg-slate-500/10 text-slate-500"
                              }`}
                            >
                              {item.status === VOUCHER_STATUS.ACTIVE ? "Hoạt động" : "Tạm dừng"}
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Performance Content */}
            {statsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2 border border-border/60 rounded-xl bg-card">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <span className="text-xs text-muted-foreground font-semibold">Đang phân tích dữ liệu hiệu suất...</span>
              </div>
            ) : !stats ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed rounded-xl bg-card">
                <BarChart3 className="h-10 w-10 opacity-20 mb-2" />
                <p className="font-semibold text-xs">Vui lòng chọn một voucher ở trên để hiển thị báo cáo chi tiết</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Active Voucher Summary Block */}
                {selectedVoucher && (
                  <Card className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 text-white relative overflow-hidden shadow-lg border-0 rounded-2xl">
                    <CardContent className="p-6 relative z-10 space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-indigo-200">Voucher đang được chọn</div>
                      <div className="text-3xl font-extrabold font-mono tracking-tight">{selectedVoucher.code}</div>
                      <div className="text-xs text-indigo-100 font-medium flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                        <span className="font-bold text-emerald-300">
                          {selectedVoucher.discountType === DISCOUNT_TYPES.PERCENT
                            ? `Giảm ${selectedVoucher.discountValue}%`
                            : `Giảm ${formatCurrency(selectedVoucher.discountValue)}`}
                        </span>
                        <span>•</span>
                        <span>
                          Thời hạn:{" "}
                          {selectedVoucher.startDate
                            ? dayjs(selectedVoucher.startDate).format("DD/MM/YYYY")
                            : "—"}{" "}
                          đến{" "}
                          {selectedVoucher.endDate
                            ? dayjs(selectedVoucher.endDate).format("DD/MM/YYYY")
                            : "—"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Stats Cards Section */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border border-border/80 shadow-xs rounded-xl">
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Phát hành</span>
                        <Gift className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <div className="text-2xl font-mono font-extrabold text-foreground">{stats.totals.issued}</div>
                        <span className="text-[10px] text-muted-foreground font-medium">Tổng số mã</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border border-border/80 shadow-xs rounded-xl">
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Đã dùng</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div>
                        <div className="text-2xl font-mono font-extrabold text-foreground">{stats.totals.used}</div>
                        <span className="text-[10px] text-muted-foreground font-medium">Thanh toán thành công</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border border-border/80 shadow-xs rounded-xl">
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Hoàn lượt</span>
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <div className="text-2xl font-mono font-extrabold text-foreground">{stats.totals.restored}</div>
                        <span className="text-[10px] text-muted-foreground font-medium">Khôi phục khi hủy</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border border-border/80 shadow-xs rounded-xl">
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Còn lại</span>
                        <Ticket className="h-4 w-4 text-violet-500" />
                      </div>
                      <div>
                        <div className="text-2xl font-mono font-extrabold text-foreground">{stats.totals.remaining}</div>
                        <span className="text-[10px] text-muted-foreground font-medium">Lượt khả dụng</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border border-rose-500/20 shadow-xs bg-rose-500/5 rounded-xl">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Tổng ngân sách đã chiết khấu</span>
                      <div className="text-2xl font-mono font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                        {formatCurrency(stats.totals.discountGiven)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Most Active Users Table */}
                <Card className="border border-border/80 shadow-xs rounded-xl overflow-hidden p-0 bg-card">
                  <div className="p-4 border-b border-border/60 bg-muted/20">
                    <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      Khách hàng sử dụng nhiều nhất
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/30 border-b border-border/60">
                        <TableRow>
                          <TableHead className="text-[10px] font-bold uppercase tracking-wider">Khách hàng</TableHead>
                          <TableHead className="w-[140px] text-center text-[10px] font-bold uppercase tracking-wider">Số lượt dùng</TableHead>
                          <TableHead className="w-[180px] text-right text-[10px] font-bold uppercase tracking-wider pr-6">Tổng tiền được giảm</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.users.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-6 text-xs text-muted-foreground font-semibold">
                              Chưa có khách hàng nào áp dụng mã này
                            </TableCell>
                          </TableRow>
                        ) : (
                          stats.users.map((row) => (
                            <TableRow key={row._id} className="hover:bg-muted/10">
                              <TableCell>
                                {row.user ? (
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-xs text-foreground">{row.user.name || "Khách hàng"}</span>
                                    <span className="text-[10px] text-muted-foreground">{row.user.email || "Chưa cập nhật email"}</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-xs text-amber-600 dark:text-amber-400">Tài khoản đã xóa / Không tồn tại</span>
                                    <span className="text-[10px] text-muted-foreground/70 italic">Dữ liệu người dùng không khả dụng</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-center font-mono font-bold text-xs">{row.count}</TableCell>
                              <TableCell className="text-right font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 pr-6">
                                {formatCurrency(row.totalDiscount)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>

                {/* Applied Bookings Table */}
                <Card className="border border-border/80 shadow-xs rounded-xl overflow-hidden p-0 bg-card">
                  <div className="p-4 border-b border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-4">
                    <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-emerald-500" />
                      Đơn hàng đã áp dụng
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 border-amber-500/20">
                      Lưu ý: Đơn bị huỷ sẽ được hoàn lại voucher
                    </Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/30 border-b border-border/60">
                        <TableRow>
                          <TableHead className="w-[140px] text-[10px] font-bold uppercase tracking-wider">Mã đơn</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-wider">Khách hàng</TableHead>
                          <TableHead className="text-right w-[160px] text-[10px] font-bold uppercase tracking-wider">Tổng tiền đơn</TableHead>
                          <TableHead className="text-right w-[160px] text-[10px] font-bold uppercase tracking-wider">Voucher giảm</TableHead>
                          <TableHead className="w-[180px] text-center text-[10px] font-bold uppercase tracking-wider pr-6">Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.bookings.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground font-semibold">
                              Chưa có đơn hàng nào ghi nhận
                            </TableCell>
                          </TableRow>
                        ) : (
                          stats.bookings.map((booking) => (
                            <TableRow key={booking._id} className="hover:bg-muted/10">
                              <TableCell className="font-mono font-bold text-xs">{booking.bookingId?.code || "Chưa xác định"}</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-xs text-foreground">
                                    {booking.userId?.name ||
                                      booking.bookingId?.customerInfo?.name ||
                                      booking.bookingId?.customerId?.name ||
                                      "Tài khoản đã xóa / Không tồn tại"}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {booking.userId?.phone ||
                                      booking.bookingId?.customerInfo?.phone ||
                                      booking.bookingId?.customerId?.phone ||
                                      "Chưa cập nhật SĐT"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono font-medium text-xs">{formatCurrency(booking.orderTotal)}</TableCell>
                              <TableCell className="text-right font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(booking.discountAmount)}
                              </TableCell>
                              <TableCell className="text-center pr-6">
                                {booking.status === "restored" ? (
                                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold uppercase gap-1">
                                    Hoàn lượt {booking.restoredAt ? `• ${dayjs(booking.restoredAt).format("DD/MM HH:mm")}` : ""}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold uppercase">
                                    Đã sử dụng
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
          <DialogContent className="sm:max-w-md p-0 border border-border/80 rounded-2xl shadow-xl bg-card">
            <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20 text-left">
              <DialogTitle className="flex items-center gap-2 text-rose-600 text-sm font-extrabold uppercase tracking-wider">
                <Trash2 className="h-4 w-4" />
                Xác nhận xóa voucher
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Bạn có chắc chắn muốn xóa voucher <strong className="text-foreground">"{deleteTarget?.code}"</strong>? Tất cả các thông tin thống kê liên quan sẽ không còn khả dụng.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleteLoading} className="text-xs font-semibold h-10 px-4 rounded-xl">
                Hủy bỏ
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading} className="text-xs font-bold h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700">
                {deleteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Xóa vĩnh viễn
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default VoucherManagement;
