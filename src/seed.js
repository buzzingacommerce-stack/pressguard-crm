import { getDb, dateOffsetISO } from './db.js';
import { syncAllVendors, postCoordinationAlert, recordAudit } from './engine.js';
import { seedDefaultUsers } from './auth.js';

export function seedIfEmpty() {
  const db = getDb();
  seedDefaultUsers(db);
  const count = db.prepare('SELECT COUNT(*) AS cnt FROM vendors').get().cnt;
  if (count > 0) return false;
  runSeed(db);
  return true;
}

export function clearDemoDataKeepUsers(actorName = 'CEO') {
  const db = getDb();
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM coordination_feed;
    DELETE FROM legal_cases;
    DELETE FROM collection_logs;
    DELETE FROM payments;
    DELETE FROM invoices;
    DELETE FROM orders;
    DELETE FROM vendors;
  `);
  recordAudit(db, {
    actorRole: 'CEO',
    actorName,
    action: 'PRODUCTION_WORKSPACE_CLEARED',
    entityType: 'system',
    summary: 'Cleared sample demo records to start fresh with live publishing house data.'
  });
  return true;
}

export function resetAndSeed() {
  const db = getDb();
  seedDefaultUsers(db);
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM coordination_feed;
    DELETE FROM legal_cases;
    DELETE FROM collection_logs;
    DELETE FROM payments;
    DELETE FROM invoices;
    DELETE FROM orders;
    DELETE FROM vendors;
    DELETE FROM sqlite_sequence WHERE name != 'users';
  `);
  db.prepare(`
    UPDATE policies SET
      currency_symbol = '₹',
      currency_code = 'INR',
      soft_warning_pct = 80,
      overdue_hold_days = 15,
      ceo_overdue_days = 30,
      ceo_value_threshold = 200000,
      legal_overdue_days = 60,
      legal_value_threshold = 300000,
      max_broken_ptps = 2,
      interest_rate_pa = 18.0,
      block_advance_if_overdue = 1,
      updated_at = datetime('now')
    WHERE id = 1
  `).run();
  runSeed(db);
  return true;
}

function runSeed(db) {
  const insertVendor = db.prepare(`
    INSERT INTO vendors (
      code, name, category, contact_person, phone, email, city, gstin, address,
      tier, credit_limit, payment_terms_days, cod_only, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const v1 = Number(insertVendor.run(
    'VND-101', 'Apex Book Distributors Pvt. Ltd.', 'Wholesaler', 'Rajesh Malhotra',
    '+91 98110 44219', 'accounts@apexbooks.in', 'New Delhi', '07AABCA4412K1Z5',
    '42 Daryaganj Book Market, Ansari Road, New Delhi - 110002',
    'B', 600000, 30, 0,
    'High-volume CBSE distributor. Repeatedly stalls telecallers while messaging production directly on WhatsApp.'
  ).lastInsertRowid);

  const v2 = Number(insertVendor.run(
    'VND-102', 'Saraswati Educational Supplies', 'School Network', 'Pradeep Sharma',
    '+91 98290 77310', 'orders@saraswatiedu.in', 'Jaipur', '08AADCS9920M1Z1',
    '19 Chaura Rasta, Tripolia Bazar, Jaipur - 302003',
    'B', 400000, 30, 0,
    'Classic 7-day-loop account. Promises payment every week; has books currently printed waiting at dispatch.'
  ).lastInsertRowid);

  const v3 = Number(insertVendor.run(
    'VND-103', 'Vanguard Academic Wholesalers', 'Institutional', 'Sandeep Kulkarni',
    '+91 98201 61204', 'procurement@vanguardacademic.co.in', 'Mumbai', '27AAACV7128P1Z9',
    'Unit 14, Lower Parel Trade Center, Mumbai - 400013',
    'A', 800000, 45, 0,
    'Historically strong college distributor now 44 days overdue on Semester-1 batch. Requesting CEO override.'
  ).lastInsertRowid);

  const v4 = Number(insertVendor.run(
    'VND-104', 'Nalanda School Book Depot', 'Distributor', 'Anurag Verma',
    '+91 94150 88211', 'nalandadepot@gmail.com', 'Lucknow', '09ABCPN3301R1Z2',
    'Aminabad Main Market, Lucknow - 226018',
    'B', 350000, 30, 0,
    'Moderate delay (11d overdue). Currently in Telecaller Stage-1 follow-up with an active open PTP.'
  ).lastInsertRowid);

  const v5 = Number(insertVendor.run(
    'VND-105', 'Bharati Vidya Mandir Chain', 'Bookstore Chain', 'Kavita Joshi',
    '+91 98220 55109', 'finance@bharatividya.org', 'Pune', '27AABCB6102H1Z8',
    '88 Appa Balwant Chowk, Budhwar Peth, Pune - 411002',
    'A', 1000000, 30, 0,
    'Gold-standard Tier-A school & bookstore chain. Always pays via RTGS before due date.'
  ).lastInsertRowid);

  const v6 = Number(insertVendor.run(
    'VND-106', 'Deccan Readers Hub', 'Retail Chain', 'Venkatesh Rao',
    '+91 98480 31942', 'buying@deccanreaders.in', 'Hyderabad', '36AABCD8014L1Z4',
    'Koti Book Street, Sultan Bazar, Hyderabad - 500095',
    'B', 250000, 30, 0,
    'Pays on time so far, but attempting to exceed approved ₹2.5L credit ceiling with a large new order.'
  ).lastInsertRowid);

  const v7 = Number(insertVendor.run(
    'VND-107', 'Kalinga Book Emporium', 'Retailer', 'Subhashis Mohanty',
    '+91 94370 19820', 'kalingabooks@yahoo.in', 'Bhubaneswar', '21AAECK1189N1Z7',
    'Master Canteen Square, Unit 3, Bhubaneswar - 751001',
    'C', 0, 0, 1,
    'Converted to strict 100% Advance / COD-Only after previous year payment delays. Performs cleanly on advance.'
  ).lastInsertRowid);

  const v8 = Number(insertVendor.run(
    'VND-108', 'Chanakya Competitive Bookstore', 'Wholesaler', 'Manoj Sinha',
    '+91 94310 66240', 'chanakyabooks.patna@gmail.com', 'Patna', '10AAECC7741D1Z3',
    'Ashok Rajpath, Opposite Patna University, Patna - 800004',
    'C', 300000, 30, 0,
    'Chronic 78-day defaulter. Legal Notice served; cure window expiring shortly.'
  ).lastInsertRowid);

  // Insert historical dispatched orders (for invoice evidence trail) & current active/blocked orders
  const insertOrder = db.prepare(`
    INSERT INTO orders (
      order_number, vendor_id, channel, channel_ref, raw_message, book_title, isbn, edition,
      quantity, unit_price, order_value, payment_mode, advance_ref, gate_status, gate_pass_code,
      block_reasons, production_stage, dispatch_challan, dispatched_at, override_requested, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Past Dispatched Orders linked to overdue invoices (so Legal Evidence Pack has full WhatsApp/Email trail!)
  const ordHist1 = Number(insertOrder.run(
    'ORD-26-0912', v1, 'WHATSAPP', 'WA +91 98110 44219',
    'Urgent dispatch 1700 copies CBSE Class 12 Chemistry Master Guide @ 200. Sending PDC cheque with transporter - Rajesh Apex',
    'CBSE Class 12 Chemistry Master Guide', '978-81-94820-11-4', '2026 Revised Ed.',
    1700, 200, 340000, 'CREDIT', '', 'APPROVED', 'GP-2608-2201',
    '[]', 'DISPATCHED', 'DC-DL-8841 / LR#440912', dateOffsetISO(-98), 0, 'Sales Desk', `${dateOffsetISO(-102)} 11:15:00`
  ).lastInsertRowid);

  const ordHist2 = Number(insertOrder.run(
    'ORD-26-0944', v1, 'EMAIL', 'Re: Term-2 Stock Reorder',
    'Please dispatch 725 copies of CBSE Class 10 Social Science Atlas @ 200 immediately for school reopening.',
    'CBSE Class 10 Social Science Atlas', '978-81-94820-19-0', '3rd Ed.',
    725, 200, 145000, 'CREDIT', '', 'APPROVED', 'GP-2609-4490',
    '[]', 'DISPATCHED', 'DC-DL-9102 / LR#448701', dateOffsetISO(-68), 0, 'Sales Desk', `${dateOffsetISO(-71)} 14:40:00`
  ).lastInsertRowid);

  const ordHist3 = Number(insertOrder.run(
    'ORD-26-0958', v2, 'WHATSAPP', 'WA +91 98290 77310',
    'Bhaiya 1175 pcs NCERT Exam Master Science @ 200 send to Jaipur transport today - Pradeep',
    'NCERT Exam Master Science Class 10', '978-81-94820-34-3', '2026 Ed.',
    1175, 200, 235000, 'CREDIT', '', 'APPROVED', 'GP-2609-5518',
    '[]', 'DISPATCHED', 'DC-RJ-7741 / LR#391004', dateOffsetISO(-56), 0, 'Order Desk', `${dateOffsetISO(-60)} 10:05:00`
  ).lastInsertRowid);

  const ordHist4 = Number(insertOrder.run(
    'ORD-26-0931', v3, 'EMAIL', 'PO# VAW/2026/884',
    'Attached official PO for 950 copies of Applied Mechanics & Thermodynamics @ 300. Terms Net 45.',
    'Applied Mechanics & Thermodynamics', '978-81-94820-55-8', '5th Ed.',
    950, 300, 285000, 'CREDIT', '', 'APPROVED', 'GP-2608-3910',
    '[]', 'DISPATCHED', 'DC-MH-6612 / LR#882190', dateOffsetISO(-89), 0, 'Institutional Sales', `${dateOffsetISO(-93)} 16:20:00`
  ).lastInsertRowid);

  const ordHist5 = Number(insertOrder.run(
    'ORD-26-0905', v8, 'PHONE', 'Direct call to Sales',
    'Verbal order confirmed via SMS: 1325 copies UPSC Prelims Question Bank @ 200 for Patna batch.',
    'UPSC Prelims 15-Year Question Bank', '978-81-94820-81-7', '2026 Ed.',
    1325, 200, 265000, 'CREDIT', '', 'APPROVED', 'GP-2607-1194',
    '[]', 'DISPATCHED', 'DC-BR-5109 / LR#710422', dateOffsetISO(-108), 0, 'Sales Desk', `${dateOffsetISO(-112)} 12:30:00`
  ).lastInsertRowid);

  // LIVE ACTIVE & BLOCKED ORDERS IN THE PIPELINE
  // 1. Apex Book Distributors trying to slip a ₹3.96L WhatsApp order while ₹4.85L overdue & cheque bounced -> BLOCKED!
  const ordBlocked1 = Number(insertOrder.run(
    'ORD-26-1001', v1, 'WHATSAPP', 'WA Direct to Production Lead',
    'Hi sir, urgent reprint needed: 1800 copies of "CBSE Class 12 Physics Complete Guide" @ 220. Schools starting Monday, please print and dispatch fast! - Rajesh Apex Delhi',
    'CBSE Class 12 Physics Complete Guide', '978-81-94820-12-1', '2026 Revised Ed.',
    1800, 220, 396000, 'CREDIT', '', 'BLOCKED', '',
    JSON.stringify([
      'Account is under active LEGAL HOLD (LEG-26-0101). Zero orders or dispatches permitted without CEO clearance.',
      'Unresolved Bounced Cheque on account — all credit dispatches frozen.',
      'Overdue invoice aged 68 days (₹4,85,000) exceeds 15-day hold threshold.',
      '3 Broken Promises-to-Pay on record (strike limit: 2) — auto-blocked to break 7-day stall loop.'
    ]),
    'HOLD', '', '', 0, 'Order Desk (Intercepted)', `${dateOffsetISO(-1)} 17:12:00`
  ).lastInsertRowid);

  // 2. Saraswati Educational Supplies — GATE 2 PRE-DISPATCH TRAP!
  // Order cleared 12 days ago (when previous bill was only 14d overdue), NOW printed & READY_TO_DISPATCH,
  // but vendor crossed 26d overdue + 2 broken promises! Gate 2 will catch it LIVE when Production tries to dispatch!
  const ordGate2Trap = Number(insertOrder.run(
    'ORD-26-1002', v2, 'WHATSAPP', 'WA +91 98290 77310',
    'Need 900 copies NCERT Exam Master Maths Vol 1 @ 180 for Jaipur schools. Will clear old bill next week.',
    'NCERT Exam Master Maths Vol. 1', '978-81-94820-35-0', '2026 Ed.',
    900, 180, 162000, 'CREDIT', '', 'APPROVED', 'GP-2611-4092',
    '[]', 'READY_TO_DISPATCH', '', '', 0, 'Order Desk', `${dateOffsetISO(-12)} 10:30:00`
  ).lastInsertRowid);

  // 3. Vanguard Academic Wholesalers — BLOCKED & REQUESTING CEO OVERRIDE
  const ordBlocked3 = Number(insertOrder.run(
    'ORD-26-1003', v3, 'EMAIL', 'PO# VAW/2026/992 (Urgent)',
    'Subject: Urgent Exam Season Order — 1200 copies Engineering Mathematics 4th Ed @ 280. RTGS of ₹2,85,000 scheduled with our board signatory tomorrow morning.',
    'Engineering Mathematics 4th Ed.', '978-81-94820-58-9', '4th Ed.',
    1200, 280, 336000, 'CREDIT', '', 'BLOCKED', '',
    JSON.stringify([
      'Overdue invoice aged 44 days (₹2,85,000) exceeds 15-day hold threshold.',
      'Executive-tier overdue balance requires CEO review.'
    ]),
    'HOLD', '', '', 1, 'Institutional Sales', `${dateOffsetISO(-1)} 13:20:00`
  ).lastInsertRowid);

  // 4. Nalanda School Book Depot — PRINTING (within 15d grace window)
  insertOrder.run(
    'ORD-26-1004', v4, 'PHONE', 'Sales Rep Visit',
    '1000 copies Primary English Grammar Series @ 120 for winter session.',
    'Primary English Grammar Series', '978-81-94820-62-6', '2026 Ed.',
    1000, 120, 120000, 'CREDIT', '', 'APPROVED', 'GP-2611-6210',
    '[]', 'PRINTING', '', '', 0, 'Sales Desk', `${dateOffsetISO(-5)} 11:00:00`
  );

  // 5. Bharati Vidya Mandir Chain — HEALTHY QUEUED ORDER (GREEN GATE PASS)
  insertOrder.run(
    'ORD-26-1005', v5, 'EMAIL', 'PO# BVM-PU-2026-412',
    'Please schedule 1500 copies of Competitive Reasoning Workbook @ 170 for Pune branch distribution.',
    'Competitive Reasoning Workbook', '978-81-94820-71-8', '2026 Ed.',
    1500, 170, 255000, 'CREDIT', '', 'APPROVED', 'GP-2611-7745',
    '[]', 'QUEUED', '', '', 0, 'Order Desk', `${dateOffsetISO(0)} 09:45:00`
  );

  // 6. Deccan Readers Hub — BLOCKED FOR CREDIT LIMIT BREACH (even though 0 days overdue!)
  insertOrder.run(
    'ORD-26-1006', v6, 'PHONE', 'Call to Order Desk',
    'Send 600 copies Modern Indian History Compendium @ 200 to Hyderabad depot.',
    'Modern Indian History Compendium', '978-81-94820-79-4', '2nd Ed.',
    600, 200, 120000, 'CREDIT', '', 'BLOCKED', '',
    JSON.stringify([
      'Credit limit breached by ₹65,000 (Projected exposure ₹3,15,000 vs Limit ₹2,50,000).'
    ]),
    'HOLD', '', '', 0, 'Order Desk', `${dateOffsetISO(0)} 10:15:00`
  );

  // 7. Kalinga Book Emporium — COD / 100% ADVANCE PAID (CLEARED TO DISPATCH!)
  insertOrder.run(
    'ORD-26-1007', v7, 'WHATSAPP', 'WA +91 94370 19820',
    'Transferred ₹84,000 via IMPS UTR#632419802211. Please dispatch 600 copies Odisha State GK Digest @ 140.',
    'Odisha State GK Digest 2026', '978-81-94820-90-9', '2026 Ed.',
    600, 140, 84000, 'ADVANCE_PAID', 'IMPS-632419802211', 'APPROVED', 'GP-2611-8830',
    '[]', 'READY_TO_DISPATCH', '', '', 0, 'Order Desk', `${dateOffsetISO(-2)} 15:10:00`
  );

  // Insert Invoices
  const insertInv = db.prepare(`
    INSERT INTO invoices (
      invoice_number, vendor_id, order_id, description, issue_date, due_date,
      amount, paid_amount, status, cheque_bounced, bounce_details, dispatch_pod
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const inv1 = Number(insertInv.run(
    'INV-26-5001', v1, ordHist1, 'CBSE Class 12 Chemistry Master Guide (1,700 copies)',
    dateOffsetISO(-98), dateOffsetISO(-68), 340000, 0, 'OVERDUE', 1,
    'HDFC Cheque #448912 for ₹3,40,000 dishonoured — Reason: Funds Insufficient (Return Memo dt. ' + dateOffsetISO(-32) + ')',
    'DC-DL-8841 / Signed POD on file'
  ).lastInsertRowid);

  insertInv.run(
    'INV-26-5002', v1, ordHist2, 'CBSE Class 10 Social Science Atlas (725 copies)',
    dateOffsetISO(-68), dateOffsetISO(-38), 145000, 0, 'OVERDUE', 0, '',
    'DC-DL-9102 / VRL Logistics Receipt #448701'
  );

  const inv3 = Number(insertInv.run(
    'INV-26-5003', v2, ordHist3, 'NCERT Exam Master Science Class 10 (1,175 copies)',
    dateOffsetISO(-56), dateOffsetISO(-26), 235000, 0, 'OVERDUE', 0, '',
    'DC-RJ-7741 / Jaipur Golden Transport #391004'
  ).lastInsertRowid);

  const inv4 = Number(insertInv.run(
    'INV-26-5004', v3, ordHist4, 'Applied Mechanics & Thermodynamics (950 copies)',
    dateOffsetISO(-89), dateOffsetISO(-44), 285000, 0, 'OVERDUE', 0, '',
    'DC-MH-6612 / Gati POD #882190'
  ).lastInsertRowid);

  const inv5 = Number(insertInv.run(
    'INV-26-5005', v4, null, 'Junior Atlas & Social Studies Batch (1,150 copies)',
    dateOffsetISO(-41), dateOffsetISO(-11), 165000, 50000, 'PARTIAL', 0, '',
    'DC-UP-6201 / Signed Delivery Note'
  ).lastInsertRowid);

  insertInv.run(
    'INV-26-5006', v5, null, 'Term-1 School Textbook Supply (1,200 copies)',
    dateOffsetISO(-12), dateOffsetISO(18), 240000, 0, 'UNPAID', 0, '',
    'DC-MH-9012 / Pune Warehouse Receipt'
  );

  insertInv.run(
    'INV-26-5007', v6, null, 'Bestseller Literature & History Mix (975 copies)',
    dateOffsetISO(-16), dateOffsetISO(14), 195000, 0, 'UNPAID', 0, '',
    'DC-TS-8104 / Hyderabad Hub POD'
  );

  const inv8 = Number(insertInv.run(
    'INV-26-5008', v8, ordHist5, 'UPSC Prelims 15-Year Question Bank (1,325 copies)',
    dateOffsetISO(-108), dateOffsetISO(-78), 265000, 0, 'OVERDUE', 0, '',
    'DC-BR-5109 / SafeExpress POD #710422'
  ).lastInsertRowid);

  // Sample partial payment recorded for Nalanda
  db.prepare(`
    INSERT INTO payments (vendor_id, invoice_id, amount, mode, reference_no, payment_date, recorded_by, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(v4, inv5, 50000, 'NEFT', 'NEFT-SBIN26110891', dateOffsetISO(-9), 'Accounts Desk', 'Partial payment received; balance ₹1,15,000 pending');

  // Insert Telecaller Collection Logs (demonstrating the broken "7 days, 7 days, 7 days" loop!)
  const insertCall = db.prepare(`
    INSERT INTO collection_logs (vendor_id, invoice_id, caller_name, outcome, ptp_amount, ptp_date, ptp_status, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Apex — 3 Broken Promises!
  insertCall.run(v1, inv1, 'Priya (Telecalling)', 'PROMISED_TO_PAY', 340000, dateOffsetISO(-52), 'BROKEN', 'Rajesh said "give me 7 days, school collections coming in".', `${dateOffsetISO(-59)} 11:20:00`);
  insertCall.run(v1, inv1, 'Priya (Telecalling)', 'PROMISED_TO_PAY', 340000, dateOffsetISO(-38), 'BROKEN', 'Again asked for 7 more days. Handed PDC cheque #448912 which later bounced.', `${dateOffsetISO(-45)} 15:10:00`);
  insertCall.run(v1, inv1, 'Rohan (Collections Lead)', 'PROMISED_TO_PAY', 485000, dateOffsetISO(-18), 'BROKEN', 'Promised RTGS within 7 days after cheque bounce; stopped picking calls afterward.', `${dateOffsetISO(-25)} 12:05:00`);

  // Saraswati — 2 Broken Promises (Hit Max Strikes!)
  insertCall.run(v2, inv3, 'Priya (Telecalling)', 'PROMISED_TO_PAY', 235000, dateOffsetISO(-16), 'BROKEN', 'Pradeep ji said "7 days de do, full RTGS kar dunga". No payment arrived.', `${dateOffsetISO(-23)} 10:40:00`);
  insertCall.run(v2, inv3, 'Priya (Telecalling)', 'PROMISED_TO_PAY', 235000, dateOffsetISO(-5), 'BROKEN', 'Second 7-day extension promised & broken! Now trying to get new Maths print run dispatched.', `${dateOffsetISO(-12)} 16:30:00`);

  // Vanguard — 1 Broken Promise + Dispute/Delay note
  insertCall.run(v3, inv4, 'Rohan (Collections Lead)', 'PROMISED_TO_PAY', 285000, dateOffsetISO(-14), 'BROKEN', 'Finance signatory was out of station; promised clearance last fortnight, still unpaid.', `${dateOffsetISO(-21)} 14:15:00`);

  // Nalanda — 1 Broken Promise, 1 Open Active PTP due in 2 days
  insertCall.run(v4, inv5, 'Priya (Telecalling)', 'PROMISED_TO_PAY', 115000, dateOffsetISO(-4), 'BROKEN', 'Paid ₹50,000 partial; missed remaining ₹1,15,000 date.', `${dateOffsetISO(-10)} 11:00:00`);
  insertCall.run(v4, inv5, 'Priya (Telecalling)', 'PROMISED_TO_PAY', 115000, dateOffsetISO(2), 'OPEN', 'Confirmed final balance transfer within 48 hours via NEFT.', `${dateOffsetISO(-1)} 14:20:00`);

  // Chanakya — 3 Broken Promises + Refusal
  insertCall.run(v8, inv8, 'Priya (Telecalling)', 'PROMISED_TO_PAY', 265000, dateOffsetISO(-62), 'BROKEN', 'Asked for 7 days grace.', `${dateOffsetISO(-69)} 10:15:00`);
  insertCall.run(v8, inv8, 'Priya (Telecalling)', 'PROMISED_TO_PAY', 265000, dateOffsetISO(-48), 'BROKEN', 'Asked for another 7 days citing festival slowdown.', `${dateOffsetISO(-55)} 12:45:00`);
  insertCall.run(v8, inv8, 'Rohan (Collections Lead)', 'PROMISED_TO_PAY', 265000, dateOffsetISO(-30), 'BROKEN', 'Final telephonic commitment broken; escalated to Legal.', `${dateOffsetISO(-37)} 16:00:00`);

  // Pre-seed Legal Cases for Apex & Chanakya
  const insertLegal = db.prepare(`
    INSERT INTO legal_cases (
      case_number, vendor_id, stage, trigger_reason, claimed_principal, claimed_interest,
      advocate_name, notice_sent_date, cure_deadline, next_action_date, settlement_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLegal.run(
    'LEG-26-0101', v1, 'LEGAL_NOTICE_DRAFTED',
    'Cheque #448912 (₹3,40,000) dishonoured + ₹4,85,000 overdue 68 days + 3 Broken Promises',
    485000, 14120, 'Adv. Meera Deshmukh (In-House Legal)', '', '', dateOffsetISO(1),
    'Section 138 NI Act + Civil Demand Notice drafted. Evidence dossier compiled with signed PODs & WhatsApp orders. Ready to serve.'
  );

  insertLegal.run(
    'LEG-26-0102', v8, 'NOTICE_SERVED',
    '₹2,65,000 overdue 78 days + 3 Broken Promises — Non-responsive to Finance demand',
    265000, 10190, 'Adv. Vikramaditya Nair (External Recovery Counsel)', dateOffsetISO(-3), dateOffsetISO(4), dateOffsetISO(4),
    'Registered Speed Post AD & Email Legal Notice served. 7-day statutory cure window active.'
  );

  // Sync all vendor states & scores cleanly (without duplicating alerts during seed)
  syncAllVendors(db, { createAlerts: false, autoCreateLegal: false });

  // Seed realistic Cross-Department Coordination Alerts
  postCoordinationAlert(db, {
    fromDept: 'SYSTEM',
    toDepts: ['PRODUCTION', 'SALES', 'CEO', 'LEGAL'],
    priority: 'CRITICAL',
    alertType: 'STOP_WORK',
    vendorId: v1,
    orderId: ordBlocked1,
    title: 'AUTO-BLOCKED: Apex Book Distributors attempted ₹3,96,000 WhatsApp order',
    message: 'Order ORD-26-1001 ("CBSE Class 12 Physics Complete Guide", 1,800 copies) auto-quarantined at Gate 1. Vendor owes ₹4,85,000 (68d overdue, bounced cheque, Legal Case LEG-26-0101). Production MUST NOT print.',
    requiresAck: 1
  });

  postCoordinationAlert(db, {
    fromDept: 'FINANCE',
    toDepts: ['PRODUCTION', 'DISPATCH', 'CEO'],
    priority: 'CRITICAL',
    alertType: 'STOP_DISPATCH',
    vendorId: v2,
    orderId: ordGate2Trap,
    title: 'HOLD DISPATCH ALERT: Saraswati Educational Supplies crossed 2 Broken Promises',
    message: 'Order ORD-26-1002 (₹1,62,000) is sitting Ready-to-Dispatch on the warehouse floor, but their old bill (₹2,35,000) just hit 26d overdue with 2 broken 7-day promises. Gate 2 will hard-block dispatch until paid!',
    requiresAck: 1
  });

  postCoordinationAlert(db, {
    fromDept: 'SALES',
    toDepts: ['CEO', 'FINANCE'],
    priority: 'HIGH',
    alertType: 'OVERRIDE_REQUEST',
    vendorId: v3,
    orderId: ordBlocked3,
    title: 'CEO Override Requested: Vanguard Academic Wholesalers (ORD-26-1003)',
    message: 'Blocked ₹3,36,000 Engineering Maths order for Tier-A account (₹2,85,000 overdue 44d). Buyer promises RTGS tomorrow morning and needs books for college exams. Requesting CEO review.',
    requiresAck: 0
  });

  postCoordinationAlert(db, {
    fromDept: 'LEGAL',
    toDepts: ['CEO', 'FINANCE', 'TELECALLING'],
    priority: 'HIGH',
    alertType: 'LEGAL_UPDATE',
    vendorId: v8,
    title: 'Legal Notice Served to Chanakya Competitive Bookstore (LEG-26-0102)',
    message: '7-day statutory cure deadline expires in 4 days. Telecalling should cease routine follow-ups; all communications must route through Legal Desk.',
    requiresAck: 0
  });

  recordAudit(db, {
    actorRole: 'SYSTEM',
    actorName: 'PressGuard Engine',
    action: 'SYSTEM_INITIALIZED',
    entityType: 'system',
    summary: 'PressGuard Publishing CEO CRM initialized with live credit gates, aging engine, and cross-department coordination.'
  });
}
