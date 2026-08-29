import { useState } from "react";
import { FiCopy, FiCheck } from "react-icons/fi";

/**
 * A labelled, monospaced identifier with a copy button — used for EAN / ASIN,
 * which people constantly need to paste into Bol or Amazon.
 */
const CopyField = ({ label, value, className = "" }) => {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  const copy = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(String(value));
    } catch {
      // Clipboard API is unavailable over plain HTTP on some browsers — fall back
      // to a throwaway textarea so copying still works on a LAN-hosted dashboard.
      const ta = document.createElement("textarea");
      ta.value = String(value);
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        return;
      } finally {
        document.body.removeChild(ta);
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <span
      className={`group inline-flex items-center gap-1 text-[10px] text-gray-400 font-mono ${className}`}
    >
      {label && <span className="text-gray-400">{label}:</span>}
      <span className="text-gray-500">{value}</span>
      <button
        type="button"
        onClick={copy}
        title={copied ? "Copied" : `Copy ${label || "value"}`}
        aria-label={copied ? "Copied" : `Copy ${label || "value"}`}
        className={`p-0.5 rounded transition-all ${
          copied
            ? "text-green-600"
            : "text-gray-300 hover:text-gray-700 hover:bg-gray-100 opacity-0 group-hover:opacity-100 focus:opacity-100"
        }`}
      >
        {copied ? <FiCheck size={11} /> : <FiCopy size={11} />}
      </button>
    </span>
  );
};

export default CopyField;
