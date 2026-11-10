import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  FolderOpen, 
  Wallet, 
  TrendingUp, 
  Activity,
  AlertCircle
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/groupFormatters';

const generateMockSparkline = (trend) => {
  const data = [];
  let current = 50;
  for (let i = 0; i < 7; i++) {
    const change = (Math.random() - (trend === 'down' ? 0.8 : 0.2)) * 10;
    current = Math.max(10, current + change);
    data.push({ value: current });
  }
  return data;
};

const KPICard = ({ title, value, icon: Icon, trend, trendValue, color, delay }) => {
  const sparklineData = useMemo(() => generateMockSparkline(trend), [trend]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white dark:bg-[#16181d] rounded-2xl p-5 border border-slate-200 dark:border-slate-800/60 shadow-sm relative overflow-hidden group"
    >
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-2.5 rounded-xl ${color.bg} ${color.text}`}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        {trendValue && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
            {trend === 'up' ? '+' : '-'}{Math.abs(trendValue)}%
          </div>
        )}
      </div>
      
      <div className="relative z-10">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1">{title}</h3>
        <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
      </div>

      <div className="absolute bottom-0 right-0 left-0 h-16 opacity-30 pointer-events-none">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 200, height: 64 }}>
          <LineChart data={sparklineData}>
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={color.stroke} 
              strokeWidth={2} 
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

const GroupsKPIs = ({ groups }) => {
  const stats = useMemo(() => {
    let totalBudget = 0;
    let totalExpenses = 0;
    let pendingSettlements = 0;
    let activeMembers = new Set();
    
    groups.forEach(g => {
      const spent = g.summary?.totalExpense || 0;
      totalExpenses += spent;
      totalBudget += g.budget || 0;
      pendingSettlements += g.summary?.pendingSettlements || 0;
      g.members?.forEach(m => activeMembers.add(m.user?._id || m.user));
    });

    return {
      totalGroups: groups.length,
      activeMembers: activeMembers.size,
      totalBudget,
      totalExpenses,
      pendingSettlements
    };
  }, [groups]);

  const cards = [
    { title: 'Total Groups', value: stats.totalGroups, icon: FolderOpen, trend: 'up', trendValue: 12.5, color: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', stroke: '#3b82f6' } },
    { title: 'Total Budget', value: formatCurrency(stats.totalBudget), icon: Wallet, trend: 'up', trendValue: 8.1, color: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', stroke: '#10b981' } },
    { title: 'Total Expenses', value: formatCurrency(stats.totalExpenses), icon: TrendingUp, trend: 'down', trendValue: 2.4, color: { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', stroke: '#f43f5e' } },
    { title: 'Pending Settlement', value: stats.pendingSettlements, icon: AlertCircle, trend: 'down', trendValue: 15.3, color: { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', stroke: '#f97316' } },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
      {cards.map((card, idx) => (
        <KPICard key={idx} {...card} delay={idx * 0.05} />
      ))}
    </div>
  );
};

export default GroupsKPIs;
