// ============================================================
// 14-page-dashboard.js
// Dashboard page: chart renderers, category matrix, renderDashboard
// (lines 7066-7592 of the original inline <script>)
// ============================================================

// ── Dashboard chart renderers ──────────────────────────────────────────────
// Task Type pie — lives inside the Tasks panel itself (see
// _dashTaskDriveRowHTML below), so it intentionally has no outer
// .glass-card/title wrapper of its own; the Tasks panel already provides
// that chrome and doubling it up would just add another nested card/shadow.
// CSS-only conic-gradient donut, no chart library dependency.
function _dashTaskTypePieHTML(segments) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (!total) return `<div class="dash-chart-empty">No task data available.</div>`;
  let acc = 0;
  const stops = segments.filter(s => s.value > 0).map(s => {
    const start = acc / total * 360;
    acc += s.value;
    const end = acc / total * 360;
    return `${s.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
  }).join(', ');
  const legend = segments.filter(s => s.value > 0).map(s => `
    <div class="dash-donut-legend-row">
      <span class="dash-donut-legend-dot" style="background:${s.color}"></span>
      <span class="dash-donut-legend-label">${s.label}</span>
      <span class="dash-donut-legend-value">${s.value} · ${Math.round(s.value/total*100)}%</span>
    </div>`).join('');
  return `<div class="dash-donut-wrap" style="justify-content:center;gap:22px;margin-bottom:14px">
    <div class="dash-donut" style="width:140px;height:140px;background:conic-gradient(${stops})">
      <div class="dash-donut-hole" style="inset:20px">
        <span class="dash-donut-total">${total}</span>
        <span class="dash-donut-total-label">Total</span>
      </div>
    </div>
    <div class="dash-donut-legend">${legend}</div>
  </div>`;
}

// Tasks + searchable Google Drive Links row. Markup only — the two panels'
// contents are filled in and kept in sync by dashboard-task-drive.js
// (renderDashboardTaskData/renderDashboardTaskPie/renderDashboardDriveLinks).
function _dashTaskDriveRowHTML() {
  return `<div class="dashboard-task-drive-grid" style="display:grid;grid-template-columns:3fr 2fr;gap:14px;align-items:stretch;margin-bottom:14px">
    <div class="glass-card" style="padding:18px;min-width:0">
      <div class="dash-chart-title">Tasks</div>
      <div id="dashboardTaskTypePie"></div>
      <div id="dashboardTaskTypeData" style="max-height:430px;overflow:auto"></div>
    </div>

    <div class="glass-card" style="padding:18px;min-width:0">
      <div class="dash-chart-title">Google Drive Links</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px">
        Search and open links from 📁 Folders & Files.
      </div>
      <input id="dashboardDriveSearch"
        class="form-input"
        type="search"
        placeholder="Search links…"
        autocomplete="off"
        style="width:100%;box-sizing:border-box;margin-bottom:10px">
      <div id="dashboardDriveLinks"
        style="display:flex;flex-direction:column;gap:8px;max-height:370px;overflow-y:auto;padding-right:3px">
        <div class="dash-chart-empty">Loading Google Drive links…</div>
      </div>
    </div>
  </div>`;
}

// Maps a workflow stage name to one of the 5 status colors already used
// everywhere else, so the matrix below reads with the same color language
// as the rest of the dashboard instead of inventing a 7th palette.
function _dashStageColor(stage) {
  if (stage === 'Done') return getStatusColor('DONE');
  if (stage === 'For GDrive Upload' || stage === 'GDrive Uploaded') return getStatusColor('FOR GDRIVE UPLOAD');
  if (stage && stage.includes('Approval')) return getStatusColor('FOR APPROVAL');
  if (stage === 'For SPS Planogram' || stage === 'SPS Submitted') return getStatusColor('IN PROGRESS');
  return getStatusColor('NOT STARTED');
}

// ── Category × Store progress matrix ─────────────────────────────────────
// Exactly the "Categories across the top, Store down the side, stage in
// each cell" layout requested — one row per store/record this month, one
// column per active category, each cell showing that category's current
// workflow stage (Product List → For SPS Planogram → For LTM/PMT/JAG/PLG
// Approval → For GDrive Upload → Done) for that store, color-coded to match
// the rest of the dashboard. Clicking a row opens the same per-category
// drill-down modal as everywhere else.
function _dashCategoryStoreMatrixHTML(records) {
  if (!records.length) return '';
  const cats = (STATE.categories||[]).filter(c => c.active !== false)
    .slice().sort((a,b) => (a.sortOrder??999) - (b.sortOrder??999));
  if (!cats.length) return '';

  const rows = records.slice()
    .sort((a,b) => (a.storeCode||'').localeCompare(b.storeCode||''))
    .map(item => {
      const byCat = {};
      (STATE.assignments||[]).filter(a => a.teeId === item.id).forEach(a => { byCat[a.category] = a; });
      const cells = cats.map(cat => {
        const a = byCat[cat.code];
        if (!a) return `<td class="dash-matrix-cell"><span class="dash-matrix-empty">—</span></td>`;
        const stage = computeAssignmentStage(a, item.type);
        const color = _dashStageColor(stage);
        return `<td class="dash-matrix-cell" title="${_escapeTEEAttr(cat.code)}: ${_escapeTEEAttr(stage)}"><span class="dash-matrix-badge" style="background:${color}22;color:${color}">${stage}</span></td>`;
      }).join('');
      return `<tr onclick="openCategoryProgressDetail('${item.id}')">
        <td class="dash-matrix-store">
          <div style="font-weight:700;font-size:12px;color:var(--text)">${item.storeCode||'—'}</div>
          <div style="font-size:10px;color:var(--muted)">${item.storeName||''}</div>
        </td>
        ${cells}
      </tr>`;
    }).join('');

  const headerCells = cats.map(c => `<th class="dash-matrix-head" title="${_escapeTEEAttr(c.name||c.code)}">${c.code}</th>`).join('');

  return `<div class="glass-card" style="padding:18px;margin-bottom:14px;overflow-x:auto">
    <div class="dash-chart-title">Category Progress by Store</div>
    <table class="dash-matrix-table">
      <thead><tr><th class="dash-matrix-store-head">Store</th>${headerCells}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}


// ── Categories Progress (styled after the Today page's .gt-card list) ──
// Two tabs split the month's planograms into ones already underway
// ("Existing" — due today or already past due) and ones scheduled further
// out ("Coming Up" — due date still ahead). Clicking a card opens the
// per-category progress breakdown (openCategoryProgressDetail), which reads
// the same per-category subtasks the Assign section writes.
function _dashPlanogramCardHTML(item) {
  const color = getStatusColor(item.status || 'NOT STARTED');
  const dueChip = _buildCounterChip(item.dueDate);
  return `<div class="gt-card" onclick="openCategoryProgressDetail('${item.id}')">
    <div class="gt-card-row1">
      <span class="status-dot" style="background:${color}"></span>
      <div class="gt-card-title" style="margin:0;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.storeCode||'—'}${item.storeName?' — '+item.storeName:''}</div>
      <span class="gt-card-row1-right" style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;background:${color}22;color:${color}">${item.status||'NOT STARTED'}</span>
    </div>
    <div style="margin:6px 0">${_categoryProgressStripHTML(item)}</div>
    <div class="gt-card-footer">
      <div class="gt-card-footer-left">${renderAssigneeStack(item.assignees||'', false, item.type)}</div>
      <div class="gt-card-footer-right">${dueChip}<span class="gt-card-meta">${item.type==='ideal'?'IDEAL':'TEMP'}</span></div>
    </div>
  </div>`;
}

function _dashSetCatProgTab(tab) {
  window._dashCatProgTab = tab;
  renderDashboard();
}

function _dashCategoryProgressSectionHTML(records) {
  if (!window._dashCatProgTab) window._dashCatProgTab = 'existing';
  const tab = window._dashCatProgTab;
  const todayStr = fmtDate(TODAY);
  // "Existing" = already due (or no due date at all, so it can't be waiting
  // on anything future). "Coming Up" = due date still ahead — scheduled but
  // not yet due.
  const existing = records.filter(r => !r.dueDate || r.dueDate <= todayStr)
    .sort((a,b) => (b.dueDate||'').localeCompare(a.dueDate||''));
  const upcoming = records.filter(r => r.dueDate && r.dueDate > todayStr)
    .sort((a,b) => (a.dueDate||'').localeCompare(b.dueDate||''));
  const list = tab === 'upcoming' ? upcoming : existing;

  const pill = (key, label, count) => `
    <button class="gt-primary-pill${tab===key?' active':''}" onclick="_dashSetCatProgTab('${key}')">
      <span class="gt-primary-pill-num">${count}</span><span>${label}</span>
    </button>`;

  return `
    <div class="glass-card" style="padding:18px;margin-bottom:14px">
      <div class="dash-chart-title" style="margin-bottom:2px">Categories Progress</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:12px">Tap a planogram to see its progress broken down by category.</div>
      <div class="gt-pill-strip" style="margin-bottom:14px">
        ${pill('existing', 'Existing', existing.length)}
        ${pill('upcoming', 'Coming Up', upcoming.length)}
      </div>
      <div class="gt-task-list">
        ${list.length ? list.map(_dashPlanogramCardHTML).join('') : `<div class="dash-chart-empty">${tab==='upcoming' ? 'No upcoming planograms' : 'No existing planograms this month'}</div>`}
      </div>
    </div>`;
}

// Per-category progress drill-down for one planogram — one card per
// category assignment, each with its own progress bar, stage label, and
// checklist (backed by the same computeAssignmentProgress/
// computeAssignmentStage helpers and the same a.subtasks the Assign
// section's rows read/write).
function openCategoryProgressDetail(itemId) {
  const item = STATE.items.find(i => i.id === itemId);
  if (!item) return;
  const rows = STATE.assignments.filter(a => a.teeId === itemId);
  const color = getStatusColor(item.status || 'NOT STARTED');

  const catBlocksHTML = rows.length ? rows.map(a => {
    const catObj = STATE.categories.find(c => c.code === a.category);
    const progress = computeAssignmentProgress(a, item.type);
    const stage = computeAssignmentStage(a, item.type);
    const person = a.assignedTo || '';
    const p = STATE.people.find(x => x.name === person);
    const pColor = p?.color || avColor(person || '?');
    const subtasks = _workflowSubtasksForCategory(item.type, a.subtasks);
    return `
      <div class="glass-card" style="padding:14px;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:9px">
          <span style="font-size:13px;font-weight:700;color:var(--text)">${a.category}</span>
          <span style="font-size:11px;color:var(--muted)">${catObj?.name||''}</span>
          <div style="margin-left:auto;display:flex;align-items:center;gap:6px">
            <div style="width:18px;height:18px;border-radius:50%;background:${pColor};display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;color:#fff;flex-shrink:0" title="${person||'Unassigned'}">${initials(person||'?')}</div>
            <span style="font-size:11px;color:var(--text2)">${person||'Unassigned'}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <div class="tee-assign-progress-track" style="flex:1"><div class="tee-assign-progress-fill" style="width:${progress.pct}%"></div></div>
          <span style="font-size:10px;font-family:var(--mono);color:var(--muted);flex-shrink:0">${progress.done}/${progress.total} · ${progress.pct}%</span>
        </div>
        <div style="font-size:10px;color:var(--muted);margin-bottom:6px">Stage: ${stage}</div>
        ${subtasks.length ? `
          <div class="tee-assign-checklist" style="padding:0">
            ${subtasks.map((s,si) => `
              <label class="tee-assign-check-row">
                <input type="checkbox" ${s.done?'checked':''} onchange="_catProgToggle('${itemId}','${a.id}',${si},this.checked)">
                <span class="tee-assign-check-text${s.done?' tee-assign-check-done':''}" id="catprog-check-${a.id}-${si}">${_escapeTEEAttr(s.text)}</span>
              </label>`).join('')}
          </div>` : ''}
      </div>`;
  }).join('') : `<div class="dash-chart-empty">No category assignments for this record</div>`;

  openModal(`
    <div class="modal-title">
      <div>
        <div style="font-size:17px;font-weight:700">${item.storeCode||'—'}${item.storeName?' — '+item.storeName:''}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px;display:flex;align-items:center;gap:8px">
          <span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;background:${color}22;color:${color}">${item.status||'NOT STARTED'}</span>
          <span>Overall ${item.progress||0}%</span>
        </div>
      </div>
      ${_modalCloseBtn()}
    </div>
    <div id="catprog-modal-body" style="margin-bottom:16px">${catBlocksHTML}</div>
    <div class="modal-actions">
      ${_backBtn()}
      <button class="btn-primary" onclick="clearNav();openTEEDetail('${itemId}')">Open Full Record</button>
    </div>`);
}

// Toggles one step for one category assignment from the drill-down modal —
// updates STATE.assignments in place, re-renders just that category's
// progress bar/stage/checkbox text, and persists to the sheet in the
// background (same fire-and-forget pattern as other in-modal toggles).
function _catProgToggle(itemId, assignmentId, subIdx, checked) {
  const a = STATE.assignments.find(x => x.id === assignmentId);
  const item = STATE.items.find(i => i.id === itemId);
  if (!a || !item) return;
  // Normalize first — an assignment saved before this workflow step existed
  // (or with an empty subtasks array) gets the missing steps filled in as
  // not-done, rather than erroring out on a short array.
  a.subtasks = _workflowSubtasksForCategory(item.type, a.subtasks);
  if (!a.subtasks[subIdx]) return;

  a.subtasks[subIdx].done = checked;
  a.subtasks[subIdx].doneAt = checked ? fmtDate(new Date()) : null;

  const progress = computeAssignmentProgress(a, item.type);
  const stage = computeAssignmentStage(a, item.type);
  const card = document.getElementById(`catprog-check-${assignmentId}-${subIdx}`)?.closest('.glass-card');
  if (card) {
    const fillEl  = card.querySelector('.tee-assign-progress-fill');
    const labelEl = card.querySelector('.tee-assign-progress-track')?.nextElementSibling;
    if (fillEl)  fillEl.style.width = progress.pct + '%';
    if (labelEl) labelEl.textContent = `${progress.done}/${progress.total} · ${progress.pct}%`;
    const stageEl = [...card.children].find(el => el.textContent?.startsWith('Stage:'));
    if (stageEl) stageEl.textContent = `Stage: ${stage}`;
  }
  document.getElementById(`catprog-check-${assignmentId}-${subIdx}`)?.classList.toggle('tee-assign-check-done', checked);

  if (item) {
    recalcIdealTemporaryStatus(item);
    const modalState = document.querySelector('#catprog-modal-body')?.previousElementSibling;
    if (modalState) {
      const statusEl = modalState.querySelector('span');
      if (statusEl) statusEl.textContent = item.status || 'NOT STARTED';
    }
    renderBoard();
  }
  saveAssignment(a).catch(() => toast('Saved locally — sheet will sync next time', 'info'));
  if (checked) {
    recordSubtaskAccomplishment(item, a, a.subtasks[subIdx])
      .catch(() => toast('Subtask completed locally — accomplishment history will sync next time', 'info'));
  }
}

function _dashSetMonth(dir) {
  if (dir === 0) {
    STATE.dashboardYear  = new Date().getFullYear();
    STATE.dashboardMonth = new Date().getMonth();
  } else {
    STATE.dashboardMonth += dir;
    if (STATE.dashboardMonth > 11) { STATE.dashboardMonth = 0; STATE.dashboardYear++; }
    if (STATE.dashboardMonth < 0)  { STATE.dashboardMonth = 11; STATE.dashboardYear--; }
  }
  renderDashboard();
}

// A record belongs to a month by Created Date, falling back to a
// type-appropriate date (Completed Date for Ideal/Temporary, Due Date for
// Task, the entry's own Date for Entry) for older rows that predate the
// Created Date column existing. If nothing at all is present — e.g. the
// sheet is missing the Created Date column entirely — the record falls
// back to the CURRENT month rather than matching no month at all. A record
// that's merely mis-dated is recoverable (you'll see it, just maybe filed
// under today instead of when it was actually made); a record that's
// invisible everywhere isn't. Fix the missing column and this fallback
// stops being needed — it doesn't fix the root cause, only stops it from
// hiding data.
function _dashRecordMonthKey(item) {
  let d;
  if (item.type === 'task')       d = item.createdDate || item.dueDate || '';
  else if (item.type === 'entry') d = item.createdDate || item.date    || '';
  else                             d = item.createdDate || item.completedDate || ''; // ideal/temporary
  if (d) return d.substring(0, 7);
  return fmtDate(TODAY).substring(0, 7);
}

// True if an item counts as "done" for its own type's completion model —
// Ideal/Temporary use the DONE status bucket, Task uses the Kanban
// Completed column, Entry has no completion concept so it never counts.
function _dashIsItemDone(item) {
  if (item.type === 'ideal' || item.type === 'temporary') return item.status === 'DONE';
  if (item.type === 'task') return parseStatus(item.status).state === 'Completed';
  return false;
}

function _dashToggleKpiGroup(key) {
  window._dashKpiOpenGroup = window._dashKpiOpenGroup === key ? null : key;
  renderDashboard();
}

function _dashKpiItemCardHTML(item) {
  const isIdealTemp = item.type === 'ideal' || item.type === 'temporary';
  const statusLabel = isIdealTemp ? (item.status || 'NOT STARTED') : (item.type === 'task' ? parseStatus(item.status).state : '');
  const color = isIdealTemp ? getStatusColor(item.status || 'NOT STARTED')
              : item.type === 'task' ? (statusLabel === 'Completed' ? 'var(--green)' : 'var(--accent)')
              : 'var(--accent2)';
  const title = isIdealTemp ? `${item.storeCode||'—'}${item.storeName?' — '+item.storeName:''}` : item.title;
  const dueChip = item.dueDate ? _buildCounterChip(item.dueDate) : '';
  return `<div class="gt-card" onclick="openTEEDetail('${item.id}')">
    <div class="gt-card-row1">
      <span class="status-dot" style="background:${color}"></span>
      <div class="gt-card-title" style="margin:0;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${title}</div>
      ${statusLabel ? `<span class="gt-card-row1-right" style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;background:${color}22;color:${color}">${statusLabel}</span>` : ''}
    </div>
    ${isIdealTemp ? `<div style="margin:6px 0">${_categoryProgressStripHTML(item)}</div>` : ''}
    <div class="gt-card-footer">
      <div class="gt-card-footer-left">${renderAssigneeStack(item.assignees||'', false, item.type)}</div>
      <div class="gt-card-footer-right">${dueChip}<span class="gt-card-meta">${item.type.toUpperCase()}</span></div>
    </div>
  </div>`;
}

function _dashKpiGroupListHTML(key, monthItems) {
  const today = fmtDate(TODAY);
  let list, title;
  if (key === 'done')      { list = monthItems.filter(_dashIsItemDone); title = 'Done this month'; }
  else if (key === 'ideal')     { list = monthItems.filter(i => i.type==='ideal'); title = 'Ideal records'; }
  else if (key === 'temporary') { list = monthItems.filter(i => i.type==='temporary'); title = 'Temporary records'; }
  else if (key === 'task')      { list = monthItems.filter(i => i.type==='task'); title = 'Tasks'; }
  else if (key === 'entry')     { list = monthItems.filter(i => i.type==='entry'); title = 'Entries'; }
  else if (key === 'late')      { list = monthItems.filter(i => i.dueDate && i.dueDate < today && !_dashIsItemDone(i)); title = 'Late (overdue)'; }
  else { list = []; title = ''; }

  return `<div class="glass-card" style="padding:16px;margin-bottom:14px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">
      <div class="dash-chart-title" style="margin-bottom:0">${title} <span style="color:var(--muted);font-weight:400">(${list.length})</span></div>
      <button class="btn-ghost" style="padding:2px 10px;font-size:11px" onclick="_dashToggleKpiGroup('${key}')">Close ✕</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">
      ${list.length ? list.map(_dashKpiItemCardHTML).join('') : `<div class="dash-chart-empty">Nothing here</div>`}
    </div>
  </div>`;
}

function renderDashboard() {
  const container = document.getElementById('dashboardSection');
  if (!container) return;

  if (STATE.dashboardYear == null) {
    STATE.dashboardYear  = new Date().getFullYear();
    STATE.dashboardMonth = new Date().getMonth();
  }
  const y = STATE.dashboardYear, m = STATE.dashboardMonth;
  const monthKey   = `${y}-${String(m+1).padStart(2,'0')}`;
  const monthLabel = MONTHS[m] + ' ' + y;
  const isCurrentMonth = monthKey === fmtDate(TODAY).substring(0,7);

  // All four trackable types share the KPI strip; only Ideal/Temporary
  // feed the category-specific sections below it (Overall Progress,
  // Categories Progress, Category × Store).
  const monthItems = STATE.items.filter(i =>
    ['task','ideal','temporary','entry'].includes(i.type) && _dashRecordMonthKey(i) === monthKey
  );
  const records = monthItems.filter(i => i.type === 'ideal' || i.type === 'temporary');

  // ── KPI strip ──
  const counts = {};
  DASHBOARD_STATUS_BUCKETS.forEach(b => { counts[b] = records.filter(r => r.status === b).length; });
  const idealCount = monthItems.filter(i => i.type === 'ideal').length;
  const tempCount  = monthItems.filter(i => i.type === 'temporary').length;
  const taskCount  = monthItems.filter(i => i.type === 'task').length;
  const entryCount = monthItems.filter(i => i.type === 'entry').length;
  const doneCount  = monthItems.filter(_dashIsItemDone).length;
  const totalCount = monthItems.length;
  const today = fmtDate(TODAY);
  const lateCount  = monthItems.filter(i => i.dueDate && i.dueDate < today && !_dashIsItemDone(i)).length;

  const kpiTile = (key, label, value, color) => `
    <div class="glass-card dash-kpi-tile${window._dashKpiOpenGroup===key?' active':''}" style="padding:14px 16px;flex:1;min-width:120px;cursor:pointer" onclick="_dashToggleKpiGroup('${key}')">
      <div style="font-size:22px;font-weight:800;color:${color||'var(--text)'};font-family:var(--font-disp)">${value}</div>
      <div style="font-size:11px;color:var(--text2);margin-top:2px">${label}</div>
    </div>`;

  const kpiStripHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
      ${kpiTile('done', 'Done / Total', `${doneCount}/${totalCount}`, 'var(--green)')}
      ${kpiTile('ideal', 'Ideal', idealCount, 'var(--green)')}
      ${kpiTile('temporary', 'Temporary', tempCount, 'var(--orange)')}
      ${kpiTile('task', 'Task', taskCount, 'var(--accent)')}
      ${kpiTile('entry', 'Entry', entryCount, 'var(--accent2)')}
      ${kpiTile('late', 'Red Tags (Late)', lateCount, '#F87171')}
    </div>
    ${window._dashKpiOpenGroup ? _dashKpiGroupListHTML(window._dashKpiOpenGroup, monthItems) : ''}`;

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px;flex-wrap:wrap">
      <span style="font-size:26px;font-weight:800;letter-spacing:-0.03em;color:var(--text);font-family:var(--font-disp)">Dashboard <span style="font-weight:400;color:var(--muted)">· ${monthLabel}</span></span>
      <div style="display:flex;align-items:center;gap:6px">
        <button class="planner-nav-btn" onclick="_dashSetMonth(-1)" title="Previous month">‹</button>
        <button class="planner-today-btn" onclick="_dashSetMonth(0)">TODAY</button>
        <button class="planner-nav-btn" onclick="_dashSetMonth(1)" title="Next month">›</button>
      </div>
    </div>
    ${kpiStripHTML}
    ${_dashTaskDriveRowHTML()}
    ${_dashCategoryStoreMatrixHTML(records)}
  `;
}

