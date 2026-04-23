import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Form,
    Input,
    Select,
    InputNumber,
    Upload,
    message,
    Image,
    Skeleton,
} from 'antd';
import {
    ArrowLeft,
    Shield,
    MapPin,
    Zap,
    DollarSign,
    Upload as UploadIcon,
    Save,
    RotateCcw,
    X,
    Wifi,
    Car,
    ShowerHead,
    Crown,
    ImageIcon,
    FileText,
    Layers,
    Tag,
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { motion } from 'framer-motion';
import api from '../../../common/utils/api.ts';

const { Option } = Select;



const CourtUpdate: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [courtName, setCourtName] = useState('');
    const [displayBasePrice, setDisplayBasePrice] = useState('');
    const [displayPeakPrice, setDisplayPeakPrice] = useState('');

    const formatPrice = (n: number) => n.toLocaleString('vi-VN');

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get(`/courts/${id}`);
                const court = res.data.data;
                form.setFieldsValue({
                    ...court,
                    amenities: court.amenities?.join(', '),
                });
                setCourtName(court.name || '');
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

    const handleSubmit = async () => {
        try {
            setSaving(true);
            const values = await form.validateFields();
            const formData = new FormData();

            if (values.amenities) {
                values.amenities
                    .split(',')
                    .map((a: string) => a.trim())
                    .filter(Boolean)
                    .forEach((a: string) => formData.append('amenities', a));
            }

            Object.entries(values).forEach(([k, v]) => {
                if (k !== 'amenities') formData.append(k, String(v));
            });

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
            message.error(err.response?.data?.message || 'Lỗi khi cập nhật!');
        } finally {
            setSaving(false);
        }
    };

    if (loading)
        return (
            <div className="max-w-5xl mx-auto p-6">
                <div className="bg-white dark:bg-slate-900 rounded-4xl p-12 border border-slate-100 dark:border-white/5">
                    <Skeleton active paragraph={{ rows: 12 }} />
                </div>
            </div>
        );

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-5xl mx-auto px-4 pb-16 pt-4"
        >
            {/* Premium Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/admin/courts')}
                    className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors mb-6 group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    Quay lại danh sách sân
                </button>
                
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-linear-to-br from-indigo-500 to-violet-600 rounded-[20px] shadow-2xl shadow-indigo-500/30 border border-white/20">
                        <Shield size={28} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-none">
                            Chỉnh sửa sân bóng
                        </h1>
                        <p className="text-slate-400 dark:text-slate-500 font-semibold mt-1 text-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0"></span>
                            {courtName || 'Đang tải...'}
                        </p>
                    </div>
                </div>
            </div>

            <Form
                form={form}
                layout='vertical'
                initialValues={{ type: 'indoor', status: 'active' }}
                onFinish={handleSubmit}
                requiredMark={false}
                validateMessages={{ required: '' }}
            >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Main Info */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Thông tin cơ bản */}
                        <div className="bg-white dark:bg-slate-900 rounded-4xl border border-slate-100 dark:border-white/5 p-8 shadow-sm transition-colors">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase flex items-center gap-3 mb-8">
                                <div className="w-1.5 h-7 bg-indigo-500 rounded-full"></div>
                                Thông tin cơ bản
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <Form.Item name='code' label={<span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Tag size={12} />Mã sân</span>} rules={[{ required: true }]}>
                                    <Input placeholder='VD: S001' className="court-input" />
                                </Form.Item>
                                <Form.Item name='name' label={<span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Shield size={12} />Tên sân</span>} rules={[{ required: true }]}>
                                    <Input placeholder='VD: Sân Mira A1' className="court-input" />
                                </Form.Item>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                                <Form.Item name='type' label={<span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Loại sân</span>} rules={[{ required: true }]}>
                                    <Select className="court-select" popupClassName="court-dropdown">
                                        <Option value='indoor'>🏠 Trong nhà</Option>
                                        <Option value='outdoor'>🌤️ Ngoài trời</Option>
                                        <Option value='vip'>✨ VIP</Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item name='status' label={<span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Trạng thái</span>}>
                                    <Select className="court-select" popupClassName="court-dropdown">
                                        <Option value='active'>Hoạt động</Option>
                                        <Option value='maintenance'>🛠️ Bảo trì</Option>
                                        <Option value='locked'>🔒 Tạm ngưng</Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item name='location' label={<span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1"><MapPin size={11} />Vị trí</span>} rules={[{ required: true, message: 'Nhập vị trí' }]} className="col-span-2">
                                    <Input placeholder='VD: Quận 7, TP.HCM' className="court-input" />
                                </Form.Item>
                            </div>

                            <Form.Item name='formats' label={<span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Layers size={12} />Định dạng sân</span>} rules={[{ required: true, message: 'Chọn định dạng' }]} className="mt-2">
                                <Select mode='multiple' placeholder='Chọn 5v5, 7v7, 9v9...' allowClear className="court-select" popupClassName="court-dropdown">
                                    <Option value='5v5'>⚽ 5v5</Option>
                                    <Option value='7v7'>⚽ 7v7</Option>
                                    <Option value='9v9'>⚽ 9v9</Option>
                                    <Option value='11v11'>⚽ 11v11</Option>
                                </Select>
                            </Form.Item>
                        </div>

                        {/* Mô tả & Tiện ích */}
                        <div className="bg-white dark:bg-slate-900 rounded-4xl border border-slate-100 dark:border-white/5 p-8 shadow-sm transition-colors">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase flex items-center gap-3 mb-8">
                                <div className="w-1.5 h-7 bg-emerald-500 rounded-full"></div>
                                Mô tả & Tiện ích
                            </h3>

                            <Form.Item name='description' label={<span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><FileText size={12} />Mô tả chi tiết</span>}>
                                <Input.TextArea rows={4} placeholder='Viết mô tả hấp dẫn về sân bóng của bạn...' className="court-textarea" />
                            </Form.Item>

                            <Form.Item name='amenities' label={<span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Wifi size={12} />Tiện ích (phân cách bằng dấu phẩy)</span>}>
                                <Input placeholder='VD: Wifi, Đỗ xe, Nhà tắm, Nước uống' className="court-input" />
                            </Form.Item>

                            <div className="grid grid-cols-4 gap-3 mt-4">
                                {[
                                    { icon: <Wifi size={16} />, label: 'Wifi' },
                                    { icon: <Car size={16} />, label: 'Đỗ xe' },
                                    { icon: <ShowerHead size={16} />, label: 'Phòng tắm' },
                                    { icon: <Crown size={16} />, label: 'VIP Lounge' },
                                ].map((item, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 cursor-default hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-500/20 transition-all text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400">
                                        {item.icon}
                                        <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Hình ảnh */}
                        <div className="bg-white dark:bg-slate-900 rounded-4xl border border-slate-100 dark:border-white/5 p-8 shadow-sm transition-colors">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase flex items-center gap-3 mb-8">
                                <div className="w-1.5 h-7 bg-violet-500 rounded-full"></div>
                                Thư viện ảnh
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-white/5 px-2 py-0.5 rounded-full ml-auto">{fileList.length}/10 ảnh</span>
                            </h3>

                            <Upload
                                listType='picture-card'
                                fileList={fileList}
                                beforeUpload={() => false}
                                onChange={({ fileList }) => setFileList(fileList)}
                                onRemove={(file) =>
                                    setFileList((prev) => prev.filter((f) => f.uid !== file.uid))
                                }
                                accept='image/*'
                                multiple
                                className="court-upload"
                            >
                                {fileList.length < 10 && (
                                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400 group-hover:text-indigo-500 transition-colors">
                                        <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/20 transition-colors">
                                            <UploadIcon size={24} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-wider">Tải ảnh lên</span>
                                    </div>
                                )}
                            </Upload>

                            {fileList.length > 0 && (
                                <div className="mt-6">
                                    <Image.PreviewGroup>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                            {fileList.map((f, i) => (
                                                <div key={i} className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-white/5 shadow-sm hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all">
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
                        </div>
                    </div>

                    {/* Right Column: Pricing & Preview */}
                    <div className="space-y-8">
                        {/* Bảng giá */}
                        <div className="bg-white dark:bg-slate-900 rounded-4xl border border-slate-100 dark:border-white/5 p-8 shadow-sm transition-colors">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase flex items-center gap-3 mb-8">
                                <div className="w-1.5 h-7 bg-amber-500 rounded-full"></div>
                                Bảng giá
                            </h3>

                            <div className="space-y-6">
                                {/* Giờ thường */}
                                <div className="bg-linear-to-br from-emerald-500 to-emerald-700 rounded-3xl p-6 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <DollarSign size={80} />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="px-2.5 py-1 bg-white/20 rounded-lg text-[9px] font-black uppercase backdrop-blur-sm">Giờ thường</div>
                                        </div>
                                        <Form.Item name='basePrice' rules={[{ required: true }]} className="mb-0" hidden>
                                            <InputNumber />
                                        </Form.Item>
                                        <div className="flex items-baseline gap-2">
                                            <input
                                                type="text"
                                                value={displayBasePrice}
                                                onChange={(e) => {
                                                    const raw = e.target.value.replace(/[^\d]/g, '');
                                                    const num = raw ? Number(raw) : undefined;
                                                    form.setFieldsValue({ basePrice: num });
                                                    setDisplayBasePrice(num ? formatPrice(num) : '');
                                                }}
                                                placeholder="500,000"
                                                className="bg-transparent border-none outline-none text-white font-black text-3xl w-full placeholder:text-white/30"
                                                style={{ background: 'transparent' }}
                                            />
                                            <span className="text-white/40 font-bold text-sm shrink-0">VNĐ</span>
                                        </div>
                                        <div className="h-0.5 bg-white/20 mt-2 rounded-full"></div>
                                    </div>
                                </div>

                                {/* Giờ cao điểm */}
                                <div className="bg-linear-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Zap size={80} />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="px-2.5 py-1 bg-white/20 rounded-lg text-[9px] font-black uppercase backdrop-blur-sm">Giờ cao điểm</div>
                                        </div>
                                        <Form.Item name='peakPrice' rules={[{ required: true }]} className="mb-0" hidden>
                                            <InputNumber />
                                        </Form.Item>
                                        <div className="flex items-baseline gap-2">
                                            <input
                                                type="text"
                                                value={displayPeakPrice}
                                                onChange={(e) => {
                                                    const raw = e.target.value.replace(/[^\d]/g, '');
                                                    const num = raw ? Number(raw) : undefined;
                                                    form.setFieldsValue({ peakPrice: num });
                                                    setDisplayPeakPrice(num ? formatPrice(num) : '');
                                                }}
                                                placeholder="800,000"
                                                className="bg-transparent border-none outline-none text-white font-black text-3xl w-full placeholder:text-white/30"
                                                style={{ background: 'transparent' }}
                                            />
                                            <span className="text-white/40 font-bold text-sm shrink-0">VNĐ</span>
                                        </div>
                                        <div className="h-0.5 bg-white/20 mt-2 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="bg-white dark:bg-slate-900 rounded-4xl border border-slate-100 dark:border-white/5 shadow-sm transition-colors overflow-hidden">
                            <div className="p-6">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-linear-to-r from-indigo-500 to-violet-600 text-white rounded-2xl font-black text-sm hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.98] transition-all disabled:opacity-50 border border-white/20"
                                >
                                    <Save size={20} />
                                    {saving ? 'ĐANG LƯU...' : 'LƯU CẬP NHẬT'}
                                </button>
                            </div>
                            <div className="border-t border-slate-100 dark:border-white/5 p-4 flex gap-3 bg-slate-50/50 dark:bg-white/2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        form.resetFields();
                                        message.info('Form đã được làm mới');
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-slate-500 dark:text-slate-400 rounded-xl font-bold text-xs uppercase hover:bg-white dark:hover:bg-white/5 transition-all active:scale-95"
                                >
                                    <RotateCcw size={14} />
                                    Làm mới
                                </button>
                                <div className="w-px bg-slate-200 dark:bg-white/10"></div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/admin/courts')}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-slate-500 dark:text-slate-400 rounded-xl font-bold text-xs uppercase hover:text-rose-500 hover:bg-white dark:hover:bg-white/5 dark:hover:text-rose-400 transition-all active:scale-95"
                                >
                                    <X size={14} />
                                    Hủy bỏ
                                </button>
                            </div>
                        </div>

                        {/* Tips */}
                        <div className="bg-indigo-50/50 dark:bg-indigo-500/5 rounded-4xl border border-indigo-100 dark:border-indigo-500/10 p-6">
                            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ImageIcon size={12} />
                                Mẹo tối ưu
                            </h4>
                            <ul className="space-y-3 text-xs font-medium text-indigo-400 dark:text-indigo-300/70">
                                <li className="flex items-start gap-2">
                                    <span className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 shrink-0"></span>
                                    Tải ảnh chất lượng cao (min 1280px) để hiển thị đẹp
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 shrink-0"></span>
                                    Mô tả chi tiết giúp khách hàng dễ quyết định hơn
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 shrink-0"></span>
                                    Liệt kê đầy đủ tiện ích để tăng giá trị sân
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </Form>

            <style>{`
                .court-input.ant-input, .court-textarea.ant-input {
                    border-radius: 14px !important; border: 2px solid #f1f5f9 !important;
                    padding: 12px 16px !important; background: #f8fafc !important;
                    font-weight: 600 !important; font-size: 14px !important; transition: all 0.2s !important;
                }
                .court-input.ant-input:focus, .court-textarea.ant-input:focus {
                    border-color: #6366f1 !important; background: #fff !important;
                    box-shadow: 0 0 0 4px rgba(99,102,241,0.08) !important;
                }
                .dark .court-input.ant-input, .dark .court-textarea.ant-input {
                    background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.08) !important;
                    color: #f1f5f9 !important;
                }
                .dark .court-input.ant-input:focus, .dark .court-textarea.ant-input:focus {
                    border-color: #818cf8 !important; background: rgba(255,255,255,0.08) !important;
                    box-shadow: 0 0 0 4px rgba(129,140,248,0.1) !important;
                }

                .court-select .ant-select-selector {
                    border-radius: 14px !important; border: 2px solid #f1f5f9 !important;
                    padding: 4px 12px !important; background: #f8fafc !important;
                    font-weight: 600 !important; height: 44px !important;
                    align-items: center !important; transition: all 0.2s !important;
                }
                .court-select.ant-select-focused .ant-select-selector {
                    border-color: #6366f1 !important;
                    box-shadow: 0 0 0 4px rgba(99,102,241,0.08) !important;
                }
                .dark .court-select .ant-select-selector {
                    background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.08) !important;
                    color: #f1f5f9 !important;
                }
                .court-dropdown { border-radius: 16px !important; padding: 4px !important; }

                .court-price-input.ant-input-number {
                    width: 100% !important; background: transparent !important;
                    border: none !important; border-bottom: 2px solid rgba(255,255,255,0.3) !important;
                    border-radius: 0 !important; padding: 0 !important;
                    box-shadow: none !important;
                }
                .court-price-input .ant-input-number-input-wrap,
                .court-price-input .ant-input-number-input-wrap input {
                    background: transparent !important;
                }
                .court-price-input .ant-input-number-input {
                    color: #fff !important; font-weight: 900 !important; font-size: 32px !important;
                    padding: 8px 0 !important; height: auto !important;
                    text-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    background: transparent !important;
                }
                .court-price-input .ant-input-number-input::placeholder {
                    color: rgba(255,255,255,0.4) !important; font-size: 28px !important;
                }
                .court-price-input.ant-input-number:hover,
                .court-price-input.ant-input-number-focused {
                    border-bottom-color: rgba(255,255,255,0.6) !important;
                    box-shadow: none !important;
                }
                .court-price-input .ant-input-number-handler-wrap { display: none !important; }
                .court-price-input .ant-input-number-suffix { color: rgba(255,255,255,0.5) !important; font-size: 14px !important; }
                /* Kill ALL dark backgrounds inside price input */
                .court-price-input, .court-price-input * {
                    background-color: transparent !important;
                }

                .court-upload .ant-upload-list-item-container,
                .court-upload .ant-upload-select {
                    width: 110px !important; height: 110px !important;
                    border-radius: 20px !important; border: 2px dashed #e2e8f0 !important;
                    transition: all 0.2s !important;
                }
                .court-upload .ant-upload-select:hover { border-color: #6366f1 !important; }
                .dark .court-upload .ant-upload-select { border-color: rgba(255,255,255,0.1) !important; }
                .dark .court-upload .ant-upload-select:hover { border-color: #818cf8 !important; }

                .ant-form-item-label > label { margin-bottom: 6px !important; }
            `}</style>
        </motion.div>
    );
};

export default CourtUpdate;
