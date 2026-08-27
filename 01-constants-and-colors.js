// ============================================================
// 01-constants-and-colors.js
// Config, color palettes, status/priority constants
// (lines 2-422 of the original inline <script>)
// ============================================================

/* ============================================================
   1. CONFIG — Edit these to connect to Google Sheets
   ============================================================ */
const CONFIG = {
  SHEET_URL:    'https://script.google.com/macros/s/AKfycbzioDUVt9oBrQY_CP2VKrj_HX6m5Nun6joQ1p0bs_BGuZ5_trQFq1pJAdj6VlTFip4kNQ/exec',
  SYNC_MS:      30000,
  ARCHIVE_DAYS: 60,   // items older than this are auto-archived once per day

  SHEETS: {
    tee:       '📅 Unified TEE Entries',
    archive:   '📦 TEE Archive',
    stickies:       '📝 Stickies',
    stickyArchive:  '📦 Stickies Archive',
    folders:        '📁 Folders & Files',
    contacts:  '👤 Contacts',
    locations: '📍 Locations',
    people:    '👥 People',
    tags:      'Tags',
    config:            '⚙️ Config',
    stores:            '🏬 Stores',
    assignments:       '🗂️ TEE Assignments',
    accomplishments:   '📈 Subtask Accomplishments',
    moduleAllocations: '📎 Module Allocations',
  }
};


document.addEventListener('DOMContentLoaded', () => {
  const sidebarBtns = document.querySelectorAll('.sidebar-btn');
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('main-content');
  const collapseBtn = document.getElementById('collapse-btn');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const themeBtn = document.getElementById('theme-toggle');

  // ── Sidebar collapse ──
  let isCollapsed = false;
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      isCollapsed = !isCollapsed;
      sidebar.classList.toggle('collapsed', isCollapsed);
      if (mainContent) mainContent.classList.toggle('collapsed', isCollapsed);
      const icon = document.getElementById('collapse-icon');
      if (icon) icon.textContent = isCollapsed ? '>|' : '|<';
    });
  }

  // ── Page navigation ──
  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');
  }

  sidebarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sidebarBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const pageId = btn.dataset.page;
      if (pageId) showPage(pageId);
      if (pageId === 'page-people') renderPeople();
      window.dispatchEvent(new Event('resize'));
      if (window.innerWidth <= 900 && sidebar) {
        sidebar.classList.remove('open');
      }
    });
  });

  // ── Mobile menu ──
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // ── Click outside sidebar to close on mobile ──
  document.addEventListener('click', e => {
    if (window.innerWidth > 900) return;                          // desktop — ignore
    if (!sidebar.classList.contains('open')) return;              // already closed
    if (sidebar.contains(e.target)) return;                       // click was inside sidebar
    if (mobileMenuBtn && mobileMenuBtn.contains(e.target)) return; // click was on the toggle btn
    sidebar.classList.remove('open');
  });

  // ── Theme toggle ──
  if (themeBtn) {
    themeBtn.addEventListener('click', () => { toggleTheme(); });
  }
});


/* ============================================================
   2. CONSTANTS
   ============================================================ */
// ═══════════════════════════════════════════════════════════════════════════════
// THEME COLOR CONSTANTS — Single source of truth for all JS-rendered colors.
// To change any color: edit this block only. No other location needs touching.
// Mirrors the future Config Sheet structure (Phase 3).
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. KANBAN COLUMN COLORS ──────────────────────────────────────────────────
const KANBAN_COLS = [
  { id:'Backlog',     label:'Backlog',     dark:'#7890A0', light:'#4B6878' },
  { id:'To Do',       label:'To Do',       dark:'#3B82F6', light:'#1D4ED8' },
  { id:'In Progress', label:'In Progress', dark:'#FBBF24', light:'#B45309' },
  { id:'Completed',   label:'Completed',   dark:'#34D399', light:'#166534' },
];

// ── 2. STATUS COLORS ─────────────────────────────────────────────────────────
const STATUS_COLORS = {
  'Backlog':     { dark:'#7890A0', light:'#4B6878' },
  'To Do':       { dark:'#3B82F6', light:'#1D4ED8' },
  'In Progress': { dark:'#FBBF24', light:'#B45309' },
  'For Review':  { dark:'#C084FC', light:'#7C3AED' },
  'Review':      { dark:'#C084FC', light:'#7C3AED' },
  'Completed':   { dark:'#34D399', light:'#166534' },
  'Open':        { dark:'#7890A0', light:'#4B6878' }, // Event/Entry: not yet done
  'Done':        { dark:'#34D399', light:'#166534' }, // Event/Entry: explicitly closed
  'NOT STARTED':      { dark:'#7890A0', light:'#4B6878' }, // Ideal/Temporary derived status
  'IN PROGRESS':      { dark:'#3B82F6', light:'#1D4ED8' },
  'FOR APPROVAL':      { dark:'#FBBF24', light:'#B45309' },
  'FOR GDRIVE UPLOAD': { dark:'#C084FC', light:'#7C3AED' },
  'DONE':              { dark:'#34D399', light:'#166534' },
}

// Chip colors — dark/light pairs for context and counter chips
const CHIP_COLORS = {
  overdue:     { darkBg:'rgba(248,113,113,0.18)', darkText:'#F87171',  darkBorder:'rgba(248,113,113,0.35)',
                 lightBg:'rgba(220,38,38,0.12)',  lightText:'#B91C1C', lightBorder:'rgba(220,38,38,0.35)' },
  dueToday:    { darkBg:'rgba(40,92,112,0.18)',   darkText:'#4F9AB5',  darkBorder:'rgba(79,154,181,0.35)',
                 lightBg:'rgba(14,116,144,0.12)',  lightText:'#0E7490', lightBorder:'rgba(14,116,144,0.35)' },
  startsToday: { darkBg:'rgba(52,211,153,0.15)',  darkText:'#34D399',  darkBorder:'rgba(52,211,153,0.35)',
                 lightBg:'rgba(22,163,74,0.12)',   lightText:'#166534', lightBorder:'rgba(22,163,74,0.35)'  },
  counterOver: { darkBg:'rgba(248,113,113,0.12)', darkText:'#F87171',  lightBg:'rgba(220,38,38,0.1)',  lightText:'#B91C1C' },
  counterToday:{ darkBg:'rgba(40,92,112,0.18)',   darkText:'#4F9AB5',  lightBg:'rgba(14,116,144,0.12)', lightText:'#0E7490' },
  counterWarn: { darkBg:'rgba(251,191,36,0.12)',  darkText:'#FBBF24',  lightBg:'rgba(180,83,9,0.1)',   lightText:'#B45309' },
  counterOk:   { darkBg:'rgba(52,211,153,0.12)',  darkText:'#34D399',  lightBg:'rgba(22,163,74,0.1)',   lightText:'#166534' },
};

// Pinned note accent colors — light/dark aware
const PINNED_COLORS = {
  dark:  { border: '#4F9AB5', shadow: '0 4px 20px rgba(79,154,181,0.25)', bg: 'rgba(79,154,181,0.06)' },
  light: { border: '#0E7490', shadow: '0 4px 20px rgba(14,116,144,0.20)', bg: 'rgba(14,116,144,0.05)' },
};
function isDarkTheme() {
  return document.documentElement.getAttribute('data-theme') !== 'light';
}
function getPinnedAccent() {
  return isDarkTheme()
    ? PINNED_COLORS.dark : PINNED_COLORS.light;
}

// Note action button active state colors — light/dark aware
const NOTE_ACTION_COLORS = {
  pin: {
    dark:  { bg: 'rgba(79,154,181,0.30)',  color: '#4F9AB5', border: 'rgba(79,154,181,0.70)'  },
    light: { bg: 'rgba(79,154,181,0.20)',  color: '#0C6B8A', border: 'rgba(79,154,181,0.65)'  },
  },
  float: {
    dark:  { bg: 'rgba(251,191,36,0.28)',  color: '#FBBF24', border: 'rgba(251,191,36,0.70)'  },
    light: { bg: 'rgba(251,191,36,0.22)',  color: '#92650A', border: 'rgba(251,191,36,0.65)'  },
  },
};
function getNoteActionColor(key) {
  const isDark = isDarkTheme();
  const c = NOTE_ACTION_COLORS[key];
  return isDark ? c.dark : c.light;
}
function getChipColor(key) {
  const isDark = isDarkTheme();
  const c = CHIP_COLORS[key];
  if (!c) return { bg:'transparent', text:'var(--text2)', border:'var(--border)' };
  return isDark
    ? { bg: c.darkBg, text: c.darkText, border: c.darkBorder || 'transparent' }
    : { bg: c.lightBg, text: c.lightText, border: c.lightBorder || 'transparent' };
};

// ── 3. PRIORITY COLORS ───────────────────────────────────────────────────────
const PRIORITY = {
  Critical: { bg:'rgba(248,113,113,0.15)',   text:'#FCA5A5', bar:'#F87171',  label:'🔴 Critical',
    lightBg:'rgba(220,38,38,0.12)',  lightText:'#DC2626', lightBar:'#DC2626' },
  High:     { bg:'rgba(251,146,60,0.14)',    text:'#FDBA74', bar:'#FB923C',  label:'🟠 High',
    lightBg:'rgba(234,88,12,0.12)',  lightText:'#EA580C', lightBar:'#EA580C' },
  Medium:   { bg:'rgba(14,116,144,0.18)',    text:'#38BDF8', bar:'#0891B2',  label:'🔵 Medium',
    lightBg:'rgba(14,116,144,0.12)', lightText:'#0E7490', lightBar:'#0E7490' },
  Low:      { bg:'rgba(100,116,139,0.12)',   text:'#94A3B8', bar:'#64748B',  label:'⚪ Low',
    lightBg:'rgba(100,116,139,0.1)', lightText:'#475569', lightBar:'#475569' },
};

// ── 4. ENTRY COLORS ──────────────────────────────────────────────────────────
const ENTRY_COLORS = {
  Critical: { bg:'rgba(248,113,113,0.18)', border:'#F87171', text:'#FCA5A5',
    lightBg:'rgba(220,38,38,0.12)',  lightBorder:'#DC2626', lightText:'#DC2626' },
  High:     { bg:'rgba(251,146,60,0.18)',  border:'#FB923C', text:'#FDBA74',
    lightBg:'rgba(234,88,12,0.12)',  lightBorder:'#EA580C', lightText:'#EA580C' },
  Medium:   { bg:'rgba(14,116,144,0.18)',  border:'#0891B2', text:'#38BDF8',
    lightBg:'rgba(14,116,144,0.12)', lightBorder:'#0E7490', lightText:'#0E7490' },
  Low:      { bg:'rgba(100,116,139,0.14)', border:'#64748B', text:'#94A3B8',
    lightBg:'rgba(100,116,139,0.1)', lightBorder:'#475569', lightText:'#475569' },
};

// ── 5. STICKY NOTE COLORS ────────────────────────────────────────────────────
const STICKY_COLORS = [
  { bg:'#FDE68A', text:'#78350F', darkBg:'rgba(253,230,138,0.12)', darkText:'#FDE68A' }, // amber
  { bg:'#A7F3D0', text:'#064E3B', darkBg:'rgba(167,243,208,0.12)', darkText:'#A7F3D0' }, // mint
  { bg:'#BFDBFE', text:'#1E3A5F', darkBg:'rgba(191,219,254,0.12)', darkText:'#BFDBFE' }, // sky
  { bg:'#FCA5A5', text:'#7F1D1D', darkBg:'rgba(252,165,165,0.12)', darkText:'#FCA5A5' }, // rose
  { bg:'#DDD6FE', text:'#2E1065', darkBg:'rgba(221,214,254,0.12)', darkText:'#DDD6FE' }, // lavender
];

// ── 6. AVATAR COLORS ─────────────────────────────────────────────────────────
const AV_COLORS = ['#285C70','#8B5CF6','#EC4899','#14B8A6','#F97316','#34D399','#3B82F6','#EF4444','#F59E0B','#84CC16'];

// ── 7. TAG PALETTE ───────────────────────────────────────────────────────────
const TAG_PALETTE_DARK  = ['#4F9AB5','#8B5CF6','#F59E0B','#10B981','#F472B6','#60A5FA','#34D399','#FB923C'];
const TAG_PALETTE_LIGHT = ['#0E7490','#6D28D9','#B45309','#166534','#BE185D','#1D4ED8','#15803D','#C2410C'];

// ── 8. KPI CARD GLOW COLORS ──────────────────────────────────────────────────
const KPI_GLOWS = {
  total:'#285C70', completed:'#34D399', inProgress:'#FBBF24', pending:'#64748B',
  overdue:'#F87171', dueToday:'#FB923C', dueWeek:'#22D3EE', highPri:'#C084FC',
};

// ── 9. PERSON DEFAULT COLOR ──────────────────────────────────────────────────
const PERSON_DEFAULT_COLOR = '#285C70';

// ── 10. TAG CUSTOM OVERRIDES (localStorage) ──────────────────────────────────
let TAG_CUSTOM = {};
try { TAG_CUSTOM = JSON.parse(localStorage.getItem('jhov_tag_colors') || '{}'); } catch(e) {}

// ── NON-COLOR CONSTANTS ───────────────────────────────────────────────────────
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ═══════════════════════════════════════════════════════════════════════════════
// THEME COLOR HELPERS — Always called fresh per render. Never cache results.
// ═══════════════════════════════════════════════════════════════════════════════

function getPri(priority) {
  const p = PRIORITY[priority] || PRIORITY.Low;
  const isLight = !isDarkTheme();
  if (!isLight) return p;
  return { ...p, bg:p.lightBg, text:p.lightText, bar:p.lightBar };
}
function getStickyColor(colorIdx) {
  const idx = Math.max(0, parseInt(colorIdx) || 0) % STICKY_COLORS.length;
  const c = STICKY_COLORS[idx] || STICKY_COLORS[0];
  const isDark = isDarkTheme();
  return isDark ? { bg: c.darkBg, text: c.darkText } : { bg: c.bg, text: c.text };
}
function getStatusColor(status) {
  const isDark = isDarkTheme();
  const s = STATUS_COLORS[status];
  if (!s) return isDark ? '#64748B' : '#475569';
  return isDark ? s.dark : s.light;
}
function getColColor(col) {
  const isDark = isDarkTheme();
  return isDark ? col.dark : col.light;
}
/* ============================================================
   3. STATE
   ============================================================ */
const STATE = {
  // ── Unified TEE items — starts empty, populated by fetchTEE() from Google Sheets ──
  items: [],

  people: [
    { id:'P1', name:'Jhov',  role:'VMD',          color:'#285C70' },
    { id:'P2', name:'Pat',   role:'VMDr',         color:'#34D399' },
    { id:'P3', name:'Jas',   role:'VMD',           color:'#FB923C' },
    { id:'P4', name:'Grace', role:'VMDr',         color:'#C084FC' },
    { id:'P5', name:'Shay',  role:'Interim ADr',  color:'#F87171' },
  ],
  stickies: [
    { id:'ST1', text:'Follow up with Frank on server migration blocker', colorIdx:0, x:20,  y:120, float:false },
    { id:'ST2', text:'Client call @ 3PM Thursday — prep slides',         colorIdx:1, x:220, y:140, float:false },
    { id:'ST3', text:'Review SEO audit findings before publishing',       colorIdx:2, x:420, y:110, float:false },
  ],
  folders: [
    { id:'F1', name:'Design Assets',        url:'https://drive.google.com/folder1', desc:'Brand guidelines, logos, UI kits' },
    { id:'F2', name:'Project Alpha Docs',   url:'https://drive.google.com/folder2', desc:'API specs and architecture docs'  },
    { id:'F3', name:'Marketing Collateral', url:'https://drive.google.com/folder3', desc:'Campaign materials Q3/Q4'         },
  ],
  contacts: [
    { id:'C1', name:'Alice Johnson', position:'UI/UX Designer',   phone:'+1-555-0101', email:'alice@company.com' },
    { id:'C2', name:'Bob Smith',     position:'Backend Engineer', phone:'+1-555-0102', email:'bob@company.com'   },
    { id:'C3', name:'Frank Miller',  position:'IT Manager',       phone:'+1-555-0105', email:'frank@company.com' },
    { id:'C4', name:'Carol White',   position:'Finance Manager',  phone:'+1-555-0106', email:'carol@company.com' },
  ],
  locations: [
    { id:'L1', name:'HQ — Main Office', address:'123 Business Ave, NY 10001', mapUrl:'https://maps.google.com', notes:'Head office, Mon–Fri 8AM–6PM' },
    { id:'L2', name:'Branch East',      address:'456 Commerce St, NY 10002',  mapUrl:'https://maps.google.com', notes:'Mon–Sat 9AM–5PM'              },
  ],

  calYear:          new Date().getFullYear(),
  calMonth:         new Date().getMonth(),
  stickiesFloat:    false,
  archiveCache:     {},   // keyed 'YYYY-MM' → array of archived items for that month   // when true, stickies float across all pages
  kanbanFilter:     { search:'', priority:'All', assignee:'All', context:'all' },
  reminderFilter:   { search:'', context:'all', date:'All', tag:'All' },
  pdmOpen:          null,  // { personId, primaryFilter, stateFilter, view, dayOffset } for the currently open Person Detail modal, else null — view/dayOffset added additively by P4-R017a (discovery basis P4-D029); view is 'list'|'schedule', dayOffset mirrors STATE.plannerDayOffset's shape but scoped to Person Detail
  _stickyArchiving: false,
  dragTaskId:       null,
  dirTab:           'folders',
  dirSearch:        '',
  dirTags:          [],  // active tag filters (AND logic)
  peopleFilter:     { context: 'all', search: '' }, // context: 'all'|'today'|'week'|'idle'
  stores:           [],
  categories:       [],
  subtaskTemplates: [],
  assignments:      [], // all TEE Assignments rows, cached client-side
  dirSort:          'az',
  sheetConnected:   false,
  tagCatalog:       [],  // loaded from CONFIG.SHEETS.tags — additive metadata only, never authoritative for record-level tags (P4-R027)

  // ── Planner state ──────────────────────────────────────────────────
  plannerView:      'month',   // 'month' | 'week' | 'day'
  plannerWeekOffset: 0,        // weeks offset from current week
  plannerDayOffset:  0,        // days offset from today
  plannerFilter:    { tasks: true, events: true, entries: true },
  plannerActiveTasksOpen: false,  // Open Tasks section in Day View — collapsed by default
};

/* ============================================================
   4. UTILITIES & HELPERS
   ============================================================ */
const initials  = n => (n||'?').split(' ').map(p=>p[0]).join('').toUpperCase();
const avColor   = n => AV_COLORS[(n||'A').charCodeAt(0) % AV_COLORS.length];
const TODAY     = (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
const daysUntil = str => { if (!str) return null; const d = new Date(str); d.setHours(0,0,0,0); return Math.round((d-TODAY)/86400000); };
const daysBetween = (refStr, dueStr) => {
  if (!dueStr) return null;
  const ref = refStr ? (() => { const r = new Date(refStr); r.setHours(0,0,0,0); return r; })() : TODAY;
  const due = new Date(dueStr); due.setHours(0,0,0,0);
  return Math.round((due - ref) / 86400000);
};
const fmtDate   = d => { const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; };

// Standardised time display: "09:30" → "09:30 AM", "14:00" → "02:00 PM"
function fmtTime(t) {
  if (!t) return '';
  // Handle Google Sheets decimal time values (e.g. 0.875 = 21:00)
  if (typeof t === 'number' || (typeof t === 'string' && !t.includes(':'))) {
    const totalMins = Math.round(parseFloat(t) * 24 * 60);
    const hh = Math.floor(totalMins / 60) % 24;
    const mm = totalMins % 60;
    t = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  }
  const parts = t.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1] ? parts[1].substring(0,2).padStart(2,'0') : '00';
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${period}`;
}
function fmtTimeRange(start, end) {
  if (!start) return '';
  return end ? `${fmtTime(start)} – ${fmtTime(end)}` : fmtTime(start);
}
let _uid = Date.now();
const uid = prefix => `${prefix}-${++_uid}`;

// TEE ID generator — 6-digit padded e.g. TEE-000001
const nextTEEId = () => {
  const max = STATE.items.reduce((m, x) => {
    const n = parseInt((x.id||'').replace(/\D/g,''), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `TEE-${String(max + 1).padStart(6, '0')}`;
};

// Typed item filters
const getTasks   = () => STATE.items.filter(i => i.type === 'task');
const getEvents  = () => STATE.items.filter(i => i.type === 'event');
const getEntries = () => STATE.items.filter(i => i.type === 'entry');

// Items on a specific date — matches exactly what weekly planner shows:
// Tasks appear on their dueDate (if not Completed) AND on their startDate (if not Completed)
// Events and entries appear on their date
const itemsOnDate = dateStr => {
  const results = [];
  const seen = new Set();
  STATE.items.forEach(i => {
    if (i.type === 'task') {
      if (parseStatus(i.status).state === 'Completed') return; // excluded from calendar view
      if (i.dueDate === dateStr && !seen.has(i.id + '-due')) {
        seen.add(i.id + '-due');
        results.push({ ...i, _dateRole: 'due' });
      }
      if (i.startDate === dateStr && i.startDate !== i.dueDate && !seen.has(i.id + '-start')) {
        seen.add(i.id + '-start');
        results.push({ ...i, _dateRole: 'start' });
      }
    } else {
      if (i.date === dateStr && !seen.has(i.id)) {
        seen.add(i.id);
        results.push(i);
      }
    }
  });
  return results;
};

function toast(msg, type='success') {
  const wrap = document.getElementById('toastWrap');
  const el   = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${type==='success'?'✅':type==='info'?'ℹ️':'❌'}</span>${msg}`;
  wrap.appendChild(el);
  setTimeout(()=>el.remove(), 3000);
}

const personTasks = name => getTasks().filter(t => { const parts = splitAssigneeNames(t.assignees); return parts.includes(name); });

// All items (tasks + events + entries) where person is lead or participant
const personItems = name => STATE.items.filter(item => {
  const parts = splitAssigneeNames(item.assignees);
  return parts.includes(name);
});

