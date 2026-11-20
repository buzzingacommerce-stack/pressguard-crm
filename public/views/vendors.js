import {
  esc, fmtMoney, statusChip, initials, avatarColor
} from '../utils.js';
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import {
  openVendorDrawer, openVendorFormModal, openManualHoldModal, openPaymentModal
} from '../modals.js';

export function renderVendorsView(root, ctx) {
  const { data } = ctx.state;
  const { policy, vendors } = data;
  const filter = ctx.state.vendorStatusFilter || 'ALL';
  const search = (ctx.state.vendorSearch || '').trim().toLowerCase();

  const filtered = vendors.filter(v => {
    if (filter === 'HOLD' && v.credit_status !== 'CREDIT_HOLD' && v.credit_status !== 'LEGAL_HOLD') return false;
    if (filter === 'GOOD' && v.credit_status !== 'ACTIVE' && v.credit_status !== 'COD_ONLY') return false;
    if (search) {
      const hay = `${v.name} ${v.city} ${v.contact_person} ${v.phone}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  root.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <h3 class="panel-title">${esc(t('nav_vendors'))} (${filtered.length})</h3>
          <div class="tabs" id="vendor-tabs">
            <button class="tab-btn ${filter === 'ALL' ? 'active' : ''}" data-status="ALL">${esc(t('filter_all'))}</button>
            <button class="tab-btn ${filter === 'HOLD' ? 'active' : ''}" data-status="HOLD">${esc(t('filter_blocked'))}</button>
            <button class="tab-btn ${filter === 'GOOD' ? 'active' : ''}" data-status="GOOD">${esc(t('filter_safe'))}</button>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input class="form-control" id="vendor-search" style="width:220px;padding:7px 11px;" placeholder="${esc(t('search_placeholder'))}" value="${esc(ctx.state.vendorSearch || '')}" />
          <button class="btn btn-primary btn-sm" id="btn-add-vendor">${icon('plus', 14)} ${esc(t('add_buyer'))}</button>
        </div>
      </div>

      <div class="table-wrap">
        <table class="pro-table">
          <thead>
            <tr>
              <th>${esc(t('col_buyer'))}</th>
              <th>${esc(t('col_status'))}</th>
              <th>${esc(t('col_credit'))}</th>
              <th>${esc(t('col_overdue'))}</th>
              <th style="text-align:right;">${esc(t('col_action'))}</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(v => {
              const pct = Math.min(100, v.metrics.utilization_pct);
              const barColor = v.metrics.utilization_pct >= 100 ? '#b91c1c' : v.metrics.utilization_pct >= 80 ? '#b45309' : '#047857';
              return `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div class="avatar ${avatarColor(v.credit_status)}">${esc(initials(v.name))}</div>
                      <div>
                        <button class="row-title vnd-open" data-vid="${v.id}">${esc(v.name)}</button>
                        <div class="row-sub"><span>${esc(v.city)}</span><span>· ${esc(v.contact_person)}</span><span class="mono">· ${esc(v.phone)}</span></div>
                      </div>
                    </div>
                  </td>
                  <td>${statusChip(v.credit_status)}</td>
                  <td style="min-width:170px;">
                    ${v.cod_only ? `<span class="chip chip-cod">${esc(t('st_COD_ONLY'))}</span>` : `
                      <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px;">
                        <span class="mono" style="font-weight:700">${fmtMoney(v.metrics.total_exposure, policy)}</span>
                        <span class="mono" style="color:var(--muted)">/ ${fmtMoney(v.credit_limit, policy)}</span>
                      </div>
                      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${barColor}"></div></div>
                    `}
                  </td>
                  <td>
                    <div class="mono" style="font-weight:700;color:${v.metrics.overdue_amount > 0 ? 'var(--red)' : 'var(--green)'}">
                      ${fmtMoney(v.metrics.overdue_amount, policy)}
                    </div>
                    <div style="font-size:11.5px;color:var(--muted)">
                      ${v.metrics.max_overdue_days > 0 ? esc(t('days_late', { d: v.metrics.max_overdue_days })) : esc(t('on_time'))}
                    </div>
                  </td>
                  <td style="text-align:right;">
                    <div style="display:inline-flex;gap:6px;">
                      <button class="btn btn-success btn-xs vnd-pay" data-vid="${v.id}">${esc(t('btn_paid_short'))}</button>
                      <button class="btn btn-secondary btn-xs vnd-open" data-vid="${v.id}">${esc(t('btn_details'))}</button>
                      <button class="btn btn-danger-soft btn-xs vnd-hold" data-vid="${v.id}">${esc(v.manual_hold ? t('btn_unfreeze') : t('btn_freeze'))}</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('') || `<tr><td colspan="5" class="empty-state">${esc(t('no_buyers_match'))}</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;

  root.querySelector('#btn-add-vendor').onclick = () => openVendorFormModal(ctx, null);
  root.querySelector('#vendor-search').oninput = (e) => {
    ctx.state.vendorSearch = e.target.value;
    ctx.render();
    const inp = document.getElementById('vendor-search');
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  };
  root.querySelectorAll('#vendor-tabs .tab-btn').forEach(btn => { btn.onclick = () => { ctx.state.vendorStatusFilter = btn.dataset.status; ctx.render(); }; });
  root.querySelectorAll('.vnd-open').forEach(el => { el.onclick = () => openVendorDrawer(ctx, Number(el.dataset.vid)); });
  root.querySelectorAll('.vnd-pay').forEach(el => { el.onclick = () => openPaymentModal(ctx, Number(el.dataset.vid)); });
  root.querySelectorAll('.vnd-hold').forEach(el => { el.onclick = () => { const v = vendors.find(x => x.id === Number(el.dataset.vid)); if (v) openManualHoldModal(ctx, v); }; });
}
