/* ===== JEDNOTKY — QR KÓDY =====
 * Vyčleněno z jednotky.js pro dodržení limitu 500 řádků.
 * Funkce: jednotkyQrText, jednotkyQrUrl, jednotkyShowQrModal, jednotkyPrintQr, escHtml
 */

function jednotkyQrText(j, svj) {
  var lines = ['Jednotka \u010d. ' + (j.cislo_jednotky || ''), 'SVJ: ' + (svj.nazev || '')];
  if (j.katastralni_uzemi) lines.push('K.\u00fa.: ' + j.katastralni_uzemi);
  if (j.lv) lines.push('LV: ' + j.lv);
  if (j.zpusob_vyuziti || j.typ_jednotky) lines.push('Vyu\u017eit\u00ed: ' + (j.zpusob_vyuziti || j.typ_jednotky));
  return lines.join('\n');
}

function jednotkyQrUrl(text, size) {
  return 'https://api.qrserver.com/v1/create-qr-code/?size=' + (size || '250x250') +
    '&data=' + encodeURIComponent(text);
}

function jednotkyShowQrModal(j, svj) {
  var text = jednotkyQrText(j, svj);
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:1000;display:flex;align-items:center;justify-content:center;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:12px;padding:28px 32px;max-width:340px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.25);';

  var title = document.createElement('h3');
  title.style.cssText = 'margin:0 0 4px;font-size:1.1rem;';
  title.textContent = 'QR k\u00f3d \u2014 jednotka \u010d. ' + (j.cislo_jednotky || '');
  modal.appendChild(title);

  var sub = document.createElement('div');
  sub.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-bottom:16px;';
  sub.textContent = svj.nazev || '';
  modal.appendChild(sub);

  var img = document.createElement('img');
  img.src = jednotkyQrUrl(text, '250x250');
  img.alt = 'QR k\u00f3d jednotky ' + (j.cislo_jednotky || '');
  img.style.cssText = 'width:200px;height:200px;border-radius:8px;border:1px solid var(--border);';
  modal.appendChild(img);

  var info = document.createElement('pre');
  info.style.cssText = 'text-align:left;font-size:0.82rem;color:var(--text-light);margin:12px 0 0;' +
    'background:var(--bg-hover);border-radius:6px;padding:8px 12px;white-space:pre-wrap;word-break:break-word;';
  info.textContent = text;
  modal.appendChild(info);

  var btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-top:16px;';

  var printBtn = document.createElement('button');
  printBtn.className = 'btn btn-secondary';
  printBtn.textContent = '\uD83D\uDDA8\uFE0F Tisknout';
  printBtn.addEventListener('click', function() { jednotkyPrintQr([j], svj); });
  btns.appendChild(printBtn);

  var closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-secondary';
  closeBtn.textContent = 'Zav\u0159\u00edt';
  closeBtn.addEventListener('click', function() { document.body.removeChild(overlay); });
  btns.appendChild(closeBtn);

  modal.appendChild(btns);
  overlay.appendChild(modal);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) document.body.removeChild(overlay); });
  document.body.appendChild(overlay);
}

function jednotkyPrintQr(jednotky, svj) {
  var items = jednotky.map(function(j) {
    var text = jednotkyQrText(j, svj);
    var url = jednotkyQrUrl(text, '180x180');
    return '<div style="display:inline-block;width:200px;margin:12px;text-align:center;vertical-align:top;page-break-inside:avoid;">' +
      '<img src="' + url + '" width="180" height="180" style="border:1px solid #ccc;border-radius:4px;" />' +
      '<div style="font-size:12px;font-weight:600;margin-top:6px;">' + escHtml(j.cislo_jednotky || '') + '</div>' +
      '<div style="font-size:10px;color:#666;margin-top:2px;">' + escHtml(j.katastralni_uzemi || '') + '</div>' +
      '</div>';
  }).join('');

  var win = window.open('', '_blank');
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR k\u00f3dy jednotek</title>' +
    '<style>body{font-family:sans-serif;padding:20px;}h2{margin-bottom:4px;}p{color:#666;font-size:13px;margin-bottom:20px;}</style></head>' +
    '<body><h2>QR k\u00f3dy jednotek</h2><p>' + escHtml(svj.nazev || '') + '</p>' +
    '<div>' + items + '</div></body></html>');
  win.document.close();
  win.onload = function() { win.print(); };
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
