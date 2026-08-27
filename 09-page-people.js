// ============================================================
// 09-page-people.js
// People page (renderPeople) + card overflow menu
// (lines 4862-5115 of the original inline <script>)
// ============================================================

function renderPeople() {
  const el = document.getElementById('page-people');
  if (!el) return;

  const f   = STATE.peopleFilter;
  const all = STATE.people || [];
  // P4-R018d (People search role-type guard fix): searchable values are
  // coerced to strings before any string method is called on them, so a
  // non-string field (e.g. a numeric Role value like `role: 7`, or a null/
  // undefined field) can no longer crash the search — previously
  // `(p.role||'').toLowerCase()` still passed a bare number through
  // untouched when that number was truthy (`7||''` === `7`, and numbers
  // have no `.toLowerCase`). Display-only normalization for the search
  // comparison — STATE.people/the saved Role value itself is never
  // modified or written back.
  const _safeSearchText = value => String(value || '').toLowerCase();
  const q   = _safeSearchText(f.search);

  // ── Counts ───────────────────────────────────────────────────
  const cAll  = all.length;
  const cToday = all.filter(p => isPersonActiveToday(p)).length;
  const cWeek  = all.filter(p => isPersonActiveThisWeek(p)).length;
  const cIdle  = all.filter(p => !isPersonActiveThisWeek(p)).length;

  // ── Filter by context ────────────────────────────────────────
  let filtered = all;
  if (f.context === 'today') filtered = all.filter(p => isPersonActiveToday(p));
  if (f.context === 'week')  filtered = all.filter(p => isPersonActiveThisWeek(p));
  if (f.context === 'idle')  filtered = all.filter(p => !isPersonActiveThisWeek(p));
  if (q) filtered = filtered.filter(p =>
    _safeSearchText(p.name).includes(q) || _safeSearchText(p.role).includes(q)
  );

  // ── Sort: Active Today (by count desc) → Active This Week (A-Z) → Idle (A-Z)
  const _byName = (a, b) => (a.name||'').localeCompare(b.name||'');
  filtered = [
    ...filtered.filter(p =>  isPersonActiveToday(p))
               .sort((a, b) => personTodayCount(b) - personTodayCount(a)),
    ...filtered.filter(p => !isPersonActiveToday(p) &&  isPersonActiveThisWeek(p))
               .sort(_byName),
    ...filtered.filter(p => !isPersonActiveThisWeek(p))
               .sort(_byName),
  ];

  // ── Subtitle ─────────────────────────────────────────────────
  const subtitle = f.context === 'today' ? 'Active Today'
    : f.context === 'week' ? 'Active This Week'
    : f.context === 'idle' ? 'Idle This Week'
    : 'All Members';

  // ── Empty state (no people at all) ───────────────────────────
  if (cAll === 0) {
    el.innerHTML = ''
      + '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:20px;flex-shrink:0;flex-wrap:wrap">'
      + '<span style="font-size:26px;font-weight:800;letter-spacing:-0.03em;line-height:1.1;color:var(--text);font-family:var(--font-disp)">People</span>'
      + '<span style="font-size:26px;font-weight:400;color:var(--muted);font-family:var(--font-disp)"> &middot; All Members</span>'
      + '<button class="btn-primary" style="margin-left:auto" onclick="openPersonModal(null)"><i class="ti ti-plus" style="font-size:13px;margin-right:4px"></i>Add Person</button>'
      + '</div>'
      + '<div style="text-align:center;padding:80px 20px;color:var(--muted)">'
      + '<i class="ti ti-users" style="font-size:48px;display:block;margin-bottom:16px;opacity:0.4"></i>'
      + '<div style="font-size:15px;font-weight:600;color:var(--text2);margin-bottom:6px">No team members yet</div>'
      + '<div style="font-size:13px;margin-bottom:20px">Add people to track workload, tasks and activity</div>'
      + '<button class="btn-primary" onclick="openPersonModal(null)"><i class="ti ti-plus" style="font-size:13px;margin-right:4px"></i>Add Person</button>'
      + '</div>';
    return;
  }

  // ── Pill strip ────────────────────────────────────────────────
  const _wasSearchFocused = _captureSearchFocus('pp-search-input');
  const pillsHTML = ''
    + '<button class="kb-pill' + (f.context==='all'?' active':'') + '" onclick="_ppSetContext(' + "'all'" + ')">'
    + '<span class="kb-pill-num">' + cAll + '</span> ALL</button>'
    + (cToday > 0
      ? '<button class="kb-pill today' + (f.context==='today'?' active':'') + '" onclick="_ppSetContext(' + "'today'" + ')">'
        + '<span class="kb-pill-num">' + cToday + '</span> ACTIVE TODAY</button>'
      : '')
    + (cWeek > 0
      ? '<button class="kb-pill week' + (f.context==='week'?' active':'') + '" onclick="_ppSetContext(' + "'week'" + ')">'
        + '<span class="kb-pill-num">' + cWeek + '</span> ACTIVE THIS WEEK</button>'
      : '')
    + (cIdle > 0
      ? '<button class="kb-pill' + (f.context==='idle'?' active':'') + '" onclick="_ppSetContext(' + "'idle'" + ')">'
        + '<span class="kb-pill-num">' + cIdle + '</span> IDLE</button>'
      : '')
    + '<div class="kb-search-wrap">'
    + '<i class="ti ti-search" style="font-size:12px;color:var(--muted)"></i>'
    + '<input id="pp-search-input" placeholder="Search people\u2026" value="' + (f.search||'').replace(/"/g,'&quot;') + '"'
    + ' oninput="STATE.peopleFilter.search=this.value;renderPeople()"'
    + ' style="border:none;background:transparent;color:var(--text);font-family:var(--font);font-size:13px;outline:none;width:100%">'
    + '</div>';

  // ── Cards ─────────────────────────────────────────────────────
  const timeframe = f.context === 'week' ? 'week' : 'today';
  const addCardHTML = '<div class="add-person-btn" onclick="openPersonModal(null)">'
    + '<span class="plus"><i class="ti ti-plus" style="font-size:28px"></i></span>'
    + '<span>Add Person</span>'
    + '</div>';

  const gridHTML = filtered.length > 0
    ? filtered.map(p => buildPersonCard(p, true, timeframe)).join('') + addCardHTML
    : '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--muted)">'
      + '<i class="ti ti-search-off" style="font-size:40px;display:block;margin-bottom:12px;opacity:0.5"></i>'
      + '<div style="font-size:14px;color:var(--text2)">No people match that filter</div>'
      + '</div>' + addCardHTML;

  // ── Render ────────────────────────────────────────────────────
  el.innerHTML = ''
    + '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:16px;flex-shrink:0;flex-wrap:wrap">'
    + '<span style="font-size:26px;font-weight:800;letter-spacing:-0.03em;line-height:1.1;color:var(--text);font-family:var(--font-disp)">People</span>'
    + '<span style="font-size:26px;font-weight:400;color:var(--muted);font-family:var(--font-disp)"> &middot; ' + subtitle + '</span>'
    + '<button class="btn-primary" style="margin-left:auto" onclick="openPersonModal(null)"><i class="ti ti-plus" style="font-size:13px;margin-right:4px"></i>Add Person</button>'
    + '</div>'
    + '<div class="kb-pill-strip" style="margin-bottom:16px">' + pillsHTML + '</div>'
    + '<div class="person-grid">' + gridHTML + '</div>';

  _restoreSearchFocus('pp-search-input', _wasSearchFocused);
}

// ── People card overflow action menu (P4-R018e, discovery basis P4-D030
// SS8-10) — replaces the two always-visible Edit/Remove dir-action-btn icons
// with a single top-right "⋯" trigger. Mirrors openPriorityDropdown's proven
// four-part shape (stopPropagation, toggle-existing check, anchor-relative
// viewport-clamped positioning, outside-click dismissal) almost verbatim, per
// the discovery's explicit "smallest safe approach" recommendation (SS8) —
// the one deliberate addition is comparing the existing menu's own personId
// before deciding whether a repeat click should just close it (same card) or
// close-and-reopen for a different card (so switching between two cards'
// menus in sequence always shows the second card's menu, not nothing).
// Named/scoped generically (not "openPersonActionMenu") per the discovery's
// SS12 naming guidance, so a future Resources/Reminders pass can adopt or
// adapt this without this checkpoint having overcommitted to an interface
// neither surface has validated yet. Edit/Remove still call the exact same,
// completely unmodified openPersonModal(id)/removePerson(id) functions the
// old icon buttons called — no change to either function.
function _openCardActionMenu(personId, anchorEl, event) {
  event.stopPropagation();
  const existing = document.getElementById('card-action-menu');
  if (existing) {
    const samePerson = existing.dataset.personId === personId;
    existing.remove();
    if (samePerson) return;
  }
  const menu = document.createElement('div');
  menu.id = 'card-action-menu';
  menu.className = 'card-action-menu';
  menu.dataset.personId = personId;
  menu.innerHTML =
      '<button class="card-action-menu-item" onclick="document.getElementById(\'card-action-menu\')?.remove();openPersonModal(\'' + personId + '\')"><i class="ti ti-pencil" style="font-size:13px"></i>Edit</button>'
    + '<button class="card-action-menu-item danger" onclick="document.getElementById(\'card-action-menu\')?.remove();removePerson(\'' + personId + '\')"><i class="ti ti-trash" style="font-size:13px"></i>Remove</button>';
  document.body.appendChild(menu);
  const rect  = anchorEl.getBoundingClientRect();
  const mRect = menu.getBoundingClientRect();
  let top  = rect.bottom + 6;
  let left = rect.left;
  if (left + mRect.width > window.innerWidth - 8)  left = window.innerWidth - mRect.width - 8;
  if (top  + mRect.height > window.innerHeight - 8) top  = rect.top - mRect.height - 6;
  menu.style.top  = `${top}px`;
  menu.style.left = `${left}px`;
  setTimeout(() => {
    document.addEventListener('click', function _close() {
      document.getElementById('card-action-menu')?.remove();
      document.removeEventListener('click', _close);
    });
  }, 0);
}

// Used by renderPeople (People tab)
function buildPersonCard(p, showActiveBadge, timeframe) {
  const allPi = personItems(p.name);

  // ── Active state ──────────────────────────────────────────────
  const activeToday = isPersonActiveToday(p);
  const activeWeek  = isPersonActiveThisWeek(p);

  // ── Shortcut chip counts (P4-R018c, discovery basis P4-D033/P4-D034,
  // owner correction after product validation of P4-R018b-redo) — reuses
  // the same shared _personActiveTodayItems/_personActiveWeekItems/
  // _personOverdueItems wrappers isPersonActiveToday/isPersonActiveThisWeek
  // now use, so the card's own numbers, the People page's Active Today/
  // Active This Week classification, and Person Detail's own TODAY+ACTIVE/
  // THIS WEEK+ACTIVE/ALL+OVERDUE destinations can never disagree. This
  // Week intentionally does NOT exclude Today items — owner direction:
  // "This Week includes Today... do not subtract Today from This Week."
  const cToday   = _personActiveTodayItems(p.name).length;
  const cWeek    = _personActiveWeekItems(p.name).length;
  const cOverdue = _personOverdueItems(p.name).length;

  // ── Stats HTML ────────────────────────────────────────────────
  // P4-R018c: compact shortcut chips — N Today / N This Week / N Overdue
  // (shorter than P4-R018b-redo's "Active Today"/"Active This Week"
  // labels, per owner direction) — each opening Person Detail LIST
  // pre-filtered to the matching primary/state selection. No per-type
  // icons, since the chip model is not type-based; event.stopPropagation()
  // guards every click defensively, matching this card's existing edit/
  // remove button pattern. Colors reuse the same rgba/var values
  // previously used for the old per-type Task/Event/Entry breakdown chips
  // (accent2 for Today, amber #FBBF24 for This Week, var(--red) for
  // Overdue) — no new theme-readability risk introduced. Overdue routes
  // to ALL+OVERDUE directly (not absorbed into Today) — does not carry
  // forward any rejected P4-R018b/P4-R018b-redo semantics.
  const _shortcutChip = (cls, count, label, primaryFilter, stateFilter) =>
    '<button class="person-shortcut-chip ' + cls + '" onclick="event.stopPropagation();openPersonDetailModal(\'' + p.id + '\',\'' + primaryFilter + '\',\'' + stateFilter + '\',\'list\')">'
    + count + ' ' + label + '</button>';

  const _hasShortcuts = cToday > 0 || cWeek > 0 || cOverdue > 0;

  const statsHTML = '<div class="person-stats">'
    + (cToday   > 0 ? _shortcutChip('today',   cToday,   'Today',      'today', 'active')  : '')
    + (cWeek    > 0 ? _shortcutChip('week',    cWeek,    'This Week',  'week',  'active')  : '')
    + (cOverdue > 0 ? _shortcutChip('overdue', cOverdue, 'Overdue',    'all',   'overdue') : '')
    + (!_hasShortcuts ? '<span class="stat-pill" style="background:var(--glass);color:var(--muted)">Nothing today</span>' : '')
    + '</div>';

  // ── Badge ─────────────────────────────────────────────────────
  let badgeHTML = '';
  if (showActiveBadge) {
    if (activeToday)
      badgeHTML = '<span class="person-active-badge" style="margin-top:3px;display:inline-flex">Active Today</span>';
    else if (activeWeek)
      badgeHTML = '<span class="person-active-week-badge" style="margin-top:3px;display:inline-flex">Active This Week</span>';
    else
      badgeHTML = '<span class="person-idle-badge" style="margin-top:3px;display:inline-flex">Idle</span>';
  }

  // ── Avatar ────────────────────────────────────────────────────
  const avatarHTML = p.photo
    ? '<img src="' + p.photo + '" class="person-avatar" style="background:' + p.color + ';box-shadow:0 4px 14px ' + p.color + '55;object-fit:cover" onerror="this.style.display=\'none\'" alt="' + initials(p.name) + '">'
    : '<div class="person-avatar" style="background:' + p.color + ';box-shadow:0 4px 14px ' + p.color + '55">' + initials(p.name) + '</div>';

  // ── View Activities button (P4-R018a: renamed from "View details", arrow
  // removed, discovery basis P4-D030 SS6; moved above the stats block in the
  // return concatenation below — click behavior unchanged) ──
  const viewBtn = '<button class="person-viewall" onclick="openPersonDetailModal(\'' + p.id + '\')">View Activities</button>';

  return '<div class="person-card' + (activeToday?' person-card-active':'') + '">'
    + '<div class="person-header">'
    + '<div style="position:relative;flex-shrink:0">'
    + avatarHTML
    + (activeToday ? '<div class="person-active-dot" title="Active today"></div>' : '')
    + '</div>'
    + '<div style="flex:1;min-width:0">'
    + '<div class="person-name" style="overflow:hidden;white-space:nowrap;text-overflow:ellipsis">' + p.name + '</div>'
    + '<div class="person-role">' + (p.role||'\u2014') + '</div>'
    + badgeHTML
    + '</div>'
    + '<div class="person-actions">'
    + '<button class="card-action-trigger" onclick="_openCardActionMenu(\'' + p.id + '\', this, event)" title="More actions"><i class="ti ti-dots" style="font-size:15px"></i></button>'
    + '</div>'
    + '</div>'
    + '<div style="margin-bottom:10px">' + viewBtn + '</div>'
    + statsHTML
    + '</div>';
}

