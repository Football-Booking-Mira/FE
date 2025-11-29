// import React, { useEffect, useState, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';

// import {
//     Card,
//     Row,
//     Col,
//     Input,
//     Button,
//     List,
//     Avatar,
//     Modal,
//     Form,
//     Typography,
//     Space,
//     Tag,
// } from 'antd';
// import dayjs, { Dayjs } from 'dayjs';
// import { SearchOutlined, UserOutlined, PlusOutlined } from '@ant-design/icons';
// import api from '@/common/utils/api';
// import { PAYMENT_METHOD } from '@/common/constants/enums.ts';
// import { toast } from 'react-toastify';

// // import component tái sử dụng
// import BookingTimeSelector from '@/components/BookingTimeSelector';

// const { TextArea } = Input;
// const { Title, Text } = Typography;

// /* ========= TYPES ========= */

// interface Customer {
//     _id: string;
//     name: string;
//     phone: string;
//     email?: string;
// }

// interface Court {
//     _id: string;
//     name: string;
//     type: string;
//     basePrice: number;
//     peakPrice: number;
//     address?: string;
//     images?: string[];
// }

// const COURT_TYPE_LABELS: Record<string, string> = {
//     indoor: 'Trong nhà',
//     outdoor: 'Ngoài trời',
//     vip: 'Sân VIP',
// };

// /* ========= PAGE COMPONENT ========= */

// const BookingCreate: React.FC = () => {
//     const navigate = useNavigate();

//     // --- B1. KHÁCH HÀNG ---
//     const [customerSearch, setCustomerSearch] = useState('');
//     const [customerList, setCustomerList] = useState<Customer[]>([]);
//     const [customerLoading, setCustomerLoading] = useState(false);
//     const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

//     const [isCustomerListModalOpen, setCustomerListModalOpen] = useState(false);
//     const [isCustomerCreateModalOpen, setCustomerCreateModalOpen] = useState(false);

//     const [createCustomerForm] = Form.useForm();

//     // --- B2. SÂN + THỜI GIAN ---
//     const [courts, setCourts] = useState<Court[]>([]);
//     const [courtLoading, setCourtLoading] = useState(false);
//     const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);

//     const [date, setDate] = useState<Dayjs | null>(null);
//     const [startTime, setStartTime] = useState<string | undefined>();
//     const [endTime, setEndTime] = useState<string | undefined>();

//     // --- GHI CHÚ ---
//     const [note, setNote] = useState('');

//     // --- GIÁ TIỀN (tạm tính) ---
//     const [fieldPrice, setFieldPrice] = useState(0);
//     const totalAmount = fieldPrice; // không còn tiền thiết bị

//     /* ========== CALL API ========== */

//     // 1. Lấy danh sách sân active
//     useEffect(() => {
//         const fetchCourts = async () => {
//             try {
//                 setCourtLoading(true);
//                 const res = await api.get('/courts', {
//                     params: { status: 'active' },
//                 });
//                 const data = res.data?.data || res.data;
//                 setCourts(data || []);
//             } catch (err) {
//                 console.error(err);
//                 toast.error('Không tải được danh sách sân');
//             } finally {
//                 setCourtLoading(false);
//             }
//         };
//         fetchCourts();
//     }, []);

//     // 2. Search khách hàng theo phone / name
//     const handleSearchCustomer = async () => {
//         try {
//             setCustomerLoading(true);
//             const res = await api.get('/users', {
//                 params: { search: customerSearch.trim() },
//             });
//             const data = res.data?.data || res.data;
//             setCustomerList(data || []);
//             setCustomerListModalOpen(true);
//         } catch (err) {
//             console.error(err);
//             toast.error('Không tìm được khách hàng');
//         } finally {
//             setCustomerLoading(false);
//         }
//     };

//     // 3. khi chọn slot từ BookingTimeSelector – dùng luôn slot.price
//     const handleSlotSelected = useCallback(
//         (slot: {
//             date: string;
//             startTime: string;
//             endTime: string;
//             price: number;
//             duration: number;
//         }) => {
//             setDate(dayjs(slot.date));
//             setStartTime(slot.startTime);
//             setEndTime(slot.endTime);

//             // dùng giá đã tính ở BookingTimeSelector
//             setFieldPrice(slot.price || 0);
//         },
//         []
//     );

//     // Reset field price khi đổi sân
//     useEffect(() => {
//         if (!selectedCourt) {
//             setFieldPrice(0);
//             setDate(null);
//             setStartTime(undefined);
//             setEndTime(undefined);
//         }
//     }, [selectedCourt]);

//     /* ========== TẠO KHÁCH HÀNG MỚI ========== */

//     const handleCreateCustomer = async () => {
//         try {
//             const values = await createCustomerForm.validateFields();
//             const res = await api.post('/users', values);
//             const newCustomer: Customer = res.data?.data || res.data;
//             setSelectedCustomer(newCustomer);
//             toast.success('Thêm khách hàng mới thành công');
//             setCustomerCreateModalOpen(false);
//             createCustomerForm.resetFields();
//         } catch (err) {
//             console.error(err);
//         }
//     };

//     /* ========== SUBMIT ĐẶT SÂN ========== */

//     const handleSubmitBooking = async () => {
//         if (!selectedCourt) {
//             toast.error('Vui lòng chọn sân');
//             return;
//         }
//         if (!date || !startTime || !endTime) {
//             toast.error('Vui lòng chọn ngày và giờ');
//             return;
//         }

//         const customerInfo = selectedCustomer
//             ? {
//                   name: selectedCustomer.name,
//                   phone: selectedCustomer.phone,
//                   email: selectedCustomer.email || '',
//               }
//             : { name: '', phone: '', email: '' };

//         try {
//             const payload = {
//                 courtId: selectedCourt._id,
//                 customerId: selectedCustomer?._id || null,
//                 date: date.startOf('day').toISOString(),
//                 startTime,
//                 endTime,
//                 note: note || '',
//                 isOffline: true,
//                 paymentMethod: PAYMENT_METHOD?.CASH || 'cash',
//                 paidAtCreation: true,
//                 customerInfo,
//             };

//             const res = await api.post('/bookings', payload);
//             const booking = res.data?.data || res.data;
//             toast.success('Tạo đơn đặt sân thành công');
//             console.log('NEW BOOKING', booking);

//             // điều hướng về danh sách đặt sân
//             navigate('/admin/bookings');

//             // Reset form (dù đã navigate, cho chắc)
//             setSelectedCustomer(null);
//             setSelectedCourt(null);
//             setDate(null);
//             setStartTime(undefined);
//             setEndTime(undefined);
//             setNote('');
//             setFieldPrice(0);
//         } catch (err: any) {
//             console.error(err);
//             const msg = err?.response?.data?.message || 'Tạo đơn thất bại';
//             toast.error(msg);
//         }
//     };

//     /* ========== RENDER ========== */

//     return (
//         <>
//             <Title level={3} style={{ marginBottom: 16 }}>
//                 Đặt sân nhanh
//             </Title>
//             <Text type='secondary'>Tạo đơn đặt sân tại quầy cho khách hàng</Text>

//             <Row gutter={24} style={{ marginTop: 24 }}>
//                 {/* CỘT TRÁI: CÁC BƯỚC */}
//                 <Col span={16}>
//                     {/* B1. CHỌN KHÁCH HÀNG */}
//                     <Card title='1. Chọn khách hàng' style={{ marginBottom: 16 }}>
//                         <Row gutter={8} align='middle'>
//                             <Col flex='auto'>
//                                 <Input
//                                     placeholder='Nhập SĐT hoặc tên khách hàng...'
//                                     prefix={<SearchOutlined />}
//                                     value={customerSearch}
//                                     onChange={(e) => setCustomerSearch(e.target.value)}
//                                     onPressEnter={handleSearchCustomer}
//                                 />
//                             </Col>
//                             <Col>
//                                 <Button loading={customerLoading} onClick={handleSearchCustomer}>
//                                     Danh sách
//                                 </Button>
//                             </Col>
//                             <Col>
//                                 <Button
//                                     type='primary'
//                                     icon={<PlusOutlined />}
//                                     onClick={() => setCustomerCreateModalOpen(true)}
//                                 >
//                                     Thêm mới
//                                 </Button>
//                             </Col>
//                         </Row>

//                         {selectedCustomer && (
//                             <Card
//                                 size='small'
//                                 style={{
//                                     marginTop: 16,
//                                     background: '#f6ffed',
//                                     borderColor: '#b7eb8f',
//                                 }}
//                             >
//                                 <Space>
//                                     <Avatar icon={<UserOutlined />} />
//                                     <div>
//                                         <Text strong>{selectedCustomer.name}</Text>
//                                         <br />
//                                         <Text type='secondary'>
//                                             {selectedCustomer.phone} · {selectedCustomer.email}
//                                         </Text>
//                                     </div>
//                                     <Tag color='green'>Đã chọn</Tag>
//                                     <Button type='link' onClick={() => setSelectedCustomer(null)}>
//                                         Đổi
//                                     </Button>
//                                 </Space>
//                             </Card>
//                         )}
//                     </Card>

//                     {/* B2. CHỌN SÂN */}
//                     <Card title='2. Chọn sân' style={{ marginBottom: 16 }} loading={courtLoading}>
//                         <Row gutter={[16, 16]}>
//                             {courts.map((court) => {
//                                 const isActive = selectedCourt?._id === court._id;
//                                 const imageUrl =
//                                     court.images && court.images.length > 0 ? court.images[0] : '';

//                                 return (
//                                     <Col span={12} key={court._id}>
//                                         <Card
//                                             hoverable
//                                             onClick={() => setSelectedCourt(court)}
//                                             style={{
//                                                 borderColor: isActive ? '#1677ff' : undefined,
//                                                 borderWidth: isActive ? 2 : 1,
//                                             }}
//                                             bodyStyle={{ padding: 12 }}
//                                         >
//                                             <div
//                                                 style={{
//                                                     display: 'grid',
//                                                     gridTemplateColumns: '1fr 1fr',
//                                                     gap: 12,
//                                                     alignItems: 'stretch',
//                                                 }}
//                                             >
//                                                 {/* ẢNH SÂN (1:1) */}
//                                                 {imageUrl && (
//                                                     <div>
//                                                         <img
//                                                             src={imageUrl}
//                                                             alt={court.name}
//                                                             style={{
//                                                                 width: '100%',
//                                                                 aspectRatio: '1 / 1',
//                                                                 objectFit: 'cover',
//                                                                 borderRadius: 8,
//                                                             }}
//                                                         />
//                                                     </div>
//                                                 )}

//                                                 {/* THÔNG TIN SÂN */}
//                                                 <div
//                                                     style={{
//                                                         display: 'flex',
//                                                         flexDirection: 'column',
//                                                         justifyContent: 'space-between',
//                                                     }}
//                                                 >
//                                                     <div>
//                                                         <Title
//                                                             level={5}
//                                                             style={{ marginBottom: 4 }}
//                                                         >
//                                                             {court.name}
//                                                         </Title>
//                                                         <Text type='secondary'>
//                                                             {COURT_TYPE_LABELS[court.type] ||
//                                                                 court.type}
//                                                         </Text>
//                                                     </div>

//                                                     <div style={{ marginTop: 8, fontSize: 13 }}>
//                                                         <div>
//                                                             Giờ thường:{' '}
//                                                             <Text strong>
//                                                                 {court.basePrice.toLocaleString(
//                                                                     'vi-VN'
//                                                                 )}{' '}
//                                                                 đ
//                                                             </Text>
//                                                         </div>
//                                                         <div>
//                                                             Giờ cao điểm:{' '}
//                                                             <Text strong>
//                                                                 {court.peakPrice.toLocaleString(
//                                                                     'vi-VN'
//                                                                 )}{' '}
//                                                                 đ
//                                                             </Text>
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                         </Card>
//                                     </Col>
//                                 );
//                             })}

//                             {!courts.length && !courtLoading && (
//                                 <Col span={24}>
//                                     <Text type='secondary'>Chưa có sân nào.</Text>
//                                 </Col>
//                             )}
//                         </Row>
//                     </Card>

//                     {/* B3. CHỌN THỜI GIAN – dùng BookingTimeSelector */}
//                     <Card title='3. Chọn thời gian' style={{ marginBottom: 16 }}>
//                         {selectedCourt ? (
//                             <BookingTimeSelector
//                                 courtId={selectedCourt._id}
//                                 basePrice={selectedCourt.basePrice}
//                                 peakPrice={selectedCourt.peakPrice}
//                                 onSlotSelected={handleSlotSelected}
//                             />
//                         ) : (
//                             <Text type='secondary'>
//                                 Vui lòng chọn sân trước khi chọn khung giờ.
//                             </Text>
//                         )}
//                     </Card>

//                     {/* GHI CHÚ */}
//                     <Card title='Ghi chú'>
//                         <TextArea
//                             rows={3}
//                             placeholder='Thêm ghi chú cho đơn đặt sân...'
//                             value={note}
//                             onChange={(e) => setNote(e.target.value)}
//                         />
//                     </Card>
//                 </Col>

//                 {/* CỘT PHẢI: TÓM TẮT */}
//                 <Col span={8}>
//                     <Card title='Tóm tắt đặt sân' extra={<span />}>
//                         <Space direction='vertical' style={{ width: '100%' }} size='middle'>
//                             <div>
//                                 <Text type='secondary'>Khách hàng</Text>
//                                 <br />
//                                 {selectedCustomer ? (
//                                     <Text strong>{selectedCustomer.name}</Text>
//                                 ) : (
//                                     <Text>Chưa chọn</Text>
//                                 )}
//                             </div>
//                             <div>
//                                 <Text type='secondary'>Sân</Text>
//                                 <br />
//                                 {selectedCourt ? (
//                                     <Text strong>{selectedCourt.name}</Text>
//                                 ) : (
//                                     <Text>Chưa chọn</Text>
//                                 )}
//                             </div>
//                             <div>
//                                 <Text type='secondary'>Ngày đặt</Text>
//                                 <br />
//                                 {date ? (
//                                     <Text strong>{date.format('DD/MM/YYYY')}</Text>
//                                 ) : (
//                                     <Text>Chưa chọn</Text>
//                                 )}
//                             </div>
//                             <div>
//                                 <Text type='secondary'>Giờ</Text>
//                                 <br />
//                                 {startTime && endTime ? (
//                                     <Text strong>
//                                         {startTime} - {endTime}
//                                     </Text>
//                                 ) : (
//                                     <Text>Chưa chọn</Text>
//                                 )}
//                             </div>

//                             <div>
//                                 <Text type='secondary'>Tiền sân</Text>
//                                 <br />
//                                 <Text strong>{fieldPrice.toLocaleString('vi-VN')} đ</Text>
//                             </div>

//                             <div>
//                                 <Text type='secondary'>Tổng tiền</Text>
//                                 <Title level={4} style={{ marginTop: 4, marginBottom: 0 }}>
//                                     {totalAmount.toLocaleString('vi-VN')} đ
//                                 </Title>
//                             </div>

//                             <Button type='primary' size='large' block onClick={handleSubmitBooking}>
//                                 Xác nhận đặt sân
//                             </Button>

//                             <Text type='secondary' style={{ fontSize: 12 }}>
//                                 * Đơn đặt sẽ được tự động xác nhận. <br />* Khách thanh toán trực
//                                 tiếp tại quầy.
//                             </Text>
//                         </Space>
//                     </Card>
//                 </Col>
//             </Row>

//             {/* MODAL DANH SÁCH KHÁCH HÀNG */}
//             <Modal
//                 title='Danh sách khách hàng'
//                 open={isCustomerListModalOpen}
//                 onCancel={() => setCustomerListModalOpen(false)}
//                 footer={null}
//                 width={700}
//             >
//                 <List
//                     dataSource={customerList}
//                     renderItem={(item) => (
//                         <List.Item
//                             style={{ cursor: 'pointer' }}
//                             onClick={() => {
//                                 setSelectedCustomer(item);
//                                 setCustomerListModalOpen(false);
//                             }}
//                         >
//                             <List.Item.Meta
//                                 avatar={<Avatar icon={<UserOutlined />} />}
//                                 title={item.name}
//                                 description={
//                                     <>
//                                         {item.phone}
//                                         {item.email && ` · ${item.email}`}
//                                     </>
//                                 }
//                             />
//                         </List.Item>
//                     )}
//                 />
//             </Modal>

//             {/* MODAL THÊM KHÁCH HÀNG MỚI */}
//             <Modal
//                 title='Thêm khách hàng mới'
//                 open={isCustomerCreateModalOpen}
//                 onCancel={() => setCustomerCreateModalOpen(false)}
//                 onOk={handleCreateCustomer}
//                 okText='Lưu'
//                 cancelText='Hủy'
//             >
//                 <Form form={createCustomerForm} layout='vertical'>
//                     <Form.Item
//                         label='Họ tên'
//                         name='name'
//                         rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
//                     >
//                         <Input />
//                     </Form.Item>
//                     <Form.Item
//                         label='Số điện thoại'
//                         name='phone'
//                         rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
//                     >
//                         <Input />
//                     </Form.Item>
//                     <Form.Item label='Email' name='email'>
//                         <Input />
//                     </Form.Item>
//                 </Form>
//             </Modal>
//         </>
//     );
// };

// export default BookingCreate;

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Input,
  Button,
  List,
  Avatar,
  Modal,
  Form,
  Typography,
  Space,
  Tag,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import { SearchOutlined, UserOutlined, PlusOutlined } from "@ant-design/icons";
import api from "@/common/utils/api";
import { PAYMENT_METHOD } from "@/common/constants/enums.ts";
import { toast } from "react-toastify";
import BookingTimeSelector, { type SelectedSlot } from "@/components/BookingTimeSelector";

const { TextArea } = Input;
const { Title, Text } = Typography;

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
}

interface Court {
  _id: string;
  name: string;
  type: string;
  basePrice: number;
  peakPrice: number;
  address?: string;
  images?: string[];
  // local flag to mark booked (optimistic UI)
  isBooked?: boolean;
}

const COURT_TYPE_LABELS: Record<string, string> = {
  indoor: "Trong nhà",
  outdoor: "Ngoài trời",
  vip: "Sân VIP",
};

// Generate booking code: BK-YYYYMMDD-AB12 (FE-only, BE tự sinh code riêng vẫn OK)
const generateBookingCode = (dateStr: string) => {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const cleanDate = dateStr.replace(/-/g, "");
  return `BK-${cleanDate}-${random}`;
};

const BookingCreate: React.FC = () => {
  const navigate = useNavigate();

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isCustomerListModalOpen, setCustomerListModalOpen] = useState(false);
  const [isCustomerCreateModalOpen, setCustomerCreateModalOpen] =
    useState(false);
  const [createCustomerForm] = Form.useForm();

  const [courts, setCourts] = useState<Court[]>([]);
  const [courtLoading, setCourtLoading] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);

  const [date, setDate] = useState<Dayjs | null>(null);
  const [startTime, setStartTime] = useState<string | undefined>();
  const [endTime, setEndTime] = useState<string | undefined>();
  const [note, setNote] = useState("");
  const [fieldPrice, setFieldPrice] = useState(0);

  // deposit states
  const depositAmount = Math.round(fieldPrice * 0.5);
  const [isDepositPaid, setIsDepositPaid] = useState(false);

  // slot conflict / validation
  const [slotConflict, setSlotConflict] = useState(false);
  const [slotConflictMsg, setSlotConflictMsg] = useState<string | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);

  // === Load list of courts from API ===
  useEffect(() => {
    const fetchCourts = async () => {
      try {
        setCourtLoading(true);
        const res = await api.get("/courts", { params: { status: "active" } });
        const data = res.data?.data || res.data;
        setCourts(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error("Không tải được danh sách sân");
      } finally {
        setCourtLoading(false);
      }
    };

    fetchCourts();
  }, []);

  // === Search customers by name/phone ===
  const handleSearchCustomer = async () => {
    try {
      setCustomerLoading(true);
      const res = await api.get("/users", {
        params: { search: customerSearch.trim() },
      });
      const data = res.data?.data || res.data;
      setCustomerList(Array.isArray(data) ? data : []);
      setCustomerListModalOpen(true);
    } catch (err) {
      toast.error("Không tìm được khách hàng");
    } finally {
      setCustomerLoading(false);
    }
  };

  // === Slot selected from BookingTimeSelector ===
  const handleSlotSelected = useCallback((slots: SelectedSlot[]) => {


    if (!slots.length) {
      setDate(null);
      setStartTime(undefined);
      setEndTime(undefined);
      setFieldPrice(0);
      setIsDepositPaid(false);
      return;
    }


    // sắp theo thời gian
    const sorted = [...slots].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );

    // ngày theo slot đầu
    setDate(dayjs(sorted[0].date));
    setStartTime(sorted[0].startTime);
    setEndTime(sorted[sorted.length - 1].endTime);

    // tổng tiền = cộng price từng ca
    const total = sorted.reduce((sum, s) => sum + (s.price || 0), 0);
    setFieldPrice(total);
    setIsDepositPaid(false);
  }, []);


  // Reset time & price when change court
  useEffect(() => {
    if (!selectedCourt) {
      setFieldPrice(0);
      setDate(null);
      setStartTime(undefined);
      setEndTime(undefined);
      setIsDepositPaid(false);
      setSlotConflict(false);
      setSlotConflictMsg(null);
    }
  }, [selectedCourt]);

  // Whenever court/date/time change, calculate price & check conflict
  useEffect(() => {
    const shouldCalc =
      selectedCourt && date && startTime && endTime && startTime < endTime;
    if (shouldCalc) {
      calculateFieldPrice(selectedCourt._id, startTime!, endTime!);
      checkSlotOverlap(
        selectedCourt._id,
        date.format("YYYY-MM-DD"),
        startTime!,
        endTime!
      );
    } else {
      setFieldPrice(0);
      setSlotConflict(false);
      setSlotConflictMsg(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourt, date, startTime, endTime]);

  // === Calculate price using BE endpoint: GET /bookings/calculate?courtId=...&startTime=...&endTime=...
  const calculateFieldPrice = async (
    courtId: string,
    sTime: string,
    eTime: string
  ) => {
    try {
      setCalculatingPrice(true);
      const res = await api.get("/bookings/calculate", {
        params: { courtId, startTime: sTime, endTime: eTime },
      });
      const data = res.data?.data || res.data;
      // controller returns { fieldAmount, total, ... } — use total or fieldAmount
      const amount = data?.fieldAmount ?? data?.total ?? 0;
      setFieldPrice(amount || 0);
    } catch (err: any) {
      // if BE rejects (invalid slot / outside hours) show message
      const msg = err?.response?.data?.message || "Không tính được tiền sân";
      toast.error(msg);
      setFieldPrice(0);
    } finally {
      setCalculatingPrice(false);
    }
  };

  // === Check overlap using BE endpoint: GET /bookings/court/:courtId?startDate=...&endDate=...
  // and then check startTime/endTime overlap locally (controller returns bookings)
  const checkSlotOverlap = async (
    courtId: string,
    dateStr: string,
    sTime: string,
    eTime: string
  ) => {
    try {
      const res = await api.get(`/bookings/court/${courtId}`, {
        params: { startDate: dateStr, endDate: dateStr },
      });
      const bookings = res.data?.data || res.data || [];

      // overlap check: existing.startTime < eTime && existing.endTime > sTime
      const overlap = (existing: any) =>
        existing.startTime < eTime && existing.endTime > sTime;

      const found = Array.isArray(bookings) && bookings.some(overlap);

      if (found) {
        setSlotConflict(true);
        setSlotConflictMsg("Khung giờ này đã có người đặt!");
      } else {
        setSlotConflict(false);
        setSlotConflictMsg(null);
      }
    } catch (err: any) {
      // If endpoint fails, be conservative: do not block but notify
      console.error("Lỗi khi kiểm tra trùng giờ:", err);
      setSlotConflict(false);
      setSlotConflictMsg(null);
    }
  };

  // === Create new customer ===
  const handleCreateCustomer = async () => {
    try {
      const values = await createCustomerForm.validateFields();

      const payload = {
        name: values.name,
        phone: values.phone,
        email: values.email || "",
      };

      console.log("📤 Payload gửi lên:", payload);

      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:3000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });

      console.log("📥 Response status:", res.status);

      const data = await res.json().catch(() => {
        console.log("❗ Lỗi parse JSON");
        return {};
      });

      console.log("📥 Response JSON:", data);

      if (res.status !== 200 && res.status !== 201) {
        toast.error(data.message || "Không thể thêm khách hàng");
        return;
      }

      const newCustomer = data.user || data.data || data;

      setSelectedCustomer(newCustomer);

      toast.success("✔ Thêm khách hàng thành công!");
      setCustomerCreateModalOpen(false);
      createCustomerForm.resetFields();
    } catch (err) {
      console.error("🔥 Lỗi tạo khách hàng:", err);
      toast.error("Có lỗi xảy ra khi tạo khách hàng");
    }
  };

  // === Submit booking ===
  const handleSubmitBooking = async () => {
    // validation
    if (!selectedCourt) return toast.error("Vui lòng chọn sân");
    if (!date || !startTime || !endTime)
      return toast.error("Vui lòng chọn ngày giờ");
    if (!selectedCustomer)
      return toast.error("Vui lòng chọn hoặc thêm khách hàng");
    if (!isDepositPaid)

      return toast.error("Vui lòng xác nhận khách đã đặt cọc 50% trước");
    if (slotConflict)
      return toast.error(slotConflictMsg || "Khung giờ đã bị đặt");

    // Format date as YYYY-MM-DD (controller accepts date, it will normalize)
    const dateStr = date.format("YYYY-MM-DD");
    // tính xem có đá trận sau không
    // date dayjs
    const now = dayjs();
    const bookingDay = date.startOf("day");
    //ghép ngày và giờ bắt đầu thành full datetime
    const bookingStart = dayjs(`${dateStr} ${startTime}`);
    const isFutureDay = bookingDay.isAfter(now, "day"); // khác ngày & ở tương lai
    const isSameDay = bookingDay.isSame(now, "day"); // cùng ngày
    const isFutureSameDay = isSameDay && bookingStart.isAfter(now); // cùng ngày nhưng giờ bắt đầu > hiện tại

    const isFutureMatch = isFutureDay || isFutureSameDay;
    // Nếu là trận đá sau (khác ngày hoặc chiều/ tối đá) thì BẮT BUỘC cọc 50%
    if (isFutureMatch && !isDepositPaid) {
      return toast.error(
        "Khách đặt sân đá sau (khác ngày hoặc khác giờ) bắt buộc phải cọc 50% trước!"
      );
    }

    if (slotConflict) {
      return toast.error(slotConflictMsg || "Khung giờ đã bị đặt");
    }
    //bookingCode Be và FE tự sinh riêng 

    const bookingCode = generateBookingCode(dateStr);


    const payload = {
      // NOTE: backend's createBooking expects fields like courtId, customerId, date, startTime, endTime, paymentMethod, note, isOffline, customerInfo, paidAtCreation
      courtId: selectedCourt._id,
      // For admin creating at quầy, you may not have customerId (but controller allows createdBy admin leading to finalCustomerId = customerId || null). We'll include customerId to link user.
      customerId: selectedCustomer._id,
      date: dateStr,
      startTime,
      endTime,
      note: note || "",
      isOffline: true,
      paymentMethod: PAYMENT_METHOD?.CASH || "cash",
      //BE dùng paidAtCreation để:
      // - Nếu offline + cash + isFutureMatch: bắt buộc true → coi là đã cọc 50%
      // - Nếu offline + cash + đá luôn: true = đã trả đủ, false = chưa trả
      paidAtCreation: isDepositPaid,
      depositAmount,
      isDepositPaid,
      // FE snapshot of customer
      customerInfo: {
        name: selectedCustomer.name,
        phone: selectedCustomer.phone,
        email: selectedCustomer.email || "",
      },
      // optional FE-only field - BE will ignore or not use it for 'code'
      bookingCode,
    };

    try {
      const res = await api.post("/bookings", payload);
      const booking = res.data?.data || res.data;
      toast.success(`Đặt sân thành công — Mã: ${booking?.code || bookingCode}`);

      // optimistic update: mark selected court as booked locally
      setCourts((prev) =>
        prev.map((c) =>
          c._id === selectedCourt._id ? { ...c, isBooked: true } : c
        )
      );

      // navigate to admin booking list
      navigate("/admin/bookings");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Tạo đơn thất bại";
      toast.error(msg);
      // If backend returns validation details, show them in console for debugging
      console.error("Create booking error:", err?.response?.data || err);
    }
  };

  return (
    <>
      <Title level={3}>Đặt sân nhanh</Title>
      <Text type="secondary">Tạo đơn đặt sân tại quầy cho khách</Text>

      <Row gutter={24} style={{ marginTop: 24 }}>
        <Col span={16}>
          {/* Customer */}
          <Card title="1. Chọn khách hàng" style={{ marginBottom: 16 }}>
            <Row gutter={8} align="middle">
              <Col flex="auto">
                <Input
                  placeholder="Nhập SĐT hoặc tên khách hàng..."
                  prefix={<SearchOutlined />}
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onPressEnter={handleSearchCustomer}
                />
              </Col>
              <Col>
                <Button
                  loading={customerLoading}
                  onClick={handleSearchCustomer}
                >
                  Danh sách
                </Button>
              </Col>
              <Col>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCustomerCreateModalOpen(true)}
                >
                  Thêm mới
                </Button>
              </Col>
            </Row>

            {selectedCustomer && (
              <Card
                size="small"
                style={{
                  marginTop: 16,
                  background: "#f6ffed",
                  borderColor: "#b7eb8f",
                }}
              >
                <Space>
                  <Avatar icon={<UserOutlined />} />
                  <div>
                    <Text strong>{selectedCustomer.name}</Text>
                    <br />
                    <Text type="secondary">
                      {selectedCustomer.phone} · {selectedCustomer.email}
                    </Text>
                  </div>
                  <Tag color="green">Đã chọn</Tag>
                  <Button type="link" onClick={() => setSelectedCustomer(null)}>
                    Đổi
                  </Button>
                </Space>
              </Card>
            )}
          </Card>

          {/* Courts */}
          <Card
            title="2. Chọn sân"
            style={{ marginBottom: 16 }}
            loading={courtLoading}
          >
            <Row gutter={[16, 16]}>
              {courts.map((court) => {
                const isActive = selectedCourt?._id === court._id;
                const imageUrl = court.images?.[0] || "";
                return (
                  <Col span={12} key={court._id}>
                    <Card
                      hoverable
                      onClick={() => setSelectedCourt(court)}
                      style={{
                        borderColor: isActive ? "#1677ff" : undefined,
                        borderWidth: isActive ? 2 : 1,
                      }}
                      bodyStyle={{ padding: 12 }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 12,
                        }}
                      >
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt={court.name}
                            style={{
                              width: "100%",
                              aspectRatio: "1 / 1",
                              objectFit: "cover",
                              borderRadius: 8,
                            }}
                          />
                        )}

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                          }}
                        >
                          <div>
                            <Title level={5} style={{ marginBottom: 4 }}>
                              {court.name}
                            </Title>
                            <Text type="secondary">
                              {COURT_TYPE_LABELS[court.type] || court.type}
                            </Text>
                          </div>

                          <div style={{ marginTop: 8 }}>
                            <div>
                              Giờ thường:{" "}
                              <Text strong>
                                {court.basePrice.toLocaleString("vi-VN")} đ
                              </Text>
                            </div>
                            <div>
                              Giờ cao điểm:{" "}
                              <Text strong>
                                {court.peakPrice.toLocaleString("vi-VN")} đ
                              </Text>
                            </div>
                            {court.isBooked && (
                              <Tag color="red" style={{ marginTop: 8 }}>
                                Đã đặt
                              </Tag>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Col>
                );
              })}

              {!courts.length && !courtLoading && (
                <Col span={24}>
                  <Text type="secondary">Chưa có sân nào.</Text>
                </Col>
              )}
            </Row>
          </Card>

          {/* Time selector */}
          <Card title="3. Chọn thời gian" style={{ marginBottom: 16 }}>
            {selectedCourt ? (
              <BookingTimeSelector
                courtId={selectedCourt._id}
                basePrice={selectedCourt.basePrice}
                peakPrice={selectedCourt.peakPrice}
                onSlotSelected={handleSlotSelected}

              />
            ) : (
              <Text type="secondary">
                Vui lòng chọn sân trước khi chọn khung giờ.
              </Text>
            )}

            {/* show conflict message under selector */}
            {slotConflictMsg && (
              <div style={{ marginTop: 12 }}>
                <Text type="danger" style={{ color: "#cf1322" }}>
                  ⚠ {slotConflictMsg}
                </Text>
              </div>
            )}
          </Card>

          <Card title="Ghi chú">
            <TextArea
              rows={3}
              placeholder="Thêm ghi chú cho đơn đặt sân..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Card>
        </Col>

        {/* Summary */}
        <Col span={8}>
          <Card title="Tóm tắt đặt sân">
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <div>
                <Text type="secondary">Khách hàng</Text>
                <br />
                {selectedCustomer ? (
                  <Text strong>{selectedCustomer.name}</Text>
                ) : (
                  <Text>Chưa chọn</Text>
                )}
              </div>

              <div>
                <Text type="secondary">Sân</Text>
                <br />
                {selectedCourt ? (
                  <Text strong>{selectedCourt.name}</Text>
                ) : (
                  <Text>Chưa chọn</Text>
                )}
              </div>

              <div>
                <Text type="secondary">Ngày đặt</Text>
                <br />
                {date ? (
                  <Text strong>{date.format("DD/MM/YYYY")}</Text>
                ) : (
                  <Text>Chưa chọn</Text>
                )}
              </div>

              <div>
                <Text type="secondary">Giờ</Text>
                <br />
                {startTime && endTime ? (
                  <Text strong>
                    {startTime} - {endTime}
                  </Text>
                ) : (
                  <Text>Chưa chọn</Text>
                )}
              </div>

              <div>
                <Text type="secondary">Tiền sân</Text>
                <br />
                <Text strong>
                  {calculatingPrice
                    ? "Đang tính..."
                    : fieldPrice.toLocaleString("vi-VN")}{" "}
                  đ
                </Text>
              </div>

              <div>
                <Text type="secondary">Tiền cọc (50%)</Text>
                <br />
                <Text strong>{depositAmount.toLocaleString("vi-VN")} đ</Text>
              </div>

              <div>
                <Text type="secondary">Khách đã đặt cọc?</Text>
                <br />
                <Button
                  type={isDepositPaid ? "primary" : "default"}
                  onClick={() => setIsDepositPaid((v) => !v)}
                  block
                >
                  {isDepositPaid ? "Đã cọc" : "Chưa cọc (ấn để xác nhận)"}
                </Button>
              </div>

              <Button
                type="primary"
                size="large"
                block
                onClick={handleSubmitBooking}
                disabled={slotConflict || !selectedCustomer || !selectedCourt}
              >
                Xác nhận đặt sân
              </Button>

              <Text type="secondary" style={{ fontSize: 12 }}>
                * Đơn đặt sẽ được tự động xác nhận. <br />* Khách thanh toán
                trực tiếp tại quầy.
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Customer list modal */}
      <Modal
        title="Danh sách khách hàng"
        open={isCustomerListModalOpen}
        onCancel={() => setCustomerListModalOpen(false)}
        footer={null}
        width={700}
      >
        <List
          dataSource={customerList}
          renderItem={(item) => (
            <List.Item
              style={{ cursor: "pointer" }}
              onClick={() => {
                setSelectedCustomer(item);
                setCustomerListModalOpen(false);
              }}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={item.name}
                description={
                  <>
                    {item.phone}
                    {item.email && ` · ${item.email}`}
                  </>
                }
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* Create customer modal */}
      <Modal
        title="Thêm khách hàng mới"
        open={isCustomerCreateModalOpen}
        onCancel={() => {
          setCustomerCreateModalOpen(false);
          createCustomerForm.resetFields(); // reset form khi hủy
        }}
        onOk={handleCreateCustomer} // gọi hàm đã sửa bên trên
        okText="Lưu"
        cancelText="Hủy"
        destroyOnClose={true} // để modal mỗi lần mở lại form sạch
      >
        <Form form={createCustomerForm} layout="vertical">
          <Form.Item
            label="Họ tên"
            name="name"
            rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
          >
            <Input placeholder="Nhập họ tên khách hàng" />
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[
              { required: true, message: "Vui lòng nhập số điện thoại" },
              {
                pattern: /^[0-9]{8,15}$/,
                message: "Số điện thoại không hợp lệ",
              },
            ]}
          >
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[{ type: "email", message: "Email không hợp lệ" }]}
          >
            <Input placeholder="Nhập email (tùy chọn)" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default BookingCreate;
