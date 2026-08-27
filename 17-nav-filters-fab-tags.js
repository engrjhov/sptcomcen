// ============================================================
// 17-nav-filters-fab-tags.js
// Shared nav stack, page filters, FAB, clickable tags
// (lines 8218-8429 of the original inline <script>)
// ============================================================

// ── NAVIGATION STACK ────────────────────────────────────────
// Rules:
//   _backBtn() → call BEFORE pushNav to get correct back button
//   pushNav(fn) → call AFTER openModal so next modal can pop back here
//   popNav()   → called by ‹ Back only, pops and reopens previous
//   clearNav() → called by ✕, outside click, save, cancel, escape

window._navStack = [];

function pushNav(reopenFn) {
  window._navStack.push(reopenFn);
}

function popNav() {
  const fn = window._navStack.pop();
  if (fn) fn();
  else clearNav();
}

function clearNav() {
  window._navStack = [];
  document.getElementById('activeModal')?.remove();
  document.getElementById('fabWrap')?.classList.remove('hidden');
  document.removeEventListener('keydown', document._modalEscHandler);
}


// ── NAV HELPER ───────────────────────────────────────────────
// Call this when navigating FROM one modal TO another.
// reopenCurrent: function that reopens the current modal
// openNext: function that opens the next modal
function _navTo(reopenCurrent, openNext) {
  pushNav(reopenCurrent);
  openNext();
}
function _backBtn() {
  // Check stack length AT THE MOMENT OF RENDERING
  // Push happens AFTER openModal, so this correctly reflects
  // whether there is a previous modal to return to
  return window._navStack.length > 0
    ? `<button class="btn-ghost" onclick="popNav()">‹ Back</button>`
    : '';
}

// ═══════════════════════════════════════════════════════════
// GLOBAL UI HANDLERS — shared filter/dropdown/tab controls for
// Board, People, Directories, and Reminders tabs
// ═══════════════════════════════════════════════════════════
window._kbSetPriority = (val) => { STATE.kanbanFilter.priority = val; document.querySelectorAll('.kb-float').forEach(el=>el.remove()); renderBoard(); };
window._kbSetAssignee = (val) => { STATE.kanbanFilter.assignee = val; document.querySelectorAll('.kb-float').forEach(el=>el.remove()); renderBoard(); };
window._kbOpenFloat = function(btnEl, html) {
  // Toggle if already open from same button
  const existing = document.querySelector('.kb-float');
  if (existing) { existing.remove(); return; }
  const float = document.createElement('div');
  float.className = 'kb-float';
  float.innerHTML = html;
  document.body.appendChild(float);
  const rect = btnEl.getBoundingClientRect();
  float.style.top  = (rect.bottom + 6) + 'px';
  float.style.left = rect.left + 'px';
  setTimeout(() => {
    document.addEventListener('click', function _close(e) {
      if (!float.contains(e.target) && !btnEl.contains(e.target)) {
        float.remove();
        document.removeEventListener('click', _close);
      }
    });
  }, 0);
}
window._kbOpenPriFloat = (btnEl) => window._kbOpenFloat(btnEl, STATE._kbPriFloatHTML);
window._kbOpenAssigneeFloat = (btnEl) => window._kbOpenFloat(btnEl, STATE._kbAssigneeFloatHTML);
// ── RESOURCES TAG FILTER FUNCTIONS ─────────────────────────────
// ── PEOPLE FILTER FUNCTIONS ────────────────────────────────────
window._ppSetContext = (val) => {
  STATE.peopleFilter.context = val;
  renderPeople();
}; // val: 'all'|'today'|'week'|'idle'

window._dirSetSort = (val) => {
  STATE.dirSort = val;
  renderDirectories();
};
window._dirSwitchTab = (tabId) => {
  STATE.dirTab = tabId;
  STATE.dirSearch = '';
  STATE.dirTags = [];
  renderDirectories();
};
window._dirAddTag = (tag) => {
  if (!STATE.dirTags.includes(tag)) STATE.dirTags.push(tag);
  const f = document.querySelector('.kb-float');
  if (f) f.remove();
  renderDirectories();
};
window._dirRemoveTag = (tag) => {
  STATE.dirTags = STATE.dirTags.filter(t => t !== tag);
  renderDirectories();
};
window._dirOpenTagFloat = (btnEl) => window._kbOpenFloat(btnEl, STATE._dirTagFloatHTML);

// ── REMINDERS FILTER FUNCTIONS ─────────────────────────────────
window._rmSetContext = (val) => {
  STATE.reminderFilter.context = STATE.reminderFilter.context === val ? 'all' : val;
  renderReminders();
};
window._rmOpenDateFloat = (btnEl) => window._kbOpenFloat(btnEl, STATE._rmDateFloatHTML);
window._rmOpenTagFloat  = (btnEl) => window._kbOpenFloat(btnEl, STATE._rmTagFloatHTML);
window._rmSetDate = (val) => {
  STATE.reminderFilter.date = val;
  const f = document.querySelector('.kb-float');
  if (f) f.remove();
  renderReminders();
};
window._rmSetTag = (val) => {
  STATE.reminderFilter.tag = val;
  const f = document.querySelector('.kb-float');
  if (f) f.remove();
  renderReminders();
};
window._kbSetContext = (val) => { STATE.kanbanFilter.context = STATE.kanbanFilter.context === val ? 'all' : val; renderBoard(); };

function openModal(html, wide=false) {
  document.getElementById('activeModal')?.remove();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'activeModal';
  backdrop.innerHTML = `<div class="modal${wide?' modal-wide':''}">${html}</div>`;
  backdrop.addEventListener('click', e => { if (e.target===backdrop) clearNav(); });
  document.body.appendChild(backdrop);
  document.getElementById('fabWrap')?.classList.add('hidden');
  document.removeEventListener('keydown', document._modalEscHandler);
  document._modalEscHandler = e => {
    if (e.key === 'Escape') { clearNav(); }
  };
  document.addEventListener('keydown', document._modalEscHandler);
}

function closeModal() {
  document.getElementById('activeModal')?.remove();
  document.getElementById('fabWrap')?.classList.remove('hidden');
  document.removeEventListener('keydown', document._modalEscHandler);
}

// ── FAB (Floating Action Button) ────────────────────────────
function toggleFab() {
  const main = document.getElementById('fabMain');
  const opts = document.getElementById('fabOptions');
  const isOpen = opts.classList.contains('open');
  if (isOpen) {
    closeFab();
  } else {
    main.classList.add('open');
    opts.classList.add('open');
    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function _fabClose(e) {
        if (!document.getElementById('fabWrap')?.contains(e.target)) {
          closeFab();
          document.removeEventListener('click', _fabClose);
        }
      });
    }, 0);
  }
}
function closeFab() {
  document.getElementById('fabMain')?.classList.remove('open');
  document.getElementById('fabOptions')?.classList.remove('open');
}

// ── CLICKABLE TAGS ───────────────────────────────────────────
function openTagList(tag) {
  const matches = STATE.items.filter(item => {
    const tags = Array.isArray(item.tags)
      ? item.tags
      : (item.tags||'').split(',').map(t=>t.trim()).filter(Boolean);
    return tags.some(t => t.toLowerCase() === tag.toLowerCase());
  });

  const typeIcon = { task:'📋', event:'📆', entry:'📝' };
  const listHTML = matches.length === 0
    ? `<div style="text-align:center;padding:28px;color:var(--muted)">No items tagged "${tag}"</div>`
    : matches.map(item => {
        const pri = getPri(item.priority);
        const metaStr = item.type === 'task'
          ? `${getDisplayStatus(item)}${item.dueDate?' · due '+item.dueDate:''}`
          : item.type === 'event'
            ? `${item.date}${item.time?' · '+fmtTime(item.time):''}`
            : item.date || '';
        const onclickFn = `_navTo(()=>openTagList('${tag}'),()=>openTEEDetail('${item.id}'))`;
        return `<div class="tag-list-item" onclick="${onclickFn}">
          <span class="tag-list-type">${typeIcon[item.type]||'📋'}</span>
          <div class="tag-list-body">
            <div class="tag-list-title">${item.title}</div>
            <div class="tag-list-meta">${metaStr}</div>
          </div>
          <span style="font-size:9px;padding:2px 7px;border-radius:20px;background:${pri.bg};color:${pri.text};font-weight:600">${item.priority||''}</span>
        </div>`;
      }).join('');

  openModal(`
    <div class="modal-title">
      <div>
        <div style="font-size:16px;font-weight:800">#${tag}</div>
        <div style="font-size:11px;color:var(--muted)">${matches.length} item${matches.length!==1?'s':''} tagged</div>
      </div>
      ${_modalCloseBtn()}
    </div>
    <div style="max-height:55vh;overflow-y:auto;padding-right:4px">${listHTML}</div>
    <div class="modal-actions" style="margin-top:12px">${_backBtn()}</div>`, true);
}
/* ── TEE DETAIL VIEW — with optional back button to day list ── */
