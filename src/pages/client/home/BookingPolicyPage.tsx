import React, { useEffect, useState } from 'react';
import { Typography, Checkbox, Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Text, Paragraph } = Typography;

const BookingPolicyPage: React.FC = () => {
    const navigate = useNavigate();
    const [accepted, setAccepted] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('checkout-data');
        if (!stored) {
            message.error('Không tìm thấy thông tin đặt sân, quay lại trang chủ!');
            navigate('/', { replace: true });
            return;
        }
        setReady(true);
    }, [navigate]);

    if (!ready) return null;

    const handleAgree = () => {
        if (!accepted) {
            message.warning('Vui lòng tích vào ô "Tôi đã đọc và đồng ý"');
            return;
        }
        navigate('/checkout');
    };

    const handleBack = () => {
        navigate(-1);
    };

    return (
        <div
            className='
                min-h-screen bg-gray-50 dark:bg-gray-950 
                py-12 px-3 sm:px-6
                flex justify-center items-start lg:items-center
                transition-all duration-300
            '
        >
            <div className='w-full max-w-6xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2.5rem] border-none bg-white dark:bg-gray-900 p-8 sm:p-12 transition-all relative overflow-hidden'>
                {/* Trang trí nền */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-green-500/10 dark:bg-green-500/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl"></div>

                {/* HEADER */}
                <header className='relative text-center mb-16'>
                    <h1 className='text-4xl sm:text-5xl lg:text-6xl font-black mb-6 tracking-tight bg-linear-to-r from-green-600 to-emerald-500 dark:from-green-400 dark:to-emerald-300 bg-clip-text text-transparent pb-1'>
                        Quy định & Nội quy
                    </h1>
                    <div className='max-w-3xl mx-auto'>
                        <p className='text-gray-600 dark:text-gray-300 text-base sm:text-xl leading-relaxed font-medium'>
                            Để sân chơi luôn chuyên nghiệp và đảm bảo quyền lợi tốt nhất cho bạn, 
                            hãy dành 1 phút điểm qua các quy định cốt lõi tại <span className="text-green-600 dark:text-green-400 font-bold">Sân Bóng Mira</span>.
                        </p>
                    </div>
                </header>

                <div className='relative grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20'>
                    {/* CỘT 1 */}
                    <section className='space-y-8'>
                        <div className='flex items-center gap-4'>
                            <div className='flex items-center justify-center w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 shadow-inner'>
                                <span className='text-xl font-black'>I</span>
                            </div>
                            <h2 className='text-2xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider'>
                                Thanh toán & Giữ chỗ
                            </h2>
                        </div>

                        <div className='space-y-6'>
                            <div className='group bg-white dark:bg-gray-800/50 p-6 rounded-4xl border border-gray-100 dark:border-gray-700/50 hover:border-green-200 dark:hover:border-green-800 transition-all shadow-sm hover:shadow-xl'>
                                <h3 className='font-black text-gray-900 dark:text-gray-100 text-lg mb-4 flex items-center gap-3'>
                                    <span className='w-2 h-2 rounded-full bg-green-500'></span>
                                    KHÁCH ĐẶT ONLINE
                                </h3>
                                <div className='space-y-4 text-gray-700 dark:text-gray-300'>
                                    <p className='flex items-start gap-3'>
                                        <span className='p-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'>✓</span>
                                        <span>Thanh toán <b className='text-green-600 dark:text-green-400 text-lg leading-none'>100%</b> cọc ngay để chốt lịch nhanh nhất.</span>
                                    </p>
                                    <p className='flex items-start gap-3'>
                                        <span className='p-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'>✓</span>
                                        <span>Hệ thống tự động khóa sân ngay sau khi giao dịch thành công.</span>
                                    </p>
                                </div>
                            </div>

                            <div className='group bg-white dark:bg-gray-800/50 p-6 rounded-4xl border border-gray-100 dark:border-gray-700/50 hover:border-blue-200 dark:hover:border-blue-800 transition-all shadow-sm hover:shadow-xl'>
                                <h3 className='font-black text-gray-900 dark:text-gray-100 text-lg mb-4 flex items-center gap-3'>
                                    <span className='w-2 h-2 rounded-full bg-blue-500'></span>
                                    KHÁCH ĐẶT TẠI SÂN
                                </h3>
                                <div className='space-y-4 text-gray-700 dark:text-gray-300'>
                                    <p className='flex items-start gap-3'>
                                        <span className='p-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'>✓</span>
                                        <span>Yêu cầu đặt cọc trước <b className='text-blue-600 dark:text-blue-400 text-lg leading-none'>50%</b> tại quầy.</span>
                                    </p>
                                    <p className='flex items-start gap-3'>
                                        <span className='p-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'>✓</span>
                                        <span>Phần còn lại hoàn tất trước khi tiếng còi khai cuộc vang lên.</span>
                                    </p>
                                </div>
                            </div>

                            <div className='p-6 rounded-4xl bg-linear-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border border-red-100 dark:border-red-900/30'>
                                <h3 className='font-black text-red-600 dark:text-red-400 text-lg mb-4 flex items-center gap-2'>
                                    ⚠️ QUY ĐỊNH HỦY LỊCH
                                </h3>
                                <div className='space-y-3'>
                                    <div className='flex items-center justify-between p-3 bg-white dark:bg-gray-900/50 rounded-xl'>
                                        <span className='text-gray-600 dark:text-gray-200 font-medium'>Trước 6 tiếng</span>
                                        <span className='text-green-600 dark:text-green-400 font-black'>Hoàn tiền 100%</span>
                                    </div>
                                    <div className='flex items-center justify-between p-3 bg-white dark:bg-gray-900/50 rounded-xl'>
                                        <span className='text-gray-600 dark:text-gray-200 font-medium'>Dưới 6 tiếng</span>
                                        <span className='text-red-600 dark:text-red-400 font-black italic'>Không hoàn trả</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* CỘT 2 */}
                    <section className='space-y-8'>
                        <div className='flex items-center gap-4'>
                            <div className='flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-inner'>
                                <span className='text-xl font-black'>II</span>
                            </div>
                            <h2 className='text-2xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider'>
                                Văn hóa & Nội quy sân
                            </h2>
                        </div>

                        <div className='space-y-8'>
                            <div className='relative pl-10 border-l-2 border-dashed border-gray-200 dark:border-gray-700 space-y-8'>
                                <div className='relative'>
                                    <div className='absolute -left-[45px] top-0 w-6 h-6 rounded-full bg-white dark:bg-gray-950 border-4 border-green-500 shadow-sm'></div>
                                    <h4 className='text-xl font-black text-gray-900 dark:text-gray-100 mb-3 uppercase'>Giày thi đấu</h4>
                                    <Paragraph className='dark:text-gray-200! text-base!'>
                                        <span className='text-red-500 font-bold'>NGHIÊM CẤM:</span> Giày đinh cao (FG/SG). 
                                        <br />
                                        <span className='text-green-600 dark:text-green-400 font-bold'>YÊU CẦU:</span> Chỉ sử dụng giày đinh dăm (TF) hoặc chuyên dụng sân cỏ nhân tạo để bảo vệ an toàn cho chính bạn và mặt sân.
                                    </Paragraph>
                                </div>

                                <div className='relative'>
                                    <div className='absolute -left-[45px] top-0 w-6 h-6 rounded-full bg-white dark:bg-gray-950 border-4 border-blue-500 shadow-sm'></div>
                                    <h4 className='text-xl font-black text-gray-900 dark:text-gray-100 mb-3 uppercase'>Check-in & Thời gian</h4>
                                    <Paragraph className='dark:text-gray-200! text-base!'>
                                        Đến sân trước <span className='font-bold text-blue-500'>10-15 phút</span> để chuẩn bị.
                                        Vui lòng kết thúc trận đấu đúng giờ để bàn giao sân cho ca tiếp theo.
                                        <br />
                                        <span className='text-red-500 font-bold mt-1 inline-block'>LƯU Ý:</span> Khách đến muộn quá thời gian quy định (quá 5 phút so với giờ bắt đầu ca) sẽ bị hủy sân và <span className='text-red-500 font-bold'>không được hoàn tiền</span>.
                                    </Paragraph>
                                </div>

                                <div className='relative'>
                                    <div className='absolute -left-[45px] top-0 w-6 h-6 rounded-full bg-white dark:bg-gray-950 border-4 border-emerald-500 shadow-sm'></div>
                                    <h4 className='text-xl font-black text-gray-900 dark:text-gray-100 mb-3 uppercase'>An ninh & Văn hóa</h4>
                                    <Paragraph className='dark:text-gray-200! text-base!'>
                                        Giữ gìn vệ sinh chung, không hút thuốc và sử dụng chất kích thích tại sân.
                                        Mọi hành vi làm hư hỏng cơ sở vật chất sẽ phải bồi thường theo quy định.
                                    </Paragraph>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800/80 p-6 rounded-3xl border-2 border-transparent dark:border-gray-700/50">
                                <h5 className="font-black text-gray-900 dark:text-gray-100 mb-2 uppercase text-sm tracking-widest">🔐 Bảo mật 100%</h5>
                                <p className="text-gray-500 dark:text-gray-200 text-sm italic">
                                    Mira cam kết bảo mật tuyệt đối thông tin cá nhân. Chúng tôi chỉ sử dụng dữ liệu để xác nhận dịch vụ nhanh chóng nhất.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                <div className='mt-20 pt-10 border-t dark:border-gray-800'>
                    <div className='max-w-3xl mx-auto flex flex-col items-center gap-10'>
                        <div className="bg-green-50 dark:bg-green-900/20 px-8 py-4 rounded-full border border-green-100 dark:border-green-800 transition-all hover:scale-105">
                            <Checkbox
                                checked={accepted}
                                onChange={(e) => setAccepted(e.target.checked)}
                                className='text-gray-900! dark:text-gray-100! text-lg! sm:text-xl! font-black!'
                            >
                                Tôi xin chịu trách nhiệm & chấp hành mọi nội quy trên
                            </Checkbox>
                        </div>

                        <div className='flex flex-col sm:flex-row gap-6 w-full'>
                            <button 
                                onClick={handleBack} 
                                className='flex-1 py-5 px-10 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-all active:scale-95 shadow-sm'
                            >
                                Quay lại
                            </button>
                            <button
                                onClick={handleAgree}
                                className={`flex-1 py-5 px-10 rounded-2xl font-black text-lg transition-all active:scale-95 shadow-2xl ${
                                    accepted 
                                    ? 'bg-linear-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white shadow-green-600/30' 
                                    : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                }`}
                            >
                                Đồng ý & Tiếp tục
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingPolicyPage;
