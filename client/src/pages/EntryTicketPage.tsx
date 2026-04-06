import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  RestartAlt as RestartAltIcon,
  SkipNext as SkipNextIcon,
  SkipPrevious as SkipPreviousIcon,
} from '@mui/icons-material';
import { determinateLinearProgressSx } from '../lib/muiLinearProgressSx';
import { apiGet, apiPost } from '../lib/api';
import { entryTicketHeroSrc } from '../lib/ticketHeroImages';

type EntryTicketTask = {
  category: string;
  prompt: string;
  solution: string;
};

const SLIDE_DURATION_SEC = 10;
/** Zufällige Auswahl aus dem klassenspezifischen Fragenset */
const TARGET_TASK_COUNT = 10;
const DISPLAY_BOX_WIDTH = 1320;
const DISPLAY_BOX_HEIGHT = 340;
const FINAL_DISPLAY_BOX_HEIGHT = 500;
const OPERATOR_COLOR = '#ef6c00';
const QUESTION_COLOR = '#d32f2f';

type GradeNum = 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
/** Zusätzliche Kurs-Bänder (eigene Fragensätze, Start wie Klassenstufe 11/12/13). */
type InfBand = 'inf11' | 'inf12' | 'inf13';
type EntryBand = GradeNum | InfBand;
type GradeQuestionSets = Record<EntryBand, EntryTicketTask[]>;

function fragensetHeadingLabel(band: EntryBand): string {
  if (band === 'inf11') return 'Inf 11';
  if (band === 'inf12') return 'Inf 12';
  if (band === 'inf13') return 'Inf 13';
  return `Klasse ${band}`;
}
type CoarseCategory =
  | 'Grundrechenarten'
  | 'Bruch/Dezimal/Prozent'
  | 'Geometrie/Einheiten'
  | 'Zeit/Geld/Alltag'
  | 'Logik/Muster'
  | 'Wahr/Falsch'
  | 'Eigen';

const ENTRY_TICKET_TASK_POOL: EntryTicketTask[] = [
  { category: 'Kopfrechnen', prompt: '375 + 489 - 126 = ?', solution: '738' },
  { category: 'Negativzahlen', prompt: '-12 + 35 - 9 = ?', solution: '14' },
  { category: 'Multiplikation', prompt: '24 · 16 = ?', solution: '384' },
  { category: 'Proportional', prompt: '3 Hefte kosten 4,50 €. 7 Hefte kosten ?', solution: '10,50 €' },
  { category: 'Division', prompt: '840 : 24 = ?', solution: '35' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 3/4 ist kleiner als 2/3.', solution: 'Falsch' },
  { category: 'Überschlag', prompt: '49,80 € + 19,90 € grob gerundet = ?', solution: 'ca. 70 €' },
  { category: 'Geld', prompt: '50 € - 18,70 € - 9,95 € = ?', solution: '21,35 €' },
  { category: 'Einheiten', prompt: '3,75 m = ? cm', solution: '375' },
  { category: 'Einheiten', prompt: '2,4 l = ? ml', solution: '2400' },
  { category: 'Umfang', prompt: 'Rechteck 8 cm und 5 cm: Umfang = ?', solution: '26 cm' },
  { category: 'Zeit', prompt: 'Start 09:35 Uhr, Dauer 2 h 25 min. Ende um ? Uhr.', solution: '12:00' },
  { category: 'Zeit', prompt: 'Von 08:50 Uhr bis 11:35 Uhr = ? min', solution: '165' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 2,5 l sind 250 ml.', solution: 'Falsch' },
  { category: 'Bruch', prompt: '3/4 + 2/3 = ?', solution: '17/12 (1 5/12)' },
  { category: 'Bruch', prompt: '5/8 von 64 = ?', solution: '40' },
  { category: 'Dezimal', prompt: '4,75 + 2,9 - 1,35 = ?', solution: '6,30' },
  { category: 'Dezimal', prompt: '0,25 · 48 = ?', solution: '12' },
  { category: 'Prozent', prompt: '15% von 240 = ?', solution: '36' },
  { category: 'Prozent', prompt: '240 € + 12% = ?', solution: '268,80 €' },
  { category: 'Prozent', prompt: '320 € - 17,5% = ?', solution: '264 €' },
  { category: 'Supermarkt', prompt: '6 · 1,79 € + 3 · 2,49 € = ?', solution: '18,21 €' },
  { category: 'Schätzen', prompt: '1,98 m ist näher an 1,5 m oder 2,0 m?', solution: '2,0 m' },
  { category: 'Regalmaße', prompt: '2 Bretter 118 cm + 3 Bretter 74 cm = ?', solution: '458 cm' },
  { category: 'Regalmaße', prompt: 'Wand 2,60 m - Regal 2,15 m = ? cm', solution: '45' },
  { category: 'Kopfrechnen', prompt: '48 · 25 = ?', solution: '1200' },
  { category: 'Kopfrechnen', prompt: '1331 : 11 = ?', solution: '121' },
  { category: 'Muster', prompt: 'Zahlenmuster: 3, 6, 12, 24, ... nächste Zahl = ?', solution: '48' },
  { category: 'Einheiten', prompt: '2,75 km + 850 m = ? m', solution: '3600' },
  { category: 'Zeit', prompt: 'Film 1 h 58 min, Start 20:17 Uhr. Ende um ? Uhr.', solution: '22:15' },
  { category: 'Bruch/Dezimal', prompt: '7/8 als Dezimalzahl = ?', solution: '0,875' },
  { category: 'Prozent', prompt: '3,5% von 800 = ?', solution: '28' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 15% von 200 sind 25.', solution: 'Falsch' },
  { category: 'Alltag', prompt: '36 km bei 90 km/h = ? min', solution: '24' },
  { category: 'Logik', prompt: '3 Kisten mit je 12 Flaschen, 5 Flaschen kaputt. Wie viele ganz?', solution: '31' },
  { category: 'Mittelwert', prompt: 'Noten 2, 3, 2, 1. Durchschnitt = ?', solution: '2,0' },
  { category: 'Fläche', prompt: 'Rechteck 12 cm · 7 cm: Fläche = ?', solution: '84 cm²' },
  { category: 'Skalierung', prompt: 'Rezept für 4 Personen, du kochst für 6: Faktor = ?', solution: '1,5' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 0,4 entspricht 40%.', solution: 'Wahr' },
  { category: 'Reihenfolge', prompt: 'Ordne aufsteigend: 0,5 ; 0,05 ; 0,55.', solution: '0,05 < 0,5 < 0,55' },
  { category: 'Geometrie', prompt: 'Quadrat mit Seitenlänge 9 cm: Fläche = ?', solution: '81 cm²' },
  { category: 'Kombi', prompt: '2 T-Shirts à 14,90 € und 1 Hose 39,90 €: Gesamt = ?', solution: '69,70 €' },
];

const TASK_POOL_5: EntryTicketTask[] = [
  { category: 'Addition', prompt: '48 + 27 = ?', solution: '75' },
  { category: 'Addition', prompt: '125 + 340 = ?', solution: '465' },
  { category: 'Subtraktion', prompt: '130 - 58 = ?', solution: '72' },
  { category: 'Subtraktion', prompt: '400 - 175 = ?', solution: '225' },
  { category: 'Multiplikation', prompt: '6 · 7 = ?', solution: '42' },
  { category: 'Multiplikation', prompt: '9 · 8 = ?', solution: '72' },
  { category: 'Division', prompt: '96 : 8 = ?', solution: '12' },
  { category: 'Division', prompt: '84 : 7 = ?', solution: '12' },
  { category: 'Kombiniert', prompt: '25 + 18 - 9 = ?', solution: '34' },
  { category: 'Kombiniert', prompt: '7 · 6 + 5 = ?', solution: '47' },
  { category: 'Kombiniert', prompt: '40 - 4 · 5 = ?', solution: '20' },
  { category: 'Kombiniert', prompt: '(18 + 12) : 3 = ?', solution: '10' },
  { category: 'Umfang', prompt: 'Rechteck: 6 cm und 4 cm. Umfang = ?', solution: '20 cm' },
  { category: 'Umfang', prompt: 'Quadrat mit Seite 7 cm. Umfang = ?', solution: '28 cm' },
  { category: 'Flächeninhalt', prompt: 'Rechteck: 5 cm · 3 cm. Fläche = ?', solution: '15 cm²' },
  { category: 'Flächeninhalt', prompt: 'Rechteck: 8 cm · 2 cm. Fläche = ?', solution: '16 cm²' },
  { category: 'Einheiten', prompt: '2 m = ? cm', solution: '200' },
  { category: 'Einheiten', prompt: '350 cm = ? m', solution: '3,5' },
  { category: 'Einheiten', prompt: '1 l = ? ml', solution: '1000' },
  { category: 'Einheiten', prompt: '90 min = ? h', solution: '1,5' },
  { category: 'Zeit', prompt: 'Start 08:45 Uhr, Dauer 55 min. Ende um ? Uhr.', solution: '09:40' },
  { category: 'Zeit', prompt: 'Von 10:20 Uhr bis 11:05 Uhr = ? min', solution: '45' },
  { category: 'Geld', prompt: '3,40 € + 2,80 € + 1,20 € = ?', solution: '7,40 €' },
  { category: 'Geld', prompt: 'Du gibst 20 €. Rechnung 13,70 €. Rückgeld = ?', solution: '6,30 €' },
  { category: 'Alltag', prompt: 'Bus fährt 6 km in 15 min. 18 km dauern ? min', solution: '45' },
  { category: 'Alltag', prompt: 'Regal: 2 Bretter à 40 cm und 1 Brett à 30 cm. Gesamt = ? cm', solution: '110' },
  { category: 'Alltag', prompt: 'Einkauf: 2 Brötchen à 0,45 € und 1 Saft 1,20 €. Gesamt = ?', solution: '2,10 €' },
  { category: 'Alltag', prompt: 'Schulweg hin 1,5 km und zurück 1,5 km. Zusammen = ? km', solution: '3' },
];

const TASK_POOL_6: EntryTicketTask[] = [
  { category: 'Kopfrechnen', prompt: '67 + 28 = ?', solution: '95' },
  { category: 'Kopfrechnen', prompt: '200 - 79 = ?', solution: '121' },
  { category: 'Multiplikation', prompt: '12 · 7 = ?', solution: '84' },
  { category: 'Division', prompt: '144 : 9 = ?', solution: '16' },
  { category: 'Einheiten', prompt: '1,6 km = ? m', solution: '1600' },
  { category: 'Einheiten', prompt: '900 ml = ? l', solution: '0,9' },
  { category: 'Zeit', prompt: 'Start 13:25 Uhr, Dauer 45 min. Ende um ? Uhr.', solution: '14:10' },
  { category: 'Zeit', prompt: 'Von 09:10 Uhr bis 10:00 Uhr = ? min', solution: '50' },
  { category: 'Geld', prompt: '5 · 1,25 € = ?', solution: '6,25 €' },
  { category: 'Geld', prompt: 'Du gibst 10 €. Rechnung 7,85 €. Rückgeld = ?', solution: '2,15 €' },
  { category: 'Bruch', prompt: '2/3 von 30 = ?', solution: '20' },
  { category: 'Prozent', prompt: '25% von 80 = ?', solution: '20' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 1/4 entspricht 0,25.', solution: 'Wahr' },
  { category: 'Alltag', prompt: '3 Brote à 2,40 € = ?', solution: '7,20 €' },
  { category: 'Alltag', prompt: 'Regalhöhe: 3 Böden à 28 cm + 2 Abstände à 4 cm = ? cm', solution: '92' },
  { category: 'Alltag', prompt: 'Supermarkt: 4 Joghurts à 0,65 € + 1 Milch 1,25 € = ?', solution: '3,85 €' },
  { category: 'Alltag', prompt: 'Fahrradweg: 12 km bei 6 km in 20 min. Dauer = ? min', solution: '40' },
  { category: 'Alltag', prompt: 'Umweg: 850 m + 1,2 km = ? m', solution: '2050' },
];

const TASK_POOL_9: EntryTicketTask[] = [
  { category: 'Kopfrechnen', prompt: '920 - 347 + 88 = ?', solution: '661' },
  { category: 'Multiplikation', prompt: '35 · 18 = ?', solution: '630' },
  { category: 'Division', prompt: '144 : 12 = ?', solution: '12' },
  { category: 'Bruch', prompt: '3/5 von 20 = ?', solution: '12' },
  { category: 'Bruch/Dezimal', prompt: '3/4 als Dezimalzahl = ?', solution: '0,75' },
  { category: 'Dezimal', prompt: '2,5 - 0,75 = ?', solution: '1,75' },
  { category: 'Prozent', prompt: '25% von 60 = ?', solution: '15' },
  { category: 'Prozent', prompt: '120 € um 20% reduziert = ?', solution: '96 €' },
  { category: 'Einheiten', prompt: '1,2 km = ? m', solution: '1200' },
  { category: 'Zeit', prompt: 'Start 19:30 Uhr, Dauer 1 h 50 min. Ende um ? Uhr.', solution: '21:20' },
  { category: 'Alltag', prompt: '4 Joghurts je 0,65 € = ?', solution: '2,60 €' },
  { category: 'Regalmaße', prompt: 'Regalbrett: 120 cm - 2 · 3 cm Seitenteil = ? cm', solution: '114' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 15% von 200 sind 25.', solution: 'Falsch' },
  { category: 'Alltag', prompt: 'Ikea: 3 Bretter à 119 cm + 2 Seiten à 201 cm = ? cm', solution: '759' },
  { category: 'Alltag', prompt: 'Rabatt: Schuhpreis 89,90 € mit 15% Rabatt = ?', solution: '76,42 €' },
  { category: 'Alltag', prompt: 'Fahrt: 42 km bei 70 km/h. Zeit = ? min', solution: '36' },
  { category: 'Alltag', prompt: 'Einkauf: 2,5 kg Äpfel à 2,80 €/kg + 1,2 kg Bananen à 2,10 €/kg = ?', solution: '9,52 €' },
];

const TASK_POOL_10: EntryTicketTask[] = [
  { category: 'Kopfrechnen', prompt: '540 - 275 + 63 = ?', solution: '328' },
  { category: 'Multiplikation', prompt: '48 · 25 = ?', solution: '1200' },
  { category: 'Division', prompt: '1331 : 11 = ?', solution: '121' },
  { category: 'Bruch', prompt: '5/8 von 64 = ?', solution: '40' },
  { category: 'Dezimal', prompt: '4,75 + 2,9 - 1,35 = ?', solution: '6,30' },
  { category: 'Prozent', prompt: '15% von 240 = ?', solution: '36' },
  { category: 'Prozent', prompt: '120 € um 20% reduziert = ?', solution: '96 €' },
  { category: 'Einheiten', prompt: '2,75 km + 850 m = ? m', solution: '3600' },
  { category: 'Zeit', prompt: 'Film 1 h 58 min, Start 20:17 Uhr. Ende um ? Uhr.', solution: '22:15' },
  { category: 'Alltag', prompt: '36 km bei 90 km/h = ? min', solution: '24' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 3/4 ist kleiner als 2/3.', solution: 'Falsch' },
  { category: 'Alltag', prompt: 'Regalwand: 2,80 m breit, Regal 2,35 m. Rest = ? cm', solution: '45' },
  { category: 'Alltag', prompt: 'Tank: 38 l à 1,79 €/l = ?', solution: '68,02 €' },
  { category: 'Alltag', prompt: 'Lieferweg 54 km bei 90 km/h. Dauer = ? min', solution: '36' },
  { category: 'Alltag', prompt: 'Einkauf: 3 Artikel à 14,90 € und 2 Artikel à 7,50 € = ?', solution: '59,70 €' },
];

const TASK_POOL_11: EntryTicketTask[] = [
  { category: 'Prozent', prompt: '3,5% von 800 = ?', solution: '28' },
  { category: 'Prozent', prompt: '240 € + 12% = ?', solution: '268,80 €' },
  { category: 'Prozent', prompt: '320 € - 17,5% = ?', solution: '264 €' },
  { category: 'Bruch', prompt: '3/4 + 2/3 = ?', solution: '17/12 (1 5/12)' },
  { category: 'Mittelwert', prompt: 'Noten 2, 3, 2, 1. Durchschnitt = ?', solution: '2,0' },
  { category: 'Logik', prompt: '3 Kisten mit je 12 Flaschen, 5 Flaschen kaputt. Wie viele ganz?', solution: '31' },
  { category: 'Reihenfolge', prompt: 'Ordne aufsteigend: 0,5 ; 0,05 ; 0,55.', solution: '0,05 < 0,5 < 0,55' },
  { category: 'Fläche', prompt: 'Rechteck 12 cm · 7 cm: Fläche = ?', solution: '84 cm²' },
  { category: 'Geometrie', prompt: 'Quadrat mit Seitenlänge 9 cm: Fläche = ?', solution: '81 cm²' },
  { category: 'Skalierung', prompt: 'Rezept für 4 Personen, du kochst für 6: Faktor = ?', solution: '1,5' },
  { category: 'Kombi', prompt: '6 · 1,79 € + 3 · 2,49 € = ?', solution: '18,21 €' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 0,4 entspricht 40%.', solution: 'Wahr' },
  { category: 'Alltag', prompt: 'Möbelprojekt: 6 Bretter à 0,85 m und 4 Bretter à 0,42 m = ? m', solution: '6,78' },
  { category: 'Alltag', prompt: 'Anfahrt: 84 km bei 70 km/h plus 18 min Pause. Gesamtzeit = ? min', solution: '90' },
  { category: 'Alltag', prompt: 'Wocheneinkauf: 12% Rabatt auf 186,50 € = neuer Preis ?', solution: '164,12 €' },
  { category: 'Alltag', prompt: 'Strecke: 2,4 km zu Fuß + 18 km Bus + 450 m zu Fuß = ? km', solution: '20,85' },
];

const TASK_POOL_12: EntryTicketTask[] = [
  { category: 'Prozent', prompt: '240 € + 12% = ?', solution: '268,80 €' },
  { category: 'Prozent', prompt: '320 € - 17,5% = ?', solution: '264 €' },
  { category: 'Bruch', prompt: '3/4 + 2/3 = ?', solution: '17/12 (1 5/12)' },
  { category: 'Reihenfolge', prompt: 'Ordne aufsteigend: 0,5 ; 0,05 ; 0,55.', solution: '0,05 < 0,5 < 0,55' },
  { category: 'Fläche', prompt: 'Rechteck 12 cm · 7 cm: Fläche = ?', solution: '84 cm²' },
  { category: 'Kombi', prompt: '2 T-Shirts à 14,90 € und 1 Hose 39,90 €: Gesamt = ?', solution: '69,70 €' },
  { category: 'Mittelwert', prompt: 'Noten 1, 2, 2, 3. Durchschnitt = ?', solution: '2,0' },
  { category: 'Alltag', prompt: 'Küchenplanung: 5 Schränke à 60 cm + 2 Blenden à 2 cm = ? cm', solution: '304' },
  { category: 'Alltag', prompt: 'Einkauf: 3,4 kg Obst à 2,90 €/kg + 2 Brote à 3,20 € = ?', solution: '16,26 €' },
  { category: 'Alltag', prompt: 'Fahrt: 126 km bei 84 km/h. Dauer = ? min', solution: '90' },
  { category: 'Alltag', prompt: 'Preissteigerung: 249 € um 8% erhöht = ?', solution: '268,92 €' },
];

const TASK_POOL_13: EntryTicketTask[] = [
  { category: 'Logik', prompt: '3 Kisten mit je 12 Flaschen, 5 Flaschen kaputt. Wie viele ganz?', solution: '31' },
  { category: 'Skalierung', prompt: 'Rezept für 4 Personen, du kochst für 6: Faktor = ?', solution: '1,5' },
  { category: 'Geometrie', prompt: 'Quadrat mit Seitenlänge 9 cm: Fläche = ?', solution: '81 cm²' },
  { category: 'Reihenfolge', prompt: 'Ordne aufsteigend: 0,5 ; 0,05 ; 0,55.', solution: '0,05 < 0,5 < 0,55' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 0,4 entspricht 40%.', solution: 'Wahr' },
  { category: 'Alltag', prompt: 'Projektkalkulation: 14 Bretter à 1,35 m + Verschnitt 8% = ? m', solution: '20,41' },
  { category: 'Alltag', prompt: 'Pendeln: 32 km je Strecke, 5 Tage/Woche, 38 Wochen = ? km', solution: '12160' },
  { category: 'Alltag', prompt: 'Mengenrabatt: 12% auf 1.480 € und danach 3% Skonto = ?', solution: '1263,89 €' },
  { category: 'Alltag', prompt: 'Reisezeit: 210 km bei 105 km/h + 25 min Stopp = ? min', solution: '145' },
];

/** Grundlagen Informatik – Inf 11: Kategorien Allgemein, Java, OO, Technische Informatik, Digitaltechnik, KI (je 10 Fragen) */
const TASK_POOL_INF_11: EntryTicketTask[] = [
  // Allgemein
  { category: 'Allgemein', prompt: 'Was ist die zentrale Aufgabe eines Betriebssystems in einem Satz?', solution: 'Hardware verwalten und Programmausführung ermöglichen' },
  { category: 'Allgemein', prompt: 'Wahr oder falsch: „Open Source“ bedeutet immer, die Software sei kostenlos.', solution: 'Falsch' },
  { category: 'Allgemein', prompt: 'Was beschreibt ein Algorithmus?', solution: 'Eine endliche, eindeutige Vorschrift zur Problemlösung' },
  { category: 'Allgemein', prompt: 'IDE vs. reiner Texteditor: Nenne zwei typische Zusatzfunktionen einer IDE.', solution: 'z. B. Debugger, Syntaxhervorhebung, Build, Projektverwaltung (zwei)' },
  { category: 'Allgemein', prompt: 'Wahr oder falsch: JSON ist eine Programmiersprache.', solution: 'Falsch' },
  { category: 'Allgemein', prompt: 'Wofür wird ein Versionskontrollsystem wie Git in der Praxis genutzt?', solution: 'Änderungen nachverfolgen, zusammenarbeiten, Historie' },
  { category: 'Allgemein', prompt: 'Im Client-Server-Modell: Wer startet typischerweise die Anfrage?', solution: 'Client' },
  { category: 'Allgemein', prompt: 'Wahr oder falsch: Jede Dateiendung ist weltweit eindeutig einem Format zugeordnet.', solution: 'Falsch' },
  { category: 'Allgemein', prompt: 'Was ist eine API in einem Satz?', solution: 'Schnittstelle, über die Programme miteinander sprechen' },
  { category: 'Allgemein', prompt: 'Backup-Strategie „3-2-1“: Was bedeuten die drei Zahlen grob?', solution: '3 Kopien, 2 Medien/Orte, 1 extern/offsite' },
  // Java
  { category: 'Java', prompt: 'Welche Dateiendung hat eine typische Java-Quelldatei?', solution: '.java' },
  { category: 'Java', prompt: 'Wahr oder falsch: Java-Quellcode wird in Bytecode übersetzt und auf der JVM ausgeführt.', solution: 'Wahr' },
  { category: 'Java', prompt: 'Wofür steht die Abkürzung JVM?', solution: 'Java Virtual Machine' },
  { category: 'Java', prompt: 'Vollständige Signatur der Einstiegsmethode main in Java?', solution: 'public static void main(String[] args)' },
  { category: 'Java', prompt: 'Wahr oder falsch: Der Typ int ist ein primitiver Datentyp in Java.', solution: 'Wahr' },
  { category: 'Java', prompt: 'Wahr oder falsch: Eine Klasse kann in Java von mehreren Klassen gleichzeitig erben (extends).', solution: 'Falsch' },
  { category: 'Java', prompt: 'Welches Schlüsselwort leitet eine Paketdeklaration ein?', solution: 'package' },
  { category: 'Java', prompt: 'Sind String-Objekte in Java nach Erzeugung veränderbar (mutable)? (ja/nein)', solution: 'nein' },
  { category: 'Java', prompt: 'Welche zwei Schlüsselwörter nutzt man typischerweise zum Abfangen von Ausnahmen?', solution: 'try und catch' },
  { category: 'Java', prompt: 'Nenne ein typisches Interface für eine geordnete, indexierbare Liste in Java.', solution: 'List (z. B. ArrayList)' },
  // OO
  { category: 'OO', prompt: 'Was kapselt eine Klasse in der Objektorientierung typischerweise?', solution: 'Zustand (Attribute) und Verhalten (Methoden)' },
  { category: 'OO', prompt: 'Wahr oder falsch: Vererbung modelliert oft eine „ist-ein“-Beziehung.', solution: 'Wahr' },
  { category: 'OO', prompt: 'Was ermöglicht Polymorphismus grob?', solution: 'Gleiche Schnittstelle, verschiedene Implementierungen' },
  { category: 'OO', prompt: 'Wann wird ein Konstruktor einer Klasse aufgerufen?', solution: 'Beim Erzeugen eines Objekts (new …)' },
  { category: 'OO', prompt: 'Wer darf auf als private deklarierte Attribute zugreifen?', solution: 'Nur die eigene Klasse' },
  { category: 'OO', prompt: 'Wahr oder falsch: Ein Interface in Java kann direkt mit new instanziiert werden.', solution: 'Falsch' },
  { category: 'OO', prompt: 'Gehört eine statische Methode zur Instanz oder zur Klasse?', solution: 'Zur Klasse' },
  { category: 'OO', prompt: 'Darf man von einer abstrakten Klasse direkt ein Objekt erzeugen? (ja/nein)', solution: 'nein' },
  { category: 'OO', prompt: '„Hund ist ein Tier“ – modelliert man das eher mit Vererbung oder mit Assoziation?', solution: 'Vererbung' },
  { category: 'OO', prompt: 'Wozu dienen Getter- und Setter-Methoden typischerweise?', solution: 'Kontrollierter Zugriff auf Attribute / Kapselung' },
  // Technische Informatik: Von-Neumann, Hardware, Murmelrechner, Johnny-Simulator & Mikrobefehle
  { category: 'Technische Informatik', prompt: 'Von-Neumann-Architektur: Wo liegen Programmcode und Daten typischerweise?', solution: 'Im gemeinsamen Hauptspeicher' },
  { category: 'Technische Informatik', prompt: 'Von-Neumann-CPU: Welche beiden zentralen funktionalen Teile bilden mit Registern oft die CPU ab?', solution: 'Rechenwerk und Leitwerk (Steuerwerk)' },
  { category: 'Technische Informatik', prompt: 'Hardware: Was verbindet CPU, Arbeitsspeicher und Anbindungen zur Peripherie typischerweise?', solution: 'Systembus(se) (Daten-, Adress- und Steuerbus)' },
  { category: 'Technische Informatik', prompt: 'Murmelrechner: Welche Idee aus der Informatik wird damit oft sichtbar gemacht?', solution: 'Steuerbare/mechanische Abläufe wie ein sehr einfacher „Computer“ ohne Elektronik (Algorithmus nachvollziehen)' },
  { category: 'Technische Informatik', prompt: 'Johnny-Simulator: Welcher Kernzyklus beschreibt die Abarbeitung eines Maschinenbefehls typischerweise?', solution: 'Holen – Dekodieren – Ausführen (Fetch–Decode–Execute)' },
  { category: 'Technische Informatik', prompt: 'Johnny: Wozu dient der Akkumulator typischerweise?', solution: 'Zwischenspeicher für Operanden und Ergebnisse (ein zentraler Wert)' },
  { category: 'Technische Informatik', prompt: 'Johnny: Was macht der Mikrobefehl LDA (Load) grob?', solution: 'Wert aus dem Speicher an der Adresse in den Akkumulator laden' },
  { category: 'Technische Informatik', prompt: 'Johnny: Was macht STA (Store) grob?', solution: 'Akkumulatorwert an eine Speicheradresse schreiben' },
  { category: 'Technische Informatik', prompt: 'Johnny: Was macht ADD grob?', solution: 'Speicherwert zum Akkumulator addieren' },
  { category: 'Technische Informatik', prompt: 'Johnny: Was macht SUB grob?', solution: 'Speicherwert vom Akkumulator subtrahieren' },
  // Digitaltechnik
  { category: 'Digitaltechnik', prompt: 'Wozu dient das Zweierkomplement bei Festkomma-Darstellung typischerweise?', solution: 'Darstellung negativer Zahlen' },
  { category: 'Digitaltechnik', prompt: 'Wahr oder falsch: Ein Halbaddierer berücksichtigt den Übertrag einer niedrigeren Stelle.', solution: 'Falsch' },
  { category: 'Digitaltechnik', prompt: 'Was macht ein Multiplexer grob?', solution: 'Wählt eine von vielen Eingangsleitungen auf eine Ausgangsleitung' },
  { category: 'Digitaltechnik', prompt: 'Schaltalgebra: A AND 1 = ? (in Abhängigkeit von A)', solution: 'A' },
  { category: 'Digitaltechnik', prompt: 'Was speichert ein Flipflop typischerweise?', solution: 'Ein Bit' },
  { category: 'Digitaltechnik', prompt: 'Wahr oder falsch: Mit NAND-Gattern lässt sich jede boolesche Funktion aufbauen (funktionale Vollständigkeit).', solution: 'Wahr' },
  { category: 'Digitaltechnik', prompt: 'Was transportiert ein Bus in einem Rechner?', solution: 'Daten/Adressen/Steuersignale zwischen Bausteinen' },
  { category: 'Digitaltechnik', prompt: 'Sind SRAM und DRAM flüchtig oder nicht flüchtig?', solution: 'flüchtig' },
  { category: 'Digitaltechnik', prompt: 'Was macht ein Encoder typischerweise?', solution: 'Viele Eingänge auf weniger Ausgabebits abbilden' },
  { category: 'Digitaltechnik', prompt: 'Höhere Taktfrequenz der CPU bedeutet oft auch was für die Leistungsaufnahme?', solution: 'höher (meist)' },
  // KI
  { category: 'KI', prompt: 'Was ist der Unterschied zwischen überwachtem und unüberwachtem Lernen in einem Satz?', solution: 'Überwacht: mit Labels; unüberwacht: ohne Zielvorgaben/Muster suchen' },
  { category: 'KI', prompt: 'Wahr oder falsch: Neuronale Netze brauchen immer beschriftete Trainingsdaten.', solution: 'Falsch' },
  { category: 'KI', prompt: 'Was ist Overfitting?', solution: 'Modell lernt Trainingsdaten zu genau auswendig, generalisiert schlecht' },
  { category: 'KI', prompt: 'Wozu dient ein Validierungsdatensatz typischerweise?', solution: 'Modell/Hyperparameter wählen ohne den Testdatensatz zu verfälschen' },
  { category: 'KI', prompt: 'Warum können verzerrte Trainingsdaten (Bias) problematisch sein?', solution: 'Modell diskriminiert oder trifft unfaire Vorhersagen' },
  { category: 'KI', prompt: 'Wahr oder falsch: „Starke KI“ (AGI) ist in der Schule als gelöstes Standardthema behandelt.', solution: 'Falsch' },
  { category: 'KI', prompt: 'Was ist ein „Feature“ beim maschinellen Lernen?', solution: 'Eingabegröße / gemessenes Attribut' },
  { category: 'KI', prompt: 'Warum gelten manche KI-Modelle als „Black Box“?', solution: 'Entscheidungen sind schwer nachvollziehbar / wenig transparent' },
  { category: 'KI', prompt: 'Welche Architektur/Technik steckt oft hinter großen Sprachmodellen (z. B. ChatGPT-ähnlich)?', solution: 'Transformer / LLM (große neuronale Netze)' },
  { category: 'KI', prompt: 'Nenne ein ethisches Prinzip neben Transparenz bei KI-Systemen.', solution: 'z. B. Fairness, Datenschutz, Rechenschaftspflicht, Menschliche Aufsicht' },
];

/** Grundlagen Informatik – Inf 12: Python, Programmiergrundlagen, Algorithmen, Darstellung, Netzwerke, Internet, Datenbanken (je 10) */
const TASK_POOL_INF_12: EntryTicketTask[] = [
  // Python
  { category: 'Python', prompt: 'Welche Dateiendung hat eine typische Python-Quelldatei?', solution: '.py' },
  { category: 'Python', prompt: 'Wahr oder falsch: Python wird typischerweise interpretiert (nicht vorab in Maschinencode übersetzt).', solution: 'Wahr' },
  { category: 'Python', prompt: 'Wie heißt der Datentyp für Wahrheitswerte in Python?', solution: 'bool' },
  { category: 'Python', prompt: 'Sind Python-Listen nach der Erzeugung veränderbar (mutable)? (ja/nein)', solution: 'ja' },
  { category: 'Python', prompt: 'Was liefert list(range(3)) in typischen Python-Versionen als Elemente?', solution: '0, 1, 2' },
  { category: 'Python', prompt: 'Wozu dient die Einrückung in Python syntaktisch?', solution: 'Struktur von Blöcken (z. B. nach if, for, def)' },
  { category: 'Python', prompt: 'Welches Schlüsselwort leitet eine Funktionsdefinition ein?', solution: 'def' },
  { category: 'Python', prompt: 'Womit kennzeichnet Python „kein Wert“ statt null?', solution: 'None' },
  { category: 'Python', prompt: 'Standardwerkzeug zum Installieren von Python-Paketen von PyPI?', solution: 'pip' },
  { category: 'Python', prompt: 'Listen-Abstraktion (list comprehension): was beschreibt sie in einem Satz?', solution: 'Neue Liste aus einer Ausdrucksregel über eine Iterable (kompakt)' },
  // Programmiergrundlagen
  { category: 'Programmiergrundlagen', prompt: 'Variable vs. Literal: Was ist ein Literal?', solution: 'Fester Wert direkt im Code (z. B. 42, "Hallo")' },
  { category: 'Programmiergrundlagen', prompt: 'int vs. float: Welcher Typ ist für ganze Zahlen gedacht?', solution: 'int' },
  { category: 'Programmiergrundlagen', prompt: 'for vs. while: Wann eignet sich while oft besser?', solution: 'Wenn die Wiederholungsanzahl vorher unbekannt ist' },
  { category: 'Programmiergrundlagen', prompt: 'Wahr oder falsch: Jede Programmiersprache erzwingt exakt denselben Programmierstil.', solution: 'Falsch' },
  { category: 'Programmiergrundlagen', prompt: 'Was ist ein Haltepunkt (Breakpoint) beim Debugging grob?', solution: 'Stelle, an der das Programm anhält zur Inspektion' },
  { category: 'Programmiergrundlagen', prompt: 'Interpreter vs. Compiler in einem Satz?', solution: 'Interpreter arbeitet oft zeilenweise zur Laufzeit; Compiler übersetzt vorab' },
  { category: 'Programmiergrundlagen', prompt: 'Syntax vs. Semantik: Syntax beschreibt ?', solution: 'formale Regeln der Schreibweise' },
  { category: 'Programmiergrundlagen', prompt: 'Wozu teilt man Code in Funktionen/Module ein?', solution: 'Wiederverwendbarkeit, Übersicht, Testbarkeit' },
  { category: 'Programmiergrundlagen', prompt: 'Syntaxfehler vs. Laufzeitfehler: Wann tritt ein Syntaxfehler auf?', solution: 'beim Übersetzen/Parsen (vor der Ausführung)' },
  { category: 'Programmiergrundlagen', prompt: 'Was beschreibt eine API grob?', solution: 'Schnittstelle, über die Programme zusammenarbeiten' },
  // Algorithmen (allgemein, Suchen, Sortieren, Wege)
  { category: 'Algorithmen', prompt: 'O-Notation: Was wird typischerweise abgeschätzt?', solution: 'Wachstum von Zeit- oder Speicherbedarf in n' },
  { category: 'Algorithmen', prompt: 'Lineare Suche in n Elementen: Worst-Case oft ?', solution: 'O(n)' },
  { category: 'Algorithmen', prompt: 'Binäre Suche: welche Voraussetzung an die Daten?', solution: 'sortiert / geordnet' },
  { category: 'Algorithmen', prompt: 'Mergesort: typische Worst-Case-Laufzeit?', solution: 'O(n log n)' },
  { category: 'Algorithmen', prompt: 'Bubblesort: typische Laufzeitordnung?', solution: 'O(n²)' },
  { category: 'Algorithmen', prompt: 'Dijkstra-Algorithmus: welches Problem löst er typischerweise?', solution: 'Kürzeste Wege (mit nicht-negativen Kantengewichten)' },
  { category: 'Algorithmen', prompt: 'Greedy: lokal optimale Wahl ist immer global optimal? (ja/nein)', solution: 'nein' },
  { category: 'Algorithmen', prompt: 'Dynamische Programmierung: wozu speichert man Teilprobleme?', solution: 'mehrfaches Berechnen vermeiden (überlappende Teilprobleme)' },
  { category: 'Algorithmen', prompt: 'Breitensuche (BFS) in Graphen: welche Datenstruktur typisch für die Frontier?', solution: 'Warteschlange (Queue)' },
  { category: 'Algorithmen', prompt: 'Tiefensuche (DFS) vs. BFS: welche nutzt typischerweise einen Stack bzw. Rekursion?', solution: 'DFS' },
  // Darstellung von Algorithmen
  { category: 'Darstellung von Algorithmen', prompt: 'Wozu dient Pseudocode?', solution: 'Algorithmus sprachunabhängig und knapp zu beschreiben' },
  { category: 'Darstellung von Algorithmen', prompt: 'Struktogramm (Nassi-Shneiderman): womit werden Abläufe dargestellt?', solution: 'rechteckige Strukturblöcke (Sequenz, Verzweigung, Schleife)' },
  { category: 'Darstellung von Algorithmen', prompt: 'Flussdiagramm: welches Symbol für Verzweigung oft?', solution: 'Raute' },
  { category: 'Darstellung von Algorithmen', prompt: 'Flussdiagramm: Start und Ende werden oft mit welcher Form dargestellt?', solution: 'abgerundetes Rechteck oder Ellipse' },
  { category: 'Darstellung von Algorithmen', prompt: 'Kommentare im Quellcode: wozu dienen sie vor allem?', solution: 'Erklärungen für Menschen (Absicht, Annahmen)' },
  { category: 'Darstellung von Algorithmen', prompt: 'Schleifeninvariante: was beschreibt sie grob?', solution: 'Eigenschaft, die vor/nach jedem Schleifendurchlauf gilt' },
  { category: 'Darstellung von Algorithmen', prompt: 'Vor- und Nachbedingung: was ist eine Nachbedingung?', solution: 'Zustand/Ergebnis, das nach Ausführung gelten soll' },
  { category: 'Darstellung von Algorithmen', prompt: 'UML-Aktivitätsdiagramm: wofür wird es oft genutzt?', solution: 'Abläufe/Workflows modellieren' },
  { category: 'Darstellung von Algorithmen', prompt: 'Ablaufplan vs. Programm: der Plan ist typischerweise ? maschinennah.', solution: 'weniger / abstrakter' },
  { category: 'Darstellung von Algorithmen', prompt: 'Warum strukturierte Blöcke im Struktogramm oft klarer als Sprunglinien?', solution: 'keine unübersichtlichen Sprünge / bessere Lesbarkeit' },
  // Netzwerke
  { category: 'Netzwerke', prompt: 'OSI-Modell: wie viele Schichten werden oft genannt?', solution: '7' },
  { category: 'Netzwerke', prompt: 'MAC-Adresse: typische OSI-Schicht?', solution: 'Schicht 2 (Sicherung/Data Link)' },
  { category: 'Netzwerke', prompt: 'IPv4-Adresse: typische OSI-Schicht?', solution: 'Schicht 3 (Vermittlung/Network)' },
  { category: 'Netzwerke', prompt: 'Switch vs. Router grob: wer arbeitet typischerweise auf Schicht 2 vs. 3?', solution: 'Switch eher L2, Router eher L3' },
  { category: 'Netzwerke', prompt: 'Paket vs. Frame: was ist typisch auf der Sicherungsschicht benannt?', solution: 'Frame' },
  { category: 'Netzwerke', prompt: 'Wofür steht DNS grob?', solution: 'Namen (Domain) in IP-Adressen auflösen' },
  { category: 'Netzwerke', prompt: 'Wofür steht DHCP grob?', solution: 'automatische Vergabe von IP-Konfiguration' },
  { category: 'Netzwerke', prompt: 'Latenz vs. Bandbreite: was misst die Bandbreite grob?', solution: 'übertragbare Datenmenge pro Zeit' },
  { category: 'Netzwerke', prompt: 'Subnetz / Präfix (z. B. /24): wozu dient es grob?', solution: 'Adressbereich eines Netzes segmentieren' },
  { category: 'Netzwerke', prompt: 'VLAN: wozu dient es grob?', solution: 'logische Trennung von Netzen auf gemeinsamer Infrastruktur' },
  // Internet und Kommunikation
  { category: 'Internet und Kommunikation', prompt: 'HTTP nutzt typischerweise welches Transportprotokoll?', solution: 'TCP' },
  { category: 'Internet und Kommunikation', prompt: 'HTTPS: HTTP plus typischerweise ?', solution: 'TLS-Verschlüsselung' },
  { category: 'Internet und Kommunikation', prompt: 'REST grob: Ressourcen werden oft mit welchen HTTP-Methoden angesprochen?', solution: 'GET, POST, PUT/PATCH, DELETE (Auswahl)' },
  { category: 'Internet und Kommunikation', prompt: 'URL: welche Teile gehören oft dazu (mindestens zwei nennen)?', solution: 'Schema (https), Host, Pfad (zwei reichen)' },
  { category: 'Internet und Kommunikation', prompt: 'HTTP-Statuscode 404 bedeutet grob?', solution: 'nicht gefunden' },
  { category: 'Internet und Kommunikation', prompt: 'Cookie im Web: wozu typisch?', solution: 'Zustand/Session speichern (clientseitig vom Server gesetzt)' },
  { category: 'Internet und Kommunikation', prompt: 'SMTP vs. IMAP grob: welches ist eher zum Versand, welches zum Abruf von Postfächern?', solution: 'SMTP Versand, IMAP Abruf/Sync' },
  { category: 'Internet und Kommunikation', prompt: 'Welcher Port ist typisch für HTTPS?', solution: '443' },
  { category: 'Internet und Kommunikation', prompt: 'Client-Server vs. Peer-to-Peer: bei P2P sind viele Knoten gleichzeitig ?', solution: 'Client und Server / gleichberechtigt' },
  { category: 'Internet und Kommunikation', prompt: 'CDN grob: welches Ziel verfolgt es oft?', solution: 'Inhalte geografisch näher ausliefern (Latenz senken)' },
  // Datenbanken
  { category: 'Datenbanken', prompt: 'Primärschlüssel: wozu dient er?', solution: 'Zeilen eindeutig identifizieren' },
  { category: 'Datenbanken', prompt: 'Fremdschlüssel referenziert typischerweise einen ? einer anderen Tabelle.', solution: 'Primärschlüssel' },
  { category: 'Datenbanken', prompt: '1. Normalform (1NF): Attributwerte sollen typischerweise ? sein.', solution: 'atomar' },
  { category: 'Datenbanken', prompt: 'SQL: welches Schlüsselwort liest Daten aus Tabellen?', solution: 'SELECT' },
  { category: 'Datenbanken', prompt: 'SQL: welches Schlüsselwort fügt neue Zeilen ein?', solution: 'INSERT' },
  { category: 'Datenbanken', prompt: 'JOIN: wozu dient er?', solution: 'Zeilen aus mehreren Tabellen verknüpfen' },
  { category: 'Datenbanken', prompt: 'Transaktion ACID: wofür steht „A“ oft?', solution: 'Atomicity / Atomarität' },
  { category: 'Datenbanken', prompt: 'Index in einer Datenbank: wozu dient er grob?', solution: 'schnelleres Suchen/Filtern (auf Kosten von Pflege/Speicher)' },
  { category: 'Datenbanken', prompt: 'SQL vs. NoSQL in einem Satz?', solution: 'SQL relational/tabellarisch; NoSQL oft flexiblere Modelle (Dokument, Key-Value, …)' },
  { category: 'Datenbanken', prompt: 'VIEW in SQL: was ist es grob?', solution: 'gespeicherte Abfrage / virtuelle Tabelle' },
];

/** Grundlagen Informatik – Klassenstufe / Kurs 13 (vertieft) */
const TASK_POOL_INF_13: EntryTicketTask[] = [
  { category: 'Inf · Wahr/Falsch', prompt: 'Wahr oder falsch: Jede reguläre Sprache ist kontextfrei.', solution: 'Wahr' },
  { category: 'Inf · Wahr/Falsch', prompt: 'Wahr oder falsch: P ⊆ NP.', solution: 'Wahr' },
  { category: 'Inf · Wahr/Falsch', prompt: 'Wahr oder falsch: Jede berechenbare Funktion ist in polynomialer Zeit lösbar.', solution: 'Falsch' },
  { category: 'Inf · Theorie', prompt: 'Turingmaschine: unendliches Band und ?', solution: 'Lesen/Schreiben/Kopfbewegung' },
  { category: 'Inf · Theorie', prompt: 'Halteproblem: für alle Programme algorithmisch entscheidbar? (ja/nein)', solution: 'nein' },
  { category: 'Inf · Theorie', prompt: 'Church-Turing-These: Was beschreibt sie grob?', solution: 'Berechenbarkeit ≈ Turing-berechenbar' },
  { category: 'Inf · Algorithmus', prompt: 'Dynamische Programmierung nutzt typischerweise ? bereits gelöster Teilprobleme.', solution: 'Speicherung/Tabellen' },
  { category: 'Inf · Algorithmus', prompt: 'Greedy-Algorithmus: lokal optimal ⇒ immer global optimal? (ja/nein)', solution: 'nein' },
  { category: 'Inf · Algorithmus', prompt: 'Dijkstra: Kantengewichte dürfen negativ sein? (ja/nein)', solution: 'nein' },
  { category: 'Inf · Daten', prompt: 'Normalform: Welche verbietet transitive Abhängigkeit vom Schlüssel (oft 3NF)?', solution: '3. Normalform' },
  { category: 'Inf · Daten', prompt: 'B-Baum: Ziel bei Datenbank-Indizes oft ?', solution: 'weniger Plattenzugriffe / balanciert' },
  { category: 'Inf · Daten', prompt: 'CAP: man kann typischerweise nicht alle drei gleichzeitig maximal: Consistency, Availability, ?', solution: 'Partition tolerance' },
  { category: 'Inf · Netzwerk', prompt: 'TLS sitzt in der Protokollhierarchie typischerweise über ?', solution: 'TCP' },
  { category: 'Inf · Netzwerk', prompt: 'VPN: Hauptziel oft ? des Datenverkehrs.', solution: 'Verschlüsselung/Schutz' },
  { category: 'Inf · Sicherheit', prompt: 'Man-in-the-Middle: Angreifer steht zwischen ?', solution: 'Sender und Empfänger' },
  { category: 'Inf · Sicherheit', prompt: 'Zero-Knowledge-Beweis: Information über Geheimnis wird ?', solution: 'nicht preisgegeben' },
  { category: 'Inf · Software', prompt: 'MVC: wofür steht das „M“?', solution: 'Model' },
  { category: 'Inf · Software', prompt: 'OOP: Polymorphismus bedeutet grob ?', solution: 'gleiche Schnittstelle, verschiedene Implementierungen' },
  { category: 'Inf · Software', prompt: 'Race Condition entsteht bei ? Zugriff auf gemeinsame Daten.', solution: 'parallelem/konkurrierendem' },
  { category: 'Inf · Hardware', prompt: 'Cache: näher an der CPU = typischerweise ? Latenz.', solution: 'geringere' },
  { category: 'Inf · Hardware', prompt: 'Pipeline in der CPU: Was wird überlappt?', solution: 'Befehlsausführung (mehrere Stufen)' },
  { category: 'Eigen · Inf', prompt: 'Blockchain: Blöcke sind typischerweise durch ? verkettet.', solution: 'Hashwerte' },
  { category: 'Eigen · Inf', prompt: 'Quantenbit kann (vereinfacht) ? Zustände überlagern.', solution: 'mehrere' },
  { category: 'Eigen · Inf', prompt: 'Ethik KI: Bias in Trainingsdaten kann zu ? führen.', solution: 'Diskriminierung / Fehlentscheidungen' },
  { category: 'Inf · Logik', prompt: 'Aussagenlogik: (A → B) ist äquivalent zu (¬A ∨ B)? (ja/nein)', solution: 'ja' },
  { category: 'Inf · Theorie', prompt: 'Komplexitätsklasse NP: Lösung ist in polynomialer Zeit ?', solution: 'verifizierbar' },
  { category: 'Inf · Daten', prompt: 'Transaktion: Isolation verhindert typischerweise ?', solution: 'Dirty Reads / gegenseitige Störungen' },
  { category: 'Inf · Algorithmus', prompt: 'O(n²) Sortierverfahren: nenne eines.', solution: 'Bubblesort / Insertionsort (eines)' },
  { category: 'Inf · Netzwerk', prompt: 'IPv6-Adresslänge in Bit?', solution: '128' },
  { category: 'Inf · Sicherheit', prompt: 'Perfect Forward Secrecy: vergangene Sessions bleiben bei Schlüsselleck ?', solution: 'geschützt' },
];

/** v2: Inf 11 behält Fachkategorien beim Auffüllen; mergeInf11FromStorage bereinigt fälschlich als TI gespeicherte Theorie-Fragen */
const QUESTION_SET_STORAGE_KEY = 'entry-ticket-question-sets-v2';

function randomTaskSeed(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return (buf[0] ?? Date.now()) >>> 0;
  }
  return (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
}

function parseEntryTicketSearch(search: string): { grade: EntryBand; autostart: boolean; groupId: string | null } {
  const params = new URLSearchParams(search);
  const rawG = params.get('grade');
  let grade: EntryBand = 7;
  if (rawG === 'inf11' || rawG === 'inf12' || rawG === 'inf13') {
    grade = rawG;
  } else {
    const gradeParam = Number(rawG);
    grade =
      Number.isFinite(gradeParam) && gradeParam >= 5 && gradeParam <= 13
        ? (gradeParam as GradeNum)
        : 7;
  }
  const autostart =
    params.get('autostart') === '1' ||
    params.get('autostart') === 'true' ||
    params.get('start') === '1';
  const rawGid = params.get('groupId') || params.get('learningGroupId');
  const groupId = rawGid && rawGid.trim() ? rawGid.trim() : null;
  return { grade, autostart, groupId };
}

const DEFAULT_QUESTION_SETS: GradeQuestionSets = {
  5: TASK_POOL_5,
  6: TASK_POOL_6,
  7: ENTRY_TICKET_TASK_POOL,
  8: ENTRY_TICKET_TASK_POOL,
  9: TASK_POOL_9,
  10: TASK_POOL_10,
  11: TASK_POOL_11,
  12: TASK_POOL_12,
  13: TASK_POOL_13,
  inf11: TASK_POOL_INF_11,
  inf12: TASK_POOL_INF_12,
  inf13: TASK_POOL_INF_13,
};

const INF11_CATEGORY_MARKERS = new Set([
  'Allgemein',
  'Java',
  'OO',
  'Technische Informatik',
  'Digitaltechnik',
  'KI',
]);

/** Inhalt, der unter „Technische Informatik“ (Hardware/Johnny) nicht hingehört, aber früher fälschlich dort landete. */
const INF11_TI_LOOKS_LIKE_THEORY = /endlich(er)?\s+Automat|Zustandsautomat|\bDEA\b|\bNEA\b|Turing|Chomsky|Grammatik|kontextfrei|regulär(e)?\s+Spr|Halteproblem|NP[-\s]?voll|berechenbarkeit/i;

function defaultInf11TechnicalBand(): EntryTicketTask[] {
  return DEFAULT_QUESTION_SETS.inf11.filter((q) => q.category === 'Technische Informatik');
}

/**
 * Ersetzt alte Inf-11-Speicherstände sinnvoll durch den aktuellen Standard.
 * Früher war inf11 = Mathe-11-Pool (Prozent, Bruch, …) oder „Inf · …“ – ohne die neuen Band-Kategorien.
 * Nur wenn mindestens eine Aufgabe eine der Kategorien Allgemein/Java/OO/Technische Informatik/… hat, bleibt der gespeicherte Satz erhalten.
 * „Theoretische Informatik“ war kein Inf-11-Fachband: Einträge werden entfernt (gehören nicht in die sechs Bänder).
 * Früher wurden Theorie-Fragen irrtümlich in „Technische Informatik“ umbenannt – solche TI-Einträge werden durch die aktuellen Standard-TI-Fragen ersetzt.
 */
function mergeInf11FromStorage(stored: EntryTicketTask[] | undefined): EntryTicketTask[] {
  if (stored === undefined || stored.length === 0) return DEFAULT_QUESTION_SETS.inf11;

  const withoutTheoryBand = stored.filter((q) => q.category !== 'Theoretische Informatik');

  const usesNewInf11Curriculum = withoutTheoryBand.some((q) => INF11_CATEGORY_MARKERS.has(q.category));
  if (!usesNewInf11Curriculum) return DEFAULT_QUESTION_SETS.inf11;

  const tiTasks = withoutTheoryBand.filter((q) => q.category === 'Technische Informatik');
  const tiCorrupt =
    tiTasks.length === 0 ||
    tiTasks.some((q) => INF11_TI_LOOKS_LIKE_THEORY.test(`${q.prompt} ${q.solution}`));

  if (!tiCorrupt) return withoutTheoryBand;

  const withoutTi = withoutTheoryBand.filter((q) => q.category !== 'Technische Informatik');
  return [...withoutTi, ...defaultInf11TechnicalBand()];
}

const coarseCategoryForTask = (category: string): CoarseCategory => {
  const c = category.toLowerCase();
  if (c.includes('eigen')) return 'Eigen';
  if (c.includes('wahr')) return 'Wahr/Falsch';
  if (c.includes('bruch') || c.includes('dezimal') || c.includes('prozent')) return 'Bruch/Dezimal/Prozent';
  if (c.includes('umfang') || c.includes('fläche') || c.includes('einheit') || c.includes('geometr')) return 'Geometrie/Einheiten';
  if (c.includes('alltag') || c.includes('geld') || c.includes('zeit') || c.includes('regal') || c.includes('supermarkt') || c.includes('kombi')) return 'Zeit/Geld/Alltag';
  if (c.includes('logik') || c.includes('muster') || c.includes('reihenfolge')) return 'Logik/Muster';
  return 'Grundrechenarten';
};

const inflateSetToFiftyPerCategory = (list: EntryTicketTask[]): EntryTicketTask[] => {
  const next = [...list];
  const categories: CoarseCategory[] = [
    'Grundrechenarten',
    'Bruch/Dezimal/Prozent',
    'Geometrie/Einheiten',
    'Zeit/Geld/Alltag',
    'Logik/Muster',
    'Wahr/Falsch',
  ];
  for (const cat of categories) {
    const inCat = next.filter((q) => coarseCategoryForTask(q.category) === cat);
    if (inCat.length === 0) continue;
    let i = 0;
    while (next.filter((q) => coarseCategoryForTask(q.category) === cat).length < 50) {
      const template = inCat[i % inCat.length];
      next.push({ ...template, category: cat });
      i += 1;
    }
  }
  return next;
};

/** Inf 11: Kategorien Allgemein … KI beibehalten, pro Band auf 50 Aufgaben auffüllen (nicht Mathe-Grobkategorien). */
const INF11_BAND_ORDER: readonly string[] = [
  'Allgemein',
  'Java',
  'OO',
  'Technische Informatik',
  'Digitaltechnik',
  'KI',
];

function inflateInf11PerBand(list: EntryTicketTask[]): EntryTicketTask[] {
  const next = [...list];
  for (const band of INF11_BAND_ORDER) {
    const inBand = next.filter((q) => q.category === band);
    if (inBand.length === 0) continue;
    let i = 0;
    while (next.filter((q) => q.category === band).length < 50) {
      const template = inBand[i % inBand.length];
      next.push({ ...template, category: band });
      i += 1;
    }
  }
  return next;
}

/** Inf 12: sieben Fachbänder, pro Band auf 50 auffüllen (wie Inf 11, nicht Mathe-Grobkategorien). */
const INF12_BAND_ORDER: readonly string[] = [
  'Python',
  'Programmiergrundlagen',
  'Algorithmen',
  'Darstellung von Algorithmen',
  'Netzwerke',
  'Internet und Kommunikation',
  'Datenbanken',
];

const INF12_CATEGORY_MARKERS = new Set<string>(INF12_BAND_ORDER);

function mergeInf12FromStorage(stored: EntryTicketTask[] | undefined): EntryTicketTask[] {
  if (stored === undefined || stored.length === 0) return DEFAULT_QUESTION_SETS.inf12;
  const looksLikeNewInf12 = stored.some(
    (q) => INF12_CATEGORY_MARKERS.has(q.category) || coarseCategoryForTask(q.category) === 'Eigen',
  );
  if (looksLikeNewInf12) return stored;
  return DEFAULT_QUESTION_SETS.inf12;
}

function inflateInf12PerBand(list: EntryTicketTask[]): EntryTicketTask[] {
  const next = [...list];
  for (const band of INF12_BAND_ORDER) {
    const inBand = next.filter((q) => q.category === band);
    if (inBand.length === 0) continue;
    let i = 0;
    while (next.filter((q) => q.category === band).length < 50) {
      const template = inBand[i % inBand.length];
      next.push({ ...template, category: band });
      i += 1;
    }
  }
  return next;
}

const INF12_EDITOR_VISUALS: Record<string, { icon: string; bg: string; fg: string; border: string }> = {
  Python: { icon: '🐍', bg: '#e8f5e9', fg: '#1b5e20', border: '#66bb6a' },
  Programmiergrundlagen: { icon: '⚙️', bg: '#eceff1', fg: '#37474f', border: '#90a4ae' },
  Algorithmen: { icon: '📶', bg: '#fff8e1', fg: '#f57f17', border: '#ffca28' },
  'Darstellung von Algorithmen': { icon: '📐', bg: '#f3e5f5', fg: '#6a1b9a', border: '#ba68c8' },
  Netzwerke: { icon: '🔌', bg: '#e1f5fe', fg: '#01579b', border: '#4fc3f7' },
  'Internet und Kommunikation': { icon: '🌐', bg: '#e8eaf6', fg: '#283593', border: '#7986cb' },
  Datenbanken: { icon: '🗄️', bg: '#fce4ec', fg: '#880e4f', border: '#f06292' },
};

/** Farben für Fragenset-Gruppen unter Inf 11 (Fachkategorien) */
const INF11_EDITOR_VISUALS: Record<string, { icon: string; bg: string; fg: string; border: string }> = {
  Allgemein: { icon: '📋', bg: '#e3f2fd', fg: '#0d47a1', border: '#90caf9' },
  Java: { icon: '☕', bg: '#fff3e0', fg: '#e65100', border: '#ffcc80' },
  OO: { icon: '🔷', bg: '#e8f5e9', fg: '#2e7d32', border: '#a5d6a7' },
  'Technische Informatik': { icon: '🖥️', bg: '#e8eaf6', fg: '#283593', border: '#9fa8da' },
  Digitaltechnik: { icon: '⚡', bg: '#eceff1', fg: '#37474f', border: '#90a4ae' },
  KI: { icon: '🤖', bg: '#e0f7fa', fg: '#006064', border: '#4dd0e1' },
};

const dedupeEigenQuestions = (list: EntryTicketTask[]): EntryTicketTask[] => {
  const seen = new Set<string>();
  return list.filter((q) => {
    if (coarseCategoryForTask(q.category) !== 'Eigen') return true;
    const key = q.prompt.trim().toLowerCase();
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default function EntryTicketPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialRoute =
    typeof window !== 'undefined'
      ? parseEntryTicketSearch(window.location.search || '')
      : { grade: 7 as EntryBand, autostart: false, groupId: null as string | null };
  const [sessionStarted, setSessionStarted] = useState(false);
  const [grade, setGrade] = useState<EntryBand>(() => initialRoute.grade);
  const [taskSeed, setTaskSeed] = useState(() => randomTaskSeed());
  const [showSetEditor, setShowSetEditor] = useState(
    () => typeof window !== 'undefined' && Boolean(localStorage.getItem('teacherId')),
  );
  const [questionSets, setQuestionSets] = useState<GradeQuestionSets>(() => {
    try {
      const raw = localStorage.getItem(QUESTION_SET_STORAGE_KEY);
      if (!raw) {
        return {
          5: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[5])),
          6: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[6])),
          7: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[7])),
          8: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[8])),
          9: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[9])),
          10: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[10])),
          11: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[11])),
          12: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[12])),
          13: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[13])),
          inf11: dedupeEigenQuestions(inflateInf11PerBand(DEFAULT_QUESTION_SETS.inf11)),
          inf12: dedupeEigenQuestions(inflateInf12PerBand(DEFAULT_QUESTION_SETS.inf12)),
          inf13: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS.inf13)),
        };
      }
      const parsed = JSON.parse(raw) as Partial<GradeQuestionSets>;
      return {
        5: dedupeEigenQuestions(inflateSetToFiftyPerCategory(parsed[5] ?? DEFAULT_QUESTION_SETS[5])),
        6: dedupeEigenQuestions(inflateSetToFiftyPerCategory(parsed[6] ?? DEFAULT_QUESTION_SETS[6])),
        7: dedupeEigenQuestions(inflateSetToFiftyPerCategory(parsed[7] ?? DEFAULT_QUESTION_SETS[7])),
        8: dedupeEigenQuestions(inflateSetToFiftyPerCategory(parsed[8] ?? DEFAULT_QUESTION_SETS[8])),
        9: dedupeEigenQuestions(inflateSetToFiftyPerCategory(parsed[9] ?? DEFAULT_QUESTION_SETS[9])),
        10: dedupeEigenQuestions(inflateSetToFiftyPerCategory(parsed[10] ?? DEFAULT_QUESTION_SETS[10])),
        11: dedupeEigenQuestions(inflateSetToFiftyPerCategory(parsed[11] ?? DEFAULT_QUESTION_SETS[11])),
        12: dedupeEigenQuestions(inflateSetToFiftyPerCategory(parsed[12] ?? DEFAULT_QUESTION_SETS[12])),
        13: dedupeEigenQuestions(inflateSetToFiftyPerCategory(parsed[13] ?? DEFAULT_QUESTION_SETS[13])),
        inf11: dedupeEigenQuestions(inflateInf11PerBand(mergeInf11FromStorage(parsed.inf11))),
        inf12: dedupeEigenQuestions(inflateInf12PerBand(mergeInf12FromStorage(parsed.inf12))),
        inf13: dedupeEigenQuestions(inflateSetToFiftyPerCategory(parsed.inf13 ?? DEFAULT_QUESTION_SETS.inf13)),
      };
    } catch {
      return {
        5: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[5])),
        6: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[6])),
        7: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[7])),
        8: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[8])),
        9: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[9])),
        10: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[10])),
        11: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[11])),
        12: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[12])),
        13: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[13])),
        inf11: dedupeEigenQuestions(inflateInf11PerBand(DEFAULT_QUESTION_SETS.inf11)),
        inf12: dedupeEigenQuestions(inflateInf12PerBand(DEFAULT_QUESTION_SETS.inf12)),
        inf13: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS.inf13)),
      };
    }
  });
  const [selectedTasks, setSelectedTasks] = useState<EntryTicketTask[]>(
    [],
  );
  const [pickedListIndices, setPickedListIndices] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SLIDE_DURATION_SEC);
  const [isRunning, setIsRunning] = useState(false);
  const [showSolutions, setShowSolutions] = useState(false);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [sessionDone, setSessionDone] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [editingSolution, setEditingSolution] = useState('');
  const [setEditIndex, setSetEditIndex] = useState<number | null>(null);
  const [setEditPrompt, setSetEditPrompt] = useState('');
  const [setEditSolution, setSetEditSolution] = useState('');
  const [setEditCategory, setSetEditCategory] = useState('Alltag');
  const [newPrompt, setNewPrompt] = useState('');
  const [newSolution, setNewSolution] = useState('');
  const [autoStartPending, setAutoStartPending] = useState(() => initialRoute.autostart);
  const [entryTicketGroupId, setEntryTicketGroupId] = useState<string | null>(() => initialRoute.groupId);
  /** Motiv 0..9 — kommt vom Server (pro neuem Signal / neuer Stunden-Klick neu gewürfelt) */
  const [entryHeroImageIndex, setEntryHeroImageIndex] = useState(0);
  /** Autostart signalisiert sofort in useLayoutEffect; kein zweites Signal beim ersten startSession */
  const skipDuplicateEntrySignalRef = useRef(false);

  /** Klassenstufe aus URL; neuer Zufallssatz bei jedem Aufruf (inkl. &r=… vom Klick auf das Dashboard-Icon). */
  useLayoutEffect(() => {
    const { grade: g, autostart, groupId } = parseEntryTicketSearch(location.search);
    setGrade(g);
    setAutoStartPending(autostart);
    setEntryTicketGroupId(groupId);
    setTaskSeed(randomTaskSeed());
    setSessionStarted(false);
    setSessionDone(false);
    setCurrentIndex(0);
    setSecondsLeft(SLIDE_DURATION_SEC);
    setIsRunning(false);
    setShowSolutions(false);

    const teacher = Boolean(typeof window !== 'undefined' && localStorage.getItem('teacherId'));
    if (autostart && teacher) {
      skipDuplicateEntrySignalRef.current = true;
      void (async () => {
        try {
          const res = await apiPost('/api/entry-ticket/signal', groupId ? { learningGroupId: groupId } : {});
          if (res.ok) {
            const data = await res.json();
            if (typeof data.heroImageIndex === 'number') setEntryHeroImageIndex(data.heroImageIndex);
          }
        } catch {
          // ignore
        }
      })();
    } else {
      skipDuplicateEntrySignalRef.current = false;
    }
  }, [location.search]);

  const isTeacher = useMemo(() => Boolean(localStorage.getItem('teacherId')), []);

  useEffect(() => {
    if (!isTeacher) return;
    const { autostart } = parseEntryTicketSearch(location.search);
    if (autostart) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiGet('/api/entry-ticket/current');
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { startedAt?: string | null; heroImageIndex?: number | null };
        if (typeof data.heroImageIndex === 'number' && data.startedAt) {
          setEntryHeroImageIndex(data.heroImageIndex);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isTeacher, location.search]);
  const activeTasks = selectedTasks;
  const totalRunSeconds = activeTasks.length * SLIDE_DURATION_SEC;
  const currentTask = activeTasks[currentIndex] ?? activeTasks[0];
  const completedSlides = currentIndex + (sessionDone ? 1 : 0);
  const progressPercent =
    activeTasks.length > 0 ? Math.min((completedSlides / activeTasks.length) * 100, 100) : 0;
  const elapsedSeconds = currentIndex * SLIDE_DURATION_SEC + (SLIDE_DURATION_SEC - secondsLeft);
  const remainingSeconds = Math.max(totalRunSeconds - elapsedSeconds, 0);

  const toCoarseCategory = (category: string): CoarseCategory => {
    return coarseCategoryForTask(category);
  };

  const poolForBand = useMemo(() => questionSets[grade] ?? [], [questionSets, grade]);
  const groupedSetQuestions = useMemo(() => {
    const indexed = poolForBand.map((q, idx) => ({ q, idx }));

    if (grade === 'inf11' || grade === 'inf12') {
      const bandOrder = grade === 'inf11' ? INF11_BAND_ORDER : INF12_BAND_ORDER;
      const rankInf = (cat: string) => {
        if (coarseCategoryForTask(cat) === 'Eigen') return -1;
        const i = bandOrder.indexOf(cat);
        return i === -1 ? 999 : i;
      };
      indexed.sort((a, b) => {
        const ra = rankInf(a.q.category);
        const rb = rankInf(b.q.category);
        if (ra !== rb) return ra - rb;
        return a.idx - b.idx;
      });
      let displayCounter = 1;
      const withDisplay = indexed.map((item) => {
        const displayNumber = displayCounter;
        displayCounter += 1;
        return { ...item, displayNumber };
      });
      const groups: Array<{
        category: string;
        items: Array<{ q: EntryTicketTask; idx: number; displayNumber: number }>;
      }> = [];
      for (const item of withDisplay) {
        const band = item.q.category;
        const last = groups[groups.length - 1];
        if (!last || last.category !== band) {
          groups.push({ category: band, items: [item] });
        } else {
          last.items.push(item);
        }
      }
      return groups;
    }

    const categoryOrder: CoarseCategory[] = [
      'Eigen',
      'Grundrechenarten',
      'Bruch/Dezimal/Prozent',
      'Geometrie/Einheiten',
      'Zeit/Geld/Alltag',
      'Logik/Muster',
      'Wahr/Falsch',
    ];
    const rank = (cat: CoarseCategory) => {
      const i = categoryOrder.indexOf(cat);
      return i === -1 ? 999 : i;
    };
    indexed.sort((a, b) => {
      const ca = toCoarseCategory(a.q.category);
      const cb = toCoarseCategory(b.q.category);
      const byCategory = rank(ca) - rank(cb);
      if (byCategory !== 0) return byCategory;
      return a.idx - b.idx;
    });
    // Anzeige-Nummerierung soll so wirken wie die Reihenfolge im Editor (nach Sortierung).
    let displayCounter = 1;
    const withDisplay = indexed.map((item) => {
      const displayNumber = displayCounter;
      displayCounter += 1;
      return { ...item, displayNumber };
    });
    const groups: Array<{ category: string; items: Array<{ q: EntryTicketTask; idx: number; displayNumber: number }> }> = [];
    for (const item of withDisplay) {
      const coarse = toCoarseCategory(item.q.category);
      const last = groups[groups.length - 1];
      if (!last || last.category !== coarse) {
        groups.push({ category: coarse, items: [item] });
      } else {
        last.items.push(item);
      }
    }
    return groups;
  }, [poolForBand, grade]);

  const displayNumberByPoolIndex = useMemo(() => {
    const map = new Map<number, number>();
    for (const group of groupedSetQuestions) {
      for (const item of group.items) {
        map.set(item.idx, item.displayNumber);
      }
    }
    return map;
  }, [groupedSetQuestions]);

  const categoryVisuals: Record<CoarseCategory, { icon: string; bg: string; fg: string; border: string }> = {
    Grundrechenarten: { icon: '🧮', bg: '#fff3e0', fg: '#e65100', border: '#ffcc80' },
    'Bruch/Dezimal/Prozent': { icon: '📊', bg: '#e8f5e9', fg: '#1b5e20', border: '#a5d6a7' },
    'Geometrie/Einheiten': { icon: '📐', bg: '#e3f2fd', fg: '#0d47a1', border: '#90caf9' },
    'Zeit/Geld/Alltag': { icon: '🕒', bg: '#f3e5f5', fg: '#6a1b9a', border: '#ce93d8' },
    'Logik/Muster': { icon: '🧩', bg: '#ede7f6', fg: '#4527a0', border: '#b39ddb' },
    'Wahr/Falsch': { icon: '✅', bg: '#e0f2f1', fg: '#004d40', border: '#80cbc4' },
    Eigen: { icon: '🧾', bg: '#e8f5ff', fg: '#0b3a91', border: '#90caf9' },
  };

  const visualForFragensetGroup = (groupCategory: string) => {
    if (grade === 'inf11' && INF11_EDITOR_VISUALS[groupCategory]) {
      return INF11_EDITOR_VISUALS[groupCategory];
    }
    if (grade === 'inf12' && INF12_EDITOR_VISUALS[groupCategory]) {
      return INF12_EDITOR_VISUALS[groupCategory];
    }
    return categoryVisuals[groupCategory as CoarseCategory] ?? categoryVisuals.Grundrechenarten;
  };

  const skipInfNumberVary = (category: string) =>
    category.startsWith('Inf ·') ||
    category.startsWith('Eigen · Inf') ||
    category === 'Allgemein' ||
    category === 'Java' ||
    category === 'OO' ||
    category === 'Technische Informatik' ||
    category === 'Digitaltechnik' ||
    category === 'KI' ||
    INF12_BAND_ORDER.includes(category);

  const varyNumbersOnly = (prompt: string, seed: number): string => {
    if (/wahr\s*oder\s*falsch/i.test(prompt)) return prompt;
    let localSeed = seed;
    const rnd = () => {
      localSeed = (localSeed * 1103515245 + 12345) % 2147483648;
      return localSeed / 2147483648;
    };
    return prompt.replace(/(?<![:\d])\d+(?:[.,]\d+)?(?!:\d)/g, (raw) => {
      const hasComma = raw.includes(',');
      const base = Number(raw.replace(',', '.'));
      if (!Number.isFinite(base)) return raw;
      const factor = hasComma ? (0.8 + rnd() * 0.4) : (0.7 + rnd() * 0.6);
      let v = base * factor;
      if (!hasComma) v = Math.max(1, Math.round(v));
      const decimals = hasComma ? ((raw.split(',')[1] || '').length || 1) : 0;
      const str = decimals > 0 ? v.toFixed(decimals) : String(v);
      return str.replace('.', ',');
    });
  };

  const pickRandomTasks = (
    pool: EntryTicketTask[],
    count: number,
    seed: number,
  ): { tasks: EntryTicketTask[]; indices: number[] } => {
    const indexedPool = pool.map((task, i) => ({ task, i }));
    const arr = [...indexedPool];
    let s = seed;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const sliced = arr.slice(0, Math.min(count, arr.length));
    return {
      tasks: sliced.map(({ task }, idx) => ({
        ...task,
        prompt: skipInfNumberVary(task.category) ? task.prompt : varyNumbersOnly(task.prompt, seed + idx * 31),
      })),
      indices: sliced.map(({ i }) => i),
    };
  };

  useEffect(() => {
    if (sessionStarted) return;
    const picked = pickRandomTasks(poolForBand, TARGET_TASK_COUNT, taskSeed);
    setSelectedTasks(picked.tasks);
    setPickedListIndices(picked.indices.map((i) => displayNumberByPoolIndex.get(i) ?? i + 1));
  }, [poolForBand, taskSeed, sessionStarted, displayNumberByPoolIndex]);

  useEffect(() => {
    try {
      localStorage.setItem(QUESTION_SET_STORAGE_KEY, JSON.stringify(questionSets));
    } catch {
      // ignore storage errors
    }
  }, [questionSets]);

  useEffect(() => {
    if (!sessionStarted || !isRunning || sessionDone || activeTasks.length === 0) return undefined;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        setCurrentIndex((prevIndex) => {
          const next = prevIndex + 1;
          if (next >= activeTasks.length) {
            setSessionDone(true);
            setIsRunning(false);
            return prevIndex;
          }
          return next;
        });
        return SLIDE_DURATION_SEC;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeTasks.length, isRunning, sessionDone, sessionStarted]);

  const startSession = () => {
    setSessionStarted(true);
    setSessionDone(false);
    setCurrentIndex(0);
    setSecondsLeft(SLIDE_DURATION_SEC);
    setShowSolutions(false);
    setTeacherNotes('');
    setIsRunning(true);
    setPickedListIndices([]);
    if (isTeacher) {
      if (skipDuplicateEntrySignalRef.current) {
        skipDuplicateEntrySignalRef.current = false;
      } else {
        const gid = entryTicketGroupId;
        void (async () => {
          try {
            const res = await apiPost('/api/entry-ticket/signal', gid ? { learningGroupId: gid } : {});
            if (res.ok) {
              const data = await res.json();
              if (typeof data.heroImageIndex === 'number') setEntryHeroImageIndex(data.heroImageIndex);
            }
          } catch {
            // ignore
          }
        })();
      }
    }
  };

  const startOrResume = () => {
    if (sessionDone) {
      setSessionDone(false);
      setCurrentIndex(0);
      setSecondsLeft(SLIDE_DURATION_SEC);
    }
    setIsRunning(true);
  };

  useEffect(() => {
    if (!autoStartPending || sessionStarted) return;
    if (selectedTasks.length === 0) return;
    startSession();
    setAutoStartPending(false);
  }, [autoStartPending, sessionStarted, selectedTasks.length]);

  const pause = () => {
    setIsRunning(false);
  };

  const replaceTaskAtIndex = (index: number) => {
    setSelectedTasks((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      if (poolForBand.length === 0) return prev;
      const pickBase = poolForBand[Math.floor(Math.random() * poolForBand.length)];
      const baseIndex = poolForBand.indexOf(pickBase);
      const replacement = {
        ...pickBase,
        prompt: skipInfNumberVary(pickBase.category)
          ? pickBase.prompt
          : varyNumbersOnly(pickBase.prompt, Date.now() + index),
      };
      const next = [...prev];
      next[index] = replacement;
      setPickedListIndices((prevIndices) => {
        const nextIndices = [...prevIndices];
        nextIndices[index] = displayNumberByPoolIndex.get(baseIndex) ?? baseIndex + 1;
        return nextIndices;
      });
      return next;
    });
  };

  const startSetEditing = (index: number) => {
    const task = poolForBand[index];
    if (!task) return;
    setSetEditIndex(index);
    setSetEditCategory(task.category);
    setSetEditPrompt(task.prompt);
    setSetEditSolution(task.solution);
  };

  const cancelSetEditing = () => {
    setSetEditIndex(null);
    setSetEditCategory('Alltag');
    setSetEditPrompt('');
    setSetEditSolution('');
  };

  const saveSetEditing = () => {
    if (setEditIndex === null) return;
    const prompt = setEditPrompt.trim();
    const solution = setEditSolution.trim();
    const category = toCoarseCategory(setEditCategory.trim() || 'Zeit/Geld/Alltag');
    if (!prompt || !solution) return;
    setQuestionSets((prev) => {
      const list = [...(prev[grade] ?? [])];
      if (setEditIndex < 0 || setEditIndex >= list.length) return prev;
      list[setEditIndex] = { ...list[setEditIndex], category, prompt, solution };
      return { ...prev, [grade]: list };
    });
    cancelSetEditing();
    setTaskSeed((s) => s + 1);
  };

  const deleteSetQuestion = (index: number) => {
    setQuestionSets((prev) => {
      const list = [...(prev[grade] ?? [])];
      if (index < 0 || index >= list.length) return prev;
      list.splice(index, 1);
      return { ...prev, [grade]: list };
    });
    setTaskSeed((s) => s + 1);
  };

  const addSetQuestion = () => {
    const prompt = newPrompt.trim();
    const solution = newSolution.trim();
    if (!prompt || !solution) return;
    setQuestionSets((prev) => {
      const list = [...(prev[grade] ?? [])];
      list.push({
        category: 'Eigen',
        prompt,
        solution,
      });
      return { ...prev, [grade]: list };
    });
    setNewPrompt('');
    setNewSolution('');
    setTaskSeed((s) => s + 1);
  };

  const handleAddQuestionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    addSetQuestion();
  };

  const fillToFiftyPerCategory = () => {
    setQuestionSets((prev) => {
      const base = [...(prev[grade] ?? [])];
      if (grade === 'inf11') {
        return { ...prev, [grade]: inflateInf11PerBand(base) };
      }
      if (grade === 'inf12') {
        return { ...prev, [grade]: inflateInf12PerBand(base) };
      }
      const categories: CoarseCategory[] = [
        'Grundrechenarten',
        'Bruch/Dezimal/Prozent',
        'Geometrie/Einheiten',
        'Zeit/Geld/Alltag',
        'Logik/Muster',
        'Wahr/Falsch',
        'Eigen',
      ];
      const next = [...base];
      for (const cat of categories) {
        const inCat = next.filter((q) => toCoarseCategory(q.category) === cat);
        if (inCat.length === 0) continue;
        let i = 0;
        while (next.filter((q) => toCoarseCategory(q.category) === cat).length < 50) {
          const template = inCat[i % inCat.length];
          next.push({ ...template, category: cat });
          i += 1;
        }
      }
      return { ...prev, [grade]: next };
    });
    setTaskSeed((s) => s + 1);
  };

  const startEditingTask = (index: number) => {
    const task = activeTasks[index];
    if (!task) return;
    setEditingIndex(index);
    setEditingPrompt(task.prompt);
    setEditingSolution(task.solution);
  };

  const cancelEditingTask = () => {
    setEditingIndex(null);
    setEditingPrompt('');
    setEditingSolution('');
  };

  const saveEditingTask = () => {
    if (editingIndex === null) return;
    const prompt = editingPrompt.trim();
    const solution = calculateAutoSolution(prompt).trim();
    if (!prompt || !solution) return;
    setSelectedTasks((prev) => {
      if (editingIndex < 0 || editingIndex >= prev.length) return prev;
      const next = [...prev];
      next[editingIndex] = { ...next[editingIndex], prompt, solution };
      return next;
    });
    cancelEditingTask();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    saveEditingTask();
  };

  const handleEditingPromptChange = (value: string) => {
    setEditingPrompt(value);
  };

  const getLiveAutoSolution = (prompt: string): string =>
    calculateAutoSolution(prompt);

  const handleBack = () => {
    if (sessionStarted) {
      setSessionStarted(false);
      setIsRunning(false);
      setSessionDone(false);
      setCurrentIndex(0);
      setSecondsLeft(SLIDE_DURATION_SEC);
      setShowSolutions(false);
      return;
    }
    navigate(-1);
  };

  const restart = () => {
    setIsRunning(false);
    setSessionDone(false);
    setCurrentIndex(0);
    setSecondsLeft(SLIDE_DURATION_SEC);
    setShowSolutions(false);
    setTeacherNotes('');
  };

  const goNext = () => {
    if (sessionDone) return;
    if (currentIndex >= activeTasks.length - 1) {
      setSessionDone(true);
      setIsRunning(false);
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setSecondsLeft(SLIDE_DURATION_SEC);
  };

  const goPrevious = () => {
    if (sessionDone) {
      setSessionDone(false);
      setCurrentIndex(activeTasks.length - 1);
      setSecondsLeft(SLIDE_DURATION_SEC);
      return;
    }
    if (currentIndex === 0) return;
    setCurrentIndex((prev) => prev - 1);
    setSecondsLeft(SLIDE_DURATION_SEC);
  };

  const formatMMSS = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      const el = target instanceof HTMLElement ? target : null;
      if (!el) return false;
      if (el.isContentEditable) return true;
      const field = el.closest<HTMLElement>(
        'textarea, select, [contenteditable="true"], input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"])'
      );
      return !!field;
    };

    const typingOrInField = (e: KeyboardEvent) =>
      isTypingTarget(e.target) || isTypingTarget(document.activeElement);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (typingOrInField(e)) return;

      if (e.key === 'ArrowLeft') {
        if (!sessionStarted) return;
        e.preventDefault();
        goPrevious();
        return;
      }

      if (e.key === 'ArrowRight') {
        if (!sessionStarted) return;
        e.preventDefault();
        goNext();
        return;
      }

      if (e.key === 'Enter') {
        if (!sessionStarted) return;
        e.preventDefault();
        if (isRunning) {
          pause();
        } else {
          startOrResume();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrevious, handleBack, isRunning, sessionStarted, startOrResume]);

  const formatPromptForDisplay = (prompt: string): string => {
    return prompt
      .replace(/\. /g, '.\n')
      .replace(/, Dauer /g, ',\nDauer ')
      .replace(/ bis /g, '\nbis ');
  };

  const cleanPrompt = (prompt: string): string =>
    prompt.replace(/\s{2,}/g, ' ').trim();

  const toNumber = (value: string): number => Number(value.replace(',', '.'));

  const formatDeNumber = (value: number, maxDecimals = 2): string => {
    if (!Number.isFinite(value)) return '';
    const rounded = Number(value.toFixed(maxDecimals));
    return rounded.toString().replace('.', ',');
  };

  const parseTimeToMinutes = (hh: string, mm: string): number => Number(hh) * 60 + Number(mm);
  const formatMinutesToTime = (totalMinutes: number): string => {
    const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const hh = Math.floor(normalized / 60).toString().padStart(2, '0');
    const mm = (normalized % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const evaluateSimpleExpression = (expr: string): number | null => {
    const normalized = expr
      .replace(/€/g, '')
      .replace(/,/g, '.')
      .replace(/·/g, '*')
      .replace(/÷/g, '/')
      .replace(/:/g, '/')
      .replace(/\s+/g, '');
    if (!/^[0-9+\-*/().]+$/.test(normalized)) return null;
    try {
      // eslint-disable-next-line no-new-func
      const value = Function(`"use strict"; return (${normalized});`)();
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  };

  const normalizeMathExpression = (expr: string): string => {
    return expr
      .replace(/€/g, '')
      .replace(/,/g, '.')
      .replace(/·/g, '*')
      .replace(/÷/g, '/')
      .replace(/:/g, '/')
      .replace(/(\d+(?:\.\d+)?)%/g, '($1/100)')
      .replace(/\s+/g, '');
  };

  const evaluateExpressionWithVariable = (expr: string, x: number): number | null => {
    const normalized = normalizeMathExpression(expr).replace(/\?/g, `(${x})`);
    if (!/^[0-9+\-*/().]+$/.test(normalized)) return null;
    try {
      // eslint-disable-next-line no-new-func
      const value = Function(`"use strict"; return (${normalized});`)();
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  };

  const solveQuestionMarkEquation = (prompt: string): number | null => {
    const text = cleanPrompt(prompt);
    const eqIndex = text.indexOf('=');
    if (eqIndex < 0 || !text.includes('?')) return null;

    const lhsRaw = text.slice(0, eqIndex);
    const rhsRaw = text.slice(eqIndex + 1);

    // Begrenze auf mathematische Tokens, damit Sätze außenrum nicht stören.
    const stripToMath = (s: string) => (s.match(/[0-9+\-*/().,·:÷?%\s€]+/g) || []).join('');
    const lhs = stripToMath(lhsRaw);
    const rhs = stripToMath(rhsRaw);
    if (!lhs || !rhs) return null;

    const h0Left = evaluateExpressionWithVariable(lhs, 0);
    const h0Right = evaluateExpressionWithVariable(rhs, 0);
    const h1Left = evaluateExpressionWithVariable(lhs, 1);
    const h1Right = evaluateExpressionWithVariable(rhs, 1);
    if (h0Left === null || h0Right === null || h1Left === null || h1Right === null) return null;

    // h(x) = lhs(x) - rhs(x) = a*x + b
    const b = h0Left - h0Right;
    const a = (h1Left - h1Right) - b;
    if (Math.abs(a) < 1e-9) return null;
    return -b / a;
  };

  const extractExpectedSuffix = (prompt: string): string => {
    const match = prompt.match(/\?\s*([A-Za-zÄÖÜäöü€%²³/]+)\.?/);
    return match?.[1]?.trim() ?? '';
  };

  const convertUnit = (value: number, from: string, to: string): number | null => {
    const factors: Record<string, number> = {
      mm: 0.001,
      cm: 0.01,
      m: 1,
      km: 1000,
      mg: 0.000001,
      g: 0.001,
      kg: 1,
      ml: 0.001,
      l: 1,
      s: 1,
      min: 60,
      h: 3600,
    };
    if (!(from in factors) || !(to in factors)) return null;
    return (value * factors[from]) / factors[to];
  };

  const calculateAutoSolution = (prompt: string): string => {
    const text = cleanPrompt(prompt);

    if (/^wahr\s*oder\s*falsch:/i.test(text)) {
      const statement = text.replace(/^wahr\s*oder\s*falsch:\s*/i, '').replace(/\?$/, '').trim();
      if (/0,4\s*entspricht\s*40%/i.test(statement)) return 'Wahr';
      if (/15%\s*von\s*200\s*sind\s*25/i.test(statement)) return 'Falsch';
      if (/2,5\s*l\s*sind\s*250\s*ml/i.test(statement)) return 'Falsch';
      if (/3\/4\s*ist\s*kleiner\s*als\s*2\/3/i.test(statement)) return 'Falsch';
      return 'Wahr/Falsch prüfen';
    }

    const solvedQuestion = solveQuestionMarkEquation(text);
    if (solvedQuestion !== null) {
      const formatted = formatDeNumber(solvedQuestion, 4);
      // Wichtig: die Einheit steht im Prompt hinter dem '?', daher nur den Zahlenwert zurückgeben.
      return formatted;
    }

    let m = text.match(/(\d+(?:[.,]\d+)?)%\s*von\s*(\d+(?:[.,]\d+)?)/i);
    if (m) {
      const value = (toNumber(m[1]) / 100) * toNumber(m[2]);
      return formatDeNumber(value);
    }

    m = text.match(/(\d+(?:[.,]\d+)?)\s*€\s*([+-])\s*(\d+(?:[.,]\d+)?)%/i);
    if (m) {
      const base = toNumber(m[1]);
      const pct = toNumber(m[3]) / 100;
      const value = m[2] === '+' ? base * (1 + pct) : base * (1 - pct);
      return `${formatDeNumber(value)} €`;
    }

    m = text.match(/von\s*(\d{1,2}):(\d{2})\s*uhr\s*bis\s*(\d{1,2}):(\d{2})\s*uhr/i);
    if (m) {
      const start = parseTimeToMinutes(m[1], m[2]);
      const end = parseTimeToMinutes(m[3], m[4]);
      const diff = end >= start ? end - start : end + 24 * 60 - start;
      return `${diff}`;
    }

    m = text.match(/start\s*(\d{1,2}):(\d{2})\s*uhr.*dauer\s*(\d+)\s*h\s*(\d+)\s*min.*ende\s*um\s*\?\s*uhr/i);
    if (m) {
      const start = parseTimeToMinutes(m[1], m[2]);
      const end = start + Number(m[3]) * 60 + Number(m[4]);
      return `${formatMinutesToTime(end)}`;
    }

    m = text.match(/(\d+(?:[.,]\d+)?)\s*(m|km|l)\s*=\s*\?\s*(cm|m|ml)\b/i);
    if (m) {
      const value = toNumber(m[1]);
      const from = m[2].toLowerCase();
      const to = m[3].toLowerCase();
      const converted = convertUnit(value, from, to);
      if (converted !== null) return `${formatDeNumber(converted)}`;
    }

    // Generische Zieleinheitserkennung (wenn komplett umformuliert wurde)
    m = text.match(/(\d+(?:[.,]\d+)?)\s*([A-Za-zÄÖÜäöü]+)\s*=\s*\?\s*([A-Za-zÄÖÜäöü]+)\b/i);
    if (m) {
      const value = toNumber(m[1]);
      const from = m[2].toLowerCase();
      const to = m[3].toLowerCase();
      const converted = convertUnit(value, from, to);
      if (converted !== null) return `${formatDeNumber(converted)}`;
    }

    m = text.match(/(\d+(?:[.,]\d+)?)\s*km\s*bei\s*(\d+(?:[.,]\d+)?)\s*km\/h.*\?\s*min/i);
    if (m) {
      const distance = toNumber(m[1]);
      const speed = toNumber(m[2]);
      if (speed > 0) return `${formatDeNumber((distance / speed) * 60)}`;
    }

    const eqIndex = text.indexOf('=');
    if (eqIndex > 0) {
      const expr = text.slice(0, eqIndex);
      const value = evaluateSimpleExpression(expr);
      if (value !== null) {
        // Einheit steht hinter dem '?', daher nur Zahlenwert zurückgeben.
        return formatDeNumber(value);
      }
    }

    return 'Nicht berechenbar';
  };

  const colorizeOperators = (text: string, keyPrefix: string, large = false) => {
    const formattedText = text.replace(/(\d+)\s*\/\s*(\d+)/g, '$1⁄$2');
    const parts = formattedText.split(/([+\-·:÷=<>%?])/g);
    return parts.map((part, index) => {
      const isOperator = /^[+\-·:÷=<>%]$/.test(part);
      const isQuestionMark = part === '?';
      if (!isOperator && !isQuestionMark) return <Box component="span" key={`${keyPrefix}-t-${index}`}>{part}</Box>;
      if (isQuestionMark) {
        return (
          <Box
            component="span"
            key={`${keyPrefix}-q-${index}`}
            sx={{ color: QUESTION_COLOR, fontWeight: 800, fontSize: '1.08em' }}
          >
            ?
          </Box>
        );
      }
      return (
        <Box
          component="span"
          key={`${keyPrefix}-o-${index}`}
          sx={{
            color: OPERATOR_COLOR,
            fontWeight: 900,
            mx: large ? 0.15 : 0.05,
            px: 0,
            textShadow: '0 0 0.2px currentColor',
          }}
        >
          {part}
        </Box>
      );
    });
  };

  const renderPrompt = (prompt: string, keyPrefix: string, large = false, singleLine = false) => {
    const text = cleanPrompt(prompt);
    const normalized = text.toLowerCase();
    const wfPrefix = 'wahr oder falsch:';

    if (normalized.startsWith(wfPrefix)) {
      const statement = text.slice(wfPrefix.length).trim();
      if (singleLine) {
        return (
          <>
            <Box component="span" sx={{ fontWeight: 700, color: '#37474f' }}>
              Wahr oder falsch?
            </Box>{' '}
            {colorizeOperators(statement, `${keyPrefix}-wf-inline`, large)}
          </>
        );
      }
      return (
        <>
          <Box component="span" sx={{ fontWeight: 700, color: '#37474f' }}>
            Wahr oder falsch?
          </Box>{' '}
          {colorizeOperators(statement, `${keyPrefix}-wf`, large)}
        </>
      );
    }

    return <>{colorizeOperators(text, `${keyPrefix}-std`, large)}</>;
  };

  const renderPromptWithInlineGreenSolution = (
    prompt: string,
    solution: string,
    keyPrefix: string,
    rightAlignedSolution = false,
  ) => {
    const cleaned = cleanPrompt(prompt);
    const normalized = cleaned.toLowerCase();
    const wfPrefix = 'wahr oder falsch:';
    if (normalized.startsWith(wfPrefix)) {
      const statement = cleaned.slice(wfPrefix.length).trim().replace(/[.]\s*$/, '');
      const statementNode = colorizeOperators(statement, `${keyPrefix}-wf`, false);
      if (rightAlignedSolution) {
        return (
          <Box
            component="span"
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              width: '100%',
              alignItems: 'baseline',
              columnGap: 1.5,
              whiteSpace: 'nowrap',
            }}
          >
            <Box
              component="div"
              sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              <Box component="span" sx={{ fontWeight: 700, color: '#37474f' }}>
                Wahr oder falsch?{' '}
              </Box>
              {statementNode}
            </Box>
            <Box component="span" sx={{ color: 'success.dark', fontWeight: 800, whiteSpace: 'nowrap' }}>
              {solution}
            </Box>
          </Box>
        );
      }

      return (
        <>
          <Box component="span" sx={{ fontWeight: 700, color: '#37474f' }}>
            Wahr oder falsch?{' '}
          </Box>
          {statementNode}{' '}
          <Box component="span" sx={{ color: OPERATOR_COLOR, fontWeight: 900 }}>
            {solution}
          </Box>
        </>
      );
    }

    const questionIndex = cleaned.indexOf('?');
    if (questionIndex < 0) return renderPrompt(cleaned, keyPrefix, false, true);

    const before = cleaned.slice(0, questionIndex);
    const after = cleaned.slice(questionIndex + 1);
    const beforeTrimmedRight = before.replace(/\s+$/, '');
    const needsSpaceBefore = before.length > 0 && !before.endsWith(' ');
    const needsSpaceAfter = after.length > 0 && !after.startsWith(' ');
    const forceSpaceAfterEquals = beforeTrimmedRight.endsWith('=');
    const afterTrimStart = after.trimStart();

    if (rightAlignedSolution) {
      return (
        <Box
          component="span"
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            width: '100%',
            alignItems: 'baseline',
            columnGap: 1.5,
            whiteSpace: 'nowrap',
          }}
        >
          <Box component="div" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {renderPrompt(before, `${keyPrefix}-before`, false, true)}
          </Box>
          <Box component="span" sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <Box component="span" sx={{ color: 'success.dark', fontWeight: 800 }}>
              {solution}
            </Box>
            {afterTrimStart ? (
              <>
                {' '}
                <Box component="span" sx={{ color: 'success.dark', fontWeight: 800 }}>
                  {afterTrimStart}
                </Box>
              </>
            ) : needsSpaceAfter ? ' ' : null}
          </Box>
        </Box>
      );
    }

    return (
      <>
        {renderPrompt(before, `${keyPrefix}-before`, false, true)}
        {(needsSpaceBefore || forceSpaceAfterEquals) ? ' ' : ''}
        <Box component="span" sx={{ color: 'success.dark', fontWeight: 800 }}>
          {solution}
        </Box>
        {afterTrimStart ? (
          <>
            {' '}
            <Box component="span" sx={{ color: 'success.dark', fontWeight: 800 }}>
              {afterTrimStart}
            </Box>
          </>
        ) : needsSpaceAfter ? ' ' : null}
      </>
    );
  };

  const formattedPrompt = currentTask ? formatPromptForDisplay(cleanPrompt(currentTask.prompt)) : '';
  const finalSlideRows = Math.ceil(activeTasks.length / 2);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f6fb', py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 2.5 } }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
          <Tooltip title="Zurück">
            <IconButton
              onClick={handleBack}
              size="small"
              aria-label="Zurück"
              sx={{
                p: 0,
                minWidth: 32,
                width: 32,
                height: 32,
                bgcolor: 'white',
                border: '1px solid',
                borderColor: 'divider',
                flexShrink: 0,
              }}
            >
              <ArrowBackIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.25,
              flex: 1,
              minWidth: 0,
            }}
          >
            <Box
              title="Aktuelles Motiv (wie bei den Schüler:innen)"
              sx={{
                width: 60,
                height: 60,
                flexShrink: 0,
                borderRadius: 1.75,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'rgba(30, 136, 229, 0.28)',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
                bgcolor: 'grey.200',
              }}
            >
              <Box
                component="img"
                src={entryTicketHeroSrc(entryHeroImageIndex)}
                alt=""
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </Box>
            <Typography variant="h6" sx={{ color: '#1a237e', fontWeight: 700, lineHeight: 1.2 }}>
              EntryTicket
            </Typography>
          </Box>

          <IconButton
            onClick={() => navigate('/dashboard')}
            aria-label="Ins Dashboard"
            size="small"
            sx={{
              p: 0,
              minWidth: 32,
              width: 32,
              height: 32,
              bgcolor: 'white',
              border: '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        <Card sx={{ borderRadius: 2, boxShadow: '0 6px 20px rgba(0,0,0,0.07)' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            {!sessionStarted ? (
              <Box
                sx={{
                  width: '100%',
                  maxWidth: DISPLAY_BOX_WIDTH,
                  minWidth: 0,
                  borderRadius: 2,
                  border: '1px solid #d9e0ff',
                  bgcolor: '#f8faff',
                  p: 1.5,
                  boxSizing: 'border-box',
                }}
              >
                <Box sx={{ mb: 1, minWidth: 0 }}>
                  <Box
                    component="div"
                    role="toolbar"
                    aria-label="Klassenstufe und Aktionen"
                    sx={{
                      display: 'grid',
                      gridAutoFlow: 'column',
                      gridAutoColumns: 'max-content',
                      gridTemplateRows: 'auto',
                      alignItems: 'center',
                      gap: 0.5,
                      width: '100%',
                      maxWidth: '100%',
                      minWidth: 0,
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      py: 0.25,
                      WebkitOverflowScrolling: 'touch',
                      '&::-webkit-scrollbar': { height: 8 },
                      '&::-webkit-scrollbar-thumb': {
                        borderRadius: 1,
                        bgcolor: 'rgba(25, 118, 210, 0.35)',
                      },
                    }}
                  >
                    {([5, 6, 7, 8, 9, 10, 11, 12, 13] as const).map((g) => (
                      <Button
                        key={g}
                        size="small"
                        variant={grade === g ? 'contained' : 'outlined'}
                        onClick={() => setGrade(g)}
                        sx={{ minWidth: 36, px: 0.6, flexShrink: 0 }}
                      >
                        {g}
                      </Button>
                    ))}
                    {(
                      [
                        { band: 'inf11' as const, label: 'Inf 11', main: '#00695c', hoverBg: 'rgba(0, 105, 92, 0.1)' },
                        { band: 'inf12' as const, label: 'Inf 12', main: '#e65100', hoverBg: 'rgba(230, 81, 0, 0.1)' },
                        { band: 'inf13' as const, label: 'Inf 13', main: '#4527a0', hoverBg: 'rgba(69, 39, 160, 0.1)' },
                      ] as const
                    ).map(({ band, label, main, hoverBg }) => (
                      <Button
                        key={band}
                        size="small"
                        variant={grade === band ? 'contained' : 'outlined'}
                        onClick={() => setGrade(band)}
                        sx={{
                          minWidth: 48,
                          px: 0.45,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          lineHeight: 1.15,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          ...(grade === band
                            ? {
                                bgcolor: main,
                                color: '#fff',
                                borderColor: main,
                                '&:hover': { bgcolor: main, filter: 'brightness(0.92)' },
                              }
                            : {
                                color: main,
                                borderColor: main,
                                borderWidth: 2,
                                bgcolor: 'rgba(255,255,255,0.85)',
                                '&:hover': { bgcolor: hoverBg, borderColor: main },
                              }),
                        }}
                      >
                        {label}
                      </Button>
                    ))}
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setTaskSeed((s) => s + 1);
                        cancelEditingTask();
                      }}
                      sx={{ flexShrink: 0 }}
                    >
                      Reset
                    </Button>
                    <Button
                      size="small"
                      variant={showSetEditor ? 'contained' : 'outlined'}
                      onClick={() => setShowSetEditor((v) => !v)}
                      sx={{ minWidth: 92, flexShrink: 0 }}
                    >
                      Fragenset
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<PlayArrowIcon sx={{ fontSize: 18 }} />}
                      onClick={startSession}
                      sx={{ minWidth: 96, flexShrink: 0 }}
                    >
                      Start
                    </Button>
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 0.65,
                  }}
                >
                  {activeTasks.map((task, index) => (
                    <Box
                      key={`${index}-${task.prompt}`}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 0.75,
                        p: 0.7,
                        borderRadius: 1.25,
                        bgcolor: 'white',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {editingIndex === index ? (
                        <>
                          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                            <TextField
                              size="small"
                              value={editingPrompt}
                              onChange={(e) => handleEditingPromptChange(e.target.value)}
                              placeholder="Frage"
                              onKeyDown={handleEditKeyDown}
                            />
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              Vorschau: {renderPromptWithInlineGreenSolution(editingPrompt, getLiveAutoSolution(editingPrompt), `preview-${index}`)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Button size="small" variant="contained" onClick={saveEditingTask} sx={{ minWidth: 44 }}>
                              OK
                            </Button>
                            <Button size="small" variant="text" onClick={cancelEditingTask} sx={{ minWidth: 44 }}>
                              Ab
                            </Button>
                          </Box>
                        </>
                      ) : (
                        <>
                      <Typography variant="body2" sx={{ fontSize: '1rem', lineHeight: 1.2 }}>
                            <Box component="span" sx={{ fontWeight: 400 }}>
                              {index + 1}.
                            </Box>{' '}
                            <Box component="span" sx={{ fontWeight: 700 }}>
                              {renderPrompt(task.prompt, `selection-${index}`, false, true)}
                            </Box>
                        {pickedListIndices[index] !== undefined && (
                              <Box component="span" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                {' '}
                            (List: {pickedListIndices[index]})
                              </Box>
                            )}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => startEditingTask(index)}
                              sx={{ minWidth: 22, width: 22, height: 22, p: 0, lineHeight: 1 }}
                            >
                              ✎
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              onClick={() => replaceTaskAtIndex(index)}
                              sx={{ minWidth: 22, width: 22, height: 22, p: 0, lineHeight: 1 }}
                            >
                              ×
                            </Button>
                          </Box>
                        </>
                      )}
                    </Box>
                  ))}
                </Box>

                {showSetEditor && (
                  <Box sx={{ mt: 1.5, p: 1, border: '1px solid', borderColor: '#bcd3ff', borderRadius: 1.25, bgcolor: '#eef4ff' }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.75, fontWeight: 700 }}>
                      Fragenset {fragensetHeadingLabel(grade)} ({poolForBand.length} Fragen)
                    </Typography>
                    <Box sx={{ mt: 0.8, display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <TextField
                        size="small"
                        value={newPrompt}
                        onChange={(e) => setNewPrompt(e.target.value)}
                        placeholder="Neue Frage (mit ?)"
                        sx={{ flex: 1 }}
                        onKeyDown={handleAddQuestionKeyDown}
                      />
                      <TextField
                        size="small"
                        value={newSolution}
                        onChange={(e) => setNewSolution(e.target.value)}
                        placeholder="Antwort"
                        sx={{ width: 140 }}
                        onKeyDown={handleAddQuestionKeyDown}
                      />
                      <Button size="small" variant="contained" onClick={addSetQuestion} sx={{ minWidth: 34, width: 34, height: 30, p: 0 }}>
                        +
                      </Button>
                    </Box>
                    <Box sx={{ display: 'grid', gap: 0.6, mt: 0.8 }}>
                      {groupedSetQuestions.map((group) => {
                        const vis = visualForFragensetGroup(group.category);
                        return (
                        <Box key={group.category} sx={{ display: 'grid', gap: 0.45 }}>
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              px: 0.75,
                              py: 0.35,
                              borderRadius: 1,
                              width: 'fit-content',
                              bgcolor: vis.bg,
                              color: vis.fg,
                              border: '1px solid',
                              borderColor: vis.border,
                            }}
                          >
                            <Box component="span" sx={{ fontSize: '0.85rem', lineHeight: 1 }}>
                              {vis.icon}
                            </Box>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'inherit' }}>
                              {group.category}
                            </Typography>
                          </Box>
                          {group.items.map(({ q, idx, displayNumber }) => (
                            <Box
                              key={`${idx}-${q.prompt}`}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                p: 0.5,
                                border: '1px solid',
                                borderColor: vis.border,
                                borderRadius: 1,
                                bgcolor: vis.bg,
                              }}
                            >
                              {setEditIndex === idx ? (
                                <>
                                  <TextField
                                    size="small"
                                    value={setEditCategory}
                                    onChange={(e) => setSetEditCategory(e.target.value)}
                                    placeholder="Kategorie"
                                    sx={{ width: 110 }}
                                  />
                                  <TextField
                                    size="small"
                                    value={setEditPrompt}
                                    onChange={(e) => setSetEditPrompt(e.target.value)}
                                    placeholder="Frage"
                                    sx={{ flex: 1 }}
                                  />
                                  <TextField
                                    size="small"
                                    value={setEditSolution}
                                    onChange={(e) => setSetEditSolution(e.target.value)}
                                    placeholder="Lösung"
                                    sx={{ width: 130 }}
                                  />
                                  <Box sx={{ ml: 'auto', display: 'flex', gap: 0.35 }}>
                                    <Button size="small" variant="contained" onClick={saveSetEditing} sx={{ minWidth: 26, px: 0.6 }}>OK</Button>
                                    <Button size="small" onClick={cancelSetEditing} sx={{ minWidth: 26, px: 0.6 }}>Ab</Button>
                                  </Box>
                                </>
                              ) : (
                                <>
                                  <Typography variant="body2" sx={{ minWidth: 28, color: 'text.secondary', fontWeight: 700 }}>
                                    {displayNumber}.
                                  </Typography>
                                  <Typography variant="body2" sx={{ flex: 1 }}>
                                    {q.prompt}
                                  </Typography>
                                  <Typography variant="body2" sx={{ minWidth: 90, color: 'success.dark', fontWeight: 700 }}>
                                    {q.solution}
                                  </Typography>
                                  <Box sx={{ ml: 'auto', display: 'flex', gap: 0.35 }}>
                                    <Button size="small" variant="outlined" onClick={() => startSetEditing(idx)} sx={{ minWidth: 22, width: 22, height: 22, p: 0 }}>✎</Button>
                                    <Button size="small" color="error" variant="outlined" onClick={() => deleteSetQuestion(idx)} sx={{ minWidth: 22, width: 22, height: 22, p: 0 }}>×</Button>
                                  </Box>
                                </>
                              )}
                            </Box>
                          ))}
                        </Box>
                        );
                      })}
                    </Box>
                  </Box>
                )}
              </Box>
            ) : (
              <>
                <LinearProgress
                  variant="determinate"
                  value={progressPercent}
                  sx={{
                    ...determinateLinearProgressSx(
                      'linear-gradient(90deg, #5c6bc0 0%, #3949ab 38%, #1565c0 100%)',
                      { height: 11, barGlow: 'rgba(30, 136, 229, 0.35)' }
                    ),
                    mb: 1.25,
                  }}
                />

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 0.75,
                    flexWrap: 'nowrap',
                    mb: 1,
                    overflowX: 'auto',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, whiteSpace: 'nowrap' }}>
                    <Chip size="small" label={`${sessionDone ? activeTasks.length : currentIndex + 1}/${activeTasks.length}`} />
                    <Chip size="small" label={formatMMSS(remainingSeconds)} color="info" />
                    {!sessionDone && <Chip size="small" label={`${secondsLeft}s`} color="warning" />}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap' }}>
                <Tooltip title="Vorherige Folie">
                  <span>
                    <IconButton
                      size="small"
                      onClick={goPrevious}
                      aria-label="Vorherige Folie"
                      disabled={currentIndex === 0 && !sessionDone}
                      sx={{
                        p: 0,
                        minWidth: 24,
                        width: 24,
                        height: 24,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <SkipPreviousIcon sx={{ fontSize: 19 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                {!isRunning ? (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PlayArrowIcon sx={{ fontSize: 18 }} />}
                    onClick={startOrResume}
                    sx={{ minHeight: 24, py: 0, px: 0.75, minWidth: 64 }}
                  >
                    {sessionDone ? 'Neu' : 'Weiter'}
                  </Button>
                ) : (
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    startIcon={<PauseIcon sx={{ fontSize: 18 }} />}
                    onClick={pause}
                    sx={{ minHeight: 24, py: 0, px: 0.75, minWidth: 64 }}
                  >
                    Pause
                  </Button>
                )}
                <Tooltip title="Nächste Folie">
                  <span>
                    <IconButton
                      size="small"
                      onClick={goNext}
                      aria-label="Nächste Folie"
                      disabled={sessionDone}
                      sx={{
                        p: 0,
                        minWidth: 24,
                        width: 24,
                        height: 24,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <SkipNextIcon sx={{ fontSize: 19 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <IconButton
                  size="small"
                  onClick={restart}
                  aria-label="Zurücksetzen"
                  sx={{
                    p: 0,
                    minWidth: 24,
                    width: 24,
                    height: 24,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <RestartAltIcon sx={{ fontSize: 19 }} />
                </IconButton>
                  </Box>
                </Box>

                {!sessionDone ? (
                  <Box
                    sx={{
                      width: DISPLAY_BOX_WIDTH,
                      minWidth: DISPLAY_BOX_WIDTH,
                      maxWidth: DISPLAY_BOX_WIDTH,
                      height: DISPLAY_BOX_HEIGHT,
                      minHeight: DISPLAY_BOX_HEIGHT,
                      maxHeight: DISPLAY_BOX_HEIGHT,
                      borderRadius: 2,
                      p: { xs: 2, sm: 3 },
                      border: '1px solid #d9e0ff',
                      bgcolor: '#f8faff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: 1.2,
                    }}
                  >
                    <Typography
                      sx={{
                        width: '100%',
                        maxWidth: DISPLAY_BOX_WIDTH - 40,
                        fontSize: '4.5rem',
                        lineHeight: 1.1,
                        fontWeight: 500,
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {renderPrompt(formattedPrompt, 'live', true)}
                    </Typography>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      width: DISPLAY_BOX_WIDTH,
                      minWidth: DISPLAY_BOX_WIDTH,
                      maxWidth: DISPLAY_BOX_WIDTH,
                      height: FINAL_DISPLAY_BOX_HEIGHT,
                      minHeight: FINAL_DISPLAY_BOX_HEIGHT,
                      maxHeight: FINAL_DISPLAY_BOX_HEIGHT,
                      borderRadius: 2,
                      p: { xs: 1.5, sm: 2 },
                      border: '1px solid #d9e0ff',
                      bgcolor: '#f8faff',
                      overflow: 'hidden',
                    }}
                  >
                    {isTeacher && (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap', mb: 0.75 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={showSolutions}
                              onChange={(e) => setShowSolutions(e.target.checked)}
                            />
                          }
                          label="Lösungen anzeigen"
                          sx={{ mr: 0 }}
                        />
                      </Box>
                    )}

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gridTemplateRows: `repeat(${finalSlideRows}, minmax(0, auto))`,
                        gridAutoFlow: 'column',
                        gap: 0.8,
                        mt: isTeacher ? 0 : 0.75,
                      }}
                    >
                      {activeTasks.map((task, index) => (
                        <Box
                          key={`${index}-${task.prompt}`}
                          sx={{
                            p: 0.72,
                            borderRadius: 1.5,
                            bgcolor: 'white',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, width: '100%', minWidth: 0 }}>
                            <Typography
                              component="span"
                              variant="body2"
                              sx={{ fontSize: '0.98rem', lineHeight: 1.16, whiteSpace: 'nowrap', flexShrink: 0 }}
                            >
                              {index + 1}.
                            </Typography>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              {showSolutions
                                ? renderPromptWithInlineGreenSolution(task.prompt, task.solution, `final-${index}`, true)
                                : (
                                  <Typography variant="body2" sx={{ fontSize: '0.98rem', lineHeight: 1.16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {renderPrompt(task.prompt, `final-${index}`, false, true)}
                                  </Typography>
                                )}
                            </Box>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </>
            )}

          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
