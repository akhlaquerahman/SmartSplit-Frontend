import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';

const getAvatarFallback = (name = 'Member') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff&bold=true`;

const GroupsGrid = ({ groups, onCreateGroup }) => {
  if (!groups || groups.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-[#16181d] rounded-2xl border border-dashed dark:border-slate-800">
        <Users size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <p className="text-slate-500 dark:text-slate-400 mb-4">No groups yet. Start by creating one!</p>
        <button onClick={onCreateGroup} className="text-primary-600 font-bold hover:underline">
          Create your first group
        </button>
      </div>
    );
  }

  // Strictly display only the first row (1 card on mobile, 2 on sm, 3 on md/lg, 4 on xl+)
  const firstRowGroups = groups.slice(0, 4);

  const getResponsiveVisibilityClass = (idx) => {
    if (idx === 1) return 'hidden sm:block';
    if (idx === 2) return 'hidden md:block';
    if (idx === 3) return 'hidden xl:block';
    return 'block';
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Users size={20} className="text-primary-600" /> Active Groups
          </h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {groups.length}
          </span>
        </div>
        <Link to="/groups" className="text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-0.5">
          View All ({groups.length}) <ChevronRight size={16} />
        </Link>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
        {firstRowGroups.map((group, idx) => {
          const totalSpent = Number(group.summary?.totalExpense || 0);
          const budget = Number(group.budget || 0);
          const hasBudget = budget > 0;
          const progress = hasBudget
            ? Math.min((totalSpent / budget) * 100, 100)
            : (totalSpent > 0 ? 100 : 0);
          const isOverBudget = hasBudget && totalSpent > budget;
          const isNearLimit = hasBudget && !isOverBudget && progress >= 80;
          const members = group.members || [];

          return (
            <Link key={group._id} to={`/group/${group._id}`} className={getResponsiveVisibilityClass(idx)}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white dark:bg-[#16181d] p-5 rounded-2xl border border-slate-200/70 dark:border-slate-800/60 hover:shadow-lg hover:border-primary-500/30 transition-all group-card h-full flex flex-col"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded-md uppercase tracking-wide">
                      {group.category}
                    </span>
                  </div>
                  <div className="flex -space-x-2">
                    {members.slice(0, 3).map((m, i) => {
                      const memberName = m.user?.name || 'Member';
                      const avatarSrc = m.user?.avatar || getAvatarFallback(memberName);
                      return (
                        <img
                          key={i}
                          src={avatarSrc}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getAvatarFallback(memberName);
                          }}
                          className="w-7 h-7 rounded-full object-cover border-2 border-white dark:border-[#16181d] bg-slate-100"
                          title={memberName}
                          alt={memberName}
                        />
                      );
                    })}
                    {members.length > 3 && (
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-[#16181d] flex items-center justify-center text-[9px] font-bold text-slate-500">
                        +{members.length - 3}
                      </div>
                    )}
                  </div>
                </div>
                
                <h3 className="text-lg font-bold mb-1 truncate text-slate-900 dark:text-white">{group.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-4 h-4">{group.description || 'No description'}</p>
                
                <div className="space-y-3 mt-auto">
                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1.5">
                      <span className="text-slate-500">Spent: ₹{totalSpent.toFixed(0)}</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {hasBudget ? `₹${budget}` : 'No limit'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverBudget
                            ? 'bg-rose-500'
                            : isNearLimit
                            ? 'bg-amber-500'
                            : 'bg-primary-500'
                        }`} 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t dark:border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {isOverBudget ? (
                        <AlertCircle size={14} className="text-rose-500" />
                      ) : isNearLimit ? (
                        <AlertCircle size={14} className="text-amber-500" />
                      ) : (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      )}
                      <span className={`text-xs font-semibold ${
                        isOverBudget
                          ? 'text-rose-600 dark:text-rose-400'
                          : isNearLimit
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {hasBudget
                          ? (isOverBudget ? 'Over Budget' : isNearLimit ? 'Near Limit' : 'On Track')
                          : 'Active'}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">
                      {members.length} {members.length === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default GroupsGrid;
