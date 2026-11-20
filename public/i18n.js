const DICT = {
  en: {
    // App chrome
    app_tagline: 'Publishing CRM',
    credit_lock_active: 'Credit Protection Active',
    search_placeholder: 'Search buyer, order, book or city...',
    share: 'Share',
    new_order: 'New Order',
    help_guide: 'Quick Guide',
    settings_csv: 'Settings & Excel',

    // Roles
    role_CEO: 'CEO Access',
    role_SALES: 'Sales Desk',
    role_PRODUCTION: 'Production Floor',
    role_TELECALLING: 'Collections Team',
    role_FINANCE: 'Finance Desk',
    role_LEGAL: 'Legal Team',

    role_desc_CEO: 'Full command center, approvals, credit locks & settings',
    role_desc_SALES: 'Enter WhatsApp/Email orders and check credit live',
    role_desc_PRODUCTION: 'Only sees Safe-to-Ship vs Blocked orders',
    role_desc_TELECALLING: 'Daily payment calls & WhatsApp reminders (7-day loop locked)',
    role_desc_FINANCE: 'Record payments, old bills, holds & Excel exports',
    role_desc_LEGAL: 'Legal cases, evidence dossiers & formal demand notices',

    // Navigation
    nav_ceo: 'Overview',
    nav_intake: 'Orders',
    nav_production: 'Production',
    nav_collections: 'Collections',
    nav_legal: 'Legal',
    nav_vendors: 'Buyers',
    nav_settings: 'Settings & Excel',

    // Page Titles
    title_ceo: 'CEO Command Center',
    title_intake: 'Orders & Credit Gate',
    title_production: 'Production & Dispatch',
    title_collections: 'Payment Follow-ups',
    title_legal: 'Legal Recovery',
    title_vendors: 'All Buyers & Credit',
    title_settings: 'Settings & Excel Data',

    // Status Chips
    st_ACTIVE: 'Good Standing',
    st_WARNING: 'Caution',
    st_CREDIT_HOLD: 'Credit Blocked',
    st_LEGAL_HOLD: 'Legal Hold',
    st_COD_ONLY: 'Advance Only',
    st_APPROVED: 'Cleared',
    st_BLOCKED: 'Blocked',
    st_DISPATCH_BLOCKED: 'Ship Stopped',
    st_CEO_OVERRIDE: 'CEO Approved',
    st_OPEN: 'Promised',
    st_BROKEN: 'Promise Broken',
    st_KEPT: 'Paid on Time',
    st_PAID: 'Paid',
    st_PARTIAL: 'Partial',
    st_OVERDUE: 'Overdue',
    st_UNPAID: 'Pending',

    // Channels
    ch_WHATSAPP: 'WhatsApp',
    ch_EMAIL: 'Email',
    ch_PHONE: 'Phone',
    ch_DIRECT: 'Direct',
    ch_PORTAL: 'Portal',

    // CEO Overview
    kpi_overdue: 'Overdue Receivables',
    kpi_overdue_sub: '{n} buyers late · {tot} total',
    kpi_saved: 'Saved by Credit Lock',
    kpi_saved_sub: '{n} risky orders stopped',
    kpi_decisions: 'Pending Decisions',
    kpi_decisions_sub: '{a} approval · {b} dispatch alert',
    kpi_legal: 'With Legal Team',
    kpi_legal_sub: '{n} active cases · notice ready',

    chart_trend_title: '6-Month Cash Collection vs Risk Blocked',
    chart_trend_sub: 'Hover any month for exact figures · click legend to filter',
    leg_billed: 'Billed',
    leg_collected: 'Collected',
    leg_blocked: 'Bad Orders Blocked',

    chart_aging_title: 'Overdue Aging Breakdown',
    chart_aging_sub: 'Click any bar below to filter the buyers table live',
    age_all: 'All Buyers',
    age_current: 'On Time',
    age_d1_15: '1–15d Late',
    age_d16_30: '16–30d Late',
    age_d31_60: '31–60d Late',
    age_d61_plus: '60+d Legal',
    overdue_label: 'Overdue',

    chart_channel_title: 'Order Channels — Safe vs Blocked',
    chart_channel_sub: 'Shows which channels late buyers try to order through',
    cleared_orders: 'Safe Orders',
    blocked_orders: 'Blocked Orders',

    action_title: 'Needs Your Attention Today',
    action_urgent: '{n} Urgent',
    action_clear: 'All Clear',
    ship_risk_tag: 'Warehouse Ship Alert',
    ship_risk_msg: 'Books printed, but buyer defaulted — stop loading!',
    approval_tag: 'Approval Requested',
    big_late_msg: '{d} days late — ready for Legal notice',
    btn_stop_ship: 'Stop Ship',
    btn_decide: 'Decide',
    btn_send_legal: 'Send Legal',
    btn_pay: 'Record Payment',
    btn_paid_short: 'Paid',
    btn_notice: 'Notice',
    btn_details: 'Details',
    btn_all_buyers: 'View All Buyers',
    nothing_urgent: 'No urgent approvals or dispatch risks right now.',

    buyers_table_title: 'Buyer Receivables & Risk Watchlist',
    filter_all: 'All',
    filter_late: 'Overdue',
    filter_blocked: 'Blocked / Legal',
    filter_safe: 'Good Standing',
    clear_filter: 'Clear Chart Filter',
    col_buyer: 'Buyer & City',
    col_status: 'Status',
    col_credit: 'Credit Usage',
    col_overdue: 'Overdue Amount',
    col_promises: 'Promises',
    col_action: 'Action',
    days_late: '{d}d late',
    on_time: 'On time',
    broken_count: '{n} broken',
    broken_one: '1 broken',
    copies_unit: 'copies',
    copied_msg: 'Copied!',
    cheque_bounced: 'Cheque Bounced',
    no_buyers_match: 'No buyers match this filter.',

    // Orders Intake
    enter_order: 'Enter New Order',
    demo_late: 'Try Late Buyer',
    demo_good: 'Try Good Buyer',
    paste_label: 'Paste WhatsApp or Email Order Message (Optional)',
    paste_placeholder: 'Paste raw customer WhatsApp or Email text to auto-fill buyer, book title & quantity...',
    auto_fill: 'Auto-Fill Form',
    order_channel: 'Order Source',
    select_buyer: 'Buyer / Distributor',
    choose_buyer: 'Select a buyer...',
    book_title: 'Book Title / Print Job',
    book_placeholder: 'e.g. CBSE Class 12 Physics Guide',
    copies: 'Copies (Qty)',
    rate_per_book: 'Rate per Copy',
    payment_type: 'Payment Mode',
    mode_credit: 'Trade Credit',
    mode_advance: '100% Advance Paid',
    advance_ref: 'Advance UTR / Reference',
    advance_ref_ph: 'Required only for Advance Paid',
    ask_ceo_chk: 'Flag blocked order for CEO special approval',
    total_order: 'Order Total',
    btn_check_submit: 'Check Credit & Submit',
    btn_approve_send: 'Approve & Send to Production',
    btn_save_blocked: 'Save as Blocked Order',
    gate_idle_title: 'Live Credit Gate',
    gate_idle_sub: 'Select a buyer or click "Try Late Buyer" to check credit limit, overdue bills & broken promises instantly.',
    gate_pass_title: 'SAFE TO APPROVE',
    gate_fail_title: 'BLOCKED — DO NOT SHIP',
    credit_with_order: 'Credit Used With This Order',
    reasons_blocked: 'Why It Is Blocked',
    gate_pass_note: 'Account is clean. Submitting issues a verified Production Gate Pass.',
    recent_orders: 'Recent Orders',
    tab_in_prod: 'In Production',
    recheck: 'Re-Check',
    ask_ceo: 'Ask CEO',
    asked_ceo: 'Asked CEO',

    // Production
    prod_safe_title: 'Safe to Print & Ship',
    prod_safe_badge: 'Verified Passes',
    prod_blocked_title: 'Blocked — Do Not Print or Ship',
    prod_blocked_badge: 'Hard Locked',
    stage_QUEUED: 'In Queue',
    stage_PRINTING: 'Printing',
    stage_READY_TO_DISPATCH: 'Ready to Ship',
    stage_DISPATCHED: 'Dispatched',
    btn_start_print: 'Start Printing',
    btn_ready_ship: 'Mark Ready to Ship',
    btn_final_ship: 'Final Check & Ship',
    btn_print_pass: 'Pass',
    btn_ship_locked: 'Shipping Locked',
    gate2_warn_title: 'Dispatch Alert:',
    gate2_warn_body: 'Buyer became overdue ({amt}) while printing. Click below to run final dispatch lock.',
    no_prod_jobs: 'No jobs waiting in Production.',
    no_blocked_jobs: 'No blocked orders right now.',

    // Collections
    loop_banner_title: '7-Day Loop Protection Active:',
    loop_banner_body: 'After {n} broken payment promises, telecallers are locked from giving casual 7-day extensions — account auto-freezes and escalates.',
    btn_add_old_bill: 'Add Old Bill',
    call_queue_title: 'Today\'s Payment Follow-up Queue',
    overdue_first: 'Most Urgent First',
    escalate_chip: 'Escalate Now',
    promised_chip: 'Promised {d}',
    not_due_yet: 'Not due yet',
    btn_call: 'Log Call',
    btn_whatsapp: 'WhatsApp',
    btn_broken: 'Mark Broken',
    zero_pending: 'All payments are cleared!',

    // Legal
    legal_active_title: 'Active Legal Cases',
    legal_blacklisted: 'Blacklisted from Shipping',
    legal_candidates_title: 'High-Risk Late Buyers Ready for Legal',
    btn_legal_notice: 'Legal Notice',
    btn_update_stage: 'Update Stage',
    btn_settled: 'Settled / Paid',
    deadline_lbl: 'Deadline',
    st_CASE_OPENED: 'Case Opened',
    st_LEGAL_NOTICE_DRAFTED: 'Notice Ready',
    st_NOTICE_SERVED: 'Notice Sent',
    st_SECTION_138_NI_ACT: 'Sec. 138 Court',
    st_RECOVERY_SUIT: 'Recovery Suit',
    st_SETTLEMENT_PLAN: 'Settling',
    st_CLOSED: 'Closed',

    // Buyers Directory
    add_buyer: 'Add Buyer',
    credit_used: 'Credit Used',
    limit_lbl: 'Limit',
    btn_freeze: 'Freeze',
    btn_unfreeze: 'Unfreeze',

    // Settings & CSV
    tab_rules: 'Credit Rules',
    tab_csv: 'Excel / CSV',
    company_rules_title: 'Company & Credit Protection Rules',
    company_name_lbl: 'Publishing House Name',
    currency_lbl: 'Currency',
    auto_block_days: 'Auto-Block After (Days Overdue)',
    max_broken_lbl: 'Max Broken Promises (7-Day Loop Limit)',
    ceo_alert_days: 'CEO Alert After (Days Overdue)',
    legal_days_lbl: 'Auto-Legal After (Days Overdue)',
    legal_amt_lbl: 'High-Value Legal Threshold',
    btn_start_fresh: 'Clear Demo & Start Fresh',
    btn_restore_demo: 'Restore Demo Data',
    btn_save_rules: 'Save Rules',
    csv_import_title: 'Import Buyers from Excel / CSV',
    csv_export_title: 'Download Excel / Tally Reports',
    dl_template: 'Template',
    load_sample: 'Load Sample',
    choose_file: 'Choose File',
    btn_import: 'Import Buyers',
    btn_download: 'Download',

    // Share Modal
    share_title: 'Share & Role Access',
    share_sub: 'Give each teammate a link with only the screens meant for their role',
    live_online_link: 'Live Online Link (Works Anywhere):',
    office_wifi_link: 'Office Wi-Fi Link (Same Network):',
    copy_link: 'Copy Link',
    copy_en: 'Copy EN',
    copy_hi: 'Copy हिंदी',
    open_view: 'Preview',
    current_chip: 'Active',
    done: 'Done',
    cancel: 'Cancel',

    // Layman Guided Help per View
    help_ceo: [
      '1. Top 4 cards show how much money is late, how much was saved by blocking bad orders, and what needs your decision today.',
      '2. Click any bar in "Overdue Aging" to filter the buyer list below immediately.',
      '3. Click "Paid" on any buyer when money arrives — blocked orders unlock automatically.'
    ],
    help_intake: [
      '1. Paste a customer WhatsApp or Email message and click Auto-Fill.',
      '2. Check the right panel: GREEN means safe to print; RED means buyer has overdue bills and order is automatically blocked.',
      '3. Even if saved as Blocked, Production cannot print or ship it without payment or CEO approval.'
    ],
    help_production: [
      '1. Left GREEN side = Safe to print and ship. Always check the Gate Pass number.',
      '2. Right RED side = Payment pending. DO NOT print or load these books.',
      '3. Before loading any truck, click "Final Check & Ship" — the system checks payment one last time.'
    ],
    help_collections: [
      '1. Call buyers from top to bottom (most overdue first).',
      '2. Click "WhatsApp" to send an instant pre-written payment reminder.',
      '3. After 2 broken promises, the system stops 7-day loops automatically — click "Send Legal" or alert the CEO.'
    ],
    help_legal: [
      '1. Every buyer here is automatically blocked across Sales and Production.',
      '2. Click "Legal Notice" to get a ready-to-print Formal Notice with all unpaid bills, delivery proofs & broken call records.',
      '3. Update the stage as Notice is sent or when the buyer settles.'
    ],
    help_vendors: [
      '1. View every buyer\'s credit limit, how much they owe, and whether they are Safe or Blocked.',
      '2. Click any buyer name to open their full history of bills, orders, calls, and payments.',
      '3. Use "Freeze" anytime to immediately stop all dispatches to a buyer.'
    ],
    help_settings: [
      '1. Change your Publishing House name, overdue hold days, and broken-promise limit here.',
      '2. Switch to "Excel / CSV" to import your real buyers or download Tally/Excel reports.',
      '3. Click "Clear Demo & Start Fresh" whenever you are ready to load your real accounts.'
    ]
  },

  hi: {
    // App chrome
    app_tagline: 'पब्लिशिंग CRM',
    credit_lock_active: 'क्रेडिट सुरक्षा चालू है',
    search_placeholder: 'पार्टी, ऑर्डर, किताब या शहर खोजें...',
    share: 'शेयर करें',
    new_order: 'नया ऑर्डर',
    help_guide: 'मदद / गाइड',
    settings_csv: 'सेटिंग्स व एक्सेल',

    // Roles
    role_CEO: 'CEO (पूरा अधिकार)',
    role_SALES: 'सेल्स / ऑर्डर डेस्क',
    role_PRODUCTION: 'प्रोडक्शन व डिस्पैच',
    role_TELECALLING: 'टेलीकॉलिंग / वसूली',
    role_FINANCE: 'अकाउंट्स / फाइनेंस',
    role_LEGAL: 'लीगल टीम',

    role_desc_CEO: 'पूरा डैशबोर्ड, मंज़ूरी, क्रेडिट लॉक और सभी सेटिंग्स',
    role_desc_SALES: 'WhatsApp/Email ऑर्डर डालें और तुरंत क्रेडिट चेक करें',
    role_desc_PRODUCTION: 'सिर्फ़ सुरक्षित ऑर्डर और रोके गए ऑर्डर दिखेंगे',
    role_desc_TELECALLING: 'रोज़ की पेमेंट कॉल व WhatsApp रिमाइंडर (7-दिन लूप बंद)',
    role_desc_FINANCE: 'पेमेंट एंट्री, पुराने बिल, अकाउंट होल्ड और एक्सेल रिपोर्ट',
    role_desc_LEGAL: 'लीगल केस, सबूत फाइल और तैयार लीगल नोटिस',

    // Navigation
    nav_ceo: 'मुख्य डैशबोर्ड',
    nav_intake: 'ऑर्डर',
    nav_production: 'प्रोडक्शन',
    nav_collections: 'पेमेंट फॉलो-अप',
    nav_legal: 'लीगल केस',
    nav_vendors: 'पार्टियां',
    nav_settings: 'सेटिंग्स व एक्सेल',

    // Page Titles
    title_ceo: 'CEO मुख्य डैशबोर्ड',
    title_intake: 'नए ऑर्डर व क्रेडिट जांच',
    title_production: 'प्रोडक्शन व माल डिस्पैच',
    title_collections: 'पेमेंट फॉलो-अप (वसूली)',
    title_legal: 'लीगल रिकवरी डेस्क',
    title_vendors: 'सभी पार्टियां व क्रेडिट खाता',
    title_settings: 'सेटिंग्स व एक्सेल डेटा',

    // Status Chips
    st_ACTIVE: 'खाता सही है',
    st_WARNING: 'ध्यान दें',
    st_CREDIT_HOLD: 'क्रेडिट बंद',
    st_LEGAL_HOLD: 'लीगल रोक',
    st_COD_ONLY: 'सिर्फ़ एडवांस',
    st_APPROVED: 'मंज़ूर',
    st_BLOCKED: 'रोका गया',
    st_DISPATCH_BLOCKED: 'डिस्पैच रुका',
    st_CEO_OVERRIDE: 'CEO छूट',
    st_OPEN: 'वादा किया',
    st_BROKEN: 'वादा टूटा',
    st_KEPT: 'समय पर मिला',
    st_PAID: 'चुकाया गया',
    st_PARTIAL: 'आधा मिला',
    st_OVERDUE: 'बकाया (लेट)',
    st_UNPAID: 'बाकी है',

    // Channels
    ch_WHATSAPP: 'WhatsApp',
    ch_EMAIL: 'ईमेल',
    ch_PHONE: 'फ़ोन कॉल',
    ch_DIRECT: 'सीधा ऑर्डर',
    ch_PORTAL: 'पोर्टल',

    // CEO Overview
    kpi_overdue: 'बकाया पैसा (लेट)',
    kpi_overdue_sub: '{n} पार्टियां लेट · कुल {tot} में से',
    kpi_saved: 'क्रेडिट लॉक से बचा पैसा',
    kpi_saved_sub: '{n} जोखिम भरे ऑर्डर अपने-आप रुके',
    kpi_decisions: 'आपके फ़ैसले बाकी',
    kpi_decisions_sub: '{a} मंज़ूरी · {b} डिस्पैच अलर्ट',
    kpi_legal: 'लीगल टीम के पास',
    kpi_legal_sub: '{n} सक्रिय केस · नोटिस तैयार',

    chart_trend_title: '6 महीने की वसूली बनाम बचाया गया पैसा',
    chart_trend_sub: 'सही आंकड़े देखने के लिए किसी भी महीने पर माउस ले जाएँ',
    leg_billed: 'कुल बिलिंग',
    leg_collected: 'वसूली मिली',
    leg_blocked: 'रोके गए गलत ऑर्डर',

    chart_aging_title: 'पैसा कितने दिन से फंसा है',
    chart_aging_sub: 'नीचे किसी भी बार पर क्लिक करके पार्टियां फ़िल्टर करें',
    age_all: 'सभी पार्टियां',
    age_current: 'समय पर',
    age_d1_15: '1–15 दिन',
    age_d16_30: '16–30 दिन',
    age_d31_60: '31–60 दिन',
    age_d61_plus: '60+ दिन लीगल',
    overdue_label: 'बकाया',

    chart_channel_title: 'ऑर्डर कहां से आए — सुरक्षित बनाम रोके गए',
    chart_channel_sub: 'देखें कि लेट पार्टियां किस चैनल से ऑर्डर भेजती हैं',
    cleared_orders: 'सुरक्षित ऑर्डर',
    blocked_orders: 'रोके गए ऑर्डर',

    action_title: 'आज के ज़रूरी काम',
    action_urgent: '{n} ज़रूरी',
    action_clear: 'सब ठीक है',
    ship_risk_tag: 'गोदाम डिस्पैच अलर्ट',
    ship_risk_msg: 'किताबें छप गई हैं, पर पार्टी का पैसा बकाया है — माल रोकें!',
    approval_tag: 'मंज़ूरी मांगी गई',
    big_late_msg: '{d} दिन लेट — लीगल नोटिस भेजने योग्य',
    btn_stop_ship: 'माल रोकें',
    btn_decide: 'फ़ैसला लें',
    btn_send_legal: 'लीगल भेजें',
    btn_pay: 'पेमेंट दर्ज करें',
    btn_paid_short: 'पेमेंट मिला',
    btn_notice: 'नोटिस देखें',
    btn_details: 'पूरा खाता',
    btn_all_buyers: 'सभी पार्टियां देखें',
    nothing_urgent: 'अभी कोई ज़रूरी फ़ैसला या डिस्पैच खतरा बाकी नहीं है।',

    buyers_table_title: 'पार्टियों का बकाया और जोखिम सूची',
    filter_all: 'सभी',
    filter_late: 'बकाया (लेट)',
    filter_blocked: 'रोकी गई / लीगल',
    filter_safe: 'सही खाता',
    clear_filter: 'फ़िल्टर हटाएँ',
    col_buyer: 'पार्टी और शहर',
    col_status: 'स्थिति',
    col_credit: 'क्रेडिट उपयोग',
    col_overdue: 'बकाया राशि',
    col_promises: 'टूटे वादे',
    col_action: 'कार्रवाई',
    days_late: '{d} दिन लेट',
    on_time: 'समय पर',
    broken_count: '{n} टूटे',
    broken_one: '1 टूटा',
    copies_unit: 'प्रतियां',
    copied_msg: 'लिंक कॉपी हो गया!',
    cheque_bounced: 'चेक बाउंस',
    no_buyers_match: 'इस फ़िल्टर में कोई पार्टी नहीं मिली।',

    // Orders Intake
    enter_order: 'नया ऑर्डर दर्ज करें',
    demo_late: 'डेमो: लेट पार्टी',
    demo_good: 'डेमो: अच्छी पार्टी',
    paste_label: 'ग्राहक का WhatsApp या ईमेल मैसेज यहाँ पेस्ट करें (वैकल्पिक)',
    paste_placeholder: 'WhatsApp/Email का मैसेज पेस्ट करें — नाम, किताब और कॉपी अपने-आप भर जाएँगी...',
    auto_fill: 'अपने-आप भरें',
    order_channel: 'ऑर्डर का माध्यम',
    select_buyer: 'पार्टी / डिस्ट्रीब्यूटर चुनें',
    choose_buyer: 'पार्टी चुनें...',
    book_title: 'किताब का नाम',
    book_placeholder: 'जैसे: कक्षा 12 फिजिक्स गाइड',
    copies: 'कॉपी की संख्या',
    rate_per_book: 'एक किताब का रेट',
    payment_type: 'पेमेंट का तरीका',
    mode_credit: 'उधार (क्रेडिट)',
    mode_advance: '100% एडवांस मिला',
    advance_ref: 'एडवांस UTR / रसीद नंबर',
    advance_ref_ph: 'सिर्फ़ एडवांस पेमेंट होने पर',
    ask_ceo_chk: 'अगर ऑर्डर रुके तो CEO से विशेष मंज़ूरी मांगें',
    total_order: 'कुल ऑर्डर राशि',
    btn_check_submit: 'क्रेडिट जांचें व ऑर्डर डालें',
    btn_approve_send: 'मंज़ूर करें व प्रोडक्शन भेजें',
    btn_save_blocked: 'रुके हुए ऑर्डर में सेव करें',
    gate_idle_title: 'लाइव क्रेडिट जांच',
    gate_idle_sub: 'किसी पार्टी को चुनें या "डेमो: लेट पार्टी" दबाएँ — तुरंत पता चलेगा कि ऑर्डर भेजना सुरक्षित है या नहीं।',
    gate_pass_title: 'ऑर्डर सुरक्षित है — मंज़ूर',
    gate_fail_title: 'रोका गया — माल न भेजें',
    credit_with_order: 'इस ऑर्डर के बाद कुल उधार',
    reasons_blocked: 'रोकने के कारण',
    gate_pass_note: 'पार्टी का खाता सही है। ऑर्डर डालते ही प्रोडक्शन के लिए गेट पास बन जाएगा।',
    recent_orders: 'हाल के ऑर्डर',
    tab_in_prod: 'प्रोडक्शन में',
    recheck: 'फिर जांचें',
    ask_ceo: 'CEO से पूछें',
    asked_ceo: 'CEO को भेजा',

    // Production
    prod_safe_title: 'प्रिंट और डिस्पैच के लिए सुरक्षित',
    prod_safe_badge: 'पास सत्यापित',
    prod_blocked_title: 'रोका गया — प्रिंट या माल न भेजें',
    prod_blocked_badge: 'सख़्त रोक',
    stage_QUEUED: 'लाइन में',
    stage_PRINTING: 'छपाई जारी',
    stage_READY_TO_DISPATCH: 'भेजने को तैयार',
    stage_DISPATCHED: 'भेज दिया गया',
    btn_start_print: 'छपाई शुरू करें',
    btn_ready_ship: 'डिस्पैच के लिए तैयार',
    btn_final_ship: 'अंतिम जांच व डिस्पैच',
    btn_print_pass: 'पास प्रिंट',
    btn_ship_locked: 'डिस्पैच बंद है',
    gate2_warn_title: 'डिस्पैच चेतावनी:',
    gate2_warn_body: 'छपाई के दौरान पार्टी का पुराना पैसा ({amt}) लेट हो गया है। ट्रक लोड करने से पहले जांच करें।',
    no_prod_jobs: 'अभी प्रोडक्शन में कोई काम बाकी नहीं है।',
    no_blocked_jobs: 'अभी कोई भी ऑर्डर रुका नहीं है।',

    // Collections
    loop_banner_title: '7-दिन के बहाने पर रोक चालू है:',
    loop_banner_body: '{n} बार पेमेंट का वादा टूटने के बाद टेलीकॉलर फिर से 7 दिन की मोहलत नहीं दे सकते — खाता अपने-आप लॉक होकर CEO/लीगल को जाता है।',
    btn_add_old_bill: 'पुराना बिल जोड़ें',
    call_queue_title: 'आज कॉल करने वाली पार्टियां',
    overdue_first: 'सबसे ज़्यादा लेट ऊपर',
    escalate_chip: 'तुरंत आगे बढ़ाएँ',
    promised_chip: 'वादा तारीख: {d}',
    not_due_yet: 'अभी समय है',
    btn_call: 'कॉल दर्ज करें',
    btn_whatsapp: 'WhatsApp',
    btn_broken: 'वादा टूटा',
    zero_pending: 'सभी पेमेंट आ चुकी हैं!',

    // Legal
    legal_active_title: 'सक्रिय लीगल केस',
    legal_blacklisted: 'माल भेजने पर पूर्ण रोक',
    legal_candidates_title: 'लीगल भेजने के लिए तैयार बड़ी बकाया पार्टियां',
    btn_legal_notice: 'लीगल नोटिस',
    btn_update_stage: 'स्थिति बदलें',
    btn_settled: 'समझौता / पेमेंट',
    deadline_lbl: 'अंतिम तारीख',
    st_CASE_OPENED: 'केस खुला',
    st_LEGAL_NOTICE_DRAFTED: 'नोटिस तैयार',
    st_NOTICE_SERVED: 'नोटिस भेजा गया',
    st_SECTION_138_NI_ACT: 'धारा 138 केस',
    st_RECOVERY_SUIT: 'रिकवरी मुकदमा',
    st_SETTLEMENT_PLAN: 'समझौता जारी',
    st_CLOSED: 'बंद / समाप्त',

    // Buyers Directory
    add_buyer: 'नई पार्टी जोड़ें',
    credit_used: 'क्रेडिट उपयोग',
    limit_lbl: 'लिमिट',
    btn_freeze: 'खाता रोकें',
    btn_unfreeze: 'रोक हटाएँ',

    // Settings & CSV
    tab_rules: 'क्रेडिट नियम',
    tab_csv: 'एक्सेल / CSV',
    company_rules_title: 'कंपनी व क्रेडिट सुरक्षा नियम',
    company_name_lbl: 'पब्लिशिंग हाउस का नाम',
    currency_lbl: 'मुद्रा',
    auto_block_days: 'कितने दिन लेट पर ऑटो-ब्लॉक हो',
    max_broken_lbl: 'अधिकतम टूटे वादे (7-दिन लूप सीमा)',
    ceo_alert_days: 'CEO अलर्ट (दिन लेट)',
    legal_days_lbl: 'ऑटो-लीगल केस (दिन लेट)',
    legal_amt_lbl: 'बड़ी बकाया लीगल सीमा',
    btn_start_fresh: 'डेमो हटाकर नया शुरू करें',
    btn_restore_demo: 'डेमो डेटा वापस लाएँ',
    btn_save_rules: 'नियम सेव करें',
    csv_import_title: 'एक्सेल / CSV से पार्टियां अपलोड करें',
    csv_export_title: 'एक्सेल / टैली रिपोर्ट डाउनलोड करें',
    dl_template: 'टेम्पलेट डाउनलोड',
    load_sample: 'सैंपल भरें',
    choose_file: 'फ़ाइल चुनें',
    btn_import: 'पार्टियां अपलोड करें',
    btn_download: 'डाउनलोड',

    // Share Modal
    share_title: 'टीम के साथ शेयर करें',
    share_sub: 'हर व्यक्ति को उनके काम का लिंक भेजें — वे सिर्फ़ अपना हिस्सा देख पाएँगे',
    live_online_link: 'लाइव ऑनलाइन लिंक (कहीं भी खुलेगा):',
    office_wifi_link: 'ऑफ़िस वाई-फ़ाई लिंक:',
    copy_link: 'लिंक कॉपी करें',
    copy_en: 'EN कॉपी',
    copy_hi: 'हिंदी कॉपी',
    open_view: 'देखें',
    current_chip: 'चालू',
    done: 'बंद करें',
    cancel: 'रद्द करें',

    // Layman Guided Help per View
    help_ceo: [
      '1. ऊपर के 4 कार्ड बताते हैं कि कितना पैसा फंसा है, कितने गलत ऑर्डर रुके और आज आपको क्या फ़ैसला लेना है।',
      '2. चार्ट के किसी भी बार (जैसे "60+ दिन लीगल") पर क्लिक करें — नीचे की सूची अपने-आप फ़िल्टर हो जाएगी।',
      '3. पेमेंट आते ही "पेमेंट मिला" दबाएँ — पार्टी का खाता और रुका ऑर्डर अपने-आप खुल जाएगा।'
    ],
    help_intake: [
      '1. ग्राहक का WhatsApp या ईमेल मैसेज पेस्ट करें और "अपने-आप भरें" दबाएँ।',
      '2. दाईं तरफ़ देखें: हरा मतलब ऑर्डर सुरक्षित है; लाल मतलब पुराना पैसा बाकी है और ऑर्डर रुक जाएगा।',
      '3. रुके हुए ऑर्डर को प्रोडक्शन टीम तब तक प्रिंट या डिस्पैच नहीं कर सकती जब तक पेमेंट या CEO की मंज़ूरी न मिले।'
    ],
    help_production: [
      '1. बाईं तरफ़ (हरा) = इन ऑर्डर को प्रिंट करके माल भेज सकते हैं। गेट पास नंबर ज़रूर मिलाएँ।',
      '2. दाईं तरफ़ (लाल) = पेमेंट बाकी है। इन किताबों को बिल्कुल प्रिंट या लोड न करें।',
      '3. ट्रक लोड करने से पहले "अंतिम जांच व डिस्पैच" दबाएँ — सिस्टम आखिरी बार पेमेंट चेक करता है।'
    ],
    help_collections: [
      '1. ऊपर से नीचे क्रम में कॉल करें (सबसे ज़्यादा लेट पार्टियां सबसे ऊपर हैं)।',
      '2. "WhatsApp" दबाकर तुरंत तैयार पेमेंट रिमाइंडर भेजें।',
      '3. 2 वादे टूटने के बाद सिस्टम 7-दिन की मोहलत बंद कर देता है — सीधे "लीगल भेजें" या CEO को सूचित करें।'
    ],
    help_legal: [
      '1. यहाँ दिख रही सभी पार्टियों का माल भेजना पूरी तरह बंद है।',
      '2. "लीगल नोटिस" दबाकर सभी बकाया बिल, चालान व टूटे वादों के साथ तैयार नोटिस प्रिंट करें।',
      '3. नोटिस जाने या समझौता होने पर केस की स्थिति अपडेट करें।'
    ],
    help_vendors: [
      '1. यहाँ हर पार्टी की क्रेडिट लिमिट, बकाया पैसा और खाता स्थिति देखें।',
      '2. किसी भी पार्टी के नाम पर क्लिक करके उसके सभी बिल, ऑर्डर और कॉल रिकॉर्ड देखें।',
      '3. ज़रूरत पड़ने पर "खाता रोकें" दबाकर तुरंत सप्लाई बंद करें।'
    ],
    help_settings: [
      '1. यहाँ अपनी पब्लिशिंग कंपनी का नाम, क्रेडिट दिन और टूटे वादों की सीमा बदलें।',
      '2. "एक्सेल / CSV" में जाकर अपनी असली पार्टियां अपलोड करें या टैली रिपोर्ट डाउनलोड करें।',
      '3. अपना असली काम शुरू करने के लिए "डेमो हटाकर नया शुरू करें" दबाएँ।'
    ]
  }
};

let currentLang = 'en';

export function initLang() {
  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get('lang');
  const saved = localStorage.getItem('pg_lang');
  if (urlLang === 'hi' || urlLang === 'en') currentLang = urlLang;
  else if (saved === 'hi' || saved === 'en') currentLang = saved;
  applyHtmlLang();
  return currentLang;
}

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  currentLang = lang === 'hi' ? 'hi' : 'en';
  localStorage.setItem('pg_lang', currentLang);
  applyHtmlLang();
}

function applyHtmlLang() {
  document.documentElement.lang = currentLang;
  document.documentElement.classList.toggle('lang-hi', currentLang === 'hi');
}

export function t(key, vars = {}) {
  const table = DICT[currentLang] || DICT.en;
  let str = table[key] ?? DICT.en[key] ?? key;
  if (Array.isArray(str)) return str;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replaceAll(`{${k}}`, String(v));
  }
  return str;
}

export function translateReason(reason) {
  const s = String(reason || '');
  if (currentLang !== 'hi') return s;

  let m;
  if (/LEGAL HOLD/i.test(s)) {
    const c = s.match(/\(([^)]+)\)/);
    return `पार्टी लीगल रोक${c ? ' (' + c[1] + ')' : ''} में है — CEO की मंज़ूरी के बिना कोई ऑर्डर या डिस्पैच नहीं होगा।`;
  }
  if ((m = s.match(/Credit limit breached by ([^\s(]+) \(Projected exposure ([^\s]+) vs Limit ([^)]+)\)/i))) {
    return `क्रेडिट लिमिट ${m[1]} से पार हो गई (कुल उधार ${m[2]} बनाम लिमिट ${m[3]})।`;
  }
  if ((m = s.match(/Overdue invoice aged (\d+) days \(([^)]+)\) exceeds (\d+)-day/i))) {
    return `${m[2]} का बिल ${m[1]} दिन से लेट है (सीमा: ${m[3]} दिन) — ऑर्डर अपने-आप रोका गया।`;
  }
  if (/Bounced Cheque/i.test(s)) {
    return 'खाते में बाउंस चेक बाकी है — सभी क्रेडिट डिस्पैच बंद हैं।';
  }
  if ((m = s.match(/(\d+) Broken Promises-to-Pay/i))) {
    return `${m[1]} पेमेंट वादे टूट चुके हैं — 7-दिन के बहाने रोकने के लिए ऑर्डर ब्लॉक किया गया।`;
  }
  if (/COD \/ 100% Advance Only/i.test(s)) {
    return 'यह पार्टी सिर्फ़ 100% एडवांस के लिए है — उधार ऑर्डर बंद हैं।';
  }
  if (/Executive-tier overdue/i.test(s)) {
    return 'बड़ी बकाया राशि — CEO की मंज़ूरी आवश्यक है।';
  }
  if (/Manual Credit Freeze/i.test(s)) {
    return 'मैनेजमेंट द्वारा खाता मैनुअल रोक पर है।';
  }
  if (/unpaid overdue dues/i.test(s)) {
    return 'पुराना बकाया पैसा बाकी है — पहले पुराना बिल चुकाना ज़रूरी है।';
  }
  return 'पुराना पेमेंट बकाया होने के कारण ऑर्डर रोका गया है।';
}
