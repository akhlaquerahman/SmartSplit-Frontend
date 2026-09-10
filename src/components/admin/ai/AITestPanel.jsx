import React, { useState } from 'react';
import { useTestGreeting } from '../../../hooks/rulesApi';
import { useRulesStore } from '../../../store/useRulesStore';
import { CheckCircle2, X, AlertCircle } from 'lucide-react';

const AITestPanel = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const testMutation = useTestGreeting();
  const { isTestPanelOpen, closeTestPanel } = useRulesStore();

  const handleTest = () => {
    if (!input.trim()) return;
    testMutation.mutate(input, {
      onSuccess: (data) => setResult(data)
    });
  };

  if (!isTestPanelOpen) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={closeTestPanel}></div>
      <div className="fixed top-0 right-0 h-full w-full sm:w-[400px] max-w-full bg-white border-l border-gray-200 z-50 shadow-2xl transform transition-transform duration-300 flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">AI Test Panel</h3>
          <button onClick={closeTestPanel} className="text-gray-500 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm mb-2 font-medium">Test User Input</label>
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows="3"
              placeholder="e.g. hello, helo, hii..."
            ></textarea>
          </div>

          <button 
            onClick={handleTest}
            disabled={testMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded w-full transition-colors flex items-center justify-center gap-2"
          >
            {testMutation.isPending ? 'Testing...' : 'Test Rule'}
          </button>

          <div className="mt-8 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <span className="text-gray-500">Matched Rule</span>
              {result?.matchedRule ? (
                <span className="text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle2 size={14}/> {result.matchedRule}
                </span>
              ) : (
                <span className="text-gray-400 font-mono">None</span>
              )}
            </div>
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <span className="text-gray-500">Confidence</span>
              <span className="text-gray-900 font-medium">{result ? `${result.confidence}%` : '0%'}</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <span className="text-gray-500">Execution Time</span>
              <span className="text-gray-700">{result?.executionTime || '0ms'}</span>
            </div>
            <div className="pt-2">
              <span className="text-gray-500 block mb-2 font-medium">Response</span>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-gray-800 min-h-[80px]">
                {result?.response || 'Waiting for input...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AITestPanel;
