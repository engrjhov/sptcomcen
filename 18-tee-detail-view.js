// ============================================================
// 18-tee-detail-view.js
// Item detail view + type-zone helpers
// (lines 8430-9160 of the original inline <script>)
// ============================================================

// ── TEE DETAIL VIEW ───────────────────────────────────────────
// Read-only item detail. fromDate enables ‹ Back to day list.
// isArchived flag switches Edit→Restore and searches archiveCache.
function openTEEDetail(itemId, _u1, isArchived) {
  // Search active items first, then archive cache
  let item = STATE.items.find(i => i.id === itemId);
  if (!item && isArchived) {
    for (const [key, items] of Object.entries(STATE.archiveCache)) {
      if (key === '_fetched') continue;
      const match = items.find(i => i.id === itemId);
      if (match) { item = match; break; }
    }
  }
  if (!item) return;

  const typeIcon  = { task:'📋', ideal:'🏬', temporary:'⏱️', event:'📆', entry:'📝' }[item.type] || '📄';
  const typeLabel = { task:'Task', ideal:'Ideal', temporary:'Temporary', event:'Event', entry:'Entry' }[item.type] || item.type;
  const pri = getPri(item.priority);

  // Build detail rows — only show fields that have values
  const row = (label, value, mono=false) => value
    ? `<div class="detail-row">
        <span class="detail-label">${label}</span>
        <span class="detail-value${mono?' detail-mono':''}">${value}</span>
       </div>`
    : '';

  // P4-R013a-fix2: full weekday + full month names in Detail date displays
  // (discovery basis P4-D023, owner visual review) — was 'short'/'short'
  // ("Sat, Jul 4, 2026"), now 'long'/'long' ("Saturday, July 4, 2026").
  // fmtDisplayDate is local to openTEEDetail only — this does not affect
  // any other date display in the app (Add/Edit, list/board/calendar views
  // each use their own separate date formatting).
  const fmtDisplayDate = str => {
    if (!str) return '';
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  };

  // P4-R013a-fix4: Detail-only dash separator (owner review — "any time/date
  // range using a dash must include spaces before and after it"). A plain
  // " - " with regular space characters was verified byte-correct (each
  // side is a real 0x20 space, confirmed via Range measurement) but reads
  // visually tight-to-attached with certain fallback fonts, since a run of
  // regular whitespace collapses to a single (font-dependent-width) space
  // under normal HTML whitespace rules — the gap is then only as wide as
  // that font's space glyph, which can be very narrow. `.tee-detail-dash`
  // below gives the dash a fixed CSS margin instead, so the visual gap is a
  // guaranteed pixel value independent of font/glyph metrics. row()/detail
  // values are already inserted as HTML (see buildModalDetailHeader's own
  // inline-styled spans for the same pattern elsewhere in this file), so
  // this small span is safe to embed the same way.
  const _dtDash = '<span class="tee-detail-dash">-</span>';

  // P4-R013a-fix5: same reasoning as _dtDash above, applied to the middle
  // dot joining an Event/Entry's date and time into one "Date and Time"
  // row — a plain " · " read as too faint/subtle per owner review.
  // `.tee-detail-dot` gives it a fixed margin plus bolder weight/size so it
  // stays clearly visible regardless of font fallback.
  const _dtDot = '<span class="tee-detail-dot">·</span>';

  // Detail-only time formatter (fmtTimeRange itself is unchanged — it is
  // also used by the Kanban card time display; this local helper is scoped
  // to openTEEDetail only). Degrades safely: both start and end present ->
  // "start - end", only one present -> that one alone, neither -> ''.
  const fmtDetailTime = (start, end) => {
    if (start && end) return `${fmtTime(start)} ${_dtDash} ${fmtTime(end)}`;
    if (start) return fmtTime(start);
    if (end) return fmtTime(end);
    return '';
  };

  // P4-R013a-fix4: corrected date/time row rules per owner visual review of
  // -fix3 (discovery basis P4-D023) — display-only: saved fields
  // (item.dueDate, item.startDate, item.date, item.time, item.endTime) and
  // Add/Edit are both unchanged; this only changes how openTEEDetail
  // presents them. Task keeps -fix3's two-row model as-is (Due Date, plus
  // a hyphen-spaced Timeframe row when Start Date also exists — already
  // correct, spaces confirmed present on both sides of the hyphen). Event
  // and Entry are now combined into one "Date and Time" row instead of
  // -fix3's separate Date/Time rows, joined with a middle dot when a time
  // value exists, degrading to the date alone when no time value is
  // present. No "Timeline"/"Schedule"/"When" labels remain.
  let dateTimeRow = '';
  let timeframeRow = '';
  if (item.type === 'task') {
    if (item.dueDate) {
      dateTimeRow = row('Due Date', fmtDisplayDate(item.dueDate));
      if (item.startDate) {
        timeframeRow = row('Timeframe', `${fmtDisplayDate(item.startDate)} ${_dtDash} ${fmtDisplayDate(item.dueDate)}`);
      }
    } else if (item.startDate) {
      dateTimeRow = row('Start Date', fmtDisplayDate(item.startDate));
    }
  } else if (item.type === 'event') {
    if (item.date) {
      const timeVal = fmtDetailTime(item.time, item.endTime);
      dateTimeRow = row('Date and Time', timeVal ? `${fmtDisplayDate(item.date)} ${_dtDot} ${timeVal}` : fmtDisplayDate(item.date));
    }
  } else { // entry
    if (item.date) {
      const timeVal = item.time ? fmtTime(item.time) : '';
      dateTimeRow = row('Date and Time', timeVal ? `${fmtDisplayDate(item.date)} ${_dtDot} ${timeVal}` : fmtDisplayDate(item.date));
    }
  }

  // P4-R013a-fix5: the Completed/Done terminal timestamp is no longer a
  // Details-section row (fix4's interpretation, undone here per owner
  // review) — it now renders inline in the header next to the Status chip
  // instead (see buildModalDetailHeader). Nothing else here builds a
  // timestamp row any more; non-terminal items already showed no such row
  // before fix4 and still show none.
  // P4-R011b: Event color swatch removed from TEE Detail (discovery basis
  // P4-D021a) — no dot renders before the title for any Event, including
  // legacy Events that already have a saved Color value. buildModalDetailHeader's
  // colorSwatch parameter is left in place (its own default is already ''),
  // simply no longer passed a non-empty value from here.

  // P4-R013a: TEE Detail section grouping (discovery basis P4-D023) — the
  // former single flat .detail-grid card is replaced by the same
  // .tee-section-header/.tee-field-group section-card language Add/Edit
  // already uses (Details/Assign/Context/Execution), reusing every
  // existing field-rendering helper/row unchanged. Each section's content
  // is computed first, then wrapped only if non-empty — an empty section
  // renders nothing at all, matching the owner-approved "hide a whole
  // section if it would have no visible content" rule. Field membership,
  // visibility rules, Links (P4-R012b/-fix1, untouched), and the archived-
  // Subtasks branch are all otherwise identical to the pre-P4-R013a markup.
  const section = (title, content) => content
    ? `<div class="tee-section-header">${title}</div><div class="tee-field-group">${content}</div>`
    : '';

  // P4-R013a-fix1: Status moved out of the Details section body into the
  // header's Row 2 chip row (see buildModalDetailHeader) — no longer part
  // of detailsContent. Its exact id/onclick/color logic was reproduced
  // inline in buildModalDetailHeader so the existing in-place
  // status-button-update selector (`#detail-status-btn-<id>, [onclick*=...]`)
  // keeps matching either way. (P4-R013c: the now-unreachable
  // _buildDetailStatusRow this section used to call has been removed —
  // discovery basis P4-D024, zero call sites re-confirmed before removal.)
  // P4-R013a-fix2: Description/Notes label+box are now each wrapped in a
  // single container div, so .tee-field-group's own gap (a single flex
  // "gap" between direct children) is the only space between a row above
  // and the label — the label-to-box distance is controlled purely by the
  // label's own small margin-bottom, instead of the two compounding
  // (gap + margin) as in r013a-fix1. This is what "tighten gap between
  // Description/Notes label and its box" actually required.
  const workflowDeadlineRows = (item.type === 'ideal' || item.type === 'temporary') ? [
    row('Product List Deadline', fmtDisplayDate(item.productListDeadline)),
    row('Planogram Deadline', fmtDisplayDate(item.planogramDeadline)),
  ].join('') : '';

  const detailsContent = [
    dateTimeRow,
    timeframeRow,
    workflowDeadlineRows,
    item.desc ? `<div><div style="margin:0 0 3px;font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.6px">Description</div>
      <div style="font-size:13px;color:var(--text2);line-height:1.6;padding:8px 10px;background:var(--glass);border:1px solid var(--border);border-radius:10px">${item.desc}</div></div>` : ''
  ].join('');

  // P4-R013b: Assign section now shows read-only people chips instead of
  // the plain formatAssigneesDisplay() text (discovery basis P4-D023, owner
  // go-ahead) — see _buildDetailPeopleChips above. Always returns non-empty
  // HTML (a muted "No assignees"/"No participants" fallback when there are
  // none), matching -fix5's existing always-render-the-Assign-card behavior
  // (formatAssigneesDisplay likewise always returned at least '—' before).
  // P4-R014: passes isArchived through so a clickable chip's Person Detail
  // "return to this TEE Detail" closure reopens with the correct
  // active/archived state (discovery basis P4-D025).
  const assignContent = _buildDetailPeopleChips(item, isArchived);

  // P4-R013a-fix3: Context order corrected per owner visual review
  // (discovery basis P4-D023) — Department, Project, Category, Tags, Notes,
  // Links (was Category, Project, Department, Tags, Notes, Links). Tags
  // stays between Category and Notes, unchanged behavior/position relative
  // to Notes/Links; only Department/Project/Category were reordered.
  const contextContent = [
    row('Department', item.dept),
    row('Project', item.project),
    row('Category', item.category),
    _buildDetailTagRow(item.tags, `openTEEDetail('${item.id}')`),
    item.notes ? `<div><div style="margin:0 0 3px;font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.6px">Notes</div>
      <div style="font-size:13px;color:var(--text2);line-height:1.6;padding:8px 10px;background:var(--glass);border:1px solid var(--border);border-radius:10px">${item.notes}</div></div>` : '',
    _buildTEELinksDetailSection(item.links)
  ].join('');

  // P4-R013c: the archived branch used to hand-inline a duplicate of
  // _buildSubtaskSection/_buildSubtaskRows' own markup directly here
  // (discovery basis P4-D024) — that duplicate put onclick="toggleSubtask(...)"
  // on the *entire* row (wider than the active path's checkbox-only handler)
  // even though toggleSubtask() always silently no-ops for an archived item
  // (its STATE.items.find(...) lookup can never match one), producing a row
  // that visually hovered/looked clickable but did nothing. Both branches now
  // call the same shared helper — active unchanged (`_buildSubtaskSection(item,
  // false)`, still 2 args, still exactly the interactive/editable rendering
  // it always was), archived now genuinely read-only via the new third
  // argument (`_buildSubtaskSection(item, false, true)`): no row/checkbox
  // onclick, no delete button, no add-row, zero subtasks still renders
  // nothing (identical to the prior archived empty-state), and checked/done
  // visuals, text, and doneAt timestamps all render exactly as before.
  const executionContent = _buildSubtaskSection(item, false, isArchived);

  // P4-R013a-fix1: TEE Detail shell/spacing correction (discovery basis
  // P4-D023, owner visual review of P4-R013a) — header and footer now sit
  // outside a dedicated scrollable body region (.tee-detail-shell/
  // .tee-detail-body, Detail-specific, no shared selectors with Add/Edit's
  // .tee-modal-shell/.tee-modal-form-scroll/.tee-modal-footer). The footer
  // itself is still the exact same .modal-actions markup/behavior as
  // before (Back/Archive/Edit/Restore, identical onclick handlers) — only
  // its position in the DOM (sibling after .tee-detail-body, instead of
  // inline within the scrolling flow) changed, via a narrow
  // `.tee-detail-shell > .modal-actions` CSS selector that does not touch
  // .modal-actions' own base rule (see CSS block).
  openModal(`
    <div class="tee-detail-shell">
      ${buildModalDetailHeader(item, typeIcon, typeLabel, pri)}

      <div class="tee-detail-body">
        ${section('Details', detailsContent)}
        ${section('Assign', assignContent)}
        ${section('Context', contextContent)}
        ${section('Execution', executionContent)}

        ${item.archivedDate ? `<div style="margin-bottom:12px;padding:8px 12px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:10px;font-size:12px;color:var(--yellow)">Archived ${fmtDisplayDate(item.archivedDate)} · ${item.archivedBy || 'auto'}</div>` : ''}
      </div>

      <div class="modal-actions" style="margin-top:18px">
        ${_backBtn()}
        ${isArchived
          ? `<button class="btn-primary" onclick="restoreFromArchive('${item.id}')">Restore to Active</button>`
          : `<div style="display:flex;gap:8px">
               <button class="btn-ghost" onclick="archiveItem('${item.id}')">Archive</button>
               <button class="btn-primary" onclick="_navTo(()=>openTEEDetail('${item.id}'),()=>openTEEModal('${item.id}'))">Edit</button>
             </div>`
        }
      </div>
    </div>`);
}

// ── TEE type-zone helpers (P4-R004) — extracted from _renderTEEModal and switchTEEType ──
function _buildTEEIdentityFields(type, item, defaultStatus) {
  // P4-R008b: Relocated from the former _buildTEEDetailsTop into the unified top
  // "identity bar" (Title → Type/Priority/Status → Details) per P4-D017, replacing
  // the r008a grid-based exploration (unaccepted). Status and Priority no longer
  // render inside the Details group, and their visible triggers are now restyled
  // as compact pill-shaped dropdown buttons (.tee-identity-pill, matching the
  // app's existing subfilter-pill visual language, e.g. .kb-dropdown-btn's "All
  // Dates ▼") instead of full-width .form-select-styled buttons. Markup/IDs/
  // value-holder contract is otherwise unchanged from P4-R006-fix1/P4-R007-fix1:
  // the hidden #tee-status/#tee-priority inputs remain the real value-bearing
  // elements saveTEEModal() reads via document.getElementById(...)?.value — only
  // visual styling and DOM position changed, plus the internal order swapped to
  // Priority-then-Status (was Status-then-Priority) to match the owner-approved
  // Type / Priority / Status bar order from P4-D017.
  // P4-R006-fix1: default Task status is now 'To Do' (owner request; was 'Backlog'),
  // and the resolved status is normalized for `type` via _normalizeTEEStatusForType
  // — this is what stops an Entry's 'Open' (or any other type's status) from
  // silently surviving a type switch as an invalid Task status, and vice versa.
  if (type === 'ideal' || type === 'temporary') {
    const bucket = item?.status || 'NOT STARTED';
    const stage  = item?.approvalStage || (item ? computeApprovalStage(item) : 'Product List');
    const bColor = getStatusColor(bucket);
    return `
    <input type="hidden" id="tee-priority" value="${item?.priority||'Medium'}">
    <div class="tee-identity-group">
      <span class="tee-side-label">Priority</span>
      <button type="button" id="tee-priority-trigger" class="tee-identity-pill tee-priority-trigger" onclick="openTEEPriorityDropdown(this, event)">
        <span class="tee-identity-pill-main">
          <span class="status-dot" id="tee-priority-trigger-dot" style="background:${getPri(item?.priority||'Medium').bar}"></span>
          <span id="tee-priority-trigger-label" class="tee-identity-pill-label">${item?.priority||'Medium'}</span>
        </span>
        <span class="tee-identity-pill-chevron">&#9660;</span>
      </button>
    </div>
    <input type="hidden" id="tee-status" value="${bucket}">
    <div class="tee-identity-group">
      <span class="tee-side-label">Status</span>
      <span class="tee-identity-pill" style="cursor:default;background:${bColor}22;color:${bColor};border-color:${bColor}44" title="Derived automatically from subtask progress — not manually editable">
        <span class="tee-identity-pill-main">
          <span class="status-dot" style="background:${bColor}"></span>
          <span>${stage}</span>
        </span>
      </span>
    </div>`;
  }
  if (type === 'task') {
    const _rawStatus = parseStatus(item?.status || defaultStatus || 'To Do').state || 'To Do';
    const _curStatus = _normalizeTEEStatusForType('task', _rawStatus);
    return `
    <input type="hidden" id="tee-priority" value="${item?.priority||'Medium'}">
    <div class="tee-identity-group">
      <span class="tee-side-label">Priority</span>
      <button type="button" id="tee-priority-trigger" class="tee-identity-pill tee-priority-trigger" onclick="openTEEPriorityDropdown(this, event)">
        <span class="tee-identity-pill-main">
          <span class="status-dot" id="tee-priority-trigger-dot" style="background:${getPri(item?.priority||'Medium').bar}"></span>
          <span id="tee-priority-trigger-label" class="tee-identity-pill-label">${item?.priority||'Medium'}</span>
        </span>
        <span class="tee-identity-pill-chevron">&#9660;</span>
      </button>
    </div>
    <input type="hidden" id="tee-status" value="${_curStatus}">
    <div class="tee-identity-group">
      <span class="tee-side-label">Status</span>
      <button type="button" id="tee-status-trigger" class="tee-identity-pill tee-status-trigger" onclick="openTEEStatusDropdown('${type}', this, event)">
        <span class="tee-identity-pill-main">
          <span class="status-dot" id="tee-status-trigger-dot" style="background:${getStatusColor(_curStatus)}"></span>
          <span id="tee-status-trigger-label" class="tee-identity-pill-label">${_curStatus}</span>
        </span>
        <span class="tee-identity-pill-chevron">&#9660;</span>
      </button>
    </div>`;
  }
  const _rawStatus = parseStatus(item?.status||defaultStatus||'Open').state||'Open';
  const _curStatus = _normalizeTEEStatusForType(type, _rawStatus);
  return `
    <input type="hidden" id="tee-priority" value="${item?.priority||'Medium'}">
    <div class="tee-identity-group">
      <span class="tee-side-label">Priority</span>
      <button type="button" id="tee-priority-trigger" class="tee-identity-pill tee-priority-trigger" onclick="openTEEPriorityDropdown(this, event)">
        <span class="tee-identity-pill-main">
          <span class="status-dot" id="tee-priority-trigger-dot" style="background:${getPri(item?.priority||'Medium').bar}"></span>
          <span id="tee-priority-trigger-label" class="tee-identity-pill-label">${item?.priority||'Medium'}</span>
        </span>
        <span class="tee-identity-pill-chevron">&#9660;</span>
      </button>
    </div>
    <input type="hidden" id="tee-status" value="${_curStatus}">
    <div class="tee-identity-group">
      <span class="tee-side-label">Status</span>
      <button type="button" id="tee-status-trigger" class="tee-identity-pill tee-status-trigger" onclick="openTEEStatusDropdown('${type}', this, event)">
        <span class="tee-identity-pill-main">
          <span class="status-dot" id="tee-status-trigger-dot" style="background:${getStatusColor(_curStatus)}"></span>
          <span id="tee-status-trigger-label" class="tee-identity-pill-label">${_curStatus}</span>
        </span>
        <span class="tee-identity-pill-chevron">&#9660;</span>
      </button>
    </div>`;
}
function _buildTEEDetailsBottom(type, item, d) {
  if (type === 'ideal' || type === 'temporary') {
    const storeCode = item?.storeCode || '';
    const storeName = item?.storeName || '';
    const store = STATE.stores.find(s => s.code === storeCode) || {};
    const backupFolder = item?.backupFolder || store.backupFolder || '';
    const branchFolder = item?.branchFolder || store.branchFolder || '';
    const moduleUrl = item?.moduleAllocUrl || '';

    const link = (label, url) => url
      ? `<a href="${url}" target="_blank" rel="noopener noreferrer"
            class="tee-store-folder-link" title="Open ${label}">
           <i class="ti ti-external-link"></i>${label}
         </a>`
      : `<span class="tee-store-folder-link is-empty"><i class="ti ti-link-off"></i>${label} unavailable</span>`;

    return `
      <div class="form-group">
        <span class="tee-side-label">Store *</span>
        <div class="tee-store-search-wrap">
          <input class="form-input" id="tee-store-search"
            placeholder="Search store code or store name…"
            value="${storeCode ? storeCode + ' — ' + storeName : ''}"
            oninput="_teeStoreSearch(this.value)" autocomplete="off">
          <div id="tee-store-results"></div>
        </div>
        <input type="hidden" id="tee-store-code" value="${storeCode}">
        <input type="hidden" id="tee-store-name" value="${storeName}">
      </div>

      <div class="tee-store-folder-grid">
        <div>
          <span class="tee-side-label">Backup Folder</span>
          <input class="form-input" id="tee-backup-folder" value="${_teeEscapeHtml(backupFolder)}"
            placeholder="Paste Google Drive folder link…" oninput="_teeFolderInputChange('backup', this.value)">
          <div id="tee-backup-folder-link" style="margin-top:5px">${link('Open Backup Folder', backupFolder)}</div>
        </div>
        <div>
          <span class="tee-side-label">Branch Folder</span>
          <input class="form-input" id="tee-branch-folder" value="${_teeEscapeHtml(branchFolder)}"
            placeholder="Paste Google Drive folder link…" oninput="_teeFolderInputChange('branch', this.value)">
          <div id="tee-branch-folder-link" style="margin-top:5px">${link('Open Branch Folder', branchFolder)}</div>
        </div>
      </div>
      <div class="tee-field-help" style="margin:-6px 0 12px">Auto-filled from the selected Store, but you can paste your own link over it for this task specifically. Need more than these two? Use the Links / URLs section below — it also shows up on the Detail view.</div>

      <div class="tee-compact-pair" style="margin-bottom:12px">
        <div class="tee-compact-field">
          <span class="tee-side-label">Product List Deadline</span>
          <input class="form-input" type="date" id="tee-product-list-deadline" value="${item?.productListDeadline||''}">
        </div>
        <div class="tee-compact-field">
          <span class="tee-side-label">Planogram Deadline</span>
          <input class="form-input" type="date" id="tee-planogram-deadline" value="${item?.planogramDeadline||''}">
        </div>
      </div>

      <div class="form-group">
        <span class="tee-side-label">Module Allocation *</span>
        <div class="tee-module-upload" id="tee-module-upload-wrap">
          ${moduleUrl
            ? `<div class="tee-module-current">
                 <i class="ti ti-file-type-pdf"></i>
                 <a href="${moduleUrl}" target="_blank" rel="noopener noreferrer">Current Module Allocation PDF</a>
               </div>`
            : `<div class="tee-module-empty">No Module Allocation PDF uploaded.</div>`}
          <input type="file" id="tee-module-file" accept="application/pdf,.pdf"
            onchange="_teeUploadModuleAllocation(this.files[0])">
          <input type="hidden" id="tee-module-url-fallback" value="${moduleUrl}">
          <input type="hidden" id="tee-module-file-id" value="${item?.moduleAllocFileId || ''}">
        </div>
        <div id="tee-module-upload-status" class="tee-upload-status"></div>
      </div>`;
  }

  if (type === 'task') return `
    <div class="tee-compact-pair">
      <div class="tee-compact-field">
        <span class="tee-side-label">Start Date</span>
        <input class="form-input" type="date" id="tee-startDate" value="${item?.startDate||''}">
      </div>
      <div class="tee-compact-field">
        <span class="tee-side-label">Due Date</span>
        <input class="form-input" type="date" id="tee-dueDate" value="${item?.dueDate||d}">
      </div>
    </div>`;

  if (type === 'event') return `
    <div class="tee-compact-field">
      <span class="tee-side-label">Date</span>
      <input class="form-input" type="date" id="tee-date" value="${item?.date||d}">
    </div>
    <div class="tee-compact-pair">
      <div class="tee-compact-field">
        <span class="tee-side-label">Start Time</span>
        <input class="form-input" type="time" id="tee-time" value="${item?.time||'09:00'}">
      </div>
      <div class="tee-compact-field">
        <span class="tee-side-label">End Time</span>
        <input class="form-input" type="time" id="tee-endTime" value="${item?.endTime||''}">
      </div>
    </div>`;

  return `
    <div class="tee-compact-pair">
      <div class="tee-compact-field">
        <span class="tee-side-label">Date</span>
        <input class="form-input" type="date" id="tee-date" value="${item?.date||d}">
      </div>
      <div class="tee-compact-field">
        <span class="tee-side-label">Time</span>
        <input class="form-input" type="time" id="tee-time" value="${item?.time||'09:00'}">
      </div>
    </div>`;
}
// Assignee dropdown pulls from STATE.people — the same People sheet used
// everywhere else in the app — instead of a separate hardcoded list, so
// there's exactly one place people live and exactly one save path.
const TEE_ADD_PERSON_VALUE   = '__add_new_assignee__';

function _escapeTEEAttr(value) {
  return String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/"/g,'&quot;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}

function _teeAssignmentPersonOptions(selected='') {
  const opts = (STATE.people||[]).map(p => p.name).map(person =>
    `<option value="${_escapeTEEAttr(person)}" ${person===selected?'selected':''}>${_escapeTEEAttr(person)}</option>`
  ).join('');
  return opts + `<option value="${TEE_ADD_PERSON_VALUE}">+ Add New Assignee…</option>`;
}

// Category is no longer picked per row — every row IS a category, generated
// automatically from STATE.categories (Config sheet — see _buildTEEAssignFields),
// so the category renders as a fixed label. `data-category` on the row carries
// the value for the read helpers below, replacing the old select's .value.
// `data-subtasks` carries this row's own per-category subtask progression
// (see computeAssignmentProgress above) as JSON, mutated in place by
// _teeAssignSubtaskToggle without a full modal re-render.
function _teeAssignRowHTML(a, idx) {
  const category = a?.category || '';
  const catObj = STATE.categories.find(c => c.code === category);
  const defaultPerson = catObj?.defaultAssignee || '';
  const assignedTo = a?.assignedTo || defaultPerson;
  const subtasks = a?.subtasks || [];

  return `
    <div class="tee-assign-row" data-idx="${idx}" data-category="${_escapeTEEAttr(category)}" data-subtasks="${_escapeTEEAttr(JSON.stringify(subtasks))}">
      <div class="tee-assign-field">
        <span class="form-label">Category</span>
        <div class="tee-assign-cat-value">${_escapeTEEAttr(category)}</div>
      </div>
      <div class="tee-assign-field">
        <label class="form-label">Assigned To</label>
        <select class="form-select tee-assign-person" onchange="_teeAssignPersonChange(this)">
          <option value="">— Select Member —</option>
          ${_teeAssignmentPersonOptions(assignedTo)}
        </select>
      </div>
      ${subtasks.length ? `<div class="tee-assign-progress-wrap">${_teeAssignSubtaskChecklistHTML(idx, subtasks)}</div>` : ''}
    </div>`;
}

function _teeAssignSubtaskChecklistHTML(idx, subtasks) {
  const progress = computeAssignmentProgress({subtasks});
  return `
    <div class="tee-assign-progress">
      <div class="tee-assign-progress-head" onclick="_teeAssignToggleChecklist(${idx})">
        <div class="tee-assign-progress-track"><div class="tee-assign-progress-fill" style="width:${progress.pct}%"></div></div>
        <span class="tee-assign-progress-label">${progress.done}/${progress.total} · ${progress.pct}%</span>
        <span class="tee-assign-progress-chevron" id="tee-assign-chevron-${idx}">›</span>
      </div>
      <div class="tee-assign-checklist" id="tee-assign-checklist-${idx}" style="display:none">
        ${subtasks.map((s, si) => `
          <label class="tee-assign-check-row">
            <input type="checkbox" ${s.done?'checked':''} onchange="_teeAssignSubtaskToggle(${idx}, ${si}, this.checked)">
            <span class="tee-assign-check-text${s.done?' tee-assign-check-done':''}" id="tee-assign-check-text-${idx}-${si}">${_escapeTEEAttr(s.text)}</span>
          </label>`).join('')}
      </div>
    </div>`;
}

function _teeAssignToggleChecklist(rowIdx) {
  const list = document.getElementById(`tee-assign-checklist-${rowIdx}`);
  const chevron = document.getElementById(`tee-assign-chevron-${rowIdx}`);
  if (!list) return;
  const isOpen = list.style.display !== 'none';
  list.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(90deg)';
}

// Toggles one step within one category's checklist. State lives in the
// row's data-subtasks JSON (not a shared array), so this only touches that
// row's own progress bar/label — every other category row is untouched.
function _teeAssignSubtaskToggle(rowIdx, subIdx, checked) {
  const row = document.querySelector(`#tee-assign-rows .tee-assign-row[data-idx="${rowIdx}"]`);
  if (!row) return;
  let subtasks = [];
  try { subtasks = JSON.parse(row.dataset.subtasks || '[]'); } catch(e) { subtasks = []; }
  if (!subtasks[subIdx]) return;

  subtasks[subIdx].done = checked;
  subtasks[subIdx].doneAt = checked ? fmtDate(new Date()) : null;
  // dataset assignment goes through the DOM property setter, not an HTML
  // parser — unlike the template literals elsewhere in this file, this
  // must NOT be HTML-escaped, or the stored JSON itself gets corrupted.
  row.dataset.subtasks = JSON.stringify(subtasks);

  const progress = computeAssignmentProgress({subtasks});
  const fillEl  = row.querySelector('.tee-assign-progress-fill');
  const labelEl = row.querySelector('.tee-assign-progress-label');
  if (fillEl)  fillEl.style.width = progress.pct + '%';
  if (labelEl) labelEl.textContent = `${progress.done}/${progress.total} · ${progress.pct}%`;
  document.getElementById(`tee-assign-check-text-${rowIdx}-${subIdx}`)?.classList.toggle('tee-assign-check-done', checked);
}

// "+ Add Category" (bottom of the Assign section): prompts for a new
// category code, persists it to the Config sheet, and appends its row
// immediately so the user can set an assignee without reopening the form.
async function _teeAddCategory() {
  const raw = prompt('New category code (e.g. AUD):');
  const code = (raw || '').trim();
  if (!code) return;
  if (STATE.categories.some(c => c.code === code)) { toast(`"${code}" is already a category`, 'error'); return; }

  const assigneeRaw = (prompt(`Default assignee for "${code}" (optional — can be set per record instead):`) || '').trim();
  const cat = {
    id: `CAT-${code.toUpperCase().replace(/\s+/g,'_')}`,
    code, name: code, defaultAssignee: assigneeRaw,
    active: true,
    sortOrder: (STATE.categories.length ? Math.max(...STATE.categories.map(c=>c.sortOrder||0)) : 0) + 1,
  };
  STATE.categories.push(cat);

  const container = document.getElementById('tee-assign-rows');
  if (container) {
    const idx = container.children.length;
    const itemType = document.getElementById('tee-current-type')?.value || 'ideal';
    container.insertAdjacentHTML('beforeend', _teeAssignRowHTML({category:code, assignedTo:cat.defaultAssignee, confirmed:false, subtasks: buildSubtasksFromTemplate(itemType)}, idx));
  }

  try {
    await saveConfigCategory(cat);
    toast(`"${code}" added to Categories ✓`, 'success');
  } catch(e) {
    toast(`"${code}" added — sheet save failed, will retry next sync`, 'info');
  }
}

// "+ Add New Assignee…" handler for the Assigned To select. Prompts for a
// name, persists it as a real Person (same savePerson() path the People
// tab uses), and selects it in place. Also updates this category's default
// assignee going forward — matches the original behavior: picking someone
// new for a category becomes that category's new default, not just a
// one-off override for this record.
async function _teeAssignPersonChange(selectEl) {
  if (selectEl.value !== TEE_ADD_PERSON_VALUE) return;

  const raw = prompt('New assignee name:');
  const name = (raw || '').trim();
  if (!name) { selectEl.value = ''; return; }

  if (!STATE.people.some(p => p.name === name)) {
    const newPerson = { id: uid('P'), name, role: '', color: '#285C70', photo: '' };
    STATE.people.push(newPerson);
    try { await savePerson(newPerson); } catch(e) { /* saved locally, will sync later */ }
  }

  const row = selectEl.closest('.tee-assign-row');
  const cat = row?.dataset.category || '';
  if (cat) {
    const catObj = STATE.categories.find(c => c.code === cat);
    if (catObj) { catObj.defaultAssignee = name; saveConfigCategory(catObj).catch(()=>{}); }
  }

  selectEl.innerHTML = `<option value="">— Select Member —</option>${_teeAssignmentPersonOptions(name)}`;
  selectEl.value = name;
  toast(`"${name}" added ✓`, 'success');
}

function _buildTEEAssignFields(type, item, assignees) {
  if (type === 'ideal' || type === 'temporary') {
    const existingAssignments = item
      ? STATE.assignments.filter(a => a.teeId === item.id)
      : [];
    const existingByCat = {};
    existingAssignments.forEach(a => { existingByCat[a.category] = a; });

    // Every active category shows up automatically, in Config sheet sort
    // order, each pre-filled with its default assignee (or the existing
    // saved assignee, if this item already has one for that category). A
    // category added via "+ Add Category" is pushed into STATE.categories
    // and saved to the Config sheet, so it appears here the same way on
    // the very next render — no separate row-adding step needed. Each row
    // also carries its own subtask progression, seeded fresh from the
    // template for a brand-new category assignment, or from what was
    // already saved for one that already exists on this item.
    const activeCats = (STATE.categories||[]).filter(c => c.active !== false);
    const rows = activeCats.map(cat => {
      const existing = existingByCat[cat.code];
      if (existing) {
        if (!existing.subtasks || !existing.subtasks.length) existing.subtasks = buildSubtasksFromTemplate(type);
        return existing;
      }
      return { category: cat.code, assignedTo: cat.defaultAssignee || '', confirmed: false, subtasks: buildSubtasksFromTemplate(type) };
    });

    // Confirm is now one control for the whole section rather than per row —
    // pre-check it only if every row was already confirmed (e.g. reopening
    // an item that was fully confirmed before).
    const allConfirmed = rows.length > 0 && rows.every(a => a.confirmed);

    return `
      <div class="form-group">
        <div class="tee-assign-header">
          <div>
            <span class="tee-section-header-inline">Assign</span>
            <div class="tee-field-help">Every category is listed with its default assignee — adjust anyone, then confirm the whole set below.</div>
          </div>
        </div>
        ${item && existingAssignments.length ? `<div style="margin-bottom:10px">${_categoryProgressStripHTML(item, {clickable:false})}</div>` : ''}
        <div id="tee-assign-rows">
          ${rows.map((a,i) => _teeAssignRowHTML(a,i)).join('')}
        </div>
        <label class="tee-assign-confirm-all">
          <input type="checkbox" id="tee-assign-confirm-all" ${allConfirmed?'checked':''}>
          <span>Confirm all assignments</span>
        </label>
        <div class="tee-add-assignment-footer">
          <button type="button" class="btn-ghost tee-add-assignment"
            onclick="_teeAddCategory()">+ Add Category</button>
        </div>
      </div>`;
  }

  if (type === 'task') {
    const parsedAssignees = parseAssignees(item?.assignees||'');
    const currentLead = parsedAssignees.lead || '';
    const allSelected = [currentLead, ...parsedAssignees.contributors].filter(Boolean);
    return `
      <div class="form-group">
        <input type="hidden" id="tee-lead" value="${currentLead}">
        ${buildPeoplePicker('tee-contributors', assignees, allSelected, { showAdd: true, leadMode: true, leadName: currentLead, assigneeLabel: 'Assignees' })}
      </div>`;
  }

  return `
    <div class="form-group">
      ${buildPeoplePicker('tee-contributors', assignees, splitAssigneeNames(item?.assignees), { showAdd: true, assigneeLabel: 'Participants' })}
    </div>`;
}
function _buildTEEContextFields(type, item) {
  // Ideal/Temporary have no Context zone content (Dept/Project don't apply
  // to the store-based workflow) — per the original workflow spec's
  // "remove Context and Execution" instruction. Category/Tags/Notes/Links
  // still render for these types (they're separate always-mounted fields
  // outside this zone, not part of the swap system) — left visible rather
  // than torn out, since hiding them would require restructuring how
  // switchTEEType swaps zones for every type, not just adding a branch here.
  if (type === 'ideal' || type === 'temporary') return '';
  // P4-R009b: Dept relocated here from Assign (was Task-only at the time).
  // P4-R010-fix2: side-by-side .tee-compact-pair (Row 1 of the Context
  // card), Dept before Project ("Row 1: DEPT | PROJECT").
  // P4-R011a: Context standardization (discovery basis P4-D021/P4-D021a) —
  // Dept + Project now render identically for Task, Event, and Entry, since
  // only one type branch is ever mounted at a time so id="tee-dept"/
  // id="tee-project" reuse across types is safe (same pattern already used
  // by every other tee-* field). Event previously returned '' here (empty
  // Context zone, relying on the `:empty` CSS rule to collapse it); Entry
  // previously rendered Project alone. Both now get the exact same pair
  // markup Task already had — no new CSS, no new IDs, no new helper.
  // saveTEEModal, quick-add capture/restore, and _teeRowToItem all already
  // address tee-dept/tee-project via getElementById/property name, which is
  // location- and type-agnostic (P4-D019 §E) — so this markup change is the
  // only render-side edit needed.
  return `
    <div class="tee-compact-pair">
      <div class="tee-compact-field">
        <span class="tee-side-label">Dept</span>
        <input class="form-input" id="tee-dept" value="${item?.dept||''}" placeholder="Team / dept">
      </div>
      <div class="tee-compact-field">
        <span class="tee-side-label">Project</span>
        <input class="form-input" id="tee-project" value="${item?.project||''}" placeholder="Project name">
      </div>
    </div>`;
}

/* ── UNIFIED TEE MODAL (Task / Event / Entry) ── */
// openTEEModal(itemId, forceType, defaultDate, defaultStatus)
