// ============================================================
// 22-kanban-dnd-nav-theme-init.js
// Kanban drag & drop, nav/theme, app init() bootstrap
// (lines 11205-11305 of the original inline <script>)
// ============================================================

// ── KANBAN DRAG AND DROP ─────────────────────────────────────
function dragStart(taskId) { STATE.dragTaskId = taskId; }
function dragEnd()          { STATE.dragTaskId = null; }
function dragOver(e, colId) { e.preventDefault(); }
function drop(e, colId) {
  e.preventDefault();
  if (!STATE.dragTaskId) return;
  const task = STATE.items.find(i=>i.id===STATE.dragTaskId);
  if (!task) return;
  if (task.type === 'ideal' || task.type === 'temporary') {
    toast('Ideal/Temporary cards move automatically from category progress.', 'info');
    return;
  }
  // Add timestamp when dragging to Completed (same as saveTEEModal)
  if (colId === 'Completed' && parseStatus(task.status).state !== 'Completed') {
    const _n = new Date();
    const _ts = _n.getFullYear()+'-'+String(_n.getMonth()+1).padStart(2,'0')+'-'+String(_n.getDate()).padStart(2,'0')
              +' '+String(_n.getHours()).padStart(2,'0')+':'+String(_n.getMinutes()).padStart(2,'0');
    task.status = 'Completed|'+_ts;
  } else {
    task.status = colId;
  }
  renderBoard(); renderOverview();
  saveTEE(task).then(()=>toast(`Moved to ${colId}`)).catch(()=>toast(`Moved to ${colId} (offline)`,'info'));
}

/* ============================================================
   9. NAV & SCROLL
   ============================================================ */
// ── NAVIGATION + THEME ───────────────────────────────────────
function calNav(dir) {
  STATE.calMonth += dir;
  if (STATE.calMonth > 11) { STATE.calMonth = 0; STATE.calYear++; }
  if (STATE.calMonth < 0)  { STATE.calMonth = 11; STATE.calYear--; }
  renderPlanner();
}

function toggleTheme() {
  const html = document.documentElement;
  const next = html.dataset.theme==='dark' ? 'light' : 'dark';
  html.dataset.theme = next;
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = next==='dark' ? '🌙' : '☀️';
  // Force the browser to fully compute and apply the new CSS theme
  // before any JS color helper (getPri, getStatusColor, getStickyColor) reads data-theme.
  // Reading offsetHeight flushes the style engine synchronously.
  void document.documentElement.offsetHeight;
  // Double rAF: first frame applies CSS, second frame JS rebuilds DOM with correct values
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      renderAll();
    });
  });
}

function updateDate() {
  const el = document.getElementById('nav-date-display');
  if (el) el.textContent =
    new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
}

/* ============================================================
   10. INIT
   ============================================================ */
// ═══════════════════════════════════════════════════════════
// INIT — Bootstraps the dashboard on DOMContentLoaded:
//   sets up sidebar, theme, date ticker, then triggers first sync
// ═══════════════════════════════════════════════════════════
function init() {
  updateDate();

  document.getElementById('page-dashboard').innerHTML =
    `<div id="dashboardSection"></div>`;

  document.getElementById('page-overview').innerHTML =
    `<div id="overviewSection"></div>`;

  document.getElementById('page-planner').innerHTML =
    `<div id="plannerSection"></div>`;

  document.getElementById('page-board').innerHTML =
    `<div id="boardSection"></div>`;

  document.getElementById('page-directories').innerHTML =
    `<div id="dirSection"></div>
     `;

  document.getElementById('page-reminders').innerHTML =
    `<div id="remindersSection"></div>`;

  document.getElementById('page-people').innerHTML =
    `<div id="peopleSection"></div>`;

  renderAll();
  renderStickyLayer();

  // Initial sync — then smart sync (event-driven + 10-min idle)
  fetchAllSheets();
}

init();
