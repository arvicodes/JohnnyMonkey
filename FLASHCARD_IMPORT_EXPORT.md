# Karteideck Import/Export Funktionalität

Diese Funktionalität ermöglicht es Benutzern, Karteidecks in und aus Word-Dokumenten (.docx) und Text-Dateien (.txt) zu importieren und zu exportieren.

## Features

### Export zu Word (.docx)
- Exportiert das aktuelle Karteideck als strukturiertes Word-Dokument
- Enthält Titel, Beschreibung und alle Karten in einer übersichtlichen Tabelle
- Jede Karte zeigt Vorderseite, Rückseite, Tipp und Schwierigkeitsgrad
- Automatische Dateinamen-Generierung basierend auf dem Deck-Titel

### Import von Text-Dateien (.txt)
- Importiert Karteidecks aus einfachen Text-Dateien
- Unterstützt das folgende Format:

```
Deck-Titel
Karte 1
Frage oder Begriff
Antwort oder Definition
Tipp: Optionaler Hinweis

Karte 2
Frage oder Begriff
Antwort oder Definition
Tipp: Optionaler Hinweis
```

## Verwendung

### In der Karteideck-Erstellung
1. Öffnen Sie den FlashcardCreator
2. Wechseln Sie zum "Import / Export" Tab
3. Verwenden Sie die Import- oder Export-Funktionen

### Demo-Seite
Besuchen Sie `/flashcard-import-export` um die Funktionalität zu testen.

## Technische Details

### Export-Format
- Verwendet die `docx` Bibliothek für Word-Dokumente
- Erstellt eine Tabelle mit zwei Spalten (Vorderseite/Rückseite)
- Jede Karte wird als separate Zeile dargestellt
- Metadaten (Tipp, Schwierigkeit) werden unter der Vorderseite angezeigt

### Import-Parsing
- Einfacher Text-Parser für .txt Dateien
- Erkennt Karten anhand von "Karte X" Markierungen
- Automatische Zuordnung von Vorderseite und Rückseite
- Unterstützt optionale Tipps

### Unterstützte Dateiformate
- **Export**: .docx (Word-Dokumente)
- **Import**: .txt (Text-Dateien), .docx (Grundlegende Unterstützung)

## Beispiel-Text-Datei

```
Mathematik Grundlagen
Karte 1
Was ist die Summe von 5 + 3?
8
Tipp: Zähle die Zahlen zusammen

Karte 2
Was ist das Ergebnis von 10 - 4?
6
Tipp: Ziehe die zweite Zahl von der ersten ab
```

## Zukünftige Verbesserungen

- Vollständige .docx Import-Unterstützung
- Export in andere Formate (PDF, CSV)
- Batch-Import mehrerer Dateien
- Validierung der importierten Daten
- Automatische Duplikatserkennung

## Abhängigkeiten

- `docx`: Für Word-Dokument-Erstellung
- `file-saver`: Für Datei-Downloads
- React und TypeScript für die Benutzeroberfläche
