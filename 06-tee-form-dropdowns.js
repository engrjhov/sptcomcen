// ============================================================
// 06-tee-form-dropdowns.js
// Add/Edit item status, priority and type dropdowns
// (lines 4051-4348 of the original inline <script>)
// ============================================================

// ── TEE ADD/EDIT STATUS DROPDOWN (P4-R006) ──────────────────
// Add/Edit-only sibling of openStatusDropdown()/changeItemStatus() above. Unlike
// that pair, this does NOT touch STATE.items and does NOT call saveTEE() — it only
// updates the open (unsaved) form's #tee-status value-holder and the visible closed
// trigger. The change is persisted only when the user clicks Save, which reads
// document.getElementById('tee-status')?.value exactly as before (saveTEEModal
// unchanged). Named/top-level (not per-call closures) so the outside-click/Escape
// listeners can be added and removed by reference without leaking duplicates.
function openTEEStatusDropdown(type, anchorEl, event) {
  event.stopPropagation();
  _closeTEEStatusDropdown();
  // P4-R007-fix1: mutually close the Add/Edit Priority dropdown so at most one
  // Add/Edit dropdown popover is ever open at a time. Guarded because this file
  // (Status) is defined before Priority's helpers below it, and to stay safe if
  // either helper set is ever removed independently.
  if (typeof _closeTEEPriorityDropdown === 'function') _closeTEEPriorityDropdown();
  // P4-R008b: also close the new Add/Edit Type dropdown, same guarded pattern.
  if (typeof _closeTEETypeDropdown === 'function') _closeTEETypeDropdown();
  const rect = anchorEl.getBoundingClientRect();
  const dropdown = document.createElement('div');
  dropdown.id = 'tee-status-dropdown';
  dropdown.className = 'status-dropdown';
  const isTaskType = type === 'task';
  const optCols = isTaskType
    ? KANBAN_COLS
    : [ { id:'Open', label:'Open' }, { id:'Done', label:'Done' } ];
  // Defensive normalize: the hidden value should already be valid for `type` (via
  // _buildTEEIdentityFields), but this guards against opening the dropdown a beat
  // before a type-switch re-render has settled.
  const currentVal = _normalizeTEEStatusForType(type, document.getElementById('tee-status')?.value || (isTaskType ? 'To Do' : 'Open'));
  dropdown.innerHTML = optCols.map(col => {
    const dotColor  = getStatusColor(col.id);
    const isCurrent = currentVal === col.id;
    return `<button type="button" class="status-dropdown-item${isCurrent?' current':''}"
      onclick="selectTEEStatusOption('${col.id}')">
      <span class="status-dot" style="background:${dotColor}"></span>
      ${col.label}
    </button>`;
  }).join('');
  document.body.appendChild(dropdown);
  const dRect = dropdown.getBoundingClientRect();
  let top  = rect.bottom + 6;
  let left = rect.left;
  if (left + dRect.width > window.innerWidth - 8)  left = window.innerWidth - dRect.width - 8;
  if (top  + dRect.height > window.innerHeight - 8) top  = rect.top - dRect.height - 6;
  dropdown.style.top  = `${top}px`;
  dropdown.style.left = `${left}px`;
  setTimeout(() => {
    document.addEventListener('click', _teeStatusDropdownOutsideClick);
    document.addEventListener('keydown', _teeStatusDropdownEscape, true);
  }, 0);
}
function _closeTEEStatusDropdown() {
  document.getElementById('tee-status-dropdown')?.remove();
  document.removeEventListener('click', _teeStatusDropdownOutsideClick);
  document.removeEventListener('keydown', _teeStatusDropdownEscape, true);
}
function _teeStatusDropdownOutsideClick() { _closeTEEStatusDropdown(); }
function _teeStatusDropdownEscape(e) {
  // Capture-phase + stopPropagation so this fires and closes the dropdown before
  // the modal's own bubble-phase Escape handler (document._modalEscHandler) runs —
  // the modal's Escape-closes-modal behavior is untouched when no dropdown is open.
  if (e.key === 'Escape') { e.stopPropagation(); _closeTEEStatusDropdown(); }
}
// selectTEEStatusOption: updates the local #tee-status value + visible trigger only.
// No STATE mutation, no saveTEE(), no renderAll(), no clearNav()/popNav() — the
// bare identifier (never a composite "state|timestamp" string) is all that's
// written, matching exactly what saveTEEModal's terminal-timestamp branches expect.
function selectTEEStatusOption(value) {
  const holder = document.getElementById('tee-status');
  if (holder) holder.value = value;
  _syncTEEStatusTrigger(value);
  _closeTEEStatusDropdown();
}
// _syncTEEStatusTrigger: updates only the visible closed-state trigger (dot color +
// label) to match a given bare status value. Split out so the quick-add-person
// carry-over restore below (which sets #tee-status.value directly, bypassing
// selectTEEStatusOption) can keep the visible trigger in sync too — otherwise the
// hidden value-holder and the visible control would silently disagree after a
// quick-add-person round trip, even though saveTEEModal would still read the
// correct (hidden) value.
function _syncTEEStatusTrigger(value) {
  const dot   = document.getElementById('tee-status-trigger-dot');
  const label = document.getElementById('tee-status-trigger-label');
  if (dot)   dot.style.background = getStatusColor(value);
  if (label) label.textContent    = value;
}

// ── TEE Add/Edit Status validity/normalization (P4-R006-fix1) ──────────
// A status value that is valid for one TEE type is not necessarily valid for
// another (e.g. Entry's 'Open' is not a Kanban column; Task's 'Completed' is not
// Open/Done). Without normalizing, a status value can cross a type switch (or a
// quick-add-person round trip) unchanged and get saved as an invalid value for the
// new type. These two helpers are the single source of truth for "what statuses
// does this type support" and "what should an out-of-range value fall back to" —
// used by _buildTEEIdentityFields (render/type-switch path), openTEEStatusDropdown
// (defensive current-value fallback), and the quick-add-person restore paths below.
function _validTEEStatusesForType(type) {
  return type === 'task' ? KANBAN_COLS.map(c => c.id) : ['Open', 'Done'];
}
function _normalizeTEEStatusForType(type, status) {
  const valid = _validTEEStatusesForType(type);
  if (valid.includes(status)) return status;
  return type === 'task' ? 'To Do' : 'Open';
}

// ── TEE ADD/EDIT PRIORITY DROPDOWN (P4-R007) ──────────────────
// Add/Edit-only sibling of openPriorityDropdown()/changeItemPriority() above.
// Unlike that pair, this does NOT touch STATE.items and does NOT call saveTEE() —
// it only updates the open (unsaved) form's #tee-priority value-holder and the
// visible closed trigger. The change is persisted only when the user clicks Save,
// which reads document.getElementById('tee-priority')?.value exactly as before
// (saveTEEModal unchanged). Priority has a fixed 4-option set with no per-type
// variation (unlike Status), so there is no normalization helper needed here.
function openTEEPriorityDropdown(anchorEl, event) {
  event.stopPropagation();
  _closeTEEPriorityDropdown();
  // P4-R007-fix1: mutually close the Add/Edit Status dropdown so at most one
  // Add/Edit dropdown popover is ever open at a time. Guarded, mirroring the
  // symmetric guard added to openTEEStatusDropdown above.
  if (typeof _closeTEEStatusDropdown === 'function') _closeTEEStatusDropdown();
  // P4-R008b: also close the new Add/Edit Type dropdown, same guarded pattern.
  if (typeof _closeTEETypeDropdown === 'function') _closeTEETypeDropdown();
  const rect = anchorEl.getBoundingClientRect();
  const dropdown = document.createElement('div');
  dropdown.id = 'tee-priority-dropdown';
  dropdown.className = 'status-dropdown';
  const priorities = ['Critical', 'High', 'Medium', 'Low'];
  const currentVal = document.getElementById('tee-priority')?.value || 'Medium';
  dropdown.innerHTML = priorities.map(p => {
    const pr = getPri(p);
    const isCurrent = currentVal === p;
    return `<button type="button" class="status-dropdown-item${isCurrent?' current':''}"
      onclick="selectTEEPriorityOption('${p}')">
      <span class="status-dot" style="background:${pr.bar}"></span>
      ${p}
    </button>`;
  }).join('');
  document.body.appendChild(dropdown);
  const dRect = dropdown.getBoundingClientRect();
  let top  = rect.bottom + 6;
  let left = rect.left;
  if (left + dRect.width > window.innerWidth - 8)  left = window.innerWidth - dRect.width - 8;
  if (top  + dRect.height > window.innerHeight - 8) top  = rect.top - dRect.height - 6;
  dropdown.style.top  = `${top}px`;
  dropdown.style.left = `${left}px`;
  setTimeout(() => {
    document.addEventListener('click', _teePriorityDropdownOutsideClick);
    document.addEventListener('keydown', _teePriorityDropdownEscape, true);
  }, 0);
}
function _closeTEEPriorityDropdown() {
  document.getElementById('tee-priority-dropdown')?.remove();
  document.removeEventListener('click', _teePriorityDropdownOutsideClick);
  document.removeEventListener('keydown', _teePriorityDropdownEscape, true);
}
function _teePriorityDropdownOutsideClick() { _closeTEEPriorityDropdown(); }
function _teePriorityDropdownEscape(e) {
  // Capture-phase + stopPropagation, mirroring _teeStatusDropdownEscape above, so
  // this fires and closes the dropdown before the modal's own bubble-phase Escape
  // handler runs — the modal's Escape-closes-modal behavior is untouched when no
  // Priority dropdown is open.
  if (e.key === 'Escape') { e.stopPropagation(); _closeTEEPriorityDropdown(); }
}
// selectTEEPriorityOption: updates the local #tee-priority value + visible trigger
// only. No STATE mutation, no saveTEE(), no renderAll(), no clearNav()/popNav() —
// the bare identifier (Critical/High/Medium/Low) is all that's written.
function selectTEEPriorityOption(value) {
  const holder = document.getElementById('tee-priority');
  if (holder) holder.value = value;
  _syncTEEPriorityTrigger(value);
  _closeTEEPriorityDropdown();
}
// _syncTEEPriorityTrigger: updates only the visible closed-state trigger (dot color
// + label) to match a given priority value. Split out so the quick-add-person
// carry-over restore below (which sets #tee-priority.value directly, bypassing
// selectTEEPriorityOption) can keep the visible trigger in sync too — otherwise the
// hidden value-holder and the visible control would silently disagree after a
// quick-add-person round trip, even though saveTEEModal would still read the
// correct (hidden) value.
function _syncTEEPriorityTrigger(value) {
  const dot   = document.getElementById('tee-priority-trigger-dot');
  const label = document.getElementById('tee-priority-trigger-label');
  if (dot)   dot.style.background = getPri(value).bar;
  if (label) label.textContent    = value;
}

// ── TEE ADD/EDIT TYPE DROPDOWN (P4-R008b) ──────────────────────
// Add/Edit-only Type control, converted from the former large .tee-type-tabs
// pill-tab row into a compact pill dropdown trigger matching the unified
// identity-bar visual language (Type / Priority / Status, per P4-D017/P4-R008b).
// Unlike Status/Priority's Add/Edit dropdowns, selecting a Type option is NOT a
// pure draft-only value — Type immediately drives switchTEEType(value), which
// swaps the visible field zones the user needs to fill in. switchTEEType itself
// still performs no STATE mutation and no saveTEE()/renderAll()/clearNav()/
// popNav() call — the item is only persisted when Save is clicked, exactly as
// before this checkpoint. The three type colors mirror _buildTypeBadge's
// existing Today-card color map (task/event/entry) for visual consistency.
function openTEETypeDropdown(anchorEl, event) {
  event.stopPropagation();
  _closeTEETypeDropdown();
  // Mutual-close with Status/Priority's Add/Edit dropdowns, mirroring the
  // guarded pattern already used between Status and Priority (P4-R007-fix1).
  if (typeof _closeTEEStatusDropdown === 'function') _closeTEEStatusDropdown();
  if (typeof _closeTEEPriorityDropdown === 'function') _closeTEEPriorityDropdown();
  const rect = anchorEl.getBoundingClientRect();
  const dropdown = document.createElement('div');
  dropdown.id = 'tee-type-dropdown';
  dropdown.className = 'status-dropdown';
  // TEE types available for new/edit workflows.
  // Event remains readable for legacy records, but is no longer an available
  // creation type. Task and Entry keep their existing behavior.
  const types = [
    { id:'task',      label:'Task',      color:'var(--accent2)' },
    { id:'entry',     label:'Entry',     color:'var(--yellow)' },
    { id:'ideal',     label:'Ideal',     color:'var(--green)' },
    { id:'temporary', label:'Temporary', color:'var(--orange)' },
  ];
  const currentVal = document.getElementById('tee-current-type')?.value || 'task';
  dropdown.innerHTML = types.map(t => {
    const isCurrent = currentVal === t.id;
    return `<button type="button" class="status-dropdown-item${isCurrent?' current':''}"
      onclick="selectTEETypeOption('${t.id}')">
      <span class="status-dot" style="background:${t.color}"></span>
      ${t.label}
    </button>`;
  }).join('');
  document.body.appendChild(dropdown);
  const dRect = dropdown.getBoundingClientRect();
  let top  = rect.bottom + 6;
  let left = rect.left;
  if (left + dRect.width > window.innerWidth - 8)  left = window.innerWidth - dRect.width - 8;
  if (top  + dRect.height > window.innerHeight - 8) top  = rect.top - dRect.height - 6;
  dropdown.style.top  = `${top}px`;
  dropdown.style.left = `${left}px`;
  setTimeout(() => {
    document.addEventListener('click', _teeTypeDropdownOutsideClick);
    document.addEventListener('keydown', _teeTypeDropdownEscape, true);
  }, 0);
}
function _closeTEETypeDropdown() {
  document.getElementById('tee-type-dropdown')?.remove();
  document.removeEventListener('click', _teeTypeDropdownOutsideClick);
  document.removeEventListener('keydown', _teeTypeDropdownEscape, true);
}
function _teeTypeDropdownOutsideClick() { _closeTEETypeDropdown(); }
function _teeTypeDropdownEscape(e) {
  if (e.key === 'Escape') { e.stopPropagation(); _closeTEETypeDropdown(); }
}
// selectTEETypeOption: closes the dropdown, then delegates entirely to the
// existing switchTEEType(value) — Type must immediately reconfigure the visible
// field zones (unlike Status/Priority, which stay purely local until Save).
// switchTEEType is itself responsible for updating #tee-current-type and the
// Type trigger's display via _syncTEETypeTrigger (see switchTEEType).
function selectTEETypeOption(value) {
  _closeTEETypeDropdown();
  switchTEEType(value);
}
// _syncTEETypeTrigger: updates only the visible closed-state Type trigger
// (icon + label) to match a given type value. Called by switchTEEType and by
// the initial render, mirroring _syncTEEStatusTrigger/_syncTEEPriorityTrigger.
function _syncTEETypeTrigger(value) {
  const icons  = { task:'ti-clipboard-list', ideal:'ti-building-store', temporary:'ti-clock', event:'ti-calendar-event', entry:'ti-notes' };
  const labels = { task:'Task', ideal:'Ideal', temporary:'Temporary', event:'Event', entry:'Entry' };
  const icon  = document.getElementById('tee-type-trigger-icon');
  const label = document.getElementById('tee-type-trigger-label');
  if (icon)  icon.className = `ti ${icons[value] || 'ti-clipboard-list'}`;
  if (label) label.textContent = labels[value] || value;
}

// ── CHIP SELECT HELPERS ──────────────────────────────────────
// Builds tap-friendly chip-toggle multi-select (mobile-friendly, no <select multiple>)
// Shows a search box when there are more than 6 people
function buildChipSelect(id, peopleNames, selectedNames) {
  const chips = peopleNames.map(name => {
    const person = STATE.people.find(p => p.name === name);
    const color  = person?.color || avColor(name);
    const sel    = selectedNames.includes(name);
    return `<span class="chip-option${sel?' selected':''}" data-val="${name}"
      onclick="this.classList.toggle('selected')" style="touch-action:manipulation">
      <span class="chip-av" style="background:${color}">${initials(name)}</span>
      ${name}
    </span>`;
  }).join('');

  const searchBox = peopleNames.length > 6
    ? `<input class="form-input" placeholder="Search team members…" style="margin-bottom:6px;height:32px;font-size:12px"
        oninput="(function(v){document.querySelectorAll('#${id} .chip-option').forEach(c=>{c.style.display=c.dataset.val.toLowerCase().includes(v)?'':'none'})})(this.value.toLowerCase())">`
    : '';

  return `${searchBox}<div class="chip-select" id="${id}">${chips}</div>`;
}
// Read selected chip values from a chip-select container
function getChipSelections(id) {
  return Array.from(document.querySelectorAll(`#${id} .chip-option.selected`))
    .map(el => el.dataset.val).filter(Boolean);
}

