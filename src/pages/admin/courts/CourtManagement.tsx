import React, { useEffect, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { useNavigate } from 'react-router-dom';
import {
    Table,
    Modal,
    Form,
    Input,
    Select,
    InputNumber,
    message,
    Upload,
    Image,
    Skeleton,
} from 'antd';
import {
    InfoOutlined,
    CloseOutlined,
} from '@ant-design/icons';
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
    CheckCircle2,
    AlertCircle,
    Lock,
    ChevronLeft,
    ChevronRight,
    Upload as UploadIcon,
    DollarSign,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UploadFile } from 'antd/es/upload/interface';
import api from '../../../common/utils/api.ts';

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

const { Option } = Select;
const TYPE_CONFIG = {
    indoor: { label: 'Trong nhà', icon: <Shield size={10} />, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400' },
    outdoor: { label: 'Ngoài trời', icon: <Waves size={10} />, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400' },
    vip: { label: 'VIP', icon: <Crown size={10} />, color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400' },
};

const STATUS_CONFIG = {
    active: { label: 'Khai thác', color: 'bg-emerald-500 text-white shadow-emerald-500/30' },
    maintenance: { label: 'Bảo trì', color: 'bg-amber-500 text-white shadow-amber-500/30' },
    locked: { label: 'Tạm ngưng', color: 'bg-rose-500 text-white shadow-rose-500/30' },
};

const fmtVND = (n?: number) => (typeof n === 'number' ? `${n.toLocaleString('vi-VN')} ₫` : '—');

const CourtManagement: React.FC = () => {
    const [courts, setCourts] = useState<Court[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false); 
    const [modalOpen, setModalOpen] = useState(false);
    const [detailModal, setDetailModal] = useState(false);
    const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [editingCourt, setEditingCourt] = useState<Court | null>(null);
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState<UploadFile[]>([]);
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
            form.setFieldsValue({
                ...court,
                amenities: court.amenities?.join(', '),
            });
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
            form.resetFields();
            setFileList([]);
        }
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

    const handleSubmit = async (values: any) => {
        try {
            setSaving(true);
            const formData = new FormData();
            if (values.amenities && typeof values.amenities === 'string') {
                values.amenities
                    .split(',')
                    .map((a: string) => a.trim())
                    .filter(Boolean)
                    .forEach((a: string) => formData.append('amenities', a));
            }
            Object.entries(values).forEach(([k, v]) => {
                if (k !== 'amenities' && v !== undefined && v !== null) {
                    formData.append(k, String(v));
                }
            });
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
            form.resetFields();
            setFileList([]);
            setEditingCourt(null);
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Lỗi khi lưu dữ liệu!');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        Modal.confirm({
            centered: true,
            title: 'Khóa sân bóng?',
            content: 'Bạn có chắc chắn muốn khóa sân này? Sân sẽ không hiển thị với người dùng nữa.',
            okText: 'Khóa sân',
            cancelText: 'Hủy',
            okButtonProps: { danger: true },
            async onOk() {
                try {
                    await api.delete(`/courts/${id}`);
                    message.success('Thao tác thành công!');
                    fetchCourts();
                } catch {
                    message.error('Khóa sân thất bại!');
                }
            },
        });
    };

    const columns = [
        { 
            title: 'Sân bóng', 
            key: 'court_info',
            render: (_: any, record: Court) => (
                <div className="flex items-center gap-5 pl-2">
                    <div className="relative group shrink-0">
                        {record.images?.length ? (
                            <div className="w-16 h-16 rounded-[1.25rem] overflow-hidden shadow-lg shadow-black/5 dark:shadow-black/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-indigo-500/20">
                                <Image src={record.images[0]} className="w-full h-full object-cover" preview={{ mask: <div className="text-[10px] font-black uppercase text-white tracking-widest bg-black/60 w-full h-full flex items-center justify-center">XEM</div> }} />
                            </div>
                        ) : (
                            <div className="w-16 h-16 rounded-[1.25rem] bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center border border-slate-200 dark:border-white/5 shadow-inner">
                                <Eye size={20} className="text-slate-300 dark:text-slate-600" />
                            </div>
                        )}
                        {/* Status label floating */}
                        <div className={`absolute -bottom-2 lg:-bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md text-[8px] font-black uppercase shadow-sm tracking-wider whitespace-nowrap border-2 border-white dark:border-card ${STATUS_CONFIG[record.status as keyof typeof STATUS_CONFIG].color}`}>
                            {STATUS_CONFIG[record.status as keyof typeof STATUS_CONFIG].label}
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5 pt-1">
                        <span className="font-black text-slate-800 dark:text-slate-100 text-[15px] leading-none transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-400">{record.name}</span>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-400 uppercase tracking-widest">{record.code}</span>
                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1"><MapPin size={10} className="text-rose-400 shrink-0" /><span className="truncate max-w-[120px] lg:max-w-[200px]">{record.location || 'Chưa cập nhật'}</span></span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: 'Khung giá',
            key: 'prices',
            width: 200,
            render: (_: any, record: Court) => (
                <div className="flex flex-col gap-2 relative z-10">
                    <div className="flex items-center justify-between group/price transition-colors hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg -mx-2 px-2 py-1">
                        <div className="flex items-center gap-1.5">
                            <div className="p-1 rounded-md bg-slate-100 dark:bg-white/10 text-emerald-500"><DollarSign size={12} strokeWidth={3} /></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Thường</span>
                        </div>
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">{fmtVND(record.basePrice)}</span>
                    </div>
                    <div className="flex items-center justify-between group/price transition-colors hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg -mx-2 px-2 py-1">
                        <div className="flex items-center gap-1.5">
                            <div className="p-1 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-500"><Zap size={12} strokeWidth={3} /></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Cao điểm</span>
                        </div>
                        <span className="text-sm font-black text-amber-600 dark:text-amber-400">{fmtVND(record.peakPrice)}</span>
                    </div>
                </div>
            )
        },
        {
            title: 'Đặc điểm',
            key: 'features',
            render: (_: any, record: Court) => {
                const formats = Array.isArray(record.formats) ? record.formats : (typeof record.formats === 'string' ? (record.formats as any).split(',') : []);
                const amenities = Array.isArray(record.amenities) ? record.amenities : (typeof record.amenities === 'string' ? (record.amenities as any).split(',') : []);
                const typeConfig = TYPE_CONFIG[record.type as keyof typeof TYPE_CONFIG];

                return (
                    <div className="flex flex-col gap-2 min-w-[180px]">
                         <div className="flex flex-wrap items-center gap-2">
                             <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase w-fit ${typeConfig.color}`}>
                                {typeConfig.icon}
                                {typeConfig.label}
                            </div>
                            {formats.map((f: string, i: number) => (
                                <span key={i} className="px-1.5 py-0.5 bg-slate-800 dark:bg-slate-700 text-white text-[9px] font-black rounded-md uppercase shadow-xs">Sân {f}</span>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            {amenities.slice(0, 3).map((a: string, i: number) => (
                                <span key={i} className="flex items-center gap-1 text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 px-1.5 py-0.5 rounded-md"><div className="w-1 h-1 rounded-full bg-emerald-400 shrink-0"></div><span className="truncate max-w-[80px]">{a}</span></span>
                            ))}
                            {amenities.length > 3 && <span className="text-[9px] font-black text-slate-400">+{amenities.length - 3}</span>}
                        </div>
                    </div>
                );
            }
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 140,
            align: 'right' as const,
            render: (_: any, record: Court) => (
                <div className="flex items-center justify-end gap-2 shrink-0">
                    <button 
                        onClick={() => handleView(record._id!)}
                        className="p-2.5 bg-slate-50 dark:bg-white/5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/20 dark:text-slate-300 dark:hover:text-indigo-400 rounded-[14px] transition-all active:scale-90 border border-transparent hover:border-indigo-100 dark:border-white/5 dark:hover:border-indigo-500/30 group/btn shadow-sm"
                        title="Xem chi tiết"
                    >
                        <Eye size={18} className="transition-transform group-hover/btn:scale-110" />
                    </button>
                    <button 
                        onClick={() => navigate(`/admin/courts/update/${record._id}`)}
                        className="p-2.5 bg-slate-50 dark:bg-white/5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/20 dark:text-slate-300 dark:hover:text-emerald-400 rounded-[14px] transition-all active:scale-90 border border-transparent hover:border-emerald-100 dark:border-white/5 dark:hover:border-emerald-500/30 group/btn shadow-sm"
                        title="Chỉnh sửa"
                    >
                        <Edit3 size={18} className="transition-transform group-hover/btn:scale-110" />
                    </button>
                    <button 
                        onClick={() => handleDelete(record._id!)}
                        className="p-2.5 bg-slate-50 dark:bg-white/5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/20 dark:text-slate-300 dark:hover:text-rose-400 rounded-[14px] transition-all active:scale-90 border border-transparent hover:border-rose-100 dark:border-white/5 dark:hover:border-rose-500/30 group/btn shadow-sm"
                        title="Xóa"
                    >
                        <Trash2 size={18} className="transition-transform group-hover/btn:scale-110" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="px-4 pb-12 space-y-8 animate-in fade-in duration-700">
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pt-6'>
                <div className='relative'>
                    <div className='absolute -left-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl' />
                    <h1 className='text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-4 italic'>
                        <div className="p-3.5 bg-linear-to-br from-blue-600 to-indigo-700 rounded-[20px] shadow-2xl shadow-blue-500/40 rotate-6 flex items-center justify-center border border-white/20">
                            <Zap size={28} className="text-white" />
                        </div>
                        <span className="relative">
                            QUẢN LÝ SÂN BÓNG
                            <div className="absolute -bottom-2 left-0 w-1/2 h-1.5 bg-blue-500/30 rounded-full" />
                        </span>
                    </h1>
                    <p className='text-slate-500 dark:text-slate-400 mt-6 font-semibold flex items-center gap-2 text-sm md:text-base'>
                        <span className="flex h-2.5 w-2.5 relative shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                        </span>
                        Quản lý cơ sở vật chất và cấu hình vận hành sân bóng
                    </p>
                </div>
                
                <div className='flex items-center gap-3 relative z-10 bg-white/50 dark:bg-white/5 p-2 rounded-4xl border border-white dark:border-white/10 shadow-xl dark:shadow-none backdrop-blur-md'>
                    <button
                        onClick={fetchCourts}
                        className='p-3.5 text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/20 hover:border-blue-200 dark:hover:border-blue-500/30 rounded-[18px] border border-transparent transition-all active:scale-95 bg-white dark:bg-transparent shadow-sm dark:shadow-none'
                        title="Làm mới"
                    >
                        <ChevronLeft className={loading ? 'animate-spin' : ''} size={20} />
                    </button>
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-6 py-3.5 bg-linear-to-r from-blue-600 to-indigo-700 text-white rounded-[18px] font-bold text-sm shadow-xl shadow-blue-500/30 dark:shadow-blue-500/20 border border-blue-500/50 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <Plus size={20} /> THÊM SÂN MỚI
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-card rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden p-6 transition-colors">
                <Table
                    rowKey='_id'
                    columns={columns as any}
                    dataSource={courts}
                    loading={loading}
                    pagination={{ 
                        pageSize: 6,
                        className: "px-6 py-4",
                        itemRender: (_page, type, originalElement) => {
                            if (type === 'prev') return <button className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors text-slate-400"><ChevronLeft size={16} /></button>;
                            if (type === 'next') return <button className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors text-slate-400"><ChevronRight size={16} /></button>;
                            return originalElement;
                        }
                    }}
                    className="premium-table"
                />
            </div>

            <style>{`
                .premium-table .ant-table { background: transparent !important; }
                .premium-table .ant-table-thead > tr > th {
                    background: transparent !important; color: #64748b !important;
                    font-size: 11px !important; font-weight: 800 !important;
                    text-transform: uppercase !important; letter-spacing: 0.05em !important;
                    border-bottom: 2px solid #f1f5f9 !important; padding: 12px 24px 20px 24px !important;
                }
                .dark .premium-table .ant-table-thead > tr > th {
                    color: #64748b !important; border-bottom: 1px dashed rgba(255,255,255,0.1) !important;
                }
                .premium-table .ant-table-tbody > tr > td {
                    padding: 20px 24px !important; border-bottom: 1px dotted #e2e8f0 !important;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); color: inherit; background: transparent !important;
                }
                .dark .premium-table .ant-table-tbody > tr > td { border-bottom: 1px dashed rgba(255,255,255,0.05) !important; }
                
                /* Hover effect for row */
                .premium-table .ant-table-tbody > tr { transition: all 0.3s !important; position: relative; }
                .premium-table .ant-table-tbody > tr:hover > td { background: #f8fafc !important; }
                .dark .premium-table .ant-table-tbody > tr:hover > td { background: rgba(255,255,255,0.015) !important; }
                
                /* First cell left radius and line */
                .premium-table .ant-table-tbody > tr:hover > td:first-child { 
                    border-top-left-radius: 20px !important;
                    border-bottom-left-radius: 20px !important;
                    box-shadow: inset 3px 0 0 0 #6366f1 !important;
                }
                .dark .premium-table .ant-table-tbody > tr:hover > td:first-child { 
                    box-shadow: inset 3px 0 0 0 #818cf8 !important;
                }
                /* Last cell right radius */
                .premium-table .ant-table-tbody > tr:hover > td:last-child {
                    border-top-right-radius: 20px !important;
                    border-bottom-right-radius: 20px !important;
                }
                
                .ant-table-placeholder { background: transparent !important; border-color: transparent !important; }
            `}</style>

            <Modal
                title={
                    <div className="flex items-center gap-3 py-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            {editingCourt ? <Edit3 size={20}/> : <Plus size={20}/>}
                        </div>
                        <span className="text-xl font-black text-slate-800">
                            {editingCourt ? 'Cập nhật thông tin Sân' : 'Thêm Sân bóng mới'}
                        </span>
                    </div>
                }
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
                width={800}
                centered
                className="premium-modal"
                closeIcon={<div className="p-2 hover:bg-slate-100 rounded-full transition-colors mt-2"><Trash2 size={18} className="text-slate-400"/></div>}
            >
                <Form
                    form={form}
                    layout='vertical'
                    initialValues={{ type: 'indoor', status: 'active', amenities: '' }}
                    onFinish={handleSubmit}
                    className="mt-4"
                >
                    <div className="flex flex-col md:flex-row gap-6 mb-6">
                        <Form.Item name='code' label={<span className="text-xs font-black text-slate-500 uppercase tracking-wider">Mã sân</span>} rules={[{ required: true, message: 'Vui lòng nhập mã sân!' }]} className="flex-1">
                            <Input placeholder='Ví dụ: S001' className="premium-input" prefix={<Shield size={16} className="text-slate-300 mr-1"/>} />
                        </Form.Item>
                        <Form.Item name='name' label={<span className="text-xs font-black text-slate-500 uppercase tracking-wider">Tên sân bóng</span>} rules={[{ required: true, message: 'Vui lòng nhập tên sân!' }]} className="flex-2">
                            <Input placeholder='Nhập tên sân (Ví dụ: Sân Mira A1)' className="premium-input" />
                        </Form.Item>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <Form.Item name='type' label={<span className="text-xs font-black text-slate-500 uppercase tracking-wider">Loại sân</span>} rules={[{ required: true, message: 'Chọn loại sân' }]}>
                            <Select className="premium-select" placeholder="Chọn loại">
                                <Option value='indoor'>Trong nhà</Option>
                                <Option value='outdoor'>Ngoài trời</Option>
                                <Option value='vip'>VIP ✨</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name='status' label={<span className="text-xs font-black text-slate-500 uppercase tracking-wider">Trạng thái</span>}>
                            <Select className="premium-select">
                                <Option value='active'>Hoạt động</Option>
                                <Option value='maintenance'>Bảo trì 🛠️</Option>
                                <Option value='locked'>Khóa 🔒</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name='formats' label={<span className="text-xs font-black text-slate-500 uppercase tracking-wider">Định dạng</span>} rules={[{ required: true, message: 'Chọn định dạng' }]}>
                            <Select mode='multiple' className="premium-select" placeholder="Chọn 5v5, 7v7...">
                                <Option value='5v5'>5v5</Option>
                                <Option value='7v7'>7v7</Option>
                                <Option value='9v9'>9v9</Option>
                                <Option value='11v11'>11v11</Option>
                            </Select>
                        </Form.Item>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <Form.Item name='basePrice' label={<span className="text-xs font-black text-slate-500 uppercase tracking-wider">Giá khung giờ Thường (VNĐ)</span>} rules={[{ required: true, message: 'Nhập giá' }]}>
                            <InputNumber className="premium-input-number w-full" formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/\$\s?|(,*)/g, '')} prefix={<DollarSign size={16} className="text-emerald-500 mr-1"/>} />
                        </Form.Item>
                        <Form.Item name='peakPrice' label={<span className="text-xs font-black text-slate-500 uppercase tracking-wider">Giá khung giờ Cao điểm (VNĐ)</span>} rules={[{ required: true, message: 'Nhập giá' }]}>
                            <InputNumber className="premium-input-number w-full" formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/\$\s?|(,*)/g, '')} prefix={<Zap size={16} className="text-amber-500 mr-1"/>} />
                        </Form.Item>
                    </div>

                    <Form.Item name='location' label={<span className="text-xs font-black text-slate-500 uppercase tracking-wider">Vị trí sân bóng</span>} rules={[{ required: true, message: 'Vui lòng nhập địa chỉ' }]} className="mb-6">
                        <Input prefix={<MapPin size={16} className="text-rose-500 mr-1"/>} className="premium-input" placeholder="Ví dụ: Quận 7, TP.HCM" />
                    </Form.Item>

                    <Form.Item label={<span className="text-xs font-black text-slate-500 uppercase tracking-wider">Hình ảnh (Tối đa 10 ảnh)</span>} className="mb-8">
                        <div className="p-4 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-3xl bg-slate-50/50 dark:bg-white/5">
                            <Upload listType='picture-card' fileList={fileList} beforeUpload={() => false} onChange={({ fileList }) => setFileList(fileList)} className="premium-upload" accept='image/*' multiple>
                                {fileList.length < 10 && (
                                    <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                                        <UploadIcon size={24} />
                                        <span className="text-[10px] font-bold uppercase">Tải ảnh</span>
                                    </div>
                                )}
                            </Upload>
                        </div>
                    </Form.Item>

                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-white/5">
                        <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 rounded-[14px] transition-all">HỦY BỎ</button>
                        <button type="submit" disabled={saving} className="px-8 py-2.5 bg-linear-to-r from-blue-600 to-indigo-700 text-white rounded-[16px] font-black text-sm hover:shadow-xl hover:shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50">
                            {saving ? 'ĐANG LƯU...' : (editingCourt ? 'CẬP NHẬT' : 'TẠO MỚI')}
                        </button>
                    </div>
                </Form>

                <style>{`
                    .premium-modal .ant-modal-content { border-radius: 32px !important; padding: 32px !important; }
                    .premium-input, .premium-select .ant-select-selector, .premium-input-number {
                        border-radius: 12px !important; border: 1px solid #f1f5f9 !important;
                        padding: 8px 12px !important; background: #f8fafc !important;
                        font-weight: 600 !important; transition: all 0.2s !important; width: 100%;
                    }
                    .dark .premium-input, .dark .premium-select .ant-select-selector, .dark .premium-input-number {
                        background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.1) !important; color: #f8fafc !important;
                    }
                `}</style>
            </Modal>

            <AnimatePresence>
                {detailModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }} className="bg-white dark:bg-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-4xl shadow-2xl border border-slate-200 dark:border-white/10">
                            <div className="sticky top-0 z-10 bg-white/80 dark:bg-card/80 backdrop-blur-xl px-8 py-6 flex items-center justify-between border-b border-slate-100 dark:border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <InfoOutlined style={{ fontSize: 24 }} />
                                    </div>
                                    <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white leading-tight">{selectedCourt?.name || 'Chi tiết sân'}</h2>
                                </div>
                                <button onClick={() => setDetailModal(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-all text-slate-400 hover:text-rose-500"><CloseOutlined style={{ fontSize: 20 }} /></button>
                            </div>

                            <div className="p-8">
                                <AnimatePresence mode='wait'>
                                    {detailLoading ? (
                                        <motion.div key='loading' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Skeleton active paragraph={{ rows: 12 }} /></motion.div>
                                    ) : selectedCourt ? (
                                        <motion.div key='detail' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                                            <div className="lg:col-span-3 space-y-10">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 bg-slate-50 dark:bg-white/5 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-inner">
                                                    <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Mã định danh</label><p className="font-black text-slate-800 dark:text-slate-100 text-lg">{selectedCourt.code}</p></div>
                                                    <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Vị trí</label><p className="font-black text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2"><MapPin size={16} className="text-rose-500" />{selectedCourt.location || 'N/A'}</p></div>
                                                    <div className="pt-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Loại hình</label>
                                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black uppercase w-fit ${TYPE_CONFIG[selectedCourt.type as keyof typeof TYPE_CONFIG].color}`}>
                                                            {TYPE_CONFIG[selectedCourt.type as keyof typeof TYPE_CONFIG].icon}{TYPE_CONFIG[selectedCourt.type as keyof typeof TYPE_CONFIG].label}
                                                        </div>
                                                    </div>
                                                    <div className="pt-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Trạng thái</label>
                                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase w-fit text-white ${STATUS_CONFIG[selectedCourt.status as keyof typeof STATUS_CONFIG].color}`}>
                                                            {STATUS_CONFIG[selectedCourt.status as keyof typeof STATUS_CONFIG].label}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase flex items-center gap-2"><div className="w-1.5 h-6 bg-emerald-500 rounded-full" />Tiện ích</h4>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                        {selectedCourt.amenities?.map((a, i) => (
                                                            <div key={i} className="px-4 py-3 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-300 shadow-sm flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{a}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="p-6 bg-slate-900 dark:bg-slate-950 rounded-3xl border border-slate-800 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-8 opacity-10"><Shield size={120} className="text-white" /></div>
                                                    <div className="relative z-10"><h4 className="text-xs font-black text-slate-500 uppercase mb-4">Mô tả</h4><p className="text-base text-slate-200 italic font-medium">"{selectedCourt.description || 'Mira Football Court - Chuyên nghiệp & Đẳng cấp.'}"</p></div>
                                                </div>
                                            </div>

                                            <div className="lg:col-span-2 space-y-8">
                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase">Bảng giá</h4>
                                                    <div className="space-y-3">
                                                        <div className="p-6 bg-linear-to-br from-emerald-500 to-emerald-700 rounded-4xl text-white shadow-xl shadow-emerald-500/30">
                                                            <div className="flex justify-between items-start mb-6"><span className="px-3 py-1 bg-white/20 rounded-lg text-[10px] font-bold uppercase">Giờ thường</span><DollarSign size={24} className="opacity-40" /></div>
                                                            <div className="text-3xl font-black">{fmtVND(selectedCourt.basePrice)}</div>
                                                        </div>
                                                        <div className="p-6 bg-linear-to-br from-amber-500 to-orange-600 rounded-4xl text-white shadow-xl shadow-amber-500/30">
                                                            <div className="flex justify-between items-start mb-6"><span className="px-3 py-1 bg-white/20 rounded-lg text-[10px] font-bold uppercase">Giờ vàng</span><Zap size={24} className="opacity-40" /></div>
                                                            <div className="text-3xl font-black">{fmtVND(selectedCourt.peakPrice)}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase">Hình ảnh</h4>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {selectedCourt.images?.map((img, i) => (
                                                            <div key={i} className="aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-white/5 shadow-sm"><Image src={img} className="w-full h-full object-cover" /></div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="py-20 text-center"><p className="text-slate-400 italic">Không có dữ liệu.</p></div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CourtManagement;
