import React, { useState } from 'react';
import { Plus, IndianRupee, MapPin, Clock, Check, Save, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getCurrentDateTimeLocal, formatInr } from '../../utils/tempSettlementEngine';

const CATEGORIES = ['Food', 'Travel', 'Stay', 'Fuel', 'Shopping', 'Entertainment', 'General'];

const TempExpenseForm = ({ members, editingExpense, onSaveExpense, onCancelEdit }) => {
  const [description, setDescription] = useState(editingExpense?.description || '');
  const [location, setLocation] = useState(editingExpense?.location || '');
  const [amount, setAmount] = useState(editingExpense ? String(editingExpense.amount || '') : '');
  const [paidBy, setPaidBy] = useState(editingExpense?.paidBy || members[0]?.id || '');
  const [category, setCategory] = useState(editingExpense?.category || 'Food');
  const [dateTime, setDateTime] = useState(editingExpense?.dateTime || getCurrentDateTimeLocal);
  const [splitType, setSplitType] = useState(editingExpense?.splitType || 'equal');
  const [participants, setParticipants] = useState(() =>
    editingExpense?.participants?.length
      ? editingExpense.participants.filter((id) => members.some((m) => m.id === id))
      : members.map((m) => m.id)
  );
  const [customSplits, setCustomSplits] = useState(() => {
    const initial = {};
    (editingExpense?.splitDetails || []).forEach((item) => {
      initial[item.memberId] = String(item.amount);
    });
    return initial;
  });
  const [error, setError] = useState('');

  const toggleParticipant = (memberId) => {
    setParticipants((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const resetForm = () => {
    setDescription('');
    setLocation('');
    setAmount('');
    setDateTime(getCurrentDateTimeLocal());
    setSplitType('equal');
    setParticipants(members.map((m) => m.id));
    setCustomSplits({});
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const cleanDesc = description.trim();
    if (!cleanDesc) {
      setError('Please enter what this expense was for.');
      return;
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter an amount greater than 0.');
      return;
    }

    if (!paidBy) {
      setError('Please select who paid.');
      return;
    }

    if (participants.length === 0) {
      setError('Please select at least 1 member included in this expense.');
      return;
    }

    let splitDetails = [];
    if (splitType === 'exact') {
      let sum = 0;
      splitDetails = participants.map((memberId) => {
        const val = Number(customSplits[memberId]) || 0;
        sum += val;
        return { memberId, amount: val };
      });
      if (Math.abs(sum - parsedAmount) > 0.05) {
        setError(`Exact split total (₹${sum.toFixed(2)}) must match ₹${parsedAmount.toFixed(2)}.`);
        return;
      }
    }

    onSaveExpense({
      id: editingExpense?.id || `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      description: cleanDesc,
      location: location.trim(),
      amount: parsedAmount,
      paidBy,
      category,
      dateTime: dateTime || getCurrentDateTimeLocal(),
      splitType,
      participants,
      splitDetails
    });

    if (!editingExpense) {
      resetForm();
    }
  };

  const perPersonEstimate =
    participants.length > 0 && Number(amount) > 0 ? Number(amount) / participants.length : 0;

  return (
    <div className="bg-white dark:bg-[#16181d] rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">
            {editingExpense ? 'Edit Trip Expense' : 'Add Trip Expense'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Record who paid, how much, where, when & who was included.
          </p>
        </div>
        {editingExpense && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              onCancelEdit();
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={14} /> Cancel Edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Paid By + Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Paid By (Kaun Pay Kiya) *
            </label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-primary-500"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Amount (Kitna) *
            </label>
            <div className="relative">
              <IndianRupee size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-primary-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Description + Place/Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Expense For *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Dinner, Cab, Petrol, Hotel"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Where / Place (Kaha)
            </label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Baga Beach, Highway Dhaba"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Time + Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
                Date & Time (Kis Time)
              </label>
              <button
                type="button"
                onClick={() => setDateTime(getCurrentDateTimeLocal())}
                className="text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:underline"
              >
                Set Now
              </button>
            </div>
            <div className="relative">
              <Clock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-primary-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Participants + Split Type */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Who Was Included? (Kon Kon Shamil Tha)
              </p>
              <p className="text-[11px] text-slate-400">
                {participants.length} of {members.length} selected
                {splitType === 'equal' && perPersonEstimate > 0 && ` • ${formatInr(perPersonEstimate)} each`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setParticipants(members.map((m) => m.id))}
                className="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline"
              >
                All
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                type="button"
                onClick={() => setParticipants([])}
                className="text-[11px] font-bold text-slate-500 hover:text-rose-500"
              >
                Clear
              </button>
              <div className="flex bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 ml-1">
                <button
                  type="button"
                  onClick={() => setSplitType('equal')}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-bold transition-all',
                    splitType === 'equal'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  Equal
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType('exact')}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-bold transition-all',
                    splitType === 'exact'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  Exact
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {members.map((member) => {
              const isSelected = participants.includes(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleParticipant(member.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
                    isSelected
                      ? 'bg-primary-50 dark:bg-primary-500/15 border-primary-500 text-primary-700 dark:text-primary-300'
                      : 'bg-white dark:bg-[#16181d] border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                  )}
                >
                  <span
                    className={cn(
                      'w-4 h-4 rounded-md flex items-center justify-center border',
                      isSelected
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    )}
                  >
                    {isSelected && <Check size={11} strokeWidth={3} />}
                  </span>
                  {member.name}
                </button>
              );
            })}
          </div>

          {splitType === 'exact' && participants.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
              {members
                .filter((m) => participants.includes(m.id))
                .map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-2 bg-white dark:bg-[#16181d] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                      {member.name}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={customSplits[member.id] ?? ''}
                      onChange={(e) =>
                        setCustomSplits((prev) => ({ ...prev, [member.id]: e.target.value }))
                      }
                      placeholder="0.00"
                      className="w-24 text-right text-xs font-bold px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:border-primary-500"
                    />
                  </div>
                ))}
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-primary-500/25 transition-all active:scale-[0.99]"
        >
          {editingExpense ? (
            <>
              <Save size={15} /> Update Expense
            </>
          ) : (
            <>
              <Plus size={16} strokeWidth={2.75} /> Add Expense to Trip
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default TempExpenseForm;
