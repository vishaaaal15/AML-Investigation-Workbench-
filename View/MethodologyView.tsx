import React, { useState } from 'react';
import {
  BookOpen,
  Layers,
  ShieldCheck,
  Cpu,
  Database,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  Lock,
  GitBranch,
  Terminal,
  ExternalLink
} from 'lucide-react';

export const MethodologyView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'architecture' | 'heuristics' | 'ai-safety' | 'data' | 'scope'>('architecture');

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="font-bold text-lg text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <span>System Architecture & Engineering Methodology</span>
        </h2>
        <p className="text-xs text-slate-400">
          Formal engineering documentation for the AML Investigation Workbench portfolio platform.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-1 overflow-x-auto text-xs font-medium">
        <button
          onClick={() => setActiveSection('architecture')}
          className={`px-4 py-2 border-b-2 flex items-center gap-2 transition ${
            activeSection === 'architecture'
              ? 'border-indigo-500 text-white bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Architecture & Data Flow</span>
        </button>

        <button
          onClick={() => setActiveSection('heuristics')}
          className={`px-4 py-2 border-b-2 flex items-center gap-2 transition ${
            activeSection === 'heuristics'
              ? 'border-indigo-500 text-white bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>Risk Heuristic Formulas</span>
        </button>

        <button
          onClick={() => setActiveSection('ai-safety')}
          className={`px-4 py-2 border-b-2 flex items-center gap-2 transition ${
            activeSection === 'ai-safety'
              ? 'border-indigo-500 text-white bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Citation Verification & Tool Boundaries</span>
        </button>

        <button
          onClick={() => setActiveSection('data')}
          className={`px-4 py-2 border-b-2 flex items-center gap-2 transition ${
            activeSection === 'data'
              ? 'border-indigo-500 text-white bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Synthetic Dataset & Schema</span>
        </button>

        <button
          onClick={() => setActiveSection('scope')}
          className={`px-4 py-2 border-b-2 flex items-center gap-2 transition ${
            activeSection === 'scope'
              ? 'border-indigo-500 text-white bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Implemented vs Future Scope</span>
        </button>
      </div>

      {/* Section 1: Architecture & Data Flow */}
      {activeSection === 'architecture' && (
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Full-Stack System Architecture</span>
            </h3>
            <p>
              The platform is architected as an enterprise single-page application (React 19 + TypeScript + Tailwind CSS) backed by an Express server runtime in Node.js.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 font-mono text-[11px]">
              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                <strong className="text-indigo-300 block">Frontend Presentation</strong>
                <div>• React 19 SPA + Tailwind CSS</div>
                <div>• Pure SVG Interactive Topology</div>
                <div>• Scoped Investigation Dossier</div>
                <div>• Interactive Citation Inspector</div>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                <strong className="text-emerald-300 block">Server-Side Engine</strong>
                <div>• Node.js Express REST API</div>
                <div>• Case-Scoped Bounded Tools</div>
                <div>• Deterministic AML Heuristics</div>
                <div>• Pure PDFKit Vector Generation</div>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                <strong className="text-amber-300 block">AI & Persistence</strong>
                <div>• Official @google/genai SDK</div>
                <div>• Model: gemini-3.8-flash (server)</div>
                <div>• Atomic Fsync File Persistence</div>
                <div>• Firestore Ready Interface</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-3">
            <h3 className="font-bold text-sm text-white">Data Flow Pipeline</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                <strong>Triage & Detection:</strong> 100 AML alerts are deterministically linked to 50 active cases across 500 customers and 5,000 transactions.
              </li>
              <li>
                <strong>Bounded Context Compilation:</strong> When an investigator opens a case, the server builds an immutable evidence bundle with stable IDs (e.g. <code className="text-indigo-300">CUST-001</code>, <code className="text-indigo-300">TX-0042</code>, <code className="text-indigo-300">ALT-003</code>).
              </li>
              <li>
                <strong>Deterministic Signal Extraction:</strong> Velocity metrics, amount z-scores, and high-risk corridor flags are calculated mathematically prior to model invocation.
              </li>
              <li>
                <strong>Structured AI Synthesis:</strong> Gemini 3.8 Flash receives the bounded bundle and returns structured JSON conforming strictly to schema with explicit evidence citations.
              </li>
              <li>
                <strong>Server Citation Verification:</strong> The server validates every cited evidence ID against the authorized bundle before returning data to the UI.
              </li>
              <li>
                <strong>Human Analyst Governance:</strong> Dispositions and case closures require human justification and immediately append to the immutable audit trail.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Section 2: Risk Heuristic Formulas */}
      {activeSection === 'heuristics' && (
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-indigo-400" />
              <span>Deterministic Heuristic Formulations</span>
            </h3>
            <div className="p-3 bg-amber-950/40 border border-amber-800 rounded text-amber-200 text-[11px]">
              <strong>Methodological Disclosure:</strong> Risk scores are labelled <em>demo heuristics</em>. They are deterministic mathematical formulas reflecting established AML typologies, not black-box ML claims. They do not imply definitive money laundering proof.
            </div>

            <div className="space-y-4 pt-2">
              <div className="p-3.5 bg-slate-950 rounded border border-slate-800 space-y-1">
                <strong className="text-white font-semibold">1. Transaction Velocity Burst Ratio (Vr)</strong>
                <p className="text-slate-400">
                  Measures the ratio of the peak rolling 24-hour transaction frequency (C_24h) against the customer's average historical daily frequency (C_baseline):
                </p>
                <code className="block bg-slate-900 p-2 rounded text-indigo-300 font-mono text-[11px] my-1">
                  Vr = C_24h / (C_total / Delta_Days)
                </code>
                <p className="text-slate-400 text-[11px]">
                  Threshold: Triggered when Vr &gt;= 3.0x. Values above 5.0x are classified as Critical severity.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 rounded border border-slate-800 space-y-1">
                <strong className="text-white font-semibold">2. Amount Statistical Outlier (Z-Score)</strong>
                <p className="text-slate-400">
                  Calculates the standard deviation distance of burst transaction amounts from the customer's baseline mean:
                </p>
                <code className="block bg-slate-900 p-2 rounded text-indigo-300 font-mono text-[11px] my-1">
                  Z = (Mean_burst - Mean_baseline) / StdDev_history
                </code>
                <p className="text-slate-400 text-[11px]">
                  Threshold: Triggered when Z &gt;= 2.0. Significant deviations (Z &gt;= 3.5) trigger high score weightings.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 rounded border border-slate-800 space-y-1">
                <strong className="text-white font-semibold">3. Currency Transaction Reporting (CTR) Structuring Window</strong>
                <p className="text-slate-400">
                  Identifies clusters of transactions strictly within the smurfing window:
                </p>
                <code className="block bg-slate-900 p-2 rounded text-indigo-300 font-mono text-[11px] my-1">
                  Structuring = Count(Amount between $9,000 and $9,999) &gt;= 2 within 72 hours
                </code>
              </div>

              <div className="p-3.5 bg-slate-950 rounded border border-slate-800 space-y-1">
                <strong className="text-white font-semibold">4. FATF High-Risk & Offshore Jurisdiction Corridors</strong>
                <p className="text-slate-400">
                  Monitors cross-border transfers routing through jurisdictions identified by FATF or offshore regulatory scrutiny: Cayman Islands (KY), Panama (PA), British Virgin Islands (VG), Seychelles (SC), Vanuatu (VU), and Cyprus (CY).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Citation Verification & Boundaries */}
      {activeSection === 'ai-safety' && (
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verifiable Grounding & Citation Validation</span>
            </h3>
            <p>
              To eliminate ungrounded hallucinations, the platform enforces a two-tier verification mechanism:
            </p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                <strong>Pre-Invocation Bundle Scoping:</strong> Only records authorized for the target case are provided to the model. Cross-case data retrieval is blocked at the router layer.
              </li>
              <li>
                <strong>Deterministic Server-Side Verification:</strong> Every cited key in <code className="text-indigo-300">evidence_ids</code> is verified against the hash map of the pre-compiled bundle. If an ID is fabricated or invalid, it is flagged in <code className="text-rose-400">invalid_citations</code>.
              </li>
              <li>
                <strong>Single Constrained Repair Retry:</strong> If the model returns invalid JSON or uncited claims, a constrained repair retry is executed with the exact list of authorized IDs.
              </li>
            </ol>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Case Isolation & Read-Only Tool Allowlist</span>
            </h3>
            <div className="space-y-2 font-mono text-[11px]">
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-emerald-400 font-bold">ALLOWED READ-ONLY TOOLS:</span>
                <ul className="list-disc pl-5 text-slate-300 mt-1">
                  <li>get_case_summary(case_id)</li>
                  <li>get_case_transactions(case_id, date_range, limit)</li>
                  <li>get_related_alerts(case_id, limit)</li>
                  <li>calculate_transaction_velocity(case_id, time_window)</li>
                  <li>calculate_amount_deviation(case_id)</li>
                  <li>get_evidence_record(case_id, evidence_id)</li>
                  <li>get_counterparty_relationships(case_id, limit)</li>
                </ul>
              </div>

              <div className="p-2 bg-rose-950/40 rounded border border-rose-800 text-rose-300">
                <span className="font-bold">PROHIBITED ACTIONS:</span>
                <p className="mt-1 font-sans text-xs">
                  The AI assistant has zero write permissions. It cannot modify case status, alter analyst notes, close cases, issue automated SAR filings, or access other cases' customer data.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Synthetic Dataset & Schema */}
      {activeSection === 'data' && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-3 text-xs text-slate-300">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            <span>Deterministic Synthetic Dataset Specification</span>
          </h3>
          <p>
            The dataset is generated deterministically using a seeded pseudo-random number generator (<code className="text-indigo-300">Mulberry32(seed=424242)</code>).
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-[11px] pt-2">
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-500 block">Customers</span>
              <span className="text-lg font-bold text-white">500</span>
              <span className="text-[10px] text-slate-500 block">CUST-001 to CUST-500</span>
            </div>

            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-500 block">Transactions</span>
              <span className="text-lg font-bold text-white">5,000</span>
              <span className="text-[10px] text-slate-500 block">TX-0001 to TX-5000</span>
            </div>

            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-500 block">AML Alerts</span>
              <span className="text-lg font-bold text-white">100</span>
              <span className="text-[10px] text-slate-500 block">ALT-001 to ALT-100</span>
            </div>

            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-500 block">Investigation Cases</span>
              <span className="text-lg font-bold text-white">50</span>
              <span className="text-[10px] text-slate-500 block">CASE-001 to CASE-050</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded border border-slate-800 text-[11px] text-slate-400">
            <strong>Persistence Engine:</strong> Stored on server disk at <code className="text-indigo-300">data/aml_workbench_db.json</code> with atomic file replacement. Server reloads and restarts do not overwrite analyst updates.
          </div>
        </div>
      )}

      {/* Section 5: Implemented vs Future Scope */}
      {activeSection === 'scope' && (
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Truthful Implementation Status Report</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950 rounded border border-emerald-900/40 space-y-2">
                <span className="font-bold text-emerald-300 text-xs block">
                  ✓ VERIFIED IMPLEMENTED FEATURES
                </span>
                <ul className="space-y-1.5 text-[11px] text-slate-300">
                  <li>• React + TypeScript frontend with Tailwind CSS enterprise navy styling</li>
                  <li>• Node.js + Express backend running with Vite middleware</li>
                  <li>• Exactly 500 customers, 5,000 transactions, 100 alerts, and 50 cases</li>
                  <li>• Atomic JSON file persistence with integrity validator</li>
                  <li>• Searchable, filterable, sortable, paginated Alert Queue</li>
                  <li>• Complete Investigation Case Workspace with analyst notes & status</li>
                  <li>• Mandatory non-empty rationale for case disposition mutations</li>
                  <li>• Sequential immutable audit event stream logging all actions</li>
                  <li>• Server-side @google/genai SDK integration (gemini-3.8-flash)</li>
                  <li>• Case-scoped bounded tool calling router (7 read-only tools)</li>
                  <li>• Server citation verification against pre-compiled evidence bundles</li>
                  <li>• Real-time token tracking, latency measurement & cost estimation</li>
                  <li>• Interactive SVG topological counterparty network graph</li>
                  <li>• Server-side PDF export dossier generation using pdfkit</li>
                  <li>• Automated 11-test deterministic evaluation harness</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-950 rounded border border-amber-900/40 space-y-2">
                <span className="font-bold text-amber-300 text-xs block">
                  Future Roadmap / Unimplemented Items
                </span>
                <ul className="space-y-1.5 text-[11px] text-slate-400">
                  <li>• Production Cloud Firestore provisioning (interface ready)</li>
                  <li>• Real-time WebSocket multi-analyst simultaneous collaboration</li>
                  <li>• Graph neural network (GNN) trained embedding model for link prediction</li>
                  <li>• Automated FinCEN SAR XML direct submission gateway</li>
                  <li>• Continuous CI/CD automated regression pipeline against production bank feeds</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
