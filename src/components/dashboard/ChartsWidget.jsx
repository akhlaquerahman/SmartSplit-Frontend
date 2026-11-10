import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { motion } from 'framer-motion';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-xl border dark:border-slate-700 text-sm">
        <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">{label || payload[0].name}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="font-black text-base">
            ₹{entry.value.toFixed(2)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ChartsWidget = ({ expenses }) => {
  const trendData = useMemo(() => {
    if (!expenses || expenses.length === 0) {
      return [
        { name: 'Mon', value: 0 }, { name: 'Tue', value: 0 }, { name: 'Wed', value: 0 },
        { name: 'Thu', value: 0 }, { name: 'Fri', value: 0 }, { name: 'Sat', value: 0 }, { name: 'Sun', value: 0 }
      ];
    }
    const grouped = expenses.slice(0, 30).reduce((acc, curr) => {
      const date = new Date(curr.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
      acc[date] = (acc[date] || 0) + (curr.amount || 0);
      return acc;
    }, {});
    const data = Object.keys(grouped).map(key => ({ name: key, value: grouped[key] }));
    return data.length > 0 ? data : [{ name: 'Today', value: 0 }];
  }, [expenses]);

  const categoryData = useMemo(() => {
    if (!expenses || expenses.length === 0) {
      return [{ name: 'No Data', value: 1 }];
    }
    const grouped = expenses.reduce((acc, curr) => {
      const cat = curr.group?.name || 'General';
      acc[cat] = (acc[cat] || 0) + (curr.amount || 0);
      return acc;
    }, {});
    return Object.keys(grouped).map(key => ({ name: key, value: grouped[key] }));
  }, [expenses]);

  const totalSpend = useMemo(() => {
    return categoryData.reduce((sum, item) => sum + (item.name === 'No Data' ? 0 : item.value), 0);
  }, [categoryData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Area Chart - 2/3 width */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:col-span-2 bg-white dark:bg-[#16181d] p-5 md:p-6 rounded-2xl border dark:border-slate-800/60 shadow-sm"
      >
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Spending Trends</h3>
          <p className="text-sm text-slate-500">Your expenses over recent days</p>
        </div>
        <div className="h-[250px] sm:h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 300, height: 250 }} className="focus:outline-none">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} style={{ outline: 'none' }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" name="Expense" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" style={{ outline: 'none' }} activeDot={{ style: { outline: 'none' } }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Pie Chart - 1/3 width */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-[#16181d] p-5 md:p-6 rounded-2xl border dark:border-slate-800/60 shadow-sm flex flex-col"
      >
        <div className="mb-2 shrink-0">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Top Groups</h3>
          <p className="text-sm text-slate-500">Where you spend the most</p>
        </div>
        <div className="h-[250px] sm:h-[300px] w-full relative mt-4">
          {totalSpend > 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
              <span className="text-xl font-black text-slate-800 dark:text-white">₹{totalSpend.toFixed(0)}</span>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 250, height: 250 }} className="focus:outline-none">
            <PieChart style={{ outline: 'none' }}>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius="65%"
                outerRadius="85%"
                dataKey="value"
                stroke="none"
                labelLine={false}
                label={renderCustomizedLabel}
                style={{ outline: 'none' }}
              >
                {categoryData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                    style={{ outline: 'none' }} 
                  />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};

export default ChartsWidget;
