import React, { useState, useEffect } from 'react';
import { Receipt, CheckCircle2, Loader2, IndianRupee, UploadCloud, X } from 'lucide-react';
import api from '../../../utils/api';
import { compressImageFile } from '../../../utils/imageCompression';

const CATEGORIES = ['General', 'Food', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'Medical'];
const PAYMENT_METHODS = [
  { label: 'UPI', value: 'UPI' },
  { label: 'Cash', value: 'CASH' }
];

const AddExpenseWizard = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groupMembers, setGroupMembers] = useState([]);
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [splitType, setSplitType] = useState('equal'); // 'equal' | 'exact'
  
  const [category, setCategory] = useState('General');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paidBy, setPaidBy] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [customSplits, setCustomSplits] = useState({}); // { userId: amount }
  const [receipt, setReceipt] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [fetchingGroups, setFetchingGroups] = useState(true);
  const [fetchingMembers, setFetchingMembers] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Fetch groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const { data } = await api.get('/groups');
        setGroups(data);
        if (data.length > 0) setSelectedGroup(data[0]._id);
      } catch (err) {
        console.error(err);
      } finally {
        setFetchingGroups(false);
      }
    };
    fetchGroups();
  }, []);

  // Fetch members when group changes
  useEffect(() => {
    if (!selectedGroup) return;
    const fetchMembers = async () => {
      setFetchingMembers(true);
      try {
        const { data } = await api.get(`/groups/${selectedGroup}/members`);
        // data is array of { user: { _id, name, ... }, role }
        setGroupMembers(data);
        
        // Default paidBy to first member (or user if we had context)
        if (data.length > 0) {
          setPaidBy(data[0].user._id);
        }
        
        // Default select all participants
        const allIds = data.map(m => m.user._id);
        setSelectedParticipants(allIds);
        
        // Reset custom splits
        const initialSplits = {};
        allIds.forEach(id => initialSplits[id] = '');
        setCustomSplits(initialSplits);

      } catch (err) {
        console.error(err);
        setError('Failed to fetch group members');
      } finally {
        setFetchingMembers(false);
      }
    };
    fetchMembers();
  }, [selectedGroup]);

  const toggleParticipant = (userId) => {
    setSelectedParticipants(prev => {
      if (prev.includes(userId)) return prev.filter(id => id !== userId);
      return [...prev, userId];
    });
  };

  const handleCustomSplitChange = (userId, value) => {
    setCustomSplits(prev => ({ ...prev, [userId]: value }));
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file for payment proof.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Payment proof image must be under 5MB.');
      return;
    }

    setError(null);
    try {
      const optimizedProof = await compressImageFile(file, { maxDimension: 1400, quality: 0.85 });
      setReceipt(optimizedProof);
    } catch {
      setError('Failed to process the selected proof image.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedGroup) return setError("Please select a group");
    if (selectedParticipants.length === 0) return setError("Select at least one participant");
    
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) return setError("Enter a valid amount");

    let finalSplitDetails = [];
    const backendSplitType = splitType === 'equal' ? 'equal' : 'unequal';

    if (splitType === 'exact') {
      let totalCustom = 0;
      finalSplitDetails = selectedParticipants.map(userId => {
        const val = Number(customSplits[userId]) || 0;
        totalCustom += val;
        return { user: userId, amount: val };
      });

      // Allow 1 cent/rupee rounding diff if needed, but exact is exact
      if (Math.abs(totalCustom - parsedAmount) > 0.01) {
        return setError(`Exact splits sum (₹${totalCustom}) must equal total amount (₹${parsedAmount})`);
      }
    } else {
      // For 'equal' split, we must also populate finalSplitDetails!
      const baseShare = Number((parsedAmount / selectedParticipants.length).toFixed(2));
      finalSplitDetails = selectedParticipants.map((userId, index) => {
        let shareAmount;
        if (index === selectedParticipants.length - 1) {
          // Adjust last person's share to account for rounding errors
          shareAmount = Number((parsedAmount - (baseShare * (selectedParticipants.length - 1))).toFixed(2));
        } else {
          shareAmount = baseShare;
        }
        return { user: userId, amount: shareAmount };
      });
    }

    setLoading(true);
    try {
      await api.post(
        '/expenses',
        {
          groupId: selectedGroup,
          amount: parsedAmount,
          description,
          splitType: backendSplitType,
          category,
          paidBy,
          paymentMethod,
          participants: selectedParticipants,
          splitDetails: finalSplitDetails,
          ...(receipt ? { receipt } : {})
        },
        receipt ? { timeout: 60000 } : undefined
      );
      setSuccess(true);
      window.dispatchEvent(new Event('refreshBalances'));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col items-center justify-center space-y-2 shadow-sm text-center">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
        <h3 className="text-green-800 font-medium text-sm">Expense Added</h3>
        <p className="text-green-600 text-xs">Your expense has been successfully split.</p>
      </div>
    );
  }

  const splitPerPerson = selectedParticipants.length > 0 && amount 
    ? (Number(amount) / selectedParticipants.length).toFixed(2) 
    : '0.00';

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm w-full max-w-sm mx-auto">
      <div className="flex items-center gap-2 mb-3 border-b border-gray-50 pb-2">
        <div className="p-1.5 bg-orange-50 rounded-md text-orange-600">
          <Receipt className="w-4 h-4" />
        </div>
        <h3 className="font-medium text-sm text-gray-800">Add Expense</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Row 1: Group & Amount */}
        <div className="flex gap-2">
          <div className="flex-[2]">
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase tracking-wide">Group</label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              disabled={fetchingGroups}
              className="w-full text-xs p-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-orange-200 focus:border-orange-500 outline-none"
            >
              {fetchingGroups ? <option>Loading...</option> : groups.map(g => (
                <option key={g._id} value={g._id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase tracking-wide">Amount</label>
            <div className="relative">
              <IndianRupee className="w-3 h-3 absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                required min="1" step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-xs p-1.5 pl-5 border border-gray-200 rounded focus:ring-1 focus:ring-orange-200 focus:border-orange-500 outline-none font-mono"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Description & Category */}
        <div className="flex gap-2">
          <div className="flex-[2]">
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase tracking-wide">Description</label>
            <input
              type="text" required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-orange-200 focus:border-orange-500 outline-none"
              placeholder="e.g. Dinner"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase tracking-wide">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs p-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-orange-200 focus:border-orange-500 outline-none"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Row 3: Paid By & Method */}
        <div className="flex gap-2">
          <div className="flex-[2]">
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase tracking-wide">Paid By</label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              disabled={fetchingMembers}
              className="w-full text-xs p-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-orange-200 focus:border-orange-500 outline-none"
            >
              {fetchingMembers ? <option>Loading...</option> : groupMembers.map(m => (
                <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase tracking-wide">Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full text-xs p-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-orange-200 focus:border-orange-500 outline-none"
            >
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        {/* Split Section */}
        <div className="border-t border-gray-50 pt-2">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide">Split With</label>
            <div className="flex bg-gray-100 rounded p-0.5">
              <button
                type="button"
                onClick={() => setSplitType('equal')}
                className={`text-[10px] px-2 py-0.5 rounded transition-all ${splitType === 'equal' ? 'bg-white shadow-sm font-medium text-gray-800' : 'text-gray-500'}`}
              >
                Equal
              </button>
              <button
                type="button"
                onClick={() => setSplitType('exact')}
                className={`text-[10px] px-2 py-0.5 rounded transition-all ${splitType === 'exact' ? 'bg-white shadow-sm font-medium text-gray-800' : 'text-gray-500'}`}
              >
                Exact
              </button>
            </div>
          </div>

          {fetchingMembers ? (
            <div className="text-xs text-gray-400 py-2">Loading members...</div>
          ) : (
            <div className="space-y-1.5 max-h-32 overflow-y-auto thin-scrollbar pr-1">
              {groupMembers.map(m => {
                const isSelected = selectedParticipants.includes(m.user._id);
                return (
                  <div key={m.user._id} className="flex items-center justify-between text-xs bg-gray-50/50 p-1 rounded hover:bg-gray-50">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleParticipant(m.user._id)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 w-3 h-3"
                      />
                      <span className="text-gray-700 truncate max-w-[120px]">{m.user.name}</span>
                    </label>
                    
                    {isSelected && splitType === 'equal' && (
                      <span className="text-gray-500 font-mono text-[10px]">₹{splitPerPerson}</span>
                    )}
                    
                    {isSelected && splitType === 'exact' && (
                      <div className="relative w-20">
                        <input
                          type="number"
                          min="0" step="0.01"
                          value={customSplits[m.user._id] || ''}
                          onChange={(e) => handleCustomSplitChange(m.user._id, e.target.value)}
                          className="w-full text-[10px] p-1 border border-gray-200 rounded focus:border-orange-500 outline-none font-mono text-right"
                          placeholder="0.00"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upload Payment Proof */}
        <div className="border-t border-gray-50 pt-2">
          <label className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wide">
            Payment Proof
          </label>
          <div className="border border-dashed border-gray-200 hover:border-orange-400 rounded-lg p-2.5 text-center relative overflow-hidden group transition-colors bg-gray-50/40">
            <input
              type="file"
              accept="image/*"
              onChange={handleReceiptUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            {receipt ? (
              <div className="flex items-center justify-between gap-2 text-left">
                <div className="flex items-center gap-2 min-w-0 pointer-events-none">
                  <img
                    src={receipt}
                    alt="Receipt preview"
                    className="w-9 h-9 rounded-md object-cover border border-gray-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-orange-600 truncate">Proof attached</p>
                    <p className="text-[10px] text-gray-400">Click to change</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setReceipt('');
                  }}
                  title="Remove proof"
                  className="relative z-20 p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 pointer-events-none py-0.5">
                <div className="w-7 h-7 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                  <UploadCloud className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-semibold text-gray-700 leading-tight">Upload payment proof</p>
                  <p className="text-[10px] text-gray-400 leading-tight">Optional (Image max 5MB)</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-red-500 text-[10px] bg-red-50 p-1.5 rounded">{error}</p>}

        <button
          type="submit"
          disabled={loading || !amount || !description || !selectedGroup || selectedParticipants.length === 0}
          className="w-full flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white p-2 rounded-md font-medium text-xs transition-colors disabled:opacity-50 mt-2"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save Expense"}
        </button>
      </form>
    </div>
  );
};

export default AddExpenseWizard;
