import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFound: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-background relative overflow-hidden font-sans transition-colors duration-500">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[10%] left-[10%] w-[40vw] h-[40vw] bg-emerald-100 dark:bg-emerald-500/10 rounded-full blur-[120px] opacity-60 animate-pulse"></div>
                <div className="absolute bottom-[10%] right-[10%] w-[35vw] h-[35vw] bg-blue-100 dark:bg-blue-500/10 rounded-full blur-[120px] opacity-40 animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center justify-center text-center">
                {/* 404 Visual */}
                <div className="relative mb-8 md:mb-12">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ duration: 0.8, type: 'spring' }}
                    >
                        <h1 className="text-[10rem] md:text-[20rem] font-black tracking-tighter leading-none italic select-none">
                            <span className="bg-linear-to-b from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">4</span>
                            <span className="text-emerald-500 animate-pulse inline-block transform -translate-y-4">0</span>
                            <span className="bg-linear-to-b from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">4</span>
                        </h1>
                    </motion.div>
                    
                    {/* Shadow underneath */}
                    <div className="w-48 h-4 bg-slate-900/5 dark:bg-white/5 blur-xl rounded-full mx-auto -mt-8 animate-bounce" style={{ animationDuration: '4s' }}></div>
                </div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-4 md:space-y-6 max-w-xl mx-auto"
                >
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                        Có vẻ bạn đã <span className="text-emerald-600 dark:text-emerald-400">đi quá xa</span> 🚀
                    </h2>
                    <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        Trang bạn đang tìm kiếm đã rời khỏi quỹ đạo của Mira. Đừng lo lắng, chúng tôi sẽ giúp bạn quay trở lại trái đất an toàn.
                    </p>
                </motion.div>

                {/* Actions */}
                <div className="mt-12 md:mt-16 flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 w-full max-w-2xl mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="group relative w-full sm:flex-1 px-8 py-4 bg-white dark:bg-card text-slate-900 dark:text-white font-bold rounded-2xl md:rounded-3xl border-2 border-slate-100 dark:border-white/10 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-200 dark:hover:border-white/20 hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 overflow-hidden"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>QUAY LẠI</span>
                    </button>

                    <button
                        onClick={() => navigate("/")}
                        className="w-full sm:flex-1 px-8 py-4 bg-slate-900 dark:bg-emerald-600 text-white font-black rounded-2xl md:rounded-3xl shadow-xl shadow-slate-200 dark:shadow-emerald-900/20 transition-all hover:bg-emerald-600 dark:hover:bg-emerald-500 hover:shadow-emerald-200 hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
                    >
                        <span>TRỞ VỀ TRANG CHỦ</span>
                    </button>
                </div>

                {/* Status bar */}
                <div className="mt-16 md:mt-24 flex items-center gap-4 md:gap-8 justify-center opacity-30 select-none pointer-events-none">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">SYSTEM ONLINE</span>
                    </div>
                    <div className="w-px h-4 bg-slate-200 dark:bg-white/10"></div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">ERR_404_PAGE_MISSING</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
