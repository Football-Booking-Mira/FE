import React, { useState } from "react";
import { Table, Tag, Button, Modal, Popconfirm, Select, Input, Form } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";

const { Option } = Select;
const { Search } = Input;

interface User {
    _id: string;
    name: string;
    phone: string;
    email: string;
    role: string;
    status: "active" | "inactive";
    isEmailVerified: boolean;
    createdAt: string;
}

const fetchUsers = async () => {
    const res = await axios.get("/api/users");
    return res.data.data as User[];
};

const updateRole = async ({ userId, role }: { userId: string; role: string }) => {
    return axios.put(`/api/users/${userId}`, { role });
};

const blockUser = async (userId: string) => axios.patch(`/api/users/${userId}/block`);
const unblockUser = async (userId: string) => axios.patch(`/api/users/${userId}/unlock`);
const deleteUser = async (userId: string) => axios.delete(`/api/users/${userId}`);
const createUser = async (payload: any) => axios.post("/api/users", payload);

const Users = () => {
    const queryClient = useQueryClient();

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [modalCreateVisible, setModalCreateVisible] = useState(false);
    const [searchText, setSearchText] = useState("");

    const [form] = Form.useForm();

    const { data: users, isLoading } = useQuery({
        queryKey: ["users"],
        queryFn: fetchUsers,
    });

    const mutationCreate = useMutation({
        mutationFn: createUser,
        onSuccess: () => {
            queryClient.invalidateQueries(["users"]);
            setModalCreateVisible(false);
            form.resetFields();
        },
    });

    const mutationUpdateRole = useMutation({
        mutationFn: updateRole,
        onSuccess: () => queryClient.invalidateQueries(["users"]),
    });
    const mutationBlock = useMutation({
        mutationFn: blockUser,
        onSuccess: () => queryClient.invalidateQueries(["users"]),
    });
    const mutationUnblock = useMutation({
        mutationFn: unblockUser,
        onSuccess: () => queryClient.invalidateQueries(["users"]),
    });
    const mutationDeleteUser = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => queryClient.invalidateQueries(["users"]),
    });

    const handleView = (user: User) => {
        setSelectedUser(user);
        setModalVisible(true);
    };

    const filteredUsers = users?.filter(u =>
        u.name.toLowerCase().includes(searchText.toLowerCase()) ||
        u.email.toLowerCase().includes(searchText.toLowerCase())
    );

    const columns = [
        { title: "Tên", dataIndex: "name", key: "name" },
        { title: "SĐT", dataIndex: "phone", key: "phone" },
        { title: "Email", dataIndex: "email", key: "email" },
        {
            title: "Quyền",
            dataIndex: "role",
            key: "role",
            render: (role: string, record: User) => (
                <Select
                    defaultValue={role}
                    style={{ width: 120 }}
                    onChange={(value) =>
                        mutationUpdateRole.mutate({ userId: record._id, role: value })
                    }
                >
                    <Option value="user">User</Option>
                    <Option value="admin">Admin</Option>
                </Select>
            ),
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            render: (status: string) => (
                <Tag color={status === "active" ? "green" : "red"}>
                    {status === "active" ? "Hoạt động" : "Khóa"}
                </Tag>
            ),
        },
        {
            title: "Hành động",
            key: "action",
            align: "right" as const,
            render: (_: any, record: User) => (
                <div className="flex gap-2">
                    <Button size="small" onClick={() => handleView(record)}>
                        Chi tiết
                    </Button>

                    <Button
                        size="small"
                        onClick={() => {
                            record.status === "active"
                                ? mutationBlock.mutate(record._id)
                                : mutationUnblock.mutate(record._id);
                        }}
                    >
                        {record.status === "active" ? "Chặn" : "Bỏ chặn"}
                    </Button>

                    <Popconfirm
                        title="Bạn có chắc muốn xóa?"
                        onConfirm={() => mutationDeleteUser.mutate(record._id)}
                        okText="Xóa"
                        cancelText="Hủy"
                    >
                        <Button size="small" danger>
                            Xóa
                        </Button>
                    </Popconfirm>
                </div>
            ),
        },
    ];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Quản lý khách hàng</h2>

                <Button type="primary" onClick={() => setModalCreateVisible(true)}>
                    ➕ Thêm người dùng
                </Button>
            </div>

            <Search
                placeholder="Tìm kiếm tên hoặc email"
                allowClear
                onSearch={(value) => setSearchText(value)}
                style={{ width: 300, marginBottom: 16 }}
            />

            <Table
                columns={columns}
                dataSource={filteredUsers}
                rowKey="_id"
                loading={isLoading}
                pagination={{ pageSize: 10 }}
            />

            {/* MODAL CREATE USER */}
            <Modal
                title="Thêm người dùng mới"
                open={modalCreateVisible}
                onCancel={() => setModalCreateVisible(false)}
                onOk={() => form.submit()}
                okText="Tạo"
                cancelText="Hủy"
            >
                <Form form={form} layout="vertical" onFinish={mutationCreate.mutate}>
                    <Form.Item label="Tên" name="name" rules={[{ required: true }]}>
                        <Input placeholder="Nhập tên" />
                    </Form.Item>

                    <Form.Item label="Email" name="email" rules={[{ required: true }]}>
                        <Input placeholder="Nhập email" />
                    </Form.Item>

                    <Form.Item label="Số điện thoại" name="phone" rules={[{ required: true }]}>
                        <Input placeholder="Nhập số điện thoại" />
                    </Form.Item>

                    <Form.Item label="Mật khẩu" name="password" rules={[{ required: true }]}>
                        <Input.Password placeholder="Nhập mật khẩu" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Thông tin khách hàng"
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={500} // rộng vừa phải
                className="rounded-lg"
            >
                {selectedUser && (
                    <div className="flex flex-col gap-4">
                        {/* Avatar + Name */}
                        <div className="flex items-center gap-4 border-b pb-4">
                            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl text-gray-500">
                                {selectedUser.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                                <p className="text-gray-500">{selectedUser.email}</p>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                            <div>
                                <p className="font-medium">Số điện thoại:</p>
                                <p>{selectedUser.phone}</p>
                            </div>
                            <div>
                                <p className="font-medium">Quyền:</p>
                                <p className="capitalize">{selectedUser.role}</p>
                            </div>
                            <div>
                                <p className="font-medium">Trạng thái:</p>
                                <Tag
                                    color={selectedUser.status === "active" ? "green" : "red"}
                                    className="uppercase px-2 py-1 text-sm"
                                >
                                    {selectedUser.status === "active" ? "Hoạt động" : "Khóa"}
                                </Tag>
                            </div>
                            <div>
                                <p className="font-medium">Xác thực email:</p>
                                <p>{selectedUser.isEmailVerified ? "Đã xác thực" : "Chưa"}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="font-medium">Ngày tạo:</p>
                                <p>{new Date(selectedUser.createdAt).toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button onClick={() => setModalVisible(false)}>Đóng</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Users;
