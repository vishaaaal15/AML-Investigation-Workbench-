import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import { Alert } from '../types';

interface AlertQueueViewProps {
  onSelectCase: (caseId: string) => void;
  onOpenEvidence: (evidenceId: string, caseId: string) => void;
}

export const AlertQueueView: React.FC<AlertQueueViewProps> = ({
  onSelectCase,
  onOpenEvidence
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [sortBy, setSortBy] = useState<'created_at' | 'risk_score' | 'alert_id'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const fetchAlerts = () => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: pageSize.toString(),
      offset: ((page - 1) * pageSize).toString(),
      sortBy,
      sortOrder
    });

    if (search.trim()) params.set('search', search.trim());
    if (status !== 'ALL') params.set('status', status);
    if (type !== 'ALL') params.set('type', type);
    if (priority !== 'ALL') params.set('priority', priority);

    fetch(`/api/alerts?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setAlerts(data.alerts || []);
        setTotal(data.total || 0);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAlerts();
  }, [search, status, type, priority, sortBy, sortOrder, page]);

  const totalPages = Math.ceil(total / pageSize);

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'CRITICAL':
        return 'bg-rose-950/80 text-rose-300 border-rose-800/80';
      case 'HIGH':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/80';
      case 'MEDIUM':
        return 'bg-sky-950/80 text-sky-300 border-sky-800/80';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'OPEN':
        return 'text-sky-400 bg-sky-950/50 border-sky-800/50';
      case 'INVESTIGATING':
        return 'text-amber-400 bg-amber-950/50 border-amber-800/50';
      case 'CLOSED':
        return 'text-emerald-400 bg-emerald-950/50 border-emerald-800/50';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-800';
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-lg text-white">AML Regulatory Alert Queue</h2>
          <p className="text-xs text-slate-400">
            Search, filter, and triage AML heuristic signals across active customer accounts
          </p>
        </div>
        <div className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1.5 rounded border border-slate-800">
          Total Filtered: <strong className="text-white">{total}</strong> alerts
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search alert ID, customer ID, entity name, or analyst..."
              className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
        </div>

        {/* Second Row: Typology & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Typology:</span>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none text-xs"
            >
              <option value="ALL">All Alert Typologies</option>
              <option value="STRUCTURING_RAPID_DEPOSITS">Structuring / Rapid Deposits</option>
              <option value="VELOCITY_SPIKE">Velocity Spike</option>
              <option value="HIGH_RISK_JURISDICTION">High-Risk Jurisdiction Flow</option>
              <option value="PASS_THROUGH_LAYERING">Pass-Through Layering</option>
              <option value="ROUND_AMOUNT_SURGE">Round Amount Surge</option>
              <option value="DORMANT_ACCOUNT_SUDDEN_FLOW">Dormant Account Flow</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none text-xs"
            >
              <option value="created_at">Date / Time</option>
              <option value="risk_score">Risk Score</option>
              <option value="alert_id">Alert ID</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
              title="Toggle Sort Direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Alert Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Alert ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Customer ID</th>
                <th className="py-3 px-4">Alert Typology</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Analyst</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Loading AML alerts...</span>
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <ShieldAlert className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                    <span>No alerts match your filter criteria. Try clearing search filters.</span>
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr
                    key={alert.alert_id}
                    className="hover:bg-slate-800/50 transition cursor-pointer"
                    onClick={() => {
                      if (alert.case_id) onSelectCase(alert.case_id);
                    }}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-indigo-300">
                      {alert.alert_id}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {alert.created_at.substring(0, 16).replace('T', ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {alert.customer_id}
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-medium">
                      {alert.alert_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <span
                        className={
                          alert.risk_score >= 80
                            ? 'text-rose-400'
                            : alert.risk_score >= 60
                            ? 'text-amber-400'
                            : 'text-slate-300'
                        }
                      >
                        {alert.risk_score}
                      </span>
                      <span className="text-slate-500 text-[10px]">/100</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getPriorityBadge(
                          alert.priority
                        )}`}
                      >
                        {alert.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getStatusBadge(
                          alert.status
                        )}`}
                      >
                        {alert.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 truncate max-w-[140px]">
                      {alert.assigned_analyst.split('(')[0].trim()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {alert.case_id ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCase(alert.case_id!);
                          }}
                          className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded border border-indigo-500/40 text-[11px] font-medium transition"
                        >
                          Open {alert.case_id}
                        </button>
                      ) : (
                        <span className="text-slate-600 text-[10px]">Unlinked</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="bg-slate-950 p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing Page <span className="text-white font-bold">{page}</span> of{' '}
            <span className="text-white font-bold">{totalPages || 1}</span> ({total} alerts total)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-300 px-2">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
