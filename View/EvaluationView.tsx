import React, { useEffect, useState } from 'react';
import {
  TestTube2,
  CheckCircle2,
  AlertTriangle,
  Play,
  Activity,
  Cpu,
  Coins,
  History,
  ShieldCheck,
  RefreshCw,
  Clock,
  Layers
} from 'lucide-react';
import { EvaluationResult, AIRun } from '../types';

export const EvaluationView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'evaluations' | 'observability'>('evaluations');
  const [running, setRunning] = useState(false);
  const [evaluations, setEvaluations] = useState<EvaluationResult[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Observability Runs
  const [aiRuns, setAiRuns] = useState<AIRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [selectedRun, setSelectedRun] = useState<AIRun | null>(null);

  const fetchEvaluations = () => {
    fetch('/api/evaluations')
      .then((res) => res.json())
      .then((data: EvaluationResult[]) => {
        setEvaluations(data || []);
      })
      .catch((err) => console.error(err));
  };

  const fetchAiRuns = () => {
    setLoadingRuns(true);
    fetch('/api/ai-runs')
      .then((res) => res.json())
      .then((data: AIRun[]) => {
        setAiRuns(data || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingRuns(false));
  };

  useEffect(() => {
    fetchEvaluations();
    fetchAiRuns();
  }, []);

  const handleRunEvaluations = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/evaluations/run', { method: 'POST' });
      const data = await res.json();
      setEvaluations(data.evaluations || []);
      setSummary(data.summary);
    } catch (err: any) {
      alert(`Evaluation run error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const filteredEvals =
    selectedCategory === 'ALL'
      ? evaluations
      : evaluations.filter((e) => e.category === selectedCategory);

  const passedCount = evaluations.filter((e) => e.result === 'PASS').length;
  const passRate = evaluations.length > 0 ? Math.round((passedCount / evaluations.length) * 100) : 100;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-lg text-white flex items-center gap-2">
            <TestTube2 className="w-5 h-5 text-indigo-400" />
            <span>AI Quality, Deterministic Evaluation & Observability</span>
          </h2>
          <p className="text-xs text-slate-400">
            Automated test harness verifying case-isolation boundaries, verifiable citations, tool allowlists, and synthetic database integrity.
          </p>
        </div>

        {/* Sub-tab toggle */}
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubTab('evaluations')}
            className={`px-3 py-1.5 rounded font-medium transition ${
              activeSubTab === 'evaluations'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Deterministic Test Suite ({evaluations.length})
          </button>
          <button
            onClick={() => setActiveSubTab('observability')}
            className={`px-3 py-1.5 rounded font-medium transition ${
              activeSubTab === 'observability'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AI Run Observability & Costs ({aiRuns.length})
          </button>
        </div>
      </div>

      {activeSubTab === 'evaluations' && (
        <div className="space-y-6">
          {/* Action and Summary Banner */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {evaluations.length > 0 ? `${passRate}% PASS` : 'Ready to Run'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ({passedCount} / {evaluations.length} assertions passing)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Test Suite: <span className="font-mono text-indigo-300">v2.1.0-deterministic-aml</span> • Dataset:{' '}
                <span className="font-mono text-indigo-300">synth-aml-500c-5kt-100a-50cs</span>
              </p>
            </div>

            <button
              onClick={handleRunEvaluations}
              disabled={running}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded text-xs font-semibold flex items-center gap-2 shadow-xs transition"
            >
              {running ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing 11 Automated Tests...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Execute Deterministic Evaluation Suite</span>
                </>
              )}
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Filter Category:</span>
            {['ALL', 'SECURITY', 'BOUNDARIES', 'CITATION', 'INTEGRITY', 'SCHEMA'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                  selectedCategory === cat
                    ? 'bg-slate-800 text-white border border-slate-600'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Test Cards List */}
          <div className="space-y-3">
            {filteredEvals.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-12 text-center rounded-lg text-slate-400 text-xs">
                Click <strong>"Execute Deterministic Evaluation Suite"</strong> to run the automated tests against database integrity, tool authorization, and citation validation.
              </div>
            ) : (
              filteredEvals.map((test) => (
                <div
                  key={test.evaluation_id}
                  className="bg-slate-900 border border-slate-800 p-4 rounded-lg text-xs space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {test.result === 'PASS' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <h4 className="font-bold text-sm text-white">{test.test_name}</h4>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-slate-800">
                        {test.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
                      <span>{test.execution_ms} ms</span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          test.result === 'PASS'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {test.result}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-300 leading-relaxed font-mono text-[11px] bg-slate-950 p-2.5 rounded border border-slate-800/80">
                    {test.details}
                  </p>

                  {test.case_id && (
                    <div className="text-[10px] text-slate-500 font-mono">
                      Scoped Context: {test.case_id}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Observability Sub-tab */}
      {activeSubTab === 'observability' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-2">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>AI Run Audit & Cost Telemetry</span>
            </h3>
            <p className="text-xs text-slate-400">
              Complete observability tracking for every explicit AI investigation execution. Track prompt version, latency, real tokens, verified citations, and calculated cost.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Run ID</th>
                    <th className="py-3 px-4">Case ID</th>
                    <th className="py-3 px-4">Model</th>
                    <th className="py-3 px-4">Latency</th>
                    <th className="py-3 px-4">Token Usage</th>
                    <th className="py-3 px-4">Est. Cost (USD)</th>
                    <th className="py-3 px-4">Citations</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {loadingRuns ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                        <span>Loading AI run logs...</span>
                      </td>
                    </tr>
                  ) : aiRuns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <span>No AI runs logged yet. Open any case in the workspace and click "Run AI Investigation".</span>
                      </td>
                    </tr>
                  ) : (
                    aiRuns.map((run) => (
                      <tr
                        key={run.run_id}
                        onClick={() => setSelectedRun(run)}
                        className="hover:bg-slate-800/50 cursor-pointer transition"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-indigo-300">
                          {run.run_id.substring(0, 16)}...
                        </td>
                        <td className="py-3 px-4 font-mono text-white">{run.case_id}</td>
                        <td className="py-3 px-4 font-mono text-slate-300">{run.model}</td>
                        <td className="py-3 px-4 font-mono text-slate-300">{run.latency_ms} ms</td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {run.token_usage ? (
                            <span>
                              {run.token_usage.total_tokens} ({run.token_usage.prompt_tokens} in /{' '}
                              {run.token_usage.completion_tokens} out)
                            </span>
                          ) : (
                            <span className="text-slate-600">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-400">
                          {run.estimated_cost_usd !== undefined ? (
                            `$${run.estimated_cost_usd.toFixed(5)}`
                          ) : (
                            <span className="text-slate-600">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-slate-950 text-indigo-300 text-[11px] border border-slate-800">
                            {run.citations_validation.valid_citations} / {run.citations_validation.total_citations}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                              run.success
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : 'bg-rose-950 text-rose-300 border-rose-800'
                            }`}
                          >
                            {run.success ? 'SUCCESS' : 'FAILED'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Run Drawer/Modal */}
          {selectedRun && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="font-bold text-sm text-white">
                  Run Telemetry Detail: {selectedRun.run_id}
                </h4>
                <button
                  onClick={() => setSelectedRun(null)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px] bg-slate-950 p-3 rounded border border-slate-800">
                <div>Started: {selectedRun.started_at.substring(11, 19)}Z</div>
                <div>Completed: {selectedRun.completed_at.substring(11, 19)}Z</div>
                <div>Prompt Version: {selectedRun.prompt_version}</div>
                <div>Retry Count: {selectedRun.retry_count}</div>
              </div>

              {/* Tool Invocations */}
              <div>
                <h5 className="font-semibold text-xs text-slate-300 mb-1.5">
                  Authorized Read-Only Tool Invocations ({selectedRun.tool_invocations.length})
                </h5>
                <div className="space-y-1.5">
                  {selectedRun.tool_invocations.map((ti, i) => (
                    <div key={i} className="p-2 bg-slate-950 rounded border border-slate-800 text-xs font-mono">
                      <div className="text-indigo-400 font-bold">{ti.tool_name}()</div>
                      <div className="text-slate-400 text-[11px]">{ti.result_summary}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
