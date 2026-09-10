import React, { useState } from 'react';
import { MoreVertical, ChevronDown, Check, Info, FileSearch, ShieldAlert, BadgeCheck, Eye, Trash2, CheckCircle2, Clock, XCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

const MethodBadge = ({ method }) => {
  const methods = {
    'upi': 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200/50 dark:border-purple-500/20',
    'bank': 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20',
    'cash': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20',
    'wallet': 'bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400 border-pink-200/50 dark:border-pink-500/20',
  };
  const colorClass = methods[method?.toLowerCase()] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200/50 dark:border-slate-700/50';
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider", colorClass)}>
      {method || 'Unknown'}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  if (status === 'completed') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20 uppercase tracking-wider"><CheckCircle2 size={10}/>Completed</span>;
  if (status === 'rejected' || status === 'failed') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/20 uppercase tracking-wider"><XCircle size={10}/>{status}</span>;
  if (status === 'disputed') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20 uppercase tracking-wider"><ShieldAlert size={10}/>Disputed</span>;
  
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20 uppercase tracking-wider"><Clock size={10}/>Pending</span>;
};

const SettlementsTable = ({ settlements, selectedSettlements, setSelectedSettlements, onRowClick, onForceComplete, onReject, onFlag, onDelete }) => {
  const [activeMenuId, setActiveMenuId] = useState(null);

  const toggleSelectAll = () => {
    if (selectedSettlements.length === settlements.length) {
      setSelectedSettlements([]);
    } else {
      setSelectedSettlements(settlements.map(s => s._id));
    }
  };

  const toggleSelectSettlement = (e, id) => {
    e.stopPropagation();
    if (selectedSettlements.includes(id)) {
      setSelectedSettlements(selectedSettlements.filter(settlementId => settlementId !== id));
    } else {
      setSelectedSettlements([...selectedSettlements, id]);
    }
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  return (
    <div className="bg-white dark:bg-[#16181d] rounded-[2rem] border border-slate-200 dark:border-slate-800/60 shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto w-full">
        <table className="w-full min-w-[1100px] text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800/60">
              <th className="py-4 pl-6 pr-3 sticky left-0 z-10 bg-slate-50/50 dark:bg-slate-900/40 w-12">
                <div 
                  className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors",
                    selectedSettlements.length === settlements.length && settlements.length > 0 
                      ? "bg-blue-600 border-blue-600 text-white" 
                      : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-transparent"
                  )}
                  onClick={toggleSelectAll}
                >
                  <Check size={14} />
                </div>
              </th>
              <th className="py-4 px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-600 flex items-center gap-1">
                Settlement ID <ChevronDown size={14} />
              </th>
              <th className="py-4 px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Financial Flow (From → To)
              </th>
              <th className="py-4 px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Workspace
              </th>
              <th className="py-4 px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Method
              </th>
              <th className="py-4 px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">
                Amount
              </th>
              <th className="py-4 px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                Status
              </th>
              <th className="py-4 px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden lg:table-cell text-right">
                Initiated
              </th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {settlements.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <FileSearch size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-bold">No settlements found</p>
                    <p className="text-xs mt-1">Try adjusting your filters or search query.</p>
                  </div>
                </td>
              </tr>
            ) : (
              settlements.map((settlement) => {
                const isSelected = selectedSettlements.includes(settlement._id);
                const isLargeAmount = settlement.amount > 20000;
                
                return (
                  <tr 
                    key={settlement._id} 
                    onClick={() => onRowClick(settlement)}
                    className={cn(
                      "group cursor-pointer transition-colors",
                      isSelected 
                        ? "bg-blue-50/50 dark:bg-blue-500/5" 
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40",
                      settlement.isFlagged && !isSelected && "bg-rose-50/20 dark:bg-rose-500/5"
                    )}
                  >
                    <td className="py-3 pl-6 pr-3 sticky left-0 z-10" onClick={(e) => e.stopPropagation()}>
                      <div 
                        className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors mt-2",
                          isSelected 
                            ? "bg-blue-600 border-blue-600 text-white" 
                            : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-transparent hover:border-slate-400"
                        )}
                        onClick={(e) => toggleSelectSettlement(e, settlement._id)}
                      >
                        <Check size={14} />
                      </div>
                    </td>
                    
                    <td className="py-3 px-3">
                      <div className="flex flex-col max-w-[150px]">
                        <span className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">
                          {settlement._id.substring(0, 8).toUpperCase()}...
                        </span>
                        <div className="mt-1">
                          {settlement.isFlagged ? (
                             <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500"><ShieldAlert size={10}/> Flagged</span>
                          ) : (
                             <span className="text-[10px] text-slate-500 truncate">{settlement.note || 'No note'}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <img 
                            src={settlement.payerId?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(settlement.payerId?.name || 'User')}&background=random`} 
                            alt={settlement.payerId?.name} 
                            className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                          />
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-1 max-w-[60px] truncate" title={settlement.payerId?.name}>{settlement.payerId?.name || 'Unknown'}</span>
                        </div>
                        
                        <ArrowRight size={14} className="text-slate-300 dark:text-slate-600 mb-4" />
                        
                        <div className="flex flex-col items-center">
                          <img 
                            src={settlement.receiverId?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(settlement.receiverId?.name || 'User')}&background=random`} 
                            alt={settlement.receiverId?.name} 
                            className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                          />
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-1 max-w-[60px] truncate" title={settlement.receiverId?.name}>{settlement.receiverId?.name || 'Unknown'}</span>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-3 px-3">
                      <div className="flex flex-col max-w-[150px]">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{settlement.groupId?.name || 'Unknown Group'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <MethodBadge method={settlement.paymentType} />
                    </td>
                    
                    <td className="py-3 px-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className={cn(
                          "text-sm font-black",
                          isLargeAmount ? "text-indigo-600 dark:text-indigo-400" : "text-slate-900 dark:text-white"
                        )}>
                          ₹{settlement.amount.toLocaleString()}
                        </span>
                        <div className="w-16 h-1 mt-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", isLargeAmount ? "bg-indigo-500" : "bg-slate-400")} style={{ width: `${Math.min((settlement.amount / 50000) * 100, 100)}%` }} />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={settlement.status} />
                    </td>
                    
                    <td className="py-3 px-3 hidden lg:table-cell text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
                          {new Date(settlement.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 uppercase">
                          {new Date(settlement.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    
                    <td className="py-3 px-6 text-right relative" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={(e) => toggleMenu(e, settlement._id)}
                        className={cn(
                          "p-2 rounded-xl transition-colors",
                          activeMenuId === settlement._id 
                            ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white" 
                            : "text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:text-slate-200 dark:hover:bg-slate-800"
                        )}
                      >
                        <MoreVertical size={16} />
                      </button>
                      
                      <AnimatePresence>
                        {activeMenuId === settlement._id && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.1 }}
                            className="absolute right-6 top-10 w-48 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-xl border border-slate-200 dark:border-slate-700/60 z-50 overflow-hidden py-1"
                          >
                            <button onClick={() => { onRowClick(settlement); setActiveMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left cursor-pointer">
                              <Info size={14} /> View Details
                            </button>
                            {(settlement.status === 'pending' || settlement.status === 'disputed') && (
                              <>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onForceComplete && onForceComplete(settlement._id);
                                    setActiveMenuId(null);
                                  }} 
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-500 dark:hover:bg-emerald-500/10 transition-colors text-left cursor-pointer"
                                >
                                  <BadgeCheck size={14} /> Force Complete
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onReject && onReject(settlement._id);
                                    setActiveMenuId(null);
                                  }} 
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-500 dark:hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                                >
                                  <XCircle size={14} /> Reject Request
                                </button>
                              </>
                            )}
                            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onFlag && onFlag(settlement._id, settlement.isFlagged);
                                setActiveMenuId(null);
                              }} 
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-500/10 transition-colors text-left cursor-pointer"
                            >
                              <ShieldAlert size={14} /> {settlement.isFlagged ? 'Unflag' : 'Flag'} Record
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete && onDelete(settlement._id);
                                setActiveMenuId(null);
                              }} 
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-500 dark:hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                            >
                              <Trash2 size={14} /> Delete Record
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Click outside to close menu overlay */}
      {activeMenuId && (
        <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
      )}
    </div>
  );
};

export default SettlementsTable;
