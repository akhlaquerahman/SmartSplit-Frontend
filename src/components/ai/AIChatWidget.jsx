import React, { useState, useRef } from 'react';
import useAIChatStore from '../../store/useAIChatStore';
import AIChatWindow from './AIChatWindow';
import { motion } from 'framer-motion';

const AIChatWidget = () => {
  const { isOpen, isSidebarOpen, isFullScreen, toggleChat } = useAIChatStore();
  const isDraggingRef = useRef(false);

  // Load persistent position from localStorage or default to origin
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('smartsplit_ai_btn_pos');
      return saved ? JSON.parse(saved) : { x: 0, y: 0 };
    } catch (e) {
      return { x: 0, y: 0 };
    }
  });

  const handleDragEnd = (event, info) => {
    if (Math.abs(info.offset.x) > 5 || Math.abs(info.offset.y) > 5) {
      isDraggingRef.current = true;
      const newPos = {
        x: position.x + info.offset.x,
        y: position.y + info.offset.y
      };
      setPosition(newPos);
      try {
        localStorage.setItem('smartsplit_ai_btn_pos', JSON.stringify(newPos));
      } catch (e) {}

      setTimeout(() => {
        isDraggingRef.current = false;
      }, 100);
    }
  };

  const handleButtonClick = (e) => {
    if (isDraggingRef.current) return;
    toggleChat();
  };

  const resetPosition = (e) => {
    e.stopPropagation();
    setPosition({ x: 0, y: 0 });
    try {
      localStorage.removeItem('smartsplit_ai_btn_pos');
    } catch (e) {}
  };

  return (
    <>
      {/* Floating Draggable Action Button */}
      {!isOpen && (
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0.05}
          onDragEnd={handleDragEnd}
          animate={{ x: position.x, y: position.y }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40 cursor-grab active:cursor-grabbing touch-none select-none group"
        >
          <button
            onClick={handleButtonClick}
            title="Click to open AI Chat • Drag to move anywhere"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-[0_8px_30px_rgb(99,102,241,0.4)] flex items-center justify-center text-white bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 hover:shadow-[0_8px_35px_rgb(139,92,246,0.6)] hover:scale-105 active:scale-95 transition-all duration-200 relative border border-white/20"
          >
            <span className="font-black text-lg sm:text-xl tracking-tight" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>AI</span>
            <span className="absolute top-0 right-0 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#16181d] animate-pulse"></span>
          </button>

          {/* Quick Reset Position Button on Hover when moved */}
          {(position.x !== 0 || position.y !== 0) && (
            <button
              onClick={resetPosition}
              title="Reset AI button to default bottom-right position"
              className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-slate-800 text-white text-[10px] font-bold rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border border-white/20 shadow-md hover:bg-slate-700"
            >
              ✕
            </button>
          )}
        </motion.div>
      )}

      {/* Chat Window Container */}
      {isOpen && (
        <div className={`fixed inset-0 z-[100] bg-white overflow-hidden flex flex-col transform transition-all duration-300 ${
          isFullScreen 
            ? 'w-full h-full' 
            : 'sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[380px] lg:w-[420px] sm:h-[calc(100vh-48px)] sm:max-h-[850px] sm:rounded-2xl shadow-2xl sm:border sm:border-gray-200 origin-bottom-right'
        }`}>
          <AIChatWindow />
        </div>
      )}
    </>
  );
};
export default AIChatWidget;