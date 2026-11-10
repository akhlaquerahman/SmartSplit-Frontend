import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Compass,
  Users,
  Wallet,
  Receipt,
  TrendingUp,
  Edit2,
  Trash2,
  MapPin,
  Clock,
  Tag
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import {
  calculateTempTripSummary,
  formatInr,
  formatExpenseDateTime
} from '../utils/tempSettlementEngine';
import CreateTempTripModal from '../components/temp-settlement/CreateTempTripModal';
import TempExpenseForm from '../components/temp-settlement/TempExpenseForm';
import TempSettlementReport from '../components/temp-settlement/TempSettlementReport';

const getStorageKey = (userId) => `smartsplit_temp_trips_v1_${userId || 'guest'}`;

const loadTrips = (storageKey) => {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const TempSettlement = () => {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const storageKey = getStorageKey(user?._id);

  const [trips, setTrips] = useState(() => loadTrips(storageKey));
  const [activeTripId, setActiveTripId] = useState(() => {
    const initial = loadTrips(storageKey);
    return initial[0]?.id || null;
  });

  const [showCreateModal, setShowCreateModal] = useState(() => {
    const wantsNew = searchParams.get('new') === '1';
    const initial = loadTrips(storageKey);
    return wantsNew || initial.length === 0;
  });
  const [editingTrip, setEditingTrip] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [confirmDeleteTripId, setConfirmDeleteTripId] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(trips));
    } catch (err) {
      console.error('Failed to persist temporary trips:', err);
    }
  }, [trips, storageKey]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const activeTrip = useMemo(
    () => trips.find((t) => t.id === activeTripId) || trips[0] || null,
    [trips, activeTripId]
  );

  const summary = useMemo(
    () => (activeTrip ? calculateTempTripSummary(activeTrip) : null),
    [activeTrip]
  );

  const memberNameById = useMemo(() => {
    if (!activeTrip) return {};
    return activeTrip.members.reduce((acc, m) => {
      acc[m.id] = m.name;
      return acc;
    }, {});
  }, [activeTrip]);

  const handleSaveTrip = (tripPayload) => {
    if (editingTrip) {
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripPayload.id
            ? {
                ...t,
                name: tripPayload.name,
                members: tripPayload.members,
                updatedAt: new Date().toISOString()
              }
            : t
        )
      );
      setEditingTrip(null);
      setShowCreateModal(false);
      return;
    }

    const created = {
      ...tripPayload,
      expenses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setTrips((prev) => [created, ...prev]);
    setActiveTripId(created.id);
    setEditingExpense(null);
    setShowCreateModal(false);
  };

  const handleDeleteTrip = (tripId) => {
    setTrips((prev) => {
      const remaining = prev.filter((t) => t.id !== tripId);
      if (activeTripId === tripId) {
        setActiveTripId(remaining[0]?.id || null);
      }
      return remaining;
    });
    setConfirmDeleteTripId(null);
    setEditingExpense(null);
  };

  const handleSaveExpense = (expensePayload) => {
    if (!activeTrip) return;

    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== activeTrip.id) return trip;
        const exists = trip.expenses.some((e) => e.id === expensePayload.id);
        const nextExpenses = exists
          ? trip.expenses.map((e) => (e.id === expensePayload.id ? expensePayload : e))
          : [expensePayload, ...trip.expenses];

        return {
          ...trip,
          expenses: nextExpenses,
          updatedAt: new Date().toISOString()
        };
      })
    );
    setEditingExpense(null);
  };

  const handleDeleteExpense = (expenseId) => {
    if (!activeTrip) return;
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== activeTrip.id) return trip;
        return {
          ...trip,
          expenses: trip.expenses.filter((e) => e.id !== expenseId),
          updatedAt: new Date().toISOString()
        };
      })
    );
    if (editingExpense?.id === expenseId) {
      setEditingExpense(null);
    }
  };

  const sortedExpenses = useMemo(() => {
    if (!activeTrip?.expenses) return [];
    return [...activeTrip.expenses].sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
  }, [activeTrip]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12">
      {/* Header matching Groups / Analytics Workspace */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
            Temporary Settlement
          </h1>
          <p className="text-sm md:text-base font-medium text-slate-500 dark:text-slate-400 max-w-2xl text-balance">
            Create an instant trip with manual member names, log who paid what & when, and download a settlement report for WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setEditingTrip(null);
              setShowCreateModal(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-lg shadow-primary-500/30 active:scale-95"
          >
            <Plus size={18} strokeWidth={3} /> New Temp Trip
          </button>
        </div>
      </div>

      {/* Saved Trips Selector Bar */}
      {trips.length > 0 && activeTrip && (
        <div className="bg-white dark:bg-[#16181d] rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1">
              Your Trips:
            </span>
            {trips.map((trip) => {
              const isActive = trip.id === activeTrip.id;
              return (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => {
                    setActiveTripId(trip.id);
                    setEditingExpense(null);
                    setConfirmDeleteTripId(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    isActive
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-primary-400'
                  }`}
                >
                  {trip.name} ({trip.members.length})
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingTrip(activeTrip);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Edit2 size={13} /> Edit Members
            </button>

            {confirmDeleteTripId === activeTrip.id ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleDeleteTrip(activeTrip.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-rose-600 text-white hover:bg-rose-700"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteTripId(null)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteTripId(activeTrip.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 transition-colors"
              >
                <Trash2 size={13} /> Delete Trip
              </button>
            )}
          </div>
        </div>
      )}

      {!activeTrip ? (
        <div className="text-center py-24 bg-white dark:bg-[#16181d] rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center px-6">
          <div className="p-5 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-full mb-5">
            <Compass size={42} />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">
            Start a Temporary Trip Settlement
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-7">
            Enter your trip name, add member names manually, track expenses on the go, and download a clean PDF report to share on WhatsApp.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingTrip(null);
              setShowCreateModal(true);
            }}
            className="bg-primary-600 hover:bg-primary-700 text-white px-7 py-3.5 rounded-xl text-sm font-black uppercase tracking-wider shadow-lg shadow-primary-500/30 flex items-center gap-2 transition-all"
          >
            <Plus size={18} strokeWidth={3} /> Create Temporary Trip
          </button>
        </div>
      ) : (
        <>
          {/* 4-Card KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#16181d] rounded-2xl p-5 border border-slate-200 dark:border-slate-800/60 shadow-sm">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 w-fit mb-3">
                <Wallet size={20} />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Trip Spend</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{formatInr(summary.totalSpent)}</p>
            </div>

            <div className="bg-white dark:bg-[#16181d] rounded-2xl p-5 border border-slate-200 dark:border-slate-800/60 shadow-sm">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 w-fit mb-3">
                <Users size={20} />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1">Trip Members</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{summary.memberCount}</p>
            </div>

            <div className="bg-white dark:bg-[#16181d] rounded-2xl p-5 border border-slate-200 dark:border-slate-800/60 shadow-sm">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 w-fit mb-3">
                <Receipt size={20} />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1">Expenses Logged</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{summary.expenseCount}</p>
            </div>

            <div className="bg-white dark:bg-[#16181d] rounded-2xl p-5 border border-slate-200 dark:border-slate-800/60 shadow-sm">
              <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 w-fit mb-3">
                <TrendingUp size={20} />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1">Avg. Per Member</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{formatInr(summary.perPersonAvg)}</p>
            </div>
          </div>

          {/* Main Workspace Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left Column: Add Expense + Expense Log */}
            <div className="xl:col-span-7 space-y-6">
              <TempExpenseForm
                key={`${activeTrip.id}_${activeTrip.members.map((m) => m.id).join(',')}_${editingExpense?.id || 'new'}`}
                members={activeTrip.members}
                editingExpense={editingExpense}
                onSaveExpense={handleSaveExpense}
                onCancelEdit={() => setEditingExpense(null)}
              />

              {/* Expense Log */}
              <div className="bg-white dark:bg-[#16181d] rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-white">
                      Trip Expense Timeline ({sortedExpenses.length})
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Complete log of every payment, time, place, and participants.
                    </p>
                  </div>
                </div>

                {sortedExpenses.length === 0 ? (
                  <div className="text-center py-12 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      No expenses added yet.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Use the form above to record your first trip expense.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedExpenses.map((expense) => {
                      const payerName = memberNameById[expense.paidBy] || 'Member';
                      const participantNames = (expense.participants || [])
                        .map((id) => memberNameById[id])
                        .filter(Boolean);

                      return (
                        <div
                          key={expense.id}
                          className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                                {expense.description}
                              </h3>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Tag size={10} /> {expense.category}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                              <span>
                                Paid by <strong className="text-slate-800 dark:text-slate-200">{payerName}</strong>
                              </span>
                              {expense.location && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin size={12} className="text-slate-400" /> {expense.location}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1">
                                <Clock size={12} className="text-slate-400" /> {formatExpenseDateTime(expense.dateTime)}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                                Included:
                              </span>
                              {participantNames.map((pName) => (
                                <span
                                  key={pName}
                                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white dark:bg-[#16181d] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                                >
                                  {pName}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                            <span className="text-base font-black text-slate-900 dark:text-white">
                              {formatInr(expense.amount)}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingExpense(expense)}
                                title="Edit expense"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(expense.id)}
                                title="Delete expense"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Live Settlement & Downloadable Report */}
            <div className="xl:col-span-5">
              <TempSettlementReport trip={activeTrip} summary={summary} />
            </div>
          </div>
        </>
      )}

      {showCreateModal && (
        <CreateTempTripModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTrip(null);
          }}
          onSave={handleSaveTrip}
          initialTrip={editingTrip}
          defaultUserName={user?.name || ''}
        />
      )}
    </div>
  );
};

export default TempSettlement;
