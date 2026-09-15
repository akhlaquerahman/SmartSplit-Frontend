import React, { useState } from 'react';
import { Bot, Copy, Check, ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react';
import ActionCard from './widgets/ActionCard';
import ChartWidget from './widgets/ChartWidget';
import ActionWizards from './widgets/ActionWizards';
import MarkdownRenderer from './MarkdownRenderer';

const AIMessage = ({ content, metadata }) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleCopyMessage = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const renderContent = () => {
    // Render rich Action Widgets natively inside the chat feed
    if (metadata && metadata.isWidget && metadata.actionTrigger) {
      return (
        <div className="mt-2 w-full max-w-sm">
          <ActionWizards actionTrigger={metadata.actionTrigger} />
        </div>
      );
    }

    // Legacy fallback parsing
    if (content?.includes('{"type": "ActionCard"')) {
      return (
        <>
          <p>Here is your requested action:</p>
          <ActionCard title="Pending Settlement" description="You owe Alice ₹450" actionText="Pay Now" actionType="pay" />
        </>
      );
    }
    
    if (content?.includes('{"type": "ChartWidget"')) {
      return (
        <>
          <p>Here is the analysis of your monthly spending:</p>
          <ChartWidget type="bar" title="Monthly Expenses (June)" data={[1,2,3]} />
        </>
      );
    }

    // If content is empty/loading, render ChatGPT-style thinking animation
    if (!content || content.trim() === '') {
      return (
        <div className="flex items-center gap-2 py-1.5 text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-bounce"></span>
          </div>
        </div>
      );
    }

    return <MarkdownRenderer content={content} />;
  };

  return (
    <div className="flex gap-4">
      <div className="relative flex-shrink-0 mt-1">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30 border border-white/20 select-none">
          <span className="font-black text-xs tracking-tight" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>AI</span>
        </div>
        <Sparkles className="w-3 h-3 text-amber-300 absolute -top-1 -right-1 drop-shadow-sm" />
      </div>
      <div className="flex-1 space-y-2 min-w-0 overflow-hidden">
        <div className="w-full text-gray-800 leading-relaxed">
          {renderContent()}
        </div>
        
        {content && content.trim() !== '' && (
          <div className="flex items-center gap-1 pt-1.5 border-t border-gray-100 mt-2">
            <button 
              onClick={handleCopyMessage}
              className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded text-xs transition-colors flex items-center gap-1 cursor-pointer"
              title="Copy message"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-[11px] text-green-600 font-medium">Copied!</span>
                </>
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <button 
              onClick={() => setFeedback(feedback === 'like' ? null : 'like')}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${feedback === 'like' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`}
              title="Helpful"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setFeedback(feedback === 'dislike' ? null : 'dislike')}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${feedback === 'dislike' ? 'bg-red-50 text-red-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`}
              title="Not helpful"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default AIMessage;