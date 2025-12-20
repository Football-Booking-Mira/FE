import dayjs from 'dayjs';

const formatVND = (v: number = 0) =>
    v.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

const PAYMENT_METHOD_TEXT: Record<string, string> = {
    cash: 'Tiền mặt',
    transfer: 'Chuyển khoản',
    momo: 'Momo',
    vnpay: 'VNPAY',
    qr: 'Quẹt thẻ / QR',
};
//Xác định thiết bị thuê mua hay bán ở hóa đơn
const renderMode = (mode?: string | null): string => {
    if (mode === 'rent') return 'Thuê';
    if (mode === 'sell') return 'Bán';
    return '';
};

export const printInvoiceMira = (invoiceDetail: any) => {
    if (!invoiceDetail?.invoice) return;

    const inv = invoiceDetail.invoice;
    const rawItems = invoiceDetail.items || [];
    const mergedMap: Record<string, any> = {};
    rawItems.forEach((it: any) => {
        const key = `${it.name || ''}_${it.unit || ''}_${it.price || 0}_${it.mode || ''}`;
        if (mergedMap[key]) {
            mergedMap[key].qty += it.qty || 0;
            mergedMap[key].subtotal += it.subtotal || (it.qty || 0) * (it.price || 0);
        } else {
            mergedMap[key] = {
                ...it,
                qty: it.qty || 0,
                subtotal: it.subtotal || (it.qty || 0) * (it.price || 0),
            };
        }
    });

    const items = Object.values(mergedMap);
    const booking = inv.bookingId || {};
    const customer = booking.customerInfo || booking.customerId || inv.customerId || {};
    const methodLabel = PAYMENT_METHOD_TEXT[inv.method] || inv.method || '—';

    // tiền sân/thiết bị lấy đúng field, không lấy booking.total cho tiền sân
    const fieldAmount = Number(booking.fieldAmount || 0);
    const equipmentTotal = Number(booking.equipmentTotal || 0);
    const voucherDiscount = Number(booking.voucherDiscount || booking.discountTotal || 0);

    // booking.total BE nên đã là (field + equipment - voucherDiscount). Nếu chưa có thì tự tính
    const bookingTotal =
        Number(booking.total || 0) > 0
            ? Number(booking.total || 0)
            : Math.max(0, fieldAmount + equipmentTotal - voucherDiscount);

    // inv.discount là giảm thêm trên hóa đơn (nếu có)
    const invoiceDiscount = Number(inv.discount || 0);
    const grandTotal = Math.max(0, bookingTotal - invoiceDiscount);

    // depositAmount sau khi tạo invoice thường = tổng đã thanh toán (đặt cọc + hóa đơn này)
    const totalPaid = Number(booking.depositAmount || 0);
    const paidThisInvoice = Number(inv.total || 0);

    // đã thanh toán trước = tổng đã trả - tiền hoá đơn này (không âm)
    const prepaidBefore = Math.max(0, totalPaid - paidThisInvoice);

    // còn phải thu = tổng - tổng đã trả (không âm)
    const remainingPay = Math.max(0, grandTotal - totalPaid);

    // để show "Tổng đã thanh toán" đúng
    const alreadyPaidTotal = totalPaid;

    const createdAt = inv.createdAt || inv.paidAt;
    const createdAtStr = createdAt ? dayjs(createdAt).format('DD/MM/YYYY HH:mm') : '';

    const bookingDateStr = booking.date ? dayjs(booking.date).format('DD/MM/YYYY') : '';
    // khung giờ hiển thị: ưu tiên danh sách slots, fallback sang startTime/endTime
    const bookingTimeStr =
        Array.isArray(booking.slots) && booking.slots.length > 0
            ? booking.slots.map((s: any) => `${s.startTime} - ${s.endTime}`).join(', ')
            : `${booking.startTime || ''} - ${booking.endTime || ''}`;

    const itemsRowsHtml =
        /* html */
        items.length > 0
            ? items
                  .map(
                      (it: any, idx: number) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${it.name || 'Hạng mục'}</td>
                <td>${renderMode(it.mode)}</td>
                <td>${it.unit || ''}</td>
                <td class="text-right">${it.qty || 0}</td>
                <td class="text-right">${formatVND(it.price || 0)}</td>
                <td class="text-right">${formatVND(
                    it.subtotal || (it.qty || 0) * (it.price || 0)
                )}</td>
              </tr>
            `
                  )
                  .join('')
            : `
        <tr>
          <td colspan="7" class="no-items">
            Không có thiết bị / hạng mục thêm.
          </td>
        </tr>
      `;

    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Hóa đơn - ${inv.code}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont,
        'Segoe UI', sans-serif;
      background: #f3f4f6;
      margin: 0;
      padding: 24px;
    }
    .invoice-wrapper {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      padding: 24px 32px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
    }
    .header {
      text-align: center;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 16px;
      margin-bottom: 16px;
    }
    .brand {
      font-size: 20px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .brand span {
      color: #16a34a;
    }
    .title {
      margin-top: 4px;
      font-size: 18px;
      font-weight: 600;
    }
    .meta {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .section {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 12px;
    }
    .grid-2 {
      display: flex;
      gap: 24px;
      font-size: 13px;
    }
    .grid-2 > div { flex: 1; }
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .label { color: #6b7280; }
    .value { font-weight: 500; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 6px;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 6px 8px;
      text-align: left;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
    }
    .text-right { text-align: right; }
    .no-items {
      text-align: center;
      color: #9ca3af;
      padding: 10px 8px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 13px;
    }
    .summary-row.total {
      font-size: 15px;
      font-weight: 700;
    }
    .summary-row.muted {
      font-size: 12px;
      color: #6b7280;
    }
    .status-paid {
      color: #16a34a;
      font-weight: 600;
    }
    .footer {
      margin-top: 18px;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
    }
    @page {
      margin: 16mm;
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <div class="header">
      <div class="brand">MIRA <span>FOOTBALL</span></div>
      <div class="title">HÓA ĐƠN THANH TOÁN</div>
      <div class="meta">
        Mã hóa đơn: <strong>${inv.code}</strong>
        &nbsp;•&nbsp;
        Ngày lập: ${createdAtStr}
      </div>
    </div>

    <div class="section grid-2">
      <div>
        <div class="section-title">A. Thông tin khách hàng</div>
        <div class="row">
          <span class="label">Họ tên:</span>
          <span class="value">${customer.name || customer.username || 'Khách lẻ'}</span>
        </div>
        ${
            customer.phone
                ? `<div class="row"><span class="label">SĐT:</span><span class="value">${customer.phone}</span></div>`
                : ''
        }
        ${
            customer.email
                ? `<div class="row"><span class="label">Email:</span><span class="value">${customer.email}</span></div>`
                : ''
        }
      </div>

      <div>
        <div class="section-title">B. Chi tiết đặt sân</div>
        <div class="row">
          <span class="label">Mã đặt sân:</span>
          <span class="value">${booking.code || ''}</span>
        </div>
        <div class="row">
          <span class="label">Sân:</span>
          <span class="value">${booking.courtId?.name || '—'}</span>
        </div>
        <div class="row">
          <span class="label">Ngày:</span>
          <span class="value">${bookingDateStr || '—'}</span>
        </div>
        <div class="row">
  <span class="label">Khung giờ:</span>
  <span class="value">${bookingTimeStr}</span>
</div>

      </div>
    </div>

    <div class="section">
      <div class="section-title">C. Thiết bị / hạng mục</div>
      <table>
        <thead>
          <tr>
            <th style="width:4%">#</th>
            <th style="width:36%">Tên thiết bị</th>
            <th style="width:14%">Hình thức</th>
            <th style="width:14%">Đơn vị</th>
            <th style="width:10%">SL</th>
            <th style="width:18%">Đơn giá</th>
            <th style="width:18%">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRowsHtml}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">D. Tổng kết thanh toán</div>
      <div class="summary-row">
        <span>Tiền sân</span>
        <span>${formatVND(fieldAmount)}</span>
      </div>
      <div class="summary-row">
        <span>Tiền thiết bị</span>
        <span>${formatVND(equipmentTotal)}</span>
      </div>
      ${voucherDiscount > 0 ? `
        <div class="summary-row" style="color:#16a34a;">
          <span>Giảm giá voucher ${booking.voucherCode ? `(${booking.voucherCode})` : ''}</span>
          <span>- ${formatVND(voucherDiscount)}</span>
        </div>
      ` : ''}
      <div class="summary-row">
        <span>Tổng sau giảm giá</span>
        <span>${formatVND(bookingTotal)}</span>
      </div>
      <div class="summary-row total">
  <span>Còn phải thu</span>
  <span>${formatVND(remainingPay)}</span>
</div>

      ${
          invoiceDiscount > 0
              ? `<div class="summary-row">
         <span>Giảm giá trên hóa đơn</span>
         <span>- ${formatVND(invoiceDiscount)}</span>
       </div>`
              : ''
      }

      <div class="summary-row total">
        <span>Tổng cộng</span>
        <span>${formatVND(grandTotal)}</span>
      </div>
     ${
         prepaidBefore > 0
             ? `<div class="summary-row muted">
         <span>Đã thanh toán trước</span>
         <span>- ${formatVND(prepaidBefore)}</span>
       </div>`
             : ''
     }

      <div class="summary-row">
        <span>Khách thanh toán hóa đơn này</span>
        <span style="font-weight:700;color:#2563eb;">
          ${formatVND(inv.total || 0)}
        </span>
      </div>
      <div class="summary-row muted">
        <span>Tổng đã thanh toán</span>
        <span>${formatVND(alreadyPaidTotal)}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">E. Chi tiết thanh toán</div>
      <div class="summary-row">
        <span>Phương thức</span>
        <span>${methodLabel}</span>
      </div>
      <div class="summary-row">
        <span>Trạng thái</span>
        <span class="status-paid">Đã thanh toán</span>
      </div>
      ${
          createdAtStr
              ? `<div class="summary-row muted">
                   <span>Ngày thanh toán</span>
                   <span>${createdAtStr}</span>
                 </div>`
              : ''
      }
    </div>

    <div class="footer">
      Cảm ơn quý khách đã sử dụng dịch vụ của <strong>Mira Football</strong>.<br/>
      Hóa đơn được tạo tự động bởi hệ thống quản lý đặt sân Mira.
    </div>
  </div>
</body>
</html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
};
