import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { useTheme } from '../context/ThemeContext';
import Footer from '../components/Footer';
import AIChatWidget from '../components/ai/AIChatWidget';
import DevModeFAB from '../components/ai/debugger/DevModeFAB';
import DebuggerDrawer from '../components/ai/debugger/DebuggerDrawer';
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  Menu,
  X,
  ChevronsLeft,
  ChevronsRight,
  PieChart,
  User as UserIcon,
  Moon,
  Sun,
  Shield,
  Bell,
  MoreVertical,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { cn } from '../utils/cn';

const MainLayout = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showTopProfileMenu, setShowTopProfileMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [totalUnread, setTotalUnread] = useState(0);
  const [unreadItems, setUnreadItems] = useState([]);
  const { theme, toggleTheme } = useTheme();

  const profileMenuRef = useRef(null);
  const topProfileMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);

  const fetchTotalUnread = async () => {
    try {
      const res = await api.get('/chat/unread-counts');
      if (res.data) {
        if (typeof res.data.totalUnread === 'number') {
          setTotalUnread(res.data.totalUnread);
        }
        if (Array.isArray(res.data.items)) {
          setUnreadItems(res.data.items);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchTotalUnread();

    const handleUnreadEvent = () => fetchTotalUnread();
    window.addEventListener('smartsplit_chat_unread_update', handleUnreadEvent);
    window.addEventListener('smartsplit_chat_read_update', handleUnreadEvent);

    return () => {
      window.removeEventListener('smartsplit_chat_unread_update', handleUnreadEvent);
      window.removeEventListener('smartsplit_chat_read_update', handleUnreadEvent);
    };
  }, []);

  // Resize listener for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMobileOpen(false); // Close mobile drawer when resizing to desktop
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (topProfileMenuRef.current && !topProfileMenuRef.current.contains(event.target)) {
        setShowTopProfileMenu(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target)) {
        setShowNotificationMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const sidebarWidth = collapsed && !isMobile ? 'md:w-20 w-64' : 'w-72 md:w-64';

  const menuItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Groups', path: '/groups', icon: Users },
    { name: 'Friends', path: '/friends', icon: UserIcon },
    { name: 'Analytics', path: '/reports', icon: PieChart },
    ...(user?.role === 'admin' ? [{ name: 'Admin Panel', path: '/admin/dashboard', icon: Shield }] : []),
  ];

  return (
    <div className={cn(
      'h-screen overflow-hidden flex flex-col transition-colors duration-500 font-sans',
      theme === 'dark' ? 'bg-[#0a0a0a] text-slate-200' : 'bg-[#fafafa] text-slate-900'
    )}>
      <div className="flex flex-1 overflow-hidden relative">
        {/* SIDEBAR */}
        <motion.aside 
          drag={isMobile ? "x" : false}
          dragConstraints={{ left: -300, right: 0 }}
          dragElastic={0.1}
          onDragEnd={(e, { offset, velocity }) => {
            if (offset.x < -100 || velocity.x < -500) {
              setMobileOpen(false);
            }
          }}
          className={cn(
            "hidden md:flex inset-y-0 left-0 z-40 h-full flex-col border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#111111] transition-all duration-300 md:static md:translate-x-0 md:shadow-none",
            sidebarWidth
          )}
        >
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 dark:border-white/5 shrink-0">
            {(!collapsed || isMobile) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2.5">
                <img src="/logo.png" alt="SmartSplit" className="h-7 w-auto object-contain" />
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">SmartSplit</span>
              </motion.div>
            )}
            <div className="flex items-center ml-auto">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-1.5 rounded-lg hidden md:flex text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
              </button>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg flex md:hidden text-slate-400 hover:text-slate-800"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Nav Items */}
          <div className="flex-1 overflow-y-auto py-6 px-3 no-scrollbar flex flex-col gap-1">
            {menuItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg transition-all duration-200 relative text-sm font-medium",
                    isActive 
                      ? "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white" 
                      : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                  )}
                  title={collapsed && !isMobile ? item.name : undefined}
                >
                  <item.icon size={18} className={cn(
                    "shrink-0 transition-transform duration-200",
                    isActive ? "text-primary-600 dark:text-white" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                  )} />
                  {(!collapsed || isMobile) && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </div>

          {/* Footer - User Profile */}
          <div className="p-3 border-t border-slate-100 dark:border-white/5 shrink-0 relative" ref={profileMenuRef}>
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={cn(
                "flex items-center gap-3 w-full p-2 rounded-lg transition-all hover:bg-slate-50 dark:hover:bg-white/5",
                (collapsed && !isMobile) ? "justify-center" : "justify-start text-left"
              )}
            >
              <div className="relative shrink-0">
                <img src={user?.avatar} alt={user?.name} className="w-8 h-8 md:w-9 md:h-9 rounded-full border border-slate-200 dark:border-slate-700 object-cover" />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 border-2 border-white dark:border-[#111111] rounded-full"></div>
              </div>
              {(!collapsed || isMobile) && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <MoreVertical size={16} className="text-slate-400 shrink-0" />
                </>
              )}
            </button>
            
            {/* Sidebar Profile Dropdown Menu */}
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 shadow-xl rounded-xl overflow-hidden z-50"
                >
                  <div className="p-1">
                    <Link 
                      to="/profile" 
                      onClick={() => { setShowProfileMenu(false); handleNavClick(); }}
                      className="flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <UserIcon size={16} />
                      Profile
                    </Link>
                    <button 
                      onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-white dark:bg-transparent">
          
          {/* Top Navbar */}
          <header className="h-16 shrink-0 flex items-center justify-between px-4 md:px-8 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#111111]/80 backdrop-blur-xl z-30 sticky top-0">
            <div className="flex items-center gap-2 md:gap-3">
              {/* Logo on mobile header */}
              <div className="flex md:hidden items-center gap-2 mr-2">
                <img src="/logo.png" alt="SmartSplit" className="h-7 w-auto object-contain" />
              </div>

              <div className="hidden md:block">
                 <h2 className="text-fluid-p font-semibold text-slate-800 dark:text-slate-200 capitalize tracking-wide">{location.pathname.split('/')[1] || 'Overview'}</h2>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
              <button
                onClick={toggleTheme}
                className="p-2 md:p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 transition-colors"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              
              {/* Top Navbar Notification Bell Dropdown */}
              <div className="relative" ref={notificationMenuRef}>
                <button 
                  onClick={() => setShowNotificationMenu(!showNotificationMenu)}
                  title={totalUnread > 0 ? `${totalUnread} unread message(s)` : 'Notifications'}
                  className="p-2 md:p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 transition-colors relative"
                >
                  <Bell size={20} />
                  {totalUnread > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 px-1.5 py-0.2 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white dark:border-[#111111] flex items-center justify-center animate-pulse shadow-xs">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  ) : (
                    <span className="absolute top-1.5 md:top-2 right-1.5 md:right-2 w-2 h-2 md:w-2.5 md:h-2.5 bg-slate-300 dark:bg-slate-700 rounded-full border-2 border-white dark:border-[#111111]"></span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotificationMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden z-50"
                    >
                      {/* Dropdown Header */}
                      <div className="p-3.5 px-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2">
                          <Bell size={16} className="text-primary-500" />
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white">Notifications</span>
                          {totalUnread > 0 && (
                            <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-extrabold rounded-full">
                              {totalUnread} new
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setShowNotificationMenu(false);
                            navigate('/friends');
                          }}
                          className="text-[11px] font-extrabold text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          Friends Chat →
                        </button>
                      </div>

                      {/* Dropdown Body - Notification Items */}
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                        {unreadItems.length > 0 ? (
                          unreadItems.map((item) => {
                            const timeString = item.timestamp
                              ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '';

                            return (
                              <div
                                key={item.senderId}
                                onClick={() => {
                                  setShowNotificationMenu(false);
                                  navigate(`/friends?activeChat=${item.senderId}`);
                                  window.dispatchEvent(new CustomEvent('smartsplit_chat_read_update'));
                                }}
                                className="p-3 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors flex items-center gap-3 relative group"
                              >
                                {/* Sender Avatar */}
                                <div className="relative shrink-0">
                                  <img
                                    src={item.senderAvatar}
                                    alt={item.senderName}
                                    className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                                  />
                                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 ring-2 ring-white dark:ring-[#1a1a1a] rounded-full" />
                                </div>

                                {/* Notification Text details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                                      {item.senderName}
                                    </h4>
                                    {timeString && (
                                      <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-2">
                                        {timeString}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">
                                    {item.lastMessage}
                                  </p>
                                </div>

                                {/* Unread Badge Pill */}
                                <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-extrabold rounded-full shrink-0 shadow-2xs">
                                  {item.count}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
                            <CheckCircle2 size={32} className="text-emerald-500 mb-2 opacity-80" />
                            <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300">All caught up!</p>
                            <p className="text-[11px] font-medium text-slate-400 mt-0.5">No unread chat notifications right now.</p>
                          </div>
                        )}
                      </div>

                      {/* Dropdown Footer */}
                      <div className="p-2.5 bg-slate-50/60 dark:bg-slate-900/50 border-t border-slate-100 dark:border-white/10 text-center">
                        <button
                          onClick={() => {
                            setShowNotificationMenu(false);
                            navigate('/friends');
                          }}
                          className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors w-full py-1"
                        >
                          Open All Chats in Friends Workspace
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-white/10 mx-1 md:mx-2" />

              {/* Top Navbar Profile Dropdown */}
              <div className="relative" ref={topProfileMenuRef}>
                <button 
                  onClick={() => setShowTopProfileMenu(!showTopProfileMenu)}
                  className="flex items-center gap-2 p-1 md:pl-1.5 md:pr-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors border border-transparent dark:hover:border-white/10"
                >
                  <img src={user?.avatar} alt={user?.name} className="w-8 h-8 md:w-8 md:h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover" />
                  <span className="hidden lg:block text-sm font-semibold text-slate-700 dark:text-slate-200">{user?.name?.split(' ')[0]}</span>
                </button>
                
                <AnimatePresence>
                  {showTopProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 shadow-xl rounded-xl overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-slate-100 dark:border-white/10">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                      </div>
                      <div className="p-1.5">
                        <Link 
                          to="/profile" 
                          onClick={() => setShowTopProfileMenu(false)}
                          className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <UserIcon size={16} />
                          Profile
                        </Link>
                        <button 
                          onClick={() => { setShowTopProfileMenu(false); handleLogout(); }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors text-left"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6 lg:p-8">
            <div className="max-w-[1920px] mx-auto flex flex-col min-h-full">
              <div className="flex-1 pb-16 md:pb-10">
                {children}
              </div>
              <Footer />
            </div>
          </main>
        </div>

          {/* Mobile Bottom Navigation */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-[#111111]/90 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 pb-2 pt-2 px-2 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-around">
              {menuItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-[64px]",
                      isActive 
                        ? "text-primary-600 dark:text-primary-400" 
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    )}
                  >
                    <item.icon size={isActive ? 24 : 22} className={cn("mb-1 transition-all", isActive && "transform scale-110 stroke-[2.5px]")} />
                    <span className="text-[10px] font-bold tracking-wide">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
        
        {/* Global AI Chat Assistant */}
        <AIChatWidget />

        {/* Global AI Developer Mode */}
        <DevModeFAB />
        <DebuggerDrawer />
      </div>
  );
};

export default MainLayout;
