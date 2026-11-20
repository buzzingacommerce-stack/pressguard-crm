import { todayISO, dateOffsetISO, daysBetween } from './db.js';

export function getPolicy(db) {
  return db.prepare('SELECT * FROM policies WHERE id = 1').get();
}

export function formatMoney(amount, symbol = '₹') {
  const num = Number(amount || 0);
  if (symbol === '₹') {
    return `${symbol}${Math.round(num).toLocaleString('en-IN')}`;
  }
  return `${symbol}${Math.round(num).toLocaleString('en-US')}`;
}

export function recordAudit(db, { actorRole, actorName, action, entityType, entityId = null, summary, details = {} }) {
  db.prepare(`
    INSERT INTO audit_logs (actor_role, actor_name, action, entity_type, entity_id, summary, details)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(actorRole, actorName, action, entityType, entityId, summary, JSON.stringify(details));
}

export function postCoordinationAlert(db, {
  fromDept,
  toDepts,
  priority = 'NORMAL',
  alertType = 'NOTE',
  vendorId = null,
  orderId = null,
  title,
  message,
  requiresAck = 0
}) {
  const toStr = Array.isArray(toDepts) ? toDepts.join(',') : String(toDepts || 'ALL');
  const res = db.prepare(`
    INSERT INTO coordination_feed (from_dept, to_depts, priority, alert_type, vendor_id, order_id, title, message, requires_ack)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(fromDept, toStr, priority, alertType, vendorId, orderId, title, message, requiresAck ? 1 : 0);
  return Number(res.lastInsertRowid);
}

export function generateCode(prefix, num) {
  const yr = String(new Date().getFullYear()).slice(-2);
  return `${prefix}-${yr}-${String(num).padStart(4, '0')}`;
}

export function nextOrderNumber(db) {
  const row = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM orders').get();
  return generateCode('ORD', 1000 + Number(row.next_id));
}

export function nextInvoiceNumber(db) {
  const row = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM invoices').get();
  return generateCode('INV', 5000 + Number(row.next_id));
}

export function nextCaseNumber(db) {
  const row = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM legal_cases').get();
  return generateCode('LEG', 100 + Number(row.next_id));
}

export function nextVendorCode(db) {
  const row = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM vendors').get();
  return `VND-${String(100 + Number(row.next_id)).padStart(3, '0')}`;
}

export function generateGatePass() {
  const now = new Date();
  const ym = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `GP-${ym}-${rand}`;
}

export function sweepExpiredPtps(db, vendorId = null, createAlerts = true) {
  const today = todayISO();
  const policy = getPolicy(db);
  const query = vendorId
    ? `SELECT cl.*, v.name AS vendor_name FROM collection_logs cl JOIN vendors v ON v.id = cl.vendor_id
       WHERE cl.vendor_id = ? AND cl.outcome = 'PROMISED_TO_PAY' AND cl.ptp_status = 'OPEN' AND cl.ptp_date != '' AND cl.ptp_date < ?`
    : `SELECT cl.*, v.name AS vendor_name FROM collection_logs cl JOIN vendors v ON v.id = cl.vendor_id
       WHERE cl.outcome = 'PROMISED_TO_PAY' AND cl.ptp_status = 'OPEN' AND cl.ptp_date != '' AND cl.ptp_date < ?`;

  const expired = vendorId ? db.prepare(query).all(vendorId, today) : db.prepare(query).all(today);
  if (!expired.length) return [];

  const updateStmt = db.prepare(`UPDATE collection_logs SET ptp_status = 'BROKEN' WHERE id = ?`);
  const brokenList = [];

  for (const row of expired) {
    updateStmt.run(row.id);
    brokenList.push(row);
    recordAudit(db, {
      actorRole: 'SYSTEM',
      actorName: 'PressGuard Engine',
      action: 'PTP_BROKEN',
      entityType: 'vendor',
      entityId: row.vendor_id,
      summary: `Promise-to-Pay of ${formatMoney(row.ptp_amount, policy.currency_symbol)} due ${row.ptp_date} broken by ${row.vendor_name}`,
      details: { collection_log_id: row.id, ptp_date: row.ptp_date, ptp_amount: row.ptp_amount }
    });
    if (createAlerts) {
      postCoordinationAlert(db, {
        fromDept: 'SYSTEM',
        toDepts: ['TELECALLING', 'FINANCE', 'CEO'],
        priority: 'HIGH',
        alertType: 'BROKEN_PTP',
        vendorId: row.vendor_id,
        title: `Broken Promise-to-Pay: ${row.vendor_name}`,
        message: `Promised ${formatMoney(row.ptp_amount, policy.currency_symbol)} by ${row.ptp_date} was not received. Strike count incremented.`,
        requiresAck: 0
      });
    }
  }
  return brokenList;
}

export function computeVendorMetrics(db, vendorId, { excludeOrderId = null } = {}) {
  const policy = getPolicy(db);
  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(vendorId);
  if (!vendor) return null;

  const today = todayISO();
  const invoices = db.prepare(`
    SELECT * FROM invoices WHERE vendor_id = ? AND status != 'CANCELLED' ORDER BY due_date ASC
  `).all(vendorId);

  let unpaidInvoiced = 0;
  let overdueAmount = 0;
  let currentNotDue = 0;
  let maxOverdueDays = 0;
  let hasBouncedCheque = false;
  let unpaidInvoiceCount = 0;
  let overdueInvoiceCount = 0;
  let accruedInterest = 0;

  const aging = { current: 0, d1_15: 0, d16_30: 0, d31_60: 0, d61_plus: 0 };

  for (const inv of invoices) {
    const balance = Math.max(0, Number(inv.amount) - Number(inv.paid_amount));
    if (balance <= 0.01 || inv.status === 'PAID') continue;

    unpaidInvoiced += balance;
    unpaidInvoiceCount += 1;
    if (inv.cheque_bounced) hasBouncedCheque = true;

    const overdueDays = daysBetween(inv.due_date, today);
    if (overdueDays > 0) {
      overdueAmount += balance;
      overdueInvoiceCount += 1;
      if (overdueDays > maxOverdueDays) maxOverdueDays = overdueDays;
      accruedInterest += balance * (Number(policy.interest_rate_pa) / 100) * (overdueDays / 365);

      if (overdueDays <= 15) aging.d1_15 += balance;
      else if (overdueDays <= 30) aging.d16_30 += balance;
      else if (overdueDays <= 60) aging.d31_60 += balance;
      else aging.d61_plus += balance;
    } else {
      currentNotDue += balance;
      aging.current += balance;
    }
  }

  const orders = db.prepare(`SELECT * FROM orders WHERE vendor_id = ?`).all(vendorId);
  let inProductionValue = 0;
  let inProductionCount = 0;
  let blockedOrdersValue = 0;
  let blockedOrdersCount = 0;

  for (const ord of orders) {
    if (excludeOrderId && Number(ord.id) === Number(excludeOrderId)) continue;
    if (ord.production_stage === 'CANCELLED' || ord.production_stage === 'DISPATCHED') continue;

    if (ord.gate_status === 'BLOCKED' || ord.gate_status === 'DISPATCH_BLOCKED') {
      blockedOrdersValue += Number(ord.order_value);
      blockedOrdersCount += 1;
    } else if (['QUEUED', 'PRINTING', 'READY_TO_DISPATCH'].includes(ord.production_stage)) {
      inProductionValue += Number(ord.order_value);
      inProductionCount += 1;
    }
  }

  const totalExposure = unpaidInvoiced + inProductionValue;
  const creditLimit = Number(vendor.credit_limit || 0);
  const creditAvailable = Math.max(0, creditLimit - totalExposure);
  const utilizationPct = creditLimit > 0 ? Math.round((totalExposure / creditLimit) * 100) : (totalExposure > 0 ? 100 : 0);

  // Broken PTP stats (active since ptp_reset_at)
  const ptpLogs = db.prepare(`
    SELECT * FROM collection_logs WHERE vendor_id = ? ORDER BY created_at DESC, id DESC
  `).all(vendorId);

  let totalBrokenPtps = 0;
  let activeBrokenPtps = 0;
  let openPtp = null;

  for (const log of ptpLogs) {
    if (log.ptp_status === 'BROKEN') {
      totalBrokenPtps += 1;
      if (!vendor.ptp_reset_at || log.created_at >= vendor.ptp_reset_at) {
        activeBrokenPtps += 1;
      }
    }
    if (!openPtp && log.outcome === 'PROMISED_TO_PAY' && log.ptp_status === 'OPEN') {
      openPtp = log;
    }
  }

  const activeLegalCase = db.prepare(`
    SELECT * FROM legal_cases WHERE vendor_id = ? AND stage != 'CLOSED' ORDER BY id DESC LIMIT 1
  `).get(vendorId) || null;

  // Determine Escalation Level & Recommended Status
  const riskReasons = [];
  let escalationLevel = 0;
  let creditStatus = vendor.cod_only ? 'COD_ONLY' : 'ACTIVE';

  const legalValueAgeThreshold = Math.max(15, Math.floor(Number(policy.legal_overdue_days) / 2));
  const triggersLegal =
    Boolean(activeLegalCase) ||
    vendor.manual_hold === 'LEGAL_HOLD' ||
    hasBouncedCheque ||
    maxOverdueDays >= Number(policy.legal_overdue_days) ||
    (overdueAmount >= Number(policy.legal_value_threshold) && maxOverdueDays >= legalValueAgeThreshold);

  const triggersCeo =
    maxOverdueDays >= Number(policy.ceo_overdue_days) ||
    (overdueAmount >= Number(policy.ceo_value_threshold) && maxOverdueDays >= Number(policy.overdue_hold_days));

  const triggersHold =
    vendor.manual_hold === 'CREDIT_HOLD' ||
    maxOverdueDays >= Number(policy.overdue_hold_days) ||
    activeBrokenPtps >= Number(policy.max_broken_ptps) ||
    (creditLimit > 0 && totalExposure > creditLimit);

  const triggersWarning =
    maxOverdueDays > 0 ||
    utilizationPct >= Number(policy.soft_warning_pct) ||
    activeBrokenPtps > 0;

  if (hasBouncedCheque) riskReasons.push('Unresolved bounced cheque on file');
  if (maxOverdueDays >= Number(policy.legal_overdue_days)) {
    riskReasons.push(`Invoice overdue ${maxOverdueDays} days (exceeds ${policy.legal_overdue_days}d Legal threshold)`);
  } else if (maxOverdueDays >= Number(policy.ceo_overdue_days)) {
    riskReasons.push(`Invoice overdue ${maxOverdueDays} days (exceeds ${policy.ceo_overdue_days}d CEO threshold)`);
  } else if (maxOverdueDays >= Number(policy.overdue_hold_days)) {
    riskReasons.push(`Invoice overdue ${maxOverdueDays} days (exceeds ${policy.overdue_hold_days}d Credit Hold limit)`);
  } else if (maxOverdueDays > 0) {
    riskReasons.push(`Invoice overdue ${maxOverdueDays} days`);
  }

  if (overdueAmount >= Number(policy.legal_value_threshold) && maxOverdueDays >= legalValueAgeThreshold) {
    riskReasons.push(`High-value default of ${formatMoney(overdueAmount, policy.currency_symbol)} aged ${maxOverdueDays}d`);
  } else if (overdueAmount >= Number(policy.ceo_value_threshold) && maxOverdueDays >= Number(policy.overdue_hold_days)) {
    riskReasons.push(`Executive-tier overdue balance of ${formatMoney(overdueAmount, policy.currency_symbol)}`);
  }

  if (activeBrokenPtps >= Number(policy.max_broken_ptps)) {
    riskReasons.push(`${activeBrokenPtps} Broken Promises-to-Pay (exceeds ${policy.max_broken_ptps}-strike limit)`);
  } else if (activeBrokenPtps > 0) {
    riskReasons.push(`${activeBrokenPtps} Broken Promise-to-Pay on record`);
  }

  if (creditLimit > 0 && totalExposure > creditLimit) {
    riskReasons.push(`Credit limit exceeded (${utilizationPct}% of ${formatMoney(creditLimit, policy.currency_symbol)})`);
  } else if (utilizationPct >= Number(policy.soft_warning_pct) && creditLimit > 0) {
    riskReasons.push(`High credit utilization (${utilizationPct}%)`);
  }

  if (vendor.manual_hold) {
    riskReasons.push(`Manual ${vendor.manual_hold.replace('_', ' ')}: ${vendor.manual_hold_reason || 'Executive freeze'}`);
  }

  if (triggersLegal) {
    escalationLevel = 4;
    creditStatus = 'LEGAL_HOLD';
  } else if (triggersCeo) {
    escalationLevel = 3;
    creditStatus = 'CREDIT_HOLD';
  } else if (triggersHold) {
    escalationLevel = 2;
    creditStatus = 'CREDIT_HOLD';
  } else if (triggersWarning) {
    escalationLevel = 1;
    creditStatus = vendor.cod_only ? 'COD_ONLY' : 'WARNING';
  } else {
    escalationLevel = 0;
    creditStatus = vendor.cod_only ? 'COD_ONLY' : 'ACTIVE';
  }

  // Trust score (0 - 100)
  let trustScore = 96;
  if (vendor.tier === 'B') trustScore = 88;
  if (vendor.tier === 'C') trustScore = 76;
  trustScore -= Math.min(35, Math.floor(maxOverdueDays * 0.7));
  trustScore -= Math.min(30, activeBrokenPtps * 12);
  if (hasBouncedCheque) trustScore -= 25;
  if (utilizationPct > 100) trustScore -= 12;
  else if (utilizationPct >= 80) trustScore -= 5;
  if (activeLegalCase) trustScore -= 15;
  trustScore = Math.max(5, Math.min(100, trustScore));

  return {
    vendor,
    unpaid_invoiced: Math.round(unpaidInvoiced),
    overdue_amount: Math.round(overdueAmount),
    current_not_due: Math.round(currentNotDue),
    max_overdue_days: maxOverdueDays,
    unpaid_invoice_count: unpaidInvoiceCount,
    overdue_invoice_count: overdueInvoiceCount,
    has_bounced_cheque: hasBouncedCheque,
    accrued_interest: Math.round(accruedInterest),
    in_production_value: Math.round(inProductionValue),
    in_production_count: inProductionCount,
    blocked_orders_value: Math.round(blockedOrdersValue),
    blocked_orders_count: blockedOrdersCount,
    total_exposure: Math.round(totalExposure),
    credit_limit: creditLimit,
    credit_available: Math.round(creditAvailable),
    utilization_pct: utilizationPct,
    active_broken_ptps: activeBrokenPtps,
    total_broken_ptps: totalBrokenPtps,
    open_ptp: openPtp,
    active_legal_case: activeLegalCase,
    aging,
    escalation_level: escalationLevel,
    credit_status: creditStatus,
    risk_reasons: riskReasons,
    trust_score: trustScore
  };
}

export function syncVendorState(db, vendorId, { createAlerts = true, autoCreateLegal = true } = {}) {
  sweepExpiredPtps(db, vendorId, createAlerts);
  const prev = db.prepare('SELECT credit_status, escalation_level, name FROM vendors WHERE id = ?').get(vendorId);
  if (!prev) return null;

  const metrics = computeVendorMetrics(db, vendorId);
  const policy = getPolicy(db);

  db.prepare(`
    UPDATE vendors
    SET credit_status = ?, escalation_level = ?, trust_score = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(metrics.credit_status, metrics.escalation_level, metrics.trust_score, vendorId);

  // If vendor escalated into Legal Hold and no open legal case exists yet, auto-generate dossier
  if (metrics.credit_status === 'LEGAL_HOLD' && !metrics.active_legal_case && autoCreateLegal) {
    const caseNo = nextCaseNumber(db);
    const triggerReason = metrics.risk_reasons.join('; ') || 'Auto-escalated by Legal Policy threshold';
    const res = db.prepare(`
      INSERT INTO legal_cases (
        case_number, vendor_id, stage, trigger_reason, claimed_principal, claimed_interest,
        advocate_name, next_action_date, settlement_notes
      ) VALUES (?, ?, 'CASE_OPENED', ?, ?, ?, 'Adv. Meera Deshmukh (In-House Legal)', ?, ?)
    `).run(
      caseNo,
      vendorId,
      triggerReason,
      metrics.overdue_amount || metrics.unpaid_invoiced,
      metrics.accrued_interest,
      dateOffsetISO(3),
      'Auto-generated by PressGuard Escalation Engine. Evidence dossier compiled automatically.'
    );
    recordAudit(db, {
      actorRole: 'SYSTEM',
      actorName: 'PressGuard Engine',
      action: 'LEGAL_CASE_AUTO_OPENED',
      entityType: 'legal_case',
      entityId: Number(res.lastInsertRowid),
      summary: `Legal Case ${caseNo} auto-opened for ${prev.name} (${formatMoney(metrics.overdue_amount, policy.currency_symbol)} overdue)`,
      details: { triggerReason, overdueAmount: metrics.overdue_amount, maxOverdueDays: metrics.max_overdue_days }
    });
    if (createAlerts) {
      postCoordinationAlert(db, {
        fromDept: 'SYSTEM',
        toDepts: ['LEGAL', 'CEO', 'PRODUCTION', 'FINANCE'],
        priority: 'CRITICAL',
        alertType: 'LEGAL_ESCALATION',
        vendorId,
        title: `LEGAL ESCALATION: ${prev.name} (${caseNo})`,
        message: `Account auto-escalated to Legal Hold (${formatMoney(metrics.overdue_amount, policy.currency_symbol)} overdue, ${metrics.max_overdue_days}d). Production & Dispatch strictly frozen.`,
        requiresAck: 1
      });
    }
  } else if (
    createAlerts &&
    prev.credit_status !== metrics.credit_status &&
    (metrics.credit_status === 'CREDIT_HOLD' || metrics.credit_status === 'LEGAL_HOLD')
  ) {
    postCoordinationAlert(db, {
      fromDept: 'SYSTEM',
      toDepts: ['PRODUCTION', 'SALES', 'FINANCE', 'CEO'],
      priority: 'CRITICAL',
      alertType: 'STOP_WORK',
      vendorId,
      title: `CREDIT HOLD TRIGGERED: ${prev.name}`,
      message: `Account moved from ${prev.credit_status} → ${metrics.credit_status}. Reasons: ${metrics.risk_reasons.join('; ')}. Do NOT print or dispatch unapproved orders.`,
      requiresAck: 1
    });
  }

  // If account entered CREDIT_HOLD or LEGAL_HOLD, halt any QUEUED orders that don't have a CEO override
  if (metrics.credit_status === 'CREDIT_HOLD' || metrics.credit_status === 'LEGAL_HOLD') {
    const queuedOrders = db.prepare(`
      SELECT * FROM orders
      WHERE vendor_id = ? AND production_stage = 'QUEUED' AND gate_status = 'APPROVED'
    `).all(vendorId);

    for (const ord of queuedOrders) {
      const reasons = JSON.stringify(metrics.risk_reasons.length ? metrics.risk_reasons : [`Account on ${metrics.credit_status}`]);
      db.prepare(`
        UPDATE orders
        SET gate_status = 'BLOCKED', production_stage = 'HOLD', block_reasons = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(reasons, ord.id);

      if (createAlerts) {
        postCoordinationAlert(db, {
          fromDept: 'SYSTEM',
          toDepts: ['PRODUCTION', 'SALES'],
          priority: 'CRITICAL',
          alertType: 'STOP_DISPATCH',
          vendorId,
          orderId: ord.id,
          title: `STOP PRINT: ${ord.order_number} (${prev.name})`,
          message: `Queued order for "${ord.book_title}" (${formatMoney(ord.order_value, policy.currency_symbol)}) pulled back to HOLD due to ${metrics.credit_status}.`,
          requiresAck: 1
        });
      }
    }
  }

  return computeVendorMetrics(db, vendorId);
}

export function syncAllVendors(db, opts = {}) {
  const vendors = db.prepare('SELECT id FROM vendors').all();
  for (const v of vendors) {
    syncVendorState(db, v.id, opts);
  }
}

export function evaluateOrderGate(db, vendorId, orderValue, paymentMode = 'CREDIT', { excludeOrderId = null, isDispatchCheck = false } = {}) {
  const policy = getPolicy(db);
  const metrics = computeVendorMetrics(db, vendorId, { excludeOrderId });
  if (!metrics) return { passed: false, reasons: ['Vendor not found'], warnings: [], metrics: null };

  const vendor = metrics.vendor;
  const val = Number(orderValue || 0);
  const reasons = [];
  const warnings = [];

  // For dispatch check, the order's value is already excluded or checked against live credit health
  const projectedExposure = paymentMode === 'ADVANCE_PAID'
    ? metrics.total_exposure
    : metrics.total_exposure + (isDispatchCheck ? 0 : val);
  const projectedUtil = vendor.credit_limit > 0
    ? Math.round((projectedExposure / vendor.credit_limit) * 100)
    : (projectedExposure > 0 ? 100 : 0);

  // Rule 1: Legal Hold blocks EVERYTHING (even cash orders) until CEO/Legal clears
  if (metrics.credit_status === 'LEGAL_HOLD' || vendor.manual_hold === 'LEGAL_HOLD') {
    reasons.push(`Account is under active LEGAL HOLD (${metrics.active_legal_case ? metrics.active_legal_case.case_number : 'Blacklisted'}). Zero orders or dispatches permitted without CEO clearance.`);
  }

  // Rule 2: Advance Paid / 100% Cash Upfront
  if (paymentMode === 'ADVANCE_PAID') {
    if (policy.block_advance_if_overdue && metrics.overdue_amount > 0) {
      reasons.push(`Account has ${formatMoney(metrics.overdue_amount, policy.currency_symbol)} in unpaid overdue dues (${metrics.max_overdue_days}d). Policy prohibits fulfilling new advance orders before clearing past overdue debt (unless CEO overrides).`);
    }
  } else {
    // Standard CREDIT order checks
    if (vendor.cod_only) {
      reasons.push('Vendor is restricted to COD / 100% Advance Only — credit orders are disabled.');
    }
    if (vendor.manual_hold === 'CREDIT_HOLD') {
      reasons.push(`Manual Credit Freeze active: ${vendor.manual_hold_reason || 'Frozen by Management'}.`);
    }
    if (metrics.has_bounced_cheque) {
      reasons.push('Unresolved Bounced Cheque on account — all credit dispatches frozen.');
    }
    if (metrics.max_overdue_days >= Number(policy.overdue_hold_days)) {
      reasons.push(`Overdue invoice aged ${metrics.max_overdue_days} days (${formatMoney(metrics.overdue_amount, policy.currency_symbol)}) exceeds ${policy.overdue_hold_days}-day hold threshold.`);
    } else if (metrics.overdue_amount > 0) {
      warnings.push(`Vendor has ${formatMoney(metrics.overdue_amount, policy.currency_symbol)} overdue by ${metrics.max_overdue_days} days (within grace window).`);
    }
    if (metrics.active_broken_ptps >= Number(policy.max_broken_ptps)) {
      reasons.push(`${metrics.active_broken_ptps} Broken Promises-to-Pay on record (strike limit: ${policy.max_broken_ptps}) — auto-blocked to break 7-day stall loop.`);
    }
    if (vendor.credit_limit > 0 && projectedExposure > vendor.credit_limit) {
      const overBy = projectedExposure - vendor.credit_limit;
      reasons.push(`Credit limit breached by ${formatMoney(overBy, policy.currency_symbol)} (Projected exposure ${formatMoney(projectedExposure, policy.currency_symbol)} vs Limit ${formatMoney(vendor.credit_limit, policy.currency_symbol)}).`);
    } else if (vendor.credit_limit > 0 && projectedUtil >= Number(policy.soft_warning_pct)) {
      warnings.push(`Projected credit utilization will reach ${projectedUtil}% (soft warning at ${policy.soft_warning_pct}%).`);
    }
  }

  return {
    passed: reasons.length === 0,
    gate_type: isDispatchCheck ? 'GATE_2_PRE_DISPATCH' : 'GATE_1_INTAKE',
    projected_exposure: Math.round(projectedExposure),
    projected_utilization_pct: projectedUtil,
    reasons,
    warnings,
    metrics
  };
}

export function isOverrideValid(order) {
  if (!order || order.gate_status !== 'CEO_OVERRIDE') return false;
  if (!order.override_expires_at) return true;
  return order.override_expires_at >= todayISO();
}

export function parseRawOrderText(db, text) {
  const raw = String(text || '').trim();
  if (!raw) return {};

  const vendors = db.prepare('SELECT id, name, code, city, contact_person FROM vendors').all();
  const lower = raw.toLowerCase();

  let matchedVendor = null;
  let bestScore = 0;

  for (const v of vendors) {
    let score = 0;
    const nameLower = v.name.toLowerCase();
    if (lower.includes(nameLower)) score += 100;
    if (lower.includes(v.code.toLowerCase())) score += 90;
    const words = nameLower.split(/\s+/).filter(w => w.length >= 4 && !['book', 'books', 'house', 'press', 'pvt', 'ltd', 'distributors', 'publishers', 'publications', 'traders', 'academy', 'stores', 'depot'].includes(w));
    for (const w of words) {
      if (lower.includes(w)) score += 35;
    }
    if (v.contact_person) {
      const first = v.contact_person.split(/\s+/)[0]?.toLowerCase();
      if (first && first.length >= 4 && lower.includes(first)) score += 20;
    }
    if (score > bestScore) {
      bestScore = score;
      matchedVendor = v;
    }
  }

  // Extract quantity
  let quantity = null;
  const qtyMatch =
    raw.match(/\b(\d{2,6})\s*(?:copies|copy|pcs|pieces|books|units|sets)\b/i) ||
    raw.match(/\b(?:qty|quantity)\s*[:=-]?\s*(\d{1,6})\b/i);
  if (qtyMatch) quantity = Number(qtyMatch[1]);

  // Extract unit price
  let unitPrice = null;
  const priceMatch =
    raw.match(/(?:@|rs\.?|₹|inr|rate|price)\s*[:=-]?\s*(\d{2,5}(?:\.\d{1,2})?)/i);
  if (priceMatch) unitPrice = Number(priceMatch[1]);

  // Extract ISBN
  let isbn = '';
  const isbnMatch = raw.match(/\b(97[89][-\s]?\d{1,5}[-\s]?\d{1,7}[-\s]?\d{1,7}[-\s]?\d)\b/);
  if (isbnMatch) isbn = isbnMatch[1];

  // Extract title heuristic
  let bookTitle = '';
  const quoted = raw.match(/["“']([^"”']{4,80})["”']/);
  if (quoted) {
    bookTitle = quoted[1].trim();
  } else {
    const titleOf = raw.match(/(?:copies|pcs|books|units|sets)\s+(?:of\s+)?([A-Za-z0-9\s&:+\-()]{4,70}?)(?:\s*(?:@|rs\.?|₹|by\s+|urgent|asap|before|on\s+|from\s+|-|,|\n|$))/i);
    if (titleOf) bookTitle = titleOf[1].trim();
  }

  // Detect channel hint
  let channel = 'WHATSAPP';
  if (/subject:|dear\s+|regards,|from:\s*\S+@/i.test(raw)) channel = 'EMAIL';
  else if (/called|phone|verbal/i.test(raw)) channel = 'PHONE';

  return {
    vendor_id: matchedVendor ? matchedVendor.id : null,
    matched_vendor_name: matchedVendor ? matchedVendor.name : null,
    quantity,
    unit_price: unitPrice,
    book_title: bookTitle,
    isbn,
    channel
  };
}

export function compileLegalEvidencePack(db, vendorId) {
  const policy = getPolicy(db);
  const metrics = computeVendorMetrics(db, vendorId);
  if (!metrics) return null;

  const vendor = metrics.vendor;
  const legalCase = db.prepare(`SELECT * FROM legal_cases WHERE vendor_id = ? ORDER BY id DESC LIMIT 1`).get(vendorId);
  const unpaidInvoices = db.prepare(`
    SELECT i.*, o.order_number, o.channel, o.channel_ref, o.raw_message, o.book_title, o.quantity, o.dispatch_challan, o.dispatched_at
    FROM invoices i
    LEFT JOIN orders o ON o.id = i.order_id
    WHERE i.vendor_id = ? AND i.status != 'PAID' AND i.status != 'CANCELLED'
    ORDER BY i.due_date ASC
  `).all(vendorId);

  const collectionHistory = db.prepare(`
    SELECT * FROM collection_logs WHERE vendor_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(vendorId);

  const blockedOrders = db.prepare(`
    SELECT * FROM orders WHERE vendor_id = ? AND gate_status IN ('BLOCKED', 'DISPATCH_BLOCKED') ORDER BY created_at DESC
  `).all(vendorId);

  const sym = policy.currency_symbol;
  const today = todayISO();
  const totalClaim = metrics.overdue_amount + metrics.accrued_interest;

  const invoiceLines = unpaidInvoices.map((inv, idx) => {
    const bal = Math.max(0, Number(inv.amount) - Number(inv.paid_amount));
    const od = Math.max(0, daysBetween(inv.due_date, today));
    return `${idx + 1}. Invoice ${inv.invoice_number} | Issued: ${inv.issue_date} | Due: ${inv.due_date} (${od} days overdue) | Outstanding: ${formatMoney(bal, sym)}` +
      (inv.dispatch_pod ? ` | POD/Challan: ${inv.dispatch_pod}` : '') +
      (inv.channel ? ` | Order Proof: ${inv.channel} (${inv.channel_ref || 'Logged'})` : '') +
      (inv.cheque_bounced ? ` | [CHEQUE BOUNCED: ${inv.bounce_details || 'Dishonoured'}]` : '');
  }).join('\n');

  const ptpLines = collectionHistory
    .filter(c => c.outcome === 'PROMISED_TO_PAY' || c.outcome === 'REFUSED')
    .slice(0, 8)
    .map((c, idx) => `${idx + 1}. ${c.created_at.slice(0, 10)} — ${c.outcome} (${c.ptp_status}): ${c.ptp_amount ? formatMoney(c.ptp_amount, sym) + ' by ' + c.ptp_date + ' — ' : ''}${c.notes}`)
    .join('\n');

  const noticeText = `WITHOUT PREJUDICE — FORMAL LEGAL DEMAND NOTICE
Date: ${today}
Case Ref: ${legalCase ? legalCase.case_number : 'PRE-LITIGATION DRAFT'}
Mode: Speed Post AD / Registered Email / WhatsApp Official Notice

TO:
${vendor.name}
Attn: ${vendor.contact_person}
Address: ${vendor.address || vendor.city}
GSTIN: ${vendor.gstin || 'On Record'}
Phone: ${vendor.phone} | Email: ${vendor.email || 'On Record'}

SUBJECT: FINAL LEGAL DEMAND FOR OVERDUE PUBLISHING DUES OF ${formatMoney(totalClaim, sym)} (PRINCIPAL ${formatMoney(metrics.overdue_amount, sym)} + INTEREST ${formatMoney(metrics.accrued_interest, sym)} @ ${policy.interest_rate_pa}% P.A.)

Dear Sir/Madam,

Under instructions from Management & Legal Department, we hereby serve this Final Demand Notice regarding long-overdue commercial invoices for books/publications supplied and duly delivered to your establishment:

1. SCHEDULE OF UNPAID OVERDUE INVOICES & DELIVERY PROOFS:
${invoiceLines || 'No unpaid invoices listed.'}

2. DOCUMENTED COLLECTION FOLLOW-UPS & BROKEN COMMITMENTS (${metrics.total_broken_ptps} BROKEN PROMISES):
${ptpLines || 'Repeated telephonic and written reminders ignored.'}

3. COMMERCIAL CONSEQUENCES & LEGAL ACTION:
- Your trade credit facility stands PERMANENTLY FROZEN (LEGAL HOLD). All pending and future print/dispatch requests stand suspended.
- You are hereby called upon to remit the total sum of ${formatMoney(totalClaim, sym)} via RTGS/NEFT within 7 (SEVEN) DAYS of receipt of this notice.
- Failing receipt within 7 days, our client shall initiate appropriate civil recovery proceedings${metrics.has_bounced_cheque ? ' and criminal prosecution under Section 138 of the Negotiable Instruments Act, 1881 for dishonoured cheque(s),' : ','} entirely at your risk, cost, and consequence.

Issued By:
${legalCase ? legalCase.advocate_name : 'In-House Legal Counsel'}
${policy.company_name || 'PressGuard Publishing House'} — Legal Desk`;

  return {
    vendor,
    metrics,
    legal_case: legalCase,
    unpaid_invoices: unpaidInvoices,
    collection_history: collectionHistory,
    blocked_orders: blockedOrders,
    notice_text: noticeText
  };
}

export function csvEscape(val) {
  const s = String(val ?? '');
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv(headers, rows) {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(','));
  }
  return '\uFEFF' + lines.join('\r\n');
}

export function parseCsvText(text) {
  const src = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field.trim());
      field = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field.trim());
      if (row.some(cell => cell !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  row.push(field.trim());
  if (row.some(cell => cell !== '')) rows.push(row);

  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
  return rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = r[idx] ?? ''; });
    return obj;
  });
}
