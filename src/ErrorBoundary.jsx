import React, { useState } from "react";
import { useRouteError, useNavigate } from "react-router-dom";
import {
  FiAlertTriangle,
  FiRefreshCw,
  FiHome,
  FiChevronDown,
  FiChevronUp,
  FiCopy,
  FiCheck,
  FiLifeBuoy,
} from "react-icons/fi";
import Logo from "./components/shared/Logo";

const ErrorBoundary = () => {
  const error = useRouteError();
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const errorMessage =
    error?.statusText ||
    error?.message ||
    (typeof error === "string" ? error : "An unexpected application error occurred.");

  const errorStack = error?.stack || JSON.stringify(error, null, 2);

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(`Error: ${errorMessage}\n\nStack:\n${errorStack}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const status = error?.status || 500;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center font-poppins p-4 sm:p-6 bg-slate-50 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-10 card-shadow relative z-10 space-y-6 text-center">
        {/* Header Logo */}
        <div className="flex justify-center mb-2">
          <Logo />
        </div>

        {/* Error Badge Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-inner">
          <FiAlertTriangle size={32} />
        </div>

        {/* Title & Status */}
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold uppercase tracking-wider mb-2">
            Error {status}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            Something Went Wrong
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            We encountered an unexpected error while rendering this page. Don't worry, your data remains completely safe.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FiRefreshCw size={15} />
            Reload Page
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl button-color text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FiHome size={15} />
            Back to Dashboard
          </button>
        </div>

        {/* Collapsible Technical Error Log */}
        <div className="pt-4 border-t border-slate-100 text-left">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-500 hover:text-slate-700 py-1 transition-colors cursor-pointer"
          >
            <span>Technical Details</span>
            {showDetails ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </button>

          {showDetails && (
            <div className="mt-3 bg-slate-900 text-slate-200 rounded-2xl p-4 font-mono text-xs overflow-x-auto relative space-y-2 border border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-[11px] text-rose-400 font-semibold truncate max-w-[80%]">
                  {errorMessage}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLogs}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copied ? <FiCheck className="text-emerald-400" /> : <FiCopy />}
                  {copied ? "Copied!" : "Copy Log"}
                </button>
              </div>
              <pre className="text-[11px] text-slate-400 leading-normal max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                {errorStack}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Footer Support Link */}
      <div className="mt-6 text-center z-10">
        <p className="text-xs text-slate-400 flex items-center gap-1 justify-center">
          Need assistance?
          <a
            href="mailto:support@quovo.io"
            className="text-brand font-semibold hover:underline flex items-center gap-1"
          >
            <FiLifeBuoy size={12} /> Contact Support
          </a>
        </p>
      </div>
    </div>
  );
};

export default ErrorBoundary;
