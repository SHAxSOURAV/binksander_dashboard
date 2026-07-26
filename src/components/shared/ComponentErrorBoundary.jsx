import React from "react";
import { FiAlertCircle, FiRefreshCw } from "react-icons/fi";

class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Component Error Boundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-rose-50/50 border border-rose-200/80 rounded-2xl text-center space-y-4 my-4 font-poppins shadow-xs">
          <div className="mx-auto w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
            <FiAlertCircle size={24} />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-800">Failed to render section</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {this.state.error?.message || "A component-level error occurred while rendering this module."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FiRefreshCw size={13} />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ComponentErrorBoundary;
