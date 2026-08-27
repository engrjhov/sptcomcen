// ============================================================
// 20-tee-links-editor.js
// Item links editor
// (lines 9540-10164 of the original inline <script>)
// ============================================================

// ── TEE Links Editor (P4-R012a) ─────────────────────────────────────────
// Discovery basis: P4-D022. Dedicated .tee-link-* namespace and dedicated
// helper functions only — deliberately not reusing .subtask-*/
// _addSubtaskToForm (different field, different data shape) or
// .dir-card-action-link (Directory/Folders' existing Open-link pattern,
// an unrelated feature this checkpoint does not touch). Mirrors the
// Subtasks *pattern* only (shared across all types, dynamic add/remove
// rows read directly from the DOM at save time, no hidden value-holder) —
// not its markup or functions. Rendered once, outside the four type-
// swapped zones (Identity/Details-bottom/Assign/Context), in the same spot
// the pre-existing .tee-links-spacer placeholder occupied (Context, after
// Notes, before Execution/Subtasks) — this is what lets switchTEEType skip
// any carry/restore logic for Links entirely, the same way it already
// does for Subtasks (see switchTEEType's own comment for the verification
// that this remains true).
//
// Open/Copy actions, dangerous-scheme handling, and TEE Detail display are
// explicitly out of scope for this checkpoint (P4-D022 stages those as
// P4-R012b) — no clickable links are rendered here, only plain editable
// Name/URL text inputs.
function _buildTEELinksEditor(links) {
  const rows = (links || []).map((l, idx) => `
    <div class="tee-link-row" id="tee-link-row-${idx}">
      <input class="form-input tee-link-name" id="tee-link-name-${idx}" value="${(l.name||'').replace(/"/g,'&quot;')}" placeholder="Name">
      <input class="form-input tee-link-url" id="tee-link-url-${idx}" value="${(l.url||'').replace(/"/g,'&quot;')}" placeholder="URL / Link / Path">
      <button type="button" class="tee-link-remove" onclick="document.getElementById('tee-link-row-${idx}').remove();_teeLinksCheckMax();" title="Remove">&times;</button>
    </div>`).join('');
  // Deferred to run after openModal() has actually inserted this markup —
  // same setTimeout(0) convention already used by _buildTeeTagsInputField/
  // buildPeoplePicker — so the max-10 check measures the real, mounted row
  // count (relevant when reopening an item that already has 10 links).
  setTimeout(() => _teeLinksCheckMax(), 0);
  return `
    <div class="form-group tee-links-editor">
      <label class="form-label">Links / URLs</label>
      <div id="tee-link-list">${rows}</div>
      <div style="display:flex;align-items:center;gap:8px">
        <button type="button" id="tee-link-add-btn" class="tee-link-add-btn" onclick="_addTeeLinkRow()">+ Add Link</button>
        <span class="tee-link-limit-note" id="tee-link-limit-note" style="display:none">Max 10 links</span>
      </div>
    </div>`;
}

// Appends one new, empty, directly-editable link row. Unlike Subtasks'
// separate staging-input-then-Enter/Add flow, Links has no staging input —
// "+ Add Link" appends the row itself, immediately editable, per the
// owner-specified interaction shape ("click + Add Link and a row appears").
function _addTeeLinkRow() {
  const list = document.getElementById('tee-link-list');
  if (!list) return;
  if (list.children.length >= 10) return; // max 10 — button is also disabled/hidden at this point
  const idx = list.children.length;
  const row = document.createElement('div');
  row.className = 'tee-link-row';
  row.id = `tee-link-row-${idx}`;
  const nameInp = document.createElement('input');
  nameInp.className = 'form-input tee-link-name';
  nameInp.id = `tee-link-name-${idx}`;
  nameInp.placeholder = 'Name';
  const urlInp = document.createElement('input');
  urlInp.className = 'form-input tee-link-url';
  urlInp.id = `tee-link-url-${idx}`;
  urlInp.placeholder = 'URL / Link / Path';
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'tee-link-remove';
  del.title = 'Remove';
  del.innerHTML = '&times;';
  del.onclick = () => { row.remove(); _teeLinksCheckMax(); };
  row.appendChild(nameInp);
  row.appendChild(urlInp);
  row.appendChild(del);
  list.appendChild(row);
  _teeLinksCheckMax();
  nameInp.focus();
}

// Enforces the max-10 link cap as a UI-level guard only (per P4-D022 §6/§7
// — a soft cap, not a save-time hard block): disables/hides "+ Add Link"
// once 10 rows exist, and shows a calm inline note while at the cap.
function _teeLinksCheckMax() {
  const list = document.getElementById('tee-link-list');
  const btn  = document.getElementById('tee-link-add-btn');
  const note = document.getElementById('tee-link-limit-note');
  if (!list || !btn) return;
  const atMax = list.children.length >= 10;
  btn.disabled = atMax;
  btn.style.display = atMax ? 'none' : '';
  if (note) note.style.display = atMax ? '' : 'none';
}

// Reads the current Links editor rows directly from the DOM into a plain
// { name, url } array — shared by saveTEEModal (final save read) and
// quickAddPersonFromModal (in-progress capture before the quick-add
// mini-form replaces the modal's DOM), so both use identical row-reading
// logic instead of duplicating it. Reads by class (.tee-link-name/
// .tee-link-url), not by reconstructing an id from iteration index — see
// saveTEEModal's own comment for why. Returns null (not []) when the
// editor isn't currently mounted, so callers can distinguish "no editor
// present" from "editor present but genuinely empty" and choose the
// correct fallback themselves. A row is kept only if it has a URL/Path;
// blank Name is allowed (Name is optional). Outer whitespace is trimmed.
function _getTeeLinksFromDOM() {
  const list = document.getElementById('tee-link-list');
  if (!list) return null;
  return Array.from(list.querySelectorAll('.tee-link-row')).map(row => {
    const name = (row.querySelector('.tee-link-name')?.value || '').trim();
    const url  = (row.querySelector('.tee-link-url')?.value  || '').trim();
    return { name, url };
  }).filter(l => l.url);
}

// _renderTEEModal: internal renderer — builds and opens the form
function _renderTEEModal(item, type, defaultDate, defaultStatus, carried) {
  const id      = item?.id || '';
  const isNew   = !item;
  const d       = defaultDate || (item?.date || item?.dueDate || fmtDate(TODAY));
  const assignees = STATE.people.map(p => p.name).filter(Boolean);

  // Pre-fill values: carried (from type switch) > item > defaults
  const val = (field, fallback='') => carried?.[field] ?? item?.[field] ?? fallback;

  // Type-aware header title — e.g. "NEW TASK" / "EDIT EVENT" (P4-R003a).
  // P4-R008b-fix1: uppercase, no visible TEE internal id/counter — `id` is
  // still tracked internally (hidden field, Save button argument) below,
  // just no longer interpolated into this visible header string.
  const typeLabels  = { task:'Task', ideal:'Ideal', temporary:'Temporary', event:'Event', entry:'Entry' };
  const headerTitle = isNew
    ? `NEW ${(typeLabels[type] || 'ITEM').toUpperCase()}`
    : `EDIT ${(typeLabels[type] || 'ITEM').toUpperCase()}`;

  // P4-R008b: Type trigger — compact pill dropdown (.tee-identity-pill), replacing
  // the former .tee-type-tabs large pill-tab row (P4-R003b). This button is a
  // static element — it is never destroyed/rebuilt by switchTEEType (unlike the
  // relocated Status/Priority pair below, whose onclick needs a fresh type-aware
  // argument baked in). Only its icon/label are updated in place, via
  // _syncTEETypeTrigger, on every type switch — see switchTEEType.
  const typeIcons = { task:'ti-clipboard-list', ideal:'ti-building-store', temporary:'ti-clock', event:'ti-calendar-event', entry:'ti-notes' };
  const typeTrigger = `
    <div class="tee-identity-group">
      <span class="tee-side-label">Type</span>
      <button type="button" id="tee-type-trigger" class="tee-identity-pill" onclick="openTEETypeDropdown(this, event)">
        <span class="tee-identity-pill-main">
          <i class="ti ${typeIcons[type] || 'ti-clipboard-list'}" id="tee-type-trigger-icon" style="font-size:13px"></i>
          <span id="tee-type-trigger-label" class="tee-identity-pill-label">${typeLabels[type] || 'Task'}</span>
        </span>
        <span class="tee-identity-pill-chevron">&#9660;</span>
      </button>
    </div>`;

  // Hidden state fields (carry id, defaultDate, defaultStatus across type switches).
  // P4-R008b: #tee-current-type is the new value-bearing "what type is this form
  // currently showing" holder — replaces reading .tee-type-btn.active textContent
  // (that markup no longer exists), and is kept in sync by switchTEEType on every
  // type change. quickAddPersonFromModal() reads this instead of the old selector.
  const hiddenFields = `
    <input type="hidden" id="tee-hidden-id"     value="${id}">
    <input type="hidden" id="tee-hidden-date"   value="${defaultDate||''}">
    <input type="hidden" id="tee-hidden-status" value="${defaultStatus||''}">
    <input type="hidden" id="tee-current-type"  value="${type}">`;

  // ── Type-specific field zones — built by shared helpers (P4-R004; identity
  // fields relocated out of Details and renamed in P4-R008a/P4-R008b, see below) ──
  const identityFields      = _buildTEEIdentityFields(type, item, defaultStatus);
  const detailsBottomFields = _buildTEEDetailsBottom(type, item, d);
  const assignFields        = _buildTEEAssignFields(type, item, assignees);
  const contextFields       = _buildTEEContextFields(type, item);

  // ── Shared fields (all types) — distributed into Details/Context/Execution sections ──
  // P4-R008b-fix1: Title's label is now a .tee-section-header (same class as
  // Details/Assign/Context/Execution) instead of a small .form-label, so it
  // reads as a top-level section header rather than a field label — visual
  // polish only, id="tee-title" and validation (saveTEEModal's title-required
  // check) unchanged. Placeholder is now generic "Title…" for all three types
  // (was type-specific "Task title…"/"Event name…"/"Entry title…").
  const titleField = `
    <div class="tee-section-header">Title</div>
    <div class="form-group">
      <input class="form-input" id="tee-title" value="${val('title')}" placeholder="Title…"></div>`;
  const descriptionField = `
    <div class="form-group"><label class="form-label">Description</label>
      <textarea class="form-textarea" id="tee-desc" placeholder="Optional details…">${val('desc')}</textarea></div>`;
  // P4-R010-fix2: Context section is back to the original compact side-label
  // field style. Row 1 (from #tee-type-fields-context, Task only): Dept |
  // Project. Row 2: Category | Tags-input, in that DOM order — the visual
  // desktop order is reversed to Tags-input | Category via
  // .tee-context-tags-field/.tee-context-category-field's `order` CSS (see
  // the CSS block), which is what lets Category naturally stack before the
  // Tags block on mobile with zero extra mobile-specific markup. Row 3: the
  // full-width tag chips row (categoryTagsChipsRow, below). Category's own
  // field, id, value, and placeholder are unchanged from fix1/r010.
  const categoryField = `
    <div class="tee-compact-field tee-context-category-field">
      <span class="tee-side-label">Category</span>
      <input class="form-input" id="tee-category" value="${val('category')}" placeholder="e.g. Meeting, Design…">
    </div>`;
  // P4-R010: Tags chip-entry. #tee-tags remains the single save-time value-holder
  // saveTEEModal already reads unchanged (now a hidden input; the chip UI is the
  // visible representation, same "hidden value-holder + visual control" pattern
  // already used for Status/Priority/Type/Lead). Initial value computed directly
  // here (not via the shared val() helper) to avoid val()'s pre-existing quirk of
  // returning the raw tags ARRAY (not a joined string) when carried is absent —
  // discovery basis: P4-D020 §A/§E/§M.
  const _teeTagsFallbackStr = Array.isArray(item?.tags) ? item.tags.join(', ') : (item?.tags || '');
  const _teeTagsInitialValue = carried?.tags ?? _teeTagsFallbackStr;
  const tagsInputField = _buildTeeTagsInputField(_teeTagsInitialValue);
  const tagsChipsRow   = _buildTeeTagsChipsRow();
  const notesField = `
    <div class="form-group"><label class="form-label">Notes</label>
      <textarea class="form-textarea" id="tee-notes" placeholder="Additional notes…">${val('notes')}</textarea></div>`;
  // P4-R012a: TEE Links (discovery basis P4-D022) — shared across all
  // types, same val()-with-empty-array-guard shape already used by
  // Subtasks below (carried?.[field] ?? item?.[field] would otherwise
  // treat a carried empty array as "present," masking a saved item's real
  // links — the explicit .length check avoids that).
  const linksField = _buildTEELinksEditor(val('links',[]).length ? val('links',[]) : (item?.links||[]));
  const _subtaskSeed = (() => {
    const carriedOrExisting = val('subtasks',[]).length ? val('subtasks',[]) : (item?.subtasks||[]);
    if (carriedOrExisting.length) return carriedOrExisting;
    if (!isNew) return carriedOrExisting;
    if (type === 'ideal' || type === 'temporary') return buildSubtasksFromTemplate(type);
    return carriedOrExisting;
  })();
  const subtasksField = (type === 'ideal' || type === 'temporary')
    ? `<div class="form-group">
        <label class="form-label">Subtasks</label>
        <div style="padding:10px 12px;border:1px solid var(--border);background:var(--glass);border-radius:10px;color:var(--text2);font-size:11px;line-height:1.5">
          Subtasks are tracked separately for each category in the <strong style="color:var(--text)">Assign</strong> section. The Kanban state is calculated automatically from those category-level checkpoints.
        </div>
      </div>`
    : `<div class="form-group">
      <label class="form-label">Subtasks</label>
      <div id="tee-subtask-list" class="subtask-list" style="margin-bottom:4px">
        ${_subtaskSeed.map((s,idx)=>`
          <div class="subtask-row" id="tee-st-row-${idx}">
            ${s.parentStep ? '<span style="opacity:0.5;padding-left:6px;font-size:11px">↳</span>' : ''}
            <div class="subtask-check${s.done?' checked':''}" onclick="this.classList.toggle('checked')"></div>
            <input class="subtask-edit-input" id="tee-st-text-${idx}" value="${s.text.replace(/"/g,'&quot;')}" placeholder="Subtask…">
            ${s.doneAt ? '<span class="subtask-ts subtask-ts-edit">' + _fmtSubtaskTs(s.doneAt) + '</span>' : ''}
            <input type="hidden" id="tee-st-donat-${idx}" value="${s.doneAt||''}">
            <input type="hidden" id="tee-st-step-${idx}" value="${s.stepOrder||''}">
            <input type="hidden" id="tee-st-parent-${idx}" value="${s.parentStep||''}">
            <input type="hidden" id="tee-st-required-${idx}" value="${s.required===false?'false':'true'}">
            <button class="subtask-del" onclick="document.getElementById('tee-st-row-${idx}').remove()" title="Remove">✕</button>
          </div>`).join('')}
      </div>
      <div class="subtask-add-row" style="display:flex;align-items:center;gap:6px">
        <input class="subtask-add-input" id="tee-subtask-new" placeholder="New subtask…"
          onkeydown="if(event.key==='Enter'){event.preventDefault();_addSubtaskToForm();}">
        <button type="button" style="flex-shrink:0;padding:4px 10px;border-radius:8px;border:1px solid var(--border2);background:var(--glass2);color:var(--text2);font-size:11px;font-family:var(--font);cursor:pointer;"
          onclick="_addSubtaskToForm()">Add</button>
      </div>
    </div>`;
  // ── Pinned notes side panel ──
  const pinnedForPanel = [...STATE.stickies]
    .filter(s => s.pinned)
    .sort((a,b) => {
      const na = parseInt((a.id||'').replace(/\D/g,''), 10) || 0;
      const nb = parseInt((b.id||'').replace(/\D/g,''), 10) || 0;
      return nb - na;
    });
  const hasPinned    = pinnedForPanel.length > 0;
  const isMobile     = window.innerWidth < 600;
  const panelId      = 'tee-pinned-panel';
  const panelBtnId   = 'tee-panel-toggle';
  const panelSlotId  = 'tee-pinned-panel-slot';
  const handleId     = 'tee-panel-handle';
  const handleArrowId = 'tee-panel-handle-arrow';

  // P4-R003c-v7: "more" is now conditional, reusing the EXISTING app-wide rule
  // found in buildPinnedNotesPanel() (Today/Overview widget, ~L5598): a note
  // only gets a "more" affordance when `s.text.length > 120`. That existing
  // rule is character-length-based (not a post-render scrollHeight/clientHeight
  // measurement), so there's no DOM-measurement step to reuse here — the
  // condition is evaluated directly while building this string, exactly like
  // the existing call site does. The TEE panel keeps its OWN existing toggle
  // mechanism (classList.toggle('expanded'), matching .tee-panel-note-text's
  // CSS) rather than calling the shared togglePinExpand() helper, because that
  // helper reads/writes el.style.webkitLineClamp directly (inline style) and
  // is not compatible with .tee-panel-note-text's class-based clamp toggle
  // without also rewriting this panel's CSS to match — out of scope for a
  // local "more" visibility fix, and not requested.
  const panelNotesHTML = pinnedForPanel.map((s, idx) => {
    const c = getStickyColor(s.colorIdx);
    const needsMore = s.text.length > 120;
    return `<div style="border-radius:8px;padding:8px 10px;margin-bottom:6px;font-size:11px;line-height:1.55;font-weight:500;background:${c.bg};color:${c.text}">
      <div class="tee-panel-note-text" id="tpn-${idx}">${s.text}</div>
      ${needsMore ? `<button class="today-pinned-expand" id="tpn-btn-${idx}" style="color:${c.text}"
        onclick="(function(){
          const t=document.getElementById('tpn-${idx}');
          const b=document.getElementById('tpn-btn-${idx}');
          const exp=t.classList.toggle('expanded');
          b.textContent=exp?'▲ less':'▼ more';
        })()">▼ more</button>` : ''}
    </div>`;
  }).join('');

  // P4-R003c-v7: Pinned Notes inside TEE Add/Edit is reference-only — pinned-note
  // creation stays in the Reminders/Sticky Notes flow (openPinnedNoteModal() is
  // unchanged there). The "+ Add" buttons (desktop header and the old bottom
  // button, both desktop and mobile) are removed; nothing else in this panel
  // creates notes anymore.
  const panelHTML = isMobile
    ? `<div id="${panelId}" class="tee-panel-mobile collapsed">
        <div class="tee-panel-mobile-header">
          <span style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--text2)"><i class="ti ti-pin" style="font-size:13px"></i>Pinned Notes${hasPinned ? ` (${pinnedForPanel.length})` : ''}</span>
          <button id="${panelBtnId}" class="tee-panel-collapse-btn" onclick="(function(){
            const p=document.getElementById('${panelId}');
            const b=document.getElementById('${panelBtnId}');
            const open=p.classList.toggle('collapsed');
            b.textContent=open?'▾':'▴';
          })()">▾</button>
        </div>
        <div class="tee-panel-mobile-body">
          ${hasPinned ? panelNotesHTML : '<div style="font-size:11px;color:var(--muted);text-align:center;padding:10px 0">No pinned notes yet. Pin a note from the Reminders tab.</div>'}
        </div>
      </div>`
    : `<div id="${panelSlotId}" class="tee-panel-side-slot hidden">
        <div id="${panelId}" class="tee-panel-side">
          <div class="tee-panel-side-header">
            <span style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--text2)"><i class="ti ti-pin" style="font-size:14px"></i>Pinned Notes</span>
          </div>
          <div class="tee-panel-side-body">
            ${hasPinned ? panelNotesHTML : `<div style="text-align:center;padding:20px 8px;color:var(--muted);font-size:11px;line-height:1.6">No pinned notes yet.<br>Pin a note from the<br>Reminders tab.</div>`}
          </div>
        </div>
      </div>`;

  // P4-R003c-v7: desktop-only vertical edge handle — pin icon, vertical "Pinned
  // Notes (N)" label (count merged into the text, no separate floating badge),
  // and a directional solid-triangle arrow (▶ closed / ◀ open — plain >/< are
  // no longer used), all inside one pill (CSS: .tee-panel-handle-slot /
  // .tee-panel-handle). Toggle logic targets ${panelSlotId} and never touches
  // .tee-modal-with-panel's class list (no .panel-hidden — see CSS comment
  // above). Mobile is unchanged apart from starting collapsed — its own
  // self-contained .tee-panel-mobile-header collapse button (panelBtnId)
  // still works exactly as before.
  const desktopPanelHandle = isMobile ? '' : `<div class="tee-panel-handle-slot">
      <button id="${handleId}" class="tee-panel-handle" title="Pinned Notes — click to open/close"
        onclick="(function(){
          const s=document.getElementById('${panelSlotId}');const b=document.getElementById('${handleId}');const a=document.getElementById('${handleArrowId}');const hidden=s.classList.toggle('hidden');b.classList.toggle('active',!hidden);if(a)a.textContent=hidden?'▶':'◀';
        })()">
        <i class="ti ti-pin" style="font-size:14px"></i><span class="tee-panel-handle-label">Pinned Notes${hasPinned ? ` (${pinnedForPanel.length})` : ''}</span><span class="tee-panel-handle-arrow" id="${handleArrowId}">▶</span>
      </button>
    </div>`;

  // P4-R003c-v5: header (title + close) is now a sibling of the two-column body,
  // both wrapped in .tee-modal-shell — NOT nested inside .tee-modal-form. This
  // means opening/closing the pinned panel (which only affects the body row)
  // can never visually shift or feel "owned by" the form column. The body
  // wrapper class differs by viewport: desktop uses .tee-modal-with-panel (the
  // flex row owning the handle/panel slots), mobile uses .tee-modal-body-mobile
  // (a single scrollable region holding the form + inline accordion together,
  // since mobile pinned notes intentionally scroll as part of the body).
  openModal(`
    <div class="tee-modal-shell">
      <div class="tee-modal-header modal-title">
        <span id="tee-modal-header-title">${headerTitle}</span>
        <div style="display:flex;align-items:center;gap:6px;margin-left:auto">
          ${_modalCloseBtn()}
        </div>
      </div>
      <div class="${!isMobile ? 'tee-modal-with-panel' : 'tee-modal-body-mobile'}">
        <div class="tee-modal-form">
          <div class="tee-modal-form-scroll">
            ${hiddenFields}
            ${titleField}
            <div class="tee-identity-row">
              ${typeTrigger}
              <div id="tee-type-fields-identity" class="tee-identity-subrow">${identityFields}</div>
            </div>

            <div class="tee-section-header">Details</div>
            <div class="tee-field-group">
              ${descriptionField}
              <div id="tee-type-fields-details-bottom">${detailsBottomFields}</div>
            </div>

            <div class="tee-section-header">Assign</div>
            <div class="tee-field-group">
              <div id="tee-type-fields-assign">${assignFields}</div>
            </div>

            ${(type === 'ideal' || type === 'temporary') ? '' : `
            <div class="tee-section-header">Context</div>
            <div class="tee-field-group">
              <div id="tee-type-fields-context">${contextFields}</div>
              <div class="tee-compact-pair">
                ${categoryField}
                ${tagsInputField}
              </div>
              ${tagsChipsRow}
              ${notesField}
              ${linksField}
            </div>`}

            <div class="tee-section-header">${(type === 'ideal' || type === 'temporary') ? 'Subtasks' : 'Execution'}</div>
            <div class="tee-field-group">
              ${subtasksField}
            </div>
          </div>

          <div class="tee-modal-footer">
            <div>${!isNew ? `<button class="btn-danger" onclick="deleteTEEItem('${id}')">Delete</button>` : ''}</div>
            <div style="display:flex;gap:8px">
              <button class="btn-ghost" onclick="popNav()">Cancel</button>
              <button class="btn-primary" onclick="saveTEEModal('${id}','${type}')">Save</button>
            </div>
          </div>
        </div>
        ${desktopPanelHandle}
        ${panelHTML}
      </div>
    </div>`);
}

// saveTEEModal: reads form fields, builds item object, saves to
// STATE.items and triggers a debounced sheet sync.
function saveTEEModal(existingId, type) {
  const title = document.getElementById('tee-title')?.value.trim();
  if (!title) { toast('Title is required','error'); return; }
  const g = id => document.getElementById(id)?.value || '';
  const existing = existingId ? STATE.items.find(i => i.id === existingId) : null;

  if ((type === 'ideal' || type === 'temporary') && window._teeModuleUploading) {
    toast('Please wait for the Module Allocation PDF upload to finish.', 'error');
    return;
  }

  // Start with a clean slate — all fields empty, then populate only what's relevant
  const base = {
    id:          existingId || nextTEEId(),
    type,
    title,
    desc:        g('tee-desc'),
    category:    g('tee-category'),
    tags:        g('tee-tags').split(',').map(s=>s.trim()).filter(Boolean),
    notes:       g('tee-notes'),
    // Type-exclusive fields default to empty/zero
    date:        '', dueDate: '', startDate: '', time: '', endTime: '',
    productListDeadline: '', planogramDeadline: '',
    status:      '', priority: 'Medium', project: '', dept: '',
    progress: 0, color: '', recurrence: 'none', assignees: '',
    storeCode: '', storeName: '', backupFolder: '', branchFolder: '',
    moduleAllocFileId: '', moduleAllocUrl: '',
    subtasks: (() => {
      const list = document.getElementById('tee-subtask-list');
      if (!list) return existingId ? (STATE.items.find(i=>i.id===existingId)?.subtasks||[]) : [];
      return _readSubtaskRowsFromDOM(list);
    })(),
    // P4-R012a: TEE Links (discovery basis P4-D022) — shared across all
    // types, read directly from the DOM at save time via the shared
    // _getTeeLinksFromDOM() helper (no hidden value-holder), same overall
    // shape as Subtasks just above. A filled Name with a blank URL is
    // dropped rather than blocking Save (see _getTeeLinksFromDOM). The
    // max-10 cap is a soft UI-level guard (see _teeLinksCheckMax) — this
    // .slice(0,10) is only a defensive backstop in case more than 10 rows
    // somehow exist in the DOM, and never touches or discards any
    // already-saved sheet data.
    links: (() => {
      const rows = _getTeeLinksFromDOM();
      if (rows === null) return existingId ? (STATE.items.find(i=>i.id===existingId)?.links||[]) : [];
      return rows.slice(0, 10);
    })(),
  };

  if (type === 'task') {
    const _stRaw = g('tee-status') || 'Backlog';
    if (_stRaw === 'Completed') {
      if (!existing || parseStatus(existing.status).state !== 'Completed') {
        const _sn=new Date(); const _sts=_sn.getFullYear()+'-'+String(_sn.getMonth()+1).padStart(2,'0')+'-'+String(_sn.getDate()).padStart(2,'0')+' '+String(_sn.getHours()).padStart(2,'0')+':'+String(_sn.getMinutes()).padStart(2,'0');
        base.status = 'Completed|'+_sts;
      } else { base.status = existing.status; }
    } else { base.status = _stRaw; }
    base.priority  = g('tee-priority')  || 'Medium';
    // Build assignees string from lead + contributors chip selections
    const lead = g('tee-lead') || '';
    const allSelectedPeople = getChipSelections('tee-contributors');
    // P4-R009c: block Save only when people are selected but no Lead has
    // been chosen (owner decision 3) — a Task with zero selected people may
    // still save with no Lead (owner decision 2), and no one is ever
    // auto-promoted to Lead on Save (owner decision 1). This check must run
    // before any STATE.items mutation below, which it does — the earliest
    // STATE.items write in this function happens after the entire type
    // branch, so returning here leaves STATE untouched, same as the
    // existing title-required check at the top of this function.
    if (allSelectedPeople.length > 0 && !lead) {
      toast('Choose a Lead for this task, or remove all selected people.', 'error');
      return;
    }
    // allSelectedPeople already includes the Lead's own name whenever a
    // Lead is set (Selected is the single source of truth for everyone
    // involved, owner decision 4/13 — see _buildTEEAssignFields) — this
    // filter is what keeps buildAssigneesStr's slot-0 Lead from also being
    // duplicated in the rest of the list (owner decision / item E), exactly
    // the same safety net this line already provided before P4-R009c.
    const contributors = allSelectedPeople.filter(v => v !== lead);
    base.assignees = buildAssigneesStr(lead, contributors);
    base.dept      = g('tee-dept')      || '';
    base.startDate = g('tee-startDate') || '';
    base.dueDate   = g('tee-dueDate')   || '';
    base.project   = g('tee-project')   || '';
  } else if (type === 'ideal' || type === 'temporary') {
    const storeCode = document.getElementById('tee-store-code')?.value || '';
    const storeName = document.getElementById('tee-store-name')?.value || '';
    if (!storeCode || !storeName) { toast('Select a store from the search results', 'error'); return; }

    const moduleUrl = document.getElementById('tee-module-url-fallback')?.value.trim() || '';
    const moduleFileId = document.getElementById('tee-module-file-id')?.value.trim() || '';
    if (!moduleUrl) { toast('Upload the Module Allocation PDF first', 'error'); return; }

    const allAssignmentsConfirmed = document.getElementById('tee-assign-confirm-all')?.checked || false;
    const assignRows = Array.from(document.querySelectorAll('#tee-assign-rows .tee-assign-row')).map(row => {
      let subtasks = [];
      try { subtasks = JSON.parse(row.dataset.subtasks || '[]'); } catch(e) { subtasks = []; }
      return {
        category:   row.dataset.category || '',
        assignedTo: row.querySelector('.tee-assign-person')?.value || '',
        confirmed:  allAssignmentsConfirmed,
        subtasks,
      };
    }).filter(a => a.category);

    if (!assignRows.length)                  { toast('At least one category assignment is required', 'error'); return; }
    if (assignRows.some(a => !a.assignedTo)) { toast('Every category needs an assignee', 'error'); return; }
    if (!allAssignmentsConfirmed)            { toast('Confirm all assignments before saving', 'error'); return; }

    base.storeCode      = storeCode;
    base.storeName      = storeName;
    base.backupFolder   = g('tee-backup-folder');
    base.branchFolder   = g('tee-branch-folder');
    base.moduleAllocUrl = moduleUrl;
    base.moduleAllocFileId = moduleFileId;
    base.productListDeadline = document.getElementById('tee-product-list-deadline')?.value || '';
    base.planogramDeadline   = document.getElementById('tee-planogram-deadline')?.value || '';
    base.priority       = g('tee-priority') || 'Medium';
    base.assignees       = assignRows.map(a => a.assignedTo).join('|');
    base.createdDate     = existing?.createdDate || fmtDate(new Date());
    // base.subtasks was already set above from _readSubtaskRowsFromDOM(); if the
    // list somehow ended up empty (e.g. user deleted every row), regenerate
    // from the template rather than silently saving a record with none.
    base.subtasks = aggregateWorkflowSubtasks(type, assignRows);
    recalcIdealTemporaryStatus(base, assignRows);
    base._pendingAssignments = assignRows;
  } else if (type === 'event') {
    base.date      = g('tee-date')      || '';
    base.time      = g('tee-time')      || '';
    base.endTime   = g('tee-endTime')   || '';
    // P4-R011b: Event Color removed from Add/Edit (discovery basis
    // P4-D021a) — #tee-color no longer exists in the DOM, so there is
    // nothing to read here. base.color keeps the empty-string default
    // already set at the top of this function (the `base` object literal);
    // no replacement default color is introduced. saveTEE/saveArchiveItem/
    // _teeRowToItem's Color column handling is intentionally left
    // untouched — existing saved Color values are preserved, not migrated
    // or deleted; full column retirement is out of scope for this
    // checkpoint.
    base.priority  = g('tee-priority')  || 'Medium';
    // P4-R011a: Context standardization — Event now renders tee-dept/
    // tee-project (see _buildTEEContextFields), so read them here the same
    // way Task already does. No Apps Script/schema change — the Department/
    // Project columns already exist and saveTEE/saveArchiveItem already
    // write them for other types.
    base.dept      = g('tee-dept')      || '';
    base.project   = g('tee-project')   || '';
    base.assignees = getChipSelections('tee-contributors').join('|');
    const _evRaw = g('tee-status') || 'Open';
    if (_evRaw === 'Done') {
      if (!existing || parseStatus(existing.status).state !== 'Done') {
        const _evn=new Date(), _evts=_evn.getFullYear()+'-'+String(_evn.getMonth()+1).padStart(2,'0')+'-'+String(_evn.getDate()).padStart(2,'0')+' '+String(_evn.getHours()).padStart(2,'0')+':'+String(_evn.getMinutes()).padStart(2,'0');
        base.status = 'Done|'+_evts;
      } else { base.status = existing.status; }
    } else { base.status = _evRaw; }
  } else { // entry
    base.date      = g('tee-date')      || '';
    base.time      = g('tee-time')      || '';
    base.priority  = g('tee-priority')  || 'Medium';
    base.project   = g('tee-project')   || '';
    // P4-R011a: Context standardization — Entry now also renders tee-dept
    // alongside its existing tee-project (see _buildTEEContextFields);
    // read it the same way Task already does.
    base.dept      = g('tee-dept')      || '';
    base.assignees = getChipSelections('tee-contributors').join('|');
    const _enRaw = g('tee-status') || 'Open';
    if (_enRaw === 'Done') {
      if (!existing || parseStatus(existing.status).state !== 'Done') {
        const _enn=new Date(); const _ents=_enn.getFullYear()+'-'+String(_enn.getMonth()+1).padStart(2,'0')+'-'+String(_enn.getDate()).padStart(2,'0')+' '+String(_enn.getHours()).padStart(2,'0')+':'+String(_enn.getMinutes()).padStart(2,'0');
        base.status = 'Done|'+_ents;
      } else { base.status = existing.status; }
    } else { base.status = _enRaw; }
  }

  const pendingAssignments = base._pendingAssignments;
  delete base._pendingAssignments;

  if (existingId) {
    STATE.items = STATE.items.map(i => i.id === existingId ? base : i);
  } else {
    STATE.items.push(base);
  }
  clearNav();
  renderAll();
  saveTEE(base)
    .then(async () => {
      if (pendingAssignments) {
        const stale = STATE.assignments.filter(a => a.teeId === base.id);
        await Promise.all(stale.map(a => deleteAssignment(a.id)));
        const fresh = pendingAssignments.map(a => {
          const cat = STATE.categories.find(c => c.code === a.category) || {};
          return {
            id: uid('ASG'), teeId: base.id, category: a.category,
            defaultAssignee: cat.defaultAssignee || '', assignedTo: a.assignedTo,
            source: a.assignedTo === cat.defaultAssignee ? 'default' : 'manual',
            confirmed: true, confirmedBy: '', confirmedDate: fmtDate(new Date()),
            subtasks: a.subtasks || [],
          };
        });
        STATE.assignments = [...STATE.assignments.filter(a=>a.teeId!==base.id), ...fresh];
        await Promise.all(fresh.map(saveAssignment));
      }
      toast(existingId ? 'Updated' : 'Created'); triggerSync();
    })
    .catch(() => toast('Saved locally — sheet will sync next time', 'info'));
}

