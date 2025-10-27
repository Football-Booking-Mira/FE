import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Sun, Wrench, Lock, Plus, Edit, Trash2 } from 'lucide-react';
import CourtForm from './CourtForm';
import axios from 'axios';
import { toast } from 'sonner';

interface Court {
    _id: string;
    code: string;
    name: string;
    type: string;
    status: 'active' | 'maintenance' | 'locked';
    basePrice: number;
    peakPrice: number;
    amenities?: string[];
    description?: string;
    images?: string[];
}

export default function CourtList() {
    const [courts, setCourts] = useState<Court[]>([]);
    const [search, setSearch] = useState('');
    const [openForm, setOpenForm] = useState(false);
    const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
    const API = import.meta.env.VITE_API_URL;

    const fetchCourts = async () => {
        try {
            const res = await axios.get(`${API}/courts`);
            setCourts(res.data?.data || []);
        } catch (err) {
            console.error(err);
            toast.error('Không thể tải danh sách sân!');
        }
    };

    useEffect(() => {
        fetchCourts();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa sân này?')) return;
        try {
            await axios.delete(`${API}/courts/${id}`);
            toast.success('Đã xóa sân!');
            fetchCourts();
        } catch (err) {
            toast.error('Xóa thất bại!');
            console.error(err);
        }
    };

    const filteredCourts = courts.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className='space-y-6 p-5'>
            {/* Header */}
            <div className='flex justify-between items-center'>
                <h1 className='text-xl font-semibold'>Quản lý sân</h1>
                <Button
                    onClick={() => {
                        setSelectedCourt(null);
                        setOpenForm(true);
                    }}
                    className='flex items-center gap-2'
                >
                    <Plus size={16} /> Thêm sân
                </Button>
            </div>

            {/* Bộ lọc */}
            <div className='flex flex-col md:flex-row gap-2 md:items-center'>
                <Input
                    placeholder='Tìm kiếm sân...'
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className='w-full md:w-1/3'
                />
                <Button variant='outline' onClick={() => setSearch('')}>
                    Xóa bộ lọc
                </Button>
            </div>

            {/* Thống kê */}
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4'>
                <StatCard
                    title='Tổng sân'
                    value={courts.length}
                    icon={<MapPin className='text-blue-500' />}
                />
                <StatCard
                    title='Hoạt động'
                    value={courts.filter((c) => c.status === 'active').length}
                    icon={<Sun className='text-green-500' />}
                />
                <StatCard
                    title='Bảo trì'
                    value={courts.filter((c) => c.status === 'maintenance').length}
                    icon={<Wrench className='text-yellow-500' />}
                />
                <StatCard
                    title='Đã khóa'
                    value={courts.filter((c) => c.status === 'locked').length}
                    icon={<Lock className='text-red-500' />}
                />
            </div>

            {/* Danh sách sân */}
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                {filteredCourts.length === 0 && (
                    <p className='text-muted-foreground text-sm'>Không tìm thấy sân nào phù hợp.</p>
                )}

                {filteredCourts.map((court) => (
                    <Card key={court._id} className='hover:shadow-md transition'>
                        <CardHeader>
                            <CardTitle className='flex justify-between items-center'>
                                {court.name}
                                <span className='text-sm text-muted-foreground font-normal'>
                                    {court.type === 'indoor'
                                        ? 'Trong nhà'
                                        : court.type === 'vip'
                                        ? 'VIP'
                                        : 'Ngoài trời'}
                                </span>
                            </CardTitle>
                            <p className='text-sm text-muted-foreground'>Mã sân: {court.code}</p>
                        </CardHeader>
                        <CardContent className='space-y-2'>
                            <div className='text-sm'>
                                <p>
                                    <b>Giá thường:</b> {court.basePrice.toLocaleString()}₫
                                </p>
                                <p>
                                    <b>Giá cao điểm:</b> {court.peakPrice.toLocaleString()}₫
                                </p>
                            </div>

                            {/* Ảnh sân */}
                            {court.images && court.images.length > 0 && (
                                <div className='flex flex-wrap gap-2 mt-2'>
                                    {court.images.map((img, i) => (
                                        <img
                                            key={i}
                                            src={img}
                                            alt={`court-${i}`}
                                            className='w-20 h-20 object-cover rounded-md border'
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Tiện nghi */}
                            <div className='flex flex-wrap gap-1'>
                                {court.amenities?.map((a, i) => (
                                    <span
                                        key={i}
                                        className='bg-muted text-xs border px-2 py-0.5 rounded'
                                    >
                                        {a}
                                    </span>
                                ))}
                            </div>

                            <p className='text-sm text-muted-foreground'>
                                {court.description || '—'}
                            </p>

                            {/* Hành động */}
                            <div className='flex justify-between pt-2'>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={() => {
                                        setSelectedCourt(court);
                                        setOpenForm(true);
                                    }}
                                >
                                    <Edit size={14} /> Sửa
                                </Button>
                                <Button
                                    variant='destructive'
                                    size='sm'
                                    onClick={() => handleDelete(court._id)}
                                >
                                    <Trash2 size={14} /> Xóa
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Form thêm/sửa */}
            <CourtForm
                open={openForm}
                onClose={() => setOpenForm(false)}
                court={selectedCourt}
                onSuccess={fetchCourts}
            />
        </div>
    );
}

const StatCard = ({
    title,
    value,
    icon,
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
}) => (
    <Card>
        <CardContent className='flex items-center justify-between p-4'>
            <div>
                <p className='text-sm text-muted-foreground'>{title}</p>
                <h2 className='text-2xl font-bold'>{value}</h2>
            </div>
            {icon}
        </CardContent>
    </Card>
);
