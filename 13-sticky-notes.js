// ============================================================
// 13-sticky-notes.js
// Floating sticky notes layer + drag logic
// (lines 6922-7065 of the original inline <script>)
// ============================================================

// ── FLOATING STICKY LAYER ────────────────────────────────────
// Renders notes with float:true as draggable overlays on screen
// Only shown on screens >= 600px wide
function renderStickyLayer() {
  const layer = document.getElementById('sticky-layer');
  if (!layer) return;
  const isSmall = window.innerWidth < 600;
  // Only show notes that have float:true, and never on small screens
  const floaters = isSmall ? [] : STATE.stickies.filter(s => s.float);
  if (floaters.length === 0) {
    layer.innerHTML = '';
    layer.style.display = 'none';
    return;
  }
  layer.style.display = 'block';
  layer.innerHTML = floaters.map(s => {
    const c = getStickyColor(s.colorIdx);
    const sidebarW = _sidebarWidth();
    const x = Math.min(Math.max(s.x || sidebarW + 20, sidebarW + 8), window.innerWidth  - 248);
    const y = Math.min(Math.max(s.y || 120, 62),                      window.innerHeight - 128);
    return `<div class="sticky-note" id="sticky-${s.id}"
          style="background:${c.bg};color:${c.text};left:${x}px;top:${y}px"
          data-id="${s.id}">
      <div class="sticky-label" onmousedown="startDragSticky(event,'${s.id}')">📌 Note <span style="opacity:0.4;font-size:8px">drag me</span></div>
      <div class="sticky-text">${s.text}</div>
      <button class="sticky-del" onclick="unfloatSticky('${s.id}')" style="color:${c.text}" title="Stop floating (returns to Reminders tab)">✕</button>
    </div>`;
  }).join('');
}

function focusSticky(id) {
  const el = document.getElementById(`sticky-${id}`);
  if (!el) return;
  el.style.zIndex = 950;
  el.style.boxShadow = '0 0 0 3px rgba(79,154,181,0.55), 6px 10px 28px rgba(0,0,0,0.5)';
  setTimeout(() => { el.style.boxShadow = ''; el.style.zIndex = ''; }, 2000);
}

function changeStickyColor(id, colorIdx) {
  const s = STATE.stickies.find(x=>x.id===id);
  if (!s) return;
  s.colorIdx = colorIdx;
  saveSticky(s).catch(()=>{});
  renderStickyLayer();
  renderReminders();
}

// ── STICKY DRAG LOGIC ────────────────────────────────────────
// Mouse + touch drag with sidebar-aware boundary clamping
let _drag = null;

function _sidebarWidth() {
  const sb = document.getElementById('sidebar');
  if (!sb) return 0;
  // On mobile sidebar slides off-canvas so doesn't eat space
  if (window.innerWidth <= 900) return 0;
  return sb.classList.contains('collapsed') ? 64 : 240;
}

function startDragSticky(e, id) {
  const el = document.getElementById(`sticky-${id}`);
  if (!el) return;
  e.preventDefault();
  const rect = el.getBoundingClientRect();
  _drag = { id, el, ox: e.clientX - rect.left, oy: e.clientY - rect.top };
  el.style.zIndex = 950;
  el.style.cursor = 'grabbing';
  document.addEventListener('mousemove', onDragSticky);
  document.addEventListener('mouseup', endDragSticky);
  document.addEventListener('touchmove', onDragStickyTouch, { passive: false });
  document.addEventListener('touchend', endDragStickyTouch);
}

function _clampSticky(nx, ny) {
  const sidebarW = _sidebarWidth();
  const noteW = 240, noteH = 140;
  const minX = sidebarW + 8;
  const maxX = window.innerWidth  - noteW - 8;
  const minY = 62;
  const maxY = window.innerHeight - noteH - 8;
  return {
    x: Math.min(Math.max(nx, minX), maxX),
    y: Math.min(Math.max(ny, minY), maxY),
  };
}

function onDragSticky(e) {
  if (!_drag) return;
  const { x, y } = _clampSticky(e.clientX - _drag.ox, e.clientY - _drag.oy);
  _drag.el.style.left = `${x}px`;
  _drag.el.style.top  = `${y}px`;
}
function onDragStickyTouch(e) {
  if (!_drag || !e.touches[0]) return;
  e.preventDefault();
  const t = e.touches[0];
  const { x, y } = _clampSticky(t.clientX - _drag.ox, t.clientY - _drag.oy);
  _drag.el.style.left = `${x}px`;
  _drag.el.style.top  = `${y}px`;
}
function endDragSticky() {
  if (!_drag) return;
  const x = parseFloat(_drag.el.style.left);
  const y = parseFloat(_drag.el.style.top);
  const s = STATE.stickies.find(s => s.id === _drag.id);
  if (s) { s.x = x; s.y = y; saveSticky(s).catch(()=>{}); }
  _drag.el.style.cursor = 'grab';
  _drag.el.style.zIndex = '';
  _drag = null;
  document.removeEventListener('mousemove', onDragSticky);
  document.removeEventListener('mouseup', endDragSticky);
}
function endDragStickyTouch() {
  endDragSticky();
  document.removeEventListener('touchmove', onDragStickyTouch);
  document.removeEventListener('touchend', endDragStickyTouch);
}

// Re-renders sticky layer but keeps current DOM positions for notes already on screen
function _renderStickyLayerPreservePositions() {
  // Capture current DOM positions before re-render
  STATE.stickies.forEach(s => {
    const el = document.getElementById(`sticky-${s.id}`);
    if (el) {
      s.x = parseFloat(el.style.left) || s.x;
      s.y = parseFloat(el.style.top)  || s.y;
    }
  });
  renderStickyLayer();
}


// ═══════════════════════════════════════════════════════════
// KANBAN BOARD — 5 status columns, KPI strip, filter bar
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// HERO DASHBOARD — monthly Ideal/Temporary overview by category → assignee
// ═══════════════════════════════════════════════════════════
const DASHBOARD_STATUS_BUCKETS = ['NOT STARTED','IN PROGRESS','FOR APPROVAL','FOR GDRIVE UPLOAD','DONE'];
const DASHBOARD_STATUS_LABELS  = {
  'NOT STARTED':'Not Started', 'IN PROGRESS':'In Progress', 'FOR APPROVAL':'For Approval',
  'FOR GDRIVE UPLOAD':'For GDrive Upload', 'DONE':'Done'
};

