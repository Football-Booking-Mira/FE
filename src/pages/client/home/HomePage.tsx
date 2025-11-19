import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'sonner';

interface Court {
    _id: string;
    name: string;
    type: 'indoor' | 'outdoor' | 'vip';
    status: 'active' | 'maintenance' | 'locked';
    basePrice: number;
    peakPrice: number;
    images: string[];
    formats?: string; // "5v5" | "7v7" | ...
}

const COURT_TYPES = ['5v5', '7v7', '9v9', '11v11'];

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const [courts, setCourts] = useState<Court[]>([]);
    const [loading, setLoading] = useState(true);
    const socketRef = useRef<any>(null);

    // State tìm kiếm & Lọc
    const [searchName, setSearchName] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [selectedTab, setSelectedTab] = useState('ALL'); // State cho Tab

    // Format tiền tệ
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('vi-VN').format(amount) + ' VNĐ';

    // Lấy toàn bộ sân (ẩn sân bảo trì)
    const fetchCourts = useCallback(async () => {
        try {
            const res = await fetch('http://localhost:3000/api/courts');
            const data = await res.json();
            if (data?.success) {
                setCourts(data.data.filter((c: Court) => c.status !== 'maintenance'));
            }
        } catch (e) {
            console.error('Lỗi tải danh sách sân:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    // Tìm kiếm theo tên + giá (gọi API /search)
    const handleSearch = async () => {
        const min = minPrice !== '' ? Number(minPrice) : undefined;
        const max = maxPrice !== '' ? Number(maxPrice) : undefined;

        if (min !== undefined && (Number.isNaN(min) || min < 0)) {
            toast.error('Giá tối thiểu không được âm');
            return;
        }
        if (max !== undefined && (Number.isNaN(max) || max < 0)) {
            toast.error('Giá tối đa không được âm');
            return;
        }
        if (min !== undefined && max !== undefined && min > max) {
            toast.error('Giá tối thiểu không được lớn hơn giá tối đa');
            return;
        }

        // Nếu không có điều kiện nào thì load lại toàn bộ luôn
        if (!searchName && min === undefined && max === undefined) {
            fetchCourts();
            return;
        }

        try {
            const query = new URLSearchParams({
                name: searchName,
                minPrice,
                maxPrice,
            });

            const res = await fetch(`http://localhost:3000/api/courts/search?${query.toString()}`);

            const data = await res.json();

            if (data.success) {
                setCourts(data.data.filter((c: Court) => c.status !== 'maintenance'));
            } else {
                toast.error('Không tìm thấy sân phù hợp');
            }
        } catch (err) {
            console.error(err);
            toast.error('Lỗi tìm kiếm sân');
        }
    };

    // Lần đầu vào trang + socket
    useEffect(() => {
        fetchCourts();

        const socket = io('http://localhost:3000', {
            transports: ['websocket', 'polling'],
            withCredentials: true,
        });
        socketRef.current = socket;

        socket.on('court:updated', ({ courtId, court }) => {
            setCourts((prev) => {
                const exists = prev.some((c) => c._id === courtId);
                if (court.status === 'maintenance') {
                    toast.warning(`⚠️ ${court.name} đang bảo trì!`);
                    return prev.filter((c) => c._id !== courtId);
                }
                if (!exists && court.status === 'active') return [...prev, court];
                return prev.map((c) => (c._id === courtId ? court : c));
            });
        });

        return () => {
            socket.off('court:updated');
            socket.disconnect();
        };
    }, [fetchCourts]);

    // Khi xóa hết điều kiện tìm kiếm => tự load lại tất cả sân
    useEffect(() => {
        if (!searchName && !minPrice && !maxPrice) {
            fetchCourts();
        }
    }, [searchName, minPrice, maxPrice, fetchCourts]);

    // Tab đang chọn
    const typesToRender = selectedTab === 'ALL' ? COURT_TYPES : [selectedTab];

    if (loading) return <p className='text-center mt-10'>Đang tải danh sách sân...</p>;

    return (
        <div className='max-w-6xl mx-auto py-10 px-6'>
            <h1 className='text-3xl font-bold text-center mb-6'>⚽ Danh sách sân bóng Mira</h1>

            {/* TÌM KIẾM */}
            <div className='bg-white p-5 rounded-lg shadow mb-6 flex flex-wrap gap-4'>
                <input
                    type='text'
                    placeholder='Tìm theo tên sân...'
                    className='border p-2 rounded w-full md:w-1/3'
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                />
                <input
                    type='number'
                    min={0}
                    placeholder='Giá tối thiểu'
                    className='border p-2 rounded w-full md:w-1/4'
                    value={minPrice}
                    onChange={(e) => {
                        const v = e.target.value;
                        if (v === '') {
                            setMinPrice('');
                            return;
                        }
                        const num = Number(v);
                        if (Number.isNaN(num) || num < 0) return; // 🚫 Không cho âm
                        setMinPrice(v);
                    }}
                />
                <input
                    type='number'
                    min={0}
                    placeholder='Giá tối đa'
                    className='border p-2 rounded w-full md:w-1/4'
                    value={maxPrice}
                    onChange={(e) => {
                        const v = e.target.value;
                        if (v === '') {
                            setMaxPrice('');
                            return;
                        }
                        const num = Number(v);
                        if (Number.isNaN(num) || num < 0) return; // 🚫 Không cho âm
                        setMaxPrice(v);
                    }}
                />
                <button
                    onClick={handleSearch}
                    className='bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-md'
                >
                    Tìm kiếm
                </button>
            </div>

            {/* TAB FILTER */}
            <div className='flex overflow-x-auto gap-3 mb-8 pb-2'>
                <button
                    onClick={() => setSelectedTab('ALL')}
                    className={`px-6 py-2 rounded-full font-semibold whitespace-nowrap transition ${
                        selectedTab === 'ALL'
                            ? 'bg-green-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    Tất cả
                </button>
                {COURT_TYPES.map((type) => (
                    <button
                        key={type}
                        onClick={() => setSelectedTab(type)}
                        className={`px-6 py-2 rounded-full font-semibold whitespace-nowrap transition ${
                            selectedTab === type
                                ? 'bg-green-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        Sân {type}
                    </button>
                ))}
            </div>

            {/* DANH SÁCH HIỂN THỊ */}
            <div className='space-y-12'>
                {courts.length === 0 ? (
                    <p className='text-center text-gray-500'>Không có sân nào khả dụng.</p>
                ) : (
                    typesToRender.map((type) => {
                        const filteredCourts = courts.filter((c) => c.formats === type);
                        if (filteredCourts.length === 0) return null;

                        return (
                            <div key={type} className='animate-fadeIn'>
                                <h2 className='text-2xl font-bold text-gray-800 mb-4 border-l-4 border-green-600 pl-3'>
                                    Danh sách sân {type}
                                </h2>
                                <div className='grid md:grid-cols-3 sm:grid-cols-2 gap-8'>
                                    {filteredCourts.map((court) => (
                                        <div
                                            key={court._id}
                                            className={`bg-white rounded-lg shadow hover:shadow-md border overflow-hidden relative transition ${
                                                court.status === 'locked'
                                                    ? 'opacity-60 cursor-not-allowed'
                                                    : 'cursor-pointer'
                                            }`}
                                            onClick={() => {
                                                if (court.status === 'locked') {
                                                    toast.info('🚫 Sân này đang bị khóa!');
                                                    return;
                                                }
                                                navigate(`/pitch/${court._id}`);
                                            }}
                                        >
                                            <img
                                                src={
                                                    court.images?.[0] ||
                                                    'https://picsum.photos/600/400'
                                                }
                                                alt={court.name}
                                                className='w-full h-48 object-cover'
                                            />
                                            <div className='p-4'>
                                                <h3 className='text-xl font-bold mb-1'>
                                                    {court.name}
                                                </h3>
                                                <p className='text-green-600 font-semibold mb-2'>
                                                    💰 {formatCurrency(court.basePrice)} -{' '}
                                                    {formatCurrency(court.peakPrice)}
                                                </p>
                                                <button
                                                    disabled={court.status === 'locked'}
                                                    className={`w-full py-2 rounded font-semibold transition ${
                                                        court.status === 'locked'
                                                            ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
                                                            : 'bg-green-600 hover:bg-green-700 text-white'
                                                    }`}
                                                >
                                                    {court.status === 'locked'
                                                        ? '🔒 Đang khóa'
                                                        : 'Xem chi tiết'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default HomePage;
