// ============================================================
// 10-page-overview.js
// Today/Overview page (renderOverview)
// (lines 5116-5758 of the original inline <script>)
// ============================================================

function renderOverview() {
  const todayStr = fmtDate(TODAY);

  // ── Data sets ──
  const allTasks    = getTasks();
  const allEvents   = getEvents();
  const allEntries  = getEntries();

  // ── TODAY data ──────────────────────────────────────────────────────────
  // Tasks dated today: include active ones + those completed TODAY only
  // Tasks completed on previous days are excluded (they're done, not today's work)
  const dueTasks    = allTasks.filter(t =>
    t.dueDate === todayStr &&
    (parseStatus(t.status).state !== 'Completed' || isCompletedToday(t, todayStr))
  );
  const startTasks  = allTasks.filter(t =>
    t.startDate === todayStr && t.dueDate !== todayStr &&
    (parseStatus(t.status).state !== 'Completed' || isCompletedToday(t, todayStr))
  );
  const todayEvents = allEvents.filter(e => e.date === todayStr);
  const todayEntries= allEntries.filter(e => e.date === todayStr);

  // ── ALL TASKS data ───────────────────────────────────────────────────────
  const incompleteTasks = allTasks.filter(t => parseStatus(t.status).state !== 'Completed');

  // ── UPCOMING data (rolling 14 days from tomorrow) ─────────────────────────
  const upcomingDays = [];
  for (let i = 1; i <= 14; i++) {
    const d = new Date(TODAY);
    d.setDate(d.getDate() + i);
    upcomingDays.push(fmtDate(d));
  }

  // ── FILTER STATE ─────────────────────────────────────────────────────────
  // Primary group: 'today' | 'alltasks' | 'upcoming'
  // Sub-filters: Set of active sub-filter keys
  if (!window._gtGroup)   window._gtGroup   = 'today';
  if (!window._gtSubs)    window._gtSubs    = new Set();
  if (!window._gtCooldown) window._gtCooldown = false;

  const group = window._gtGroup;
  const subs  = window._gtSubs;

  // ── PILL COUNTS ───────────────────────────────────────────────────────────
  // Today counts — split active vs done
  const todayAllItems   = [...dueTasks, ...startTasks, ...todayEvents, ...todayEntries];
  // todayDone: tasks completed TODAY + events/entries marked Done today
  // Tasks completed on previous days are excluded (wrong date in doneAt)
  const todayDone       = todayAllItems.filter(i => isCompletedToday(i, todayStr));
  const todayActive     = todayAllItems.filter(i => !isCompletedToday(i, todayStr));
  const cTodayAll       = todayAllItems.length;   // primary pill: total
  const cTodayTasks     = todayActive.filter(i => i.type==='task').length;
  const cTodayEvents    = todayActive.filter(i => i.type==='event').length;
  const cTodayEntries   = todayActive.filter(i => i.type==='entry').length;
  const cTodayDone      = todayDone.length;       // Done sub-pill

  // All Tasks counts
  const cAllTasks   = incompleteTasks.length;
  const cHiPri      = incompleteTasks.filter(t => t.priority==='Critical'||t.priority==='High').length;
  const cInProg     = incompleteTasks.filter(t => parseStatus(t.status).state==='In Progress'||parseStatus(t.status).state==='Review').length;
  const cOverdue    = incompleteTasks.filter(t => t.dueDate && daysUntil(t.dueDate)<0).length;

  // Upcoming counts
  const cUpcoming   = upcomingDays.reduce((sum,d) => {
    return sum +
      incompleteTasks.filter(t => t.dueDate===d || t.startDate===d).length +
      allEvents.filter(e => e.date===d).length +
      allEntries.filter(e => e.date===d).length;
  }, 0);
  const cUpTasks    = upcomingDays.reduce((sum,d) => sum + incompleteTasks.filter(t => t.dueDate===d||t.startDate===d).length, 0);
  const cUpEvents   = upcomingDays.reduce((sum,d) => sum + allEvents.filter(e => e.date===d).length, 0);
  const cUpEntries  = upcomingDays.reduce((sum,d) => sum + allEntries.filter(e => e.date===d).length, 0);

  // ── GROUP/SUB CHANGE HANDLERS ────────────────────────────────────────────
  window._setGtGroup = (newGroup, direction) => {
    if (window._gtCooldown) return;
    if (window._gtGroup === newGroup) return;
    window._gtGroup = newGroup;
    window._gtSubs  = new Set(); // clear sub-filters on group change

    // Animate card list
    const col = document.getElementById('gt-main-col');
    if (col && direction) {
      const outClass = direction === 'up' ? 'sliding-up' : 'sliding-down';
      const inClass  = direction === 'up' ? 'sliding-in-down' : 'sliding-in-up';
      col.classList.add(outClass);
      window._gtCooldown = true;
      setTimeout(() => {
        col.classList.remove(outClass);
        renderOverview();
        // Apply slide-in after render
        const col2 = document.getElementById('gt-main-col');
        if (col2) {
          col2.classList.add(inClass);
          setTimeout(() => col2.classList.remove(inClass), 160);
        }
        setTimeout(() => { window._gtCooldown = false; }, 800);
      }, 150);
    } else {
      renderOverview();
    }
  };

  window._toggleGtSub = (subKey) => {
    if (window._gtSubs.has(subKey)) {
      window._gtSubs.delete(subKey);
    } else {
      window._gtSubs.add(subKey);
    }
    renderOverview();
  };

  // ── OVERSCROLL CAROUSEL HANDLER ──────────────────────────────────────────
  // Carousel order: today (middle) ↔ alltasks (above) ↔ upcoming (below)
  // Scrolling up past top → go to alltasks; scrolling down past bottom → go to upcoming
  // Wraps: alltasks ↔ upcoming when at boundaries of those groups
  const carouselOrder = ['alltasks', 'today', 'upcoming'];
  window._gtOverscroll = (direction) => {
    if (window._gtCooldown) return;
    const idx = carouselOrder.indexOf(window._gtGroup);
    if (direction === 'up' && idx > 0) {
      window._setGtGroup(carouselOrder[idx - 1], 'up');
    } else if (direction === 'up' && idx === 0) {
      // Wrap: alltasks → upcoming (going up from alltasks wraps to upcoming)
      window._setGtGroup('upcoming', 'up');
    } else if (direction === 'down' && idx < carouselOrder.length - 1) {
      window._setGtGroup(carouselOrder[idx + 1], 'down');
    } else if (direction === 'down' && idx === carouselOrder.length - 1) {
      // Wrap: upcoming → alltasks
      window._setGtGroup('alltasks', 'down');
    }
  };

  // ── Helper: navigate to planner tab ─────────────────────────────────────────
  window._goPlanner = () => {
    const btn = document.querySelector('.sidebar-btn[data-page="page-planner"]');
    if (btn) btn.click();
  };

  // ── PRIMARY PILL BUILDER ──────────────────────────────────────────────────
  const _isLightTheme = !isDarkTheme();
  const mkPrimaryPill = (key, count, label, hex) => {
    const active = group === key;
    const bgAlpha = _isLightTheme ? '20' : '18';
    return `<button class="gt-primary-pill${active ? ' active' : ''}"
      style="${active ? `border-color:${hex};color:${hex};background:${hex}${bgAlpha};` : ''}"
      onclick="window._setGtGroup('${key}', null)">
      <span class="gt-primary-pill-num" style="color:${active ? hex : 'var(--text2)'}">${count}</span>
      <span>${label}</span>
    </button>`;
  };

  // ── SUB-FILTER PILL BUILDER ───────────────────────────────────────────────
  const mkSubPill = (key, count, label, hex) => {
    if (count === 0) return ''; // hide if no items
    const active = subs.has(key);
    const bgAlpha = _isLightTheme ? '20' : '18';
    return `<button class="gt-sub-pill${active ? ' active' : ''}"
      style="${active ? `border-color:${hex};color:${hex};background:${hex}${bgAlpha};` : ''}"
      onclick="window._toggleGtSub('${key}')">
      <span class="gt-sub-pill-num" style="color:${active ? hex : 'var(--text2)'}">${count}</span>
      <span>${label}</span>
    </button>`;
  };

  // ── PILL STRIP HTML ───────────────────────────────────────────────────────
  const _pillHex = {
    today:    _isLightTheme ? '#0F766E' : '#4F9AB5',
    done:     _isLightTheme ? '#166534' : '#34D399',
    alltasks: _isLightTheme ? '#0E7490' : '#38BDF8',
    upcoming: _isLightTheme ? '#166534' : '#34D399',
    tasks:    _isLightTheme ? '#0F766E' : '#4F9AB5',
    events:   _isLightTheme ? '#0891B2' : '#22D3EE',
    entries:  _isLightTheme ? '#B45309' : '#FBBF24',
    hipri:    _isLightTheme ? '#DC2626' : '#F87171',
    inprog:   _isLightTheme ? '#7C3AED' : '#C084FC',
    overdue:  _isLightTheme ? '#DC2626' : '#F87171',
  };

  // Sub-filters per group
  let subPillsHTML = '';
  if (group === 'today') {
    const _doneDivider = cTodayDone > 0
      ? `<span style="width:1px;height:16px;background:var(--border);margin:0 2px;display:inline-block;vertical-align:middle;flex-shrink:0"></span>`
      : '';
    subPillsHTML =
      mkSubPill('tasks',   cTodayTasks,   'TASKS',   _pillHex.tasks)   +
      mkSubPill('events',  cTodayEvents,  'EVENTS',  _pillHex.events)  +
      mkSubPill('entries', cTodayEntries, 'ENTRIES', _pillHex.entries) +
      _doneDivider +
      mkSubPill('done', cTodayDone, 'DONE', _pillHex.done);
  } else if (group === 'alltasks') {
    subPillsHTML =
      mkSubPill('hipri',   cHiPri,  'HIGH PRIORITY', _pillHex.hipri)  +
      mkSubPill('inprog',  cInProg, 'IN PROGRESS',   _pillHex.inprog) +
      mkSubPill('overdue', cOverdue,'OVERDUE',        _pillHex.overdue);
  } else if (group === 'upcoming') {
    subPillsHTML =
      mkSubPill('tasks',   cUpTasks,   'TASKS',   _pillHex.tasks)   +
      mkSubPill('events',  cUpEvents,  'EVENTS',  _pillHex.events)  +
      mkSubPill('entries', cUpEntries, 'ENTRIES', _pillHex.entries);
  }
  // If all sub-pills returned empty string (all zeros), hide the sub strip
  const hasSubPills = subPillsHTML.trim().length > 0;

  const pillStripHTML = `
    <div class="gt-pill-strip">
      ${mkPrimaryPill('today',    cTodayAll,  'TODAY',    _pillHex.today)}
      ${mkPrimaryPill('alltasks', cAllTasks,  'OPEN TASKS',_pillHex.alltasks)}
      ${mkPrimaryPill('upcoming', cUpcoming,  'UPCOMING', _pillHex.upcoming)}
    </div>
    <div class="gt-subpill-strip visible">
      ${subPillsHTML}
      <button class="gt-new-btn" onclick="openTEEModal(null,'task','${todayStr}')">+ New Task</button>
    </div>`;

  // ── DAY DIVIDER BUILDER ───────────────────────────────────────────────────
  const buildDayDivider = (dateStr, count, isWeekBoundary) => {
    if (count === 0) return ''; // hide if no items
    const d = new Date(dateStr + 'T00:00:00');
    const label = d.toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'});
    const countBadge = `<span class="${isWeekBoundary?'gt-week-boundary-count':'gt-day-hdr-count'}">${count} item${count!==1?'s':''}</span>`;
    return `<div class="${isWeekBoundary?'gt-week-boundary':'gt-day-hdr'}">
      <span>${isWeekBoundary ? '📅 ' : ''}${label}</span>
      ${countBadge}
    </div>`;
  };

  // ── SORT HELPERS ──────────────────────────────────────────────────────────
  const PRIORITY_ORDER = { Critical:0, High:1, Medium:2, Low:3 };
  const STATUS_ORDER   = { 'In Progress':0, Review:1, 'To Do':2, Backlog:3 };
  const sortByProximityThenPriority = (a, b) => {
    const da = a.dueDate || a.startDate || '9999-99-99';
    const db = b.dueDate || b.startDate || '9999-99-99';
    if (da !== db) return da < db ? -1 : 1;
    const pa = PRIORITY_ORDER[a.priority] ?? 99;
    const pb = PRIORITY_ORDER[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    const sa = STATUS_ORDER[a.status] ?? 99;
    const sb = STATUS_ORDER[b.status] ?? 99;
    return sa - sb;
  };
  const sortForToday = (a, b) => {
    // Type order: task first, then event, then entry
    const typeOrd = {task:0, event:1, entry:2};
    const ta = typeOrd[a.type] ?? 3, tb = typeOrd[b.type] ?? 3;
    if (ta !== tb) return ta - tb;
    // Time within type
    const tma = a.time || '99:99', tmb = b.time || '99:99';
    if (tma !== tmb) return tma < tmb ? -1 : 1;
    // Priority last
    return (PRIORITY_ORDER[a.priority]??99) - (PRIORITY_ORDER[b.priority]??99);
  };

  // ── BUILD CARD ─────────────────────────────────────────────────────────────
  const buildGtCard = (item) => {
    // Unified chip/badge system
    const evBorder      = _buildAccentBorder(item.priority);
    const priorityBadge = _buildPriorityBadge(item);
    const statusBadge   = _buildStatusBadge(item);
    const typeBadge2    = _buildTypeBadge(item.type);
    const dueChip       = item.type === 'task' ? _buildCounterChip(item.dueDate) : '';
    const ctxChips      = item.type === 'task' ? _buildContextChips(item) : '';
    // Tags
    const allTags  = (item.tags||[]).slice(0,6);
    const tagsRow1 = allTags.slice(0,3);
    const tagsRow2 = allTags.slice(3);
    const mkTag    = tag => _buildTagChip(tag);
    // Subtask chip
    const subtaskChip = _subtaskChip(item);
    // Category badge (Today tab specific)

    // Meta right — done time or date/time
    const dateDisplay = item.type==='task' ? (item.dueDate||'') : (item.date||'');
    const timeDisplay = item.time ? fmtTime(item.time) : '';
    const { state: _mState, doneAt: _doneAt } = parseStatus(item.status);
    let metaRight;
    if ((_mState === 'Completed' || _mState === 'Done') && _doneAt) {
      const _dp = _doneAt.split(' ');
      metaRight = 'Done at ' + (_dp[1] ? fmtTime(_dp[1]) : _doneAt);
    } else {
      metaRight = [timeDisplay, dateDisplay].filter(Boolean).join(' · ');
    }
    return `<div class="gt-card" onclick="openTEEDetail('${item.id}')" style="${evBorder}">
      <div class="gt-card-row1">
        ${typeBadge2}${priorityBadge}${statusBadge}
        <span class="gt-card-row1-right" style="display:flex;align-items:center;gap:4px">
          ${ctxChips}${subtaskChip}
        </span>
      </div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin:4px 0 2px">
        <div class="gt-card-title" style="margin:0;flex:1;min-width:0">${item.title}</div>
        ${tagsRow1.length ? `<div style="display:flex;gap:3px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;max-width:50%">${tagsRow1.map(mkTag).join('')}</div>` : ''}
      </div>
      ${(!!item.desc||tagsRow2.length) ? `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:4px">
        ${item.desc ? `<div class="gt-card-desc-sm" style="flex:1;min-width:0">${item.desc}</div>` : '<div></div>'}
        ${tagsRow2.length ? `<div style="display:flex;gap:3px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;max-width:50%">${tagsRow2.map(mkTag).join('')}</div>` : ''}
      </div>` : ''}
      ${(item.type==='ideal'||item.type==='temporary') ? _categoryProgressStripHTML(item) : ''}
      <div class="gt-card-footer">
        <div class="gt-card-footer-left">${renderAssigneeStack(item.assignees||'', false, item.type)}</div>
        <div class="gt-card-footer-right">
          ${dueChip}${metaRight ? `<span class="gt-card-meta">${metaRight}</span>` : ''}
        </div>
      </div>
    </div>`;
  };
  // ── MAIN CONTENT ──────────────────────────────────────────────────────────
  let mainHTML = '';
  const emptyToday    = `<div class="today-empty"><div style="font-size:40px;margin-bottom:10px">☀️</div><div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px">All Clear For Today!</div><div style="font-size:13px;color:var(--text2)">Enjoy the Day</div></div>`;
  const emptyOpenTasks = `<div class="today-empty"><div style="font-size:40px;margin-bottom:10px">👍</div><div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px">No Open Tasks!</div><div style="font-size:13px;color:var(--text2)">Jobs A Good'un</div></div>`;
  const emptyUpcoming  = `<div class="today-empty"><div style="font-size:40px;margin-bottom:10px">🔮</div><div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px">I Foresee Your Next 14 Days</div><div style="font-size:13px;color:var(--text2)">Are Clear</div></div>`;

  if (group === 'today') {
    // Sub-filter: if subs empty → show all; else show union of selected types
    let allTodayItems = [
      ...dueTasks.map(t =>    ({...t, _badge:'DUE Today', _badgeClass:'gt-badge-today'})),
      ...startTasks.map(t =>  ({...t, _badge:'Starting',  _badgeClass:'gt-badge-start'})),
      ...todayEvents.map(e => ({...e, _badge:'Event',     _badgeClass:'gt-badge-event'})),
      ...todayEntries.map(e =>({...e, _badge:'Entry',     _badgeClass:'gt-badge-entry'})),
    ];

    // Separate active and done
    const doneItems   = allTodayItems.filter(i => isCompletedToday(i, todayStr));
    let   activeItems = allTodayItems.filter(i => !isCompletedToday(i, todayStr));

    // Apply sub-filters to active list (type filters)
    // 'done' sub-pill controls done section visibility, not active list
    if (subs.size > 0 && !( subs.size === 1 && subs.has('done') )) {
      const typeFilters = new Set([...subs].filter(s => s !== 'done'));
      if (typeFilters.size > 0) {
        activeItems = activeItems.filter(i => {
          if (typeFilters.has('tasks')   && i.type === 'task')  return true;
          if (typeFilters.has('events')  && i.type === 'event') return true;
          if (typeFilters.has('entries') && i.type === 'entry') return true;
          return false;
        });
      }
    }
    activeItems.sort(sortForToday);

    // Build active cards
    const activeCards = activeItems.map(i => buildGtCard(i));

    // Done section — expanded when 'done' sub-pill is active
    const showDone = subs.has('done');
    let doneSectionHTML = '';
    if (doneItems.length > 0) {
      const doneCards = doneItems.map(i => {
        const { doneAt } = parseStatus(i.status);
        const doneLabel  = doneAt ? ('Done at ' + fmtTime(doneAt.split(' ')[1] || doneAt)) : 'Done';
        return `<div style="opacity:0.55">
          ${buildGtCard(i)}
        </div>`;
      }).join('');

      if (showDone) {
        doneSectionHTML = `
          <div class="gt-day-hdr" style="margin-top:14px;cursor:pointer"
            onclick="window._toggleGtSub('done')" title="Click to collapse">
            <span>✓ Completed today</span>
            <div style="display:flex;align-items:center;gap:6px">
              <span class="gt-day-hdr-count">${doneItems.length} item${doneItems.length!==1?'s':''}</span>
              <span style="font-size:11px;color:var(--muted)">‹ hide</span>
            </div>
          </div>
          <div class="gt-task-list">${doneCards}</div>`;
      } else {
        doneSectionHTML = `
          <div onclick="window._toggleGtSub('done')"
            style="display:flex;align-items:center;gap:8px;padding:10px 14px;margin-top:10px;
              border-radius:var(--radius-sm);border:1px dashed var(--border);
              background:var(--glass);cursor:pointer;font-size:12px;color:var(--text2)">
            <span style="font-size:14px">›</span>
            <span>${doneItems.length} completed today</span>
          </div>`;
      }
    }

    mainHTML = `<div class="gt-task-list">${activeCards.length ? activeCards.join('') : emptyToday}</div>${doneSectionHTML}`;

  } else if (group === 'alltasks') {
    // All incomplete tasks, sorted by proximity → priority → status
    let items = [...incompleteTasks];
    if (subs.size > 0) {
      items = items.filter(t => {
        if (subs.has('hipri')   && (t.priority==='Critical'||t.priority==='High')) return true;
        if (subs.has('inprog')  && (parseStatus(t.status).state==='In Progress'||parseStatus(t.status).state==='Review')) return true;
        if (subs.has('overdue') && t.dueDate && daysUntil(t.dueDate)<0) return true;
        return false;
      });
    }
    items.sort(sortByProximityThenPriority);

    // Group by proximity bucket with day dividers
    const buckets = new Map(); // dateStr → items[]
    items.forEach(t => {
      const key = t.dueDate || t.startDate || 'no-date';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(t);
    });
    // Overdue bucket
    const overdueBucket = items.filter(t => t.dueDate && daysUntil(t.dueDate)<0);
    const restBuckets   = new Map();
    items.filter(t => !t.dueDate || daysUntil(t.dueDate) >= 0).forEach(t => {
      const key = t.dueDate || t.startDate || 'no-date';
      if (!restBuckets.has(key)) restBuckets.set(key, []);
      restBuckets.get(key).push(t);
    });

    let blocks = '';
    if (overdueBucket.length) {
      const isDark = !_isLightTheme;
      const ovHex = isDark ? '#F87171' : '#DC2626';
      blocks += `<div class="gt-day-hdr" style="border-bottom-color:${ovHex}44;color:${ovHex}">
        <span>⚠ Overdue</span>
        <span class="gt-day-hdr-count" style="color:${ovHex};border-color:${ovHex}44;background:${ovHex}18">${overdueBucket.length} item${overdueBucket.length!==1?'s':''}</span>
      </div>`;
      blocks += `<div class="gt-task-list" style="margin-bottom:16px">${overdueBucket.map(t=>buildGtCard(t)).join('')}</div>`;
    }
    restBuckets.forEach((dayItems, dateStr) => {
      if (!dayItems.length) return;
      const badge = dateStr === todayStr ? 'DUE Today' : dateStr === 'no-date' ? '' : 'Due';
      const badgeClass = dateStr === todayStr ? 'gt-badge-today' : 'gt-badge-start';
      blocks += buildDayDivider(dateStr === 'no-date' ? null : dateStr, dayItems.length, false);
      if (dateStr === 'no-date') {
        blocks = blocks.replace(buildDayDivider(null, dayItems.length, false), '');
      }
      blocks += `<div class="gt-task-list" style="margin-bottom:12px">${dayItems.map(t=>buildGtCard(t)).join('')}</div>`;
    });
    mainHTML = blocks || (group === 'alltasks' ? emptyOpenTasks : emptyUpcoming);

  } else if (group === 'upcoming') {
    // Rolling 14 days, grouped by date with week boundary dividers
    let blocks = '';
    upcomingDays.forEach(dateStr => {
      let dayTasks   = incompleteTasks.filter(t => t.dueDate===dateStr || t.startDate===dateStr);
      let dayEvents  = allEvents.filter(e => e.date===dateStr);
      let dayEntries = allEntries.filter(e => e.date===dateStr);

      // Apply sub-filters
      if (subs.size > 0) {
        if (!subs.has('tasks'))   dayTasks   = [];
        if (!subs.has('events'))  dayEvents  = [];
        if (!subs.has('entries')) dayEntries = [];
      }

      const dayCount = dayTasks.length + dayEvents.length + dayEntries.length;
      if (dayCount === 0) return; // skip empty days

      // Check if this date is a Monday (week boundary — Sunday just passed)
      const d = new Date(dateStr + 'T00:00:00');
      const isMonday = d.getDay() === 1;

      blocks += buildDayDivider(dateStr, dayCount, isMonday);

      // Sort: tasks → events → entries, then time, then priority
      const items = [
        ...dayTasks.sort(sortByProximityThenPriority).map(t => ({...t, _badge: t.dueDate===dateStr?'Due':'Starting', _bc: 'gt-badge-start'})),
        ...dayEvents.sort((a,b) => (a.time||'99:99') < (b.time||'99:99') ? -1 : 1).map(e => ({...e, _badge:'Event', _bc:'gt-badge-event'})),
        ...dayEntries.map(e => ({...e, _badge:'Entry', _bc:'gt-badge-entry'})),
      ];
      blocks += `<div class="gt-task-list" style="margin-bottom:12px">${items.map(i => buildGtCard(i)).join('')}</div>`;
    });
    mainHTML = blocks || (group === 'alltasks' ? emptyOpenTasks : emptyUpcoming);
  }

  // ── OVERSCROLL: re-attach listeners after every render ─────────────────
  // gt-main-col is recreated each render — use rAF to attach after DOM settles
  // Clone node to cleanly remove any stale listeners before re-attaching
  requestAnimationFrame(() => {
    const col = document.getElementById('gt-main-col');
    if (!col) return;
    // Replace node with clone to strip stale event listeners
    const fresh = col.cloneNode(true);
    col.parentNode.replaceChild(fresh, col);
    const c = document.getElementById('gt-main-col');
    if (!c) return;

    // Desktop — wheel boundary detection
    c.addEventListener('wheel', (e) => {
      if (window._gtCooldown) return;
      const atTop    = c.scrollTop <= 0;
      const atBottom = c.scrollTop + c.clientHeight >= c.scrollHeight - 2;
      if (atTop && e.deltaY < 0) {
        e.preventDefault(); window._gtOverscroll('up');
      } else if (atBottom && e.deltaY > 0) {
        e.preventDefault(); window._gtOverscroll('down');
      }
    }, { passive: false });

    // Mobile — touch boundary detection (60px threshold)
    let _ty = 0, _ts = 0;
    c.addEventListener('touchstart', (e) => {
      _ty = e.touches[0].clientY; _ts = c.scrollTop;
    }, { passive: true });
    c.addEventListener('touchend', (e) => {
      if (window._gtCooldown) return;
      const dy = _ty - e.changedTouches[0].clientY;
      if (_ts <= 0 && dy < -60)
        window._gtOverscroll('up');
      else if (_ts + c.clientHeight >= c.scrollHeight - 2 && dy > 60)
        window._gtOverscroll('down');
    }, { passive: true });
  });

     // ── Pinned notes panel ──
  const buildPinnedNotesPanel = () => {
    const pinnedNotes = [...STATE.stickies].filter(s=>s.pinned)
      .sort((a,b)=>(parseInt((b.id||'').replace(/\D/g,''),10)||0)-(parseInt((a.id||'').replace(/\D/g,''),10)||0));

    return `<div class="gt-panel-card gt-notes-card">
    <div class="gt-panel-hdr" style="flex-shrink:0">
      <span class="gt-panel-title">📌 Pinned Notes</span>
      <button class="btn-ghost" style="height:24px;padding:0 8px;font-size:11px" onclick="openPinnedNoteModal()">+ Pinned Note</button>
    </div>
    <div class="gt-notes-list">
    ${pinnedNotes.length===0
      ? `<div style="text-align:center;padding:16px 8px;color:var(--muted);font-size:12px">No pinned notes yet.<br><button class="btn-ghost" style="margin-top:8px;height:26px;padding:0 10px;font-size:11px" onclick="openPinnedNoteModal()">+ Add Note</button></div>`
      : pinnedNotes.map((s,idx)=>{
          const c = getStickyColor(s.colorIdx);
          const noteId = `gpn-${idx}`;
          return `<div class="gt-pin-note" style="background:${c.bg};color:${c.text}">
            <button class="gt-pin-unpin" onclick="toggleNotePin('${s.id}',false)">📌</button>
            <div id="${noteId}" style="font-size:11px;line-height:1.55;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden">${s.text}</div>
            ${s.text.length>120?`<button onclick="togglePinExpand('${noteId}',this)" style="background:none;border:none;font-size:10px;color:${c.text};opacity:0.65;cursor:pointer;padding:2px 0;font-family:var(--font);display:block;margin-top:3px">▼ more</button>`:''}
          </div>`;
        }).join('')
    }
    </div>
  </div>`;
  };
  const pinnedPanelHTML = buildPinnedNotesPanel();

  // ── Mini calendar ──
  const buildMiniCalendar = () => {
    const yr = TODAY.getFullYear(), mo = TODAY.getMonth();
    const firstDay  = new Date(yr,mo,1).getDay();
    const daysInMo  = new Date(yr,mo+1,0).getDate();
    const prevDays  = new Date(yr,mo,0).getDate();
    const moLabel   = TODAY.toLocaleDateString('en-US',{month:'long',year:'numeric'});
    const dayLabels = ['S','M','T','W','T','F','S'].map(d=>`<div class="gt-mc-dlbl">${d}</div>`).join('');
    // Build activity map — single blue dot only
    const actMap = {};
    STATE.items.forEach(item=>{
      const d = item.dueDate||item.startDate||item.date||'';
      if(!d||!d.startsWith(`${yr}-${String(mo+1).padStart(2,'0')}`)) return;
      const day = parseInt(d.split('-')[2],10);
      actMap[day] = true;
    });
    let cells = '';
    for(let i=firstDay-1;i>=0;i--) cells+=`<div class="gt-mc-cell other">${prevDays-i}</div>`;
    for(let d=1;d<=daysInMo;d++){
      const isToday=d===TODAY.getDate();
      const has=actMap[d];
      const cls=['gt-mc-cell',isToday?'today-mc':'',has?'has-items':''].filter(Boolean).join(' ');
      const dateStr=`${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      cells+=`<div class="${cls}" onclick="openDayList('${dateStr}')" title="${dateStr}">${d}</div>`;
    }
    const total=Math.ceil((firstDay+daysInMo)/7)*7;
    for(let i=1;i<=total-firstDay-daysInMo;i++) cells+=`<div class="gt-mc-cell other">${i}</div>`;
    return `<div class="gt-panel-card gt-mini-cal">
      <div class="gt-panel-hdr">
        <span class="gt-panel-title">📅 ${moLabel}</span>
        <button class="btn-ghost" style="height:22px;padding:0 8px;font-size:11px" onclick="window._goPlanner()">Full →</button>
      </div>
      <div class="gt-mc-grid">${dayLabels}${cells}</div>
      <div class="gt-mc-legend"><span><i style="background:var(--accent2)"></i>Has items</span></div>
    </div>`;
  };
  const miniCalHTML = buildMiniCalendar();

  // ── Today header: bold title left, date right ──
  const todayDateStr = TODAY.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});

  document.getElementById('overviewSection').innerHTML = `
    <div class="gt-hero">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <div class="gt-hero-title">${
          group==="today"
            ? 'Today Overview'
            : group==="alltasks"
              ? '<span>Open Tasks</span><em> · Full List</em>'
              : '<span>Upcoming</span><em> · Next 14 Days</em>'
        }</div>
        <div style="font-size:15px;color:var(--text2);font-weight:500;white-space:nowrap;letter-spacing:-0.01em">${todayDateStr}</div>
      </div>
    </div>
    <div class="gt-layout">
      <div class="gt-main-col" id="gt-main-col">
        ${pillStripHTML}
        ${mainHTML}
      </div>
      <div class="gt-right-col">
        <div class="gt-notes-section">${pinnedPanelHTML}</div>
        <div class="gt-cal-section">${miniCalHTML}</div>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// PLANNER — Weekly grid view + Monthly calendar view
// Supports sort (Default / Priority / By Time) and archive mode
// ═══════════════════════════════════════════════════════════
function getWeekStart(offset) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay()+6)%7) + (offset * 7));
  weekStart.setHours(0,0,0,0);
  return weekStart;
}

// plannerView is now part of STATE directly

/* Sort items for planner display according to STATE.plannerSort:
   'default' → Due tasks first, then time-based (events+entries by time), then start-date tasks
   'priority' → All items by priority (Critical→Low), time-based still uses time within same priority
   'time'     → All items with a time sorted by time; due/start tasks at bottom */

function sortPlannerItems(dueTasks, startTasks, timedItems) {
  const sort = STATE.plannerSort || 'default';

  if (sort === 'default') {
    // Due → timed (events+entries by time) → start
    const timed = timedItems.slice().sort((a,b) => (a.time||'').localeCompare(b.time||''));
    return [...dueTasks, ...timed, ...startTasks];
  }
  if (sort === 'priority') {
    const all = [...dueTasks, ...timedItems, ...startTasks];
    return all.sort((a,b) => {
      const pd = (PRIORITY_ORDER[a.priority]??3) - (PRIORITY_ORDER[b.priority]??3);
      if (pd !== 0) return pd;
      return (a.time||'').localeCompare(b.time||'');
    });
  }
  if (sort === 'time') {
    // Time-based items first sorted by time, due/start at bottom
    const timed = timedItems.slice().sort((a,b) => (a.time||'').localeCompare(b.time||''));
    return [...timed, ...dueTasks, ...startTasks];
  }
  return [...dueTasks, ...timedItems, ...startTasks];
}

