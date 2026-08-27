// ============================================================
// 15-page-kanban.js
// Kanban page (renderBoard) + archive drawer
// (lines 7593-7937 of the original inline <script>)
// ============================================================

function renderBoard() {
  try {
  const f = STATE.kanbanFilter;
  const today = fmtDate(TODAY);
  const in7   = fmtDate(new Date(TODAY.getTime() + 7*24*60*60*1000));
  const allTasks = STATE.items.filter(t => t.type === 'task' || t.type === 'ideal' || t.type === 'temporary');

  // ── Context pill filter ───────────────────────────────────────────
  let contextFiltered = allTasks.filter(t => {
    const st   = parseStatus(t.status).state;
    const workflow = (t.type === 'ideal' || t.type === 'temporary') ? _workflowProgressFromAssignments(t) : null;
    const effectiveState = workflow ? (workflow.done ? 'Completed' : (workflow.forReview ? 'For Review' : workflow.column)) : st;
    const days = daysUntil(t.dueDate);
    switch (f.context) {
      case 'all':        return true;
      case 'open':       return effectiveState !== 'Completed';
      case 'done':       return effectiveState === 'Completed';
      case 'overdue':    return effectiveState !== 'Completed' && ((workflow?.forReview) || (days !== null && days < 0));
      case 'today':      return t.dueDate === today;
      case 'week':       return t.dueDate && t.dueDate >= today && t.dueDate <= in7;
      case 'noassignee': return !t.assignees || t.assignees.trim() === '';
      default:           return st !== 'Completed';
    }
  });

  // ── Search + priority + assignee refinements ──────────────────────
  let visible = contextFiltered.filter(t => {
    if (f.search && !t.title.toLowerCase().includes(f.search.toLowerCase())) return false;
    if (f.priority !== 'All' && t.priority !== f.priority) return false;
    if (f.assignee !== 'All') {
      const parts = (t.assignees||'').split('|').map(s=>s.trim());
      if (!parts.includes(f.assignee)) return false;
    }
    return true;
  });

  // ── Pill counts ───────────────────────────────────────────────────
  const _workflowBoardState = t => (t.type === 'ideal' || t.type === 'temporary') ? _workflowProgressFromAssignments(t) : null;
  const _isBoardDone = t => { const w=_workflowBoardState(t); return w ? w.done : parseStatus(t.status).state === 'Completed'; };
  const cOpen      = allTasks.filter(t => !_isBoardDone(t)).length;
  const cDone      = allTasks.filter(t => _isBoardDone(t)).length;
  const cOverdue   = allTasks.filter(t => { const w=_workflowBoardState(t); const d=daysUntil(t.dueDate); return !_isBoardDone(t) && ((w?.forReview) || (d!==null&&d<0)); }).length;
  const cToday     = allTasks.filter(t => !_isBoardDone(t) && t.dueDate === today).length;
  const cWeek      = allTasks.filter(t => !_isBoardDone(t) && t.dueDate && t.dueDate >= today && t.dueDate <= in7).length;
  const cNoAssign  = allTasks.filter(t => !_isBoardDone(t) && (!t.assignees || t.assignees.trim() === '')).length;

  const _emptyMsgs = {
    'Backlog':'Nothing in the backlog',
    'To Do':'No tasks to do',
    'In Progress':'Nothing in progress',
    'Completed':'No completed tasks'
  };

  const _kbPriOrd = p => p==='Critical'?0:p==='High'?1:p==='Medium'?2:p==='Low'?3:4;

  const buildCardTags = (t) => {
    // Tags
    const allTags   = (t.tags||[]).slice(0,6);
    const tagsRow1  = allTags.slice(0,3);
    const tagsRow2  = allTags.slice(3);
    const mkTag     = tag => _buildTagChip(tag);
    const tags1HTML = tagsRow1.length ? `<div style="display:flex;gap:3px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;max-width:50%">${tagsRow1.map(mkTag).join('')}</div>` : '';
    const tags2HTML = tagsRow2.length ? `<div style="display:flex;gap:3px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;max-width:50%">${tagsRow2.map(mkTag).join('')}</div>` : '';
    return { tagsRow2, tags1HTML, tags2HTML };
  };

  const buildCardMetaRight = (t) => {
    const { state: _ms, doneAt: _da } = parseStatus(t.status);
    let metaRight = '';
    if (_ms==='Completed'||_ms==='Done') {
      if (_da) {
        const _dp = _da.split(' ');
        const _doneDate = _dp[0] || '';
        const _doneTime = _dp[1] ? fmtTime(_dp[1]) : '';
        metaRight = 'Done ' + [_doneDate, _doneTime].filter(Boolean).join(' ');
      } else {
        metaRight = 'Completed';
      }
    } else if (t.dueDate) {
      metaRight = t.dueDate;
    }
    return metaRight;
  };

  const buildBoardCard = (t, isCompleted) => {
    // Unified chip/badge system
    const evBorder      = _buildAccentBorder(t.priority);
    const priorityBadge = _buildPriorityBadge(t);
    const statusBadge   = _buildStatusBadge(t);
    const dueChip       = isCompleted ? '' : _buildCounterChip(t.dueDate);
    const ctxChips      = _buildContextChips(t);
    const workflow      = (t.type === 'ideal' || t.type === 'temporary') ? _workflowProgressFromAssignments(t) : null;
    const workflowBadge = workflow ? `<span class="status-badge-btn" style="background:${workflow.forReview ? 'rgba(192,132,252,0.18)' : 'rgba(79,154,181,0.14)'};color:${workflow.forReview ? '#C084FC' : 'var(--accent2)'};border:1px solid ${workflow.forReview ? 'rgba(192,132,252,0.35)' : 'rgba(79,154,181,0.28)'}">${workflow.forReview ? 'For Review' : workflow.state}</span>` : '';
    const workflowTypeBadge = (t.type === 'ideal' || t.type === 'temporary') ? _buildTypeBadge(t.type) : '';
    const { tagsRow2, tags1HTML, tags2HTML } = buildCardTags(t);
    // Subtask chip + meta
    const stChip = _subtaskChip(t);
    const metaRight = buildCardMetaRight(t);
    const titleStyle = isCompleted ? 'text-decoration:line-through;opacity:0.6;' : '';
    return `<div class="gt-card" style="${evBorder}" draggable="true" ondragstart="dragStart('${t.id}')" ondragend="dragEnd()" onclick="openTEEDetail('${t.id}')" title="Click to view/edit">
        <div class="gt-card-row1">
          ${workflowTypeBadge || priorityBadge}${workflowBadge || statusBadge}
          <span style="display:flex;align-items:center;gap:4px;margin-left:auto">${ctxChips}${stChip}</span>
        </div>
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin:4px 0 2px">
          <div class="gt-card-title" style="margin:0;flex:1;min-width:0;${titleStyle}">${t.title}</div>
          ${tags1HTML}
        </div>
        ${(t.desc||tagsRow2.length) ? `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:4px">
          ${t.desc ? `<div class="gt-card-desc-wrap" style="flex:1;min-width:0">${t.desc}</div>` : '<div></div>'}
          ${tags2HTML}
        </div>` : ''}
        ${workflow ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px">${workflow.productListOverdue ? '<span class="ctx-chip" style="background:rgba(248,113,113,0.18);color:#F87171;border:1px solid rgba(248,113,113,0.35)">Product List Overdue</span>' : ''}${workflow.planogramOverdue ? '<span class="ctx-chip" style="background:rgba(248,113,113,0.18);color:#F87171;border:1px solid rgba(248,113,113,0.35)">Planogram Overdue</span>' : ''}</div>` : ''}
        ${workflow ? _categoryProgressStripHTML(t) : ''}
        <div class="gt-card-footer">
          <div class="gt-card-footer-left">${renderAssigneeStack(t.assignees||'', false, t.type)}</div>
          <div class="gt-card-footer-right">${dueChip}${workflow?.forReview ? '<span class="gt-card-meta" style="color:#C084FC">Review</span>' : ''}${metaRight ? `<span class="gt-card-meta">${metaRight}</span>` : ''}</div>
        </div>
        ${isCompleted ? `<button class="archive-card-btn" onclick="event.stopPropagation();archiveItem('${t.id}')">Archive</button>` : ''}
      </div>`;
  };

  const colsHTML = KANBAN_COLS.map(col => {
    const colTasks = visible.filter(t=>{
      if (t.type === 'ideal' || t.type === 'temporary') return _workflowProgressFromAssignments(t).column === col.id;
      return parseStatus(t.status).state === col.id;
    })
      .sort((a,b) => {
        const pd = _kbPriOrd(a.priority) - _kbPriOrd(b.priority);
        if (pd !== 0) return pd;
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
    const isCompleted = col.id === 'Completed';
    // Completed column cap — dynamic based on screen height
    const cardsHTML = colTasks.map(t => buildBoardCard(t, isCompleted)).join('');

    return `<div class="kanban-col" ondragover="dragOver(event,'${col.id}')" ondrop="drop(event,'${col.id}')">
      <div class="kanban-col-header" style="border-top:2px solid ${getColColor(col)}">
        <div class="kanban-dot" style="background:${getColColor(col)};box-shadow:0 0 6px ${getColColor(col)}"></div>
        <span class="kanban-col-name" style="color:${getColColor(col)}">${col.label}</span>
        <span class="kanban-count" style="color:${getColColor(col)}">${colTasks.length}</span>
      </div>
      <div class="kanban-body">${cardsHTML || '<div class="kanban-empty-col">'+(_emptyMsgs[col.id]||'No tasks')+'</div>'}</div>
      <button class="kanban-add-btn" onclick="openTEEModal(null,'task',null,'${col.id}')">+ Add task</button>
    </div>`;
  }).join('');

  // ── Priority + assignee counts for dropdowns ─────────────────────
  // Base for priority counts — respects active assignee filter
  const _baseForPri = allTasks.filter(t =>
    parseStatus(t.status).state !== 'Completed' &&
    (f.assignee === 'All' || (t.assignees||'').split('|').map(s=>s.trim()).includes(f.assignee))
  );
  const priCounts = {};
  ['Critical','High','Medium','Low'].forEach(p => {
    priCounts[p] = _baseForPri.filter(t => t.priority === p).length;
  });
  // Base for assignee counts — respects active priority filter
  const _baseForAssignee = allTasks.filter(t =>
    parseStatus(t.status).state !== 'Completed' &&
    (f.priority === 'All' || t.priority === f.priority)
  );
  const assigneeNames = new Set();
  _baseForAssignee.forEach(t => splitAssigneeNames(t.assignees).forEach(n=>assigneeNames.add(n)));
  const assigneeCounts = {};
  assigneeNames.forEach(n => {
    assigneeCounts[n] = _baseForAssignee.filter(t => (t.assignees||'').split('|').map(s=>s.trim()).includes(n)).length;
  });

  // ── Priority dropdown HTML ────────────────────────────────────────
  const priColors = {Critical:'#F87171',High:'#FB923C',Medium:'#0891B2',Low:'#64748B'};
  const priFloatHTML = '<div class="kb-float-item' + (f.priority==='All'?' active':'') + '" onclick="_kbSetPriority(\'All\')">All Priorities</div>'
    + ['Critical','High','Medium','Low'].map(p =>
        '<div class="kb-float-item' + (f.priority===p?' active':'') + '" onclick="_kbSetPriority(\''+p+'\')"><span class="kb-float-dot" style="background:'+priColors[p]+'"></span>'+p+'<span class="kb-float-count">'+( priCounts[p]||0)+'</span></div>'
      ).join('');
  const priCount  = _baseForPri.filter(t => t.priority === f.priority).length;
  const priLabel  = f.priority === 'All' ? 'All Priority' : f.priority + ' (' + priCount + ')';
  const priColor  = priColors[f.priority] || null;
  const priActive = f.priority !== 'All';

  // ── Assignee dropdown HTML ────────────────────────────────────────
  const assigneeFloatHTML = '<div class="kb-float-item' + (f.assignee==='All'?' active':'') + '" onclick="_kbSetAssignee(\'All\')">All Assignees</div>'
    + [...assigneeNames].map(n =>
        '<div class="kb-float-item' + (f.assignee===n?' active':'') + '" onclick="_kbSetAssignee(\''+n+'\')">'+n+'<span class="kb-float-count">'+assigneeCounts[n]+'</span></div>'
      ).join('');
  const assigneeCount = f.assignee === 'All' ? 0 : _baseForAssignee.filter(t => (t.assignees||'').split('|').map(s=>s.trim()).includes(f.assignee)).length;
  const assigneeLabel = f.assignee === 'All' ? 'All Assignees' : f.assignee + ' (' + assigneeCount + ')';
  const assigneeActive = f.assignee !== 'All';

  // ── Context subtitle ──────────────────────────────────────────────
  const ctxLabels = {open:'Open Tasks',done:'Completed',overdue:'Overdue',today:'Due Today',week:'Next 7 Days',noassignee:'No Assignee'};
  const ctxSubtitle = f.context === 'all' ? 'All Tasks' : ctxLabels[f.context] || 'All Tasks';

  // Store float HTML in STATE for button onclick access
  STATE._kbPriFloatHTML      = priFloatHTML;
  STATE._kbAssigneeFloatHTML = assigneeFloatHTML;

  // Capture focus state BEFORE re-render destroys DOM
  const _wasSearchFocused = _captureSearchFocus('kanban-search-input');

  document.getElementById('boardSection').innerHTML = `
    <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:12px;flex-shrink:0">
      <span style="font-size:26px;font-weight:800;letter-spacing:-0.03em;line-height:1.1;color:var(--text);font-family:var(--font-disp)">Kanban Board</span>
      <span style="font-size:26px;font-weight:400;color:var(--muted);font-family:var(--font-disp)"> · ${ctxSubtitle}</span>
      <div style="display:flex;gap:8px;margin-left:auto">
        <button class="btn-ghost" onclick="openArchiveDrawer()">View Archive</button>
        <button class="btn-primary" onclick="openTEEModal(null,'task',null,'Backlog')">+ New Task</button>
      </div>
    </div>
    <div class="kanban-board-wrap">

    <div class="kb-pill-strip" style="margin-bottom:8px">
      <button class="kb-pill${f.context==='open'?' active':''}" onclick="_kbSetContext('open')">
        <span class="kb-pill-num">${cOpen}</span> OPEN TASKS
      </button>
      ${cDone > 0 ? `<button class="kb-pill done${f.context==='done'?' active':''}" onclick="_kbSetContext('done')"><span class="kb-pill-num">${cDone}</span> COMPLETED</button>` : ''}
      ${cOverdue > 0 ? `<button class="kb-pill overdue${f.context==='overdue'?' active':''}" onclick="_kbSetContext('overdue')"><span class="kb-pill-num">${cOverdue}</span> OVERDUE</button>` : ''}
      ${cToday > 0 ? `<button class="kb-pill today${f.context==='today'?' active':''}" onclick="_kbSetContext('today')"><span class="kb-pill-num">${cToday}</span> TODAY</button>` : ''}
      ${cWeek > 0 ? `<button class="kb-pill week${f.context==='week'?' active':''}" onclick="_kbSetContext('week')"><span class="kb-pill-num">${cWeek}</span> NEXT 7 DAYS</button>` : ''}
      ${cNoAssign > 0 ? `<button class="kb-pill noassignee${f.context==='noassignee'?' active':''}" onclick="_kbSetContext('noassignee')"><span class="kb-pill-num">${cNoAssign}</span> NO ASSIGNEE</button>` : ''}
    </div>
    <div class="kb-pill-strip" style="margin-bottom:12px">
      <div class="kb-search-wrap">
        <i class="ti ti-search" style="font-size:12px;color:var(--muted)"></i>
        <input id="kanban-search-input" placeholder="Search tasks…" value="${f.search}"
          oninput="STATE.kanbanFilter.search=this.value;renderBoard();">
      </div>
      <button class="kb-dropdown-btn${priActive?' active':''}" onclick="_kbOpenPriFloat(this)"
        style="${priColor ? 'border-color:'+priColor+';color:'+priColor+';background:'+priColor+'22;' : ''}">
        ${priLabel} &nbsp;&#9660;
      </button>
      <button class="kb-dropdown-btn${assigneeActive?' active':''}" onclick="_kbOpenAssigneeFloat(this)">
        ${assigneeLabel} &nbsp;&#9660;
      </button>
    </div>

    <div class="kanban-wrap">${colsHTML}</div>
    </div>
  `;
  // Restore focus to search if it was active before re-render
  _restoreSearchFocus('kanban-search-input', _wasSearchFocused);
  } catch(e) {
    console.error('renderBoard error:', e);
    const _bs = document.getElementById('boardSection');
    if (_bs) _bs.innerHTML = '<div style="padding:24px;color:#F87171;font-size:13px">Kanban error: ' + e.message + '</div>';
  }
}

/* ── ARCHIVE DRAWER ── */
// ── ARCHIVE DRAWER ────────────────────────────────────────────
// Lazy-loads archived tasks from STATE.archiveCache, with
// search / priority / assignee filters and one-click restore
function openArchiveDrawer() {
  // Load archive cache if not already fetched
  if (!STATE.archiveCache._fetched && STATE.sheetConnected) {
    openModal(`
      ${buildModalListHeader('📦', 'Task Archive', 'Loading…')}
      <div style="text-align:center;padding:40px;color:var(--muted)">Loading archive…</div>`);
    // Fetch and re-open once loaded
    const now = new Date();
    fetchArchiveMonth(now.getFullYear(), now.getMonth())
      .then(() => { openArchiveDrawer(); });
    return;
  }

  // Flatten all archive cache into one array (tasks only for this drawer)
  const allArchived = Object.entries(STATE.archiveCache)
    .filter(([k]) => k !== '_fetched')
    .flatMap(([, items]) => items)
    .filter(i => i.type === 'task');

  _renderArchiveDrawer('', 'All', 'All');
}

function _renderArchiveDrawer(search, priority, assignee) {
  // Always read fresh from cache
  const allArchived = Object.entries(STATE.archiveCache)
    .filter(([k]) => k !== '_fetched')
    .flatMap(([, items]) => items)
    .filter(i => i.type === 'task');

  const assignees = ['All', ...new Set(allArchived.flatMap(t=>splitAssigneeNames(t.assignees)).filter(Boolean))];
  let filtered = allArchived.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (priority !== 'All' && t.priority !== priority) return false;
    if (assignee !== 'All' && !splitAssigneeNames(t.assignees||'').includes(assignee)) return false;
    return true;
  });

  filtered = filtered.slice().sort((a,b) => (b.archivedDate||'').localeCompare(a.archivedDate||''));

  const rowsHTML = filtered.length === 0
    ? `<div style="text-align:center;padding:40px 20px;color:var(--muted)">
        <div style="font-size:32px;margin-bottom:10px">📦</div>
        <div>No archived tasks match your filters</div>
      </div>`
    : filtered.map(t => {
        const pri = getPri(t.priority);
        return `<div class="archive-row">
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;text-decoration:line-through;opacity:0.8">${t.title}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px;display:flex;gap:8px;flex-wrap:wrap">
              <span style="font-family:var(--mono)">${t.id}</span>
              <span>${splitAssigneeNames(t.assignees).join(', ')||'Unassigned'}</span>
              ${t.archivedDate ? `<span>Archived ${t.archivedDate}</span>` : ''}
              ${t.dueDate ? `<span>Due was ${t.dueDate}</span>` : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <span style="font-size:10px;padding:2px 8px;border-radius:20px;background:${pri.bg};color:${pri.text}">${t.priority}</span>
            <button class="btn-ghost" style="height:30px;padding:0 12px;font-size:12px" onclick="restoreFromArchive('${t.id}')">Restore</button>
          </div>
        </div>`;
      }).join('');

  openModal(`
    ${buildModalListHeader('📦', 'Task Archive', `${allArchived.length} archived task${allArchived.length!==1?'s':''} · ${filtered.length} shown`)}

    <div class="archive-filter-bar">
      <input id="arch-search" placeholder="Search…" value="${search}"
        oninput="_renderArchiveDrawer(this.value,document.getElementById('arch-priority').value,document.getElementById('arch-assignee').value)"
        style="flex:1;min-width:120px">
      <select id="arch-priority" onchange="_renderArchiveDrawer(document.getElementById('arch-search').value,this.value,document.getElementById('arch-assignee').value)">
        <option value="All"${priority==='All'?' selected':''}>All Priorities</option>
        ${['Critical','High','Medium','Low'].map(p=>`<option value="${p}"${priority===p?' selected':''}>${p}</option>`).join('')}
      </select>
      <select id="arch-assignee" onchange="_renderArchiveDrawer(document.getElementById('arch-search').value,document.getElementById('arch-priority').value,this.value)">
        ${assignees.map(a=>`<option value="${a}"${assignee===a?' selected':''}>${a==='All'?'All Assignees':a}</option>`).join('')}
      </select>
    </div>

    <div style="display:flex;flex-direction:column;gap:6px;max-height:55vh;overflow-y:auto;padding-right:4px;margin-top:14px">
      ${rowsHTML}
    </div>

    <div class="modal-actions" style="margin-top:16px">
      ${_backBtn()}
    </div>`, true);
}
// ═══════════════════════════════════════════════════════════
// DIRECTORIES — Folders, Contacts, Locations tabbed view
// ═══════════════════════════════════════════════════════════
