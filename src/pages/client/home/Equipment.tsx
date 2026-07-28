import React, { useEffect, useMemo, useState } from "react";
import { Search, RotateCw, Trophy, Shirt, Box, ChevronLeft, ChevronRight, Eye } from "lucide-react";
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
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 border border-border rounded-2xl bg-card">
            <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20 text-left">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2 text-base font-extrabold">
                  <Eye className="w-5 h-5 text-primary" />
                  {selectedEquipment?.name}
                </DialogTitle>
                <Badge variant="outline" className="text-xs font-semibold">
                  {selectedEquipment?.code}
                </Badge>
              </div>
            </DialogHeader>

            {selectedEquipment && (
              <div className="p-6 space-y-5 text-left">
                {/* Image View */}
                <div className="w-full h-72 rounded-xl border border-border bg-white dark:bg-slate-900 flex items-center justify-center p-3 overflow-hidden shadow-inner">
                  {selectedEquipment.image ? (
                    <img
                      src={selectedEquipment.image}
                      alt={selectedEquipment.name}
                      className="max-h-full max-w-full object-contain drop-shadow-md"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground/30">
                      <Box className="w-16 h-16" />
                      <span className="text-xs">Chưa có hình ảnh minh họa</span>
                    </div>
                  )}
                </div>

                {/* Stock & Mode */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 p-4 rounded-xl border border-border/60">
                  <div>
                    <span className="text-xs text-muted-foreground font-medium block">Tình trạng kho</span>
                    <span className="font-extrabold text-sm text-foreground">
                      Còn {selectedEquipment.availableQuantity} / {selectedEquipment.totalQuantity} {selectedEquipment.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-medium block">Hình thức</span>
                    <Badge variant="secondary" className="mt-0.5">
                      {MODE_LABELS[selectedEquipment.mode] || selectedEquipment.mode}
                    </Badge>
                  </div>
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
                  {(selectedEquipment.mode === "rent" || selectedEquipment.mode === "both") && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground block">Giá thuê sân</span>
                      <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                        {(selectedEquipment.rentPrice || 0).toLocaleString("vi-VN")}đ / {selectedEquipment.unit}
                      </span>
                    </div>
                  )}
                  {(selectedEquipment.mode === "sell" || selectedEquipment.mode === "both") && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground block">Giá mua trực tiếp</span>
                      <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                        {(selectedEquipment.salePrice || 0).toLocaleString("vi-VN")}đ / {selectedEquipment.unit}
                      </span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedEquipment.description && (
                  <div className="border-t border-border pt-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      Mô tả chi tiết
                    </span>
                    <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed bg-muted/20 p-3 rounded-xl border border-border/50">
                      {selectedEquipment.description}
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="px-6 py-4 border-t border-border flex justify-end">
              <Button variant="outline" onClick={() => setSelectedEquipment(null)} className="rounded-xl px-6">
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
