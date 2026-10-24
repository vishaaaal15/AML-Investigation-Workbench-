import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { EvidenceModal } from './components/EvidenceModal';
import { ReseedModal } from './components/ReseedModal';
import { OverviewView } from './views/OverviewView';
import { AlertQueueView } from './views/AlertQueueView';
import { CasesView } from './views/CasesView';
import { CaseWorkspaceView } from './views/CaseWorkspaceView';
import { NetworkGraphView } from './views/NetworkGraphView';
import { EvaluationView } from './views/EvaluationView';
import { MethodologyView } from './views/MethodologyView';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [activeCaseId, setActiveCaseId] = useState<string>('CASE-001');

  // Modals
  const [evidenceModalId, setEvidenceModalId] = useState<string | null>(null);
  const [evidenceCaseId, setEvidenceCaseId] = useState<string>('CASE-001');
  const [showReseedModal, setShowReseedModal] = useState(false);

  // System Health
  const [systemHealth, setSystemHealth] = useState<any>(null);

  const fetchHealth = () => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setSystemHealth(data))
      .catch((err) => console.error('Health check failed:', err));
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleSelectCase = (caseId: string) => {
    setActiveCaseId(caseId);
    setCurrentTab('workspace');
  };

  const handleOpenNetworkGraph = (caseId: string) => {
    setActiveCaseId(caseId);
    setCurrentTab('network');
  };

  const handleOpenEvidence = (evidenceId: string, caseId: string) => {
    setEvidenceModalId(evidenceId);
    setEvidenceCaseId(caseId);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Application Header */}
      <Header
        onOpenReseed={() => setShowReseedModal(true)}
        systemHealth={systemHealth}
        onRefreshHealth={fetchHealth}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          activeCaseId={activeCaseId}
          alertsCount={systemHealth?.counts?.alerts || 100}
          openCasesCount={systemHealth?.counts?.cases ? Math.round(systemHealth.counts.cases * 0.8) : 42}
        />

        {/* Dynamic Content View Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950/70">
          {currentTab === 'overview' && (
            <OverviewView
              onSelectCase={handleSelectCase}
              onNavigateTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'alerts' && (
            <AlertQueueView
              onSelectCase={handleSelectCase}
              onOpenEvidence={handleOpenEvidence}
            />
          )}

          {currentTab === 'cases' && (
            <CasesView onSelectCase={handleSelectCase} />
          )}

          {currentTab === 'workspace' && (
            <CaseWorkspaceView
              caseId={activeCaseId}
              onOpenEvidence={handleOpenEvidence}
              onOpenNetworkGraph={handleOpenNetworkGraph}
            />
          )}

          {currentTab === 'network' && (
            <NetworkGraphView
              initialCaseId={activeCaseId}
              onOpenEvidence={handleOpenEvidence}
              onSelectCase={handleSelectCase}
            />
          )}

          {currentTab === 'evaluation' && <EvaluationView />}

          {currentTab === 'methodology' && <MethodologyView />}
        </main>
      </div>

      {/* Interactive Evidence Citation Inspector Modal */}
      <EvidenceModal
        evidenceId={evidenceModalId}
        caseId={evidenceCaseId}
        onClose={() => setEvidenceModalId(null)}
      />

      {/* Database Reset / Reseed Confirmation Modal */}
      <ReseedModal
        isOpen={showReseedModal}
        onClose={() => setShowReseedModal(false)}
        onReseedSuccess={() => {
          fetchHealth();
        }}
      />
    </div>
  );
}
