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
 * $rot Wort rot$  Farbe (rot/gruen/blau/orange/lila) · $#ff0000$ Text $#ff0000$ Hex
 * $Bild name.png$  Bild (gleicher Ordner wie die Prüfung; Drag & Drop ins Textfeld)
 * $Musterlösung$    ab dieser Zeile: Text für die grüne Musterlösungsbox
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

  var NAMED_COLORS = {
    rot: '#c62828',
    gruen: '#2e7d32',
    grün: '#2e7d32',
    blau: '#1565c0',
    orange: '#e65100',
    lila: '#7b1fa2',
    violett: '#7b1fa2',
    schwarz: '#111111',
  };

  function isMusterloesungMarker(line) {
    var t = String(line || '').trim();
    return /^\$Musterlösung\$$/i.test(t) || /^\$Musterloesung\$$/i.test(t);
  }

  function splitBodyAndSolutionLines(bodyLines) {
    var idx = -1;
    var i;
    for (i = 0; i < bodyLines.length; i++) {
      if (isMusterloesungMarker(bodyLines[i])) {
        idx = i;
        break;
      }
    }
    if (idx < 0) {
      return { body: bodyLines.join('\n').trim(), solution: '' };
    }
    return {
      body: bodyLines.slice(0, idx).join('\n').trim(),
      solution: bodyLines.slice(idx + 1).join('\n').trim(),
    };
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
      if (!t && bodyLines.length === 0 && aufgabeLabel == null && pointsVal == null) continue;
      var solo = t.match(/^\$([^$]+)\$$/);
      if (solo && bodyLines.length === 0) {
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
    var split = splitBodyAndSolutionLines(bodyLines);
    return {
      aufgabeLabel: aufgabeLabel,
      pointsVal: pointsVal,
      body: split.body,
      solution: split.solution,
    };
  }

  function parseLiveEditText(text) {
    return splitBodyAndSolutionLines(String(text || '').split(/\r?\n/));
  }

  function composeTaskSource(aufgabeLabel, pointsVal, body, solution) {
    var lines = [];
    if (aufgabeLabel) lines.push('$Aufgabe ' + aufgabeLabel + '$');
    if (pointsVal != null && pointsVal !== '') lines.push('$' + pointsVal + ' Punkte$');
    var b = String(body || '').trim();
    if (b) lines.push(b);
    var sol = String(solution || '').trim();
    if (sol) {
      lines.push('$Musterlösung$');
      lines.push(sol);
    }
    if (!lines.length) return '';
    return lines.join('\n') + '\n';
  }

  function liveEditTextFromMeta(meta) {
    var text = String(meta.body || '');
    if (meta.solution) {
      text += (text ? '\n' : '') + '$Musterlösung$\n' + meta.solution;
    }
    return text;
  }

  function getExamFolderPath() {
    var fp = getExamFilePath();
    if (!fp) return '';
    var p = String(fp).replace(/\\/g, '/');
    var slash = p.lastIndexOf('/');
    return slash >= 0 ? p.slice(0, slash) : p;
  }

  function resolveExamImageUrl(ref) {
    var r = String(ref || '').trim().replace(/\\/g, '/');
    if (!r) return '';
    if (/^https?:\/\//i.test(r) || r.indexOf('/api/') === 0) return r;
    var full = r.indexOf('/') >= 0 ? r : getExamFolderPath() + '/' + r;
    return '/api/file-system-paths/read-image?filePath=' + encodeURIComponent(full);
  }

  function syncSourceFromLiveEdit(taskEl) {
    var live = taskEl.querySelector('.exam-dollar-live-edit');
    var src = taskEl.querySelector('.exam-dollar-source');
    if (!live || !src) return;
    var meta = parseTaskSource(src.value);
    var liveParts = parseLiveEditText(live.innerText || '');
    src.value = composeTaskSource(
      meta.aufgabeLabel,
      meta.pointsVal,
      liveParts.body,
      liveParts.solution,
    );
  }

  function renumberExamTasks() {
    var tasks = document.querySelectorAll('.exam-paper .task');
    tasks.forEach(function (taskEl, idx) {
      var n = String(idx + 1);
      var src = taskEl.querySelector('.exam-dollar-source');
      var meta = parseTaskSource(src ? src.value : '');
      if (meta.pointsVal == null) meta.pointsVal = '5';
      meta.aufgabeLabel = n;
      var live = taskEl.querySelector('.exam-dollar-live-edit');
      if (live) live.textContent = liveEditTextFromMeta(meta);
      if (src) {
        src.value = composeTaskSource(meta.aufgabeLabel, meta.pointsVal, meta.body, meta.solution);
      }
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
    if (inner === '__') return null;
    if (inner === '_') return { answers: [] };
    var wrapped = inner.match(/^_(.*)_$/);
    if (!wrapped) return null;
    var body = String(wrapped[1] || '').trim();
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

  function parsePointsFromLabel(text) {
    var m = String(text || '').replace(',', '.').match(/(\d+(?:\.\d+)?)/);
    return m ? m[1] : null;
  }

  function applyGapSolutionHints(show) {
    if (localStorage.getItem('teacherId') === null) show = false;
    document.querySelectorAll('input.exam-dollar-gap[data-jm-accepted]').forEach(function (inp) {
      var accepted = inp.getAttribute('data-jm-accepted');
      if (!accepted) return;
      if (show) {
        if (!inp.dataset.jmSolutionShown) {
          inp.dataset.jmUserValue = inp.value || '';
        }
        inp.value = accepted.split('|').join(' / ');
        inp.readOnly = true;
        inp.classList.add('exam-gap-solution-visible');
        inp.dataset.jmSolutionShown = '1';
      } else {
        inp.readOnly = false;
        inp.classList.remove('exam-gap-solution-visible');
        if (inp.dataset.jmSolutionShown) {
          inp.value = inp.dataset.jmUserValue || '';
        }
        delete inp.dataset.jmSolutionShown;
        delete inp.dataset.jmUserValue;
      }
    });
  }

  function refreshGapSolutionDisplay() {
    var toggle = document.getElementById('solutionsToggle');
    applyGapSolutionHints(!!(toggle && toggle.checked));
  }

  function wireSolutionsInGapsToggle() {
    var toggle = document.getElementById('solutionsToggle');
    if (!toggle || toggle.__jmGapSolutionsWired) return;
    toggle.__jmGapSolutionsWired = true;
    toggle.addEventListener('change', refreshGapSolutionDisplay);
    refreshGapSolutionDisplay();
  }

  function commitTaskPoints(taskEl, rawLabel) {
    var val = parsePointsFromLabel(rawLabel);
    if (!val) return;
    var src = taskEl.querySelector('.exam-dollar-source');
    if (!src) return;
    var meta = parseTaskSource(src.value);
    meta.pointsVal = val;
    src.value = composeTaskSource(meta.aufgabeLabel, meta.pointsVal, meta.body, meta.solution);
    applySourceToTask(taskEl, src.value);
    scheduleSave();
  }

  function wireTaskPointsEditing(taskEl) {
    if (localStorage.getItem('teacherId') === null) return;
    var pointsEl = taskEl.querySelector('.task-meta .points');
    var titlePts = taskEl.querySelector('.task-number span');

    function bindPointsEl(el) {
      if (!el || el.__jmPointsWired) return;
      el.__jmPointsWired = true;
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'false');
      el.setAttribute('title', 'Punkte: Klicken zum Ändern');
      el.classList.add('exam-points-editable');
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          el.blur();
        }
      });
      el.addEventListener('blur', function () {
        commitTaskPoints(taskEl, el.textContent);
      });
    }

    bindPointsEl(pointsEl);
    bindPointsEl(titlePts);
  }

  function parseColorSpan(inner) {
    var hexM = inner.match(/^#([0-9a-f]{3,8})\s+([\s\S]+?)\s+#([0-9a-f]{3,8})$/i);
    if (hexM && hexM[1].toLowerCase() === hexM[3].toLowerCase()) {
      return { css: '#' + hexM[1], text: hexM[2] };
    }
    var name;
    for (name in NAMED_COLORS) {
      if (!Object.prototype.hasOwnProperty.call(NAMED_COLORS, name)) continue;
      var re = new RegExp('^' + name + '\\s+([\\s\\S]+?)\\s+' + name + '$', 'i');
      var nm = inner.match(re);
      if (nm) return { css: NAMED_COLORS[name], text: nm[1] };
    }
    return null;
  }

  function renderBlockToHtml(blockText, idGen) {
    var lines = String(blockText || '').split(/\r?\n/);
    var html = '';
    var i;
    var hasLine = false;
    for (i = 0; i < lines.length; i++) {
      if (!String(lines[i]).trim()) continue;
      hasLine = true;
      html += '<p>' + renderInline(lines[i], idGen) + '</p>';
    }
    if (!hasLine) return '';
    return html;
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
      var colorM = parseColorSpan(inner);
      var bildM = inner.match(/^Bild\s+(.+)$/i);
      if (boldM) {
        out += '<strong>' + renderInline(boldM[1], idGen) + '</strong>';
      } else if (italicM) {
        out += '<em>' + renderInline(italicM[1], idGen) + '</em>';
      } else if (underM) {
        out += '<u>' + renderInline(underM[1], idGen) + '</u>';
      } else if (colorM) {
        out +=
          '<span style="color:' +
          escapeHtml(colorM.css) +
          '">' +
          renderInline(colorM.text, idGen) +
          '</span>';
      } else if (bildM) {
        var imgUrl = resolveExamImageUrl(bildM[1]);
        if (imgUrl) {
          out +=
            '<img class="exam-dollar-img" src="' +
            escapeHtml(imgUrl) +
            '" alt="" loading="lazy">';
        } else {
          out += escapeHtml(m[0]);
        }
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
    var parsed = parseTaskSource(source);
    if (parsed.aufgabeLabel && taskNumEl) {
      if (parsed.pointsVal != null && taskNumEl.querySelector('span')) {
        taskNumEl.innerHTML =
          'Aufgabe ' +
          escapeHtml(parsed.aufgabeLabel) +
          ' <span style="font-size: 11px; color: #666; font-weight: normal;">(' +
          escapeHtml(parsed.pointsVal) +
          ' Punkte)</span>';
      } else {
        taskNumEl.textContent = 'Aufgabe ' + parsed.aufgabeLabel;
      }
    }
    if (parsed.pointsVal != null && pointsEl) {
      pointsEl.textContent = parsed.pointsVal + ' Punkte';
    }
    var n = 0;
    function idGen() {
      n += 1;
      return 'examDollar_' + Date.now().toString(36) + '_' + n;
    }
    var html = renderBlockToHtml(parsed.body, idGen);
    if (!html) html = '<p class="exam-dollar-empty-hint"></p>';
    rendered.innerHTML = html;

    var content = taskEl.querySelector('.task-content');
    var solEl = taskEl.querySelector('.solution');
    if (!solEl && content) {
      solEl = document.createElement('div');
      solEl.className = 'solution';
      content.appendChild(solEl);
    }
    if (solEl) {
      var solHtml = renderBlockToHtml(parsed.solution, idGen);
      if (solHtml) {
        solEl.innerHTML = '<h4>Musterlösung:</h4>' + solHtml;
      } else {
        solEl.innerHTML = '';
      }
    }

    if (typeof global.attachInputListeners === 'function') {
      try {
        global.attachInputListeners();
      } catch (e) {
        /* ignore */
      }
    }
    refreshGapSolutionDisplay();
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
      src.value = composeTaskSource(label, '5', '', '');
    }
    paper.insertBefore(taskEl, insertBefore);
    ensureDeleteButton(taskEl);
    wireTaskPointsEditing(taskEl);
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
    live.textContent = liveEditTextFromMeta(meta);
  }

  function insertTextIntoLiveEdit(taskEl, text) {
    var live = taskEl.querySelector('.exam-dollar-live-edit');
    var src = taskEl.querySelector('.exam-dollar-source');
    if (!live || !src) return;
    var cur = live.innerText || '';
    var sep = cur && !/\n$/.test(cur) ? '\n' : '';
    live.textContent = cur + sep + text;
    live.dataset.jmTouched = '1';
    syncSourceFromLiveEdit(taskEl);
    applySourceToTask(taskEl, src.value);
    scheduleSave();
  }

  function uploadExamImage(file) {
    var folder = getExamFolderPath();
    if (!folder || !file) return Promise.reject(new Error('no folder'));
    var fd = new FormData();
    fd.append('file', file);
    fd.append('targetPath', folder);
    return fetch('/api/file-system-paths/save-file', { method: 'POST', body: fd }).then(function (r) {
      if (!r.ok) throw new Error('upload');
      return r.json();
    });
  }

  function handleImageFileForTask(taskEl, file) {
    if (!file || !file.type || file.type.indexOf('image/') !== 0) return;
    uploadExamImage(file)
      .then(function (res) {
        var name = (res && res.filename) || file.name;
        insertTextIntoLiveEdit(taskEl, '$Bild ' + name + '$');
      })
      .catch(function () {
        setSaveStatus('Bild-Upload fehlgeschlagen', true);
      });
  }

  function wireImageDrop(el, taskEl) {
    if (el.__jmImageDrop) return;
    el.__jmImageDrop = true;
    el.addEventListener('dragover', function (e) {
      e.preventDefault();
      el.classList.add('exam-dollar-drag-over');
    });
    el.addEventListener('dragleave', function () {
      el.classList.remove('exam-dollar-drag-over');
    });
    el.addEventListener('drop', function (e) {
      e.preventDefault();
      el.classList.remove('exam-dollar-drag-over');
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleImageFileForTask(taskEl, f);
    });
    el.addEventListener('paste', function (e) {
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      var i;
      for (i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image/') === 0) {
          e.preventDefault();
          handleImageFileForTask(taskEl, items[i].getAsFile());
          break;
        }
      }
    });
  }

  function getSelectionOffsetsInPlainText(el) {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    var range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return null;
    var text = range.toString();
    if (!text || !text.trim()) return null;
    var pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.startContainer, range.startOffset);
    var start = pre.toString().length;
    return { start: start, end: start + text.length, text: text };
  }

  function wrapSelectionWithColor(taskEl, colorName) {
    var live = taskEl.querySelector('.exam-dollar-live-edit');
    var src = taskEl.querySelector('.exam-dollar-source');
    if (!live || !src) return;
    var offsets = getSelectionOffsetsInPlainText(live);
    if (!offsets) return;
    var full = live.innerText || '';
    var inner = offsets.text.trim();
    if (!inner) return;
    var wrapped = '$' + colorName + ' ' + inner + ' ' + colorName + '$';
    live.textContent = full.slice(0, offsets.start) + wrapped + full.slice(offsets.end);
    live.dataset.jmTouched = '1';
    syncSourceFromLiveEdit(taskEl);
    applySourceToTask(taskEl, src.value);
    scheduleSave();
  }

  function ensureColorBar(taskEl) {
    var live = taskEl.querySelector('.exam-dollar-live-edit');
    if (!live || taskEl.querySelector('.exam-dollar-color-bar')) return;
    var bar = document.createElement('div');
    bar.className = 'exam-dollar-color-bar teacher-only';
    bar.setAttribute('aria-label', 'Farben');
    ['rot', 'gruen', 'blau', 'orange', 'lila'].forEach(function (c) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'exam-dollar-color-swatch';
      btn.title = c;
      btn.style.background = NAMED_COLORS[c] || '#666';
      btn.addEventListener('mousedown', function (e) {
        e.preventDefault();
      });
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        wrapSelectionWithColor(taskEl, c);
      });
      bar.appendChild(btn);
    });
    live.parentNode.insertBefore(bar, live);
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
    ensureColorBar(taskEl);
    wireImageDrop(live, taskEl);
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
      src.value = composeTaskSource(a, pts, body, restMeta.solution);
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
      '.teacher-mode .exam-dollar-rendered{order:1}' +
      '.teacher-mode .exam-dollar-color-bar{order:2}' +
      '.teacher-mode .exam-dollar-live-edit{order:3}' +
      '.teacher-mode .task-content .solution{order:4}' +
      '.exam-dollar-rendered{margin-bottom:6px;font-family:Arial,sans-serif;font-size:14px;line-height:1.55}' +
      '.teacher-mode .task-content .exam-dollar-rendered{display:block!important;margin:0 0 8px;padding:8px 6px;border:1px dashed #ddd;border-radius:6px;background:#fafafa}' +
      '.teacher-mode .task-content .exam-dollar-rendered::before{content:"Vorschau";display:block;font-size:10px;font-weight:700;color:#888;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em}' +
      '.exam-dollar-color-bar{display:flex;gap:5px;flex-wrap:wrap;margin:0 0 6px}' +
      '.exam-dollar-color-swatch{width:20px;height:20px;border:1px solid rgba(0,0,0,.2);border-radius:4px;cursor:pointer;padding:0}' +
      '.exam-dollar-color-swatch:hover{transform:scale(1.08)}' +
      '.teacher-mode .exam-dollar-live-edit{display:block;min-height:56px;padding:6px 4px;line-height:1.55;font-family:Arial,sans-serif;font-size:14px;color:#222;outline:none;border-radius:4px;white-space:pre-wrap;word-break:break-word}' +
      '.teacher-mode .exam-dollar-live-edit:focus{box-shadow:0 0 0 2px rgba(225,6,0,0.25)}' +
      '.exam-dollar-live-edit.exam-dollar-drag-over,.exam-dollar-compose-input.exam-dollar-drag-over{box-shadow:0 0 0 2px rgba(21,101,192,.45)}' +
      '.exam-dollar-img{display:block;max-width:100%;height:auto;margin:8px 0;border-radius:4px}' +
      '.teacher-mode .exam-points-editable{cursor:text;border-radius:3px;padding:0 2px}' +
      '.teacher-mode .exam-points-editable:hover{background:rgba(225,6,0,.08)}' +
      '.teacher-mode .exam-points-editable:focus{outline:2px solid rgba(225,6,0,.35)}' +
      'body.show-solutions input.exam-dollar-gap.exam-gap-solution-visible{color:#1b5e20!important;font-weight:700;background:#e8f5e9!important;border:1px solid #66bb6a!important}' +
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
      ta.addEventListener('dragover', function (e) {
        e.preventDefault();
        ta.classList.add('exam-dollar-drag-over');
      });
      ta.addEventListener('dragleave', function () {
        ta.classList.remove('exam-dollar-drag-over');
      });
      ta.addEventListener('drop', function (e) {
        var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (!f || f.type.indexOf('image/') !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        ta.classList.remove('exam-dollar-drag-over');
        uploadExamImage(f)
          .then(function (res) {
            var name = (res && res.filename) || f.name;
            var pos = ta.selectionStart != null ? ta.selectionStart : ta.value.length;
            var ins = '$Bild ' + name + '$';
            ta.value = ta.value.slice(0, pos) + ins + ta.value.slice(pos);
            scheduleSave();
          })
          .catch(function () {
            setSaveStatus('Bild-Upload fehlgeschlagen', true);
          });
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
      wireTaskPointsEditing(taskEl);
      wireTaskSource(taskEl);
      wireLiveEdit(taskEl);
      ensureColorBar(taskEl);
      var liveEl = taskEl.querySelector('.exam-dollar-live-edit');
      if (liveEl) wireImageDrop(liveEl, taskEl);
      var src = taskEl.querySelector('.exam-dollar-source');
      if (src) {
        var cleaned = stripDefaultBoilerplateSource(src.value);
        var meta = parseTaskSource(cleaned);
        src.value = composeTaskSource(
          meta.aufgabeLabel,
          meta.pointsVal,
          meta.body,
          meta.solution,
        );
        syncLiveEditFromSource(taskEl);
        applySourceToTask(taskEl, src.value);
      }
    });
    renumberExamTasks();
    wireSolutionsInGapsToggle();
    var fp = getExamFilePath();
    if (fp) {
      setSaveStatus('');
      scheduleSave({ immediate: true });
    } else setSaveStatus('Pfad unbekannt — Speichern nur in der App-Vorschau', true);
  }

  global.setupExamDollarAuthoring = setupExamDollarAuthoring;
})(typeof window !== 'undefined' ? window : globalThis);
