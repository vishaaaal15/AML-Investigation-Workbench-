import React, { useEffect, useState } from 'react';
import {
  FolderLock,
  User,
  ShieldAlert,
  Clock,
  Download,
  Bot,
  FileText,
  History,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Edit3,
  Save,
  RotateCcw,
  Sparkles,
  Link2,
  Cpu,
  Coins,
  Send
} from 'lucide-react';
import { Case, Customer, Alert, Transaction, AuditEvent, AIRun, CaseStatus, CaseDisposition } from '../types';

interface CaseWorkspaceViewProps {
  caseId: string;
  onOpenEvidence: (evidenceId: string, caseId: string) => void;
  onOpenNetworkGraph: (caseId: string) => void;
}

export const CaseWorkspaceView: React.FC<CaseWorkspaceViewProps> = ({
  caseId,
  onOpenEvidence,
  onOpenNetworkGraph
}) => {
  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState<{
    caseObj: Case;
    customer: Customer;
    alerts: Alert[];
    transactions: Transaction[];
    auditEvents: AuditEvent[];
    recentAiRuns: AIRun[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'ai' | 'audit'>('overview');

  // Analyst Editing States
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Status & Disposition Modal
  const [showDispositionModal, setShowDispositionModal] = useState(false);
  const [selectedDisposition, setSelectedDisposition] = useState<CaseDisposition>('UNDETERMINED');
  const [selectedStatus, setSelectedStatus] = useState<CaseStatus>('IN_REVIEW');
  const [dispositionRationale, setDispositionRationale] = useState('');
  const [dispositionError, setDispositionError] = useState<string | null>(null);
  const [submittingDisposition, setSubmittingDisposition] = useState(false);

  // AI Assistant Run State
  const [runningAi, setRunningAi] = useState(false);
  const [aiPromptInquiry, setAiPromptInquiry] = useState('');
  const [latestAiRun, setLatestAiRun] = useState<AIRun | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchCase = () => {
    setLoading(true);
    fetch(`/api/cases/${caseId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load case');
        return res.json();
      })
      .then((data) => {
        setCaseData(data);
        setNotesDraft(data.caseObj.analyst_notes);
        setSelectedDisposition(data.caseObj.disposition);
        setSelectedStatus(data.caseObj.status);
        if (data.recentAiRuns && data.recentAiRuns.length > 0) {
          setLatestAiRun(data.recentAiRuns[0]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCase();
  }, [caseId]);

  if (loading || !caseData) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
      </div>
    );
  }

  const { caseObj, customer, alerts, transactions, auditEvents } = caseData;

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor: 'Lead AML Analyst (You)',
          analyst_notes: notesDraft
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save notes');
      setEditingNotes(false);
      fetchCase();
    } catch (err: any) {
      alert(`Error updating notes: ${err.message}`);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleUpdateDisposition = async () => {
    if (selectedDisposition !== caseObj.disposition && (!dispositionRationale || dispositionRationale.trim().length === 0)) {
      setDispositionError('A non-empty rationale is strictly required when modifying case disposition.');
      return;
    }

    setSubmittingDisposition(true);
    setDispositionError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor: 'Lead AML Analyst (You)',
          status: selectedStatus,
          disposition: selectedDisposition,
          rationale: dispositionRationale
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update disposition');
      setShowDispositionModal(false);
      setDispositionRationale('');
      fetchCase();
    } catch (err: any) {
      setDispositionError(err.message);
    } finally {
      setSubmittingDisposition(false);
    }
  };

  const handleExecuteAiInvestigation = async () => {
    setRunningAi(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/ai-investigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_override: aiPromptInquiry.trim() ? aiPromptInquiry.trim() : undefined
        })
      });
      const runResult: AIRun = await res.json();
      if (!runResult.success && runResult.error) {
        setAiError(runResult.error);
      }
      setLatestAiRun(runResult);
      setActiveTab('ai');
      // refresh audit trail
      fetchCase();
    } catch (err: any) {
      setAiError(err.message || 'AI investigation execution failed.');
    } finally {
      setRunningAi(false);
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'NEW':
        return 'bg-sky-950/80 text-sky-300 border-sky-800/80';
      case 'IN_REVIEW':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/80';
      case 'ESCALATED':
        return 'bg-rose-950/80 text-rose-300 border-rose-800/80';
      case 'CLOSED':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getDispositionColor = (d: string) => {
    switch (d) {
      case 'ESCALATED_FOR_FURTHER_REVIEW':
        return 'text-rose-400 bg-rose-950/50 border-rose-800/60';
      case 'NO_SUSPICIOUS_ACTIVITY':
        return 'text-emerald-400 bg-emerald-950/50 border-emerald-800/60';
      default:
        return 'text-amber-400 bg-amber-950/50 border-amber-800/60';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Triage Controls */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-base font-bold text-white bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                {caseObj.case_id}
              </span>
              <h2 className="text-lg font-bold text-slate-100">
                {customer.display_name}
              </h2>
              <span className="text-xs font-mono text-slate-400">({customer.customer_id})</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
              <span>Jurisdiction: <strong className="text-slate-200">{customer.country}</strong></span>
              <span>•</span>
              <span>Risk Tier: <strong className="text-amber-300">{customer.risk_tier}</strong></span>
              <span>•</span>
              <span>Assigned: <strong className="text-slate-200">{caseObj.assigned_analyst}</strong></span>
              <span>•</span>
              <span className="font-mono text-slate-400">Opened: {caseObj.created_at.substring(0, 10)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onOpenNetworkGraph(caseObj.case_id)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
              title="Inspect transaction flow topology"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>Network Graph</span>
            </button>

            <a
              href={`/api/cases/${caseObj.case_id}/export-pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
              title="Download Server-Generated PDF Dossier"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Export PDF</span>
            </a>

            <button
              onClick={() => {
                setSelectedDisposition(caseObj.disposition);
                setSelectedStatus(caseObj.status);
                setDispositionRationale(caseObj.rationale || '');
                setShowDispositionModal(true);
              }}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Update Status & Disposition</span>
            </button>
          </div>
        </div>

        {/* Current Governance Summary Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="p-2.5 bg-slate-950 rounded border border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400">Current Status:</span>
            <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${getStatusBadge(caseObj.status)}`}>
              {caseObj.status}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950 rounded border border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400">Formal Disposition:</span>
            <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${getDispositionColor(caseObj.disposition)}`}>
              {caseObj.disposition.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950 rounded border border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400">Risk Score:</span>
            <span className="font-mono text-amber-300 font-bold">
              {caseObj.risk_score}/100 ({caseObj.priority} Priority)
            </span>
          </div>
        </div>
      </div>

      {/* Workspace Tabs Navigation */}
      <div className="flex border-b border-slate-800 space-x-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-medium border-b-2 flex items-center gap-2 transition ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-white bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Overview & Forensics</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 text-xs font-medium border-b-2 flex items-center gap-2 transition ${
            activeTab === 'transactions'
              ? 'border-indigo-500 text-white bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Case Transactions ({transactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 text-xs font-medium border-b-2 flex items-center gap-2 transition ${
            activeTab === 'ai'
              ? 'border-indigo-500 text-white bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
          }`}
        >
          <Bot className="w-4 h-4 text-indigo-400" />
          <span>AI Investigation Assistant</span>
          {latestAiRun && (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-medium border-b-2 flex items-center gap-2 transition ${
            activeTab === 'audit'
              ? 'border-indigo-500 text-white bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit History ({auditEvents.length})</span>
        </button>
      </div>

      {/* Tab 1: Overview & Forensics */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer Baseline */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400" />
                  <span>Customer KYC Profile</span>
                </h3>
                <button
                  onClick={() => onOpenEvidence(customer.customer_id, caseObj.case_id)}
                  className="text-[11px] font-mono text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <span>Evidence #{customer.customer_id}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Entity Name:</span>
                  <span className="font-medium text-white">{customer.display_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Country:</span>
                  <span className="font-mono">{customer.country}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Business / Occupation:</span>
                  <span className="font-medium">{customer.business_or_occupation_type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Monthly Est. Income / Rev:</span>
                  <span className="font-mono text-emerald-400 font-medium">
                    ${customer.monthly_income_or_revenue?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Onboarded:</span>
                  <span className="font-mono">{customer.onboarding_date}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Total Account Volume:</span>
                  <span className="font-mono text-white font-bold">
                    ${customer.total_volume_usd?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Linked AML Alerts */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg lg:col-span-2 space-y-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Linked AML Heuristic Alerts ({alerts.length})</span>
              </h3>

              <div className="space-y-2.5">
                {alerts.map((alt) => (
                  <div
                    key={alt.alert_id}
                    onClick={() => onOpenEvidence(alt.alert_id, caseObj.case_id)}
                    className="p-3 bg-slate-950 rounded border border-slate-800 hover:border-indigo-600/60 cursor-pointer transition space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-indigo-300">
                          {alt.alert_id}
                        </span>
                        <span className="text-xs font-semibold text-white">
                          {alt.alert_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                          Score: {alt.risk_score}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {alt.created_at.substring(0, 10)}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {alt.explanation_of_heuristic_signals}
                    </p>

                    {/* Heuristic Signals */}
                    {alt.signals && alt.signals.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {alt.signals.map((sig) => (
                          <button
                            key={sig.signal_id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenEvidence(sig.signal_id, caseObj.case_id);
                            }}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 flex items-center gap-1"
                          >
                            <span>{sig.label}</span>
                            <span className="text-amber-400 font-bold">+{sig.score_contribution}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Analyst Notes Section */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-400" />
                  <span>Investigator Forensic Notes & Rationale</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Controlled by human analyst. Every modification is logged to the immutable audit trail.
                </p>
              </div>

              {!editingNotes ? (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Notes</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setNotesDraft(caseObj.analyst_notes);
                      setEditingNotes(false);
                    }}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingNotes ? 'Saving...' : 'Save Notes'}</span>
                  </button>
                </div>
              )}
            </div>

            {editingNotes ? (
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={5}
                className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                placeholder="Enter investigation observations, counterparty risk details, or follow-up interview records..."
              />
            ) : (
              <div className="p-3.5 bg-slate-950 rounded border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">
                {caseObj.analyst_notes || 'No notes entered yet.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Case Transactions */}
      {activeTab === 'transactions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">
                Authorized Forensic Transaction Evidence ({transactions.length})
              </h3>
              <p className="text-xs text-slate-400">
                Bound strictly to customer {customer.customer_id}. Click any transaction to inspect verified evidence.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">TX ID</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Amount (USD)</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Counterparty</th>
                  <th className="py-2.5 px-3">Country</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {transactions.map((tx) => (
                  <tr
                    key={tx.transaction_id}
                    onClick={() => onOpenEvidence(tx.transaction_id, caseObj.case_id)}
                    className="hover:bg-slate-800/50 cursor-pointer transition"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-300">
                      {tx.transaction_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {tx.timestamp.substring(0, 16).replace('T', ' ')}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      ${tx.amount_usd.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{tx.transaction_type}</td>
                    <td className="py-2.5 px-3 text-slate-400">{tx.channel}</td>
                    <td className="py-2.5 px-3 text-slate-200 font-medium">
                      {tx.counterparty_name}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {tx.counterparty_country}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          tx.status === 'FLAGGED'
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-indigo-400 hover:underline text-[11px] font-medium">
                        Evidence #{tx.transaction_id}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: AI Investigation Assistant */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          {/* AI Execution Banner */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Case-Scoped AI Investigation Assistant</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Authorized exclusively for Case {caseObj.case_id}. Retrieves compact evidence bundle, calculates deterministic heuristics, and generates evidence-grounded findings with verifiable citations.
                </p>
              </div>

              <button
                onClick={handleExecuteAiInvestigation}
                disabled={runningAi}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded text-xs font-semibold flex items-center gap-2 transition self-start md:self-center shadow-xs"
              >
                {runningAi ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Authorized Evidence...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run AI Investigation</span>
                  </>
                )}
              </button>
            </div>

            {/* Optional Specific Prompt Query */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
              <input
                type="text"
                value={aiPromptInquiry}
                onChange={(e) => setAiPromptInquiry(e.target.value)}
                placeholder="Optional analyst specific inquiry (e.g., 'Examine rapid pass-through layering to offshore accounts')..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-500 shrink-0 font-mono">
                Model: gemini-3.8-flash
              </span>
            </div>

            {aiError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 rounded text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <strong>AI Service Notice:</strong> {aiError}
                </div>
              </div>
            )}
          </div>

          {/* AI Report Card if available */}
          {latestAiRun && latestAiRun.structured_output ? (
            <div className="space-y-4">
              {/* Observability metadata banner */}
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-slate-400">
                    Run ID: <strong className="text-indigo-300">{latestAiRun.run_id}</strong>
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="font-mono text-[11px] text-slate-400">
                    Latency: <strong className="text-white">{latestAiRun.latency_ms} ms</strong>
                  </span>
                  <span className="text-slate-600">•</span>
                  {latestAiRun.token_usage && (
                    <span className="font-mono text-[11px] text-slate-400">
                      Tokens: <strong className="text-white">{latestAiRun.token_usage.total_tokens}</strong> ({latestAiRun.token_usage.prompt_tokens} in / {latestAiRun.token_usage.completion_tokens} out)
                    </span>
                  )}
                  {latestAiRun.estimated_cost_usd !== undefined && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="font-mono text-[11px] text-emerald-400">
                        Est. Cost: ${latestAiRun.estimated_cost_usd.toFixed(5)}
                      </span>
                    </>
                  )}
                </div>

                {/* Verifiable Citation Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>
                      Citations: {latestAiRun.citations_validation.valid_citations} / {latestAiRun.citations_validation.total_citations} Verified
                    </span>
                  </span>
                </div>
              </div>

              {/* Case Summary */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  AI Investigation Summary
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {latestAiRun.structured_output.case_summary}
                </p>
                <div className="text-[11px] font-mono text-slate-400 pt-1">
                  Evidence Sufficiency Assessment: <span className="text-emerald-400 font-bold">{latestAiRun.structured_output.evidence_sufficiency}</span>
                </div>
              </div>

              {/* Observed Facts vs Hypotheses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Facts */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Observed Objective Facts (Grounded)</span>
                  </h4>
                  <div className="space-y-2.5">
                    {latestAiRun.structured_output.observed_facts.map((f, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 rounded border border-slate-800/80 text-xs space-y-1.5">
                        <p className="text-slate-200">{f.fact}</p>
                        <div className="flex flex-wrap gap-1">
                          {f.evidence_ids.map((id) => (
                            <button
                              key={id}
                              onClick={() => onOpenEvidence(id, caseObj.case_id)}
                              className="font-mono text-[10px] px-2 py-0.5 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 flex items-center gap-1"
                            >
                              <Link2 className="w-3 h-3" />
                              <span>{id}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hypotheses */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Investigative Hypotheses (Distinguished)</span>
                  </h4>
                  <div className="space-y-2.5">
                    {latestAiRun.structured_output.hypotheses.map((h, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 rounded border border-slate-800/80 text-xs space-y-1.5">
                        <p className="text-slate-200">{h.hypothesis}</p>
                        <div className="flex flex-wrap gap-1">
                          {h.supporting_evidence_ids.map((id) => (
                            <button
                              key={id}
                              onClick={() => onOpenEvidence(id, caseObj.case_id)}
                              className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1"
                            >
                              <Link2 className="w-3 h-3" />
                              <span>{id}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Material Transactions & Counter Evidence */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Material Transactions */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    Material Transaction Evidence
                  </h4>
                  <div className="space-y-2">
                    {latestAiRun.structured_output.material_transactions.map((tx) => (
                      <div
                        key={tx.transaction_id}
                        onClick={() => onOpenEvidence(tx.transaction_id, caseObj.case_id)}
                        className="p-2.5 bg-slate-950 rounded border border-slate-800 hover:border-indigo-600/60 cursor-pointer text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-indigo-300">{tx.transaction_id}</span>
                          <span className="font-mono font-bold text-white">${tx.amount.toLocaleString()} {tx.currency}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">{tx.risk_relevance}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Counter Evidence & Uncertainty */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Counter-Evidence & Missing Information
                  </h4>
                  <div className="space-y-2 text-xs">
                    {latestAiRun.structured_output.counter_evidence.map((c, i) => (
                      <div key={i} className="p-2.5 bg-slate-950 rounded border border-slate-800 text-slate-300">
                        <strong className="text-emerald-400 block text-[11px] mb-0.5">Exculpatory Signal:</strong>
                        {c.point}
                      </div>
                    ))}

                    <div className="p-2.5 bg-slate-950 rounded border border-slate-800 text-slate-400 text-[11px]">
                      <strong className="text-amber-400 block text-[11px] mb-0.5">Uncertainty & Limitations:</strong>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {latestAiRun.structured_output.uncertainties_and_limitations.map((u, i) => (
                          <li key={i}>{u}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Suggested Investigative Next Steps */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Suggested Next Investigative Steps (For Human Analyst Review)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {latestAiRun.structured_output.suggested_next_investigative_steps.map((step, i) => (
                    <div key={i} className="p-2.5 bg-slate-950 rounded border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                      <span className="font-mono text-indigo-400 font-bold shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                <div className="p-2 rounded bg-slate-950 text-[11px] text-slate-500 italic mt-2 border border-slate-800">
                  Notice: All AI outputs are advisory suggestions. The model is forbidden from making definitive determinations of criminality or executing automated disposition actions.
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 p-12 text-center rounded-lg space-y-3">
              <Bot className="w-10 h-10 text-indigo-400 mx-auto" />
              <div className="max-w-md mx-auto">
                <h4 className="font-bold text-sm text-white">No AI Investigation Executed Yet</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Click the <strong>Run AI Investigation</strong> button above to invoke the case-scoped Gemini assistant. It will evaluate transaction velocity, check jurisdiction risk, and cite verified evidence records.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Audit History */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">
                Immutable Case Audit Trail ({auditEvents.length})
              </h3>
              <p className="text-xs text-slate-400">
                Every analyst decision, disposition change, and notes update is sequentially appended and persisted.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {auditEvents.map((ev) => (
              <div
                key={ev.event_id}
                className="p-3.5 bg-slate-950 rounded border border-slate-800 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-300 text-[11px]">
                      {ev.event_type}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-300 font-medium">{ev.actor}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">
                    {ev.timestamp.replace('T', ' ').substring(0, 19)}Z
                  </span>
                </div>

                <div className="text-slate-300 flex items-center gap-2 text-[11px]">
                  <span className="text-slate-400">Previous:</span>
                  <span className="font-mono text-slate-400">{ev.previous_value}</span>
                  <ArrowRight className="w-3 h-3 text-slate-600" />
                  <span className="text-slate-400">New Value:</span>
                  <span className="font-mono text-white font-semibold">{ev.new_value}</span>
                </div>

                {ev.rationale && (
                  <p className="text-[11px] text-slate-400 italic bg-slate-900/80 p-2 rounded border border-slate-800/80">
                    "Rationale: {ev.rationale}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disposition Mutation Modal */}
      {showDispositionModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-lg w-full p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h3 className="font-bold text-sm">Update Case Status & Formal Disposition</h3>
              <button onClick={() => setShowDispositionModal(false)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Investigation Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as CaseStatus)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="NEW">NEW</option>
                  <option value="IN_REVIEW">IN_REVIEW</option>
                  <option value="ESCALATED">ESCALATED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Formal Regulatory Disposition</label>
                <select
                  value={selectedDisposition}
                  onChange={(e) => setSelectedDisposition(e.target.value as CaseDisposition)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="UNDETERMINED">UNDETERMINED</option>
                  <option value="ESCALATED_FOR_FURTHER_REVIEW">ESCALATED FOR FURTHER REVIEW (SAR Recommendation)</option>
                  <option value="NO_SUSPICIOUS_ACTIVITY">NO SUSPICIOUS ACTIVITY (Cleared with verified rationale)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Analyst Rationale <span className="text-rose-400">*Strictly Required</span>
                </label>
                <textarea
                  value={dispositionRationale}
                  onChange={(e) => setDispositionRationale(e.target.value)}
                  rows={3}
                  placeholder="Provide explicit factual justification for disposition decision (e.g. invoice verification, counterparty nature, or suspicious pattern details)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {dispositionError && (
                <div className="p-2.5 bg-rose-950/60 border border-rose-800 rounded text-rose-300 text-[11px]">
                  {dispositionError}
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 pt-3 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowDispositionModal(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateDisposition}
                disabled={submittingDisposition}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold"
              >
                {submittingDisposition ? 'Committing...' : 'Commit Analyst Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
