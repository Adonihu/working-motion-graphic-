import React, { useState } from 'react';
import { Copy, Check, RefreshCw, Download, FileCode, CheckCircle2 } from 'lucide-react';

interface CodeInspectorProps {
  initialCode: string;
  onApplyCode: (newCode: string) => void;
  onResetCode: () => void;
}

export const CodeInspector: React.FC<CodeInspectorProps> = ({
  initialCode,
  onApplyCode,
  onResetCode,
}) => {
  const [code, setCode] = useState(initialCode);
  const [isCopied, setIsCopied] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [appliedMessage, setAppliedMessage] = useState(false);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
    setHasUnsavedChanges(e.target.value !== initialCode);
  };

  const handleApply = () => {
    onApplyCode(code);
    setHasUnsavedChanges(false);
    setAppliedMessage(true);
    setTimeout(() => setAppliedMessage(false), 2500);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canvas.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    onResetCode();
    setCode(initialCode);
    setHasUnsavedChanges(false);
  };

  return (
    <div
      id="apple-code-inspector-card"
      className="bg-[#121216]/80 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.5)] space-y-4"
    >
      <div id="code-inspector-header" className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#1A73E8]/20 border border-[#1A73E8]/40 flex items-center justify-center text-[#8AB4F8]">
            <FileCode className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Source Code (canvas.html)
            </h2>
            <p className="text-xs text-white/50">
              HTML5 • CSS 3D Transforms • GSAP Timeline (v3.12)
            </p>
          </div>
        </div>

        <div id="code-action-buttons-group" className="flex flex-wrap items-center gap-2">
          {hasUnsavedChanges && (
            <span id="unsaved-changes-badge" className="text-xs text-amber-400 font-medium px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              Unapplied Edits
            </span>
          )}

          {appliedMessage && (
            <span id="harness-updated-badge" className="text-xs text-emerald-400 font-medium px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Canvas Updated
            </span>
          )}

          <button
            id="btn-apply-code"
            onClick={handleApply}
            disabled={!hasUnsavedChanges}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              hasUnsavedChanges
                ? 'bg-[#1A73E8] hover:bg-[#1A73E8]/90 text-white shadow-md'
                : 'bg-white/[0.04] text-white/30 cursor-not-allowed border border-white/[0.06]'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Apply to Canvas
          </button>

          <button
            id="btn-copy-code"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.06] text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            id="btn-download-code"
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.06] text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          {hasUnsavedChanges && (
            <button
              id="btn-reset-code"
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-red-500/20 text-white/70 hover:text-red-300 border border-white/[0.06] text-xs transition-all cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-white/[0.08] bg-[#0A0A0C]">
        <textarea
          id="textarea-code-editor"
          value={code}
          onChange={handleCodeChange}
          spellCheck={false}
          className="w-full h-[520px] p-4 bg-transparent text-white/90 font-mono text-xs leading-relaxed focus:outline-none resize-none selection:bg-[#1A73E8]/40 scrollbar-thin scrollbar-thumb-white/10"
        />
      </div>
    </div>
  );
};
