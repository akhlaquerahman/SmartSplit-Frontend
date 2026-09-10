import React from 'react';
import { useFallbacks, useDeleteFallback } from '../../../hooks/rulesApi';
import { useRulesStore } from '../../../store/useRulesStore';
import { Edit, Trash2, Power, PowerOff, ShieldAlert } from 'lucide-react';

const FallbackTable = () => {
  const { data, isLoading } = useFallbacks({ page: 1, limit: 20 });
  const deleteFallbackMutation = useDeleteFallback();
  const openDrawer = useRulesStore((state) => state.openDrawer);

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete fallback rule "${name}"?`)) {
      deleteFallbackMutation.mutate(id);
    }
  };

  const fallbacks = data?.data || [];


  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Fallback Rules</h2>

        <button 
          onClick={() => openDrawer('fallback')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded font-medium transition-colors"
        >
          + New Fallback
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Min Confidence</th>
              <th className="p-4 font-medium">Retries</th>
              <th className="p-4 font-medium">Escalation</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Usage</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">

            {isLoading ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-500 animate-pulse">Loading Fallbacks...</td>
              </tr>
            ) : fallbacks.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-500">No fallback rules found.</td>
              </tr>
            ) : (

              fallbacks.map((f) => (
                <tr key={f._id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{f.name}</td>
                  <td className="p-4">{f.minConfidence}%</td>
                  <td className="p-4">{f.retryCount}</td>
                  <td className="p-4">
                    {f.escalationSettings?.enabled ? (
                      <span className="flex items-center gap-1 text-amber-600 text-xs">
                        <ShieldAlert size={14} /> Enabled
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Disabled</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded flex w-max items-center gap-1 border ${f.status === 'enabled' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {f.status === 'enabled' ? <Power size={12}/> : <PowerOff size={12}/>}
                      {f.status}
                    </span>
                  </td>
                  <td className="p-4">{f.usageCount}</td>
                  <td className="p-4 text-right flex justify-end gap-3">
                    <button onClick={() => openDrawer('fallback', f)} className="text-gray-400 hover:text-indigo-600" title="Edit"><Edit size={16} /></button>
                    <button 
                      onClick={() => handleDelete(f._id, f.name)} 
                      disabled={deleteFallbackMutation.isPending}
                      className="text-gray-400 hover:text-red-600 disabled:opacity-50" 
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
    </div>
  );
};

export default FallbackTable;
