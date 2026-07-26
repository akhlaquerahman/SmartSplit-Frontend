import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Users, FileText, Activity, 
  PieChart as PieChartIcon, Target, Award, AlertCircle, 
  CheckCircle2, Plus, QrCode, UserPlus, Download,
  IndianRupee, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const formatCurrency = (amount) => `Rs. ${Number(amount || 0).toFixed(2)}`;

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

const GroupOverviewTab = ({ 
  group, 
  expenses, 
  settlements,
  currentUser,
  onAddExpense,
  onAddSettlement,
  onAddMember
}) => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // --- Data Aggregation ---
  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  
  const pendingSettlements = useMemo(() => 
    settlements.filter(s => s.status === 'pending'), 
  [settlements]);

  // SINGLE SOURCE OF TRUTH: Map balances directly from the backend summary
  const memberBalances = useMemo(() => {
    if (group?.summary?.memberBalances) {
      return [...group.summary.memberBalances].map(member => ({
        ...member.user,
        totalPaid: member.totalPaid || 0,
        totalShare: member.totalShare || 0,
        netBalance: member.netBalance || 0
      })).sort((a, b) => b.netBalance - a.netBalance); // Sort by highest balance (to receive)
    }

    // Fallback if summary is completely missing
    if (!group?.members) return [];
    
    return group.members.map(member => ({
      ...member.user,
      totalPaid: 0,
      totalShare: 0,
      netBalance: 0
    }));
  }, [group]);

  // Top Contributor
  const topContributor = memberBalances[0] || null;
  // Highest Outstanding Balance (Owes most)
  const highestOwed = memberBalances[memberBalances.length - 1] || null;
  const hasOwed = highestOwed && highestOwed.netBalance < 0;

  // Total Outstanding Balance across group (sum of all positive balances)
  const totalOutstanding = useMemo(() => 
    memberBalances.reduce((sum, m) => m.netBalance > 0 ? sum + m.netBalance : sum, 0), 
  [memberBalances]);

  // Member-wise Breakdown for Pie Chart
  const memberPaidData = useMemo(() => {
    if (!group?.members) return [];
    const data = group.members.map(member => {
      const totalPaid = expenses.filter(e => e.paidBy?._id === member.user._id).reduce((sum, e) => sum + e.amount, 0);
      return { name: member.user.name, value: totalPaid };
    }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
    return data;
  }, [group, expenses]);

  // Trend Data for Line Chart (Last 7 days)
  const trendData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { date: d.toISOString().split('T')[0], formatted: d.toLocaleDateString('en-US', { weekday: 'short' }), amount: 0 };
    });

    expenses.forEach(e => {
      const eDate = new Date(e.date || e.createdAt).toISOString().split('T')[0];
      const day = last7Days.find(d => d.date === eDate);
      if (day) day.amount += e.amount;
    });
    
    return last7Days;
  }, [expenses]);

  const latestExpenses = expenses.slice(0, 5);
  const latestSettlements = settlements.slice(0, 5);

  const healthScore = Math.max(0, 100 - (pendingSettlements.length * 5) - (totalOutstanding > totalExpenses * 0.5 ? 20 : 0));
  const healthStatus = healthScore > 80 ? 'Healthy' : healthScore > 50 ? 'Warning' : 'Critical';
  const healthColor = healthScore > 80 ? 'text-emerald-500' : healthScore > 50 ? 'text-amber-500' : 'text-rose-500';

  // Smart Insights generator
  const generateInsights = () => {
    const insights = [];
    if (memberPaidData.length > 0) {
      const topMem = memberPaidData[0];
      const pct = Math.round((topMem.value / totalExpenses) * 100);
      insights.push(`${topMem.name} has paid the most, contributing ${pct}% of all expenses.`);
    }
    const pendingCount = pendingSettlements.length;
    if (pendingCount > 0) {
      insights.push(`There are ${pendingCount} pending settlement requests that need your attention.`);
    }
    if (expenses.length > 0) {
      const avg = totalExpenses / expenses.length;
      insights.push(`The average expense amount in this group is ${formatCurrency(avg)}.`);
    }
    if (insights.length === 0) {
      insights.push('Add some expenses to generate smart insights!');
    }
    return insights;
  };

  const insights = generateInsights();

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SECTION 2: Left Column (Charts) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Charts Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border shadow-sm">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-primary-500" /> Expense Trend (7 Days)
              </h3>
              <div className="h-48">
                {isClient && trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="formatted" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dx={-10} tickFormatter={(val) => `₹${val}`} />
                      <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data available</div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border shadow-sm relative">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <PieChartIcon size={16} className="text-primary-500" /> Member Breakdown
              </h3>
              <div className="h-48 relative">
                {isClient && memberPaidData.length > 0 ? (
                  <>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mb-6">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                      <span className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(totalExpenses)}</span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
                      <PieChart>
                        <Pie 
                          data={memberPaidData} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={55} 
                          outerRadius={75} 
                          paddingAngle={0} 
                          dataKey="value"
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                            const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                            if (percent < 0.05) return null; // Don't show label for very small slices
                            return (
                              <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-bold">
                                {`${(percent * 100).toFixed(0)}%`}
                              </text>
                            );
                          }}
                          labelLine={false}
                        >
                          {memberPaidData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          formatter={(value, name) => [`Paid: ${formatCurrency(value)}`, name]}
                          contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                        />
                        <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '600', color: '#64748b' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data available</div>
                )}
              </div>
            </div>
          </div>

          {/* Member Balances Compact List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-sm font-bold">Member Balances Overview</h3>
            </div>
            <div className="p-5 space-y-4">
              {memberBalances.map((member) => {
                const isPositive = member.netBalance > 0;
                const isZero = member.netBalance === 0;
                const absBalance = Math.abs(member.netBalance);
                const maxBalance = Math.max(...memberBalances.map(m => Math.abs(m.netBalance)), 1);
                const percent = (absBalance / maxBalance) * 100;
                
                return (
                  <div key={member._id} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-600 shrink-0 overflow-hidden">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        member.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{member.name}</span>
                        <span className={`text-xs font-black ${isZero ? 'text-slate-400' : isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {isZero ? 'Settled Up' : isPositive ? `Receives ${formatCurrency(absBalance)}` : `Pays ${formatCurrency(absBalance)}`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className={`h-full rounded-full ${isZero ? 'bg-slate-300' : isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-1.5">
                        <div className="flex gap-3">
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400"><span className="text-slate-400 dark:text-slate-500">Paid:</span> {formatCurrency(member.totalPaid)}</span>
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400"><span className="text-slate-400 dark:text-slate-500">Share:</span> {formatCurrency(member.totalShare)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* SECTION 2: Right Column (Insights & Widgets) */}
        <div className="space-y-6">
          
          {/* Health Score */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border shadow-sm flex items-center gap-5">
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-100 dark:text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                <path className={`${healthColor}`} strokeDasharray={`${healthScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
              </svg>
              <span className={`absolute text-sm font-black ${healthColor}`}>{healthScore}</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Financial Health</p>
              <h3 className={`text-lg font-bold ${healthColor}`}>{healthStatus}</h3>
            </div>
          </div>

          {/* Top Contributor */}
          {topContributor && topContributor.totalPaid > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Award size={64} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1"><Award size={12}/> Top Contributor</p>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center font-bold text-amber-600 overflow-hidden">
                  {topContributor.avatar ? (
                    <img src={topContributor.avatar} alt={topContributor.name} className="w-full h-full object-cover" />
                  ) : (
                    topContributor.name.substring(0,2).toUpperCase()
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white">{topContributor.name}</h4>
                  <p className="text-xs font-bold text-amber-500">Paid {formatCurrency(topContributor.totalPaid)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Highest Owed */}
          {hasOwed && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-sm border-rose-100 dark:border-rose-900/30">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1 text-rose-500"><AlertCircle size={12}/> Highest Balance Alert</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center font-bold text-rose-600 overflow-hidden">
                  {highestOwed.avatar ? (
                    <img src={highestOwed.avatar} alt={highestOwed.name} className="w-full h-full object-cover" />
                  ) : (
                    highestOwed.name.substring(0,2).toUpperCase()
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white">{highestOwed.name}</h4>
                  <p className="text-xs font-bold text-rose-500">Needs to pay {formatCurrency(Math.abs(highestOwed.netBalance))}</p>
                </div>
              </div>
            </div>
          )}

          {/* Smart Insights Panel */}
          <div className="bg-primary-600 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-80 flex items-center gap-1">
              <FileText size={12} /> Smart Insights
            </p>
            <ul className="space-y-3 relative z-10">
              {insights.map((insight, idx) => (
                <li key={idx} className="text-sm font-medium leading-tight flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 shrink-0 opacity-70"></span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
      
      {/* SECTION 5 & 6: Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Expenses */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
            <h3 className="text-sm font-bold flex items-center gap-2"><IndianRupee size={16} className="text-slate-400"/> Recent Expenses</h3>
          </div>
          <div className="p-2">
            {latestExpenses.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-500 font-medium">No recent expenses.</p>
            ) : (
              latestExpenses.map((exp, idx) => (
                <div key={exp._id || idx} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <IndianRupee size={16} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">{exp.description}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                        Paid by {exp.paidBy?.name} • Added by {exp.addedBy?._id === currentUser?._id ? 'You' : exp.addedBy?.name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black">{formatCurrency(exp.amount)}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(exp.date || exp.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Settlements */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
            <h3 className="text-sm font-bold flex items-center gap-2"><QrCode size={16} className="text-slate-400"/> Recent Settlements</h3>
          </div>
          <div className="p-2">
            {latestSettlements.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-500 font-medium">No recent settlements.</p>
            ) : (
              latestSettlements.map((settle, idx) => (
                <div key={settle._id || idx} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 text-indigo-600 font-bold overflow-hidden">
                        {settle.payerId?.avatar ? (
                          <img src={settle.payerId.avatar} className="w-full h-full object-cover" alt="payer" />
                        ) : (
                          settle.payerId?.name?.substring(0,1)
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                        <ArrowUpRight size={10} className="text-emerald-500 stroke-[3]" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">{settle.payerId?.name} &rarr; {settle.receiverId?.name}</p>
                      <p className={`text-[10px] font-black uppercase ${settle.status === 'completed' ? 'text-emerald-500' : settle.status === 'pending' ? 'text-amber-500' : 'text-rose-500'}`}>
                        {settle.status}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black">{formatCurrency(settle.amount)}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(settle.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default GroupOverviewTab;
