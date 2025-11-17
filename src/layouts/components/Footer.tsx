import {
    FaFacebookF,
    FaInstagram,
    FaYoutube,
    FaMapMarkerAlt,
    FaPhoneAlt,
    FaEnvelope,
} from 'react-icons/fa';

const Footer = () => {
    return (
        <footer className='bg-[#0b132b] text-white mt-16'>
            {/* Nội dung chính */}
            <div className='max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 px-6 py-12 border-t border-gray-700'>
                {/* Cột 1 - Logo và mô tả */}
                <div>
                    <h2 className='text-2xl font-bold mb-4 flex items-center'>
                        <span className='bg-green-600 text-white rounded-full p-2 mr-2'>⚽</span>
                        Mira
                    </h2>
                    <p className='text-gray-300'>
                        Hệ thống sân bóng đá hiện đại với đầy đủ tiện ích. Chúng tôi cam kết mang
                        đến trải nghiệm chơi bóng tuyệt vời nhất cho mọi đội bóng.
                    </p>

                    {/* Mạng xã hội */}
                    <div className='flex space-x-4 mt-6'>
                        <a
                            href='#'
                            className='bg-green-600 hover:bg-green-500 p-3 rounded-full transition'
                        >
                            <FaFacebookF />
                        </a>
                        <a
                            href='#'
                            className='bg-green-600 hover:bg-green-500 p-3 rounded-full transition'
                        >
                            <FaInstagram />
                        </a>
                        <a
                            href='#'
                            className='bg-green-600 hover:bg-green-500 p-3 rounded-full transition'
                        >
                            <FaYoutube />
                        </a>
                    </div>
                </div>

                {/* Cột 2 - Thông tin liên hệ */}
                <div>
                    <h3 className='text-xl font-semibold mb-4'>Thông tin liên hệ</h3>
                    <ul className='space-y-3 text-gray-300'>
                        <li className='flex items-start'>
                            <FaMapMarkerAlt className='text-green-500 mt-1 mr-3' />
                            Số 1 Trịnh Văn Bô, Xuân Phương, Hà Nội
                        </li>
                        <li className='flex items-center'>
                            <FaPhoneAlt className='text-green-500 mr-3' /> 0123 456 789
                        </li>
                        <li className='flex items-center'>
                            <FaEnvelope className='text-green-500 mr-3' /> info@mira.vn
                        </li>
                    </ul>
                </div>

                {/* Cột 3 - Liên kết nhanh */}
                <div>
                    <h3 className='text-xl font-semibold mb-4'>Liên kết nhanh</h3>
                    <ul className='space-y-3 text-gray-300'>
                        <li>
                            <a href='#' className='hover:text-green-500'>
                                Trang chủ
                            </a>
                        </li>
                        <li>
                            <a href='#' className='hover:text-green-500'>
                                Đặt sân
                            </a>
                        </li>
                        <li>
                            <a href='#' className='hover:text-green-500'>
                                Lịch thi đấu
                            </a>
                        </li>
                        <li>
                            <a href='#' className='hover:text-green-500'>
                                Bảng giá
                            </a>
                        </li>
                        <li>
                            <a href='#' className='hover:text-green-500'>
                                Liên hệ
                            </a>
                        </li>
                    </ul>
                </div>

                {/* Cột 4 - Bản đồ (nhỏ hơn) */}
                <div>
                    <h3 className='text-xl font-semibold mb-4'>Bản đồ</h3>
                    <div className='w-[70%] mx-auto aspect-square overflow-hidden rounded-xl shadow-lg border border-gray-700'>
                        <iframe
                            src='https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2492.3272265763226!2d105.75927075820283!3d21.025544990852897!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x313454a270afc227%3A0xf29565b90933522b!2zU8OibiBCw7NuZyBUw6JuIE3hu7k!5e0!3m2!1svi!2sus!4v1761499658484!5m2!1svi!2sus'
                            width='100%'
                            height='100%'
                            style={{ border: 0 }}
                            allowFullScreen
                            loading='lazy'
                        ></iframe>
                    </div>
                </div>
            </div>

            {/* Bản quyền */}
            <div className='border-t border-gray-700 text-center py-4 text-gray-400 text-sm'>
                © 2024 <span className='text-green-500 font-semibold'>Green Field</span>. Tất cả
                quyền được bảo lưu.
            </div>
        </footer>
    );
};

export default Footer;
