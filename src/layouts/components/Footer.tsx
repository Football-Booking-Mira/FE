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
        <footer className='bg-[#111827] text-white mt-16 relative overflow-hidden'>
            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]"
                 style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            </div>

            {/* Top accent line */}
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"></div>

            {/* Nội dung chính */}
            <div className='max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 px-6 py-14 relative z-10'>
                {/* Cột 1 - Logo và mô tả */}
                <div>
                    <h2 className='text-2xl font-extrabold mb-4 flex items-center tracking-tight'>
                        <span className='bg-emerald-600 text-white rounded-xl p-2.5 mr-3 shadow-lg shadow-emerald-600/30 text-sm'>⚽</span>
                        Mira
                    </h2>
                    <p className='text-gray-400 leading-relaxed text-sm'>
                        Hệ thống sân bóng đá hiện đại với đầy đủ tiện ích. Chúng tôi cam kết mang
                        đến trải nghiệm chơi bóng tuyệt vời nhất cho mọi đội bóng.
                    </p>

                    {/* Mạng xã hội */}
                    <div className='flex space-x-3 mt-6'>
                        <a
                            href='#'
                            className='w-10 h-10 bg-white/10 hover:bg-emerald-600 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-emerald-600/30'
                        >
                            <FaFacebookF className="text-sm" />
                        </a>
                        <a
                            href='#'
                            className='w-10 h-10 bg-white/10 hover:bg-emerald-600 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-emerald-600/30'
                        >
                            <FaInstagram className="text-sm" />
                        </a>
                        <a
                            href='#'
                            className='w-10 h-10 bg-white/10 hover:bg-emerald-600 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-emerald-600/30'
                        >
                            <FaYoutube className="text-sm" />
                        </a>
                    </div>
                </div>

                {/* Cột 2 - Thông tin liên hệ */}
                <div>
                    <h3 className='text-base font-bold mb-5 uppercase tracking-wider text-white/80'>Thông tin liên hệ</h3>
                    <ul className='space-y-4 text-gray-400 text-sm'>
                        <li className='flex items-start gap-3'>
                            <span className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                <FaMapMarkerAlt className='text-emerald-400 text-xs' />
                            </span>
                            <span className="leading-relaxed">Số 89 Chùa Láng, Phường Láng, Hà Nội</span>
                        </li>
                        <li className='flex items-center gap-3'>
                            <span className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
                                <FaPhoneAlt className='text-emerald-400 text-xs' />
                            </span>
                            0123 456 789
                        </li>
                        <li className='flex items-center gap-3'>
                            <span className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
                                <FaEnvelope className='text-emerald-400 text-xs' />
                            </span>
                            info@mira.vn
                        </li>
                    </ul>
                </div>

                {/* Cột 3 - Liên kết nhanh */}
                <div>
                    <h3 className='text-base font-bold mb-5 uppercase tracking-wider text-white/80'>Liên kết nhanh</h3>
                    <ul className='space-y-3 text-gray-400 text-sm'>
                        <li>
                            <a href='#' className='hover:text-emerald-400 transition-colors duration-200 flex items-center gap-2'>
                                <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                                Trang chủ
                            </a>
                        </li>
                        <li>
                            <a href='/my-bookings' className='hover:text-emerald-400 transition-colors duration-200 flex items-center gap-2'>
                                <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                                Đặt sân
                            </a>
                        </li>
                        <li>
                            <a href='/bang-gia' className='hover:text-emerald-400 transition-colors duration-200 flex items-center gap-2'>
                                <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                                Bảng giá
                            </a>
                        </li>
                        <li>
                            <a href='/contact' className='hover:text-emerald-400 transition-colors duration-200 flex items-center gap-2'>
                                <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                                Liên hệ
                            </a>
                        </li>
                    </ul>
                </div>

                {/* Cột 4 - Bản đồ (nhỏ hơn) */}
                <div>
                    <h3 className='text-base font-bold mb-5 uppercase tracking-wider text-white/80'>Bản đồ</h3>
                    <div className='w-full aspect-square overflow-hidden rounded-2xl shadow-xl border border-white/10'>
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
            <div className='border-t border-white/10 text-center py-5 text-gray-500 text-sm relative z-10'>
                © 2026 <span className='text-emerald-400 font-bold'>Mira</span>. Tất cả
                quyền được bảo lưu.
            </div>
        </footer>
    );
};

export default Footer;
