import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useGroupStore from '../store/useGroupStore';
import useAuthStore from '../store/useAuthStore';
import api from '../utils/api';
import { Plus, ChevronLeft, Receipt, HandCoins, UserPlus, Info, Image, X, UploadCloud, QrCode, MessageCircle, Edit2, Trash2, History, Calendar, AlertTriangle, FileText } from 'lucide-react';
import ChatDrawer from '../components/ChatDrawer';
import ProofViewer from '../components/ProofViewer';
import GroupPaymentsTab from '../components/GroupPaymentsTab';
import GroupSettlementsTab from '../components/GroupSettlementsTab';
import GroupMembersTab from '../components/GroupMembersTab';
import GroupExpensesTab from '../components/GroupExpensesTab';
import GroupOverviewTab from '../components/GroupOverviewTab';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { QRCodeSVG } from 'qrcode.react';

const formatCurrency = (amount) => `Rs. ${Number(amount || 0).toFixed(2)}`;

const GroupDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    activeGroup,
    expenses,
    settlements,
    fetchGroupDetails,
    addExpense,
    updateExpense,
    deleteExpense,
    fetchExpenseEditHistory,
    addMember,
    removeMember,
    createSettlement,
    respondSettlement,
    loading,
    error
  } = useGroupStore();
  const { user: currentUser } = useAuthStore();

  // Edit Expense State Hooks
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editExpenseForm, setEditExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'General',
    splitType: 'equal',
    paidBy: '',
    receipt: '',
    paymentMethod: 'UPI',
    date: ''
  });
  const [editSelectedParticipants, setEditSelectedParticipants] = useState([]);
  const [editCustomShares, setEditCustomShares] = useState({});
  const [editExpenseError, setEditExpenseError] = useState('');
  const [isSubmittingEditExpense, setIsSubmittingEditExpense] = useState(false);

  // Edit History State Hooks
  const [selectedExpenseForHistory, setSelectedExpenseForHistory] = useState(null);
  const [expenseEditHistoryList, setExpenseEditHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Dispute/Report Modal State Hooks and Handlers
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeType, setDisputeType] = useState('');
  const [disputeTargetId, setDisputeTargetId] = useState('');
  const [disputeForm, setDisputeForm] = useState({ reason: '', description: '' });

  // Settlement Dispute State Hooks
  const [disputingSettlementId, setDisputingSettlementId] = useState(null);
  const [disputeSettlementReason, setDisputeSettlementReason] = useState('');
  const [disputeError, setDisputeError] = useState('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

  const handleReportDispute = (type, targetId) => {
    setDisputeType(type);
    setDisputeTargetId(targetId);
    setDisputeForm({ reason: '', description: '' });
    setDisputeError('');
    setShowDisputeModal(true);
  };

  const handleSubmitDispute = async (e) => {
    e.preventDefault();
    if (!disputeForm.reason.trim()) {
      setDisputeError('Please enter a reason for the dispute.');
      return;
    }
    setIsSubmittingDispute(true);
    setDisputeError('');
    try {
      await api.post('/reports', {
        type: disputeType,
        targetId: disputeTargetId,
        reason: disputeForm.reason,
        description: disputeForm.description
      });
      setShowDisputeModal(false);
      alert('Dispute reported to administrators successfully.');
    } catch (err) {
      console.error('Error reporting dispute:', err);
      setDisputeError(err.response?.data?.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const [tab, setTab] = useState('overview');
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [openGroupMenu, setOpenGroupMenu] = useState(false);
  const [expandedSplitIds, setExpandedSplitIds] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'General',
    splitType: 'equal',
    paidBy: '',
    receipt: '',
    paymentMethod: 'UPI'
  });
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [customShares, setCustomShares] = useState({});
  const [expenseError, setExpenseError] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [settlementForm, setSettlementForm] = useState({
    payerId: '',
    receiverId: '',
    amount: '',
    paymentType: 'UPI',
    screenshot: '',
    note: ''
  });

  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);
  const [processingSettlementId, setProcessingSettlementId] = useState(null);

  const handleScreenshotUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSettlementForm((prev) => ({ ...prev, screenshot: reader.result }));
    };
    reader.readAsDataURL(file);
  };
  
  const handleReceiptUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setExpenseForm((prev) => ({ ...prev, receipt: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const [settlementError, setSettlementError] = useState('');
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [viewReceiptUrl, setViewReceiptUrl] = useState(null);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [removingMember, setRemovingMember] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    category: ''
  });

  useEffect(() => {
    if (showAddMember && !memberEmail) {
      fetchFriends();
    }
  }, [showAddMember]);

  useEffect(() => {
    if (!showAddMember || !memberEmail) return;
    
    const delayDebounceFn = setTimeout(() => {
      fetchFriends(memberEmail);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [memberEmail, showAddMember]);

  const availableFriends = useMemo(() => {
    if (!friends || !activeGroup?.members) return [];
    return friends.filter(f => !activeGroup.members.some(m => {
      const mId = m.user?._id?.toString() || m.user?.toString();
      const fId = f._id?.toString();
      return mId === fId;
    }));
  }, [friends, activeGroup]);
  const fetchFriends = async (search = '') => {
    setFriendsLoading(true);
    try {
      const response = await api.get('/groups/friends', {
        params: { search }
      });
      setFriends(response.data);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setFriendsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupDetails(id);
  }, [id]);

  useEffect(() => {
    if (activeGroup) {
      const ids = activeGroup.members.map((member) => member.user._id);
      setSelectedParticipants(ids);
      const initialShares = ids.reduce((acc, userId) => ({ ...acc, [userId]: '' }), {});
      setCustomShares(initialShares);
      setSettlementForm((prev) => ({
        ...prev,
        payerId: currentUser?._id || '',
        receiverId: ids.find((userId) => userId !== currentUser?._id) || ids[0] || ''
      }));
      setExpenseForm((prev) => ({
        ...prev,
        paidBy: '',
        receipt: ''
      }));
    }
  }, [activeGroup, currentUser]);

  const memberSummaries = useMemo(() => {
    if (!activeGroup?.members || !activeGroup?.summary?.memberBalances) return [];

    return activeGroup.members.map((member) => {
      const memberId = member.user?._id?.toString() || member.user?.toString();
      if (!memberId) return null;

      const summaryRecord = activeGroup.summary.memberBalances.find((record) => {
        const recordId = record.user?._id?.toString?.() || record.user?.toString?.();
        return recordId === memberId;
      });

      return {
        id: memberId,
        name: member.user?.name || 'Unknown User',
        avatar: member.user?.avatar,
        role: member.role,
        totalShare: summaryRecord?.totalShare || 0,
        totalPaid: summaryRecord?.totalPaid || 0,
        balance: summaryRecord?.balance || 0,
        netBalance: summaryRecord?.netBalance || 0,
        settlementPaid: summaryRecord?.settlementPaid || 0,
        settlementReceived: summaryRecord?.settlementReceived || 0
      };
    }).filter(Boolean);
  }, [activeGroup]);

  const currentMemberSummary = useMemo(() => (
    memberSummaries.find((member) => member.id === currentUser?._id) || null
  ), [memberSummaries, currentUser]);

  const totalExpense = activeGroup?.summary?.totalExpense ?? 0;
  const sortedExpenses = useMemo(() => [...expenses].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [expenses]);
  const sortedSettlements = useMemo(() => [...settlements].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [settlements]);
  const pendingRequests = sortedSettlements.filter((settlement) => settlement.status === 'pending');
  const paidMostName = activeGroup?.summary?.paidMost
    ? activeGroup.members.find((member) => (member.user?._id || member.user) === activeGroup.summary.paidMost.userId)?.user?.name
    : 'No activity yet';
  const owesMostName = activeGroup?.summary?.owesMost
    ? activeGroup.members.find((member) => (member.user?._id || member.user) === activeGroup.summary.owesMost.userId)?.user?.name
    : 'No activity yet';

  const insightsData = useMemo(() => {
    // 1. Total Transactions
    const totalTransactions = sortedExpenses.length;
    const totalSpendAmt = sortedExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // 2. Monthly Trend
    const monthlyTrend = {};
    sortedExpenses.forEach(exp => {
      const d = new Date(exp.date || exp.createdAt);
      const m = d.toLocaleString('en-US', { month: 'short' });
      monthlyTrend[m] = (monthlyTrend[m] || 0) + exp.amount;
    });
    const monthsData = Object.entries(monthlyTrend).slice(-3); // Last 3 months
    const maxMonthVal = monthsData.length > 0 ? Math.max(...monthsData.map(([, val]) => val)) : 1;

    // 3. Highest Spender
    const spenderSums = {};
    sortedExpenses.forEach(exp => {
      const pId = exp.paidBy?._id || exp.paidBy;
      if (pId) {
        spenderSums[pId] = (spenderSums[pId] || 0) + exp.amount;
      }
    });
    let topSpenderId = null;
    let topSpenderVal = 0;
    Object.entries(spenderSums).forEach(([id, val]) => {
      if (val > topSpenderVal) {
        topSpenderVal = val;
        topSpenderId = id;
      }
    });
    const topSpenderName = activeGroup?.members?.find(m => (m.user?._id || m.user) === topSpenderId)?.user?.name || 'No Spender';

    // 4. Most Used Category
    const categorySums = {};
    sortedExpenses.forEach(exp => {
      const c = exp.category || 'General';
      categorySums[c] = (categorySums[c] || 0) + exp.amount;
    });
    let topCat = 'General';
    let topCatVal = 0;
    Object.entries(categorySums).forEach(([cat, val]) => {
      if (val > topCatVal) {
        topCatVal = val;
        topCat = cat;
      }
    });
    const topCatPct = totalSpendAmt > 0 ? Math.round((topCatVal / totalSpendAmt) * 100) : 0;

    // 5. Your Contribution
    const myPaidSum = sortedExpenses
      .filter(exp => {
        const pId = exp.paidBy?._id || exp.paidBy;
        return pId === currentUser?._id;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
    const myPct = totalSpendAmt > 0 ? Math.round((myPaidSum / totalSpendAmt) * 100) : 0;

    // 6. Pending Settlements
    const pendingCount = pendingRequests.length;

    // 7. Average Spend per Member
    const memberCount = activeGroup?.members?.length || 1;
    const avgAmt = memberCount > 0 ? totalSpendAmt / memberCount : 0;

    // 8. Smart Insights List
    const smartInsightsList = [];
    if (totalTransactions > 0) {
      if (topCatVal > 0) {
        smartInsightsList.push(`${topCat} spending accounted for ${topCatPct}% of group expenses.`);
      }
      if (topSpenderVal > 0) {
        smartInsightsList.push(`${topSpenderName} spent the highest in the group, contributing ₹${topSpenderVal.toFixed(0)}.`);
      }
      smartInsightsList.push("Most expenses are shared equally across members.");
    } else {
      smartInsightsList.push("No transactions have been recorded in this group yet.");
    }

    return {
      totalTransactions,
      totalSpendAmt,
      monthsData,
      maxMonthVal,
      topSpenderName,
      topSpenderVal,
      topCat,
      topCatPct,
      myPaidSum,
      myPct,
      pendingCount,
      avgAmt,
      smartInsightsList
    };
  }, [sortedExpenses, activeGroup, currentUser, pendingRequests]);

  const handleToggleParticipant = (userId) => {
    setSelectedParticipants((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

  const updateCustomShare = (userId, value) => {
    setCustomShares((current) => ({ ...current, [userId]: value }));
  };

  const previewShares = useMemo(() => {
    const amount = parseFloat(expenseForm.amount) || 0;
    if (selectedParticipants.length === 0 || !activeGroup) return [];

    if (expenseForm.splitType === 'equal') {
      const baseShare = Number((amount / selectedParticipants.length).toFixed(2));
      return selectedParticipants.map((userId, index) => {
        const member = activeGroup.members.find((item) => (item.user?._id || item.user) === userId);
        let shareAmount;
        if (index === selectedParticipants.length - 1) {
          shareAmount = Number((amount - (baseShare * (selectedParticipants.length - 1))).toFixed(2));
        } else {
          shareAmount = baseShare;
        }
        return { userId, name: member?.user.name || 'Member', amount: shareAmount || 0 };
      });
    }

    return selectedParticipants.map((userId) => {
      const member = activeGroup.members.find((item) => (item.user?._id || item.user) === userId);
      return { userId, name: member?.user.name || 'Member', amount: Number(customShares[userId] || 0) };
    });
  }, [expenseForm.amount, expenseForm.splitType, selectedParticipants, customShares, activeGroup]);

  const currentMemberPaid = currentMemberSummary?.totalPaid || 0;
  const currentMemberShare = currentMemberSummary?.totalShare || 0;
  const currentMemberBalance = currentMemberSummary?.netBalance || 0;

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!activeGroup) return;
    setExpenseError('');
    setIsSubmittingExpense(true);

    const amount = parseFloat(expenseForm.amount);
    if (!amount || amount <= 0) {
      setExpenseError('Please enter a valid amount greater than zero.');
      setIsSubmittingExpense(false);
      return;
    }

    if (selectedParticipants.length === 0) {
      setExpenseError('Please select at least one participant.');
      setIsSubmittingExpense(false);
      return;
    }

    if (!expenseForm.paidBy) {
      setExpenseError('Please select who paid for this expense.');
      setIsSubmittingExpense(false);
      return;
    }

    const baseShare = Number((amount / selectedParticipants.length).toFixed(2));
    const splitDetails = selectedParticipants.map((userId, index) => {
      let shareAmount;
      if (expenseForm.splitType === 'equal') {
        if (index === selectedParticipants.length - 1) {
          shareAmount = Number((amount - (baseShare * (selectedParticipants.length - 1))).toFixed(2));
        } else {
          shareAmount = baseShare;
        }
      } else {
        shareAmount = Number(customShares[userId] || 0);
      }
      return { user: userId, amount: shareAmount };
    });

    const splitSum = splitDetails.reduce((sum, item) => sum + item.amount, 0);
    if (Math.abs(splitSum - amount) > 0.1) {
      setExpenseError('Split amount does not match total expense. Please adjust the shares.');
      setIsSubmittingExpense(false);
      return;
    }

    const success = await addExpense({
      ...expenseForm,
      amount,
      groupId: id,
      participants: selectedParticipants,
      splitDetails
    });

    if (success) {
      setShowExpenseModal(false);
      setExpenseForm({ 
        description: '', 
        amount: '', 
        category: 'General', 
        splitType: 'equal', 
        paidBy: '',
        receipt: '',
        paymentMethod: 'UPI'
      });
      setSelectedParticipants(activeGroup.members.map((member) => member.user._id));
      setCustomShares(activeGroup.members.reduce((acc, member) => ({ ...acc, [member.user._id]: '' }), {}));
      setTab('expenses');
      setExpenseError('');
    } else {
      setExpenseError(error || 'Unable to add expense. Please try again.');
    }

    setIsSubmittingExpense(false);
  };

  // Edit Expense useMemo and Handlers
  const editPreviewShares = useMemo(() => {
    const amount = parseFloat(editExpenseForm.amount) || 0;
    if (editSelectedParticipants.length === 0 || !activeGroup) return [];

    if (editExpenseForm.splitType === 'equal') {
      const baseShare = Number((amount / editSelectedParticipants.length).toFixed(2));
      return editSelectedParticipants.map((userId, index) => {
        const member = activeGroup.members.find((item) => (item.user?._id || item.user) === userId);
        let shareAmount;
        if (index === editSelectedParticipants.length - 1) {
          shareAmount = Number((amount - (baseShare * (editSelectedParticipants.length - 1))).toFixed(2));
        } else {
          shareAmount = baseShare;
        }
        return { userId, name: member?.user.name || 'Member', amount: shareAmount || 0 };
      });
    }

    return editSelectedParticipants.map((userId) => {
      const member = activeGroup.members.find((item) => (item.user?._id || item.user) === userId);
      return { userId, name: member?.user.name || 'Member', amount: Number(editCustomShares[userId] || 0) };
    });
  }, [editExpenseForm.amount, editExpenseForm.splitType, editSelectedParticipants, editCustomShares, activeGroup]);

  const canEditExpense = (expense) => {
    if (!currentUser) return false;
    
    const addedById = expense.addedBy?._id || expense.addedBy;
    const isCreator = addedById?.toString() === currentUser._id?.toString();
    const isGroupAdmin = activeGroup?.members?.some(
      (member) => member.user?._id === currentUser._id && member.role === 'admin'
    );
    const isSystemAdmin = currentUser.role === 'admin';
    
    return isCreator || isGroupAdmin || isSystemAdmin;
  };

  const handleShowEditExpenseModal = (expense) => {
    setEditingExpenseId(expense._id);
    setEditExpenseForm({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category || 'General',
      splitType: expense.splitType || 'equal',
      paidBy: expense.paidBy?._id || expense.paidBy,
      receipt: expense.receipt || '',
      paymentMethod: expense.paymentMethod || 'UPI',
      date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    
    const participantIds = expense.participants.map(p => p._id || p);
    setEditSelectedParticipants(participantIds);
    
    const customSharesMap = {};
    activeGroup.members.forEach(member => {
      customSharesMap[member.user._id] = '';
    });
    if (expense.splitType === 'unequal' && expense.splitDetails) {
      expense.splitDetails.forEach(split => {
        const uId = split.user?._id || split.user;
        customSharesMap[uId] = split.amount.toString();
      });
    }
    setEditCustomShares(customSharesMap);
    setEditExpenseError('');
    setShowEditExpenseModal(true);
  };

  const handleToggleEditParticipant = (userId) => {
    setEditSelectedParticipants((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  };

  const updateEditCustomShare = (userId, value) => {
    setEditCustomShares((current) => ({ ...current, [userId]: value }));
  };

  const handleEditReceiptUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setEditExpenseError('Receipt image must be less than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditExpenseForm((prev) => ({ ...prev, receipt: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEditExpense = async (e) => {
    e.preventDefault();
    if (!activeGroup || !editingExpenseId) return;
    setEditExpenseError('');
    setIsSubmittingEditExpense(true);

    const amount = parseFloat(editExpenseForm.amount);
    if (!amount || amount <= 0) {
      setEditExpenseError('Please enter a valid amount greater than zero.');
      setIsSubmittingEditExpense(false);
      return;
    }

    if (editSelectedParticipants.length === 0) {
      setEditExpenseError('Please select at least one participant.');
      setIsSubmittingEditExpense(false);
      return;
    }

    if (!editExpenseForm.paidBy) {
      setEditExpenseError('Please select who paid for this expense.');
      setIsSubmittingEditExpense(false);
      return;
    }

    const baseShare = Number((amount / editSelectedParticipants.length).toFixed(2));
    const splitDetails = editSelectedParticipants.map((userId, index) => {
      let shareAmount;
      if (editExpenseForm.splitType === 'equal') {
        if (index === editSelectedParticipants.length - 1) {
          shareAmount = Number((amount - (baseShare * (editSelectedParticipants.length - 1))).toFixed(2));
        } else {
          shareAmount = baseShare;
        }
      } else {
        shareAmount = Number(editCustomShares[userId] || 0);
      }
      return { user: userId, amount: shareAmount };
    });

    const splitSum = splitDetails.reduce((sum, item) => sum + item.amount, 0);
    if (Math.abs(splitSum - amount) > 0.1) {
      setEditExpenseError('Split amount does not match total expense. Please adjust the shares.');
      setIsSubmittingEditExpense(false);
      return;
    }

    const success = await updateExpense(editingExpenseId, {
      ...editExpenseForm,
      amount,
      groupId: id,
      participants: editSelectedParticipants,
      splitDetails
    });

    if (success) {
      setShowEditExpenseModal(false);
      setEditingExpenseId(null);
    } else {
      setEditExpenseError(error || 'Unable to update expense. Please try again.');
    }

    setIsSubmittingEditExpense(false);
  };

  const handleShowExpenseHistory = async (expense) => {
    setSelectedExpenseForHistory(expense);
    setLoadingHistory(true);
    try {
      const historyList = await fetchExpenseEditHistory(expense._id);
      setExpenseEditHistoryList(historyList);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteExpenseClick = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      const success = await deleteExpense(expenseId, id);
      if (!success) {
        alert(error || 'Failed to delete expense.');
      }
    }
  };

  const handleAddMember = async () => {
    if (!activeGroup || !memberEmail) return;
    const success = await addMember(activeGroup._id, memberEmail);
    if (success) {
      setMemberEmail('');
      setShowAddMember(false);
    }
  };

  const handleCreateSettlement = async () => {
    if (!activeGroup) return;
    if (!settlementForm.receiverId) {
      setSettlementError('Please select the member you want to send the payment request to.');
      return;
    }
    const amount = Number(settlementForm.amount);
    if (!amount || amount <= 0) {
      setSettlementError('Enter a valid settlement amount.');
      return;
    }

    setSettlementError('');
    setIsSubmittingSettlement(true);
    const success = await createSettlement({
      groupId: activeGroup._id,
      payerId: settlementForm.payerId,
      receiverId: settlementForm.receiverId,
      amount,
      paymentType: settlementForm.paymentType,
      screenshot: settlementForm.screenshot,
      note: settlementForm.note
    });
    
    setIsSubmittingSettlement(false);
    
    if (success) {
      setShowSettlementModal(false);
      setSettlementForm({ payerId: currentUser?._id || '', receiverId: '', amount: '', paymentType: 'UPI', screenshot: '', note: '' });
    } else {
      setSettlementError(error || 'Failed to send settlement request.');
    }
  };

  const renderSettlementStatus = (status) => {
    const statusClass = status === 'pending'
      ? 'bg-amber-100 text-amber-700'
      : status === 'disputed'
        ? 'bg-orange-100 text-orange-700'
        : status === 'completed'
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-rose-100 text-rose-700';

    const label = status === 'pending' 
      ? 'Pending' 
      : status === 'disputed' 
        ? 'Disputed' 
        : status === 'completed' 
          ? 'Completed' 
          : 'Rejected';

    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
        {label}
      </span>
    );
  };

  const handleRespond = async (settlementId, action, disputeReason = '') => {
    if (!activeGroup) return;
    setProcessingSettlementId(settlementId);
    await respondSettlement(settlementId, action, activeGroup._id, disputeReason);
    setProcessingSettlementId(null);
  };

  useEffect(() => {
    if (showSettlementModal) {
      setSettlementError('');
    }
  }, [showSettlementModal]);

  useEffect(() => {
    if (showEditModal && activeGroup) {
      setEditForm({
        name: activeGroup.name,
        description: activeGroup.description || '',
        category: activeGroup.category || 'Other'
      });
    }
  }, [showEditModal, activeGroup]);

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    const success = await useGroupStore.getState().updateGroup(activeGroup._id, editForm);
    if (success) {
      setShowEditModal(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (window.confirm('Are you sure you want to delete this group? All expenses and settlements will be permanently removed.')) {
      setIsDeleting(true);
      const success = await useGroupStore.getState().deleteGroup(activeGroup._id);
      if (success) {
        navigate('/dashboard');
      }
      setIsDeleting(false);
    }
  };

  if (loading && !activeGroup) return <div className="text-center py-20">Loading group details...</div>;
  if (!activeGroup) return <div className="text-center py-20">{error || 'Group not found'}</div>;

  const isAdmin = activeGroup?.members?.some(
    (member) => member.user?._id === currentUser?._id && member.role === 'admin'
  );

  const balanceLabel = currentMemberBalance < 0
    ? `You will pay ${formatCurrency(Math.abs(currentMemberBalance))}`
    : currentMemberBalance > 0
      ? `You will receive ${formatCurrency(currentMemberBalance)}`
      : 'You are settled up';

  return (
    <div className="space-y-4 pb-24 md:pb-6">
      <div className="flex items-center gap-3 px-1 md:px-0">
        <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold truncate">Group Details</h1>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Horizontal Gradient Header Card */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 dark:from-slate-900 dark:to-slate-800 rounded-2xl md:rounded-[2rem] p-4 md:p-8 text-white shadow-sm border-none">
          {/* Subtle background abstract shapes */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-blue-100 to-transparent pointer-events-none" />
          
          <div className="relative flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 md:gap-6 min-w-0">
                {/* Compact icon container */}
                <div className="w-10 h-10 md:w-20 md:h-20 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-inner">
                  <svg className="w-5 h-5 md:w-10 md:h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg md:text-3xl font-extrabold md:font-black tracking-tight leading-tight truncate">{activeGroup.name}</h2>
                  <p className="text-blue-100/90 dark:text-slate-300 text-[10px] md:text-sm mt-0.5 md:mt-1.5 font-medium max-w-xl line-clamp-1 md:line-clamp-2">
                    {activeGroup.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              {/* Edit/Delete Top-Right 3-dot dropdown menu on Mobile, and inline on Desktop */}
              {isAdmin && (
                <div className="relative shrink-0 flex items-center gap-2">
                  {/* Desktop Actions */}
                  <div className="hidden md:flex gap-2">
                    <button 
                      onClick={() => setShowEditModal(true)}
                      className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm border text-slate-700"
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                    <button 
                      onClick={handleDeleteGroup}
                      disabled={isDeleting}
                      className="px-4 py-2.5 bg-white hover:bg-red-50 text-red-600 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm border"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>

                  {/* Mobile Actions 3-dot Toggle Button */}
                  <div className="md:hidden relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenGroupMenu(!openGroupMenu);
                      }}
                      className="p-2 hover:bg-white/10 active:bg-white/20 rounded-xl text-white transition-colors"
                      title="Group Options"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                      </svg>
                    </button>

                    {/* Compact Dropdown Menu */}
                    <AnimatePresence>
                      {openGroupMenu && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenGroupMenu(false)} />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-0 mt-2 w-36 z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-1.5 shadow-xl text-slate-800 dark:text-white"
                          >
                            <button
                              onClick={() => {
                                setOpenGroupMenu(false);
                                setShowEditModal(true);
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                            >
                              <Edit2 size={13} /> Edit Group
                            </button>
                            <button
                              onClick={() => {
                                setOpenGroupMenu(false);
                                handleDeleteGroup();
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 flex items-center gap-2"
                            >
                              <Trash2 size={13} /> Delete Group
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>

            {/* Compact pill action buttons, horizontally scrollable on mobile */}
            <div className="flex items-center gap-2 w-full overflow-x-auto no-scrollbar scroll-smooth pt-2 md:pt-4 border-t border-white/10 pb-0.5">
              <button 
                onClick={() => setShowExpenseModal(true)} 
                className="bg-white text-primary-600 hover:bg-slate-50 rounded-full px-4 py-2 text-xs md:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0 h-9"
              >
                <Plus size={14} className="stroke-[3]" /> Expense
              </button>
              {isAdmin && (
                <button 
                  onClick={() => setShowAddMember(true)} 
                  className="bg-white/15 text-white border border-white/10 hover:bg-white/20 rounded-full px-4 py-2 text-xs md:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 h-9"
                >
                  <UserPlus size={14} className="stroke-[3]" /> Member
                </button>
              )}
              <button 
                onClick={() => setShowSettlementModal(true)} 
                className="bg-white/15 text-white border border-white/10 hover:bg-white/20 rounded-full px-4 py-2 text-xs md:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 h-9"
              >
                <QrCode size={14} className="stroke-[3]" /> Settle
              </button>
              <button 
                onClick={() => setShowChat(true)} 
                className="bg-white/15 text-white border border-white/10 hover:bg-white/20 rounded-full px-4 py-2 text-xs md:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 h-9"
              >
                <MessageCircle size={14} className="stroke-[3]" /> Chat
              </button>
              <button 
                onClick={() => navigate(`/reports?groupId=${activeGroup._id}`)} 
                className="bg-blue-500/20 text-blue-100 border border-blue-400/20 hover:bg-blue-500/30 rounded-full px-4 py-2 text-xs md:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 h-9"
              >
                <FileText size={14} className="stroke-[3]" /> Report
              </button>
            </div>
          </div>
        </div>

        {/* Standalone White Card for Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          
          {/* Total Spent */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 flex items-center justify-between gap-3 shadow-sm transition-all hover:shadow-md">
            <div className="min-w-0">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Spent</p>
              <p className="text-sm md:text-xl font-extrabold mt-1.5 text-slate-800 dark:text-white truncate">
                {formatCurrency(totalExpense)}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
          </div>

          {/* Net Balance */}
          <div className={`bg-white dark:bg-slate-900 rounded-2xl border ${currentMemberBalance < 0 ? 'border-rose-200 dark:border-rose-900/50' : currentMemberBalance > 0 ? 'border-emerald-200 dark:border-emerald-900/50' : 'border-slate-100 dark:border-slate-800/80'} p-4 flex items-center justify-between gap-3 shadow-sm transition-all hover:shadow-md`}>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Net Balance</p>
              <p className={`text-sm md:text-xl font-extrabold mt-1.5 truncate ${currentMemberBalance < 0 ? 'text-rose-600 dark:text-rose-400' : currentMemberBalance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>
                {currentMemberBalance < 0 ? ' ' : currentMemberBalance > 0 ? ' ' : ''}{formatCurrency(Math.abs(currentMemberBalance))}
              </p>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${currentMemberBalance < 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' : currentMemberBalance > 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>

          {/* Paid by you */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 flex items-center justify-between gap-3 shadow-sm transition-all hover:shadow-md">
            <div className="min-w-0">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Paid by you</p>
              <p className="text-sm md:text-xl font-extrabold mt-1.5 text-emerald-600 dark:text-emerald-400 truncate">
                {formatCurrency(currentMemberPaid)}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
          </div>

          {/* Your Share */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 flex items-center justify-between gap-3 shadow-sm transition-all hover:shadow-md">
            <div className="min-w-0">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Your Share</p>
              <p className="text-sm md:text-xl font-extrabold mt-1.5 text-slate-800 dark:text-white truncate">
                {formatCurrency(currentMemberShare)}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </div>

          {/* Members */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 flex items-center justify-between gap-3 shadow-sm transition-all hover:shadow-md">
            <div className="min-w-0">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Members</p>
              <p className="text-sm md:text-xl font-extrabold mt-1.5 text-slate-800 dark:text-white truncate">
                {activeGroup.members.length}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>

          {/* Pending */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 flex items-center justify-between gap-3 shadow-sm transition-all hover:shadow-md">
            <div className="min-w-0">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Pending</p>
              <p className="text-sm md:text-xl font-extrabold mt-1.5 text-slate-800 dark:text-white truncate">
                {pendingRequests.length}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>

        </div>

        {/* Clean Line Tabs */}
        <div className="flex overflow-x-auto no-scrollbar gap-5 border-b border-slate-200 dark:border-slate-800 px-1 mt-4 shrink-0">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'expenses', label: 'Expenses' },
            { key: 'members', label: 'Members' },
            { key: 'settlements', label: 'Settlements' },
            { key: 'payments', label: 'Payments' }
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                "pb-2.5 text-xs font-bold transition-all relative whitespace-nowrap",
                tab === item.key
                  ? "text-primary-600 dark:text-blue-400 font-extrabold"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              {item.label}
              {tab === item.key && (
                <motion.div 
                  layoutId="active-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-blue-400"
                />
              )}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <GroupOverviewTab 
              group={activeGroup}
              expenses={expenses || []}
              settlements={settlements || []}
              currentUser={currentUser}
              onAddExpense={() => setShowExpenseModal(true)}
              onAddSettlement={() => setShowSettlementModal(true)}
              onAddMember={() => setShowAddMember(true)}
            />
          </motion.div>
        )}

        {tab === 'expenses' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <GroupExpensesTab 
              group={activeGroup}
              expenses={sortedExpenses}
              settlements={settlements || []}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onAddExpense={() => setShowExpenseModal(true)}
              onEditExpense={handleShowEditExpenseModal}
              onDeleteExpense={handleDeleteExpenseClick}
              onViewReceipt={setViewReceiptUrl}
              onViewHistory={handleShowExpenseHistory}
              expenseEditHistoryList={expenseEditHistoryList}
              loadingHistory={loadingHistory}
            />
          </motion.div>
        )}

        {tab === 'members' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <GroupMembersTab 
              group={activeGroup}
              memberSummaries={memberSummaries}
              expenses={expenses || []}
              settlements={settlements || []}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onInviteMember={() => setShowAddMember(true)}
              onRemoveMember={(member) => setRemovingMember(member)}
            />
          </motion.div>
        )}

        {tab === 'settlements' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <GroupSettlementsTab 
              group={activeGroup}
              settlements={settlements}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onNewRequest={() => setShowSettlementModal(true)}
              onRespond={handleRespond}
              onDelete={async (id) => {
                if (window.confirm('Are you sure you want to delete this settlement?')) {
                  try {
                    await api.delete(`/settlements/${id}`);
                    fetchGroupDetails(activeGroup._id);
                  } catch (err) {
                    console.error('Error deleting settlement:', err);
                    alert('Failed to delete settlement');
                  }
                }
              }}
            />
          </motion.div>
        )}

        {tab === 'payments' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <GroupPaymentsTab groupId={activeGroup._id} groupMembers={activeGroup.members} />
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showExpenseModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-8 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl w-full max-w-xl shadow-2xl max-h-[calc(100vh-4rem)] overflow-hidden mx-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Add New Expense</h2>
                <button type="button" onClick={() => setShowExpenseModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
              <form onSubmit={handleAddExpense} className="space-y-4 overflow-y-auto pr-1 max-h-[calc(100vh-14rem)]">
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                    Description <Info size={14} className="text-slate-300" />
                  </label>
                  <input
                    type="text"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none border focus:border-primary-500"
                    placeholder="e.g. Pizza Night"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Paid By</label>
                  <select
                    value={expenseForm.paidBy}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paidBy: e.target.value })}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none border focus:border-primary-500"
                    required
                  >
                    <option value="" disabled>Select who paid</option>
                    {activeGroup.members.map((member) => (
                      <option key={member.user._id} value={member.user._id}>
                        {member.user.name} {member.user._id === currentUser?._id ? '(You)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none border focus:border-primary-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Split type</label>
                    <select
                      value={expenseForm.splitType}
                      onChange={(e) => setExpenseForm({ ...expenseForm, splitType: e.target.value })}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none border focus:border-primary-500"
                    >
                      <option value="equal">Equal</option>
                      <option value="unequal">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Method</label>
                    <select
                      value={expenseForm.paymentMethod}
                      onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none border focus:border-primary-500"
                    >
                      <option value="UPI">UPI</option>
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none border focus:border-primary-500"
                    >
                      <option value="General">General</option>
                      <option value="Food">Food</option>
                      <option value="Travel">Travel</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Bills">Bills</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Medical">Medical</option>
                    </select>
                  </div>
                </div>
                
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center hover:border-primary-500 transition-colors relative overflow-hidden group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center pointer-events-none">
                    {expenseForm.receipt ? (
                      <>
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden mb-2 border">
                          <img src={expenseForm.receipt} alt="Receipt preview" className="w-full h-full object-cover" />
                        </div>
                        <p className="text-sm font-semibold text-primary-600">Proof attached</p>
                        <p className="text-xs text-slate-500 mt-1">Click to change</p>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/30 transition-colors">
                          <UploadCloud size={24} className="text-slate-400 group-hover:text-primary-500" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Upload payment proof</p>
                        <p className="text-xs text-slate-500 mt-1">Optional (Image max 5MB)</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl bg-slate-50 dark:bg-slate-950 p-4 border">
                  <p className="text-sm font-semibold mb-3">Participants</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeGroup.members.map((member) => {
                      const checked = selectedParticipants.includes(member.user._id);
                      return (
                        <label key={member.user._id} className="flex items-center gap-3 p-3 rounded-2xl border cursor-pointer hover:border-primary-500">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleParticipant(member.user._id)}
                            className="h-4 w-4 accent-primary-600"
                          />
                          <span className="text-sm font-medium">{member.user.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {expenseForm.splitType === 'unequal' && (
                  <div className="rounded-3xl bg-slate-50 dark:bg-slate-950 p-4 border">
                    <p className="text-sm font-semibold mb-3">Custom share amounts</p>
                    <div className="space-y-3">
                      {activeGroup.members
                        .filter((member) => selectedParticipants.includes(member.user._id))
                        .map((member) => (
                          <div key={member.user._id} className="flex items-center gap-3">
                            <img src={member.user.avatar} className="w-10 h-10 rounded-full" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold">{member.user.name}</p>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={customShares[member.user._id] ?? ''}
                                onChange={(e) => updateCustomShare(member.user._id, e.target.value)}
                                className="w-full p-3 bg-white dark:bg-slate-900 rounded-2xl border focus:border-primary-500 outline-none"
                                placeholder="Share amount"
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {expenseError && (
                  <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-600 p-4 text-sm text-rose-700 dark:text-rose-200">
                    {expenseError}
                  </div>
                )}

                <div className="rounded-3xl bg-slate-50 dark:bg-slate-950 p-5 border">
                  <p className="text-sm font-semibold mb-3">Preview</p>
                  <div className="grid grid-cols-1 gap-3">
                    {previewShares.map((item) => (
                      <div key={item.userId} className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 p-3 border">
                        <span className="text-sm">{item.name}</span>
                        <span className="font-semibold">₹{item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowExpenseModal(false)}
                    className="w-full px-4 py-4 rounded-2xl border font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingExpense}
                    className="w-full px-4 py-4 rounded-2xl bg-primary-600 text-white font-bold shadow-lg shadow-primary-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingExpense ? 'Saving...' : 'Save Expense'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddMember && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-8 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 p-6 rounded-3xl w-full max-w-md shadow-2xl max-h-[calc(100vh-4rem)] overflow-hidden mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold">Invite Member</h3>
                  <p className="text-slate-500 text-sm">Add someone to this group by email.</p>
                </div>
                <button onClick={() => setShowAddMember(false)} className="text-slate-500 hover:text-slate-900">Close</button>
              </div>
              <div className="space-y-4">
                <input
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  type="email"
                  placeholder="member@example.com"
                  className="w-full p-4 rounded-2xl border bg-slate-50 dark:bg-slate-950 outline-none"
                />
                <button onClick={handleAddMember} className="w-full rounded-2xl bg-primary-600 text-white py-4 font-semibold">Invite</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettlementModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-8 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 p-6 rounded-3xl w-full max-w-lg shadow-2xl max-h-[calc(100vh-4rem)] overflow-hidden mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold">Request Settlement</h3>
                  <p className="text-slate-500 text-sm">Create a pending payment request for a group member.</p>
                </div>
                <button onClick={() => setShowSettlementModal(false)} className="text-slate-500 hover:text-slate-900">Close</button>
              </div>

              <div className="space-y-4 overflow-y-auto pr-1 max-h-[calc(100vh-16rem)]">
                <div>
                  <label className="block text-sm font-medium mb-2">Who is paying?</label>
                  <select
                    value={settlementForm.payerId}
                    onChange={(e) => setSettlementForm({ ...settlementForm, payerId: e.target.value })}
                    className="w-full p-4 rounded-2xl border bg-slate-50 dark:bg-slate-950 outline-none"
                  >
                    <option value="">Choose payer</option>
                    {activeGroup.members.map((member) => (
                      <option key={member.user?._id} value={member.user?._id}>
                        {member.user?.name} {member.user?._id === currentUser?._id ? '(You)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settlementForm.amount}
                    onChange={(e) => setSettlementForm({ ...settlementForm, amount: e.target.value })}
                    className="w-full p-4 rounded-2xl border bg-slate-50 dark:bg-slate-950 outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Select the member you will give money to</label>
                  <select
                    value={settlementForm.receiverId}
                    onChange={(e) => setSettlementForm({ ...settlementForm, receiverId: e.target.value })}
                    className="w-full p-4 rounded-2xl border bg-slate-50 dark:bg-slate-950 outline-none"
                  >
                    <option value="">Choose member</option>
                    {activeGroup.members
                      .filter((member) => member.user?._id !== settlementForm.payerId)
                      .map((member) => (
                        <option key={member.user?._id} value={member.user?._id}>{member.user?.name}</option>
                      ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-2">Choose the user who should receive this settlement request.</p>
                  
                  {settlementForm.receiverId && (() => {
                    const receiverMember = activeGroup.members.find(m => m.user?._id === settlementForm.receiverId);
                    const receiverUser = receiverMember?.user;
                    if (receiverUser?.upiId) {
                      return (
                        <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-2xl border border-primary-100 dark:border-primary-800 flex flex-col items-center gap-3">
                          <QRCodeSVG 
                            value={`upi://pay?pa=${receiverUser.upiId}&pn=${encodeURIComponent(receiverUser.name)}&cu=INR&am=${settlementForm.amount || ''}`} 
                            size={160}
                            includeMargin={true}
                            className="rounded-lg shadow-md bg-white p-2"
                          />
                          <div className="text-center">
                            <p className="text-sm font-bold text-primary-900 dark:text-primary-100">Scan to Pay {receiverUser.name}</p>
                            <p className="text-xs text-primary-600 dark:text-primary-400">{receiverUser.upiId}</p>
                            {settlementForm.amount && (
                              <p className="text-lg font-black text-primary-700 dark:text-primary-300 mt-1">₹{settlementForm.amount}</p>
                            )}
                          </div>
                          <a 
                            href={`upi://pay?pa=${receiverUser.upiId}&pn=${encodeURIComponent(receiverUser.name)}&cu=INR&am=${settlementForm.amount || ''}`}
                            className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg text-sm"
                          >
                            <QrCode size={18} /> Pay via UPI App
                          </a>
                          <p className="text-[10px] text-slate-500 text-center">Clicking this will open your payment apps (Mobile Only)</p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Payment type</label>
                  <select
                    value={settlementForm.paymentType}
                    onChange={(e) => setSettlementForm({ ...settlementForm, paymentType: e.target.value })}
                    className="w-full p-4 rounded-2xl border bg-slate-50 dark:bg-slate-950 outline-none"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Upload screenshot</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    className="w-full rounded-2xl border bg-slate-50 dark:bg-slate-950 p-2 text-sm text-slate-700 dark:text-slate-200"
                  />
                  {settlementForm.screenshot && (
                    <p className="mt-2 text-sm text-slate-500 truncate">Image ready to upload</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Note</label>
                  <textarea
                    value={settlementForm.note}
                    onChange={(e) => setSettlementForm({ ...settlementForm, note: e.target.value })}
                    className="w-full p-4 rounded-2xl border bg-slate-50 dark:bg-slate-950 outline-none"
                    rows="3"
                    placeholder="Optional details for the request"
                  />
                </div>
                {settlementError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{settlementError}</div>
                )}
                {error && !settlementError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
                )}
                <button 
                  onClick={handleCreateSettlement} 
                  disabled={isSubmittingSettlement}
                  className="w-full rounded-2xl bg-primary-600 text-white py-4 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingSettlement ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send payment request'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddMember(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-xl font-bold">Add Group Member</h3>
                <button onClick={() => setShowAddMember(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Invite by Email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder="friend@example.com"
                      className="flex-1 p-3 rounded-xl border bg-slate-50 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                    <button 
                      onClick={() => {
                        addMember(id, memberEmail);
                        setMemberEmail('');
                        setShowAddMember(false);
                      }}
                      className="bg-primary-600 text-white px-4 py-2 rounded-xl font-bold"
                    >
                      Invite
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {memberEmail.length >= 2 ? 'Search Results' : 'Select from Friends'}
                  </label>
                  {friendsLoading ? (
                    <div className="text-center py-4 text-slate-500 text-sm flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600" />
                      Searching...
                    </div>
                  ) : friends.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed">
                      <p className="text-slate-500 text-sm px-4">
                        {memberEmail.length >= 2 
                          ? `No users found matching "${memberEmail}"` 
                          : "No friends found yet. Try searching by name or email above!"}
                      </p>
                    </div>
                  ) : availableFriends.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed">
                      <p className="text-slate-500 text-sm px-4">
                        All your friends are already members of this group!
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {availableFriends.map((friend) => (
                        <button
                          key={friend._id}
                          onClick={() => {
                            addMember(id, friend.email);
                            setShowAddMember(false);
                          }}
                          className="flex items-center gap-3 p-3 rounded-2xl border hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-500 transition-all text-left group"
                        >
                          <img src={friend.avatar} className="w-10 h-10 rounded-full border shadow-sm" alt="" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{friend.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{friend.email}</p>
                          </div>
                          <Plus size={16} className="text-slate-300 group-hover:text-primary-600" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t">
                <button onClick={() => setShowAddMember(false)} className="w-full py-3 bg-white dark:bg-slate-800 border rounded-xl font-bold">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        <ProofViewer 
          imageUrl={viewReceiptUrl} 
          onClose={() => setViewReceiptUrl(null)} 
          altText="Proof" 
        />
      </AnimatePresence>

      <AnimatePresence>
        {selectedSettlement && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-8 backdrop-blur-sm">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="bg-white dark:bg-slate-900 p-6 rounded-3xl w-full max-w-2xl shadow-2xl max-h-[calc(100vh-4rem)] overflow-hidden mx-auto">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-2xl font-bold">Settlement receipt</h3>
                  <p className="text-slate-500 text-sm">Detailed payment record for this settlement request.</p>
                </div>
                <button onClick={() => setSelectedSettlement(null)} className="text-slate-500 hover:text-slate-900">Close</button>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] overflow-y-auto pr-1 max-h-[calc(100vh-16rem)]">
                <div className="space-y-4">
                  <div className="rounded-3xl bg-slate-50 dark:bg-slate-950 p-5 border">
                    <p className="text-sm text-slate-500">Status</p>
                    <div className="mt-3">{renderSettlementStatus(selectedSettlement.status)}</div>
                  </div>
                  <div className="rounded-3xl bg-slate-50 dark:bg-slate-950 p-5 border">
                    <p className="text-sm text-slate-500">Amount</p>
                    <p className="mt-3 text-3xl font-bold">₹{selectedSettlement.amount.toFixed(2)}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 dark:bg-slate-950 p-5 border">
                    <p className="text-sm text-slate-500">Payment type</p>
                    <p className="mt-3 font-semibold">{selectedSettlement.paymentType}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 dark:bg-slate-950 p-5 border">
                    <p className="text-sm text-slate-500">Requested on</p>
                    <p className="mt-3 font-semibold">{new Date(selectedSettlement.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-3xl bg-slate-50 dark:bg-slate-950 p-5 border">
                    <p className="text-sm text-slate-500">From</p>
                    <p className="mt-3 font-semibold">{selectedSettlement.payerId?.name || selectedSettlement.payerId?.email || 'Unknown'}</p>
                    <p className="text-sm text-slate-400">Payer</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 dark:bg-slate-950 p-5 border">
                    <p className="text-sm text-slate-500">To</p>
                    <p className="mt-3 font-semibold">{selectedSettlement.receiverId?.name || selectedSettlement.receiverId?.email || 'Unknown'}</p>
                    <p className="text-sm text-slate-400">Receiver</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 dark:bg-slate-950 p-5 border">
                    <p className="text-sm text-slate-500">Note</p>
                    <p className="mt-3 text-slate-700 dark:text-slate-200">{selectedSettlement.note || 'No note provided'}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 dark:bg-slate-950 p-5 border">
                    <p className="text-sm text-slate-500">Added by</p>
                    <p className="mt-3 font-semibold">{selectedSettlement.addedBy?.name || 'Unknown'}</p>
                  </div>
                </div>
              </div>

              {selectedSettlement.screenshot && (
                <div 
                  className="mt-6 rounded-3xl bg-slate-50 dark:bg-slate-950 p-5 border cursor-pointer hover:opacity-90 transition-opacity" 
                  onClick={() => setViewReceiptUrl(selectedSettlement.screenshot)}
                >
                  <p className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                    Screenshot <span className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md">Click to view full size</span>
                  </p>
                  <img src={selectedSettlement.screenshot} alt="Settlement screenshot" className="w-full max-h-48 rounded-3xl object-cover" />
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {removingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setRemovingMember(null)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserPlus size={32} className="rotate-45" />
              </div>
              <h3 className="text-xl font-bold mb-2">Remove Member?</h3>
              <p className="text-slate-500 text-sm mb-8">
                Are you sure you want to remove <span className="font-bold text-slate-900 dark:text-slate-100">{removingMember.name}</span> from the group?
                Their expenses and settlements will remain, but they won't be able to participate in new ones.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setRemovingMember(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    const success = await removeMember(activeGroup._id, removingMember.id);
                    if (success) {
                      setRemovingMember(null);
                    }
                  }}
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold shadow-lg shadow-rose-200 dark:shadow-none"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Group Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Edit Group</h3>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateGroup} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Group Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-primary-500/10 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-primary-500/10 transition-all resize-none h-32"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-primary-500/10 transition-all appearance-none"
                  >
                    <option value="Trip">Trip</option>
                    <option value="Home">Home</option>
                    <option value="Office">Office</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary-500/20 transition-all disabled:opacity-50"
                >
                  {loading ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Expense Modal */}
      <AnimatePresence>
        {showEditExpenseModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-8 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl w-full max-w-xl shadow-2xl max-h-[calc(100vh-4rem)] overflow-hidden mx-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Edit Expense</h2>
                <button onClick={() => setShowEditExpenseModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveEditExpense} className="space-y-4 overflow-y-auto pr-1 max-h-[calc(100vh-14rem)]">
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                    Description <Info size={14} className="text-slate-300" />
                  </label>
                  <input
                    type="text"
                    value={editExpenseForm.description}
                    onChange={(e) => setEditExpenseForm({ ...editExpenseForm, description: e.target.value })}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none border focus:border-primary-500"
                    placeholder="e.g. Pizza Night"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Paid By</label>
                  <select
                    value={editExpenseForm.paidBy}
                    onChange={(e) => setEditExpenseForm({ ...editExpenseForm, paidBy: e.target.value })}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none border focus:border-primary-500"
                    required
                  >
                    <option value="" disabled>Select who paid</option>
                    {activeGroup.members.map((member) => (
                      <option key={member.user._id} value={member.user._id}>
                        {member.user.name} {member.user._id === currentUser?._id ? '(You)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Amount (Rs.)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editExpenseForm.amount}
                      onChange={(e) => setEditExpenseForm({ ...editExpenseForm, amount: e.target.value })}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none border focus:border-primary-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Split type</label>
                    <select
                      value={editExpenseForm.splitType}
                      onChange={(e) => setEditExpenseForm({ ...editExpenseForm, splitType: e.target.value })}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none border focus:border-primary-500"
                    >
                      <option value="equal">Equal</option>
                      <option value="unequal">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Method</label>
                    <select
                      value={editExpenseForm.paymentMethod}
                      onChange={(e) => setEditExpenseForm({ ...editExpenseForm, paymentMethod: e.target.value })}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none border focus:border-primary-500"
                    >
                      <option value="UPI">UPI</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Expense Date</label>
                    <input
                      type="date"
                      value={editExpenseForm.date}
                      onChange={(e) => setEditExpenseForm({ ...editExpenseForm, date: e.target.value })}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none border focus:border-primary-500 font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <input
                      type="text"
                      value={editExpenseForm.category}
                      onChange={(e) => setEditExpenseForm({ ...editExpenseForm, category: e.target.value })}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none border focus:border-primary-500"
                      placeholder="Category (e.g. Food, Travel)"
                    />
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center hover:border-primary-500 transition-colors relative overflow-hidden group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditReceiptUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center pointer-events-none">
                    {editExpenseForm.receipt ? (
                      <>
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden mb-2 border">
                          <img src={editExpenseForm.receipt} alt="Receipt preview" className="w-full h-full object-cover" />
                        </div>
                        <p className="text-sm font-semibold text-primary-600">Proof attached</p>
                        <p className="text-xs text-slate-500 mt-1">Click to change</p>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/30 transition-colors">
                          <UploadCloud size={24} className="text-slate-400 group-hover:text-primary-500" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Upload payment proof</p>
                        <p className="text-xs text-slate-500 mt-1">Optional (Image max 5MB)</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl bg-slate-50 dark:bg-slate-950 p-4 border">
                  <p className="text-sm font-semibold mb-3">Participants</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeGroup.members.map((member) => {
                      const checked = editSelectedParticipants.includes(member.user._id);
                      return (
                        <label key={member.user._id} className="flex items-center gap-3 p-3 rounded-2xl border cursor-pointer hover:border-primary-500 font-medium text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleEditParticipant(member.user._id)}
                            className="h-4 w-4 accent-primary-600"
                          />
                          <span className="text-sm font-medium">{member.user.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {editExpenseForm.splitType === 'unequal' && (
                  <div className="rounded-3xl bg-slate-50 dark:bg-slate-950 p-4 border">
                    <p className="text-sm font-semibold mb-3">Custom share amounts</p>
                    <div className="space-y-3">
                      {activeGroup.members
                        .filter((member) => editSelectedParticipants.includes(member.user._id))
                        .map((member) => (
                          <div key={member.user._id} className="flex items-center gap-3">
                            <img src={member.user.avatar} className="w-10 h-10 rounded-full" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold">{member.user.name}</p>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editCustomShares[member.user._id] ?? ''}
                                onChange={(e) => updateEditCustomShare(member.user._id, e.target.value)}
                                className="w-full p-3 bg-white dark:bg-slate-900 rounded-2xl border focus:border-primary-500 outline-none"
                                placeholder="Share amount"
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {editExpenseError && (
                  <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-600 p-4 text-sm text-rose-700 dark:text-rose-200 font-bold">
                    {editExpenseError}
                  </div>
                )}

                <div className="rounded-3xl bg-slate-50 dark:bg-slate-950 p-5 border">
                  <p className="text-sm font-semibold mb-3">Preview</p>
                  <div className="grid grid-cols-1 gap-3">
                    {editPreviewShares.map((item) => (
                      <div key={item.userId} className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 p-3 border text-slate-700 dark:text-slate-300">
                        <span className="text-sm">{item.name}</span>
                        <span className="font-semibold">₹{item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditExpenseModal(false)}
                    className="w-full px-4 py-4 rounded-2xl border font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEditExpense}
                    className="w-full px-4 py-4 rounded-2xl bg-primary-600 text-white font-bold shadow-lg shadow-primary-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingEditExpense ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* End of Modals */}

      {/* Report Settlement Issue Modal */}
      <AnimatePresence>
        {disputingSettlementId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-6 text-center border-b border-slate-100 dark:border-slate-800">
                <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4">
                  <Info className="w-8 h-8 text-orange-600 dark:text-orange-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">Report Issue</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Please provide a reason for disputing this settlement. Admin will review the dispute.
                </p>
              </div>
              <div className="p-6">
                <textarea
                  placeholder="E.g., Invalid screenshot, incorrect amount..."
                  value={disputeSettlementReason}
                  onChange={(e) => setDisputeSettlementReason(e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-primary-500 min-h-[120px] outline-none"
                ></textarea>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button
                  onClick={() => {
                    setDisputingSettlementId(null);
                    setDisputeSettlementReason('');
                  }}
                  className="flex-1 py-3 bg-white dark:bg-slate-800 border rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleRespond(disputingSettlementId, 'dispute', disputeSettlementReason);
                    setDisputingSettlementId(null);
                    setDisputeSettlementReason('');
                  }}
                  disabled={!disputeSettlementReason.trim() || processingSettlementId === disputingSettlementId}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  Submit Dispute
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ChatDrawer
        groupId={activeGroup._id}
        groupName={activeGroup.name}
        isOpen={showChat}
        onClose={() => setShowChat(false)}
      />
    </div>
  );
};

export default GroupDetails;
