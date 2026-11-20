import { esc, fmtMoney, fmtCompact } from './utils.js';
import { t, getLang } from './i18n.js';

let tooltipEl = null;

function ensureTooltip() {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'chart-tooltip hidden';
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function showTooltip(e, html, anchorEl = null) {
  const tip = ensureTooltip();
  tip.innerHTML = html;
  tip.classList.remove('hidden');
  moveTooltip(e, anchorEl);
}

function moveTooltip(e, anchorEl = null) {
  if (!tooltipEl || tooltipEl.classList.contains('hidden')) return;
  const pad = 12;
  const w = tooltipEl.offsetWidth || 200;
  const h = tooltipEl.offsetHeight || 90;
  const bounds = anchorEl ? anchorEl.getBoundingClientRect() : { right: window.innerWidth - 12, left: 12 };
  const maxRight = Math.min(window.innerWidth - 12, bounds.right - 6);
  let x = e.clientX + pad;
  if (x + w > maxRight) x = Math.max(12, e.clientX - w - pad);
  let y = e.clientY - h - 10;
  if (y < 12) y = e.clientY + pad;
  tooltipEl.style.left = `${x}px`;
  tooltipEl.style.top = `${y}px`;
}

export function hideTooltip() {
  if (tooltipEl) tooltipEl.classList.add('hidden');
}

export function renderCashflowTrendChart(container, monthlyData, policy, stateObj) {
  if (!container) return;
  const hiddenSeries = stateObj.hiddenTrendSeries || {};
  const isHi = getLang() === 'hi';

  const series = [
    { key: 'billed', label: t('leg_billed'), color: '#94a3b8' },
    { key: 'collected', label: t('leg_collected'), color: '#059669' },
    { key: 'blocked', label: t('leg_blocked'), color: '#d97706' }
  ];

  const activeSeries = series.filter(s => !hiddenSeries[s.key]);
  let maxVal = 100000;
  for (const m of monthlyData) {
    for (const s of activeSeries) {
      if (Number(m[s.key] || 0) > maxVal) maxVal = Number(m[s.key]);
    }
  }
  // Round max up cleanly
  const niceStep = maxVal > 1000000 ? 400000 : maxVal > 400000 ? 200000 : 100000;
  const yMax = Math.ceil(maxVal / niceStep) * niceStep || 400000;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(yMax * f));

  const W = 640;
  const H = 228;
  const padL = 56;
  const padR = 16;
  const padT = 14;
  const padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const groupW = plotW / Math.max(1, monthlyData.length);

  const gridSvg = ticks.map(val => {
    const y = padT + plotH - (val / yMax) * plotH;
    return `
      <line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#e5e7e3" stroke-dasharray="${val === 0 ? '' : '3 4'}" stroke-width="1"/>
      <text x="${padL - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#64748b" font-size="11" font-family="var(--mono)">${esc(fmtCompact(val, policy))}</text>
    `;
  }).join('');

  const barsSvg = monthlyData.map((m, idx) => {
    const cx = padL + idx * groupW + groupW / 2;
    const count = Math.max(1, activeSeries.length);
    const barW = Math.min(20, (groupW - 26) / count);
    const totalBarsW = count * barW + (count - 1) * 4;
    const startX = cx - totalBarsW / 2;

    const rects = activeSeries.map((s, si) => {
      const val = Number(m[s.key] || 0);
      const bh = Math.max(val > 0 ? 3 : 0, (val / yMax) * plotH);
      const x = startX + si * (barW + 4);
      const y = padT + plotH - bh;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${s.color}" class="chart-bar-rect"/>`;
    }).join('');

    const monthLbl = isHi ? m.month_hi : m.month_en;
    return `
      <g class="trend-group" data-idx="${idx}" style="cursor:pointer;">
        <rect x="${(padL + idx * groupW + 3).toFixed(1)}" y="${padT}" width="${(groupW - 6).toFixed(1)}" height="${plotH}" rx="6" fill="transparent" class="trend-hover-bg"/>
        ${rects}
        <text x="${cx.toFixed(1)}" y="${H - 8}" text-anchor="middle" fill="#475569" font-size="11.5" font-weight="600">${esc(monthLbl)}</text>
      </g>
    `;
  }).join('');

  container.innerHTML = `
    <div class="chart-legend">
      ${series.map(s => `
        <button type="button" class="legend-chip ${hiddenSeries[s.key] ? 'muted' : ''}" data-skey="${s.key}">
          <span class="legend-swatch" style="background:${s.color}"></span>
          <span>${esc(s.label)}</span>
        </button>
      `).join('')}
    </div>
    <div class="svg-chart-wrap">
      <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(t('chart_trend_title'))}">
        ${gridSvg}
        ${barsSvg}
      </svg>
    </div>
  `;

  container.querySelectorAll('.legend-chip').forEach(btn => {
    btn.onclick = () => {
      const k = btn.dataset.skey;
      stateObj.hiddenTrendSeries = { ...hiddenSeries, [k]: !hiddenSeries[k] };
      renderCashflowTrendChart(container, monthlyData, policy, stateObj);
    };
  });

  container.querySelectorAll('.trend-group').forEach(g => {
    const idx = Number(g.dataset.idx);
    const m = monthlyData[idx];
    const lbl = isHi ? m.month_hi : m.month_en;
    const rate = m.billed > 0 ? Math.round((m.collected / m.billed) * 100) : 0;
    const html = `
      <div class="tip-title">${esc(lbl)}</div>
      <div class="tip-row"><span class="tip-dot" style="background:#94a3b8"></span><span>${esc(t('leg_billed'))}</span><strong class="mono">${fmtMoney(m.billed, policy)}</strong></div>
      <div class="tip-row"><span class="tip-dot" style="background:#059669"></span><span>${esc(t('leg_collected'))}</span><strong class="mono">${fmtMoney(m.collected, policy)} (${rate}%)</strong></div>
      <div class="tip-row"><span class="tip-dot" style="background:#d97706"></span><span>${esc(t('leg_blocked'))}</span><strong class="mono">${fmtMoney(m.blocked, policy)}</strong></div>
    `;
    g.addEventListener('mouseenter', (e) => {
      g.querySelector('.trend-hover-bg')?.setAttribute('fill', 'rgba(15, 23, 42, 0.04)');
      showTooltip(e, html, container);
    });
    g.addEventListener('mousemove', (e) => moveTooltip(e, container));
    g.addEventListener('mouseleave', () => {
      g.querySelector('.trend-hover-bg')?.setAttribute('fill', 'transparent');
      hideTooltip();
    });
  });
}

export function renderInteractiveAgingChart(container, agingTotals, totalReceivables, overduePct, policy, { activeBucket, onSelectBucket }) {
  if (!container) return;
  const total = Math.max(1, totalReceivables);
  const buckets = [
    { key: 'current', label: t('age_current'), val: agingTotals.current, color: '#059669' },
    { key: 'd1_15', label: t('age_d1_15'), val: agingTotals.d1_15, color: '#d97706' },
    { key: 'd16_30', label: t('age_d16_30'), val: agingTotals.d16_30, color: '#ea580c' },
    { key: 'd31_60', label: t('age_d31_60'), val: agingTotals.d31_60, color: '#dc2626' },
    { key: 'd61_plus', label: t('age_d61_plus'), val: agingTotals.d61_plus, color: '#881337' }
  ];

  const r = 45;
  const circ = 2 * Math.PI * r;
  const overdueDash = (overduePct / 100) * circ;

  container.innerHTML = `
    <div class="aging-visual-wrap">
      <div class="donut-box">
        <svg width="118" height="118" viewBox="0 0 118 118">
          <circle cx="59" cy="59" r="${r}" fill="none" stroke="#e5e7e3" stroke-width="13"/>
          <circle cx="59" cy="59" r="${r}" fill="none" stroke="#059669" stroke-width="13" stroke-dasharray="${circ}" transform="rotate(-90 59 59)"/>
          <circle cx="59" cy="59" r="${r}" fill="none" stroke="#b91c1c" stroke-width="13" stroke-dasharray="${overdueDash} ${circ}" transform="rotate(-90 59 59)" stroke-linecap="butt"/>
        </svg>
        <div class="donut-label">
          <div class="donut-big mono">${overduePct}%</div>
          <div class="donut-small">${esc(t('overdue_label'))}</div>
        </div>
      </div>

      <div class="aging-click-list">
        ${buckets.map(b => {
          const share = Math.round((b.val / total) * 100);
          const isActive = activeBucket === b.key;
          return `
            <button type="button" class="aging-item-btn ${isActive ? 'active' : ''}" data-bkey="${b.key}">
              <div class="aging-item-top">
                <span class="aging-item-name">
                  <span class="legend-swatch" style="background:${b.color}"></span>
                  ${esc(b.label)}
                </span>
                <span class="mono aging-item-val">${fmtMoney(b.val, policy)} <span class="aging-item-pct">(${share}%)</span></span>
              </div>
              <div class="bar-track">
                <div class="bar-fill" style="width:${share}%;background:${b.color}"></div>
              </div>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('.aging-item-btn').forEach(btn => {
    btn.onclick = () => {
      const k = btn.dataset.bkey;
      onSelectBucket(activeBucket === k ? '' : k);
    };
  });
}

export function renderChannelRiskChart(container, channelStats, policy) {
  if (!container) return;
  const maxTotal = Math.max(
    1,
    ...channelStats.map(c => Number(c.cleared_value || 0) + Number(c.blocked_value || 0))
  );

  container.innerHTML = `
    <div class="chart-legend" style="margin-bottom:14px;">
      <span class="legend-static"><span class="legend-swatch" style="background:#059669"></span>${esc(t('cleared_orders'))}</span>
      <span class="legend-static"><span class="legend-swatch" style="background:#b91c1c"></span>${esc(t('blocked_orders'))}</span>
    </div>
    <div class="channel-bars-list">
      ${channelStats.map(c => {
        const tot = Number(c.cleared_value || 0) + Number(c.blocked_value || 0);
        const totCnt = Number(c.cleared_count || 0) + Number(c.blocked_count || 0);
        const clearedW = (Number(c.cleared_value || 0) / maxTotal) * 100;
        const blockedW = (Number(c.blocked_value || 0) / maxTotal) * 100;
        return `
          <div class="chan-row" data-ch="${esc(c.channel)}"
            data-cv="${c.cleared_value}" data-bv="${c.blocked_value}"
            data-cc="${c.cleared_count}" data-bc="${c.blocked_count}">
            <div class="chan-top">
              <span class="chan-name">${esc(t('ch_' + c.channel))} <span class="chan-cnt">(${totCnt})</span></span>
              <span class="mono chan-tot">${fmtMoney(tot, policy)}</span>
            </div>
            <div class="chan-track">
              ${clearedW > 0 ? `<div class="chan-seg-ok" style="width:${clearedW.toFixed(1)}%"></div>` : ''}
              ${blockedW > 0 ? `<div class="chan-seg-bad" style="width:${blockedW.toFixed(1)}%"></div>` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('.chan-row').forEach(row => {
    const ch = row.dataset.ch;
    const html = `
      <div class="tip-title">${esc(t('ch_' + ch))}</div>
      <div class="tip-row"><span class="tip-dot" style="background:#059669"></span><span>${esc(t('cleared_orders'))} (${row.dataset.cc})</span><strong class="mono">${fmtMoney(row.dataset.cv, policy)}</strong></div>
      <div class="tip-row"><span class="tip-dot" style="background:#b91c1c"></span><span>${esc(t('blocked_orders'))} (${row.dataset.bc})</span><strong class="mono">${fmtMoney(row.dataset.bv, policy)}</strong></div>
    `;
    row.addEventListener('mouseenter', (e) => showTooltip(e, html, container));
    row.addEventListener('mousemove', (e) => moveTooltip(e, container));
    row.addEventListener('mouseleave', hideTooltip);
  });
}
