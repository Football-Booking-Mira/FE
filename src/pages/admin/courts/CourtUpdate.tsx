import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Upload,
    message,
    Image,
    Spin,
} from 'antd';
import {
    ArrowLeft,
    Shield,
    MapPin,
    Zap,
    Upload as UploadIcon,
    Save,
    RotateCcw,
    X,
    Wifi,
    Car,
    ShowerHead,
    Crown,
    FileText,
    Layers,
    Tag,
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { motion } from 'framer-motion';
import api from '../../../common/utils/api.ts';

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const CourtUpdate: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [fileList, setFileList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [courtName, setCourtName] = useState('');

    // Controlled inputs state
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [type, setType] = useState<'indoor' | 'outdoor' | 'vip'>('indoor');
    const [status, setStatus] = useState<'active' | 'maintenance' | 'locked'>('active');
    const [formats, setFormats] = useState<string[]>([]);
    const [basePrice, setBasePrice] = useState<number | ''>('');
    const [peakPrice, setPeakPrice] = useState<number | ''>('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [amenities, setAmenities] = useState('');

    // Formatted price displays
    const [displayBasePrice, setDisplayBasePrice] = useState('');
    const [displayPeakPrice, setDisplayPeakPrice] = useState('');
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const formatPrice = (n: number) => n.toLocaleString('vi-VN');

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get(`/courts/${id}`);
                const court = res.data.data;
                
                setCourtName(court.name || '');
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
                setLocation(court.location || '');
                setDescription(court.description || '');
                setAmenities(court.amenities?.join(', ') || '');
                
                if (court.basePrice) setDisplayBasePrice(formatPrice(court.basePrice));
                if (court.peakPrice) setDisplayPeakPrice(formatPrice(court.peakPrice));
                
                setFileList(
                    court.images?.map((url: string, i: number) => ({
                        uid: String(i),
                        name: `image-${i}`,
                        url,
                        status: 'done',
                    })) || []
                );
            } catch {
                message.error('Không thể tải dữ liệu sân!');
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validations
        const errors: Record<string, string> = {};
        if (!code.trim()) errors.code = 'Mã sân là bắt buộc!';
        if (!name.trim()) errors.name = 'Tên sân là bắt buộc!';
        if (!location.trim()) errors.location = 'Vị trí là bắt buộc!';
        if (basePrice === '' || Number(basePrice) <= 0) errors.basePrice = 'Giá thường không hợp lệ!';
        if (peakPrice === '' || Number(peakPrice) <= 0) errors.peakPrice = 'Giá cao điểm không hợp lệ!';
        if (formats.length === 0) errors.formats = 'Chọn ít nhất 1 định dạng!';

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            message.error('Vui lòng kiểm tra lại các thông tin bắt buộc!');
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

            const keptImages = fileList.filter((f) => !f.originFileObj && f.url).map((f) => f.url);
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

            await api.patch(`/courts/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            message.success('Cập nhật sân thành công!');
            navigate('/admin/courts');
        } catch (err: any) {
            message.error(err.response?.data?.message || err.message || 'Lỗi khi cập nhật!');
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        // Reset to original values from fetched court Name
        message.info('Form đã được làm mới');
        navigate(0); // Quick refresh state reload
    };

    if (loading)
        return (
            <div className="max-w-5xl mx-auto p-8 flex justify-center items-center h-[50vh]">
                <Spin tip="Đang tải dữ liệu sân bóng..." size="large" />
            </div>
        );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-5xl mx-auto px-6 pb-16 pt-4 space-y-6"
        >
            {/* Header */}
            <div>
                <button
                    onClick={() => navigate('/admin/courts')}
                    className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-4 group uppercase tracking-wider"
                >
                    <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                    Quay lại danh sách sân
                </button>
                
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">
                        Chỉnh sửa cấu hình sân bóng
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {courtName || 'Đang tải cấu hình...'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Main Info */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Thông tin cơ bản */}
                        <Card className="rounded-xl border-border/80 shadow-xs">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-sm font-bold text-foreground uppercase flex items-center gap-2">
                                    <div className="w-1 h-4 bg-emerald-600 rounded-full"></div>
                                    Thông tin cơ bản
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="code" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                            <Tag size={12} />Mã sân <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="code"
                                            placeholder="VD: S001"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value)}
                                            className={formErrors.code ? 'border-destructive' : ''}
                                        />
                                        {formErrors.code && <p className="text-[10px] font-medium text-destructive">{formErrors.code}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                            <Shield size={12} />Tên sân <span className="text-destructive">*</span>
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

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Loại sân</Label>
                                        <Select value={type} onValueChange={(val: any) => setType(val)}>
                                            <SelectTrigger className="w-full h-10">
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
                                            <SelectTrigger className="w-full h-10">
                                                <SelectValue placeholder="Trạng thái" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">Khai thác</SelectItem>
                                                <SelectItem value="maintenance">Bảo trì</SelectItem>
                                                <SelectItem value="locked">Tạm ngưng</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5 col-span-2">
                                        <Label htmlFor="location" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <MapPin size={11} />Vị trí <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="location"
                                            placeholder="VD: Quận 7, TP.HCM"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            className={`h-10 ${formErrors.location ? 'border-destructive' : ''}`}
                                        />
                                        {formErrors.location && <p className="text-[10px] font-medium text-destructive">{formErrors.location}</p>}
                                    </div>
                                </div>

                                <div className="space-y-1.5 pt-1">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <Layers size={12} />Định dạng sân <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="flex gap-2">
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
                            </CardContent>
                        </Card>

                        {/* Mô tả & Tiện ích */}
                        <Card className="rounded-xl border-border/80 shadow-xs">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-sm font-bold text-foreground uppercase flex items-center gap-2">
                                    <div className="w-1 h-4 bg-emerald-600 rounded-full"></div>
                                    Mô tả & Tiện ích
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <FileText size={12} />Mô tả chi tiết
                                    </Label>
                                    <textarea
                                        id="description"
                                        rows={4}
                                        placeholder="Viết mô tả hấp dẫn giới thiệu chất lượng sân của bạn..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="flex min-h-[90px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="amenities" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        Wifi, Nước uống, Đỗ xe... (phân cách bằng dấu phẩy)
                                    </Label>
                                    <Input
                                        id="amenities"
                                        placeholder="VD: Wifi, Đỗ xe, Nhà tắm, Nước uống"
                                        value={amenities}
                                        onChange={(e) => setAmenities(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-4 gap-2 pt-2">
                                    {[
                                        { icon: <Wifi size={15} />, label: 'Wifi' },
                                        { icon: <Car size={15} />, label: 'Đỗ xe' },
                                        { icon: <ShowerHead size={15} />, label: 'Phòng tắm' },
                                        { icon: <Crown size={15} />, label: 'VIP Lounge' },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex flex-col items-center gap-1 p-2 bg-muted/40 rounded-lg border border-border cursor-default hover:bg-emerald-50 dark:hover:bg-emerald-500/5 hover:border-emerald-200 transition-colors text-muted-foreground hover:text-emerald-600">
                                            {item.icon}
                                            <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Hình ảnh */}
                        <Card className="rounded-xl border-border/80 shadow-xs">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-sm font-bold text-foreground uppercase flex items-center gap-2">
                                    <div className="w-1 h-4 bg-emerald-600 rounded-full"></div>
                                    Thư viện ảnh
                                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md ml-auto">{fileList.length}/10 ảnh</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-4 border border-dashed border-border rounded-xl bg-muted/20">
                                    <Upload
                                        listType="picture-card"
                                        fileList={fileList}
                                        beforeUpload={() => false}
                                        onChange={({ fileList }) => setFileList(fileList)}
                                        onRemove={(file) =>
                                            setFileList((prev) => prev.filter((f) => f.uid !== file.uid))
                                        }
                                        accept="image/*"
                                        multiple
                                        className="court-upload"
                                    >
                                        {fileList.length < 10 && (
                                            <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                                                <UploadIcon size={18} />
                                                <span className="text-[9px] font-bold uppercase tracking-wider">Tải ảnh</span>
                                            </div>
                                        )}
                                    </Upload>
                                </div>

                                {fileList.length > 0 && (
                                    <div className="pt-3">
                                        <Image.PreviewGroup>
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                                {fileList.map((f, i) => (
                                                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border shadow-xs hover:shadow-md transition-shadow bg-muted">
                                                        <Image
                                                            src={f.url || (f.originFileObj ? URL.createObjectURL(f.originFileObj) : '')}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </Image.PreviewGroup>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Pricing & Actions */}
                    <div className="space-y-6">
                        
                        {/* Bảng giá */}
                        <Card className="rounded-xl border-border/80 shadow-xs">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-sm font-bold text-foreground uppercase flex items-center gap-2">
                                    <div className="w-1 h-4 bg-emerald-600 rounded-full"></div>
                                    Khung giá
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Giờ thường */}
                                <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-2">
                                    <Label htmlFor="basePriceInput" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Giờ thường</Label>
                                    <div className="relative">
                                        <Input
                                            id="basePriceInput"
                                            type="text"
                                            value={displayBasePrice}
                                            onChange={(e) => {
                                                const raw = e.target.value.replace(/[^\d]/g, '');
                                                const num = raw ? Number(raw) : '';
                                                setBasePrice(num);
                                                setDisplayBasePrice(num !== '' ? formatPrice(num) : '');
                                            }}
                                            placeholder="500,000"
                                            className="pl-8 text-base font-bold text-foreground h-11"
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">₫</span>
                                    </div>
                                    {formErrors.basePrice && <p className="text-[10px] font-medium text-destructive">{formErrors.basePrice}</p>}
                                </div>

                                {/* Giờ cao điểm */}
                                <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-2">
                                    <Label htmlFor="peakPriceInput" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Giờ cao điểm</Label>
                                    <div className="relative">
                                        <Input
                                            id="peakPriceInput"
                                            type="text"
                                            value={displayPeakPrice}
                                            onChange={(e) => {
                                                const raw = e.target.value.replace(/[^\d]/g, '');
                                                const num = raw ? Number(raw) : '';
                                                setPeakPrice(num);
                                                setDisplayPeakPrice(num !== '' ? formatPrice(num) : '');
                                            }}
                                            placeholder="800,000"
                                            className="pl-8 text-base font-bold text-foreground h-11"
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">₫</span>
                                    </div>
                                    {formErrors.peakPrice && <p className="text-[10px] font-medium text-destructive">{formErrors.peakPrice}</p>}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Action Buttons */}
                        <Card className="rounded-xl border-border/80 shadow-xs overflow-hidden bg-card">
                            <div className="p-4">
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 shadow-xs"
                                >
                                    <Save size={16} />
                                    {saving ? 'Đang lưu cập nhật...' : 'Lưu cập nhật'}
                                </Button>
                            </div>
                            <div className="border-t border-border p-3 flex gap-2 bg-muted/20">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={resetForm}
                                    className="flex-1 h-9 text-xs font-medium text-muted-foreground hover:bg-background hover:text-foreground"
                                >
                                    <RotateCcw size={13} className="mr-1.5" />
                                    Làm mới
                                </Button>
                                <div className="w-px bg-border my-1"></div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => navigate('/admin/courts')}
                                    className="flex-1 h-9 text-xs font-medium text-muted-foreground hover:text-rose-600 hover:bg-background"
                                >
                                    <X size={13} className="mr-1.5" />
                                    Hủy bỏ
                                </Button>
                            </div>
                        </Card>

                        {/* Tips card */}
                        <div className="bg-muted/30 rounded-xl border border-border p-5">
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                                Mẹo tối ưu cấu hình
                            </h4>
                            <ul className="space-y-2.5 text-xs text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                                    Tải ảnh chất lượng cao (tối thiểu 1280px) để hiển thị chi tiết
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                                    Mô tả chi tiết và chính xác giúp gia tăng tỷ lệ đặt sân
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                                    Cập nhật đầy đủ các tiện ích để tối ưu chất lượng dịch vụ
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </form>

            {/* Antd Upload overrides */}
            <style>{`
                .court-upload .ant-upload-list-item-container,
                .court-upload .ant-upload-select {
                    width: 85px !important;
                    height: 85px !important;
                    border-radius: 10px !important;
                    border: 2px dashed var(--border, #e2e8f0) !important;
                    background: transparent !important;
                    transition: border-color 0.15s !important;
                }
                .court-upload .ant-upload-select:hover {
                    border-color: #10b981 !important;
                }
                .dark .court-upload .ant-upload-select {
                    border-color: rgba(255, 255, 255, 0.1) !important;
                }
                .dark .court-upload .ant-upload-select:hover {
                    border-color: #34d399 !important;
                }
                .court-upload .ant-upload-list-item {
                    border-radius: 10px !important;
                    border: 1px solid var(--border, #e2e8f0) !important;
                }
            `}</style>
        </motion.div>
    );
};

export default CourtUpdate;
