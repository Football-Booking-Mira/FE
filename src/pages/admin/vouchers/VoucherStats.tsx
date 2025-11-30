import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import api from "@/common/utils/api";
import type {
  VoucherStatsBooking,
  VoucherStatsPayload,
  VoucherStatsUser,
  VoucherSummary,
} from "@/types/voucher";
import { DISCOUNT_TYPES, VOUCHER_STATUS } from "@/common/constants/enums";

const { Title, Text } = Typography;
const { Option } = Select;

const formatCurrency = (value?: number) =>
  typeof value === "number"
    ? `${value.toLocaleString("vi-VN")} đ`
    : "0 đ";

const VoucherStats: React.FC = () => {
  const [voucherList, setVoucherList] = useState<VoucherSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>();
  const [stats, setStats] = useState<VoucherStatsPayload | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchVouchers = useCallback(async (keyword?: string) => {
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

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  useEffect(() => {
    if (selectedVoucherId) {
      fetchStats(selectedVoucherId);
    }
  }, [selectedVoucherId, fetchStats]);

  const handleSearch = (value: string) => {
    fetchVouchers(value);
  };

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
      <div>
        <Title level={3}>Thống kê voucher</Title>
        <Text type="secondary">
          Theo dõi số lượt sử dụng, khách hàng và đơn áp dụng để kiểm soát hoàn
          tiền đúng quy tắc.
        </Text>
      </div>

      <Card>
        <Row gutter={16} align="middle">
          <Col xs={24} md={12}>
            <Input.Search
              placeholder="Tìm mã voucher"
              allowClear
              onSearch={handleSearch}
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
              notFoundContent={listLoading ? <Spin size="small" /> : <Empty />}
            >
              {voucherList.map((voucher) => (
                <Option key={voucher._id} value={voucher._id}>
                  <Space>
                    <Text strong>{voucher.code}</Text>
                    <Tag color={voucher.status === VOUCHER_STATUS.ACTIVE ? "green" : "default"}>
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
        <Spin />
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
                    ? dayjs(selectedVoucher.startDate).format("DD/MM/YYYY")
                    : "—"}{" "}
                  -{" "}
                  {selectedVoucher.endDate
                    ? dayjs(selectedVoucher.endDate).format("DD/MM/YYYY")
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
  );
};

export default VoucherStats;




