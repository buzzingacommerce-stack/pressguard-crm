// Full client-side PressGuard engine (localStorage persistence) for static/online hosting (GitHub Pages)
// Automatically engaged when no Node.js /api server is reachable.

const STORE_KEY = 'pressguard_crm_store_v1';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateOffsetISO(delta) {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(aIso, bIso) {
  if (!aIso || !bIso) return 0;
  const a = new Date(`${String(aIso).slice(0, 10)}T00:00:00Z`);
  const b = new Date(`${String(bIso).slice(0, 10)}T00:00:00Z`);
  return Math.floor((b - a) / 86400000);
}

function fmtMoney(amount, sym = '₹') {
  const n = Math.round(Number(amount || 0));
  return sym === '₹' ? `${sym}${n.toLocaleString('en-IN')}` : `${sym}${n.toLocaleString('en-US')}`;
}

function genPass() {
  const n = new Date();
  const ym = `${String(n.getFullYear()).slice(-2)}${String(n.getMonth() + 1).padStart(2, '0')}`;
  return `GP-${ym}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function createInitialSeed() {
  const policy = {
    id: 1,
    company_name: 'PressGuard Publishing House',
    currency_symbol: '₹',
    currency_code: 'INR',
    soft_warning_pct: 80,
    overdue_hold_days: 15,
    ceo_overdue_days: 30,
    ceo_value_threshold: 200000,
    legal_overdue_days: 60,
    legal_value_threshold: 300000,
    max_broken_ptps: 2,
    interest_rate_pa: 18.0,
    block_advance_if_overdue: 1
  };

  const vendors = [
    { id: 1, code: 'VND-101', name: 'Apex Book Distributors Pvt. Ltd.', category: 'Wholesaler', contact_person: 'Rajesh Malhotra', phone: '+91 98110 44219', email: 'accounts@apexbooks.in', city: 'New Delhi', gstin: '07AABCA4412K1Z5', address: '42 Daryaganj Book Market, New Delhi', tier: 'B', credit_limit: 600000, payment_terms_days: 30, cod_only: 0, manual_hold: '', manual_hold_reason: '', credit_status: 'LEGAL_HOLD', escalation_level: 4, trust_score: 18, ptp_reset_at: '', notes: '' },
    { id: 2, code: 'VND-102', name: 'Saraswati Educational Supplies', category: 'School Network', contact_person: 'Pradeep Sharma', phone: '+91 98290 77310', email: 'orders@saraswatiedu.in', city: 'Jaipur', gstin: '08AADCS9920M1Z1', address: '19 Chaura Rasta, Jaipur', tier: 'B', credit_limit: 400000, payment_terms_days: 30, cod_only: 0, manual_hold: '', manual_hold_reason: '', credit_status: 'CREDIT_HOLD', escalation_level: 3, trust_score: 42, ptp_reset_at: '', notes: '' },
    { id: 3, code: 'VND-103', name: 'Vanguard Academic Wholesalers', category: 'Institutional', contact_person: 'Sandeep Kulkarni', phone: '+91 98201 61204', email: 'procurement@vanguardacademic.co.in', city: 'Mumbai', gstin: '27AAACV7128P1Z9', address: 'Lower Parel Trade Center, Mumbai', tier: 'A', credit_limit: 800000, payment_terms_days: 45, cod_only: 0, manual_hold: '', manual_hold_reason: '', credit_status: 'CREDIT_HOLD', escalation_level: 3, trust_score: 54, ptp_reset_at: '', notes: '' },
    { id: 4, code: 'VND-104', name: 'Nalanda School Book Depot', category: 'Distributor', contact_person: 'Anurag Verma', phone: '+91 94150 88211', email: 'nalandadepot@gmail.com', city: 'Lucknow', gstin: '09ABCPN3301R1Z2', address: 'Aminabad Main Market, Lucknow', tier: 'B', credit_limit: 350000, payment_terms_days: 30, cod_only: 0, manual_hold: '', manual_hold_reason: '', credit_status: 'WARNING', escalation_level: 1, trust_score: 68, ptp_reset_at: '', notes: '' },
    { id: 5, code: 'VND-105', name: 'Bharati Vidya Mandir Chain', category: 'Bookstore Chain', contact_person: 'Kavita Joshi', phone: '+91 98220 55109', email: 'finance@bharatividya.org', city: 'Pune', gstin: '27AABCB6102H1Z8', address: '88 Appa Balwant Chowk, Pune', tier: 'A', credit_limit: 1000000, payment_terms_days: 30, cod_only: 0, manual_hold: '', manual_hold_reason: '', credit_status: 'ACTIVE', escalation_level: 0, trust_score: 96, ptp_reset_at: '', notes: '' },
    { id: 6, code: 'VND-106', name: 'Deccan Readers Hub', category: 'Retail Chain', contact_person: 'Venkatesh Rao', phone: '+91 98480 31942', email: 'buying@deccanreaders.in', city: 'Hyderabad', gstin: '36AABCD8014L1Z4', address: 'Koti Book Street, Hyderabad', tier: 'B', credit_limit: 250000, payment_terms_days: 30, cod_only: 0, manual_hold: '', manual_hold_reason: '', credit_status: 'ACTIVE', escalation_level: 0, trust_score: 88, ptp_reset_at: '', notes: '' },
    { id: 7, code: 'VND-107', name: 'Kalinga Book Emporium', category: 'Retailer', contact_person: 'Subhashis Mohanty', phone: '+91 94370 19820', email: 'kalingabooks@yahoo.in', city: 'Bhubaneswar', gstin: '21AAECK1189N1Z7', address: 'Master Canteen Square, Bhubaneswar', tier: 'C', credit_limit: 0, payment_terms_days: 0, cod_only: 1, manual_hold: '', manual_hold_reason: '', credit_status: 'COD_ONLY', escalation_level: 0, trust_score: 76, ptp_reset_at: '', notes: '' },
    { id: 8, code: 'VND-108', name: 'Chanakya Competitive Bookstore', category: 'Wholesaler', contact_person: 'Manoj Sinha', phone: '+91 94310 66240', email: 'chanakyabooks.patna@gmail.com', city: 'Patna', gstin: '10AAECC7741D1Z3', address: 'Ashok Rajpath, Patna', tier: 'C', credit_limit: 300000, payment_terms_days: 30, cod_only: 0, manual_hold: '', manual_hold_reason: '', credit_status: 'LEGAL_HOLD', escalation_level: 4, trust_score: 14, ptp_reset_at: '', notes: '' }
  ];

  const orders = [
    { id: 1, order_number: 'ORD-26-0912', vendor_id: 1, channel: 'WHATSAPP', channel_ref: 'WA +91 98110 44219', raw_message: 'Urgent dispatch 1700 copies CBSE Class 12 Chemistry Master Guide @ 200', book_title: 'CBSE Class 12 Chemistry Master Guide', isbn: '978-81-94820-11-4', edition: '2026 Revised Ed.', quantity: 1700, unit_price: 200, order_value: 340000, payment_mode: 'CREDIT', advance_ref: '', gate_status: 'APPROVED', gate_pass_code: 'GP-2608-2201', block_reasons: [], production_stage: 'DISPATCHED', dispatch_challan: 'DC-DL-8841 / LR#440912', dispatched_at: dateOffsetISO(-98), override_by: '', override_reason: '', override_condition: '', override_expires_at: '', override_requested: 0, created_by: 'Sales Desk', created_at: `${dateOffsetISO(-102)} 11:15:00` },
    { id: 2, order_number: 'ORD-26-0944', vendor_id: 1, channel: 'EMAIL', channel_ref: 'Term-2 Reorder', raw_message: 'Please dispatch 725 copies CBSE Class 10 Social Science Atlas @ 200', book_title: 'CBSE Class 10 Social Science Atlas', isbn: '978-81-94820-19-0', edition: '3rd Ed.', quantity: 725, unit_price: 200, order_value: 145000, payment_mode: 'CREDIT', advance_ref: '', gate_status: 'APPROVED', gate_pass_code: 'GP-2609-4490', block_reasons: [], production_stage: 'DISPATCHED', dispatch_challan: 'DC-DL-9102 / LR#448701', dispatched_at: dateOffsetISO(-68), override_by: '', override_reason: '', override_condition: '', override_expires_at: '', override_requested: 0, created_by: 'Sales Desk', created_at: `${dateOffsetISO(-71)} 14:40:00` },
    { id: 3, order_number: 'ORD-26-0958', vendor_id: 2, channel: 'WHATSAPP', channel_ref: 'WA +91 98290 77310', raw_message: '1175 pcs NCERT Exam Master Science @ 200', book_title: 'NCERT Exam Master Science Class 10', isbn: '978-81-94820-34-3', edition: '2026 Ed.', quantity: 1175, unit_price: 200, order_value: 235000, payment_mode: 'CREDIT', advance_ref: '', gate_status: 'APPROVED', gate_pass_code: 'GP-2609-5518', block_reasons: [], production_stage: 'DISPATCHED', dispatch_challan: 'DC-RJ-7741 / LR#391004', dispatched_at: dateOffsetISO(-56), override_by: '', override_reason: '', override_condition: '', override_expires_at: '', override_requested: 0, created_by: 'Order Desk', created_at: `${dateOffsetISO(-60)} 10:05:00` },
    { id: 4, order_number: 'ORD-26-0931', vendor_id: 3, channel: 'EMAIL', channel_ref: 'PO# VAW/2026/884', raw_message: '950 copies Applied Mechanics & Thermodynamics @ 300', book_title: 'Applied Mechanics & Thermodynamics', isbn: '978-81-94820-55-8', edition: '5th Ed.', quantity: 950, unit_price: 300, order_value: 285000, payment_mode: 'CREDIT', advance_ref: '', gate_status: 'APPROVED', gate_pass_code: 'GP-2608-3910', block_reasons: [], production_stage: 'DISPATCHED', dispatch_challan: 'DC-MH-6612 / LR#882190', dispatched_at: dateOffsetISO(-89), override_by: '', override_reason: '', override_condition: '', override_expires_at: '', override_requested: 0, created_by: 'Institutional Sales', created_at: `${dateOffsetISO(-93)} 16:20:00` },
    { id: 5, order_number: 'ORD-26-0905', vendor_id: 8, channel: 'PHONE', channel_ref: 'Direct Call', raw_message: '1325 copies UPSC Prelims Question Bank @ 200', book_title: 'UPSC Prelims 15-Year Question Bank', isbn: '978-81-94820-81-7', edition: '2026 Ed.', quantity: 1325, unit_price: 200, order_value: 265000, payment_mode: 'CREDIT', advance_ref: '', gate_status: 'APPROVED', gate_pass_code: 'GP-2607-1194', block_reasons: [], production_stage: 'DISPATCHED', dispatch_challan: 'DC-BR-5109 / LR#710422', dispatched_at: dateOffsetISO(-108), override_by: '', override_reason: '', override_condition: '', override_expires_at: '', override_requested: 0, created_by: 'Sales Desk', created_at: `${dateOffsetISO(-112)} 12:30:00` },
    { id: 6, order_number: 'ORD-26-1001', vendor_id: 1, channel: 'WHATSAPP', channel_ref: 'WA Direct', raw_message: '1800 copies CBSE Class 12 Physics Complete Guide @ 220 - Rajesh Apex Delhi', book_title: 'CBSE Class 12 Physics Complete Guide', isbn: '978-81-94820-12-1', edition: '2026 Revised Ed.', quantity: 1800, unit_price: 220, order_value: 396000, payment_mode: 'CREDIT', advance_ref: '', gate_status: 'BLOCKED', gate_pass_code: '', block_reasons: ['Account is under active LEGAL HOLD (LEG-26-0101). Zero orders or dispatches permitted without CEO clearance.', 'Unresolved Bounced Cheque on account — all credit dispatches frozen.', 'Overdue invoice aged 68 days (₹4,85,000) exceeds 15-day hold threshold.'], production_stage: 'HOLD', dispatch_challan: '', dispatched_at: '', override_by: '', override_reason: '', override_condition: '', override_expires_at: '', override_requested: 0, created_by: 'Order Desk', created_at: `${dateOffsetISO(-1)} 17:12:00` },
    { id: 7, order_number: 'ORD-26-1002', vendor_id: 2, channel: 'WHATSAPP', channel_ref: 'WA +91 98290 77310', raw_message: '900 copies NCERT Exam Master Maths Vol 1 @ 180', book_title: 'NCERT Exam Master Maths Vol. 1', isbn: '978-81-94820-35-0', edition: '2026 Ed.', quantity: 900, unit_price: 180, order_value: 162000, payment_mode: 'CREDIT', advance_ref: '', gate_status: 'APPROVED', gate_pass_code: 'GP-2611-4092', block_reasons: [], production_stage: 'READY_TO_DISPATCH', dispatch_challan: '', dispatched_at: '', override_by: '', override_reason: '', override_condition: '', override_expires_at: '', override_requested: 0, created_by: 'Order Desk', created_at: `${dateOffsetISO(-12)} 10:30:00` },
    { id: 8, order_number: 'ORD-26-1003', vendor_id: 3, channel: 'EMAIL', channel_ref: 'PO# VAW/2026/992', raw_message: '1200 copies Engineering Mathematics 4th Ed @ 280', book_title: 'Engineering Mathematics 4th Ed.', isbn: '978-81-94820-58-9', edition: '4th Ed.', quantity: 1200, unit_price: 280, order_value: 336000, payment_mode: 'CREDIT', advance_ref: '', gate_status: 'BLOCKED', gate_pass_code: '', block_reasons: ['Overdue invoice aged 44 days (₹2,85,000) exceeds 15-day hold threshold.', 'Executive-tier overdue balance requires CEO review.'], production_stage: 'HOLD', dispatch_challan: '', dispatched_at: '', override_by: '', override_reason: '', override_condition: '', override_expires_at: '', override_requested: 1, created_by: 'Institutional Sales', created_at: `${dateOffsetISO(-1)} 13:20:00` },
    { id: 9, order_number: 'ORD-26-1004', vendor_id: 4, channel: 'PHONE', channel_ref: 'Sales Visit', raw_message: '1000 copies Primary English Grammar Series @ 120', book_title: 'Primary English Grammar Series', isbn: '978-81-94820-62-6', edition: '2026 Ed.', quantity: 1000, unit_price: 120, order_value: 120000, payment_mode: 'CREDIT', advance_ref: '', gate_status: 'APPROVED', gate_pass_code: 'GP-2611-6210', block_reasons: [], production_stage: 'PRINTING', dispatch_challan: '', dispatched_at: '', override_by: '', override_reason: '', override_condition: '', override_expires_at: '', override_requested: 0, created_by: 'Sales Desk', created_at: `${dateOffsetISO(-5)} 11:00:00` },
    { id: 10, order_number: 'ORD-26-1005', vendor_id: 5, channel: 'EMAIL', channel_ref: 'PO# BVM-PU-412', raw_message: '1500 copies Competitive Reasoning Workbook @ 170', book_title: 'Competitive Reasoning Workbook', isbn: '978-81-94820-71-8', edition: '2026 Ed.', quantity: 1500, unit_price: 170, order_value: 255000, payment_mode: 'CREDIT', advance_ref: '', gate_status: 'APPROVED', gate_pass_code: 'GP-2611-7745', block_reasons: [], production_stage: 'QUEUED', dispatch_challan: '', dispatched_at: '', override_by: '', override_reason: '', override_condition: '', override_expires_at: '', override_requested: 0, created_by: 'Order Desk', created_at: `${dateOffsetISO(0)} 09:45:00` },
    { id: 11, order_number: 'ORD-26-1006', vendor_id: 6, channel: 'PHONE', channel_ref: 'Order Desk Call', raw_message: '600 copies Modern Indian History Compendium @ 200', book_title: 'Modern Indian History Compendium', isbn: '978-81-94820-79-4', edition: '2nd Ed.', quantity: 600, unit_price: 200, order_value: 120000, payment_mode: 'CREDIT', advance_ref: '', gate_status: 'BLOCKED', gate_pass_code: '', block_reasons: ['Credit limit breached by ₹65,000 (Projected exposure ₹3,15,000 vs Limit ₹2,50,000).'], production_stage: 'HOLD', dispatch_challan: '', dispatched_at: '', override_by: '', override_reason: '', override_condition: '', override_expires_at: '', override_requested: 0, created_by: 'Order Desk', created_at: `${dateOffsetISO(0)} 10:15:00` },
    { id: 12, order_number: 'ORD-26-1007', vendor_id: 7, channel: 'WHATSAPP', channel_ref: 'WA +91 94370 19820', raw_message: 'Transferred ₹84,000 IMPS UTR#632419802211 for 600 copies Odisha State GK Digest', book_title: 'Odisha State GK Digest 2026', isbn: '978-81-94820-90-9', edition: '2026 Ed.', quantity: 600, unit_price: 140, order_value: 84000, payment_mode: 'ADVANCE_PAID', advance_ref: 'IMPS-632419802211', gate_status: 'APPROVED', gate_pass_code: 'GP-2611-8830', block_reasons: [], production_stage: 'READY_TO_DISPATCH', dispatch_challan: '', dispatched_at: '', override_by: '', override_reason: '', override_condition: '', override_expires_at: '', override_requested: 0, created_by: 'Order Desk', created_at: `${dateOffsetISO(-2)} 15:10:00` }
  ];

  const invoices = [
    { id: 1, invoice_number: 'INV-26-5001', vendor_id: 1, order_id: 1, description: 'CBSE Class 12 Chemistry Master Guide (1,700 copies)', issue_date: dateOffsetISO(-98), due_date: dateOffsetISO(-68), amount: 340000, paid_amount: 0, status: 'OVERDUE', cheque_bounced: 1, bounce_details: 'HDFC Cheque #448912 dishonoured — Funds Insufficient', dispatch_pod: 'DC-DL-8841 / Signed POD' },
    { id: 2, invoice_number: 'INV-26-5002', vendor_id: 1, order_id: 2, description: 'CBSE Class 10 Social Science Atlas (725 copies)', issue_date: dateOffsetISO(-68), due_date: dateOffsetISO(-38), amount: 145000, paid_amount: 0, status: 'OVERDUE', cheque_bounced: 0, bounce_details: '', dispatch_pod: 'DC-DL-9102 / VRL #448701' },
    { id: 3, invoice_number: 'INV-26-5003', vendor_id: 2, order_id: 3, description: 'NCERT Exam Master Science Class 10 (1,175 copies)', issue_date: dateOffsetISO(-56), due_date: dateOffsetISO(-26), amount: 235000, paid_amount: 0, status: 'OVERDUE', cheque_bounced: 0, bounce_details: '', dispatch_pod: 'DC-RJ-7741 / LR#391004' },
    { id: 4, invoice_number: 'INV-26-5004', vendor_id: 3, order_id: 4, description: 'Applied Mechanics & Thermodynamics (950 copies)', issue_date: dateOffsetISO(-89), due_date: dateOffsetISO(-44), amount: 285000, paid_amount: 0, status: 'OVERDUE', cheque_bounced: 0, bounce_details: '', dispatch_pod: 'DC-MH-6612 / Gati #882190' },
    { id: 5, invoice_number: 'INV-26-5005', vendor_id: 4, order_id: null, description: 'Junior Atlas & Social Studies Batch (1,150 copies)', issue_date: dateOffsetISO(-41), due_date: dateOffsetISO(-11), amount: 165000, paid_amount: 50000, status: 'PARTIAL', cheque_bounced: 0, bounce_details: '', dispatch_pod: 'DC-UP-6201 / Delivery Note' },
    { id: 6, invoice_number: 'INV-26-5006', vendor_id: 5, order_id: null, description: 'Term-1 School Textbook Supply (1,200 copies)', issue_date: dateOffsetISO(-12), due_date: dateOffsetISO(18), amount: 240000, paid_amount: 0, status: 'UNPAID', cheque_bounced: 0, bounce_details: '', dispatch_pod: 'DC-MH-9012 / Pune POD' },
    { id: 7, invoice_number: 'INV-26-5007', vendor_id: 6, order_id: null, description: 'Bestseller Literature & History Mix (975 copies)', issue_date: dateOffsetISO(-16), due_date: dateOffsetISO(14), amount: 195000, paid_amount: 0, status: 'UNPAID', cheque_bounced: 0, bounce_details: '', dispatch_pod: 'DC-TS-8104 / Hyderabad POD' },
    { id: 8, invoice_number: 'INV-26-5008', vendor_id: 8, order_id: 5, description: 'UPSC Prelims 15-Year Question Bank (1,325 copies)', issue_date: dateOffsetISO(-108), due_date: dateOffsetISO(-78), amount: 265000, paid_amount: 0, status: 'OVERDUE', cheque_bounced: 0, bounce_details: '', dispatch_pod: 'DC-BR-5109 / SafeExpress' }
  ];

  const payments = [
    { id: 1, vendor_id: 4, invoice_id: 5, amount: 50000, mode: 'NEFT', reference_no: 'NEFT-SBIN26110891', payment_date: dateOffsetISO(-9), recorded_by: 'Accounts', notes: 'Partial payment received' }
  ];

  const collection_logs = [
    { id: 1, vendor_id: 1, caller_name: 'Priya (Telecalling)', outcome: 'PROMISED_TO_PAY', ptp_amount: 340000, ptp_date: dateOffsetISO(-52), ptp_status: 'BROKEN', notes: 'Said "give me 7 days, school collections coming in".', created_at: `${dateOffsetISO(-59)} 11:20:00` },
    { id: 2, vendor_id: 1, caller_name: 'Priya (Telecalling)', outcome: 'PROMISED_TO_PAY', ptp_amount: 340000, ptp_date: dateOffsetISO(-38), ptp_status: 'BROKEN', notes: 'Asked for 7 more days. Handed PDC cheque #448912 which bounced.', created_at: `${dateOffsetISO(-45)} 15:10:00` },
    { id: 3, vendor_id: 1, caller_name: 'Rohan (Accounts)', outcome: 'PROMISED_TO_PAY', ptp_amount: 485000, ptp_date: dateOffsetISO(-18), ptp_status: 'BROKEN', notes: 'Promised RTGS within 7 days after cheque bounce; stopped picking calls.', created_at: `${dateOffsetISO(-25)} 12:05:00` },
    { id: 4, vendor_id: 2, caller_name: 'Priya (Telecalling)', outcome: 'PROMISED_TO_PAY', ptp_amount: 235000, ptp_date: dateOffsetISO(-16), ptp_status: 'BROKEN', notes: 'Promised full RTGS in 7 days. No payment arrived.', created_at: `${dateOffsetISO(-23)} 10:40:00` },
    { id: 5, vendor_id: 2, caller_name: 'Priya (Telecalling)', outcome: 'PROMISED_TO_PAY', ptp_amount: 235000, ptp_date: dateOffsetISO(-5), ptp_status: 'BROKEN', notes: 'Second 7-day promise broken while trying to get Maths order dispatched.', created_at: `${dateOffsetISO(-12)} 16:30:00` },
    { id: 6, vendor_id: 3, caller_name: 'Rohan (Accounts)', outcome: 'PROMISED_TO_PAY', ptp_amount: 285000, ptp_date: dateOffsetISO(-14), ptp_status: 'BROKEN', notes: 'Finance signatory out of station; missed promised clearance.', created_at: `${dateOffsetISO(-21)} 14:15:00` },
    { id: 7, vendor_id: 4, caller_name: 'Priya (Telecalling)', outcome: 'PROMISED_TO_PAY', ptp_amount: 115000, ptp_date: dateOffsetISO(-4), ptp_status: 'BROKEN', notes: 'Paid ₹50,000 partial; missed remaining ₹1,15,000 date.', created_at: `${dateOffsetISO(-10)} 11:00:00` },
    { id: 8, vendor_id: 4, caller_name: 'Priya (Telecalling)', outcome: 'PROMISED_TO_PAY', ptp_amount: 115000, ptp_date: dateOffsetISO(2), ptp_status: 'OPEN', notes: 'Confirmed balance transfer within 48 hours via NEFT.', created_at: `${dateOffsetISO(-1)} 14:20:00` },
    { id: 9, vendor_id: 8, caller_name: 'Priya (Telecalling)', outcome: 'PROMISED_TO_PAY', ptp_amount: 265000, ptp_date: dateOffsetISO(-62), ptp_status: 'BROKEN', notes: 'Asked for 7 days grace.', created_at: `${dateOffsetISO(-69)} 10:15:00` },
    { id: 10, vendor_id: 8, caller_name: 'Priya (Telecalling)', outcome: 'PROMISED_TO_PAY', ptp_amount: 265000, ptp_date: dateOffsetISO(-48), ptp_status: 'BROKEN', notes: 'Asked for another 7 days.', created_at: `${dateOffsetISO(-55)} 12:45:00` },
    { id: 11, vendor_id: 8, caller_name: 'Rohan (Accounts)', outcome: 'PROMISED_TO_PAY', ptp_amount: 265000, ptp_date: dateOffsetISO(-30), ptp_status: 'BROKEN', notes: 'Final commitment broken; escalated to Legal.', created_at: `${dateOffsetISO(-37)} 16:00:00` }
  ];

  const legal_cases = [
    { id: 1, case_number: 'LEG-26-0101', vendor_id: 1, stage: 'LEGAL_NOTICE_DRAFTED', trigger_reason: 'Cheque #448912 (₹3,40,000) dishonoured + ₹4,85,000 overdue 68d', claimed_principal: 485000, claimed_interest: 14120, advocate_name: 'Adv. Meera Deshmukh', notice_sent_date: '', cure_deadline: '', next_action_date: dateOffsetISO(1), settlement_notes: 'Section 138 NI Act + Civil Demand Notice ready to serve.' },
    { id: 2, case_number: 'LEG-26-0102', vendor_id: 8, stage: 'NOTICE_SERVED', trigger_reason: '₹2,65,000 overdue 78d + 3 Broken Promises', claimed_principal: 265000, claimed_interest: 10190, advocate_name: 'Adv. Vikramaditya Nair', notice_sent_date: dateOffsetISO(-3), cure_deadline: dateOffsetISO(4), next_action_date: dateOffsetISO(4), settlement_notes: 'Registered Speed Post AD & Email Legal Notice served.' }
  ];

  return { policy, vendors, orders, invoices, payments, collection_logs, legal_cases, coordination_feed: [] };
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seeded = createInitialSeed();
  syncAll(seeded);
  saveStore(seeded);
  return seeded;
}

function saveStore(store) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
}

function nextId(arr) {
  return arr.reduce((m, x) => Math.max(m, Number(x.id || 0)), 0) + 1;
}

function isOverrideValid(o) {
  if (!o || o.gate_status !== 'CEO_OVERRIDE') return false;
  if (!o.override_expires_at) return true;
  return o.override_expires_at >= todayISO();
}

function computeMetrics(store, vendorId, excludeOrderId = null) {
  const vendor = store.vendors.find(v => v.id === Number(vendorId));
  if (!vendor) return null;
  const policy = store.policy;
  const today = todayISO();

  let unpaid_invoiced = 0, overdue_amount = 0, current_not_due = 0, max_overdue_days = 0;
  let has_bounced_cheque = false, accrued_interest = 0;
  const aging = { current: 0, d1_15: 0, d16_30: 0, d31_60: 0, d61_plus: 0 };

  for (const inv of store.invoices) {
    if (inv.vendor_id !== vendor.id || inv.status === 'CANCELLED') continue;
    const bal = Math.max(0, Number(inv.amount) - Number(inv.paid_amount));
    if (bal <= 0.01 || inv.status === 'PAID') continue;
    unpaid_invoiced += bal;
    if (inv.cheque_bounced) has_bounced_cheque = true;
    const od = daysBetween(inv.due_date, today);
    if (od > 0) {
      overdue_amount += bal;
      if (od > max_overdue_days) max_overdue_days = od;
      accrued_interest += bal * (Number(policy.interest_rate_pa) / 100) * (od / 365);
      if (od <= 15) aging.d1_15 += bal;
      else if (od <= 30) aging.d16_30 += bal;
      else if (od <= 60) aging.d31_60 += bal;
      else aging.d61_plus += bal;
    } else {
      current_not_due += bal;
      aging.current += bal;
    }
  }

  let in_production_value = 0, in_production_count = 0, blocked_orders_value = 0, blocked_orders_count = 0;
  for (const ord of store.orders) {
    if (ord.vendor_id !== vendor.id || ord.id === excludeOrderId) continue;
    if (ord.production_stage === 'CANCELLED' || ord.production_stage === 'DISPATCHED') continue;
    if (ord.gate_status === 'BLOCKED' || ord.gate_status === 'DISPATCH_BLOCKED') {
      blocked_orders_value += Number(ord.order_value);
      blocked_orders_count++;
    } else if (['QUEUED', 'PRINTING', 'READY_TO_DISPATCH'].includes(ord.production_stage)) {
      in_production_value += Number(ord.order_value);
      in_production_count++;
    }
  }

  const total_exposure = unpaid_invoiced + in_production_value;
  const credit_limit = Number(vendor.credit_limit || 0);
  const utilization_pct = credit_limit > 0 ? Math.round((total_exposure / credit_limit) * 100) : (total_exposure > 0 ? 100 : 0);

  let total_broken_ptps = 0, active_broken_ptps = 0, open_ptp = null;
  const vLogs = store.collection_logs.filter(l => l.vendor_id === vendor.id).sort((a, b) => b.id - a.id);
  for (const log of vLogs) {
    if (log.ptp_status === 'BROKEN') {
      total_broken_ptps++;
      if (!vendor.ptp_reset_at || log.created_at >= vendor.ptp_reset_at) active_broken_ptps++;
    }
    if (!open_ptp && log.outcome === 'PROMISED_TO_PAY' && log.ptp_status === 'OPEN') open_ptp = log;
  }

  const active_legal_case = store.legal_cases.find(c => c.vendor_id === vendor.id && c.stage !== 'CLOSED') || null;

  const risk_reasons = [];
  const legalAgeHalf = Math.max(15, Math.floor(Number(policy.legal_overdue_days) / 2));
  const triggersLegal = Boolean(active_legal_case) || vendor.manual_hold === 'LEGAL_HOLD' || has_bounced_cheque ||
    max_overdue_days >= Number(policy.legal_overdue_days) ||
    (overdue_amount >= Number(policy.legal_value_threshold) && max_overdue_days >= legalAgeHalf);
  const triggersCeo = max_overdue_days >= Number(policy.ceo_overdue_days) ||
    (overdue_amount >= Number(policy.ceo_value_threshold) && max_overdue_days >= Number(policy.overdue_hold_days));
  const triggersHold = vendor.manual_hold === 'CREDIT_HOLD' || max_overdue_days >= Number(policy.overdue_hold_days) ||
    active_broken_ptps >= Number(policy.max_broken_ptps) || (credit_limit > 0 && total_exposure > credit_limit);
  const triggersWarn = max_overdue_days > 0 || utilization_pct >= Number(policy.soft_warning_pct) || active_broken_ptps > 0;

  if (has_bounced_cheque) risk_reasons.push('Unresolved Bounced Cheque on account — all credit dispatches frozen.');
  if (max_overdue_days >= Number(policy.overdue_hold_days)) {
    risk_reasons.push(`Overdue invoice aged ${max_overdue_days} days (${fmtMoney(overdue_amount, policy.currency_symbol)}) exceeds ${policy.overdue_hold_days}-day hold threshold.`);
  }
  if (active_broken_ptps >= Number(policy.max_broken_ptps)) {
    risk_reasons.push(`${active_broken_ptps} Broken Promises-to-Pay on record (strike limit: ${policy.max_broken_ptps}) — auto-blocked to break 7-day stall loop.`);
  }
  if (credit_limit > 0 && total_exposure > credit_limit) {
    risk_reasons.push(`Credit limit breached by ${fmtMoney(total_exposure - credit_limit, policy.currency_symbol)} (Projected exposure ${fmtMoney(total_exposure, policy.currency_symbol)} vs Limit ${fmtMoney(credit_limit, policy.currency_symbol)}).`);
  }
  if (vendor.manual_hold) risk_reasons.push(`Manual Credit Freeze: ${vendor.manual_hold_reason || 'Frozen by Management'}`);

  let escalation_level = 0;
  let credit_status = vendor.cod_only ? 'COD_ONLY' : 'ACTIVE';
  if (triggersLegal) { escalation_level = 4; credit_status = 'LEGAL_HOLD'; }
  else if (triggersCeo) { escalation_level = 3; credit_status = 'CREDIT_HOLD'; }
  else if (triggersHold) { escalation_level = 2; credit_status = 'CREDIT_HOLD'; }
  else if (triggersWarn) { escalation_level = 1; credit_status = vendor.cod_only ? 'COD_ONLY' : 'WARNING'; }

  return {
    vendor, unpaid_invoiced: Math.round(unpaid_invoiced), overdue_amount: Math.round(overdue_amount),
    current_not_due: Math.round(current_not_due), max_overdue_days, has_bounced_cheque,
    accrued_interest: Math.round(accrued_interest), in_production_value: Math.round(in_production_value),
    in_production_count, blocked_orders_value: Math.round(blocked_orders_value), blocked_orders_count,
    total_exposure: Math.round(total_exposure), credit_limit, credit_available: Math.max(0, credit_limit - total_exposure),
    utilization_pct, active_broken_ptps, total_broken_ptps, open_ptp, active_legal_case,
    aging, escalation_level, credit_status, risk_reasons
  };
}

function syncVendor(store, vendorId, autoLegal = true) {
  const m = computeMetrics(store, vendorId);
  if (!m) return null;
  m.vendor.credit_status = m.credit_status;
  m.vendor.escalation_level = m.escalation_level;
  if (autoLegal && m.credit_status === 'LEGAL_HOLD' && !m.active_legal_case) {
    const id = nextId(store.legal_cases);
    store.legal_cases.push({
      id, case_number: `LEG-26-${String(100 + id).padStart(4, '0')}`, vendor_id: vendorId,
      stage: 'CASE_OPENED', trigger_reason: m.risk_reasons[0] || 'Auto-escalated by Policy',
      claimed_principal: m.overdue_amount || m.unpaid_invoiced, claimed_interest: m.accrued_interest,
      advocate_name: 'Adv. Meera Deshmukh', notice_sent_date: '', cure_deadline: '',
      next_action_date: dateOffsetISO(3), settlement_notes: 'Auto-opened by PressGuard Credit Engine.'
    });
  }
  return computeMetrics(store, vendorId);
}

function syncAll(store) {
  for (const v of store.vendors) syncVendor(store, v.id, false);
}

function evaluateGate(store, vendorId, orderValue, paymentMode = 'CREDIT', { excludeOrderId = null, isDispatchCheck = false } = {}) {
  const policy = store.policy;
  const sym = policy.currency_symbol;
  const m = computeMetrics(store, vendorId, excludeOrderId);
  const v = m.vendor;
  const val = Number(orderValue || 0);
  const reasons = [];
  const projected_exposure = paymentMode === 'ADVANCE_PAID' ? m.total_exposure : m.total_exposure + (isDispatchCheck ? 0 : val);
  const projected_utilization_pct = v.credit_limit > 0 ? Math.round((projected_exposure / v.credit_limit) * 100) : (projected_exposure > 0 ? 100 : 0);

  if (m.credit_status === 'LEGAL_HOLD' || v.manual_hold === 'LEGAL_HOLD') {
    reasons.push(`Account is under active LEGAL HOLD (${m.active_legal_case ? m.active_legal_case.case_number : 'Blacklisted'}). Zero orders or dispatches permitted without CEO clearance.`);
  }
  if (paymentMode === 'ADVANCE_PAID') {
    if (policy.block_advance_if_overdue && m.overdue_amount > 0) {
      reasons.push(`Account has ${fmtMoney(m.overdue_amount, sym)} in unpaid overdue dues (${m.max_overdue_days}d).`);
    }
  } else {
    if (v.cod_only) reasons.push('Vendor is restricted to COD / 100% Advance Only — credit orders are disabled.');
    if (v.manual_hold === 'CREDIT_HOLD') reasons.push(`Manual Credit Freeze active: ${v.manual_hold_reason || 'Frozen by Management'}`);
    if (m.has_bounced_cheque) reasons.push('Unresolved Bounced Cheque on account — all credit dispatches frozen.');
    if (m.max_overdue_days >= Number(policy.overdue_hold_days)) {
      reasons.push(`Overdue invoice aged ${m.max_overdue_days} days (${fmtMoney(m.overdue_amount, sym)}) exceeds ${policy.overdue_hold_days}-day hold threshold.`);
    }
    if (m.active_broken_ptps >= Number(policy.max_broken_ptps)) {
      reasons.push(`${m.active_broken_ptps} Broken Promises-to-Pay on record (strike limit: ${policy.max_broken_ptps}) — auto-blocked to break 7-day stall loop.`);
    }
    if (v.credit_limit > 0 && projected_exposure > v.credit_limit) {
      reasons.push(`Credit limit breached by ${fmtMoney(projected_exposure - v.credit_limit, sym)} (Projected exposure ${fmtMoney(projected_exposure, sym)} vs Limit ${fmtMoney(v.credit_limit, sym)}).`);
    }
  }
  return { passed: reasons.length === 0, projected_exposure: Math.round(projected_exposure), projected_utilization_pct, reasons, warnings: [], metrics: m };
}

function buildShareLinks() {
  const base = `${window.location.origin}${window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '')}`;
  const isOnline = window.location.protocol === 'https:';
  return {
    local_url: `${base}/`,
    lan_url: `${base}/`,
    public_url: isOnline ? `${base}/` : '',
    share_base: `${base}/`,
    role_links: ['CEO', 'SALES', 'PRODUCTION', 'TELECALLING', 'FINANCE', 'LEGAL'].map(role => ({
      role,
      url: `${base}/?role=${role}`,
      hi_url: `${base}/?role=${role}&lang=hi`
    }))
  };
}

function buildPayload(store, role = 'CEO') {
  syncAll(store);
  const policy = store.policy;
  const today = todayISO();

  const vendors = store.vendors.map(v => {
    const m = computeMetrics(store, v.id);
    const { vendor: _v, ...rest } = m;
    return { ...v, metrics: rest };
  }).sort((a, b) => b.escalation_level - a.escalation_level || a.name.localeCompare(b.name));

  const vMap = new Map(vendors.map(v => [v.id, v]));

  const orders = [...store.orders].sort((a, b) => b.id - a.id).map(o => {
    const v = vMap.get(o.vendor_id);
    const live_dispatch_risk = ['QUEUED', 'PRINTING', 'READY_TO_DISPATCH'].includes(o.production_stage) &&
      !isOverrideValid(o) && v && (v.credit_status === 'CREDIT_HOLD' || v.credit_status === 'LEGAL_HOLD' || v.metrics.has_bounced_cheque);
    return {
      ...o,
      vendor_name: v?.name || '', vendor_code: v?.code || '', vendor_city: v?.city || '',
      vendor_credit_status: v?.credit_status || 'ACTIVE',
      override_valid: isOverrideValid(o), live_dispatch_risk: Boolean(live_dispatch_risk),
      vendor_overdue: v ? v.metrics.overdue_amount : 0, vendor_broken_ptps: v ? v.metrics.active_broken_ptps : 0
    };
  });

  const invoices = store.invoices.map(inv => {
    const v = vMap.get(inv.vendor_id);
    const bal = Math.max(0, Number(inv.amount) - Number(inv.paid_amount));
    const od = bal > 0 ? Math.max(0, daysBetween(inv.due_date, today)) : 0;
    return { ...inv, vendor_name: v?.name || '', vendor_code: v?.code || '', balance: Math.round(bal), overdue_days: od };
  });

  const legal_cases = store.legal_cases.map(lc => {
    const v = vMap.get(lc.vendor_id);
    return {
      ...lc, vendor_name: v?.name || '', vendor_city: v?.city || '', contact_person: v?.contact_person || '',
      phone: v?.phone || '', live_overdue: v ? v.metrics.overdue_amount : 0,
      live_max_overdue_days: v ? v.metrics.max_overdue_days : 0, has_bounced_cheque: v ? v.metrics.has_bounced_cheque : false
    };
  });

  const total_receivables = vendors.reduce((s, v) => s + v.metrics.unpaid_invoiced, 0);
  const total_overdue = vendors.reduce((s, v) => s + v.metrics.overdue_amount, 0);
  const total_blocked_value = orders.filter(o => (o.gate_status === 'BLOCKED' || o.gate_status === 'DISPATCH_BLOCKED') && o.production_stage !== 'CANCELLED').reduce((s, o) => s + Number(o.order_value), 0);
  const blocked_orders_count = orders.filter(o => (o.gate_status === 'BLOCKED' || o.gate_status === 'DISPATCH_BLOCKED') && o.production_stage !== 'CANCELLED').length;
  const active_production_count = orders.filter(o => ['QUEUED', 'PRINTING', 'READY_TO_DISPATCH'].includes(o.production_stage) && (o.gate_status === 'APPROVED' || o.gate_status === 'CEO_OVERRIDE')).length;
  const dispatch_risk_count = orders.filter(o => o.live_dispatch_risk).length;
  const pending_overrides_count = orders.filter(o => (o.gate_status === 'BLOCKED' || o.gate_status === 'DISPATCH_BLOCKED') && o.override_requested && o.production_stage !== 'CANCELLED').length;
  const active_legal_count = legal_cases.filter(c => c.stage !== 'CLOSED').length;
  const legal_exposure_value = legal_cases.filter(c => c.stage !== 'CLOSED').reduce((s, c) => s + c.live_overdue, 0);

  const aging_totals = { current: 0, d1_15: 0, d16_30: 0, d31_60: 0, d61_plus: 0 };
  for (const v of vendors) {
    for (const k of Object.keys(aging_totals)) aging_totals[k] += v.metrics.aging[k];
  }

  const totalPay = store.payments.reduce((s, p) => s + Number(p.amount), 0);
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsHi = ['जन', 'फर', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुल', 'अग', 'सित', 'अक्टू', 'नव', 'दिस'];
  const hist = [
    { billed: 1120000, collected: 910000, blocked: 140000 },
    { billed: 1340000, collected: 980000, blocked: 220000 },
    { billed: 1480000, collected: 1020000, blocked: 310000 },
    { billed: 1290000, collected: 870000, blocked: 460000 },
    { billed: 1620000, collected: 1090000, blocked: 640000 }
  ];
  const nowD = new Date();
  const hasData = vendors.length > 0;
  const monthly_cashflow = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(nowD.getFullYear(), nowD.getMonth() - i, 1);
    const mi = d.getMonth();
    monthly_cashflow.push(i === 0
      ? { month_en: monthsEn[mi], month_hi: monthsHi[mi], billed: hasData ? Math.round(total_receivables + totalPay) : 0, collected: hasData ? Math.round(680000 + totalPay) : 0, blocked: Math.round(total_blocked_value) }
      : { month_en: monthsEn[mi], month_hi: monthsHi[mi], billed: hasData ? hist[5 - i].billed : 0, collected: hasData ? hist[5 - i].collected : 0, blocked: hasData ? hist[5 - i].blocked : 0 });
  }

  const chMap = {
    WHATSAPP: { channel: 'WHATSAPP', cleared_value: 0, blocked_value: 0, cleared_count: 0, blocked_count: 0 },
    EMAIL: { channel: 'EMAIL', cleared_value: 0, blocked_value: 0, cleared_count: 0, blocked_count: 0 },
    PHONE: { channel: 'PHONE', cleared_value: 0, blocked_value: 0, cleared_count: 0, blocked_count: 0 },
    DIRECT: { channel: 'DIRECT', cleared_value: 0, blocked_value: 0, cleared_count: 0, blocked_count: 0 }
  };
  for (const o of orders) {
    if (o.production_stage === 'CANCELLED') continue;
    const k = chMap[o.channel] ? o.channel : 'DIRECT';
    if (o.gate_status === 'BLOCKED' || o.gate_status === 'DISPATCH_BLOCKED') { chMap[k].blocked_value += o.order_value; chMap[k].blocked_count++; }
    else { chMap[k].cleared_value += o.order_value; chMap[k].cleared_count++; }
  }

  return {
    today, actor: { role, name: role }, share: buildShareLinks(), policy,
    analytics: { monthly_cashflow, channel_stats: Object.values(chMap) },
    kpis: {
      total_receivables: Math.round(total_receivables), total_overdue: Math.round(total_overdue),
      overdue_ratio_pct: total_receivables > 0 ? Math.round((total_overdue / total_receivables) * 100) : 0,
      total_blocked_value: Math.round(total_blocked_value), blocked_orders_count, active_production_count,
      dispatch_risk_count, pending_overrides_count, active_legal_count, legal_exposure_value: Math.round(legal_exposure_value),
      aging_totals
    },
    vendors, orders, invoices, collection_logs: store.collection_logs, legal_cases, coordination_feed: []
  };
}

function parseRawText(store, text) {
  const raw = String(text || '').trim();
  const lower = raw.toLowerCase();
  let matched = null, best = 0;
  for (const v of store.vendors) {
    let sc = 0;
    if (lower.includes(v.name.toLowerCase())) sc += 100;
    for (const w of v.name.toLowerCase().split(/\s+/)) {
      if (w.length >= 4 && !['book', 'books', 'house', 'distributors', 'publishers', 'stores', 'depot'].includes(w) && lower.includes(w)) sc += 35;
    }
    if (sc > best) { best = sc; matched = v; }
  }
  const qm = raw.match(/\b(\d{2,6})\s*(?:copies|copy|pcs|books|units)\b/i);
  const pm = raw.match(/(?:@|rs\.?|₹|rate)\s*[:=-]?\s*(\d{2,5})/i);
  const tm = raw.match(/["“']([^"”']{4,80})["”']/);
  let channel = 'WHATSAPP';
  if (/po#|subject:|dear\s+/i.test(raw)) channel = 'EMAIL';
  else if (/phone|call/i.test(raw)) channel = 'PHONE';
  return { vendor_id: matched?.id || null, quantity: qm ? Number(qm[1]) : null, unit_price: pm ? Number(pm[1]) : null, book_title: tm ? tm[1] : '', channel };
}

function makeErr(msg, status = 400, payload = {}) {
  const e = new Error(msg);
  e.status = status;
  e.payload = payload;
  return e;
}

export async function handleLocalApi(url, method = 'GET', body = null, role = 'CEO') {
  const store = loadStore();
  const b = body || {};

  if (method === 'GET' && url === '/api/bootstrap') return buildPayload(store, role);

  if (method === 'POST' && url === '/api/system/reset-demo') {
    const fresh = createInitialSeed();
    syncAll(fresh);
    saveStore(fresh);
    return { ok: true, data: buildPayload(fresh, role) };
  }

  if (method === 'POST' && url === '/api/system/start-fresh') {
    store.vendors = []; store.orders = []; store.invoices = []; store.payments = []; store.collection_logs = []; store.legal_cases = [];
    saveStore(store);
    return { ok: true, data: buildPayload(store, role) };
  }

  if (method === 'PUT' && url === '/api/policy') {
    const currMap = { INR: '₹', USD: '$', GBP: '£', EUR: '€' };
    Object.assign(store.policy, {
      company_name: String(b.company_name || store.policy.company_name),
      currency_code: b.currency_code || 'INR',
      currency_symbol: currMap[b.currency_code] || '₹',
      overdue_hold_days: Number(b.overdue_hold_days ?? 15),
      max_broken_ptps: Number(b.max_broken_ptps ?? 2),
      ceo_overdue_days: Number(b.ceo_overdue_days ?? 30),
      legal_overdue_days: Number(b.legal_overdue_days ?? 60),
      legal_value_threshold: Number(b.legal_value_threshold ?? 300000)
    });
    syncAll(store);
    saveStore(store);
    return { ok: true, data: buildPayload(store, role) };
  }

  let m;
  if (method === 'GET' && (m = url.match(/^\/api\/vendors\/(\d+)$/))) {
    const id = Number(m[1]);
    const metrics = computeMetrics(store, id);
    if (!metrics) throw makeErr('Vendor not found', 404);
    const today = todayISO();
    return {
      vendor: metrics.vendor, metrics,
      invoices: store.invoices.filter(i => i.vendor_id === id).map(inv => {
        const bal = Math.max(0, inv.amount - inv.paid_amount);
        return { ...inv, balance: Math.round(bal), overdue_days: bal > 0 ? Math.max(0, daysBetween(inv.due_date, today)) : 0 };
      }),
      orders: store.orders.filter(o => o.vendor_id === id).sort((a, b) => b.id - a.id),
      payments: store.payments.filter(p => p.vendor_id === id),
      collection_logs: store.collection_logs.filter(c => c.vendor_id === id).sort((a, b) => b.id - a.id),
      legal_cases: store.legal_cases.filter(l => l.vendor_id === id)
    };
  }

  if (method === 'POST' && url === '/api/vendors') {
    const id = nextId(store.vendors);
    const cod = b.cod_only ? 1 : 0;
    store.vendors.push({
      id, code: `VND-${100 + id}`, name: b.name, category: b.category || 'Distributor',
      contact_person: b.contact_person, phone: b.phone, email: b.email || '', city: b.city || '',
      gstin: b.gstin || '', address: b.address || '', tier: b.tier || 'B',
      credit_limit: cod ? 0 : Number(b.credit_limit || 300000), payment_terms_days: Number(b.payment_terms_days ?? 30),
      cod_only: cod, manual_hold: '', manual_hold_reason: '', credit_status: cod ? 'COD_ONLY' : 'ACTIVE', escalation_level: 0, trust_score: 85, ptp_reset_at: '', notes: ''
    });
    saveStore(store);
    return { ok: true, id, data: buildPayload(store, role) };
  }

  if (method === 'PUT' && (m = url.match(/^\/api\/vendors\/(\d+)$/))) {
    const v = store.vendors.find(x => x.id === Number(m[1]));
    if (!v) throw makeErr('Vendor not found', 404);
    const cod = b.cod_only !== undefined ? (b.cod_only ? 1 : 0) : v.cod_only;
    Object.assign(v, b, { cod_only: cod, credit_limit: cod ? 0 : Number(b.credit_limit ?? v.credit_limit) });
    syncVendor(store, v.id);
    saveStore(store);
    return { ok: true, data: buildPayload(store, role) };
  }

  if (method === 'POST' && (m = url.match(/^\/api\/vendors\/(\d+)\/hold$/))) {
    const v = store.vendors.find(x => x.id === Number(m[1]));
    if (!v) throw makeErr('Vendor not found', 404);
    v.manual_hold = b.hold_type || '';
    v.manual_hold_reason = b.reason || '';
    syncVendor(store, v.id, v.manual_hold === 'LEGAL_HOLD');
    saveStore(store);
    return { ok: true, data: buildPayload(store, role) };
  }

  if (method === 'POST' && url === '/api/orders/parse') return { ok: true, parsed: parseRawText(store, b.text) };

  if (method === 'POST' && url === '/api/orders/precheck') {
    return { ok: true, evaluation: evaluateGate(store, Number(b.vendor_id), Number(b.order_value), b.payment_mode) };
  }

  if (method === 'POST' && url === '/api/orders') {
    const vid = Number(b.vendor_id);
    const qty = Math.max(1, Number(b.quantity || 1));
    const price = Math.max(1, Number(b.unit_price || 1));
    const val = Math.round(qty * price);
    const ev = evaluateGate(store, vid, val, b.payment_mode || 'CREDIT');
    const id = nextId(store.orders);
    const order_number = `ORD-26-${1000 + id}`;
    const gate_status = ev.passed ? 'APPROVED' : 'BLOCKED';
    const gate_pass_code = ev.passed ? genPass() : '';
    store.orders.push({
      id, order_number, vendor_id: vid, channel: b.channel || 'WHATSAPP', channel_ref: '', raw_message: b.raw_message || '',
      book_title: b.book_title, isbn: '', edition: 'Standard', quantity: qty, unit_price: price, order_value: val,
      payment_mode: b.payment_mode || 'CREDIT', advance_ref: b.advance_ref || '', gate_status, gate_pass_code,
      block_reasons: ev.reasons, production_stage: ev.passed ? 'QUEUED' : 'HOLD', dispatch_challan: '', dispatched_at: '',
      override_by: '', override_reason: '', override_condition: '', override_expires_at: '', override_requested: !ev.passed && b.request_override ? 1 : 0,
      created_by: role, created_at: `${todayISO()} 12:00:00`
    });
    saveStore(store);
    return { ok: true, order_id: id, order_number, gate_status, gate_pass_code, evaluation: ev, data: buildPayload(store, role) };
  }

  if (method === 'POST' && (m = url.match(/^\/api\/orders\/(\d+)\/request-override$/))) {
    const o = store.orders.find(x => x.id === Number(m[1]));
    if (o) o.override_requested = 1;
    saveStore(store);
    return { ok: true, data: buildPayload(store, role) };
  }

  if (method === 'POST' && (m = url.match(/^\/api\/orders\/(\d+)\/ceo-override$/))) {
    if (role !== 'CEO') throw makeErr('Only CEO access can approve or reject blocked orders.', 403);
    const o = store.orders.find(x => x.id === Number(m[1]));
    if (!o) throw makeErr('Order not found', 404);
    if (b.decision === 'APPROVE') {
      o.gate_status = 'CEO_OVERRIDE';
      o.gate_pass_code = o.gate_pass_code || genPass();
      o.production_stage = o.production_stage === 'DISPATCH_HOLD' ? 'READY_TO_DISPATCH' : 'QUEUED';
      o.override_by = 'CEO'; o.override_reason = b.reason || ''; o.override_condition = b.condition || '';
      o.override_expires_at = dateOffsetISO(Number(b.valid_days || 7)); o.override_requested = 0;
    } else {
      o.production_stage = 'CANCELLED'; o.override_requested = 0; o.override_reason = b.reason || '';
    }
    saveStore(store);
    return { ok: true, data: buildPayload(store, role) };
  }

  if (method === 'POST' && (m = url.match(/^\/api\/orders\/(\d+)\/recheck$/))) {
    const o = store.orders.find(x => x.id === Number(m[1]));
    if (!o) throw makeErr('Order not found', 404);
    const ev = evaluateGate(store, o.vendor_id, o.order_value, o.payment_mode, { excludeOrderId: o.id });
    if (ev.passed) {
      o.gate_status = 'APPROVED'; o.gate_pass_code = o.gate_pass_code || genPass(); o.block_reasons = [];
      o.production_stage = o.production_stage === 'DISPATCH_HOLD' ? 'READY_TO_DISPATCH' : 'QUEUED'; o.override_requested = 0;
      saveStore(store);
      return { ok: true, cleared: true, gate_pass_code: o.gate_pass_code, data: buildPayload(store, role) };
    }
    o.block_reasons = ev.reasons;
    saveStore(store);
    throw makeErr(ev.reasons[0] || 'Still blocked.', 409, { reasons: ev.reasons, data: buildPayload(store, role) });
  }

  if (method === 'POST' && (m = url.match(/^\/api\/orders\/(\d+)\/stage$/))) {
    const o = store.orders.find(x => x.id === Number(m[1]));
    if (!o) throw makeErr('Order not found', 404);
    if (o.gate_status === 'BLOCKED' || o.gate_status === 'DISPATCH_BLOCKED') throw makeErr('Blocked order cannot enter Production.', 409);
    o.production_stage = b.stage;
    saveStore(store);
    return { ok: true, data: buildPayload(store, role) };
  }

  if (method === 'POST' && (m = url.match(/^\/api\/orders\/(\d+)\/dispatch$/))) {
    const o = store.orders.find(x => x.id === Number(m[1]));
    if (!o) throw makeErr('Order not found', 404);
    if (!isOverrideValid(o)) {
      const g2 = evaluateGate(store, o.vendor_id, o.order_value, o.payment_mode, { excludeOrderId: o.id, isDispatchCheck: true });
      if (!g2.passed) {
        o.gate_status = 'DISPATCH_BLOCKED'; o.production_stage = 'DISPATCH_HOLD'; o.block_reasons = g2.reasons;
        saveStore(store);
        throw makeErr('STOP DISPATCH! Account defaulted while printing.', 409, { gate2_blocked: true, reasons: g2.reasons, data: buildPayload(store, role) });
      }
    }
    const v = store.vendors.find(x => x.id === o.vendor_id);
    const today = todayISO();
    o.production_stage = 'DISPATCHED'; o.dispatch_challan = b.dispatch_challan || `DC-${String(Date.now()).slice(-5)}`; o.dispatched_at = today;
    const invId = nextId(store.invoices);
    const invNo = `INV-26-${5000 + invId}`;
    const isAdv = o.payment_mode === 'ADVANCE_PAID';
    store.invoices.push({
      id: invId, invoice_number: invNo, vendor_id: o.vendor_id, order_id: o.id, description: `${o.book_title} (${o.quantity} copies)`,
      issue_date: today, due_date: isAdv ? today : dateOffsetISO(v?.payment_terms_days || 30),
      amount: o.order_value, paid_amount: isAdv ? o.order_value : 0, status: isAdv ? 'PAID' : 'UNPAID', cheque_bounced: 0, bounce_details: '', dispatch_pod: o.dispatch_challan
    });
    saveStore(store);
    return { ok: true, invoice_number: invNo, challan: o.dispatch_challan, data: buildPayload(store, role) };
  }

  if (method === 'POST' && url === '/api/collections/log') {
    const vid = Number(b.vendor_id);
    const metrics = computeMetrics(store, vid);
    if (b.outcome === 'PROMISED_TO_PAY' && metrics.active_broken_ptps >= Number(store.policy.max_broken_ptps) && role === 'TELECALLING') {
      throw makeErr(`7-Day Loop Locked! ${metrics.vendor.name} already broke ${metrics.active_broken_ptps} promises. Escalate to CEO or Legal.`, 409, { loop_blocked: true });
    }
    if (b.outcome === 'PROMISED_TO_PAY') {
      store.collection_logs.filter(l => l.vendor_id === vid && l.ptp_status === 'OPEN').forEach(l => { l.ptp_status = 'SUPERSEDED'; });
    }
    store.collection_logs.push({
      id: nextId(store.collection_logs), vendor_id: vid, caller_name: role, outcome: b.outcome,
      ptp_amount: b.outcome === 'PROMISED_TO_PAY' ? Number(b.ptp_amount || 0) : 0,
      ptp_date: b.outcome === 'PROMISED_TO_PAY' ? String(b.ptp_date || '') : '',
      ptp_status: b.outcome === 'PROMISED_TO_PAY' ? 'OPEN' : 'NA',
      notes: b.notes || '', created_at: `${todayISO()} 12:00:00`
    });
    syncVendor(store, vid);
    saveStore(store);
    return { ok: true, data: buildPayload(store, role) };
  }

  if (method === 'POST' && (m = url.match(/^\/api\/collections\/(\d+)\/mark-broken$/))) {
    const l = store.collection_logs.find(x => x.id === Number(m[1]));
    if (l) { l.ptp_status = 'BROKEN'; syncVendor(store, l.vendor_id); }
    saveStore(store);
    return { ok: true, data: buildPayload(store, role) };
  }

  if (method === 'POST' && url === '/api/payments') {
    const vid = Number(b.vendor_id);
    let rem = Math.round(Number(b.amount || 0));
    const unpaid = store.invoices.filter(i => i.vendor_id === vid && i.status !== 'PAID' && i.status !== 'CANCELLED')
      .sort((a, c) => (a.id === Number(b.invoice_id) ? -1 : c.id === Number(b.invoice_id) ? 1 : a.due_date.localeCompare(c.due_date)));
    for (const inv of unpaid) {
      if (rem <= 0) break;
      const owed = Math.max(0, inv.amount - inv.paid_amount);
      const apply = Math.min(rem, owed);
      inv.paid_amount += apply;
      const done = inv.paid_amount >= inv.amount - 0.5;
      inv.status = done ? 'PAID' : 'PARTIAL';
      if (done) inv.cheque_bounced = 0;
      rem -= apply;
    }
    store.payments.push({ id: nextId(store.payments), vendor_id: vid, invoice_id: b.invoice_id || null, amount: Math.round(Number(b.amount)), mode: b.mode || 'NEFT', reference_no: b.reference_no || '', payment_date: b.payment_date || todayISO(), recorded_by: role, notes: '' });
    const open = store.collection_logs.find(l => l.vendor_id === vid && l.ptp_status === 'OPEN');
    if (open && Number(b.amount) >= open.ptp_amount * 0.8) open.ptp_status = 'KEPT';
    if (computeMetrics(store, vid).overdue_amount === 0) {
      const v = store.vendors.find(x => x.id === vid);
      if (v) v.ptp_reset_at = `${todayISO()} 23:59:59`;
    }
    const after = syncVendor(store, vid, false);
    saveStore(store);
    return { ok: true, new_status: after.credit_status, remaining_overdue: after.overdue_amount, data: buildPayload(store, role) };
  }

  if (method === 'POST' && url === '/api/invoices') {
    const id = nextId(store.invoices);
    const invNo = String(b.invoice_number || '').trim() || `INV-26-${5000 + id}`;
    const amt = Math.round(Number(b.amount || 0));
    const od = daysBetween(b.due_date, todayISO()) > 0;
    store.invoices.push({
      id, invoice_number: invNo, vendor_id: Number(b.vendor_id), order_id: null,
      description: b.description || 'Manual Bill', issue_date: b.issue_date || todayISO(), due_date: b.due_date,
      amount: amt, paid_amount: 0, status: od ? 'OVERDUE' : 'UNPAID', cheque_bounced: 0, bounce_details: '', dispatch_pod: 'Manual'
    });
    syncVendor(store, Number(b.vendor_id));
    saveStore(store);
    return { ok: true, invoice_number: invNo, data: buildPayload(store, role) };
  }

  if (method === 'POST' && (m = url.match(/^\/api\/invoices\/(\d+)\/bounce$/))) {
    const inv = store.invoices.find(x => x.id === Number(m[1]));
    if (inv) { inv.cheque_bounced = 1; inv.bounce_details = b.details || 'Cheque Bounced'; syncVendor(store, inv.vendor_id, true); }
    saveStore(store);
    return { ok: true, data: buildPayload(store, role) };
  }

  if (method === 'POST' && url === '/api/legal/escalate') {
    const vid = Number(b.vendor_id);
    const metrics = computeMetrics(store, vid);
    const id = nextId(store.legal_cases);
    const case_number = `LEG-26-${100 + id}`;
    metrics.vendor.manual_hold = 'LEGAL_HOLD';
    metrics.vendor.manual_hold_reason = b.reason || 'Legal Escalation';
    store.legal_cases.push({
      id, case_number, vendor_id: vid, stage: 'CASE_OPENED', trigger_reason: b.reason || 'Escalated',
      claimed_principal: metrics.overdue_amount || metrics.unpaid_invoiced, claimed_interest: metrics.accrued_interest,
      advocate_name: b.advocate_name || 'Adv. Meera Deshmukh', notice_sent_date: '', cure_deadline: '',
      next_action_date: dateOffsetISO(3), settlement_notes: b.notes || ''
    });
    syncVendor(store, vid, false);
    saveStore(store);
    return { ok: true, case_number, data: buildPayload(store, role) };
  }

  if (method === 'PUT' && (m = url.match(/^\/api\/legal\/(\d+)$/))) {
    const lc = store.legal_cases.find(x => x.id === Number(m[1]));
    if (lc) {
      lc.stage = b.stage || lc.stage;
      lc.advocate_name = b.advocate_name ?? lc.advocate_name;
      lc.settlement_notes = b.settlement_notes ?? lc.settlement_notes;
      if (lc.stage === 'NOTICE_SERVED' && !lc.notice_sent_date) { lc.notice_sent_date = todayISO(); lc.cure_deadline = dateOffsetISO(7); }
      if (lc.stage === 'CLOSED') {
        const v = store.vendors.find(x => x.id === lc.vendor_id);
        if (v && v.manual_hold === 'LEGAL_HOLD') { v.manual_hold = ''; v.manual_hold_reason = ''; }
      }
      syncVendor(store, lc.vendor_id, false);
    }
    saveStore(store);
    return { ok: true, data: buildPayload(store, role) };
  }

  if (method === 'GET' && (m = url.match(/^\/api\/legal\/evidence\/(\d+)$/))) {
    const vid = Number(m[1]);
    const metrics = computeMetrics(store, vid);
    const v = metrics.vendor;
    const lc = store.legal_cases.find(c => c.vendor_id === vid);
    const unpaid = store.invoices.filter(i => i.vendor_id === vid && i.status !== 'PAID' && i.status !== 'CANCELLED');
    const sym = store.policy.currency_symbol;
    const totalClaim = metrics.overdue_amount + metrics.accrued_interest;
    const invLines = unpaid.map((inv, i) => `${i + 1}. Invoice ${inv.invoice_number} | Due: ${inv.due_date} | Outstanding: ${fmtMoney(inv.amount - inv.paid_amount, sym)}${inv.cheque_bounced ? ' [CHEQUE BOUNCED]' : ''}`).join('\n');
    const notice_text = `WITHOUT PREJUDICE — FORMAL LEGAL DEMAND NOTICE\nDate: ${todayISO()}\nCase Ref: ${lc ? lc.case_number : 'PRE-LITIGATION'}\n\nTO:\n${v.name}\nAttn: ${v.contact_person}\nAddress: ${v.address || v.city}\nGSTIN: ${v.gstin || 'On Record'}\n\nSUBJECT: FINAL DEMAND FOR OVERDUE DUES OF ${fmtMoney(totalClaim, sym)} (PRINCIPAL ${fmtMoney(metrics.overdue_amount, sym)} + INTEREST ${fmtMoney(metrics.accrued_interest, sym)} @ ${store.policy.interest_rate_pa}% P.A.)\n\n1. UNPAID OVERDUE INVOICES:\n${invLines}\n\n2. ACTION REQUIRED:\nRemit ${fmtMoney(totalClaim, sym)} via RTGS/NEFT within 7 DAYS failing which formal civil recovery${metrics.has_bounced_cheque ? ' and Section 138 NI Act proceedings' : ''} shall be initiated.\n\nIssued By:\n${lc ? lc.advocate_name : 'Legal Counsel'}\n${store.policy.company_name}`;
    return { ok: true, pack: { vendor: v, metrics, legal_case: lc, unpaid_invoices: unpaid, notice_text } };
  }

  if (method === 'POST' && url === '/api/import/vendors') {
    const lines = String(b.csv_text || '').trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) throw makeErr('Include header + at least 1 row.', 400);
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
    let cnt = 0;
    for (const line of lines.slice(1)) {
      const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)|(?<=,|^)(?=,|$)/g) || line.split(',');
      const row = {};
      headers.forEach((h, i) => { row[h] = (cols[i] || '').replace(/^"|"$/g, '').trim(); });
      if (!row.name || !row.phone) continue;
      const id = nextId(store.vendors);
      store.vendors.push({
        id, code: `VND-${100 + id}`, name: row.name, category: row.category || 'Distributor',
        contact_person: row.contact_person || 'Manager', phone: row.phone, email: row.email || '',
        city: row.city || '', gstin: row.gstin || '', address: '', tier: row.tier || 'B',
        credit_limit: Number(row.credit_limit || 300000), payment_terms_days: Number(row.payment_terms_days || 30),
        cod_only: /yes|true|1/i.test(row.cod_only || '') ? 1 : 0, manual_hold: '', manual_hold_reason: '',
        credit_status: 'ACTIVE', escalation_level: 0, trust_score: 85, ptp_reset_at: '', notes: ''
      });
      if (Number(row.opening_overdue_amount || 0) > 0) {
        const od = Number(row.opening_overdue_days || 0);
        const invId = nextId(store.invoices);
        store.invoices.push({
          id: invId, invoice_number: `INV-26-${5000 + invId}`, vendor_id: id, order_id: null,
          description: 'Opening Balance', issue_date: dateOffsetISO(-(od + 30)), due_date: dateOffsetISO(-od),
          amount: Number(row.opening_overdue_amount), paid_amount: 0, status: od > 0 ? 'OVERDUE' : 'UNPAID',
          cheque_bounced: 0, bounce_details: '', dispatch_pod: 'CSV Import'
        });
      }
      syncVendor(store, id);
      cnt++;
    }
    saveStore(store);
    return { ok: true, imported_vendors: cnt, data: buildPayload(store, role) };
  }

  throw makeErr(`Unhandled local route: ${method} ${url}`, 404);
}
