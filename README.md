# Jhov's Task Dashboard — restructured

Same app, split out of the original single 15,734-line HTML file into
`index.html` + `css/styles.css` + `js/*.js`. Keep the folder structure intact
when you host/open it — `index.html` loads everything else by relative path.

## What changed

**Bug fix (Dashboard page)**
The "Tasks + Google Drive Links" block had been pasted directly inside the
JS template string that built the "Category Progress by Store" card,
splitting its title tag and leaving mismatched `</div>`s. It's fixed, and
while in there the old standalone "Task Type / Progress" pie row was
replaced with a single Task Type pie built into the Tasks panel itself
(per your last round of direction), and Google Drive Links stayed in place
alongside it.

**Dead code removed** (each confirmed unused anywhere else in the app
before deletion):
- A leftover `console.log` in the auto-archive routine
- Two entire unused chart helpers (`_dashDonutHTML`, `_dashSimpleBarHTML`)
  that a stale comment described as in-use but had 0 call sites
- 7 orphaned functions: `computeKanbanStatusForApproval`, `_teeAddAssignRow`,
  `renderAvatar`, `changePlannerDay`, `focusSticky`, `closeModal`,
  `addStickyNote`

**Restructuring**
- All CSS (one main block + two small page-specific `<style>` blocks)
  consolidated into `css/styles.css`.
- The ~11,300-line inline `<script>` split into 22 files under `js/`,
  grouped by feature (see numbering below), plus the dashboard's own
  small script as a 23rd file. Verified two ways: every file parses on
  its own (`node --check`), and concatenating all 22 in order reproduces
  the original script byte-for-byte — the split changed nothing about
  execution order or behavior.

## File map

| File | Contents |
|---|---|
| 01-constants-and-colors.js | Config, color palettes, status/priority constants |
| 02-person-detail-modal.js | Person Detail modal + its filter/schedule system |
| 03-data-sync-and-parsing.js | Sheet API, parsing, directories/tags config, sync engine |
| 04-render-all-chip-badge-system.js | `renderAll()`, subtasks, unified chip & badge system |
| 05-status-priority-engine.js | Quick status/priority change, approval engine, category progress strip |
| 06-tee-form-dropdowns.js | Add/Edit item status, priority and type dropdowns |
| 07-people-picker.js | People picker widget for assigning items |
| 08-assignee-and-person-helpers.js | Assignee-stack rendering, person-active-today helpers |
| 09-page-people.js | People page |
| 10-page-overview.js | Today/Overview page |
| 11-page-planner.js | Planner page |
| 12-page-reminders.js | Reminders page |
| 13-sticky-notes.js | Floating sticky notes layer + drag logic |
| 14-page-dashboard.js | Dashboard page: chart renderers, category matrix, `renderDashboard` |
| 15-page-kanban.js | Kanban page + archive drawer |
| 16-page-resources.js | Resources/Directories page |
| 17-nav-filters-fab-tags.js | Shared nav stack, page filters, FAB, clickable tags |
| 18-tee-detail-view.js | Item detail view + type-zone helpers |
| 19-tee-add-edit-modal.js | Add/Edit item modal + tag chip entry |
| 20-tee-links-editor.js | Item links editor |
| 21-tee-delete-and-people-modals.js | Delete confirmation + people/team member modals |
| 22-kanban-dnd-nav-theme-init.js | Kanban drag & drop, nav/theme, app `init()` |
| 23-dashboard-task-drive.js | Fills in the Dashboard's Tasks/pie panel and Drive Links panel |

Load order in `index.html` matches this table — same order the code ran
in as one file, so nothing about execution changed, just the organization.

## Found, but deliberately not touched

- **`openTagColorEditor`** and **`_dashCategoryProgressSectionHTML`**
  (in 05 and 14) are fully-built but never called anywhere. They read like
  unfinished features (a tag color editor; an extra "Categories Progress"
  dashboard section) rather than leftover cruft, so I left them in place
  instead of guessing whether to wire them up or delete them — let me know
  which you'd like.
- A handful of DOM ids (`tee-status`, `df-tags`, etc.) repeat 2-3 times
  across different modal-type templates. They're mutually exclusive at
  runtime (only one type's markup is ever live at once), so not an active
  bug, but it's fragile — worth a proper namespacing pass if those modals
  ever need to coexist.
- The many hardcoded hex colors in `01-constants-and-colors.js` and
  elsewhere looked at first like they should be `var(--green)` etc.
  instead — but they're a deliberate, hand-tuned dark/light color pairing
  system (`{dark: '#...', light: '#...'}`) used by the JS-side theme
  switch, not a duplicate of the CSS variables. Left as-is.

## Not done

I don't have a way to actually render this in a browser from here (no
network, no headless browser tool), so I limited "visual polish" to
things verifiable by reading the code — fixing the corrupted markup and
checking for other nested-card patterns (found none). I did not attempt
a subjective redesign (spacing, layout, color scheme changes) since I
can't see the result to know if it's actually better.
