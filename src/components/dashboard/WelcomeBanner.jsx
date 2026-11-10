import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Compass } from 'lucide-react';

const WelcomeBanner = ({ user, stats }) => {
  const navigate = useNavigate();
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 22) return 'Good Evening';
    return 'Good Night';
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-8">
      <div>
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight mb-2"
        >
          {getGreeting()}, {user?.name?.split(' ')[0] || 'User'} 👋
        </motion.h1>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-slate-500 font-medium"
        >
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500"></span> You have {stats?.pendingSettlements || 0} pending settlements.</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span> You are owed ₹{(stats?.owed || 0).toFixed(2)}.</span>
          {stats?.monthlySavings > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Saved ₹{(stats?.monthlySavings || 0).toFixed(2)} this month.</span>}
        </motion.div>
      </div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full sm:w-auto mt-2 sm:mt-0 flex flex-wrap items-center gap-3"
      >
        <button
          type="button"
          onClick={() => navigate('/temp-settlement?new=1')}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 bg-white dark:bg-[#16181d] p-3 sm:px-4 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors text-slate-700 dark:text-slate-300 group"
        >
          <div className="bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
            <Compass size={18} className="group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-sm font-bold uppercase tracking-wider whitespace-nowrap">Temp Settlement</span>
        </button>

        <button onClick={stats.onCreateGroup} className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-white dark:bg-[#16181d] p-3 sm:px-4 rounded-xl sm:rounded-2xl shadow-sm border dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors text-slate-700 dark:text-slate-300 group">
          <div className="bg-primary-50 dark:bg-primary-500/10 p-2 rounded-lg text-primary-600 dark:text-primary-400">
             <Plus size={20} className="group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-sm font-bold uppercase tracking-wider whitespace-nowrap">Create Group</span>
        </button>
      </motion.div>
    </div>
  );
};

export default WelcomeBanner;
