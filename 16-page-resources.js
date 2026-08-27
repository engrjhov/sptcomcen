// ============================================================
// 16-page-resources.js
// Resources/Directories page (renderDirectories)
// (lines 7938-8217 of the original inline <script>)
// ============================================================

function renderDirectories() {
  const tab        = STATE.dirTab;
  const q          = STATE.dirSearch.toLowerCase();
  const activeTags = STATE.dirTags || [];

  // ── Group label ──────────────────────────────────────────────
  const groupLabel = tab === 'folders' ? 'Folders & Files' : tab === 'contacts' ? 'Contacts' : tab === 'locations' ? 'Locations' : 'Tags';

  // ── Sort helper — defined first so it can be used below ───────
  const _sortItems = arr => {
    if (STATE.dirSort === 'az')
      return [...arr].sort((a,b) => (a.name||'').localeCompare(b.name||''));
    return [...arr].sort((a,b) => (b.id||'').localeCompare(a.id||''));
  };

  // ── Tab strip ────────────────────────────────────────────────
  const _tabs = [
    { id:'folders',   icon:'ti-folder',  label:'Folders & Files' },
    { id:'contacts',  icon:'ti-user',    label:'Contacts'        },
    { id:'locations', icon:'ti-map-pin', label:'Locations'       },
    { id:'tags',      icon:'ti-tag',     label:'Tags'            },
  ];
  const tabHTML = _tabs.map(t =>
    '<button class="gt-primary-pill' + (tab===t.id?' active':'') + '"'
    + ' onclick="_dirSwitchTab(\'' + t.id + '\')">'
    + '<i class="ti ' + t.icon + '" style="font-size:13px"></i>' + t.label
    + '</button>'
  ).join('');

  // ── Helpers ───────────────────────────────────────────────────
  const emptyState = (icon, msg, sub, action, actionLabel) =>
    '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--muted)">'
    + '<i class="ti ' + icon + '" style="font-size:40px;display:block;margin-bottom:12px;opacity:0.5"></i>'
    + '<div style="font-size:15px;font-weight:600;margin-bottom:4px;color:var(--text2)">' + msg + '</div>'
    + '<div style="font-size:13px;margin-bottom:16px">' + sub + '</div>'
    + '<button class="btn-primary" onclick="' + action + '"><i class="ti ti-plus" style="font-size:13px;margin-right:4px"></i>' + actionLabel + '</button>'
    + '</div>';

  const searchEmpty = type =>
    '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--muted)">'
    + '<i class="ti ti-search-off" style="font-size:40px;display:block;margin-bottom:12px;opacity:0.5"></i>'
    + '<div style="font-size:15px;font-weight:600;margin-bottom:4px;color:var(--text2)">No results</div>'
    + '<div style="font-size:13px">No ' + type + ' match that search</div>'
    + '</div>';

  const editBtn = (type, id) =>
    '<button class="dir-action-btn" onclick="openDirModal(\'' + type + '\',\'' + id + '\')" title="Edit"><i class="ti ti-pencil" style="font-size:13px"></i></button>';
  const delBtn = (type, id) =>
    '<button class="dir-action-btn" onclick="removeDirItem(\'' + type + '\',\'' + id + '\')" title="Delete"><i class="ti ti-trash" style="font-size:13px"></i></button>';
  const addCard = (type, label) =>
    '<div class="dir-add-btn" onclick="openDirModal(\'' + type + '\',null)"><i class="ti ti-plus" style="font-size:20px"></i><span>Add ' + label + '</span></div>';

  // ── Tag chip row / action button group helpers ─────────────────
  const tagChipRow = (tags, marginBottom) => {
    const _raw = (tags||[]).map(t => _buildTagChip(t)).join('');
    return _raw ? '<div style="display:flex;flex-wrap:wrap;gap:4px' + (marginBottom ? ';margin-bottom:4px' : '') + '">' + _raw + '</div>' : '';
  };
  const actionButtons = (type, id, marginLeftAuto) =>
    '<div style="display:flex;gap:2px' + (marginLeftAuto ? ';margin-left:auto' : '') + '">' + editBtn(type,id) + delBtn(type,id) + '</div>';

  // ── Card builders ────────────────────────────────────────────
  const buildFolderCard = f => {
    const _fTags = tagChipRow(f.tags, true);
    const _fOpen = f.url ? '<a class="dir-card-action-link" href="' + f.url + '" target="_blank" rel="noopener"><i class="ti ti-external-link" style="font-size:12px"></i> Open</a>' : '';
    return '<div class="dir-card">'
      + '<div class="dir-card-header" style="align-items:center">'
      + '<div class="dir-icon" style="background:rgba(40,92,112,0.18);color:var(--accent2)"><i class="ti ti-folder" style="font-size:20px"></i></div>'
      + '<div class="dir-card-title" style="flex:1;min-width:0">' + f.name + '</div>'
      + '</div>'
      + (f.desc ? '<div class="dir-card-sub" style="font-size:12px;line-height:1.4">' + f.desc + '</div>' : '')
      + _fTags
      + '<div class="dir-card-footer" style="align-items:center">'
      + '<div>' + _fOpen + '</div>'
      + actionButtons('folder', f.id, true)
      + '</div></div>';
  };

  const buildContactCard = c => {
    const _av    = avColor(c.name);
    const _avBg  = _av + '22';
    const _init  = initials(c.name);
    // Phone + email — closer gap, no icon on company
    const _phone = c.phone ? '<a class="dir-card-action-link" href="tel:' + c.phone.split(' ').join('') + '" style="font-size:12px;margin-bottom:2px"><i class="ti ti-phone" style="font-size:12px"></i>' + c.phone + '</a>' : '';
    const _email = c.email ? '<a class="dir-card-action-link" href="mailto:' + c.email + '" style="font-size:12px"><i class="ti ti-mail" style="font-size:12px"></i>' + c.email + '</a>' : '';
    const _ctags = tagChipRow(c.tags, false);
    const _cnotes = c.notes ? '<div class="dir-card-body" style="font-size:11px;opacity:0.8;line-height:1.4">' + c.notes + '</div>' : '';
    const _contacts = (_phone || _email)
      ? '<div style="display:flex;flex-direction:column;gap:3px;margin-bottom:4px">' + _phone + _email + '</div>'
      : '';
    return '<div class="dir-card">'
      + '<div class="dir-card-header" style="align-items:flex-start;gap:12px;margin-bottom:6px">'
      + '<div class="dir-icon-lg" style="background:' + _avBg + ';color:' + _av + ';border:1px solid ' + _av + '44">' + _init + '</div>'
      + '<div style="flex:1;min-width:0;padding-top:2px">'
      + '<div class="dir-card-title" style="margin-bottom:1px">' + c.name + '</div>'
      + (c.position ? '<div class="dir-card-sub">' + c.position + '</div>' : '')
      + (c.company  ? '<div class="dir-card-sub" style="font-size:10px;opacity:0.75">' + c.company + '</div>' : '')
      + '</div></div>'
      + _contacts
      + _cnotes
      + _ctags
      + '<div class="dir-card-footer" style="justify-content:flex-end">'
      + actionButtons('contact', c.id, false)
      + '</div></div>';
  };

  const buildLocationCard = l => {
    const _lTags   = tagChipRow(l.tags, false);
    const _lMapUrl = l.mapUrl  ? '<a class="dir-card-action-link" href="' + l.mapUrl + '" target="_blank" rel="noopener" style="font-size:12px"><i class="ti ti-map" style="font-size:13px"></i> View on Map</a>' : '';
    const _lPhone  = l.phone   ? '<div class="dir-card-body" style="font-size:12px"><i class="ti ti-phone" style="font-size:11px;margin-right:4px;opacity:0.7"></i>' + l.phone + '</div>' : '';
    const _lNotes  = l.notes   ? '<div class="dir-card-body" style="font-size:11px;opacity:0.8;line-height:1.4">' + l.notes + '</div>' : '';
    return '<div class="dir-card">'
      + '<div class="dir-card-header" style="align-items:flex-start;gap:12px;margin-bottom:6px">'
      + '<div class="dir-icon" style="background:rgba(251,191,36,0.15);color:#FBBF24"><i class="ti ti-map-pin" style="font-size:20px"></i></div>'
      + '<div style="flex:1;min-width:0;padding-top:2px">'
      + '<div class="dir-card-title" style="margin-bottom:1px">' + l.name + '</div>'
      + (l.company ? '<div class="dir-card-sub" style="font-size:10px;opacity:0.75">' + l.company + '</div>' : '')
      + '</div></div>'
      + (l.address ? '<div class="dir-card-body" style="font-size:12px;margin-bottom:2px"><i class="ti ti-map-pin" style="font-size:11px;margin-right:4px;opacity:0.7"></i>' + l.address + '</div>' : '')
      + _lPhone
      + _lNotes
      + _lTags
      + '<div class="dir-card-footer" style="align-items:center">'
      + '<div>' + _lMapUrl + '</div>'
      + actionButtons('location', l.id, true)
      + '</div></div>';
  };

  // ── Build cards ───────────────────────────────────────────────
  let cardsHTML = '';

  if (tab === 'folders') {
    const _fBase     = STATE.folders.filter(f => !q || f.name.toLowerCase().includes(q) || (f.desc||'').toLowerCase().includes(q) || (f.tags||[]).some(t=>t.includes(q)));
    const _fFiltered = activeTags.length ? _fBase.filter(f => activeTags.every(t => (f.tags||[]).includes(t))) : _fBase;
    const filtered   = _sortItems(_fFiltered);
    if (STATE.folders.length === 0) {
      cardsHTML = emptyState('ti-folder-off', 'No folders yet', 'Save links to important folders and resources', "openDirModal('folder',null)", 'Add Folder');
    } else if (filtered.length === 0) {
      cardsHTML = searchEmpty('folders');
    } else {
      cardsHTML = filtered.map(buildFolderCard).join('') + addCard('folder','Folder/File');
    }

  } else if (tab === 'contacts') {
    const _cBase     = STATE.contacts.filter(c => !q || c.name.toLowerCase().includes(q) || (c.position||'').toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q) || (c.phone||'').includes(q) || (c.company||'').toLowerCase().includes(q) || (c.tags||[]).some(t=>t.includes(q)));
    const _cFiltered = activeTags.length ? _cBase.filter(c => activeTags.every(t => (c.tags||[]).includes(t))) : _cBase;
    const filtered   = _sortItems(_cFiltered);
    if (STATE.contacts.length === 0) {
      cardsHTML = emptyState('ti-address-book-off', 'No contacts yet', 'Add people you frequently need to reach', "openDirModal('contact',null)", 'Add Contact');
    } else if (filtered.length === 0) {
      cardsHTML = searchEmpty('contacts');
    } else {
      cardsHTML = filtered.map(buildContactCard).join('') + addCard('contact','Contact');
    }

  } else {
    const _lBase     = STATE.locations.filter(l => !q || l.name.toLowerCase().includes(q) || (l.address||'').toLowerCase().includes(q) || (l.company||'').toLowerCase().includes(q) || (l.tags||[]).some(t=>t.includes(q)));
    const _lFiltered = activeTags.length ? _lBase.filter(l => activeTags.every(t => (l.tags||[]).includes(t))) : _lBase;
    const filtered   = _sortItems(_lFiltered);
    if (STATE.locations.length === 0) {
      cardsHTML = emptyState('ti-map-pin-off', 'No locations yet', 'Save addresses and map links for quick access', "openDirModal('location',null)", 'Add Location');
    } else if (filtered.length === 0) {
      cardsHTML = searchEmpty('locations');
    } else if (tab === 'tags') {
    cardsHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--muted)">'
      + '<i class="ti ti-tag" style="font-size:40px;display:block;margin-bottom:16px;opacity:0.5"></i>'
      + '<div style="font-size:16px;font-weight:700;color:var(--text2);margin-bottom:8px">Tags</div>'
      + '<div style="font-size:13px;line-height:1.6;max-width:320px;margin:0 auto">'
      + 'A central place to view and manage all your tags across the dashboard &mdash; '
      + 'usage counts, colors, and more. Coming soon.'
      + '</div>'
      + '</div>';

  } else {
      cardsHTML = filtered.map(buildLocationCard).join('') + addCard('location','Location');
    }
  }

  // ── Build tag float HTML ──────────────────────────────────────
  const _tabItems  = tab === 'folders' ? STATE.folders : tab === 'contacts' ? STATE.contacts : STATE.locations;
  const _tagBase   = _tabItems.filter(item => !q || item.name.toLowerCase().includes(q) || (item.tags||[]).some(t=>t.includes(q)));
  const _allTagsMap = {};
  _tagBase.forEach(item => (item.tags||[]).forEach(t => {
    if (!activeTags.includes(t)) {
      const cnt = activeTags.length
        ? _tagBase.filter(i => activeTags.every(a => (i.tags||[]).includes(a)) && (i.tags||[]).includes(t)).length
        : _tagBase.filter(i => (i.tags||[]).includes(t)).length;
      if (cnt > 0) _allTagsMap[t] = cnt;
    }
  }));
  const _availTags = Object.entries(_allTagsMap).sort((a,b) => b[1]-a[1]);
  const _floatItems = _availTags.length
    ? _availTags.map(([t,c]) => '<div class="kb-float-item" onclick="_dirAddTag(\'' + t + '\')">#' + t + '<span class="kb-float-count">' + c + '</span></div>').join('')
    : '<div style="padding:10px 14px;font-size:12px;color:var(--muted)">No more tags available</div>';
  STATE._dirTagFloatHTML = '<div style="padding:4px 0">' + _floatItems + '</div>';

  const _activeChipsHTML = activeTags.map(t => {
    const tc = tagColor(t);
    return '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:3px 8px;border-radius:20px;background:' + tc.bg + ';color:' + tc.text + ';border:1px solid ' + tc.border + '">#' + t + '<button onclick="_dirRemoveTag(\'' + t + '\')" style="background:none;border:none;cursor:pointer;padding:0;margin-left:2px;opacity:0.7;font-size:10px;color:inherit;line-height:1">x</button></span>';
  }).join('');
  const _tagBtnLabel   = activeTags.length === 0 ? 'All Tags &#9660;' : '+ Tags &#9660;';
  const _tagBtnActive  = activeTags.length ? ' active' : '';
  const _tagFilterHTML = _activeChipsHTML + '<button class="kb-dropdown-btn' + _tagBtnActive + '" onclick="_dirOpenTagFloat(this)">' + _tagBtnLabel + '</button>';

  // ── Sort controls ────────────────────────────────────────────
  const _azActive  = STATE.dirSort === 'az'     ? ' active' : '';
  const _newActive = STATE.dirSort === 'newest'  ? ' active' : '';
  const _sortHTML  = '<div style="display:flex;align-items:center;gap:6px;margin-left:auto;flex-shrink:0">'
    + '<span style="font-size:11px;color:var(--muted);font-weight:500">Sort:</span>'
    + '<button class="gt-primary-pill' + _azActive  + '" onclick="_dirSetSort(\'az\')" style="padding:4px 10px;font-size:11px">A-Z</button>'
    + '<button class="gt-primary-pill' + _newActive + '" onclick="_dirSetSort(\'newest\')" style="padding:4px 10px;font-size:11px">Newest</button>'
    + '</div>';

  // ── Search value (safe for innerHTML) ───────────────────────
  const _searchVal = (STATE.dirSearch||'').replace(/"/g, '&quot;');
  const _searchPh  = 'Search ' + groupLabel.toLowerCase() + '…';

  // ── Render ────────────────────────────────────────────────────
  // P1-BUG001: renderDirectories() replaces dirSection.innerHTML on every
  // keystroke, destroying and recreating #dir-search-input — causing focus
  // loss after each character. Capture focus state before replacement and
  // restore after so search typing is continuous.
  const _prevActive    = document.activeElement;
  const _searchFocused = _prevActive && _prevActive.id === 'dir-search-input';

  document.getElementById('dirSection').innerHTML = ''
    + '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:16px;flex-shrink:0;flex-wrap:wrap">'
    + '<span style="font-size:26px;font-weight:800;letter-spacing:-0.03em;line-height:1.1;color:var(--text);font-family:var(--font-disp)">Resources</span>'
    + '<span style="font-size:26px;font-weight:400;color:var(--muted);font-family:var(--font-disp)"> &middot; ' + groupLabel + '</span>'
    + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">' + tabHTML + '</div>'
    + '<div style="display:flex;gap:8px;align-items:center;margin-bottom:16px;flex-wrap:wrap">'
    + '<div class="kb-search-wrap">'
    + '<i class="ti ti-search" style="font-size:12px;color:var(--muted)"></i>'
    + '<input id="dir-search-input" placeholder="' + _searchPh + '" value="' + _searchVal + '" oninput="STATE.dirSearch=this.value;renderDirectories()" style="border:none;background:transparent;color:var(--text);font-family:var(--font);font-size:13px;outline:none;width:100%">'
    + '</div>'
    + _tagFilterHTML
    + _sortHTML
    + '</div>'
    + '<div class="dir-grid" style="padding-bottom:40px">' + cardsHTML + '</div>';

  // Restore focus and cursor if search input was active before render.
  // P1-BUG001 (follow-up): the previous fix captured selectionStart/End from
  // the old (destroyed) input before replacement. On the first character typed
  // into an empty field, selectionStart was 0, so setSelectionRange(0,0) placed
  // the cursor before the new character — causing the second character to prepend
  // rather than append, making it appear the first character didn't filter.
  // Fix: always place the cursor at the end of the new input value after restore.
  if (_searchFocused) {
    const _newInp = document.getElementById('dir-search-input');
    if (_newInp) {
      _newInp.focus();
      const _len = _newInp.value.length;
      _newInp.setSelectionRange(_len, _len);
    }
  }
}

function confirmAction(message, confirmLabel, onConfirm, danger=true, onCancel=null) {
  const btnId = 'confirm-action-btn-' + Date.now();
  const cancelBtnId = 'confirm-action-cancel-btn-' + Date.now();
  openModal(`
    <div style="padding:4px 0 12px">
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:10px">Confirm</div>
      <div style="font-size:14px;color:var(--text2);line-height:1.6">${message}</div>
    </div>
    <div class="modal-actions">
      <button id="${cancelBtnId}" class="btn-ghost">Cancel</button>
      <button id="${btnId}" style="${danger?'background:rgba(248,113,113,0.12);color:var(--red);border:1px solid rgba(248,113,113,0.35);height:36px;padding:0 16px;border-radius:10px;font-family:var(--font);font-size:14px;font-weight:600;cursor:pointer;':''}">
        ${confirmLabel}
      </button>
    </div>`);
  // P4-R024: Cancel is now a real addEventListener (was a static inline
  // onclick="clearNav()") so an arbitrary onCancel closure can be preserved
  // without .toString() serialization — same closure-preserving mechanism
  // the Confirm button below already uses (since P4-R003d-pre). Callers that
  // don't pass onCancel keep the exact prior behavior.
  document.getElementById(cancelBtnId).addEventListener('click', () => { if (onCancel) onCancel(); else clearNav(); });
  document.getElementById(btnId).addEventListener('click', () => { clearNav(); onConfirm(); });
}

