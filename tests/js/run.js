#!/usr/bin/env node
'use strict';
/**
 * CLI test runner pro JS testy — Node.js 18+, bez závislostí.
 * Spustit: node tests/js/run.js
 *
 * Poskytuje minimální mock DOM + localStorage tak, aby testy
 * pokrývající čistou logiku (formatters, theme, invite URL) fungovaly bez prohlížeče.
 * DOM-heavy testy (test_ui.js) jsou označeny jako browser-only a přeskočeny.
 */

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

/* ===== Miniaturní DOM mock ===== */

function makeEl(tag) {
  const el = {
    tagName:     (tag || 'div').toUpperCase(),
    className:   '',
    id:          '',
    textContent: '',
    rel:         '',
    href:        '',
    type:        '',
    value:       '',
    placeholder: '',
    required:    false,
    disabled:    false,
    _attrs:      {},
    _children:   [],
    style:       {},
    setAttribute(k, v) { this._attrs[k] = String(v); if (k === 'id') this.id = String(v); },
    getAttribute(k)    { return this._attrs[k] !== undefined ? this._attrs[k] : null; },
    hasAttribute(k)    { return k in this._attrs; },
    removeAttribute(k) { delete this._attrs[k]; },
    appendChild(c)     { if (c && c._children !== undefined) this._children.push(c); return c; },
    removeChild(c)     { this._children = this._children.filter(x => x !== c); },
    replaceChildren()  { this._children = []; },
    remove()           { if (this.id && idMap[this.id] === this) delete idMap[this.id]; },
    focus()            {},
    click()            {},
    addEventListener() {},
    removeEventListener() {},
    querySelector(sel) { return _findAll(this._children, sel)[0] || null; },
    querySelectorAll(sel) { return _findAll(this._children, sel); },
    offsetParent:      {},
  };
  return el;
}

function _matchSel(el, sel) {
  if (!el || typeof el !== 'object') return false;
  if (sel.startsWith('#'))  return el.id === sel.slice(1);
  if (sel.startsWith('.'))  return (el.className || '').split(' ').includes(sel.slice(1));
  const tag = sel.split('[')[0].split(':')[0].toUpperCase();
  if (tag) return el.tagName === tag;
  return false;
}

function _findAll(children, sel) {
  const results = [];
  for (const c of (children || [])) {
    if (_matchSel(c, sel)) results.push(c);
    if (c && c._children) results.push(..._findAll(c._children, sel));
  }
  return results;
}

/* ===== localStorage mock ===== */

class LocalStorageMock {
  constructor() { this._d = {}; }
  getItem(k)    { return this._d[k] !== undefined ? this._d[k] : null; }
  setItem(k, v) { this._d[k] = String(v); }
  removeItem(k) { delete this._d[k]; }
  clear()       { this._d = {}; }
}

/* ===== Global context ===== */

let passed = 0, failed = 0, currentSuite = '';
const failures = [];

const docEl = makeEl('HTML');

// ID registry — getElementById potřebuje i head-appendChild
const idMap = {};

const bodyEl = makeEl('BODY');
const headEl = makeEl('HEAD');
headEl.appendChild = function(c) {
  this._children.push(c);
  if (c && c.id) idMap[c.id] = c;
};

const document = {
  createElement(tag) { return makeEl(tag); },
  getElementById(id) { return idMap[id] || null; },
  querySelector()    { return null; },
  querySelectorAll(sel) {
    if (sel && sel.startsWith('#')) { const id = sel.slice(1); return idMap[id] ? [idMap[id]] : []; }
    return [];
  },
  addEventListener() {},
  removeEventListener() {},
  get body()            { return bodyEl; },
  get head()            { return headEl; },
  get documentElement() { return docEl; },
};

const localStorage = new LocalStorageMock();

const ctx = vm.createContext({
  // Test runner API
  suite(name) {
    currentSuite = name;
    process.stdout.write('\n\x1b[34m▶ ' + name + '\x1b[0m\n');
  },
  assert(label, condition) {
    if (condition) {
      passed++;
      process.stdout.write('  \x1b[32m✓\x1b[0m ' + label + '\n');
    } else {
      failed++;
      failures.push('[' + currentSuite + '] ' + label);
      process.stdout.write('  \x1b[31m✗\x1b[0m ' + label + '\n');
    }
  },
  assertEqual(label, expected, actual) {
    const ok = JSON.stringify(expected) === JSON.stringify(actual);
    if (!ok) {
      process.stdout.write('    expected: ' + JSON.stringify(expected) + '\n');
      process.stdout.write('    actual:   ' + JSON.stringify(actual) + '\n');
    }
    ctx.assert(label, ok);
  },

  // Browser globals
  document,
  localStorage,
  window:              { location: { href: '' } },
  navigator:           { clipboard: null },
  requestAnimationFrame() {},
  setTimeout()         {},
  clearTimeout()       {},
  setInterval()        {},
  clearInterval()      {},
  URLSearchParams,
  Date,
  JSON,
  Array,
  Math,
  parseInt,
  parseFloat,
  isNaN,
  HTMLElement:         class {},
  console,
});

/* ===== Načti zdrojové soubory ===== */

function load(filePath, label) {
  const src = fs.readFileSync(filePath, 'utf8');
  try {
    vm.runInContext(src, ctx, { filename: label || filePath });
  } catch (e) {
    process.stderr.write('\x1b[31mChyba při načítání ' + (label || filePath) + ': ' + e.message + '\x1b[0m\n');
    process.exit(1);
  }
}

const ROOT = path.resolve(__dirname, '../..');
const TEST_DIR = __dirname;

// Načti testované moduly
load(path.join(ROOT, 'js/theme.js'), 'theme.js');
load(path.join(ROOT, 'js/ui.js'),    'ui.js');

/* ===== Spusť testovací soubory ===== */

// test_ui.js je browser-only (showToast/showConfirmModal závisí na živém DOM)
const BROWSER_ONLY = ['test_ui.js'];

const testFiles = fs.readdirSync(TEST_DIR)
  .filter(f => f.startsWith('test_') && f.endsWith('.js'))
  .sort();

for (const file of testFiles) {
  if (BROWSER_ONLY.includes(file)) {
    process.stdout.write('\n\x1b[33m⊘ ' + file + ' — browser-only, přeskočeno\x1b[0m\n');
    continue;
  }
  load(path.join(TEST_DIR, file), file);
}

/* ===== Souhrn ===== */

const total = passed + failed;
process.stdout.write('\n' + '─'.repeat(50) + '\n');
if (failed === 0) {
  process.stdout.write('\x1b[1;32m✓ Všechny testy prošly (' + passed + '/' + total + ')\x1b[0m\n');
} else {
  process.stdout.write('\x1b[1;31m✗ Selhalo: ' + failed + '/' + total + '\x1b[0m\n');
  for (const f of failures) process.stdout.write('  - ' + f + '\n');
}

process.exit(failed > 0 ? 1 : 0);
