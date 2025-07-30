# Quiz-Datei Format

Das System kann automatisch Quizze aus Word-Dateien (.docx, .doc) oder Textdateien (.txt) generieren.

## Unterstützte Dateiformate
- `.docx` (Word 2007+)
- `.doc` (Word 97-2003)
- `.txt` (Textdatei)

## Format-Schema

Jede Frage muss dem folgenden Schema folgen:

```
• [Frage]
a) [Erste Antwort - ist immer richtig]
b) [Zweite Antwort]
c) [Dritte Antwort]
d) [Vierte Antwort]
```

### Erlaubte Listenpunkte
- `•` (Bullet Point)
- `-` (Bindestrich)
- `*` (Stern)
- `1.` (Nummerierung)

### Antwortformat
- Antworten müssen mit `a)`, `b)`, `c)`, `d)` etc. beginnen
- Die erste Antwort (a)) ist immer die richtige Antwort
- Mindestens 2 Antwortoptionen pro Frage erforderlich

## Beispiel

```
Mathematik Quiz

• Was ist die Summe von 5 + 3?
a) 8
b) 7
c) 9
d) 6

• Welche Form hat ein Kreis?
a) Rund
b) Eckig
c) Dreieckig
d) Quadratisch

• Was ist die Hälfte von 20?
a) 10
b) 15
c) 5
d) 25
```

## Wichtige Hinweise

1. **Erste Antwort ist immer richtig**: Die Antwort mit `a)` wird automatisch als korrekte Antwort markiert
2. **Mindestens 2 Antworten**: Jede Frage muss mindestens 2 Antwortoptionen haben
3. **Leerzeilen erlaubt**: Zwischen Fragen können Leerzeilen stehen
4. **Mehrzeilige Fragen**: Fragen können über mehrere Zeilen gehen
5. **Zeichenkodierung**: Verwenden Sie UTF-8 für Sonderzeichen

## Fehlerbehebung

- **Keine Fragen gefunden**: Überprüfen Sie, ob die Fragen mit Listenpunkten beginnen
- **Fehlende Antworten**: Stellen Sie sicher, dass jede Frage mindestens 2 Antwortoptionen hat
- **Falsche Formatierung**: Antworten müssen mit `a)`, `b)`, `c)` etc. beginnen 