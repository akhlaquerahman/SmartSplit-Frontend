import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, FolderOpen, Users, Receipt, Calendar, ExternalLink, Settings, ShieldAlert, Archive, Trash2, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';

const StatusBadge = ({ health }) => {
  if (health === 'over_budget') return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/20 uppercase tracking-wider">Over Budget</span>;
  if (health === 'inactive') return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50 uppercase tracking-wider">Inactive</span>;
  if (health === 'archived') return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20 uppercase tracking-wider">Archived</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20 uppercase tracking-wider">Healthy</span>;
};

const EnterpriseGroupCard = ({ group, onClick, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Mock data for demonstration purposes if not present in DB
  const budget = group.budget || 25000;
  const spent = group.totalExpenses || Math.floor(Math.random() * 20000);
  const remaining = budget - spent;
  const progressPercent = Math.min((spent / budget) * 100, 100);
  
  let health = 'healthy';
  if (progressPercent >= 100) health = 'over_budget';
  else if (group.isArchived) health = 'archived';
  else if (group.members?.length === 0) health = 'inactive';

  const toggleMenu = (e) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-[#16181d] rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all group/card flex flex-col relative cursor-pointer"
      onClick={() => onClick(group)}
    >
      {/* Card Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50 uppercase tracking-wider">
              {group.category || 'General'}
            </span>
            <StatusBadge health={health} />
          </div>
          
          <div className="relative">
            <button 
              onClick={toggleMenu}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                menuOpen ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:text-slate-200 dark:hover:bg-slate-800"
              )}
            >
              <MoreVertical size={16} />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 top-8 w-48 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-xl border border-slate-200 dark:border-slate-700/60 z-40 overflow-hidden py-1"
                  >
                    <button onClick={(e) => { e.stopPropagation(); /* logic */ }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left">
                      <ExternalLink size={14} /> Open Workspace
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onClick(group); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left">
                      <Settings size={14} /> View Details
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/admin/reports?groupId=${group._id}`); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10 transition-colors text-left">
                      <FileText size={14} /> View Report
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                    <button onClick={(e) => { e.stopPropagation(); /* logic */ }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-500/10 transition-colors text-left">
                      <Archive size={14} /> Archive Group
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(group._id); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-500 dark:hover:bg-rose-500/10 transition-colors text-left">
                      <Trash2 size={14} /> Delete Group
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <h3 className="text-lg font-black text-slate-900 dark:text-white truncate mb-1">{group.name}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-4 h-4">
          {group.description || 'No description provided for this workspace.'}
        </p>

        {/* Owner Info */}
        <div className="flex items-center gap-2">
          <img 
            src={group.createdBy?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.createdBy?.name || 'Unknown')}&background=random`} 
            alt="Owner"
            className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700"
          />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Owner</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-tight truncate max-w-[150px]">{group.createdBy?.name || 'Unknown'}</span>
          </div>
        </div>
      </div>

      {/* Card Body - Budget & Members */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div className="mb-4">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Budget Utilization</p>
              <p className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1">
                ₹{spent.toLocaleString()} <span className="text-[10px] font-medium text-slate-400">/ ₹{budget.toLocaleString()}</span>
              </p>
            </div>
            <span className={cn(
              "text-[10px] font-bold",
              progressPercent >= 100 ? "text-rose-500" : progressPercent > 80 ? "text-amber-500" : "text-emerald-500"
            )}>
              {progressPercent.toFixed(1)}%
            </span>
          </div>
          
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                progressPercent >= 100 ? "bg-rose-500" : progressPercent > 80 ? "bg-amber-500" : "bg-emerald-500"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {progressPercent >= 100 && (
            <p className="text-[10px] font-bold text-rose-500 flex items-center gap-1 mt-1.5">
              <ShieldAlert size={10} /> Over budget by ₹{Math.abs(remaining).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex -space-x-2">
            {(group.members || []).slice(0, 4).map((member, i) => (
              <img 
                key={i}
                src={member.user?.avatar || member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user?.name || member.name || 'User')}&background=random`} 
                alt="Member"
                className="w-7 h-7 rounded-full border-2 border-white dark:border-[#16181d] z-10 hover:z-20 transition-all cursor-pointer"
                title={member.user?.name || member.name}
              />
            ))}
            {(group.members?.length || 0) > 4 && (
              <div className="w-7 h-7 rounded-full border-2 border-white dark:border-[#16181d] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-400 z-0">
                +{(group.members.length - 4)}
              </div>
            )}
            {(group.members?.length || 0) === 0 && (
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Members</span>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <Calendar size={12} /> {new Date(group.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EnterpriseGroupCard;
