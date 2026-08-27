// ============================================================
// 08-assignee-and-person-helpers.js
// Avatar/assignee rendering, person-active-today helpers
// (lines 4727-4861 of the original inline <script>)
// ============================================================

// ── ASSIGNEE HELPERS ─────────────────────────────────────────
// Parse "Lead|Contrib1|Contrib2" → { lead, contributors[] }
function parseAssignees(str) {
  const parts = (str || '').split('|').map(s => s.trim()).filter(Boolean);
  if (!parts.length) return { lead: '', contributors: [] };
  return { lead: parts[0], contributors: parts.slice(1) };
}
// Build back to "Lead|Contrib1|Contrib2"
function buildAssigneesStr(lead, contributors) {
  const all = [lead, ...(contributors || [])].map(s => (s||'').trim()).filter(Boolean);
  return all.join('|');
}
// Split "Lead|Contrib1|Contrib2" into a clean array of names
function splitAssigneeNames(str) {
  return (str||'').split('|').map(s=>s.trim()).filter(Boolean);
}
// Format assignees for detail-view display: "Lead (lead), Contrib1, Contrib2"
function formatAssigneesDisplay(item) {
  const parts = (item.assignees||'').split('|').map(s=>s.trim()).filter(Boolean);
  if (!parts.length) return '—';
  if (item.type==='task') return parts[0]+(parts.length>1?' (lead), '+parts.slice(1).join(', '):'');
  return parts.join(', ');
}

// Render avatar — photo if available, else colored initials circle
// For Google Drive: we expect thumbnail URL (auto-converted on input)

// Render lead + stacked contributors for cards
// Rules: solo lead → avatar + firstName
//        with contribs → lead (larger) + up to 3 stacked contrib circles + "+N" if more
//        compact (narrow card) → lead avatar + "+N" count only
function renderAssigneeStack(assigneesStr, compact, itemType) {
  const { lead, contributors } = parseAssignees(assigneesStr);
  if (!lead) return '';

  // For events and entries: all names are equal participants — no lead/contrib visual distinction
  // Use same avatar size for all, first name shown
  if (itemType === 'event' || itemType === 'entry') {
    const allNames = [lead, ...contributors];
    const firstName = lead.split(' ')[0];
    const MAX_SHOWN = 4;
    const shown = allNames.slice(0, MAX_SHOWN);
    const overflow = allNames.length - MAX_SHOWN;
    const avatarEls = shown.map((name, idx) => {
      const person = STATE.people.find(x => x.name === name);
      const color  = person?.color || avColor(name);
      const photo  = person?.photo || '';
      const cls    = idx === 0 ? 'av' : 'av av-contrib';
      return photo
        ? `<img src="${photo}" class="${cls}" style="background:${color}" onerror="this.outerHTML='<div class=\\'${cls}\\' style=\\'background:${color}\\'>${initials(name)}</div>'" alt="${initials(name)}" title="${name}">`
        : `<div class="${cls}" style="background:${color}" title="${name}">${initials(name)}</div>`;
    }).join('');
    const overflowEl = overflow > 0 ? `<div class="av av-contrib av-more">+${overflow}</div>` : '';
    return `<div class="av-stack">${avatarEls}${overflowEl}</div><span class="t-name">${firstName}${allNames.length > 1 ? ` +${allNames.length - 1}` : ''}</span>`;
  }

  // Tasks: lead is larger, contributors are stacked smaller
  const leadFirst  = lead.split(' ')[0];
  const leadPerson = STATE.people.find(p => p.name === lead);
  const leadColor  = leadPerson?.color || avColor(lead);
  const leadPhoto  = leadPerson?.photo || '';

  const leadAvEl = leadPhoto
    ? `<img src="${leadPhoto}" class="av av-lead" style="background:${leadColor}" onerror="this.outerHTML='<div class=\\'av av-lead\\' style=\\'background:${leadColor}\\'>${initials(lead)}</div>'" alt="${initials(lead)}">`
    : `<div class="av av-lead" style="background:${leadColor}">${initials(lead)}</div>`;

  if (!contributors.length) {
    return `<div class="av-stack">${leadAvEl}</div><span class="t-name">${leadFirst}</span>`;
  }

  if (compact) {
    return `<div class="av-stack">${leadAvEl}<span class="t-name" style="margin-left:6px">${leadFirst}</span><span class="av-count">+${contributors.length}</span></div>`;
  }

  const MAX_SHOWN = 3;
  const shown     = contributors.slice(0, MAX_SHOWN);
  const overflow  = contributors.length - MAX_SHOWN;
  const contribEls = shown.map(name => {
    const p     = STATE.people.find(x => x.name === name);
    const color = p?.color || avColor(name);
    const photo = p?.photo || '';
    return photo
      ? `<img src="${photo}" class="av av-contrib" style="background:${color}" onerror="this.outerHTML='<div class=\\'av av-contrib\\' style=\\'background:${color}\\'>${initials(name)}</div>'" alt="${initials(name)}" title="${name}">`
      : `<div class="av av-contrib" style="background:${color}" title="${name}">${initials(name)}</div>`;
  }).join('');
  const overflowEl = overflow > 0 ? `<div class="av av-contrib av-more" title="${overflow} more">+${overflow}</div>` : '';

  return `<div class="av-stack">${leadAvEl}${contribEls}${overflowEl}</div><span class="t-name">${leadFirst}${contributors.length > 0 ? ` +${contributors.length}` : ''}</span>`;
}
// ── Top-level helper: is person active today? ───────────────
// P4-R018c (discovery basis P4-D033/P4-D034, owner correction after
// product validation): now defined in terms of the shared
// _personActiveTodayItems (Person Detail's own TODAY+ACTIVE basis, via
// the existing unmodified _pdmApplyFilters), instead of a separately
// hand-duplicated predicate — a person only counts as "active today" if
// they have a non-done, non-overdue item due/starting today or currently
// In Progress/Review. Overdue backlog alone no longer makes a person
// count as active today, per explicit owner direction. Does NOT carry
// forward P4-R018b's rejected "Today absorbs overdue" semantics — this
// is the opposite: overdue is now excluded from "active," not included.
function isPersonActiveToday(p) {
  return _personActiveTodayItems(p.name).length > 0;
}

// P4-R018c: now defined in terms of the shared _personActiveWeekItems
// (Person Detail's own THIS WEEK+ACTIVE basis) instead of a separately
// hand-duplicated predicate. This Week intentionally still includes Today
// (THIS WEEK's own primary scope is date-inclusive of today and treats
// In Progress/Review as relevant regardless of date, unchanged) — only
// overdue and done items are excluded, via the unchanged ACTIVE subfilter.
function isPersonActiveThisWeek(p) {
  return _personActiveWeekItems(p.name).length > 0;
}

// ── Today item count helper (used for sorting) ───────────────────
// P4-R018c: now the same TODAY+ACTIVE basis as isPersonActiveToday/the
// People card's own Today chip, so the People page's card-sort order
// never disagrees with what "active today" now means.
function personTodayCount(p) {
  return _personActiveTodayItems(p.name).length;
}

// ── Top-level person card builder ───────────────────────────
