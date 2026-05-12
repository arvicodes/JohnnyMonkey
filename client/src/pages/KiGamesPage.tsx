import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  IconButton,
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
  ArrowBack as ArrowBackIcon,
  AutoAwesome as AutoAwesomeIcon,
  Casino as CasinoIcon,
  CheckCircle as CheckCircleIcon,
  Extension as ExtensionIcon,
  FileDownload as FileDownloadIcon,
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
    subtitle: 'Eine lernende KI vermeidet nach Niederlagen schlechte Züge.',
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
    goals: ['Zustandsräume', 'Gewinnbedingungen', 'Lernen durch Ausschluss'],
  },
  {
    tab: 'memory',
    title: 'KI-Memory',
    subtitle: 'Zwei passende Kartenlisten werden im Teamlauf zusammengeführt.',
    icon: <ExtensionIcon />,
    color: '#00897b',
    goals: ['Grundbegriffe sichern', 'Bewegung', 'Teamkommunikation'],
  },
  {
    tab: 'escape',
    title: 'Umgebungs-Escape',
    subtitle: 'QR-Rallye durch Vallendar mit KI-Rätseln rund um das Kloster.',
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
    goals: ['Diagnose', 'Aktivierung', 'Begründen lernen'],
  },
  {
    tab: 'bingo',
    title: 'KI Bingo',
    subtitle: 'Begriffe aus Vortrag und Toolphase werden über Beispiele wiederholt.',
    icon: <QuizIcon />,
    color: '#c2185b',
    goals: ['Wiederholung', 'Begriffe sichern', 'Aktivierende Pause'],
  },
  {
    tab: 'kiornot',
    title: 'KI oder nicht KI?',
    subtitle: 'Unterrichtssituationen nach sinnvoll, problematisch oder abhängig einordnen.',
    icon: <RuleIcon />,
    color: '#6d4c41',
    goals: ['Urteilsfähigkeit', 'Reflexion', 'Transfer'],
  },
  {
    tab: 'quickcheck',
    title: 'KI Quick Check',
    subtitle: 'Leisen-Fokus: Hilft KI beim Lernen oder wird Denken abgekürzt?',
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
    goals: ['Aufgabenkultur', 'Planung', 'Prüfungskultur'],
  },
  {
    tab: 'denkzeitdetektiv',
    title: 'Denkzeit-Detektiv',
    subtitle: 'Leisen-Spiel: Welche Anschlussaufgabe macht aus KI-Material echtes Lernen?',
    icon: <PsychologyIcon />,
    color: '#283593',
    goals: ['Anschlussaufgabe', 'Plausibilitätsfalle', 'Denkzeit'],
  },
];

const memoryPairs: [string, string][] = [
  ['Lernzeit', 'Zeit, in der Schülerinnen und Schüler wirklich fachlich arbeiten.'],
  ['Denkzeit', 'Aktive kognitive Auseinandersetzung statt nur fertige Ergebnisse übernehmen.'],
  ['KI Bequemlichkeit', 'Die Gefahr, dass KI Anstrengung, Lesen, Denken oder Üben ersetzt.'],
  ['Anschlussaufgabe', 'Die Aufgabe nach dem KI-Ergebnis: prüfen, vergleichen, anwenden oder verbessern.'],
  ['Prüfen', 'Kontrollieren, ob ein KI-Ergebnis fachlich stimmt und belegt werden kann.'],
  ['Vergleichen', 'Eigene Lösung und KI-Lösung gegenüberstellen und Unterschiede markieren.'],
  ['Denkfehler', 'Eine fachliche Fehlvorstellung erkennen und korrigieren.'],
  ['Experimentiergerät', 'KI zum sprachlichen oder fachlichen Ausprobieren verschiedener Varianten nutzen.'],
  ['Plausibilitätsfalle', 'Eine KI-Antwort klingt überzeugend, ist aber falsch oder ungenau.'],
  ['Vorwissen', 'Grundlage, um KI-Ergebnisse sinnvoll einordnen und bewerten zu können.'],
  ['Anstrengung', 'Notwendiger Bestandteil von Lernen, den KI nicht ersetzen sollte.'],
  ['Lernpartner', 'KI gibt Hinweise, Fragen oder Feedback statt sofort fertige Lösungen zu liefern.'],
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

const memoryTeamColors = {
  'Team A': '#ff6d00',
  'Team B': '#00897b',
} as const;

const memoryTeamAnimals = {
  'Team A': '🐯',
  'Team B': '🐔',
} as const;

const memoryTeamNames = {
  'Team A': 'Tigerkatzen',
  'Team B': 'Johnny Hühner',
} as const;

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

const kiStudientageLeftText = [
  '🔎 Google und ChatGPT vergleichen',
  '📚 Vokabelliste + Textarbeit',
  '📌 KI-Antwort mit Belegen prüfen',
  '✍️ Erst ohne KI, dann Feedback',
  '📄 Fertige Interpretation übernehmen',
  '❓ KI-Quiz selbst lösen',
  '📊 Begriff auf drei Niveaus',
  '🧠 Denkfehler in Aussage finden',
  '💬 KI fragt und gibt Tipps',
  '🛤️ Eigenen Arbeitsweg erklären',
  '⚖️ Faire KI-Nutzung diskutieren',
  '✅ KI-Material fachlich prüfen',
].join('\n');

const kiStudientageRightText = [
  'KI thematisieren',
  'KI integrieren',
  'KI reflektieren',
  'KI limitieren',
  'KI Bequemlichkeit',
  'Üben und Sichern',
  'Niveaudifferenzierung',
  'Denkfehler korrigieren',
  'KI als Lernpartner',
  'Denkzeit sichtbar machen',
  'Verantwortung',
  'Lehrkraft verantwortlich',
].join('\n');

const kiStudientage2LeftText = [
  '🤖 Wie erzeugt ChatGPT Antworten?',
  '📚 KI-Vokabelliste + Textarbeit',
  '📌 KI-Antwort mit Textbelegen prüfen',
  '✍️ Erst ohne KI, dann Feedback',
  '📄 Fertige KI-Lösung übernehmen',
  '💬 KI stellt Fragen und Tipps',
  '🧠 KI findet Denkfehler',
  '📊 Text auf mehreren Niveaus',
  '✅ KI erstellt Material',
  '🛠️ KI-Ergebnisse bearbeiten',
  '⚠️ KI klingt richtig, liegt falsch',
  '🧭 KI erzeugt fertige Produkte',
].join('\n');

const kiStudientage2RightText = [
  'KI thematisieren',
  'KI integrieren',
  'KI reflektieren',
  'KI limitieren',
  'KI Bequemlichkeit',
  'KI als Lernpartner',
  'Fehlvorstellungen erkennen',
  'Differenzierung',
  'Fachliche und didaktische Prüfung',
  'Lernzeit und Denkzeit',
  'Grenzen von KI',
  'Prozessorientierung',
].join('\n');

const kiStudientage3LeftText = [
  '🤖 Suchmaschine vs. Sprachmodell',
  '📚 Vokabelliste im Text nutzen',
  '📌 Kafka-Antwort mit Fehlern',
  '✍️ Erst eigene Lösung schreiben',
  '📊 Drei Sprachniveaus vergleichen',
  '🧠 Dunkle Falter: Denkfehler',
  '💬 KI fragt nur nach',
  '🛤️ Was kam von dir?',
  '📄 Fertige Lösung übernehmen',
  '✅ Material didaktisch prüfen',
  '🚦 Wo darf KI helfen?',
  '⚖️ Erleichterung oder Anstrengung?',
].join('\n');

const kiStudientage3RightText = [
  'KI verstehen',
  'KI als Einstiegshilfe',
  'Plausibilität prüfen',
  'Eigenleistung sichern',
  'Sprachniveau reflektieren',
  'Fehlvorstellung sichtbar machen',
  'Tutor statt Lösungsmaschine',
  'Prozess zählt',
  'Bequemlichkeitsfalle',
  'Lehrkraft didaktisch verantwortlich',
  'KI-Einsatz begrenzen',
  'KI-Nutzung reflektieren',
].join('\n');

const defaultMemorySets: MemorySet[] = [
  { id: 'ki-leisen', name: 'KI / Leisen', leftText: kiMemoryLeftText, rightText: kiMemoryRightText },
  { id: 'ki-studientage', name: 'KI Studientage', leftText: kiStudientageLeftText, rightText: kiStudientageRightText },
  { id: 'ki-studientage-2', name: 'KI Studientage 2', leftText: kiStudientage2LeftText, rightText: kiStudientage2RightText },
  { id: 'ki-studientage-3', name: 'KI Studientage 3', leftText: kiStudientage3LeftText, rightText: kiStudientage3RightText },
  {
    id: 'blanko',
    name: 'Blanko-Beispiel',
    leftText: 'Sonne\nMond\nWasser\nBaum',
    rightText: 'Stern im Zentrum unseres Sonnensystems\nNatürlicher Begleiter der Erde\nH2O, wichtig für Leben\nPflanze mit Stamm und Krone',
  },
];

const memoryStorageKey = 'johnnyMonkey.kiGames.memorySets.v1';

function includeMissingDefaultMemorySets(sets: MemorySet[]) {
  const ids = new Set(sets.map((set) => set.id));
  return [...sets, ...defaultMemorySets.filter((set) => !ids.has(set.id))];
}

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
    const mergedSets = includeMissingDefaultMemorySets(sets);
    return { sets: mergedSets, selectedId: typeof parsed.selectedId === 'string' ? parsed.selectedId : mergedSets[0].id };
  } catch {
    return null;
  }
}

const trueFalseStatements = [
  {
    text: 'Eine KI versteht Texte immer genauso wie ein Mensch.',
    answer: false,
    explain: 'Viele Systeme berechnen wahrscheinliche Muster, ohne menschliches Weltverständnis zu besitzen.',
  },
  {
    text: 'Trainingsdaten können Vorurteile enthalten.',
    answer: true,
    explain: 'Wenn Daten einseitig sind, kann das Modell diese Einseitigkeit übernehmen.',
  },
  {
    text: 'Beim Nimm-Spiel kann eine KI durch verlorene Spiele bessere Züge lernen.',
    answer: true,
    explain: 'Sie kann Züge entfernen oder seltener wählen, die direkt zu Niederlagen geführt haben.',
  },
  {
    text: 'Ein Prompt ist nur für Bildgeneratoren wichtig.',
    answer: false,
    explain: 'Prompts steuern auch Text-, Code-, Audio- und viele andere KI-Systeme.',
  },
  {
    text: 'KI-Ergebnisse sollten bei wichtigen Entscheidungen überprüft werden.',
    answer: true,
    explain: 'KI kann halluzinieren, Daten falsch gewichten oder Kontext übersehen.',
  },
  {
    text: 'Lernen entsteht schon dadurch, dass eine KI ein gutes Ergebnis ausgibt.',
    answer: false,
    explain: 'Nach Leisen entsteht Lernen erst durch aktive Verarbeitung, Anwendung, Übung und Anstrengung.',
  },
  {
    text: 'Eine gute Anschlussaufgabe fragt: Was passiert nach der KI-Antwort?',
    answer: true,
    explain: 'KI-Material wird lernwirksam, wenn Lernende es prüfen, vergleichen, korrigieren oder weiterentwickeln.',
  },
  {
    text: 'Plausibel formulierte KI-Antworten sind automatisch fachlich richtig.',
    answer: false,
    explain: 'Die Plausibilitätsfalle ist, dass falsche Antworten sehr überzeugend klingen können.',
  },
  {
    text: 'KI kann ein sprachliches und fachliches Experimentiergerät sein.',
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
  'Schülerrolle',
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
  'Prüfen',
  'Rollenwechsel',
  'Lernzeit',
  'Denkzeit',
  'KI Bequemlichkeit',
  'Anschlussaufgabe',
  'Vergleichen',
  'Denkfehler',
  'Experimentiergerät',
  'Plausibilitätsfalle',
  'Vorwissen',
  'Anstrengung',
  'Üben und Festigen',
  'kognitive Aktivierung',
  'motivationale Aktivierung',
  'Lernpartner',
];

const bingoPrompts = [
  { clue: 'Eine KI gibt eine überzeugende Antwort, die aber sachlich falsch ist.', answer: 'Halluzination' },
  { clue: 'Eine gute Eingabe an ein KI-Tool nennt man oft ...', answer: 'Prompt' },
  { clue: 'KI bietet Lernenden Aufgaben auf verschiedenen Niveaus an.', answer: 'Differenzierung' },
  { clue: 'Bestimmte Gruppen werden systematisch verzerrt dargestellt oder benachteiligt.', answer: 'Bias' },
  { clue: 'Bevor KI-Antworten übernommen werden, sollten Aussagen mit verlässlichen Quellen abgeglichen werden.', answer: 'Quellenkritik' },
  { clue: 'Wenn personenbezogene Daten nicht unbedacht in Tools eingegeben werden dürfen.', answer: 'Datenschutz' },
  { clue: 'KI nimmt Routinearbeit ab, ersetzt aber nicht die pädagogische Entscheidung.', answer: 'Entlastung' },
  { clue: 'Wer KI einsetzt, muss offenlegen können, wie ein Ergebnis entstanden ist.', answer: 'Transparenz' },
  { clue: 'KI kann Rückmeldungen zu Argumentation, Struktur oder Sprache geben.', answer: 'Feedback' },
  { clue: 'Bei KI-generierten Bildern, Texten und Materialien muss die Rechtefrage bedacht werden.', answer: 'Urheberrecht' },
  { clue: 'Die Gefahr, dass KI die notwendige Anstrengung ersetzt.', answer: 'KI Bequemlichkeit' },
  { clue: 'Die entscheidende Aufgabe nach einem KI-Ergebnis.', answer: 'Anschlussaufgabe' },
  { clue: 'Aktive fachliche Auseinandersetzung statt Ergebnisübernahme.', answer: 'Denkzeit' },
  { clue: 'Eine überzeugende, aber falsche KI-Antwort.', answer: 'Plausibilitätsfalle' },
  { clue: 'KI zum Ausprobieren von Sprache, Niveau, Beispielen oder Perspektiven.', answer: 'Experimentiergerät' },
  { clue: 'Eigene Lösung und KI-Lösung nebeneinanderlegen.', answer: 'Vergleichen' },
  { clue: 'Grundlage, um KI-Antworten sinnvoll beurteilen zu können.', answer: 'Vorwissen' },
  { clue: 'KI gibt Hinweise, Fragen oder Feedback statt sofort die Lösung zu liefern.', answer: 'Lernpartner' },
];

const kiOrNotCases = [
  {
    situation: 'Eine Lehrkraft lässt sich von KI drei Differenzierungsvarianten zu einem bestehenden Arbeitsblatt vorschlagen.',
    recommendation: 'sinnvoll',
    reason: 'Die Lehrkraft bleibt fachlich verantwortlich und nutzt KI als Ideengeber für Anpassungen.',
  },
  {
    situation: 'Schülerinnen und Schüler geben eine komplette Hausarbeit in ein KI-Tool ein und übernehmen die Antwort unverändert.',
    recommendation: 'problematisch',
    reason: 'Eigenleistung, Quellenkritik und Lernprozess gehen verloren.',
  },
  {
    situation: 'Eine Lerngruppe nutzt KI, um eine erste Erklärung zu einem schwierigen Fachbegriff zu bekommen, prüft diese aber im Schulbuch.',
    recommendation: 'gestaltung',
    reason: 'Als Einstieg sinnvoll, wenn die Prüfung und Korrektur fest eingeplant sind.',
  },
  {
    situation: 'Eine Lehrkraft bewertet Texte ausschließlich mit KI, ohne die Ergebnisse zu prüfen.',
    recommendation: 'problematisch',
    reason: 'Bewertung braucht Verantwortung, Kontext und menschliche Kontrolle.',
  },
  {
    situation: 'Schülerinnen und Schüler lassen sich Feedback zu ihrer Argumentation geben und überarbeiten danach ihren eigenen Text.',
    recommendation: 'sinnvoll',
    reason: 'KI unterstützt den Prozess, die Überarbeitung bleibt bei den Lernenden.',
  },
  {
    situation: 'Eine Klasse erstellt mit einem Bildgenerator Symbolbilder für ein Lernplakat und bespricht Grenzen und Urheberrecht.',
    recommendation: 'gestaltung',
    reason: 'Der Einsatz kann lernwirksam sein, wenn Rechte, Quellen und Aussagekraft reflektiert werden.',
  },
  {
    situation: 'Eine Schülerin übernimmt eine KI-Zusammenfassung, ohne den Originaltext zu lesen.',
    recommendation: 'problematisch',
    reason: 'Das ist KI Bequemlichkeit: Die eigentliche Lese- und Denkzeit verschwindet.',
  },
  {
    situation: 'Eine Lerngruppe vergleicht eine KI-Zusammenfassung mit dem Originaltext und markiert Fehler, Auslassungen und gute Formulierungen.',
    recommendation: 'sinnvoll',
    reason: 'Die KI liefert Material; die Anschlussaufgabe erzeugt Prüfen, Vergleichen und Begründen.',
  },
  {
    situation: 'Eine Lehrkraft lässt KI-Feedback automatisch an die Klasse ausgeben, ohne es fachlich oder lerngruppenbezogen anzupassen.',
    recommendation: 'problematisch',
    reason: 'Die Lehrkraft bleibt zentral: Sie gestaltet und prüft den Lernprozess.',
  },
];

const quickCheckCases = [
  {
    statement: 'Eine Schülerin lässt sich von der KI eine fertige Interpretation zu Kafka schreiben und übernimmt sie unverändert.',
    answer: 'B',
    discussion: 'Die eigene Auseinandersetzung mit dem Text wird übersprungen. Leisen zeigt genau diese Gefahr am Beispiel "Die Verwandlung".',
  },
  {
    statement: 'Ein Schüler lässt sich von der KI eine Vokabelliste zum Wasserkreislauf erstellen und sucht die Begriffe danach im eigenen Text.',
    answer: 'A',
    discussion: 'Die KI liefert Material, aber die aktive Arbeit bleibt bei den Lernenden.',
  },
  {
    statement: 'Eine Lerngruppe nutzt KI, um einen Fachtext auf drei Niveaustufen erklären zu lassen und vergleicht anschließend die Unterschiede.',
    answer: 'A',
    discussion: 'Die KI wird als sprachliches und fachliches Experimentiergerät genutzt.',
  },
  {
    statement: 'Eine Lehrkraft lässt Schülerinnen und Schüler eine KI-Antwort prüfen und mit Textbelegen widerlegen oder verbessern.',
    answer: 'A',
    discussion: 'Lernwirksam wird es, wenn Lernende KI-Ergebnisse prüfen, vergleichen und kritisch weiterverarbeiten.',
  },
  {
    statement: 'Eine Schülerin fragt die KI: "Erledige meine Hausaufgabe komplett."',
    answer: 'B',
    discussion: 'Die KI ersetzt hier die Denkzeit.',
  },
  {
    statement: 'Eine Klasse nutzt KI, um eigene Denkfehler in fachlichen Aussagen zu finden.',
    answer: 'A',
    discussion: 'Leisen nutzt solche Beispiele, etwa zu Evolution, Wärme und Temperatur oder Kräften beim Zusammenstoß.',
  },
  {
    statement: 'Eine Lehrkraft lässt die KI ein Arbeitsblatt erstellen, prüft es aber nicht weiter.',
    answer: 'C',
    discussion: 'KI kann entlasten, aber die fachliche und didaktische Prüfung bleibt notwendig.',
  },
  {
    statement: 'Schülerinnen und Schüler lassen sich von der KI ein Quiz erstellen, lösen es selbst und lassen danach ihre Antworten bewerten.',
    answer: 'A',
    discussion: 'Das kann Lernzeit erzeugen, wenn sie selbst antworten und die Rückmeldung prüfen.',
  },
  {
    statement: 'Eine KI formuliert sehr überzeugend eine falsche Antwort.',
    answer: 'B',
    discussion: 'Sprachmodelle können auch bei Fehlern plausibel formulieren. Das ist Stärke und Risiko zugleich.',
  },
  {
    statement: 'Eine Lehrkraft fragt nach jeder KI-Nutzung: "Was hast du selbst verstanden, geprüft oder verändert?"',
    answer: 'A',
    discussion: 'Das lenkt den Blick vom Produkt auf den Lernprozess.',
  },
];

const aufgabenAmpelCases = [
  {
    task: 'Schülerinnen und Schüler vergleichen eine Suchmaschine mit einem KI-Sprachmodell. Was passiert jeweils mit Informationen?',
    answer: 'A',
    accepted: ['A'],
    topic: 'KI verstehen',
    discussion: 'KI selbst wird zum Lerngegenstand: Funktionsweise, Chancen und Grenzen werden sichtbar.',
  },
  {
    task: 'Schülerinnen und Schüler nutzen KI, um eine Vokabelliste zu einem Fachtext zu erstellen. Danach markieren sie die Begriffe im Originaltext.',
    answer: 'B',
    accepted: ['B'],
    topic: 'KI als Lernressource',
    discussion: 'KI ist Lernressource, aber die Anschlussaufgabe zwingt zur Arbeit am Fachtext.',
  },
  {
    task: 'Schülerinnen und Schüler prüfen, ob eine KI-Interpretation durch Belege aus dem Originaltext gestützt wird.',
    answer: 'C',
    accepted: ['C'],
    topic: 'KI-Ergebnisse prüfen',
    discussion: 'Das KI-Ergebnis wird geprüft, hinterfragt und mit fachlichen Kriterien verglichen.',
  },
  {
    task: 'Schülerinnen und Schüler schreiben zuerst ohne KI eine eigene Argumentation. Erst danach nutzen sie KI-Feedback.',
    answer: 'D, danach C',
    accepted: ['D', 'C'],
    topic: 'Eigene Kompetenz sichtbar machen und anschließend reflektieren',
    discussion: 'Die erste Eigenleistung wird sichtbar; danach kann KI reflektiert zur Überarbeitung dienen.',
  },
  {
    task: 'Schülerinnen und Schüler sollen erklären, warum KI-Antworten überzeugend klingen können, obwohl sie falsch sind.',
    answer: 'A',
    accepted: ['A'],
    topic: 'Funktionsweise und Grenzen von KI',
    discussion: 'Hier wird KI selbst verstanden und kritisch eingeordnet.',
  },
  {
    task: 'Schülerinnen und Schüler lassen sich von KI drei Prüfungsfragen erstellen und beantworten diese selbst.',
    answer: 'B',
    accepted: ['B'],
    topic: 'KI zum Üben nutzen',
    discussion: 'KI wird gezielt als Lernressource eingesetzt.',
  },
  {
    task: 'Schülerinnen und Schüler vergleichen ihre eigene Lösung mit einer KI-Lösung und markieren Unterschiede.',
    answer: 'C',
    accepted: ['C'],
    topic: 'Reflexion und Qualitätsprüfung',
    discussion: 'Die Qualität der KI-Lösung wird anhand der eigenen Arbeit geprüft.',
  },
  {
    task: 'Schülerinnen und Schüler dürfen bei einer mündlichen Kurzdiagnose keine KI nutzen.',
    answer: 'D',
    accepted: ['D'],
    topic: 'Eigenes Können sichtbar machen',
    discussion: 'KI wird bewusst begrenzt, damit Kompetenzen diagnostizierbar bleiben.',
  },
  {
    task: 'Schülerinnen und Schüler nutzen KI als Lernpartner, der nur Fragen und Tipps gibt, aber nicht sofort die Lösung nennt.',
    answer: 'B',
    accepted: ['B'],
    topic: 'KI als Tutor',
    discussion: 'KI wird als Lernressource eingesetzt, ohne die Denkzeit sofort zu ersetzen.',
  },
  {
    task: 'Schülerinnen und Schüler diskutieren, wann KI-Nutzung im Unterricht fair, sinnvoll oder problematisch ist.',
    answer: 'A oder C',
    accepted: ['A', 'C'],
    topic: 'Regeln, Verantwortung und Reflexion',
    discussion: 'Die Aufgabe kann KI thematisieren und zugleich die eigene Nutzung reflektieren.',
  },
  {
    task: 'Schülerinnen und Schüler lassen sich eine Bewerbungsgesprächssituation simulieren und üben Antworten.',
    answer: 'B',
    accepted: ['B'],
    topic: 'Rollenspiel und Übung',
    discussion: 'KI wird als Lernressource für Training und Feedback genutzt.',
  },
  {
    task: 'Schülerinnen und Schüler geben einen fehlerhaften Text in die KI und lassen Fehler nach Inhalt, Rechtschreibung und Grammatik sortieren. Danach überarbeiten sie den Text selbst.',
    answer: 'B und C',
    accepted: ['B', 'C'],
    topic: 'Unterstützung und Reflexion',
    discussion: 'KI unterstützt die Analyse; lernwirksam wird es durch Prüfung und eigene Überarbeitung.',
  },
  {
    task: 'Schülerinnen und Schüler bekommen eine KI-Zusammenfassung und prüfen sie Satz für Satz am Originaltext.',
    answer: 'C',
    accepted: ['C'],
    topic: 'Plausibilitätsfalle und Anschlussaufgabe',
    discussion: 'Die Aufgabe macht KI-Ergebnisse zum Gegenstand fachlicher Prüfung.',
  },
  {
    task: 'Schülerinnen und Schüler lassen KI drei Erklärungen auf verschiedenen Niveaustufen erzeugen und begründen, welche für wen geeignet ist.',
    answer: 'B und C',
    accepted: ['B', 'C'],
    topic: 'KI als Experimentiergerät',
    discussion: 'KI wird integriert; lernwirksam wird es durch Vergleich und Begründung.',
  },
  {
    task: 'Schülerinnen und Schüler notieren zuerst ihr Vorwissen, bevor sie eine KI-Erklärung prüfen und ergänzen.',
    answer: 'D, danach C',
    accepted: ['D', 'C'],
    topic: 'Vorwissen sichtbar machen',
    discussion: 'Die Begrenzung schützt eigene Denkzeit; danach wird KI reflektiert genutzt.',
  },
];

const leisenActions = ['Prüfen', 'Vergleichen', 'Begründen', 'Korrigieren', 'Weiterentwickeln'] as const;

const denkzeitCards = [
  {
    scenario: 'KI liefert eine fertige Zusammenfassung zu einem Sachtext.',
    product: 'Schönes Produkt, aber noch keine sichere Lernleistung.',
    action: 'Prüfen',
    feedback: 'Mit dem Originaltext abgleichen: Was stimmt, was fehlt, was ist zu ungenau?',
    concepts: ['Anschlussaufgabe', 'Vorwissen', 'Plausibilitätsfalle'],
    risk: 'Nur kopieren würde Lernzeit abkürzen.',
  },
  {
    scenario: 'KI erstellt eine Interpretation zu Kafka, die sehr überzeugend klingt.',
    product: 'Plausible Deutung ohne eigene Textarbeit.',
    action: 'Begründen',
    feedback: 'Die Deutung muss mit Textbelegen begründet oder widerlegt werden.',
    concepts: ['KI Bequemlichkeit', 'Denkzeit', 'Plausibilitätsfalle'],
    risk: 'Die eigene Auseinandersetzung mit dem Text kann verschwinden.',
  },
  {
    scenario: 'KI erzeugt drei Erklärungen eines Fachbegriffs auf unterschiedlichen Niveaus.',
    product: 'Sprachliches und fachliches Experimentiermaterial.',
    action: 'Vergleichen',
    feedback: 'Unterschiede markieren: Welche Begriffe, Beispiele und Vereinfachungen verändern das Verstehen?',
    concepts: ['Experimentiergerät', 'kognitive Aktivierung', 'Vorwissen'],
    risk: 'Ohne Vergleich bleibt es nur ein netter Textwechsel.',
  },
  {
    scenario: 'KI findet in einer Schülerlösung mögliche Denkfehler.',
    product: 'Feedback mit fachlicher Unsicherheit.',
    action: 'Korrigieren',
    feedback: 'Die Lernenden korrigieren die eigene Lösung und erklären, welcher Denkfehler vorlag.',
    concepts: ['Denkfehler', 'Üben und Festigen', 'Anstrengung'],
    risk: 'Feedback einfach zu übernehmen ersetzt kein Verstehen.',
  },
  {
    scenario: 'KI gibt Feedback zu einem selbst geschriebenen Argumentationstext.',
    product: 'Rückmeldung zu Struktur, Sprache und Inhalt.',
    action: 'Weiterentwickeln',
    feedback: 'Den eigenen Text überarbeiten und begründen, welche Hinweise übernommen oder verworfen wurden.',
    concepts: ['Lernpartner', 'Weiterentwickeln', 'motivationale Aktivierung'],
    risk: 'Nur glätten lassen erzeugt ein besseres Produkt, aber wenig Lernprozess.',
  },
  {
    scenario: 'KI erstellt Quizfragen zu einem Thema.',
    product: 'Übungsmaterial in kurzer Zeit.',
    action: 'Prüfen',
    feedback: 'Fragen selbst lösen, Lösungen prüfen und Fehler analysieren.',
    concepts: ['Üben und Festigen', 'Lernzeit', 'Anschlussaufgabe'],
    risk: 'Quizfragen anschauen ist noch kein Üben.',
  },
];

const escapeStations = [
  {
    place: 'Start: Rheinpromenade Vallendar',
    qr: 'KI-START',
    task: 'Ordnet drei KI-Beispiele und markiert: Wo entsteht echte Lernzeit, wo nur ein fertiges Produkt?',
    solution: 'Lernzeit entsteht dort, wo geprüft, verglichen, angewendet oder begründet wird.',
  },
  {
    place: 'Weg zum Kloster Schönstatt',
    qr: 'DATENSPUR',
    task: 'Findet eine plausible, aber unsichere Aussage. Wie würdet ihr sie fachlich prüfen?',
    solution: 'Plausibel heißt nicht richtig: Quelle, Beleg, Originalmaterial oder Fachwissen gegenprüfen.',
  },
  {
    place: 'Pilgerkirche / Innenhof',
    qr: 'BLACKBOX',
    task: 'Ihr bekommt ein KI-Ergebnis. Entwickelt eine Anschlussaufgabe, die Denkzeit erzwingt.',
    solution: 'Zum Beispiel: mit Original vergleichen, Fehler suchen, eigene Verbesserung begründen.',
  },
  {
    place: 'Aussichtspunkt',
    qr: 'PROMPTLABOR',
    task: 'Nutzt KI als Experimentiergerät: Erstellt zwei Erklärungen für verschiedene Zielgruppen und vergleicht sie.',
    solution: 'Unterschiede in Sprache, Fachlichkeit, Beispielen und Verständlichkeit markieren.',
  },
  {
    place: 'Ziel: Schulhof / Klassenraum',
    qr: 'KI-KODE',
    task: 'Löst die Abschlussfrage: Was machen Lernende nach der KI-Antwort?',
    solution: 'Nicht übernehmen, sondern bearbeiten: prüfen, vergleichen, korrigieren, begründen, weiterentwickeln.',
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
  const [nimLog, setNimLog] = useState<string[]>(['Start mit 15 Hölzern. Wer das letzte Holz nimmt, gewinnt.']);

  const [hexBoard, setHexBoard] = useState<HexBoard>(initialHexBoard);
  const [hexSelected, setHexSelected] = useState<[number, number] | null>(null);
  const [hexMessage, setHexMessage] = useState('Weiß beginnt. Ziehe einen weißen Bauern.');
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
  const [memorySolvedByTeam, setMemorySolvedByTeam] = useState<Record<string, 'Team A' | 'Team B'>>({});
  const [memoryTeam, setMemoryTeam] = useState<'Team A' | 'Team B'>('Team A');
  const [memoryScore, setMemoryScore] = useState({ 'Team A': 0, 'Team B': 0 });
  const [memoryGameStarted, setMemoryGameStarted] = useState(false);

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
  const memoryColumnCount = memoryDeck.length <= 12 ? 4 : memoryDeck.length <= 24 ? 6 : 8;
  const memoryRowCount = Math.max(1, Math.ceil(memoryDeck.length / memoryColumnCount));
  const memoryGameComplete = memoryDeck.length > 0 && memorySolved.length >= memoryDeck.length / 2;
  const memoryWinner =
    memoryGameComplete && memoryScore['Team A'] !== memoryScore['Team B']
      ? memoryScore['Team A'] > memoryScore['Team B']
        ? 'Team A'
        : 'Team B'
      : null;

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
    setNimLog(['Neue Runde. Die KI behält ihre gelernten Verbote.']);
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
        `Lerneffekt: Zug "${lastAiMove.take} nehmen" bei ${lastAiMove.sticks} Hölzern wird künftig gemieden.`,
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
    setHexMessage('Weiß beginnt. Ziehe einen weißen Bauern.');
  };

  const checkHexWinner = (board: HexBoard) => {
    if (board[0].includes('W')) return 'Weiß erreicht die Grundlinie und gewinnt.';
    if (board[2].includes('B')) return 'Schwarz erreicht die Grundlinie und gewinnt.';
    if (!board.flat().includes('W')) return 'Schwarz gewinnt: keine weißen Bauern mehr.';
    if (!board.flat().includes('B')) return 'Weiß gewinnt: keine schwarzen Bauern mehr.';
    if (getHexMoves(board, 'W').length === 0) return 'Schwarz gewinnt: Weiß kann nicht ziehen.';
    if (getHexMoves(board, 'B').length === 0) return 'Weiß gewinnt: Schwarz kann nicht ziehen.';
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
      setHexMessage('Wähle ein Zielfeld: gerade vorwärts oder diagonal zum Schlagen.');
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
    setHexMessage(checkHexWinner(afterAi) || 'Schwarz hat gezogen. Weiß ist wieder dran.');
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
        setMemorySolvedByTeam((prev) => ({ ...prev, [a.pairId]: memoryTeam }));
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
    setMemorySolvedByTeam({});
    setMemoryTeam('Team A');
    setMemoryScore({ 'Team A': 0, 'Team B': 0 });
    setMemoryGameStarted(true);
  };

  const updateMemoryColumn = (side: 'leftText' | 'rightText', value: string) => {
    if (side === 'leftText') setMemoryLeftText(value);
    else setMemoryRightText(value);
    setMemorySets((prev) => prev.map((set) => (set.id === selectedMemorySetId ? { ...set, [side]: value } : set)));
    setMemoryGameStarted(false);
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
    setMemorySolvedByTeam({});
    setMemoryTeam('Team A');
    setMemoryScore({ 'Team A': 0, 'Team B': 0 });
    setMemoryGameStarted(false);
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
    setMemorySolvedByTeam({});
    setMemoryTeam('Team A');
    setMemoryScore({ 'Team A': 0, 'Team B': 0 });
    setMemoryGameStarted(false);
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
      A: 'KI unterstützt Lernen',
      B: 'KI verführt zur Abkürzung',
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
      `${isAccepted ? 'Passend' : 'Diskussionswürdig'}: Antwort ${current.answer}. ${current.topic}. ${current.discussion}`
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

  const memoryFullscreen = tab === 'memory' && memoryGameStarted;

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
      <Box sx={{ maxWidth: memoryFullscreen ? 'none' : 1180, mx: 'auto', px: memoryFullscreen ? 0 : { xs: 1, sm: 1.5 }, py: memoryFullscreen ? 0 : 1.25, pb: memoryFullscreen ? 0 : 2.5 }}>
        {!memoryFullscreen && (
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
          <Tab value="overview" label="Übersicht" />
          {gameCards.map((game) => (
            <Tab key={game.tab} value={game.tab} label={game.title} />
          ))}
        </Tabs>
        )}

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
                    Spiel öffnen
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {tab === 'nim' && (
          <Paper elevation={0} sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2 }}>
            <SectionTitle title="Spiel 1: Das Nimm-Spiel" subtitle="Nimm 1 bis 3 Hölzer. Wer das letzte nimmt, gewinnt." />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, my: 2 }}>
              {Array.from({ length: Math.max(0, nimSticks) }).map((_, index) => (
                <Box
                  key={index}
                  sx={{ width: 10, height: 54, borderRadius: 10, bgcolor: '#8d5524', boxShadow: 'inset 0 4px #c68642' }}
                />
              ))}
            </Box>
            <Typography sx={{ fontWeight: 800, mb: 1 }}>
              {nimWinner ? `Gewinner: ${nimWinner}` : nimTurn === 'ai' ? 'KI denkt...' : `${nimSticks} Hölzer übrig`}
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
              KI-Gedächtnis
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              Erlaubte KI-Züge bei aktueller Holzanzahl: {nimAvailableMoves.join(', ') || 'keine'}
            </Typography>
            <Typography variant="body2" sx={{ p: 1, borderRadius: 1.5, bgcolor: '#fff8e1', color: '#5d4037', fontWeight: 700, mb: 1 }}>
              Leisen-Brücke: Die KI lernt nicht durch das Ergebnis allein, sondern durch Rückmeldung. Übertragen auf Unterricht:
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
              subtitle="Du spielst Weiß. Schwarz bevorzugt Schlagzüge und demonstriert die Idee eines lernenden Gegners."
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
                  Gegner blockieren. Im Unterricht können verlorene Schwarz-Züge wie beim Original-Hexapawn aus einer
                  Zugliste gestrichen werden.
                </Typography>
                <Chip label={`Demonstrierte KI-Auswahl: ${hexAvoidedMoves} einfache Züge nachrangig behandelt`} sx={{ mb: 2 }} />
                <Typography variant="body2" sx={{ p: 1, borderRadius: 1.5, bgcolor: '#ede7f6', color: '#311b92', fontWeight: 700, mb: 1 }}>
                  Leisen-Brücke: Gute Züge entstehen durch Ausprobieren, Prüfen und Korrigieren. Genau so werden
                  KI-Ergebnisse erst durch Anschlussaufgaben lernwirksam.
                </Typography>
                <br />
                <Button startIcon={<RestartAltIcon />} onClick={resetHex} variant="outlined">
                  Brett zurücksetzen
                </Button>
              </Box>
            </Box>
          </Paper>
        )}

        {tab === 'memory' && (
          <Paper
            elevation={0}
            sx={{
              p: memoryGameStarted ? { xs: 0.5, sm: 0.75 } : { xs: 1, sm: 1.5 },
              borderRadius: memoryGameStarted ? 0 : 2,
              minHeight: memoryGameStarted ? '100vh' : undefined,
              bgcolor: memoryGameStarted ? '#eef3f8' : undefined,
              position: 'relative',
            }}
          >
            {!memoryGameStarted && (
            <>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
              <IconButton
                size="small"
                onClick={() => setTab('overview')}
                aria-label="Zurück zur KI-Spiele-Startseite"
                sx={{
                  width: 32,
                  height: 32,
                  ml: { xs: -0.75, sm: -1.25 },
                  bgcolor: 'white',
                  border: '1px solid rgba(0,0,0,0.12)',
                  '&:hover': { bgcolor: '#eef3f8' },
                }}
              >
                <ArrowBackIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <FormControl size="small" sx={{ width: { xs: 'calc(100% - 40px)', sm: 230 } }}>
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
              {!memoryGameStarted && (
                <>
                  <TextField
                    label="Neuer Kartensatz"
                    value={newMemorySetName}
                    onChange={(event) => setNewMemorySetName(event.target.value)}
                    size="small"
                    sx={{ width: { xs: 'calc(100% - 42px)', sm: 190 } }}
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
                </>
              )}
              <Button
                size="large"
                variant="contained"
                color="success"
                onClick={resetMemory}
                sx={{ minWidth: 150, height: 40, fontWeight: 900 }}
              >
                Spielen
              </Button>
              <Button
                component="a"
                href="/print/memory-huehner-karten.png"
                download="johnny-huehner-memory-karten.png"
                size="small"
                variant="outlined"
                startIcon={<FileDownloadIcon sx={{ fontSize: 17 }} />}
                sx={{ height: 34, fontWeight: 900 }}
              >
                Hühner-Karten
              </Button>
              <Button
                component="a"
                href="/print/memory-huehner-karten-weiss.png"
                download="johnny-huehner-memory-karten-weiss.png"
                size="small"
                variant="outlined"
                startIcon={<FileDownloadIcon sx={{ fontSize: 17 }} />}
                sx={{ height: 34, fontWeight: 900 }}
              >
                Hühner weiß
              </Button>
              <Button
                component="a"
                href="/print/memory-tiger-karten.png"
                download="tigerkatzen-memory-karten.png"
                size="small"
                variant="outlined"
                startIcon={<FileDownloadIcon sx={{ fontSize: 17 }} />}
                sx={{ height: 34, fontWeight: 900 }}
              >
                Tiger-Karten
              </Button>
              <Button
                component="a"
                href="/print/memory-tiger-karten-weiss.png"
                download="tigerkatzen-memory-karten-weiss.png"
                size="small"
                variant="outlined"
                startIcon={<FileDownloadIcon sx={{ fontSize: 17 }} />}
                sx={{ height: 34, fontWeight: 900 }}
              >
                Tiger weiß
              </Button>
              {memoryGameStarted && (
                <Button size="small" variant="outlined" onClick={() => setMemoryGameStarted(false)}>
                  Bearbeiten
                </Button>
              )}
            </Stack>
            <Box sx={{ display: 'grid', gap: 1, mb: 1.25 }}>
              <Box sx={{ display: 'grid', gap: 1 }}>
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
                  <Button size="small" onClick={addMemoryTableRow} variant="outlined">
                    Zeile hinzufügen
                  </Button>
                  <Chip label={`${parseMemoryPairsFromColumns(memoryLeftText, memoryRightText).length} Paare`} />
                </Stack>
              </Box>
            </Box>
            </>
            )}

            {memoryGameStarted && (
            <>
              <IconButton
                size="small"
                onClick={() => setMemoryGameStarted(false)}
                aria-label="Zurück zur Memory-Vorbereitung"
                sx={{
                  width: 28,
                  height: 28,
                  position: 'fixed',
                  top: 24,
                  left: '3vw',
                  p: 0,
                  zIndex: 1300,
                  bgcolor: 'white',
                  border: '1px solid rgba(0,0,0,0.12)',
                  boxShadow: '0 4px 12px rgba(15,23,42,0.16)',
                  '&:hover': { bgcolor: '#eef3f8' },
                }}
              >
                <ArrowBackIcon sx={{ fontSize: 16 }} />
              </IconButton>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '150px minmax(0, 1fr) 150px', lg: '180px minmax(0, 1fr) 180px' },
                alignItems: 'start',
                gap: { xs: 0.75, md: 1.25 },
              }}
            >
              {(['Team A'] as const).map((team) => {
                const active = team === memoryTeam;
                const winner = memoryWinner === team;
                const highlighted = winner || (active && !memoryGameComplete);
                return (
                  <Button
                    key={team}
                    onClick={() => setMemoryTeam(team)}
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'row', md: 'column' },
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: { xs: 1, md: 1.25 },
                      minHeight: { xs: 58, md: 'calc(100vh - 16px)' },
                      px: 1,
                      py: { xs: 0.75, md: 2 },
                      borderRadius: 3,
                      textTransform: 'none',
                      position: 'relative',
                      overflow: 'hidden',
                      color: highlighted ? 'white' : '#64748b',
                      bgcolor: highlighted ? memoryTeamColors[team] : '#e5e7eb',
                      border: winner ? '8px solid #facc15' : `5px solid ${highlighted ? memoryTeamColors[team] : '#cbd5e1'}`,
                      boxShadow: winner
                        ? `0 0 0 10px rgba(250, 204, 21, 0.35), 0 0 44px ${memoryTeamColors[team]}cc`
                        : highlighted
                          ? `0 12px 28px ${memoryTeamColors[team]}66`
                          : 'none',
                      opacity: highlighted ? 1 : 0.55,
                      filter: highlighted ? 'none' : 'grayscale(1)',
                      '&:hover': {
                        bgcolor: highlighted ? memoryTeamColors[team] : '#e5e7eb',
                      },
                    }}
                  >
                    {winner && (
                      <>
                        <Typography
                          aria-hidden
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: { xs: '2.4rem', md: '5.8rem' },
                            letterSpacing: { xs: 2, md: 4 },
                            opacity: 0.34,
                            pointerEvents: 'none',
                          }}
                        >
                          ✨ ✨ ✨
                        </Typography>
                        <Box
                          sx={{
                            position: 'absolute',
                            top: { xs: 4, md: 18 },
                            left: '50%',
                            transform: 'translateX(-50%)',
                            px: { xs: 1.25, md: 1.6 },
                            py: 0.6,
                            borderRadius: 99,
                            bgcolor: '#facc15',
                            color: '#111827',
                            border: '3px solid white',
                            boxShadow: '0 8px 22px rgba(0,0,0,0.22)',
                            fontWeight: 1000,
                            fontSize: { xs: '0.82rem', md: '1rem' },
                            lineHeight: 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ⭐ SIEGER ⭐
                        </Box>
                      </>
                    )}
                    <Typography sx={{ fontSize: { xs: '2.1rem', md: '4.2rem' }, lineHeight: 1 }}>
                      {memoryTeamAnimals[team]}
                    </Typography>
                    <Box>
                      <Typography sx={{ fontSize: { xs: '1rem', md: '1.35rem' }, fontWeight: 1000, lineHeight: 1.05 }}>
                        {memoryTeamNames[team]}
                      </Typography>
                      <Typography sx={{ fontSize: { xs: '1.15rem', md: '2.15rem' }, fontWeight: 1000, lineHeight: 1.05, mt: { md: 1 } }}>
                        {memoryScore[team]}
                      </Typography>
                      <Typography sx={{ fontSize: { xs: '0.8rem', md: '1rem' }, fontWeight: 900, lineHeight: 1 }}>
                        Paare
                      </Typography>
                      {active && !memoryGameComplete && (
                        <Typography sx={{ fontSize: { xs: '0.72rem', md: '0.95rem' }, fontWeight: 1000, lineHeight: 1.1, mt: { xs: 0, md: 1.5 } }}>
                          AM ZUG
                        </Typography>
                      )}
                      {winner && (
                        <Typography sx={{ fontSize: { xs: '1rem', md: '1.35rem' }, fontWeight: 1000, lineHeight: 1.1, mt: { xs: 0, md: 1.5 } }}>
                          GEWONNEN ✨
                        </Typography>
                      )}
                    </Box>
                  </Button>
                );
              })}
            <Box
              sx={{
                display: 'grid',
                '--memory-columns': memoryColumnCount,
                '--memory-rows': memoryRowCount,
                '--memory-gap': '10px',
                '--memory-side-space': { xs: '24px', md: '360px', lg: '420px' },
                '--memory-top-space': { xs: '148px', md: '18px' },
                '--memory-card-size': `min(
                  150px,
                  calc((100vw - var(--memory-side-space) - (var(--memory-columns) - 1) * var(--memory-gap)) / var(--memory-columns)),
                  calc((100vh - var(--memory-top-space) - (var(--memory-rows) - 1) * var(--memory-gap)) / var(--memory-rows))
                )`,
                gridTemplateColumns: 'repeat(var(--memory-columns), var(--memory-card-size))',
                gap: 'var(--memory-gap)',
                width: '100%',
                justifyContent: 'center',
                alignContent: 'start',
              }}
            >
              {memoryDeck.map((card) => {
                const visible = memoryOpen.includes(card.id) || memorySolved.includes(card.pairId);
                const solved = memorySolved.includes(card.pairId);
                const solvedTeam = memorySolvedByTeam[card.pairId];
                const solvedTeamColor = solvedTeam ? memoryTeamColors[solvedTeam] : card.color;
                const [leadingToken] = card.label.split(' ');
                const hasLeadingIcon = card.kind === 'term' && leadingToken.length <= 4 && leadingToken !== card.label;
                const cardText = hasLeadingIcon ? card.label.slice(leadingToken.length).trim() : card.label;
                return (
                  <Button
                    key={card.id}
                    onClick={() => flipMemoryCard(card)}
                    sx={{
                      width: 'var(--memory-card-size)',
                      height: 'var(--memory-card-size)',
                      minHeight: 0,
                      p: { xs: 1, sm: 1.15 },
                      borderRadius: 2.5,
                      border: solved
                        ? `5px solid ${solvedTeamColor}`
                        : visible
                          ? '3px solid #9ca3af'
                          : '3px solid #9ca3af',
                      background: solved
                        ? '#d9f7d9'
                        : visible
                        ? '#ffffff'
                        : '#ffffff',
                      color: '#1f2937',
                      textTransform: 'none',
                      fontWeight: 900,
                      lineHeight: 1.25,
                      overflow: 'hidden',
                      boxShadow: visible
                        ? `0 4px 14px ${solved ? solvedTeamColor : '#9ca3af'}33`
                        : '0 8px 18px rgba(148,163,184,0.32)',
                      opacity: 1,
                      transform: visible ? 'rotateY(0deg)' : 'rotateY(0deg) scale(1)',
                      transition: 'all 0.18s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: visible
                          ? `0 10px 22px ${solved ? solvedTeamColor : '#9ca3af'}44`
                          : '0 10px 22px rgba(148,163,184,0.42)',
                      },
                    }}
                  >
                    {visible ? (
                      <Box
                        sx={{
                          display: 'grid',
                          placeItems: 'center',
                          gap: hasLeadingIcon ? 0.5 : 0,
                          fontSize: { xs: '0.76rem', sm: '0.84rem' },
                          lineHeight: 1.15,
                          overflow: 'hidden',
                          textAlign: 'center',
                        }}
                      >
                        {hasLeadingIcon && (
                          <Box component="span" sx={{ display: 'block', fontSize: { xs: '1.65rem', sm: '1.95rem' }, lineHeight: 1 }}>
                            {leadingToken}
                          </Box>
                        )}
                        <Box component="span" sx={{ display: 'block' }}>
                          {cardText}
                        </Box>
                      </Box>
                    ) : (
                      <Box
                        component="img"
                        src="/johnny-logo.png"
                        alt="Johnny Logo"
                        sx={{
                          width: '72%',
                          height: '72%',
                          objectFit: 'contain',
                          opacity: 0.18,
                        }}
                      />
                    )}
                  </Button>
                );
              })}
            </Box>
              {(['Team B'] as const).map((team) => {
                const active = team === memoryTeam;
                const winner = memoryWinner === team;
                const highlighted = winner || (active && !memoryGameComplete);
                return (
                  <Button
                    key={team}
                    onClick={() => setMemoryTeam(team)}
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'row', md: 'column' },
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: { xs: 1, md: 1.25 },
                      minHeight: { xs: 58, md: 'calc(100vh - 16px)' },
                      px: 1,
                      py: { xs: 0.75, md: 2 },
                      borderRadius: 3,
                      textTransform: 'none',
                      position: 'relative',
                      overflow: 'hidden',
                      color: highlighted ? 'white' : '#64748b',
                      bgcolor: highlighted ? memoryTeamColors[team] : '#e5e7eb',
                      border: winner ? '8px solid #facc15' : `5px solid ${highlighted ? memoryTeamColors[team] : '#cbd5e1'}`,
                      boxShadow: winner
                        ? `0 0 0 10px rgba(250, 204, 21, 0.35), 0 0 44px ${memoryTeamColors[team]}cc`
                        : highlighted
                          ? `0 12px 28px ${memoryTeamColors[team]}66`
                          : 'none',
                      opacity: highlighted ? 1 : 0.55,
                      filter: highlighted ? 'none' : 'grayscale(1)',
                      '&:hover': {
                        bgcolor: highlighted ? memoryTeamColors[team] : '#e5e7eb',
                      },
                    }}
                  >
                    {winner && (
                      <>
                        <Typography
                          aria-hidden
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: { xs: '2.4rem', md: '5.8rem' },
                            letterSpacing: { xs: 2, md: 4 },
                            opacity: 0.34,
                            pointerEvents: 'none',
                          }}
                        >
                          ✨ ✨ ✨
                        </Typography>
                        <Box
                          sx={{
                            position: 'absolute',
                            top: { xs: 4, md: 18 },
                            left: '50%',
                            transform: 'translateX(-50%)',
                            px: { xs: 1.25, md: 1.6 },
                            py: 0.6,
                            borderRadius: 99,
                            bgcolor: '#facc15',
                            color: '#111827',
                            border: '3px solid white',
                            boxShadow: '0 8px 22px rgba(0,0,0,0.22)',
                            fontWeight: 1000,
                            fontSize: { xs: '0.82rem', md: '1rem' },
                            lineHeight: 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ⭐ SIEGER ⭐
                        </Box>
                      </>
                    )}
                    <Typography sx={{ fontSize: { xs: '2.1rem', md: '4.2rem' }, lineHeight: 1 }}>
                      {memoryTeamAnimals[team]}
                    </Typography>
                    <Box>
                      <Typography sx={{ fontSize: { xs: '1rem', md: '1.35rem' }, fontWeight: 1000, lineHeight: 1.05 }}>
                        {memoryTeamNames[team]}
                      </Typography>
                      <Typography sx={{ fontSize: { xs: '1.15rem', md: '2.15rem' }, fontWeight: 1000, lineHeight: 1.05, mt: { md: 1 } }}>
                        {memoryScore[team]}
                      </Typography>
                      <Typography sx={{ fontSize: { xs: '0.8rem', md: '1rem' }, fontWeight: 900, lineHeight: 1 }}>
                        Paare
                      </Typography>
                      {active && !memoryGameComplete && (
                        <Typography sx={{ fontSize: { xs: '0.72rem', md: '0.95rem' }, fontWeight: 1000, lineHeight: 1.1, mt: { xs: 0, md: 1.5 } }}>
                          AM ZUG
                        </Typography>
                      )}
                      {winner && (
                        <Typography sx={{ fontSize: { xs: '1rem', md: '1.35rem' }, fontWeight: 1000, lineHeight: 1.1, mt: { xs: 0, md: 1.5 } }}>
                          GEWONNEN ✨
                        </Typography>
                      )}
                    </Box>
                  </Button>
                );
              })}
            </Box>
            </>
            )}
          </Paper>
        )}

        {tab === 'escape' && (
          <Paper elevation={0} sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2 }}>
            <SectionTitle
              title="Spiel 4: Umgebungs-Escape-Game"
              subtitle="GPS-/QR-Spiel für Vallendar und das Kloster Schönstatt mit KI-Bezug."
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
                      Lösungshinweis: {station.solution}
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
                Nächste Aussage
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
                      Nächster Impuls
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
              subtitle="Nach der Materialphase: Unterrichtssituationen einordnen und die Entscheidung kurz begründen."
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
                Nächste Situation
              </Button>
              <Chip label="Positionieren: links / Mitte / rechts oder mit Karten anzeigen" />
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
              Bogen für die Fortbildung: Vortrag und Toolphase, KI Bingo zur Wiederholung, Arbeit mit konkretem
              Material, danach "KI oder nicht KI?" zur Anwendung und gemeinsame Auswertung.
            </Typography>
          </Paper>
        )}

        {tab === 'quickcheck' && (
          <Paper elevation={0} sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2 }}>
            <SectionTitle
              title="Spiel 8: KI Quick Check"
              subtitle="Nach dem Vortrag: Wird KI zur Lernchance oder zur Abkürzung am Denkprozess vorbei?"
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
                    A: KI unterstützt Lernen
                  </Button>
                  <Button size="large" variant="contained" color="error" onClick={() => judgeQuickCheck('B')}>
                    B: KI verführt zur Abkürzung
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
                  Zusatzfrage: Wo entsteht hier Denkzeit für Schülerinnen und Schüler?
                </Typography>
                <Button variant="outlined" onClick={nextQuickCheck}>
                  Nächste Aussage
                </Button>
              </Box>

              <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
                    Didaktischer Fokus
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7, mb: 1.5 }}>
                    Leisen-Perspektive: Lernwirksam wird KI erst, wenn Lernende an und mit KI-Ergebnissen arbeiten,
                    ihr Vorwissen aktivieren, prüfen, vergleichen, begründen und überarbeiten.
                  </Typography>
                  <Stack spacing={1}>
                    {['Toolnutzung allein reicht nicht.', 'Entscheidend sind Lernzeit und Denkzeit.', 'Krommer-Frage: Was verändert KI an Lern- und Prüfungskultur?'].map((item) => (
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
              subtitle="Nach der Schülerperspektive: Welche didaktische Funktion erfüllt KI in der Aufgabe?"
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
                  Zusatzfrage: Wo entsteht hier Denkzeit für Schülerinnen und Schüler?
                </Typography>
                <Button variant="outlined" onClick={nextAmpelCase}>
                  Nächste Aufgabenkarte
                </Button>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.25 }}>
                {[
                  ['KI thematisieren', 'KI selbst verstehen, Chancen und Risiken einordnen.'],
                  ['KI integrieren', 'KI als Lernressource nutzen, ohne den Lernprozess abzugeben.'],
                  ['KI reflektieren', 'KI-Ergebnisse prüfen, vergleichen, hinterfragen und verbessern.'],
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
                      Leisen fragt nach Lernzeit, Denkzeit und Anstrengung. Krommer öffnet den Blick auf veränderte
                      Lern- und Prüfungskultur. Falck liefert mit den Aufgabenkategorien ein Planungsraster für
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
                    Nächste Karte
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
