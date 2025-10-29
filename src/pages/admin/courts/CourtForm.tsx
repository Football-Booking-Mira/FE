import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Upload } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

interface CourtFormProps {
  open: boolean;
  onClose: () => void;
  court?: any;
  onSuccess: () => void;
}

export default function CourtForm({
  open,
  onClose,
  court,
  onSuccess,
}: CourtFormProps) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "indoor",
    status: "active",
    basePrice: 0,
    peakPrice: 0,
    description: "",
    amenities: [] as string[],
    images: [] as string[],
  });
  const [newAmenity, setNewAmenity] = useState("");
  const [loading, setLoading] = useState(false);

  const API = import.meta.env.VITE_API_URL;

  // ✅ Khi mở form sửa → đổ dữ liệu
  useEffect(() => {
    if (court) {
      setFormData({
        code: court.code || "",
        name: court.name || "",
        type: court.type || "indoor",
        status: court.status || "active",
        basePrice: court.basePrice || 0,
        peakPrice: court.peakPrice || 0,
        description: court.description || "",
        amenities: court.amenities || [],
        images: court.images || [],
      });
    } else {
      setFormData({
        code: "",
        name: "",
        type: "indoor",
        status: "active",
        basePrice: 0,
        peakPrice: 0,
        description: "",
        amenities: [],
        images: [],
      });
    }
  }, [court, open]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddAmenity = () => {
    if (newAmenity.trim() && !formData.amenities.includes(newAmenity)) {
      setFormData((prev) => ({
        ...prev,
        amenities: [...prev.amenities, newAmenity.trim()],
      }));
      setNewAmenity("");
    }
  };

  const handleRemoveAmenity = (a: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.filter((item) => item !== a),
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const form = new FormData();
    form.append("file", file);

    try {
      toast.info("Đang tải ảnh lên...");
      const res = await axios.post(`${API}/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data.url;
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, url],
      }));
      toast.success("Tải ảnh thành công!");
    } catch (err) {
      toast.error("Lỗi khi tải ảnh!");
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const form = new FormData();
      for (const key in formData) {
        const value = (formData as any)[key];
        if (Array.isArray(value)) {
          value.forEach((v: any, i: number) => form.append(`${key}[${i}]`, v));
        } else {
          form.append(key, value);
        }
      }

      // ⚙️ Nếu sửa thì PATCH, nếu thêm thì POST
      const url = court ? `${API}/courts/${court._id}` : `${API}/courts`;
      const method = court ? "patch" : "post";

      await axios({
        method,
        url,
        data: form,
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(
        court ? "Cập nhật sân thành công!" : "Thêm sân mới thành công!"
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("❌ Lỗi khi gửi dữ liệu:", err.response?.data || err);
      toast.error("Lỗi khi lưu dữ liệu!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {court ? "Sửa thông tin sân" : "Thêm sân mới"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
          {/* Mã sân & Tên sân */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mã sân *</Label>
              <Input
                placeholder="Nhập mã sân"
                value={formData.code}
                onChange={(e) => handleChange("code", e.target.value)}
              />
            </div>
            <div>
              <Label>Tên sân *</Label>
              <Input
                placeholder="Nhập tên sân"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>
          </div>

          {/* Loại sân & Trạng thái */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Loại sân *</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => handleChange("type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại sân" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indoor">Trong nhà</SelectItem>
                  <SelectItem value="outdoor">Ngoài trời</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Trạng thái *</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => handleChange("status", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Hoạt động</SelectItem>
                  <SelectItem value="maintenance">Bảo trì</SelectItem>
                  <SelectItem value="locked">Khóa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Giá giờ thường & cao điểm */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Giá giờ thường (VND)</Label>
              <Input
                type="number"
                value={formData.basePrice}
                onChange={(e) =>
                  handleChange("basePrice", Number(e.target.value))
                }
              />
            </div>
            <div>
              <Label>Giá cao điểm (VND)</Label>
              <Input
                type="number"
                value={formData.peakPrice}
                onChange={(e) =>
                  handleChange("peakPrice", Number(e.target.value))
                }
              />
            </div>
          </div>

          {/* Mô tả */}
          <div>
            <Label>Mô tả</Label>
            <Textarea
              rows={3}
              placeholder="Nhập mô tả sân"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>

          {/* Ảnh sân */}
          <div>
            <Label>Ảnh sân</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="courtImage"
                onChange={handleFileChange}
              />
              <label
                htmlFor="courtImage"
                className="flex items-center gap-2 cursor-pointer px-3 py-2 border rounded-md hover:bg-muted"
              >
                <Upload size={16} /> Chọn ảnh
              </label>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.images.map((img, i) => (
                <div key={i} className="relative">
                  <img
                    src={img}
                    alt={`court-${i}`}
                    className="w-20 h-20 object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleChange(
                        "images",
                        formData.images.filter((_, idx) => idx !== i)
                      )
                    }
                    className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tiện nghi */}
          <div>
            <Label>Tiện nghi</Label>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Thêm tiện nghi..."
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
              />
              <Button size="icon" onClick={handleAddAmenity}>
                <Plus size={16} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.amenities.map((a, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="flex items-center gap-1 cursor-pointer"
                >
                  {a} <X size={12} onClick={() => handleRemoveAmenity(a)} />
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t mt-4">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading
              ? court
                ? "Đang cập nhật..."
                : "Đang thêm..."
              : court
              ? "Cập nhật"
              : "Thêm sân"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
