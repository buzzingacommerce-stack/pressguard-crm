import { esc, api, isStaticMode } from '../utils.js';
import { t, getLang } from '../i18n.js';
import { icon } from '../icons.js';
import { showToast } from '../modals.js';

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsvFile(filename, headers, rows) {
  const lines = [headers.map(csvCell).join(','), ...rows.map(r => r.map(csvCell).join(','))];
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCsvClient(kind, data) {
  if (kind === 'aging') {
    downloadCsvFile(
      'pressguard-aging-report.csv',
      ['Code', 'Buyer', 'City', 'Status', 'Total Due', 'Overdue', 'Max Overdue Days', 'Not Due', '1-15 Days', '16-30 Days', '31-60 Days', '60+ Days', 'Broken Promises'],
      data.vendors.map(v => [
        v.code, v.name, v.city, v.credit_status, v.metrics.unpaid_invoiced, v.metrics.overdue_amount,
        v.metrics.max_overdue_days, v.metrics.aging.current, v.metrics.aging.d1_15, v.metrics.aging.d16_30,
        v.metrics.aging.d31_60, v.metrics.aging.d61_plus, v.metrics.active_broken_ptps
      ])
    );
  } else if (kind === 'vendors') {
    downloadCsvFile(
      'pressguard-buyers-ledger.csv',
      ['Code', 'Name', 'Category', 'Contact', 'Phone', 'Email', 'City', 'GSTIN', 'Tier', 'Credit Limit', 'Payment Terms Days', 'Advance Only', 'Status', 'Total Exposure', 'Overdue'],
      data.vendors.map(v => [
        v.code, v.name, v.category, v.contact_person, v.phone, v.email, v.city, v.gstin,
        v.tier, v.credit_limit, v.payment_terms_days, v.cod_only ? 'Yes' : 'No',
        v.credit_status, v.metrics.total_exposure, v.metrics.overdue_amount
      ])
    );
  } else if (kind === 'orders') {
    downloadCsvFile(
      'pressguard-orders.csv',
      ['Order No', 'Date', 'Buyer', 'Channel', 'Book Title', 'Quantity', 'Unit Price', 'Order Value', 'Payment Mode', 'Gate Status', 'Gate Pass', 'Production Stage', 'Block Reasons'],
      data.orders.map(o => [
        o.order_number, o.created_at, o.vendor_name, o.channel, o.book_title, o.quantity,
        o.unit_price, o.order_value, o.payment_mode, o.gate_status, o.gate_pass_code,
        o.production_stage, (o.block_reasons || []).join(' | ')
      ])
    );
  } else if (kind === 'invoices') {
    downloadCsvFile(
      'pressguard-invoices.csv',
      ['Invoice No', 'Buyer', 'Description', 'Issue Date', 'Due Date', 'Amount', 'Paid', 'Balance', 'Overdue Days', 'Status', 'Cheque Bounced'],
      data.invoices.map(i => [
        i.invoice_number, i.vendor_name, i.description, i.issue_date, i.due_date,
        i.amount, i.paid_amount, i.balance, i.overdue_days, i.status, i.cheque_bounced ? 'YES' : 'NO'
      ])
    );
  }
}

const SAMPLE_CSV = `name,category,contact_person,phone,email,city,gstin,tier,credit_limit,payment_terms_days,cod_only,opening_overdue_amount,opening_overdue_days
"Gyan Ganga Book Depot","Distributor","Suresh Agarwal","+91 98102 33411","gyanganga@books.in","Noida","09AABCG1234K1Z5","B",400000,30,no,185000,24
"Vidya Prakashan Stores","Bookstore Chain","Meenakshi Iyer","+91 98401 77219","accounts@vidyaprakashan.in","Chennai","33AABCV5510L1Z2","A",750000,30,no,0,0`;

export function renderSettingsView(root, ctx) {
  const { data } = ctx.state;
  const { policy } = data;
  const tab = ctx.state.settingsTab || 'rules';
  const isHi = getLang() === 'hi';

  root.innerHTML = `
    <div style="margin-bottom:16px;">
      <div class="tabs" id="settings-tabs">
        <button class="tab-btn ${tab === 'rules' ? 'active' : ''}" data-tab="rules">${icon('settings', 14)} ${esc(t('tab_rules'))}</button>
        <button class="tab-btn ${tab === 'csv' ? 'active' : ''}" data-tab="csv">${icon('download', 14)} ${esc(t('tab_csv'))}</button>
      </div>
    </div>

    ${tab === 'rules' ? `
      <div class="panel">
        <div class="panel-header">
          <h3 class="panel-title">${esc(t('company_rules_title'))}</h3>
        </div>
        <div class="panel-body">
          <form id="policy-form">
            <div class="form-grid">
              <div class="form-group full">
                <label class="form-label">${esc(t('company_name_lbl'))}</label>
                <input class="form-control" name="company_name" value="${esc(policy.company_name || 'PressGuard Publishing')}" required />
              </div>
              <div class="form-group">
                <label class="form-label">${esc(t('currency_lbl'))}</label>
                <select class="form-control" name="currency_code">
                  <option value="INR" ${policy.currency_code === 'INR' ? 'selected' : ''}>INR (₹)</option>
                  <option value="USD" ${policy.currency_code === 'USD' ? 'selected' : ''}>USD ($)</option>
                  <option value="GBP" ${policy.currency_code === 'GBP' ? 'selected' : ''}>GBP (£)</option>
                  <option value="EUR" ${policy.currency_code === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">${esc(t('auto_block_days'))}</label>
                <input class="form-control mono" type="number" name="overdue_hold_days" min="1" max="90" value="${policy.overdue_hold_days}" />
              </div>
              <div class="form-group">
                <label class="form-label">${esc(t('max_broken_lbl'))}</label>
                <input class="form-control mono" type="number" name="max_broken_ptps" min="1" max="10" value="${policy.max_broken_ptps}" />
              </div>
              <div class="form-group">
                <label class="form-label">${esc(t('ceo_alert_days'))}</label>
                <input class="form-control mono" type="number" name="ceo_overdue_days" min="5" max="120" value="${policy.ceo_overdue_days}" />
              </div>
              <div class="form-group">
                <label class="form-label">${esc(t('legal_days_lbl'))}</label>
                <input class="form-control mono" type="number" name="legal_overdue_days" min="10" max="180" value="${policy.legal_overdue_days}" />
              </div>
              <div class="form-group">
                <label class="form-label">${esc(t('legal_amt_lbl'))} (${esc(policy.currency_symbol)})</label>
                <input class="form-control mono" type="number" name="legal_value_threshold" min="0" step="10000" value="${policy.legal_value_threshold}" />
              </div>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:14px;border-top:1px solid var(--border);flex-wrap:wrap;gap:10px;">
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" class="btn btn-danger-soft btn-sm" id="btn-start-fresh">${esc(t('btn_start_fresh'))}</button>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-reset-demo">${esc(t('btn_restore_demo'))}</button>
              </div>
              <button type="submit" class="btn btn-primary">${esc(t('btn_save_rules'))}</button>
            </div>
          </form>
        </div>
      </div>
    ` : `
      <div class="grid-2">
        <div class="panel">
          <div class="panel-header"><h3 class="panel-title">${icon('upload', 15)} ${esc(t('csv_import_title'))}</h3></div>
          <div class="panel-body">
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
              <button type="button" class="btn btn-secondary btn-xs" id="btn-dl-tpl">${esc(t('dl_template'))}</button>
              <button type="button" class="btn btn-secondary btn-xs" id="btn-fill-tpl">${esc(t('load_sample'))}</button>
              <label class="btn btn-secondary btn-xs" style="cursor:pointer;">
                ${esc(t('choose_file'))}
                <input type="file" id="csv-file" accept=".csv,text/csv" style="display:none;" />
              </label>
            </div>
            <form id="csv-form">
              <textarea class="form-control mono" id="csv-text" rows="7" style="font-size:12px;margin-bottom:12px;"></textarea>
              <button type="submit" class="btn btn-primary" style="width:100%;">${esc(t('btn_import'))}</button>
            </form>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header"><h3 class="panel-title">${icon('download', 15)} ${esc(t('csv_export_title'))}</h3></div>
          <div class="panel-body">
            <div class="clean-list">
              <div class="clean-row">
                <div><div style="font-weight:700;">${isHi ? 'बकाया एजिंग रिपोर्ट' : 'Overdue Aging Report'}</div><div class="row-sub">${isHi ? 'कौन कितने दिन से लेट है' : 'Aging buckets by buyer'}</div></div>
                <a class="btn btn-primary btn-xs csv-export-link" data-export="aging" href="/api/export/aging.csv" download>${esc(t('btn_download'))}</a>
              </div>
              <div class="clean-row">
                <div><div style="font-weight:700;">${isHi ? 'सभी पार्टियों का क्रेडिट खाता' : 'All Buyers & Credit Limits'}</div><div class="row-sub">${isHi ? 'GSTIN, लिमिट और स्थिति' : 'Directory with GSTIN & status'}</div></div>
                <a class="btn btn-secondary btn-xs csv-export-link" data-export="vendors" href="/api/export/vendors.csv" download>${esc(t('btn_download'))}</a>
              </div>
              <div class="clean-row">
                <div><div style="font-weight:700;">${isHi ? 'ऑर्डर व रुके ऑर्डर सूची' : 'Orders & Blocked List'}</div><div class="row-sub">${isHi ? 'WhatsApp/Email ऑर्डर व पास' : 'Channels, Gate Passes & blocks'}</div></div>
                <a class="btn btn-secondary btn-xs csv-export-link" data-export="orders" href="/api/export/orders.csv" download>${esc(t('btn_download'))}</a>
              </div>
              <div class="clean-row">
                <div><div style="font-weight:700;">${isHi ? 'सभी बिल व बकाया रजिस्टर' : 'Invoices & Balances Register'}</div><div class="row-sub">${isHi ? 'टैली / एक्सेल के लिए तैयार' : 'Ready for Tally & Excel'}</div></div>
                <a class="btn btn-secondary btn-xs csv-export-link" data-export="invoices" href="/api/export/invoices.csv" download>${esc(t('btn_download'))}</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `}
  `;

  root.querySelectorAll('#settings-tabs .tab-btn').forEach(btn => { btn.onclick = () => { ctx.state.settingsTab = btn.dataset.tab; ctx.render(); }; });

  root.querySelector('#policy-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const resp = await api('/api/policy', {
        method: 'PUT',
        body: {
          company_name: fd.get('company_name'), currency_code: fd.get('currency_code'),
          overdue_hold_days: Number(fd.get('overdue_hold_days')), max_broken_ptps: Number(fd.get('max_broken_ptps')),
          ceo_overdue_days: Number(fd.get('ceo_overdue_days')), legal_overdue_days: Number(fd.get('legal_overdue_days')),
          legal_value_threshold: Number(fd.get('legal_value_threshold')), soft_warning_pct: policy.soft_warning_pct,
          ceo_value_threshold: policy.ceo_value_threshold, interest_rate_pa: policy.interest_rate_pa,
          block_advance_if_overdue: Boolean(policy.block_advance_if_overdue)
        }
      });
      ctx.applyData(resp.data);
      showToast(isHi ? 'नियम सेव हो गए!' : 'Rules saved!');
    } catch (err) { showToast(err.message, 'error'); }
  });

  root.querySelector('#btn-start-fresh')?.addEventListener('click', async () => {
    if (!window.confirm(isHi ? 'क्या सभी डेमो डेटा हटाकर नया काम शुरू करें?' : 'Clear all sample data so you can enter your real publishing house buyers?')) return;
    const resp = await api('/api/system/start-fresh', { method: 'POST', body: {} });
    ctx.applyData(resp.data);
    showToast(isHi ? 'डेटा साफ़ हो गया — अब अपनी असली पार्टियां जोड़ें!' : 'Workspace cleared — ready for your real data!');
  });

  root.querySelector('#btn-reset-demo')?.addEventListener('click', async () => {
    const resp = await api('/api/system/reset-demo', { method: 'POST', body: {} });
    ctx.applyData(resp.data);
    showToast(isHi ? 'डेमो डेटा वापस आ गया।' : 'Demo data restored.');
  });

  root.querySelector('#btn-dl-tpl')?.addEventListener('click', () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'buyers-template.csv'; a.click();
    URL.revokeObjectURL(url);
  });
  root.querySelector('#btn-fill-tpl')?.addEventListener('click', () => { const ta = root.querySelector('#csv-text'); if (ta) ta.value = SAMPLE_CSV; });
  root.querySelector('#csv-file')?.addEventListener('change', (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { const ta = root.querySelector('#csv-text'); if (ta) ta.value = String(r.result || ''); };
    r.readAsText(f);
  });
  root.querySelector('#csv-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = root.querySelector('#csv-text')?.value || '';
    try {
      const resp = await api('/api/import/vendors', { method: 'POST', body: { csv_text: text } });
      ctx.applyData(resp.data);
      showToast(isHi ? `${resp.imported_vendors} पार्टियां अपलोड हो गईं!` : `Imported ${resp.imported_vendors} buyers!`);
    } catch (err) { showToast(err.message, 'error'); }
  });

  root.querySelectorAll('.csv-export-link').forEach(link => {
    link.addEventListener('click', (e) => {
      if (isStaticMode()) {
        e.preventDefault();
        exportCsvClient(link.dataset.export, ctx.state.data);
      }
    });
  });
}
