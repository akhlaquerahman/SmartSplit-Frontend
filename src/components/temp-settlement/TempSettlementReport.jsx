import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  MessageCircle,
  ArrowRight,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  formatInr,
  buildWhatsAppSummaryText,
  downloadTempSettlementPdf
} from '../../utils/tempSettlementEngine';

const TempSettlementReport = ({ trip, summary }) => {
  const [copied, setCopied] = useState(false);

  const handleCopySummary = () => {
    const text = buildWhatsAppSummaryText(trip, summary);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPdf = () => {
    downloadTempSettlementPdf(trip, summary);
  };

  const handleDownloadTxt = () => {
    const text = buildWhatsAppSummaryText(trip, summary);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (trip.name || 'Temp_Trip').trim().replace(/[^a-zA-Z0-9_-]+/g, '_');
    link.href = url;
    link.download = `${safeName}_Settlement_Summary.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenWhatsApp = () => {
    const text = buildWhatsAppSummaryText(trip, summary);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4">
      {/* Download & WhatsApp Share Card */}
      <div className="bg-white dark:bg-[#16181d] rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileText size={18} className="text-primary-600 dark:text-primary-400" />
              Final Settlement Report
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Download the PDF report to attach and send manually on WhatsApp, or share text summary directly.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-primary-500/25 transition-all active:scale-95"
          >
            <Download size={15} strokeWidth={2.5} /> Download PDF Report
          </button>

          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <MessageCircle size={15} strokeWidth={2.5} /> Send Text on WhatsApp
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            {copied ? 'Copied Summary!' : 'Copy Report Text'}
          </button>

          <button
            type="button"
            onClick={handleDownloadTxt}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
          >
            <Download size={14} /> Download .TXT
          </button>
        </div>
      </div>

      {/* Who Pays Whom */}
      <div className="bg-white dark:bg-[#16181d] rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Who Pays Whom
          </h3>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {summary.settlements.length} {summary.settlements.length === 1 ? 'transfer' : 'transfers'}
          </span>
        </div>

        {summary.settlements.length === 0 ? (
          <div className="p-5 rounded-xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={20} className="shrink-0" />
            <div>
              <p className="text-xs font-black">All Settled!</p>
              <p className="text-[11px] opacity-80">
                {trip.expenses.length === 0
                  ? 'Add trip expenses to calculate who owes whom.'
                  : 'Every member has an even balance.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {summary.settlements.map((item, idx) => (
              <div
                key={`${item.fromId}_${item.toId}_${idx}`}
                className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-black truncate">
                    {item.fromName}
                  </span>
                  <ArrowRight size={14} className="text-slate-400 shrink-0" />
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black truncate">
                    {item.toName}
                  </span>
                </div>
                <span className="text-sm font-black text-slate-900 dark:text-white shrink-0">
                  {formatInr(item.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Member Breakdown */}
      <div className="bg-white dark:bg-[#16181d] rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm p-5">
        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">
          Member Balances
        </h3>

        <div className="space-y-2">
          {summary.memberBalances.map((member) => {
            const isPositive = member.netBalance > 0.01;
            const isNegative = member.netBalance < -0.01;
            return (
              <div
                key={member.memberId}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/70"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{member.name}</p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Paid {formatInr(member.totalPaid)} • Share {formatInr(member.totalShare)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={cn(
                      'inline-block px-2.5 py-1 rounded-lg text-xs font-black',
                      isPositive
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : isNegative
                          ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    )}
                  >
                    {isPositive
                      ? `+${formatInr(member.netBalance)}`
                      : isNegative
                        ? `-${formatInr(Math.abs(member.netBalance))}`
                        : 'Settled'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TempSettlementReport;

