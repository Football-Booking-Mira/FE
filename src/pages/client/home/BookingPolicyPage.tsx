import React, { useEffect, useState } from 'react';
import { Card, Typography, Checkbox, Button, Divider, message } from 'antd';

const { Title, Text, Paragraph } = Typography;

const BookingPolicyPage: React.FC = () => {
    const [accepted, setAccepted] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('checkout-data');
        if (!stored) {
            message.error('Không tìm thấy thông tin đặt sân, quay lại trang chủ!');
            window.location.href = '/';
            return;
        }
        setReady(true);
    }, []);

    if (!ready) return null;

    const handleAgree = () => {
        if (!accepted) {
            message.warning('Vui lòng tích vào ô "Tôi đã đọc và đồng ý"');
            return;
        }
        window.location.href = '/checkout';
    };

    const handleBack = () => {
        window.history.back();
    };

    return (
        <div
            className='
                min-h-screen bg-gray-50 
                py-12 px-3 sm:px-6
                flex justify-center items-start lg:items-center
            '
        >
            <Card className='w-full max-w-6xl shadow-xl rounded-2xl sm:rounded-3xl'>
                {/* HEADER */}
                <header className='text-center mb-10'>
                    <Title
                        level={1}
                        className='!mb-2 !text-green-600 !text-3xl sm:!text-4xl lg:!text-[40px]'
                    >
                        Quy định đặt sân &amp; Nội quy chung
                    </Title>
                    <Text type='secondary' className='text-sm sm:text-base'>
                        Để đảm bảo quyền lợi và trải nghiệm tốt nhất, vui lòng đọc kỹ các quy định
                        sau trước khi thanh toán.
                    </Text>
                </header>

                <div className='grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14'>
                    <section className='leading-relaxed'>
                        <Title level={3} className='!mb-4 !text-xl lg:!text-2xl'>
                            I. THANH TOÁN &amp; GIỮ CHỖ (Tùy hình thức đặt)
                        </Title>

                        <Typography className='text-base lg:text-lg space-y-4'>
                            <Paragraph className='!mb-1'>
                                <Text strong>1. ĐỐI VỚI KHÁCH ĐẶT ONLINE TRÊN WEBSITE</Text>
                            </Paragraph>
                            <ul className='list-disc pl-6 space-y-2'>
                                <li>
                                    <Text strong>Yêu cầu:</Text> Bạn cần{' '}
                                    <Text strong>Thanh toán Online 100%</Text> tổng giá trị tiền sân
                                    ngay tại bước đặt lịch trên web.
                                </li>
                                <li>
                                    <Text strong>Xác nhận:</Text> Hệ thống chỉ giữ chỗ và gửi xác
                                    nhận đặt sân thành công sau khi nhận đủ 100% tiền thanh toán.
                                </li>
                            </ul>

                            <Paragraph className='!mt-6 !mb-1'>
                                <Text strong>
                                    2. ĐỐI VỚI KHÁCH ĐẾN ĐẶT TRỰC TIẾP TẠI SÂN (Offline)
                                </Text>
                            </Paragraph>
                            <ul className='list-disc pl-6 space-y-2'>
                                <li>
                                    <Text strong>Yêu cầu:</Text> Bạn cần{' '}
                                    <Text strong>Đặt cọc nóng 50%</Text> giá trị tiền sân ngay tại
                                    quầy để được giữ lịch cho bạn.
                                </li>
                                <li>
                                    <Text strong>Thanh toán phần còn lại:</Text> 50% số tiền còn lại
                                    sẽ được thanh toán tại sân trước khi trận đấu bắt đầu.
                                </li>
                            </ul>

                            <Paragraph className='!mt-6 !mb-1 italic'>
                                <Text strong>Lưu ý chung về việc Hủy lịch</Text> (áp dụng cho cả 2
                                hình thức trên):
                            </Paragraph>
                            <ul className='list-disc pl-6 space-y-2 italic'>
                                <li>
                                    <Text strong>Hủy sớm (Cách giờ đá trên 6 tiếng):</Text> Được
                                    hoàn lại toàn bộ số tiền đã đóng (100% hoặc 50% cọc).
                                </li>
                                <li>
                                    <Text strong>
                                        Hủy gấp (Cách giờ đá dưới 6 tiếng) trước giờ đá:
                                    </Text>{' '}
                                    Không được hoàn lại số tiền đã đóng.
                                </li>
                            </ul>
                        </Typography>
                    </section>

                    <section className='leading-relaxed'>
                        <Title level={3} className='!mb-4 !text-xl lg:!text-2xl'>
                            II. QUY ĐỊNH CHUNG TẠI SÂN
                        </Title>

                        <Typography className='text-base lg:text-lg space-y-4'>
                            <Paragraph className='!mb-1'>
                                <Text strong>1. Check-in &amp; Giày thi đấu:</Text>
                            </Paragraph>
                            <ul className='list-disc pl-6 space-y-2'>
                                <li>Vui lòng đến và rời sân đúng khung giờ đã đặt.</li>
                                <li>
                                    <Text strong>BẮT BUỘC</Text> sử dụng giày đinh dăm chuyên dụng
                                    (TF/AG). Nghiêm cấm giày đinh cao gây hỏng mặt cỏ.
                                </li>
                            </ul>

                            <Paragraph className='!mt-6 !mb-1'>
                                <Text strong>2. Tài sản &amp; Dịch vụ thuê đồ:</Text>
                            </Paragraph>
                            <ul className='list-disc pl-6 space-y-2'>
                                <li>
                                    Khách tự bảo quản tư trang. Giữ vệ sinh và văn hóa thể thao
                                    (không gây gổ).
                                </li>
                                <li>
                                    Có trách nhiệm bảo quản đồ thuê (bóng, áo bib...) và hoàn trả
                                    đầy đủ sau trận. Khách hàng bồi thường theo quy định nếu làm mất
                                    đồ hoặc hư hỏng cơ sở vật chất sân.
                                </li>
                            </ul>

                            <Paragraph className='!mt-6 !mb-1'>
                                <Text strong>3. Bảo mật thông tin:</Text>
                            </Paragraph>
                            <ul className='list-disc pl-6 space-y-2'>
                                <li>
                                    Thông tin cá nhân của bạn chỉ được sử dụng để xác nhận đặt sân
                                    và liên hệ hỗ trợ, cam kết không chia sẻ cho bên thứ ba.
                                </li>
                            </ul>
                        </Typography>
                    </section>
                </div>

                <Divider className='!mt-10 !mb-6' />

                {/* checkbox + nút */}
                <div className='mt-2 space-y-4'>
                    <Checkbox
                        checked={accepted}
                        onChange={(e) => setAccepted(e.target.checked)}
                        className='text-base lg:text-lg'
                    >
                        Tôi đã đọc và đồng ý với các quy định &amp; nội quy ở trên
                    </Checkbox>

                    <div className='flex flex-col sm:flex-row gap-4 mt-2'>
                        <Button onClick={handleBack} block className='!h-11 !text-base lg:!text-lg'>
                            Quay lại chọn sân
                        </Button>
                        <Button
                            type='primary'
                            className='!bg-green-600 hover:!bg-green-700 !h-11 !text-base lg:!text-lg'
                            block
                            onClick={handleAgree}
                        >
                            Tôi đồng ý, tiếp tục thanh toán
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default BookingPolicyPage;
