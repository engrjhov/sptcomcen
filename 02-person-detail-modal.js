// ============================================================
// 02-person-detail-modal.js
// Person Detail modal + its filter/schedule system
// (lines 423-1740 of the original inline <script>)
// ============================================================

// ── PERSON DETAIL MODAL ──────────────────────────────────────
function openPersonDetailModal(personId, primaryFilter, stateFilter, view, dayOffset, scheduleFilters) {
  const p = STATE.people.find(x => x.id === personId);
  if (!p) return;
  const allItems = personItems(p.name);

  // P4-R015c-fix4: fresh opens (People page "View details →", TEE Detail
  // person-chip navigation) call this with no filter args at all — those
  // get a computed default selection (see _pdmDefaultFilterState below,
  // owner-corrected: TODAY if its count>0, else THIS WEEK if its count>0,
  // else UPCOMING if its count>0, else ALL — never pre-selects a state
  // subfilter). A restored Back-navigation reopen always passes
  // explicit primaryFilter/stateFilter values (stateFilter may be `''` for
  // "no state selected"), so checking strictly for `undefined` — not just
  // falsiness — correctly distinguishes "fresh open" from "restored state
  // with an explicitly empty state subfilter."
  if (primaryFilter === undefined) {
    const d = _pdmDefaultFilterState(allItems);
    primaryFilter = d.primaryFilter;
    stateFilter   = d.stateFilter;
  }
  // Defensive normalization — falls back to safe defaults for any stray/
  // invalid value (mirrors P4-R015b's original defensive-normalization
  // intent, updated for the new TODAY/THIS WEEK/UPCOMING/ALL primary and
  // single-select ACTIVE/OVERDUE/DONE (or none) state subfilter model).
  if (!['today','week','upcoming','all'].includes(primaryFilter)) primaryFilter = 'all';
  if (!['active','overdue','done'].includes(stateFilter)) stateFilter = '';

  // P4-R017a (discovery basis P4-D029): additive LIST/SCHEDULE view
  // tracking. Backward-compatible with every existing call site —
  // openPersonDetailModal(personId) and openPersonDetailModal(personId,
  // primaryFilter, stateFilter) both omit view/dayOffset and continue to
  // open in LIST mode exactly as before this checkpoint.
  if (!['list','schedule'].includes(view)) view = 'list';
  if (typeof dayOffset !== 'number' || !isFinite(dayOffset)) dayOffset = 0;

  // P4-R017c (discovery basis P4-D029): additive Schedule count-pill filter
  // state. Backward-compatible with every existing call site — a 5th
  // argument (or fewer) omits scheduleFilters entirely and normalizes to
  // "no filters" (show all non-zero sections), the same as P4-R017b's
  // behavior. Accepts either an array of section keys or a comma-delimited
  // string (the latter is what a Schedule card's reopen closure embeds in
  // its onclick attribute, avoiding array-literal/quote-escaping issues —
  // see _pdmBuildScheduleCard). _pdmNormalizeScheduleFilters also drops any
  // unrecognized key defensively.
  scheduleFilters = _pdmNormalizeScheduleFilters(scheduleFilters);

  // P4-R016c: track the currently open Person Detail's resolved state so
  // changeItemPriority/changeItemStatus can refresh this modal in place —
  // see _pdmRefreshIfOpen below. Kept current on filter changes by
  // _pdmApplyFilterChange, and on view/day changes by _pdmApplyViewChange/
  // _pdmChangeScheduleDay (P4-R017a). P4-R017c additionally tracks
  // scheduleFilters here.
  STATE.pdmOpen = { personId, primaryFilter, stateFilter, view, dayOffset, scheduleFilters };

  // P4-R015b-fix1: the old always-visible total/type/completed/overdue
  // .pdm-pills summary block is removed here — owner review found it
  // duplicated the counts now shown on the filter pills themselves (see
  // _pdmBuildFilterPanel below). personItems()/allItems are still computed
  // above since the filter panel and list both need them.

  // P4-R015b: replaces the old single-row All/Tasks/Events/Entries tabs
  // with the two-tier filter panel — see _pdmBuildFilterPanel below.
  // P4-R017a: filter panel + activity list are now only rendered when
  // view === 'list', via _pdmBuildListPanel (factors the same markup used
  // by _pdmApplyViewChange when switching back to LIST) — see below.
  const viewSwitchHTML = _pdmBuildViewSwitch(personId, view);
  const viewBodyHTML   = view === 'schedule'
    ? _pdmBuildSchedulePanel(personId, primaryFilter, stateFilter, dayOffset, scheduleFilters)
    : _pdmBuildListPanel(personId, primaryFilter, stateFilter);

  // P4-R015a-fix1: avatar enlarged 56px → 64px, per owner review, so it
  // visually balances against the 3-line name/role/status-badge stack
  // (fallback-initials sizing and the img's onerror-replacement div both
  // updated to match).
  const avatarHTML = p.photo
    ? `<img src="${p.photo}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid ${p.color}" onerror="this.outerHTML='<div style=\\'width:64px;height:64px;border-radius:50%;background:${p.color};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff\\'>${initials(p.name)}</div>'">`
    : `<div style="width:64px;height:64px;border-radius:50%;background:${p.color};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;box-shadow:0 4px 14px ${p.color}55">${initials(p.name)}</div>`;

  // P4-R015a: header status signal (discovery basis P4-D026) — mirrors
  // buildPersonCard's own isPersonActiveToday()/isPersonActiveThisWeek()-
  // driven three-tier state (Active Today / Active This Week / Idle);
  // both functions reused unchanged, read-only. New narrow .pdm-status-*
  // classes mirror .person-active-badge/.person-active-week-badge/
  // .person-idle-badge's colors/meaning rather than reusing those
  // card-specific classes directly — the People-page card and this modal
  // header use different avatar sizes/layouts, so a dedicated Person-
  // Detail-scoped namespace avoids coupling the two features' CSS.
  const activeToday     = isPersonActiveToday(p);
  const activeWeek      = isPersonActiveThisWeek(p);
  const statusState     = activeToday ? 'today' : (activeWeek ? 'week' : 'idle');
  const statusLabel     = activeToday ? 'Active Today' : (activeWeek ? 'Active This Week' : 'Idle');
  const statusBadgeHTML = `<span class="pdm-status-badge ${statusState}">${statusLabel}</span>`;
  const statusDotHTML   = `<span class="pdm-status-dot ${statusState}" title="${statusLabel}"></span>`;

  // P4-R015a: shell/scroll polish (discovery basis P4-D026) — adapts the
  // idea behind TEE Detail's .tee-detail-shell/.tee-detail-body (stable
  // top area, one clear scrolling region, footer outside the scroll) using
  // a dedicated .pdm-* namespace only — does not adopt TEE Detail's
  // Details/Assign/Context/Execution section-card language, and does not
  // reuse .tee-detail-* classes. .pdm-shell mirrors .tee-detail-shell's own
  // `calc(90vh - 60px)` budget (matching .modal's existing 90vh max-height
  // + 28px top/bottom padding), so .pdm-shell's own max-height is a local
  // repeat of that same math rather than a new value. Only #pdm-list
  // (renamed to also carry .pdm-list-wrap) is the scrolling region — pills
  // and tabs remain always-visible above it exactly as before; this
  // replaces the previous fixed inline `max-height:50vh` with a flexible
  // `flex:1` sizing that adapts to whatever vertical space is actually
  // available, matching or improving on the prior fixed-height behavior.
  // #pdm-list's id and its innerHTML-swap-only update mechanism are
  // unchanged (P4-R015b's filter clicks reuse the same pattern — see
  // _pdmApplyFilterChange below — plus a second swap for #pdm-filter-panel
  // when the subfilter row itself needs to change).
  openModal(`
    <div class="pdm-shell">
      <div class="pdm-top">
        <div class="pdm-header">
          <div class="pdm-avatar-wrap">
            ${avatarHTML}
            ${statusDotHTML}
          </div>
          <div class="pdm-header-info">
            <div class="pdm-person-name">${p.name}</div>
            <div class="pdm-person-role">${p.role||'—'}</div>
            ${statusBadgeHTML}
          </div>
        </div>
        ${_modalCloseBtn()}
      </div>
      <div class="pdm-body">
        ${viewSwitchHTML}
        <div id="pdm-view-body" class="pdm-view-body">${viewBodyHTML}</div>
      </div>
      <div class="modal-actions">${_backBtn()}</div>
    </div>
  `, true);
}
// ── Person Detail Filter System (P4-R015b → -fix1 → -fix2 → P4-R015c-fix3) ──
// Discovery basis: P4-D026, owner-approved filter model confirmed before
// starting each pass. P4-R015c-fix3 replaces the entire P4-R015b/-fix1/-fix2
// filter model with an owner-locked two-row model: primary row (TODAY/THIS
// WEEK/UPCOMING/ALL) is single-select and always visible, even at zero
// count; state-subfilter row (ACTIVE/OVERDUE/DONE) is single-select and
// only shows pills with count > 0 under the currently selected primary
// filter — `''` means no state subfilter selected, showing all states
// within the primary scope. Switching the primary filter resets the state
// subfilter to `''`. Type (Task/Event/Entry) is no longer a filter axis at
// all (every card still shows its own Type chip, so type information isn't
// lost) — the list itself is a single flat sorted list (P4-R015c-fix4
// owner correction: State/status → Type → Relationship → Priority → Time),
// with no group headers and no collapse/expand controls (both removed from
// the P4-R015c-fix2 OVERDUE/ACTIVE/DONE grouping). A fresh Person Detail
// open (no preserved Back-navigation state) computes its own default
// primary/state selection (P4-R015c-fix4 owner correction: no state
// subfilter is ever pre-selected) — see _pdmDefaultFilterState below.

// Per-item mirrors of isPersonActiveToday()/isPersonActiveThisWeek()'s own
// internal item-level tests (those two functions are person-level
// .some() aggregates over all of a person's items and are not modified
// here) — reused so Person Detail's TODAY/THIS WEEK primary filters define
// "relevant" identically to the People page's own Active Today/This Week
// badges, rather than inventing a new inconsistent definition.
// P4-R015b-fix1: the previous `if (state === 'Completed') return false`
// short-circuit is removed from both functions below — owner review found
// TODAY/THIS WEEK incorrectly excluded done/completed items. Completed
// tasks are now evaluated against the same existing due/start-date fields
// as any other task, so a completed task still counts as "today"/"this
// week" only if its own dueDate/startDate falls in that range (no new date
// field introduced).
function _pdmIsTodayItem(item) {
  const todayStr = fmtDate(TODAY);
  if (item.type === 'task') {
    const state = parseStatus(item.status).state;
    return item.dueDate === todayStr || item.startDate === todayStr ||
      state === 'In Progress' || state === 'Review' || state === 'Open';
  }
  return item.date === todayStr;
}
function _pdmIsThisWeekItem(item) {
  const todayStr   = fmtDate(TODAY);
  const weekEnd    = new Date(TODAY); weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = fmtDate(weekEnd);
  if (item.type === 'task') {
    const state = parseStatus(item.status).state;
    if (state === 'In Progress' || state === 'Review') return true;
  }
  const dateStr = item.dueDate || item.startDate || item.date || '';
  return dateStr >= todayStr && dateStr <= weekEndStr;
}
// Task-only, since events/entries have no due-date concept anywhere else in
// the app (Today/Overview's own overdue count is likewise task-only).
// Unchanged in fix1 — OVERDUE must still exclude done/completed items.
function _pdmIsOverdueItem(item) {
  return item.type === 'task' && !!item.dueDate && daysUntil(item.dueDate) < 0 && parseStatus(item.status).state !== 'Completed';
}
// Terminal-status check via the existing unchanged parseStatus() — the
// same Completed/Done state pattern buildModalDetailHeader's Completed/
// Done timestamp display already relies on (P4-R013a). Deliberately
// distinct from _pdmList's own pre-existing classify()'s date-based
// "isDone" (used only for the existing done-last sort/opacity) — that
// sort-only logic is unchanged here.
function _pdmIsDoneItem(item) {
  const state = parseStatus(item.status).state;
  return state === 'Completed' || state === 'Done';
}
// P4-R015c-fix3: new primary-membership predicate for the UPCOMING primary
// filter — "not done, not overdue, future beyond this week." Evaluated via
// each item's own literal date field only (dueDate for tasks, date for
// events/entries), not via _pdmIsThisWeekItem's own broader "any non-
// terminal status counts as this week" branch — mirrors the same literal-
// date-comparison approach P4-R015c-fix1/fix2 already used for ordering/
// grouping, for the same reason (avoids swallowing nearly every open item
// into "this week"). An item with no date at all is never "upcoming" (it
// has no future date to compare) — it still shows under ALL.
function _pdmIsUpcomingItem(item) {
  if (_pdmIsDoneItem(item) || _pdmIsOverdueItem(item)) return false;
  const todayStr   = fmtDate(TODAY);
  const weekEnd    = new Date(TODAY); weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = fmtDate(weekEnd);
  const dateStr = item.type === 'task' ? (item.dueDate || '') : (item.date || '');
  return !!dateStr && dateStr > weekEndStr;
}
// P4-R015c-fix3: locked primary-scope resolver — TODAY/THIS WEEK/UPCOMING
// each narrow the full item list via their own existing predicate; ALL (or
// any unrecognized value) returns the full list unfiltered.
function _pdmPrimaryScope(items, primaryFilter) {
  if (primaryFilter === 'today')    return items.filter(_pdmIsTodayItem);
  if (primaryFilter === 'week')     return items.filter(_pdmIsThisWeekItem);
  if (primaryFilter === 'upcoming') return items.filter(_pdmIsUpcomingItem);
  return items;
}
// P4-R015c-fix3: owner-locked filter model — primary (TODAY/THIS WEEK/
// UPCOMING/ALL) narrows the full item list first; state subfilter (ACTIVE/
// OVERDUE/DONE, single-select, or '' for "no state selected" = all states)
// then narrows that primary-scoped set. Replaces the P4-R015b/-fix1/-fix2
// model (ALL/TODAY/THIS WEEK/DONE primary + multi-select TASKS/EVENTS/
// ENTRIES/OVERDUE subfilter) entirely — DONE is no longer a primary value,
// and type is no longer filterable at all (every card still shows its own
// Type chip, so type information isn't lost, just no longer a filter axis).
function _pdmApplyFilters(items, primaryFilter, stateFilter) {
  const scope = _pdmPrimaryScope(items, primaryFilter);
  if (stateFilter === 'active')  return scope.filter(i => !_pdmIsDoneItem(i) && !_pdmIsOverdueItem(i));
  if (stateFilter === 'overdue') return scope.filter(i => !_pdmIsDoneItem(i) && _pdmIsOverdueItem(i));
  if (stateFilter === 'done')    return scope.filter(_pdmIsDoneItem);
  return scope; // no state subfilter selected — show all states within the primary scope
}
// P4-R015c-fix4: computes the initial primary/state selection for a fresh
// Person Detail open (no preserved Back-navigation filter state) — see the
// matching check in openPersonDetailModal. Owner-locked precedence (owner
// correction over fix3's TODAY+ACTIVE/THIS WEEK+ACTIVE default, which
// review found pre-selected a state subfilter on open): TODAY if the TODAY
// primary count > 0, else THIS WEEK if its count > 0, else UPCOMING if its
// count > 0, else ALL — every branch selects no state subfilter (`''`), so
// the fresh-open list always shows all states within the chosen primary
// scope rather than pre-filtering to ACTIVE.
function _pdmDefaultFilterState(items) {
  if (items.filter(_pdmIsTodayItem).length > 0)    return { primaryFilter: 'today',    stateFilter: '' };
  if (items.filter(_pdmIsThisWeekItem).length > 0) return { primaryFilter: 'week',     stateFilter: '' };
  if (items.filter(_pdmIsUpcomingItem).length > 0) return { primaryFilter: 'upcoming', stateFilter: '' };
  return { primaryFilter: 'all', stateFilter: '' };
}
// P4-R015c-fix3: state subfilter pill counts — computed from the currently
// selected primary filter's scope only (before the state subfilter itself
// is applied), per the owner-locked visibility rule ("subfilters render
// only when count > 0 under the selected primary filter"); primary pill
// counts (TODAY/THIS WEEK/UPCOMING/ALL) are computed separately in
// _pdmBuildFilterPanel from the person's full, unfiltered item list.
function _pdmFilterCounts(items, primaryFilter) {
  const scope = _pdmPrimaryScope(items, primaryFilter);
  return {
    active:  scope.filter(i => !_pdmIsDoneItem(i) && !_pdmIsOverdueItem(i)).length,
    overdue: scope.filter(i => !_pdmIsDoneItem(i) && _pdmIsOverdueItem(i)).length,
    done:    scope.filter(_pdmIsDoneItem).length,
  };
}
// P4-R018c (discovery basis P4-D033/P4-D034, owner correction after
// product validation of P4-R018b/P4-R018b-redo): shared, person-level
// wrappers around the existing, unmodified _pdmApplyFilters — the single
// count/list basis reused by the People card chips, the People page's
// ACTIVE TODAY/ACTIVE THIS WEEK filter+badge functions, and Person
// Detail's own TODAY+ACTIVE/THIS WEEK+ACTIVE/ALL+OVERDUE destinations, so
// none of them can ever compute a different number for the same person.
// Overdue is intentionally excluded from the Today/Week bases (ACTIVE
// already excludes _pdmIsOverdueItem) — overdue backlog is never a factor
// in whether someone counts as "active," per owner direction.
function _personActiveTodayItems(name) {
  return _pdmApplyFilters(personItems(name), 'today', 'active');
}
function _personActiveWeekItems(name) {
  return _pdmApplyFilters(personItems(name), 'week', 'active');
}
function _personOverdueItems(name) {
  return _pdmApplyFilters(personItems(name), 'all', 'overdue');
}
// Builds the primary + state-subfilter pill rows. Rendered fresh on every
// filter change (not just #pdm-list) because subfilter visibility/counts
// depend on the currently selected primary filter.
// P4-R015c-fix3: owner-locked filter model revision — primary row is now
// TODAY/THIS WEEK/UPCOMING/ALL (all four always visible, even at 0 count;
// replaces the P4-R015b/-fix1 ALL/TODAY/THIS WEEK/DONE primary row), and
// the subfilter row is now a single-select ACTIVE/OVERDUE/DONE state
// filter (replaces the P4-R015b/-fix1/-fix2 multi-select TASKS/EVENTS/
// ENTRIES/OVERDUE type+status subfilter row) — DONE moved out of primary
// into this state row; type is no longer a filter axis at all (every card
// still shows its own Type chip, so type information isn't lost). Pill
// text remains count-first/label-second throughout, per P4-R015b-fix1.
function _pdmBuildFilterPanel(personId, primaryFilter, stateFilter) {
  const p = STATE.people.find(x => x.id === personId);
  if (!p) return '';
  const allItems = personItems(p.name);
  // P4-R018c-fix1 (owner correction after manual verification of P4-R018c):
  // TODAY/THIS WEEK/UPCOMING's own primary pill counts previously used the
  // raw, unconditioned _pdmIsTodayItem/_pdmIsThisWeekItem/_pdmIsUpcomingItem
  // membership tests directly — which still include overdue items (e.g. an
  // overdue In Progress/Review task still satisfies _pdmIsTodayItem via its
  // status clause). Since P4-R018c already removed OVERDUE as a selectable
  // subfilter under these three primaries (it now only exists under ALL),
  // the primary pill's own displayed count must match what's actually
  // reachable underneath it — ACTIVE + DONE only, via the existing,
  // unmodified _pdmApplyFilters (the same function the ACTIVE/DONE subpills
  // and _pdmList's own grouped rendering already use), not the raw
  // primary-scope predicate. ALL is unaffected — its own count is already
  // the full, unfiltered item count, which already includes overdue.
  const cToday    = _pdmApplyFilters(allItems, 'today', 'active').length + _pdmApplyFilters(allItems, 'today', 'done').length;
  const cWeek     = _pdmApplyFilters(allItems, 'week', 'active').length + _pdmApplyFilters(allItems, 'week', 'done').length;
  const cUpcoming = _pdmApplyFilters(allItems, 'upcoming', 'active').length + _pdmApplyFilters(allItems, 'upcoming', 'done').length;
  const cAll      = allItems.length;
  const counts = _pdmFilterCounts(allItems, primaryFilter);

  const primaryOpts = [
    { key:'today',    label:'TODAY',     count:cToday },
    { key:'week',     label:'THIS WEEK', count:cWeek },
    { key:'upcoming', label:'UPCOMING',  count:cUpcoming },
    { key:'all',      label:'ALL',       count:cAll },
  ];
  // Primary pills are single-select and always visible (even at 0) —
  // clicking one resets the state subfilter to none (`''`).
  const primaryHTML = primaryOpts.map(o => `<button class="pdm-filter-pill${o.key===primaryFilter?' active':''}"
    onclick="_pdmApplyFilterChange('${personId}','${o.key}','')"><span class="pdm-filter-count">${o.count}</span> ${o.label}</button>`).join('');

  // P4-R018c (discovery basis P4-D033/P4-D034, owner correction after
  // product validation of P4-R018b-redo's global-OVERDUE-everywhere model,
  // found still confusing in real use): OVERDUE is a selectable subfilter
  // only under ALL — TODAY/THIS WEEK/UPCOMING offer only ACTIVE/DONE.
  // counts.overdue (from the unchanged, still-scoped _pdmFilterCounts)
  // already equals the person's true total exactly when primaryFilter is
  // 'all' (scope === items there), so no widened/global computation is
  // needed here at all. ALL's own subpill order is owner-specified:
  // OVERDUE, ACTIVE, DONE.
  const stateOpts = (primaryFilter === 'all'
    ? [
        { key:'overdue', label:'OVERDUE', count:counts.overdue },
        { key:'active',  label:'ACTIVE',  count:counts.active },
        { key:'done',    label:'DONE',    count:counts.done },
      ]
    : [
        { key:'active',  label:'ACTIVE',  count:counts.active },
        { key:'done',    label:'DONE',    count:counts.done },
      ]
  ).filter(o => o.count > 0);
  // State pills are single-select — clicking the already-active pill
  // clears it back to `''` ("no state selected" = show all states within
  // the selected primary); clicking a different pill selects only that one.
  const stateHTML = stateOpts.map(o => {
    const active = stateFilter === o.key;
    const nextState = active ? '' : o.key;
    return `<button class="pdm-filter-pill pdm-filter-pill-sub${active ? ' active' : ''}"
      onclick="_pdmApplyFilterChange('${personId}','${primaryFilter}','${nextState}')"><span class="pdm-filter-count">${o.count}</span> ${o.label}</button>`;
  }).join('');

  return `<div id="pdm-filter-panel" class="pdm-filter-panel">
    <div class="pdm-primary-filters">${primaryHTML}</div>
    ${stateOpts.length ? `<div class="pdm-subfilters">${stateHTML}</div>` : ''}
  </div>`;
}
// Swaps the filter panel + activity list together, so subfilter
// visibility/counts (which depend on the primary filter) always stay in
// sync with the list — used for both primary and state-subfilter pill
// clicks. `stateFilter` is now a single string (`''`/`'active'`/`'overdue'`/
// `'done'`) rather than an array, so no JSON.stringify/quote-escaping is
// needed in the onclick attributes built by _pdmBuildFilterPanel above.
function _pdmApplyFilterChange(personId, primaryFilter, stateFilter) {
  const panel = document.getElementById('pdm-filter-panel');
  const list  = document.getElementById('pdm-list');
  if (!panel || !list) return;
  panel.outerHTML = _pdmBuildFilterPanel(personId, primaryFilter, stateFilter);
  list.innerHTML  = _pdmList(personId, primaryFilter, stateFilter);
  // P4-R016c: keep the currently-open-Person-Detail tracker current so
  // changeItemPriority/changeItemStatus's refresh hook always uses the
  // actually-selected filter state — see _pdmRefreshIfOpen below.
  // P4-R017a: this function only ever runs while LIST is the active view
  // (the filter panel/#pdm-list only exist in the DOM in LIST mode), so
  // `view` stays 'list' here — but `dayOffset` must be preserved rather
  // than dropped, so a Schedule date the user already navigated to isn't
  // silently lost the next time they click a LIST filter pill.
  const _prior = STATE.pdmOpen;
  const view = (_prior && _prior.personId === personId) ? (_prior.view || 'list') : 'list';
  const dayOffset = (_prior && _prior.personId === personId && typeof _prior.dayOffset === 'number') ? _prior.dayOffset : 0;
  STATE.pdmOpen = { personId, primaryFilter, stateFilter, view, dayOffset };
}

// P4-R016c (discovery basis P4-D028): guarded refresh hook so a Priority/
// Status edit made anywhere (a future Person Detail chip, or any other
// surface while Person Detail happens to be open) keeps Person Detail's
// list/pill-counts/sort correct without navigating away. No-ops safely when
// Person Detail isn't open. Reuses _pdmApplyFilterChange verbatim — same
// personId/primaryFilter/stateFilter the user currently has selected are
// passed through unchanged; this never auto-switches the visible filter.
function _pdmRefreshIfOpen() {
  const s = STATE.pdmOpen;
  if (!s) return;
  // P4-R017a (discovery basis P4-D029 §12/§13): branch by the currently
  // selected view before doing anything else. LIST/undefined-view
  // behavior below is byte-identical to P4-R016c/d — a Priority/Status
  // edit still refreshes the Activity list exactly as before.
  // P4-R017b: SCHEDULE now has real agenda content (SCHEDULED/UNSCHEDULED/
  // DUE/ONGOING/OVERDUE sections, per P4-R017b-fix1) that can change
  // membership when a Priority/Status edit happens on any surface while
  // Person Detail is open in SCHEDULE — e.g. marking
  // an overdue task Completed elsewhere must remove it from the OVERDUE
  // group here, the same "flows out of view" behavior LIST already has.
  // Rebuilds #pdm-view-body at the same, unchanged personId/dayOffset/
  // scheduleFilters — mirrors _pdmChangeScheduleDay's own swap exactly, just
  // without moving the selected date. P4-R017d: Schedule cards' own
  // Priority/Status chips are now interactive (_buildPriorityBadge/
  // _buildStatusBadge, same as LIST), so this same rebuild also handles
  // edits made directly from a Schedule card, not just from LIST/TEE
  // Detail/Today/Board/Planner while Schedule happens to be the currently-
  // visible view — no separate code path was needed, since
  // changeItemPriority/changeItemStatus already call this hook unconditionally
  // regardless of where the edit originated. _pdmBuildScheduleAgenda
  // recomputes section membership/counts fresh from STATE.items on every
  // call and re-sanitizes scheduleFilters against those fresh counts (see
  // its own comment), so a Status change that moves an item out of its
  // current section, or a filter that goes to zero-count as a result, both
  // self-heal automatically through this same rebuild.
  if ((s.view || 'list') === 'schedule') {
    const bodyEl = document.getElementById('pdm-view-body');
    if (!bodyEl) return;
    bodyEl.innerHTML = _pdmBuildSchedulePanel(s.personId, s.primaryFilter, s.stateFilter, s.dayOffset, s.scheduleFilters);
    return;
  }
  if (!document.getElementById('pdm-filter-panel') || !document.getElementById('pdm-list')) return;
  _pdmApplyFilterChange(s.personId, s.primaryFilter, s.stateFilter);
}

// ── Person Detail LIST | SCHEDULE view switch (P4-R017a, discovery basis
// P4-D029) ───────────────────────────────────────────────────────────────
// Foundation/skeleton stage only — see P4-D029 §14 for the full staging
// plan. LIST mode is unchanged existing Activity behavior (filter panel +
// #pdm-list). SCHEDULE mode is a compact date-nav row plus an empty-state
// panel only; no real agenda content, no Task List section, no Schedule
// section, and no Planner hourly-grid reuse — all explicitly deferred to
// later checkpoints (P4-R017b+).

// Factors LIST-mode content (filter panel + activity list) so both the
// initial modal render and _pdmApplyViewChange's LIST-mode swap share one
// implementation. _pdmBuildFilterPanel/_pdmList themselves are unchanged.
function _pdmBuildListPanel(personId, primaryFilter, stateFilter) {
  return `${_pdmBuildFilterPanel(personId, primaryFilter, stateFilter)}<div id="pdm-list" class="pdm-list-wrap">${_pdmList(personId, primaryFilter, stateFilter)}</div>`;
}

// Full-width, evenly-split LIST | SCHEDULE segmented toggle — see
// .pdm-view-switch/.pdm-view-btn CSS. Deliberately does not embed
// primaryFilter/stateFilter/dayOffset in its onclick strings at all — see
// _pdmApplyViewChange below for why (those can change independently, via
// LIST filter-pill clicks or Schedule day-nav clicks, without this switch
// itself ever being rebuilt in between).
function _pdmBuildViewSwitch(personId, view) {
  return `<div id="pdm-view-switch" class="pdm-view-switch">
    <button class="pdm-view-btn${view==='list'?' active':''}" onclick="_pdmApplyViewChange('${personId}','list')">LIST</button>
    <button class="pdm-view-btn${view==='schedule'?' active':''}" onclick="_pdmApplyViewChange('${personId}','schedule')">SCHEDULE</button>
  </div>`;
}

// Swaps between LIST and SCHEDULE content inside #pdm-view-body, and
// rebuilds #pdm-view-switch so its active-state styling reflects the
// newly-selected view. Reads primaryFilter/stateFilter/dayOffset fresh from
// STATE.pdmOpen (if still open for the same person) rather than accepting
// them as arguments — a LIST filter-pill click (_pdmApplyFilterChange) or a
// Schedule day-nav click (_pdmChangeScheduleDay) can each change part of
// that state without ever touching #pdm-view-switch, so baking any of it
// into this switch's own onclick strings would go stale the moment either
// of those ran. Reading from STATE.pdmOpen at click time is the single
// source of truth and avoids that class of bug entirely.
function _pdmApplyViewChange(personId, view) {
  const switchEl = document.getElementById('pdm-view-switch');
  const bodyEl   = document.getElementById('pdm-view-body');
  if (!switchEl || !bodyEl) return;
  if (!['list','schedule'].includes(view)) view = 'list';
  const prior = STATE.pdmOpen;
  const same  = prior && prior.personId === personId;
  const primaryFilter = same ? prior.primaryFilter : 'all';
  const stateFilter   = same ? prior.stateFilter   : '';
  const dayOffset      = (same && typeof prior.dayOffset === 'number') ? prior.dayOffset : 0;
  // P4-R017c: scheduleFilters follows the same "read fresh from
  // STATE.pdmOpen for the same person, otherwise reset" rule dayOffset
  // already used above — switching LIST->SCHEDULE->LIST->SCHEDULE for the
  // same person preserves whatever Schedule filters were active; switching
  // to a different person's modal always starts with no filters.
  const scheduleFilters = same ? _pdmNormalizeScheduleFilters(prior.scheduleFilters) : [];
  switchEl.outerHTML = _pdmBuildViewSwitch(personId, view);
  bodyEl.innerHTML = view === 'schedule'
    ? _pdmBuildSchedulePanel(personId, primaryFilter, stateFilter, dayOffset, scheduleFilters)
    : _pdmBuildListPanel(personId, primaryFilter, stateFilter);
  STATE.pdmOpen = { personId, primaryFilter, stateFilter, view, dayOffset, scheduleFilters };
}

// Mirrors Planner's own Day-view date-label computation (renderPlanner's
// `navLabel` for view==='day'), scoped to Person Detail's own Schedule
// skeleton — reads the same TODAY/date primitives Planner already uses, no
// new date math introduced.
function _pdmScheduleDateLabel(dayOffset) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + (dayOffset || 0));
  return d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
}

// P4-R017c (discovery basis P4-D029): the five valid Schedule count-pill
// filter keys, one-to-one with _pdmScheduleItems' own section keys. Shared
// by _pdmNormalizeScheduleFilters below and by every function that reads/
// writes STATE.pdmOpen.scheduleFilters, so "which keys are valid" is
// defined in exactly one place.
const PDM_SCHEDULE_FILTER_KEYS = ['scheduled', 'unscheduled', 'due', 'ongoing', 'overdue'];

// Normalizes a Schedule filter value into a clean array of valid keys.
// Accepts either a real array (STATE.pdmOpen.scheduleFilters' own shape) or
// a comma-delimited string (what a Schedule card's reopen-closure onclick
// attribute embeds, avoiding array-literal/quote-escaping issues inside a
// double-quoted onclick="..." attribute — see _pdmBuildScheduleCard).
// Unrecognized keys and empty/undefined input both safely normalize to []
// (no filters = show all non-zero sections, P4-R017b's existing behavior).
function _pdmNormalizeScheduleFilters(raw) {
  let arr = raw;
  if (typeof arr === 'string') arr = arr ? arr.split(',') : [];
  if (!Array.isArray(arr)) arr = [];
  return arr.filter(k => PDM_SCHEDULE_FILTER_KEYS.includes(k));
}

// Schedule mode's compact date-nav row plus its agenda content (P4-R017b:
// real SCHEDULED/UNSCHEDULED/DUE/ONGOING/OVERDUE agenda content, per
// P4-R017b-fix1's section model — see _pdmBuildScheduleAgenda below).
// Reuses the same flex:1/min-height:0/overflow-y:auto scroll-region
// shape #pdm-list-wrap already uses (see .pdm-schedule-panel CSS).
// P4-R017c: scheduleFilters is threaded through unchanged to the date-nav
// buttons (baked as a comma-string literal, so a Previous/Next/Today click
// preserves whatever filters are currently active — see
// _pdmChangeScheduleDay) and down into _pdmBuildScheduleAgenda, which is
// the single place that both sanitizes it against the new date's counts and
// renders the pill row/sections accordingly.
function _pdmBuildSchedulePanel(personId, primaryFilter, stateFilter, dayOffset, scheduleFilters) {
  dayOffset = (typeof dayOffset === 'number' && isFinite(dayOffset)) ? dayOffset : 0;
  scheduleFilters = _pdmNormalizeScheduleFilters(scheduleFilters);
  const filtersStr = scheduleFilters.join(',');
  const label = _pdmScheduleDateLabel(dayOffset);
  return `<div class="pdm-schedule-panel">
    <div class="pdm-schedule-nav">
      <button class="pdm-schedule-nav-btn" onclick="_pdmChangeScheduleDay('${personId}','${primaryFilter}','${stateFilter}',-1,'${filtersStr}')" title="Previous day">‹</button>
      <div class="pdm-schedule-date">${label}</div>
      <button class="pdm-schedule-nav-btn" onclick="_pdmChangeScheduleDay('${personId}','${primaryFilter}','${stateFilter}',1,'${filtersStr}')" title="Next day">›</button>
      <button class="pdm-schedule-today-btn" onclick="_pdmChangeScheduleDay('${personId}','${primaryFilter}','${stateFilter}',0,'${filtersStr}')">Today</button>
    </div>
    ${_pdmBuildScheduleAgenda(personId, primaryFilter, stateFilter, dayOffset, scheduleFilters)}
  </div>`;
}

// ── Person Detail Schedule agenda content (P4-R017b, discovery/
// implementation basis P4-D029; section model corrected by P4-R017b-fix1
// per owner review) ───────────────────────────────────────────────────────
// Compact flat agenda list, not a grid — five sections, in this fixed
// order: SCHEDULED (timed Events/Entries), UNSCHEDULED (untimed
// Events/Entries), DUE, ONGOING, OVERDUE. ONGOING/OVERDUE are collapsible,
// collapsed by default. No Task List section, no Open Tasks bucket
// unrelated to the selected date, no Planner hourly-grid reuse — all
// explicitly deferred per P4-D029 §14 staging. Cards reuse Person Detail's
// own existing `.pdm-activity-*` visual language (the same classes
// `_pdmList`'s LIST cards already use) rather than importing Planner's
// `.planner-day-card` style, per §7 of the discovery. Priority/Status are
// display-only in this checkpoint (see _pdmBuildScheduleCard) — Schedule
// chip interaction parity is deferred.

// Resolves a Schedule dayOffset to its concrete YYYY-MM-DD date string.
// Mirrors _pdmScheduleDateLabel's own date construction (P4-R017a) but
// returns the raw date string instead of a display label — kept as a
// separate small helper rather than refactoring _pdmScheduleDateLabel
// itself, so that already-verified P4-R017a function is left untouched.
function _pdmSelectedScheduleDate(dayOffset) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + (dayOffset || 0));
  return fmtDate(d);
}

// Person-scoped Lead/Contributor/Participant relationship for a Schedule
// card — mirrors _pdmList's own local classify()'s relationship logic
// exactly (Task: Lead if parseAssignees().lead matches; Contributor
// otherwise. Event/Entry: always Participant, no lead concept), so LIST
// and SCHEDULE describe relationship identically.
function _pdmScheduleItemRelationship(item, personName) {
  if (item.type !== 'task') return { label: 'Participant', cls: 'role-participant' };
  const { lead } = parseAssignees(item.assignees || '');
  return lead === personName ? { label: 'Lead', cls: 'role-lead' } : { label: 'Contributor', cls: 'role-contrib' };
}

// Computes the five Schedule agenda sections for a person + selected date
// (P4-R017b-fix1 owner-directed section model, replacing P4-R017b's
// original OVERDUE/SCHEDULE/DUE three-group model).
// SCHEDULED: timed Events + timed Entries whose own .date matches the
// selected date, sorted by .time ascending — matches Planner Day View's
// own Schedule definition exactly (tasks have no time field).
// UNSCHEDULED: Events + Entries on the selected date with NO time value —
// sorted Events-before-Entries, then title, for a simple predictable order.
// DUE: open (not done, not already in OVERDUE) tasks whose dueDate matches
// the selected date, sorted by priority — the de-dup against OVERDUE
// prevents a task appearing in both sections when the selected date is in
// the past.
// ONGOING (corrected by P4-R017b-fix2, per owner review of fix1's stricter
// both-dates-required rule): open (not done, not overdue) tasks matching
// one of three date patterns, evaluated against the selected date:
//   1. Both startDate and dueDate present: startDate <= selectedDate <
//      dueDate.
//   2. Only dueDate present (no startDate): selectedDate < dueDate — a
//      future-due task with no explicit start is now considered "ongoing"
//      on any date before it's due, not excluded as fix1 did.
//   3. Only startDate present (no dueDate): selectedDate >= startDate — a
//      task that has started with no due date is "ongoing" from its start
//      date onward.
//   4. Neither date present: excluded — a truly dateless task has no
//      natural membership test and would otherwise become an unbounded,
//      always-open bucket, which this checkpoint continues to avoid.
// In every branch the comparison is a strict `<` against dueDate (never
// `<=`), so a task due exactly on the selected date is never double-counted
// in ONGOING — it already appears in DUE instead (mutual exclusivity is
// preserved by construction, not by a separate dueDate-equality check).
// OVERDUE: person-scoped tasks matching the existing _pdmIsOverdueItem
// predicate, unmodified — the same definition LIST's own OVERDUE state-
// subfilter and sort tier already use (always relative to actual today,
// task-only, excludes Completed), matching Planner Day View's own Open
// Tasks "overdue" definition (`daysUntil(dueDate) < 0`). Deliberately NOT
// relative to the selected Schedule date — reusing the one existing,
// already-proven overdue definition avoids inventing a second, date-
// relative variant. Placed last, per the owner-directed section order.
function _pdmScheduleItems(personId, dayOffset) {
  const p = STATE.people.find(x => x.id === personId);
  if (!p) return { scheduled: [], unscheduled: [], due: [], ongoing: [], overdue: [] };
  const dayDate = _pdmSelectedScheduleDate(dayOffset);
  const allItems = personItems(p.name);
  const priRank = pr => ({ Critical:0, High:1, Medium:2, Low:3 }[pr] ?? 9);

  const scheduled = allItems
    .filter(i => i.type !== 'task' && i.date === dayDate && !!i.time)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const unscheduled = allItems
    .filter(i => i.type !== 'task' && i.date === dayDate && !i.time)
    .sort((a, b) => {
      const typeRank = t => ({ event:0, entry:1 }[t] ?? 9);
      const ta = typeRank(a.type), tb = typeRank(b.type);
      if (ta !== tb) return ta - tb;
      return (a.title || '').localeCompare(b.title || '');
    });

  const overdue = allItems.filter(_pdmIsOverdueItem);

  const due = allItems
    .filter(i => i.type === 'task' && i.dueDate === dayDate && !_pdmIsDoneItem(i) && !_pdmIsOverdueItem(i))
    .sort((a, b) => priRank(a.priority) - priRank(b.priority));

  const ongoing = allItems
    .filter(i => {
      if (i.type !== 'task' || _pdmIsDoneItem(i) || _pdmIsOverdueItem(i)) return false;
      const hasStart = !!i.startDate, hasDue = !!i.dueDate;
      if (hasStart && hasDue) return i.startDate <= dayDate && dayDate < i.dueDate;
      if (!hasStart && hasDue) return dayDate < i.dueDate;
      if (hasStart && !hasDue) return dayDate >= i.startDate;
      return false; // neither date present — excluded, see comment above
    })
    .sort((a, b) => priRank(a.priority) - priRank(b.priority));

  return { scheduled, unscheduled, due, ongoing, overdue };
}

// Informational-only counts for the Schedule count-pill row —
// Scheduled/Unscheduled/Due/Ongoing/Overdue, person- and selected-date-
// scoped, one-to-one with the five agenda sections. Derived from
// _pdmScheduleItems so the pills can never disagree with what's actually
// rendered below them. Not clickable, not a new filter mechanism — see
// .pdm-schedule-count-pill CSS (cursor:default, no onclick). No schedule
// filter state is introduced (P4-R017b-fix1 explicit non-goal).
function _pdmScheduleCounts(personId, dayOffset) {
  const { scheduled, unscheduled, due, ongoing, overdue } = _pdmScheduleItems(personId, dayOffset);
  return {
    scheduled: scheduled.length,
    unscheduled: unscheduled.length,
    due: due.length,
    ongoing: ongoing.length,
    overdue: overdue.length,
  };
}

// Builds one compact Schedule agenda card — reuses the same
// `.pdm-activity-card`/`.pdm-activity-row*` visual language _pdmList's own
// LIST cards already use (P4-R015c), so Schedule cards read as a natural
// extension of Person Detail's existing card language rather than a second,
// differently-styled card system. Priority/Status — P4-R017d (discovery
// basis P4-D027/P4-D028): now reuse the existing shared
// _buildPriorityBadge(item)/_buildStatusBadge(item) helpers (the exact same
// ones LIST cards already wired up in P4-R016c/d, and TEE Detail/every GT
// card use too), in place of the prior local, plain, display-only
// `.pdm-activity-badge` spans. Clicking either opens the existing floating
// Priority/Status dropdown (openPriorityDropdown/openStatusDropdown) — both
// already call event.stopPropagation() internally, so the click does not
// also trigger this card's own onclick (_navTo → openTEEDetail); no new
// stopPropagation wrapper was needed. Selecting a new value uses the
// existing changeItemPriority/changeItemStatus → saveTEE() flow, unchanged —
// both already call the P4-R016c-introduced _pdmRefreshIfOpen() hook at
// their tail, and that hook's SCHEDULE branch (extended by P4-R017b) already
// rebuilds #pdm-view-body via _pdmBuildSchedulePanel for the same
// person/date/scheduleFilters, so Schedule refreshes in place automatically
// with no new refresh code required by this checkpoint. Tag chips and the
// Subtask Count chip continue to reuse the same shared interactive helpers
// (_navTo-wrapped tag click, _subtaskChip) they already used before this
// checkpoint.
function _pdmBuildScheduleCard(item, personId, primaryFilter, stateFilter, dayOffset, personName, scheduleFilters) {
  const filtersStr = (scheduleFilters || []).join(',');
  const pri = getPri(item.priority);
  const rel = _pdmScheduleItemRelationship(item, personName);
  const typeBadge = _buildTypeBadge(item.type);
  const statusBadge = _buildStatusBadge(item);
  const priorityBadge = _buildPriorityBadge(item);

  // Date/time meta always shows the item's own real date/time fields (not
  // a group-relative label), so the same card looks identical regardless
  // of which section (SCHEDULED/UNSCHEDULED/DUE/ONGOING/OVERDUE) it happens
  // to render under — mirrors _pdmList's own per-type date-text logic
  // exactly.
  let dateMeta = '';
  if (item.type === 'task') {
    dateMeta = item.dueDate || '';
  } else if (item.type === 'event') {
    dateMeta = item.date || '';
    const timeStr = fmtTimeRange(item.time, item.endTime);
    if (timeStr) dateMeta += (dateMeta ? ' · ' : '') + timeStr;
  } else {
    dateMeta = item.date || '';
    if (item.time) dateMeta += (dateMeta ? ' · ' : '') + fmtTime(item.time);
  }

  const days = item.type === 'task' ? daysUntil(item.dueDate) : null;
  let dueChip = '';
  if (days !== null) {
    if (days < 0)      dueChip = `<span class="due-chip due-over">${Math.abs(days)}d Over</span>`;
    else if (days===0) dueChip = `<span class="due-chip due-today">Today</span>`;
    else               dueChip = `<span class="due-chip due-warn">${days}d</span>`;
  }

  // Tag chips reuse the exact same _navTo-wrapped reopen-closure pattern
  // _pdmList's own LIST cards already use (P4-R016b) — extended with the
  // 'schedule'/dayOffset arguments so Back from Tag List returns to this
  // same Schedule date, not just LIST.
  const tagChips = (item.tags||[]).slice(0,2).map(tag => {
    const tc = tagColor(tag);
    return `<span class="pdm-activity-tag clickable" style="background:${tc.bg};color:${tc.text};border:1px solid ${tc.border}" onclick="event.stopPropagation();_navTo(()=>openPersonDetailModal('${personId}','${primaryFilter}','${stateFilter}','schedule',${dayOffset},'${filtersStr}'),()=>openTagList('${tag}'))"><span style="opacity:0.5">#</span>${tag}</span>`;
  }).join('');

  const subtaskChip = _subtaskChip(item);

  // Card body click reopens Person Detail in SCHEDULE at this same
  // selected date (not LIST) — the P4-D029 §13-recommended approach of
  // capturing view/dayOffset as literal reopen-closure arguments, matching
  // how primaryFilter/stateFilter are already captured for LIST cards.
  // P4-R017c: the active Schedule filters (filtersStr, a comma-joined
  // string) are captured the same way, so Back from TEE Detail restores
  // not just the same date but the same filtered/unfiltered view.
  return `<div class="pdm-activity-card"
    style="border-left-color:${pri.bar||pri.bg}"
    onclick="_navTo(()=>openPersonDetailModal('${personId}','${primaryFilter}','${stateFilter}','schedule',${dayOffset},'${filtersStr}'),()=>openTEEDetail('${item.id}'))">
    <div class="pdm-activity-row">
      <div class="pdm-activity-row-left">
        ${typeBadge}
        ${priorityBadge}
        ${statusBadge}
      </div>
      <div class="pdm-activity-row-right">
        ${subtaskChip}
      </div>
    </div>
    <div class="pdm-activity-row">
      <div class="pdm-activity-row-left">
        <div class="pdm-activity-title">${item.title}</div>
      </div>
      <div class="pdm-activity-row-right">
        <span class="pdm-activity-role ${rel.cls}">${rel.label}</span>
      </div>
    </div>
    <div class="pdm-activity-row">
      <div class="pdm-activity-row-left">
        ${tagChips}
      </div>
      <div class="pdm-activity-row-right">
        ${dueChip}
        ${dateMeta ? `<span class="pdm-activity-date">${dateMeta}</span>` : ''}
      </div>
    </div>
    ${(item.type==='ideal'||item.type==='temporary') ? `<div class="pdm-activity-row">${_categoryProgressStripHTML(item)}</div>` : ''}
  </div>`;
}

// Assembles the full Schedule agenda: the count-pill row (P4-R017c: now
// clickable filter controls), then five sections in the owner-directed
// order — SCHEDULED, UNSCHEDULED, DUE, ONGOING, OVERDUE — each rendered
// only when it has content AND (if filters are active) is one of the
// selected sections, or a single meaningful empty state when all five are
// truly empty for the day. SCHEDULED/UNSCHEDULED/DUE reuse the existing
// `.pdm-group-divider` class (defined since P4-R015c, previously unused/
// dead CSS after that checkpoint's flat-list redesign removed group headers
// from LIST) for their plain, non-collapsible labels. ONGOING/OVERDUE are
// collapsible (collapsed by default, per owner direction — P4-R017c:
// auto-expanded instead when their own pill is an active filter, see
// buildCollapsibleSection below); collapse state is local DOM-only (no
// STATE tracking), so it resets on every date change / modal reopen /
// filter toggle, matching the owner's own "acceptable to reset" guidance
// rather than overbuilding persistent collapse state.
function _pdmBuildScheduleAgenda(personId, primaryFilter, stateFilter, dayOffset, scheduleFilters) {
  const p = STATE.people.find(x => x.id === personId);
  if (!p) return '';
  const { scheduled, unscheduled, due, ongoing, overdue } = _pdmScheduleItems(personId, dayOffset);
  const counts = _pdmScheduleCounts(personId, dayOffset);

  // P4-R017c: sanitize the incoming filter selection against THIS date's
  // counts — a filter key whose section has gone to zero on the new date
  // (e.g. navigating away from the one day an Ongoing-filtered task was
  // active) is silently dropped rather than producing a blank filtered
  // view. This single line is what satisfies the "preserve filters across
  // date nav, but recover automatically when they go stale" requirement:
  // every render (day-nav, filter-pill click, view-switch, refresh-hook)
  // funnels through here, so there is exactly one place this rule lives.
  // An empty result after sanitizing is indistinguishable from "no filters
  // were ever selected" — both mean "show all non-zero sections," which is
  // exactly the desired fallback.
  const activeFilters = _pdmNormalizeScheduleFilters(scheduleFilters).filter(k => counts[k] > 0);
  const filtersOn = activeFilters.length > 0;
  // Section-visibility predicate used below — with no active filters, every
  // section with content shows (P4-R017b's original all-view behavior,
  // unchanged); with active filters, only the selected sections show.
  const sectionVisible = key => !filtersOn || activeFilters.includes(key);

  // P4-R017b-fix2: only render pills for sections with a non-zero count
  // (owner review of fix1 found five always-visible pills too bulky/wrap-
  // prone) — and render no pill row at all when every count is 0 (the
  // empty-state branch below already covers that case on its own).
  // P4-R017c: pills are now clickable filter controls — no ALL pill (per
  // explicit non-goal), multi-select (clicking toggles that one key in/out
  // of activeFilters, several can be active together), active state shown
  // via the .active class (see CSS). Labels are unchanged from P4-R017b.
  const pillDefs = [
    { key: 'scheduled',   label: 'SCHEDULED'   },
    { key: 'unscheduled', label: 'UNSCHEDULED' },
    { key: 'due',         label: 'DUE'         },
    { key: 'ongoing',     label: 'ONGOING'     },
    { key: 'overdue',     label: 'OVERDUE'     },
  ];
  const pillsHTML = pillDefs
    .filter(d => counts[d.key] > 0)
    .map(d => {
      const isActive = activeFilters.includes(d.key);
      return `<span class="pdm-schedule-count-pill${isActive ? ' active' : ''}" onclick="_pdmToggleScheduleFilter('${personId}','${d.key}')" role="button" tabindex="0" aria-pressed="${isActive}" title="${isActive ? 'Click to clear this filter' : 'Click to filter by ' + d.label}"><span class="pdm-filter-count">${counts[d.key]}</span> ${d.label}</span>`;
    })
    .join('');
  const countsHTML = pillsHTML ? `<div class="pdm-schedule-counts">${pillsHTML}</div>` : '';

  const buildSection = (key, label, items) => {
    if (!items.length || !sectionVisible(key)) return '';
    const cards = items.map(item => _pdmBuildScheduleCard(item, personId, primaryFilter, stateFilter, dayOffset, p.name, activeFilters)).join('');
    return `<div class="pdm-group-divider">${label}</div>${cards}`;
  };

  // Collapsed by default (`pdm-schedule-section collapsed`) — the header's
  // own onclick toggles the `collapsed` class on its own ancestor via
  // .closest(), a self-contained local DOM toggle with no STATE dependency
  // and no re-render, so it can never interfere with the SCHEDULE
  // refresh/date-nav mechanisms above it. P4-R017c: when this section's own
  // pill is an active filter, it renders already-expanded (the `collapsed`
  // class is simply omitted) — the user is looking at this section
  // specifically because they filtered to it, so collapsing it by default
  // would work against the filter's own purpose. The user can still
  // manually collapse it afterward via the same header click; that manual
  // choice is local DOM state and isn't tracked or reapplied on the next
  // rebuild, same as the existing collapse/expand behavior.
  const buildCollapsibleSection = (key, label, items) => {
    if (!items.length || !sectionVisible(key)) return '';
    const cards = items.map(item => _pdmBuildScheduleCard(item, personId, primaryFilter, stateFilter, dayOffset, p.name, activeFilters)).join('');
    const startExpanded = activeFilters.includes(key);
    return `<div class="pdm-schedule-section${startExpanded ? '' : ' collapsed'}">
      <div class="pdm-group-divider pdm-schedule-section-hdr" onclick="this.closest('.pdm-schedule-section').classList.toggle('collapsed')">${label} (${items.length}) <span class="pdm-schedule-section-chevron"></span></div>
      <div class="pdm-schedule-section-body">${cards}</div>
    </div>`;
  };

  if (!scheduled.length && !unscheduled.length && !due.length && !ongoing.length && !overdue.length) {
    return `${countsHTML}<div class="pdm-schedule-empty">No schedule items for this day.<br>This person has no scheduled, unscheduled, due, ongoing, or overdue items for the selected date.</div>`;
  }

  const sectionsHTML =
    buildSection('scheduled', 'SCHEDULED', scheduled) +
    buildSection('unscheduled', 'UNSCHEDULED', unscheduled) +
    buildSection('due', 'DUE', due) +
    buildCollapsibleSection('ongoing', 'ONGOING', ongoing) +
    buildCollapsibleSection('overdue', 'OVERDUE', overdue);
  return `${countsHTML}<div class="pdm-schedule-agenda">${sectionsHTML}</div>`;
}

// Previous/Next/Today navigation for the Schedule skeleton — swaps only
// #pdm-view-body's content (the view switch itself never needs rebuilding
// here, since it no longer embeds dayOffset at all — see
// _pdmApplyViewChange above). dir: -1 (previous day), 1 (next day), 0
// (jump to today).
// P4-R017c: scheduleFiltersStr is the comma-string baked into this same
// button by _pdmBuildSchedulePanel at the last render — since every
// Schedule action (day-nav click or filter-pill click) rebuilds the whole
// panel, it is always current, the same way primaryFilter/stateFilter are
// already baked-and-trusted here rather than re-read from STATE. Whichever
// filters were active carry over to the new date; _pdmBuildScheduleAgenda
// is responsible for dropping any that are now zero-count on that date (see
// its own comment for the sanitization rule).
function _pdmChangeScheduleDay(personId, primaryFilter, stateFilter, dir, scheduleFiltersStr) {
  const bodyEl = document.getElementById('pdm-view-body');
  if (!bodyEl) return;
  const prior = STATE.pdmOpen;
  const current = (prior && prior.personId === personId && typeof prior.dayOffset === 'number') ? prior.dayOffset : 0;
  const dayOffset = dir === 0 ? 0 : current + dir;
  const scheduleFilters = _pdmNormalizeScheduleFilters(scheduleFiltersStr);
  bodyEl.innerHTML = _pdmBuildSchedulePanel(personId, primaryFilter, stateFilter, dayOffset, scheduleFilters);
  STATE.pdmOpen = { personId, primaryFilter, stateFilter, view: 'schedule', dayOffset, scheduleFilters };
}

// P4-R017c: toggles one Schedule count-pill filter on/off for the currently
// open Person Detail modal, then rebuilds #pdm-view-body the same way
// _pdmChangeScheduleDay does — the whole Schedule panel (date-nav + agenda)
// is small enough that rebuilding it wholesale is simpler and safer than a
// narrower partial update, and keeps every onclick string embedded in the
// rebuilt nav/pills/cards consistently up to date in one place (matching
// the pattern already established by day-nav/view-switch clicks). Does not
// touch primaryFilter/stateFilter/LIST state at all — STATE.pdmOpen's
// personId/primaryFilter/stateFilter/dayOffset are all read fresh and
// carried through unchanged, only scheduleFilters and view are affected.
function _pdmToggleScheduleFilter(personId, filterKey) {
  const bodyEl = document.getElementById('pdm-view-body');
  if (!bodyEl) return;
  const prior = STATE.pdmOpen;
  const same  = prior && prior.personId === personId;
  const primaryFilter = same ? prior.primaryFilter : 'all';
  const stateFilter   = same ? prior.stateFilter   : '';
  const dayOffset      = (same && typeof prior.dayOffset === 'number') ? prior.dayOffset : 0;
  const current = same ? _pdmNormalizeScheduleFilters(prior.scheduleFilters) : [];
  // Toggle: remove if already active (clicking an active pill again
  // unselects it, per P4-R017c §A), otherwise add (multi-select — several
  // pills can be active at once, no "single-select only" behavior).
  const scheduleFilters = current.includes(filterKey)
    ? current.filter(k => k !== filterKey)
    : [...current, filterKey];
  bodyEl.innerHTML = _pdmBuildSchedulePanel(personId, primaryFilter, stateFilter, dayOffset, scheduleFilters);
  STATE.pdmOpen = { personId, primaryFilter, stateFilter, view: 'schedule', dayOffset, scheduleFilters };
}

// Separated from openPersonDetailModal so filter-pill clicks can swap only the list div
// P4-R015c-fix3: owner-locked flat-list model — replaces P4-R015c-fix2's
// OVERDUE/ACTIVE/DONE collapsible groups (and P4-R015b's earlier TASKS/
// EVENTS/ENTRIES type groups) entirely with one continuous sorted list, no
// group headers, no collapse/expand controls.
function _pdmList(personId, primaryFilter, stateFilter) {
  const p = STATE.people.find(x => x.id === personId);
  if (!p) return '';
  if (!['today','week','upcoming','all'].includes(primaryFilter)) primaryFilter = 'all';
  if (!['active','overdue','done'].includes(stateFilter)) stateFilter = '';
  const todayStr = fmtDate(TODAY);
  const allItems = personItems(p.name);
  const filtered = _pdmApplyFilters(allItems, primaryFilter, stateFilter);

  // isDone mirrors _pdmIsDoneItem's own status-based definition exactly
  // (state is Completed or Done) so the visual "done" state (opacity/
  // strikethrough) always agrees with filter membership; _pdmIsDoneItem
  // itself is unchanged, only called.
  const classify = item => {
    const isDone = _pdmIsDoneItem(item);
    // Events and entries have no lead — all are participants, treat as lead (no muting)
    if (item.type !== 'task') return { isDone, isLead: true };
    const { lead } = parseAssignees(item.assignees||'');
    return { isDone, isLead: lead === p.name };
  };

  // P4-R015c-fix4: owner-corrected flat sort order — State/status (OVERDUE→
  // ACTIVE→DONE) → Type (Task→Event→Entry) → Relationship (Lead→
  // Contributor→Participant) → Priority (Critical→High→Medium→Low) → Time
  // (earlier relevant date first, dueDate for Tasks / date for
  // Events+Entries only — no startDate fallback, per the owner's explicit
  // spec) → stable fallback (original array index). Replaces fix3's
  // Type-first order (owner review: state should sort before type so that,
  // with no state subfilter selected, Overdue items lead, Active items
  // follow, and Done items trail). State membership reuses the same
  // _pdmIsDoneItem/_pdmIsOverdueItem predicates the filter/classify logic
  // above already uses — no completion-date logic and no
  // parseStatus().doneAt usage, per the same constraint carried over from
  // every prior pass.
  const stateRankOf = item => {
    if (_pdmIsDoneItem(item))    return 2; // DONE
    if (_pdmIsOverdueItem(item)) return 0; // OVERDUE
    return 1; // ACTIVE
  };
  const typeRank = t => ({ task:0, event:1, entry:2 }[t] ?? 9);
  const roleRankOf = item => {
    if (item.type !== 'task') return 2; // Participant
    return classify(item).isLead ? 0 : 1; // Lead : Contributor
  };
  const priRank = pr => ({ Critical:0, High:1, Medium:2, Low:3 }[pr] ?? 9);
  const sortDateOf = item => {
    const d = item.type === 'task' ? (item.dueDate || '') : (item.date || '');
    return d || '9999-99-99';
  };

  // P4-R018c: factored into a reusable local sorter so the new grouped
  // sections below (Today/This Week/Upcoming/Overdue/Active/Done dividers)
  // can each sort their own sub-array with the exact same comparator,
  // instead of duplicating it.
  const sortItems = arr => arr
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => {
      const sa = stateRankOf(a.item), sb = stateRankOf(b.item);
      if (sa !== sb) return sa - sb;
      const ta = typeRank(a.item.type), tb = typeRank(b.item.type);
      if (ta !== tb) return ta - tb;
      const ra = roleRankOf(a.item), rb = roleRankOf(b.item);
      if (ra !== rb) return ra - rb;
      const pa = priRank(a.item.priority), pb = priRank(b.item.priority);
      if (pa !== pb) return pa - pb;
      const da = sortDateOf(a.item), db = sortDateOf(b.item);
      if (da !== db) return da < db ? -1 : 1;
      return a.idx - b.idx; // stable fallback
    })
    .map(x => x.item);
  const sorted = sortItems(filtered);

  const renderItem = item => {
    const pri = getPri(item.priority);
    const { isDone, isLead } = classify(item);
    const doneClass = isDone ? 'is-done' : '';

    // P4-R015c-fix1: relationship is shown only via this chip — it no
    // longer drives card opacity/muting (see .pdm-activity-card CSS
    // comment above). Events/Entries have no lead concept — personItems()'s
    // own "lead or participant" membership test treats everyone shown as
    // a participant.
    const roleLabel = item.type === 'task' ? (isLead ? 'Lead' : 'Contributor') : 'Participant';
    const roleClass = item.type === 'task' ? (isLead ? 'role-lead' : 'role-contrib') : 'role-participant';

    // Row 3 right, part 1: specific date-pressure/countdown chip — task-
    // only (events/entries have no due-date concept anywhere else in the
    // app, matching _pdmIsOverdueItem's own scope). P4-R015c-fix3: owner
    // review found the countdown chip was silently omitted for any task
    // due more than 2 days out (fix1/fix2's `days<=2` cap) — the far-
    // future countdown chip (e.g. "25d") must not be omitted, so any
    // positive day count now renders via the same existing `.due-warn`
    // chip class (no new class introduced for this).
    const days = item.type === 'task' ? daysUntil(item.dueDate) : null;
    let dueChip = '';
    if (days !== null) {
      if (days < 0)      dueChip = `<span class="due-chip due-over">${Math.abs(days)}d Over</span>`;
      else if (days===0) dueChip = `<span class="due-chip due-today">Today</span>`;
      else               dueChip = `<span class="due-chip due-warn">${days}d</span>`;
    }

    // Row 3 right, part 2: actual date/time text — built from each item's
    // own existing date/time fields only (dueDate/startDate for tasks,
    // date/time/endTime for events, date/time for entries) — no new date
    // semantics; P4-R015b-fix1's TODAY/THIS WEEK/OVERDUE definitions are
    // untouched by this display-only change.
    // P4-R015c-fix2: owner review — Task cards now show only the plain due
    // date (no "Due " prefix, no Start→Due range), matching the mental
    // model used elsewhere in the app; startDate is still read above for
    // the Starting Today context chip, just no longer shown on this line.
    // If there's no dueDate, the line is simply omitted (no invented date).
    let dateMeta = '';
    if (item.type === 'task') {
      dateMeta = item.dueDate || '';
    } else if (item.type === 'event') {
      dateMeta = item.date || '';
      const timeStr = fmtTimeRange(item.time, item.endTime);
      if (timeStr) dateMeta += (dateMeta ? ' · ' : '') + timeStr;
    } else {
      dateMeta = item.date || '';
      if (item.time) dateMeta += (dateMeta ? ' · ' : '') + fmtTime(item.time);
    }

    // Row 1 right: the single strongest applicable context chip only
    // (Overdue > Due Today > Starting Today), mirroring _buildContextChips'
    // own precedence — built locally/read-only rather than reusing that
    // shared helper, since it also renders a "type" argument shape this
    // call site doesn't have. Overdue and Starting Today remain task-only
    // (no due-date/start-date concept for events/entries elsewhere in the
    // app); Due Today applies to any type via its own date field.
    let contextChip = '';
    if (!isDone) {
      if (_pdmIsOverdueItem(item)) {
        contextChip = `<span class="pdm-activity-chip ctx-overdue">Overdue</span>`;
      } else {
        const dueTodayNow = item.type === 'task' ? item.dueDate === todayStr : item.date === todayStr;
        const startsTodayNow = item.type === 'task' && item.startDate === todayStr && item.dueDate !== todayStr;
        if (dueTodayNow) contextChip = `<span class="pdm-activity-chip ctx-due-today">Due Today</span>`;
        else if (startsTodayNow) contextChip = `<span class="pdm-activity-chip ctx-starts-today">Starting Today</span>`;
      }
    }

    // Row 1 left: Type/Priority/Status. Type reuses the existing unchanged
    // _buildTypeBadge (already a plain non-clickable span, so no separate
    // Person-Detail-scoped copy is needed). Priority — P4-R016c (discovery
    // basis P4-D028): reuses the existing shared _buildPriorityBadge(item)
    // helper (same one used by TEE Detail and every GT card) instead of a
    // local read-only span, so clicking it opens the existing floating
    // Priority dropdown (openPriorityDropdown) exactly as it already does
    // everywhere else in the app; unchanged in this checkpoint. Status —
    // P4-R016d (discovery basis P4-D028): now reuses the existing shared
    // _buildStatusBadge(item) helper (same one used by TEE Detail and every
    // GT card) instead of the prior local read-only span, so clicking it
    // opens the existing floating Status dropdown (openStatusDropdown)
    // exactly as it already does everywhere else in the app.
    // _buildStatusBadge's onclick already calls event.stopPropagation() via
    // openStatusDropdown, so it does not also trigger this card's own
    // onclick (_navTo → openTEEDetail). _buildStatusBadge itself is
    // unchanged. Selecting a new Status uses the existing changeItemStatus
    // → saveTEE() flow, which already calls the P4-R016c _pdmRefreshIfOpen()
    // hook at its tail — Person Detail refreshes immediately, preserving
    // the selected primary filter/state subfilter; if the item no longer
    // matches the current state subfilter it leaves the visible list via
    // the existing _pdmApplyFilters re-evaluation, with no new filter logic
    // added here.
    const typeBadge = _buildTypeBadge(item.type);
    const statusBadge = _buildStatusBadge(item);
    const priorityBadge = _buildPriorityBadge(item);

    // Row 3 left: tag chips — P4-R016b (discovery basis P4-D027): clickable,
    // navigating to the existing app-wide Tag List (openTagList), matching
    // TEE Detail's own tag behavior (_buildDetailTagRow's _navTo-wrapped
    // pattern) rather than the page-level GT-card pattern (_buildTagChip),
    // since Person Detail is modal-based and needs Back to return here
    // (_buildTagChip's bare stopPropagation-only pattern does not push a
    // reopen closure and would not preserve that). event.stopPropagation()
    // is added explicitly in this onclick (openTagList itself does not call
    // it internally, unlike openPriorityDropdown/openStatusDropdown/
    // openSubtaskPanel), so the click does not also trigger this card's own
    // onclick (_navTo → openTEEDetail). _navTo(()=>openPersonDetailModal(
    // personId,primaryFilter,stateFilter),()=>openTagList(tag)) reuses the
    // exact same reopen-closure shape this card's own click already uses, so
    // Back restores the same primary/state filter selection. Tag List
    // itself remains app-wide, not scoped to this person — openTagList,
    // _buildTagChip, and _buildDetailTagRow are all unchanged; the tag
    // value is embedded into the onclick attribute unescaped, matching the
    // existing convention both of those functions already use for tags
    // (neither escapes tag values today). Capped at 2 tags, unchanged from
    // P4-R015c. Kept as a <span> (not <button>) carrying a new `clickable`
    // modifier class, so the existing `.pdm-activity-tag` base rule (and any
    // future non-clickable use of it) stays byte-identical — only the new
    // `.pdm-activity-tag.clickable` rule below adds pointer/hover feedback.
    const tagChips = (item.tags||[]).slice(0,2).map(tag => {
      const tc = tagColor(tag);
      return `<span class="pdm-activity-tag clickable" style="background:${tc.bg};color:${tc.text};border:1px solid ${tc.border}" onclick="event.stopPropagation();_navTo(()=>openPersonDetailModal('${personId}','${primaryFilter}','${stateFilter}'),()=>openTagList('${tag}'))"><span style="opacity:0.5">#</span>${tag}</span>`;
    }).join('');

    // Row 1 right: subtask count — P4-R016a (discovery basis P4-D027):
    // reuses the existing shared _subtaskChip(item) helper (same one used by
    // Today/Overview, Board/Kanban, and Planner GT cards) instead of the
    // prior local read-only span, so clicking it opens the existing floating
    // subtask panel (openSubtaskPanel) exactly as it already does everywhere
    // else in the app. _subtaskChip already returns '' when the item has no
    // subtasks (preserving the prior "render nothing" behavior) and already
    // calls event.stopPropagation() in its own onclick, so it does not also
    // trigger this card's own onclick (_navTo → openTEEDetail) — no new
    // stopPropagation or _navTo wiring is added here. _subtaskChip itself is
    // unchanged.
    const subtaskChip = _subtaskChip(item);

    // P4-R015c-fix1: left border now always colored by Priority (via getPri,
    // the same theme-aware color logic used elsewhere), regardless of
    // Lead/Contributor/Participant — no relationship-based styling remains
    // on the card itself. Pass fromPerson so the task detail modal can show
    // a ‹ Back button. P4-R015b: the reopen closure carries the current
    // primaryFilter/state filter so Back from TEE Detail restores the same
    // filter selection instead of resetting to defaults. P4-R015c-fix3:
    // stateFilter is now a single string, not an array, so it's embedded
    // directly as a plain quoted literal — no JSON.stringify/HTML-entity
    // escaping is needed (there is no array/object to serialize anymore,
    // and stateFilter is always one of a small fixed safe token set).
    return `<div class="pdm-activity-card ${doneClass}"
      style="border-left-color:${pri.bar||pri.bg}"
      onclick="_navTo(()=>openPersonDetailModal('${personId}','${primaryFilter}','${stateFilter}'),()=>openTEEDetail('${item.id}'))">
      <div class="pdm-activity-row">
        <div class="pdm-activity-row-left">
          ${typeBadge}
          ${priorityBadge}
          ${statusBadge}
        </div>
        <div class="pdm-activity-row-right">
          ${contextChip}
          ${subtaskChip}
        </div>
      </div>
      <div class="pdm-activity-row">
        <div class="pdm-activity-row-left">
          <div class="pdm-activity-title">${item.title}</div>
        </div>
        <div class="pdm-activity-row-right">
          <span class="pdm-activity-role ${roleClass}">${roleLabel}</span>
        </div>
      </div>
      <div class="pdm-activity-row">
        <div class="pdm-activity-row-left">
          ${tagChips}
        </div>
        <div class="pdm-activity-row-right">
          ${dueChip}
          ${dateMeta ? `<span class="pdm-activity-date">${dateMeta}</span>` : ''}
        </div>
      </div>
    </div>`;
  };

  // P4-R015c-fix3: owner review of fix2 removed group headers/collapse
  // behavior entirely — the list is now one continuous flat list of cards
  // in the sort order computed above, no OVERDUE/ACTIVE/DONE or TASKS/
  // EVENTS/ENTRIES group headers, no collapse/expand controls.
  // `.pdm-state-done` mirrors fix2's `.pdm-primary-done` wrapper-class idea
  // (done cards read as too muted while the user is specifically viewing
  // them), but DONE is now a state subfilter rather than a primary filter,
  // so the trigger condition is `stateFilter === 'done'` instead of
  // `primaryFilter === 'done'` — see the matching CSS rule above. This
  // wrapper is added here only, so both the initial render (in
  // openPersonDetailModal) and the filter-pill-click swap (in
  // _pdmApplyFilterChange) automatically pick it up without either of
  // those functions needing any change of their own.
  const stateDoneClass = stateFilter === 'done' ? ' pdm-state-done' : '';

  // P4-R018c (discovery basis P4-D033/P4-D034, owner correction after
  // product validation of P4-R018b/P4-R018b-redo): TODAY/THIS WEEK/
  // UPCOMING no longer show a flat mixed list or a global-overdue section
  // — overdue items are not shown under these three primaries at all
  // (OVERDUE is only ever a selectable state under ALL, per
  // _pdmBuildFilterPanel above). Instead, each primary groups its own
  // ACTIVE-scoped content with static and/or collapsible dividers, reusing
  // the existing .pdm-group-divider look directly (same reuse Schedule's
  // own section headers already make) plus new, dedicated collapsible
  // classes for the DONE section specifically (.pdm-list-section*, copying
  // .pdm-schedule-section*'s visual recipe without sharing its selectors).
  // DONE's collapse state is DOM-only — no STATE tracking — and resets on
  // every rebuild, exactly matching Schedule's own already-shipped,
  // owner-approved "acceptable to reset" precedent.
  const buildStaticSection = (label, items) =>
    !items.length ? '' : `<div class="pdm-group-divider">${label} (${items.length})</div>${sortItems(items).map(renderItem).join('')}`;
  const buildCollapsibleSection = (label, items) =>
    !items.length ? '' : `<div class="pdm-list-section collapsed">
      <div class="pdm-group-divider pdm-list-section-hdr" onclick="this.closest('.pdm-list-section').classList.toggle('collapsed')">${label} (${items.length}) <span class="pdm-list-section-chevron"></span></div>
      <div class="pdm-list-section-body">${sortItems(items).map(renderItem).join('')}</div>
    </div>`;

  const groupedActive = ['today','week','upcoming'].includes(primaryFilter) && (stateFilter === '' || stateFilter === 'active');

  let bodyHTML;
  if (groupedActive && primaryFilter === 'today') {
    const activeItems = _pdmApplyFilters(allItems, 'today', 'active');
    const doneItems   = _pdmApplyFilters(allItems, 'today', 'done');
    bodyHTML = sortItems(activeItems).map(renderItem).join('') + buildCollapsibleSection('DONE', doneItems);
  } else if (groupedActive && primaryFilter === 'week') {
    // "This Week section should contain week-active items that are not
    // Today" (owner spec) — Today sub-group uses the raw, unconditioned
    // _pdmIsTodayItem membership test (not re-filtered by ACTIVE, since
    // every item here already passed 'week'+'active'), so the two visual
    // sub-groups never duplicate an item between them, even though the
    // underlying THIS WEEK+ACTIVE filter/count still legitimately
    // includes both — unchanged, per owner direction ("This Week includes
    // Today... do not subtract Today from This Week" at the count/filter
    // level; only the grouped *display* separates them).
    const weekActiveItems = _pdmApplyFilters(allItems, 'week', 'active');
    const todaySub = weekActiveItems.filter(_pdmIsTodayItem);
    const weekSub  = weekActiveItems.filter(i => !_pdmIsTodayItem(i));
    const doneItems = _pdmApplyFilters(allItems, 'week', 'done');
    bodyHTML = buildStaticSection('TODAY', todaySub) + buildStaticSection('THIS WEEK', weekSub) + buildCollapsibleSection('DONE', doneItems);
  } else if (groupedActive && primaryFilter === 'upcoming') {
    // DONE here is structurally always empty — _pdmIsUpcomingItem (P4-D034
    // §3, unchanged) already excludes done/overdue items from UPCOMING's
    // own primary scope — kept for symmetry with TODAY/THIS WEEK's own
    // grouping shape rather than special-cased away.
    const upcomingItems = _pdmApplyFilters(allItems, 'upcoming', 'active');
    const doneItems     = _pdmApplyFilters(allItems, 'upcoming', 'done');
    bodyHTML = buildStaticSection('UPCOMING', upcomingItems) + buildCollapsibleSection('DONE', doneItems);
  } else if (primaryFilter === 'all' && stateFilter === '') {
    // Static (non-collapsible) dividers only — order matches the ALL
    // subpill order above (OVERDUE, ACTIVE, DONE); no collapse behavior
    // was requested for ALL's own groups, unlike TODAY/THIS WEEK/
    // UPCOMING's DONE section.
    const overdueItems = _pdmApplyFilters(allItems, 'all', 'overdue');
    const activeItems  = _pdmApplyFilters(allItems, 'all', 'active');
    const doneItems    = _pdmApplyFilters(allItems, 'all', 'done');
    bodyHTML = buildStaticSection('OVERDUE', overdueItems) + buildStaticSection('ACTIVE', activeItems) + buildStaticSection('DONE', doneItems);
  } else {
    // Flat, unchanged rendering: TODAY/THIS WEEK/UPCOMING + DONE state
    // ("show Done items directly," no further grouping), and ALL + any
    // explicit state (OVERDUE/ACTIVE/DONE — each already narrowed to one
    // group by _pdmApplyFilters, needing no further dividers).
    bodyHTML = sorted.map(renderItem).join('');
  }

  if (!bodyHTML) {
    return `<div class="pdm-activity-list${stateDoneClass}"><div style="text-align:center;padding:24px;color:var(--muted)">No matching activity</div></div>`;
  }

  return `<div class="pdm-activity-list${stateDoneClass}">${bodyHTML}</div>`;
}

/* ============================================================
   5. GOOGLE SHEETS API — CENTRALIZED
   ============================================================ */
