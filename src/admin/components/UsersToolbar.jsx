import React from 'react';
import { Search, Filter, SlidersHorizontal, Download, Upload, UserPlus, Mail, RotateCcw, UserCheck, ShieldAlert } from 'lucide-react';
import { cn } from '../../utils/cn';

const UsersToolbar = ({ search, setSearch, status, setStatus, role, setRole, selectedCount, onBulkAction, onReset }) => {
  return (
    <div className="flex flex-col gap-4 mb-6 relative z-20">

      {/* Filter Row */}
      <div className={cn(
        "flex flex-col md:flex-row items-center justify-between gap-4 p-3 rounded-2xl border shadow-sm transition-all duration-300",
        selectedCount > 0 
          ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20" 
          : "bg-white dark:bg-[#16181d] border-slate-200 dark:border-slate-800/60"
      )}>
        
        {selectedCount > 0 ? (
          // Bulk Actions Toolbar
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 px-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-600 text-white text-xs font-bold">
                {selectedCount}
              </span>
              <span className="text-sm font-bold text-blue-900 dark:text-blue-300">users selected</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={() => onBulkAction('verify')} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5">
                <UserCheck size={14} className="text-emerald-500" /> Verify
              </button>
              <button onClick={() => onBulkAction('suspend')} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-amber-500" /> Suspend
              </button>
              <button onClick={() => onBulkAction('email')} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5">
                <Mail size={14} className="text-blue-500" /> Email
              </button>
              <div className="w-px h-5 bg-blue-200 dark:bg-blue-500/30 mx-1" />
              <button onClick={() => onBulkAction('delete')} className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors">
                Delete
              </button>
            </div>
          </div>
        ) : (
          // Standard Search & Filters
          <>
            <div className="relative flex-1 w-full md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all"
              />
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
              <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50 shrink-0">
                <Filter size={14} className="text-slate-400" />
                <select
                  value={role || 'all'}
                  onChange={(e) => setRole(e.target.value)}
                  className="bg-transparent text-slate-700 dark:text-slate-300 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admins</option>
                  <option value="user">Users</option>
                </select>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50 shrink-0">
                <SlidersHorizontal size={14} className="text-slate-400" />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="bg-transparent text-slate-700 dark:text-slate-300 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="unverified">Unverified</option>
                </select>
              </div>
              
              <button
                type="button"
                onClick={onReset}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors shrink-0"
                title="Reset Filters"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UsersToolbar;
