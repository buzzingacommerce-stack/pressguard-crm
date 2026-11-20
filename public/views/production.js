import { esc, fmtMoney, api } from '../utils.js';
import { t, getLang, translateReason } from '../i18n.js';
import { icon } from '../icons.js';
import {
  openDispatchModal, openCeoOverrideModal, openVendorDrawer, printGatePassSlip, showToast
} from '../modals.js';

export function renderProductionView(root, ctx) {
  const { data } = ctx.state;
  const { policy, orders } = data;
  const isHi = getLang() === 'hi';

  const cleared = orders.filter(
    o => ['QUEUED', 'PRINTING', 'READY_TO_DISPATCH'].includes(o.production_stage) && (o.gate_status === 'APPROVED' || o.gate_status === 'CEO_OVERRIDE')
  ).sort((a, b) => (b.production_stage === 'READY_TO_DISPATCH' ? 1 : 0) - (a.production_stage === 'READY_TO_DISPATCH' ? 1 : 0));

  const blocked = orders.filter(
    o => (o.gate_status === 'BLOCKED' || o.gate_status === 'DISPATCH_BLOCKED') && o.production_stage !== 'CANCELLED'
  );

  root.innerHTML = `
    <div class="kanban-2">
      <!-- LEFT LANE: SAFE TO PRINT & SHIP -->
      <div class="lane lane-green">
        <div class="lane-header">
          <h3 class="lane-title" style="color:var(--green);">
            ${icon('checkCircle', 18)}
            ${esc(t('prod_safe_title'))} (${cleared.length})
          </h3>
          <span class="chip chip-green">${esc(t('prod_safe_badge'))}</span>
        </div>

        <div class="lane-cards">
          ${cleared.map(o => `
            <div class="job-card ${o.live_dispatch_risk ? 'risk' : ''}">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                <span class="pass-pill">${icon('shieldCheck', 13)} ${esc(o.gate_pass_code)}</span>
                <span class="chip ${o.production_stage === 'READY_TO_DISPATCH' ? 'chip-slate-dark' : 'chip-gray'}">${esc(t('stage_' + o.production_stage))}</span>
              </div>

              <div>
                <button class="row-title prod-open-vendor" data-vid="${o.vendor_id}">${esc(o.vendor_name)}</button>
                <div style="font-size:13.5px;font-weight:600;margin-top:3px;">${esc(o.book_title)}</div>
                <div style="font-size:12px;color:var(--muted);margin-top:2px;">
                  <span class="mono">${o.quantity.toLocaleString()}</span> ${esc(t('copies_unit'))} · <strong class="mono" style="color:var(--ink)">${fmtMoney(o.order_value, policy)}</strong>
                </div>
              </div>

              ${o.live_dispatch_risk ? `
                <div class="alert-soft amber" style="margin:0;padding:9px 11px;font-size:12.5px;">
                  <strong>${esc(t('gate2_warn_title'))}</strong> ${esc(t('gate2_warn_body', { amt: fmtMoney(o.vendor_overdue, policy) }))}
                </div>
              ` : ''}

              <div style="display:flex;gap:8px;padding-top:4px;">
                ${o.production_stage === 'QUEUED'
                  ? `<button class="btn btn-primary btn-sm prod-stage-btn" data-oid="${o.id}" data-stage="PRINTING" style="flex:1;">${esc(t('btn_start_print'))} ${icon('arrowRight', 13)}</button>`
                  : o.production_stage === 'PRINTING'
                    ? `<button class="btn btn-primary btn-sm prod-stage-btn" data-oid="${o.id}" data-stage="READY_TO_DISPATCH" style="flex:1;">${esc(t('btn_ready_ship'))} ${icon('arrowRight', 13)}</button>`
                    : `<button class="btn ${o.live_dispatch_risk ? 'btn-warning' : 'btn-success'} btn-sm prod-dispatch-btn" data-oid="${o.id}" style="flex:1;">${icon('truck', 14)} ${esc(t('btn_final_ship'))}</button>`}
                <button class="btn btn-secondary btn-sm prod-print-gp" data-oid="${o.id}">${icon('printer', 14)} ${esc(t('btn_print_pass'))}</button>
              </div>
            </div>
          `).join('') || `<div class="empty-state">${esc(t('no_prod_jobs'))}</div>`}
        </div>
      </div>

      <!-- RIGHT LANE: BLOCKED — DO NOT PRINT OR SHIP -->
      <div class="lane lane-red">
        <div class="lane-header">
          <h3 class="lane-title" style="color:var(--red);">
            ${icon('shieldAlert', 18)}
            ${esc(t('prod_blocked_title'))} (${blocked.length})
          </h3>
          <span class="chip chip-red">${esc(t('prod_blocked_badge'))}</span>
        </div>

        <div class="lane-cards">
          ${blocked.map(o => `
            <div class="job-card blocked">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                <span class="lock-pill">${icon('lock', 13)} ${esc(t('st_' + o.gate_status))}</span>
                <span class="mono" style="font-size:12px;color:var(--muted)">${esc(o.order_number)}</span>
              </div>

              <div>
                <button class="row-title prod-open-vendor" data-vid="${o.vendor_id}">${esc(o.vendor_name)}</button>
                <div style="font-size:13.5px;font-weight:600;margin-top:3px;">${esc(o.book_title)}</div>
                <div style="font-size:12px;color:var(--muted);margin-top:2px;">
                  <span class="mono">${o.quantity.toLocaleString()}</span> ${esc(t('copies_unit'))} · <strong class="mono" style="color:var(--red)">${fmtMoney(o.order_value, policy)}</strong>
                </div>
              </div>

              <div style="font-size:12px;color:var(--red);background:var(--red-soft);padding:8px 10px;border-radius:var(--r-sm);">
                ${esc(translateReason((o.block_reasons || [])[0] || 'Payment overdue — credit locked.'))}
              </div>

              <div style="display:flex;gap:7px;padding-top:4px;">
                <button class="btn btn-danger-soft btn-sm" disabled style="flex:1;">${icon('lock', 13)} ${esc(t('btn_ship_locked'))}</button>
                <button class="btn btn-secondary btn-sm prod-recheck-btn" data-oid="${o.id}">${esc(t('recheck'))}</button>
                ${ctx.state.role === 'CEO' ? `<button class="btn btn-primary btn-sm prod-ceo-btn" data-oid="${o.id}">${esc(t('btn_decide'))}</button>` : ''}
              </div>
            </div>
          `).join('') || `<div class="empty-state">${esc(t('no_blocked_jobs'))}</div>`}
        </div>
      </div>
    </div>
  `;

  root.querySelectorAll('.prod-open-vendor').forEach(el => { el.onclick = () => openVendorDrawer(ctx, Number(el.dataset.vid)); });
  root.querySelectorAll('.prod-stage-btn').forEach(el => {
    el.onclick = async () => {
      try {
        const resp = await api(`/api/orders/${el.dataset.oid}/stage`, { method: 'POST', body: { stage: el.dataset.stage } });
        ctx.applyData(resp.data);
        showToast(isHi ? 'प्रोडक्शन स्थिति अपडेट हो गई।' : 'Production status updated.');
      } catch (err) {
        if (err.payload?.data) ctx.applyData(err.payload.data);
        showToast(err.message, 'error');
      }
    };
  });
  root.querySelectorAll('.prod-dispatch-btn').forEach(el => { el.onclick = () => { const ord = orders.find(o => o.id === Number(el.dataset.oid)); if (ord) openDispatchModal(ctx, ord); }; });
  root.querySelectorAll('.prod-ceo-btn').forEach(el => { el.onclick = () => { const ord = orders.find(o => o.id === Number(el.dataset.oid)); if (ord) openCeoOverrideModal(ctx, ord); }; });
  root.querySelectorAll('.prod-recheck-btn').forEach(el => {
    el.onclick = async () => {
      try {
        const resp = await api(`/api/orders/${el.dataset.oid}/recheck`, { method: 'POST', body: {} });
        ctx.applyData(resp.data);
        showToast(isHi ? `मंज़ूर! पास ${resp.gate_pass_code} जारी।` : `Cleared! Pass ${resp.gate_pass_code} issued.`);
      } catch (err) {
        if (err.payload?.data) ctx.applyData(err.payload.data);
        showToast(err.message, 'error');
      }
    };
  });
  root.querySelectorAll('.prod-print-gp').forEach(el => { el.onclick = () => { const ord = orders.find(o => o.id === Number(el.dataset.oid)); if (ord) printGatePassSlip(ord, policy); }; });
}
