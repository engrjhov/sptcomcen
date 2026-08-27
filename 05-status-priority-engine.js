// ============================================================
// 05-status-priority-engine.js
// Quick status/priority change, approval engine, category progress strip
// (lines 3377-4050 of the original inline <script>)
// ============================================================

// ── QUICK STATUS CHANGE ─────────────────────────────────────
function saveTagColor(tagName, hexColor) {
  TAG_CUSTOM[tagName.trim().toLowerCase()] = hexColor;
  try { localStorage.setItem('jhov_tag_colors', JSON.stringify(TAG_CUSTOM)); } catch(e) {}
}
function tagColor(tagName) {
  if (!tagName) return { bg:'rgba(40,92,112,0.2)', text:'#4F9AB5', border:'rgba(79,154,181,0.35)' };
  const key = tagName.trim().toLowerCase();
  // Catalog color takes precedence when present and valid (P4-R028) — `active` is not considered here
  const catalogEntry = _getTagCatalogEntry(tagName);
  const catalogColor = catalogEntry ? _normalizeTagCatalogColor(catalogEntry.color) : null;
  if (catalogColor) {
    const isDark = isDarkTheme();
    const alpha = isDark ? '22' : '18';
    return { bg: catalogColor + alpha, text: catalogColor, border: catalogColor + '55' };
  }
  // User-defined color takes priority
  if (TAG_CUSTOM[key]) {
    const c = TAG_CUSTOM[key];
    const isDark = isDarkTheme();
    const alpha = isDark ? '22' : '18';
    return { bg: c + alpha, text: c, border: c + '55' };
  }
  const isDark = isDarkTheme();
  const palette = isDark ? TAG_PALETTE_DARK : TAG_PALETTE_LIGHT;
  let h = 0;
  for (let i = 0; i < tagName.length; i++) h = (h * 31 + tagName.charCodeAt(i)) & 0x7fffffff;
  const c = palette[h % palette.length];
  const alpha = isDark ? '22' : '18';
  return { bg: c + alpha, text: c, border: c + '55' };
}

// ── IDEAL/TEMPORARY APPROVAL & STATUS ENGINE ────────────────────────────────
const WORKFLOW_DEFINITIONS = {
  ideal: [
    { stepOrder:'1', subtask:'Product List', queue:'Product List' },
    { stepOrder:'2', subtask:'SPS Submitted', queue:'For SPS Planogram' },
    { stepOrder:'3', subtask:'LTM Approved', queue:'For LTM Approval' },
    { stepOrder:'4', subtask:'PMT Approved', queue:'For PMT Approval' },
    { stepOrder:'5', subtask:'JAG Approved', queue:'For JAG Approval' },
    { stepOrder:'6', subtask:'PLG Approved', queue:'For PLG Approval' },
    { stepOrder:'7', subtask:'GDrive Uploaded', queue:'For GDrive Upload' },
  ],
  temporary: [
    { stepOrder:'1', subtask:'Product List', queue:'Product List' },
    { stepOrder:'2', subtask:'SPS Submitted', queue:'For SPS Planogram' },
    { stepOrder:'3', subtask:'LTM Approved', queue:'For LTM Approval' },
    { stepOrder:'4', subtask:'PLG Approved', queue:'For PLG Approval' },
    { stepOrder:'5', subtask:'GDrive Uploaded', queue:'For GDrive Upload' },
  ],
};
const IDEAL_STEPS = WORKFLOW_DEFINITIONS.ideal.map(s => s.stepOrder);
const TEMP_STEPS  = WORKFLOW_DEFINITIONS.temporary.map(s => s.stepOrder);
function _workflowDefinition(type) { return WORKFLOW_DEFINITIONS[type] || []; }
function _workflowSubtasksForCategory(type, subtasks) {
  const source = Array.isArray(subtasks) ? subtasks : [];
  return _workflowDefinition(type).map(step => source.find(s => String(s.stepOrder) === step.stepOrder) || {text:step.subtask,stepOrder:step.stepOrder,required:true,done:false,doneAt:null,checkedBy:null});
}
function _workflowAllAssignments(item, assignmentsOverride) { if (Array.isArray(assignmentsOverride)) return assignmentsOverride.filter(a=>a&&a.category); return (STATE.assignments||[]).filter(a=>a.teeId===item.id); }
function _workflowCategoryStepDone(a, stepOrder, type) { return !!_workflowSubtasksForCategory(type,a?.subtasks).find(s=>s.stepOrder===String(stepOrder))?.done; }
function _workflowProgressFromAssignments(item, assignmentsOverride) {
  const type=item?.type, defs=_workflowDefinition(type);
  if(!defs.length) return {state:'',column:parseStatus(item?.status).state||'Backlog',forReview:false,progress:0,done:false};
  const assignments=_workflowAllAssignments(item,assignmentsOverride);
  const categories=assignments.length?assignments:[{category:'__record__',subtasks:item?.subtasks||[]}];
  const allStepDone=step=>categories.every(a=>_workflowCategoryStepDone(a,step,type));
  const anyStepDone=step=>categories.some(a=>_workflowCategoryStepDone(a,step,type));
  const anyProductList=anyStepDone('1'), allProductList=allStepDone('1'), allGDrive=allStepDone(defs[defs.length-1].stepOrder);
  let state;
  if(allGDrive) state='Done'; else if(!anyProductList) state='Product List'; else if(!allProductList) state='For SPS Planogram'; else { const next=defs.slice(1).find(step=>!allStepDone(step.stepOrder)); state=next?next.queue:'For GDrive Upload'; }
  let doneSteps=0; categories.forEach(a=>defs.forEach(step=>{if(_workflowCategoryStepDone(a,step.stepOrder,type))doneSteps++;}));
  const today=fmtDate(new Date());
  const productListOverdue=!!item?.productListDeadline&&item.productListDeadline<today&&!allProductList;
  const planogramOverdue=!!item?.planogramDeadline&&item.planogramDeadline<today&&!allGDrive;
  return {state,column:allGDrive?'Completed':(!anyProductList?'Backlog':(!allProductList?'To Do':'In Progress')),forReview:!allGDrive&&(productListOverdue||planogramOverdue),progress:categories.length&&defs.length?Math.round(doneSteps/(categories.length*defs.length)*100):0,done:allGDrive,anyProductList,allProductList,allGDrive,productListOverdue,planogramOverdue};
}
function computeApprovalStage(item){ if(item.type!=='ideal'&&item.type!=='temporary')return ''; return _workflowProgressFromAssignments(item).state; }
function computeCompletedDate(item,assignmentsOverride){
  if(item.type==='ideal'||item.type==='temporary'){const assignments=_workflowAllAssignments(item,assignmentsOverride);if(!assignments.length)return '';const finalStep=_workflowDefinition(item.type).at(-1).stepOrder;if(!assignments.every(a=>_workflowCategoryStepDone(a,finalStep,item.type)))return '';return assignments.flatMap(a=>_workflowSubtasksForCategory(item.type,a.subtasks)).reduce((max,s)=>(s.doneAt&&s.doneAt>max)?s.doneAt:max,'');}
  const subs=(item.subtasks||[]).filter(s=>s.required!==false);if(!subs.length||subs.some(s=>!s.done))return '';return subs.reduce((max,s)=>(s.doneAt&&s.doneAt>max)?s.doneAt:max,'');
}
function recalcIdealTemporaryStatus(item,assignmentsOverride){if(item.type!=='ideal'&&item.type!=='temporary')return;const workflow=_workflowProgressFromAssignments(item,assignmentsOverride);item.approvalStage=workflow.state;item.status=workflow.column;item.completedDate=computeCompletedDate(item,assignmentsOverride);item.progress=workflow.progress;}
function buildSubtasksFromTemplate(type){return _workflowDefinition(type).map(step=>({text:step.subtask,stepOrder:step.stepOrder,parentStep:'',required:true,done:false,doneAt:null,checkedBy:null}));}
function aggregateWorkflowSubtasks(type, assignments) {
  const rows = Array.isArray(assignments) ? assignments : [];
  return _workflowDefinition(type).map(step => {
    const done = rows.length > 0 && rows.every(a => _workflowCategoryStepDone(a, step.stepOrder, type));
    const matching = rows.flatMap(a => _workflowSubtasksForCategory(type, a.subtasks)).filter(s => s.stepOrder === step.stepOrder && s.doneAt);
    const doneAt = done ? matching.reduce((max,s)=>(s.doneAt&&s.doneAt>max)?s.doneAt:max,'') : null;
    return { text:step.subtask, stepOrder:step.stepOrder, parentStep:'', required:true, done, doneAt, checkedBy:null };
  });
}

// Progress/stage for one category assignment. Normalizes through
// _workflowSubtasksForCategory when itemType is known, so an assignment
// saved before a workflow step existed (or with an empty subtasks array)
// still reports the full step count with the missing ones as not-done,
// instead of silently showing 0/0. Falls back to the raw array when no
// itemType is available (the Assign section's in-progress rows are always
// already-normalized from buildSubtasksFromTemplate, so this path is safe
// there).
function computeAssignmentProgress(a, itemType) {
  const subs = itemType
    ? _workflowSubtasksForCategory(itemType, a?.subtasks)
    : (a?.subtasks || []).filter(s => s.required !== false);
  const done = subs.filter(s => s.done).length;
  return { done, total: subs.length, pct: subs.length ? Math.round(done/subs.length*100) : 0 };
}
function computeAssignmentStage(a, itemType) {
  const subs = itemType ? _workflowSubtasksForCategory(itemType, a?.subtasks) : (a?.subtasks || []);
  const next = subs.find(s => !s.done);
  return next ? next.text : (subs.length ? 'Done' : '—');
}

// ── Per-category progress strip ─────────────────────────────────────────
// One mini-bar per category assignment, each filled to that category's own
// completion %, so the breakdown "which categories are stuck, which are
// done" is visible directly on a card — no click-through needed. Used on
// Kanban cards, Today cards, Schedule cards, and the Dashboard's
// Categories Progress cards, so it only needs to be built/styled once.
function _categoryProgressStripHTML(item, opts={}) {
  if (item.type !== 'ideal' && item.type !== 'temporary') return '';
  const rows = (STATE.assignments || []).filter(a => a.teeId === item.id);
  if (!rows.length) return '';

  const sortOrder = code => STATE.categories.find(c => c.code === code)?.sortOrder ?? 999;
  const segs = rows
    .slice()
    .sort((a,b) => sortOrder(a.category) - sortOrder(b.category))
    .map(a => {
      const progress = computeAssignmentProgress(a, item.type);
      const stage = computeAssignmentStage(a, item.type);
      const color = progress.pct >= 100 ? 'var(--green)' : progress.pct > 0 ? 'var(--accent)' : 'var(--border2)';
      const title = `${a.category} — ${a.assignedTo || 'Unassigned'} — ${progress.done}/${progress.total} (${progress.pct}%) — ${stage}`;
      return `<div class="cat-prog-seg" title="${_escapeTEEAttr(title)}"><div class="cat-prog-seg-fill" style="width:${progress.pct}%;background:${color}"></div></div>`;
    }).join('');

  const overall = _workflowProgressFromAssignments(item).progress;
  // clickable:false is used inside the TEE edit modal's own Assign section
  // preview — that modal has no true stacking, so opening the drill-down
  // there would silently discard any unsaved edits in the form.
  const clickable = opts.clickable !== false;
  const clickAttr = clickable ? ` onclick="event.stopPropagation();openCategoryProgressDetail('${item.id}')"` : '';
  return `<div class="cat-prog-strip${clickable ? '' : ' cat-prog-strip-static'}"${clickAttr} title="${rows.length} categor${rows.length===1?'y':'ies'} · ${overall}% overall">
    <div class="cat-prog-segs">${segs}</div>
    <span class="cat-prog-overall">${overall}%</span>
  </div>`;
}

// Shared subtask-row reader — used by switchTEEType's carry capture, saveTEEModal,
// and _captureTEEModalState. Reads stepOrder/parentStep/required alongside
// text/done/doneAt so Ideal/Temporary records survive a type-switch or save
// without losing the fields computeApprovalStage() depends on.
function _readSubtaskRowsFromDOM(listEl) {
  if (!listEl) return null;
  return Array.from(listEl.querySelectorAll('.subtask-row')).map((row, idx) => {
    const done   = row.querySelector('.subtask-check')?.classList.contains('checked') || false;
    const doneAt = row.querySelector(`#tee-st-donat-${idx}`)?.value || null;
    const stepOrder   = row.querySelector(`#tee-st-step-${idx}`)?.value || '';
    const parentStep  = row.querySelector(`#tee-st-parent-${idx}`)?.value || '';
    const requiredRaw = row.querySelector(`#tee-st-required-${idx}`)?.value;
    const out = {
      text: (row.querySelector(`#tee-st-text-${idx}`)?.value || '').trim(),
      done,
      doneAt: done ? (doneAt || (() => {
        const n = new Date();
        return fmtDate(n) + ' ' + String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
      })()) : null,
    };
    if (stepOrder)  out.stepOrder = stepOrder;
    if (parentStep) out.parentStep = parentStep;
    if (requiredRaw !== undefined) out.required = requiredRaw !== 'false';
    return out;
  }).filter(s => s.text);
}

function _teeAssignRowHTML(a, idx) {
  const catOptions = STATE.categories.map(c => `<option value="${c.code}">${c.code} — ${c.name}</option>`).join('');
  return `
    <div class="form-row tee-assign-row" data-idx="${idx}" style="align-items:flex-end">
      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-select tee-assign-cat" onchange="_teeAssignCatChange(this)">
          <option value="">— Select —</option>${catOptions}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Assignee</label>
        <input class="form-input tee-assign-person" value="${a.assignedTo||''}" placeholder="Auto-fills from category">
      </div>
      <div class="form-group" style="flex:0 0 auto">
        <label class="form-label">&nbsp;</label>
        <label style="display:flex;align-items:center;gap:6px;height:36px;font-size:12px">
          <input type="checkbox" class="tee-assign-confirm" ${a.confirmed?'checked':''}> Confirmed
        </label>
      </div>
      <button type="button" class="btn-ghost" style="height:36px" onclick="this.closest('.tee-assign-row').remove()">✕</button>
    </div>`;
}
function _teeAssignCatChange(selectEl) {
  const cat  = STATE.categories.find(c => c.code === selectEl.value);
  const personInput = selectEl.closest('.tee-assign-row')?.querySelector('.tee-assign-person');
  if (personInput && cat && !personInput.value) personInput.value = cat.defaultAssignee;
}

let _teeStoreSearchTimer = null;

function _teeEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function _teeFolderLinkHTML(label, url) {
  if (!url) {
    return `<span class="tee-store-folder-link is-empty"><i class="ti ti-link-off"></i>${label} unavailable</span>`;
  }
  return `<a class="tee-store-folder-link" href="${_teeEscapeHtml(url)}"
      target="_blank" rel="noopener noreferrer">
      <i class="ti ti-external-link"></i>${label}
    </a>`;
}

// Backup/Branch Folder inputs are editable directly (not just store-derived)
// — this live-updates the "Open Folder" link under the input as the user
// types or pastes, without waiting for save.
function _teeFolderInputChange(which, url) {
  const linkEl = document.getElementById(`tee-${which}-folder-link`);
  const label = which === 'backup' ? 'Open Backup Folder' : 'Open Branch Folder';
  if (linkEl) linkEl.innerHTML = _teeFolderLinkHTML(label, url.trim());
}

function _teeStoreSearch(query) {
  clearTimeout(_teeStoreSearchTimer);
  const resultsEl = document.getElementById('tee-store-results');
  if (!resultsEl) return;

  if (!query || query.trim().length < 2) {
    resultsEl.innerHTML = '';
    if (!query) {
      ['tee-store-code','tee-store-name','tee-backup-folder','tee-branch-folder']
        .forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
      const b=document.getElementById('tee-backup-folder-link');
      const br=document.getElementById('tee-branch-folder-link');
      if (b) b.innerHTML = _teeFolderLinkHTML('Open Backup Folder','');
      if (br) br.innerHTML = _teeFolderLinkHTML('Open Branch Folder','');
    }
    return;
  }

  _teeStoreSearchTimer = setTimeout(() => {
    const q = query.trim().toLowerCase();
    const matches = (STATE.stores || [])
      .filter(s => s.active && (
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
      ))
      .slice(0, 10);

    resultsEl.innerHTML = matches.length
      ? `<div class="tee-store-results-panel">
          ${matches.map((store, i) => `
            <button type="button" class="tee-store-result"
              onmousedown="event.preventDefault();_teeStorePick(${i})">
              <strong>${_teeEscapeHtml(store.code)}</strong>
              <span>${_teeEscapeHtml(store.name)}</span>
            </button>`).join('')}
         </div>`
      : `<div class="tee-store-no-results">No matching active stores</div>`;

    // Keep the exact matched objects out of inline onclick attributes.
    window._teeStoreSearchResults = matches;
  }, 180);
}

function _teeStorePick(index) {
  const store = window._teeStoreSearchResults?.[index];
  if (!store) return;

  const codeEl = document.getElementById('tee-store-code');
  const nameEl = document.getElementById('tee-store-name');
  const searchEl = document.getElementById('tee-store-search');
  const backupEl = document.getElementById('tee-backup-folder');
  const branchEl = document.getElementById('tee-branch-folder');

  if (codeEl) codeEl.value = store.code;
  if (nameEl) nameEl.value = store.name;
  if (searchEl) searchEl.value = `${store.code} — ${store.name}`;
  if (backupEl) backupEl.value = store.backupFolder || '';
  if (branchEl) branchEl.value = store.branchFolder || '';

  const backupLink = document.getElementById('tee-backup-folder-link');
  const branchLink = document.getElementById('tee-branch-folder-link');
  if (backupLink) backupLink.innerHTML = _teeFolderLinkHTML('Open Backup Folder', store.backupFolder);
  if (branchLink) branchLink.innerHTML = _teeFolderLinkHTML('Open Branch Folder', store.branchFolder);

  const resultsEl = document.getElementById('tee-store-results');
  if (resultsEl) resultsEl.innerHTML = '';
  window._teeStoreSearchResults = [];
}

// PDF upload contract:
// The existing frontend API is a generic Sheets endpoint. This calls a dedicated
// `uploadModuleAllocation` action that the Apps Script/API endpoint must implement.
// The response may return {url,fileId} directly or inside {data:{url,fileId}}.
async function _teeUploadModuleAllocation(file) {
  if (!file) return;
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
    toast('Module Allocation must be a PDF file.', 'error');
    return;
  }

  const statusEl = document.getElementById('tee-module-upload-status');
  const fileInput = document.getElementById('tee-module-file');
  const maxBytes = 15 * 1024 * 1024;

  if (file.size > maxBytes) {
    toast('PDF is too large. Maximum size is 15 MB.', 'error');
    if (fileInput) fileInput.value = '';
    return;
  }

  if (!hasAPI()) {
    toast('Connect the Google Sheets/API endpoint before uploading.', 'error');
    return;
  }

  try {
    window._teeModuleUploading = true;
    if (statusEl) statusEl.innerHTML = '<i class="ti ti-loader-2"></i> Uploading PDF…';

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
      reader.readAsDataURL(file);
    });

    const res = await fetch(API, {
      method: 'POST',
      headers: {'Content-Type':'text/plain'},
      body: JSON.stringify({
        action: 'uploadModuleAllocation',
        file: {
          name: file.name,
          mimeType: 'application/pdf',
          base64
        }
      })
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Upload failed');

    const data = json.data || json;
    const url = data.url || data.webViewLink || data.fileUrl || '';
    const fileId = data.fileId || data.id || '';

    if (!url) throw new Error('Upload succeeded but no Google Drive URL was returned.');

    const urlEl = document.getElementById('tee-module-url-fallback');
    const idEl = document.getElementById('tee-module-file-id');
    if (urlEl) urlEl.value = url;
    if (idEl) idEl.value = fileId;

    if (statusEl) {
      statusEl.innerHTML =
        `<span class="tee-upload-success"><i class="ti ti-check"></i> ${_teeEscapeHtml(file.name)} uploaded</span>`;
    }

    toast('Module Allocation uploaded', 'success');
  } catch (err) {
    console.error('Module Allocation upload failed:', err);
    if (statusEl) statusEl.innerHTML =
      `<span class="tee-upload-error"><i class="ti ti-alert-circle"></i> ${_teeEscapeHtml(err.message || 'Upload failed')}</span>`;
    toast(err.message || 'Module Allocation upload failed', 'error');
    if (fileInput) fileInput.value = '';
  } finally {
    window._teeModuleUploading = false;
  }
}

// ── STATUS SYSTEM HELPERS ─────────────────────────────────────────────────────
// parseStatus: pure string parser — splits on | to get state and optional timestamp
// Used on ALL read and write paths for all item types
function parseStatus(raw) {
  if (!raw || !raw.trim()) return { state: null, doneAt: null };
  const parts = raw.split('|');
  return {
    state:  parts[0].trim() || null,
    doneAt: parts[1] ? parts[1].trim() : null
  };
}

// getDisplayStatus: returns display state with type-appropriate fallback for null
// Task null → 'Backlog'  |  Event/Entry null → 'Open'
function getDisplayStatus(item) {
  const { state } = parseStatus(item.status);
  if (item.type === 'ideal' || item.type === 'temporary') {
    const workflow = _workflowProgressFromAssignments(item);
    return workflow.forReview ? 'For Review' : workflow.state;
  }
  // Tasks — use state directly with Backlog fallback
  if (item.type === 'task') return state || 'Backlog';
  // Events/Entries — check date for display-layer resolution
  // If explicitly set (Open or Done) — use that
  if (state === 'Done') return 'Done';
  if (state === 'Open') return 'Open';
  // Blank/null + date in the past → display as Done (no timestamp)
  // This is display-only — never written to sheet
  const itemDate = item.date || item.dueDate;
  if (!state && itemDate) {
    const todayD = fmtDate(new Date());
    if (itemDate < todayD) return 'Done';
  }
  return 'Open'; // default for Events/Entries
}

// isEffectivelyDone: true if item belongs in the Done section
// Task: Completed  |  Event/Entry: Done
// Starting/InProgress tasks and unmarked Events/Entries always return false
function isEffectivelyDone(item) {
  if (item.type === 'task') return parseStatus(item.status).state === 'Completed';
  // Events/Entries: use getDisplayStatus for display-layer resolution
  return getDisplayStatus(item) === 'Done';
}

// isCompletedToday: used specifically for Today tab Done section
// For Tasks: must be Completed AND doneAt must be today's date
// For Events/Entries: Done state is sufficient (they're already date-scoped to today)
function isCompletedToday(item, todayDateStr) {
  const { state, doneAt } = parseStatus(item.status);
  if (item.type === 'task') {
    if (state !== 'Completed') return false;
    // Must have been completed today — not a previously-completed task
    if (!doneAt) return false;
    return doneAt.split(' ')[0] === todayDateStr;
  }
  // Events/Entries: Done is enough — they're scoped to today by date filter
  return state === 'Done';
}


// Open tag color editor — called by clicking a tag with long-press or ctrl+click
function openTagColorEditor(tagName, anchorEl, event) {
  event.stopPropagation();
  var existing = document.getElementById('tag-color-editor');
  if (existing) { existing.remove(); return; }
  var isDark = isDarkTheme();
  var palD = ['#4F9AB5','#8B5CF6','#F59E0B','#10B981','#F472B6','#60A5FA','#34D399','#FB923C','#EF4444','#22D3EE'];
  var palL = ['#0E7490','#6D28D9','#B45309','#166534','#BE185D','#1D4ED8','#15803D','#C2410C','#DC2626','#0891B2'];
  var palette = isDark ? palD : palL;
  var current = TAG_CUSTOM[tagName.trim().toLowerCase()] || '';
  var rect = anchorEl.getBoundingClientRect();
  var editor = document.createElement('div');
  editor.id = 'tag-color-editor';
  var bg   = isDark ? '#252829' : '#FDFCFA';
  var bdr  = isDark ? 'rgba(79,154,181,0.3)' : 'rgba(13,148,136,0.25)';
  var lbl  = isDark ? '#8FA3AC' : '#6B5A48';
  var abtn = isDark ? '#4F9AB5' : '#0F766E';
  var abdr = isDark ? 'rgba(79,154,181,0.3)' : 'rgba(13,148,136,0.3)';
  editor.style.cssText = 'position:fixed;z-index:9999;background:' + bg +
    ';border:1px solid ' + bdr + ';border-radius:12px;padding:10px 12px;' +
    'box-shadow:0 8px 24px rgba(0,0,0,0.3);top:' + (rect.bottom + 6) + 'px;' +
    'left:' + rect.left + 'px;min-width:190px;';
  var swatches = palette.map(function(c) {
    var sel = (c === current) ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent';
    var tn = tagName.replace(/'/g, "\\'");
    var cc = c.replace(/'/g, "\\'");
    return '<div onclick="applyTagColor(\'' + tn + '\',\'' + cc + '\',this)" ' +
      'style="width:20px;height:20px;border-radius:50%;background:' + c + ';cursor:pointer;' +
      'border:' + sel + ';transition:transform .15s" ' +
      'onmouseover="this.style.transform=\'scale(1.2)\'" ' +
      'onmouseout="this.style.transform=\'scale(1)\'"></div>';
  }).join('');
  var tn2 = tagName.replace(/'/g, "\\'");
  editor.innerHTML =
    '<div style="font-size:10px;font-weight:700;color:' + lbl +
    ';margin-bottom:8px;letter-spacing:.06em;text-transform:uppercase">#' + tagName + ' color</div>' +
    '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">' + swatches + '</div>' +
    '<div style="display:flex;gap:6px;align-items:center">' +
      '<input type="color" id="tag-custom-color" value="' + (current || palette[0]) + '" ' +
        'style="width:28px;height:28px;border:none;border-radius:6px;cursor:pointer;padding:0">' +
      '<button onclick="applyTagColor(\'' + tn2 + '\',document.getElementById(\'tag-custom-color\').value,null)" ' +
        'style="flex:1;padding:4px 8px;border-radius:7px;border:1px solid ' + abdr +
        ';background:transparent;color:' + abtn + ';font-size:10px;font-weight:600;cursor:pointer">Apply</button>' +
      '<button onclick="resetTagColor(\'' + tn2 + '\')" ' +
        'style="padding:4px 8px;border-radius:7px;border:1px solid rgba(248,113,113,0.3);' +
        'background:transparent;color:#F87171;font-size:10px;font-weight:600;cursor:pointer">Reset</button>' +
    '</div>';
  document.body.appendChild(editor);
  setTimeout(function() {
    document.addEventListener('click', function() { editor.remove(); }, { once: true });
  }, 50);
}

function applyTagColor(tagName, color, swatchEl) {
  saveTagColor(tagName, color);
  if (swatchEl) {
    swatchEl.parentElement.querySelectorAll('div').forEach(d => d.style.border = '2px solid transparent');
    swatchEl.style.border = '2px solid rgba(255,255,255,0.8)';
  }
  renderAll();
  document.getElementById('tag-color-editor')?.remove();
}
function resetTagColor(tagName) {
  delete TAG_CUSTOM[tagName.trim().toLowerCase()];
  try { localStorage.setItem('jhov_tag_colors', JSON.stringify(TAG_CUSTOM)); } catch(e) {}
  renderAll();
  document.getElementById('tag-color-editor')?.remove();
}


function openStatusDropdown(taskId, anchorEl, event) {
  event.stopPropagation();
  const existing = document.getElementById('status-dropdown');
  if (existing) { existing.remove(); return; }
  const task = STATE.items.find(i => i.id === taskId);
  if (!task) return;
  const rect = anchorEl.getBoundingClientRect();
  const dropdown = document.createElement('div');
  dropdown.id = 'status-dropdown';
  dropdown.className = 'status-dropdown';
  const isTaskType = task.type === 'task';
  const optCols = isTaskType
    ? KANBAN_COLS
    : [
        { id:'Open', label:'Open', dark:'#7890A0', light:'#4B6878' },
        { id:'Done', label:'Done', dark:'#34D399', light:'#166534' },
      ];
  const currentState = getDisplayStatus(task);
  dropdown.innerHTML = optCols.map(col => {
    const dotColor = getStatusColor(col.id);
    const isCurrent = currentState === col.id;
    return `<button class="status-dropdown-item${isCurrent?' current':''}"
      onclick="changeItemStatus('${taskId}','${col.id}')">
      <span class="status-dot" style="background:${dotColor}"></span>
      ${col.label}
    </button>`;
  }).join('');
  document.body.appendChild(dropdown);
  const dRect = dropdown.getBoundingClientRect();
  let top  = rect.bottom + 6;
  let left = rect.left;
  if (left + dRect.width > window.innerWidth - 8)  left = window.innerWidth - dRect.width - 8;
  if (top  + dRect.height > window.innerHeight - 8) top  = rect.top - dRect.height - 6;
  dropdown.style.top  = `${top}px`;
  dropdown.style.left = `${left}px`;
  setTimeout(() => {
    document.addEventListener('click', function _close() {
      document.getElementById('status-dropdown')?.remove();
      document.removeEventListener('click', _close);
    });
  }, 0);
}

function changeItemStatus(taskId, newStatus) {
  document.getElementById('status-dropdown')?.remove();
  const task = STATE.items.find(i => i.id === taskId);
  if (!task) return;
  const currentState = getDisplayStatus(task);
  if (currentState === newStatus) return;

  // Build new status value with timestamp for completion states
  const now = new Date();
  const ts  = now.getFullYear() + '-' +
    String(now.getMonth()+1).padStart(2,'0') + '-' +
    String(now.getDate()).padStart(2,'0') + ' ' +
    String(now.getHours()).padStart(2,'0') + ':' +
    String(now.getMinutes()).padStart(2,'0');

  if (task.type === 'task') {
    // Tasks: add timestamp only for Completed
    task.status = newStatus === 'Completed' ? `Completed|${ts}` : newStatus;
  } else {
    // Events/Entries: add timestamp for Done, plain text for Open
    task.status = newStatus === 'Done' ? `Done|${ts}` : newStatus;
  }

  saveTEE(task).catch(() => toast('Save failed', 'error'));

  // Update any open status button in place
  const _newDot = getStatusColor(newStatus);
  document.querySelectorAll(`#detail-status-btn-${taskId}, [onclick*="openStatusDropdown('${taskId}'"]`).forEach(btn => {
    btn.textContent    = newStatus;
    btn.style.background  = `${_newDot}22`;
    btn.style.color       = _newDot;
    btn.style.borderColor = `${_newDot}44`;
  });

  renderAll();
  // P4-R016c: refresh Person Detail in place if it's currently open — see
  // _pdmRefreshIfOpen above. Status chips in Person Detail remain
  // display-only in this checkpoint; this hook is wired now so P4-R016d
  // (Status chip parity) needs no further changes here.
  _pdmRefreshIfOpen();
  toast(`Status → ${newStatus}`, 'success');
}
// Keep old name as alias for any remaining references
const changeTaskStatus = changeItemStatus;

// ── QUICK PRIORITY CHANGE ────────────────────────────────────
function openPriorityDropdown(itemId, anchorEl, event) {
  event.stopPropagation();
  const existing = document.getElementById('priority-dropdown');
  if (existing) { existing.remove(); return; }
  const item = STATE.items.find(i => i.id === itemId);
  if (!item) return;
  const rect = anchorEl.getBoundingClientRect();
  const dropdown = document.createElement('div');
  dropdown.id = 'priority-dropdown';
  dropdown.className = 'status-dropdown';
  const priorities = ['Critical', 'High', 'Medium', 'Low'];
  dropdown.innerHTML = priorities.map(p => {
    const pr = getPri(p);
    const isCurrent = item.priority === p;
    return `<button class="status-dropdown-item${isCurrent?' current':''}"
      onclick="changeItemPriority('${itemId}','${p}')">
      <span class="status-dot" style="background:${pr.bar}"></span>
      ${p}
    </button>`;
  }).join('');
  document.body.appendChild(dropdown);
  const dRect = dropdown.getBoundingClientRect();
  let top  = rect.bottom + 6;
  let left = rect.left;
  if (left + dRect.width > window.innerWidth - 8)  left = window.innerWidth - dRect.width - 8;
  if (top  + dRect.height > window.innerHeight - 8) top  = rect.top - dRect.height - 6;
  dropdown.style.top  = `${top}px`;
  dropdown.style.left = `${left}px`;
  setTimeout(() => {
    document.addEventListener('click', function _close() {
      document.getElementById('priority-dropdown')?.remove();
      document.removeEventListener('click', _close);
    });
  }, 0);
}

function changeItemPriority(itemId, newPriority) {
  document.getElementById('priority-dropdown')?.remove();
  const item = STATE.items.find(i => i.id === itemId);
  if (!item || item.priority === newPriority) return;
  item.priority = newPriority;
  saveTEE(item).catch(() => toast('Save failed', 'error'));

  // Update priority badges in the open detail modal in place — no close/reopen needed
  const pr = getPri(newPriority);
  document.querySelectorAll(`[onclick*="openPriorityDropdown('${itemId}'"]`).forEach(btn => {
    btn.textContent = newPriority;
    btn.style.background    = pr.bg;
    btn.style.color         = pr.text;
    btn.style.borderColor   = `${pr.bar}44`;
  });

  renderAll();
  // P4-R016c (discovery basis P4-D028): refresh Person Detail in place if
  // it's currently open — see _pdmRefreshIfOpen above. Lets the newly
  // clickable Person Detail Priority chip re-sort/refresh immediately.
  _pdmRefreshIfOpen();
  toast(`Priority set to ${newPriority}`, 'success');
}

