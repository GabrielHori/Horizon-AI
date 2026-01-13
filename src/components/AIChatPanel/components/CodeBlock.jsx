/**
 * CodeBlock - Composant pour afficher du code avec bouton copier
 * Style: Dark, Premium, Glass (Horizon AI)
 */
import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export const CodeBlock = ({ language, children, lang = 'fr' }) => {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 rounded-t-xl border-b border-zinc-700">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-[10px] font-bold uppercase tracking-wider transition-all"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400" />
              <span className="text-emerald-400">{lang === 'fr' ? 'Copié!' : 'Copied!'}</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>{lang === 'fr' ? 'Copier' : 'Copy'}</span>
            </>
          )}
        </button>
      </div>

      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '0 0 12px 12px',
          padding: '16px',
          fontSize: '13px',
        }}
        showLineNumbers={code.split('\n').length > 3}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};
