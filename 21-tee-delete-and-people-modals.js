// ============================================================
// 21-tee-delete-and-people-modals.js
// Delete confirmation + people/team member modals
// (lines 10165-11204 of the original inline <script>)
// ============================================================

// ── P4-R024: TEE Delete confirmation Cancel restoration ────────────────
// OD-31, discovery basis P4-D037. Captures the exact live, unsaved TEE
// Add/Edit DOM state before the Delete confirmation opens, so its Cancel
// button can restore this exact form instead of unwinding the whole modal
// chain. Conceptually the same two-tier pattern quickAddPersonFromModal/
// _saveQuickPerson/_restoreTEEModal already prove (Tier 1: values threaded
// through _renderTEEModal's existing `carried` param via val(); Tier 2:
// fields _renderTEEModal has no carried path for, reapplied to the DOM
// after render) — captured/restored independently here, not by reusing or
// modifying the quick-add-person flow's own carried-state objects. Unlike
// that flow, Subtasks ARE captured (val('subtasks',[]) already supports it
// — the omission in quick-add-person is caller-side, not a _renderTEEModal
// limitation; see P4-D037 §3). Local return value only — nothing here is
// written to STATE or persisted.
function _captureTEEModalState() {
  const subtasks = (() => {
    const list = document.getElementById('tee-subtask-list');
    if (!list) return [];
    return _readSubtaskRowsFromDOM(list);
  })();

  return {
    // Tier 1 — shared fields _renderTEEModal already threads through its
    // `carried` param (read via val()): title/desc/category/tags/notes/
    // links/subtasks. Mirrors quickAddPersonFromModal's own `carried` shape,
    // plus subtasks.
    carried: {
      title:    document.getElementById('tee-title')?.value    || '',
      desc:     document.getElementById('tee-desc')?.value     || '',
      category: document.getElementById('tee-category')?.value || '',
      tags:     document.getElementById('tee-tags')?.value      || '',
      notes:    document.getElementById('tee-notes')?.value     || '',
      links:    _getTeeLinksFromDOM() || [],
      subtasks: subtasks,
    },
    // Tier 2 — fields _buildTEEIdentityFields/_buildTEEDetailsBottom/
    // _buildTEEAssignFields/_buildTEEContextFields build from `item` only,
    // with no `carried` path — reapplied to the DOM after render (see
    // _restoreTEEModalState). `type` is threaded as _renderTEEModal's own
    // `type` argument (not part of Tier 2's post-render patch), which is
    // what correctly mounts the right type-specific field zone, including
    // an in-progress, unsaved type switch.
    type:      document.getElementById('tee-current-type')?.value || 'task',
    status:    document.getElementById('tee-status')?.value       || '',
    priority:  document.getElementById('tee-priority')?.value     || '',
    dept:      document.getElementById('tee-dept')?.value         || '',
    project:   document.getElementById('tee-project')?.value      || '',
    startDate: document.getElementById('tee-startDate')?.value    || '',
    dueDate:   document.getElementById('tee-dueDate')?.value      || '',
    productListDeadline: document.getElementById('tee-product-list-deadline')?.value || '',
    planogramDeadline: document.getElementById('tee-planogram-deadline')?.value || '',
    date:      document.getElementById('tee-date')?.value         || '',
    time:      document.getElementById('tee-time')?.value         || '',
    endTime:   document.getElementById('tee-endTime')?.value      || '',
    lead:      document.getElementById('tee-lead')?.value         || '',
    people:    getChipSelections('tee-contributors'),
  };
}

// Restores a _captureTEEModalState() snapshot into a freshly (re)rendered
// TEE Add/Edit form. Does not touch _navStack — this is a direct render
// call, not a nav-stack operation; the reopen closure already on the stack
// (pushed by TEE Detail's Edit button, if any) is left completely alone.
function _restoreTEEModalState(itemId, defaultDate, defaultStatus, captured) {
  const existingItem = itemId ? STATE.items.find(i => i.id === itemId) : null;
  _renderTEEModal(existingItem, captured.type || 'task', defaultDate, defaultStatus, captured.carried);
  // Same timing discipline as _saveQuickPerson/_restoreTEEModal: Tier-2
  // fields are reapplied after the synchronous render/DOM-insertion
  // completes, since chip-select elements etc. must already exist.
  setTimeout(() => {
    if (captured.status)   { const el = document.getElementById('tee-status');   if (el) { el.value = captured.status;   _syncTEEStatusTrigger(el.value); } }
    if (captured.priority) { const el = document.getElementById('tee-priority'); if (el) { el.value = captured.priority; _syncTEEPriorityTrigger(el.value); } }
    const deptEl    = document.getElementById('tee-dept');      if (deptEl)    deptEl.value    = captured.dept    || '';
    const projectEl = document.getElementById('tee-project');   if (projectEl) projectEl.value = captured.project || '';
    const startEl   = document.getElementById('tee-startDate'); if (startEl)   startEl.value   = captured.startDate || '';
    const dueEl     = document.getElementById('tee-dueDate');   if (dueEl)     dueEl.value     = captured.dueDate   || '';
    const productDeadlineEl = document.getElementById('tee-product-list-deadline'); if (productDeadlineEl) productDeadlineEl.value = captured.productListDeadline || '';
    const planogramDeadlineEl = document.getElementById('tee-planogram-deadline'); if (planogramDeadlineEl) planogramDeadlineEl.value = captured.planogramDeadline || '';
    const dateEl    = document.getElementById('tee-date');      if (dateEl)    dateEl.value    = captured.date    || '';
    const timeEl    = document.getElementById('tee-time');      if (timeEl)    timeEl.value    = captured.time    || '';
    const endTimeEl = document.getElementById('tee-endTime');   if (endTimeEl) endTimeEl.value = captured.endTime || '';
    const leadEl = document.getElementById('tee-lead');
    if (leadEl) leadEl.value = captured.lead || '';
    const people = new Set(captured.people || []);
    document.querySelectorAll('#tee-contributors .chip-option').forEach(chip => {
      chip.classList.toggle('selected', people.has(chip.dataset.val));
    });
  }, 50);
}

function deleteTEEItem(id) {
  const item  = STATE.items.find(i => i.id === id);
  const title = item?.title || 'this item';
  // P4-R024: capture the live, unsaved Add/Edit form state before opening
  // the confirmation, so Cancel can restore this exact form. _navStack is
  // untouched by any of this.
  const captured = _captureTEEModalState();
  confirmAction(
    `"<strong>${title}</strong>" will be permanently deleted. This cannot be undone.`,
    'Delete',
    () => {
      STATE.items = STATE.items.filter(i => i.id !== id);
      clearNav(); renderAll();
      deleteTEE(id).then(() => { toast('Deleted'); triggerSync(); }).catch(() => toast('Removed locally','info'));
    },
    true,
    () => _restoreTEEModalState(id, '', '', captured)
  );
}

// Quick-add a person from inside the TEE task modal — adds to People tab and refreshes assignee dropdown
// quickAddPersonFromModal: opens a mini-form inside the TEE modal
// to add a new team member without losing form state. On save,
// restores the TEE modal with the new person pre-selected.
function quickAddPersonFromModal() {
  // Save the current TEE modal state so we can restore it after adding the person
  const currentItemId   = document.getElementById('tee-hidden-id')?.value || '';
  const currentDate     = document.getElementById('tee-hidden-date')?.value || '';
  const currentStatus   = document.getElementById('tee-hidden-status')?.value || '';
  // P4-R008b: Type is now a pill dropdown trigger, not .tee-type-btn tabs — read
  // the value-bearing #tee-current-type holder (kept in sync by switchTEEType)
  // instead of the old .tee-type-btn.active textContent parse.
  const currentType     = document.getElementById('tee-current-type')?.value || 'task';
  // Carry shared fields
  // P4-R012a: links added — TEE Links (discovery basis P4-D022) is a
  // shared field like category/tags/notes, so an in-progress, unsaved
  // Links row typed before opening quick-add-person must survive the same
  // way those already do. Read via the shared _getTeeLinksFromDOM() helper
  // (same one saveTEEModal uses) — the quick-add mini-form's own
  // openModal() call below replaces the entire TEE Add/Edit DOM, so
  // anything not captured here would otherwise be silently lost, the same
  // way Subtasks currently is (a pre-existing, separate gap — see
  // P4-D022 §12 — not fixed here, but deliberately not repeated for Links).
  const carried = {
    title:    document.getElementById('tee-title')?.value || '',
    desc:     document.getElementById('tee-desc')?.value || '',
    category: document.getElementById('tee-category')?.value || '',
    tags:     document.getElementById('tee-tags')?.value || '',
    notes:    document.getElementById('tee-notes')?.value || '',
    links:    _getTeeLinksFromDOM() || [],
  };
  // Extra task fields
  const carriedTask = {
    status:    document.getElementById('tee-status')?.value || '',
    priority:  document.getElementById('tee-priority')?.value || '',
    dept:      document.getElementById('tee-dept')?.value || '',
    startDate: document.getElementById('tee-startDate')?.value || '',
    dueDate:   document.getElementById('tee-dueDate')?.value || '',
    productListDeadline: document.getElementById('tee-product-list-deadline')?.value || '',
    planogramDeadline: document.getElementById('tee-planogram-deadline')?.value || '',
    project:   document.getElementById('tee-project')?.value || '',
    // P4-R009a: capture the in-progress people selection so quick-add can
    // restore it exactly on Cancel, or preserve+extend it on Save, instead of
    // losing it (see _restoreTEEModal / _saveQuickPerson). `lead` is Task-only
    // — harmless empty string for Event/Entry, since only Task renders
    // #tee-lead. `people` covers Contributors (Task) and Participants
    // (Event/Entry) alike, since both use the same #tee-contributors chip-select.
    lead:      document.getElementById('tee-lead')?.value || '',
    people:    getChipSelections('tee-contributors'),
  };

  const COLORS = ['#285C70','#34D399','#FB923C','#C084FC','#F87171','#22D3EE','#FBBF24'];

  openModal(`
    <div class="modal-title">
      👤 Add Team Member
      ${_modalCloseBtn(`_restoreTEEModal('${currentItemId}','${currentType}','${currentDate}','${currentStatus}')`)}
    </div>
    <div class="form-group">
      <label class="form-label">Full Name *</label>
      <input class="form-input" id="qap-name" placeholder="e.g. Maria Santos" autofocus>
    </div>
    <div class="form-group">
      <label class="form-label">Role</label>
      <input class="form-input" id="qap-role" placeholder="e.g. Designer, Developer…">
    </div>
    <div class="form-group">
      <label class="form-label">Colour</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap" id="qap-colors">
        ${COLORS.map((c,i) => `<button type="button" onclick="document.querySelectorAll('#qap-colors button').forEach(b=>b.style.outline='none');this.style.outline='3px solid #fff';document.getElementById('qap-color-val').value='${c}'"
          style="width:26px;height:26px;border-radius:50%;background:${c};border:none;cursor:pointer;${i===STATE.people.length%7?'outline:3px solid #fff':''}" title="${c}"></button>`).join('')}
        <input type="hidden" id="qap-color-val" value="${COLORS[STATE.people.length % 7]}">
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="_restoreTEEModal('${currentItemId}','${currentType}','${currentDate}','${currentStatus}')">Cancel</button>
      <button class="btn-primary" onclick="_saveQuickPerson('${currentItemId}','${currentType}','${currentDate}','${currentStatus}')">Save &amp; Select</button>
    </div>`);

  // Store carried values for after save
  window._qapCarried     = carried;
  window._qapCarriedTask = carriedTask;
}

// Save new person, restore prior people selections, and add the new person
// into the current item's Contributors (Task) / Participants (Event/Entry) —
// P4-R009a: never into Lead (owner decision, P4-D018 §K / OD-02).
function _saveQuickPerson(itemId, type, defaultDate, defaultStatus) {
  const name  = document.getElementById('qap-name')?.value.trim();
  if (!name) { toast('Name is required','error'); return; }
  const role  = document.getElementById('qap-role')?.value.trim() || '';
  const color = document.getElementById('qap-color-val')?.value || '#285C70';

  const newPerson = { id:uid('P'), name, role, color, photo:'' };
  STATE.people.push(newPerson);
  savePerson(newPerson).catch(()=>{});
  renderAll();
  toast(`${name} added to the team ✓`, 'success');

  const existingItem = itemId ? STATE.items.find(i => i.id === itemId) : null;
  const carried = window._qapCarried || {};
  const ct = window._qapCarriedTask || {};
  _renderTEEModal(existingItem || null, type, defaultDate, defaultStatus, { ...carried });

  setTimeout(() => {
    // P4-R006-fix1: ct (carriedTask) is a plain carried-value bag with no `.type`
    // property — passing it to getDisplayStatus(ct) was a bug: getDisplayStatus
    // checks `item.type === 'task'`, which is always false for `ct`, so it fell
    // through to the Event/Entry branch and returned 'Open' regardless of the
    // Task's actual carried status. `ct.status` is already the correct bare
    // identifier (read straight from #tee-status before quick-add opened) — just
    // normalize it for the current type and use it directly; no getDisplayStatus.
    if (ct.status)    { const el = document.getElementById('tee-status');    if (el) { el.value = _normalizeTEEStatusForType(type, ct.status); _syncTEEStatusTrigger(el.value); } }
    if (ct.priority)  { const el = document.getElementById('tee-priority');  if (el) { el.value = ct.priority; _syncTEEPriorityTrigger(el.value); } }
    if (ct.dept)      { const el = document.getElementById('tee-dept');      if (el) el.value = ct.dept; }
    if (ct.startDate) { const el = document.getElementById('tee-startDate'); if (el) el.value = ct.startDate; }
    if (ct.dueDate)   { const el = document.getElementById('tee-dueDate');   if (el) el.value = ct.dueDate; }
    if (ct.productListDeadline) { const el = document.getElementById('tee-product-list-deadline'); if (el) el.value = ct.productListDeadline; }
    if (ct.planogramDeadline) { const el = document.getElementById('tee-planogram-deadline'); if (el) el.value = ct.planogramDeadline; }
    if (ct.project)   { const el = document.getElementById('tee-project');   if (el) el.value = ct.project; }
    // P4-R009a: restore the pre-quick-add Lead (Task only) exactly as it was —
    // never the new person — then restore the prior Contributors/Participants
    // selection and add the newly created person into it. A Set naturally
    // avoids a duplicate entry if the new person were somehow already present.
    const leadEl = document.getElementById('tee-lead');
    if (leadEl) leadEl.value = ct.lead || '';
    const people = new Set(ct.people || []);
    people.add(name);
    document.querySelectorAll('#tee-contributors .chip-option').forEach(chip => {
      chip.classList.toggle('selected', people.has(chip.dataset.val));
    });
  }, 50);

  window._qapCarried = null;
  window._qapCarriedTask = null;
}

// Restore TEE modal after cancelling quick-add
function _restoreTEEModal(itemId, type, defaultDate, defaultStatus) {
  const existingItem = itemId ? STATE.items.find(i => i.id === itemId) : null;
  const carried = window._qapCarried || {};
  _renderTEEModal(existingItem, type || 'task', defaultDate, defaultStatus, carried);
  setTimeout(() => {
    const ct = window._qapCarriedTask || {};
    // P4-R006-fix1: see _saveQuickPerson's comment above — ct has no `.type`, so
    // getDisplayStatus(ct) always misread it as Event/Entry and returned 'Open'.
    // Use ct.status (already a bare identifier) directly, normalized for the type.
    if (ct.status)    { const el = document.getElementById('tee-status');    if (el) { el.value = _normalizeTEEStatusForType(type || 'task', ct.status); _syncTEEStatusTrigger(el.value); } }
    if (ct.priority)  { const el = document.getElementById('tee-priority');  if (el) { el.value = ct.priority; _syncTEEPriorityTrigger(el.value); } }
    if (ct.dept)      { const el = document.getElementById('tee-dept');      if (el) el.value = ct.dept; }
    if (ct.startDate) { const el = document.getElementById('tee-startDate'); if (el) el.value = ct.startDate; }
    if (ct.dueDate)   { const el = document.getElementById('tee-dueDate');   if (el) el.value = ct.dueDate; }
    if (ct.productListDeadline) { const el = document.getElementById('tee-product-list-deadline'); if (el) el.value = ct.productListDeadline; }
    if (ct.planogramDeadline) { const el = document.getElementById('tee-planogram-deadline'); if (el) el.value = ct.planogramDeadline; }
    if (ct.project)   { const el = document.getElementById('tee-project');   if (el) el.value = ct.project; }
    // P4-R009a: restore the exact pre-quick-add Lead/Contributors/Participants
    // selection — no person is added on Cancel. This replaces a previously dead
    // `if (ct.assignees)` block: quickAddPersonFromModal() never actually set
    // `ct.assignees`, so that branch could never fire (see P4-D018 §G). `ct.lead`
    // and `ct.people` are the real captured values now.
    const leadEl = document.getElementById('tee-lead');
    if (leadEl) leadEl.value = ct.lead || '';
    const people = new Set(ct.people || []);
    document.querySelectorAll('#tee-contributors .chip-option').forEach(chip => {
      chip.classList.toggle('selected', people.has(chip.dataset.val));
    });
    window._qapCarried = null;
    window._qapCarriedTask = null;
  }, 50);
}
// ── PEOPLE / TEAM MEMBER MODALS ──────────────────────────────
// Editing a person's name automatically renames them on all tasks
// they are assigned to (see savePersonModal).
function openPersonModal(personId, carried=null) {
  const p = personId ? STATE.people.find(x=>x.id===personId) : null;
  // P4-R025: optional `carried` override for unsaved-state restoration
  // (Person Remove confirmation Cancel — see removePerson below). Every
  // pre-existing call site passes only `personId`, so `carried` stays
  // `null` and `val()` resolves to the exact prior `p?.field||fallback`
  // behavior, byte-for-byte. When `carried` IS supplied, presence of the
  // field on `carried` (not truthiness) decides the value — this is what
  // lets an intentionally blank unsaved value (e.g. a cleared Role) survive
  // restoration instead of being masked by `||` falling through to the
  // saved value. Precedence: carried value (if the field is present on
  // `carried`) > saved Person value > fallback default. The value is fully
  // HTML-attribute-escaped (&, ", <, > — & first, so newly-created entities
  // from the other three replacements are never themselves re-escaped) so
  // it can be safely inserted inside a double-quoted value="..." attribute
  // — quote-only escaping was insufficient (P4-R025 Patch 1): unescaped `&`
  // could start a stray/invalid entity and unescaped `<`/`>` could be
  // misparsed as markup once the browser parses the attribute value. This
  // applies identically to both the carried and saved paths, so it also
  // fixes the same pre-existing attribute-injection risk for ordinary saved
  // data, not just carried data; the browser decodes the entities back to
  // the original literal characters on read, so `.value` is unaffected —
  // no displayed or saved value changes.
  const val = (field, fallback='') => {
    const raw = (carried && field in carried) ? carried[field] : (p?.[field] ?? fallback);
    return String(raw)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };
  openModal(`
    <div class="modal-title">${p?'Edit':'Add'} Team Member ${_modalCloseBtn()}</div>
    <div class="form-group"><label class="form-label">Full Name *</label><input class="form-input" id="pm-name" value="${val('name')}" placeholder="Full name"></div>
    <div class="form-group"><label class="form-label">Role / Title</label><input class="form-input" id="pm-role" value="${val('role')}" placeholder="e.g. UI/UX Designer"></div>
    <div class="form-group"><label class="form-label">Color</label><input class="form-input" type="color" id="pm-color" value="${val('color','#285C70')}"></div>
    <div class="form-group">
      <label class="form-label" style="display:flex;align-items:center;justify-content:space-between">
        Profile Photo URL
        <span style="font-size:10px;color:var(--muted);font-weight:400">direct image link</span>
      </label>
      <input class="form-input" id="pm-photo" value="${val('photo')}" placeholder="https://… or paste a Google Drive share link"
        oninput="(function(el){
          let v=el.value.trim();
          const m=v.match(/drive\\.google\\.com\\/file\\/d\\/([^/?]+)/);
          if(m){
            el.value='https://drive.google.com/thumbnail?id='+m[1]+'&sz=w200';
            el.style.color='var(--green)';
          } else { el.style.color=''; }
        })(this)">
      <div style="font-size:10px;color:var(--muted);margin-top:5px;line-height:1.6">
        💡 <strong>Google Drive:</strong> Right-click file → Share → "Anyone with the link" → Copy link → paste here. It auto-converts.<br>
        Or use any direct image URL (Imgur, GitHub raw, etc.).
      </div>
      ${p?.photo ? `<div style="margin-top:8px;display:flex;align-items:center;gap:10px"><img src="${p.photo}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid var(--border2)" onerror="this.style.display='none'"><span style="font-size:11px;color:var(--muted)">Current photo</span></div>` : ''}
    </div>
    ${p?`<div style="margin-bottom:12px"><button class="btn-ghost" style="color:var(--red);border-color:rgba(248,113,113,0.3)" onclick="removePerson('${p.id}')">Remove</button></div>`:''}
    <div class="modal-actions">
      <button class="btn-ghost" onclick="clearNav()">Cancel</button>
      <button class="btn-primary" onclick="savePersonModal('${personId||''}')">Save</button>
    </div>`);
}

function savePersonModal(existingId) {
  const name  = document.getElementById('pm-name').value.trim();
  if (!name) { toast('Name required','error'); return; }
  const data  = {
    id:    existingId || uid('P'),
    name,
    role:  document.getElementById('pm-role').value.trim(),
    color: document.getElementById('pm-color').value,
    photo: document.getElementById('pm-photo').value.trim(),
  };

  if (existingId) {
    const oldPerson = STATE.people.find(x => x.id === existingId);
    const oldName   = oldPerson?.name || '';
    STATE.people = STATE.people.map(x => x.id === existingId ? data : x);

    // Propagate name change to all items — tasks, events, AND entries
    if (oldName && oldName !== name) {
      let updatedCount = 0;
      STATE.items.forEach(item => {
        const parts = (item.assignees || '').split('|').map(s => s.trim());
        if (parts.includes(oldName)) {
          item.assignees = parts.map(n => n === oldName ? name : n).join('|');
          saveTEE(item).catch(() => {});
          updatedCount++;
        }
      });
      if (updatedCount > 0) toast(`Updated name on ${updatedCount} item${updatedCount > 1 ? 's' : ''}`, 'info');
    }
  } else {
    STATE.people.push(data);
  }

  clearNav(); renderAll();
  savePerson(data).then(() => toast(existingId ? 'Updated' : 'Added')).catch(() => toast('Saved locally', 'info'));
}

function removePerson(id) {
  const person = STATE.people.find(x => x.id === id);
  const name   = person?.name || 'this team member';
  // P4-R025 (OD-31, discovery basis P4-D037): capture the live, unsaved
  // Person Add/Edit form state before opening the confirmation, so Cancel
  // can restore this exact form. Person Add/Edit is always top-level and
  // never on `_navStack` (per P4-D037 §4) — this is a direct re-render via
  // `openPersonModal(id, captured)`, not a nav-stack operation; `_navStack`
  // is untouched by any of this. Values are read raw (not `.trim()`ed) so
  // in-progress whitespace is preserved exactly as typed, matching
  // savePersonModal's own separate trim-at-save-time behavior.
  const captured = {
    name:  document.getElementById('pm-name')?.value  ?? '',
    role:  document.getElementById('pm-role')?.value  ?? '',
    color: document.getElementById('pm-color')?.value ?? '',
    photo: document.getElementById('pm-photo')?.value ?? '',
  };
  confirmAction(
    `"<strong>${name}</strong>" will be removed from the team. Their tasks will remain but become unassigned.`,
    'Remove',
    () => {
      STATE.people = STATE.people.filter(x => x.id !== id);
      // P4-R018d (People Remove local-refresh fix, discovery basis P4-D030):
      // was `renderOverview()`, which never rebuilds the People tab itself —
      // the removed person stayed visible locally until the next full sync/
      // reload. Changed to `renderAll()`, matching savePersonModal's own
      // existing refresh pattern immediately above (`clearNav(); renderAll();`)
      // — renderAll() already calls renderOverview() first, so Today/Overview
      // still updates exactly as before, plus renderPeople() now runs too,
      // so the removed person disappears from the People tab immediately.
      // Each of renderAll()'s renders is independently try/caught, so this
      // cannot introduce a new failure mode beyond what savePersonModal
      // already relies on. Delete persistence (deletePerson below) and
      // confirmAction/clearNav behavior are both unchanged.
      clearNav(); renderAll();
      deletePerson(id).then(() => toast('Removed')).catch(() => toast('Removed locally','info'));
    },
    true,
    () => openPersonModal(id, captured)
  );
}

// ═══════════════════════════════════════════════════════════
// NOTE MODALS — Add/edit stickies with Pin + Float checkboxes
// DIRECTORY MODALS — Folders, Contacts, Locations CRUD
// ═══════════════════════════════════════════════════════════
function toggleNotePin(id, enabled) {
  const s = STATE.stickies.find(x => x.id === id);
  if (!s) return;
  s.pinned = enabled;
  saveSticky(s).catch(()=>{});
  renderStickyLayer();
  renderReminders();
  renderOverview(); // refresh Today tab pinned column
}

// Opens the sticky modal with pinned pre-checked (for + Add Pinned Note buttons)
function openPinnedNoteModal() {
  openStickyModal(null, true);
}

function openStickyModal(stickyId, prePinned = false) {
  const s        = stickyId ? STATE.stickies.find(x=>x.id===stickyId) : null;
  const isPinned = s ? !!s.pinned : prePinned;
  const isFloat  = s ? !!s.float  : false;
  const existingTags = s ? (s.tags||[]) : [];

  const colorBtns = STICKY_COLORS.map((c,i)=>
    `<button onclick="document.getElementById('st-color').value=${i};document.querySelectorAll('.color-pick').forEach(b=>b.style.outline='none');this.style.outline='2px solid var(--text)'"
      class="color-pick" style="width:24px;height:24px;border-radius:50%;background:${c.bg};border:none;cursor:pointer${s?.colorIdx===i?';outline:2px solid #fff':''}"></button>`
  ).join('');

  const tagChipsHTML = existingTags.map(t => {
    const tc = tagColor(t);
    return `<span class="sticky-tag-chip" data-tag="${t}" style="background:${tc.bg};color:${tc.text};border:1px solid ${tc.border}">#${t}<button onclick="event.stopPropagation();_stickyRemoveTag('${t}')" style="background:none;border:none;cursor:pointer;margin-left:3px;opacity:0.7;font-size:10px;color:inherit">x</button></span>`;
  }).join('');

  openModal(`
    <div class="modal-title">${s?'Edit':'Add'} Note ${_modalCloseBtn()}</div>
    <div class="form-group">
      <label class="form-label">Note Text <span style="font-size:10px;color:var(--muted);font-weight:400">type # to add tags</span></label>
      <div style="position:relative">
        <textarea class="form-textarea" id="st-text" placeholder="Write your reminder... type # to tag"
          style="min-height:90px" oninput="_stickyTagInput(this)"
          onblur="setTimeout(()=>{const d=document.getElementById('st-tag-dropdown');if(d)d.style.display='none';},200)"
          onkeydown="if(event.key==='Enter'&&document.getElementById('st-tag-dropdown')?.style.display==='block'){event.preventDefault();const first=document.querySelector('.sticky-tag-option');if(first)first.click();}"
          >${s?.text||''}</textarea>
        <div id="st-tag-dropdown" style="display:none;position:fixed;z-index:9999;
          background:var(--glass2);backdrop-filter:var(--blur);border:1px solid var(--border);
          border-radius:10px;max-height:200px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,0.35);
          min-width:180px;max-width:300px"></div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Tags</label>
      <div id="st-tags-chips" style="display:flex;flex-wrap:wrap;gap:6px;min-height:24px">${tagChipsHTML}</div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <div class="form-group" style="flex:1;min-width:140px;margin:0">
        <label class="form-label">Due Date <span style="font-size:10px;color:var(--muted);font-weight:400">optional</span></label>
        <input class="form-input" type="date" id="st-due-date" value="${s?.date||''}">
      </div>
      <div class="form-group" style="flex:1;min-width:120px;margin:0">
        <label class="form-label">Due Time <span style="font-size:10px;color:var(--muted);font-weight:400">optional</span></label>
        <input class="form-input" type="time" id="st-due-time" value="${s?.time||''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Color</label>
      <div style="display:flex;gap:8px;align-items:center">${colorBtns}<input type="hidden" id="st-color" value="${s?.colorIdx||0}"></div>
    </div>
    <div style="display:flex;gap:20px;margin-bottom:16px;flex-wrap:wrap">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">
        <input type="checkbox" id="st-pinned" ${isPinned?'checked':''}> Pinned
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">
        <input type="checkbox" id="st-float" ${isFloat?'checked':''}> Float
      </label>
    </div>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="clearNav()">Cancel</button>
      <button class="btn-primary" onclick="saveStickyModal('${stickyId||''}')">${s?'Save Changes':'Add Note'}</button>
    </div>`);
  window._stickyModalTags = [...existingTags];
}

window._stickyTagInput = function(textarea) {
  const val     = textarea.value;
  const cursor  = textarea.selectionStart;
  const before  = val.slice(0, cursor);
  const hashIdx = before.lastIndexOf('#');
  const dropdown = document.getElementById('st-tag-dropdown');
  if (!dropdown) return;

  // Hide if no # found or space between # and cursor (not a tag)
  if (hashIdx === -1 || before.slice(hashIdx).includes(' ')) {
    dropdown.style.display = 'none'; return;
  }

  const query   = before.slice(hashIdx + 1).toLowerCase();
  const allTags = getAllKnownTags();
  const current = window._stickyModalTags || [];
  const matches = allTags.filter(t => t.includes(query) && !current.includes(t)).slice(0, 8);

  if (matches.length === 0 && query.length === 0) {
    dropdown.style.display = 'none'; return;
  }

  const createOpt = query.length > 0 && !allTags.includes(query)
    ? `<div class="sticky-tag-option" style="font-style:italic;opacity:0.7" onclick="window._stickyPickTag('${query}')">+ Create #${query}</div>` : '';
  dropdown.innerHTML = matches.map(t =>
    `<div class="sticky-tag-option" onclick="window._stickyPickTag('${t}')">#${t}</div>`
  ).join('') + createOpt;

  // ── Caret position detection using mirror div ─────────────────
  // Create a hidden mirror div matching the textarea's style
  let mirror = document.getElementById('_st_mirror');
  if (!mirror) {
    mirror = document.createElement('div');
    mirror.id = '_st_mirror';
    document.body.appendChild(mirror);
  }
  const cs     = window.getComputedStyle(textarea);
  const taRect = textarea.getBoundingClientRect();
  const lineH  = parseInt(cs.lineHeight) || 18;

  // Position mirror exactly over the textarea so caret span coords match
  mirror.style.cssText = [
    'position:fixed','visibility:hidden','overflow:hidden','white-space:pre-wrap',
    'word-wrap:break-word',
    'top:'  + taRect.top  + 'px',
    'left:' + taRect.left + 'px',
    'width:'  + taRect.width  + 'px',
    'height:' + taRect.height + 'px',
    'font-family:'  + cs.fontFamily,
    'font-size:'    + cs.fontSize,
    'font-weight:'  + cs.fontWeight,
    'line-height:'  + cs.lineHeight,
    'padding:'      + cs.padding,
    'border:'       + cs.border,
    'box-sizing:'   + cs.boxSizing,
  ].join(';');

  // Text up to # + marker span; account for textarea scroll offset
  const textUpToHash = val.slice(0, hashIdx);
  mirror.innerHTML   = _escapeHtml(textUpToHash) + '<span id="_st_caret"></span>';
  // Shift mirror content up by scroll amount so caret position is correct
  mirror.scrollTop = textarea.scrollTop;

  const caretSpan = document.getElementById('_st_caret');
  const spRect    = caretSpan.getBoundingClientRect();

  // Dropdown appears just below the # character
  let top  = spRect.bottom + 2;
  let left = spRect.left;

  // Clamp to viewport — flip above if near bottom
  const dropH = Math.min(200, matches.length * 36 + 36);
  if (top + dropH > window.innerHeight - 20) top = top - dropH - parseInt(cs.lineHeight||'18');
  if (left + 300 > window.innerWidth - 10)   left = window.innerWidth - 310;
  left = Math.max(10, left);
  top  = Math.max(10, top);

  dropdown.style.top  = top  + 'px';
  dropdown.style.left = left + 'px';
  dropdown.style.display = 'block';
};

function _captureSearchFocus(inputId) {
  return document.activeElement?.id === inputId;
}

function _restoreSearchFocus(inputId, wasFocused) {
  if (!wasFocused) return;
  const el = document.getElementById(inputId);
  if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
}

function _escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/ /g,'&nbsp;').replace(/\n/g,'<br>');
}

window._stickyPickTag = function(tag) {
  tag = tag.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!tag) return;
  if ((window._stickyModalTags||[]).includes(tag)) {
    const d = document.getElementById('st-tag-dropdown');
    if (d) d.style.display = 'none'; return;
  }
  const ta = document.getElementById('st-text');
  if (ta) {
    const before  = ta.value.slice(0, ta.selectionStart);
    const after   = ta.value.slice(ta.selectionStart);
    const hashIdx = before.lastIndexOf('#');
    ta.value = before.slice(0, hashIdx) + after;
    ta.focus();
  }
  window._stickyModalTags.push(tag);
  _stickyRenderChips();
  const d = document.getElementById('st-tag-dropdown');
  if (d) d.style.display = 'none';
};

window._stickyRemoveTag = function(tag) {
  window._stickyModalTags = (window._stickyModalTags||[]).filter(t => t !== tag);
  _stickyRenderChips();
};

function _stickyRenderChips() {
  const container = document.getElementById('st-tags-chips');
  if (!container) return;
  const tags = window._stickyModalTags || [];
  container.innerHTML = tags.map(t => {
    const tc = tagColor(t);
    return `<span class="sticky-tag-chip" data-tag="${t}" style="background:${tc.bg};color:${tc.text};border:1px solid ${tc.border}">#${t}<button onclick="event.stopPropagation();_stickyRemoveTag('${t}')" style="background:none;border:none;cursor:pointer;margin-left:3px;opacity:0.7;font-size:10px;color:inherit">x</button></span>`;
  }).join('');
}

function saveStickyModal(existingId) {
  const rawText  = document.getElementById('st-text')?.value || '';
  const isPinned = document.getElementById('st-pinned')?.checked || false;
  const isFloat  = document.getElementById('st-float')?.checked  || false;
  const sDate    = document.getElementById('st-due-date')?.value || '';
  const sTime    = document.getElementById('st-due-time')?.value || '';

  if (!rawText.trim()) { toast('Note text required','error'); return; }

  // Extract trailing hashtags as safety net, merge with modal chips — deduplicate
  const { cleaned, tags: trailingTags } = extractStickyTags(rawText);
  const modalTags  = window._stickyModalTags || [];
  const mergedTags = [...new Set([...modalTags, ...trailingTags])];
  const finalText  = cleaned || rawText.trim();

  if (existingId) {
    const s = STATE.stickies.find(x=>x.id===existingId);
    if (s) {
      s.text     = finalText;
      s.colorIdx = Number(document.getElementById('st-color').value);
      s.pinned   = isPinned;
      s.float    = isFloat;
      s.tags     = mergedTags;
      s.date  = sDate;
      s.time  = sTime;
      saveSticky(s).catch(()=>{});
    }
  } else {
    const cx = Math.min(60 + STATE.stickies.length * 220, window.innerWidth - 220);
    const cy = 100 + Math.random() * 80;
    const s  = {
      id:       uid('ST'),
      text:     finalText,
      colorIdx: Number(document.getElementById('st-color').value),
      x: cx, y: cy,
      float:    isFloat,
      pinned:   isPinned,
      tags:     mergedTags,
      date:   sDate,
      time:   sTime,
      done:     false,
      doneAt:   '',
    };
    STATE.stickies.push(s);
    saveSticky(s).then(()=>toast('Note added')).catch(()=>toast('Saved locally','info'));
  }
  window._stickyModalTags = [];
  clearNav(); renderStickyLayer(); renderReminders(); renderOverview();
}

function addStickyNote() { saveStickyModal(''); }

function removeStickyItem(id) {
  STATE.stickies = STATE.stickies.filter(s=>s.id!==id);
  renderStickyLayer(); renderReminders();
  deleteSticky(id).then(()=>toast('Note removed')).catch(()=>toast('Removed locally','info'));
}

function archiveStickyItem(id) {
  const s = STATE.stickies.find(x=>x.id===id);
  if (!s) return;
  window._pendingStickyArchiveId = id;
  if (STATE._stickyArchiving) {
    openModal(`
      <div style="padding:4px 0 12px">
        <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:10px">Archive in Progress</div>
        <div style="font-size:14px;color:var(--text2);line-height:1.6">An archive operation is already running. Please wait for it to complete before archiving another note.</div>
      </div>
      <div class="modal-actions">
        <button class="btn-primary" onclick="clearNav()">OK</button>
      </div>`);
    return;
  }
  openModal(`
    <div style="padding:4px 0 12px">
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:10px">Archive Note</div>
      <div style="font-size:14px;color:var(--text2);line-height:1.6">"<strong>${s.text.slice(0,60)}${s.text.length>60?'…':''}</strong>" will be moved to the archive.</div>
    </div>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="clearNav()">Cancel</button>
      <button id="_stickyArchiveBtn" style="background:rgba(251,191,36,0.12);color:var(--yellow);border:1px solid rgba(251,191,36,0.35);height:36px;padding:0 16px;border-radius:10px;font-family:var(--font);font-size:14px;font-weight:600;cursor:pointer;"
        onclick="clearNav();_doArchiveSticky(window._pendingStickyArchiveId)">Archive</button>
    </div>`);
}

function openStickyArchiveDrawer() {
  openModal(`
    <div class="modal-title">
      <i class="ti ti-archive" style="font-size:16px;margin-right:6px"></i>Notes Archive
      ${_modalCloseBtn()}
    </div>
    <div style="margin-bottom:12px">
      <input id="sticky-archive-search" class="form-input" placeholder="Search archived notes…"
        oninput="_renderStickyArchiveList()" style="width:100%;box-sizing:border-box">
    </div>
    <div id="sticky-archive-list" style="min-height:120px;max-height:420px;overflow-y:auto">
      <div style="text-align:center;padding:40px;color:var(--muted)">
        <i class="ti ti-loader" style="font-size:24px"></i>
        <div style="margin-top:8px;font-size:13px">Loading archive…</div>
      </div>
    </div>`);
  // Load archive from sheet
  if (!STATE.sheetConnected) {
    document.getElementById('sticky-archive-list').innerHTML =
      '<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px">Not connected to sheet</div>';
    return;
  }
  sheetGetAll(CONFIG.SHEETS.stickyArchive).then(rows => {
    STATE._stickyArchiveRows = rows.map(r => ({
      id:         r['ID']||'',
      text:       r['Text']||'',
      colorIdx:   Number(r['ColorIdx'])||0,
      tags:       parseTagList(r['Tags']),
      date:       r['Date']||'',
      done:       r['Done']==='TRUE'||r['Done']===true,
      doneAt:     r['DoneAt']||'',
      archivedAt: r['ArchivedAt']||'',
      archivedBy: r['ArchivedBy']||'',
    })).filter(r=>r.id).sort((a,b)=>b.archivedAt.localeCompare(a.archivedAt));
    _renderStickyArchiveList();
  }).catch(e => {
    document.getElementById('sticky-archive-list').innerHTML =
      `<div style="text-align:center;padding:40px;color:var(--red);font-size:13px">Failed to load: ${e.message}</div>`;
  });
}

function _renderStickyArchiveList() {
  const list = document.getElementById('sticky-archive-list');
  if (!list) return;
  const rows = STATE._stickyArchiveRows || [];
  const q    = (document.getElementById('sticky-archive-search')?.value||'').toLowerCase();
  const filtered = q ? rows.filter(r =>
    r.text.toLowerCase().includes(q) ||
    r.tags.some(t => t.toLowerCase().includes(q))
  ) : rows;

  if (filtered.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px">${q?'No results':'Archive is empty'}</div>`;
    return;
  }

  list.innerHTML = filtered.map(r => {
    const tagsHTML = r.tags.length
      ? `<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:3px">${r.tags.map(t=>`<span style="font-size:10px;padding:1px 6px;border-radius:20px;background:var(--glass2);color:var(--text2);border:1px solid var(--border)">#${t}</span>`).join('')}</div>`
      : '';
    const _rawArchived  = r.archivedAt ? (r.archivedAt.includes('T') ? r.archivedAt.replace('T',' ').split('.')[0] : r.archivedAt) : '';
    const _archParts   = _rawArchived ? _rawArchived.split(' ') : [];
    const archivedText = _rawArchived ? `Archived ${_archParts[0]}${_archParts[1] ? ' ' + fmtTime(_archParts[1]) : ''}` : '';
    const dateText     = r.date ? `Date: ${r.date}` : '';
    return `<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:var(--text);line-height:1.4;${r.done?'text-decoration:line-through;opacity:0.7':''}">${r.text}</div>
        ${tagsHTML}
        <div style="font-size:10px;color:var(--muted);margin-top:3px">${[archivedText, dateText].filter(Boolean).join(' · ')}</div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;margin-top:2px">
        <button class="btn-ghost" style="font-size:11px;height:28px;padding:0 8px"
          onclick="_restoreStickyFromArchive('${r.id}',this)" title="Restore note">
          <i class="ti ti-arrow-back-up" style="font-size:12px;margin-right:2px"></i>Restore
        </button>
        <button class="btn-ghost" style="font-size:11px;height:28px;padding:0 8px;color:var(--red)"
          onclick="_deleteStickyFromArchive('${r.id}',this)" title="Delete permanently">
          <i class="ti ti-trash" style="font-size:12px"></i>
        </button>
      </div>
    </div>`;
  }).join('');
}

async function _restoreStickyFromArchive(id, btnEl) {
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Restoring…'; }
  const row = (STATE._stickyArchiveRows||[]).find(r => r.id === id);
  if (!row) return;
  try {
    // Restore to stickies sheet
    await sheetUpsert(CONFIG.SHEETS.stickies, {
      'ID': row.id, 'Text': row.text, 'ColorIdx': row.colorIdx,
      'X': 20, 'Y': 120, 'Float': 'FALSE', 'Pinned': 'FALSE',
      'Tags': row.tags.join('|'), 'Date': row.date||'', 'Time': '',
      'Done': 'FALSE', 'DoneAt': '',
    });
    // Delete from archive sheet
    await sheetDelete(CONFIG.SHEETS.stickyArchive, id);
    // Update local state
    STATE._stickyArchiveRows = (STATE._stickyArchiveRows||[]).filter(r => r.id !== id);
    STATE.stickies.push({
      id: row.id, text: row.text, colorIdx: row.colorIdx,
      x: 20, y: 120, float: false, pinned: false,
      tags: row.tags, date: row.date||'', time: '',
      done: false, doneAt: '',
    });
    _renderStickyArchiveList();
    renderReminders(); renderStickyLayer(); renderOverview();
    toast('Note restored', 'info');
  } catch(e) {
    toast(`Restore failed: ${e.message||'error'}`, 'error');
    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = '<i class="ti ti-arrow-back-up" style="font-size:12px;margin-right:2px"></i>Restore'; }
  }
}

async function _deleteStickyFromArchive(id, btnEl) {
  if (btnEl) { btnEl.disabled = true; }
  try {
    await sheetDelete(CONFIG.SHEETS.stickyArchive, id);
    STATE._stickyArchiveRows = (STATE._stickyArchiveRows||[]).filter(r => r.id !== id);
    _renderStickyArchiveList();
    toast('Note permanently deleted', 'info');
  } catch(e) {
    toast(`Delete failed: ${e.message||'error'}`, 'error');
    if (btnEl) { btnEl.disabled = false; }
  }
}

async function archiveAllDoneStickies() {
  const doneNotes = STATE.stickies.filter(s => s.done);
  if (doneNotes.length === 0) return;
  if (STATE._stickyArchiving) {
    openModal(`
      <div style="padding:4px 0 12px">
        <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:10px">Archive in Progress</div>
        <div style="font-size:14px;color:var(--text2);line-height:1.6">An archive operation is already running. Please wait for it to complete before starting another.</div>
      </div>
      <div class="modal-actions">
        <button class="btn-primary" onclick="clearNav()">OK</button>
      </div>`);
    return;
  }
  window._pendingArchiveAllCount = doneNotes.length;
  openModal(`
    <div style="padding:4px 0 12px">
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:10px">Archive All Done Notes</div>
      <div style="font-size:14px;color:var(--text2);line-height:1.6">${doneNotes.length} done note${doneNotes.length>1?'s':''} will be moved to the archive.</div>
    </div>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="clearNav()">Cancel</button>
      <button id="_stickyArchiveAllBtn" style="background:rgba(251,191,36,0.12);color:var(--yellow);border:1px solid rgba(251,191,36,0.35);height:36px;padding:0 16px;border-radius:10px;font-family:var(--font);font-size:14px;font-weight:600;cursor:pointer;"
        onclick="clearNav();_doArchiveAllDone()">Archive All</button>
    </div>`);
}

async function _doArchiveAllDone() {
  const doneNotes = STATE.stickies.filter(s => s.done);
  if (doneNotes.length === 0) return;
  STATE._stickyArchiving = true;
  toast('Archiving…', 'info');
  let succeeded = 0;
  try {
    for (const s of doneNotes) {
      try {
        await saveStickyArchiveItem(s);
        await deleteSticky(s.id);
        succeeded++;
      } catch(e) {
        console.error('Archive failed for', s.id, e);
      }
    }
    const archivedIds = new Set(doneNotes.slice(0, succeeded).map(s => s.id));
    STATE.stickies = STATE.stickies.filter(s => !archivedIds.has(s.id));
    renderStickyLayer(); renderReminders(); renderOverview();
    toast(`${succeeded} note${succeeded>1?'s':''} archived`, 'info');
  } finally {
    STATE._stickyArchiving = false;
  }
}

async function _doArchiveSticky(id) {
  const s = STATE.stickies.find(x=>x.id===id);
  if (!s) { toast('Note not found', 'error'); return; }
  STATE._stickyArchiving = true;
  toast('Archiving…', 'info');
  try {
    await saveStickyArchiveItem(s);
    await deleteSticky(id);
    STATE.stickies = STATE.stickies.filter(x=>x.id!==id);
    renderStickyLayer(); renderReminders(); renderOverview();
    toast('Note archived', 'info');
  } catch(e) {
    toast(`Archive failed: ${e.message||'unknown error'}`, 'error');
    console.error('Sticky archive error:', e);
  } finally {
    STATE._stickyArchiving = false;
  }
}

function toggleStickyDone(id, isDone) {
  const s = STATE.stickies.find(x=>x.id===id);
  if (!s) return;
  s.done = isDone;
  if (isDone) {
    const n = new Date();
    s.doneAt = n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0')
             +' '+String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');
  } else {
    s.doneAt = '';
  }
  saveSticky(s).catch(()=>{});
  renderReminders(); renderOverview();
}

// ═══════════════════════════════════════════════════════════
// NOTE MODALS — Add/edit stickies with Pin + Float checkboxes
// DIRECTORY MODALS — Folders, Contacts, Locations CRUD
// ═══════════════════════════════════════════════════════════
function openDirModal(type, itemId) {
  const list = type==='folder' ? STATE.folders : type==='contact' ? STATE.contacts : STATE.locations;
  const item = itemId ? list.find(x=>x.id===itemId) : null;
  let formHTML = '';
  if (type === 'folder') {
    formHTML = `
      <div class="form-group"><label class="form-label">Name *</label><input class="form-input" id="df-name" value="${item?.name||''}" placeholder="File or folder name"></div>
      <div class="form-group"><label class="form-label">URL Link</label><input class="form-input" id="df-url" value="${item?.url||''}" placeholder="https://…"></div>
      <div class="form-group"><label class="form-label">Description</label><input class="form-input" id="df-desc" value="${item?.desc||''}" placeholder="What's inside"></div>
      <div class="form-group"><label class="form-label">Tags <span style="font-size:10px;color:var(--muted);font-weight:400">space or enter to add</span></label>
        <input class="form-input" id="df-tags" value="${(item?.tags||[]).map(t=>'#'+t).join(' ')}" placeholder="#finance #hr #2026"></div>`;
  } else if (type === 'contact') {
    formHTML = `
      <div class="form-group"><label class="form-label">Full Name *</label><input class="form-input" id="df-name" value="${item?.name||''}" placeholder="Full name"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Position</label><input class="form-input" id="df-pos" value="${item?.position||''}" placeholder="Role or title"></div>
        <div class="form-group"><label class="form-label">Company</label><input class="form-input" id="df-company" value="${item?.company||''}" placeholder="Organization"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="df-phone" value="${item?.phone||''}" placeholder="+1-555-…"></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="df-email" value="${item?.email||''}" placeholder="email@…"></div>
      </div>
      <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="df-notes" placeholder="Context, availability, preferences…" style="min-height:60px">${item?.notes||''}</textarea></div>
      <div class="form-group"><label class="form-label">Tags <span style="font-size:10px;color:var(--muted);font-weight:400">space or enter to add</span></label>
        <input class="form-input" id="df-tags" value="${(item?.tags||[]).map(t=>'#'+t).join(' ')}" placeholder="#supplier #client #urgent"></div>`;
  } else {
    formHTML = `
      <div class="form-group"><label class="form-label">Location Name *</label><input class="form-input" id="df-name" value="${item?.name||''}" placeholder="Branch / Store name"></div>
      <div class="form-group"><label class="form-label">Address</label><input class="form-input" id="df-addr" value="${item?.address||''}" placeholder="Street, City, ZIP"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Company</label><input class="form-input" id="df-company" value="${item?.company||''}" placeholder="Operator or owner"></div>
        <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="df-phone" value="${item?.phone||''}" placeholder="+1-555-…"></div>
      </div>
      <div class="form-group"><label class="form-label">Maps URL</label><input class="form-input" id="df-map" value="${item?.mapUrl||''}" placeholder="https://maps.google.com/…"></div>
      <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="df-notes" placeholder="Hours, parking, access notes…" style="min-height:60px">${item?.notes||''}</textarea></div>
      <div class="form-group"><label class="form-label">Tags <span style="font-size:10px;color:var(--muted);font-weight:400">space or enter to add</span></label>
        <input class="form-input" id="df-tags" value="${(item?.tags||[]).map(t=>'#'+t).join(' ')}" placeholder="#branch #manila #warehouse"></div>`;
  }
  openModal(`
    <div class="modal-title">
      ${item?'Edit':'Add'} ${type.charAt(0).toUpperCase()+type.slice(1)}
      ${_modalCloseBtn()}
    </div>
    ${formHTML}
    <div class="modal-actions">
      <button class="btn-ghost" onclick="clearNav()">Cancel</button>
      <button class="btn-primary" onclick="saveDirModal('${type}','${itemId||''}')">Save</button>
    </div>`);
}

function saveDirModal(type, existingId) {
  const name = document.getElementById('df-name').value.trim();
  if (!name) { toast('Name is required','error'); return; }
  const _parseTags = v => (v||'').split(/[\s,]+/).map(t=>t.trim().replace(/^#/,'')).filter(Boolean);
  let data;
  if (type==='folder') {
    data = { id:existingId||uid('F'), name, url:document.getElementById('df-url').value.trim(), desc:document.getElementById('df-desc').value.trim(), tags:_parseTags(document.getElementById('df-tags').value) };
    if (existingId) STATE.folders = STATE.folders.map(x=>x.id===existingId?data:x); else STATE.folders.push(data);
    saveFolder(data).catch(()=>{});
  } else if (type==='contact') {
    data = { id:existingId||uid('C'), name, position:document.getElementById('df-pos').value.trim(), phone:document.getElementById('df-phone').value.trim(), email:document.getElementById('df-email').value.trim(), company:document.getElementById('df-company').value.trim(), notes:document.getElementById('df-notes').value.trim(), tags:_parseTags(document.getElementById('df-tags').value) };
    if (existingId) STATE.contacts = STATE.contacts.map(x=>x.id===existingId?data:x); else STATE.contacts.push(data);
    saveContact(data).catch(()=>{});
  } else {
    data = { id:existingId||uid('L'), name, address:document.getElementById('df-addr').value.trim(), mapUrl:document.getElementById('df-map').value.trim(), notes:document.getElementById('df-notes').value.trim(), company:document.getElementById('df-company').value.trim(), phone:document.getElementById('df-phone').value.trim(), tags:_parseTags(document.getElementById('df-tags').value) };
    if (existingId) STATE.locations = STATE.locations.map(x=>x.id===existingId?data:x); else STATE.locations.push(data);
    saveLocation(data).catch(()=>{});
  }
  clearNav(); renderDirectories(); toast(existingId?'Updated':'Added');
}

function removeDirItem(type, id) {
  // P4-R026 (OD-33, discovery basis P4-D038): converged onto the shared
  // confirmAction() pattern. Directory Remove is only ever triggered from
  // the Directories list card (never from inside an open Add/Edit form),
  // so no unsaved form state can exist at this point — default Cancel
  // (no onCancel) is correct as-is, matching P4-D038 §8/§9's finding.
  const label =
    type === 'folder' ? 'folder' :
    type === 'contact' ? 'contact' :
    'location';
  confirmAction(
    `This ${label} will be permanently deleted. This cannot be undone.`,
    'Delete',
    () => {
      if (type==='folder')   { STATE.folders   = STATE.folders.filter(x=>x.id!==id);   deleteFolder(id).catch(()=>{}); }
      else if (type==='contact')  { STATE.contacts  = STATE.contacts.filter(x=>x.id!==id);  deleteContact(id).catch(()=>{}); }
      else                        { STATE.locations = STATE.locations.filter(x=>x.id!==id); deleteLocation(id).catch(()=>{}); }
      renderDirectories(); toast('Removed');
    }
  );
}

/* ============================================================
   8. DRAG-AND-DROP (Kanban)
   ============================================================ */
