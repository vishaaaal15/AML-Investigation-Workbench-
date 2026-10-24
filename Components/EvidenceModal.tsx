import React, { useEffect, useState } from 'react';
import { FileSearch, CheckCircle2, X, ExternalLink, Calendar, DollarSign, User, AlertCircle } from 'lucide-react';
import { EvidenceItem } from '../types';

interface EvidenceModalProps {
  evidenceId: string | null;
  caseId: string;
  onClose: () => void;
  onNavigateToTx?: (txId: string) => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({
  evidenceId,
  caseId,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!evidenceId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    // Fetch case data or direct entity
    fetch(`/api/cases/${caseId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load case data');
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;

        // Find matching evidence item
        if (evidenceId.startsWith('CUST-') && data.customer.customer_id === evidenceId) {
          setEvidence({
            evidence_id: data.customer.customer_id,
            type: 'CUSTOMER',
            summary: `Customer ${data.customer.display_name} (${data.customer.customer_id}) - Country: ${data.customer.country}, Risk: ${data.customer.risk_tier}`,
            raw_data: data.customer
          });
        } else if (evidenceId.startsWith('TX-')) {
          const tx = data.transactions.find((t: any) => t.transaction_id === evidenceId);
          if (tx) {
            setEvidence({
              evidence_id: tx.transaction_id,
              type: 'TRANSACTION',
              date: tx.timestamp,
              summary: `Transaction ${tx.transaction_id}: $${tx.amount_usd.toLocaleString()} via ${tx.transaction_type} to ${tx.counterparty_name} (${tx.counterparty_country})`,
              raw_data: tx
            });
          } else {
            setError(`Transaction ${evidenceId} not found in case ${caseId} transactions.`);
          }
        } else if (evidenceId.startsWith('ALT-')) {
          const alt = data.alerts.find((a: any) => a.alert_id === evidenceId);
          if (alt) {
            setEvidence({
              evidence_id: alt.alert_id,
              type: 'ALERT',
              date: alt.created_at,
              summary: `Alert ${alt.alert_id} [${alt.alert_type}]: ${alt.explanation_of_heuristic_signals}`,
              raw_data: alt
            });
          } else {
            setError(`Alert ${evidenceId} not found in case ${caseId}.`);
          }
        } else if (evidenceId.startsWith('SIG-')) {
          let foundSig: any = null;
          for (const a of data.alerts) {
            const sig = a.signals?.find((s: any) => s.signal_id === evidenceId);
            if (sig) {
              foundSig = sig;
              break;
            }
          }
          if (foundSig) {
            setEvidence({
              evidence_id: foundSig.signal_id,
              type: 'SIGNAL',
              summary: `Heuristic Signal ${foundSig.signal_id}: ${foundSig.description} (Severity: ${foundSig.severity})`,
              raw_data: foundSig
            });
          } else {
            setError(`Signal ${evidenceId} not found.`);
          }
        } else if (evidenceId.startsWith('CP-')) {
          const matchingTx = data.transactions.find((t: any) => t.counterparty_id === evidenceId);
          if (matchingTx) {
            setEvidence({
              evidence_id: evidenceId,
              type: 'COUNTERPARTY',
              summary: `Counterparty ${matchingTx.counterparty_name} located in jurisdiction ${matchingTx.counterparty_country}`,
              raw_data: {
                counterparty_id: evidenceId,
                name: matchingTx.counterparty_name,
                country: matchingTx.counterparty_country
              }
            });
          } else {
            setError(`Counterparty ${evidenceId} not found in case evidence.`);
          }
        } else {
          setError(`Evidence identifier "${evidenceId}" could not be resolved.`);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [evidenceId, caseId]);

  if (!evidenceId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-xl w-full p-6 shadow-2xl text-slate-100 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-950 border border-indigo-800 text-indigo-400 rounded">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-wide">Evidence Citation Record</h3>
                <span className="font-mono text-[11px] bg-slate-800 text-indigo-300 px-2 py-0.5 rounded border border-slate-700">
                  {evidenceId}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Bound to Case Context: <span className="font-mono text-slate-300">{caseId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p>Locating verified synthetic record in case evidence store...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-xs">Evidence Resolution Notice</div>
                <div className="text-[11px] mt-0.5">{error}</div>
              </div>
            </div>
          ) : evidence ? (
            <>
              {/* Summary Card */}
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                    Category: {evidence.type}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Evidence Reference
                  </span>
                </div>
                <p className="text-slate-200 leading-relaxed font-medium">{evidence.summary}</p>
                {evidence.date && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Timestamp: {evidence.date.replace('T', ' ')}</span>
                  </div>
                )}
              </div>

              {/* Raw JSON Record */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Raw Synthetic Entity Record
                </div>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded font-mono text-[11px] text-emerald-300 overflow-x-auto leading-tight max-h-64">
                  {JSON.stringify(evidence.raw_data, null, 2)}
                </pre>
              </div>

              <div className="p-2.5 rounded bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400">
                <strong>Verifiable Grounding Rule:</strong> This evidence item was pre-compiled into the authorized bundle prior to model invocation. The AI assistant is forbidden from creating unverified references.
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-800 pt-3 mt-4 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
