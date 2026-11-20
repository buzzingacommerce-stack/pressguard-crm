import { api, setApiRole, esc, fmtMoney, statusChip } from './utils.js';
import { initLang, getLang, setLang, t } from './i18n.js';
import { icon } from './icons.js';
import { hideTooltip } from './charts.js';
import { closeModal, closeDrawer, openVendorDrawer, openShareAccessModal, showToast } from './modals.js';
import { renderCeoView } from './views/ceo.js';
import { renderIntakeView } from './views/intake.js';
import { renderProductionView } from './views/production.js';
import { renderCollectionsView } from './views/collections.js';
import { renderLegalView } from './views/legal.js';
import { renderVendorsView } from './views/vendors.js';
import { renderSettingsView } from './views/settings.js';

const VIEW_META = {
  ceo: { icon: 'dashboard', render: renderCeoView },
  intake: { icon: 'orders', render: renderIntakeView },
  production: { icon: 'truck', render: renderProductionView },
  collections: { icon: 'phone', render: renderCollectionsView },
  legal: { icon: 'scale', render: renderLegalView },
  vendors: { icon: 'users', render: renderVendorsView },
  settings: { icon: 'settings', render: renderSettingsView }
};

const ROLE_ACCESS = {
  CEO: { tabs: ['ceo', 'intake', 'production', 'collections', 'legal', 'vendors'], defaultView: 'ceo', settings: true, canCreateOrder: true },
  SALES: { tabs: ['intake', 'vendors'], defaultView: 'intake', settings: false, canCreateOrder: true },
  PRODUCTION: { tabs: ['production'], defaultView: 'production', settings: false, canCreateOrder: false },
  TELECALLING: { tabs: ['collections'], defaultView: 'collections', settings: false, canCreateOrder: false },
  FINANCE: { tabs: ['ceo', 'collections', 'vendors', 'intake'], defaultView: 'collections', settings: true, canCreateOrder: false },
  LEGAL: { tabs: ['legal', 'vendors'], defaultView: 'legal', settings: false, canCreateOrder: false }
};

function getInitialRole() {
  const params = new URLSearchParams(window.location.search);
  const r = String(params.get('role') || 'CEO').toUpperCase();
  return ROLE_ACCESS[r] ? r : 'CEO';
}

initLang();
const initialRole = getInitialRole();
setApiRole(initialRole);

const state = {
  role: initialRole,
  view: ROLE_ACCESS[initialRole].defaultView,
  data: null,
  intakeFilter: 'ALL',
  vendorStatusFilter: 'ALL',
  vendorSearch: '',
  settingsTab: 'rules',
  ceoAgingFilter: '',
  ceoTableFilter: 'ALL',
  hiddenTrendSeries: {},
  helpOpen: false,
  openDrawerVendorId: null
};

const ctx = {
  state,
  navigate(view) {
    const access = ROLE_ACCESS[state.role];
    if (!VIEW_META[view]) return;
    if (view !== 'settings' && !access.tabs.includes(view)) return;
    if (view === 'settings' && !access.settings) return;
    state.view = view;
    closeMobileSidebar();
    hideTooltip();
    render();
  },
  async switchRole(newRole) {
    const role = ROLE_ACCESS[newRole] ? newRole : 'CEO';
    state.role = role;
    setApiRole(role);
    state.view = ROLE_ACCESS[role].defaultView;
    const url = new URL(window.location.href);
    if (role === 'CEO') url.searchParams.delete('role');
    else url.searchParams.set('role', role);
    window.history.replaceState({}, '', url.toString());
    try {
      const data = await api('/api/bootstrap');
      ctx.applyData(data);
      showToast(t('role_' + role));
    } catch (err) {
      showToast(err.message, 'error');
    }
  },
  applyData(newData) {
    state.data = newData;
    renderChrome();
    render();
  },
  render,
  refreshOpenDrawer(vendorId) {
    const backdrop = document.getElementById('drawer-backdrop');
    if (!backdrop.classList.contains('hidden') && state.openDrawerVendorId === Number(vendorId)) {
      openVendorDrawer(ctx, vendorId);
    }
  }
};

function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('mobile-backdrop')?.classList.add('hidden');
}

function getBadgeCount(viewKey) {
  if (!state.data) return 0;
  const { kpis, vendors } = state.data;
  if (viewKey === 'ceo') return kpis.pending_overrides_count + kpis.dispatch_risk_count;
  if (viewKey === 'intake') return kpis.blocked_orders_count;
  if (viewKey === 'production') return kpis.blocked_orders_count + kpis.dispatch_risk_count;
  if (viewKey === 'collections') return vendors.filter(v => v.metrics.overdue_amount > 0).length;
  if (viewKey === 'legal') return kpis.active_legal_count;
  return 0;
}

function renderChrome() {
  const access = ROLE_ACCESS[state.role];
  const navEl = document.getElementById('nav-menu');
  navEl.innerHTML = access.tabs.map(key => {
    const meta = VIEW_META[key];
    const cnt = getBadgeCount(key);
    return `
      <button class="nav-item ${state.view === key ? 'active' : ''}" data-view="${key}">
        <span class="nav-icon">${icon(meta.icon, 16)}</span>
        <span class="nav-label">${esc(t('nav_' + key))}</span>
        ${cnt > 0 ? `<span class="nav-count">${cnt}</span>` : ''}
      </button>
    `;
  }).join('');

  navEl.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => ctx.navigate(btn.dataset.view);
  });

  document.getElementById('nav-settings-ico').innerHTML = icon('settings', 16);
  document.getElementById('nav-settings-lbl').textContent = t('settings_csv');
  const setBtn = document.getElementById('nav-settings');
  setBtn.classList.toggle('hidden', !access.settings);
  setBtn.classList.toggle('active', state.view === 'settings');

  document.getElementById('guard-pill-text').textContent = t('credit_lock_active');
  document.getElementById('global-search-ico').innerHTML = icon('search', 15);
  document.getElementById('global-search-input').placeholder = t('search_placeholder');
  document.getElementById('help-btn-ico').innerHTML = icon('help', 16);
  document.getElementById('btn-help-toggle').title = t('help_guide');
  document.getElementById('btn-help-toggle').classList.toggle('active', state.helpOpen);

  document.getElementById('active-role-chip').textContent = t('role_' + state.role);
  document.getElementById('sidebar-role-label').textContent = t('role_' + state.role);
  document.getElementById('share-tag-lbl').textContent = t('share');

  document.getElementById('quick-order-ico').innerHTML = icon('plus', 15);
  document.getElementById('quick-order-lbl').textContent = t('new_order');
  document.getElementById('btn-quick-order').classList.toggle('hidden', !access.canCreateOrder);

  // Language toggle state
  const lang = getLang();
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  // Clean brand name (keep short so it never clips awkwardly)
  const rawComp = state.data?.policy?.company_name || 'PressGuard';
  document.getElementById('brand-company-name').textContent = rawComp.replace(/\s+Publishing\s+House$/i, '');
  document.title = `${rawComp} — ${t('role_' + state.role)}`;
}

function renderHelpStrip() {
  const strip = document.getElementById('help-strip');
  const body = document.getElementById('help-strip-body');
  if (!state.helpOpen) {
    strip.classList.add('hidden');
    return;
  }
  const steps = t('help_' + state.view);
  if (Array.isArray(steps)) {
    body.innerHTML = steps.map(s => `<div>${esc(s)}</div>`).join('');
    strip.classList.remove('hidden');
  } else {
    strip.classList.add('hidden');
  }
}

function render() {
  if (!state.data) return;
  hideTooltip();
  renderChrome();
  renderHelpStrip();

  const meta = VIEW_META[state.view] || VIEW_META.ceo;
  document.getElementById('page-title').textContent = t('title_' + state.view);
  meta.render(document.getElementById('view-root'), ctx);
}

function setupGlobalSearch() {
  const inp = document.getElementById('global-search-input');
  const drop = document.getElementById('global-search-dropdown');

  inp.addEventListener('input', () => {
    const q = inp.value.trim().toLowerCase();
    if (!q || !state.data) { drop.classList.add('hidden'); return; }

    const matchedVendors = state.data.vendors.filter(v =>
      `${v.name} ${v.city} ${v.contact_person} ${v.phone}`.toLowerCase().includes(q)
    ).slice(0, 5);

    const matchedOrders = state.data.orders.filter(o =>
      `${o.order_number} ${o.book_title} ${o.vendor_name}`.toLowerCase().includes(q)
    ).slice(0, 4);

    if (!matchedVendors.length && !matchedOrders.length) {
      drop.innerHTML = `<div class="empty-state" style="padding:14px;">${esc(t('no_buyers_match'))}</div>`;
      drop.classList.remove('hidden');
      return;
    }

    const policy = state.data.policy;
    drop.innerHTML = `
      ${matchedVendors.map(v => `
        <button type="button" class="search-item gs-vendor" data-vid="${v.id}">
          <div>
            <div style="font-weight:700;font-size:13px;">${esc(v.name)}</div>
            <div style="font-size:11.5px;color:var(--muted);">${esc(v.city)} · ${esc(v.phone)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${v.metrics.overdue_amount > 0 ? `<span class="mono" style="font-size:12px;font-weight:700;color:var(--red)">${fmtMoney(v.metrics.overdue_amount, policy)}</span>` : ''}
            ${statusChip(v.credit_status)}
          </div>
        </button>
      `).join('')}
      ${matchedOrders.map(o => `
        <button type="button" class="search-item gs-order" data-vid="${o.vendor_id}">
          <div>
            <div style="font-weight:600;font-size:12.5px;">${esc(o.book_title)}</div>
            <div style="font-size:11.5px;color:var(--muted);"><span class="mono">${esc(o.order_number)}</span> · ${esc(o.vendor_name)}</div>
          </div>
          ${statusChip(o.gate_status)}
        </button>
      `).join('')}
    `;

    drop.classList.remove('hidden');
    drop.querySelectorAll('.gs-vendor, .gs-order').forEach(btn => {
      btn.onclick = () => {
        drop.classList.add('hidden');
        inp.value = '';
        openVendorDrawer(ctx, Number(btn.dataset.vid));
      };
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#global-search-wrap')) drop.classList.add('hidden');
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      inp.focus();
    }
  });
}

async function boot() {
  document.getElementById('nav-settings').onclick = () => ctx.navigate('settings');
  document.getElementById('btn-quick-order').onclick = () => ctx.navigate('intake');
  document.getElementById('btn-share-access').onclick = () => openShareAccessModal(ctx);

  document.getElementById('btn-help-toggle').onclick = () => {
    state.helpOpen = !state.helpOpen;
    renderHelpStrip();
    document.getElementById('btn-help-toggle').classList.toggle('active', state.helpOpen);
  };
  document.getElementById('btn-help-close').onclick = () => {
    state.helpOpen = false;
    renderHelpStrip();
    document.getElementById('btn-help-toggle').classList.remove('active');
  };

  // Bilingual switch
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.onclick = () => {
      setLang(btn.dataset.lang);
      const url = new URL(window.location.href);
      if (btn.dataset.lang === 'hi') url.searchParams.set('lang', 'hi');
      else url.searchParams.delete('lang');
      window.history.replaceState({}, '', url.toString());
      render();
      if (!document.getElementById('drawer-backdrop').classList.contains('hidden') && state.openDrawerVendorId) {
        openVendorDrawer(ctx, state.openDrawerVendorId);
      }
    };
  });

  // Mobile sidebar
  document.getElementById('btn-mobile-menu').onclick = () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('mobile-backdrop').classList.toggle('hidden');
  };
  document.getElementById('mobile-backdrop').onclick = closeMobileSidebar;

  document.getElementById('modal-close').onclick = closeModal;
  document.getElementById('modal-backdrop').onclick = (e) => { if (e.target.id === 'modal-backdrop') closeModal(); };
  document.getElementById('drawer-close').onclick = closeDrawer;
  document.getElementById('drawer-backdrop').onclick = (e) => { if (e.target.id === 'drawer-backdrop') closeDrawer(); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeDrawer(); closeMobileSidebar(); } });

  setupGlobalSearch();

  try {
    const data = await api('/api/bootstrap');
    ctx.applyData(data);
  } catch (err) {
    document.getElementById('view-root').innerHTML = `<div class="alert-soft red">${esc(err.message)}</div>`;
  }
}

boot();
