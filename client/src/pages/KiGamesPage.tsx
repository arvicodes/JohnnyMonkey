import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  AutoAwesome as AutoAwesomeIcon,
  Casino as CasinoIcon,
  CheckCircle as CheckCircleIcon,
  Extension as ExtensionIcon,
  Map as MapIcon,
  Psychology as PsychologyIcon,
  Quiz as QuizIcon,
  RestartAlt as RestartAltIcon,
  Rule as RuleIcon,
  SportsEsports as SportsEsportsIcon,
} from '@mui/icons-material';
import { determinateLinearProgressSx } from '../lib/muiLinearProgressSx';

type TabId =
  | 'overview'
  | 'nim'
  | 'hexapawn'
  | 'memory'
  | 'escape'
  | 'truefalse'
  | 'bingo'
  | 'kiornot'
  | 'quickcheck'
  | 'aufgabenampel'
  | 'denkzeitdetektiv';
type MemoryCard = { id: string; pairId: string; pairIndex: number; kind: 'term' | 'text'; label: string; color: string };
type MemorySet = { id: string; name: string; leftText: string; rightText: string };
type HexPawn = 'W' | 'B';
type HexCell = HexPawn | null;
type HexBoard = HexCell[][];

const gameCards: {
  tab: TabId;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  goals: string[];
}[] = [
  {
    tab: 'nim',
    title: 'Nimm-Spiel',
    subtitle: 'Eine lernende KI vermeidet nach Niederlagen schlechte Zuege.',
    icon: <CasinoIcon />,
    color: '#f57c00',
    goals: ['Verstaerkendes Lernen', 'Strategien testen', 'KI-Fehler beobachten'],
  },
  {
    tab: 'hexapawn',
    title: 'Hexapawn',
    subtitle: 'Minimal-Schach als schneller Zugang zu lernenden Spielsystemen.',
    icon: <SportsEsportsIcon />,
    color: '#5e35b1',
    goals: ['Zustandsraeume', 'Gewinnbedingungen', 'Lernen durch Ausschluss'],
  },
  {
    tab: 'memory',
    title: 'KI-Memory',
    subtitle: 'Zwei passende Kartenlisten werden im Teamlauf zusammengefuehrt.',
    icon: <ExtensionIcon />,
    color: '#00897b',
    goals: ['Grundbegriffe sichern', 'Bewegung', 'Teamkommunikation'],
  },
  {
    tab: 'escape',
    title: 'Umgebungs-Escape',
    subtitle: 'QR-Rallye durch Vallendar mit KI-Raetseln rund um das Kloster.',
    icon: <MapIcon />,
    color: '#3949ab',
    goals: ['Ortsbezug', 'Kooperation', 'Transferfragen'],
  },
  {
    tab: 'truefalse',
    title: 'Wahr oder falsch',
    subtitle: 'Aussagen erscheinen vorne, die Klasse entscheidet mit Bewegung.',
    icon: <CheckCircleIcon />,
    color: '#43a047',
    goals: ['Diagnose', 'Aktivierung', 'Begruenden lernen'],
  },
  {
    tab: 'bingo',
    title: 'KI Bingo',
    subtitle: 'Begriffe aus Vortrag und Toolphase werden ueber Beispiele wiederholt.',
    icon: <QuizIcon />,
    color: '#c2185b',
    goals: ['Wiederholung', 'Begriffe sichern', 'Aktivierende Pause'],
  },
  {
    tab: 'kiornot',
    title: 'KI oder nicht KI?',
    subtitle: 'Unterrichtssituationen nach sinnvoll, problematisch oder abhaengig einordnen.',
    icon: <RuleIcon />,
    color: '#6d4c41',
    goals: ['Urteilsfaehigkeit', 'Reflexion', 'Transfer'],
  },
  {
    tab: 'quickcheck',
    title: 'KI Quick Check',
    subtitle: 'Leisen-Fokus: Hilft KI beim Lernen oder wird Denken abgekuerzt?',
    icon: <PsychologyIcon />,
    color: '#1565c0',
    goals: ['Lernzeit', 'Denkzeit', 'Anstrengung'],
  },
  {
    tab: 'aufgabenampel',
    title: 'Aufgaben Ampel KI',
    subtitle: 'Falck/Flick-Raster: KI thematisieren, integrieren, reflektieren oder begrenzen.',
    icon: <RuleIcon />,
    color: '#ef6c00',
    goals: ['Aufgabenkultur', 'Planung', 'Pruefungskultur'],
  },
  {
    tab: 'denkzeitdetektiv',
    title: 'Denkzeit-Detektiv',
    subtitle: 'Leisen-Spiel: Welche Anschlussaufgabe macht aus KI-Material echtes Lernen?',
    icon: <PsychologyIcon />,
    color: '#283593',
    goals: ['Anschlussaufgabe', 'Plausibilitaetsfalle', 'Denkzeit'],
  },
];

const memoryPairs: [string, string][] = [
  ['Lernzeit', 'Zeit, in der Schuelerinnen und Schueler wirklich fachlich arbeiten.'],
  ['Denkzeit', 'Aktive kognitive Auseinandersetzung statt nur fertige Ergebnisse uebernehmen.'],
  ['KI Bequemlichkeit', 'Die Gefahr, dass KI Anstrengung, Lesen, Denken oder Ueben ersetzt.'],
  ['Anschlussaufgabe', 'Die Aufgabe nach dem KI-Ergebnis: pruefen, vergleichen, anwenden oder verbessern.'],
  ['Pruefen', 'Kontrollieren, ob ein KI-Ergebnis fachlich stimmt und belegt werden kann.'],
  ['Vergleichen', 'Eigene Loesung und KI-Loesung gegenueberstellen und Unterschiede markieren.'],
  ['Denkfehler', 'Eine fachliche Fehlvorstellung erkennen und korrigieren.'],
  ['Experimentiergeraet', 'KI zum sprachlichen oder fachlichen Ausprobieren verschiedener Varianten nutzen.'],
  ['Plausibilitaetsfalle', 'Eine KI-Antwort klingt ueberzeugend, ist aber falsch oder ungenau.'],
  ['Vorwissen', 'Grundlage, um KI-Ergebnisse sinnvoll einordnen und bewerten zu koennen.'],
  ['Anstrengung', 'Notwendiger Bestandteil von Lernen, den KI nicht ersetzen sollte.'],
  ['Lernpartner', 'KI gibt Hinweise, Fragen oder Feedback statt sofort fertige Loesungen zu liefern.'],
];

const memoryPalette = [
  '#ef5350',
  '#ab47bc',
  '#5c6bc0',
  '#29b6f6',
  '#26a69a',
  '#66bb6a',
  '#d4e157',
  '#ffca28',
  '#ffa726',
  '#8d6e63',
  '#ec407a',
  '#7e57c2',
];

const memoryRowBackground = (rowCount: number) =>
  `repeating-linear-gradient(
    to bottom,
    rgba(227, 242, 253, 0.72) 0px,
    rgba(227, 242, 253, 0.72) 30px,
    rgba(255, 248, 225, 0.72) 30px,
    rgba(255, 248, 225, 0.72) 60px
  )`;

const kiMemoryLeftText = memoryPairs.map(([term]) => term).join('\n');
const kiMemoryRightText = memoryPairs.map(([, text]) => text).join('\n');

const defaultMemorySets: MemorySet[] = [
  { id: 'ki-leisen', name: 'KI / Leisen', leftText: kiMemoryLeftText, rightText: kiMemoryRightText },
  {
    id: 'blanko',
    name: 'Blanko-Beispiel',
    leftText: 'Sonne\nMond\nWasser\nBaum',
    rightText: 'Stern im Zentrum unseres Sonnensystems\nNatuerlicher Begleiter der Erde\nH2O, wichtig fuer Leben\nPflanze mit Stamm und Krone',
  },
];

const memoryStorageKey = 'johnnyMonkey.kiGames.memorySets.v1';

function loadSavedMemoryState(): { sets: MemorySet[]; selectedId: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(memoryStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { sets?: MemorySet[]; selectedId?: string };
    const sets = Array.isArray(parsed.sets)
      ? parsed.sets.filter(
          (set): set is MemorySet =>
            typeof set?.id === 'string' &&
            typeof set?.name === 'string' &&
            typeof set?.leftText === 'string' &&
            typeof set?.rightText === 'string'
        )
      : [];
    if (!sets.length) return null;
    return { sets, selectedId: typeof parsed.selectedId === 'string' ? parsed.selectedId : sets[0].id };
  } catch {
    return null;
  }
}

const trueFalseStatements = [
  {
    text: 'Eine KI versteht Texte immer genauso wie ein Mensch.',
    answer: false,
    explain: 'Viele Systeme berechnen wahrscheinliche Muster, ohne menschliches Weltverstaendnis zu besitzen.',
  },
  {
    text: 'Trainingsdaten koennen Vorurteile enthalten.',
    answer: true,
    explain: 'Wenn Daten einseitig sind, kann das Modell diese Einseitigkeit uebernehmen.',
  },
  {
    text: 'Beim Nimm-Spiel kann eine KI durch verlorene Spiele bessere Zuege lernen.',
    answer: true,
    explain: 'Sie kann Zuege entfernen oder seltener waehlen, die direkt zu Niederlagen gefuehrt haben.',
  },
  {
    text: 'Ein Prompt ist nur fuer Bildgeneratoren wichtig.',
    answer: false,
    explain: 'Prompts steuern auch Text-, Code-, Audio- und viele andere KI-Systeme.',
  },
  {
    text: 'KI-Ergebnisse sollten bei wichtigen Entscheidungen ueberprueft werden.',
    answer: true,
    explain: 'KI kann halluzinieren, Daten falsch gewichten oder Kontext uebersehen.',
  },
  {
    text: 'Lernen entsteht schon dadurch, dass eine KI ein gutes Ergebnis ausgibt.',
    answer: false,
    explain: 'Nach Leisen entsteht Lernen erst durch aktive Verarbeitung, Anwendung, Uebung und Anstrengung.',
  },
  {
    text: 'Eine gute Anschlussaufgabe fragt: Was passiert nach der KI-Antwort?',
    answer: true,
    explain: 'KI-Material wird lernwirksam, wenn Lernende es pruefen, vergleichen, korrigieren oder weiterentwickeln.',
  },
  {
    text: 'Plausibel formulierte KI-Antworten sind automatisch fachlich richtig.',
    answer: false,
    explain: 'Die Plausibilitaetsfalle ist, dass falsche Antworten sehr ueberzeugend klingen koennen.',
  },
  {
    text: 'KI kann ein sprachliches und fachliches Experimentiergeraet sein.',
    answer: true,
    explain: 'Sinnvoll wird das, wenn Lernende Varianten vergleichen und daraus fachlich weiterarbeiten.',
  },
];

const bingoTerms = [
  'Prompt',
  'Halluzination',
  'Datenschutz',
  'Feedback',
  'Differenzierung',
  'ChatGPT',
  'Bias',
  'Quellenkritik',
  'Arbeitsauftrag',
  'Bildgenerator',
  'Schuelerrolle',
  'Kompetenz',
  'Transparenz',
  'Urheberrecht',
  'Lernprodukt',
  'Automatisierung',
  'Reflexion',
  'Bewertung',
  'Entlastung',
  'Verantwortung',
  'Training',
  'Modell',
  'Promptkette',
  'Pruefen',
  'Rollenwechsel',
  'Lernzeit',
  'Denkzeit',
  'KI Bequemlichkeit',
  'Anschlussaufgabe',
  'Vergleichen',
  'Denkfehler',
  'Experimentiergeraet',
  'Plausibilitaetsfalle',
  'Vorwissen',
  'Anstrengung',
  'Ueben und Festigen',
  'kognitive Aktivierung',
  'motivationale Aktivierung',
  'Lernpartner',
];

const bingoPrompts = [
  { clue: 'Eine KI gibt eine ueberzeugende Antwort, die aber sachlich falsch ist.', answer: 'Halluzination' },
  { clue: 'Eine gute Eingabe an ein KI-Tool nennt man oft ...', answer: 'Prompt' },
  { clue: 'KI bietet Lernenden Aufgaben auf verschiedenen Niveaus an.', answer: 'Differenzierung' },
  { clue: 'Bestimmte Gruppen werden systematisch verzerrt dargestellt oder benachteiligt.', answer: 'Bias' },
  { clue: 'Bevor KI-Antworten uebernommen werden, sollten Aussagen mit verlässlichen Quellen abgeglichen werden.', answer: 'Quellenkritik' },
  { clue: 'Wenn personenbezogene Daten nicht unbedacht in Tools eingegeben werden duerfen.', answer: 'Datenschutz' },
  { clue: 'KI nimmt Routinearbeit ab, ersetzt aber nicht die paedagogische Entscheidung.', answer: 'Entlastung' },
  { clue: 'Wer KI einsetzt, muss offenlegen koennen, wie ein Ergebnis entstanden ist.', answer: 'Transparenz' },
  { clue: 'KI kann Rueckmeldungen zu Argumentation, Struktur oder Sprache geben.', answer: 'Feedback' },
  { clue: 'Bei KI-generierten Bildern, Texten und Materialien muss die Rechtefrage bedacht werden.', answer: 'Urheberrecht' },
  { clue: 'Die Gefahr, dass KI die notwendige Anstrengung ersetzt.', answer: 'KI Bequemlichkeit' },
  { clue: 'Die entscheidende Aufgabe nach einem KI-Ergebnis.', answer: 'Anschlussaufgabe' },
  { clue: 'Aktive fachliche Auseinandersetzung statt Ergebnisuebernahme.', answer: 'Denkzeit' },
  { clue: 'Eine ueberzeugende, aber falsche KI-Antwort.', answer: 'Plausibilitaetsfalle' },
  { clue: 'KI zum Ausprobieren von Sprache, Niveau, Beispielen oder Perspektiven.', answer: 'Experimentiergeraet' },
  { clue: 'Eigene Loesung und KI-Loesung nebeneinanderlegen.', answer: 'Vergleichen' },
  { clue: 'Grundlage, um KI-Antworten sinnvoll beurteilen zu koennen.', answer: 'Vorwissen' },
  { clue: 'KI gibt Hinweise, Fragen oder Feedback statt sofort die Loesung zu liefern.', answer: 'Lernpartner' },
];

const kiOrNotCases = [
  {
    situation: 'Eine Lehrkraft laesst sich von KI drei Differenzierungsvarianten zu einem bestehenden Arbeitsblatt vorschlagen.',
    recommendation: 'sinnvoll',
    reason: 'Die Lehrkraft bleibt fachlich verantwortlich und nutzt KI als Ideengeber fuer Anpassungen.',
  },
  {
    situation: 'Schuelerinnen und Schueler geben eine komplette Hausarbeit in ein KI-Tool ein und uebernehmen die Antwort unveraendert.',
    recommendation: 'problematisch',
    reason: 'Eigenleistung, Quellenkritik und Lernprozess gehen verloren.',
  },
  {
    situation: 'Eine Lerngruppe nutzt KI, um eine erste Erklaerung zu einem schwierigen Fachbegriff zu bekommen, prueft diese aber im Schulbuch.',
    recommendation: 'gestaltung',
    reason: 'Als Einstieg sinnvoll, wenn die Pruefung und Korrektur fest eingeplant sind.',
  },
  {
    situation: 'Eine Lehrkraft bewertet Texte ausschliesslich mit KI, ohne die Ergebnisse zu pruefen.',
    recommendation: 'problematisch',
    reason: 'Bewertung braucht Verantwortung, Kontext und menschliche Kontrolle.',
  },
  {
    situation: 'Schuelerinnen und Schueler lassen sich Feedback zu ihrer Argumentation geben und ueberarbeiten danach ihren eigenen Text.',
    recommendation: 'sinnvoll',
    reason: 'KI unterstuetzt den Prozess, die Ueberarbeitung bleibt bei den Lernenden.',
  },
  {
    situation: 'Eine Klasse erstellt mit einem Bildgenerator Symbolbilder fuer ein Lernplakat und bespricht Grenzen und Urheberrecht.',
    recommendation: 'gestaltung',
    reason: 'Der Einsatz kann lernwirksam sein, wenn Rechte, Quellen und Aussagekraft reflektiert werden.',
  },
  {
    situation: 'Eine Schuelerin uebernimmt eine KI-Zusammenfassung, ohne den Originaltext zu lesen.',
    recommendation: 'problematisch',
    reason: 'Das ist KI Bequemlichkeit: Die eigentliche Lese- und Denkzeit verschwindet.',
  },
  {
    situation: 'Eine Lerngruppe vergleicht eine KI-Zusammenfassung mit dem Originaltext und markiert Fehler, Auslassungen und gute Formulierungen.',
    recommendation: 'sinnvoll',
    reason: 'Die KI liefert Material; die Anschlussaufgabe erzeugt Pruefen, Vergleichen und Begruenden.',
  },
  {
    situation: 'Eine Lehrkraft laesst KI-Feedback automatisch an die Klasse ausgeben, ohne es fachlich oder lerngruppenbezogen anzupassen.',
    recommendation: 'problematisch',
    reason: 'Die Lehrkraft bleibt zentral: Sie gestaltet und prueft den Lernprozess.',
  },
];

const quickCheckCases = [
  {
    statement: 'Eine Schuelerin laesst sich von der KI eine fertige Interpretation zu Kafka schreiben und uebernimmt sie unveraendert.',
    answer: 'B',
    discussion: 'Die eigene Auseinandersetzung mit dem Text wird uebersprungen. Leisen zeigt genau diese Gefahr am Beispiel "Die Verwandlung".',
  },
  {
    statement: 'Ein Schueler laesst sich von der KI eine Vokabelliste zum Wasserkreislauf erstellen und sucht die Begriffe danach im eigenen Text.',
    answer: 'A',
    discussion: 'Die KI liefert Material, aber die aktive Arbeit bleibt bei den Lernenden.',
  },
  {
    statement: 'Eine Lerngruppe nutzt KI, um einen Fachtext auf drei Niveaustufen erklaeren zu lassen und vergleicht anschliessend die Unterschiede.',
    answer: 'A',
    discussion: 'Die KI wird als sprachliches und fachliches Experimentiergeraet genutzt.',
  },
  {
    statement: 'Eine Lehrkraft laesst Schuelerinnen und Schueler eine KI-Antwort pruefen und mit Textbelegen widerlegen oder verbessern.',
    answer: 'A',
    discussion: 'Lernwirksam wird es, wenn Lernende KI-Ergebnisse pruefen, vergleichen und kritisch weiterverarbeiten.',
  },
  {
    statement: 'Eine Schuelerin fragt die KI: "Erledige meine Hausaufgabe komplett."',
    answer: 'B',
    discussion: 'Die KI ersetzt hier die Denkzeit.',
  },
  {
    statement: 'Eine Klasse nutzt KI, um eigene Denkfehler in fachlichen Aussagen zu finden.',
    answer: 'A',
    discussion: 'Leisen nutzt solche Beispiele, etwa zu Evolution, Waerme und Temperatur oder Kraeften beim Zusammenstoss.',
  },
  {
    statement: 'Eine Lehrkraft laesst die KI ein Arbeitsblatt erstellen, prueft es aber nicht weiter.',
    answer: 'C',
    discussion: 'KI kann entlasten, aber die fachliche und didaktische Pruefung bleibt notwendig.',
  },
  {
    statement: 'Schuelerinnen und Schueler lassen sich von der KI ein Quiz erstellen, loesen es selbst und lassen danach ihre Antworten bewerten.',
    answer: 'A',
    discussion: 'Das kann Lernzeit erzeugen, wenn sie selbst antworten und die Rueckmeldung pruefen.',
  },
  {
    statement: 'Eine KI formuliert sehr ueberzeugend eine falsche Antwort.',
    answer: 'B',
    discussion: 'Sprachmodelle koennen auch bei Fehlern plausibel formulieren. Das ist Staerke und Risiko zugleich.',
  },
  {
    statement: 'Eine Lehrkraft fragt nach jeder KI-Nutzung: "Was hast du selbst verstanden, geprueft oder veraendert?"',
    answer: 'A',
    discussion: 'Das lenkt den Blick vom Produkt auf den Lernprozess.',
  },
];

const aufgabenAmpelCases = [
  {
    task: 'Schuelerinnen und Schueler vergleichen eine Suchmaschine mit einem KI-Sprachmodell. Was passiert jeweils mit Informationen?',
    answer: 'A',
    accepted: ['A'],
    topic: 'KI verstehen',
    discussion: 'KI selbst wird zum Lerngegenstand: Funktionsweise, Chancen und Grenzen werden sichtbar.',
  },
  {
    task: 'Schuelerinnen und Schueler nutzen KI, um eine Vokabelliste zu einem Fachtext zu erstellen. Danach markieren sie die Begriffe im Originaltext.',
    answer: 'B',
    accepted: ['B'],
    topic: 'KI als Lernressource',
    discussion: 'KI ist Lernressource, aber die Anschlussaufgabe zwingt zur Arbeit am Fachtext.',
  },
  {
    task: 'Schuelerinnen und Schueler pruefen, ob eine KI-Interpretation durch Belege aus dem Originaltext gestuetzt wird.',
    answer: 'C',
    accepted: ['C'],
    topic: 'KI-Ergebnisse pruefen',
    discussion: 'Das KI-Ergebnis wird geprueft, hinterfragt und mit fachlichen Kriterien verglichen.',
  },
  {
    task: 'Schuelerinnen und Schueler schreiben zuerst ohne KI eine eigene Argumentation. Erst danach nutzen sie KI-Feedback.',
    answer: 'D, danach C',
    accepted: ['D', 'C'],
    topic: 'Eigene Kompetenz sichtbar machen und anschliessend reflektieren',
    discussion: 'Die erste Eigenleistung wird sichtbar; danach kann KI reflektiert zur Ueberarbeitung dienen.',
  },
  {
    task: 'Schuelerinnen und Schueler sollen erklaeren, warum KI-Antworten ueberzeugend klingen koennen, obwohl sie falsch sind.',
    answer: 'A',
    accepted: ['A'],
    topic: 'Funktionsweise und Grenzen von KI',
    discussion: 'Hier wird KI selbst verstanden und kritisch eingeordnet.',
  },
  {
    task: 'Schuelerinnen und Schueler lassen sich von KI drei Pruefungsfragen erstellen und beantworten diese selbst.',
    answer: 'B',
    accepted: ['B'],
    topic: 'KI zum Ueben nutzen',
    discussion: 'KI wird gezielt als Lernressource eingesetzt.',
  },
  {
    task: 'Schuelerinnen und Schueler vergleichen ihre eigene Loesung mit einer KI-Loesung und markieren Unterschiede.',
    answer: 'C',
    accepted: ['C'],
    topic: 'Reflexion und Qualitaetspruefung',
    discussion: 'Die Qualitaet der KI-Loesung wird anhand der eigenen Arbeit geprueft.',
  },
  {
    task: 'Schuelerinnen und Schueler duerfen bei einer muendlichen Kurzdiagnose keine KI nutzen.',
    answer: 'D',
    accepted: ['D'],
    topic: 'Eigenes Koennen sichtbar machen',
    discussion: 'KI wird bewusst begrenzt, damit Kompetenzen diagnostizierbar bleiben.',
  },
  {
    task: 'Schuelerinnen und Schueler nutzen KI als Lernpartner, der nur Fragen und Tipps gibt, aber nicht sofort die Loesung nennt.',
    answer: 'B',
    accepted: ['B'],
    topic: 'KI als Tutor',
    discussion: 'KI wird als Lernressource eingesetzt, ohne die Denkzeit sofort zu ersetzen.',
  },
  {
    task: 'Schuelerinnen und Schueler diskutieren, wann KI-Nutzung im Unterricht fair, sinnvoll oder problematisch ist.',
    answer: 'A oder C',
    accepted: ['A', 'C'],
    topic: 'Regeln, Verantwortung und Reflexion',
    discussion: 'Die Aufgabe kann KI thematisieren und zugleich die eigene Nutzung reflektieren.',
  },
  {
    task: 'Schuelerinnen und Schueler lassen sich eine Bewerbungsgespraechssituation simulieren und ueben Antworten.',
    answer: 'B',
    accepted: ['B'],
    topic: 'Rollenspiel und Uebung',
    discussion: 'KI wird als Lernressource fuer Training und Feedback genutzt.',
  },
  {
    task: 'Schuelerinnen und Schueler geben einen fehlerhaften Text in die KI und lassen Fehler nach Inhalt, Rechtschreibung und Grammatik sortieren. Danach ueberarbeiten sie den Text selbst.',
    answer: 'B und C',
    accepted: ['B', 'C'],
    topic: 'Unterstuetzung und Reflexion',
    discussion: 'KI unterstuetzt die Analyse; lernwirksam wird es durch Pruefung und eigene Ueberarbeitung.',
  },
  {
    task: 'Schuelerinnen und Schueler bekommen eine KI-Zusammenfassung und pruefen sie Satz fuer Satz am Originaltext.',
    answer: 'C',
    accepted: ['C'],
    topic: 'Plausibilitaetsfalle und Anschlussaufgabe',
    discussion: 'Die Aufgabe macht KI-Ergebnisse zum Gegenstand fachlicher Pruefung.',
  },
  {
    task: 'Schuelerinnen und Schueler lassen KI drei Erklaerungen auf verschiedenen Niveaustufen erzeugen und begruenden, welche fuer wen geeignet ist.',
    answer: 'B und C',
    accepted: ['B', 'C'],
    topic: 'KI als Experimentiergeraet',
    discussion: 'KI wird integriert; lernwirksam wird es durch Vergleich und Begruendung.',
  },
  {
    task: 'Schuelerinnen und Schueler notieren zuerst ihr Vorwissen, bevor sie eine KI-Erklaerung pruefen und ergaenzen.',
    answer: 'D, danach C',
    accepted: ['D', 'C'],
    topic: 'Vorwissen sichtbar machen',
    discussion: 'Die Begrenzung schuetzt eigene Denkzeit; danach wird KI reflektiert genutzt.',
  },
];

const leisenActions = ['Pruefen', 'Vergleichen', 'Begruenden', 'Korrigieren', 'Weiterentwickeln'] as const;

const denkzeitCards = [
  {
    scenario: 'KI liefert eine fertige Zusammenfassung zu einem Sachtext.',
    product: 'Schoenes Produkt, aber noch keine sichere Lernleistung.',
    action: 'Pruefen',
    feedback: 'Mit dem Originaltext abgleichen: Was stimmt, was fehlt, was ist zu ungenau?',
    concepts: ['Anschlussaufgabe', 'Vorwissen', 'Plausibilitaetsfalle'],
    risk: 'Nur kopieren wuerde Lernzeit abkuerzen.',
  },
  {
    scenario: 'KI erstellt eine Interpretation zu Kafka, die sehr ueberzeugend klingt.',
    product: 'Plausible Deutung ohne eigene Textarbeit.',
    action: 'Begruenden',
    feedback: 'Die Deutung muss mit Textbelegen begruendet oder widerlegt werden.',
    concepts: ['KI Bequemlichkeit', 'Denkzeit', 'Plausibilitaetsfalle'],
    risk: 'Die eigene Auseinandersetzung mit dem Text kann verschwinden.',
  },
  {
    scenario: 'KI erzeugt drei Erklaerungen eines Fachbegriffs auf unterschiedlichen Niveaus.',
    product: 'Sprachliches und fachliches Experimentiermaterial.',
    action: 'Vergleichen',
    feedback: 'Unterschiede markieren: Welche Begriffe, Beispiele und Vereinfachungen veraendern das Verstehen?',
    concepts: ['Experimentiergeraet', 'kognitive Aktivierung', 'Vorwissen'],
    risk: 'Ohne Vergleich bleibt es nur ein netter Textwechsel.',
  },
  {
    scenario: 'KI findet in einer Schuelerloesung moegliche Denkfehler.',
    product: 'Feedback mit fachlicher Unsicherheit.',
    action: 'Korrigieren',
    feedback: 'Die Lernenden korrigieren die eigene Loesung und erklaeren, welcher Denkfehler vorlag.',
    concepts: ['Denkfehler', 'Ueben und Festigen', 'Anstrengung'],
    risk: 'Feedback einfach zu uebernehmen ersetzt kein Verstehen.',
  },
  {
    scenario: 'KI gibt Feedback zu einem selbst geschriebenen Argumentationstext.',
    product: 'Rueckmeldung zu Struktur, Sprache und Inhalt.',
    action: 'Weiterentwickeln',
    feedback: 'Den eigenen Text ueberarbeiten und begruenden, welche Hinweise uebernommen oder verworfen wurden.',
    concepts: ['Lernpartner', 'Weiterentwickeln', 'motivationale Aktivierung'],
    risk: 'Nur glaetten lassen erzeugt ein besseres Produkt, aber wenig Lernprozess.',
  },
  {
    scenario: 'KI erstellt Quizfragen zu einem Thema.',
    product: 'Uebungsmaterial in kurzer Zeit.',
    action: 'Pruefen',
    feedback: 'Fragen selbst loesen, Loesungen pruefen und Fehler analysieren.',
    concepts: ['Ueben und Festigen', 'Lernzeit', 'Anschlussaufgabe'],
    risk: 'Quizfragen anschauen ist noch kein Ueben.',
  },
];

const escapeStations = [
  {
    place: 'Start: Rheinpromenade Vallendar',
    qr: 'KI-START',
    task: 'Ordnet drei KI-Beispiele und markiert: Wo entsteht echte Lernzeit, wo nur ein fertiges Produkt?',
    solution: 'Lernzeit entsteht dort, wo geprueft, verglichen, angewendet oder begruendet wird.',
  },
  {
    place: 'Weg zum Kloster Schoenstatt',
    qr: 'DATENSPUR',
    task: 'Findet eine plausible, aber unsichere Aussage. Wie wuerdet ihr sie fachlich pruefen?',
    solution: 'Plausibel heisst nicht richtig: Quelle, Beleg, Originalmaterial oder Fachwissen gegenpruefen.',
  },
  {
    place: 'Pilgerkirche / Innenhof',
    qr: 'BLACKBOX',
    task: 'Ihr bekommt ein KI-Ergebnis. Entwickelt eine Anschlussaufgabe, die Denkzeit erzwingt.',
    solution: 'Zum Beispiel: mit Original vergleichen, Fehler suchen, eigene Verbesserung begruenden.',
  },
  {
    place: 'Aussichtspunkt',
    qr: 'PROMPTLABOR',
    task: 'Nutzt KI als Experimentiergeraet: Erstellt zwei Erklaerungen fuer verschiedene Zielgruppen und vergleicht sie.',
    solution: 'Unterschiede in Sprache, Fachlichkeit, Beispielen und Verstaendlichkeit markieren.',
  },
  {
    place: 'Ziel: Schulhof / Klassenraum',
    qr: 'KI-KODE',
    task: 'Loest die Abschlussfrage: Was machen Lernende nach der KI-Antwort?',
    solution: 'Nicht uebernehmen, sondern bearbeiten: pruefen, vergleichen, korrigieren, begruenden, weiterentwickeln.',
  },
];

const initialHexBoard: HexBoard = [
  ['B', 'B', 'B'],
  [null, null, null],
  ['W', 'W', 'W'],
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function parseMemoryPairsFromColumns(leftText: string, rightText: string): [string, string][] {
  const leftLines = leftText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const rightLines = rightText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return leftLines
    .map((left, index) => [left, rightLines[index] || ''] as [string, string])
    .filter(([, right]) => Boolean(right));
}

function createMemoryDeck(pairs: [string, string][] = memoryPairs): MemoryCard[] {
  return shuffle(
    pairs.flatMap(([term, text], index) => [
      {
        id: `${index}-term`,
        pairId: String(index),
        pairIndex: index,
        kind: 'term' as const,
        label: term,
        color: memoryPalette[index % memoryPalette.length],
      },
      {
        id: `${index}-text`,
        pairId: String(index),
        pairIndex: index,
        kind: 'text' as const,
        label: text,
        color: memoryPalette[index % memoryPalette.length],
      },
    ])
  );
}

function createBingoBoard(size: 4 | 5): string[] {
  return shuffle(bingoTerms).slice(0, size * size);
}

function getHexMoves(board: HexBoard, pawn: HexPawn) {
  const direction = pawn === 'W' ? -1 : 1;
  const opponent = pawn === 'W' ? 'B' : 'W';
  const moves: { from: [number, number]; to: [number, number]; capture: boolean }[] = [];

  board.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell !== pawn) return;
      const nextRow = r + direction;
      if (nextRow < 0 || nextRow > 2) return;
      if (!board[nextRow][c]) moves.push({ from: [r, c], to: [nextRow, c], capture: false });
      [c - 1, c + 1].forEach((nextCol) => {
        if (nextCol < 0 || nextCol > 2) return;
        if (board[nextRow][nextCol] === opponent) {
          moves.push({ from: [r, c], to: [nextRow, nextCol], capture: true });
        }
      });
    });
  });

  return moves;
}

function cloneBoard(board: HexBoard): HexBoard {
  return board.map((row) => [...row]);
}

export default function KiGamesPage() {
  const [tab, setTab] = useState<TabId>('overview');
  const savedMemoryState = useMemo(() => loadSavedMemoryState(), []);
  const initialMemorySets = savedMemoryState?.sets?.length ? savedMemoryState.sets : defaultMemorySets;
  const initialMemorySet =
    initialMemorySets.find((set) => set.id === savedMemoryState?.selectedId) || initialMemorySets[0] || defaultMemorySets[0];

  const [nimSticks, setNimSticks] = useState(15);
  const [nimTurn, setNimTurn] = useState<'human' | 'ai' | 'done'>('human');
  const [nimWinner, setNimWinner] = useState<string>('');
  const [nimMemory, setNimMemory] = useState<Record<number, number[]>>({});
  const [lastAiMove, setLastAiMove] = useState<{ sticks: number; take: number } | null>(null);
  const [nimLog, setNimLog] = useState<string[]>(['Start mit 15 Hoelzern. Wer das letzte Holz nimmt, gewinnt.']);

  const [hexBoard, setHexBoard] = useState<HexBoard>(initialHexBoard);
  const [hexSelected, setHexSelected] = useState<[number, number] | null>(null);
  const [hexMessage, setHexMessage] = useState('Weiss beginnt. Ziehe einen weissen Bauern.');
  const [hexAvoidedMoves, setHexAvoidedMoves] = useState(0);

  const [memorySets, setMemorySets] = useState<MemorySet[]>(initialMemorySets);
  const [selectedMemorySetId, setSelectedMemorySetId] = useState(initialMemorySet.id);
  const [newMemorySetName, setNewMemorySetName] = useState('');
  const [memoryLeftText, setMemoryLeftText] = useState(initialMemorySet.leftText);
  const [memoryRightText, setMemoryRightText] = useState(initialMemorySet.rightText);
  const [memoryDeck, setMemoryDeck] = useState<MemoryCard[]>(() =>
    createMemoryDeck(parseMemoryPairsFromColumns(initialMemorySet.leftText, initialMemorySet.rightText))
  );
  const [memoryOpen, setMemoryOpen] = useState<string[]>([]);
  const [memorySolved, setMemorySolved] = useState<string[]>([]);
  const [memoryTeam, setMemoryTeam] = useState<'Team A' | 'Team B'>('Team A');
  const [memoryScore, setMemoryScore] = useState({ 'Team A': 0, 'Team B': 0 });

  const [tfIndex, setTfIndex] = useState(0);
  const [tfFeedback, setTfFeedback] = useState('');
  const [tfScore, setTfScore] = useState({ right: 0, wrong: 0 });
  const [bingoSize, setBingoSize] = useState<4 | 5>(4);
  const [bingoBoard, setBingoBoard] = useState<string[]>(() => createBingoBoard(4));
  const [bingoMarked, setBingoMarked] = useState<string[]>([]);
  const [bingoClueIndex, setBingoClueIndex] = useState(0);
  const [kiCaseIndex, setKiCaseIndex] = useState(0);
  const [kiCaseFeedback, setKiCaseFeedback] = useState('');
  const [quickCheckIndex, setQuickCheckIndex] = useState(0);
  const [quickCheckFeedback, setQuickCheckFeedback] = useState('');
  const [ampelIndex, setAmpelIndex] = useState(0);
  const [ampelFeedback, setAmpelFeedback] = useState('');
  const [denkzeitIndex, setDenkzeitIndex] = useState(0);
  const [denkzeitFeedback, setDenkzeitFeedback] = useState('');
  const [denkzeitScore, setDenkzeitScore] = useState({ right: 0, tries: 0 });

  const nimAvailableMoves = useMemo(() => {
    const learned = nimMemory[nimSticks] ?? [1, 2, 3];
    return learned.filter((n) => n <= nimSticks);
  }, [nimMemory, nimSticks]);

  const bingoLines = useMemo(() => {
    const lines: number[][] = [];
    for (let row = 0; row < bingoSize; row += 1) {
      lines.push(Array.from({ length: bingoSize }, (_, col) => row * bingoSize + col));
    }
    for (let col = 0; col < bingoSize; col += 1) {
      lines.push(Array.from({ length: bingoSize }, (_, row) => row * bingoSize + col));
    }
    lines.push(Array.from({ length: bingoSize }, (_, index) => index * bingoSize + index));
    lines.push(Array.from({ length: bingoSize }, (_, index) => index * bingoSize + (bingoSize - 1 - index)));
    return lines;
  }, [bingoSize]);

  const hasBingo = bingoLines.some((line) => line.every((index) => bingoMarked.includes(bingoBoard[index])));
  const memoryLeftRows = useMemo(() => memoryLeftText.split('\n'), [memoryLeftText]);
  const memoryRightRows = useMemo(() => memoryRightText.split('\n'), [memoryRightText]);
  const memoryTableRowCount = Math.max(4, memoryLeftRows.length, memoryRightRows.length);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(memoryStorageKey, JSON.stringify({ sets: memorySets, selectedId: selectedMemorySetId }));
    } catch {
      /* ignore storage errors */
    }
  }, [memorySets, selectedMemorySetId]);

  const resetNim = () => {
    setNimSticks(15);
    setNimTurn('human');
    setNimWinner('');
    setLastAiMove(null);
    setNimLog(['Neue Runde. Die KI behaelt ihre gelernten Verbote.']);
  };

  const finishNim = (winner: string, logLine: string) => {
    setNimTurn('done');
    setNimWinner(winner);
    setNimLog((prev) => [logLine, ...prev]);
    if (winner === 'Mensch' && lastAiMove) {
      setNimMemory((prev) => {
        const options = prev[lastAiMove.sticks] ?? [1, 2, 3];
        const filtered = options.filter((move) => move !== lastAiMove.take);
        return { ...prev, [lastAiMove.sticks]: filtered.length ? filtered : options };
      });
      setNimLog((prev) => [
        `Lerneffekt: Zug "${lastAiMove.take} nehmen" bei ${lastAiMove.sticks} Hoelzern wird kuenftig gemieden.`,
        ...prev,
      ]);
    }
  };

  const humanTake = (take: number) => {
    if (nimTurn !== 'human' || take > nimSticks) return;
    const next = nimSticks - take;
    setNimLog((prev) => [`Du nimmst ${take}. Es bleiben ${next}.`, ...prev]);
    setNimSticks(next);
    if (next <= 0) {
      finishNim('Mensch', 'Du nimmst das letzte Holz und gewinnst.');
      return;
    }
    setNimTurn('ai');

    window.setTimeout(() => {
      setNimSticks((current) => {
        const options = (nimMemory[current] ?? [1, 2, 3]).filter((n) => n <= current);
        const fallback = [1, 2, 3].filter((n) => n <= current);
        const legal = options.length ? options : fallback;
        const aiTake = legal[Math.floor(Math.random() * legal.length)] ?? 1;
        const remaining = current - aiTake;
        setLastAiMove({ sticks: current, take: aiTake });
        setNimLog((prev) => [`KI nimmt ${aiTake}. Es bleiben ${remaining}.`, ...prev]);
        if (remaining <= 0) {
          window.setTimeout(() => finishNim('KI', 'Die KI nimmt das letzte Holz und gewinnt.'), 0);
        } else {
          setNimTurn('human');
        }
        return remaining;
      });
    }, 450);
  };

  const resetHex = () => {
    setHexBoard(initialHexBoard);
    setHexSelected(null);
    setHexMessage('Weiss beginnt. Ziehe einen weissen Bauern.');
  };

  const checkHexWinner = (board: HexBoard) => {
    if (board[0].includes('W')) return 'Weiss erreicht die Grundlinie und gewinnt.';
    if (board[2].includes('B')) return 'Schwarz erreicht die Grundlinie und gewinnt.';
    if (!board.flat().includes('W')) return 'Schwarz gewinnt: keine weissen Bauern mehr.';
    if (!board.flat().includes('B')) return 'Weiss gewinnt: keine schwarzen Bauern mehr.';
    if (getHexMoves(board, 'W').length === 0) return 'Schwarz gewinnt: Weiss kann nicht ziehen.';
    if (getHexMoves(board, 'B').length === 0) return 'Weiss gewinnt: Schwarz kann nicht ziehen.';
    return '';
  };

  const makeHexAiMove = (board: HexBoard) => {
    const moves = getHexMoves(board, 'B');
    if (!moves.length) return board;
    const captures = moves.filter((move) => move.capture);
    const preferred = captures.length ? captures : moves;
    const move = preferred[Math.floor(Math.random() * preferred.length)];
    const next = cloneBoard(board);
    next[move.to[0]][move.to[1]] = 'B';
    next[move.from[0]][move.from[1]] = null;
    if (!move.capture && moves.length > 1) setHexAvoidedMoves((value) => value + 1);
    return next;
  };

  const clickHexCell = (row: number, col: number) => {
    const winner = checkHexWinner(hexBoard);
    if (winner) return;
    const cell = hexBoard[row][col];
    if (cell === 'W') {
      setHexSelected([row, col]);
      setHexMessage('Waehle ein Zielfeld: gerade vorwaerts oder diagonal zum Schlagen.');
      return;
    }
    if (!hexSelected) return;
    const move = getHexMoves(hexBoard, 'W').find(
      (m) => m.from[0] === hexSelected[0] && m.from[1] === hexSelected[1] && m.to[0] === row && m.to[1] === col
    );
    if (!move) {
      setHexMessage('Dieser Zug ist nicht erlaubt.');
      return;
    }
    const afterHuman = cloneBoard(hexBoard);
    afterHuman[row][col] = 'W';
    afterHuman[hexSelected[0]][hexSelected[1]] = null;
    setHexSelected(null);
    const humanWin = checkHexWinner(afterHuman);
    if (humanWin) {
      setHexBoard(afterHuman);
      setHexMessage(humanWin);
      return;
    }
    const afterAi = makeHexAiMove(afterHuman);
    setHexBoard(afterAi);
    setHexMessage(checkHexWinner(afterAi) || 'Schwarz hat gezogen. Weiss ist wieder dran.');
  };

  const flipMemoryCard = (card: MemoryCard) => {
    if (memorySolved.includes(card.pairId) || memoryOpen.includes(card.id) || memoryOpen.length >= 2) return;
    const nextOpen = [...memoryOpen, card.id];
    setMemoryOpen(nextOpen);
    if (nextOpen.length !== 2) return;

    const [a, b] = nextOpen.map((id) => memoryDeck.find((entry) => entry.id === id));
    const match = Boolean(a && b && a.pairId === b.pairId && a.kind !== b.kind);
    window.setTimeout(() => {
      if (match && a) {
        setMemorySolved((prev) => [...prev, a.pairId]);
        setMemoryScore((prev) => ({ ...prev, [memoryTeam]: prev[memoryTeam] + 1 }));
      } else {
        setMemoryTeam((prev) => (prev === 'Team A' ? 'Team B' : 'Team A'));
      }
      setMemoryOpen([]);
    }, 1800);
  };

  const resetMemory = () => {
    setMemoryDeck(createMemoryDeck(parseMemoryPairsFromColumns(memoryLeftText, memoryRightText)));
    setMemoryOpen([]);
    setMemorySolved([]);
    setMemoryTeam('Team A');
    setMemoryScore({ 'Team A': 0, 'Team B': 0 });
  };

  const updateMemoryColumn = (side: 'leftText' | 'rightText', value: string) => {
    if (side === 'leftText') setMemoryLeftText(value);
    else setMemoryRightText(value);
    setMemorySets((prev) => prev.map((set) => (set.id === selectedMemorySetId ? { ...set, [side]: value } : set)));
  };

  const addMemoryTableRow = () => {
    updateMemoryColumn('leftText', `${memoryLeftText}${memoryLeftText ? '\n' : ''}`);
    updateMemoryColumn('rightText', `${memoryRightText}${memoryRightText ? '\n' : ''}`);
  };

  const selectMemorySet = (id: string) => {
    const nextSet = memorySets.find((set) => set.id === id);
    if (!nextSet) return;
    setSelectedMemorySetId(nextSet.id);
    setMemoryLeftText(nextSet.leftText);
    setMemoryRightText(nextSet.rightText);
    setMemoryDeck(createMemoryDeck(parseMemoryPairsFromColumns(nextSet.leftText, nextSet.rightText)));
    setMemoryOpen([]);
    setMemorySolved([]);
    setMemoryTeam('Team A');
    setMemoryScore({ 'Team A': 0, 'Team B': 0 });
  };

  const createNewMemorySet = () => {
    const nextNumber = memorySets.length + 1;
    const cleanName = newMemorySetName.trim();
    const nextSet: MemorySet = {
      id: `custom-${Date.now()}`,
      name: cleanName || `Neuer Kartensatz ${nextNumber}`,
      leftText: 'Karte 1\nKarte 2\nKarte 3\nKarte 4',
      rightText: 'Passende Karte 1\nPassende Karte 2\nPassende Karte 3\nPassende Karte 4',
    };
    setMemorySets((prev) => [...prev, nextSet]);
    setSelectedMemorySetId(nextSet.id);
    setNewMemorySetName('');
    setMemoryLeftText(nextSet.leftText);
    setMemoryRightText(nextSet.rightText);
    setMemoryDeck(createMemoryDeck(parseMemoryPairsFromColumns(nextSet.leftText, nextSet.rightText)));
    setMemoryOpen([]);
    setMemorySolved([]);
    setMemoryTeam('Team A');
    setMemoryScore({ 'Team A': 0, 'Team B': 0 });
  };

  const answerTrueFalse = (answer: boolean) => {
    const current = trueFalseStatements[tfIndex];
    const correct = current.answer === answer;
    setTfScore((prev) => ({ right: prev.right + (correct ? 1 : 0), wrong: prev.wrong + (correct ? 0 : 1) }));
    setTfFeedback(`${correct ? 'Richtig' : 'Noch einmal diskutieren'}: ${current.explain}`);
  };

  const nextTrueFalse = () => {
    setTfIndex((prev) => (prev + 1) % trueFalseStatements.length);
    setTfFeedback('');
  };

  const resetBingo = (size: 4 | 5 = bingoSize) => {
    setBingoSize(size);
    setBingoBoard(createBingoBoard(size));
    setBingoMarked([]);
    setBingoClueIndex(0);
  };

  const toggleBingoTerm = (term: string) => {
    setBingoMarked((prev) => (prev.includes(term) ? prev.filter((item) => item !== term) : [...prev, term]));
  };

  const nextBingoClue = () => {
    setBingoClueIndex((prev) => (prev + 1) % bingoPrompts.length);
  };

  const judgeKiCase = (choice: string) => {
    const current = kiOrNotCases[kiCaseIndex];
    const labels: Record<string, string> = {
      sinnvoll: 'sinnvoller KI-Einsatz',
      problematisch: 'problematischer KI-Einsatz',
      gestaltung: 'kommt auf die Gestaltung an',
    };
    setKiCaseFeedback(
      `${choice === current.recommendation ? 'Passend' : 'Diskussionswuerdig'}: Empfehlung "${labels[current.recommendation]}". ${current.reason}`
    );
  };

  const nextKiCase = () => {
    setKiCaseIndex((prev) => (prev + 1) % kiOrNotCases.length);
    setKiCaseFeedback('');
  };

  const judgeQuickCheck = (choice: string) => {
    const current = quickCheckCases[quickCheckIndex];
    const labels: Record<string, string> = {
      A: 'KI unterstuetzt Lernen',
      B: 'KI verfuehrt zur Abkuerzung',
      C: 'Kommt auf die Aufgabe an',
    };
    setQuickCheckFeedback(
      `${choice === current.answer ? 'Passend' : 'Guter Diskussionsanlass'}: Antwort ${current.answer} - ${labels[current.answer]}. ${current.discussion}`
    );
  };

  const nextQuickCheck = () => {
    setQuickCheckIndex((prev) => (prev + 1) % quickCheckCases.length);
    setQuickCheckFeedback('');
  };

  const judgeAmpelCase = (choice: string) => {
    const current = aufgabenAmpelCases[ampelIndex];
    const isAccepted = current.accepted.includes(choice);
    setAmpelFeedback(
      `${isAccepted ? 'Passend' : 'Diskussionswuerdig'}: Antwort ${current.answer}. ${current.topic}. ${current.discussion}`
    );
  };

  const nextAmpelCase = () => {
    setAmpelIndex((prev) => (prev + 1) % aufgabenAmpelCases.length);
    setAmpelFeedback('');
  };

  const judgeDenkzeitAction = (choice: string) => {
    const current = denkzeitCards[denkzeitIndex];
    const correct = choice === current.action;
    setDenkzeitScore((prev) => ({ right: prev.right + (correct ? 1 : 0), tries: prev.tries + 1 }));
    setDenkzeitFeedback(
      `${correct ? 'Passend' : 'Noch genauer hinschauen'}: ${current.action}. ${current.feedback} Gefahr: ${current.risk}`
    );
  };

  const nextDenkzeitCard = () => {
    setDenkzeitIndex((prev) => (prev + 1) % denkzeitCards.length);
    setDenkzeitFeedback('');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#eef3f8',
        '& .MuiCardContent-root': { p: { xs: '10px !important', sm: '12px !important' } },
        '& .MuiPaper-root': { borderRadius: 2 },
        '& .MuiChip-root': { height: 24, fontWeight: 700 },
        '& .MuiButton-root': { borderRadius: 1.5, textTransform: 'none' },
        '& .MuiTypography-h5': { fontSize: { xs: '1.02rem', sm: '1.15rem' } },
        '& .MuiTypography-h6': { fontSize: { xs: '0.95rem', sm: '1.05rem' } },
      }}
    >
      <Box sx={{ maxWidth: 1180, mx: 'auto', px: { xs: 1, sm: 1.5 }, py: 1.25, pb: 2.5 }}>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            minHeight: 34,
            mb: 1.25,
            '& .MuiTab-root': {
              minHeight: 34,
              px: 1,
              py: 0.25,
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '0.78rem',
            },
          }}
        >
          <Tab value="overview" label="Uebersicht" />
          {gameCards.map((game) => (
            <Tab key={game.tab} value={game.tab} label={game.title} />
          ))}
        </Tabs>

        {tab === 'overview' && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 1.1 }}>
            {gameCards.map((game) => (
              <Card key={game.tab} elevation={0} sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 1.5,
                        bgcolor: game.color,
                        color: 'white',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {game.icon}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1f2937', lineHeight: 1.15 }}>
                        {game.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.35, mb: 0.75, fontSize: '0.78rem' }}>
                        {game.subtitle}
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        {game.goals.map((goal) => (
                          <Chip key={goal} size="small" label={goal} />
                        ))}
                      </Stack>
                    </Box>
                  </Box>
                  <Button onClick={() => setTab(game.tab)} variant="contained" size="small" sx={{ mt: 1 }} fullWidth>
                    Spiel oeffnen
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {tab === 'nim' && (
          <Paper elevation={0} sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2 }}>
            <SectionTitle title="Spiel 1: Das Nimm-Spiel" subtitle="Nimm 1 bis 3 Hoelzer. Wer das letzte nimmt, gewinnt." />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, my: 2 }}>
              {Array.from({ length: Math.max(0, nimSticks) }).map((_, index) => (
                <Box
                  key={index}
                  sx={{ width: 10, height: 54, borderRadius: 10, bgcolor: '#8d5524', boxShadow: 'inset 0 4px #c68642' }}
                />
              ))}
            </Box>
            <Typography sx={{ fontWeight: 800, mb: 1 }}>
              {nimWinner ? `Gewinner: ${nimWinner}` : nimTurn === 'ai' ? 'KI denkt...' : `${nimSticks} Hoelzer uebrig`}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {[1, 2, 3].map((take) => (
                <Button
                  key={take}
                  variant="contained"
                  disabled={nimTurn !== 'human' || take > nimSticks}
                  onClick={() => humanTake(take)}
                >
                  {take} nehmen
                </Button>
              ))}
              <Button startIcon={<RestartAltIcon />} onClick={resetNim} variant="outlined">
                Neue Runde
              </Button>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
              KI-Gedaechtnis
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              Erlaubte KI-Zuege bei aktueller Holzanzahl: {nimAvailableMoves.join(', ') || 'keine'}
            </Typography>
            <Typography variant="body2" sx={{ p: 1, borderRadius: 1.5, bgcolor: '#fff8e1', color: '#5d4037', fontWeight: 700, mb: 1 }}>
              Leisen-Bruecke: Die KI lernt nicht durch das Ergebnis allein, sondern durch Rueckmeldung. Uebertragen auf Unterricht:
              Was machen Lernende nach einer KI-Antwort?
            </Typography>
            <Stack spacing={0.75}>
              {nimLog.slice(0, 6).map((line, index) => (
                <Typography key={`${line}-${index}`} variant="body2" sx={{ color: index === 0 ? '#1a237e' : 'text.secondary' }}>
                  {line}
                </Typography>
              ))}
            </Stack>
          </Paper>
        )}

        {tab === 'hexapawn' && (
          <Paper elevation={0} sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2 }}>
            <SectionTitle
              title="Spiel 2: Hexapawn"
              subtitle="Du spielst Weiss. Schwarz bevorzugt Schlagzuege und demonstriert die Idee eines lernenden Gegners."
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '360px 1fr' }, gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', width: 330, maxWidth: '100%', border: '4px solid #263238' }}>
                {hexBoard.map((row, r) =>
                  row.map((cell, c) => {
                    const selected = hexSelected?.[0] === r && hexSelected?.[1] === c;
                    return (
                      <Button
                        key={`${r}-${c}`}
                        onClick={() => clickHexCell(r, c)}
                        sx={{
                          height: 100,
                          minWidth: 0,
                          borderRadius: 0,
                          border: '1px solid #263238',
                          bgcolor: selected ? '#ffe082' : (r + c) % 2 ? '#d7ccc8' : '#fff8e1',
                          color: cell === 'W' ? '#1565c0' : '#263238',
                          fontSize: '2rem',
                          fontWeight: 900,
                          '&:hover': { bgcolor: selected ? '#ffd54f' : '#e3f2fd' },
                        }}
                      >
                        {cell || ''}
                      </Button>
                    );
                  })
                )}
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 900, mb: 1 }}>{hexMessage}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7, mb: 2 }}>
                  Ziel: einen Bauern auf die gegnerische Grundlinie bringen, alle gegnerischen Bauern schlagen oder den
                  Gegner blockieren. Im Unterricht koennen verlorene Schwarz-Zuege wie beim Original-Hexapawn aus einer
                  Zugliste gestrichen werden.
                </Typography>
                <Chip label={`Demonstrierte KI-Auswahl: ${hexAvoidedMoves} einfache Zuege nachrangig behandelt`} sx={{ mb: 2 }} />
                <Typography variant="body2" sx={{ p: 1, borderRadius: 1.5, bgcolor: '#ede7f6', color: '#311b92', fontWeight: 700, mb: 1 }}>
                  Leisen-Bruecke: Gute Zuege entstehen durch Ausprobieren, Pruefen und Korrigieren. Genau so werden
                  KI-Ergebnisse erst durch Anschlussaufgaben lernwirksam.
                </Typography>
                <br />
                <Button startIcon={<RestartAltIcon />} onClick={resetHex} variant="outlined">
                  Brett zuruecksetzen
                </Button>
              </Box>
            </Box>
          </Paper>
        )}

        {tab === 'memory' && (
          <Paper elevation={0} sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2 }}>
            <SectionTitle
              title="Spiel 3: Memory"
              subtitle="Allgemeines Memory: Kartensatz waehlen, benennen, zwei Karten-Spalten fuellen und bunt spielen."
            />
            <Box sx={{ display: 'grid', gap: 1, mb: 1.25 }}>
              <Box sx={{ display: 'grid', gap: 1 }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel id="memory-set-label">Kartensatz</InputLabel>
                    <Select
                      labelId="memory-set-label"
                      label="Kartensatz"
                      value={selectedMemorySetId}
                      onChange={(event) => selectMemorySet(String(event.target.value))}
                    >
                      {memorySets.map((set) => (
                        <MenuItem key={set.id} value={set.id}>
                          {set.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Name neuer Kartensatz"
                    value={newMemorySetName}
                    onChange={(event) => setNewMemorySetName(event.target.value)}
                    size="small"
                    sx={{ minWidth: { xs: '100%', sm: 230 } }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    onClick={createNewMemorySet}
                    sx={{ minWidth: 34, width: 34, height: 34, p: 0 }}
                    aria-label="Neuen Kartensatz erstellen"
                  >
                    <AddIcon sx={{ fontSize: 18 }} />
                  </Button>
                </Stack>
                <Box sx={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 2, overflow: 'hidden', bgcolor: 'white' }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '46px minmax(0, 1fr) 46px 46px minmax(0, 1fr)',
                      gap: 0,
                      bgcolor: '#263238',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: '0.78rem',
                    }}
                  >
                    <Box sx={{ p: 0.75, textAlign: 'center' }}>Nr.</Box>
                    <Box sx={{ p: 0.75 }}>Karten links</Box>
                    <Box sx={{ p: 0.75, textAlign: 'center' }}>Paar</Box>
                    <Box sx={{ p: 0.75, textAlign: 'center' }}>Nr.</Box>
                    <Box sx={{ p: 0.75 }}>Passende Karten rechts</Box>
                  </Box>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '46px minmax(0, 1fr) 46px 46px minmax(0, 1fr)',
                      borderTop: '1px solid rgba(0,0,0,0.08)',
                      '--memory-row-height': '30px',
                      background: memoryRowBackground(memoryTableRowCount),
                    }}
                  >
                    <Box
                      component="textarea"
                      value={Array.from({ length: memoryTableRowCount }, (_, index) => index + 1).join('\n')}
                      readOnly
                      rows={Math.max(6, memoryTableRowCount)}
                      tabIndex={-1}
                      sx={{
                        display: 'block',
                        width: '100%',
                        minHeight: `calc(var(--memory-row-height) * ${Math.max(6, memoryTableRowCount)})`,
                        m: 0,
                        p: 0,
                        border: 0,
                        outline: 'none',
                        resize: 'none',
                        overflow: 'hidden',
                        font: 'inherit',
                        fontWeight: 900,
                        lineHeight: 'var(--memory-row-height)',
                        textAlign: 'center',
                        color: '#263238',
                        background: 'transparent',
                        boxSizing: 'border-box',
                      }}
                    />
                    <Box
                      component="textarea"
                      value={memoryLeftText}
                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => updateMemoryColumn('leftText', event.target.value)}
                      rows={Math.max(6, memoryTableRowCount)}
                      spellCheck={false}
                      wrap="off"
                      sx={{
                        display: 'block',
                        width: '100%',
                        minWidth: 0,
                        minHeight: `calc(var(--memory-row-height) * ${Math.max(6, memoryTableRowCount)})`,
                        m: 0,
                        px: 0.75,
                        py: 0,
                        borderLeft: '1px solid rgba(0,0,0,0.08)',
                        borderTop: 0,
                        borderRight: 0,
                        borderBottom: 0,
                        outline: 'none',
                        resize: 'vertical',
                        font: 'inherit',
                        lineHeight: 'var(--memory-row-height)',
                        whiteSpace: 'pre',
                        overflowX: 'auto',
                        background: 'transparent',
                        boxSizing: 'border-box',
                      }}
                    />
                    <Box
                      component="textarea"
                      value={Array.from({ length: memoryTableRowCount }, () => '=').join('\n')}
                      readOnly
                      rows={Math.max(6, memoryTableRowCount)}
                      tabIndex={-1}
                      sx={{
                        display: 'block',
                        width: '100%',
                        minHeight: `calc(var(--memory-row-height) * ${Math.max(6, memoryTableRowCount)})`,
                        m: 0,
                        p: 0,
                        borderTop: 0,
                        borderRight: 0,
                        borderBottom: 0,
                        borderLeft: '1px solid rgba(0,0,0,0.08)',
                        outline: 'none',
                        resize: 'none',
                        overflow: 'hidden',
                        font: 'inherit',
                        fontWeight: 900,
                        lineHeight: 'var(--memory-row-height)',
                        textAlign: 'center',
                        color: '#3949ab',
                        background: 'transparent',
                        boxSizing: 'border-box',
                      }}
                    />
                    <Box
                      component="textarea"
                      value={Array.from({ length: memoryTableRowCount }, (_, index) => index + 1).join('\n')}
                      readOnly
                      rows={Math.max(6, memoryTableRowCount)}
                      tabIndex={-1}
                      sx={{
                        display: 'block',
                        width: '100%',
                        minHeight: `calc(var(--memory-row-height) * ${Math.max(6, memoryTableRowCount)})`,
                        m: 0,
                        p: 0,
                        borderTop: 0,
                        borderRight: 0,
                        borderBottom: 0,
                        borderLeft: '1px solid rgba(0,0,0,0.08)',
                        outline: 'none',
                        resize: 'none',
                        overflow: 'hidden',
                        font: 'inherit',
                        fontWeight: 900,
                        lineHeight: 'var(--memory-row-height)',
                        textAlign: 'center',
                        color: '#263238',
                        background: 'transparent',
                        boxSizing: 'border-box',
                      }}
                    />
                    <Box
                      component="textarea"
                      value={memoryRightText}
                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => updateMemoryColumn('rightText', event.target.value)}
                      rows={Math.max(6, memoryTableRowCount)}
                      spellCheck={false}
                      wrap="off"
                      sx={{
                        display: 'block',
                        width: '100%',
                        minWidth: 0,
                        minHeight: `calc(var(--memory-row-height) * ${Math.max(6, memoryTableRowCount)})`,
                        m: 0,
                        px: 0.75,
                        py: 0,
                        borderLeft: '1px solid rgba(0,0,0,0.08)',
                        borderTop: 0,
                        borderRight: 0,
                        borderBottom: 0,
                        outline: 'none',
                        resize: 'vertical',
                        font: 'inherit',
                        lineHeight: 'var(--memory-row-height)',
                        whiteSpace: 'pre',
                        overflowX: 'auto',
                        background: 'transparent',
                        boxSizing: 'border-box',
                      }}
                    />
                  </Box>
                </Box>
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                  <Button size="small" variant="contained" onClick={resetMemory}>
                    Kartensatz spielen
                  </Button>
                  <Button size="small" startIcon={<RestartAltIcon />} onClick={resetMemory} variant="outlined">
                    Neu mischen
                  </Button>
                  <Button size="small" onClick={addMemoryTableRow} variant="outlined">
                    Zeile hinzufuegen
                  </Button>
                  <Chip label={`${parseMemoryPairsFromColumns(memoryLeftText, memoryRightText).length} Paare`} />
                </Stack>
              </Box>
            </Box>

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1.25 }}>
              <Chip color="primary" label={`Am Zug: ${memoryTeam}`} />
              <Chip label={`Team A: ${memoryScore['Team A']}`} />
              <Chip label={`Team B: ${memoryScore['Team B']}`} />
              <Chip label={`${memorySolved.length}/${Math.max(1, memoryDeck.length / 2)} Paare gefunden`} />
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(6, 1fr)' },
                gap: 1,
              }}
            >
              {memoryDeck.map((card) => {
                const visible = memoryOpen.includes(card.id) || memorySolved.includes(card.pairId);
                const solved = memorySolved.includes(card.pairId);
                return (
                  <Button
                    key={card.id}
                    onClick={() => flipMemoryCard(card)}
                    sx={{
                      minHeight: 116,
                      p: 1,
                      borderRadius: 2.5,
                      border: visible ? `3px solid ${card.color}` : '3px solid rgba(255,255,255,0.75)',
                      background: visible
                        ? `linear-gradient(135deg, ${card.color}22 0%, #ffffff 100%)`
                        : `linear-gradient(135deg, ${card.color} 0%, #263238 100%)`,
                      color: visible ? '#1f2937' : 'white',
                      textTransform: 'none',
                      fontWeight: 900,
                      lineHeight: 1.25,
                      boxShadow: visible
                        ? `0 4px 14px ${card.color}33`
                        : `0 8px 18px ${card.color}55`,
                      opacity: solved ? 0.72 : 1,
                      transform: visible ? 'rotateY(0deg)' : 'rotateY(0deg) scale(1)',
                      transition: 'all 0.18s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: `0 10px 22px ${card.color}66`,
                      },
                    }}
                  >
                    {visible ? (
                      <Box>
                        {card.label}
                      </Box>
                    ) : (
                      <Box>
                        <Typography sx={{ fontSize: '1.65rem', fontWeight: 1000, lineHeight: 1 }}>?</Typography>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 900 }}>Memory</Typography>
                      </Box>
                    )}
                  </Button>
                );
              })}
            </Box>
          </Paper>
        )}

        {tab === 'escape' && (
          <Paper elevation={0} sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2 }}>
            <SectionTitle
              title="Spiel 4: Umgebungs-Escape-Game"
              subtitle="GPS-/QR-Spiel fuer Vallendar und das Kloster Schoenstatt mit KI-Bezug."
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(5, 1fr)' }, gap: 1.25 }}>
              {escapeStations.map((station, index) => (
                <Card key={station.qr} elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2 }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 900 }}>
                      Station {index + 1}
                    </Typography>
                    <Typography sx={{ fontWeight: 900, mb: 1 }}>{station.place}</Typography>
                    <Box
                      sx={{
                        width: 74,
                        height: 74,
                        display: 'grid',
                        placeItems: 'center',
                        border: '6px solid #111827',
                        mx: 'auto',
                        my: 1,
                        fontSize: '0.65rem',
                        fontWeight: 900,
                        textAlign: 'center',
                      }}
                    >
                      QR
                      <br />
                      {station.qr}
                    </Box>
                    <Typography variant="body2" sx={{ lineHeight: 1.55, mb: 1 }}>
                      {station.task}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#3949ab', fontWeight: 800 }}>
                      Loesungshinweis: {station.solution}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Paper>
        )}

        {tab === 'truefalse' && (
          <Paper elevation={0} sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2 }}>
            <SectionTitle
              title="Spiel 5: Wahr oder falsch"
              subtitle="Alle stehen hintereinander auf einer Linie. Wahr = rechts, falsch = links."
            />
            <LinearProgress
              variant="determinate"
              value={((tfIndex + 1) / trueFalseStatements.length) * 100}
              sx={{ ...determinateLinearProgressSx, mb: 2, height: 8, borderRadius: 99 }}
            />
            <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#fffde7', border: '1px solid #ffe082', mb: 2 }}>
              <CardContent>
                <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary' }}>
                  Aussage {tfIndex + 1} von {trueFalseStatements.length}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, mt: 1 }}>
                  {trueFalseStatements[tfIndex].text}
                </Typography>
              </CardContent>
            </Card>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Button size="large" variant="contained" color="success" onClick={() => answerTrueFalse(true)}>
                Rechts: wahr
              </Button>
              <Button size="large" variant="contained" color="error" onClick={() => answerTrueFalse(false)}>
                Links: falsch
              </Button>
              <Button size="large" variant="outlined" onClick={nextTrueFalse}>
                Naechste Aussage
              </Button>
            </Stack>
            {tfFeedback && (
              <Typography sx={{ p: 1.5, borderRadius: 2, bgcolor: '#e3f2fd', color: '#0d47a1', fontWeight: 700 }}>
                {tfFeedback}
              </Typography>
            )}
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              Treffer: {tfScore.right} · Diskussionsbedarf: {tfScore.wrong}
            </Typography>
          </Paper>
        )}

        {tab === 'bingo' && (
          <Paper elevation={0} sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2 }}>
            <SectionTitle
              title="Spiel 6: KI Bingo"
              subtitle="Nach Vortrag und Toolphase: Begriffe wiederholen, indem Beispiele den passenden Feldern zugeordnet werden."
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '360px 1fr' }, gap: 2 }}>
              <Card elevation={0} sx={{ bgcolor: '#fce4ec', border: '1px solid #f8bbd0', borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: '#880e4f' }}>
                    Vorlesen
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, my: 1, color: '#3f0d2f' }}>
                    {bingoPrompts[bingoClueIndex].clue}
                  </Typography>
                  <Chip label={`Antwort: ${bingoPrompts[bingoClueIndex].answer}`} sx={{ fontWeight: 800, mb: 2 }} />
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Button variant="contained" onClick={() => toggleBingoTerm(bingoPrompts[bingoClueIndex].answer)}>
                      Antwort markieren
                    </Button>
                    <Button variant="outlined" onClick={nextBingoClue}>
                      Naechster Impuls
                    </Button>
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                    Zeitpunkt 1: als aktivierende Pause nach Vortrag und Kennenlernen verschiedener KI-Tools. Wer zuerst
                    eine Reihe, Spalte oder Diagonale voll hat, ruft "KI Bingo".
                  </Typography>
                </CardContent>
              </Card>

              <Box>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                  <Chip color={hasBingo ? 'success' : 'default'} label={hasBingo ? 'KI Bingo!' : `${bingoMarked.length} markiert`} />
                  <Button size="small" variant={bingoSize === 4 ? 'contained' : 'outlined'} onClick={() => resetBingo(4)}>
                    4 x 4
                  </Button>
                  <Button size="small" variant={bingoSize === 5 ? 'contained' : 'outlined'} onClick={() => resetBingo(5)}>
                    5 x 5
                  </Button>
                  <Button size="small" startIcon={<RestartAltIcon />} onClick={() => resetBingo()}>
                    Neu mischen
                  </Button>
                </Stack>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${bingoSize}, minmax(0, 1fr))`,
                    gap: 1,
                  }}
                >
                  {bingoBoard.map((term) => {
                    const marked = bingoMarked.includes(term);
                    return (
                      <Button
                        key={term}
                        onClick={() => toggleBingoTerm(term)}
                        sx={{
                          minHeight: { xs: 74, sm: 92 },
                          p: 1,
                          borderRadius: 2,
                          border: '1px solid rgba(0,0,0,0.12)',
                          bgcolor: marked ? '#c8e6c9' : 'white',
                          color: marked ? '#1b5e20' : '#263238',
                          textTransform: 'none',
                          fontWeight: 900,
                          lineHeight: 1.2,
                          boxShadow: marked ? '0 0 0 2px rgba(67, 160, 71, 0.25)' : 'none',
                        }}
                      >
                        {term}
                      </Button>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          </Paper>
        )}

        {tab === 'kiornot' && (
          <Paper elevation={0} sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2 }}>
            <SectionTitle
              title="Spiel 7: KI oder nicht KI?"
              subtitle="Nach der Materialphase: Unterrichtssituationen einordnen und die Entscheidung kurz begruenden."
            />
            <LinearProgress
              variant="determinate"
              value={((kiCaseIndex + 1) / kiOrNotCases.length) * 100}
              sx={{ ...determinateLinearProgressSx, mb: 2, height: 8, borderRadius: 99 }}
            />
            <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#efebe9', border: '1px solid #d7ccc8', mb: 2 }}>
              <CardContent>
                <Typography variant="caption" sx={{ fontWeight: 900, color: '#5d4037' }}>
                  Situation {kiCaseIndex + 1} von {kiOrNotCases.length}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, mt: 1, color: '#3e2723' }}>
                  {kiOrNotCases[kiCaseIndex].situation}
                </Typography>
              </CardContent>
            </Card>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1, mb: 2 }}>
              <Button size="large" variant="contained" color="success" onClick={() => judgeKiCase('sinnvoll')}>
                sinnvoller KI-Einsatz
              </Button>
              <Button size="large" variant="contained" color="error" onClick={() => judgeKiCase('problematisch')}>
                problematischer KI-Einsatz
              </Button>
              <Button size="large" variant="contained" color="warning" onClick={() => judgeKiCase('gestaltung')}>
                kommt auf die Gestaltung an
              </Button>
            </Box>
            {kiCaseFeedback && (
              <Typography sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fff8e1', color: '#5d4037', fontWeight: 700, mb: 2 }}>
                {kiCaseFeedback}
              </Typography>
            )}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Button variant="outlined" onClick={nextKiCase}>
                Naechste Situation
              </Button>
              <Chip label="Positionieren: links / Mitte / rechts oder mit Karten anzeigen" />
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
              Bogen fuer die Fortbildung: Vortrag und Toolphase, KI Bingo zur Wiederholung, Arbeit mit konkretem
              Material, danach "KI oder nicht KI?" zur Anwendung und gemeinsame Auswertung.
            </Typography>
          </Paper>
        )}

        {tab === 'quickcheck' && (
          <Paper elevation={0} sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2 }}>
            <SectionTitle
              title="Spiel 8: KI Quick Check"
              subtitle="Nach dem Vortrag: Wird KI zur Lernchance oder zur Abkuerzung am Denkprozess vorbei?"
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.8fr' }, gap: 2 }}>
              <Box>
                <LinearProgress
                  variant="determinate"
                  value={((quickCheckIndex + 1) / quickCheckCases.length) * 100}
                  sx={{ ...determinateLinearProgressSx, mb: 2, height: 8, borderRadius: 99 }}
                />
                <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#e3f2fd', border: '1px solid #90caf9', mb: 2 }}>
                  <CardContent>
                    <Typography variant="caption" sx={{ fontWeight: 900, color: '#0d47a1' }}>
                      Spielkarte {quickCheckIndex + 1} von {quickCheckCases.length} · Antwort A, B oder C
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 1, color: '#0d47a1' }}>
                      {quickCheckCases[quickCheckIndex].statement}
                    </Typography>
                  </CardContent>
                </Card>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1, mb: 2 }}>
                  <Button size="large" variant="contained" color="success" onClick={() => judgeQuickCheck('A')}>
                    A: KI unterstuetzt Lernen
                  </Button>
                  <Button size="large" variant="contained" color="error" onClick={() => judgeQuickCheck('B')}>
                    B: KI verfuehrt zur Abkuerzung
                  </Button>
                  <Button size="large" variant="contained" color="warning" onClick={() => judgeQuickCheck('C')}>
                    C: Kommt auf die Aufgabe an
                  </Button>
                </Box>
                {quickCheckFeedback && (
                  <Typography sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fff8e1', color: '#0d47a1', fontWeight: 700, mb: 2 }}>
                    {quickCheckFeedback}
                  </Typography>
                )}
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 800, mb: 1.5 }}>
                  Zusatzfrage: Wo entsteht hier Denkzeit fuer Schuelerinnen und Schueler?
                </Typography>
                <Button variant="outlined" onClick={nextQuickCheck}>
                  Naechste Aussage
                </Button>
              </Box>

              <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
                    Didaktischer Fokus
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7, mb: 1.5 }}>
                    Leisen-Perspektive: Lernwirksam wird KI erst, wenn Lernende an und mit KI-Ergebnissen arbeiten,
                    ihr Vorwissen aktivieren, pruefen, vergleichen, begruenden und ueberarbeiten.
                  </Typography>
                  <Stack spacing={1}>
                    {['Toolnutzung allein reicht nicht.', 'Entscheidend sind Lernzeit und Denkzeit.', 'Krommer-Frage: Was veraendert KI an Lern- und Pruefungskultur?'].map((item) => (
                      <Chip key={item} label={item} sx={{ justifyContent: 'flex-start', fontWeight: 700 }} />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </Paper>
        )}

        {tab === 'aufgabenampel' && (
          <Paper elevation={0} sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2 }}>
            <SectionTitle
              title="Spiel 9: Aufgaben Ampel KI"
              subtitle="Nach der Schuelerperspektive: Welche didaktische Funktion erfuellt KI in der Aufgabe?"
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '0.95fr 1.05fr' }, gap: 2 }}>
              <Box>
                <LinearProgress
                  variant="determinate"
                  value={((ampelIndex + 1) / aufgabenAmpelCases.length) * 100}
                  sx={{ ...determinateLinearProgressSx, mb: 2, height: 8, borderRadius: 99 }}
                />
                <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#fff3e0', border: '1px solid #ffcc80', mb: 2 }}>
                  <CardContent>
                    <Typography variant="caption" sx={{ fontWeight: 900, color: '#e65100' }}>
                      Aufgabenkarte {ampelIndex + 1} von {aufgabenAmpelCases.length} · Antwort A, B, C oder D
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 1, color: '#3e2723' }}>
                      {aufgabenAmpelCases[ampelIndex].task}
                    </Typography>
                    <Chip label={`Thema: ${aufgabenAmpelCases[ampelIndex].topic}`} sx={{ mt: 1.5, fontWeight: 800 }} />
                  </CardContent>
                </Card>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1, mb: 2 }}>
                  <Button variant="contained" onClick={() => judgeAmpelCase('A')}>
                    A: KI thematisieren
                  </Button>
                  <Button variant="contained" color="success" onClick={() => judgeAmpelCase('B')}>
                    B: KI integrieren
                  </Button>
                  <Button variant="contained" color="secondary" onClick={() => judgeAmpelCase('C')}>
                    C: KI reflektieren
                  </Button>
                  <Button variant="contained" color="warning" onClick={() => judgeAmpelCase('D')}>
                    D: KI begrenzen
                  </Button>
                </Box>
                {ampelFeedback && (
                  <Typography sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f3e5f5', color: '#4a148c', fontWeight: 700, mb: 2 }}>
                    {ampelFeedback}
                  </Typography>
                )}
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 800, mb: 1.5 }}>
                  Zusatzfrage: Wo entsteht hier Denkzeit fuer Schuelerinnen und Schueler?
                </Typography>
                <Button variant="outlined" onClick={nextAmpelCase}>
                  Naechste Aufgabenkarte
                </Button>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.25 }}>
                {[
                  ['KI thematisieren', 'KI selbst verstehen, Chancen und Risiken einordnen.'],
                  ['KI integrieren', 'KI als Lernressource nutzen, ohne den Lernprozess abzugeben.'],
                  ['KI reflektieren', 'KI-Ergebnisse pruefen, vergleichen, hinterfragen und verbessern.'],
                  ['KI begrenzen', 'Bewusst ohne KI arbeiten, damit Kompetenzen sichtbar werden.'],
                ].map(([title, text]) => (
                  <Card key={title} elevation={0} sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                    <CardContent sx={{ p: 1.5 }}>
                      <Typography sx={{ fontWeight: 900, mb: 0.5 }}>{title}</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55 }}>
                        {text}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
                <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', gridColumn: { sm: '1 / -1' } }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Roter Faden</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.65 }}>
                      Leisen fragt nach Lernzeit, Denkzeit und Anstrengung. Krommer oeffnet den Blick auf veraenderte
                      Lern- und Pruefungskultur. Falck liefert mit den Aufgabenkategorien ein Planungsraster fuer
                      konkrete Unterrichtsentscheidungen.
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Paper>
        )}

        {tab === 'denkzeitdetektiv' && (
          <Paper elevation={0} sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2 }}>
            <SectionTitle
              title="Spiel 10: Denkzeit-Detektiv"
              subtitle="Leisen kompakt: KI liefert Material. Lernen entsteht erst durch die Anschlussaufgabe."
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.15fr 0.85fr' }, gap: 1.25 }}>
              <Box>
                <LinearProgress
                  variant="determinate"
                  value={((denkzeitIndex + 1) / denkzeitCards.length) * 100}
                  sx={{ ...determinateLinearProgressSx, mb: 1.25, height: 7, borderRadius: 99 }}
                />
                <Card elevation={0} sx={{ borderRadius: 2, bgcolor: '#e8eaf6', border: '1px solid #c5cae9', mb: 1.25 }}>
                  <CardContent>
                    <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                      <Chip label={`Karte ${denkzeitIndex + 1}/${denkzeitCards.length}`} />
                      <Chip label={`Score ${denkzeitScore.right}/${denkzeitScore.tries}`} color={denkzeitScore.right ? 'success' : 'default'} />
                    </Stack>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#1a237e', lineHeight: 1.25, mb: 0.75 }}>
                      {denkzeitCards[denkzeitIndex].scenario}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#3949ab', fontWeight: 800 }}>
                      KI-Produkt: {denkzeitCards[denkzeitIndex].product}
                    </Typography>
                  </CardContent>
                </Card>

                <Typography variant="body2" sx={{ fontWeight: 900, mb: 0.75 }}>
                  Welche Anschlussaufgabe erzeugt hier am ehesten Denkzeit?
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(5, 1fr)' }, gap: 0.75, mb: 1.25 }}>
                  {leisenActions.map((action) => (
                    <Button key={action} variant="contained" size="small" onClick={() => judgeDenkzeitAction(action)}>
                      {action}
                    </Button>
                  ))}
                </Box>

                {denkzeitFeedback && (
                  <Typography sx={{ p: 1.25, borderRadius: 2, bgcolor: '#fff8e1', color: '#1a237e', fontWeight: 700, mb: 1.25 }}>
                    {denkzeitFeedback}
                  </Typography>
                )}

                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <Button variant="outlined" size="small" onClick={nextDenkzeitCard}>
                    Naechste Karte
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setDenkzeitIndex(0);
                      setDenkzeitFeedback('');
                      setDenkzeitScore({ right: 0, tries: 0 });
                    }}
                  >
                    Neu starten
                  </Button>
                </Stack>
              </Box>

              <Box sx={{ display: 'grid', gap: 1 }}>
                <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 900, mb: 0.75 }}>Leisen-Merksatz</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55 }}>
                      KI kann Arbeit abkuerzen, aber Lernen darf sie nicht abkuerzen. Entscheidend ist nicht:
                      Was kann die KI? Sondern: Was machen Lernende mit dem KI-Ergebnis?
                    </Typography>
                  </CardContent>
                </Card>
                <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 900, mb: 0.75 }}>Begriffe dieser Karte</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {denkzeitCards[denkzeitIndex].concepts.map((concept) => (
                        <Chip key={concept} label={concept} />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
                <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 900, mb: 0.75 }}>Detektivfrage</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55 }}>
                      Erzeugt die Aufgabe echte Lernzeit und Denkzeit oder nur ein schoenes Produkt?
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
        <AutoAwesomeIcon sx={{ color: '#3949ab', fontSize: 18 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1f2937', lineHeight: 1.2 }}>
          {title}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.35, fontSize: '0.82rem' }}>
        {subtitle}
      </Typography>
    </Box>
  );
}
