import { useEffect, useState } from "react";
import { Form, message } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import api from "@/common/utils/api";
import { DISCOUNT_TYPES, VOUCHER_STATUS } from "@/common/constants/enums";
import type { DiscountType, VoucherStatus } from "@/common/constants/enums";

export interface VoucherFormValues {
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountValue?: number;
  minOrderValue?: number;
  totalIssued: number;
  perUserLimit: number;
  timeRange: [Dayjs, Dayjs];
  applicableCourtIds?: string[];
  status: boolean;
}

const useVoucherForm = () => {
  const [form] = Form.useForm<VoucherFormValues>();
  const [courts, setCourts] = useState<
    { _id: string; name: string; type: string }[]
  >([]);
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const discountType =
    (Form.useWatch("discountType", form) as DiscountType | undefined) ??
    DISCOUNT_TYPES.PERCENT;

  useEffect(() => {
    const fetchCourts = async () => {
      try {
        setLoadingCourts(true);
        const res = await api.get("/courts", { params: { status: "active" } });
        const data = res.data?.data || res.data || [];
        setCourts(data);
      } catch (error: any) {
        toast.error(error?.message || "Không thể tải danh sách sân!");
      } finally {
        setLoadingCourts(false);
      }
    };

    fetchCourts();
  }, []);

  useEffect(() => {
    if (
      discountType === DISCOUNT_TYPES.AMOUNT &&
      form.getFieldValue("maxDiscountValue")
    ) {
      form.setFieldsValue({ maxDiscountValue: undefined });
    }
  }, [discountType, form]);

  const disabledPastDate = (current: Dayjs) =>
    current && current < dayjs().startOf("day");

  const handleSubmit = async (values: VoucherFormValues) => {
    if (!values.timeRange?.length) {
      toast.error("Vui lòng chọn thời gian áp dụng!");
      return;
    }

    const [start, end] = values.timeRange;

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
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      applicableCourtIds:
        values.applicableCourtIds && values.applicableCourtIds.length > 0
          ? values.applicableCourtIds
          : undefined,
      status: (values.status
        ? VOUCHER_STATUS.ACTIVE
        : VOUCHER_STATUS.INACTIVE) as VoucherStatus,
    };

    setSubmitting(true);
    try {
      const res = await api.post("/vouchers", payload);
      const voucherData = res.data?.data || res.data;

      // Thông báo thành công với thông tin chi tiết
      const voucherCode = voucherData?.code || values.code.toUpperCase();
      const discountText =
        values.discountType === DISCOUNT_TYPES.PERCENT
          ? `Giảm ${
              values.discountValue
            }% (tối đa ${values.maxDiscountValue?.toLocaleString("vi-VN")}đ)`
          : `Giảm ${values.discountValue.toLocaleString("vi-VN")}đ`;

      // Toast notification với thông tin chi tiết
      toast.success(
        ` Tạo voucher thành công!\n` +
          `Mã: ${voucherCode}\n` +
          `Số lượng: ${values.totalIssued} lượt\n` +
          `Giá trị: ${discountText}`,
        {
          autoClose: 5000,
          style: {
            whiteSpace: "pre-line",
          },
        }
      );

      // Ant Design notification
      message.success({
        content: `Voucher "${voucherCode}" đã được tạo thành công!`,
        duration: 4,
      });

      form.resetFields();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể tạo voucher, vui lòng thử lại.";
      toast.error(errorMessage, {
        autoClose: 4000,
      });
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const initialValues: Partial<VoucherFormValues> = {
    discountType: DISCOUNT_TYPES.PERCENT,
    status: true,
    minOrderValue: 0,
  };

  return {
    form,
    courts,
    loadingCourts,
    submitting,
    discountType,
    disabledPastDate,
    handleSubmit,
    initialValues,
  };
};

export default useVoucherForm;
