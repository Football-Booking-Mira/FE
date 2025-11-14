import React from 'react';
import { CheckCircle } from 'lucide-react';

const PaymentSuccessPage = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 mb-3">
                        Đặt Sân Thành Công
                    </h1>

                    <p className="text-gray-600 mb-8">
                        Cảm ơn bạn đã đặt sân. Chúc bạn có trận đấu vui vẻ!
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={() => window.location.href = '/my-bookings'}
                            className="w-full px-6 py-3 !mb-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Xem Chi Tiết
                        </button>

                        <button
                            onClick={() => window.location.href = '/'}
                            className="w-full px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Về Trang Chủ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccessPage;