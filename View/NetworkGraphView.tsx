import React, { useEffect, useState, useMemo } from 'react';
import {
  Network,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  DollarSign,
  Globe,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Info
} from 'lucide-react';

interface NetworkGraphViewProps {
  initialCaseId?: string | null;
  onOpenEvidence: (evidenceId: string, caseId: string) => void;
  onSelectCase: (caseId: string) => void;
}

interface GraphNode {
  id: string;
  label: string;
  type: 'CUSTOMER' | 'COUNTERPARTY';
  country: string;
  riskTier?: string;
  totalVolumeUsd: number;
  txCount: number;
  x?: number;
  y?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  amount_usd: number;
  timestamp: string;
  transaction_type: string;
  status: string;
  alert_id?: string;
}

const HIGH_RISK_JURISDICTIONS = new Set(['KY', 'PA', 'VG', 'SC', 'VU', 'CY', 'BS', 'BZ']);

export const NetworkGraphView: React.FC<NetworkGraphViewProps> = ({
  initialCaseId,
  onOpenEvidence,
  onSelectCase
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState(initialCaseId || 'CASE-001');
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Filters
  const [minAmount, setMinAmount] = useState<number>(0);
  const [nodeLimit, setNodeLimit] = useState<number>(30);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const fetchGraphData = () => {
    setLoading(true);
    const params = new URLSearchParams({
      caseId: selectedCaseId,
      limit: nodeLimit.toString()
    });
    if (minAmount > 0) {
      params.set('minAmount', minAmount.toString());
    }

    fetch(`/api/network-graph?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        if (data.nodes && data.nodes.length > 0) {
          setSelectedNodeId(data.nodes[0].id);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGraphData();
  }, [selectedCaseId, minAmount, nodeLimit]);

  // Layout Computation: Place root customer in center, counterparties in radial circle
  const layout = useMemo(() => {
    const width = 800;
    const height = 550;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 210;

    const customerNode = nodes.find((n) => n.type === 'CUSTOMER');
    const counterpartyNodes = nodes.filter((n) => n.type === 'COUNTERPARTY');

    const positionedNodes: Record<string, { x: number; y: number }> = {};

    if (customerNode) {
      positionedNodes[customerNode.id] = { x: centerX, y: centerY };
    }

    const angleStep = counterpartyNodes.length > 0 ? (2 * Math.PI) / counterpartyNodes.length : 0;

    counterpartyNodes.forEach((node, index) => {
      const angle = index * angleStep - Math.PI / 2;
      // Stagger slightly for visual breathing room
      const r = radius + (index % 2 === 0 ? 0 : 25);
      positionedNodes[node.id] = {
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle)
      };
    });

    return { width, height, positionedNodes };
  }, [nodes]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);

  // Transactions connected to selected node
  const relatedTransactions = useMemo(() => {
    if (!selectedNodeId) return [];
    return edges.filter(
      (e) => e.source === selectedNodeId || e.target === selectedNodeId
    );
  }, [edges, selectedNodeId]);

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto flex flex-col h-full">
      {/* Top Controls Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-sm text-white flex items-center gap-2">
            <Network className="w-4 h-4 text-indigo-400" />
            <span>Forensic Counterparty Network Graph</span>
          </h2>
          <p className="text-xs text-slate-400">
            Ground-truth transaction flows between customer and counterparties. Zero simulated edges.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Case Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Focus Case:</span>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-100 font-mono text-xs focus:outline-none"
            >
              {Array.from({ length: 20 }).map((_, i) => {
                const id = `CASE-${String(i + 1).padStart(3, '0')}`;
                return (
                  <option key={id} value={id}>
                    {id}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Min Amount Slider */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Min USD:</span>
            <select
              value={minAmount}
              onChange={(e) => setMinAmount(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs"
            >
              <option value={0}>All Amounts</option>
              <option value={10000}>$10,000+</option>
              <option value={50000}>$50,000+ (High Value)</option>
              <option value={100000}>$100,000+ (Large Wire)</option>
            </select>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
              className="p-1 hover:bg-slate-800 rounded text-slate-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1 text-slate-400">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.6, z + 0.15))}
              className="p-1 hover:bg-slate-800 rounded text-slate-300"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas & Details Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        {/* SVG Graph Viewport */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 lg:col-span-2 relative overflow-hidden flex items-center justify-center min-h-[500px]">
          {loading ? (
            <div className="text-center text-slate-400">
              <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Computing topological layout...</p>
            </div>
          ) : nodes.length === 0 ? (
            <div className="text-center text-slate-500 text-xs">
              No transactions match the selected filters.
            </div>
          ) : (
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              className="select-none"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: 'transform 0.2s ease-out'
              }}
            >
              {/* Definitions for Markers */}
              <defs>
                <marker
                  id="arrow-default"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                </marker>
                <marker
                  id="arrow-flagged"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
                </marker>
              </defs>

              {/* Background Graph Guide Circles */}
              <circle
                cx={layout.width / 2}
                cy={layout.height / 2}
                r={210}
                fill="none"
                stroke="#1e293b"
                strokeDasharray="4 4"
              />

              {/* Transaction Edges */}
              {edges.map((edge) => {
                const sourcePos = layout.positionedNodes[edge.source];
                const targetPos = layout.positionedNodes[edge.target];
                if (!sourcePos || !targetPos) return null;

                const isEdgeSelected = selectedEdgeId === edge.id;
                const isConnectedToSelectedNode =
                  selectedNodeId &&
                  (edge.source === selectedNodeId || edge.target === selectedNodeId);

                const isHighRisk =
                  edge.status === 'FLAGGED' ||
                  edge.amount_usd >= 50000 ||
                  Boolean(edge.alert_id);

                return (
                  <g
                    key={edge.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedEdgeId(edge.id);
                      setSelectedNodeId(edge.target);
                    }}
                  >
                    <line
                      x1={sourcePos.x}
                      y1={sourcePos.y}
                      x2={targetPos.x}
                      y2={targetPos.y}
                      stroke={
                        isEdgeSelected
                          ? '#818cf8'
                          : isHighRisk
                          ? '#f43f5e'
                          : isConnectedToSelectedNode
                          ? '#94a3b8'
                          : '#334155'
                      }
                      strokeWidth={
                        isEdgeSelected ? 3 : isHighRisk ? 2 : isConnectedToSelectedNode ? 1.5 : 1
                      }
                      strokeOpacity={
                        selectedNodeId && !isConnectedToSelectedNode ? 0.25 : 0.85
                      }
                      markerEnd={isHighRisk ? 'url(#arrow-flagged)' : 'url(#arrow-default)'}
                    />
                  </g>
                );
              })}

              {/* Graph Nodes */}
              {nodes.map((node) => {
                const pos = layout.positionedNodes[node.id];
                if (!pos) return null;

                const isCustomer = node.type === 'CUSTOMER';
                const isSelected = selectedNodeId === node.id;
                const isHighRiskCountry = HIGH_RISK_JURISDICTIONS.has(node.country);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => {
                      setSelectedNodeId(node.id);
                      setSelectedEdgeId(null);
                    }}
                    className="cursor-pointer transition-transform duration-150"
                  >
                    {/* Outer Glow on Selected */}
                    {isSelected && (
                      <circle
                        r={isCustomer ? 28 : 20}
                        fill="none"
                        stroke="#818cf8"
                        strokeWidth="2.5"
                        strokeDasharray="3 3"
                        className="animate-spin"
                        style={{ transformOrigin: '0 0' }}
                      />
                    )}

                    {/* Node Circle */}
                    <circle
                      r={isCustomer ? 22 : 15}
                      fill={
                        isCustomer
                          ? '#3730a3'
                          : isHighRiskCountry
                          ? '#881337'
                          : '#0f172a'
                      }
                      stroke={
                        isCustomer
                          ? '#818cf8'
                          : isHighRiskCountry
                          ? '#fb7185'
                          : '#475569'
                      }
                      strokeWidth={isCustomer ? 2.5 : 1.5}
                    />

                    {/* Node Center Icon / Indicator */}
                    <text
                      textAnchor="middle"
                      dy="4"
                      fontSize={isCustomer ? '10' : '8'}
                      fontWeight="bold"
                      fill={isCustomer ? '#e0e7ff' : '#f8fafc'}
                      fontFamily="monospace"
                    >
                      {isCustomer ? 'CUST' : node.country}
                    </text>

                    {/* Node Label Below */}
                    <text
                      textAnchor="middle"
                      dy={isCustomer ? 36 : 28}
                      fontSize="9"
                      fontWeight="500"
                      fill={isSelected ? '#ffffff' : '#94a3b8'}
                      className="font-sans"
                    >
                      {node.label.length > 18 ? node.label.substring(0, 16) + '...' : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Canvas Legend */}
          <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 p-2.5 rounded text-[10px] space-y-1 text-slate-400 backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 border border-indigo-400" />
              <span>Target Customer Entity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-950 border border-rose-500" />
              <span>High-Risk Jurisdiction (FATF)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-rose-500" />
              <span>Flagged / Large Flow Edge</span>
            </div>
          </div>
        </div>

        {/* Selected Entity Forensics Inspector */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-800 pb-3 mb-3">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Entity Forensics Inspector
              </span>
              <h3 className="font-bold text-sm text-white mt-0.5">
                {selectedNode ? selectedNode.label : 'Select Node'}
              </h3>
            </div>

            {selectedNode ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500 block">ID:</span>
                    <strong className="text-indigo-300">{selectedNode.id}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Jurisdiction:</span>
                    <span className="text-white font-bold">{selectedNode.country}</span>
                    {HIGH_RISK_JURISDICTIONS.has(selectedNode.country) && (
                      <span className="ml-1 text-[9px] text-rose-400 font-sans font-bold">
                        (HIGH RISK)
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Volume:</span>
                    <strong className="text-emerald-400">
                      ${selectedNode.totalVolumeUsd.toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Case TX Count:</span>
                    <strong className="text-white">{selectedNode.txCount} txs</strong>
                  </div>
                </div>

                {/* Connected Transactions Table */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-400">
                      Flow Transactions ({relatedTransactions.length})
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {relatedTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        onClick={() => onOpenEvidence(tx.id, selectedCaseId)}
                        className="p-2 bg-slate-950 rounded border border-slate-800 hover:border-indigo-600/60 cursor-pointer text-[11px] space-y-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-indigo-400 font-semibold">{tx.id}</span>
                          <span className="font-mono font-bold text-white">
                            ${tx.amount_usd.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span>{tx.transaction_type}</span>
                          <span>{tx.timestamp.substring(0, 10)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">
                Click any customer or counterparty node on the graph to inspect flow attributes.
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={() => onSelectCase(selectedCaseId)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <span>Open Case Workspace ({selectedCaseId})</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
