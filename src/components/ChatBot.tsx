import React, { useState, useRef, useEffect } from 'react';
import {
    MessageOutlined,
    CloseOutlined,
    SendOutlined,
    RobotOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Spin } from 'antd';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-toastify';

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

const ChatBot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'model',
            text: 'Xin chào! Tôi là AI tư vấn viên của sân. Tôi có thể giúp gì cho bạn?',
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input.trim();
        setInput('');

        // Thêm thông báo người dùng vào giao diện người dùng
        const newMessages: ChatMessage[] = [...messages, { role: 'user', text: userMsg }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMsg,
                    history: messages.slice(1),
                }),
            });

            const data = await response.json();

            if (data.success) {
                setMessages((prev) => [...prev, { role: 'model', text: data.data.reply }]);
            } else {
                toast.error(data.message || 'Lỗi khi kết nối với AI');
                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'model',
                        text: 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau.',
                    },
                ]);
            }
        } catch (error) {
            console.error('Lỗi chat:', error);
            toast.error('Không thể kết nối đến máy chủ');
            setMessages((prev) => [
                ...prev,
                {
                    role: 'model',
                    text: 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau.',
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <div className='fixed bottom-6 right-6 z-50'>
            {/* Chat button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className='w-14 h-14 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 relative group'
                >
                    <MessageOutlined className='text-2xl' />
                    <span className='absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse'>
                        Mới
                    </span>
                    <div className='absolute right-full mr-4 bg-white text-gray-800 text-sm py-1.5 px-3 rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-medium'>
                        Chat với AI
                    </div>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className='bg-white dark:bg-gray-900 w-[350px] sm:w-[400px] h-[550px] rounded-2xl shadow-2xl flex flex-col border border-gray-100 dark:border-gray-800 overflow-hidden transform origin-bottom-right transition-all duration-300'>
                    {/* Header */}
                    <div className='bg-gradient-to-r from-emerald-500 to-green-600 p-4 flex justify-between items-center text-white'>
                        <div className='flex items-center gap-3'>
                            <div className='w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm'>
                                <RobotOutlined className='text-xl' />
                            </div>
                            <div>
                                <h3 className='font-bold text-base leading-tight'>AI Coach</h3>
                                <div className='flex items-center gap-1.5 mt-0.5'>
                                    <span className='w-2 h-2 bg-green-300 rounded-full animate-pulse'></span>
                                    <span className='text-[11px] font-medium text-green-100'>
                                        Trực tuyến
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors'
                        >
                            <CloseOutlined className='text-sm' />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className='flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/50'>
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`flex max-w-[85%] gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    {/* Avatar */}
                                    <div
                                        className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center mt-1 shadow-sm ${msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}
                                    >
                                        {msg.role === 'user' ? (
                                            <UserOutlined className='text-xs' />
                                        ) : (
                                            <RobotOutlined className='text-xs' />
                                        )}
                                    </div>

                                    {/* Bubble */}
                                    <div
                                        className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                                            msg.role === 'user'
                                                ? 'bg-blue-600 text-white rounded-tr-sm'
                                                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-tl-sm'
                                        }`}
                                    >
                                        {msg.role === 'user' ? (
                                            <p className='whitespace-pre-wrap'>{msg.text}</p>
                                        ) : (
                                            <div className='prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:my-1 prose-ul:my-1 prose-li:my-0.5'>
                                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className='flex justify-start'>
                                <div className='flex gap-2'>
                                    <div className='w-7 h-7 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mt-1'>
                                        <RobotOutlined className='text-xs' />
                                    </div>
                                    <div className='bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-tl-sm border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-1'>
                                        <span
                                            className='w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce'
                                            style={{ animationDelay: '0ms' }}
                                        ></span>
                                        <span
                                            className='w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce'
                                            style={{ animationDelay: '150ms' }}
                                        ></span>
                                        <span
                                            className='w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce'
                                            style={{ animationDelay: '300ms' }}
                                        ></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className='p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800'>
                        <div className='flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-full border border-gray-200 dark:border-gray-700 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all'>
                            <input
                                type='text'
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder='Hỏi tôi về sân và thiết bị...'
                                className='flex-1 bg-transparent px-3 py-2 text-sm outline-none dark:text-gray-200 placeholder-gray-400'
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                    input.trim() && !isLoading
                                        ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                {isLoading ? (
                                    <Spin size='small' />
                                ) : (
                                    <SendOutlined className='text-sm -ml-0.5' />
                                )}
                            </button>
                        </div>
                        <div className='text-center mt-2'>
                            <span className='text-[10px] text-gray-400 font-medium'>
                                Được hỗ trợ bởi AI - Câu trả lời có thể mang tính chất tham khảo
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatBot;
