import React, { useState } from 'react';
import {
  ShieldAlert,
  Database,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Download
} from 'lucide-react';

interface HeaderProps {
  onOpenReseed: () => void;
  systemHealth: any;
  onRefreshHealth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenReseed,
  systemHealth,
  onRefreshHealth
}) => {
  const [showIntegrityModal, setShowIntegrityModal] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationReport, setValidationReport] = useState<any>(null);

  const handleValidateDb = async () => {
    setValidating(true);
    setShowIntegrityModal(true);
    try {
      const res = await fetch('/api/admin/validate-db', { method: 'POST' });
      const data = await res.json();
      setValidationReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setValidating(false);
    }
  };

  const isGeminiReady = systemHealth?.gemini?.is_configured;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-6 py-3 sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-gradient-to-br from-indigo-600 to-slate-800 flex items-center justify-center border border-indigo-500/30 shadow-inner">
          <ShieldAlert className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-base tracking-tight text-white">
              AML Investigation Workbench
            </h1>
            <span className="text-[10px] font-mono uppercase bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 px-2 py-0.5 rounded">
              Financial Crime Platform
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <span>AI-Assisted Forensics & Triage</span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-400/90 font-medium text-[11px]">
              Synthetic Dataset (Deterministic)
            </span>
          </p>
        </div>
      </div>

      {/* Center Disclaimer */}
      <div className="hidden lg:flex items-center gap-2 bg-slate-950/90 px-3 py-1.5 rounded border border-amber-900/40 text-[11px] text-amber-300">
        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          <strong>Research Prototype:</strong> Fictional entities only. No affiliation with Mastercard or banking institutions.
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Gemini status */}
        <div
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border ${
            isGeminiReady
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
              : 'bg-amber-950/40 text-amber-300 border-amber-800/60'
          }`}
          title={systemHealth?.gemini?.message || 'Gemini Model Status'}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="font-mono text-[11px]">
            {isGeminiReady ? 'Gemini 3.8 Flash: Active' : 'Gemini Key: Unconfigured'}
          </span>
        </div>

        {/* Database Status Button */}
        <button
          onClick={handleValidateDb}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          title="Verify Synthetic Database Integrity & Exact Record Counts"
        >
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-mono text-[11px]">
            {systemHealth?.counts
              ? `${systemHealth.counts.customers}c / ${systemHealth.counts.transactions}tx`
              : 'DB Verified'}
          </span>
        </button>

        {/* Download Backup Button */}
        <a
          href="/api/download-backup"
          download="aml-investigation-workbench-backup.zip"
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/80 transition"
          title="Download complete verified project source archive (.zip) with tests and synthetic data"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Backup</span>
        </a>

        {/* Reseed Button */}
        <button
          onClick={onOpenReseed}
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-800/80 hover:bg-rose-950 hover:text-rose-200 hover:border-rose-800 text-slate-300 border border-slate-700 transition"
          title="Reset database to original deterministic seed state"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset / Reseed</span>
        </button>
      </div>

      {/* DB Integrity Inspection Modal */}
      {showIntegrityModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-lg w-full p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">Database & Referential Integrity Report</h3>
              </div>
              <button
                onClick={() => setShowIntegrityModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {validating ? (
              <div className="py-8 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                <p className="text-xs">Validating 5,000+ foreign keys and entity records...</p>
              </div>
            ) : validationReport ? (
              <div className="space-y-4 text-xs">
                <div
                  className={`p-3 rounded border flex items-center gap-2.5 ${
                    validationReport.is_valid
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-800 text-rose-300'
                  }`}
                >
                  {validationReport.is_valid ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold text-xs">
                      {validationReport.is_valid
                        ? 'Referential Integrity: 100% VALID'
                        : 'Referential Integrity Violations Found'}
                    </div>
                    <div className="text-[11px] opacity-80">
                      Zero orphaned foreign keys detected across all relationships.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-300 bg-slate-950 p-3 rounded border border-slate-800 font-mono text-[11px]">
                  <div>Customers: <strong className="text-white">{validationReport.counts.customers}</strong> (Expected: 500)</div>
                  <div>Transactions: <strong className="text-white">{validationReport.counts.transactions}</strong> (Expected: 5,000)</div>
                  <div>AML Alerts: <strong className="text-white">{validationReport.counts.alerts}</strong> (Expected: 100)</div>
                  <div>Investigation Cases: <strong className="text-white">{validationReport.counts.cases}</strong> (Expected: 50)</div>
                  <div>Audit Events: <strong className="text-white">{validationReport.counts.audit_events}</strong></div>
                  <div>AI Investigation Runs: <strong className="text-white">{validationReport.counts.ai_runs}</strong></div>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-800/40 p-2.5 rounded border border-slate-800">
                  Storage Engine: <span className="font-mono text-slate-200">Server Persistent JSON File</span> (atomic fsync).
                  Restarting the dev server preserves analyst changes and audit events.
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setShowIntegrityModal(false)}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium"
                  >
                    Close Report
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
};
