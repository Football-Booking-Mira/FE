import { useState } from "react";
import { Table, Modal, Select, Input, Form, Popconfirm, message } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    Search, Plus, Shield, ShieldCheck, Mail, Phone, Calendar, 
    Eye, Lock, Unlock, Trash2, User as UserIcon,
    ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Users as UsersIcon, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "@/lib/axios";

const { Option } = Select;

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
    const res = await axios.get("/users");
    return res.data.data as User[];
};

const updateRole = async ({ userId, role }: { userId: string; role: string }) => {
    return axios.put(`/users/${userId}`, { role });
};

const blockUser = async (userId: string) => axios.patch(`/users/${userId}/block`);
const unblockUser = async (userId: string) => axios.patch(`/users/${userId}/unlock`);
const deleteUser = async (userId: string) => axios.delete(`/users/${userId}`);
const createUser = async (payload: any) => axios.post("/users", payload);

const STATUS_CONFIG = {
    active: { label: 'Hoạt động', icon: <CheckCircle2 size={14} />, color: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' },
    inactive: { label: 'Đã khóa', icon: <Lock size={14} />, color: 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' },
};

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
            queryClient.invalidateQueries({ queryKey: ["users"] });
            setModalCreateVisible(false);
            form.resetFields();
            message.success("Thêm người dùng thành công");
        },
        onError: () => message.error("Lỗi khi thêm người dùng")
    });

    const mutationUpdateRole = useMutation({
        mutationFn: updateRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            message.success("Cập nhật quyền thành công");
        },
        onError: () => message.error("Lỗi khi cập nhật quyền")
    });
    const mutationBlock = useMutation({
        mutationFn: blockUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            message.success("Đã khóa người dùng");
        },
    });
    const mutationUnblock = useMutation({
        mutationFn: unblockUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            message.success("Đã mở khóa người dùng");
        },
    });
    const mutationDeleteUser = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            message.success("Xóa người dùng thành công");
        },
        onError: () => message.error("Lỗi khi xóa người dùng")
    });

    const handleView = (user: User) => {
        setSelectedUser(user);
        setModalVisible(true);
    };

    const showToggleStatusConfirm = (record: User) => {
        const isLocking = record.status === 'active';
        Modal.confirm({
            title: <div className="text-xl font-black text-slate-800 dark:text-white mb-2">{isLocking ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}</div>,
            content: (
                <div className="text-slate-500 dark:text-slate-400">
                    {isLocking 
                        ? <>Bạn có chắc chắn muốn khóa tài khoản <strong className="text-rose-500">{record.name}</strong> không? Người dùng này sẽ không thể đăng nhập cho đến khi được mở lại.</>
                        : <>Bạn có chắc chắn muốn mở khóa tài khoản <strong className="text-emerald-500">{record.name}</strong> không? Người dùng này sẽ có thể đăng nhập bình thường.</>
                    }
                </div>
            ),
            okText: isLocking ? 'Khóa tài khoản' : 'Mở khóa',
            cancelText: 'Hủy bỏ',
            centered: true,
            icon: isLocking ? <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl mr-4"><Lock size={24} /></div> : <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl mr-4"><Unlock size={24} /></div>,
            okButtonProps: { 
                danger: isLocking,
                className: "rounded-xl font-bold px-6 py-5 shadow-sm",
                style: !isLocking ? { backgroundColor: '#10b981' } : undefined
            },
            cancelButtonProps: { className: "rounded-xl font-bold px-6 py-5 border-none bg-slate-100 hover:bg-slate-200" },
            onOk: () => {
                isLocking ? mutationBlock.mutate(record._id) : mutationUnblock.mutate(record._id);
            }
        });
    };

    const showDeleteConfirm = (record: User) => {
        Modal.confirm({
            title: <div className="text-xl font-black text-rose-600 mb-2">Trục xuất vĩnh viễn?</div>,
            content: (
                <div className="text-slate-500 dark:text-slate-400">
                    Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản <strong className="text-rose-500">{record.name}</strong> không?
                    <div className="mt-2 text-xs text-rose-400 bg-rose-50 p-2 rounded-lg border border-rose-100">
                        ⚠️ Thao tác này không thể hoàn tác và sẽ xóa bỏ mọi dữ liệu liên quan.
                    </div>
                </div>
            ),
            okText: 'Xóa vĩnh viễn',
            cancelText: 'Hủy bỏ',
            centered: true,
            icon: <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl mr-4"><Trash2 size={24} /></div>,
            okButtonProps: { danger: true, className: "rounded-xl font-bold px-6 py-5 shadow-sm" },
            cancelButtonProps: { className: "rounded-xl font-bold px-6 py-5 border-none bg-slate-100 hover:bg-slate-200" },
            onOk: () => mutationDeleteUser.mutate(record._id)
        });
    };

    const filteredUsers = users?.filter(u =>
        u.name.toLowerCase().includes(searchText.toLowerCase()) ||
        u.email.toLowerCase().includes(searchText.toLowerCase()) ||
        u.phone.includes(searchText)
    );

    const columns = [
        { 
            title: "Khách hàng", 
            key: "name",
            render: (_: any, record: User) => (
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white text-lg font-black shadow-lg shadow-emerald-500/20">
                            {record.name.charAt(0).toUpperCase()}
                        </div>
                        {record.role === 'admin' && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-white" title="Quản trị viên">
                                <ShieldCheck size={10} />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-slate-800 dark:text-slate-100 text-sm leading-tight transition-colors">{record.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{record.phone || 'Chưa cập nhật'}</span>
                            {record.isEmailVerified && (
                                <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 rounded-full" title="Email đã xác thực">✓</span>
                            )}
                        </div>
                    </div>
                </div>
            )
        },
        { 
            title: "Liên hệ", 
            key: "contact",
            render: (_: any, record: User) => (
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-sm">
                        <Mail size={14} className="text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-300 font-medium">{record.email}</span>
                    </div>
                </div>
            )
        },
        {
            title: "Vai trò",
            dataIndex: "role",
            key: "role",
            render: (role: string, record: User) => (
                <Select
                    defaultValue={role}
                    className="premium-select-small w-32"
                    onChange={(value) => mutationUpdateRole.mutate({ userId: record._id, role: value })}
                    popupClassName="premium-dropdown"
                >
                    <Option value="user">
                        <div className="flex items-center gap-2">
                            <UserIcon size={14} className="text-blue-500" />
                            <span className="font-bold">Khách</span>
                        </div>
                    </Option>
                    <Option value="admin">
                        <div className="flex items-center gap-2">
                            <Shield size={14} className="text-amber-500" />
                            <span className="font-bold text-amber-600 dark:text-amber-400">Admin</span>
                        </div>
                    </Option>
                </Select>
            ),
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            render: (status: "active" | "inactive") => {
                const config = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
                return (
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase w-fit ${config.color}`}>
                        {config.icon}
                        {config.label}
                    </div>
                );
            },
        },
        {
            title: "Thao tác",
            key: "action",
            align: "right" as const,
            width: 180,
            render: (_: any, record: User) => (
                <div className="flex items-center justify-end gap-2">
                    <button 
                        onClick={() => handleView(record)}
                        className="p-2.5 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20 rounded-xl transition-all active:scale-90 border border-transparent dark:border-white/5"
                        title="Xem chi tiết"
                    >
                        <Eye size={18} />
                    </button>

                    <button 
                        onClick={() => showToggleStatusConfirm(record)}
                        className={`p-2.5 rounded-xl transition-all active:scale-90 shadow-xs border ${
                            record.status === "active" 
                                ? "bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 border-amber-100 dark:border-amber-500/20"
                                : "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 border-emerald-100 dark:border-emerald-500/20"
                        }`}
                        title={record.status === "active" ? "Khóa" : "Mở khóa"}
                    >
                        {record.status === "active" ? <Lock size={18} /> : <Unlock size={18} />}
                    </button>

                    <button 
                        onClick={() => showDeleteConfirm(record)}
                        className="p-2.5 bg-rose-50 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400 hover:bg-rose-500 dark:hover:bg-rose-500 hover:text-white dark:hover:text-white rounded-xl transition-all active:scale-90 border border-rose-100 dark:border-rose-500/20"
                        title="Xóa"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="px-4 pb-12 space-y-8 animate-in fade-in duration-700">
            {/* 🚀 Premium Header */}
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pt-6'>
                <div className='relative'>
                    <div className='absolute -left-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-3xl' />
                    <h1 className='text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-4 italic'>
                        <div className="p-3.5 bg-linear-to-br from-indigo-500 to-violet-600 rounded-3xl shadow-2xl shadow-indigo-500/40 rotate-6 flex items-center justify-center border border-white/20">
                            <UsersIcon size={28} className="text-white" />
                        </div>
                        <span className="relative">
                            QUẢN LÝ KHÁCH HÀNG
                            <div className="absolute -bottom-2 left-0 w-1/2 h-1.5 bg-indigo-500/30 rounded-full" />
                        </span>
                    </h1>
                    <p className='text-slate-500 dark:text-slate-400 mt-6 font-semibold flex items-center gap-2 text-sm md:text-base'>
                        <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                        </span>
                        Theo dõi tài khoản, phân quyền và trạng thái người dùng
                    </p>
                </div>
                
                <div className='flex flex-col sm:flex-row items-center gap-4 relative z-10'>
                    <div className="relative group w-full sm:w-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <Input
                            placeholder="Tìm kiếm Email, SĐT, Tên..."
                            className="premium-search-input pl-11 h-12 w-full sm:w-80"
                            onChange={(e) => setSearchText(e.target.value)}
                            allowClear
                        />
                    </div>
                    
                    <button
                        onClick={() => setModalCreateVisible(true)}
                        className="flex items-center justify-center gap-2 px-6 py-3.5 bg-linear-to-r from-emerald-600 to-teal-700 text-white rounded-3xl font-bold text-sm shadow-xl shadow-emerald-500/30 hover:scale-[1.02] hover:shadow-emerald-500/40 active:scale-95 transition-all w-full sm:w-auto"
                    >
                        <Plus size={20} /> THÊM KHÁCH HÀNG
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 p-5 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl"><UsersIcon size={20} className="text-indigo-500" /></div>
                    <div><div className="text-2xl font-black text-slate-800 dark:text-white">{users?.length || 0}</div><div className="text-[10px] font-bold text-slate-400 uppercase">Tổng người dùng</div></div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 p-5 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl"><CheckCircle2 size={20} className="text-emerald-500" /></div>
                    <div><div className="text-2xl font-black text-emerald-500">{users?.filter(u => u.status === 'active').length || 0}</div><div className="text-[10px] font-bold text-slate-400 uppercase">Đang hoạt động</div></div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 p-5 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-rose-50 dark:bg-rose-500/10 rounded-2xl"><AlertCircle size={20} className="text-rose-500" /></div>
                    <div><div className="text-2xl font-black text-rose-500">{users?.filter(u => u.status === 'inactive').length || 0}</div><div className="text-[10px] font-bold text-slate-400 uppercase">Đã khóa</div></div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 p-5 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-2xl"><Shield size={20} className="text-amber-500" /></div>
                    <div><div className="text-2xl font-black text-amber-500">{users?.filter(u => u.role === 'admin').length || 0}</div><div className="text-[10px] font-bold text-slate-400 uppercase">Quản trị viên</div></div>
                </div>
            </div>

            {/* Bảng dữ liệu */}
            <div className="bg-white dark:bg-card rounded-4xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden p-4 transition-colors">
                <Table
                    columns={columns}
                    dataSource={filteredUsers}
                    rowKey="_id"
                    loading={isLoading}
                    pagination={{ 
                        pageSize: 10,
                        showSizeChanger: false,
                        showTotal: undefined,
                        className: "px-6 py-4",
                        itemRender: (_page, type, originalElement) => {
                            if (type === 'prev') return <button className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors"><ChevronLeft size={16} className="dark:text-slate-400"/></button>;
                            if (type === 'next') return <button className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors"><ChevronRight size={16} className="dark:text-slate-400"/></button>;
                            return originalElement;
                        }
                    }}
                    className="premium-table"
                />
            </div>

            {/* MODAL CREATE USER */}
            <Modal
                title={
                    <div className="flex items-center gap-3 py-2">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                            <Plus size={20}/>
                        </div>
                        <span className="text-xl font-black text-slate-800">Tạo tài khoản mới</span>
                    </div>
                }
                open={modalCreateVisible}
                onCancel={() => setModalCreateVisible(false)}
                footer={null}
                width={500}
                centered
                className="premium-modal"
                closeIcon={<div className="p-2 hover:bg-slate-100 rounded-full transition-colors mt-2"><X size={18} className="text-slate-400"/></div>}
            >
                <Form form={form} layout="vertical" onFinish={(v) => mutationCreate.mutate(v)} className="mt-6">
                    <Form.Item label={<span className="text-xs font-black text-slate-500 uppercase">Tên khách hàng</span>} name="name" rules={[{ required: true, message: "Vui lòng nhập tên" }]}>
                        <Input placeholder="Nhập họ và tên..." className="premium-input-modal" prefix={<UserIcon size={16} className="text-slate-400 mr-2"/>} />
                    </Form.Item>

                    <Form.Item label={<span className="text-xs font-black text-slate-500 uppercase">Địa chỉ Email</span>} name="email" rules={[{ required: true, type: "email", message: "Email không hợp lệ" }]}>
                        <Input placeholder="user@example.com" className="premium-input-modal" prefix={<Mail size={16} className="text-slate-400 mr-2"/>} />
                    </Form.Item>

                    <Form.Item label={<span className="text-xs font-black text-slate-500 uppercase">Số điện thoại</span>} name="phone" rules={[{ required: true, message: "Vui lòng nhập SĐT" }]}>
                        <Input placeholder="09xx..." className="premium-input-modal" prefix={<Phone size={16} className="text-slate-400 mr-2"/>} />
                    </Form.Item>

                    <Form.Item label={<span className="text-xs font-black text-slate-500 uppercase">Mật khẩu khởi tạo</span>} name="password" rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}>
                        <Input.Password placeholder="••••••••" className="premium-input-modal p-2.5" prefix={<Lock size={16} className="text-slate-400 mr-2"/>} />
                    </Form.Item>
                    
                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                        <button type="button" onClick={() => setModalCreateVisible(false)} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">HỦY BỎ</button>
                        <button type="submit" disabled={mutationCreate.isPending} className="px-8 py-2.5 bg-linear-to-r from-emerald-600 to-teal-700 text-white rounded-2xl font-black text-sm hover:shadow-xl hover:shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50">
                            {mutationCreate.isPending ? 'ĐANG TẠO...' : 'XÁC NHẬN TẠO'}
                        </button>
                    </div>
                </Form>
            </Modal>

            {/* Chi tiết tài khoản */}
            <AnimatePresence>
                {modalVisible && selectedUser && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }} className="bg-white dark:bg-card w-full max-w-xl overflow-hidden rounded-4xl shadow-2xl border border-slate-200 dark:border-white/10">
                            
                            {/* Header Gradient */}
                            <div className="relative h-32 bg-linear-to-r from-indigo-500 to-violet-600">
                                <button onClick={() => setModalVisible(false)} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-all backdrop-blur-sm">
                                    <X size={18} />
                                </button>
                                <div className="absolute -bottom-10 left-8">
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-3xl bg-white dark:bg-slate-800 p-1.5 shadow-xl">
                                            <div className="w-full h-full rounded-[20px] bg-linear-to-tr from-indigo-100 to-indigo-50 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-3xl font-black text-indigo-500 dark:text-indigo-400">
                                                {selectedUser.name.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                        {selectedUser.role === 'admin' && (
                                            <div className="absolute -top-2 -right-2 p-1.5 bg-amber-400 border-2 border-white dark:border-slate-800 rounded-full text-white shadow-lg">
                                                <ShieldCheck size={16} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-14 px-8 pb-8">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{selectedUser.name}</h2>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg ${selectedUser.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                                            {selectedUser.status === 'active' ? '● Hoạt động' : '● Đã khóa'}
                                        </span>
                                        <span className="text-slate-400 text-sm font-medium">|</span>
                                        <span className="text-sm font-bold text-slate-500 capitalize">{selectedUser.role}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0"><Mail size={20} /></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Email</p>
                                            <p className="font-bold text-slate-700 dark:text-slate-200 truncate">{selectedUser.email}</p>
                                        </div>
                                        {selectedUser.isEmailVerified ? (
                                            <div className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">Xác thực ✓</div>
                                        ) : (
                                            <div className="text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-lg">Chưa XT</div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"><Phone size={20} /></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Điện thoại</p>
                                            <p className="font-bold text-slate-700 dark:text-slate-200 truncate">{selectedUser.phone || 'Chưa cập nhật'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0"><Calendar size={20} /></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Ngày tạo tài khoản</p>
                                            <p className="font-bold text-slate-700 dark:text-slate-200 truncate">{new Date(selectedUser.createdAt).toLocaleDateString('vi-VN')} - {new Date(selectedUser.createdAt).toLocaleTimeString('vi-VN')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .premium-table .ant-table { background: transparent !important; }
                .premium-table .ant-table-thead > tr > th {
                    background: #f8fafc !important; color: #64748b !important;
                    font-size: 11px !important; font-weight: 800 !important;
                    text-transform: uppercase !important; letter-spacing: 0.05em !important;
                    border-bottom: 2px solid #f1f5f9 !important; padding: 16px 24px !important;
                }
                .dark .premium-table .ant-table-thead > tr > th {
                    background: rgba(255,255,255,0.03) !important; color: #94a3b8 !important;
                    border-bottom: 1px solid rgba(255,255,255,0.05) !important;
                }
                .premium-table .ant-table-tbody > tr > td {
                    padding: 16px 24px !important; border-bottom: 1px solid #f1f5f9 !important;
                    transition: all 0.2s; color: inherit;
                }
                .dark .premium-table .ant-table-tbody > tr > td { border-bottom: 1px solid rgba(255,255,255,0.05) !important; }
                .premium-table .ant-table-tbody > tr:hover > td { background: #fdfdfd !important; }
                .dark .premium-table .ant-table-tbody > tr:hover > td { background: rgba(255,255,255,0.02) !important; }

                .premium-search-input.ant-input {
                    border-radius: 9999px !important; background: #fff !important;
                    border: 1px solid #e2e8f0 !important; font-weight: 600; color: #1e293b;
                }
                .premium-search-input.ant-input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important; }
                .dark .premium-search-input.ant-input {
                    background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.1) !important; color: #fff;
                }
                .dark .premium-search-input.ant-input::placeholder { color: #64748b; }

                .premium-select-small .ant-select-selector {
                    border-radius: 12px !important; border: 1px solid #f1f5f9 !important;
                    padding: 0 12px !important; background: #f8fafc !important;
                    height: 38px !important; align-items: center !important;
                }
                .dark .premium-select-small .ant-select-selector {
                    background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.1) !important; color: #f8fafc !important;
                }
                .premium-dropdown { border-radius: 16px !important; padding: 4px !important; }
                
                .premium-modal .ant-modal-content { border-radius: 32px !important; padding: 32px !important; }
                .premium-input-modal.ant-input, .premium-input-modal.ant-input-password {
                    border-radius: 12px !important; border: 1px solid #f1f5f9 !important;
                    padding: 10px 14px !important; background: #f8fafc !important;
                    font-weight: 600 !important; transition: all 0.2s !important;
                }
                .premium-input-modal.ant-input:focus, .premium-input-modal.ant-input-password:focus-within {
                    border-color: #10b981 !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(16,185,129,0.1) !important;
                }
            `}</style>
        </div>
    );
};

export default Users;
