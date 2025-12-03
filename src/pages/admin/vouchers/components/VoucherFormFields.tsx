import React from 'react';
import { Card, Col, Form, Input, InputNumber, Row, Select, Space, Switch, DatePicker, Button } from 'antd';
import type { FormInstance } from 'antd';
import type { Dayjs } from 'dayjs';
import { DISCOUNT_TYPES } from '@/common/constants/enums';
import type { VoucherFormValues } from '../hooks/useVoucherForm';

const { TextArea } = Input;

interface VoucherFormFieldsProps {
    form: FormInstance<VoucherFormValues>;
    discountType: string;
    loadingCourts: boolean;
    submitting: boolean;
    courts: { _id: string; name: string; type: string }[];
    disabledPastDate: (current: Dayjs) => boolean;
}

const VoucherFormFields: React.FC<VoucherFormFieldsProps> = ({
    form,
    discountType,
    loadingCourts,
    submitting,
    courts,
    disabledPastDate,
}) => (
    <Col span={24}>
        <Card title='Nhập thông tin' bordered>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        label='Mã voucher'
                        name='code'
                        rules={[
                            { required: true, message: 'Vui lòng nhập mã voucher!' },
                            { min: 3, message: 'Mã voucher phải có ít nhất 3 ký tự!' },
                            { max: 30, message: 'Mã voucher tối đa 30 ký tự!' },
                            {
                                pattern: /^[A-Za-z0-9_-]+$/,
                                message: 'Chỉ chấp nhận chữ, số, - hoặc _!',
                            },
                        ]}
                        normalize={(val) => (val ? val.toUpperCase().trim() : '')}
                    >
                        <Input placeholder='VD: SUMMER50' maxLength={30} />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label='Loại giảm'
                        name='discountType'
                        rules={[{ required: true, message: 'Vui lòng chọn loại giảm!' }]}
                    >
                        <Select
                            options={[
                                { value: DISCOUNT_TYPES.PERCENT, label: 'Giảm theo %' },
                                { value: DISCOUNT_TYPES.AMOUNT, label: 'Giảm theo số tiền' },
                            ]}
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        label='Giá trị giảm'
                        name='discountValue'
                        rules={[
                            { required: true, message: 'Vui lòng nhập giá trị giảm!' },
                            {
                                validator: (_, value) => {
                                    if (value === undefined || value === null || value <= 0) {
                                        return Promise.reject(new Error('Giá trị giảm phải lớn hơn 0!'));
                                    }
                                    if (discountType === DISCOUNT_TYPES.PERCENT && value > 100) {
                                        return Promise.reject(new Error('Voucher % không được vượt quá 100!'));
                                    }
                                    return Promise.resolve();
                                },
                            },
                        ]}
                    >
                        <InputNumber
                            min={1}
                            max={discountType === DISCOUNT_TYPES.PERCENT ? 100 : undefined}
                            addonAfter={discountType === DISCOUNT_TYPES.PERCENT ? '%' : 'đ'}
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    {discountType === DISCOUNT_TYPES.PERCENT ? (
                        <Form.Item
                            label='Giá trị giảm tối đa'
                            name='maxDiscountValue'
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập giá trị giảm tối đa!',
                                },
                                {
                                    validator: (_, value) => {
                                        if (value === undefined || value === null || value <= 0) {
                                            return Promise.reject(
                                                new Error('Giá trị giảm tối đa phải lớn hơn 0!')
                                            );
                                        }
                                        return Promise.resolve();
                                    },
                                },
                            ]}
                        >
                            <InputNumber min={1} addonAfter='đ' style={{ width: '100%' }} />
                        </Form.Item>
                    ) : (
                        <Form.Item label='Giá trị giảm tối đa' help='Không áp dụng cho loại giảm tiền cố định'>
                            <Input disabled placeholder='Không yêu cầu' />
                        </Form.Item>
                    )}
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        label='Điều kiện tối thiểu đơn'
                        name='minOrderValue'
                        rules={[
                            {
                                type: 'number',
                                min: 0,
                                message: 'Điều kiện tối thiểu không được âm!',
                            },
                        ]}
                    >
                        <InputNumber min={0} addonAfter='đ' style={{ width: '100%' }} />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label='Trạng thái' name='status' valuePropName='checked'>
                        <Switch checkedChildren='Active' unCheckedChildren='Inactive' />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        label='Số lượng phát hành'
                        name='totalIssued'
                        rules={[
                            { required: true, message: 'Vui lòng nhập số lượng phát hành!' },
                            {
                                validator: (_, value) => {
                                    if (!value || value <= 0) {
                                        return Promise.reject(new Error('Số lượng phát hành phải lớn hơn 0!'));
                                    }
                                    return Promise.resolve();
                                },
                            },
                        ]}
                    >
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label='Giới hạn mỗi user'
                        name='perUserLimit'
                        dependencies={['totalIssued']}
                        rules={[
                            { required: true, message: 'Vui lòng nhập giới hạn mỗi user!' },
                            {
                                validator: (_, value) => {
                                    const total = form.getFieldValue('totalIssued');
                                    if (!value || value <= 0) {
                                        return Promise.reject(new Error('Giới hạn mỗi user phải lớn hơn 0!'));
                                    }
                                    if (total && value > total) {
                                        return Promise.reject(
                                            new Error('Giới hạn mỗi user không được lớn hơn số lượng phát hành!')
                                        );
                                    }
                                    return Promise.resolve();
                                },
                            },
                        ]}
                    >
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        label='Ngày bắt đầu'
                        name='startDate'
                        rules={[
                            { required: true, message: 'Vui lòng chọn ngày bắt đầu!' },
                        ]}
                    >
                        <DatePicker
                            format='DD/MM/YYYY'
                            style={{ width: '100%' }}
                            disabledDate={disabledPastDate}
                            placeholder='DD/MM/YYYY'
                        />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label='Ngày kết thúc'
                        name='endDate'
                        dependencies={['startDate']}
                        rules={[
                            { required: true, message: 'Vui lòng chọn ngày kết thúc!' },
                            {
                                validator: (_, value) => {
                                    if (!value) {
                                        return Promise.resolve();
                                    }
                                    const startDate = form.getFieldValue('startDate');
                                    if (startDate && value.valueOf() <= startDate.valueOf()) {
                                        return Promise.reject(
                                            new Error('Ngày kết thúc phải sau ngày bắt đầu!')
                                        );
                                    }
                                    return Promise.resolve();
                                },
                            },
                        ]}
                    >
                        <DatePicker
                            format='DD/MM/YYYY'
                            style={{ width: '100%' }}
                            disabledDate={(current) => {
                                if (disabledPastDate(current)) {
                                    return true;
                                }
                                const startDate = form.getFieldValue('startDate');
                                if (startDate && current && current.valueOf() < startDate.valueOf()) {
                                    return true;
                                }
                                return false;
                            }}
                            placeholder='DD/MM/YYYY'
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Form.Item label='Áp dụng cho sân (không bắt buộc)' name='applicableCourtIds'>
                <Select
                    mode='multiple'
                    loading={loadingCourts}
                    allowClear
                    placeholder='Chọn sân áp dụng (để trống nếu áp dụng cho tất cả)'
                    options={courts.map((court) => ({
                        label: `${court.name} • ${court.type}`,
                        value: court._id,
                    }))}
                    maxTagCount='responsive'
                />
            </Form.Item>

            <Form.Item label='Mô tả / ghi chú (optional)' name='description'>
                <TextArea rows={3} maxLength={255} showCount />
            </Form.Item>
        </Card>

        <Space style={{ marginTop: 16 }} size='middle'>
            <Button onClick={() => form.resetFields()}>Làm mới</Button>
            <Button type='primary' htmlType='submit' loading={submitting}>
                Lưu voucher
            </Button>
        </Space>
    </Col>
);

export default VoucherFormFields;

