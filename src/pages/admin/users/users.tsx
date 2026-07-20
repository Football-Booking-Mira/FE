import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    Search, Plus, Shield, ShieldCheck, Mail, Phone, Calendar, 
    Eye, Lock, Unlock, Trash2, User as UserIcon,
    ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Users as UsersIcon, X, Loader2
} from "lucide-react";
import axios from "@/lib/axios";
import dayjs from "dayjs";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

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
    active: { label: 'Hoạt động', icon: <CheckCircle2 size={12} />, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    inactive: { label: 'Đã khóa', icon: <Lock size={12} />, color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
};

const Users = () => {
    const queryClient = useQueryClient();

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [modalCreateVisible, setModalCreateVisible] = useState(false);
    const [searchText, setSearchText] = useState("");

    // Reusable confirmation state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<{
        title: string;
        description: string;
        okText: string;
        onOk: () => void;
        isDanger?: boolean;
        icon?: React.ReactNode;
    } | null>(null);

    // Create user form state
    const [createName, setCreateName] = useState("");
    const [createEmail, setCreateEmail] = useState("");
    const [createPhone, setCreatePhone] = useState("");
    const [createPassword, setCreatePassword] = useState("");
    const [createErrors, setCreateErrors] = useState<{name?: string, email?: string, phone?: string, password?: string}>({});

    // Client-side pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 8;

    const { data: users, isLoading } = useQuery({
        queryKey: ["users"],
        queryFn: fetchUsers,
    });

    const mutationCreate = useMutation({
        mutationFn: createUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            setModalCreateVisible(false);
            setCreateName("");
            setCreateEmail("");
            setCreatePhone("");
            setCreatePassword("");
            setCreateErrors({});
            toast.success("Thêm người dùng thành công");
        },
        onError: () => toast.error("Lỗi khi thêm người dùng")
    });

    const mutationUpdateRole = useMutation({
        mutationFn: updateRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("Cập nhật quyền thành công");
        },
        onError: () => toast.error("Lỗi khi cập nhật quyền")
    });

    const mutationBlock = useMutation({
        mutationFn: blockUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("Đã khóa người dùng thành công");
        },
        onError: () => toast.error("Lỗi khi khóa tài khoản")
    });

    const mutationUnblock = useMutation({
        mutationFn: unblockUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("Đã mở khóa người dùng thành công");
        },
        onError: () => toast.error("Lỗi khi mở khóa tài khoản")
    });

    const mutationDeleteUser = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("Xóa người dùng thành công");
        },
        onError: () => toast.error("Lỗi khi xóa người dùng")
    });

    const handleView = (user: User) => {
        setSelectedUser(user);
        setModalVisible(true);
    };

    const triggerConfirm = (config: typeof confirmConfig) => {
        setConfirmConfig(config);
        setConfirmOpen(true);
    };

    const showToggleStatusConfirm = (record: User) => {
        const isLocking = record.status === 'active';
        triggerConfirm({
            title: isLocking ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?',
            description: isLocking 
                ? `Bạn có chắc chắn muốn khóa tài khoản của khách hàng "${record.name}"? Người dùng này sẽ không thể đăng nhập cho đến khi được mở khóa.`
                : `Bạn có chắc chắn muốn mở khóa tài khoản của khách hàng "${record.name}"? Người dùng này sẽ có thể đăng nhập bình thường.`,
            okText: isLocking ? 'Khóa tài khoản' : 'Mở khóa',
            isDanger: isLocking,
            icon: isLocking ? <Lock size={20} className="text-rose-600" /> : <Unlock size={20} className="text-emerald-600" />,
            onOk: () => {
                if (isLocking) {
                    mutationBlock.mutate(record._id);
                } else {
                    mutationUnblock.mutate(record._id);
                }
            }
        });
    };

    const showDeleteConfirm = (record: User) => {
        triggerConfirm({
            title: 'Xóa vĩnh viễn tài khoản?',
            description: `Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản của "${record.name}" không? Thao tác này là không thể hoàn tác và sẽ xóa sạch mọi thông tin liên quan.`,
            okText: 'Xóa vĩnh viễn',
            isDanger: true,
            icon: <Trash2 size={20} className="text-rose-600" />,
            onOk: () => mutationDeleteUser.mutate(record._id)
        });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const errors: any = {};
        if (!createName.trim()) errors.name = "Vui lòng nhập họ tên";
        else if (createName.trim().length < 2) errors.name = "Họ tên phải có ít nhất 2 ký tự";
        
        if (!createEmail.trim()) errors.email = "Vui lòng nhập email";
        else if (!/\S+@\S+\.\S+/.test(createEmail)) errors.email = "Email không đúng định dạng";
        
        if (!createPhone.trim()) errors.phone = "Vui lòng nhập số điện thoại";
        else if (!/^0[0-9]{9}$/.test(createPhone.trim())) {
            errors.phone = "Số điện thoại phải gồm 10 số và bắt đầu bằng số 0";
        }
        
        if (!createPassword.trim()) errors.password = "Vui lòng nhập mật khẩu";
        else if (createPassword.trim().length < 6) errors.password = "Mật khẩu phải từ 6 ký tự";

        if (Object.keys(errors).length > 0) {
            setCreateErrors(errors);
            return;
        }
        setCreateErrors({});
        mutationCreate.mutate({
            name: createName,
            email: createEmail,
            phone: createPhone,
            password: createPassword,
        });
    };

    const filteredUsers = users?.filter(u =>
        u.name.toLowerCase().includes(searchText.toLowerCase()) ||
        u.email.toLowerCase().includes(searchText.toLowerCase()) ||
        u.phone.includes(searchText)
    ) || [];

    // Reset pagination to page 1 on search
    const handleSearchChange = (val: string) => {
        setSearchText(val);
        setCurrentPage(1);
    };

    const totalUsers = filteredUsers.length;
    const totalPages = Math.ceil(totalUsers / pageSize) || 1;
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="px-4 pb-12 space-y-6 max-w-7xl mx-auto text-left">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Quản lý khách hàng</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Theo dõi tài khoản, phân quyền và khóa/mở khóa người dùng</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" size={14} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm Email, SĐT, Tên..."
                            className="w-full h-10 pl-9 pr-4 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-indigo-400"
                            value={searchText}
                            onChange={(e) => handleSearchChange(e.target.value)}
                        />
                    </div>
                    
                    <Button
                        onClick={() => setModalCreateVisible(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-5 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 w-full sm:w-auto"
                    >
                        <Plus size={14} /> Thêm khách hàng
                    </Button>
                </div>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Tổng người dùng', val: users?.length || 0, icon: <UsersIcon size={18} className="text-muted-foreground/60" /> },
                    { label: 'Đang hoạt động', val: users?.filter(u => u.status === 'active').length || 0, icon: <CheckCircle2 size={18} className="text-emerald-500" />, border: 'border-emerald-500/15' },
                    { label: 'Đã khóa', val: users?.filter(u => u.status === 'inactive').length || 0, icon: <AlertCircle size={18} className="text-rose-500" />, border: 'border-rose-500/15' },
                    { label: 'Quản trị viên', val: users?.filter(u => u.role === 'admin').length || 0, icon: <Shield size={18} className="text-amber-500" />, border: 'border-amber-500/15' },
                ].map((stat) => (
                    <Card key={stat.label} className={`border border-border/80 rounded-xl shadow-xs overflow-hidden ${stat.border || ""}`}>
                        <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                            {stat.icon}
                        </CardHeader>
                        <CardContent className="p-4 pt-1.5">
                            <div className="text-2xl font-bold text-foreground">{stat.val}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* LIST RENDER: MOBILE CARDS vs DESKTOP TABLE */}
            <div>
                {isLoading ? (
                    <div className="py-20 text-center text-muted-foreground text-xs font-semibold flex flex-col items-center justify-center gap-2 border border-border/60 rounded-xl bg-card">
                        <Loader2 className="animate-spin text-indigo-500" size={24} />
                        <span>Đang tải danh sách khách hàng...</span>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center border border-dashed rounded-xl bg-card">
                        <UsersIcon size={32} className="opacity-20 mb-2" />
                        <p className="text-sm font-semibold">Không tìm thấy khách hàng nào</p>
                        <p className="text-[11px] opacity-75 mt-0.5">Vui lòng thử đổi từ khóa tìm kiếm</p>
                    </div>
                ) : (
                    <Card className="border border-border/80 shadow-xs rounded-xl overflow-hidden p-0 bg-card">
                        
                        {/* 1. Mobile card stacks layout (<md) */}
                        <div className="block md:hidden divide-y divide-border/60">
                            {paginatedUsers.map((u) => {
                                const initial = u.name.charAt(0).toUpperCase();
                                const config = STATUS_CONFIG[u.status] || STATUS_CONFIG.inactive;
                                
                                return (
                                    <div key={u._id} className="p-4 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="relative shrink-0">
                                                    <div className="w-9 h-9 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center text-sm font-bold text-foreground">
                                                        {initial}
                                                    </div>
                                                    {u.role === 'admin' && (
                                                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border border-card flex items-center justify-center text-white" title="Quản trị viên">
                                                            <ShieldCheck size={8} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-foreground text-xs leading-none truncate">{u.name}</div>
                                                    <div className="text-[10px] text-muted-foreground mt-1 font-mono">{u.phone || 'Chưa cập SĐT'}</div>
                                                </div>
                                            </div>
                                            <div className="shrink-0 flex items-center gap-1.5">
                                                <Select
                                                    value={u.role}
                                                    onValueChange={(val) => mutationUpdateRole.mutate({ userId: u._id, role: val })}
                                                >
                                                    <SelectTrigger className="w-[85px] h-7 rounded-lg border-border bg-card font-bold text-[10px] text-foreground focus:ring-0">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-border bg-card">
                                                        <SelectItem value="user" className="text-[10px] font-bold">Khách</SelectItem>
                                                        <SelectItem value="admin" className="text-[10px] font-bold text-amber-500">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 text-[11px] text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <Mail size={12} className="shrink-0 text-muted-foreground/75" />
                                                <span className="truncate">{u.email}</span>
                                                {u.isEmailVerified && <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-1 py-0.2 rounded-md font-bold uppercase tracking-wider shrink-0">Đã xác minh</span>}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-border/40">
                                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase border ${config.color}`}>
                                                {config.icon}
                                                {config.label}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleView(u)}
                                                    className="h-8 w-8 text-muted-foreground hover:bg-muted"
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye size={14} />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => showToggleStatusConfirm(u)}
                                                    className="h-8 w-8 text-muted-foreground hover:bg-muted"
                                                    title={u.status === "active" ? "Khóa" : "Mở khóa"}
                                                >
                                                    {u.status === "active" ? <Lock size={14} /> : <Unlock size={14} />}
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => showDeleteConfirm(u)}
                                                    className="h-8 w-8 text-rose-600 hover:bg-rose-500/5"
                                                    title="Xóa"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* 2. Desktop table layout (>=md) */}
                        <div className="hidden md:block overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/30 border-b border-border/60">
                                    <TableRow>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider">Khách hàng</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider">Liên hệ</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider">Vai trò</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider">Trạng thái</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right pr-6">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedUsers.map((u) => {
                                        const initial = u.name.charAt(0).toUpperCase();
                                        const config = STATUS_CONFIG[u.status] || STATUS_CONFIG.inactive;
                                        
                                        return (
                                            <TableRow key={u._id} className="hover:bg-muted/10">
                                                {/* Customer avatar + phone */}
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <div className="w-8.5 h-8.5 rounded-xl bg-muted/65 border border-border/50 flex items-center justify-center text-xs font-bold text-foreground">
                                                                {initial}
                                                            </div>
                                                            {u.role === 'admin' && (
                                                                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border border-card flex items-center justify-center text-white" title="Quản trị viên">
                                                                    <ShieldCheck size={8} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-foreground text-xs leading-none">{u.name}</span>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <span className="text-[10px] text-muted-foreground font-mono">{u.phone || 'Chưa cập nhật SĐT'}</span>
                                                                {u.isEmailVerified && (
                                                                    <span className="text-[8px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded-md uppercase tracking-wider" title="Email đã xác thực">Đã xác minh</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Contact Details */}
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                                        <Mail size={13} className="shrink-0 text-muted-foreground/75" />
                                                        <span>{u.email}</span>
                                                    </div>
                                                </TableCell>

                                                {/* Role Switcher */}
                                                <TableCell>
                                                    <Select
                                                        value={u.role}
                                                        onValueChange={(val) => mutationUpdateRole.mutate({ userId: u._id, role: val })}
                                                    >
                                                        <SelectTrigger className="w-24 h-8 rounded-lg border-border bg-card font-semibold text-xs text-foreground focus:ring-0">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border-border bg-card">
                                                            <SelectItem value="user" className="text-xs font-semibold">Khách</SelectItem>
                                                            <SelectItem value="admin" className="text-xs font-semibold text-amber-500">Admin</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>

                                                {/* Status Badge */}
                                                <TableCell>
                                                    <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase border w-max ${config.color}`}>
                                                        {config.icon}
                                                        {config.label}
                                                    </div>
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => handleView(u)}
                                                            className="h-8 w-8 text-muted-foreground hover:bg-muted"
                                                            title="Xem chi tiết"
                                                        >
                                                            <Eye size={14} />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => showToggleStatusConfirm(u)}
                                                            className="h-8 w-8 text-muted-foreground hover:bg-muted"
                                                            title={u.status === "active" ? "Khóa" : "Mở khóa"}
                                                        >
                                                            {u.status === "active" ? <Lock size={14} /> : <Unlock size={14} />}
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => showDeleteConfirm(u)}
                                                            className="h-8 w-8 text-rose-600 hover:bg-rose-500/5"
                                                            title="Xóa"
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination footer */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10 text-[11px] font-semibold text-muted-foreground">
                            <span>
                                Hiển thị {Math.min(totalUsers, (currentPage - 1) * pageSize + 1)}-{Math.min(totalUsers, currentPage * pageSize)} trong {totalUsers} khách hàng
                            </span>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8 w-8 p-0 rounded-lg border-border"
                                >
                                    <ChevronLeft size={14} />
                                </Button>
                                {Array.from({ length: totalPages }).map((_, idx) => {
                                    const pageNum = idx + 1;
                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={currentPage === pageNum ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`h-8 w-8 p-0 rounded-lg text-[10px] font-bold ${
                                                currentPage === pageNum
                                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-sm"
                                                    : "border-border text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-8 w-8 p-0 rounded-lg border-border"
                                >
                                    <ChevronRight size={14} />
                                </Button>
                            </div>
                        </div>

                    </Card>
                )}
            </div>

            {/* MODAL CREATE USER (Shadcn Dialog style) */}
            <Dialog open={modalCreateVisible} onOpenChange={(v) => !v && setModalCreateVisible(false)}>
                <DialogContent className="sm:max-w-md p-0 border border-border/80 rounded-2xl shadow-xl bg-card">
                    <DialogHeader className="px-5 py-4 border-b border-border bg-muted/20">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2.5 bg-indigo-500/15 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                                <Plus size={16} />
                            </div>
                            <div className="text-left">
                                <DialogTitle className="text-sm font-extrabold text-foreground uppercase tracking-wider">
                                    Tạo tài khoản mới
                                </DialogTitle>
                                <DialogDescription className="text-[10px] text-muted-foreground mt-0.5">
                                    Thêm khách hàng hoặc quản trị viên mới vào hệ thống
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-left">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider pl-0.5">Họ tên <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                                <input
                                    type="text"
                                    placeholder="Nhập họ và tên..."
                                    value={createName}
                                    onChange={(e) => setCreateName(e.target.value)}
                                    className={`w-full h-10 pl-9 pr-4 bg-card border ${createErrors.name ? 'border-rose-500' : 'border-border'} rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
                                />
                            </div>
                            {createErrors.name && <p className="text-[10px] text-rose-500 font-semibold pl-0.5">{createErrors.name}</p>}
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider pl-0.5">Địa chỉ Email <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                                <input
                                    type="text"
                                    placeholder="Nhập email (ví dụ: user@example.com)"
                                    value={createEmail}
                                    onChange={(e) => setCreateEmail(e.target.value)}
                                    className={`w-full h-10 pl-9 pr-4 bg-card border ${createErrors.email ? 'border-rose-500' : 'border-border'} rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
                                />
                            </div>
                            {createErrors.email && <p className="text-[10px] text-rose-500 font-semibold pl-0.5">{createErrors.email}</p>}
                        </div>

                        {/* Phone */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider pl-0.5">Số điện thoại <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                                <input
                                    type="text"
                                    placeholder="Nhập số điện thoại..."
                                    value={createPhone}
                                    onChange={(e) => setCreatePhone(e.target.value)}
                                    className={`w-full h-10 pl-9 pr-4 bg-card border ${createErrors.phone ? 'border-rose-500' : 'border-border'} rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
                                />
                            </div>
                            {createErrors.phone && <p className="text-[10px] text-rose-500 font-semibold pl-0.5">{createErrors.phone}</p>}
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider pl-0.5">Mật khẩu khởi tạo <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={createPassword}
                                    onChange={(e) => setCreatePassword(e.target.value)}
                                    className={`w-full h-10 pl-9 pr-4 bg-card border ${createErrors.password ? 'border-rose-500' : 'border-border'} rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
                                />
                            </div>
                            {createErrors.password && <p className="text-[10px] text-rose-500 font-semibold pl-0.5">{createErrors.password}</p>}
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60 mt-5">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => { setModalCreateVisible(false); setCreateErrors({}); }}
                                className="text-xs font-semibold h-10 px-4 rounded-xl text-muted-foreground hover:bg-muted"
                            >
                                Hủy bỏ
                            </Button>
                            <Button
                                type="submit"
                                disabled={mutationCreate.isPending}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-5 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10 disabled:opacity-50"
                            >
                                {mutationCreate.isPending ? <Loader2 size={13} className="animate-spin text-white" /> : null}
                                Tạo tài khoản
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL USER DETAILS (Shadcn Dialog style) */}
            <Dialog open={modalVisible} onOpenChange={(v) => !v && setModalVisible(false)}>
                <DialogContent className="sm:max-w-md p-0 border border-border/80 rounded-2xl shadow-xl bg-card overflow-hidden">
                    {selectedUser && (
                        <div className="flex flex-col">
                            {/* Header Banner */}
                            <div className="relative h-28 bg-gradient-to-r from-indigo-500 to-violet-600 flex items-center justify-between px-5">
                                <div className="absolute -bottom-10 left-6">
                                    <div className="relative">
                                        <div className="w-20 h-20 rounded-2xl bg-card p-1 shadow-lg border border-border/50">
                                            <div className="w-full h-full rounded-xl bg-gradient-to-tr from-indigo-100 to-indigo-50 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-2xl font-black text-indigo-500 dark:text-indigo-400">
                                                {selectedUser.name.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                        {selectedUser.role === 'admin' && (
                                            <div className="absolute -top-1.5 -right-1.5 p-1 bg-amber-400 border border-card rounded-full text-white shadow-md">
                                                <ShieldCheck size={12} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-12 px-6 pb-6 space-y-6">
                                {/* Intro metadata */}
                                <div>
                                    <h2 className="text-lg font-black text-foreground leading-tight text-left">{selectedUser.name}</h2>
                                    <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                                        <span className={`px-2 py-0.5 font-bold uppercase rounded-md border ${
                                            selectedUser.status === 'active' 
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                        }`}>
                                            {selectedUser.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                                        </span>
                                        <span className="text-muted-foreground">|</span>
                                        <span className="font-bold text-muted-foreground uppercase">{selectedUser.role === 'admin' ? 'Admin' : 'Khách hàng'}</span>
                                    </div>
                                </div>

                                {/* Fields breakdown list */}
                                <div className="space-y-3.5 text-xs text-left">
                                    <div className="flex items-center gap-3 p-3 bg-muted/10 border border-border/60 rounded-xl">
                                        <Mail size={16} className="text-indigo-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase block">Email</span>
                                            <span className="font-semibold text-foreground truncate block mt-0.5">{selectedUser.email}</span>
                                        </div>
                                        {selectedUser.isEmailVerified ? (
                                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md uppercase shrink-0">Xác thực ✓</span>
                                        ) : (
                                            <span className="text-[9px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md uppercase shrink-0">Chưa XT</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-muted/10 border border-border/60 rounded-xl">
                                        <Phone size={16} className="text-indigo-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase block">Số điện thoại</span>
                                            <span className="font-semibold text-foreground truncate block mt-0.5">{selectedUser.phone || 'Chưa cập nhật'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-muted/10 border border-border/60 rounded-xl">
                                        <Calendar size={16} className="text-indigo-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase block">Ngày đăng ký</span>
                                            <span className="font-semibold text-foreground truncate block mt-0.5 font-mono">
                                                {dayjs(selectedUser.createdAt).format('DD/MM/YYYY HH:mm')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* REUSABLE CONFIRMATION DIALOG (Shadcn style, replaces Modal.confirm) */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="sm:max-w-md p-0 border border-border/80 rounded-2xl shadow-xl bg-card">
                    {confirmConfig && (
                        <>
                            <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20">
                                <div className="flex items-center gap-2.5">
                                    <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${confirmConfig.isDanger ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
                                        {confirmConfig.icon || <AlertCircle size={18} />}
                                    </div>
                                    <div className="text-left">
                                        <DialogTitle className="text-sm font-extrabold text-foreground uppercase tracking-wider">
                                            {confirmConfig.title}
                                        </DialogTitle>
                                    </div>
                                </div>
                            </DialogHeader>
                            <div className="p-5 space-y-4 text-xs text-left">
                                <div className="text-muted-foreground leading-relaxed font-semibold">
                                    {confirmConfig.description}
                                </div>
                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
                                    <Button variant="ghost" className="text-xs font-semibold h-10 px-4 rounded-xl" onClick={() => setConfirmOpen(false)}>
                                        Hủy bỏ
                                    </Button>
                                    <Button
                                        className={`text-xs font-bold h-10 px-5 rounded-xl ${
                                            confirmConfig.isDanger
                                                ? "bg-rose-600 hover:bg-rose-700 text-white"
                                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                        }`}
                                        onClick={() => {
                                            confirmConfig.onOk();
                                            setConfirmOpen(false);
                                        }}
                                    >
                                        {confirmConfig.okText}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default Users;
