import React, { useState, useEffect } from 'react';
import { useRulesStore } from '../../../store/useRulesStore';
import { useCreateGreeting, useUpdateGreeting, useCreateFallback, useUpdateFallback } from '../../../hooks/rulesApi';
import { X, Save, AlertCircle } from 'lucide-react';

const RuleDrawer = () => {
  const { isDrawerOpen, closeDrawer, drawerRuleType, selectedRule } = useRulesStore();
  const [formData, setFormData] = useState({});
  const [aliasesText, setAliasesText] = useState('');

  const createGreeting = useCreateGreeting();
  const updateGreeting = useUpdateGreeting();
  const createFallback = useCreateFallback();
  const updateFallback = useUpdateFallback();

  useEffect(() => {
    if (selectedRule) {
      setFormData({
        ...selectedRule,
        intent: selectedRule.intent || 'greeting'
      });
      if (selectedRule.aliases) {
        setAliasesText(selectedRule.aliases.join('\n'));
      }
    } else {
      setFormData({ status: 'enabled', priority: 0, languages: ['en'], channel: 'all', intent: 'greeting' });
      setAliasesText('');
    }
  }, [selectedRule, isDrawerOpen]);

  if (!isDrawerOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent] || {}),
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleSave = () => {
    const payload = { ...formData };
    
    if (drawerRuleType === 'greeting') {
      payload.aliases = aliasesText.split('\n').map(a => a.trim()).filter(a => a);
      if (selectedRule) {
        updateGreeting.mutate({ id: selectedRule._id, ...payload }, { onSuccess: closeDrawer });
      } else {
        createGreeting.mutate(payload, { onSuccess: closeDrawer });
      }
    } else {
      if (selectedRule) {
        updateFallback.mutate({ id: selectedRule._id, ...payload }, { onSuccess: closeDrawer });
      } else {
        createFallback.mutate(payload, { onSuccess: closeDrawer });
      }
    }
  };

  const isSaving = createGreeting.isPending || updateGreeting.isPending || createFallback.isPending || updateFallback.isPending;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={closeDrawer}></div>
      <div className="fixed top-0 right-0 h-full w-full sm:w-[600px] max-w-full bg-white border-l border-gray-200 z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 capitalize">
            {selectedRule ? 'Edit' : 'New'} Rule
          </h2>
          <button onClick={closeDrawer} className="text-gray-500 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Common Fields */}
          <div>
            <label className="block text-gray-700 font-medium text-sm mb-2">Rule Name <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              name="name"
              value={formData.name || ''}
              onChange={handleChange}
              className="w-full bg-white border border-gray-300 rounded p-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              placeholder="e.g. Welcome Message"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium text-sm mb-2">Priority</label>
              <input 
                type="number" 
                name="priority"
                value={formData.priority || 0}
                onChange={handleChange}
                className="w-full bg-white border border-gray-300 rounded p-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium text-sm mb-2">Status</label>
              <select 
                name="status"
                value={formData.status || 'enabled'}
                onChange={handleChange}
                className="w-full bg-white border border-gray-300 rounded p-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-medium text-sm mb-2">Intent <span className="text-red-500">*</span></label>
            <select 
              name="intent"
              value={formData.intent || 'greeting'}
              onChange={handleChange}
              className="w-full bg-white border border-gray-300 rounded p-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="greeting">Greeting</option>
              <option value="farewell">Farewell</option>
              <option value="fastpath">Fastpath</option>
              <option value="faq">FAQ</option>
            </select>
          </div>


          {/* Greeting Fields */}
          {drawerRuleType === 'greeting' && (
            <>
              <div>
                <label className="block text-gray-700 font-medium text-sm mb-2">
                  Aliases (One per line)
                  <span className="block text-xs text-gray-500 mt-1 font-normal">These will auto-generate regex patterns.</span>
                </label>
                <textarea 
                  rows="5"
                  value={aliasesText}
                  onChange={(e) => {
                    setAliasesText(e.target.value);
                    setFormData(prev => ({ ...prev, regexGenerated: '' }));
                  }}
                  className="w-full bg-white border border-gray-300 rounded p-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  placeholder="hello&#10;hi&#10;hey"
                ></textarea>
              </div>


              <div>
                <label className="block text-gray-700 font-medium text-sm mb-2">
                  Custom Regex (Optional)
                  <span className="block text-xs text-gray-500 mt-1 font-normal">Leave blank to auto-generate from aliases.</span>
                </label>
                <input 
                  type="text" 
                  name="regexGenerated"
                  value={formData.regexGenerated || ''}
                  onChange={handleChange}
                  className="w-full bg-white border border-gray-300 rounded p-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm" 
                  placeholder="^.*(hello|hi).*$"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium text-sm mb-2">Response Template <span className="text-red-500">*</span></label>

                <textarea 
                  name="responseTemplate"
                  rows="4"
                  value={formData.responseTemplate || ''}
                  onChange={handleChange}
                  className="w-full bg-white border border-gray-300 rounded p-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Hello {{user.name}}! How can I help you today?"
                ></textarea>
              </div>
            </>
          )}

          {/* Fallback Fields */}
          {drawerRuleType === 'fallback' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium text-sm mb-2">Min Confidence (%)</label>
                  <input 
                    type="number" 
                    name="minConfidence"
                    value={formData.minConfidence || 0}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-300 rounded p-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium text-sm mb-2">Retry Count</label>
                  <input 
                    type="number" 
                    name="retryCount"
                    value={formData.retryCount || 0}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-300 rounded p-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium text-sm mb-2">Fallback Message <span className="text-red-500">*</span></label>
                <textarea 
                  name="fallbackMessage"
                  rows="3"
                  value={formData.fallbackMessage || ''}
                  onChange={handleChange}
                  className="w-full bg-white border border-gray-300 rounded p-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="I'm sorry, I didn't quite catch that."
                ></textarea>
              </div>

              <div className="border-t border-gray-200 pt-6 mt-6">
                <h3 className="text-gray-900 font-medium mb-4 flex items-center justify-between">
                  Escalation Settings
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="escalationSettings.enabled" checked={formData.escalationSettings?.enabled || false} onChange={handleChange} className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </h3>
                
                {formData.escalationSettings?.enabled && (
                  <div className="space-y-4 bg-gray-50 p-4 rounded border border-gray-200">
                    <div>
                      <label className="block text-gray-700 font-medium text-sm mb-2">Department Route</label>
                      <input type="text" name="escalationSettings.department" value={formData.escalationSettings?.department || ''} onChange={handleChange} className="w-full bg-white border border-gray-300 rounded p-2 text-gray-900" />
                    </div>
                    <label className="flex items-center text-gray-700 text-sm">
                      <input type="checkbox" name="escalationSettings.humanQueue" checked={formData.escalationSettings?.humanQueue || false} onChange={handleChange} className="mr-2 rounded border-gray-300 bg-white text-indigo-600" />
                      Transfer to Human Queue
                    </label>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
        
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
          <button onClick={closeDrawer} className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >

            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Rule'}
          </button>
        </div>
      </div>
    </>
  );
};

export default RuleDrawer;
