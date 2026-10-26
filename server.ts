import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db } from './server/store.ts';
import {
  GeminiInvestigationService,
  getGeminiConfigStatus
} from './Services/gemini.ts';
import { runComprehensiveEvaluations } from './Services/evaluations.ts';
import { generateCasePdf } from './Services/pdf.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// API Routes

// 1. Health & Configuration Status
app.get('/api/health', (req: Request, res: Response) => {
  const integrity = db.validateDatabaseIntegrity();
  const geminiStatus = getGeminiConfigStatus();

  res.json({
    status: 'ONLINE',
    version: '1.0.0',
    app: 'AML Investigation Workbench',
    timestamp: new Date().toISOString(),
    persistence: {
      engine: 'SERVER_PERSISTENT_FILE_JSON',
      path: 'data/aml_workbench_db.json',
      firestore_support: {
        status: 'UNCONFIGURED',
        note: 'Firestore integration available via Firebase tool if requested. Server persistent file store is currently active and managing state.'
      }
    },
    counts: integrity.counts,
    integrity_valid: integrity.is_valid,
    gemini: geminiStatus
  });
});

// 2. Overview Metrics
app.get('/api/overview', (req: Request, res: Response) => {
  try {
    const metrics = db.getOverviewMetrics();
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Alerts API
app.get('/api/alerts', (req: Request, res: Response) => {
  try {
    const {
      status,
      type,
      priority,
      search,
      customerId,
      sortBy,
      sortOrder,
      limit,
      offset
    } = req.query;

    const data = db.getAlerts({
      status: status as string,
      type: type as string,
      priority: priority as string,
      search: search as string,
      customerId: customerId as string,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
      limit: limit ? parseInt(limit as string, 10) : 20,
      offset: offset ? parseInt(offset as string, 10) : 0
    });

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/alerts/:id', (req: Request, res: Response) => {
  const alert = db.getAlertById(req.params.id);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  const customer = db.getCustomerById(alert.customer_id);
  res.json({ alert, customer });
});

// 4. Cases API
app.get('/api/cases', (req: Request, res: Response) => {
  try {
    const { status, priority, disposition, search, limit, offset } = req.query;
    const data = db.getCases({
      status: status as string,
      priority: priority as string,
      disposition: disposition as string,
      search: search as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0
    });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cases/:id', (req: Request, res: Response) => {
  const caseData = db.getCaseById(req.params.id);
  if (!caseData) {
    return res.status(404).json({ error: `Case ${req.params.id} not found` });
  }
  res.json(caseData);
});

// Case Mutation (Analyst action)
app.patch('/api/cases/:id', (req: Request, res: Response) => {
  try {
    const { actor, status, disposition, rationale, analyst_notes } = req.body;
    const result = db.updateCase({
      caseId: req.params.id,
      actor: actor || 'Analyst (User)',
      status,
      disposition,
      rationale,
      analyst_notes
    });
    res.json({
      success: true,
      case: result.caseObj,
      auditEventsAdded: result.auditEventsAdded
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 5. Customers & Transactions API
app.get('/api/customers', (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  res.json(db.getCustomers(limit, offset));
});

app.get('/api/customers/:id', (req: Request, res: Response) => {
  const cust = db.getCustomerById(req.params.id);
  if (!cust) return res.status(404).json({ error: 'Customer not found' });
  const txs = db.getTransactions({ customerId: cust.customer_id, limit: 100 });
  res.json({ customer: cust, transactions: txs.transactions, total_transactions: txs.total });
});

app.get('/api/transactions', (req: Request, res: Response) => {
  const { customerId, caseId, alertId, type, minAmount, maxAmount, limit, offset } = req.query;
  const data = db.getTransactions({
    customerId: customerId as string,
    caseId: caseId as string,
    alertId: alertId as string,
    type: type as string,
    minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
    maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined,
    limit: limit ? parseInt(limit as string, 10) : 50,
    offset: offset ? parseInt(offset as string, 10) : 0
  });
  res.json(data);
});

// 6. Transaction Network Graph API
app.get('/api/network-graph', (req: Request, res: Response) => {
  try {
    const { customerId, caseId, minAmount, limit } = req.query;

    let targetCustId = customerId as string;
    if (!targetCustId && caseId) {
      const c = db.getCaseById(caseId as string);
      if (c) targetCustId = c.caseObj.customer_id;
    }

    if (!targetCustId) {
      // Default to first case customer
      targetCustId = 'CUST-001';
    }

    const rootCustomer = db.getCustomerById(targetCustId);
    if (!rootCustomer) {
      return res.status(404).json({ error: 'Customer not found for graph.' });
    }

    const txsResult = db.getTransactions({
      customerId: targetCustId,
      minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
      limit: limit ? parseInt(limit as string, 10) : 40
    });

    const nodesMap = new Map<string, {
      id: string;
      label: string;
      type: 'CUSTOMER' | 'COUNTERPARTY';
      country: string;
      riskTier?: string;
      totalVolumeUsd: number;
      txCount: number;
    }>();

    // Add root customer
    nodesMap.set(rootCustomer.customer_id, {
      id: rootCustomer.customer_id,
      label: rootCustomer.display_name,
      type: 'CUSTOMER',
      country: rootCustomer.country,
      riskTier: rootCustomer.risk_tier,
      totalVolumeUsd: rootCustomer.total_volume_usd || 0,
      txCount: rootCustomer.total_transactions_count || 0
    });

    const edges: Array<{
      id: string;
      source: string;
      target: string;
      amount_usd: number;
      timestamp: string;
      transaction_type: string;
      status: string;
      alert_id?: string;
    }> = [];

    for (const tx of txsResult.transactions) {
      // Add or update counterparty node
      if (!nodesMap.has(tx.counterparty_id)) {
        nodesMap.set(tx.counterparty_id, {
          id: tx.counterparty_id,
          label: tx.counterparty_name,
          type: 'COUNTERPARTY',
          country: tx.counterparty_country,
          totalVolumeUsd: tx.amount_usd,
          txCount: 1
        });
      } else {
        const cp = nodesMap.get(tx.counterparty_id)!;
        cp.totalVolumeUsd += tx.amount_usd;
        cp.txCount += 1;
      }

      edges.push({
        id: tx.transaction_id,
        source: rootCustomer.customer_id,
        target: tx.counterparty_id,
        amount_usd: tx.amount_usd,
        timestamp: tx.timestamp,
        transaction_type: tx.transaction_type,
        status: tx.status,
        alert_id: tx.alert_id
      });
    }

    res.json({
      root_customer_id: rootCustomer.customer_id,
      nodes: Array.from(nodesMap.values()),
      edges
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Case-Scoped AI Investigation
app.post('/api/cases/:id/ai-investigate', async (req: Request, res: Response) => {
  try {
    const caseExists = db.getCaseById(req.params.id);
    if (!caseExists) {
      return res.status(404).json({ error: `Case ${req.params.id} not found` });
    }
    const { prompt_override } = req.body;
    const investigator = new GeminiInvestigationService();
    const result = await investigator.runCaseInvestigation(req.params.id, prompt_override);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. PDF Case Export
app.get('/api/cases/:id/export-pdf', async (req: Request, res: Response) => {
  try {
    const caseExists = db.getCaseById(req.params.id);
    if (!caseExists) {
      return res.status(404).json({ error: `Case ${req.params.id} not found` });
    }
    const pdfBuffer = await generateCasePdf(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="AML_Investigation_${req.params.id}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. AI Runs & Observability
app.get('/api/ai-runs', (req: Request, res: Response) => {
  const caseId = req.query.caseId as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  res.json(db.getAiRuns({ caseId, limit }));
});

// 10. Evaluations
app.get('/api/evaluations', (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  res.json(db.getEvaluations(limit));
});

app.post('/api/evaluations/run', async (req: Request, res: Response) => {
  try {
    const report = await runComprehensiveEvaluations();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Database Admin & Seeding
app.post('/api/admin/reseed', (req: Request, res: Response) => {
  try {
    const { confirm } = req.body;
    if (confirm !== true) {
      return res.status(400).json({
        error: 'Explicit confirmation required. Send { confirm: true }.'
      });
    }
    const result = db.reseed(true);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/validate-db', (req: Request, res: Response) => {
  const report = db.validateDatabaseIntegrity();
  res.json(report);
});

// Download Verified Project Backup Archives
app.get('/api/download-backup', (req: Request, res: Response) => {
  const zipPath = '/tmp/aml-investigation-workbench-backup.zip';
  if (!fs.existsSync(zipPath)) {
    return res.status(404).json({
      error: 'Backup archive not found',
      message: 'Run scripts/generate_backup.sh first or verify /tmp/aml-investigation-workbench-backup.zip'
    });
  }
  res.download(zipPath, 'aml-investigation-workbench-backup.zip');
});

app.get('/api/download-backup/tar', (req: Request, res: Response) => {
  const tarPath = '/tmp/aml-investigation-workbench-backup.tar.gz';
  if (!fs.existsSync(tarPath)) {
    return res.status(404).json({
      error: 'Tar backup archive not found',
      message: 'Run scripts/generate_backup.sh first or verify /tmp/aml-investigation-workbench-backup.tar.gz'
    });
  }
  res.download(tarPath, 'aml-investigation-workbench-backup.tar.gz');
});

// API Documentation JSON (OpenAPI-compatible summary)
app.get('/api/docs', (req: Request, res: Response) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'AML Investigation Workbench REST API',
      version: '1.0.0',
      description: 'Production-ready financial crime analytics, case workspace, bounded AI assistant, and evaluation endpoints.'
    },
    endpoints: [
      { method: 'GET', path: '/api/health', desc: 'System health, counts, and Gemini configuration check' },
      { method: 'GET', path: '/api/overview', desc: 'Dashboard metrics and distribution aggregates' },
      { method: 'GET', path: '/api/alerts', desc: 'Searchable, filterable, paginated AML alert queue' },
      { method: 'GET', path: '/api/alerts/:id', desc: 'Single alert with heuristic signals' },
      { method: 'GET', path: '/api/cases', desc: 'Filterable case records' },
      { method: 'GET', path: '/api/cases/:id', desc: 'Full case workspace with customer, alerts, transactions, and audit trail' },
      { method: 'PATCH', path: '/api/cases/:id', desc: 'Analyst updates to status, disposition, and notes with mandatory rationale' },
      { method: 'GET', path: '/api/customers', desc: 'Synthetic customer list' },
      { method: 'GET', path: '/api/transactions', desc: 'Filtered transaction records' },
      { method: 'GET', path: '/api/network-graph', desc: 'Topology graph nodes and edges for visual forensic analysis' },
      { method: 'POST', path: '/api/cases/:id/ai-investigate', desc: 'Execute case-scoped Gemini investigation with verifiable citations' },
      { method: 'GET', path: '/api/cases/:id/export-pdf', desc: 'Downloadable official investigation case report PDF' },
      { method: 'GET', path: '/api/ai-runs', desc: 'AI run logs, latencies, tokens, and cost audit' },
      { method: 'GET', path: '/api/evaluations', desc: 'Historical evaluation test results' },
      { method: 'POST', path: '/api/evaluations/run', desc: 'Execute automated 11-test deterministic validation suite' },
      { method: 'POST', path: '/api/admin/reseed', desc: 'Reset/reseed synthetic database (requires confirm: true)' },
      { method: 'POST', path: '/api/admin/validate-db', desc: 'Verify referential integrity and exact record counts' },
      { method: 'GET', path: '/api/download-backup', desc: 'Direct download verified project ZIP archive' },
      { method: 'GET', path: '/api/download-backup/tar', desc: 'Direct download verified project TAR.GZ archive' }
    ]
  });
});

// Setup Vite middlewares in development or static serve in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true }
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AML Investigation Workbench backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
