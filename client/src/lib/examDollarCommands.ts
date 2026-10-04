/**
 * Dokumentation der $…$-Autorenbefehle in Prüfungs-HTML (Lehrer-Vorschau).
 * Laufzeit: `client/public/exam-dollar-commands.js` (wird beim Ausliefern eingebunden).
 */
export const EXAM_DOLLAR_COMMANDS_HELP = [
  { syntax: '$Aufgabe 1$', meaning: 'Überschrift „Aufgabe 1“ (eigene Zeile; neue Aufgabe über das orangefarbene Eingabefeld unten)' },
  { syntax: '$5 Punkte$', meaning: 'Punkte in der Aufgabenzeile (als Lehrer auf die Punktezahl klicken zum Ändern)' },
  { syntax: '$C$', meaning: 'Checkbox zum Ankreuzen' },
  { syntax: '$CC$', meaning: 'Checkbox der richtigen Lösung (grün umrandet für Lehrkräfte)' },
  { syntax: '$_$', meaning: 'kleine Lücke im Fließtext' },
  {
    syntax: '$_Lösung1/Lösung2/Lösung3_$',
    meaning: 'Lücke; jeder Teil zwischen / ist eine gültige Lösung (bei „Musterlösungen anzeigen“ grün in der Lücke)',
  },
  { syntax: '$__$', meaning: 'großes Eingabefeld' },
  {
    syntax: '$B Wort B$',
    meaning: 'fett (⌘/Ctrl+B im Textfeld; analog $I … I$ mit ⌘/Ctrl+I, $U … U$ mit ⌘/Ctrl+U)',
  },
  {
    syntax: '$blau $B Wort B$ blau$',
    meaning:
      'Farbe auch um andere $…$-Befehle ($blau$ … $blau$ geht ebenfalls); Punkte: automatisch 1 pro Lücke, bei $C$/$CC$ je 0,5 (± bei Kreuzen)',
  },
  {
    syntax: '$Bild datei.png$ $10%$ $t$ $r5b$',
    meaning:
      'Bild; $10%$ Originalbreite; $t$ Textumfluss (mit $rechts$/$links$); $r5b$ Rahmen 5 px blau (r/g/o/l/s oder rot, gruen, …)',
  },
  { syntax: '$Musterlösung$', meaning: 'ab dieser Zeile: Inhalt für „Musterlösungen anzeigen“ (grüne Box)' },
] as const;
