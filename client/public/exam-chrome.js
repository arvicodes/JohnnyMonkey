/**
 * Einheitliche linke Prüfungs-Leiste (Zieldesign) für alle KA/HU/QZ-HTML-Dateien.
 */
(function (global) {
  'use strict';

  var STYLE_MARKER = 'data-jm-exam-chrome-styles';

  function getExamFilePath() {
    if (global.__jmExamFilePath) return global.__jmExamFilePath;
    try {
      return new URLSearchParams(location.search).get('filePath') || '';
    } catch (e) {
      return '';
    }
  }

  function parseMinutesFromAids(text) {
    var m = String(text || '').match(/(\d+)/);
    if (!m) return null;
    var n = parseInt(m[1], 10);
    if (!n || n > 599) return null;
    return n;
  }

  function syncTimerDisplayFromAids() {
    var aidsTime = document.getElementById('aidsTime');
    var timer = document.getElementById('timer');
    if (!aidsTime || !timer) return;
    var mins = parseMinutesFromAids(aidsTime.textContent);
    if (mins == null) return;
    timer.textContent = String(mins).padStart(2, '0') + ':00';
  }

  var metaSaveTimer = null;

  function saveExamHeaderMeta() {
    if (localStorage.getItem('teacherId') === null) return;
    var filePath = getExamFilePath();
    if (!filePath) return;
    var aidsTimeEl = document.getElementById('aidsTime');
    var aidsToolsEl = document.getElementById('aidsTools');
    var aidsRulesEl = document.getElementById('aidsGeneralRules');
    fetch('/api/file-system-paths/save-exam-dollar-authoring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath: filePath,
        aidsTime: aidsTimeEl ? aidsTimeEl.textContent.trim() : undefined,
        aidsTools: aidsToolsEl ? aidsToolsEl.textContent.trim() : undefined,
        aidsGeneralRules: aidsRulesEl ? getAidsGeneralRulesSaveText(aidsRulesEl) : undefined,
      }),
      keepalive: true,
    }).catch(function () {
      /* ignore */
    });
  }

  function scheduleMetaSave() {
    clearTimeout(metaSaveTimer);
    metaSaveTimer = setTimeout(saveExamHeaderMeta, 500);
  }

  function escapeHtmlText(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function encodeRulesDataAttr(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function plainAidsGeneralRulesFromEl(el) {
    if (!el) return '';
    if (el.dataset.jmRulesPlain) return el.dataset.jmRulesPlain;
    var ul = el.querySelector('ul.aids-general-rules-list');
    if (ul) {
      return Array.prototype.map
        .call(ul.querySelectorAll('li'), function (li) {
          var src = li.getAttribute('data-jm-source');
          var body = src != null && String(src).length ? src : String(li.textContent || '').trim();
          if (li.classList.contains('aids-general-rules-list__no-marker')) {
            return body;
          }
          return '* ' + body;
        })
        .filter(Boolean)
        .join('\n\n');
    }
    return String(el.textContent || '');
  }

  function expandAidsRulesPlainLines(plain) {
    var lines = [];
    String(plain || '')
      .replace(/\r/g, '')
      .replace(/\uFEFF/g, '')
      .split(/\n+/)
      .forEach(function (line) {
        String(line || '')
          .split(/(?=\*\s)/)
          .forEach(function (part) {
            var t = part.trim();
            if (t) lines.push(t);
          });
      });
    return lines;
  }

  function renderAidsRulesItemHtml(text) {
    var t = String(text || '');
    if (typeof global.jmRenderExamDollarInline === 'function') {
      return global.jmRenderExamDollarInline(t);
    }
    return escapeHtmlText(t);
  }

  function renderAidsGeneralRulesList(el) {
    if (!el || el.classList.contains('exam-aids-editing')) return;
    var plain = String(el.dataset.jmRulesPlain || plainAidsGeneralRulesFromEl(el) || '')
      .replace(/\uFEFF/g, '')
      .trim();
    if (plain && !el.dataset.jmRulesPlain) {
      el.dataset.jmRulesPlain = plain;
    } else if (el.dataset.jmRulesPlain) {
      plain = String(el.dataset.jmRulesPlain).trim();
    }
    if (typeof global.jmNormalizeEmptyDollarWraps === 'function') {
      plain = global.jmNormalizeEmptyDollarWraps(plain);
      if (plain) el.dataset.jmRulesPlain = plain;
    }
    if (!plain) {
      el.innerHTML = '';
      delete el.dataset.jmRulesPlain;
      return;
    }
    var items = [];
    expandAidsRulesPlainLines(plain).forEach(function (line) {
      var trimmed = String(line || '').trim();
      if (!trimmed) return;
      var mStar = trimmed.match(/^\*(?:\s+)?([\s\S]*)$/);
      if (mStar) {
        var starText = String(mStar[1] || '').trim();
        if (starText) items.push({ marker: '*', text: starText });
        return;
      }
      var mDash = trimmed.match(/^-(?:\s+)?([\s\S]*)$/);
      if (mDash) {
        var dashText = String(mDash[1] || '').trim();
        if (dashText) items.push({ marker: '-', text: dashText });
        return;
      }
      items.push({ marker: '', text: trimmed });
    });
    if (!items.length) {
      el.textContent = plain;
      return;
    }
    el.innerHTML =
      '<ul class="aids-general-rules-list">' +
      items
        .map(function (item) {
          var srcAttr = ' data-jm-source="' + encodeRulesDataAttr(item.text) + '"';
          if (!item.marker) {
            return (
              '<li class="aids-general-rules-list__no-marker"' +
              srcAttr +
              '>' +
              renderAidsRulesItemHtml(item.text) +
              '</li>'
            );
          }
          return '<li' + srcAttr + '>' + renderAidsRulesItemHtml(item.text) + '</li>';
        })
        .join('') +
      '</ul>';
  }

  function getAidsGeneralRulesSaveText(el) {
    if (!el) return '';
    if (el.classList.contains('exam-aids-editing')) {
      var raw = String(el.textContent || '').trim();
      if (typeof global.jmNormalizeEmptyDollarWraps === 'function') {
        raw = global.jmNormalizeEmptyDollarWraps(raw);
      }
      return raw;
    }
    return String(el.dataset.jmRulesPlain || plainAidsGeneralRulesFromEl(el) || '').trim();
  }

  function parseTimerEditMinutes(text) {
    var t = String(text || '').trim();
    var mmss = t.match(/^(\d{1,3})\s*:\s*(\d{1,2})$/);
    if (mmss) return parseInt(mmss[1], 10);
    return parseMinutesFromAids(t);
  }

  function setupChromeTimerEditing() {
    if (localStorage.getItem('teacherId') === null) return;
    var timer = document.getElementById('timer');
    if (!timer || timer.__jmTeacherEdit) return;
    timer.__jmTeacherEdit = true;
    timer.setAttribute('contenteditable', 'true');
    timer.setAttribute('spellcheck', 'false');
    timer.setAttribute('title', 'Bearbeitungszeit ändern (z. B. 45:00 oder 45 Min)');
    timer.classList.add('exam-chrome-timer-editable');

    timer.addEventListener('focus', function () {
      if (typeof global.__jmPauseExamTimerForEdit === 'function') {
        global.__jmPauseExamTimerForEdit();
      }
      var aids = document.getElementById('aidsTime');
      var mins = parseMinutesFromAids(aids ? aids.textContent : timer.textContent);
      if (mins != null) {
        timer.textContent = String(mins).padStart(2, '0') + ':00';
      }
    });

    timer.addEventListener('blur', function () {
      var mins = parseTimerEditMinutes(timer.textContent);
      if (mins == null) return;
      if (typeof global.__jmExamSetDurationFromMinutes === 'function') {
        global.__jmExamSetDurationFromMinutes(mins);
      } else {
        timer.textContent = String(mins).padStart(2, '0') + ':00';
        var aids = document.getElementById('aidsTime');
        if (aids) aids.textContent = mins + ' Min';
      }
      scheduleMetaSave();
    });

    timer.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        timer.blur();
      }
    });
  }

  function setupExamHeaderMetaEditing() {
    var rulesEl0 = document.getElementById('aidsGeneralRules');
    if (rulesEl0) renderAidsGeneralRulesList(rulesEl0);
    if (localStorage.getItem('teacherId') === null) return;
    if (rulesEl0 && typeof global.jmWireExamDollarFormatKeys === 'function') {
      global.jmWireExamDollarFormatKeys(rulesEl0);
    }
    ['aidsTime', 'aidsTools', 'aidsGeneralRules'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'true');
      el.setAttribute('title', 'Klicken zum Bearbeiten');
      if (el.__jmMetaWired) return;
      el.__jmMetaWired = true;
      el.addEventListener('focus', function () {
        el.classList.add('exam-aids-editing');
        if (id === 'aidsGeneralRules') {
          el.textContent = String(el.dataset.jmRulesPlain || plainAidsGeneralRulesFromEl(el)).trim();
        }
      });
      el.addEventListener('blur', function () {
        el.classList.remove('exam-aids-editing');
        if (id === 'aidsGeneralRules') {
          var nextPlain = String(el.textContent || '').trim();
          if (typeof global.jmNormalizeEmptyDollarWraps === 'function') {
            nextPlain = global.jmNormalizeEmptyDollarWraps(nextPlain);
          }
          el.dataset.jmRulesPlain = nextPlain;
          renderAidsGeneralRulesList(el);
          if (typeof global.jmTypesetExamMath === 'function') {
            global.jmTypesetExamMath(el);
          }
        }
        if (id === 'aidsTime') syncTimerDisplayFromAids();
        updateAidsRulesRowVisibility();
        scheduleMetaSave();
      });
      el.addEventListener('keydown', function (e) {
        if (id === 'aidsGeneralRules' && el.classList.contains('exam-aids-editing')) {
          if (e.key === 'Enter' && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            if (typeof global.jmInsertExamDollarToken === 'function') {
              global.jmInsertExamDollarToken(el, '$e$');
            }
            return;
          }
        }
        if (e.key === 'Enter' && id !== 'aidsGeneralRules') {
          e.preventDefault();
          el.blur();
        }
      });
      el.addEventListener('input', function () {
        if (id === 'aidsTime') syncTimerDisplayFromAids();
        updateAidsRulesRowVisibility();
        scheduleMetaSave();
      });
    });
    syncTimerDisplayFromAids();
    updateAidsRulesRowVisibility();
  }

  function updateAidsRulesRowVisibility() {
    var el = document.getElementById('aidsGeneralRules');
    var row = el ? el.closest('.aids-row--rules') : null;
    if (!row || !el) return;
    var isTeacher = localStorage.getItem('teacherId') !== null;
    var empty = !String(el.textContent || '').trim();
    if (!isTeacher && empty) row.style.display = 'none';
    else row.style.display = '';
  }

  function injectChromeStyles() {
    var st = document.querySelector('style[' + STYLE_MARKER + ']');
    if (!st) {
      st = document.createElement('style');
      st.setAttribute(STYLE_MARKER, '1');
      document.head.appendChild(st);
    }
    st.textContent =
      '.exam-chrome{position:sticky;top:10px;display:flex;flex-direction:column;align-items:stretch;gap:8px;z-index:20;margin-left:0;padding-left:0;width:100%;max-width:152px}' +
      '.exam-chrome-clock-btn{display:none;align-items:center;justify-content:center;width:100%;min-height:36px;padding:6px;border:2px solid #E10600;border-radius:8px;background:#fff;color:#E10600;font-size:22px;line-height:1;cursor:pointer;box-sizing:border-box}' +
      '.exam-chrome-clock-btn:hover{background:#fff5f5}' +
      '.teacher-mode .exam-chrome-clock-btn.teacher-only{display:flex}' +
      '.exam-chrome.exam-timer-collapsed .timer-container{display:none}' +
      '.teacher-mode .exam-chrome .submit-section{display:none!important}' +
      '.afb-badge{display:none!important}' +
      '.teacher-mode .aids-val{cursor:text;border-radius:3px}' +
      '.teacher-mode .aids-val:hover{background:rgba(225,6,0,.06)}' +
      '.teacher-mode .aids-val.exam-aids-editing,.teacher-mode .aids-val:focus{outline:2px solid rgba(225,6,0,.35);background:#fff8f8}' +
      '.aids-box{width:100%;max-width:none;box-sizing:border-box}' +
      '.aids-row--rules{flex-direction:column;align-items:stretch;gap:4px}' +
      '.aids-key--rules{display:block;width:100%}' +
      '.aids-val-rules{white-space:pre-wrap;display:block;min-height:1.4em;line-height:1.45;width:100%;flex:none;min-width:0}' +
      '.aids-val-rules:not(.exam-aids-editing){white-space:normal}' +
      '.aids-val-rules .aids-general-rules-list{display:block}' +
      '.aids-val-rules.exam-aids-editing ul{display:none}' +
      '.aids-general-rules-list{margin:0;padding:0 0 0 1.35em;list-style:disc outside}' +
      '.aids-general-rules-list li{margin:0 0 5px;padding:0;line-height:1.45;display:list-item}' +
      '.aids-general-rules-list li:last-child{margin-bottom:0}' +
      '.aids-general-rules-list li.aids-general-rules-list__no-marker{list-style:none;margin-left:-1.35em;padding-left:0}' +
      '.teacher-mode #timer.exam-chrome-timer-editable{cursor:text}' +
      '.teacher-mode #timer.exam-chrome-timer-editable:focus{outline:2px solid rgba(225,6,0,.45);outline-offset:2px}';
  }

  function setupExamChromeTimerToggle() {
    var chrome = document.querySelector('.exam-chrome');
    if (!chrome) return;
    var btn = document.getElementById('examTimerToggle');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'examTimerToggle';
      btn.className = 'exam-chrome-clock-btn teacher-only';
      btn.title = 'Bearbeitungszeit ein- oder ausblenden';
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = '🕐';
      chrome.insertBefore(btn, chrome.firstChild);
    }
    if (localStorage.getItem('teacherId') === null) return;
    if (!chrome.classList.contains('exam-timer-collapsed')) {
      chrome.classList.add('exam-timer-collapsed');
    }
    btn.setAttribute('aria-expanded', 'false');
    if (btn.__jmTimerBound) return;
    btn.__jmTimerBound = true;
    btn.addEventListener('click', function () {
      chrome.classList.toggle('exam-timer-collapsed');
      var visible = !chrome.classList.contains('exam-timer-collapsed');
      btn.setAttribute('aria-expanded', visible ? 'true' : 'false');
    });
  }

  function ensureExamToolbar() {
    var toolbar = document.querySelector('.exam-toolbar');
    if (!toolbar) return;
    if (!document.getElementById('printBtn')) {
      var trio = document.createElement('div');
      trio.className = 'btn-trio';
      trio.setAttribute('role', 'group');
      trio.setAttribute('aria-label', 'Export');
      trio.innerHTML =
        '<button type="button" class="print-button" id="printBtn">Druck</button>' +
        '<button type="button" class="export-button" id="exportWordBtn">Word</button>' +
        '<button type="button" class="export-button" id="exportWordWithSolutionBtn">Word+L</button>';
      toolbar.insertBefore(trio, toolbar.firstChild);
    }
    if (!document.getElementById('schemaBtn')) {
      var schema = document.createElement('button');
      schema.type = 'button';
      schema.className = 'schema-button';
      schema.id = 'schemaBtn';
      schema.textContent = 'Bewertungsschema';
      toolbar.appendChild(schema);
    }
    if (!document.getElementById('solutionsToggle')) {
      var label = document.createElement('label');
      label.className = 'solutions-toggle teacher-only';
      label.htmlFor = 'solutionsToggle';
      label.innerHTML =
        '<input type="checkbox" id="solutionsToggle">' +
        '<span>Musterlösungen anzeigen</span>';
      toolbar.appendChild(label);
    }
  }

  function setupExamChrome() {
    injectChromeStyles();
    ensureExamToolbar();
    setupExamChromeTimerToggle();
    if (typeof global.jmRenderAidsGeneralRulesList === 'function') {
      global.jmRenderAidsGeneralRulesList();
      setTimeout(global.jmRenderAidsGeneralRulesList, 0);
    }
    setupExamHeaderMetaEditing();
    setupChromeTimerEditing();
    updateAidsRulesRowVisibility();
  }

  global.setupExamChrome = setupExamChrome;
  global.jmRenderAidsGeneralRulesList = function () {
    var el = document.getElementById('aidsGeneralRules');
    if (el) renderAidsGeneralRulesList(el);
  };
})(typeof window !== 'undefined' ? window : globalThis);
