// ============================================================
// 11-page-planner.js
// Planner page (renderPlanner) + nav helpers
// (lines 5759-6576 of the original inline <script>)
// ============================================================

// ── Planner navigation helpers ──────────────────────────────────────
function _plannerPrev() {
  const v = STATE.plannerView;
  if (v === 'month') calNav(-1);
  else if (v === 'week') changeWeek(-1);
  else { STATE.plannerDayOffset -= 1; renderPlanner(); }
}

function _plannerNext() {
  const v = STATE.plannerView;
  if (v === 'month') calNav(1);
  else if (v === 'week') changeWeek(1);
  else { STATE.plannerDayOffset += 1; renderPlanner(); }
}

function _plannerToday() {
  // Always navigate to Day View of today regardless of current view
  STATE.plannerView      = 'day';
  STATE.plannerDayOffset = 0;
  renderPlanner();
}

function _plannerGoDay(dateStr) {
  // Navigate to Day view for a specific date string (YYYY-MM-DD)
  const today    = new Date(fmtDate(TODAY) + 'T00:00:00');
  const target   = new Date(dateStr + 'T00:00:00');
  const diffMs   = target - today;
  const diffDays = Math.round(diffMs / 86400000);
  STATE.plannerView      = 'day';
  STATE.plannerDayOffset = diffDays;
  renderPlanner();
}



function _plannerOpenItem(id) {
  openTEEDetail(id);
}

function _plannerSetView(v) {
  STATE.plannerView = v;
  STATE._plannerCellH = null; // reset on view change so height is re-measured
  renderPlanner();
}


function renderPlanner() {
  const container = document.getElementById('plannerSection');
  if (!container) return;
  try {

  // ── State defaults ─────────────────────────────────────────────────
  if (!STATE.plannerView)    STATE.plannerView    = 'month';
  if (!STATE.plannerFilter)  STATE.plannerFilter  = { tasks:true, events:true, entries:true };
  if (STATE.plannerDayOffset  == null) STATE.plannerDayOffset  = 0;
  if (STATE.plannerWeekOffset == null) STATE.plannerWeekOffset = 0;

  const view = STATE.plannerView;
  const pf   = STATE.plannerFilter;

  // ── Priority CSS class helper ───────────────────────────────────────
  // ── Theme + shared values ────────────────────────────────────────
  const _isLT = !isDarkTheme();
  const _bgA  = _isLT ? '20' : '18';

  const ppClass = p =>
    p==='Critical' ? 'pp-crit' :
    p==='High'     ? 'pp-high' :
    p==='Medium'   ? 'pp-med'  : 'pp-low';

// Priority sort order: Critical=0, High=1, Medium=2, Low=3, other=4
  const priOrder = p =>
    p==='Critical' ? 0 : p==='High' ? 1 : p==='Medium' ? 2 : p==='Low' ? 3 : 4;
  const sortByPriority = arr =>
    arr.slice().sort((a,b) => priOrder(a.priority) - priOrder(b.priority));

  // ── Nav label (adapts per view) ────────────────────────────────────
  let navLabel = '';
  if (view === 'month') {
    navLabel = MONTHS[STATE.calMonth] + ' ' + STATE.calYear;
  } else if (view === 'week') {
    const ws = getWeekStart(STATE.plannerWeekOffset);
    const we = new Date(ws); we.setDate(ws.getDate() + 6);
    const fmt = d => d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
    navLabel = fmt(ws) + ' — ' + fmt(we) + ', ' + ws.getFullYear();
  } else {
    const d = new Date(TODAY);
    d.setDate(d.getDate() + (STATE.plannerDayOffset || 0));
    navLabel = d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
  }

  // ── Filter pill counts (scoped to current view range) ──────────────
  let allInScope = [];
  if (view === 'month') {
    const y = STATE.calYear, m = STATE.calMonth;
    allInScope = STATE.items.filter(i => {
      const d = i.type === 'task' ? (i.dueDate || i.startDate) : i.date;
      if (!d) return false;
      const dt = new Date(d + 'T00:00:00');
      return dt.getFullYear() === y && dt.getMonth() === m;
    });
  } else if (view === 'week') {
    const ws    = getWeekStart(STATE.plannerWeekOffset);
    const we    = new Date(ws); we.setDate(ws.getDate() + 6);
    const wsStr = fmtDate(ws), weStr = fmtDate(we);
    allInScope = STATE.items.filter(i => {
      const d = i.type === 'task' ? (i.dueDate || i.startDate) : i.date;
      return d && d >= wsStr && d <= weStr;
    });
  } else {
    const d   = new Date(TODAY);
    d.setDate(d.getDate() + (STATE.plannerDayOffset || 0));
    const ds  = fmtDate(d);
    allInScope = STATE.items.filter(i => {
      const id = i.type === 'task' ? (i.dueDate || i.startDate) : i.date;
      return id === ds;
    });
  }
  const cntT  = allInScope.filter(i => i.type === 'task').length;
  const cntEv = allInScope.filter(i => i.type === 'event').length;
  const cntEn = allInScope.filter(i => i.type === 'entry').length;

  // ── Build shared header ─────────────────────────────────────────────
  const buildPlannerHeader = () => {
    const viewSubLabel = view === 'month' ? 'Month View'
                       : view === 'week'  ? 'Week View' : 'Day View';

    const _fHex = {
      tasks:   _isLT ? '#0F766E' : '#4F9AB5',
      events:  _isLT ? '#0891B2' : '#22D3EE',
      entries: _isLT ? '#B45309' : '#FBBF24',
    };
    const mkFP = (type, label, count) => {
      const active  = pf[type];
      const hex     = _fHex[type];
      const actSty  = active ? 'border-color:' + hex + ';color:' + hex + ';background:' + hex + _bgA + ';' : '';
      const cls     = active ? ' active ' + type : '';
      const oc      = 'STATE.plannerFilter[\''+type+'\']=!STATE.plannerFilter[\''+type+'\'];renderPlanner()';
      return '<button class="planner-fpill' + cls + '" style="' + actSty + '" onclick="' + oc + '">'
        + '<span class="planner-fpill-num" style="color:' + (active ? hex : 'var(--text2)') + '">' + count + '</span>'
        + ' ' + label.toUpperCase()
        + '</button>';
    };

    let hdr = '<div class="planner-hero">';

    // Hero title row
    hdr += '<div class="planner-hero-row">';
    hdr += '<span class="planner-hero-title">Planner</span>';
    hdr += '<span class="planner-hero-sub"> · ' + viewSubLabel + '</span>';
    hdr += '<button class="btn-primary" style="margin-left:auto;padding:6px 16px;'
         + 'border-radius:20px;font-size:11px;font-weight:600"'
         + ' onclick="openTEEModal(null,null,null)">+ Add item</button>';
    hdr += '</div>';

    // Nav row — [Month Week Day] [label] [‹ › Today]
    hdr += '<div class="planner-nav-row">';

    // Left: view pills
    hdr += '<div class="planner-view-pills">';
    const _vHex  = {
      month: _isLT ? '#0F766E' : '#4F9AB5',
      week:  _isLT ? '#0E7490' : '#38BDF8',
      day:   _isLT ? '#166534' : '#34D399',
    };
    const _vSty  = (v) => view === v
      ? 'border-color:' + _vHex[v] + ';color:' + _vHex[v] + ';background:' + _vHex[v] + _bgA + ';'
      : '';
    hdr += '<button class="planner-vpill' + (view === 'month' ? ' active' : '') + '"'
         + ' style="' + _vSty('month') + '"'
         + ' onclick="_plannerSetView(\'month\')">MONTH</button>';
    hdr += '<button class="planner-vpill' + (view === 'week'  ? ' active' : '') + '"'
         + ' style="' + _vSty('week') + '"'
         + ' onclick="_plannerSetView(\'week\')">WEEK</button>';
    hdr += '<button class="planner-vpill' + (view === 'day'   ? ' active' : '') + '"'
         + ' style="' + _vSty('day') + '"'
         + ' onclick="_plannerSetView(\'day\')">DAY</button>';
    hdr += '</div>';

    // Center: date label
    hdr += '<div class="planner-nav-center">' + navLabel + '</div>';

    // Right: arrows + Today
    hdr += '<div class="planner-nav-right">';
    hdr += '<button class="planner-nav-btn" onclick="_plannerPrev()" title="Previous">‹</button>';
    hdr += '<button class="planner-nav-btn" onclick="_plannerNext()" title="Next">›</button>';
    hdr += '<button class="planner-today-btn" onclick="_plannerToday()">TODAY</button>';
    hdr += '</div>';

    hdr += '</div>'; // end nav-row

    // Filter pills row
    // Open Tasks pill — Day view only, hidden when 0
    let openTasksPill = '';
    if (view === 'day') {
      const _dayOffset2 = STATE.plannerDayOffset || 0;
      const _dDay2 = new Date(TODAY); _dDay2.setDate(_dDay2.getDate() + _dayOffset2);
      const _dayDate2 = fmtDate(_dDay2);
      const _openStatuses2 = ['Backlog','To Do','In Progress','Review'];
      const _openCount = getTasks().filter(t => {
        const st = parseStatus(t.status).state;
        if (st === 'Completed') return false;
        if (t.dueDate === _dayDate2) return false;
        if (t.startDate === _dayDate2 && t.dueDate !== _dayDate2) return false;
        const isOverdue2 = t.dueDate && daysUntil(t.dueDate) < 0;
        return _openStatuses2.includes(st) || isOverdue2;
      }).length;
      if (_openCount > 0) {
        const _isOpen = STATE.plannerActiveTasksOpen;
        const _oc = 'STATE.plannerActiveTasksOpen=!STATE.plannerActiveTasksOpen;renderPlanner()';
        const _actSty = _isOpen
          ? 'border-color:#38BDF8;color:#38BDF8;background:rgba(56,189,248,0.12);'
          : '';
        openTasksPill = '<button class="planner-fpill" style="' + _actSty + '" onclick="' + _oc + '">'
          + '<span class="planner-fpill-num" style="color:' + (_isOpen?'#38BDF8':'var(--text2)') + '">' + _openCount + '</span>'
          + ' OPEN TASKS</button>';
      }
    }
    hdr += '<div class="planner-filter-row">';
    hdr += mkFP('tasks',   'Tasks',   cntT);
    hdr += mkFP('events',  'Events',  cntEv);
    hdr += mkFP('entries', 'Entries', cntEn);
    hdr += openTasksPill;
    hdr += '</div>';

    hdr += '</div>'; // end planner-hero

    return hdr;
  };
  const hdr = buildPlannerHeader();

  // ── MONTH VIEW ────────────────────────────────────────────────────
  if (view === 'month') {
    const yr = STATE.calYear;
    const mo = STATE.calMonth;
    const firstDay    = new Date(yr, mo, 1).getDay();
    const daysInMonth = new Date(yr, mo + 1, 0).getDate();
    const daysInPrev  = new Date(yr, mo, 0).getDate();
    const archiveMode = isArchivePeriod(yr + '-' + String(mo + 1).padStart(2,'0') + '-01');
    const archKey     = yr + '-' + String(mo + 1).padStart(2,'0');

    // If archive month not yet loaded, fetch then re-render
    if (archiveMode && !STATE.archiveCache[archKey] && !STATE.archiveCache._fetched) {
      container.innerHTML = hdr
        + '<div style="padding:24px;color:var(--muted);font-size:13px;text-align:center">'
        + '<i class="ti ti-loader" style="font-size:24px;opacity:0.4;display:block;margin-bottom:8px"></i>'
        + 'Loading archived month…</div>';
      fetchArchiveMonth(yr, mo).then(() => renderPlanner());
      return;
    }

    // Item source — archive cache or live STATE
    const itemsForDate = dateStr => {
      if (!archiveMode) return itemsOnDate(dateStr);
      return (STATE.archiveCache[archKey] || []).filter(i =>
        i.type === 'task' ? i.dueDate === dateStr : i.date === dateStr
      );
    };

    // Build a single cal-label chip — returns '' if filtered out
    const mkLabel = item => {
      if (!pf.tasks   && item.type === 'task')  return '';
      if (!pf.events  && item.type === 'event') return '';
      if (!pf.entries && item.type === 'entry') return '';
      const cls   = ppClass(item.priority);
      const title = (item.title || '').replace(/"/g, '&quot;');
      return '<span class="planner-cal-label ' + cls + '"'
           + ' onclick="event.stopPropagation();_plannerOpenItem(\''+item.id+'\');"'
           + ' title="' + title + '">' + title + '</span>';
    };

    // Build calendar cells
    let cellsHTML = '';
    let cellCount = 0;

    // Previous month overflow
    for (let i = firstDay - 1; i >= 0; i--) {
      cellsHTML += '<div class="planner-cal-cell other-month">'
        + '<div class="planner-cal-date-row">'
        + '<span class="planner-cal-date">' + (daysInPrev - i) + '</span>'
        + '</div></div>';
      cellCount++;
    }

    // Current month days
    for (let dd = 1; dd <= daysInMonth; dd++) {
      const dateStr  = yr + '-' + String(mo + 1).padStart(2,'0') + '-' + String(dd).padStart(2,'0');
      const isToday  = dateStr === fmtDate(TODAY);
      const dayItems = itemsForDate(dateStr);


      // Filter by active pills
      const _filtered = dayItems.filter(i =>
        (i.type === 'task'  && pf.tasks)   ||
        (i.type === 'event' && pf.events)  ||
        (i.type === 'entry' && pf.entries)
      );
      // Sort: priority first, then type (task→event→entry), then time
      const typeOrder = t => t.type === 'task' ? 0 : t.type === 'event' ? 1 : 2;
      const visItems = _filtered.slice().sort((a,b) => {
        const pd = priOrder(a.priority) - priOrder(b.priority);
        if (pd !== 0) return pd;
        const td = typeOrder(a) - typeOrder(b);
        if (td !== 0) return td;
        return (a.time||'').localeCompare(b.time||'');
      });

      // Dynamic item count — based on actual measured cell height
      const _storedH = STATE._plannerCellH || Math.max(72, window.innerHeight * 0.12);
      // Usable height = cell - date row (26px) - potential +more row (16px)
      // Each label chip is ~18px tall
      const _usableH  = Math.max(0, _storedH - 26 - 16);
      const maxItems  = Math.max(1, Math.floor(_usableH / 18));
      const shown     = visItems.slice(0, maxItems);
      const extra     = visItems.length - maxItems;

      let labelsHTML = shown.map(mkLabel).join('');
      if (extra > 0) {
        labelsHTML += '<span class="planner-cal-more">+' + extra + ' more</span>';
      }


      const todayCls  = isToday ? ' is-today' : '';
      const archiveCls = archiveMode ? ' archived-col' : '';

      cellsHTML += '<div class="planner-cal-cell' + todayCls + archiveCls + '"'
        + ' onclick="_plannerGoDay(\''+dateStr+'\');">'
        + '<div class="planner-cal-date-row">'
        + '<span class="planner-cal-date">' + dd + '</span>'
        + '</div>'
        + labelsHTML
        + '</div>';
      cellCount++;
    }

    // Fill to nearest complete row (5 rows = 35, 6 rows = 42)
    // Only add a 6th row if the month actually needs it
    const totalNeeded = cellCount <= 35 ? 35 : 42;
    for (let dd = 1; dd <= totalNeeded - cellCount; dd++) {
      cellsHTML += '<div class="planner-cal-cell other-month">'
        + '<div class="planner-cal-date-row">'
        + '<span class="planner-cal-date">' + dd + '</span>'
        + '</div></div>';
    }

    // Day-of-week header row
    const dowHTML = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
      .map(d => '<div class="planner-dow">' + d + '</div>')
      .join('');

    // Archive badge
    let archiveHTML = '';
    if (archiveMode) {
      archiveHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
        + '<span class="planner-archive-badge">'
        + '<i class="ti ti-archive" style="font-size:11px"></i>'
        + 'Archived · read only'
        + '</span>'
        + '<button class="planner-archive-link"'
        + ' onclick="STATE.calYear=new Date().getFullYear();STATE.calMonth=new Date().getMonth();renderPlanner()">'
        + 'Back to current month ›'
        + '</button>'
        + '</div>';
    }

    container.innerHTML = hdr + archiveHTML
      + '<div class="planner-month-wrap">'
      + '<div class="planner-dow-row">' + dowHTML + '</div>'
      + '<div class="planner-cal-grid" id="plannerCalGrid">' + cellsHTML + '</div>'
      + '</div>';

    // Attach ResizeObserver to the grid — fires on any size change
    // (initial render, window resize, monitor change, sidebar collapse)
    requestAnimationFrame(() => {
      const grid = document.getElementById('plannerCalGrid');
      if (!grid) return;

      // Disconnect any previous observer
      if (STATE._plannerRO) { STATE._plannerRO.disconnect(); STATE._plannerRO = null; }

      STATE._plannerRO = new ResizeObserver(() => {
        const firstCell = grid.querySelector('.planner-cal-cell:not(.other-month)');
        if (!firstCell) return;
        const actualH = firstCell.offsetHeight;
        if (actualH < 10) return;
        const newMax = Math.max(3, Math.floor((actualH - 28) / 18));
        const oldMax = Math.max(3, Math.floor(((STATE._plannerCellH || 0) - 28) / 18));
        if (actualH !== STATE._plannerCellH) {
          const prevH  = STATE._plannerCellH || actualH;
          STATE._plannerCellH = actualH;
          // Re-render if item count changes OR cell shrank/grew by more than 4px
          if (newMax !== oldMax || Math.abs(actualH - prevH) > 4) {
            STATE._plannerRO.disconnect();
            STATE._plannerRO = null;
            renderPlanner();
          }
        }
      });
      STATE._plannerRO.observe(grid);
    });
    return;
  }

  // ── WEEK VIEW ─────────────────────────────────────────────────────
  if (view === 'week') {
    const ws         = getWeekStart(STATE.plannerWeekOffset);
    const archiveMode = isArchivePeriod(fmtDate(ws));
    const archY      = ws.getFullYear();
    const archM      = ws.getMonth();
    const archKey    = archY + '-' + String(archM + 1).padStart(2,'0');

    // Load archive if needed
    if (archiveMode && !STATE.archiveCache[archKey] && !STATE.archiveCache._fetched) {
      container.innerHTML = hdr
        + '<div style="padding:24px;color:var(--muted);font-size:13px;text-align:center">'
        + '<i class="ti ti-loader" style="font-size:24px;opacity:0.4;display:block;margin-bottom:8px"></i>'
        + 'Loading archived week…</div>';
      fetchArchiveMonth(archY, archM).then(() => renderPlanner());
      return;
    }

    // Build a chip — returns '' if filtered out
    const mkChip = (item, fallbackLabel) => {
      if (item.type === 'task'  && !pf.tasks)   return '';
      if (item.type === 'event' && !pf.events)  return '';
      if (item.type === 'entry' && !pf.entries) return '';
      const cls      = ppClass(item.priority);
      const timeLabel = item.time ? fmtTime(item.time) : fallbackLabel;
      const title     = (item.title || '').replace(/"/g, '&quot;');
      return '<div class="planner-chip ' + cls + '"'
           + ' onclick="_plannerOpenItem(\''+item.id+'\');">'
           + '<span class="planner-chip-lbl">' + timeLabel + '</span>'
           + '<span class="planner-chip-title">' + title + '</span>'
           + '</div>';
    };

    let dayColsHTML = '';
    let hasAnyItems = false;

    // Sort: due tasks, start tasks, events by time, entries by time
    const sortByTime = arr => arr.slice().sort((a,b) => (a.time||'').localeCompare(b.time||''));

    for (let i = 0; i < 7; i++) {
      const d       = new Date(ws); d.setDate(ws.getDate() + i);
      const dayDate = fmtDate(d);
      const isToday = dayDate === fmtDate(TODAY);
      const dayName = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i];

      let dueT, startT, evts, ents;
      if (archiveMode) {
        const src = STATE.archiveCache[archKey] || [];
        dueT   = src.filter(t => t.type === 'task'  && t.dueDate    === dayDate);
        startT = src.filter(t => t.type === 'task'  && t.startDate  === dayDate && t.dueDate !== dayDate);
        evts   = src.filter(e => e.type === 'event' && e.date       === dayDate);
        ents   = src.filter(e => e.type === 'entry' && e.date       === dayDate);
      } else {
        dueT   = getTasks().filter(t => t.dueDate   === dayDate && parseStatus(t.status).state !== 'Completed');
        startT = getTasks().filter(t => t.startDate === dayDate && t.dueDate !== dayDate && parseStatus(t.status).state !== 'Completed');
        evts   = getEvents().filter(e => e.date === dayDate);
        ents   = getEntries().filter(e => e.date === dayDate);
      }

      if (dueT.length || startT.length || evts.length || ents.length) hasAnyItems = true;

      // Sort: due tasks by priority, start tasks by priority,
      // then events + entries merged and sorted by time
      const timedEvtsEnts = sortByTime([...evts, ...ents]);
      const chips = sortByPriority(dueT).map(t => mkChip(t, 'DUE')).join('')
        + sortByPriority(startT).map(t => mkChip(t, 'START')).join('')
        + timedEvtsEnts.map(e => mkChip(e, '')).join('');

      const todayCls   = isToday ? ' is-today' : '';
      const archiveCls = archiveMode ? ' archived-col' : '';
      const todayDot   = isToday ? '<div class="planner-today-dot"></div>' : '';
      const addBtn     = !archiveMode
        ? '<div class="planner-day-add"><button onclick="openTEEModal(null,null,\''+dayDate+'\')">+ Add</button></div>'
        : '';

      dayColsHTML += '<div class="planner-day-col' + todayCls + archiveCls + '">'
        + '<div class="planner-day-hdr">'
        + '<span class="planner-day-name">' + dayName + '</span>'
        + '<span class="planner-day-num">' + d.getDate() + '</span>'
        + todayDot
        + '</div>'
        + '<div class="planner-day-items">' + chips + '</div>'
        + addBtn
        + '</div>';
    }

    // Archive badge
    let archiveBadge = '';
    if (archiveMode) {
      archiveBadge = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
        + '<span class="planner-archive-badge">'
        + '<i class="ti ti-archive" style="font-size:11px"></i>'
        + 'Archived · read only</span>'
        + '<button class="planner-archive-link" onclick="changeWeek(0)">'
        + 'Back to current week ›</button>'
        + '</div>';
    }

    // Empty state
    let emptyHTML = '';
    if (!hasAnyItems) {
      emptyHTML = '<div class="planner-empty-week">'
        + '<i class="ti ti-calendar" style="font-size:32px;opacity:0.35"></i>'
        + '<span>Nothing scheduled this week</span>'
        + '</div>';
    }

    container.innerHTML = hdr + archiveBadge
      + '<div class="planner-week-grid">' + dayColsHTML + '</div>'
      + emptyHTML;
    return;
  }

  // ── DAY VIEW ─────────────────────────────────────────────────────
  if (view === 'day') {
    const dayOffset  = STATE.plannerDayOffset || 0;
    const dDay       = new Date(TODAY); dDay.setDate(dDay.getDate() + dayOffset);
    const dayDate    = fmtDate(dDay);
    const archiveMode = isArchivePeriod(dayDate);
    const archKey    = dayDate.substring(0, 7);

    if (archiveMode && !STATE.archiveCache[archKey] && !STATE.archiveCache._fetched) {
      container.innerHTML = hdr
        + '<div style="padding:24px;color:var(--muted);font-size:13px;text-align:center">'
        + 'Loading…</div>';
      fetchArchiveMonth(dDay.getFullYear(), dDay.getMonth()).then(() => renderPlanner());
      return;
    }

    let dueT, startT, evts, ents;
    if (archiveMode) {
      const src = STATE.archiveCache[archKey] || [];
      dueT   = src.filter(t => t.type === 'task'  && t.dueDate   === dayDate);
      startT = src.filter(t => t.type === 'task'  && t.startDate === dayDate && t.dueDate !== dayDate);
      evts   = src.filter(e => e.type === 'event' && e.date === dayDate);
      ents   = src.filter(e => e.type === 'entry' && e.date === dayDate);
    } else {
      // On today: hide completed tasks (they show in Today tab Done section)
      // On other dates: show all tasks including completed
      const isViewingToday = dayDate === fmtDate(TODAY);
      dueT   = getTasks().filter(t => t.dueDate   === dayDate && (isViewingToday ? parseStatus(t.status).state !== 'Completed' : true));
      startT = getTasks().filter(t => t.startDate === dayDate && t.dueDate !== dayDate && (isViewingToday ? parseStatus(t.status).state !== 'Completed' : true));
      evts   = getEvents().filter(e => e.date === dayDate);
      ents   = getEntries().filter(e => e.date === dayDate);
    }

    // ── Shared day-card builder (unscheduled + open-tasks sections) ──
    const buildPlannerDayCard = (t, dayDate) => {
      // ── Priority border color ──────────────────────────────────
      const bc = ppClass(t.priority).replace('pp-','');
      const cm = {crit:'#F87171', high:'#FB923C', med:'#0891B2', low:'var(--border2)'};
      const lc = cm[bc] || 'var(--border2)';

      // ── Priority badge (reuses PRIORITY object) ────────────────
      const priBadge = _buildPriorityBadge(t);
      const stBadge = _buildStatusBadge(t);

      // ── Subtask chip ───────────────────────────────────────────
      const stChip = _subtaskChip(t);

      // ── Due chip + date ─────────────────────────────────────────
      const dueChipHTML = _buildCounterChip(t.dueDate, dayDate);
      const ctxChipHTML  = _buildContextChips(t, dayDate);
      const dateLabel = t.dueDate
        ? '<span class="planner-day-card-date">' + t.dueDate + '</span>'
        : '';

      // ── Build card ─────────────────────────────────────────────
      return '<div class="planner-day-card" style="border-left-color:' + lc + '"'
        + ' onclick="_plannerOpenItem(\''+t.id+'\');">'
        // Line 1: priority + status left, subtask chip right
        + '<div class="planner-day-card-row1">'
        + priBadge + stBadge
        + '<span style="margin-left:auto">' + ctxChipHTML + stChip + '</span>'
        + '</div>'
        // Line 2: title left, due chip + date right
        + '<div class="planner-day-card-row2">'
        + '<span class="planner-day-card-title">' + (t.title||'') + '</span>'
        + '<div class="planner-day-card-due">' + dueChipHTML + dateLabel + '</div>'
        + '</div>'
        + '</div>';
    };

    // ── Unscheduled tasks at top ──────────────────────────────────
    const unscheduled = pf.tasks ? sortByPriority([...dueT, ...startT]) : [];
    let unschHTML = '';
    if (unscheduled.length > 0) {
      unschHTML += '<div class="planner-day-cards">';
      unscheduled.forEach(t => {
        unschHTML += buildPlannerDayCard(t, dayDate);
      });
      unschHTML += '</div>';
    }

    // ── Time grid 7am – 9pm ───────────────────────────────────────
    // hours calculated after timedItems below
    const timedItems = [
      ...(pf.events  ? evts : []),
      ...(pf.entries ? ents : []),
    ].filter(i => i.time);

    // Hours: 7am to latest item hour + 1 (min 9pm) — no dead space
    // Default window: 8am–6pm. Extends if items fall outside.
    const earliestHour = timedItems.reduce((min, i) => {
      const h = parseInt((i.time||'').split(':')[0], 10);
      return isNaN(h) ? min : Math.min(min, h);
    }, 8);
    const latestHour = timedItems.reduce((max, i) => {
      const h = parseInt((i.time||'').split(':')[0], 10);
      return isNaN(h) ? max : Math.max(max, h);
    }, 16); // default 16 so endHour = 17 (5pm) when no late items
    const startHour = Math.min(8, earliestHour);
    const endHour   = Math.max(17, latestHour + 1);
    const hours     = Array.from({length: endHour - startHour + 1}, (_, i) => i + startHour);

    let timeHTML = '';
    hours.forEach(h => {
      const hLabel   = h === 12 ? '12 pm' : h < 12 ? (h + ' am') : ((h - 12) + ' pm');
      const atHour   = timedItems.filter(i => parseInt((i.time||'').split(':')[0], 10) === h);
      let rowContent = '';
      atHour.forEach(i => {
        const cls = ppClass(i.priority);
        rowContent += '<div class="planner-time-event ' + cls + '"'
          + ' onclick="_plannerOpenItem(\''+i.id+'\');">'
          + fmtTime(i.time) + ' · ' + (i.title||'')
          + '</div>';
      });
      timeHTML += '<div class="planner-time-row">'
        + '<div class="planner-time-label">' + hLabel + '</div>'
        + '<div class="planner-time-content">' + rowContent + '</div>'
        + '</div>';
    });

    // Schedule section header + scrollable time grid
    const schedHTML = '<div class="planner-day-schedule">'
      + (timedItems.length > 0
        ? '<div class="planner-time-grid">' + timeHTML + '</div>'
        : '<div class="planner-empty-week" style="padding:32px 16px">'
          + '<i class="ti ti-calendar" style="font-size:28px;opacity:0.3"></i>'
          + '<span>No scheduled items</span></div>')
      + '</div>';

    // Empty state (nothing at all)
    const isEmpty = unscheduled.length === 0 && timedItems.length === 0;
    const emptyHTML = isEmpty
      ? '<div class="planner-empty-week">'
        + '<i class="ti ti-calendar" style="font-size:32px;opacity:0.35"></i>'
        + '<span>Nothing scheduled for this day</span>'
        + '</div>'
      : '';

    // Archive badge
    let archiveBadge = '';
    if (archiveMode) {
      archiveBadge = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:0 24px">'
        + '<span class="planner-archive-badge">'
        + '<i class="ti ti-archive" style="font-size:11px"></i>'
        + 'Archived · read only</span>'
        + '<button class="planner-archive-link" onclick="_plannerToday()">'
        + 'Back to today ›</button>'
        + '</div>';
    }

    // ── Open Tasks section (collapsed by default) ────────────────
    let openTasksHTML = '';
    if (!archiveMode && pf.tasks) {
      const _openSt = ['Backlog','To Do','In Progress','Review'];
      const _openTasks = getTasks().filter(t => {
        if (parseStatus(t.status).state === 'Completed') return false;
        if (t.dueDate === dayDate) return false;
        if (t.startDate === dayDate && t.dueDate !== dayDate) return false;
        const isOverdue = t.dueDate && daysUntil(t.dueDate) < 0;
        return _openSt.includes(parseStatus(t.status).state) || isOverdue;
      });
      _openTasks.sort((a, b) => {
        const da = daysUntil(a.dueDate), db = daysUntil(b.dueDate);
        const aOver = da !== null && da < 0;
        const bOver = db !== null && db < 0;
        if (aOver && !bOver) return -1;
        if (!aOver && bOver) return 1;
        if (aOver && bOver) return da - db;
        if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        return priOrder(a.priority) - priOrder(b.priority);
      });
      if (_openTasks.length > 0) {
        const _isOpen = STATE.plannerActiveTasksOpen;
        const _oc2 = 'STATE.plannerActiveTasksOpen=!STATE.plannerActiveTasksOpen;renderPlanner()';
        openTasksHTML = '<div class="planner-open-hdr" onclick="' + _oc2 + '">'
          + '<i class="ti ti-layout-list" style="font-size:13px"></i>'
          + ' Open Tasks (' + _openTasks.length + ')'
          + '<span class="planner-open-hdr-chevron' + (_isOpen?' open':'') + '">›</span>'
          + '</div>';
        if (_isOpen) {
          openTasksHTML += '<div class="planner-open-cards">';
          _openTasks.forEach(t => {
            openTasksHTML += buildPlannerDayCard(t, dayDate);
          });
          openTasksHTML += '</div>';
        }
      }
    }

    // ── Assemble final Day View ───────────────────────────────────
    // Task List section — frozen header + scrollable cards
    const taskListHTML = (isEmpty && !openTasksHTML)
      ? emptyHTML
      : '<div class="planner-day-section planner-day-section-tasks">'
        + '<div class="planner-day-sec-hdr">'
        + '<i class="ti ti-clipboard-list" style="font-size:13px"></i> Task List</div>'
        + '<div class="planner-day-tasklist">' + unschHTML + openTasksHTML + '</div>'
        + '</div>';

    // Schedule section — frozen header + scrollable time grid
    const schedSectionHTML = '<div class="planner-day-section planner-day-section-sched">'
      + '<div class="planner-day-sec-hdr">'
      + '<i class="ti ti-clock" style="font-size:13px"></i> Schedule</div>'
      + schedHTML
      + '</div>';

    container.innerHTML = hdr + archiveBadge
      + '<div class="planner-day-view" style="margin:0 24px 28px;flex:1;min-height:0">'
      + taskListHTML + schedSectionHTML
      + '</div>';
    return;
  }

  } catch(e) {
    console.error('renderPlanner failed:', e);
    container.innerHTML = '<div style="padding:24px;color:var(--muted);font-size:13px">'
      + 'Planner failed to load. <button onclick="renderPlanner()" '
      + 'style="color:var(--accent2);background:none;border:none;cursor:pointer;'
      + 'font-size:13px;text-decoration:underline">Retry</button></div>';
  }
}


function changeWeek(dirOrReset) {
  if (dirOrReset === 0) STATE.plannerWeekOffset = 0;
  else STATE.plannerWeekOffset += dirOrReset;
  renderPlanner();
}

/* Show all items on a given date — primary click handler for all monthly calendar cells */
function openDayList(dateStr, archiveMode) {
  let items;
  if (archiveMode) {
    const key = dateStr.substring(0, 7);
    const src = STATE.archiveCache[key] || [];
    items = src.filter(i => i.type === 'task' ? i.dueDate === dateStr : i.date === dateStr);
  } else {
    items = itemsOnDate(dateStr);
  }
  const d = new Date(dateStr + 'T00:00:00');
  const label = d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
  const isToday = dateStr === fmtDate(TODAY);

  const dueTasks   = items.filter(i => i.type === 'task' && i._dateRole === 'due');
  const startTasks = items.filter(i => i.type === 'task' && i._dateRole === 'start');
  const timedItems = items.filter(i => i.type !== 'task');
  const sorted = sortPlannerItems(dueTasks, startTasks, timedItems);

  const listHTML = sorted.length === 0
    ? `<div style="text-align:center;padding:28px 0;color:var(--muted)">
         <div style="font-size:28px;margin-bottom:8px">📭</div>
         <div style="font-size:13px">Nothing scheduled for this day</div>
       </div>`
    : sorted.map(i => {
        const typeIcon  = { task:'📋', event:'📆', entry:'📝' }[i.type] || '📄';
        const pri       = getPri(i.priority);
        const timeStr   = i.time ? fmtTimeRange(i.time, i.endTime) : '';
        const statusBit = i.type === 'task'
          ? `<span style="font-size:10px;padding:1px 7px;border-radius:20px;background:var(--glass2);color:var(--text2);border:1px solid var(--border)">${parseStatus(i.status).state||i.status}</span>`
          : '';
        return `<div class="day-list-item" onclick="_navTo(()=>openDayList('${dateStr}',${archiveMode}),()=>openTEEDetail('${i.id}'))">
          <span style="font-size:18px;flex-shrink:0">${typeIcon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:16px;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:var(--text)">${i.title}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:3px;flex-wrap:wrap">
              ${timeStr ? `<span style="font-size:11px;font-family:var(--mono);color:var(--muted)">🕐 ${timeStr}</span>` : ''}
              ${i.category ? `<span style="font-size:10px;color:var(--text2)">${i.category}</span>` : ''}
              ${statusBit}
            </div>
          </div>
          <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <span style="font-size:10px;padding:2px 7px;border-radius:20px;background:${pri.bg};color:${pri.text};font-weight:600">${i.priority}</span>
          </div>
        </div>`;
      }).join('');

  openModal(`
    <div class="modal-title">
      <div>
        <div style="font-size:17px;font-weight:700">${label}</div>
        ${isToday ? '<div style="font-size:11px;color:var(--accent2);font-weight:600;margin-top:2px">Today</div>' : ''}
      </div>
      ${_modalCloseBtn()}
    </div>
    ${sorted.length > 0 ? `<div style="font-size:11px;color:var(--muted);margin-bottom:12px">${sorted.length} item${sorted.length>1?'s':''} — tap to view details</div>` : ''}
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px">${listHTML}</div>
    <div class="modal-actions">
      ${_backBtn()}
      ${!archiveMode ? `<button class="btn-primary" onclick="clearNav();openTEEModal(null,'entry','${dateStr}')">+ Add Item</button>` : ''}
    </div>`);
}

// ═══════════════════════════════════════════════════════════
// REMINDERS TAB — Shows all notes, sorted pinned-first then newest
// Each note has independent Pin (📌) and Float (📍) toggles
// ═══════════════════════════════════════════════════════════
