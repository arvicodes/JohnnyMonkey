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
  { syntax: '$rot Wort rot$', meaning: 'Textfarbe (rot, gruen, blau, orange, lila) oder $#ff0000$ Text $#ff0000$' },
  { syntax: '$Bild datei.png$', meaning: 'Bild aus dem Prüfungsordner (Drag & Drop ins Textfeld)' },
  { syntax: '$Musterlösung$', meaning: 'ab dieser Zeile: Inhalt für „Musterlösungen anzeigen“ (grüne Box)' },
] as const;
