import React from "react";
import { FiWifiOff, FiRefreshCw, FiAlertTriangle } from "react-icons/fi";

const ApiErrorState = ({
  title = "Failed to load data",
  message = "Could not fetch information from the server. Please check your connection or try again.",
  onRetry,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between gap-3 text-xs font-poppins">
        <div className="flex items-center gap-2 text-rose-700 min-w-0">
          <FiAlertTriangle size={16} className="flex-shrink-0" />
          <span className="truncate font-semibold">{message}</span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1 bg-white hover:bg-rose-100 border border-rose-200 text-rose-800 font-bold rounded-lg transition-colors cursor-pointer flex-shrink-0 flex items-center gap-1"
          >
            <FiRefreshCw size={12} /> Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 sm:p-12 bg-white border border-slate-200/80 rounded-2xl text-center space-y-4 font-poppins card-shadow my-4">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-inner">
        <FiWifiOff size={28} />
      </div>
      <div>
        <h3 className="text-lg font-extrabold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
          {message}
        </p>
      </div>
      {onRetry && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onRetry}
            className="px-5 py-2.5 rounded-xl button-color text-xs font-semibold shadow-sm transition-all flex items-center gap-2 mx-auto cursor-pointer"
          >
            <FiRefreshCw size={14} /> Retry Request
          </button>
        </div>
      )}
    </div>
  );
};

export default ApiErrorState;
