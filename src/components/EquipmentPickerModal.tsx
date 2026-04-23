import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

type EquipmentMode = 'rent' | 'sell' | 'both';

export interface EquipmentApi {
    _id: string;
    code: string;
    name: string;
    unit: string;
    mode: EquipmentMode;
    status: string;
    totalQuantity: number;
    availableQuantity: number;
    rentPrice: number;
    salePrice: number;
    description?: string;
}

export interface EquipmentPickItem {
    equipmentId: string;
    mode: 'rent' | 'sell';
    qty: number;
    price: number; //  unit price để tính tổng
}

interface Props {
    open: boolean;
    onClose: () => void;

    slotLabel: string; // "14:45 - 15:45"
    slotKey: string; // "14:45-15:45"

    token?: string;

    initialItems: EquipmentPickItem[];
    //  Những món đã chọn ở các ca KHÁC (để trừ kho toàn cục trong phiên đặt này)
    otherSlotsPicked?: EquipmentPickItem[];
    onSave: (items: EquipmentPickItem[]) => void;
}

//  ENV URL
const RAW_API = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_BASE = RAW_API.endsWith('/api') ? RAW_API : `${RAW_API}/api`;

const EquipmentPickerModal: React.FC<Props> = ({
    open,
    onClose,
    slotLabel,
    slotKey,
    token,
    initialItems,
    otherSlotsPicked = [],
    onSave,
}) => {
    const [loading, setLoading] = useState(false);
    const [equipments, setEquipments] = useState<EquipmentApi[]>([]);
    const [picked, setPicked] = useState<Record<string, number>>({}); // key: `${id}|${mode}` => qty

    useEffect(() => {
        if (!open) return;

        const map: Record<string, number> = {};
        for (const it of initialItems || []) {
            map[`${it.equipmentId}|${it.mode}`] = Number(it.qty || 0);
        }
        setPicked(map);
    }, [open, initialItems]);

    useEffect(() => {
        if (!open) return;

        const fetchEquip = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/equipments/public`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });
                const data = await res.json();
                if (data?.success) {
                    setEquipments(Array.isArray(data.data) ? data.data : []);
                } else {
                    toast.error(data?.message || 'Không tải được thiết bị');
                }
            } catch (e) {
                console.error(e);
                toast.error('Lỗi tải danh sách thiết bị');
            } finally {
                setLoading(false);
            }
        };

        fetchEquip();
    }, [open, token]);

    const rows = useMemo(() => {
        return (equipments || [])
            .filter((e) => e.status !== 'discontinued')
            .map((e) => {
                const rentKey = `${e._id}|rent`;
                const sellKey = `${e._id}|sell`;
                const rQty = picked[rentKey] || 0;
                const sQty = picked[sellKey] || 0;

                //  Tìm xem các ca khác đã "nhận" món này chưa
                const otherRent = otherSlotsPicked
                    .filter(oit => oit.equipmentId === e._id && oit.mode === 'rent')
                    .reduce((sum, oit) => sum + oit.qty, 0);
                const otherSell = otherSlotsPicked
                    .filter(oit => oit.equipmentId === e._id && oit.mode === 'sell')
                    .reduce((sum, oit) => sum + oit.qty, 0);

                const totalUsed = rQty + sQty + otherRent + otherSell;

                return {
                    e,
                    rentQty: rQty,
                    sellQty: sQty,
                    remaining: Math.max(0, (e.availableQuantity || 0) - totalUsed),
                };
            });
    }, [equipments, picked, otherSlotsPicked]);

    const total = useMemo(() => {
        let sum = 0;
        for (const r of rows) {
            const e = r.e;
            if (r.rentQty > 0) sum += Number(e.rentPrice || 0) * r.rentQty;
            if (r.sellQty > 0) sum += Number(e.salePrice || 0) * r.sellQty;
        }
        return sum;
    }, [rows]);

    const setQty = (equipmentId: string, mode: 'rent' | 'sell', qty: number) => {
        const key = `${equipmentId}|${mode}`;
        setPicked((prev) => {
            const next = { ...prev };
            if (qty <= 0) delete next[key];
            else next[key] = qty;
            return next;
        });
    };

    const handleSave = () => {
        //  build items list có price
        const items: EquipmentPickItem[] = [];

        for (const k of Object.keys(picked)) {
            const qty = Number(picked[k] || 0);
            if (qty <= 0) continue;

            const [equipmentId, mode] = k.split('|') as [string, 'rent' | 'sell'];
            const eq = equipments.find((x) => x._id === equipmentId);
            if (!eq) continue;

            const unitPrice =
                mode === 'rent' ? Number(eq.rentPrice || 0) : Number(eq.salePrice || 0);

            items.push({
                equipmentId,
                mode,
                qty,
                price: unitPrice,
            });
        }

        onSave(items);
        onClose();
        toast.success(`Đã lưu thiết bị cho ca ${slotLabel}`);
    };

    if (!open) return null;

    return (
        <div className='fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-all'>
            <div className='w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in duration-200'>
                <div className='flex items-center justify-between px-6 py-4 border-b dark:border-gray-700'>
                    <div>
                        <h3 className='text-xl font-black text-gray-900 dark:text-gray-100'>
                            Thuê thiết bị theo ca
                        </h3>
                        <p className='text-sm text-gray-500 dark:text-gray-400 mt-0.5'>
                            Ca: <b className='text-green-600 dark:text-green-400'>{slotLabel}</b>{' '}
                            <span className='text-gray-400 dark:text-gray-500'>({slotKey})</span>
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className='p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-bold text-xl'
                    >
                        ✕
                    </button>
                </div>

                <div className='p-6 max-h-[60vh] overflow-auto'>
                    {loading ? (
                        <p className='text-gray-500 dark:text-gray-400 text-center py-10 italic'>Đang tải danh sách thiết bị...</p>
                    ) : rows.length === 0 ? (
                        <p className='text-gray-500 dark:text-gray-400 text-center py-10 italic'>Chưa có thiết bị nào trong kho.</p>
                    ) : (
                        <div className='space-y-3'>
                            {rows.map(({ e, rentQty, sellQty, remaining }) => {
                                const canRent = e.mode === 'rent' || e.mode === 'both';
                                const canSell = e.mode === 'sell' || e.mode === 'both';

                                return (
                                    <div
                                        key={e._id}
                                        className='bg-gray-50/50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 flex items-start justify-between gap-4 hover:shadow-md transition-all'
                                    >
                                        <div className='min-w-0'>
                                            <div className='flex items-center gap-2 flex-wrap'>
                                                <p className='font-black text-gray-900 dark:text-gray-100 text-base truncate'>
                                                    {e.name}
                                                </p>
                                                <span className='text-[11px] px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold'>
                                                    Kho: <b className={remaining === 0 ? 'text-red-500' : 'text-green-600'}>{remaining}</b>{' '}
                                                    {e.unit || 'cái'}
                                                </span>

                                                {canRent && (
                                                    <span className='text-[11px] px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold'>
                                                        Thuê{' '}
                                                        {Number(e.rentPrice || 0).toLocaleString(
                                                            'vi-VN'
                                                        )}
                                                        đ
                                                    </span>
                                                )}
                                                {canSell && (
                                                    <span className='text-[11px] px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold'>
                                                        Bán{' '}
                                                        {Number(e.salePrice || 0).toLocaleString(
                                                            'vi-VN'
                                                        )}
                                                        đ
                                                    </span>
                                                )}
                                            </div>

                                            {e.description ? (
                                                <p className='text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed'>
                                                    {e.description}
                                                </p>
                                            ) : null}
                                        </div>

                                        <div className='flex flex-col gap-2 shrink-0'>
                                            {canRent && (
                                                <div className='flex items-center justify-end gap-2'>
                                                    <span className='text-xs font-black text-blue-700 dark:text-blue-400 w-[35px] text-right uppercase tracking-wider'>
                                                        Thuê
                                                    </span>
                                                    <button
                                                        className='w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm font-bold'
                                                        onClick={() =>
                                                            setQty(
                                                                e._id,
                                                                'rent',
                                                                Math.max(0, rentQty - 1)
                                                            )
                                                        }
                                                        type='button'
                                                    >
                                                        -
                                                    </button>
                                                    <input
                                                        type='number'
                                                        min='0'
                                                        className='w-12 text-center font-black dark:text-white bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-gray-300 dark:placeholder:text-gray-600'
                                                        value={rentQty === 0 ? '' : rentQty}
                                                        placeholder='0'
                                                        onChange={(ev) => {
                                                            let val = parseInt(ev.target.value);
                                                            if (isNaN(val)) val = 0;
                                                            if (val < 0) {
                                                                toast.warning('Số lượng không được nhập số âm!');
                                                                val = 0;
                                                            }
                                                            // Kiểm tra tổng số lượng đã chọn so với số lượng khả dụng
                                                            const otherQtyInModal = sellQty;
                                                            const globalOtherQty = otherSlotsPicked
                                                                .filter(oit => oit.equipmentId === e._id)
                                                                .reduce((sum, oit) => sum + oit.qty, 0);

                                                            const maxAvailable = Math.max(0, e.availableQuantity - otherQtyInModal - globalOtherQty);
                                                            if (val > maxAvailable) {
                                                                toast.warning(`Số lượng thuê ${e.name} không được vượt quá ${maxAvailable} (kho còn ${e.availableQuantity}${otherQtyInModal + globalOtherQty > 0 ? `, đã chọn ${otherQtyInModal + globalOtherQty}` : ''})`);
                                                                val = maxAvailable;
                                                            }
                                                            setQty(e._id, 'rent', val);
                                                        }}
                                                    />
                                                    <button
                                                        className='w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm font-bold'
                                                        onClick={() => {
                                                            if (rentQty + 1 > e.availableQuantity) {
                                                                toast.warning(
                                                                    `Không đủ tồn kho cho ${e.name}`
                                                                );
                                                                return;
                                                            }
                                                            setQty(e._id, 'rent', rentQty + 1);
                                                        }}
                                                        type='button'
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            )}

                                            {canSell && (
                                                <div className='flex items-center justify-end gap-2'>
                                                    <span className='text-xs font-black text-green-700 dark:text-green-400 w-[35px] text-right uppercase tracking-wider'>
                                                        Bán
                                                    </span>
                                                    <button
                                                        className='w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm font-bold'
                                                        onClick={() =>
                                                            setQty(
                                                                e._id,
                                                                'sell',
                                                                Math.max(0, sellQty - 1)
                                                            )
                                                        }
                                                        type='button'
                                                    >
                                                        -
                                                    </button>
                                                    <input
                                                        type='number'
                                                        min='0'
                                                        className='w-12 text-center font-black dark:text-white bg-transparent border-b border-transparent focus:border-green-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-gray-300 dark:placeholder:text-gray-600'
                                                        value={sellQty === 0 ? '' : sellQty}
                                                        placeholder='0'
                                                        onChange={(ev) => {
                                                            let val = parseInt(ev.target.value);
                                                            if (isNaN(val)) val = 0;
                                                            if (val < 0) {
                                                                toast.warning('Số lượng không được nhập số âm!');
                                                                val = 0;
                                                            }
                                                            // Kiểm tra tổng số lượng đã chọn so với số lượng khả dụng
                                                            const otherQtyInModal = rentQty;
                                                            const globalOtherQty = otherSlotsPicked
                                                                .filter(oit => oit.equipmentId === e._id)
                                                                .reduce((sum, oit) => sum + oit.qty, 0);

                                                            const maxAvailable = Math.max(0, e.availableQuantity - otherQtyInModal - globalOtherQty);
                                                            if (val > maxAvailable) {
                                                                toast.warning(`Số lượng mua ${e.name} không được vượt quá ${maxAvailable} (kho còn ${e.availableQuantity}${otherQtyInModal + globalOtherQty > 0 ? `, đã chọn ${otherQtyInModal + globalOtherQty}` : ''})`);
                                                                val = maxAvailable;
                                                            }
                                                            setQty(e._id, 'sell', val);
                                                        }}
                                                    />
                                                    <button
                                                        className='w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm font-bold'
                                                        onClick={() => {
                                                            if (sellQty + 1 > e.availableQuantity) {
                                                                toast.warning(
                                                                    `Không đủ tồn kho cho ${e.name}`
                                                                );
                                                                return;
                                                            }
                                                            setQty(e._id, 'sell', sellQty + 1);
                                                        }}
                                                        type='button'
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className='px-6 py-4 border-t dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4'>
                    <div className='text-gray-900 dark:text-gray-100 font-black text-lg'>
                        Tổng tiền (ca này):{' '}
                        <span className='text-green-600 dark:text-green-400 ml-1'>
                            {total.toLocaleString('vi-VN')}
                            <span className='text-xs font-bold ml-0.5 underline'>đ</span>
                        </span>
                    </div>

                    <div className='flex gap-3 w-full md:w-auto'>
                        <button
                            onClick={onClose}
                            className='flex-1 md:flex-none px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all'
                            type='button'
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSave}
                            className='flex-1 md:flex-none px-8 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-black shadow-lg shadow-green-600/20 transition-all active:scale-95'
                            type='button'
                        >
                            Lưu thiết bị
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EquipmentPickerModal;
