/**
 * Prüfungs-Autoren-Befehle: Text zwischen $…$
 * $Aufgabe 1$  neue Aufgabenüberschrift
 * $5 Punkte$   Punkte rechts in der Aufgabenzeile
 * $C$          Checkbox (normale Aussage)
 * $CC$         Checkbox — nur diese markiert die richtige Lösung
 * $_$          kleine Lücke (inline)
 * $_a/b/c_$    Lücke mit mehreren gültigen Lösungen
 * $__$         großes Eingabefeld
 * $B Wort B$   fett · $I Wort I$ kursiv · $U Wort U$ unterstrichen (⌘/Ctrl+B, I, U im Textfeld)
 * $rot Wort rot$  Farbe (rot/gruen/blau/orange/lila) · $#ff0000$ Text $#ff0000$ Hex
 * $Bild name.png$ · $10%$ Originalbreite · $t$ Textumfluss (Bild im Fließtext) · $r5b$ Rahmen
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

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function countDollarSigns(s) {
    var m = String(s || '').match(/\$/g);
    return m ? m.length : 0;
  }

  function findBalancedDollarClose(text, closeTag, contentStart) {
    var re = new RegExp('\\$\\s*' + escapeRegExp(closeTag) + '\\s*\\$', 'gi');
    var idx = contentStart;
    while (idx < text.length) {
      var slice = text.slice(idx);
      re.lastIndex = 0;
      var m = re.exec(slice);
      if (!m) return -1;
      var closeStart = idx + m.index;
      if (countDollarSigns(text.slice(contentStart, closeStart)) % 2 === 0) {
        return closeStart;
      }
      idx = closeStart + 1;
    }
    return -1;
  }

  function namedColorNamesByLength() {
    var names = Object.keys(NAMED_COLORS);
    names.sort(function (a, b) {
      return b.length - a.length;
    });
    return names;
  }

  function consumeDollarToken(text, start) {
    if (text[start] !== '$') return null;
    var rest = text.slice(start + 1);

    if (rest.charAt(0) === '_') {
      var gapM = rest.match(/^([\s\S]*?)_\$/);
      if (gapM) {
        return { end: start + 1 + gapM[0].length, inner: '_' + gapM[1] + '_' };
      }
      return null;
    }

    if (/^Bild\s+/i.test(rest)) {
      var close = rest.indexOf('$');
      if (close >= 0) {
        return { end: start + 1 + close + 1, inner: rest.slice(0, close) };
      }
      return null;
    }

    if (/^CC\$/i.test(rest)) {
      return { end: start + 4, inner: 'CC' };
    }
    if (/^C\$/i.test(rest)) {
      return { end: start + 3, inner: 'C' };
    }
    if (/^t\$/i.test(rest)) {
      return { end: start + 3, inner: 't' };
    }

    var hexOpen = rest.match(/^#([0-9a-f]{3,8})(\s+|\$)/i);
    if (hexOpen) {
      var hexTag = '#' + hexOpen[1];
      var hexContentStart = start + 1 + hexOpen[0].length;
      var hexClose = findBalancedDollarClose(text, hexTag, hexContentStart);
      if (hexClose >= 0) {
        var hexCloseEnd =
          hexClose + text.slice(hexClose).match(/^\$\s*#[0-9a-f]{3,8}\s*\$/i)[0].length;
        return {
          end: hexCloseEnd,
          inner: hexTag + ' ' + text.slice(hexContentStart, hexClose) + ' ' + hexTag,
        };
      }
    }

    var colorNames = namedColorNamesByLength();
    var ci;
    for (ci = 0; ci < colorNames.length; ci++) {
      var cName = colorNames[ci];
      var cOpen = new RegExp('^' + escapeRegExp(cName) + '(\\s+|\\$)', 'i').exec(rest);
      if (!cOpen) continue;
      var cContentStart = start + 1 + cOpen[0].length;
      var cClose = findBalancedDollarClose(text, cName, cContentStart);
      if (cClose < 0) continue;
      var cCloseEnd =
        cClose + text.slice(cClose).match(new RegExp('^\\$\\s*' + escapeRegExp(cName) + '\\s*\\$', 'i'))[0]
          .length;
      return {
        end: cCloseEnd,
        inner: cName + ' ' + text.slice(cContentStart, cClose) + ' ' + cName,
      };
    }

    var fmtLetters = ['B', 'I', 'U'];
    var fi;
    for (fi = 0; fi < fmtLetters.length; fi++) {
      var L = fmtLetters[fi];
      if (L === 'B' && /^Bild\s+/i.test(rest)) continue;
      var fOpen = new RegExp('^' + L + '(\\s+)', 'i').exec(rest);
      if (!fOpen) continue;
      var fContentStart = start + 1 + fOpen[0].length;
      var fClose = findBalancedDollarClose(text, L, fContentStart);
      if (fClose < 0) continue;
      var fCloseEnd =
        fClose + text.slice(fClose).match(new RegExp('^\\$\\s*' + L + '\\s*\\$', 'i'))[0].length;
      return {
        end: fCloseEnd,
        inner: L + ' ' + text.slice(fContentStart, fClose) + ' ' + L,
      };
    }

    var simple = rest.match(/^([^$]+)\$/);
    if (simple) {
      return { end: start + 1 + simple[0].length, inner: simple[1] };
    }
    return null;
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
    src.value = applyAutoPointsToSource(taskEl, src.value);
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
        inp.setAttribute('data-jm-solution-hint', '1');
        inp.dataset.jmSolutionShown = '1';
      } else {
        inp.readOnly = false;
        inp.classList.remove('exam-gap-solution-visible');
        inp.removeAttribute('data-jm-solution-hint');
        if (inp.dataset.jmSolutionShown) {
          inp.value = inp.dataset.jmUserValue || '';
        }
        delete inp.dataset.jmSolutionShown;
        delete inp.dataset.jmUserValue;
      }
    });
    syncGapInputWidths();
  }

  function applyCheckboxSolutionHints(show) {
    if (localStorage.getItem('teacherId') === null) show = false;
    document.querySelectorAll('.exam-dollar-choice-input').forEach(function (inp) {
      var isCorrect = inp.getAttribute('data-correct') === '1';
      if (show) {
        if (!inp.dataset.jmChoiceSolutionShown) {
          inp.dataset.jmChoiceWasChecked = inp.checked ? '1' : '0';
        }
        inp.checked = isCorrect;
        inp.disabled = true;
        if (isCorrect) inp.classList.add('exam-choice-solution-visible');
        else inp.classList.remove('exam-choice-solution-visible');
        inp.dataset.jmChoiceSolutionShown = '1';
      } else {
        inp.disabled = false;
        inp.classList.remove('exam-choice-solution-visible');
        if (inp.dataset.jmChoiceSolutionShown) {
          inp.checked = inp.dataset.jmChoiceWasChecked === '1';
        }
        delete inp.dataset.jmChoiceSolutionShown;
        delete inp.dataset.jmChoiceWasChecked;
      }
    });
  }

  function isMusterloesungToggleOn() {
    var toggle = document.getElementById('solutionsToggle');
    return !!(toggle && toggle.checked);
  }

  function refreshGapSolutionDisplay() {
    var on = isMusterloesungToggleOn();
    document.body.classList.toggle('show-solutions', on);
    applyGapSolutionHints(on);
    applyCheckboxSolutionHints(on);
    syncGapInputWidths();
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
    taskEl.dataset.jmPointsManual = '1';
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

  function parsePercentToken(innerTrim) {
    var m = String(innerTrim || '').match(/^(\d+(?:[.,]\d+)?)\s*%$/);
    if (!m) return null;
    var n = parseFloat(m[1].replace(',', '.'));
    if (isNaN(n) || n <= 0) return null;
    return n;
  }

  function frameColorFromCode(code) {
    var c = String(code || '').toLowerCase();
    if (c === 'b' || c === 'blau') return '#1565c0';
    if (c === 'r' || c === 'rot') return '#c62828';
    if (c === 'g' || c === 'gruen' || c === 'grün') return '#2e7d32';
    if (c === 'o' || c === 'orange') return '#e65100';
    if (c === 'l' || c === 'lila' || c === 'violett') return '#7b1fa2';
    if (c === 's' || c === 'schwarz') return '#111111';
    return null;
  }

  function parseImageFrameToken(innerTrim) {
    var m = String(innerTrim || '').trim().match(/^r(\d+)([a-zäöüß]+)$/i);
    if (!m) return null;
    var w = parseInt(m[1], 10);
    if (!w || w > 48) return null;
    var css = frameColorFromCode(m[2]);
    if (!css) return null;
    return { widthPx: w, color: css };
  }

  function parseImageTextWrapToken(innerTrim) {
    var t = String(innerTrim || '').trim().toLowerCase();
    if (t === 't' || t === 'textumfluss' || t === 'umfluss') return true;
    return null;
  }

  function isImageSuffixOrphanToken(innerTrim) {
    return (
      parsePercentToken(innerTrim) != null ||
      parseImageFrameToken(innerTrim) != null ||
      parseImageTextWrapToken(innerTrim) != null ||
      parseImageAlignToken(innerTrim) != null
    );
  }

  function parseImageAlignToken(innerTrim) {
    if (parseImageFrameToken(innerTrim)) return null;
    var t = String(innerTrim || '').trim().toLowerCase();
    if (/^(r|rechts|right)$/.test(t)) return 'right';
    if (/^(l|links|left)$/.test(t)) return 'left';
    if (/^(m|mitte|center|zentriert|c|z)$/.test(t)) return 'center';
    return null;
  }

  function tryConsumeImageSuffixToken(text, fromIndex) {
    var j = fromIndex;
    var sp = text.slice(j).match(/^\s+/);
    if (sp) j += sp[0].length;
    if (text[j] !== '$') return null;
    var pt = consumeDollarToken(text, j);
    if (!pt) return null;
    var inner = String(pt.inner).trim();
    var pct = parsePercentToken(inner);
    if (pct != null) return { end: pt.end, pct: pct };
    var frame = parseImageFrameToken(inner);
    if (frame) return { end: pt.end, frame: frame };
    if (parseImageTextWrapToken(inner)) return { end: pt.end, wrap: true };
    var align = parseImageAlignToken(inner);
    if (align) return { end: pt.end, align: align };
    return null;
  }

  function tryParseImageOptionsAfter(text, endIndex) {
    var j = endIndex;
    var pct = null;
    var align = null;
    var wrap = false;
    var frame = null;
    var guard = 0;
    while (guard < 6) {
      guard += 1;
      var opt = tryConsumeImageSuffixToken(text, j);
      if (!opt) break;
      j = opt.end;
      if (opt.pct != null && pct == null) pct = opt.pct;
      else if (opt.frame && frame == null) frame = opt.frame;
      else if (opt.wrap && !wrap) wrap = true;
      else if (opt.align && align == null) align = opt.align;
      else break;
    }
    return { end: j, pct: pct, align: align, wrap: wrap, frame: frame };
  }

  function applyExamImageNaturalSizing(root) {
    var list;
    if (root && root.querySelectorAll) {
      list = root.querySelectorAll('img.exam-dollar-img[data-jm-width-pct]');
    } else {
      list = document.querySelectorAll('img.exam-dollar-img[data-jm-width-pct]');
    }
    list.forEach(function (img) {
      var pct = parseFloat(img.getAttribute('data-jm-width-pct'));
      if (isNaN(pct) || pct <= 0) return;
      function apply() {
        if (!img.naturalWidth) return;
        var w = Math.max(1, Math.round(img.naturalWidth * (pct / 100)));
        img.style.width = w + 'px';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
      }
      if (img.complete) apply();
      else img.addEventListener('load', apply);
    });
  }

  function bindCollapsibleDetails(details, storageKey, defaultOpen) {
    if (!details || details.__jmDetailsBound) return;
    details.__jmDetailsBound = true;
    var stored = localStorage.getItem(storageKey);
    if (stored === '1') details.open = true;
    else if (stored === '0') details.open = false;
    else details.open = !!defaultOpen;
    details.addEventListener('toggle', function () {
      localStorage.setItem(storageKey, details.open ? '1' : '0');
    });
  }

  function ensureTaskAuthorPanel(taskEl) {
    var content = taskEl.querySelector('.task-content');
    if (!content) return;
    var panel = content.querySelector('.exam-dollar-task-author');
    if (!panel) {
      panel = document.createElement('details');
      panel.className = 'exam-dollar-task-author teacher-only';
      var summary = document.createElement('summary');
      summary.className = 'exam-dollar-task-author-summary';
      summary.textContent = 'Erstellen';
      var inner = document.createElement('div');
      inner.className = 'exam-dollar-task-author-inner';
      panel.appendChild(summary);
      panel.appendChild(inner);
      var rendered = content.querySelector('.exam-dollar-rendered');
      if (rendered && rendered.nextSibling) {
        content.insertBefore(panel, rendered.nextSibling);
      } else {
        content.appendChild(panel);
      }
    }
    var inner = panel.querySelector('.exam-dollar-task-author-inner');
    if (!inner) return;
    var bar = content.querySelector('.exam-dollar-color-bar');
    var live = content.querySelector('.exam-dollar-live-edit');
    if (bar && bar.parentNode !== inner) inner.appendChild(bar);
    if (live && live.parentNode !== inner) inner.appendChild(live);
    bindCollapsibleDetails(panel, 'jmExamTaskAuthorOpen', false);
  }

  function parseColorSpan(inner) {
    var hexM = inner.match(/^#([0-9a-f]{3,8})\s+([\s\S]+)\s+#([0-9a-f]{3,8})$/i);
    if (hexM && hexM[1].toLowerCase() === hexM[3].toLowerCase()) {
      return { css: '#' + hexM[1], text: hexM[2] };
    }
    var name;
    for (name in NAMED_COLORS) {
      if (!Object.prototype.hasOwnProperty.call(NAMED_COLORS, name)) continue;
      var re = new RegExp('^' + escapeRegExp(name) + '\\s+([\\s\\S]+)\\s+' + escapeRegExp(name) + '$', 'i');
      var nm = inner.match(re);
      if (nm) return { css: NAMED_COLORS[name], text: nm[1] };
    }
    return null;
  }

  function scanBodyDollarTokens(body) {
    var gaps = 0;
    var choices = 0;
    var i = 0;
    var s = String(body || '');
    while (i < s.length) {
      if (s[i] !== '$') {
        i += 1;
        continue;
      }
      var tok = consumeDollarToken(s, i);
      if (!tok) {
        i += 1;
        continue;
      }
      var innerTrim = String(tok.inner || '').trim();
      if (parseGapToken(innerTrim)) gaps += 1;
      else if (/^CC$/i.test(innerTrim)) choices += 1;
      else if (/^C$/i.test(innerTrim)) choices += 1;
      i = tok.end;
    }
    return { gaps: gaps, choices: choices };
  }

  function formatPointsNumber(n) {
    if (n == null || isNaN(n)) return null;
    var r = Math.round(n * 100) / 100;
    if (Math.abs(r - Math.round(r)) < 0.001) return String(Math.round(r));
    return String(r).replace('.', ',');
  }

  function computeAutoPointsFromBody(body) {
    var scan = scanBodyDollarTokens(body);
    if (scan.choices > 0 && scan.gaps === 0) {
      return formatPointsNumber(scan.choices * 0.5);
    }
    if (scan.gaps > 0 && scan.choices === 0) {
      return formatPointsNumber(scan.gaps);
    }
    if (scan.gaps > 0 && scan.choices > 0) {
      return formatPointsNumber(scan.gaps + scan.choices * 0.5);
    }
    return null;
  }

  function applyAutoPointsToSource(taskEl, source) {
    if (taskEl && taskEl.dataset && taskEl.dataset.jmPointsManual === '1') return source;
    var parsed = parseTaskSource(source);
    var auto = computeAutoPointsFromBody(parsed.body);
    if (auto == null) return source;
    if (String(parsed.pointsVal || '') === auto) return source;
    parsed.pointsVal = auto;
    return composeTaskSource(parsed.aufgabeLabel, parsed.pointsVal, parsed.body, parsed.solution);
  }

  function normalizeGapAnswer(raw) {
    return String(raw || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss');
  }

  function gapInputIsCorrect(inp) {
    var accepted = inp.getAttribute('data-jm-accepted');
    if (!accepted) return false;
    var n = normalizeGapAnswer(inp.value);
    if (!n) return false;
    return accepted.split('|').some(function (a) {
      return normalizeGapAnswer(a) === n;
    });
  }

  function scoreCheckboxChoicesInTask(taskEl) {
    var achieved = 0;
    var inputs = taskEl.querySelectorAll('.exam-dollar-choice-input');
    inputs.forEach(function (inp) {
      var shouldCheck = inp.getAttribute('data-correct') === '1';
      if (inp.checked === shouldCheck) achieved += 0.5;
      else achieved -= 0.5;
    });
    return { achieved: achieved, total: inputs.length * 0.5 };
  }

  function calculateExamDollarPoints() {
    var tasks = document.querySelectorAll('.exam-paper .task');
    var total = 0;
    var achieved = 0;
    var any = false;
    tasks.forEach(function (taskEl) {
      var src = taskEl.querySelector('.exam-dollar-source');
      if (!src || !String(src.value || '').trim()) return;
      any = true;
      var meta = parseTaskSource(src.value);
      var scan = scanBodyDollarTokens(meta.body);
      if (scan.choices > 0 && scan.gaps === 0) {
        var ch = scoreCheckboxChoicesInTask(taskEl);
        total += ch.total;
        achieved += ch.achieved;
        return;
      }
      if (scan.gaps > 0) {
        total += scan.gaps;
        taskEl.querySelectorAll('input.exam-dollar-gap').forEach(function (inp) {
          if (gapInputIsCorrect(inp)) achieved += 1;
        });
        if (scan.choices > 0) {
          var ch2 = scoreCheckboxChoicesInTask(taskEl);
          total += ch2.total;
          achieved += ch2.achieved;
        }
        return;
      }
      var p = parseFloat(String(meta.pointsVal || '0').replace(',', '.'));
      if (!isNaN(p) && p > 0) total += p;
    });
    if (!any) return null;
    return { achieved: achieved, total: total };
  }

  function wireExamDollarScoring() {
    if (global.__jmExamDollarScoringWired) return;
    global.__jmExamDollarScoringWired = true;
    global.__jmExamDollarCalculatePoints = calculateExamDollarPoints;
    var origCalc = typeof global.calculatePoints === 'function' ? global.calculatePoints : null;
    global.calculatePoints = function () {
      var d = calculateExamDollarPoints();
      if (d) return d;
      if (origCalc) return origCalc();
      return { achieved: 0, total: 0 };
    };
    var origAttach = global.attachInputListeners;
    global.attachInputListeners = function () {
      if (typeof origAttach === 'function') origAttach();
      document.querySelectorAll('.exam-dollar-choice-input').forEach(function (inp) {
        if (inp.__jmScoreWired) return;
        inp.__jmScoreWired = true;
        inp.addEventListener('change', function () {
          if (typeof global.updatePointsDisplay === 'function') global.updatePointsDisplay();
        });
      });
    };
  }

  function normalizeBodyDollarText(text) {
    return String(text || '').replace(/\$\s*t\s*\$/gi, '$t$');
  }

  function isFlowImageOnlyLine(line) {
    var s = normalizeBodyDollarText(line).trim();
    if (!/\$t\$/i.test(s)) return false;
    if (!/^\$Bild\s+/i.test(s)) return false;
    var plain = s.replace(/\$[^$]+\$/g, ' ').replace(/\s+/g, '').trim();
    return plain.length === 0;
  }

  function renderBlockToHtml(blockText, idGen) {
    var body = normalizeBodyDollarText(blockText);
    var lines = body.split(/\r?\n/);
    var textLines = [];
    var flowImgLines = [];
    var i;
    for (i = 0; i < lines.length; i++) {
      if (!String(lines[i]).trim()) continue;
      if (isFlowImageOnlyLine(lines[i])) flowImgLines.push(lines[i]);
      else textLines.push(lines[i]);
    }
    if (flowImgLines.length && textLines.length) {
      var imgsHtml = flowImgLines
        .map(function (ln) {
          return renderInline(ln, idGen);
        })
        .join('');
      var txtHtml = textLines
        .map(function (ln) {
          return renderInline(ln, idGen);
        })
        .join('<br>');
      var imgRight = imgsHtml.indexOf('exam-dollar-img-wrap--flow-right') >= 0;
      var sideCls =
        'exam-dollar-flow exam-dollar-flow-side' +
        (imgRight ? ' exam-dollar-flow-side--img-right' : '');
      return (
        '<div class="' +
        sideCls +
        '"><div class="exam-dollar-float-col">' +
        imgsHtml +
        '</div><div class="exam-dollar-text-col">' +
        txtHtml +
        '</div></div>'
      );
    }
    var chunks = [];
    for (i = 0; i < lines.length; i++) {
      if (!String(lines[i]).trim()) continue;
      chunks.push(renderInline(lines[i], idGen));
    }
    if (!chunks.length) return '';
    return '<div class="exam-dollar-flow">' + chunks.join('<br>') + '</div>';
  }

  function renderInline(text, idGen) {
    var out = '';
    var i = 0;
    var s = normalizeBodyDollarText(text);
    while (i < s.length) {
      if (s[i] !== '$') {
        var next = s.indexOf('$', i);
        if (next < 0) {
          out += escapeHtml(s.slice(i));
          break;
        }
        out += escapeHtml(s.slice(i, next));
        i = next;
        continue;
      }
      var tok = consumeDollarToken(s, i);
      if (!tok) {
        out += escapeHtml(s[i]);
        i += 1;
        continue;
      }
      var inner = String(tok.inner || '');
      var innerTrim = inner.trim();
      var boldM = innerTrim.match(/^B\s+([\s\S]+)\s+B$/i);
      var italicM = innerTrim.match(/^I\s+([\s\S]+)\s+I$/i);
      var underM = innerTrim.match(/^U\s+([\s\S]+)\s+U$/i);
      var colorM = parseColorSpan(innerTrim);
      var bildM = innerTrim.match(/^Bild\s+(.+)$/i);
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
        var imgOpts = tryParseImageOptionsAfter(s, tok.end);
        var imgEnd = imgOpts.end;
        var imgUrl = resolveExamImageUrl(bildM[1]);
        if (imgUrl) {
          var wrapCls = 'exam-dollar-img-wrap';
          if (imgOpts.wrap) {
            wrapCls += ' exam-dollar-img-wrap--wrap';
            if (imgOpts.align === 'right') {
              wrapCls += ' exam-dollar-img-wrap--right exam-dollar-img-wrap--flow exam-dollar-img-wrap--flow-right';
            } else if (imgOpts.align === 'center') wrapCls += ' exam-dollar-img-wrap--center';
            else wrapCls += ' exam-dollar-img-wrap--left exam-dollar-img-wrap--flow';
          } else {
            if (imgOpts.align === 'left') wrapCls += ' exam-dollar-img-wrap--left';
            else if (imgOpts.align === 'right') wrapCls += ' exam-dollar-img-wrap--right';
            else if (imgOpts.align === 'center') wrapCls += ' exam-dollar-img-wrap--center';
          }
          if (imgOpts.frame) wrapCls += ' exam-dollar-img-wrap--framed';
          var wrapStyle = imgOpts.wrap ? '' : 'max-width:100%;';
          if (imgOpts.frame) {
            wrapStyle +=
              'border:' +
              imgOpts.frame.widthPx +
              'px solid ' +
              imgOpts.frame.color +
              ';box-sizing:border-box;padding:2px;';
          }
          var pctAttr =
            imgOpts.pct != null
              ? ' data-jm-width-pct="' + escapeHtml(String(imgOpts.pct)) + '"'
              : '';
          out +=
            '<span class="' +
            wrapCls +
            '" style="' +
            escapeHtml(wrapStyle) +
            '"><img class="exam-dollar-img" src="' +
            escapeHtml(imgUrl) +
            '" alt="" loading="lazy"' +
            pctAttr +
            (imgOpts.wrap
              ? ' style="height:auto;display:block;max-width:100%"'
              : ' style="max-width:100%;height:auto;display:block"') +
            '></span>';
        } else {
          out += escapeHtml(s.slice(i, imgEnd));
        }
        i = imgEnd;
        continue;
      } else if (isImageSuffixOrphanToken(innerTrim)) {
        i = tok.end;
        continue;
      } else if (innerTrim === '__') {
        out +=
          '<div class="item input-group full-width exam-dollar-biggap">' +
          '<textarea class="exam-dollar-area" rows="4" id="' +
          idGen() +
          '"></textarea></div>';
      } else {
        var gap = parseGapToken(innerTrim);
        if (gap) {
          var id = idGen();
          var accepted = encodeAcceptedAttr(gap.answers);
          var attr = accepted
            ? ' data-jm-accepted="' + escapeHtml(accepted) + '"'
            : '';
          var sizeAttr = '';
          if (gap.answers.length) {
            var maxLen = 2;
            gap.answers.forEach(function (a) {
              maxLen = Math.max(maxLen, String(a).length);
            });
            sizeAttr = ' size="' + String(maxLen + 1) + '"';
          }
          out +=
            '<input type="text" class="exam-dollar-gap blank-tiny" id="' +
            id +
            '"' +
            attr +
            sizeAttr +
            ' autocomplete="off">';
        } else if (/^CC$/i.test(innerTrim)) {
          out +=
            '<label class="exam-dollar-choice exam-dollar-choice-correct">' +
            '<input type="checkbox" class="exam-dollar-choice-input" data-correct="1" data-jm-choice-kind="correct">' +
            '<span class="exam-dollar-choice-box" aria-hidden="true"></span></label>';
        } else if (/^C$/i.test(innerTrim)) {
          out +=
            '<label class="exam-dollar-choice exam-dollar-choice-neutral">' +
            '<input type="checkbox" class="exam-dollar-choice-input" data-jm-choice-kind="neutral">' +
            '<span class="exam-dollar-choice-box" aria-hidden="true"></span></label>';
        } else if (parsePunkte(innerTrim) || parseAufgabe(innerTrim)) {
          out += escapeHtml(s.slice(i, tok.end));
        } else {
          out += escapeHtml(s.slice(i, tok.end));
        }
      }
      i = tok.end;
    }
    return out;
  }

  function gapInputWidthCh(inp) {
    var accepted = inp.getAttribute('data-jm-accepted');
    var parts = accepted ? accepted.split('|') : [];
    var showSol = inp.classList.contains('exam-gap-solution-visible');
    var candidates = parts.slice();
    if (inp.value) candidates.push(inp.value);
    var longest = 2;
    candidates.forEach(function (a) {
      longest = Math.max(longest, String(a).length);
    });
    if (!parts.length && !inp.value && !showSol) longest = Math.max(longest, 4);
    return longest + 1;
  }

  function syncOneGapInputWidth(inp) {
    if (!inp || !inp.classList || !inp.classList.contains('exam-dollar-gap')) return;
    var ch = gapInputWidthCh(inp);
    inp.style.width = ch + 'ch';
    inp.style.minWidth = ch + 'ch';
    inp.style.maxWidth = '100%';
  }

  function syncGapInputWidths(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var list =
      root && root.classList && root.classList.contains('task')
        ? root.querySelectorAll('input.exam-dollar-gap')
        : scope.querySelectorAll('input.exam-dollar-gap');
    list.forEach(syncOneGapInputWidth);
  }

  function wireGapAutoWidth(container) {
    var list = container.querySelectorAll
      ? container.querySelectorAll('input.exam-dollar-gap')
      : [];
    list.forEach(function (inp) {
      if (inp.__jmWidthWired) return;
      inp.__jmWidthWired = true;
      inp.addEventListener('input', function () {
        syncOneGapInputWidth(inp);
      });
    });
  }

  function applySourceToTask(taskEl, source) {
    var rendered = taskEl.querySelector('.exam-dollar-rendered');
    if (!rendered) return;
    source = applyAutoPointsToSource(taskEl, source);
    var srcEl = taskEl.querySelector('.exam-dollar-source');
    if (srcEl && srcEl.value !== source) srcEl.value = source;
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
    applyExamImageNaturalSizing(rendered);

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
        applyExamImageNaturalSizing(solEl);
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
    wireGapAutoWidth(taskEl);
    syncGapInputWidths(taskEl);
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

  function wrapLiveEditDollarMarkup(live, marker) {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return false;
    var range = sel.getRangeAt(0);
    if (!live.contains(range.commonAncestorContainer)) return false;
    var selected = range.toString();
    var inner = selected.length ? selected : ' ';
    var wrapped = '$' + marker + ' ' + inner + ' ' + marker + '$';
    range.deleteContents();
    var node = document.createTextNode(wrapped);
    range.insertNode(node);
    if (!selected.length) {
      range.setStart(node, '$' + marker + ' '.length);
      range.setEnd(node, '$' + marker + ' '.length + 1);
    } else {
      range.setStartAfter(node);
      range.collapse(true);
    }
    sel.removeAllRanges();
    sel.addRange(range);
    live.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  function wireLiveEditFormattingShortcuts(live) {
    if (live.__jmFmtKeysWired) return;
    live.__jmFmtKeysWired = true;
    live.addEventListener('keydown', function (e) {
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.altKey) return;
      var marker = null;
      if (e.key === 'b' || e.key === 'B') marker = 'B';
      else if (e.key === 'i' || e.key === 'I') marker = 'I';
      else if (e.key === 'u' || e.key === 'U') marker = 'U';
      if (!marker) return;
      e.preventDefault();
      wrapLiveEditDollarMarkup(live, marker);
    });
  }

  function wireLiveEdit(taskEl) {
    var live = taskEl.querySelector('.exam-dollar-live-edit');
    var src = taskEl.querySelector('.exam-dollar-source');
    if (!live || !src || live.__jmLiveWired) return;
    live.__jmLiveWired = true;
    syncLiveEditFromSource(taskEl);
    wireLiveEditFormattingShortcuts(live);
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
    ensureTaskAuthorPanel(taskEl);
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

  function normalizeTaskSourceTextareas(taskEl) {
    var content = taskEl.querySelector('.task-content');
    if (!content) return;
    var areas = content.querySelectorAll('textarea.exam-dollar-source');
    if (!areas.length) return;
    var best = '';
    var i;
    for (i = 0; i < areas.length; i++) {
      var v = String(areas[i].value || '');
      if (v.indexOf('<textarea') >= 0) {
        v = v.replace(/<textarea[\s\S]*?<\/textarea>/gi, '').trim();
      }
      if (v.length > best.length) best = v;
    }
    var keep = areas[0];
    for (i = 1; i < areas.length; i++) {
      if (areas[i].parentNode) areas[i].parentNode.removeChild(areas[i]);
    }
    keep.value = best;
    keep.classList.remove('teacher-only');
    keep.removeAttribute('rows');
    keep.setAttribute('hidden', 'hidden');
    keep.setAttribute('aria-hidden', 'true');
    keep.removeAttribute('spellcheck');
  }

  function ensureTaskStructure(taskEl) {
    var content = taskEl.querySelector('.task-content');
    if (!content) return;
    normalizeTaskSourceTextareas(taskEl);
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
    ensureTaskAuthorPanel(taskEl);
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
      '.teacher-mode .exam-dollar-task-author{order:2;margin:0 0 8px;border:1px dashed #e0e0e0;border-radius:6px;background:#fff}' +
      '.teacher-mode .exam-dollar-task-author-summary{cursor:pointer;font-size:11px;font-weight:700;color:#555;padding:6px 8px;list-style:none}' +
      '.teacher-mode .exam-dollar-task-author-summary::-webkit-details-marker{display:none}' +
      '.teacher-mode .exam-dollar-task-author-inner{padding:0 8px 8px}' +
      '.teacher-mode .task-content .solution{order:3}' +
      '.exam-dollar-rendered{margin-bottom:6px;font-family:Arial,sans-serif;font-size:14px;line-height:1.55}' +
      '.teacher-mode .task-content .exam-dollar-rendered{display:block!important;margin:0 0 8px;padding:8px 6px;border:1px dashed #ddd;border-radius:6px;background:#fafafa}' +
      '.teacher-mode .task-content .exam-dollar-rendered::before{content:"Vorschau";display:block;font-size:10px;font-weight:700;color:#888;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em}' +
      '.exam-dollar-color-bar{display:flex;gap:5px;flex-wrap:wrap;margin:0 0 6px}' +
      '.exam-dollar-color-swatch{width:20px;height:20px;border:1px solid rgba(0,0,0,.2);border-radius:4px;cursor:pointer;padding:0}' +
      '.exam-dollar-color-swatch:hover{transform:scale(1.08)}' +
      '.teacher-mode .exam-dollar-live-edit{display:block;min-height:56px;padding:6px 4px;line-height:1.55;font-family:Arial,sans-serif;font-size:14px;color:#222;outline:none;border-radius:4px;white-space:pre-wrap;word-break:break-word}' +
      '.teacher-mode .exam-dollar-live-edit:focus{box-shadow:0 0 0 2px rgba(225,6,0,0.25)}' +
      '.exam-dollar-live-edit.exam-dollar-drag-over,.exam-dollar-compose-input.exam-dollar-drag-over{box-shadow:0 0 0 2px rgba(21,101,192,.45)}' +
      '.exam-dollar-rendered{line-height:1.55}' +
      '.exam-dollar-flow{line-height:1.55;margin:0 0 0.5em}' +
      '.exam-dollar-flow-side{display:flex;flex-direction:row;align-items:flex-start;gap:12px;margin:0 0 0.5em}' +
      '.exam-dollar-flow-side--img-right{flex-direction:row-reverse}' +
      '.exam-dollar-float-col{flex:0 0 auto;max-width:min(46%,300px);min-width:72px}' +
      '.exam-dollar-float-col .exam-dollar-img-wrap--flow{float:none!important;margin:0!important;max-width:100%!important}' +
      '.exam-dollar-text-col{flex:1 1 0;min-width:0;line-height:1.55}' +
      '.exam-dollar-flow::after{content:"";display:block;clear:both}' +
      '.exam-dollar-rendered::after{content:"";display:block;clear:both}' +
      '.exam-dollar-img-wrap{vertical-align:top}' +
      '.exam-dollar-img-wrap:not(.exam-dollar-img-wrap--flow){max-width:100%}' +
      '.exam-dollar-img-wrap--flow{float:left;margin:4px 14px 8px 0;line-height:normal;max-width:min(46%,280px);width:auto}' +
      '.exam-dollar-img-wrap--flow.exam-dollar-img-wrap--flow-right{float:right;margin:4px 0 8px 14px}' +
      '.exam-dollar-img-wrap--left:not(.exam-dollar-img-wrap--flow){float:left;margin:2px 14px 8px 0}' +
      '.exam-dollar-img-wrap--right:not(.exam-dollar-img-wrap--wrap){float:right;margin:2px 0 8px 14px}' +
      '.exam-dollar-img-wrap--wrap.exam-dollar-img-wrap--center{float:none;display:block;margin:10px auto;text-align:center}' +
      '.exam-dollar-img-wrap--center:not(.exam-dollar-img-wrap--wrap){display:block;clear:both;margin:10px auto;text-align:center}' +
      '.exam-dollar-img-wrap--center .exam-dollar-img{display:inline-block}' +
      '.exam-dollar-img{display:block;max-width:100%;height:auto;border-radius:4px}' +
      '.teacher-mode .exam-points-editable{cursor:text;border-radius:3px;padding:0 2px}' +
      '.teacher-mode .exam-points-editable:hover{background:rgba(225,6,0,.08)}' +
      '.teacher-mode .exam-points-editable:focus{outline:2px solid rgba(225,6,0,.35)}' +
      'input.exam-dollar-gap{border:1px solid #ccc;background:#fff;color:#222;font-weight:normal}' +
      'body.show-solutions input.exam-dollar-gap[data-jm-solution-hint="1"]{color:#1b5e20!important;font-weight:700;background:#e8f5e9!important;border:1px solid #66bb6a!important}' +
      '.task-header{display:flex;align-items:flex-start;justify-content:space-between;gap:6px}' +
      '.task-header .task-number{flex:1;min-width:0}' +
      '.exam-task-delete{flex-shrink:0;width:24px;height:24px;border:1px solid #d0d0d0;border-radius:5px;background:#fff;color:#c62828;font-size:18px;line-height:1;cursor:pointer;padding:0;margin-top:2px}' +
      '.exam-task-delete:hover{background:#ffebee;border-color:#e57373}' +
      '#examPaperComposeMount{margin:20px 0 8px}' +
      '.exam-dollar-compose{margin:0;border:1px dashed #ef6c00;border-radius:8px;background:#fff8f0}' +
      '.exam-dollar-compose-summary{cursor:pointer;font-size:11px;font-weight:700;color:#e65100;padding:8px 10px;list-style:none}' +
      '.exam-dollar-compose-summary::-webkit-details-marker{display:none}' +
      '.exam-dollar-compose-body{padding:0 10px 10px}' +
      '.exam-dollar-compose-label{font-size:11px;font-weight:700;color:#e65100;margin-bottom:6px}' +
      '.exam-dollar-compose-input{width:100%;font-family:Consolas,Monaco,monospace;font-size:12px;padding:8px;border:1px solid #ffb74d;border-radius:6px;resize:vertical;box-sizing:border-box}' +
      '.exam-dollar-choice{display:inline-flex;align-items:center;margin:0 6px 0 2px;vertical-align:middle;cursor:pointer}' +
      '.exam-dollar-choice-input{position:absolute;opacity:0;width:0;height:0}' +
      '.exam-dollar-choice-box{display:inline-block;width:16px;height:16px;border:2px solid #333;border-radius:3px;background:#fff;vertical-align:middle}' +
      '.exam-dollar-choice-input:checked + .exam-dollar-choice-box{background:#E10600;border-color:#b71c1c;box-shadow:inset 0 0 0 2px #fff}' +
      'body.show-solutions .exam-dollar-choice-correct .exam-dollar-choice-box{border-color:#2e7d32}' +
      'body.show-solutions .teacher-mode .exam-dollar-choice-correct .exam-dollar-choice-box{outline:2px solid #81c784}' +
      'body.show-solutions .exam-dollar-choice-input[data-correct="1"].exam-choice-solution-visible:checked + .exam-dollar-choice-box{background:#e8f5e9;border-color:#2e7d32;box-shadow:inset 0 0 0 2px #fff}' +
      'body.show-solutions .exam-dollar-choice-neutral .exam-dollar-choice-box{border-color:#333}' +
      '.exam-dollar-gap{display:inline-block;vertical-align:baseline;width:auto!important;min-width:3ch!important;max-width:100%;text-align:left;padding:2px 5px;box-sizing:content-box}' +
      '.exam-dollar-area{width:100%;min-height:72px}' +
      '.exam-dollar-hint{font-size:10px;color:#888;margin-top:4px}';
  }

  function ensureComposeArea() {
    var mount = ensurePaperComposeMount();
    var wrap = document.querySelector('.exam-dollar-compose');
    if (!wrap) {
      wrap = document.createElement('details');
      wrap.className = 'exam-dollar-compose teacher-only';
      wrap.innerHTML =
        '<summary class="exam-dollar-compose-summary">+ Aufgabe erstellen</summary>' +
        '<div class="exam-dollar-compose-body">' +
        '<textarea class="exam-dollar-compose-input" rows="2"></textarea>' +
        '<div class="exam-dollar-hint">Strg+Eingabe oder Tab verlassen · Bild: $Bild datei.png$ $50%$</div>' +
        '</div>';
      if (mount) mount.appendChild(wrap);
      else {
        var paper = document.querySelector('.exam-paper');
        if (paper) paper.appendChild(wrap);
      }
    } else if (wrap.tagName !== 'DETAILS') {
      var oldTa = wrap.querySelector('.exam-dollar-compose-input');
      var oldVal = oldTa ? oldTa.value : '';
      var parent = wrap.parentNode;
      var next = document.createElement('details');
      next.className = 'exam-dollar-compose teacher-only';
      next.innerHTML =
        '<summary class="exam-dollar-compose-summary">+ Aufgabe erstellen</summary>' +
        '<div class="exam-dollar-compose-body">' +
        '<textarea class="exam-dollar-compose-input" rows="2"></textarea>' +
        '<div class="exam-dollar-hint">Strg+Eingabe oder Tab verlassen · Bild: $Bild datei.png$ $50%$</div>' +
        '</div>';
      if (parent) parent.replaceChild(next, wrap);
      wrap = next;
      var nta = wrap.querySelector('.exam-dollar-compose-input');
      if (nta && oldVal) nta.value = oldVal;
    }
    var ta = wrap.querySelector('.exam-dollar-compose-input');
    bindCollapsibleDetails(wrap, 'jmExamComposeOpen', false);
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
    wireExamDollarScoring();
    if (typeof global.attachInputListeners === 'function') {
      try {
        global.attachInputListeners();
      } catch (e) {
        /* ignore */
      }
    }
    var fp = getExamFilePath();
    if (fp) {
      setSaveStatus('');
      scheduleSave({ immediate: true });
    } else setSaveStatus('Pfad unbekannt — Speichern nur in der App-Vorschau', true);
  }

  global.setupExamDollarAuthoring = setupExamDollarAuthoring;
})(typeof window !== 'undefined' ? window : globalThis);
