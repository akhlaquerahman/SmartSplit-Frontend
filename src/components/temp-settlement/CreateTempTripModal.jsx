import React, { useState } from 'react';
import { X, Plus, Trash2, Users, Compass } from 'lucide-react';

const createMemberId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const CreateTempTripModal = ({ isOpen, onClose, onSave, initialTrip = null, defaultUserName = '' }) => {
  const buildInitialMembers = () => {
    if (initialTrip?.members?.length >= 2) {
      return initialTrip.members.map((m) => ({ ...m }));
    }
    return [
      { id: createMemberId(), name: defaultUserName ? defaultUserName.split(' ')[0] : '' },
      { id: createMemberId(), name: '' },
      { id: createMemberId(), name: '' }
    ];
  };

  const [tripName, setTripName] = useState(initialTrip?.name || '');
  const [members, setMembers] = useState(buildInitialMembers);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleMemberCountChange = (countValue) => {
    const targetCount = Math.max(2, Math.min(30, Number(countValue) || 2));
    setMembers((prev) => {
      if (targetCount > prev.length) {
        const extra = Array.from({ length: targetCount - prev.length }, () => ({
          id: createMemberId(),
          name: ''
        }));
        return [...prev, ...extra];
      }
      return prev.slice(0, targetCount);
    });
  };

  const handleMemberNameChange = (id, value) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, name: value } : m)));
  };

  const handleAddMemberRow = () => {
    setMembers((prev) => [...prev, { id: createMemberId(), name: '' }]);
  };

  const handleRemoveMemberRow = (id) => {
    if (members.length <= 2) return;
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const cleanTripName = tripName.trim();
    if (!cleanTripName) {
      setError('Please enter a trip or event name.');
      return;
    }

    const cleanedMembers = members
      .map((m) => ({ id: m.id, name: m.name.trim() }))
      .filter((m) => m.name.length > 0);

    if (cleanedMembers.length < 2) {
      setError('Please enter at least 2 member names.');
      return;
    }

    const lowerNames = cleanedMembers.map((m) => m.name.toLowerCase());
    if (new Set(lowerNames).size !== lowerNames.length) {
      setError('Member names must be unique so expenses and settlements stay clear.');
      return;
    }

    onSave({
      id: initialTrip?.id || `trip_${Date.now()}`,
      name: cleanTripName,
      members: cleanedMembers
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#16181d] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400">
              <Compass size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {initialTrip ? 'Edit Trip & Members' : 'Create Temporary Trip'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No account signup needed — just enter trip name & member names.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Trip / Event Name *
            </label>
            <input
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="e.g. Goa Trip, Manali Weekend, Office Dinner"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              required
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
                How Many Members? ({members.length})
              </label>
              <p className="text-[11px] text-slate-400">Enter count or add members below</p>
            </div>
            <div className="flex items-center gap-1.5">
              {[2, 3, 4, 5, 6].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleMemberCountChange(preset)}
                  className={`w-8 h-8 rounded-lg text-xs font-black transition-all border ${
                    members.length === preset
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-primary-400'
                  }`}
                >
                  {preset}
                </button>
              ))}
              <input
                type="number"
                min={2}
                max={30}
                value={members.length}
                onChange={(e) => handleMemberCountChange(e.target.value)}
                aria-label="Number of members"
                className="w-14 h-8 px-2 rounded-lg text-xs font-black text-center bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Users size={13} /> Member Names
              </label>
              <button
                type="button"
                onClick={handleAddMemberRow}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
              >
                <Plus size={14} /> Add Member
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1">
              {members.map((member, index) => (
                <div key={member.id} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-black text-slate-500 flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) => handleMemberNameChange(member.id, e.target.value)}
                    placeholder={`Member ${index + 1} name`}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-primary-500"
                  />
                  {members.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMemberRow(member.id)}
                      title="Remove member"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-primary-500/25 transition-all"
            >
              {initialTrip ? 'Save Trip Changes' : 'Start Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTempTripModal;

