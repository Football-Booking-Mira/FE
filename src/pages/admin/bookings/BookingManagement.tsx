import { useState } from "react";
import {
  Search,
  RotateCcw,
  Eye,
  Pencil,
  Trash2,
  FileText,
  Clock,
  CheckCircle,
  Play,
  Award,
  XCircle,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ── Interfaces ───────────────────────────────────────────────────────────────

interface Customer {
  name: string;
  email: string;
}

interface BookingItem {
  id: string;
  code: string;
  customer: Customer;
  court: string;
  date: string;
  time: string;
  total: number;
  status: "pending" | "confirmed" | "in_use" | "completed" | "cancelled";
}

// ── Status config (color ONLY here) ─────────────────────────────────────────

const STATUS_MAP: Record<
  BookingItem["status"],
  { label: string; className: string }
> = {
  pending: {
    label: "Chờ xác nhận",
    className: "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-50",
  },
  confirmed: {
    label: "Đã xác nhận",
    className: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50",
  },
  in_use: {
    label: "Đang sử dụng",
    className: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-50",
  },
  completed: {
    label: "Hoàn thành",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  },
  cancelled: {
    label: "Đã hủy",
    className: "border-zinc-200 bg-zinc-100 text-zinc-500 hover:bg-zinc-100",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatVND = (v: number) =>
  v.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

// ── Metrics ──────────────────────────────────────────────────────────────────

const METRICS: { label: string; value: number; icon: typeof FileText }[] = [
  { label: "Tổng đơn", value: 91, icon: FileText },
  { label: "Chờ xác nhận", value: 45, icon: Clock },
  { label: "Đã xác nhận", value: 1, icon: CheckCircle },
  { label: "Đang sử dụng", value: 3, icon: Play },
  { label: "Hoàn thành", value: 18, icon: Award },
  { label: "Đã hủy", value: 24, icon: XCircle },
];

// ── Mock data ────────────────────────────────────────────────────────────────

const BOOKINGS: BookingItem[] = [
  {
    id: "1",
    code: "BK-001",
    customer: { name: "Nguyễn Văn A", email: "nguyenvana@gmail.com" },
    court: "Sân 1 - Cỏ nhân tạo",
    date: "07/07/2026",
    time: "17:00 - 18:30",
    total: 350000,
    status: "pending",
  },
  {
    id: "2",
    code: "BK-002",
    customer: { name: "Trần Thị B", email: "tranthib@gmail.com" },
    court: "Sân 2 - Cỏ nhân tạo",
    date: "07/07/2026",
    time: "18:00 - 19:30",
    total: 450000,
    status: "confirmed",
  },
  {
    id: "3",
    code: "BK-003",
    customer: { name: "Lê Hoàng C", email: "lehoangc@gmail.com" },
    court: "Sân 3 - Mini",
    date: "06/07/2026",
    time: "19:00 - 20:30",
    total: 280000,
    status: "in_use",
  },
  {
    id: "4",
    code: "BK-004",
    customer: { name: "Phạm Đức D", email: "phamducd@gmail.com" },
    court: "Sân 1 - Cỏ nhân tạo",
    date: "05/07/2026",
    time: "07:00 - 08:30",
    total: 300000,
    status: "completed",
  },
  {
    id: "5",
    code: "BK-005",
    customer: { name: "Võ Minh E", email: "vominhe@gmail.com" },
    court: "Sân 4 - Futsal",
    date: "05/07/2026",
    time: "15:00 - 16:30",
    total: 500000,
    status: "cancelled",
  },
  {
    id: "6",
    code: "BK-006",
    customer: { name: "Đỗ Quốc F", email: "doquocf@gmail.com" },
    court: "Sân 2 - Cỏ nhân tạo",
    date: "07/07/2026",
    time: "20:00 - 21:30",
    total: 420000,
    status: "pending",
  },
  {
    id: "7",
    code: "BK-007",
    customer: { name: "Hồ Anh G", email: "hoanhg@gmail.com" },
    court: "Sân 1 - Cỏ nhân tạo",
    date: "04/07/2026",
    time: "08:00 - 09:30",
    total: 350000,
    status: "completed",
  },
  {
    id: "8",
    code: "BK-008",
    customer: { name: "Bùi Thị H", email: "buithih@gmail.com" },
    court: "Sân 3 - Mini",
    date: "07/07/2026",
    time: "16:00 - 17:30",
    total: 280000,
    status: "in_use",
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function BookingManagement() {
  const [search, setSearch] = useState("");

  const filtered = BOOKINGS.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.code.toLowerCase().includes(q) ||
      b.customer.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Quản lý đặt sân
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Trang quản lý đơn hàng chuyên nghiệp &amp; tối ưu cho hệ thống
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {METRICS.map((m) => {
          const Icon = m.icon;
          return (
            <Card
              key={m.label}
              className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {m.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
                  {m.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Data Section ── */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <Tabs defaultValue="bookings">
          {/* Tab triggers */}
          <div className="border-b border-zinc-200 px-4 pt-3 dark:border-zinc-800">
            <TabsList>
              <TabsTrigger value="bookings">Đặt sân</TabsTrigger>
              <TabsTrigger value="refunds">Hoàn tiền</TabsTrigger>
            </TabsList>
          </div>

          {/* Bookings tab */}
          <TabsContent value="bookings" className="p-0">
            {/* Toolbar */}
            <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  className="h-9 pl-9 text-sm"
                  placeholder="Tìm mã hoặc tên khách hàng..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearch("")}
              >
                <RotateCcw className="h-4 w-4" />
                Làm mới
              </Button>
            </div>

            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/30">
                  <TableHead className="w-24 text-xs font-medium text-zinc-500">
                    Mã đặt
                  </TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500">
                    Khách hàng
                  </TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500">
                    Sân
                  </TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500">
                    Thời gian
                  </TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500">
                    Tổng tiền
                  </TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500">
                    Trạng thái
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium text-zinc-500">
                    Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-sm text-zinc-400"
                    >
                      Không tìm thấy đơn đặt sân nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((b) => {
                    const s = STATUS_MAP[b.status];
                    return (
                      <TableRow
                        key={b.id}
                        className="border-zinc-200 dark:border-zinc-800"
                      >
                        <TableCell className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                          {b.code}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                            {b.customer.name}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {b.customer.email}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-zinc-700 dark:text-zinc-300">
                          {b.court}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-zinc-950 dark:text-zinc-50">
                            {b.date}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {b.time}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          {formatVND(b.total)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={s.className}
                          >
                            {s.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Xem"
                            >
                              <Eye className="h-4 w-4 text-zinc-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Sửa"
                            >
                              <Pencil className="h-4 w-4 text-zinc-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Xoá"
                            >
                              <Trash2 className="h-4 w-4 text-zinc-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Refunds tab */}
          <TabsContent value="refunds" className="p-4">
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
              <p className="text-sm text-zinc-400">
                Chưa có đơn hoàn tiền nào.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
