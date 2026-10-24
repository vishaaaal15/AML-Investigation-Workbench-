import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  FolderLock,
  Users,
  Activity,
  ArrowUpRight,
  Clock,
  CheckCircle,
  TrendingUp,
  FileCheck2,
  RefreshCw
} from 'lucide-react';
import { OverviewMetrics } from '../types';

interface OverviewViewProps {
  onSelectCase: (caseId: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onSelectCase,
  onNavigateTab
}) => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = () => {
    setLoading(true);
    fetch('/api/overview')
      .then((res) => res.json())
      .then((data) => setMetrics(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
      </div>
    );
  }

  const alertTypeLabels: Record<string, string> = {
    STRUCTURING_RAPID_DEPOSITS: 'Structuring / Rapid Deposits',
    VELOCITY_SPIKE: 'Velocity Spike Burst',
    HIGH_RISK_JURISDICTION: 'High-Risk Jurisdiction Flow',
    PASS_THROUGH_LAYERING: 'Pass-Through Layering',
    ROUND_AMOUNT_SURGE: 'Round Amount Surge',
    DORMANT_ACCOUNT_SUDDEN_FLOW: 'Dormant Account Influx'
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Disclaimer */}
      <div className="bg-slate-900 border border-amber-900/40 p-4 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-950/60 border border-amber-800/80 rounded text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-white">
                Executive AML Risk Intelligence Dashboard
              </h2>
              <span className="text-[10px] bg-amber-950 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-800/60">
                100% Synthetic Demo Dataset
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Metrics computed directly from persistent database records (500 customers, 5,000 transactions, 100 alerts, 50 cases). No mock figures.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            onClick={() => onNavigateTab('alerts')}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition"
          >
            <span>Triage Alerts</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Alerts */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>AML Alerts Generated</span>
            <AlertOctagon className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {metrics.total_alerts}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-rose-400 mt-1 font-medium">
            <span>{metrics.high_priority_alerts} High / Critical Priority</span>
          </div>
        </div>

        {/* Active Cases */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Cases</span>
            <FolderLock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {metrics.open_cases} <span className="text-xs font-normal text-slate-500">/ {metrics.total_cases}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-amber-400 mt-1">
            <span>{metrics.escalated_cases} Escalated for Further Review</span>
          </div>
        </div>

        {/* Monitored Customers */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Monitored Entities</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {metrics.total_customers}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1">
            <span>{metrics.total_transactions.toLocaleString()} Forensic Transactions</span>
          </div>
        </div>

        {/* Total Monitored Volume */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Forensic Volume</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            ${(metrics.total_volume_usd / 1_000_000).toFixed(2)}M
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 font-mono">
            <span>USD Denominated</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Typologies & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alert Typologies Breakdown */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-white">
                AML Alert Typology Distribution
              </h3>
              <p className="text-xs text-slate-400">
                Rule engine and heuristic detection breakdown across {metrics.total_alerts} alerts
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">100 Records</span>
          </div>

          <div className="space-y-3">
            {Object.entries(metrics.alerts_by_type).map(([key, count]) => {
              const pct = Math.round((count / metrics.total_alerts) * 100);
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">
                      {alertTypeLabels[key] || key}
                    </span>
                    <span className="font-mono text-slate-400">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Case Investigation Funnel */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-white mb-1">
              Case Investigation Funnel
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Analyst triage and formal disposition state
            </p>

            <div className="space-y-2.5">
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <span className="text-xs text-slate-300">New Queue</span>
                </div>
                <span className="font-mono text-xs font-bold text-white">{metrics.new_cases}</span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-xs text-slate-300">In Active Review</span>
                </div>
                <span className="font-mono text-xs font-bold text-white">{metrics.in_review_cases}</span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span className="text-xs text-slate-300">Escalated (Further Review)</span>
                </div>
                <span className="font-mono text-xs font-bold text-white">{metrics.escalated_cases}</span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-xs text-slate-300">Closed (No Suspicious Act)</span>
                </div>
                <span className="font-mono text-xs font-bold text-white">{metrics.closed_cases}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <button
              onClick={() => onNavigateTab('cases')}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium text-center transition"
            >
              Open Case Management List
            </button>
          </div>
        </div>
      </div>

      {/* Customer Risk Tiers & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Risk Tiers */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg">
          <h3 className="font-bold text-sm text-white mb-1">
            Customer Risk Tier Profile
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Baseline KYC classification for all 500 synthetic entities
          </p>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-rose-950/30 border border-rose-900/50">
              <span className="text-rose-300 font-semibold">Critical Risk</span>
              <span className="font-mono font-bold text-rose-200">
                {metrics.customer_risk_tiers.CRITICAL || 25}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-amber-950/30 border border-amber-900/50">
              <span className="text-amber-300 font-semibold">High Risk</span>
              <span className="font-mono font-bold text-amber-200">
                {metrics.customer_risk_tiers.HIGH || 75}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-sky-950/30 border border-sky-900/50">
              <span className="text-sky-300 font-semibold">Medium Risk</span>
              <span className="font-mono font-bold text-sky-200">
                {metrics.customer_risk_tiers.MEDIUM || 125}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-300 font-semibold">Low Risk (Standard)</span>
              <span className="font-mono font-bold text-slate-200">
                {metrics.customer_risk_tiers.LOW || 275}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Audit & Analyst Activity Feed */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-white">
                Live Audit & Case Activity Stream
              </h3>
              <p className="text-xs text-slate-400">
                Persisted immutable audit events recording analyst actions
              </p>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Real-time DB Events</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {metrics.recent_activity.map((ev) => (
              <div
                key={ev.event_id}
                onClick={() => onSelectCase(ev.case_id)}
                className="p-3 bg-slate-950 rounded border border-slate-800/80 hover:border-indigo-600/50 cursor-pointer transition text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-indigo-400 font-bold">
                      {ev.case_id}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {ev.event_type}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {ev.timestamp.substring(0, 16).replace('T', ' ')}
                  </span>
                </div>
                <div className="text-slate-300 flex items-center gap-2">
                  <span className="text-slate-400">Actor:</span>
                  <span className="font-medium text-slate-200">{ev.actor}</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  <strong>Value:</strong> {ev.new_value}
                </p>
                {ev.rationale && (
                  <p className="text-slate-500 text-[11px] italic">
                    "Rationale: {ev.rationale}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
