/**
 * Prüfungs-Autoren-Befehle: Text zwischen $…$
 * $Aufgabe 1$  neue Aufgabenüberschrift
 * $5 Punkte$   Punkte rechts in der Aufgabenzeile
 * $C$          Checkbox
 * $CC$         Checkbox (richtige Lösung)
 * $_$          kleine Lücke (inline)
 * $_a/b/c_$    Lücke mit mehreren gültigen Lösungen
 * $__$         großes Eingabefeld
 * $B Wort B$   fett · $I Wort I$ kursiv · $U Wort U$ unterstrichen
 */
(function (global) {
  'use strict';

  var MARKER = 'data-jm-exam-dollar';
  var saveTimer = null;
  var saveInFlight = false;

  function getExamFilePath() {
    if (global.__jmExamFilePath) return global.__jmExamFilePath;
    try {
      return new URLSearchParams(location.search).get('filePath') || '';
    } catch (e) {
      return '';
    }
  }

  function isDefaultBoilerplateSource(text) {
    var t = String(text || '');
    return (
      t.indexOf('Hier die Aufgaben eintragen') >= 0 ||
      t.indexOf('<strong>Hier</strong>') >= 0 ||
      (t.indexOf('Checkbox $C$') >= 0 && t.indexOf('richtige Lösung') >= 0)
    );
  }

  function stripDefaultBoilerplateSource(text) {
    if (!isDefaultBoilerplateSource(text)) return text;
    var lines = String(text || '').split(/\r?\n/);
    var kept = [];
    var i;
    for (i = 0; i < lines.length; i++) {
      var tr = lines[i].trim();
      if (/^\$Aufgabe\s+/i.test(tr)) kept.push(lines[i]);
      else if (/^\$\d/.test(tr) && /Punkte\s*\$/i.test(tr)) kept.push(lines[i]);
    }
    if (!kept.length) return '$Aufgabe 1$\n$5 Punkte$\n';
    return kept.join('\n') + '\n';
  }

  function syncAllLiveToSource() {
    document.querySelectorAll('.exam-paper .task').forEach(function (taskEl) {
      syncSourceFromLiveEdit(taskEl);
    });
  }

  function collectTaskSourcesForSave() {
    syncAllLiveToSource();
    var out = [];
    document.querySelectorAll('.exam-paper .task').forEach(function (taskEl) {
      var src = taskEl.querySelector('.exam-dollar-source');
      out.push(src ? src.value : '');
    });
    return out;
  }

  function setSaveStatus(msg, isError) {
    var el = document.getElementById('examDollarSaveStatus');
    if (!el) {
      var chrome = document.querySelector('.exam-chrome');
      if (!chrome) return;
      el = document.createElement('div');
      el.id = 'examDollarSaveStatus';
      el.className = 'teacher-only';
      el.style.cssText =
        'font-size:9px;line-height:1.2;color:#666;text-align:center;min-height:14px;padding:0 2px';
      var toolbar = document.querySelector('.exam-toolbar');
      if (toolbar && toolbar.nextSibling) chrome.insertBefore(el, toolbar.nextSibling);
      else chrome.appendChild(el);
    }
    el.textContent = msg || '';
    el.style.color = isError ? '#c62828' : '#666';
  }

  function saveExamDollarAuthoring(opts) {
    if (localStorage.getItem('teacherId') === null) return Promise.resolve();
    var filePath = getExamFilePath();
    if (!filePath) return Promise.resolve();
    var tasks = collectTaskSourcesForSave();
    if (!tasks.length) return Promise.resolve();
    if (saveInFlight && !(opts && opts.force)) return Promise.resolve();
    saveInFlight = true;
    return fetch('/api/file-system-paths/save-exam-dollar-authoring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: filePath, tasks: tasks }),
      keepalive: !!(opts && opts.keepalive),
    })
      .then(function (r) {
        if (!r.ok) throw new Error('save failed');
        setSaveStatus('Gespeichert');
        return r.json();
      })
      .catch(function () {
        setSaveStatus('Speichern fehlgeschlagen', true);
      })
      .finally(function () {
        saveInFlight = false;
      });
  }

  function scheduleSave(opts) {
    if (opts && opts.immediate) {
      clearTimeout(saveTimer);
      syncAllLiveToSource();
      return saveExamDollarAuthoring({ force: true });
    }
    clearTimeout(saveTimer);
    setSaveStatus('Speichern…');
    saveTimer = setTimeout(function () {
      saveExamDollarAuthoring();
    }, 600);
  }

  function bindExamPersistence() {
    if (global.__jmExamDollarPersistenceBound) return;
    global.__jmExamDollarPersistenceBound = true;
    window.addEventListener('pagehide', function () {
      syncAllLiveToSource();
      saveExamDollarAuthoring({ keepalive: true, force: true });
    });
    window.addEventListener('beforeunload', function () {
      syncAllLiveToSource();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        syncAllLiveToSource();
        saveExamDollarAuthoring({ keepalive: true, force: true });
      }
    });
  }

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

  function parseTaskSource(source) {
    var lines = String(source || '').split(/\r?\n/);
    var aufgabeLabel = null;
    var pointsVal = null;
    var bodyLines = [];
    var i;
    for (i = 0; i < lines.length; i++) {
      var raw = lines[i];
      var t = raw.trim();
      if (!t) continue;
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
      bodyLines.push(raw);
    }
    return {
      aufgabeLabel: aufgabeLabel,
      pointsVal: pointsVal,
      body: bodyLines.join('\n').trim(),
    };
  }

  function composeTaskSource(aufgabeLabel, pointsVal, body) {
    var lines = [];
    if (aufgabeLabel) lines.push('$Aufgabe ' + aufgabeLabel + '$');
    if (pointsVal != null && pointsVal !== '') lines.push('$' + pointsVal + ' Punkte$');
    var b = String(body || '').trim();
    if (b) lines.push(b);
    if (!lines.length) return '';
    return lines.join('\n') + '\n';
  }

  function syncSourceFromLiveEdit(taskEl) {
    var live = taskEl.querySelector('.exam-dollar-live-edit');
    var src = taskEl.querySelector('.exam-dollar-source');
    if (!live || !src) return;
    var meta = parseTaskSource(src.value);
    src.value = composeTaskSource(meta.aufgabeLabel, meta.pointsVal, live.innerText || '');
  }

  function renumberExamTasks() {
    var tasks = document.querySelectorAll('.exam-paper .task');
    tasks.forEach(function (taskEl, idx) {
      var n = String(idx + 1);
      var src = taskEl.querySelector('.exam-dollar-source');
      var meta = parseTaskSource(src ? src.value : '');
      if (meta.pointsVal == null) meta.pointsVal = '5';
      meta.aufgabeLabel = n;
      var body = meta.body;
      var live = taskEl.querySelector('.exam-dollar-live-edit');
      if (live) live.textContent = body;
      if (src) src.value = composeTaskSource(meta.aufgabeLabel, meta.pointsVal, body);
      applySourceToTask(taskEl, src ? src.value : '');
    });
    updateComposePlaceholder();
  }

  function ensureDeleteButton(taskEl) {
    var header = taskEl.querySelector('.task-header');
    if (!header || header.querySelector('.exam-task-delete')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'exam-task-delete teacher-only';
    btn.title = 'Aufgabe löschen';
    btn.setAttribute('aria-label', 'Aufgabe löschen');
    btn.textContent = '×';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var tasks = document.querySelectorAll('.exam-paper .task');
      if (tasks.length <= 1) {
        window.alert('Mindestens eine Aufgabe muss bleiben.');
        return;
      }
      if (!window.confirm('Diese Aufgabe wirklich löschen?')) return;
      taskEl.parentNode && taskEl.parentNode.removeChild(taskEl);
      renumberExamTasks();
      scheduleSave({ immediate: true });
    });
    header.appendChild(btn);
  }

  function encodeAcceptedAttr(answers) {
    return answers
      .map(function (a) {
        return String(a || '').replace(/\|/g, '').trim();
      })
      .filter(Boolean)
      .join('|');
  }

  function parseGapToken(inner) {
    if (inner === '_') return { answers: [] };
    if (inner === '__') return null;
    var wrapped = inner.match(/^_(.+)_$/);
    if (!wrapped) return null;
    var body = wrapped[1];
    if (!body) return { answers: [] };
    if (body.indexOf('/') >= 0) {
      return {
        answers: body
          .split('/')
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean),
      };
    }
    return { answers: [body] };
  }

  function renderInline(text, idGen) {
    var re = /\$([^$]+)\$/g;
    var out = '';
    var last = 0;
    var m;
    while ((m = re.exec(text)) !== null) {
      out += escapeHtml(text.slice(last, m.index));
      var inner = m[1].trim();
      var boldM = inner.match(/^B\s+([\s\S]+?)\s+B$/i);
      var italicM = inner.match(/^I\s+([\s\S]+?)\s+I$/i);
      var underM = inner.match(/^U\s+([\s\S]+?)\s+U$/i);
      if (boldM) {
        out += '<strong>' + renderInline(boldM[1], idGen) + '</strong>';
      } else if (italicM) {
        out += '<em>' + renderInline(italicM[1], idGen) + '</em>';
      } else if (underM) {
        out += '<u>' + renderInline(underM[1], idGen) + '</u>';
      } else if (inner === '__') {
        out +=
          '<div class="item input-group full-width exam-dollar-biggap">' +
          '<textarea class="exam-dollar-area" rows="4" id="' +
          idGen() +
          '"></textarea></div>';
      } else {
        var gap = parseGapToken(inner);
        if (gap) {
          var id = idGen();
          var accepted = encodeAcceptedAttr(gap.answers);
          var attr = accepted
            ? ' data-jm-accepted="' + escapeHtml(accepted) + '"'
            : '';
          out +=
            '<input type="text" class="exam-dollar-gap blank-tiny" id="' +
            id +
            '"' +
            attr +
            ' autocomplete="off">';
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
      if (pointsVal != null && taskNumEl.querySelector('span')) {
        taskNumEl.innerHTML =
          'Aufgabe ' +
          escapeHtml(aufgabeLabel) +
          ' <span style="font-size: 11px; color: #666; font-weight: normal;">(' +
          escapeHtml(pointsVal) +
          ' Punkte)</span>';
      } else {
        taskNumEl.textContent = 'Aufgabe ' + aufgabeLabel;
      }
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
      html += '<p>' + renderInline(bodyLines[i], idGen) + '</p>';
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
    var composeMount = document.getElementById('examPaperComposeMount');
    var footer = paper ? paper.querySelector('.footer') : null;
    var insertBefore = composeMount || footer;
    if (!paper || !insertBefore) return null;
    var proto = paper.querySelector('.task');
    var taskEl;
    if (proto) {
      taskEl = proto.cloneNode(true);
      taskEl.querySelectorAll('[id]').forEach(function (el) {
        el.removeAttribute('id');
      });
      var renderedClone = taskEl.querySelector('.exam-dollar-rendered');
      if (renderedClone) renderedClone.innerHTML = '';
      var liveClone = taskEl.querySelector('.exam-dollar-live-edit');
      if (liveClone) {
        liveClone.textContent = '';
        delete liveClone.dataset.jmTouched;
        delete liveClone.__jmLiveWired;
      }
      var srcClone = taskEl.querySelector('.exam-dollar-source');
      if (srcClone) delete srcClone.__jmDollarWired;
      taskEl.querySelectorAll('.exam-task-delete').forEach(function (el) {
        el.parentNode && el.parentNode.removeChild(el);
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
      src.value = composeTaskSource(label, '5', '');
    }
    paper.insertBefore(taskEl, insertBefore);
    ensureDeleteButton(taskEl);
    wireTaskSource(taskEl);
    wireLiveEdit(taskEl);
    if (src) {
      syncLiveEditFromSource(taskEl);
      applySourceToTask(taskEl, src.value);
    }
    renumberExamTasks();
    return taskEl;
  }

  function syncLiveEditFromSource(taskEl) {
    var src = taskEl.querySelector('.exam-dollar-source');
    var live = taskEl.querySelector('.exam-dollar-live-edit');
    if (!src || !live) return;
    var meta = parseTaskSource(src.value);
    live.textContent = meta.body;
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
      syncSourceFromLiveEdit(taskEl);
      clearTimeout(debounce);
      debounce = setTimeout(function () {
        applySourceToTask(taskEl, src.value);
        scheduleSave();
      }, 80);
    });
    live.addEventListener('blur', function () {
      syncSourceFromLiveEdit(taskEl);
      applySourceToTask(taskEl, src.value);
      scheduleSave({ immediate: true });
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
        '$Aufgabe 1$, $5 Punkte$, $_$, $_a/b/c_$, $B fett B$, $C$ …',
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
      var restMeta = parseTaskSource(rest);
      var body = restMeta.body;
      var pts = restMeta.pointsVal != null ? restMeta.pointsVal : '5';
      src.value = composeTaskSource(a, pts, body);
      syncLiveEditFromSource(task);
      applySourceToTask(task, src.value);
      var live = task.querySelector('.exam-dollar-live-edit');
      if (live) live.focus();
    }
    textarea.value = '';
    renumberExamTasks();
    scheduleSave({ immediate: true });
  }

  function updateComposePlaceholder() {
    var ta = document.querySelector('.exam-dollar-compose-input');
    if (ta) ta.placeholder = '$Aufgabe ' + nextTaskNumber() + '$';
  }

  function ensurePaperComposeMount() {
    var paper = document.querySelector('.exam-paper');
    if (!paper) return null;
    var mount = document.getElementById('examPaperComposeMount');
    if (!mount) {
      mount = document.createElement('div');
      mount.id = 'examPaperComposeMount';
      mount.className = 'teacher-only';
      mount.setAttribute('aria-label', 'Neue Aufgabe');
      var footer = paper.querySelector('.footer');
      if (footer) paper.insertBefore(mount, footer);
      else paper.appendChild(mount);
    }
    var legacyChrome = document.getElementById('examChromeComposeMount');
    if (legacyChrome) {
      while (legacyChrome.firstChild) mount.appendChild(legacyChrome.firstChild);
      if (legacyChrome.parentNode) legacyChrome.parentNode.removeChild(legacyChrome);
    }
    var compose = document.querySelector('.exam-dollar-compose');
    if (compose && compose.parentNode !== mount) {
      mount.appendChild(compose);
    }
    return mount;
  }

  function injectStyles() {
    var st = document.querySelector('style[' + MARKER + ']');
    if (!st) {
      st = document.createElement('style');
      st.setAttribute(MARKER, '1');
      document.head.appendChild(st);
    }
    st.textContent =
      '.exam-dollar-source{display:none!important}' +
      '.teacher-mode .task-content{display:flex;flex-direction:column}' +
      '.teacher-mode .exam-dollar-live-edit{order:1}' +
      '.teacher-mode .exam-dollar-rendered{order:2}' +
      '.teacher-mode .task-content .solution{order:3}' +
      '.exam-dollar-rendered{margin-bottom:6px;font-family:Arial,sans-serif;font-size:14px;line-height:1.55}' +
      '.teacher-mode .task-content .exam-dollar-rendered{display:block!important;margin-top:10px;padding-top:8px;border-top:1px dashed #ddd}' +
      '.teacher-mode .task-content .exam-dollar-rendered::before{content:"Vorschau";display:block;font-size:10px;font-weight:700;color:#888;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em}' +
      '.teacher-mode .exam-dollar-live-edit{display:block;min-height:56px;padding:6px 4px;line-height:1.55;font-family:Arial,sans-serif;font-size:14px;color:#222;outline:none;border-radius:4px;white-space:pre-wrap;word-break:break-word}' +
      '.teacher-mode .exam-dollar-live-edit:focus{box-shadow:0 0 0 2px rgba(225,6,0,0.25)}' +
      '.task-header{display:flex;align-items:flex-start;justify-content:space-between;gap:6px}' +
      '.task-header .task-number{flex:1;min-width:0}' +
      '.exam-task-delete{flex-shrink:0;width:24px;height:24px;border:1px solid #d0d0d0;border-radius:5px;background:#fff;color:#c62828;font-size:18px;line-height:1;cursor:pointer;padding:0;margin-top:2px}' +
      '.exam-task-delete:hover{background:#ffebee;border-color:#e57373}' +
      '#examPaperComposeMount{margin:20px 0 8px}' +
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
  }

  function ensureComposeArea() {
    var mount = ensurePaperComposeMount();
    var wrap = document.querySelector('.exam-dollar-compose');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'exam-dollar-compose teacher-only';
      wrap.innerHTML =
        '<div class="exam-dollar-compose-label">+ Aufgabe</div>' +
        '<textarea class="exam-dollar-compose-input" rows="2"></textarea>' +
        '<div class="exam-dollar-hint">Strg+Eingabe oder Tab verlassen</div>';
      if (mount) mount.appendChild(wrap);
      else {
        var paper = document.querySelector('.exam-paper');
        if (paper) paper.appendChild(wrap);
      }
    }
    var ta = wrap.querySelector('.exam-dollar-compose-input');
    if (ta && !ta.__jmComposeBound) {
      ta.__jmComposeBound = true;
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
    updateComposePlaceholder();
  }

  function setupExamDollarAuthoring() {
    if (localStorage.getItem('teacherId') === null) {
      document.querySelectorAll('.exam-paper .task').forEach(function (taskEl) {
        var src = taskEl.querySelector('.exam-dollar-source');
        if (src && src.value) applySourceToTask(taskEl, src.value);
      });
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
    bindExamPersistence();
    document.querySelectorAll('.exam-paper .task').forEach(function (taskEl) {
      ensureTaskStructure(taskEl);
      ensureDeleteButton(taskEl);
      wireTaskSource(taskEl);
      wireLiveEdit(taskEl);
      var src = taskEl.querySelector('.exam-dollar-source');
      if (src) {
        var cleaned = stripDefaultBoilerplateSource(src.value);
        var meta = parseTaskSource(cleaned);
        src.value = composeTaskSource(meta.aufgabeLabel, meta.pointsVal, meta.body);
        syncLiveEditFromSource(taskEl);
        applySourceToTask(taskEl, src.value);
      }
    });
    renumberExamTasks();
    var fp = getExamFilePath();
    if (fp) {
      setSaveStatus('');
      scheduleSave({ immediate: true });
    } else setSaveStatus('Pfad unbekannt — Speichern nur in der App-Vorschau', true);
  }

  global.setupExamDollarAuthoring = setupExamDollarAuthoring;
})(typeof window !== 'undefined' ? window : globalThis);
