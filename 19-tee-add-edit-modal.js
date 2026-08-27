// ============================================================
// 19-tee-add-edit-modal.js
// Add/Edit item modal + tag chip entry
// (lines 9161-9539 of the original inline <script>)
// ============================================================

// ── TEE ADD / EDIT MODAL ─────────────────────────────────────
// Unified form for Task, Event, and Entry creation/editing.
// Shows pinned notes side panel when pinned notes exist.
function openTEEModal(itemId, forceType, defaultDate, defaultStatus) {
  const existing = itemId ? STATE.items.find(i => i.id === itemId) : null;
  const currentType = forceType || existing?.type || 'entry';
  _renderTEEModal(existing, currentType, defaultDate || '', defaultStatus || '');
}

function _readTEEAssignmentsFromDOM() {
  const rows = document.querySelectorAll('#tee-assign-rows .tee-assign-row');
  const confirmed = document.getElementById('tee-assign-confirm-all')?.checked || false;
  return Array.from(rows).map(row => {
    let subtasks = [];
    try { subtasks = JSON.parse(row.dataset.subtasks || '[]'); } catch(e) { subtasks = []; }
    return {
      category: row.dataset.category || '',
      assignedTo: row.querySelector('.tee-assign-person')?.value || '',
      confirmed, subtasks,
    };
  }).filter(a => a.category);
}

// switchTEEType: swaps only the type-specific fields in-place
// (no full re-render) with a 80ms opacity fade for smoothness.
// Called by the type-tab buttons — swaps only the type-specific fields in place, no full re-render
function switchTEEType(newType) {
  const itemId      = document.getElementById('tee-hidden-id')?.value || '';
  const defaultDate = document.getElementById('tee-hidden-date')?.value || '';
  const defStatus   = document.getElementById('tee-hidden-status')?.value || '';
  const existing    = itemId ? STATE.items.find(i => i.id === itemId) : null;

  // Capture whatever the user has already typed in shared fields
  // P4-R011a: dept/project added — Context standardization (discovery basis
  // P4-D021a) means Dept/Project now render for every type, so an in-
  // progress value typed on a new, unsaved item must survive a type switch
  // the same way category/tags/notes already do. Same fallback shape as
  // every other carried field: read the live DOM value if the field is
  // currently mounted, else fall back to the existing saved item's value.
  const currentType = document.getElementById('tee-current-type')?.value || existing?.type || 'task';
  const carried = {
    title:    document.getElementById('tee-title')?.value    || existing?.title    || '',
    desc:     document.getElementById('tee-desc')?.value     || existing?.desc     || '',
    category: document.getElementById('tee-category')?.value || existing?.category || '',
    tags:     document.getElementById('tee-tags')?.value     || (Array.isArray(existing?.tags) ? existing.tags.join(', ') : '') || '',
    notes:    document.getElementById('tee-notes')?.value    || existing?.notes    || '',
    dept:     document.getElementById('tee-dept')?.value     || existing?.dept     || '',
    project:  document.getElementById('tee-project')?.value  || existing?.project  || '',
    storeCode: document.getElementById('tee-store-code')?.value || existing?.storeCode || '',
    storeName: document.getElementById('tee-store-name')?.value || existing?.storeName || '',
    backupFolder: document.getElementById('tee-backup-folder')?.value || existing?.backupFolder || '',
    branchFolder: document.getElementById('tee-branch-folder')?.value || existing?.branchFolder || '',
    moduleUrl: document.getElementById('tee-module-url-fallback')?.value || existing?.moduleAllocUrl || '',
    moduleFileId: document.getElementById('tee-module-file-id')?.value || existing?.moduleAllocFileId || '',
    productListDeadline: document.getElementById('tee-product-list-deadline')?.value || existing?.productListDeadline || '',
    planogramDeadline: document.getElementById('tee-planogram-deadline')?.value || existing?.planogramDeadline || '',
    assignments: (currentType === 'ideal' || currentType === 'temporary')
      ? _readTEEAssignmentsFromDOM()
      : [],
    subtasks: (() => {
      // Switching between Ideal and Temporary preserves the live checklist.
      // Switching into Ideal/Temporary from Task/Entry starts the correct
      // workflow template instead of inheriting unrelated subtasks.
      if (newType === 'ideal' || newType === 'temporary') {
        if (currentType === 'ideal' || currentType === 'temporary') {
          const list = document.getElementById('tee-subtask-list');
          return list ? (_readSubtaskRowsFromDOM(list) || []) : (existing?.subtasks || []);
        }
        return buildSubtasksFromTemplate(newType);
      }
      const list = document.getElementById('tee-subtask-list');
      return list ? (_readSubtaskRowsFromDOM(list) || []) : (existing?.subtasks || []);
    })(),
  };

  // P4-R008b: Type is now a compact pill dropdown trigger (.tee-identity-pill),
  // not a row of .tee-type-btn tabs — update the hidden #tee-current-type
  // value-holder (read by quickAddPersonFromModal instead of the old
  // .tee-type-btn.active selector) and sync the trigger's icon/label in place.
  const typeHolder = document.getElementById('tee-current-type');
  if (typeHolder) typeHolder.value = newType;
  _syncTEETypeTrigger(newType);

  // Update the save button's type argument
  const saveBtn = document.querySelector('.modal .btn-primary[onclick^="saveTEEModal"]');
  if (saveBtn) saveBtn.setAttribute('onclick', `saveTEEModal('${itemId}','${newType}')`);

  // Update the header title to reflect the new type (P4-R003a). P4-R008b-fix1:
  // header text is now uppercase ("NEW TASK"/"EDIT TASK") and no longer shows
  // the TEE internal id/counter — itemId is still tracked internally (hidden
  // field, Save button argument) and unaffected, only this visible label changed.
  const headerTitleEl = document.getElementById('tee-modal-header-title');
  if (headerTitleEl) {
    const typeLabels = { task:'Task', entry:'Entry', ideal:'Ideal', temporary:'Temporary', event:'Event' };
    headerTitleEl.textContent = !itemId
      ? `NEW ${(typeLabels[newType] || 'ITEM').toUpperCase()}`
      : `EDIT ${(typeLabels[newType] || 'ITEM').toUpperCase()}`;
  }

  // Swap only the type-specific field zones (Identity/Details-bottom/Assign/Context
  // — P4-R003a; identity zone renamed/relocated out of Details in P4-R008a/b)
  const identityEl      = document.getElementById('tee-type-fields-identity');
  const detailsBottomEl = document.getElementById('tee-type-fields-details-bottom');
  const assignEl        = document.getElementById('tee-type-fields-assign');
  const contextEl       = document.getElementById('tee-type-fields-context');
  if (!identityEl || !detailsBottomEl || !assignEl || !contextEl) return;

  const d = defaultDate || (existing?.date || existing?.dueDate || fmtDate(TODAY));
  const assignees = STATE.people.map(p => p.name).filter(Boolean);

  const newIdentity      = _buildTEEIdentityFields(newType, existing, defStatus);
  const newDetailsBottom = _buildTEEDetailsBottom(newType, existing, d);
  const newAssign        = _buildTEEAssignFields(newType, existing, assignees);
  const newContext       = _buildTEEContextFields(newType, existing);

  // Smooth swap with a brief fade — same 80ms opacity-fade pattern as before,
  // now applied across all four zones so the type-switch transition still plays
  [identityEl, detailsBottomEl, assignEl, contextEl].forEach(el => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.12s';
  });
  setTimeout(() => {
    identityEl.innerHTML     = newIdentity;
    detailsBottomEl.innerHTML = newDetailsBottom;
    assignEl.innerHTML        = newAssign;
    contextEl.innerHTML       = newContext;
    [identityEl, detailsBottomEl, assignEl, contextEl].forEach(el => { el.style.opacity = '1'; });
    // P4-R009b-fix5: buildPeoplePicker (called synchronously above, inside
    // _buildTEEAssignFields) schedules its own setTimeout(0) initial regroup
    // at the moment it's called — well before this 80ms-delayed innerHTML
    // swap actually mounts the new #tee-contributors. That early regroup
    // finds nothing (or the old, about-to-be-replaced picker) and never
    // measures Browse All's real overflow for the newly switched type,
    // leaving it stuck at its default hidden state — this is why Browse All
    // disappeared after internal Task/Event/Entry switching even though it
    // appeared correctly on a fresh "Open New ___" (openModal() there
    // inserts synchronously, so the setTimeout(0) always finds the right
    // DOM already in place — only switchTEEType's deferred swap didn't).
    // Re-running the regroup here, now that the new picker is actually in
    // the DOM, fixes this without touching buildPeoplePicker's own timing at
    // all — _peoplePickerRegroup's existing disconnect/reconnect wrapper and
    // requestAnimationFrame-based overflow measurement apply exactly as they
    // already do everywhere else it's called from.
    // Restore Ideal/Temporary-specific fields that live inside swapped zones.
    if (newType === 'ideal' || newType === 'temporary') {
      const storeCodeEl = document.getElementById('tee-store-code');
      const storeNameEl = document.getElementById('tee-store-name');
      const backupEl = document.getElementById('tee-backup-folder');
      const branchEl = document.getElementById('tee-branch-folder');
      const moduleUrlEl = document.getElementById('tee-module-url-fallback');
      const moduleIdEl = document.getElementById('tee-module-file-id');
      const productDeadlineEl = document.getElementById('tee-product-list-deadline');
      const planogramDeadlineEl = document.getElementById('tee-planogram-deadline');
      const searchEl = document.getElementById('tee-store-search');

      if (storeCodeEl) storeCodeEl.value = carried.storeCode || '';
      if (storeNameEl) storeNameEl.value = carried.storeName || '';
      if (backupEl) backupEl.value = carried.backupFolder || '';
      if (branchEl) branchEl.value = carried.branchFolder || '';
      if (moduleUrlEl) moduleUrlEl.value = carried.moduleUrl || '';
      if (moduleIdEl) moduleIdEl.value = carried.moduleFileId || '';
      if (productDeadlineEl) productDeadlineEl.value = carried.productListDeadline || '';
      if (planogramDeadlineEl) planogramDeadlineEl.value = carried.planogramDeadline || '';
      if (searchEl) searchEl.value = carried.storeCode
        ? `${carried.storeCode} — ${carried.storeName || ''}` : '';

      const store = STATE.stores.find(st => st.code === carried.storeCode);
      const backupLink = document.getElementById('tee-backup-folder-link');
      const branchLink = document.getElementById('tee-branch-folder-link');
      if (backupLink) backupLink.innerHTML = _teeFolderLinkHTML('Open Backup Folder', carried.backupFolder || store?.backupFolder || '');
      if (branchLink) branchLink.innerHTML = _teeFolderLinkHTML('Open Branch Folder', carried.branchFolder || store?.branchFolder || '');

      const assignRows = document.getElementById('tee-assign-rows');
      if (assignRows && carried.assignments?.length) {
        assignRows.innerHTML = carried.assignments.map((a,i) => _teeAssignRowHTML(a,i)).join('');
        // The rows carry a shared `confirmed` flag (see _readTEEAssignmentsFromDOM)
        // — restore it onto the single section-level checkbox rather than per row.
        const confirmAllEl = document.getElementById('tee-assign-confirm-all');
        if (confirmAllEl) confirmAllEl.checked = !!carried.assignments[0]?.confirmed;
      }
    }

    _peoplePickerRegroup('tee-contributors');
    // P4-R011a: restore any in-progress Dept/Project value into the newly
    // mounted Context zone. Unlike title/desc/category/tags/notes (shared
    // fields that live outside the swapped zones and are never destroyed —
    // see the synchronous restore block below), #tee-dept/#tee-project are
    // rendered by _buildTEEContextFields *inside* contextEl, so they are
    // torn down and rebuilt by the innerHTML swap above. newContext was
    // already generated from `existing` (not from the live carried value),
    // so on a brand-new item it renders blank — restoring here, after the
    // new markup is actually in the DOM, is what makes an in-progress typed
    // value survive the switch, the same way it already does for the
    // shared fields.
    if (carried.dept)    { const el = document.getElementById('tee-dept');    if (el) el.value = carried.dept; }
    if (carried.project) { const el = document.getElementById('tee-project'); if (el) el.value = carried.project; }
  }, 80);

  // Restore carried values into shared fields
  if (carried.title)    { const el = document.getElementById('tee-title');    if (el) el.value = carried.title; }
  if (carried.desc)     { const el = document.getElementById('tee-desc');     if (el) el.value = carried.desc; }
  if (carried.category) { const el = document.getElementById('tee-category'); if (el) el.value = carried.category; }
  if (carried.tags)     { const el = document.getElementById('tee-tags');     if (el) el.value = carried.tags; }
  if (carried.notes)    { const el = document.getElementById('tee-notes');    if (el) el.value = carried.notes; }
}

// ── TEE TAGS CHIP-ENTRY (P4-R010) ──────────────────────────────────────────
// Discovery basis: P4-D020. Dedicated namespace only — deliberately not
// sharing .sticky-tag-chip/.sticky-tag-option (Sticky notes, window._sticky-
// ModalTags array-as-truth model) or .people-picker/.chip-option/.people-chip
// (Assignees/Participants). #tee-tags is the single save-time value-holder
// saveTEEModal already reads unchanged — it is DOM-authoritative (like every
// other TEE field), never a separate in-memory array. Suggestions are in-flow
// (no floating caret-position popup), sourced from the existing, unchanged
// getAllKnownTags(); chip colors from the existing, unchanged tagColor().
// Owner decisions (this checkpoint): strip one leading # before storage; do
// not force lowercase; no strict character sanitization; trim outer spaces;
// case-insensitive duplicate prevention within the open editor; no migration
// of previously-saved tag data.

// Normalize a typed/clicked tag label for storage: trim outer spaces, strip
// exactly one leading '#', trim again (handles "# work" -> "work"). Case is
// preserved — no lowercasing, no character stripping beyond the leading '#'.
function _teeTagsNormalize(raw) {
  let t = (raw || '').toString().trim();
  if (t.charAt(0) === '#') t = t.slice(1);
  return t.trim();
}

// Read the current selection from the value-holder (DOM-authoritative read,
// matching every other TEE field's save-time contract).
function _teeTagsGetSelected() {
  const el = document.getElementById('tee-tags');
  if (!el) return [];
  return el.value.split(',').map(s => s.trim()).filter(Boolean);
}

// Write the selection back to the value-holder as the existing comma-
// delimited format, then re-render the visible chip/suggestion UI.
function _teeTagsSetSelected(tags) {
  const el = document.getElementById('tee-tags');
  if (!el) return;
  el.value = tags.join(', ');
  _teeTagsRender();
}

// Add a tag: normalize, reject if blank, skip (but still refresh/clear) if a
// case-insensitive duplicate of an already-selected tag, otherwise append
// (typed/clicked case preserved) and persist via _teeTagsSetSelected.
function _teeTagsAdd(rawValue) {
  const tag = _teeTagsNormalize(rawValue);
  if (tag) {
    const current = _teeTagsGetSelected();
    const isDuplicate = current.some(t => t.toLowerCase() === tag.toLowerCase());
    if (!isDuplicate) {
      current.push(tag);
      _teeTagsSetSelected(current);
    }
  }
  const input = document.getElementById('tee-tags-input');
  if (input) { input.value = ''; input.focus(); }
  _teeTagsRender();
}

// Remove exactly the tag named on the chip the × button belongs to
// (case-insensitive match against the stored value).
function _teeTagsRemove(btnEl) {
  const chip = btnEl.closest('.tee-tag-chip');
  if (!chip) return;
  const tag = chip.dataset.tag;
  const current = _teeTagsGetSelected();
  const next = current.filter(t => t.toLowerCase() !== tag.toLowerCase());
  _teeTagsSetSelected(next);
  const input = document.getElementById('tee-tags-input');
  if (input) input.focus();
}

function _teeTagsInputKeydown(e) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  _teeTagsAdd(e.target.value);
}

// Re-render chips (from the value-holder) and in-flow suggestions (from the
// existing, unchanged getAllKnownTags(), filtered by the current typed query
// and excluding already-selected tags, capped to avoid a wall of pills).
// P4-R010-fix1: suggestions are no longer an always-visible row — they only
// render/show while the Tags input is focused AND has a non-empty typed
// query, as a small popover anchored under the input (.tee-tag-suggestions,
// position:absolute in CSS) — not Sticky's caret-position mirror popup, just
// a plain dropdown anchored to the input element's own box. Chips (the
// selected-tags row) remain always visible regardless of focus/typing state.
function _teeTagsRender() {
  const chipsEl = document.getElementById('tee-tags-chips');
  const suggEl  = document.getElementById('tee-tags-suggestions');
  const input   = document.getElementById('tee-tags-input');
  if (!chipsEl || !suggEl) return;

  const selected      = _teeTagsGetSelected();
  const selectedLower = selected.map(t => t.toLowerCase());

  chipsEl.innerHTML = selected.length ? selected.map(t => {
    const tc = tagColor(t);
    return `<span class="tee-tag-chip" data-tag="${t}" style="background:${tc.bg};color:${tc.text};border-color:${tc.border}">#${t}<button type="button" class="tee-tag-chip-remove" title="Remove ${t}" aria-label="Remove ${t}" onclick="event.stopPropagation();_teeTagsRemove(this)">&times;</button></span>`;
  }).join('') : '<span class="tee-tag-empty">No tags yet</span>';

  const rawInputValue = input?.value || '';
  const hasQuery  = rawInputValue.trim().length > 0;
  const isFocused = document.activeElement === input;

  if (!hasQuery || !isFocused) {
    suggEl.innerHTML = '';
    suggEl.classList.remove('tee-tag-suggestions-open');
    return;
  }

  const query = rawInputValue.trim().toLowerCase().replace(/^#/, '');
  const known = getAllKnownTags();
  const matches = known.filter(t => !selectedLower.includes(t) && t.includes(query)).slice(0, 8);
  const suggestionItems = matches.map(t =>
    `<span class="tee-tag-suggestion" data-tag="${t}" onclick="_teeTagsAdd(this.dataset.tag)">#${t}</span>`
  ).join('');

  const rawTyped      = _teeTagsNormalize(rawInputValue);
  const rawTypedLower = rawTyped.toLowerCase();
  const alreadyKnown    = rawTypedLower && known.includes(rawTypedLower);
  const alreadySelected = rawTypedLower && selectedLower.includes(rawTypedLower);
  const createOption = (rawTyped && !alreadyKnown && !alreadySelected)
    ? `<span class="tee-tag-suggestion tee-tag-suggestion-create" data-tag="${rawTyped}" onclick="_teeTagsAdd(this.dataset.tag)">+ Create #${rawTyped}</span>`
    : '';

  const html = suggestionItems + createOption;
  suggEl.innerHTML = html;
  suggEl.classList.toggle('tee-tag-suggestions-open', !!html);
}

// P4-R010-fix2: the Tags widget is now built as two separately-placed
// pieces (Context Row 2 pairs the input with Category; the chips render on
// their own full-width Row 3 below) — split so each can be positioned
// independently in _renderTEEModal while staying synced through the shared
// #tee-tags value-holder and #tee-tags-chips/#tee-tags-suggestions ids,
// which _teeTagsRender() already looks up by id regardless of where in the
// DOM tree they physically sit.

// Builds the "Tags" side-label compact-field: the hidden value-holder,
// the visible search input, and its suggestions popover. #tee-tags stays
// the value-holder saveTEEModal already reads unchanged. Deferred via
// setTimeout(0), matching buildPeoplePicker's own established technique, so
// the initial render runs after openModal() has actually inserted this
// markup (and the chips-row piece below) into the DOM. The suggestions
// popover (.tee-tag-suggestions) sits inside a position:relative wrapper
// (.tee-tag-input-wrap) so it can anchor directly under the input via plain
// CSS, with no caret-tracking JS. Blur hides it on a short delay (standard
// dismissible-dropdown technique — not Sticky-specific) so a click on a
// suggestion registers before it disappears; _teeTagsAdd() re-focuses the
// input afterward, so a genuine add correctly leaves the popover closed
// (input is now empty) rather than reopening it.
function _buildTeeTagsInputField(initialValue) {
  const initial = (initialValue || '').toString();
  setTimeout(() => _teeTagsRender(), 0);
  return `
    <div class="tee-compact-field tee-context-tags-field">
      <span class="tee-side-label">Tags</span>
      <div class="tee-tag-input-wrap">
        <input type="hidden" id="tee-tags" value="${initial.replace(/"/g,'&quot;')}">
        <input type="text" class="form-input tee-tag-input" id="tee-tags-input" placeholder="Type a tag, press Enter…" autocomplete="off"
          oninput="_teeTagsRender()" onkeydown="_teeTagsInputKeydown(event)"
          onfocus="_teeTagsRender()" onblur="setTimeout(_teeTagsRender, 200)">
        <div class="tee-tag-suggestions" id="tee-tags-suggestions"></div>
      </div>
    </div>`;
}

// Builds the full-width selected-tags chips row (Context Row 3). Populated
// entirely by _teeTagsRender() via #tee-tags-chips; starts empty here.
function _buildTeeTagsChipsRow() {
  return `<div class="tee-tag-chips" id="tee-tags-chips"></div>`;
}

