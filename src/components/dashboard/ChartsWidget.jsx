import React, { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
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
    const point = payload[0]?.payload;
    const displayLabel = point?.fullLabel || label || payload[0].name;

    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 text-sm">
        <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">{displayLabel}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="font-black text-base">
            ₹{Number(entry.value || 0).toFixed(2)}
          </p>
        ))}
        {typeof point?.count === 'number' && (
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">
            {point.count} {point.count === 1 ? 'expense' : 'expenses'}
          </p>
        )}
      </div>
    );
  }
  return null;
};

const getLocalDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getWeekStart = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
};

const TIMEFRAME_META = {
  day: { label: 'Day', subtitle: 'Daily expenses over the last 7 days' },
  week: { label: 'Week', subtitle: 'Weekly expenses over the last 8 weeks' },
  month: { label: 'Month', subtitle: 'Monthly expenses over the last 12 months' }
};

const ChartsWidget = ({ expenses = [] }) => {
  const [timeframe, setTimeframe] = useState('day'); // 'day' | 'week' | 'month'

  const trendData = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (timeframe === 'day') {
      const buckets = [];
      const bucketMap = new Map();

      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = getLocalDateKey(d);
        const entry = {
          key,
          name: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
          fullLabel: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
          value: 0,
          count: 0
        };
        buckets.push(entry);
        bucketMap.set(key, entry);
      }

      (expenses || []).forEach((exp) => {
        const rawDate = new Date(exp.date || exp.createdAt);
        if (Number.isNaN(rawDate.getTime())) return;
        const bucket = bucketMap.get(getLocalDateKey(rawDate));
        if (bucket) {
          bucket.value = Number((bucket.value + (Number(exp.amount) || 0)).toFixed(2));
          bucket.count += 1;
        }
      });

      return buckets;
    }

    if (timeframe === 'week') {
      const currentWeekStart = getWeekStart(today);
      const buckets = [];
      const bucketMap = new Map();

      for (let i = 7; i >= 0; i--) {
        const start = new Date(currentWeekStart);
        start.setDate(currentWeekStart.getDate() - i * 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);

        const key = getLocalDateKey(start);
        const entry = {
          key,
          name: i === 0 ? 'This Wk' : start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullLabel: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
          value: 0,
          count: 0
        };
        buckets.push(entry);
        bucketMap.set(key, entry);
      }

      (expenses || []).forEach((exp) => {
        const rawDate = new Date(exp.date || exp.createdAt);
        if (Number.isNaN(rawDate.getTime())) return;
        const wkStart = getWeekStart(rawDate);
        const bucket = bucketMap.get(getLocalDateKey(wkStart));
        if (bucket) {
          bucket.value = Number((bucket.value + (Number(exp.amount) || 0)).toFixed(2));
          bucket.count += 1;
        }
      });

      return buckets;
    }

    // Monthly view (last 12 months)
    const buckets = [];
    const bucketMap = new Map();

    for (let i = 11; i >= 0; i--) {
      const mDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}`;
      const entry = {
        key,
        name: mDate.toLocaleDateString('en-US', { month: 'short' }),
        fullLabel: mDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        value: 0,
        count: 0
      };
      buckets.push(entry);
      bucketMap.set(key, entry);
    }

    (expenses || []).forEach((exp) => {
      const rawDate = new Date(exp.date || exp.createdAt);
      if (Number.isNaN(rawDate.getTime())) return;
      const key = `${rawDate.getFullYear()}-${String(rawDate.getMonth() + 1).padStart(2, '0')}`;
      const bucket = bucketMap.get(key);
      if (bucket) {
        bucket.value = Number((bucket.value + (Number(exp.amount) || 0)).toFixed(2));
        bucket.count += 1;
      }
    });

    return buckets;
  }, [expenses, timeframe]);

  const periodTotal = useMemo(
    () => trendData.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
    [trendData]
  );

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Spending Trends</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-800/60">
                ₹{periodTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{TIMEFRAME_META[timeframe].subtitle}</p>
          </div>

          {/* Enterprise Day / Week / Month Segmented Switcher */}
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/60 self-start sm:self-auto shrink-0">
            {(['day', 'week', 'month']).map((option) => {
              const isActive = timeframe === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTimeframe(option)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-300 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {TIMEFRAME_META[option].label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-[250px] sm:h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 300, height: 250 }} className="focus:outline-none">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} style={{ outline: 'none' }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={14}
                tick={{ fontSize: 11, fill: '#64748b' }}
                dy={10}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                name="Expense"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorValue)"
                style={{ outline: 'none' }}
                activeDot={{ r: 5, strokeWidth: 2, style: { outline: 'none' } }}
              />
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
