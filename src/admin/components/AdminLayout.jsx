import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Users,
  FolderOpen,
  Receipt,
  HandCoins,
  Flag,
  Bell,
  FileText,
  Menu,
  X,
  Shield,
  Moon,
  Sun,
  LogOut,
  Database,
  Search,
  Settings,
  ChevronDown,
  Activity,
  Server,
  Bot,
  MessageSquare,
  BookOpen,
  HelpCircle,
  Smile,
  Tags,
  Fingerprint,
  Brain,
  Edit3,
  Cpu,
  Wrench,
  Zap,
  Headphones,
  LineChart,
  ThumbsUp,
  ScrollText
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import useAuthStore from '../../store/useAuthStore';
import { cn } from '../../utils/cn';

const AdminLayout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const profileMenuRef = useRef(null);

  useEffect(() => {
    fetchUnreadNotificationsCount();
    const interval = setInterval(fetchUnreadNotificationsCount, 30000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const fetchUnreadNotificationsCount = async () => {
    try {
      const response = await api.get(`/admin/notifications?limit=1`);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {}
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuSections = [
    {
      title: 'Dashboard',
      items: [
        { path: '/admin/dashboard', icon: BarChart3, label: 'Overview' },
      ]
    },
    {
      title: 'Management',
      items: [
        { path: '/admin/users', icon: Users, label: 'Users' },
        { path: '/admin/groups', icon: FolderOpen, label: 'Groups' },
        { path: '/admin/expenses', icon: Receipt, label: 'Expenses' },
        { path: '/admin/settlements', icon: HandCoins, label: 'Settlements' },
      ]
    },
    {
      title: 'AI Studio',
      items: [
        { path: '/admin/ai-studio', icon: Bot, label: 'AI Dashboard' },
        { path: '/admin/ai-studio/conversations', icon: MessageSquare, label: 'Conversations' },
        { path: '/admin/ai-studio/knowledge', icon: BookOpen, label: 'Knowledge Base' },
        { path: '/admin/ai-studio/greetings-fallback', icon: HelpCircle, label: 'FastPath & FAQs' },
      ]
    },,
    {
      title: 'Monitoring',
      items: [
        { path: '/admin/logs', icon: FileText, label: 'System Logs' },
        ...(user?.isAppOwner ? [{ path: '/admin/database-explorer', icon: Database, label: 'Database' }] : []),
      ]
    }
  ];

  return (
    <div className={cn(
      "flex h-screen overflow-hidden transition-colors duration-500 font-sans text-sm",
      theme === 'dark' ? "bg-[#0a0a0a] text-slate-200" : "bg-[#f8fafc] text-slate-900"
    )}>
      
      {/* SIDEBAR */}
      <motion.aside 
        drag={window.innerWidth < 1024 ? "x" : false}
        dragConstraints={{ left: -300, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(e, { offset, velocity }) => {
          if (offset.x < -100 || velocity.x < -500) setMobileOpen(false);
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r shadow-2xl transition-all duration-300 ease-in-out lg:static lg:translate-x-0 lg:shadow-none",
          theme === 'dark' ? "bg-[#111111] border-white/10" : "bg-white border-slate-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className={cn(
          "flex items-center justify-between h-16 px-5 border-b shrink-0",
          theme === 'dark' ? "border-white/5" : "border-slate-100"
        )}>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight">Admin Panel</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-800">
            <X size={20} />
          </button>
        </div>

        {/* Sidebar Nav */}
        <div className="flex-1 overflow-y-auto py-5 px-3 no-scrollbar flex flex-col gap-6">
          {menuSections.map((section, idx) => (
            <div key={idx}>
              <p className="px-3 text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{section.title}</p>
              <div className="flex flex-col gap-1">
                {section.items.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => window.innerWidth < 1024 && setMobileOpen(false)}
                      className={cn(
                        "group flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 font-medium",
                        isActive 
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" 
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={18} className={cn(
                          "shrink-0 transition-transform duration-200",
                          isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300"
                        )} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-sm">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </motion.aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Top Header */}
        <header className={cn(
          "h-16 shrink-0 flex items-center justify-between px-4 lg:px-8 border-b z-30 sticky top-0 backdrop-blur-xl",
          theme === 'dark' ? "bg-[#111111]/80 border-white/5" : "bg-white/80 border-slate-200"
        )}>
          {/* Left: Mobile Toggle & Breadcrumb */}
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 lg:hidden text-slate-500">
              <Menu size={22} />
            </button>
            <div className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-500">
              <span>Admin</span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="text-slate-900 dark:text-white capitalize">{location.pathname.split('/').pop() || 'Dashboard'}</span>
            </div>
          </div>

          {/* Center: Global Search (Hidden on Mobile) */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search users, groups, logs (Press '/' to focus)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-9 pr-4 py-2 text-sm rounded-lg border outline-none transition-all focus:ring-2 focus:ring-blue-500/50",
                theme === 'dark' ? "bg-[#1a1a1a] border-slate-800 text-white placeholder:text-slate-500" : "bg-slate-50 border-slate-200 text-slate-900"
              )}
            />
          </div>

          {/* Right: Actions & Profile */}
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold mr-2 border border-emerald-100 dark:border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </div>
            
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 transition-colors">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-1 hidden sm:block" />

            <div className="relative" ref={profileMenuRef}>
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1 pl-2 pr-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors border border-transparent dark:hover:border-white/10"
              >
                <div className="flex flex-col items-end hidden sm:flex">
                  <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">Super Admin</span>
                  <span className="text-[10px] text-slate-500 font-medium">Workspace Owner</span>
                </div>
                <img src={user?.avatar || `https://ui-avatars.com/api/?name=Admin&background=2563eb&color=fff`} alt="Admin" className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover" />
                <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
              </button>
              
              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 shadow-xl rounded-xl overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-slate-100 dark:border-white/10">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name || 'Administrator'}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                    </div>
                    <div className="p-1.5">
                      <button className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                        <Settings size={16} />
                        Platform Settings
                      </button>
                      <button 
                        onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors text-left mt-1"
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-50/50 dark:bg-transparent">
          <div className="max-w-[1920px] mx-auto min-h-full">
            {children || <Outlet />}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden" 
            onClick={() => setMobileOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminLayout;