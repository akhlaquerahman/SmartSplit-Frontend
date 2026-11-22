import React, { useState, useMemo, useRef, useImperativeHandle } from 'react';
import { 
  FileText, 
  Users, 
  HandCoins, 
  Receipt, 
  Printer, 
  Download, 
  Edit3, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  ArrowRight, 
  ShieldCheck, 
  Plus, 
  CreditCard,
  AlertCircle,
  HelpCircle,
  Sparkles,
  History,
  Calendar,
  X,
  ZoomIn,
  Info,
  Check,
  Copy,
  Share2,
  ExternalLink
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from '../../utils/html2canvas';
import ProofViewer from '../ProofViewer';
import useGroupStore from '../../store/useGroupStore';

// Official WhatsApp Brand SVG Icon
export const WhatsAppIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

// Helper to safely resolve payer name
const getPayerName = (expense, members) => {
  if (expense.paidBy?.name) return expense.paidBy.name;
  if (typeof expense.paidBy === 'string' || expense.paidBy?._id) {
    const pId = (expense.paidBy?._id || expense.paidBy).toString();
    const found = members?.find(m => (m.user?._id || m.user || '').toString() === pId);
    if (found?.user?.name) return found.user.name;
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

// Helper to determine if an expense has been edited
const isExpenseEdited = (expense) => {
  if (!expense) return false;
  if (expense.isEdited) return true;
  if (expense.editHistory && expense.editHistory.length > 0) return true;
  if (expense.updatedAt && expense.createdAt) {
    return new Date(expense.updatedAt).getTime() - new Date(expense.createdAt).getTime() > 1000;
  }
  return false;
};

const EnterpriseGroupReport = React.forwardRef(({
  group,
  expenses = [],
  settlements = [],
  currentUser,
  isAdmin,
  onEditExpense,
  onDeleteExpense,
  onViewReceipt,
  onRespondSettlement,
  onOpenAddExpense,
  onOpenSettlement,
  onDownloadPdf
}, ref) => {
  if (!group) return null;

  const reportCardRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [payerFilter, setPayerFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [respondingId, setRespondingId] = useState(null);

  // Modal / Drawer UI State
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseDrawerTab, setExpenseDrawerTab] = useState('overview'); // 'overview' | 'history'
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [expenseHistoryList, setExpenseHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeProofUrl, setActiveProofUrl] = useState(null);

  // WhatsApp Image Share State
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [whatsappModalData, setWhatsappModalData] = useState(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const { summary, members = [] } = group;
  const memberList = summary?.memberBalances || [];
  const totalMembers = members?.length || 0;

  // Report identifier
  const reportId = useMemo(() => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const hash = (group._id || '0000').slice(-4).toUpperCase();
    return `SSR-${dateStr}-${hash}`;
  }, [group._id]);

  const verificationUrl = `https://smartsplitakhlaque.vercel.app/report/verify/${reportId}`;

  // Current user's balance
  const currentMemberRecord = useMemo(() => {
    if (!currentUser?._id || !memberList) return null;
    return memberList.find(r => (r.user?._id || r.user || '').toString() === currentUser._id.toString());
  }, [memberList, currentUser]);

  const currentBalance = currentMemberRecord?.netBalance ?? 0;

  // Categorize settlements
  const pendingSettlements = useMemo(() => {
    return settlements.filter(s => s.status === 'pending');
  }, [settlements]);

  const completedSettlements = useMemo(() => {
    return settlements
      .filter(s => s.status === 'completed')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [settlements]);

  const totalSettledAmount = useMemo(() => {
    return completedSettlements.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  }, [completedSettlements]);

  // Unique categories for filter
  const categories = useMemo(() => {
    const set = new Set();
    expenses.forEach(e => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set);
  }, [expenses]);

  // Filtered & sorted expenses
  const filteredExpenses = useMemo(() => {
    return [...expenses]
      .filter(exp => {
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const descMatch = exp.description?.toLowerCase().includes(q);
          const payerMatch = getPayerName(exp, members).toLowerCase().includes(q);
          const catMatch = exp.category?.toLowerCase().includes(q);
          if (!descMatch && !payerMatch && !catMatch) return false;
        }
        if (categoryFilter !== 'all' && exp.category !== categoryFilter) return false;
        if (payerFilter !== 'all') {
          const pId = (exp.paidBy?._id || exp.paidBy || '').toString();
          if (pId !== payerFilter) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortOrder === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortOrder === 'highest') return (b.amount || 0) - (a.amount || 0);
        if (sortOrder === 'lowest') return (a.amount || 0) - (b.amount || 0);
        return 0;
      });
  }, [expenses, searchTerm, categoryFilter, payerFilter, sortOrder, members]);

  // Fetch expense edit history
  const loadExpenseHistory = async (expenseId) => {
    setLoadingHistory(true);
    try {
      const history = await useGroupStore.getState().fetchExpenseEditHistory(expenseId);
      setExpenseHistoryList(history || []);
    } catch (err) {
      console.error('Error fetching edit history:', err);
      setExpenseHistoryList([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Open expense detail modal
  const handleOpenExpenseDetails = (expense) => {
    setSelectedExpense(expense);
    setExpenseDrawerTab('overview');
    if (isExpenseEdited(expense)) {
      loadExpenseHistory(expense._id);
    } else {
      setExpenseHistoryList([]);
    }
  };

  // Open edit history modal directly
  const handleOpenExpenseHistory = (expense, e) => {
    if (e) e.stopPropagation();
    setSelectedExpense(expense);
    setExpenseDrawerTab('history');
    loadExpenseHistory(expense._id);
  };

  // Handle settlement response (accept/reject)
  const handleSettlementAction = async (settlementId, action) => {
    if (!onRespondSettlement) return;
    setRespondingId(settlementId);
    try {
      await onRespondSettlement(settlementId, action);
      if (selectedSettlement && selectedSettlement._id === settlementId) {
        setSelectedSettlement(null);
      }
    } finally {
      setRespondingId(null);
    }
  };

  // =========================================================================
  // ENTERPRISE ULTRA-HD WHATSAPP REPORT IMAGE GENERATION
  // =========================================================================
  const handleShareOnWhatsApp = async () => {
    if (!reportCardRef.current || isGeneratingImage) return;
    setIsGeneratingImage(true);

    try {
      const totalExp = Number(summary?.totalExpense || 0).toFixed(2);
      const settled = totalSettledAmount.toFixed(2);
      const pending = Number(summary?.totalOwed || 0).toFixed(2);
      const groupName = group.name || 'Group';

      const shareMessage = `📊 *SmartSplit - Group Financial Report*\n` +
        `📁 *Group:* ${groupName}\n` +
        `💰 *Total Expenses:* ₹${totalExp}\n` +
        `✅ *Settled Amount:* ₹${settled}\n` +
        `⏳ *Pending Dues:* ₹${pending}\n` +
        `👥 *Total Members:* ${totalMembers}\n\n` +
        `📄 *Report ID:* ${reportId}\n` +
        `✅ Official Verified Statement Image attached.`;

      // 2.5x Retina Supersampling ensures crisp vector-quality text & numbers
      const canvas = await html2canvas(reportCardRef.current, {
        scale: 2.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#FFFFFF',
        logging: false,
        imageTimeout: 10000,
        onclone: (clonedDoc) => {
          // Hide interactive buttons and filter controls from the generated image
          clonedDoc.querySelectorAll('[data-hide-on-export]').forEach((el) => {
            el.style.display = 'none';
          });

          // Ensure pristine white background and high-contrast text
          const clonedCard = clonedDoc.querySelector('[data-report-card]');
          if (clonedCard) {
            clonedCard.style.backgroundColor = '#FFFFFF';
            clonedCard.style.color = '#1E293B';
            clonedCard.style.boxShadow = 'none';
          }

          // Convert any external avatar images to crisp inline data-URL canvas circles to guarantee zero CORS/taint
          clonedDoc.querySelectorAll('img').forEach((img) => {
            try {
              if (img.src && !img.src.startsWith('data:')) {
                const name = img.alt || 'Member';
                const cleanName = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
                const initials = (cleanName.split(/\s+/).map(p => p[0]).join('').slice(0, 2) || 'U').toUpperCase();
                
                const c = document.createElement('canvas');
                c.width = 64;
                c.height = 64;
                const ctx = c.getContext('2d');
                if (ctx) {
                  ctx.fillStyle = '#2563EB';
                  ctx.beginPath();
                  ctx.arc(32, 32, 32, 0, Math.PI * 2);
                  ctx.fill();

                  ctx.fillStyle = '#FFFFFF';
                  ctx.font = 'bold 26px sans-serif';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(initials, 32, 34);

                  img.src = c.toDataURL('image/png');
                }
              }
            } catch (imgErr) {
              console.warn('Avatar sanitize warning:', imgErr);
            }
          });
        }
      });

      let blob;
      try {
        blob = await new Promise((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error('Canvas conversion to blob produced null'));
          }, 'image/png', 1.0);
        });
      } catch (blobErr) {
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], { type: mime });
      }
      const imageUrl = canvas.toDataURL('image/png', 1.0);
      const fileName = `SmartSplit_Report_${groupName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      const imageFile = new File([blob], fileName, { type: 'image/png' });

      // Try native Web Share API with file (Android / iOS / Modern Desktop)
      let sharedViaNative = false;
      if (navigator.canShare && navigator.canShare({ files: [imageFile] })) {
        try {
          await navigator.share({
            files: [imageFile],
            title: `${groupName} - Financial Report`,
            text: shareMessage
          });
          sharedViaNative = true;
        } catch (shareErr) {
          if (shareErr.name !== 'AbortError') {
            console.log('Native share failed or dismissed, falling back:', shareErr);
          }
        }
      }

      if (!sharedViaNative) {
        // Automatically copy to clipboard if supported
        let copied = false;
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            copied = true;
          }
        } catch (clipErr) {
          console.log('Clipboard direct write requires explicit user click:', clipErr);
        }

        setWhatsappModalData({
          imageUrl,
          blob,
          fileName,
          shareMessage,
          copiedToClipboard: copied
        });
      }
    } catch (err) {
      console.error('Error generating WhatsApp report image:', err);
      alert(`Could not render report image: ${err?.message || 'Please check console'}. Please try again.`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Expose handleShareOnWhatsApp to parent components via ref
  useImperativeHandle(ref, () => ({
    shareOnWhatsApp: handleShareOnWhatsApp
  }));

  const handleDownloadImageFile = () => {
    if (!whatsappModalData?.imageUrl) return;
    const a = document.createElement('a');
    a.href = whatsappModalData.imageUrl;
    a.download = whatsappModalData.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyImageToClipboard = async () => {
    if (!whatsappModalData?.blob) return;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': whatsappModalData.blob })
        ]);
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Failed to copy image to clipboard:', err);
    }
  };

  const handleOpenWhatsAppWeb = async () => {
    if (!whatsappModalData) return;
    // Ensure image is copied to clipboard right before redirecting
    await handleCopyImageToClipboard();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappModalData.shareMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Loading Overlay while rendering ultra-HD report */}
      {isGeneratingImage && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-2xl mb-4 animate-bounce">
            <WhatsAppIcon className="w-9 h-9 fill-white" />
          </div>
          <h3 className="text-xl font-black">Generating Crystal-Clear Report Image...</h3>
          <p className="text-sm text-slate-300 mt-1 max-w-sm">
            Rendering high-definition statement with all expenses, balances, barcode & official signature.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* THE OFFICIAL ENTERPRISE REPORT CARD                                       */}
      {/* ========================================================================= */}
      <div 
        ref={reportCardRef}
        data-report-card="true"
        className="w-full max-w-[1000px] mx-auto bg-white dark:bg-[#16181d] text-slate-700 dark:text-slate-300 rounded-2xl md:rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-black/40 border border-slate-200 dark:border-slate-800 border-t-8 border-t-primary-600 overflow-hidden relative transition-all"
      >
        
        {/* Subtle Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden opacity-[0.02] dark:opacity-[0.015]">
          <h1 className="text-7xl md:text-9xl font-black uppercase text-slate-900 dark:text-white -rotate-45 select-none whitespace-nowrap tracking-tighter">
            SMARTSPLIT
          </h1>
        </div>

        <div className="relative z-10 p-3.5 sm:p-5 md:p-8 flex flex-col h-full">

          {/* 1. REPORT HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
            {/* Top row on mobile: Brand on left, QR on right */}
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div className="flex gap-2.5 sm:gap-3.5 items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-50 dark:bg-primary-950/40 rounded-xl sm:rounded-2xl border border-primary-200 dark:border-primary-800/60 flex items-center justify-center shrink-0 shadow-xs">
                  <FileText size={20} className="text-primary-600 dark:text-primary-400 sm:w-6 sm:h-6" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">SmartSplit</h1>
                    <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-1.5 sm:px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                      Enterprise
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Official Financial Statement
                  </p>
                </div>
              </div>

              {/* Mobile QR Code */}
              <div className="sm:hidden flex flex-col items-end shrink-0">
                <div className="p-1 bg-white rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                  <QRCodeSVG value={verificationUrl} size={36} level="M" />
                </div>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  Verify
                </span>
              </div>
            </div>

            {/* Center Title & Verified Badge */}
            <div className="flex flex-col sm:items-center justify-center text-left sm:text-center">
              <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Group Financial Report
              </h2>
              <div className="flex items-center sm:justify-center gap-2 mt-0.5 sm:mt-1">
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <ShieldCheck size={12} strokeWidth={2.5} /> Verified Audit
                </span>
              </div>
            </div>

            {/* Desktop QR Code */}
            <div className="hidden sm:flex flex-col items-end shrink-0 self-center">
              <div className="p-1.5 bg-white rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <QRCodeSVG value={verificationUrl} size={48} level="M" />
              </div>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1 text-center">
                Scan to verify
              </span>
            </div>
          </div>

          {/* 2. METADATA BAR */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 md:p-4 my-6 text-xs gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6">
              <p>
                <span className="text-slate-400 font-semibold">Group:</span>{' '}
                <span className="text-slate-900 dark:text-white font-bold ml-1">{group.name}</span>
              </p>
              <p>
                <span className="text-slate-400 font-semibold">Report ID:</span>{' '}
                <span className="text-slate-900 dark:text-white font-mono font-bold ml-1">{reportId}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <p>
                <span className="text-slate-400 font-semibold">Date:</span>{' '}
                <span className="text-slate-800 dark:text-slate-200 font-bold ml-1">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </p>
              <p>
                <span className="text-slate-400 font-semibold">Currency:</span>{' '}
                <span className="text-slate-800 dark:text-slate-200 font-bold ml-1">INR (₹)</span>
              </p>
              <p>
                <span className="text-slate-400 font-semibold">Status:</span>{' '}
                <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1 uppercase">ACTIVE</span>
              </p>
            </div>
          </div>

          {/* 3. KPI FINANCIAL SUMMARY CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-t-4 border-t-primary-600 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Expenses</p>
              <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white truncate">
                ₹{Number(summary?.totalExpense || 0).toFixed(2)}
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-t-4 border-t-indigo-500 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Members</p>
              <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white truncate">
                {totalMembers}
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-t-4 border-t-emerald-500 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Settled Amount</p>
              <p className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">
                ₹{totalSettledAmount.toFixed(2)}
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-t-4 border-t-amber-500 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Pending Dues</p>
              <p className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400 truncate">
                ₹{Number(summary?.totalOwed || 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* User Financial Position Strip */}
          {currentMemberRecord && (
            <div className={`mb-8 p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
              currentBalance > 0 
                ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                : currentBalance < 0 
                ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
                : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                  currentBalance > 0 ? 'bg-emerald-600 text-white' : currentBalance < 0 ? 'bg-rose-600 text-white' : 'bg-slate-600 text-white'
                }`}>
                  ₹
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide">Your Net Standing</p>
                  <p className="text-sm font-semibold">
                    {currentBalance > 0 
                      ? `You are owed a total of ₹${currentBalance.toFixed(2)} in this group.`
                      : currentBalance < 0 
                      ? `You owe a total of ₹${Math.abs(currentBalance).toFixed(2)} to other members.`
                      : 'You are completely settled up! No pending dues.'}
                  </p>
                </div>
              </div>

              {currentBalance < 0 && (
                <button
                  type="button"
                  data-hide-on-export="true"
                  onClick={onOpenSettlement}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  Settle Up Now
                </button>
              )}
            </div>
          )}

          {/* 4. MEMBER FINANCIAL SUMMARY TABLE */}
          <div className="mb-8 w-full">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-primary-600 dark:text-primary-400" strokeWidth={2.5} />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Member Financial Summary</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">{members.length} Total Members</span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[550px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Member Name</th>
                      <th className="py-3 px-4 text-right">Paid</th>
                      <th className="py-3 px-4 text-right">Share</th>
                      <th className="py-3 px-4 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#16181d]">
                    {memberList.map((record, idx) => {
                      const memberId = (record.user?._id || record.user || '').toString();
                      const member = members.find(m => (m.user?._id || m.user || '').toString() === memberId);
                      const balance = record.netBalance || 0;
                      const isMe = currentUser?._id && memberId === currentUser._id.toString();

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-4 text-center">
                            <img
                              src={member?.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member?.user?.name || 'User')}`}
                              className="w-8 h-8 rounded-full object-cover shrink-0 border-2 border-primary-100 dark:border-slate-700 mx-auto"
                              alt="avatar"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {member?.user?.name || record.user?.name || 'Unknown User'}
                              </span>
                              {isMe && (
                                <span className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 rounded text-[10px] font-bold">
                                  You
                                </span>
                              )}
                              {member?.role === 'admin' && (
                                <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded text-[10px] font-bold">
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">{member?.user?.email || record.user?.email}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-sm text-slate-700 dark:text-slate-300">
                            ₹{Number(record.totalPaid || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-sm text-slate-700 dark:text-slate-300">
                            ₹{Number(record.totalShare || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`inline-block font-extrabold text-xs px-3 py-1 rounded-full ${
                                balance > 0
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : balance < 0
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
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
          </div>

          {/* 5. SETTLEMENTS & SETTLEMENT REQUESTS SECTION */}
          <div className="mb-8">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <HandCoins size={18} className="text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Settlements & Requests</h3>
                {pendingSettlements.length > 0 && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full animate-pulse">
                    {pendingSettlements.length} Pending
                  </span>
                )}
              </div>
              <button
                type="button"
                data-hide-on-export="true"
                onClick={onOpenSettlement}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Plus size={14} /> New Settlement
              </button>
            </div>

            {/* A. Pending Settlement Requests */}
            {pendingSettlements.length > 0 && (
              <div className="mb-4 space-y-2.5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Action Required / Pending Requests
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingSettlements.map((s) => {
                    const payerIdStr = (s.payerId?._id || s.payerId || '').toString();
                    const receiverIdStr = (s.receiverId?._id || s.receiverId || '').toString();
                    const currentUserIdStr = (currentUser?._id || '').toString();

                    const isReceiver = receiverIdStr === currentUserIdStr;
                    const isPayer = payerIdStr === currentUserIdStr;
                    const isUserAdmin = isAdmin || currentUser?.role === 'admin';
                    const canRespond = isReceiver || isUserAdmin;
                    const canCancel = isPayer;
                    const isProcessing = respondingId === s._id;

                    const payerName = s.payerId?.name || 'User';
                    const receiverName = s.receiverId?.name || 'User';

                    return (
                      <div
                        key={s._id}
                        onClick={() => setSelectedSettlement(s)}
                        className="bg-amber-50/60 dark:bg-amber-950/20 border-2 border-amber-300/80 dark:border-amber-800/80 rounded-2xl p-3.5 shadow-sm transition-all hover:border-amber-400 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                              Settlement Request
                            </span>
                          </div>
                          <span className="text-base font-black text-slate-900 dark:text-white">
                            ₹{Number(s.amount || 0).toFixed(2)}
                          </span>
                        </div>

                        {/* Payer -> Receiver */}
                        <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-xs mb-3">
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{payerName}</span>
                          <span className="text-slate-400">→</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{receiverName}</span>
                          <span className="text-[10px] text-slate-400 ml-auto shrink-0 font-medium">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {s.note && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mb-3 line-clamp-1">
                            "{s.note}"
                          </p>
                        )}

                        {/* Interactive Buttons */}
                        <div 
                          data-hide-on-export="true"
                          className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/40 dark:border-amber-900/30"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Method: {s.paymentType || 'UPI'}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedSettlement(s)}
                              className="px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-all"
                              title="View full settlement details"
                            >
                              Details
                            </button>

                            {canRespond && (
                              <>
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => handleSettlementAction(s._id, 'dispute')}
                                  className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => handleSettlementAction(s._id, 'accept')}
                                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                >
                                  {isProcessing ? 'Processing...' : 'Accept & Settle'}
                                </button>
                              </>
                            )}

                            {canCancel && !canRespond && (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleSettlementAction(s._id, 'dispute')}
                                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 rounded-lg transition-all"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* B. Completed Settlements History Cards */}
            {completedSettlements.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {completedSettlements.map((settlement, i) => (
                  <div
                    key={settlement._id || i}
                    onClick={() => setSelectedSettlement(settlement)}
                    className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-600 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all cursor-pointer group"
                    title="Click to view full settlement details"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span className="truncate">{settlement.payerId?.name?.split(' ')[0]}</span>
                        <span className="text-slate-400">→</span>
                        <span className="truncate">{settlement.receiverId?.name?.split(' ')[0]}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(settlement.createdAt).toLocaleDateString()} • {settlement.paymentType || 'UPI'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        ₹{Number(settlement.amount || 0).toFixed(2)}
                      </p>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded-full">
                        Completed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingSettlements.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                No settlement transactions recorded in this group yet.
              </p>
            ) : null}
          </div>

          {/* 6. EXPENSES BREAKDOWN SECTION WITH QUICK EDIT / DELETE / DETAILS / EDITED BADGE */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-primary-600 dark:text-primary-400" strokeWidth={2.5} />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Expenses Breakdown</h3>
                <span className="text-xs font-bold text-primary-700 bg-primary-100 dark:bg-primary-950 dark:text-primary-300 px-2.5 py-0.5 rounded-full">
                  {filteredExpenses.length} of {expenses.length}
                </span>
              </div>
              <button
                type="button"
                data-hide-on-export="true"
                onClick={onOpenAddExpense}
                className="text-xs font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1 hover:underline cursor-pointer self-start sm:self-auto"
              >
                <Plus size={14} /> Add New Expense
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div 
              data-hide-on-export="true"
              className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 mb-4 flex flex-wrap items-center gap-2.5"
            >
              <div className="relative flex-1 min-w-[180px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search description, payer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:border-primary-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Amount</option>
                <option value="lowest">Lowest Amount</option>
              </select>

              {(searchTerm || categoryFilter !== 'all' || sortOrder !== 'newest') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('all');
                    setSortOrder('newest');
                  }}
                  className="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline px-1 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Expense Cards Grid */}
            {filteredExpenses.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                {expenses.length === 0
                  ? 'No expenses recorded in this group yet.'
                  : 'No expenses match your search or filter.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {filteredExpenses.map((expense) => {
                  const payerName = getPayerName(expense, members);
                  const participants = getParticipants(expense, members);

                  const paidByIdStr = (expense.paidBy?._id || expense.paidBy || '').toString();
                  const addedByIdStr = (expense.addedBy?._id || expense.addedBy || '').toString();
                  const currentUserIdStr = (currentUser?._id || '').toString();

                  const canManage =
                    isAdmin ||
                    paidByIdStr === currentUserIdStr ||
                    addedByIdStr === currentUserIdStr;

                  const hasBeenEdited = isExpenseEdited(expense);

                  return (
                    <div
                      key={expense._id}
                      onClick={() => handleOpenExpenseDetails(expense)}
                      className="group flex flex-col justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-primary-600 shadow-xs hover:border-primary-400 dark:hover:border-primary-500 transition-all hover:shadow-md cursor-pointer"
                      title="Click to view full expense breakdown & proof"
                    >
                      {/* Top: Category & Amount & Edited Badge */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className="text-[9px] font-extrabold text-primary-700 bg-primary-100 dark:bg-primary-950 dark:text-primary-300 px-1.5 py-0.5 rounded uppercase shrink-0">
                            {expense.category || 'General'}
                          </span>
                          
                          {/* Edited Badge with click to view audit history */}
                          {hasBeenEdited && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenExpenseHistory(expense, e)}
                              className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60 px-1.5 py-0.5 rounded-md border border-amber-300/80 dark:border-amber-800/80 transition-colors shadow-2xs cursor-pointer"
                              title="Expense was edited • Click to view change history"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Edited
                            </button>
                          )}

                          <p
                            className="text-xs font-bold text-slate-900 dark:text-white truncate"
                            title={expense.description}
                          >
                            {expense.description}
                          </p>
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white shrink-0">
                          ₹{Number(expense.amount || 0).toFixed(2)}
                        </span>
                      </div>

                      {/* Middle: Payer & Participants */}
                      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 mb-2">
                        <div className="flex items-center gap-1 truncate">
                          <span>By</span>
                          <strong className="text-slate-700 dark:text-slate-300 font-semibold truncate">
                            {payerName.split(' ')[0]}
                          </strong>
                          <span>•</span>
                          <div className="flex items-center -space-x-1 shrink-0">
                            {participants.slice(0, 3).map((p, pIdx) => (
                              <img
                                key={pIdx}
                                src={
                                  p.avatar ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'U')}`
                                }
                                alt={p.name}
                                title={`Split: ${p.name}`}
                                className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-white dark:ring-slate-800 object-cover"
                              />
                            ))}
                            {participants.length > 3 && (
                              <span className="flex items-center justify-center h-3.5 w-3.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[7px] font-bold text-slate-500 ring-1 ring-white dark:ring-slate-800">
                                +{participants.length - 3}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-[9px] text-slate-400 shrink-0">
                          {new Date(expense.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Bottom Action Bar: View receipt, Details button, Edit button, Delete button */}
                      <div 
                        data-hide-on-export="true"
                        className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenExpenseDetails(expense)}
                            className="text-[10px] font-bold text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 flex items-center gap-1 cursor-pointer transition-colors"
                            title="View full expense details"
                          >
                            <Eye size={12} /> Details
                          </button>

                          {expense.receipt && (
                            <button
                              type="button"
                              onClick={() => {
                                if (onViewReceipt) onViewReceipt(expense.receipt);
                                else setActiveProofUrl(expense.receipt);
                              }}
                              className="text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 cursor-pointer"
                              title="View receipt image"
                            >
                              <FileText size={12} /> Proof
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1 ml-auto">
                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => onEditExpense && onEditExpense(expense)}
                                className="p-1 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg transition-colors cursor-pointer"
                                title="Edit Expense"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteExpense && onDeleteExpense(expense._id)}
                                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                                title="Delete Expense"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 7. BARCODE, SIGNATURES & OFFICIAL AUDIT STAMP */}
          <div className="border-t-2 border-slate-100 dark:border-slate-800 pt-8 mt-auto relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 relative z-10">
              
              {/* Left: Prepared By & Barcode */}
              <div className="w-full sm:w-56">
                <div className="mb-3 opacity-80">
                  <Barcode
                    value={reportId}
                    height={28}
                    width={1.3}
                    displayValue={false}
                    margin={0}
                    background="transparent"
                    lineColor="#1E293B"
                  />
                  <p className="text-[10px] font-mono text-slate-400 tracking-wider mt-1">{reportId}</p>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Prepared By</p>
                <p className="text-xs font-black text-slate-900 dark:text-white">SmartSplit Financial Engine</p>
                <p className="text-[10px] text-slate-400">Automated Audit & Balance System</p>
              </div>

              {/* Center: Legal Disclaimer */}
              <div className="hidden md:block flex-1 text-center pb-1">
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                  Electronically Verified Document
                </p>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                  This statement accurately reflects the ledger, splits, settlements, and member balance distributions.
                </p>
              </div>

              {/* Right: Authorized By */}
              <div className="w-full sm:w-56 sm:text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Authorized By</p>
                <div className="mb-2 flex sm:justify-end">
                  <div className="w-36 border-b border-slate-300 dark:border-slate-700 pb-1 flex sm:justify-end">
                    <span className="font-signature text-2xl text-blue-900 dark:text-blue-300 opacity-90 transform -rotate-2 select-none">
                      Akhlaque Rahman
                    </span>
                  </div>
                </div>
                <p className="text-xs font-black text-slate-900 dark:text-white">Akhlaque Rahman</p>
                <p className="text-[10px] text-slate-400">SmartSplit Platform Administrator</p>
              </div>
            </div>

            <div className="text-center mt-8 text-[11px] text-slate-400 font-medium">
              Generated by SmartSplit • Verified Enterprise Document • Page 1 of 1
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* WHATSAPP HIGH-RESOLUTION SHARE MODAL                                      */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {whatsappModalData && (
          <div 
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setWhatsappModalData(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <WhatsAppIcon className="w-6 h-6 fill-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Share Report on WhatsApp
                    </h3>
                    <p className="text-xs text-slate-400">
                      Ultra High-Definition • Lossless PNG • Complete Single Image
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setWhatsappModalData(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Status Notice */}
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-start gap-3 text-xs text-emerald-900 dark:text-emerald-200">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-sm">Report Image Ready in Crystal-Clear HD!</p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {whatsappModalData.copiedToClipboard
                        ? 'Image has been copied to your clipboard. Click "Open WhatsApp" below and simply press Ctrl+V in your chat!'
                        : 'Click "Open WhatsApp & Paste" or download the image below to share with your group.'}
                    </p>
                  </div>
                </div>

                {/* Crystal-Clear Image Preview */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950/60 relative group">
                  <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin">
                    <img
                      src={whatsappModalData.imageUrl}
                      alt="WhatsApp Report Preview"
                      className="w-full rounded-xl shadow-xs"
                    />
                  </div>
                  <div className="p-2.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-slate-500 truncate">
                      {whatsappModalData.fileName}
                    </span>
                    <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                      Full Single Image
                    </span>
                  </div>
                </div>

                {/* 3 Step Instruction Guide */}
                <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                  <p className="font-extrabold uppercase text-[10px] text-slate-400 tracking-wider">
                    How it works
                  </p>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                    <span>Click <strong>Open WhatsApp & Paste</strong> button below.</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                    <span>Select any contact, friend or WhatsApp group.</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                    <span>Press <strong>Ctrl + V</strong> (Paste) — the full crystal-clear image attaches immediately!</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadImageFile}
                    className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Download size={14} /> Download HD Image
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyImageToClipboard}
                    className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {copiedSuccess ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    {copiedSuccess ? 'Copied!' : 'Copy Image'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleOpenWhatsAppWeb}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-600/30 active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <WhatsAppIcon className="w-4 h-4 fill-white" />
                  <span>Open WhatsApp & Paste</span>
                  <ExternalLink size={14} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* EXPENSE DETAILS & AUDIT HISTORY MODAL                                     */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedExpense && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setSelectedExpense(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-start justify-between gap-4 shrink-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300">
                      {selectedExpense.category || 'General'}
                    </span>
                    {isExpenseEdited(selectedExpense) ? (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/70 dark:text-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <History size={11} /> Edited Expense
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/70 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={11} /> Original Active
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white break-words">
                    {selectedExpense.description}
                  </h3>
                  <p className="text-2xl font-black text-primary-600 dark:text-primary-400 mt-1">
                    ₹{Number(selectedExpense.amount || 0).toFixed(2)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedExpense(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Navigation Tabs (Overview & Split vs Audit History) */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/30 dark:bg-slate-950/20 shrink-0">
                <button
                  type="button"
                  onClick={() => setExpenseDrawerTab('overview')}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                    expenseDrawerTab === 'overview'
                      ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText size={14} /> Overview & Split Details
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpenseDrawerTab('history');
                    if (expenseHistoryList.length === 0) {
                      loadExpenseHistory(selectedExpense._id);
                    }
                  }}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                    expenseDrawerTab === 'history'
                      ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <History size={14} /> Change History Audit
                  {isExpenseEdited(selectedExpense) && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  )}
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {expenseDrawerTab === 'overview' ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Paid By</span>
                        <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                          {getPayerName(selectedExpense, members)}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Payment Method</span>
                        <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                          {selectedExpense.paymentMethod || 'UPI'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Split Type</span>
                        <p className="font-bold text-slate-900 dark:text-white capitalize mt-0.5">
                          {selectedExpense.splitType || 'Equal'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Date of Expense</span>
                        <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                          {new Date(selectedExpense.date || selectedExpense.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Recorded On</span>
                        <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                          {new Date(selectedExpense.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {selectedExpense.updatedAt && (
                        <div>
                          <span className="text-slate-400 font-bold uppercase text-[10px]">Last Modified</span>
                          <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                            {new Date(selectedExpense.updatedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-1.5">
                          <Users size={14} className="text-primary-600" /> Split Participants Breakdown
                        </h4>
                        <span className="text-xs text-slate-400">
                          {getParticipants(selectedExpense, members).length} Members
                        </span>
                      </div>

                      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {(() => {
                          const parts = getParticipants(selectedExpense, members);
                          const total = Number(selectedExpense.amount || 0);
                          const splitDetails = selectedExpense.splitDetails || [];

                          return parts.map((p, idx) => {
                            let shareAmount = 0;
                            const customItem = splitDetails.find(sd => {
                              const uId = (sd.user?._id || sd.user || '').toString();
                              return uId === (p._id || '').toString();
                            });

                            if (customItem && customItem.amount) {
                              shareAmount = customItem.amount;
                            } else if (parts.length > 0) {
                              shareAmount = total / parts.length;
                            }

                            const isPayer = (selectedExpense.paidBy?._id || selectedExpense.paidBy || '').toString() === (p._id || '').toString();

                            return (
                              <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <img
                                    src={p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'U')}`}
                                    className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                                    alt="avatar"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                        {p.name || 'Member'}
                                      </p>
                                      {isPayer && (
                                        <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded">
                                          Payer
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 truncate">{p.email}</p>
                                  </div>
                                </div>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-200 shrink-0">
                                  ₹{Number(shareAmount || 0).toFixed(2)}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-1.5 mb-2.5">
                        <FileText size={14} className="text-primary-600" /> Attached Proof / Receipt
                      </h4>

                      {selectedExpense.receipt ? (
                        <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                          <img
                            src={selectedExpense.receipt}
                            alt="Receipt"
                            className="w-32 h-32 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              if (onViewReceipt) onViewReceipt(selectedExpense.receipt);
                              else setActiveProofUrl(selectedExpense.receipt);
                            }}
                          />
                          <div className="space-y-2 text-center sm:text-left flex-1">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Payment Receipt Available
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Official image receipt uploaded with this transaction.
                            </p>
                            <div className="flex items-center gap-2 justify-center sm:justify-start">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onViewReceipt) onViewReceipt(selectedExpense.receipt);
                                  else setActiveProofUrl(selectedExpense.receipt);
                                }}
                                className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                              >
                                <ZoomIn size={13} /> View Full Image
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                          No receipt or payment proof was uploaded for this expense.
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Change History Audit Log Tab */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider">
                        Modification Audit Logs
                      </h4>
                      <span className="text-xs text-slate-400">
                        {expenseHistoryList.length} History Records
                      </span>
                    </div>

                    {loadingHistory ? (
                      <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                        <span>Loading audit change logs...</span>
                      </div>
                    ) : expenseHistoryList.length === 0 ? (
                      <div className="py-8 text-center bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 space-y-1">
                        <p className="font-bold text-slate-700 dark:text-slate-300">
                          {isExpenseEdited(selectedExpense)
                            ? 'Expense has been modified'
                            : 'No modifications recorded'}
                        </p>
                        <p className="text-[11px]">
                          {isExpenseEdited(selectedExpense)
                            ? `Modified on ${new Date(selectedExpense.updatedAt).toLocaleString()}, but detailed field-diffs were not captured in this version.`
                            : 'This expense has not been edited since it was created.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                        {expenseHistoryList.map((log, lIdx) => (
                          <div key={log._id || lIdx} className="relative flex items-start gap-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white dark:border-slate-900 bg-amber-500 text-white shadow-xs shrink-0 z-10">
                              <History size={12} />
                            </div>

                            <div className="flex-1 bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={log.editedBy?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(log.editedBy?.name || 'User')}`}
                                    className="w-5 h-5 rounded-full object-cover"
                                    alt="editor"
                                  />
                                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                                    {log.editedBy?.name || 'Member'}
                                    {log.editedBy?._id === currentUser?._id ? ' (You)' : ''}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(log.editedAt || log.createdAt).toLocaleString()}
                                </span>
                              </div>

                              {log.changes && log.changes.length > 0 ? (
                                <div className="space-y-1.5 pt-1">
                                  {log.changes.map((ch, chIdx) => (
                                    <div
                                      key={chIdx}
                                      className="text-xs bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1"
                                    >
                                      <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                                        Field: {ch.field}
                                      </span>
                                      <div className="flex items-center gap-2 flex-wrap text-xs">
                                        <span className="line-through text-rose-500 font-medium">
                                          {typeof ch.oldValue === 'object' ? JSON.stringify(ch.oldValue) : String(ch.oldValue ?? 'None')}
                                        </span>
                                        <span className="text-slate-400">➔</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                          {typeof ch.newValue === 'object' ? JSON.stringify(ch.newValue) : String(ch.newValue ?? 'None')}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400">General details updated</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  {(isAdmin || (selectedExpense.paidBy?._id || selectedExpense.paidBy || '').toString() === (currentUser?._id || '').toString() || (selectedExpense.addedBy?._id || selectedExpense.addedBy || '').toString() === (currentUser?._id || '').toString()) && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const exp = selectedExpense;
                          setSelectedExpense(null);
                          if (onEditExpense) onEditExpense(exp);
                        }}
                        className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold transition-all border border-amber-200 dark:border-amber-900 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 size={13} /> Edit Expense
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const expId = selectedExpense._id;
                          setSelectedExpense(null);
                          if (onDeleteExpense) onDeleteExpense(expId);
                        }}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition-all border border-rose-200 dark:border-rose-900 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedExpense(null)}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* SETTLEMENT DETAILS MODAL                                                  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedSettlement && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setSelectedSettlement(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-start justify-between gap-4 shrink-0">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      Settlement Transfer
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      selectedSettlement.status === 'completed' 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : selectedSettlement.status === 'pending'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {selectedSettlement.status}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    ₹{Number(selectedSettlement.amount || 0).toFixed(2)}
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                    ID: {selectedSettlement._id}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSettlement(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={selectedSettlement.payerId?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedSettlement.payerId?.name || 'Payer')}`}
                      className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                      alt="payer"
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">From (Payer)</span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {selectedSettlement.payerId?.name || 'Member'}
                      </p>
                    </div>
                  </div>

                  <span className="text-slate-400 font-bold shrink-0">→</span>

                  <div className="flex items-center gap-2 min-w-0 text-right justify-end">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">To (Receiver)</span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {selectedSettlement.receiverId?.name || 'Member'}
                      </p>
                    </div>
                    <img
                      src={selectedSettlement.receiverId?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedSettlement.receiverId?.name || 'Receiver')}`}
                      className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                      alt="receiver"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/50 dark:bg-slate-950/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Payment Type</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {selectedSettlement.paymentType || 'UPI'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Transaction Date</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {new Date(selectedSettlement.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Note / Purpose
                  </span>
                  <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 break-words">
                    {selectedSettlement.note || 'No note provided for this settlement.'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Payment Proof Screenshot
                  </span>
                  {selectedSettlement.screenshot ? (
                    <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                      <img
                        src={selectedSettlement.screenshot}
                        alt="Proof"
                        className="w-20 h-20 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer hover:opacity-90"
                        onClick={() => {
                          if (onViewReceipt) onViewReceipt(selectedSettlement.screenshot);
                          else setActiveProofUrl(selectedSettlement.screenshot);
                        }}
                      />
                      <div className="space-y-1.5 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Payment Proof Attached
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (onViewReceipt) onViewReceipt(selectedSettlement.screenshot);
                            else setActiveProofUrl(selectedSettlement.screenshot);
                          }}
                          className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <ZoomIn size={12} /> View Full Proof
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                      No payment proof screenshot was attached.
                    </p>
                  )}
                </div>
              </div>

              {/* Settlement Actions */}
              <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  {selectedSettlement.status === 'pending' && (() => {
                    const receiverIdStr = (selectedSettlement.receiverId?._id || selectedSettlement.receiverId || '').toString();
                    const isReceiver = receiverIdStr === (currentUser?._id || '').toString();
                    const isUserAdmin = isAdmin || currentUser?.role === 'admin';

                    if (isReceiver || isUserAdmin) {
                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSettlementAction(selectedSettlement._id, 'dispute')}
                            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl text-xs font-bold border border-rose-300 dark:border-rose-800 cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSettlementAction(selectedSettlement._id, 'accept')}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                          >
                            Accept & Settle
                          </button>
                        </>
                      );
                    }
                    return null;
                  })()}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSettlement(null)}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer ml-auto"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* PROOF VIEWER MODAL OVERLAY                                                */}
      {/* ========================================================================= */}
      {activeProofUrl && (
        <ProofViewer
          imageUrl={activeProofUrl}
          onClose={() => setActiveProofUrl(null)}
          altText="Payment Proof"
        />
      )}

    </div>
  );
});

export default EnterpriseGroupReport;
