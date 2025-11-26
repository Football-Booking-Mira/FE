import React from "react";
import { Form, Row, Space, Typography } from "antd";
import VoucherFormFields from "./components/VoucherFormFields";
import useVoucherForm, { VoucherFormValues } from "./hooks/useVoucherForm";

const { Title } = Typography;

const VoucherCreate: React.FC = () => {
  const {
    form,
    discountType,
    loadingCourts,
    submitting,
    courts,
    disabledPastDate,
    handleSubmit,
    initialValues,
  } = useVoucherForm();

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <div>
        <Title level={3}>Tạo voucher mới</Title>
      </div>

      <Form<VoucherFormValues>
        layout="vertical"
        form={form}
        initialValues={initialValues}
        onFinish={handleSubmit}
      >
        <Row gutter={32}>
          <VoucherFormFields
            form={form}
            discountType={discountType}
            loadingCourts={loadingCourts}
            submitting={submitting}
            courts={courts}
            disabledPastDate={disabledPastDate}
          />
        </Row>
      </Form>
    </Space>
  );
};

export default VoucherCreate;
