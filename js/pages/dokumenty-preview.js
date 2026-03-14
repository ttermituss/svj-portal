/* ===== DOKUMENTY — PREVIEW MODAL + MARKDOWN RENDERER ===== */

function dokShowPreview(doc) {
  var ext = (doc.soubor_nazev || '').split('.').pop().toLowerCase();
  var fm  = DOK_FILE_META[ext] || {};

  // Overlay
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.7);' +
    'display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  document.body.appendChild(overlay);

  // Modal box
  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);' +
    'border-radius:var(--radius-lg);width:100%;max-width:900px;max-height:90vh;' +
    'display:flex;flex-direction:column;box-shadow:0 16px 48px rgba(0,0,0,0.4);' +
    'transform:scale(.97);opacity:0;transition:transform .15s,opacity .15s;';
  overlay.appendChild(modal);

  // Header
  var header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:12px;padding:14px 18px;' +
    'border-bottom:1px solid var(--border);flex-shrink:0;';

  var hIcon = document.createElement('div');
  hIcon.style.cssText = 'width:36px;height:42px;border-radius:4px;display:flex;flex-direction:column;' +
    'align-items:center;justify-content:center;background:' + (fm.bg || 'var(--bg)') + ';gap:1px;flex-shrink:0;';
  var hIconEmoji = document.createElement('span');
  hIconEmoji.style.cssText = 'font-size:1rem;line-height:1;';
  hIconEmoji.textContent = dokFileIcon(ext);
  var hIconLabel = document.createElement('span');
  hIconLabel.style.cssText = 'font-size:.5rem;font-weight:800;color:' + (fm.fg || 'var(--text-muted)') + ';letter-spacing:.04em;';
  hIconLabel.textContent = (fm.ext || ext.toUpperCase());
  hIcon.appendChild(hIconEmoji);
  hIcon.appendChild(hIconLabel);
  header.appendChild(hIcon);

  var hTitle = document.createElement('div');
  hTitle.style.cssText = 'flex:1;min-width:0;';
  var hName = document.createElement('div');
  hName.style.cssText = 'font-weight:600;font-size:.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  hName.textContent = doc.nazev;
  var hFile = document.createElement('div');
  hFile.style.cssText = 'font-size:.75rem;color:var(--text-muted);margin-top:1px;';
  hFile.textContent = doc.soubor_nazev || '';
  hTitle.appendChild(hName);
  hTitle.appendChild(hFile);
  header.appendChild(hTitle);

  var dlBtn = document.createElement('a');
  dlBtn.className = 'btn btn-secondary btn-sm';
  dlBtn.textContent = '\u2193 St\xe1hnout';
  dlBtn.href = 'api/dokumenty.php?action=download&id=' + doc.id;
  dlBtn.target = '_blank';
  dlBtn.style.flexShrink = '0';
  header.appendChild(dlBtn);

  var closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'flex-shrink:0;width:36px;height:36px;border:none;border-radius:50%;' +
    'background:var(--bg-hover);color:var(--text);font-size:1.2rem;cursor:pointer;' +
    'display:flex;align-items:center;justify-content:center;transition:background .15s;';
  closeBtn.textContent = '\u00d7';
  closeBtn.addEventListener('mouseenter', function() { closeBtn.style.background = 'var(--border)'; });
  closeBtn.addEventListener('mouseleave', function() { closeBtn.style.background = 'var(--bg-hover)'; });
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // Content area
  var content = document.createElement('div');
  content.style.cssText = 'flex:1;overflow:auto;min-height:200px;';
  modal.appendChild(content);

  var removeTrap = trapFocus(overlay);

  // Animate in
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      modal.style.transform = 'scale(1)';
      modal.style.opacity = '1';
    });
  });

  function closeModal() {
    removeTrap();
    modal.style.transform = 'scale(.97)';
    modal.style.opacity = '0';
    setTimeout(function() { if (overlay.parentNode) overlay.remove(); }, 150);
  }

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', esc); }
  });

  // Renderovat obsah podle typu
  var previewUrl = 'api/dokumenty.php?action=preview&id=' + doc.id;

  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') {
    dokPreviewImage(content, previewUrl, doc.nazev);
  } else if (ext === 'pdf') {
    dokPreviewPdf(content, previewUrl);
  } else if (ext === 'md' || ext === 'txt') {
    dokPreviewText(content, previewUrl, ext);
  } else {
    dokPreviewUnsupported(content);
  }
}

function dokPreviewImage(content, url, alt) {
  content.style.cssText += 'display:flex;align-items:center;justify-content:center;' +
    'background:var(--bg);padding:16px;';
  var img = document.createElement('img');
  img.src = url;
  img.alt = alt;
  img.style.cssText = 'max-width:100%;max-height:70vh;object-fit:contain;border-radius:var(--radius);' +
    'box-shadow:var(--shadow-lg);';
  content.appendChild(img);
}

function dokPreviewPdf(content, url) {
  var iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.cssText = 'width:100%;height:75vh;border:none;';
  iframe.title = 'N\xe1hled PDF';
  content.appendChild(iframe);
}

function dokPreviewText(content, url, ext) {
  content.style.padding = '0';
  var loading = document.createElement('p');
  loading.style.cssText = 'padding:24px;color:var(--text-muted);font-size:.9rem;';
  loading.textContent = 'Na\u010d\xedt\xe1m\u2026';
  content.appendChild(loading);

  fetch(url, { credentials: 'same-origin' })
    .then(function(r) {
      if (!r.ok) throw new Error('Chyba na\u010d\xedt\xe1n\xed');
      return r.text();
    })
    .then(function(text) {
      loading.remove();
      if (ext === 'md') {
        var rendered = document.createElement('div');
        rendered.style.cssText = 'padding:28px 32px;max-width:760px;margin:0 auto;line-height:1.7;';
        rendered.innerHTML = dokRenderMarkdown(text);
        // Stylovat vygenerované elementy
        rendered.querySelectorAll('h1,h2,h3,h4').forEach(function(h) {
          h.style.cssText = 'margin:1.2em 0 .4em;color:var(--text);';
        });
        rendered.querySelectorAll('p').forEach(function(p) {
          p.style.cssText = 'margin:.6em 0;color:var(--text);';
        });
        rendered.querySelectorAll('ul,ol').forEach(function(l) {
          l.style.cssText = 'margin:.5em 0;padding-left:1.5em;color:var(--text);';
        });
        rendered.querySelectorAll('code').forEach(function(c) {
          c.style.cssText = 'background:var(--bg-hover);border-radius:3px;padding:1px 5px;' +
            'font-family:var(--font-mono);font-size:.88em;color:var(--text);';
        });
        rendered.querySelectorAll('pre').forEach(function(pre) {
          pre.style.cssText = 'background:var(--bg-hover);border-radius:var(--radius);' +
            'padding:14px 18px;overflow-x:auto;margin:.8em 0;';
          var code = pre.querySelector('code');
          if (code) code.style.cssText = 'background:none;padding:0;font-family:var(--font-mono);font-size:.85em;';
        });
        rendered.querySelectorAll('hr').forEach(function(hr) {
          hr.style.cssText = 'border:none;border-top:1px solid var(--border);margin:1.5em 0;';
        });
        rendered.querySelectorAll('a').forEach(function(a) {
          a.style.color = 'var(--accent)';
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        });
        rendered.querySelectorAll('blockquote').forEach(function(bq) {
          bq.style.cssText = 'border-left:3px solid var(--accent);margin:.8em 0;padding:.4em 1em;' +
            'color:var(--text-light);background:var(--bg-hover);border-radius:0 var(--radius) var(--radius) 0;';
        });
        content.appendChild(rendered);
      } else {
        var pre = document.createElement('pre');
        pre.style.cssText = 'padding:24px;margin:0;font-family:var(--font-mono);font-size:.85rem;' +
          'color:var(--text);white-space:pre-wrap;word-break:break-word;line-height:1.6;';
        pre.textContent = text;
        content.appendChild(pre);
      }
    })
    .catch(function(e) {
      loading.style.color = 'var(--danger)';
      loading.textContent = 'Chyba p\u0159i na\u010d\xedt\xe1n\xed souboru: ' + e.message;
    });
}

function dokPreviewUnsupported(content) {
  content.style.cssText += 'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
    'padding:40px;text-align:center;gap:12px;';
  var icon = document.createElement('div');
  icon.style.cssText = 'font-size:3rem;opacity:.4;';
  icon.textContent = '\uD83D\uDCCE';
  var msg = document.createElement('p');
  msg.style.cssText = 'color:var(--text-light);font-size:.95rem;max-width:320px;';
  msg.textContent = 'N\xe1hled pro tento form\xe1t nen\xed dostupn\xfd. Pou\u017eijte tla\u010d\xedtko St\xe1hnout.';
  content.appendChild(icon);
  content.appendChild(msg);
}

/* ===== MARKDOWN RENDERER (minimalistický, bezpečný) ===== */

function dokRenderMarkdown(text) {
  var lines = text.split('\n');
  var out = '';
  var inCode = false;
  var codeBuf = '';
  var inList = false;
  var inBlockquote = false;

  lines.forEach(function(line) {
    // Fenced code block
    if (/^```/.test(line)) {
      if (inCode) {
        out += '<pre><code>' + mdEsc(codeBuf.replace(/\n$/, '')) + '</code></pre>\n';
        codeBuf = ''; inCode = false;
      } else {
        if (inList) { out += '</ul>\n'; inList = false; }
        inCode = true;
      }
      return;
    }
    if (inCode) { codeBuf += line + '\n'; return; }

    // Close list/blockquote if line doesn't continue them
    if (inList && !/^[\-\*\+] /.test(line)) { out += '</ul>\n'; inList = false; }
    if (inBlockquote && !/^> /.test(line)) { out += '</blockquote>\n'; inBlockquote = false; }

    // Horizontal rule
    if (/^---+$|^\*\*\*+$/.test(line.trim())) { out += '<hr>\n'; return; }

    // Heading
    var hm = line.match(/^(#{1,6}) (.+)/);
    if (hm) { out += '<h' + hm[1].length + '>' + mdInline(hm[2]) + '</h' + hm[1].length + '>\n'; return; }

    // Blockquote
    if (/^> /.test(line)) {
      if (!inBlockquote) { out += '<blockquote>'; inBlockquote = true; }
      out += mdInline(line.slice(2)) + ' ';
      return;
    }

    // List item
    if (/^[\-\*\+] /.test(line)) {
      if (!inList) { out += '<ul>\n'; inList = true; }
      out += '<li>' + mdInline(line.slice(2)) + '</li>\n';
      return;
    }

    // Blank line → paragraph break
    if (!line.trim()) { out += '\n'; return; }

    // Paragraph
    out += '<p>' + mdInline(line) + '</p>\n';
  });

  if (inList) out += '</ul>\n';
  if (inBlockquote) out += '</blockquote>\n';
  if (inCode) out += '<pre><code>' + mdEsc(codeBuf) + '</code></pre>\n';

  return out;
}

function mdInline(text) {
  text = mdEsc(text);
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/`(.+?)`/g, '<code>$1</code>');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(_, label, url) {
    if (/^javascript:/i.test(url)) return label;
    return '<a href="' + url + '" rel="noopener noreferrer">' + label + '</a>';
  });
  return text;
}

function mdEsc(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
