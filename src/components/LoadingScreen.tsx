import React from 'react';

interface LoadingScreenProps {
    text?: string;
    fullScreen?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ text = 'Đang tải dữ liệu...', fullScreen = false }) => {
    return (
        <div className={`flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 ${fullScreen ? 'fixed inset-0 z-[9999]' : 'h-full min-h-[50vh] w-full rounded-3xl'}`}>
            <div className="relative flex justify-center items-center mb-6">
                {/* Vòng ngoài cùng tỏa sáng */}
                <div className="absolute w-24 h-24 rounded-full bg-emerald-500/10 blur-xl animate-pulse"></div>
                
                {/* Vòng ping */}
                <div className="absolute w-16 h-16 rounded-full bg-emerald-400/20 animate-ping"></div>
                
                {/* Vòng xoay */}
                <div className="w-14 h-14 rounded-full border-[3.5px] border-emerald-100 dark:border-emerald-900/30 border-t-emerald-500 border-r-emerald-500 animate-spin z-10 drop-shadow-md"></div>
                
                {/* Chấm giữa */}
                <div className="absolute w-3 h-3 rounded-full bg-emerald-500 z-20 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
            </div>
            
            <h2 className="text-2xl font-black tracking-tight text-gray-800 dark:text-gray-100 uppercase">
                MIRA<span className="text-emerald-500">FOOTBALL</span>
            </h2>
            
            <p className="mt-3 text-[14px] text-gray-500 dark:text-gray-400 font-medium animate-pulse tracking-wide">
                {text}
            </p>
        </div>
    );
};

export default LoadingScreen;
