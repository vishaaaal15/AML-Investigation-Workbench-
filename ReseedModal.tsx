import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, X, ShieldAlert } from 'lucide-react';

interface ReseedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReseedSuccess: () => void;
}

export const ReseedModal: React.FC<ReseedModalProps> = ({
  isOpen,
  onClose,
  onReseedSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/reseed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Reseed failed');
      }
      onReseedSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-rose-900/60 rounded-lg max-w-md w-full p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2 text-rose-400">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <h3 className="font-bold text-sm">Reset / Reseed Synthetic Database</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded text-rose-200 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            <div>
              <strong className="block font-semibold">Caution: Destructive Reset</strong>
              This will overwrite the current persistent database and restore the original deterministic 500 customers, 5,000 transactions, 100 alerts, and 50 cases. Any custom analyst notes or disposition modifications will be wiped.
            </div>
          </div>

          <p className="text-slate-400">
            Use this action when you wish to reset your investigation state to the fresh baseline for repeatable testing or demonstration.
          </p>

          {error && (
            <div className="p-2 bg-rose-900/40 text-rose-300 rounded text-[11px] font-mono">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 pt-3 mt-5 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Reseeding...</span>
              </>
            ) : (
              <span>Confirm & Reset Database</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
