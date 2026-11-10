import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, ArrowDownLeft, ArrowUpRight, Users, UsersRound, Calendar, Clock, PiggyBank, TrendingUp, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

const mockSparklineData = [
  { value: 10 }, { value: 25 }, { value: 15 }, { value: 30 }, { value: 20 }, { value: 40 }, { value: 35 }
];

const KPICard = ({ title, value, icon: Icon, color, trend, trendValue, index }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="bg-white dark:bg-[#16181d] p-5 rounded-2xl border dark:border-slate-800/60 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-between"
  >
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate max-w-[120px] sm:max-w-[200px]">{value}</h3>
      </div>
      <div className={`p-2.5 rounded-xl ${color.bg} ${color.text} flex-shrink-0`}>
        <Icon size={20} />
      </div>
    </div>
    
    <div className="flex items-end justify-between mt-1 sm:mt-2">
      <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium">
        {trend === 'up' ? (
          <span className="flex items-center text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-1.5 py-0.5 rounded-md"><TrendingUp size={12} className="mr-0.5 sm:mr-1" /> +{trendValue}%</span>
        ) : trend === 'down' ? (
          <span className="flex items-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded-md"><TrendingDown size={12} className="mr-0.5 sm:mr-1" /> -{trendValue}%</span>
        ) : (
          <span className="flex items-center text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-500/10 px-1.5 py-0.5 rounded-md">~ 0%</span>
        )}
      </div>
      <div className="h-6 w-14 sm:h-8 sm:w-20 opacity-40 group-hover:opacity-100 transition-opacity">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 80, height: 32 }}>
          <LineChart data={mockSparklineData}>
            <Line type="monotone" dataKey="value" stroke={color.stroke} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  </motion.div>
);

const ExecutiveKPIs = ({ stats }) => {
  const kpis = [
    { title: 'Total Balance', value: `₹${stats.totalBalance.toFixed(2)}`, icon: Wallet, color: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', stroke: '#3b82f6' }, trend: stats.totalBalance >= 0 ? 'up' : 'down', trendValue: 4.2 },
    { title: 'You Owe', value: `₹${stats.owe.toFixed(2)}`, icon: ArrowDownLeft, color: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400', stroke: '#ef4444' }, trend: 'down', trendValue: 12.5 },
    { title: 'You Are Owed', value: `₹${stats.owed.toFixed(2)}`, icon: ArrowUpRight, color: { bg: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400', stroke: '#22c55e' }, trend: 'up', trendValue: 8.1 },
    { title: 'Friends', value: stats.friendsCount, icon: Users, color: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', stroke: '#a855f7' }, trend: 'neutral', trendValue: 0 },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 mb-8">
      {kpis.map((kpi, i) => (
        <KPICard key={kpi.title} index={i} {...kpi} />
      ))}
    </div>
  );
};

export default ExecutiveKPIs;
