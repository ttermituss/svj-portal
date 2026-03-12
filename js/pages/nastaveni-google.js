/* ===== NASTAVENÍ: GOOGLE INTEGRACE ===== */

function renderGoogleCard(container) {
  var card = makeCard('Google integrace');
  var body = card.body;

  var loading = document.createElement('div');
  loading.style.cssText = 'text-align:center;padding:16px;color:var(--text-light);font-size:0.9rem;';
  loading.textContent = 'Na\u010d\u00edt\u00e1m\u2026';
  body.appendChild(loading);

  Api.apiGet('api/google_oauth.php?action=status')
    .then(function(data) {
      loading.remove();
      if (data.connected) {
        renderGoogleConnected(body, data);
      } else {
        renderGoogleDisconnected(body);
      }
    })
    .catch(function() {
      loading.remove();
      renderGoogleDisconnected(body);
    });

  container.appendChild(card.card);
}

/* ===== NEPŘIPOJENO ===== */

function renderGoogleDisconnected(body) {
  var desc = document.createElement('p');
  desc.style.cssText = 'font-size:0.9rem;color:var(--text-light);margin:0 0 16px;line-height:1.5;';
  desc.textContent = 'Propojte sv\u016fj Google \u00fa\u010det pro synchronizaci kalend\u00e1\u0159e, '
    + 'p\u0159\u00edstup k Gmailu a Google Disku.';
  body.appendChild(desc);

  var scopeList = document.createElement('ul');
  scopeList.style.cssText = 'margin:0 0 20px;padding:0 0 0 20px;font-size:0.85rem;'
    + 'color:var(--text-light);line-height:1.8;';
  [
    '\uD83D\uDCC5 Kalend\u00e1\u0159 \u2014 synchronizace ud\u00e1lost\u00ed',
    '\uD83D\uDCE7 Gmail \u2014 \u010dten\u00ed a odes\u00edl\u00e1n\u00ed email\u016f',
    '\uD83D\uDCC1 Disk \u2014 spr\u00e1va dokument\u016f SVJ',
  ].forEach(function(s) {
    var li = document.createElement('li');
    li.textContent = s;
    scopeList.appendChild(li);
  });
  body.appendChild(scopeList);

  // Tlačítko připojení
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-primary';
  btn.textContent = 'P\u0159ipojit Google \u00fa\u010det';

  btn.addEventListener('click', function() {
    btn.disabled = true;
    btn.textContent = 'P\u0159esm\u011brov\u00e1v\u00e1m\u2026';
    Api.apiGet('api/google_oauth.php?action=authUrl')
      .then(function(d) { window.location.href = d.url; })
      .catch(function(e) {
        showToast(e.message || 'Chyba p\u0159i z\u00edsk\u00e1v\u00e1n\u00ed odkazu.', 'error');
        btn.disabled = false;
        btn.textContent = 'P\u0159ipojit Google \u00fa\u010det';
      });
  });
  body.appendChild(btn);

  // Nápověda
  var sep = document.createElement('div');
  sep.style.cssText = 'border-top:1px solid var(--border-light);margin:24px 0 0;padding-top:16px;';
  body.appendChild(sep);
  renderGoogleGuide(sep);
}

/* ===== PŘIPOJENO ===== */

function renderGoogleConnected(body, data) {
  var statusRow = document.createElement('div');
  statusRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:16px;';

  var dot = document.createElement('span');
  dot.style.cssText = 'width:10px;height:10px;border-radius:50%;background:var(--accent);flex-shrink:0;';
  statusRow.appendChild(dot);

  var info = document.createElement('div');
  var emailEl = document.createElement('strong');
  emailEl.style.cssText = 'font-size:0.95rem;';
  emailEl.textContent = data.google_email || 'Google \u00fa\u010det';
  info.appendChild(emailEl);

  if (data.connected_at) {
    var dateEl = document.createElement('div');
    dateEl.style.cssText = 'font-size:0.8rem;color:var(--text-light);margin-top:2px;';
    var d = new Date(data.connected_at);
    dateEl.textContent = 'P\u0159ipojeno ' + d.toLocaleDateString('cs-CZ');
    info.appendChild(dateEl);
  }
  statusRow.appendChild(info);
  body.appendChild(statusRow);

  if (data.scopes) {
    var scopeWrap = document.createElement('div');
    scopeWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;';
    var scopeLabels = { calendar: 'Kalend\u00e1\u0159', gmail: 'Gmail', drive: 'Disk' };
    Object.keys(scopeLabels).forEach(function(key) {
      if (data.scopes.indexOf(key) !== -1) {
        var badge = document.createElement('span');
        badge.className = 'badge';
        badge.style.cssText = 'font-size:0.78rem;';
        badge.textContent = scopeLabels[key];
        scopeWrap.appendChild(badge);
      }
    });
    body.appendChild(scopeWrap);
  }

  var disconnectBtn = document.createElement('button');
  disconnectBtn.type = 'button';
  disconnectBtn.className = 'btn';
  disconnectBtn.style.cssText = 'color:var(--danger);border-color:var(--danger);';
  disconnectBtn.textContent = 'Odpojit Google \u00fa\u010det';

  disconnectBtn.addEventListener('click', function() {
    showConfirmModal(
      'Odpojit Google?',
      'Synchronizace kalend\u00e1\u0159e a dal\u0161\u00edch slu\u017eeb bude zastavena.',
      function() {
        disconnectBtn.disabled = true;
        Api.apiPost('api/google_oauth.php?action=disconnect', {})
          .then(function() {
            showToast('Google \u00fa\u010det byl odpojen.', 'success');
            body.innerHTML = '';
            renderGoogleDisconnected(body);
          })
          .catch(function(e) {
            showToast(e.message || 'Chyba p\u0159i odpojov\u00e1n\u00ed.', 'error');
          })
          .finally(function() { disconnectBtn.disabled = false; });
      }
    );
  });
  body.appendChild(disconnectBtn);
}

/* ===== IN-APP PRŮVODCE NASTAVENÍM ===== */

function renderGoogleGuide(container) {
  // Trigger tlačítko
  var trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.style.cssText = 'background:none;border:none;padding:0;cursor:pointer;'
    + 'color:var(--info);font-size:0.88rem;display:flex;align-items:center;gap:6px;';

  var qIcon = document.createElement('span');
  qIcon.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;'
    + 'width:20px;height:20px;border-radius:50%;background:var(--info-light);'
    + 'color:var(--info);font-size:0.75rem;font-weight:700;flex-shrink:0;';
  qIcon.textContent = '?';
  trigger.appendChild(qIcon);

  var triggerText = document.createElement('span');
  triggerText.textContent = 'Jak z\u00edskat Google p\u0159\u00edstupov\u00e9 \u00fadaje?';
  trigger.appendChild(triggerText);

  var arrow = document.createElement('span');
  arrow.style.cssText = 'font-size:0.7rem;transition:transform 0.2s;';
  arrow.textContent = '\u25BC';
  trigger.appendChild(arrow);

  container.appendChild(trigger);

  // Obsah průvodce (skrytý)
  var guideBody = document.createElement('div');
  guideBody.style.cssText = 'max-height:0;overflow:hidden;transition:max-height 0.35s ease;';
  container.appendChild(guideBody);

  var open = false;
  trigger.addEventListener('click', function() {
    open = !open;
    arrow.style.transform = open ? 'rotate(180deg)' : '';
    guideBody.style.maxHeight = open ? guideBody.scrollHeight + 'px' : '0';
  });

  // Vnitřní wrapper
  var inner = document.createElement('div');
  inner.style.cssText = 'padding:16px 0 0;';
  guideBody.appendChild(inner);

  // Info box nahoře
  var infoBox = document.createElement('div');
  infoBox.className = 'info-box info-box-info';
  infoBox.style.cssText = 'display:flex;margin-bottom:20px;font-size:0.85rem;line-height:1.6;';
  infoBox.textContent = 'Tento pr\u016fvodce v\u00e1s provede nastaven\u00edm Google Cloud projektu. '
    + 'Pot\u0159ebujete Google \u00fa\u010det s p\u0159\u00edstupem do Google Cloud Console. '
    + 'Cel\u00fd proces trv\u00e1 cca 5\u201310 minut.';
  inner.appendChild(infoBox);

  // Kroky
  var steps = getGuideSteps();
  steps.forEach(function(step, i) {
    renderGuideStep(inner, i + 1, step, i === 0);
  });

  // FAQ sekce
  renderGuideFaq(inner);
}

function getGuideSteps() {
  return [
    {
      title: 'Vytvo\u0159te Google Cloud projekt',
      content: [
        { type: 'text', value: 'Otev\u0159ete Google Cloud Console a vytvo\u0159te nov\u00fd projekt:' },
        { type: 'steps', items: [
          'P\u0159ihlaste se na console.cloud.google.com',
          'Klikn\u011bte na v\u00fdb\u011br projektu (naho\u0159e) \u2192 Nov\u00fd projekt',
          'Zadejte n\u00e1zev, nap\u0159. \u201eSVJ Port\u00e1l\u201c',
          'Klikn\u011bte Vytvo\u0159it a po\u010dkejte na dokon\u010den\u00ed',
        ]},
        { type: 'tip', value: 'Google Cloud je zdarma \u2014 Gmail, Drive i Calendar API maj\u00ed velmi '
          + '\u0161t\u011bdrou free kvotu (stovky tis\u00edc dotaz\u016f denn\u011b).' },
      ]
    },
    {
      title: 'Zapn\u011bte pot\u0159ebn\u00e1 API',
      content: [
        { type: 'text', value: 'V nov\u00e9m projektu povolte t\u0159i slu\u017eby:' },
        { type: 'steps', items: [
          'Jd\u011bte do API a slu\u017eby \u2192 Knihovna',
          'Vyhledejte a povolte: Gmail API',
          'Vyhledejte a povolte: Google Drive API',
          'Vyhledejte a povolte: Google Calendar API',
        ]},
        { type: 'tip', value: 'Ka\u017ed\u00e9 API povolte kliknut\u00edm na tla\u010d\u00edtko '
          + '\u201ePOVOLIT\u201c na str\u00e1nce dan\u00e9 slu\u017eby.' },
      ]
    },
    {
      title: 'Nastavte souhlas OAuth',
      content: [
        { type: 'text', value: 'Nakonfigurujte obrazovku souhlasu, kterou uvid\u00ed u\u017eivatel\u00e9:' },
        { type: 'steps', items: [
          'Jd\u011bte do API a slu\u017eby \u2192 Obrazovka souhlasu OAuth',
          'Typ: Extern\u00ed (pro v\u0161echny Google \u00fa\u010dty)',
          'Vypl\u0148te n\u00e1zev aplikace: \u201eSVJ Port\u00e1l\u201c',
          'E-mail podpory: v\u00e1\u0161 email',
          'P\u0159idejte scopy: Gmail (send + readonly), Drive (file), Calendar (events)',
          'P\u0159idejte testovac\u00ed u\u017eivatele (v\u00e1\u0161 email)',
        ]},
        { type: 'warning', value: 'Dokud nen\u00ed aplikace ov\u011b\u0159ena Googlem, '
          + 'mohou se p\u0159ipojit jen testovac\u00ed u\u017eivatel\u00e9 (max 100). '
          + 'Pro produkci bude t\u0159eba po\u017e\u00e1dat o ov\u011b\u0159en\u00ed.' },
      ]
    },
    {
      title: 'Vytvo\u0159te OAuth p\u0159\u00edstupov\u00e9 \u00fadaje',
      content: [
        { type: 'text', value: 'Vygenerujte Client ID a Client Secret:' },
        { type: 'steps', items: [
          'Jd\u011bte do API a slu\u017eby \u2192 P\u0159\u00edstupov\u00e9 \u00fadaje',
          'Klikn\u011bte Vytvo\u0159it p\u0159\u00edstupov\u00e9 \u00fadaje \u2192 ID klienta OAuth',
          'Typ aplikace: Webov\u00e1 aplikace',
          'Autorizovan\u00e9 URI p\u0159esm\u011brov\u00e1n\u00ed: viz n\u00ed\u017ee',
        ]},
        { type: 'code', label: 'Redirect URI (zkop\u00edrujte p\u0159esn\u011b):',
          value: window.location.origin + '/api/google_oauth.php?action=callback' },
        { type: 'text', value: 'Po vytvo\u0159en\u00ed se zobraz\u00ed Client ID a Client Secret. '
          + 'Oba \u00fadaje si zkop\u00edrujte.' },
      ]
    },
    {
      title: 'Vlo\u017ete \u00fadaje do SVJ Port\u00e1lu',
      content: [
        { type: 'text', value: 'Na serveru otev\u0159ete konfigura\u010dn\u00ed soubor:' },
        { type: 'code', label: 'Soubor:', value: 'api/config.php' },
        { type: 'text', value: 'Najd\u011bte sekci Google OAuth a vypl\u0148te:' },
        { type: 'code', label: '',
          value: "define('GOOGLE_CLIENT_ID', 'vas-client-id.apps.googleusercontent.com');\n"
            + "define('GOOGLE_CLIENT_SECRET', 'vas-client-secret');" },
        { type: 'tip', value: 'Po ulo\u017een\u00ed klikn\u011bte na tla\u010d\u00edtko '
          + '\u201eP\u0159ipojit Google \u00fa\u010det\u201c v\u00fd\u0161e \u2014 '
          + 'budete p\u0159esm\u011brov\u00e1ni na Google pro ud\u011blen\u00ed souhlasu.' },
      ]
    },
  ];
}

/* Jeden krok průvodce (accordion) */

function renderGuideStep(container, num, step, openByDefault) {
  var wrap = document.createElement('div');
  wrap.style.cssText = 'margin-bottom:4px;border:1px solid var(--border-light);'
    + 'border-radius:var(--radius);overflow:hidden;';

  // Header
  var header = document.createElement('button');
  header.type = 'button';
  header.style.cssText = 'width:100%;display:flex;align-items:center;gap:10px;padding:12px 14px;'
    + 'background:var(--bg);border:none;cursor:pointer;text-align:left;';

  var circle = document.createElement('span');
  circle.style.cssText = 'display:flex;align-items:center;justify-content:center;'
    + 'width:26px;height:26px;border-radius:50%;background:var(--accent);'
    + 'color:#fff;font-size:0.8rem;font-weight:700;flex-shrink:0;';
  circle.textContent = num;
  header.appendChild(circle);

  var titleEl = document.createElement('span');
  titleEl.style.cssText = 'flex:1;font-size:0.9rem;font-weight:600;color:var(--text);';
  titleEl.textContent = step.title;
  header.appendChild(titleEl);

  var chevron = document.createElement('span');
  chevron.style.cssText = 'font-size:0.65rem;color:var(--text-light);transition:transform 0.2s;';
  chevron.textContent = '\u25BC';
  header.appendChild(chevron);

  wrap.appendChild(header);

  // Body
  var body = document.createElement('div');
  body.style.cssText = 'overflow:hidden;transition:max-height 0.3s ease;';
  wrap.appendChild(body);

  var bodyInner = document.createElement('div');
  bodyInner.style.cssText = 'padding:0 14px 14px 50px;';
  body.appendChild(bodyInner);

  // Renderovat obsah
  step.content.forEach(function(block) {
    renderGuideBlock(bodyInner, block);
  });

  // Toggle
  var isOpen = !!openByDefault;
  function sync() {
    chevron.style.transform = isOpen ? 'rotate(180deg)' : '';
    body.style.maxHeight = isOpen ? body.scrollHeight + 'px' : '0';
  }

  header.addEventListener('click', function() {
    isOpen = !isOpen;
    sync();
  });

  container.appendChild(wrap);

  // Počáteční stav — po appendu kvůli scrollHeight
  requestAnimationFrame(function() { sync(); });
}

/* Blok obsahu uvnitř kroku */

function renderGuideBlock(container, block) {
  if (block.type === 'text') {
    var p = document.createElement('p');
    p.style.cssText = 'font-size:0.85rem;color:var(--text-light);margin:0 0 10px;line-height:1.5;';
    p.textContent = block.value;
    container.appendChild(p);
  }

  if (block.type === 'steps') {
    var ol = document.createElement('ol');
    ol.style.cssText = 'margin:0 0 12px;padding:0 0 0 18px;font-size:0.85rem;'
      + 'color:var(--text);line-height:1.9;';
    block.items.forEach(function(item) {
      var li = document.createElement('li');
      li.textContent = item;
      ol.appendChild(li);
    });
    container.appendChild(ol);
  }

  if (block.type === 'code') {
    if (block.label) {
      var lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:0.8rem;color:var(--text-light);margin-bottom:4px;';
      lbl.textContent = block.label;
      container.appendChild(lbl);
    }
    var codeWrap = document.createElement('div');
    codeWrap.style.cssText = 'position:relative;margin-bottom:12px;';

    var pre = document.createElement('pre');
    pre.style.cssText = 'background:var(--bg);border:1px solid var(--border-light);'
      + 'border-radius:var(--radius);padding:10px 40px 10px 12px;margin:0;'
      + 'font-size:0.82rem;font-family:monospace;overflow-x:auto;'
      + 'color:var(--text);line-height:1.5;white-space:pre-wrap;word-break:break-all;';
    pre.textContent = block.value;
    codeWrap.appendChild(pre);

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.title = 'Zkop\u00edrovat';
    copyBtn.style.cssText = 'position:absolute;top:6px;right:6px;background:var(--bg-card);'
      + 'border:1px solid var(--border);border-radius:4px;padding:4px 6px;cursor:pointer;'
      + 'font-size:0.72rem;color:var(--text-light);line-height:1;';
    copyBtn.textContent = '\uD83D\uDCCB';
    copyBtn.addEventListener('click', function() {
      if (typeof copyToClipboard === 'function') {
        copyToClipboard(block.value);
      } else {
        navigator.clipboard.writeText(block.value).catch(function() {});
      }
      copyBtn.textContent = '\u2713';
      setTimeout(function() { copyBtn.textContent = '\uD83D\uDCCB'; }, 1500);
    });
    codeWrap.appendChild(copyBtn);

    container.appendChild(codeWrap);
  }

  if (block.type === 'tip') {
    var tip = document.createElement('div');
    tip.className = 'info-box info-box-info';
    tip.style.cssText = 'display:flex;font-size:0.82rem;line-height:1.5;margin-bottom:10px;gap:6px;';
    tip.textContent = '\uD83D\uDCA1 ' + block.value;
    container.appendChild(tip);
  }

  if (block.type === 'warning') {
    var warn = document.createElement('div');
    warn.className = 'info-box info-box-warning';
    warn.style.cssText = 'display:flex;font-size:0.82rem;line-height:1.5;margin-bottom:10px;gap:6px;';
    warn.textContent = '\u26A0\uFE0F ' + block.value;
    container.appendChild(warn);
  }
}

/* FAQ sekce */

function renderGuideFaq(container) {
  var sep = document.createElement('div');
  sep.style.cssText = 'margin-top:16px;padding-top:14px;border-top:1px solid var(--border-light);';
  container.appendChild(sep);

  var faqTitle = document.createElement('div');
  faqTitle.style.cssText = 'font-size:0.85rem;font-weight:600;color:var(--text);margin-bottom:10px;';
  faqTitle.textContent = '\u010Cast\u00e9 dotazy';
  sep.appendChild(faqTitle);

  var faqs = [
    {
      q: 'Je to zdarma?',
      a: 'Ano. Gmail, Drive i Calendar API maj\u00ed velkorysou free kvotu. '
        + 'Pro b\u011b\u017en\u00e9 SVJ (des\u00edtky u\u017eivatel\u016f) se k limit\u016fm '
        + 'ani nep\u0159ibl\u00ed\u017e\u00edte.',
    },
    {
      q: 'Co vid\u00ed Google z na\u0161ich dat?',
      a: 'Port\u00e1l p\u0159istupuje pouze k \u00fadaj\u016fm v\u00e1mi p\u0159ipojen\u00e9ho '
        + 'Google \u00fa\u010dtu (kalend\u00e1\u0159, emaily, soubory). \u017d\u00e1dn\u00e1 data '
        + 'z port\u00e1lu se do Google neodes\u00edlaj\u00ed.',
    },
    {
      q: 'Mohu p\u0159\u00edstup kdykoli zru\u0161it?',
      a: 'Ano. Sta\u010d\u00ed kliknout na \u201eOdpojit Google \u00fa\u010det\u201c v\u00fd\u0161e, '
        + 'nebo odebrat opr\u00e1vn\u011bn\u00ed p\u0159\u00edmo v nastaven\u00ed va\u0161eho Google \u00fa\u010dtu.',
    },
    {
      q: 'Pro\u010d se zobrazuje varov\u00e1n\u00ed \u201eneov\u011b\u0159en\u00e1 aplikace\u201c?',
      a: 'Dokud Google neov\u011b\u0159\u00ed va\u0161i aplikaci (proces trv\u00e1 n\u011bkolik dn\u016f), '
        + 'zobraz\u00ed se varov\u00e1n\u00ed. Klikn\u011bte na \u201ePokra\u010dovat\u201c '
        + '\u2192 \u201eP\u0159ej\u00edt na SVJ Port\u00e1l (nebezpe\u010dn\u00e9)\u201c. '
        + 'Toto je norm\u00e1ln\u00ed pro testovac\u00ed re\u017eim.',
    },
  ];

  faqs.forEach(function(faq) {
    var item = document.createElement('details');
    item.style.cssText = 'margin-bottom:4px;border:1px solid var(--border-light);'
      + 'border-radius:var(--radius);overflow:hidden;';

    var summary = document.createElement('summary');
    summary.style.cssText = 'padding:10px 14px;font-size:0.85rem;font-weight:500;'
      + 'cursor:pointer;background:var(--bg);color:var(--text);list-style:none;'
      + 'display:flex;align-items:center;gap:8px;';
    summary.textContent = faq.q;
    item.appendChild(summary);

    var answer = document.createElement('div');
    answer.style.cssText = 'padding:0 14px 12px;font-size:0.83rem;color:var(--text-light);'
      + 'line-height:1.6;';
    answer.textContent = faq.a;
    item.appendChild(answer);

    sep.appendChild(item);
  });
}
