import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Server, Users, FolderOpen, Receipt, HandCoins, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';

import useAuthStore from '../../store/useAuthStore';

const AdminHero = ({ stats }) => {
  const { user } = useAuthStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 22) return 'Good Evening';
    return 'Good Night';
  };

  const adminName = user?.name?.split(' ')[0] || 'Admin';

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-xl mb-8 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400 opacity-20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black mb-2 tracking-tight">
            {getGreeting()}, Admin 👋
          </h1>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
        <div className="flex flex-col">
          <span className="text-3xl font-black">{stats?.totalUsers?.toLocaleString() || 0}</span>
          <span className="text-blue-200 text-xs font-bold uppercase tracking-wider mt-1 flex items-center gap-1.5"><Users size={14} /> Total Users</span>
        </div>
        <div className="flex flex-col">
          <span className="text-3xl font-black">{stats?.totalGroups?.toLocaleString() || 0}</span>
          <span className="text-blue-200 text-xs font-bold uppercase tracking-wider mt-1 flex items-center gap-1.5"><FolderOpen size={14} /> Active Groups</span>
        </div>
        <div className="flex flex-col">
          <span className="text-3xl font-black">{stats?.totalExpenses?.toLocaleString() || 0}</span>
          <span className="text-blue-200 text-xs font-bold uppercase tracking-wider mt-1 flex items-center gap-1.5"><Receipt size={14} /> Expenses</span>
        </div>
        <div className="flex flex-col">
          <span className="text-3xl font-black">{stats?.totalSettlements?.toLocaleString() || 0}</span>
          <span className="text-blue-200 text-xs font-bold uppercase tracking-wider mt-1 flex items-center gap-1.5"><HandCoins size={14} /> Settlements</span>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminHero;
