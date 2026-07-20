import React, { useEffect, useState, useRef } from "react";
import api from "@/common/utils/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UploadCloud, CheckCircle2, X } from "lucide-react";

interface Booking {
    _id: string;
    code: string;
}

interface Props {
    open: boolean;
    booking: Booking | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function BookingBillUploadModal({ open, booking, onClose, onSuccess }: Props) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setSelectedFile(null);
            setPreviewUrl("");
        }
    }, [open]);

    if (!booking) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleConfirm = async () => {
        if (!selectedFile) {
            toast.error("Vui lòng chọn ảnh chứng từ hoàn tiền!");
            return;
        }

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append("file", selectedFile);

            const uploadRes = await api.post("/upload/single", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const imageUrl =
                uploadRes.data?.url ||
                uploadRes.data?.data?.url ||
                uploadRes.data?.secure_url ||
                "";

            if (!imageUrl) {
                toast.error("Tải ảnh chứng từ lên thất bại. Vui lòng thử lại!");
                return;
            }

            await api.post(`/bookings/${booking._id}/refund/complete`, {
                billImage: imageUrl,
            });

            toast.success("✅ Đã hoàn tất và tải lên chứng từ hoàn tiền thành công!");
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Lỗi khi cập nhật hoàn tiền!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto p-0 border border-border/80 rounded-2xl shadow-xl bg-card">
                <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-2.5 text-emerald-600">
                        <CheckCircle2 size={20} />
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">
                                Hoàn tất hoàn tiền
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Đơn đặt: #{booking.code}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-5">
                    {/* Drag-and-drop style upload box */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Chứng từ giao dịch / Bill hoàn tiền <span className="text-rose-500">*</span>
                        </Label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            className="hidden"
                        />
                        {!selectedFile ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-border hover:border-indigo-500 rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-muted/10"
                            >
                                <UploadCloud className="text-muted-foreground opacity-60" size={32} />
                                <span className="text-xs font-semibold text-foreground">Bấm để tải ảnh chứng từ</span>
                                <span className="text-[10px] text-muted-foreground">Chỉ chấp nhận tệp hình ảnh (.jpg, .png)</span>
                            </div>
                        ) : (
                            <div className="border border-border rounded-xl p-3 bg-muted/20 relative">
                                <button
                                    onClick={() => {
                                        setSelectedFile(null);
                                        setPreviewUrl("");
                                    }}
                                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors z-10"
                                >
                                    <X size={12} />
                                </button>
                                {previewUrl && (
                                    <div className="rounded-lg overflow-hidden border border-border bg-card flex items-center justify-center p-2.5">
                                        <img src={previewUrl} alt="Bill preview" className="max-h-52 object-contain" />
                                    </div>
                                )}
                                <div className="text-[10px] text-center text-muted-foreground mt-2 truncate font-semibold">
                                    {selectedFile.name}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions bar */}
                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/40">
                        <Button variant="ghost" className="text-xs font-semibold h-10 px-4" onClick={onClose}>
                            Bỏ qua
                        </Button>
                        <Button
                            disabled={loading || !selectedFile}
                            onClick={handleConfirm}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 px-5"
                        >
                            {loading ? "Đang xử lý..." : "Xác nhận & Hoàn tất"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
