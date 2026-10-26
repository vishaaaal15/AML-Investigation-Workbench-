import PDFDocument from 'pdfkit';
import { db } from '../server/store.ts';
import { detectCaseHeuristics } from './heuristics';

export async function generateCasePdf(caseId: string): Promise<Buffer> {
  const caseData = db.getCaseById(caseId);
  if (!caseData) {
    throw new Error(`Case ${caseId} not found.`);
  }

  const { caseObj, customer, alerts, transactions, auditEvents, recentAiRuns } = caseData;
  const heuristics = detectCaseHeuristics(caseObj, customer, transactions);
  const latestAiRun = recentAiRuns.length > 0 ? recentAiRuns[0] : null;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: `AML Investigation Dossier - ${caseId}`,
        Author: 'AML Investigation Workbench',
        Subject: `Financial Crime Case Dossier for ${customer.display_name}`
      }
    });

    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });
    doc.on('error', reject);

    // Color palette
    const navy = '#0f172a';
    const slate = '#334155';
    const muted = '#64748b';
    const border = '#cbd5e1';
    const crimson = '#991b1b';
    const amber = '#b45309';
    const emerald = '#065f46';

    // Header Banner
    doc
      .rect(40, 40, doc.page.width - 80, 56)
      .fill('#0f172a');

    doc
      .fillColor('#ffffff')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('AML INVESTIGATION WORKBENCH', 55, 52);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#94a3b8')
      .text('CONFIDENTIAL FINANCIAL CRIME INTELLIGENCE DOSSIER — SYNTHETIC DATA ONLY', 55, 72);

    // Disclaimer pill
    doc
      .rect(doc.page.width - 240, 52, 185, 28)
      .fill('#1e293b');
    doc
      .fillColor('#f59e0b')
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .text('PORTFOLIO DEMO — SYNTHETIC DATA', doc.page.width - 232, 58);
    doc
      .fillColor('#cbd5e1')
      .fontSize(7)
      .font('Helvetica')
      .text(`Generated: ${new Date().toISOString().substring(0, 19)}Z`, doc.page.width - 232, 68);

    doc.moveDown(3.5);

    // Case Overview Box
    let y = 115;
    doc
      .rect(40, y, doc.page.width - 80, 75)
      .fillAndStroke('#f8fafc', border);

    doc
      .fillColor(navy)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(`Case Reference: ${caseObj.case_id}`, 55, y + 12);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(slate)
      .text(`Customer: ${customer.display_name} (${customer.customer_id})`, 55, y + 32)
      .text(`Country: ${customer.country} | Risk Tier: ${customer.risk_tier} | Business: ${customer.business_or_occupation_type}`, 55, y + 46)
      .text(`Status: ${caseObj.status} | Priority: ${caseObj.priority} | Lead Analyst: ${caseObj.assigned_analyst}`, 55, y + 60);

    // Right column in overview
    doc
      .font('Helvetica-Bold')
      .fillColor(
        caseObj.disposition === 'ESCALATED_FOR_FURTHER_REVIEW'
          ? crimson
          : caseObj.disposition === 'NO_SUSPICIOUS_ACTIVITY'
          ? emerald
          : amber
      )
      .text(`Disposition: ${caseObj.disposition.replace(/_/g, ' ')}`, doc.page.width - 280, y + 12);

    doc
      .font('Helvetica')
      .fillColor(slate)
      .text(`Heuristic Risk Score: ${heuristics.overall_score}/100 (${heuristics.risk_category})`, doc.page.width - 280, y + 32)
      .text(`Linked Alerts: ${alerts.length} alert(s)`, doc.page.width - 280, y + 46)
      .text(`Total Case Transactions: ${transactions.length} record(s)`, doc.page.width - 280, y + 60);

    y += 90;

    // Section 1: Linked AML Alerts
    doc.fillColor(navy).fontSize(11).font('Helvetica-Bold').text('1. LINKED REGULATORY & HEURISTIC ALERTS', 40, y);
    y += 18;

    for (const alt of alerts) {
      doc.rect(40, y, doc.page.width - 80, 36).fillAndStroke('#f1f5f9', border);
      doc
        .fillColor(navy)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`[${alt.alert_id}] ${alt.alert_type.replace(/_/g, ' ')} — Priority: ${alt.priority} (Score: ${alt.risk_score})`, 50, y + 8);
      doc
        .fillColor(slate)
        .fontSize(8)
        .font('Helvetica')
        .text(alt.explanation_of_heuristic_signals, 50, y + 20, { width: doc.page.width - 100 });
      y += 44;
    }

    y += 10;

    // Section 2: Deterministic AML Forensics & Heuristics
    doc.fillColor(navy).fontSize(11).font('Helvetica-Bold').text('2. DETERMINISTIC HEURISTIC SIGNALS', 40, y);
    y += 18;

    doc.rect(40, y, doc.page.width - 80, 48).fillAndStroke('#f8fafc', border);
    doc
      .fillColor(slate)
      .fontSize(8.5)
      .font('Helvetica')
      .text(`• Velocity 24h Peak: ${heuristics.velocity_metrics.rolling_24h_count} transactions ($${heuristics.velocity_metrics.rolling_24h_volume.toLocaleString()} USD) — ${heuristics.velocity_metrics.velocity_ratio_vs_baseline}x baseline`, 50, y + 8)
      .text(`• Amount Deviation: Z-Score ${heuristics.deviation_metrics.z_score} (Burst Avg: $${heuristics.deviation_metrics.burst_avg_amount.toLocaleString()} vs Baseline Avg: $${heuristics.deviation_metrics.baseline_avg_amount.toLocaleString()})`, 50, y + 20)
      .text(`• Structuring Threshold Alert ($9k-$10k): ${heuristics.structuring_detected ? 'POSITIVE — Cluster identified' : 'Negative'} | High-Risk Corridors: ${heuristics.high_risk_jurisdictions.join(', ') || 'None'}`, 50, y + 32);

    y += 65;

    // Section 3: Material Transaction Evidence Sample
    doc.fillColor(navy).fontSize(11).font('Helvetica-Bold').text('3. MATERIAL TRANSACTION EVIDENCE (TOP SAMPLES)', 40, y);
    y += 18;

    // Table Header
    doc.rect(40, y, doc.page.width - 80, 16).fill('#1e293b');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    doc.text('TX ID', 45, y + 4);
    doc.text('DATE/TIME', 110, y + 4);
    doc.text('AMOUNT (USD)', 220, y + 4);
    doc.text('TYPE / CHANNEL', 310, y + 4);
    doc.text('COUNTERPARTY', 420, y + 4);
    y += 18;

    const sampleTxs = transactions.slice(0, 7);
    for (const tx of sampleTxs) {
      doc.rect(40, y, doc.page.width - 80, 15).fillAndStroke(y % 30 === 0 ? '#f8fafc' : '#ffffff', '#e2e8f0');
      doc.fillColor(slate).fontSize(7.5).font('Helvetica');
      doc.text(tx.transaction_id, 45, y + 3);
      doc.text(tx.timestamp.substring(0, 16).replace('T', ' '), 110, y + 3);
      doc.text(`$${tx.amount_usd.toLocaleString()}`, 220, y + 3);
      doc.text(`${tx.transaction_type} (${tx.channel})`, 310, y + 3);
      doc.text(`${tx.counterparty_name} [${tx.counterparty_country}]`, 420, y + 3, { width: 130 });
      y += 16;
    }

    y += 20;

    // Page 2 or Section 4: AI Assisted Investigation Findings
    if (y > doc.page.height - 200) {
      doc.addPage();
      y = 50;
    }

    doc
      .fillColor(navy)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('4. AI INVESTIGATION ASSISTANT FINDINGS (CITATIONS & ANALYSIS)', 40, y);
    y += 18;

    if (latestAiRun && latestAiRun.structured_output) {
      const out = latestAiRun.structured_output;
      const validCitations = latestAiRun.citations_validation?.valid_citations || 0;
      const totalCitations = latestAiRun.citations_validation?.total_citations || 0;
      const summaryText = out.case_summary || (out as any).summary?.overview || 'Investigation analysis completed.';

      doc.rect(40, y, doc.page.width - 80, 110).fillAndStroke('#f0fdf4', border);
      doc
        .fillColor(emerald)
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text(`Evidence-Grounded Analysis (Model: ${latestAiRun.model} | Verified Citations: ${validCitations}/${totalCitations})`, 50, y + 8);

      doc
        .fillColor(slate)
        .fontSize(8)
        .font('Helvetica')
        .text(`Summary: ${summaryText}`, 50, y + 22, { width: doc.page.width - 100 })
        .moveDown(0.3);

      const rawFacts = out.observed_facts || (out as any).factual_findings || [];
      const factsList = Array.isArray(rawFacts) ? rawFacts : [];
      const factsText = factsList.slice(0, 3).map((f: any) => {
        const text = f.fact || f.observation || String(f);
        const ids = f.evidence_ids || f.supporting_evidence || [];
        return `• ${text} [Citing: ${Array.isArray(ids) ? ids.join(', ') : ids}]`;
      }).join('\n') || '• No specific factual claims recorded.';

      doc.text(`Observed Objective Facts:\n${factsText}`, 50, y + 54, { width: doc.page.width - 100 });

      y += 125;
    } else {
      doc.rect(40, y, doc.page.width - 80, 36).fillAndStroke('#f8fafc', border);
      doc
        .fillColor(muted)
        .fontSize(8.5)
        .font('Helvetica-Oblique')
        .text('No AI investigation run has been recorded for this case yet. To execute an evidence-scoped analysis, open the Case Workspace in the platform.', 50, y + 12);
      y += 50;
    }

    // Section 5: Human Analyst Notes & Disposition
    doc.fillColor(navy).fontSize(11).font('Helvetica-Bold').text('5. HUMAN ANALYST DISPOSITION & GOVERNANCE', 40, y);
    y += 18;

    doc.rect(40, y, doc.page.width - 80, 65).fillAndStroke('#f8fafc', border);
    doc
      .fillColor(navy)
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .text(`Formal Disposition: ${caseObj.disposition.replace(/_/g, ' ')}`, 50, y + 8);

    doc
      .fillColor(slate)
      .fontSize(8)
      .font('Helvetica')
      .text(`Analyst Rationale: ${caseObj.rationale || 'Pending formal review statement.'}`, 50, y + 20, { width: doc.page.width - 100 })
      .text(`Investigator Notes: ${caseObj.analyst_notes}`, 50, y + 42, { width: doc.page.width - 100 });

    y += 80;

    // Section 6: Audit Trail
    if (y > doc.page.height - 150) {
      doc.addPage();
      y = 50;
    }

    doc.fillColor(navy).fontSize(11).font('Helvetica-Bold').text('6. IMMUTABLE AUDIT TRAIL', 40, y);
    y += 18;

    for (const ev of auditEvents.slice(0, 5)) {
      doc
        .fillColor(muted)
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .text(`${ev.timestamp.substring(0, 19).replace('T', ' ')}Z | ${ev.event_type} | Actor: ${ev.actor}`, 40, y);
      doc
        .fillColor(slate)
        .fontSize(7.5)
        .font('Helvetica')
        .text(`Value: ${ev.new_value} — Rationale: ${ev.rationale}`, 40, y + 10, { width: doc.page.width - 80 });
      y += 24;
    }

    // Document footer
    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor(muted)
      .text(
        'CONFIDENTIAL & SYNTHETIC ONLY — This document was produced by AML Investigation Workbench portfolio project. Fictional entities only. Not an actual SAR or bank filing.',
        40,
        doc.page.height - 30,
        { align: 'center', width: doc.page.width - 80 }
      );

    doc.end();
  });
}
