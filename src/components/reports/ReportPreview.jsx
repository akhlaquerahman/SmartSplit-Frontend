import React from 'react';
import { FileText, Users, HandCoins, Receipt } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';

// Helper to safely resolve payer name
const getPayerName = (expense, members) => {
  if (expense.paidBy?.name) return expense.paidBy.name.split(' ')[0];
  if (typeof expense.paidBy === 'string' || expense.paidBy?._id) {
    const pId = (expense.paidBy?._id || expense.paidBy).toString();
    const found = members?.find(m => (m.user?._id || m.user || '').toString() === pId);
    if (found?.user?.name) return found.user.name.split(' ')[0];
  }
  return 'User';
};

// Helper to safely resolve participant list (who shares in this expense)
const getParticipants = (expense, members) => {
  if (expense.participants && expense.participants.length > 0) {
    return expense.participants.map(p => {
      if (typeof p === 'object' && p.name) return p;
      const pId = (p._id || p).toString();
      const found = members?.find(m => (m.user?._id || m.user || '').toString() === pId);
      return found?.user || { name: 'User' };
    }).filter(Boolean);
  }
  if (expense.splitDetails && expense.splitDetails.length > 0) {
    return expense.splitDetails.map(sd => {
      const u = sd.user;
      if (typeof u === 'object' && u.name) return u;
      const pId = (u?._id || u).toString();
      const found = members?.find(m => (m.user?._id || m.user || '').toString() === pId);
      return found?.user || { name: 'User' };
    }).filter(Boolean);
  }
  return (members || []).map(m => m.user || m).filter(Boolean);
};

const ReportPreview = ({ group }) => {
  if (!group) return null;

  const { summary, expenses, settlements, members } = group;

  const memberList = summary?.memberBalances || [];
  const totalMembers = members?.length || 0;

  const allExpenses = [...(expenses || [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
  const completedSettlements = [...(settlements || [])]
    .filter(s => s.status === 'completed')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const reportId = `SSR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  const verificationUrl = `https://smartsplitakhlaque.vercel.app/report/verify/${reportId}`;
  
  // Dynamic layout calculation based on total expenses count
  const isHighVolume = allExpenses.length > 30;
  const gridColsClass = isHighVolume 
    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2" 
    : "grid grid-cols-1 md:grid-cols-2 gap-2.5";

  return (
    <div className="w-full max-w-[794px] mx-auto bg-white text-slate-600 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-slate-200/60 dark:border-slate-800 border-t-8 border-t-primary-600 overflow-hidden relative print:hidden">
      
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden opacity-[0.02]">
        <h1 className="text-6xl md:text-9xl font-black uppercase text-slate-900 -rotate-45 select-none whitespace-nowrap tracking-tighter">SMARTSPLIT</h1>
      </div>

      <div className="relative z-10 p-4 md:p-8 flex flex-col h-full">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6 border-b border-slate-200 pb-6 relative z-10">
          
          {/* Left Company Header */}
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
              <FileText size={24} className="text-primary-600" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none mb-1">SmartSplit</h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider leading-tight">Expense Platform</p>
            </div>
          </div>

          {/* Center Title */}
          <div className="flex flex-col items-center justify-center text-center">
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-wide uppercase mb-2">Group Financial Report</h2>
            <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-md uppercase tracking-wider">Verified Report</span>
          </div>
          
          {/* Right QR */}
          <div className="flex flex-col items-end shrink-0 hidden sm:flex">
            <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm mb-1 z-10 relative">
              <QRCodeSVG value={verificationUrl} size={64} level="M" />
            </div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider z-10 relative">Scan to verify</span>
          </div>
        </div>

        {/* METADATA BAR */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 rounded-xl border border-slate-200 p-4 mb-6 text-xs md:text-sm gap-4">
          <div className="flex flex-col gap-1">
            <p><span className="text-slate-500 font-semibold">Group:</span> <span className="text-slate-900 font-bold ml-1">{group.name}</span></p>
            <p><span className="text-slate-500 font-semibold">Report ID:</span> <span className="text-slate-900 font-bold ml-1 font-mono">{reportId}</span></p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <p><span className="text-slate-500 font-semibold">Date:</span> <span className="text-slate-900 font-bold ml-1">{new Date().toLocaleDateString()}</span></p>
            <p><span className="text-slate-500 font-semibold">Currency:</span> <span className="text-slate-900 font-bold ml-1">INR</span></p>
            <p><span className="text-slate-500 font-semibold">Status:</span> <span className="text-green-600 font-bold ml-1 uppercase">ACTIVE</span></p>
          </div>
        </div>

        {/* KPI SECTION */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-white border border-slate-200 border-t-4 border-t-primary-600 rounded-2xl shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500 mb-1 tracking-wider">Total Expenses</p>
            <p className="text-xl md:text-2xl font-bold text-slate-900">₹{summary?.totalExpense?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="p-4 bg-white border border-slate-200 border-t-4 border-t-indigo-500 rounded-2xl shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500 mb-1 tracking-wider">Total Members</p>
            <p className="text-xl md:text-2xl font-bold text-slate-900">{totalMembers}</p>
          </div>
          <div className="p-4 bg-white border border-slate-200 border-t-4 border-t-green-600 rounded-2xl shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500 mb-1 tracking-wider">Settled Amount</p>
            <p className="text-xl md:text-2xl font-bold text-green-600">₹{settlements?.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.amount, 0).toFixed(2) || '0.00'}</p>
          </div>
          <div className="p-4 bg-white border border-slate-200 border-t-4 border-t-orange-500 rounded-2xl shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500 mb-1 tracking-wider">Pending Dues</p>
            <p className="text-xl md:text-2xl font-bold text-orange-600">₹{summary?.totalOwed?.toFixed(2) || '0.00'}</p>
          </div>
        </div>

        {/* MEMBER SUMMARY TABLE */}
        <div className="mb-8 w-full overflow-x-auto">
          <div className="flex items-center gap-2 mb-3 min-w-max">
            <Users size={18} className="text-primary-600" strokeWidth={2.5} />
            <h3 className="text-base font-bold text-slate-900">Member Financial Summary</h3>
          </div>
          <div className="border border-slate-200 rounded-xl overflow-hidden min-w-[500px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider w-10"></th>
                  <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider">Member Name</th>
                  <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-right">Paid</th>
                  <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-right">Share</th>
                  <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {memberList.map((record, idx) => {
                  const member = members.find(m => m.user?._id?.toString() === (record.user?._id?.toString() || record.user?.toString()));
                  const balance = record.netBalance || 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <img src={member?.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member?.user?.name || 'User')}`} className="w-8 h-8 min-w-8 min-h-8 object-cover shrink-0 rounded-full border-2 border-primary-100" alt="avatar" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-sm text-slate-900">{member?.user?.name || 'Unknown User'}</div>
                        <div className="text-xs text-slate-500">{member?.user?.email}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-sm text-slate-600">₹{record.totalPaid?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-medium text-sm text-slate-600">₹{record.totalShare?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-block font-bold text-xs px-3 py-1 rounded-full ${
                          balance > 0 ? 'bg-green-100 text-green-700' : 
                          balance < 0 ? 'bg-red-100 text-red-700' : 
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {balance > 0 ? `+₹${balance.toFixed(2)}` : balance < 0 ? `-₹${Math.abs(balance).toFixed(2)}` : 'SETTLED'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SETTLEMENTS SECTION (Compact Summary if present) */}
        {completedSettlements.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <HandCoins size={18} className="text-green-600" strokeWidth={2.5} />
              <h3 className="text-base font-bold text-slate-900">Settlements Summary</h3>
              <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">
                {completedSettlements.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {completedSettlements.map((settlement, i) => (
                <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 border-l-4 border-l-green-600 shadow-xs">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                      <span className="truncate">{settlement.payerId?.name?.split(' ')[0]}</span>
                      <span className="text-slate-400">→</span>
                      <span className="truncate">{settlement.receiverId?.name?.split(' ')[0]}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">{new Date(settlement.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="text-xs font-bold text-green-600 shrink-0">₹{settlement.amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ALL EXPENSES BREAKDOWN SECTION */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-primary-600" strokeWidth={2.5} />
              <h3 className="text-base font-bold text-slate-900">Expenses Breakdown</h3>
              <span className="text-xs font-bold text-primary-700 bg-primary-100 px-2.5 py-0.5 rounded-full">
                {allExpenses.length} Items
              </span>
            </div>
            <span className="text-xs text-slate-400 font-medium">Detailed Payer & Split Info</span>
          </div>

          {allExpenses.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No expenses recorded in this group.
            </p>
          ) : (
            <div className={gridColsClass}>
              {allExpenses.map((expense, i) => {
                const payerName = getPayerName(expense, members);
                const participants = getParticipants(expense, members);

                return (
                  <div 
                    key={expense._id || i} 
                    className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 border-l-4 border-l-primary-600 shadow-xs hover:border-slate-300 transition-all"
                  >
                    <div className="min-w-0 pr-2 flex-1">
                      {/* Category & Description */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-bold text-primary-700 bg-primary-100 px-1.5 py-0.5 rounded uppercase shrink-0">
                          {expense.category || 'General'}
                        </span>
                        <p className="text-xs font-semibold text-slate-900 truncate" title={expense.description}>
                          {expense.description}
                        </p>
                      </div>

                      {/* Payer Name & Participant Avatar Stack */}
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="truncate">
                          By <strong className="text-slate-800 font-semibold">{payerName}</strong>
                        </span>
                        <span className="text-slate-300">•</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px] text-slate-400">For:</span>
                          <div className="flex items-center -space-x-1.5 overflow-hidden">
                            {participants.slice(0, 4).map((p, pIdx) => (
                              <img 
                                key={pIdx}
                                src={p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'U')}`}
                                alt={p.name}
                                title={`Split participant: ${p.name}`}
                                className="inline-block h-4 w-4 rounded-full ring-1 ring-white object-cover"
                              />
                            ))}
                            {participants.length > 4 && (
                              <span className="flex items-center justify-center h-4 w-4 rounded-full bg-slate-100 text-[7px] font-bold text-slate-600 ring-1 ring-white">
                                +{participants.length - 4}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Amount & Date */}
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-900">
                        ₹{expense.amount.toFixed(2)}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        {new Date(expense.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SIGNATURE SECTION */}
        <div className="border-t-2 border-slate-100 pt-8 mt-auto relative bg-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 relative z-10">
            <div className="w-full sm:w-48">
              <div className="mb-4 opacity-80">
                <Barcode value={reportId} height={30} width={1.5} displayValue={false} margin={0} background="transparent" lineColor="#1E293B" />
                <p className="text-xs font-medium text-slate-400 tracking-widest mt-1">{reportId}</p>
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Prepared By</p>
              <p className="text-sm font-bold text-slate-900">SmartSplit Engine</p>
            </div>

            <div className="w-full sm:w-48 sm:text-right">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Authorized By</p>
              <div className="mb-2 flex sm:justify-end">
                <div className="w-32 border-b border-slate-300 pb-2 flex sm:justify-end">
                  <span className="font-signature text-2xl text-blue-900 opacity-90 transform -rotate-2">Akhlaque Rahman</span>
                </div>
              </div>
              <p className="text-sm font-bold text-slate-900">Akhlaque Rahman</p>
            </div>
          </div>
          <div className="text-center mt-8 text-xs text-slate-400 font-medium">
            Generated by SmartSplit • Verified Document
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReportPreview;
