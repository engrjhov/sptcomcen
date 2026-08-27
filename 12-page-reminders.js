// ============================================================
// 12-page-reminders.js
// Reminders page (renderReminders)
// (lines 6577-6921 of the original inline <script>)
// ============================================================

function renderReminders() {
  const el = document.getElementById('remindersSection');
  if (!el) return;
  const isSmallScreen = window.innerWidth < 600;
  const f  = STATE.reminderFilter;
  const todayStr = fmtDate(TODAY);

  // ── Filter stickies ──────────────────────────────────────────
  let filtered = STATE.stickies;

  // Context pill filter
  if (f.context === 'pinned') filtered = filtered.filter(s => s.pinned && !s.done);
  else if (f.context === 'open') filtered = filtered.filter(s => !s.done);
  else if (f.context === 'done') filtered = filtered.filter(s => s.done);

  // Date float filter
  if (f.date !== 'All') {
    if (f.date === 'overdue')  filtered = filtered.filter(s => s.date && s.date < todayStr && !s.done);
    else if (f.date === 'today')    filtered = filtered.filter(s => s.date === todayStr);
    else if (f.date === 'upcoming') filtered = filtered.filter(s => s.date && s.date > todayStr);
    else if (f.date === 'nodate')   filtered = filtered.filter(s => !s.date);
  }

  // Tag float filter
  if (f.tag !== 'All') {
    filtered = filtered.filter(s => (s.tags||[]).includes(f.tag));
  }

  // Search filter
  if (f.search.trim()) {
    const q = f.search.toLowerCase();
    filtered = filtered.filter(s =>
      s.text.toLowerCase().includes(q) ||
      (s.tags||[]).some(t => t.toLowerCase().includes(q))
    );
  }

  // ── Counts for pills (unfiltered base, only context-aware) ───
  const all    = STATE.stickies;
  const cAll    = all.length;
  const cPinned = all.filter(s => s.pinned && !s.done).length;
  const cOpen   = all.filter(s => !s.done).length;
  const cDone   = all.filter(s => s.done).length;

  // ── Date float counts (respect tag + search + context) ───────
  const _baseForDate = filtered;
  const dateCounts = {
    overdue:  _baseForDate.filter(s => s.date && s.date < todayStr && !s.done).length,
    today:    _baseForDate.filter(s => s.date === todayStr).length,
    upcoming: _baseForDate.filter(s => s.date && s.date > todayStr).length,
    nodate:   _baseForDate.filter(s => !s.date).length,
  };

  // ── Tag float counts (respect date + search + context) ───────
  const _baseForTag = filtered;
  const tagNames = new Set();
  _baseForTag.forEach(s => (s.tags||[]).forEach(t => tagNames.add(t)));
  const tagCounts = {};
  tagNames.forEach(t => { tagCounts[t] = _baseForTag.filter(s => (s.tags||[]).includes(t)).length; });

  // ── Date label + color ───────────────────────────────────────
  const dateActive = f.date !== 'All';
  const _dateLabels = { overdue:'Past', today:'Today', upcoming:'Upcoming', nodate:'No Date' };
  const dateLabel  = dateActive ? (_dateLabels[f.date] || f.date) : 'All Dates';
  const dateCount  = dateActive ? _baseForDate.filter(s => {
    if (f.date === 'overdue')  return s.date && s.date < todayStr && !s.done;
    if (f.date === 'today')    return s.date === todayStr;
    if (f.date === 'upcoming') return s.date && s.date > todayStr;
    if (f.date === 'nodate')   return !s.date;
    return true;
  }).length : 0;
  const dateFullLabel = dateActive ? `${dateLabel} (${dateCount})` : 'All Dates';

  // ── Tag label ────────────────────────────────────────────────
  const tagActive = f.tag !== 'All';
  const tagCount  = tagActive ? (_baseForTag.filter(s => (s.tags||[]).includes(f.tag)).length) : 0;
  const tagFullLabel = tagActive ? `#${f.tag} (${tagCount})` : 'All Tags';

  // ── Build float HTML ─────────────────────────────────────────
  const dateOptions = [
    { key:'overdue',  label:'Past',     count: dateCounts.overdue  },
    { key:'today',    label:'Today',    count: dateCounts.today    },
    { key:'upcoming', label:'Upcoming',  count: dateCounts.upcoming },
    { key:'nodate',   label:'No Date',   count: dateCounts.nodate   },
  ];
  const dateFloatHTML = `<div style="padding:4px 0">
    <div class="kb-float-item${f.date==='All'?' active':''}" onclick="_rmSetDate('All')">All Dates</div>
    ${dateOptions.map(o => `<div class="kb-float-item${f.date===o.key?' active':''}" onclick="_rmSetDate('${o.key}')">${o.label}<span class="kb-float-count">${o.count}</span></div>`).join('')}
  </div>`;
  STATE._rmDateFloatHTML = dateFloatHTML;

  const tagFloatHTML = `<div style="padding:4px 0">
    <div class="kb-float-item${f.tag==='All'?' active':''}" onclick="_rmSetTag('All')">All Tags</div>
    ${[...tagNames].sort().map(t => `<div class="kb-float-item${f.tag===t?' active':''}" onclick="_rmSetTag('${t}')">#${t}<span class="kb-float-count">${tagCounts[t]}</span></div>`).join('')}
  </div>`;
  STATE._rmTagFloatHTML = tagFloatHTML;

  // ── Sort filtered: pinned first then by newest ────────────────
  const byNewest = (a, b) => {
    const na = parseInt((a.id||'').replace(/\D/g,''), 10) || 0;
    const nb = parseInt((b.id||'').replace(/\D/g,''), 10) || 0;
    return nb - na;
  };
  const pinnedF = filtered.filter(s => s.pinned && !s.done).sort(byNewest);
  const activeF = filtered.filter(s => !s.pinned && !s.done).sort(byNewest);
  const doneF   = filtered.filter(s => s.done).sort(byNewest);
  if (STATE._remindersDoneExpanded === undefined) STATE._remindersDoneExpanded = false;

  // ── Build card ───────────────────────────────────────────────
  const buildReminderMeta = s => {
    // Parse date — handle ISO format from sheet
    const _rawDate   = s.date || '';
    const _cleanDate = _rawDate.includes('T') ? _rawDate.split('T')[0] : _rawDate;

    // Meta text
    let metaText = '';
    if (s.done && s.doneAt) {
      const _raw = s.doneAt.includes('T') ? s.doneAt.replace('T',' ').split('.')[0] : s.doneAt;
      const _dp  = _raw.split(' ');
      metaText = 'Done ' + [_dp[0], _dp[1] ? fmtTime(_dp[1]) : ''].filter(Boolean).join(' ');
    } else if (s.done) {
      metaText = 'Completed';
    } else if (_cleanDate) {
      metaText = _cleanDate + (s.time ? ' · ' + fmtTime(s.time) : '');
    }
    return metaText;
  };

  const buildReminderTags = s => {
    // Tag chips
    return (s.tags||[]).length
      ? `<div style="display:flex;flex-wrap:wrap;gap:4px">${(s.tags||[]).map(t => _buildTagChip(t)).join('')}</div>`
      : '';
  };

  const buildColorSwatches = s => {
    return STICKY_COLORS.map((col,i) => `<button onclick="changeStickyColor('${s.id}',${i})"
            style="width:14px;height:14px;border-radius:50%;background:${col.bg};border:${s.colorIdx===i?'2px solid rgba(255,255,255,0.85)':'1px solid rgba(0,0,0,0.2)'};cursor:pointer;outline:none;flex-shrink:0"></button>`).join('');
  };

  const buildCard = s => {
    const c          = getStickyColor(s.colorIdx);
    const isFloating = !!s.float && !isSmallScreen;
    const isPinned   = !!s.pinned;
    const isDone     = !!s.done;

    const metaText = buildReminderMeta(s);
    const tagsHTML = buildReminderTags(s);

    // Pin/Float active state colors from config (light/dark aware)
    const _pac       = getNoteActionColor('pin');
    const _fac       = getNoteActionColor('float');
    const pinStyle   = isPinned   ? `background:${_pac.bg};color:${_pac.color};border:1px solid ${_pac.border};border-radius:20px` : '';
    const floatStyle = isFloating ? `background:${_fac.bg};color:${_fac.color};border:1px solid ${_fac.border};border-radius:20px` : '';
    const pinTitle   = isPinned   ? 'Pinned — click to unpin' : 'Pin note';
    const floatTitle = isFloating ? 'Floating — click to stop' : 'Float note';

    return `<div class="reminder-card${isPinned?' reminder-pinned':''}${isDone?' reminder-done':''}"
        style="background:${c.bg};color:${c.text}${isDone?';opacity:0.65;':''}">

      <div class="reminder-card-top" style="margin-bottom:6px">
        <div style="flex:1;min-width:0">
          <div class="reminder-card-body" style="${isDone?'text-decoration:line-through;opacity:0.8':''}">
            ${s.text}
          </div>
        </div>
      </div>

      ${metaText ? `<div style="font-size:10px;opacity:0.7;margin-bottom:2px">${metaText}</div>` : ''}
      ${tagsHTML ? `<div style="margin-bottom:8px">${tagsHTML}</div>` : ''}

      <div class="reminder-card-footer" style="margin-top:auto">
        <div style="display:flex;gap:4px;align-items:center">
          ${buildColorSwatches(s)}
        </div>
        <div style="display:flex;align-items:center;gap:2px">
          ${!isDone ? `
            <button class="reminder-action-btn" style="${pinStyle}" onclick="toggleNotePin('${s.id}',${!isPinned})" title="${pinTitle}">
              <i class="ti ti-pin" style="font-size:15px"></i>
            </button>
            ${!isSmallScreen ? `<button class="reminder-action-btn" style="${floatStyle}" onclick="toggleNoteFloat('${s.id}',${!isFloating})" title="${floatTitle}"><i class="ti ti-layout-navbar" style="font-size:15px"></i></button>` : ''}
            <span style="width:1px;height:16px;background:var(--border);margin:0 3px;flex-shrink:0"></span>
          ` : ''}
          ${isDone ? `<button class="reminder-action-btn" onclick="archiveStickyItem('${s.id}')"
            title="Archive note">
            <i class="ti ti-archive" style="font-size:15px"></i>
          </button>` : ''}
          <button class="reminder-action-btn" onclick="toggleStickyDone('${s.id}',${!isDone})"
            title="${isDone?'Mark as not done':'Mark as done'}">
            <i class="ti ${isDone?'ti-checkbox':'ti-square'}" style="font-size:15px"></i>
          </button>
          <button class="reminder-action-btn" onclick="openStickyModal('${s.id}')"
            title="Edit">
            <i class="ti ti-pencil" style="font-size:15px"></i>
          </button>
          <button class="reminder-action-btn" onclick="removeStickyItem('${s.id}')"
            title="Delete">
            <i class="ti ti-trash" style="font-size:15px"></i>
          </button>
        </div>
      </div>
    </div>`;
  };

  // ── Hoisted "done" grid markup (used in both done-section branches) ──
  const doneGridHTML = `<div class="reminders-grid" style="margin-top:8px">${doneF.map(buildCard).join('')}</div>`;

  // ── Hero subtitle ────────────────────────────────────────────
  const ctxSubtitle = f.context === 'pinned' ? 'Pinned'
    : f.context === 'open' ? 'Open Notes'
    : f.context === 'done' ? 'Done Notes'
    : 'All Notes';

  // ── Render ───────────────────────────────────────────────────
  const _wasSearchFocused = _captureSearchFocus('rm-search-input');

  el.innerHTML = `
    <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:12px;flex-shrink:0">
      <span style="font-size:26px;font-weight:800;letter-spacing:-0.03em;line-height:1.1;color:var(--text);font-family:var(--font-disp)">Reminders &amp; Notes</span>
      <span style="font-size:26px;font-weight:400;color:var(--muted);font-family:var(--font-disp)"> · ${ctxSubtitle}</span>
      <div style="display:flex;gap:8px;margin-left:auto">
        <button class="btn-ghost" onclick="openStickyArchiveDrawer()"><i class="ti ti-archive" style="font-size:13px;margin-right:4px"></i>View Archive</button>
        <button class="btn-primary" onclick="openStickyModal(null)">+ Add Note</button>
      </div>
    </div>

    <div class="kb-pill-strip" style="margin-bottom:8px">
      <button class="kb-pill${f.context==='all'?' active':''}" onclick="_rmSetContext('all')">
        <span class="kb-pill-num">${cAll}</span> ALL NOTES
      </button>
      ${cPinned > 0 ? `<button class="kb-pill${f.context==='pinned'?' active':''}" onclick="_rmSetContext('pinned')"><span class="kb-pill-num">${cPinned}</span> PINNED</button>` : ''}
      <button class="kb-pill${f.context==='open'?' active':''}" onclick="_rmSetContext('open')">
        <span class="kb-pill-num">${cOpen}</span> OPEN
      </button>
      ${cDone > 0 ? `<button class="kb-pill done${f.context==='done'?' active':''}" onclick="_rmSetContext('done')"><span class="kb-pill-num">${cDone}</span> DONE NOTES</button>` : ''}
    </div>

    <div class="kb-pill-strip" style="margin-bottom:16px">
      <div class="kb-search-wrap">
        <i class="ti ti-search" style="font-size:12px;color:var(--muted)"></i>
        <input id="rm-search-input" placeholder="Search notes…" value="${f.search}"
          oninput="STATE.reminderFilter.search=this.value;renderReminders();">
      </div>
      <button class="kb-dropdown-btn${dateActive?' active':''}" onclick="_rmOpenDateFloat(this)">
        ${dateFullLabel} &nbsp;&#9660;
      </button>
      <button class="kb-dropdown-btn${tagActive?' active':''}" onclick="_rmOpenTagFloat(this)">
        ${tagFullLabel} &nbsp;&#9660;
      </button>
    </div>

    ${filtered.length === 0 ? `
      <div style="text-align:center;padding:60px 20px;color:var(--muted)">
        <div style="font-size:13px">No notes match your filters</div>
      </div>` : `

      ${pinnedF.length > 0 ? `
        <div class="reminders-section-label">
          <i class="ti ti-pin" style="font-size:13px"></i> Pinned
          <span class="reminders-section-count">${pinnedF.length}</span>
        </div>
        <div class="reminders-grid reminders-grid-pinned">${pinnedF.map(buildCard).join('')}</div>
      ` : ''}

      ${(pinnedF.length > 0 && activeF.length > 0) ? `<div class="reminders-divider"></div>` : ''}

      ${activeF.length > 0 ? `
        <div class="reminders-grid">${activeF.map(buildCard).join('')}</div>
      ` : ''}

      ${doneF.length > 0 ? `
        <div class="reminders-divider"></div>
        ${f.context === 'done' ? `
          ${doneGridHTML}
        ` : `
          <div style="display:flex;align-items:center;gap:6px">
            <button class="reminders-done-toggle" style="flex:1" onclick="STATE._remindersDoneExpanded=!STATE._remindersDoneExpanded;renderReminders()">
              <span style="display:flex;align-items:center;gap:6px">
                <i class="ti ti-checkbox" style="font-size:13px"></i>
                Done
                <span class="reminders-section-count">${doneF.length}</span>
              </span>
              <i class="ti ${STATE._remindersDoneExpanded?'ti-chevron-up':'ti-chevron-down'}" style="font-size:13px"></i>
            </button>
            <button class="btn-ghost" style="font-size:11px;height:32px;padding:0 10px;white-space:nowrap"
              onclick="archiveAllDoneStickies()" title="Archive all done notes">
              <i class="ti ti-archive" style="font-size:12px;margin-right:3px"></i>Archive All
            </button>
          </div>
          ${STATE._remindersDoneExpanded ? `
            ${doneGridHTML}
          ` : ''}
        `}
      ` : ''}
    `}
  `;

  // Restore search focus
  _restoreSearchFocus('rm-search-input', _wasSearchFocused);

  // Apply pinned accent from config
  requestAnimationFrame(() => {
    const pa = getPinnedAccent();
    document.querySelectorAll('.reminder-card.reminder-pinned').forEach(el => {
      el.style.setProperty('--pinned-border', pa.border);
      el.style.setProperty('--pinned-shadow', pa.shadow);
    });
  });

  _updateRemindersBadge(STATE.stickies.length);
}

function unfloatSticky(id) {
  const s = STATE.stickies.find(x => x.id === id);
  if (!s) return;
  s.float = false;
  saveSticky(s).catch(()=>{});
  renderStickyLayer();
  renderReminders();
}

function toggleNoteFloat(id, enabled) {
  if (window.innerWidth < 600) return;
  const s = STATE.stickies.find(x => x.id === id);
  if (!s) return;
  s.float = enabled;
  saveSticky(s).catch(()=>{});
  renderStickyLayer();
  renderReminders();
}

function _updateRemindersBadge(count) {
  // Find the Reminders sidebar button and add/update badge
  const btn = document.querySelector('.sidebar-btn[data-page="page-reminders"]');
  if (!btn) return;
  let badge = btn.querySelector('.sidebar-badge');
  if (count === 0) { if (badge) badge.remove(); return; }
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'sidebar-badge';
    btn.appendChild(badge);
  }
  badge.textContent = count;
}

