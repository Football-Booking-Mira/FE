import React, { useEffect, useMemo, useState } from "react";
import { Table, Input, Tag, Select, Progress, Button, Space } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import api from "@/common/utils/api";

type EquipmentMode = "rent" | "sell" | "both";
type EquipmentStatus = "in_stock" | "out_of_stock" | "discontinued";

interface Equipment {
  _id: string;
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

// Nhãn hiển thị cho người dùng
const MODE_LABELS: Record<EquipmentMode, string> = {
  rent: "Đồ cho thuê",
  sell: "Thiết bị bán trực tiếp tại sân",
  both: "Cho thuê & bán", // chỉ dùng cho select
};

const STATUS_LABELS: Record<string, string> = {
  in_stock: "Còn hàng",
  out_of_stock: "Hết hàng",
  discontinued: "Ngừng bán",
};

const STATUS_COLORS: Record<string, string> = {
  in_stock: "green",
  out_of_stock: "red",
  discontinued: "default",
};

const UserEquipmentList: React.FC = () => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterMode, setFilterMode] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("");

  const fetchEquipments = async () => {
    try {
      setLoading(true);
      const res = await api.get("/equipments/public");
      const list: Equipment[] = res.data?.data ?? res.data ?? [];
      setEquipments(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments();
  }, []);

  const filtered = useMemo(() => {
    let list = [...equipments];

    const keyword = search.trim().toLowerCase();
    if (keyword) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(keyword) ||
          e.code.toLowerCase().includes(keyword)
      );
    }

    // 🔹 Filter theo mode
    if (filterMode) {
      if (filterMode === "both") {
        list = list.filter((e) => e.mode === "rent" || e.mode === "sell");
      } else {
        list = list.filter((e) => e.mode === filterMode);
      }
    }

    // 🔹 Filter theo trạng thái dựa trên availableQuantity
    if (filterStatus) {
      list = list.filter((e) => {
        if (filterStatus === "in_stock") return e.availableQuantity > 0;
        if (filterStatus === "out_of_stock") return e.availableQuantity === 0;
        if (filterStatus === "discontinued") return e.status === "discontinued";
        return true;
      });
    }

    // 🔹 Sắp xếp
    if (sortBy === "price_asc") {
      list.sort(
        (a, b) =>
          (a.salePrice || a.rentPrice || 0) - (b.salePrice || b.rentPrice || 0)
      );
    }

    if (sortBy === "price_desc") {
      list.sort(
        (a, b) =>
          (b.salePrice || b.rentPrice || 0) - (a.salePrice || a.rentPrice || 0)
      );
    }

    if (sortBy === "quantity") {
      list.sort((a, b) => b.availableQuantity - a.availableQuantity);
    }

    return list;
  }, [equipments, search, filterStatus, filterMode, sortBy]);

  const renderPrice = (e: Equipment) => {
    if (e.mode === "rent")
      return (
        <span className="text-green-600 font-semibold">
          {(e.rentPrice || 0).toLocaleString("vi-VN")}đ / {e.unit}
        </span>
      );

    if (e.mode === "sell")
      return (
        <span className="text-blue-600 font-semibold">
          {(e.salePrice || 0).toLocaleString("vi-VN")}đ / {e.unit}
        </span>
      );

    return (
      <div>
        <div className="text-green-600">
          Thuê: {(e.rentPrice || 0).toLocaleString("vi-VN")}đ
        </div>
        <div className="text-blue-600">
          Bán: {(e.salePrice || 0).toLocaleString("vi-VN")}đ
        </div>
      </div>
    );
  };

  const columns = [
    {
      title: "Tên thiết bị",
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: "Loại",
      dataIndex: "mode",
      key: "mode",
      render: (mode: EquipmentMode) => (
        <Tag color="blue">{MODE_LABELS[mode]}</Tag>
      ),
      width: 200,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (_: any, record: Equipment) => {
        let statusLabel = "Còn hàng";
        let statusColor = "green";

        if (record.status === "discontinued") {
          statusLabel = "Ngừng bán";
          statusColor = "default";
        } else if (record.availableQuantity === 0) {
          statusLabel = "Hết hàng";
          statusColor = "red";
        }

        return <Tag color={statusColor}>{statusLabel}</Tag>;
      },
      width: 120,
    },
    {
      title: "Tồn kho",
      key: "quantity",
      render: (e: Equipment) => {
        const percent =
          e.totalQuantity > 0
            ? Math.round((e.availableQuantity / e.totalQuantity) * 100)
            : 0;
        return (
          <div>
            <Progress percent={percent} size="small" />
            <div className="text-xs text-gray-600 mt-1">
              Tổng: {e.totalQuantity} | Còn lại: {e.availableQuantity}
            </div>
          </div>
        );
      },
      width: 150,
    },
    {
      title: "Giá",
      key: "price",
      render: (e: Equipment) => renderPrice(e),
      width: 150,
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      render: (desc: string) => desc || "Không có",
      ellipsis: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-5xl mx-auto bg-white shadow-md rounded-xl p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-center mb-6">
          Danh sách thiết bị
        </h1>

        <div className="bg-white p-5 rounded-xl shadow-sm mb-6 border border-gray-200">
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Tìm theo tên hoặc mã thiết bị..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 300 }}
            />

            <Select
              style={{ width: 150 }}
              placeholder="Trạng thái"
              allowClear
              onChange={(v) => setFilterStatus(v || "")}
              options={[
                { value: "in_stock", label: "Còn hàng" },
                { value: "out_of_stock", label: "Hết hàng" },
                { value: "discontinued", label: "Ngừng bán" },
              ]}
            />

            <Select
              style={{ width: 150 }}
              placeholder="Loại thiết bị"
              allowClear
              onChange={(v) => setFilterMode(v || "")}
              options={[
                { value: "rent", label: "Đồ cho thuê" },
                { value: "sell", label: "Thiết bị bán trực tiếp tại sân" },
                { value: "both", label: "Cả hai" },
              ]}
            />

            <Select
              style={{ width: 150 }}
              placeholder="Sắp xếp"
              allowClear
              onChange={(v) => setSortBy(v || "")}
              options={[
                { value: "price_asc", label: "Giá ↑" },
                { value: "price_desc", label: "Giá ↓" },
                { value: "quantity", label: "Số lượng còn lại" },
              ]}
            />

            <Button icon={<ReloadOutlined />} onClick={fetchEquipments}>
              Làm mới
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} thiết bị`,
          }}
          scroll={{ x: 800 }}
          locale={{
            emptyText: "Không tìm thấy thiết bị nào.",
          }}
        />
      </div>
    </div>
  );
};

export default UserEquipmentList;
