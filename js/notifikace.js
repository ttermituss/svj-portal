/* ===== NOTIFIKACE BADGE + DROPDOWN ===== */

var NotifBadge = (function() {
  var pollInterval = null;
  var panelOpen = false;
  var badgeEl = null;
  var wrapEl = null;

  function init() {
    if (!Auth.isLoggedIn()) return;
    var header = document.querySelector('.header');
    if (!header) return;

    // Wrapper
    wrapEl = document.createElement('div');
    wrapEl.style.cssText = 'position:relative;margin-right:8px;';

    // Bell button
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary';
    btn.style.cssText = 'position:relative;padding:6px 10px;font-size:1.2rem;min-width:40px;min-height:40px;';
    btn.textContent = '\uD83D\uDD14';
    btn.title = 'Notifikace';

    // Badge count
    badgeEl = document.createElement('span');
    badgeEl.style.cssText = 'position:absolute;top:-4px;right:-4px;background:var(--danger,#e53e3e);color:#fff;'
      + 'font-size:0.65rem;font-weight:700;min-width:18px;height:18px;border-radius:9px;'
      + 'display:none;align-items:center;justify-content:center;padding:0 4px;';
    btn.appendChild(badgeEl);

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (panelOpen) {
        closePanel();
      } else {
        openPanel();
      }
    });

    wrapEl.appendChild(btn);

    // Insert before theme switcher
    var themeSw = header.querySelector('.theme-sw');
    if (themeSw) {
      header.insertBefore(wrapEl, themeSw);
    } else {
      header.appendChild(wrapEl);
    }

    // Close on outside click
    document.addEventListener('click', function() {
      if (panelOpen) closePanel();
    });

    // Initial count
    refreshCount();

    // Poll every 60s
    pollInterval = setInterval(refreshCount, 60000);
  }

  function refreshCount() {
    if (!Auth.isLoggedIn()) return;
    Api.apiGet('api/notifikace.php?action=count')
      .then(function(data) {
        var c = data.count || 0;
        if (badgeEl) {
          badgeEl.textContent = c > 99 ? '99+' : c;
          badgeEl.style.display = c > 0 ? 'flex' : 'none';
        }
      })
      .catch(function() { /* silent */ });
  }

  function openPanel() {
    closePanel();
    panelOpen = true;

    var panel = document.createElement('div');
    panel.id = 'notif-panel';
    panel.style.cssText = 'position:absolute;top:calc(100% + 8px);right:0;width:340px;max-height:420px;'
      + 'background:var(--bg-card);border:1px solid var(--border);border-radius:10px;'
      + 'box-shadow:0 12px 40px rgba(0,0,0,0.18);overflow:hidden;z-index:1001;';
    panel.addEventListener('click', function(e) { e.stopPropagation(); });

    // Header
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px;'
      + 'border-bottom:1px solid var(--border);';
    var hdrTitle = document.createElement('span');
    hdrTitle.style.cssText = 'font-weight:600;font-size:0.95rem;';
    hdrTitle.textContent = 'Notifikace';
    hdr.appendChild(hdrTitle);

    var readAllBtn = document.createElement('button');
    readAllBtn.type = 'button';
    readAllBtn.className = 'btn btn-sm';
    readAllBtn.style.cssText = 'font-size:0.75rem;padding:3px 8px;';
    readAllBtn.textContent = 'Ozna\u010dit v\u0161e';
    readAllBtn.addEventListener('click', function() {
      Api.apiPost('api/notifikace.php?action=readAll', {}).then(function() {
        refreshCount();
        loadNotifList(panel);
      });
    });
    hdr.appendChild(readAllBtn);
    panel.appendChild(hdr);

    // List container
    var list = document.createElement('div');
    list.style.cssText = 'overflow-y:auto;max-height:360px;';
    list.id = 'notif-list';
    panel.appendChild(list);

    wrapEl.appendChild(panel);
    loadNotifList(panel);
  }

  function loadNotifList(panel) {
    var list = panel.querySelector('#notif-list');
    if (!list) return;
    list.replaceChildren();

    var loading = document.createElement('div');
    loading.style.cssText = 'text-align:center;padding:20px;color:var(--text-light);font-size:0.85rem;';
    loading.textContent = 'Na\u010d\u00edt\u00e1m\u2026';
    list.appendChild(loading);

    Api.apiGet('api/notifikace.php?action=list')
      .then(function(data) {
        list.replaceChildren();
        var items = data.notifikace || [];
        if (!items.length) {
          var empty = document.createElement('div');
          empty.style.cssText = 'text-align:center;padding:28px 16px;color:var(--text-light);font-size:0.85rem;';
          empty.textContent = '\u017d\u00e1dn\u00e9 notifikace.';
          list.appendChild(empty);
          return;
        }
        items.forEach(function(n) { list.appendChild(renderNotifItem(n)); });
      })
      .catch(function() {
        list.replaceChildren();
        var err = document.createElement('div');
        err.style.cssText = 'text-align:center;padding:20px;color:var(--danger);font-size:0.85rem;';
        err.textContent = 'Chyba na\u010d\u00edt\u00e1n\u00ed.';
        list.appendChild(err);
      });
  }

  var NOTIF_ICONS = {
    udalost:  '\uD83D\uDCC5',
    zavada:   '\u26A0\uFE0F',
    hlasovani:'\uD83D\uDDF3\uFE0F',
    revize:   '\uD83D\uDD27',
    dokument: '\uD83D\uDCC4',
    fond:     '\uD83D\uDCB0',
  };

  function renderNotifItem(n) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:10px 16px;'
      + 'border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s;'
      + (n.precteno == 0 ? 'background:var(--bg-hover);' : '');

    row.addEventListener('mouseenter', function() { row.style.background = 'var(--bg-hover)'; });
    row.addEventListener('mouseleave', function() {
      row.style.background = n.precteno == 0 ? 'var(--bg-hover)' : '';
    });

    var icon = document.createElement('span');
    icon.style.cssText = 'font-size:1.1rem;flex-shrink:0;margin-top:2px;';
    icon.textContent = NOTIF_ICONS[n.typ] || '\uD83D\uDD14';
    row.appendChild(icon);

    var content = document.createElement('div');
    content.style.cssText = 'flex:1;min-width:0;';
    var titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:0.85rem;font-weight:' + (n.precteno == 0 ? '600' : '400') + ';';
    titleEl.textContent = n.nazev;
    content.appendChild(titleEl);

    if (n.detail) {
      var detailEl = document.createElement('div');
      detailEl.style.cssText = 'font-size:0.78rem;color:var(--text-light);margin-top:2px;';
      detailEl.textContent = n.detail;
      content.appendChild(detailEl);
    }

    var timeEl = document.createElement('div');
    timeEl.style.cssText = 'font-size:0.72rem;color:var(--text-light);margin-top:3px;';
    timeEl.textContent = formatNotifTime(n.created_at);
    content.appendChild(timeEl);

    row.appendChild(content);

    if (n.precteno == 0) {
      var dot = document.createElement('div');
      dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:6px;';
      row.appendChild(dot);
    }

    row.addEventListener('click', function() {
      // Mark as read
      if (n.precteno == 0) {
        Api.apiPost('api/notifikace.php?action=read', { id: n.id }).then(refreshCount);
        n.precteno = 1;
        row.style.background = '';
        titleEl.style.fontWeight = '400';
        if (dot && dot.parentNode) dot.parentNode.removeChild(dot);
      }
      // Navigate
      if (n.odkaz_hash) {
        var page = n.odkaz_hash.split('#')[0];
        if (page) Router.navigate(page);
      }
      closePanel();
    });

    return row;
  }

  function formatNotifTime(ts) {
    if (!ts) return '';
    var d = new Date(ts.replace(' ', 'T'));
    var now = new Date();
    var diff = Math.floor((now - d) / 60000);
    if (diff < 1) return 'pr\u00e1v\u011b te\u010f';
    if (diff < 60) return diff + ' min';
    var hours = Math.floor(diff / 60);
    if (hours < 24) return hours + ' hod';
    var days = Math.floor(hours / 24);
    if (days < 7) return days + ' dn\u00ed';
    return d.toLocaleDateString('cs-CZ');
  }

  function closePanel() {
    panelOpen = false;
    var panel = document.getElementById('notif-panel');
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
  }

  function destroy() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    closePanel();
    if (wrapEl && wrapEl.parentNode) wrapEl.parentNode.removeChild(wrapEl);
    wrapEl = null;
    badgeEl = null;
  }

  return { init: init, refreshCount: refreshCount, destroy: destroy };
})();
