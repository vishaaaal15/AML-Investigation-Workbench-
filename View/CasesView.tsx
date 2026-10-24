import React, { useEffect, useState } from 'react';
import {
  FolderLock,
  Search,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Case } from '../types';

interface CasesViewProps {
  onSelectCase: (caseId: string) => void;
}

export const CasesView: React.FC<CasesViewProps> = ({ onSelectCase }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [disposition, setDisposition] = useState('ALL');

  const fetchCases = () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '100' });
    if (search.trim()) params.set('search', search.trim());
    if (status !== 'ALL') params.set('status', status);
    if (priority !== 'ALL') params.set('priority', priority);
    if (disposition !== 'ALL') params.set('disposition', disposition);

    fetch(`/api/cases?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setCases(data.cases || []);
        setTotal(data.total || 0);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCases();
  }, [search, status, priority, disposition]);

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

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-lg text-white">Investigation Cases</h2>
          <p className="text-xs text-slate-400">
            Case records linking alerts, customers, transactions, and formal analyst dispositions
          </p>
        </div>
        <div className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1.5 rounded border border-slate-800">
          Total Cases: <strong className="text-white">{total}</strong>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Case ID or Customer..."
            className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="IN_REVIEW">IN_REVIEW</option>
            <option value="ESCALATED">ESCALATED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>

        <div>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>

        <div>
          <select
            value={disposition}
            onChange={(e) => setDisposition(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Dispositions</option>
            <option value="UNDETERMINED">UNDETERMINED</option>
            <option value="ESCALATED_FOR_FURTHER_REVIEW">ESCALATED FOR FURTHER REVIEW</option>
            <option value="NO_SUSPICIOUS_ACTIVITY">NO SUSPICIOUS ACTIVITY</option>
          </select>
        </div>
      </div>

      {/* Cases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading cases...</span>
          </div>
        ) : cases.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <FolderLock className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <span>No cases found for the selected filter combination.</span>
          </div>
        ) : (
          cases.map((c) => (
            <div
              key={c.case_id}
              onClick={() => onSelectCase(c.case_id)}
              className="bg-slate-900 border border-slate-800 hover:border-indigo-500/60 p-4 rounded-lg flex flex-col justify-between cursor-pointer transition shadow-xs group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-sm text-indigo-300 group-hover:text-indigo-200">
                    {c.case_id}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getStatusBadge(
                      c.status
                    )}`}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="text-xs text-slate-300 font-medium mb-1 flex items-center justify-between">
                  <span>Customer: <strong className="text-white font-mono">{c.customer_id}</strong></span>
                  <span className="font-mono text-[11px] text-amber-400 font-bold">
                    Score: {c.risk_score}/100
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 mb-2">
                  Linked Alerts: <span className="font-mono text-slate-300">{c.alert_ids.join(', ')}</span>
                </div>

                <div className="text-[11px] text-slate-400 line-clamp-2 italic bg-slate-950/60 p-2 rounded border border-slate-800/80 mb-3">
                  "{c.analyst_notes}"
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate max-w-[150px]">
                  Analyst: {c.assigned_analyst.split('(')[0].trim()}
                </span>
                <span className="flex items-center gap-1 text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform">
                  <span>Open Workspace</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
