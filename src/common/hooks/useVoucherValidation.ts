import { useState } from 'react';
import { toast } from 'sonner';
import api from '@/common/utils/api';

export interface VoucherValidationResult {
    voucherId: string;
    code: string;
    discountAmount: number;
    orderTotal: number;
    orderTotalAfterDiscount: number;
    remainingQuantity: number;
    perUserLimit: number;
    minOrderValue: number;
    startDate: string;
    endDate: string;
}

interface UseVoucherValidationProps {
    orderTotal: number;
    courtId: string;
    bookingDate?: string;
    startTime?: string;
}

export const useVoucherValidation = ({
    orderTotal,
    courtId,
    bookingDate,
    startTime,
}: UseVoucherValidationProps) => {
    const [validating, setValidating] = useState(false);
    const [voucherResult, setVoucherResult] = useState<VoucherValidationResult | null>(null);
    const [voucherCode, setVoucherCode] = useState('');
    const [error, setError] = useState<string | null>(null);

    const validateVoucher = async (code: string) => {
        if (!code || !code.trim()) {
            setError('Vui lòng nhập mã voucher!');
            return null;
        }

        if (orderTotal <= 0) {
            setError('Tổng tiền đơn phải lớn hơn 0!');
            return null;
        }

        if (!courtId) {
            setError('Vui lòng chọn sân!');
            return null;
        }

        setValidating(true);
        setError(null);

        try {
            const response = await api.post('/vouchers/validate', {
                code: code.trim().toUpperCase(),
                orderTotal,
                courtId,
                bookingDate: bookingDate || new Date().toISOString(),
                startTime: startTime || undefined,
            });

            const data = response.data?.data;
            if (data) {
                setVoucherResult(data);
                setVoucherCode(code.trim().toUpperCase());
                toast.success('Áp dụng voucher thành công!');
                return data;
            }

            return null;
        } catch (err: any) {
            const errorMessage =
                err?.response?.data?.message ||
                err?.message ||
                'Voucher không hợp lệ hoặc không thể áp dụng!';
            setError(errorMessage);
            setVoucherResult(null);
            toast.error(errorMessage);
            return null;
        } finally {
            setValidating(false);
        }
    };

    const clearVoucher = () => {
        setVoucherResult(null);
        setVoucherCode('');
        setError(null);
    };

    const applyVoucher = async (code: string) => {
        return await validateVoucher(code);
    };

    return {
        validating,
        voucherResult,
        voucherCode,
        error,
        validateVoucher,
        applyVoucher,
        clearVoucher,
        discountAmount: voucherResult?.discountAmount || 0,
        finalTotal: voucherResult?.orderTotalAfterDiscount || orderTotal,
    };
};

export default useVoucherValidation;



