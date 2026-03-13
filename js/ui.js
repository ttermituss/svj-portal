/* ===== SDÍLENÉ UI HELPERY =====
 * showToast, showConfirmModal, copyToClipboard
 * Dostupné globálně — načítáno před všemi page skripty.
 */

/* ---- Toast notifikace ---- */
function showToast(message, type) {
  var existing = document.getElementById('svj-toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.id = 'svj-toast';
  var isErr = type === 'error';
  toast.style.cssText = [
    'position:fixed', 'bottom:24px', 'right:24px', 'z-index:9999',
    'padding:12px 16px 12px 20px', 'border-radius:8px', 'font-size:0.95rem', 'font-weight:500',
    'color:#fff', 'background:' + (isErr ? '#c62828' : '#2e7d32'),
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
  closeBtn.textContent = '×';
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
  var overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:10000',
    'background:rgba(0,0,0,0.55)', 'display:flex',
    'align-items:center', 'justify-content:center', 'padding:16px',
  ].join(';');

  var modal = document.createElement('div');
  modal.style.cssText = [
    'background:var(--bg-card)', 'border:1px solid var(--border)',
    'border-radius:10px', 'padding:28px 24px', 'max-width:400px', 'width:100%',
    'box-shadow:0 8px 32px rgba(0,0,0,0.25)',
    'transform:scale(0.95)', 'opacity:0',
    'transition:transform .15s ease, opacity .15s ease',
  ].join(';');

  var h = document.createElement('h3');
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

  // Animate in
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      modal.style.transform = 'scale(1)';
      modal.style.opacity = '1';
    });
  });

  function close() {
    modal.style.transform = 'scale(0.95)';
    modal.style.opacity = '0';
    setTimeout(function() { if (overlay.parentNode) overlay.remove(); }, 150);
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
