import React, { useEffect, useMemo, useState } from 'react';
import {
    Button,
    Card,
    Col,
    Form,
    Input,
    InputNumber,
    Modal,
    Progress,
    Row,
    Select,
    Space,
    Statistic,
    Tag,
    Popconfirm,
    message,
    notification,
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

const STATUS_COLORS: Record<EquipmentStatus, string> = {
    in_stock: 'green',
    out_of_stock: 'red',
    discontinued: 'default',
};

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

    // OPEN / CLOSE MODAL
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
        if (e.mode === 'rent') {
            return (
                <div>
                    Giá thuê:{' '}
                    <b>
                        {(e.rentPrice || 0).toLocaleString('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                        })}
                        /{e.unit}
                    </b>
                </div>
            );
        }
        if (e.mode === 'sell') {
            return (
                <div>
                    Giá bán:{' '}
                    <b>
                        {(e.salePrice || 0).toLocaleString('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                        })}
                        /{e.unit}
                    </b>
                </div>
            );
        }
        return (
            <>
                <div>
                    Giá thuê:{' '}
                    <b>
                        {(e.rentPrice || 0).toLocaleString('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                        })}
                        /{e.unit}
                    </b>
                </div>
                <div>
                    Giá bán:{' '}
                    <b>
                        {(e.salePrice || 0).toLocaleString('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                        })}
                        /{e.unit}
                    </b>
                </div>
            </>
        );
    };

    return (
        <div className='space-y-6'>
            {/* HEADER + STATS */}
            <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
                <div>
                    <h2 className='text-2xl font-semibold flex items-center gap-2'>
                        <ToolOutlined /> Quản lý thiết bị
                    </h2>
                    <p className='text-gray-500 text-sm'>
                        Quản lý tồn kho và cấu hình giá thuê / bán thiết bị.
                    </p>
                </div>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchEquipments}>
                        Làm mới
                    </Button>
                    <Button type='primary' icon={<PlusOutlined />} onClick={openCreateModal}>
                        Thêm thiết bị
                    </Button>
                </Space>
            </div>

            <Row gutter={16}>
                <Col xs={12} md={6}>
                    <Card>
                        <Statistic
                            title='Tổng thiết bị'
                            value={stats.total}
                            prefix={<ToolOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card>
                        <Statistic
                            title='Còn hàng'
                            value={stats.inStock}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card>
                        <Statistic
                            title='Sắp hết (≤ 5)'
                            value={stats.lowStock}
                            prefix={<ExclamationCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card>
                        <Statistic
                            title='Hết hàng'
                            value={stats.outOfStock}
                            prefix={<CloseCircleOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* SEARCH */}
            <Card>
                <Input
                    placeholder='Tìm kiếm theo tên hoặc mã thiết bị...'
                    allowClear
                    prefix={<SearchOutlined />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </Card>

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
                                title={
                                    <div className='flex items-center justify-between gap-2'>
                                        <div>
                                            <div className='font-semibold'>{e.name}</div>
                                            <div className='text-xs text-gray-500'>
                                                Mã thiết bị: {e.code}
                                            </div>
                                        </div>
                                        <Space size={4} wrap>
                                            <Tag color='blue'>{MODE_LABELS[e.mode]}</Tag>
                                            <Tag color={STATUS_COLORS[e.status]}>
                                                {STATUS_LABELS[e.status]}
                                            </Tag>
                                            {isLowStock && <Tag color='orange'>Sắp hết</Tag>}
                                        </Space>
                                    </div>
                                }
                                actions={[
                                    <Button
                                        key='edit'
                                        type='link'
                                        icon={<EditOutlined />}
                                        onClick={() => openEditModal(e)}
                                    >
                                        Sửa
                                    </Button>,
                                    <Popconfirm
                                        key='delete'
                                        title='Xóa thiết bị?'
                                        description='Thiết bị sẽ bị xóa khỏi hệ thống.'
                                        okText='Xóa'
                                        cancelText='Hủy'
                                        okButtonProps={{ danger: true }}
                                        onConfirm={() => handleDelete(e)}
                                    >
                                        <Button type='link' danger icon={<DeleteOutlined />}>
                                            Xóa
                                        </Button>
                                    </Popconfirm>,
                                ]}
                            >
                                <div className='space-y-2 text-sm'>
                                    <div>
                                        <div className='text-gray-500 text-xs mb-1'>Tồn kho</div>
                                        <Progress
                                            percent={percent}
                                            size='small'
                                            status={
                                                e.status === 'out_of_stock' ? 'exception' : 'normal'
                                            }
                                        />
                                        <div className='flex justify-between text-xs mt-1'>
                                            <span>
                                                Tổng: {e.totalQuantity || 0} {e.unit}
                                            </span>
                                            <span>
                                                Còn lại:{' '}
                                                <b className={isLowStock ? 'text-orange-500' : ''}>
                                                    {e.availableQuantity || 0} {e.unit}
                                                </b>
                                            </span>
                                            <span>
                                                Đã dùng: {used < 0 ? 0 : used} {e.unit}
                                            </span>
                                        </div>
                                    </div>

                                    <div>{renderPrice(e)}</div>

                                    {e.description && (
                                        <div>
                                            <div className='text-gray-500 text-xs mb-0.5'>
                                                Mô tả
                                            </div>
                                            <div className='text-xs text-gray-700'>
                                                {e.description}
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
                                rules={[
                                    { required: true, message: 'Nhập tổng số lượng' },
                                    { type: 'number', min: 0, message: 'Không được âm' },
                                ]}
                            >
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label='Còn lại'
                                name='availableQuantity'
                                rules={[
                                    { required: true, message: 'Nhập số lượng còn lại' },
                                    { type: 'number', min: 0, message: 'Không được âm' },
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
