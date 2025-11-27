import React, { useState, useEffect } from 'react';
import { User, Edit2, Trash2, X, Save, Mail, Phone, Shield, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
}

interface Toast {
    type: 'success' | 'error';
    message: string;
}

const Profile: React.FC = () => {
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showEditForm, setShowEditForm] = useState<boolean>(false);
    const [toast, setToast] = useState<Toast | null>(null);
    const [formData, setFormData] = useState<FormData>({
        name: '',
        phone: '',
        email: ''
    });
    const [updating, setUpdating] = useState<boolean>(false);

    const baseURL = 'http://localhost:3000'; // Thay bằng baseURL thực tế

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
                email: result.data.email || ''
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
                email: user.email || ''
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
                    email: updatedUser.email || ''
                });
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
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'inactive':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-blue-600"></div>
                    <p className="mt-4 text-slate-600 font-medium">Đang tải thông tin...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
                <Alert className="max-w-md border-red-200 bg-red-50">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <AlertDescription className="text-red-800 ml-2">
                        {error}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Toast Notification */}
                {toast && (
                    <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm border ${toast.type === 'success'
                        ? 'bg-green-500/90 border-green-400'
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
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                    {/* Header with gradient */}
                    <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-8 py-12">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <div className="bg-white rounded-2xl p-5 shadow-lg">
                                        {user?.avatar ? (
                                            <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-xl object-cover" />
                                        ) : (
                                            <User className="w-20 h-20 text-blue-600" />
                                        )}
                                    </div>
                                    <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center ${user?.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                                        }`}>
                                        {user?.status === 'active' ? (
                                            <CheckCircle className="w-4 h-4 text-white" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-white" />
                                        )}
                                    </div>
                                </div>
                                <div className="text-white">
                                    <h1 className="text-3xl font-bold mb-2">{user?.name}</h1>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor(user?.role || '')}`}>
                                            <Shield className="w-3 h-3 inline mr-1" />
                                            {user?.role?.toUpperCase()}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(user?.status || '')}`}>
                                            {user?.status === 'active' ? 'Đang hoạt động' : 'Không hoạt động'}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${user?.isEmailVerified
                                            ? 'bg-green-100 text-green-800 border-green-200'
                                            : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                            }`}>
                                            <Mail className="w-3 h-3 inline mr-1" />
                                            {user?.isEmailVerified ? 'Email đã xác thực' : 'Chưa xác thực email'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {/* Email */}
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 hover:border-blue-300 transition-all">
                                <div className="flex items-start gap-3">
                                    <div className="bg-blue-100 rounded-lg p-2.5">
                                        <Mail className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Email</label>
                                        <p className="text-base text-slate-900 font-medium truncate">{user?.email}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 hover:border-blue-300 transition-all">
                                <div className="flex items-start gap-3">
                                    <div className="bg-green-100 rounded-lg p-2.5">
                                        <Phone className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Số điện thoại</label>
                                        <p className="text-base text-slate-900 font-medium">{user?.phone || 'Chưa cập nhật'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Created At */}
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 hover:border-blue-300 transition-all">
                                <div className="flex items-start gap-3">
                                    <div className="bg-purple-100 rounded-lg p-2.5">
                                        <Calendar className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Ngày tạo</label>
                                        <p className="text-base text-slate-900 font-medium">
                                            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            }) : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Updated At */}
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 hover:border-blue-300 transition-all">
                                <div className="flex items-start gap-3">
                                    <div className="bg-orange-100 rounded-lg p-2.5">
                                        <Calendar className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Cập nhật lần cuối</label>
                                        <p className="text-base text-slate-900 font-medium">
                                            {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString('vi-VN', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            }) : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4">
                            <button
                                onClick={handleEdit}
                                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
                            >
                                <Edit2 className="w-5 h-5 text-white" />
                                <span className='text-white'>Chỉnh sửa thông tin</span>
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3.5 rounded-xl font-semibold transition-all shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40"
                            >
                                <Trash2 className="w-5 h-5 text-white" />
                                <span className='text-white'>Xóa tài khoản</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Edit Form Modal */}
                {showEditForm && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
                            <div className="flex items-center justify-between p-6 border-b border-slate-200">
                                <h2 className="text-2xl font-bold text-slate-900">Chỉnh sửa thông tin</h2>
                                <button
                                    onClick={handleCloseForm}
                                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-2 transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Họ và tên
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="Nhập họ và tên"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="Nhập email"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Số điện thoại
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="Nhập số điện thoại"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleCloseForm}
                                        className="flex-1 px-4 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-semibold"
                                        disabled={updating}
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleUpdate}
                                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3 rounded-xl transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
                                        disabled={updating}
                                    >
                                        {updating ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                                <span>Đang lưu...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-5 h-5" />
                                                <span>Lưu thay đổi</span>
                                            </>
                                        )}
                                    </button>
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