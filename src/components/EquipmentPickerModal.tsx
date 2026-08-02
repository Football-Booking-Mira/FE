import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
                    credentials: 'include',
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
    }, [open]);

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

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle className="text-xl font-bold">
                        Thuê thiết bị theo ca
                    </DialogTitle>
                    <p className='text-sm text-muted-foreground mt-1'>
                        Ca: <b className='text-emerald-600 dark:text-emerald-400'>{slotLabel}</b>{' '}
                        <span>({slotKey})</span>
                    </p>
                </DialogHeader>

                <div className='p-6 flex-1 overflow-auto'>
                    {loading ? (
                        <p className='text-muted-foreground text-center py-10 italic'>Đang tải danh sách thiết bị...</p>
                    ) : rows.length === 0 ? (
                        <p className='text-muted-foreground text-center py-10 italic'>Chưa có thiết bị nào trong kho.</p>
                    ) : (
                        <div className='space-y-3'>
                            {rows.map(({ e, rentQty, sellQty, remaining }) => {
                                const canRent = e.mode === 'rent' || e.mode === 'both';
                                const canSell = e.mode === 'sell' || e.mode === 'both';

                                return (
                                    <div
                                        key={e._id}
                                        className='border border-border rounded-xl p-4 shadow-sm bg-card hover:shadow-md transition-shadow mb-3 flex justify-between items-center'
                                    >
                                        {/* LEFT SIDE */}
                                        <div className='flex-1 pr-4 min-w-0'>
                                            <p className='font-semibold text-base text-foreground truncate'>
                                                {e.name}
                                            </p>
                                            <div className='flex flex-wrap gap-2 mt-2'>
                                                <Badge variant="secondary">
                                                    Kho: <span className={`ml-1 ${remaining === 0 ? 'text-destructive' : 'text-emerald-600'}`}>{remaining}</span> {e.unit || 'cái'}
                                                </Badge>

                                                {canRent && (
                                                    <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:bg-blue-900/30">
                                                        Thuê: {Number(e.rentPrice || 0).toLocaleString('vi-VN')}đ
                                                    </Badge>
                                                )}
                                                {canSell && (
                                                    <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-900/30">
                                                        Bán: {Number(e.salePrice || 0).toLocaleString('vi-VN')}đ
                                                    </Badge>
                                                )}
                                            </div>

                                            {e.description ? (
                                                <p className='text-xs text-muted-foreground leading-relaxed mt-1'>
                                                    {e.description}
                                                </p>
                                            ) : null}
                                        </div>

                                        {/* RIGHT SIDE — CSS Grid guarantees pixel-perfect tabular alignment */}
                                        <div className='shrink-0 flex flex-col gap-3'>
                                            {canRent && (
                                                <div className='grid grid-cols-[50px_32px_32px_32px] gap-2 items-center'>
                                                    <span className='text-sm text-left font-medium text-muted-foreground uppercase'>
                                                        Thuê
                                                    </span>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="w-8 h-8 p-0"
                                                        onClick={() => setQty(e._id, 'rent', Math.max(0, rentQty - 1))}
                                                        type="button"
                                                    >
                                                        -
                                                    </Button>
                                                    <input
                                                        type='number'
                                                        min='0'
                                                        className='w-8 text-center text-base font-medium bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
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
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="w-8 h-8 p-0"
                                                        onClick={() => {
                                                            if (rentQty + 1 > e.availableQuantity) {
                                                                toast.warning(`Không đủ tồn kho cho ${e.name}`);
                                                                return;
                                                            }
                                                            setQty(e._id, 'rent', rentQty + 1);
                                                        }}
                                                        type="button"
                                                    >
                                                        +
                                                    </Button>
                                                </div>
                                            )}

                                            {canSell && (
                                                <div className='grid grid-cols-[50px_32px_32px_32px] gap-2 items-center'>
                                                    <span className='text-sm text-left font-medium text-muted-foreground uppercase'>
                                                        Bán
                                                    </span>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="w-8 h-8 p-0"
                                                        onClick={() => setQty(e._id, 'sell', Math.max(0, sellQty - 1))}
                                                        type="button"
                                                    >
                                                        -
                                                    </Button>
                                                    <input
                                                        type='number'
                                                        min='0'
                                                        className='w-8 text-center text-base font-medium bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
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
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="w-8 h-8 p-0"
                                                        onClick={() => {
                                                            if (sellQty + 1 > e.availableQuantity) {
                                                                toast.warning(`Không đủ tồn kho cho ${e.name}`);
                                                                return;
                                                            }
                                                            setQty(e._id, 'sell', sellQty + 1);
                                                        }}
                                                        type="button"
                                                    >
                                                        +
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <DialogFooter className="px-6 py-4 border-t flex flex-col sm:flex-row items-center sm:justify-between gap-4 w-full">
                    <div className='text-lg font-bold text-primary flex-1 text-left w-full sm:w-auto'>
                        Tổng tiền: <span className='ml-1'>{total.toLocaleString('vi-VN')} đ</span>
                    </div>

                    <div className='flex gap-3 w-full sm:w-auto shrink-0'>
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 sm:flex-none"
                            type="button"
                        >
                            Hủy
                        </Button>
                        <Button
                            variant="default"
                            onClick={handleSave}
                            className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md border-transparent"
                            type="button"
                        >
                            Lưu thiết bị
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EquipmentPickerModal;
