import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Form,
    Input,
    Select,
    InputNumber,
    Button,
    Upload,
    message,
    Space,
    Image,
    Skeleton,
    Divider,
} from 'antd';
import {
    UploadOutlined,
    ArrowLeftOutlined,
    TrophyOutlined,
    CheckCircleOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import imageCompression from 'browser-image-compression';
import api from '../../../common/utils/api.ts';

const { Option } = Select;

const CourtUpdate: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [resetLoading, setResetLoading] = useState(false);

    // Lấy dữ liệu sân theo ID
    useEffect(() => {
        (async () => {
            try {
                const res = await api.get(`/courts/${id}`);
                const court = res.data.data;
                form.setFieldsValue({
                    ...court,
                    amenities: court.amenities?.join(', '),
                });
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

    // Reset form
    const handleReset = async () => {
        setResetLoading(true);
        form.resetFields();
        await new Promise((r) => setTimeout(r, 400)); // chờ icon quay nhẹ
        setResetLoading(false);
        message.success({
            content: 'Form đã được làm mới!',
            duration: 1.5,
            style: { marginTop: '8vh' },
        });
    };
    // Submit form
    const handleSubmit = async () => {
        try {
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

            message.success({
                content: 'Cập nhật sân thành công!',
                duration: 1.8,
            });
            navigate('/admin/courts');
        } catch (err: any) {
            message.error(err.response?.data?.message || 'Lỗi khi cập nhật!');
        }
    };

    if (loading)
        return (
            <div style={{ background: '#fff', padding: 24, borderRadius: 10 }}>
                <Skeleton active paragraph={{ rows: 8 }} />
            </div>
        );

    return (
        <div
            style={{
                background: '#fff',
                padding: '32px 40px',
                borderRadius: 16,
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                maxWidth: 900,
                margin: '0 auto',
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                }}
            >
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/admin/courts')}
                    type='text'
                    style={{
                        fontWeight: 500,
                        color: '#555',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#1677ff')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
                >
                    Quay lại
                </Button>

                <h2 style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                    <TrophyOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                    Cập nhật sân bóng
                </h2>
                <div />
            </div>

            <Divider style={{ margin: '12px 0 28px 0' }} />

            {/* Form */}
            <Form
                form={form}
                layout='vertical'
                initialValues={{ type: 'indoor', status: 'active' }}
                onFinish={handleSubmit}
                requiredMark={false} // ❗ Bỏ dòng “Please enter …”
                validateMessages={{ required: '' }} // ❗ Không hiển thị message dưới input
            >
                <Form.Item name='code' label='Mã sân' rules={[{ required: true }]}>
                    <Input placeholder='Mã sân' />
                </Form.Item>
                <Form.Item name='name' label='Tên sân' rules={[{ required: true }]}>
                    <Input placeholder='Tên sân bóng' />
                </Form.Item>

                <Space size='large' style={{ width: '100%' }}>
                    <Form.Item
                        name='type'
                        label='Loại sân'
                        style={{ flex: 1 }}
                        rules={[{ required: true }]}
                    >
                        <Select>
                            <Option value='indoor'>Trong nhà</Option>
                            <Option value='outdoor'>Ngoài trời</Option>
                            <Option value='vip'>VIP</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name='status'
                        label='Trạng thái'
                        style={{ flex: 1 }}
                        rules={[{ required: true }]}
                    >
                        <Select>
                            <Option value='active'>Hoạt động</Option>
                            <Option value='maintenance'>Bảo trì</Option>
                            <Option value='locked'>Khóa</Option>
                        </Select>
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
                        name='formats'
                        label={
                            <>
                                Định dạng sân&nbsp;
                                <span
                                    title='Chọn định dạng sân bóng (VD: 5v5, 7v7, 11v11)'
                                    style={{ cursor: 'help', color: '#888' }}
                                >
                                    ⓘ
                                </span>
                            </>
                        }
                        rules={[{ required: true, message: 'Vui lòng chọn định dạng sân!' }]}
                        style={{ flex: 1 }}
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
                        label='Giá thường (VNĐ)'
                        style={{ flex: 1 }}
                        rules={[{ required: true }]}
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
                        label='Giá cao điểm (VNĐ)'
                        style={{ flex: 1 }}
                        rules={[{ required: true }]}
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

                <Form.Item name='description' label='Mô tả'>
                    <Input.TextArea rows={3} placeholder='Nhập mô tả chi tiết về sân...' />
                </Form.Item>

                <Form.Item name='amenities' label='Tiện nghi'>
                    <Input placeholder='VD: Wifi, Đỗ xe, Nhà tắm' />
                </Form.Item>

                <Form.Item label='Hình ảnh'>
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
                    >
                        {fileList.length < 10 && (
                            <div>
                                <UploadOutlined />
                                <div style={{ marginTop: 8 }}>Chọn ảnh</div>
                            </div>
                        )}
                    </Upload>
                    {fileList.length > 0 && (
                        <Image.PreviewGroup>
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 10,
                                    marginTop: 12,
                                }}
                            >
                                {fileList.map((f, i) => (
                                    <Image
                                        key={i}
                                        src={f.url || URL.createObjectURL(f.originFileObj)}
                                        width={120}
                                        height={90}
                                        style={{
                                            objectFit: 'cover',
                                            borderRadius: 8,
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                        }}
                                    />
                                ))}
                            </div>
                        </Image.PreviewGroup>
                    )}
                </Form.Item>

                {/* Buttons */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 12,
                        marginTop: 24,
                    }}
                >
                    <Button
                        icon={<ReloadOutlined spin={resetLoading} />} // 👈 icon quay khi nhấn
                        onClick={handleReset}
                        loading={resetLoading}
                        style={{
                            borderColor: '#1677ff',
                            color: '#1677ff',
                            fontWeight: 500,
                        }}
                    >
                        Làm mới
                    </Button>

                    <Button onClick={() => navigate('/admin/courts')}>Hủy</Button>
                    <Button
                        type='primary'
                        htmlType='submit'
                        icon={<CheckCircleOutlined />}
                        style={{
                            background: 'linear-gradient(90deg,#1677ff,#3b82f6)',
                            border: 'none',
                            fontWeight: 500,
                        }}
                    >
                        Cập nhật
                    </Button>
                </div>
            </Form>
        </div>
    );
};

export default CourtUpdate;
