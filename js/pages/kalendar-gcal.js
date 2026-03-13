/* ===== GOOGLE CALENDAR SYNC MODAL ===== */

function openGcalSyncModal(rok, mesic, onDone) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;'
    + 'display:flex;align-items:center;justify-content:center;padding:16px;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:var(--radius-lg);'
    + 'width:100%;max-width:520px;max-height:85vh;display:flex;flex-direction:column;'
    + 'box-shadow:var(--shadow-lg);';

  // Header
  var header = document.createElement('div');
  header.style.cssText = 'padding:16px 20px;border-bottom:1px solid var(--border-light);'
    + 'display:flex;justify-content:space-between;align-items:center;';
  var titleEl = document.createElement('h3');
  titleEl.style.cssText = 'margin:0;font-size:1rem;';
  titleEl.textContent = '\uD83D\uDD04 Google Calendar sync';
  header.appendChild(titleEl);

  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.style.cssText = 'background:none;border:none;font-size:1.3rem;cursor:pointer;'
    + 'color:var(--text-light);padding:0;';
  closeBtn.textContent = '\u00d7';
  closeBtn.addEventListener('click', function() { overlay.remove(); });
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // Body
  var body = document.createElement('div');
  body.style.cssText = 'padding:20px;overflow-y:auto;flex:1;';
  modal.appendChild(body);

  overlay.appendChild(modal);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  renderGcalSyncContent(body, rok, mesic, overlay, onDone);
}

function renderGcalSyncContent(body, rok, mesic, overlay, onDone) {
  // Push sekce
  var pushSection = document.createElement('div');
  pushSection.style.cssText = 'margin-bottom:20px;';

  var pushTitle = document.createElement('div');
  pushTitle.style.cssText = 'font-weight:600;font-size:0.92rem;margin-bottom:8px;';
  pushTitle.textContent = '\u2B06 Odeslat ud\u00e1losti do Google';
  pushSection.appendChild(pushTitle);

  var pushDesc = document.createElement('p');
  pushDesc.style.cssText = 'font-size:0.85rem;color:var(--text-light);margin:0 0 12px;line-height:1.5;';
  pushDesc.textContent = 'Ode\u0161le v\u0161echny vlastn\u00ed ud\u00e1losti z port\u00e1lu do va\u0161eho Google Calendar.';
  pushSection.appendChild(pushDesc);

  var pushBtn = document.createElement('button');
  pushBtn.type = 'button';
  pushBtn.className = 'btn btn-primary';
  pushBtn.style.cssText = 'font-size:0.88rem;';
  pushBtn.textContent = 'Synchronizovat do Google';
  pushSection.appendChild(pushBtn);

  var pushResult = document.createElement('div');
  pushResult.style.cssText = 'margin-top:10px;font-size:0.85rem;display:none;';
  pushSection.appendChild(pushResult);

  pushBtn.addEventListener('click', function() {
    pushBtn.disabled = true;
    pushBtn.textContent = 'Synchronizuji\u2026';
    pushResult.style.display = 'none';

    Api.apiPost('api/google_calendar.php?action=syncPushAll', {})
      .then(function(d) {
        pushResult.style.display = '';
        pushResult.style.color = 'var(--accent-text)';
        pushResult.textContent = 'Synchronizov\u00e1no: ' + d.synced + ' ud\u00e1lost\u00ed'
          + (d.errors ? ' (' + d.errors + ' chyb)' : '');
        if (d.synced > 0) showToast('Ud\u00e1losti synchronizov\u00e1ny do Google.', 'success');
      })
      .catch(function(e) {
        pushResult.style.display = '';
        pushResult.style.color = 'var(--danger)';
        pushResult.textContent = e.message || 'Chyba synchronizace.';
      })
      .finally(function() {
        pushBtn.disabled = false;
        pushBtn.textContent = 'Synchronizovat do Google';
      });
  });

  body.appendChild(pushSection);

  // Oddělovač
  var sep = document.createElement('div');
  sep.style.cssText = 'border-top:1px solid var(--border-light);margin:4px 0 20px;';
  body.appendChild(sep);

  // Pull sekce
  var pullSection = document.createElement('div');

  var pullTitle = document.createElement('div');
  pullTitle.style.cssText = 'font-weight:600;font-size:0.92rem;margin-bottom:8px;';
  pullTitle.textContent = '\u2B07 Na\u010d\u00edst z Google Calendar';
  pullSection.appendChild(pullTitle);

  var pullDesc = document.createElement('p');
  pullDesc.style.cssText = 'font-size:0.85rem;color:var(--text-light);margin:0 0 12px;line-height:1.5;';
  pullDesc.textContent = 'Zobraz\u00ed ud\u00e1losti z va\u0161eho Google Calendar pro aktu\u00e1ln\u00ed m\u011bs\u00edc.';
  pullSection.appendChild(pullDesc);

  var pullBtn = document.createElement('button');
  pullBtn.type = 'button';
  pullBtn.className = 'btn btn-secondary';
  pullBtn.style.cssText = 'font-size:0.88rem;';
  pullBtn.textContent = 'Na\u010d\u00edst z Google';
  pullSection.appendChild(pullBtn);

  var pullList = document.createElement('div');
  pullList.style.cssText = 'margin-top:12px;';
  pullSection.appendChild(pullList);

  pullBtn.addEventListener('click', function() {
    pullBtn.disabled = true;
    pullBtn.textContent = 'Na\u010d\u00edt\u00e1m\u2026';
    pullList.innerHTML = '';

    Api.apiPost('api/google_calendar.php?action=syncPull', { rok: rok, mesic: mesic })
      .then(function(d) {
        if (!d.events || d.events.length === 0) {
          pullList.textContent = '\u017d\u00e1dn\u00e9 ud\u00e1losti v Google Calendar pro tento m\u011bs\u00edc.';
          pullList.style.cssText += 'color:var(--text-light);font-size:0.85rem;';
          return;
        }

        d.events.forEach(function(ev) {
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 0;'
            + 'border-bottom:1px solid var(--border-light);font-size:0.85rem;';

          var dateStr = formatGcalDate(ev.start, ev.allDay);
          var dateEl = document.createElement('span');
          dateEl.style.cssText = 'color:var(--text-light);min-width:70px;flex-shrink:0;font-size:0.82rem;';
          dateEl.textContent = dateStr;
          row.appendChild(dateEl);

          var name = document.createElement('span');
          name.style.cssText = 'flex:1;';
          name.textContent = ev.summary;
          row.appendChild(name);

          if (ev.htmlLink) {
            var link = document.createElement('a');
            link.href = ev.htmlLink;
            link.target = '_blank';
            link.rel = 'noopener';
            link.style.cssText = 'font-size:0.82rem;color:var(--info);text-decoration:none;flex-shrink:0;';
            link.textContent = 'Otev\u0159\u00edt';
            row.appendChild(link);
          }

          pullList.appendChild(row);
        });
      })
      .catch(function(e) {
        pullList.textContent = e.message || 'Chyba.';
        pullList.style.color = 'var(--danger)';
      })
      .finally(function() {
        pullBtn.disabled = false;
        pullBtn.textContent = 'Na\u010d\u00edst z Google';
      });
  });

  body.appendChild(pullSection);

  // Webhook sekce
  var webhookSep = document.createElement('div');
  webhookSep.style.cssText = 'border-top:1px solid var(--border-light);margin:4px 0 20px;';
  body.appendChild(webhookSep);

  renderGcalWebhookSection(body);
}

/* ===== WEBHOOK SECTION ===== */

function renderGcalWebhookSection(body) {
  var section = document.createElement('div');

  var title = document.createElement('div');
  title.style.cssText = 'font-weight:600;font-size:0.92rem;margin-bottom:8px;';
  title.textContent = '\uD83D\uDD14 Automatick\u00e1 synchronizace (webhooky)';
  section.appendChild(title);

  var desc = document.createElement('p');
  desc.style.cssText = 'font-size:0.85rem;color:var(--text-light);margin:0 0 12px;line-height:1.5;';
  desc.textContent = 'Kdy\u017e zapnete webhooky, zm\u011bny v Google Calendar se automaticky projev\u00ed '
    + 'v port\u00e1lu \u2014 bez nutnosti ru\u010dn\u011b synchronizovat. Google po\u0161le notifikaci '
    + 'p\u0159i ka\u017ed\u00e9m p\u0159id\u00e1n\u00ed, \u00faprav\u011b nebo smaz\u00e1n\u00ed ud\u00e1losti.';
  section.appendChild(desc);

  var statusWrap = document.createElement('div');
  statusWrap.style.cssText = 'margin-bottom:12px;font-size:0.85rem;color:var(--text-light);';
  statusWrap.textContent = 'Na\u010d\u00edt\u00e1m stav\u2026';
  section.appendChild(statusWrap);

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;';
  section.appendChild(btnRow);

  Api.apiGet('api/google_calendar.php?action=watchStatus')
    .then(function(data) {
      statusWrap.textContent = '';

      if (data.active) {
        var badge = document.createElement('span');
        badge.className = 'badge badge-success';
        badge.style.fontSize = '0.82rem';
        badge.textContent = '\u2705 Webhook aktivn\u00ed';
        statusWrap.appendChild(badge);

        var exp = document.createElement('span');
        exp.style.cssText = 'margin-left:8px;font-size:0.82rem;color:var(--text-light);';
        exp.textContent = '(do ' + data.expiration + ')';
        statusWrap.appendChild(exp);

        var stopBtn = document.createElement('button');
        stopBtn.className = 'btn btn-secondary btn-sm';
        stopBtn.textContent = 'Vypnout webhook';
        stopBtn.addEventListener('click', function() {
          showConfirmModal(
            'Vypnout webhook?',
            'Zm\u011bny v Google Calendar se p\u0159estanou automaticky synchronizovat.',
            function() {
              Api.apiPost('api/google_calendar.php?action=watchStop')
                .then(function() {
                  showToast('Webhook vypnut');
                  statusWrap.textContent = '';
                  btnRow.textContent = '';
                  var offBadge = document.createElement('span');
                  offBadge.className = 'badge badge-warning';
                  offBadge.style.fontSize = '0.82rem';
                  offBadge.textContent = '\u26a0\ufe0f Webhook neaktivn\u00ed';
                  statusWrap.appendChild(offBadge);
                })
                .catch(function(e) { showToast(e.message || 'Chyba', 'error'); });
            }
          );
        });
        btnRow.appendChild(stopBtn);
      } else {
        var offBadge = document.createElement('span');
        offBadge.className = 'badge badge-warning';
        offBadge.style.fontSize = '0.82rem';
        offBadge.textContent = '\u26a0\ufe0f Webhook neaktivn\u00ed';
        statusWrap.appendChild(offBadge);

        var startBtn = document.createElement('button');
        startBtn.className = 'btn btn-primary btn-sm';
        startBtn.textContent = 'Zapnout webhook';
        startBtn.addEventListener('click', function() {
          startBtn.disabled = true;
          startBtn.textContent = 'Zapín\u00e1m\u2026';
          Api.apiPost('api/google_calendar.php?action=watchStart')
            .then(function(data) {
              showToast('Webhook zapnut (do ' + data.expiration + ')');
              statusWrap.textContent = '';
              btnRow.textContent = '';
              var onBadge = document.createElement('span');
              onBadge.className = 'badge badge-success';
              onBadge.style.fontSize = '0.82rem';
              onBadge.textContent = '\u2705 Webhook aktivn\u00ed';
              statusWrap.appendChild(onBadge);
              var expEl = document.createElement('span');
              expEl.style.cssText = 'margin-left:8px;font-size:0.82rem;color:var(--text-light);';
              expEl.textContent = '(do ' + data.expiration + ')';
              statusWrap.appendChild(expEl);
            })
            .catch(function(e) {
              showToast(e.message || 'Chyba', 'error');
              startBtn.disabled = false;
              startBtn.textContent = 'Zapnout webhook';
            });
        });
        btnRow.appendChild(startBtn);
      }
    })
    .catch(function() {
      statusWrap.textContent = '';
      var errBadge = document.createElement('span');
      errBadge.style.cssText = 'font-size:0.82rem;color:var(--text-light);';
      errBadge.textContent = 'Stav webhooky nedostupn\u00fd (vy\u017eaduje p\u0159ipojen\u00fd Google \u00fa\u010det)';
      statusWrap.appendChild(errBadge);
    });

  // Info box
  var infoBox = document.createElement('div');
  infoBox.className = 'info-box info-box-info';
  infoBox.style.cssText = 'font-size:0.82rem;line-height:1.5;margin-top:8px;';
  infoBox.textContent = '\uD83D\uDCA1 Webhooky vy\u017eaduj\u00ed HTTPS a nastavenou webhook URL v syst\u00e9mov\u00fdch nastaven\u00edch. '
    + 'Kan\u00e1l vypr\u0161\u00ed po 7 dnech \u2014 nastavte cron pro automatickou obnovu: '
    + 'php cli/google-calendar.php watch-renew';
  section.appendChild(infoBox);

  body.appendChild(section);
}

function formatGcalDate(dateStr, allDay) {
  if (!dateStr) return '';
  try {
    if (allDay) {
      var d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
    }
    var d = new Date(dateStr);
    return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })
      + ' ' + d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  } catch(e) { return dateStr; }
}
