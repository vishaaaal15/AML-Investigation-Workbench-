import {
  Customer,
  Transaction,
  Alert,
  Case,
  AuditEvent,
  RiskTier,
  AlertType,
  AlertPriority,
  AlertStatus,
  CaseStatus,
  CaseDisposition,
  TransactionType,
  Channel,
  HeuristicSignal,
  DatabaseState
} from './types';

// Deterministic PRNG (Mulberry32) for reproducible data generation
function createRng(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  'Avery', 'Morgan', 'Jordan', 'Taylor', 'Alex', 'Rowan', 'Casey', 'Riley', 'Cameron', 'Logan',
  'Devon', 'Jesse', 'Emerson', 'Finley', 'Hayden', 'Quinn', 'Reese', 'Skyler', 'Sydney', 'Kendall',
  'Dakota', 'Harley', 'Peyton', 'Sawyer', 'Eden', 'Elliot', 'Harper', 'Kai', 'River', 'Sage',
  'Adrian', 'Blair', 'Charlie', 'Drew', 'Ellis', 'Frankie', 'Glen', 'Hunter', 'Jamie', 'Kelly'
];

const LAST_NAMES = [
  'Vance', 'Sterling', 'Mercer', 'Blackwood', 'Sinclair', 'Chen', 'Osprey', 'Holloway', 'Monroe', 'Kovacs',
  'Aldridge', 'Bexley', 'Carrington', 'Davenport', 'Ellington', 'Fairfax', 'Garrison', 'Hawthorne', 'Ingram', 'Kingsley',
  'Lancaster', 'Montague', 'Norcross', 'Oakley', 'Prescott', 'Radcliffe', 'Summers', 'Thornton', 'Underwood', 'Vogel',
  'Winslow', 'York', 'Zimmerman', 'Ashford', 'Braddock', 'Corbett', 'Dunmore', 'Eldridge', 'Fulton', 'Gresham'
];

const BUSINESS_TYPES = [
  'Import-Export Trading Co.',
  'Logistics & Freight Services',
  'Real Estate Asset Management',
  'Precious Metals Brokerage',
  'Software Development Agency',
  'Digital Media Production',
  'Specialty Chemical Consulting',
  'Automotive Dealership Network',
  'Luxury Goods Wholesaler',
  'Medical Device Supply',
  'Independent Financial Advisory',
  'Commercial Construction Contracting',
  'Maritime Shipping Agency',
  'E-Commerce Retailer',
  'Hospitality Management Group'
];

const OCCUPATION_TYPES = [
  'Senior Corporate Counsel',
  'Consulting Geologist',
  'Private Wealth Manager',
  'Civil Engineering Contractor',
  'Commercial Pilot',
  'Medical Director',
  'Architectural Principal',
  'Software Engineering Director',
  'Supply Chain Executive',
  'International Trade Consultant'
];

const STANDARD_COUNTRIES = ['US', 'CA', 'GB', 'DE', 'FR', 'NL', 'SG', 'AU', 'JP', 'CH'];
const HIGH_RISK_COUNTRIES = ['KY', 'PA', 'VG', 'SC', 'VU', 'CY', 'BS', 'BZ'];

const ANALYSTS = [
  'Sarah Jenkins (Senior AML Investigator)',
  'Marcus Zhao (FIU Lead Analyst)',
  'Elena Rostova (Financial Crimes Specialist)',
  'David Kim (Risk Analytics Officer)',
  'Amara Okafor (Senior Fraud & AML Investigator)'
];

export function generateSyntheticDataset(seed = 424242): DatabaseState {
  const rng = createRng(seed);

  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const randInt = (min: number, max: number): number => Math.floor(rng() * (max - min + 1)) + min;
  const randFloat = (min: number, max: number): number => min + rng() * (max - min);

  // 1. Generate Exactly 500 Fictional Customers
  const customers: Record<string, Customer> = {};
  const customerList: Customer[] = [];

  for (let i = 1; i <= 500; i++) {
    const custId = `CUST-${String(i).padStart(3, '0')}`;
    const isBusiness = rng() > 0.45;
    const name = isBusiness
      ? `${pick(LAST_NAMES)} ${pick(['Global', 'Holdings', 'Capital', 'Ventures', 'Trading', 'Logistics', 'Enterprises'])} Ltd`
      : `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;

    // Risk tier distribution: ~10% Critical/High, 25% Medium, 65% Low
    const riskRoll = rng();
    const risk_tier: RiskTier =
      riskRoll < 0.05 ? 'CRITICAL' : riskRoll < 0.20 ? 'HIGH' : riskRoll < 0.45 ? 'MEDIUM' : 'LOW';

    // Onboarding dates between 2021 and 2025
    const year = randInt(2021, 2025);
    const month = String(randInt(1, 12)).padStart(2, '0');
    const day = String(randInt(1, 28)).padStart(2, '0');
    const onboarding_date = `${year}-${month}-${day}`;

    // Base income/revenue
    const monthly_income_or_revenue = isBusiness ? randInt(40000, 750000) : randInt(4000, 35000);

    const cust: Customer = {
      customer_id: custId,
      display_name: name,
      country: rng() < 0.88 ? pick(STANDARD_COUNTRIES) : pick(HIGH_RISK_COUNTRIES),
      onboarding_date,
      risk_tier,
      business_or_occupation_type: isBusiness ? pick(BUSINESS_TYPES) : pick(OCCUPATION_TYPES),
      monthly_income_or_revenue,
      synthetic_flag: true,
      total_transactions_count: 0,
      total_volume_usd: 0
    };

    customers[custId] = cust;
    customerList.push(cust);
  }

  // Define Suspicious Focus Customers (first 50 customers will have dedicated AML typologies and cases)
  // This guarantees high quality, traceable forensic data for cases CASE-001 to CASE-050.
  const suspiciousCustomers = customerList.slice(0, 50);

  // 2. Generate Exactly 100 AML Alerts
  // 50 cases will be created, linking these 100 alerts (1 to 3 alerts per case)
  const alerts: Record<string, Alert> = {};
  const alertList: Alert[] = [];

  const ALERT_TYPES: AlertType[] = [
    'STRUCTURING_RAPID_DEPOSITS',
    'VELOCITY_SPIKE',
    'HIGH_RISK_JURISDICTION',
    'PASS_THROUGH_LAYERING',
    'ROUND_AMOUNT_SURGE',
    'DORMANT_ACCOUNT_SUDDEN_FLOW'
  ];

  for (let a = 1; a <= 100; a++) {
    const alertId = `ALT-${String(a).padStart(3, '0')}`;
    // Link alerts to the 50 focus customers (2 alerts per focus customer on average)
    const targetCust = suspiciousCustomers[(a - 1) % 50];
    const alertType = ALERT_TYPES[(a - 1) % ALERT_TYPES.length];

    // Priority based on type and customer risk
    const priority: AlertPriority =
      a % 4 === 0 ? 'CRITICAL' : a % 3 === 0 ? 'HIGH' : a % 2 === 0 ? 'MEDIUM' : 'LOW';

    const riskScore =
      priority === 'CRITICAL' ? randInt(85, 98) :
      priority === 'HIGH' ? randInt(70, 84) :
      priority === 'MEDIUM' ? randInt(50, 69) : randInt(25, 49);

    const alertDate = new Date(Date.UTC(2026, 4, 1 + (a % 28), randInt(8, 20), randInt(0, 59))).toISOString();

    const signals: HeuristicSignal[] = [
      {
        signal_id: `SIG-${alertId}-1`,
        code: `${alertType}_THRESHOLD_EXCEEDED`,
        label: `${alertType.replace(/_/g, ' ')} detected`,
        description: `Triggered deterministic heuristic threshold for ${targetCust.display_name}.`,
        severity: priority,
        score_contribution: Math.floor(riskScore * 0.6),
        evidence_references: []
      },
      {
        signal_id: `SIG-${alertId}-2`,
        code: `HISTORICAL_BASELINE_DEVIATION`,
        label: 'Historical Activity Deviation',
        description: `Observed transaction pattern deviates by 3.8 standard deviations from 90-day baseline.`,
        severity: priority === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
        score_contribution: Math.floor(riskScore * 0.4),
        evidence_references: []
      }
    ];

    const alertObj: Alert = {
      alert_id: alertId,
      customer_id: targetCust.customer_id,
      created_at: alertDate,
      alert_type: alertType,
      risk_score: riskScore,
      priority,
      status: a <= 60 ? 'OPEN' : a <= 85 ? 'INVESTIGATING' : 'CLOSED',
      assigned_analyst: ANALYSTS[(a - 1) % ANALYSTS.length],
      explanation_of_heuristic_signals: `Automated detection trigger on ${targetCust.display_name}: Heuristic detection indicates ${alertType.toLowerCase().replace(/_/g, ' ')}. Baseline volume exceeded significantly.`,
      signals
    };

    alerts[alertId] = alertObj;
    alertList.push(alertObj);
  }

  // 3. Generate Exactly 50 Investigation Cases
  // Each case maps to one of the 50 focus customers, linking 1-3 alerts
  const cases: Record<string, Case> = {};
  const caseList: Case[] = [];
  const auditEvents: AuditEvent[] = [];

  for (let c = 1; c <= 50; c++) {
    const caseId = `CASE-${String(c).padStart(3, '0')}`;
    const cust = suspiciousCustomers[c - 1];

    // Link alerts: alert c and (if c <= 50) alert c+50
    const linkedAlertIds = [`ALT-${String(c).padStart(3, '0')}`];
    if (c + 50 <= 100) {
      linkedAlertIds.push(`ALT-${String(c + 50).padStart(3, '0')}`);
    }

    // Attach case_id to alerts
    for (const aId of linkedAlertIds) {
      if (alerts[aId]) {
        alerts[aId].case_id = caseId;
      }
    }

    const linkedAlertObjects = linkedAlertIds.map((id) => alerts[id]).filter(Boolean);
    const avgRiskScore = Math.round(
      linkedAlertObjects.reduce((acc, curr) => acc + curr.risk_score, 0) / linkedAlertObjects.length
    );

    const highestPriority = linkedAlertObjects.some((a) => a.priority === 'CRITICAL')
      ? 'CRITICAL'
      : linkedAlertObjects.some((a) => a.priority === 'HIGH')
      ? 'HIGH'
      : linkedAlertObjects.some((a) => a.priority === 'MEDIUM')
      ? 'MEDIUM'
      : 'LOW';

    const caseStatus: CaseStatus =
      c <= 15 ? 'NEW' : c <= 35 ? 'IN_REVIEW' : c <= 45 ? 'ESCALATED' : 'CLOSED';

    const disposition: CaseDisposition =
      caseStatus === 'CLOSED' ? 'NO_SUSPICIOUS_ACTIVITY' :
      caseStatus === 'ESCALATED' ? 'ESCALATED_FOR_FURTHER_REVIEW' : 'UNDETERMINED';

    const createdAt = linkedAlertObjects[0].created_at;
    const updatedAt = new Date(new Date(createdAt).getTime() + 1000 * 3600 * randInt(4, 72)).toISOString();

    const analyst = linkedAlertObjects[0].assigned_analyst;

    const caseObj: Case = {
      case_id: caseId,
      customer_id: cust.customer_id,
      alert_ids: linkedAlertIds,
      created_at: createdAt,
      updated_at: updatedAt,
      priority: highestPriority,
      status: caseStatus,
      analyst_notes: `Initial triage commenced for ${cust.display_name}. Identified ${linkedAlertIds.length} linked alert(s) highlighting ${linkedAlertObjects.map((a) => a.alert_type).join(' & ')}. Reviewing counterparty flows and origin of funds.`,
      disposition,
      rationale:
        disposition === 'ESCALATED_FOR_FURTHER_REVIEW'
          ? 'Multiple rapid cross-border wires into shell counterparties lacking verifiable commercial contracts. SAR filing recommended.'
          : disposition === 'NO_SUSPICIOUS_ACTIVITY'
          ? 'Counterparty verified as legitimate corporate affiliate with audited commercial supply invoices. Activity aligns with seasonal inventory replenishment.'
          : '',
      assigned_analyst: analyst,
      risk_score: avgRiskScore
    };

    cases[caseId] = caseObj;
    caseList.push(caseObj);

    // Initial audit event: CASE_CREATED
    auditEvents.push({
      event_id: `AUD-${caseId}-001`,
      case_id: caseId,
      event_type: 'CASE_CREATED',
      actor: 'System / Automated Triage Rule Engine',
      previous_value: 'N/A',
      new_value: `Created case ${caseId} with status ${caseStatus} for ${cust.display_name}`,
      rationale: `Automated case compilation from alerts ${linkedAlertIds.join(', ')}`,
      timestamp: createdAt
    });

    if (caseStatus !== 'NEW') {
      auditEvents.push({
        event_id: `AUD-${caseId}-002`,
        case_id: caseId,
        event_type: 'STATUS_UPDATED',
        actor: analyst,
        previous_value: 'NEW',
        new_value: caseStatus,
        rationale: 'Analyst assigned and case investigation lifecycle initiated.',
        timestamp: updatedAt
      });
    }

    if (disposition !== 'UNDETERMINED') {
      auditEvents.push({
        event_id: `AUD-${caseId}-003`,
        case_id: caseId,
        event_type: 'DISPOSITION_UPDATED',
        actor: analyst,
        previous_value: 'UNDETERMINED',
        new_value: disposition,
        rationale: caseObj.rationale || 'Analyst disposition formal review completed.',
        timestamp: updatedAt
      });
    }
  }

  // 4. Generate Exactly 5,000 Fictional Transactions
  // We allocate ~1,500 transactions directly to the 50 focus/case customers (30 per case customer)
  // and distribute the remaining 3,500 across all 500 customers.
  const transactions: Record<string, Transaction> = {};
  let txIndex = 1;

  // Counterparty templates
  const COUNTERPARTIES = [
    { id: 'CP-ALPHA-01', name: 'Apex Zenith Global Ltd', country: 'KY' },
    { id: 'CP-BETA-02', name: 'Pacific Trade Nexus Pte', country: 'SG' },
    { id: 'CP-GAMMA-03', name: 'Vanguard Cargo Logistics B.V.', country: 'NL' },
    { id: 'CP-DELTA-04', name: 'Bexley Commodity Brokers LLC', country: 'US' },
    { id: 'CP-EPSILON-05', name: 'St. George Offshore Trustee Corp', country: 'VG' },
    { id: 'CP-ZETA-06', name: 'Zurich Private Settlement AG', country: 'CH' },
    { id: 'CP-ETA-07', name: 'Panama Horizon Maritime S.A.', country: 'PA' },
    { id: 'CP-THETA-08', name: 'Cyprus Meridian Capital Ltd', country: 'CY' },
    { id: 'CP-IOTA-09', name: 'London Commercial Factoring Plc', country: 'GB' },
    { id: 'CP-KAPPA-10', name: 'Seychelles Trade Gateway Ltd', country: 'SC' },
    { id: 'CP-LAMBDA-11', name: 'Tokyo Precision Instruments K.K.', country: 'JP' },
    { id: 'CP-MU-12', name: 'Frankfurt Industrial Parts GmbH', country: 'DE' }
  ];

  // Helper to create a transaction
  function createTx(
    customerId: string,
    amount: number,
    type: TransactionType,
    channel: Channel,
    dateIso: string,
    cp: { id: string; name: string; country: string },
    alertId?: string,
    caseId?: string
  ): Transaction {
    const txId = `TX-${String(txIndex).padStart(4, '0')}`;
    txIndex++;

    const isFlagged = Boolean(alertId || amount > 50000 || HIGH_RISK_COUNTRIES.includes(cp.country));
    const tx: Transaction = {
      transaction_id: txId,
      customer_id: customerId,
      timestamp: dateIso,
      amount: Math.round(amount * 100) / 100,
      currency: 'USD',
      amount_usd: Math.round(amount * 100) / 100,
      transaction_type: type,
      channel,
      counterparty_id: cp.id,
      counterparty_name: cp.name,
      counterparty_country: cp.country,
      status: isFlagged ? 'FLAGGED' : 'COMPLETED',
      alert_id: alertId,
      case_id: caseId
    };

    // Update customer stats
    const cust = customers[customerId];
    if (cust) {
      cust.total_transactions_count = (cust.total_transactions_count || 0) + 1;
      cust.total_volume_usd = Math.round(((cust.total_volume_usd || 0) + tx.amount_usd) * 100) / 100;
    }

    return tx;
  }

  // Phase A: Generate forensic transactions for the 50 case customers (Exactly 1,500 transactions: 30 per case customer)
  for (let c = 0; c < 50; c++) {
    const caseObj = caseList[c];
    const cust = customers[caseObj.customer_id];
    const primaryAlert = alerts[caseObj.alert_ids[0]];
    const baseTime = new Date(caseObj.created_at).getTime();

    // Generate 30 transactions for this case customer
    for (let t = 0; t < 30; t++) {
      let amount = 0;
      let type: TransactionType = 'WIRE_TRANSFER';
      let channel: Channel = 'ONLINE_BANKING';
      let cp = pick(COUNTERPARTIES);

      // Distribute time around case alert date (some prior baseline, some during alert burst)
      const offsetHours = t < 10 ? -24 * (10 - t) : (t - 10) * 3;
      const txTime = new Date(baseTime + offsetHours * 3600 * 1000).toISOString();

      // Implement specific typology heuristics for suspicious burst
      if (t >= 10 && t <= 18) {
        if (primaryAlert.alert_type === 'STRUCTURING_RAPID_DEPOSITS') {
          // Cash/wire just below $10,000 threshold
          amount = randFloat(9200, 9950);
          type = rng() > 0.5 ? 'CASH_DEPOSIT' : 'WIRE_TRANSFER';
          channel = type === 'CASH_DEPOSIT' ? 'BRANCH' : 'ONLINE_BANKING';
        } else if (primaryAlert.alert_type === 'ROUND_AMOUNT_SURGE') {
          amount = pick([50000, 100000, 150000, 250000]);
          type = 'WIRE_TRANSFER';
          channel = 'ONLINE_BANKING';
        } else if (primaryAlert.alert_type === 'HIGH_RISK_JURISDICTION') {
          amount = randFloat(45000, 220000);
          type = 'WIRE_TRANSFER';
          channel = 'SWIFT';
          cp = pick(COUNTERPARTIES.filter((x) => HIGH_RISK_COUNTRIES.includes(x.country)));
        } else if (primaryAlert.alert_type === 'PASS_THROUGH_LAYERING') {
          // High incoming followed by outgoing
          amount = t % 2 === 0 ? randFloat(120000, 180000) : randFloat(55000, 85000);
          type = 'WIRE_TRANSFER';
          channel = 'SWIFT';
        } else {
          // Velocity spike
          amount = randFloat(25000, 95000);
          type = 'WIRE_TRANSFER';
          channel = 'ONLINE_BANKING';
        }
      } else {
        // Normal baseline transactions
        amount = randFloat(1200, 14000);
        type = pick(['ACH_PAYMENT', 'WIRE_TRANSFER', 'CARD_PURCHASE', 'CASH_DEPOSIT']);
        channel = pick(['ONLINE_BANKING', 'BRANCH', 'ATM', 'API']);
      }

      const linkedAlertId = t >= 10 && t <= 18 ? primaryAlert.alert_id : undefined;
      const tx = createTx(
        cust.customer_id,
        amount,
        type,
        channel,
        txTime,
        cp,
        linkedAlertId,
        caseObj.case_id
      );
      transactions[tx.transaction_id] = tx;

      // Link evidence reference
      if (linkedAlertId && primaryAlert.signals[0]) {
        primaryAlert.signals[0].evidence_references.push(tx.transaction_id);
      }
    }
  }

  // Phase B: Generate remaining 3,500 transactions (5,000 - 1,500 = 3,500)
  // Distributed across all 500 customers (7 transactions each on average)
  const remainingCount = 5000 - (txIndex - 1);
  for (let i = 0; i < remainingCount; i++) {
    const cust = customerList[i % 500];
    const dayOffset = randInt(1, 150);
    const hour = randInt(0, 23);
    const minute = randInt(0, 59);
    const txTime = new Date(Date.UTC(2026, 0, 15) + dayOffset * 86400000 + (hour * 3600 + minute * 60) * 1000).toISOString();

    const amount = cust.monthly_income_or_revenue
      ? randFloat(150, cust.monthly_income_or_revenue * 0.15)
      : randFloat(100, 4500);

    const type = pick<TransactionType>(['ACH_PAYMENT', 'CARD_PURCHASE', 'WIRE_TRANSFER', 'CASH_WITHDRAWAL', 'CASH_DEPOSIT']);
    const channel = pick<Channel>(['ONLINE_BANKING', 'BRANCH', 'ATM', 'API', 'SWIFT']);
    const cp = pick(COUNTERPARTIES);

    const tx = createTx(cust.customer_id, amount, type, channel, txTime, cp);
    transactions[tx.transaction_id] = tx;
  }

  return {
    version: '1.0.0',
    seeded_at: new Date().toISOString(),
    customers,
    transactions,
    alerts,
    cases,
    audit_events: auditEvents,
    ai_runs: [],
    evaluations: []
  };
}
