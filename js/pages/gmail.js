/* ===== GMAIL — ČTENÍ INBOXU + ODESÍLÁNÍ ===== */

var GMAIL_PAGE_SIZE = 15;

Router.register('gmail', function(el) {
  var user = Auth.getUser();
  if (!user) { Router.navigate('login'); return; }
  var isPriv = isPrivileged(user);

  var title = document.createElement('div');
  title.className = 'page-title';
  var h1 = document.createElement('h1');
  h1.textContent = 'Gmail';
  var sub = document.createElement('p');
  sub.textContent = 'E-mailov\u00e1 schr\u00e1nka propojen\u00e9ho Google \u00fa\u010dtu';
  title.appendChild(h1);
  title.appendChild(sub);
  el.appendChild(title);

  // Ověřit připojení
  Api.apiGet('api/google_gmail.php?action=status')
    .then(function(data) {
      if (!data.connected) {
        renderGmailNotConnected(el);
        return;
      }
      sub.textContent = data.email || 'Gmail';
      renderGmailToolbar(el, isPriv);
      renderGmailInbox(el);
    })
    .catch(function() {
      renderGmailNotConnected(el);
    });
});

function renderGmailNotConnected(el) {
  var box = document.createElement('div');
  box.className = 'card';
  var body = document.createElement('div');
  body.className = 'card-body';
  body.style.textAlign = 'center';
  body.style.padding = '40px 20px';

  var icon = document.createElement('div');
  icon.style.cssText = 'font-size:2.5rem;margin-bottom:12px;';
  icon.textContent = '\uD83D\uDCE7';
  body.appendChild(icon);

  var msg = document.createElement('p');
  msg.style.cssText = 'color:var(--text-light);margin-bottom:16px;';
  msg.textContent = 'Pro pou\u017eit\u00ed Gmailu mus\u00edte nejd\u0159\u00edve propojit Google \u00fa\u010det v Nastaven\u00ed.';
  body.appendChild(msg);

  var btn = document.createElement('a');
  btn.href = '#nastaveni';
  btn.className = 'btn btn-primary';
  btn.textContent = 'P\u0159ejít do Nastaven\u00ed';
  body.appendChild(btn);

  box.appendChild(body);
  el.appendChild(box);
}

/* ===== TOOLBAR (hledání + nový email) ===== */

function renderGmailToolbar(el, isPriv) {
  var bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center;';

  var searchWrap = document.createElement('div');
  searchWrap.style.cssText = 'flex:1;min-width:200px;position:relative;';
  var searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'form-input';
  searchInput.placeholder = 'Hledat v e-mailech\u2026';
  searchInput.style.width = '100%';
  searchWrap.appendChild(searchInput);
  bar.appendChild(searchWrap);

  if (isPriv) {
    var composeBtn = document.createElement('button');
    composeBtn.type = 'button';
    composeBtn.className = 'btn btn-primary';
    composeBtn.textContent = '\u2709 Nov\u00fd e-mail';
    composeBtn.addEventListener('click', function() { openComposeModal(); });
    bar.appendChild(composeBtn);
  }

  el.appendChild(bar);

  // Hledání
  searchInput.addEventListener('input', debounce(function() {
    var listEl = el.querySelector('[data-gmail-list]');
    if (listEl) {
      listEl.innerHTML = '';
      loadGmailMessages(listEl, searchInput.value, null);
    }
  }, 400));
}

/* ===== INBOX SEZNAM ===== */

function renderGmailInbox(el) {
  var listEl = document.createElement('div');
  listEl.setAttribute('data-gmail-list', '1');
  el.appendChild(listEl);
  loadGmailMessages(listEl, '', null);
}

function loadGmailMessages(listEl, query, pageToken) {
  var loading = document.createElement('div');
  loading.style.cssText = 'text-align:center;padding:24px;color:var(--text-light);';
  loading.textContent = 'Na\u010d\u00edt\u00e1m e-maily\u2026';
  listEl.appendChild(loading);

  var url = 'api/google_gmail.php?action=inbox&limit=' + GMAIL_PAGE_SIZE;
  if (query) url += '&q=' + encodeURIComponent(query);
  if (pageToken) url += '&pageToken=' + encodeURIComponent(pageToken);

  Api.apiGet(url)
    .then(function(data) {
      loading.remove();
      if (!data.messages || data.messages.length === 0) {
        listEl.appendChild(makeEmptyState('\uD83D\uDCE7', query ? '\u017d\u00e1dn\u00e9 v\u00fdsledky.' : 'Schr\u00e1nka je pr\u00e1zdn\u00e1.'));
        return;
      }

      data.messages.forEach(function(msg) {
        listEl.appendChild(renderGmailRow(msg));
      });

      // Další stránka
      if (data.nextPageToken) {
        var moreBtn = document.createElement('button');
        moreBtn.type = 'button';
        moreBtn.className = 'btn';
        moreBtn.style.cssText = 'display:block;margin:16px auto;';
        moreBtn.textContent = 'Na\u010d\u00edst dal\u0161\u00ed';
        moreBtn.addEventListener('click', function() {
          moreBtn.remove();
          loadGmailMessages(listEl, query, data.nextPageToken);
        });
        listEl.appendChild(moreBtn);
      }
    })
    .catch(function(e) {
      loading.textContent = e.message || 'Chyba p\u0159i na\u010d\u00edt\u00e1n\u00ed.';
      loading.style.color = 'var(--danger)';
    });
}

function renderGmailRow(msg) {
  var row = document.createElement('div');
  row.className = 'card';
  row.style.cssText = 'padding:14px 18px;cursor:pointer;display:flex;gap:12px;align-items:flex-start;'
    + 'transition:background 0.15s;margin-bottom:2px;';
  if (msg.unread) row.style.borderLeft = '3px solid var(--accent)';

  row.addEventListener('mouseenter', function() { row.style.background = 'var(--bg-hover)'; });
  row.addEventListener('mouseleave', function() { row.style.background = ''; });

  // Ikona
  var icon = document.createElement('div');
  icon.style.cssText = 'width:36px;height:36px;border-radius:50%;background:var(--accent-light);'
    + 'display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.9rem;';
  icon.textContent = '\u2709';
  row.appendChild(icon);

  // Obsah
  var content = document.createElement('div');
  content.style.cssText = 'flex:1;min-width:0;';

  var top = document.createElement('div');
  top.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:3px;';

  var from = document.createElement('div');
  from.style.cssText = 'font-weight:' + (msg.unread ? '700' : '400') + ';font-size:0.9rem;'
    + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  from.textContent = parseEmailName(msg.from);
  top.appendChild(from);

  var dateEl = document.createElement('div');
  dateEl.style.cssText = 'font-size:0.82rem;color:var(--text-light);white-space:nowrap;flex-shrink:0;';
  dateEl.textContent = formatGmailDate(msg.date);
  top.appendChild(dateEl);

  content.appendChild(top);

  var subj = document.createElement('div');
  subj.style.cssText = 'font-size:0.88rem;font-weight:' + (msg.unread ? '600' : '400') + ';'
    + 'margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  subj.textContent = msg.subject;
  content.appendChild(subj);

  var snippet = document.createElement('div');
  snippet.style.cssText = 'font-size:0.82rem;color:var(--text-light);'
    + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  snippet.textContent = msg.snippet;
  content.appendChild(snippet);

  row.appendChild(content);

  // Klik → detail
  row.addEventListener('click', function() { openMessageModal(msg.id, msg.subject); });

  return row;
}

/* ===== DETAIL ZPRÁVY (modal) ===== */

function openMessageModal(msgId, subject) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;'
    + 'display:flex;align-items:center;justify-content:center;padding:16px;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:var(--radius-lg);'
    + 'width:100%;max-width:700px;max-height:85vh;display:flex;flex-direction:column;'
    + 'box-shadow:var(--shadow-lg);';

  // Header
  var header = document.createElement('div');
  header.style.cssText = 'padding:16px 20px;border-bottom:1px solid var(--border-light);'
    + 'display:flex;justify-content:space-between;align-items:center;';
  var titleEl = document.createElement('h3');
  titleEl.style.cssText = 'margin:0;font-size:1rem;white-space:nowrap;overflow:hidden;'
    + 'text-overflow:ellipsis;flex:1;';
  titleEl.textContent = subject || 'E-mail';
  header.appendChild(titleEl);

  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.style.cssText = 'background:none;border:none;font-size:1.3rem;cursor:pointer;'
    + 'color:var(--text-light);padding:0 0 0 12px;';
  closeBtn.textContent = '\u00d7';
  closeBtn.addEventListener('click', function() { overlay.remove(); });
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // Body
  var body = document.createElement('div');
  body.style.cssText = 'padding:20px;overflow-y:auto;flex:1;';
  body.textContent = 'Na\u010d\u00edt\u00e1m\u2026';
  modal.appendChild(body);

  overlay.appendChild(modal);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  // Načíst detail
  Api.apiGet('api/google_gmail.php?action=message&id=' + encodeURIComponent(msgId))
    .then(function(data) {
      body.innerHTML = '';

      // Meta info
      var meta = document.createElement('div');
      meta.style.cssText = 'font-size:0.85rem;color:var(--text-light);margin-bottom:16px;'
        + 'padding-bottom:12px;border-bottom:1px solid var(--border-light);line-height:1.7;';

      var lines = [
        { label: 'Od', value: data.from },
        { label: 'Komu', value: data.to },
        { label: 'Datum', value: data.date },
      ];
      if (data.cc) lines.push({ label: 'Kopie', value: data.cc });

      lines.forEach(function(l) {
        var row = document.createElement('div');
        var lbl = document.createElement('strong');
        lbl.textContent = l.label + ': ';
        row.appendChild(lbl);
        var val = document.createElement('span');
        val.textContent = l.value;
        row.appendChild(val);
        meta.appendChild(row);
      });
      body.appendChild(meta);

      // Tělo emailu
      var content = document.createElement('div');
      content.style.cssText = 'font-size:0.9rem;line-height:1.6;overflow-wrap:break-word;';
      if (data.body && data.body.indexOf('<') !== -1 && data.body.indexOf('>') !== -1) {
        // HTML email — iframe pro izolaci
        var iframe = document.createElement('iframe');
        iframe.style.cssText = 'width:100%;border:none;min-height:300px;';
        iframe.sandbox = 'allow-same-origin';
        content.appendChild(iframe);
        body.appendChild(content);
        iframe.srcdoc = '<style>body{font-family:sans-serif;font-size:14px;color:#333;margin:0;padding:0;}'
          + 'img{max-width:100%;}a{color:#1e88e5;}</style>' + data.body;
        // Auto-resize iframe
        iframe.addEventListener('load', function() {
          try {
            iframe.style.height = iframe.contentDocument.body.scrollHeight + 20 + 'px';
          } catch(e) {}
        });
      } else {
        content.style.whiteSpace = 'pre-wrap';
        content.textContent = data.body || '(pr\u00e1zdn\u00fd e-mail)';
        body.appendChild(content);
      }
    })
    .catch(function(e) {
      body.textContent = e.message || 'Chyba p\u0159i na\u010d\u00edt\u00e1n\u00ed zpr\u00e1vy.';
      body.style.color = 'var(--danger)';
    });
}

/* ===== COMPOSE MODAL ===== */

function openComposeModal(prefillTo) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;'
    + 'display:flex;align-items:center;justify-content:center;padding:16px;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:var(--radius-lg);'
    + 'width:100%;max-width:560px;box-shadow:var(--shadow-lg);';

  // Header
  var header = document.createElement('div');
  header.style.cssText = 'padding:16px 20px;border-bottom:1px solid var(--border-light);'
    + 'display:flex;justify-content:space-between;align-items:center;';
  var titleEl = document.createElement('h3');
  titleEl.style.cssText = 'margin:0;font-size:1rem;';
  titleEl.textContent = 'Nov\u00fd e-mail';
  header.appendChild(titleEl);
  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.style.cssText = 'background:none;border:none;font-size:1.3rem;cursor:pointer;'
    + 'color:var(--text-light);padding:0;';
  closeBtn.textContent = '\u00d7';
  closeBtn.addEventListener('click', function() { overlay.remove(); });
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // Form
  var body = document.createElement('div');
  body.style.cssText = 'padding:20px;';

  var form = document.createElement('form');

  var toGrp = makeComposeField('Komu', 'email', 'gm-to', prefillTo || '');
  var subjGrp = makeComposeField('P\u0159edm\u011bt', 'text', 'gm-subj', '');

  var bodyGrp = document.createElement('div');
  bodyGrp.style.marginBottom = '14px';
  var bodyLbl = document.createElement('label');
  bodyLbl.textContent = 'Zpr\u00e1va';
  bodyLbl.htmlFor = 'gm-body';
  bodyLbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var bodyTa = document.createElement('textarea');
  bodyTa.id = 'gm-body';
  bodyTa.className = 'form-input';
  bodyTa.rows = 8;
  bodyTa.style.resize = 'vertical';
  bodyGrp.appendChild(bodyLbl);
  bodyGrp.appendChild(bodyTa);

  var sendBtn = document.createElement('button');
  sendBtn.type = 'submit';
  sendBtn.className = 'btn btn-primary';
  sendBtn.textContent = 'Odeslat';

  var errBox = document.createElement('div');
  errBox.className = 'info-box info-box-danger';
  errBox.style.cssText = 'display:none;margin-bottom:12px;';

  form.appendChild(toGrp.el);
  form.appendChild(subjGrp.el);
  form.appendChild(bodyGrp);
  form.appendChild(errBox);
  form.appendChild(sendBtn);

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    errBox.style.display = 'none';

    var to = toGrp.input.value.trim();
    var subj = subjGrp.input.value.trim();
    var text = bodyTa.value;

    if (!to) { errBox.textContent = 'Vypl\u0148te p\u0159\u00edjemce.'; errBox.style.display = ''; return; }
    if (!subj) { errBox.textContent = 'Vypl\u0148te p\u0159edm\u011bt.'; errBox.style.display = ''; return; }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Odes\u00edl\u00e1m\u2026';

    Api.apiPost('api/google_gmail.php?action=send', { to: to, subject: subj, body: text })
      .then(function() {
        overlay.remove();
        showToast('E-mail byl odesl\u00e1n.', 'success');
      })
      .catch(function(err) {
        errBox.textContent = err.message || 'Chyba p\u0159i odes\u00edl\u00e1n\u00ed.';
        errBox.style.display = '';
        sendBtn.disabled = false;
        sendBtn.textContent = 'Odeslat';
      });
  });

  body.appendChild(form);
  modal.appendChild(body);
  overlay.appendChild(modal);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  toGrp.input.focus();
}

function makeComposeField(label, type, id, value) {
  var wrap = document.createElement('div');
  wrap.style.marginBottom = '14px';
  var lbl = document.createElement('label');
  lbl.htmlFor = id;
  lbl.textContent = label;
  lbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var inp = document.createElement('input');
  inp.type = type; inp.id = id; inp.className = 'form-input'; inp.value = value;
  wrap.appendChild(lbl);
  wrap.appendChild(inp);
  return { el: wrap, input: inp };
}

/* ===== UTILS ===== */

function parseEmailName(raw) {
  if (!raw) return '';
  var match = raw.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : raw.split('@')[0];
}

function formatGmailDate(raw) {
  if (!raw) return '';
  try {
    var d = new Date(raw);
    var now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
    }
    if (d.getFullYear() === now.getFullYear()) {
      return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
    }
    return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch(e) { return raw; }
}
