export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertType =
  | 'STRUCTURING_RAPID_DEPOSITS'
  | 'VELOCITY_SPIKE'
  | 'HIGH_RISK_JURISDICTION'
  | 'PASS_THROUGH_LAYERING'
  | 'ROUND_AMOUNT_SURGE'
  | 'DORMANT_ACCOUNT_SUDDEN_FLOW';

export type AlertPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'OPEN' | 'INVESTIGATING' | 'ESCALATED' | 'CLOSED';
export type CaseStatus = 'NEW' | 'IN_REVIEW' | 'ESCALATED' | 'CLOSED';
export type CaseDisposition =
  | 'UNDETERMINED'
  | 'NO_SUSPICIOUS_ACTIVITY'
  | 'ESCALATED_FOR_FURTHER_REVIEW';

export interface Customer {
  customer_id: string;
  display_name: string;
  country: string;
  onboarding_date: string;
  risk_tier: RiskTier;
  business_or_occupation_type: string;
  monthly_income_or_revenue: number;
  synthetic_flag: true;
  total_transactions_count?: number;
  total_volume_usd?: number;
}

export interface Transaction {
  transaction_id: string;
  customer_id: string;
  timestamp: string;
  amount: number;
  currency: string;
  amount_usd: number;
  transaction_type: string;
  channel: string;
  counterparty_id: string;
  counterparty_name: string;
  counterparty_country: string;
  status: 'COMPLETED' | 'FLAGGED' | 'BLOCKED';
  alert_id?: string;
  case_id?: string;
}

export interface HeuristicSignal {
  signal_id: string;
  code: string;
  label: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score_contribution: number;
  evidence_references: string[];
}

export interface Alert {
  alert_id: string;
  customer_id: string;
  created_at: string;
  alert_type: AlertType;
  risk_score: number;
  priority: AlertPriority;
  status: AlertStatus;
  assigned_analyst: string;
  case_id?: string;
  explanation_of_heuristic_signals: string;
  signals: HeuristicSignal[];
}

export interface Case {
  case_id: string;
  customer_id: string;
  alert_ids: string[];
  created_at: string;
  updated_at: string;
  priority: AlertPriority;
  status: CaseStatus;
  analyst_notes: string;
  disposition: CaseDisposition;
  rationale: string;
  assigned_analyst: string;
  risk_score: number;
}

export interface AuditEvent {
  event_id: string;
  case_id: string;
  event_type: string;
  actor: string;
  previous_value: string;
  new_value: string;
  rationale: string;
  timestamp: string;
}

export interface EvidenceItem {
  evidence_id: string;
  type: 'CUSTOMER' | 'TRANSACTION' | 'ALERT' | 'SIGNAL' | 'COUNTERPARTY';
  date?: string;
  summary: string;
  raw_data: Record<string, any>;
}

export interface AIInvestigationReport {
  case_summary: string;
  observed_facts: Array<{
    fact: string;
    evidence_ids: string[];
  }>;
  hypotheses: Array<{
    hypothesis: string;
    supporting_evidence_ids: string[];
  }>;
  key_risk_indicators: Array<{
    indicator: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    evidence_ids: string[];
  }>;
  counter_evidence: Array<{
    point: string;
    evidence_ids: string[];
  }>;
  material_transactions: Array<{
    transaction_id: string;
    date: string;
    amount: number;
    currency: string;
    counterparty: string;
    risk_relevance: string;
  }>;
  potential_missing_information: string[];
  uncertainties_and_limitations: string[];
  suggested_next_investigative_steps: string[];
  evidence_sufficiency: 'SUFFICIENT' | 'PARTIAL' | 'INSUFFICIENT';
  is_repaired?: boolean;
}

export interface AIRun {
  run_id: string;
  case_id: string;
  provider: string;
  model: string;
  prompt_version: string;
  started_at: string;
  completed_at: string;
  latency_ms: number;
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  estimated_cost_usd?: number;
  success: boolean;
  error?: string;
  structured_output?: AIInvestigationReport;
  tool_invocations: Array<{
    tool_name: string;
    arguments: Record<string, any>;
    result_summary: string;
    executed_at: string;
  }>;
  citations_validation: {
    total_citations: number;
    valid_citations: number;
    invalid_citations: string[];
    citations: Array<{
      citation_id: string;
      claim: string;
      is_valid: boolean;
    }>;
  };
  retry_count: number;
}

export interface EvaluationResult {
  evaluation_id: string;
  run_id?: string;
  case_id?: string;
  test_name: string;
  category: 'SECURITY' | 'INTEGRITY' | 'SCHEMA' | 'CITATION' | 'BOUNDARIES';
  result: 'PASS' | 'FAIL';
  details: string;
  execution_ms: number;
  timestamp: string;
}

export interface OverviewMetrics {
  total_alerts: number;
  total_cases: number;
  total_customers: number;
  total_transactions: number;
  total_volume_usd: number;
  open_cases: number;
  closed_cases: number;
  escalated_cases: number;
  in_review_cases: number;
  new_cases: number;
  high_priority_alerts: number;
  alerts_by_type: Record<string, number>;
  customer_risk_tiers: Record<string, number>;
  recent_activity: AuditEvent[];
  synthetic_disclaimer: string;
}
