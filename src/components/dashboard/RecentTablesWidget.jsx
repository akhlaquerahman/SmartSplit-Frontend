import React from 'react';
import { motion } from 'framer-motion';

const getAvatarFallback = (name = 'User') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff&bold=true`;

const getSettlementStatusMeta = (rawStatus) => {
  const status = (rawStatus || 'pending').toLowerCase();

  if (status === 'completed' || status === 'admin_approved') {
    return {
      label: status === 'admin_approved' ? 'Approved' : 'Completed',
      badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-700/40'
    };
  }
  if (status === 'pending') {
    return {
      label: 'Pending',
      badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200/80 dark:border-amber-700/40'
    };
  }
  if (status === 'disputed') {
    return {
      label: 'Disputed',
      badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-200/80 dark:border-orange-700/40'
    };
  }
  return {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200/80 dark:border-rose-700/40'
  };
};

const RecentTablesWidget = ({ expenses = [], settlements = [] }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Recent Expenses */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-[#16181d] rounded-2xl border dark:border-slate-800/60 shadow-sm overflow-hidden flex flex-col"
      >
        <div className="p-4 md:p-5 border-b dark:border-slate-800/60 flex justify-between items-center">
          <h3 className="text-fluid-h3 font-bold text-slate-800 dark:text-slate-100">Recent Expenses</h3>
          {expenses.length > 0 && (
            <span className="text-[11px] font-bold text-slate-400">
              <span className="sm:hidden">Latest {Math.min(expenses.length, 3)}</span>
              <span className="hidden sm:inline">Latest {Math.min(expenses.length, 5)}</span>
            </span>
          )}
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {expenses.slice(0, 5).map((expense) => (
                <tr key={expense._id || expense.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="p-4">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{expense.description}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{new Date(expense.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded-md uppercase">
                      {expense.groupId?.name || expense.group?.name || 'Unknown'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">₹{Number(expense.amount || 0).toFixed(2)}</p>
                  </td>
                </tr>
              ))}
              {(!expenses || expenses.length === 0) && (
                <tr>
                  <td colSpan="3" className="p-8 text-center text-slate-500 text-sm">No expenses found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Card View (Max 3 items on mobile) */}
        <div className="sm:hidden flex flex-col divide-y divide-slate-100 dark:divide-slate-800/60 flex-1">
          {expenses.slice(0, 3).map((expense) => (
            <div key={expense._id || expense.id} className="p-3.5 flex flex-col gap-1.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{expense.description}</p>
                  <p className="text-xs text-slate-500">{new Date(expense.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <p className="text-[15px] font-black text-slate-900 dark:text-white shrink-0">₹{Number(expense.amount || 0).toFixed(2)}</p>
              </div>
              <div>
                <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded-md uppercase text-slate-600 dark:text-slate-400">
                  {expense.groupId?.name || expense.group?.name || 'Unknown'}
                </span>
              </div>
            </div>
          ))}
          {(!expenses || expenses.length === 0) && (
            <div className="p-8 text-center text-slate-500 text-sm">No expenses found</div>
          )}
        </div>
      </motion.div>

      {/* Recent Settlements */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-[#16181d] rounded-2xl border dark:border-slate-800/60 shadow-sm overflow-hidden flex flex-col"
      >
        <div className="p-4 md:p-5 border-b dark:border-slate-800/60 flex justify-between items-center">
          <h3 className="text-fluid-h3 font-bold text-slate-800 dark:text-slate-100">Recent Settlements</h3>
          {settlements.length > 0 && (
            <span className="text-[11px] font-bold text-slate-400">
              <span className="sm:hidden">Latest {Math.min(settlements.length, 3)}</span>
              <span className="hidden sm:inline">Latest {Math.min(settlements.length, 5)}</span>
            </span>
          )}
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {settlements.slice(0, 5).map((settlement) => {
                const payerName = settlement.payerId?.name || settlement.payer?.name || 'User';
                const payerAvatar = settlement.payerId?.avatar || settlement.payer?.avatar || getAvatarFallback(payerName);
                const statusMeta = getSettlementStatusMeta(settlement.status);

                return (
                  <tr key={settlement._id || settlement.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 flex items-center gap-2.5">
                      <img
                        src={payerAvatar}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getAvatarFallback(payerName);
                        }}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 shrink-0"
                        alt={payerName}
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{payerName}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{new Date(settlement.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide ${statusMeta.badgeClass}`}>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200">₹{Number(settlement.amount || 0).toFixed(2)}</p>
                    </td>
                  </tr>
                );
              })}
              {(!settlements || settlements.length === 0) && (
                <tr>
                  <td colSpan="3" className="p-8 text-center text-slate-500 text-sm">No settlements found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Card View (Max 3 items on mobile) */}
        <div className="sm:hidden flex flex-col divide-y divide-slate-100 dark:divide-slate-800/60 flex-1">
          {settlements.slice(0, 3).map((settlement) => {
            const payerName = settlement.payerId?.name || settlement.payer?.name || 'User';
            const payerAvatar = settlement.payerId?.avatar || settlement.payer?.avatar || getAvatarFallback(payerName);
            const statusMeta = getSettlementStatusMeta(settlement.status);

            return (
              <div key={settlement._id || settlement.id} className="p-3.5 flex flex-col gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={payerAvatar}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getAvatarFallback(payerName);
                      }}
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100"
                      alt={payerName}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{payerName}</p>
                      <p className="text-xs text-slate-500 truncate">{new Date(settlement.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[15px] font-black text-slate-900 dark:text-white">₹{Number(settlement.amount || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <span className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide ${statusMeta.badgeClass}`}>
                    {statusMeta.label}
                  </span>
                </div>
              </div>
            );
          })}
          {(!settlements || settlements.length === 0) && (
            <div className="p-8 text-center text-slate-500 text-sm">No settlements found</div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default RecentTablesWidget;
