import {
  esc, fmtMoney, statusChip, strikeDots, initials, avatarColor
} from '../utils.js';
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import {
  renderCashflowTrendChart, renderInteractiveAgingChart, renderChannelRiskChart
} from '../charts.js';
import {
  openCeoOverrideModal, openVendorDrawer, openLegalEscalateModal,
  openPaymentModal, openEvidencePackModal, openDispatchModal
} from '../modals.js';

export function renderCeoView(root, ctx) {
  const { data } = ctx.state;
  const { kpis, policy, vendors, orders, analytics } = data;

  const agingBucket = ctx.state.ceoAgingFilter || '';
  const statusFilter = ctx.state.ceoTableFilter || 'ALL';

  const pendingOverrides = orders.filter(
    o => (o.gate_status === 'BLOCKED' || o.gate_status === 'DISPATCH_BLOCKED') && o.override_requested && o.production_stage !== 'CANCELLED'
  );
  const dispatchTraps = orders.filter(o => o.live_dispatch_risk);
  const lateBuyersCount = vendors.filter(v => v.metrics.overdue_amount > 0).length;
  const actionCount = pendingOverrides.length + dispatchTraps.length;

  const legalCandidates = vendors
    .filter(v => v.credit_status !== 'LEGAL_HOLD' && v.metrics.overdue_amount > 0 && v.metrics.max_overdue_days >= policy.ceo_overdue_days)
    .sort((a, b) => b.metrics.overdue_amount - a.metrics.overdue_amount)
    .slice(0, 2);

  // Filter table rows by chart aging click OR status filter pill
  const tableBuyers = vendors.filter(v => {
    if (agingBucket) {
      if ((v.metrics.aging[agingBucket] || 0) <= 0) return false;
    }
    if (statusFilter === 'LATE') return v.metrics.overdue_amount > 0;
    if (statusFilter === 'BLOCKED') return v.credit_status === 'CREDIT_HOLD' || v.credit_status === 'LEGAL_HOLD';
    if (statusFilter === 'SAFE') return v.credit_status === 'ACTIVE' || v.credit_status === 'COD_ONLY';
    return true;
  }).sort((a, b) => (b.metrics.overdue_amount - a.metrics.overdue_amount) || (b.metrics.total_exposure - a.metrics.total_exposure));

  root.innerHTML = `
    <!-- 1. The Verdict Row -->
    <div class="kpi-row">
      <div class="kpi-card" data-go="collections">
        <div class="kpi-head">
          <span class="kpi-lbl">${esc(t('kpi_overdue'))}</span>
          <span class="kpi-ico-box red">${icon('alertTriangle', 16)}</span>
        </div>
        <div class="kpi-val red">${fmtMoney(kpis.total_overdue, policy)}</div>
        <div class="kpi-sub">${esc(t('kpi_overdue_sub', { n: lateBuyersCount, tot: fmtMoney(kpis.total_receivables, policy) }))}</div>
      </div>

      <div class="kpi-card" data-go="production">
        <div class="kpi-head">
          <span class="kpi-lbl">${esc(t('kpi_saved'))}</span>
          <span class="kpi-ico-box green">${icon('shieldCheck', 16)}</span>
        </div>
        <div class="kpi-val green">${fmtMoney(kpis.total_blocked_value, policy)}</div>
        <div class="kpi-sub">${esc(t('kpi_saved_sub', { n: kpis.blocked_orders_count }))}</div>
      </div>

      <div class="kpi-card" data-go="production">
        <div class="kpi-head">
          <span class="kpi-lbl">${esc(t('kpi_decisions'))}</span>
          <span class="kpi-ico-box amber">${icon('shieldAlert', 16)}</span>
        </div>
        <div class="kpi-val amber">${actionCount}</div>
        <div class="kpi-sub">${esc(t('kpi_decisions_sub', { a: pendingOverrides.length, b: dispatchTraps.length }))}</div>
      </div>

      <div class="kpi-card" data-go="legal">
        <div class="kpi-head">
          <span class="kpi-lbl">${esc(t('kpi_legal'))}</span>
          <span class="kpi-ico-box teal">${icon('scale', 16)}</span>
        </div>
        <div class="kpi-val teal">${fmtMoney(kpis.legal_exposure_value, policy)}</div>
        <div class="kpi-sub">${esc(t('kpi_legal_sub', { n: kpis.active_legal_count }))}</div>
      </div>
    </div>

    <!-- 2. Interactive Financial & Aging Charts Row -->
    <div class="grid-charts-main">
      <div class="panel" style="margin-bottom:0;">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">${esc(t('chart_trend_title'))}</h3>
            <div class="panel-sub">${esc(t('chart_trend_sub'))}</div>
          </div>
        </div>
        <div class="panel-body">
          <div id="ceo-trend-chart"></div>
        </div>
      </div>

      <div class="panel" style="margin-bottom:0;">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">${esc(t('chart_aging_title'))}</h3>
            <div class="panel-sub">${esc(t('chart_aging_sub'))}</div>
          </div>
          ${agingBucket ? `<button type="button" class="btn btn-secondary btn-xs" id="ceo-clear-aging">${esc(t('clear_filter'))}</button>` : ''}
        </div>
        <div class="panel-body">
          <div id="ceo-aging-chart"></div>
        </div>
      </div>
    </div>

    <!-- 3. Needs Attention Today + Order Channels Chart -->
    <div class="grid-2">
      <div class="panel" style="margin-bottom:0;">
        <div class="panel-header">
          <h3 class="panel-title">${esc(t('action_title'))}</h3>
          <span class="chip ${(actionCount + legalCandidates.length) > 0 ? 'chip-red' : 'chip-green'}">
            ${esc((actionCount + legalCandidates.length) > 0 ? t('action_urgent', { n: actionCount + legalCandidates.length }) : t('action_clear'))}
          </span>
        </div>
        <div class="panel-body">
          <div class="clean-list">
            ${dispatchTraps.map(o => `
              <div class="clean-row urgent">
                <div class="row-main">
                  <div class="avatar av-red">${icon('truck', 16)}</div>
                  <div>
                    <button class="row-title ceo-open-vendor" data-vid="${o.vendor_id}">${esc(o.vendor_name)}</button>
                    <div class="row-sub">
                      <span class="chip chip-red">${esc(t('ship_risk_tag'))}</span>
                      <span>${esc(t('ship_risk_msg'))}</span>
                    </div>
                  </div>
                </div>
                <div class="row-right">
                  <div>
                    <div class="row-amount danger">${fmtMoney(o.order_value, policy)}</div>
                    <div class="row-caption mono">${esc(o.order_number)}</div>
                  </div>
                  <button class="btn btn-danger btn-sm ceo-stop-dispatch" data-oid="${o.id}">${esc(t('btn_stop_ship'))}</button>
                </div>
              </div>
            `).join('')}

            ${pendingOverrides.map(o => `
              <div class="clean-row warn">
                <div class="row-main">
                  <div class="avatar av-amber">${icon('shieldAlert', 16)}</div>
                  <div>
                    <button class="row-title ceo-open-vendor" data-vid="${o.vendor_id}">${esc(o.vendor_name)}</button>
                    <div class="row-sub">
                      <span class="chip chip-amber">${esc(t('approval_tag'))}</span>
                      <span>${esc(o.book_title)}</span>
                    </div>
                  </div>
                </div>
                <div class="row-right">
                  <div>
                    <div class="row-amount">${fmtMoney(o.order_value, policy)}</div>
                    <div class="row-caption mono">${esc(o.order_number)}</div>
                  </div>
                  <button class="btn btn-primary btn-sm ceo-review-ord" data-oid="${o.id}">${esc(t('btn_decide'))}</button>
                </div>
              </div>
            `).join('')}

            ${legalCandidates.map(v => `
              <div class="clean-row teal">
                <div class="row-main">
                  <div class="avatar av-teal">${icon('scale', 16)}</div>
                  <div>
                    <button class="row-title ceo-open-vendor" data-vid="${v.id}">${esc(v.name)}</button>
                    <div class="row-sub">
                      <span>${esc(t('big_late_msg', { d: v.metrics.max_overdue_days }))}</span>
                    </div>
                  </div>
                </div>
                <div class="row-right">
                  <div class="row-amount danger">${fmtMoney(v.metrics.overdue_amount, policy)}</div>
                  <button class="btn btn-teal btn-sm ceo-send-legal" data-vid="${v.id}">${esc(t('btn_send_legal'))}</button>
                </div>
              </div>
            `).join('')}

            ${!dispatchTraps.length && !pendingOverrides.length && !legalCandidates.length
              ? `<div class="empty-state" style="color:var(--green);font-weight:600;">${icon('checkCircle', 16)} ${esc(t('nothing_urgent'))}</div>` : ''}
          </div>
        </div>
      </div>

      <div class="panel" style="margin-bottom:0;">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">${esc(t('chart_channel_title'))}</h3>
            <div class="panel-sub">${esc(t('chart_channel_sub'))}</div>
          </div>
        </div>
        <div class="panel-body">
          <div id="ceo-channel-chart"></div>
        </div>
      </div>
    </div>

    <!-- 4. Workhorse Interactive Buyer Table -->
    <div class="panel">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">${esc(t('buyers_table_title'))} (${tableBuyers.length})</h3>
          ${agingBucket ? `<div class="panel-sub" style="color:var(--amber);font-weight:600;">${esc(t('age_' + agingBucket))} · ${fmtMoney(kpis.aging_totals[agingBucket] || 0, policy)}</div>` : ''}
        </div>
        <div class="tabs" id="ceo-table-tabs">
          <button class="tab-btn ${statusFilter === 'ALL' ? 'active' : ''}" data-sf="ALL">${esc(t('filter_all'))}</button>
          <button class="tab-btn ${statusFilter === 'LATE' ? 'active' : ''}" data-sf="LATE">${esc(t('filter_late'))}</button>
          <button class="tab-btn ${statusFilter === 'BLOCKED' ? 'active' : ''}" data-sf="BLOCKED">${esc(t('filter_blocked'))}</button>
          <button class="tab-btn ${statusFilter === 'SAFE' ? 'active' : ''}" data-sf="SAFE">${esc(t('filter_safe'))}</button>
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
              <th>${esc(t('col_promises'))}</th>
              <th style="text-align:right;">${esc(t('col_action'))}</th>
            </tr>
          </thead>
          <tbody>
            ${tableBuyers.map(v => {
              const pct = Math.min(100, v.metrics.utilization_pct);
              const barColor = v.metrics.utilization_pct >= 100 ? '#b91c1c' : v.metrics.utilization_pct >= 80 ? '#b45309' : '#047857';
              return `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div class="avatar ${avatarColor(v.credit_status)}">${esc(initials(v.name))}</div>
                      <div>
                        <button class="row-title ceo-open-vendor" data-vid="${v.id}">${esc(v.name)}</button>
                        <div class="row-sub">
                          <span>${esc(v.city)}</span>
                          ${v.metrics.has_bounced_cheque ? `<span class="chip chip-teal-dark">${esc(t('cheque_bounced'))}</span>` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>${statusChip(v.credit_status)}</td>
                  <td style="min-width:160px;">
                    ${v.cod_only ? `<span class="chip chip-cod">${esc(t('st_COD_ONLY'))}</span>` : `
                      <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px;">
                        <span class="mono" style="font-weight:700">${fmtMoney(v.metrics.total_exposure, policy)}</span>
                        <span class="mono" style="color:var(--muted)">${v.metrics.utilization_pct}%</span>
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
                  <td>${strikeDots(v.metrics.active_broken_ptps, policy.max_broken_ptps)}</td>
                  <td style="text-align:right;">
                    <div style="display:inline-flex;gap:6px;">
                      ${v.metrics.unpaid_invoiced > 0 ? `<button class="btn btn-success btn-xs ceo-pay" data-vid="${v.id}">${esc(t('btn_paid_short'))}</button>` : ''}
                      ${v.credit_status === 'LEGAL_HOLD'
                        ? `<button class="btn btn-teal-soft btn-xs ceo-notice" data-vid="${v.id}">${esc(t('btn_notice'))}</button>`
                        : `<button class="btn btn-secondary btn-xs ceo-open-vendor" data-vid="${v.id}">${esc(t('btn_details'))}</button>`}
                    </div>
                  </td>
                </tr>
              `;
            }).join('') || `<tr><td colspan="6" class="empty-state">${esc(t('no_buyers_match'))}</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Render Interactive Charts
  renderCashflowTrendChart(root.querySelector('#ceo-trend-chart'), analytics?.monthly_cashflow || [], policy, ctx.state);
  renderInteractiveAgingChart(
    root.querySelector('#ceo-aging-chart'),
    kpis.aging_totals,
    kpis.total_receivables,
    kpis.overdue_ratio_pct,
    policy,
    {
      activeBucket: agingBucket,
      onSelectBucket: (bucketKey) => {
        ctx.state.ceoAgingFilter = bucketKey;
        ctx.render();
      }
    }
  );
  renderChannelRiskChart(root.querySelector('#ceo-channel-chart'), analytics?.channel_stats || [], policy);

  // Bind Actions
  root.querySelector('#ceo-clear-aging')?.addEventListener('click', () => { ctx.state.ceoAgingFilter = ''; ctx.render(); });
  root.querySelectorAll('#ceo-table-tabs .tab-btn').forEach(btn => {
    btn.onclick = () => { ctx.state.ceoTableFilter = btn.dataset.sf; ctx.render(); };
  });
  root.querySelectorAll('[data-go]').forEach(el => { el.onclick = () => ctx.navigate(el.dataset.go); });
  root.querySelectorAll('.ceo-open-vendor').forEach(el => { el.onclick = () => openVendorDrawer(ctx, Number(el.dataset.vid)); });
  root.querySelectorAll('.ceo-review-ord').forEach(el => {
    el.onclick = () => { const ord = orders.find(o => o.id === Number(el.dataset.oid)); if (ord) openCeoOverrideModal(ctx, ord); };
  });
  root.querySelectorAll('.ceo-stop-dispatch').forEach(el => {
    el.onclick = () => { const ord = orders.find(o => o.id === Number(el.dataset.oid)); if (ord) openDispatchModal(ctx, ord); };
  });
  root.querySelectorAll('.ceo-pay').forEach(el => { el.onclick = () => openPaymentModal(ctx, Number(el.dataset.vid)); });
  root.querySelectorAll('.ceo-send-legal').forEach(el => { el.onclick = () => openLegalEscalateModal(ctx, Number(el.dataset.vid)); });
  root.querySelectorAll('.ceo-notice').forEach(el => { el.onclick = () => openEvidencePackModal(ctx, Number(el.dataset.vid)); });
}
