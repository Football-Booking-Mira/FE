import React, { useEffect, useState } from "react";
import { Form, Row, Space, Typography, Spin, message } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import VoucherFormFields from "./components/VoucherFormFields";
import useVoucherForm, { VoucherFormValues } from "./hooks/useVoucherForm";
import api from "@/common/utils/api";
import { DISCOUNT_TYPES, VOUCHER_STATUS } from "@/common/constants/enums";

const { Title } = Typography;

const VoucherEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    form,
    discountType,
    loadingCourts,
    submitting,
    courts,
    disabledPastDate,
    initialValues,
  } = useVoucherForm();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVoucher = async () => {
      if (!id) {
        toast.error("Không tìm thấy ID voucher!");
        navigate("/admin/vouchers");
        return;
      }

      try {
        setLoading(true);
        const res = await api.get(`/vouchers/${id}`);
        const voucher = res.data?.data || res.data;

        if (!voucher) {
          toast.error("Không tìm thấy voucher!");
          navigate("/admin/vouchers");
          return;
        }

        // Format dữ liệu để điền vào form
        form.setFieldsValue({
          code: voucher.code,
          description: voucher.description || "",
          discountType: voucher.discountType,
          discountValue: voucher.discountValue,
          maxDiscountValue: voucher.maxDiscountValue,
          minOrderValue: voucher.minOrderValue || 0,
          totalIssued: voucher.totalIssued,
          perUserLimit: voucher.perUserLimit,
          startDate: dayjs(voucher.startDate),
          endDate: dayjs(voucher.endDate),
          applicableCourtIds: voucher.applicableCourtIds || [],
          status: voucher.status === VOUCHER_STATUS.ACTIVE,
        });
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.message ||
          error?.message ||
          "Không thể tải thông tin voucher";
        toast.error(errorMessage);
        navigate("/admin/vouchers");
      } finally {
        setLoading(false);
      }
    };

    fetchVoucher();
  }, [id, form, navigate]);

  const handleSubmit = async (values: VoucherFormValues) => {
    if (!id) {
      toast.error("Không tìm thấy ID voucher!");
      return;
    }

    if (!values.startDate || !values.endDate) {
      toast.error("Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc!");
      return;
    }

    if (values.endDate.valueOf() <= values.startDate.valueOf()) {
      toast.error("Ngày kết thúc phải sau ngày bắt đầu!");
      return;
    }

    const payload = {
      code: values.code.trim(),
      description: values.description?.trim() || "",
      discountType: values.discountType,
      discountValue: Number(values.discountValue),
      maxDiscountValue:
        values.discountType === DISCOUNT_TYPES.PERCENT
          ? Number(values.maxDiscountValue)
          : undefined,
      minOrderValue: Number(values.minOrderValue ?? 0),
      totalIssued: Number(values.totalIssued),
      perUserLimit: Number(values.perUserLimit),
      startDate: values.startDate.toISOString(),
      endDate: values.endDate.toISOString(),
      applicableCourtIds:
        values.applicableCourtIds && values.applicableCourtIds.length > 0
          ? values.applicableCourtIds
          : undefined,
      status: values.status ? VOUCHER_STATUS.ACTIVE : VOUCHER_STATUS.INACTIVE,
    };

    try {
      const res = await api.put(`/vouchers/${id}`, payload);
      const voucherData = res.data?.data || res.data;

      const voucherCode = voucherData?.code || values.code.toUpperCase();
      toast.success(`Cập nhật voucher "${voucherCode}" thành công!`);
      message.success("Cập nhật voucher thành công!");

      navigate("/admin/vouchers");
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể cập nhật voucher, vui lòng thử lại.";
      toast.error(errorMessage);
      message.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <div>
        <Title level={3}>Sửa voucher</Title>
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

export default VoucherEdit;

