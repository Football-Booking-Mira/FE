import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'sonner';

interface Court {
    _id: string;
    name: string;
    type: string;
    status: 'active' | 'maintenance' | 'locked';
    basePrice: number;
    peakPrice: number;
    images: string[];
}

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const [courts, setCourts] = useState<Court[]>([]);
    const [loading, setLoading] = useState(true);
    const socketRef = useRef<any>(null);

    useEffect(() => {
        const fetchCourts = async () => {
            try {
                const res = await fetch('http://localhost:3000/api/courts');
                const data = await res.json();
                if (data?.success) {
                    // Ẩn sân bảo trì (maintenance)
                    setCourts(data.data.filter((c: Court) => c.status !== 'maintenance'));
                }
            } catch (e) {
                console.error('Lỗi tải danh sách sân:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchCourts();

        // Kết nối socket
        const socket = io('http://localhost:3000', {
            transports: ['websocket'],
            withCredentials: true,
        });
        socketRef.current = socket;

        socket.on('court:updated', ({ courtId, court }) => {
            setCourts((prev) => {
                const exists = prev.some((c) => c._id === courtId);

                // Nếu sân chuyển sang "bảo trì" → ẩn đi
                if (court.status === 'maintenance') {
                    toast.warning(`⚠️ ${court.name} đang bảo trì, tạm ẩn khỏi danh sách!`, {
                        duration: 2000,
                        style: { background: '#f59e0b', color: '#fff' },
                    });
                    return prev.filter((c) => c._id !== courtId);
                }

                // Nếu sân chuyển từ bảo trì sang hoạt động → thêm lại
                if (!exists && court.status === 'active') {
                    return [...prev, court];
                }

                // Nếu sân đang tồn tại → cập nhật lại thông tin
                return prev.map((c) => (c._id === courtId ? court : c));
            });
        });

        return () => {
            socket.off('court:updated');
            socket.disconnect();
        };
    }, []);

    if (loading) return <p className='text-center mt-10'>Đang tải danh sách sân...</p>;

    return (
        <div className='max-w-6xl mx-auto py-10 px-6'>
            <h1 className='text-3xl font-bold text-center mb-10'>⚽ Danh sách sân bóng Mira</h1>
            <div className='grid md:grid-cols-3 sm:grid-cols-2 gap-8'>
                {courts.length === 0 ? (
                    <p className='text-center col-span-full text-gray-500'>
                        Không có sân nào khả dụng.
                    </p>
                ) : (
                    courts.map((court) => (
                        <div
                            key={court._id}
                            className={`bg-white rounded-lg shadow hover:shadow-md overflow-hidden border relative transition ${
                                court.status === 'locked'
                                    ? 'opacity-60 cursor-not-allowed'
                                    : 'cursor-pointer'
                            }`}
                            onClick={() => {
                                if (court.status === 'locked') {
                                    toast.info('🚫 Sân này đang bị khóa, không thể xem chi tiết!', {
                                        duration: 2000,
                                        style: { background: '#9ca3af', color: '#fff' },
                                    });
                                    return;
                                }
                                navigate(`/pitch/${court._id}`);
                            }}
                        >
                            <img
                                src={court.images?.[0] || 'https://picsum.photos/600/400'}
                                alt={court.name}
                                className='w-full h-48 object-cover'
                            />
                            <div className='p-4'>
                                <h3 className='text-xl font-bold mb-1'>{court.name}</h3>
                                <p className='text-gray-600 mb-2'>
                                    💰 {court.basePrice}k - {court.peakPrice}k
                                </p>
                                <button
                                    disabled={court.status === 'locked'}
                                    onClick={() => navigate(`/pitch/${court._id}`)}
                                    className={`w-full py-2 rounded font-semibold transition ${
                                        court.status === 'locked'
                                            ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
                                            : 'bg-green-600 hover:bg-green-700 text-white'
                                    }`}
                                >
                                    {court.status === 'locked' ? '🔒 Đang khóa' : 'Xem chi tiết'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default HomePage;
