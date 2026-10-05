/**
 * Dokumentation der $…$-Autorenbefehle in Prüfungs-HTML (Lehrer-Vorschau).
 * Laufzeit: `client/public/exam-dollar-commands.js` (wird beim Ausliefern eingebunden).
 */
export const EXAM_DOLLAR_COMMANDS_HELP = [
  { syntax: '$Aufgabe 1$', meaning: 'Überschrift „Aufgabe 1“ (eigene Zeile; neue Aufgabe über das orangefarbene Eingabefeld unten)' },
  { syntax: '$5 Punkte$', meaning: 'Punkte in der Aufgabenzeile (als Lehrer auf die Punktezahl klicken zum Ändern)' },
  { syntax: '$C$', meaning: 'Checkbox vor einer Aussage (eigene Zeile: $C$ Text …; in der Vorschau sichtbares Kästchen)' },
  {
    syntax: '$CC$',
    meaning:
      'Checkbox der richtigen Lösung (eigene Zeile: $CC$ Text …; bei Musterlösungen grün und angekreuzt)',
  },
  { syntax: '$_$', meaning: 'kleine Lücke im Fließtext' },
  {
    syntax: '$_Lösung1/Lösung2/Lösung3_$',
    meaning: 'Lücke; jeder Teil zwischen / ist eine gültige Lösung (bei „Musterlösungen anzeigen“ grün in der Lücke)',
  },
  { syntax: '$__$', meaning: 'großes Eingabefeld' },
  { syntax: '$e$', meaning: 'Zeilenumbruch in einer Quellzeile (kein Enter) — in der Vorschau mit $e$-Hinweis; Schüler sehen nur den Umbruch' },
  {
    syntax: '$L Formel L$',
    meaning:
      'Mathe/Formelschrift (LaTeX, KaTeX) · ⌘/Ctrl+L im Textfeld (älter: $M … M$)',
  },
  {
    syntax: '$K Code K$',
    meaning: 'Code nur Monospace (ohne Box) · ⌘/Ctrl+K',
  },
  {
    syntax: '$KK Code KK$',
    meaning: 'Code mit grauer Box · ⌘/Ctrl+⇧+K (älter: $N … N$ ebenfalls Box)',
  },
  {
    syntax: '$B Wort B$',
    meaning: 'fett (⌘/Ctrl+B im Textfeld; analog $I … I$ mit ⌘/Ctrl+I, $U … U$ mit ⌘/Ctrl+U)',
  },
  {
    syntax: '$bB Wort Bb$',
    meaning:
      'Farbe + Stil in einem Befehl: Kleinbuchstabe b/g/r/o/l = blau/gelb/rot/orange/lila, Großbuchstabe B/I/U = fett/kursiv/unterstrichen; Schließen mit umgekehrter Reihenfolge (Bb, Ig, …). Alternativ: $blau Wort blau$',
  },
  {
    syntax: '$Bild datei.png$ $10%$ $t$',
    meaning:
      'Bildgröße (% der Originalbreite), Textumfluss $t$, Position $r$/$l$, Rahmen $r5b$ — oder kompakt: $Bild datei.png 10% r t r5b$',
  },
  {
    syntax: 'Aussage … $wf$',
    meaning:
      'Wahr/Falsch-Tabelle (3 Spalten): Aussage | Wahr | Falsch mit Checkboxen; $wwf$ = Wahr ist richtig, $wff$ = Falsch ist richtig (je 0,5 Punkte)',
  },
  {
    syntax: '$a1$ / $a2$ …',
    meaning:
      'Formulierungsvariante zur Aussage direkt darüber (eigene Zeile $a1$ …). Buttons „Alternative 1“ usw. stehen links unter „Musterlösungen anzeigen“; Klick ersetzt überall die Hauptfassung durch die Variante (nochmal klicken = Hauptfassung).',
  },
  { syntax: '$Musterlösung$', meaning: 'ab dieser Zeile: Inhalt für „Musterlösungen anzeigen“ (grüne Box)' },
] as const;
