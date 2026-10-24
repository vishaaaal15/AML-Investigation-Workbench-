import fs from 'fs';
import path from 'path';
import {
  DatabaseState,
  Customer,
  Transaction,
  Alert,
  Case,
  AuditEvent,
  AIRun,
  EvaluationResult,
  CaseStatus,
  CaseDisposition
} from './types';
import { generateSyntheticDataset } from './seed';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'aml_workbench_db.json');

export interface DBValidationReport {
  is_valid: boolean;
  counts: {
    customers: number;
    transactions: number;
    alerts: number;
    cases: number;
    audit_events: number;
    ai_runs: number;
    evaluations: number;
  };
  integrity: {
    orphaned_transactions: string[];
    orphaned_alerts: string[];
    orphaned_cases: string[];
    invalid_alert_references_in_cases: string[];
    invalid_case_references_in_audits: string[];
  };
  errors: string[];
  timestamp: string;
}

export class WorkbenchDatabase {
  private state: DatabaseState;
  private isLoaded = false;

  constructor() {
    this.ensureDataDir();
    this.state = this.loadOrSeed();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadOrSeed(): DatabaseState {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseState;
        // Verify minimum schema presence
        if (parsed.customers && parsed.transactions && parsed.alerts && parsed.cases) {
          this.isLoaded = true;
          return parsed;
        }
      } catch (err) {
        console.error('Error reading existing database file, re-seeding...', err);
      }
    }

    console.log('Seeding initial synthetic AML dataset...');
    const initialState = generateSyntheticDataset(424242);
    this.persist(initialState);
    this.isLoaded = true;
    return initialState;
  }

  public persist(stateToSave?: DatabaseState) {
    const targetState = stateToSave || this.state;
    this.ensureDataDir();
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(targetState, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public reseed(force = false): { success: boolean; message: string; counts: any } {
    if (!force) {
      throw new Error('Reseed requires explicit confirmation confirmation=true');
    }
    console.warn('MANUAL RESEED: Overwriting database with original synthetic dataset...');
    this.state = generateSyntheticDataset(424242);
    this.persist();
    return {
      success: true,
      message: 'Database reseeded successfully with original deterministic dataset.',
      counts: {
        customers: Object.keys(this.state.customers).length,
        transactions: Object.keys(this.state.transactions).length,
        alerts: Object.keys(this.state.alerts).length,
        cases: Object.keys(this.state.cases).length
      }
    };
  }

  // Customers
  public getCustomers(limit = 100, offset = 0): { total: number; customers: Customer[] } {
    const all = Object.values(this.state.customers);
    return {
      total: all.length,
      customers: all.slice(offset, offset + limit)
    };
  }

  public getCustomerById(customerId: string): Customer | null {
    return this.state.customers[customerId] || null;
  }

  // Transactions
  public getTransactions(params: {
    customerId?: string;
    caseId?: string;
    alertId?: string;
    type?: string;
    minAmount?: number;
    maxAmount?: number;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): { total: number; transactions: Transaction[] } {
    let list = Object.values(this.state.transactions);

    if (params.customerId) {
      list = list.filter((tx) => tx.customer_id === params.customerId);
    }
    if (params.caseId) {
      list = list.filter((tx) => tx.case_id === params.caseId);
    }
    if (params.alertId) {
      list = list.filter((tx) => tx.alert_id === params.alertId);
    }
    if (params.type) {
      list = list.filter((tx) => tx.transaction_type === params.type);
    }
    if (params.minAmount !== undefined) {
      list = list.filter((tx) => tx.amount_usd >= params.minAmount!);
    }
    if (params.maxAmount !== undefined) {
      list = list.filter((tx) => tx.amount_usd <= params.maxAmount!);
    }
    if (params.startDate) {
      const startMs = new Date(params.startDate).getTime();
      list = list.filter((tx) => new Date(tx.timestamp).getTime() >= startMs);
    }
    if (params.endDate) {
      const endMs = new Date(params.endDate).getTime();
      list = list.filter((tx) => new Date(tx.timestamp).getTime() <= endMs);
    }

    // Sort descending by timestamp
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = list.length;
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    return {
      total,
      transactions: list.slice(offset, offset + limit)
    };
  }

  public getTransactionById(txId: string): Transaction | null {
    return this.state.transactions[txId] || null;
  }

  // Alerts
  public getAlerts(params: {
    status?: string;
    type?: string;
    priority?: string;
    search?: string;
    customerId?: string;
    sortBy?: 'created_at' | 'risk_score' | 'alert_id';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): { total: number; alerts: Alert[] } {
    let list = Object.values(this.state.alerts);

    if (params.status && params.status !== 'ALL') {
      list = list.filter((a) => a.status === params.status);
    }
    if (params.type && params.type !== 'ALL') {
      list = list.filter((a) => a.alert_type === params.type);
    }
    if (params.priority && params.priority !== 'ALL') {
      list = list.filter((a) => a.priority === params.priority);
    }
    if (params.customerId) {
      list = list.filter((a) => a.customer_id === params.customerId);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter((a) => {
        const cust = this.state.customers[a.customer_id];
        return (
          a.alert_id.toLowerCase().includes(q) ||
          a.customer_id.toLowerCase().includes(q) ||
          (cust && cust.display_name.toLowerCase().includes(q)) ||
          a.alert_type.toLowerCase().includes(q) ||
          a.assigned_analyst.toLowerCase().includes(q)
        );
      });
    }

    const sortBy = params.sortBy || 'created_at';
    const sortOrder = params.sortOrder || 'desc';

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'risk_score') {
        cmp = a.risk_score - b.risk_score;
      } else if (sortBy === 'alert_id') {
        cmp = a.alert_id.localeCompare(b.alert_id);
      } else {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    const total = list.length;
    const limit = params.limit || 20;
    const offset = params.offset || 0;
    return {
      total,
      alerts: list.slice(offset, offset + limit)
    };
  }

  public getAlertById(alertId: string): Alert | null {
    return this.state.alerts[alertId] || null;
  }

  // Cases
  public getCases(params: {
    status?: string;
    priority?: string;
    disposition?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): { total: number; cases: Case[] } {
    let list = Object.values(this.state.cases);

    if (params.status && params.status !== 'ALL') {
      list = list.filter((c) => c.status === params.status);
    }
    if (params.priority && params.priority !== 'ALL') {
      list = list.filter((c) => c.priority === params.priority);
    }
    if (params.disposition && params.disposition !== 'ALL') {
      list = list.filter((c) => c.disposition === params.disposition);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter((c) => {
        const cust = this.state.customers[c.customer_id];
        return (
          c.case_id.toLowerCase().includes(q) ||
          c.customer_id.toLowerCase().includes(q) ||
          (cust && cust.display_name.toLowerCase().includes(q)) ||
          c.assigned_analyst.toLowerCase().includes(q)
        );
      });
    }

    // Sort by updated_at descending
    list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    const total = list.length;
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    return {
      total,
      cases: list.slice(offset, offset + limit)
    };
  }

  public getCaseById(caseId: string): {
    caseObj: Case;
    customer: Customer;
    alerts: Alert[];
    transactions: Transaction[];
    auditEvents: AuditEvent[];
    recentAiRuns: AIRun[];
  } | null {
    const caseObj = this.state.cases[caseId];
    if (!caseObj) return null;

    const customer = this.state.customers[caseObj.customer_id];
    const alerts = caseObj.alert_ids.map((id) => this.state.alerts[id]).filter(Boolean);
    const transactions = Object.values(this.state.transactions)
      .filter((tx) => tx.case_id === caseId || tx.customer_id === caseObj.customer_id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const auditEvents = this.state.audit_events
      .filter((ev) => ev.case_id === caseId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const recentAiRuns = this.state.ai_runs
      .filter((r) => r.case_id === caseId)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

    return {
      caseObj,
      customer,
      alerts,
      transactions,
      auditEvents,
      recentAiRuns
    };
  }

  // Case Mutation (Analyst action only - never automatic!)
  public updateCase(params: {
    caseId: string;
    actor: string;
    status?: CaseStatus;
    disposition?: CaseDisposition;
    rationale?: string;
    analyst_notes?: string;
  }): { caseObj: Case; auditEventsAdded: AuditEvent[] } {
    const caseObj = this.state.cases[params.caseId];
    if (!caseObj) {
      throw new Error(`Case ${params.caseId} not found`);
    }

    const auditEventsAdded: AuditEvent[] = [];
    const now = new Date().toISOString();

    // Validate disposition update requires non-empty rationale
    if (params.disposition && params.disposition !== caseObj.disposition) {
      if (!params.rationale || params.rationale.trim().length === 0) {
        throw new Error('A non-empty rationale is strictly required when modifying case disposition.');
      }

      const prevDisp = caseObj.disposition;
      caseObj.disposition = params.disposition;
      caseObj.rationale = params.rationale;
      caseObj.updated_at = now;

      const auditEvent: AuditEvent = {
        event_id: `AUD-${params.caseId}-${Date.now()}-DISP`,
        case_id: params.caseId,
        event_type: 'DISPOSITION_UPDATED',
        actor: params.actor || 'Human AML Analyst',
        previous_value: prevDisp,
        new_value: params.disposition,
        rationale: params.rationale,
        timestamp: now
      };
      this.state.audit_events.push(auditEvent);
      auditEventsAdded.push(auditEvent);
    }

    if (params.status && params.status !== caseObj.status) {
      const prevStatus = caseObj.status;
      caseObj.status = params.status;
      caseObj.updated_at = now;

      const auditEvent: AuditEvent = {
        event_id: `AUD-${params.caseId}-${Date.now()}-STAT`,
        case_id: params.caseId,
        event_type: 'STATUS_UPDATED',
        actor: params.actor || 'Human AML Analyst',
        previous_value: prevStatus,
        new_value: params.status,
        rationale: params.rationale || `Case status updated to ${params.status}`,
        timestamp: now
      };
      this.state.audit_events.push(auditEvent);
      auditEventsAdded.push(auditEvent);
    }

    if (params.analyst_notes !== undefined && params.analyst_notes !== caseObj.analyst_notes) {
      const prevNotesPreview = caseObj.analyst_notes.substring(0, 40) + '...';
      caseObj.analyst_notes = params.analyst_notes;
      caseObj.updated_at = now;

      const auditEvent: AuditEvent = {
        event_id: `AUD-${params.caseId}-${Date.now()}-NOTE`,
        case_id: params.caseId,
        event_type: 'NOTES_UPDATED',
        actor: params.actor || 'Human AML Analyst',
        previous_value: prevNotesPreview,
        new_value: params.analyst_notes.substring(0, 40) + '...',
        rationale: 'Analyst updated investigation notes and forensic observations.',
        timestamp: now
      };
      this.state.audit_events.push(auditEvent);
      auditEventsAdded.push(auditEvent);
    }

    this.persist();
    return { caseObj, auditEventsAdded };
  }

  // AI Runs persistence
  public recordAiRun(run: AIRun) {
    this.state.ai_runs.push(run);

    // Also record audit event of AI execution
    const auditEvent: AuditEvent = {
      event_id: `AUD-${run.case_id}-${Date.now()}-AI`,
      case_id: run.case_id,
      event_type: 'AI_ANALYSIS_EXECUTED',
      actor: `AI Assistant (${run.model})`,
      previous_value: 'N/A',
      new_value: `Executed AI structured investigation. Run ID: ${run.run_id}`,
      rationale: `Evidence-bounded analysis generated with ${run.citations_validation.valid_citations} valid citations.`,
      timestamp: run.completed_at
    };
    this.state.audit_events.push(auditEvent);

    this.persist();
  }

  public getAiRuns(params: { caseId?: string; limit?: number }): AIRun[] {
    let list = this.state.ai_runs;
    if (params.caseId) {
      list = list.filter((r) => r.case_id === params.caseId);
    }
    list.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    return list.slice(0, params.limit || 50);
  }

  // Evaluations persistence
  public recordEvaluation(evalResult: EvaluationResult) {
    this.state.evaluations.push(evalResult);
    this.persist();
  }

  public recordEvaluationsBatch(results: EvaluationResult[]) {
    this.state.evaluations.push(...results);
    this.persist();
  }

  public getEvaluations(limit = 100): EvaluationResult[] {
    return [...this.state.evaluations]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // Referential Integrity & Validation Report
  public validateDatabaseIntegrity(): DBValidationReport {
    const custKeys = Object.keys(this.state.customers);
    const txKeys = Object.keys(this.state.transactions);
    const altKeys = Object.keys(this.state.alerts);
    const caseKeys = Object.keys(this.state.cases);

    const errors: string[] = [];

    // Check counts
    if (custKeys.length !== 500) {
      errors.push(`Expected exactly 500 customers, found ${custKeys.length}`);
    }
    if (txKeys.length < 5000) {
      errors.push(`Expected at least 5000 transactions, found ${txKeys.length}`);
    }
    if (altKeys.length !== 100) {
      errors.push(`Expected exactly 100 alerts, found ${altKeys.length}`);
    }
    if (caseKeys.length !== 50) {
      errors.push(`Expected exactly 50 cases, found ${caseKeys.length}`);
    }

    const orphaned_transactions: string[] = [];
    for (const tx of Object.values(this.state.transactions)) {
      if (!this.state.customers[tx.customer_id]) {
        orphaned_transactions.push(tx.transaction_id);
      }
    }

    const orphaned_alerts: string[] = [];
    for (const alt of Object.values(this.state.alerts)) {
      if (!this.state.customers[alt.customer_id]) {
        orphaned_alerts.push(alt.alert_id);
      }
    }

    const orphaned_cases: string[] = [];
    const invalid_alert_references_in_cases: string[] = [];
    for (const c of Object.values(this.state.cases)) {
      if (!this.state.customers[c.customer_id]) {
        orphaned_cases.push(c.case_id);
      }
      for (const aId of c.alert_ids) {
        if (!this.state.alerts[aId]) {
          invalid_alert_references_in_cases.push(`${c.case_id}->${aId}`);
        }
      }
    }

    const invalid_case_references_in_audits: string[] = [];
    for (const ev of this.state.audit_events) {
      if (!this.state.cases[ev.case_id]) {
        invalid_case_references_in_audits.push(`${ev.event_id}->${ev.case_id}`);
      }
    }

    if (orphaned_transactions.length > 0) {
      errors.push(`Found ${orphaned_transactions.length} orphaned transactions.`);
    }
    if (orphaned_alerts.length > 0) {
      errors.push(`Found ${orphaned_alerts.length} orphaned alerts.`);
    }
    if (orphaned_cases.length > 0) {
      errors.push(`Found ${orphaned_cases.length} orphaned cases.`);
    }
    if (invalid_alert_references_in_cases.length > 0) {
      errors.push(`Found ${invalid_alert_references_in_cases.length} invalid alert refs in cases.`);
    }

    return {
      is_valid: errors.length === 0,
      counts: {
        customers: custKeys.length,
        transactions: txKeys.length,
        alerts: altKeys.length,
        cases: caseKeys.length,
        audit_events: this.state.audit_events.length,
        ai_runs: this.state.ai_runs.length,
        evaluations: this.state.evaluations.length
      },
      integrity: {
        orphaned_transactions: orphaned_transactions.slice(0, 10),
        orphaned_alerts: orphaned_alerts.slice(0, 10),
        orphaned_cases: orphaned_cases.slice(0, 10),
        invalid_alert_references_in_cases: invalid_alert_references_in_cases.slice(0, 10),
        invalid_case_references_in_audits: invalid_case_references_in_audits.slice(0, 10)
      },
      errors,
      timestamp: new Date().toISOString()
    };
  }

  public getOverviewMetrics() {
    const alerts = Object.values(this.state.alerts);
    const cases = Object.values(this.state.cases);
    const customers = Object.values(this.state.customers);
    const transactions = Object.values(this.state.transactions);

    const openCases = cases.filter((c) => c.status !== 'CLOSED').length;
    const closedCases = cases.filter((c) => c.status === 'CLOSED').length;
    const escalatedCases = cases.filter((c) => c.status === 'ESCALATED').length;
    const inReviewCases = cases.filter((c) => c.status === 'IN_REVIEW').length;
    const newCases = cases.filter((c) => c.status === 'NEW').length;

    const highPriorityAlerts = alerts.filter(
      (a) => a.priority === 'CRITICAL' || a.priority === 'HIGH'
    ).length;

    // Distribution by alert type
    const alertsByType: Record<string, number> = {};
    for (const a of alerts) {
      alertsByType[a.alert_type] = (alertsByType[a.alert_type] || 0) + 1;
    }

    // Risk tier distribution
    const customerRiskTiers: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };
    for (const c of customers) {
      customerRiskTiers[c.risk_tier] = (customerRiskTiers[c.risk_tier] || 0) + 1;
    }

    // Recent activity (latest 10 audit events)
    const recentActivity = [...this.state.audit_events]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);

    // Total transaction volume
    const totalVolumeUsd = transactions.reduce((acc, t) => acc + t.amount_usd, 0);

    return {
      total_alerts: alerts.length,
      total_cases: cases.length,
      total_customers: customers.length,
      total_transactions: transactions.length,
      total_volume_usd: Math.round(totalVolumeUsd),
      open_cases: openCases,
      closed_cases: closedCases,
      escalated_cases: escalatedCases,
      in_review_cases: inReviewCases,
      new_cases: newCases,
      high_priority_alerts: highPriorityAlerts,
      alerts_by_type: alertsByType,
      customer_risk_tiers: customerRiskTiers,
      recent_activity: recentActivity,
      synthetic_disclaimer:
        'All data shown is synthetic and generated deterministically for demonstration and research purposes only. No actual bank or financial institution data is used.'
    };
  }
}

// Global Singleton
export const db = new WorkbenchDatabase();
