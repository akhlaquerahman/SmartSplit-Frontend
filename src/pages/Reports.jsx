import React, { useEffect, useState, useMemo, useRef } from 'react';
import useGroupStore from '../store/useGroupStore';
import { useReactToPrint } from 'react-to-print';
import {
  ArrowLeft,
  Printer,
  Download,
  Clock,
  FolderOpen,
  Plus
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';
import GroupsToolbar from '../components/groups/GroupsToolbar';
import ReportsKPIs from '../components/reports/ReportsKPIs';
import ReportGroupCard from '../components/reports/ReportGroupCard';
import ReportPreview from '../components/reports/ReportPreview';
import PrintableReport from '../components/reports/PrintableReport';

const escapeCsvCell = (value) => {
  const str = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
};

const Reports = () => {
  const { groups, fetchGroups, activeGroup, fetchGroupDetails, loading } = useGroupStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlGroupId = searchParams.get('groupId');
  const shouldPrint = searchParams.get('print') === 'true';

  const [selectedGroupId, setSelectedGroupId] = useState(urlGroupId || null);
  const [reportDate, setReportDate] = useState(new Date());
  const reportRef = useRef(null);

  // Workspace UI State (aligned with Groups page)
  const [viewMode, setViewMode] = useState('grid');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    content: () => reportRef.current, // Fallback for some versions
    documentTitle: `SmartSplit_Report_${activeGroup?.name || 'Document'}`,
  });

  const handlePrintRef = useRef(handlePrint);
  useEffect(() => {
    handlePrintRef.current = handlePrint;
  }, [handlePrint]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleGroupClick = async (groupId) => {
    setSelectedGroupId(groupId);
    setReportDate(new Date());
    await fetchGroupDetails(groupId);
  };

  useEffect(() => {
    if (!urlGroupId) return undefined;
    let active = true;
    let printTimer;

    fetchGroupDetails(urlGroupId).then(() => {
      if (!active) return;
      setSelectedGroupId(urlGroupId);
      setReportDate(new Date());
      if (shouldPrint) {
        printTimer = setTimeout(() => {
          if (reportRef.current) handlePrintRef.current();
        }, 1000);
      }
    });

    return () => {
      active = false;
      if (printTimer) clearTimeout(printTimer);
    };
  }, [urlGroupId, shouldPrint, fetchGroupDetails]);

  const categories = useMemo(() => {
    const cats = new Set(groups.map((g) => g.category).filter(Boolean));
    return Array.from(cats);
  }, [groups]);

  const processedGroups = useMemo(() => {
    return groups
      .filter((g) => {
        if (
          search &&
          !g.name.toLowerCase().includes(search.toLowerCase()) &&
          !g.description?.toLowerCase().includes(search.toLowerCase())
        ) {
          return false;
        }
        if (categoryFilter !== 'all' && g.category !== categoryFilter) return false;
        if (statusFilter !== 'all') {
          const spent = g.summary?.totalExpense || 0;
          const totalOwed = g.summary?.totalOwed || 0;
          const pending = g.summary?.pendingSettlements || 0;
          const isSettled = spent > 0 && totalOwed === 0 && pending === 0;
          if (statusFilter === 'active' && isSettled) return false;
          if (statusFilter === 'settled' && !isSettled) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortOrder === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortOrder === 'highest_budget') return (b.budget || 0) - (a.budget || 0);
        if (sortOrder === 'highest_spent') return (b.summary?.totalExpense || 0) - (a.summary?.totalExpense || 0);
        if (sortOrder === 'alphabetical') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [groups, search, categoryFilter, statusFilter, sortOrder]);

  const handleExportSummary = () => {
    if (processedGroups.length === 0) return;

    const headers = [
      'Group Name',
      'Category',
      'Country',
      'Members',
      'Total Spend (INR)',
      'Unsettled Amount (INR)',
      'Completed Settlements',
      'Pending Settlements',
      'Created Date'
    ];

    const rows = processedGroups.map((g) => [
      g.name,
      g.category || '',
      g.country || 'Global',
      g.members?.length || 0,
      (g.summary?.totalExpense || 0).toFixed(2),
      (g.summary?.totalOwed || 0).toFixed(2),
      g.summary?.totalSettlements || 0,
      g.summary?.pendingSettlements || 0,
      new Date(g.createdAt).toISOString().slice(0, 10)
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SmartSplit_Analytics_Summary_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (selectedGroupId) {
    if (!activeGroup || activeGroup._id !== selectedGroupId) {
      return (
        <div className="max-w-[1600px] mx-auto pb-10 space-y-6">
          <button
            onClick={() => setSelectedGroupId(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-primary-600 font-bold transition-colors"
          >
            <ArrowLeft size={20} /> Back to Reports
          </button>
          <div className="h-[520px] bg-slate-100 dark:bg-slate-800/50 rounded-3xl animate-pulse" />
        </div>
      );
    }

    return (
      <div className="max-w-[1600px] mx-auto pb-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setSelectedGroupId(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-primary-600 font-bold transition-colors"
          >
            <ArrowLeft size={20} /> Back to Reports
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-3 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm transition-all bg-white dark:bg-[#16181d] text-slate-600 dark:text-slate-300 hover:text-primary-600"
              title="Print Report"
            >
              <Printer size={20} />
            </button>
            <div className="px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-xl text-xs font-bold border border-primary-100 dark:border-primary-900/30 flex items-center gap-2">
              <Clock size={14} />
              Last Updated: {reportDate.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Responsive UI Preview */}
        <div className="w-full">
          <ReportPreview group={activeGroup} />
        </div>

        {/* Hidden Printable Report strictly for PDF generation */}
        <div style={{ display: 'none' }}>
          <PrintableReport ref={reportRef} group={activeGroup} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-2 pb-10">
      {/* Header matching Groups WorkspaceHeader */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
            Financial Reports
          </h1>
          <p className="text-sm md:text-base font-medium text-slate-500 dark:text-slate-400 max-w-2xl text-balance">
            In-depth expense analysis, settlement progress, and printable statements across all your workspace groups.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportSummary}
            disabled={processedGroups.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-lg shadow-primary-500/30 active:scale-95"
          >
            <Download size={16} strokeWidth={2.75} /> Export Summary
          </button>
        </div>
      </div>

      {groups.length > 0 && (
        <>
          <ReportsKPIs groups={groups} />
          <GroupsToolbar
            search={search}
            setSearch={setSearch}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            viewMode={viewMode}
            setViewMode={setViewMode}
            categories={categories}
          />
        </>
      )}

      {loading && groups.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-32 bg-white dark:bg-[#16181d] rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center">
          <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-full mb-6">
            <FolderOpen size={48} className="text-slate-300 dark:text-slate-700" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">No Reports Available</h2>
          <p className="text-slate-500 font-medium mb-8 max-w-sm text-balance">
            Create a group and add expenses to generate detailed analytics and downloadable financial reports.
          </p>
          <button
            type="button"
            onClick={() => navigate('/groups')}
            className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-primary-500/30 flex items-center gap-2"
          >
            <Plus size={20} /> Go to Groups
          </button>
        </div>
      ) : processedGroups.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#16181d] rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
          <p className="text-slate-500 font-medium mb-4">No group reports match your current filters.</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setCategoryFilter('all');
              setStatusFilter('all');
            }}
            className="text-primary-600 font-bold hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div
          className={cn(
            'grid gap-4',
            viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 2xl:grid-cols-3' : 'grid-cols-1'
          )}
        >
          {processedGroups.map((group) => (
            <ReportGroupCard
              key={group._id}
              group={group}
              viewMode={viewMode}
              onSelect={handleGroupClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Reports;
