import React, { useEffect, useMemo, useState } from 'react';
import {
    Col,
    Form,
    Input,
    InputNumber,
    Modal,
    Progress,
    Row,
    Select,
    Popconfirm,
    message,
    notification,
    Card,
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    ToolOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    CloseCircleOutlined,
    SearchOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import api from '@/common/utils/api';

const { TextArea } = Input;

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
}

const MODE_LABELS: Record<EquipmentMode, string> = {
    rent: 'Chỉ cho thuê',
    sell: 'Chỉ bán',
    both: 'Cho thuê & bán',
};

const STATUS_LABELS: Record<EquipmentStatus, string> = {
    in_stock: 'Còn hàng',
    out_of_stock: 'Hết hàng',
    discontinued: 'Ngừng bán',
};

// STATUS_COLORS is removed as we use inline styles for better control

const UNIT_OPTIONS = [
    { value: 'cái', label: 'Cái' },
    { value: 'bộ', label: 'Bộ' },
    { value: 'chiếc', label: 'Chiếc' },
    { value: 'quả', label: 'Quả' },
    { value: 'đôi', label: 'Đôi' },
    { value: 'chai', label: 'Chai' },
].filter(Boolean);

const EquipmentList: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Equipment | null>(null);
    const [form] = Form.useForm();
    const [submitLoading, setSubmitLoading] = useState(false);

    //  FETCH LIST
    const fetchEquipments = async () => {
        try {
            setLoading(true);
            const res = await api.get('/equipments');
            const list: Equipment[] = res.data?.data || res.data || [];
            setEquipments(list);
        } catch (err) {
            console.error(err);
            message.error('Không thể tải danh sách thiết bị!');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEquipments();
    }, []);

    const isDarkMode = document.documentElement.classList.contains('dark');

    //  FILTERED LIST
    const filteredEquipments = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return equipments;
        return equipments.filter(
            (e) => e.name.toLowerCase().includes(keyword) || e.code.toLowerCase().includes(keyword)
        );
    }, [equipments, search]);

    //  STATS
    const stats = useMemo(() => {
        const total = equipments.length;
        const inStock = equipments.filter((e) => e.status === 'in_stock').length;
        const outOfStock = equipments.filter((e) => e.status === 'out_of_stock').length;
        const lowStock = equipments.filter(
            (e) => e.status === 'in_stock' && e.availableQuantity <= 5
        ).length;
        return { total, inStock, outOfStock, lowStock };
    }, [equipments]);

    // MỞ / ĐÓNG MODAL
    const openCreateModal = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({
            mode: 'rent',
            status: 'in_stock',
            unit: 'cái',
            totalQuantity: 0,
            availableQuantity: 0,
        });
        setModalOpen(true);
    };

    const openEditModal = (item: Equipment) => {
        setEditing(item);
        form.setFieldsValue({
            code: item.code,
            name: item.name,
            unit: item.unit,
            mode: item.mode,
            status: item.status,
            totalQuantity: item.totalQuantity,
            availableQuantity: item.availableQuantity,
            rentPrice: item.rentPrice,
            salePrice: item.salePrice,
            description: item.description,
        });
        setModalOpen(true);
    };

    const handleModalCancel = () => {
        setModalOpen(false);
        setEditing(null);
        form.resetFields();
    };

    //  CREATE / UPDATE
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const mode: EquipmentMode = values.mode;

            const payload = {
                code: values.code?.trim(),
                name: values.name?.trim(),
                unit: values.unit?.trim(),
                mode,
                status: values.status as EquipmentStatus,
                totalQuantity: Number(values.totalQuantity) || 0,
                availableQuantity: Number(values.availableQuantity) || 0,
                rentPrice:
                    mode === 'sell'
                        ? 0
                        : values.rentPrice
                          ? Number(String(values.rentPrice).toString().replace(/,/g, ''))
                          : 0,
                salePrice:
                    mode === 'rent'
                        ? 0
                        : values.salePrice
                          ? Number(String(values.salePrice).toString().replace(/,/g, ''))
                          : 0,
                description: values.description?.trim() || '',
            };

            setSubmitLoading(true);

            if (editing) {
                await api.patch(`/equipments/${editing._id}`, payload);

                notification.success({
                    message: 'Thành công',
                    description: 'Đã cập nhật thiết bị thành công!',
                    placement: 'topRight',
                });
            } else {
                await api.post('/equipments', payload);

                notification.success({
                    message: 'Thành công',
                    description: 'Đã thêm thiết bị mới thành công!',
                    placement: 'topRight',
                });
            }

            handleModalCancel();
            fetchEquipments();
        } catch (err: any) {
            if (err?.errorFields) return; // lỗi validate form của AntD

            const apiErr = err?.response?.data;
            if (apiErr?.errors?.length) {
                message.error(apiErr.errors[0].message);
            } else {
                const msg = apiErr?.message || 'Lưu thiết bị thất bại!';

                notification.error({
                    message: 'Lỗi',
                    description: msg,
                    placement: 'topRight',
                });
            }
        } finally {
            setSubmitLoading(false);
        }
    };

    //  DELETE
    const handleDelete = async (item: Equipment) => {
        try {
            await api.delete(`/equipments/${item._id}`);

            notification.success({
                message: 'Thành công',
                description: 'Đã xóa thiết bị thành công!',
                placement: 'topRight',
            });

            fetchEquipments();
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Xóa thiết bị thất bại!';

            notification.error({
                message: 'Lỗi',
                description: msg,
                placement: 'topRight',
            });
        }
    };

    //  RENDER PRICE
    const renderPrice = (e: Equipment) => {
        const PriceLine = ({ label, value, colorClass }: { label: string, value?: number, colorClass: string }) => (
            <div className="flex items-center justify-between py-1.5 border-b border-white/10 last:border-0">
                <span className="text-[10px] font-black text-white/50 uppercase tracking-wider">{label}</span>
                <div className="flex flex-col items-end leading-none">
                    <span className={`text-base font-black ${colorClass}`}>
                        {(value || 0).toLocaleString('vi-VN')}
                        <span className="text-[10px] ml-1 opacity-60 font-medium">đ</span>
                    </span>
                    <span className="text-[8px] opacity-40 italic uppercase tracking-tighter">mỗi {e.unit}</span>
                </div>
            </div>
        );

        if (e.mode === 'rent') {
            return <PriceLine label="Giá thuê" value={e.rentPrice} colorClass="text-emerald-400" />;
        }
        if (e.mode === 'sell') {
            return <PriceLine label="Giá bán" value={e.salePrice} colorClass="text-amber-400" />;
        }
        return (
            <div className="space-y-0">
                <PriceLine label="Giá thuê" value={e.rentPrice} colorClass="text-emerald-400" />
                <PriceLine label="Giá bán" value={e.salePrice} colorClass="text-amber-400" />
            </div>
        );
    };

    return (
        <div className='px-4 pb-12 space-y-8 animate-in fade-in duration-700'>
            {/* Premium Header section */}
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pt-6'>
                <div className='relative'>
                    <div className='absolute -left-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl' />
                    <h1 className='text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-4 italic'>
                        <div className="p-3.5 bg-linear-to-br from-emerald-500 to-teal-700 rounded-3xl shadow-2xl shadow-emerald-500/40 rotate-6 flex items-center justify-center border border-white/20">
                            <ToolOutlined className="text-white text-3xl" />
                        </div>
                        <span className="relative">
                            QUẢN LÝ THIẾT BỊ
                            <div className="absolute -bottom-2 left-0 w-1/2 h-1.5 bg-emerald-500/30 rounded-full" />
                        </span>
                    </h1>
                    <p className='text-slate-500 dark:text-slate-400 mt-6 font-semibold flex items-center gap-2 text-sm md:text-base'>
                        <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        Quản lý tồn kho và cấu hình giá thuê / bán thiết bị chuyên nghiệp
                    </p>
                </div>
                
                <div className='flex items-center gap-3 relative z-10 bg-white/50 dark:bg-white/5 p-2 rounded-4xl border border-white dark:border-white/10 shadow-xl backdrop-blur-md'>
                    <button
                        onClick={fetchEquipments}
                        className='p-3.5 text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-2xl transition-all'
                        title="Làm mới"
                    >
                        <ReloadOutlined className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-6 py-3.5 bg-linear-to-r from-emerald-600 to-teal-700 text-white rounded-3xl font-bold text-sm shadow-xl shadow-emerald-500/30 hover:scale-[1.02] hover:shadow-emerald-500/40 active:scale-95 transition-all"
                    >
                        <PlusOutlined /> THÊM THIẾT BỊ MỚI
                    </button>
                </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Tổng thiết bị */}
                <div className="group bg-white dark:bg-slate-800/40 p-5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-500/5 flex flex-col justify-between transition-all hover:translate-y-[-4px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-slate-500/5 rounded-full -mr-10 -mt-10 blur-2xl transition-all" />
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-4">
                        <span className="font-bold text-xs uppercase tracking-wider">Tổng thiết bị</span>
                        <div className="p-2 bg-slate-100 dark:bg-white/10 rounded-xl">
                            <ToolOutlined className="text-lg" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-800 dark:text-white transition-all">{stats.total}</div>
                </div>

                {/* Còn hàng */}
                <div className="group bg-white dark:bg-slate-800/40 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-500/20 shadow-xl shadow-emerald-500/5 flex flex-col justify-between transition-all hover:translate-y-[-4px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-emerald-500/10 transition-all" />
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-4">
                        <span className="font-bold text-xs uppercase tracking-wider">Còn hàng</span>
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-500/20 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all">
                            <CheckCircleOutlined className="text-lg" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-800 dark:text-white transition-all">{stats.inStock}</div>
                </div>

                {/* Sắp hết hàng */}
                <div className="group bg-white dark:bg-slate-800/40 p-5 rounded-3xl border border-orange-100 dark:border-orange-500/20 shadow-xl shadow-orange-500/5 flex flex-col justify-between transition-all hover:translate-y-[-4px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-orange-500/10 transition-all" />
                    <div className="flex items-center justify-between text-orange-600 dark:text-orange-400 mb-4">
                        <span className="font-bold text-xs uppercase tracking-wider">Sắp hết hàng</span>
                        <div className="p-2 bg-orange-50 dark:bg-orange-500/20 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-all">
                            <ExclamationCircleOutlined className="text-lg" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-800 dark:text-white transition-all">{stats.lowStock}</div>
                </div>

                {/* Hết hàng */}
                <div className="group bg-white dark:bg-slate-800/40 p-5 rounded-3xl border border-rose-100 dark:border-rose-500/20 shadow-xl shadow-rose-500/5 flex flex-col justify-between transition-all hover:translate-y-[-4px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-rose-500/10 transition-all" />
                    <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-4">
                        <span className="font-bold text-xs uppercase tracking-wider">Hết hàng</span>
                        <div className="p-2 bg-rose-50 dark:bg-rose-500/20 rounded-xl group-hover:bg-rose-500 group-hover:text-white transition-all">
                            <CloseCircleOutlined className="text-lg" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-800 dark:text-white transition-all">{stats.outOfStock}</div>
                </div>
            </div>

            {/* SEARCH */}
            <div className='bg-white dark:bg-card p-4 rounded-4xl border border-slate-100 dark:border-white/5 shadow-sm transition-all'>
                <Input
                    placeholder='Tìm kiếm theo tên hoặc mã thiết bị...'
                    allowClear
                    size="large"
                    prefix={<SearchOutlined className='text-slate-400 mr-2' />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className='rounded-2xl border-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 hover:border-emerald-400 focus:border-emerald-500 transition-all h-14'
                />
            </div>

            {/* LIST */}
            <Row gutter={[16, 16]}>
                {filteredEquipments.map((e) => {
                    const used = (e.totalQuantity || 0) - (e.availableQuantity || 0);
                    const percent =
                        e.totalQuantity > 0
                            ? Math.round(((e.availableQuantity || 0) / e.totalQuantity) * 100)
                            : 0;

                    const isLowStock =
                        e.status === 'in_stock' &&
                        e.availableQuantity <= 5 &&
                        e.availableQuantity > 0;

                    return (
                        <Col key={e._id} xs={24} md={12} lg={8}>
                            <Card
                                className='rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all group overflow-hidden bg-white dark:bg-card'
                                headStyle={{ padding: 0 }}
                                bodyStyle={{ padding: '24px' }}
                                title={
                                    <div className='flex items-center justify-between gap-3 p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/5'>
                                        <div>
                                            <div className='font-black text-slate-800 dark:text-slate-100 group-hover:text-emerald-500 transition-colors uppercase tracking-tight text-lg'>{e.name}</div>
                                            <div className='text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-2'>
                                                <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-white/10 rounded-sm">ID: {e.code}</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                <span>{e.unit}</span>
                                            </div>
                                        </div>
                                        <div className='flex flex-col items-end gap-1.5'>
                                            <div className='px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 text-[10px] font-black rounded-lg uppercase border border-indigo-100 dark:border-indigo-500/20 shadow-sm'>{MODE_LABELS[e.mode]}</div>
                                            <div className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase shadow-sm border ${
                                                e.status === 'in_stock' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' :
                                                e.status === 'out_of_stock' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-100 dark:border-rose-500/20' :
                                                'bg-slate-100 dark:bg-slate-500/10 text-slate-500 border-slate-200 dark:border-slate-500/20'
                                            }`}>
                                                {STATUS_LABELS[e.status]}
                                            </div>
                                        </div>
                                    </div>
                                }
                                actions={[
                                    <button
                                        key='edit'
                                        onClick={() => openEditModal(e)}
                                        className='flex items-center justify-center gap-2 w-full py-4 text-[13px] font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all border-r border-slate-50 dark:border-white/5'
                                    >
                                        <EditOutlined /> CHỈNH SỬA
                                    </button>,
                                    <Popconfirm
                                        key='delete'
                                        title='Xóa thiết bị?'
                                        description='Thiết bị sẽ bị xóa khỏi hệ thống.'
                                        okText='Xóa'
                                        cancelText='Hủy'
                                        okButtonProps={{ danger: true }}
                                        onConfirm={() => handleDelete(e)}
                                    >
                                        <button className='flex items-center justify-center gap-2 w-full py-4 text-[13px] font-bold text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all'>
                                            <DeleteOutlined /> XÓA
                                        </button>
                                    </Popconfirm>,
                                ]}
                            >
                                <div className='space-y-6 text-sm'>
                                    <div>
                                        <div className='flex justify-between items-center mb-2'>
                                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Tồn kho khả dụng</span>
                                            <span className={`text-xs font-black ${isLowStock ? 'text-amber-500' : 'text-slate-400'}`}>{percent}%</span>
                                        </div>
                                        <Progress
                                            percent={percent}
                                            showInfo={false}
                                            strokeColor={isLowStock ? '#f59e0b' : '#10b981'}
                                            trailColor={isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9'}
                                            strokeWidth={8}
                                            className='mb-4'
                                        />
                                        <div className='grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl'>
                                            <div className='text-center border-r border-slate-200 dark:border-white/5'>
                                                <div className='text-[10px] font-black text-slate-400 uppercase'>Tổng</div>
                                                <div className='font-bold text-slate-700 dark:text-slate-200'>{e.totalQuantity}</div>
                                            </div>
                                            <div className='text-center border-r border-slate-200 dark:border-white/5'>
                                                <div className='text-[10px] font-black text-slate-400 uppercase'>Còn</div>
                                                <div className={`font-bold ${isLowStock ? 'text-amber-500 animate-pulse' : 'text-emerald-500'}`}>{e.availableQuantity}</div>
                                            </div>
                                            <div className='text-center'>
                                                <div className='text-[10px] font-black text-slate-400 uppercase'>Dùng</div>
                                                <div className='font-bold text-slate-700 dark:text-slate-200 font-mono'>{used < 0 ? 0 : used}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className='p-4 rounded-2xl bg-linear-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 text-white shadow-lg overflow-hidden relative'>
                                        <div className="absolute right-[-10px] top-[-10px] opacity-10 rotate-12">
                                            <ToolOutlined style={{ fontSize: '80px' }} />
                                        </div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 opacity-70">Cấu hình giá niêm yết</div>
                                        <div className="flex flex-col gap-2 relative z-10">
                                            {renderPrice(e)}
                                        </div>
                                    </div>

                                    {e.description && (
                                        <div className='bg-slate-50 dark:bg-white/5 p-3 rounded-xl border-l-4 border-emerald-500'>
                                            <div className='text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-tighter'>Ghi chú / Mô tả</div>
                                            <div className='text-xs text-slate-600 dark:text-slate-300 line-clamp-2 italic'>
                                                "{e.description}"
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </Col>
                    );
                })}

                {!loading && filteredEquipments.length === 0 && (
                    <Col span={24}>
                        <Card>
                            <p className='text-center text-gray-500 text-sm'>
                                Không có thiết bị nào. Hãy bấm <b>"Thêm thiết bị"</b> để tạo mới.
                            </p>
                        </Card>
                    </Col>
                )}
            </Row>

            {/* MODAL CREATE / EDIT */}
            <Modal
                open={modalOpen}
                title={editing ? 'Sửa thông tin thiết bị' : 'Thêm thiết bị mới'}
                onCancel={handleModalCancel}
                onOk={handleSubmit}
                okText={editing ? 'Cập nhật' : 'Thêm mới'}
                confirmLoading={submitLoading}
                okButtonProps={{
                    disabled: submitLoading,
                }}
            >
                <Form
                    layout='vertical'
                    form={form}
                    initialValues={{
                        mode: 'rent',
                        status: 'in_stock',
                        unit: 'cái',
                    }}
                >
                    <Form.Item
                        label='Mã thiết bị'
                        name='code'
                        rules={[{ required: true, message: 'Vui lòng nhập mã thiết bị' }]}
                    >
                        <Input placeholder='VD: TB001' />
                    </Form.Item>

                    <Form.Item
                        label='Tên thiết bị'
                        name='name'
                        rules={[{ required: true, message: 'Vui lòng nhập tên thiết bị' }]}
                    >
                        <Input placeholder='VD: Bóng, Giày...' />
                    </Form.Item>

                    <Form.Item
                        label='Đơn vị'
                        name='unit'
                        rules={[{ required: true, message: 'Vui lòng chọn đơn vị' }]}
                    >
                        <Select options={UNIT_OPTIONS} />
                    </Form.Item>

                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item
                                label='Số lượng (tổng)'
                                name='totalQuantity'
                                dependencies={['availableQuantity']}
                                rules={[
                                    { required: true, message: 'Nhập tổng số lượng' },
                                    { type: 'number', min: 0, message: 'Không được âm' },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            const avail = getFieldValue('availableQuantity');
                                            if (value == null || avail == null)
                                                return Promise.resolve();
                                            if (Number(value) < Number(avail)) {
                                                return Promise.reject(
                                                    new Error('Tổng phải ≥ Còn lại')
                                                );
                                            }
                                            return Promise.resolve();
                                        },
                                    }),
                                ]}
                            >
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>

                        <Col span={12}>
                            <Form.Item
                                label='Còn lại'
                                name='availableQuantity'
                                dependencies={['totalQuantity']}
                                rules={[
                                    { required: true, message: 'Nhập số lượng còn lại' },
                                    { type: 'number', min: 0, message: 'Không được âm' },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            const total = getFieldValue('totalQuantity');
                                            if (value == null || total == null)
                                                return Promise.resolve();
                                            if (Number(value) > Number(total)) {
                                                return Promise.reject(
                                                    new Error('Còn lại không được > Tổng')
                                                );
                                            }
                                            return Promise.resolve();
                                        },
                                    }),
                                ]}
                            >
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        label='Loại thiết bị'
                        name='mode'
                        rules={[{ required: true, message: 'Vui lòng chọn loại thiết bị' }]}
                    >
                        <Select
                            options={[
                                { value: 'rent', label: 'Chỉ cho thuê' },
                                { value: 'sell', label: 'Chỉ bán' },
                                { value: 'both', label: 'Cho thuê & bán' },
                            ]}
                        />
                    </Form.Item>

                    {/* Giá thuê / bán */}
                    <Form.Item shouldUpdate noStyle>
                        {({ getFieldValue }) => {
                            const mode: EquipmentMode = getFieldValue('mode') || 'rent';

                            const isRentMode = mode === 'rent' || mode === 'both';
                            const isSellMode = mode === 'sell' || mode === 'both';

                            return (
                                <>
                                    {isRentMode && (
                                        <Form.Item
                                            label='Giá thuê (VND)'
                                            name='rentPrice'
                                            rules={[
                                                {
                                                    required: isRentMode,
                                                    message: 'Nhập giá thuê',
                                                },
                                            ]}
                                        >
                                            <InputNumber
                                                min={0}
                                                style={{ width: '100%' }}
                                                formatter={(v) =>
                                                    `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                                                }
                                            />
                                        </Form.Item>
                                    )}

                                    {isSellMode && (
                                        <Form.Item
                                            label='Giá bán (VND)'
                                            name='salePrice'
                                            rules={[
                                                {
                                                    required: isSellMode,
                                                    message: 'Nhập giá bán',
                                                },
                                            ]}
                                        >
                                            <InputNumber
                                                min={0}
                                                style={{ width: '100%' }}
                                                formatter={(v) =>
                                                    `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                                                }
                                            />
                                        </Form.Item>
                                    )}
                                </>
                            );
                        }}
                    </Form.Item>
                    <Form.Item
                        label='Trạng thái'
                        name='status'
                        rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
                    >
                        <Select
                            options={[
                                { value: 'in_stock', label: 'Còn hàng' },
                                { value: 'out_of_stock', label: 'Hết hàng' },
                                { value: 'discontinued', label: 'Ngừng bán' },
                            ]}
                        />
                    </Form.Item>

                    <Form.Item label='Mô tả' name='description'>
                        <TextArea rows={3} placeholder='Mô tả thêm về thiết bị...' />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default EquipmentList;
