import React, { useState } from "react";
import api from "@/common/utils/api";
import { motion } from "framer-motion";

type MatchForm = {
  date: string;
  time: string;
  stadium: string;
  status: "upcoming" | "live" | "finished";
};

const CreateMatchSchedule: React.FC = () => {
  const [form, setForm] = useState<MatchForm>({
    date: "",
    time: "",
    stadium: "",
    status: "upcoming",
  });

  const [msg, setMsg] = useState("");

  const stadiums = ["Sân 1", "Sân 2", "Sân 3", "Sân 4"];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/matches/create", form);
      setMsg("Tạo lịch thi đấu thành công!");
      setForm({
        date: "",
        time: "",
        stadium: "",
        status: "upcoming",
      });
    } catch (err: any) {
      setMsg("❌ Lỗi tạo lịch: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-white p-6 rounded-2xl shadow-sm border"
      >
        <h2 className="text-2xl font-bold text-center mb-5">
          🗓 Tạo lịch thi đấu sân bóng đá
        </h2>

        {msg && <p className="text-center text-sm mb-3">{msg}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded-lg"
          />

          <input
            type="time"
            name="time"
            value={form.time}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded-lg"
          />

          <select
            name="stadium"
            value={form.stadium}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded-lg"
          >
            <option value="">-- Chọn sân thi đấu --</option>
            {stadiums.map((s, i) => (
              <option key={i} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full border p-2 rounded-lg text-sm"
          >
            <option value="upcoming">Sắp diễn ra</option>
            <option value="live">Đang diễn ra</option>
            <option value="finished">Đã kết thúc</option>
          </select>

          <button className="w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-black transition">
            Tạo lịch thi đấu
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateMatchSchedule;
