import React, { useState, useEffect } from 'react';
import { User, Edit2, Trash2, X, Save, Mail, Phone, Shield, CheckCircle, XCircle, Calendar, Clock, Upload as UploadIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { message, Upload, Avatar } from 'antd';
import type { RcFile } from "antd/es/upload/interface";
import api from "@/common/utils/api";
import { useAuth } from '@/common/contexts';
import LoadingScreen from '@/components/LoadingScreen';

interface ApiResponse {
    success: boolean;
    status: number;
    message: string;
    data: UserData;
}

interface UserData {
    _id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    status: string;
    avatar: string;
    isEmailVerified: boolean;
    createdAt: string;
    updatedAt: string;
}

interface FormData {
    name: string;
    phone: string;
    email: string;
    avatar: string;
}

interface Toast {
    type: 'success' | 'error';
    message: string;
}

const Profile: React.FC = () => {
    const { setUserAvatar } = useAuth();
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showEditForm, setShowEditForm] = useState<boolean>(false);
    const [toast, setToast] = useState<Toast | null>(null);
    const [formData, setFormData] = useState<FormData>({
        name: '',
        phone: '',
        email: '',
        avatar: ''
    });
    const [updating, setUpdating] = useState<boolean>(false);

    const baseURL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'; // Thay bằng baseURL thực tế

    useEffect(() => {
        fetchUserDetail();
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                setToast(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const fetchUserDetail = async (): Promise<void> => {
        try {
            setLoading(true);
            const userData = localStorage.getItem('user');
            if (!userData) {
                throw new Error('Không tìm thấy thông tin người dùng');
            }

            const userObj = JSON.parse(userData);
            const userId = userObj.id || userObj._id;

            if (!userId) {
                throw new Error('Không tìm thấy ID người dùng');
            }

            const response = await fetch(`${baseURL}/api/users/${userId}`);

            if (!response.ok) {
                throw new Error('Không thể tải thông tin người dùng');
            }

            const result: ApiResponse = await response.json();
            setUser(result.data);
            setFormData({
                name: result.data.name || '',
                phone: result.data.phone || '',
                email: result.data.email || '',
                avatar: result.data.avatar || ''
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (): void => {
        setShowEditForm(true);
    };

    const handleCloseForm = (): void => {
        setShowEditForm(false);
        if (user) {
            setFormData({
                name: user.name || '',
                phone: user.phone || '',
                email: user.email || '',
                avatar: user.avatar || ''
            });
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleUpdate = async (): Promise<void> => {
        try {
            setUpdating(true);
            const userDataStr = localStorage.getItem('user');
            const token = localStorage.getItem('token');

            if (!userDataStr) {
                throw new Error('Không tìm thấy thông tin người dùng');
            }

            if (!token) {
                throw new Error('Không tìm thấy token xác thực');
            }

            const userData = JSON.parse(userDataStr);
            const userId = userData.id || userData._id;

            const response = await fetch(`${baseURL}/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Cập nhật thất bại');
            }

            const result = await response.json();

            // API update trả về structure: { message, user }
            const updatedUser = result.user || result.data || result;

            if (updatedUser && updatedUser._id) {
                setUser(updatedUser);
                setFormData({
                    name: updatedUser.name || '',
                    phone: updatedUser.phone || '',
                    email: updatedUser.email || '',
                    avatar: updatedUser.avatar || ''
                });

                // Cập nhật local storage để Header thay đổi avatar ngay lập tức
                const updatedLocalStorageUser = { ...userData, ...updatedUser };
                localStorage.setItem('user', JSON.stringify(updatedLocalStorageUser));
                
                // Cập nhật Context lập tức để UI thay đổi thay vì reload trang
                if (updatedUser.avatar) {
                    setUserAvatar(updatedUser.avatar);
                }
                window.dispatchEvent(new Event('storage'));

                setShowEditForm(false);
                setToast({
                    type: 'success',
                    message: result.message || 'Cập nhật thông tin thành công!'
                });
            } else {
                throw new Error('Dữ liệu trả về không hợp lệ');
            }
        } catch (err) {
            setToast({
                type: 'error',
                message: err instanceof Error ? err.message : 'Có lỗi xảy ra khi cập nhật'
            });
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async (): Promise<void> => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa tài khoản này? Hành động này không thể hoàn tác!')) {
            return;
        }

        try {
            const userDataStr = localStorage.getItem('user');
            const token = localStorage.getItem('token');

            if (!userDataStr) {
                throw new Error('Không tìm thấy thông tin người dùng');
            }

            if (!token) {
                throw new Error('Không tìm thấy token xác thực');
            }

            const userData = JSON.parse(userDataStr);
            const userId = userData.id || userData._id;

            const response = await fetch(`${baseURL}/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            if (!response.ok) {
                throw new Error('Xóa tài khoản thất bại');
            }

            localStorage.removeItem('user');
            setToast({
                type: 'success',
                message: 'Xóa tài khoản thành công!'
            });

            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } catch (err) {
            setToast({
                type: 'error',
                message: err instanceof Error ? err.message : 'Có lỗi xảy ra khi xóa tài khoản'
            });
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'user':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-gray-100 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
        }
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'inactive':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
        }
    };

    if (loading) {
        return <LoadingScreen fullScreen text="Đang tải thông tin cá nhân..." />;
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Alert className="max-w-md border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-800 dark:text-red-300 ml-2">
                        {error}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background py-8 px-4 transition-colors duration-300">
            <div className="px-4">
                {/* Toast Notification */}
                {toast && (
                    <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm border ${toast.type === 'success'
                        ? 'bg-emerald-500/90 border-emerald-400'
                        : 'bg-red-500/90 border-red-400'
                        } text-white animate-slide-in flex items-center gap-3`}>
                        {toast.type === 'success' ? (
                            <CheckCircle className="w-5 h-5" />
                        ) : (
                            <XCircle className="w-5 h-5" />
                        )}
                        <span className="font-medium">{toast.message}</span>
                    </div>
                )}

                {/* Main Card */}
                <div className="max-w-4xl mx-auto mt-10 bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                    {/* Cover Header */}
                    <div className="h-32 bg-gradient-to-r from-emerald-100 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 w-full"></div>

                    {/* Profile Header (Avatar & Name) */}
                    <div className="px-6 sm:px-10 pb-8">
                        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-12 mb-8">
                            {/* Avatar Container */}
                            <div className="relative shrink-0">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-full border-4 border-background shadow-md object-cover bg-white dark:bg-muted" />
                                ) : (
                                    <div className="w-24 h-24 rounded-full border-4 border-background shadow-md bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                                        <User className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                )}
                                <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-background ${user?.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                            </div>
                            {/* User Info */}
                            <div className="flex flex-col items-center sm:items-start pb-1">
                                <h2 className="text-2xl font-bold text-foreground">{user?.name}</h2>
                                <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                                    <Badge variant="outline" className={`text-xs font-semibold border ${getRoleBadgeColor(user?.role || '')}`}>
                                        <Shield className="w-3 h-3 mr-1" />
                                        {user?.role?.toUpperCase()}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                                        {user?.status === 'active' ? 'Đang hoạt động' : 'Không hoạt động'}
                                    </Badge>
                                    <Badge variant="outline" className={`text-xs font-semibold ${user?.isEmailVerified
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
                                        }`}>
                                        <Mail className="w-3 h-3 mr-1" />
                                        {user?.isEmailVerified ? 'Email đã xác thực' : 'Chưa xác thực email'}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-6 sm:px-10 pb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            {/* Email */}
                            <div className="p-4 rounded-xl border border-border/60 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex items-center gap-4">
                                <div className="bg-emerald-100/50 dark:bg-emerald-900/30 p-2.5 rounded-full shrink-0">
                                    <Mail className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-0.5">Email</label>
                                    <p className="text-sm font-semibold text-foreground truncate">{user?.email}</p>
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="p-4 rounded-xl border border-border/60 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex items-center gap-4">
                                <div className="bg-emerald-100/50 dark:bg-emerald-900/30 p-2.5 rounded-full shrink-0">
                                    <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-0.5">Số điện thoại</label>
                                    <p className="text-sm font-semibold text-foreground">{user?.phone || 'Chưa cập nhật'}</p>
                                </div>
                            </div>

                            {/* Created At */}
                            <div className="p-4 rounded-xl border border-border/60 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex items-center gap-4">
                                <div className="bg-emerald-100/50 dark:bg-emerald-900/30 p-2.5 rounded-full shrink-0">
                                    <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-0.5">Ngày tạo</label>
                                    <p className="text-sm font-semibold text-foreground">
                                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        }) : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* Updated At */}
                            <div className="p-4 rounded-xl border border-border/60 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex items-center gap-4">
                                <div className="bg-emerald-100/50 dark:bg-emerald-900/30 p-2.5 rounded-full shrink-0">
                                    <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-0.5">Cập nhật lần cuối</label>
                                    <p className="text-sm font-semibold text-foreground">
                                        {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString('vi-VN', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        }) : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-end mt-8 pt-6 border-t border-border">
                            <Button
                                variant="outline"
                                onClick={handleDelete}
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Xóa tài khoản
                            </Button>
                            <Button
                                onClick={handleEdit}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                            >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Chỉnh sửa thông tin
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Edit Form Modal */}
                {showEditForm && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                        <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full animate-scale-in border border-border">
                            <div className="flex items-center justify-between p-6 border-b border-border">
                                <h2 className="text-2xl font-bold text-foreground">Chỉnh sửa thông tin</h2>
                                <button
                                    onClick={handleCloseForm}
                                    className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg p-2 transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                {/* Upload Avatar Section */}
                                <div className="flex flex-col items-center justify-center mb-6">
                                    <Upload
                                        maxCount={1}
                                        showUploadList={false}
                                        beforeUpload={async (file) => {
                                            try {
                                                const uploadData = new FormData();
                                                uploadData.append("avatar", file as RcFile);

                                                const res = await api.post("/upload/avatar", uploadData, {
                                                    headers: { "Content-Type": "multipart/form-data" },
                                                });

                                                const envelope: any = res.data || {};
                                                const url = envelope.data?.url;

                                                if (!url) {
                                                    throw new Error("Không nhận được URL ảnh từ server");
                                                }

                                                setFormData((prev) => ({ ...prev, avatar: url }));
                                                message.success("Tải ảnh thành công!");
                                            } catch (err: any) {
                                                console.error(err);
                                                const msg = err?.response?.data?.message || err?.message || "";
                                                let friendlyMsg = "Tải ảnh đại diện thất bại!";
                                                if (msg) {
                                                    if (msg.includes("status code")) {
                                                        const status = msg.match(/\d+/)?.[0] || "500";
                                                        friendlyMsg = `Máy chủ gặp lỗi (${status}) khi tải ảnh lên!`;
                                                    } else if (msg.includes("Network Error")) {
                                                        friendlyMsg = "Lỗi kết nối mạng! Vui lòng kiểm tra lại.";
                                                    } else {
                                                        friendlyMsg = msg;
                                                    }
                                                }
                                                message.error(friendlyMsg);
                                            }
                                            return false;
                                        }}
                                    >
                                        <div className="relative group cursor-pointer transition-transform hover:scale-105 duration-300">
                                            <Avatar
                                                src={formData.avatar}
                                                size={100}
                                                icon={!formData.avatar && <User className="w-10 h-10 text-muted-foreground mt-6 mx-auto" />}
                                                className="bg-muted border-4 border-background shadow-md"
                                            />
                                            <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <UploadIcon className="text-white w-6 h-6" />
                                            </div>
                                        </div>
                                    </Upload>
                                    <span className="text-sm font-medium text-muted-foreground mt-2">Đổi Ảnh Đại Diện</span>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-foreground mb-2">
                                        Họ và tên
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-muted-foreground"
                                        placeholder="Nhập họ và tên"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-foreground mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-muted-foreground"
                                        placeholder="Nhập email"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-foreground mb-2">
                                        Số điện thoại
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-muted-foreground"
                                        placeholder="Nhập số điện thoại"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleCloseForm}
                                        className="flex-1"
                                        disabled={updating}
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleUpdate}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                        disabled={updating}
                                    >
                                        {updating ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                                                <span>Đang lưu...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-5 h-5 mr-2" />
                                                <span>Lưu thay đổi</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
        </div>
    );
};

export default Profile;