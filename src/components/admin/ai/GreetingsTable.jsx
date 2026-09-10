import React, { useState } from 'react';
import { useGreetings, useDeleteGreeting, useCloneGreeting } from '../../../hooks/rulesApi';
import { useRulesStore } from '../../../store/useRulesStore';
import { Edit, Play, Copy, Trash2, Power, PowerOff, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const GreetingsTable = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  // Debounce search state for API could be added here, but direct bind for now
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      setSearch(searchInput);
      setPage(1);
    }
  };

  const { data, isLoading } = useGreetings({ page, limit, search, status });
  const deleteGreetingMutation = useDeleteGreeting();
  const cloneGreetingMutation = useCloneGreeting();
  const openDrawer = useRulesStore((state) => state.openDrawer);

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteGreetingMutation.mutate(id);
    }
  };

  const handleClone = (id) => {
    cloneGreetingMutation.mutate(id);
  };

  const greetings = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-gray-900">Fastpath & FAQ Rules</h2>
        <button 
          onClick={() => openDrawer('greeting')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap"
        >
          + New Rule
        </button>
      </div>

      {/* Filters & Search */}
      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search rules (Press Enter)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearch}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="text-gray-400" size={18} />
          <select 
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200 uppercase tracking-wider">
              <th className="p-4 font-semibold">Rule Name</th>
              <th className="p-4 font-semibold">Intent</th>
              <th className="p-4 font-semibold">Priority</th>
              <th className="p-4 font-semibold">Languages</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Triggers</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-500 animate-pulse">Loading Rules...</td>
              </tr>
            ) : greetings.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-12 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <Search className="text-gray-300 mb-3" size={32} />
                    <p className="text-base font-medium text-gray-900">No rules found</p>
                    <p className="text-sm">Try adjusting your search or filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              greetings.map((g) => (
                <tr key={g._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{g.name}</td>
                  <td className="p-4">
                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2.5 py-1 rounded-full font-medium capitalize shadow-sm">{g.intent || 'Greeting'}</span>
                  </td>
                  <td className="p-4 font-mono text-sm">{g.priority}</td>
                  <td className="p-4">
                    <span className="bg-gray-100 text-gray-600 border border-gray-200 text-xs px-2.5 py-1 rounded-full uppercase tracking-wider font-medium">{g.languages?.join(', ')}</span>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full flex w-max items-center gap-1.5 border font-medium shadow-sm ${g.status === 'enabled' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {g.status === 'enabled' ? <Power size={10}/> : <PowerOff size={10}/>}
                      {g.status}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-sm text-gray-600">{g.triggerCount}</td>
                  <td className="p-4 text-right flex justify-end gap-3">
                    <button 
                      onClick={() => openDrawer('greeting', g)} 
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" 
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleClone(g._id)} 
                      disabled={cloneGreetingMutation.isPending}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50" 
                      title="Clone"
                    >
                      <Copy size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(g._id, g.name)} 
                      disabled={deleteGreetingMutation.isPending}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50" 
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select 
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
        
        <div className="flex items-center gap-4">
          <span>
            Showing <span className="font-medium text-gray-900">{total === 0 ? 0 : (page - 1) * limit + 1}</span> to <span className="font-medium text-gray-900">{Math.min(page * limit, total)}</span> of <span className="font-medium text-gray-900">{total}</span> results
          </span>
          <div className="flex items-center gap-1">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GreetingsTable;
