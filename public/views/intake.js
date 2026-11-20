import {
  esc, fmtMoney, statusChip, channelChip, strikeDots, initials, api
} from '../utils.js';
import { t, getLang, translateReason } from '../i18n.js';
import { icon } from '../icons.js';
import { openCeoOverrideModal, openVendorDrawer, showToast } from '../modals.js';

const SAMPLES = {
  defaulter: 'Urgent send 1200 copies of "CBSE Class 11 Organic Chemistry Guide" @ 210 by Saturday - Rajesh Apex Delhi',
  healthy: 'PO# BVM-508: 800 copies of "Foundation Maths Olympiad Vol 2" @ 190 for Bharati Vidya Mandir Pune.'
};

export function renderIntakeView(root, ctx) {
  const { data } = ctx.state;
  const { policy, vendors, orders } = data;
  const activeFilter = ctx.state.intakeFilter || 'ALL';
  const isHi = getLang() === 'hi';

  const filtered = orders.filter(o => {
    if (activeFilter === 'BLOCKED') return (o.gate_status === 'BLOCKED' || o.gate_status === 'DISPATCH_BLOCKED') && o.production_stage !== 'CANCELLED';
    if (activeFilter === 'ACTIVE') return ['QUEUED', 'PRINTING', 'READY_TO_DISPATCH'].includes(o.production_stage);
    return true;
  });

  root.innerHTML = `
    <div class="grid-intake">
      <!-- Left: Clean Order Entry -->
      <div class="panel" style="margin-bottom:0;">
        <div class="panel-header">
          <h3 class="panel-title">${esc(t('enter_order'))}</h3>
          <div style="display:flex;gap:6px;">
            <button type="button" class="btn btn-danger-soft btn-xs" id="sample-bad">${esc(t('demo_late'))}</button>
            <button type="button" class="btn btn-secondary btn-xs" id="sample-good">${esc(t('demo_good'))}</button>
          </div>
        </div>
        <div class="panel-body">
          <div style="background:var(--surface-soft);border:1px solid var(--border);border-radius:var(--r-md);padding:12px;margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="font-size:12px;font-weight:600;color:var(--ink-2);">${esc(t('paste_label'))}</span>
              <button type="button" class="btn btn-primary btn-xs" id="btn-parse-raw">${esc(t('auto_fill'))}</button>
            </div>
            <textarea class="form-control" id="raw-paste-input" rows="2" placeholder="${esc(t('paste_placeholder'))}"></textarea>
          </div>

          <form id="intake-order-form">
            <div class="form-group">
              <label class="form-label">${esc(t('order_channel'))}</label>
              <div class="channel-selector">
                ${['WHATSAPP', 'EMAIL', 'PHONE', 'DIRECT'].map((ch, i) => `
                  <button type="button" class="channel-pill ${i === 0 ? 'active' : ''}" data-ch="${ch}">${esc(t('ch_' + ch))}</button>
                `).join('')}
              </div>
              <input type="hidden" name="channel" id="in-channel" value="WHATSAPP" />
            </div>

            <div class="form-grid">
              <div class="form-group full">
                <label class="form-label">${esc(t('select_buyer'))} *</label>
                <select class="form-control" name="vendor_id" id="in-vendor" required>
                  <option value="">${esc(t('choose_buyer'))}</option>
                  ${vendors.map(v => `<option value="${v.id}">${esc(v.name)} (${esc(v.city)})</option>`).join('')}
                </select>
              </div>
              <div class="form-group full">
                <label class="form-label">${esc(t('book_title'))} *</label>
                <input class="form-control" name="book_title" id="in-title" required placeholder="${esc(t('book_placeholder'))}" />
              </div>
              <div class="form-group">
                <label class="form-label">${esc(t('copies'))} *</label>
                <input class="form-control mono" type="number" name="quantity" id="in-qty" min="1" value="500" required />
              </div>
              <div class="form-group">
                <label class="form-label">${esc(t('rate_per_book'))} (${esc(policy.currency_symbol)}) *</label>
                <input class="form-control mono" type="number" name="unit_price" id="in-price" min="1" value="200" required />
              </div>
              <div class="form-group">
                <label class="form-label">${esc(t('payment_type'))}</label>
                <select class="form-control" name="payment_mode" id="in-paymode">
                  <option value="CREDIT">${esc(t('mode_credit'))}</option>
                  <option value="ADVANCE_PAID">${esc(t('mode_advance'))}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">${esc(t('advance_ref'))}</label>
                <input class="form-control mono" name="advance_ref" id="in-advref" placeholder="${esc(t('advance_ref_ph'))}" disabled />
              </div>
            </div>

            <div id="override-opt-wrap" class="hidden" style="margin:6px 0 12px;">
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer;">
                <input type="checkbox" name="request_override" id="in-req-override" />
                ${esc(t('ask_ceo_chk'))}
              </label>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;gap:12px;">
              <div>
                <div style="font-size:11.5px;color:var(--muted);">${esc(t('total_order'))}</div>
                <div class="mono" style="font-size:18px;font-weight:700;" id="in-total-display">${fmtMoney(100000, policy)}</div>
              </div>
              <button type="submit" class="btn btn-primary" id="btn-submit-order">${esc(t('btn_check_submit'))}</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Right: Live Credit Gate Card -->
      <div class="gate-card" id="live-gate-panel">
        <div class="gate-big-status" style="color:var(--ink-2);">${icon('shieldCheck', 20)} ${esc(t('gate_idle_title'))}</div>
        <div style="color:var(--muted);font-size:13.5px;">${esc(t('gate_idle_sub'))}</div>
      </div>
    </div>

    <!-- Clean Order Table -->
    <div class="panel">
      <div class="panel-header">
        <h3 class="panel-title">${esc(t('recent_orders'))} (${filtered.length})</h3>
        <div class="tabs" id="intake-tabs">
          <button class="tab-btn ${activeFilter === 'ALL' ? 'active' : ''}" data-filter="ALL">${esc(t('filter_all'))}</button>
          <button class="tab-btn ${activeFilter === 'BLOCKED' ? 'active' : ''}" data-filter="BLOCKED">${esc(t('st_BLOCKED'))}</button>
          <button class="tab-btn ${activeFilter === 'ACTIVE' ? 'active' : ''}" data-filter="ACTIVE">${esc(t('tab_in_prod'))}</button>
        </div>
      </div>
      <div class="panel-body">
        <div class="clean-list">
          ${filtered.slice(0, 15).map(o => {
            const isBlocked = (o.gate_status === 'BLOCKED' || o.gate_status === 'DISPATCH_BLOCKED') && o.production_stage !== 'CANCELLED';
            return `
              <div class="clean-row ${isBlocked ? 'urgent' : ''}">
                <div class="row-main">
                  <div class="avatar ${isBlocked ? 'av-red' : 'av-green'}">${esc(initials(o.vendor_name))}</div>
                  <div>
                    <button class="row-title in-open-vendor" data-vid="${o.vendor_id}">${esc(o.vendor_name)}</button>
                    <div class="row-sub">
                      <span style="font-weight:600;color:var(--ink)">${esc(o.book_title)}</span>
                      <span class="mono">· ${o.quantity.toLocaleString()} ${esc(t('copies_unit'))}</span>
                      ${channelChip(o.channel)}
                    </div>
                  </div>
                </div>
                <div class="row-right">
                  <div>
                    <div class="row-amount">${fmtMoney(o.order_value, policy)}</div>
                    <div class="row-caption mono">${o.gate_pass_code ? o.gate_pass_code : o.order_number}</div>
                  </div>
                  ${statusChip(o.gate_status)}
                  <div class="row-actions">
                    ${isBlocked ? `
                      <button class="btn btn-secondary btn-xs in-recheck-btn" data-oid="${o.id}">${esc(t('recheck'))}</button>
                      ${ctx.state.role === 'CEO'
                        ? `<button class="btn btn-primary btn-xs in-ceo-btn" data-oid="${o.id}">${esc(t('btn_decide'))}</button>`
                        : (!o.override_requested ? `<button class="btn btn-warning btn-xs in-req-btn" data-oid="${o.id}">${esc(t('ask_ceo'))}</button>` : `<span class="chip chip-amber">${esc(t('asked_ceo'))}</span>`)}
                    ` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('') || `<div class="empty-state">—</div>`}
        </div>
      </div>
    </div>
  `;

  const vendorSel = root.querySelector('#in-vendor');
  const qtyInp = root.querySelector('#in-qty');
  const priceInp = root.querySelector('#in-price');
  const paySel = root.querySelector('#in-paymode');
  const advInp = root.querySelector('#in-advref');
  const totalDisplay = root.querySelector('#in-total-display');
  const previewBox = root.querySelector('#live-gate-panel');
  const overrideWrap = root.querySelector('#override-opt-wrap');
  const channelInput = root.querySelector('#in-channel');
  const submitBtn = root.querySelector('#btn-submit-order');

  function setChannel(ch) {
    channelInput.value = ch;
    root.querySelectorAll('.channel-pill').forEach(p => p.classList.toggle('active', p.dataset.ch === ch));
  }
  root.querySelectorAll('.channel-pill').forEach(btn => { btn.onclick = () => setChannel(btn.dataset.ch); });

  async function runPrecheck() {
    const qty = Math.max(1, Number(qtyInp.value || 0));
    const price = Math.max(0, Number(priceInp.value || 0));
    const total = Math.round(qty * price);
    totalDisplay.textContent = fmtMoney(total, policy);
    const isAdv = paySel.value === 'ADVANCE_PAID';
    advInp.disabled = !isAdv; advInp.required = isAdv;

    const vid = Number(vendorSel.value);
    if (!vid) return;

    try {
      const resp = await api('/api/orders/precheck', {
        method: 'POST', body: { vendor_id: vid, order_value: total, payment_mode: paySel.value }
      });
      const ev = resp.evaluation;
      const m = ev.metrics;
      const v = m.vendor;

      previewBox.className = `gate-card ${ev.passed ? 'pass' : 'fail'}`;
      overrideWrap.classList.toggle('hidden', ev.passed);
      submitBtn.textContent = ev.passed ? t('btn_approve_send') : t('btn_save_blocked');
      submitBtn.className = ev.passed ? 'btn btn-success' : 'btn btn-danger';

      const pctClamped = Math.min(100, ev.projected_utilization_pct);
      const barCol = ev.projected_utilization_pct > 100 ? '#b91c1c' : ev.projected_utilization_pct >= 80 ? '#b45309' : '#047857';

      previewBox.innerHTML = `
        <div class="gate-big-status">${icon(ev.passed ? 'checkCircle' : 'xCircle', 20)} ${esc(ev.passed ? t('gate_pass_title') : t('gate_fail_title'))}</div>
        <div style="font-size:13.5px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span>${esc(v.name)}</span> ${statusChip(v.credit_status)}
        </div>

        <div class="kv-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));">
          <div class="kv-box">
            <div class="kv-label">${esc(t('col_overdue'))}</div>
            <div class="kv-val" style="color:${m.overdue_amount > 0 ? 'var(--red)' : 'var(--green)'}">${fmtMoney(m.overdue_amount, policy)}</div>
          </div>
          <div class="kv-box">
            <div class="kv-label">${esc(t('col_promises'))}</div>
            <div class="kv-val">${strikeDots(m.active_broken_ptps, policy.max_broken_ptps)}</div>
          </div>
        </div>

        ${!v.cod_only ? `
          <div style="margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;margin-bottom:5px;">
              <span>${esc(t('credit_with_order'))}</span>
              <span class="mono">${fmtMoney(ev.projected_exposure, policy)} / ${fmtMoney(v.credit_limit, policy)}</span>
            </div>
            <div class="bar-track"><div class="bar-fill" style="width:${pctClamped}%;background:${barCol}"></div></div>
          </div>
        ` : ''}

        ${ev.reasons.length ? `
          <div style="font-size:12px;font-weight:700;color:var(--red);">${esc(t('reasons_blocked'))}:</div>
          <ul class="reason-list">${ev.reasons.slice(0, 3).map(r => `<li>${esc(translateReason(r))}</li>`).join('')}</ul>
        ` : `<div style="font-size:13px;color:var(--green);font-weight:600;">${esc(t('gate_pass_note'))}</div>`}
      `;
    } catch (err) { showToast(err.message, 'error'); }
  }

  vendorSel.onchange = runPrecheck; qtyInp.oninput = runPrecheck; priceInp.oninput = runPrecheck; paySel.onchange = runPrecheck;

  async function parseMsg(text) {
    root.querySelector('#raw-paste-input').value = text;
    try {
      const resp = await api('/api/orders/parse', { method: 'POST', body: { text } });
      const p = resp.parsed;
      if (p.vendor_id) vendorSel.value = String(p.vendor_id);
      if (p.book_title) root.querySelector('#in-title').value = p.book_title;
      if (p.quantity) qtyInp.value = p.quantity;
      if (p.unit_price) priceInp.value = p.unit_price;
      if (p.channel && ['WHATSAPP', 'EMAIL', 'PHONE', 'DIRECT'].includes(p.channel)) setChannel(p.channel);
      await runPrecheck();
    } catch (err) { showToast(err.message, 'error'); }
  }

  root.querySelector('#btn-parse-raw').onclick = () => parseMsg(root.querySelector('#raw-paste-input').value);
  root.querySelector('#sample-bad').onclick = () => parseMsg(SAMPLES.defaulter);
  root.querySelector('#sample-good').onclick = () => parseMsg(SAMPLES.healthy);

  root.querySelector('#intake-order-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const resp = await api('/api/orders', {
        method: 'POST',
        body: {
          vendor_id: Number(fd.get('vendor_id')), channel: fd.get('channel'),
          raw_message: root.querySelector('#raw-paste-input').value,
          book_title: fd.get('book_title'), quantity: Number(fd.get('quantity')),
          unit_price: Number(fd.get('unit_price')), payment_mode: fd.get('payment_mode'),
          advance_ref: fd.get('advance_ref'), request_override: root.querySelector('#in-req-override').checked
        }
      });
      ctx.applyData(resp.data);
      showToast(resp.gate_status === 'APPROVED'
        ? (isHi ? `मंज़ूर! पास ${resp.gate_pass_code} प्रोडक्शन को भेजा गया।` : `Approved! Pass ${resp.gate_pass_code} sent to Production.`)
        : (isHi ? 'ऑर्डर अपने-आप रुक गया! प्रोडक्शन को अलर्ट भेजा गया।' : 'Blocked automatically! Production alerted NOT to ship.'), resp.gate_status === 'APPROVED' ? 'success' : 'error');
    } catch (err) { showToast(err.message, 'error'); }
  };

  root.querySelectorAll('#intake-tabs .tab-btn').forEach(btn => { btn.onclick = () => { ctx.state.intakeFilter = btn.dataset.filter; ctx.render(); }; });
  root.querySelectorAll('.in-open-vendor').forEach(el => { el.onclick = () => openVendorDrawer(ctx, Number(el.dataset.vid)); });
  root.querySelectorAll('.in-ceo-btn').forEach(el => { el.onclick = () => { const ord = orders.find(o => o.id === Number(el.dataset.oid)); if (ord) openCeoOverrideModal(ctx, ord); }; });
  root.querySelectorAll('.in-req-btn').forEach(el => {
    el.onclick = async () => {
      const resp = await api(`/api/orders/${el.dataset.oid}/request-override`, { method: 'POST', body: {} });
      ctx.applyData(resp.data);
      showToast(isHi ? 'CEO की मंज़ूरी के लिए भेजा गया।' : 'Sent to CEO for decision.');
    };
  });
  root.querySelectorAll('.in-recheck-btn').forEach(el => {
    el.onclick = async () => {
      try {
        const resp = await api(`/api/orders/${el.dataset.oid}/recheck`, { method: 'POST', body: {} });
        ctx.applyData(resp.data);
        showToast(isHi ? `खाता साफ़! पास ${resp.gate_pass_code} जारी।` : `Cleared! Pass ${resp.gate_pass_code} issued.`);
      } catch (err) {
        if (err.payload?.data) ctx.applyData(err.payload.data);
        showToast(err.message, 'error');
      }
    };
  });
}
