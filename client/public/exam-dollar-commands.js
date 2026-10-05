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
 * $L Formel L$  Mathe/Formelschrift (LaTeX, KaTeX) · ⌘/Ctrl+L (auch $M … M$)
 * $K Code K$    Code nur Monospace · ⌘/Ctrl+K
 * $KK Code KK$  Code mit grauer Box · ⌘/Ctrl+⇧+K (älter: $N … N$ = Box)
 * $e$          Zeilenumbruch in derselben Quellzeile (kein Enter) · sichtbar als $e$ in der Lehrervorschau
 * $bB Wort Bb$  kompakt: Kleinbuchstabe=Farbe (b blau, g gelb, r rot, o orange, l lila), Großbuchstabe=Stil (B fett, I kursiv, U unterstr.)
 * $rot Wort rot$  Farbe (rot/gruen/blau/orange/lila) · $#ff0000$ Text $#ff0000$ Hex
 * $Bild name.png$ · $10%$ Originalbreite · $t$ Textumfluss · $r5b$ Rahmen
 * · kompakt: $Bild name.png 10% r t r5b$ (alles in einem $…$)
 * Aussage … $wf$   Wahr/Falsch-Tabelle (|$wwf$| = Wahr richtig, |$wff$| = Falsch richtig)
 * Aussage … $wff $$wwf $$$wff   W/F mit Varianten (Standard/A1/A2 wie bei $L … $$ … $$$ …)
 * $a1$ / $$7 $$$10   Varianten: Zeile $a1$ … oder in $L 5 $$7 $$$10 L$ ($$=A1, $$$=A2)
 * $Musterlösung$    ab dieser Zeile: Text für die grüne Musterlösungsbox
 * $Paare … Paare$   Zuordnung: Zeilen „Wert A ; Wert B“ (gleiche Werte aufeinanderziehen)
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
    document.querySelectorAll('.exam-paper .task').forEach(function (taskEl) {
      syncSourceFromLiveEdit(taskEl);
    });
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

    if (/^wwf\$/i.test(rest)) {
      return { end: start + 5, inner: 'wwf' };
    }
    if (/^wff\$/i.test(rest)) {
      return { end: start + 5, inner: 'wff' };
    }
    if (/^wf\$/i.test(rest)) {
      return { end: start + 4, inner: 'wf' };
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

    if (/^L\s+/i.test(rest)) {
      var lClose = rest.match(/\sL\s*\$/);
      if (lClose && lClose.index >= 0) {
        var lEnd = lClose.index + lClose[0].length;
        return { end: start + 1 + lEnd, inner: rest.slice(0, lEnd - 1) };
      }
    }
    if (/^M\s+/i.test(rest)) {
      var mClose = rest.match(/\sM\s*\$/);
      if (mClose && mClose.index >= 0) {
        var mEnd = mClose.index + mClose[0].length;
        return { end: start + 1 + mEnd, inner: rest.slice(0, mEnd - 1) };
      }
    }

    if (/^Paare\s+/i.test(rest)) {
      var paClose = rest.match(/\sPaare\s*\$/i);
      if (paClose && paClose.index >= 0) {
        var paEnd = paClose.index + paClose[0].length;
        return { end: start + 1 + paEnd, inner: rest.slice(0, paEnd - 1) };
      }
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
    gelb: '#f9a825',
    blau: '#1565c0',
    orange: '#e65100',
    lila: '#7b1fa2',
    violett: '#7b1fa2',
    schwarz: '#111111',
  };

  function compactTextColorFromCode(code) {
    var c = String(code || '').toLowerCase();
    if (c === 'b') return NAMED_COLORS.blau;
    if (c === 'g') return NAMED_COLORS.gelb;
    if (c === 'r') return NAMED_COLORS.rot;
    if (c === 'o') return NAMED_COLORS.orange;
    if (c === 'l') return NAMED_COLORS.lila;
    return null;
  }

  function parseCompactStyleSpan(inner) {
    var m = String(inner || '').match(/^([rgbol])([BIU]+)\s+([\s\S]+?)\s+([BIU]+)([rgbol])$/i);
    if (!m) return null;
    var openColor = m[1].toLowerCase();
    var openStyles = m[2].toUpperCase();
    var text = m[3];
    var closeStyles = m[4].toUpperCase();
    var closeColor = m[5].toLowerCase();
    if (closeColor !== openColor) return null;
    var expectClose = openStyles
      .split('')
      .reverse()
      .join('');
    if (closeStyles !== expectClose) return null;
    var css = compactTextColorFromCode(openColor);
    if (!css) return null;
    return { css: css, styles: openStyles, text: text };
  }

  function wrapRenderedCompactStyles(html, styles, colorCss) {
    var out = html;
    var chars = String(styles || '').toUpperCase();
    if (chars.indexOf('B') >= 0) out = '<strong>' + out + '</strong>';
    if (chars.indexOf('I') >= 0) out = '<em>' + out + '</em>';
    if (chars.indexOf('U') >= 0) out = '<u>' + out + '</u>';
    if (colorCss) {
      out =
        '<span style="color:' + escapeHtml(colorCss) + '">' + out + '</span>';
    }
    return out;
  }

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
      return { body: bodyLines.join('\n'), solution: '' };
    }
    return {
      body: bodyLines.slice(0, idx).join('\n'),
      solution: bodyLines.slice(idx + 1).join('\n').trim(),
    };
  }

  function liveEditPlainTextFromEl(el) {
    if (!el) return '';
    return String(el.innerText || '').replace(/\r/g, '');
  }

  function trimLiveEditTrailingBlankLines(text) {
    var lines = String(text || '').replace(/\r/g, '').split('\n');
    while (lines.length > 0 && !lines[lines.length - 1].trim()) {
      lines.pop();
    }
    return lines.join('\n');
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
    var b = String(body || '');
    if (b.length) lines.push(b);
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
    var liveRaw = liveEditPlainTextFromEl(live);
    var liveTrim = liveRaw.trim();
    var metaBefore = parseTaskSource(src.value);
    if (!liveTrim && String(metaBefore.body || '').trim() && live.dataset.jmTouched !== '1') {
      return;
    }
    var meta = metaBefore;
    var liveParts = parseLiveEditText(liveRaw);
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
      if (live) {
        live.textContent = liveEditTextFromMeta(meta);
        refreshLiveEditHighlight(live);
      }
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
      var box = inp.nextElementSibling;
      if (show) {
        if (!inp.dataset.jmChoiceSolutionShown) {
          inp.dataset.jmChoiceWasChecked = inp.checked ? '1' : '0';
        }
        inp.checked = isCorrect;
        inp.disabled = true;
        if (isCorrect) {
          inp.classList.add('exam-choice-solution-visible');
          if (box && box.classList) box.classList.add('exam-dollar-choice-box--solution-mark');
        } else {
          inp.classList.remove('exam-choice-solution-visible');
          if (box && box.classList) box.classList.remove('exam-dollar-choice-box--solution-mark');
        }
        inp.dataset.jmChoiceSolutionShown = '1';
      } else {
        inp.disabled = false;
        inp.classList.remove('exam-choice-solution-visible');
        if (box && box.classList) box.classList.remove('exam-dollar-choice-box--solution-mark');
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
    document.querySelectorAll('.exam-dollar-paare-match').forEach(function (root) {
      root.classList.toggle('exam-dollar-paare-match--solution', !!on);
    });
    syncGapInputWidths();
    try {
      syncLiveExamScoreFooter();
    } catch (scoreErr) {
      /* Prüfungs-Skript noch nicht vollständig (z. B. correctAnswers) */
    }
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

  function parseBildInnerSuffixes(afterBild) {
    var filename = String(afterBild || '').trim();
    var pct = null;
    var align = null;
    var wrap = false;
    var frame = null;
    var guard = 0;
    while (guard < 8 && filename) {
      guard += 1;
      var changed = false;
      var frameM = filename.match(/^([\s\S]*?)\s+(r\d+[a-zäöüß]+)\s*$/i);
      if (frameM) {
        var fr = parseImageFrameToken(frameM[2]);
        if (fr) {
          frame = fr;
          filename = frameM[1].trim();
          changed = true;
        }
      }
      if (changed) continue;
      var pctM = filename.match(/^([\s\S]*?)\s+(\d+(?:[.,]\d+)?%)\s*$/);
      if (pctM) {
        var pVal = parsePercentToken(pctM[2]);
        if (pVal != null) {
          pct = pVal;
          filename = pctM[1].trim();
          changed = true;
        }
      }
      if (changed) continue;
      var wrapM = filename.match(/^([\s\S]*?)\s+(t|textumfluss|umfluss)\s*$/i);
      if (wrapM && parseImageTextWrapToken(wrapM[2])) {
        wrap = true;
        filename = wrapM[1].trim();
        changed = true;
      }
      if (changed) continue;
      var alignM = filename.match(
        /^([\s\S]*?)\s+(r|rechts|right|l|links|left|m|mitte|center|zentriert|c|z)\s*$/i,
      );
      if (alignM) {
        var al = parseImageAlignToken(alignM[2]);
        if (al) {
          align = al;
          filename = alignM[1].trim();
          changed = true;
        }
      }
      if (!changed) break;
    }
    return { filename: filename, pct: pct, align: align, wrap: wrap, frame: frame };
  }

  function parseBildCommand(innerTrim) {
    var m = String(innerTrim || '')
      .trim()
      .match(/^Bild\s+([\s\S]+)$/i);
    if (!m) return null;
    return parseBildInnerSuffixes(m[1].trim());
  }

  function renderExamImageHtml(bildCmd, imgOpts, idGen) {
    if (!bildCmd || !bildCmd.filename) return '';
    var imgUrl = resolveExamImageUrl(bildCmd.filename);
    if (!imgUrl) return '';
    var wrapCls = 'exam-dollar-img-wrap';
    if (imgOpts.wrap) {
      wrapCls += ' exam-dollar-img-wrap--wrap';
      if (imgOpts.align === 'right') {
        wrapCls += ' exam-dollar-img-wrap--right exam-dollar-img-wrap--flow exam-dollar-img-wrap--flow-right';
      } else if (imgOpts.align === 'center') {
        wrapCls += ' exam-dollar-img-wrap--center exam-dollar-img-wrap--wrap-block';
      } else {
        wrapCls += ' exam-dollar-img-wrap--left exam-dollar-img-wrap--flow';
      }
    } else {
      if (imgOpts.align === 'left') wrapCls += ' exam-dollar-img-wrap--left';
      else if (imgOpts.align === 'right') wrapCls += ' exam-dollar-img-wrap--right';
      else if (imgOpts.align === 'center') wrapCls += ' exam-dollar-img-wrap--center';
    }
    if (imgOpts.frame) wrapCls += ' exam-dollar-img-wrap--framed';
    var wrapStyle = imgOpts.wrap ? '' : 'max-width:100%;';
    if (imgOpts.frame || imgOpts.pct != null) {
      wrapStyle += 'display:inline-block;width:fit-content;max-width:100%;vertical-align:top;';
    }
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
    return (
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
      '></span>'
    );
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
    var live = content.querySelector('.exam-dollar-live-edit');
    if (live) {
      var wrap = live.closest('.exam-dollar-live-edit-wrap');
      var host = wrap || live;
      if (host.parentNode !== inner) {
        inner.appendChild(host);
      }
    }
    var bar = content.querySelector('.exam-dollar-color-bar');
    if (bar && bar.parentNode !== inner) {
      var editorHost =
        content.querySelector('.exam-dollar-live-edit-wrap') ||
        content.querySelector('.exam-dollar-live-edit');
      if (editorHost && editorHost.parentNode === inner) {
        inner.insertBefore(bar, editorHost);
      } else {
        inner.insertBefore(bar, inner.firstChild);
      }
    }
    content.querySelectorAll('.exam-dollar-live-edit-wrap').forEach(function (w) {
      if (!w.querySelector('.exam-dollar-live-edit') && w.parentNode) {
        w.parentNode.removeChild(w);
      }
    });
    bindCollapsibleDetails(panel, 'jmExamTaskAuthorOpen', false);
  }

  function normalizeProseMathText(raw) {
    var s = String(raw || '').replace(/\t/g, ' ');
    s = s.replace(/(\d)\s*:\s*(\d)/g, '$1:$2');
    s = s.replace(/(\d)(Uhr)\b/gi, '$1 $2');
    s = s.replace(/(\d)([tkgml])(?![a-zäöüß])/gi, '$1 $2');
    return s;
  }

  function latexMathSpacesFromRun(spaceRun) {
    var n = String(spaceRun || '').length;
    if (!n) return '';
    var out = '';
    var i;
    for (i = 0; i < n; i += 1) out += '\\ ';
    return out;
  }

  function preserveSpacesInUserLatex(latex) {
    var t = String(latex || '');
    if (/\\[a-zA-Z]/.test(t)) return t;
    return t.replace(/ /g, '\\ ');
  }

  function latexEscapeTextFragment(raw) {
    return String(raw || '')
      .replace(/\\/g, '\\\\')
      .replace(/([{}#%&_])/g, '\\$1');
  }

  function formatSimpleMathNumberToken(numStr) {
    var n = String(numStr || '');
    if (/\./.test(n)) {
      return '\\text{' + latexEscapeTextFragment(n) + '}';
    }
    return n.replace(',', '{,}');
  }

  function simpleMathTermToLatex(termRaw) {
    var term = normalizeProseMathText(String(termRaw || '').replace(/^\s+|\s+$/g, ''));
    if (!term) return '';
    var timeM = term.match(/^(\d{1,2}):(\d{1,2})(\s+)(Uhr)$/i);
    if (timeM) {
      return (
        timeM[1] +
        '{:}' +
        timeM[2] +
        latexMathSpacesFromRun(timeM[3]) +
        '\\text{' +
        latexEscapeTextFragment(timeM[4]) +
        '}'
      );
    }
    var timeOnly = term.match(/^(\d{1,2}):(\d{1,2})$/);
    if (timeOnly) {
      return timeOnly[1] + '{:}' + timeOnly[2];
    }
    var numUnit = term.match(/^(\d+(?:\.\d+)*|\d+(?:,\d+)?)(\s+)([a-zA-Zäöüß]{1,8})$/);
    if (numUnit) {
      return (
        formatSimpleMathNumberToken(numUnit[1]) +
        latexMathSpacesFromRun(numUnit[2]) +
        '\\text{' +
        latexEscapeTextFragment(numUnit[3]) +
        '}'
      );
    }
    if (/^\d+(?:\.\d+)*$/.test(term) || /^\d+(?:,\d+)?$/.test(term)) {
      return formatSimpleMathNumberToken(term);
    }
    if (/^[\d\s:,{.·}]+$/.test(term)) {
      return term.replace(/,/g, '{,}').replace(/ /g, '\\ ');
    }
    if (/^[a-zA-Zäöüß]{1,12}$/.test(term)) {
      return '\\text{' + latexEscapeTextFragment(term) + '}';
    }
    return '\\text{' + latexEscapeTextFragment(term) + '}';
  }

  function simpleMathArithmeticToLatex(s) {
    var parts = String(s || '').split(/(\s+\+\s+|\s+\-\s+)/);
    var out = '';
    var i;
    for (i = 0; i < parts.length; i += 1) {
      var p = parts[i];
      if (!p) continue;
      if (/^\s+\+\s+$/.test(p)) {
        var pm = p.match(/^(\s*)\+(\s*)$/);
        if (pm) {
          out += latexMathSpacesFromRun(pm[1]) + '+' + latexMathSpacesFromRun(pm[2]);
        }
      } else if (/^\s+\-\s+$/.test(p)) {
        var mm = p.match(/^(\s*)\-(\s*)$/);
        if (mm) {
          out += latexMathSpacesFromRun(mm[1]) + '-' + latexMathSpacesFromRun(mm[2]);
        }
      } else {
        out += simpleMathTermToLatex(p);
      }
    }
    return out;
  }

  function shouldUseSimpleMathLatex(raw) {
    var t = String(raw || '').trim();
    if (!t) return true;
    if (/\\[a-zA-Z]|[\^_{}]|\{,\}|\\frac|\\cdot|\\sqrt|\\sum|\\times|\\div/.test(t)) {
      return false;
    }
    if (/\d\s*:\s*\d/.test(t)) return true;
    if (/\d[A-Za-zÄÖÜäöüß]{1,8}\b/.test(t)) return true;
    if (/[+\-]/.test(t) && /^[\d\s:,.·+\-UuhrmtkgäöüßA-Za-z-]+$/i.test(t)) return true;
    if (/^[\d\s:,.·UuhrmtkgäöüßA-Za-z-]+$/i.test(t)) return true;
    return false;
  }

  function simpleMathContentToLatex(raw) {
    var s = normalizeProseMathText(String(raw || ''));
    if (!s) return '';
    if (/[+\-]/.test(s)) {
      return simpleMathArithmeticToLatex(s);
    }
    return simpleMathTermToLatex(s);
  }

  function examKatexInline(latex) {
    if (global.katex && typeof global.katex.renderToString === 'function') {
      try {
        return global.katex.renderToString(latex, {
          throwOnError: false,
          displayMode: false,
          output: 'html',
        });
      } catch (e) {
        /* fallback */
      }
    }
    return null;
  }

  function findNextDollarAltMarkerIndex(str) {
    var s = String(str || '');
    var i;
    for (i = 0; i < s.length; i += 1) {
      if (s[i] !== '$') continue;
      var j = i;
      while (j < s.length && s[j] === '$') j += 1;
      if (j - i >= 2) return i;
      i = j;
    }
    return -1;
  }

  function trimAltSegmentEnds(s) {
    return String(s || '').replace(/^\s+/, '').replace(/\s+$/, '');
  }

  /** $L 5 $$7 $$$10 L$ — Anzahl $ = Variante ($$ → A1, $$$ → A2, …) */
  function parseDollarCountAltContent(raw) {
    var s = String(raw || '').replace(/\r/g, '');
    var first = findNextDollarAltMarkerIndex(s);
    if (first < 0) return null;
    var base = trimAltSegmentEnds(s.slice(0, first));
    var rest = s.slice(first);
    var alts = {};
    while (rest.length) {
      if (rest[0] !== '$') break;
      var j = 0;
      while (j < rest.length && rest[j] === '$') j += 1;
      if (j < 2) break;
      var altNum = j - 1;
      rest = rest.slice(j);
      var next = findNextDollarAltMarkerIndex(rest);
      var chunk = trimAltSegmentEnds(next < 0 ? rest : rest.slice(0, next));
      alts[altNum] = chunk;
      rest = next < 0 ? '' : rest.slice(next);
    }
    if (!Object.keys(alts).length) return null;
    return { base: base, alts: alts };
  }

  function parseDollarAAltContent(raw) {
    var s = String(raw || '').replace(/\r/g, '');
    var markerRe = /\$a(\d+)(?:\$|\s)/i;
    var first = s.search(markerRe);
    if (first < 0) return null;
    var base = trimAltSegmentEnds(s.slice(0, first));
    var rest = s.slice(first);
    var alts = {};
    while (rest.length) {
      var head = rest.match(/^\$a(\d+)(?:\$|\s)\s*/i);
      if (!head) break;
      var num = parseInt(head[1], 10);
      if (!num) break;
      rest = rest.slice(head[0].length);
      var next = rest.search(/\$a(\d+)(?:\$|\s)/i);
      var chunk = trimAltSegmentEnds(next < 0 ? rest : rest.slice(0, next));
      alts[num] = chunk;
      rest = next < 0 ? '' : rest.slice(next);
    }
    if (!Object.keys(alts).length) return null;
    return { base: base, alts: alts };
  }

  function parseDollarInlineAltContent(raw) {
    var s = String(raw || '');
    if (/\$\$/.test(s)) {
      var byCount = parseDollarCountAltContent(s);
      if (byCount && Object.keys(byCount.alts).length) return byCount;
    }
    return parseDollarAAltContent(s);
  }

  function renderMathHtmlCore(latex) {
    var t = trimAltSegmentEnds(String(latex || ''));
    if (!t) return '';
    var toRender = shouldUseSimpleMathLatex(t)
      ? simpleMathContentToLatex(t)
      : preserveSpacesInUserLatex(t);
    var html = examKatexInline(toRender);
    if (html) {
      return (
        '<span class="exam-dollar-math-latex exam-dollar-math-katex">' + html + '</span>'
      );
    }
    return (
      '<span class="exam-dollar-math-latex" data-latex="' +
      escapeHtml(toRender) +
      '"><span class="exam-dollar-math-fallback">' +
      escapeHtml(toRender) +
      '</span></span>'
    );
  }

  function renderMathHtml(latex, idGen) {
    var parsed = parseDollarInlineAltContent(latex);
    if (parsed && Object.keys(parsed.alts).length) {
      var gid = idGen ? idGen() : 'mathAlt_' + Date.now().toString(36);
      var nums = Object.keys(parsed.alts)
        .map(function (n) {
          return parseInt(n, 10);
        })
        .filter(function (n) {
          return n > 0;
        })
        .sort(function (a, b) {
          return a - b;
        });
      var out =
        '<span class="exam-dollar-alt-group exam-dollar-math-alt-group" data-jm-alt-group="' +
        escapeHtml(gid) +
        '" data-jm-alt-active="0">';
      out += '<span class="exam-dollar-alt-views">';
      out +=
        '<span class="exam-dollar-alt-view" data-jm-alt-view="0">' +
        renderMathHtmlCore(parsed.base) +
        '</span>';
      nums.forEach(function (n) {
        out +=
          '<span class="exam-dollar-alt-view exam-dollar-alt-view--hidden" data-jm-alt-view="' +
          n +
          '">' +
          renderMathHtmlCore(parsed.alts[n]) +
          '</span>';
      });
      out += '</span></span>';
      return out;
    }
    return renderMathHtmlCore(latex);
  }

  function typesetExamMathInRoot(root) {
    if (!global.katex || typeof global.katex.renderToString !== 'function') return;
    var list;
    if (root && root.querySelectorAll) {
      list = root.querySelectorAll('.exam-dollar-math-latex[data-latex]');
    } else {
      list = document.querySelectorAll('.exam-dollar-math-latex[data-latex]');
    }
    list.forEach(function (el) {
      if (el.__jmKatexDone) return;
      var latex = el.getAttribute('data-latex') || '';
      if (!latex) return;
      var toRender = shouldUseSimpleMathLatex(latex)
        ? simpleMathContentToLatex(latex)
        : preserveSpacesInUserLatex(latex);
      try {
        el.innerHTML = global.katex.renderToString(toRender, {
          throwOnError: false,
          displayMode: false,
          output: 'html',
        });
        el.classList.add('exam-dollar-math-katex');
        el.removeAttribute('data-latex');
        el.__jmKatexDone = true;
      } catch (e2) {
        /* keep fallback */
      }
    });
  }

  function renderCodeHtml(text, idGen, boxed) {
    var cls =
      'exam-dollar-code ' + (boxed ? 'exam-dollar-code--box' : 'exam-dollar-code--inline');
    return (
      '<code class="' + cls + '">' + renderInline(String(text || ''), idGen) + '</code>'
    );
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

  function parseWfModeFragment(fragment) {
    var s = String(fragment || '').trim();
    var m = s.match(/^\$(wf|wff|wwf)\s*\$$/i) || s.match(/^\$(wf|wff|wwf)$/i);
    if (!m) return null;
    return String(m[1] || 'wf').toLowerCase();
  }

  function normalizeWfLineSuffix(suffix) {
    return String(suffix || '')
      .replace(/^\s+/, '')
      .replace(/\s+\$\s*$/, '');
  }

  /** Zeilenende: $wff$ oder $wff $$wwf $$$wff (wie $L … $$ … $$$ …) */
  function parseWfLineModeVariants(suffix) {
    var rest = normalizeWfLineSuffix(suffix);
    if (!rest || rest.charAt(0) !== '$') return null;
    var firstAlt = findNextDollarAltMarkerIndex(rest);
    if (firstAlt < 0) {
      var only = parseWfModeFragment(rest);
      if (!only) return null;
      return { base: only, alts: {} };
    }
    var baseMode = parseWfModeFragment(rest.slice(0, firstAlt));
    if (!baseMode) return null;
    var alts = {};
    var tail = rest.slice(firstAlt).replace(/^\s+/, '');
    while (tail.length) {
      tail = tail.replace(/^\s+/, '');
      if (!tail.length || tail.charAt(0) !== '$') break;
      var j = 0;
      while (j < tail.length && tail.charAt(j) === '$') j += 1;
      if (j < 2) break;
      var altNum = j - 1;
      tail = tail.slice(j);
      var next = findNextDollarAltMarkerIndex(tail);
      var chunk = trimAltSegmentEnds(next < 0 ? tail : tail.slice(0, next));
      var modeM = chunk.match(/^(wf|wff|wwf)$/i);
      if (!modeM) break;
      alts[altNum] = String(modeM[1]).toLowerCase();
      tail = next < 0 ? '' : tail.slice(next);
    }
    if (!Object.keys(alts).length) return null;
    return { base: baseMode, alts: alts };
  }

  function findWfModeSuffixStart(line) {
    var t = String(line || '');
    var simple = t.match(/\s+\$(wwf|wff|wf)\s*\$/i);
    if (simple && simple.index >= 0) return simple.index;
    var m = t.search(/\s+\$(?:wf|wff|wwf)(?=\s|\$)/i);
    return m >= 0 ? m : -1;
  }

  function parseWfLine(line) {
    var t = String(line || '').trim();
    if (!t) return null;
    var suffixAt = findWfModeSuffixStart(t);
    if (suffixAt >= 0) {
      var stmt = t.slice(0, suffixAt).trim();
      if (stmt) {
        var variants = parseWfLineModeVariants(t.slice(suffixAt));
        if (variants) {
          return {
            stmt: stmt,
            mode: variants.base,
            alts: Object.keys(variants.alts).length ? variants.alts : null,
          };
        }
      }
    }
    if (/\$\$/.test(t)) return null;
    var simple = t.match(/^([\s\S]+?)\s+\$(wwf|wff|wf)\s*\$/i);
    if (simple) {
      var stmtSimple = String(simple[1] || '').trim();
      if (!stmtSimple) return null;
      return { stmt: stmtSimple, mode: String(simple[2] || 'wf').toLowerCase(), alts: null };
    }
    return null;
  }

  function countWfRowsInBody(body) {
    var n = 0;
    String(body || '')
      .split(/\r?\n/)
      .forEach(function (line) {
        if (parseWfLine(line)) n += 1;
      });
    return n;
  }

  function scanBodyDollarTokens(body) {
    var gaps = 0;
    var choices = 0;
    choices += countWfRowsInBody(body);
    choices += countPaarePairsInBody(body);
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

  function scoreWfRowsInTask(taskEl) {
    var achieved = 0;
    var total = 0;
    taskEl.querySelectorAll('.exam-dollar-wf-row').forEach(function (tr) {
      var visibleView = tr.querySelector('.exam-dollar-alt-view:not(.exam-dollar-alt-view--hidden)');
      var scope = visibleView || tr;
      var w = scope.querySelector('.exam-dollar-wf-input[data-jm-wf-col="w"]');
      var f = scope.querySelector('.exam-dollar-wf-input[data-jm-wf-col="f"]');
      if (!w || !f) return;
      var wSol = w.getAttribute('data-correct') === '1';
      var fSol = f.getAttribute('data-correct') === '1';
      if (!wSol && !fSol) return;
      total += 0.5;
      var wOn = w.checked;
      var fOn = f.checked;
      if (wSol && wOn && !fOn) achieved += 0.5;
      else if (fSol && fOn && !wOn) achieved += 0.5;
      else if (wOn || fOn) achieved -= 0.5;
    });
    return { achieved: achieved, total: total };
  }

  function scorePaareInTask(taskEl) {
    var achieved = 0;
    var total = 0;
    taskEl.querySelectorAll('.exam-dollar-paare-match').forEach(function (root) {
      var hidden = root.querySelector('.exam-dollar-paare-state');
      var totalPairs = hidden
        ? parseInt(hidden.getAttribute('data-jm-paare-total') || '0', 10)
        : 0;
      if (!totalPairs) return;
      total += totalPairs * 0.5;
      var matched = root.querySelectorAll('.exam-dollar-paare-stack').length;
      achieved += matched * 0.5;
    });
    return { achieved: achieved, total: total };
  }

  function scoreCheckboxChoicesInTask(taskEl) {
    var achieved = 0;
    var inputs = taskEl.querySelectorAll(
      '.exam-dollar-choice-input:not(.exam-dollar-wf-input)',
    );
    inputs.forEach(function (inp) {
      var shouldCheck = inp.getAttribute('data-correct') === '1';
      if (inp.checked === shouldCheck) achieved += 0.5;
      else achieved -= 0.5;
    });
    return { achieved: achieved, total: inputs.length * 0.5 };
  }

  function scoreChoicesInTask(taskEl) {
    var wf = scoreWfRowsInTask(taskEl);
    var ch = scoreCheckboxChoicesInTask(taskEl);
    var pr = scorePaareInTask(taskEl);
    return {
      achieved: wf.achieved + ch.achieved + pr.achieved,
      total: wf.total + ch.total + pr.total,
    };
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
        var ch = scoreChoicesInTask(taskEl);
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
          var ch2 = scoreChoicesInTask(taskEl);
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

  function shouldHideLiveExamScores() {
    return !document.body.classList.contains('show-solutions');
  }

  function showLiveExamScoreFooter() {
    var pd = document.getElementById('pointsDisplay');
    var nl = document.querySelector('.footer-note-line');
    if (pd) {
      pd.style.removeProperty('display');
      pd.style.removeProperty('visibility');
    }
    if (nl) {
      nl.style.removeProperty('display');
      nl.style.removeProperty('visibility');
    }
  }

  function hideLiveExamScoreFooter() {
    var pd = document.getElementById('pointsDisplay');
    var nl = document.querySelector('.footer-note-line');
    if (pd) pd.style.setProperty('display', 'none', 'important');
    if (nl) nl.style.setProperty('display', 'none', 'important');
  }

  function syncLiveExamScoreFooter() {
    if (shouldHideLiveExamScores()) {
      hideLiveExamScoreFooter();
      return;
    }
    showLiveExamScoreFooter();
    if (typeof global.__jmExamLiveScoreUpdateCore === 'function') {
      global.__jmExamLiveScoreUpdateCore();
    }
  }

  function injectStudentLiveScoreGuardStyles() {
    var marker = 'data-jm-exam-live-score-guard';
    if (document.querySelector('style[' + marker + ']')) return;
    var st = document.createElement('style');
    st.setAttribute(marker, '1');
    st.textContent =
      'body:not(.show-solutions) #pointsDisplay,' +
      'body:not(.show-solutions) .footer-note-line{display:none!important;visibility:hidden!important}';
    document.head.appendChild(st);
  }

  function installExamLiveScoreGuard() {
    if (global.__jmExamLiveScoreGuard) return;
    global.__jmExamLiveScoreGuard = true;
    injectStudentLiveScoreGuardStyles();
    var previous =
      typeof global.updatePointsDisplay === 'function' ? global.updatePointsDisplay : null;
    if (previous && !previous.__jmHideLiveScores) {
      global.__jmExamLiveScoreUpdateCore = previous;
    }
    global.updatePointsDisplay = function jmGuardedUpdatePointsDisplay() {
      syncLiveExamScoreFooter();
    };
    syncLiveExamScoreFooter();
  }

  function maybeUpdateLivePointsDisplay() {
    syncLiveExamScoreFooter();
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
          maybeUpdateLivePointsDisplay();
        });
      });
      document.querySelectorAll('.exam-dollar-paare-state').forEach(function (inp) {
        if (inp.__jmScoreWired) return;
        inp.__jmScoreWired = true;
        inp.addEventListener('input', function () {
          maybeUpdateLivePointsDisplay();
        });
      });
    };
  }

  function normalizeBodyDollarText(text) {
    return String(text || '')
      .replace(/\$\s*e\s*\$/gi, '$e$')
      .replace(/\$\s*t\s*\$/gi, '$t$')
      .replace(/\$\s*CC\s*\$/gi, '$CC$')
      .replace(/\$\s*C\s*\$/gi, '$C$');
  }

  function parseChoiceLine(line) {
    var t = String(line || '').trim();
    var mcc = t.match(/^\$CC\$\s*([\s\S]*)$/i);
    if (mcc) return { kind: 'cc', text: String(mcc[1] || '').trim() };
    var mc = t.match(/^\$C\$\s*([\s\S]*)$/i);
    if (mc) return { kind: 'c', text: String(mc[1] || '').trim() };
    return null;
  }

  function renderChoiceCheckbox(isCorrect, idGen) {
    var id = idGen();
    if (isCorrect) {
      return (
        '<label class="exam-dollar-choice exam-dollar-choice-correct">' +
        '<input type="checkbox" class="exam-dollar-choice-input" data-correct="1" data-jm-choice-kind="correct" id="' +
        escapeHtml(id) +
        '">' +
        '<span class="exam-dollar-choice-box" aria-hidden="true"></span></label>'
      );
    }
    return (
      '<label class="exam-dollar-choice exam-dollar-choice-neutral">' +
      '<input type="checkbox" class="exam-dollar-choice-input" data-jm-choice-kind="neutral" id="' +
      escapeHtml(id) +
      '">' +
      '<span class="exam-dollar-choice-box" aria-hidden="true"></span></label>'
    );
  }

  function renderChoiceList(rows, idGen) {
    var html = '<ul class="exam-dollar-choice-list">';
    rows.forEach(function (row) {
      html +=
        '<li class="exam-dollar-choice-list-item">' +
        renderChoiceCheckbox(row.kind === 'cc', idGen);
      if (row.text) {
        html +=
          ' <span class="exam-dollar-choice-text">' + renderInline(row.text, idGen) + '</span>';
      }
      html += '</li>';
    });
    html += '</ul>';
    return html;
  }

  function isFlowImageOnlyLine(line) {
    var s = normalizeBodyDollarText(line).trim();
    var solo = s.match(/^\$([\s\S]+)\$$/);
    if (solo && /^Bild\s+/i.test(String(solo[1] || '').trim())) {
      var cmd = parseBildCommand(String(solo[1]).trim());
      return !!(cmd && cmd.wrap);
    }
    if (!/\$t\$/i.test(s)) return false;
    if (!/^\$Bild\s+/i.test(s)) return false;
    var plain = s.replace(/\$[^$]+\$/g, ' ').replace(/\s+/g, '').trim();
    return plain.length === 0;
  }

  function renderWfCheckboxInner(kind, isCorrect, idGen) {
    var id = idGen();
    var cls = 'exam-dollar-choice exam-dollar-wf-choice';
    if (isCorrect) cls += ' exam-dollar-choice-correct';
    else cls += ' exam-dollar-choice-neutral';
    var dataCorrect = isCorrect ? ' data-correct="1"' : '';
    var col = kind === 'w' ? 'w' : 'f';
    return (
      '<label class="' +
      cls +
      '">' +
      '<input type="checkbox" class="exam-dollar-choice-input exam-dollar-wf-input"' +
      dataCorrect +
      ' data-jm-wf-col="' +
      col +
      '" id="' +
      escapeHtml(id) +
      '">' +
      '<span class="exam-dollar-choice-box" aria-hidden="true"></span></label>'
    );
  }

  function renderWfCheckboxCell(kind, isCorrect, idGen) {
    return (
      '<td class="exam-dollar-wf-check">' + renderWfCheckboxInner(kind, isCorrect, idGen) + '</td>'
    );
  }

  function wfModeToCorrectFlags(mode) {
    var m = String(mode || 'wf').toLowerCase();
    return { wCorrect: m === 'wwf', fCorrect: m === 'wff' };
  }

  function renderWfTableRow(row, idGen) {
    var stmtCell =
      '<td class="exam-dollar-wf-stmt">' + renderInline(row.stmt, idGen) + '</td>';
    var alts = row.alts && Object.keys(row.alts).length ? row.alts : null;
    if (!alts) {
      var mc = wfModeToCorrectFlags(row.mode);
      return (
        '<tr class="exam-dollar-wf-row">' +
        stmtCell +
        renderWfCheckboxCell('w', mc.wCorrect, idGen) +
        renderWfCheckboxCell('f', mc.fCorrect, idGen) +
        '</tr>'
      );
    }
    var gid = idGen();
    var views = [{ num: 0, mode: row.mode }];
    Object.keys(alts)
      .map(function (n) {
        return parseInt(n, 10);
      })
      .filter(function (n) {
        return n > 0;
      })
      .sort(function (a, b) {
        return a - b;
      })
      .forEach(function (n) {
        views.push({ num: n, mode: alts[n] });
      });
    var viewsHtml = views
      .map(function (v) {
        var flags = wfModeToCorrectFlags(v.mode);
        var hidden = v.num === 0 ? '' : ' exam-dollar-alt-view--hidden';
        return (
          '<div class="exam-dollar-alt-view' +
          hidden +
          '" data-jm-alt-view="' +
          v.num +
          '"><div class="exam-dollar-wf-alt-pair">' +
          '<div class="exam-dollar-wf-check">' +
          renderWfCheckboxInner('w', flags.wCorrect, idGen) +
          '</div><div class="exam-dollar-wf-check">' +
          renderWfCheckboxInner('f', flags.fCorrect, idGen) +
          '</div></div></div>'
        );
      })
      .join('');
    return (
      '<tr class="exam-dollar-wf-row exam-dollar-wf-row--alts">' +
      stmtCell +
      '<td colspan="2" class="exam-dollar-wf-alt-cell">' +
      '<div class="exam-dollar-alt-group exam-dollar-wf-alt-group" data-jm-alt-group="' +
      escapeHtml(gid) +
      '" data-jm-alt-active="0">' +
      '<div class="exam-dollar-alt-views">' +
      viewsHtml +
      '</div></div></td></tr>'
    );
  }

  function renderWfTable(rows, idGen) {
    var html =
      '<table class="exam-dollar-wf"><thead><tr>' +
      '<th class="exam-dollar-wf-stmt" scope="col">Aussage</th>' +
      '<th class="exam-dollar-wf-h" scope="col">Wahr</th>' +
      '<th class="exam-dollar-wf-h" scope="col">Falsch</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (row) {
      html += renderWfTableRow(row, idGen);
    });
    html += '</tbody></table>';
    return html;
  }

  function isPaareOpenLine(line) {
    return /^\$Paare\s*$/i.test(String(line || '').trim());
  }

  function isPaareCloseLine(line) {
    return /^Paare\s*\$/i.test(String(line || '').trim());
  }

  function parsePaarePairLine(line) {
    var t = String(line || '').trim();
    if (!t || isPaareOpenLine(line) || isPaareCloseLine(line)) return null;
    var semi = t.indexOf(';');
    if (semi < 0) return null;
    var left = t.slice(0, semi).trim();
    var right = t.slice(semi + 1).trim();
    if (!left || !right) return null;
    return { left: left, right: right };
  }

  function countPaarePairsInBody(body) {
    var lines = String(body || '').split(/\r?\n/);
    var n = 0;
    var i;
    for (i = 0; i < lines.length; i += 1) {
      if (!isPaareOpenLine(lines[i])) continue;
      i += 1;
      while (i < lines.length && !isPaareCloseLine(lines[i])) {
        if (parsePaarePairLine(lines[i])) n += 1;
        i += 1;
      }
    }
    return n;
  }

  function parsePaareBlockLines(lines, openIndex) {
    var pairs = [];
    var i = openIndex + 1;
    while (i < lines.length) {
      if (isPaareCloseLine(lines[i])) {
        return pairs.length ? { pairs: pairs, nextIndex: i } : null;
      }
      var p = parsePaarePairLine(lines[i]);
      if (p) pairs.push(p);
      i += 1;
    }
    return null;
  }

  function shuffleExamPaareCards(cards) {
    var a = cards.slice();
    var i;
    for (i = a.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function renderPaareMatch(pairs, idGen) {
    if (!pairs || !pairs.length) return '';
    var gid = idGen();
    var hiddenId = idGen();
    var cards = [];
    pairs.forEach(function (p, idx) {
      var pid = String(idx);
      cards.push({ pairId: pid, text: p.left });
      cards.push({ pairId: pid, text: p.right });
    });
    cards = shuffleExamPaareCards(cards);
    var html =
      '<div class="exam-dollar-paare exam-dollar-paare-match" data-jm-paare-group="' +
      escapeHtml(gid) +
      '">';
    html +=
      '<p class="exam-dollar-paare-lead"><span class="exam-dollar-paare-lead-icon" aria-hidden="true">🔊</span> Ziehe gleiche Zahlenwerte aufeinander.</p>';
    html += '<div class="exam-dollar-paare-pool" role="group" aria-label="Paare zuordnen" style="--jm-paare-cols:' +
      paareGridColumnCount(cards.length) +
      '">';
    cards.forEach(function (c) {
      var cid = idGen();
      html +=
        '<div class="exam-dollar-paare-card" draggable="true" role="button" tabindex="0" id="' +
        escapeHtml(cid) +
        '" data-pair-id="' +
        escapeHtml(c.pairId) +
        '" data-jm-paare-card="1"><div class="exam-dollar-paare-card-inner">' +
        renderInline(c.text, idGen) +
        '</div></div>';
    });
    html += '</div>';
    html +=
      '<input type="hidden" class="exam-dollar-paare-state" id="' +
      escapeHtml(hiddenId) +
      '" value="" data-jm-paare-total="' +
      pairs.length +
      '">';
    html += '</div>';
    return html;
  }

  function paareGridColumnCount(itemCount) {
    var n = Math.max(1, parseInt(String(itemCount || '0'), 10) || 1);
    if (n <= 1) return 1;
    if (n === 2) return 2;
    var best = Math.ceil(Math.sqrt(n));
    var bestDiff = Infinity;
    var c;
    for (c = 1; c <= n; c += 1) {
      if (n % c !== 0) continue;
      var rows = n / c;
      var diff = Math.abs(c - rows);
      if (diff < bestDiff || (diff === bestDiff && Math.max(c, rows) > Math.max(best, n / best))) {
        bestDiff = diff;
        best = c;
      }
    }
    return Math.max(1, Math.min(n, best));
  }

  function layoutExamPaarePool(pool) {
    if (!pool) return;
    var items = pool.querySelectorAll(':scope > .exam-dollar-paare-card, :scope > .exam-dollar-paare-stack');
    var n = items.length;
    var cols = paareGridColumnCount(n);
    pool.style.setProperty('--jm-paare-cols', String(cols));
    items.forEach(function (el) {
      el.style.gridColumn = '';
    });
    pool.querySelectorAll(':scope > .exam-dollar-paare-stack').forEach(function (stack) {
      if (cols >= 2) stack.style.gridColumn = 'span 2';
    });
  }

  function syncPaareHiddenState(root) {
    var hidden = root.querySelector('.exam-dollar-paare-state');
    if (!hidden) return;
    var stacks = root.querySelectorAll('.exam-dollar-paare-stack');
    var ids = [];
    stacks.forEach(function (stack) {
      var id = stack.getAttribute('data-pair-id');
      if (id != null) ids.push(id);
    });
    hidden.value = ids.join(',');
    hidden.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function paareMatchTwoCards(pool, a, b) {
    if (!pool || !a || !b || a === b) return;
    if (a.classList.contains('exam-dollar-paare-card--matched')) return;
    if (b.classList.contains('exam-dollar-paare-card--matched')) return;
    var stack = document.createElement('div');
    stack.className = 'exam-dollar-paare-stack exam-dollar-paare-stack--correct';
    stack.setAttribute('data-pair-id', a.getAttribute('data-pair-id') || '');
    a.classList.add('exam-dollar-paare-card--matched', 'exam-dollar-paare-card--correct');
    b.classList.add('exam-dollar-paare-card--matched', 'exam-dollar-paare-card--correct');
    a.setAttribute('draggable', 'false');
    b.setAttribute('draggable', 'false');
    a.classList.remove('exam-dollar-paare-card--selected');
    b.classList.remove('exam-dollar-paare-card--selected');
    pool.insertBefore(stack, a);
    stack.appendChild(a);
    stack.appendChild(b);
    layoutExamPaarePool(pool);
  }

  function wireExamPaareMatch(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.exam-dollar-paare-match').forEach(function (paRoot) {
      if (paRoot.__jmPaareWired) return;
      paRoot.__jmPaareWired = true;
      var pool = paRoot.querySelector('.exam-dollar-paare-pool');
      if (!pool) return;
      var dragCard = null;
      var selectedCard = null;

      function clearSelected() {
        pool.querySelectorAll('.exam-dollar-paare-card--selected').forEach(function (c) {
          c.classList.remove('exam-dollar-paare-card--selected');
        });
        selectedCard = null;
      }

      function tryMatch(a, b) {
        if (!a || !b || a === b) return;
        if (a.classList.contains('exam-dollar-paare-card--matched')) return;
        if (b.classList.contains('exam-dollar-paare-card--matched')) return;
        if (a.getAttribute('data-pair-id') === b.getAttribute('data-pair-id')) {
          paareMatchTwoCards(pool, a, b);
          clearSelected();
          syncPaareHiddenState(paRoot);
          maybeUpdateLivePointsDisplay();
        } else {
          a.classList.add('exam-dollar-paare-card--incorrect');
          b.classList.add('exam-dollar-paare-card--incorrect');
          a.classList.add('exam-dollar-paare-card--wrong');
          b.classList.add('exam-dollar-paare-card--wrong');
          setTimeout(function () {
            a.classList.remove('exam-dollar-paare-card--incorrect', 'exam-dollar-paare-card--wrong');
            b.classList.remove('exam-dollar-paare-card--incorrect', 'exam-dollar-paare-card--wrong');
          }, 650);
        }
      }

      pool.addEventListener('dragstart', function (e) {
        var card = e.target.closest('.exam-dollar-paare-card');
        if (!card || !pool.contains(card) || card.classList.contains('exam-dollar-paare-card--matched')) {
          e.preventDefault();
          return;
        }
        dragCard = card;
        if (e.dataTransfer) {
          e.dataTransfer.setData('text/plain', card.getAttribute('data-pair-id') || '');
          e.dataTransfer.effectAllowed = 'move';
        }
      });
      pool.addEventListener('dragend', function () {
        dragCard = null;
        pool.querySelectorAll('.exam-dollar-paare-card--over').forEach(function (c) {
          c.classList.remove('exam-dollar-paare-card--over');
        });
      });
      pool.addEventListener('dragover', function (e) {
        var card = e.target.closest('.exam-dollar-paare-card');
        if (!card || !pool.contains(card) || card.classList.contains('exam-dollar-paare-card--matched')) {
          return;
        }
        e.preventDefault();
        card.classList.add('exam-dollar-paare-card--over');
      });
      pool.addEventListener('dragleave', function (e) {
        var card = e.target.closest('.exam-dollar-paare-card');
        if (card) card.classList.remove('exam-dollar-paare-card--over');
      });
      pool.addEventListener('drop', function (e) {
        e.preventDefault();
        var target = e.target.closest('.exam-dollar-paare-card');
        if (target) target.classList.remove('exam-dollar-paare-card--over');
        if (dragCard && target) tryMatch(dragCard, target);
        dragCard = null;
      });

      pool.addEventListener('click', function (e) {
        var card = e.target.closest('.exam-dollar-paare-card');
        if (!card || !pool.contains(card) || card.classList.contains('exam-dollar-paare-card--matched')) {
          return;
        }
        if (!selectedCard || selectedCard === card) {
          clearSelected();
          selectedCard = card;
          card.classList.add('exam-dollar-paare-card--selected');
          return;
        }
        tryMatch(selectedCard, card);
      });
      paRoot.querySelectorAll('.exam-dollar-paare-state').forEach(function (inp) {
        if (inp.__jmScoreWired) return;
        inp.__jmScoreWired = true;
        inp.addEventListener('input', function () {
          maybeUpdateLivePointsDisplay();
        });
      });
      layoutExamPaarePool(pool);
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(function () {
          layoutExamPaarePool(pool);
        });
      }
    });
  }

  function buildSideFlowHtml(txtHtml, flowImgLines, idGen) {
    var imgsHtml = flowImgLines
      .map(function (ln) {
        return renderInline(ln, idGen);
      })
      .join('');
    if (!imgsHtml) {
      return '<div class="exam-dollar-flow">' + txtHtml + '</div>';
    }
    return (
      '<div class="exam-dollar-flow-side exam-dollar-flow-side--wrap">' +
      '<div class="exam-dollar-side-text">' +
      imgsHtml +
      txtHtml +
      '</div></div>'
    );
  }

  function insertFlowImageIntoSidePart(html, imgHtml) {
    var split = '<div class="exam-dollar-side-text">';
    var at = html.indexOf(split);
    if (at >= 0) {
      var openEnd = at + split.length;
      return html.slice(0, openEnd) + imgHtml + html.slice(openEnd);
    }
    var legacy = '</div><div class="exam-dollar-side-text">';
    var legAt = html.indexOf(legacy);
    if (legAt >= 0) {
      return html.slice(0, legAt) + imgHtml + html.slice(legAt);
    }
    return html;
  }

  function appendFlowImageToPreviousPart(parts, imgLine, idGen) {
    if (!parts.length) return false;
    var imgHtml = renderInline(imgLine, idGen);
    if (!imgHtml) return false;
    var idx = parts.length - 1;
    var last = parts[idx];
    if (last.indexOf('exam-dollar-flow-side') >= 0) {
      parts[idx] = insertFlowImageIntoSidePart(last, imgHtml);
      return true;
    }
    var flowM = last.match(/^<div class="exam-dollar-flow">([\s\S]*)<\/div>$/);
    if (flowM) {
      parts[idx] = buildSideFlowHtml(flowM[1], [imgLine], idGen);
      return true;
    }
    return false;
  }

  function parseAltMarkerLine(line) {
    var t = String(line || '').trim();
    var m = t.match(/^\$a(\d+)\$(?:\s+([\s\S]*))?$/i);
    if (!m) return null;
    var num = parseInt(m[1], 10);
    if (!num || num < 1) return null;
    return { num: num, inline: String(m[2] || '').trim() };
  }

  function renderAltGroupHtml(baseHtml, alts, idGen) {
    if (!alts || !alts.length) return baseHtml || '';
    var gid = idGen();
    var sorted = alts.slice().sort(function (a, b) {
      return a.num - b.num;
    });
    var out =
      '<div class="exam-dollar-alt-group" data-jm-alt-group="' +
      escapeHtml(gid) +
      '" data-jm-alt-active="0">';
    out += '<div class="exam-dollar-alt-views">';
    out +=
      '<div class="exam-dollar-alt-view" data-jm-alt-view="0">' + (baseHtml || '') + '</div>';
    sorted.forEach(function (alt) {
      out +=
        '<div class="exam-dollar-alt-view exam-dollar-alt-view--hidden" data-jm-alt-view="' +
        alt.num +
        '">' +
        (alt.html || '') +
        '</div>';
    });
    out += '</div></div>';
    return out;
  }

  function renderFlowTextAndImages(textLines, flowImgLines, idGen) {
    if (!textLines.length && !flowImgLines.length) return '';
    if (flowImgLines.length && textLines.length) {
      var txtHtml = textLines
        .map(function (ln) {
          return renderInline(ln, idGen);
        })
        .join('<br><br>');
      return buildSideFlowHtml(txtHtml, flowImgLines, idGen);
    }
    var chunks = [];
    textLines.forEach(function (ln) {
      chunks.push(renderInline(ln, idGen));
    });
    flowImgLines.forEach(function (ln) {
      chunks.push(renderInline(ln, idGen));
    });
    return '<div class="exam-dollar-flow">' + chunks.join('<br>') + '</div>';
  }

  function renderBlockToHtml(blockText, idGen) {
    var body = normalizeBodyDollarText(blockText);
    var lines = body.split(/\r?\n/);
    var parts = [];
    var wfBuffer = [];
    var choiceBuffer = [];
    var textBuffer = [];
    var flowImgBuffer = [];
    var i;

    function flushChoice() {
      if (!choiceBuffer.length) return;
      parts.push(renderChoiceList(choiceBuffer, idGen));
      choiceBuffer = [];
    }

    function flushWf() {
      if (!wfBuffer.length) return;
      parts.push(renderWfTable(wfBuffer, idGen));
      wfBuffer = [];
    }

    function flushFlow() {
      if (!textBuffer.length && !flowImgBuffer.length) return;
      parts.push(renderFlowTextAndImages(textBuffer, flowImgBuffer, idGen));
      textBuffer = [];
      flowImgBuffer = [];
    }

    function nextNonEmptyLine(fromIndex) {
      var j;
      for (j = fromIndex; j < lines.length; j++) {
        if (String(lines[j]).trim()) return { index: j, line: lines[j] };
      }
      return null;
    }

    function collectAltVariants(fromIndex) {
      var alts = [];
      var j = fromIndex;
      while (j < lines.length) {
        var altM = parseAltMarkerLine(lines[j]);
        if (!altM) break;
        j += 1;
        var altTextLines = [];
        var altFlowImgs = [];
        if (altM.inline) altTextLines.push(altM.inline);
        while (j < lines.length) {
          var ln = lines[j];
          if (!String(ln).trim()) {
            j += 1;
            break;
          }
          if (parseAltMarkerLine(ln) || parseChoiceLine(ln) || parseWfLine(ln) || isPaareOpenLine(ln)) break;
          if (isFlowImageOnlyLine(ln)) {
            altFlowImgs.push(ln);
          } else {
            altTextLines.push(ln);
          }
          j += 1;
        }
        alts.push({
          num: altM.num,
          html: renderFlowTextAndImages(altTextLines, altFlowImgs, idGen),
        });
      }
      return { alts: alts, nextIndex: j };
    }

    for (i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (isPaareOpenLine(line)) {
        flushWf();
        flushChoice();
        flushFlow();
        var paBlock = parsePaareBlockLines(lines, i);
        if (paBlock) {
          parts.push(renderPaareMatch(paBlock.pairs, idGen));
          i = paBlock.nextIndex;
          continue;
        }
      }
      if (parseAltMarkerLine(line)) {
        flushWf();
        flushChoice();
        flushFlow();
        var baseHtml = parts.length ? parts.pop() : '';
        var collected = collectAltVariants(i);
        parts.push(renderAltGroupHtml(baseHtml, collected.alts, idGen));
        i = collected.nextIndex;
        continue;
      }
      if (!String(line).trim()) {
        flushWf();
        flushChoice();
        var nxt = nextNonEmptyLine(i + 1);
        if (
          nxt &&
          isFlowImageOnlyLine(nxt.line) &&
          textBuffer.length
        ) {
          continue;
        }
        if (nxt && parseChoiceLine(nxt.line) && choiceBuffer.length) {
          continue;
        }
        if (nxt && parseWfLine(nxt.line) && wfBuffer.length) {
          continue;
        }
        if (nxt && isPaareOpenLine(nxt.line)) {
          continue;
        }
        flushFlow();
        continue;
      }
      var wf = parseWfLine(line);
      if (wf) {
        flushFlow();
        flushChoice();
        wfBuffer.push(wf);
        continue;
      }
      var ch = parseChoiceLine(line);
      if (ch) {
        flushFlow();
        flushWf();
        choiceBuffer.push(ch);
        continue;
      }
      flushWf();
      flushChoice();
      if (isFlowImageOnlyLine(line)) {
        if (textBuffer.length) {
          flowImgBuffer.push(line);
        } else if (!appendFlowImageToPreviousPart(parts, line, idGen)) {
          flowImgBuffer.push(line);
        }
      } else textBuffer.push(line);
    }
    flushWf();
    flushChoice();
    flushFlow();
    return parts.join('');
  }

  function getExamGlobalAltIndex() {
    var v = document.body.getAttribute('data-jm-exam-alt-variant');
    if (v == null || v === '') return '0';
    return String(v);
  }

  function setExamAltGroupActive(groupEl, index) {
    if (!groupEl) return;
    var idx = String(index == null ? '0' : index);
    groupEl.setAttribute('data-jm-alt-active', idx);
    groupEl.querySelectorAll('.exam-dollar-alt-view').forEach(function (view) {
      var v = view.getAttribute('data-jm-alt-view');
      var on = v === idx;
      view.classList.toggle('exam-dollar-alt-view--hidden', !on);
    });
  }

  function setExamGlobalAltIndex(index) {
    var idx = String(index == null ? 0 : index);
    if (idx !== '0' && !/^\d+$/.test(idx)) idx = '0';
    document.body.setAttribute('data-jm-exam-alt-variant', idx);
    global.__jmExamGlobalAltIndex = idx;
    document.querySelectorAll('.exam-dollar-alt-group').forEach(function (groupEl) {
      var use = idx;
      if (use !== '0' && !groupEl.querySelector('.exam-dollar-alt-view[data-jm-alt-view="' + use + '"]')) {
        use = '0';
      }
      setExamAltGroupActive(groupEl, use);
    });
    refreshExamAltVariantToolbarActiveState();
  }

  function collectExamAltVariantNumbers() {
    var nums = {};
    document.querySelectorAll('.exam-paper .exam-dollar-alt-view[data-jm-alt-view]').forEach(function (view) {
      var id = view.getAttribute('data-jm-alt-view');
      if (id && id !== '0') nums[id] = true;
    });
    return Object.keys(nums)
      .map(function (n) {
        return parseInt(n, 10);
      })
      .filter(function (n) {
        return n > 0;
      })
      .sort(function (a, b) {
        return a - b;
      });
  }

  function ensureExamAltVariantToolbarMount() {
    var toolbar = document.querySelector('.exam-toolbar');
    if (!toolbar) return null;
    var mount = document.getElementById('examAltVariantToolbar');
    if (!mount) {
      mount = document.createElement('div');
      mount.id = 'examAltVariantToolbar';
      mount.className = 'exam-alt-variant-toolbar teacher-only';
      mount.setAttribute('aria-label', 'Formulierungsvarianten');
      var solutions = toolbar.querySelector('label.solutions-toggle');
      if (solutions) solutions.insertAdjacentElement('afterend', mount);
      else toolbar.appendChild(mount);
      mount.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('.exam-alt-variant-btn') : null;
        if (!btn || !mount.contains(btn)) return;
        e.preventDefault();
        var pick = btn.getAttribute('data-jm-global-alt');
        if (pick == null || pick === '') return;
        if (pick === '0') {
          setExamGlobalAltIndex(0);
          return;
        }
        var cur = getExamGlobalAltIndex();
        if (cur === pick) setExamGlobalAltIndex(0);
        else setExamGlobalAltIndex(pick);
      });
    }
    return mount;
  }

  function refreshExamAltVariantToolbarActiveState() {
    var mount = document.getElementById('examAltVariantToolbar');
    if (!mount) return;
    var cur = getExamGlobalAltIndex();
    mount.querySelectorAll('.exam-alt-variant-btn').forEach(function (btn) {
      var on = btn.getAttribute('data-jm-global-alt') === cur;
      btn.classList.toggle('exam-alt-variant-btn--active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function refreshExamAltVariantToolbar() {
    var mount = ensureExamAltVariantToolbarMount();
    if (!mount) return;
    var nums = collectExamAltVariantNumbers();
    if (!nums.length) {
      mount.innerHTML = '';
      mount.hidden = true;
      setExamGlobalAltIndex(0);
      return;
    }
    mount.hidden = false;
    var cur = getExamGlobalAltIndex();
    var html = '<div class="exam-alt-variant-duo" role="group" aria-label="Formulierungsvarianten">';
    html +=
      '<button type="button" class="exam-alt-variant-btn exam-alt-variant-btn--original' +
      (cur === '0' ? ' exam-alt-variant-btn--active' : '') +
      '" data-jm-global-alt="0" aria-pressed="' +
      (cur === '0' ? 'true' : 'false') +
      '" title="Original">O</button>';
    nums.forEach(function (n) {
      html +=
        '<button type="button" class="exam-alt-variant-btn' +
        (cur === String(n) ? ' exam-alt-variant-btn--active' : '') +
        '" data-jm-global-alt="' +
        n +
        '" aria-pressed="' +
        (cur === String(n) ? 'true' : 'false') +
        '">A' +
        n +
        '</button>';
    });
    html += '</div>';
    mount.innerHTML = html;
  }

  function syncExamAltGroupsToGlobal(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var idx = getExamGlobalAltIndex();
    scope.querySelectorAll('.exam-dollar-alt-group').forEach(function (groupEl) {
      var use = idx;
      if (use !== '0' && !groupEl.querySelector('.exam-dollar-alt-view[data-jm-alt-view="' + use + '"]')) {
        use = '0';
      }
      setExamAltGroupActive(groupEl, use);
    });
  }

  function wireExamAltGroups(root) {
    syncExamAltGroupsToGlobal(root);
    refreshExamAltVariantToolbar();
  }

  function wireWfExclusiveCheckboxes(taskEl) {
    taskEl.querySelectorAll('.exam-dollar-wf-row').forEach(function (tr) {
      if (tr.__jmWfWired) return;
      tr.__jmWfWired = true;
      var pairRoots = tr.querySelectorAll('.exam-dollar-wf-alt-pair');
      if (!pairRoots.length) pairRoots = [tr];
      pairRoots.forEach(function (container) {
        if (container.__jmWfPairWired) return;
        container.__jmWfPairWired = true;
        var w = container.querySelector('.exam-dollar-wf-input[data-jm-wf-col="w"]');
        var f = container.querySelector('.exam-dollar-wf-input[data-jm-wf-col="f"]');
        if (!w || !f) return;
        function onChange(changed) {
          if (changed.checked) {
            var other = changed === w ? f : w;
            other.checked = false;
          }
          maybeUpdateLivePointsDisplay();
        }
        w.addEventListener('change', function () {
          onChange(w);
        });
        f.addEventListener('change', function () {
          onChange(f);
        });
      });
    });
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
      var compactM = parseCompactStyleSpan(innerTrim);
      var mathM =
        innerTrim.match(/^L\s+([\s\S]*?)\s+L$/i) || innerTrim.match(/^M\s+([\s\S]*?)\s+M$/i);
      var codeBoxM = innerTrim.match(/^KK\s+([\s\S]+)\s+KK$/);
      var codeM =
        innerTrim.match(/^K\s+([\s\S]+)\s+K$/) || innerTrim.match(/^N\s+([\s\S]+)\s+N$/);
      var boldM = innerTrim.match(/^B\s+([\s\S]+)\s+B$/i);
      var italicM = innerTrim.match(/^I\s+([\s\S]+)\s+I$/i);
      var underM = innerTrim.match(/^U\s+([\s\S]+)\s+U$/i);
      var colorM = parseColorSpan(innerTrim);
      var bildM = innerTrim.match(/^Bild\s+(.+)$/i);
      if (compactM) {
        out += wrapRenderedCompactStyles(
          renderInline(compactM.text, idGen),
          compactM.styles,
          compactM.css,
        );
      } else if (mathM) {
        out += renderMathHtml(mathM[1], idGen);
      } else if (codeBoxM) {
        out += renderCodeHtml(codeBoxM[1], idGen, true);
      } else if (codeM) {
        out += renderCodeHtml(codeM[1], idGen, innerTrim.charAt(0) === 'N');
      } else if (boldM) {
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
        var bildCmd = parseBildCommand(innerTrim);
        var rawAfterBild = String(bildM[1] || '').trim();
        var imgOpts;
        if (bildCmd && rawAfterBild !== bildCmd.filename) {
          imgOpts = {
            end: tok.end,
            pct: bildCmd.pct,
            align: bildCmd.align,
            wrap: bildCmd.wrap,
            frame: bildCmd.frame,
          };
        } else {
          imgOpts = tryParseImageOptionsAfter(s, tok.end);
          if (bildCmd) {
            imgOpts.pct = imgOpts.pct != null ? imgOpts.pct : bildCmd.pct;
            imgOpts.align = imgOpts.align != null ? imgOpts.align : bildCmd.align;
            imgOpts.wrap = imgOpts.wrap || bildCmd.wrap;
            imgOpts.frame = imgOpts.frame != null ? imgOpts.frame : bildCmd.frame;
          }
        }
        var imgEnd = imgOpts.end;
        var imgHtml = renderExamImageHtml(
          bildCmd || { filename: rawAfterBild },
          imgOpts,
          idGen,
        );
        if (imgHtml) {
          out += imgHtml;
        } else {
          out += escapeHtml(s.slice(i, imgEnd));
        }
        i = imgEnd;
        continue;
      } else if (isImageSuffixOrphanToken(innerTrim)) {
        i = tok.end;
        continue;
      } else if (/^e$/i.test(innerTrim)) {
        out +=
          '<span class="exam-dollar-e-hint teacher-only" title="Zeilenumbruch ($e$) — kein Enter in der Quelle">$e$</span>' +
          '<br class="exam-dollar-soft-break">';
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
        } else if (/^a\d+$/i.test(innerTrim)) {
          /* Block-Marker $a1$ — nur eigene Zeile in renderBlockToHtml */
        } else if (/^Paare\s/i.test(innerTrim)) {
          /* Block $Paare … Paare$ in renderBlockToHtml */
        } else if (/^wwf$/i.test(innerTrim) || /^wff$/i.test(innerTrim) || /^wf$/i.test(innerTrim)) {
          /* Zeilenende in Wahr/Falsch-Tabelle */
        } else if (/^CC$/i.test(innerTrim)) {
          out += renderChoiceCheckbox(true, idGen);
        } else if (/^C$/i.test(innerTrim)) {
          out += renderChoiceCheckbox(false, idGen);
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

  function isPlaceholderSolutionText(text) {
    var t = String(text || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!t) return true;
    if (/^[a-z]\)\s*[.…\-–—\s]*$/i.test(t)) return true;
    if (/^[.…\-–—]+$/.test(t)) return true;
    return false;
  }

  function syncSolutionElement(solEl, parsed, idGen) {
    if (!solEl) return;
    var solBody = String(parsed.solution || '').trim();
    if (!solBody || isPlaceholderSolutionText(solBody)) {
      solEl.innerHTML = '';
      solEl.setAttribute('hidden', 'hidden');
      solEl.classList.add('solution--empty');
      return;
    }
    var solHtml = renderBlockToHtml(solBody, idGen);
    if (!solHtml) {
      solEl.innerHTML = '';
      solEl.setAttribute('hidden', 'hidden');
      solEl.classList.add('solution--empty');
      return;
    }
    solEl.removeAttribute('hidden');
    solEl.classList.remove('solution--empty');
    solEl.innerHTML = '<h4>Musterlösung:</h4>' + solHtml;
    applyExamImageNaturalSizing(solEl);
    typesetExamMathInRoot(solEl);
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
    rendered.innerHTML = html || '';
    applyExamImageNaturalSizing(rendered);
    typesetExamMathInRoot(rendered);

    var content = taskEl.querySelector('.task-content');
    var solEl = taskEl.querySelector('.solution');
    if (!solEl && content) {
      solEl = document.createElement('div');
      solEl.className = 'solution';
      content.appendChild(solEl);
    }
    if (solEl) {
      syncSolutionElement(solEl, parsed, idGen);
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
    wireWfExclusiveCheckboxes(taskEl);
    wireExamPaareMatch(taskEl);
    wireExamAltGroups(taskEl);
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
      taskEl.querySelectorAll('.exam-dollar-live-edit-wrap').forEach(function (wrap, idx) {
        if (idx > 0 && wrap.parentNode) wrap.parentNode.removeChild(wrap);
      });
      var contentClone = taskEl.querySelector('.task-content');
      if (contentClone) dedupeExamLiveEditInContent(contentClone);
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
        '<div class="exam-dollar-live-edit teacher-only" contenteditable="plaintext-only" spellcheck="true" role="textbox" aria-multiline="true"></div>' +
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

  function examLiveCmdHtml(s) {
    return '<span class="exam-live-cmd">' + escapeHtml(s) + '</span>';
  }

  function examLiveAltInlineHtml(num, s) {
    return (
      '<span class="exam-live-alt-inline exam-live-alt-' +
      num +
      '">' +
      escapeHtml(s) +
      '</span>'
    );
  }

  function highlightLiveEditDollarToken(text, start) {
    var tok = consumeDollarToken(text, start);
    if (!tok) return null;
    var slice = text.slice(start, tok.end);
    var inner = tok.inner;
    var lm = inner.match(/^([LM])\s+([\s\S]*)\s+\1$/i);
    if (lm) {
      var letter = lm[1];
      var parsed = parseDollarInlineAltContent(lm[2]);
      if (parsed && Object.keys(parsed.alts).length) {
        var html = examLiveCmdHtml('$' + letter + ' ');
        html += escapeHtml(parsed.base);
        var nums = Object.keys(parsed.alts)
          .map(function (n) {
            return parseInt(n, 10);
          })
          .filter(function (n) {
            return n > 0;
          })
          .sort(function (a, b) {
            return a - b;
          });
        nums.forEach(function (n) {
          var markers = '';
          var d;
          for (d = 0; d <= n; d += 1) markers += '$';
          html += examLiveCmdHtml(markers);
          html += examLiveAltInlineHtml(n, parsed.alts[n]);
        });
        html += examLiveCmdHtml(' ' + letter + '$');
        return { html: html, end: tok.end };
      }
    }
    return { html: examLiveCmdHtml(slice), end: tok.end };
  }

  function highlightWfModeSuffixHtml(suffix, wf) {
    if (!wf || !wf.alts || !Object.keys(wf.alts).length) {
      return highlightLiveEditLineCommands(suffix);
    }
    var lead = String(normalizeWfLineSuffix(suffix)).match(/^(\s*)/);
    var html = escapeHtml(lead ? lead[1] : '');
    html += examLiveCmdHtml('$' + wf.mode);
    var nums = Object.keys(wf.alts)
      .map(function (n) {
        return parseInt(n, 10);
      })
      .filter(function (n) {
        return n > 0;
      })
      .sort(function (a, b) {
        return a - b;
      });
    nums.forEach(function (n) {
      var markers = '';
      var d;
      for (d = 0; d <= n; d += 1) markers += '$';
      html += examLiveCmdHtml(markers);
      html += examLiveAltInlineHtml(n, wf.alts[n]);
    });
    return html;
  }

  function highlightLiveEditLineContent(line) {
    var suffixAt = findWfModeSuffixStart(line);
    if (suffixAt >= 0) {
      var wf = parseWfLine(line);
      if (wf) {
        return (
          highlightLiveEditLineCommands(line.slice(0, suffixAt)) +
          highlightWfModeSuffixHtml(line.slice(suffixAt), wf)
        );
      }
    }
    return highlightLiveEditLineCommands(line);
  }

  function highlightLiveEditLineCommands(line) {
    var out = '';
    var i = 0;
    var s = String(line || '');
    while (i < s.length) {
      if (s[i] === '$') {
        var hit = highlightLiveEditDollarToken(s, i);
        if (hit && hit.end > i) {
          out += hit.html;
          i = hit.end;
          continue;
        }
      }
      out += escapeHtml(s.charAt(i));
      i += 1;
    }
    return out;
  }

  function highlightLiveEditAltMarkerLine(line, altM) {
    var re = new RegExp('^(\\s*)(\\$a' + altM.num + '\\$)(\\s*)([\\s\\S]*)$', 'i');
    var m = String(line || '').match(re);
    if (!m) return highlightLiveEditLineCommands(line);
    var out = escapeHtml(m[1]) + examLiveCmdHtml(m[2]);
    if (m[4]) {
      out +=
        escapeHtml(m[3]) +
        '<span class="exam-live-alt-block exam-live-alt-' +
        altM.num +
        '">' +
        highlightLiveEditLineContent(m[4]) +
        '</span>';
    }
    return out;
  }

  function highlightLiveEditPlainText(text) {
    var lines = trimLiveEditTrailingBlankLines(text).split('\n');
    var blockAlt = 0;
    var htmlLines = [];
    var li;
    for (li = 0; li < lines.length; li += 1) {
      var line = lines[li];
      var altM = parseAltMarkerLine(line);
      if (altM) {
        blockAlt = altM.num;
        htmlLines.push(
          altM.inline
            ? highlightLiveEditAltMarkerLine(line, altM)
            : highlightLiveEditLineContent(line),
        );
        continue;
      }
      if (blockAlt && line.trim()) {
        htmlLines.push(
          '<span class="exam-live-alt-block exam-live-alt-' +
            blockAlt +
            '">' +
            highlightLiveEditLineContent(line) +
            '</span>',
        );
        continue;
      }
      if (!line.trim()) blockAlt = 0;
      htmlLines.push(highlightLiveEditLineContent(line));
    }
    return htmlLines.join('\n');
  }

  function ensureLiveEditHighlightWrap(live) {
    if (!live) return null;
    var wrap = live.parentNode;
    if (wrap && wrap.classList && wrap.classList.contains('exam-dollar-live-edit-wrap')) {
      return wrap.querySelector('.exam-dollar-live-edit-highlight');
    }
    wrap = document.createElement('div');
    wrap.className = 'exam-dollar-live-edit-wrap teacher-only';
    var hi = document.createElement('div');
    hi.className = 'exam-dollar-live-edit-highlight';
    hi.setAttribute('aria-hidden', 'true');
    live.parentNode.insertBefore(wrap, live);
    wrap.appendChild(hi);
    wrap.appendChild(live);
    return hi;
  }

  function fitLiveEditWrapToContent(live) {
    var wrap = live && live.closest('.exam-dollar-live-edit-wrap');
    if (!wrap) return;
    var hi = wrap.querySelector('.exam-dollar-live-edit-highlight');
    if (!hi) return;
    function apply() {
      wrap.style.height = 'auto';
      hi.style.height = 'auto';
      live.style.height = 'auto';
      var contentH = hi.offsetHeight;
      if (contentH < 1) contentH = Math.ceil(14 * 1.32);
      var padY = 4;
      wrap.style.height = contentH + padY + 'px';
      live.style.height = contentH + 'px';
    }
    apply();
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(apply);
    }
  }

  function refreshLiveEditHighlight(live) {
    if (!live) return;
    var hi = ensureLiveEditHighlightWrap(live);
    if (!hi) return;
    var plain = trimLiveEditTrailingBlankLines(liveEditPlainTextFromEl(live));
    hi.innerHTML = highlightLiveEditPlainText(plain);
    hi.scrollTop = live.scrollTop;
    hi.scrollLeft = live.scrollLeft;
    fitLiveEditWrapToContent(live);
  }

  function syncLiveEditFromSource(taskEl) {
    var src = taskEl.querySelector('.exam-dollar-source');
    var live = taskEl.querySelector('.exam-dollar-live-edit');
    if (!src || !live) return;
    var meta = parseTaskSource(src.value);
    live.textContent = liveEditTextFromMeta(meta);
    refreshLiveEditHighlight(live);
  }

  function insertTextIntoLiveEdit(taskEl, text) {
    var live = taskEl.querySelector('.exam-dollar-live-edit');
    var src = taskEl.querySelector('.exam-dollar-source');
    if (!live || !src) return;
    var cur = liveEditPlainTextFromEl(live);
    var sep = cur && !/\n$/.test(cur) ? '\n' : '';
    live.textContent = cur + sep + text;
    live.dataset.jmTouched = '1';
    refreshLiveEditHighlight(live);
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
    var full = liveEditPlainTextFromEl(live);
    var inner = offsets.text.trim();
    if (!inner) return;
    var wrapped = '$' + colorName + ' ' + inner + ' ' + colorName + '$';
    live.textContent = full.slice(0, offsets.start) + wrapped + full.slice(offsets.end);
    live.dataset.jmTouched = '1';
    refreshLiveEditHighlight(live);
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
    var inner = taskEl.querySelector('.exam-dollar-task-author-inner');
    var host = live.closest('.exam-dollar-live-edit-wrap') || live;
    if (inner) {
      if (host.parentNode === inner) {
        inner.insertBefore(bar, host);
      } else {
        inner.insertBefore(bar, inner.firstChild);
      }
    } else {
      host.parentNode.insertBefore(bar, host);
    }
  }

  function normalizeEmptyDollarWraps(text) {
    var t = String(text || '');
    ['KK', 'K', 'B', 'I', 'U', 'L'].forEach(function (mk) {
      var re = new RegExp(
        '\\$' + escapeRegExp(mk) + '\\s+([\\s\\S]*?)\\s+' + escapeRegExp(mk) + '\\$',
        'gi',
      );
      t = t.replace(re, function (m, inner) {
        return String(inner || '').trim() ? m : '';
      });
    });
    return t;
  }

  function wrapLiveEditDollarMarkup(live, marker) {
    var mk = String(marker || '');
    if (!mk) return false;
    var now = Date.now();
    if (live.__jmWrapAt && now - live.__jmWrapAt < 400) return false;
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return false;
    var range = sel.getRangeAt(0);
    if (!live.contains(range.commonAncestorContainer)) return false;
    var selected = range.toString();
    if (!selected.length) return false;
    var inner = selected.trim();
    if (!inner) return false;
    var fullWrap = new RegExp(
      '^\\$' + escapeRegExp(mk) + '\\s+([\\s\\S]+)\\s+' + escapeRegExp(mk) + '\\$$',
      'i',
    );
    if (fullWrap.test(inner)) return false;
    var wrapped = '$' + mk + ' ' + inner + ' ' + mk + '$';
    range.deleteContents();
    var node = document.createTextNode(wrapped);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    live.__jmWrapAt = now;
    live.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  function insertLiveEditToken(live, token) {
    live.focus();
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return false;
    var range = sel.getRangeAt(0);
    if (!live.contains(range.commonAncestorContainer)) return false;
    range.deleteContents();
    var node = document.createTextNode(token);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    live.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  function wireLiveEditFormattingShortcuts(live) {
    if (live.__jmFmtKeysWired) return;
    live.__jmFmtKeysWired = true;
    live.addEventListener(
      'beforeinput',
      function (e) {
        var t = String(e.inputType || '');
        if (
          t === 'formatBold' ||
          t === 'formatItalic' ||
          t === 'formatUnderline' ||
          t === 'formatStrikeThrough'
        ) {
          e.preventDefault();
        }
      },
      true,
    );
    live.addEventListener(
      'keydown',
      function (e) {
        if (e.key === 'Enter' && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          e.stopImmediatePropagation();
          insertLiveEditToken(live, '$e$');
          return;
        }
        if (!e.metaKey && !e.ctrlKey) return;
        if (e.altKey) return;
        var marker = null;
        if (e.key === 'b' || e.key === 'B') marker = 'B';
        else if (e.key === 'i' || e.key === 'I') marker = 'I';
        else if (e.key === 'u' || e.key === 'U') marker = 'U';
        else if (e.key === 'l' || e.key === 'L') marker = 'L';
        else if ((e.key === 'k' || e.key === 'K') && e.shiftKey) marker = 'KK';
        else if (e.key === 'k' || e.key === 'K') marker = 'K';
        if (!marker) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        wrapLiveEditDollarMarkup(live, marker);
      },
      true,
    );
  }

  function wireLiveEdit(taskEl) {
    var live = taskEl.querySelector('.exam-dollar-live-edit');
    var src = taskEl.querySelector('.exam-dollar-source');
    if (!live || !src || live.__jmLiveWired) return;
    live.__jmLiveWired = true;
    live.setAttribute('contenteditable', 'plaintext-only');
    ensureLiveEditHighlightWrap(live);
    syncLiveEditFromSource(taskEl);
    wireLiveEditFormattingShortcuts(live);
    var hi = live.parentNode.querySelector('.exam-dollar-live-edit-highlight');
    if (hi) {
      live.addEventListener('scroll', function () {
        hi.scrollTop = live.scrollTop;
        hi.scrollLeft = live.scrollLeft;
      });
    }
    var wrap = live.parentNode;
    if (wrap && wrap.classList && wrap.classList.contains('exam-dollar-live-edit-wrap')) {
      live.addEventListener('focus', function () {
        refreshLiveEditHighlight(live);
      });
    }
    var debounce;
    live.addEventListener('input', function () {
      live.dataset.jmTouched = '1';
      refreshLiveEditHighlight(live);
      syncSourceFromLiveEdit(taskEl);
      clearTimeout(debounce);
      debounce = setTimeout(function () {
        applySourceToTask(taskEl, src.value);
        scheduleSave();
      }, 80);
    });
    live.addEventListener('blur', function () {
      var trimmed = trimLiveEditTrailingBlankLines(liveEditPlainTextFromEl(live));
      if (trimmed !== liveEditPlainTextFromEl(live)) {
        live.textContent = trimmed;
        refreshLiveEditHighlight(live);
      }
      syncSourceFromLiveEdit(taskEl);
      applySourceToTask(taskEl, src.value);
      scheduleSave({ immediate: true });
    });
    ensureTaskAuthorPanel(taskEl);
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

  function dedupeExamLiveEditInContent(content) {
    if (!content) return null;
    var lives = content.querySelectorAll('.exam-dollar-live-edit');
    if (!lives.length) return null;
    var keep = lives[0];
    for (var i = 1; i < lives.length; i += 1) {
      var extra = lives[i];
      var wrap = extra.closest('.exam-dollar-live-edit-wrap');
      if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
      else if (extra.parentNode) extra.parentNode.removeChild(extra);
    }
    var wraps = content.querySelectorAll('.exam-dollar-live-edit-wrap');
    for (var w = 1; w < wraps.length; w += 1) {
      if (wraps[w].parentNode) wraps[w].parentNode.removeChild(wraps[w]);
    }
    content.querySelectorAll('.exam-dollar-live-edit-wrap').forEach(function (wrap) {
      if (!wrap.querySelector('.exam-dollar-live-edit') && wrap.parentNode) {
        wrap.parentNode.removeChild(wrap);
      }
    });
    return content.querySelector('.exam-dollar-live-edit') || keep;
  }

  function ensureTaskStructure(taskEl) {
    var content = taskEl.querySelector('.task-content');
    if (!content) return;
    normalizeTaskSourceTextareas(taskEl);
    dedupeExamLiveEditInContent(content);
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
      live.setAttribute('contenteditable', 'plaintext-only');
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
      ':root{--jm-exam-student-color:#1565c0;--jm-exam-student-color-dark:#0d47a1;--jm-exam-student-focus:rgba(21,101,192,.35)}' +
      '.exam-dollar-source{display:none!important}' +
      '.teacher-mode .task-content{display:flex;flex-direction:column}' +
      '.teacher-mode .exam-dollar-rendered{order:1}' +
      '.teacher-mode .exam-dollar-task-author{order:2;margin:0 0 8px;border:1px dashed #e0e0e0;border-radius:6px;background:#fff}' +
      '.teacher-mode .exam-dollar-task-author-summary{cursor:pointer;font-size:11px;font-weight:700;color:#555;padding:6px 8px;list-style:none}' +
      '.teacher-mode .exam-dollar-task-author-summary::-webkit-details-marker{display:none}' +
      '.teacher-mode .exam-dollar-task-author-inner{padding:0 6px 4px}' +
      '.teacher-mode .task-content .solution{order:3}' +
      '.exam-dollar-rendered{margin-bottom:6px;font-family:Arial,sans-serif;font-size:14px;line-height:1.55}' +
      '.teacher-mode .task-content .exam-dollar-rendered{display:block!important;margin:0 0 8px;padding:8px 6px;border:1px dashed #ddd;border-radius:6px;background:#fafafa}' +
      '.exam-dollar-color-bar{display:flex;gap:5px;flex-wrap:wrap;margin:0 0 6px}' +
      '.exam-dollar-color-swatch{width:20px;height:20px;border:1px solid rgba(0,0,0,.2);border-radius:4px;cursor:pointer;padding:0}' +
      '.exam-dollar-color-swatch:hover{transform:scale(1.08)}' +
      '.teacher-mode .exam-dollar-live-edit-wrap{position:relative;display:block;width:100%;min-height:0;margin:0;padding:2px 4px;border-radius:3px;background:#e3f2fd;border:1px solid #bbdefb;overflow:hidden;box-sizing:border-box}' +
      '.teacher-mode .exam-dollar-live-edit-wrap:focus-within{box-shadow:0 0 0 2px rgba(225,6,0,0.25);border-color:#90caf9}' +
      '.teacher-mode .exam-dollar-live-edit-highlight,.teacher-mode .exam-dollar-live-edit-wrap .exam-dollar-live-edit{display:block;min-height:0!important;padding:0;margin:0;line-height:1.32;font-family:Arial,sans-serif;font-size:14px;outline:none;border-radius:0;white-space:pre-wrap;word-break:break-word;box-sizing:border-box;border:none}' +
      '.teacher-mode .exam-dollar-live-edit-highlight{position:relative;z-index:0;pointer-events:none;color:#222;width:100%;background:transparent;overflow:visible}' +
      '.teacher-mode .exam-dollar-live-edit-wrap .exam-dollar-live-edit{position:absolute!important;top:2px;left:4px;right:4px;bottom:auto!important;z-index:1;width:auto;min-height:0!important;max-height:none;overflow:auto;resize:none;background:transparent;color:transparent;-webkit-text-fill-color:transparent;caret-color:#222}' +
      '.teacher-mode .exam-dollar-live-edit-wrap .exam-dollar-live-edit::selection{background:rgba(21,101,192,.22);-webkit-text-fill-color:transparent}' +
      '.exam-dollar-wf-alt-pair{display:grid;grid-template-columns:4.5em 4.5em;width:100%;max-width:9.5em;margin:0 auto}' +
      '.exam-dollar-wf-alt-cell{padding:4px 6px!important;vertical-align:middle!important}' +
      '.exam-dollar-wf-alt-group{width:100%}' +
      '.exam-live-cmd{color:#9e9e9e}' +
      '.exam-live-alt-inline.exam-live-alt-1,.exam-live-alt-block.exam-live-alt-1{background:rgba(186,104,200,.14);box-shadow:inset 0 -2px 0 rgba(142,36,170,.35);border-radius:2px}' +
      '.exam-live-alt-inline.exam-live-alt-2,.exam-live-alt-block.exam-live-alt-2{background:rgba(244,143,177,.2);box-shadow:inset 0 -2px 0 rgba(236,64,122,.4);border-radius:2px}' +
      '.exam-live-alt-inline.exam-live-alt-3,.exam-live-alt-block.exam-live-alt-3{background:rgba(206,147,216,.18);box-shadow:inset 0 -2px 0 rgba(171,71,188,.35);border-radius:2px}' +
      '.exam-dollar-live-edit.exam-dollar-drag-over,.exam-dollar-compose-input.exam-dollar-drag-over{box-shadow:0 0 0 2px rgba(21,101,192,.45)}' +
      '.exam-dollar-rendered{line-height:1.55}' +
      '.exam-dollar-soft-break{line-height:1.55}' +
      '.exam-dollar-e-hint{display:none;font-family:Consolas,Monaco,monospace;font-size:9px;line-height:1.2;color:#757575;background:#f5f5f5;border:1px dashed #bdbdbd;border-radius:3px;padding:0 4px;margin:0 3px 0 0;vertical-align:baseline;white-space:nowrap;user-select:none}' +
      '.teacher-mode .exam-dollar-e-hint{display:inline}' +
      '.exam-dollar-flow{line-height:1.55;margin:0 0 0.5em}' +
      '.exam-dollar-flow-side--wrap{width:100%;margin:0 0 0.35em;line-height:1.55;overflow:hidden}' +
      '.exam-dollar-flow-side--wrap .exam-dollar-side-text{min-width:0}' +
      '.exam-dollar-flow-side--wrap .exam-dollar-img-wrap--flow-right{float:right;margin:0 0 8px 14px;max-width:min(46%,280px)}' +
      '.exam-dollar-flow-side--wrap .exam-dollar-img-wrap--left.exam-dollar-img-wrap--flow{float:left;margin:0 14px 8px 0;max-width:min(46%,280px)}' +
      '.exam-dollar-flow-side--wrap .exam-dollar-img-wrap--wrap-block{display:block;float:none;clear:both;margin:10px auto;text-align:center;max-width:100%}' +
      '.exam-dollar-flow-side--wrap .exam-dollar-img-wrap--flow{max-width:min(46%,280px)}' +
      '.aids-row--rules{flex-direction:column!important;align-items:stretch!important;gap:4px!important}' +
      '.aids-key--rules{display:block;width:100%}' +
      '.aids-val-rules{width:100%!important;flex:none!important}' +
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
      'input.exam-dollar-gap{border:1px solid #ccc;background:#fff;color:var(--jm-exam-student-color);font-weight:600;margin:5px 0;caret-color:var(--jm-exam-student-color)}' +
      'textarea.exam-dollar-area,.exam-paper .item input[type="text"],.exam-paper .item textarea{color:var(--jm-exam-student-color);font-weight:600;caret-color:var(--jm-exam-student-color)}' +
      'input.exam-dollar-gap:focus,textarea.exam-dollar-area:focus,.exam-paper .item input[type="text"]:focus,.exam-paper .item textarea:focus{border-color:var(--jm-exam-student-color);outline:2px solid var(--jm-exam-student-focus);outline-offset:0}' +
      '.exam-paper input[type="radio"]{accent-color:var(--jm-exam-student-color)}' +
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
      '.exam-dollar-choice-list{list-style:none;margin:8px 0 10px;padding:0}' +
      '.exam-dollar-choice-list-item{display:flex;align-items:flex-start;gap:8px;margin:0 0 8px;line-height:1.55}' +
      '.exam-dollar-choice-list-item:last-child{margin-bottom:0}' +
      '.exam-dollar-choice-text{flex:1;min-width:0}' +
      '.aids-box{width:100%;max-width:none;box-sizing:border-box}' +
      '.aids-general-rules-list{margin:0;padding:0 0 0 1.35em;list-style:disc outside}' +
      '.aids-general-rules-list li{margin:0 0 5px;padding:0;line-height:1.45;display:list-item}' +
      '.aids-general-rules-list li:last-child{margin-bottom:0}' +
      '.exam-dollar-choice{display:inline-flex;align-items:center;margin:0 6px 0 2px;vertical-align:middle;cursor:pointer;flex-shrink:0}' +
      '.exam-dollar-choice-input{position:absolute;opacity:0;width:0;height:0}' +
      '.exam-dollar-choice-box{display:inline-block;width:16px;height:16px;border:2px solid #333;border-radius:3px;background:#fff;vertical-align:middle}' +
      '.exam-dollar-choice-input:checked + .exam-dollar-choice-box{background:var(--jm-exam-student-color);border-color:var(--jm-exam-student-color-dark);box-shadow:inset 0 0 0 2px #fff}' +
      'body.show-solutions .exam-dollar-choice-correct .exam-dollar-choice-box{border-color:#2e7d32}' +
      'body.show-solutions .teacher-mode .exam-dollar-choice-correct .exam-dollar-choice-box{outline:2px solid #81c784}' +
      'body.show-solutions .exam-dollar-choice-input[data-correct="1"].exam-choice-solution-visible:checked + .exam-dollar-choice-box{background:#e8f5e9;border-color:#2e7d32;box-shadow:inset 0 0 0 2px #fff}' +
      'body.show-solutions .exam-dollar-choice-box.exam-dollar-choice-box--solution-mark{background:#e8f5e9;border-color:#2e7d32;box-shadow:inset 0 0 0 2px #fff}' +
      'body.show-solutions .exam-dollar-choice-box.exam-dollar-choice-box--solution-mark::after{content:"✓";display:block;font-size:13px;line-height:12px;font-weight:800;color:#2e7d32;text-align:center}' +
      'body.show-solutions .solution--empty,body.show-solutions .solution[hidden],body.show-solutions .solution:empty{display:none!important}' +
      'body.show-solutions .exam-dollar-choice-neutral .exam-dollar-choice-box{border-color:#333}' +
      '.exam-dollar-gap{display:inline-block;vertical-align:baseline;width:auto!important;min-width:3ch!important;max-width:100%;text-align:left;padding:2px 5px;box-sizing:content-box;margin:5px 0}' +
      '.exam-dollar-code{font-family:Consolas,Monaco,"Courier New",monospace;font-size:0.9em;white-space:pre-wrap;word-break:break-word}' +
      '.exam-dollar-code--inline{background:none;border:none;padding:0;margin:0;color:inherit}' +
      '.exam-dollar-code--box{background:#f4f4f4;border:1px solid #d8d8d8;border-radius:4px;padding:1px 6px;color:#1a1a1a}' +
      '.exam-dollar-math-prose{font-size:inherit;color:inherit;font-weight:normal;white-space:normal}' +
      '.exam-dollar-math-latex{display:inline;vertical-align:baseline;margin:0 1px}' +
      '.exam-dollar-math-latex .katex{font-size:1.1em;color:inherit;font-weight:normal}' +
      '.exam-dollar-math-fallback{font-family:inherit;font-style:normal;font-size:1.1em;color:inherit}' +
      '.exam-dollar-biggap{margin:5px 0}' +
      '.exam-dollar-area{width:100%;min-height:72px;margin:5px 0;box-sizing:border-box}' +
      '.exam-dollar-hint{font-size:10px;color:#888;margin-top:4px}' +
      '.exam-dollar-wf{width:100%;border-collapse:collapse;margin:8px 0 12px;font-size:14px}' +
      '.exam-dollar-wf th,.exam-dollar-wf td{border:1px solid #ccc;padding:6px 8px;vertical-align:middle}' +
      '.exam-dollar-wf thead th{background:#f5f5f5;font-weight:700;text-align:center}' +
      '.exam-dollar-wf thead th.exam-dollar-wf-stmt{text-align:left;font-weight:700}' +
      '.exam-dollar-wf td.exam-dollar-wf-stmt{text-align:left;font-weight:normal}' +
      '.exam-dollar-wf-h{width:4.5em}' +
      '.exam-dollar-wf-check{text-align:center}' +
      '.exam-dollar-wf-check .exam-dollar-choice{margin:0 auto}' +
      '.exam-dollar-paare{margin:10px 0 14px}' +
      '.exam-dollar-paare-lead{text-align:center;font-weight:700;font-size:15px;line-height:1.35;margin:0 0 14px;color:#111}' +
      '.exam-dollar-paare-lead-icon{font-size:14px;margin-right:4px;opacity:.85}' +
      '.exam-dollar-paare-pool{display:grid;grid-template-columns:repeat(var(--jm-paare-cols,4),minmax(0,1fr));grid-auto-rows:minmax(4.5em,auto);gap:14px 16px;justify-items:stretch;align-items:stretch;width:100%;padding:4px 2px 8px;box-sizing:border-box}' +
      '.exam-dollar-paare-pool>.exam-dollar-paare-card,.exam-dollar-paare-pool>.exam-dollar-paare-stack{width:100%;min-width:0;box-sizing:border-box}' +
      '.exam-dollar-paare-card{min-width:0;width:100%;min-height:4.5em;height:100%;background:#fff;border:1px solid #e8e8e8;border-radius:4px;box-shadow:0 2px 7px rgba(0,0,0,.1);display:flex;align-items:center;justify-content:center;padding:8px 10px;box-sizing:border-box;cursor:grab;touch-action:none;user-select:none;transition:box-shadow .15s,border-color .15s}' +
      '.exam-dollar-paare-card:active{cursor:grabbing}' +
      '.exam-dollar-paare-card-inner{text-align:center;font-size:15px;line-height:1.3;width:100%;max-width:100%;pointer-events:none;word-break:break-word;overflow-wrap:anywhere}' +
      '.exam-dollar-paare-card--selected{outline:2px solid #1976d2;box-shadow:0 0 0 2px rgba(25,118,210,.25)}' +
      '.exam-dollar-paare-card--over{outline:2px solid #64b5f6}' +
      '.exam-dollar-paare-card--wrong{animation:examDollarPaareShake .4s ease}' +
      '.exam-dollar-paare-card--matched{cursor:default}' +
      '.exam-dollar-paare-stack--correct{position:relative;padding:2px 4px;border-radius:8px;background:rgba(232,245,233,.75)}' +
      '.exam-dollar-paare-stack--correct::after{content:"✓";position:absolute;top:-6px;right:-4px;width:18px;height:18px;border-radius:50%;background:#2e7d32;color:#fff;font-size:12px;font-weight:800;line-height:18px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.2)}' +
      '.exam-dollar-paare-card--correct{border-color:#2e7d32!important;background:#e8f5e9!important;box-shadow:0 2px 6px rgba(0,0,0,.06),inset 0 0 0 2px #fff,0 0 0 2px #66bb6a!important}' +
      '.exam-dollar-paare-card--incorrect{border-color:#c62828!important;background:#ffebee!important;box-shadow:0 2px 6px rgba(0,0,0,.06),inset 0 0 0 2px #fff,0 0 0 2px #ef5350!important}' +
      '.exam-dollar-paare-stack{display:flex;gap:10px;align-items:stretch;width:100%;min-height:4.5em;box-sizing:border-box}' +
      '.exam-dollar-paare-stack .exam-dollar-paare-card{flex:1 1 0;min-width:0;margin:0}' +
      'body.show-solutions .exam-dollar-paare-match--solution .exam-dollar-paare-card{box-shadow:0 2px 7px rgba(0,0,0,.08),inset 0 0 0 2px rgba(46,125,50,.45)}' +
      '@keyframes examDollarPaareShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}' +
      'body.show-solutions .exam-dollar-wf-row .exam-dollar-choice-correct .exam-dollar-choice-box{border-color:#2e7d32}' +
      '.exam-dollar-alt-group{margin:8px 0 10px}' +
      '.exam-dollar-alt-view--hidden{display:none!important}' +
      '.teacher-mode .exam-dollar-math-alt-group .exam-dollar-alt-view:not(.exam-dollar-alt-view--hidden){display:inline-block;max-width:100%}' +
      '.teacher-mode .exam-dollar-wf-alt-group .exam-dollar-alt-view:not(.exam-dollar-alt-view--hidden){display:block}' +
      '.teacher-mode .solution .exam-dollar-alt-group[data-jm-alt-active="1"] .exam-dollar-alt-view[data-jm-alt-view="1"]:not(.exam-dollar-alt-view--hidden),.teacher-mode .exam-dollar-alt-group[data-jm-alt-active="1"] .exam-dollar-alt-view[data-jm-alt-view="1"]:not(.exam-dollar-alt-view--hidden){outline:2px dashed #8e24aa;outline-offset:3px;border-radius:5px;padding:1px 4px;background:rgba(186,104,200,.12)}' +
      '.teacher-mode .solution .exam-dollar-alt-group[data-jm-alt-active="2"] .exam-dollar-alt-view[data-jm-alt-view="2"]:not(.exam-dollar-alt-view--hidden),.teacher-mode .exam-dollar-alt-group[data-jm-alt-active="2"] .exam-dollar-alt-view[data-jm-alt-view="2"]:not(.exam-dollar-alt-view--hidden){outline:2px dashed #ec407a;outline-offset:3px;border-radius:5px;padding:1px 4px;background:rgba(244,143,177,.18)}' +
      '.teacher-mode .solution .exam-dollar-alt-group[data-jm-alt-active="3"] .exam-dollar-alt-view[data-jm-alt-view="3"]:not(.exam-dollar-alt-view--hidden),.teacher-mode .exam-dollar-alt-group[data-jm-alt-active="3"] .exam-dollar-alt-view[data-jm-alt-view="3"]:not(.exam-dollar-alt-view--hidden){outline:2px dashed #ab47bc;outline-offset:3px;border-radius:5px;padding:1px 4px;background:rgba(186,104,200,.1)}' +
      '.exam-alt-variant-toolbar{display:flex;flex-wrap:wrap;justify-content:flex-start;align-items:stretch;width:100%;margin:2px 0 0;padding:0}' +
      '.exam-alt-variant-toolbar[hidden]{display:none!important}' +
      '.exam-alt-variant-duo{display:inline-flex;width:100%;border:1px solid #bdbdbd;border-radius:7px;overflow:hidden;background:#fff;box-sizing:border-box}' +
      '.exam-alt-variant-duo .exam-alt-variant-btn{flex:1;min-width:0;margin:0;border:none;border-radius:0;border-right:1px solid #bdbdbd;padding:6px 8px;font-size:11px;line-height:1.2;background:#fff;color:#333;cursor:pointer;font-family:Arial,sans-serif;text-align:center;white-space:nowrap}' +
      '.exam-alt-variant-duo .exam-alt-variant-btn:last-child{border-right:none}' +
      '.exam-alt-variant-duo .exam-alt-variant-btn:hover{color:#555;background:#fafafa}' +
      '.exam-alt-variant-duo .exam-alt-variant-btn--active{font-weight:700}' +
      '.exam-alt-variant-duo .exam-alt-variant-btn[data-jm-global-alt="0"].exam-alt-variant-btn--active{color:#424242;background:#f5f5f5;box-shadow:inset 0 0 0 1px #9e9e9e}' +
      '.exam-alt-variant-duo .exam-alt-variant-btn[data-jm-global-alt="1"].exam-alt-variant-btn--active{color:#7b1fa2;background:#f3e5f5;box-shadow:inset 0 0 0 1px #8e24aa}' +
      '.exam-alt-variant-duo .exam-alt-variant-btn[data-jm-global-alt="2"].exam-alt-variant-btn--active{color:#c2185b;background:#fce4ec;box-shadow:inset 0 0 0 1px #ec407a}' +
      '.exam-alt-variant-duo .exam-alt-variant-btn[data-jm-global-alt="3"].exam-alt-variant-btn--active{color:#8e24aa;background:#f3e5f5;box-shadow:inset 0 0 0 1px #ab47bc}';
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

  function showTaskRenderFallback(taskEl, sourceText) {
    var rendered = taskEl.querySelector('.exam-dollar-rendered');
    if (!rendered || String(rendered.innerHTML || '').trim()) return;
    rendered.innerHTML =
      '<div class="exam-dollar-render-fallback" style="white-space:pre-wrap;font-family:Arial,sans-serif;font-size:14px;line-height:1.55">' +
      escapeHtml(String(sourceText || '')) +
      '</div>';
  }

  function bootstrapExamTasksFromSource(options) {
    var opts = options || {};
    var isTeacher = !!opts.teacher;
    document.querySelectorAll('.exam-paper .task').forEach(function (taskEl) {
      var src = taskEl.querySelector('.exam-dollar-source');
      if (!src) return;
      var raw = String(src.value || '');
      if (!raw.trim()) return;
      try {
        if (isTeacher) {
          var cleaned = stripDefaultBoilerplateSource(raw);
          var metaClean = parseTaskSource(cleaned);
          var metaRaw = parseTaskSource(raw);
          var useText =
            String(metaClean.body || '').trim() || !String(metaRaw.body || '').trim()
              ? cleaned
              : raw;
          var meta = parseTaskSource(useText);
          src.value = composeTaskSource(
            meta.aufgabeLabel,
            meta.pointsVal,
            meta.body,
            meta.solution,
          );
          syncLiveEditFromSource(taskEl);
        }
        applySourceToTask(taskEl, src.value);
      } catch (bootstrapErr) {
        console.error('exam-dollar task bootstrap failed', bootstrapErr);
        showTaskRenderFallback(taskEl, raw);
      }
      var renderedCheck = taskEl.querySelector('.exam-dollar-rendered');
      if (!renderedCheck || !String(renderedCheck.innerHTML || '').trim()) {
        showTaskRenderFallback(taskEl, raw);
      }
      if (!isTeacher) {
        var rend = taskEl.querySelector('.exam-dollar-rendered');
        if (rend && String(rend.innerHTML || '').trim() && src.parentNode) {
          src.parentNode.removeChild(src);
        }
      }
    });
    refreshExamAltVariantToolbar();
    syncExamAltGroupsToGlobal(document.querySelector('.exam-paper'));
  }

  function scheduleExamTaskBootstrap(isTeacher) {
    bootstrapExamTasksFromSource({ teacher: isTeacher });
    setTimeout(function () {
      bootstrapExamTasksFromSource({ teacher: isTeacher });
    }, 0);
    setTimeout(function () {
      bootstrapExamTasksFromSource({ teacher: isTeacher });
    }, 300);
  }

  function setupExamDollarAuthoring() {
    installExamLiveScoreGuard();
    injectStyles();
    if (typeof setupExamChrome === 'function') setupExamChrome();
    if (typeof global.jmRenderAidsGeneralRulesList === 'function') {
      global.jmRenderAidsGeneralRulesList();
    }
    var rulesForKeys = document.getElementById('aidsGeneralRules');
    if (rulesForKeys && typeof global.jmWireExamDollarFormatKeys === 'function') {
      global.jmWireExamDollarFormatKeys(rulesForKeys);
    }
    typesetExamMathInRoot(document.querySelector('.exam-paper'));
    var isTeacher = localStorage.getItem('teacherId') !== null;
    if (!isTeacher) {
      document.querySelectorAll('.exam-dollar-compose').forEach(function (el) {
        el.parentNode && el.parentNode.removeChild(el);
      });
      document.querySelectorAll('.exam-dollar-live-edit-wrap').forEach(function (el) {
        el.parentNode && el.parentNode.removeChild(el);
      });
      document.querySelectorAll('.exam-dollar-live-edit').forEach(function (el) {
        el.parentNode && el.parentNode.removeChild(el);
      });
      scheduleExamTaskBootstrap(false);
      wireSolutionsInGapsToggle();
      return;
    }
    ensureComposeArea();
    document.querySelectorAll('.exam-paper .task').forEach(function (taskEl) {
      ensureTaskStructure(taskEl);
      ensureDeleteButton(taskEl);
      wireTaskPointsEditing(taskEl);
      wireTaskSource(taskEl);
      wireLiveEdit(taskEl);
      ensureColorBar(taskEl);
      var liveEl = taskEl.querySelector('.exam-dollar-live-edit');
      if (liveEl) wireImageDrop(liveEl, taskEl);
    });
    scheduleExamTaskBootstrap(true);
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
    bindExamPersistence();
    var fp = getExamFilePath();
    if (fp) setSaveStatus('');
    else setSaveStatus('Pfad unbekannt — Speichern nur in der App-Vorschau', true);
  }

  global.jmRenderExamDollarInline = function (text) {
    var seq = 0;
    return renderInline(String(text || ''), function () {
      seq += 1;
      return 'jmAidsInline' + seq;
    });
  };

  global.jmTypesetExamMath = typesetExamMathInRoot;
  global.jmWireExamDollarFormatKeys = wireLiveEditFormattingShortcuts;
  global.jmInsertExamDollarToken = insertLiveEditToken;
  global.jmNormalizeEmptyDollarWraps = normalizeEmptyDollarWraps;
  global.jmWrapExamDollarMarkup = wrapLiveEditDollarMarkup;

  global.jmBootstrapExamTasksFromSource = bootstrapExamTasksFromSource;
  global.setupExamDollarAuthoring = setupExamDollarAuthoring;
})(typeof window !== 'undefined' ? window : globalThis);
