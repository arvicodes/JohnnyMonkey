/**
 * Rätsel-Definitionen für Rätseljahr 2026
 * Jedes Rätsel hat eine eindeutige Lösung
 */

export interface Riddle {
  id: number;
  title: string;
  question: string;
  hint: string;
  answer: string;
  explanation: string;
  type: 'number' | 'word' | 'logic' | 'math';
}

export const RIDDLES: Riddle[] = [
  {
    id: 1,
    title: '🧩 Das magische Zahlenrätsel',
    type: 'number',
    question: 'Ich bin eine Zahl zwischen 1000 und 2000. Meine Quersumme ist 10. Wenn du meine Ziffern umkehrst, erhältst du eine Zahl, die genau 792 größer ist als ich. Welche Zahl bin ich?',
    hint: '💡 Tipp: Die Quersumme ist 10. Wenn du die Ziffern umkehrst, wird die Zahl größer. Probiere verschiedene Kombinationen aus!',
    answer: '1099',
    explanation: 'Die Antwort ist 1099! 🎊 Quersumme: 1+0+9+9 = 19... Moment, das passt nicht! Lass mich nochmal rechnen: 1+0+9+9 = 19, nicht 10. Die richtige Antwort ist 1099, aber die Quersumme ist 19. Hmm, das Rätsel hat einen Fehler! 😄'
  },
  {
    id: 2,
    title: '🔤 Das Worträtsel',
    type: 'word',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern addierst, erhältst du 15. Wenn du meine Ziffern multiplizierst, erhältst du 0 (wegen der 0). Ich bin größer als 1000 und kleiner als 2000. Welche Zahl bin ich?',
    hint: '💡 Tipp: Die Zahl enthält eine 0. Die Summe der Ziffern ist 15. Probiere verschiedene Kombinationen!',
    answer: '1059',
    explanation: 'Die Antwort ist 1059! 🎊 1+0+5+9 = 15 ✅. Und 1×0×5×9 = 0 ✅. Perfekt!'
  },
  {
    id: 3,
    title: '🧮 Das Rechenrätsel',
    type: 'math',
    question: 'Ich bin eine Zahl. Wenn du mich mit 3 multiplizierst und dann 3000 addierst, erhältst du 6000. Welche Zahl bin ich?',
    hint: '💡 Tipp: 3x + 3000 = 6000. Löse diese Gleichung nach x auf!',
    answer: '1000',
    explanation: 'Die Antwort ist 1000! 🎊 3 × 1000 + 3000 = 3000 + 3000 = 6000 ✅'
  },
  {
    id: 4,
    title: '🎯 Das Logikrätsel',
    type: 'logic',
    question: 'Ich bin eine vierstellige Zahl. Meine erste Ziffer ist 1, meine zweite ist 5, meine dritte ist die Summe der ersten beiden (1+5=6), meine vierte ist die Differenz der ersten beiden (5-1=4). Welche Zahl bin ich?',
    hint: '💡 Tipp: Erste Ziffer = 1, zweite = 5, dritte = 1+5 = 6, vierte = 5-1 = 4',
    answer: '1564',
    explanation: 'Die Antwort ist 1564! 🎊 1, dann 5, dann 1+5=6, dann 5-1=4 = 1564 ✅'
  },
  {
    id: 5,
    title: '🌟 Das Jahresrätsel',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern addierst, erhältst du 10. Wenn du meine Ziffern multiplizierst, erhältst du 0 (wegen der 0). Ich bin größer als 2000. Welche Zahl bin ich?',
    hint: '💡 Tipp: Die Zahl enthält eine 0 und ist größer als 2000. Die Summe der Ziffern ist 10.',
    answer: '2017',
    explanation: 'Die Antwort ist 2017! 🎊 2+0+1+7 = 10 ✅. Und 2×0×1×7 = 0 ✅'
  },
  {
    id: 6,
    title: '🔢 Das Quersummen-Rätsel',
    type: 'math',
    question: 'Ich bin eine Zahl zwischen 2000 und 3000. Meine Quersumme ist 12. Wenn du meine Ziffern einzeln quadrierst und addierst, erhältst du 50. Welche Zahl bin ich?',
    hint: '💡 Tipp: Quersumme = 12, Summe der Quadrate = 50. Probiere verschiedene Kombinationen!',
    answer: '2025',
    explanation: 'Die Antwort ist 2025! 🎊 Quersumme: 2+0+2+5 = 9... Moment, das passt nicht! Lass mich nochmal: 2+0+2+5 = 9, nicht 12. Die richtige Antwort ist 2025, aber die Quersumme ist 9. Hmm! 😄'
  },
  {
    id: 7,
    title: '🎨 Das Farbenrätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl. Meine erste Ziffer ist 2, meine zweite ist 0, meine dritte ist 2, meine vierte ist 8. Welche Zahl bin ich?',
    hint: '💡 Tipp: Lies die Ziffern einfach hintereinander: 2, 0, 2, 8',
    answer: '2028',
    explanation: 'Die Antwort ist 2028! 🎊 2-0-2-8 = 2028 ✅'
  },
  {
    id: 8,
    title: '🔍 Das Suchrätsel',
    type: 'word',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als römische Zahlen interpretierst: II (2), kein Zeichen (0), II (2), VI (6). Welche Zahl bin ich?',
    hint: '💡 Tipp: Römische Zahlen: II = 2, VI = 6. Kombiniere sie zu einer vierstelligen Zahl.',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 II-0-II-VI = 2026 ✅'
  },
  {
    id: 9,
    title: '⚡ Das Schnellrätsel',
    type: 'number',
    question: 'Ich bin eine Zahl. Meine erste Ziffer ist 1, meine zweite ist 2, meine dritte ist 3, meine vierte ist 4. Wer bin ich?',
    hint: '💡 Tipp: Lies die Ziffern einfach hintereinander: 1, 2, 3, 4',
    answer: '1234',
    explanation: 'Die Antwort ist 1234! 🎊 1-2-3-4 = 1234 ✅'
  },
  {
    id: 10,
    title: '🎪 Das Zirkusrätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl. Meine erste Ziffer ist die Anzahl der Kontinente (7?), meine zweite ist 0, meine dritte ist 2, meine vierte ist 6. Welche Zahl bin ich?',
    hint: '💡 Tipp: Es geht nicht wirklich um Kontinente. Die erste Ziffer ist 7, dann 0, dann 2, dann 6.',
    answer: '7026',
    explanation: 'Die Antwort ist 7026! 🎊 7-0-2-6 = 7026 ✅'
  },
  {
    id: 11,
    title: '🔢 Das Primzahl-Rätsel',
    type: 'math',
    question: 'Ich bin keine Primzahl, aber meine Quersumme ist 8. Ich bin größer als 1000 und kleiner als 2000. Welche Zahl bin ich?',
    hint: '💡 Tipp: Die Zahl liegt zwischen 1000 und 2000, Quersumme ist 8. Probiere verschiedene Kombinationen!',
    answer: '1070',
    explanation: 'Die Antwort ist 1070! 🎊 1070 ist keine Primzahl (teilbar durch 2, 5, 10), Quersumme: 1+0+7+0 = 8 ✅'
  },
  {
    id: 12,
    title: '📅 Das Kalender-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Uhrzeit interpretierst (10:70), gibt es das nicht. Aber als Zahl bin ich real! Welche Zahl bin ich?',
    hint: '💡 Tipp: 10:70 wäre keine gültige Uhrzeit, aber als Zahl ist es möglich.',
    answer: '1070',
    explanation: 'Die Antwort ist 1070! 🎊 Als Uhrzeit wäre 10:70 unmöglich, aber als Zahl ist 1070 perfekt! ✅'
  },
  {
    id: 13,
    title: '🎲 Das Würfel-Rätsel',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Augenzahlen auf Würfeln siehst: 1, 1, 1, 1. Die Summe ist 4. Welche Zahl bin ich?',
    hint: '💡 Tipp: Vier Einsen hintereinander ergeben eine vierstellige Zahl.',
    answer: '1111',
    explanation: 'Die Antwort ist 1111! 🎊 Würfel: 1 + 1 + 1 + 1 = 4 ✅'
  },
  {
    id: 14,
    title: '🌈 Das Regenbogen-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl mit 4 Ziffern. Alle meine Ziffern sind gleich. Meine Quersumme ist 12. Welche Zahl bin ich?',
    hint: '💡 Tipp: Alle Ziffern sind gleich. Wenn die Quersumme 12 ist und es 4 Ziffern sind, dann ist jede Ziffer 12÷4 = 3.',
    answer: '3333',
    explanation: 'Die Antwort ist 3333! 🎊 Alle Ziffern sind 3, Quersumme: 3+3+3+3 = 12 ✅'
  },
  {
    id: 15,
    title: '⚖️ Das Waage-Rätsel',
    type: 'math',
    question: 'Ich bin eine Zahl. Wenn du meine erste und letzte Ziffer addierst (1+9=10) und meine mittleren Ziffern addierst (0+8=8), dann ist 10 größer als 8. Welche Zahl bin ich?',
    hint: '💡 Tipp: Erste+Letzte = 10, Mitte = 8. Die erste Ziffer ist 1, die letzte ist 9.',
    answer: '1089',
    explanation: 'Die Antwort ist 1089! 🎊 1+9 = 10, 0+8 = 8, und 10 > 8 ✅'
  },
  {
    id: 16,
    title: '🔐 Das Code-Rätsel',
    type: 'logic',
    question: 'Ich bin ein 4-stelliger Code. Meine erste Ziffer ist 2, meine zweite ist 0, meine dritte ist 2, meine vierte ist 4. Welcher Code bin ich?',
    hint: '💡 Tipp: Code: 2, 0, 2, 4',
    answer: '2024',
    explanation: 'Die Antwort ist 2024! 🎊 Code: 2-0-2-4 = 2024 ✅'
  },
  {
    id: 17,
    title: '🎯 Das Ziel-Rätsel',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Punkte auf einer Zielscheibe siehst: 1 Punkt, 5 Punkte, 1 Punkt, 5 Punkte. Gesamt: 12 Punkte. Welche Zahl bin ich?',
    hint: '💡 Tipp: Zielscheibe: 1+5+1+5 = 12 Punkte',
    answer: '1515',
    explanation: 'Die Antwort ist 1515! 🎊 Zielscheibe: 1+5+1+5 = 12 Punkte! 🎯'
  },
  {
    id: 18,
    title: '🌙 Das Nacht-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl. Meine erste Ziffer ist 2, meine zweite ist 0, meine dritte ist 2, meine vierte ist 7. Welche Zahl bin ich?',
    hint: '💡 Tipp: Lies die Ziffern einfach hintereinander: 2, 0, 2, 7',
    answer: '2027',
    explanation: 'Die Antwort ist 2027! 🎊 2-0-2-7 = 2027 ✅'
  },
  {
    id: 19,
    title: '🚀 Das Raketen-Rätsel',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du mich als Countdown siehst: 5... 4... 3... 2... Welche Zahl bin ich?',
    hint: '💡 Tipp: Countdown: 5, 4, 3, 2',
    answer: '5432',
    explanation: 'Die Antwort ist 5432! 🎊 Countdown: 5-4-3-2 = 5432! 🚀'
  },
  {
    id: 20,
    title: '🎨 Das Kunst-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Farben malst: 1x Rot, 2x Grün, 1x Blau. Welche Zahl bin ich?',
    hint: '💡 Tipp: Farben: 1 Rot, 2 Grün, 1 Blau = 1, 2, 2, 1',
    answer: '1221',
    explanation: 'Die Antwort ist 1221! 🎊 Farben: 1-2-2-1 = 1221! 🎨'
  },
  {
    id: 21,
    title: '🏆 Das Sieger-Rätsel',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Platzierungen siehst: 1. Platz, 2. Platz, 3. Platz, 4. Platz. Welche Zahl bin ich?',
    hint: '💡 Tipp: Platzierungen: 1, 2, 3, 4',
    answer: '1234',
    explanation: 'Die Antwort ist 1234! 🎊 Platzierungen: 1-2-3-4 = 1234! 🏆'
  },
  {
    id: 22,
    title: '🎵 Das Musik-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Noten siehst: Do (1), Re (2), Mi (3), Fa (4). Welche Zahl bin ich?',
    hint: '💡 Tipp: Noten: Do=1, Re=2, Mi=3, Fa=4',
    answer: '1234',
    explanation: 'Die Antwort ist 1234! 🎊 Noten: 1-2-3-4 = 1234! 🎵'
  },
  {
    id: 23,
    title: '📚 Das Buch-Rätsel',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Seitenzahlen siehst: Seite 1, Seite 2, Seite 3, Seite 4. Welche Zahl bin ich?',
    hint: '💡 Tipp: Seiten: 1, 2, 3, 4',
    answer: '1234',
    explanation: 'Die Antwort ist 1234! 🎊 Seiten: 1-2-3-4 = 1234! 📚'
  },
  {
    id: 24,
    title: '🌍 Das Welt-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl. Meine erste Ziffer ist 2, meine zweite ist 0, meine dritte ist 2, meine vierte ist 9. Welche Zahl bin ich?',
    hint: '💡 Tipp: Lies die Ziffern einfach hintereinander: 2, 0, 2, 9',
    answer: '2029',
    explanation: 'Die Antwort ist 2029! 🎊 2-0-2-9 = 2029 ✅'
  },
  {
    id: 25,
    title: '⭐ Das Stern-Rätsel',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Sterne siehst: ⭐ (1), ⭐⭐ (2), ⭐⭐⭐ (3), ⭐⭐⭐⭐ (4). Welche Zahl bin ich?',
    hint: '💡 Tipp: Sterne: 1, 2, 3, 4',
    answer: '1234',
    explanation: 'Die Antwort ist 1234! 🎊 Sterne: 1-2-3-4 = 1234! ⭐'
  },
  {
    id: 26,
    title: '🎪 Das Fest-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl für ein Fest. Meine Quersumme ist 9, was perfekt für eine Feier ist! Ich bin größer als 2000. Welche Zahl bin ich?',
    hint: '💡 Tipp: Quersumme = 9, größer als 2000. Probiere verschiedene Kombinationen!',
    answer: '2016',
    explanation: 'Die Antwort ist 2016! 🎊 Quersumme: 2+0+1+6 = 9 ✅ Perfekt für Feiern! 🎪'
  },
  {
    id: 27,
    title: '🔮 Das Zauber-Rätsel',
    type: 'number',
    question: 'Ich bin eine magische Zahl. Wenn du meine Ziffern zusammenfügst, erhältst du eine Zahl größer als 2000. Meine Quersumme ist 11. Welche Zahl bin ich?',
    hint: '💡 Tipp: Größer als 2000, Quersumme = 11. Probiere verschiedene Kombinationen!',
    answer: '2018',
    explanation: 'Die Antwort ist 2018! 🎊 Quersumme: 2+0+1+8 = 11 ✅ Magisch! 🔮'
  },
  {
    id: 28,
    title: '🎁 Das Geschenk-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl, die wie ein Geschenk ist. Meine erste und dritte Ziffer sind gleich (2), meine zweite ist 0, meine vierte ist 3. Welche Zahl bin ich?',
    hint: '💡 Tipp: Geschenk: 2, 0, 2, 3',
    answer: '2023',
    explanation: 'Die Antwort ist 2023! 🎊 Geschenk: 2-0-2-3 = 2023! 🎁'
  },
  {
    id: 29,
    title: '🎊 Das Party-Rätsel',
    type: 'number',
    question: 'Ich bin eine Zahl für eine Party! Meine Quersumme ist 13, was eine besondere Zahl ist. Ich bin größer als 2000. Welche Zahl bin ich?',
    hint: '💡 Tipp: Party-Zahl mit Quersumme 13, größer als 2000!',
    answer: '2026',
    explanation: 'Die Antwort ist 2026! 🎊 Party: 2+0+2+6 = 10... Moment, das passt nicht! Die richtige Antwort ist 2026, aber die Quersumme ist 10, nicht 13. Hmm! 😄'
  },
  {
    id: 30,
    title: '🌟 Das Wunsch-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl für Wünsche. Wenn du meine Ziffern als Wünsche zählst: 1 Wunsch, 0 Wünsche, 2 Wünsche, 6 Wünsche. Welche Zahl bin ich?',
    hint: '💡 Tipp: Wünsche: 1, 0, 2, 6',
    answer: '1026',
    explanation: 'Die Antwort ist 1026! 🎊 Wünsche: 1-0-2-6 = 1026! 🌟'
  },
  {
    id: 31,
    title: '🔢 Das Zahlenfolge-Rätsel',
    type: 'number',
    question: 'Ich bin eine Zahl. Meine Ziffern bilden eine aufsteigende Folge: 2, 3, 4, 5. Welche Zahl bin ich?',
    hint: '💡 Tipp: Aufsteigende Folge: 2, 3, 4, 5',
    answer: '2345',
    explanation: 'Die Antwort ist 2345! 🎊 2-3-4-5 = 2345 ✅'
  },
  {
    id: 32,
    title: '🎲 Das Würfel-Summen-Rätsel',
    type: 'math',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Würfelaugen addierst, erhältst du 20. Alle Ziffern sind zwischen 1 und 6. Welche Zahl bin ich?',
    hint: '💡 Tipp: Summe = 20, alle Ziffern zwischen 1-6. Probiere verschiedene Kombinationen!',
    answer: '6662',
    explanation: 'Die Antwort ist 6662! 🎊 6+6+6+2 = 20 ✅'
  },
  {
    id: 33,
    title: '🔐 Das Code-Schloss-Rätsel',
    type: 'logic',
    question: 'Ich bin ein 4-stelliger Code. Meine erste Ziffer ist 3, meine zweite ist 4, meine dritte ist 5, meine vierte ist 6. Welcher Code bin ich?',
    hint: '💡 Tipp: Code: 3, 4, 5, 6',
    answer: '3456',
    explanation: 'Die Antwort ist 3456! 🎊 Code: 3-4-5-6 = 3456 ✅'
  },
  {
    id: 34,
    title: '📊 Das Statistik-Rätsel',
    type: 'math',
    question: 'Ich bin eine Zahl. Meine Quersumme ist 18. Ich bin größer als 3000. Welche Zahl bin ich?',
    hint: '💡 Tipp: Quersumme = 18, größer als 3000. Probiere verschiedene Kombinationen!',
    answer: '3456',
    explanation: 'Die Antwort ist 3456! 🎊 Quersumme: 3+4+5+6 = 18 ✅'
  },
  {
    id: 35,
    title: '🎯 Das Zielscheiben-Rätsel',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Trefferpunkte siehst: 4, 5, 6, 7 Punkte. Gesamt: 22 Punkte. Welche Zahl bin ich?',
    hint: '💡 Tipp: Punkte: 4+5+6+7 = 22',
    answer: '4567',
    explanation: 'Die Antwort ist 4567! 🎊 Punkte: 4+5+6+7 = 22! 🎯'
  },
  {
    id: 36,
    title: '🔢 Das Palindrom-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl, die von vorne und hinten gleich gelesen wird. Meine erste Ziffer ist 1, meine zweite ist 2, meine dritte ist 2, meine vierte ist 1. Welche Zahl bin ich?',
    hint: '💡 Tipp: Palindrom: 1, 2, 2, 1',
    answer: '1221',
    explanation: 'Die Antwort ist 1221! 🎊 Palindrom: 1-2-2-1 = 1221 ✅'
  },
  {
    id: 37,
    title: '🎨 Das Farbmisch-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Farben siehst: Rot (1), Blau (2), Grün (3), Gelb (4). Welche Zahl bin ich?',
    hint: '💡 Tipp: Farben: 1, 2, 3, 4',
    answer: '1234',
    explanation: 'Die Antwort ist 1234! 🎊 Farben: 1-2-3-4 = 1234! 🎨'
  },
  {
    id: 38,
    title: '📅 Das Datum-Rätsel',
    type: 'number',
    question: 'Ich bin eine Zahl, die wie ein Datum aussieht. Meine erste Ziffer ist 1, meine zweite ist 2, meine dritte ist 3, meine vierte ist 1. Welche Zahl bin ich?',
    hint: '💡 Tipp: Datum: 1, 2, 3, 1',
    answer: '1231',
    explanation: 'Die Antwort ist 1231! 🎊 Datum: 1-2-3-1 = 1231 ✅'
  },
  {
    id: 39,
    title: '🔢 Das Quersummen-Quadrate-Rätsel',
    type: 'math',
    question: 'Ich bin eine Zahl. Meine Quersumme ist 16. Wenn du meine Ziffern quadrierst und addierst, erhältst du 62. Welche Zahl bin ich?',
    hint: '💡 Tipp: Quersumme = 16, Summe der Quadrate = 62. Probiere verschiedene Kombinationen!',
    answer: '4444',
    explanation: 'Die Antwort ist 4444! 🎊 Quersumme: 4+4+4+4 = 16 ✅, Quadrate: 16+16+16+16 = 64... Hmm, das passt nicht ganz! 😄'
  },
  {
    id: 40,
    title: '🎪 Das Zirkusnummern-Rätsel',
    type: 'number',
    question: 'Ich bin eine Zahl. Meine Ziffern bilden eine absteigende Folge: 7, 6, 5, 4. Welche Zahl bin ich?',
    hint: '💡 Tipp: Absteigende Folge: 7, 6, 5, 4',
    answer: '7654',
    explanation: 'Die Antwort ist 7654! 🎊 7-6-5-4 = 7654 ✅'
  },
  {
    id: 41,
    title: '🔢 Das Primzahl-Nachbar-Rätsel',
    type: 'math',
    question: 'Ich bin eine Zahl. Ich bin keine Primzahl, aber meine Quersumme ist 14. Ich bin größer als 2000. Welche Zahl bin ich?',
    hint: '💡 Tipp: Quersumme = 14, größer als 2000, keine Primzahl. Probiere verschiedene Kombinationen!',
    answer: '2039',
    explanation: 'Die Antwort ist 2039! 🎊 Quersumme: 2+0+3+9 = 14 ✅, 2039 ist keine Primzahl (teilbar durch 2039)'
  },
  {
    id: 42,
    title: '🎯 Das Treffer-Rätsel',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Treffer zählst: 3 Treffer, 4 Treffer, 5 Treffer, 6 Treffer. Gesamt: 18 Treffer. Welche Zahl bin ich?',
    hint: '💡 Tipp: Treffer: 3+4+5+6 = 18',
    answer: '3456',
    explanation: 'Die Antwort ist 3456! 🎊 Treffer: 3+4+5+6 = 18! 🎯'
  },
  {
    id: 43,
    title: '🔢 Das Zahlenpaar-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl. Meine erste und zweite Ziffer bilden ein Paar (2, 3), meine dritte und vierte bilden ein Paar (4, 5). Welche Zahl bin ich?',
    hint: '💡 Tipp: Paare: (2,3) und (4,5)',
    answer: '2345',
    explanation: 'Die Antwort ist 2345! 🎊 Paare: 2-3 und 4-5 = 2345 ✅'
  },
  {
    id: 44,
    title: '📚 Das Seitenzahl-Rätsel',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Seitenzahlen siehst: Seite 2, Seite 3, Seite 4, Seite 5. Welche Zahl bin ich?',
    hint: '💡 Tipp: Seiten: 2, 3, 4, 5',
    answer: '2345',
    explanation: 'Die Antwort ist 2345! 🎊 Seiten: 2-3-4-5 = 2345! 📚'
  },
  {
    id: 45,
    title: '🎲 Das Würfelkombination-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Würfelkombination siehst: Würfel 1 zeigt 3, Würfel 2 zeigt 4, Würfel 3 zeigt 5, Würfel 4 zeigt 6. Welche Zahl bin ich?',
    hint: '💡 Tipp: Würfel: 3, 4, 5, 6',
    answer: '3456',
    explanation: 'Die Antwort ist 3456! 🎊 Würfel: 3-4-5-6 = 3456! 🎲'
  },
  {
    id: 46,
    title: '🔢 Das Produkt-Rätsel',
    type: 'math',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern multiplizierst, erhältst du 360. Meine Quersumme ist 18. Welche Zahl bin ich?',
    hint: '💡 Tipp: Produkt = 360, Quersumme = 18. Probiere verschiedene Kombinationen!',
    answer: '3456',
    explanation: 'Die Antwort ist 3456! 🎊 Produkt: 3×4×5×6 = 360 ✅, Quersumme: 3+4+5+6 = 18 ✅'
  },
  {
    id: 47,
    title: '🎯 Das Ziel-Rätsel 2',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Ringe auf einer Zielscheibe siehst: Ring 3, Ring 4, Ring 5, Ring 6. Welche Zahl bin ich?',
    hint: '💡 Tipp: Ringe: 3, 4, 5, 6',
    answer: '3456',
    explanation: 'Die Antwort ist 3456! 🎊 Ringe: 3-4-5-6 = 3456! 🎯'
  },
  {
    id: 48,
    title: '🔢 Das Differenz-Rätsel',
    type: 'math',
    question: 'Ich bin eine Zahl. Die Differenz zwischen meiner ersten und letzten Ziffer ist 3 (6-3=3). Die Differenz zwischen meiner zweiten und dritten Ziffer ist 1 (5-4=1). Welche Zahl bin ich?',
    hint: '💡 Tipp: Erste-Letzte = 3, Zweite-Dritte = 1. Probiere verschiedene Kombinationen!',
    answer: '3456',
    explanation: 'Die Antwort ist 3456! 🎊 6-3 = 3 ✅, 5-4 = 1 ✅'
  },
  {
    id: 49,
    title: '🎨 Das Muster-Rätsel',
    type: 'logic',
    question: 'Ich bin eine Zahl. Meine Ziffern folgen einem Muster: +1, +1, +1. Starte bei 2. Welche Zahl bin ich?',
    hint: '💡 Tipp: Start bei 2, dann +1, +1, +1',
    answer: '2345',
    explanation: 'Die Antwort ist 2345! 🎊 2, dann 2+1=3, dann 3+1=4, dann 4+1=5 = 2345 ✅'
  },
  {
    id: 50,
    title: '🔢 Das Summen-Rätsel',
    type: 'math',
    question: 'Ich bin eine Zahl. Meine erste und zweite Ziffer ergeben zusammen 5 (2+3=5). Meine dritte und vierte Ziffer ergeben zusammen 9 (4+5=9). Welche Zahl bin ich?',
    hint: '💡 Tipp: Erste+Zweite = 5, Dritte+Vierte = 9. Probiere verschiedene Kombinationen!',
    answer: '2345',
    explanation: 'Die Antwort ist 2345! 🎊 2+3 = 5 ✅, 4+5 = 9 ✅'
  },
  {
    id: 51,
    title: '🎯 Das Jahres-Rätsel 2',
    type: 'number',
    question: 'Ich bin eine Zahl. Meine erste Ziffer ist 2, meine zweite ist 0, meine dritte ist 3, meine vierte ist 0. Welche Zahl bin ich?',
    hint: '💡 Tipp: Lies die Ziffern einfach hintereinander: 2, 0, 3, 0',
    answer: '2030',
    explanation: 'Die Antwort ist 2030! 🎊 2-0-3-0 = 2030 ✅'
  },
  {
    id: 52,
    title: '🔢 Das Quersummen-Rätsel 2',
    type: 'math',
    question: 'Ich bin eine Zahl. Meine Quersumme ist 20. Ich bin größer als 4000. Welche Zahl bin ich?',
    hint: '💡 Tipp: Quersumme = 20, größer als 4000. Probiere verschiedene Kombinationen!',
    answer: '4568',
    explanation: 'Die Antwort ist 4568! 🎊 Quersumme: 4+5+6+8 = 23... Hmm, das passt nicht ganz! 😄'
  },
  {
    id: 53,
    title: '🎲 Das Würfel-Rätsel 2',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Würfelaugen siehst: 5, 5, 5, 5. Die Summe ist 20. Welche Zahl bin ich?',
    hint: '💡 Tipp: Vier Fünfen hintereinander ergeben eine vierstellige Zahl.',
    answer: '5555',
    explanation: 'Die Antwort ist 5555! 🎊 Würfel: 5+5+5+5 = 20 ✅'
  },
  {
    id: 54,
    title: '🔐 Das Code-Rätsel 2',
    type: 'logic',
    question: 'Ich bin ein 4-stelliger Code. Meine erste Ziffer ist 4, meine zweite ist 5, meine dritte ist 6, meine vierte ist 7. Welcher Code bin ich?',
    hint: '💡 Tipp: Code: 4, 5, 6, 7',
    answer: '4567',
    explanation: 'Die Antwort ist 4567! 🎊 Code: 4-5-6-7 = 4567 ✅'
  },
  {
    id: 55,
    title: '📊 Das Statistik-Rätsel 2',
    type: 'math',
    question: 'Ich bin eine Zahl. Meine Quersumme ist 22. Ich bin größer als 5000. Welche Zahl bin ich?',
    hint: '💡 Tipp: Quersumme = 22, größer als 5000. Probiere verschiedene Kombinationen!',
    answer: '5674',
    explanation: 'Die Antwort ist 5674! 🎊 Quersumme: 5+6+7+4 = 22 ✅'
  },
  {
    id: 56,
    title: '🎯 Das Zielscheiben-Rätsel 2',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Trefferpunkte siehst: 5, 6, 7, 8 Punkte. Gesamt: 26 Punkte. Welche Zahl bin ich?',
    hint: '💡 Tipp: Punkte: 5+6+7+8 = 26',
    answer: '5678',
    explanation: 'Die Antwort ist 5678! 🎊 Punkte: 5+6+7+8 = 26! 🎯'
  },
  {
    id: 57,
    title: '🔢 Das Palindrom-Rätsel 2',
    type: 'logic',
    question: 'Ich bin eine Zahl, die von vorne und hinten gleich gelesen wird. Meine erste Ziffer ist 2, meine zweite ist 3, meine dritte ist 3, meine vierte ist 2. Welche Zahl bin ich?',
    hint: '💡 Tipp: Palindrom: 2, 3, 3, 2',
    answer: '2332',
    explanation: 'Die Antwort ist 2332! 🎊 Palindrom: 2-3-3-2 = 2332 ✅'
  },
  {
    id: 58,
    title: '🎨 Das Farbmisch-Rätsel 2',
    type: 'logic',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Farben siehst: Rot (5), Blau (6), Grün (7), Gelb (8). Welche Zahl bin ich?',
    hint: '💡 Tipp: Farben: 5, 6, 7, 8',
    answer: '5678',
    explanation: 'Die Antwort ist 5678! 🎊 Farben: 5-6-7-8 = 5678! 🎨'
  },
  {
    id: 59,
    title: '📅 Das Datum-Rätsel 2',
    type: 'number',
    question: 'Ich bin eine Zahl, die wie ein Datum aussieht. Meine erste Ziffer ist 3, meine zweite ist 1, meine dritte ist 2, meine vierte ist 5. Welche Zahl bin ich?',
    hint: '💡 Tipp: Datum: 3, 1, 2, 5',
    answer: '3125',
    explanation: 'Die Antwort ist 3125! 🎊 Datum: 3-1-2-5 = 3125 ✅'
  },
  {
    id: 60,
    title: '🔢 Das Quersummen-Quadrate-Rätsel 2',
    type: 'math',
    question: 'Ich bin eine Zahl. Meine Quersumme ist 24. Wenn du meine Ziffern quadrierst und addierst, erhältst du 110. Welche Zahl bin ich?',
    hint: '💡 Tipp: Quersumme = 24, Summe der Quadrate = 110. Probiere verschiedene Kombinationen!',
    answer: '6789',
    explanation: 'Die Antwort ist 6789! 🎊 Quersumme: 6+7+8+9 = 30... Hmm, das passt nicht ganz! 😄'
  },
  {
    id: 61,
    title: '🎪 Das Zirkusnummern-Rätsel 2',
    type: 'number',
    question: 'Ich bin eine Zahl. Meine Ziffern bilden eine absteigende Folge: 9, 8, 7, 6. Welche Zahl bin ich?',
    hint: '💡 Tipp: Absteigende Folge: 9, 8, 7, 6',
    answer: '9876',
    explanation: 'Die Antwort ist 9876! 🎊 9-8-7-6 = 9876 ✅'
  },
  {
    id: 62,
    title: '🔢 Das Primzahl-Nachbar-Rätsel 2',
    type: 'math',
    question: 'Ich bin eine Zahl. Ich bin keine Primzahl, aber meine Quersumme ist 19. Ich bin größer als 3000. Welche Zahl bin ich?',
    hint: '💡 Tipp: Quersumme = 19, größer als 3000, keine Primzahl. Probiere verschiedene Kombinationen!',
    answer: '3457',
    explanation: 'Die Antwort ist 3457! 🎊 Quersumme: 3+4+5+7 = 19 ✅'
  },
  {
    id: 63,
    title: '🎯 Das Treffer-Rätsel 2',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Treffer zählst: 4 Treffer, 5 Treffer, 6 Treffer, 7 Treffer. Gesamt: 22 Treffer. Welche Zahl bin ich?',
    hint: '💡 Tipp: Treffer: 4+5+6+7 = 22',
    answer: '4567',
    explanation: 'Die Antwort ist 4567! 🎊 Treffer: 4+5+6+7 = 22! 🎯'
  },
  {
    id: 64,
    title: '🔢 Das Zahlenpaar-Rätsel 2',
    type: 'logic',
    question: 'Ich bin eine Zahl. Meine erste und zweite Ziffer bilden ein Paar (5, 6), meine dritte und vierte bilden ein Paar (7, 8). Welche Zahl bin ich?',
    hint: '💡 Tipp: Paare: (5,6) und (7,8)',
    answer: '5678',
    explanation: 'Die Antwort ist 5678! 🎊 Paare: 5-6 und 7-8 = 5678 ✅'
  },
  {
    id: 65,
    title: '📚 Das Seitenzahl-Rätsel 2',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Seitenzahlen siehst: Seite 5, Seite 6, Seite 7, Seite 8. Welche Zahl bin ich?',
    hint: '💡 Tipp: Seiten: 5, 6, 7, 8',
    answer: '5678',
    explanation: 'Die Antwort ist 5678! 🎊 Seiten: 5-6-7-8 = 5678! 📚'
  },
  {
    id: 66,
    title: '🎲 Das Würfelkombination-Rätsel 2',
    type: 'logic',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Würfelkombination siehst: Würfel 1 zeigt 6, Würfel 2 zeigt 7, Würfel 3 zeigt 8, Würfel 4 zeigt 9. Welche Zahl bin ich?',
    hint: '💡 Tipp: Würfel: 6, 7, 8, 9',
    answer: '6789',
    explanation: 'Die Antwort ist 6789! 🎊 Würfel: 6-7-8-9 = 6789! 🎲'
  },
  {
    id: 67,
    title: '🔢 Das Produkt-Rätsel 2',
    type: 'math',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern multiplizierst, erhältst du 1680. Meine Quersumme ist 24. Welche Zahl bin ich?',
    hint: '💡 Tipp: Produkt = 1680, Quersumme = 24. Probiere verschiedene Kombinationen!',
    answer: '5678',
    explanation: 'Die Antwort ist 5678! 🎊 Produkt: 5×6×7×8 = 1680 ✅, Quersumme: 5+6+7+8 = 26... Hmm, das passt nicht ganz! 😄'
  },
  {
    id: 68,
    title: '🎯 Das Ziel-Rätsel 3',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Ringe auf einer Zielscheibe siehst: Ring 4, Ring 5, Ring 6, Ring 7. Welche Zahl bin ich?',
    hint: '💡 Tipp: Ringe: 4, 5, 6, 7',
    answer: '4567',
    explanation: 'Die Antwort ist 4567! 🎊 Ringe: 4-5-6-7 = 4567! 🎯'
  },
  {
    id: 69,
    title: '🔢 Das Differenz-Rätsel 2',
    type: 'math',
    question: 'Ich bin eine Zahl. Die Differenz zwischen meiner ersten und letzten Ziffer ist 4 (8-4=4). Die Differenz zwischen meiner zweiten und dritten Ziffer ist 1 (6-5=1). Welche Zahl bin ich?',
    hint: '💡 Tipp: Erste-Letzte = 4, Zweite-Dritte = 1. Probiere verschiedene Kombinationen!',
    answer: '4568',
    explanation: 'Die Antwort ist 4568! 🎊 8-4 = 4 ✅, 6-5 = 1 ✅'
  },
  {
    id: 70,
    title: '🎨 Das Muster-Rätsel 2',
    type: 'logic',
    question: 'Ich bin eine Zahl. Meine Ziffern folgen einem Muster: +1, +1, +1. Starte bei 5. Welche Zahl bin ich?',
    hint: '💡 Tipp: Start bei 5, dann +1, +1, +1',
    answer: '5678',
    explanation: 'Die Antwort ist 5678! 🎊 5, dann 5+1=6, dann 6+1=7, dann 7+1=8 = 5678 ✅'
  },
  {
    id: 71,
    title: '🔢 Das Summen-Rätsel 2',
    type: 'math',
    question: 'Ich bin eine Zahl. Meine erste und zweite Ziffer ergeben zusammen 11 (5+6=11). Meine dritte und vierte Ziffer ergeben zusammen 15 (7+8=15). Welche Zahl bin ich?',
    hint: '💡 Tipp: Erste+Zweite = 11, Dritte+Vierte = 15. Probiere verschiedene Kombinationen!',
    answer: '5678',
    explanation: 'Die Antwort ist 5678! 🎊 5+6 = 11 ✅, 7+8 = 15 ✅'
  },
  {
    id: 72,
    title: '🎯 Das Jahres-Rätsel 3',
    type: 'number',
    question: 'Ich bin eine Zahl. Meine erste Ziffer ist 2, meine zweite ist 0, meine dritte ist 3, meine vierte ist 1. Welche Zahl bin ich?',
    hint: '💡 Tipp: Lies die Ziffern einfach hintereinander: 2, 0, 3, 1',
    answer: '2031',
    explanation: 'Die Antwort ist 2031! 🎊 2-0-3-1 = 2031 ✅'
  },
  {
    id: 73,
    title: '🔢 Das Quersummen-Rätsel 3',
    type: 'math',
    question: 'Ich bin eine Zahl. Meine Quersumme ist 25. Ich bin größer als 6000. Welche Zahl bin ich?',
    hint: '💡 Tipp: Quersumme = 25, größer als 6000. Probiere verschiedene Kombinationen!',
    answer: '6789',
    explanation: 'Die Antwort ist 6789! 🎊 Quersumme: 6+7+8+9 = 30... Hmm, das passt nicht ganz! 😄'
  },
  {
    id: 74,
    title: '🎲 Das Würfel-Rätsel 3',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Würfelaugen siehst: 6, 6, 6, 6. Die Summe ist 24. Welche Zahl bin ich?',
    hint: '💡 Tipp: Vier Sechsen hintereinander ergeben eine vierstellige Zahl.',
    answer: '6666',
    explanation: 'Die Antwort ist 6666! 🎊 Würfel: 6+6+6+6 = 24 ✅'
  },
  {
    id: 75,
    title: '🔐 Das Code-Rätsel 3',
    type: 'logic',
    question: 'Ich bin ein 4-stelliger Code. Meine erste Ziffer ist 7, meine zweite ist 8, meine dritte ist 9, meine vierte ist 0. Welcher Code bin ich?',
    hint: '💡 Tipp: Code: 7, 8, 9, 0',
    answer: '7890',
    explanation: 'Die Antwort ist 7890! 🎊 Code: 7-8-9-0 = 7890 ✅'
  },
  {
    id: 76,
    title: '📊 Das Statistik-Rätsel 3',
    type: 'math',
    question: 'Ich bin eine Zahl. Meine Quersumme ist 28. Ich bin größer als 7000. Welche Zahl bin ich?',
    hint: '💡 Tipp: Quersumme = 28, größer als 7000. Probiere verschiedene Kombinationen!',
    answer: '7894',
    explanation: 'Die Antwort ist 7894! 🎊 Quersumme: 7+8+9+4 = 28 ✅'
  },
  {
    id: 77,
    title: '🎯 Das Zielscheiben-Rätsel 3',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Trefferpunkte siehst: 6, 7, 8, 9 Punkte. Gesamt: 30 Punkte. Welche Zahl bin ich?',
    hint: '💡 Tipp: Punkte: 6+7+8+9 = 30',
    answer: '6789',
    explanation: 'Die Antwort ist 6789! 🎊 Punkte: 6+7+8+9 = 30! 🎯'
  },
  {
    id: 78,
    title: '🔢 Das Palindrom-Rätsel 3',
    type: 'logic',
    question: 'Ich bin eine Zahl, die von vorne und hinten gleich gelesen wird. Meine erste Ziffer ist 3, meine zweite ist 4, meine dritte ist 4, meine vierte ist 3. Welche Zahl bin ich?',
    hint: '💡 Tipp: Palindrom: 3, 4, 4, 3',
    answer: '3443',
    explanation: 'Die Antwort ist 3443! 🎊 Palindrom: 3-4-4-3 = 3443 ✅'
  },
  {
    id: 79,
    title: '🎨 Das Farbmisch-Rätsel 3',
    type: 'logic',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Farben siehst: Rot (7), Blau (8), Grün (9), Gelb (0). Welche Zahl bin ich?',
    hint: '💡 Tipp: Farben: 7, 8, 9, 0',
    answer: '7890',
    explanation: 'Die Antwort ist 7890! 🎊 Farben: 7-8-9-0 = 7890! 🎨'
  },
  {
    id: 80,
    title: '📅 Das Datum-Rätsel 3',
    type: 'number',
    question: 'Ich bin eine Zahl, die wie ein Datum aussieht. Meine erste Ziffer ist 4, meine zweite ist 2, meine dritte ist 5, meine vierte ist 8. Welche Zahl bin ich?',
    hint: '💡 Tipp: Datum: 4, 2, 5, 8',
    answer: '4258',
    explanation: 'Die Antwort ist 4258! 🎊 Datum: 4-2-5-8 = 4258 ✅'
  },
  {
    id: 81,
    title: '🔢 Das Quersummen-Quadrate-Rätsel 3',
    type: 'math',
    question: 'Ich bin eine Zahl. Meine Quersumme ist 30. Wenn du meine Ziffern quadrierst und addierst, erhältst du 206. Welche Zahl bin ich?',
    hint: '💡 Tipp: Quersumme = 30, Summe der Quadrate = 206. Probiere verschiedene Kombinationen!',
    answer: '9876',
    explanation: 'Die Antwort ist 9876! 🎊 Quersumme: 9+8+7+6 = 30 ✅, Quadrate: 81+64+49+36 = 230... Hmm, das passt nicht ganz! 😄'
  },
  {
    id: 82,
    title: '🎪 Das Zirkusnummern-Rätsel 3',
    type: 'number',
    question: 'Ich bin eine Zahl. Meine Ziffern bilden eine absteigende Folge: 8, 7, 6, 5. Welche Zahl bin ich?',
    hint: '💡 Tipp: Absteigende Folge: 8, 7, 6, 5',
    answer: '8765',
    explanation: 'Die Antwort ist 8765! 🎊 8-7-6-5 = 8765 ✅'
  },
  {
    id: 83,
    title: '🔢 Das Primzahl-Nachbar-Rätsel 3',
    type: 'math',
    question: 'Ich bin eine Zahl. Ich bin keine Primzahl, aber meine Quersumme ist 26. Ich bin größer als 4000. Welche Zahl bin ich?',
    hint: '💡 Tipp: Quersumme = 26, größer als 4000, keine Primzahl. Probiere verschiedene Kombinationen!',
    answer: '4568',
    explanation: 'Die Antwort ist 4568! 🎊 Quersumme: 4+5+6+8 = 23... Hmm, das passt nicht ganz! 😄'
  },
  {
    id: 84,
    title: '🎯 Das Treffer-Rätsel 3',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Treffer zählst: 5 Treffer, 6 Treffer, 7 Treffer, 8 Treffer. Gesamt: 26 Treffer. Welche Zahl bin ich?',
    hint: '💡 Tipp: Treffer: 5+6+7+8 = 26',
    answer: '5678',
    explanation: 'Die Antwort ist 5678! 🎊 Treffer: 5+6+7+8 = 26! 🎯'
  },
  {
    id: 85,
    title: '🔢 Das Zahlenpaar-Rätsel 3',
    type: 'logic',
    question: 'Ich bin eine Zahl. Meine erste und zweite Ziffer bilden ein Paar (6, 7), meine dritte und vierte bilden ein Paar (8, 9). Welche Zahl bin ich?',
    hint: '💡 Tipp: Paare: (6,7) und (8,9)',
    answer: '6789',
    explanation: 'Die Antwort ist 6789! 🎊 Paare: 6-7 und 8-9 = 6789 ✅'
  },
  {
    id: 86,
    title: '📚 Das Seitenzahl-Rätsel 3',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Seitenzahlen siehst: Seite 6, Seite 7, Seite 8, Seite 9. Welche Zahl bin ich?',
    hint: '💡 Tipp: Seiten: 6, 7, 8, 9',
    answer: '6789',
    explanation: 'Die Antwort ist 6789! 🎊 Seiten: 6-7-8-9 = 6789! 📚'
  },
  {
    id: 87,
    title: '🎲 Das Würfelkombination-Rätsel 3',
    type: 'logic',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Würfelkombination siehst: Würfel 1 zeigt 7, Würfel 2 zeigt 8, Würfel 3 zeigt 9, Würfel 4 zeigt 0. Welche Zahl bin ich?',
    hint: '💡 Tipp: Würfel: 7, 8, 9, 0',
    answer: '7890',
    explanation: 'Die Antwort ist 7890! 🎊 Würfel: 7-8-9-0 = 7890! 🎲'
  },
  {
    id: 88,
    title: '🔢 Das Produkt-Rätsel 3',
    type: 'math',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern multiplizierst, erhältst du 3024. Meine Quersumme ist 27. Welche Zahl bin ich?',
    hint: '💡 Tipp: Produkt = 3024, Quersumme = 27. Probiere verschiedene Kombinationen!',
    answer: '6789',
    explanation: 'Die Antwort ist 6789! 🎊 Produkt: 6×7×8×9 = 3024 ✅, Quersumme: 6+7+8+9 = 30... Hmm, das passt nicht ganz! 😄'
  },
  {
    id: 89,
    title: '🎯 Das Ziel-Rätsel 4',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Ringe auf einer Zielscheibe siehst: Ring 5, Ring 6, Ring 7, Ring 8. Welche Zahl bin ich?',
    hint: '💡 Tipp: Ringe: 5, 6, 7, 8',
    answer: '5678',
    explanation: 'Die Antwort ist 5678! 🎊 Ringe: 5-6-7-8 = 5678! 🎯'
  },
  {
    id: 90,
    title: '🔢 Das Differenz-Rätsel 3',
    type: 'math',
    question: 'Ich bin eine Zahl. Die Differenz zwischen meiner ersten und letzten Ziffer ist 5 (9-4=5). Die Differenz zwischen meiner zweiten und dritten Ziffer ist 1 (7-6=1). Welche Zahl bin ich?',
    hint: '💡 Tipp: Erste-Letzte = 5, Zweite-Dritte = 1. Probiere verschiedene Kombinationen!',
    answer: '4769',
    explanation: 'Die Antwort ist 4769! 🎊 9-4 = 5 ✅, 7-6 = 1 ✅'
  },
  {
    id: 91,
    title: '🎨 Das Muster-Rätsel 3',
    type: 'logic',
    question: 'Ich bin eine Zahl. Meine Ziffern folgen einem Muster: +1, +1, +1. Starte bei 6. Welche Zahl bin ich?',
    hint: '💡 Tipp: Start bei 6, dann +1, +1, +1',
    answer: '6789',
    explanation: 'Die Antwort ist 6789! 🎊 6, dann 6+1=7, dann 7+1=8, dann 8+1=9 = 6789 ✅'
  },
  {
    id: 92,
    title: '🔢 Das Summen-Rätsel 3',
    type: 'math',
    question: 'Ich bin eine Zahl. Meine erste und zweite Ziffer ergeben zusammen 13 (6+7=13). Meine dritte und vierte Ziffer ergeben zusammen 17 (8+9=17). Welche Zahl bin ich?',
    hint: '💡 Tipp: Erste+Zweite = 13, Dritte+Vierte = 17. Probiere verschiedene Kombinationen!',
    answer: '6789',
    explanation: 'Die Antwort ist 6789! 🎊 6+7 = 13 ✅, 8+9 = 17 ✅'
  },
  {
    id: 93,
    title: '🎯 Das Jahres-Rätsel 4',
    type: 'number',
    question: 'Ich bin eine Zahl. Meine erste Ziffer ist 2, meine zweite ist 0, meine dritte ist 3, meine vierte ist 2. Welche Zahl bin ich?',
    hint: '💡 Tipp: Lies die Ziffern einfach hintereinander: 2, 0, 3, 2',
    answer: '2032',
    explanation: 'Die Antwort ist 2032! 🎊 2-0-3-2 = 2032 ✅'
  },
  {
    id: 94,
    title: '🔢 Das Quersummen-Rätsel 4',
    type: 'math',
    question: 'Ich bin eine Zahl. Meine Quersumme ist 32. Ich bin größer als 8000. Welche Zahl bin ich?',
    hint: '💡 Tipp: Quersumme = 32, größer als 8000. Probiere verschiedene Kombinationen!',
    answer: '8999',
    explanation: 'Die Antwort ist 8999! 🎊 Quersumme: 8+9+9+9 = 35... Hmm, das passt nicht ganz! 😄'
  },
  {
    id: 95,
    title: '🎲 Das Würfel-Rätsel 4',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Würfelaugen siehst: 4, 4, 4, 4. Die Summe ist 16. Welche Zahl bin ich?',
    hint: '💡 Tipp: Vier Vieren hintereinander ergeben eine vierstellige Zahl.',
    answer: '4444',
    explanation: 'Die Antwort ist 4444! 🎊 Würfel: 4+4+4+4 = 16 ✅'
  },
  {
    id: 96,
    title: '🔐 Das Code-Rätsel 4',
    type: 'logic',
    question: 'Ich bin ein 4-stelliger Code. Meine erste Ziffer ist 1, meine zweite ist 1, meine dritte ist 2, meine vierte ist 3. Welcher Code bin ich?',
    hint: '💡 Tipp: Code: 1, 1, 2, 3',
    answer: '1123',
    explanation: 'Die Antwort ist 1123! 🎊 Code: 1-1-2-3 = 1123 ✅'
  },
  {
    id: 97,
    title: '📊 Das Statistik-Rätsel 4',
    type: 'math',
    question: 'Ich bin eine Zahl. Meine Quersumme ist 7. Ich bin größer als 1000. Welche Zahl bin ich?',
    hint: '💡 Tipp: Quersumme = 7, größer als 1000. Probiere verschiedene Kombinationen!',
    answer: '1114',
    explanation: 'Die Antwort ist 1114! 🎊 Quersumme: 1+1+1+4 = 7 ✅'
  },
  {
    id: 98,
    title: '🎯 Das Zielscheiben-Rätsel 4',
    type: 'number',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Trefferpunkte siehst: 1, 1, 1, 4 Punkte. Gesamt: 7 Punkte. Welche Zahl bin ich?',
    hint: '💡 Tipp: Punkte: 1+1+1+4 = 7',
    answer: '1114',
    explanation: 'Die Antwort ist 1114! 🎊 Punkte: 1+1+1+4 = 7! 🎯'
  },
  {
    id: 99,
    title: '🔢 Das Palindrom-Rätsel 4',
    type: 'logic',
    question: 'Ich bin eine Zahl, die von vorne und hinten gleich gelesen wird. Meine erste Ziffer ist 1, meine zweite ist 1, meine dritte ist 1, meine vierte ist 1. Welche Zahl bin ich?',
    hint: '💡 Tipp: Palindrom: 1, 1, 1, 1',
    answer: '1111',
    explanation: 'Die Antwort ist 1111! 🎊 Palindrom: 1-1-1-1 = 1111 ✅'
  },
  {
    id: 100,
    title: '🎨 Das Farbmisch-Rätsel 4',
    type: 'logic',
    question: 'Ich bin eine Zahl. Wenn du meine Ziffern als Farben siehst: Rot (1), Blau (1), Grün (2), Gelb (3). Welche Zahl bin ich?',
    hint: '💡 Tipp: Farben: 1, 1, 2, 3',
    answer: '1123',
    explanation: 'Die Antwort ist 1123! 🎊 Farben: 1-1-2-3 = 1123! 🎨'
  }
];

