import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  X, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ExternalLink,
  Loader2,
  Users
} from 'lucide-react';
import api from '../../utils/api';
import { generateGroupReportPdf } from '../../utils/reportExportUtils';

const EmailReportModal = ({
  isOpen,
  onClose,
  group,
  expenses = [],
  settlements = [],
  summary = {},
  currentUser
}) => {
  const members = group?.members || [];
  const groupName = group?.name || 'Group';
  const defaultSubject = `[SmartSplit] Financial Report - ${groupName}`;

  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [note, setNote] = useState(`Please find attached the official group financial statement and audit summary for ${groupName}.`);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  useEffect(() => {
    if (isOpen && group) {
      setSubject(`[SmartSplit] Financial Report - ${groupName}`);
      setNote(`Please find attached the official group financial statement and audit summary for ${groupName}.`);
      setStatusMessage(null);
    }
  }, [isOpen, group?._id, groupName]);

  if (!isOpen || !group) return null;

  const handleSelectMember = (email) => {
    if (!email) return;
    setRecipientEmail(email);
    setStatusMessage(null);
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid recipient email address.' });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);

    try {
      // 1. Generate crisp A4 PDF using jsPDF and extract pure Base64 payload
      const doc = generateGroupReportPdf(group, expenses, settlements, summary);
      const rawDataUri = doc.output('datauristring');
      const pdfBase64 = rawDataUri.includes('base64,')
        ? rawDataUri.slice(rawDataUri.indexOf('base64,') + 7)
        : rawDataUri;

      // 2. Send via Backend API
      const response = await api.post(`/groups/${group._id}/send-report-email`, {
        recipientEmail: recipientEmail.trim(),
        subject: subject.trim(),
        note: note.trim(),
        pdfBase64: pdfBase64,
        summary: {
          totalExpense: summary?.totalExpense || 0,
          settledAmount: (settlements || [])
            .filter(s => s.status === 'completed' || s.status === 'admin_approved')
            .reduce((sum, s) => sum + Number(s.amount || 0), 0),
          pendingDues: summary?.totalOwed || 0,
          totalMembers: members.length
        }
      });

      setStatusMessage({
        type: 'success',
        text: response.data?.message || `Report PDF statement successfully sent to ${recipientEmail}!`
      });

      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err) {
      console.error('Failed to send email:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to send email. Please try again.';
      setStatusMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenMailto = () => {
    const totalExp = Number(summary?.totalExpense || 0).toFixed(2);
    const bodyText = `${note}\n\nGroup: ${groupName}\nTotal Expenses: Rs. ${totalExp}\nMembers: ${members.length}\n\nView Online: ${window.location.href}`;
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    window.open(mailtoUrl, '_blank');
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-5 px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-xs">
                <Mail size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Email Financial Report
                </h3>
                <p className="text-xs text-slate-400">
                  Sends official verified statement PDF as attachment
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSendEmail} className="p-6 space-y-4">
            
            {/* Status Feedback */}
            {statusMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </motion.div>
            )}

            {/* Recipient Email Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Recipient Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.g. member@gmail.com"
                value={recipientEmail}
                onChange={(e) => {
                  setRecipientEmail(e.target.value);
                  setStatusMessage(null);
                }}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-2xs"
              />
            </div>

            {/* Member Quick-Fill Chips */}
            {members.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <Users size={12} /> Quick-fill Group Member:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-[72px] overflow-y-auto">
                  {members.map((m, idx) => {
                    const u = m.user || {};
                    const email = u.email;
                    if (!email) return null;
                    const isSelected = recipientEmail.toLowerCase() === email.toLowerCase();

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectMember(email)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
                        }`}
                      >
                        <span className="truncate max-w-[90px]">{u.name || 'Member'}</span>
                        <span className="text-[9px] opacity-70 truncate max-w-[110px]">({email})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Subject Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Note / Message Textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Message / Note (Optional)
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add an optional message..."
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all resize-none"
              />
            </div>

            {/* Attachment Preview Card */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0 font-black text-[10px]">
                  PDF
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    SmartSplit_{groupName.replace(/[^a-zA-Z0-9]/g, '_')}_Statement.pdf
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Official Verified Financial Statement (A4 PDF)
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
                Attached
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleOpenMailto}
                className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer transition-colors"
                title="Open in your default email client"
              >
                <ExternalLink size={12} /> Open in Email App
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  {isSending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Sending PDF...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Send PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EmailReportModal;
