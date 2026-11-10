import React, { memo } from 'react';
import { Users, MapPin, Calendar, ArrowRight, FileText } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatCurrency, getCategoryColor } from '../../utils/groupFormatters';

const ReportGroupCard = memo(({ group, viewMode, onSelect }) => {
  const spent = group.summary?.totalExpense || 0;
  const totalOwed = group.summary?.totalOwed || 0;
  const pendingSettlements = group.summary?.pendingSettlements || 0;
  const completedSettlements = group.summary?.totalSettlements || 0;

  const isSettled = spent > 0 && totalOwed === 0 && pendingSettlements === 0;
  const settledProgress = spent > 0 ? Math.max(0, Math.min(100, ((spent - totalOwed) / spent) * 100)) : 0;

  const statusBadge = isSettled ? (
    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
      Settled
    </span>
  ) : spent > 0 ? (
    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
      Active
    </span>
  ) : (
    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
      No Spend
    </span>
  );

  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onSelect(group._id)}
        className="bg-white dark:bg-[#16181d] p-4 rounded-xl border border-slate-200 dark:border-slate-800/60 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-between gap-4 group/card relative overflow-hidden cursor-pointer"
      >
        <div className="absolute inset-y-0 left-0 w-1 bg-primary-500 opacity-0 group-hover/card:opacity-100 transition-opacity" />

        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={cn('px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border shrink-0', getCategoryColor(group.category))}>
            {group.category}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{group.name}</h3>
              {statusBadge}
            </div>
            <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="flex items-center gap-1"><MapPin size={12} /> {group.country || 'Global'}</span>
              <span className="flex items-center gap-1"><Users size={12} /> {group.members?.length || 0} Members</span>
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-1 items-center gap-3 px-4">
          <div className="flex-1 max-w-[220px]">
            <div className="flex justify-between text-[10px] font-bold mb-1.5">
              <span className="text-slate-500 uppercase tracking-widest">
                {spent > 0 ? `${settledProgress.toFixed(0)}% Settled` : 'No Expenses'}
              </span>
              <span className="text-slate-900 dark:text-white">
                {formatCurrency(spent)}
                {totalOwed > 0 && <span className="text-amber-600 dark:text-amber-400"> • {formatCurrency(totalOwed)} due</span>}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  isSettled ? 'bg-emerald-500' : spent > 0 ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-700'
                )}
                style={{ width: spent > 0 ? `${Math.max(settledProgress, 8)}%` : '0%' }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden sm:flex -space-x-2">
            {group.members?.slice(0, 3).map((member, i) => (
              <img
                key={i}
                src={member.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user?.name || 'User')}`}
                className="w-7 h-7 rounded-full border-2 border-white dark:border-[#16181d] object-cover"
                alt={member.user?.name || 'Member avatar'}
              />
            ))}
            {(group.members?.length || 0) > 3 && (
              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-[#16181d] flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-400">
                +{(group.members?.length || 0) - 3}
              </div>
            )}
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-black uppercase tracking-wider group-hover/card:bg-primary-600 group-hover/card:text-white transition-colors">
            <FileText size={13} /> View Report
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelect(group._id)}
      className="bg-white dark:bg-[#16181d] rounded-2xl border border-slate-200 dark:border-slate-800/60 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/50 hover:-translate-y-1 transition-all flex flex-col h-full group/card relative overflow-hidden cursor-pointer"
    >
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary-500 to-primary-600 opacity-0 group-hover/card:opacity-100 transition-opacity" />

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-2 mb-3">
          <span className={cn('px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border', getCategoryColor(group.category))}>
            {group.category}
          </span>
          {statusBadge}
        </div>

        <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white line-clamp-1 mb-1">
          {group.name}
        </h3>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 flex-1">
          {group.description || 'No description provided for this group.'}
        </p>

        <div className="space-y-4 mt-auto">
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <MapPin size={14} className="text-slate-400" />
              {group.country || 'Global'}
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Calendar size={14} className="text-slate-400" />
              {new Date(group.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800/50">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Spend</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(spent)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {totalOwed > 0 ? 'Unsettled' : 'Settlements'}
                </p>
                <p className={cn('text-sm font-bold', totalOwed > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
                  {totalOwed > 0 ? formatCurrency(totalOwed) : `${completedSettlements} Done`}
                </p>
              </div>
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700',
                  isSettled ? 'bg-emerald-500' : spent > 0 ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-700'
                )}
                style={{ width: spent > 0 ? `${Math.max(settledProgress, 8)}%` : '0%' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {group.members?.slice(0, 3).map((member, i) => (
              <img
                key={i}
                src={member.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user?.name || 'User')}`}
                className="w-8 h-8 rounded-full border-2 border-white dark:border-[#16181d] shadow-sm object-cover"
                alt={member.user?.name || 'Member avatar'}
              />
            ))}
            {(group.members?.length || 0) > 3 && (
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-[#16181d] flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-400">
                +{(group.members?.length || 0) - 3}
              </div>
            )}
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {group.members?.length || 0} members
          </span>
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-black text-primary-600 dark:text-primary-400 group-hover/card:translate-x-0.5 transition-transform">
          View Report <ArrowRight size={14} />
        </span>
      </div>
    </div>
  );
});

export default ReportGroupCard;

