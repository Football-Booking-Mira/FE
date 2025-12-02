import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Input,
  Modal,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  message,
  Popconfirm,
} from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import api from "@/common/utils/api";
import { DISCOUNT_TYPES, VOUCHER_STATUS } from "@/common/constants/enums";

const { Title, Text } = Typography;
const { Search } = Input;

interface Voucher {
  _id: string;
  code: string;
  description?: string;
  discountType: string;
  discountValue: number;
  maxDiscountValue?: number;
  minOrderValue?: number;
  totalIssued: number;
  remainingQuantity: number;
  perUserLimit: number;
  startDate: string;
  endDate: string;
  status: string;
  usageCount: number;
  createdAt: string;
}

const formatCurrency = (value?: number) =>
  typeof value === "number" ? `${value.toLocaleString("vi-VN")} đ` : "0 đ";

const VoucherList: React.FC = () => {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");

  const fetchVouchers = useCallback(async (keyword?: string) => {
    try {
      setLoading(true);
      const res = await api.get("/vouchers", {
        params: keyword ? { q: keyword } : undefined,
      });
      const data = res.data?.data || res.data || [];
      setVouchers(data);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể tải danh sách voucher";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    fetchVouchers(value);
  };

  const handleDelete = async (voucherId: string, code: string) => {
    try {
      await api.delete(`/vouchers/${voucherId}`);
      toast.success(`Đã xóa voucher "${code}" thành công!`);
      message.success("Xóa voucher thành công!");
      fetchVouchers(searchKeyword);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể xóa voucher";
      toast.error(errorMessage);
      message.error(errorMessage);
    }
  };

  const columns = [
    {
      title: "Mã voucher",
      dataIndex: "code",
      key: "code",
      width: 150,
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: "Loại giảm",
      dataIndex: "discountType",
      key: "discountType",
      width: 120,
      render: (type: string, record: Voucher) => {
        if (type === DISCOUNT_TYPES.PERCENT) {
          return (
            <Text>
              {record.discountValue}%
              {record.maxDiscountValue
                ? ` (tối đa ${formatCurrency(record.maxDiscountValue)})`
                : ""}
            </Text>
          );
        }
        return <Text>{formatCurrency(record.discountValue)}</Text>;
      },
    },
    {
      title: "Số lượng",
      key: "quantity",
      width: 150,
      render: (_: any, record: Voucher) => (
        <Space direction="vertical" size={0}>
          <Text>
            Đã dùng: <Text strong>{record.totalIssued - record.remainingQuantity}</Text>
          </Text>
          <Text>
            Còn lại: <Text strong type="success">
              {record.remainingQuantity}
            </Text>
          </Text>
          <Text type="secondary">Tổng: {record.totalIssued}</Text>
        </Space>
      ),
    },
    {
      title: "Thời gian",
      key: "timeRange",
      width: 200,
      render: (_: any, record: Voucher) => (
        <Space direction="vertical" size={0}>
          <Text>
            Bắt đầu:{" "}
            {record.startDate
              ? dayjs(record.startDate).format("DD/MM/YYYY HH:mm")
              : "—"}
          </Text>
          <Text>
            Kết thúc:{" "}
            {record.endDate
              ? dayjs(record.endDate).format("DD/MM/YYYY HH:mm")
              : "—"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => (
        <Tag color={status === VOUCHER_STATUS.ACTIVE ? "green" : "default"}>
          {status === VOUCHER_STATUS.ACTIVE ? "Hoạt động" : "Tạm dừng"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 150,
      fixed: "right" as const,
      render: (_: any, record: Voucher) => (
        <Space>
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => navigate(`/admin/vouchers/edit/${record._id}`)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa voucher"
            description={`Bạn có chắc chắn muốn xóa voucher "${record.code}"?`}
            onConfirm={() => handleDelete(record._id, record.code)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={3}>Quản lý voucher</Title>
          <Text type="secondary">Danh sách và quản lý các voucher khuyến mãi</Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/admin/vouchers/create")}
          >
            Tạo voucher mới
          </Button>
        </Col>
      </Row>

      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Search
              placeholder="Tìm kiếm theo mã voucher"
              allowClear
              onSearch={handleSearch}
              loading={loading}
              enterButton
            />
          </Col>
        </Row>

        <Table
          rowKey="_id"
          columns={columns}
          dataSource={vouchers}
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} voucher`,
          }}
        />
      </Card>
    </Space>
  );
};

export default VoucherList;

