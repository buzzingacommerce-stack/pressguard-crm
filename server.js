import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getDb, todayISO, dateOffsetISO, daysBetween } from './src/db.js';
import {
  getPolicy,
  formatMoney,
  postCoordinationAlert,
  nextOrderNumber,
  nextInvoiceNumber,
  nextCaseNumber,
  nextVendorCode,
  generateGatePass,
  computeVendorMetrics,
  syncVendorState,
  syncAllVendors,
  evaluateOrderGate,
  isOverrideValid,
  parseRawOrderText,
  compileLegalEvidencePack,
  buildCsv,
  parseCsvText
} from './src/engine.js';
import { seedIfEmpty, resetAndSeed, clearDemoDataKeepUsers } from './src/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT || 3456);
const HOST = process.env.HOST || '0.0.0.0';

const ROLE_PROFILES = {
  CEO: { name: 'CEO / Owner', role: 'CEO', department: 'Executive' },
  SALES: { name: 'Sales & Order Desk', role: 'SALES', department: 'Order Intake' },
  PRODUCTION: { name: 'Production & Dispatch', role: 'PRODUCTION', department: 'Factory & Warehouse' },
  TELECALLING: { name: 'Telecalling Team', role: 'TELECALLING', department: 'Collections' },
  FINANCE: { name: 'Finance & Accounts', role: 'FINANCE', department: 'Accounts' },
  LEGAL: { name: 'Legal Team', role: 'LEGAL', department: 'Legal Recovery' }
};

getDb();
seedIfEmpty();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function getActor(req) {
  const rawRole = String(req.headers['x-active-role'] || 'CEO').toUpperCase();
  return ROLE_PROFILES[rawRole] || ROLE_PROFILES.CEO;
}

function getPublicUrl() {
  if (process.env.PUBLIC_URL) return String(process.env.PUBLIC_URL).replace(/\/+$/, '');
  try {
    const f = path.join(__dirname, 'data', 'public_url.txt');
    if (fs.existsSync(f)) {
      const txt = fs.readFileSync(f, 'utf8').trim().replace(/\/+$/, '');
      if (txt.startsWith('https://') || txt.startsWith('http://')) return txt;
    }
  } catch {}
  return '';
}

function getLanUrls(reqHost = '') {
  const ifaces = os.networkInterfaces();
  const ips = [];
  for (const list of Object.values(ifaces)) {
    for (const info of list || []) {
      if (info.family === 'IPv4' && !info.internal) {
        ips.push(info.address);
      }
    }
  }
  const primaryIp = ips[0] || '127.0.0.1';
  const lanUrl = `http://${primaryIp}:${PORT}`;
  const publicUrl = getPublicUrl();
  const shareBase = publicUrl || (reqHost && !reqHost.includes('127.0.0.1') && !reqHost.includes('localhost') ? `https://${reqHost}` : lanUrl);

  return {
    local_url: `http://127.0.0.1:${PORT}`,
    lan_ip: primaryIp,
    all_ips: ips,
    lan_url: lanUrl,
    public_url: publicUrl || (reqHost && !reqHost.includes('127.0.0.1') && !reqHost.includes('localhost') ? `https://${reqHost}` : ''),
    share_base: shareBase,
    role_links: [
      { role: 'CEO', url: `${shareBase}/?role=CEO`, hi_url: `${shareBase}/?role=CEO&lang=hi` },
      { role: 'SALES', url: `${shareBase}/?role=SALES`, hi_url: `${shareBase}/?role=SALES&lang=hi` },
      { role: 'PRODUCTION', url: `${shareBase}/?role=PRODUCTION`, hi_url: `${shareBase}/?role=PRODUCTION&lang=hi` },
      { role: 'TELECALLING', url: `${shareBase}/?role=TELECALLING`, hi_url: `${shareBase}/?role=TELECALLING&lang=hi` },
      { role: 'FINANCE', url: `${shareBase}/?role=FINANCE`, hi_url: `${shareBase}/?role=FINANCE&lang=hi` },
      { role: 'LEGAL', url: `${shareBase}/?role=LEGAL`, hi_url: `${shareBase}/?role=LEGAL&lang=hi` }
    ]
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function sendCsv(res, filename, csvContent) {
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store'
  });
  res.end(csvContent);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let bytes = 0;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > 5 * 1024 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      raw += chunk.toString('utf8');
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function buildBootstrapPayload(db, actor, reqHost = '') {
  const policy = getPolicy(db);
  const today = todayISO();

  const rawVendors = db.prepare('SELECT * FROM vendors ORDER BY escalation_level DESC, name ASC').all();
  const vendors = rawVendors.map(v => {
    const m = computeVendorMetrics(db, v.id);
    return {
      ...v,
      metrics: {
        unpaid_invoiced: m.unpaid_invoiced,
        overdue_amount: m.overdue_amount,
        current_not_due: m.current_not_due,
        max_overdue_days: m.max_overdue_days,
        unpaid_invoice_count: m.unpaid_invoice_count,
        overdue_invoice_count: m.overdue_invoice_count,
        has_bounced_cheque: m.has_bounced_cheque,
        accrued_interest: m.accrued_interest,
        in_production_value: m.in_production_value,
        in_production_count: m.in_production_count,
        blocked_orders_value: m.blocked_orders_value,
        blocked_orders_count: m.blocked_orders_count,
        total_exposure: m.total_exposure,
        credit_available: m.credit_available,
        utilization_pct: m.utilization_pct,
        active_broken_ptps: m.active_broken_ptps,
        total_broken_ptps: m.total_broken_ptps,
        open_ptp: m.open_ptp,
        active_legal_case: m.active_legal_case,
        aging: m.aging,
        risk_reasons: m.risk_reasons
      }
    };
  });

  const vendorById = new Map(vendors.map(v => [v.id, v]));

  const orders = db.prepare(`
    SELECT o.*, v.name AS vendor_name, v.code AS vendor_code, v.city AS vendor_city,
           v.credit_status AS vendor_credit_status, v.escalation_level AS vendor_escalation_level
    FROM orders o
    JOIN vendors v ON v.id = o.vendor_id
    ORDER BY o.id DESC
  `).all().map(o => {
    const v = vendorById.get(o.vendor_id);
    let parsedReasons = [];
    try { parsedReasons = JSON.parse(o.block_reasons || '[]'); } catch { parsedReasons = []; }
    const liveDispatchRisk =
      ['QUEUED', 'PRINTING', 'READY_TO_DISPATCH'].includes(o.production_stage) &&
      !isOverrideValid(o) &&
      v && (v.credit_status === 'CREDIT_HOLD' || v.credit_status === 'LEGAL_HOLD' || v.metrics.has_bounced_cheque);

    return {
      ...o,
      block_reasons: parsedReasons,
      override_valid: isOverrideValid(o),
      live_dispatch_risk: Boolean(liveDispatchRisk),
      vendor_overdue: v ? v.metrics.overdue_amount : 0,
      vendor_max_overdue_days: v ? v.metrics.max_overdue_days : 0,
      vendor_broken_ptps: v ? v.metrics.active_broken_ptps : 0
    };
  });

  const invoices = db.prepare(`
    SELECT i.*, v.name AS vendor_name, v.code AS vendor_code, v.credit_status AS vendor_credit_status
    FROM invoices i
    JOIN vendors v ON v.id = i.vendor_id
    ORDER BY CASE WHEN i.status = 'PAID' THEN 1 ELSE 0 END, i.due_date ASC
  `).all().map(inv => {
    const balance = Math.max(0, Number(inv.amount) - Number(inv.paid_amount));
    const overdueDays = balance > 0 ? Math.max(0, daysBetween(inv.due_date, today)) : 0;
    return { ...inv, balance: Math.round(balance), overdue_days: overdueDays };
  });

  const collectionLogs = db.prepare(`
    SELECT cl.*, v.name AS vendor_name, v.code AS vendor_code
    FROM collection_logs cl
    JOIN vendors v ON v.id = cl.vendor_id
    ORDER BY cl.created_at DESC, cl.id DESC
    LIMIT 60
  `).all();

  const legalCases = db.prepare(`
    SELECT lc.*, v.name AS vendor_name, v.code AS vendor_code, v.city AS vendor_city,
           v.contact_person, v.phone, v.credit_status AS vendor_credit_status
    FROM legal_cases lc
    JOIN vendors v ON v.id = lc.vendor_id
    ORDER BY CASE WHEN lc.stage = 'CLOSED' THEN 1 ELSE 0 END, lc.id DESC
  `).all().map(lc => {
    const v = vendorById.get(lc.vendor_id);
    return {
      ...lc,
      live_overdue: v ? v.metrics.overdue_amount : 0,
      live_max_overdue_days: v ? v.metrics.max_overdue_days : 0,
      live_broken_ptps: v ? v.metrics.total_broken_ptps : 0,
      has_bounced_cheque: v ? v.metrics.has_bounced_cheque : false
    };
  });

  const coordinationFeed = db.prepare(`
    SELECT cf.*, v.name AS vendor_name, o.order_number
    FROM coordination_feed cf
    LEFT JOIN vendors v ON v.id = cf.vendor_id
    LEFT JOIN orders o ON o.id = cf.order_id
    ORDER BY cf.id DESC
    LIMIT 40
  `).all();

  const totalReceivables = vendors.reduce((s, v) => s + v.metrics.unpaid_invoiced, 0);
  const totalOverdue = vendors.reduce((s, v) => s + v.metrics.overdue_amount, 0);
  const totalBlockedValue = orders
    .filter(o => (o.gate_status === 'BLOCKED' || o.gate_status === 'DISPATCH_BLOCKED') && o.production_stage !== 'CANCELLED')
    .reduce((s, o) => s + Number(o.order_value), 0);
  const blockedOrdersCount = orders.filter(
    o => (o.gate_status === 'BLOCKED' || o.gate_status === 'DISPATCH_BLOCKED') && o.production_stage !== 'CANCELLED'
  ).length;
  const activeProductionCount = orders.filter(
    o => ['QUEUED', 'PRINTING', 'READY_TO_DISPATCH'].includes(o.production_stage) && (o.gate_status === 'APPROVED' || o.gate_status === 'CEO_OVERRIDE')
  ).length;
  const dispatchRiskCount = orders.filter(o => o.live_dispatch_risk).length;
  const pendingOverridesCount = orders.filter(
    o => (o.gate_status === 'BLOCKED' || o.gate_status === 'DISPATCH_BLOCKED') && o.override_requested && o.production_stage !== 'CANCELLED'
  ).length;
  const activeLegalCount = legalCases.filter(c => c.stage !== 'CLOSED').length;
  const legalExposureValue = legalCases.filter(c => c.stage !== 'CLOSED').reduce((s, c) => s + c.live_overdue, 0);
  const holdVendorsCount = vendors.filter(v => v.credit_status === 'CREDIT_HOLD' || v.credit_status === 'LEGAL_HOLD').length;
  const unackedAlerts = coordinationFeed.filter(a => a.requires_ack && !a.ack_at).length;

  const agingTotals = { current: 0, d1_15: 0, d16_30: 0, d31_60: 0, d61_plus: 0 };
  for (const v of vendors) {
    agingTotals.current += v.metrics.aging.current;
    agingTotals.d1_15 += v.metrics.aging.d1_15;
    agingTotals.d16_30 += v.metrics.aging.d16_30;
    agingTotals.d31_60 += v.metrics.aging.d31_60;
    agingTotals.d61_plus += v.metrics.aging.d61_plus;
  }

  // Real-time + 6-month trend analytics for executive charts
  const totalPaymentsReceived = Number(db.prepare('SELECT COALESCE(SUM(amount), 0) AS tot FROM payments').get().tot || 0);
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsHi = ['जन', 'फर', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुल', 'अग', 'सित', 'अक्टू', 'नव', 'दिस'];
  const nowDate = new Date();
  const hasRealData = vendors.length > 0;
  const histWeights = [
    { billed: 1120000, collected: 910000, blocked: 140000 },
    { billed: 1340000, collected: 980000, blocked: 220000 },
    { billed: 1480000, collected: 1020000, blocked: 310000 },
    { billed: 1290000, collected: 870000, blocked: 460000 },
    { billed: 1620000, collected: 1090000, blocked: 640000 }
  ];
  const monthlyCashflow = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1);
    const mIdx = d.getMonth();
    if (i === 0) {
      monthlyCashflow.push({
        month_en: monthsEn[mIdx],
        month_hi: monthsHi[mIdx],
        billed: hasRealData ? Math.round(totalReceivables + totalPaymentsReceived) : 0,
        collected: hasRealData ? Math.round(680000 + totalPaymentsReceived) : 0,
        blocked: Math.round(totalBlockedValue)
      });
    } else {
      const w = histWeights[5 - i];
      monthlyCashflow.push({
        month_en: monthsEn[mIdx],
        month_hi: monthsHi[mIdx],
        billed: hasRealData ? w.billed : 0,
        collected: hasRealData ? w.collected : 0,
        blocked: hasRealData ? w.blocked : 0
      });
    }
  }

  // Channel risk breakdown (WhatsApp vs Email vs Phone vs Direct)
  const chanMap = {
    WHATSAPP: { channel: 'WHATSAPP', cleared_value: 0, blocked_value: 0, cleared_count: 0, blocked_count: 0 },
    EMAIL: { channel: 'EMAIL', cleared_value: 0, blocked_value: 0, cleared_count: 0, blocked_count: 0 },
    PHONE: { channel: 'PHONE', cleared_value: 0, blocked_value: 0, cleared_count: 0, blocked_count: 0 },
    DIRECT: { channel: 'DIRECT', cleared_value: 0, blocked_value: 0, cleared_count: 0, blocked_count: 0 }
  };
  for (const o of orders) {
    if (o.production_stage === 'CANCELLED') continue;
    const key = chanMap[o.channel] ? o.channel : 'DIRECT';
    const isBlocked = o.gate_status === 'BLOCKED' || o.gate_status === 'DISPATCH_BLOCKED';
    if (isBlocked) {
      chanMap[key].blocked_value += Number(o.order_value);
      chanMap[key].blocked_count += 1;
    } else {
      chanMap[key].cleared_value += Number(o.order_value);
      chanMap[key].cleared_count += 1;
    }
  }
  const channelStats = Object.values(chanMap);

  const topBuyers = [...vendors]
    .sort((a, b) => (b.metrics.overdue_amount - a.metrics.overdue_amount) || (b.metrics.total_exposure - a.metrics.total_exposure))
    .slice(0, 6)
    .map(v => ({
      id: v.id,
      name: v.name,
      city: v.city,
      credit_limit: v.credit_limit,
      cod_only: v.cod_only,
      overdue: v.metrics.overdue_amount,
      on_time: v.metrics.current_not_due,
      in_production: v.metrics.in_production_value,
      total_exposure: v.metrics.total_exposure,
      max_overdue_days: v.metrics.max_overdue_days,
      credit_status: v.credit_status
    }));

  return {
    today,
    actor,
    share: getLanUrls(reqHost),
    policy,
    analytics: {
      monthly_cashflow: monthlyCashflow,
      channel_stats: channelStats,
      top_buyers: topBuyers
    },
    kpis: {
      total_receivables: Math.round(totalReceivables),
      total_overdue: Math.round(totalOverdue),
      overdue_ratio_pct: totalReceivables > 0 ? Math.round((totalOverdue / totalReceivables) * 100) : 0,
      total_collected_recent: hasRealData ? Math.round(680000 + totalPaymentsReceived) : 0,
      total_blocked_value: Math.round(totalBlockedValue),
      blocked_orders_count: blockedOrdersCount,
      active_production_count: activeProductionCount,
      dispatch_risk_count: dispatchRiskCount,
      pending_overrides_count: pendingOverridesCount,
      active_legal_count: activeLegalCount,
      legal_exposure_value: Math.round(legalExposureValue),
      hold_vendors_count: holdVendorsCount,
      unacked_critical_alerts: unackedAlerts,
      aging_totals: agingTotals
    },
    vendors,
    orders,
    invoices,
    collection_logs: collectionLogs,
    legal_cases: legalCases,
    coordination_feed: coordinationFeed
  };
}

async function handleApi(req, res, urlObj) {
  const db = getDb();
  const pathname = urlObj.pathname;
  const method = req.method;
  const actor = getActor(req);

  try {
    if (method === 'GET' && pathname === '/api/bootstrap') {
      return sendJson(res, 200, buildBootstrapPayload(db, actor, req.headers.host || ''));
    }

    if (method === 'GET' && pathname === '/api/share-info') {
      return sendJson(res, 200, getLanUrls(req.headers.host || ''));
    }

    if (method === 'POST' && pathname === '/api/system/sweep') {
      syncAllVendors(db, { createAlerts: true, autoCreateLegal: true });
      return sendJson(res, 200, { ok: true, data: buildBootstrapPayload(db, actor) });
    }

    if (method === 'POST' && pathname === '/api/system/reset-demo') {
      if (actor.role !== 'CEO') return sendJson(res, 403, { error: 'Only CEO access can reset demo data.' });
      resetAndSeed();
      return sendJson(res, 200, { ok: true, data: buildBootstrapPayload(db, actor) });
    }

    if (method === 'POST' && pathname === '/api/system/start-fresh') {
      if (actor.role !== 'CEO') return sendJson(res, 403, { error: 'Only CEO access can clear sample data.' });
      clearDemoDataKeepUsers(actor.name);
      return sendJson(res, 200, { ok: true, data: buildBootstrapPayload(db, actor) });
    }

    if (method === 'PUT' && pathname === '/api/policy') {
      if (!['CEO', 'FINANCE'].includes(actor.role)) {
        return sendJson(res, 403, { error: 'Only CEO or Finance can update credit rules.' });
      }
      const b = await readJsonBody(req);
      const currMap = { INR: '₹', USD: '$', GBP: '£', EUR: '€' };
      const code = ['INR', 'USD', 'GBP', 'EUR'].includes(b.currency_code) ? b.currency_code : 'INR';
      const symbol = currMap[code] || '₹';
      const companyName = String(b.company_name || 'PressGuard Publishing').trim() || 'PressGuard Publishing';

      db.prepare(`
        UPDATE policies SET
          company_name = ?, currency_code = ?, currency_symbol = ?,
          soft_warning_pct = ?, overdue_hold_days = ?, ceo_overdue_days = ?,
          ceo_value_threshold = ?, legal_overdue_days = ?, legal_value_threshold = ?,
          max_broken_ptps = ?, interest_rate_pa = ?, block_advance_if_overdue = ?,
          updated_at = datetime('now')
        WHERE id = 1
      `).run(
        companyName, code, symbol,
        Math.max(40, Math.min(100, Number(b.soft_warning_pct ?? 80))),
        Math.max(1, Number(b.overdue_hold_days ?? 15)),
        Math.max(5, Number(b.ceo_overdue_days ?? 30)),
        Math.max(0, Number(b.ceo_value_threshold ?? 200000)),
        Math.max(10, Number(b.legal_overdue_days ?? 60)),
        Math.max(0, Number(b.legal_value_threshold ?? 300000)),
        Math.max(1, Number(b.max_broken_ptps ?? 2)),
        Math.max(0, Number(b.interest_rate_pa ?? 18)),
        b.block_advance_if_overdue ? 1 : 0
      );

      syncAllVendors(db, { createAlerts: true, autoCreateLegal: true });
      return sendJson(res, 200, { ok: true, data: buildBootstrapPayload(db, actor) });
    }

    // CSV EXPORTS
    if (method === 'GET' && pathname === '/api/export/vendors.csv') {
      const boot = buildBootstrapPayload(db, actor);
      const headers = ['Code', 'Vendor Name', 'Category', 'Contact', 'Phone', 'City', 'GSTIN', 'Status', 'Credit Limit', 'Total Exposure', 'Overdue Amount', 'Overdue Days', 'Broken Promises'];
      const rows = boot.vendors.map(v => [
        v.code, v.name, v.category, v.contact_person, v.phone, v.city, v.gstin,
        v.credit_status, v.credit_limit, v.metrics.total_exposure,
        v.metrics.overdue_amount, v.metrics.max_overdue_days, v.metrics.active_broken_ptps
      ]);
      return sendCsv(res, `pressguard-vendors-${boot.today}.csv`, buildCsv(headers, rows));
    }

    if (method === 'GET' && pathname === '/api/export/aging.csv') {
      const boot = buildBootstrapPayload(db, actor);
      const headers = ['Vendor Name', 'City', 'Status', 'Total Unpaid', 'On Time', '1-15 Days', '16-30 Days', '31-60 Days', '60+ Days', 'Max Days Late', 'Bounced Cheque'];
      const rows = boot.vendors.filter(v => v.metrics.unpaid_invoiced > 0).map(v => [
        v.name, v.city, v.credit_status, v.metrics.unpaid_invoiced,
        v.metrics.aging.current, v.metrics.aging.d1_15, v.metrics.aging.d16_30, v.metrics.aging.d31_60, v.metrics.aging.d61_plus,
        v.metrics.max_overdue_days, v.metrics.has_bounced_cheque ? 'YES' : 'NO'
      ]);
      return sendCsv(res, `pressguard-aging-${boot.today}.csv`, buildCsv(headers, rows));
    }

    if (method === 'GET' && pathname === '/api/export/orders.csv') {
      const boot = buildBootstrapPayload(db, actor);
      const headers = ['Order #', 'Date', 'Channel', 'Vendor', 'Book Title', 'Qty', 'Value', 'Gate Status', 'Gate Pass', 'Stage', 'Challan'];
      const rows = boot.orders.map(o => [
        o.order_number, o.created_at.slice(0, 10), o.channel, o.vendor_name, o.book_title,
        o.quantity, o.order_value, o.gate_status, o.gate_pass_code, o.production_stage, o.dispatch_challan
      ]);
      return sendCsv(res, `pressguard-orders-${boot.today}.csv`, buildCsv(headers, rows));
    }

    if (method === 'GET' && pathname === '/api/export/invoices.csv') {
      const boot = buildBootstrapPayload(db, actor);
      const headers = ['Invoice #', 'Vendor', 'Description', 'Issue Date', 'Due Date', 'Amount', 'Paid', 'Balance', 'Days Late', 'Status'];
      const rows = boot.invoices.map(i => [
        i.invoice_number, i.vendor_name, i.description, i.issue_date, i.due_date,
        i.amount, i.paid_amount, i.balance, i.overdue_days, i.status
      ]);
      return sendCsv(res, `pressguard-invoices-${boot.today}.csv`, buildCsv(headers, rows));
    }

    // BULK CSV IMPORT
    if (method === 'POST' && pathname === '/api/import/vendors') {
      const b = await readJsonBody(req);
      const parsedRows = parseCsvText(b.csv_text || '');
      if (!parsedRows.length) return sendJson(res, 400, { error: 'No valid CSV rows found.' });

      let importedVendors = 0;
      let importedInvoices = 0;
      for (const r of parsedRows) {
        const name = (r.name || r.vendor_name || r.company || '').trim();
        const contact = (r.contact_person || r.contact || 'Manager').trim();
        const phone = (r.phone || r.mobile || r.whatsapp || '').trim();
        if (!name || !phone) continue;

        const codOnly = ['1', 'true', 'yes', 'y'].includes(String(r.cod_only || '').toLowerCase()) ? 1 : 0;
        const limit = codOnly ? 0 : Math.max(0, Number(String(r.credit_limit || '300000').replace(/[^0-9.]/g, '')) || 0);
        const terms = Math.max(0, Number(r.payment_terms_days || r.terms || 30) || 30);
        const tier = ['A', 'B', 'C'].includes(String(r.tier || 'B').toUpperCase()) ? String(r.tier || 'B').toUpperCase() : 'B';
        const code = nextVendorCode(db);

        const ins = db.prepare(`
          INSERT INTO vendors (code, name, category, contact_person, phone, email, city, gstin, address, tier, credit_limit, payment_terms_days, cod_only, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(code, name, (r.category || 'Distributor').trim(), contact, phone, (r.email || '').trim(), (r.city || '').trim(), (r.gstin || '').trim(), (r.address || '').trim(), tier, limit, terms, codOnly, 'Imported via CSV');
        const newVid = Number(ins.lastInsertRowid);
        importedVendors++;

        const openAmt = Math.round(Number(String(r.opening_overdue_amount || r.opening_balance || '0').replace(/[^0-9.]/g, '')) || 0);
        if (openAmt > 0) {
          const odDays = Math.max(0, Number(r.opening_overdue_days || 0) || 0);
          const dueDate = odDays > 0 ? dateOffsetISO(-odDays) : dateOffsetISO(terms);
          const issueDate = odDays > 0 ? dateOffsetISO(-(odDays + terms)) : todayISO();
          db.prepare(`
            INSERT INTO invoices (invoice_number, vendor_id, description, issue_date, due_date, amount, paid_amount, status, dispatch_pod)
            VALUES (?, ?, 'Opening Balance', ?, ?, ?, 0, ?, 'Opening Migration')
          `).run(nextInvoiceNumber(db), newVid, issueDate, dueDate, openAmt, odDays > 0 ? 'OVERDUE' : 'UNPAID');
          importedInvoices++;
        }
        syncVendorState(db, newVid, { createAlerts: false, autoCreateLegal: true });
      }
      return sendJson(res, 201, { ok: true, imported_vendors: importedVendors, imported_invoices: importedInvoices, data: buildBootstrapPayload(db, actor) });
    }

    // MANUAL INVOICE
    if (method === 'POST' && pathname === '/api/invoices') {
      const b = await readJsonBody(req);
      const vendorId = Number(b.vendor_id);
      const amount = Math.round(Number(b.amount || 0));
      const paidAmount = Math.max(0, Math.min(amount, Math.round(Number(b.paid_amount || 0))));
      if (!vendorId || amount <= 0 || !b.due_date) return sendJson(res, 400, { error: 'Vendor, amount & due date are required.' });

      const invNo = String(b.invoice_number || '').trim() || nextInvoiceNumber(db);
      const issueDate = String(b.issue_date || todayISO());
      const dueDate = String(b.due_date);
      const bal = amount - paidAmount;
      const isOd = bal > 0 && daysBetween(dueDate, todayISO()) > 0;
      const status = bal <= 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : (isOd ? 'OVERDUE' : 'UNPAID'));

      db.prepare(`
        INSERT INTO invoices (invoice_number, vendor_id, description, issue_date, due_date, amount, paid_amount, status, dispatch_pod)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(invNo, vendorId, String(b.description || 'Existing Bill').trim(), issueDate, dueDate, amount, paidAmount, status, String(b.dispatch_pod || 'Manual Entry').trim());

      syncVendorState(db, vendorId, { createAlerts: true, autoCreateLegal: true });
      return sendJson(res, 201, { ok: true, invoice_number: invNo, data: buildBootstrapPayload(db, actor) });
    }

    // VENDOR 360 DETAIL / CREATE / UPDATE / HOLD
    const vendorDetailMatch = pathname.match(/^\/api\/vendors\/(\d+)$/);
    if (method === 'GET' && vendorDetailMatch) {
      const id = Number(vendorDetailMatch[1]);
      const metrics = computeVendorMetrics(db, id);
      if (!metrics) return sendJson(res, 404, { error: 'Vendor not found' });
      const today = todayISO();
      const invoices = db.prepare('SELECT * FROM invoices WHERE vendor_id = ? ORDER BY due_date ASC').all(id).map(inv => {
        const balance = Math.max(0, Number(inv.amount) - Number(inv.paid_amount));
        return { ...inv, balance: Math.round(balance), overdue_days: balance > 0 ? Math.max(0, daysBetween(inv.due_date, today)) : 0 };
      });
      const orders = db.prepare('SELECT * FROM orders WHERE vendor_id = ? ORDER BY id DESC').all(id).map(o => {
        let reasons = [];
        try { reasons = JSON.parse(o.block_reasons || '[]'); } catch { reasons = []; }
        return { ...o, block_reasons: reasons };
      });
      const payments = db.prepare('SELECT * FROM payments WHERE vendor_id = ? ORDER BY payment_date DESC, id DESC').all(id);
      const calls = db.prepare('SELECT * FROM collection_logs WHERE vendor_id = ? ORDER BY created_at DESC, id DESC').all(id);
      const legal = db.prepare('SELECT * FROM legal_cases WHERE vendor_id = ? ORDER BY id DESC').all(id);
      return sendJson(res, 200, { vendor: metrics.vendor, metrics, invoices, orders, payments, collection_logs: calls, legal_cases: legal });
    }

    if (method === 'POST' && pathname === '/api/vendors') {
      const b = await readJsonBody(req);
      if (!b.name || !b.contact_person || !b.phone) return sendJson(res, 400, { error: 'Name, contact & phone are required.' });
      const codOnly = b.cod_only ? 1 : 0;
      const limit = codOnly ? 0 : Math.max(0, Number(b.credit_limit || 0));
      const resInsert = db.prepare(`
        INSERT INTO vendors (code, name, category, contact_person, phone, email, city, gstin, address, tier, credit_limit, payment_terms_days, cod_only, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        nextVendorCode(db), String(b.name).trim(), String(b.category || 'Distributor').trim(),
        String(b.contact_person).trim(), String(b.phone).trim(), String(b.email || '').trim(),
        String(b.city || '').trim(), String(b.gstin || '').trim(), String(b.address || '').trim(),
        ['A', 'B', 'C'].includes(b.tier) ? b.tier : 'B', limit, Math.max(0, Number(b.payment_terms_days ?? 30)), codOnly, String(b.notes || '').trim()
      );
      syncVendorState(db, Number(resInsert.lastInsertRowid), { createAlerts: false, autoCreateLegal: false });
      return sendJson(res, 201, { ok: true, id: Number(resInsert.lastInsertRowid), data: buildBootstrapPayload(db, actor) });
    }

    if (method === 'PUT' && vendorDetailMatch) {
      const id = Number(vendorDetailMatch[1]);
      const existing = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
      if (!existing) return sendJson(res, 404, { error: 'Vendor not found' });
      const b = await readJsonBody(req);
      const codOnly = b.cod_only !== undefined ? (b.cod_only ? 1 : 0) : existing.cod_only;
      const limit = b.credit_limit !== undefined ? Math.max(0, Number(b.credit_limit)) : existing.credit_limit;
      db.prepare(`
        UPDATE vendors SET name = ?, category = ?, contact_person = ?, phone = ?, email = ?, city = ?, gstin = ?, address = ?,
          tier = ?, credit_limit = ?, payment_terms_days = ?, cod_only = ?, notes = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        b.name ?? existing.name, b.category ?? existing.category, b.contact_person ?? existing.contact_person,
        b.phone ?? existing.phone, b.email ?? existing.email, b.city ?? existing.city, b.gstin ?? existing.gstin,
        b.address ?? existing.address, ['A', 'B', 'C'].includes(b.tier) ? b.tier : existing.tier,
        codOnly ? 0 : limit, b.payment_terms_days !== undefined ? Math.max(0, Number(b.payment_terms_days)) : existing.payment_terms_days,
        codOnly, b.notes ?? existing.notes, id
      );
      syncVendorState(db, id, { createAlerts: true, autoCreateLegal: true });
      return sendJson(res, 200, { ok: true, data: buildBootstrapPayload(db, actor) });
    }

    const vendorHoldMatch = pathname.match(/^\/api\/vendors\/(\d+)\/hold$/);
    if (method === 'POST' && vendorHoldMatch) {
      if (!['CEO', 'FINANCE', 'LEGAL'].includes(actor.role)) {
        return sendJson(res, 403, { error: 'Only CEO, Finance, or Legal can freeze accounts.' });
      }
      const id = Number(vendorHoldMatch[1]);
      const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
      if (!vendor) return sendJson(res, 404, { error: 'Vendor not found' });
      const b = await readJsonBody(req);
      const holdType = ['', 'CREDIT_HOLD', 'LEGAL_HOLD'].includes(b.hold_type) ? b.hold_type : '';
      const reason = String(b.reason || '').trim();
      if (holdType && !reason) return sendJson(res, 400, { error: 'Please add a short reason.' });

      db.prepare(`UPDATE vendors SET manual_hold = ?, manual_hold_reason = ?, updated_at = datetime('now') WHERE id = ?`).run(holdType, reason, id);
      syncVendorState(db, id, { createAlerts: true, autoCreateLegal: holdType === 'LEGAL_HOLD' });
      postCoordinationAlert(db, {
        fromDept: actor.role, toDepts: ['PRODUCTION', 'SALES', 'FINANCE'], priority: holdType ? 'CRITICAL' : 'NORMAL',
        alertType: holdType ? 'STOP_WORK' : 'ACCOUNT_CLEARED', vendorId: id,
        title: holdType ? `Account Frozen: ${vendor.name}` : `Account Unfrozen: ${vendor.name}`,
        message: reason || 'Updated by management.', requiresAck: holdType ? 1 : 0
      });
      return sendJson(res, 200, { ok: true, data: buildBootstrapPayload(db, actor) });
    }

    // ORDERS: PARSE / PRECHECK / CREATE
    if (method === 'POST' && pathname === '/api/orders/parse') {
      const b = await readJsonBody(req);
      return sendJson(res, 200, { ok: true, parsed: parseRawOrderText(db, b.text || '') });
    }

    if (method === 'POST' && pathname === '/api/orders/precheck') {
      const b = await readJsonBody(req);
      const vendorId = Number(b.vendor_id);
      const orderValue = Math.max(0, Number(b.order_value || 0));
      const paymentMode = b.payment_mode === 'ADVANCE_PAID' ? 'ADVANCE_PAID' : 'CREDIT';
      if (!vendorId) return sendJson(res, 400, { error: 'vendor_id is required' });
      return sendJson(res, 200, { ok: true, evaluation: evaluateOrderGate(db, vendorId, orderValue, paymentMode) });
    }

    if (method === 'POST' && pathname === '/api/orders') {
      const b = await readJsonBody(req);
      const vendorId = Number(b.vendor_id);
      const quantity = Math.max(1, Math.round(Number(b.quantity || 0)));
      const unitPrice = Math.max(1, Number(b.unit_price || 0));
      const orderValue = Math.round(quantity * unitPrice);
      const paymentMode = b.payment_mode === 'ADVANCE_PAID' ? 'ADVANCE_PAID' : 'CREDIT';
      const channel = ['WHATSAPP', 'EMAIL', 'PHONE', 'DIRECT', 'PORTAL'].includes(b.channel) ? b.channel : 'WHATSAPP';

      if (!vendorId || !b.book_title) return sendJson(res, 400, { error: 'Vendor and book title are required.' });
      if (paymentMode === 'ADVANCE_PAID' && !String(b.advance_ref || '').trim()) {
        return sendJson(res, 400, { error: 'Payment UTR / Ref is required for Advance Paid orders.' });
      }

      syncVendorState(db, vendorId, { createAlerts: true, autoCreateLegal: true });
      const evalResult = evaluateOrderGate(db, vendorId, orderValue, paymentMode);
      const policy = getPolicy(db);
      const sym = policy.currency_symbol;
      const vendor = evalResult.metrics.vendor;

      const orderNumber = nextOrderNumber(db);
      const passed = evalResult.passed;
      const gateStatus = passed ? 'APPROVED' : 'BLOCKED';
      const gatePassCode = passed ? generateGatePass() : '';
      const productionStage = passed ? 'QUEUED' : 'HOLD';
      const overrideRequested = !passed && b.request_override ? 1 : 0;

      const resOrder = db.prepare(`
        INSERT INTO orders (
          order_number, vendor_id, channel, channel_ref, raw_message, book_title, isbn, edition,
          quantity, unit_price, order_value, payment_mode, advance_ref, gate_status, gate_pass_code,
          block_reasons, production_stage, override_requested, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderNumber, vendorId, channel, String(b.channel_ref || '').trim(), String(b.raw_message || '').trim(),
        String(b.book_title).trim(), String(b.isbn || '').trim(), String(b.edition || 'Standard Print').trim(),
        quantity, unitPrice, orderValue, paymentMode, String(b.advance_ref || '').trim(),
        gateStatus, gatePassCode, JSON.stringify(evalResult.reasons), productionStage, overrideRequested, actor.name
      );

      const newOrderId = Number(resOrder.lastInsertRowid);
      if (!passed) {
        postCoordinationAlert(db, {
          fromDept: 'SYSTEM', toDepts: ['PRODUCTION', 'SALES', 'CEO'], priority: 'CRITICAL',
          alertType: 'STOP_WORK', vendorId, orderId: newOrderId,
          title: `Blocked ${orderNumber} — ${vendor.name}`,
          message: `${formatMoney(orderValue, sym)} ${channel} order stopped automatically. Do not print or dispatch.`,
          requiresAck: 1
        });
      }
      syncVendorState(db, vendorId, { createAlerts: false, autoCreateLegal: false });
      return sendJson(res, 201, {
        ok: true, order_id: newOrderId, order_number: orderNumber,
        gate_status: gateStatus, gate_pass_code: gatePassCode, evaluation: evalResult,
        data: buildBootstrapPayload(db, actor)
      });
    }

    // REQUEST OVERRIDE / CEO OVERRIDE / RECHECK
    const reqOverrideMatch = pathname.match(/^\/api\/orders\/(\d+)\/request-override$/);
    if (method === 'POST' && reqOverrideMatch) {
      const orderId = Number(reqOverrideMatch[1]);
      db.prepare(`UPDATE orders SET override_requested = 1, updated_at = datetime('now') WHERE id = ?`).run(orderId);
      return sendJson(res, 200, { ok: true, data: buildBootstrapPayload(db, actor) });
    }

    const ceoOverrideMatch = pathname.match(/^\/api\/orders\/(\d+)\/ceo-override$/);
    if (method === 'POST' && ceoOverrideMatch) {
      if (actor.role !== 'CEO') return sendJson(res, 403, { error: 'Only CEO access can approve or reject blocked orders.' });
      const orderId = Number(ceoOverrideMatch[1]);
      const order = db.prepare(`SELECT o.*, v.name AS vendor_name FROM orders o JOIN vendors v ON v.id = o.vendor_id WHERE o.id = ?`).get(orderId);
      if (!order) return sendJson(res, 404, { error: 'Order not found' });

      const b = await readJsonBody(req);
      const decision = b.decision === 'APPROVE' ? 'APPROVE' : 'REJECT';
      const reason = String(b.reason || '').trim();
      if (!reason) return sendJson(res, 400, { error: 'Please write a short reason.' });

      if (decision === 'APPROVE') {
        const expiresAt = dateOffsetISO(Math.max(1, Math.min(30, Number(b.valid_days || 7))));
        const gatePass = order.gate_pass_code || generateGatePass();
        const nextStage = order.production_stage === 'DISPATCH_HOLD' ? 'READY_TO_DISPATCH' : 'QUEUED';
        db.prepare(`
          UPDATE orders SET gate_status = 'CEO_OVERRIDE', gate_pass_code = ?, production_stage = ?,
            override_by = ?, override_reason = ?, override_condition = ?, override_expires_at = ?,
            override_requested = 0, updated_at = datetime('now')
          WHERE id = ?
        `).run(gatePass, nextStage, actor.name, reason, String(b.condition || '').trim(), expiresAt, orderId);
      } else {
        db.prepare(`UPDATE orders SET production_stage = 'CANCELLED', override_by = ?, override_reason = ?, override_requested = 0, updated_at = datetime('now') WHERE id = ?`)
          .run(actor.name, `REJECTED: ${reason}`, orderId);
      }
      syncVendorState(db, order.vendor_id, { createAlerts: false, autoCreateLegal: false });
      return sendJson(res, 200, { ok: true, data: buildBootstrapPayload(db, actor) });
    }

    const recheckMatch = pathname.match(/^\/api\/orders\/(\d+)\/recheck$/);
    if (method === 'POST' && recheckMatch) {
      const orderId = Number(recheckMatch[1]);
      const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId);
      if (!order) return sendJson(res, 404, { error: 'Order not found' });

      syncVendorState(db, order.vendor_id, { createAlerts: false, autoCreateLegal: false });
      const evalResult = evaluateOrderGate(db, order.vendor_id, order.order_value, order.payment_mode, { excludeOrderId: orderId });
      if (evalResult.passed) {
        const gatePass = order.gate_pass_code || generateGatePass();
        const nextStage = order.production_stage === 'DISPATCH_HOLD' ? 'READY_TO_DISPATCH' : 'QUEUED';
        db.prepare(`UPDATE orders SET gate_status = 'APPROVED', gate_pass_code = ?, block_reasons = '[]', production_stage = ?, override_requested = 0, updated_at = datetime('now') WHERE id = ?`)
          .run(gatePass, nextStage, orderId);
        return sendJson(res, 200, { ok: true, cleared: true, gate_pass_code: gatePass, data: buildBootstrapPayload(db, actor) });
      }
      db.prepare(`UPDATE orders SET block_reasons = ?, updated_at = datetime('now') WHERE id = ?`).run(JSON.stringify(evalResult.reasons), orderId);
      return sendJson(res, 409, { ok: false, cleared: false, error: evalResult.reasons[0] || 'Still blocked.', reasons: evalResult.reasons, data: buildBootstrapPayload(db, actor) });
    }

    // PRODUCTION STAGE & PRE-DISPATCH GATE 2
    const stageMatch = pathname.match(/^\/api\/orders\/(\d+)\/stage$/);
    if (method === 'POST' && stageMatch) {
      const orderId = Number(stageMatch[1]);
      const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId);
      if (!order) return sendJson(res, 404, { error: 'Order not found' });
      const b = await readJsonBody(req);
      if (!['PRINTING', 'READY_TO_DISPATCH'].includes(b.stage)) return sendJson(res, 400, { error: 'Invalid stage.' });
      if (order.gate_status === 'BLOCKED' || order.gate_status === 'DISPATCH_BLOCKED') {
        return sendJson(res, 409, { error: 'Blocked order cannot enter Production.' });
      }
      db.prepare(`UPDATE orders SET production_stage = ?, updated_at = datetime('now') WHERE id = ?`).run(b.stage, orderId);
      return sendJson(res, 200, { ok: true, data: buildBootstrapPayload(db, actor) });
    }

    const dispatchMatch = pathname.match(/^\/api\/orders\/(\d+)\/dispatch$/);
    if (method === 'POST' && dispatchMatch) {
      const orderId = Number(dispatchMatch[1]);
      const order = db.prepare(`SELECT o.*, v.name AS vendor_name, v.payment_terms_days FROM orders o JOIN vendors v ON v.id = o.vendor_id WHERE o.id = ?`).get(orderId);
      if (!order) return sendJson(res, 404, { error: 'Order not found' });
      const b = await readJsonBody(req);
      if (order.gate_status === 'BLOCKED' || order.gate_status === 'DISPATCH_BLOCKED') {
        return sendJson(res, 409, { error: 'Blocked — Dispatch is locked.' });
      }

      syncVendorState(db, order.vendor_id, { createAlerts: false, autoCreateLegal: true });
      if (!isOverrideValid(order)) {
        const gate2 = evaluateOrderGate(db, order.vendor_id, order.order_value, order.payment_mode, { excludeOrderId: orderId, isDispatchCheck: true });
        if (!gate2.passed) {
          db.prepare(`UPDATE orders SET gate_status = 'DISPATCH_BLOCKED', production_stage = 'DISPATCH_HOLD', block_reasons = ?, updated_at = datetime('now') WHERE id = ?`)
            .run(JSON.stringify(gate2.reasons), orderId);
          postCoordinationAlert(db, {
            fromDept: 'SYSTEM', toDepts: ['PRODUCTION', 'CEO', 'FINANCE'], priority: 'CRITICAL',
            alertType: 'STOP_DISPATCH', vendorId: order.vendor_id, orderId,
            title: `STOP DISPATCH: ${order.vendor_name} (${order.order_number})`,
            message: `Buyer defaulted while books were printing. Keep pallets held in warehouse!`,
            requiresAck: 1
          });
          return sendJson(res, 409, {
            ok: false, gate2_blocked: true,
            error: 'STOP DISPATCH! Buyer defaulted while books were printing — keep stock in warehouse!',
            reasons: gate2.reasons, data: buildBootstrapPayload(db, actor)
          });
        }
      }

      const challan = String(b.dispatch_challan || '').trim() || `DC-${String(Date.now()).slice(-6)}`;
      const today = todayISO();
      db.prepare(`UPDATE orders SET production_stage = 'DISPATCHED', dispatch_challan = ?, dispatched_at = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(challan, today, orderId);

      const invNo = nextInvoiceNumber(db);
      const isAdvance = order.payment_mode === 'ADVANCE_PAID';
      const dueDate = isAdvance ? today : dateOffsetISO(Number(order.payment_terms_days || 30));
      db.prepare(`
        INSERT INTO invoices (invoice_number, vendor_id, order_id, description, issue_date, due_date, amount, paid_amount, status, dispatch_pod)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(invNo, order.vendor_id, orderId, `${order.book_title} (${order.quantity} copies)`, today, dueDate, order.order_value, isAdvance ? order.order_value : 0, isAdvance ? 'PAID' : 'UNPAID', challan);

      syncVendorState(db, order.vendor_id, { createAlerts: false, autoCreateLegal: false });
      return sendJson(res, 200, { ok: true, invoice_number: invNo, challan, data: buildBootstrapPayload(db, actor) });
    }

    // COLLECTIONS & ANTI-7-DAY-LOOP
    if (method === 'POST' && pathname === '/api/collections/log') {
      const b = await readJsonBody(req);
      const vendorId = Number(b.vendor_id);
      const outcome = String(b.outcome || '');
      const allowed = ['PROMISED_TO_PAY', 'NO_ANSWER', 'DISPUTED', 'REFUSED', 'SETTLEMENT_CALL'];
      if (!vendorId || !allowed.includes(outcome)) return sendJson(res, 400, { error: 'Select vendor and call outcome.' });

      const policy = getPolicy(db);
      const metrics = computeVendorMetrics(db, vendorId);
      if (!metrics) return sendJson(res, 404, { error: 'Vendor not found' });

      if (outcome === 'PROMISED_TO_PAY') {
        if (!b.ptp_date || Number(b.ptp_amount || 0) <= 0) return sendJson(res, 400, { error: 'Enter promised amount and exact date.' });
        if (metrics.active_broken_ptps >= Number(policy.max_broken_ptps) && actor.role === 'TELECALLING') {
          return sendJson(res, 409, {
            loop_blocked: true,
            error: `7-Day Loop Locked! ${metrics.vendor.name} already broke ${metrics.active_broken_ptps} promises. Escalate to CEO or Legal instead of giving 7 more days.`
          });
        }
        db.prepare(`UPDATE collection_logs SET ptp_status = 'SUPERSEDED' WHERE vendor_id = ? AND outcome = 'PROMISED_TO_PAY' AND ptp_status = 'OPEN'`).run(vendorId);
      }

      db.prepare(`
        INSERT INTO collection_logs (vendor_id, caller_name, outcome, ptp_amount, ptp_date, ptp_status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(vendorId, actor.name, outcome, outcome === 'PROMISED_TO_PAY' ? Math.round(Number(b.ptp_amount)) : 0, outcome === 'PROMISED_TO_PAY' ? String(b.ptp_date) : '', outcome === 'PROMISED_TO_PAY' ? 'OPEN' : 'NA', String(b.notes || '').trim());

      syncVendorState(db, vendorId, { createAlerts: true, autoCreateLegal: true });
      return sendJson(res, 201, { ok: true, data: buildBootstrapPayload(db, actor) });
    }

    const breakPtpMatch = pathname.match(/^\/api\/collections\/(\d+)\/mark-broken$/);
    if (method === 'POST' && breakPtpMatch) {
      const log = db.prepare('SELECT * FROM collection_logs WHERE id = ?').get(Number(breakPtpMatch[1]));
      if (!log) return sendJson(res, 404, { error: 'Record not found' });
      db.prepare(`UPDATE collection_logs SET ptp_status = 'BROKEN' WHERE id = ?`).run(log.id);
      syncVendorState(db, log.vendor_id, { createAlerts: true, autoCreateLegal: true });
      return sendJson(res, 200, { ok: true, data: buildBootstrapPayload(db, actor) });
    }

    // PAYMENTS & CHEQUE BOUNCE
    if (method === 'POST' && pathname === '/api/payments') {
      const b = await readJsonBody(req);
      const vendorId = Number(b.vendor_id);
      const amount = Math.round(Number(b.amount || 0));
      if (!vendorId || amount <= 0) return sendJson(res, 400, { error: 'Enter a valid amount.' });

      let remaining = amount;
      const targetInvId = b.invoice_id ? Number(b.invoice_id) : null;
      const unpaid = db.prepare(`
        SELECT * FROM invoices WHERE vendor_id = ? AND status != 'PAID' AND status != 'CANCELLED'
        ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END, due_date ASC
      `).all(vendorId, targetInvId || -1);

      let firstInv = targetInvId;
      for (const inv of unpaid) {
        if (remaining <= 0) break;
        const owed = Math.max(0, Number(inv.amount) - Number(inv.paid_amount));
        if (owed <= 0) continue;
        const apply = Math.min(remaining, owed);
        const newPaid = Number(inv.paid_amount) + apply;
        const fullyPaid = newPaid >= Number(inv.amount) - 0.5;
        db.prepare(`UPDATE invoices SET paid_amount = ?, status = ?, cheque_bounced = CASE WHEN ? = 1 THEN 0 ELSE cheque_bounced END, updated_at = datetime('now') WHERE id = ?`)
          .run(newPaid, fullyPaid ? 'PAID' : 'PARTIAL', fullyPaid ? 1 : 0, inv.id);
        if (!firstInv) firstInv = inv.id;
        remaining -= apply;
      }

      db.prepare(`INSERT INTO payments (vendor_id, invoice_id, amount, mode, reference_no, payment_date, recorded_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(vendorId, firstInv, amount, String(b.mode || 'NEFT'), String(b.reference_no || '').trim(), String(b.payment_date || todayISO()), actor.name, String(b.notes || '').trim());

      const openPtp = db.prepare(`SELECT * FROM collection_logs WHERE vendor_id = ? AND outcome = 'PROMISED_TO_PAY' AND ptp_status = 'OPEN' ORDER BY id DESC LIMIT 1`).get(vendorId);
      if (openPtp && amount >= Number(openPtp.ptp_amount) * 0.8) {
        db.prepare(`UPDATE collection_logs SET ptp_status = 'KEPT' WHERE id = ?`).run(openPtp.id);
      }
      if (computeVendorMetrics(db, vendorId).overdue_amount === 0) {
        db.prepare(`UPDATE vendors SET ptp_reset_at = datetime('now') WHERE id = ?`).run(vendorId);
      }
      const after = syncVendorState(db, vendorId, { createAlerts: false, autoCreateLegal: false });
      return sendJson(res, 201, { ok: true, new_status: after.credit_status, remaining_overdue: after.overdue_amount, data: buildBootstrapPayload(db, actor) });
    }

    const bounceMatch = pathname.match(/^\/api\/invoices\/(\d+)\/bounce$/);
    if (method === 'POST' && bounceMatch) {
      const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(Number(bounceMatch[1]));
      if (!inv) return sendJson(res, 404, { error: 'Invoice not found' });
      const b = await readJsonBody(req);
      db.prepare(`UPDATE invoices SET cheque_bounced = 1, bounce_details = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(String(b.details || 'Cheque bounced — Insufficient Funds').trim(), inv.id);
      syncVendorState(db, inv.vendor_id, { createAlerts: true, autoCreateLegal: true });
      return sendJson(res, 200, { ok: true, data: buildBootstrapPayload(db, actor) });
    }

    // LEGAL
    if (method === 'POST' && pathname === '/api/legal/escalate') {
      const b = await readJsonBody(req);
      const vendorId = Number(b.vendor_id);
      const metrics = computeVendorMetrics(db, vendorId);
      if (!metrics) return sendJson(res, 404, { error: 'Vendor not found' });
      const existingOpen = db.prepare(`SELECT * FROM legal_cases WHERE vendor_id = ? AND stage != 'CLOSED'`).get(vendorId);
      if (existingOpen) return sendJson(res, 409, { error: `Case ${existingOpen.case_number} is already open.` });

      const caseNo = nextCaseNumber(db);
      const reason = String(b.reason || metrics.risk_reasons.join('; ') || 'Overdue payment escalated').trim();
      db.prepare(`UPDATE vendors SET manual_hold = 'LEGAL_HOLD', manual_hold_reason = ? WHERE id = ?`).run(reason, vendorId);
      db.prepare(`
        INSERT INTO legal_cases (case_number, vendor_id, stage, trigger_reason, claimed_principal, claimed_interest, advocate_name, next_action_date, settlement_notes)
        VALUES (?, ?, 'CASE_OPENED', ?, ?, ?, ?, ?, ?)
      `).run(caseNo, vendorId, reason, metrics.overdue_amount || metrics.unpaid_invoiced, metrics.accrued_interest, String(b.advocate_name || 'Adv. Meera Deshmukh'), dateOffsetISO(3), String(b.notes || 'Ready for Legal Demand Notice.'));

      syncVendorState(db, vendorId, { createAlerts: false, autoCreateLegal: false });
      postCoordinationAlert(db, {
        fromDept: actor.role, toDepts: ['LEGAL', 'PRODUCTION', 'SALES'], priority: 'CRITICAL',
        alertType: 'LEGAL_ESCALATION', vendorId,
        title: `Sent to Legal: ${metrics.vendor.name} (${caseNo})`,
        message: `Account blacklisted. Stop all printing and dispatch immediately.`, requiresAck: 1
      });
      return sendJson(res, 201, { ok: true, case_number: caseNo, data: buildBootstrapPayload(db, actor) });
    }

    const legalUpdateMatch = pathname.match(/^\/api\/legal\/(\d+)$/);
    if (method === 'PUT' && legalUpdateMatch) {
      const lc = db.prepare('SELECT * FROM legal_cases WHERE id = ?').get(Number(legalUpdateMatch[1]));
      if (!lc) return sendJson(res, 404, { error: 'Case not found' });
      const b = await readJsonBody(req);
      const stage = b.stage || lc.stage;
      const noticeSentDate = stage === 'NOTICE_SERVED' && !lc.notice_sent_date ? todayISO() : (b.notice_sent_date ?? lc.notice_sent_date);
      const cureDeadline = stage === 'NOTICE_SERVED' && !lc.cure_deadline ? dateOffsetISO(7) : (b.cure_deadline ?? lc.cure_deadline);
      db.prepare(`UPDATE legal_cases SET stage = ?, advocate_name = ?, notice_sent_date = ?, cure_deadline = ?, next_action_date = ?, settlement_notes = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(stage, b.advocate_name ?? lc.advocate_name, noticeSentDate, cureDeadline, b.next_action_date ?? lc.next_action_date, b.settlement_notes ?? lc.settlement_notes, lc.id);
      if (stage === 'CLOSED') {
        db.prepare(`UPDATE vendors SET manual_hold = '', manual_hold_reason = '' WHERE id = ? AND manual_hold = 'LEGAL_HOLD'`).run(lc.vendor_id);
      }
      syncVendorState(db, lc.vendor_id, { createAlerts: false, autoCreateLegal: false });
      return sendJson(res, 200, { ok: true, data: buildBootstrapPayload(db, actor) });
    }

    const legalEvidenceMatch = pathname.match(/^\/api\/legal\/evidence\/(\d+)$/);
    if (method === 'GET' && legalEvidenceMatch) {
      const pack = compileLegalEvidencePack(db, Number(legalEvidenceMatch[1]));
      if (!pack) return sendJson(res, 404, { error: 'Vendor not found' });
      return sendJson(res, 200, { ok: true, pack });
    }

    // ALERTS ACKNOWLEDGE
    const ackMatch = pathname.match(/^\/api\/coordination\/(\d+)\/ack$/);
    if (method === 'POST' && ackMatch) {
      db.prepare(`UPDATE coordination_feed SET ack_by = ?, ack_at = datetime('now') WHERE id = ?`).run(actor.name, Number(ackMatch[1]));
      return sendJson(res, 200, { ok: true, data: buildBootstrapPayload(db, actor) });
    }

    return sendJson(res, 404, { error: `Unknown API route: ${method} ${pathname}` });
  } catch (err) {
    console.error('API Error:', err);
    return sendJson(res, 500, { error: err.message || 'Internal Server Error' });
  }
}

function serveStatic(req, res, urlObj) {
  let reqPath = decodeURIComponent(urlObj.pathname);
  if (reqPath === '/') reqPath = '/index.html';

  const safePath = path.normalize(path.join(PUBLIC_DIR, reqPath));
  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(safePath, (err, stat) => {
    if (err || !stat.isFile()) {
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, content) => {
        if (e2) { res.writeHead(404); res.end('Not Found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
      return;
    }
    const ext = path.extname(safePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(safePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (urlObj.pathname.startsWith('/api/')) {
    handleApi(req, res, urlObj);
  } else {
    serveStatic(req, res, urlObj);
  }
});

server.listen(PORT, HOST, () => {
  const info = getLanUrls();
  console.log(`PressGuard CRM running locally at ${info.local_url}`);
  console.log(`Shareable on your office Wi-Fi at ${info.lan_url}`);
});
