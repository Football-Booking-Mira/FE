import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tabs,
  Typography,
  message,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  BarChartOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import api from "@/common/utils/api";
import { DISCOUNT_TYPES, VOUCHER_STATUS } from "@/common/constants/enums";
import type {
  VoucherStatsBooking,
  VoucherStatsPayload,
  VoucherStatsUser,
  VoucherSummary,
} from "@/types/voucher";

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

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

const VoucherManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("list");

  // ==================== LIST TAB STATE ====================
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");

  // ==================== STATS TAB STATE ====================
  const [voucherList, setVoucherList] = useState<VoucherSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>();
  const [stats, setStats] = useState<VoucherStatsPayload | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // ==================== LIST TAB FUNCTIONS ====================
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
      // Refresh stats list too
      fetchVouchersForStats();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể xóa voucher";
      toast.error(errorMessage);
      message.error(errorMessage);
    }
  };

  // ==================== STATS TAB FUNCTIONS ====================
  const fetchVouchersForStats = useCallback(async (keyword?: string) => {
    try {
      setListLoading(true);
      const res = await api.get("/vouchers", {
        params: keyword ? { q: keyword } : undefined,
      });
      const data = res.data?.data || res.data || [];
      setVoucherList(data);
      if (!selectedVoucherId && data.length) {
        setSelectedVoucherId(data[0]._id);
      }
    } catch (error: any) {
      toast.error(error?.message || "Không tải được danh sách voucher");
    } finally {
      setListLoading(false);
    }
  }, [selectedVoucherId]);

  const fetchStats = useCallback(
    async (voucherId: string) => {
      if (!voucherId) return;
      try {
        setStatsLoading(true);
        const res = await api.get(`/vouchers/${voucherId}/stats`);
        const data = res.data?.data || res.data;
        setStats(data);
      } catch (error: any) {
        toast.error(error?.message || "Không tải được thống kê voucher");
      } finally {
        setStatsLoading(false);
      }
    },
    []
  );

  const handleStatsSearch = (value: string) => {
    fetchVouchersForStats(value);
  };

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (activeTab === "list") {
      fetchVouchers();
    } else if (activeTab === "stats") {
      fetchVouchersForStats();
    }
  }, [activeTab, fetchVouchers, fetchVouchersForStats]);

  useEffect(() => {
    if (activeTab === "stats" && selectedVoucherId) {
      fetchStats(selectedVoucherId);
    }
  }, [selectedVoucherId, activeTab, fetchStats]);

  // ==================== LIST TAB COLUMNS ====================
  const listColumns = [
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
            <Button danger icon={<DeleteOutlined />} size="small">
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ==================== STATS TAB MEMO ====================
  const selectedVoucher = useMemo(
    () => voucherList.find((v) => v._id === selectedVoucherId),
    [voucherList, selectedVoucherId]
  );

  const statsCards = useMemo(() => {
    if (!stats) return null;
    const items = [
      {
        title: "Tổng phát hành",
        value: stats.totals.issued,
      },
      {
        title: "Đã dùng",
        value: stats.totals.used,
      },
      {
        title: "Đã hoàn lượt",
        value: stats.totals.restored,
      },
      {
        title: "Còn lại",
        value: stats.totals.remaining,
      },
      {
        title: "Doanh thu giảm bởi voucher",
        value: formatCurrency(stats.totals.discountGiven),
      },
    ];

    return (
      <Row gutter={16}>
        {items.map((item) => (
          <Col key={item.title} xs={24} md={12} lg={6}>
            <Card>
              <Statistic title={item.title} value={item.value} />
            </Card>
          </Col>
        ))}
      </Row>
    );
  }, [stats]);

  const userColumns = [
    {
      title: "Khách hàng",
      dataIndex: "user",
      key: "user",
      render: (user: VoucherStatsUser["user"]) =>
        user ? (
          <Space direction="vertical" size={0}>
            <Text strong>{user.name || "—"}</Text>
            <Text type="secondary">{user.email || "—"}</Text>
            <Text type="secondary">{user.phone || "—"}</Text>
          </Space>
        ) : (
          "—"
        ),
    },
    {
      title: "Số lượt dùng",
      dataIndex: "count",
      key: "count",
      width: 140,
    },
    {
      title: "Tổng tiền giảm",
      dataIndex: "totalDiscount",
      key: "totalDiscount",
      width: 180,
      render: (value: number) => formatCurrency(value),
    },
  ];

  const bookingColumns = [
    {
      title: "Mã đơn",
      dataIndex: ["bookingId", "code"],
      key: "bookingCode",
      render: (_: string, record: VoucherStatsBooking) =>
        record.bookingId?.code || "—",
      width: 140,
    },
    {
      title: "Khách hàng",
      dataIndex: ["userId", "name"],
      key: "user",
      render: (_: string, record: VoucherStatsBooking) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.userId?.name || "—"}</Text>
          <Text type="secondary">{record.userId?.phone || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Tổng đơn",
      dataIndex: "orderTotal",
      key: "orderTotal",
      width: 160,
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "Voucher giảm",
      dataIndex: "discountAmount",
      key: "discountAmount",
      width: 160,
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "Trạng thái đơn",
      dataIndex: ["bookingId", "status"],
      key: "bookingStatus",
      width: 160,
      render: (status?: string) => <Tag>{status || "—"}</Tag>,
    },
    {
      title: "Voucher",
      dataIndex: "status",
      key: "voucherStatus",
      width: 180,
      render: (value: "applied" | "restored", record: VoucherStatsBooking) =>
        value === "restored" ? (
          <Tag color="green">
            Đã hoàn lượt •{" "}
            {record.restoredAt
              ? dayjs(record.restoredAt).format("DD/MM HH:mm")
              : ""}
          </Tag>
        ) : (
          <Tag color="blue">Đã sử dụng</Tag>
        ),
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={3}>Quản lý voucher</Title>
          <Text type="secondary">
            Danh sách và quản lý các voucher khuyến mãi
          </Text>
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
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "list",
              label: (
                <span>
                  <UnorderedListOutlined />
                  Danh sách
                </span>
              ),
              children: (
                <>
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
                    columns={listColumns}
                    dataSource={vouchers}
                    loading={loading}
                    scroll={{ x: 1200 }}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showTotal: (total) => `Tổng ${total} voucher`,
                    }}
                  />
                </>
              ),
            },
            {
              key: "stats",
              label: (
                <span>
                  <BarChartOutlined />
                  Thống kê
                </span>
              ),
              children: (
            <Space direction="vertical" size={24} style={{ width: "100%" }}>
              <Card>
                <Row gutter={16} align="middle">
                  <Col xs={24} md={12}>
                    <Input.Search
                      placeholder="Tìm mã voucher"
                      allowClear
                      onSearch={handleStatsSearch}
                      loading={listLoading}
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <Select
                      showSearch
                      style={{ width: "100%" }}
                      placeholder="Chọn voucher"
                      loading={listLoading}
                      value={selectedVoucherId}
                      onChange={setSelectedVoucherId}
                      filterOption={false}
                      notFoundContent={
                        listLoading ? <Spin size="small" /> : <Empty />
                      }
                    >
                      {voucherList.map((voucher) => (
                        <Option key={voucher._id} value={voucher._id}>
                          <Space>
                            <Text strong>{voucher.code}</Text>
                            <Tag
                              color={
                                voucher.status === VOUCHER_STATUS.ACTIVE
                                  ? "green"
                                  : "default"
                              }
                            >
                              {voucher.status}
                            </Tag>
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Col>
                </Row>
              </Card>

              {statsLoading ? (
                <div style={{ textAlign: "center", padding: "50px" }}>
                  <Spin size="large" />
                </div>
              ) : !stats ? (
                <Empty description="Chọn voucher để xem thống kê" />
              ) : (
                <>
                  {selectedVoucher && (
                    <Card>
                      <Space direction="vertical" size={8}>
                        <Text strong>{selectedVoucher.code}</Text>
                        <Text>
                          Loại giảm:{" "}
                          {selectedVoucher.discountType === DISCOUNT_TYPES.PERCENT
                            ? `Giảm ${selectedVoucher.discountValue}%`
                            : `Giảm ${formatCurrency(
                                selectedVoucher.discountValue
                              )}`}
                        </Text>
                        <Text>
                          Thời gian:{` `}
                          {selectedVoucher.startDate
                            ? dayjs(selectedVoucher.startDate).format(
                                "DD/MM/YYYY"
                              )
                            : "—"}{" "}
                          -{" "}
                          {selectedVoucher.endDate
                            ? dayjs(selectedVoucher.endDate).format(
                                "DD/MM/YYYY"
                              )
                            : "—"}
                        </Text>
                      </Space>
                    </Card>
                  )}

                  {statsCards}

                  <Card title="Khách hàng sử dụng nhiều nhất">
                    <Table
                      rowKey={(row: VoucherStatsUser) => row._id}
                      dataSource={stats.users}
                      columns={userColumns}
                      pagination={false}
                      locale={{ emptyText: "Chưa có lượt sử dụng" }}
                    />
                  </Card>

                  <Card
                    title="Đơn hàng đã áp dụng voucher"
                    extra={
                      <Alert
                        type="info"
                        message="Đơn bị hủy trước khi sử dụng sẽ được hoàn lượt và đánh dấu 'voucher restored'. Nếu đơn đã sử dụng dịch vụ, voucher không được hoàn lại."
                      />
                    }
                  >
                    <Table
                      rowKey={(row: VoucherStatsBooking) => row._id}
                      dataSource={stats.bookings}
                      columns={bookingColumns}
                      scroll={{ x: 900 }}
                    />
                  </Card>
                </>
              )}
            </Space>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
};

export default VoucherManagement;

