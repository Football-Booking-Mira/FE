import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, DollarSign, MapPin, RefreshCcw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const chartData = [
    { name: 'Đang sử dụng', value: 0 },
    { name: 'Trống', value: 100 },
];

const COLORS = ['#f87171', '#22c55e'];

export default function DashBoard() {
    return (
        <div className='space-y-6'>
            {/* Header */}
            <div className='flex justify-between items-center'>
                <div>
                    <h2 className='text-2xl font-bold'>Dashboard Quản Lý</h2>
                    <p className='text-sm text-gray-500'>Cập nhật lần cuối: 21:46:32</p>
                </div>
                <Button>
                    <RefreshCcw className='w-4 h-4 mr-2' /> Làm mới
                </Button>
            </div>

            {/* Top Cards */}
            <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                <Card>
                    <CardHeader className='flex justify-between items-center pb-2'>
                        <CardTitle>Tổng khách hàng</CardTitle>
                        <Users className='text-blue-500 w-5 h-5' />
                    </CardHeader>
                    <CardContent>
                        <div className='text-2xl font-semibold'>2</div>
                        <p className='text-xs text-gray-500'>Hoạt động</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className='flex justify-between items-center pb-2'>
                        <CardTitle>Đặt sân hôm nay</CardTitle>
                        <Calendar className='text-green-500 w-5 h-5' />
                    </CardHeader>
                    <CardContent>
                        <div className='text-2xl font-semibold'>0</div>
                        <p className='text-xs text-gray-500'>1 chờ xác nhận</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className='flex justify-between items-center pb-2'>
                        <CardTitle>Doanh thu hôm nay</CardTitle>
                        <DollarSign className='text-yellow-500 w-5 h-5' />
                    </CardHeader>
                    <CardContent>
                        <div className='text-2xl font-semibold'>360.000 ₫</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className='flex justify-between items-center pb-2'>
                        <CardTitle>Sân đang sử dụng</CardTitle>
                        <MapPin className='text-purple-500 w-5 h-5' />
                    </CardHeader>
                    <CardContent>
                        <div className='text-2xl font-semibold'>0/3</div>
                        <p className='text-xs text-gray-500'>0% lấp đầy</p>
                    </CardContent>
                </Card>
            </div>

            {/* Chart & Pie */}
            <div className='grid md:grid-cols-2 gap-4'>
                <Card>
                    <CardHeader>
                        <CardTitle>Doanh thu 7 ngày gần đây</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='h-48 flex items-center justify-center text-gray-400 text-sm'>
                            (Biểu đồ đang cập nhật...)
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Tỷ lệ sử dụng sân</CardTitle>
                    </CardHeader>
                    <CardContent className='flex flex-col items-center'>
                        <div className='h-48 w-full'>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx='50%'
                                        cy='50%'
                                        outerRadius={70}
                                        label
                                        dataKey='value'
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent bookings + alerts */}
            <div className='grid md:grid-cols-2 gap-4'>
                <Card>
                    <CardHeader>
                        <CardTitle>Đặt sân gần đây</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='flex items-center justify-between border-b py-2'>
                            <div className='flex items-center space-x-3'>
                                <Avatar className='w-8 h-8'>
                                    <AvatarFallback>N</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className='font-medium text-sm'>Nguyễn Văn A</p>
                                    <p className='text-xs text-gray-500'>Hoàn thành</p>
                                </div>
                            </div>
                            <div className='text-sm text-gray-600'>360.000 ₫</div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Thông báo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert className='border-yellow-300 bg-yellow-50'>
                            <AlertDescription>⚠️ 1 đơn đặt sân cần xác nhận</AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
