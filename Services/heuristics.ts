import { Transaction, Customer, Case } from '../db/types';
import { db } from '../server/store.ts';

export interface HeuristicBreakdown {
  overall_score: number;
  risk_category: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  signals: Array<{
    code: string;
    label: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    weight: number;
    score: number;
    evidence_ids: string[];
  }>;
  velocity_metrics: {
    rolling_24h_count: number;
    rolling_24h_volume: number;
    velocity_ratio_vs_baseline: number;
  };
  deviation_metrics: {
    baseline_avg_amount: number;
    burst_avg_amount: number;
    z_score: number;
  };
  structuring_detected: boolean;
  high_risk_jurisdictions: string[];
}

const HIGH_RISK_JURISDICTIONS = new Set(['KY', 'PA', 'VG', 'SC', 'VU', 'CY', 'BS', 'BZ']);

export function calculateVelocityMetrics(caseTransactions: Transaction[], windowHours = 24) {
  if (caseTransactions.length === 0) {
    return { rolling_24h_count: 0, rolling_24h_volume: 0, velocity_ratio_vs_baseline: 1.0 };
  }

  // Sort chronologically
  const sorted = [...caseTransactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Peak 24h window
  let maxCount = 0;
  let maxVol = 0;
  const windowMs = windowHours * 3600 * 1000;

  for (let i = 0; i < sorted.length; i++) {
    const startMs = new Date(sorted[i].timestamp).getTime();
    let count = 0;
    let vol = 0;
    for (let j = i; j < sorted.length; j++) {
      const curMs = new Date(sorted[j].timestamp).getTime();
      if (curMs - startMs <= windowMs) {
        count++;
        vol += sorted[j].amount_usd;
      } else {
        break;
      }
    }
    if (count > maxCount) {
      maxCount = count;
      maxVol = vol;
    }
  }

  // Baseline average count per 24 hours
  const firstMs = new Date(sorted[0].timestamp).getTime();
  const lastMs = new Date(sorted[sorted.length - 1].timestamp).getTime();
  const totalDays = Math.max(1, (lastMs - firstMs) / (86400 * 1000));
  const baselineCountPer24h = sorted.length / totalDays;
  const ratio = baselineCountPer24h > 0 ? maxCount / baselineCountPer24h : 1.0;

  return {
    rolling_24h_count: maxCount,
    rolling_24h_volume: Math.round(maxVol),
    velocity_ratio_vs_baseline: Math.round(ratio * 10) / 10
  };
}

export function calculateDeviationMetrics(caseTransactions: Transaction[]) {
  if (caseTransactions.length < 2) {
    return { baseline_avg_amount: 0, burst_avg_amount: 0, z_score: 0 };
  }

  const amounts = caseTransactions.map((t) => t.amount_usd);
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance = amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  // Identify top quartile amounts vs bottom half
  const sortedAmounts = [...amounts].sort((a, b) => a - b);
  const baselineSlice = sortedAmounts.slice(0, Math.floor(sortedAmounts.length * 0.7));
  const burstSlice = sortedAmounts.slice(Math.floor(sortedAmounts.length * 0.7));

  const baselineMean = baselineSlice.reduce((a, b) => a + b, 0) / Math.max(1, baselineSlice.length);
  const burstMean = burstSlice.reduce((a, b) => a + b, 0) / Math.max(1, burstSlice.length);

  const zScore = stdDev > 0 ? (burstMean - baselineMean) / stdDev : 0;

  return {
    baseline_avg_amount: Math.round(baselineMean),
    burst_avg_amount: Math.round(burstMean),
    z_score: Math.round(zScore * 10) / 10
  };
}

export function detectCaseHeuristics(caseObj: Case, customer: Customer, transactions: Transaction[]): HeuristicBreakdown {
  const signals: HeuristicBreakdown['signals'] = [];
  const velocity = calculateVelocityMetrics(transactions, 24);
  const deviation = calculateDeviationMetrics(transactions);

  // 1. Velocity spike check
  if (velocity.velocity_ratio_vs_baseline >= 3.0) {
    const burstTxs = transactions
      .slice(0, 10)
      .map((t) => t.transaction_id);

    signals.push({
      code: 'VELOCITY_BURST_EXCEEDED',
      label: 'Unusual Transaction Velocity Spike',
      description: `Observed ${velocity.rolling_24h_count} transactions within 24 hours (${velocity.velocity_ratio_vs_baseline}x baseline frequency).`,
      severity: velocity.velocity_ratio_vs_baseline > 5 ? 'CRITICAL' : 'HIGH',
      weight: 25,
      score: Math.min(25, Math.round(velocity.velocity_ratio_vs_baseline * 4)),
      evidence_ids: burstTxs
    });
  }

  // 2. Amount Deviation / Baseline Outlier check
  if (deviation.z_score >= 2.0) {
    const outlierTxs = transactions
      .filter((t) => t.amount_usd >= deviation.burst_avg_amount * 0.8)
      .map((t) => t.transaction_id);

    signals.push({
      code: 'AMOUNT_DEVIATION_OUTLIER',
      label: 'Statistical Outlier in Transaction Amounts',
      description: `Burst transactions average $${deviation.burst_avg_amount.toLocaleString()} vs customer baseline $${deviation.baseline_avg_amount.toLocaleString()} (z-score: ${deviation.z_score}).`,
      severity: deviation.z_score > 3 ? 'CRITICAL' : 'HIGH',
      weight: 25,
      score: Math.min(25, Math.round(deviation.z_score * 7)),
      evidence_ids: outlierTxs
    });
  }

  // 3. Structuring / Smurfing Threshold Check ($9,000 - $9,999)
  const structuringTxs = transactions.filter(
    (t) => t.amount_usd >= 9000 && t.amount_usd <= 9999
  );
  const structuringDetected = structuringTxs.length >= 2;

  if (structuringDetected) {
    signals.push({
      code: 'STRUCTURING_UNDER_REPORTING_LIMIT',
      label: 'Structuring Near CTR Regulatory Threshold',
      description: `Detected ${structuringTxs.length} transactions deliberately just below the $10,000 Currency Transaction Reporting threshold.`,
      severity: 'CRITICAL',
      weight: 30,
      score: 30,
      evidence_ids: structuringTxs.map((t) => t.transaction_id)
    });
  }

  // 4. High Risk Jurisdiction Check
  const highRiskTxs = transactions.filter((t) =>
    HIGH_RISK_JURISDICTIONS.has(t.counterparty_country)
  );
  const highRiskCountries = Array.from(new Set(highRiskTxs.map((t) => t.counterparty_country)));

  if (highRiskTxs.length > 0) {
    signals.push({
      code: 'HIGH_RISK_JURISDICTION_EXPOSURE',
      label: 'High-Risk / Offshore Jurisdiction Flow',
      description: `Transactions routed to or from FATF-monitored / offshore jurisdictions: ${highRiskCountries.join(', ')}.`,
      severity: highRiskTxs.length >= 3 ? 'HIGH' : 'MEDIUM',
      weight: 20,
      score: Math.min(20, highRiskTxs.length * 6),
      evidence_ids: highRiskTxs.map((t) => t.transaction_id)
    });
  }

  // Calculate composite score
  const totalScore = Math.min(
    100,
    Math.max(15, signals.reduce((acc, s) => acc + s.score, 0))
  );

  const risk_category: HeuristicBreakdown['risk_category'] =
    totalScore >= 80 ? 'CRITICAL' : totalScore >= 60 ? 'HIGH' : totalScore >= 40 ? 'MEDIUM' : 'LOW';

  return {
    overall_score: totalScore,
    risk_category,
    signals,
    velocity_metrics: velocity,
    deviation_metrics: deviation,
    structuring_detected: structuringDetected,
    high_risk_jurisdictions: highRiskCountries
  };
}
