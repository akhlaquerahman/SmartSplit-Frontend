import React, { useState } from 'react';
import { X, Users, Receipt, Calendar, Activity, Shield, ArrowRight, Download, CheckCircle2, ShieldAlert, XCircle, FileClock, History, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

const SettlementDrawer = ({ settlement, isOpen, onClose, onForceComplete, onReject }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [ownerCompletionReason, setOwnerCompletionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !settlement) return null;

  const handleForceComplete = async () => {
    if (!onForceComplete) return;
    setSubmitting(true);
    try {
      await onForceComplete(settlement._id, ownerCompletionReason);
      setOwnerCompletionReason('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectAction = async () => {
    if (!onReject) return;
    setSubmitting(true);
    try {
      await onReject(settlement._id, ownerCompletionReason);
      setOwnerCompletionReason('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-0"
        />
        
        {/* Drawer Panel */}
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-[550px] h-full bg-white dark:bg-[#16181d] border-l border-slate-200 dark:border-slate-800 shadow-2xl relative z-10 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/20">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Settlement Audit</h2>
              <p className="text-[10px] font-bold text-slate-500 font-mono mt-1 uppercase tracking-widest">ID: {settlement._id}</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Hero Section */}
          <div className="p-6 pb-0 flex flex-col items-center border-b border-slate-100 dark:border-slate-800/60 bg-gradient-to-b from-transparent to-slate-50/50 dark:to-slate-900/20">
            <div className="mb-2">
              <span className={cn(
                "px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest border",
                settlement.status === 'completed' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20" :
                settlement.status === 'rejected' || settlement.status === 'failed' ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200/50 dark:border-rose-500/20" :
                settlement.status === 'disputed' ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20" :
                "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20"
              )}>
                {settlement.status}
              </span>
            </div>
            
            <h3 className="text-4xl font-black text-slate-900 dark:text-white mt-2 flex items-start gap-1">
              <span className="text-xl mt-1.5 text-slate-400">₹</span>
              {settlement.amount.toLocaleString()}
            </h3>
            
            <div className="flex items-center gap-6 mt-6 mb-8 w-full max-w-sm justify-center">
              <div className="flex flex-col items-center">
                <img 
                  src={settlement.payerId?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(settlement.payerId?.name || 'User')}&background=random`} 
                  alt={settlement.payerId?.name} 
                  className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-800 shadow-sm object-cover"
                />
                <span className="text-xs font-bold text-slate-900 dark:text-white mt-2 max-w-[100px] truncate text-center" title={settlement.payerId?.name}>{settlement.payerId?.name || 'Unknown'}</span>
                <span className="text-[10px] text-slate-500 uppercase">Sender</span>
              </div>
              
              <div className="flex flex-col items-center justify-center -mt-6">
                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full mb-1">
                  <ArrowRight size={16} className="text-slate-400" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{settlement.paymentType}</span>
              </div>
              
              <div className="flex flex-col items-center">
                <img 
                  src={settlement.receiverId?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(settlement.receiverId?.name || 'User')}&background=random`} 
                  alt={settlement.receiverId?.name} 
                  className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-800 shadow-sm object-cover"
                />
                <span className="text-xs font-bold text-slate-900 dark:text-white mt-2 max-w-[100px] truncate text-center" title={settlement.receiverId?.name}>{settlement.receiverId?.name || 'Unknown'}</span>
                <span className="text-[10px] text-slate-500 uppercase">Receiver</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center justify-center gap-6 w-full mt-2">
              <button 
                onClick={() => setActiveTab('overview')}
                className={cn(
                  "pb-3 text-xs font-bold tracking-wide uppercase transition-colors relative",
                  activeTab === 'overview' ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Overview
                {activeTab === 'overview' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />}
              </button>
              <button 
                onClick={() => setActiveTab('proof')}
                className={cn(
                  "pb-3 text-xs font-bold tracking-wide uppercase transition-colors relative",
                  activeTab === 'proof' ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Payment Proof
                {activeTab === 'proof' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />}
              </button>
              <button 
                onClick={() => setActiveTab('timeline')}
                className={cn(
                  "pb-3 text-xs font-bold tracking-wide uppercase transition-colors relative",
                  activeTab === 'timeline' ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Audit Trail
                {activeTab === 'timeline' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />}
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/10">
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {settlement.isFlagged && (
                  <div className="bg-rose-50 dark:bg-rose-500/10 p-4 rounded-xl border border-rose-200/50 dark:border-rose-500/20 flex gap-3">
                    <ShieldAlert size={20} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-rose-900 dark:text-rose-300">Transaction Flagged</h4>
                      <p className="text-xs text-rose-700 dark:text-rose-400/80 mt-1">{settlement.flagReason || 'No specific reason provided for this flag.'}</p>
                    </div>
                  </div>
                )}

                {settlement.disputeReason && (
                  <div className="bg-amber-50 dark:bg-amber-500/10 p-4 rounded-xl border border-amber-200/50 dark:border-amber-500/20 flex gap-3">
                    <ShieldAlert size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">Transaction Disputed</h4>
                      <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-1">{settlement.disputeReason}</p>
                    </div>
                  </div>
                )}
                
                {settlement.rejectionReason && (
                  <div className="bg-rose-50 dark:bg-rose-500/10 p-4 rounded-xl border border-rose-200/50 dark:border-rose-500/20 flex gap-3">
                    <XCircle size={20} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-rose-900 dark:text-rose-300">Transaction Rejected</h4>
                      <p className="text-xs text-rose-700 dark:text-rose-400/80 mt-1">{settlement.rejectionReason}</p>
                    </div>
                  </div>
                )}

                {/* Details Grid */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Transaction Details</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-[#16181d] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm flex items-start gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg shrink-0"><Users size={16} /></div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workspace</p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 truncate">{settlement.groupId?.name || 'Unknown'}</p>
                      </div>
                    </div>
                    
                    <div className="bg-white dark:bg-[#16181d] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm flex items-start gap-3">
                      <div className="p-2 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg shrink-0"><Calendar size={16} /></div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initiated</p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{new Date(settlement.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-[#16181d] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm flex items-start gap-3">
                      <div className="p-2 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg shrink-0"><Activity size={16} /></div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Method</p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 capitalize">{settlement.paymentType || 'Unknown'}</p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-[#16181d] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm flex items-start gap-3">
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0"><CheckCircle2 size={16} /></div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Added By</p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{settlement.addedBy?.name || 'Unknown'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#16181d] p-5 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Transaction Notes</h4>
                   <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                     {settlement.note || 'No notes attached to this settlement.'}
                   </p>
                </div>
              </div>
            )}

            {activeTab === 'proof' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proof of Payment</h4>
                  {settlement.screenshot && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded border border-emerald-200/50 dark:border-emerald-500/20 uppercase tracking-wider">
                      <CheckCircle2 size={12} /> Image Provided
                    </div>
                  )}
                </div>
                
                {settlement.screenshot ? (
                  <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex flex-col relative group">
                    <img src={settlement.screenshot} alt="Proof" className="w-full object-contain max-h-[400px]" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 text-white rounded-xl text-xs font-bold transition-colors">
                        <Download size={14} /> Download Receipt
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center h-64 text-slate-400 bg-slate-50 dark:bg-slate-800/20">
                    <Receipt size={48} className="mb-3 opacity-30" />
                    <p className="text-sm font-bold text-slate-500">No screenshot provided</p>
                    <p className="text-xs text-slate-400 mt-1">This transaction is missing required documentation.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-8">
                  {/* Mocked timeline since full history isn't returned by backend natively */}
                  <div className="relative">
                    <div className="absolute -left-[33px] w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900 border-2 border-blue-500 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">Settlement Requested</h5>
                      <p className="text-xs text-slate-500 mt-1">Requested by {settlement.addedBy?.name || 'User'} via {settlement.paymentType}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{new Date(settlement.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {settlement.status === 'completed' && (
                    <div className="relative">
                      <div className="absolute -left-[33px] w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900 border-2 border-emerald-500 flex items-center justify-center">
                        <CheckCircle2 size={10} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">Settlement Completed</h5>
                        <p className="text-xs text-slate-500 mt-1">Approved by {settlement.receiverId?.name || 'Receiver'} or Admin</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{new Date(settlement.updatedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {(settlement.status === 'rejected' || settlement.status === 'failed') && (
                    <div className="relative">
                      <div className="absolute -left-[33px] w-4 h-4 rounded-full bg-rose-100 dark:bg-rose-900 border-2 border-rose-500 flex items-center justify-center">
                        <XCircle size={10} className="text-rose-600 dark:text-rose-400" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">Settlement Rejected</h5>
                        <p className="text-xs text-slate-500 mt-1">{settlement.rejectionReason || 'No reason provided'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{new Date(settlement.updatedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  
                  {settlement.status === 'disputed' && (
                    <div className="relative">
                      <div className="absolute -left-[33px] w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900 border-2 border-amber-500 flex items-center justify-center">
                        <ShieldAlert size={10} className="text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">Settlement Disputed</h5>
                        <p className="text-xs text-slate-500 mt-1">{settlement.disputeReason || 'No reason provided'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{new Date(settlement.updatedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  
                  {(settlement.status === 'pending' || settlement.status === 'disputed') && (
                    <div className="relative opacity-50">
                      <div className="absolute -left-[33px] w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center">
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-500">Awaiting Resolution</h5>
                        <p className="text-xs text-slate-400 mt-1">Pending approval from {settlement.receiverId?.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Admin Actions */}
          {(settlement.status === 'pending' || settlement.status === 'disputed') && (
            <div className="p-6 border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#16181d] flex flex-col gap-3">
               <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                    Admin Verification Reason
                  </label>
                  <input
                    type="text"
                    placeholder="E.g., Verified receipt manually..."
                    value={ownerCompletionReason}
                    onChange={(e) => setOwnerCompletionReason(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
               </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleForceComplete}
                  disabled={submitting}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Force Complete
                </button>
                <button 
                  onClick={handleRejectAction}
                  disabled={submitting}
                  className="px-6 py-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <RefreshCw size={16} className="animate-spin" /> : 'Reject'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SettlementDrawer;
