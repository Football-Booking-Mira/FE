import { useEffect, useState } from "react";
import { Table, Popconfirm, message } from "antd";
import {
  Headphones,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  Trash2,
  User,
  Search,
} from "lucide-react";
import dayjs from "dayjs";

interface Contact {
  _id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
}

const ContactsPage = () => {
  const [data, setData] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = () => {
    setLoading(true);
    fetch("http://localhost:3000/api/contacts")
      .then((res) => res.json())
      .then((resData) => {
        if (Array.isArray(resData)) setData(resData);
        else setData([]);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = data.filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const columns = [
    {
      title: "Người gửi",
      key: "sender",
      render: (_: any, record: Contact) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <User size={20} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-[15px] text-slate-800 dark:text-white leading-none">{record.name}</span>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                <Mail size={11} className="text-blue-400" /> {record.email}
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                <Phone size={11} className="text-emerald-400" /> {record.phone}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Nội dung",
      dataIndex: "message",
      key: "message",
      render: (msg: string) => (
        <div className="flex items-start gap-2">
          <MessageSquare size={14} className="text-slate-300 mt-0.5 shrink-0" />
          <span className="text-sm text-slate-600 dark:text-slate-300 font-medium line-clamp-2">{msg}</span>
        </div>
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (date: string) => (
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Calendar size={13} className="text-amber-400" />
          {dayjs(date).format("HH:mm:ss DD/MM/YYYY")}
        </div>
      ),
    },
  ];

  return (
    <div className="px-4 pb-12 space-y-8 pt-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative">
          <div className="absolute -left-4 -top-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-3xl" />
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-4 italic">
            <div className="p-3.5 bg-linear-to-br from-cyan-500 to-blue-600 rounded-[20px] shadow-2xl shadow-cyan-500/40 rotate-3 flex items-center justify-center border border-white/20">
              <Headphones size={28} className="text-white" />
            </div>
            <span className="relative">
              HỖ TRỢ LIÊN HỆ
              <div className="absolute -bottom-2 left-0 w-1/2 h-1.5 bg-cyan-500/30 rounded-full" />
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-6 font-semibold flex items-center gap-2 text-sm">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            Các yêu cầu hỗ trợ từ khách hàng
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-2xl px-4 py-2.5 w-72 shadow-sm">
          <Search size={18} className="text-slate-300 dark:text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm font-semibold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 w-full"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-2xl"><MessageSquare size={20} className="text-blue-500" /></div>
          <div>
            <div className="text-2xl font-black text-slate-800 dark:text-white">{data.length}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Tổng liên hệ</div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl"><Calendar size={20} className="text-emerald-500" /></div>
          <div>
            <div className="text-2xl font-black text-slate-800 dark:text-white">{data.filter(c => dayjs(c.createdAt).isAfter(dayjs().subtract(7, 'day'))).length}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Trong 7 ngày</div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-violet-50 dark:bg-violet-500/10 rounded-2xl"><Mail size={20} className="text-violet-500" /></div>
          <div>
            <div className="text-2xl font-black text-slate-800 dark:text-white">{data.filter(c => dayjs(c.createdAt).isSame(dayjs(), 'day')).length}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Hôm nay</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-card rounded-4xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden p-6 transition-colors">
        <Table
          rowKey="_id"
          columns={columns as any}
          dataSource={filtered}
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showTotal: undefined,
          }}
          className="contact-table"
        />
      </div>

      <style>{`
        .contact-table .ant-table { background: transparent !important; }
        .contact-table .ant-table-thead > tr > th {
          background: transparent !important; color: #64748b !important;
          font-size: 11px !important; font-weight: 800 !important;
          text-transform: uppercase !important; letter-spacing: 0.05em !important;
          border-bottom: 2px solid #f1f5f9 !important; padding: 12px 20px 16px !important;
        }
        .dark .contact-table .ant-table-thead > tr > th {
          color: #64748b !important; border-bottom: 1px dashed rgba(255,255,255,0.1) !important;
        }
        .contact-table .ant-table-tbody > tr > td {
          padding: 16px 20px !important; border-bottom: 1px dotted #e2e8f0 !important;
          transition: all 0.3s; background: transparent !important;
        }
        .dark .contact-table .ant-table-tbody > tr > td { border-bottom: 1px dashed rgba(255,255,255,0.05) !important; }
        .contact-table .ant-table-tbody > tr:hover > td { background: #f0f9ff !important; }
        .dark .contact-table .ant-table-tbody > tr:hover > td { background: rgba(6,182,212,0.03) !important; }
        .contact-table .ant-table-tbody > tr:hover > td:first-child {
          border-top-left-radius: 16px !important; border-bottom-left-radius: 16px !important;
          box-shadow: inset 3px 0 0 0 #06b6d4 !important;
        }
        .contact-table .ant-table-tbody > tr:hover > td:last-child {
          border-top-right-radius: 16px !important; border-bottom-right-radius: 16px !important;
        }
        .ant-table-placeholder { background: transparent !important; }
      `}</style>
    </div>
  );
};

export default ContactsPage;
