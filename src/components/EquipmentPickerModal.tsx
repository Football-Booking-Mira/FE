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
                return {
                    e,
                    rentQty: picked[rentKey] || 0,
                    sellQty: picked[sellKey] || 0,
                };
            });
    }, [equipments, picked]);

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
        <div className='fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4'>
            <div className='w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden'>
                <div className='flex items-center justify-between px-5 py-4 border-b'>
                    <div>
                        <h3 className='text-lg font-extrabold text-gray-900'>
                            Thuê thiết bị theo ca
                        </h3>
                        <p className='text-sm text-gray-600'>
                            Ca: <b>{slotLabel}</b>{' '}
                            <span className='text-gray-400'>({slotKey})</span>
                        </p>
                    </div>
                    <button onClick={onClose} className='px-3 py-1 rounded-lg hover:bg-gray-100'>
                        ✕
                    </button>
                </div>

                <div className='p-5 max-h-[65vh] overflow-auto'>
                    {loading ? (
                        <p className='text-gray-600'>Đang tải thiết bị...</p>
                    ) : rows.length === 0 ? (
                        <p className='text-gray-600'>Chưa có thiết bị.</p>
                    ) : (
                        <div className='space-y-3'>
                            {rows.map(({ e, rentQty, sellQty }) => {
                                const canRent = e.mode === 'rent' || e.mode === 'both';
                                const canSell = e.mode === 'sell' || e.mode === 'both';

                                return (
                                    <div
                                        key={e._id}
                                        className='border rounded-xl p-4 flex items-start justify-between gap-4'
                                    >
                                        <div className='min-w-0'>
                                            <div className='flex items-center gap-2 flex-wrap'>
                                                <p className='font-extrabold text-gray-900 truncate'>
                                                    {e.name}
                                                </p>
                                                <span className='text-xs px-2 py-0.5 rounded border bg-gray-50'>
                                                    Tồn kho: <b>{e.availableQuantity}</b>{' '}
                                                    {e.unit || 'cái'}
                                                </span>

                                                {canRent && (
                                                    <span className='text-xs px-2 py-0.5 rounded border bg-blue-50 text-blue-700'>
                                                        Thuê{' '}
                                                        {Number(e.rentPrice || 0).toLocaleString(
                                                            'vi-VN'
                                                        )}
                                                        đ/{e.unit || 'cái'}
                                                    </span>
                                                )}
                                                {canSell && (
                                                    <span className='text-xs px-2 py-0.5 rounded border bg-green-50 text-green-700'>
                                                        Bán{' '}
                                                        {Number(e.salePrice || 0).toLocaleString(
                                                            'vi-VN'
                                                        )}
                                                        đ/{e.unit || 'cái'}
                                                    </span>
                                                )}
                                            </div>

                                            {e.description ? (
                                                <p className='text-xs text-gray-500 mt-1'>
                                                    {e.description}
                                                </p>
                                            ) : null}
                                        </div>

                                        <div className='flex flex-col gap-2 shrink-0'>
                                            {canRent && (
                                                <div className='flex items-center justify-end gap-2'>
                                                    <span className='text-xs font-bold text-blue-700 w-[40px] text-right'>
                                                        Thuê
                                                    </span>
                                                    <button
                                                        className='w-8 h-8 rounded-lg border hover:bg-gray-50'
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
                                                    <div className='w-10 text-center font-bold'>
                                                        {rentQty}
                                                    </div>
                                                    <button
                                                        className='w-8 h-8 rounded-lg border hover:bg-gray-50'
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
                                                    <span className='text-xs font-bold text-green-700 w-[40px] text-right'>
                                                        Bán
                                                    </span>
                                                    <button
                                                        className='w-8 h-8 rounded-lg border hover:bg-gray-50'
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
                                                    <div className='w-10 text-center font-bold'>
                                                        {sellQty}
                                                    </div>
                                                    <button
                                                        className='w-8 h-8 rounded-lg border hover:bg-gray-50'
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

                <div className='px-5 py-4 border-t flex items-center justify-between'>
                    <div className='text-gray-800 font-extrabold'>
                        Tổng tiền thiết bị (ca này):{' '}
                        <span className='text-green-700'>{total.toLocaleString('vi-VN')}đ</span>
                    </div>

                    <div className='flex gap-2'>
                        <button
                            onClick={onClose}
                            className='px-4 py-2 rounded-lg border hover:bg-gray-50'
                            type='button'
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSave}
                            className='px-4 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700'
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
