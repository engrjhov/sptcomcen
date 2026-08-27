(function(){
  function esc(v){
    return typeof _escapeTEEAttr === 'function'
      ? _escapeTEEAttr(String(v ?? ''))
      : String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function taskTypeLabel(type){
    const t = String(type || 'Task').toLowerCase();
    if(t === 'ideal') return 'Ideal';
    if(t === 'temporary') return 'Temporary';
    if(t === 'event') return 'Event';
    if(t === 'entry') return 'Entry';
    return 'Task';
  }

  // Shared by both the pie chart and the list below it, so the two never
  // drift out of sync with each other.
  function getDashboardTasks(){
    const items = Array.isArray(STATE.items) ? STATE.items : [];
    return items.filter(x => {
      const t = String(x?.type || '').toLowerCase();
      return ['task','ideal','temporary'].includes(t);
    });
  }

  function renderDashboardTaskPie(tasks){
    const el = document.getElementById('dashboardTaskTypePie');
    if(!el || typeof _dashTaskTypePieHTML !== 'function') return;

    // No separate "no data" message here — the task list right below
    // already shows one, so an empty pie just renders nothing.
    if(!tasks.length){ el.innerHTML = ''; return; }

    const counts = { ideal: 0, temporary: 0, task: 0 };
    tasks.forEach(item => {
      const t = String(item?.type || '').toLowerCase();
      if(counts[t] !== undefined) counts[t]++;
    });
    const segments = [
      { label:'Ideal', value:counts.ideal, color:'var(--green)' },
      { label:'Temporary', value:counts.temporary, color:'var(--orange)' },
      { label:'Task', value:counts.task, color:'var(--accent)' },
    ];
    el.innerHTML = _dashTaskTypePieHTML(segments);
  }

  function renderDashboardTaskData(){
    const el = document.getElementById('dashboardTaskTypeData');
    if(!el) return;

    const tasks = getDashboardTasks();
    renderDashboardTaskPie(tasks);

    if(!tasks.length){
      el.innerHTML = '<div class="dash-chart-empty">No task data available.</div>';
      return;
    }

    el.innerHTML = tasks.map(item => {
      const title = item.title || 'Untitled task';
      const type = taskTypeLabel(item.type);
      const status = item.status || 'NOT STARTED';
      const store = [item.storeCode, item.storeName].filter(Boolean).join(' — ');
      const category = item.category || '';
      const due = item.dueDate || '';
      const meta = [store, category, due ? 'Due ' + due : ''].filter(Boolean).join(' • ');
      return `<div class="dashboard-task-row">
        <div class="dashboard-task-row-main">
          <div class="dashboard-task-title">${esc(title)}</div>
          ${meta ? `<div class="dashboard-task-meta">${esc(meta)}</div>` : ''}
        </div>
        <span class="dashboard-task-badge">${esc(type)}</span>
        <span class="dashboard-task-badge">${esc(status)}</span>
      </div>`;
    }).join('');
  }

  let dashboardDriveRows = [];

  function getDriveRows(){
    const folders = Array.isArray(STATE.folders) ? STATE.folders : [];
    const files = Array.isArray(STATE.files) ? STATE.files : [];
    return [...folders, ...files].filter(x => {
      const url = x?.url || x?.URL || x?.link || x?.Link;
      return typeof url === 'string' && /^https?:\/\//i.test(url);
    });
  }

  function renderDashboardDriveLinks(filter=''){
    const el = document.getElementById('dashboardDriveLinks');
    if(!el) return;

    const q = String(filter || '').trim().toLowerCase();
    const rows = dashboardDriveRows.filter(x => {
      if(!q) return true;
      const title = x.name || x.Name || x.title || x.Title || '';
      const desc = x.description || x.Description || '';
      const url = x.url || x.URL || x.link || x.Link || '';
      return [title, desc, url].join(' ').toLowerCase().includes(q);
    });

    if(!rows.length){
      el.innerHTML = `<div class="dash-chart-empty">${q ? 'No matching links found.' : 'No Google Drive links found in 📁 Folders & Files.'}</div>`;
      return;
    }

    el.innerHTML = rows.map(x => {
      const url = x.url || x.URL || x.link || x.Link;
      const title = x.name || x.Name || x.title || x.Title || 'Google Drive file';
      const desc = x.description || x.Description || '';
      return `<a class="dashboard-drive-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="${esc(title)}">
        <span style="font-size:18px">📁</span>
        <span style="min-width:0;flex:1">
          <div class="dashboard-drive-link-title">${esc(title)}</div>
          ${desc ? `<div class="dashboard-drive-link-meta">${esc(desc)}</div>` : ''}
        </span>
        <span style="font-size:12px;color:var(--muted)">↗</span>
      </a>`;
    }).join('');
  }

  function renderDashboardTaskDrive(){
    dashboardDriveRows = getDriveRows();
    renderDashboardTaskData();
    renderDashboardDriveLinks(document.getElementById('dashboardDriveSearch')?.value || '');
  }

  document.addEventListener('input', function(e){
    if(e.target?.id === 'dashboardDriveSearch'){
      renderDashboardDriveLinks(e.target.value);
    }
  });

  // Refresh both panels whenever the existing app render cycle runs.
  if(typeof renderAll === 'function'){
    const originalRenderAll = renderAll;
    renderAll = function(){
      const result = originalRenderAll.apply(this, arguments);
      setTimeout(renderDashboardTaskDrive, 0);
      return result;
    };
  }

  setTimeout(renderDashboardTaskDrive, 0);
})();
