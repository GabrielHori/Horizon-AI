import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Copy, Check, Loader2 } from 'lucide-react';
import { requestWorker } from '../services/bridge';

const Console = ({ isDarkMode }) => {
  const [logs, setLogs] = useState([]);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);

  const fetchLogs = async () => {
    try {
      const response = await requestWorker("get_monitoring");
      setLogs(response?.logs || []);
      setIsLoading(false);
    } catch (error) { 
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [logs]);

  const copyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full w-full flex flex-col bg-transparent border-none overflow-hidden">
      {/* Header */}
      <div className={`h-14 flex items-center justify-between px-6 border-b transition-colors duration-500
        ${isDarkMode ? 'border-white/5 bg-white/5 text-white' : 'border-black/5 bg-black/5 text-slate-900'}`}>
        <div className="flex items-center gap-3">
          <Terminal size={18} className="text-indigo-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">System Runtime Logs</span>
        </div>
        <button onClick={copyLogs} disabled={logs.length === 0} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all active:scale-95 ${isDarkMode ? 'border-white/10 hover:bg-white/10' : 'border-black/10 hover:bg-black/10'}`}>
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-indigo-500" />}
          <span>{copied ? 'Copied' : 'Export Logs'}</span>
        </button>
      </div>

      {/* Logs Area */}
      <div ref={containerRef} className={`flex-1 overflow-y-auto p-6 font-mono text-[11px] leading-6 scroll-smooth bg-transparent ${isDarkMode ? 'text-white/60' : 'text-slate-600'}`}>
        {isLoading && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-20">
            <Loader2 size={24} className="animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Connecting to core...</span>
          </div>
        ) : (
          <div className="space-y-1">
            {logs.length === 0 && <div className="opacity-30 text-center py-10 uppercase font-black">No activity detected</div>}
            {logs.map((line, index) => {
              let color = "";
              if (line.includes('ERROR')) color = "text-rose-500 font-bold";
              else if (line.includes('WARNING')) color = "text-amber-500";
              else if (line.includes('SUCCESS') || line.includes('success')) color = "text-emerald-500";
              else if (line.includes('INFO')) color = "text-indigo-400";
              return (
                <div key={index} className={`whitespace-pre-wrap break-all py-0.5 border-l-2 border-transparent hover:border-indigo-500 hover:bg-indigo-500/10 px-2 transition-colors ${color}`}>
                  <span className="opacity-30 mr-3 select-none">{(index + 1).toString().padStart(3, '0')}</span>
                  {line}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Console;