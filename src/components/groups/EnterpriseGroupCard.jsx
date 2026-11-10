import React, { memo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { MoreVertical, Users, MapPin, Calendar, ArrowRight, Edit2, Trash2, FileText } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatCurrency, getCategoryColor } from '../../utils/groupFormatters';

const EnterpriseGroupCard = memo(({ group, viewMode, onEdit, onDelete, currentUser }) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const spent = group.summary?.totalExpense || 0;
  const budget = group.budget || 0; 
  const progress = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  
  const isHealthy = progress < 80;
  const isWarning = progress >= 80 && progress < 100;

  const isCreator = group.createdBy?._id === currentUser?._id || group.createdBy === currentUser?._id;
  const isAdmin = group.members?.some(m => 
    (m.user?._id === currentUser?._id || m.user === currentUser?._id) && m.role === 'admin'
  );
  const hasPermission = isCreator || isAdmin;

  const handleCardClick = (e) => {
    // Navigate only if not clicking on menu elements
    if (!menuRef.current?.contains(e.target)) {
      navigate(`/group/${group._id}`);
    }
  };
  
  const DropdownMenu = () => (
    <div ref={menuRef} className="relative z-20">
      <button 
        className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-white/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
      >
        <MoreVertical size={16} />
      </button>
      <AnimatePresence>
        {showMenu && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-1.5"
          >
            <button 
              disabled={!hasPermission}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if(!hasPermission) return;
                setShowMenu(false);
                if(onEdit) onEdit(group);
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between",
                hasPermission 
                  ? "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50" 
                  : "text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60"
              )}
            >
              <span className="flex items-center gap-2"><Edit2 size={14} /> Edit</span>
              {!hasPermission && <span className="text-[9px] font-medium uppercase text-slate-400">Admin Only</span>}
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMenu(false);
                navigate(`/reports?groupId=${group._id}`);
              }}
              className="w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
            >
              <span className="flex items-center gap-2"><FileText size={14} /> View Report</span>
            </button>
            <button 
              disabled={!hasPermission}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if(!hasPermission) return;
                setShowMenu(false);
                if(onDelete) onDelete(group);
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between",
                hasPermission 
                  ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10" 
                  : "text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60"
              )}
            >
              <span className="flex items-center gap-2"><Trash2 size={14} /> Delete</span>
              {!hasPermission && <span className="text-[9px] font-medium uppercase text-slate-400">Admin Only</span>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
  
  if (viewMode === 'list') {
    return (
      <div onClick={handleCardClick} className="block cursor-pointer">
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-[#16181d] p-4 rounded-xl border border-slate-200 dark:border-slate-800/60 hover:shadow-lg transition-all flex items-center justify-between gap-4 group/card relative overflow-visible"
        >
          <div className="absolute inset-y-0 left-0 w-1 bg-primary-500 opacity-0 group-hover/card:opacity-100 transition-opacity" />
          
          <div className="flex items-center gap-4 flex-1">
            <div className={cn("px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border", getCategoryColor(group.category))}>
              {group.category}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{group.name}</h3>
              <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="flex items-center gap-1"><MapPin size={12}/> {group.country || 'Global'}</span>
                <span className="flex items-center gap-1"><Users size={12}/> {group.members?.length || 0} Members</span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex flex-1 items-center gap-3 px-4">
            <div className="flex-1 max-w-[200px]">
              <div className="flex justify-between text-[10px] font-bold mb-1.5">
                <span className="text-slate-500 uppercase tracking-widest">Spent {budget > 0 ? progress.toFixed(0) : 0}%</span>
                <span className="text-slate-900 dark:text-white">{formatCurrency(spent)} {budget > 0 && <span className="text-slate-400">/ {formatCurrency(budget)}</span>}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all duration-500", 
                    budget > 0 ? (isHealthy ? "bg-emerald-500" : isWarning ? "bg-orange-500" : "bg-rose-500") : "bg-primary-500"
                  )} 
                  style={{ width: budget > 0 ? `${progress}%` : (spent > 0 ? '100%' : '0%') }} 
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="flex -space-x-2">
              {group.members?.slice(0, 3).map((member, i) => (
                <img key={i} src={member.user?.avatar || `https://ui-avatars.com/api/?name=${member.user?.name}`} className="w-7 h-7 rounded-full border-2 border-white dark:border-[#16181d]" alt="avatar" />
              ))}
              {(group.members?.length || 0) > 3 && (
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-[#16181d] flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-400">
                  +{(group.members?.length || 0) - 3}
                </div>
              )}
            </div>
            
            <DropdownMenu />
          </div>
        </motion.div>
      </div>
    );
  }

  // Grid View
  return (
    <div onClick={handleCardClick} className="block h-full cursor-pointer">
      <motion.div
        whileHover={{ y: -4 }}
        className="bg-white dark:bg-[#16181d] rounded-2xl border border-slate-200 dark:border-slate-800/60 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/50 transition-all flex flex-col h-full group/card relative overflow-visible"
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary-500 to-primary-600 opacity-0 group-hover/card:opacity-100 transition-opacity" />
        
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-3">
            <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border", getCategoryColor(group.category))}>
              {group.category}
            </span>
            <DropdownMenu />
          </div>
          
          <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white line-clamp-1 mb-1">{group.name}</h3>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 flex-1">
            {group.description || "No description provided for this group."}
          </p>

          <div className="space-y-4 mt-auto">
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-1.5 text-slate-500">
                <MapPin size={14} className="text-slate-400" />
                {group.country || 'Global'}
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar size={14} className="text-slate-400" />
                {new Date(group.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800/50">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Budget Spent</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(spent)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{budget > 0 ? 'Remaining' : 'Total Budget'}</p>
                  <p className="text-sm font-bold text-slate-500">{budget > 0 ? formatCurrency(Math.max(0, budget - spent)) : 'Not Set'}</p>
                </div>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all duration-1000", 
                    budget > 0 ? (isHealthy ? "bg-emerald-500" : isWarning ? "bg-orange-500" : "bg-rose-500") : "bg-primary-500"
                  )} 
                  style={{ width: budget > 0 ? `${progress}%` : (spent > 0 ? '100%' : '0%') }} 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {group.members?.slice(0, 3).map((member, i) => (
                <img key={i} src={member.user?.avatar || `https://ui-avatars.com/api/?name=${member.user?.name}`} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#16181d] shadow-sm" alt="avatar" />
              ))}
              {(group.members?.length || 0) > 3 && (
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-[#16181d] flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-400 shadow-sm">
                  +{(group.members?.length || 0) - 3}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 group-hover/card:translate-x-1 transition-transform">
            Open <ArrowRight size={14} />
          </div>
        </div>
      </motion.div>
    </div>
  );
});

export default EnterpriseGroupCard;
