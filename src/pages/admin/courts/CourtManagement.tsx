import React, { useEffect, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { useNavigate } from 'react-router-dom';
import {
    Upload,
    Image,
    message,
    Spin,
} from 'antd';
import {
    Plus,
    Edit3,
    Trash2,
    Eye,
    MapPin,
    Shield,
    Waves,
    Zap,
    Crown,
    ChevronLeft,
    ChevronRight,
    Upload as UploadIcon,
    DollarSign,
    X,
    RefreshCw,
    Info,
    Wifi,
    Car,
    ShowerHead,
    Search,
    SlidersHorizontal,
    Tag,
    Layers,
    FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../common/utils/api.ts';

// shadcn/ui components
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface Court {
    _id?: string;
    code: string;
    name: string;
    type: 'indoor' | 'outdoor' | 'vip';
    status: 'active' | 'maintenance' | 'locked';
    formats?: string[];
    basePrice: number;
    peakPrice: number;
    description?: string;
    amenities?: string[];
    images?: string[];
    location?: string;
}

const TYPE_CONFIG = {
    indoor: { label: 'Trong nhà', icon: <Shield size={12} className="mr-1" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
    outdoor: { label: 'Ngoài trời', icon: <Waves size={12} className="mr-1" />, color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' },
    vip: { label: 'VIP', icon: <Crown size={12} className="mr-1" />, color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' },
};

const STATUS_CONFIG = {
    active: { label: 'Khai thác', color: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
    maintenance: { label: 'Bảo trì', color: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' },
    locked: { label: 'Tạm ngưng', color: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' },
};

const fmtVND = (n?: number) => (typeof n === 'number' ? `${n.toLocaleString('vi-VN')} ₫` : '—');

const CourtManagement: React.FC = () => {
    const [courts, setCourts] = useState<Court[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [detailModal, setDetailModal] = useState(false);
    const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [editingCourt, setEditingCourt] = useState<Court | null>(null);

    // Delete confirm alert-dialog state
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [courtToDeleteId, setCourtToDeleteId] = useState<string | null>(null);

    // Form inputs state
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [type, setType] = useState<'indoor' | 'outdoor' | 'vip'>('indoor');
    const [status, setStatus] = useState<'active' | 'maintenance' | 'locked'>('active');
    const [formats, setFormats] = useState<string[]>([]);
    const [basePrice, setBasePrice] = useState<number | ''>('');
    const [peakPrice, setPeakPrice] = useState<number | ''>('');
    const [displayBasePrice, setDisplayBasePrice] = useState('');
    const [displayPeakPrice, setDisplayPeakPrice] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [amenities, setAmenities] = useState('');
    const [fileList, setFileList] = useState<any[]>([]);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Search and filter state
    const [searchText, setSearchText] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 6;

    const navigate = useNavigate();

    const fetchCourts = async () => {
        try {
            setLoading(true);
            const res = await api.get('/courts');
            setCourts(Array.isArray(res.data.data) ? res.data.data : []);
        } catch {
            message.error('Không thể tải danh sách sân!');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourts();
    }, []);

    const openModal = (court?: Court) => {
        if (court) {
            setEditingCourt(court);
            setCode(court.code || '');
            setName(court.name || '');
            setType(court.type || 'indoor');
            setStatus(court.status || 'active');
            const rawFormats = court.formats;
            const parsedFormats = Array.isArray(rawFormats)
                ? rawFormats
                : (typeof rawFormats === 'string' ? rawFormats.split(',').map((f: string) => f.trim()).filter(Boolean) : []);
            setFormats(parsedFormats);
            setBasePrice(court.basePrice || '');
            setPeakPrice(court.peakPrice || '');
            setDisplayBasePrice(court.basePrice ? court.basePrice.toLocaleString('vi-VN') : '');
            setDisplayPeakPrice(court.peakPrice ? court.peakPrice.toLocaleString('vi-VN') : '');
            setLocation(court.location || '');
            setDescription(court.description || '');
            setAmenities(court.amenities?.join(', ') || '');
            setFileList(
                court.images?.map((url, i) => ({
                    uid: `${i}`,
                    name: `image-${i}`,
                    url,
                    status: 'done',
                })) || []
            );
        } else {
            setEditingCourt(null);
            setCode('');
            setName('');
            setType('indoor');
            setStatus('active');
            setFormats([]);
            setBasePrice('');
            setPeakPrice('');
            setDisplayBasePrice('');
            setDisplayPeakPrice('');
            setLocation('');
            setDescription('');
            setAmenities('');
            setFileList([]);
        }
        setFormErrors({});
        setModalOpen(true);
    };

    const handleView = async (id: string) => {
        try {
            setDetailLoading(true);
            setDetailModal(true);
            const res = await api.get(`/courts/${id}`);
            setSelectedCourt(res.data.data);
        } catch {
            message.error('Không thể lấy chi tiết sân!');
        } finally {
            setDetailLoading(false);
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Basic Validations
        const errors: Record<string, string> = {};
        if (!code.trim()) errors.code = 'Mã sân là bắt buộc!';
        if (!name.trim()) errors.name = 'Tên sân là bắt buộc!';
        if (!location.trim()) errors.location = 'Vị trí là bắt buộc!';
        if (basePrice === '' || Number(basePrice) <= 0) errors.basePrice = 'Giá thường không hợp lệ!';
        if (peakPrice === '' || Number(peakPrice) <= 0) errors.peakPrice = 'Giá cao điểm không hợp lệ!';
        if (formats.length === 0) errors.formats = 'Chọn ít nhất 1 định dạng!';

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            message.error('Vui lòng kiểm tra lại các trường thông tin bắt buộc!');
            return;
        }

        try {
            setSaving(true);
            const formData = new FormData();
            
            if (amenities.trim()) {
                amenities
                    .split(',')
                    .map((a: string) => a.trim())
                    .filter(Boolean)
                    .forEach((a: string) => formData.append('amenities', a));
            }
            
            formData.append('code', code);
            formData.append('name', name);
            formData.append('type', type);
            formData.append('status', status);
            formats.forEach(f => formData.append('formats', f));
            formData.append('basePrice', String(basePrice));
            formData.append('peakPrice', String(peakPrice));
            formData.append('location', location);
            formData.append('description', description);
            
            const keptImages = fileList.filter((f) => !f.originFileObj && f.url).map((f) => f.url!);
            keptImages.forEach((url) => formData.append('keepImages', url));
            
            const newFiles = fileList.filter((f) => f.originFileObj);
            for (const file of newFiles) {
                const compressed = await imageCompression(file.originFileObj!, {
                    maxSizeMB: 0.5,
                    maxWidthOrHeight: 1280,
                    useWebWorker: true,
                });
                formData.append('images', compressed);
            }
            
            let res: { data: { data: Court } };
            if (editingCourt?._id) {
                res = await api.patch(`/courts/${editingCourt._id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                message.success('Cập nhật sân thành công!');
                setCourts((prev) =>
                    prev.map((c) => (c._id === editingCourt._id ? res.data.data : c))
                );
                setSelectedCourt(res.data.data);
            } else {
                res = await api.post('/courts', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                message.success('Thêm sân mới thành công!');
                setCourts((prev) => [res.data.data, ...prev]);
            }
            setModalOpen(false);
        } catch (err: any) {
            message.error(err?.response?.data?.message || err?.message || 'Lỗi khi lưu dữ liệu!');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setCourtToDeleteId(id);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!courtToDeleteId) return;
        try {
            await api.delete(`/courts/${courtToDeleteId}`);
            message.success('Xóa sân bóng thành công!');
            fetchCourts();
        } catch {
            message.error('Xóa sân bóng thất bại!');
        } finally {
            setDeleteConfirmOpen(false);
            setCourtToDeleteId(null);
        }
    };

    // Filter courts locally
    const filteredCourts = courts.filter((court) => {
        const matchesSearch = 
            court.name.toLowerCase().includes(searchText.toLowerCase()) ||
            court.code.toLowerCase().includes(searchText.toLowerCase()) ||
            (court.location || '').toLowerCase().includes(searchText.toLowerCase());
        
        const matchesType = typeFilter === 'all' || court.type === typeFilter;
        const matchesStatus = statusFilter === 'all' || court.status === statusFilter;

        return matchesSearch && matchesType && matchesStatus;
    });

    // Pagination slice
    const totalPages = Math.ceil(filteredCourts.length / pageSize);
    const paginatedCourts = filteredCourts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchText, typeFilter, statusFilter]);

    return (
        <div className="px-6 pb-12 space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pt-6">
            
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Quản lý sân bóng
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Quản lý cơ sở vật chất và cấu hình vận hành sân bóng
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchCourts}
                        className="h-10 w-10 text-muted-foreground hover:text-foreground border-border hover:bg-muted"
                        title="Làm mới"
                    >
                        <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
                    </Button>
                    <Button
                        onClick={() => openModal()}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                    >
                        <Plus size={16} className="mr-1.5" /> Thêm sân mới
                    </Button>
                </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3 items-center bg-card p-4 rounded-xl border border-border/80 shadow-xs">
                <div className="relative w-full sm:flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input
                        placeholder="Tìm theo tên sân, mã sân, vị trí..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="pl-9 h-10 w-full"
                    />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-[140px]">
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="h-10 bg-background text-sm">
                                <SelectValue placeholder="Loại sân" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả loại</SelectItem>
                                <SelectItem value="indoor">Trong nhà</SelectItem>
                                <SelectItem value="outdoor">Ngoài trời</SelectItem>
                                <SelectItem value="vip">VIP</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-[140px]">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-10 bg-background text-sm">
                                <SelectValue placeholder="Trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                                <SelectItem value="active">Khai thác</SelectItem>
                                <SelectItem value="maintenance">Bảo trì</SelectItem>
                                <SelectItem value="locked">Tạm ngưng</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Custom shadcn Table */}
            <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
                {loading ? (
                    <div className="py-20 flex justify-center items-center">
                        <Spin tip="Đang tải danh sách sân..." />
                    </div>
                ) : paginatedCourts.length > 0 ? (
                    <div className="w-full overflow-x-auto">
                        <Table className="min-w-[800px]">
                            <TableHeader>
                                <TableRow className="bg-muted/10">
                                    <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider pl-6 py-4">SÂN BÓNG</TableHead>
                                    <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider py-4 w-[200px]">KHUNG GIÁ</TableHead>
                                    <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider py-4 min-w-[200px]">ĐẶC ĐIỂM</TableHead>
                                    <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider py-4 text-right pr-6">THAO TÁC</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedCourts.map((court) => {
                                    const courtType = TYPE_CONFIG[court.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.indoor;
                                    const courtStatus = STATUS_CONFIG[court.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active;
                                    const courtFormats = Array.isArray(court.formats) ? court.formats : [];
                                    const courtAmenities = Array.isArray(court.amenities) ? court.amenities : [];

                                    return (
                                        <TableRow key={court._id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="pl-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative shrink-0">
                                                        {court.images && court.images.length > 0 ? (
                                                            <div className="w-14 h-14 rounded-xl overflow-hidden shadow-xs border border-border">
                                                                <Image
                                                                    src={court.images[0]}
                                                                    className="w-full h-full object-cover"
                                                                    preview={{
                                                                        mask: (
                                                                            <div className="text-[10px] font-bold text-white bg-black/60 w-full h-full flex items-center justify-center">
                                                                                XEMẢNH
                                                                            </div>
                                                                        )
                                                                    }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center border border-border">
                                                                <Eye size={18} className="text-muted-foreground" />
                                                            </div>
                                                        )}
                                                        <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-semibold border border-background shadow-xs whitespace-nowrap ${courtStatus.color}`}>
                                                            {courtStatus.label}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-semibold text-foreground text-sm leading-none">{court.name}</span>
                                                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                            <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 rounded-sm bg-muted text-muted-foreground border-none">
                                                                {court.code}
                                                            </Badge>
                                                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                                <MapPin size={11} className="text-muted-foreground shrink-0" />
                                                                <span className="truncate max-w-[150px]">{court.location || 'Chưa cập nhật'}</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex flex-col gap-1 text-xs">
                                                    <div className="flex items-center justify-between pr-4">
                                                        <span className="text-muted-foreground">Thường:</span>
                                                        <span className="font-medium text-foreground">{fmtVND(court.basePrice)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between pr-4">
                                                        <span className="text-muted-foreground">Cao điểm:</span>
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmtVND(court.peakPrice)}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <div className={`flex items-center px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase w-fit ${courtType.color}`}>
                                                            {courtType.icon}
                                                            {courtType.label}
                                                        </div>
                                                        {courtFormats.map((f, idx) => (
                                                            <span key={idx} className="px-1.5 py-0.5 bg-slate-800 dark:bg-slate-700 text-white text-[9px] font-bold rounded-md uppercase">
                                                                Sân {f}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {courtAmenities.slice(0, 3).map((a, idx) => (
                                                            <span key={idx} className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded-md">
                                                                <div className="w-1 h-1 rounded-full bg-emerald-500 shrink-0"></div>
                                                                <span className="truncate max-w-[80px]">{a}</span>
                                                            </span>
                                                        ))}
                                                        {courtAmenities.length > 3 && (
                                                            <span className="text-[9px] font-bold text-muted-foreground">
                                                                +{courtAmenities.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="pr-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleView(court._id!)}
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                                        title="Xem chi tiết"
                                                    >
                                                        <Eye size={15} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => navigate(`/admin/courts/update/${court._id}`)}
                                                        className="h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                                        title="Chỉnh sửa"
                                                    >
                                                        <Edit3 size={15} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteClick(court._id!)}
                                                        className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                                        title="Khóa sân"
                                                    >
                                                        <Trash2 size={15} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>

                        {/* Pagination Row */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/5">
                                <p className="text-xs text-muted-foreground font-medium">
                                    Hiển thị <span className="font-semibold text-foreground">{Math.min((currentPage - 1) * pageSize + 1, filteredCourts.length)}</span> đến{" "}
                                    <span className="font-semibold text-foreground">{Math.min(currentPage * pageSize, filteredCourts.length)}</span> trong tổng số{" "}
                                    <span className="font-semibold text-foreground">{filteredCourts.length}</span> sân bóng
                                </p>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="h-8 w-8 rounded-lg"
                                    >
                                        <ChevronLeft size={14} />
                                    </Button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                        <Button
                                            key={p}
                                            variant={currentPage === p ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setCurrentPage(p)}
                                            className={`h-8 w-8 rounded-lg text-xs font-semibold ${currentPage === p ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:text-white border-emerald-600' : ''}`}
                                        >
                                            {p}
                                        </Button>
                                    ))}
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="h-8 w-8 rounded-lg"
                                    >
                                        <ChevronRight size={14} />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-24 text-center">
                        <SlidersHorizontal size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                        <h3 className="font-bold text-foreground text-sm">Không tìm thấy sân bóng</h3>
                        <p className="text-xs text-muted-foreground mt-1">Vui lòng thử lại với từ khóa hoặc bộ lọc khác.</p>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal (shadcn/ui Dialog) */}
            {/* Add/Edit Modal (shadcn/ui Dialog) */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0 border border-border/80 rounded-xl shadow-xl bg-card">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-border bg-muted/5 flex flex-row items-center justify-between">
                        <div>
                            <DialogTitle className="text-lg font-bold text-foreground">
                                {editingCourt ? 'Cập nhật cấu hình sân bóng' : 'Thêm sân bóng mới'}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Thiết lập các thông số vận hành và thông tin chi tiết của sân bóng.
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleFormSubmit} className="space-y-0">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 p-6">
                            {/* Left Panel - 3/5 width */}
                            <div className="md:col-span-3 space-y-5">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                        <div className="w-1 h-3.5 bg-emerald-600 rounded-full"></div>
                                        Thông tin bắt buộc
                                    </h3>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="code" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                                <Tag size={11} /> Mã định danh <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id="code"
                                                placeholder="Ví dụ: S001"
                                                value={code}
                                                onChange={(e) => setCode(e.target.value)}
                                                className={formErrors.code ? 'border-destructive' : ''}
                                            />
                                            {formErrors.code && <p className="text-[10px] font-medium text-destructive">{formErrors.code}</p>}
                                        </div>
                                        
                                        <div className="space-y-1.5">
                                            <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                                <Shield size={11} /> Tên sân <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id="name"
                                                placeholder="VD: Sân Mira A1"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className={formErrors.name ? 'border-destructive' : ''}
                                            />
                                            {formErrors.name && <p className="text-[10px] font-medium text-destructive">{formErrors.name}</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="location" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <MapPin size={11} /> Địa chỉ / Vị trí <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="location"
                                            placeholder="Ví dụ: Quận 7, TP.HCM"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            className={formErrors.location ? 'border-destructive' : ''}
                                        />
                                        {formErrors.location && <p className="text-[10px] font-medium text-destructive">{formErrors.location}</p>}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-1">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                        <div className="w-1 h-3.5 bg-emerald-600 rounded-full"></div>
                                        Thông tin bổ sung
                                    </h3>
                                    
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <Layers size={11} /> Định dạng sân <span className="text-destructive">*</span>
                                        </Label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {['5v5', '7v7', '9v9', '11v11'].map((fmt) => {
                                                const isSelected = formats.includes(fmt);
                                                return (
                                                    <button
                                                        key={fmt}
                                                        type="button"
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setFormats(formats.filter((f) => f !== fmt));
                                                            } else {
                                                                setFormats([...formats, fmt]);
                                                            }
                                                        }}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                            isSelected
                                                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                                                : 'bg-background hover:bg-muted text-muted-foreground border-border'
                                                        }`}
                                                    >
                                                        {fmt}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {formErrors.formats && <p className="text-[10px] font-medium text-destructive mt-1">{formErrors.formats}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="amenities" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <Wifi size={11} /> Tiện ích (Phân cách bằng dấu phẩy)
                                        </Label>
                                        <Input
                                            id="amenities"
                                            placeholder="Ví dụ: Wifi, Phòng tắm, Đỗ xe, Nước uống"
                                            value={amenities}
                                            onChange={(e) => setAmenities(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <FileText size={11} /> Mô tả giới thiệu
                                        </Label>
                                        <textarea
                                            id="description"
                                            rows={3}
                                            placeholder="Nhập mô tả giới thiệu về chất lượng cỏ, hệ thống chiếu sáng..."
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel - 2/5 width */}
                            <div className="md:col-span-2 space-y-5 border-t md:border-t-0 md:border-l border-border/80 pt-5 md:pt-0 md:pl-6">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                        <div className="w-1 h-3.5 bg-emerald-600 rounded-full"></div>
                                        Thiết lập vận hành
                                    </h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Loại sân</Label>
                                            <Select value={type} onValueChange={(val: any) => setType(val)}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Chọn loại" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="indoor">Trong nhà</SelectItem>
                                                    <SelectItem value="outdoor">Ngoài trời</SelectItem>
                                                    <SelectItem value="vip">VIP</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng thái</Label>
                                            <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Trạng thái" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="active">Khai thác</SelectItem>
                                                    <SelectItem value="maintenance">Bảo trì</SelectItem>
                                                    <SelectItem value="locked">Tạm ngưng</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                            <div className="w-1 h-3.5 bg-emerald-600 rounded-full"></div>
                                            Đơn giá thuê sân
                                        </h3>
                                        
                                        <div className="space-y-3 p-4 bg-muted/40 rounded-xl border border-border">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="basePrice" className="text-xs font-bold text-muted-foreground uppercase">Giờ thường <span className="text-destructive">*</span></Label>
                                                <div className="relative">
                                                    <Input
                                                        id="basePrice"
                                                        type="text"
                                                        placeholder="Ví dụ: 300,000"
                                                        value={displayBasePrice}
                                                        onChange={(e) => {
                                                            const raw = e.target.value.replace(/[^\d]/g, '');
                                                            const num = raw ? Number(raw) : '';
                                                            setBasePrice(num);
                                                            setDisplayBasePrice(num !== '' ? num.toLocaleString('vi-VN') : '');
                                                        }}
                                                        className={`pl-8 ${formErrors.basePrice ? 'border-destructive' : ''}`}
                                                    />
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">₫</span>
                                                </div>
                                                {formErrors.basePrice && <p className="text-[10px] font-medium text-destructive">{formErrors.basePrice}</p>}
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="peakPrice" className="text-xs font-bold text-muted-foreground uppercase">Giờ cao điểm <span className="text-destructive">*</span></Label>
                                                <div className="relative">
                                                    <Input
                                                        id="peakPrice"
                                                        type="text"
                                                        placeholder="Ví dụ: 500,000"
                                                        value={displayPeakPrice}
                                                        onChange={(e) => {
                                                            const raw = e.target.value.replace(/[^\d]/g, '');
                                                            const num = raw ? Number(raw) : '';
                                                            setPeakPrice(num);
                                                            setDisplayPeakPrice(num !== '' ? num.toLocaleString('vi-VN') : '');
                                                        }}
                                                        className={`pl-8 ${formErrors.peakPrice ? 'border-destructive' : ''}`}
                                                    />
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">₫</span>
                                                </div>
                                                {formErrors.peakPrice && <p className="text-[10px] font-medium text-destructive">{formErrors.peakPrice}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-1">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Thư viện ảnh (Tối đa 10 ảnh)</Label>
                                        <div className="p-3 border border-dashed border-border rounded-xl bg-muted/10">
                                            <Upload
                                                listType="picture-card"
                                                fileList={fileList}
                                                beforeUpload={() => false}
                                                onChange={({ fileList }) => setFileList(fileList)}
                                                accept="image/*"
                                                multiple
                                                className="admin-upload-small"
                                            >
                                                {fileList.length < 10 && (
                                                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-0.5">
                                                        <UploadIcon size={16} />
                                                        <span className="text-[8px] font-bold uppercase tracking-wider">Tải ảnh</span>
                                                    </div>
                                                )}
                                            </Upload>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-border bg-muted/5 flex flex-row items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setModalOpen(false)}
                                className="h-10 px-5 text-sm font-medium border-border"
                            >
                                Hủy bỏ
                            </Button>
                            <Button
                                type="submit"
                                disabled={saving}
                                className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                            >
                                {saving ? 'Đang lưu...' : editingCourt ? 'Cập nhật' : 'Tạo mới'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Detail Modal (shadcn/ui Dialog) */}
            <Dialog open={detailModal} onOpenChange={setDetailModal}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-0 border border-border/80 rounded-xl shadow-xl bg-card">
                    <DialogHeader className="px-6 py-5 border-b border-border bg-muted/5 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Info size={20} />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-foreground">
                                    {selectedCourt?.name || 'Chi tiết sân'}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Tổng quan thông tin cấu hình và vận hành hiện tại.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6">
                        <AnimatePresence mode="wait">
                            {detailLoading ? (
                                <div className="space-y-6 py-4 animate-pulse">
                                    <div className="h-24 bg-muted rounded-xl w-full" />
                                    <div className="h-20 bg-muted rounded-xl w-full" />
                                    <div className="h-40 bg-muted rounded-xl w-full" />
                                </div>
                            ) : selectedCourt ? (
                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                                    {/* Left Details Grid */}
                                    <div className="lg:col-span-3 space-y-6">
                                        <div className="grid grid-cols-2 gap-4 bg-muted/30 p-5 rounded-xl border border-border">
                                            <div>
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Mã định danh</span>
                                                <span className="font-bold text-foreground text-sm">{selectedCourt.code}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Vị trí</span>
                                                <span className="font-bold text-foreground text-sm flex items-center gap-1">
                                                    <MapPin size={14} className="text-muted-foreground" />
                                                    {selectedCourt.location || 'N/A'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Loại hình</span>
                                                <Badge className={`px-2 py-0.5 border text-[9px] font-bold uppercase w-fit ${TYPE_CONFIG[selectedCourt.type as keyof typeof TYPE_CONFIG].color}`}>
                                                    {TYPE_CONFIG[selectedCourt.type as keyof typeof TYPE_CONFIG].label}
                                                </Badge>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Trạng thái vận hành</span>
                                                <Badge className={`px-2 py-0.5 border text-[9px] font-bold uppercase w-fit ${STATUS_CONFIG[selectedCourt.status as keyof typeof STATUS_CONFIG].color}`}>
                                                    {STATUS_CONFIG[selectedCourt.status as keyof typeof STATUS_CONFIG].label}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Amenities list */}
                                        <div className="space-y-2.5">
                                            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                <div className="w-1 h-4 bg-emerald-600 rounded-full" />
                                                Tiện ích hỗ trợ
                                            </h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {selectedCourt.amenities && selectedCourt.amenities.length > 0 ? (
                                                    selectedCourt.amenities.map((a, idx) => (
                                                        <div key={idx} className="px-3 py-2 bg-muted border border-border rounded-lg text-xs font-semibold text-foreground flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                            {a}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic col-span-full">Không có tiện ích nào được liệt kê</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div className="p-4 bg-muted/40 rounded-xl border border-border">
                                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Mô tả chi tiết</h4>
                                            <p className="text-xs text-foreground leading-relaxed">
                                                {selectedCourt.description || 'Mira Football Court - Sân bóng chuyên nghiệp, chất lượng cỏ đạt tiêu chuẩn cao.'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right Pricing / Image Grid */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="p-4 bg-card border border-border rounded-xl space-y-3 shadow-xs">
                                            <div className="flex justify-between items-center pb-2 border-b border-border/60">
                                                <span className="text-[11px] font-bold text-muted-foreground uppercase">Giờ thường</span>
                                                <span className="text-sm font-semibold text-foreground whitespace-nowrap">{fmtVND(selectedCourt.basePrice)}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-1">
                                                <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                    Giờ cao điểm <Zap size={11} className="text-amber-500 fill-amber-500" />
                                                </span>
                                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmtVND(selectedCourt.peakPrice)}</span>
                                            </div>
                                        </div>

                                        {/* Images Preview Grid */}
                                        <div className="space-y-2.5">
                                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Thư viện ảnh ({selectedCourt.images?.length || 0})</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {selectedCourt.images && selectedCourt.images.length > 0 ? (
                                                    selectedCourt.images.map((img, idx) => (
                                                        <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                                                            <Image
                                                                src={img}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="col-span-2 aspect-video rounded-lg bg-muted flex items-center justify-center border text-xs text-muted-foreground italic">
                                                        Chưa cập nhật hình ảnh
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-16 text-center text-muted-foreground text-xs italic">
                                    Không thể hiển thị chi tiết dữ liệu.
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete/Lock Confirmation (shadcn/ui AlertDialog) */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent className="border border-border/80 rounded-xl overflow-hidden shadow-xl max-w-md bg-card">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-bold text-foreground">
                            Xóa sân bóng vĩnh viễn?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-muted-foreground mt-2">
                            Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa vĩnh viễn sân bóng này cùng toàn bộ thông tin cấu hình liên quan khỏi hệ thống?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 flex gap-2">
                        <AlertDialogCancel asChild>
                            <Button variant="outline" className="border-border">Hủy bỏ</Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button onClick={handleConfirmDelete} className="bg-rose-600 hover:bg-rose-700 text-white font-semibold">Xóa vĩnh viễn</Button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* Custom File Upload Styles */}
            <style>{`
                .admin-upload .ant-upload-list-item-container,
                .admin-upload .ant-upload-select {
                    width: 90px !important;
                    height: 90px !important;
                    border-radius: 12px !important;
                    border: 2px dashed var(--border, #e2e8f0) !important;
                    transition: border-color 0.15s !important;
                    background: transparent !important;
                }
                .admin-upload .ant-upload-select:hover {
                    border-color: #10b981 !important;
                }
                .dark .admin-upload .ant-upload-select {
                    border-color: rgba(255, 255, 255, 0.1) !important;
                }
                .dark .admin-upload .ant-upload-select:hover {
                    border-color: #34d399 !important;
                }
                .admin-upload .ant-upload-list-item {
                    border-radius: 12px !important;
                    border: 1px solid var(--border, #e2e8f0) !important;
                }
                .dark .admin-upload .ant-upload-list-item {
                    border-color: rgba(255, 255, 255, 0.1) !important;
                }

                /* Small upload box overrides for modal form */
                .admin-upload-small .ant-upload-list-item-container,
                .admin-upload-small .ant-upload-select {
                    width: 75px !important;
                    height: 75px !important;
                    border-radius: 10px !important;
                    border: 2px dashed var(--border, #e2e8f0) !important;
                    transition: border-color 0.15s !important;
                    background: transparent !important;
                }
                .admin-upload-small .ant-upload-select:hover {
                    border-color: #10b981 !important;
                }
                .dark .admin-upload-small .ant-upload-select {
                    border-color: rgba(255, 255, 255, 0.1) !important;
                }
                .dark .admin-upload-small .ant-upload-select:hover {
                    border-color: #34d399 !important;
                }
                .admin-upload-small .ant-upload-list-item {
                    border-radius: 10px !important;
                    border: 1px solid var(--border, #e2e8f0) !important;
                }
                .dark .admin-upload-small .ant-upload-list-item {
                    border-color: rgba(255, 255, 255, 0.1) !important;
                }
            `}</style>
        </div>
    );
};

export default CourtManagement;
