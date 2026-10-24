import { db } from '../db/store';
import { EvidenceItem } from '../db/types';
import {
  calculateVelocityMetrics,
  calculateDeviationMetrics,
  detectCaseHeuristics
} from './heuristics';

export interface BoundedToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface BoundedToolResult {
  tool_name: string;
  arguments: Record<string, any>;
  result: any;
  executed_at: string;
  status: 'SUCCESS' | 'ERROR';
  error_message?: string;
}

export class CaseScopedToolRouter {
  private allowedCaseId: string;
  private callCount = 0;
  private maxCalls = 10;
  private evidenceBundle: Map<string, EvidenceItem> = new Map();

  constructor(caseId: string) {
    this.allowedCaseId = caseId;
    this.buildEvidenceBundle();
  }

  public getEvidenceBundleMap(): Map<string, EvidenceItem> {
    return this.evidenceBundle;
  }

  public getEvidenceBundleList(): EvidenceItem[] {
    return Array.from(this.evidenceBundle.values());
  }

  private buildEvidenceBundle() {
    const caseData = db.getCaseById(this.allowedCaseId);
    if (!caseData) return;

    const { customer, alerts, transactions, caseObj } = caseData;

    // Customer evidence
    const custEvId = customer.customer_id;
    this.evidenceBundle.set(custEvId, {
      evidence_id: custEvId,
      type: 'CUSTOMER',
      summary: `Customer ${customer.display_name} (${customer.customer_id}) - Country: ${customer.country}, Risk Tier: ${customer.risk_tier}, Business/Occupation: ${customer.business_or_occupation_type}, Onboarded: ${customer.onboarding_date}`,
      raw_data: customer
    });

    // Alert evidence
    for (const alt of alerts) {
      this.evidenceBundle.set(alt.alert_id, {
        evidence_id: alt.alert_id,
        type: 'ALERT',
        date: alt.created_at,
        summary: `Alert ${alt.alert_id} [${alt.alert_type}] - Priority: ${alt.priority}, Risk Score: ${alt.risk_score}/100, Explanation: ${alt.explanation_of_heuristic_signals}`,
        raw_data: alt
      });

      for (const sig of alt.signals) {
        this.evidenceBundle.set(sig.signal_id, {
          evidence_id: sig.signal_id,
          type: 'SIGNAL',
          summary: `Signal ${sig.signal_id} [${sig.label}]: ${sig.description} (Severity: ${sig.severity}, Weight: ${sig.score_contribution})`,
          raw_data: sig
        });
      }
    }

    // Transactions evidence (bound to relevant case transactions)
    for (const tx of transactions.slice(0, 40)) {
      this.evidenceBundle.set(tx.transaction_id, {
        evidence_id: tx.transaction_id,
        type: 'TRANSACTION',
        date: tx.timestamp,
        summary: `Transaction ${tx.transaction_id} on ${tx.timestamp.substring(0, 10)}: $${tx.amount_usd.toLocaleString()} via ${tx.transaction_type} (${tx.channel}) to/from counterparty ${tx.counterparty_name} (${tx.counterparty_country}) - Status: ${tx.status}`,
        raw_data: tx
      });

      // Counterparty evidence
      if (!this.evidenceBundle.has(tx.counterparty_id)) {
        this.evidenceBundle.set(tx.counterparty_id, {
          evidence_id: tx.counterparty_id,
          type: 'COUNTERPARTY',
          summary: `Counterparty ${tx.counterparty_name} (${tx.counterparty_id}) located in jurisdiction ${tx.counterparty_country}`,
          raw_data: {
            counterparty_id: tx.counterparty_id,
            name: tx.counterparty_name,
            country: tx.counterparty_country
          }
        });
      }
    }
  }

  public async executeTool(call: BoundedToolCall): Promise<BoundedToolResult> {
    const executedAt = new Date().toISOString();
    this.callCount++;

    if (this.callCount > this.maxCalls) {
      return {
        tool_name: call.name,
        arguments: call.arguments,
        result: null,
        executed_at: executedAt,
        status: 'ERROR',
        error_message: `Maximum allowed tool calls (${this.maxCalls}) exceeded for this case run. Loop terminated.`
      };
    }

    const { name, arguments: args } = call;

    // Boundary check: Enforce case isolation strictly!
    if (args.case_id && args.case_id !== this.allowedCaseId) {
      return {
        tool_name: name,
        arguments: args,
        result: null,
        executed_at: executedAt,
        status: 'ERROR',
        error_message: `Cross-case isolation boundary violation: Access to case ${args.case_id} denied. This run is authorized exclusively for ${this.allowedCaseId}.`
      };
    }

    try {
      let resultData: any = null;

      switch (name) {
        case 'get_case_summary': {
          resultData = this.getCaseSummary();
          break;
        }

        case 'get_case_transactions': {
          const limit = Math.min(Math.max(1, Number(args.limit) || 20), 50);
          resultData = this.getCaseTransactions(args.date_range, limit);
          break;
        }

        case 'get_related_alerts': {
          const limit = Math.min(Math.max(1, Number(args.limit) || 5), 10);
          resultData = this.getRelatedAlerts(limit);
          break;
        }

        case 'calculate_transaction_velocity': {
          const windowHours = Math.min(Math.max(1, Number(args.time_window_hours) || 24), 168);
          resultData = this.calculateVelocity(windowHours);
          break;
        }

        case 'calculate_amount_deviation': {
          resultData = this.calculateAmountDeviation();
          break;
        }

        case 'get_evidence_record': {
          if (!args.evidence_id || typeof args.evidence_id !== 'string') {
            throw new Error('evidence_id argument string is required.');
          }
          resultData = this.getEvidenceRecord(args.evidence_id);
          break;
        }

        case 'get_counterparty_relationships': {
          const limit = Math.min(Math.max(1, Number(args.limit) || 10), 25);
          resultData = this.getCounterpartyRelationships(limit);
          break;
        }

        default:
          throw new Error(
            `Unauthorized or unknown tool: "${name}". Tool execution is strictly constrained to the authorized read-only allowlist.`
          );
      }

      return {
        tool_name: name,
        arguments: args,
        result: resultData,
        executed_at: executedAt,
        status: 'SUCCESS'
      };
    } catch (err: any) {
      return {
        tool_name: name,
        arguments: args,
        result: null,
        executed_at: executedAt,
        status: 'ERROR',
        error_message: err.message || 'Unknown tool execution error'
      };
    }
  }

  private getCaseSummary() {
    const data = db.getCaseById(this.allowedCaseId);
    if (!data) throw new Error(`Case ${this.allowedCaseId} not found.`);
    return {
      case_id: data.caseObj.case_id,
      customer_id: data.customer.customer_id,
      customer_name: data.customer.display_name,
      customer_risk_tier: data.customer.risk_tier,
      customer_country: data.customer.country,
      status: data.caseObj.status,
      disposition: data.caseObj.disposition,
      priority: data.caseObj.priority,
      linked_alert_count: data.alerts.length,
      assigned_analyst: data.caseObj.assigned_analyst,
      created_at: data.caseObj.created_at,
      updated_at: data.caseObj.updated_at,
      analyst_notes_excerpt: data.caseObj.analyst_notes
    };
  }

  private getCaseTransactions(dateRange?: { start?: string; end?: string }, limit = 20) {
    const data = db.getCaseById(this.allowedCaseId);
    if (!data) return [];
    let list = data.transactions;
    if (dateRange?.start) {
      list = list.filter((t) => t.timestamp >= dateRange.start!);
    }
    if (dateRange?.end) {
      list = list.filter((t) => t.timestamp <= dateRange.end!);
    }
    return list.slice(0, limit).map((t) => ({
      evidence_id: t.transaction_id,
      timestamp: t.timestamp,
      amount_usd: t.amount_usd,
      type: t.transaction_type,
      channel: t.channel,
      counterparty_name: t.counterparty_name,
      counterparty_country: t.counterparty_country,
      status: t.status
    }));
  }

  private getRelatedAlerts(limit = 5) {
    const data = db.getCaseById(this.allowedCaseId);
    if (!data) return [];
    return data.alerts.slice(0, limit).map((a) => ({
      evidence_id: a.alert_id,
      type: a.alert_type,
      risk_score: a.risk_score,
      priority: a.priority,
      created_at: a.created_at,
      explanation: a.explanation_of_heuristic_signals,
      signals: a.signals.map((s) => ({
        signal_id: s.signal_id,
        label: s.label,
        severity: s.severity,
        score_contribution: s.score_contribution
      }))
    }));
  }

  private calculateVelocity(windowHours = 24) {
    const data = db.getCaseById(this.allowedCaseId);
    if (!data) return { error: 'Case data not found' };
    return calculateVelocityMetrics(data.transactions, windowHours);
  }

  private calculateAmountDeviation() {
    const data = db.getCaseById(this.allowedCaseId);
    if (!data) return { error: 'Case data not found' };
    return calculateDeviationMetrics(data.transactions);
  }

  private getEvidenceRecord(evidenceId: string) {
    const item = this.evidenceBundle.get(evidenceId);
    if (!item) {
      return {
        found: false,
        evidence_id: evidenceId,
        message: `Evidence ID "${evidenceId}" does not exist in the authorized evidence bundle for case ${this.allowedCaseId}.`
      };
    }
    return {
      found: true,
      item
    };
  }

  private getCounterpartyRelationships(limit = 10) {
    const data = db.getCaseById(this.allowedCaseId);
    if (!data) return [];

    const map = new Map<string, {
      counterparty_id: string;
      counterparty_name: string;
      counterparty_country: string;
      transaction_count: number;
      total_volume_usd: number;
      transaction_ids: string[];
    }>();

    for (const tx of data.transactions) {
      const existing = map.get(tx.counterparty_id) || {
        counterparty_id: tx.counterparty_id,
        counterparty_name: tx.counterparty_name,
        counterparty_country: tx.counterparty_country,
        transaction_count: 0,
        total_volume_usd: 0,
        transaction_ids: []
      };

      existing.transaction_count++;
      existing.total_volume_usd += tx.amount_usd;
      if (existing.transaction_ids.length < 5) {
        existing.transaction_ids.push(tx.transaction_id);
      }
      map.set(tx.counterparty_id, existing);
    }

    return Array.from(map.values())
      .sort((a, b) => b.total_volume_usd - a.total_volume_usd)
      .slice(0, limit);
  }
}
