import {
  esc, fmtMoney, statusChip, legalStageInfo, initials, api
} from '../utils.js';
import { t, getLang } from '../i18n.js';
import { icon } from '../icons.js';
import {
  openEvidencePackModal, openLegalEscalateModal, openVendorDrawer,
  openPaymentModal, showModal, closeModal, showToast
} from '../modals.js';

const STAGE_KEYS = [
  'CASE_OPENED', 'LEGAL_NOTICE_DRAFTED', 'NOTICE_SERVED',
  'SECTION_138_NI_ACT', 'RECOVERY_SUIT', 'SETTLEMENT_PLAN', 'CLOSED'
];

export function renderLegalView(root, ctx) {
  const { data } = ctx.state;
  const { policy, legal_cases, vendors } = data;
  const isHi = getLang() === 'hi';

  const activeCases = legal_cases.filter(c => c.stage !== 'CLOSED');
  const activeVendorIds = new Set(activeCases.map(c => c.vendor_id));
  const candidates = vendors.filter(v => !activeVendorIds.has(v.id) && v.metrics.overdue_amount > 0 && v.escalation_level >= 2);

  root.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <h3 class="panel-title">${icon('scale', 16)} ${esc(t('legal_active_title'))} (${activeCases.length})</h3>
        <span class="chip chip-teal-dark">${esc(t('legal_blacklisted'))}</span>
      </div>
      <div class="panel-body">
        <div class="clean-list">
          ${activeCases.map(c => {
            const [stageText, stepNum] = legalStageInfo(c.stage);
            return `
              <div class="clean-row teal">
                <div class="row-main">
                  <div class="avatar av-teal">${esc(initials(c.vendor_name))}</div>
                  <div style="min-width:0;flex:1;">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                      <button class="row-title leg-open-vendor" data-vid="${c.vendor_id}">${esc(c.vendor_name)}</button>
                      <span class="chip chip-teal">${esc(stageText)}</span>
                      ${c.has_bounced_cheque ? `<span class="chip chip-red">${esc(t('cheque_bounced'))}</span>` : ''}
                    </div>
                    <div class="stepper">
                      ${[1, 2, 3, 4].map(n => `<div class="step-pill ${n <= stepNum ? 'done' : ''}"></div>`).join('')}
                    </div>
                    <div class="row-sub" style="gap:10px;">
                      <span class="mono">${esc(c.case_number)}</span>
                      <span>${esc(c.advocate_name)}</span>
                      ${c.cure_deadline ? `<span class="chip chip-red">${esc(t('deadline_lbl'))}: ${esc(c.cure_deadline)}</span>` : ''}
                    </div>
                  </div>
                </div>

                <div class="row-right">
                  <div>
                    <div class="row-amount danger">${fmtMoney(c.live_overdue, policy)}</div>
                    <div class="row-caption">${esc(t('days_late', { d: c.live_max_overdue_days }))}</div>
                  </div>
                  <div class="row-actions">
                    <button class="btn btn-primary btn-xs leg-notice" data-vid="${c.vendor_id}">${icon('fileText', 13)} ${esc(t('btn_legal_notice'))}</button>
                    <button class="btn btn-secondary btn-xs leg-stage" data-cid="${c.id}">${esc(t('btn_update_stage'))}</button>
                    <button class="btn btn-success btn-xs leg-pay" data-vid="${c.vendor_id}">${esc(t('btn_settled'))}</button>
                  </div>
                </div>
              </div>
            `;
          }).join('') || `<div class="empty-state">—</div>`}
        </div>
      </div>
    </div>

    ${candidates.length ? `
      <div class="panel">
        <div class="panel-header">
          <h3 class="panel-title">${esc(t('legal_candidates_title'))} (${candidates.length})</h3>
        </div>
        <div class="panel-body">
          <div class="clean-list">
            ${candidates.map(v => `
              <div class="clean-row warn">
                <div class="row-main">
                  <div class="avatar av-red">${esc(initials(v.name))}</div>
                  <div>
                    <button class="row-title leg-open-vendor" data-vid="${v.id}">${esc(v.name)}</button>
                    <div class="row-sub">
                      ${statusChip(v.credit_status)}
                      <span>${esc(t('days_late', { d: v.metrics.max_overdue_days }))}</span>
                      <span>${esc(v.metrics.active_broken_ptps === 1 ? t('broken_one') : t('broken_count', { n: v.metrics.active_broken_ptps }))}</span>
                    </div>
                  </div>
                </div>
                <div class="row-right">
                  <div class="row-amount danger">${fmtMoney(v.metrics.overdue_amount, policy)}</div>
                  <button class="btn btn-teal btn-sm leg-escalate" data-vid="${v.id}">${icon('scale', 14)} ${esc(t('btn_send_legal'))}</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    ` : ''}
  `;

  root.querySelectorAll('.leg-open-vendor').forEach(el => { el.onclick = () => openVendorDrawer(ctx, Number(el.dataset.vid)); });
  root.querySelectorAll('.leg-notice').forEach(el => { el.onclick = () => openEvidencePackModal(ctx, Number(el.dataset.vid)); });
  root.querySelectorAll('.leg-escalate').forEach(el => { el.onclick = () => openLegalEscalateModal(ctx, Number(el.dataset.vid)); });
  root.querySelectorAll('.leg-pay').forEach(el => { el.onclick = () => openPaymentModal(ctx, Number(el.dataset.vid)); });
  root.querySelectorAll('.leg-stage').forEach(el => {
    el.onclick = () => {
      const lc = legal_cases.find(c => c.id === Number(el.dataset.cid));
      if (!lc) return;
      showModal({
        title: `${t('btn_update_stage')} — ${lc.vendor_name}`,
        subtitle: lc.case_number,
        html: `
          <form id="legal-stage-form">
            <div class="form-group">
              <label class="form-label">${isHi ? 'वर्तमान चरण' : 'Current Stage'}</label>
              <select class="form-control" name="stage">
                ${STAGE_KEYS.map(k => `<option value="${k}" ${lc.stage === k ? 'selected' : ''}>${esc(t('st_' + k))}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${isHi ? 'वकील' : 'Advocate'}</label>
              <input class="form-control" name="advocate_name" value="${esc(lc.advocate_name)}" required />
            </div>
            <div class="form-group">
              <label class="form-label">${isHi ? 'नोट्स' : 'Notes'}</label>
              <textarea class="form-control" name="settlement_notes">${esc(lc.settlement_notes || '')}</textarea>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" id="btn-cancel-ls">${esc(t('cancel'))}</button>
              <button type="submit" class="btn btn-teal">${isHi ? 'अपडेट सेव करें' : 'Save Update'}</button>
            </div>
          </form>
        `,
        onMount(mRoot) {
          mRoot.querySelector('#btn-cancel-ls').onclick = closeModal;
          mRoot.querySelector('#legal-stage-form').onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
              const resp = await api(`/api/legal/${lc.id}`, {
                method: 'PUT',
                body: { stage: fd.get('stage'), advocate_name: fd.get('advocate_name'), settlement_notes: fd.get('settlement_notes') }
              });
              ctx.applyData(resp.data);
              closeModal();
              showToast(isHi ? 'लीगल केस अपडेट हो गया।' : 'Legal case updated.');
            } catch (err) { showToast(err.message, 'error'); }
          };
        }
      });
    };
  });
}
