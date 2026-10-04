/**
 * Prüfungs-Autoren-Befehle: Text zwischen $…$
 * $Aufgabe 1$  neue Aufgabenüberschrift
 * $5 Punkte$   Punkte rechts in der Aufgabenzeile
 * $C$          Checkbox
 * $CC$         Checkbox (richtige Lösung)
 * $_$          kleine Lücke (inline)
 * $__$         großes Eingabefeld
 */
(function (global) {
  'use strict';

  var MARKER = 'data-jm-exam-dollar';

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parseAufgabe(inner) {
    var m = String(inner || '').trim().match(/^Aufgabe\s+(.+)$/i);
    return m ? m[1].trim() : null;
  }

  function parsePunkte(inner) {
    var m = String(inner || '')
      .trim()
      .match(/^(\d+(?:[.,]\d+)?)\s*Punkte$/i);
    return m ? m[1].replace(',', '.') : null;
  }

  function renderInline(text, idGen) {
    var re = /\$([^$]+)\$/g;
    var out = '';
    var last = 0;
    var m;
    while ((m = re.exec(text)) !== null) {
      out += escapeHtml(text.slice(last, m.index));
      var inner = m[1].trim();
      if (inner === '__') {
        out +=
          '<div class="item input-group full-width exam-dollar-biggap">' +
          '<textarea class="exam-dollar-area" rows="4" id="' +
          idGen() +
          '"></textarea></div>';
      } else if (inner === '_') {
        out +=
          '<input type="text" class="exam-dollar-gap blank-tiny" id="' +
          idGen() +
          '" autocomplete="off">';
      } else if (/^CC$/i.test(inner)) {
        out +=
          '<label class="exam-dollar-choice exam-dollar-choice-correct">' +
          '<input type="checkbox" class="exam-dollar-choice-input" data-correct="1">' +
          '<span class="exam-dollar-choice-box" aria-hidden="true"></span></label>';
      } else if (/^C$/i.test(inner)) {
        out +=
          '<label class="exam-dollar-choice">' +
          '<input type="checkbox" class="exam-dollar-choice-input">' +
          '<span class="exam-dollar-choice-box" aria-hidden="true"></span></label>';
      } else if (parsePunkte(inner) || parseAufgabe(inner)) {
        out += escapeHtml(m[0]);
      } else {
        out += escapeHtml(m[0]);
      }
      last = re.lastIndex;
    }
    out += escapeHtml(text.slice(last));
    return out;
  }

  function applySourceToTask(taskEl, source) {
    var rendered = taskEl.querySelector('.exam-dollar-rendered');
    if (!rendered) return;
    var taskNumEl = taskEl.querySelector('.task-number');
    var pointsEl = taskEl.querySelector('.task-meta .points');
    var lines = String(source || '').split(/\r?\n/);
    var aufgabeLabel = null;
    var pointsVal = null;
    var bodyLines = [];
    var i;
    for (i = 0; i < lines.length; i++) {
      var raw = lines[i];
      var t = raw.trim();
      var solo = t.match(/^\$([^$]+)\$$/);
      if (solo) {
        var cmd = solo[1].trim();
        var a = parseAufgabe(cmd);
        if (a) {
          aufgabeLabel = a;
          continue;
        }
        var p = parsePunkte(cmd);
        if (p) {
          pointsVal = p;
          continue;
        }
      }
      if (t.length) bodyLines.push(raw);
    }
    if (aufgabeLabel && taskNumEl) {
      taskNumEl.textContent = 'Aufgabe ' + aufgabeLabel;
    }
    if (pointsVal != null && pointsEl) {
      pointsEl.textContent = pointsVal + ' Punkte';
    }
    var n = 0;
    function idGen() {
      n += 1;
      return 'examDollar_' + Date.now().toString(36) + '_' + n;
    }
    var html = '';
    for (i = 0; i < bodyLines.length; i++) {
      var line = bodyLines[i];
      if (!/\$[^$]+\$/.test(line) && /<[a-z][\s\S]*>/i.test(line)) {
        html += '<p>' + line + '</p>';
      } else {
        html += '<p>' + renderInline(line, idGen) + '</p>';
      }
    }
    if (!html) html = '<p class="exam-dollar-empty-hint"></p>';
    rendered.innerHTML = html;
    if (typeof global.attachInputListeners === 'function') {
      try {
        global.attachInputListeners();
      } catch (e) {
        /* ignore */
      }
    }
  }

  function nextTaskNumber() {
    var tasks = document.querySelectorAll('.exam-paper .task');
    return tasks.length + 1;
  }

  function createTaskFromTemplate(aufgabeLabel) {
    var paper = document.querySelector('.exam-paper');
    var footer = paper ? paper.querySelector('.footer') : null;
    var insertBefore = footer;
    if (!paper || !insertBefore) return null;
    var proto = paper.querySelector('.task');
    var taskEl;
    if (proto) {
      taskEl = proto.cloneNode(true);
      taskEl.querySelectorAll('[id]').forEach(function (el) {
        el.removeAttribute('id');
      });
    } else {
      taskEl = document.createElement('div');
      taskEl.className = 'task';
      taskEl.innerHTML =
        '<div class="task-header">' +
        '<div class="task-number">Aufgabe</div>' +
        '<div class="task-meta teacher-only">' +
        '<span class="afb-badge afb-1">AFB I</span>' +
        '<div class="points">… Punkte</div></div></div>' +
        '<div class="task-content">' +
        '<div class="exam-dollar-rendered"></div>' +
        '<div class="exam-dollar-live-edit teacher-only" contenteditable="true" spellcheck="true" role="textbox" aria-multiline="true"></div>' +
        '<textarea class="exam-dollar-source" hidden aria-hidden="true"></textarea>' +
        '</div>';
    }
    var src = taskEl.querySelector('.exam-dollar-source');
    var label = aufgabeLabel || String(nextTaskNumber());
    if (src) {
      src.value = '$Aufgabe ' + label + '$\n$5 Punkte$\n';
    }
    paper.insertBefore(taskEl, insertBefore);
    wireTaskSource(taskEl);
    wireLiveEdit(taskEl);
    if (src) applySourceToTask(taskEl, src.value);
    return taskEl;
  }

  function syncLiveEditFromSource(taskEl) {
    var src = taskEl.querySelector('.exam-dollar-source');
    var live = taskEl.querySelector('.exam-dollar-live-edit');
    if (!src || !live) return;
    if (!live.dataset.jmTouched && src.value) {
      live.textContent = src.value;
    }
  }

  function wireLiveEdit(taskEl) {
    var live = taskEl.querySelector('.exam-dollar-live-edit');
    var src = taskEl.querySelector('.exam-dollar-source');
    if (!live || !src || live.__jmLiveWired) return;
    live.__jmLiveWired = true;
    syncLiveEditFromSource(taskEl);
    var debounce;
    live.addEventListener('input', function () {
      live.dataset.jmTouched = '1';
      src.value = live.innerText || '';
      clearTimeout(debounce);
      debounce = setTimeout(function () {
        applySourceToTask(taskEl, src.value);
      }, 60);
    });
    live.addEventListener('blur', function () {
      src.value = live.innerText || '';
      applySourceToTask(taskEl, src.value);
    });
  }

  function wireTaskSource(taskEl) {
    var src = taskEl.querySelector('.exam-dollar-source');
    if (!src || src.__jmDollarWired) return;
    src.__jmDollarWired = true;
    src.addEventListener('input', function () {
      applySourceToTask(taskEl, src.value);
    });
  }

  function ensureTaskStructure(taskEl) {
    var content = taskEl.querySelector('.task-content');
    if (!content) return;
    if (!content.querySelector('.exam-dollar-rendered')) {
      var rendered = document.createElement('div');
      rendered.className = 'exam-dollar-rendered';
      var child = content.firstChild;
      while (child) {
        var next = child.nextSibling;
        if (
          child.nodeType === 1 &&
          child.classList &&
          (child.classList.contains('solution') || child.classList.contains('exam-dollar-source'))
        ) {
          child = next;
          continue;
        }
        rendered.appendChild(child);
        child = next;
      }
      content.insertBefore(rendered, content.firstChild);
    }
    if (!content.querySelector('.exam-dollar-live-edit')) {
      var live = document.createElement('div');
      live.className = 'exam-dollar-live-edit teacher-only';
      live.setAttribute('contenteditable', 'true');
      live.setAttribute('spellcheck', 'true');
      live.setAttribute('role', 'textbox');
      live.setAttribute('aria-multiline', 'true');
      live.setAttribute(
        'data-placeholder',
        'Hier schreiben — $Aufgabe 1$, $5 Punkte$, $_$, $C$ …',
      );
      var rendered = content.querySelector('.exam-dollar-rendered');
      if (rendered && rendered.nextSibling) {
        content.insertBefore(live, rendered.nextSibling);
      } else {
        content.appendChild(live);
      }
    }
    if (!content.querySelector('.exam-dollar-source')) {
      var ta = document.createElement('textarea');
      ta.className = 'exam-dollar-source';
      ta.setAttribute('hidden', 'hidden');
      ta.setAttribute('aria-hidden', 'true');
      ta.value = renderedPlainFromTask(content);
      content.appendChild(ta);
    }
  }

  function renderedPlainFromTask(content) {
    var r = content.querySelector('.exam-dollar-rendered');
    if (!r) return '';
    return r.innerText || '';
  }

  function handleComposeInput(textarea) {
    var raw = String(textarea.value || '').trim();
    if (!raw) return;
    var firstLine = raw.split(/\r?\n/)[0].trim();
    var solo = firstLine.match(/^\$([^$]+)\$$/);
    if (!solo) return;
    var a = parseAufgabe(solo[1].trim());
    if (!a) return;
    var task = createTaskFromTemplate(a);
    if (!task) return;
    var src = task.querySelector('.exam-dollar-source');
    if (src) {
      var rest = raw.split(/\r?\n/).slice(1).join('\n').trim();
      if (rest) src.value = '$Aufgabe ' + a + '$\n' + rest;
      else src.value = '$Aufgabe ' + a + '$\n$5 Punkte$\n';
      syncLiveEditFromSource(task);
      applySourceToTask(task, src.value);
      var live = task.querySelector('.exam-dollar-live-edit');
      if (live) live.focus();
    }
    textarea.value = '';
  }

  function injectStyles() {
    if (document.querySelector('style[' + MARKER + ']')) return;
    var st = document.createElement('style');
    st.setAttribute(MARKER, '1');
    st.textContent =
      '.exam-dollar-source{display:none!important}' +
      '.exam-dollar-rendered{margin-bottom:6px}' +
      '.teacher-mode .exam-dollar-live-edit{display:block;min-height:72px;padding:4px 2px;font-size:14px;line-height:1.55;font-family:Arial,sans-serif;color:#222;outline:none;border-radius:4px;white-space:pre-wrap;word-break:break-word}' +
      '.teacher-mode .exam-dollar-live-edit:focus{box-shadow:0 0 0 2px rgba(225,6,0,0.25)}' +
      '.teacher-mode .exam-dollar-live-edit:empty::before{content:attr(data-placeholder);color:#999;font-style:italic}' +
      '.exam-dollar-compose{margin:0;padding:10px;border:1px dashed #ef6c00;border-radius:8px;background:#fff8f0}' +
      '.exam-dollar-compose-label{font-size:11px;font-weight:700;color:#e65100;margin-bottom:6px}' +
      '.exam-dollar-compose-input{width:100%;font-family:Consolas,Monaco,monospace;font-size:12px;padding:8px;border:1px solid #ffb74d;border-radius:6px;resize:vertical;box-sizing:border-box}' +
      '.exam-dollar-choice{display:inline-flex;align-items:center;margin:0 6px 0 2px;vertical-align:middle;cursor:pointer}' +
      '.exam-dollar-choice-input{position:absolute;opacity:0;width:0;height:0}' +
      '.exam-dollar-choice-box{display:inline-block;width:16px;height:16px;border:2px solid #333;border-radius:3px;background:#fff;vertical-align:middle}' +
      '.exam-dollar-choice-input:checked + .exam-dollar-choice-box{background:#E10600;border-color:#b71c1c;box-shadow:inset 0 0 0 2px #fff}' +
      '.exam-dollar-choice-correct .exam-dollar-choice-box{border-color:#2e7d32}' +
      '.teacher-mode .exam-dollar-choice-correct .exam-dollar-choice-box{outline:2px solid #81c784}' +
      '.exam-dollar-gap{display:inline-block;vertical-align:baseline}' +
      '.exam-dollar-area{width:100%;min-height:72px}' +
      '.exam-dollar-hint{font-size:10px;color:#888;margin-top:4px}';
    document.head.appendChild(st);
  }

  function ensureComposeArea() {
    if (document.querySelector('.exam-dollar-compose')) return;
    var mount = document.getElementById('examChromeComposeMount');
    var wrap = document.createElement('div');
    wrap.className = 'exam-dollar-compose teacher-only';
    wrap.innerHTML =
      '<div class="exam-dollar-compose-label">+ Aufgabe</div>' +
      '<textarea class="exam-dollar-compose-input" rows="2" placeholder="$Aufgabe 2$"></textarea>' +
      '<div class="exam-dollar-hint">Strg+Eingabe oder Tab verlassen</div>';
    if (mount) mount.appendChild(wrap);
    else {
      var chrome = document.querySelector('.exam-chrome');
      if (chrome) chrome.appendChild(wrap);
    }
    var ta = wrap.querySelector('.exam-dollar-compose-input');
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleComposeInput(ta);
      }
    });
    ta.addEventListener('blur', function () {
      handleComposeInput(ta);
    });
  }

  function setupExamDollarAuthoring() {
    if (localStorage.getItem('teacherId') === null) {
      document.querySelectorAll('.exam-dollar-source').forEach(function (el) {
        el.parentNode && el.parentNode.removeChild(el);
      });
      document.querySelectorAll('.exam-dollar-compose').forEach(function (el) {
        el.parentNode && el.parentNode.removeChild(el);
      });
      document.querySelectorAll('.exam-dollar-live-edit').forEach(function (el) {
        el.parentNode && el.parentNode.removeChild(el);
      });
      return;
    }
    if (typeof setupExamChrome === 'function') setupExamChrome();
    injectStyles();
    ensureComposeArea();
    document.querySelectorAll('.exam-paper .task').forEach(function (taskEl) {
      ensureTaskStructure(taskEl);
      wireTaskSource(taskEl);
      wireLiveEdit(taskEl);
      var src = taskEl.querySelector('.exam-dollar-source');
      if (src) applySourceToTask(taskEl, src.value);
    });
  }

  global.setupExamDollarAuthoring = setupExamDollarAuthoring;
})(typeof window !== 'undefined' ? window : globalThis);
