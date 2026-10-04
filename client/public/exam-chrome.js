/**
 * Einheitliche linke Prüfungs-Leiste (Zieldesign) für alle KA/HU/QZ-HTML-Dateien.
 */
(function (global) {
  'use strict';

  var STYLE_MARKER = 'data-jm-exam-chrome-styles';

  function injectChromeStyles() {
    if (document.querySelector('style[' + STYLE_MARKER + ']')) return;
    var st = document.createElement('style');
    st.setAttribute(STYLE_MARKER, '1');
    st.textContent =
      '.exam-chrome{position:sticky;top:10px;display:flex;flex-direction:column;align-items:stretch;gap:8px;z-index:20;margin-left:0;padding-left:0;width:100%;max-width:152px}' +
      '.exam-chrome-clock-btn{display:none;align-items:center;justify-content:center;width:100%;min-height:36px;padding:6px;border:2px solid #E10600;border-radius:8px;background:#fff;color:#E10600;font-size:22px;line-height:1;cursor:pointer;box-sizing:border-box}' +
      '.exam-chrome-clock-btn:hover{background:#fff5f5}' +
      '.teacher-mode .exam-chrome-clock-btn.teacher-only{display:flex}' +
      '.exam-chrome.exam-timer-collapsed .timer-container{display:none}' +
      '.teacher-mode .exam-chrome .submit-section{display:none!important}';
    document.head.appendChild(st);
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
  }

  global.setupExamChrome = setupExamChrome;
})(typeof window !== 'undefined' ? window : globalThis);
