// ============================================================
// 07-people-picker.js
// People picker widget for assigning items
// (lines 4349-4726 of the original inline <script>)
// ============================================================

// ── PEOPLE PICKER (P4-R009b) ─────────────────────────────────
// Suggested/Selected people-picker foundation for TEE Assign (Task
// Contributors, Event/Entry Participants). Built alongside buildChipSelect/
// getChipSelections (left untouched — no other caller depends on them,
// confirmed by P4-D019 §K) rather than replacing them.
//
// Critical DOM contract (P4-D019 §I/§L, unchanged by this checkpoint):
// every STATE.people name must always have exactly one .chip-option
// [data-val] element somewhere inside #tee-contributors, and .selected is
// the sole source of truth — never a JS array. getChipSelections() reads
// it directly, and P4-R009a's quickAddPersonFromModal()/_saveQuickPerson()/
// _restoreTEEModal() (all unchanged) toggle .selected on existing chips the
// same way they always did. Hidden/collapsed Suggested chips are hidden via
// CSS classes only (.search-hidden, and the nth-child cap disabled by
// .expanded/.searching) — never removed from the DOM.
// P4-R009c: optional 4th param (leadInfo: { showLeadStar, isLead }) adds a
// Task-only ★/☆ Make Lead indicator (owner decisions 5/6/7). Stars only
// ever render on SELECTED chips — Suggested/unselected people are not yet
// "involved" in the Task, so a star has no meaning for them there (owner
// decision 13). showLeadStar is only ever true for Task's picker
// (buildPeoplePicker's leadMode); Event/Entry never pass leadInfo at all,
// so they never render a star (owner decision 12).
//
// P4-R009c-fix1: both ☆ and ★ now stop propagation and call their own
// dedicated handler (_peoplePickerMakeLead / _peoplePickerClearLead) — in
// P4-R009c, ★ had no handler and fell through to the chip's own click-to-
// remove behavior, which incorrectly removed the person entirely instead
// of just clearing Lead status (owner-reported bug, item E). The × remove
// button also now has its own dedicated handler (_peoplePickerRemoveChip)
// instead of relying on bubbling, since a selected chip's body click is no
// longer a remove action at all (see _peoplePickerToggleChip below) —
// removal is exclusive to × now, for both Task and Event/Entry alike.
function _peopleChipHTML(name, selected, searchHidden, leadInfo) {
  const li = leadInfo || {};
  const showStar = !!li.showLeadStar && selected;
  const isLead   = !!li.isLead;
  const person = STATE.people.find(p => p.name === name);
  const color  = person?.color || avColor(name);
  const star = !showStar ? '' : isLead
    ? `<span class="people-chip-lead-star is-lead" title="Clear Lead" aria-label="Clear ${name} as Lead" onclick="event.stopPropagation();_peoplePickerClearLead(this)">★</span>`
    : `<span class="people-chip-lead-star" title="Make ${name} Lead" aria-label="Make ${name} Lead" onclick="event.stopPropagation();_peoplePickerMakeLead(this)">☆</span>`;
  return `<span class="chip-option people-chip${selected ? ' selected' : ''}${searchHidden ? ' search-hidden' : ''}${isLead ? ' is-lead' : ''}" data-val="${name}"
    onclick="_peoplePickerToggleChip(this)" style="touch-action:manipulation">
    ${star}
    <span class="chip-av" style="background:${color}">${initials(name)}</span>
    <span class="people-chip-label">${name}</span>
    ${selected ? `<span class="people-chip-remove" title="Remove ${name}" aria-label="Remove ${name}" onclick="event.stopPropagation();_peoplePickerRemoveChip(this)">&times;</span>` : ''}
  </span>`;
}

// P4-R009c-fix1: chip-body click now only ADDS a not-yet-selected
// (Suggested) person — clicking an already-SELECTED chip's body/avatar/
// label is now a no-op (owner decision, item E: removal must be exclusive
// to the × button, so clicking a selected pill can't accidentally remove
// someone). Applies uniformly to Task and Event/Entry alike, since neither
// ever had a reason to keep body-click-removes once × has its own handler.
// The class-mutation observer regroups the visual rows afterward, same as
// always, when a Suggested chip is actually added.
function _peoplePickerToggleChip(el) {
  if (el.classList.contains('selected')) return;
  el.classList.add('selected');
}

// P4-R009c-fix1: the × button's own dedicated remove handler — in
// P4-R009c, × had no onclick of its own and relied on bubbling to the
// chip's own click-to-remove handler; now that a selected chip's body
// click is a no-op (see _peoplePickerToggleChip above), × must do the
// removal itself. If the removed person was the current Task Lead, clear
// #tee-lead too (same rule P4-R009c already established for removal —
// just relocated here since removal itself moved here). For Event/Entry,
// #tee-lead doesn't exist in the DOM, so this is a safe no-op there.
function _peoplePickerRemoveChip(xEl) {
  const chip = xEl.closest('.chip-option');
  if (!chip) return;
  chip.classList.remove('selected');
  const leadEl = document.getElementById('tee-lead');
  if (leadEl && leadEl.value === chip.dataset.val) leadEl.value = '';
}

// Promotes an already-selected Task person to Lead (owner decision 8).
// Only ever invoked from a ☆ button, which only ever renders on selected
// Task chips — never wired up for Event/Entry. Does not touch any chip's
// .selected class — the old Lead stays selected (owner decision 9), only
// #tee-lead's value changes; regrouping afterward re-renders which chip
// shows ★ vs ☆ (and clears any other chip's stale ★, since only one chip
// can ever match the new #tee-lead value), and re-sorts Lead to the front
// of Assignees (owner decision, item G).
function _peoplePickerMakeLead(starEl) {
  const chip = starEl.closest('.chip-option');
  const leadEl = document.getElementById('tee-lead');
  if (!chip || !leadEl) return;
  leadEl.value = chip.dataset.val;
  const root = chip.closest('.people-picker');
  if (root && root.id) _peoplePickerRegroup(root.id);
}

// P4-R009c-fix1: clicking ★ (the current Lead) clears Lead status only —
// the person stays selected/assigned (owner decision, item E). This is the
// fix for the bug P4-R009c's own comment already flagged: ★ previously had
// no handler and fell through to the chip's own click-to-remove behavior,
// incorrectly removing the person entirely instead of just clearing Lead.
function _peoplePickerClearLead(starEl) {
  const chip = starEl.closest('.chip-option');
  const leadEl = document.getElementById('tee-lead');
  if (!chip || !leadEl) return;
  if (leadEl.value === chip.dataset.val) leadEl.value = '';
  const root = chip.closest('.people-picker');
  if (root && root.id) _peoplePickerRegroup(root.id);
}

// Rebuilds the Suggested/Selected sub-rows from the live .selected state of
// every .chip-option currently under #id — a throwaway read each time, never
// a persisted array. Safe to call as often as needed (idempotent).
//
// P4-R009b-fix1: this function disconnects the shared observer (see
// _peoplePickerEnsureObserver below) before making its own DOM/class changes,
// and reconnects once it's done. Root cause of the original search-typing
// hang: per the DOMTokenList spec, classList.remove(token) unconditionally
// runs its "update steps" (i.e. re-serializes and re-sets the class
// attribute) even when the token was already absent — unlike
// toggle(token, force), which short-circuits when the requested state
// already holds. Regroup used to call suggestedEl.classList.remove('expanded')
// on every keystroke whenever query was truthy, regardless of whether
// 'expanded' was present, which fired a genuine 'class' mutation every time
// and fed an infinite loop back through the observer. fix1's disconnect/
// reconnect wrapper (kept here unchanged in fix2, per hard restriction) makes
// this function's own mutations invisible to the observer regardless of
// which line would otherwise cause them. fix2 also removes the
// remove('expanded') call entirely (search no longer force-collapses Browse
// All — see below), so the original trigger line is gone too, not just
// guarded.
//
// P4-R009b-fix2: Browse All's visibility is now decided by measuring actual
// overflow (scrollHeight vs. clientHeight) against the CSS height cap on
// .people-picker-suggested, via requestAnimationFrame after the DOM update —
// this replaces the old position-based (nth-child) cap and its count
// heuristic, so it stays correct at any width/column layout without
// per-breakpoint rules. Search no longer hides Browse All or force-collapses
// .expanded — per the owner's fix2 comment 5, results stay height-capped
// (not a growing wall) with Browse All still available to reveal more
// matches while searching.
//
// P4-R009b-fix4: Browse All's visibility toggle switched from
// style.display to style.visibility (see below) — Browse All now lives
// inside the Suggested label column as an always-reserved second line
// (buildPeoplePicker), and display:none would have collapsed that
// reservation, changing the Suggested row's height and jumping the Selected
// row underneath it every time Browse All appeared/disappeared. visibility
// keeps the same disconnect/reconnect-safe, inline-style-only, non-class
// mutation this function already relied on — no change to the fix1 hang fix.
function _peoplePickerRegroup(id) {
  const root = document.getElementById(id);
  if (!root) return;
  const suggestedEl = root.querySelector('.people-picker-suggested');
  const selectedEl  = root.querySelector('.people-picker-selected');
  if (!suggestedEl || !selectedEl) return;

  if (_peoplePickerObserver) _peoplePickerObserver.disconnect();

  const all = Array.from(root.querySelectorAll('.chip-option[data-val]')).map(el => ({
    name: el.dataset.val,
    selected: el.classList.contains('selected'),
  }));

  const searchInput = root.querySelector('.people-picker-search');
  const query = (searchInput?.value || '').trim().toLowerCase();

  const unselected     = all.filter(p => !p.selected).map(p => p.name);
  const matchCount     = query ? unselected.filter(n => n.toLowerCase().includes(query)).length : unselected.length;

  // P4-R009c: Task-only lead mode, marked on the container at build time
  // (buildPeoplePicker). Re-read #tee-lead live on every regroup, same as
  // everything else in this function reads live DOM state rather than a
  // persisted value — this is what keeps ★/☆ correct after Make Lead,
  // after clearing/removing the Lead, after quick-add restore, and after
  // type switching, with no extra wiring needed at any of those call sites.
  const leadMode = root.dataset.leadMode === '1';
  const currentLead = leadMode ? (document.getElementById('tee-lead')?.value || '') : '';

  // P4-R009c-fix1 item G: Lead must render first in Assignees, with
  // everyone else keeping their existing relative order. all[] preserves
  // live DOM order (whatever order chips currently sit in), so pull the
  // Lead to the front of that same order rather than re-sorting anything
  // else — this also directly determines saveTEEModal's saved order, since
  // getChipSelections reads chips in this same DOM order.
  const selectedNamesRaw = all.filter(p => p.selected).map(p => p.name);
  const selectedNames = (leadMode && currentLead)
    ? [currentLead, ...selectedNamesRaw.filter(n => n !== currentLead)]
    : selectedNamesRaw;

  // Every unselected person is always rendered — non-matches during an
  // active search are hidden via .search-hidden, never omitted.
  suggestedEl.innerHTML = unselected.map(n =>
    _peopleChipHTML(n, false, !!query && !n.toLowerCase().includes(query))
  ).join('') || `<span class="people-picker-empty">No one else to add</span>`;
  if (unselected.length && query && matchCount === 0) {
    suggestedEl.innerHTML += `<span class="people-picker-empty">No matches</span>`;
  }

  // P4-R009c-fix1 item D: exact empty-state wording is "No one assigned"
  // for both Task Assignees and Event/Entry Participants (was "No one
  // selected yet").
  selectedEl.innerHTML = selectedNames.length
    ? selectedNames.map(n => _peopleChipHTML(n, true, false, { showLeadStar: leadMode, isLead: leadMode && n === currentLead })).join('')
    : `<span class="people-picker-empty">No one assigned</span>`;

  suggestedEl.classList.toggle('searching', !!query);

  const browseBtn = root.querySelector('.people-picker-browse-all');
  if (browseBtn) {
    const expanded = suggestedEl.classList.contains('expanded');
    browseBtn.textContent = expanded ? 'Show Less' : 'Browse All';
    // fix4 owner comment 3: toggle visibility, not display — display:none
    // would collapse Browse All's reserved line in the label column,
    // shrinking/growing the Suggested row and jumping Selected underneath
    // it every time Browse All appeared or disappeared. visibility keeps
    // the line's layout space constant either way, so Selected never moves.
    if (expanded) {
      browseBtn.style.visibility = unselected.length ? 'visible' : 'hidden';
    } else {
      // Measure real overflow against the height cap (not a count guess) —
      // rAF lets the browser lay out the innerHTML rebuild above first.
      // Pure read/inline-style/textContent work, no class mutation, so this
      // cannot re-trigger the observer even while it's already reconnected.
      requestAnimationFrame(() => {
        if (!suggestedEl.isConnected) return;
        const overflowing = suggestedEl.scrollHeight > suggestedEl.clientHeight + 1;
        browseBtn.style.visibility = overflowing ? 'visible' : 'hidden';
      });
    }
  }

  if (_peoplePickerObserver) {
    _peoplePickerObserver.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
  }
}

function _peoplePickerToggleBrowseAll(id, btn) {
  const root = document.getElementById(id);
  if (!root) return;
  const suggestedEl = root.querySelector('.people-picker-suggested');
  if (!suggestedEl) return;
  const expanded = suggestedEl.classList.toggle('expanded');
  btn.textContent = expanded ? 'Show Less' : 'Browse All';
}

// Lazily installs one page-lifetime observer (not per-render) that watches
// for external .selected class changes on people-picker chips — specifically
// P4-R009a's quick-add Save/Cancel restore loops, which toggle
// #tee-contributors .chip-option.selected directly and are not modified by
// this checkpoint. Regroups whichever picker changed so Suggested/Selected
// stay visually in sync with the DOM-class source of truth, including right
// after quick-add restores a carried selection.
//
// P4-R009b-fix1: the observer instance is now kept in a module-level
// variable (_peoplePickerObserver) instead of a function-local const, so
// _peoplePickerRegroup can disconnect/reconnect it around its own mutations
// (see that function's comment). Still installed exactly once, lazily, for
// the page's lifetime — type switching still creates no stale/duplicate
// observers, since document.body + subtree:true dynamically covers whatever
// #tee-contributors element currently exists.
let _peoplePickerObserverInstalled = false;
let _peoplePickerObserver = null;
function _peoplePickerEnsureObserver() {
  if (_peoplePickerObserverInstalled) return;
  _peoplePickerObserverInstalled = true;
  _peoplePickerObserver = new MutationObserver(muts => {
    const ids = new Set();
    muts.forEach(m => {
      const target = m.target;
      const picker = target && target.nodeType === 1 && target.closest ? target.closest('.people-picker') : null;
      if (picker && picker.id) ids.add(picker.id);
    });
    ids.forEach(id => _peoplePickerRegroup(id));
  });
  _peoplePickerObserver.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
}

// Renders the full picker: always-visible search (+ optional "+ Add" real
// button), and a full-width body — Suggested row (height-capped via CSS,
// never via omitting people from the DOM), Browse All, and Selected row.
//
// P4-R009b-fix2: split into two top-level children — .people-picker-search-
// row and .people-picker-body — so that with .people-picker's new
// display:contents (see CSS), the search row can stay beside Lead (Task) or
// atop Participants (Event/Entry) while the body independently spans the
// full Assign card width below it. Both children remain descendants of this
// same #id element regardless of how they're laid out, so getChipSelections
// (unchanged)/quick-add restore (unchanged) still find every .chip-option
// under #tee-contributors exactly as before. `opts.showAdd` renders the
// "+ Add" quick-add trigger (same unchanged quickAddPersonFromModal()) as a
// real button, not a text link, per owner review.
//
// P4-R009c: `opts.leadMode` (Task only) marks the container with
// `data-lead-mode="1"` so _peoplePickerRegroup can find it again on every
// later re-render without needing its own opts parameter — the DOM itself
// carries "is this a Lead-aware picker" the same way it already carries
// .selected as the source of truth. `opts.leadName` supplies the current
// Lead for this one initial render only (before #tee-lead exists in the
// DOM to read live); every subsequent render (search, click, quick-add,
// type switch) goes through _peoplePickerRegroup, which reads #tee-lead
// live instead. `selectedNames` is now expected to include the Lead's name
// too when leadMode is on (owner decision 4/13 — Selected is the single
// source of truth for everyone involved, Lead included), so the Lead's
// chip renders in Selected with a star instead of incorrectly appearing in
// Suggested as if not yet involved.
//
// P4-R009c-fix1: row order rebuilt per owner review (item A/B) — header
// (opts.assigneeLabel: "Assignees" for Task, "Participants" for Event/
// Entry, + the ☆/★ hint when leadMode) → assignee/participant pills →
// a labeled Search row → a Suggested header (+ Browse All) → Suggested
// pills. Pills used to render last, after Suggested; they now render
// first, directly under the header, per the owner's requested order.
// Selected/assignee pills are now rendered in the CALLER's given order
// (lead-first, when leadMode — see _buildTEEAssignFields) instead of being
// re-derived from peopleNames/STATE.people order, so Lead renders first in
// Assignees (owner decision, item G) from the very first paint, not only
// after the first regroup.
function buildPeoplePicker(id, peopleNames, selectedNames, opts) {
  _peoplePickerEnsureObserver();
  const o = opts || {};
  const showAdd = !!o.showAdd;
  const leadMode = !!o.leadMode;
  const leadName = o.leadName || '';
  const assigneeLabel = o.assigneeLabel || 'Assignees';
  const selectedSet = new Set(selectedNames || []);

  const orderedSelected = (selectedNames || []).filter(n => selectedSet.has(n));
  const selectedChipsHTML = orderedSelected
    .map(n => _peopleChipHTML(n, true, false, { showLeadStar: leadMode, isLead: leadMode && n === leadName }))
    .join('');
  const unselectedChipsHTML = peopleNames.filter(n => !selectedSet.has(n)).map(n => _peopleChipHTML(n, false, false)).join('');

  // Browse All starts hidden in the markup below (no reliable overflow
  // measurement is possible before layout) — this deferred call runs once
  // the returned markup is actually in the DOM (the caller inserts it
  // synchronously right after this function returns, well before a
  // setTimeout(0) callback can fire) and corrects its visibility from real
  // measured overflow, same as every later interaction does.
  setTimeout(() => _peoplePickerRegroup(id), 0);

  return `
    <div class="people-picker" id="${id}"${leadMode ? ' data-lead-mode="1"' : ''}>
      <div class="people-picker-header-row">
        <span class="people-picker-section-label">${assigneeLabel}</span>
        ${leadMode ? '<span class="people-picker-lead-hint">☆ Make Lead · ★ Lead</span>' : ''}
      </div>
      <div class="people-picker-selected">${selectedChipsHTML || '<span class="people-picker-empty">No one assigned</span>'}</div>

      <div class="people-picker-search-row">
        <span class="people-picker-search-label">Search:</span>
        <input type="text" class="form-input people-picker-search" placeholder="Search people…" oninput="_peoplePickerRegroup('${id}')">
        ${showAdd ? `<button type="button" class="people-picker-add-btn" onclick="quickAddPersonFromModal()" title="Add a new team member">+ Add</button>` : ''}
      </div>

      <div class="people-picker-header-row">
        <span class="people-picker-section-label">Suggested</span>
        <button type="button" class="people-picker-browse-all" onclick="_peoplePickerToggleBrowseAll('${id}', this)" style="visibility:hidden">Browse All</button>
      </div>
      <div class="people-picker-suggested">${unselectedChipsHTML || '<span class="people-picker-empty">No one else to add</span>'}</div>
    </div>`;
}

function togglePinExpand(noteId, btn) {
  const el = document.getElementById(noteId);
  if (!el) return;
  const expanded = el.style.webkitLineClamp === 'unset' || el.style.webkitLineClamp === '';
  if (expanded) {
    el.style.webkitLineClamp = '3';
    el.style.overflow = 'hidden';
    btn.textContent = '▼ more';
  } else {
    el.style.webkitLineClamp = 'unset';
    el.style.overflow = 'visible';
    btn.textContent = '▲ less';
  }
}

