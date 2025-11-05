import React, { useEffect, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { useNavigate } from 'react-router-dom';
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    Select,
    InputNumber,
    Space,
    Tag,
    message,
    Upload,
    Image,
    Skeleton,
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    UploadOutlined,
    EyeOutlined,
} from '@ant-design/icons';
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
const TYPE_LABEL = { indoor: 'Trong nhà', outdoor: 'Ngoài trời', vip: 'VIP' };
const STATUS_PROPS = {
    active: { color: 'green', label: 'Hoạt động' },
    maintenance: { color: 'orange', label: 'Bảo trì' },
    locked: { color: 'red', label: 'Khóa' },
};
const fmtVND = (n?: number) => (typeof n === 'number' ? `${n.toLocaleString('vi-VN')} VNĐ` : '—');

const CourtManagement: React.FC = () => {
    const [courts, setCourts] = useState<Court[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [detailModal, setDetailModal] = useState(false);
    const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [editingCourt, setEditingCourt] = useState<Court | null>(null);
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const navigate = useNavigate();

    //  Lấy danh sách sân
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

    //  Mở modal thêm/sửa
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

    //  Xem chi tiết
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

    //  Submit form thêm/sửa
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const formData = new FormData();

            if (values.amenities && typeof values.amenities === 'string') {
                values.amenities
                    .split(',')
                    .map((a: string) => a.trim())
                    .filter(Boolean)
                    .forEach((a: string) => formData.append('amenities', a));
            }

            Object.entries(values).forEach(
                ([k, v]) => k !== 'amenities' && formData.append(k, String(v))
            );

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
                message.success({
                    content: 'Cập nhật sân thành công!',
                    duration: 1.5,
                });
                setCourts((prev) =>
                    prev.map((c) => (c._id === editingCourt._id ? res.data.data : c))
                );
                setSelectedCourt(res.data.data);
            } else {
                res = await api.post('/courts', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                message.success({
                    content: 'Thêm sân mới thành công!',
                    duration: 1.5,
                });
                setCourts((prev) => [res.data.data, ...prev]);
            }

            //Hiệu ứng checkmark thành công
            const modalContent = document.querySelector('.ant-modal-content') as HTMLElement;
            if (modalContent) {
                const successDiv = document.createElement('div');
                successDiv.innerHTML = `
                <div style="
                    position: absolute;
                    top: 40%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    color: #52c41a;
                    font-size: 48px;
                    gap: 8px;
                    animation: fadeUp 0.6s ease-out;
                ">
                    <div style="font-size: 60px;">✔</div>
                    <div style="font-size: 16px;">Thành công!</div>
                </div>
                <style>
                    @keyframes fadeUp {
                        0% { opacity: 0; transform: translate(-50%, -30%) scale(0.9); }
                        100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    }
                </style>
            `;
                modalContent.appendChild(successDiv);

                // Ẩn form tạm thời
                const formEl = modalContent.querySelector('form') as HTMLElement;
                if (formEl) formEl.style.opacity = '0.2';

                // Xóa hiệu ứng và đóng modal sau 1.5s
                setTimeout(() => {
                    successDiv.remove();
                    setModalOpen(false);
                    form.resetFields();
                }, 1500);
            }
        } catch (err: any) {
            message.error(err.response?.data?.message || 'Lỗi khi lưu dữ liệu!');
        }
    };

    //  Xóa sân
    const handleDelete = async (id: string) => {
        Modal.confirm({
            title: 'Xác nhận xóa sân?',
            okText: 'Xóa',
            cancelText: 'Hủy',
            okButtonProps: { danger: true },
            async onOk() {
                try {
                    await api.delete(`/courts/${id}`);
                    message.success('Xóa sân thành công!');
                    fetchCourts();
                } catch {
                    message.error('Xóa sân thất bại!');
                }
            },
        });
    };

    //  Cấu hình bảng
    const columns = [
        {
            title: 'Ảnh',
            dataIndex: 'images',
            render: (images: string[]) =>
                images?.length ? (
                    <Image src={images[0]} width={80} height={60} style={{ borderRadius: 6 }} />
                ) : (
                    '—'
                ),
        },
        { title: 'Mã sân', dataIndex: 'code' },
        { title: 'Tên sân', dataIndex: 'name' },
        {
            title: 'Loại sân',
            dataIndex: 'type',
            render: (type: string) => (
                <Tag color={type === 'vip' ? 'purple' : type === 'outdoor' ? 'blue' : 'green'}>
                    {TYPE_LABEL[type as keyof typeof TYPE_LABEL]}
                </Tag>
            ),
        },

        {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (status: string) => (
                <Tag color={STATUS_PROPS[status as keyof typeof STATUS_PROPS].color}>
                    {STATUS_PROPS[status as keyof typeof STATUS_PROPS].label}
                </Tag>
            ),
        },
        {
            title: 'Định dạng sân',
            dataIndex: 'formats',
            render: (formats?: string[] | string) => {
                const list = Array.isArray(formats)
                    ? formats
                    : typeof formats === 'string'
                    ? formats.split(',').map((f) => f.trim())
                    : [];

                return list.length > 0 ? (
                    <Space wrap>
                        {list.map((f, i) => (
                            <Tag
                                key={i}
                                color='geekblue'
                                style={{ borderRadius: 6, fontWeight: 500 }}
                            >
                                {f}
                            </Tag>
                        ))}
                    </Space>
                ) : (
                    <span style={{ color: '#9ca3af' }}>—</span>
                );
            },
        },
        {
            title: 'Giá thường',
            dataIndex: 'basePrice',
            key: 'basePrice',
            render: (price: number) => {
                if (typeof price !== 'number') return '—';

                const formatted = price.toLocaleString('vi-VN', { minimumFractionDigits: 0 });

                // Xác định màu theo mức giá
                const color =
                    price < 1_000_000
                        ? '#16a34a' // xanh
                        : price <= 2_000_000
                        ? '#f59e0b' // cam
                        : '#dc2626'; // đỏ

                return (
                    <motion.span
                        key={price} // animation trigger khi giá thay đổi
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        style={{ color, fontWeight: 600 }}
                    >
                        {formatted}
                        <span style={{ color: '#6b7280', marginLeft: 4 }}>VNĐ</span>
                    </motion.span>
                );
            },
        },
        {
            title: 'Giá cao điểm',
            dataIndex: 'peakPrice',
            key: 'peakPrice',
            render: (price: number) => {
                if (typeof price !== 'number') return '—';

                const formatted = price.toLocaleString('vi-VN', { minimumFractionDigits: 0 });

                const color =
                    price < 1_000_000 ? '#16a34a' : price <= 2_000_000 ? '#f59e0b' : '#dc2626';

                return (
                    <motion.span
                        key={price}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        style={{ color, fontWeight: 600 }}
                    >
                        {formatted}
                        <span style={{ color: '#6b7280', marginLeft: 4 }}>VNĐ</span>
                    </motion.span>
                );
            },
        },
        {
            title: 'Tiện nghi',
            dataIndex: 'amenities',
            key: 'amenities',
            render: (amenities?: string[]) =>
                amenities && amenities.length > 0 ? (
                    <Space wrap>
                        {amenities.map((item, i) => (
                            <motion.div
                                key={i}
                                whileHover={{
                                    scale: 1.08,
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                                }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 250,
                                    damping: 15,
                                }}
                                style={{ display: 'inline-block', borderRadius: 8 }}
                            >
                                <Tag
                                    color='geekblue'
                                    style={{
                                        borderRadius: 6,
                                        cursor: 'default',
                                        userSelect: 'none',
                                        fontWeight: 500,
                                    }}
                                >
                                    {item}
                                </Tag>
                            </motion.div>
                        ))}
                    </Space>
                ) : (
                    <span style={{ color: '#9ca3af' }}>—</span>
                ),
        },
        {
            title: 'Vị trí',
            dataIndex: 'location',
            key: 'location',
            render: (loc: string) => loc || '—',
        },

        {
            title: 'Thao tác',
            key: 'actions',
            render: (_: any, record: Court) => (
                <Space>
                    <Button icon={<EyeOutlined />} onClick={() => handleView(record._id!)} />
                    {/* <Button
                        icon={<EditOutlined />}
                        type='primary'
                        onClick={() => openModal(record)}
                    /> */}
                    <Button
                        icon={<EditOutlined />}
                        type='primary'
                        onClick={() => navigate(`/admin/courts/update/${record._id}`)}
                    />

                    <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record._id!)}
                    />
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2>Quản lý sân</h2>
                <Button type='primary' icon={<PlusOutlined />} onClick={() => openModal()}>
                    Thêm sân
                </Button>
            </div>

            <Table
                rowKey='_id'
                columns={columns as any}
                dataSource={courts}
                loading={loading}
                bordered
                pagination={{ pageSize: 6 }}
            />

            {/* Modal Thêm / Sửa sân */}

            <Modal
                title={editingCourt ? 'Sửa thông tin sân' : 'Thêm sân mới'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
                width={700}
            >
                <motion.div
                    key='form-motion'
                    animate={{ x: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                >
                    <Form
                        form={form}
                        layout='vertical'
                        initialValues={{ type: 'indoor', status: 'active', amenities: '' }}
                        onFinishFailed={() => {
                            const modal = document.querySelector('.ant-modal-content');
                            if (modal) {
                                modal.animate(
                                    [
                                        { transform: 'translateX(0)' },
                                        { transform: 'translateX(-8px)' },
                                        { transform: 'translateX(8px)' },
                                        { transform: 'translateX(0)' },
                                    ],
                                    { duration: 300, easing: 'ease-in-out' }
                                );
                            }
                        }}
                        onFinish={handleSubmit}
                    >
                        <Form.Item
                            name='code'
                            label={
                                <>
                                    Mã sân&nbsp;
                                    <span
                                        title='Mã duy nhất của sân, ví dụ: S001'
                                        style={{ cursor: 'help', color: '#888' }}
                                    >
                                        ⓘ
                                    </span>
                                </>
                            }
                            rules={[{ required: true, message: 'Vui lòng nhập mã sân!' }]}
                        >
                            <Input placeholder='Nhập mã sân (ví dụ: S001)' />
                        </Form.Item>

                        <Form.Item
                            name='name'
                            label={
                                <>
                                    Tên sân&nbsp;
                                    <span
                                        title='Tên hiển thị của sân, ví dụ: Sân A1 hoặc Mira Court'
                                        style={{ cursor: 'help', color: '#888' }}
                                    >
                                        ⓘ
                                    </span>
                                </>
                            }
                            rules={[{ required: true, message: 'Vui lòng nhập tên sân!' }]}
                        >
                            <Input placeholder='Nhập tên sân' />
                        </Form.Item>

                        <Space size='large' style={{ width: '100%' }}>
                            <Form.Item
                                name='type'
                                label={
                                    <>
                                        Loại sân&nbsp;
                                        <span
                                            title='Phân loại sân: Trong nhà, Ngoài trời hoặc VIP'
                                            style={{ cursor: 'help', color: '#888' }}
                                        >
                                            ⓘ
                                        </span>
                                    </>
                                }
                                rules={[{ required: true, message: 'Vui lòng chọn loại sân!' }]}
                                style={{ flex: 1 }}
                            >
                                <Select placeholder='Chọn loại sân'>
                                    <Option value='indoor'>Trong nhà</Option>
                                    <Option value='outdoor'>Ngoài trời</Option>
                                    <Option value='vip'>VIP</Option>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name='status'
                                label={
                                    <>
                                        Trạng thái&nbsp;
                                        <span
                                            title='Tình trạng hoạt động của sân'
                                            style={{ cursor: 'help', color: '#888' }}
                                        >
                                            ⓘ
                                        </span>
                                    </>
                                }
                                rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}
                                style={{ flex: 1 }}
                            >
                                <Select placeholder='Chọn trạng thái'>
                                    <Option value='active'>Hoạt động</Option>
                                    <Option value='maintenance'>Bảo trì</Option>
                                    <Option value='locked'>Khóa</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item
                                name='formats'
                                label='Định dạng sân'
                                style={{ flex: 1 }}
                                rules={[
                                    { required: true, message: 'Vui lòng chọn định dạng sân!' },
                                ]}
                            >
                                <Select mode='multiple' placeholder='Chọn định dạng sân' allowClear>
                                    <Option value='5v5'>5v5</Option>
                                    <Option value='7v7'>7v7</Option>
                                    <Option value='9v9'>9v9</Option>
                                    <Option value='11v11'>11v11</Option>
                                </Select>
                            </Form.Item>
                        </Space>

                        <Space size='large' style={{ width: '100%' }}>
                            <Form.Item
                                name='basePrice'
                                label={
                                    <>
                                        Giá thường (VNĐ)&nbsp;
                                        <span
                                            title='Giá thuê sân trong khung giờ bình thường'
                                            style={{ cursor: 'help', color: '#888' }}
                                        >
                                            ⓘ
                                        </span>
                                    </>
                                }
                                rules={[
                                    { required: true, message: 'Vui lòng nhập giá thường!' },
                                    { type: 'number', min: 0, message: 'Giá thường phải >= 0' },
                                ]}
                                style={{ flex: 1 }}
                            >
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={0}
                                    placeholder='Nhập giá thường'
                                    formatter={(v?: string | number) =>
                                        v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''
                                    }
                                    parser={(v?: string) => (v ? v.replace(/,/g, '') : '')}
                                />
                            </Form.Item>

                            <Form.Item
                                name='peakPrice'
                                label={
                                    <>
                                        Giá cao điểm (VNĐ)&nbsp;
                                        <span
                                            title='Giá thuê sân trong khung giờ cao điểm (thường buổi tối)'
                                            style={{ cursor: 'help', color: '#888' }}
                                        >
                                            ⓘ
                                        </span>
                                    </>
                                }
                                rules={[
                                    { required: true, message: 'Vui lòng nhập giá cao điểm!' },
                                    { type: 'number', min: 0, message: 'Giá cao điểm phải >= 0' },
                                ]}
                                style={{ flex: 1 }}
                            >
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={0}
                                    placeholder='Nhập giá cao điểm'
                                    formatter={(v?: string | number) =>
                                        v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''
                                    }
                                    parser={(v?: string) => (v ? v.replace(/,/g, '') : '')}
                                />
                            </Form.Item>
                        </Space>

                        <Form.Item
                            name='description'
                            label={
                                <>
                                    Mô tả&nbsp;
                                    <span
                                        title='Ghi chú hoặc mô tả chi tiết về sân (tùy chọn)'
                                        style={{ cursor: 'help', color: '#888' }}
                                    >
                                        ⓘ
                                    </span>
                                </>
                            }
                        >
                            <Input.TextArea rows={3} placeholder='Nhập mô tả về sân (tùy chọn)' />
                        </Form.Item>

                        <Form.Item
                            name='amenities'
                            label={
                                <>
                                    Tiện nghi&nbsp;
                                    <span
                                        title='Danh sách tiện nghi, ngăn cách bằng dấu phẩy (ví dụ: Wifi, Đỗ xe, Nhà tắm)'
                                        style={{ cursor: 'help', color: '#888' }}
                                    >
                                        ⓘ
                                    </span>
                                </>
                            }
                        >
                            <Input placeholder='VD: Wifi, Đỗ xe, Nhà tắm' />
                        </Form.Item>
                        <Form.Item
                            name='location'
                            label={
                                <>
                                    Vị trí sân&nbsp;
                                    <span
                                        title='Địa chỉ hoặc khu vực của sân (ví dụ: Quận 7, TP. Hồ Chí Minh)'
                                        style={{ cursor: 'help', color: '#888' }}
                                    >
                                        ⓘ
                                    </span>
                                </>
                            }
                            rules={[{ required: true, message: 'Vui lòng nhập vị trí sân!' }]}
                        >
                            <Input placeholder='Nhập địa chỉ hoặc khu vực sân' />
                        </Form.Item>

                        <Form.Item
                            label={
                                <>
                                    Hình ảnh&nbsp;
                                    <span
                                        title='Tải lên tối đa 10 ảnh minh họa cho sân'
                                        style={{ cursor: 'help', color: '#888' }}
                                    >
                                        ⓘ
                                    </span>
                                </>
                            }
                        >
                            <Upload
                                listType='picture-card'
                                fileList={fileList}
                                beforeUpload={() => false}
                                onChange={({ fileList }) => setFileList(fileList)}
                                onRemove={(file) => {
                                    setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
                                }}
                                accept='image/*'
                                multiple
                            >
                                {fileList.length < 10 && (
                                    <div>
                                        <UploadOutlined />
                                        <div style={{ marginTop: 8 }}>Chọn ảnh</div>
                                    </div>
                                )}
                            </Upload>
                        </Form.Item>

                        {/* Footer Buttons */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 8,
                                marginTop: 8,
                            }}
                        >
                            <Button onClick={() => form.resetFields()}>Làm mới</Button>
                            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
                            <Button
                                type='primary'
                                onClick={() => form.submit()}
                                style={{ backgroundColor: '#1677ff' }}
                            >
                                {editingCourt ? 'Cập nhật' : 'Thêm mới'}
                            </Button>
                        </div>
                    </Form>
                </motion.div>
            </Modal>

            {/*Modal xem chi tiết */}
            <AnimatePresence mode='wait'>
                {detailModal && (
                    <motion.div
                        key='modal-overlay'
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.45)',
                            backdropFilter: 'blur(6px)',
                            WebkitBackdropFilter: 'blur(6px)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <motion.div
                            key='modal-content'
                            initial={{ opacity: 0, y: 60, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{
                                opacity: 0,
                                y: 50,
                                scale: 0.95,
                                transition: { duration: 0.25, ease: 'easeInOut' },
                            }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            style={{
                                background: '#fff',
                                borderRadius: 16,
                                width: 850,
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                padding: 24,
                                boxShadow: '0 20px 45px rgba(0,0,0,0.25)',
                            }}
                        >
                            {/* Header */}
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 20,
                                }}
                            >
                                <h2 style={{ margin: 0 }}>
                                    {selectedCourt ? selectedCourt.name : 'Chi tiết sân'}
                                </h2>
                                <Button
                                    type='text'
                                    onClick={() => setDetailModal(false)}
                                    style={{
                                        color: '#666',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = '#1677ff')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                                >
                                    Đóng
                                </Button>
                            </div>

                            {/* Nội dung chính */}
                            <AnimatePresence mode='wait'>
                                {detailLoading ? (
                                    <motion.div
                                        key='loading'
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <Skeleton active paragraph={{ rows: 10 }} />
                                    </motion.div>
                                ) : selectedCourt ? (
                                    <motion.div
                                        key='detail'
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -30 }}
                                        transition={{ duration: 0.35 }}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1.2fr 0.8fr',
                                            gap: 16,
                                        }}
                                    >
                                        {/* Thông tin */}
                                        <div
                                            style={{
                                                padding: 16,
                                                border: '1px solid #f0f0f0',
                                                borderRadius: 12,
                                                background: '#fff',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '140px 1fr',
                                                    rowGap: 10,
                                                }}
                                            >
                                                <div style={{ color: '#6b7280' }}>Mã sân</div>
                                                <div style={{ fontWeight: 600 }}>
                                                    {selectedCourt.code}
                                                </div>
                                                <div style={{ color: '#6b7280' }}>Loại sân</div>
                                                <div>
                                                    <Tag
                                                        color={
                                                            selectedCourt.type === 'vip'
                                                                ? 'purple'
                                                                : selectedCourt.type === 'outdoor'
                                                                ? 'blue'
                                                                : 'green'
                                                        }
                                                    >
                                                        {TYPE_LABEL[selectedCourt.type]}
                                                    </Tag>
                                                </div>
                                                <div style={{ color: '#6b7280' }}>
                                                    Định dạng sân
                                                </div>
                                                <div>
                                                    {(() => {
                                                        const formatsValue =
                                                            selectedCourt?.formats as
                                                                | string[]
                                                                | string
                                                                | undefined;

                                                        const list: string[] = Array.isArray(
                                                            formatsValue
                                                        )
                                                            ? formatsValue
                                                            : typeof formatsValue === 'string'
                                                            ? formatsValue
                                                                  .split(',')
                                                                  .map((f: string) => f.trim())
                                                            : [];

                                                        return list.length > 0 ? (
                                                            <Space wrap>
                                                                {list.map(
                                                                    (f: string, i: number) => (
                                                                        <Tag
                                                                            key={i}
                                                                            color='geekblue'
                                                                        >
                                                                            {f}
                                                                        </Tag>
                                                                    )
                                                                )}
                                                            </Space>
                                                        ) : (
                                                            <span>—</span>
                                                        );
                                                    })()}
                                                </div>

                                                <div style={{ color: '#6b7280' }}>Giá thường</div>
                                                <div style={{ fontWeight: 600 }}>
                                                    {fmtVND(selectedCourt.basePrice)}
                                                </div>
                                                <div style={{ color: '#6b7280' }}>Giá cao điểm</div>
                                                <div style={{ fontWeight: 600 }}>
                                                    {fmtVND(selectedCourt.peakPrice)}
                                                </div>
                                                <div style={{ color: '#6b7280' }}>Trạng thái</div>
                                                <div>
                                                    <Tag
                                                        color={
                                                            STATUS_PROPS[selectedCourt.status].color
                                                        }
                                                    >
                                                        {STATUS_PROPS[selectedCourt.status].label}
                                                    </Tag>
                                                </div>
                                                <div style={{ color: '#6b7280' }}>Vị trí</div>
                                                <div>{selectedCourt.location || '—'}</div>

                                                <div style={{ color: '#6b7280' }}>Tiện nghi</div>
                                                <div>
                                                    {selectedCourt.amenities?.length ? (
                                                        <Space wrap>
                                                            {selectedCourt.amenities.map((a, i) => (
                                                                <Tag key={i} color='geekblue'>
                                                                    {a}
                                                                </Tag>
                                                            ))}
                                                        </Space>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </div>
                                                <div style={{ color: '#6b7280' }}>Mô tả</div>
                                                <div>{selectedCourt.description || '—'}</div>
                                            </div>
                                        </div>

                                        {/* Hình ảnh với hover zoom */}
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.15 }}
                                            style={{
                                                padding: 16,
                                                border: '1px solid #f0f0f0',
                                                borderRadius: 12,
                                                background: '#fff',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    color: '#8c8c8c',
                                                    marginBottom: 8,
                                                    fontSize: 13,
                                                }}
                                            >
                                                Thư viện ảnh
                                            </div>
                                            {selectedCourt.images?.length ? (
                                                <Image.PreviewGroup>
                                                    <div
                                                        style={{
                                                            display: 'grid',
                                                            gridTemplateColumns:
                                                                'repeat(auto-fill, minmax(180px, 1fr))',
                                                            gap: 12,
                                                        }}
                                                    >
                                                        {selectedCourt.images.map((url, i) => (
                                                            <motion.div
                                                                key={i}
                                                                whileHover={{
                                                                    scale: 1.05,
                                                                    boxShadow:
                                                                        '0 8px 20px rgba(0,0,0,0.15)',
                                                                }}
                                                                transition={{
                                                                    type: 'spring',
                                                                    stiffness: 220,
                                                                    damping: 15,
                                                                }}
                                                                style={{
                                                                    overflow: 'hidden',
                                                                    borderRadius: 10,
                                                                    cursor: 'pointer',
                                                                    background: '#fafafa',
                                                                }}
                                                            >
                                                                <Image
                                                                    src={url}
                                                                    width='100%'
                                                                    height={130}
                                                                    style={{
                                                                        objectFit: 'cover',
                                                                        borderRadius: 10,
                                                                        transition:
                                                                            'transform 0.3s ease',
                                                                    }}
                                                                />
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                </Image.PreviewGroup>
                                            ) : (
                                                <div
                                                    style={{
                                                        height: 160,
                                                        border: '1px dashed #d9d9d9',
                                                        borderRadius: 10,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#9ca3af',
                                                    }}
                                                >
                                                    Chưa có hình ảnh
                                                </div>
                                            )}
                                        </motion.div>
                                    </motion.div>
                                ) : (
                                    <p>Không tìm thấy dữ liệu sân.</p>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CourtManagement;
