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

const PrintableReport = React.forwardRef(({ group }, ref) => {
  if (!group) return null;

  const { summary, expenses, settlements, members } = group;

  const memberList = summary?.memberBalances || [];
  const totalMembers = members?.length || 0;

  // Sort expenses and settlements descending (newest first)
  const allExpenses = [...(expenses || [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
  const completedSettlements = [...(settlements || [])]
    .filter(s => s.status === 'completed')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const reportId = `SSR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  const verificationUrl = `https://smartsplitakhlaque.vercel.app/report/verify/${reportId}`;

  // Dynamic layout calculation based on total expenses count
  const expCount = allExpenses.length;
  const isUltraDense = expCount > 45;
  const isMediumDense = expCount > 20 && expCount <= 45;
  
  // Grid columns: 3 columns for medium to high volume (fits 50-80 expenses in 1 page)
  const expGridClass = expCount > 20 ? "grid grid-cols-3 gap-1.5" : "grid grid-cols-2 gap-2";

  return (
    <div ref={ref} className="print-container bg-[#FFFFFF] text-[#475569] mx-auto relative font-sans border-t-[4px] border-[#2563EB]" style={{ width: '794px', minHeight: '1123px', padding: '32px 36px', boxSizing: 'border-box' }}>
      
      {/* WATERMARK */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden" style={{ opacity: 0.02 }}>
        <h1 className="text-[140px] font-black uppercase text-slate-900 -rotate-45 select-none whitespace-nowrap tracking-tighter">SMARTSPLIT</h1>
      </div>

      {/* CONFIDENTIAL WATERMARK (TOP RIGHT) */}
      <div className="absolute top-[24px] right-[36px] pointer-events-none z-0 opacity-[0.08]">
        <span className="text-[13px] font-black uppercase text-[#2563EB] tracking-[0.2em] border-2 border-[#2563EB] px-2 py-0.5 rounded">Confidential</span>
      </div>

      {/* MAIN WRAPPER */}
      <div className="relative z-10 flex flex-col min-h-[1050px]">
      
      {/* ENTERPRISE HEADER SECTION */}
      <div className="flex items-start pt-[10px] pb-[10px] gap-[24px] mb-2 border-b border-[#CBD5E1] avoid-break relative z-10">
        
        {/* Left Company Header (30%) */}
        <div className="w-[30%] flex flex-col gap-1.5">
          <div className="flex gap-2 items-center mb-0.5">
            <div className="w-[34px] h-[34px] bg-[#DBEAFE] rounded-[8px] flex items-center justify-center shrink-0">
              <FileText size={18} className="text-[#2563EB]" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-[15px] font-[700] tracking-tight text-[#1E293B] leading-none mb-1">SmartSplit</h1>
              <p className="text-[7px] font-[600] text-[#475569] uppercase tracking-[0.05em] leading-tight">Expense Platform</p>
            </div>
          </div>
          <div className="text-[8px] text-[#475569] space-y-0.5">
            <p><span className="font-[600]">P:</span> +91 9631801329</p>
            <p><span className="font-[600]">E:</span> support@smartsplit.com</p>
            <p><span className="font-[600]">W:</span> smartsplitakhlaque.vercel.app</p>
          </div>
        </div>

        {/* Center Title (45%) */}
        <div className="w-[45%] flex flex-col items-center justify-center text-center mt-0.5">
          <h2 className="text-[17px] font-[800] text-[#1E293B] tracking-[0.05em] uppercase mb-1">Group Financial Report</h2>
          <div className="flex gap-1.5 items-center mb-1">
            <span className="text-[8px] font-[700] bg-[#DCFCE7] text-[#16A34A] px-1.5 py-0.5 rounded uppercase tracking-wider">Verified Report</span>
          </div>
          <p className="text-[9.5px] font-[600] text-[#475569] mb-0.5">Official Expense Sharing Statement</p>
          <span className="text-[7.5px] text-[#94A3B8] font-[500] uppercase tracking-widest">Version 1.0</span>
        </div>
        
        {/* Right QR (25%) */}
        <div className="w-[25%] flex flex-col items-end shrink-0 bg-white">
          <div className="p-1 bg-white border border-[#CBD5E1] rounded-[6px] shadow-sm mb-1 z-10 relative">
            <QRCodeSVG value={verificationUrl} size={58} level="M" />
          </div>
          <span className="text-[7.5px] font-[600] text-[#64748B] uppercase tracking-wider pr-1 z-10 relative">Scan to verify</span>
        </div>
      </div>

      {/* METADATA BAR */}
      <div className="flex justify-between items-center bg-[#F8FAFC] rounded-[8px] border border-[#E2E8F0] px-3 py-1.5 mb-2 text-[8.5px] avoid-break">
        <div className="flex gap-4">
          <p><span className="text-[#64748B] font-[600]">Group:</span> <span className="text-[#1E293B] font-[700] ml-1">{group.name}</span></p>
          <p><span className="text-[#64748B] font-[600]">Report ID:</span> <span className="text-[#1E293B] font-[700] ml-1 font-mono">{reportId}</span></p>
        </div>
        <div className="flex gap-4">
          <p><span className="text-[#64748B] font-[600]">Date:</span> <span className="text-[#1E293B] font-[700] ml-1">{new Date().toLocaleDateString()}</span></p>
          <p><span className="text-[#64748B] font-[600]">Time:</span> <span className="text-[#1E293B] font-[700] ml-1">{new Date().toLocaleTimeString()}</span></p>
          <p><span className="text-[#64748B] font-[600]">Currency:</span> <span className="text-[#1E293B] font-[700] ml-1">INR</span></p>
          <p><span className="text-[#64748B] font-[600]">Status:</span> <span className="text-[#16A34A] font-[700] ml-1 uppercase">ACTIVE</span></p>
        </div>
      </div>

      {/* KPI SECTION */}
      <div className="grid grid-cols-4 gap-2.5 mb-2.5 avoid-break">
        <div className="px-3 py-2 bg-white border border-[#CBD5E1] border-t-[3px] border-t-[#2563EB] rounded-[8px] flex flex-col justify-center h-[52px]">
          <p className="text-[8.5px] font-[600] uppercase text-[#475569] mb-0.5 tracking-wider">Total Expenses</p>
          <p className="text-[15px] font-[700] text-[#1E293B] leading-none">₹{summary?.totalExpense?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="px-3 py-2 bg-white border border-[#CBD5E1] border-t-[3px] border-t-[#6366F1] rounded-[8px] flex flex-col justify-center h-[52px]">
          <p className="text-[8.5px] font-[600] uppercase text-[#475569] mb-0.5 tracking-wider">Total Members</p>
          <p className="text-[15px] font-[700] text-[#1E293B] leading-none">{totalMembers}</p>
        </div>
        <div className="px-3 py-2 bg-white border border-[#CBD5E1] border-t-[3px] border-t-[#16A34A] rounded-[8px] flex flex-col justify-center h-[52px]">
          <p className="text-[8.5px] font-[600] uppercase text-[#475569] mb-0.5 tracking-wider">Settled Amount</p>
          <p className="text-[15px] font-[700] text-[#16A34A] leading-none">₹{settlements?.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.amount, 0).toFixed(2) || '0.00'}</p>
        </div>
        <div className="px-3 py-2 bg-white border border-[#CBD5E1] border-t-[3px] border-t-[#D97706] rounded-[8px] flex flex-col justify-center h-[52px]">
          <p className="text-[8.5px] font-[600] uppercase text-[#475569] mb-0.5 tracking-wider">Pending Dues</p>
          <p className="text-[15px] font-[700] text-[#D97706] leading-none">₹{summary?.totalOwed?.toFixed(2) || '0.00'}</p>
        </div>
      </div>

      {/* MEMBER SUMMARY TABLE */}
      <div className="mb-2.5 avoid-break">
        <div className="flex items-center gap-1.5 mb-1">
          <Users size={13} className="text-[#2563EB]" strokeWidth={2.5} />
          <h3 className="text-[13px] font-[700] text-[#1E293B]">Member Financial Summary</h3>
        </div>
        
        <div className="border border-[#CBD5E1] rounded-[6px] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#EFF6FF] text-[#475569]">
                <th className="py-1 pl-2.5 font-[700] text-[9.5px] uppercase tracking-wider w-[24px]"></th>
                <th className="py-1 font-[700] text-[9.5px] uppercase tracking-wider">Member Name</th>
                <th className="py-1 font-[700] text-[9.5px] uppercase tracking-wider text-right w-[80px]">Paid</th>
                <th className="py-1 font-[700] text-[9.5px] uppercase tracking-wider text-right w-[80px]">Share</th>
                <th className="py-1 pr-2.5 font-[700] text-[9.5px] uppercase tracking-wider text-right w-[95px]">Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {memberList.map((record, idx) => {
                const member = members.find(m => m.user?._id?.toString() === (record.user?._id?.toString() || record.user?.toString()));
                const balance = record.netBalance || 0;
                return (
                  <tr key={idx} className="even:bg-[#FAFBFC] border-t border-[#E2E8F0]">
                    <td className="py-1 pl-2.5">
                      <img src={member?.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member?.user?.name || 'User')}`} className="w-[18px] h-[18px] min-w-[18px] min-h-[18px] object-cover shrink-0 rounded-full border border-[#DBEAFE]" alt="avatar" />
                    </td>
                    <td className="py-1">
                      <span className="font-[600] text-[10px] text-[#1E293B] leading-tight mr-2">{member?.user?.name || 'Unknown User'}</span>
                      <span className="text-[8.5px] text-[#64748B]">{member?.user?.email}</span>
                    </td>
                    <td className="py-1 text-right font-[500] text-[10px] text-[#475569]">₹{record.totalPaid?.toFixed(2)}</td>
                    <td className="py-1 text-right font-[500] text-[10px] text-[#475569]">₹{record.totalShare?.toFixed(2)}</td>
                    <td className="py-1 pr-2.5 text-right">
                      <span className={`inline-block font-[700] text-[8.5px] px-1.5 py-0.2 rounded-full ${
                        balance > 0 ? 'bg-[#DCFCE7] text-[#16A34A]' : 
                        balance < 0 ? 'bg-[#FEE2E2] text-[#DC2626]' : 
                        'bg-[#F1F5F9] text-[#475569]'
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

      {/* SETTLEMENTS SECTION (Compact row if exists) */}
      {completedSettlements.length > 0 && (
        <div className="mb-2.5 avoid-break">
          <div className="flex items-center gap-1.5 mb-1">
            <HandCoins size={13} className="text-[#16A34A]" strokeWidth={2.5} />
            <h3 className="text-[13px] font-[700] text-[#1E293B]">Settlements Summary ({completedSettlements.length})</h3>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {completedSettlements.map((settlement, i) => (
              <div key={i} className="flex justify-between items-center bg-white py-1 px-2 rounded-[5px] border border-[#CBD5E1] border-l-[3px] border-l-[#16A34A]">
                <div className="min-w-0 pr-1 truncate">
                  <span className="text-[9.5px] font-[700] text-[#1E293B]">{settlement.payerId?.name?.split(' ')[0]}</span>
                  <span className="text-[8px] text-[#64748B] mx-0.5">→</span>
                  <span className="text-[9.5px] font-[700] text-[#475569]">{settlement.receiverId?.name?.split(' ')[0]}</span>
                </div>
                <span className="text-[9.5px] font-[700] text-[#16A34A] shrink-0">₹{settlement.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALL EXPENSES BREAKDOWN SECTION */}
      <div className="mb-4 flex-1">
        <div className="flex items-center justify-between gap-1.5 mb-1.5 avoid-break">
          <div className="flex items-center gap-1.5">
            <Receipt size={13} className="text-[#2563EB]" strokeWidth={2.5} />
            <h3 className="text-[13px] font-[700] text-[#1E293B]">Expenses Breakdown</h3>
            <span className="text-[9px] font-[700] bg-[#DBEAFE] text-[#2563EB] px-1.5 py-0.2 rounded-full">
              {allExpenses.length} Items
            </span>
          </div>
          <span className="text-[8px] font-[500] text-[#94A3B8]">Detailed Payer & Split Info</span>
        </div>

        {allExpenses.length === 0 ? (
          <p className="text-[10px] text-[#475569] py-2 text-center bg-[#F8FAFC] rounded border border-dashed border-[#CBD5E1]">
            No expenses recorded.
          </p>
        ) : (
          <div className={expGridClass}>
            {allExpenses.map((expense, i) => {
              const payerName = getPayerName(expense, members);
              const participants = getParticipants(expense, members);

              return (
                <div 
                  key={expense._id || i} 
                  className={`flex justify-between items-center bg-white rounded-[5px] border border-[#CBD5E1] border-l-[3px] border-l-[#2563EB] avoid-break ${
                    isUltraDense ? 'py-1 px-1.5' : isMediumDense ? 'py-1.5 px-2' : 'py-1.5 px-2.5'
                  }`}
                >
                  <div className="min-w-0 pr-1.5 flex-1">
                    {/* Category & Description */}
                    <div className="flex items-center gap-1 leading-none mb-1">
                      <span className={`font-[700] text-[#2563EB] bg-[#DBEAFE] rounded uppercase shrink-0 ${
                        isUltraDense ? 'text-[6.5px] px-1 py-[0.1px]' : 'text-[7.5px] px-1 py-[0.5px]'
                      }`}>
                        {expense.category || 'General'}
                      </span>
                      <p className={`font-[700] text-[#1E293B] truncate leading-tight ${
                        isUltraDense ? 'text-[8.5px]' : isMediumDense ? 'text-[9.5px]' : 'text-[10px]'
                      }`} title={expense.description}>
                        {expense.description}
                      </p>
                    </div>

                    {/* Payer Name & Participant Avatar Stack */}
                    <div className="flex items-center gap-1 leading-none">
                      <span className={`text-[#64748B] truncate ${isUltraDense ? 'text-[7px]' : 'text-[8px]'}`}>
                        By <strong className="text-[#1E293B] font-[600]">{payerName}</strong>
                      </span>
                      <span className="text-[#CBD5E1]">•</span>
                      <div className="flex items-center -space-x-1 shrink-0">
                        {participants.slice(0, 3).map((p, pIdx) => (
                          <img 
                            key={pIdx}
                            src={p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'U')}`}
                            alt={p.name}
                            title={`Split: ${p.name}`}
                            className="inline-block h-[12px] w-[12px] rounded-full ring-1 ring-white object-cover"
                          />
                        ))}
                        {participants.length > 3 && (
                          <span className="flex items-center justify-center h-[12px] w-[12px] rounded-full bg-[#F1F5F9] text-[6px] font-[700] text-[#475569] ring-1 ring-white">
                            +{participants.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`font-[700] text-[#1E293B] ${
                      isUltraDense ? 'text-[9px]' : isMediumDense ? 'text-[9.5px]' : 'text-[10.5px]'
                    }`}>
                      ₹{expense.amount.toFixed(2)}
                    </p>
                    <p className={`text-[#94A3B8] leading-none mt-0.5 ${isUltraDense ? 'text-[6.5px]' : 'text-[7.5px]'}`}>
                      {new Date(expense.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SIGNATURE SECTION (BOTTOM) */}
      <div className="border-t-[2px] border-[#E2E8F0] pt-4 mt-auto avoid-break z-10 bg-white relative w-full shrink-0">
        
        {/* Digital Stamp Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none -mt-4 opacity-[0.06]">
          <div className="w-[100px] h-[100px] rounded-full border-4 border-[#2563EB] flex items-center justify-center -rotate-12">
            <div className="w-[90px] h-[90px] rounded-full border border-[#2563EB] flex items-center justify-center text-center">
              <span className="text-[#2563EB] font-black text-[11px] uppercase leading-tight tracking-widest px-2">SmartSplit<br/>Verified</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end relative z-10">
          {/* Left: Prepared By & Barcode */}
          <div className="w-[180px] pb-0.5 flex flex-col justify-end">
            <div className="mb-2 opacity-80">
              <div className="h-[20px] overflow-hidden flex justify-start">
                <Barcode value={reportId} height={20} width={1.2} displayValue={false} margin={0} background="transparent" lineColor="#1E293B" />
              </div>
              <p className="text-[7px] font-[500] text-[#94A3B8] tracking-widest mt-0.5">Report ID: {reportId}</p>
            </div>
            <p className="text-[8.5px] text-[#64748B] font-[600] uppercase tracking-wider mb-1">Prepared By</p>
            <p className="text-[10px] font-[700] text-[#1E293B] mb-0.5">SmartSplit Financial Engine</p>
            <p className="text-[8px] text-[#64748B]">Auto Generated Document</p>
          </div>

          {/* Center: Notice */}
          <div className="flex-1 text-center pb-0.5">
            <p className="text-[9.5px] font-[600] text-[#1E293B] mb-0.5">Electronically Generated</p>
            <p className="text-[8.5px] text-[#64748B]">No Physical Signature Required</p>
          </div>

          {/* Right: Authorized By */}
          <div className="w-[180px] text-right">
            <p className="text-[8.5px] text-[#64748B] font-[600] uppercase tracking-wider mb-1">Authorized By</p>
            <div className="mb-1 flex justify-end">
              <div className="w-[140px] border-b border-[#CBD5E1] pb-1 flex justify-end">
                <span className="font-signature text-[24px] text-[#1E3A8A] leading-none opacity-95 block transform -rotate-3 origin-bottom-right">Akhlaque Rahman</span>
              </div>
            </div>
            <p className="text-[10px] font-[700] text-[#1E293B] mb-0.5">Akhlaque Rahman</p>
            <p className="text-[8px] text-[#64748B] leading-tight">Founder & Full Stack Developer<br/>SmartSplit Technologies</p>
          </div>
        </div>
        
        {/* Footnote */}
        <div className="text-center mt-3 text-[7.5px] text-[#94A3B8] font-[500] tracking-wide">
          This financial statement is generated directly from SmartSplit and reflects the system state at the time of report generation.
          <br/>Page 1 • {reportId}
        </div>
      </div>

      </div>

    </div>
  );
});

export default PrintableReport;
