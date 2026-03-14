/* ===== SDÍLENÉ UI HELPERY =====
 * showToast, showConfirmModal, copyToClipboard,
 * makeEmptyState, makeExportButtons
 * Dostupné globálně — načítáno před všemi page skripty.
 */

/* ---- Privilege check ---- */
function isPrivileged(user) {
  return user && (user.role === 'admin' || user.role === 'vybor');
}

/* ---- Toast notifikace ---- */
function showToast(message, type) {
  var existing = document.getElementById('svj-toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.id = 'svj-toast';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  var isErr = type === 'error';
  toast.style.cssText = [
    'position:fixed', 'bottom:24px', 'right:24px', 'z-index:9999',
    'padding:12px 16px 12px 20px', 'border-radius:8px', 'font-size:0.95rem', 'font-weight:500',
    'color:#fff', 'background:' + (isErr ? 'var(--danger, #c62828)' : 'var(--success, #2e7d32)'),
    'box-shadow:0 4px 20px rgba(0,0,0,0.3)',
    'display:flex', 'align-items:flex-start', 'gap:10px',
    'opacity:0', 'transform:translateY(14px)',
    'transition:opacity .2s ease, transform .2s ease',
    'max-width:400px', 'cursor:default',
  ].join(';');

  var icon = document.createElement('span');
  icon.textContent = isErr ? '✕' : '✓';
  icon.style.cssText = 'font-size:1.1rem;font-weight:700;flex-shrink:0;margin-top:1px;';
  toast.appendChild(icon);

  var msg = document.createElement('span');
  msg.textContent = message;
  msg.style.cssText = 'flex:1;user-select:text;line-height:1.4;word-break:break-word;';
  toast.appendChild(msg);

  var closeBtn = document.createElement('button');
  closeBtn.textContent = '\u00d7';
  closeBtn.setAttribute('aria-label', 'Zav\u0159\xedt');
  closeBtn.style.cssText = [
    'flex-shrink:0', 'background:none', 'border:none', 'color:rgba(255,255,255,0.7)',
    'font-size:1.3rem', 'line-height:1', 'cursor:pointer', 'padding:0 0 0 4px',
    'font-family:inherit', 'margin-top:-1px',
  ].join(';');
  toast.appendChild(closeBtn);

  document.body.appendChild(toast);

  var duration = isErr ? 6000 : 3200;
  var timer;

  function dismiss() {
    clearTimeout(timer);
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(14px)';
    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 250);
  }

  closeBtn.addEventListener('click', dismiss);
  // Pozastavit odpočet při hoveru (uživatel čte / kopíruje text)
  toast.addEventListener('mouseenter', function() { clearTimeout(timer); });
  toast.addEventListener('mouseleave', function() { timer = setTimeout(dismiss, 2000); });

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
  });

  timer = setTimeout(dismiss, duration);
}

/* ---- Confirm modal (náhrada za window.confirm) ---- */
function showConfirmModal(title, detail, onConfirm) {
  var prevFocus = document.activeElement;

  var overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:10000',
    'background:rgba(0,0,0,0.55)', 'display:flex',
    'align-items:center', 'justify-content:center', 'padding:16px',
  ].join(';');

  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  var modal = document.createElement('div');
  modal.style.cssText = [
    'background:var(--bg-card)', 'border:1px solid var(--border)',
    'border-radius:10px', 'padding:28px 24px', 'max-width:400px', 'width:100%',
    'box-shadow:0 8px 32px rgba(0,0,0,0.25)',
    'transform:scale(0.95)', 'opacity:0',
    'transition:transform .15s ease, opacity .15s ease',
  ].join(';');

  var h = document.createElement('h3');
  overlay.setAttribute('aria-labelledby', 'confirm-title');
  h.id = 'confirm-title';
  h.style.cssText = 'margin:0 0 8px;font-size:1.1rem;color:var(--text);';
  h.textContent = title;

  var p = document.createElement('p');
  p.style.cssText = 'margin:0 0 24px;color:var(--text-light);font-size:0.9rem;word-break:break-word;';
  p.textContent = detail;

  var btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Zrušit';

  var confirmBtn = document.createElement('button');
  confirmBtn.className = 'btn btn-danger';
  confirmBtn.textContent = 'Potvrdit';

  btns.appendChild(cancelBtn);
  btns.appendChild(confirmBtn);
  modal.appendChild(h);
  modal.appendChild(p);
  modal.appendChild(btns);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  var removeTrap = trapFocus(overlay);

  // Animate in
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      modal.style.transform = 'scale(1)';
      modal.style.opacity = '1';
    });
  });

  function close() {
    removeTrap();
    modal.style.transform = 'scale(0.95)';
    modal.style.opacity = '0';
    setTimeout(function() { if (overlay.parentNode) overlay.remove(); }, 150);
    if (prevFocus) prevFocus.focus();
  }

  cancelBtn.addEventListener('click', close);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
  });

  confirmBtn.addEventListener('click', function() {
    close();
    if (onConfirm) onConfirm();
  });

  confirmBtn.focus();
}

/* ---- Clipboard (fallback pro HTTP) ---- */
function copyToClipboard(text, onSuccess) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(function() {
      fallbackCopy(text, onSuccess);
    });
  } else {
    fallbackCopy(text, onSuccess);
  }
}

function fallbackCopy(text, onSuccess) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand('copy'); if (onSuccess) onSuccess(); } catch (e) {}
  document.body.removeChild(ta);
}

/* ---- GDrive upload feedback ---- */

/**
 * Zobrazit toast o GDrive stavu po uploadu.
 * Volat po úspěšném API response: handleGdriveFeedback(data)
 */
function handleGdriveFeedback(data) {
  if (!data) return;
  if (data.gdrive_warning) {
    showToast(data.gdrive_warning, 'error');
  } else if (data.gdrive) {
    showToast('Soubor ulo\u017een i na Google Drive');
  }
}

/* ---- Accessible form field helper ---- */

/**
 * Vytvoří label + input s proper for/id propojením a aria atributy.
 * @returns {{ el: HTMLElement, input: HTMLInputElement, label: HTMLLabelElement }}
 */
function makeFormField(labelText, type, value, opts) {
  opts = opts || {};
  var id = 'ff-' + (makeFormField._seq = (makeFormField._seq || 0) + 1);
  var wrap = document.createElement('div');
  wrap.className = 'form-group';

  var label = document.createElement('label');
  label.setAttribute('for', id);
  label.textContent = labelText;
  wrap.appendChild(label);

  var input;
  if (type === 'textarea') {
    input = document.createElement('textarea');
    input.className = 'form-input';
    input.rows = opts.rows || 3;
  } else if (type === 'select') {
    input = document.createElement('select');
    input.className = 'form-input';
    (opts.options || []).forEach(function(o) {
      var opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      if (o.value === value) opt.selected = true;
      input.appendChild(opt);
    });
  } else {
    input = document.createElement('input');
    input.type = type || 'text';
    input.className = 'form-input';
    input.value = value || '';
  }

  input.id = id;
  if (opts.required) {
    input.required = true;
    input.setAttribute('aria-required', 'true');
  }
  if (opts.placeholder) input.placeholder = opts.placeholder;
  wrap.appendChild(input);

  if (opts.hint) {
    var hintId = id + '-hint';
    var hint = document.createElement('div');
    hint.className = 'form-hint';
    hint.id = hintId;
    hint.textContent = opts.hint;
    input.setAttribute('aria-describedby', hintId);
    wrap.appendChild(hint);
  }

  return { el: wrap, input: input, label: label };
}

/* ---- Avatar helpers ---- */

var AVATAR_PALETTE = ['#4f86c6','#5cb85c','#9b59b6','#e67e22','#e74c3c','#1abc9c','#3f51b5','#e91e63'];

function getInitials(user) {
  if (!user) return '?';
  var f = (user.jmeno    || '').trim().charAt(0).toUpperCase();
  var l = (user.prijmeni || '').trim().charAt(0).toUpperCase();
  return (f + l) || f || '?';
}

function avatarBgColor(user) {
  var name = user ? (user.jmeno || '') + (user.prijmeni || '') + (user.email || '') : '';
  var h = 0;
  for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

/** Vrátí <img> nebo <div> s iniciálami jako avatar element dané velikosti (px). */
function makeAvatarEl(user, size) {
  size = size || 40;
  var file = user && user.avatar ? user.avatar : null;

  if (file) {
    var img = document.createElement('img');
    img.src = 'uploads/avatars/' + encodeURIComponent(file);
    img.alt = 'Avatar';
    img.style.cssText = 'width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;flex-shrink:0;display:block;';
    return img;
  }

  var div = document.createElement('div');
  div.textContent = getInitials(user);
  div.style.cssText = [
    'width:'            + size + 'px',
    'height:'           + size + 'px',
    'border-radius:50%',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'font-weight:700',
    'font-size:'        + Math.round(size * 0.38) + 'px',
    'flex-shrink:0',
    'color:#fff',
    'background:'       + avatarBgColor(user),
    'user-select:none',
  ].join(';');
  return div;
}

/* ---- Formátování měny (CZK) ---- */
function formatCzk(val) {
  var n = parseFloat(val) || 0;
  return n.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
           .replace(/[\u00A0\u202F]/g, '\u0020'); // normalize non-breaking spaces (Node.js uses \u00A0)
}

/* ---- Počet dní do data ---- */
function daysUntil(dateStr) {
  if (!dateStr) return null;
  var parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  var target = new Date(+parts[0], +parts[1] - 1, +parts[2]); // local midnight — avoids UTC parse + DST shift
  var now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000); // Math.round absorbs DST ±1h drift
}

/* ---- Formátování data (cs-CZ) ---- */
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('cs-CZ');
}

/* ---- Focus trap pro modaly ---- */
function trapFocus(container) {
  var focusable = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function handler(e) {
    if (e.key !== 'Tab') return;
    var els = Array.from(container.querySelectorAll(focusable)).filter(function(el) {
      return el.offsetParent !== null;
    });
    if (!els.length) return;
    var first = els[0];
    var last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  container.addEventListener('keydown', handler);
  return function() { container.removeEventListener('keydown', handler); };
}

/* ---- Univerzální modal factory ---- */

/**
 * Vytvoří modal overlay + kontejner. Vrací {overlay, modal, close}.
 * @param {Object} opts
 * @param {string} [opts.title] - Nadpis modalu
 * @param {string} [opts.width='480px'] - Max šířka
 * @param {boolean} [opts.closeOnOverlay=true] - Zavřít klikem na overlay
 * @param {boolean} [opts.closeOnEsc=true] - Zavřít klávesou Escape
 */
function createModal(opts) {
  opts = opts || {};
  var width = opts.width || '480px';

  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:12px;padding:24px;max-width:' + width + ';width:95%;max-height:90vh;overflow-y:auto;position:relative;box-shadow:0 8px 32px rgba(0,0,0,0.25);';

  var removeTrap;

  function close() {
    if (removeTrap) removeTrap();
    overlay.remove();
    document.removeEventListener('keydown', escHandler);
  }

  function escHandler(e) {
    if (e.key === 'Escape') close();
  }
  if (opts.closeOnEsc !== false) document.addEventListener('keydown', escHandler);

  if (opts.closeOnOverlay !== false) {
    overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
  }

  if (opts.title) {
    var titleId = 'modal-title-' + (createModal._seq = (createModal._seq || 0) + 1);
    var h = document.createElement('h3');
    h.id = titleId;
    h.style.cssText = 'margin:0 0 16px 0;';
    h.textContent = opts.title;
    overlay.setAttribute('aria-labelledby', titleId);
    modal.appendChild(h);
  }

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  removeTrap = trapFocus(overlay);

  // Auto-focus first input or the modal itself
  var firstFocusable = modal.querySelector('input,select,textarea,button');
  if (firstFocusable) {
    requestAnimationFrame(function() { firstFocusable.focus(); });
  } else {
    modal.setAttribute('tabindex', '-1');
    modal.focus();
  }

  return { overlay: overlay, modal: modal, close: close };
}

/* ---- Empty state helper ---- */
/**
 * Vytvoří div.empty-state s ikonou a textem.
 * Náhrada za 10× opakující se ruční sestavení empty-state v page skriptech.
 *
 * @param {string} icon  Emoji nebo text pro ikonu
 * @param {string} text  Informační zpráva
 * @returns {HTMLElement}
 */
function makeEmptyState(icon, text) {
  var wrap = document.createElement('div');
  wrap.className = 'empty-state';
  var iconEl = document.createElement('div');
  iconEl.className = 'icon';
  iconEl.textContent = icon;
  var msg = document.createElement('p');
  msg.textContent = text;
  wrap.appendChild(iconEl);
  wrap.appendChild(msg);
  return wrap;
}

/* ---- Export buttons helper ---- */
/**
 * Přidá tlačítka PDF / XLSX / CSV do kontejneru.
 * Náhrada za 6× opakující se forEach(['pdf','xlsx','csv']) v page skriptech.
 *
 * @param {HTMLElement} container  Rodičovský element (button group / action bar)
 * @param {string}      type       Hodnota parametru type pro api/export.php
 * @param {string}      [cls]      CSS třída tlačítek (default: 'btn btn-secondary btn-sm')
 * @param {string}      [extra]    Extra query string (např. '&rok=2024'), bez úvodního &
 */
function makeExportButtons(container, type, cls, extra) {
  var btnClass = cls || 'btn btn-secondary btn-sm';
  var extraQ   = extra ? '&' + extra : '';
  var labels   = { pdf: '\uD83D\uDCC3 PDF', xlsx: '\uD83D\uDCCA XLSX', csv: '\uD83D\uDCC4 CSV' };
  ['pdf', 'xlsx', 'csv'].forEach(function(fmt) {
    var btn = document.createElement('button');
    btn.className = btnClass;
    btn.textContent = labels[fmt];
    btn.addEventListener('click', function() {
      window.location.href = 'api/export.php?type=' + type + '&format=' + fmt + extraQ;
    });
    container.appendChild(btn);
  });
}
