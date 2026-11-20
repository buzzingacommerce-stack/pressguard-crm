import {
  esc, fmtMoney, statusChip, strikeDots, initials, avatarColor, api
} from '../utils.js';
import { t, getLang } from '../i18n.js';
import { icon } from '../icons.js';
import {
  openCallLogModal, openPaymentModal, openLegalEscalateModal,
  openVendorDrawer, openDunningReminderModal, openAddInvoiceModal, showToast
} from '../modals.js';

export function renderCollectionsView(root, ctx) {
  const { data } = ctx.state;
  const { policy, vendors } = data;
  const isHi = getLang() === 'hi';

  const queue = vendors
    .filter(v => v.metrics.unpaid_invoiced > 0)
    .sort((a, b) =>
      (b.metrics.overdue_amount > 0 ? 1 : 0) - (a.metrics.overdue_amount > 0 ? 1 : 0) ||
      (b.metrics.active_broken_ptps - a.metrics.active_broken_ptps) ||
      (b.metrics.overdue_amount - a.metrics.overdue_amount)
    );

  root.innerHTML = `
    <div class="alert-soft amber" style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;">
      <div style="flex:1;min-width:260px;">
        <strong>${esc(t('loop_banner_title'))}</strong> ${esc(t('loop_banner_body', { n: policy.max_broken_ptps }))}
      </div>
      <button class="btn btn-secondary btn-sm" id="col-add-bill" style="flex-shrink:0;">${icon('plus', 14)} ${esc(t('btn_add_old_bill'))}</button>
    </div>

    <div class="panel">
      <div class="panel-header">
        <h3 class="panel-title">${esc(t('call_queue_title'))} (${queue.length})</h3>
        <span class="chip chip-red">${esc(t('overdue_first'))}</span>
      </div>
      <div class="panel-body">
        <div class="clean-list">
          ${queue.map(v => {
            const maxed = v.metrics.active_broken_ptps >= policy.max_broken_ptps;
            const openPtp = v.metrics.open_ptp;
            return `
              <div class="clean-row ${maxed ? 'urgent' : v.metrics.overdue_amount > 0 ? 'warn' : ''}">
                <div class="row-main">
                  <div class="avatar ${avatarColor(v.credit_status)}">${esc(initials(v.name))}</div>
                  <div>
                    <button class="row-title col-open-vendor" data-vid="${v.id}">${esc(v.name)}</button>
                    <div class="row-sub">
                      <span>${esc(v.contact_person)} · <span class="mono">${esc(v.phone)}</span></span>
                      ${statusChip(v.credit_status)}
                      ${strikeDots(v.metrics.active_broken_ptps, policy.max_broken_ptps)}
                      ${maxed ? `<span class="chip chip-red">${esc(t('escalate_chip'))}</span>` : ''}
                      ${openPtp ? `<span class="chip chip-amber">${esc(t('promised_chip', { d: openPtp.ptp_date }))}</span>` : ''}
                    </div>
                  </div>
                </div>

                <div class="row-right">
                  <div>
                    <div class="row-amount ${v.metrics.overdue_amount > 0 ? 'danger' : ''}">
                      ${fmtMoney(v.metrics.overdue_amount || v.metrics.unpaid_invoiced, policy)}
                    </div>
                    <div class="row-caption">
                      ${v.metrics.max_overdue_days > 0 ? esc(t('days_late', { d: v.metrics.max_overdue_days })) : esc(t('not_due_yet'))}
                    </div>
                  </div>

                  <div class="row-actions">
                    <button class="btn btn-primary btn-xs col-call" data-vid="${v.id}">${icon('phone', 13)} ${esc(t('btn_call'))}</button>
                    <button class="btn btn-secondary btn-xs col-remind" data-vid="${v.id}">${icon('message', 13)} ${esc(t('btn_whatsapp'))}</button>
                    <button class="btn btn-success btn-xs col-pay" data-vid="${v.id}">${esc(t('btn_paid_short'))}</button>
                    ${openPtp ? `<button class="btn btn-danger-soft btn-xs col-break" data-logid="${openPtp.id}">${esc(t('btn_broken'))}</button>` : ''}
                    ${maxed && v.credit_status !== 'LEGAL_HOLD' ? `<button class="btn btn-teal-soft btn-xs col-legal" data-vid="${v.id}">${esc(t('btn_send_legal'))}</button>` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('') || `<div class="empty-state" style="color:var(--green);font-weight:600;">${icon('checkCircle', 16)} ${esc(t('zero_pending'))}</div>`}
        </div>
      </div>
    </div>
  `;

  root.querySelector('#col-add-bill')?.addEventListener('click', () => openAddInvoiceModal(ctx, null));
  root.querySelectorAll('.col-open-vendor').forEach(el => { el.onclick = () => openVendorDrawer(ctx, Number(el.dataset.vid)); });
  root.querySelectorAll('.col-call').forEach(el => { el.onclick = () => openCallLogModal(ctx, Number(el.dataset.vid)); });
  root.querySelectorAll('.col-pay').forEach(el => { el.onclick = () => openPaymentModal(ctx, Number(el.dataset.vid)); });
  root.querySelectorAll('.col-legal').forEach(el => { el.onclick = () => openLegalEscalateModal(ctx, Number(el.dataset.vid)); });
  root.querySelectorAll('.col-remind').forEach(el => { el.onclick = () => { const v = vendors.find(x => x.id === Number(el.dataset.vid)); if (v) openDunningReminderModal(ctx, v); }; });
  root.querySelectorAll('.col-break').forEach(el => {
    el.onclick = async () => {
      try {
        const resp = await api(`/api/collections/${el.dataset.logid}/mark-broken`, { method: 'POST', body: {} });
        ctx.applyData(resp.data);
        showToast(isHi ? 'वादा टूटा दर्ज — खाता अपडेट हो गया।' : 'Marked promise broken — credit status updated.', 'warn');
      } catch (err) { showToast(err.message, 'error'); }
    };
  });
}
