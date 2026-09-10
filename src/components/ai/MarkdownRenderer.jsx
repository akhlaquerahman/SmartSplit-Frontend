import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Check, Copy } from 'lucide-react';

const CodeBlock = ({ language, codeString }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-gray-800 bg-gray-900 shadow-md text-left">
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800 text-gray-300 text-xs font-mono border-b border-gray-700">
        <span className="font-semibold uppercase tracking-wider text-gray-400">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors py-1 px-2 rounded hover:bg-gray-700/50 cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto font-mono text-sm leading-relaxed text-gray-100">
        <pre className="m-0 bg-transparent font-mono text-sm whitespace-pre">
          <code>{codeString}</code>
        </pre>
      </div>
    </div>
  );
};

const MarkdownRenderer = ({ content }) => {
  if (!content) return <span className="animate-pulse">...</span>;

  return (
    <div className="markdown-body text-gray-800 text-[15px] leading-relaxed select-text space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Code Block & Inline Code
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeStr = String(children).replace(/\n$/, '');

            // Check if block or inline
            const isBlock = !inline && (match || codeStr.includes('\n') || className);

            if (isBlock) {
              return (
                <CodeBlock
                  language={match ? match[1] : ''}
                  codeString={codeStr}
                />
              );
            }

            return (
              <code
                className="bg-gray-100 text-pink-600 font-mono text-[13px] px-1.5 py-0.5 rounded border border-gray-200 font-medium"
                {...props}
              >
                {children}
              </code>
            );
          },

          // GFM Table
          table({ children }) {
            return (
              <div className="my-3 overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
                <table className="w-full text-left border-collapse text-sm">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-gray-100/80 border-b border-gray-200 text-gray-800 font-semibold">{children}</thead>;
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-gray-100 bg-white">{children}</tbody>;
          },
          tr({ children }) {
            return <tr className="hover:bg-gray-50/70 transition-colors">{children}</tr>;
          },
          th({ children }) {
            return <th className="px-4 py-3 font-semibold text-gray-900 border-r border-gray-200 last:border-r-0 text-left text-xs uppercase tracking-wider bg-gray-100/60">{children}</th>;
          },
          td({ children }) {
            return <td className="px-4 py-2.5 text-gray-700 border-r border-gray-100 last:border-r-0">{children}</td>;
          },

          // Typography & Headings
          h1({ children }) {
            return <h1 className="text-xl font-bold text-gray-900 mt-4 mb-2 pb-1 border-b border-gray-200">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-bold text-gray-900 mt-3 mb-2">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold text-gray-900 mt-3 mb-1.5">{children}</h3>;
          },
          h4({ children }) {
            return <h4 className="text-sm font-semibold text-gray-900 mt-2 mb-1">{children}</h4>;
          },

          // Paragraphs & Lists
          p({ children }) {
            return <p className="mb-2.5 last:mb-0 leading-relaxed text-gray-800">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc list-outside ml-6 space-y-1 my-2 text-gray-800">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-outside ml-6 space-y-1 my-2 text-gray-800">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed pl-1">{children}</li>;
          },

          // Text Styles
          strong({ children }) {
            return <strong className="font-semibold text-gray-900">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-gray-800">{children}</em>;
          },
          u({ children }) {
            return <u className="underline underline-offset-4 decoration-gray-400">{children}</u>;
          },
          del({ children }) {
            return <del className="line-through text-gray-500">{children}</del>;
          },

          // Blockquote & Links
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-blue-500 pl-4 py-1.5 my-3 bg-blue-50/50 rounded-r-lg text-gray-700 italic border-y-0">
                {children}
              </blockquote>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline underline-offset-2 font-medium transition-colors"
              >
                {children}
              </a>
            );
          },
          hr() {
            return <hr className="my-4 border-t border-gray-200" />;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
