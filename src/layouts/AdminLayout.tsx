import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import {Bell, Search} from 'lucide-react'

const AdminHeader: React.FC = () => (
<header className="flex justify-between items-center px-8 py-4 bg-white border-b border-gray-200">
  {/* Search Bar */}
  <div className="relative w-96">
    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
    <input type="text" placeholder="Tìm kiếm lịch đặt, người dùng..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"/>
  </div>
  {/* User and Notifications */}
  <div className="flex items-center space-x-6">
    <div className="relative cursor-pointer">
      <Bell className="w-6 h-6 text-gray-600 hover:text-green-600"/>
      <span className="absolute top-0 right-0 block h-2 w-2 rounded-full ring-2 ring-white bg-red-500"/>
    </div>
    <div className="flex items-center space-x-3 cursor-pointer">
      <img src="https://i.postimg.cc/Vvs2kC5C/Chat-GPT-Image-20-12-50-18-thg-10-2025.png
" alt="Admin Avatar" className="w-10 h-10 rounded-full object-cover" />
      <div>
        <p className="text-sm font-medium text-gray-800">Admin Name</p>
        <p className="text-xs text-gray-500">Quản trị viên</p>
      </div>
    </div>
  </div>
</header>
)

const AdminLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* 1. Sidebar */}
      <Sidebar />
      {/* 2. Main Content Area */}
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* Top Header */}
      <AdminHeader/>
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <Outlet/>
      </div>
    </main>
    </div>
  );
};

export default AdminLayout;
