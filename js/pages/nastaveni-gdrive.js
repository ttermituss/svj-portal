/* ===== Google Drive — karta pro správu GDrive úložiště ===== */

function renderGdriveStorageCard(el, user) {
  if (!user.svj_id) return;
  var isAdmin = user.role === 'admin';
  var isPriv = isAdmin || user.role === 'vybor';
  if (!isPriv) return;

  var card = makeAdminCard('Google Drive \xfalo\u017ei\u0161t\u011b');
  var body = card.body;

  var hint = document.createElement('p');
  hint.style.cssText = 'margin:0 0 14px;font-size:0.88rem;color:var(--text-light);';
  hint.textContent = 'Soubory se ukl\xe1daj\xed lok\xe1ln\u011b i na Google Drive. GDrive slou\u017e\xed jako z\xe1loha a umo\u017e\u0148uje sd\xedlen\xed.';
  body.appendChild(hint);

  var statusWrap = document.createElement('div');
  statusWrap.style.marginBottom = '16px';
  body.appendChild(statusWrap);

  var controlsWrap = document.createElement('div');
  controlsWrap.style.marginBottom = '16px';
  body.appendChild(controlsWrap);

  var syncWrap = document.createElement('div');
  body.appendChild(syncWrap);

  el.appendChild(card.card);

  loadGdriveStatus(statusWrap, controlsWrap, syncWrap, isAdmin);
}

function loadGdriveStatus(statusWrap, controlsWrap, syncWrap, isAdmin) {
  statusWrap.replaceChildren();
  controlsWrap.replaceChildren();
  syncWrap.replaceChildren();

  var loading = document.createElement('div');
  loading.style.cssText = 'color:var(--text-light);font-size:0.88rem;';
  loading.textContent = 'Na\u010d\xedt\xe1m stav\u2026';
  statusWrap.appendChild(loading);

  Api.apiGet('api/google_drive.php?action=status')
    .then(function(data) {
      statusWrap.replaceChildren();
      renderGdriveStatusBadges(statusWrap, data);
      renderGdriveControls(controlsWrap, data, isAdmin, statusWrap, syncWrap);
      if (data.enabled && data.google_connected) {
        renderGdriveSyncPanel(syncWrap, data);
      }
    })
    .catch(function(e) {
      statusWrap.replaceChildren();
      var err = document.createElement('div');
      err.className = 'info-box info-box-danger';
      err.textContent = e.message || 'Nepoda\u0159ilo se na\u010d\xedst stav GDrive.';
      statusWrap.appendChild(err);
    });
}

function renderGdriveStatusBadges(wrap, data) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;';

  var items = [
    { ok: data.google_connected, yes: 'Google p\u0159ipojen', no: 'Google nep\u0159ipojen' },
    { ok: data.enabled, yes: 'GDrive aktivn\xed', no: 'GDrive neaktivn\xed' },
    { ok: data.folder_created, yes: 'Slo\u017eka vytvo\u0159ena', no: 'Slo\u017eka nevytvo\u0159ena' },
  ];

  items.forEach(function(item) {
    var badge = document.createElement('span');
    badge.className = 'badge ' + (item.ok ? 'badge-success' : 'badge-warning');
    badge.textContent = (item.ok ? '\u2705 ' : '\u26a0\ufe0f ') + (item.ok ? item.yes : item.no);
    badge.style.fontSize = '0.85rem';
    row.appendChild(badge);
  });

  wrap.appendChild(row);

  if (data.total_files > 0) {
    var stats = document.createElement('div');
    stats.style.cssText = 'font-size:0.85rem;color:var(--text-light);';
    stats.textContent = 'Soubor\u016f celkem: ' + data.total_files +
      ' \xb7 Synchronizov\xe1no: ' + data.synced_files +
      ' \xb7 Nesynchronizov\xe1no: ' + (data.total_files - data.synced_files);
    wrap.appendChild(stats);
  }
}

function renderGdriveControls(wrap, data, isAdmin, statusWrap, syncWrap) {
  if (!data.google_connected) {
    var info = document.createElement('div');
    info.className = 'info-box info-box-warning';
    info.style.margin = '0 0 12px';
    info.textContent = 'Nejd\u0159\xedve p\u0159ipojte Google \xfa\u010det v Nastaven\xed \u2192 Google integrace.';
    wrap.appendChild(info);
    return;
  }

  if (!isAdmin) return;

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

  if (!data.enabled) {
    var enableBtn = document.createElement('button');
    enableBtn.className = 'btn btn-primary';
    enableBtn.textContent = 'Aktivovat Google Drive';
    enableBtn.addEventListener('click', function() {
      enableBtn.disabled = true;
      enableBtn.textContent = 'Aktivuji\u2026';
      Api.apiPost('api/google_drive.php?action=enable')
        .then(function() {
          showToast('Google Drive \xfalo\u017ei\u0161t\u011b aktivov\xe1no');
          loadGdriveStatus(statusWrap, wrap, syncWrap, isAdmin);
        })
        .catch(function(e) {
          showToast(e.message || 'Chyba', 'error');
          enableBtn.disabled = false;
          enableBtn.textContent = 'Aktivovat Google Drive';
        });
    });
    btnRow.appendChild(enableBtn);
  } else {
    var disableBtn = document.createElement('button');
    disableBtn.className = 'btn btn-secondary';
    disableBtn.textContent = 'Deaktivovat GDrive';
    disableBtn.addEventListener('click', function() {
      showConfirmModal(
        'Deaktivovat Google Drive?',
        'Soubory z\u016fstanou na obou m\xedstech. Nov\xe9 uploady se budou ukl\xe1dat jen lok\xe1ln\u011b.',
        function() {
          Api.apiPost('api/google_drive.php?action=disable')
            .then(function() {
              showToast('GDrive deaktivov\xe1no');
              loadGdriveStatus(statusWrap, wrap, syncWrap, isAdmin);
            })
            .catch(function(e) { showToast(e.message || 'Chyba', 'error'); });
        }
      );
    });
    btnRow.appendChild(disableBtn);

    // Odkaz na GDrive folder
    if (data.svj_folder_id) {
      var folderLink = document.createElement('a');
      folderLink.className = 'btn btn-secondary';
      folderLink.href = 'https://drive.google.com/drive/folders/' + data.svj_folder_id;
      folderLink.target = '_blank';
      folderLink.rel = 'noopener noreferrer';
      folderLink.textContent = '\uD83D\uDCC2 Otev\u0159\xedt na Google Drive';
      btnRow.appendChild(folderLink);
    }
  }

  wrap.appendChild(btnRow);
}

function renderGdriveSyncPanel(wrap, data) {
  wrap.replaceChildren();

  var h3 = document.createElement('h3');
  h3.style.cssText = 'font-size:0.95rem;font-weight:600;margin:16px 0 10px;';
  h3.textContent = 'Synchronizace modul\u016f';
  wrap.appendChild(h3);

  var moduleNames = {
    dokumenty: 'Dokumenty', revize: 'Revize', fond: 'Fond oprav',
    zavady: 'Z\xe1vady', penb: 'PENB', datovka: 'Datovka', avatar: 'Avatary'
  };

  var modules = data.modules || [];
  if (!modules.length) {
    var empty = document.createElement('div');
    empty.style.cssText = 'font-size:0.85rem;color:var(--text-light);';
    empty.textContent = '\u017d\xe1dn\xe9 soubory k synchronizaci.';
    wrap.appendChild(empty);
    return;
  }

  var table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.88rem;margin-bottom:12px;';

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  ['Modul', 'Stav', 'Akce'].forEach(function(col) {
    var th = document.createElement('th');
    th.textContent = col;
    th.style.cssText = 'text-align:left;padding:8px 10px;border-bottom:2px solid var(--border);color:var(--text-light);font-weight:600;';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  modules.forEach(function(mod) {
    var tr = document.createElement('tr');

    var tdName = document.createElement('td');
    tdName.style.cssText = 'padding:8px 10px;border-bottom:1px solid var(--border);font-weight:500;';
    tdName.textContent = moduleNames[mod.module] || mod.module;

    var tdStatus = document.createElement('td');
    tdStatus.style.cssText = 'padding:8px 10px;border-bottom:1px solid var(--border);';
    var total = parseInt(mod.total, 10);
    var synced = parseInt(mod.synced, 10);
    var remaining = total - synced;

    var progressWrap = document.createElement('div');
    progressWrap.style.cssText = 'display:flex;align-items:center;gap:8px;';

    var bar = document.createElement('div');
    bar.style.cssText = 'flex:1;height:8px;background:var(--bg-hover);border-radius:4px;overflow:hidden;min-width:60px;';
    var fill = document.createElement('div');
    var pct = total > 0 ? Math.round(synced / total * 100) : 100;
    fill.style.cssText = 'height:100%;border-radius:4px;background:' +
      (pct === 100 ? 'var(--success)' : 'var(--primary)') + ';width:' + pct + '%;transition:width 0.3s;';
    bar.appendChild(fill);

    var label = document.createElement('span');
    label.style.cssText = 'font-size:0.82rem;color:var(--text-light);white-space:nowrap;';
    label.textContent = synced + '/' + total;
    if (remaining === 0) label.textContent += ' \u2705';

    progressWrap.appendChild(bar);
    progressWrap.appendChild(label);
    tdStatus.appendChild(progressWrap);

    var tdAction = document.createElement('td');
    tdAction.style.cssText = 'padding:8px 10px;border-bottom:1px solid var(--border);';

    if (remaining > 0) {
      var syncBtn = document.createElement('button');
      syncBtn.className = 'btn btn-secondary btn-sm';
      syncBtn.textContent = 'Synchronizovat';
      syncBtn.addEventListener('click', function() {
        syncBtn.disabled = true;
        syncBtn.textContent = 'Synchronizuji\u2026';
        gdriveRunSync(mod.module, syncBtn, fill, label, total);
      });
      tdAction.appendChild(syncBtn);
    } else {
      tdAction.textContent = '\u2014';
    }

    tr.appendChild(tdName);
    tr.appendChild(tdStatus);
    tr.appendChild(tdAction);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);

  // Sync all button
  var unsyncedTotal = modules.reduce(function(sum, m) {
    return sum + (parseInt(m.total, 10) - parseInt(m.synced, 10));
  }, 0);

  if (unsyncedTotal > 0) {
    var syncAllBtn = document.createElement('button');
    syncAllBtn.className = 'btn btn-primary';
    syncAllBtn.textContent = 'Synchronizovat v\u0161e (' + unsyncedTotal + ' soubor\u016f)';
    syncAllBtn.addEventListener('click', function() {
      syncAllBtn.disabled = true;
      syncAllBtn.textContent = 'Synchronizuji\u2026';
      gdriveRunSyncAll(syncAllBtn);
    });
    wrap.appendChild(syncAllBtn);
  }
}

function gdriveRunSync(module, btn, fillEl, labelEl, total) {
  Api.apiPost('api/google_drive.php?action=syncStart', { module: module, limit: 20 })
    .then(function(data) {
      var newSynced = total - data.remaining;
      var pct = total > 0 ? Math.round(newSynced / total * 100) : 100;
      if (fillEl) fillEl.style.width = pct + '%';
      if (labelEl) {
        labelEl.textContent = newSynced + '/' + total;
        if (data.remaining === 0) labelEl.textContent += ' \u2705';
      }
      showToast('Synchronizov\xe1no ' + data.synced + ' soubor\u016f' +
        (data.remaining > 0 ? ', zb\xfdv\xe1 ' + data.remaining : ''));

      if (data.remaining > 0) {
        btn.disabled = false;
        btn.textContent = 'Pokra\u010dovat (' + data.remaining + ')';
      } else {
        btn.textContent = 'Hotovo \u2705';
      }
    })
    .catch(function(e) {
      showToast(e.message || 'Chyba p\u0159i synchronizaci', 'error');
      btn.disabled = false;
      btn.textContent = 'Synchronizovat';
    });
}

function gdriveRunSyncAll(btn) {
  Api.apiPost('api/google_drive.php?action=syncStart', { module: 'all', limit: 50 })
    .then(function(data) {
      showToast('Synchronizov\xe1no ' + data.synced + ' soubor\u016f' +
        (data.remaining > 0 ? ', zb\xfdv\xe1 ' + data.remaining : ''));

      if (data.remaining > 0) {
        btn.disabled = false;
        btn.textContent = 'Pokra\u010dovat (' + data.remaining + ' zb\xfdv\xe1)';
      } else {
        btn.disabled = false;
        btn.textContent = 'V\u0161e synchronizov\xe1no \u2705';
      }
    })
    .catch(function(e) {
      showToast(e.message || 'Chyba', 'error');
      btn.disabled = false;
      btn.textContent = 'Synchronizovat v\u0161e';
    });
}
