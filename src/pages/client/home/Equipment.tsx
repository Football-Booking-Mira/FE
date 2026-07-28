import React, { useEffect, useMemo, useState } from "react";
import { Search, RotateCw, Trophy, Shirt, Box, ChevronLeft, ChevronRight, Eye, ShieldCheck, CheckCircle2, Clock, Sparkles } from "lucide-react";
import api from "@/common/utils/api";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type EquipmentMode = "rent" | "sell" | "both";
type EquipmentStatus = "in_stock" | "out_of_stock" | "discontinued";

interface Equipment {
  _id: string;
  name: string;
  code: string;
  unit: string;
  mode: EquipmentMode;
  status: EquipmentStatus;
  totalQuantity: number;
  availableQuantity: number;
  rentPrice?: number;
  salePrice?: number;
  description?: string;
  image?: string;
}

// Nhãn hiển thị cho người dùng
const MODE_LABELS: Record<EquipmentMode, string> = {
  rent: "Đồ cho thuê",
  sell: "Thiết bị bán trực tiếp tại sân",
  both: "Cho thuê & bán", // chỉ dùng cho select
};

const UserEquipmentList: React.FC = () => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMode, setFilterMode] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("default");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const fetchEquipments = async () => {
    try {
      setLoading(true);
      const res = await api.get("/equipments/public");
      const list: Equipment[] = res.data?.data ?? res.data ?? [];
      setEquipments(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterMode, sortBy]);

  const filtered = useMemo(() => {
    let list = [...equipments];

    const keyword = search.trim().toLowerCase();
    if (keyword) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(keyword) ||
          e.code?.toLowerCase().includes(keyword)
      );
    }

    if (filterMode && filterMode !== "all") {
      if (filterMode === "both") {
        list = list.filter((e) => e.mode === "rent" || e.mode === "sell");
      } else {
        list = list.filter((e) => e.mode === filterMode);
      }
    }

    if (filterStatus && filterStatus !== "all") {
      list = list.filter((e) => {
        if (filterStatus === "in_stock") return e.availableQuantity > 0;
        if (filterStatus === "out_of_stock") return e.availableQuantity === 0;
        if (filterStatus === "discontinued") return e.status === "discontinued";
        return true;
      });
    }

    if (sortBy === "price_asc") {
      list.sort(
        (a, b) =>
          (a.salePrice || a.rentPrice || 0) - (b.salePrice || b.rentPrice || 0)
      );
    }

    if (sortBy === "price_desc") {
      list.sort(
        (a, b) =>
          (b.salePrice || b.rentPrice || 0) - (a.salePrice || a.rentPrice || 0)
      );
    }

    if (sortBy === "quantity") {
      list.sort((a, b) => b.availableQuantity - a.availableQuantity);
    }

    return list;
  }, [equipments, search, filterStatus, filterMode, sortBy]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedData = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="min-h-screen bg-background text-foreground py-8 md:py-12 px-4 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Danh sách thiết bị
          </h1>
          <p className="text-muted-foreground text-center max-w-2xl">
            Trang bị đầy đủ cho trận đấu của bạn với những trang thiết bị và dịch vụ chất lượng cao nhất tại sân.
          </p>
        </div>

        {/* Modern Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên hoặc mã thiết bị..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full"
            />
          </div>

          <div className="flex flex-wrap md:flex-nowrap gap-4">
            <Select value={filterMode} onValueChange={setFilterMode}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Loại thiết bị" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                <SelectItem value="rent">Đồ cho thuê</SelectItem>
                <SelectItem value="sell">Bán trực tiếp</SelectItem>
                <SelectItem value="both">Cho thuê & bán</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="in_stock">Còn hàng</SelectItem>
                <SelectItem value="out_of_stock">Hết hàng</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sắp xếp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Mặc định</SelectItem>
                <SelectItem value="price_asc">Giá tăng dần</SelectItem>
                <SelectItem value="price_desc">Giá giảm dần</SelectItem>
                <SelectItem value="quantity">Số lượng còn lại</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={fetchEquipments} disabled={loading}>
              <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Loading / Empty State */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="h-80 bg-muted/40 animate-pulse rounded-xl border border-border"></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-xl border border-border/50 shadow-sm py-20 flex flex-col items-center justify-center text-center">
            <Box className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Không tìm thấy thiết bị nào</h3>
            <p className="text-muted-foreground mt-2">Vui lòng thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
          </div>
        ) : (
          <>
            {/* Grid Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
              {paginatedData.map((e) => {
                const isOutOfStock = e.availableQuantity === 0;
                const isDiscontinued = e.status === "discontinued";
                const isAvailable = !isOutOfStock && !isDiscontinued;
                const searchName = e.name.toLowerCase();

                return (
                  <Card
                    key={e._id}
                    className="bg-card border-border shadow-sm hover:shadow-md transition-all rounded-xl overflow-hidden flex flex-col group cursor-pointer"
                    onClick={() => setSelectedEquipment(e)}
                  >
                    {/* Image Area - full picture via object-contain */}
                    <div className="h-52 bg-white dark:bg-slate-900/80 p-3 flex items-center justify-center border-b border-border/50 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 transition-colors overflow-hidden relative">
                      {e.image ? (
                        <img
                          src={e.image}
                          alt={e.name}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-sm"
                        />
                      ) : searchName.includes('áo') || searchName.includes('quần') || searchName.includes('giày') || searchName.includes('tất') ? (
                        <Shirt className="w-16 h-16 text-primary/20 dark:text-primary/10" />
                      ) : searchName.includes('bóng') || searchName.includes('cúp') ? (
                        <Trophy className="w-16 h-16 text-primary/20 dark:text-primary/10" />
                      ) : (
                        <Box className="w-16 h-16 text-primary/20 dark:text-primary/10" />
                      )}
                    </div>
                    
                    <CardHeader className="p-5 pb-3">
                      <div className="flex justify-between items-start gap-3 mb-2">
                        <CardTitle className="text-lg font-bold truncate" title={e.name}>
                          {e.name}
                        </CardTitle>
                        <Badge 
                          variant={isAvailable ? "default" : "destructive"} 
                          className={isAvailable ? "bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 whitespace-nowrap" : "whitespace-nowrap"}
                        >
                          {isDiscontinued ? 'Ngừng bán' : isAvailable ? 'Còn hàng' : 'Hết hàng'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <Badge variant="secondary" className="font-medium text-xs">
                          {MODE_LABELS[e.mode] || 'Không rõ'}
                        </Badge>
                        <span className="text-sm text-muted-foreground font-medium">Còn lại: {e.availableQuantity} {e.unit}</span>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-5 pt-0 flex-1">
                      <p className="line-clamp-2 text-sm text-muted-foreground" title={e.description}>
                        {e.description || "Chưa có mô tả cho thiết bị này."}
                      </p>
                    </CardContent>

                    <CardFooter className="p-5 border-t border-border pt-4 bg-slate-50/50 dark:bg-slate-900/50">
                      {e.mode === 'rent' ? (
                        <div className="flex justify-between items-center w-full">
                          <span className="text-sm font-medium text-muted-foreground">Giá thuê:</span> 
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">{(e.rentPrice || 0).toLocaleString('vi-VN')}đ <span className="text-xs font-normal text-muted-foreground">/ {e.unit}</span></span>
                        </div>
                      ) : e.mode === 'sell' ? (
                        <div className="flex justify-between items-center w-full">
                          <span className="text-sm font-medium text-muted-foreground">Giá bán:</span> 
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">{(e.salePrice || 0).toLocaleString('vi-VN')}đ <span className="text-xs font-normal text-muted-foreground">/ {e.unit}</span></span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 w-full">
                          <div className="flex justify-between items-center w-full">
                            <span className="text-sm font-medium text-muted-foreground">Thuê:</span> 
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{(e.rentPrice || 0).toLocaleString('vi-VN')}đ <span className="text-xs font-normal text-muted-foreground">/ {e.unit}</span></span>
                          </div>
                          <div className="flex justify-between items-center w-full">
                            <span className="text-sm font-medium text-muted-foreground">Bán:</span> 
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{(e.salePrice || 0).toLocaleString('vi-VN')}đ <span className="text-xs font-normal text-muted-foreground">/ {e.unit}</span></span>
                          </div>
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
                <span className="text-sm text-muted-foreground">
                  Đang xem {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filtered.length)} trên tổng số {filtered.length} thiết bị
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Trước
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Sau
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Full Image / Lightbox Detail Modal */}
        <Dialog open={!!selectedEquipment} onOpenChange={(v) => !v && setSelectedEquipment(null)}>
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto p-0 border border-slate-800/80 rounded-2xl bg-slate-950/95 text-slate-100 backdrop-blur-2xl shadow-2xl">
            <DialogHeader className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/50 text-left">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2.5 text-base font-extrabold text-white">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span>Chi tiết sản phẩm dịch vụ</span>
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono font-bold bg-slate-800/80 text-emerald-400 border-slate-700">
                    {selectedEquipment?.code}
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            {selectedEquipment && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 text-left">
                {/* Left Column: Image Stage & Trust Badges (5 cols) */}
                <div className="md:col-span-5 space-y-4">
                  <div className="w-full h-72 lg:h-80 rounded-2xl border border-slate-800 bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4 overflow-hidden relative shadow-inner group">
                    {selectedEquipment.image ? (
                      <img
                        src={selectedEquipment.image}
                        alt={selectedEquipment.name}
                        className="max-h-full max-w-full object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-500">
                        <Box className="w-16 h-16 opacity-40" />
                        <span className="text-xs font-medium">Chưa có hình ảnh minh họa</span>
                      </div>
                    )}
                    <span className="absolute bottom-3 right-3 text-[10px] font-bold text-slate-400 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                      Sân bóng MIRA
                    </span>
                  </div>

                  {/* Trust Highlights */}
                  <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                      <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>Trang thiết bị chuẩn chất lượng tại sân</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-sky-400" />
                      <span>Nhận & kiểm tra trực tiếp trước khi đá</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Clock className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>Hỗ trợ đổi size / chủng loại linh hoạt</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Spec, Pricing & Description (7 cols) */}
                <div className="md:col-span-7 space-y-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Status & Category Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-xs px-3 py-1">
                        {MODE_LABELS[selectedEquipment.mode] || selectedEquipment.mode}
                      </Badge>
                      <Badge
                        variant={selectedEquipment.availableQuantity > 0 ? "default" : "destructive"}
                        className={selectedEquipment.availableQuantity > 0 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : ""}
                      >
                        {selectedEquipment.availableQuantity > 0 ? `Còn hàng (${selectedEquipment.availableQuantity} ${selectedEquipment.unit})` : "Hết hàng"}
                      </Badge>
                    </div>

                    {/* Product Name */}
                    <div>
                      <h2 className="text-xl lg:text-2xl font-black text-white leading-tight">
                        {selectedEquipment.name}
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Đơn vị tính: <span className="font-bold text-slate-200">{selectedEquipment.unit}</span>
                      </p>
                    </div>

                    {/* Price Showcase Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(selectedEquipment.mode === "rent" || selectedEquipment.mode === "both") && (
                        <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-xl space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">Giá thuê sân</span>
                          <div className="text-xl font-extrabold text-emerald-400 font-mono">
                            {(selectedEquipment.rentPrice || 0).toLocaleString("vi-VN")}<span className="text-xs ml-0.5">đ</span>
                            <span className="text-xs font-normal text-slate-400 font-sans"> / {selectedEquipment.unit}</span>
                          </div>
                        </div>
                      )}
                      {(selectedEquipment.mode === "sell" || selectedEquipment.mode === "both") && (
                        <div className="bg-amber-950/40 border border-amber-500/30 p-3.5 rounded-xl space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">Giá mua trực tiếp</span>
                          <div className="text-xl font-extrabold text-amber-400 font-mono">
                            {(selectedEquipment.salePrice || 0).toLocaleString("vi-VN")}<span className="text-xs ml-0.5">đ</span>
                            <span className="text-xs font-normal text-slate-400 font-sans"> / {selectedEquipment.unit}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {selectedEquipment.description && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Mô tả chi tiết sản phẩm
                        </span>
                        <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 whitespace-pre-line max-h-36 overflow-y-auto custom-scrollbar">
                          {selectedEquipment.description}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stock Status Bar */}
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Tồn kho khả dụng:</span>
                    <span className="font-mono font-bold text-white">
                      {selectedEquipment.availableQuantity} / {selectedEquipment.totalQuantity} {selectedEquipment.unit}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="px-6 py-4 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-end">
              <Button
                onClick={() => setSelectedEquipment(null)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-6 rounded-xl shadow-lg transition-all"
              >
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default UserEquipmentList;
