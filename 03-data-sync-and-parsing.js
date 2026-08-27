// ============================================================
// 03-data-sync-and-parsing.js
// Sheet API, parsing, directories/tags config, sync engine
// (lines 1741-2632 of the original inline <script>)
// ============================================================

const API = CONFIG.SHEET_URL;
const hasAPI = () => API && !API.includes('YOUR_');

async function sheetGetAll(sheetName) {
  const url = `${API}?action=getAll&sheet=${encodeURIComponent(sheetName)}`;
  const res  = await fetch(url);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Fetch failed');
  return json.data || [];
}
async function sheetUpsert(sheetName, data) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action:'upsert', sheet:sheetName, data }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Upsert failed');
  return json;
}
async function sheetDelete(sheetName, id) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action:'delete', sheet:sheetName, id }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Delete failed');
  return json;
}

/* ─── UNIFIED TEE (Tasks / Events / Entries) ─── */

// Safely convert whatever Google Sheets returns for a date column into YYYY-MM-DD string
function parseSheetDate(val) {
  if (!val) return '';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  if (typeof val === 'string' && val.startsWith('Date(')) {
    const ms = parseInt(val.replace('Date(','').replace(')',''), 10);
    if (!isNaN(ms)) return fmtDate(new Date(ms));
  }
  if (val instanceof Date) return fmtDate(val);
  const d = new Date(val);
  if (!isNaN(d.getTime())) return fmtDate(d);
  return String(val);
}

// Safely convert whatever Google Sheets returns for a time column into HH:MM string
// Sheets stores times as decimal fractions of a day (e.g. 0.375 = 09:00)
// or returns them as Date objects anchored to 1899-12-30
function parseSheetTime(val) {
  if (!val && val !== 0) return '';
  // Apps Script now always sends plain "HH:MM" strings via getHours()/getMinutes()
  if (typeof val === 'string' && /^\d{1,2}:\d{2}/.test(val)) {
    return val.substring(0, 5);
  }
  // Safety net: numeric decimal fraction (e.g. 0.875 = 21:00)
  if (typeof val === 'number') {
    const totalMins = Math.round(val * 24 * 60);
    const h = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }
  // Safety net: Date object — use local hours (should not occur after Apps Script fix)
  if (val instanceof Date) {
    return `${String(val.getHours()).padStart(2,'0')}:${String(val.getMinutes()).padStart(2,'0')}`;
  }
  return '';
}

async function fetchTEE() {
  const rows = await sheetGetAll(CONFIG.SHEETS.tee);
  const parsed = rows.map(_teeRowToItem).filter(i => i.id && i.title);
  // Deduplicate by ID — last row wins (handles any accidental duplicates in the sheet)
  const seen = new Map();
  parsed.forEach(i => seen.set(i.id, i));
  STATE.items = Array.from(seen.values());
}

async function saveTEE(item) {
  if (!STATE.sheetConnected) return;
  // Build the row — only populate fields that belong to this type
  const isTask  = item.type === 'task' || item.type === 'ideal' || item.type === 'temporary';
  const isEvent = item.type === 'event';
  const isEntry = item.type === 'entry';
  await sheetUpsert(CONFIG.SHEETS.tee, {
    'ID':           item.id,
    'Type':         item.type,
    'Title':        item.title,
    'Description':  item.desc       || '',
    'Date':         (isEvent || isEntry) ? item.date    : '',
    'Due Date':     isTask           ? item.dueDate   : '',
    'Start Date':   isTask           ? item.startDate : '',
    'Product List Deadline': isTask ? item.productListDeadline || '' : '',
    'Planogram Deadline':    isTask ? item.planogramDeadline || '' : '',
    'Time':         (isEvent || isEntry) ? item.time    : '',
    'End Time':     isEvent          ? item.endTime   : '',
    'Status':       item.status || '',
    'Priority':     item.priority    || '',
    'Category':     item.category    || '',
    // P4-R011a: Context standardization (discovery basis P4-D021/P4-D021a) —
    // Project and Department now write unconditionally for all types
    // instead of being gated to isTask/isEntry — both columns already
    // existed and were already read unconditionally by _teeRowToItem for
    // every type; only the write-side condition changes here. No schema/
    // Apps Script/column change.
    'Project':      item.project      || '',
    'Department':   item.dept         || '',
    'Assignees':    item.assignees    || '',
    'Progress %':   isTask           ? item.progress  : '',
    'Tags':         Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags||''),
    'Notes':        item.notes       || '',
    'Color':        (isEvent || isEntry) ? item.color  : '',
    'Recurrence':   item.recurrence  || 'none',
    'Subtasks':     item.subtasks?.length ? JSON.stringify(item.subtasks) : '',
    // P4-R012a: TEE Links (discovery basis P4-D022) — same write shape as
    // Subtasks; Links column already added to both sheets manually by the
    // owner (out-of-band, precondition for this checkpoint), header-driven
    // Apps Script picks up the new key automatically, no Apps Script change.
    'Links':        item.links?.length ? JSON.stringify(item.links) : '',
    'Store Code':                item.storeCode || '',
    'Store Name':                item.storeName || '',
    'Backup Folder':             item.backupFolder || '',
    'Branch Folder':             item.branchFolder || '',
    'Module Allocation File ID': item.moduleAllocFileId || '',
    'Module Allocation URL':     item.moduleAllocUrl || '',
    'Approval Stage':            item.approvalStage || '',
    'Completed Date':            item.completedDate || '',
    'Created Date':              item.createdDate || ''
  });
}

async function deleteTEE(id) {
  if (!STATE.sheetConnected) return;
  await sheetDelete(CONFIG.SHEETS.tee, id);
}

// ── ARCHIVE SHEET ───────────────────────────────────────────
function _teeRowToItem(r) {
  // Shared row→item parser used for both active and archive sheets
  const rawType = (r['Type'] || '').toString().trim().toLowerCase();
  const type = ['task','ideal','temporary','event','entry'].includes(rawType) ? rawType : 'task';
  return {
    id:          (r['ID'] || '').toString().trim(),
    type,
    title:       r['Title']        || '',
    desc:        r['Description']  || '',
    date:        parseSheetDate(r['Date']),
    dueDate:     parseSheetDate(r['Due Date']),
    startDate:   parseSheetDate(r['Start Date']),
    productListDeadline: parseSheetDate(r['Product List Deadline']),
    planogramDeadline:   parseSheetDate(r['Planogram Deadline']),
    time:        parseSheetTime(r['Time']),
    endTime:     parseSheetTime(r['End Time']),
    status:      r['Status'] || (type === 'task' ? 'Backlog' : ''),
    priority:    r['Priority']     || 'Medium',
    category:    r['Category']     || '',
    project:     r['Project']      || '',
    dept:        r['Department']   || '',
    assignees:   r['Assignees']    || '',
    progress:    type === 'task' ? (Number(r['Progress %']) || 0) : 0,
    tags:        typeof r['Tags']==='string' ? r['Tags'].split(',').map(s=>s.trim()).filter(Boolean) : [],
    notes:       r['Notes']        || '',
    color:       r['Color']        || '',
    recurrence:  r['Recurrence']   || 'none',
    subtasks:    (() => { try { const raw = r['Subtasks']||''; return raw ? JSON.parse(raw) : []; } catch { return []; } })(),
    // P4-R012a: TEE Links (discovery basis P4-D022) — same shape as Subtasks:
    // a JSON-stringified array in one cell, safely parsed with a try/catch
    // empty-array fallback so old rows with no Links column, or a blank
    // Links cell, never throw and simply resolve to []. Also normalizes each
    // entry to a plain { name, url } string pair (guards against a
    // malformed/partial object surviving from hand-edited sheet data) and
    // drops any entry with a blank url — a link with no url is not a link.
    // Name is preserved as-is (including blank) since Name is optional.
    links: (() => {
      try {
        const raw = r['Links'] || '';
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
          .map(l => ({
            name: (l && l.name != null) ? String(l.name) : '',
            url:  (l && l.url  != null) ? String(l.url)  : '',
          }))
          .filter(l => l.url);
      } catch { return []; }
    })(),
    archivedDate: r['Archived Date'] || '',
    archivedBy:   r['Archived By']   || '',
    storeCode:         r['Store Code']                    || '',
    storeName:         r['Store Name']                    || '',
    backupFolder:      r['Backup Folder']                 || '',
    branchFolder:      r['Branch Folder']                 || '',
    moduleAllocFileId: r['Module Allocation File ID']      || '',
    moduleAllocUrl:    r['Module Allocation URL']          || '',
    approvalStage:     r['Approval Stage']                 || '',
    completedDate:     r['Completed Date']                 || '',
    createdDate:       r['Created Date']                    || '',
  };
}

async function fetchArchiveMonth(year, month) {
  // Returns array of items for the given month from cache or sheet
  const key = `${year}-${String(month+1).padStart(2,'0')}`;
  if (STATE.archiveCache[key]) return STATE.archiveCache[key]; // already cached
  if (!STATE.sheetConnected)   return [];

  // First time crossing boundary — fetch entire archive sheet once and cache all months
  if (!STATE.archiveCache._fetched) {
    try {
      const rows = await sheetGetAll(CONFIG.SHEETS.archive);
      const all  = rows.map(_teeRowToItem).filter(i => i.id && i.title);
      // Group by relevant month
      all.forEach(item => {
        const dateStr = item.type === 'task' ? item.dueDate : item.date;
        if (!dateStr) return;
        const k = dateStr.substring(0, 7); // 'YYYY-MM'
        if (!STATE.archiveCache[k]) STATE.archiveCache[k] = [];
        STATE.archiveCache[k].push(item);
      });
      STATE.archiveCache._fetched = true;
    } catch(e) {
      console.warn('Archive fetch failed:', e.message);
      return [];
    }
  }
  return STATE.archiveCache[key] || [];
}

async function saveArchiveItem(item, archivedBy = 'auto') {
  if (!STATE.sheetConnected) return;
  const isTask  = item.type === 'task' || item.type === 'ideal' || item.type === 'temporary';
  const isEvent = item.type === 'event';
  const isEntry = item.type === 'entry';
  await sheetUpsert(CONFIG.SHEETS.archive, {
    'ID':           item.id,
    'Type':         item.type,
    'Title':        item.title,
    'Description':  item.desc       || '',
    'Date':         (isEvent || isEntry) ? item.date    : '',
    'Due Date':     isTask           ? item.dueDate   : '',
    'Start Date':   isTask           ? item.startDate : '',
    'Product List Deadline': isTask ? item.productListDeadline || '' : '',
    'Planogram Deadline':    isTask ? item.planogramDeadline || '' : '',
    'Time':         (isEvent || isEntry) ? item.time   : '',
    'End Time':     isEvent          ? item.endTime   : '',
    'Status':       item.status || '',
    'Priority':     item.priority    || '',
    'Category':     item.category    || '',
    // P4-R011a: mirrors the same Project/Department write-condition change
    // made in saveTEE — see that function's comment for rationale.
    'Project':      item.project      || '',
    'Department':   item.dept         || '',
    'Assignees':    item.assignees    || '',
    'Progress %':   isTask           ? item.progress  : '',
    'Tags':         Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags||''),
    'Notes':        item.notes       || '',
    'Color':        (isEvent || isEntry) ? item.color  : '',
    'Recurrence':   item.recurrence  || 'none',
    'Subtasks':     item.subtasks?.length ? JSON.stringify(item.subtasks) : '',
    // P4-R012a: mirrors the same Links write shape added to saveTEE — see
    // that function's comment for rationale. Preserved before archive
    // metadata, same relative position as the active sheet.
    'Links':        item.links?.length ? JSON.stringify(item.links) : '',
    'Store Code':                item.storeCode || '',
    'Store Name':                item.storeName || '',
    'Backup Folder':             item.backupFolder || '',
    'Branch Folder':             item.branchFolder || '',
    'Module Allocation File ID': item.moduleAllocFileId || '',
    'Module Allocation URL':     item.moduleAllocUrl || '',
    'Approval Stage':            item.approvalStage || '',
    'Completed Date':            item.completedDate || '',
    'Created Date':              item.createdDate || '',
    'Archived Date': fmtDate(new Date()),
    'Archived By':   archivedBy,
  });
}

async function deleteArchiveItem(id) {
  if (!STATE.sheetConnected) return;
  await sheetDelete(CONFIG.SHEETS.archive, id);
}

// Parse pipe-delimited "Tags" cell from a sheet row into a clean array
function parseTagList(raw) {
  return (raw||'').split('|').map(t=>t.trim().replace(/^#/,'')).filter(Boolean);
}
// ── STICKIES (notes) ────────────────────────────────────────
async function fetchStickies() {
  const rows = await sheetGetAll(CONFIG.SHEETS.stickies);
  STATE.stickies = rows.map(r => ({
    id:       r['ID']||'',
    text:     r['Text']||'',
    colorIdx: Number(r['ColorIdx'])||0,
    x:        Number(r['X'])||20,
    y:        Number(r['Y'])||120,
    float:    r['Float']  === true || r['Float']  === 'TRUE' || r['Float']  === '1',
    pinned:   r['Pinned'] === true || r['Pinned'] === 'TRUE' || r['Pinned'] === '1',
    tags:     parseTagList(r['Tags']),
    date:     r['Date']||'',
    time:     r['Time']||'',
    done:     r['Done'] === true || r['Done'] === 'TRUE' || r['Done'] === '1',
    doneAt:   r['DoneAt']||'',
  })).filter(r=>r.id);
}
async function saveSticky(s) {
  if (!STATE.sheetConnected) return;
  await sheetUpsert(CONFIG.SHEETS.stickies, {
    'ID':       s.id,
    'Text':     s.text,
    'ColorIdx': s.colorIdx,
    'X':        s.x,
    'Y':        s.y,
    'Float':    s.float  ? 'TRUE' : 'FALSE',
    'Pinned':   s.pinned ? 'TRUE' : 'FALSE',
    'Tags':     (s.tags||[]).join('|'),
    'Date':     s.date||'',
    'Time':     s.time||'',
    'Done':     s.done ? 'TRUE' : 'FALSE',
    'DoneAt':   s.doneAt||'',
  });
}

async function saveStickyArchiveItem(s) {
  if (!STATE.sheetConnected) return;
  const now = new Date();
  const ts  = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0')
             +' '+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  await sheetUpsert(CONFIG.SHEETS.stickyArchive, {
    'ID':         s.id,
    'Text':       s.text,
    'ColorIdx':   s.colorIdx,
    'X':          s.x,
    'Y':          s.y,
    'Float':      s.float  ? 'TRUE' : 'FALSE',
    'Pinned':     s.pinned ? 'TRUE' : 'FALSE',
    'Tags':       (s.tags||[]).join('|'),
    'Date':       s.date||'',
    'Time':       s.time||'',
    'Done':       s.done ? 'TRUE' : 'FALSE',
    'DoneAt':     s.doneAt||'',
    'ArchivedAt': ts,
    'ArchivedBy': 'manual',
  });
}
async function deleteSticky(id) { if (!STATE.sheetConnected) return; await sheetDelete(CONFIG.SHEETS.stickies, id); }

// ── DIRECTORIES: Folders, Contacts, Locations, People ───────
async function fetchFolders() {
  const rows = await sheetGetAll(CONFIG.SHEETS.folders);
  STATE.folders = rows.map(r => ({ id:r['ID']||'', name:r['Name']||'', url:r['URL']||'', desc:r['Description']||'', tags:parseTagList(r['Tags']) })).filter(r=>r.id);
}
async function saveFolder(f) {
  if (!STATE.sheetConnected) return;
  await sheetUpsert(CONFIG.SHEETS.folders, {
    'ID':f.id, 'Name':f.name, 'URL':f.url,
    'Description':f.desc, 'Tags':(f.tags||[]).join('|'),
  });
}
async function deleteFolder(id) { if (!STATE.sheetConnected) return; await sheetDelete(CONFIG.SHEETS.folders, id); }

async function fetchContacts() {
  const rows = await sheetGetAll(CONFIG.SHEETS.contacts);
  STATE.contacts = rows.map(r => ({ id:r['ID']||'', name:r['Name']||'', position:r['Position']||'', phone:r['Phone']||'', email:r['Email']||'', company:r['Company']||'', notes:r['Notes']||'', tags:parseTagList(r['Tags']) })).filter(r=>r.id);
}
async function saveContact(c) {
  if (!STATE.sheetConnected) return;
  await sheetUpsert(CONFIG.SHEETS.contacts, {
    'ID':c.id, 'Name':c.name, 'Position':c.position,
    'Phone':c.phone, 'Email':c.email,
    'Company':c.company||'', 'Notes':c.notes||'',
    'Tags':(c.tags||[]).join('|'),
  });
}
async function deleteContact(id) { if (!STATE.sheetConnected) return; await sheetDelete(CONFIG.SHEETS.contacts, id); }

async function fetchLocations() {
  const rows = await sheetGetAll(CONFIG.SHEETS.locations);
  STATE.locations = rows.map(r => ({ id:r['ID']||uid('L'), name:r['Name']||'', address:r['Address']||'', mapUrl:r['MapURL']||'', notes:r['Notes']||'', company:r['Company']||'', phone:r['Phone']||'', tags:parseTagList(r['Tags']) })).filter(r=>r.name);
}
async function saveLocation(l) {
  if (!STATE.sheetConnected) return;
  await sheetUpsert(CONFIG.SHEETS.locations, {
    'ID':l.id, 'Name':l.name, 'Address':l.address,
    'MapURL':l.mapUrl, 'Notes':l.notes,
    'Company':l.company||'', 'Phone':l.phone||'',
    'Tags':(l.tags||[]).join('|'),
  });
}
async function deleteLocation(id) { if (!STATE.sheetConnected) return; await sheetDelete(CONFIG.SHEETS.locations, id); }

async function fetchPeople() {
  const rows = await sheetGetAll(CONFIG.SHEETS.people);
  if (rows.length) STATE.people = rows.map(r => ({ id:r['ID']||'', name:r['Name']||'', role:r['Role']||'', color:r['Color']||'#285C70', photo:r['Photo']||'' })).filter(r=>r.id);
}
async function savePerson(p) {
  if (!STATE.sheetConnected) return;
  await sheetUpsert(CONFIG.SHEETS.people, {'ID':p.id,'Name':p.name,'Role':p.role,'Color':p.color,'Photo':p.photo||''});
}
async function deletePerson(id) { if (!STATE.sheetConnected) return; await sheetDelete(CONFIG.SHEETS.people, id); }

// ── TAGS CATALOG (read-only, additive metadata — P4-R027) ────
// Normalize a raw NormalizedKey/Tag cell into the catalog's comparison key: trim, strip one leading '#', trim, lowercase
function _normalizeTagCatalogKey(raw) {
  return (raw||'').trim().replace(/^#/,'').trim().toLowerCase();
}
// Interpret a sheet "Active" cell; blank/missing defaults to TRUE (keeps manually added rows active unless explicitly set FALSE)
function _parseTagCatalogActive(raw) {
  if (raw === undefined || raw === null) return true;
  if (raw === true) return true;
  if (raw === false) return false;
  const s = String(raw).trim();
  if (s === '') return true;
  return s.toUpperCase() === 'TRUE';
}
async function loadTagCatalog() {
  try {
    const rows = await sheetGetAll(CONFIG.SHEETS.tags);
    const seen = new Set();
    const catalog = [];
    (rows||[]).forEach(r => {
      const tag = (r['Tag']||'').trim();
      if (!tag) return;
      let normalizedKey = _normalizeTagCatalogKey(r['NormalizedKey']);
      if (!normalizedKey) normalizedKey = _normalizeTagCatalogKey(tag);
      if (!normalizedKey) return;
      if (seen.has(normalizedKey)) {
        console.warn('loadTagCatalog: duplicate NormalizedKey skipped —', normalizedKey);
        return;
      }
      seen.add(normalizedKey);
      catalog.push({
        tag:           tag,
        normalizedKey: normalizedKey,
        color:         (r['Color']||'').trim(),
        active:        _parseTagCatalogActive(r['Active']),
        createdAt:     r['CreatedAt']||'',
        updatedAt:     r['UpdatedAt']||'',
      });
    });
    STATE.tagCatalog = catalog;
  } catch(e) {
    console.warn('loadTagCatalog failed, falling back to empty catalog:', e.message);
    STATE.tagCatalog = [];
  }
  return STATE.tagCatalog;
}
// Read-only lookup: returns the STATE.tagCatalog entry matching tagName's normalized identity, or null.
// No sheet I/O, no side effects; ignores `active` entirely (P4-R028 — color resolution only).
function _getTagCatalogEntry(tagName) {
  if (!tagName || !Array.isArray(STATE.tagCatalog)) return null;
  const key = _normalizeTagCatalogKey(tagName);
  if (!key) return null;
  return STATE.tagCatalog.find(e => e.normalizedKey === key) || null;
}
// Validate/normalize a catalog Color cell into a 6-digit '#RRGGBB' string, or null if invalid.
// Accepts #RGB or #RRGGBB (case-insensitive hex digits) only — no named colors, rgba, or missing '#'.
function _normalizeTagCatalogColor(raw) {
  const s = (raw||'').trim();
  const short = /^#([0-9a-fA-F]{3})$/.exec(s);
  if (short) {
    const [r,g,b] = short[1].split('');
    return '#' + r+r+g+g+b+b;
  }
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
  return null;
}

// ── IDEAL/TEMPORARY CONFIG SHEETS (Categories, Subtask Templates, Stores, Assignments) ──
async function fetchConfig() {
  const rows = await sheetGetAll(CONFIG.SHEETS.config);

  const catRows = rows.filter(r => (r['Record Type']||'').trim() === 'Category');
  const subRows = rows.filter(r => (r['Record Type']||'').trim() === 'SubtaskTemplate');

  if (catRows.length) {
    STATE.categories = catRows.map(r => ({
      id: r['Config ID'] || `CAT-${(r['Code']||'').trim()}`,
      code: (r['Code']||'').trim(), name: r['Name'] || r['Code'] || '',
      defaultAssignee: r['Value1'] || '',
      active: r['Active']===true || r['Active']==='TRUE',
      sortOrder: Number(r['Sort Order'])||0,
    })).filter(c => c.code).sort((a,b)=>a.sortOrder-b.sortOrder);
  } else {
    // Config sheet has no Category rows yet — same defaults the app
    // shipped with, so a fresh/empty Config tab doesn't leave the
    // Ideal/Temporary workflow with zero categories. Populate the Config
    // tab (see Config.csv) to take real control of this list; once any
    // Category row exists there, this fallback is never used again.
    console.warn('[fetchConfig] No Category rows in Config sheet — using built-in defaults.');
    STATE.categories = [
      ['CAT-AUD','AUD','AUD','Denise',1], ['CAT-CNC','CNC','CNC','Justine',2],
      ['CAT-MAC','MAC','MAC','AA',3], ['CAT-WAP','WAP','WAP','AA',4],
      ['CAT-ENH','ENH','ENH','Jhov',5],
      ['CAT-IPH_W_NPI','IPH (w/ NPI)','IPH (w/ NPI)','Aly',6],
      ['CAT-IPH_WO_NPI','IPH (w/o NPI)','IPH (w/o NPI)','Aly',7],
      ['CAT-APP','APP','APP','Justine',8],
    ].map(([id,code,name,defaultAssignee,sortOrder]) => ({ id, code, name, defaultAssignee, active:true, sortOrder }));
  }

  if (subRows.length) {
    STATE.subtaskTemplates = subRows.map(r => ({
      type: (r['Code']||'').trim(),          // 'ideal' | 'temporary'
      name: r['Name']||'',
      stepOrder: String(r['Value1']||''),
      parentStep: String(r['Value2']||''),
      required: r['Value3']===true || r['Value3']==='TRUE',
      sortOrder: Number(r['Sort Order'])||0,
    })).filter(t => t.type).sort((a,b)=>a.sortOrder-b.sortOrder);
  } else {
    console.warn('[fetchConfig] No SubtaskTemplate rows in Config sheet — using built-in defaults.');
    const idealSteps = [
      ['1','SPS Submitted'], ['2','For LTM Approval'], ['3','For PMT Approval'],
      ['4','For JAG Approval'], ['5','For PLG Approval'], ['6','For GDrive Upload'], ['7','GDrive Upload'],
    ];
    const temporarySteps = [
      ['1','SPS Submitted'], ['2','For LTM Approval'], ['3','For PLG Approval'],
      ['4','For GDrive Upload'], ['5','GDrive Upload'],
    ];
    STATE.subtaskTemplates = [
      ...idealSteps.map(([stepOrder,name]) => ({ type:'ideal', name, stepOrder, parentStep:'', required:true, sortOrder:Number(stepOrder) })),
      ...temporarySteps.map(([stepOrder,name]) => ({ type:'temporary', name, stepOrder, parentStep:'', required:true, sortOrder:Number(stepOrder) })),
    ];
  }
}

// Persists one category row to the Config sheet. Uses a real unique
// 'Config ID' as column A — the generic sheetUpsert/Apps Script upsert
// matches rows by column A, and 'Record Type' alone (Category/
// SubtaskTemplate) is not unique, so writing without a dedicated ID
// column would silently overwrite an unrelated row.
async function saveConfigCategory(cat) {
  if (!STATE.sheetConnected) return;
  if (!cat.id) cat.id = `CAT-${cat.code.toUpperCase().replace(/\s+/g,'_')}`;
  await sheetUpsert(CONFIG.SHEETS.config, {
    'Config ID':   cat.id,
    'Record Type': 'Category',
    'Code':        cat.code,
    'Name':        cat.name || cat.code,
    'Value1':      cat.defaultAssignee || '',
    'Value2':      '',
    'Value3':      '',
    'Active':      cat.active === false ? 'FALSE' : 'TRUE',
    'Sort Order':  cat.sortOrder || 0,
  });
}

async function fetchStores() {
  const rows = await sheetGetAll(CONFIG.SHEETS.stores);

  // Store directory is the single source of truth for the Ideal/Temporary
  // workflow. Folder fields are read from Google Sheets so selecting a store
  // automatically resolves its Backup and Branch folders.
  const pick = (row, keys) => {
    for (const key of keys) {
      if (row[key] != null && String(row[key]).trim()) return String(row[key]).trim();
    }
    return '';
  };

  STATE.stores = rows.map(r => ({
    code: String(r['Store Code'] || '').trim(),
    name: String(r['Store Name'] || '').trim(),
    type: r['Store Type'] || '',
    address: r['Address'] || '',
    region: r['Region'] || '',
    backupFolder: pick(r, ['Backup Folder', 'Backup Folder URL', 'BackupFolder', 'Backup URL']),
    branchFolder: pick(r, ['Branch Folder', 'Branch Folder URL', 'BranchFolder', 'Branch URL']),
    active: r['Active']===true || r['Active']==='TRUE' || String(r['Active']).toLowerCase()==='true',
  })).filter(s => s.code);
}

function normalizeWorkflowSubtasks(type, rawSubtasks) {
  const defs = _workflowDefinition(type);
  const raw = Array.isArray(rawSubtasks) ? rawSubtasks : [];
  const aliases = {
    'SPS Submitted':'SPS Submitted',
    'LTM Approved':'LTM Approved', 'For LTM Approval':'LTM Approved',
    'PMT Approved':'PMT Approved', 'For PMT Approval':'PMT Approved',
    'JAG Approved':'JAG Approved', 'For JAG Approval':'JAG Approved',
    'PLG Approved':'PLG Approved', 'For PLG Approval':'PLG Approved',
    'GDrive Uploaded':'GDrive Uploaded', 'GDrive Upload':'GDrive Uploaded',
  };
  return defs.map(step => {
    const exact = raw.find(s => String(s?.text||'').trim() === step.subtask);
    const alias = raw.find(s => aliases[String(s?.text||'').trim()] === step.subtask);
    const found = exact || alias;
    return {
      text: step.subtask,
      stepOrder: step.stepOrder,
      parentStep: '',
      required: true,
      done: !!found?.done,
      doneAt: found?.done ? (found.doneAt || null) : null,
      checkedBy: found?.checkedBy || null,
    };
  });
}

async function fetchAssignments() {
  const rows = await sheetGetAll(CONFIG.SHEETS.assignments);
  STATE.assignments = rows.map(r => {
    let subtasks = [];
    try { subtasks = r['Subtasks'] ? JSON.parse(r['Subtasks']) : []; } catch(e) { subtasks = []; }
    return {
      id: r['Assignment ID']||'', teeId: r['TEE ID']||'',
      category: r['Category']||'', defaultAssignee: r['Default Assignee']||'',
      assignedTo: r['Assigned To']||'', source: r['Assignment Source']||'default',
      confirmed: r['Confirmed']===true||r['Confirmed']==='TRUE',
      confirmedBy: r['Confirmed By']||'', confirmedDate: r['Confirmed Date']||'',
      subtasks,
    };
  }).filter(a => a.id);
}

async function saveAssignment(a) {
  if (!STATE.sheetConnected) return;
  await sheetUpsert(CONFIG.SHEETS.assignments, {
    'Assignment ID': a.id, 'TEE ID': a.teeId, 'Category': a.category,
    'Default Assignee': a.defaultAssignee, 'Assigned To': a.assignedTo,
    'Assignment Source': a.source, 'Confirmed': a.confirmed?'TRUE':'FALSE',
    'Confirmed By': a.confirmedBy||'', 'Confirmed Date': a.confirmedDate||'',
    'Subtasks': a.subtasks?.length ? JSON.stringify(a.subtasks) : '',
  });
}
async function deleteAssignment(id) { if (!STATE.sheetConnected) return; await sheetDelete(CONFIG.SHEETS.assignments, id); }

// ── SUBTASK ACCOMPLISHMENT HISTORY ─────────────────────────────
// Every time a category subtask is completed, append an immutable history
// record. The current assignment remains the source of truth for live
// progress; this sheet is the audit trail of what was actually accomplished
// per Store + Category + Subtask. Unchecking a subtask does not erase the
// prior accomplishment record. Re-completing it creates a new event.
async function recordSubtaskAccomplishment(item, assignment, subtask) {
  if (!STATE.sheetConnected || !item || !assignment || !subtask?.done) return;
  const now = new Date();
  const id = `ACC-${now.getTime()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
  await sheetUpsert(CONFIG.SHEETS.accomplishments, {
    'Accomplishment ID': id,
    'Accomplished At': now.toISOString(),
    'TEE ID': item.id || '',
    'Record Type': item.type || '',
    'Record Title': item.title || '',
    'Store Code': item.storeCode || '',
    'Store Name': item.storeName || '',
    'Category': assignment.category || '',
    'Assignment ID': assignment.id || '',
    'Subtask': subtask.text || '',
    'Step Order': subtask.stepOrder || '',
    'Assigned To': assignment.assignedTo || '',
  });
}

// ── SYNC ENGINE ─────────────────────────────────────────────
let _lastSyncTime = 0;
let _idleSyncTimer = null;
const IDLE_SYNC_MS = 10 * 60 * 1000; // 10 minutes

async function fetchAllSheets() {
  if (!hasAPI()) return;
  const syncDot  = document.getElementById('sync-dot');
  const syncText = document.getElementById('sync-text');
  const detail   = document.getElementById('sync-time-detail');
  // Show syncing state
  if (syncDot)  syncDot.className = 'nav-dot syncing';
  if (syncText) syncText.textContent = 'Syncing…';
  if (detail)   detail.textContent  = 'Connecting to Sheets…';
  try {
    await Promise.all([
      fetchTEE(),
      fetchStickies(),
      fetchFolders(),
      fetchContacts(),
      fetchLocations(),
      fetchPeople(),
      loadTagCatalog(),
      fetchConfig(),
      fetchStores(),
      fetchAssignments(),
    ]);
    STATE.assignments = STATE.assignments.map(a => {
      const item = STATE.items.find(i => i.id === a.teeId);
      return (item?.type === 'ideal' || item?.type === 'temporary')
        ? { ...a, subtasks: normalizeWorkflowSubtasks(item.type, a.subtasks) }
        : a;
    });
    STATE.items.forEach(item => {
      if (item.type === 'ideal' || item.type === 'temporary') recalcIdealTemporaryStatus(item);
    });
    STATE.sheetConnected = true;
    _lastSyncTime = Date.now();
    setSyncStatus(true);
    // Run once-per-day archive check after data is loaded
    await autoArchive();
    renderAll();
    _renderStickyLayerPreservePositions();
    toast('Synced with Sheets ✓', 'success');
  } catch(e) {
    console.warn('Full sync failed:', e.message);
    setSyncStatus(false);
  }
  // Reset the idle timer after every sync
  _scheduleIdleSync();
}

function _scheduleIdleSync() {
  if (_idleSyncTimer) clearTimeout(_idleSyncTimer);
  _idleSyncTimer = setTimeout(() => { fetchAllSheets(); }, IDLE_SYNC_MS);
}

function triggerSync() {
  if (triggerSync._t) clearTimeout(triggerSync._t);
  triggerSync._t = setTimeout(() => fetchAllSheets(), 800);
}

function manualSync() {
  fetchAllSheets();
  toast('Syncing now…', 'info');
}

/* ─── ARCHIVE HELPERS ─── */

// Returns true if a date string is older than CONFIG.ARCHIVE_DAYS days
function isArchivePeriod(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return false;
  const boundary = new Date(TODAY);
  boundary.setDate(boundary.getDate() - CONFIG.ARCHIVE_DAYS);
  return d < boundary;
}

// Returns the relevant date string for an item (for archive age checks)
function _itemDate(item) {
  return item.type === 'task' ? (item.dueDate || item.startDate) : item.date;
}

// Auto-archive — runs once per day, silently moves old items
async function autoArchive() {
  if (!STATE.sheetConnected) return;

  // Daily gate
  const today = fmtDate(new Date());
  if (localStorage.getItem('lastArchiveDate') === today) return;

  const toArchive = STATE.items.filter(item => {
    const d = _itemDate(item);
    if (!isArchivePeriod(d)) return false;
    // Tasks: only archive if Completed
    if (item.type === 'task') return parseStatus(item.status).state === 'Completed';
    // Events and entries: archive if date is old enough regardless of status
    return true;
  });

  // ── System closure: mark past Events/Entries as Done if still Open ─────
  // Same daily gate as archive — runs once per day on first load
  const todayD2 = fmtDate(new Date());
  const toClose = STATE.items.filter(item => {
    if (item.type === 'task') return false; // tasks handle their own status
    const itemDate = item.date || item.dueDate;
    if (!itemDate || itemDate >= todayD2) return false; // not past
    const { state } = parseStatus(item.status);
    return !state || state === 'Open'; // only close Open/blank ones
  });

  if (toClose.length > 0) {
    try {
      await Promise.all(toClose.map(item => {
        item.status = 'Done';
        return saveTEE(item);
      }));
    } catch(e) {
      console.warn('System closure failed (non-critical):', e.message);
    }
  }

  if (toArchive.length === 0) {
    localStorage.setItem('lastArchiveDate', today);
    return;
  }

  // Write all to archive sheet then delete from active sheet
  try {
    await Promise.all(toArchive.map(item => saveArchiveItem(item, 'auto')));
    await Promise.all(toArchive.map(item => deleteTEE(item.id)));

    // Remove from STATE.items and add to archiveCache
    const ids = new Set(toArchive.map(i => i.id));
    STATE.items = STATE.items.filter(i => !ids.has(i.id));
    toArchive.forEach(item => {
      item.archivedDate = today;
      item.archivedBy   = 'auto';
      const key = (_itemDate(item) || today).substring(0, 7);
      if (!STATE.archiveCache[key]) STATE.archiveCache[key] = [];
      STATE.archiveCache[key].push(item);
    });

    localStorage.setItem('lastArchiveDate', today);
    toast(`Archived ${toArchive.length} old item${toArchive.length > 1 ? 's' : ''}`, 'info');
    renderAll();
  } catch(e) {
    console.warn('Auto-archive failed:', e.message);
  }
}

// Manually archive a single item immediately (from detail view)
async function archiveItem(id) {
  const item = STATE.items.find(i => i.id === id);
  if (!item) return;
  // Store id for the confirm button to use — avoids closure serialization issue
  window._pendingArchiveId = id;
  openModal(`
    <div style="padding:4px 0 12px">
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:10px">Archive Item</div>
      <div style="font-size:14px;color:var(--text2);line-height:1.6">"<strong>${item.title}</strong>" will be moved to the archive. You can restore it at any time.</div>
    </div>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="clearNav()">Cancel</button>
      <button style="background:rgba(251,191,36,0.12);color:var(--yellow);border:1px solid rgba(251,191,36,0.35);height:36px;padding:0 16px;border-radius:10px;font-family:var(--font);font-size:14px;font-weight:600;cursor:pointer;"
        onclick="clearNav();_doArchive(window._pendingArchiveId)">Archive</button>
    </div>`);
}

async function _doArchive(id) {
  const item = STATE.items.find(i => i.id === id);
  if (!item) { toast('Item not found', 'error'); return; }
  try {
    await saveArchiveItem(item, 'manual');
    await deleteTEE(id);
    STATE.items = STATE.items.filter(i => i.id !== id);
    item.archivedDate = fmtDate(new Date());
    item.archivedBy   = 'manual';
    const key = (_itemDate(item) || fmtDate(new Date())).substring(0, 7);
    if (!STATE.archiveCache[key]) STATE.archiveCache[key] = [];
    STATE.archiveCache[key].push(item);
    renderAll();
    toast('Item archived', 'info');
  } catch(e) {
    toast(`Archive failed: ${e.message||'unknown error'}`, 'error');
    console.error('Archive error:', e);
  }
}

// Restore an item from archive back to active sheet
async function restoreFromArchive(id) {
  // Find in archiveCache
  let found = null, foundKey = null;
  for (const [key, items] of Object.entries(STATE.archiveCache)) {
    if (key === '_fetched') continue;
    const match = items.find(i => i.id === id);
    if (match) { found = match; foundKey = key; break; }
  }
  if (!found) { toast('Item not found in archive', 'error'); return; }

  try {
    await saveTEE(found);
    await deleteArchiveItem(id);
    STATE.items.push(found);
    STATE.archiveCache[foundKey] = STATE.archiveCache[foundKey].filter(i => i.id !== id);
    clearNav();
    renderAll();
    toast('✅ Restored to active', 'success');
  } catch(e) {
    toast('Restore failed — try again', 'error');
  }
}

function setSyncStatus(live) {
  const dot    = document.getElementById('sync-dot');
  const dotC   = document.getElementById('sync-dot-collapsed');
  const label  = document.getElementById('sync-text');
  const detail = document.getElementById('sync-time-detail');
  const cls    = live ? 'nav-dot live' : 'nav-dot';
  if (dot)   dot.className   = cls;
  if (dotC)  dotC.className  = cls;
  if (label) label.textContent = live ? 'System Live' : 'Offline';
  if (detail) {
    if (live) {
      const now  = new Date();
      const time = now.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
      detail.textContent = `Synced ${time}`;
    } else {
      detail.textContent = 'Click to retry';
    }
  }
}

/* ============================================================
   6. RENDER FUNCTIONS
   ============================================================ */
