import { t } from './i18n.js';
import { icon } from './icons.js';
import { handleLocalApi } from './local-api.js';

let activeRoleHeader = 'CEO';
let useLocalFallback = false;

export function isStaticMode() {
  if (useLocalFallback) return true;
  const host = window.location.hostname || '';
  return host.endsWith('github.io') || window.location.protocol === 'file:';
}

export function setApiRole(role) {
  activeRoleHeader = String(role || 'CEO').toUpperCase();
}

export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function initials(name) {
  return String(name || 'PG')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

export function fmtMoney(val, policy) {
  const sym = policy?.currency_symbol || '₹';
  const num = Math.round(Number(val || 0));
  if (sym === '₹') return `${sym}${num.toLocaleString('en-IN')}`;
  return `${sym}${num.toLocaleString('en-US')}`;
}

export function fmtCompact(val, policy) {
  const sym = policy?.currency_symbol || '₹';
  const n = Number(val || 0);
  if (n === 0) return `${sym}0`;
  if (sym === '₹') {
    if (n >= 10000000) return `${sym}${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `${sym}${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
    if (n >= 1000) return `${sym}${Math.round(n / 1000)}k`;
    return `${sym}${Math.round(n)}`;
  }
  if (n >= 1000000) return `${sym}${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${sym}${Math.round(n / 1000)}k`;
  return `${sym}${Math.round(n)}`;
}

export function statusChip(status) {
  const s = String(status || 'ACTIVE');
  const clsMap = {
    ACTIVE: 'chip-green',
    APPROVED: 'chip-green',
    KEPT: 'chip-green',
    PAID: 'chip-green',
    WARNING: 'chip-amber',
    PARTIAL: 'chip-amber',
    OPEN: 'chip-amber',
    CREDIT_HOLD: 'chip-red',
    BLOCKED: 'chip-red',
    DISPATCH_BLOCKED: 'chip-red',
    BROKEN: 'chip-red',
    OVERDUE: 'chip-red',
    LEGAL_HOLD: 'chip-teal-dark',
    CEO_OVERRIDE: 'chip-slate-dark',
    COD_ONLY: 'chip-cod',
    UNPAID: 'chip-gray'
  };
  const cls = clsMap[s] || 'chip-gray';
  const label = t(`st_${s}`);
  const finalLabel = label === `st_${s}` ? s.replace(/_/g, ' ') : label;
  return `<span class="chip ${cls}"><span class="chip-dot"></span>${esc(finalLabel)}</span>`;
}

export function channelChip(ch) {
  const key = `ch_${ch}`;
  const label = t(key) === key ? ch : t(key);
  const icoName = ch === 'WHATSAPP' ? 'message' : ch === 'EMAIL' ? 'mail' : ch === 'PHONE' ? 'phone' : 'orders';
  return `<span class="chip chip-gray">${icon(icoName, 12)} ${esc(label)}</span>`;
}

export function strikeDots(hits, maxAllowed = 2) {
  const total = Math.max(maxAllowed, hits);
  let html = '<span class="strikes">';
  for (let i = 0; i < total; i++) {
    html += `<span class="s-dot ${i < hits ? 'on' : ''}"></span>`;
  }
  const txt = hits === 1 ? t('broken_one') : t('broken_count', { n: hits });
  html += `<span class="strike-lbl ${hits >= maxAllowed ? 'maxed' : ''}">${esc(txt)}</span></span>`;
  return html;
}

export function avatarColor(status) {
  if (status === 'LEGAL_HOLD') return 'av-teal';
  if (status === 'CREDIT_HOLD') return 'av-red';
  if (status === 'WARNING') return 'av-amber';
  return 'av-green';
}

export function roleDisplayName(role) {
  return t(`role_${role}`);
}

export function legalStageInfo(stage) {
  const steps = {
    CASE_OPENED: 1,
    LEGAL_NOTICE_DRAFTED: 2,
    NOTICE_SERVED: 3,
    SECTION_138_NI_ACT: 4,
    RECOVERY_SUIT: 4,
    SETTLEMENT_PLAN: 4,
    CLOSED: 4
  };
  return [t(`st_${stage}`), steps[stage] || 1];
}

export async function api(url, { method = 'GET', body = null } = {}) {
  if (isStaticMode()) {
    return handleLocalApi(url, method, body, activeRoleHeader);
  }
  const headers = { 'X-Active-Role': activeRoleHeader };
  if (body !== null) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== null ? JSON.stringify(body) : undefined
    });
  } catch {
    useLocalFallback = true;
    return handleLocalApi(url, method, body, activeRoleHeader);
  }
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok && !contentType.includes('application/json') && (res.status === 404 || res.status === 405)) {
    useLocalFallback = true;
    return handleLocalApi(url, method, body, activeRoleHeader);
  }
  const json = await res.json().catch(() => ({ error: 'Invalid server response' }));
  if (!res.ok) {
    const err = new Error(json.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json;
}
