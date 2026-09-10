import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Filter, ChevronDown, CheckCircle, CheckCircle2, XCircle, 
  Clock, AlertCircle, FileText, Download, Trash2, Eye, X, Receipt, Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const formatCurrency = (amount) => `Rs. ${Number(amount || 0).toFixed(2)}`;
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const GroupSettlementsTab = ({ 
  group, 
  settlements, 
  currentUser, 
  isAdmin, 
  onNewRequest,
  onRespond,
  onDelete
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sorting & Filtering
  const filteredSettlements = useMemo(() => {
    return settlements
      .filter((s) => {
        if (statusFilter !== 'all' && s.status !== statusFilter) return false;
        if (search) {
          const term = search.toLowerCase();
          const matchNote = s.note?.toLowerCase().includes(term);
          const matchPayer = s.payerId?.name?.toLowerCase().includes(term);
          const matchReceiver = s.receiverId?.name?.toLowerCase().includes(term);
          const matchAmount = s.amount.toString().includes(term);
          if (!matchNote && !matchPayer && !matchReceiver && !matchAmount) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortOrder === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortOrder === 'highest') return b.amount - a.amount;
        if (sortOrder === 'lowest') return a.amount - b.amount;
        return 0;
      });
  }, [settlements, search, statusFilter, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredSettlements.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedSettlements = filteredSettlements.slice(startIndex, startIndex + rowsPerPage);

  // Analytics KPIs
  const analytics = useMemo(() => {
    const stats = {
      pending: 0,
      completed: 0,
      rejected: 0,
      totalSettled: 0,
      totalPending: 0,
      youReceive: 0,
      youPay: 0,
      count: settlements.length
    };

    settlements.forEach(s => {
      if (s.status === 'pending') {
        stats.pending++;
        stats.totalPending += s.amount;
      } else if (s.status === 'completed') {
        stats.completed++;
        stats.totalSettled += s.amount;
      } else if (s.status === 'rejected') {
        stats.rejected++;
      }

      // User specific
      if (s.status === 'pending') {
        if (s.receiverId?._id === currentUser?._id) stats.youReceive += s.amount;
        if (s.payerId?._id === currentUser?._id) stats.youPay += s.amount;
      }
    });

    stats.avgSettlement = stats.completed > 0 ? stats.totalSettled / stats.completed : 0;
    return stats;
  }, [settlements, currentUser]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-green-100 text-green-700 rounded-full border border-green-200"><CheckCircle size={12} /> Completed</span>;
      case 'pending': return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-orange-100 text-orange-700 rounded-full border border-orange-200"><Clock size={12} /> Pending</span>;
      case 'rejected': return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-red-100 text-red-700 rounded-full border border-red-200"><XCircle size={12} /> Rejected</span>;
      case 'disputed': return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-rose-100 text-rose-700 rounded-full border border-rose-200"><AlertCircle size={12} /> Disputed</span>;
      default: return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-full border border-slate-200"><Clock size={12} /> Processing</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Settlements</h2>
          <p className="text-sm text-slate-500 font-medium">Manage settlement requests and payment history</p>
        </div>
        <button 
          onClick={onNewRequest}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center"
        >
          New Settlement
        </button>
      </div>

      {/* 2. Filters Row */}
      <div className="bg-white dark:bg-slate-900 rounded-[1.25rem] border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search ID, Name, Note, or Amount..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>
          <div className="flex w-full lg:w-auto gap-3 overflow-x-auto pb-2 lg:pb-0">
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none cursor-pointer hover:bg-slate-100 transition-all"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
            <select 
              value={sortOrder} 
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none cursor-pointer hover:bg-slate-100 transition-all"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Analytics KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Total Settled</span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-1">{formatCurrency(analytics.totalSettled)}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Total Pending</span>
          <span className="text-xl font-black text-orange-600 mt-1">{formatCurrency(analytics.totalPending)}</span>
        </div>
        <div className="bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-900/50 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-primary-600 dark:text-primary-400 tracking-wider">You Will Receive</span>
          <span className="text-xl font-black text-primary-700 dark:text-primary-300 mt-1">{formatCurrency(analytics.youReceive)}</span>
        </div>
        <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/50 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider">You Need To Pay</span>
          <span className="text-xl font-black text-rose-700 dark:text-rose-300 mt-1">{formatCurrency(analytics.youPay)}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between col-span-2 md:col-span-1 lg:col-span-2">
          <div className="flex gap-4 h-full">
            <div className="flex-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Avg Settlement</span>
              <span className="block text-xl font-black text-slate-900 dark:text-white mt-1">{formatCurrency(analytics.avgSettlement)}</span>
            </div>
            <div className="flex-1 border-l border-slate-200 dark:border-slate-700 pl-4">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Volume</span>
              <span className="block text-xl font-black text-slate-900 dark:text-white mt-1">{analytics.completed} <span className="text-sm font-medium text-slate-400">/ {analytics.count}</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Main Content: Data Table (Desktop) & Cards (Mobile) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Desktop Table (Hidden on Mobile) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-4 px-3 text-[10px] font-black uppercase text-slate-500 tracking-widest whitespace-nowrap">Date & Time</th>
                <th className="py-4 px-3 text-[10px] font-black uppercase text-slate-500 tracking-widest whitespace-nowrap">From → To</th>
                <th className="py-4 px-3 text-[10px] font-black uppercase text-slate-500 tracking-widest whitespace-nowrap">Note</th>
                <th className="py-4 px-3 text-[10px] font-black uppercase text-slate-500 tracking-widest whitespace-nowrap text-right">Amount</th>
                <th className="py-4 px-3 text-[10px] font-black uppercase text-slate-500 tracking-widest whitespace-nowrap">Method</th>
                <th className="py-4 px-3 text-[10px] font-black uppercase text-slate-500 tracking-widest whitespace-nowrap">Status</th>
                <th className="py-4 px-3 text-[10px] font-black uppercase text-slate-500 tracking-widest whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {paginatedSettlements.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-medium text-sm">
                    No settlements found.
                  </td>
                </tr>
              ) : (
                paginatedSettlements.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors group">
                    <td className="py-4 px-3 whitespace-nowrap text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {formatDate(s.createdAt)}
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <img src={s.payerId?.avatar || `https://ui-avatars.com/api/?name=${s.payerId?.name}`} className="w-6 h-6 rounded-full border border-slate-200 shrink-0 object-cover" alt="payer" />
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{s.payerId?.name === currentUser?.name ? 'You' : s.payerId?.name?.split(' ')[0]}</span>
                        </div>
                        <span className="text-slate-300 text-xs font-bold">→</span>
                        <div className="flex items-center gap-2">
                          <img src={s.receiverId?.avatar || `https://ui-avatars.com/api/?name=${s.receiverId?.name}`} className="w-6 h-6 rounded-full border border-slate-200 shrink-0 object-cover" alt="receiver" />
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{s.receiverId?.name === currentUser?.name ? 'You' : s.receiverId?.name?.split(' ')[0]}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 line-clamp-1 max-w-[150px]" title={s.note}>
                        {s.note || <span className="text-slate-300 italic">No note</span>}
                      </p>
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap text-right">
                      <span className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(s.amount)}</span>
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap text-xs font-semibold text-slate-600">
                      {s.paymentType}
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      {getStatusBadge(s.status)}
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 opacity-100 transition-opacity">
                        <button onClick={() => setSelectedSettlement(s)} className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors" title="View Details">
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards (Hidden on Desktop) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {paginatedSettlements.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium text-sm">
              No settlements found.
            </div>
          ) : (
            paginatedSettlements.map((s) => {
              const receiverIdStr = String(s.receiverId?._id || s.receiverId || '');
              const payerIdStr = String(s.payerId?._id || s.payerId || '');
              const currentUserIdStr = String(currentUser?._id || currentUser?.id || '');

              const isReceiver = receiverIdStr === currentUserIdStr;
              const isPayer = payerIdStr === currentUserIdStr;
              const isUserAdmin = isAdmin || currentUser?.role === 'admin';
              const canRespond = s.status === 'pending' && (isReceiver || isUserAdmin);
              const canCancel = s.status === 'pending' && isPayer;

              return (
                <div key={s._id} className="p-4 space-y-4 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(s.amount)}</span>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date(s.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                    {getStatusBadge(s.status)}
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <img src={s.payerId?.avatar || `https://ui-avatars.com/api/?name=${s.payerId?.name}`} className="w-5 h-5 rounded-full shrink-0 object-cover" alt="payer" />
                      <span className="text-xs font-bold truncate text-slate-900 dark:text-slate-100">{s.payerId?.name?.split(' ')[0]}</span>
                    </div>
                    <span className="text-slate-300">→</span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <img src={s.receiverId?.avatar || `https://ui-avatars.com/api/?name=${s.receiverId?.name}`} className="w-5 h-5 rounded-full shrink-0 object-cover" alt="receiver" />
                      <span className="text-xs font-bold truncate text-slate-900 dark:text-slate-100">{s.receiverId?.name?.split(' ')[0]}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400">{s.paymentType}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {canRespond && (
                        <>
                          <button
                            onClick={() => onRespond && onRespond(s._id, 'dispute')}
                            className="px-2.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-100 transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => onRespond && onRespond(s._id, 'accept')}
                            className="px-2.5 py-1.5 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-sm rounded-lg transition-colors cursor-pointer"
                          >
                            Accept
                          </button>
                        </>
                      )}
                      {canCancel && (
                        <button
                          onClick={() => onRespond && onRespond(s._id, 'dispute')}
                          className="px-2.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                      <button 
                        onClick={() => setSelectedSettlement(s)} 
                        className="text-xs font-bold text-primary-600 bg-primary-50 dark:bg-primary-950/40 dark:text-primary-400 px-3 py-1.5 rounded-lg border border-primary-200 dark:border-primary-800 cursor-pointer"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination UI */}
        {filteredSettlements.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 font-medium">
              <span>Rows per page:</span>
              <select 
                value={rowsPerPage} 
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>
                Showing {startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredSettlements.length)} of {filteredSettlements.length}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300 px-2">
                Page {currentPage} of {totalPages}
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Right-Side Drawer (NOT a modal) */}
      <AnimatePresence>
        {selectedSettlement && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[90]"
              onClick={() => setSelectedSettlement(null)}
            />
            <motion.div 
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-[100] border-l border-slate-200 dark:border-slate-800 flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Settlement Details</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">ID: {selectedSettlement._id.slice(-8)}</p>
                </div>
                <button onClick={() => setSelectedSettlement(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Amount</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{formatCurrency(selectedSettlement.amount)}</p>
                  </div>
                  <div>
                    {getStatusBadge(selectedSettlement.status)}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-widest mb-4">Transaction Timeline</h4>
                  <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 space-y-6">
                    <div className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-slate-200 border-4 border-white dark:border-slate-900" />
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Requested by {selectedSettlement.addedBy?.name || selectedSettlement.payerId?.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{formatDate(selectedSettlement.createdAt)}</p>
                    </div>
                    {selectedSettlement.status !== 'pending' && (
                      <div className="relative pl-6">
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 ${selectedSettlement.status === 'completed' ? 'bg-green-500' : 'bg-rose-500'}`} />
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedSettlement.status === 'completed' ? 'Verified & Completed' : 'Rejected'}</p>
                        <p className="text-xs text-slate-500 mt-1">{formatDate(selectedSettlement.completedAt || selectedSettlement.adminApprovedAt || selectedSettlement.settledAt || selectedSettlement.updatedAt)}</p>
                        
                        {selectedSettlement.status === 'completed' && selectedSettlement.completedByOwner && (
                          <div className="mt-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 max-w-sm">
                            <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> Completed by App Owner after payment verification</p>
                            <p className="text-[10px] font-bold text-emerald-600/70 mt-1 mb-2">{formatDate(selectedSettlement.completedAt || selectedSettlement.adminApprovedAt || selectedSettlement.updatedAt)}</p>
                            {selectedSettlement.ownerCompletionReason && (
                              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 italic mt-1.5 leading-relaxed">"{selectedSettlement.ownerCompletionReason}"</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-widest mb-4">Note / Description</h4>
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {selectedSettlement.note ? selectedSettlement.note : 'No description provided.'}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-widest mb-4">Payment Info</h4>
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">Method</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border">{selectedSettlement.paymentType}</span>
                    </div>
                    {selectedSettlement.screenshot ? (
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-500 mb-3 block">Screenshot Attached</span>
                        <div className="rounded-xl overflow-hidden border border-slate-200">
                          <img src={selectedSettlement.screenshot} className="w-full h-auto object-cover" alt="Proof" />
                        </div>
                      </div>
                    ) : (
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2 text-slate-400 text-sm font-semibold p-4 border border-dashed rounded-xl justify-center bg-white dark:bg-slate-900">
                          <ImageIcon size={16} /> No screenshot provided
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons for Pending Settlements */}
              {selectedSettlement.status === 'pending' && (
                <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex gap-3 pb-20 md:pb-6 shrink-0 shadow-lg z-10">
                  {((String(selectedSettlement.receiverId?._id || selectedSettlement.receiverId || '') === String(currentUser?._id || currentUser?.id || '')) || isAdmin || currentUser?.role === 'admin') && (
                    <>
                      <button 
                        onClick={async () => {
                          if (onRespond) {
                            const res = await onRespond(selectedSettlement._id, 'dispute');
                            if (res !== false) setSelectedSettlement(null);
                          }
                        }}
                        className="flex-1 py-3 px-4 rounded-xl font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 transition-colors text-sm shadow-sm cursor-pointer"
                      >
                        Reject
                      </button>
                      <button 
                        onClick={async () => {
                          if (onRespond) {
                            const res = await onRespond(selectedSettlement._id, 'accept');
                            if (res !== false) setSelectedSettlement(null);
                          }
                        }}
                        className="flex-1 py-3 px-4 rounded-xl font-bold bg-primary-600 text-white shadow-lg shadow-primary-500/20 hover:bg-primary-700 transition-colors text-sm cursor-pointer"
                      >
                        Accept & Verify
                      </button>
                    </>
                  )}
                  {String(selectedSettlement.payerId?._id || selectedSettlement.payerId || '') === String(currentUser?._id || currentUser?.id || '') && (
                    <button 
                      onClick={async () => {
                        if (onRespond) {
                          const res = await onRespond(selectedSettlement._id, 'dispute');
                          if (res !== false) setSelectedSettlement(null);
                        }
                      }}
                      className="w-full py-3 px-4 rounded-xl font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors text-sm cursor-pointer"
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupSettlementsTab;
