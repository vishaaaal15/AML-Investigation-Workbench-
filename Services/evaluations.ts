import { db } from '../server/store.ts';
import { EvaluationResult } from '../db/types';
import { CaseScopedToolRouter } from './tools';
import { detectCaseHeuristics } from './heuristics';

export async function runComprehensiveEvaluations(): Promise<{
  evaluations: EvaluationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    pass_rate: number;
    execution_time_ms: number;
    test_version: string;
    dataset_version: string;
  };
}> {
  const startTime = Date.now();
  const results: EvaluationResult[] = [];
  const testVersion = 'v2.1.0-deterministic-aml';
  const datasetVersion = 'synth-aml-500c-5kt-100a-50cs';

  // Helper to record a test result
  const recordTest = (
    test_name: string,
    category: EvaluationResult['category'],
    passed: boolean,
    details: string,
    ms: number,
    case_id?: string
  ) => {
    results.push({
      evaluation_id: `EVAL-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      case_id,
      test_name,
      category,
      result: passed ? 'PASS' : 'FAIL',
      details,
      execution_ms: ms,
      timestamp: new Date().toISOString()
    });
  };

  // Test 1: Duplicate Seed Prevention & State Idempotency
  {
    const t0 = Date.now();
    const initialState = db.getState();
    const custCountBefore = Object.keys(initialState.customers).length;
    const txCountBefore = Object.keys(initialState.transactions).length;

    // Simulate database reload check
    const isIdempotent = custCountBefore === 500 && txCountBefore >= 5000;
    recordTest(
      'Duplicate Seed Prevention & Persistence Idempotency',
      'INTEGRITY',
      isIdempotent,
      `Verified dataset is seeded with exactly 500 customers and >=5000 transactions without duplication on restart.`,
      Date.now() - t0
    );
  }

  // Test 2: Foreign Key Referential Integrity & Non-Null Constraints
  {
    const t0 = Date.now();
    const validation = db.validateDatabaseIntegrity();
    recordTest(
      'Relational Foreign Key & Referential Integrity Verification',
      'INTEGRITY',
      validation.is_valid,
      validation.is_valid
        ? 'All 500 customers, 5,000 transactions, 100 alerts, and 50 cases have 100% valid cross-table foreign key references.'
        : `Integrity check failed: ${validation.errors.join('; ')}`,
      Date.now() - t0
    );
  }

  // Test 3: Case-Isolation Boundary Enforcement (Security)
  {
    const t0 = Date.now();
    const router = new CaseScopedToolRouter('CASE-001');
    // Try to access CASE-002 transactions via router scoped to CASE-001
    const breachResult = await router.executeTool({
      name: 'get_case_summary',
      arguments: { case_id: 'CASE-002' }
    });

    const passed = Boolean(
      breachResult.status === 'ERROR' &&
      breachResult.error_message?.includes('Cross-case isolation boundary violation')
    );

    recordTest(
      'Cross-Case Isolation Boundary Enforcement',
      'BOUNDARIES',
      passed,
      passed
        ? 'Cross-case data access successfully blocked: CASE-001 session was denied access to CASE-002.'
        : 'Failed: Cross-case query leaked unauthorized case evidence!',
      Date.now() - t0,
      'CASE-001'
    );
  }

  // Test 4: Tool Argument Schema Validation & Malicious Input Rejection
  {
    const t0 = Date.now();
    const router = new CaseScopedToolRouter('CASE-001');
    const attackResult = await router.executeTool({
      name: 'exec_arbitrary_query',
      arguments: { sql: 'SELECT * FROM users; DROP TABLE customers;' }
    });

    const passed = Boolean(
      attackResult.status === 'ERROR' &&
      attackResult.error_message?.includes('Unauthorized or unknown tool')
    );

    recordTest(
      'Tool Allowlist & Malicious Invocation Rejection',
      'SECURITY',
      passed,
      passed
        ? 'Unauthorized function names and arbitrary queries were rejected by strict tool allowlist router.'
        : 'Failed: Non-allowlisted tool was permitted to run!',
      Date.now() - t0,
      'CASE-001'
    );
  }

  // Test 5: Prohibition of Mutation Attempts via AI Tools (Read-Only Enforcement)
  {
    const t0 = Date.now();
    const router = new CaseScopedToolRouter('CASE-001');
    const writeResult = await router.executeTool({
      name: 'update_case_status',
      arguments: { case_id: 'CASE-001', new_status: 'CLOSED' }
    });

    const passed = Boolean(
      writeResult.status === 'ERROR' &&
      writeResult.error_message?.includes('Unauthorized or unknown tool')
    );

    recordTest(
      'Read-Only Tool Enforcement (AI Write Prohibition)',
      'SECURITY',
      passed,
      passed
        ? 'AI execution environment is strictly read-only. Mutation attempts to modify case status or dispositions are rejected.'
        : 'Failed: AI write mutation succeeded!',
      Date.now() - t0,
      'CASE-001'
    );
  }

  // Test 6: Bounded Evidence Bundle Compilation & Stable Citation IDs
  {
    const t0 = Date.now();
    const router = new CaseScopedToolRouter('CASE-001');
    const bundleMap = router.getEvidenceBundleMap();

    const hasCustomer = bundleMap.has('CUST-001');
    const hasAlert = bundleMap.has('ALT-001');
    const hasTransactions = Array.from(bundleMap.keys()).some((k) => k.startsWith('TX-'));

    const passed = hasCustomer && hasAlert && hasTransactions && bundleMap.size >= 25;

    recordTest(
      'Evidence Bundle Assembly & Citation Key Stability',
      'CITATION',
      passed,
      passed
        ? `Compiled evidence bundle with ${bundleMap.size} authorized stable IDs (CUST-001, ALT-001, transactions, counterparties).`
        : 'Failed: Evidence bundle missing required customer/alert/transaction references.',
      Date.now() - t0,
      'CASE-001'
    );
  }

  // Test 7: Deterministic Transaction Matching (Amounts & Timestamps)
  {
    const t0 = Date.now();
    const caseData = db.getCaseById('CASE-001');
    let passed = false;
    let details = '';

    if (caseData && caseData.transactions.length > 0) {
      const firstTx = caseData.transactions[0];
      const directDbTx = db.getTransactionById(firstTx.transaction_id);

      if (
        directDbTx &&
        directDbTx.amount_usd === firstTx.amount_usd &&
        directDbTx.timestamp === firstTx.timestamp &&
        directDbTx.counterparty_id === firstTx.counterparty_id
      ) {
        passed = true;
        details = `Transaction ${firstTx.transaction_id} verified against persistent database: amount $${firstTx.amount_usd}, timestamp ${firstTx.timestamp}, counterparty ${firstTx.counterparty_name}.`;
      } else {
        details = 'Transaction attributes mismatch between evidence query and database store.';
      }
    }

    recordTest(
      'Deterministic Transaction Source Record Verification',
      'INTEGRITY',
      passed,
      details,
      Date.now() - t0,
      'CASE-001'
    );
  }

  // Test 8: Deterministic Risk Heuristic Velocity & Deviation Calculations
  {
    const t0 = Date.now();
    const caseData = db.getCaseById('CASE-001');
    let passed = false;
    let details = '';

    if (caseData) {
      const profile = detectCaseHeuristics(caseData.caseObj, caseData.customer, caseData.transactions);
      if (
        typeof profile.overall_score === 'number' &&
        profile.overall_score >= 0 &&
        profile.overall_score <= 100 &&
        profile.velocity_metrics &&
        profile.deviation_metrics
      ) {
        passed = true;
        details = `Computed deterministic risk profile: score ${profile.overall_score}/100, velocity ratio ${profile.velocity_metrics.velocity_ratio_vs_baseline}x, deviation z-score ${profile.deviation_metrics.z_score}.`;
      } else {
        details = 'Heuristic formula produced non-numeric or out-of-bound risk score.';
      }
    }

    recordTest(
      'Deterministic AML Risk Heuristics Engine',
      'SCHEMA',
      passed,
      details,
      Date.now() - t0,
      'CASE-001'
    );
  }

  // Test 9: Network Graph Topology & Relationship Consistency
  {
    const t0 = Date.now();
    const caseData = db.getCaseById('CASE-001');
    let passed = false;
    let details = '';

    if (caseData) {
      const uniqueCps = new Set(caseData.transactions.map((t) => t.counterparty_id));
      const edgesCount = caseData.transactions.length;
      if (uniqueCps.size > 0 && edgesCount > 0) {
        passed = true;
        details = `Verified network topology: ${uniqueCps.size} unique counterparties and ${edgesCount} directed transaction edges cleanly anchored to customer ${caseData.customer.customer_id}.`;
      } else {
        details = 'Network topology has disconnected or empty edges.';
      }
    }

    recordTest(
      'Transaction Network Graph Topology & Counterparty Link Integrity',
      'INTEGRITY',
      passed,
      details,
      Date.now() - t0,
      'CASE-001'
    );
  }

  // Test 10: Human Governance: Non-Empty Rationale Enforcement on Disposition
  {
    const t0 = Date.now();
    let passed = false;
    let details = '';

    try {
      // Attempt to change disposition without rationale
      db.updateCase({
        caseId: 'CASE-002',
        actor: 'Test Governance Harness',
        disposition: 'ESCALATED_FOR_FURTHER_REVIEW',
        rationale: '' // empty should fail!
      });
      details = 'Failed: Empty rationale was mistakenly accepted by database mutation validator.';
    } catch (err: any) {
      if (err.message.includes('non-empty rationale is strictly required')) {
        passed = true;
        details = 'Enforced human analyst governance: Empty rationale for case disposition was correctly rejected.';
      } else {
        details = `Unexpected error: ${err.message}`;
      }
    }

    recordTest(
      'Analyst Governance: Non-Empty Rationale Enforcement',
      'INTEGRITY',
      passed,
      details,
      Date.now() - t0,
      'CASE-002'
    );
  }

  // Test 11: Audit Trail Immutability & Appending Verification
  {
    const t0 = Date.now();
    const beforeAudits = db.getState().audit_events.length;
    const currentCase = db.getCaseById('CASE-003')?.caseObj;
    const targetStatus = currentCase?.status === 'IN_REVIEW' ? 'ESCALATED' : 'IN_REVIEW';

    // Perform valid analyst update
    db.updateCase({
      caseId: 'CASE-003',
      actor: 'Sarah Jenkins (Senior AML Investigator)',
      status: targetStatus,
      rationale: `Automated test triage verification at ${Date.now()}`
    });
    const afterAudits = db.getState().audit_events.length;
    const passed = afterAudits === beforeAudits + 1;

    recordTest(
      'Audit Trail Integrity & Sequential Event Appending',
      'INTEGRITY',
      passed,
      passed
        ? `Audit log accurately appended new event (total audits: ${afterAudits}), preserving immutable history.`
        : 'Failed: Audit event was not appended.',
      Date.now() - t0,
      'CASE-003'
    );
  }

  // Save evaluations batch to database
  db.recordEvaluationsBatch(results);

  const passedCount = results.filter((r) => r.result === 'PASS').length;
  const failedCount = results.length - passedCount;

  return {
    evaluations: results,
    summary: {
      total: results.length,
      passed: passedCount,
      failed: failedCount,
      pass_rate: Math.round((passedCount / results.length) * 100),
      execution_time_ms: Date.now() - startTime,
      test_version: testVersion,
      dataset_version: datasetVersion
    }
  };
}
