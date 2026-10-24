import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../db/store';
import { AIRun, AIInvestigationReport, AIRunCitation } from '../db/types';
import { CaseScopedToolRouter } from './tools';
import { detectCaseHeuristics } from './heuristics';

const DEFAULT_MODEL = 'gemini-3.8-flash';
const PROMPT_VERSION = 'v1.4.0-structured-aml-evidence';

// Cost parameters for Gemini 3.8 Flash (USD per token)
// Input: $0.15 / 1,000,000 tokens
// Output: $0.60 / 1,000,000 tokens
const COST_PER_INPUT_TOKEN = 0.15 / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 0.60 / 1_000_000;

export function getGeminiConfigStatus(): {
  is_configured: boolean;
  model: string;
  provider: string;
  message: string;
} {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return {
      is_configured: false,
      model: DEFAULT_MODEL,
      provider: 'google-genai',
      message: 'GEMINI_API_KEY environment secret is not configured in Settings > Secrets. AI investigation requests will be blocked with an informative configuration prompt.'
    };
  }

  return {
    is_configured: true,
    model: DEFAULT_MODEL,
    provider: 'google-genai',
    message: `Gemini server SDK configured using ${DEFAULT_MODEL}.`
  };
}

export class GeminiInvestigationService {
  private ai: GoogleGenAI | null = null;
  private modelName: string;

  constructor(model = DEFAULT_MODEL) {
    this.modelName = model;
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '') {
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    }
  }

  public async runCaseInvestigation(caseId: string, analystPromptOverride?: string): Promise<AIRun> {
    const startedAt = new Date().toISOString();
    const startTimeMs = Date.now();
    const runId = `RUN-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Verify API key availability
    if (!this.ai) {
      const latencyMs = Date.now() - startTimeMs;
      const failedRun: AIRun = {
        run_id: runId,
        case_id: caseId,
        provider: 'google-genai',
        model: this.modelName,
        prompt_version: PROMPT_VERSION,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        latency_ms: latencyMs,
        success: false,
        error: 'GEMINI_API_KEY is not configured on the server. Please attach a valid Gemini API key in the AI Studio Secrets panel.',
        tool_invocations: [],
        citations_validation: {
          total_citations: 0,
          valid_citations: 0,
          invalid_citations: [],
          citations: []
        },
        retry_count: 0
      };
      db.recordAiRun(failedRun);
      return failedRun;
    }

    // Load case evidence and instantiate scoped tool router
    const caseData = db.getCaseById(caseId);
    if (!caseData) {
      throw new Error(`Case ${caseId} does not exist.`);
    }

    const { caseObj, customer, alerts, transactions } = caseData;
    const toolRouter = new CaseScopedToolRouter(caseId);
    const evidenceList = toolRouter.getEvidenceBundleList();
    const evidenceMap = toolRouter.getEvidenceBundleMap();

    // Compute deterministic heuristics
    const heuristicProfile = detectCaseHeuristics(caseObj, customer, transactions);

    // Track tool invocations for audit and transparency
    const toolInvocations: AIRun['tool_invocations'] = [
      {
        tool_name: 'get_case_summary',
        arguments: { case_id: caseId },
        result_summary: `Loaded case ${caseId} for customer ${customer.display_name} (${customer.customer_id}). Priority: ${caseObj.priority}`,
        executed_at: new Date().toISOString()
      },
      {
        tool_name: 'calculate_transaction_velocity',
        arguments: { case_id: caseId, time_window_hours: 24 },
        result_summary: `Rolling 24h count: ${heuristicProfile.velocity_metrics.rolling_24h_count}, ratio: ${heuristicProfile.velocity_metrics.velocity_ratio_vs_baseline}x baseline`,
        executed_at: new Date().toISOString()
      },
      {
        tool_name: 'calculate_amount_deviation',
        arguments: { case_id: caseId },
        result_summary: `Baseline avg: $${heuristicProfile.deviation_metrics.baseline_avg_amount}, Burst avg: $${heuristicProfile.deviation_metrics.burst_avg_amount}, Z-Score: ${heuristicProfile.deviation_metrics.z_score}`,
        executed_at: new Date().toISOString()
      }
    ];

    // Build compact evidence bundle string for Gemini
    const evidencePromptBundle = evidenceList.map((e) => `[EVIDENCE ${e.evidence_id}]: ${e.summary}`).join('\n');

    const systemInstruction = `You are a specialized Senior Financial Crime Investigation AI Assistant assisting human AML analysts.
CRITICAL OPERATIONAL RULES:
1. You are advising a human investigator. NEVER make definitive legal accusations or conclusions of guilt. Never close or alter case dispositions automatically.
2. Every material factual claim MUST cite one or more valid Evidence IDs from the supplied evidence bundle (e.g. "CUST-001", "TX-0042", "ALT-003", "SIG-ALT-003-1").
3. Strictly distinguish observed objective facts from speculative hypotheses.
4. If transaction velocity, jurisdiction, or structuring signals are ambiguous, state clearly what is missing and express explicit uncertainty.
5. Return strictly valid JSON adhering to the specified schema without Markdown fences or conversational text.`;

    const userPrompt = `Investigate Case ${caseId} for customer ${customer.display_name}.
Below is the verified, authorized evidence bundle for this case:

${evidencePromptBundle}

HEURISTIC SIGNALS COMPUTED DETERMINISTICALLY:
- Overall Heuristic Risk Score: ${heuristicProfile.overall_score}/100 (${heuristicProfile.risk_category})
- Velocity Ratio vs Baseline: ${heuristicProfile.velocity_metrics.velocity_ratio_vs_baseline}x
- Amount Deviation Z-Score: ${heuristicProfile.deviation_metrics.z_score}
- Structuring Near $10k Threshold Detected: ${heuristicProfile.structuring_detected}
- High-Risk Offshore Jurisdictions: ${heuristicProfile.high_risk_jurisdictions.join(', ') || 'None'}

${analystPromptOverride ? `Analyst Specific Inquiry: "${analystPromptOverride}"` : ''}

Generate a rigorous, evidence-grounded investigation report adhering to the requested JSON schema.`;

    let retryCount = 0;
    let report: AIInvestigationReport | null = null;
    let rawText = '';
    let tokenUsage: AIRun['token_usage'];
    let errorMsg: string | undefined;
    let response: any = null;

    const investigationResponseSchema = {
      type: Type.OBJECT,
      properties: {
        case_summary: { type: Type.STRING },
        observed_facts: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              fact: { type: Type.STRING },
              evidence_ids: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['fact', 'evidence_ids']
          }
        },
        hypotheses: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              hypothesis: { type: Type.STRING },
              supporting_evidence_ids: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['hypothesis', 'supporting_evidence_ids']
          }
        },
        key_risk_indicators: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              indicator: { type: Type.STRING },
              severity: { type: Type.STRING },
              evidence_ids: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['indicator', 'severity', 'evidence_ids']
          }
        },
        counter_evidence: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              point: { type: Type.STRING },
              evidence_ids: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['point', 'evidence_ids']
          }
        },
        material_transactions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              transaction_id: { type: Type.STRING },
              date: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              currency: { type: Type.STRING },
              counterparty: { type: Type.STRING },
              risk_relevance: { type: Type.STRING }
            },
            required: ['transaction_id', 'date', 'amount', 'currency', 'counterparty', 'risk_relevance']
          }
        },
        potential_missing_information: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        uncertainties_and_limitations: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        suggested_next_investigative_steps: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        evidence_sufficiency: {
          type: Type.STRING
        }
      },
      required: [
        'case_summary',
        'observed_facts',
        'hypotheses',
        'key_risk_indicators',
        'counter_evidence',
        'material_transactions',
        'potential_missing_information',
        'uncertainties_and_limitations',
        'suggested_next_investigative_steps',
        'evidence_sufficiency'
      ]
    };

    try {
      // First attempt
      response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: investigationResponseSchema
        }
      });

      rawText = response.text || '';
      if (response.usageMetadata) {
        tokenUsage = {
          prompt_tokens: response.usageMetadata.promptTokenCount || 0,
          completion_tokens: response.usageMetadata.candidatesTokenCount || 0,
          total_tokens: response.usageMetadata.totalTokenCount || 0
        };
      }

      const parsedJson = JSON.parse(rawText);
      report = this.normalizeReport(parsedJson);
    } catch (err: any) {
      console.warn('Initial Gemini request failed, attempting single constrained repair retry...', err.message);
      retryCount = 1;

      try {
        const repairPrompt = `The previous response failed schema validation or encountered an error (${err.message}).
Please regenerate the JSON report for Case ${caseId}.
Format: Strict JSON matching the schema. Only use Evidence IDs from this authorized list: ${Array.from(evidenceMap.keys()).join(', ')}.`;

        const repairResponse = await this.ai.models.generateContent({
          model: this.modelName,
          contents: repairPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: investigationResponseSchema
          }
        });

        rawText = repairResponse.text || '';
        if (repairResponse.usageMetadata) {
          tokenUsage = {
            prompt_tokens: repairResponse.usageMetadata.promptTokenCount || 0,
            completion_tokens: repairResponse.usageMetadata.candidatesTokenCount || 0,
            total_tokens: repairResponse.usageMetadata.totalTokenCount || 0
          };
        }
        const repairedJson = JSON.parse(rawText);
        report = this.normalizeReport(repairedJson);
        if (report) {
          report.is_repaired = true;
        }
      } catch (repairErr: any) {
        errorMsg = `Gemini call and repair retry both failed: ${repairErr.message}`;
      }
    }

    const latencyMs = Date.now() - startTimeMs;

    // Validate citations against evidence bundle
    const citationValidation = this.validateCitations(report, evidenceMap);

    // Calculate cost estimate if tokens available
    let estimatedCost: number | undefined;
    if (tokenUsage) {
      estimatedCost =
        tokenUsage.prompt_tokens * COST_PER_INPUT_TOKEN +
        tokenUsage.completion_tokens * COST_PER_OUTPUT_TOKEN;
      estimatedCost = Math.round(estimatedCost * 100000) / 100000;
    }

    let actualModel = this.modelName;
    try {
      if ((response as any)?.modelVersion) {
        actualModel = (response as any).modelVersion;
      }
    } catch {
      // fallback to modelName
    }

    const aiRun: AIRun = {
      run_id: runId,
      case_id: caseId,
      provider: 'google-genai',
      model: actualModel,
      prompt_version: PROMPT_VERSION,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      latency_ms: latencyMs,
      token_usage: tokenUsage,
      estimated_cost_usd: estimatedCost,
      success: Boolean(report && !errorMsg),
      error: errorMsg,
      structured_output: report || undefined,
      tool_invocations: toolInvocations,
      citations_validation: citationValidation,
      retry_count: retryCount
    };

    db.recordAiRun(aiRun);
    return aiRun;
  }

  private validateCitations(
    report: AIInvestigationReport | null,
    evidenceMap: Map<string, any>
  ): AIRun['citations_validation'] {
    if (!report) {
      return {
        total_citations: 0,
        valid_citations: 0,
        invalid_citations: [],
        citations: []
      };
    }

    const citations: AIRunCitation[] = [];
    const invalidSet = new Set<string>();

    const checkIds = (ids: string[] | undefined, claim: string) => {
      if (!ids) return;
      for (const id of ids) {
        const cleanedId = id.trim();
        const isValid = evidenceMap.has(cleanedId);
        citations.push({
          citation_id: cleanedId,
          claim,
          is_valid: isValid
        });
        if (!isValid) {
          invalidSet.add(cleanedId);
        }
      }
    };

    for (const f of report.observed_facts || []) {
      checkIds(f.evidence_ids, f.fact);
    }
    for (const h of report.hypotheses || []) {
      checkIds(h.supporting_evidence_ids, h.hypothesis);
    }
    for (const r of report.key_risk_indicators || []) {
      checkIds(r.evidence_ids, r.indicator);
    }
    for (const c of report.counter_evidence || []) {
      checkIds(c.evidence_ids, c.point);
    }
    for (const t of report.material_transactions || []) {
      if (t.transaction_id) {
        checkIds([t.transaction_id], `Transaction ${t.transaction_id}: $${t.amount} ${t.risk_relevance}`);
      }
    }

    const validCitationsCount = citations.filter((c) => c.is_valid).length;

    return {
      total_citations: citations.length,
      valid_citations: validCitationsCount,
      invalid_citations: Array.from(invalidSet),
      citations
    };
  }

  private normalizeReport(raw: any): AIInvestigationReport {
    if (!raw) {
      throw new Error('Empty AI response payload');
    }

    const case_summary =
      raw.case_summary ||
      raw.summary?.overview ||
      raw.overview ||
      'AI-assisted forensic investigation report based on authorized case evidence.';

    const extractText = (val: any): string => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'string') return val;
      if (typeof val === 'number' || typeof val === 'boolean') return String(val);
      if (typeof val === 'object') {
        return (
          val.fact ||
          val.hypothesis ||
          val.indicator ||
          val.point ||
          val.statement ||
          val.observation ||
          val.finding ||
          val.rationale ||
          val.description ||
          val.text ||
          JSON.stringify(val)
        );
      }
      return String(val);
    };

    const observed_facts: Array<{ fact: string; evidence_ids: string[] }> = [];
    const rawFacts = raw.observed_facts || raw.factual_findings || [];
    for (const item of rawFacts) {
      const factText = extractText(item.fact || item.observation || item.finding || item);
      const evIds = item.evidence_ids || item.supporting_evidence || [];
      observed_facts.push({
        fact: factText,
        evidence_ids: Array.isArray(evIds) ? evIds : [String(evIds)]
      });
    }

    const hypotheses: Array<{ hypothesis: string; supporting_evidence_ids: string[] }> = [];
    const rawHypotheses = raw.hypotheses || raw.typology_hypotheses || [];
    for (const item of rawHypotheses) {
      const hypText = extractText(item.hypothesis || item.rationale || item.typology || item);
      const evIds = item.supporting_evidence_ids || item.supporting_evidence || item.evidence_ids || [];
      hypotheses.push({
        hypothesis: hypText,
        supporting_evidence_ids: Array.isArray(evIds) ? evIds : [String(evIds)]
      });
    }

    const key_risk_indicators: Array<{
      indicator: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      evidence_ids: string[];
    }> = [];
    const rawKRI = raw.key_risk_indicators || raw.indicators || [];
    for (const item of rawKRI) {
      key_risk_indicators.push({
        indicator: extractText(item.indicator || item.name || item),
        severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(item.severity)
          ? item.severity
          : 'HIGH',
        evidence_ids: Array.isArray(item.evidence_ids) ? item.evidence_ids : []
      });
    }

    const counter_evidence: Array<{ point: string; evidence_ids: string[] }> = [];
    const rawCounter = raw.counter_evidence || [];
    for (const item of rawCounter) {
      counter_evidence.push({
        point: item.point || item.description || String(item),
        evidence_ids: Array.isArray(item.evidence_ids) ? item.evidence_ids : []
      });
    }

    const material_transactions: Array<{
      transaction_id: string;
      date: string;
      amount: number;
      currency: string;
      counterparty: string;
      risk_relevance: string;
    }> = [];
    const rawTx = raw.material_transactions || [];
    for (const item of rawTx) {
      material_transactions.push({
        transaction_id: item.transaction_id || item.id || '',
        date: item.date || item.timestamp || '',
        amount: Number(item.amount) || 0,
        currency: item.currency || 'USD',
        counterparty: item.counterparty || item.counterparty_name || '',
        risk_relevance: item.risk_relevance || item.reason || ''
      });
    }

    const potential_missing_information: string[] = [];
    const rawMissing = raw.potential_missing_information || raw.missing_information || [];
    for (const m of rawMissing) {
      potential_missing_information.push(
        typeof m === 'string' ? m : m.description || JSON.stringify(m)
      );
    }

    const uncertainties_and_limitations: string[] = [];
    const rawUncertainties =
      raw.uncertainties_and_limitations || raw.uncertainties_and_data_gaps || [];
    for (const u of rawUncertainties) {
      uncertainties_and_limitations.push(
        typeof u === 'string'
          ? u
          : u.gap_description
          ? `${u.gap_description}: ${u.impact || ''}`
          : JSON.stringify(u)
      );
    }

    const suggested_next_investigative_steps: string[] = [];
    const rawSteps =
      raw.suggested_next_investigative_steps || raw.recommended_investigative_actions || [];
    for (const s of rawSteps) {
      suggested_next_investigative_steps.push(
        typeof s === 'string'
          ? s
          : s.action
          ? `${s.action} (${s.priority || 'MEDIUM'})`
          : JSON.stringify(s)
      );
    }

    return {
      case_summary,
      observed_facts,
      hypotheses,
      key_risk_indicators,
      counter_evidence,
      material_transactions,
      potential_missing_information,
      uncertainties_and_limitations,
      suggested_next_investigative_steps,
      evidence_sufficiency: raw.evidence_sufficiency || 'SUFFICIENT'
    };
  }
}
