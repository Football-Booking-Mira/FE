import { Table } from "antd";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:3000/api/contacts")
      .then((res) => res.json())
      .then((resData) => {
        if (Array.isArray(resData)) {
          setData(resData);
        } else {
          setData([]);
          console.error("Contacts API trả về sai định dạng:", resData);
        }
      })
      .catch((err) => {
        console.error("Lỗi load contacts:", err);
        setData([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      title: "Họ tên",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
     {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: "Nội dung",
      dataIndex: "message",
      key: "message",
    },
    {
      title: "Ngày gửi",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) =>
        new Date(date).toLocaleString("vi-VN"),
    },
  ];

  return (
    <Table
      rowKey="_id"
      columns={columns}
      dataSource={data}
      loading={loading}
    />
  );
};

export default ContactsPage;
