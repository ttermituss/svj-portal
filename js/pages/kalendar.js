/* ===== KALENDÁŘ PAGE ===== */

var KAL_TYP_IKONY = {
  revize:          { icon: '\uD83D\uDD27', label: 'Revize' },
  penb:            { icon: '\u26A1',       label: 'PENB' },
  hlasovani:       { icon: '\uD83D\uDDF3\uFE0F', label: 'Hlasov\u00e1n\u00ed' },
  dokumenty:       { icon: '\uD83D\uDCC4', label: 'Dokument' },
  zavady:          { icon: '\u26A0\uFE0F', label: 'Z\u00e1vada' },
  zavady_uzavreno: { icon: '\u2705',       label: 'Vy\u0159e\u0161eno' },
  fond_oprav:      { icon: '\uD83D\uDCB0', label: 'Fond oprav' },
};

var KAL_BARVY = {
  danger:  'var(--danger, #e53e3e)',
  warning: 'var(--warning, #f59e0b)',
  info:    'var(--accent, #3b82f6)',
  success: 'var(--success, #22c55e)',
  muted:   'var(--text-light)',
};

var KAL_MESICE = [
  'Leden', '\u00danor', 'B\u0159ezen', 'Duben', 'Kv\u011bten', '\u010cerven',
  '\u010cervenec', 'Srpen', 'Z\u00e1\u0159\u00ed', '\u0158\u00edjen', 'Listopad', 'Prosinec',
];

var KAL_DNY = ['Po', '\u00dat', 'St', '\u010ct', 'P\u00e1', 'So', 'Ne'];

Router.register('kalendar', function(el) {
  var user = Auth.getUser();
  if (!user) { Router.navigate('login'); return; }
  if (!user.svj_id) { Router.navigate('home'); return; }

  var now = new Date();
  var rok   = now.getFullYear();
  var mesic = now.getMonth() + 1;

  var title = document.createElement('div');
  title.className = 'page-title';
  var h1 = document.createElement('h1');
  h1.textContent = 'Kalend\u00e1\u0159';
  var sub = document.createElement('p');
  sub.textContent = 'P\u0159ehled ud\u00e1lost\u00ed a term\u00edn\u016f';
  title.appendChild(h1); title.appendChild(sub);
  el.appendChild(title);

  // Navigation bar
  var navBar = document.createElement('div');
  navBar.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:20px;';

  var prevBtn = document.createElement('button');
  prevBtn.className = 'btn btn-secondary';
  prevBtn.style.cssText = 'padding:6px 14px;font-size:1.1rem;';
  prevBtn.textContent = '\u25C0';
  prevBtn.title = 'P\u0159edchoz\u00ed m\u011bs\u00edc';

  var monthLabel = document.createElement('span');
  monthLabel.style.cssText = 'font-size:1.15rem;font-weight:600;min-width:180px;text-align:center;';

  var nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-secondary';
  nextBtn.style.cssText = 'padding:6px 14px;font-size:1.1rem;';
  nextBtn.textContent = '\u25B6';
  nextBtn.title = 'N\u00e1sleduj\u00edc\u00ed m\u011bs\u00edc';

  var todayBtn = document.createElement('button');
  todayBtn.className = 'btn btn-secondary';
  todayBtn.style.cssText = 'font-size:0.85rem;margin-left:8px;';
  todayBtn.textContent = 'Dnes';

  navBar.appendChild(prevBtn);
  navBar.appendChild(monthLabel);
  navBar.appendChild(nextBtn);
  navBar.appendChild(todayBtn);
  el.appendChild(navBar);

  // Legend
  var legend = document.createElement('div');
  legend.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;font-size:0.8rem;';
  [
    ['danger', 'Revize / PENB'], ['warning', 'Hlasov\u00e1n\u00ed / Dokumenty'],
    ['info', 'Z\u00e1vady'], ['success', 'Vy\u0159e\u0161eno'], ['muted', 'Fond oprav'],
  ].forEach(function(item) {
    var chip = document.createElement('span');
    chip.style.cssText = 'display:flex;align-items:center;gap:4px;';
    var dot = document.createElement('span');
    dot.style.cssText = 'width:10px;height:10px;border-radius:50%;background:' + KAL_BARVY[item[0]] + ';flex-shrink:0;';
    chip.appendChild(dot);
    var lbl = document.createElement('span');
    lbl.style.color = 'var(--text-light)';
    lbl.textContent = item[1];
    chip.appendChild(lbl);
    legend.appendChild(chip);
  });
  el.appendChild(legend);

  // Calendar grid
  var gridWrap = document.createElement('div');
  el.appendChild(gridWrap);

  // Day detail panel
  var detailWrap = document.createElement('div');
  detailWrap.style.cssText = 'margin-top:20px;';
  el.appendChild(detailWrap);

  function update() {
    monthLabel.textContent = KAL_MESICE[mesic - 1] + ' ' + rok;
    kalLoadMonth(gridWrap, detailWrap, rok, mesic);
  }

  prevBtn.addEventListener('click', function() {
    mesic--; if (mesic < 1) { mesic = 12; rok--; }
    update();
  });
  nextBtn.addEventListener('click', function() {
    mesic++; if (mesic > 12) { mesic = 1; rok++; }
    update();
  });
  todayBtn.addEventListener('click', function() {
    rok = now.getFullYear(); mesic = now.getMonth() + 1;
    update();
  });

  update();
});

/* ===== LOAD MONTH ===== */

function kalLoadMonth(gridWrap, detailWrap, rok, mesic) {
  gridWrap.replaceChildren();
  detailWrap.replaceChildren();

  var loading = document.createElement('div');
  loading.style.cssText = 'text-align:center;color:var(--text-light);padding:20px;';
  loading.textContent = 'Na\u010d\u00edt\u00e1m\u2026';
  gridWrap.appendChild(loading);

  Api.apiGet('api/kalendar.php?action=events&rok=' + rok + '&mesic=' + mesic)
    .then(function(data) {
      gridWrap.replaceChildren();
      var eventsByDay = {};
      (data.events || []).forEach(function(ev) {
        var day = parseInt(ev.datum.split('-')[2], 10);
        if (!eventsByDay[day]) eventsByDay[day] = [];
        eventsByDay[day].push(ev);
      });
      kalRenderGrid(gridWrap, detailWrap, rok, mesic, eventsByDay);
    })
    .catch(function(e) {
      gridWrap.replaceChildren();
      var err = document.createElement('div');
      err.className = 'info-box info-box-danger';
      err.textContent = 'Chyba: ' + (e.message || 'Nepoda\u0159ilo se na\u010d\u00edst kalend\u00e1\u0159.');
      gridWrap.appendChild(err);
    });
}

/* ===== RENDER GRID ===== */

function kalRenderGrid(gridWrap, detailWrap, rok, mesic, eventsByDay) {
  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:2px;';

  // Header row (days of week)
  KAL_DNY.forEach(function(d) {
    var cell = document.createElement('div');
    cell.style.cssText = 'text-align:center;font-weight:600;font-size:0.82rem;padding:8px 4px;'
      + 'color:var(--text-light);';
    cell.textContent = d;
    grid.appendChild(cell);
  });

  var firstDay = new Date(rok, mesic - 1, 1).getDay(); // 0=Sun
  var startOffset = firstDay === 0 ? 6 : firstDay - 1; // Monday=0
  var daysInMonth = new Date(rok, mesic, 0).getDate();
  var today = new Date();
  var isCurrentMonth = (today.getFullYear() === rok && today.getMonth() + 1 === mesic);
  var todayDate = today.getDate();

  // Empty cells before first day
  for (var e = 0; e < startOffset; e++) {
    var empty = document.createElement('div');
    empty.style.cssText = 'min-height:70px;';
    grid.appendChild(empty);
  }

  // Day cells
  for (var d = 1; d <= daysInMonth; d++) {
    (function(day) {
      var dayEvents = eventsByDay[day] || [];
      var cell = document.createElement('div');
      cell.style.cssText = 'min-height:70px;border:1px solid var(--border);border-radius:6px;'
        + 'padding:4px 6px;cursor:pointer;transition:background 0.15s;position:relative;';

      if (isCurrentMonth && day === todayDate) {
        cell.style.background = 'var(--bg-hover)';
        cell.style.borderColor = 'var(--accent)';
        cell.style.borderWidth = '2px';
      }

      cell.addEventListener('mouseenter', function() {
        if (!(isCurrentMonth && day === todayDate)) cell.style.background = 'var(--bg-hover)';
      });
      cell.addEventListener('mouseleave', function() {
        if (!(isCurrentMonth && day === todayDate)) cell.style.background = '';
      });

      var num = document.createElement('div');
      num.style.cssText = 'font-size:0.82rem;font-weight:' + (isCurrentMonth && day === todayDate ? '700' : '500') + ';'
        + 'margin-bottom:3px;' + (isCurrentMonth && day === todayDate ? 'color:var(--accent);' : '');
      num.textContent = day;
      cell.appendChild(num);

      // Event dots (max 4 visible, then "+N")
      var dotsWrap = document.createElement('div');
      dotsWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:2px;';
      var maxDots = 4;
      dayEvents.slice(0, maxDots).forEach(function(ev) {
        var dot = document.createElement('div');
        dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:'
          + (KAL_BARVY[ev.barva] || KAL_BARVY.muted) + ';';
        dot.title = ev.nazev;
        dotsWrap.appendChild(dot);
      });
      if (dayEvents.length > maxDots) {
        var more = document.createElement('span');
        more.style.cssText = 'font-size:0.65rem;color:var(--text-light);line-height:8px;';
        more.textContent = '+' + (dayEvents.length - maxDots);
        dotsWrap.appendChild(more);
      }
      cell.appendChild(dotsWrap);

      cell.addEventListener('click', function() {
        kalShowDayDetail(detailWrap, rok, mesic, day, dayEvents);
      });

      grid.appendChild(cell);
    })(d);
  }

  gridWrap.appendChild(grid);

  // Show today's events by default
  if (isCurrentMonth && eventsByDay[todayDate]) {
    kalShowDayDetail(detailWrap, rok, mesic, todayDate, eventsByDay[todayDate]);
  }
}

/* ===== DAY DETAIL ===== */

function kalShowDayDetail(wrap, rok, mesic, day, events) {
  wrap.replaceChildren();

  var card = document.createElement('div');
  card.className = 'card';
  var hdr = document.createElement('div');
  hdr.className = 'card-header';
  var h2 = document.createElement('h2');
  h2.style.margin = '0';
  h2.textContent = day + '. ' + KAL_MESICE[mesic - 1] + ' ' + rok;
  hdr.appendChild(h2);
  card.appendChild(hdr);

  var body = document.createElement('div');
  body.className = 'card-body';

  if (!events || !events.length) {
    var empty = document.createElement('div');
    empty.style.cssText = 'color:var(--text-light);font-size:0.9rem;text-align:center;padding:16px 0;';
    empty.textContent = '\u017d\u00e1dn\u00e9 ud\u00e1losti v tento den.';
    body.appendChild(empty);
  } else {
    events.forEach(function(ev) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 0;'
        + 'border-bottom:1px solid var(--border);';

      var dot = document.createElement('div');
      dot.style.cssText = 'width:10px;height:10px;border-radius:50%;flex-shrink:0;background:'
        + (KAL_BARVY[ev.barva] || KAL_BARVY.muted) + ';';
      row.appendChild(dot);

      var iconInfo = KAL_TYP_IKONY[ev.typ] || { icon: '\uD83D\uDCC5', label: '' };
      var icon = document.createElement('span');
      icon.style.cssText = 'font-size:1.2rem;flex-shrink:0;';
      icon.textContent = iconInfo.icon;
      row.appendChild(icon);

      var textWrap = document.createElement('div');
      textWrap.style.cssText = 'flex:1;min-width:0;';
      var name = document.createElement('div');
      name.style.cssText = 'font-weight:500;font-size:0.9rem;';
      name.textContent = ev.nazev;
      textWrap.appendChild(name);

      if (ev.detail) {
        var detail = document.createElement('div');
        detail.style.cssText = 'font-size:0.8rem;color:var(--text-light);';
        detail.textContent = ev.detail;
        textWrap.appendChild(detail);
      }

      row.appendChild(textWrap);

      var typBadge = document.createElement('span');
      typBadge.className = 'badge';
      typBadge.style.cssText = 'font-size:0.72rem;flex-shrink:0;';
      typBadge.textContent = iconInfo.label;
      row.appendChild(typBadge);

      // Kliknutí na událost → navigace
      row.style.cursor = 'pointer';
      row.addEventListener('click', function() {
        kalNavigateToEvent(ev);
      });

      body.appendChild(row);
    });
  }

  card.appendChild(body);
  wrap.appendChild(card);
}

/* ===== NAVIGATE TO EVENT ===== */

function kalNavigateToEvent(ev) {
  switch (ev.typ) {
    case 'revize':
      Router.navigate('odom'); break;
    case 'penb':
      Router.navigate('odom'); break;
    case 'hlasovani':
      Router.navigate('hlasovani'); break;
    case 'dokumenty':
      Router.navigate('dokumenty'); break;
    case 'zavady':
    case 'zavady_uzavreno':
      Router.navigate('zavady'); break;
    case 'fond_oprav':
      Router.navigate('odom'); break;
    default:
      break;
  }
}
