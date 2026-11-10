import React, { useMemo } from 'react';
import { Wallet, Users, CheckCircle2, Clock } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/groupFormatters';

const DEFAULT_SERIES = [20, 35, 28, 46, 38, 54, 48];

const buildSparklineData = (values) => {
  const cleanValues = values.filter((v) => Number.isFinite(v) && v >= 0);
  const source = cleanValues.length >= 2 ? cleanValues.slice(-7) : DEFAULT_SERIES;
  return source.map((value, idx) => ({ idx, value: Math.max(value, 1) }));
};

const KPICard = ({ title, value, icon, badgeText, badgeTone, color, sparklineData }) => {
  const Icon = icon;
  return (
  <div className="bg-white dark:bg-[#16181d] rounded-2xl p-5 border border-slate-200 dark:border-slate-800/60 shadow-sm relative overflow-hidden group">
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className={`p-2.5 rounded-xl ${color.bg} ${color.text}`}>
        <Icon size={20} strokeWidth={2.5} />
      </div>
      {badgeText && (
        <div
          className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
            badgeTone === 'positive'
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
              : badgeTone === 'warning'
                ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {badgeText}
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
  </div>
  );
};

const ReportsKPIs = ({ groups }) => {
  const stats = useMemo(() => {
    let totalExpenses = 0;
    let totalConnections = 0;
    let completedSettlements = 0;
    let pendingSettlements = 0;
    let totalOwed = 0;
    const uniqueMemberIds = new Set();

    const spendSeries = [];
    const memberSeries = [];
    const settlementSeries = [];
    const owedSeries = [];

    groups.forEach((group) => {
      const expense = group.summary?.totalExpense || 0;
      const memberCount = group.members?.length || 0;
      const doneCount = group.summary?.totalSettlements || 0;
      const pendingCount = group.summary?.pendingSettlements || 0;
      const owed = group.summary?.totalOwed || 0;

      totalExpenses += expense;
      totalConnections += memberCount;
      completedSettlements += doneCount;
      pendingSettlements += pendingCount;
      totalOwed += owed;

      group.members?.forEach((m) => {
        const id = (m.user?._id || m.user || '').toString();
        if (id) uniqueMemberIds.add(id);
      });

      spendSeries.push(expense);
      memberSeries.push(memberCount);
      settlementSeries.push(doneCount + 1);
      owedSeries.push(owed + 1);
    });

    const avgConnections = groups.length ? (totalConnections / groups.length).toFixed(1) : '0.0';

    return {
      totalExpenses,
      totalConnections,
      uniqueMembers: uniqueMemberIds.size,
      avgConnections,
      completedSettlements,
      pendingSettlements,
      totalOwed,
      spendSparkline: buildSparklineData(spendSeries),
      memberSparkline: buildSparklineData(memberSeries),
      settlementSparkline: buildSparklineData(settlementSeries),
      owedSparkline: buildSparklineData(owedSeries)
    };
  }, [groups]);

  const cards = [
    {
      title: 'Total Spend',
      value: formatCurrency(stats.totalExpenses),
      icon: Wallet,
      badgeText: `${groups.length} Groups`,
      badgeTone: 'neutral',
      color: {
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        text: 'text-blue-600 dark:text-blue-400',
        stroke: '#3b82f6'
      },
      sparklineData: stats.spendSparkline
    },
    {
      title: 'Total Network',
      value: stats.totalConnections,
      icon: Users,
      badgeText: `${stats.avgConnections} avg/grp`,
      badgeTone: 'positive',
      color: {
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        text: 'text-emerald-600 dark:text-emerald-400',
        stroke: '#10b981'
      },
      sparklineData: stats.memberSparkline
    },
    {
      title: 'Settled Transfers',
      value: stats.completedSettlements,
      icon: CheckCircle2,
      badgeText: stats.pendingSettlements > 0 ? `${stats.pendingSettlements} pending` : 'Up to date',
      badgeTone: stats.pendingSettlements > 0 ? 'warning' : 'positive',
      color: {
        bg: 'bg-indigo-50 dark:bg-indigo-500/10',
        text: 'text-indigo-600 dark:text-indigo-400',
        stroke: '#6366f1'
      },
      sparklineData: stats.settlementSparkline
    },
    {
      title: 'Unsettled Balance',
      value: formatCurrency(stats.totalOwed),
      icon: Clock,
      badgeText: stats.totalOwed > 0 ? 'Action needed' : 'All settled',
      badgeTone: stats.totalOwed > 0 ? 'warning' : 'positive',
      color: {
        bg: 'bg-orange-50 dark:bg-orange-500/10',
        text: 'text-orange-600 dark:text-orange-400',
        stroke: '#f97316'
      },
      sparklineData: stats.owedSparkline
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => (
        <KPICard key={card.title} {...card} />
      ))}
    </div>
  );
};

export default ReportsKPIs;
