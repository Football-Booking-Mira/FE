# MIRA Football - Frontend

> Giao diện người dùng cho hệ thống đặt sân bóng đá trực tuyến MIRA Football.

---

## Yêu cầu

- **Node.js** >= 18
- **npm** >= 9
- **Git**
- **Backend API** đang chạy tại `http://localhost:3000` (xem hướng dẫn tại [BE/README.md](../BE/README.md))

---

## Cách chạy dự án

### 1. Clone & cài đặt

```bash
git clone <repository-url>
cd FE
npm install
```

### 2. Tạo file `.env`

Tạo file `.env` tại thư mục gốc `FE/` với nội dung:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

> **Lưu ý:** Sau khi thay đổi `.env`, cần restart dev server (`Ctrl+C` rồi `npm run dev` lại).

### 3. Chạy Backend trước

>  **Quan trọng:** Frontend cần Backend API đang chạy để hoạt động.

```bash
# Mở terminal khác, vào thư mục BE
cd ../BE
npm install
npm run dev
```

### 4. Chạy Frontend

```bash
npm run dev
```

### 5. Truy cập

- Trang chủ: **http://localhost:5173**
- Đăng nhập: **http://localhost:5173/signin**

---

## Các lệnh có sẵn

| Lệnh             | Mô tả                                            |
| ----------------- | ------------------------------------------------- |
| `npm run dev`     | Chạy dev server (hot-reload) tại `localhost:5173` |
| `npm run build`   | Build production                                  |
| `npm run preview` | Preview bản build production                      |
| `npm run lint`    | Kiểm tra lỗi code với ESLint                     |
