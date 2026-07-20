import { useEffect, useState, useCallback } from "react";
import {
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  Search,
  Inbox,
  Loader2,
  Trash2,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Clock,
  User,
} from "lucide-react";
import dayjs from "dayjs";
import api from "@/common/utils/api";
import { toast } from "sonner";

// Shadcn UI Components
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Contact {
  _id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
}

const ContactsPage = () => {
  const [data, setData] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/contacts");
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list)) {
        setData(list);
      } else {
        setData([]);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Không thể tải danh sách liên hệ hỗ trợ!");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/contacts/${deleteTarget._id}`);
      toast.success(`Đã xóa liên hệ từ "${deleteTarget.name}" thành công!`);
      setDeleteTarget(null);
      if (selectedContact?._id === deleteTarget._id) {
        setSelectedContact(null);
      }
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Xóa liên hệ hỗ trợ thất bại!";
      toast.error(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const filtered = data.filter((c) =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Stats computation
  const stats = {
    total: data.length,
    recent: data.filter((c) => dayjs(c.createdAt).isAfter(dayjs().subtract(7, "day"))).length,
    today: data.filter((c) => dayjs(c.createdAt).isSame(dayjs(), "day")).length,
  };

  return (
    <TooltipProvider>
      <div className="relative min-h-screen px-4 pb-16 md:px-6 lg:px-8 max-w-7xl mx-auto text-left space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Hỗ trợ liên hệ
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Xem và quản lý các yêu cầu hỗ trợ gửi từ khách hàng
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchData}
                  disabled={loading}
                  className="h-10 w-10 rounded-xl"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Làm mới danh sách</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border border-border/80 rounded-xl shadow-xs overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Tổng liên hệ</span>
                <span className="text-2xl font-extrabold text-foreground font-mono">{stats.total}</span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <MessageSquare className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 rounded-xl shadow-xs overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Trong 7 ngày qua</span>
                <span className="text-2xl font-extrabold text-foreground font-mono">{stats.recent}</span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Calendar className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 rounded-xl shadow-xs overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Hôm nay</span>
                <span className="text-2xl font-extrabold text-foreground font-mono">{stats.today}</span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Mail className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
            <Input
              placeholder="Tìm theo tên, email hoặc số điện thoại..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 h-10 w-full bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-indigo-400"
            />
            {search && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* View Render: Mobile Cards vs Desktop Table */}
        <Card className="border border-border/80 shadow-xs rounded-xl overflow-hidden p-0 bg-card">
          
          {/* 1. Mobile Card view (<md) */}
          <div className="block md:hidden divide-y divide-border/60">
            {loading && data.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-xs font-semibold flex flex-col items-center justify-center gap-2">
                <Loader2 className="animate-spin text-indigo-500" size={24} />
                <span>Đang tải danh sách liên hệ...</span>
              </div>
            ) : paginatedData.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Inbox size={32} className="opacity-20" />
                <p className="text-xs font-semibold">
                  {search ? "Không tìm thấy liên hệ nào khớp với từ khóa" : "Chưa có liên hệ hỗ trợ nào"}
                </p>
              </div>
            ) : (
              paginatedData.map((item) => (
                <div key={item._id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 font-bold text-xs">
                        <User size={14} />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm">{item.name}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Clock size={12} className="text-amber-500 shrink-0" />
                          <span className="font-mono text-[10px]">{dayjs(item.createdAt).format("HH:mm:ss DD/MM/YYYY")}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Methods */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs bg-muted/20 p-2.5 rounded-lg border border-border/40">
                    <a
                      href={`mailto:${item.email}`}
                      className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-medium hover:underline truncate"
                    >
                      <Mail size={13} className="shrink-0" />
                      <span className="truncate">{item.email}</span>
                    </a>
                    <a
                      href={`tel:${item.phone}`}
                      className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono font-bold hover:underline"
                    >
                      <Phone size={13} className="shrink-0" />
                      <span>{item.phone}</span>
                    </a>
                  </div>

                  {/* Message content */}
                  <div className="text-xs text-foreground/80 font-medium line-clamp-3 bg-card p-2.5 rounded-lg border border-border/60 leading-relaxed italic">
                    "{item.message}"
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedContact(item)}
                      className="h-8 px-3 text-xs font-semibold gap-1 rounded-lg"
                    >
                      <Eye size={13} /> Xem chi tiết
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(item)}
                      className="h-8 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 hover:text-rose-600 gap-1 rounded-lg"
                    >
                      <Trash2 size={13} /> Xóa
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 2. Desktop Table view (>=md) */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30 border-b border-border/60">
                <TableRow>
                  <TableHead className="w-[240px] text-[10px] font-bold uppercase tracking-wider">Người gửi</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Nội dung liên hệ</TableHead>
                  <TableHead className="w-[180px] text-center text-[10px] font-bold uppercase tracking-wider">Thời gian</TableHead>
                  <TableHead className="w-[100px] text-center text-[10px] font-bold uppercase tracking-wider pr-6">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                        <span className="text-xs text-muted-foreground font-semibold">Đang tải dữ liệu liên hệ...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Inbox className="h-8 w-8 text-muted-foreground/30" />
                        <p className="text-xs font-semibold text-muted-foreground">
                          {search ? "Không tìm thấy liên hệ nào khớp với từ khóa" : "Chưa có liên hệ hỗ trợ nào"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item) => (
                    <TableRow key={item._id} className="hover:bg-muted/10">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-foreground">{item.name}</span>
                          <div className="flex flex-col gap-1 mt-1 text-[11px] text-muted-foreground">
                            <a
                              href={`mailto:${item.email}`}
                              className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline truncate"
                            >
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{item.email}</span>
                            </a>
                            <a
                              href={`tel:${item.phone}`}
                              className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono font-bold hover:underline"
                            >
                              <Phone className="h-3 w-3 shrink-0" />
                              <span>{item.phone}</span>
                            </a>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div
                          onClick={() => setSelectedContact(item)}
                          className="flex items-start gap-2 max-w-xl cursor-pointer group/msg p-1 rounded-lg transition-colors hover:bg-muted/30"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0 group-hover/msg:text-indigo-500" />
                          <span className="text-xs text-foreground/80 font-medium whitespace-pre-wrap leading-relaxed line-clamp-2">
                            {item.message}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-medium text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span>{dayjs(item.createdAt).format("HH:mm:ss DD/MM/YYYY")}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-center pr-6">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedContact(item)}
                            className="h-8 w-8 text-muted-foreground hover:bg-muted"
                            title="Xem chi tiết"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(item)}
                            className="h-8 w-8 text-rose-600 hover:bg-rose-500/5"
                            title="Xóa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10 text-[11px] font-semibold text-muted-foreground">
            <span>
              Hiển thị {Math.min(totalItems, (currentPage - 1) * pageSize + 1)}-{Math.min(totalItems, currentPage * pageSize)} trong {totalItems} liên hệ
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

        {/* Detail View Modal */}
        <Dialog open={!!selectedContact} onOpenChange={(v) => !v && setSelectedContact(null)}>
          <DialogContent className="sm:max-w-lg p-0 border border-border/80 rounded-2xl shadow-xl bg-card">
            <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20 text-left">
              <DialogTitle className="flex items-center gap-2 text-sm font-extrabold text-foreground uppercase tracking-wider">
                <MessageSquare className="h-4 w-4 text-indigo-500" />
                Chi tiết yêu cầu hỗ trợ
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Gửi từ <strong className="text-foreground">{selectedContact?.name}</strong> vào ngày{" "}
                {selectedContact ? dayjs(selectedContact.createdAt).format("HH:mm:ss DD/MM/YYYY") : ""}
              </DialogDescription>
            </DialogHeader>

            {selectedContact && (
              <div className="p-6 space-y-4 text-left">
                {/* Sender Info Block */}
                <div className="bg-muted/30 p-4 rounded-xl border border-border/60 space-y-2">
                  <div className="flex items-center gap-2">
                    <User size={15} className="text-indigo-500 shrink-0" />
                    <span className="font-bold text-sm text-foreground">{selectedContact.name}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-border/40">
                    <a
                      href={`mailto:${selectedContact.email}`}
                      className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-semibold hover:underline"
                    >
                      <Mail size={13} />
                      <span className="truncate">{selectedContact.email}</span>
                      <ExternalLink size={11} className="opacity-60" />
                    </a>
                    <a
                      href={`tel:${selectedContact.phone}`}
                      className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono font-bold hover:underline"
                    >
                      <Phone size={13} />
                      <span>{selectedContact.phone}</span>
                      <ExternalLink size={11} className="opacity-60" />
                    </a>
                  </div>
                </div>

                {/* Message Box */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Nội dung tin nhắn</span>
                  <div className="p-4 rounded-xl bg-card border border-border/80 text-xs text-foreground leading-relaxed whitespace-pre-wrap font-normal max-h-60 overflow-y-auto">
                    {selectedContact.message}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="px-6 py-4 border-t border-border/60 flex items-center justify-between">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setDeleteTarget(selectedContact);
                  setSelectedContact(null);
                }}
                className="text-xs font-bold h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700"
              >
                <Trash2 size={13} className="mr-1.5" /> Xóa liên hệ
              </Button>
              <Button
                variant="ghost"
                onClick={() => setSelectedContact(null)}
                className="text-xs font-semibold h-9 px-4 rounded-xl"
              >
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
          <DialogContent className="sm:max-w-md p-0 border border-border/80 rounded-2xl shadow-xl bg-card">
            <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20 text-left">
              <DialogTitle className="flex items-center gap-2 text-rose-600 text-sm font-extrabold uppercase tracking-wider">
                <Trash2 className="h-4 w-4" />
                Xác nhận xóa liên hệ
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Bạn có chắc muốn xóa yêu cầu hỗ trợ từ <strong className="text-foreground">"{deleteTarget?.name}"</strong>? Thao tác này không thể hoàn tác.
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

export default ContactsPage;
