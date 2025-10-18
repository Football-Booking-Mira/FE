import { CalendarCheck, Goal, Home, LogOut, Users, Wallet } from 'lucide-react';
import React from 'react'


const Sidebar: React.FC = () => {
  const navItems = [
    {name: 'Dashboard', icon: Home, current: true},
    {name: 'Quản lý sân bóng', icon: Goal, current: false},
    {name: 'Quản lý đặt lịch', icon: CalendarCheck, current: false},
    {name: 'Quản lý người dùng', icon: Users, current: false},
    {name: 'Quản lý thanh toán', icon: Wallet, current: false},

  ];

  return (
    <div className="flex flex-col w-64 h-full bg-white shadow-lg p-4 border-r border-gray-100">
      {/*logo*/}
      <div className="flex items-center space-x-2 mb-8 mt-2 p-2">
        <img src="https://i.postimg.cc/Vvs2kC5C/Chat-GPT-Image-20-12-50-18-thg-10-2025.png
" alt="Admin Avatar" className="w-15 h-15 rounded-full object-cover" />
        <span className="text-xl font-bold text-gray-800">Football Boking Mira</span>
      </div>
      {/*Nav Items*/}
    <nav className="flex-grow">
      <ul className="space-y-2">
        {navItems.map((item) => (
          <li key={item.name}>
            <a href="" className= {`flex items-center space-x-3 p-3 rounded-lg transition-colors duration-200
              ${item.current ? 'bg-green-100 text-green-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-green-600'}`}>
                <item.icon className="w-5 h-5"/>
                <span>{item.name}</span>
              </a>
          </li>
        ))}
      </ul>
    </nav>
    {/*logout*/}
    <div className="pt-4 border-t border-gray-100">
      <a href="" className="flex items-center space-x-3 p-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors duration-200">
        <LogOut className="w-5 h-5" />
        <span>Đăng xuất</span>
      </a>
    </div>
    </div>
  );
};


export default Sidebar;