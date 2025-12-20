import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Button, Tag, Spin, Empty, Modal, Input, Image, Checkbox } from "antd";
import { ToastContainer, toast } from "react-toastify";
import api from "@/common/utils/api";
import "react-toastify/dist/ReactToastify.css";
import dayjs from "dayjs";
import { printInvoiceMira } from "@/common/utils/printInvoice";
import { useNavigate } from "react-router";

dayjs.locale("vi");
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  in_use: "Đang sử dụng",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "gold",
  confirmed: "blue",
  in_use: "purple",
  completed: "green",
  cancelled: "red",
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "Chưa thanh toán",
  partial: "Đã thanh toán", //  ép label
  paid: "Đã thanh toán",
  refunded: "Hoàn tiền xong",
};

const PAYMENT_COLORS: Record<string, string> = {
  unpaid: "red",
  partial: "green", // ép màu xanh giống paid
  paid: "green",
  refunded: "volcano",
};

const REFUND_STATUS_LABELS: Record<string, string> = {
  none: "Không có hoàn tiền",
  pending: "Đã gửi yêu cầu hoàn tiền",
  processing: "Đang xử lý hoàn tiền",
  refunded: "Đã hoàn tiền",
  rejected: "Từ chối hoàn tiền",
};

const REFUND_STATUS_COLORS: Record<string, string> = {
  none: "default",
  pending: "orange",
  processing: "blue",
  refunded: "green",
  rejected: "red",
};

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "waiting_payment", label: "Chờ thanh toán" },
  { key: "pending", label: "Chờ xác nhận" },
  { key: "confirmed", label: "Đã xác nhận" },
  { key: "in_use", label: "Đang sử dụng" },
  { key: "completed", label: "Hoàn thành" },
  { key: "cancelled", label: "Đã hủy" },
  { key: "refunded", label: "Hoàn tiền" },
];

// đổi "HH:mm" -> phút
const timeToMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// lấy mảng thiết bị từ mọi kiểu response
const extractEquipmentItems = (raw: any): any[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw.equipments)) return raw.equipments;
  if (Array.isArray(raw.bookingEquipments)) return raw.bookingEquipments;
  if (Array.isArray(raw.data)) return raw.data;
  return [];
};

const getItemPaidFlag = (it: any): boolean | undefined => {
  if (typeof it.isPaid === "boolean") return it.isPaid;
  if (typeof it.paid === "boolean") return it.paid;
  if (typeof it.paymentStatus === "string") return it.paymentStatus === "paid";
  if (typeof it.payStatus === "string") return it.payStatus === "paid";
  return undefined;
};

const isExtraAfterPaid = (it: any): boolean => {
  return (
    it.addedFrom === "checkin" ||
    it.fromCheckin === true ||
    it.isExtra === true ||
    it.addedByRole === "admin" ||
    it.addedBy === "admin"
  );
};

// defaultPaymentStatus dùng để suy ra “các item không có flag”
// - paid/refunded: mặc định thiết bị đã trả (vì đi cùng VNPay)
// - partial/unpaid: mặc định thiết bị chưa trả (cọc tính cho sân)
const mergeEquipments = (
  items: any[] = [],
  defaultPaymentStatus: string = "unpaid"
) => {
  const map: Record<string, any> = {};

  items.forEach((it) => {
    const eq = it.equipmentId || {};
    const name = eq.name || it.name || "Thiết bị";
    const unit = eq.unit || it.unit || "";
    const mode: "rent" | "sell" = it.mode === "sell" ? "sell" : "rent";
    const price = Number(
      it.price || (mode === "rent" ? eq.rentPrice : eq.salePrice) || 0
    );
    const qty = Number(it.qty || 0);
    if (qty <= 0) return;

    const subtotal = price * qty;

    // quyết định paidFlag
    let paidFlag = getItemPaidFlag(it);

    if (paidFlag === undefined) {
      if (isExtraAfterPaid(it))
        paidFlag = false; // thêm lúc checkin => chưa trả
      else
        paidFlag =
          defaultPaymentStatus === "paid" ||
          defaultPaymentStatus === "refunded";
    }

    const key = `${name}_${mode}_${price}_${unit}`;
    if (!map[key]) {
      map[key] = {
        name,
        mode,
        unit,
        price,
        qty,
        subtotal,
        paidSubtotal: 0,
        unpaidSubtotal: 0,
      };
    } else {
      map[key].qty += qty;
      map[key].subtotal += subtotal;
    }

    if (paidFlag) map[key].paidSubtotal += subtotal;
    else map[key].unpaidSubtotal += subtotal;
  });

  return Object.values(map);
};

// eligible để “Thanh toán lại”
const canRetryPay = (b: any) =>
  b.status === "pending" &&
  b.paymentMethod === "vnpay" &&
  (b.paymentStatus === "unpaid" || b.paymentStatus === "partial");

// tính tiền cần trả cho từng ca (unpaid: full total, partial: total - deposit)
const calcNeedPay = (b: any) => {
  const total = Number(b.total ?? 0);
  const depositPaid =
    b.depositStatus === "paid" ? Number(b.depositAmount ?? 0) : 0;

  const fallbackTotal =
    total > 0
      ? total
      : Number(b.fieldAmount ?? 0) + Number(b.equipmentTotal ?? 0);

  if (b.paymentStatus === "partial")
    return Math.max(0, fallbackTotal - depositPaid);
  if (b.paymentStatus === "unpaid") return Math.max(0, fallbackTotal);
  return 0;
};

const MyBookings: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingGroups, setBookingGroups] = useState<any[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});

  const socketRef = useRef<Socket | null>(null);
  const lastSocketUpdateRef = useRef<number>(0);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundBookingIds, setRefundBookingIds] = useState<string[]>([]);
  const [refundForm, setRefundForm] = useState({
    accountNumber: "",
    accountName: "",
    bankName: "",
    note: "",
  });

  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  const [printingInvoiceId, setPrintingInvoiceId] = useState<string | null>(
    null
  );

  // groupId -> list bookingId được chọn để thanh toán lại
  const [selectedPayByGroup, setSelectedPayByGroup] = useState<
    Record<string, string[]>
  >({});
  // groupId -> list bookingId được chọn để HỦY
  const [selectedCancelByGroup, setSelectedCancelByGroup] = useState<
    Record<string, string[]>
  >({});

  const toggleSelectPay = (
    groupId: string,
    bookingId: string,
    checked: boolean
  ) => {
    setSelectedPayByGroup((prev) => {
      const cur = new Set(prev[groupId] || []);
      if (checked) cur.add(bookingId);
      else cur.delete(bookingId);
      return { ...prev, [groupId]: Array.from(cur) };
    });
  };

  const toggleSelectAllPay = (
    groupId: string,
    eligibleIds: string[],
    checked: boolean
  ) => {
    setSelectedPayByGroup((prev) => ({
      ...prev,
      [groupId]: checked ? eligibleIds : [],
    }));
  };

  const toggleSelectCancel = (
    groupId: string,
    bookingId: string,
    checked: boolean
  ) => {
    setSelectedCancelByGroup((prev) => {
      const cur = new Set(prev[groupId] || []);
      if (checked) cur.add(bookingId);
      else cur.delete(bookingId);
      return { ...prev, [groupId]: Array.from(cur) };
    });
  };

  const toggleSelectAllCancel = (
    groupId: string,
    eligibleIds: string[],
    checked: boolean
  ) => {
    setSelectedCancelByGroup((prev) => ({
      ...prev,
      [groupId]: checked ? eligibleIds : [],
    }));
  };

  // Thanh toán lại theo list ca đã chọn
  const handlePayAgainSelected = async (selectedBookings: any[]) => {
    try {
      if (!selectedBookings.length) return;

      setPayingBookingId(selectedBookings[0]._id);

      const bookingIds = selectedBookings.map((b) => b._id);
      const amountToPay = selectedBookings.reduce(
        (sum, b) => sum + calcNeedPay(b),
        0
      );

      if (!amountToPay || amountToPay <= 0) {
        toast.error("Không có số tiền cần thanh toán thêm cho các ca đã chọn!");
        setPayingBookingId(null);
        return;
      }

      const payRes = await api.post("/payment/vnpay/create", {
        bookingIds,
        isRetryPayment: true,
      });

      const paymentUrl =
        payRes.data?.paymentUrl ||
        payRes.data?.data?.paymentUrl ||
        payRes.data?.data?.url;

      if (!paymentUrl) {
        toast.error("Không lấy được link thanh toán VNPay!");
        setPayingBookingId(null);
        return;
      }

      toast.success("Đang chuyển tới trang thanh toán VNPay...");
      window.location.href = paymentUrl;
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Không thể thanh toán lại, vui lòng thử lại!"
      );
      setPayingBookingId(null);
    }
  };

  const handlePayAgain = async (booking: any) => {
    try {
      setPayingBookingId(booking._id);

      const retryRes = await api.get(
        `/bookings/${booking._id}/retry-payment-info`
      );
      const info = retryRes.data?.data;

      if (!info || !info.amountToPay || info.amountToPay <= 0) {
        toast.error(
          "Không có số tiền cần thanh toán thêm cho đơn/nhóm đơn này."
        );
        setPayingBookingId(null);
        return;
      }

      const body =
        info.type === "order"
          ? { bookingIds: info.bookingIds, isRetryPayment: true }
          : { bookingId: info.bookingId, isRetryPayment: true };

      const payRes = await api.post("/payment/vnpay/create", body);
      const paymentUrl =
        payRes.data?.paymentUrl ||
        payRes.data?.data?.paymentUrl ||
        payRes.data?.data?.url;

      if (!paymentUrl) {
        toast.error("Không lấy được link thanh toán VNPay!");
        setPayingBookingId(null);
        return;
      }

      toast.success("Đang chuyển tới trang thanh toán VNPay...");
      window.location.href = paymentUrl;
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Không thể thanh toán lại, vui lòng thử lại!"
      );
      setPayingBookingId(null);
    }
  };

  const handlePayAgainGroup = (group: any) => {
    const candidate =
      group.bookings.find(
        (b: any) =>
          b.paymentMethod === "vnpay" &&
          b.status === "pending" &&
          (b.paymentStatus === "unpaid" || b.paymentStatus === "partial")
      ) || group.bookings[0];

    if (!candidate) return;
    handlePayAgain(candidate);
  };

  const handleViewInvoice = async (booking: any) => {
    try {
      setPrintingInvoiceId(booking._id);

      if (!booking?.hasInvoice) {
        toast.error(
          'Đơn này chưa có hóa đơn. Vui lòng bấm "Thanh toán" để tạo hóa đơn trước!'
        );
        setPrintingInvoiceId(null);
        return;
      }

      const res = await api.get(`/invoices/by-booking/${booking._id}`);

      if (!res?.data?.invoice) {
        toast.error("Không tìm thấy hóa đơn!");
        setPrintingInvoiceId(null);
        return;
      }

      printInvoiceMira(res.data);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Không thể tải thông tin hóa đơn!"
      );
    } finally {
      setPrintingInvoiceId(null);
    }
  };

  const applyFilter = (tabKey: string, groupsSource: any[] = bookingGroups) => {
    if (tabKey === "all") {
      setFilteredGroups(groupsSource);
      return;
    }

    const matchBooking = (b: any) => {
      switch (tabKey) {
        case "waiting_payment":
          return b.paymentStatus === "unpaid" || b.paymentStatus === "partial";
        case "pending":
        case "confirmed":
        case "in_use":
        case "completed":
        case "cancelled":
          return b.status === tabKey;
        case "refunded":
          return (b.refundStatus || "none") === "refunded";
        default:
          return true;
      }
    };

    const result = groupsSource
      .map((g) => (g.bookings.some(matchBooking) ? g : null))
      .filter(Boolean) as any[];
    setFilteredGroups(result);
  };

  const fetchBookings = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const userId = user?._id;
      if (!userId) {
        setLoading(false);
        toast.info("Vui lòng đăng nhập để xem đơn đặt sân");
        navigate("/login");
        return;
      }

      const res = await api.get(`/bookings/user/${userId}`);
      const data = res.data;

      if (data?.success) {
        const mapped = data.data.map((b: any) => {
          // giữ nguyên paymentStatus từ backend, chỉ fallback nếu thiếu
          return { ...b, paymentStatus: b.paymentStatus || "unpaid" };
        });

        const sorted = [...mapped].sort((a: any, b: any) => {
          const at = new Date(a.createdAt || a.date).getTime();
          const bt = new Date(b.createdAt || b.date).getTime();
          return bt - at;
        });

        const sortedWithEquipments = sorted.map((b: any) => {
          const items = extractEquipmentItems(
            b.equipmentItems ||
              b.equipments ||
              b.bookingEquipments ||
              b.items ||
              b.data
          );
          const equipments = mergeEquipments(
            items,
            b.paymentStatus || "unpaid"
          );
          return { ...b, equipments };
        });

        setBookings(sortedWithEquipments);

        const groupMap = new Map<string, any>();
        for (const b of sortedWithEquipments) {
          const key = b.orderId ? String(b.orderId) : String(b._id);
          if (!groupMap.has(key)) {
            groupMap.set(key, {
              _id: key,
              courtId: b.courtId,
              customerId: b.customerId,
              date: b.date,
              bookings: [] as any[],
            });
          }
          groupMap.get(key).bookings.push(b);
        }

        // group.total fallback
        const groups = Array.from(groupMap.values()).map((g: any) => {
          g.bookings.sort((a: any, b: any) =>
            String(a.startTime || "").localeCompare(String(b.startTime || ""))
          );

          g.total = g.bookings.reduce((sum: number, b: any) => {
            if (b.status === "cancelled") return sum;

            const total = Number(b.total || 0);
            const fieldAmount = Number(b.fieldAmount || 0);
            const equipmentTotal = Number(b.equipmentTotal || 0);

            const totalAll = total > 0 ? total : fieldAmount + equipmentTotal;
            return sum + (Number.isFinite(totalAll) ? totalAll : 0);
          }, 0);

          return g;
        });

        setBookingGroups(groups);

        // reset selection mỗi lần load lại list
        setSelectedPayByGroup({});
        setSelectedCancelByGroup({});

        const counts: Record<string, number> = {
          all: sortedWithEquipments.length,
          waiting_payment: sortedWithEquipments.filter(
            (b) => b.paymentStatus === "unpaid" || b.paymentStatus === "partial"
          ).length,
          pending: sortedWithEquipments.filter((b) => b.status === "pending")
            .length,
          confirmed: sortedWithEquipments.filter(
            (b) => b.status === "confirmed"
          ).length,
          in_use: sortedWithEquipments.filter((b) => b.status === "in_use")
            .length,
          completed: sortedWithEquipments.filter(
            (b) => b.status === "completed"
          ).length,
          cancelled: sortedWithEquipments.filter(
            (b) => b.status === "cancelled"
          ).length,
          refunded: sortedWithEquipments.filter(
            (b) => (b.refundStatus || "none") === "refunded"
          ).length,
        };
        setTabCounts(counts);

        applyFilter(activeTab, groups);
      } else {
        toast.error(data?.message || "Không lấy được danh sách đặt sân");
      }
    } catch {
      toast.error("Lỗi tải danh sách đặt sân");
    } finally {
      setLoading(false);
    }
  };

  // Invoice view removed per user request

  // SOCKET
  useEffect(() => {
    fetchBookings();

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    const handleBookingUpdated = () => {
      const now = Date.now();
      if (now - lastSocketUpdateRef.current < 400) return;
      lastSocketUpdateRef.current = now;

      fetchBookings();

      toast.info("Lịch đặt sân của bạn vừa được cập nhật", {
        autoClose: 1500,
        style: { backgroundColor: "#22c55e", color: "#fff" },
      });
    };

    socket.on("booking_updated", handleBookingUpdated);
    socket.on("booking_global_updated", handleBookingUpdated);

    return () => {
      socket.off("booking_updated", handleBookingUpdated);
      socket.off("booking_global_updated", handleBookingUpdated);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (bookings.length && socketRef.current) {
      bookings.forEach((b) => {
        if (b.courtId?._id)
          socketRef.current?.emit("join:court", b.courtId._id);
      });
    }
  }, [bookings]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    applyFilter(key);
  };

  // HỦY ĐƠN (NHIỀU CA)
  const openCancelModal = (bookingIds: string[]) => {
    setSelectedBookingIds(bookingIds);
    setCancelReason("");
    setIsCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    setIsCancelModalOpen(false);
    setCancelReason("");
    setSelectedBookingIds([]);
  };

  const handleConfirmCancel = async () => {
    if (!selectedBookingIds.length) return;

    if (!cancelReason.trim()) {
      toast.error("Vui lòng nhập lý do hủy đơn!");
      return;
    }

    try {
      await Promise.all(
        selectedBookingIds.map((id) =>
          api.patch(`/bookings/${id}/cancel`, { reason: cancelReason.trim() })
        )
      );

      toast.success("Hủy các ca trong đơn thành công!", {
        autoClose: 1500,
        style: { backgroundColor: "#dc2626", color: "#fff" },
      });

      closeCancelModal();
      fetchBookings();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err.message ||
          "Không thể hủy, vui lòng kiểm tra lại!"
      );
    }
  };

  // HOÀN TIỀN
  const openRefundModal = (bookings: any[]) => {
    const first = bookings[0] || {};

    setRefundBookingIds(bookings.map((b) => b._id));
    setRefundForm({
      accountNumber: first.refundAccountNumber || "",
      accountName: first.refundAccountName || "",
      bankName: first.refundBankName || "",
      note: first.refundNote || "",
    });

    setIsRefundModalOpen(true);
  };

  const closeRefundModal = () => {
    setIsRefundModalOpen(false);
    setRefundBookingIds([]);
    setRefundForm({
      accountNumber: "",
      accountName: "",
      bankName: "",
      note: "",
    });
  };

  const handleSubmitRefund = async () => {
    if (!refundBookingIds.length) return;

    if (
      !refundForm.accountNumber.trim() ||
      !refundForm.accountName.trim() ||
      !refundForm.bankName.trim()
    ) {
      toast.error("Vui lòng nhập đầy đủ thông tin tài khoản nhận hoàn tiền!");
      return;
    }

    try {
      await Promise.all(
        refundBookingIds.map((id) =>
          api.post(`/bookings/${id}/refund-request`, {
            accountNumber: refundForm.accountNumber.trim(),
            accountName: refundForm.accountName.trim(),
            bankName: refundForm.bankName.trim(),
            note: refundForm.note.trim(),
          })
        )
      );

      toast.success("Đã gửi yêu cầu hoàn tiền!", {
        autoClose: 2000,
        style: { backgroundColor: "#15803d", color: "#fff" },
      });

      closeRefundModal();
      fetchBookings();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err.message ||
          "Không thể gửi yêu cầu hoàn tiền!"
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" tip="Đang tải dữ liệu...">
          <div />
        </Spin>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <ToastContainer position="top-right" autoClose={2500} theme="colored" />
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Đơn đặt sân của tôi
        </h1>

        {/* TABS */}
        <div className="bg-white rounded-t-2xl border border-b-0 px-4 md:px-6">
          <div className="flex flex-wrap gap-4 border-b border-gray-200">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`relative py-3 text-sm md:text-base whitespace-nowrap transition-all
                                    ${
                                      activeTab === tab.key
                                        ? "text-green-600 border-b-2 border-green-600 font-semibold"
                                        : "text-gray-500 border-b-2 border-transparent hover:text-green-600 hover:border-green-200"
                                    }`}
              >
                {tab.label}{" "}
                <span className="text-xs text-gray-400">
                  ({tabCounts[tab.key] || 0})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* LIST */}
        <div className="bg-white rounded-b-2xl border border-t-0 px-4 md:px-6 pb-6">
          {filteredGroups.length === 0 ? (
            <div className="py-16 flex justify-center">
              <Empty description="Không có đơn đặt sân nào" />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredGroups.map((group) => {
                const first = group.bookings[0];
                const imageUrl =
                  first.courtId?.images?.[0] || first.courtId?.image || "";
                const groupTotal = Number(group.total || 0);

                const slotCount: number = group.bookings.reduce(
                  (sum: number, b: any) => {
                    if (Array.isArray(b.slots) && b.slots.length > 0)
                      return sum + b.slots.length;
                    return sum + 1;
                  },
                  0
                );

                // pay eligible
                const eligiblePayBookings = group.bookings.filter((b: any) =>
                  canRetryPay(b)
                );
                const eligiblePayIds = eligiblePayBookings.map(
                  (b: any) => b._id
                );

                // cancel eligible
                const eligibleCancelBookings = group.bookings.filter(
                  (b: any) => {
                    return (
                      b.status === "pending" &&
                      (b.paymentStatus === "paid" ||
                        b.paymentStatus === "partial")
                    );
                  }
                );
                const eligibleCancelIds = eligibleCancelBookings.map(
                  (b: any) => b._id
                );

                // selected cancel (only eligible)
                const rawSelectedCancelIds =
                  selectedCancelByGroup[group._id] || [];
                const selectedCancelIds = rawSelectedCancelIds.filter((id) =>
                  eligibleCancelIds.includes(id)
                );

                // selected pay (only eligible)
                const rawSelectedIds = selectedPayByGroup[group._id] || [];
                const selectedIds = rawSelectedIds.filter((id) =>
                  eligiblePayIds.includes(id)
                );

                const selectedPayBookings = eligiblePayBookings.filter(
                  (b: any) => selectedIds.includes(b._id)
                );
                const selectedPayAmount: number = selectedPayBookings.reduce(
                  (sum: number, b: any) => sum + calcNeedPay(b),
                  0
                );

                // show select all (pay) if >=2
                const showSelectAll = eligiblePayIds.length > 1;
                const eligibleCount = eligiblePayIds.length;
                const selectedCount = selectedIds.length;

                const allChecked =
                  showSelectAll &&
                  eligibleCount > 0 &&
                  selectedCount === eligibleCount;
                const indeterminate =
                  showSelectAll &&
                  selectedCount > 0 &&
                  selectedCount < eligibleCount;

                // show select all (cancel) if >=2
                const showSelectAllCancel = eligibleCancelIds.length > 1;
                const cancelAllChecked =
                  showSelectAllCancel &&
                  eligibleCancelIds.length > 0 &&
                  selectedCancelIds.length === eligibleCancelIds.length;

                const cancelIndeterminate =
                  showSelectAllCancel &&
                  selectedCancelIds.length > 0 &&
                  selectedCancelIds.length < eligibleCancelIds.length;

                // group refund
                const refundableBookings = group.bookings.filter((b: any) => {
                  const rawRefundStatus =
                    b.refundStatus ||
                    (b.paymentStatus === "refunded" ? "refunded" : "none");
                  const canRefundStatus =
                    rawRefundStatus === "none" ||
                    rawRefundStatus === "rejected";
                  const isPaidOrPartial =
                    b.paymentStatus === "paid" || b.paymentStatus === "partial";
                  const allowStatus = b.status === "cancelled";
                  return allowStatus && isPaidOrPartial && canRefundStatus;
                });

                const canRequestRefundGroup =
                  refundableBookings.length > 0 &&
                  refundableBookings.length === group.bookings.length;

                const canPayAgainGroup = group.bookings.some((b: any) =>
                  canRetryPay(b)
                );

                return (
                  <div
                    key={group._id}
                    className="py-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4"
                  >
                    {/* LEFT */}
                    <div className="flex-1 flex gap-4">
                      {imageUrl && (
                        <img
                          src={imageUrl}
                          alt={first.courtId?.name || "Sân bóng"}
                          className="w-24 h-24 md:w-28 md:h-28 rounded-xl object-cover border border-gray-200"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-500 mb-1">
                          Mã đơn:{" "}
                          <span className="font-semibold">{first.code}</span>
                          {slotCount > 1 && (
                            <span className="ml-1 text-xs text-gray-400">
                              • {slotCount} ca
                            </span>
                          )}
                        </div>

                        <h2 className="text-lg font-semibold text-gray-900">
                          {first.courtId?.name || "Sân bóng"}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                          {format(new Date(first.date), "dd/MM/yyyy", {
                            locale: vi,
                          })}
                        </p>

                        {/* DANH SÁCH TỪNG CA */}
                        <div className="mt-3 space-y-3">
                          {group.bookings.map((booking: any, idx: number) => {
                            const refundStatus =
                              booking.refundStatus ||
                              (booking.paymentStatus === "refunded"
                                ? "refunded"
                                : "none");

                            const refundBillImage =
                              booking.refundBillImage ||
                              booking.refund?.billImage ||
                              booking.refund?.bill?.image;

                            const refundAdminReason =
                              booking.refundAdminReason ||
                              booking.refund?.adminReason ||
                              booking.refund?.reason ||
                              "";

                            const fieldAmount = Number(
                              booking.fieldAmount || 0
                            );

                            // ---- tách tiền thiết bị ----
                            const rentTotal = Array.isArray(booking.equipments)
                              ? booking.equipments
                                  .filter((it: any) => it.mode !== "sell")
                                  .reduce(
                                    (sum: number, it: any) =>
                                      sum +
                                      Number(
                                        it.subtotal || it.price * it.qty || 0
                                      ),
                                    0
                                  )
                              : 0;

                            const sellTotal = Array.isArray(booking.equipments)
                              ? booking.equipments
                                  .filter((it: any) => it.mode === "sell")
                                  .reduce(
                                    (sum: number, it: any) =>
                                      sum +
                                      Number(
                                        it.subtotal || it.price * it.qty || 0
                                      ),
                                    0
                                  )
                              : 0;

                            const equipmentTotal = rentTotal + sellTotal;

                            const voucherDiscount = Number(
                              booking.voucherDiscount || booking.discountTotal || 0
                            );

                            const totalAll =
                              Number(booking.total || 0) > 0
                                ? Number(booking.total || 0)
                                : Math.max(0, fieldAmount + equipmentTotal - voucherDiscount);

                            const refundAmount = Number(
                              booking.refundAmount ??
                                booking.refund?.amount ??
                                totalAll
                            );

                            const depositPaid =
                              booking.depositStatus === "paid"
                                ? Number(booking.depositAmount || 0)
                                : 0;

                            // ✅ FIX LỖI: TÍNH Ở NGOÀI JSX (để dùng được ở mọi chỗ)
                            const paidAmount =
                              Number(booking.paidTotal ?? 0) ||
                              (() => {
                                if (
                                  booking.paymentStatus === "paid" ||
                                  booking.paymentStatus === "refunded"
                                )
                                  return totalAll;
                                if (booking.paymentStatus === "partial")
                                  return Math.min(depositPaid, totalAll);
                                return 0;
                              })();

                            const remain =
                              Number(booking.unpaidAmount ?? 0) ||
                              Math.max(0, totalAll - paidAmount);

                            const equipPaid =
                              Number(booking.equipmentPaid ?? 0) ||
                              (Array.isArray(booking.equipments)
                                ? booking.equipments.reduce(
                                    (s: number, it: any) =>
                                      s + Number(it.paidSubtotal || 0),
                                    0
                                  )
                                : 0);

                            const equipUnpaid =
                              Number(booking.equipmentUnpaid ?? 0) ||
                              (Array.isArray(booking.equipments)
                                ? booking.equipments.reduce(
                                    (s: number, it: any) =>
                                      s + Number(it.unpaidSubtotal || 0),
                                    0
                                  )
                                : 0);

                            const isRefunded = refundStatus === "refunded";

                            const canCancelThis =
                              booking.status === "pending" &&
                              (booking.paymentStatus === "paid" ||
                                booking.paymentStatus === "partial");

                            const canRequestRefundThis =
                              booking.status === "cancelled" &&
                              (booking.paymentStatus === "paid" ||
                                booking.paymentStatus === "partial") &&
                              (refundStatus === "none" ||
                                refundStatus === "rejected");

                            const canRetryThis = canRetryPay(booking);

                            return (
                              <div
                                key={booking._id}
                                className="border border-gray-100 rounded-lg p-3 bg-gray-50 w-full relative"
                              >
                                {/* CHECKBOX góc trái: Pay + Hủy */}
                                {(canRetryThis || canCancelThis) && (
                                  <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                                    {canRetryThis && (
                                      <Checkbox
                                        checked={(
                                          selectedPayByGroup[group._id] || []
                                        ).includes(booking._id)}
                                        onChange={(e) =>
                                          toggleSelectPay(
                                            group._id,
                                            booking._id,
                                            e.target.checked
                                          )
                                        }
                                      />
                                    )}

                                    {canCancelThis && (
                                      <Checkbox
                                        checked={(
                                          selectedCancelByGroup[group._id] || []
                                        ).includes(booking._id)}
                                        onChange={(e) =>
                                          toggleSelectCancel(
                                            group._id,
                                            booking._id,
                                            e.target.checked
                                          )
                                        }
                                      />
                                    )}
                                  </div>
                                )}

                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                  {/* LEFT INFO */}
                                  <div
                                    className={`min-w-0 flex-1 space-y-2 ${
                                      canRetryThis || canCancelThis
                                        ? "pl-10"
                                        : ""
                                    }`}
                                  >
                                    {/* SLOT TIME */}
                                    {Array.isArray(booking.slots) &&
                                    booking.slots.length > 0 ? (
                                      booking.slots.length === 1 ? (
                                        <p className="text-sm font-medium text-gray-900">
                                          Ca {idx + 1}:{" "}
                                          {booking.slots[0].startTime} -{" "}
                                          {booking.slots[0].endTime}
                                        </p>
                                      ) : (
                                        [...booking.slots]
                                          .sort(
                                            (a: any, b: any) =>
                                              timeToMin(a.startTime) -
                                              timeToMin(b.startTime)
                                          )
                                          .map((slot: any, slotIdx: number) => (
                                            <p
                                              key={slotIdx}
                                              className="text-sm font-medium text-gray-900"
                                            >
                                              Ca {slotIdx + 1}: {slot.startTime}{" "}
                                              - {slot.endTime}
                                            </p>
                                          ))
                                      )
                                    ) : (
                                      <p className="text-sm font-medium text-gray-900">
                                        Ca {idx + 1}: {booking.startTime} -{" "}
                                        {booking.endTime}
                                      </p>
                                    )}

                                    {/* TRẠNG THÁI ĐƠN */}
                                    <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
                                      <span className="text-gray-500">
                                        Trạng thái đơn:
                                      </span>
                                      <Tag
                                        color={
                                          STATUS_COLORS[booking.status] ||
                                          "default"
                                        }
                                        className="rounded-full px-3 py-1"
                                      >
                                        {STATUS_LABELS[booking.status]}
                                      </Tag>
                                    </div>

                                    {/* TRẠNG THÁI THANH TOÁN */}
                                    <div className="flex flex-wrap items-start gap-2 text-xs md:text-sm">
                                      <span className="text-gray-500">
                                        Thanh toán:
                                      </span>

                                      <Tag
                                        color={
                                          PAYMENT_COLORS[
                                            booking.paymentStatus
                                          ] || "default"
                                        }
                                        className="rounded-full px-3 py-1"
                                      >
                                        {PAYMENT_LABELS[
                                          booking.paymentStatus
                                        ] || "Không rõ"}
                                      </Tag>

                                      <div className="w-full mt-2 text-xs text-gray-700 space-y-1">
                                        <div className="flex justify-between">
                                          <span>Tiền sân</span>
                                          <span className="font-medium">
                                            {fieldAmount.toLocaleString(
                                              "vi-VN"
                                            )}{" "}
                                            VNĐ
                                          </span>
                                        </div>

                                        {sellTotal > 0 && (
                                          <div className="flex justify-between">
                                            <span>Thiết bị mua</span>
                                            <span className="font-medium">
                                              {sellTotal.toLocaleString(
                                                "vi-VN"
                                              )}{" "}
                                              VNĐ
                                            </span>
                                          </div>
                                        )}

                                        {rentTotal > 0 && (
                                          <div className="flex justify-between">
                                            <span>Thiết bị thuê</span>
                                            <span className="font-medium">
                                              {rentTotal.toLocaleString(
                                                "vi-VN"
                                              )}{" "}
                                              VNĐ
                                            </span>
                                          </div>
                                        )}

                                        <div className="flex justify-between pt-1 border-t border-gray-200">
                                          <span className="font-semibold">
                                            Tổng
                                          </span>
                                          <span className="font-semibold">
                                            {totalAll.toLocaleString("vi-VN")}{" "}
                                            VNĐ
                                          </span>
                                        </div>

                                        <div className="flex justify-between">
                                          <span className="text-emerald-700 font-semibold">
                                            Đã thanh toán
                                          </span>
                                          <span className="text-emerald-700 font-semibold">
                                            {paidAmount.toLocaleString("vi-VN")}{" "}
                                            VNĐ
                                          </span>
                                        </div>

                                        {remain > 0 && (
                                          <div className="flex justify-between">
                                            <span className="text-red-600 font-semibold">
                                              Còn lại
                                            </span>
                                            <span className="text-red-600 font-semibold">
                                              {remain.toLocaleString("vi-VN")}{" "}
                                              VNĐ
                                            </span>
                                          </div>
                                        )}

                                        {/* nếu có thiết bị thêm lúc check-in => sẽ hiện chưa trả đúng */}
                                        {equipUnpaid > 0 && (
                                          <div className="flex justify-between">
                                            <span className="text-red-600 font-semibold">
                                              Thiết bị chưa thanh toán
                                            </span>
                                            <span className="text-red-600 font-semibold">
                                              {equipUnpaid.toLocaleString(
                                                "vi-VN"
                                              )}{" "}
                                              VNĐ
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* THIẾT BỊ */}
                                    {Array.isArray(booking.equipments) &&
                                      booking.equipments.length > 0 && (
                                        <div className="mt-2 space-y-1 text-xs text-gray-700">
                                          <div className="font-semibold">
                                            {booking.status === "in_use"
                                              ? "Thiết bị đang sử dụng:"
                                              : "Thiết bị đã thuê / mua:"}
                                          </div>
                                          {booking.equipments.map(
                                            (it: any, i: number) => (
                                              <div
                                                key={i}
                                                className="flex justify-between"
                                              >
                                                <span className="min-w-0 pr-2">
                                                  {it.name}{" "}
                                                  <span className="text-gray-500">
                                                    (
                                                    {it.mode === "sell"
                                                      ? "mua"
                                                      : "thuê"}{" "}
                                                    x {it.qty} {it.unit || ""})
                                                  </span>
                                                </span>
                                                <span className="font-medium whitespace-nowrap">
                                                  {(
                                                    it.subtotal ||
                                                    it.price * it.qty
                                                  ).toLocaleString(
                                                    "vi-VN"
                                                  )}{" "}
                                                  VNĐ
                                                </span>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      )}

                                    {/* LÝ DO HỦY */}
                                    {booking.status === "cancelled" &&
                                      booking.cancelReason && (
                                        <p className="text-xs text-red-500">
                                          Lý do hủy:{" "}
                                          <span className="font-medium">
                                            {booking.cancelReason}
                                          </span>
                                        </p>
                                      )}

                                    {/* HOÀN TIỀN STATUS */}
                                    {refundStatus !== "none" && (
                                      <div className="flex flex-col gap-1 mt-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-gray-500 text-xs">
                                            Hoàn tiền:
                                          </span>
                                          <Tag
                                            color={
                                              REFUND_STATUS_COLORS[
                                                refundStatus
                                              ] || "default"
                                            }
                                            className="rounded-full px-3 py-1 text-xs"
                                          >
                                            {REFUND_STATUS_LABELS[refundStatus]}
                                          </Tag>
                                        </div>

                                        {refundBillImage && (
                                          <div className="mt-2 space-y-1">
                                            <span className="text-xs text-gray-500">
                                              Ảnh bill chuyển khoản:
                                            </span>
                                            <a
                                              href={refundBillImage}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-xs text-emerald-600 underline hover:text-emerald-700"
                                            >
                                              Mở ảnh bill trong tab mới
                                            </a>
                                            <div className="mt-1">
                                              <Image
                                                src={refundBillImage}
                                                alt="Bill hoàn tiền"
                                                className="max-h-64 rounded-md border cursor-pointer"
                                              />
                                            </div>
                                          </div>
                                        )}

                                        {refundStatus === "rejected" &&
                                          refundAdminReason && (
                                            <p className="mt-1 text-xs text-red-500">
                                              Lý do admin từ chối hoàn tiền:{" "}
                                              <span className="font-medium">
                                                {refundAdminReason}
                                              </span>
                                            </p>
                                          )}
                                      </div>
                                    )}

                                    {/* 2 dòng thiết bị đã trả / chưa trả */}
                                    {equipPaid > 0 && (
                                      <p className="mt-1 text-xs text-green-700 font-semibold">
                                        Thiết bị đã thanh toán:{" "}
                                        {equipPaid.toLocaleString("vi-VN")} VNĐ
                                      </p>
                                    )}

                                    {equipUnpaid > 0 && (
                                      <p className="mt-1 text-xs text-red-600 font-semibold">
                                        Thiết bị chưa thanh toán:{" "}
                                        {equipUnpaid.toLocaleString("vi-VN")}{" "}
                                        VNĐ
                                      </p>
                                    )}

                                    {isRefunded && refundAmount > 0 && (
                                      <p className="mt-1 text-xs text-emerald-600 font-semibold">
                                        Đã hoàn trả:{" "}
                                        {refundAmount.toLocaleString("vi-VN")} ₫
                                      </p>
                                    )}
                                  </div>

                                  {/* RIGHT ACTIONS */}
                                  <div className="shrink-0 flex flex-row md:flex-col md:items-end gap-2">
                                    {canRequestRefundThis && (
                                      <Button
                                        size="middle"
                                        className="border-amber-500 text-amber-600 hover:bg-amber-50"
                                        onClick={() =>
                                          openRefundModal([booking])
                                        }
                                      >
                                        Yêu cầu hoàn tiền
                                      </Button>
                                    )}

                                    <Button
                                      size="middle"
                                      className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                                      loading={
                                        printingInvoiceId === booking._id
                                      }
                                      onClick={() => handleViewInvoice(booking)}
                                    >
                                      Xem hóa đơn
                                    </Button>

                                    {booking.status === "cancelled" &&
                                      ["pending", "processing"].includes(
                                        refundStatus
                                      ) && (
                                        <p className="text-xs text-blue-500 italic text-right">
                                          Đã gửi yêu cầu hoàn tiền, vui lòng chờ
                                          admin xử lý.
                                        </p>
                                      )}

                                    {booking.status === "cancelled" &&
                                      refundStatus === "refunded" && (
                                        <p className="text-xs text-green-600 font-semibold text-right">
                                          Đã hoàn tiền cho bạn.
                                        </p>
                                      )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT – tổng tiền + action cấp đơn */}
                    <div className="text-right min-w-[240px] space-y-2">
                      <p className="text-sm text-gray-600">Tổng tiền đơn:</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {groupTotal.toLocaleString("vi-VN")} VNĐ
                      </p>

                      {eligiblePayIds.length > 0 && selectedCount > 0 && (
                        <>
                          <p className="text-xs text-gray-500 mt-1">
                            Sẽ thanh toán:
                          </p>
                          <p className="text-base font-semibold text-emerald-600">
                            {selectedPayAmount.toLocaleString("vi-VN")} VNĐ
                          </p>
                        </>
                      )}

                      {/* CHỌN TẤT CẢ (THANH TOÁN LẠI) */}
                      {showSelectAll && (
                        <div className="flex justify-end mt-2">
                          <Checkbox
                            indeterminate={indeterminate}
                            checked={allChecked}
                            onChange={(e) =>
                              toggleSelectAllPay(
                                group._id,
                                eligiblePayIds,
                                e.target.checked
                              )
                            }
                          >
                            Chọn tất cả
                          </Checkbox>
                        </div>
                      )}

                      {/* THANH TOÁN LẠI THEO CA ĐÃ CHỌN */}
                      {eligiblePayIds.length > 0 && (
                        <Button
                          type="primary"
                          size="middle"
                          className="mt-2 w-full md:w-auto"
                          disabled={selectedPayBookings.length === 0}
                          loading={
                            !!payingBookingId &&
                            selectedPayBookings.some(
                              (b: any) => b._id === payingBookingId
                            )
                          }
                          onClick={() =>
                            handlePayAgainSelected(selectedPayBookings)
                          }
                        >
                          {selectedPayBookings.length > 0
                            ? `Thanh toán lại (${selectedPayBookings.length}) • ${selectedPayAmount.toLocaleString(
                                "vi-VN"
                              )} VNĐ`
                            : "Thanh toán lại"}
                        </Button>
                      )}

                      {/* (GIỮ) NÚT PAY AGAIN GROUP nếu group không dùng checkbox */}
                      {canPayAgainGroup && eligiblePayIds.length === 0 && (
                        <Button
                          type="primary"
                          size="middle"
                          className="mt-2 w-full md:w-auto"
                          loading={
                            !!payingBookingId &&
                            group.bookings.some(
                              (b: any) => b._id === payingBookingId
                            )
                          }
                          onClick={() => handlePayAgainGroup(group)}
                        >
                          {payingBookingId &&
                          group.bookings.some(
                            (b: any) => b._id === payingBookingId
                          )
                            ? "Đang chuyển tới VNPay..."
                            : "Thanh toán lại"}
                        </Button>
                      )}

                      {/* CHỌN TẤT CẢ (HỦY) */}
                      {showSelectAllCancel && (
                        <div className="flex justify-end mt-2">
                          <Checkbox
                            indeterminate={cancelIndeterminate}
                            checked={cancelAllChecked}
                            onChange={(e) =>
                              toggleSelectAllCancel(
                                group._id,
                                eligibleCancelIds,
                                e.target.checked
                              )
                            }
                          >
                            Chọn tất cả để hủy
                          </Checkbox>
                        </div>
                      )}

                      {/* HỦY THEO CA ĐÃ CHỌN */}
                      {eligibleCancelIds.length > 0 && (
                        <Button
                          danger
                          type="primary"
                          size="middle"
                          className="mt-2 w-full md:w-auto"
                          disabled={selectedCancelIds.length === 0}
                          onClick={() => openCancelModal(selectedCancelIds)}
                        >
                          {selectedCancelIds.length > 0
                            ? `Hủy (${selectedCancelIds.length}) ca đã chọn`
                            : "Hủy đã chọn"}
                        </Button>
                      )}

                      {/* HOÀN THEO GROUP */}
                      {canRequestRefundGroup && (
                        <Button
                          size="middle"
                          className="mt-2 border-amber-500 text-amber-600 hover:bg-amber-50 w-full md:w-auto"
                          onClick={() => openRefundModal(group.bookings)}
                        >
                          Yêu cầu hoàn tiền
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL HỦY */}
      <Modal
        centered
        open={isCancelModalOpen}
        onCancel={closeCancelModal}
        onOk={handleConfirmCancel}
        okText="Xác nhận"
        cancelText="Đóng"
        title="Xác nhận hủy đơn đặt sân"
      >
        <p className="mb-2">Vui lòng nhập lý do hủy đơn đặt sân này:</p>
        <div className="mb-8">
          <Input.TextArea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Ví dụ: Đổi kế hoạch, đặt nhầm giờ..."
            showCount
            maxLength={500}
            rows={4}
          />
        </div>
      </Modal>

      {/* MODAL HOÀN TIỀN */}
      <Modal
        centered
        title="Yêu cầu hoàn tiền"
        open={isRefundModalOpen}
        onOk={handleSubmitRefund}
        onCancel={closeRefundModal}
        okText="Gửi yêu cầu"
        cancelText="Đóng"
        destroyOnHidden
      >
        <p className="mb-3 text-sm text-gray-600">
          Vui lòng nhập thông tin tài khoản ngân hàng để nhận tiền hoàn:
        </p>

        <div className="space-y-3">
          <div>
            <span className="block text-sm mb-1">Số tài khoản *</span>
            <Input
              value={refundForm.accountNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setRefundForm((prev) => ({ ...prev, accountNumber: value }));
              }}
              placeholder="VD: 0123456789"
            />
          </div>

          <div>
            <span className="block text-sm mb-1">Tên chủ tài khoản *</span>
            <Input
              value={refundForm.accountName}
              onChange={(e) => {
                const value = e.target.value.replace(/[0-9]/g, "");
                setRefundForm((prev) => ({ ...prev, accountName: value }));
              }}
              placeholder="VD: NGUYEN VAN A"
            />
          </div>

          <div>
            <span className="block text-sm mb-1">Ngân hàng *</span>
            <Input
              value={refundForm.bankName}
              onChange={(e) => {
                const value = e.target.value
                  .replace(/[^A-Za-zÀ-ỹà-ỹ\s]/g, "")
                  .toUpperCase();
                setRefundForm((prev) => ({ ...prev, bankName: value }));
              }}
              placeholder="VD: MB BANK, TPBANK"
            />
          </div>

          <div className="mb-6">
            <span className="block text-sm mb-1">
              Ghi chú thêm (không bắt buộc)
            </span>
            <Input.TextArea
              rows={3}
              maxLength={300}
              showCount
              value={refundForm.note}
              onChange={(e) =>
                setRefundForm((prev) => ({ ...prev, note: e.target.value }))
              }
              placeholder="VD: Chuyển giúp em trong giờ hành chính..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyBookings;
