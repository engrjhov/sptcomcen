// ============================================================
// 04-render-all-chip-badge-system.js
// renderAll(), subtasks, unified chip & badge system
// (lines 2633-3376 of the original inline <script>)
// ============================================================

function renderAll() {
  // Each render is isolated — one failure cannot prevent others from running
  try { renderDashboard(); }   catch(e) { console.error('renderDashboard failed:', e); }
  try { renderOverview(); }    catch(e) { console.error('renderOverview failed:', e); }
  try { renderPlanner(); }     catch(e) { console.error('renderPlanner failed:', e); }
  try { renderBoard(); }       catch(e) { console.error('renderBoard failed:', e); }
  try { renderDirectories(); } catch(e) { console.error('renderDirectories failed:', e); }
  try { renderPeople(); }      catch(e) { console.error('renderPeople failed:', e); }
  try { renderReminders(); }   catch(e) { console.error('renderReminders failed:', e); }
  try { renderStickyLayer(); } catch(e) { console.error('renderStickyLayer failed:', e); }
}

function _addSubtaskToForm() {
  const input = document.getElementById('tee-subtask-new');
  if (!input) return;
  const v = input.value.trim();
  if (!v) return;
  const list = document.getElementById('tee-subtask-list');
  if (!list) return;
  const idx = list.children.length;
  const row = document.createElement('div');
  row.className = 'subtask-row';
  row.id = `tee-st-row-${idx}`;
  const chk = document.createElement('div');
  chk.className = 'subtask-check';
  chk.onclick = () => chk.classList.toggle('checked');
  const inp = document.createElement('input');
  inp.className = 'subtask-edit-input';
  inp.id = `tee-st-text-${idx}`;
  inp.value = v;
  inp.placeholder = 'Subtask…';
  const del = document.createElement('button');
  del.className = 'subtask-del';
  del.title = 'Remove';
  del.textContent = '✕';
  del.onclick = () => row.remove();
  row.appendChild(chk);
  row.appendChild(inp);
  row.appendChild(del);
  list.appendChild(row);
  input.value = '';
  input.focus();
}

// ── SUBTASKS ─────────────────────────────────────────────────

function _subtaskSummary(subtasks) {
  if (!subtasks?.length) return '';
  const done = subtasks.filter(s => s.done).length;
  const total = subtasks.length;
  if (done === total) return `${total} Subtasks · All Done ✓`;
  if (done === 0) return `${total} Subtask${total>1?'s':''}`;
  return `${total} Subtasks · ${done} Done`;
}

function _subtaskChip(item) {
  if (item.type === 'ideal' || item.type === 'temporary') {
    const assignments = (STATE.assignments||[]).filter(a => a.teeId === item.id);
    if (!assignments.length) return '';
    const defs = _workflowDefinition(item.type);
    const total = assignments.length * defs.length;
    const done = assignments.reduce((n,a) => n + defs.filter(step => _workflowCategoryStepDone(a, step.stepOrder, item.type)).length, 0);
    const allDone = done === total;
    return `<span class="subtask-chip${allDone?' all-done':''}" onclick="event.stopPropagation();openCategoryProgressDetail('${item.id}')">☐ ${done}/${total}</span>`;
  }
  if (!item.subtasks?.length) return '';
  const done = item.subtasks.filter(s=>s.done).length;
  const total = item.subtasks.length;
  const allDone = done === total;
  return `<span class="subtask-chip${allDone?' all-done':''}" onclick="event.stopPropagation();openSubtaskPanel('${item.id}',this)">☐ ${done}/${total}</span>`;
}

// ── UNIFIED CHIP & BADGE SYSTEM ─────────────────────────────────────────────
function _modalCloseBtn(onClickExpr = 'clearNav()') {
  return `<button class="modal-close" onclick="${onClickExpr}">✕</button>`;
}
// Shared "detail view" modal header — used by openTEEDetail.
// colorSwatch defaults to '' for consumers that don't render one.
// P4-R013a-fix1: header restructured per owner visual review (discovery
// basis P4-D023) — Row 1 is now Title (left) + close button (right); Row 2
// is a compact Type/Priority/Status chip row (Status is newly added here,
// moved out of the Details section body — see openTEEDetail). The visible
// TEE id line is removed entirely. Priority keeps its existing
// openPriorityDropdown onclick/behavior unchanged. Status is built inline
// here using the exact same id/onclick/color logic _buildDetailStatusRow
// already used (that function itself is unchanged; its only call site was
// removed from openTEEDetail's Details section, since Status now renders
// here instead) — this preserves the existing in-place status-button-update
// selector (`#detail-status-btn-<id>, [onclick*="openStatusDropdown(...)"]`),
// which matches by onclick content as well as by id.
// P4-R013a-fix2: Type chip emoji removed per owner visual review — the
// `typeIcon` parameter is intentionally left in the signature (still passed
// by openTEEDetail's only call site) but no longer rendered, so the chip
// reads as plain text ("Task"/"Event"/"Entry") only.
function buildModalDetailHeader(item, typeIcon, typeLabel, pri, colorSwatch = '') {
  const _sc = getStatusColor(getDisplayStatus(item)) || '#64748B';
  const { state: _hdrState, doneAt } = parseStatus(item.status);

  // P4-R013a-fix5: full-date formatter local to this header (discovery
  // basis P4-D023, owner visual review) — mirrors openTEEDetail's own
  // fmtDisplayDate exactly (full weekday + full month names). Kept as its
  // own tiny copy here rather than shared, since taking a dependency on
  // openTEEDetail's local helper would require a new parameter at the
  // single call site for no real benefit — buildModalDetailHeader has no
  // other date-formatting need.
  const _fmtHdrDate = str => {
    if (!str) return '';
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  };

  // P4-R013a-fix5: terminal timestamp now renders inline after the Status
  // chip as full date + time (undoes fix4's separate Details-section row
  // per owner review — that row is no longer built in openTEEDetail at
  // all). Only renders when parseStatus's state is exactly Completed or
  // Done and a timestamp exists; a missing/malformed timestamp renders
  // nothing extra. Display-only — parseStatus and saveTEEModal's terminal-
  // timestamp write logic are both untouched.
  let _doneAtHTML = '';
  if ((_hdrState === 'Completed' || _hdrState === 'Done') && doneAt) {
    const _dtParts   = doneAt.split(' ');
    const _dtDateFmt = _fmtHdrDate(_dtParts[0]);
    const _dtTimeFmt = _dtParts[1] ? fmtTime(_dtParts[1]) : '';
    if (_dtDateFmt) {
      _doneAtHTML = `<span class="tee-detail-header-timestamp">${_dtDateFmt}${_dtTimeFmt ? ` <span class="tee-detail-dot">·</span> ${_dtTimeFmt}` : ''}</span>`;
    }
  }
  const statusChip = `<button id="detail-status-btn-${item.id}" class="status-badge-btn" style="font-size:10px;padding:3px 9px;background:${_sc}22;color:${_sc};border-color:${_sc}44" onclick="openStatusDropdown('${item.id}',this,event)" title="Change status">${getDisplayStatus(item)}</button>${_doneAtHTML}`;

  return `<div class="modal-title tee-detail-header">
      <div class="tee-detail-header-row1">
        <span class="tee-detail-title">${colorSwatch}${item.title}</span>
        ${_modalCloseBtn()}
      </div>
      <div class="tee-detail-header-row2">
        <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:3px 9px;border-radius:20px;background:${pri.bg};color:${pri.text}">${typeLabel}</span>
        ${item.priority ? `<button class="status-badge-btn" style="font-size:10px;padding:3px 9px;background:${pri.bg};color:${pri.text};border-color:${pri.bar}44" onclick="openPriorityDropdown('${item.id}',this,event)" title="Change priority">${item.priority}</button>` : ''}
        ${statusChip}
      </div>
    </div>`;
}
// Shared "list view" modal header — used by _renderArchiveDrawer.
// subtitleHTML is passed in already formatted (pluralization/counts computed by the caller).
function buildModalListHeader(icon, label, subtitleHTML) {
  return `<div class="modal-title">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">${icon}</span>
        <div>
          <div style="font-size:18px;font-weight:700">${label}</div>
          <div style="font-size:12px;color:var(--muted)">${subtitleHTML}</div>
        </div>
      </div>
      ${_modalCloseBtn()}
    </div>`;
}
function _chipStyle(key, withBorder = false) {
  const c = getChipColor(key);
  return withBorder
    ? `background:${c.bg};color:${c.text};border:1px solid ${c.border};`
    : `background:${c.bg};color:${c.text};`;
}
// Group 1 — Context chips: label the DATE RELATIONSHIP (today/overdue/starts)
// _buildContextChips(t) returns HTML for all applicable Group 1 chips
function _buildContextChips(t, refDate) {
  // refDate: YYYY-MM-DD string — defaults to real today if not passed
  const refStr   = refDate || fmtDate(TODAY);
  const st       = parseStatus(t.status).state;
  const done     = st === 'Completed' || st === 'Done';
  let chips      = '';

  // Overdue — past due date relative to refDate, not completed
  if (!done && t.dueDate && t.dueDate < refStr) {
    chips += `<span class="ctx-chip" style="${_chipStyle('overdue', true)}">Overdue</span>`;
  }
  // Due Today — due date matches the reference date
  if (!done && t.dueDate === refStr) {
    chips += `<span class="ctx-chip" style="${_chipStyle('dueToday', true)}">Due Today</span>`;
  }
  // Starts Today — start date matches reference date (tasks only)
  if (!done && t.startDate && t.startDate === refStr && t.dueDate !== refStr) {
    chips += `<span class="ctx-chip" style="${_chipStyle('startsToday', true)}">Starts Today</span>`;
  }
  return chips;
}

// Group 2 — Counter chips: show NUMERIC DISTANCE from today
// _buildCounterChip(dueDate) returns one chip showing days remaining/over
function _buildCounterChip(dueDate, refDate) {
  if (!dueDate) return '';
  // refDate: YYYY-MM-DD string — defaults to real today if not passed
  const days = daysBetween(refDate || null, dueDate);
  if (days === null) return '';
  if (days < 0)  return `<span class="due-chip" style="${_chipStyle('counterOver')}">${Math.abs(days)}d Over</span>`;
  if (days === 0) return `<span class="due-chip" style="${_chipStyle('counterToday')}">Today</span>`;
  if (days <= 2)  return `<span class="due-chip" style="${_chipStyle('counterWarn')}">${days}d</span>`;
  return `<span class="due-chip" style="${_chipStyle('counterOk')}">${days}d</span>`;
}

// ── Badge builders ────────────────────────────────────────────────────────────
// Priority badge — clickable, opens priority dropdown
function _buildPriorityBadge(t) {
  if (!t.priority) return '';
  const pri = getPri(t.priority);
  return `<button class="status-badge-btn" style="background:${pri.bg};color:${pri.text};border-color:${pri.bar}44" onclick="openPriorityDropdown('${t.id}',this,event)" title="Change priority">${t.priority}</button>`;
}

// Status badge — clickable, opens status dropdown
function _buildStatusBadge(t) {
  const _disp  = getDisplayStatus(t);
  const _color = getStatusColor(_disp);
  if (t.type === 'ideal' || t.type === 'temporary') {
    return `<span class="status-badge-btn" style="background:${_color}22;color:${_color};border-color:${_color}44">${_disp}</span>`;
  }
  return `<button class="status-badge-btn" style="background:${_color}22;color:${_color};border-color:${_color}44" onclick="openStatusDropdown('${t.id}',this,event)" title="Change status">${_disp}</button>`;
}
// P4-R013c: _buildDetailStatusRow removed (discovery basis P4-D024) — it had
// been dead code since P4-R013a-fix1 moved Status into buildModalDetailHeader's
// Row 2 chip row; re-confirmed zero call sites immediately before removal.

// Type badge — non-clickable label (Task / Event / Entry)
function _buildTypeBadge(type) {
  const tbc = {
    task: { bg:'rgba(40,92,112,0.18)', text:'var(--accent2)' },
    ideal: { bg:'rgba(52,211,153,0.12)', text:'var(--green)' },
    temporary: { bg:'rgba(251,146,60,0.12)', text:'var(--orange)' },
    event: { bg:'rgba(34,211,238,0.12)', text:'var(--cyan)' },
    entry: { bg:'rgba(251,191,36,0.12)', text:'var(--yellow)' },
  }[type] || { bg:'rgba(40,92,112,0.18)', text:'var(--accent2)' };
  const label = { task:'Task', ideal:'Ideal', temporary:'Temporary', event:'Event', entry:'Entry' }[type] || type;
  return `<span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;background:${tbc.bg};color:${tbc.text};border:1px solid ${tbc.text}33">${label}</span>`;
}

// Tag chip — clickable, opens tag list
function _buildTagChip(tag) {
  const tc = tagColor(tag);
  return `<button class="tag-btn gt-tag" style="background:${tc.bg};color:${tc.text};border-color:${tc.border}" onclick="event.stopPropagation();openTagList('${tag}')"><span style="opacity:0.5">#</span>${tag}</button>`;
}
// Detail-modal tag row — renders the Tags detail-row for item detail modals.
// reopenExpr: string expression that reopens the current modal, e.g. "openTEEDetail('T-001')"
// Used by openTEEDetail().
function _buildDetailTagRow(tags, reopenExpr) {
  const tagArr = Array.isArray(tags) ? tags : (tags||'').split(',').map(t=>t.trim()).filter(Boolean);
  if (!tagArr.length) return '';
  const tagBtns = tagArr.map(t => {
    const tc = tagColor(t);
    return `<button class="tag-btn" style="background:${tc.bg};color:${tc.text};border-color:${tc.border}" onclick="_navTo(()=>${reopenExpr},()=>openTagList('${t}'))" title="View all #${t} items"><span style="opacity:0.5">#</span>${t}</button>`;
  }).join(' ');
  return `<div class="detail-row"><span class="detail-label">Tags</span><span class="detail-value" style="display:flex;flex-wrap:wrap;gap:4px">${tagBtns}</span></div>`;
}

// ── TEE Detail Read-Only People Chips (P4-R013b) ────────────────────────
// Discovery basis: P4-D023, owner go-ahead. Replaces the plain
// formatAssigneesDisplay() text row in the Assign section with visual-only
// chips echoing the Add/Edit people-chip look — no remove affordance, no
// people picker. Reads item.assignees only; Task reuses the existing
// unchanged parseAssignees() for Lead/Contributor distinction (same "slot 0
// is Lead" convention Add/Edit and saveTEEModal already rely on); Event/
// Entry reuse the existing unchanged splitAssigneeNames(). parseAssignees,
// buildAssigneesStr, and formatAssigneesDisplay (still used elsewhere, e.g.
// Kanban cards) are all untouched by this helper. Text is escaped via the
// existing narrow _escapeTEEText() helper (P4-R012b) rather than a new
// escaping function.
//
// P4-R014: chips can now navigate to Person Detail (discovery basis
// P4-D025) — added the optional `isArchived` parameter (default false, so
// the pre-existing single call site with 1 arg keeps working unchanged
// until openTEEDetail's call is updated in the same checkpoint) purely to
// build the correct "return to this TEE Detail" closure. Identity
// resolution is exact-name-match only against STATE.people, computed fresh
// at render time — no schema change, item.assignees remains name-only, no
// ID is ever written back into saved data. A chip becomes clickable only
// when its name matches exactly one STATE.people record; zero or multiple
// matches render exactly as before (no onclick, no .clickable class,
// visually identical to the pre-R014 baseline) — never guesses, never
// picks a "first match." STATE is only read here, never mutated; nothing
// is saved.
function _buildDetailPeopleChips(item, isArchived = false) {
  const isTask = item.type === 'task';
  const label  = isTask ? 'Assignees' : 'Participants';
  const legend = isTask ? '<span class="tee-detail-people-legend">★ Lead</span>' : '';

  const chips = [];
  if (isTask) {
    const { lead, contributors } = parseAssignees(item.assignees);
    if (lead) chips.push({ name: lead, isLead: true });
    (contributors || []).forEach(c => { if (c) chips.push({ name: c, isLead: false }); });
  } else {
    splitAssigneeNames(item.assignees).forEach(n => chips.push({ name: n, isLead: false }));
  }

  const chipsHTML = chips.length
    ? chips.map(c => {
        const matches = (STATE.people || []).filter(p => p.name === c.name);
        const matchedId = matches.length === 1 ? matches[0].id : null;
        const cls = `tee-detail-person-chip${c.isLead ? ' lead' : ''}${matchedId ? ' clickable' : ''}`;
        const onclickAttr = matchedId
          ? ` onclick="_navTo(()=>openTEEDetail('${_escapeTEEAttr(item.id)}',null,${isArchived}),()=>openPersonDetailModal('${_escapeTEEAttr(matchedId)}'))"`
          : '';
        return `<span class="${cls}"${onclickAttr}>${c.isLead ? '<span class="tee-detail-person-star">★</span> ' : ''}${_escapeTEEText(c.name)}</span>`;
      }).join('')
    : `<span class="tee-detail-people-empty">No ${isTask ? 'assignees' : 'participants'}</span>`;

  return `<div class="tee-detail-people">
      <div class="tee-detail-people-head">
        <span class="tee-detail-people-label">${label}</span>
        ${legend}
      </div>
      <div class="tee-detail-people-chips">${chipsHTML}</div>
    </div>`;
}

// ── TEE Detail Links Display + Open/Copy (P4-R012b) ─────────────────────
// Discovery basis: P4-D022. Read-only display layer over the item.links
// data model + Add/Edit editor already shipped in P4-R012a — does not
// change storage format, save/load behavior, or the Add/Edit editor
// itself. Dedicated .tee-detail-link-* namespace and dedicated helper
// functions only — not reusing Directory/Folders' .dir-card-action-link
// or the Add/Edit .tee-link-* editor classes (different surface, this one
// is read-only).

// Narrow escaping helpers scoped to this feature only — not an app-wide
// escaping refactor. _escapeTEEText is safe for HTML text-node content;
// _escapeTEEAttr additionally escapes quote characters so the same value
// can be safely placed inside an HTML attribute (href, title, data-*).
function _escapeTEEText(str) {
  return (str == null ? '' : String(str)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function _escapeTEEAttr(str) {
  return _escapeTEEText(str).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Classifies a raw Links URL/path string into a safe-to-render shape.
// Never mutates the stored item.links value and never saves anything —
// display/open/copy only. Preserves the original raw value for display
// and Copy Path; only `href` (used for the Open action) is ever derived/
// normalized. Windows-drive-letter and Mac/Linux-absolute-path patterns
// are checked BEFORE generic scheme detection so a single drive letter
// (e.g. "D:") is never mistaken for a URI scheme. Allowed clickable
// schemes are an allow-list (http/https/file) — anything else explicit
// (javascript:, data:, vbscript:, or any other scheme) is classified
// 'unsafe' and never gets a non-empty href.
function _classifyTEELinkTarget(rawUrl) {
  const raw = (rawUrl == null ? '' : String(rawUrl)).trim();
  if (!raw) return { kind:'unknown', raw:'', href:'', canOpen:false, canCopy:false, reason:'blank' };

  // Windows local path — checked first so "D:" is never read as a scheme.
  if (/^[A-Za-z]:[\\\/]/.test(raw)) {
    const drive = raw.slice(0, 2);
    const rest  = raw.slice(2).replace(/\\/g,'/').split('/').filter(Boolean).map(encodeURIComponent).join('/');
    return { kind:'local', raw, href:'file:///' + drive + '/' + rest, canOpen:true, canCopy:true };
  }
  // Mac/Linux absolute path — checked before scheme detection for the same reason.
  if (/^\//.test(raw)) {
    const rest = raw.split('/').filter(Boolean).map(encodeURIComponent).join('/');
    return { kind:'local', raw, href:'file:///' + rest, canOpen:true, canCopy:true };
  }

  // Explicit scheme (2+ letters — a single drive letter can never match this).
  const schemeMatch = raw.match(/^([a-zA-Z][a-zA-Z0-9+.-]{1,}):/);
  const scheme = schemeMatch ? schemeMatch[1].toLowerCase() : '';
  if (scheme) {
    const ALLOWED = ['http', 'https', 'file'];
    if (!ALLOWED.includes(scheme)) {
      return { kind:'unsafe', raw, href:'', canOpen:false, canCopy:true, reason:'unsafe scheme: ' + scheme };
    }
    return { kind: scheme === 'file' ? 'file' : 'web', raw, href: raw, canOpen:true, canCopy:true };
  }

  // No scheme, not a recognized local path — domain shorthand (example.com, www.example.com/path).
  if (/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+(\/\S*)?$/i.test(raw)) {
    return { kind:'web', raw, href:'https://' + raw, canOpen:true, canCopy:true };
  }

  return { kind:'unknown', raw, href:'', canOpen:false, canCopy:true, reason:'unrecognized format' };
}

// Fallback display name when a link's Name is blank: hostname for web
// targets, last path segment for file/local targets, else the literal
// string "Link".
function _teeLinkFallbackName(target) {
  if (target.kind === 'web') {
    try { return new URL(target.href).hostname || 'Link'; } catch { return 'Link'; }
  }
  if (target.kind === 'file' || target.kind === 'local') {
    const parts = target.raw.split(/[\\\/]/).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : 'Link';
  }
  return 'Link';
}

// Builds the TEE Detail Links section. Accepts item.links, normalizes to
// an array safely, filters out entries with a blank url, and returns ''
// when there are no valid rows (so a blank/missing item.links renders
// nothing, per spec). Never shows raw JSON or blank rows. Web links get an
// Open action (target="_blank" rel="noopener noreferrer"); file/local
// links get both Open (best-effort) and Copy Path; unsafe schemes render
// inertly with a small muted note and no Open action; unknown/unparseable
// values render as plain text with no action at all.
// P4-R012b-fix1: Correction over the initial P4-R012b pass, per owner
// review — the original one-card-per-link layout with a visible muted
// URL/path line underneath each name read as noisy. This pass replaces it
// with a single outer Links card containing one compact, wrapping pill per
// link; the link's display name IS the clickable action (icon + name, no
// separate generic "Open" label), and the raw URL/path is no longer shown
// as a visible line — it is still preserved internally for href, the
// title tooltip, and Copy Path, exactly as before. Classification logic
// (_classifyTEELinkTarget), the fallback-name rules, Open safety
// (target="_blank" rel="noopener noreferrer", allow-listed schemes only),
// and Copy Path behavior (copyTEELinkPath) are all unchanged — only this
// function's output markup/CSS changed.
function _buildTEELinksDetailSection(links) {
  const valid = (Array.isArray(links) ? links : [])
    .map(l => ({ name: (l && l.name != null) ? String(l.name) : '', url: (l && l.url != null) ? String(l.url).trim() : '' }))
    .filter(l => l.url);
  if (!valid.length) return '';

  const items = valid.map(l => {
    const target = _classifyTEELinkTarget(l.url);
    const displayName = (l.name || '').trim() || _teeLinkFallbackName(target);
    const safeName = _escapeTEEText(displayName);
    const safeRawAttr = _escapeTEEAttr(target.raw);

    if (target.kind === 'web') {
      const safeHref = _escapeTEEAttr(target.href);
      return `<span class="tee-detail-link-item">`
        + `<a class="tee-detail-link-action" href="${safeHref}" target="_blank" rel="noopener noreferrer" title="${safeRawAttr}">`
        + `<i class="ti ti-external-link"></i> ${safeName}</a>`
        + `</span>`;
    }
    if (target.kind === 'file' || target.kind === 'local') {
      const safeHref = _escapeTEEAttr(target.href);
      return `<span class="tee-detail-link-item">`
        + `<a class="tee-detail-link-action" href="${safeHref}" target="_blank" rel="noopener noreferrer" title="${safeRawAttr} — local file opening may depend on your browser/security settings">`
        + `<i class="ti ti-external-link"></i> ${safeName}</a>`
        + `<button type="button" class="tee-detail-link-action" onclick="copyTEELinkPath(this)" data-tee-link-path="${safeRawAttr}" title="Copy Path">`
        + `<i class="ti ti-copy"></i> Copy Path</button>`
        + `</span>`;
    }
    if (target.kind === 'unsafe') {
      return `<span class="tee-detail-link-item tee-detail-link-inert" title="${safeRawAttr}">`
        + `${safeName}<span class="tee-detail-link-muted"> — Blocked unsafe link</span>`
        + `</span>`;
    }
    // 'unknown' kind: inert plain-text name only, no action, no note.
    return `<span class="tee-detail-link-item tee-detail-link-inert" title="${safeRawAttr}">${safeName}</span>`;
  }).join('');

  // fix4: top margin 14px -> 0 (owner review of P4-R013a-fix3 — Notes-to-
  // Links gap read as "an empty field exists there"). This div has no
  // class of its own, so no external Detail-scoped CSS rule could reach
  // it — the only way to close that gap was this one inline value. Nothing
  // else here changed: link classification, hrefs, Copy Path, and the
  // bottom margin (spacing before the pill row) are all untouched.
  return `
    <div class="tee-detail-links">
      <div style="font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.6px;margin:0 0 4px">Links</div>
      <div class="tee-detail-link-list">${items}</div>
    </div>`;
}

// Copies a Links row's original raw value (not the generated file:// href)
// to the clipboard. Reads the value from the clicked button's own
// data-tee-link-path attribute (via .dataset) rather than embedding the
// raw string inside the onclick attribute itself — this avoids having to
// hand-escape backslashes/quotes for a Windows path inside a JS string
// literal, which would be fragile. Uses the modern Clipboard API when
// available, falling back to a temporary offscreen textarea +
// document.execCommand('copy') otherwise (works for both Windows and Mac
// path strings either way, since both are just plain text to the
// clipboard). Fails gracefully — no alert, no thrown error surfaced to
// the user — if the clipboard is unavailable or permission is denied.
function copyTEELinkPath(btnEl) {
  const raw = btnEl?.dataset?.teeLinkPath || '';
  if (!raw) return;
  const showCopied = () => {
    if (!btnEl) return;
    if (btnEl.dataset.teeLinkOriginalLabel === undefined) {
      btnEl.dataset.teeLinkOriginalLabel = btnEl.innerHTML;
    }
    btnEl.textContent = 'Copied';
    setTimeout(() => {
      if (btnEl.isConnected) btnEl.innerHTML = btnEl.dataset.teeLinkOriginalLabel;
    }, 1200);
  };
  const legacyFallback = () => {
    try {
      const ta = document.createElement('textarea');
      ta.value = raw;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showCopied();
    } catch (e) { /* clipboard unavailable/denied — fail silently, no alert */ }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(raw).then(showCopied).catch(legacyFallback);
  } else {
    legacyFallback();
  }
}
window.copyTEELinkPath = copyTEELinkPath;

// Extract trailing hashtags from note text — safety net for manually typed tags
// Reads backwards from end collecting consecutive #word tokens
// Stops at first non-hashtag word — mid-text #3 or #invoice are never captured
function extractStickyTags(text) {
  if (!text) return { cleaned: '', tags: [] };
  const words = text.trim().split(/\s+/);
  const tags  = [];
  while (words.length && /^#[a-zA-Z]\w*$/.test(words[words.length - 1])) {
    tags.unshift(words.pop().slice(1).toLowerCase());
  }
  return { cleaned: words.join(' '), tags };
}

// Get all unique tags from STATE.items and STATE.stickies for autocomplete
function getAllKnownTags() {
  const tagSet = new Set();
  // From tasks/events/entries
  STATE.items.forEach(item => {
    const tags = Array.isArray(item.tags)
      ? item.tags
      : (item.tags||'').split(/[,|]/).map(t=>t.trim().replace(/^#/,'')).filter(Boolean);
    tags.forEach(t => tagSet.add(t.toLowerCase()));
  });
  // From stickies
  STATE.stickies.forEach(s => { (s.tags||[]).forEach(t => tagSet.add(t.toLowerCase())); });
  // From resources (folders, contacts, locations)
  [...(STATE.folders||[]), ...(STATE.contacts||[]), ...(STATE.locations||[])].forEach(r => {
    (r.tags||[]).forEach(t => tagSet.add(t.toLowerCase()));
  });
  return [...tagSet].sort();
}

// Left accent border style based on priority
function _buildAccentBorder(priority) {
  const isDark  = isDarkTheme();
  const accents = {
    Critical: isDark ? '#F87171' : '#DC2626',
    High:     isDark ? '#FB923C' : '#EA580C',
    Medium:   isDark ? '#0891B2' : '#0E7490',
  };
  const color = accents[priority];
  return color ? `border-left:3px solid ${color};` : '';
}
// ── END UNIFIED CHIP & BADGE SYSTEM ─────────────────────────────────────────

function toggleSubtask(itemId, idx) {
  const item = STATE.items.find(i => i.id === itemId);
  if (!item || !item.subtasks) return;
  const nowDone = !item.subtasks[idx].done;
  item.subtasks[idx].done = nowDone;
  // Set or clear doneAt timestamp
  if (nowDone) {
    const now = new Date();
    const ts  = fmtDate(now) + ' ' + String(now.getHours()).padStart(2,'0')
              + ':' + String(now.getMinutes()).padStart(2,'0');
    item.subtasks[idx].doneAt = ts;
  } else {
    delete item.subtasks[idx].doneAt;
  }
  recalcIdealTemporaryStatus(item);
  saveTEE(item).catch(() => toast('Save failed','error'));
  // Update detail modal in-place if open
  const chk = document.getElementById(`st-chk-${itemId}-${idx}`);
  const txt = document.getElementById(`st-txt-${itemId}-${idx}`);
  const tst = document.getElementById(`st-ts-${itemId}-${idx}`);
  const hdr = document.getElementById(`st-hdr-${itemId}`);
  if (chk) chk.className = `subtask-check${nowDone?' checked':''}`;
  if (txt) txt.className = `subtask-text${nowDone?' done':''}`;
  if (tst) tst.textContent = nowDone ? _fmtSubtaskTs(item.subtasks[idx].doneAt) : '';
  if (hdr) hdr.textContent = _subtaskSummary(item.subtasks);
  renderAll();
}

// Format subtask timestamp for inline display — "Jun 2 · 2:45 PM"
function _fmtSubtaskTs(ts) {
  if (!ts) return '';
  try {
    const [datePart, timePart] = ts.split(' ');
    const [y, m, d] = datePart.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dateStr = months[parseInt(m,10)-1] + ' ' + parseInt(d,10);
    if (!timePart) return dateStr;
    const [hh, mm] = timePart.split(':').map(Number);
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const h    = hh % 12 || 12;
    return dateStr + ' · ' + h + ':' + String(mm).padStart(2,'0') + ' ' + ampm;
  } catch { return ts; }
}

function addSubtaskInline(itemId, inputEl) {
  const text = inputEl.value.trim();
  if (!text) return;
  const item = STATE.items.find(i => i.id === itemId);
  if (!item) return;
  if (!item.subtasks) item.subtasks = [];
  item.subtasks.push({ text, done: false });
  saveTEE(item).catch(() => toast('Save failed','error'));
  inputEl.value = '';
  // Re-render subtask list in detail modal
  const listEl = document.getElementById(`st-list-${itemId}`);
  const hdrEl  = document.getElementById(`st-hdr-${itemId}`);
  if (listEl) listEl.innerHTML = _buildSubtaskRows(item, false);
  if (hdrEl)  hdrEl.textContent = _subtaskSummary(item.subtasks);
  renderAll();
}

function deleteSubtask(itemId, idx) {
  const item = STATE.items.find(i => i.id === itemId);
  if (!item || !item.subtasks) return;
  item.subtasks.splice(idx, 1);
  saveTEE(item).catch(() => toast('Save failed','error'));
  const listEl = document.getElementById(`st-list-${itemId}`);
  const hdrEl  = document.getElementById(`st-hdr-${itemId}`);
  if (listEl) listEl.innerHTML = _buildSubtaskRows(item, true);
  if (hdrEl)  hdrEl.textContent = _subtaskSummary(item.subtasks);
  renderAll();
}

// P4-R013c: added the optional third `readOnly` parameter (discovery basis
// P4-D024) — defaults to false, so every pre-existing 2-arg call site
// (active TEE Detail, Kanban's openSubtaskPanel, toggleSubtask/deleteSubtask
// in-place re-renders) is byte-identical to before. When readOnly is true
// (archived TEE Detail only): the row gets an `is-readonly` class (for the
// paired CSS below, so the row no longer hints at being clickable), the
// checkbox's `onclick` is omitted entirely (never calls toggleSubtask), and
// the delete button is omitted regardless of `withDelete` (never calls
// deleteSubtask) — checked/done visuals, text, and the doneAt timestamp all
// render identically to the active/interactive path.
function _buildSubtaskRows(item, withDelete, readOnly = false) {
  return (item.subtasks||[]).map((s, idx) => {
    const tsHTML = s.doneAt
      ? '<span id="st-ts-' + item.id + '-' + idx + '" class="subtask-ts">' + _fmtSubtaskTs(s.doneAt) + '</span>'
      : '<span id="st-ts-' + item.id + '-' + idx + '" class="subtask-ts"></span>';
    const delBtn = (withDelete && !readOnly)
      ? '<button class="subtask-del" onclick="deleteSubtask(\'' + item.id + '\',' + idx + ')" title="Remove">✕</button>'
      : '';
    const chkOnclick = readOnly ? '' : ' onclick="toggleSubtask(\'' + item.id + '\',' + idx + ')"';
    return '<div class="subtask-row' + (readOnly ? ' is-readonly' : '') + '" id="st-row-' + item.id + '-' + idx + '">'
      + '<div id="st-chk-' + item.id + '-' + idx + '" class="subtask-check' + (s.done ? ' checked' : '') + '"'
      + chkOnclick + '></div>'
      + '<span id="st-txt-' + item.id + '-' + idx + '" class="subtask-text' + (s.done ? ' done' : '') + '">' + (s.text||'') + '</span>'
      + tsHTML
      + delBtn
      + '</div>';
  }).join('');
}

// P4-R013c: added the optional third `readOnly` parameter (discovery basis
// P4-D024) — defaults to false, so the one pre-existing call site (active
// TEE Detail, `_buildSubtaskSection(item, false)`) is byte-identical to
// before. When readOnly is true (archived TEE Detail only): zero subtasks
// renders nothing at all (matches -fix5's existing "no Execution section"
// behavior for archived items with no subtasks — the add-input branch below
// is never reached), and when there are subtasks, the add-row is always
// suppressed regardless of `withDelete` (archived items never offer to add
// a subtask) and rows render via the new readOnly mode in _buildSubtaskRows.
function _buildSubtaskSection(item, withDelete, readOnly = false) {
  if (!item.subtasks?.length && !withDelete) {
    if (readOnly) return '';
    // Detail view with no subtasks: show add input only
    return `<div class="subtask-section">
      <div class="subtask-header">
        <span class="subtask-header-lbl">Subtasks</span>
      </div>
      <div id="st-list-${item.id}" class="subtask-list"></div>
      <div class="subtask-add-row" style="display:flex;align-items:center;gap:6px">
        <input class="subtask-add-input" id="st-new-${item.id}" placeholder="New subtask…"
          onkeydown="if(event.key==='Enter'){event.preventDefault();addSubtaskInline('${item.id}',this);}">
        <button type="button" style="flex-shrink:0;padding:4px 10px;border-radius:8px;border:1px solid var(--border2);background:var(--glass2);color:var(--text2);font-size:11px;font-family:var(--font);cursor:pointer;"
          onclick="addSubtaskInline('${item.id}',document.getElementById('st-new-${item.id}'))">Add</button>
      </div>
    </div>`;
  }
  if (!item.subtasks?.length) return '';
  return `<div class="subtask-section">
    <div class="subtask-header">
      <span class="subtask-header-lbl">Subtasks</span>
      <span id="st-hdr-${item.id}" class="subtask-summary">${_subtaskSummary(item.subtasks)}</span>
    </div>
    <div id="st-list-${item.id}" class="subtask-list">
      ${_buildSubtaskRows(item, withDelete, readOnly)}
    </div>
    ${(withDelete || readOnly) ? '' : `<div class="subtask-add-row" style="display:flex;align-items:center;gap:6px">
      <input class="subtask-add-input" id="st-new-${item.id}" placeholder="New subtask…"
        onkeydown="if(event.key==='Enter'){event.preventDefault();addSubtaskInline('${item.id}',this);}">
      <button type="button" style="flex-shrink:0;padding:4px 10px;border-radius:8px;border:1px solid var(--border2);background:var(--glass2);color:var(--text2);font-size:11px;font-family:var(--font);cursor:pointer;"
        onclick="addSubtaskInline('${item.id}',document.getElementById('st-new-${item.id}'))">Add</button>
    </div>`}
  </div>`;
}

// Kanban floating panel
function openSubtaskPanel(itemId, anchorEl) {
  event.stopPropagation();
  const existing = document.getElementById('subtask-panel');
  if (existing) { existing.remove(); return; }
  const item = STATE.items.find(i => i.id === itemId);
  if (!item) return;
  if (!item.subtasks) item.subtasks = [];

  const panel = document.createElement('div');
  panel.id = 'subtask-panel';
  panel.className = 'subtask-panel';
  panel.innerHTML = `
    <div class="subtask-panel-hdr">
      <span>Subtasks</span>
      <span id="st-hdr-${itemId}" style="color:var(--muted);font-size:10px">${_subtaskSummary(item.subtasks)}</span>
    </div>
    <div id="st-list-${itemId}" class="subtask-list" style="max-height:180px;overflow-y:auto">
      ${_buildSubtaskRows(item, false)}
    </div>
    <div class="subtask-add-row" style="margin-top:6px;display:flex;align-items:center;gap:6px">
      <input class="subtask-add-input" id="st-panel-new-${itemId}" placeholder="New subtask…"
        onkeydown="if(event.key==='Enter'){event.preventDefault();addSubtaskInline('${itemId}',this);}">
      <button type="button" style="flex-shrink:0;padding:4px 10px;border-radius:8px;border:1px solid var(--border2);background:var(--glass2);color:var(--text2);font-size:11px;font-family:var(--font);cursor:pointer;"
        onclick="addSubtaskInline('${itemId}',document.getElementById('st-panel-new-${itemId}'))">Add</button>
    </div>`;

  document.body.appendChild(panel);
  const rect = anchorEl.getBoundingClientRect();
  const pRect = panel.getBoundingClientRect();
  let top = rect.bottom + 6;
  let left = rect.left;
  if (left + pRect.width > window.innerWidth - 8) left = window.innerWidth - pRect.width - 8;
  if (top + pRect.height > window.innerHeight - 8) top = rect.top - pRect.height - 6;
  panel.style.top  = `${top}px`;
  panel.style.left = `${left}px`;

  setTimeout(() => {
    document.addEventListener('click', function _close(e) {
      if (!document.getElementById('subtask-panel')?.contains(e.target)) {
        document.getElementById('subtask-panel')?.remove();
        document.removeEventListener('click', _close);
      }
    });
  }, 0);
}

