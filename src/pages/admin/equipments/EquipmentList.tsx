import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Plus,
    Pencil,
    Trash2,
    Search,
    RefreshCw,
    Package,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Box,
    Loader2,
    FileText,
    X,
    ChevronLeft,
    ChevronRight,
    Upload as UploadIcon,
    Image as ImageIcon,
} from 'lucide-react';
import api from '@/common/utils/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Shadcn UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

// ─── Types ──────────────────────────────────────────────
type EquipmentMode = 'rent' | 'sell' | 'both';
type EquipmentStatus = 'in_stock' | 'out_of_stock' | 'discontinued';

interface Equipment {
    _id: string;
    code: string;
    name: string;
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

interface FormData {
    code: string;
    name: string;
    unit: string;
    mode: EquipmentMode;
    status: EquipmentStatus;
    totalQuantity: number;
    availableQuantity: number;
    rentPrice: number;
    salePrice: number;
    description: string;
    image: string;
}

// ─── Constants ──────────────────────────────────────────
const MODE_LABELS: Record<EquipmentMode, string> = {
    rent: 'Cho thuê',
    sell: 'Bán',
    both: 'Thuê & Bán',
};

const MODE_COLORS: Record<EquipmentMode, string> = {
    rent: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    sell: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    both: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
};

const STATUS_LABELS: Record<EquipmentStatus, string> = {
    in_stock: 'Còn hàng',
    out_of_stock: 'Hết hàng',
    discontinued: 'Ngừng bán',
};

const STATUS_CONFIGS: Record<EquipmentStatus, { color: string; icon: React.ElementType }> = {
    in_stock: { color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
    out_of_stock: { color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', icon: XCircle },
    discontinued: { color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20', icon: AlertTriangle },
};

const UNIT_OPTIONS = [
    { value: 'cái', label: 'Cái' },
    { value: 'bộ', label: 'Bộ' },
    { value: 'chiếc', label: 'Chiếc' },
    { value: 'quả', label: 'Quả' },
    { value: 'đôi', label: 'Đôi' },
    { value: 'chai', label: 'Chai' },
];

const MOCK_DEVICES: Equipment[] = [
    {
        _id: 'sample-1',
        code: 'G01',
        name: 'Giày đinh bóng đá FX',
        unit: 'đôi',
        mode: 'both',
        status: 'in_stock',
        totalQuantity: 1000,
        availableQuantity: 962,
        rentPrice: 30000,
        salePrice: 200000,
        description: 'Giày đinh sân cỏ nhân tạo cao cấp, đủ size từ 38 - 44',
    },
    {
        _id: 'sample-2',
        code: 'A001',
        name: 'Áo pitch phân đội',
        unit: 'cái',
        mode: 'rent',
        status: 'in_stock',
        totalQuantity: 300,
        availableQuantity: 277,
        rentPrice: 30000,
        salePrice: 0,
        description: 'Áo bib lưới tập luyện xanh, đỏ, cam, vàng thoáng khí',
    },
    {
        _id: 'sample-3',
        code: 'B01',
        name: 'Bóng đá chuẩn FIFA 5',
        unit: 'quả',
        mode: 'both',
        status: 'in_stock',
        totalQuantity: 100,
        availableQuantity: 65,
        rentPrice: 30000,
        salePrice: 300000,
        description: 'Bóng đạt chuẩn thi đấu, da PU cao cấp êm ái',
    },
    {
        _id: 'sample-4',
        code: 'GT01',
        name: 'Găng tay thủ môn có xương',
        unit: 'đôi',
        mode: 'both',
        status: 'in_stock',
        totalQuantity: 50,
        availableQuantity: 42,
        rentPrice: 30000,
        salePrice: 250000,
        description: 'Găng tay thủ môn chuyên nghiệp dính bám chống lật ngón',
    },
    {
        _id: 'sample-5',
        code: 'BG01',
        name: 'Băng thun bảo vệ gối',
        unit: 'chiếc',
        mode: 'sell',
        status: 'in_stock',
        totalQuantity: 200,
        availableQuantity: 180,
        rentPrice: 0,
        salePrice: 50000,
        description: 'Băng gối thể thao co giãn 4 chiều hỗ trợ cơ khớp',
    },
    {
        _id: 'sample-6',
        code: 'XGD01',
        name: 'Bình xịt lạnh giảm đau chấn thương',
        unit: 'chai',
        mode: 'in_stock',
        status: 'in_stock',
        totalQuantity: 80,
        availableQuantity: 4,
        rentPrice: 0,
        salePrice: 120000,
        description: 'Bình xịt lạnh tức thì giảm sưng đau cho cầu thủ',
    },
];

const DEFAULT_FORM: FormData = {
    code: '',
    name: '',
    unit: 'cái',
    mode: 'rent',
    status: 'in_stock',
    totalQuantity: 0,
    availableQuantity: 0,
    rentPrice: 0,
    salePrice: 0,
    description: '',
    image: '',
};

// ─── Stat Card Component ─────────────────────────────────
interface StatCardProps {
    label: string;
    value: number;
    icon: React.ElementType;
    accentClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, accentClass }) => (
    <Card className="border border-border/80 rounded-xl shadow-xs overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1 text-left">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">{label}</span>
                <span className="text-2xl font-extrabold text-foreground font-mono">{value}</span>
            </div>
            <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl shrink-0', accentClass)}>
                <Icon className="h-4 w-4" />
            </div>
        </CardContent>
    </Card>
);

// ─── Delete Confirmation Dialog ──────────────────────────
interface DeleteDialogProps {
    open: boolean;
    name: string;
    loading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({ open, name, loading, onConfirm, onCancel }) => (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
        <DialogContent className="sm:max-w-md p-0 border border-border/80 rounded-2xl shadow-xl bg-card">
            <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20 text-left">
                <DialogTitle className="flex items-center gap-2 text-rose-600 text-sm font-extrabold uppercase tracking-wider">
                    <Trash2 className="h-4 w-4" />
                    Xác nhận xóa thiết bị
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                    Bạn có chắc chắn muốn xóa thiết bị <strong className="text-foreground">"{name}"</strong>? Thao tác này không thể hoàn tác.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-3">
                <Button variant="ghost" onClick={onCancel} disabled={loading} className="text-xs font-semibold h-10 px-4 rounded-xl">
                    Hủy bỏ
                </Button>
                <Button variant="destructive" onClick={onConfirm} disabled={loading} className="text-xs font-bold h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700">
                    {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                    Xóa vĩnh viễn
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

// ─── Form Dialog ─────────────────────────────────────────
interface FormDialogProps {
    open: boolean;
    editing: Equipment | null;
    formData: FormData;
    errors: Partial<Record<keyof FormData, string>>;
    submitLoading: boolean;
    onChange: (field: keyof FormData, value: string | number) => void;
    onSubmit: () => void;
    onCancel: () => void;
}

const FormDialog: React.FC<FormDialogProps> = ({
    open, editing, formData, errors, submitLoading, onChange, onSubmit, onCancel
}) => {
    const isRentMode = formData.mode === 'rent' || formData.mode === 'both';
    const isSellMode = formData.mode === 'sell' || formData.mode === 'both';

    const formatPrice = (val: number) => val ? val.toLocaleString('vi-VN') : '';

    const handlePriceChange = (field: 'rentPrice' | 'salePrice', raw: string) => {
        const cleaned = raw.replace(/[^\d]/g, '');
        onChange(field, Number(cleaned) || 0);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 border border-border/80 rounded-2xl shadow-xl bg-card">
                <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20 text-left">
                    <DialogTitle className="flex items-center gap-2 text-sm font-extrabold text-foreground uppercase tracking-wider">
                        {editing ? (
                            <>
                                <Pencil className="h-4 w-4 text-indigo-500" />
                                Chỉnh sửa thiết bị
                            </>
                        ) : (
                            <>
                                <Plus className="h-4 w-4 text-indigo-500" />
                                Thêm thiết bị mới
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                        {editing
                            ? `Cập nhật thông tin cho thiết bị ${editing.name}`
                            : 'Điền thông tin chi tiết để thêm thiết bị mới vào kho'}
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-4 text-left">
                    {/* Row: Code + Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="eq-code" className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Mã thiết bị <span className="text-rose-500">*</span></Label>
                            <Input
                                id="eq-code"
                                placeholder="VD: TB001"
                                value={formData.code}
                                onChange={(e) => onChange('code', e.target.value)}
                                className={cn('h-10 rounded-xl text-xs font-mono', errors.code && 'border-rose-500')}
                            />
                            {errors.code && <p className="text-[10px] text-rose-500 font-semibold">{errors.code}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="eq-name" className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Tên thiết bị <span className="text-rose-500">*</span></Label>
                            <Input
                                id="eq-name"
                                placeholder="VD: Bóng đá FIFA, Áo pitch..."
                                value={formData.name}
                                onChange={(e) => onChange('name', e.target.value)}
                                className={cn('h-10 rounded-xl text-xs font-semibold', errors.name && 'border-rose-500')}
                            />
                            {errors.name && <p className="text-[10px] text-rose-500 font-semibold">{errors.name}</p>}
                        </div>
                    </div>

                    {/* Row: Unit + Mode */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Đơn vị <span className="text-rose-500">*</span></Label>
                            <Select value={formData.unit} onValueChange={(v) => onChange('unit', v)}>
                                <SelectTrigger className="w-full h-10 rounded-xl text-xs font-semibold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-border bg-card">
                                    {UNIT_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value} className="text-xs font-semibold">{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Loại kinh doanh <span className="text-rose-500">*</span></Label>
                            <Select value={formData.mode} onValueChange={(v) => onChange('mode', v)}>
                                <SelectTrigger className="w-full h-10 rounded-xl text-xs font-semibold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-border bg-card">
                                    <SelectItem value="rent" className="text-xs font-semibold">Chỉ cho thuê</SelectItem>
                                    <SelectItem value="sell" className="text-xs font-semibold">Chỉ bán</SelectItem>
                                    <SelectItem value="both" className="text-xs font-semibold">Cho thuê & Bán</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row: Quantities */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="eq-total" className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Số lượng tổng <span className="text-rose-500">*</span></Label>
                            <Input
                                id="eq-total"
                                type="number"
                                min={0}
                                value={formData.totalQuantity}
                                onChange={(e) => onChange('totalQuantity', Number(e.target.value) || 0)}
                                className={cn('h-10 rounded-xl text-xs font-mono font-semibold', errors.totalQuantity && 'border-rose-500')}
                            />
                            {errors.totalQuantity && <p className="text-[10px] text-rose-500 font-semibold">{errors.totalQuantity}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="eq-avail" className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Còn lại trong kho <span className="text-rose-500">*</span></Label>
                            <Input
                                id="eq-avail"
                                type="number"
                                min={0}
                                value={formData.availableQuantity}
                                onChange={(e) => onChange('availableQuantity', Number(e.target.value) || 0)}
                                className={cn('h-10 rounded-xl text-xs font-mono font-semibold', errors.availableQuantity && 'border-rose-500')}
                            />
                            {errors.availableQuantity && <p className="text-[10px] text-rose-500 font-semibold">{errors.availableQuantity}</p>}
                        </div>
                    </div>

                    {/* Prices */}
                    {(isRentMode || isSellMode) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {isRentMode && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="eq-rent-price" className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Giá thuê <span className="text-rose-500">*</span></Label>
                                    <div className="relative">
                                        <Input
                                            id="eq-rent-price"
                                            className={cn('h-10 rounded-xl pr-12 text-xs font-mono font-semibold', errors.rentPrice && 'border-rose-500')}
                                            value={formatPrice(formData.rentPrice)}
                                            onChange={(e) => handlePriceChange('rentPrice', e.target.value)}
                                            placeholder="0"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">đ</span>
                                    </div>
                                    {errors.rentPrice && <p className="text-[10px] text-rose-500 font-semibold">{errors.rentPrice}</p>}
                                </div>
                            )}
                            {isSellMode && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="eq-sale-price" className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Giá bán <span className="text-rose-500">*</span></Label>
                                    <div className="relative">
                                        <Input
                                            id="eq-sale-price"
                                            className={cn('h-10 rounded-xl pr-12 text-xs font-mono font-semibold', errors.salePrice && 'border-rose-500')}
                                            value={formatPrice(formData.salePrice)}
                                            onChange={(e) => handlePriceChange('salePrice', e.target.value)}
                                            placeholder="0"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">đ</span>
                                    </div>
                                    {errors.salePrice && <p className="text-[10px] text-rose-500 font-semibold">{errors.salePrice}</p>}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Status */}
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Trạng thái kho <span className="text-rose-500">*</span></Label>
                        <Select value={formData.status} onValueChange={(v) => onChange('status', v)}>
                            <SelectTrigger className="w-full h-10 rounded-xl text-xs font-semibold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border bg-card">
                                <SelectItem value="in_stock" className="text-xs font-semibold">
                                    <span className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                        Còn hàng
                                    </span>
                                </SelectItem>
                                <SelectItem value="out_of_stock" className="text-xs font-semibold">
                                    <span className="flex items-center gap-2">
                                        <XCircle className="h-3.5 w-3.5 text-rose-500" />
                                        Hết hàng
                                    </span>
                                </SelectItem>
                                <SelectItem value="discontinued" className="text-xs font-semibold">
                                    <span className="flex items-center gap-2">
                                        <AlertTriangle className="h-3.5 w-3.5 text-slate-500" />
                                        Ngừng bán
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label htmlFor="eq-desc" className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Mô tả thêm</Label>
                        <Textarea
                            id="eq-desc"
                            rows={3}
                            placeholder="Mô tả về kích thước, màu sắc, tình trạng..."
                            value={formData.description}
                            onChange={(e) => onChange('description', e.target.value)}
                            className="rounded-xl text-xs font-normal"
                        />
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-1.5 pt-1">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Hình ảnh thiết bị</Label>
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
                            <div className="w-16 h-16 rounded-lg border border-border/80 bg-card shrink-0 overflow-hidden flex items-center justify-center relative shadow-xs">
                                {formData.image ? (
                                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon className="w-7 h-7 text-muted-foreground/30" />
                                )}
                            </div>
                            <div className="flex-1 space-y-2 text-left">
                                <Input
                                    placeholder="Dán URL ảnh hoặc tải ảnh lên bên dưới..."
                                    value={formData.image}
                                    onChange={(e) => onChange('image', e.target.value)}
                                    className="h-9 rounded-lg text-xs"
                                />
                                <div className="flex items-center gap-2">
                                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-colors">
                                        <UploadIcon className="w-3.5 h-3.5" />
                                        <span>Tải ảnh lên</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                try {
                                                    toast.loading("Đang tải ảnh thiết bị...");
                                                    const uploadData = new FormData();
                                                    uploadData.append("avatar", file);
                                                    const res = await api.post("/upload/avatar", uploadData, {
                                                        headers: { "Content-Type": "multipart/form-data" },
                                                    });
                                                    toast.dismiss();
                                                    const url = res.data?.data?.url || res.data?.url;
                                                    if (url) {
                                                        onChange("image", url);
                                                        toast.success("Tải ảnh thành công!");
                                                    } else {
                                                        toast.error("Không nhận được URL ảnh từ server!");
                                                    }
                                                } catch (err: any) {
                                                    toast.dismiss();
                                                    toast.error(err?.response?.data?.message || "Tải ảnh thất bại!");
                                                }
                                            }}
                                        />
                                    </label>
                                    {formData.image && (
                                        <button
                                            type="button"
                                            onClick={() => onChange('image', '')}
                                            className="text-xs font-semibold text-rose-500 hover:underline"
                                        >
                                            Xóa ảnh
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-3">
                    <Button variant="ghost" onClick={onCancel} disabled={submitLoading} className="text-xs font-semibold h-10 px-4 rounded-xl">
                        Hủy bỏ
                    </Button>
                    <Button onClick={onSubmit} disabled={submitLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-6 rounded-xl shadow-md">
                        {submitLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                        {editing ? 'Cập nhật thiết bị' : 'Thêm thiết bị mới'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// ─── Main Component ──────────────────────────────────────
const EquipmentList: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Equipment | null>(null);
    const [formData, setFormData] = useState<FormData>({ ...DEFAULT_FORM });
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
    const [submitLoading, setSubmitLoading] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Client pagination
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 8;

    // ─── FETCH ───────────────────────────────────────────
    const fetchEquipments = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/equipments');
            const list: Equipment[] = res.data?.data || res.data || [];
            if (list.length === 0) {
                setEquipments(MOCK_DEVICES);
            } else {
                const existingCodes = new Set(list.map((item) => item.code));
                const combined = [...list];
                MOCK_DEVICES.forEach((mockItem) => {
                    if (!existingCodes.has(mockItem.code)) {
                        combined.push(mockItem);
                    }
                });
                setEquipments(combined);
            }
        } catch (err) {
            console.error(err);
            setEquipments(MOCK_DEVICES);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEquipments();
    }, [fetchEquipments]);

    // ─── FILTERED LIST ───────────────────────────────────
    const filteredEquipments = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return equipments;
        return equipments.filter(
            (e) => e.name.toLowerCase().includes(keyword) || e.code.toLowerCase().includes(keyword)
        );
    }, [equipments, search]);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        setCurrentPage(1);
    };

    const totalItems = filteredEquipments.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const paginatedEquipments = filteredEquipments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // ─── STATS ───────────────────────────────────────────
    const stats = useMemo(() => {
        const total = equipments.length;
        const inStock = equipments.filter((e) => e.status === 'in_stock').length;
        const outOfStock = equipments.filter((e) => e.status === 'out_of_stock').length;
        const lowStock = equipments.filter(
            (e) => e.status === 'in_stock' && e.availableQuantity <= 5
        ).length;
        return { total, inStock, outOfStock, lowStock };
    }, [equipments]);

    // ─── FORM HANDLING ───────────────────────────────────
    const handleChange = useCallback((field: keyof FormData, value: string | number) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    }, []);

    const validate = useCallback((): boolean => {
        const newErrors: Partial<Record<keyof FormData, string>> = {};
        if (!formData.code.trim()) newErrors.code = 'Vui lòng nhập mã thiết bị';
        if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập tên thiết bị';
        if (formData.totalQuantity < 0) newErrors.totalQuantity = 'Không được âm';
        if (formData.availableQuantity < 0) newErrors.availableQuantity = 'Không được âm';
        if (formData.totalQuantity < formData.availableQuantity) {
            newErrors.totalQuantity = 'Tổng phải ≥ Còn lại';
        }
        const isRentMode = formData.mode === 'rent' || formData.mode === 'both';
        const isSellMode = formData.mode === 'sell' || formData.mode === 'both';
        if (isRentMode && (!formData.rentPrice || formData.rentPrice <= 0)) {
            newErrors.rentPrice = 'Nhập giá thuê';
        }
        if (isSellMode && (!formData.salePrice || formData.salePrice <= 0)) {
            newErrors.salePrice = 'Nhập giá bán';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData]);

    const openCreateModal = useCallback(() => {
        setEditing(null);
        setFormData({ ...DEFAULT_FORM });
        setErrors({});
        setModalOpen(true);
    }, []);

    const openEditModal = useCallback((item: Equipment) => {
        setEditing(item);
        setFormData({
            code: item.code,
            name: item.name,
            unit: item.unit,
            mode: item.mode,
            status: item.status,
            totalQuantity: item.totalQuantity,
            availableQuantity: item.availableQuantity,
            rentPrice: item.rentPrice || 0,
            salePrice: item.salePrice || 0,
            description: item.description || '',
            image: item.image || '',
        });
        setErrors({});
        setModalOpen(true);
    }, []);

    const handleModalCancel = useCallback(() => {
        setModalOpen(false);
        setEditing(null);
        setFormData({ ...DEFAULT_FORM });
        setErrors({});
    }, []);

    // ─── SUBMIT ──────────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        if (!validate()) return;
        const mode = formData.mode;
        const payload = {
            code: formData.code.trim(),
            name: formData.name.trim(),
            unit: formData.unit.trim(),
            mode,
            status: formData.status,
            totalQuantity: formData.totalQuantity,
            availableQuantity: formData.availableQuantity,
            rentPrice: mode === 'sell' ? 0 : formData.rentPrice,
            salePrice: mode === 'rent' ? 0 : formData.salePrice,
            description: formData.description.trim(),
            image: formData.image.trim(),
        };

        try {
            setSubmitLoading(true);
            if (editing) {
                await api.patch(`/equipments/${editing._id}`, payload);
                toast.success('Đã cập nhật thiết bị thành công!');
            } else {
                await api.post('/equipments', payload);
                toast.success('Đã thêm thiết bị mới thành công!');
            }
            handleModalCancel();
            fetchEquipments();
        } catch (err: any) {
            const apiErr = err?.response?.data;
            if (apiErr?.errors?.length) {
                toast.error(apiErr.errors[0].message);
            } else {
                toast.error(apiErr?.message || 'Lưu thiết bị thất bại!');
            }
        } finally {
            setSubmitLoading(false);
        }
    }, [validate, formData, editing, handleModalCancel, fetchEquipments]);

    // ─── DELETE ──────────────────────────────────────────
    const handleDelete = useCallback(async () => {
        if (!deleteTarget) return;
        try {
            setDeleteLoading(true);
            await api.delete(`/equipments/${deleteTarget._id}`);
            toast.success('Đã xóa thiết bị thành công!');
            setDeleteTarget(null);
            fetchEquipments();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Xóa thiết bị thất bại!');
        } finally {
            setDeleteLoading(false);
        }
    }, [deleteTarget, fetchEquipments]);

    // ─── RENDER ──────────────────────────────────────────
    return (
        <TooltipProvider>
            <div className="relative min-h-screen px-4 pb-16 md:px-6 lg:px-8 max-w-7xl mx-auto text-left space-y-6">

                {/* ─── Header ─── */}
                <div className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Quản lý thiết bị
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Quản lý tồn kho và cấu hình giá thuê / bán thiết bị
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={fetchEquipments}
                                    disabled={loading}
                                    className="h-10 w-10 rounded-xl"
                                >
                                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Làm mới danh sách</TooltipContent>
                        </Tooltip>
                        <Button onClick={openCreateModal} className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/10 flex items-center gap-1.5">
                            <Plus className="h-4 w-4" />
                            Thêm thiết bị
                        </Button>
                    </div>
                </div>

                {/* ─── Stats Grid ─── */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        label="Tổng thiết bị"
                        value={stats.total}
                        icon={Package}
                        accentClass="bg-slate-500/10 text-slate-600 dark:text-slate-300"
                    />
                    <StatCard
                        label="Còn hàng"
                        value={stats.inStock}
                        icon={CheckCircle2}
                        accentClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    />
                    <StatCard
                        label="Sắp hết hàng"
                        value={stats.lowStock}
                        icon={AlertTriangle}
                        accentClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    />
                    <StatCard
                        label="Hết hàng"
                        value={stats.outOfStock}
                        icon={XCircle}
                        accentClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    />
                </div>

                {/* ─── Search ─── */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
                        <Input
                            id="equipment-search"
                            placeholder="Tìm kiếm theo tên hoặc mã thiết bị..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-9 h-10 w-full bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-indigo-400"
                        />
                        {search && (
                            <button
                                onClick={() => handleSearchChange('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* ─── VIEW RENDER: MOBILE CARDS vs DESKTOP TABLE ─── */}
                <div>
                    {loading && equipments.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground text-xs font-semibold flex flex-col items-center justify-center gap-2 border border-border/60 rounded-xl bg-card">
                            <Loader2 className="animate-spin text-indigo-500" size={24} />
                            <span>Đang tải dữ liệu thiết bị...</span>
                        </div>
                    ) : filteredEquipments.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center border border-dashed rounded-xl bg-card">
                            <Box size={32} className="opacity-20 mb-2" />
                            <p className="text-sm font-semibold">
                                {search ? 'Không tìm thấy thiết bị nào' : 'Chưa có thiết bị nào trong kho'}
                            </p>
                            <p className="text-[11px] opacity-75 mt-0.5">
                                {search ? 'Thử tìm kiếm với từ khóa khác' : 'Bấm nút "Thêm thiết bị" ở trên để tạo mới'}
                            </p>
                        </div>
                    ) : (
                        <Card className="border border-border/80 shadow-xs rounded-xl overflow-hidden p-0 bg-card">
                            
                            {/* 1. Mobile card view (<md) */}
                            <div className="block md:hidden divide-y divide-border/60">
                                {paginatedEquipments.map((e) => {
                                    const used = Math.max(0, (e.totalQuantity || 0) - (e.availableQuantity || 0));
                                    const percent = e.totalQuantity > 0 ? Math.round(((e.availableQuantity || 0) / e.totalQuantity) * 100) : 0;
                                    const isLowStock = e.status === 'in_stock' && e.availableQuantity <= 5 && e.availableQuantity > 0;
                                    const statusConfig = STATUS_CONFIGS[e.status];
                                    const StatusIcon = statusConfig.icon;

                                    return (
                                        <div key={e._id} className="p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <code className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono font-bold text-foreground">
                                                        {e.code}
                                                    </code>
                                                    <Badge variant="outline" className={cn('text-[10px] font-bold border', MODE_COLORS[e.mode])}>
                                                        {MODE_LABELS[e.mode]}
                                                    </Badge>
                                                </div>
                                                <Badge variant="outline" className={cn('text-[10px] font-bold border gap-1', statusConfig.color)}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {STATUS_LABELS[e.status]}
                                                </Badge>
                                            </div>

                                            <div>
                                                <h3 className="font-bold text-foreground text-sm leading-snug">{e.name}</h3>
                                                <p className="text-xs text-muted-foreground mt-0.5">Đơn vị: <span className="font-medium text-foreground">{e.unit}</span></p>
                                                {e.description && (
                                                    <p className="text-xs text-muted-foreground/80 mt-1 italic line-clamp-2">{e.description}</p>
                                                )}
                                            </div>

                                            {/* Stock progress */}
                                            <div className="bg-muted/20 p-2.5 rounded-lg border border-border/40 space-y-1.5">
                                                <div className="flex items-center justify-between text-xs font-semibold">
                                                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Tồn kho</span>
                                                    <span className="font-mono">
                                                        <span className={cn('font-bold', isLowStock ? 'text-amber-500' : 'text-foreground')}>{e.availableQuantity}</span>
                                                        <span className="text-muted-foreground mx-1">/</span>
                                                        <span className="text-muted-foreground">{e.totalQuantity} {e.unit} ({percent}%)</span>
                                                    </span>
                                                </div>
                                                <Progress
                                                    value={percent}
                                                    className={cn('h-1.5 w-full', isLowStock ? '[&>[data-slot=progress-indicator]]:bg-amber-500' : '[&>[data-slot=progress-indicator]]:bg-emerald-500')}
                                                />
                                                <div className="text-[10px] text-muted-foreground font-medium text-right">Đang cho thuê/dùng: {used}</div>
                                            </div>

                                            {/* Pricing info */}
                                            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Giá thuê</span>
                                                    {(e.mode === 'rent' || e.mode === 'both') && e.rentPrice ? (
                                                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                            {e.rentPrice.toLocaleString('vi-VN')} đ
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-muted-foreground/50 italic">Chưa thuê</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col text-right">
                                                    <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Giá bán</span>
                                                    {(e.mode === 'sell' || e.mode === 'both') && e.salePrice ? (
                                                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                                            {e.salePrice.toLocaleString('vi-VN')} đ
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-muted-foreground/50 italic">Chưa bán</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions Footer */}
                                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openEditModal(e)}
                                                    className="h-8 px-3 text-xs font-semibold gap-1 rounded-lg"
                                                >
                                                    <Pencil size={13} /> Chỉnh sửa
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setDeleteTarget(e)}
                                                    className="h-8 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 hover:text-rose-600 gap-1 rounded-lg"
                                                >
                                                    <Trash2 size={13} /> Xóa
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 2. Desktop table view (>=md) */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/30 border-b border-border/60">
                                        <TableRow>
                                            <TableHead className="w-[110px] text-[10px] font-bold uppercase tracking-wider">Mã</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-wider">Tên thiết bị</TableHead>
                                            <TableHead className="text-center text-[10px] font-bold uppercase tracking-wider">Loại</TableHead>
                                            <TableHead className="text-center text-[10px] font-bold uppercase tracking-wider">Trạng thái</TableHead>
                                            <TableHead className="text-center text-[10px] font-bold uppercase tracking-wider">Tồn kho</TableHead>
                                            <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider">Giá thuê</TableHead>
                                            <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider">Giá bán</TableHead>
                                            <TableHead className="text-center w-[100px] text-[10px] font-bold uppercase tracking-wider pr-6">Thao tác</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedEquipments.map((e) => {
                                            const used = Math.max(0, (e.totalQuantity || 0) - (e.availableQuantity || 0));
                                            const percent = e.totalQuantity > 0
                                                ? Math.round(((e.availableQuantity || 0) / e.totalQuantity) * 100)
                                                : 0;
                                            const isLowStock = e.status === 'in_stock' && e.availableQuantity <= 5 && e.availableQuantity > 0;
                                            const statusConfig = STATUS_CONFIGS[e.status];
                                            const StatusIcon = statusConfig.icon;

                                            return (
                                                <TableRow key={e._id} className="hover:bg-muted/10">
                                                    {/* Code */}
                                                    <TableCell>
                                                        <code className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono font-bold text-foreground">
                                                            {e.code}
                                                        </code>
                                                    </TableCell>

                                                    {/* Name */}
                                                    <TableCell>
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-10 h-10 rounded-lg border border-border/60 bg-muted/30 shrink-0 overflow-hidden flex items-center justify-center">
                                                                {e.image ? (
                                                                    <img src={e.image} alt={e.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <Package className="w-5 h-5 text-muted-foreground/40" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-xs text-foreground truncate">{e.name}</p>
                                                                <p className="text-[10px] text-muted-foreground capitalize">Đơn vị: {e.unit}</p>
                                                                {e.description && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground/70 cursor-help italic">
                                                                                <FileText className="h-3 w-3 shrink-0" />
                                                                                <span className="truncate max-w-[180px]">{e.description}</span>
                                                                            </p>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="bottom" className="max-w-xs">
                                                                            {e.description}
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    {/* Mode */}
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className={cn('text-[10px] font-bold border', MODE_COLORS[e.mode])}>
                                                            {MODE_LABELS[e.mode]}
                                                        </Badge>
                                                    </TableCell>

                                                    {/* Status */}
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className={cn('text-[10px] font-bold border gap-1', statusConfig.color)}>
                                                            <StatusIcon className="h-3 w-3" />
                                                            {STATUS_LABELS[e.status]}
                                                        </Badge>
                                                    </TableCell>

                                                    {/* Stock */}
                                                    <TableCell>
                                                        <div className="flex flex-col items-center gap-1 min-w-[130px]">
                                                            <div className="flex items-center justify-between text-xs w-full font-semibold">
                                                                <span className="text-muted-foreground text-[10px] font-mono">
                                                                    <span className={cn('font-bold', isLowStock ? 'text-amber-500' : 'text-foreground')}>{e.availableQuantity}</span>
                                                                    <span className="mx-0.5 text-muted-foreground">/</span>
                                                                    <span>{e.totalQuantity}</span>
                                                                </span>
                                                                <span className={cn('font-bold text-[10px] font-mono', isLowStock ? 'text-amber-500' : 'text-muted-foreground')}>
                                                                    {percent}%
                                                                </span>
                                                            </div>
                                                            <Progress
                                                                value={percent}
                                                                className={cn('h-1.5 w-full', isLowStock ? '[&>[data-slot=progress-indicator]]:bg-amber-500' : '[&>[data-slot=progress-indicator]]:bg-emerald-500')}
                                                            />
                                                            <span className="text-[9px] text-muted-foreground/60">
                                                                Đang dùng: {used}
                                                            </span>
                                                        </div>
                                                    </TableCell>

                                                    {/* Rent Price */}
                                                    <TableCell className="text-right">
                                                        {(e.mode === 'rent' || e.mode === 'both') && e.rentPrice ? (
                                                            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-xs">
                                                                {e.rentPrice.toLocaleString('vi-VN')} <span className="text-[9px] text-muted-foreground font-semibold">đ</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-muted-foreground/50 italic">Chưa thuê</span>
                                                        )}
                                                    </TableCell>

                                                    {/* Sale Price */}
                                                    <TableCell className="text-right">
                                                        {(e.mode === 'sell' || e.mode === 'both') && e.salePrice ? (
                                                            <span className="font-bold font-mono text-amber-600 dark:text-amber-400 text-xs">
                                                                {e.salePrice.toLocaleString('vi-VN')} <span className="text-[9px] text-muted-foreground font-semibold">đ</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-muted-foreground/50 italic">Chưa bán</span>
                                                        )}
                                                    </TableCell>

                                                    {/* Actions */}
                                                    <TableCell className="text-center pr-6">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openEditModal(e)}
                                                                className="h-8 w-8 text-muted-foreground hover:bg-muted"
                                                                title="Chỉnh sửa"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setDeleteTarget(e)}
                                                                className="h-8 w-8 text-rose-600 hover:bg-rose-500/5"
                                                                title="Xóa"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination footer */}
                            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10 text-[11px] font-semibold text-muted-foreground">
                                <span>
                                    Hiển thị {Math.min(totalItems, (currentPage - 1) * pageSize + 1)}-{Math.min(totalItems, currentPage * pageSize)} trong {totalItems} thiết bị
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
                    )}
                </div>

                {/* ─── Modals ─── */}
                <FormDialog
                    open={modalOpen}
                    editing={editing}
                    formData={formData}
                    errors={errors}
                    submitLoading={submitLoading}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    onCancel={handleModalCancel}
                />

                <DeleteDialog
                    open={!!deleteTarget}
                    name={deleteTarget?.name || ''}
                    loading={deleteLoading}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            </div>
        </TooltipProvider>
    );
};

export default EquipmentList;
