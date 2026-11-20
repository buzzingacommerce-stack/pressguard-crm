import {
  esc, fmtMoney, statusChip, channelChip, strikeDots,
  initials, avatarColor, api
} from './utils.js';
import { t, getLang, translateReason } from './i18n.js';
import { icon } from './icons.js';

export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'toast-error' : type === 'warn' ? 'toast-warn' : ''}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.25s ease';
    setTimeout(() => el.remove(), 260);
  }, 3800);
}

export function showModal({ title, subtitle = '', html, wide = false, onMount }) {
  const backdrop = document.getElementById('modal-backdrop');
  const box = document.getElementById('modal-box');
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-sub').textContent = subtitle;
  document.getElementById('modal-body').innerHTML = html;
  box.classList.toggle('modal-wide', Boolean(wide));
  backdrop.classList.remove('hidden');
  if (typeof onMount === 'function') onMount(document.getElementById('modal-body'));
}

export function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
}

export function closeDrawer() {
  document.getElementById('drawer-backdrop').classList.add('hidden');
}

export function openShareAccessModal(ctx) {
  const share = ctx.state.data?.share;
  if (!share) return;
  const currentRole = ctx.state.role;
  const isOnline = Boolean(share.public_url);
  const topUrl = share.public_url || share.lan_url;

  showModal({
    title: t('share_title'),
    subtitle: t('share_sub'),
    wide: true,
    html: `
      <div class="alert-soft green" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div style="min-width:0;flex:1;">
          <strong>${esc(isOnline ? t('live_online_link') : t('office_wifi_link'))}</strong>
          <div class="mono" style="font-size:12.5px;margin-top:3px;word-break:break-all;">${esc(topUrl)}</div>
        </div>
        <button type="button" class="btn btn-success btn-sm" id="copy-main-url">${icon('copy', 14)} ${esc(t('copy_link'))}</button>
      </div>

      <div class="share-role-grid">
        ${share.role_links.map(r => `
          <div class="share-role-card ${r.role === currentRole ? 'current' : ''}">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <strong style="font-size:13.5px;">${esc(t('role_' + r.role))}</strong>
              ${r.role === currentRole ? `<span class="chip chip-slate-dark">${esc(t('current_chip'))}</span>` : ''}
            </div>
            <div style="font-size:12px;color:var(--muted);">${esc(t('role_desc_' + r.role))}</div>
            <div class="share-link-row">
              <div class="share-url-box" title="${esc(r.url)}">${esc(r.url)}</div>
              <button type="button" class="btn btn-secondary btn-xs sh-copy-url" data-url="${esc(r.url)}">${esc(t('copy_en'))}</button>
              <button type="button" class="btn btn-secondary btn-xs sh-copy-url" data-url="${esc(r.hi_url)}">${esc(t('copy_hi'))}</button>
              <button type="button" class="btn btn-primary btn-xs sh-switch-role" data-role="${esc(r.role)}">${esc(t('open_view'))}</button>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-primary" id="sh-done">${esc(t('done'))}</button>
      </div>
    `,
    onMount(root) {
      root.querySelector('#sh-done').onclick = closeModal;
      root.querySelector('#copy-main-url').onclick = async () => {
        try { await navigator.clipboard.writeText(topUrl); showToast(t('copied_msg')); } catch {}
      };
      root.querySelectorAll('.sh-copy-url').forEach(btn => {
        btn.onclick = async () => {
          try { await navigator.clipboard.writeText(btn.dataset.url); showToast(t('copied_msg')); } catch {}
        };
      });
      root.querySelectorAll('.sh-switch-role').forEach(btn => {
        btn.onclick = () => { closeModal(); ctx.switchRole(btn.dataset.role); };
      });
    }
  });
}

export function openCeoOverrideModal(ctx, order) {
  const policy = ctx.state.data.policy;
  const isCeo = ctx.state.role === 'CEO';
  const isHi = getLang() === 'hi';
  const reasonsHtml = (order.block_reasons || []).map(r => `<li>${esc(translateReason(r))}</li>`).join('');

  showModal({
    title: isHi ? `रुके ऑर्डर पर फ़ैसला — ${order.order_number}` : `Review Blocked Order — ${order.order_number}`,
    subtitle: `${order.vendor_name} · ${fmtMoney(order.order_value, policy)}`,
    html: `
      ${!isCeo ? `<div class="alert-soft amber">${isHi ? 'सिर्फ़ CEO अकाउंट ही रुके ऑर्डर को मंज़ूरी दे सकता है।' : 'Only CEO access can approve or reject blocked orders.'}</div>` : ''}
      <div class="alert-soft red">
        <strong>${esc(t('reasons_blocked'))}:</strong>
        <ul class="reason-list">${reasonsHtml || '<li>Credit limit or overdue policy exceeded.</li>'}</ul>
      </div>
      <form id="ceo-override-form">
        <div class="form-group">
          <label class="form-label">${isHi ? 'आपका फ़ैसला' : 'Decision'}</label>
          <select class="form-control" name="decision" id="override-decision" ${!isCeo ? 'disabled' : ''}>
            <option value="APPROVE">${isHi ? 'विशेष मंज़ूरी दें (प्रिंट व डिस्पैच की अनुमति)' : 'Approve Exception (Allow Print & Ship)'}</option>
            <option value="REJECT">${isHi ? 'ऑर्डर रद्द करें (पहले पुराना पैसा आए)' : 'Reject & Cancel Order (Payment First)'}</option>
          </select>
        </div>
        <div id="override-approve-fields" class="form-grid">
          <div class="form-group">
            <label class="form-label">${isHi ? 'वैधता (दिन)' : 'Valid For (Days)'}</label>
            <input class="form-control mono" type="number" name="valid_days" min="1" max="30" value="7" ${!isCeo ? 'disabled' : ''} />
          </div>
          <div class="form-group">
            <label class="form-label">${isHi ? 'शर्त (वैकल्पिक)' : 'Condition (Optional)'}</label>
            <input class="form-control" name="condition" placeholder="${isHi ? 'जैसे: डिस्पैच से पहले ₹1.5L जमा हो' : 'e.g. Collect ₹1.5L before dispatch'}" ${!isCeo ? 'disabled' : ''} />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">${isHi ? 'कारण लिखें *' : 'Reason *'}</label>
          <textarea class="form-control" name="reason" required placeholder="${isHi ? 'फ़ैसले का संक्षिप्त कारण...' : 'Short business justification...'}" ${!isCeo ? 'disabled' : ''}></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-modal">${esc(t('cancel'))}</button>
          <button type="submit" class="btn btn-primary" ${!isCeo ? 'disabled' : ''}>${isHi ? 'फ़ैसला पक्का करें' : 'Confirm Decision'}</button>
        </div>
      </form>
    `,
    onMount(root) {
      root.querySelector('#btn-cancel-modal').onclick = closeModal;
      const decSel = root.querySelector('#override-decision');
      const appFields = root.querySelector('#override-approve-fields');
      decSel.onchange = () => appFields.classList.toggle('hidden', decSel.value !== 'APPROVE');
      root.querySelector('#ceo-override-form').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          const resp = await api(`/api/orders/${order.id}/ceo-override`, {
            method: 'POST',
            body: { decision: fd.get('decision'), reason: fd.get('reason'), condition: fd.get('condition'), valid_days: Number(fd.get('valid_days') || 7) }
          });
          ctx.applyData(resp.data);
          closeModal();
          showToast(fd.get('decision') === 'APPROVE'
            ? (isHi ? 'मंज़ूरी मिल गई — गेट पास जारी!' : 'Approved — Gate Pass issued to Production!')
            : (isHi ? 'ऑर्डर रद्द कर दिया गया।' : 'Order rejected and cancelled.'));
        } catch (err) { showToast(err.message, 'error'); }
      };
    }
  });
}

export function openPaymentModal(ctx, vendorId, presetInvoiceId = null) {
  const data = ctx.state.data;
  const policy = data.policy;
  const isHi = getLang() === 'hi';
  const vendor = data.vendors.find(v => v.id === Number(vendorId));
  if (!vendor) return;

  const unpaidInvs = data.invoices.filter(i => i.vendor_id === vendor.id && i.balance > 0);
  const defaultAmount = presetInvoiceId
    ? (unpaidInvs.find(i => i.id === Number(presetInvoiceId))?.balance || vendor.metrics.overdue_amount)
    : (vendor.metrics.overdue_amount || vendor.metrics.unpaid_invoiced);

  showModal({
    title: `${t('btn_pay')} — ${vendor.name}`,
    subtitle: `${t('kpi_overdue')}: ${fmtMoney(vendor.metrics.overdue_amount, policy)}`,
    html: `
      <form id="payment-form">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">${isHi ? 'मिली हुई राशि' : 'Amount Received'} (${esc(policy.currency_symbol)}) *</label>
            <input class="form-control mono" type="number" name="amount" min="1" value="${defaultAmount || ''}" required />
          </div>
          <div class="form-group">
            <label class="form-label">${isHi ? 'माध्यम' : 'Mode'}</label>
            <select class="form-control" name="mode">
              <option value="RTGS">RTGS</option>
              <option value="NEFT" selected>NEFT</option>
              <option value="IMPS">UPI / IMPS</option>
              <option value="CHEQUE">${isHi ? 'चेक (Cheque)' : 'Cheque'}</option>
              <option value="CASH">${isHi ? 'नकद (Cash)' : 'Cash'}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">UTR / ${isHi ? 'रसीद नंबर' : 'Reference'} *</label>
            <input class="form-control mono" name="reference_no" placeholder="UTR-448120..." required />
          </div>
          <div class="form-group">
            <label class="form-label">${isHi ? 'तारीख' : 'Date'}</label>
            <input class="form-control" type="date" name="payment_date" value="${esc(data.today)}" required />
          </div>
          <div class="form-group full">
            <label class="form-label">${isHi ? 'किस बिल में जोड़ें' : 'Allocate to Bill'}</label>
            <select class="form-control" name="invoice_id">
              <option value="">${isHi ? 'सबसे पुराने बकाया बिल में अपने-आप जोड़ें' : 'Oldest overdue bill first (Auto)'}</option>
              ${unpaidInvs.map(inv => `<option value="${inv.id}" ${Number(presetInvoiceId) === inv.id ? 'selected' : ''}>${esc(inv.invoice_number)} — ${fmtMoney(inv.balance, policy)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-pay">${esc(t('cancel'))}</button>
          <button type="submit" class="btn btn-success">${isHi ? 'पेमेंट सेव करें' : 'Save Payment'}</button>
        </div>
      </form>
    `,
    onMount(root) {
      root.querySelector('#btn-cancel-pay').onclick = closeModal;
      root.querySelector('#payment-form').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          const resp = await api('/api/payments', {
            method: 'POST',
            body: {
              vendor_id: vendor.id,
              invoice_id: fd.get('invoice_id') ? Number(fd.get('invoice_id')) : null,
              amount: Number(fd.get('amount')),
              mode: fd.get('mode'),
              reference_no: fd.get('reference_no'),
              payment_date: fd.get('payment_date')
            }
          });
          ctx.applyData(resp.data);
          closeModal();
          showToast(isHi
            ? `पेमेंट दर्ज हो गई! शेष बकाया: ${fmtMoney(resp.remaining_overdue, policy)}`
            : `Payment recorded! Remaining overdue: ${fmtMoney(resp.remaining_overdue, policy)}`);
          if (ctx.refreshOpenDrawer) ctx.refreshOpenDrawer(vendor.id);
        } catch (err) { showToast(err.message, 'error'); }
      };
    }
  });
}

export function openCallLogModal(ctx, vendorId) {
  const data = ctx.state.data;
  const policy = data.policy;
  const isHi = getLang() === 'hi';
  const vendor = data.vendors.find(v => v.id === Number(vendorId));
  if (!vendor) return;

  const hits = vendor.metrics.active_broken_ptps;
  const maxAllowed = policy.max_broken_ptps;
  const loopMaxed = hits >= maxAllowed;
  const dt = new Date(); dt.setDate(dt.getDate() + 5);
  const defaultPtpDate = dt.toISOString().slice(0, 10);

  showModal({
    title: `${t('btn_call')} — ${vendor.name}`,
    subtitle: `${fmtMoney(vendor.metrics.overdue_amount, policy)} · ${t('broken_count', { n: hits })}`,
    html: `
      ${loopMaxed ? `
        <div class="alert-soft red">
          <strong>${isHi ? `7-दिन लूप सीमा पूरी (${hits}/${maxAllowed} टूटे वादे)` : `7-Day Loop Limit Reached (${hits}/${maxAllowed} Broken Promises)`}</strong><br/>
          ${isHi ? 'अब टेलीकॉलर फिर से 7 दिन का समय नहीं दे सकते — केस को CEO या लीगल को भेजें।' : 'Telecallers cannot grant another casual 7-day extension — escalate to CEO or Legal.'}
        </div>
      ` : ''}
      <form id="call-log-form">
        <div class="form-group">
          <label class="form-label">${isHi ? 'बातचीत का नतीजा' : 'Call Outcome'}</label>
          <select class="form-control" name="outcome" id="call-outcome">
            <option value="PROMISED_TO_PAY">${isHi ? 'पेमेंट का वादा किया (तारीख व राशि तय)' : 'Promised to Pay (Set Date & Amount)'}</option>
            <option value="NO_ANSWER">${isHi ? 'फ़ोन नहीं उठाया / बंद है' : 'No Answer / Switched Off'}</option>
            <option value="DISPUTED">${isHi ? 'बिल या माल पर विवाद' : 'Billing / Delivery Dispute'}</option>
            <option value="REFUSED">${isHi ? 'पेमेंट से मना किया' : 'Refused to Pay'}</option>
          </select>
        </div>
        <div id="ptp-fields" class="form-grid">
          <div class="form-group">
            <label class="form-label">${isHi ? 'वादा राशि' : 'Promised Amount'} (${esc(policy.currency_symbol)})</label>
            <input class="form-control mono" type="number" name="ptp_amount" value="${vendor.metrics.overdue_amount || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">${isHi ? 'वादा तारीख' : 'Promised Date'}</label>
            <input class="form-control" type="date" name="ptp_date" value="${defaultPtpDate}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">${isHi ? 'संक्षिप्त विवरण *' : 'Call Notes *'}</label>
          <textarea class="form-control" name="notes" required placeholder="${isHi ? 'पार्टी ने क्या कहा...' : 'What did the buyer commit to?'}"></textarea>
        </div>
        <div class="modal-actions">
          ${loopMaxed && vendor.credit_status !== 'LEGAL_HOLD' ? `<button type="button" class="btn btn-teal" id="btn-esc-call" style="margin-right:auto;">${icon('scale', 14)} ${esc(t('btn_send_legal'))}</button>` : ''}
          <button type="button" class="btn btn-secondary" id="btn-cancel-call">${esc(t('cancel'))}</button>
          <button type="submit" class="btn btn-primary">${isHi ? 'सेव करें' : 'Save Call'}</button>
        </div>
      </form>
    `,
    onMount(root) {
      root.querySelector('#btn-cancel-call').onclick = closeModal;
      root.querySelector('#btn-esc-call')?.addEventListener('click', () => { closeModal(); openLegalEscalateModal(ctx, vendor.id); });
      const sel = root.querySelector('#call-outcome');
      const ptpFields = root.querySelector('#ptp-fields');
      sel.onchange = () => ptpFields.classList.toggle('hidden', sel.value !== 'PROMISED_TO_PAY');
      root.querySelector('#call-log-form').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          const resp = await api('/api/collections/log', {
            method: 'POST',
            body: { vendor_id: vendor.id, outcome: fd.get('outcome'), ptp_amount: Number(fd.get('ptp_amount') || 0), ptp_date: fd.get('ptp_date') || '', notes: fd.get('notes') }
          });
          ctx.applyData(resp.data);
          closeModal();
          showToast(isHi ? 'कॉल रिकॉर्ड सेव हो गया।' : 'Call logged.');
          if (ctx.refreshOpenDrawer) ctx.refreshOpenDrawer(vendor.id);
        } catch (err) { showToast(err.message, 'error'); }
      };
    }
  });
}

export function openLegalEscalateModal(ctx, vendorId) {
  const data = ctx.state.data;
  const policy = data.policy;
  const isHi = getLang() === 'hi';
  const vendor = data.vendors.find(v => v.id === Number(vendorId));
  if (!vendor) return;

  showModal({
    title: `${t('btn_send_legal')} — ${vendor.name}`,
    subtitle: `${fmtMoney(vendor.metrics.overdue_amount, policy)} · ${t('days_late', { d: vendor.metrics.max_overdue_days })}`,
    html: `
      <div class="alert-soft red">
        ${isHi ? 'लीगल में भेजते ही यह पार्टी ब्लैकलिस्ट हो जाएगी और प्रोडक्शन टीम को माल रोकने का अलर्ट मिल जाएगा।' : 'Escalating to Legal blacklists this buyer immediately and blocks all production & shipping.'}
      </div>
      <form id="legal-esc-form">
        <div class="form-group">
          <label class="form-label">${isHi ? 'वकील का नाम' : 'Assigned Advocate'}</label>
          <input class="form-control" name="advocate_name" value="Adv. Meera Deshmukh" required />
        </div>
        <div class="form-group">
          <label class="form-label">${isHi ? 'कारण *' : 'Reason *'}</label>
          <input class="form-control" name="reason" value="${esc(vendor.metrics.risk_reasons[0] || 'Overdue payment default')}" required />
        </div>
        <div class="form-group">
          <label class="form-label">${isHi ? 'लीगल टीम के लिए निर्देश' : 'Instructions'}</label>
          <textarea class="form-control" name="notes" placeholder="${isHi ? 'जैसे: तुरंत 7 दिन का लीगल नोटिस भेजें' : 'e.g. Send 7-day formal demand notice immediately'}"></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-leg">${esc(t('cancel'))}</button>
          <button type="submit" class="btn btn-teal">${isHi ? 'लीगल केस खोलें' : 'Open Legal Case'}</button>
        </div>
      </form>
    `,
    onMount(root) {
      root.querySelector('#btn-cancel-leg').onclick = closeModal;
      root.querySelector('#legal-esc-form').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          const resp = await api('/api/legal/escalate', {
            method: 'POST',
            body: { vendor_id: vendor.id, advocate_name: fd.get('advocate_name'), reason: fd.get('reason'), notes: fd.get('notes') }
          });
          ctx.applyData(resp.data);
          closeModal();
          showToast(isHi ? `लीगल केस ${resp.case_number} खुल गया!` : `Legal Case ${resp.case_number} opened!`);
          if (ctx.refreshOpenDrawer) ctx.refreshOpenDrawer(vendor.id);
        } catch (err) { showToast(err.message, 'error'); }
      };
    }
  });
}

export async function openEvidencePackModal(ctx, vendorId) {
  try {
    const resp = await api(`/api/legal/evidence/${vendorId}`);
    const p = resp.pack;
    const policy = ctx.state.data.policy;
    const isHi = getLang() === 'hi';
    const totalClaim = p.metrics.overdue_amount + p.metrics.accrued_interest;

    showModal({
      title: `${t('btn_legal_notice')} — ${p.vendor.name}`,
      subtitle: `${fmtMoney(totalClaim, policy)} · GSTIN: ${p.vendor.gstin || 'N/A'}`,
      wide: true,
      html: `
        <div class="kv-grid">
          <div class="kv-box"><div class="kv-label">${isHi ? 'मूल बकाया' : 'Principal Overdue'}</div><div class="kv-val" style="color:var(--red)">${fmtMoney(p.metrics.overdue_amount, policy)}</div></div>
          <div class="kv-box"><div class="kv-label">${isHi ? 'ब्याज' : 'Interest'} (${policy.interest_rate_pa}%)</div><div class="kv-val">${fmtMoney(p.metrics.accrued_interest, policy)}</div></div>
          <div class="kv-box"><div class="kv-label">${isHi ? 'कितने दिन लेट' : 'Days Late'}</div><div class="kv-val">${p.metrics.max_overdue_days}d</div></div>
          <div class="kv-box"><div class="kv-label">${esc(t('cheque_bounced'))}</div><div class="kv-val" style="color:${p.metrics.has_bounced_cheque ? 'var(--red)' : 'var(--muted)'}">${p.metrics.has_bounced_cheque ? 'YES' : 'No'}</div></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <strong style="font-size:13px;">${isHi ? 'तैयार लीगल डिमांड नोटिस' : 'Compiled Legal Demand Notice'}</strong>
          <div style="display:flex;gap:8px;">
            <button type="button" class="btn btn-secondary btn-xs" id="btn-copy-notice">${icon('copy', 13)} ${isHi ? 'कॉपी करें' : 'Copy'}</button>
            <button type="button" class="btn btn-primary btn-xs" id="btn-print-notice">${icon('printer', 13)} ${isHi ? 'प्रिंट / PDF' : 'Print / PDF'}</button>
          </div>
        </div>
        <pre class="legal-notice-pre">${esc(p.notice_text)}</pre>
        <div class="modal-actions"><button type="button" class="btn btn-secondary" id="btn-close-ev">${esc(t('done'))}</button></div>
      `,
      onMount(root) {
        root.querySelector('#btn-close-ev').onclick = closeModal;
        root.querySelector('#btn-copy-notice').onclick = async () => {
          try { await navigator.clipboard.writeText(p.notice_text); showToast('Copied!'); } catch {}
        };
        root.querySelector('#btn-print-notice').onclick = () => {
          const w = window.open('', '_blank', 'width=820,height=900');
          if (!w) return showToast('Allow popups to print.', 'warn');
          w.document.write(`<html><head><title>Legal Notice - ${esc(p.vendor.name)}</title><style>body{font-family:Georgia,serif;padding:40px;line-height:1.6;white-space:pre-wrap;font-size:13px;}</style></head><body>${esc(p.notice_text)}</body></html>`);
          w.document.close();
          w.print();
        };
      }
    });
  } catch (err) { showToast(err.message, 'error'); }
}

export function openDispatchModal(ctx, order) {
  const policy = ctx.state.data.policy;
  const isHi = getLang() === 'hi';
  const challanSuggestion = `DC-${String(order.vendor_city || 'HQ').slice(0, 2).toUpperCase()}-${String(Date.now()).slice(-4)}`;

  showModal({
    title: `${t('btn_final_ship')} — ${order.order_number}`,
    subtitle: `${order.vendor_name} · ${fmtMoney(order.order_value, policy)}`,
    html: `
      ${order.live_dispatch_risk ? `
        <div class="alert-soft amber">
          <strong>${esc(t('gate2_warn_title'))}</strong> ${esc(t('gate2_warn_body', { amt: fmtMoney(order.vendor_overdue, policy) }))}
        </div>
      ` : `
        <div class="alert-soft green">
          <strong>${esc(order.gate_pass_code)}</strong> — ${isHi ? 'डिस्पैच होते ही बिल अपने-आप बन जाएगा।' : 'Verified pass. Dispatching automatically generates the invoice.'}
        </div>
      `}
      <form id="dispatch-form">
        <div class="form-group">
          <label class="form-label">${isHi ? 'चालान / ट्रांसपोर्ट LR नंबर *' : 'Dispatch Challan / LR Number *'}</label>
          <input class="form-control mono" name="dispatch_challan" value="${esc(challanSuggestion)}" required />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-disp">${esc(t('cancel'))}</button>
          <button type="submit" class="btn ${order.live_dispatch_risk ? 'btn-warning' : 'btn-success'}">${esc(t('btn_final_ship'))}</button>
        </div>
      </form>
    `,
    onMount(root) {
      root.querySelector('#btn-cancel-disp').onclick = closeModal;
      root.querySelector('#dispatch-form').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          const resp = await api(`/api/orders/${order.id}/dispatch`, {
            method: 'POST', body: { dispatch_challan: fd.get('dispatch_challan') }
          });
          ctx.applyData(resp.data);
          closeModal();
          showToast(isHi ? `माल डिस्पैच हुआ! बिल ${resp.invoice_number} बन गया।` : `Dispatched! Invoice ${resp.invoice_number} created.`);
        } catch (err) {
          if (err.payload?.data) ctx.applyData(err.payload.data);
          if (err.payload?.gate2_blocked) {
            const reasons = (err.payload.reasons || []).map(r => `<li>${esc(translateReason(r))}</li>`).join('');
            showModal({
              title: isHi ? 'डिस्पैच रोका गया — माल लोड न करें!' : 'DISPATCH STOPPED — HOLD STOCK!',
              subtitle: `${order.vendor_name} · ${fmtMoney(order.order_value, policy)}`,
              html: `
                <div class="alert-soft red">
                  <strong>${isHi ? 'ट्रक लोड न करें! छपाई के दौरान पार्टी का खाता डिफ़ॉल्ट हो गया।' : 'DO NOT LOAD STOCK! Account defaulted while books were printing.'}</strong>
                  <ul class="reason-list">${reasons}</ul>
                </div>
                <div class="modal-actions">
                  <button type="button" class="btn btn-danger" id="btn-ack-stop">${isHi ? 'समझ गया — माल गोदाम में रोकें' : 'Understood — Keep Stock Held'}</button>
                </div>
              `,
              onMount(r2) { r2.querySelector('#btn-ack-stop').onclick = closeModal; }
            });
          } else { showToast(err.message, 'error'); }
        }
      };
    }
  });
}

export function openVendorFormModal(ctx, existing = null) {
  const isEdit = Boolean(existing);
  const policy = ctx.state.data.policy;
  const isHi = getLang() === 'hi';
  showModal({
    title: isEdit ? existing.name : t('add_buyer'),
    subtitle: isHi ? 'क्रेडिट लिमिट और भुगतान अवधि सेट करें' : 'Configure credit limit and payment terms',
    html: `
      <form id="vendor-form">
        <div class="form-grid">
          <div class="form-group full"><label class="form-label">${isHi ? 'पार्टी / फर्म का नाम *' : 'Buyer / Distributor Name *'}</label><input class="form-control" name="name" value="${esc(existing?.name || '')}" required /></div>
          <div class="form-group"><label class="form-label">${isHi ? 'संपर्क व्यक्ति *' : 'Contact Person *'}</label><input class="form-control" name="contact_person" value="${esc(existing?.contact_person || '')}" required /></div>
          <div class="form-group"><label class="form-label">WhatsApp / ${isHi ? 'फ़ोन *' : 'Phone *'}</label><input class="form-control" name="phone" value="${esc(existing?.phone || '')}" required /></div>
          <div class="form-group"><label class="form-label">${isHi ? 'शहर' : 'City'}</label><input class="form-control" name="city" value="${esc(existing?.city || '')}" /></div>
          <div class="form-group"><label class="form-label">${isHi ? 'ईमेल' : 'Email'}</label><input class="form-control" type="email" name="email" value="${esc(existing?.email || '')}" /></div>
          <div class="form-group"><label class="form-label">${isHi ? 'क्रेडिट लिमिट' : 'Credit Limit'} (${esc(policy.currency_symbol)})</label><input class="form-control mono" type="number" name="credit_limit" id="vf-limit" min="0" step="5000" value="${existing?.credit_limit ?? 300000}" /></div>
          <div class="form-group"><label class="form-label">${isHi ? 'उधार के दिन' : 'Credit Days'}</label><input class="form-control mono" type="number" name="payment_terms_days" min="0" max="120" value="${existing?.payment_terms_days ?? 30}" /></div>
          <div class="form-group"><label class="form-label">GSTIN</label><input class="form-control mono" name="gstin" value="${esc(existing?.gstin || '')}" /></div>
          <div class="form-group" style="justify-content:center;padding-top:16px;">
            <label style="display:flex;align-items:center;gap:8px;font-weight:600;cursor:pointer;">
              <input type="checkbox" name="cod_only" id="vf-cod" ${existing?.cod_only ? 'checked' : ''} />
              ${isHi ? 'सिर्फ़ 100% एडवांस (उधार बंद)' : '100% Advance Only (No Credit)'}
            </label>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-vf">${esc(t('cancel'))}</button>
          <button type="submit" class="btn btn-primary">${isHi ? 'सेव करें' : 'Save'}</button>
        </div>
      </form>
    `,
    onMount(root) {
      root.querySelector('#btn-cancel-vf').onclick = closeModal;
      const codChk = root.querySelector('#vf-cod');
      const limInp = root.querySelector('#vf-limit');
      const syncCod = () => { if (codChk.checked) { limInp.value = 0; limInp.disabled = true; } else { limInp.disabled = false; } };
      codChk.onchange = syncCod; syncCod();
      root.querySelector('#vendor-form').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = {
          name: fd.get('name'), contact_person: fd.get('contact_person'), phone: fd.get('phone'),
          city: fd.get('city'), email: fd.get('email'), gstin: fd.get('gstin'),
          payment_terms_days: Number(fd.get('payment_terms_days') || 30),
          credit_limit: codChk.checked ? 0 : Number(fd.get('credit_limit') || 0), cod_only: codChk.checked
        };
        try {
          const resp = await api(isEdit ? `/api/vendors/${existing.id}` : '/api/vendors', { method: isEdit ? 'PUT' : 'POST', body: payload });
          ctx.applyData(resp.data);
          closeModal();
          showToast(isHi ? 'पार्टी विवरण सेव हो गया।' : 'Buyer saved.');
          if (isEdit && ctx.refreshOpenDrawer) ctx.refreshOpenDrawer(existing.id);
        } catch (err) { showToast(err.message, 'error'); }
      };
    }
  });
}

export function openManualHoldModal(ctx, vendor) {
  const hasHold = Boolean(vendor.manual_hold);
  const isHi = getLang() === 'hi';
  showModal({
    title: `${hasHold ? t('btn_unfreeze') : t('btn_freeze')} — ${vendor.name}`,
    subtitle: isHi ? 'सभी टीमों के लिए तुरंत सप्लाई रोकें या खोलें' : 'Immediately freeze or unfreeze across all departments',
    html: `
      <form id="manual-hold-form">
        <div class="form-group">
          <label class="form-label">${isHi ? 'कार्रवाई चुनें' : 'Action'}</label>
          <select class="form-control" name="hold_type">
            <option value="CREDIT_HOLD" ${vendor.manual_hold === 'CREDIT_HOLD' ? 'selected' : ''}>${isHi ? 'क्रेडिट रोक (ऑर्डर बंद)' : 'Credit Hold (Block Orders)'}</option>
            <option value="LEGAL_HOLD" ${vendor.manual_hold === 'LEGAL_HOLD' ? 'selected' : ''}>${isHi ? 'लीगल रोक (ब्लैकलिस्ट)' : 'Legal Hold (Blacklist)'}</option>
            ${hasHold ? `<option value="">${isHi ? 'मैनुअल रोक हटाएँ' : 'Remove Manual Freeze'}</option>` : ''}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${isHi ? 'कारण *' : 'Reason *'}</label>
          <input class="form-control" name="reason" required value="${esc(vendor.manual_hold_reason || '')}" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-mh">${esc(t('cancel'))}</button>
          <button type="submit" class="btn btn-danger">${isHi ? 'लागू करें' : 'Apply'}</button>
        </div>
      </form>
    `,
    onMount(root) {
      root.querySelector('#btn-cancel-mh').onclick = closeModal;
      root.querySelector('#manual-hold-form').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          const resp = await api(`/api/vendors/${vendor.id}/hold`, { method: 'POST', body: { hold_type: fd.get('hold_type'), reason: fd.get('reason') } });
          ctx.applyData(resp.data);
          closeModal();
          showToast(isHi ? 'खाता स्थिति अपडेट हो गई।' : 'Account updated.');
          if (ctx.refreshOpenDrawer) ctx.refreshOpenDrawer(vendor.id);
        } catch (err) { showToast(err.message, 'error'); }
      };
    }
  });
}

export function openAddInvoiceModal(ctx, presetVendorId = null) {
  const { vendors, policy, today } = ctx.state.data;
  const isHi = getLang() === 'hi';
  showModal({
    title: t('btn_add_old_bill'),
    subtitle: isHi ? 'पुराने CRM या टैली का बकाया बिल जोड़ें' : 'Add an existing unpaid bill from your old CRM or Tally',
    html: `
      <form id="manual-inv-form">
        <div class="form-grid">
          <div class="form-group full">
            <label class="form-label">${esc(t('select_buyer'))} *</label>
            <select class="form-control" name="vendor_id" required>
              <option value="">${esc(t('choose_buyer'))}</option>
              ${vendors.map(v => `<option value="${v.id}" ${Number(presetVendorId) === v.id ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">${isHi ? 'बिल नंबर (वैकल्पिक)' : 'Invoice # (Optional)'}</label><input class="form-control mono" name="invoice_number" /></div>
          <div class="form-group"><label class="form-label">${isHi ? 'राशि' : 'Amount'} (${esc(policy.currency_symbol)}) *</label><input class="form-control mono" type="number" name="amount" min="1" required /></div>
          <div class="form-group"><label class="form-label">${isHi ? 'बिल तारीख' : 'Bill Date'}</label><input class="form-control" type="date" name="issue_date" value="${esc(today)}" required /></div>
          <div class="form-group"><label class="form-label">${isHi ? 'अंतिम तारीख (Due Date) *' : 'Due Date *'}</label><input class="form-control" type="date" name="due_date" value="${esc(today)}" required /></div>
          <div class="form-group full"><label class="form-label">${isHi ? 'विवरण *' : 'Description *'}</label><input class="form-control" name="description" required placeholder="${isHi ? 'जैसे: पुराना स्कूल किताब बिल' : 'e.g. Opening pending balance'}" /></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-inv">${esc(t('cancel'))}</button>
          <button type="submit" class="btn btn-primary">${isHi ? 'बिल सेव करें' : 'Save Bill'}</button>
        </div>
      </form>
    `,
    onMount(root) {
      root.querySelector('#btn-cancel-inv').onclick = closeModal;
      root.querySelector('#manual-inv-form').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const vid = Number(fd.get('vendor_id'));
        try {
          const resp = await api('/api/invoices', {
            method: 'POST',
            body: { vendor_id: vid, invoice_number: fd.get('invoice_number'), amount: Number(fd.get('amount')), issue_date: fd.get('issue_date'), due_date: fd.get('due_date'), description: fd.get('description') }
          });
          ctx.applyData(resp.data);
          closeModal();
          showToast(isHi ? `बिल ${resp.invoice_number} जुड़ गया।` : `Bill ${resp.invoice_number} saved.`);
          if (ctx.refreshOpenDrawer) ctx.refreshOpenDrawer(vid);
        } catch (err) { showToast(err.message, 'error'); }
      };
    }
  });
}

export function openDunningReminderModal(ctx, vendor) {
  const { policy, invoices } = ctx.state.data;
  const isHi = getLang() === 'hi';
  const company = policy.company_name || 'PressGuard Publishing';
  const unpaid = invoices.filter(i => i.vendor_id === vendor.id && i.balance > 0);
  const invList = unpaid.map(i => `• ${i.invoice_number}: ${fmtMoney(i.balance, policy)} (${i.overdue_days > 0 ? i.overdue_days + (isHi ? ' दिन लेट' : ' days late') : i.due_date})`).join('\n');
  const m = vendor.metrics;

  const body = isHi
    ? `नमस्ते ${vendor.contact_person} जी (${vendor.name}),\n\n${company} की ओर से सूचित किया जाता है कि आपका ${fmtMoney(m.overdue_amount || m.unpaid_invoiced, policy)} पेमेंट बकाया है:\n${invList}\n\nकृपया आज ही RTGS/NEFT द्वारा भुगतान करें ताकि आपके नए ऑर्डर की सप्लाई चालू रह सके।\n\nधन्यवाद,\n${company}`
    : `Dear ${vendor.contact_person} (${vendor.name}),\n\nReminder from ${company} regarding your pending balance of ${fmtMoney(m.overdue_amount || m.unpaid_invoiced, policy)}:\n${invList}\n\nPlease clear this payment today so new book dispatches remain active.\n\nRegards,\n${company}`;

  const digits = String(vendor.phone || '').replace(/[^0-9]/g, '');
  const waPhone = digits.length === 10 ? `91${digits}` : digits;

  showModal({
    title: `${t('btn_whatsapp')} — ${vendor.name}`,
    subtitle: `${vendor.phone}${vendor.email ? ' · ' + vendor.email : ''}`,
    html: `
      <div class="form-group">
        <label class="form-label">${isHi ? 'संदेश (बदलाव कर सकते हैं)' : 'Message (Editable)'}</label>
        <textarea class="form-control" id="dunning-msg-text" rows="8">${esc(body)}</textarea>
      </div>
      <div class="modal-actions" style="justify-content:space-between;">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-copy-dunning">${icon('copy', 14)} ${isHi ? 'कॉपी' : 'Copy'}</button>
        <div style="display:flex;gap:8px;">
          ${vendor.email ? `<button type="button" class="btn btn-secondary btn-sm" id="btn-open-email">${icon('mail', 14)} ${isHi ? 'ईमेल' : 'Email'}</button>` : ''}
          ${waPhone ? `<button type="button" class="btn btn-success btn-sm" id="btn-open-wa">${icon('message', 14)} WhatsApp</button>` : ''}
        </div>
      </div>
    `,
    onMount(root) {
      const txt = root.querySelector('#dunning-msg-text');
      root.querySelector('#btn-copy-dunning').onclick = async () => {
        try { await navigator.clipboard.writeText(txt.value); showToast('Copied!'); } catch {}
      };
      root.querySelector('#btn-open-wa')?.addEventListener('click', () => {
        window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(txt.value)}`, '_blank', 'noopener');
      });
      root.querySelector('#btn-open-email')?.addEventListener('click', () => {
        window.location.href = `mailto:${encodeURIComponent(vendor.email)}?subject=${encodeURIComponent('Payment Reminder — ' + company)}&body=${encodeURIComponent(txt.value)}`;
      });
    }
  });
}

export function printGatePassSlip(order, policy) {
  const company = policy?.company_name || 'PressGuard Publishing';
  const w = window.open('', '_blank', 'width=680,height=720');
  if (!w) return showToast('Allow popups to print.', 'warn');
  w.document.write(`<!DOCTYPE html><html><head><title>Gate Pass ${esc(order.gate_pass_code)}</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#111827}.slip{border:2px solid #047857;border-radius:10px;padding:24px;max-width:600px;margin:0 auto}.head{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e5e7e3;padding-bottom:14px;margin-bottom:16px}.stamp{background:#ecfdf5;border:1.5px dashed #047857;color:#047857;padding:6px 12px;font-family:monospace;font-size:15px;font-weight:700;border-radius:6px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px}.box{background:#fafaf8;border:1px solid #e5e7e3;padding:10px;border-radius:6px}.lbl{font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:700}.val{font-weight:700;margin-top:3px}</style></head><body><div class="slip"><div class="head"><div><div style="font-size:17px;font-weight:800">${esc(company)}</div><div style="font-size:12px;color:#6b7280">AUTHORIZED PRINT &amp; DISPATCH GATE PASS</div></div><div class="stamp">${esc(order.gate_pass_code)}</div></div><div class="grid"><div class="box"><div class="lbl">Order</div><div class="val">${esc(order.order_number)}</div></div><div class="box"><div class="lbl">Buyer</div><div class="val">${esc(order.vendor_name)}</div></div><div class="box" style="grid-column:1/-1"><div class="lbl">Book Title</div><div class="val">${esc(order.book_title)}</div></div><div class="box"><div class="lbl">Quantity</div><div class="val">${Number(order.quantity).toLocaleString()} copies</div></div><div class="box"><div class="lbl">Value</div><div class="val">${fmtMoney(order.order_value, policy)}</div></div></div></div></body></html>`);
  w.document.close();
  w.print();
}

export async function openVendorDrawer(ctx, vendorId) {
  const backdrop = document.getElementById('drawer-backdrop');
  const headerEl = document.getElementById('drawer-header-content');
  const bodyEl = document.getElementById('drawer-body');
  backdrop.classList.remove('hidden');
  ctx.state.openDrawerVendorId = Number(vendorId);
  bodyEl.innerHTML = '<div class="loading-state">Loading...</div>';

  try {
    const d = await api(`/api/vendors/${vendorId}`);
    const v = d.vendor;
    const m = d.metrics;
    const policy = ctx.state.data.policy;
    const isHi = getLang() === 'hi';

    headerEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="avatar ${avatarColor(v.credit_status)}">${esc(initials(v.name))}</div>
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <h2 style="margin:0;font-size:16.5px;">${esc(v.name)}</h2>
            ${statusChip(v.credit_status)}
          </div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px;">
            ${esc(v.contact_person)} · <span class="mono">${esc(v.phone)}</span> · ${esc(v.city)}
          </div>
        </div>
      </div>
    `;

    bodyEl.innerHTML = `
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:16px;">
        <button class="btn btn-success btn-sm" id="dr-pay">${icon('wallet', 14)} ${esc(t('btn_pay'))}</button>
        <button class="btn btn-primary btn-sm" id="dr-call">${icon('phone', 14)} ${esc(t('btn_call'))}</button>
        <button class="btn btn-secondary btn-sm" id="dr-remind">${icon('message', 14)} WhatsApp</button>
        <button class="btn btn-secondary btn-sm" id="dr-add-inv">${icon('plus', 14)} ${esc(t('btn_add_old_bill'))}</button>
        <button class="btn btn-secondary btn-sm" id="dr-edit">${isHi ? 'लिमिट बदलें' : 'Edit Limit'}</button>
        ${v.credit_status !== 'LEGAL_HOLD'
          ? `<button class="btn btn-teal btn-sm" id="dr-legal">${icon('scale', 14)} ${esc(t('btn_send_legal'))}</button>`
          : `<button class="btn btn-teal btn-sm" id="dr-evidence">${icon('fileText', 14)} ${esc(t('btn_legal_notice'))}</button>`}
      </div>

      <div class="kv-grid">
        <div class="kv-box"><div class="kv-label">${esc(t('limit_lbl'))}</div><div class="kv-val">${v.cod_only ? t('st_COD_ONLY') : fmtMoney(v.credit_limit, policy)}</div></div>
        <div class="kv-box"><div class="kv-label">${esc(t('credit_used'))}</div><div class="kv-val">${fmtMoney(m.total_exposure, policy)}</div></div>
        <div class="kv-box"><div class="kv-label">${esc(t('col_overdue'))}</div><div class="kv-val" style="color:${m.overdue_amount > 0 ? 'var(--red)' : 'var(--green)'}">${fmtMoney(m.overdue_amount, policy)}</div></div>
        <div class="kv-box"><div class="kv-label">${esc(t('col_promises'))}</div><div class="kv-val">${strikeDots(m.active_broken_ptps, policy.max_broken_ptps)}</div></div>
      </div>

      <h4 style="margin:16px 0 9px;font-size:13.5px;">${isHi ? 'बकाया व पुराने बिल' : 'Bills & Invoices'} (${d.invoices.length})</h4>
      <div class="clean-list" style="margin-bottom:16px;">
        ${d.invoices.map(inv => `
          <div class="clean-row ${inv.overdue_days > 0 ? 'urgent' : ''}">
            <div>
              <div style="font-weight:700;font-size:13px;">${esc(inv.invoice_number)} · ${esc(inv.description)}</div>
              <div class="row-sub">
                <span>${esc(inv.due_date)}</span>
                ${inv.overdue_days > 0 ? `<span class="chip chip-red">${esc(t('days_late', { d: inv.overdue_days }))}</span>` : statusChip(inv.balance === 0 ? 'PAID' : 'UNPAID')}
                ${inv.cheque_bounced ? `<span class="chip chip-teal-dark">${esc(t('cheque_bounced'))}</span>` : ''}
              </div>
            </div>
            <div class="row-right">
              <div class="row-amount ${inv.overdue_days > 0 ? 'danger' : ''}">${fmtMoney(inv.balance, policy)}</div>
              ${inv.balance > 0 ? `
                <div class="row-actions">
                  <button class="btn btn-success btn-xs dr-inv-pay" data-inv="${inv.id}">${esc(t('btn_paid_short'))}</button>
                  ${!inv.cheque_bounced ? `<button class="btn btn-danger-soft btn-xs dr-inv-bounce" data-inv="${inv.id}">${isHi ? 'बाउंस' : 'Bounce'}</button>` : ''}
                </div>
              ` : ''}
            </div>
          </div>
        `).join('') || '<div class="empty-state">—</div>'}
      </div>

      <h4 style="margin:16px 0 9px;font-size:13.5px;">${esc(t('recent_orders'))} (${d.orders.length})</h4>
      <div class="clean-list" style="margin-bottom:16px;">
        ${d.orders.slice(0, 6).map(o => `
          <div class="clean-row">
            <div>
              <div style="font-weight:700;font-size:13px;">${esc(o.book_title)}</div>
              <div class="row-sub"><span class="mono">${esc(o.order_number)}</span>${channelChip(o.channel)}<span>${o.quantity}</span></div>
            </div>
            <div class="row-right">
              <div class="row-amount">${fmtMoney(o.order_value, policy)}</div>
              ${statusChip(o.gate_status)}
            </div>
          </div>
        `).join('') || '<div class="empty-state">—</div>'}
      </div>

      <h4 style="margin:16px 0 9px;font-size:13.5px;">${isHi ? 'कॉल व वादे का रिकॉर्ड' : 'Call & Promise History'} (${d.collection_logs.length})</h4>
      <div class="clean-list">
        ${d.collection_logs.slice(0, 8).map(cl => `
          <div class="clean-row ${cl.ptp_status === 'BROKEN' ? 'urgent' : ''}">
            <div>
              <div style="font-weight:600;font-size:13px;">${esc(cl.notes)}</div>
              <div class="row-sub"><span>${esc(cl.created_at.slice(0, 10))}</span>${cl.ptp_amount ? `<span class="mono">${fmtMoney(cl.ptp_amount, policy)} · ${esc(cl.ptp_date)}</span>` : ''}</div>
            </div>
            <div>${cl.ptp_status !== 'NA' ? statusChip(cl.ptp_status) : `<span class="chip chip-gray">${esc(cl.outcome)}</span>`}</div>
          </div>
        `).join('') || '<div class="empty-state">—</div>'}
      </div>
    `;

    bodyEl.querySelector('#dr-pay').onclick = () => openPaymentModal(ctx, v.id);
    bodyEl.querySelector('#dr-call').onclick = () => openCallLogModal(ctx, v.id);
    bodyEl.querySelector('#dr-remind').onclick = () => openDunningReminderModal(ctx, { ...v, metrics: m });
    bodyEl.querySelector('#dr-add-inv').onclick = () => openAddInvoiceModal(ctx, v.id);
    bodyEl.querySelector('#dr-edit').onclick = () => openVendorFormModal(ctx, v);
    bodyEl.querySelector('#dr-legal')?.addEventListener('click', () => openLegalEscalateModal(ctx, v.id));
    bodyEl.querySelector('#dr-evidence')?.addEventListener('click', () => openEvidencePackModal(ctx, v.id));
    bodyEl.querySelectorAll('.dr-inv-pay').forEach(btn => { btn.onclick = () => openPaymentModal(ctx, v.id, Number(btn.dataset.inv)); });
    bodyEl.querySelectorAll('.dr-inv-bounce').forEach(btn => {
      btn.onclick = async () => {
        const detail = window.prompt(isHi ? 'बाउंस चेक नंबर / कारण लिखें:' : 'Bounced cheque number / reason:', 'Cheque dishonoured — Insufficient Funds');
        if (!detail) return;
        try {
          const resp = await api(`/api/invoices/${btn.dataset.inv}/bounce`, { method: 'POST', body: { details: detail } });
          ctx.applyData(resp.data);
          showToast(isHi ? 'चेक बाउंस दर्ज — पार्टी को लीगल रोक में डाला गया!' : 'Cheque bounce flagged — account placed on Legal Hold!', 'warn');
          openVendorDrawer(ctx, v.id);
        } catch (err) { showToast(err.message, 'error'); }
      };
    });
  } catch (err) {
    bodyEl.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}
